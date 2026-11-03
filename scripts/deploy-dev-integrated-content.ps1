[CmdletBinding()]
param([switch]$ApprovedIntegratedContent,[string]$PoolerHost)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$ref='uiuiouosblyuqgnvfpeh'
$root=Split-Path -Parent $PSScriptRoot
$manifestPath=Join-Path $root 'docs\qa\stage-e\integrated-content-manifest.json'
$manifest=Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if($manifest.projectRef -cne $ref){throw 'STOP: proposed dev package required.'}
foreach($entry in $manifest.files.PSObject.Properties){
  $actual=(Get-FileHash -LiteralPath (Join-Path $root $entry.Name) -Algorithm SHA256).Hash.ToLowerInvariant()
  if($actual -cne $entry.Value){throw ('STOP: proposed input changed: '+$entry.Name)}
}
if(-not $ApprovedIntegratedContent){Write-Output 'LOCAL PACKAGE CHECK ONLY. No network or Cloud changes. Approved scope: previously approved public_reports RLS enablement plus restrictive SELECT privacy policies, event feed/link RPCs, private article-media bucket/registry/policies/RPCs, report-publication CORS hotfix, and article-media function. No tracking/Gateway, report rows, Flutter, staging, or secrets changes.';return}
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
  $preflight=Join-Path $root 'supabase\releases\dev-integrated-content-preflight.sql'
  $privacySql=Join-Path $root 'supabase\releases\dev-e-report-privacy.PROPOSED.sql'
  $postflight=Join-Path $root 'supabase\releases\dev-integrated-content-postflight.sql'
  $sql=Join-Path $root 'supabase\releases\dev-integrated-content.PROPOSED.sql'
  $connection="host=$PoolerHost port=5432 dbname=postgres user=postgres.$ref sslmode=require connect_timeout=20 application_name=rekansiaga_integrated_content_v1"
  $start=New-Object Diagnostics.ProcessStartInfo
  $start.FileName=$psql
  $start.UseShellExecute=$false
  $start.RedirectStandardInput=$false
  $start.RedirectStandardOutput=$true
  $start.RedirectStandardError=$false
  $start.CreateNoWindow=$false
  $compatAck="SET rekansiaga.release_ref='$ref'; SET rekansiaga.release_approval='approve-dev-integrated-content-v1';"
  $privacyAck="SET rekansiaga.release_ref='$ref'; SET rekansiaga.release_approval='approve-dev-e-report-compat-privacy-v1';"
  # This privacy-only transaction was separately approved by the operator.
  # It enables existing report RLS and restrictive SELECT policies before the
  # integrated-content preflight. It does not touch tracking or Gateway code.
  $start.Arguments='-X -W -q -A -t --set=ON_ERROR_STOP=1 --set=VERBOSITY=terse --dbname "'+$connection+'" --command "'+$privacyAck+'" --file "'+$privacySql+'" --command "'+$compatAck+'" --file "'+$preflight+'"'
  foreach($name in @($start.EnvironmentVariables.Keys)){if($name -like 'PG*'){$start.EnvironmentVariables.Remove($name)}}
  $start.EnvironmentVariables['PGCLIENTENCODING']='UTF8'
  Write-Host 'Target fixed: rekansiaga-dev. First native psql password prompt runs the separately approved report-privacy transaction, then the read-only content preflight. If that passes, a second native prompt runs the guarded content transaction. Password stays at native psql prompts.'
  $process=New-Object Diagnostics.Process
  $process.StartInfo=$start
  try{
    if(-not $process.Start()){throw 'STOP: psql preflight could not start.'}
    $preflightText=$process.StandardOutput.ReadToEnd()
    $process.WaitForExit()
    if($process.ExitCode -ne 0){throw 'STOP: report-privacy transaction or read-only preflight failed. The report RLS privacy transaction may already have committed; content migration and function deployment were not attempted. Reconcile before retry.'}
    # psql -A -t prints the value of the SELECT expression, not its column
    # alias. The SQL returns the metadata object directly, so consume it as-is.
    # Accept the wrapped shape too for compatibility with a manually wrapped
    # preflight result, while rejecting empty/unexpected output safely.
    $preflightLines=@($preflightText.Trim() -split '\r?\n' | Where-Object {$_ -match '\S'})
    if($preflightLines.Count -ne 2){throw 'STOP: expected privacy confirmation and preflight JSON; no content migration or deployment was attempted.'}
    $privacyResult=$preflightLines[0] | ConvertFrom-Json
    if($privacyResult.status -cne 'APPLIED' -or $privacyResult.project_ref -cne $ref){throw 'STOP: report-privacy confirmation missing; no content migration or deployment was attempted.'}
    $preflightResult=$preflightLines[1] | ConvertFrom-Json
    if($null -eq $preflightResult){throw 'STOP: read-only preflight returned empty JSON; no migration or deployment was attempted.'}
    $meta=$preflightResult
    if($preflightResult.PSObject.Properties.Name -contains 'integrated_content_preflight'){
      $meta=$preflightResult.integrated_content_preflight
    }
    $required=@('current_user','session_user','owner_can_bypassrls','has_staff_role','public_reports_rls','articles_rls','disaster_events_rls','feed_already_present','article_media_bucket_already_present','media_registry_already_present')
    if(@($required | Where-Object {$meta.PSObject.Properties.Name -notcontains $_}).Count -gt 0){throw 'STOP: read-only preflight JSON shape is unexpected; no migration or deployment was attempted.'}
    $failedChecks=[System.Collections.Generic.List[string]]::new()
    if($meta.current_user -cne 'postgres'){$failedChecks.Add('current_user_is_postgres')}
    if($meta.session_user -cne 'postgres'){$failedChecks.Add('session_user_is_postgres')}
    if(-not $meta.owner_can_bypassrls){$failedChecks.Add('migration_owner_bypassrls')}
    if(-not $meta.has_staff_role){$failedChecks.Add('has_staff_role_function')}
    if(-not $meta.public_reports_rls){$failedChecks.Add('public_reports_rls_enabled')}
    if(-not $meta.articles_rls){$failedChecks.Add('articles_rls_enabled')}
    if(-not $meta.disaster_events_rls){$failedChecks.Add('disaster_events_rls_enabled')}
    if($meta.feed_already_present){$failedChecks.Add('public_event_feed_absent')}
    if($meta.media_registry_already_present){$failedChecks.Add('article_media_registry_absent')}
    if($meta.article_media_bucket_already_present){$failedChecks.Add('article_media_bucket_absent')}
    if($failedChecks.Count -gt 0){throw ('STOP: read-only baseline mismatch ['+($failedChecks -join ', ')+']; no migration or deployment was attempted.')}
  }finally{
    $process.Dispose()
  }
  $start.Arguments='-X -W -q -A -t --set=ON_ERROR_STOP=1 --set=VERBOSITY=terse --dbname "'+$connection+'" --command "'+$compatAck+'" --file "'+$sql+'" --file "'+$postflight+'"'
  $process=New-Object Diagnostics.Process
  $process.StartInfo=$start
  try{
    if(-not $process.Start()){throw 'STOP: guarded SQL could not start.'}
    $resultText=$process.StandardOutput.ReadToEnd()
    $process.WaitForExit()
    if($process.ExitCode -ne 0){throw 'STOP: SQL failed or commit uncertain. No automatic retry/deploy. Reconcile database state before retry.'}
    $results=@($resultText.Trim() -split '\r?\n' | Where-Object {$_ -match '\S'} | ForEach-Object {$_ | ConvertFrom-Json})
    if($results.Count -ne 2 -or $results[0].status -cne 'APPLIED' -or $results[1].status -cne 'PASS' -or @($results | Where-Object {$_.project_ref -cne $ref}).Count){throw 'STOP: SQL confirmations missing; no deploy.'}
  }finally{
    try{if(-not $process.HasExited){$process.Kill();$process.WaitForExit()}}catch{}
    $process.Dispose()
  }
  # Existing functions perform their own Auth/role checks. This includes the
  # narrow x-client-info CORS hotfix needed by the existing photo approval UI.
  # Existing report-gateway, secrets, and tracking are not changed.
  & $cli --yes supabase@2.120.0 functions deploy report-publication --project-ref $ref --use-api --no-verify-jwt
  if($LASTEXITCODE -ne 0){throw 'STOP: report-publication hotfix deployment not confirmed. SQL may already be committed; reconcile state before resuming.'}
  & $cli --yes supabase@2.120.0 functions deploy article-media --project-ref $ref --use-api --no-verify-jwt
  if($LASTEXITCODE -ne 0){throw 'STOP: article-media deployment not confirmed. SQL/report-publication may already be applied; reconcile state before resuming.'}
  Write-Output 'Integrated content SQL, report-publication CORS hotfix, and article-media deployed. Set VITE_INTEGRATED_CONTENT_ENABLED=true locally, then restart Vite after protecting drafts. Acceptance still pending; use only approved synthetic data. Tracking/report Gateway unchanged.'
}finally{Pop-Location}

