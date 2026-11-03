// Contract/handler tests only. Synthetic values; zero Cloud requests.
import assert from 'node:assert/strict'
import test from 'node:test'
import { trackingSchema } from '../src/features/reports/reportSchema.ts'
import { parseReportRequest } from '../supabase/functions/_shared/reportContract.ts'
import { createReportHandler } from '../supabase/functions/_shared/reportHandler.ts'

const privateTestToken='a'.repeat(64)
const track=(code,patch={})=>({action:'track',tracking_code:code,access_token:privateTestToken,captcha_token:'SYNTHETIC_LOCAL_ONLY',...patch})
for(const code of ['RS-0123456789ABCDEF','RPT-TEST000001']){
 test(`Web and Gateway accept ${code.slice(0,3)} shape and normalize case consistently`,()=>{
  const form=trackingSchema.parse({code:code.toLowerCase(),token:privateTestToken})
  const parsed=parseReportRequest(track(code.toLowerCase()))
  assert.equal(form.code,code);assert.equal(parsed.tracking_code,code)
 })
 test(`${code.slice(0,3)} never bypasses private token or CAPTCHA validation`,()=>{
  for(const access_token of ['', 'a'.repeat(63),'A'.repeat(64),'g'.repeat(64)]){
   assert.equal(trackingSchema.safeParse({code,token:access_token}).success,false)
   assert.throws(()=>parseReportRequest(track(code,{access_token})))
  }
  for(const captcha_token of ['',null,undefined])assert.throws(()=>parseReportRequest(track(code,{captcha_token})))
 })
}
test('Malformed, overlong and injected tracking codes are rejected at both boundaries',()=>{
 for(const code of ['RPT-TEST00001','RPT-TEST0000011','RPT-TEST00000!','RS-0123456789ABCDE','RS-0123456789ABCDEFG',"RPT-TEST000001' OR 1=1",'UNKNOWN-TEST000001']){
  assert.equal(trackingSchema.safeParse({code,token:privateTestToken}).success,false)
  assert.throws(()=>parseReportRequest(track(code)))
 }
})
test('Legacy tracking still requires quota then real challenge adapter then owner token',async()=>{
 for(const stage of ['quota','captcha','wrong-token','valid']){
  const calls=[]
  const handler=createReportHandler({allowedOrigins:['http://localhost:5173'],enabled:true,
   clientKey:async()=> 'SYNTHETIC_GLOBAL_BUCKET',
   rateLimit:async()=>{calls.push('quota');return stage!=='quota'},
   challenge:async()=>{calls.push('captcha');return stage!=='captcha'},
   track:async(code,token)=>{calls.push('track');return code==='RPT-TEST000001'&&token===privateTestToken?{status:'verified',created_at:'2026-11-01T00:00:00Z',updated_at:'2026-11-01T01:00:00Z',history:[{status:'verified',changed_at:'2026-11-01T01:00:00Z'}]}:null},
   submit:async()=>{throw Error('Tracking must not submit')},upload:async()=>{throw Error('Tracking must not upload')},cleanup:async()=>{throw Error('Tracking must not delete')},attachment:async()=>{throw Error('Tracking must not sign attachments')},
  })
  const body=track('RPT-TEST000001',stage==='wrong-token'?{access_token:'b'.repeat(64)}:{})
  const response=await handler(new Request('http://localhost/report-gateway',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json'},body:JSON.stringify(body)}))
  assert.equal(response.status,{quota:429,captcha:403,'wrong-token':404,valid:200}[stage])
  assert.deepEqual(calls,stage==='quota'?['quota']:stage==='captcha'?['quota','captcha']:['quota','captcha','track'])
  const data=await response.json()
  if(stage==='valid'){assert.deepEqual(Object.keys(data).sort(),['created_at','history','status','updated_at']);assert.deepEqual(Object.keys(data.history[0]).sort(),['changed_at','status']);assert.equal(JSON.stringify(data).includes(privateTestToken),false)}
  else if(stage==='wrong-token')assert.deepEqual(data,{error:{code:'NOT_FOUND'}})
 }
})
