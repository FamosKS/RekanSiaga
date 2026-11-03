import assert from 'node:assert/strict'
import test from 'node:test'
import { createReportHandler } from '../supabase/functions/_shared/reportHandler.ts'
import { ApiError, maxRequestBytes, parseReportRequest } from '../supabase/functions/_shared/reportContract.ts'
const code = 'RS-0123456789ABCDEF', token = 'a'.repeat(64)
const submit = { action: 'submit', report_type: 'Banjir', title: 'TEST-LIVE laporan lokal', description: 'Data pengujian lokal tanpa kejadian aktual.', region_name: 'Wilayah uji', location_description: 'Lokasi contoh untuk pengujian', privacy: true, captcha_token: 'synthetic-test-only' }
function setup(options = {}) {
  const calls = []
  const handler = createReportHandler({ allowedOrigins: ['http://localhost:5173'], enabled: true,
    clientKey: async () => 'client-hash', rateLimit: async () => { calls.push('rate'); return true }, challenge: async () => { calls.push('captcha'); return true },
    upload: async () => { calls.push('upload') }, cleanup: async () => { calls.push('cleanup') },
    submit: async () => { calls.push('submit'); return { tracking_code: code, access_token: token, expires_in_days: 90 } },
    track: async (candidate, secret) => { calls.push('track'); return candidate === code && secret === token ? { status: 'verified', created_at: '2026-10-26T00:00:00Z', updated_at: '2026-10-26T01:00:00Z', history: [{ status: 'verified', changed_at: '2026-10-26T01:00:00Z' }] } : null },
    attachment: async () => null, ...options })
  const send = (body, headers = {}) => handler(new Request('http://localhost/report-gateway', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', ...headers }, body: JSON.stringify(body) }))
  return { handler, send, calls }
}
await test('Disabled gateway, wrong method/origin/content type fail before data operations', async () => {
  const off = setup({ enabled: false }); assert.equal((await off.send(submit)).status, 503); assert.equal(off.calls.length, 0)
  const api = setup(); assert.equal((await api.handler(new Request('http://localhost', { method: 'GET' }))).status, 405)
  assert.equal((await api.send(submit, { Origin: 'https://attacker.invalid' })).status, 403)
  assert.equal((await api.send(submit, { 'Content-Type': 'text/plain' })).status, 415)
  assert.equal(api.calls.length, 0)
})
await test('Oversized and malformed streaming JSON cannot reach CAPTCHA/database', async () => {
  const api = setup()
  assert.equal((await api.send(submit, { 'Content-Length': String(maxRequestBytes + 1) })).status, 413)
  const response = await api.handler(new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' }))
  assert.equal(response.status, 400); assert.equal(api.calls.length, 0)
})
await test('Missing privacy, blank fields, invalid coordinates/token or oversized photo rejected', () => {
  for (const patch of [{ privacy: false }, { title: ' ' }, { latitude: 0 }, { latitude: 91, longitude: 0 }, { photo: { mime_type: 'text/html', base64: 'YQ==' } }]) assert.throws(() => parseReportRequest({ ...submit, ...patch }))
  assert.throws(() => parseReportRequest({ action: 'track', tracking_code: code, access_token: 'x'.repeat(64), captcha_token: 'fixture' }))
})
await test('Quota and mandatory CAPTCHA fail closed with no submission/upload', async () => {
  const limited = setup({ rateLimit: async () => false }); assert.equal((await limited.send(submit)).status, 429); assert.equal(limited.calls.length, 0)
  const rejected = setup({ challenge: async () => false }); assert.equal((await rejected.send(submit)).status, 403); assert.deepEqual(rejected.calls, ['rate'])
})
await test('Valid submission returns private receipt and no cache; SQL rejection cannot become success', async () => {
  const api = setup(); const response = await api.send(submit)
  assert.equal(response.status, 201); assert.equal(response.headers.get('Cache-Control'), 'no-store'); assert.equal((await response.json()).access_token, token)
  assert.deepEqual(api.calls, ['rate', 'captcha', 'submit'])
  const fail = setup({ submit: async () => { throw new ApiError(400, 'INVALID_INPUT') } }); assert.equal((await fail.send(submit)).status, 400)
})
await test('MIME spoofing rejected; definite rejection cleans only own upload; uncertain commit preserves evidence', async () => {
  const fake = setup(); assert.equal((await fake.send({ ...submit, photo: { mime_type: 'image/png', base64: btoa('<script>not an image</script>') } })).status, 400); assert.ok(!fake.calls.includes('upload'))
  const photo = { mime_type: 'image/png', base64: btoa(String.fromCharCode(137,80,78,71,13,10,26,10)) }
  const rejected = setup({ submit: async () => { throw new ApiError(400, 'INVALID_INPUT') } }); assert.equal((await rejected.send({ ...submit, photo })).status, 400); assert.ok(rejected.calls.includes('cleanup'))
  const uncertain = setup({ submit: async () => { throw new Error('transport failed after possible COMMIT') } }); assert.equal((await uncertain.send({ ...submit, photo })).status, 503); assert.ok(!uncertain.calls.includes('cleanup'))
})
await test('Wrong owner token returns indistinguishable 404; valid tracking reveals only status/time/history', async () => {
  const api = setup(); const wrong = await api.send({ action: 'track', tracking_code: code, access_token: 'b'.repeat(64), captcha_token: 'fixture' }); assert.equal(wrong.status, 404); assert.deepEqual(await wrong.json(), { error: { code: 'NOT_FOUND' } })
  const response = await api.send({ action: 'track', tracking_code: code, access_token: token, captcha_token: 'fixture' }); const data = await response.json(); assert.equal(data.status, 'verified'); assert.deepEqual(Object.keys(data).sort(), ['created_at','history','status','updated_at']); assert.ok(!JSON.stringify(data).includes(token))
})
await test('Attachment cannot be signed without a verified user/authorized RLS adapter; backend errors redacted', async () => {
  const api = setup(); assert.equal((await api.send({ action: 'attachment', attachment_id: '00000000-0000-4000-8000-000000000001' })).status, 401)
  const denied = setup({ attachment: async () => { throw new ApiError(403, 'FORBIDDEN') } }); assert.equal((await denied.send({ action: 'attachment', attachment_id: '00000000-0000-4000-8000-000000000001' }, { Authorization: 'Bearer eyJfixture.payload.signature' })).status, 403)
  const fail = setup({ track: async () => { throw new Error('secret backend diagnostic') } }); const response = await fail.send({ action: 'track', tracking_code: code, access_token: token, captcha_token: 'fixture' }); assert.ok(!JSON.stringify(await response.json()).includes('secret backend'))
})
await test('Attachment rejects malformed authorization headers before backend access', async () => {
  const api = setup({ attachment: async () => { throw new ApiError(403, 'FORBIDDEN') } })
  const response = await api.send({ action: 'attachment', attachment_id: '00000000-0000-4000-8000-000000000001' }, { Authorization: 'not-a-bearer-token' })
  assert.equal(response.status, 401)
})
