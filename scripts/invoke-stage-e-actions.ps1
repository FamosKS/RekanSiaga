[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$ActionsFile)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$file = (Resolve-Path -LiteralPath $ActionsFile).Path
if (-not $file.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Actions file must be inside this workspace.' }
$actions = ConvertFrom-Json -InputObject ([IO.File]::ReadAllText($file))
Push-Location $root
try {
  foreach ($action in $actions) {
    $action | ConvertTo-Json -Compress -Depth 5 | node scripts/stage-e-browser-action.mjs
    if ($LASTEXITCODE -ne 0) { throw 'LIVE action failed; batch stopped. Reconcile before retrying mutations.' }
  }
} finally { Pop-Location }
