[CmdletBinding()]
param([switch]$ApprovedLocationAlerts,[string]$PoolerHost)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$ref='uiuiouosblyuqgnvfpeh'
$root=Split-Path -Parent $PSScriptRoot
if(-not $ApprovedLocationAlerts){Write-Output 'LOCAL ONLY. Target is rekansiaga-dev. No network or Cloud changes. Add -ApprovedLocationAlerts only after approving the additive alert schema/RPC, RLS/RBAC/audit behavior, and postflight.';return}
$psql='C:\Program Files\PostgreSQL\18\bin\psql.exe'
if(-not(Test-Path -LiteralPath $psql -PathType Leaf)){throw 'STOP: reviewed PostgreSQL 18 psql executable is required.'}
$cli=(Get-Command npx.cmd -ErrorAction Stop).Source
Push-Location -LiteralPath $root
try{
 $projectsText=& $cli --yes supabase@2.120.0 projects list --output json
 if($LASTEXITCODE -ne 0){throw 'STOP: Supabase CLI authentication failed; no database mutation attempted.'}
 $projects=($projectsText|Out-String)|ConvertFrom-Json
 if(@($projects|Where-Object{$_.id -ceq $ref -and $_.name -ceq 'rekansiaga-dev'}).Count -ne 1){throw 'STOP: exact rekansiaga-dev project not identified.'}
 if([string]::IsNullOrWhiteSpace($PoolerHost)){$PoolerHost=Read-Host 'Session Pooler host copied from rekansiaga-dev > Connect > Session pooler (host only; no URL/password)'}
 $PoolerHost=$PoolerHost.Trim().ToLowerInvariant()
 if($PoolerHost -cnotmatch '^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$'){throw 'STOP: Session Pooler hostname format rejected.'}
 $connection="host=$PoolerHost port=5432 dbname=postgres sslmode=require connect_timeout=20 application_name=rekansiaga_location_alerts_v1"
 $ack="SET rekansiaga.release_ref='$ref'; SET rekansiaga.release_approval='approve-dev-location-alerts-v1';"
 $preflight=Join-Path $root 'supabase\releases\dev-location-alerts-preflight.sql'
 $migration=Join-Path $root 'supabase\releases\dev-location-alerts.PROPOSED.sql'
 $postflight=Join-Path $root 'supabase\releases\dev-location-alerts-postflight.sql'
 $baseArgs=@('-X','-W','-q','-A','-t','--set=ON_ERROR_STOP=1','--set=VERBOSITY=terse','--username',"postgres.$ref",'--dbname',$connection,'--command',$ack)
 $first=(& $psql @baseArgs --file $preflight|Out-String).Trim()
 if($LASTEXITCODE -ne 0){throw 'STOP: read-only preflight failed; no migration attempted.'}
 try{$baseline=$first|ConvertFrom-Json}catch{throw 'STOP: read-only preflight output invalid; no migration attempted.'}
 if($baseline.project_ref -cne $ref -or $baseline.current_user -cne 'postgres' -or $baseline.session_user -cne 'postgres' -or -not $baseline.regions_exists -or -not $baseline.events_exists -or -not $baseline.events_rls_enabled -or -not $baseline.audit_exists -or -not $baseline.staff_role_checker_exists -or -not $baseline.alerts_table_absent -or -not $baseline.alerts_reader_absent){throw 'STOP: read-only baseline mismatch or existing alert objects detected; no migration attempted.'}
 Write-Host 'Read-only baseline passed. Native psql will request the database password for the guarded transaction; do not paste it into chat, arguments, files, or logs.'
 $second=(& $psql @baseArgs --file $migration --file $postflight|Out-String).Trim()
 if($LASTEXITCODE -ne 0){throw 'STOP: migration failed or commit status uncertain. Do not retry; reconcile dev schema first.'}
 try{$verified=$second|ConvertFrom-Json}catch{throw 'STOP: postflight output invalid; do not retry before reconciling dev schema.'}
 if($verified.status -cne 'PASS' -or -not $verified.rls_enabled -or $verified.anonymous_table_select -or -not $verified.public_reader -or -not $verified.audit_trigger -or -not $verified.public_reader_anon_execute){throw 'STOP: location-alert postflight failed; do not retry before reconciling dev schema.'}
 Write-Output 'Location-alert SQL postflight PASS on rekansiaga-dev. No Edge Function, secret, push service, or application data was changed. Frontend flags remain OFF; enable only after reviewing this postflight and approving a synthetic live acceptance.'
}finally{Pop-Location}
