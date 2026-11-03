[CmdletBinding()]
param([switch]$ApprovedFeaturedArticle,[string]$PoolerHost)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest
$ref='uiuiouosblyuqgnvfpeh'
$root=Split-Path -Parent $PSScriptRoot
if(-not $ApprovedFeaturedArticle){Write-Output 'LOCAL ONLY. Target is rekansiaga-dev. No network or Cloud changes. Add -ApprovedFeaturedArticle only after approving the additive featured-article schema/RPC and its postflight.';return}
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
 $connection="host=$PoolerHost port=5432 dbname=postgres sslmode=require connect_timeout=20 application_name=rekansiaga_featured_article_v1"
 $ack="SET rekansiaga.release_ref='$ref'; SET rekansiaga.release_approval='approve-dev-featured-article-v1';"
 $preflight=Join-Path $root 'supabase\releases\dev-featured-article-preflight.sql'
 $migration=Join-Path $root 'supabase\releases\dev-featured-article.PROPOSED.sql'
 $postflight=Join-Path $root 'supabase\releases\dev-featured-article-postflight.sql'
 $baseArgs=@('-X','-W','-q','-A','-t','--set=ON_ERROR_STOP=1','--set=VERBOSITY=terse','--username',"postgres.$ref",'--dbname',$connection,'--command',$ack)
 $first=(& $psql @baseArgs --file $preflight|Out-String).Trim()
 if($LASTEXITCODE -ne 0){throw 'STOP: read-only preflight failed; no migration attempted.'}
 try{$baseline=$first|ConvertFrom-Json}catch{throw 'STOP: read-only preflight output invalid; no migration attempted.'}
 if($baseline.project_ref -cne $ref -or $baseline.current_user -cne 'postgres' -or $baseline.session_user -cne 'postgres' -or -not $baseline.articles_exists -or -not $baseline.articles_rls_enabled -or -not $baseline.published_only_policy_exists -or -not $baseline.audit_logs_exists -or -not $baseline.staff_role_rpc_exists -or $baseline.feature_column_exists -or -not $baseline.feature_rpcs_absent){throw 'STOP: read-only baseline mismatch or existing feature objects detected; no migration attempted.'}
 Write-Host 'Read-only baseline passed. Native psql will request the password again for the guarded transaction; do not paste it into chat, arguments, files, or logs.'
 $second=(& $psql @baseArgs --file $migration --file $postflight|Out-String).Trim()
 if($LASTEXITCODE -ne 0){throw 'STOP: migration failed or commit status uncertain. Do not retry; reconcile dev schema first.'}
 try{$verified=$second|ConvertFrom-Json}catch{throw 'STOP: postflight output invalid; do not retry before reconciling dev schema.'}
 if($verified.status -cne 'PASS' -or $verified.project_ref -cne $ref -or -not $verified.articles_rls_enabled -or -not $verified.unique_feature_index){throw 'STOP: featured article postflight failed; do not retry before reconciling dev schema.'}
 Write-Output 'Featured-article SQL postflight PASS on rekansiaga-dev. No function deployment required. Frontend flag remains OFF; enable VITE_FEATURED_ARTICLE_ENABLED only after reviewing this postflight.'
}finally{Pop-Location}
