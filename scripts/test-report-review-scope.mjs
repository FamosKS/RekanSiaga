// Report review operational modes; no Cloud sessions, mutations or audits.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
const require=createRequire(import.meta.url)
const target='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002'
function load(file,mocks={},env={}){
  const source=readFileSync(file,'utf8').replace(/import\.meta\.env\.(VITE_[A-Z_]+)/g,(_,name)=>JSON.stringify(env[name]??''))
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
  const exports={};vm.runInNewContext(output,{exports,require:name=>name in mocks?mocks[name]:require(name),AbortController,URL,Date,crypto,Uint8Array,DataView});return exports
}
const definitions=load('src/features/admin/dataResources.ts'),geo=load('src/lib/geography.ts'),permissions=load('src/features/auth/permissions.ts'),reason=load('src/features/reports/reviewContract.ts')
function setup({roles=['report_verifier'],patch={},rpcError=null,rpcData=true}={}){
  const calls=[],env={VITE_SUPABASE_URL:'https://uiuiouosblyuqgnvfpeh.supabase.co',VITE_DEV_REMOTE_WRITES_APPROVED:'false',VITE_DEV_REPORT_REVIEW_APPROVED:'true',VITE_DEV_REPORT_REVIEW_ID:target,...patch}
  const supabase={from(){calls.push({kind:'direct-table'});throw Error('Direct table mutation/read not permitted in review')},async rpc(name,input){calls.push({kind:'rpc',name,input});return {data:rpcData,error:rpcError}}}
  const admin=load('src/features/admin/adminDataService.ts',{'../../lib/supabase':{supabase},'../auth/authService':{getVerifiedStaffAccess:async()=>roles?{userId:'local-staff-fixture',roles}:null},'../auth/permissions':permissions,'./dataResources':definitions,'../../lib/geography':geo},env)
  const reports=load('src/features/reports/adminReportService.ts',{'../../lib/supabase':{supabase},'../admin/adminDataService':admin,'./reviewContract':reason},env)
  return {calls,reports,admin}
}
await test('Global writes remain false while the selected report can use only review_public_report RPC',async()=>{
  const run=setup();assert.equal(run.admin.remoteWritesApproved,false);assert.equal(run.reports.isReportReviewApproved(target),true)
  await run.reports.reviewReport(target,'verified','  TEST-LIVE scoped review\n')
  assert.equal(run.calls.length,1);assert.equal(run.calls[0].kind,'rpc');assert.equal(run.calls[0].name,'review_public_report')
  assert.deepEqual(JSON.parse(JSON.stringify(run.calls[0].input)),{p_report_id:target,p_new_status:'verified',p_reason:'TEST-LIVE scoped review'})
})
await test('Single-report scope takes precedence over routine review and global approval',async()=>{
  for(const global of ['false','true']){
    const run=setup({roles:['super_admin'],patch:{VITE_DEV_REMOTE_WRITES_APPROVED:global,VITE_DEV_REPORT_REVIEW_ENABLED:'true'}})
    assert.equal(run.reports.isReportReviewApproved(other),false)
    await assert.rejects(run.reports.reviewReport(other,'verified',null),error=>error.code==='APPROVAL_REQUIRED');assert.equal(run.calls.length,0)
  }
})
await test('Anonymous, missing/inactive staff access and unrelated roles cannot invoke review RPC',async()=>{
  for(const roles of [null,[],['information_manager'],['mitigation_editor']]){
    const run=setup({roles});await assert.rejects(run.reports.reviewReport(target,'verified',null),error=>error.code==='42501');assert.equal(run.calls.length,0)
  }
  const allowed=setup({roles:['super_admin']});await allowed.reports.reviewReport(target,'under_review',null);assert.equal(allowed.calls.length,1)
})
await test('Approval must name exactly one valid report on the exact dev project',async()=>{
  for(const patch of [{VITE_DEV_REPORT_REVIEW_ID:''},{VITE_DEV_REPORT_REVIEW_ID:'*'},{VITE_DEV_REPORT_REVIEW_ID:target+','+other},{VITE_DEV_REPORT_REVIEW_ID:' '+target},{VITE_SUPABASE_URL:'https://other-project.supabase.co'},{VITE_SUPABASE_URL:'https://uiuiouosblyuqgnvfpeh.supabase.co.evil.invalid'}]){
    const run=setup({patch});assert.equal(run.reports.isReportReviewApproved(target),false);await assert.rejects(run.reports.reviewReport(target,'verified',null),e=>e.code==='APPROVAL_REQUIRED');assert.equal(run.calls.length,0)
  }
})
await test('Missing/false scoped approval fails closed with global false; existing explicitly broad approval remains compatible',async()=>{
  for(const flag of ['false','']){const run=setup({patch:{VITE_DEV_REPORT_REVIEW_APPROVED:flag}});await assert.rejects(run.reports.reviewReport(target,'verified',null),e=>e.code==='APPROVAL_REQUIRED');assert.equal(run.calls.length,0)}
  const legacy=setup({patch:{VITE_DEV_REPORT_REVIEW_APPROVED:'false',VITE_DEV_REMOTE_WRITES_APPROVED:'true'}});await legacy.reports.reviewReport(other,'verified',null);assert.equal(legacy.calls[0].input.p_report_id,other)
})
await test('Scoped report approval never authorizes writes to other Admin modules',async()=>{
  const run=setup({roles:['super_admin']})
  for(const path of ['/admin/artikel','/admin/staf','/admin/pengaturan','/admin/kejadian'])await assert.rejects(run.admin.authorize(path,true),e=>e.code==='APPROVAL_REQUIRED')
  assert.equal(run.calls.length,0)
})
await test('Reason/status validation, server denial and uncertain results still stop without direct table fallback or retries',async()=>{
  const run=setup()
  for(const [status,text] of [['verified',' \t '],['rejected','x'.repeat(4001)]])await assert.rejects(run.reports.reviewReport(target,status,text))
  assert.equal(run.calls.length,0)
  await run.reports.reviewReport(target,'unverified','koreksi');assert.equal(run.calls.length,1)
  await run.reports.reviewReport(target,'under_review',null);assert.equal(run.calls.at(-1).input.p_reason,null)
  const denied=setup({rpcError:{code:'42501'}});await assert.rejects(denied.reports.reviewReport(target,'verified',null),e=>e.code==='42501');assert.equal(denied.calls.length,1)
  const missing=setup({rpcData:false});await assert.rejects(missing.reports.reviewReport(target,'verified',null),e=>e.code==='PGRST116');assert.equal(missing.calls.length,1)
  assert.deepEqual(Array.from(run.reports.transitions('verified')),['unverified','under_review','rejected']);assert.deepEqual(Array.from(run.reports.transitions('rejected')),['unverified','under_review','verified'])
})

function find(node,match){if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const child of node){const found=find(child,match);if(found)return found}return null}return match(node)?node:find(node.props?.children,match)}
function pageFixture(reportId,patch={}){
  const run=setup({patch}),slots=[];let cursor=0,mutations=0
  const component=()=>null,Button=()=>null,Dialog=()=>null,Select=()=>null,Textarea=()=>null
  const mocks={react:{useState:initial=>{const n=cursor++;if(!(n in slots))slots[n]=initial;return[slots[n],value=>{slots[n]=value}]}},'react/jsx-runtime':{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),Fragment:'Fragment'},'react-router-dom':{useParams:()=>({id:reportId})},'@tanstack/react-query':{useQuery:()=>({data:{report:{id:reportId,title:'TEST LOCAL review',tracking_code:'RS-0123456789ABCDEF',report_type:'Lainnya',status:'unverified',description:'Local synthetic data',location_description:null,reviewed_by:null,reviewed_at:null},attachments:[],history:[]}}),useQueryClient:()=>({invalidateQueries:async()=>{}}),useMutation:()=>({isPending:false,isError:false,mutate(){mutations++}})},'../../features/reports/adminReportService':run.reports,'../../features/reports/reviewContract':reason,'../../features/reports/reportApi':{attachmentUrl:async()=>{throw Error('Not needed')},reportError:()=>''},'../../features/content/usePublicContent':{contentFeedback:()=>({})},'../../features/content/contracts':{contentError:()=>''},'../../lib/publicFormatting':{formatDate:value=>value}}
  mocks['../../features/drafts/useDraftState']={useDraftState:(_key,initial)=>{const [value,setValue]=mocks.react.useState(initial);return[value,setValue,()=>{}]}}
  for(const name of ['LinkButton','Alert','Button','Dialog','Select','Textarea'])mocks['../../components/ui/'+name]={[name]:({Button,Dialog,Select,Textarea})[name]??component}
  mocks['../../components/shared/AdminPageHeader']={AdminPageHeader:component};mocks['../../components/shared/PageElements']={Panel:component,EmptyState:component,ErrorState:component};mocks['../../components/shared/ContentSection']={ContentSection:component}
  const {AdminReportDetailPage}=load('src/pages/admin/AdminReportDetailPage.tsx',mocks)
  return {render(){cursor=0;return AdminReportDetailPage()},Button,Dialog,Select,Textarea,get mutations(){return mutations}}
}
await test('UI enables selected report review/confirmation with global flag off and blocks other rows including Enter/forced clicks',()=>{
  for(const [reportId,allowed] of [[target,true],[other,false]]){
    const page=pageFixture(reportId);let tree=page.render()
    assert.equal(find(tree,n=>n.type===page.Button&&n.props.children==='Tinjau keputusan').props.disabled,!allowed)
    find(tree,n=>n.type===page.Select).props.onChange({target:{value:'verified'}});tree=page.render()
    find(tree,n=>n.type==='form').props.onSubmit({preventDefault(){}});tree=page.render()
    assert.equal(find(tree,n=>n.type===page.Dialog).props.open,allowed)
    const apply=find(tree,n=>n.type===page.Button&&n.props.children==='Terapkan keputusan');assert.equal(apply.props.disabled,!allowed);apply.props.onClick();assert.equal(page.mutations,allowed?1:0)
  }
})

const routine={VITE_DEV_REPORT_REVIEW_ENABLED:'true',VITE_DEV_REPORT_REVIEW_APPROVED:'false',VITE_DEV_REPORT_REVIEW_ID:''}
await test('Routine review permits existing and future reports through RPC for verifier/super_admin without global writes or per-ID config',async()=>{
  for(const roles of [['report_verifier'],['super_admin']]){
    const run=setup({roles,patch:routine})
    assert.equal(run.admin.remoteWritesApproved,false)
    for(const id of [target,other,'00000000-0000-4000-8000-000000000003']){
      assert.equal(run.reports.isReportReviewApproved(id),true)
      await run.reports.reviewReport(id,'under_review',null)
      assert.deepEqual(JSON.parse(JSON.stringify(run.calls.at(-1))),{kind:'rpc',name:'review_public_report',input:{p_report_id:id,p_new_status:'under_review',p_reason:null}})
    }
    assert.equal(run.calls.length,3)
  }
})
await test('Routine mode retains staff/RBAC and dev-project boundaries and requires explicit true',async()=>{
  for(const roles of [null,[],['information_manager'],['mitigation_editor']]){
    const run=setup({roles,patch:routine});await assert.rejects(run.reports.reviewReport(other,'verified',null),e=>e.code==='42501');assert.equal(run.calls.length,0)
  }
  for(const patch of [{VITE_SUPABASE_URL:'https://fweeyflixnqbvvceuent.supabase.co'},{VITE_SUPABASE_URL:'https://uiuiouosblyuqgnvfpeh.supabase.co.evil.invalid'},...['','false','TRUE','yes'].map(value=>({VITE_DEV_REPORT_REVIEW_ENABLED:value}))]){
    const run=setup({patch:{...routine,...patch}});await assert.rejects(run.reports.reviewReport(other,'verified',null),e=>e.code==='APPROVAL_REQUIRED');assert.equal(run.calls.length,0)
  }
})
await test('Routine review does not unlock other Admin modules, bypass validation/server denial, or retry failed RPC',async()=>{
  const run=setup({roles:['super_admin'],patch:routine})
  for(const path of ['/admin/artikel','/admin/staf','/admin/pengaturan','/admin/kejadian'])await assert.rejects(run.admin.authorize(path,true),e=>e.code==='APPROVAL_REQUIRED')
  for(const [status,text] of [['verified',' \t '],['rejected','x'.repeat(4001)]])await assert.rejects(run.reports.reviewReport(other,status,text))
  assert.equal(run.calls.length,0)
  for(const options of [{rpcError:{code:'42501'}},{rpcData:false}]){
    const denied=setup({patch:routine,...options});await assert.rejects(denied.reports.reviewReport(other,'verified',null));assert.equal(denied.calls.length,1);assert.equal(denied.calls[0].kind,'rpc')
  }
})
await test('Routine UI offers review and confirmation on successive reports without changing configured ID',()=>{
  for(const reportId of [target,other,'00000000-0000-4000-8000-000000000003']){
    const page=pageFixture(reportId,routine);let tree=page.render()
    assert.equal(find(tree,n=>n.type===page.Button&&n.props.children==='Tinjau keputusan').props.disabled,false)
    find(tree,n=>n.type===page.Select).props.onChange({target:{value:'verified'}});tree=page.render()
    find(tree,n=>n.type==='form').props.onSubmit({preventDefault(){}});tree=page.render()
    assert.equal(find(tree,n=>n.type===page.Dialog).props.open,true)
    const apply=find(tree,n=>n.type===page.Button&&n.props.children==='Terapkan keputusan');assert.equal(apply.props.disabled,false);apply.props.onClick();assert.equal(page.mutations,1)
  }
})
