// Default is NO NETWORK. Operator supplies ephemeral staging tokens in process env.
// Never reads .env files/passwords/service keys. Output contains case labels only.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { states, reportCases, reportId, validateManifest } from './prepare-phase4a-fixture.mjs'
export const boundaryReason = count => String.fromCodePoint(0x1f600).repeat(count)
export const trimReason = value => value.replace(/^[ \t\n\r\f\v]+|[ \t\n\r\f\v]+$/g,'')
export function publicKey(key) {
 if(key?.startsWith('sb_publishable_')) return key
 try { if(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='anon') return key } catch { /* reject */ }
 throw Error('Public staging key required')
}
export function actorToken(token,expectedUID) {
 const parts=token?.split('.')
 assert.equal(parts?.length,3,'Actor JWT required')
 const claims=JSON.parse(Buffer.from(parts[1],'base64url'))
 assert.equal(claims.role,'authenticated','Privileged actor token prohibited')
 assert.equal(claims.sub,expectedUID,'Actor subject mismatch')
 return token // decoding is a rejection gate, NOT signature verification
}
export function operationKind(route,method='GET') {
 const resource=route.split('?')[0]
 const name={'/auth/v1/user':'AUTH_IDENTITY','/rest/v1/roles':'ROLES',
 '/rest/v1/staff_profiles':'STAFF_PROFILES','/rest/v1/staff_role_assignments':'STAFF_ASSIGNMENTS',
 '/rest/v1/rpc/review_public_report':'REPORT_REVIEW_RPC'}[resource]||'OTHER'
 return `${method==='GET'?'READ':'WRITE'}_${name}`
}
export function client(key, token, transport=fetch,observe=()=>{}) {
 return async (route,method='GET',body) => {
 const operation=operationKind(route,method)
 observe({operation,method,status:null})
 const res=await transport(`https://fweeyflixnqbvvceuent.supabase.co${route}`,{
 method,redirect:'error',signal:AbortSignal.timeout(20000),
 headers:{apikey:key,...(token?{Authorization:`Bearer ${token}`}:{}),
 'Content-Type':'application/json',Prefer:'return=representation'},
 ...(body!==undefined?{body:JSON.stringify(body)}:{})})
 observe({operation,method,status:res.status})
 let data;try {data=await res.json()} catch {data=null}
 return {status:res.status,data}
 }
}
function ok(r) {assert.ok(r.status>=200&&r.status<300,'HTTP success required');return r.data}
function denied(r,code='42501') {assert.ok(r.status>=400&&r.status<500,'Expected authorization/validation denial');assert.equal(r.data?.code,code)}
async function identity(api,id) {assert.equal(ok(await api('/auth/v1/user'))?.id,id)}
async function roles(api) {return ok(await api('/rest/v1/roles?select=code&order=code')).map(r=>r.code)}
async function rows(api,table,field,id,select=field) {return ok(await api(`/rest/v1/${table}?select=${select}&${field}=eq.${id}`))}
export async function runCase(name,task,emit=()=>{}) {
 try {await task();emit(name,'PASS')} catch(error) {emit(name,'FAIL');throw error}
}
export async function testA(apis,ids,state,mutations,reportsRun=null,emit=()=>{}) {
 assert.ok(Object.hasOwn(states,state),'Unknown state')
 const [active,assigned]=states[state]
 for(const label of ['CONTROL','SUBJECT']) {
 await runCase(`A-${state}-${label}`,async()=>{
 const api=apis[label], id=ids[label], foreign=ids[label==='CONTROL'?'SUBJECT':'CONTROL']
 await identity(api,id)
 const expected=label==='CONTROL'?(state==='CROSS_RV'?['report_verifier']:['information_manager','mitigation_editor','report_verifier','super_admin']):(active?assigned:[])
 assert.deepEqual(await roles(api),expected)
 const own=await rows(api,'staff_profiles','user_id',id,'user_id,is_active')
 assert.equal(own.length,label==='CONTROL'||active!==null?1:0)
 if(own.length) assert.equal(own[0].is_active,label==='CONTROL'?true:active)
 assert.equal((await rows(api,'staff_role_assignments','staff_id',id)).length,label==='CONTROL'?1:assigned.length)
 assert.equal((await rows(api,'staff_profiles','user_id',foreign)).length,label==='CONTROL'&&state!=='CROSS_RV'&&active!==null?1:0)
 assert.equal((await rows(api,'staff_role_assignments','staff_id',foreign)).length,label==='CONTROL'&&state!=='CROSS_RV'?assigned.length:0)
 if(mutations) {
 const rid=ok(await apis.CONTROL('/rest/v1/roles?select=id,code&code=eq.report_verifier'))[0]?.id
 assert.ok(rid,'Known role seed required')
 denied(await api(`/rest/v1/staff_profiles?user_id=eq.${id}`,'PATCH',{is_active:true}))
 denied(await api('/rest/v1/staff_profiles','POST',{user_id:id,display_name:'Synthetic unauthorized profile',is_active:true}))
 denied(await api('/rest/v1/staff_role_assignments','POST',{staff_id:id,role_id:rid}))
 denied(await api('/rest/v1/roles','POST',{code:'report_verifier',name:'Synthetic unauthorized grant probe'}))
 denied(await api('/rest/v1/roles?id=eq.00000000-0000-4000-8000-000000000000','DELETE'))
 denied(await api('/rest/v1/roles?id=eq.00000000-0000-4000-8000-000000000000','PATCH',{name:'Synthetic probe'}))
 }
 if(reportsRun) {
 const known=reportId(reportsRun,'valid')
 assert.equal((await rows(apis.CONTROL,'public_reports','id',known)).length,1,'Known report fixture must exist')
 const allowed=label==='CONTROL'||(active&&assigned.some(x=>['report_verifier','super_admin'].includes(x)))
 assert.equal((await rows(api,'public_reports','id',known)).length,allowed?1:0)
 if(!allowed&&mutations) denied(await api('/rest/v1/rpc/review_public_report','POST',{p_report_id:known,p_new_status:'verified',p_reason:'Synthetic denied probe'}))
 }
 // B body authorization exists already; this call must not mutate a report.
 if(mutations&&label==='SUBJECT'&&(!active||!assigned.some(x=>['report_verifier','super_admin'].includes(x))))
 denied(await api('/rest/v1/rpc/review_public_report','POST',{p_report_id:null,p_new_status:null,p_reason:null}))
 },emit)
 }
 await runCase('A-ANON',async()=>denied(await apis.ANON('/rest/v1/roles?select=code')),emit)
 if(!mutations) emit('A-negative-writes','NOT_RUN')
}
async function report(api,id) {const r=await rows(api,'public_reports','id',id,'id,status,reviewed_by,reviewed_at');assert.equal(r.length,1);return r[0]}
async function history(api,id) {return ok(await api(`/rest/v1/report_status_history?select=from_status,to_status,changed_by,reason&report_id=eq.${id}&order=changed_at,id`))}
export async function testB(apis,ids,run,emit=()=>{}) {
 await runCase('B-identity-and-fresh-fixtures',async()=>{
 for(const label of ['CONTROL','SUBJECT']) {await identity(apis[label],ids[label]);assert.deepEqual(await roles(apis[label]),['report_verifier'])}
 const api=apis.CONTROL
 // Fail closed before any RPC if a fixture was reused or has unexpected history.
 for(const label of reportCases) {assert.equal((await report(api,reportId(run,label))).status,label==='terminal'?'verified':'unverified');assert.deepEqual(await history(api,reportId(run,label)),[])}
 },emit)
 const api=apis.CONTROL
 const call=(label,status,reason=null,actor=api)=>actor('/rest/v1/rpc/review_public_report','POST',{p_report_id:reportId(run,label),p_new_status:status,p_reason:reason})
 for(const [label,status,reason] of [['null-status',null,null],['invalid-status','unverified',null],['padded-status','verified ',null],['blank-empty','verified',''],['blank','verified',' \t\n'],['long','verified','a'.repeat(4001)],['overunicode','verified',boundaryReason(4001)],['trimmedover','verified',' \t'+boundaryReason(4001)+'\r\n'],['terminal','rejected',null]]) {
 await runCase(`B-deny-${label}`,async()=>{
 const id=reportId(run,label),before=await report(api,id)
 denied(await call(label,status,reason),'22023')
 assert.deepEqual(await report(api,id),before);assert.deepEqual(await history(api,id),[])
 },emit)
 }
 await runCase('B-null-and-missing-id',async()=>{
 denied(await api('/rest/v1/rpc/review_public_report','POST',{p_report_id:null,p_new_status:'verified'}),'22023')
 const missing=reportId(run,'guaranteed-missing')
 assert.deepEqual(await rows(api,'public_reports','id',missing),[])
 assert.equal(ok(await api('/rest/v1/rpc/review_public_report','POST',{p_report_id:missing,p_new_status:'verified'})),false)
 },emit)
 for(const [label,status,reason] of [['valid','verified','  approved  '],['reject','rejected',null],['unicode','verified',boundaryReason(4000)],['reason4000','verified','a'.repeat(4000)],['trimmed4000','verified',' \t'+ 'a'.repeat(4000)+'\r\n'],['trimmedunicode','verified','\v\f'+boundaryReason(4000)+'\n '],['review','under_review',null],['review-reject','under_review',null]]) {
 await runCase(`B-accept-${label}`,async()=>{
 assert.equal(ok(await call(label,status,reason)),true)
 const id=reportId(run,label),r=await report(api,id),h=await history(api,id)
 assert.equal(r.status,status);assert.equal(r.reviewed_by,ids.CONTROL);assert.ok(r.reviewed_at)
 assert.deepEqual(h,[{from_status:'unverified',to_status:status,changed_by:ids.CONTROL,reason:reason===null?null:trimReason(reason)}])
 },emit)
 }
 await runCase('B-transition-history',async()=>{
 for(const [label,status] of [['valid','verified'],['valid','under_review'],['reject','verified'],['reject','rejected'],['review','under_review'],['review','unverified']]) {
 const id=reportId(run,label),before=await report(api,id),beforeHistory=await history(api,id)
 denied(await call(label,status),'22023')
 assert.deepEqual(await report(api,id),before)
 assert.deepEqual(await history(api,id),beforeHistory)
 }
 assert.equal(ok(await call('review-reject','rejected')),true)
 assert.deepEqual((await history(api,reportId(run,'review-reject'))).map(x=>[x.from_status,x.to_status]),[['unverified','under_review'],['under_review','rejected']])
 assert.equal(ok(await call('review','verified')),true)
 assert.deepEqual((await history(api,reportId(run,'review'))).map(x=>[x.from_status,x.to_status]),[['unverified','under_review'],['under_review','verified']])
 },emit)
 await runCase('B-concurrent-dispatch',async()=>{
 const race=await Promise.all([call('race','verified','race-control'),call('race','rejected','race-subject',apis.SUBJECT)])
 assert.equal(race.filter(x=>x.status>=200&&x.status<300&&x.data===true).length,1)
 const loser=race.find(x=>x.status>=400);assert.ok(loser);denied(loser,'22023')
 const r=await report(api,reportId(run,'race')),h=await history(api,reportId(run,'race'))
 assert.equal(h.length,1);assert.equal(h[0].from_status,'unverified');assert.equal(h[0].to_status,r.status);assert.equal(h[0].changed_by,r.reviewed_by)
 const controlWon=race[0].status>=200&&race[0].status<300&&race[0].data===true
 assert.equal(r.status,controlWon?'verified':'rejected')
 assert.equal(r.reviewed_by,controlWon?ids.CONTROL:ids.SUBJECT)
 assert.equal(h[0].reason,controlWon?'race-control':'race-subject');assert.ok(r.reviewed_at)
 },emit)
 // Concurrent HTTP dispatch alone does NOT prove lock contention. SQL two-session
 // lock regression and injected-history failure test remain separate gates.
 await runCase('B-ANON',async()=>denied(await apis.ANON('/rest/v1/rpc/review_public_report','POST',{p_report_id:reportId(run,'atomic'),p_new_status:'verified'})),emit)
 emit('B-observed-lock-contention','BLOCKED');emit('B-injected-history-atomicity','BLOCKED')
}
export async function sessions(key,token,refresh,id,transport=fetch) {
 assert.ok(refresh,'Dedicated session refresh token required')
 const api=client(key,token,transport);await identity(api,id);const before=await roles(api)
 const r=ok(await client(key,null,transport)('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:refresh}))
 assert.ok(r.access_token&&r.refresh_token);actorToken(r.access_token,id);const next=client(key,r.access_token,transport)
 await identity(next,id);assert.deepEqual(await roles(next),before)
 const signout=await next('/auth/v1/logout?scope=local','POST');assert.ok(signout.status>=200&&signout.status<300)
 const replay=await client(key,null,transport)('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:r.refresh_token})
 assert.ok([400,401].includes(replay.status),'Refresh rejection must not be a rate limit or transient service error')
 // Access JWT may remain valid until expiry: record only bounded behavior.
 const old=await api('/rest/v1/roles?select=code&order=code')
 if(old.status>=200&&old.status<300) assert.deepEqual(old.data.map(x=>x.code),before)
 else assert.ok([401,403].includes(old.status))
 return {accessJwtImmediateRevocationAsserted:false}
}
export function validateInvocation(args,env) {
 const positional=args.filter(x=>!x.startsWith('--')),[mode,state]=positional
 assert.ok(['A','B','SESSION'].includes(mode),'Mode invalid')
 assert.ok(args.every(x=>!x.startsWith('--')||['--live','--with-report-fixtures'].includes(x)),'Unknown flag')
 assert.equal(positional.length,mode==='A'?2:1,'Unexpected arguments')
 if(mode==='A') assert.ok(Object.hasOwn(states,state),'Unknown state')
 if(args.includes('--with-report-fixtures')) assert.equal(mode,'A','Report fixture flag requires A')
 assert.equal(env.PHASE4A_LIVE_APPROVAL,'approved-staging-api','Live approval missing')
 assert.equal(env.PHASE4A_PROJECT_REF,'fweeyflixnqbvvceuent','Staging target required')
 const mutations=env.PHASE4A_MUTATIONS_APPROVED==='approved-synthetic-only'
 if(mode==='B') assert.ok(mutations,'B synthetic mutation approval required')
 if(mode==='SESSION') {
 assert.equal(env.PHASE4A_SESSION_APPROVED,'approved-dedicated-session','Session approval missing')
 assert.ok(env.PHASE4A_SUBJECT_REFRESH,'Dedicated refresh token required')
 }
 return {mode,state,mutations}
}
async function main() {
 const args=process.argv.slice(2)
 if(!args.includes('--live')) {console.log('NOT_RUN: add --live only after operator approval; no network performed');return}
 const {mode,state,mutations}=validateInvocation(args,process.env)
 const input=path.resolve(process.env.PHASE4A_MANIFEST||'')
 if(path.dirname(input)!==path.resolve('docs/qa/phase4a/remediation-a/private')) throw Error('Private manifest required')
 const m=JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,'')),ids=validateManifest(m)
 const key=publicKey(process.env.PHASE4A_PUBLIC_KEY)
 const tokens={CONTROL:process.env.PHASE4A_CONTROL_JWT,SUBJECT:process.env.PHASE4A_SUBJECT_JWT}
 assert.ok(tokens.CONTROL&&tokens.SUBJECT)
 for(const label of ['CONTROL','SUBJECT']) actorToken(tokens[label],ids[label])
 const apis={CONTROL:client(key,tokens.CONTROL),SUBJECT:client(key,tokens.SUBJECT),ANON:client(key,null)}
 // A forged role/sub in a signed JWT must fail signature validation, not gain access.
 const parts=tokens.SUBJECT.split('.')
 assert.equal(parts.length,3)
 const claims=JSON.parse(Buffer.from(parts[1],'base64url'))
 const forged=[parts[0],Buffer.from(JSON.stringify({...claims,sub:ids.CONTROL,role:'service_role'})).toString('base64url'),parts[2]].join('.')
 const emit=(name,status)=>console.log(`${status} ${name}`)
 console.log(`LIVE_JWT ref=${m.project_reference} run=${m.run_id} at=${new Date().toISOString()}`)
 await runCase('JWT-forged-signature-denied',async()=>assert.equal((await client(key,forged)('/rest/v1/roles?select=code')).status,401),emit)
 if(mode==='A') await testA(apis,ids,state,mutations,args.includes('--with-report-fixtures')?m.run_id:null,emit)
 if(mode==='B') await testB(apis,ids,m.run_id,emit)
 if(mode==='SESSION') await runCase('SESSION-refresh-logout',()=>sessions(key,tokens.SUBJECT,process.env.PHASE4A_SUBJECT_REFRESH,ids.SUBJECT),emit)
 console.log(`PASS ${mode} ${mode==='A'?state:''}; bounded cases only; Phase4A remains BLOCKED pending all gates`)
 if(mode==='A'&&!mutations) console.log('BLOCKED: negative write probes not run')
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 main().catch(()=>{console.error('FAIL/BLOCKED: assertion, fixture, approval, or HTTP error. STOP; do not reset/retry mutating cases. No credentials/body logged.');process.exitCode=1})
}
