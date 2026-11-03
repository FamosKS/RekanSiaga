import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import test from 'node:test'
const require=createRequire(import.meta.url),results=[]
function load(file,mocks={},env={},globals={}) {
 const source=readFileSync(file,'utf8').replace(/import\.meta\.env\.(VITE_[A-Z_]+)/g,(_,key)=>JSON.stringify(env[key]??''))
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,exports={}
 vm.runInNewContext(code,{exports,require:name=>name in mocks?mocks[name]:require(name),URL,AbortController,Date,crypto,...globals});return exports
}
async function check(name,run){await test(name,async()=>{await run();results.push(name)})}
const env={VITE_SUPABASE_URL:'https://uiuiouosblyuqgnvfpeh.supabase.co',VITE_DEV_REMOTE_WRITES_APPROVED:'false',VITE_DEV_CONTENT_WRITES_ENABLED:'true'}
const permissions=load('src/features/auth/permissions.ts'),resources=load('src/features/admin/dataResources.ts'),geo=load('src/lib/geography.ts')
function admin(roles,patch={}){return load('src/features/admin/adminDataService.ts',{'../../lib/supabase':{supabase:{}},'../auth/authService':{getVerifiedStaffAccess:async()=>roles?{userId:'fixture',roles}:null},'../auth/permissions':permissions,'./dataResources':resources,'../../lib/geography':geo},{...env,...patch})}
await check('Content approval covers business modules/source dependencies but never staff/settings/notifications or staging',async()=>{
 for(const role of ['super_admin','information_manager','mitigation_editor','report_verifier']){
  const api=admin([role]);assert.equal(api.remoteWritesApproved,false)
  for(const path of ['/admin/artikel','/admin/kejadian','/admin/panduan','/admin/kontak-darurat','/admin/lokasi-bantuan','/admin/sumber-data']){
   if(permissions.canAccessAdminPath([role],path))assert.equal((await api.authorize(path,true)).userId,'fixture')
   else await assert.rejects(api.authorize(path,true),e=>e.code==='42501')
  }
  for(const path of ['/admin/staf','/admin/pengaturan','/admin/notifikasi'])await assert.rejects(api.authorize(path,true),e=>e.code==='APPROVAL_REQUIRED')
 }
 for(const roles of [null,[]])await assert.rejects(admin(roles).authorize('/admin/artikel',true),e=>e.code==='42501')
 await assert.rejects(admin(['super_admin'],{VITE_SUPABASE_URL:'https://fweeyflixnqbvvceuent.supabase.co'}).authorize('/admin/artikel',true),e=>e.code==='APPROVAL_REQUIRED')
})
await check('All public readers retain anonymous client and publication/verification filters shared with backend contract',async()=>{
 const calls=[];const query=new Proxy({},{get:(_,method)=>(...args)=>{calls.push([method,...args]);if(method==='then')return Promise.resolve({data:[],error:null}).then(...args);return query}})
 const publicSupabase={from:table=>{calls.push(['from',table]);return query}}
 const contracts=load('src/features/content/contracts.ts')
 const content=load('src/features/content/contentService.ts',{'../../lib/supabase':{publicSupabase},'./contracts':contracts})
 for(const fn of ['listPublishedArticles','listPublishedGuides','listPublishedDisasters','listVerifiedContacts'])await content[fn]()
 const maps=load('src/features/maps/mapService.ts',{'../../lib/supabase':{publicSupabase},'../../lib/geography':geo});await maps.listPublicRelief()
 const has=(method,...args)=>calls.some(c=>JSON.stringify(c)===JSON.stringify([method,...args]))
 assert.ok(has('eq','publication_status','published'));assert.ok(has('not','published_at','is',null));assert.ok(has('in','verification_status',['source_confirmed','staff_verified']))
 assert.ok(has('eq','is_active',true)&&has('eq','is_verified',true)&&has('eq','verification_status','verified'))
 assert.equal(calls.filter(c=>c[0]==='from').length,5)
})
function lifecycle(){let callback,now=0,next=0;const timers=new Map(),states=[];let resets=0,pending
 const auth={onAuthStateChange(fn){callback=fn;return{data:{subscription:{unsubscribe(){}}}}},getSession:async()=>({data:{session:null}}),getUser:async()=>pending?pending:({data:{user:{id:'staff'}}})}
 const clock={Date:{now:()=>now},setTimeout(fn,ms){const id=++next;timers.set(id,{fn,at:now+ms});return id},clearTimeout(id){timers.delete(id)}}
 const {observeAuthentication}=load('src/features/auth/authLifecycle.ts',{}, {},clock),stop=observeAuthentication(auth,state=>states.push(state),()=>resets++)
 return{states,stop,get resets(){return resets},event:(event,session)=>callback(event,session),hold(promise){pending=promise},async tick(ms=0){now+=ms;for(const[id,t]of[...timers])if(t.at<=now){timers.delete(id);t.fn()}for(let i=0;i<10;i++)await Promise.resolve()}}
}
await check('Returning SIGNED_IN and TOKEN_REFRESHED keep verified identity/revision/cache stable while validation runs',async()=>{
 const run=lifecycle(),session={user:{id:'staff'},access_token:'synthetic',expires_at:1000}
 run.event('SIGNED_IN',session);await run.tick();const resets=run.resets,revision=run.states.at(-1).revision
 let finish;run.hold(new Promise(resolve=>finish=resolve));run.event('SIGNED_IN',session);await run.tick()
 assert.equal(run.resets,resets);assert.equal(run.states.at(-1).loading,false);assert.equal(run.states.at(-1).user.id,'staff')
 finish({data:{user:{id:'staff'}}});await run.tick();assert.equal(run.states.at(-1).revision,revision)
 run.hold(null);run.event('TOKEN_REFRESHED',{...session,access_token:'synthetic-new',expires_at:2000});await run.tick();assert.equal(run.states.at(-1).revision,revision);assert.equal(run.resets,resets)
 run.event('SIGNED_OUT',null);assert.equal(run.states.at(-1).user,null);assert.ok(run.resets>resets);run.stop()
})
await check('Background revalidation still fails closed on revocation and timeout; old expiry remains enforced',async()=>{
 for(const kind of ['revoked','timeout','expired']){
  const run=lifecycle(),session={user:{id:'staff'},access_token:'synthetic',expires_at:1};run.event('SIGNED_IN',session);await run.tick()
  run.hold(kind==='revoked'?Promise.resolve({data:{user:null},error:{status:401}}):new Promise(()=>{}));run.event('TOKEN_REFRESHED',{...session,expires_at:2000});await run.tick()
  if(kind!=='revoked')await run.tick(kind==='expired'?1001:15001)
  assert.equal(run.states.at(-1).user,null);run.stop()
 }
})
await check('Role guard keeps Outlet mounted during background checks but rejects errors/revoked/mismatched staff',()=>{
 const component=()=>null,ctx={user:{id:'staff'},session:{},loading:false,error:null,revision:1}
 let state={isPending:false,isFetching:true,isError:false,data:{userId:'staff',roles:['super_admin']}}
 const module=load('src/features/auth/RoleGuard.tsx',{'@tanstack/react-query':{useQuery:()=>state},'react/jsx-runtime':{jsx:(type,props)=>({type,props})},'react-router-dom':{Navigate:component,Outlet:'Outlet',useLocation:()=>({pathname:'/admin/artikel'})},'../../hooks/useAuth':{useAuth:()=>ctx},'./authService':{},'./permissions':permissions,'./StaffAccessContext':{StaffAccessContext:{Provider:'StaffProvider'}},'../../components/shared/PageElements':{LoadingState:'Loading',ErrorState:'Error'}})
 assert.equal(module.RoleGuard().type,'StaffProvider')
 state={...state,isError:true};assert.equal(module.RoleGuard().type,'Error')
 state={...state,isError:false,data:null};assert.equal(module.RoleGuard().type,component)
})
const storage=new Map();globalThis.sessionStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}
async function vault(){const source=ts.transpileModule(readFileSync('src/features/drafts/draftVault.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return import('data:text/javascript;base64,'+Buffer.from(source+'\n// '+crypto.randomUUID()).toString('base64'))}
await check('Draft recovery encrypts private fields, requires passphrase after discarded runtime and never stores plaintext or the key',async()=>{
 storage.clear();const first=await vault();first.setDraftOwner('staff');first.writeDraft('staff:article',{title:'PRIVATE-LOCAL-DRAFT',content:'Private synthetic fields'});first.writeDraft('public:transient',{title:'Other namespace stays memory-only'})
 await first.protectDrafts('local-test-phrase-long');assert.equal(storage.size,1);const raw=[...storage.values()][0]
 for(const text of ['PRIVATE-LOCAL-DRAFT','local-test-phrase-long','Private synthetic fields'])assert.ok(!raw.includes(text))
 const next=await vault();next.setDraftOwner('staff');assert.equal(next.draftCount(),0);assert.equal(next.hasDraftBackup(),true)
 await assert.rejects(next.restoreDrafts('wrong-local-phrase'));await next.restoreDrafts('local-test-phrase-long');assert.equal(next.readDraft('staff:article',{}).title,'PRIVATE-LOCAL-DRAFT');assert.equal(next.draftCount(),1)
 next.setDraftOwner('different-staff');assert.equal(next.draftCount(),0);assert.equal(storage.size,0)
})
await check('Draft vault rejects security fields/files and removes recovered drafts after success or explicit clear',async()=>{
 storage.clear();const api=await vault();api.setDraftOwner('public')
 for(const key of ['password','captcha_token','access_token','refresh_token','service_role','token'])assert.throws(()=>api.writeDraft('public:form',{[key]:'never-store'}))
 assert.throws(()=>api.writeDraft('public:form',new Blob(['file'])))
 api.writeDraft('public:form',{title:'LOCAL safe form'});await api.protectDrafts('local-test-phrase-long');api.clearDraft('public:form');assert.equal(api.draftCount(),0);assert.equal(storage.size,0)
 api.forgetDrafts();assert.equal(api.draftBackupEnabled(),false)
})
await check('Draft ciphertext tampering and expiry cannot restore data',async()=>{
 storage.clear();const api=await vault();api.setDraftOwner('staff');api.writeDraft('staff:form',{title:'Local test'});await api.protectDrafts('local-test-phrase-long')
 const [key,raw]=[...storage][0],value=JSON.parse(raw);value.cipher[0]^=1;storage.set(key,JSON.stringify(value));await assert.rejects(api.restoreDrafts('local-test-phrase-long'))
 value.expires=0;storage.set(key,JSON.stringify(value));assert.equal(api.hasDraftBackup(),false)
})
mkdirSync('docs/qa/stage-e',{recursive:true});writeFileSync('docs/qa/stage-e/local-tests.json',JSON.stringify({kind:'Local deterministic tests only; no LIVE data, RLS or CAPTCHA acceptance',tests:results,cloudWrites:0},null,2))
