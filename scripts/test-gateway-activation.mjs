// Only new activation behavior. Does not repeat accepted D/backend/UI checks.
import assert from 'node:assert/strict'
import test from 'node:test'
import { probeGateway } from './check-dev-report-gateway.mjs'
import { updateGatewayFlag } from './report-frontend-env.mjs'

test('Activation-only probe uses two invalid anonymous POSTs and skips all accepted D tests', async () => {
  const calls=[]
  const result=await probeGateway({ phase:'enabled', activationOnly:true, origin:'http://localhost:5173', publicKey:'sb_publishable_local_fixture', fetchImpl:async (url,init)=>{
    const body=JSON.parse(init.body);calls.push({url,init,body})
    const attachment=body.action==='attachment'
    return new Response(JSON.stringify({error:{code:attachment?'UNAUTHORIZED':'INVALID_INPUT'}}),{status:attachment?401:400,headers:{'Access-Control-Allow-Origin':'http://localhost:5173'}})
  }})
  assert.equal(calls.length,2)
  assert.ok(calls.every(c=>c.url==='https://uiuiouosblyuqgnvfpeh.supabase.co/functions/v1/report-gateway'&&c.init.method==='POST'&&!c.init.headers.Authorization))
  assert.deepEqual(calls[0].body,{})
  assert.equal(calls[1].body.action,'attachment')
  assert.equal(result.active,true);assert.equal(result.validReportSubmissions,0);assert.equal(result.liveSubmitTrackAcceptance,'NOT_RUN')
})
test('Activation-only probe refuses disabled phase and fails if server remains disabled', async () => {
  const options={origin:'http://localhost:5173',publicKey:'sb_publishable_local_fixture',activationOnly:true}
  await assert.rejects(probeGateway({...options,phase:'disabled',fetchImpl:async()=>{throw Error('No request expected')}}))
  await assert.rejects(probeGateway({...options,phase:'enabled',fetchImpl:async()=>new Response(JSON.stringify({error:{code:'SERVICE_NOT_READY'}}),{status:503,headers:{'Access-Control-Allow-Origin':'http://localhost:5173'}})}))
})
test('Frontend flag update preserves unrelated settings, Unicode, BOM and CRLF without copying values to output', () => {
  const before='\uFEFF# konfigurasi lokal\r\nVITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_fixture\r\nVITE_REPORT_GATEWAY_ENABLED=false\r\nOTHER_SETTING="nilai uji 日本"\r\n'
  const enabled=updateGatewayFlag(before,true)
  assert.equal(enabled,before.replace('VITE_REPORT_GATEWAY_ENABLED=false','VITE_REPORT_GATEWAY_ENABLED=true'))
  assert.equal(updateGatewayFlag(enabled,false),before)
})
test('Frontend updater handles absent flag and fails closed on duplicate assignments', () => {
  assert.equal(updateGatewayFlag('# local',true),'# local\nVITE_REPORT_GATEWAY_ENABLED=true\n')
  assert.throws(()=>updateGatewayFlag('VITE_REPORT_GATEWAY_ENABLED=false\nexport VITE_REPORT_GATEWAY_ENABLED=true\n',true))
})
