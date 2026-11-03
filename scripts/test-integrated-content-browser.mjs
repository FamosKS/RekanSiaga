// LOCAL integration only. HTTPS intercepted; synthetic Auth/REST/Storage, not LIVE.
import {sanitizeArticlePng} from '../supabase/functions/_shared/articleImage.ts'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const origin = 'http://127.0.0.1:5193'
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
let harnessReady = false
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
const server = await createServer({ cacheDir: '.tools/integrated-content-vite-cache', define: { 'import.meta.env.VITE_INTEGRATED_CONTENT_ENABLED': JSON.stringify('true'), 'import.meta.env.VITE_REPORT_SINGLE_CODE_ENABLED': JSON.stringify('false'), 'import.meta.env.VITE_DEV_REMOTE_WRITES_APPROVED': JSON.stringify('false'), 'import.meta.env.VITE_DEV_CONTENT_WRITES_ENABLED': JSON.stringify('true'), 'import.meta.env.VITE_DEV_ARTICLE_WRITES_APPROVED': JSON.stringify('false'), 'import.meta.env.VITE_DEV_REPORT_REVIEW_ENABLED': JSON.stringify('true'), 'import.meta.env.VITE_DEV_REPORT_REVIEW_APPROVED': JSON.stringify('false'), 'import.meta.env.VITE_REPORT_GATEWAY_ENABLED': JSON.stringify('true'), 'import.meta.env.VITE_TURNSTILE_SITE_KEY': JSON.stringify('local-fixture-site-key') }, server: { hmr: false, host: '127.0.0.1', port: 5193, strictPort: true } })
await server.listen()
const output = path.resolve('docs/qa/stage-e'); mkdirSync(output, { recursive: true })
report.status='RUNNING_LOCAL';report.interactions.push=function(...items){Array.prototype.push.apply(this,items);writeFileSync(path.join(output,'integrated-content-browser.json'),JSON.stringify(report,null,2));for(const item of items)console.log('PASS local browser: '+item.test);return this.length};
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
let roles = ['super_admin']; let slowRoles = false; let failImageUpload=true
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
  if (url.hostname.endsWith('tile.openstreetmap.org') || url.hostname==='media.invalid'||request.method==='GET'&&url.pathname.startsWith('/storage/v1/object/sign/article-media/')) {
    await send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/png'}],body:readFileSync('.tools/integrated-upload.png').toString('base64')}); return
  }
  requests.push({ method: request.method, path: url.pathname, staff: fieldHeader(request,'Authorization').endsWith('.synthetic-signature') })
  const staff = requests.at(-1).staff
  let data = [], status = 200; let fullCount
  const table = url.pathname.split('/').at(-1), input = request.postData ? JSON.parse(request.postData) : {}
  if (request.method === 'OPTIONS') data = {}
  else if (url.pathname === '/auth/v1/token') data = session()
  else if (url.pathname === '/auth/v1/user') data = user()
  else if (url.pathname === '/auth/v1/logout') { status = 204; data = null }
  else if(url.pathname==='/functions/v1/article-media'){
    if(failImageUpload){status=503;data={error:'MEDIA_UNAVAILABLE'}}
    else{sanitizeArticlePng(Uint8Array.from(Buffer.from(input.png_base64,'base64')));const row=db.articles.find(r=>r.id===input.article_id);row.cover_image_path='article-media/articles/'+row.id+'/'+otherId+'.png';data={article:row}}
  }else if(url.pathname.startsWith('/storage/v1/object/sign/article-media/'))data={signedURL:'/object/sign/article-media/synthetic.png?token=SYNTHETIC-LOCAL-ONLY'}
  else if (url.pathname === '/functions/v1/report-gateway') {
    if (input.action === 'submit') data = { tracking_code: code, access_token: secret, expires_in_days: 90 }
    else if (input.action === 'track' && input.access_token === secret) data = { status: db.public_reports[0].status, created_at: now, updated_at: now, history: db.report_status_history.map(row => ({ status: row.to_status, changed_at: now })) }
    else { status = 404; data = { error: { code: 'NOT_FOUND' } } }
  } else if (url.pathname.startsWith('/rest/v1/rpc/')) {
    if(table==='public_event_feed_v1'){
      let rows=db.disaster_events.filter(e=>e.published_at&&['staff_verified','source_confirmed'].includes(e.verification_status))
      if(input.p_search)rows=rows.filter(e=>e.title.toLowerCase().includes(input.p_search.toLowerCase()))
      if(input.p_kind)rows=rows.filter(e=>e.disaster_type===input.p_kind)
      if(input.p_status)rows=rows.filter(e=>e.event_status===input.p_status)
      data={kinds:[...new Set(db.disaster_events.filter(e=>e.published_at&&e.verification_status!=='unconfirmed').map(e=>e.disaster_type))],total:rows.length,regions_count:0,updated_at:rows.length?now:null,items:rows.slice((input.p_page-1)*input.p_page_size,input.p_page*input.p_page_size).map(e=>({...e,description:e.description??null,occurred_at:e.occurred_at??null,source_updated_at:e.source_updated_at??null,regions:null,data_sources:db.data_sources[0],event_updates:[],event_locations:db.event_locations.filter(l=>l.event_id===e.id)}))}
    }else if (!staff) { status = 403; data = { code: '42501' } }
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
    if(table==='articles'&&request.method==='GET'&&Array.isArray(data)){
      const needle=url.searchParams.get('title');if(needle?.startsWith('ilike.'))data=data.filter(r=>r.title.toLowerCase().includes(needle.slice(6).replaceAll('%','').toLowerCase()))
      fullCount=data.length;data=data.slice(Number(url.searchParams.get('offset')??0),Number(url.searchParams.get('offset')??0)+Number(url.searchParams.get('limit')??data.length))
    }
    if (status === 200 && staff && ['POST','PATCH','DELETE'].includes(request.method) && table !== 'audit_logs' && !url.pathname.startsWith('/auth/')) {const entity=table==='review_public_report'?'public_reports':table;db.audit_logs.push({id:crypto.randomUUID(),actor_id:fixtureId,action:request.method==='POST'?'INSERT':'UPDATE',entity_type:entity,entity_id:input.p_report_id??(Array.isArray(data)?data[0]?.id:undefined)??fixtureId,created_at:now})}
    if (status === 200 && fieldHeader(request,'Accept').includes('application/vnd.pgrst.object+json')) { if (data.length === 1) data = data[0]; else { status = 406; data = { code: 'PGRST116' } } }
  } else { status = 403; data = { error: 'Unexpected external request blocked' } }
  await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }, { name: 'Access-Control-Allow-Origin', value: origin }, { name: 'Access-Control-Allow-Headers', value: '*' }, { name: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' }, { name: 'Content-Range', value: `0-${Math.max(0,(Array.isArray(data)?data.length:1)-1)}/${fullCount??(Array.isArray(data)?data.length:1)}` }, { name: 'Access-Control-Expose-Headers', value: 'Content-Range' }], body: status === 204 ? '' : Buffer.from(JSON.stringify(data)).toString('base64') })
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
  harnessReady = true

  // Generate a real tiny PNG locally for preview, Canvas normalization and sanitizer.
  const pixel=await evaluate(`(()=>{const c=document.createElement('canvas');c.width=4;c.height=4;c.getContext('2d').fillRect(0,0,4,4);return c.toDataURL('image/png').split(',')[1]})()`)
  writeFileSync('.tools/integrated-upload.png',Buffer.from(pixel,'base64'))
  await navigate('/admin/login');await setInput('Email','fixture@example.invalid');await setInput('Kata sandi','fixture-password');await clickText('Masuk');await hasText('Dashboard')
  await navigate('/admin/kejadian');await clickText('Tambah kejadian bencana');await setInput('Judul','TEST LOCAL integrated event');await setInput('Jenis bencana','Banjir');await setInput('Sumber data',fixtureId);await setInput('Verifikasi kejadian','staff_verified');await setInput('Status kejadian','ongoing');await setInput('Waktu publikasi','2026-11-02T09:00');await saveResource()
  const eventId=db.disaster_events[0].id
  await clickText('Lokasi kejadian');await clickText('Tambah lokasi kejadian');await setInput('Kejadian terkait',eventId);await setInput('Nama lokasi publik','TEST PUBLIC curated location');await setInput('Jenis lokasi','affected_area');await setInput('Koordinat: latitude, longitude','-0.9, 100.4');await saveResource()
  await navigate('/pemantauan');await hasText('TEST LOCAL integrated event');assert.equal(await evaluate(`document.querySelectorAll('.event-card').length`),1)
  await waitFor(()=>evaluate(`document.querySelector('.monitoring-filters fieldset').getBoundingClientRect().height<350`),'compact desktop region filters')
  const desktop=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(path.join(output,'integrated-monitoring-desktop.png'),Buffer.from(desktop.data,'base64'))
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await delay(150)
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),true)
  const mobile=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});writeFileSync(path.join(output,'integrated-monitoring-mobile.png'),Buffer.from(mobile.data,'base64'))
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false})
  report.interactions.push({test:'responsive-monitoring-desktop-and-mobile-no-overflow',passed:true})
  report.interactions.push({test:'admin-event-create-curated-location-and-monitoring',passed:true,kind:'local synthetic API'})
  await navigate('/peta');await waitFor(()=>evaluate(`document.querySelectorAll('.leaflet-marker-icon').length===1`),'one curated marker')
  await evaluate(`document.querySelector('.leaflet-marker-icon').click()`);await hasText('Detail kejadian')
  assert.equal(await evaluate(`document.querySelector('dialog[open] a').getAttribute('href')`),'/pemantauan/'+eventId)
  report.interactions.push({test:'same-event-feed-drives-Leaflet-marker-and-detail-link',passed:true})
  await navigate('/admin/kejadian');await clickText('Edit');await setInput('Status kejadian','resolved');await saveResource();await navigate('/pemantauan');await hasText('Selesai');await navigate('/peta');await waitFor(()=>evaluate(`document.querySelectorAll('.leaflet-marker-icon').length===1`),'updated marker');await evaluate(`document.querySelector('.leaflet-marker-icon').click()`);await hasText('Selesai')
  report.interactions.push({test:'event-status-update-syncs-monitoring-and-map',passed:true})
  await navigate('/admin/kejadian');await clickText('Edit');await setInput('Waktu publikasi','');await saveResource();await navigate('/pemantauan');await hasText('Belum ada kejadian yang diterbitkan')
  report.interactions.push({test:'withdrawn-event-hidden-from-public-feed',passed:true})
  await navigate('/admin/artikel');await clickText('Buat artikel');await setInput('Judul artikel','TEST LOCAL original article');await setInput('Slug artikel','test-local-original-article');await setInput('Ringkasan','Synthetic local summary for original article');await setInput('Isi artikel','Synthetic local article text retained after upload failure.');await setInput('Status artikel','published')
  const root=await send('DOM.getDocument');const fileInput=await send('DOM.querySelector',{nodeId:root.root.nodeId,selector:'dialog[open] input[type=file]'})
  await send('DOM.setFileInputFiles',{nodeId:fileInput.nodeId,files:[path.resolve('.tools/integrated-upload.png')]})
  await waitFor(()=>evaluate(`!!document.querySelector('dialog[open] img[src^="blob:"]')`),'local image preview')
  await evaluate(`window.__articleDoc=document;window.__articleBody=[...document.querySelectorAll('textarea')].find(e=>e.value.includes('retained'));window.__articleBody.focus();window.__articleBody.blur();window.__articleBody.focus()`)
  const second=(await send('Target.createTarget',{url:'about:blank'})).targetId
  await send('Target.activateTarget',{targetId:second});await delay(200);await send('Target.closeTarget',{targetId:second});await send('Page.bringToFront');await delay(400)
  assert.equal(await evaluate(`window.__articleDoc===document&&window.__articleBody.value.includes('retained')&&window.__articleBody.isConnected`),true)
  report.interactions.push({test:'file-preview-and-real-tab-switch-retain-document-and-article-text',passed:true})
  await clickText('Simpan ke dev');await hasText('Upload belum dikonfirmasi.');assert.equal(db.articles.length,1);assert.equal(db.articles[0].publication_status,'draft');assert.equal(await evaluate(`window.__articleBody.value.includes('retained')`),true)
  report.interactions.push({test:'failed-upload-retains-text-and-draft-checkpoint',passed:true})
  failImageUpload=false;await clickText('Simpan ke dev');await hasText('Artikel tersimpan di Supabase dev');assert.equal(db.articles.length,1);assert.equal(db.articles[0].publication_status,'published');assert.ok(db.articles[0].cover_image_path.startsWith('article-media/'))
  report.interactions.push({test:'retry-uses-existing-draft-no-duplicate-and-publishes-after-image-commit',passed:true})
  await navigate('/informasi');await hasText('TEST LOCAL original article');await waitFor(()=>evaluate(`!!document.querySelector('.article-card img')`),'public signed cover')
  await navigate('/informasi/test-local-original-article');await hasText('Synthetic local article text retained');await waitFor(()=>evaluate(`!!document.querySelector('.detail-cover[src]')`),'detail cover')
  report.interactions.push({test:'published-article-and-cover-appear-in-public-list-and-detail',passed:true})
  await navigate('/admin/artikel');await clickText('Arsipkan');await clickText('Konfirmasi arsip');await hasText('Pengarsipan artikel dikonfirmasi');await navigate('/informasi');await hasText('Belum ada artikel yang diterbitkan')
  report.interactions.push({test:'archive-withdraws-article-without-physical-delete',passed:true})
  assert.equal(requests.some(r=>r.method==='DELETE'),false)
  assert.equal(interceptErrors.length,0)
  report.status='PASS_LOCAL_NOT_LIVE';report.consoleErrors=errors;report.missingAssets=badAssets
  writeFileSync(path.join(output,'integrated-content-browser.json'),JSON.stringify(report,null,2))
}catch(error){report.status=harnessReady?'FAIL_LOCAL':'BLOCKED_HARNESS';report.failure=error.message;writeFileSync(path.join(output,'integrated-content-browser.json'),JSON.stringify(report,null,2));throw error}
finally{socket?.close();processHandle.kill();await server.close()}
