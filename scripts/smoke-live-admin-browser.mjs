import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const origin = 'http://127.0.0.1:5179'
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
const report = { widths: [390, 1440], routeChecks: [], interactions: [], consoleErrors: [], missingAssets: [], screenshots: [] }
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
const server = await createServer({ define: { 'import.meta.env.VITE_DEV_REMOTE_WRITES_APPROVED': JSON.stringify('true'), 'import.meta.env.VITE_REPORT_GATEWAY_ENABLED': JSON.stringify('true'), 'import.meta.env.VITE_TURNSTILE_SITE_KEY': JSON.stringify('local-fixture-site-key') }, server: { host: '127.0.0.1', port: 5179, strictPort: true } })
await server.listen()
const output = path.resolve('docs/qa/live-admin'); mkdirSync(output, { recursive: true })
report.kind = 'Local UI with intercepted synthetic Auth/REST/gateway; not live Supabase, CAPTCHA, SQL, or RLS acceptance'
const fixtureId = '00000000-0000-4000-8000-000000000001', otherId = '00000000-0000-4000-8000-000000000002'
const now = '2026-10-26T08:00:00Z', code = 'RS-0123456789ABCDEF', secret = 'a'.repeat(64)
const db = {
  articles: [], mitigation_guides: [], mitigation_checklist_items: [], disaster_events: [], event_updates: [], event_locations: [], emergency_contacts: [], relief_locations: [],
  data_sources: [{ id: fixtureId, name: 'TEST LOCAL sumber manual', source_type: 'manual', is_active: true, official_url: null, created_at: now }],
  notification_rules: [], notifications: [], source_sync_logs: [], app_settings: [], audit_logs: [],
  public_reports: [{ id: fixtureId, tracking_code: code, report_type: 'Banjir', title: 'TEST LOCAL laporan', description: 'Laporan sintetis untuk browser, bukan kejadian aktual.', location_description: 'Lokasi fixture lokal', status: 'unverified', reviewed_by: null, reviewed_at: null, created_at: now, updated_at: now }], report_status_history: [], report_attachments: [], regions: [{ id: fixtureId, name: 'Wilayah fixture' }],
}
const requests = [], interceptErrors = []
let roles = ['super_admin']
function user() { return { id: fixtureId, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', created_at: now, app_metadata: {}, user_metadata: {} } }
function session() { const encode = item => Buffer.from(JSON.stringify(item)).toString('base64url'); const timestamp = Math.floor(Date.now()/1000); return { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: fixtureId, aud: 'authenticated', role: 'authenticated', iat: timestamp, exp: timestamp + 3600 })}.synthetic-signature`, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, user: user() } }
function fieldHeader(request, name) { return Object.entries(request.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? '' }
async function intercept(message) {
  if (message.method !== 'Fetch.requestPaused') return
  const { requestId, request } = message.params, url = new URL(request.url)
  if (url.hostname === 'challenges.cloudflare.com') {
    const js = `window.turnstile={render:(el,options)=>{el.textContent='Local synthetic challenge';setTimeout(()=>options.callback('fixture-captcha'),10);return 'fixture-widget'},remove:()=>{}}`
    await send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }], body: Buffer.from(js).toString('base64') }); return
  }
  requests.push({ method: request.method, path: url.pathname, staff: fieldHeader(request,'Authorization').endsWith('.synthetic-signature') })
  const staff = requests.at(-1).staff
  let data = [], status = 200
  const table = url.pathname.split('/').at(-1), input = request.postData ? JSON.parse(request.postData) : {}
  if (request.method === 'OPTIONS') data = {}
  else if (url.pathname === '/auth/v1/token') data = session()
  else if (url.pathname === '/auth/v1/user') data = user()
  else if (url.pathname === '/auth/v1/logout') { status = 204; data = null }
  else if (url.pathname === '/functions/v1/report-gateway') {
    if (input.action === 'submit') data = { tracking_code: code, access_token: secret, expires_in_days: 90 }
    else if (input.action === 'track' && input.access_token === secret) data = { status: db.public_reports[0].status, created_at: now, updated_at: now, history: db.report_status_history.map(row => ({ status: row.to_status, changed_at: now })) }
    else { status = 404; data = { error: { code: 'NOT_FOUND' } } }
  } else if (url.pathname.startsWith('/rest/v1/rpc/')) {
    if (!staff) { status = 403; data = { code: '42501' } }
    else if (table === 'review_public_report') { const report = db.public_reports.find(row => row.id === input.p_report_id); if (!report || !['unverified','under_review'].includes(report.status)) { status = 400; data = { code: '22023' } } else { db.report_status_history.push({ id: crypto.randomUUID(), from_status: report.status, to_status: input.p_new_status, reason: input.p_reason, changed_at: now, changed_by: fixtureId }); report.status = input.p_new_status; data = true } }
    else if (table === 'admin_manage_staff') data = true
    else if (table === 'admin_set_public_setting') { db.app_settings.push({ key: input.p_key, value: input.p_value, updated_at: now }); data = db.app_settings.at(-1) }
    else if (table === 'admin_queue_notification') { const row = { id: crypto.randomUUID(), title: input.p_title, body: input.p_body, event_id: input.p_event_id, status: 'queued', created_at: now }; db.notifications.push(row); data = row }
    else { status = 404; data = { code: 'PGRST202' } }
  } else if (url.pathname.startsWith('/rest/v1/')) {
    if (table === 'staff_profiles') data = [{ user_id: fixtureId, display_name: 'TEST LOCAL staf', is_active: true, staff_role_assignments: roles.map(role => ({ roles: { code: role } })) }]
    else if (table === 'staff_role_assignments') data = roles.map((role,index) => ({ staff_id: fixtureId, role_id: `role-${index}` }))
    else if (table === 'roles') data = roles.map((role,index) => ({ id: `role-${index}`, code: role, name: role }))
    else if (!(table in db)) { status = 404; data = { code: 'PGRST205' } }
    else {
      let rows = db[table]
      const matches = row => [...url.searchParams].every(([key,value]) => !value.startsWith('eq.') || String(row[key]) === value.slice(3))
      if (request.method === 'POST') { if (!staff) { status = 403; data = { code: '42501' } } else { const row = { id: crypto.randomUUID(), author_id: null, summary: null, source_url: null, published_at: null, created_at: now, updated_at: now, ...input }; rows.push(row); data = [row] } }
      else if (request.method === 'PATCH') { data = rows.filter(matches).map(row => Object.assign(row,input,{ updated_at: now })) }
      else if (request.method === 'DELETE') { data = rows.filter(matches); db[table] = rows.filter(row => !matches(row)) }
      else {
        if (!staff) {
          if (['articles','mitigation_guides'].includes(table)) rows = rows.filter(row => row.publication_status === 'published')
          if (table === 'emergency_contacts') rows = rows.filter(row => row.is_active && row.is_verified)
          if (table === 'relief_locations') rows = rows.filter(row => row.verification_status === 'verified')
          if (table === 'disaster_events') rows = rows.filter(row => row.published_at && row.verification_status !== 'unconfirmed')
        }
        data = rows.filter(matches).map(row => ({ ...row, ...(table === 'mitigation_guides' ? { mitigation_checklist_items: db.mitigation_checklist_items.filter(item => item.guide_id === row.id && item.is_active) } : {}), ...(table === 'disaster_events' ? { regions: null, data_sources: db.data_sources[0], event_updates: db.event_updates.filter(item => item.event_id === row.id) } : {}), ...(table === 'emergency_contacts' ? { regions: null } : {}) }))
      }
    }
    if (status === 200 && fieldHeader(request,'Accept').includes('application/vnd.pgrst.object+json')) { if (data.length === 1) data = data[0]; else { status = 406; data = { code: 'PGRST116' } } }
  } else { status = 403; data = { error: 'Unexpected external request blocked' } }
  await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' }, { name: 'Content-Range', value: `0-${Math.max(0,(Array.isArray(data)?data.length:1)-1)}/${Array.isArray(data)?data.length:1}` }, { name: 'Access-Control-Expose-Headers', value: 'Content-Range' }], body: status === 204 ? '' : Buffer.from(JSON.stringify(data)).toString('base64') })
}
async function hasText(text, timeout) { await waitFor(() => evaluate(`document.body.textContent.includes(${JSON.stringify(text)})`),text,timeout) }
async function saveResource() { await clickText('Simpan ke dev'); await hasText('Perubahan dikonfirmasi database dev.') }
try {
  await waitFor(() => existsSync(path.join(profile,'DevToolsActivePort')),'Chrome startup')
  const port = readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}) })
  socket.addEventListener('message', event => {
    const message=JSON.parse(event.data)
    if(message.id){const p=pending.get(message.id);if(p){pending.delete(message.id);message.error?p.reject(new Error(message.error.message)):p.resolve(message.result)}}
    else if(message.method==='Runtime.exceptionThrown') errors.push({ route:currentRoute,kind:'runtime exception',description:message.params.exceptionDetails?.exception?.description?.slice(0,160) })
    else if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error') errors.push({route:currentRoute,kind:'console error'})
    else if(message.method==='Network.responseReceived'&&message.params.response.status>=400){const u=new URL(message.params.response.url);if(u.origin===origin)badAssets.push({path:u.pathname,status:message.params.response.status})}
    void intercept(message).catch(error=>interceptErrors.push(error.message))
  })
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Page.bringToFront'); await send('Emulation.setFocusEmulationEnabled',{enabled:true}); await send('Fetch.enable',{patterns:[{urlPattern:'https://*',requestStage:'Request'}]})
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  await navigate('/admin/login'); await setInput('Email','fixture@example.invalid'); await setInput('Kata sandi','fixture-password'); await clickText('Masuk'); await hasText('Dashboard')
  await waitFor(()=>evaluate(`document.querySelectorAll('.admin-sidebar nav a').length===12`),'verified admin menus')
  const routes=['/admin','/admin/artikel','/admin/kejadian','/admin/panduan','/admin/kontak-darurat','/admin/lokasi-bantuan','/admin/staf','/admin/notifikasi','/admin/sumber-data','/admin/pengaturan','/admin/audit','/admin/laporan','/informasi','/panduan','/pemantauan','/peta','/darurat']
  for(const width of report.widths){await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});for(const route of routes){await navigate(route);await delay(150);assert.ok(await evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth+1'),`Overflow ${route} ${width}`);report.routeChecks.push({route,width})}console.log(`PASS ${width}px: ${routes.length} routes`)}
  await navigate('/admin/artikel'); await clickText('Buat artikel'); await setInput('Judul artikel','TEST LOCAL artikel lintas klien'); await setInput('Slug artikel','test-local-shared-article'); await setInput('Ringkasan','Artikel fixture pengujian lokal.'); await setInput('Isi artikel','Konten TEST LOCAL untuk pengujian editor dan layanan REST.'); await setInput('URL sumber','https://example.invalid/source'); await clickText('Simpan ke dev'); await hasText('Artikel tersimpan di Supabase dev')
  await navigate('/informasi'); await hasText('Belum ada artikel'); assert.equal(await evaluate('document.querySelectorAll(".article-card").length'),0)
  await navigate('/admin/artikel'); await hasText('TEST LOCAL artikel lintas klien'); await clickText('Edit'); await setInput('Status artikel','published'); await clickText('Simpan ke dev'); await hasText('Artikel tersimpan di Supabase dev'); await navigate('/informasi'); await hasText('TEST LOCAL artikel lintas klien')
  const publishedId=db.articles[0].id; db.articles[0].title='TEST LOCAL diubah klien lain'
  await hasText('TEST LOCAL diubah klien lain',28_000)
  assert.ok(requests.some(row=>row.path==='/rest/v1/articles'&&!row.staff));report.interactions.push('Draft excluded; publish rendered through anonymous client; open public list polls changes from another client within 28s')
  await evaluate(`window.dispatchEvent(new Event('offline'))`); db.articles[0].title='TEST LOCAL pulih koneksi'; await evaluate(`window.dispatchEvent(new Event('online'))`); await hasText('TEST LOCAL pulih koneksi',5000)
  await evaluate(`Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});window.dispatchEvent(new Event('visibilitychange'))`);db.articles[0].title='TEST LOCAL tab aktif';await evaluate(`Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});window.dispatchEvent(new Event('visibilitychange'))`);await hasText('TEST LOCAL tab aktif',5000);await evaluate(`delete document.visibilityState`)
  report.interactions.push('Reconnect and tab-visible events refetch immediately without waiting for polling interval')
  await navigate('/informasi/test-local-shared-article');await hasText('Konten TEST LOCAL');report.interactions.push('Article detail reads server data by slug')
  await navigate('/admin/panduan');await clickText('Tambah panduan mitigasi');await setInput('Judul','TEST LOCAL panduan');await setInput('Jenis bencana','Banjir');await setInput('Konten (teks biasa)','Materi panduan TEST LOCAL dengan sumber contoh.');await setInput('Publikasi','published');await saveResource();const guideId=db.mitigation_guides[0].id
  await clickText('Checklist mitigasi');await clickText('Tambah checklist mitigasi');await setInput('Panduan terkait',guideId);await setInput('Fase','before');await setInput('Instruksi','Langkah TEST LOCAL sebelum bencana');await evaluate(`document.querySelector('dialog[open] input[type=checkbox]').click()`);await saveResource();await navigate(`/panduan/${guideId}`);await hasText('Sebelum: Langkah TEST LOCAL sebelum bencana');report.interactions.push('Guide/checklist editors write correct FK fields and public detail refetches by UUID')
  await navigate('/admin/lokasi-bantuan');await clickText('Tambah lokasi bantuan');await setInput('Nama fasilitas','TEST LOCAL lokasi bantuan');await setInput('Jenis fasilitas','shelter');await setInput('Koordinat: latitude, longitude','-6.2, 106.8');await setInput('Verifikasi','verified');await saveResource();await navigate('/darurat');await hasText('TEST LOCAL lokasi bantuan');await navigate('/peta');await clickText('TEST LOCAL lokasi bantuan / shelter');await hasText('Latitude -6.2');report.interactions.push('Relief coordinates stored as geography WKT, read on public directory/map without fake markers')
  await navigate(`/admin/laporan/${fixtureId}`);await hasText('TEST LOCAL laporan');await setInput('Status baru','under_review');await setInput('Alasan pemeriksaan','  \t ');await clickText('Tinjau keputusan');await hasText('Alasan yang diisi tidak boleh kosong');assert.equal(await evaluate("!!document.querySelector('dialog[open]')"),false);await setInput('Alasan pemeriksaan','');await clickText('Tinjau keputusan');await clickText('Terapkan keputusan');await hasText('Perubahan status dan history dikonfirmasi backend.');assert.equal(db.report_status_history[0].reason,null);await waitFor(()=>evaluate("document.querySelector('.metadata')?.textContent.includes('under_review')"),'review status updated');report.interactions.push('Blank review field sends NULL; supplied whitespace is blocked; optional reason preserves review workflow');await setInput('Status baru','verified');await setInput('Alasan pemeriksaan','TEST LOCAL keputusan dari form.');await clickText('Tinjau keputusan');await clickText('Terapkan keputusan');await hasText('Perubahan status dan history dikonfirmasi backend.');assert.equal(db.report_status_history.length,2);assert.ok(!requests.some(row=>row.method==='PATCH'&&row.path==='/rest/v1/public_reports'));report.interactions.push('Review uses RPC only and renders confirmed status/history')
  await navigate('/laporan');await setInput('Jenis kejadian','Banjir');await setInput('Judul laporan','TEST LOCAL laporan gateway');await setInput('Deskripsi kejadian','Konten uji lokal yang tidak menggambarkan kejadian aktual.');await setInput('Wilayah kejadian (manual)','Wilayah fixture');await setInput('Alamat atau koordinat kejadian','Alamat fixture untuk pengujian');await evaluate(`document.querySelector('input[type=checkbox]').click()`);await waitFor(()=>evaluate(`[...document.querySelectorAll('button')].some(button=>button.textContent==='Kirim laporan'&&!button.disabled)`),'challenge callback');await clickText('Kirim laporan');await hasText('Laporan diterima backend');assert.ok(!await evaluate(`Object.values(localStorage).some(value=>value.includes(${JSON.stringify(secret)}))`));assert.ok(await evaluate('!location.search&&!location.hash'));report.interactions.push('Gateway receipt shown only after response; tracking token absent from URL/localStorage')
  await navigate('/laporan/lacak');await setInput('Kode pelacakan',code);await setInput('Token akses pribadi',secret);await waitFor(()=>evaluate(`[...document.querySelectorAll('button')].some(button=>button.textContent==='Cari status laporan'&&!button.disabled)`),'tracking challenge');await clickText('Cari status laporan');await hasText('Status: verified');report.interactions.push('Tracking uses POST gateway and renders confirmed status/time without staff notes')
  await navigate('/admin/artikel');await hasText('TEST LOCAL tab aktif');await clickText('Hapus');await clickText('Konfirmasi hapus');await hasText('Penghapusan artikel dikonfirmasi');assert.ok(!db.articles.some(row=>row.id===publishedId));report.interactions.push('Risky delete requires confirmation and server representation')
  roles=['report_verifier'];await send('Page.navigate',{url:origin+'/admin/staf'});await waitFor(()=>evaluate(`location.pathname==='/403'`),'role denial');report.interactions.push('Insufficient role denied protected staff route')
  assert.equal(interceptErrors.length,0,interceptErrors.join(','));assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(badAssets.length,0)
  report.consoleErrors=errors;report.missingAssets=badAssets;report.syntheticRequests=requests.length;report.liveDatabaseWrites=0
  writeFileSync(path.join(output,'browser.json'),JSON.stringify(report,null,2));console.log(`PASS browser: ${report.routeChecks.length} layouts, ${report.interactions.length} integration scenarios; all remote responses synthetic.`)
} catch(error){report.failure=error.message;report.consoleErrors=errors;report.interceptErrors=interceptErrors;report.failureBody=await evaluate('document.querySelector("main")?.textContent').catch(()=>null);writeFileSync(path.join(output,'browser.json'),JSON.stringify(report,null,2));throw error}
finally{socket?.close();processHandle.kill();await server.close()}
