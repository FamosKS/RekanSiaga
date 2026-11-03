// Isolated local component browser test. Synthetic receipt, no Cloud/CAPTCHA calls.
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
const profile=mkdtempSync(path.join(tmpdir(),'rekansiaga-single-ui-'))
const html='.tools/single-tracking-qa.html',entry='.tools/single-tracking-qa.tsx',port=5191
writeFileSync(html,'<html><body><div id="root"></div><script type="module" src="/src/../.tools/single-tracking-qa.tsx"></script></body></html>')
writeFileSync(entry,`import React from 'react';import{createRoot}from'react-dom/client';import{ReportReceiptView}from'../src/features/reports/ReportReceiptView';import{TrackingForm}from'../src/features/reports/TrackingForm';createRoot(document.getElementById('root')!).render(<><ReportReceiptView receipt={{tracking_code:'RS-0123456789ABCDEF',access_token:'a'.repeat(64),expires_in_days:90}}/><TrackingForm/></>);`)
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{env:{...process.env,VITE_REPORT_GATEWAY_ENABLED:'false',VITE_REPORT_SINGLE_CODE_ENABLED:'true'},stdio:'ignore',windowsHide:true})
let chrome,socket,id=0;const pending=new Map(),checks=[]
const delay=ms=>new Promise(r=>setTimeout(r,ms))
async function wait(fn){for(let i=0;i<150;i++){if(await fn())return;await delay(100)}throw Error('Local UI wait failed')}
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timer=setTimeout(()=>{pending.delete(n);reject(Error('Local CDP timeout'))},15000);pending.set(n,{resolve:v=>{clearTimeout(timer);resolve(v)},reject});socket.send(JSON.stringify({id:n,method,params}))})
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error('Local component evaluation failed');return r.result.value}
async function check(name,fn){await fn();checks.push({name,status:'PASS'});console.log('PASS '+name)}
try{
 await wait(async()=>{try{return(await fetch(`http://127.0.0.1:${port}/.tools/single-tracking-qa.html`)).ok}catch{return false}})
 chrome=spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',['--headless=new','--disable-gpu','--no-first-run','--disable-background-networking','--disable-sync','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore',windowsHide:true})
 await wait(()=>existsSync(path.join(profile,'DevToolsActivePort')))
 const cdp=readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0]
 const target=(await(await fetch(`http://127.0.0.1:${cdp}/json/list`)).json()).find(t=>t.type==='page')
 socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j})
 socket.onmessage=e=>{const m=JSON.parse(e.data),p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error('CDP rejected')):p.resolve(m.result)}}
 await send('Network.enable');await send('Network.setBlockedURLs',{urls:['https://*']})
 await send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:profile})
 await send('Page.navigate',{url:`http://127.0.0.1:${port}/.tools/single-tracking-qa.html`})
 await wait(()=>evaluate("!!document.querySelector('output')&&!!document.querySelector('form')"))
 await check('Receipt shows one code and one tracking field; raw token/reference hidden',async()=>{
  assert.equal(await evaluate("document.querySelectorAll('output').length"),1)
  assert.equal(await evaluate("document.body.innerText.includes('a'.repeat(64))||document.body.innerText.includes('RS-0123456789ABCDEF')"),false)
  assert.equal(await evaluate("document.querySelectorAll('form input').length"),1)
 })
 await check('Copy action uses exact displayed code (isolated clipboard adapter)',async()=>{
 await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.__copied=value}}});[...document.querySelectorAll('button')].find(b=>b.textContent==='Salin Kode').click()")
 await wait(()=>evaluate("window.__copied===document.querySelector('output').textContent"))
 })
 await check('Download contains only one credential and generic receipt text',async()=>{
 await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Simpan Bukti Laporan').click()")
 const file=path.join(profile,'bukti-laporan-rekansiaga.txt');await wait(()=>existsSync(file))
 const receipt=readFileSync(file,'utf8');assert.ok(receipt.includes('RK2-'));assert.ok(!receipt.includes('RS-0123456789ABCDEF')&&!receipt.includes('a'.repeat(64)))
 })
 await check('Legacy form toggles two fields and returns to one without document navigation',async()=>{
 await evaluate("window.__doc=document;[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Gunakan kode + token')).click()")
 await wait(()=>evaluate("document.querySelectorAll('form input').length===2"))
 await evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Gunakan satu kode pelacakan').click()")
 await wait(()=>evaluate("document.querySelectorAll('form input').length===1"));assert.equal(await evaluate('window.__doc===document'),true)
 })
 await check('Credential input survives focus changes; no URL or Web Storage persistence',async()=>{
 await evaluate("const e=document.querySelector('form input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,document.querySelector('output').textContent);e.dispatchEvent(new Event('input',{bubbles:true}));e.focus();e.blur();e.focus()")
 assert.equal(await evaluate("document.querySelector('form input').value===document.querySelector('output').textContent"),true)
 assert.equal(await evaluate("location.search===''&&location.hash===''&&!JSON.stringify({...localStorage,...sessionStorage}).includes('RK2-')"),true)
 })
}finally{
 socket?.close();chrome?.kill();vite.kill()
 for(const f of [html,entry])if(existsSync(f))unlinkSync(f)
 writeFileSync('docs/qa/stage-e/single-tracking-browser.json',JSON.stringify({kind:'LOCAL isolated headless UI; synthetic receipt; clipboard adapter; HTTPS blocked; not LIVE',checks},null,2))
}
