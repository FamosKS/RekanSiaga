[CmdletBinding()]
param([switch]$ApprovedReportCompatibilityAndPrivacy,[string]$PoolerHost)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$ref='uiuiouosblyuqgnvfpeh'
$root=Split-Path -Parent $PSScriptRoot
$manifestPath=Join-Path $root 'docs\qa\stage-e\live\report-compat-proposed-manifest.json'
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if($manifest.projectRef -cne $ref){throw 'STOP: proposed dev package required.'}
foreach($entry in $manifest.files.PSObject.Properties){
  $actual=(Get-FileHash -LiteralPath (Join-Path $root $entry.Name) -Algorithm SHA256).Hash.ToLowerInvariant()
  if($actual -cne $entry.Value){throw ('STOP: proposed input changed: '+$entry.Name)}
}
if(-not $ApprovedReportCompatibilityAndPrivacy){Write-Output 'LOCAL PACKAGE CHECK ONLY. No network or Cloud changes. Proposed scope: enable report RLS plus two restrictive report SELECT policies, one tracking predicate, gateway parser deployment. No rows/grants/secret changes.';return}
$psql='C:\Program Files\PostgreSQL\18\bin\psql.exe'
if(-not(Test-Path -LiteralPath $psql -PathType Leaf)){throw 'STOP: existing psql18 required; no installation attempted.'}
$cli=(Get-Command npx.cmd -ErrorAction Stop).Source
Push-Location -LiteralPath $root
try{
  $projectsText=& $cli --yes supabase@2.120.0 projects list --output json
  if($LASTEXITCODE -ne 0){throw 'STOP: official CLI authentication required; no mutation attempted.'}
  $projects=($projectsText | Out-String) | ConvertFrom-Json
  if(@($projects | Where-Object {$_.id -ceq $ref -and $_.name -ceq 'rekansiaga-dev'}).Count -ne 1){throw 'STOP: exact dev project not identified.'}
  if([string]::IsNullOrWhiteSpace($PoolerHost)){$PoolerHost=Read-Host 'Session Pooler host only from rekansiaga-dev Connect; no URL/password'}
  $PoolerHost=$PoolerHost.Trim().ToLowerInvariant()
  if($PoolerHost -cnotmatch '^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$'){throw 'STOP: official Session Pooler host required.'}
  $sql=Join-Path $root 'supabase\releases\dev-e-tracking-rpt.PROPOSED.sql'
  $privacySql=Join-Path $root 'supabase\releases\dev-e-report-privacy.PROPOSED.sql'
  $connection="host=$PoolerHost port=5432 dbname=postgres user=postgres.$ref sslmode=require connect_timeout=20 application_name=rekansiaga_e_tracking_compat"
  $start=New-Object Diagnostics.ProcessStartInfo
  $start.FileName=$psql
  $start.UseShellExecute=$false
  $start.RedirectStandardInput=$false
  $start.RedirectStandardOutput=$true
  $start.RedirectStandardError=$false
  $start.CreateNoWindow=$false
  $privacyAck="SET rekansiaga.release_ref='$ref'; SET rekansiaga.release_approval='approve-dev-e-report-compat-privacy-v1';"
  $compatAck="SET rekansiaga.release_approval='approve-dev-e-tracking-rpt-v1';"
  $start.Arguments='-X -W -q -A -t --set=ON_ERROR_STOP=1 --set=VERBOSITY=terse --dbname "'+$connection+'" --command "'+$privacyAck+'" --file "'+$privacySql+'" --command "'+$compatAck+'" --file "'+$sql+'"'
  foreach($name in @($start.EnvironmentVariables.Keys)){if($name -like 'PG*'){$start.EnvironmentVariables.Remove($name)}}
  $start.EnvironmentVariables['PGCLIENTENCODING']='UTF8'
  Write-Host 'Target fixed: rekansiaga-dev. Enter DB password only at native psql prompt; never in arguments/files/logs.'
  $process=New-Object Diagnostics.Process
  $process.StartInfo=$start
  try{
    if(-not $process.Start()){throw 'STOP: psql could not start.'}
    $resultText=$process.StandardOutput.ReadToEnd()
    $process.WaitForExit()
    if($process.ExitCode -ne 0){throw 'STOP: SQL failed or commit uncertain. Earlier privacy commit may remain; no deploy/retry and never automatically remove privacy restrictions.'}
    $results=@($resultText.Trim() -split '\r?\n' | Where-Object {$_ -match '\S'} | ForEach-Object {$_ | ConvertFrom-Json})
    if($results.Count -ne 2 -or @($results | Where-Object {$_.status -cne 'APPLIED' -or $_.project_ref -cne $ref}).Count){throw 'STOP: SQL confirmations missing; no deploy.'}
  }finally{
    try{if(-not $process.HasExited){$process.Kill();$process.WaitForExit()}}catch{}
    $process.Dispose()
  }
  # Existing public gateway config; CAPTCHA/quota/attachment Auth stay in handler.
  # No secret values or enable/disable switches are changed by this package.
  & $cli --yes supabase@2.120.0 functions deploy report-gateway --project-ref $ref --use-api --no-verify-jwt
  if($LASTEXITCODE -ne 0){throw 'STOP: gateway deploy not confirmed. RS remains supported; do not auto retry or claim RPT LIVE PASS.'}
  Write-Output 'Report privacy/compatibility code applied/deployed; acceptance still pending. Verify anonymous private reads blocked and existing RPT tracking with private token/CAPTCHA in normal Chrome. No data rows changed; no secrets toggled.'
}finally{Pop-Location}
