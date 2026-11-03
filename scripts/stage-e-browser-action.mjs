// Operate only the dedicated LIVE E browser. The primary runner still guards all writes.
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
const runLabel='TEST-E-20261101-a881d0',journalPath='docs/qa/stage-e/live/'+runLabel+'.json'
const arg=JSON.parse(process.argv[2]??(readFileSync(0,'utf8').trim()||'{"op":"status"}'))
let socket,ownedTargetId,seq=0;const pending=new Map(),delay=ms=>new Promise(r=>setTimeout(r,ms))
async function send(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{const t=setTimeout(()=>{pending.delete(id);reject(Error('Browser command timeout'))},20000);pending.set(id,{resolve:v=>{clearTimeout(t);resolve(v)},reject:e=>{clearTimeout(t);reject(e)}});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error('Browser action failed; private details suppressed');return r.result.value}
async function wait(fn,label){for(let n=0;n<100;n++){if(await fn())return;await delay(200)}throw Error('WAIT '+label)}
async function state(){return evaluate(`({documentId:(window.__rekansiagaLiveDoc??=crypto.randomUUID()),path:location.pathname,h1:document.querySelector('h1')?.textContent,loggedIn:!!document.querySelector('.admin-signout button:not([disabled])'),dialogs:document.querySelectorAll('dialog[open]').length,errors:[...document.querySelectorAll('.field-error,[role=alert]')].filter(e=>e.getClientRects().length).map(e=>e.textContent?.slice(0,240))})`)}
try{
 for(const name of readdirSync(tmpdir()).filter(n=>n.startsWith('rekansiaga-live-e-'))){const file=path.join(tmpdir(),name,'DevToolsActivePort');if(!existsSync(file))continue;try{const port=readFileSync(file,'utf8').split('\n')[0];const list=await(await fetch('http://127.0.0.1:'+port+'/json/list',{signal:AbortSignal.timeout(1500)})).json();const target=list.find(t=>t.type==='page'&&t.url.startsWith('http://localhost:5173/'));if(!target)continue;ownedTargetId=target.id;socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=()=>j(Error('Owned browser unavailable'))});break}catch{}}
 if(!socket)throw Error('Owned LIVE browser unavailable')
 socket.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error('Browser command rejected')):p.resolve(m.result)}}}
 if(arg.op==='watch'){
  await send('Page.enable');await send('Network.enable');socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Page.frameNavigated'&&!m.params.frame.parentId){const u=new URL(m.params.frame.url);console.log(JSON.stringify({event:'document-navigation',path:u.pathname}))}if(m.method==='Network.webSocketFrameReceived'){try{const d=JSON.parse(m.params.response.payloadData);if(['full-reload','update','connected'].includes(d.type))console.log(JSON.stringify({event:'vite',type:d.type,path:d.path??null}))}catch{}}});await delay(20000)
 }else if(arg.op==='focus-check'){
  const before=await state()
  await send('Emulation.setFocusEmulationEnabled',{enabled:false})
  const hasForm=await evaluate(`(()=>{const f=[...document.querySelectorAll('form')].find(f=>f.getClientRects().length);if(!f)return false;window.__liveFocus={doc:window.__rekansiagaLiveDoc,form:f,active:document.activeElement,selection:[document.activeElement?.selectionStart,document.activeElement?.selectionEnd],y:scrollY,fields:[...f.querySelectorAll('input,textarea,select')].filter(e=>e.type!=='hidden'&&e.getClientRects().length).map(e=>[e,e.value,e.checked]),dialog:document.querySelector('dialog[open] .rs-dialog__body')};window.__liveFocus.dialogY=window.__liveFocus.dialog?.scrollTop;return true})()`)
  if(!hasForm)throw Error('Visible form required for tab test')
  let second
  try{
   second=(await send('Target.createTarget',{url:'about:blank'})).targetId
   await send('Target.activateTarget',{targetId:second});await delay(500)
   const hidden=await evaluate('document.visibilityState')
   await send('Target.closeTarget',{targetId:second});second=undefined
   const window=await send('Browser.getWindowForTarget',{targetId:ownedTargetId})
   await send('Browser.setWindowBounds',{windowId:window.windowId,bounds:{windowState:'normal'}})
   await send('Target.activateTarget',{targetId:ownedTargetId});await send('Page.bringToFront');await delay(1500)
   const result=await evaluate(`(()=>{const x=window.__liveFocus;return {sameDocument:!!x&&window.__rekansiagaLiveDoc===x.doc,formConnected:!!x?.form?.isConnected,fieldsIntact:!!x&&x.fields.every(([e,v,c])=>e.isConnected&&e.value===v&&e.checked===c),scrollIntact:!!x&&Math.abs(scrollY-x.y)<=1&&(!x.dialog||x.dialog.scrollTop===x.dialogY),focusIntact:!!x&&document.activeElement===x.active&&JSON.stringify([x.active?.selectionStart,x.active?.selectionEnd])===JSON.stringify(x.selection),foreground:document.visibilityState}})()`)
   const record={kind:'LIVE tab switch; no mocked backend',path:before.path,label:arg.label,backgroundVisibility:hidden,...result,at:new Date().toISOString()}
   record.pass=hidden==='hidden'&&result.foreground==='visible'&&result.sameDocument&&result.formConnected&&result.fieldsIntact&&result.scrollIntact&&result.focusIntact
   record.status=record.pass?'PASS':result.foreground!=='visible'?'BLOCKED_BROWSER_FOREGROUND':'FAIL'
   const file='docs/qa/stage-e/live/'+runLabel+'-browser.json'
   const evidence=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];evidence.push(record);writeFileSync(file,JSON.stringify(evidence,null,2))
   console.log(JSON.stringify({op:arg.op,check:record}))
   if(!record.pass)throw Error(record.status==='FAIL'?'LIVE tab preservation failed':'Browser did not regain foreground; no input loss observed')
  }finally{if(second)await send('Target.closeTarget',{targetId:second});await send('Page.bringToFront');await evaluate('delete window.__liveFocus');await send('Emulation.setFocusEmulationEnabled',{enabled:true})}
 }else if(arg.op==='internal'){
  if(!arg.path?.startsWith('/')||arg.path.startsWith('//')||/[?#]/.test(arg.path))throw Error('Internal app routes only')
  const before=await state()
  const point=await evaluate(`(()=>{const a=[...document.querySelectorAll('a')].find(a=>a.getAttribute('href')===${JSON.stringify(arg.path)}&&a.getClientRects().length);if(!a)throw Error('Internal link unavailable');a.scrollIntoView({block:'center'});const r=a.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1})
  await wait(()=>evaluate(`location.pathname===${JSON.stringify(arg.path)}`),'internal route')
  const after=await state();const record={kind:'LIVE internal routing',from:before.path,to:after.path,sameDocument:before.documentId===after.documentId,at:new Date().toISOString()}
  const file='docs/qa/stage-e/live/'+runLabel+'-browser.json';const entries=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];entries.push(record);writeFileSync(file,JSON.stringify(entries,null,2));console.log(JSON.stringify({check:record}))
  if(!record.sameDocument)throw Error('Internal menu replaced the document')
 }else if(arg.op==='captcha-retry-check'){
  const before=await state()
  await wait(()=>evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Coba verifikasi lagi'&&b.getClientRects().length)`),'failed CAPTCHA retry action')
  await evaluate(`(()=>{const f=[...document.querySelectorAll('form')].find(f=>f.getClientRects().length);window.__captchaRetryCheck={form:f,fields:[...f.querySelectorAll('input,textarea,select')].filter(e=>e.type!=='hidden').map(e=>[e,e.value,e.checked])};[...f.querySelectorAll('button')].find(b=>b.textContent.trim()==='Coba verifikasi lagi').click()})()`)
  await delay(800)
  const result=await evaluate(`(()=>{const x=window.__captchaRetryCheck;return {formConnected:!!x?.form?.isConnected,fieldsIntact:!!x&&x.fields.every(([e,v,c])=>e.isConnected&&e.value===v&&e.checked===c)}})()`)
  const after=await state();const record={kind:'LIVE CAPTCHA retry preserves draft; not provider acceptance',path:before.path,sameDocument:before.documentId===after.documentId,...result,at:new Date().toISOString()}
  record.pass=record.sameDocument&&record.formConnected&&record.fieldsIntact
  const file='docs/qa/stage-e/live/'+runLabel+'-browser.json';const entries=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];entries.push(record);writeFileSync(file,JSON.stringify(entries,null,2));await evaluate('delete window.__captchaRetryCheck');console.log(JSON.stringify({check:record}));if(!record.pass)throw Error('CAPTCHA retry lost form state')
 }else if(arg.op==='operator-report-read'){
  if(arg.id!=='0f990f12-71d1-4a31-bad0-903eaf8dbb7d')throw Error('Only the operator-selected existing report may be read')
  const proof=await evaluate(`(async()=>{const {authorize}=await import('/src/features/admin/adminDataService.ts');const actor=await authorize('/admin/audit');const {supabase,publicSupabase}=await import('/src/lib/supabase.ts');const id=${JSON.stringify(arg.id)};const r=await supabase.from('public_reports').select('id,status,tracking_code,created_at,updated_at').eq('id',id).maybeSingle();if(r.error||!r.data)throw Error('Selected report unavailable');const h=await supabase.from('report_status_history').select('from_status,to_status,changed_at').eq('report_id',id).order('changed_at');if(h.error)throw Error('History unavailable');const audit=await supabase.from('audit_logs').select('id,action,actor_id,created_at').eq('entity_id',id);if(audit.error)throw Error('Audit unavailable');const anonymous=await publicSupabase.from('public_reports').select('id').eq('id',id);const code=r.data.tracking_code;return {id:r.data.id,status:r.data.status,codeFormat:/^RS-[A-F0-9]{16}$/.test(code)?'RS_HEX16':/^RPT-[A-Z0-9]+$/.test(code)?'RPT_LEGACY':'OTHER',createdAt:r.data.created_at,updatedAt:r.data.updated_at,history:h.data,audit:audit.data.map(r=>({id:r.id,action:r.action,actorMatches:r.actor_id===actor.userId,at:r.created_at})),anonymous:{http:anonymous.status,errorCode:anonymous.error?.code??null,visible:(anonymous.data??[]).length>0}}})()`)
  const record={kind:'Read-only operator-selected report; Flutter provenance reported by operator',...proof,at:new Date().toISOString()};writeFileSync('docs/qa/stage-e/live/'+runLabel+'-operator-existing-report.json',JSON.stringify(record,null,2));console.log(JSON.stringify({op:arg.op,proof:record}))
 }else if(arg.op==='operator-report-privacy'){
  const id='0f990f12-71d1-4a31-bad0-903eaf8dbb7d'
  const result=await evaluate(`(async()=>{const {publicSupabase}=await import('/src/lib/supabase.ts');const session=await publicSupabase.auth.getSession();const x=await publicSupabase.from('public_reports').select('description,location_description,reviewed_by,reviewed_at',{head:true,count:'exact'}).eq('id',${JSON.stringify(id)});return {publicClientSessionPresent:!!session.data.session,http:x.status,errorCode:x.error?.code??null,privateColumnRowCount:x.count,bodyRead:false}})()`)
  const record={kind:'Read-only HEAD permission check on operator-selected UUID; no private values fetched',id,...result,at:new Date().toISOString()};writeFileSync('docs/qa/stage-e/live/'+runLabel+'-operator-report-privacy.json',JSON.stringify(record,null,2));console.log(JSON.stringify(record))
 }else if(arg.op==='report-lookup'){
  const reports=await evaluate(`(async()=>{const {authorize}=await import('/src/features/admin/adminDataService.ts');await authorize('/admin/laporan');const {supabase}=await import('/src/lib/supabase.ts');const {data,error}=await supabase.from('public_reports').select('id,title,status,created_at,updated_at').in('title',${JSON.stringify([1,2].map(n=>`${runLabel} laporan ${n}`))});if(error)throw Error('Owned report lookup denied');return data})()`)
  console.log(JSON.stringify({op:arg.op,reports}))
 }else if(arg.op==='audit-owned'){
  const own=JSON.parse(readFileSync(journalPath,'utf8'));const ids=[...own.created,...own.reports].map(r=>r.id)
  const result=await evaluate(`(async()=>{const {authorize}=await import('/src/features/admin/adminDataService.ts');const actor=await authorize('/admin/audit');const {supabase}=await import('/src/lib/supabase.ts');const {data,error,status}=await supabase.from('audit_logs').select('id,entity_type,entity_id,action,actor_id,created_at').in('entity_id',${JSON.stringify(ids)}).order('created_at',{ascending:false}).limit(200);if(error)return {http:status,errorCode:error.code};return {http:status,rows:data.map(r=>({auditId:r.id,table:r.entity_type,entityId:r.entity_id,action:r.action,actorMatches:r.actor_id===actor.userId,at:r.created_at}))}})()`)
  writeFileSync('docs/qa/stage-e/live/'+runLabel+'-audit.json',JSON.stringify(result,null,2))
  console.log(JSON.stringify({op:arg.op,result}))
  if(result.http!==200)throw Error('Owned audit read failed')
 }else if(arg.op==='anonymous-owned'){
  const own=JSON.parse(readFileSync(journalPath,'utf8'));const ids=[...own.created,...own.reports].map(r=>({table:r.table??'public_reports',id:r.id}))
  const result=await evaluate(`(async()=>{const {publicSupabase}=await import('/src/lib/supabase.ts');const rows=[];for(const row of ${JSON.stringify(ids)}){const {data,error,status}=await publicSupabase.from(row.table).select('id').eq('id',row.id);rows.push({...row,http:status,errorCode:error?.code??null,visible:Array.isArray(data)&&data.some(r=>r.id===row.id)})}const audit=await publicSupabase.from('audit_logs').select('id').in('entity_id',${JSON.stringify(ids.map(r=>r.id))});return {rows,audit:{http:audit.status,errorCode:audit.error?.code??null,count:audit.data?.length??0}}})()`)
  const file='docs/qa/stage-e/live/'+runLabel+'-anonymous.json';const entries=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):[];entries.push({at:new Date().toISOString(),...result});writeFileSync(file,JSON.stringify(entries,null,2));console.log(JSON.stringify({op:arg.op,result}))
 }else if(arg.op==='form-info'){
  console.log(JSON.stringify({fields:await evaluate(`[...document.querySelectorAll('label')].filter(l=>l.getClientRects().length).map(l=>({label:l.textContent.trim(),type:document.getElementById(l.htmlFor)?.type,options:document.getElementById(l.htmlFor)?.tagName==='SELECT'?[...document.getElementById(l.htmlFor).options].map(o=>({label:o.textContent,value:o.value})):undefined}))`)}))
 }else if(arg.op==='close'){
  await evaluate(`document.querySelector('dialog[open] [aria-label="Tutup dialog"]')?.click()`)
  await wait(()=>evaluate(`!document.querySelector('dialog[open]')`),'editor closed')
 }else if(arg.op==='go'){
  if(!arg.path?.startsWith('/')||arg.path.startsWith('//')||/[?#]/.test(arg.path))throw Error('Local routes only')
  await send('Page.navigate',{url:'http://localhost:5173'+arg.path})
  await wait(async()=>{const s=await state();return s.path===arg.path&&s.h1&&(arg.path.startsWith('/admin')?s.loggedIn:true)},'exact route and verified staff')
 }else if(arg.op==='edit'){
  await wait(()=>evaluate(`!![...document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes(${JSON.stringify(runLabel)}))`),'owned TEST row')
  await evaluate(`(()=>{const rows=[...document.querySelectorAll('tbody tr')].filter(r=>r.textContent.includes(${JSON.stringify(runLabel)}));if(rows.length!==1)throw Error('Ambiguous own row');const b=[...rows[0].querySelectorAll('button')].find(b=>b.textContent==='Edit');if(!b)throw Error('Edit unavailable');b.click()})()`)
  await wait(()=>evaluate(`!!document.querySelector('dialog[open] form')`),'visible editor')
 }else if(arg.op==='fill'){
  const label=JSON.stringify(arg.label)
  await wait(()=>evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(l=>l.textContent.trim()===${label}&&l.getClientRects().length);const e=l&&document.getElementById(l.htmlFor);return !!e&&!e.disabled&&e.getClientRects().length>0})()`),'visible field '+arg.label)
  const text=await evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(l=>l.textContent.trim()===${label}&&l.getClientRects().length);const e=document.getElementById(l.htmlFor);if(e.type==='password')throw Error('Credentials must be operator-entered');if(e.tagName==='TEXTAREA'||e.tagName==='INPUT'&&['text','url','search','tel'].includes(e.type)){e.focus();e.select();return true}Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(arg.value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return false})()`)
  if(text)await send('Input.insertText',{text:arg.value})
 }else if(arg.op==='click'){
  await wait(()=>evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(arg.text)}&&!b.disabled&&b.getClientRects().length)`),'visible action')
  await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(arg.text)}&&!b.disabled&&b.getClientRects().length).click()`)
 }else if(arg.op==='checked'){
  await evaluate(`(()=>{const l=[...document.querySelectorAll('dialog[open] label')].find(e=>e.textContent.trim()===${JSON.stringify(arg.label)});const e=l?.querySelector('input[type=checkbox]');if(!e)throw Error('Checkbox unavailable');if(e.checked!==${!!arg.value})e.click()})()`)
 }else if(arg.op==='save'){
  const before=JSON.parse(readFileSync(journalPath,'utf8')).steps.filter(s=>['create','update'].includes(s.kind)).length
  await evaluate(`(()=>{const b=[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.trim()==='Simpan ke dev'&&!b.disabled);if(!b)throw Error('Save unavailable');b.click()})()`)
  await wait(async()=>{const j=JSON.parse(readFileSync(journalPath,'utf8'));return j.steps.filter(s=>['create','update'].includes(s.kind)).length>before||(await state()).errors.length>0},'server representation or form errors')
  await delay(500);if((await state()).errors.length)throw Error('LIVE form validation/server rejection')
 }else if(arg.op==='expect')await wait(()=>evaluate(`document.querySelector('main')?.textContent.includes(${JSON.stringify(arg.text)})`),'TEST content')
 else if(arg.op!=='status')throw Error('Unknown action')
 console.log(JSON.stringify({op:arg.op,result:await state()}))
}catch(error){console.log(JSON.stringify({op:arg.op,error:error.message,state:socket?await state().catch(()=>null):null}));process.exitCode=1}
finally{socket?.close()}
