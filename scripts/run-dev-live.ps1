param([switch]$ApprovedArticleScope)
$ErrorActionPreference = 'Stop'
if (-not $ApprovedArticleScope) {
    throw 'No network requests: operator approval is required for one marked dev article, its updates, negative authorization probe, and exact-row cleanup.'
}

function Read-SessionToken([string]$Prompt) {
    $secure = Read-Host -Prompt $Prompt -AsSecureString
    $pointer = [IntPtr]::Zero
    try {
        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
        $secure.Dispose()
    }
}

$names = @('REKANSIAGA_DEV_MANAGER_JWT', 'REKANSIAGA_DEV_DENIED_JWT', 'REKANSIAGA_DEV_E2E_APPROVAL')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$pushed = $false
try {
    Write-Host 'Target: rekansiaga-dev / uiuiouosblyuqgnvfpeh. Use existing DEV sessions only; no new accounts.'
    [Environment]::SetEnvironmentVariable('REKANSIAGA_DEV_MANAGER_JWT', (Read-SessionToken 'Existing information_manager/super_admin access token (hidden)'), 'Process')
    [Environment]::SetEnvironmentVariable('REKANSIAGA_DEV_DENIED_JWT', (Read-SessionToken 'Existing user without information permission access token (hidden)'), 'Process')
    [Environment]::SetEnvironmentVariable('REKANSIAGA_DEV_E2E_APPROVAL', 'one-marked-article-with-cleanup', 'Process')
    Push-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
    $pushed = $true
    & node (Join-Path $PSScriptRoot 'test-dev-live.mjs') --live
    if ($LASTEXITCODE -ne 0) { throw 'Live checks/cleanup did not pass. Review the redacted result and exact created row; do not retry blindly.' }
}
finally {
    if ($pushed) { Pop-Location }
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    $previous.Clear()
}
