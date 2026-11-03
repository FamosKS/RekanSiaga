import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const origin = 'http://127.0.0.1:5175'
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
const report = { widths: [390, 768, 1440], routeChecks: [], interactions: [], consoleErrors: [], missingAssets: [], screenshots: [] }
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
  await send('Page.navigate', { url: origin + '/__qa-admin?route=' + encodeURIComponent(route) })
  await waitFor(() => evaluate(`document.readyState === 'complete' && !!document.querySelector('h1')`), route)
}
async function setInput(label, value) {
  assert.ok(await evaluate(`(() => { const label = [...document.querySelectorAll('label')].find(el => el.textContent.trim() === ${JSON.stringify(label)}); const el = label && document.getElementById(label.htmlFor); if (!el) return false; Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true })()`), `Missing input: ${label}`)
}

const { createServer } = await import('vite')
const server = await createServer({ server: { host: '127.0.0.1', port: 5175, strictPort: true }, plugins: [{ name: 'isolated-admin-qa', configureServer(server) { server.middlewares.use(async (req, res, next) => { if (!req.url?.startsWith('/__qa-admin?')) return next(); const html = await server.transformIndexHtml('/__qa-admin', '<!doctype html><html lang="id"><head><link rel="icon" href="data:,"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><div id="root"></div><script type="module" src="/scripts/admin-browser-fixture.tsx"></script></body></html>'); res.setHeader('Content-Type', 'text/html'); res.end(html) }) } }] })
await server.listen()
const routes = ['/admin', '/admin/laporan', '/admin/laporan/id-uji', '/admin/kejadian', '/admin/artikel', '/admin/panduan', '/admin/kontak-darurat', '/admin/staf', '/admin/notifikasi', '/admin/sumber-data', '/admin/pengaturan', '/admin/login']
const output = path.resolve(process.argv.includes('--phase4a') ? 'docs/qa/phase4a/admin-ui' : 'docs/qa/phase3c')
mkdirSync(output, { recursive: true })
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
  await send('Network.setBlockedURLs', { urls: ['https://*'] })

  for (const width of report.widths) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false })
    for (const route of routes) {
      await navigate(route)
      const layout = await evaluate(`({ scroll: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth })`)
      assert.ok(layout.scroll <= layout.viewport + 1, `Overflow ${route} at ${width}: ${JSON.stringify(layout)}`)
      report.routeChecks.push({ route, width, overflow: false, isolatedPresentation: true })
    }
    console.log(`PASS ${width}px: all admin presentations`)
  }
  await navigate('/admin/login')
  await clickText('Tampilkan kata sandi')
  assert.ok(await evaluate(`document.querySelector('[name="password"]').type === 'text'`))
  await clickText('Sembunyikan kata sandi')
  assert.ok(await evaluate(`document.querySelector('[name="password"]').type === 'password'`))
  assert.ok(await evaluate(`!document.querySelector('form').checkValidity()`))
  report.interactions.push('Login password toggle and required validation; no credentials submitted')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false })
  await navigate('/admin')
  await evaluate(`document.querySelector('[aria-controls="admin-sidebar"]').click()`)
  assert.ok(await evaluate(`document.querySelector('[aria-controls="admin-sidebar"]').getAttribute('aria-expanded') === 'true'`))
  await clickText('Artikel', 'a')
  await waitFor(() => evaluate(`document.querySelector('h1').textContent === 'Artikel'`), 'sidebar navigation')
  assert.ok(await evaluate(`document.querySelector('[aria-controls="admin-sidebar"]').getAttribute('aria-expanded') === 'false'`))
  report.interactions.push('Mobile sidebar opens, navigates and closes')
  for (const route of ['/admin/kejadian', '/admin/artikel', '/admin/panduan', '/admin/kontak-darurat', '/admin/staf', '/admin/notifikasi', '/admin/sumber-data']) {
    await navigate(route)
    await setInput('Pencarian', 'uji')
    await clickText('Reset filter')
    assert.ok(await evaluate(`document.querySelector('input[type="search"]').value === ''`))
    await evaluate(`document.querySelector('.admin-page-heading button').click()`)
    await waitFor(() => evaluate(`!!document.querySelector('dialog[open]')`), 'editor opens')
    assert.ok(await evaluate(`!document.querySelector('dialog[open] form').checkValidity()`))
    await evaluate(`(() => { const fields = [...document.querySelectorAll('dialog[open] input, dialog[open] textarea, dialog[open] select')]; for (const el of fields) { const value = el.tagName === 'SELECT' ? el.options[1].value : el.type === 'url' ? 'https://example.org/source' : el.type === 'email' ? 'qa@example.org' : el.type === 'tel' ? '+000000' : 'Draf uji lokal'; Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } })()`)
    const invalid = await evaluate(`[...document.querySelectorAll('dialog[open] input, dialog[open] select, dialog[open] textarea')].filter(el => !el.checkValidity()).map(el => ({ label: el.id, value: el.value, message: el.validationMessage, pattern: el.pattern }))`); assert.deepEqual(invalid, [], 'Filled draft valid: ' + route)
    await clickText('Pratinjau draf')
    await waitFor(() => evaluate(`document.querySelector('dialog[open]').textContent.includes('Pratinjau draf lokal')`), 'preview')
    await evaluate(`document.querySelector('dialog[open] .action-row button:last-child').click()`)
    await waitFor(() => evaluate(`!![...document.querySelectorAll('dialog[open] button')].find(el => el.textContent === 'Konfirmasi belum tersedia' && el.disabled)`), 'confirmation blocked')
    await clickText('Kembali ke draf')
    await waitFor(() => evaluate(`document.querySelector('dialog[open]').textContent.includes('Pratinjau draf lokal')`), 'draft restored')
    await evaluate(`document.querySelector('dialog[open] [aria-label="Tutup dialog"]').click()`)
    report.interactions.push(route + ': search/reset, required validation, editor, preview, confirmation blocked, return/close')
  }
  await navigate('/admin/laporan')
  await setInput('Status laporan', 'under_review')
  assert.ok(await evaluate(`document.querySelector('select').value === 'under_review'`))
  report.interactions.push('Report status filter uses supplied contract')
  await navigate('/admin/laporan/id-uji')
  await setInput('Usulan status', 'verified'); await setInput('Catatan pemeriksaan lokal', 'Catatan QA')
  await clickText('Tinjau rancangan keputusan')
  assert.ok(await evaluate(`document.querySelector('dialog[open]').textContent.includes('verified')`))
  report.interactions.push('Report verification draft confirmation; apply remains disabled')
  await navigate('/admin/pengaturan')
  await setInput('Kepadatan pratinjau', 'Ringkas')
  assert.ok(await evaluate(`!!document.querySelector('.admin-density-preview.compact')`))
  report.interactions.push('Settings density updates local preview')
  for (const width of [390, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false })
    for (const [route, name] of [['/admin', 'dashboard'], ['/admin/artikel', 'articles'], ['/admin/login', 'login']]) {
      await navigate(route)
      const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
      const file = `${name}-${width}.png`; writeFileSync(path.join(output, file), Buffer.from(result.data, 'base64')); report.screenshots.push(file)
    }
  }
  // Real production routing is checked separately, without the isolated fixture.
  for (const route of ['/admin', '/admin/artikel', '/admin/unknown']) {
    await send('Page.navigate', { url: origin + route })
    await waitFor(() => evaluate(`location.pathname === '/admin/login' && !!document.querySelector('h1')`), 'production guard redirects')
  }
  report.interactions.push('Production protected routes, including unknown admin URL, redirect without a session')
  report.consoleErrors = errors; report.missingAssets = badAssets
  assert.equal(errors.length, 0, 'Browser reported runtime or console errors')
  assert.equal(badAssets.length, 0, 'Missing local assets')
  writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2))
  console.log(`PASS browser: ${report.routeChecks.length} route/viewport checks, ${report.interactions.length} interactions, 0 runtime/console errors, 0 missing local assets; external HTTPS blocked.`)
} catch (error) {
  report.consoleErrors = errors; report.missingAssets = badAssets; report.failure = error.message
  writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2))
  throw error
} finally {
  socket?.close(); processHandle.kill(); await server.close()
}
