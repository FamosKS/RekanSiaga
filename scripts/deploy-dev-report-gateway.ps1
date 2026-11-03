[CmdletBinding()]
param(
    [switch]$ApprovedDeployScope,
    [switch]$CheckOnly,
    [string]$WebOrigin = 'http://localhost:5173'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ref = 'uiuiouosblyuqgnvfpeh'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$packageRoot = Join-Path (Split-Path -Parent $repositoryRoot) 'operator-evidence\dev-release-20261029'
$manifest = Get-Content -LiteralPath (Join-Path $packageRoot 'release-manifest.json') -Raw | ConvertFrom-Json
if ($manifest.target.ref -cne $ref -or $manifest.stageC.status -cne 'DEPLOYED / PASS') { throw 'STOP: confirmed dev target and completed C required.' }

# Reuse reviewed sources exactly. This does not audit A-C or modify any source.
foreach ($source in $manifest.backendSources.PSObject.Properties) {
    $actual = (Get-FileHash -LiteralPath (Join-Path $repositoryRoot $source.Name) -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -cne $source.Value) { throw "STOP: gateway source changed since review: $($source.Name)" }
}
if ($CheckOnly) { Write-Output 'LOCAL D PACKAGE PASS: C evidence retained, fixed dev ref, existing gateway source hashes match. No CLI/network/mutation.'; return }
if (-not $ApprovedDeployScope) { throw 'STOP: use -ApprovedDeployScope only for approved D: server secrets/configuration and disabled report-gateway deployment; no activation/report writes.' }
if ([string]::IsNullOrWhiteSpace($WebOrigin)) { $WebOrigin = Read-Host 'Exact Web origin already configured in REPORT_ALLOWED_ORIGINS (no key/secret)' }
try { $parsedOrigin = [Uri]$WebOrigin } catch { throw 'STOP: invalid Web origin' }
if (-not $parsedOrigin.IsAbsoluteUri -or $parsedOrigin.GetLeftPart([UriPartial]::Authority) -cne $WebOrigin -or
    ($parsedOrigin.Scheme -cne 'https' -and -not ($parsedOrigin.Scheme -ceq 'http' -and $parsedOrigin.Host -in @('localhost','127.0.0.1','[::1]')))) { throw 'STOP: exact HTTPS or local dev origin required; no wildcard/path.' }

$npx = Get-Command npx.cmd -ErrorAction Stop
$cliExe = $npx.Source
$cliPrefix = @('--yes','supabase@2.120.0')
function Invoke-DevCli {
    param([string[]]$CliArgs)
    $output = @(& $cliExe @cliPrefix @CliArgs)
    if ($LASTEXITCODE -ne 0) { throw 'STOP: Supabase CLI failed. No automatic retry/activation. Resolve authentication or the reported CLI error locally.' }
    return $output
}

Push-Location -LiteralPath $repositoryRoot
try {
    # Login is performed separately through official CLI browser/keychain flow.
    $projects = (Invoke-DevCli -CliArgs @('projects','list','--output','json') | Out-String) | ConvertFrom-Json
    $target = @($projects | Where-Object { $_.id -ceq $ref -and $_.name -ceq 'rekansiaga-dev' })
    if ($target.Count -ne 1) { throw 'STOP: authenticated account did not identify the exact dev project. No mutation attempted.' }
    $deployHelp = Invoke-DevCli -CliArgs @('functions','deploy','--help') | Out-String
    if (-not $deployHelp.Contains('--use-api')) { throw 'STOP: CLI must support Docker-free --use-api deployment.' }
    $secrets = (Invoke-DevCli -CliArgs @('secrets','list','--project-ref',$ref,'--output','json') | Out-String) | ConvertFrom-Json
    $names = @($secrets | ForEach-Object { $_.name })
    # Dev-global quotas do not read IP headers or the legacy HMAC secret.
    foreach ($required in @('REPORT_PUBLIC_KEY','REPORT_ALLOWED_ORIGINS','TURNSTILE_SECRET_KEY','TURNSTILE_HOSTNAMES')) {
        if ($required -cnotin $names) { throw "STOP: configure $required privately in dev Dashboard > Edge Functions > Secrets first. Values must not enter CLI arguments, logs or chat." }
    }
    # This value is a nonsecret safety switch. Actual secrets are entered only
    # through Dashboard, never passed by this script or read back from Cloud.
    Invoke-DevCli -CliArgs @('secrets','set','REPORT_GATEWAY_ENABLED=false','--project-ref',$ref) | Out-Null
    Invoke-DevCli -CliArgs @('functions','deploy','report-gateway','--project-ref',$ref,'--use-api','--no-verify-jwt') | ForEach-Object { Write-Host $_ }
    # Existing handler checks staff JWT/role/RLS for attachments. Public actions
    # retain CAPTCHA/quotas; gateway stays disabled until the separate E approval.
    & node (Join-Path $PSScriptRoot 'check-dev-report-gateway.mjs') --live --phase disabled --origin $WebOrigin
    if ($LASTEXITCODE -ne 0) { throw 'STOP: deployed gateway failed its minimal disabled-state checks. Do not enable it.' }
    Write-Output 'D DEPLOYED / DISABLED CHECKS PASS. No valid report submitted. Request activation/E2E approval before E.'
}
finally { Pop-Location }
