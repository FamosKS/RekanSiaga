[CmdletBinding()]
param([switch]$ApprovedSingleTrackingV2,[string]$PoolerHost)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$ref='uiuiouosblyuqgnvfpeh'
$root=Split-Path -Parent $PSScriptRoot
$manifestPath=Join-Path $root 'docs\qa\stage-e\single-tracking-manifest.json'
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if($manifest.projectRef -cne $ref){throw 'STOP: proposed dev package required.'}
foreach($entry in $manifest.files.PSObject.Properties){
  $actual=(Get-FileHash -LiteralPath (Join-Path $root $entry.Name) -Algorithm SHA256).Hash.ToLowerInvariant()
  if($actual -cne $entry.Value){throw ('STOP: proposed input changed: '+$entry.Name)}
}
if(-not $ApprovedSingleTrackingV2){Write-Output 'LOCAL PACKAGE CHECK ONLY. No network or Cloud changes. Proposed scope: add service-only v2 tracking and operator rotation RPCs; deploy additive gateway; no RLS/policy/row/secret changes. No rows/grants/secret changes.';return}
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
  $sql=Join-Path $root 'supabase\releases\dev-single-tracking.PROPOSED.sql'
  $connection="host=$PoolerHost port=5432 dbname=postgres user=postgres.$ref sslmode=require connect_timeout=20 application_name=rekansiaga_single_tracking_v2"
  $start=New-Object Diagnostics.ProcessStartInfo
  $start.FileName=$psql
  $start.UseShellExecute=$false
  $start.RedirectStandardInput=$false
  $start.RedirectStandardOutput=$true
  $start.RedirectStandardError=$false
  $start.CreateNoWindow=$false
  $compatAck="SET rekansiaga.release_ref='$ref'; SET rekansiaga.release_approval='approve-dev-single-tracking-v2';"
  $start.Arguments='-X -W -q -A -t --set=ON_ERROR_STOP=1 --set=VERBOSITY=terse --dbname "'+$connection+'" --command "'+$compatAck+'" --file "'+$sql+'"'
  foreach($name in @($start.EnvironmentVariables.Keys)){if($name -like 'PG*'){$start.EnvironmentVariables.Remove($name)}}
  $start.EnvironmentVariables['PGCLIENTENCODING']='UTF8'
  Write-Host 'Target fixed: rekansiaga-dev. Enter DB password only at native psql prompt; never in arguments/files/logs.'
  $process=New-Object Diagnostics.Process
  $process.StartInfo=$start
  try{
    if(-not $process.Start()){throw 'STOP: psql could not start.'}
    $resultText=$process.StandardOutput.ReadToEnd()
    $process.WaitForExit()
    if($process.ExitCode -ne 0){throw 'STOP: SQL failed or commit uncertain. No automatic retry/deploy. Reconcile database state before retry.'}
    $results=@($resultText.Trim() -split '\r?\n' | Where-Object {$_ -match '\S'} | ForEach-Object {$_ | ConvertFrom-Json})
    if($results.Count -ne 1 -or @($results | Where-Object {$_.status -cne 'APPLIED' -or $_.project_ref -cne $ref}).Count){throw 'STOP: SQL confirmations missing; no deploy.'}
  }finally{
    try{if(-not $process.HasExited){$process.Kill();$process.WaitForExit()}}catch{}
    $process.Dispose()
  }
  # Existing public gateway config; CAPTCHA/quota/attachment Auth stay in handler.
  # No secret values or enable/disable switches are changed by this package.
  & $cli --yes supabase@2.120.0 functions deploy report-gateway --project-ref $ref --use-api --no-verify-jwt
  if($LASTEXITCODE -ne 0){throw 'STOP: gateway deploy not confirmed. Do not retry SQL or claim v2 LIVE PASS.'}
  Write-Output 'Single tracking v2 applied/deployed. Restart local Vite after protecting drafts. Test synthetic receipt, single-code tracking, legacy tracking and Admin status propagation with fresh CAPTCHA. Acceptance pending; no rows/secrets/RLS changed.'
}finally{Pop-Location}
