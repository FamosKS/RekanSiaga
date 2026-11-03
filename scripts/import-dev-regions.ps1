[CmdletBinding()]
param(
    [string]$PoolerHost,
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRef = 'uiuiouosblyuqgnvfpeh'
$psqlPath = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$packageRoot = Join-Path (Split-Path -Parent $repositoryRoot) 'operator-evidence\dev-release-20261029'
$driverPath = Join-Path $packageRoot 'C-regions-psql.APPROVED.sql'
$manifestPath = Join-Path $packageRoot 'release-manifest.json'

if (-not (Test-Path -LiteralPath $psqlPath -PathType Leaf)) { throw 'psql.exe is missing from C:\Program Files\PostgreSQL\18\bin. No server or Docker installation is required.' }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.target.ref -cne $projectRef -or $manifest.target.name -cne 'rekansiaga-dev' -or $manifest.cloudMutationApproval.C -ne $true) { throw 'STOP: the approved dev C package is required.' }

# Integrity of the exact execution inputs, not a repeated A/B audit.
$inputs = @('C-regions-psql.APPROVED.sql')
foreach ($inputName in $inputs) {
    $inputPath = Join-Path $packageRoot $inputName
    $entry = $manifest.files.PSObject.Properties[$inputName]
    if ($null -eq $entry -or -not (Test-Path -LiteralPath $inputPath -PathType Leaf)) { throw "STOP: missing approved input $inputName" }
    $actualHash = (Get-FileHash -LiteralPath $inputPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -cne $entry.Value.sha256) { throw "STOP: approved input changed: $inputName" }
}

if ($CheckOnly) {
    Write-Output 'LOCAL PACKAGE PASS: fixed dev target, approved C scope, psql present, complete SQL matches manifest. No connection or Cloud mutation.'
    return
}

if ([string]::IsNullOrWhiteSpace($PoolerHost)) {
    Write-Host 'Supabase Dashboard > rekansiaga-dev > Connect > Session pooler.'
    $PoolerHost = Read-Host 'Paste ONLY its Host (aws-...pooler.supabase.com), not a URL or password'
}
$PoolerHost = $PoolerHost.Trim().ToLowerInvariant()
if ($PoolerHost -cnotmatch '^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$') { throw 'STOP: expected an official Supabase Session Pooler host only. Do not paste a URL or password.' }

# Host is an allowlisted nonsecret DNS name; project routing is fixed by user.
# Port 5432 is Session Pooler, not transaction pooling. SSL cannot fall back.
$connectionInfo = "host=$PoolerHost port=5432 dbname=postgres user=postgres.$projectRef sslmode=require connect_timeout=20 application_name=rekansiaga_regions_c"
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $psqlPath
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardInput = $false
$startInfo.RedirectStandardError = $false
$startInfo.CreateNoWindow = $false
$startInfo.StandardOutputEncoding = New-Object System.Text.UTF8Encoding($false)
# No shell interpolation. All quoted paths end in .sql and contain no quote.
$startInfo.Arguments = '-X -W -q -A -t --set=ON_ERROR_STOP=1 --set=VERBOSITY=terse --dbname "' + $connectionInfo + '" --file "' + $driverPath + '"'

# Prevent inherited PGHOSTADDR/PGSERVICE/PGOPTIONS/password variables from
# overriding the explicit connection. Parent environment is never modified.
foreach ($environmentName in @($startInfo.EnvironmentVariables.Keys)) {
    if ($environmentName -like 'PG*') { $startInfo.EnvironmentVariables.Remove($environmentName) }
}
$startInfo.EnvironmentVariables['PGCLIENTENCODING'] = 'UTF8'

Write-Host 'Target: rekansiaga-dev / uiuiouosblyuqgnvfpeh; Session Pooler 5432; SSL required.'
Write-Host 'Enter the database password at the psql prompt. The script never receives, stores or logs it.'
Write-Host 'Import runs from one complete SQL file. Do not close this terminal.'
$process = New-Object System.Diagnostics.Process
$process.StartInfo = $startInfo
try {
    if (-not $process.Start()) { throw 'Unable to start psql.' }
    $verificationText = $process.StandardOutput.ReadToEnd()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) {
        throw "STOP: psql failed (exit $($process.ExitCode)); later SQL was not run. The active transaction is rolled back on disconnect; earlier committed batches remain. Retry only after resolving the reported error; code upserts preserve UUIDs and prevent duplicate codes."
    }
}
finally {
    # A PowerShell interruption must not leave the import running unnoticed.
    try { if (-not $process.HasExited) { $process.Kill(); $process.WaitForExit() } } catch { }
    $process.Dispose()
}

try { $verification = $verificationText.Trim() | ConvertFrom-Json } catch { throw 'STOP: psql completed but its final verification JSON was missing/invalid. Do not claim C PASS; run the existing read-only C postflight.' }
if ($verification.pass -ne $true -or $verification.read_only -ne $true -or $verification.expected_ref -cne $projectRef -or
    $verification.actual.province_count -ne 38 -or $verification.actual.regency_city_count -ne 514 -or
    $verification.actual.district_count -ne 7285 -or $verification.actual.village_count -ne 83762 -or
    $verification.counts.total -ne 91599 -or $verification.counts.regencies -ne 416 -or $verification.counts.cities -ne 98 -or
    $verification.actual.duplicate_codes -ne 0 -or $verification.actual.orphan_regions -ne 0 -or
    $verification.actual.invalid_parent_levels -ne 0 -or $verification.actual.invalid_roots -ne 0) {
    throw 'STOP: import returned a regional count/hierarchy mismatch. Preserve existing rows; no automatic delete, retry, or schema repair.'
}

# Only verified nonsecret counts are written after an actual successful run.
$result = [ordered]@{
    status = 'PASS'
    project_ref = $projectRef
    provinsi = $verification.actual.province_count
    kabupaten_kota = $verification.actual.regency_city_count
    kecamatan = $verification.actual.district_count
    desa_kelurahan = $verification.actual.village_count
    total = $verification.counts.total
    hierarchy_errors = 0
    verified_at_utc = [DateTime]::UtcNow.ToString('o')
}
$resultJson = $result | ConvertTo-Json
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $packageRoot 'C-psql-verification.json'), $resultJson, $utf8)
Write-Output $resultJson
