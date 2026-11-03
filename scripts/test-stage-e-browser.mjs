import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const origin = 'http://127.0.0.1:5187'
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
const report = { widths: [1440], routeChecks: [], interactions: [], consoleErrors: [], missingAssets: [], screenshots: [] }
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
  await waitFor(() => evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find(el => el.textContent.trim() === ${JSON.stringify(text)}); return !!el && !el.disabled })()`), 'enabled action '+text)
  assert.ok(await evaluate(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find(el => el.textContent.trim() === ${JSON.stringify(text)}); if (!el || el.disabled) return false; el.click(); return true })()`), `Missing enabled action: ${text}`)
  await delay(100)
}
async function navigate(route) {
  currentRoute = route
  await send('Page.navigate', { url: origin + route })
  await waitFor(() => evaluate(`location.pathname === ${JSON.stringify(route)} && document.readyState === 'complete' && !!document.querySelector('h1')`), route)
}
async function setInput(label, value) {
  await waitFor(() => evaluate(`(() => {const l=[...document.querySelectorAll('label')].find(el=>el.textContent.trim()===${JSON.stringify(label)});const e=l&&document.getElementById(l.htmlFor);return !!e&&!e.disabled})()`), 'input '+label)
  const nativeText=await evaluate(`(() => {const l=[...document.querySelectorAll('label')].find(el=>el.textContent.trim()===${JSON.stringify(label)});const e=document.getElementById(l.htmlFor);if(e.tagName==='TEXTAREA'||e.tagName==='INPUT'&&['text','search','url','tel','password'].includes(e.type)){e.focus();e.select();return true}return false})()`)
  if(nativeText) await send('Input.insertText',{text:value})
  else assert.ok(await evaluate(`(() => { const label=[...document.querySelectorAll('label')].find(el=>el.textContent.trim()===${JSON.stringify(label)});const el=label&&document.getElementById(label.htmlFor);if(!el)return false;Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true})()`))
}
const { createServer } = await import('vite')
const server = await createServer({ cacheDir: '.tools/stage-e-vite-cache', define: { 'import.meta.env.VITE_DEV_REMOTE_WRITES_APPROVED': JSON.stringify('false'), 'import.meta.env.VITE_DEV_CONTENT_WRITES_ENABLED': JSON.stringify('true'), 'import.meta.env.VITE_DEV_ARTICLE_WRITES_APPROVED': JSON.stringify('false'), 'import.meta.env.VITE_DEV_REPORT_REVIEW_ENABLED': JSON.stringify('true'), 'import.meta.env.VITE_DEV_REPORT_REVIEW_APPROVED': JSON.stringify('false'), 'import.meta.env.VITE_REPORT_GATEWAY_ENABLED': JSON.stringify('true'), 'import.meta.env.VITE_TURNSTILE_SITE_KEY': JSON.stringify('local-fixture-site-key') }, server: { hmr: false, host: '127.0.0.1', port: 5187, strictPort: true } })
await server.listen()
const output = path.resolve('docs/qa/stage-e'); mkdirSync(output, { recursive: true })
report.status='RUNNING_LOCAL';report.interactions.push=function(...items){Array.prototype.push.apply(this,items);writeFileSync(path.join(output,'browser.json'),JSON.stringify(report,null,2));for(const item of items)console.log('PASS local browser: '+item.test);return this.length};
report.kind = 'Local UI with intercepted synthetic Auth/REST/gateway; not live Supabase, CAPTCHA, SQL, or RLS acceptance'
const fixtureId = '00000000-0000-4000-8000-000000000001', otherId = '00000000-0000-4000-8000-000000000002'
const now = '2026-10-26T08:00:00Z', code = 'RS-0123456789ABCDEF', secret = 'a'.repeat(64)
const db = {
  articles: [], mitigation_guides: [], mitigation_checklist_items: [], disaster_events: [], event_updates: [], event_locations: [], emergency_contacts: [], relief_locations: [],
  data_sources: [{ id: fixtureId, name: 'TEST LOCAL sumber manual', source_type: 'manual', is_active: true, official_url: null, created_at: now }],
  notification_rules: [], notifications: [], source_sync_logs: [], app_settings: [], audit_logs: [],
  public_reports: [{ id: fixtureId, tracking_code: code, report_type: 'Banjir', title: 'TEST LOCAL laporan', description: 'Laporan sintetis untuk browser, bukan kejadian aktual.', location_description: 'Lokasi fixture lokal', status: 'unverified', reviewed_by: null, reviewed_at: null, created_at: now, updated_at: now }], report_status_history: [], report_attachments: [], regions: [{id:'00000000-0000-4000-8000-000000000011',parent_id:null,code:'13',name:'TEST LOCAL provinsi',region_type:'province'},{id:'00000000-0000-4000-8000-000000000012',parent_id:'00000000-0000-4000-8000-000000000011',code:'13.71',name:'TEST LOCAL kota',region_type:'city'},{id:'00000000-0000-4000-8000-000000000013',parent_id:'00000000-0000-4000-8000-000000000012',code:'13.71.01',name:'TEST LOCAL kecamatan',region_type:'district'},{id:'00000000-0000-4000-8000-000000000014',parent_id:'00000000-0000-4000-8000-000000000013',code:'13.71.01.1001',name:'TEST LOCAL kelurahan',region_type:'village'}],
}
const requests = [], interceptErrors = []
let roles = ['super_admin']; let slowRoles = false
function user() { return { id: fixtureId, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', created_at: now, app_metadata: {}, user_metadata: {} } }
function session() { const encode = item => Buffer.from(JSON.stringify(item)).toString('base64url'); const timestamp = Math.floor(Date.now()/1000); return { access_token: `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: fixtureId, aud: 'authenticated', role: 'authenticated', iat: timestamp, exp: timestamp + 3600 })}.synthetic-signature`, refresh_token: 'fixture-refresh', token_type: 'bearer', expires_in: 3600, user: user() } }
function fieldHeader(request, name) { return Object.entries(request.headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? '' }
async function intercept(message) {
  if (message.method !== 'Fetch.requestPaused') return
  const { requestId, request } = message.params, url = new URL(request.url)
  if (slowRoles && url.pathname === '/rest/v1/staff_profiles') await delay(600)
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
    else if (table === 'review_public_report') { const report = db.public_reports.find(row => row.id === input.p_report_id); if (!report || !['unverified','under_review'].includes(report.status)) { status = 400; data = { code: '22023' } } else { db.report_status_history.push({ id: crypto.randomUUID(), from_status: report.status, to_status: input.p_new_status, reason: input.p_reason, changed_at: now, changed_by: fixtureId }); report.status = input.p_new_status; report.reviewed_by=fixtureId; report.reviewed_at=now; db.audit_logs.push({id:crypto.randomUUID(),actor_id:fixtureId,action:'UPDATE',entity_type:'public_reports',entity_id:report.id,created_at:now}); data = true } }
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
      const matches = row => [...url.searchParams].every(([key,value]) => value.startsWith('eq.') ? String(row[key]) === value.slice(3) : value==='is.null' ? row[key]===null : true)
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
    if (status === 200 && staff && ['POST','PATCH','DELETE'].includes(request.method) && table !== 'audit_logs' && !url.pathname.startsWith('/auth/')) {const entity=table==='review_public_report'?'public_reports':table;db.audit_logs.push({id:crypto.randomUUID(),actor_id:fixtureId,action:request.method==='POST'?'INSERT':'UPDATE',entity_type:entity,entity_id:input.p_report_id??(Array.isArray(data)?data[0]?.id:undefined)??fixtureId,created_at:now})}
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
    else if(message.method==='Page.frameNavigated'&&!message.params.frame.parentId){report.documentNavigations??=[];report.documentNavigations.push(new URL(message.params.frame.url).pathname)}
    else if(message.method==='Runtime.exceptionThrown') errors.push({ route:currentRoute,kind:'runtime exception',description:message.params.exceptionDetails?.exception?.description?.slice(0,160) })
    else if(message.method==='Runtime.consoleAPICalled'&&message.params.type==='error') errors.push({route:currentRoute,kind:'console error'})
    else if(message.method==='Network.responseReceived'&&message.params.response.status>=400){const u=new URL(message.params.response.url);if(u.origin===origin)badAssets.push({path:u.pathname,status:message.params.response.status})}
    void intercept(message).catch(error=>{if(!error.message.includes('Invalid InterceptionId'))interceptErrors.push(error.message)})
  })
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Page.bringToFront');  await send('Fetch.enable',{patterns:[{urlPattern:'https://*',requestStage:'Request'}]})
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  await navigate('/admin/login'); await setInput('Email','fixture@example.invalid'); await setInput('Kata sandi','fixture-password'); await clickText('Masuk'); await hasText('Dashboard')
  await waitFor(()=>evaluate(`document.querySelectorAll('.admin-sidebar nav a').length===12`),'verified admin menus')

  async function visibleDialogClose(){const ok=await evaluate(`(() => {const d=document.querySelector('dialog[open]');const b=d?.querySelector('[aria-label="Tutup dialog"]');b?.click();return !!b})()`);assert.ok(ok);await waitFor(()=>evaluate('!document.querySelector("dialog[open]")'),'modal fully closed')}
  async function internal(href){
    const point=await evaluate(`(() => {const a=[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')===${JSON.stringify(href)});if(!a)return null;a.scrollIntoView({block:'center'});const r=a.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);assert.ok(point)
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1})
    await waitFor(()=>evaluate(`location.pathname===${JSON.stringify(href)}`),'internal route '+href)
  }
  async function tabCheck(label){
    slowRoles=true;await send('Emulation.setFocusEmulationEnabled',{enabled:false})
    await evaluate(`window.__eDocument ||= crypto.randomUUID();window.__eStamp=window.__eDocument;window.__eActive=document.activeElement;window.__eSelection=[window.__eActive?.selectionStart,window.__eActive?.selectionEnd];window.__eForm=[...document.querySelectorAll('form')].find(f=>f.getClientRects().length);window.scrollTo(0,Math.min(250,document.documentElement.scrollHeight-innerHeight));window.__eY=scrollY;window.__eFields=[...window.__eForm.querySelectorAll('input,textarea,select')].map(e=>[e,e.value,e.checked]);window.__eDialog=document.querySelector('dialog[open] .rs-dialog__body');if(window.__eDialog)window.__eDialog.scrollTop=100;window.__eDialogY=window.__eDialog?.scrollTop;`)
    const {targetId}=await send('Target.createTarget',{url:'about:blank'})
    await send('Target.activateTarget',{targetId});await delay(200)
    const hidden=await evaluate('document.visibilityState')
    await send('Page.bringToFront');await delay(100)
    await evaluate(`window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('pageshow'))`)
    await delay(1000)
    const stable=await evaluate(`window.__eDocument===window.__eStamp && document.activeElement===window.__eActive && JSON.stringify([window.__eActive?.selectionStart,window.__eActive?.selectionEnd])===JSON.stringify(window.__eSelection) && window.__eForm?.isConnected && Math.abs(scrollY-window.__eY)<=1 && window.__eFields.every(([e,v,c])=>e.isConnected&&e.value===v&&e.checked===c) && (!window.__eDialog || window.__eDialog.scrollTop===window.__eDialogY)`)
    await send('Target.closeTarget',{targetId});await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true});slowRoles=false
    assert.equal(stable,true,'Draft/DOM/scroll lost on tab switch: '+label)
    report.interactions.push({test:'tab-focus-preserves-'+label,passed:true,backgroundVisibility:hidden,realSecondTab:true})
  }
  await navigate('/admin/artikel');await clickText('Buat artikel');await setInput('Judul artikel','TEST LOCAL E artikel');await setInput('Slug artikel','test-local-e-article');await setInput('Ringkasan','Ringkasan sintetis pengujian E.');await setInput('Isi artikel','Konten sintetis TEST LOCAL untuk kontrak editor.');await setInput('URL sumber','https://example.invalid/test-e');await tabCheck('article')
  await visibleDialogClose();await internal('/admin/kejadian');await internal('/admin/artikel');await clickText('Lanjutkan draf artikel');await waitFor(()=>evaluate(`!!document.querySelector('dialog[open] form')`),'article draft on internal return');assert.ok(await evaluate(`[...document.querySelectorAll('input')].some(i=>i.value==='TEST LOCAL E artikel')`));assert.ok(await evaluate(`typeof window.__eStamp==='string'&&window.__eDocument===window.__eStamp`));report.interactions.push({test:'internal-routing-and-memory-draft',passed:true})
  await clickText('Simpan ke dev');await hasText('Artikel tersimpan');assert.equal(db.articles[0].publication_status,'draft');await navigate('/informasi');assert.ok(!await evaluate(`document.querySelector('main').textContent.includes('TEST LOCAL E artikel')`))
  await navigate('/admin/artikel');await clickText('Edit');await setInput('Status artikel','published');await clickText('Simpan ke dev');await hasText('Artikel tersimpan');await navigate('/informasi/test-local-e-article');await hasText('TEST LOCAL E artikel')
  await navigate('/admin/artikel');await clickText('Edit');await setInput('Judul artikel','TEST LOCAL E artikel updated');await clickText('Simpan ke dev');await hasText('Artikel tersimpan');await navigate('/informasi/test-local-e-article');await hasText('TEST LOCAL E artikel updated');await navigate('/admin/artikel');await clickText('Edit');await setInput('Status artikel','archived');await clickText('Simpan ke dev');await hasText('Artikel tersimpan');await navigate('/informasi');assert.ok(!await evaluate(`document.querySelector('main').textContent.includes('TEST LOCAL E artikel')`));report.interactions.push({test:'article-draft-publish-update-archive',passed:true,kind:'synthetic REST'})
  await navigate('/admin/kejadian');await clickText('Tambah kejadian bencana');await setInput('Judul','TEST LOCAL E kejadian');await setInput('Jenis bencana','Lainnya');await setInput('Sumber data',fixtureId);await setInput('Verifikasi','staff_verified');await setInput('Status kejadian','ongoing');await setInput('Waktu publikasi','2026-10-31T09:00');await tabCheck('disaster');await saveResource();const eventId=db.disaster_events[0].id;await navigate('/pemantauan/'+eventId);await hasText('TEST LOCAL E kejadian');await navigate('/admin/kejadian');await clickText('Edit');await setInput('Judul','TEST LOCAL E kejadian updated');await saveResource();await navigate('/pemantauan/'+eventId);await hasText('TEST LOCAL E kejadian updated');report.interactions.push({test:'disaster-create-update-public',passed:true})
  await navigate('/admin/kontak-darurat');await clickText('Tambah kontak darurat');await setInput('Organisasi','TEST LOCAL E kontak');await setInput('Jenis layanan','TEST LOCAL simulasi');await setInput('URL resmi','https://example.invalid/test-e');await setInput('Waktu verifikasi','2026-10-31T09:00');await evaluate(`document.querySelectorAll('dialog[open] input[type=checkbox]').forEach(i=>{if(!i.checked)i.click()})`);await tabCheck('contact');await saveResource();await navigate('/darurat');await hasText('TEST LOCAL E kontak');await navigate('/admin/kontak-darurat');await clickText('Edit');await setInput('Organisasi','TEST LOCAL E kontak updated');await saveResource();await navigate('/darurat');await hasText('TEST LOCAL E kontak updated');report.interactions.push({test:'contact-create-update-public',passed:true})
  await navigate('/admin/panduan');await clickText('Tambah panduan mitigasi');await setInput('Judul','TEST LOCAL E panduan');await setInput('Jenis bencana','Lainnya');await setInput('Konten (teks biasa)','Materi panduan sintetis TEST LOCAL untuk uji integrasi.');await setInput('Publikasi','published');await tabCheck('guide');await saveResource();const guideId=db.mitigation_guides[0].id
  await clickText('Checklist mitigasi');await clickText('Tambah checklist mitigasi');await setInput('Panduan terkait',guideId);await setInput('Fase','before');await setInput('Instruksi','TEST LOCAL E checklist');await evaluate(`document.querySelector('dialog[open] input[type=checkbox]').click()`);await saveResource();await navigate('/panduan/'+guideId);await hasText('TEST LOCAL E checklist');report.interactions.push({test:'guide-checklist-public',passed:true})
  await navigate('/admin/lokasi-bantuan');await clickText('Tambah lokasi bantuan');await setInput('Nama fasilitas','TEST LOCAL E lokasi');await setInput('Jenis fasilitas','shelter');await setInput('Verifikasi','verified');await setInput('Koordinat: latitude, longitude','-6.2, 106.8');await tabCheck('relief');await saveResource();await navigate('/darurat');await hasText('TEST LOCAL E lokasi');report.interactions.push({test:'relief-public',passed:true})
  await navigate('/admin/pengaturan');await clickText('Tambah pengaturan publik');await setInput('Pengaturan yang diizinkan','public_notice');await setInput('Nilai teks publik','TEST LOCAL E draft settings');await tabCheck('settings');assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Simpan ke dev').disabled`),true);await visibleDialogClose()
  await navigate('/admin/staf');await clickText('Edit staf');await setInput('Nama tampilan staf','TEST LOCAL E draft staff');await tabCheck('staff');assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Tinjau perubahan staf').disabled`),true);await visibleDialogClose();report.interactions.push({test:'staff-settings-remain-write-blocked',passed:true})
  await navigate('/laporan');await setInput('Jenis kejadian','Lainnya');await setInput('Judul laporan','TEST LOCAL E laporan');await setInput('Deskripsi kejadian','Deskripsi sintetis tanpa identitas pribadi untuk uji E.');for(const [label,id]of[['Provinsi','00000000-0000-4000-8000-000000000011'],['Kabupaten / Kota','00000000-0000-4000-8000-000000000012'],['Kecamatan','00000000-0000-4000-8000-000000000013'],['Desa / Kelurahan','00000000-0000-4000-8000-000000000014']]){await waitFor(()=>evaluate(`[...document.querySelectorAll('option')].some(o=>o.value===${JSON.stringify(id)})`),'region option');await setInput(label,id)}
  await setInput('Alamat atau koordinat kejadian','TEST LOCAL lokasi tanpa alamat pribadi');await evaluate(`document.querySelector('form input[type=checkbox]').click()`);await tabCheck('public-report')
  await clickText('Draf sementara');await setInput('Frasa pemulihan draf','test-browser-private-phrase');await clickText('Lindungi draf tab ini');await hasText('Pemulihan draf terlindungi diaktifkan');await visibleDialogClose();await delay(400)
  assert.ok(await evaluate(`!Object.values(sessionStorage).some(v=>v.includes('TEST LOCAL E laporan')||v.includes('test-browser-private-phrase'))`));await send('Page.reload');await hasText('Laporan kejadian');await clickText('Draf sementara tersedia untuk dipulihkan');await setInput('Frasa pemulihan draf','test-browser-private-phrase');await clickText('Pulihkan draf');await hasText('Draf dipulihkan.');await visibleDialogClose();await waitFor(()=>evaluate(`[...document.querySelectorAll('input')].some(i=>i.value==='TEST LOCAL E laporan')`),'report draft restored');await waitFor(()=>evaluate(`[...document.querySelectorAll('select')].some(i=>i.value==='00000000-0000-4000-8000-000000000014')`),'region restored');report.interactions.push({test:'encrypted-tab-reload-recovery-with-region',passed:true})
  await waitFor(()=>evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Kirim laporan'&&!b.disabled)`),'submit ready');await clickText('Kirim laporan');await hasText('Laporan diterima backend');report.interactions.push({test:'public-submit-after-draft-recovery',passed:true,kind:'synthetic gateway'})
  await navigate('/laporan/lacak');await setInput('Kode pelacakan',code);await setInput('Token akses pribadi',secret);await tabCheck('tracking');await clickText('Cari status laporan');await hasText('Status: unverified')
  await navigate(`/admin/laporan/${fixtureId}`);await setInput('Status baru','under_review');await setInput('Alasan pemeriksaan','TEST LOCAL E review');await tabCheck('report-review');await clickText('Tinjau keputusan');await clickText('Terapkan keputusan');await hasText('Perubahan status dan history dikonfirmasi backend.')
  await navigate('/laporan/lacak');await setInput('Kode pelacakan',code);await setInput('Token akses pribadi',secret);await clickText('Cari status laporan');await hasText('Status: under_review');await navigate(`/admin/laporan/${fixtureId}`);await setInput('Status baru','rejected');await clickText('Tinjau keputusan');await clickText('Terapkan keputusan');await hasText('Perubahan status dan history dikonfirmasi backend.');await navigate('/laporan/lacak');await setInput('Kode pelacakan',code);await setInput('Token akses pribadi',secret);await clickText('Cari status laporan');await hasText('Status: rejected');assert.ok(!requests.some(r=>r.method==='PATCH'&&r.path==='/rest/v1/public_reports'));report.interactions.push({test:'admin-review-under-review-rejected-track-matches',passed:true,kind:'synthetic RPC/gateway'})
  await navigate('/admin/kejadian');await clickText('Edit');await setInput('Waktu publikasi','');await saveResource();await navigate('/admin/kontak-darurat');await clickText('Edit');await evaluate(`const boxes=[...document.querySelectorAll('dialog[open] input[type=checkbox]')];if(boxes[1].checked)boxes[1].click()`);await saveResource();await navigate('/admin/panduan');await clickText('Edit');await setInput('Publikasi','archived');await saveResource();await navigate('/admin/lokasi-bantuan');await clickText('Edit');await setInput('Verifikasi','unverified');await saveResource();await navigate('/darurat');assert.ok(!await evaluate(`document.querySelector('main').textContent.includes('TEST LOCAL E lokasi')||document.querySelector('main').textContent.includes('TEST LOCAL E kontak')`));report.interactions.push({test:'logical-cleanup-hidden-from-public',passed:true})
  await navigate('/admin/audit');await hasText('public_reports');report.interactions.push({test:'audit-metadata-reader',passed:true,kind:'synthetic audit rows, not a LIVE trigger proof'});
  roles=['report_verifier'];await send('Page.navigate',{url:origin+'/admin/staf'});await waitFor(()=>evaluate(`location.pathname==='/403'`),'RBAC rejection');report.interactions.push({test:'insufficient-role-denied',passed:true})
  assert.equal(interceptErrors.length,0,interceptErrors.join(','));assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(badAssets.length,0)
  report.consoleErrors=errors;report.missingAssets=badAssets;report.syntheticRequests=requests.length;report.liveDatabaseWrites=0;report.status='PASS_LOCAL_ONLY'
  writeFileSync(path.join(output,'browser.json'),JSON.stringify(report,null,2));console.log(`PASS Stage E browser: ${report.interactions.length} scenarios; real Chrome/tabs, synthetic backend, Cloud writes 0.`)
} catch(error){const shot=await send('Page.captureScreenshot',{format:'png'}).catch(()=>null);if(shot)writeFileSync('.tools/stage-e-failure.png',Buffer.from(shot.data,'base64'));report.failureDOM=await evaluate(`({visibility:document.visibilityState,documentStable:!!window.__eStamp&&window.__eStamp===window.__eDocument,dialogs:document.querySelectorAll('dialog[open]').length,active:document.activeElement?.tagName,links:[...document.querySelectorAll('a')].filter(a=>a.getAttribute('href')==='/admin/kejadian').map(a=>({href:a.href,rect:{x:a.getBoundingClientRect().x,y:a.getBoundingClientRect().y,width:a.getBoundingClientRect().width},inert:a.inert,tab:a.tabIndex}))})`).catch(()=>null);report.status='FAIL_LOCAL';report.failure=error.message;report.failureRoute=currentRoute;report.failureLocation=await evaluate('location.pathname').catch(()=>null);report.failureBody=await evaluate('document.querySelector("main")?.textContent?.slice(0,1400)').catch(()=>null);report.consoleErrors=errors;report.interceptErrors=interceptErrors;writeFileSync(path.join(output,'browser.json'),JSON.stringify(report,null,2));console.error('Stage E browser failure:',error.message);process.exitCode=1}
finally{socket?.close();processHandle.kill();await server.close()}
