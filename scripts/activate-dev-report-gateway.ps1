[CmdletBinding()]
param(
    [switch]$ApprovedActivationScope,
    [switch]$CheckSecretsOnly,
    [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
if (($ApprovedActivationScope -and $CheckSecretsOnly) -or ($CheckOnly -and ($ApprovedActivationScope -or $CheckSecretsOnly))) { throw 'Choose one activation/check scope.' }
$ref = 'uiuiouosblyuqgnvfpeh'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$packageRoot = Join-Path (Split-Path -Parent $repositoryRoot) 'operator-evidence\dev-release-20261029'
$manifest = Get-Content -LiteralPath (Join-Path $packageRoot 'release-manifest.json') -Raw | ConvertFrom-Json
if ($manifest.target.ref -cne $ref -or $manifest.target.name -cne 'rekansiaga-dev' -or $manifest.stageD.status -cne 'DEPLOYED / DISABLED PASS') { throw 'STOP: accepted D DEPLOYED / DISABLED PASS on exact dev target required. Do not redeploy D.' }
$proof = Get-Content -LiteralPath (Join-Path $packageRoot 'D-gateway-probe.json') -Raw | ConvertFrom-Json
if ($proof.projectRef -cne $ref -or $proof.status -cne 'PASS' -or $proof.phase -cne 'disabled' -or $proof.active -ne $false -or $proof.validReportSubmissions -ne 0) { throw 'STOP: existing operator D evidence is inconsistent.' }
foreach ($source in $manifest.backendSources.PSObject.Properties) {
    if ((Get-FileHash -LiteralPath (Join-Path $repositoryRoot $source.Name) -Algorithm SHA256).Hash.ToLowerInvariant() -cne $source.Value) { throw 'STOP: local backend sources changed since accepted D. Reconcile before activation; no automatic redeploy.' }
}
$cliExe = (Get-Command npx.cmd -ErrorAction Stop).Source
$cliPrefix = @('--yes','supabase@2.120.0')
function Invoke-ActivationCli {
    param([string[]]$CliArgs)
    # Capture stdout in memory; discard diagnostics, never echo secret-list rows.
    $previousPreference = $ErrorActionPreference
    try { $ErrorActionPreference = 'Continue'; $output = @(& $cliExe @cliPrefix @CliArgs 2>$null); $cliExit = $LASTEXITCODE }
    finally { $ErrorActionPreference = $previousPreference }
    if ($cliExit -ne 0) { throw 'Supabase CLI failed; values suppressed. Check CLI login/project access.' }
    return $output
}
function Invoke-FrontendFlag {
    param([string]$Mode)
    $result = @(& node (Join-Path $PSScriptRoot 'report-frontend-env.mjs') $Mode)
    if ($LASTEXITCODE -ne 0) { throw 'Frontend gateway flag check/update failed; values suppressed.' }
    return $result
}

Push-Location -LiteralPath $repositoryRoot
try {
    Invoke-FrontendFlag '--check' | Out-Null
    if (-not $ApprovedActivationScope -and -not $CheckSecretsOnly) { Write-Output 'LOCAL E READY: D evidence retained; no network or activation. Operator runs -ApprovedActivationScope for server/frontend flags only.'; return }
    try {
        $metadata = (Invoke-ActivationCli -CliArgs @('secrets','list','--project-ref',$ref,'--output','json') | Out-String) | ConvertFrom-Json
        $names = @($metadata | ForEach-Object { $_.name })
    } catch { throw 'STOP: secret-name metadata could not be parsed; all values suppressed; no mutation attempted.' }
    $required = @('REPORT_PUBLIC_KEY','REPORT_ALLOWED_ORIGINS','TURNSTILE_SECRET_KEY','TURNSTILE_HOSTNAMES','REPORT_GATEWAY_ENABLED')
    foreach ($name in $required) { if ($name -cnotin $names) { throw "STOP: missing $name; no mutation attempted." } }
    Write-Output ('PASS required secret names only: ' + ($required -join ', '))
    if ($CheckSecretsOnly) { return }
    $enableAttempted = $false
    try {
        $enableAttempted = $true
        Invoke-ActivationCli -CliArgs @('secrets','set','REPORT_GATEWAY_ENABLED=true','--project-ref',$ref) | Out-Null
        # Only new activation checks; no repeated D CORS/GET/disabled tests.
        & node (Join-Path $PSScriptRoot 'check-dev-report-gateway.mjs') --live --phase enabled --activation-only --origin http://localhost:5173
        if ($LASTEXITCODE -ne 0) { throw 'Enabled-state probe failed.' }
        Invoke-FrontendFlag '--enable' | Out-Null
        [ordered]@{ projectRef=$ref; status='ACTIVATED / SUBMIT-TRACK NOT_RUN'; active=$true; frontendFlag=$true; validReportSubmissions=0; liveSubmitTrackAcceptance='NOT_RUN'; adminCrud='NOT_RUN' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $packageRoot 'E-activation.json') -Encoding UTF8
        Write-Output 'Gateway activated; frontend flag set true. Restart Vite on localhost:5173. No report/CRUD mutation was performed. Complete the operator E2E in E-ACTIVATION.md.'
    } catch {
        # Bounded rollback of these two flags only, part of operator activation scope.
        $cloudRestored = $false
        if ($enableAttempted) { try { Invoke-ActivationCli -CliArgs @('secrets','set','REPORT_GATEWAY_ENABLED=false','--project-ref',$ref) | Out-Null; $cloudRestored = $true } catch {} }
        $frontendRestored = $false
        try { Invoke-FrontendFlag '--disable' | Out-Null; $frontendRestored = $true } catch {}
        [ordered]@{ projectRef=$ref; status='ACTIVATION FAILED'; serverFlagResetConfirmed=$cloudRestored; frontendFlagResetConfirmed=$frontendRestored; liveSubmitTrackAcceptance='NOT_RUN' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $packageRoot 'E-activation.json') -Encoding UTF8
        throw 'STOP: activation failed. Attempted to reset both flags false; check E-activation.json and Dashboard. No automatic retry or report submission.'
    }
} finally { Pop-Location }
