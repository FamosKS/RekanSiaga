// Normal-browser CAPTCHA stays with the operator. This tool uses the existing
// Admin UI/RPC in a separately guarded tab of the dedicated QA browser only.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const runLabel='TEST-E-20261101-a881d0',projectRef='uiuiouosblyuqgnvfpeh'
const origin='http://localhost:5173',cloud=`https://${projectRef}.supabase.co`
const file=`docs/qa/stage-e/live/${runLabel}-reports.json`
const base=JSON.parse(readFileSync(`docs/qa/stage-e/live/${runLabel}.json`,'utf8'))
if(base.projectRef!==projectRef||base.created.length!==9||base.reports.length||base.steps.some(s=>s.kind==='submit'))throw Error('Reconcile scope before operator-report continuation')
const arg=JSON.parse(readFileSync(0,'utf8'))
if(!['lookup','review','audit'].includes(arg.op))throw Error('Supported operations: lookup, review, audit')
if(arg.op==='review'&&!(arg.index===1&&['under_review','rejected'].includes(arg.status)||arg.index===2&&arg.status==='verified'))throw Error('Outside approved two-report transitions')
const journal=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{projectRef,runLabel,kind:'LIVE operator CAPTCHA plus guarded Admin UI; no mocks',reports:[],steps:[],blocked:[],physicalDeletes:0,securityChanges:0}
if(journal.projectRef!==projectRef||journal.runLabel!==runLabel||journal.reports.length>2)throw Error('Operator report journal mismatch')
const save=()=>writeFileSync(file,JSON.stringify(journal,null,2))
const delay=ms=>new Promise(r=>setTimeout(r,ms))
let socket,parentSocket,targetId,port,seq=0,reviewId,rpcResult,uncertain=false
const pending=new Map(),responses=new Map(),rpcIds=new Set()
function send(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser command timed out'))},20000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value)},reject});socket.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error('Application operation failed; private details suppressed');return r.result.value}
async function wait(fn,label){for(let n=0;n<120;n++){if(await fn())return;await delay(200)}throw Error('WAIT '+label)}
async function connect(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=()=>j(Error('Dedicated QA browser unavailable'))});return ws}
function bind(ws){ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error('Browser operation rejected')):p.resolve(m.result)}return}
 if(m.method==='Fetch.requestPaused')void guard(m.params).catch(()=>{uncertain=true;journal.steps.push({kind:'GUARD_ERROR',at:new Date().toISOString()});save()})
 if(m.method==='Network.responseReceived'&&rpcIds.has(m.params.requestId))responses.set(m.params.requestId,m.params.response.status)
 if(m.method==='Network.loadingFinished'&&rpcIds.has(m.params.requestId))void capture(m.params.requestId)
 if(m.method==='Network.loadingFailed'&&rpcIds.has(m.params.requestId)){uncertain=true;journal.steps.push({kind:'RECONCILIATION_REQUIRED',id:reviewId,at:new Date().toISOString()});save()}
}}
async function guard({requestId,networkId,request}){
 const url=new URL(request.url),method=request.method
 let allowed=url.origin!==cloud&&!url.hostname.endsWith('.supabase.co')
 if(url.origin===cloud){
  allowed=['GET','HEAD','OPTIONS'].includes(method)||url.pathname.startsWith('/auth/v1/')
  if(!allowed&&arg.op==='review'&&!uncertain&&method==='POST'&&url.pathname==='/rest/v1/rpc/review_public_report'){
   let p;try{p=JSON.parse(request.postData)}catch{ /* reject malformed payload */ }
   allowed=reviewId&&p?.p_report_id===reviewId&&p.p_new_status===arg.status&&p.p_reason===`${runLabel} SIMULASI E: ${arg.status}; data uji tanpa identitas pribadi.`&&!journal.steps.some(s=>s.kind==='review-attempt'&&s.id===reviewId&&s.status===arg.status)
   if(allowed){rpcIds.add(networkId??requestId);journal.steps.push({kind:'review-attempt',id:reviewId,index:arg.index,status:arg.status,at:new Date().toISOString()});save()}
  }
 }
 if(!allowed){journal.blocked.push({method,path:url.pathname,at:new Date().toISOString()});save()}
 await send(allowed?'Fetch.continueRequest':'Fetch.failRequest',allowed?{requestId}:{requestId,errorReason:'BlockedByClient'})
}
async function capture(requestId){
 try{const r=await send('Network.getResponseBody',{requestId});const value=JSON.parse(r.base64Encoded?Buffer.from(r.body,'base64').toString('utf8'):r.body);rpcResult={kind:'review',id:reviewId,index:arg.index,status:arg.status,http:responses.get(requestId),confirmed:value===true,at:new Date().toISOString()};journal.steps.push(rpcResult);save()}catch{uncertain=true;journal.steps.push({kind:'RECONCILIATION_REQUIRED',id:reviewId,at:new Date().toISOString()});save()}
}
async function fill(label,value){
 await wait(()=>evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});const e=l&&document.getElementById(l.htmlFor);return !!e&&!e.disabled})()`),'review field')
 const text=await evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});const e=document.getElementById(l.htmlFor);if(e.tagName==='TEXTAREA'){e.focus();e.select();return true}Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('change',{bubbles:true}));return false})()`)
 if(text)await send('Input.insertText',{text:value})
}
async function click(text){await wait(()=>evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled&&b.getClientRects().length)`),'review action');await evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled&&b.getClientRects().length).click()`)}
try{
 let parent
 for(const name of readdirSync(tmpdir()).filter(n=>n.startsWith('rekansiaga-live-e-'))){const active=path.join(tmpdir(),name,'DevToolsActivePort');if(!existsSync(active))continue;try{const p=readFileSync(active,'utf8').split('\n')[0];const list=await(await fetch(`http://127.0.0.1:${p}/json/list`,{signal:AbortSignal.timeout(1500)})).json();const t=list.find(t=>t.type==='page'&&t.url.startsWith(origin+'/'));if(t){parent=t;port=p;break}}catch{}}
 if(!parent)throw Error('Dedicated QA browser session required')
 socket=await connect(parent.webSocketDebuggerUrl);parentSocket=socket;bind(socket)
 targetId=(await send('Target.createTarget',{url:'about:blank'})).targetId
 const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()
 socket=await connect(targets.find(t=>t.id===targetId).webSocketDebuggerUrl);bind(socket)
 await send('Page.enable');await send('Network.enable');await send('Fetch.enable',{patterns:[{urlPattern:'https://*.supabase.co/*',requestStage:'Request'}]})
 await send('Page.navigate',{url:origin+'/admin/laporan'})
 await wait(()=>evaluate(`location.pathname==='/admin/laporan'&&!!document.querySelector('.admin-signout button:not([disabled])')`),'verified existing staff session')
 const rows=await evaluate(`(async()=>{const {authorize}=await import('/src/features/admin/adminDataService.ts');await authorize('/admin/laporan');const {supabase}=await import('/src/lib/supabase.ts');const {data,error}=await supabase.from('public_reports').select('id,title,status,created_at,updated_at').in('title',${JSON.stringify([1,2].map(n=>`${runLabel} laporan ${n}`))});if(error)throw Error('Lookup denied');return data})()`)
 for(const index of [1,2]){
  const matches=rows.filter(r=>r.title===`${runLabel} laporan ${index}`)
  if(matches.length>1)throw Error('Duplicate report label: reconcile without new submissions')
  if(matches.length===1){const r=matches[0];const previous=journal.reports.find(x=>x.index===index);if(previous&&previous.id!==r.id)throw Error('Registered report identity changed');if(!previous)journal.reports.push({index,id:r.id,title:r.title});journal.steps.push({kind:'staff-read',index,id:r.id,status:r.status,updatedAt:r.updated_at,at:new Date().toISOString()})}
 }
 save()
 if(arg.op==='review'){
  const row=rows.find(r=>r.title===`${runLabel} laporan ${arg.index}`);if(!row)throw Error('Operator TEST report not yet available')
  reviewId=row.id
  if(row.status===arg.status){console.log(JSON.stringify({alreadyAtRequestedStatus:true,id:reviewId,status:row.status,noReplay:true}))}
  else{
   if(!['unverified','under_review'].includes(row.status)||row.status==='under_review'&&arg.status==='under_review')throw Error('Invalid existing transition')
   await send('Page.navigate',{url:origin+'/admin/laporan/'+reviewId})
   await fill('Status baru',arg.status);await fill('Alasan pemeriksaan',`${runLabel} SIMULASI E: ${arg.status}; data uji tanpa identitas pribadi.`)
   await click('Tinjau keputusan');await click('Terapkan keputusan')
   await wait(()=>rpcResult||uncertain,'actual review RPC response')
   if(uncertain||rpcResult?.http!==200||!rpcResult?.confirmed)throw Error('Review not confirmed; no automatic retry')
   console.log(JSON.stringify(rpcResult))
  }
 }
 if(arg.op==='audit'||arg.op==='review'){
  const ids=journal.reports.map(r=>r.id)
  const proof=await evaluate(`(async()=>{const {authorize}=await import('/src/features/admin/adminDataService.ts');const actor=await authorize('/admin/audit');const {getReport}=await import('/src/features/reports/adminReportService.ts');const {supabase,publicSupabase}=await import('/src/lib/supabase.ts');const reports=[];for(const id of ${JSON.stringify(ids)}){const x=await getReport(id);reports.push({id,status:x.report?.status,history:x.history.map(h=>({from:h.from_status,to:h.to_status,at:h.changed_at,actorMatches:h.changed_by===null||h.changed_by===actor.userId})),attachments:x.attachments.length});const a=await publicSupabase.from('public_reports').select('id').eq('id',id);reports.at(-1).anonymous={http:a.status,visible:(a.data??[]).length>0,errorCode:a.error?.code??null}}const a=await supabase.from('audit_logs').select('id,entity_type,entity_id,action,actor_id,created_at').in('entity_id',${JSON.stringify(ids)});if(a.error)throw Error('Audit denied');return {reports,audit:a.data.map(r=>({id:r.id,entityId:r.entity_id,table:r.entity_type,action:r.action,actorMatches:r.actor_id===actor.userId,at:r.created_at}))}})()`)
  journal.steps.push({kind:'report-history-audit',...proof,at:new Date().toISOString()});save();console.log(JSON.stringify(proof))
 }
 console.log(JSON.stringify({operation:arg.op,reports:journal.reports,blocked:journal.blocked.length,uncertain}))
}catch(error){console.log(JSON.stringify({error:error.message,privateDetails:'suppressed'}));process.exitCode=1}
finally{if(socket&&socket!==parentSocket)socket.close();if(parentSocket){socket=parentSocket;if(targetId)await send('Target.closeTarget',{targetId}).catch(()=>{});parentSocket.close()}}
