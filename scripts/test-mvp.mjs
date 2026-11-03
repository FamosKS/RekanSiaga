import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { loadConfigFromFile } from 'vite'

const require = createRequire(import.meta.url)
function load(file, mocks = {}, approved = false) {
  const env = { VITE_DEV_ARTICLE_WRITES_APPROVED: String(approved), VITE_DEV_REMOTE_WRITES_APPROVED: String(approved), VITE_DEV_CONTENT_WRITES_ENABLED: 'false', VITE_SUPABASE_URL: 'https://uiuiouosblyuqgnvfpeh.supabase.co' }
  const input = readFileSync(file, 'utf8').replace(/import\.meta\.env\.(VITE_[A-Z_]+)/g, (_, key) => JSON.stringify(env[key] ?? ''))
  const output = ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(output, { exports, require: name => name in mocks ? mocks[name] : require(name), URL, AbortController, Date, crypto }, { filename: file })
  return exports
}
const environment = load('src/lib/environment.ts')
const contracts = load('src/features/content/contracts.ts')
const input = { title: 'SIMULASI artikel uji', slug: 'simulasi-artikel-uji', summary: 'Ringkasan contoh untuk pengujian.', content: 'SIMULASI isi untuk pengujian kontrak artikel.', source_url: 'https://example.invalid/simulasi', publication_status: 'published' }
await test('Environment pins dev and rejects staging, lookalikes, URL credentials, secret and legacy keys', () => {
  assert.equal(environment.validateDevelopmentEnvironment('https://uiuiouosblyuqgnvfpeh.supabase.co', 'sb_publishable_fixture').url, 'https://uiuiouosblyuqgnvfpeh.supabase.co')
  for (const url of ['https://fweeyflixnqbvvceuent.supabase.co', 'https://uiuiouosblyuqgnvfpeh.supabase.co.evil.invalid', 'https://user@uiuiouosblyuqgnvfpeh.supabase.co', 'http://uiuiouosblyuqgnvfpeh.supabase.co', 'https://uiuiouosblyuqgnvfpeh.supabase.co/path']) assert.throws(() => environment.validateDevelopmentEnvironment(url, 'sb_publishable_fixture'))
  for (const key of ['', 'sb_secret_fixture', 'eyJfixture.legacy.signature']) assert.throws(() => environment.validateDevelopmentEnvironment('https://uiuiouosblyuqgnvfpeh.supabase.co', key))
})
await test('Article payload validates unsafe/invalid input and preserves publication timestamp', () => {
  assert.equal(contracts.articlePayload(input, '2026-10-26T00:00:00Z').published_at, '2026-10-26T00:00:00Z')
  assert.equal(contracts.articlePayload({ ...input, publication_status: 'draft' }).published_at, null)
  for (const patch of [{ slug: '../admin' }, { source_url: 'javascript:alert(1)' }, { title: '   ' }, { content: 'short' }, { publication_status: 'approved' }]) assert.throws(() => contracts.articlePayload({ ...input, ...patch }))
})
function admin(approved, access, resultError = null) {
  const calls = []
  const row = { ...input, ...contracts.articlePayload(input), id: '00000000-0000-4000-8000-000000000001', author_id: null, created_at: '2026-10-26T00:00:00Z', updated_at: '2026-10-26T00:00:00Z' }
  const query = new Proxy({}, { get: (_, method) => (...args) => { calls.push({ method, args }); return method === 'single' ? Promise.resolve({ data: row, error: resultError }) : query } })
  const service = load('src/features/content/articleAdminService.ts', {
    zod: require('zod'), '../../lib/supabase': { supabase: { from: table => { calls.push({ method: 'from', args: [table] }); return query } } },
    '../auth/authService': { getVerifiedStaffAccess: async () => access },
    '../auth/permissions': load('src/features/auth/permissions.ts'), './contracts': contracts,
  }, approved)
  return { service, calls, row }
}
await test('Unapproved remote writes perform zero data calls even for super admin', async () => {
  const run = admin(false, { userId: 'fixture', roles: ['super_admin'] })
  await assert.rejects(run.service.saveRemoteArticle(input))
  await assert.rejects(run.service.deleteRemoteArticle(run.row))
  assert.equal(run.calls.length, 0)
})
await test('Missing or insufficient database staff role cannot reach mutations', async () => {
  for (const access of [null, { userId: 'fixture', roles: ['report_verifier'] }, { userId: 'fixture', roles: [] }]) {
    const run = admin(true, access)
    await assert.rejects(run.service.saveRemoteArticle(input))
    assert.equal(run.calls.length, 0)
  }
})
await test('Prepared update/delete constrain row ID/version and propagate RLS/no-row errors', async () => {
  const run = admin(true, { userId: 'fixture', roles: ['information_manager'] }, { code: '42501' })
  await assert.rejects(run.service.saveRemoteArticle(input, run.row), error => error.code === '42501')
  assert.ok(run.calls.some(call => call.method === 'eq' && call.args[0] === 'id' && call.args[1] === run.row.id))
  assert.ok(run.calls.some(call => call.method === 'eq' && call.args[0] === 'updated_at' && call.args[1] === run.row.updated_at))
  const missing = admin(true, { userId: 'fixture', roles: ['super_admin'] }, { code: 'PGRST116' })
  await assert.rejects(missing.service.deleteRemoteArticle(missing.row), error => error.code === 'PGRST116')
})
await test('Prepared insert assigns verified staff author and requires server representation', async () => {
  const run = admin(true, { userId: 'verified-staff', roles: ['information_manager'] })
  await run.service.saveRemoteArticle(input)
  assert.equal(run.calls.find(call => call.method === 'insert').args[0].author_id, 'verified-staff')
  assert.ok(run.calls.some(call => call.method === 'single'))
})
await test('Dart and Web share exact dev target, article columns, publication filters, and limit', () => {
  const dart = readFileSync('integration/flutter/rekansiaga_public_api.dart', 'utf8')
  assert.ok(dart.includes(`const devProjectRef = '${environment.DEV_PROJECT_REF}'`))
  assert.ok(dart.includes(`const articleColumns = '${contracts.articleColumns}'`))
  assert.ok(dart.includes("'publication_status': 'eq.published'"))
  assert.ok(dart.includes("'published_at': 'not.is.null'"))
  assert.ok(dart.includes("'order': 'published_at.desc'"))
})
await test('Vite rejects staging and privileged keys before bundling', async () => {
  const names = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY']
  const saved = names.map(name => process.env[name])
  try {
    for (const [url, key, expected] of [
      ['https://fweeyflixnqbvvceuent.supabase.co', 'sb_publishable_fixture', /rekansiaga-dev/],
      ['https://uiuiouosblyuqgnvfpeh.supabase.co', 'sb_secret_fixture', /publishable key dev/],
    ]) {
      process.env.VITE_SUPABASE_URL = url
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY = key
      await assert.rejects(loadConfigFromFile({ command: 'build', mode: 'production' }, undefined, undefined, 'silent'), expected)
    }
  } finally { names.forEach((name, index) => { if (saved[index] === undefined) delete process.env[name]; else process.env[name] = saved[index] }) }
})
