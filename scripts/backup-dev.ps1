[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$DatabaseUrl,
  [Parameter(Mandatory = $true)]
  [string]$OutputFile
)

$ErrorActionPreference = 'Stop'
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if (-not $pgDump -or -not $pgRestore) {
  throw 'pg_dump and pg_restore are required. Install PostgreSQL client tools; do not install or upgrade the Supabase plan.'
}

$output = [System.IO.Path]::GetFullPath($OutputFile)
$parent = Split-Path -Parent $output
if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
if (Test-Path -LiteralPath $output) {
  throw "Refusing to overwrite existing backup: $output"
}

& $pgDump.Source '--dbname' $DatabaseUrl '--format=custom' '--file' $output '--no-owner' '--no-privileges' '--verbose'
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
& $pgRestore.Source '--list' $output | Out-File -Encoding utf8 "$output.list"
if ($LASTEXITCODE -ne 0) { throw "pg_restore --list failed with exit code $LASTEXITCODE" }

$hash = Get-FileHash -Algorithm SHA256 -LiteralPath $output
[pscustomobject]@{
  backup = $output
  bytes = (Get-Item -LiteralPath $output).Length
  sha256 = $hash.Hash.ToLowerInvariant()
  toc = "$output.list"
  restore_test = 'ARCHIVE_LIST_ONLY; restore into a disposable PostgreSQL instance is still required'
} | ConvertTo-Json
