// Local synthetic contract tests, never evidence of LIVE acceptance.
import assert from 'node:assert/strict'
import test from 'node:test'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { encodeTrackingCredential as encode, decodeTrackingCredential as decode } from '../supabase/functions/_shared/trackingCredential.ts'
import { parseReportRequest } from '../supabase/functions/_shared/reportContract.ts'
import { createReportHandler } from '../supabase/functions/_shared/reportHandler.ts'
const secret = 'a'.repeat(64)
test('Base32 preserves all 256 input bits, case/spacing aliases and zero padding', () => {
  for (let i=0;i<250;i++) { const token=randomBytes(32).toString('hex'); const code=encode(token); assert.equal(decode(code),token); assert.equal(decode(code.toLowerCase()),token); assert.equal(decode(code.replaceAll('-',' ').replace('RK2 ','RK2-')),token) }
  assert.equal(decode(encode('0'.repeat(64)).replaceAll('0','O')),'0'.repeat(64))
  for(const value of ['', 'RK2-123',encode(secret)+'A',encode(secret).slice(0,-1)+'Z','RK2-'+ 'U'.repeat(52)]) assert.throws(()=>decode(value))
  assert.throws(()=>encode('a'.repeat(63)))
})
test('New credential request rejects mixed identity, missing CAPTCHA and reference-only credentials',()=>{
  const body={action:'track',tracking_credential:encode(secret),captcha_token:'LOCAL_ONLY'}
  assert.equal(parseReportRequest(body).tracking_credential,body.tracking_credential)
  for(const patch of [{captcha_token:''},{tracking_code:'RS-0123456789ABCDEF'},{access_token:secret},{tracking_credential:'RPT-TEST000001'}]) assert.throws(()=>parseReportRequest({...body,...patch}))
})
const receipt={tracking_code:'RS-0123456789ABCDEF',access_token:secret,expires_in_days:90}
const submit={action:'submit',report_type:'Banjir',title:'LOCAL TEST only',description:'Synthetic report for local tests only.',region_name:'TEST region',location_description:'TEST synthetic location',privacy:true,captcha_token:'LOCAL_ONLY'}
const publicStatus={status:'verified',created_at:'2026-11-02T00:00:00Z',updated_at:'2026-11-02T01:00:00Z',history:[{status:'verified',changed_at:'2026-11-02T01:00:00Z'}]}
function gateway(stage='valid') {
 const calls=[]
 const handler=createReportHandler({enabled:true,allowedOrigins:['http://localhost:5173'],clientKey:async()=> 'shared-local-bucket',rateLimit:async()=>{calls.push('quota');return stage!=='quota'},challenge:async()=>{calls.push('captcha');return stage!=='captcha'},submit:async()=>receipt,
 trackSingle:async token=>{calls.push('track');return stage==='valid'&&token===secret?publicStatus:null},track:async(code,token)=>code===receipt.tracking_code&&token===secret?publicStatus:null,
 upload:async()=>{},cleanup:async()=>{},attachment:async()=>null})
 return {calls,send:body=>handler(new Request('http://localhost/report-gateway',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify(body)}))}
}
test('Submit adds one-code receipt without breaking legacy API fields',async()=>{
 const response=await gateway().send(submit);assert.equal(response.status,201)
 const body=await response.json();assert.equal(body.tracking_code,receipt.tracking_code);assert.equal(body.access_token,secret);assert.equal(decode(body.tracking_credential),secret)
})
test('Single credential still enforces quota, CAPTCHA, generic 404 and minimal response',async()=>{
 for(const stage of ['quota','captcha','wrong','expired','revoked','valid']) {
 const api=gateway(stage),response=await api.send({action:'track',tracking_credential:encode(secret),captcha_token:'LOCAL_ONLY'})
 assert.equal(response.status,stage==='quota'?429:stage==='captcha'?403:stage==='valid'?200:404)
 assert.deepEqual(api.calls,stage==='quota'?['quota']:stage==='captcha'?['quota','captcha']:['quota','captcha','track'])
 const result=await response.json();assert.deepEqual(result,stage==='valid'?publicStatus:{error:{code:stage==='quota'?'RATE_LIMITED':stage==='captcha'?'CHALLENGE_FAILED':'NOT_FOUND'}})
 assert.equal(JSON.stringify(result).includes(secret),false)
 }
})
test('Existing code plus token remains supported without rotation or bulk migration',async()=>{
 const response=await gateway().send({action:'track',tracking_code:receipt.tracking_code,access_token:secret,captcha_token:'LOCAL_ONLY'})
 assert.equal(response.status,200)
})
test('Receipt has one credential, copy/download controls, no draft persistence or secret URL',()=>{
 const view=readFileSync('src/features/reports/ReportReceiptView.tsx','utf8'),form=readFileSync('src/features/reports/TrackingForm.tsx','utf8')
 assert.ok(view.includes('Salin Kode')&&view.includes('Simpan Bukti Laporan'))
 assert.ok(!view.includes('{receipt.access_token}')&&!view.includes('{receipt.tracking_code}'))
 for(const source of [view,form]) for(const pattern of ['localStorage','sessionStorage','console.log','URLSearchParams','useDraftState']) assert.equal(source.includes(pattern),false)
 assert.ok(form.includes('legacy && <Input'))
})
