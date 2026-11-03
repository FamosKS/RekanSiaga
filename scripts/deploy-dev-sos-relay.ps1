[CmdletBinding()]
param([switch]$ApprovedSosRelay,[string]$PoolerHost)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$ref='uiuiouosblyuqgnvfpeh'
$root=Split-Path -Parent $PSScriptRoot
if(-not $ApprovedSosRelay){Write-Output 'LOCAL ONLY. Target rekansiaga-dev. No network or Cloud changes. Use -ApprovedSosRelay only after explicitly approving the exact additive SOS schema/RPC/RLS/Edge scope.';return}
$psql='C:\Program Files\PostgreSQL\18\bin\psql.exe'
if(-not(Test-Path -LiteralPath $psql -PathType Leaf)){throw 'STOP: reviewed PostgreSQL 18 psql executable is required.'}
$cli=(Get-Command npx.cmd -ErrorAction Stop).Source
Push-Location -LiteralPath $root
try{
 $projectsText=& $cli --yes supabase@2.120.0 projects list --output json
 if($LASTEXITCODE -ne 0){throw 'STOP: Supabase CLI authentication failed; no database mutation attempted.'}
 $projects=($projectsText|Out-String)|ConvertFrom-Json
 if(@($projects|Where-Object{$_.id -ceq $ref -and $_.name -ceq 'rekansiaga-dev'}).Count -ne 1){throw 'STOP: exact rekansiaga-dev project not identified.'}
 $secretText=& $cli --yes supabase@2.120.0 secrets list --project-ref $ref --output json
 if($LASTEXITCODE -ne 0){throw 'STOP: could not verify Edge secret names; no SQL attempted.'}
 $secrets=($secretText|Out-String)|ConvertFrom-Json
 $names=@($secrets|ForEach-Object{$_.name})
 if('SOS_CREDENTIAL_HMAC_KEY' -notin $names -or 'SOS_ALLOWED_ORIGINS' -notin $names){throw 'STOP: configure SOS_CREDENTIAL_HMAC_KEY and SOS_ALLOWED_ORIGINS in Supabase Dashboard secret settings, then rerun only after checking no SQL has been applied.'}
 if([string]::IsNullOrWhiteSpace($PoolerHost)){$PoolerHost=Read-Host 'Session Pooler host copied from rekansiaga-dev > Connect > Session pooler (host only; no URL/password)'}
 $PoolerHost=$PoolerHost.Trim().ToLowerInvariant()
 if($PoolerHost -cnotmatch '^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$'){throw 'STOP: Session Pooler hostname format rejected.'}
 $connection="host=$PoolerHost port=5432 dbname=postgres sslmode=require connect_timeout=20 application_name=rekansiaga_sos_relay_v1"
 $ack="SET rekansiaga.release_ref='$ref'; SET rekansiaga.release_approval='approve-dev-sos-relay-v1';"
 $preflight=Join-Path $root 'supabase\releases\dev-sos-relay-preflight.sql'
 $migration=Join-Path $root 'supabase\releases\dev-sos-relay-v1.PROPOSED.sql'
 $postflight=Join-Path $root 'supabase\releases\dev-sos-relay-postflight.sql'
 $baseArgs=@('-X','-W','-q','-A','-t','--set=ON_ERROR_STOP=1','--set=VERBOSITY=terse','--username',"postgres.$ref",'--dbname',$connection,'--command',$ack)
 $first=(& $psql @baseArgs --file $preflight|Out-String).Trim()
 if($LASTEXITCODE -ne 0){throw 'STOP: read-only preflight failed; no migration attempted.'}
 try{$baseline=$first|ConvertFrom-Json}catch{throw 'STOP: read-only preflight output invalid; no migration attempted.'}
 if($baseline.project_ref -cne $ref -or $baseline.current_user -cne 'postgres' -or $baseline.session_user -cne 'postgres' -or -not $baseline.staff_rbac_exists -or -not $baseline.audit_exists -or -not $baseline.staff_profiles_exists -or -not $baseline.sos_objects_absent -or -not $baseline.sos_rpcs_absent){throw 'STOP: read-only baseline mismatch or SOS objects already exist; no migration attempted.'}
 Write-Host 'Read-only baseline passed. Native psql will request DB password for guarded transaction; do not paste it into chat, arguments, files, or logs.'
 $second=(& $psql @baseArgs --file $migration --file $postflight|Out-String).Trim()
 if($LASTEXITCODE -ne 0){throw 'STOP: migration failed or commit status uncertain. Do not retry SQL; reconcile schema read-only first.'}
 try{$verified=$second|ConvertFrom-Json}catch{throw 'STOP: postflight output invalid; do not retry before reconciling schema read-only.'}
 if($verified.project_ref -cne $ref -or $verified.current_user -cne 'postgres' -or $verified.session_user -cne 'postgres' -or -not $verified.requests_rls -or -not $verified.history_rls -or -not $verified.anon_select_denied -or -not $verified.public_submit_denied -or -not $verified.public_track_denied -or -not $verified.public_revoke_denied -or -not $verified.service_submit_allowed -or -not $verified.service_revoke_allowed -or -not $verified.admin_update_allowed -or -not $verified.staff_role_guard){throw 'STOP: SOS postflight failed. Do not deploy function or retry SQL; reconcile read-only.'}
 Write-Output 'SOS SQL postflight PASS. Deploying only sos-relay Edge Function now.'
 & $cli --yes supabase@2.120.0 functions deploy sos-relay --project-ref $ref --use-api --no-verify-jwt
 if($LASTEXITCODE -ne 0){throw 'STOP: SQL is already applied but Edge deployment failed/uncertain. Do not retry SQL; reconcile function deployment only.'}
 Write-Output 'SOS SQL postflight PASS and sos-relay Edge Function deployed to rekansiaga-dev. Frontend flags remain OFF; enable only after reviewing the postflight and running approved synthetic acceptance.'
}finally{Pop-Location}
