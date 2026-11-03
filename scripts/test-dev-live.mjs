// OPERATOR ONLY. Default does not send any network traffic.
// Existing dev sessions only; never create test accounts or print credentials.
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'
if (!process.argv.includes('--live')) { console.log('NOT_RUN: --live plus exact dev scope approval and existing staff sessions required. No network requests.'); process.exit(0) }
assert.equal(process.env.REKANSIAGA_DEV_E2E_APPROVAL, 'one-marked-article-with-cleanup', 'Approve exactly one marked article and cleanup; no reports/Auth/schema changes in this script.')
const env = loadEnv('development',process.cwd(),'VITE_')
assert.equal(env.VITE_SUPABASE_URL,'https://uiuiouosblyuqgnvfpeh.supabase.co')
assert.ok(/^sb_publishable_/.test(env.VITE_SUPABASE_PUBLISHABLE_KEY??''),'Expected dev publishable key; value suppressed')
const managerJwt = process.env.REKANSIAGA_DEV_MANAGER_JWT, deniedJwt = process.env.REKANSIAGA_DEV_DENIED_JWT
assert.ok(managerJwt && deniedJwt && managerJwt !== deniedJwt,'Two distinct existing dev user sessions required; provide locally, never in chat.')
const client = jwt => createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{headers:jwt?{Authorization:`Bearer ${jwt}`}:{},fetch:(url,init)=>fetch(url,{...init,signal:AbortSignal.timeout(12000)})}})
const manager=client(managerJwt),denied=client(deniedJwt),anon=client()
const marker=`TEST-LIVE-${crypto.randomUUID()}`,slug=marker.toLowerCase()
const report={kind:'Actual dev API E2E; not browser/Flutter/report-gateway acceptance',projectRef:'uiuiouosblyuqgnvfpeh',marker,checks:[],cleanup:'NOT_NEEDED',phase4a:'BLOCKED'}
let created
function check(name){report.checks.push({name,outcome:'PASS'});console.log(`PASS ${name}`)}
try {
 for(const [api,jwt,allowed]of[[manager,managerJwt,true],[denied,deniedJwt,false]]){
  const {data:identity,error}=await api.auth.getUser(jwt);assert.ok(!error&&identity.user,'Existing user JWT must verify through Auth')
  const {data:role,error:roleError}=await api.rpc('has_staff_role',{p_codes:['super_admin','information_manager']});assert.ok(!roleError);assert.equal(role===true,allowed)
 }
 check('Existing manager identity/role verified; existing denied actor lacks information permission')
 const {data:identity}=await manager.auth.getUser(managerJwt)
 const payload={title:`${marker} - data contoh, bukan kejadian aktual`,slug,summary:'Data uji berlabel tanpa identitas pribadi.',content:'TEST-LIVE. Artikel ini hanya untuk pengujian aplikasi dan akan dihapus oleh run yang sama.',source_url:'https://example.invalid/rekansiaga-test',publication_status:'draft',author_id:identity.user.id}
 const insert=await manager.from('articles').insert(payload).select('id,title,slug,publication_status,updated_at').single();assert.ok(!insert.error&&insert.data);created=insert.data.id;report.articleId=created;report.cleanup='PENDING'
 check('One marked draft inserted and server representation returned')
 const hidden=await anon.from('articles').select('id').eq('id',created);assert.ok(!hidden.error);assert.equal(hidden.data.length,0)
 check('Draft invisible from separate anonymous session')
 const deniedWrite=await denied.from('articles').update({title:`${marker} denied-write probe`}).eq('id',created).select('id');assert.ok(deniedWrite.error||(Array.isArray(deniedWrite.data)&&deniedWrite.data.length===0),'Unexpected unauthorized update: stop and investigate')
 check('Existing actor without information role cannot mutate marked article')
 const publish=await manager.from('articles').update({publication_status:'published',published_at:new Date().toISOString()}).eq('id',created).select('id,publication_status').single();assert.ok(!publish.error&&publish.data)
 const read=await client().from('articles').select('id,title,slug,content').eq('slug',slug).single();assert.ok(!read.error);assert.equal(read.data.id,created)
 check('Published article visible from a fresh anonymous client using shared Flutter REST contract')
 const revised=`${marker} revised`;const update=await manager.from('articles').update({title:revised}).eq('id',created).select('id').single();assert.ok(!update.error)
 const reread=await client().from('articles').select('title').eq('id',created).single();assert.equal(reread.data?.title,revised)
 check('Persisted update read by a separate client')
 const unpublish=await manager.from('articles').update({publication_status:'draft'}).eq('id',created).select('id').single();assert.ok(!unpublish.error)
 const removed=await anon.from('articles').select('id').eq('id',created);assert.equal(removed.data?.length,0)
 check('Unpublished article no longer visible to anonymous client')
}catch(error){report.failure=typeof error?.code==='string'?error.code:'ASSERTION_OR_NETWORK_FAILURE';process.exitCode=1;console.error('Live acceptance failed; details/credentials redacted. See report and check dev manually.')}
finally{
 if(created){const cleanup=await manager.from('articles').delete().eq('id',created).eq('slug',slug).select('id').single();report.cleanup=!cleanup.error&&cleanup.data?.id===created?'PASS_EXACT_CREATED_ROW':'FAILED_OPERATOR_REQUIRED';if(report.cleanup!=='PASS_EXACT_CREATED_ROW')process.exitCode=1}
 mkdirSync('docs/qa/live-admin',{recursive:true});writeFileSync('docs/qa/live-admin/dev-e2e.json',JSON.stringify(report,null,2));console.log(`Cleanup: ${report.cleanup}. No other records targeted.`)
}
