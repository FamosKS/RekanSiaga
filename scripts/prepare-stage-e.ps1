[CmdletBinding()]
param([switch]$ApprovedStageEScope)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$envPath = Join-Path $projectRoot '.env.local'
$runbook = Join-Path $projectRoot 'docs\runbooks\stage-e-complete.md'
if (-not (Test-Path -LiteralPath $envPath)) { throw '.env.local missing; do not supply credentials through arguments.' }
$content = [IO.File]::ReadAllText($envPath)
$target = [regex]::Match($content, '(?m)^VITE_SUPABASE_URL=([^\r\n]+)').Groups[1].Value.Trim()
if ($target -cne 'https://uiuiouosblyuqgnvfpeh.supabase.co') { throw 'STOP: exact rekansiaga-dev URL required; values suppressed.' }
if (-not (Test-Path -LiteralPath $runbook)) { throw 'Stage E scope document missing.' }
Write-Host 'Scope: docs/runbooks/stage-e-complete.md; dev only; no staging/Flutter/schema/deployment.'
if (-not $ApprovedStageEScope) {
  Write-Host 'CHECK ONLY. No flags changed and no Cloud requests. Review and approve the complete scope first.'
  exit 0
}
# This switch acknowledges the single runbook scope. It does not perform Cloud operations.
# Actual writes still require authenticated staff, database permissions and explicit UI actions.
$settings = [ordered]@{
  VITE_DEV_REMOTE_WRITES_APPROVED = 'false'
  VITE_DEV_ARTICLE_WRITES_APPROVED = 'false'
  VITE_DEV_CONTENT_WRITES_ENABLED = 'true'
  VITE_DEV_REPORT_REVIEW_ENABLED = 'true'
  VITE_DEV_REPORT_REVIEW_APPROVED = 'false'
  VITE_DEV_REPORT_REVIEW_ID = ''
}
$newline = if ($content.Contains("`r`n")) { "`r`n" } else { "`n" }
foreach ($entry in $settings.GetEnumerator()) {
  if (Test-Path ('Env:' + $entry.Key)) { throw ('STOP: remove process-level override for ' + $entry.Key + '; values suppressed.') }
  $pattern = '(?m)^' + [regex]::Escape($entry.Key) + '=[^\r\n]*'
  $matches = [regex]::Matches($content, $pattern)
  if ($matches.Count -gt 1) { throw ('STOP: duplicate configuration ' + $entry.Key) }
  if ($matches.Count -eq 1) { $content = [regex]::Replace($content, $pattern, ($entry.Key + '=' + $entry.Value)) }
  else { if (-not $content.EndsWith($newline)) { $content += $newline }; $content += $entry.Key + '=' + $entry.Value + $newline }
}
[IO.File]::WriteAllText($envPath, $content, (New-Object Text.UTF8Encoding($false)))
Write-Host 'Local content/review flags prepared. Global writes remain false. Other values preserved; no secrets printed.'
Write-Host 'Restart Vite once, then execute the complete approved runbook using existing staff accounts.'
Write-Host 'Cloud operations performed by this script: 0. No automatic submit, retry, deletion or deployment.'
