// Approved LIVE E runner. No mocks, credential output, physical DELETE or security changes.
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { createServer, loadEnv } from 'vite'

const projectRef='uiuiouosblyuqgnvfpeh', cloud=`https://${projectRef}.supabase.co`, origin='http://localhost:5173'
const env=loadEnv('development',process.cwd(),'VITE_')
if(env.VITE_SUPABASE_URL!==cloud||env.VITE_DEV_REMOTE_WRITES_APPROVED==='true'||env.VITE_DEV_CONTENT_WRITES_ENABLED!=='true')throw Error('Approved dev content scope required; values suppressed')
const output=path.resolve('docs/qa/stage-e/live');mkdirSync(output,{recursive:true})
const resumeArg=process.argv.indexOf('--resume')
const resumePath=resumeArg<0?null:path.resolve(process.argv[resumeArg+1]??'')
if(resumePath&&path.dirname(resumePath)!==output)throw Error('Resume requires an existing journal in the LIVE evidence directory')
const previous=resumePath?JSON.parse(readFileSync(resumePath,'utf8')):null
if(previous&&(previous.projectRef!==projectRef||!/^TEST-E-20261101-[a-f0-9]{6}$/.test(previous.runLabel)||previous.created.length>9||previous.reports.length||previous.steps.some(s=>s.kind==='submit')||previous.securityChanges||previous.physicalDeletes||['RECONCILIATION_REQUIRED','CAPTURE_ERROR','REQUEST_GUARD_ERROR'].includes(previous.status)))throw Error('Unsafe resume; reconcile manually without replaying writes')
const runLabel=previous?.runLabel??('TEST-E-20261101-'+crypto.randomUUID().slice(0,6))
const journal=previous??{kind:'LIVE Supabase E, approved 2026-11-01; no mocks',projectRef,runLabel,approval:'User approved full stage-e-complete.md scope; max 2 reports / 9 content rows; logical cleanup only',status:'AWAITING_STAFF_LOGIN',created:[],reports:[],steps:[],http:[],blocked:[],features:{},securityChanges:0,physicalDeletes:0}
const journalPath=path.join(output,runLabel+'.json')
const caps={articles:1,disaster_events:1,event_updates:1,event_locations:1,emergency_contacts:1,mitigation_guides:1,mitigation_checklist_items:1,relief_locations:1,data_sources:1}
const attempts=new Map(), owned=new Map(), receipts=new Map(), sources=[]
for(const row of journal.created){
 if(!(row.table in caps)||!/^[a-f\d-]{36}$/.test(row.id))throw Error('Invalid owned record in resume journal')
 if(!owned.has(row.table))owned.set(row.table,new Set())
 owned.get(row.table).add(row.id);attempts.set(row.table,(attempts.get(row.table)??0)+1)
 if(attempts.get(row.table)>caps[row.table])throw Error('Existing record cap exceeded')
}
if(previous){journal.status='RESUMING_STAFF_SESSION';journal.steps.push({kind:'resume',createdRetained:journal.created.length,at:new Date().toISOString()})}
let submitAttempts=0,trackAttempts=0,actorId,activeIndex,uncertain=false,ownServer,chromeProcess,socket,nextId=0
const pending=new Map(),network=new Map(),mutations=new Map(),roles=new Set()
function persist(){writeFileSync(journalPath,JSON.stringify(journal,null,2))}
function out(value){console.log(JSON.stringify(value))}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function waitFor(fn,label,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){if(await fn())return;await delay(150)}throw Error('WAIT: '+label)}
function send(method,params={}){const id=++nextId;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method))},20000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(response.exceptionDetails)throw Error('Browser evaluation failed; details suppressed');return response.result.value}
function safeError(error){return String(error?.message??'Operation failed').replace(/Bearer\s+\S+|eyJ[\w.-]+|sb_(?:secret|publishable)_[\w-]+/g,'[suppressed]').slice(0,220)}
async function fill(label,value,privateInput=false){
 await waitFor(()=>evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});const e=l&&document.getElementById(l.htmlFor);return !!e&&!e.disabled})()`),'field '+label)
 const mode=await evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});const e=document.getElementById(l.htmlFor);if(e.type==='password'&&!${privateInput})return 'blocked';if(e.tagName==='TEXTAREA'||e.tagName==='INPUT'&&['text','search','url','tel','password'].includes(e.type)){e.focus();e.select();return 'text'}return 'select'})()`)
 if(mode==='blocked')throw Error('Login credentials must be entered by operator, not runner')
 if(mode==='text')await send('Input.insertText',{text:value})
 else await evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});const e=document.getElementById(l.htmlFor);Object.getOwnPropertyDescriptor(e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`)
}
async function click(text){await waitFor(()=>evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&e.getClientRects().length);return !!b&&!b.disabled})()`),'enabled action '+text);await evaluate(`[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&e.getClientRects().length).click()`);await delay(200)}
async function go(route){if(!route.startsWith('/')||route.startsWith('//')||route.includes('?')||route.includes('#'))throw Error('Local app routes only');await send('Page.navigate',{url:origin+route});await waitFor(()=>evaluate(`location.pathname===${JSON.stringify(route)}&&document.readyState==='complete'&&!!document.querySelector('h1')`),'exact route ready')}
async function status(){return evaluate(`({path:location.pathname,loggedIn:!!document.querySelector('.admin-signout button:not([disabled])'),staffMenus:[...document.querySelectorAll('.admin-sidebar nav a')].map(a=>new URL(a.href).pathname),captchaReady:[...document.querySelectorAll('form button[type=submit]')].some(b=>!b.disabled),openDialogs:document.querySelectorAll('dialog[open]').length})`)}
function idFilter(url){const filter=url.searchParams.get('id')??'';return filter.startsWith('eq.')?filter.slice(3):null}
async function guard(message){
 const {requestId,request}=message.params,url=new URL(request.url),method=request.method
 if(url.hostname.endsWith('.supabase.co')&&url.origin!==cloud){journal.blocked.push({reason:'NON_DEV_PROJECT',method});persist();await send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});return}
 if(url.origin!==cloud){await send('Fetch.continueRequest',{requestId});return}
 if(method==='GET'||method==='OPTIONS'||method==='HEAD'||url.pathname.startsWith('/auth/v1/')){await send('Fetch.continueRequest',{requestId});return}
 let allowed=false,meta
 try{
  if(uncertain)throw Error('Uncertain operation requires reconciliation')
  const input=JSON.parse(request.postData??'{}')
  if(method==='POST'&&url.pathname==='/functions/v1/report-gateway'){
   if(input.action==='submit'){
    const match=/^TEST-E-20261101-[a-f0-9]{6} laporan ([12])$/.exec(input.title??'')
    allowed=!!match&&input.title.startsWith(runLabel+' ')&&!receipts.has(Number(match[1]))&&submitAttempts<2&&!input.photo&&input.privacy===true
    if(allowed){submitAttempts++;meta={kind:'submit',index:Number(match[1])}}
   }else if(input.action==='track'){
    allowed=trackAttempts<10&&[...receipts.values()].some(r=>r.code===input.tracking_code&&r.token===input.access_token)
    if(allowed){trackAttempts++;meta={kind:'track',index:activeIndex}}
   }
  }else if(method==='POST'&&url.pathname==='/rest/v1/rpc/review_public_report'){
   allowed=journal.reports.some(r=>r.id===input.p_report_id)&&['under_review','verified','rejected'].includes(input.p_new_status)&&typeof input.p_reason==='string'&&input.p_reason.startsWith(runLabel)
   if(allowed)meta={kind:'review',id:input.p_report_id,newStatus:input.p_new_status}
  }else if(url.pathname.startsWith('/rest/v1/')&&!url.pathname.includes('/rpc/')&&method!=='DELETE'){
   const table=url.pathname.split('/').at(-1)
   if(table in caps&&method==='POST'&&!Array.isArray(input)){
    const label=input.title??input.organization_name??input.name??input.instruction??input.description??input.label??''
    const count=attempts.get(table)??0
    allowed=typeof label==='string'&&label.startsWith(runLabel)&&count<caps[table]&&[...attempts.values()].reduce((a,b)=>a+b,0)<9
    if(table==='event_updates'||table==='event_locations')allowed&&=owned.get('disaster_events')?.has(input.event_id)===true
    if(table==='mitigation_checklist_items')allowed&&=owned.get('mitigation_guides')?.has(input.guide_id)===true
    if(allowed){attempts.set(table,count+1);meta={kind:'create',table}}
   }else if(table in caps&&method==='PATCH'){
    const id=idFilter(url);allowed=!!id&&owned.get(table)?.has(id)===true
    if(allowed)meta={kind:'update',table,id}
   }
  }
 }catch{allowed=false}
 if(!allowed){journal.blocked.push({method,path:url.pathname,reason:'OUTSIDE_APPROVED_SCOPE_OR_LIMIT'});persist();await send('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});return}
 mutations.set(message.params.networkId??requestId,meta);await send('Fetch.continueRequest',{requestId})
}
async function capture(requestId,info){
 const url=new URL(info.url),meta=mutations.get(requestId),table=url.pathname.split('/').at(-1)
 if(url.origin!==cloud)return
 if(info.status>=400&&meta){journal.http.push({kind:meta.kind,table:meta.table??null,status:info.status});journal.status='LIVE_OPERATION_FAILED';persist();return}
 const interesting=meta||table==='data_sources'||table==='roles'||table==='audit_logs'||url.pathname==='/auth/v1/user'
 if(!interesting)return
 let body
 try{const response=await send('Network.getResponseBody',{requestId});body=JSON.parse(response.base64Encoded?Buffer.from(response.body,'base64').toString('utf8'):response.body)}catch{if(meta){uncertain=true;journal.status='RECONCILIATION_REQUIRED';persist()}return}
 if(url.pathname==='/auth/v1/user'){if(info.status===200&&typeof body?.id==='string')actorId=body.id;return}
 if(table==='roles'&&Array.isArray(body)){body.forEach(r=>roles.add(r.code));return}
 if(table==='data_sources'&&Array.isArray(body)){for(const row of body)if(row.id&&!sources.includes(row.id))sources.push(row.id)}
 if(table==='audit_logs'&&Array.isArray(body)){
  const ids=new Set([...journal.created.map(r=>r.id),...journal.reports.map(r=>r.id)])
  for(const row of body)if(ids.has(row.entity_id)&&!journal.steps.some(s=>s.auditId===row.id))journal.steps.push({kind:'audit',auditId:row.id,entityId:row.entity_id,table:row.entity_type,action:row.action,actorMatches:row.actor_id===actorId,at:row.created_at})
  persist()
 }
 if(!meta)return
 if(meta.kind==='submit'){
  if(info.status!==201||!/^RS-[A-F\d]{16}$/.test(body?.tracking_code??'')||!/^[a-f\d]{64}$/.test(body?.access_token??'')){uncertain=true;journal.status='RECONCILIATION_REQUIRED'}
  else{receipts.set(meta.index,{code:body.tracking_code,token:body.access_token});journal.steps.push({kind:'submit',index:meta.index,http:201,at:new Date().toISOString()})}
 }else if(meta.kind==='track'){
  const privateFields=['description','location_description','reviewed_by','reason','access_token','captcha_token']
  const privacyOk=privateFields.every(key=>!(key in body))&&Array.isArray(body.history)&&body.history.every(row=>Object.keys(row).every(key=>['status','changed_at'].includes(key)))
  journal.steps.push({kind:'track',index:meta.index,http:info.status,status:body.status,historyStatuses:body.history?.map(row=>row.status),privacyOk,at:new Date().toISOString()})
 }else if(meta.kind==='review')journal.steps.push({kind:'review',id:meta.id,status:meta.newStatus,http:info.status,confirmed:body===true,at:new Date().toISOString()})
 else{
  const row=Array.isArray(body)?body[0]:body
  if(!row?.id){uncertain=true;journal.status='RECONCILIATION_REQUIRED'}
  else{
   if(meta.kind==='create'){if(!owned.has(meta.table))owned.set(meta.table,new Set());owned.get(meta.table).add(row.id);journal.created.push({table:meta.table,id:row.id})}
   journal.steps.push({kind:meta.kind,table:meta.table,id:row.id,http:info.status,version:row.updated_at??null,publicationStatus:row.publication_status??null,verificationStatus:row.verification_status??null,active:row.is_active??null,publishedAt:row.published_at??null,at:new Date().toISOString()})
  }
 }
 journal.status=uncertain?'RECONCILIATION_REQUIRED':'LIVE_IN_PROGRESS';persist()
}
async function command(input){
 const {op}=input
 if(op==='status')return {...await status(),roles:[...roles],receiptCount:receipts.size,created:journal.created,reportIds:journal.reports,uncertain}
 if(op==='go'){await go(input.path);return status()}
 if(op==='fill'){if(typeof input.value!=='string'||input.value.length>20000)throw Error('Invalid field value');await fill(input.label,input.value);return {filled:input.label}}
 if(op==='click'){await click(input.text);return {clicked:input.text,...await status()}}
 if(op==='expect'){await waitFor(()=>evaluate(`document.querySelector('main')?.textContent.includes(${JSON.stringify(input.text)})`),'expected TEST content');return {visible:true}}
 if(op==='public-ui-check'){
  if(!input.text?.startsWith(runLabel))throw Error('Only synthetic run markers can be checked')
  const current=await status();if(current.path!==input.path||current.path.startsWith('/admin'))throw Error('Public route required')
  await waitFor(()=>evaluate(`document.querySelector('main')?.textContent.includes(${JSON.stringify(input.text)})===${input.visible!==false}`),'public UI visibility')
  const result={kind:'public-ui-check',path:current.path,text:input.text,visible:input.visible!==false,at:new Date().toISOString()};journal.steps.push(result);persist();return result
 }
 if(op==='set-checked'){await evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.includes(${JSON.stringify(input.label)}));const e=l?.querySelector('input[type=checkbox]');if(!e)throw Error('checkbox missing');if(e.checked!==${!!input.value})e.click()})()`);return {checked:input.label,value:!!input.value}}
 if(op==='choose-source'){if(!sources.length)throw Error('No existing source visible');await fill('Sumber data',sources[0]);return {sourceSelected:true}}
 if(op==='own'){return {created:journal.created,reports:journal.reports,steps:journal.steps,blocked:journal.blocked,uncertain}}
 if(op==='report-fill'){
  const index=input.index;if(![1,2].includes(index))throw Error('Report index 1 or 2 required');activeIndex=index;await go('/laporan')
  await fill('Jenis kejadian','Lainnya');await fill('Judul laporan',`${runLabel} laporan ${index}`);await fill('Deskripsi kejadian',`${runLabel} SIMULASI integrasi development, bukan kejadian nyata dan tanpa identitas pribadi.`)
  for(const label of ['Provinsi','Kabupaten / Kota','Kecamatan','Desa / Kelurahan']){
   await waitFor(()=>evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});const e=l&&document.getElementById(l.htmlFor);return !!e&&!e.disabled&&e.options.length>1})()`),'region '+label)
   const id=await evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});return document.getElementById(l.htmlFor).options[1].value})()`);await fill(label,id)
  }
  await fill('Alamat atau koordinat kejadian',`${runLabel} lokasi simulasi tanpa alamat pribadi`)
  await command({op:'set-checked',label:'Saya memahami penggunaan data',value:true});return {reportPrepared:index,operatorCaptcha:!(await status()).captchaReady}
 }
 if(op==='submit'){activeIndex=input.index;await click('Kirim laporan');await waitFor(()=>receipts.has(input.index)||uncertain,'submit201 receipt',30000);return {receiptReceived:receipts.has(input.index),index:input.index,uncertain}}
 if(op==='find-report'){
  const receipt=receipts.get(input.index);if(!receipt)throw Error('Receipt unavailable; never retry uncertain submit');await go('/admin/laporan');await fill('Cari kode laporan',receipt.code)
  const suffix=await evaluate(`new Promise(resolve=>{const end=Date.now()+15000;const timer=setInterval(()=>{const a=[...document.querySelectorAll('a')].find(a=>a.textContent.trim()===${JSON.stringify(receipt.code)}&&/^\/admin\/laporan\/[^/]+$/.test(new URL(a.href).pathname));if(a){clearInterval(timer);resolve(new URL(a.href).pathname.split('/').at(-1))}else if(Date.now()>end){clearInterval(timer);resolve(null)}},150)})`)
  if(!/^[a-f\d-]{36}$/.test(suffix??''))throw Error('Own report not reconciled in Admin list')
  if(!journal.reports.some(r=>r.id===suffix))journal.reports.push({index:input.index,id:suffix});persist();await go('/admin/laporan/'+suffix);return {index:input.index,id:suffix}
 }
 if(op==='track'){
  activeIndex=input.index;const receipt=receipts.get(input.index);if(!receipt)throw Error('Receipt unavailable')
  await go('/laporan/lacak');await fill('Kode pelacakan',receipt.code);await fill('Token akses pribadi',receipt.token,true)
  return {trackingPrepared:input.index,operatorCaptcha:!(await status()).captchaReady}
 }
 if(op==='public-own'){
  const allowed=journal.created.find(r=>r.table===input.table);if(!allowed)throw Error('Only current run owned ID may be read')
  const filters={articles:'publication_status=eq.published&published_at=not.is.null',disaster_events:'published_at=not.is.null&verification_status=in.(source_confirmed,staff_verified)',emergency_contacts:'is_verified=eq.true&is_active=eq.true',mitigation_guides:'publication_status=eq.published',relief_locations:'verification_status=eq.verified'}
  if(!(input.table in filters))throw Error('Public content table required')
  const response=await fetch(`${cloud}/rest/v1/${input.table}?select=id&id=eq.${allowed.id}&${filters[input.table]}`,{method:'GET',headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY,Authorization:`Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000)})
  const data=await response.json(),result={kind:'public-owned-read',table:input.table,id:allowed.id,http:response.status,visible:Array.isArray(data)&&data.some(r=>r.id===allowed.id),at:new Date().toISOString()};journal.steps.push(result);persist();return result
 }
 if(op==='finish'){journal.status=input.status??'OPERATOR_ACTION_REQUIRED';persist();return {saved:true,path:path.relative(process.cwd(),journalPath)}}
 throw Error('Unknown command')
}

persist()
try{
 let reachable=false;try{reachable=(await fetch(origin+'/admin/login',{signal:AbortSignal.timeout(2000)})).ok}catch{ /* start app */ }
 if(!reachable){ownServer=await createServer({cacheDir:'.tools/stage-e-live-vite-cache',server:{host:'localhost',port:5173,strictPort:true}});await ownServer.listen()}
 const chrome='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';if(!existsSync(chrome))throw Error('Chrome unavailable')
 const profile=mkdtempSync(path.join(tmpdir(),'rekansiaga-live-e-'))
 chromeProcess=spawn(chrome,['--no-first-run','--no-default-browser-check','--disable-sync','--disable-extensions','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--new-window','about:blank'],{stdio:'ignore',windowsHide:false})
 await waitFor(()=>existsSync(path.join(profile,'DevToolsActivePort')),'interactive Chrome')
 const port=readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0],targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()
 socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl)
 await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',()=>reject(Error('Browser connection unavailable')),{once:true})})
 socket.addEventListener('message',event=>{
  const message=JSON.parse(event.data)
  if(message.id){const entry=pending.get(message.id);if(entry){pending.delete(message.id);message.error?entry.reject(Error('CDP operation failed')):entry.resolve(message.result)}return}
  if(message.method==='Fetch.requestPaused')void guard(message).catch(()=>{journal.status='REQUEST_GUARD_ERROR';persist()})
  if(message.method==='Network.responseReceived')network.set(message.params.requestId,{url:message.params.response.url,status:message.params.response.status})
  if(message.method==='Network.loadingFinished'){const info=network.get(message.params.requestId);if(info){network.delete(message.params.requestId);void capture(message.params.requestId,info).catch(()=>{journal.status='CAPTURE_ERROR';persist()})}}
  if(message.method==='Network.loadingFailed'&&mutations.has(message.params.requestId)){uncertain=true;journal.status='RECONCILIATION_REQUIRED';persist()}
 })
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:'https://*.supabase.co/*',requestStage:'Request'}]})
 await go('/admin/login');await send('Page.bringToFront');out({ready:true,runLabel,operator:'Login to existing rekansiaga-dev Super Admin in the new Chrome window. Never enter credentials into chat.',journal:path.relative(process.cwd(),journalPath)})
 const input=readline.createInterface({input:process.stdin,terminal:false});let queue=Promise.resolve()
 input.on('line',line=>{queue=queue.then(async()=>{try{const request=JSON.parse(line);out({command:request.op,result:await command(request)})}catch(error){out({error:safeError(error),credentials:'suppressed'})}})})
 await new Promise(resolve=>input.on('close',resolve));await queue
}catch(error){journal.status='RUNNER_BLOCKED';persist();out({error:safeError(error),journal:path.relative(process.cwd(),journalPath)});process.exitCode=1}
finally{socket?.close();chromeProcess?.kill();await ownServer?.close()}
