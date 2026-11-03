// Scan source and built bundles without printing any matched credential material.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
function files(folder) { return readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(folder, entry.name)) : [path.join(folder, entry.name)]) }
const candidates = [...files('src'), ...files('dist')].filter(file => /\.(ts|tsx|js|html)$/.test(file))
let unsafe = 0
for (const file of candidates) {
  const content = readFileSync(file, 'utf8')
  if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(content) || /VITE_[A-Z_]*SERVICE_ROLE/.test(content)) unsafe++
  for (const match of content.matchAll(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g)) {
    try { if (JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString()).role === 'service_role') unsafe++ } catch { /* not a parseable JWT */ }
  }
}
assert.equal(unsafe, 0, 'Privileged credential pattern detected; details suppressed. Do not publish the build.')
mkdirSync('docs/qa/phase4a', { recursive: true })
writeFileSync('docs/qa/phase4a/client-secret-audit.json', JSON.stringify({ filesChecked: candidates.length, privilegedCredentialPatternsDetected: 0, scope: 'known Supabase secret/service_role patterns only, not an exhaustive secret scan' }, null, 2))
console.log(`PASS ${candidates.length} source/build files: no known Supabase privileged credential patterns. No credential values printed.`)
