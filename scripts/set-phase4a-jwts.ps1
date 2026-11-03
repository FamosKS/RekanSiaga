# Run with & in the operator's existing PowerShell, never powershell -File.
# Auth only: no fixture, SQL, acceptance, storage, or credential-file access.
& {
    $ErrorActionPreference = 'Stop'
    $VerbosePreference = 'SilentlyContinue'
    $DebugPreference = 'SilentlyContinue'
    $stage = 'LOCAL_CONFIG'
    $tokens = @{}
    $refresh = $null
    $secure = $null
    $body = $null
    $session = $null
    $headers = $null
    # Fail closed: never leave old or partially replaced credentials available.
    Remove-Item Env:PHASE4A_CONTROL_JWT, Env:PHASE4A_SUBJECT_JWT, Env:PHASE4A_SUBJECT_REFRESH -ErrorAction SilentlyContinue
    try {
        $validator = @'
import fs from 'node:fs';
import path from 'node:path';
import {validateManifest} from './scripts/prepare-phase4a-fixture.mjs';
import {publicKey} from './scripts/test-phase4a-api.mjs';
try {
 const e=process.env;
 if(e.PHASE4A_PROJECT_REF!=='fweeyflixnqbvvceuent') throw 0;
 if(e.PHASE4A_SESSION_APPROVED && e.PHASE4A_SESSION_APPROVED!=='approved-dedicated-session') throw 0;
 publicKey(e.PHASE4A_PUBLIC_KEY);
 const p=path.resolve(e.PHASE4A_MANIFEST);
 if(path.dirname(p)!==path.resolve('docs/qa/phase4a/remediation-a/private') || fs.realpathSync(p)!==p) throw 0;
 console.log(JSON.stringify(validateManifest(JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'')))));
} catch { process.exitCode=1; }
'@
        $mapping = & node --input-type=module -e $validator 2>$null
        if ($LASTEXITCODE -ne 0 -or !$mapping) { throw 'Invalid local configuration' }
        $ids = $mapping | ConvertFrom-Json
        $base = 'https://fweeyflixnqbvvceuent.supabase.co/auth/v1'
        foreach ($label in @('CONTROL', 'SUBJECT')) {
            $stage = "${label}_LOGIN"
            # Email is also hidden to avoid transcript/console disclosure.
            $emailSecure = Read-Host "$label email" -AsSecureString
            $secure = Read-Host "$label password" -AsSecureString
            try {
                $body = @{
                    email = ([Net.NetworkCredential]::new('', $emailSecure)).Password
                    password = ([Net.NetworkCredential]::new('', $secure)).Password
                } | ConvertTo-Json -Compress
                $headers = @{ apikey = $env:PHASE4A_PUBLIC_KEY }
                $session = Invoke-RestMethod -Uri "$base/token?grant_type=password" -Method Post -Headers $headers -ContentType 'application/json' -Body $body -MaximumRedirection 0 -TimeoutSec 20 -Verbose:$false -Debug:$false
            } finally {
                $body = $null
                $secure.Dispose(); $secure = $null
                $emailSecure.Dispose(); $emailSecure = $null
            }
            $stage = "${label}_VERIFY"
            $parts = $session.access_token.Split('.')
            if ($parts.Count -ne 3) { throw 'Invalid JWT' }
            $payload = $parts[1].Replace('-', '+').Replace('_', '/')
            $payload = $payload.PadRight($payload.Length + ((4 - $payload.Length % 4) % 4), '=')
            $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
            $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
            if ($claims.iss -cne $base -or $claims.sub -cne $ids.$label -or $claims.role -cne 'authenticated' -or [double]$claims.exp -le ($now + 60)) { throw 'JWT claims mismatch or expiry too near' }
            if ($session.user.id -cne $ids.$label) { throw 'Login identity mismatch' }
            $headers.Authorization = 'Bearer ' + $session.access_token
            $identity = Invoke-RestMethod -Uri "$base/user" -Method Get -Headers $headers -MaximumRedirection 0 -TimeoutSec 20 -Verbose:$false -Debug:$false
            if ($identity.id -cne $ids.$label) { throw 'Verified identity mismatch' }
            $tokens[$label] = $session.access_token
            if ($label -eq 'SUBJECT' -and $env:PHASE4A_SESSION_APPROVED -eq 'approved-dedicated-session') {
                if (!$session.refresh_token) { throw 'Missing dedicated refresh token' }
                $refresh = $session.refresh_token
            }
            $session = $null; $headers = $null
        }
        $env:PHASE4A_CONTROL_JWT = $tokens.CONTROL
        $env:PHASE4A_SUBJECT_JWT = $tokens.SUBJECT
        if ($refresh) { $env:PHASE4A_SUBJECT_REFRESH = $refresh }
        Write-Host 'PASS CONTROL/SUBJECT staging Auth + manifest UID verified; JWT environment ready in this PowerShell. SQL/Acceptance NOT_RUN.'
    } catch {
        Remove-Item Env:PHASE4A_CONTROL_JWT, Env:PHASE4A_SUBJECT_JWT, Env:PHASE4A_SUBJECT_REFRESH -ErrorAction SilentlyContinue
        # Never render the underlying exception, HTTP request, or response body.
        Write-Host "BLOCKED $stage; JWT environment cleared. No automatic retry. SQL/Acceptance NOT_RUN."
    } finally {
        $tokens.Clear(); $refresh = $null; $body = $null; $session = $null; $headers = $null
        if ($secure) { $secure.Dispose() }
        if ($emailSecure) { $emailSecure.Dispose() }
        # PowerShell retains caught ErrorRecords (which may reference HTTP input).
        $Error.Clear()
    }
}
