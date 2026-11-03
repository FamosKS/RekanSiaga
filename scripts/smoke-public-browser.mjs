import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const origin = process.argv[2] ?? 'http://127.0.0.1:5174'
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
const routes = ['/', '/informasi', '/informasi/artikel-uji', '/pemantauan', '/pemantauan/id-uji', '/peta', '/laporan', '/laporan/lacak', '/donasi', '/panduan', '/panduan/id-uji', '/darurat', '/403', '/tidak-ada']
const output = path.resolve('docs/qa/phase3b')
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
      const layout = await evaluate(`({ width: innerWidth, scroll: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth, heading: document.querySelector('h1').textContent })`)
      if (layout.scroll > layout.viewport + 1) console.log('Overflow elements', await evaluate(`([...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 12).map(el => ({tag: el.tagName, className: el.className, width: Math.round(el.getBoundingClientRect().width)})))`))
      assert.ok(layout.scroll <= layout.viewport + 1, `Horizontal overflow at ${width}px: ${route} (${layout.scroll}/${layout.viewport})`)
      report.routeChecks.push({ route, width, overflow: false })
    }
    console.log(`PASS viewport ${width}px: ${routes.length} public routes, no horizontal overflow`)
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false })
  await navigate('/')
  assert.ok(await evaluate(`(() => { const button = document.querySelector('[aria-controls="public-nav"]'); button.focus(); return document.activeElement === button })()`))
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await waitFor(() => evaluate(`document.querySelector('[aria-controls="public-nav"]').getAttribute('aria-expanded') === 'true'`), 'keyboard mobile menu')
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  assert.ok(await evaluate(`document.querySelector('[aria-controls="public-nav"]').getAttribute('aria-expanded') === 'false'`))
  report.interactions.push('Mobile menu opens with Enter and closes with Escape')
  await evaluate(`document.querySelector('[aria-label="Pengaturan aksesibilitas"]').focus(); document.querySelector('[aria-label="Pengaturan aksesibilitas"]').click()`)
  await waitFor(() => evaluate(`!!document.querySelector('dialog[open]')`), 'accessibility dialog')
  for (let count = 0; count < 12; count++) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); assert.ok(await evaluate(`document.querySelector('dialog[open]').contains(document.activeElement)`), 'Dialog focus escaped') }
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  await waitFor(() => evaluate(`!document.querySelector('dialog[open]')`), 'dialog close')
  assert.ok(await evaluate(`document.activeElement.getAttribute('aria-label') === 'Pengaturan aksesibilitas'`), 'Dialog focus did not return')
  report.interactions.push('Accessibility dialog traps focus, Escape closes, focus returns')
  await clickText('Informasi peringatan')
  await waitFor(() => evaluate(`document.querySelector('dialog[open]')?.textContent.includes('Peringatan belum tersedia')`), 'warning dialog empty state')
  await evaluate(`document.querySelector('dialog[open] [aria-label="Tutup dialog"]').click()`)
  report.interactions.push('Warning dialog opens only on request and displays no fictional alert')
  await navigate('/laporan'); await clickText('Periksa draf laporan')
  await waitFor(() => evaluate(`document.querySelectorAll('[aria-invalid="true"]').length >= 5`), 'report validation')
  report.interactions.push('Empty report shows validation errors')
  await setInput('Jenis kejadian', 'Banjir')
  await setInput('Judul laporan', 'Draf uji antarmuka lokal')
  await setInput('Deskripsi kejadian', 'Data uji validasi antarmuka lokal, bukan kejadian bencana sebenarnya.')
  await setInput('Wilayah kejadian (manual)', 'Wilayah pengujian lokal')
  await setInput('Alamat atau koordinat kejadian', 'Alamat pengujian antarmuka lokal')
  await evaluate(`document.querySelector('input[name=privacy]').click()`)
  await clickText('Periksa draf laporan')
  await waitFor(() => evaluate(`document.querySelector('dialog[open]')?.textContent.includes('Draf selesai diperiksa')`), 'valid report local confirmation')
  assert.ok(await evaluate(`document.querySelector('dialog[open]').textContent.includes('belum dikirim')`))
  await clickText('Kembali ke draf')
  report.interactions.push('Valid report confirms local validation only, with privacy consent')
  await send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin })
  await clickText('Gunakan lokasi perangkat')
  await waitFor(() => evaluate(`document.querySelector('.location-consent').textContent.includes('izin ditolak')`), 'GPS permission denial')
  report.interactions.push('GPS denial shows manual-location fallback after explicit click')
  const photoFile = path.join(profile, 'qa-local-pixel.png')
  writeFileSync(photoFile, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jGZkAAAAASUVORK5CYII=', 'base64'))
  const rootNode = await send('DOM.getDocument')
  const fileNode = await send('DOM.querySelector', { nodeId: rootNode.root.nodeId, selector: 'input[type=file]' })
  await send('DOM.setFileInputFiles', { nodeId: fileNode.nodeId, files: [photoFile] })
  await waitFor(() => evaluate(`!!document.querySelector('.photo-preview img')`), 'local photo preview')
  await clickText('Hapus foto')
  assert.ok(await evaluate(`!document.querySelector('.photo-preview img')`))
  report.interactions.push('Local file preview/removal works without upload')
  await navigate('/laporan/lacak'); await clickText('Periksa format pelacakan')
  await waitFor(() => evaluate(`document.querySelectorAll('[aria-invalid="true"]').length === 2`), 'tracking validation')
  report.interactions.push('Tracking requires code and token')
  await setInput('Kode pelacakan', 'RS-0123456789ABCDEF')
  await setInput('Token akses pribadi', 'a'.repeat(64))
  await clickText('Periksa format pelacakan')
  await waitFor(() => evaluate(`document.body.textContent.includes('Format input valid secara lokal')`), 'local tracking validation')
  assert.ok(await evaluate(`!location.search && !location.hash`))
  await setInput('Kode pelacakan', 'invalid')
  await waitFor(() => evaluate(`!document.body.textContent.includes('Format input valid secara lokal')`), 'tracking message reset')
  report.interactions.push('Valid tracking format stays local; editing clears stale result')
  await navigate('/panduan')
  const before = await evaluate(`document.querySelector('progress').value`)
  await evaluate(`document.querySelector('.checklist-group input[type="checkbox"]').click()`)
  await waitFor(() => evaluate(`document.querySelector('progress').value === 1`), 'checklist change')
  assert.equal(before, 0); await clickText('Atur ulang checklist')
  assert.equal(await evaluate(`document.querySelector('progress').value`), 0)
  await evaluate(`document.querySelector('.guide-phases summary').click()`)
  assert.ok(await evaluate(`document.querySelector('.guide-phases details').open`))
  report.interactions.push('Checklist progress/reset and guide accordion work')
  await navigate('/donasi'); await clickText('Tinjau simulasi')
  await waitFor(() => evaluate(`!!document.querySelector('dialog[open]')`), 'donation confirm')
  await clickText('Selesaikan simulasi'); await waitFor(() => evaluate(`document.body.textContent.includes('Latihan simulasi selesai')`), 'donation completion')
  report.interactions.push('Donation confirmation/completion stays simulation')
  await navigate('/darurat'); await evaluate(`document.querySelector('.sos-access').click()`)
  await waitFor(() => evaluate(`!!document.querySelector('dialog[open]')`), 'SOS dialog')
  assert.ok(await evaluate(`document.querySelector('dialog[open]').textContent.includes('tidak mengirim SOS')`))
  report.interactions.push('SOS opens honest assistance dialog without dispatch')
  await navigate('/peta'); await setInput('Cari lokasi atau kejadian', 'Wilayah uji UI')
  await waitFor(() => evaluate(`[...document.querySelectorAll('input')].some(input => input.value === 'Wilayah uji UI')`), 'map filter state')
  report.interactions.push('Map filter updates UI without fake markers')
  await navigate('/informasi/a%2Fb'); assert.ok(await evaluate(`document.body.textContent.includes('Parameter tidak valid')`))
  await send('Page.navigate', { url: origin + '/admin' }); await waitFor(() => evaluate(`location.pathname === '/admin/login'`), 'admin denial')
  report.interactions.push('Invalid parameter handled; unauthenticated admin redirects to login')
  for (const width of [390, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false })
    for (const [route, name] of [['/', 'home'], ['/laporan', 'report'], ['/donasi', 'donation'], ['/panduan', 'guides'], ['/darurat', 'emergency']]) {
      await navigate(route)
      const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
      const file = `${name}-${width}.png`; writeFileSync(path.join(output, file), Buffer.from(screenshot.data, 'base64')); report.screenshots.push(file)
    }
  }
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
  socket?.close(); processHandle.kill()
}
