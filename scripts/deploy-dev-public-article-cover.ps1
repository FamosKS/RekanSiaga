[CmdletBinding()]
param([switch]$ApprovedPublicArticleCover)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ref = 'uiuiouosblyuqgnvfpeh'
$root = Split-Path -Parent $PSScriptRoot
if (-not $ApprovedPublicArticleCover) {
  Write-Output 'LOCAL ONLY. Target is rekansiaga-dev. Add -ApprovedPublicArticleCover only after approving deployment of the public-article-cover read-only Edge Function.'
  return
}
$cli = (Get-Command npx.cmd -ErrorAction Stop).Source
Push-Location -LiteralPath $root
try {
  $projectsText = & $cli --yes supabase@2.120.0 projects list --output json
  if ($LASTEXITCODE -ne 0) { throw 'STOP: Supabase CLI authentication failed; no function deployment attempted.' }
  try { $projects = ($projectsText | Out-String) | ConvertFrom-Json }
  catch { throw 'STOP: Supabase CLI project list was not valid JSON; no function deployment attempted.' }
  if (@($projects | Where-Object { $_.id -ceq $ref -and $_.name -ceq 'rekansiaga-dev' }).Count -ne 1) {
    throw 'STOP: exact rekansiaga-dev project was not confirmed; no function deployment attempted.'
  }
  & $cli --yes supabase@2.120.0 functions deploy public-article-cover --project-ref $ref --use-api --no-verify-jwt
  if ($LASTEXITCODE -ne 0) { throw 'STOP: public-article-cover deployment was not confirmed.' }
  Write-Output 'public-article-cover Edge Function deployed to rekansiaga-dev. No SQL, Storage policy, bucket visibility, or application data was changed.'
} finally { Pop-Location }
