// Test only the changed dev quota adapter and the existing quota RPC in a
// disposable local PostgreSQL runtime. No release A-C, Cloud or real credentials.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { PGlite } from '../.tools/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js'
import * as config from '../supabase/functions/_shared/gatewayConfig.ts'
import * as contract from '../supabase/functions/_shared/reportContract.ts'
import * as handler from '../supabase/functions/_shared/reportHandler.ts'

const db = await PGlite.create()
const release = readFileSync('supabase/releases/dev-live-admin.sql', 'utf8')
const start = release.indexOf('CREATE TABLE public.report_api_limits(')
const end = release.indexOf('CREATE FUNCTION public.submit_report_v1(', start)
assert.ok(start >= 0 && end > start)
await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;')
await db.exec(release.slice(start, end))
const source = ts.transpileModule(readFileSync('supabase/functions/report-gateway/index.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const origin = 'http://localhost:5173', code = 'RS-0123456789ABCDEF', access = 'a'.repeat(64)
const submit = { action: 'submit', report_type: 'Lainnya', title: 'TEST LOCAL quota', description: 'Laporan sintetis untuk pengujian kuota lokal.', region_name: 'Wilayah uji', location_description: 'Lokasi sintetis tanpa data pribadi', privacy: true, captcha_token: 'submit' }
const track = { action: 'track', tracking_code: code, access_token: access, captcha_token: 'track' }
function gateway({ enabled = true, quotaFailure = false, challenge = true, legacy = {} } = {}) {
  const env = { SUPABASE_URL: 'https://uiuiouosblyuqgnvfpeh.supabase.co', REPORT_PUBLIC_KEY: 'sb_publishable_local_fixture', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_local_fixture', TURNSTILE_SECRET_KEY: 'local_fixture_only', REPORT_ALLOWED_ORIGINS: origin, TURNSTILE_HOSTNAMES: 'localhost', REPORT_GATEWAY_ENABLED: String(enabled), ...legacy }
  const calls = []; let serve
  const admin = {
    async rpc(name, params) {
      calls.push({ name, params })
      if (name === 'report_api_rate_limit') {
        if (quotaFailure) return { data: null, error: { code: 'LOCAL_FIXTURE_FAILURE' } }
        const result = await db.query('SELECT public.report_api_rate_limit($1,$2) AS allowed', [params.p_action, params.p_client_hash])
        return { data: result.rows[0].allowed, error: null }
      }
      if (name === 'submit_report_v1') return { data: [{ tracking_code: code, access_token: access }], error: null }
      if (name === 'track_report_v1') return { data: { status: 'unverified', created_at: '2026-10-30T00:00:00Z', updated_at: '2026-10-30T00:00:00Z', history: [] }, error: null }
      throw Error('Unexpected RPC')
    },
    storage: { from() { throw Error('Quota denial must precede Storage access') } },
  }
  const modules = { 'npm:@supabase/supabase-js@2.118.0': { createClient: () => admin }, '../_shared/reportContract.ts': contract, '../_shared/reportHandler.ts': handler, '../_shared/gatewayConfig.ts': config }
  vm.runInNewContext(source, {
    exports: {}, require: name => { assert.ok(name in modules); return modules[name] },
    Deno: { env: { get: name => env[name] }, serve: callback => { serve = callback } },
    URLSearchParams, AbortSignal, crypto, Request, Response, Uint8Array,
    async fetch(url, init) {
      assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify')
      calls.push({ name: 'captcha' })
      return new Response(JSON.stringify({ success: challenge, action: init.body.get('response'), hostname: 'localhost' }))
    },
  })
  assert.ok(serve)
  const send = (body, headers = {}) => serve(new Request('https://uiuiouosblyuqgnvfpeh.supabase.co/functions/v1/report-gateway', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }))
  return { send, serve, calls }
}
async function reset() { await db.exec('TRUNCATE public.report_api_limits') }
const forged = n => ({ 'x-forwarded-for': `${n}.2.3.4, malformed, ::1`, 'cf-connecting-ip': `203.0.113.${n}`, 'x-real-ip': '127.0.0.1', 'x-client-info': `caller-${n}` })

try {
  await test('Actual Gateway entrypoint shares quota across spoofed headers, workers and legacy setting changes; actions stay separate', async () => {
    await reset()
    const a = gateway(), b = gateway({ legacy: { REPORT_TRUSTED_IP_HEADER: 'caller-controlled', REPORT_RATE_HMAC_KEY: 'ignored-even-if-rotated' } })
    for (let n = 0; n < 5; n++) assert.equal((await (n % 2 ? a : b).send(submit, forged(n))).status, 201)
    assert.equal((await gateway().send(submit, forged(99))).status, 429)
    for (let n = 0; n < 30; n++) assert.equal((await (n % 2 ? a : b).send(track, forged(n))).status, 200)
    const denied = gateway()
    assert.equal((await denied.send(track, { 'cf-connecting-ip': 'not-an-ip' })).status, 429)
    assert.equal(denied.calls.length, 1) // no CAPTCHA or tracking read after quota denial
    assert.equal(denied.calls[0].params.p_client_hash, config.DEV_GLOBAL_QUOTA_HASH)
    assert.ok([...a.calls, ...b.calls].filter(call => call.name === 'report_api_rate_limit').every(call => call.params.p_client_hash === config.DEV_GLOBAL_QUOTA_HASH))
    const rows = (await db.query('SELECT bucket_key,attempts FROM public.report_api_limits')).rows
    assert.equal(rows.length, 4)
    assert.deepEqual(rows.map(row => row.attempts).sort((x,y) => x-y), [6,6,31,31])
  })
  await test('Overlapping requests and fresh adapters cannot gain new quota; PostgreSQL serializes this local fixture', async () => {
    await reset()
    const workers = [gateway(), gateway(), gateway()]
    const responses = await Promise.all(Array.from({length: 12}, (_,n) => workers[n % 3].send(submit, forged(n))))
    assert.equal(responses.filter(r => r.status === 201).length, 5)
    assert.equal(responses.filter(r => r.status === 429).length, 7)
    assert.deepEqual((await db.query('SELECT attempts FROM public.report_api_limits')).rows.map(r => r.attempts), [12,12])
    // PGlite is one local connection, not multi-session Cloud concurrency proof.
  })
  await test('Quota RPC errors fail closed before CAPTCHA, report writes or Storage', async () => {
    const failed = gateway({ quotaFailure: true })
    const response = await failed.send(submit, forged(1))
    assert.equal(response.status, 503); assert.equal((await response.json()).error.code, 'SERVICE_NOT_READY')
    assert.equal(failed.calls.length, 1)
  })
  await test('CAPTCHA still required after quota, and attachment still requires staff JWT', async () => {
    await reset()
    const api = gateway({ challenge: false })
    const response = await api.send(submit)
    assert.equal(response.status, 403); assert.equal((await response.json()).error.code, 'CHALLENGE_FAILED')
    assert.deepEqual(api.calls.map(call => call.name), ['report_api_rate_limit','captcha'])
    const before = api.calls.length
    assert.equal((await api.send({ action: 'attachment', attachment_id: '00000000-0000-4000-8000-000000000001' })).status, 401)
    assert.equal(api.calls.length, before)
  })
  await test('Disabled deployment responds to minimum probes but never invokes quota or data operations', async () => {
    const api = gateway({ enabled: false })
    assert.equal((await api.send(submit)).status, 503)
    for (const [method,status] of [['OPTIONS',204],['GET',405]]) assert.equal((await api.serve(new Request('https://example.invalid',{method,headers:{Origin:origin}}))).status,status)
    assert.equal((await api.serve(new Request('https://example.invalid',{method:'OPTIONS',headers:{Origin:'https://unapproved.invalid'}}))).status,403)
    assert.equal(api.calls.length,0)
  })
  await test('Existing RPC rolls back both bucket upserts if the second bucket fails', async () => {
    await reset()
    // Fault injection only in this disposable local DB; production SQL untouched.
    await db.exec("ALTER TABLE public.report_api_limits ADD CONSTRAINT local_second_bucket_failure CHECK(bucket_key NOT LIKE 'submit:000%')")
    await assert.rejects(db.query('SELECT public.report_api_rate_limit($1,$2)', ['submit',config.DEV_GLOBAL_QUOTA_HASH]))
    assert.equal((await db.query('SELECT count(*)::int AS n FROM public.report_api_limits')).rows[0].n,0)
  })
} finally { await db.close() }
