[CmdletBinding()]
param([switch]$ApprovedEventMedia,[string]$PoolerHost)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$ref='uiuiouosblyuqgnvfpeh'
$root=Split-Path -Parent $PSScriptRoot
if(-not $ApprovedEventMedia){Write-Output 'LOCAL ONLY. Target is rekansiaga-dev. No network or Cloud changes. Add -ApprovedEventMedia only after approving event-media SQL, function deployment, and synthetic acceptance.';return}
$psql='C:\Program Files\PostgreSQL\18\bin\psql.exe'
if(-not(Test-Path -LiteralPath $psql -PathType Leaf)){throw 'STOP: reviewed PostgreSQL 18 psql executable is required.'}
$cli=(Get-Command npx.cmd -ErrorAction Stop).Source
Push-Location -LiteralPath $root
try{
 $projectsText=& $cli --yes supabase@2.120.0 projects list --output json
 if($LASTEXITCODE -ne 0){throw 'STOP: Supabase CLI authentication failed; no database mutation attempted.'}
 $projects=($projectsText|Out-String)|ConvertFrom-Json
 if(@($projects|Where-Object{$_.id -ceq $ref -and $_.name -ceq 'rekansiaga-dev'}).Count -ne 1){throw 'STOP: exact rekansiaga-dev project not identified.'}
 if([string]::IsNullOrWhiteSpace($PoolerHost)){$PoolerHost=Read-Host 'Session Pooler host from rekansiaga-dev > Connect > Session pooler (host only; no URL/password)'}
 $PoolerHost=$PoolerHost.Trim().ToLowerInvariant()
 if($PoolerHost -cnotmatch '^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$'){throw 'STOP: Session Pooler hostname format rejected.'}
 $connection="host=$PoolerHost port=5432 dbname=postgres sslmode=require connect_timeout=20 application_name=rekansiaga_event_media_v1"
 $ack="SET rekansiaga.release_ref='$ref'; SET rekansiaga.release_approval='approve-dev-event-media-v1';"
 $preflight=Join-Path $root 'supabase\releases\dev-event-media-preflight.sql'
 $migration=Join-Path $root 'supabase\releases\dev-event-media.PROPOSED.sql'
 $postflight=Join-Path $root 'supabase\releases\dev-event-media-postflight.sql'
 $baseArgs=@('-X','-W','-q','-A','-t','--set=ON_ERROR_STOP=1','--set=VERBOSITY=terse','--username',"postgres.$ref",'--dbname',$connection,'--command',$ack)
 $first=(& $psql @baseArgs --file $preflight|Out-String).Trim()
 if($LASTEXITCODE -ne 0){throw 'STOP: read-only preflight failed; no migration/function deployment attempted.'}
 try{$baseline=$first|ConvertFrom-Json}catch{throw 'STOP: read-only preflight output is invalid; no migration/function deployment attempted.'}
 if($baseline.project_ref -cne $ref -or $baseline.current_user -cne 'postgres' -or $baseline.session_user -cne 'postgres' -or -not $baseline.event_rls -or $baseline.media_table_exists -or $baseline.bucket_exists -or $baseline.prepare_rpc_exists -or $baseline.read_rpc_exists -or $baseline.policy_collision){throw 'STOP: baseline mismatch or existing objects detected; no migration/function deployment attempted.'}
 Write-Host 'Read-only baseline passed. Native psql will now request the database password for the guarded transaction; do not paste it into chat or command arguments.'
 $second=(& $psql @baseArgs --file $migration --file $postflight|Out-String).Trim()
 if($LASTEXITCODE -ne 0){throw 'STOP: migration failed or commit status is uncertain. Do not retry; reconcile dev objects first. Edge deployment was not attempted.'}
 $lines=@($second -split '\r?\n'|Where-Object{$_ -match '\S'})
 if($lines.Count -ne 2){throw 'STOP: expected migration and postflight confirmations; Edge deployment not attempted.'}
 try{$applied=$lines[0]|ConvertFrom-Json;$verified=$lines[1]|ConvertFrom-Json}catch{throw 'STOP: SQL confirmation output invalid; Edge deployment not attempted.'}
 if($applied.status -cne 'APPLIED' -or $applied.project_ref -cne $ref -or $verified.status -cne 'PASS' -or $verified.project_ref -cne $ref){throw 'STOP: migration/postflight confirmation failed; Edge deployment not attempted.'}
 & $cli --yes supabase@2.120.0 functions deploy event-media --project-ref $ref --use-api --no-verify-jwt
 if($LASTEXITCODE -ne 0){throw 'STOP: event-media Edge deployment not confirmed. SQL may already be applied; reconcile, then deploy only the function.'}
 Write-Output 'Event-media SQL postflight PASS and Edge Function deployment confirmed on rekansiaga-dev. Frontend flag remains OFF; activate only after manual function smoke and synthetic acceptance.'
}finally{Pop-Location}
