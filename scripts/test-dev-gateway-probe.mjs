import assert from 'node:assert/strict'
import test from 'node:test'
import { probeGateway } from './check-dev-report-gateway.mjs'

const origin = 'http://localhost:5173'
function fixture(phase, override = {}) {
  const calls = []
  return {
    calls,
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      const denied = init.headers.Origin !== origin
      const body = init.body ? JSON.parse(init.body) : null
      let status, code
      if (denied) { status = 403; code = 'ORIGIN_DENIED' }
      else if (init.method === 'OPTIONS') status = 204
      else if (init.method === 'GET') { status = 405; code = 'METHOD_NOT_ALLOWED' }
      else if (phase === 'disabled') { status = 503; code = 'SERVICE_NOT_READY' }
      else if (body?.action === 'attachment') { status = 401; code = 'UNAUTHORIZED' }
      else { status = 400; code = 'INVALID_INPUT' }
      status = override.status ?? status
      const headers = { ...(denied ? {} : { 'Access-Control-Allow-Origin': override.origin ?? origin }), 'sb-project-ref': override.ref ?? 'uiuiouosblyuqgnvfpeh' }
      return new Response(status === 204 ? null : JSON.stringify({ error: { code } }), { status, headers })
    },
  }
}
test('Disabled D probe never sends a valid report, quota request, JWT or storage request', async () => {
  const api = fixture('disabled')
  const result = await probeGateway({ phase: 'disabled', origin, publicKey: 'sb_publishable_local_fixture', fetchImpl: api.fetchImpl })
  assert.equal(result.status, 'PASS'); assert.equal(result.active, false); assert.equal(result.validReportSubmissions, 0)
  assert.equal(api.calls.length, 4)
  assert.deepEqual(api.calls.filter(c => c.init.method === 'POST').map(c => JSON.parse(c.init.body)), [{}])
  for (const call of api.calls) { assert.equal(call.url, 'https://uiuiouosblyuqgnvfpeh.supabase.co/functions/v1/report-gateway'); assert.equal(call.init.headers.Authorization, undefined); assert.equal(call.init.redirect, 'error') }
})
test('Enabled probe remains rejection-only and distinguishes config activation from live E2E', async () => {
  const api = fixture('enabled')
  const result = await probeGateway({ phase: 'enabled', origin, publicKey: 'sb_publishable_local_fixture', fetchImpl: api.fetchImpl })
  assert.equal(result.active, true); assert.equal(result.liveSubmitTrackAcceptance, 'NOT_RUN')
  assert.equal(api.calls.length, 5)
  assert.ok(api.calls.every(c => !c.init.body || !['submit', 'track'].includes(JSON.parse(c.init.body).action)))
})
test('Wrong project, CORS mismatch or unexpected deployment status fail closed', async () => {
  for (const override of [{ ref: 'WRONG_PROJECT' }, { origin: 'https://wrong.invalid' }, { status: 404 }]) {
    await assert.rejects(probeGateway({ phase: 'disabled', origin, publicKey: 'sb_publishable_local_fixture', fetchImpl: fixture('disabled', override).fetchImpl }))
  }
})
test('Privileged key, wildcard origin or nonlocal HTTP origin rejected before HTTP', async () => {
  let calls = 0
  for (const config of [{ publicKey: 'sb_secret_not_allowed', origin }, { publicKey: 'sb_publishable_local_fixture', origin: '*' }, { publicKey: 'sb_publishable_local_fixture', origin: 'http://example.com' }]) {
    await assert.rejects(probeGateway({ phase: 'disabled', ...config, fetchImpl: async () => { calls++; throw Error('No request expected') } }))
  }
  assert.equal(calls, 0)
})
