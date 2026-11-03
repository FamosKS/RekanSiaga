// Operator-only live probe. Default: no network, no environment/key reads.
// Sends only requests rejected before quota/report/storage operations.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

const ref = 'uiuiouosblyuqgnvfpeh'
const endpoint = `https://${ref}.supabase.co/functions/v1/report-gateway`

export async function probeGateway({ phase, origin, publicKey, activationOnly = false, fetchImpl = fetch }) {
  assert.ok(['disabled', 'enabled'].includes(phase), 'Invalid phase')
  assert.ok(!activationOnly || phase === 'enabled', 'Activation probe requires enabled phase')
  assert.ok(/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey ?? ''), 'Dev publishable key required; value suppressed')
  const parsed = new URL(origin)
  assert.ok(parsed.origin === origin && (parsed.protocol === 'https:' || parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)), 'Exact HTTPS origin or localhost origin required')
  const checks = []
  async function send(name, method, requestOrigin, body, status, code) {
    const response = await fetchImpl(endpoint, {
      method, headers: { apikey: publicKey, Origin: requestOrigin, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(15000),
    })
    const observedRef = response.headers.get('sb-project-ref') ?? response.headers.get('x-supabase-project-ref')
    assert.ok(!observedRef || observedRef === ref, 'Wrong response project')
    assert.equal(response.status, status, `${name}: unexpected HTTP status`)
    if (requestOrigin === origin) assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin, `${name}: CORS mismatch`)
    if (requestOrigin !== origin) assert.equal(response.headers.get('Access-Control-Allow-Origin'), null, 'Rejected origin was exposed')
    if (code) {
      const data = await response.json()
      assert.equal(data?.error?.code, code, `${name}: unexpected error contract`)
    } else await response.body?.cancel()
    checks.push({ name, status, outcome: 'PASS' })
  }
  if (!activationOnly) {
    await send('CORS OPTIONS', 'OPTIONS', origin, null, 204)
    await send('Rejected origin', 'OPTIONS', 'https://rekansiaga-unapproved.invalid', null, 403, 'ORIGIN_DENIED')
    await send('GET forbidden', 'GET', origin, null, 405, 'METHOD_NOT_ALLOWED')
  }
  await send(phase === 'disabled' ? 'Disabled before data operations' : 'Invalid input rejected before quota', 'POST', origin, {}, phase === 'disabled' ? 503 : 400, phase === 'disabled' ? 'SERVICE_NOT_READY' : 'INVALID_INPUT')
  if (phase === 'enabled') await send('Attachment requires staff JWT', 'POST', origin, { action: 'attachment', attachment_id: '00000000-0000-0000-0000-000000000000' }, 401, 'UNAUTHORIZED')
  return { projectRef: ref, phase, status: 'PASS', checks, validReportSubmissions: 0, liveSubmitTrackAcceptance: 'NOT_RUN', active: phase === 'enabled', ...(activationOnly ? { scope: 'activation-only; accepted D checks retained without rerun' } : {}) }
}

async function main() {
  if (!process.argv.includes('--live')) { console.log('NOT_RUN: operator --live required; no network or environment/key reads.'); return }
  const value = name => process.argv[process.argv.indexOf(name) + 1]
  const phase = process.argv.includes('--phase') ? value('--phase') : 'disabled'
  const origin = process.argv.includes('--origin') ? value('--origin') : ''
  const env = loadEnv('development', process.cwd(), 'VITE_')
  assert.equal(env.VITE_SUPABASE_URL, `https://${ref}.supabase.co`, 'Wrong dev frontend target')
  const result = await probeGateway({ phase, origin, publicKey: env.VITE_SUPABASE_PUBLISHABLE_KEY, activationOnly: process.argv.includes('--activation-only') })
  mkdirSync('../operator-evidence/dev-release-20261029', { recursive: true })
  writeFileSync(`../operator-evidence/dev-release-20261029/${phase === 'disabled' ? 'D' : 'E'}-gateway-probe.json`, JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Gateway check FAILED; details/keys/bodies suppressed. Check the confirmed dev deployment, origin and expected enabled/disabled phase.'); process.exitCode = 1 })
}
