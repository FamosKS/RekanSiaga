// Operator helper: edit only local frontend report flags. Never print env.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

export function updateGatewayFlag(source, enabled) {
  const pattern = /^[\t ]*(?:export[\t ]+)?VITE_REPORT_GATEWAY_ENABLED[\t ]*=[^\r\n]*/gm
  assert.ok([...source.matchAll(pattern)].length <= 1, 'Duplicate frontend gateway flags; values suppressed')
  const assignment = `VITE_REPORT_GATEWAY_ENABLED=${enabled ? 'true' : 'false'}`
  if (pattern.test(source)) return source.replace(pattern, assignment)
  const newline = source.includes('\r\n') ? '\r\n' : '\n'
  return source + (source.endsWith('\n') || !source ? '' : newline) + assignment + newline
}
export function updateSingleTrackingFlag(source, enabled) {
  const pattern = /^[\t ]*(?:export[\t ]+)?VITE_REPORT_SINGLE_CODE_ENABLED[\t ]*=[^\r\n]*/gm
  assert.ok([...source.matchAll(pattern)].length <= 1, 'Duplicate frontend single-code flags; values suppressed')
  const assignment = `VITE_REPORT_SINGLE_CODE_ENABLED=${enabled ? 'true' : 'false'}`
  if (pattern.test(source)) return source.replace(pattern, assignment)
  const newline = source.includes('\r\n') ? '\r\n' : '\n'
  return source + (source.endsWith('\n') || !source ? '' : newline) + assignment + newline
}

function main() {
  const enable = process.argv.includes('--enable'), disable = process.argv.includes('--disable')
  assert.ok(!(enable && disable), 'Select one frontend flag action')
  const env = loadEnv('development', process.cwd(), 'VITE_')
  assert.ok(env.VITE_SUPABASE_URL === 'https://uiuiouosblyuqgnvfpeh.supabase.co', 'Wrong frontend dev target; values suppressed')
  assert.ok(/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''), 'Dev publishable key required; values suppressed')
  assert.ok(env.VITE_TURNSTILE_SITE_KEY && !/replace|not.configured/i.test(env.VITE_TURNSTILE_SITE_KEY), 'Public Turnstile sitekey required; values suppressed')
  const file = '.env.local'
  if (enable || disable) {
    const before = readFileSync(file, 'utf8')
    writeFileSync(file, updateSingleTrackingFlag(updateGatewayFlag(before, enable), enable), 'utf8')
    const current = loadEnv('development', process.cwd(), 'VITE_')
    assert.ok(current.VITE_REPORT_GATEWAY_ENABLED === String(enable) && current.VITE_REPORT_SINGLE_CODE_ENABLED === String(enable), 'Frontend flag shadowed by another environment; values suppressed')
  }
  console.log(JSON.stringify({ projectRef: 'uiuiouosblyuqgnvfpeh', publicSitekeyConfigured: true, gatewayEnabled: (enable || disable) ? enable : env.VITE_REPORT_GATEWAY_ENABLED === 'true', localFlagChanged: enable || disable }))
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main() } catch { console.error('Frontend gateway configuration failed; environment values suppressed.'); process.exitCode = 1 }
}
