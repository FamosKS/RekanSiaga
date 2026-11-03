import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const origin = 'http://127.0.0.1:5176'
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname), 'Use localhost only')
const chrome = process.env.REKANSIAGA_QA_BROWSER ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
assert.ok(existsSync(chrome), 'Chrome executable unavailable')
const profile = mkdtempSync(path.join(tmpdir(), 'rekansiaga-ui-'))
const processHandle = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore', windowsHide: true })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let socket
let id = 0
const pending = new Map()
const errors = []
const badAssets = []
let currentRoute = ''
const report = { widths: [360, 390, 768, 1024, 1440], routeChecks: [], interactions: [], consoleErrors: [], missingAssets: [], screenshots: [] }
async function waitFor(check, label, timeout = 12000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) { if (await check()) return; await delay(80) }
  throw new Error(`Timeout: ${label}`)
}
function send(method, params = {}) {
  const next = ++id
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(next); reject(new Error(`CDP timeout: ${method}`)) }, 15000)
    pending.set(next, { resolve: value => { clearTimeout(timer); resolve(value) }, reject })
    socket.send(JSON.stringify({ id: next, method, params }))
  })
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error('Browser evaluation failed')
  return result.result.value
}
async function clickText(text, tag = 'button') {
  assert.ok(await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find(el => el.textContent.trim() === ${JSON.stringify(text)}); if (!el || el.disabled) return false; el.click(); return true })()`), `Missing enabled action: ${text}`)
  await delay(100)
}
async function navigate(route) {
  currentRoute = route
  await send('Page.navigate', { url: origin + route })
  await waitFor(() => evaluate(`location.pathname === ${JSON.stringify(route)} && document.readyState === 'complete' && !!document.querySelector('h1')`), route)
}
async function setInput(label, value) {
  assert.ok(await evaluate(`(() => { const label = [...document.querySelectorAll('label')].find(el => el.textContent.trim() === ${JSON.stringify(label)}); const el = label && document.getElementById(label.htmlFor); if (!el) return false; Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true })()`), `Missing input: ${label}`)
}

const { createServer } = await import('vite')
const server = await createServer({ server: { host: '127.0.0.1', port: 5176, strictPort: true } })
await server.listen()
const output = path.resolve('docs/qa/phase4a/browser-auth')
mkdirSync(output, { recursive: true })
report.kind = 'Production routes and Supabase SDK with CDP-intercepted synthetic Auth/REST responses. No live account authentication.'
let scenario = { roles: ['super_admin'], active: true, profile: true }
let requestCount = 0
const interceptionErrors = []
const fixtureId = '00000000-0000-4000-8000-000000000001'
function fixtureUser() { return { id: fixtureId, aud: 'authenticated', role: 'authenticated', email: 'qa@example.org', created_at: '2026-10-22T00:00:00Z', app_metadata: {}, user_metadata: {} } }
function fixtureSession() { const now = Math.floor(Date.now()/1000); const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url'); return { access_token: encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode({ sub: fixtureId, aud: 'authenticated', role: 'authenticated', exp: now+3600, iat: now }) + '.synthetic-signature', token_type: 'bearer', expires_in: 3600, refresh_token: 'synthetic-refresh-token', user: fixtureUser() } }
async function intercept(event) {
  if (event.method !== 'Fetch.requestPaused') return
  const { requestId, request } = event.params
  requestCount++
  const url = new URL(request.url)
  let code = 200
  let data
  if (url.pathname === '/auth/v1/token') {
    const input = JSON.parse(request.postData || '{}')
    if (input.password === 'wrong-password') { code = 400; data = { error_code: 'invalid_credentials', msg: 'Invalid login credentials' } }
    else data = fixtureSession()
  } else if (url.pathname === '/auth/v1/user') data = fixtureUser()
  else if (url.pathname === '/auth/v1/logout') { code = 204; data = null }
  else if (url.pathname.startsWith('/rest/v1/')) {
    const table = url.pathname.split('/').at(-1)
    if (scenario.rlsError) { code = 403; data = { code: '42501', message: 'Fixture permission denied' } }
    else if (table === 'staff_profiles') data = scenario.profile ? [{ user_id: fixtureId, display_name: 'Synthetic QA', is_active: scenario.active }] : []
    else if (table === 'staff_role_assignments') data = scenario.roles.map((role, index) => ({ staff_id: fixtureId, role_id: 'r' + index }))
    else if (table === 'roles') data = scenario.roles.map((role, index) => ({ id: 'r' + index, code: role, name: role }))
    else if (['articles', 'mitigation_guides', 'disaster_events', 'emergency_contacts'].includes(table)) data = []
    else { code = 403; data = { code: '42501', message: 'Unknown fixture table' } }
  } else { code = 403; data = { error: 'External networking disabled by QA' } }
  if (request.method === 'OPTIONS') { code = 200; data = {} }
  await send('Fetch.fulfillRequest', { requestId, responseCode: code, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' }, { name: 'Access-Control-Allow-Headers', value: '*' }], body: code === 204 ? '' : Buffer.from(JSON.stringify(data)).toString('base64') })
}
async function login() {
  await navigate('/admin/login')
  await setInput('Email', 'qa@example.org'); await setInput('Kata sandi', 'synthetic-password')
  await clickText('Masuk')
}
async function waitPath(pathname) { await waitFor(() => evaluate(`location.pathname === ${JSON.stringify(pathname)} && !!document.querySelector('h1')`), pathname) }
async function logout() {
  // A page heading can render before asynchronous session verification finishes.
  await waitFor(() => evaluate(`[...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Keluar' && !button.disabled)`), 'verified session enables logout')
  await clickText('Keluar')
  await waitFor(() => evaluate(`!document.querySelector('.admin-sidebar') && ![...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Keluar' && !button.disabled)`), 'signed out')
}
try {
  await waitFor(() => existsSync(path.join(profile, 'DevToolsActivePort')), 'Chrome startup')
  const port = readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const target = targets.find(target => target.type === 'page')
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (process.env.REKANSIAGA_QA_DEBUG) console.log('CDP event', message.id ?? message.method)
    if (message.id) { const request = pending.get(message.id); if (request) { pending.delete(message.id); if (message.error) request.reject(new Error(message.error.message)); else request.resolve(message.result) } }
    else if (message.method === 'Runtime.exceptionThrown') errors.push({ route: currentRoute, kind: 'runtime exception' })
    else if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') errors.push({ route: currentRoute, kind: 'console error' })
    else if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) { const url = new URL(message.params.response.url); if (url.origin === origin) badAssets.push({ route: currentRoute, path: url.pathname, status: message.params.response.status }) }
  })
  if (process.env.REKANSIAGA_QA_DEBUG) console.log('Chrome connection open', socket.readyState)
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled', { enabled: true })


  socket.addEventListener('message', event => { const message = JSON.parse(event.data); void intercept(message).catch(error => interceptionErrors.push(error.message)) })
  await send('Fetch.enable', { patterns: [{ urlPattern: 'https://*', requestStage: 'Request' }] })
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: origin + '/admin' }); await waitPath('/admin/login')
  report.interactions.push('Anonymous production /admin redirects to login')
  await setInput('Email', 'qa@example.org'); await setInput('Kata sandi', 'wrong-password'); await clickText('Masuk')
  await waitFor(() => evaluate(`document.body.textContent.includes('Login gagal')`), 'wrong password error')
  report.interactions.push('Wrong password shows generic error with no admin access')
  scenario = { profile: true, active: true, roles: ['super_admin'] }
  await login(); await waitPath('/admin')
  await waitFor(() => evaluate(`document.querySelectorAll('.admin-sidebar nav a').length === 12`), 'super admin menu')
  await navigate('/admin/staf')
  assert.ok(await evaluate(`document.querySelector('h1').textContent === 'Manajemen staf'`))
  report.interactions.push('Active super admin reaches protected routes after profile and role reads')
  await send('Page.reload', { ignoreCache: true })
  await waitFor(() => evaluate(`!!document.querySelector('.admin-sidebar') && document.querySelector('h1').textContent === 'Manajemen staf'`), 'refresh restores verified session')
  report.interactions.push('Reload restores SDK session and revalidates identity/profile/roles')
  await logout(); await send('Page.navigate', { url: origin + '/admin/staf' }); await waitPath('/admin/login')
  report.interactions.push('Logout removes access and protected deep link redirects')
  for (const [name, next] of [
    ['Missing staff profile', { profile: false, active: true, roles: ['super_admin'] }],
    ['Inactive staff', { profile: true, active: false, roles: ['super_admin'] }],
    ['Active staff without role', { profile: true, active: true, roles: [] }],
  ]) { scenario = next; await login(); await waitPath('/403'); assert.ok(await evaluate(`!document.querySelector('.admin-sidebar')`)); report.interactions.push(name + ' denied'); await logout() }
  scenario = { profile: true, active: true, roles: ['report_verifier'] }
  await login(); await waitPath('/admin')
  await waitFor(() => evaluate(`document.querySelectorAll('.admin-sidebar nav a').length === 2`), 'limited menu')
  await navigate('/admin/laporan')
  assert.ok(await evaluate(`document.querySelector('h1').textContent === 'Laporan masyarakat'`))
  await send('Page.navigate', { url: origin + '/admin/staf' }); await waitPath('/403')
  report.interactions.push('Limited report verifier sees two menus, can open reports, denied staff URL')
  await logout()
  scenario = { profile: true, active: true, roles: ['report_verifier','mitigation_editor'] }
  await login(); await waitPath('/admin')
  await navigate('/admin/panduan')
  assert.ok(await evaluate(`document.querySelector('h1').textContent === 'Panduan mitigasi'`))
  report.interactions.push('Multiple roles combine report and mitigation permissions')
  await logout()
  scenario = { profile: true, active: true, roles: ['super_admin'], rlsError: true }
  await login()
  await waitFor(() => evaluate(`document.body.textContent.includes('Otorisasi tidak dapat diverifikasi')`), 'RLS error fails closed')
  assert.ok(await evaluate(`!document.querySelector('.admin-sidebar')`))
  report.interactions.push('RLS SELECT failure shows access error and hides admin')
  await navigate('/admin/login'); await logout()
  report.consoleErrors = errors
  report.missingAssets = badAssets
  report.syntheticRequests = requestCount
  // HTTP fixture denials are expected; application console/runtime errors are not.
  assert.equal(interceptionErrors.length, 0, 'Interception failed')
  assert.equal(errors.length, 0, 'Console/runtime error')
  assert.equal(badAssets.length, 0, 'Missing local assets')
  writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2))
  console.log(`PASS browser auth: ${report.interactions.length} scenarios, ${requestCount} synthetic requests; no live authentication or DB writes.`)
} catch (error) {
  report.failure = error.message; report.consoleErrors = errors; report.missingAssets = badAssets
  writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2))
  throw error
} finally { socket?.close(); processHandle.kill(); await server.close() }
