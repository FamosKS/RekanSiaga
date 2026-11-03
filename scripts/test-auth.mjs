import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const root = path.resolve('.')
function load(file, mocks = {}, globals = {}) {
  const absolute = path.resolve(root, file)
  const exports = {}
  const code = ts.transpileModule(readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const localRequire = name => {
    if (name in mocks) return mocks[name]
    if (!name.startsWith('.')) return require(name)
    const base = path.resolve(path.dirname(absolute), name)
    const resolved = [base, base + '.ts', base + '.tsx'].find(file => existsSync(file))
    return load(resolved, mocks, globals)
  }
  new vm.Script(code, { filename: file }).runInNewContext({ exports, require: localRequire, console, ...globals })
  return exports
}
const results = []
async function test(name, run) { await run(); results.push({ name, passed: true }); console.log('PASS ' + name) }
const user = { id: 'fixture-user', user_metadata: { role: 'super_admin' } }
const profile = { user_id: user.id, display_name: 'Fixture', is_active: true }
function service({ identity = { data: { user }, error: null }, profileResult = { data: profile, error: null }, assignments = { data: [{ staff_id: user.id, role_id: 'r1' }], error: null }, roles = { data: [{ id: 'r1', code: 'super_admin', name: 'Fixture role' }], error: null } } = {}) {
  const requests = []
  const plans = { staff_profiles: profileResult, staff_role_assignments: assignments, roles }
  const auth = { getUser: async () => identity, signInWithPassword: async input => ({ error: input.password === 'wrong' ? { status: 400 } : null }), signOut: async () => ({ error: null }) }
  const supabase = { auth, from(table) { const request = { table }; requests.push(request); const result = plans[table]; assert.ok(result, 'Unexpected table'); const builder = { select(columns) { request.columns = columns; return this }, eq(column, value) { request.filter = [column, value]; return this }, in(column, values) { request.filter = [column, values]; return this }, abortSignal() { return this }, maybeSingle: async () => result, then(resolve, reject) { return Promise.resolve(result).then(resolve, reject) } }; return builder } }
  return { ...load('src/features/auth/authService.ts', { '../../lib/supabase': { supabase } }), requests }
}
await test('Active super admin profile and role are read from backend adapter', async () => {
  const api = service(); const access = await api.getVerifiedStaffAccess(); assert.equal(access.userId, user.id); assert.equal(access.roles[0], 'super_admin'); assert.equal(api.requests.length, 3); assert.equal(api.requests[0].columns, 'user_id,display_name,is_active'); assert.deepEqual(Array.from(api.requests[1].filter), ['staff_id', user.id])
})
await test('Wrong password propagates SDK error; login never assigns a role', async () => { const api = service(); assert.ok((await api.signIn('fixture@example.org', 'wrong')).error); assert.equal(api.requests.length, 0) })
await test('Missing/unverified Auth identity denies before reading staff data', async () => { const api = service({ identity: { data: { user: null }, error: { status: 401 } } }); await assert.rejects(api.getVerifiedStaffAccess()); assert.equal(api.requests.length, 0) })
for (const [label, data] of [['No staff profile', null], ['Inactive staff', { ...profile, is_active: false }]]) await test(label + ' denied', async () => { const api = service({ profileResult: { data, error: null } }); assert.equal(await api.getVerifiedStaffAccess(), null); assert.equal(api.requests.length, 1) })
await test('Active staff without role denied', async () => { const api = service({ assignments: { data: [], error: null } }); assert.equal(await api.getVerifiedStaffAccess(), null) })
await test('Multi-role array deduplicates; user metadata cannot grant super admin', async () => {
  const api = service({ assignments: { data: [{ staff_id: user.id, role_id: 1 }, { staff_id: user.id, role_id: 2 }, { staff_id: user.id, role_id: 1 }], error: null }, roles: { data: [{ id: 1, code: 'report_verifier' }, { id: 2, code: 'mitigation_editor' }], error: null } }); assert.deepEqual(Array.from((await api.getVerifiedStaffAccess()).roles), ['report_verifier', 'mitigation_editor'])
})
for (const table of ['profileResult', 'assignments', 'roles']) await test('RLS/grant error at ' + table + ' fails closed', async () => { await assert.rejects(service({ [table]: { data: null, error: { code: '42501' } } }).getVerifiedStaffAccess()) })
for (const [name, options] of [
  ['wrong profile identity', { profileResult: { data: { ...profile, user_id: 'other' }, error: null } }],
  ['malformed active flag', { profileResult: { data: { ...profile, is_active: 'true' }, error: null } }],
  ['foreign staff assignment', { assignments: { data: [{ staff_id: 'other', role_id: 'r1' }], error: null } }],
  ['unknown role', { roles: { data: [{ id: 'r1', code: 'admin' }], error: null } }],
  ['hidden/missing role relation', { roles: { data: [], error: null } }],
]) await test(name + ' fails closed', async () => { await assert.rejects(service(options).getVerifiedStaffAccess()) })
const { canAccessAdminPath, adminRoutePermissions } = load('src/features/auth/permissions.ts')
await test('Every route/role pair follows conservative permissions; unknown routes denied', async () => {
  const all = ['super_admin', 'information_manager', 'report_verifier', 'mitigation_editor']
  for (const [route, allowed] of Object.entries(adminRoutePermissions)) for (const role of all) assert.equal(canAccessAdminPath([role], route), allowed.includes(role), role + ' ' + route)
  assert.ok(canAccessAdminPath(['report_verifier'], '/admin/laporan/id-uji'))
  assert.ok(!canAccessAdminPath(['information_manager'], '/admin/laporan/id-uji'))
  assert.ok(!canAccessAdminPath(['super_admin'], '/admin/unknown'))
  assert.ok(!canAccessAdminPath([], '/admin'))
  assert.ok(canAccessAdminPath(['report_verifier', 'mitigation_editor'], '/admin/panduan'))
  assert.ok(!canAccessAdminPath(['report_verifier'], '/admin/staf'))
})
function deferred() { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }
function lifecycle({ initial = Promise.resolve({ data: { session: null }, error: null }), verify = async token => ({ data: { user: { id: token === 'other-token' ? 'other' : user.id } }, error: null }) } = {}) {
  let now = 0; let id = 0; const timers = new Map(); let callback; let unsubscribed = false; let resets = 0
  const states = []
  const clock = { setTimeout(fn, delay) { const key = ++id; timers.set(key, { fn, at: now + delay }); return key }, clearTimeout(key) { timers.delete(key) }, Date: { now: () => now } }
  const auth = { onAuthStateChange(fn) { callback = fn; return { data: { subscription: { unsubscribe() { unsubscribed = true } } } } }, getSession: () => initial, getUser: verify }
  const { observeAuthentication } = load('src/features/auth/authLifecycle.ts', {}, clock)
  const stop = observeAuthentication(auth, state => states.push(state), () => { resets++ })
  return { states, stop, event: (event, session) => callback(event, session), get unsubscribed() { return unsubscribed }, get resets() { return resets }, async advance(ms = 0) { now += ms; for (const [key, timer] of [...timers]) if (timer.at <= now) { timers.delete(key); timer.fn() } for (let i = 0; i < 8; i++) await Promise.resolve() } }
}
const session = { access_token: 'token', user, expires_at: 100 }
await test('Refresh restores session only after getUser verifies identity', async () => { const run = lifecycle({ initial: Promise.resolve({ data: { session }, error: null }) }); await run.advance(); assert.equal(run.states.at(-1).loading, true); await run.advance(); assert.equal(run.states.at(-1).user.id, user.id); run.stop(); assert.ok(run.unsubscribed) })
await test('Logout wins over stale getUser and bootstrap results', async () => {
  const pending = deferred(); const bootstrap = deferred(); const run = lifecycle({ initial: bootstrap.promise, verify: () => pending.promise }); run.event('SIGNED_IN', session); await run.advance(); run.event('SIGNED_OUT', null); pending.resolve({ data: { user }, error: null }); bootstrap.resolve({ data: { session }, error: null }); await run.advance(); assert.equal(run.states.at(-1).session, null); assert.equal(run.states.at(-1).loading, false); assert.ok(run.resets >= 2); run.stop()
})
await test('Account switch ignores previous identity validation', async () => { const pending = deferred(); const run = lifecycle({ verify: token => token === 'token' ? pending.promise : Promise.resolve({ data: { user: { id: 'other' } }, error: null }) }); run.event('SIGNED_IN', session); await run.advance(); run.event('SIGNED_IN', { ...session, access_token: 'other-token', user: { id: 'other' } }); await run.advance(); pending.resolve({ data: { user }, error: null }); await run.advance(); assert.equal(run.states.at(-1).user.id, 'other'); run.stop() })
await test('Expiry clears private access; refreshed token extends session', async () => { const run = lifecycle(); run.event('SIGNED_IN', session); await run.advance(); run.event('TOKEN_REFRESHED', { ...session, expires_at: 200 }); await run.advance(); await run.advance(100_001); assert.ok(run.states.at(-1).session); await run.advance(100_000); assert.equal(run.states.at(-1).session, null); run.stop() })
await test('Revoked or mismatched user denied; cleanup suppresses late callbacks', async () => { const run = lifecycle({ verify: async () => ({ data: { user: { id: 'other' } }, error: null }) }); run.event('SIGNED_IN', session); await run.advance(); assert.equal(run.states.at(-1).user, null); run.stop(); const count = run.states.length; run.event('SIGNED_IN', session); await run.advance(); assert.equal(run.states.length, count) })
await test('Network failure and validation timeout fail closed', async () => { const run = lifecycle({ verify: async () => { throw new Error('offline') } }); run.event('SIGNED_IN', session); await run.advance(); assert.ok(run.states.at(-1).error); run.stop(); const pending = deferred(); const timeout = lifecycle({ verify: () => pending.promise }); timeout.event('SIGNED_IN', session); await timeout.advance(); await timeout.advance(15_000); assert.ok(timeout.states.at(-1).error); pending.resolve({ data: { user }, error: null }); await timeout.advance(); assert.equal(timeout.states.at(-1).user, null); timeout.stop() })
await test('Logout calls Supabase signOut without database mutations', async () => { const api = service(); assert.equal((await api.signOut()).error, null); assert.equal(api.requests.length, 0) })
mkdirSync('docs/qa/phase4a', { recursive: true })
writeFileSync('docs/qa/phase4a/auth-tests.json', JSON.stringify({ kind: 'isolated SDK adapters and deterministic lifecycle; no live accounts or RLS tested', tests: results }, null, 2))
console.log(`PASS ${results.length} isolated auth/security scenarios. Remote integration remains pending.`)
