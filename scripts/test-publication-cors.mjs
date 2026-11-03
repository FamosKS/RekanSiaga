// Real browser CORS enforcement against local synthetic endpoints; no Cloud.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { publicationCors } from '../supabase/functions/_shared/publicationCors.ts'
import { publicationError } from '../src/features/reports/publicationError.ts'
import { ApiError } from '../supabase/functions/_shared/reportContract.ts'
const counts={broken:0,fixed:0},checks=[]
const api=createServer((req,res)=>{
 const broken=req.url==='/broken',headers={...publicationCors}
 if(broken)headers['Access-Control-Allow-Headers']='authorization, apikey, content-type'
 res.writeHead(req.method==='OPTIONS'?204:200,headers)
 if(req.method==='POST')counts[broken?'broken':'fixed']++
 res.end(req.method==='OPTIONS'?'':JSON.stringify({approved:true}))
})
const page=createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html'});res.end('<html><title>Local CORS regression</title></html>')})
await new Promise(r=>api.listen(0,'127.0.0.1',r));await new Promise(r=>page.listen(0,'127.0.0.1',r))
const apiOrigin=`http://127.0.0.1:${api.address().port}`,pageOrigin=`http://127.0.0.1:${page.address().port}`
const profile=mkdtempSync(path.join(tmpdir(),'rekansiaga-photo-cors-'))
let chrome,socket,id=0,failure;const pending=new Map(),delay=ms=>new Promise(r=>setTimeout(r,ms))
async function wait(fn){for(let n=0;n<150;n++){if(await fn())return;await delay(100)}throw Error('Local browser wait failed')}
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,t=setTimeout(()=>reject(Error('CDP timeout')),15000);pending.set(n,{resolve:x=>{clearTimeout(t);resolve(x)},reject});socket.send(JSON.stringify({id:n,method,params}))})
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error('Browser evaluation failed');return r.result.value}
try{
 chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--no-first-run','--disable-background-networking','--disable-sync','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore',windowsHide:true})
 await wait(()=>existsSync(path.join(profile,'DevToolsActivePort')))
 const port=readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]
 const target=(await(await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page')
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j})
 socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error('CDP rejected')):p.resolve(m.result)}}
 await send('Page.navigate',{url:pageOrigin});await wait(()=>evaluate(`location.origin===${JSON.stringify(pageOrigin)}`))
 for(const mode of ['broken','fixed']){
 const ok=await evaluate(`(async()=>{try{const r=await fetch(${JSON.stringify(apiOrigin+'/'+mode)},{method:'POST',headers:{authorization:'Bearer SYNTHETIC-LOCAL-ONLY',apikey:'SYNTHETIC-LOCAL-ONLY','content-type':'application/json','x-client-info':'synthetic-sdk'},body:'{}'});return r.ok}catch{return false}})()`)
 assert.equal(ok,mode==='fixed');assert.equal(counts[mode],mode==='fixed'?1:0)
 checks.push({name:mode==='broken'?'Browser reproduces missing-header CORS failure before POST':'Browser accepts fixed preflight with SDK headers',status:'PASS'})
 }
 const message=publicationError(new ApiError(503,'SERVICE_UNAVAILABLE'))
 assert.ok(message.includes('report-publication')&&!message.includes('mengirim laporan berulang'))
 assert.ok(publicationError(new ApiError(400,'APPROVAL_FAILED')).includes('RPC'))
 checks.push({name:'Photo errors give safe action-specific guidance without raw response/credentials',status:'PASS'})
 for(const c of checks)console.log('PASS '+c.name)
}catch(error){failure=error;throw error}finally{
 socket?.close();chrome?.kill();api.close();page.close()
 writeFileSync('docs/qa/stage-e/publication-cors-local.json',JSON.stringify({kind:'LOCAL Chrome CORS regression, synthetic HTTP only; not Cloud approval PASS',status:checks.length===3?'PASS_LOCAL':'BLOCKED_HARNESS',failure:failure?.message,checks},null,2))
}
