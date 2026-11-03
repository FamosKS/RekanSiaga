import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fixtureSql,fixtureSnapshot,recoverySql,states,validateManifest,reportCases,reportId } from './prepare-phase4a-fixture.mjs'
import { client,publicKey,testA,testB,boundaryReason,trimReason,actorToken,runCase,validateInvocation,sessions } from './test-phase4a-api.mjs'
import { acceptancePlan,runAcceptanceA,orchestratorOptions,verifyOwnFixture,verifyReviewCopy,diagnosticPreflight,requireAcknowledgement,verifyCommittedUser,diagnoseStagingAuth,httpEvidence,editorFixture } from './run-phase4a-acceptance.mjs'
const ids={CONTROL:'52280fb9-2fc0-4b39-b31b-8c806074c8c4',SUBJECT:'02c3da94-39c9-4c4d-bd37-d6040607ff81'}
const manifest={project_name:'rekansiaga-staging',project_reference:'fweeyflixnqbvvceuent',run_id:'phase4a5a-a-20261023-f768e9e3fb2f4223ac497e84871a1c1f',actors:Object.entries(ids).map(([label,user_id])=>({label,user_id}))}

function orchestrationHarness(overrides={}) {
 const events=[],evidence=[],plan=acceptancePlan(manifest)
 const callbacks={plan,
 confirmPolicy:async()=>{events.push('policy');return 'VERIFIED fweeyflixnqbvvceuent A-POLICY'},
 confirmCommit:async entry=>{events.push(`commit:${entry.state}`);return entry.commitAck},
 verifyCopy:async entry=>{events.push(`verify:${entry.state}`)},
 executeState:async state=>{events.push(`test:${state}`)},
 executeSession:async()=>{events.push('session')},
 emit:(name,status)=>evidence.push({name,status}),...overrides,
 }
 return {events,evidence,callbacks}
}

test('Reported COMMITTED string exactly matches USER; changed local approval line fails after accepted input',async()=>{
 const entry=acceptancePlan(manifest)[0],canonical=fixtureSql(manifest,'USER')
 requireAcknowledgement('COMMITTED fweeyflixnqbvvceuent USER',entry.commitAck)
 assert.equal(createHash('sha256').update(canonical.replace(/\r/g,'')).digest('hex'),'36a0883bd791818957fcfac92ffcd529b6103faf3609d849bbf6567141c3fb15')
 let sql=canonical,accepted=false,executed=false
 const io={realpathSync:p=>p,readFileSync:()=>sql}
 const run=orchestrationHarness({
 verifyCopy:e=>{if(e.state==='USER') verifyReviewCopy(e,io)},
 confirmCommit:async e=>{
 sql=sql.replace('-- SET LOCAL rekansiaga.fixture_release=', 'SET LOCAL rekansiaga.fixture_release=')
 accepted=true;return e.commitAck
 },executeState:async()=>{executed=true},
 })
 await assert.rejects(()=>runAcceptanceA(run.callbacks),/Fixture review copy differs/)
 assert.equal(accepted,true);assert.equal(executed,false)
 assert.equal(createHash('sha256').update(sql.replace(/\r/g,'')).digest('hex'),'727990da5478a9e78319d96de6d3065799eee2b66ba4aa9f0b98e44fe3452eaa')
 assert.ok(run.evidence.some(e=>e.name==='A-NO_ROLE'&&e.status==='NOT_RUN'))
})

test('Acknowledgement rejection is exact and never retains raw pasted secrets in error',()=>{
 const expected=acceptancePlan(manifest)[0].commitAck
 for(const [input,code] of [[null,'ACK_INPUT_UNAVAILABLE'],['','ACK_EMPTY'],[' '+expected,'ACK_OUTER_WHITESPACE'],
 [expected+'\u200b','ACK_NON_ASCII_OR_CONTROL'],['PRIVATE_SENTINEL','ACK_TEXT_MISMATCH'],
 ['COMMITTED wrong-target USER','ACK_TEXT_MISMATCH'],[expected.replace('USER','NO_ROLE'),'ACK_TEXT_MISMATCH']]) {
 assert.throws(()=>requireAcknowledgement(input,expected),error=>{
 assert.equal(error.code,code);assert.doesNotMatch(error.stack,/PRIVATE_SENTINEL/)
 assert.equal(error.actual,undefined);return true
 })
 }
})

test('Committed resume CLI requires explicit live, supported state, and no conflicting/duplicate options',()=>{
 assert.deepEqual(orchestratorOptions(['--live','--resume-committed','USER']),{live:true,startState:'USER',resumeCommitted:'USER'})
 assert.deepEqual(orchestratorOptions(['--live','--resume-committed','NO_ROLE']),{live:true,startState:'NO_ROLE',resumeCommitted:'NO_ROLE'})
 assert.deepEqual(orchestratorOptions(['--live','--resume-committed','IM']),{live:true,startState:'IM',resumeCommitted:'IM'})
 for(const args of [['--resume-committed','USER'],['--live','--resume-committed','RV'],
 ['--live','--resume-committed'],['--live','--resume-committed','USER','--from','USER'],
 ['--diagnose','--resume-committed','USER'],['--live','--live']]) assert.throws(()=>orchestratorOptions(args))
})

test('Committed USER resume verifies readonly and runs USER test before any NO_ROLE commit',async()=>{
 const run=orchestrationHarness({resumeCommitted:'USER'})
 run.callbacks.confirmResume=async()=>{run.events.push('resume-ack');return 'VERIFIED fweeyflixnqbvvceuent USER-COMMITTED-READONLY'}
 run.callbacks.verifyCommitted=async()=>{run.events.push('readonly:USER')}
 const result=await runAcceptanceA(run.callbacks)
 assert.equal(result.allStatesPassed,true)
 assert.ok(!run.events.includes('commit:USER'))
 assert.ok(run.events.indexOf('resume-ack')<run.events.indexOf('readonly:USER'))
 assert.ok(run.events.indexOf('readonly:USER')<run.events.indexOf('test:USER'))
 assert.ok(run.events.indexOf('test:USER')<run.events.indexOf('commit:NO_ROLE'))
 assert.ok(run.evidence.some(e=>e.name==='A-USER'&&e.status==='PASS'))
})

test('Resume missing guards, wrong attestation, drift, and failed USER API cannot advance to NO_ROLE',async()=>{
 for(const failure of ['missing','wrong-ack','drift','USER-test','file-drift','wrong-start']) {
 const run=orchestrationHarness({resumeCommitted:'USER'})
 run.callbacks.confirmResume=async()=> 'VERIFIED fweeyflixnqbvvceuent USER-COMMITTED-READONLY'
 run.callbacks.verifyCommitted=async()=>{}
 if(failure==='missing') run.callbacks.verifyCommitted=null
 if(failure==='wrong-ack') run.callbacks.confirmResume=async()=> 'COMMITTED fweeyflixnqbvvceuent USER'
 if(failure==='drift') run.callbacks.verifyCommitted=async()=>{throw Error('drift')}
 if(failure==='USER-test') run.callbacks.executeState=async()=>{throw Error('USER API failed')}
 if(failure==='file-drift') run.callbacks.verifyCopy=async()=>{throw Error('hash drift')}
 if(failure==='wrong-start') run.callbacks.startState='NO_ROLE'
 await assert.rejects(()=>runAcceptanceA(run.callbacks))
 assert.ok(!run.events.includes('commit:USER'));assert.ok(!run.events.includes('commit:NO_ROLE'))
 assert.ok(!run.evidence.some(e=>e.name==='A-USER'&&e.status==='PASS'))
 }
})

test('Committed USER HTTP guard uses GET only and rejects identity, marker, profiles, assignments and role drift',async()=>{
 for(const failure of [null,'identity','marker','subject-profile','assignment','role','status']) {
 const snapshot=fixtureSnapshot(manifest,'USER').map(({user_id,display_name,is_active})=>({user_id,display_name,is_active}))
 if(failure==='marker') snapshot[0].display_name='foreign marker'
 if(failure==='subject-profile') snapshot.push({user_id:ids.SUBJECT,display_name:'unexpected',is_active:true})
 const apis={}
 for(const label of ['CONTROL','SUBJECT']) apis[label]=async(route,method='GET')=>{
 assert.equal(method,'GET')
 let data
 if(route==='/auth/v1/user') data={id:failure==='identity'?'foreign':ids[label]}
 else if(route.includes('/roles?')) data=failure==='role'?[]:[{id:'role-super',code:'super_admin'}]
 else if(route.includes('/staff_role_assignments?')) data=failure==='assignment'?[]:[{staff_id:ids.CONTROL,role_id:'role-super'}]
 else if(route.includes('&user_id=eq.')) data=snapshot.filter(p=>p.user_id===ids[label])
 else data=snapshot
 return {status:failure==='status'?403:200,data}
 }
 if(failure) await assert.rejects(()=>verifyCommittedUser(apis,manifest))
 else await verifyCommittedUser(apis,manifest)
 }
})

test('NO_ROLE resume requires previous-effects attestation and cannot skip NO_ROLE API or replay USER',async()=>{
 for(const failure of [null,'missing-effects','wrong-effects','snapshot','NO_ROLE-test']) {
 const run=orchestrationHarness({startState:'NO_ROLE',resumeCommitted:'NO_ROLE',
 confirmResume:async()=> 'VERIFIED fweeyflixnqbvvceuent NO_ROLE-COMMITTED-READONLY',
 confirmPreviousEffects:async()=> 'VERIFIED fweeyflixnqbvvceuent USER-DENIALS-NO-EFFECTS',
 verifyCommitted:async state=>{assert.equal(state,'NO_ROLE');run.events.push('readonly:NO_ROLE')},
 })
 if(failure==='missing-effects') run.callbacks.confirmPreviousEffects=null
 if(failure==='wrong-effects') run.callbacks.confirmPreviousEffects=async()=> 'wrong'
 if(failure==='snapshot') run.callbacks.verifyCommitted=async()=>{throw Error('drift')}
 if(failure==='NO_ROLE-test') run.callbacks.executeState=async()=>{throw Error('API failure')}
 if(failure) {
 await assert.rejects(()=>runAcceptanceA(run.callbacks))
 assert.ok(!run.events.includes('commit:IM'))
 } else {
 const result=await runAcceptanceA(run.callbacks)
 assert.equal(result.allStatesPassed,false) // USER belongs to prior run evidence
 assert.ok(run.events.indexOf('readonly:NO_ROLE')<run.events.indexOf('test:NO_ROLE'))
 assert.ok(run.events.indexOf('test:NO_ROLE')<run.events.indexOf('commit:IM'))
 assert.ok(run.evidence.some(e=>e.name==='A-NO_ROLE'&&e.status==='PASS'))
 }
 assert.ok(!run.events.includes('commit:USER'));assert.ok(!run.events.includes('test:USER'))
 assert.ok(!run.events.includes('commit:NO_ROLE'))
 }
})

test('NO_ROLE committed HTTP snapshot requires active marked SUBJECT with zero assignments',async()=>{
 for(const failure of [null,'missing-subject','wrong-marker','inactive','extra-assignment']) {
 const snapshot=fixtureSnapshot(manifest,'NO_ROLE').map(({user_id,display_name,is_active})=>({user_id,display_name,is_active}))
 if(failure==='missing-subject') snapshot.splice(0,1)
 if(failure==='wrong-marker') snapshot[0].display_name='foreign'
 if(failure==='inactive') snapshot[0].is_active=false
 const apis={}
 for(const label of ['CONTROL','SUBJECT']) apis[label]=async(route,method='GET')=>{
 assert.equal(method,'GET')
 const data=route==='/auth/v1/user'?{id:ids[label]}:route.includes('/roles?')?[{id:'super',code:'super_admin'}]:
 route.includes('/staff_role_assignments?')?[
 {staff_id:ids.CONTROL,role_id:'super'},...(failure==='extra-assignment'?[{staff_id:ids.SUBJECT,role_id:'super'}]:[])
 ]:route.includes('&user_id=eq.')?snapshot.filter(p=>p.user_id===ids[label]):snapshot
 return {status:200,data}
 }
 if(failure) await assert.rejects(()=>verifyCommittedUser(apis,manifest,'NO_ROLE'))
 else await verifyCommittedUser(apis,manifest,'NO_ROLE')
 }
})

test('Auth diagnostic uses only staging GET identity, rejects expiry and hides tokens/responses',async()=>{
 for(const scenario of ['valid','401','mismatch','network','expired']) {
 const {env,io}=diagnosticHarness();let calls=0
 if(scenario==='expired') env.PHASE4A_CONTROL_JWT=`x.${Buffer.from(JSON.stringify({role:'authenticated',sub:ids.CONTROL,iss:'https://fweeyflixnqbvvceuent.supabase.co/auth/v1',exp:1})).toString('base64url')}.x`
 const result=await diagnoseStagingAuth(env,io,async(url,options)=>{
 assert.equal(url,'https://fweeyflixnqbvvceuent.supabase.co/auth/v1/user')
 assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.equal(options.body,undefined)
 const label=calls++===0?'CONTROL':'SUBJECT'
 if(scenario==='network') throw Error('PRIVATE_SENTINEL')
 return {status:scenario==='401'?401:200,json:async()=>({id:scenario==='mismatch'?'foreign':ids[label],private:'PRIVATE_SENTINEL'})}
 })
 assert.equal(result.ok,scenario==='valid')
 assert.equal(calls,scenario==='expired'?0:2)
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_SENTINEL/)
 assert.ok(!JSON.stringify(result).includes(env.PHASE4A_CONTROL_JWT))
 }
 assert.deepEqual(orchestratorOptions(['--diagnose-auth']),{live:false,startState:'USER',diagnoseAuth:true})
 for(const args of [['--diagnose-auth','--live'],['--diagnose-auth','--diagnose'],['--diagnose-auth','--from','NO_ROLE']]) assert.throws(()=>orchestratorOptions(args))
})

test('Historical 401 is attributed to anonymous USER read, not subsequent NO_ROLE hash check',async()=>{
 const trace=httpEvidence(),observe=trace.observe('USER','ANON')
 const api=client('public','PRIVATE_TOKEN',async()=>({status:401,json:async()=>({code:'42501'})}),observe)
 await api('/rest/v1/roles?select=code')
 assert.deepEqual(trace.summary().last,{state:'USER',actor:'ANON',operation:'READ_ROLES',method:'GET',status:401})
 const writes=trace.observe('USER','CONTROL')
 writes({operation:'WRITE_STAFF_PROFILES',method:'PATCH',status:null})
 writes({operation:'WRITE_STAFF_PROFILES',method:'PATCH',status:403})
 assert.equal(trace.summary().writesDenied,1);assert.equal(trace.summary().writesSucceeded,0)
 writes({operation:'WRITE_STAFF_PROFILES',method:'PATCH',status:null})
 assert.equal(trace.summary().writesUnresolved,1)
 assert.doesNotMatch(JSON.stringify(trace.summary()),/PRIVATE_TOKEN|select=|42501/)
})

test('NO_ROLE uncommented approval reproduces canonical hash failure before any NO_ROLE API',async()=>{
 const e=acceptancePlan(manifest)[1],canonical=fixtureSql(manifest,'NO_ROLE')
 assert.equal(e.sha256,'d27634a9bd91a68907de7979feb09674f5bf1d622df41adcf2f88ba801421152')
 const altered=canonical.replace('-- SET LOCAL rekansiaga.fixture_release=','SET LOCAL rekansiaga.fixture_release=')
 assert.throws(()=>verifyReviewCopy(e,{realpathSync:p=>p,readFileSync:()=>altered}),/differs/)
 verifyReviewCopy(e,{realpathSync:p=>p,readFileSync:()=>canonical})
})

test('USER PASS requires all thirteen writes denied and ends at anonymous GET 401, never a business write success',async()=>{
 const trace=httpEvidence(),apis={},snapshot=fixtureSnapshot(manifest,'USER')
 for(const label of ['CONTROL','SUBJECT','ANON']) apis[label]=client('public',label==='ANON'?null:'mock',async(url,options)=>{
 const parsed=new URL(url),resource=parsed.pathname
 let status=200,data
 if(label==='ANON') {status=401;data={code:'42501'}}
 else if(options.method!=='GET') {status=403;data={code:'42501'}}
 else if(resource==='/auth/v1/user') data={id:ids[label]}
 else if(resource==='/rest/v1/roles') data=parsed.searchParams.has('code')?[{id:'verifier',code:'report_verifier'}]:
 (label==='CONTROL'?['information_manager','mitigation_editor','report_verifier','super_admin']:[]).map(code=>({code}))
 else {
 const uid=parsed.searchParams.get(resource.endsWith('staff_profiles')?'user_id':'staff_id')?.slice(3)
 const visible=snapshot.filter(p=>p.user_id===uid&&(label==='CONTROL'||p.user_id===ids[label]))
 data=resource.endsWith('staff_profiles')?visible:visible.flatMap(p=>p.role_codes.map(()=>({staff_id:p.user_id})))
 }
 return {status,json:async()=>data}
 },trace.observe('USER',label))
 await testA(apis,ids,'USER',true)
 const result=trace.summary()
 assert.equal(result.writesAttempted,13);assert.equal(result.writesDenied,13)
 assert.equal(result.writesSucceeded,0);assert.equal(result.writesUnresolved,0)
 assert.deepEqual(result.last,{state:'USER',actor:'ANON',operation:'READ_ROLES',method:'GET',status:401})
})

test('IM resume never repeats NO_ROLE/IM SQL or prior API, and failed guards/tests block RV',async()=>{
 for(const failure of [null,'effects','snapshot','API']) {
 const run=orchestrationHarness({startState:'IM',resumeCommitted:'IM',
 confirmResume:async()=> 'VERIFIED fweeyflixnqbvvceuent IM-COMMITTED-READONLY',
 confirmPreviousEffects:async()=> failure==='effects'?'wrong':'VERIFIED fweeyflixnqbvvceuent NO_ROLE-DENIALS-NO-EFFECTS',
 verifyCommitted:async state=>{assert.equal(state,'IM');run.events.push('snapshot:IM');if(failure==='snapshot') throw Error('drift')},
 })
 if(failure==='API') run.callbacks.executeState=async()=>{throw Error('API failure')}
 if(failure) {await assert.rejects(()=>runAcceptanceA(run.callbacks));assert.ok(!run.events.includes('commit:RV'))}
 else {
 const result=await runAcceptanceA(run.callbacks)
 assert.equal(result.allStatesPassed,false)
 assert.ok(run.events.indexOf('snapshot:IM')<run.events.indexOf('test:IM'))
 assert.ok(run.events.indexOf('test:IM')<run.events.indexOf('commit:RV'))
 assert.ok(run.evidence.some(e=>e.name==='A-IM'&&e.status==='PASS'))
 }
 for(const event of ['commit:USER','commit:NO_ROLE','commit:IM','test:USER','test:NO_ROLE']) assert.ok(!run.events.includes(event))
 }
})

test('IM GET snapshot verifies both exact profiles and subject information_manager assignment',async()=>{
 for(const failure of [null,'role','assignment','profile']) {
 const snapshot=fixtureSnapshot(manifest,'IM').map(({user_id,display_name,is_active})=>({user_id,display_name,is_active}))
 if(failure==='profile') snapshot[0].is_active=false
 const apis={}
 for(const label of ['CONTROL','SUBJECT']) apis[label]=async(route,method='GET')=>{
 assert.equal(method,'GET')
 let data
 if(route==='/auth/v1/user') data={id:ids[label]}
 else if(route.includes('/roles?')) data=route.includes('information_manager')?
 [{id:'manager',code:failure==='role'?'report_verifier':'information_manager'}]:[{id:'super',code:'super_admin'}]
 else if(route.includes('/staff_role_assignments?')) data=[{staff_id:ids.SUBJECT,role_id:failure==='assignment'?'super':'manager'},{staff_id:ids.CONTROL,role_id:'super'}]
 else data=route.includes('&user_id=eq.')?snapshot.filter(p=>p.user_id===ids[label]):snapshot
 return {status:200,data}
 }
 if(failure) await assert.rejects(()=>verifyCommittedUser(apis,manifest,'IM'))
 else await verifyCommittedUser(apis,manifest,'IM')
 }
})

test('Editor SQL copy validates canonical bytes and only enables approval in returned text, never edits files or reads secrets',()=>{
 const {env,io}=diagnosticHarness()
 const safeEnv=new Proxy(env,{get:(target,key)=>{assert.ok(['PHASE4A_PROJECT_REF','PHASE4A_MANIFEST'].includes(key));return target[key]}})
 for(const state of Object.keys(states)) {
 const sql=editorFixture(state,safeEnv,io)
 const canonical=fixtureSql(manifest,state)
 assert.equal(sql.replace('\nSET LOCAL rekansiaga.fixture_release=','\n-- SET LOCAL rekansiaga.fixture_release='),canonical)
 assert.match(canonical,/-- SET LOCAL rekansiaga.fixture_release=/)
 }
 assert.throws(()=>editorFixture('UNKNOWN',safeEnv,io))
 assert.throws(()=>editorFixture('RV',{...env,PHASE4A_PROJECT_REF:'wrong'},io))
 assert.throws(()=>editorFixture('RV',safeEnv,{...io,readFileSync:p=>p===env.PHASE4A_MANIFEST?JSON.stringify(manifest):'drift'}))
 assert.deepEqual(orchestratorOptions(['--editor-fixture','RV']),{live:false,startState:'USER',editorState:'RV'})
 for(const args of [['--editor-fixture','RV','--live'],['--editor-fixture','bad'],['--editor-fixture']]) assert.throws(()=>orchestratorOptions(args))
})

test('Orchestrator interleaves each committed fixture with its test before the next fixture',async()=>{
 const {events,evidence,callbacks}=orchestrationHarness()
 const result=await runAcceptanceA(callbacks)
 assert.equal(result.allStatesPassed,true)
 assert.equal(result.sessionRun,true)
 const names=Object.keys(states)
 assert.equal(events.filter(x=>x.startsWith('verify:')).length,27)
 for(let i=0;i<names.length;i++) {
 assert.ok(events.indexOf(`commit:${names[i]}`)<events.indexOf(`test:${names[i]}`))
 if(i+1<names.length) assert.ok(events.indexOf(`test:${names[i]}`)<events.indexOf(`commit:${names[i+1]}`))
 }
 assert.ok(events.indexOf('session')>events.indexOf('test:CROSS_RV'))
 assert.ok(evidence.some(x=>x.name==='A-same-JWT-DB-revocation'&&x.status==='PASS'))
 assert.ok(evidence.some(x=>x.name==='Phase4A-security-gate'&&x.status==='BLOCKED'))
 assert.ok(evidence.every(x=>['PASS','FAIL','BLOCKED','NOT_RUN'].includes(x.status)))
})

test('Orchestrator stops on failed API test, never advances or cleans up automatically',async()=>{
 const run=orchestrationHarness()
 run.callbacks.executeState=async state=>{run.events.push(`test:${state}`);if(state==='RV') throw Error('PRIVATE RESPONSE')}
 await assert.rejects(()=>runAcceptanceA(run.callbacks))
 assert.ok(!run.events.includes('commit:ME'))
 assert.ok(!run.events.includes('session'))
 assert.ok(run.evidence.some(x=>x.name==='A-RV'&&x.status==='FAIL'))
 assert.ok(run.evidence.some(x=>x.name==='A-ME'&&x.status==='NOT_RUN'))
 assert.doesNotMatch(JSON.stringify(run.evidence),/PRIVATE RESPONSE/)
})

test('Orchestrator rejects wrong commit/target attestations and drift before dispatching HTTP',async()=>{
 for(const boundary of ['policy','commit','drift']) {
 let tests=0,committed=false
 const run=orchestrationHarness({executeState:async()=>{tests++}})
 if(boundary==='policy') run.callbacks.confirmPolicy=async()=> 'VERIFIED rekansiaga-dev A-POLICY'
 if(boundary==='commit') run.callbacks.confirmCommit=async()=> 'COMMITTED wrong-target USER'
 if(boundary==='drift') {
 run.callbacks.confirmCommit=async entry=>{committed=true;return entry.commitAck}
 run.callbacks.verifyCopy=async()=>{if(committed) throw Error('SQL changed')}
 }
 await assert.rejects(()=>runAcceptanceA(run.callbacks))
 assert.equal(tests,0)
 }
})

test('Resumed orchestration records skipped states and cannot claim all nine states passed',async()=>{
 const run=orchestrationHarness({startState:'IM',executeSession:null})
 const result=await runAcceptanceA(run.callbacks)
 assert.equal(result.allStatesPassed,false);assert.equal(result.sessionRun,false)
 assert.ok(!run.events.includes('commit:USER'))
 assert.ok(run.evidence.some(x=>x.name==='A-USER'&&x.status==='NOT_RUN'))
 assert.ok(run.evidence.some(x=>x.name==='A-all-nine-states'&&x.status==='BLOCKED'))
 assert.ok(run.evidence.some(x=>x.name==='A-refresh-logout'&&x.status==='BLOCKED'))
})

test('Session failure does not relabel a passed CROSS_RV test as failed',async()=>{
 const run=orchestrationHarness({executeSession:async()=>{throw Error('refresh failure')}})
 await assert.rejects(()=>runAcceptanceA(run.callbacks))
 assert.ok(run.evidence.some(x=>x.name==='A-refresh-logout'&&x.status==='FAIL'))
 assert.ok(!run.evidence.some(x=>x.name==='A-refresh-logout'&&x.status==='NOT_RUN'))
 assert.ok(!run.evidence.some(x=>x.name==='A-CROSS_RV'&&x.status==='FAIL'))
})

test('Live fixture check rejects a correct UID with the wrong synthetic ownership marker',async()=>{
 const profile=fixtureSnapshot(manifest,'USER')[0]
 const api=async()=>({status:200,data:[{user_id:profile.user_id,display_name:'Foreign profile',is_active:true}]})
 await assert.rejects(()=>verifyOwnFixture({CONTROL:api,SUBJECT:api},manifest,'USER'))
})

test('Fixture integrity gate rejects SQL guard changes and redirected private paths',()=>{
 const entry=acceptancePlan(manifest)[0],sql=fixtureSql(manifest,'USER')
 const io={realpathSync:()=>entry.file,readFileSync:()=>sql.replace(/\r?\n/g,'\r\n')}
 verifyReviewCopy(entry,io)
 assert.throws(()=>verifyReviewCopy(entry,{...io,readFileSync:()=>sql.replace('RAISE EXCEPTION','NULL; -- RAISE EXCEPTION')}))
 assert.throws(()=>verifyReviewCopy(entry,{...io,realpathSync:()=>entry.file+'.redirect'}))
})

test('Own-fixture HTTP verification accepts each exact approved state without exposing payloads',async()=>{
 for(const state of Object.keys(states)) {
 const snapshot=fixtureSnapshot(manifest,state)
 const api=label=>async()=>({status:200,data:snapshot.filter(p=>p.user_id===ids[label]).map(({user_id,display_name,is_active})=>({user_id,display_name,is_active}))})
 await verifyOwnFixture({CONTROL:api('CONTROL'),SUBJECT:api('SUBJECT')},manifest,state)
 }
})

test('Session oracle uses refreshed user JWT, logout and refresh replay; rejects mismatched identity/rate-limit evidence',async()=>{
 const jwt=sub=>`x.${Buffer.from(JSON.stringify({role:'authenticated',sub})).toString('base64url')}.x`
 const token=jwt(ids.SUBJECT)
 for(const scenario of ['valid','mismatched','rate-limit']) {
 let refreshes=0,logouts=0
 const transport=async(url,options)=>{
 const route=new URL(url).pathname
 let status=200,data
 if(route==='/auth/v1/user') data={id:ids.SUBJECT}
 else if(route==='/rest/v1/roles') data=[{code:'report_verifier'}]
 else if(route==='/auth/v1/logout') {logouts++;status=204}
 else if(route==='/auth/v1/token') {
 if(refreshes++===0) data={access_token:jwt(scenario==='mismatched'?ids.CONTROL:ids.SUBJECT),refresh_token:'synthetic-rotated-refresh'}
 else {status=scenario==='rate-limit'?429:400;data={error:'synthetic-replay-denial'}}
 } else throw Error('Unexpected session route')
 return {status,json:async()=>data}
 }
 if(scenario==='valid') {await sessions('public',token,'synthetic-initial-refresh',ids.SUBJECT,transport);assert.equal(logouts,1);assert.equal(refreshes,2)}
 else {await assert.rejects(()=>sessions('public',token,'synthetic-initial-refresh',ids.SUBJECT,transport));if(scenario==='mismatched') assert.equal(logouts,0)}
 }
})

test('Orchestrator defaults to no files/credentials/network and validates CLI options',()=>{
 const result=spawnSync(process.execPath,['scripts/run-phase4a-acceptance.mjs'],{encoding:'utf8',env:{PATH:process.env.PATH}})
 assert.equal(result.status,0);assert.match(result.stdout,/NOT_RUN/)
 assert.deepEqual(orchestratorOptions(['--live','--from','IM']),{live:true,startState:'IM'})
 assert.throws(()=>orchestratorOptions(['--live','--from','BAD']))
 assert.throws(()=>orchestratorOptions(['--auto-commit']))
 const blocked=spawnSync(process.execPath,['scripts/run-phase4a-acceptance.mjs','--live'],{encoding:'utf8',env:{PATH:process.env.PATH}})
 assert.equal(blocked.status,1);assert.match(blocked.stdout+blocked.stderr,/BLOCKED/)
 assert.doesNotMatch(blocked.stdout,/Fixture USER|VERIFIED/)
})

function diagnosticHarness() {
 const file=acceptancePlan(manifest)[0].file.replace(/fixture-[^\\/]+-USER\.review\.sql$/,'fixture-manifest.test.json')
 const token=sub=>`x.${Buffer.from(JSON.stringify({role:'authenticated',sub,exp:2000000000,iss:'https://fweeyflixnqbvvceuent.supabase.co/auth/v1'})).toString('base64url')}.x`
 const env={PHASE4A_PROJECT_REF:'fweeyflixnqbvvceuent',PHASE4A_LIVE_APPROVAL:'approved-staging-api',PHASE4A_MUTATIONS_APPROVED:'approved-synthetic-only',PHASE4A_MANIFEST:file,PHASE4A_PUBLIC_KEY:'sb_publishable_PRIVATE_SENTINEL',PHASE4A_CONTROL_JWT:token(ids.CONTROL),PHASE4A_SUBJECT_JWT:token(ids.SUBJECT)}
 const io={existsSync:()=>true,realpathSync:p=>p,readFileSync:p=>p===file?JSON.stringify(manifest):fixtureSql(manifest,acceptancePlan(manifest).find(x=>x.file===p).state)}
 return {env,io,now:1800000000000}
}

test('Read-only diagnostic reports missing variable names without reading secrets or invoking HTTP',()=>{
 const result=diagnosticPreflight({}, {existsSync:()=>true})
 assert.equal(result.ok,false)
 for(const name of ['PHASE4A_PROJECT_REF','PHASE4A_MANIFEST','PHASE4A_PUBLIC_KEY','PHASE4A_CONTROL_JWT','PHASE4A_SUBJECT_JWT'])
 assert.ok(result.checks.some(c=>c.name===name&&c.category==='MISSING_VARIABLE'))
 assert.ok(result.checks.some(c=>c.name==='HTTP_CONNECTION'&&c.status==='NOT_RUN'))
})

test('Read-only diagnostic validates manifest/claims/all nine guarded fixture files locally',()=>{
 const {env,io,now}=diagnosticHarness(),result=diagnosticPreflight(env,io,now)
 assert.equal(result.ok,true)
 assert.equal(result.checks.filter(c=>c.name.startsWith('FIXTURE_')&&c.status==='PASS').length,9)
 const output=JSON.stringify(result)
 for(const sensitive of [env.PHASE4A_PUBLIC_KEY,env.PHASE4A_CONTROL_JWT,env.PHASE4A_SUBJECT_JWT,env.PHASE4A_MANIFEST,ids.CONTROL,ids.SUBJECT])
 assert.ok(!output.includes(sensitive))
})

test('Diagnostic categorizes target, key, JWT, expiry and optional-session failures without their values',()=>{
 for(const [name,value,category] of [
 ['PHASE4A_PROJECT_REF','PRIVATE_WRONG_TARGET','TARGET_MISMATCH'],
 ['PHASE4A_PUBLIC_KEY','sb_secret_PRIVATE_SENTINEL','PUBLIC_KEY_FORMAT_OR_PRIVILEGED_KEY_REJECTED'],
 ['PHASE4A_CONTROL_JWT','PRIVATE_INVALID_JWT','JWT_FORMAT_ROLE_OR_SUBJECT_MISMATCH'],
 ['PHASE4A_SESSION_APPROVED','PRIVATE_WRONG_ACK','ACKNOWLEDGEMENT_MISMATCH'],
 ]) {
 const {env,io,now}=diagnosticHarness();env[name]=value
 const result=diagnosticPreflight(env,io,now)
 assert.equal(result.ok,false);assert.ok(result.checks.some(c=>c.name===name&&c.category===category))
 assert.ok(!JSON.stringify(result).includes(value))
 }
 const {env,io}=diagnosticHarness()
 const expired=diagnosticPreflight(env,io,2100000000000)
 assert.ok(expired.checks.some(c=>c.category==='JWT_EXPIRED_OR_INVALID_EXPIRY'))
 env.PHASE4A_SESSION_APPROVED='approved-dedicated-session'
 assert.ok(diagnosticPreflight(env,io,1800000000000).checks.some(c=>c.name==='PHASE4A_SUBJECT_REFRESH'&&c.category==='MISSING_VARIABLE'))
})

test('Diagnostic suppresses private filesystem/JSON errors and distinguishes manifest/fixture failures',()=>{
 for(const [replacement,expected] of [
 [()=>{throw Error('PRIVATE_CONNECTION_STRING')},'MANIFEST_UNREADABLE_OR_INVALID_JSON'],
 [()=>'{PRIVATE_JSON','MANIFEST_UNREADABLE_OR_INVALID_JSON'],
 [()=> 'null','MANIFEST_TARGET_RUN_OR_ACTOR_MISMATCH'],
 [()=>JSON.stringify({...manifest,project_reference:'PRIVATE_WRONG_PROJECT'}),'MANIFEST_TARGET_RUN_OR_ACTOR_MISMATCH'],
 ]) {
 const {env,io,now}=diagnosticHarness()
 const result=diagnosticPreflight(env,{...io,readFileSync:replacement},now)
 assert.ok(result.checks.some(c=>c.category===expected))
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_CONNECTION_STRING|PRIVATE_JSON|PRIVATE_WRONG_PROJECT/)
 }
 const {env,io,now}=diagnosticHarness()
 const result=diagnosticPreflight(env,{...io,readFileSync:p=>p===env.PHASE4A_MANIFEST?JSON.stringify(manifest):'PRIVATE_SQL_DRIFT'},now)
 assert.ok(result.checks.some(c=>c.category==='FIXTURE_MISSING_UNREADABLE_REDIRECTED_OR_HASH_DRIFT'))
 assert.doesNotMatch(JSON.stringify(result),/PRIVATE_SQL_DRIFT/)
})

test('Diagnostic CLI cannot combine with live and cannot prompt, fetch or mutate even with credentials set',()=>{
 assert.deepEqual(orchestratorOptions(['--diagnose']),{live:false,startState:'USER',diagnose:true})
 assert.throws(()=>orchestratorOptions(['--diagnose','--live']))
 const {env}=diagnosticHarness()
 const preload='globalThis.fetch=()=>{console.log("UNEXPECTED_NETWORK");throw Error("NO_NETWORK")}'
 const result=spawnSync(process.execPath,['--import',`data:text/javascript,${encodeURIComponent(preload)}`,'scripts/run-phase4a-acceptance.mjs','--diagnose'],{encoding:'utf8',env:{PATH:process.env.PATH,...env}})
 assert.equal(result.status,1) // synthetic manifest path does not exist on disk
 assert.match(result.stdout,/HTTP=NOT_RUN; SQL=NOT_RUN; MUTATION=NOT_RUN/)
 assert.doesNotMatch(result.stdout+result.stderr,/UNEXPECTED_NETWORK|PRIVATE_SENTINEL|Type COMMITTED|After successful/)
})
test('Default entrypoint performs no live operation even if approval env is set',()=>{
 const result=spawnSync(process.execPath,['scripts/test-phase4a-api.mjs'],{encoding:'utf8',env:{PATH:process.env.PATH}})
 assert.equal(result.status,0);assert.match(result.stdout,/NOT_RUN/)
})
test('Wrong project, unknown actor and unknown state are rejected before SQL is prepared',()=>{
 assert.throws(()=>validateManifest({...manifest,project_reference:'wrong'}))
 assert.throws(()=>validateManifest({...manifest,actors:[...manifest.actors,{label:'EXTRA',user_id:ids.SUBJECT}]}))
 assert.throws(()=>fixtureSql(manifest,'UNKNOWN'))
 assert.throws(()=>fixtureSql(manifest,'RV',true))
 assert.doesNotMatch(fixtureSql(manifest,'USER'),/DELETE FROM public\.staff_profiles/)
})
test('Report identities are deterministic, isolated per case/run, fresh collision guarded',()=>{
 assert.equal(new Set(reportCases.map(x=>reportId(manifest.run_id,x))).size,reportCases.length)
 assert.notEqual(reportId('different','race'),reportId(manifest.run_id,'race'))
 const sql=fixtureSql(manifest,'CROSS_RV',true)
 assert.match(sql,/Report collision/);assert.match(sql,/Fixture approval missing/);assert.match(sql,/COMMIT;\r?\n$/)
 assert.doesNotMatch(sql,/ON CONFLICT|INSERT INTO auth\.users/)
})
test('Privileged keys rejected; client transport has no redirects and deadline',async()=>{
 const jwt=role=>`x.${Buffer.from(JSON.stringify({role})).toString('base64url')}.x`
 assert.throws(()=>publicKey(jwt('service_role')));assert.throws(()=>publicKey('sb_secret_bad'))
 const actor=(role,sub)=>`x.${Buffer.from(JSON.stringify({role,sub})).toString('base64url')}.x`
 assert.throws(()=>actorToken(actor('service_role',ids.CONTROL),ids.CONTROL))
 assert.throws(()=>actorToken(actor('authenticated',ids.SUBJECT),ids.CONTROL))
 assert.equal(publicKey(jwt('anon')),jwt('anon'))
 let captured
 const api=client('public','token',async(url,options)=>{captured={url,options};return {status:200,json:async()=>[]}})
 await api('/rest/v1/roles?select=code')
 assert.ok(captured.url.startsWith('https://fweeyflixnqbvvceuent.supabase.co/'))
 assert.equal(captured.options.redirect,'error');assert.ok(captured.options.signal)
})
function mockA({leak=false,writeCode='42501'}={}) {
 const all=['information_manager','mitigation_editor','report_verifier','super_admin']
 const actor=label=>async(route,method='GET')=>{
 if(method!=='GET') return {status:403,data:{code:writeCode}}
 if(route==='/auth/v1/user') return {status:200,data:{id:ids[label]}}
 const url=new URL(route,'http://local'),table=url.pathname.split('/').at(-1)
 if(table==='roles') return {status:200,data:url.searchParams.has('code')?[{id:'role-id',code:'report_verifier'}]:(label==='CONTROL'?all:['report_verifier']).map(code=>({code}))}
 const field=table==='staff_profiles'?'user_id':'staff_id',foreign=url.searchParams.get(field)!==`eq.${ids[label]}`
 const count=foreign?(label==='CONTROL'||leak?1:0):1
 return {status:200,data:Array.from({length:count},()=>table==='staff_profiles'?{user_id:ids[label],is_active:true}:{staff_id:ids[label]})}
 }
 return {CONTROL:actor('CONTROL'),SUBJECT:actor('SUBJECT'),ANON:async()=>({status:401,data:{code:'42501'}})}
}
test('A oracle accepts limited-role reads but catches foreign-row leakage',async()=>{
 await testA(mockA(),ids,'RV',false)
 await assert.rejects(()=>testA(mockA({leak:true}),ids,'RV',false))
})
test('Constraint errors cannot masquerade as authorization denial',async()=>{
 await assert.rejects(()=>testA(mockA({writeCode:'23505'}),ids,'RV',true))
})

test('Read-only A never dispatches POST/PATCH/DELETE in any fixture state, including report checks',async()=>{
 for(const state of Object.keys(states)) {
 const snapshot=fixtureSnapshot(manifest,state),apis={}
 for(const label of ['CONTROL','SUBJECT']) apis[label]=async(route,method='GET')=>{
 assert.equal(method,'GET',`${state}: mutation without approval`)
 if(route==='/auth/v1/user') return {status:200,data:{id:ids[label]}}
 const url=new URL(route,'http://local'),table=url.pathname.split('/').at(-1)
 const own=snapshot.find(p=>p.user_id===ids[label]),superuser=own?.is_active&&own.role_codes.includes('super_admin')
 if(table==='roles') return {status:200,data:(superuser?['information_manager','mitigation_editor','report_verifier','super_admin']:own?.is_active?own.role_codes:[]).map(code=>({code}))}
 if(table==='public_reports') return {status:200,data:superuser||(own?.is_active&&own.role_codes.includes('report_verifier'))?[{id:reportId(manifest.run_id,'valid')}]:[]}
 const field=table==='staff_profiles'?'user_id':'staff_id',uid=url.searchParams.get(field)?.slice(3)
 const profile=snapshot.find(p=>p.user_id===uid)
 const visible=profile&&(uid===ids[label]||superuser)
 return {status:200,data:!visible?[]:table==='staff_profiles'?[profile]:profile.role_codes.map(()=>({staff_id:uid}))}
 }
 apis.ANON=async(route,method='GET')=>{assert.equal(method,'GET');return {status:401,data:{code:'42501'}}}
 await testA(apis,ids,state,false,manifest.run_id)
 }
})

test('Fixture transitions require exact source snapshot and preserve identical-state assignments',()=>{
 for(const state of Object.keys(states)) {
 const sql=fixtureSql(manifest,state)
 assert.match(sql,/Profile\/assignment state drift/)
 assert.match(sql,/LOCK TABLE public.staff_profiles,public.staff_role_assignments/)
 assert.match(sql,/IF current_setting\('rekansiaga.fixture_noop'\)::boolean THEN RETURN/)
 assert.doesNotMatch(sql,/ON CONFLICT|DELETE FROM public\.staff_profiles/)
 }
})
test('B refuses reused fixtures before dispatching any report mutation',async()=>{
 let writes=0
 const api=label=>async(route,method='GET')=>{
 if(method!=='GET') {writes++;throw Error('Unexpected write')}
 if(route==='/auth/v1/user') return {status:200,data:{id:ids[label]}}
 if(route.startsWith('/rest/v1/roles')) return {status:200,data:[{code:'report_verifier'}]}
 return {status:200,data:[{status:'verified'}]}
 }
 await assert.rejects(()=>testB({CONTROL:api('CONTROL'),SUBJECT:api('SUBJECT')},ids,manifest.run_id))
 assert.equal(writes,0)
})

function mockB(corruptRace=false) {
 const reports=new Map(reportCases.map(label=>[reportId(manifest.run_id,label),{
 id:reportId(manifest.run_id,label),status:label==='terminal'?'verified':'unverified',reviewed_by:null,reviewed_at:null,
 }]))
 const histories=new Map([...reports.keys()].map(id=>[id,[]]))
 const actor=label=>async(route,method='GET',body)=>{
 if(route==='/auth/v1/user') return {status:200,data:{id:ids[label]}}
 const url=new URL(route,'http://local'),table=url.pathname.split('/').at(-1)
 if(table==='roles') return {status:200,data:[{code:'report_verifier'}]}
 if(method==='GET') {
 const id=(url.searchParams.get(table==='public_reports'?'id':'report_id')||'').slice(3)
 return {status:200,data:structuredClone(table==='public_reports'?(reports.has(id)?[reports.get(id)]:[]):histories.get(id)||[])}
 }
 assert.equal(table,'review_public_report')
 const {p_report_id:id,p_new_status:status,p_reason:reason=null}=body
 const error=()=>({status:400,data:{code:'22023'}})
 if(!id||!['under_review','verified','rejected'].includes(status)||
 (reason!==null&&(!/\S/u.test(reason)||[...trimReason(reason)].length>4000))) return error()
 const r=reports.get(id)
 if(!r) return {status:200,data:false}
 if(!((r.status==='unverified')||(r.status==='under_review'&&status!=='under_review'))) return error()
 const from=r.status
 r.status=status;r.reviewed_by=ids[label];r.reviewed_at='2026-10-23T00:00:00Z'
 const h={from_status:from,to_status:status,changed_by:ids[label],reason:reason===null?null:trimReason(reason)}
 if(corruptRace&&id===reportId(manifest.run_id,'race')) {r.reviewed_by=ids.SUBJECT;h.changed_by=ids.SUBJECT}
 histories.get(id).push(h)
 return {status:200,data:true}
 }
 return {CONTROL:actor('CONTROL'),SUBJECT:actor('SUBJECT'),ANON:async()=>({status:401,data:{code:'42501'}})}
}

test('B oracle covers transitions/history and rejects race attribution to the losing actor',async()=>{
 await testB(mockB(),ids,manifest.run_id)
 await assert.rejects(()=>testB(mockB(true),ids,manifest.run_id))
})
test('Release copies retain canonical A policy / B row lock and prohibit auth writes',()=>{
 const dir='docs/sql/staging/security-completion/'
 for(const file of fs.readdirSync(dir).filter(x=>x.includes('deploy-review'))) {
 const sql=fs.readFileSync(dir+file,'utf8');assert.match(sql,/COMMIT;\r?\n$/)
 assert.match(sql,/fweeyflixnqbvvceuent/);assert.match(sql,/release_approval/)
 assert.doesNotMatch(sql,/INSERT INTO auth\.|DISABLE ROW LEVEL SECURITY|DROP TABLE/)
 }
 const b=fs.readFileSync(dir+'02-b-deploy-review.sql','utf8');assert.match(b,/FOR UPDATE/);assert.match(b,/p_new_status IS NULL/)
 assert.match(b,/a_acceptance/);assert.match(b,/b_contract/)
 const c=fs.readFileSync(dir+'03-c1-deploy-review.sql','utf8');assert.match(c,/b_acceptance/);assert.match(c,/c1_other_defaults/)
})

test('Unicode length boundary uses code points rather than JavaScript UTF-16 units',()=>{
 assert.equal(boundaryReason(4000).length,8000)
 assert.equal([...boundaryReason(4000)].length,4000)
 assert.equal([...boundaryReason(4001)].length,4001)
})

test('Approved reason contract measures after ASCII whitespace trim and preserves interior text',()=>{
 assert.equal([...trimReason(' \t\r\n\f\v'+boundaryReason(4000)+'\n ')].length,4000)
 assert.equal(trimReason(' \t a\n b \v'),'a\n b')
 const dir='docs/sql/staging/security-completion/'
 const release=fs.readFileSync(dir+'02-b-deploy-review.sql','utf8')
 const proposal=fs.readFileSync('docs/sql/proposals/phase4a-02-review-rpc-execute.sql','utf8')
 const body=sql=>sql.split('AS $function$')[1].split('$function$;')[0].replace(/\r/g,'')
 assert.equal(body(release),body(proposal))
 assert.match(body(release),/v_reason := pg_catalog\.btrim/)
 assert.match(body(release),/char_length\(v_reason\) > 4000/)
 assert.ok(body(release).indexOf('v_reason :=')<body(release).indexOf('char_length(v_reason)'))
 const digest=createHash('md5').update(body(release)).digest('hex')
 for(const name of ['02-b-deploy-review.sql','02-b-atomicity-regression.sql','03-c1-deploy-review.sql','04-stage-validation-readonly.sql'])
 assert.ok(fs.readFileSync(dir+name,'utf8').includes(digest),name)
})

test('C1 executable SQL changes only postgres/public defaults and preserves global inheritance',()=>{
 for(const name of ['docs/sql/staging/security-completion/03-c1-deploy-review.sql','docs/sql/proposals/phase4a-03-future-object-defaults.sql']) {
 const sql=fs.readFileSync(name,'utf8')
 const defaults=sql.match(/ALTER DEFAULT PRIVILEGES[\s\S]*?;/g)||[]
 assert.equal(defaults.length,3)
 for(const stmt of defaults) assert.match(stmt,/FOR ROLE postgres IN SCHEMA public\s+REVOKE/)
 assert.doesNotMatch(sql,/postgres-public-and-global-functions-approved/)
 }
 const probe=fs.readFileSync('docs/sql/staging/security-completion/03-c1-regression.sql','utf8')
 assert.match(probe,/Explicit application function revoke failed/)
 assert.match(probe,/Non-public function global inheritance drift/)
})

test('Fixture recovery quarantines exact known synthetic state without deleting evidence or Auth',()=>{
 for(const state of Object.keys(states)) {
 const sql=recoverySql(manifest,state)
 assert.match(sql,/Recovery fixture drift/)
 assert.match(sql,/verified_ref/)
 assert.match(sql,/SET is_active=false/)
 assert.doesNotMatch(sql,/DELETE FROM (auth\.|public\.(staff_profiles|public_reports|report_status_history))/)
 assert.match(sql,/COMMIT;\r?\n$/)
 }
 assert.throws(()=>recoverySql(manifest,'EMPTY'))
 assert.throws(()=>recoverySql(manifest,'UNKNOWN'))
})

test('No-profile B preparation refuses inbound references before deleting only synthetic SUBJECT profile',()=>{
 const sql=recoverySql(manifest,'CROSS_RV',true)
 assert.match(sql,/SUBJECT profile referenced; preserve audit\/business data, restore refused/)
 assert.match(sql,/LOCK TABLE %s IN SHARE MODE/)
 assert.match(sql,/Unexpected profile FK; no automatic restore/)
 assert.ok(sql.indexOf('IF referenced THEN')<sql.indexOf('DELETE FROM public.staff_profiles'))
 assert.match(sql,new RegExp(`DELETE FROM public.staff_profiles WHERE user_id='${ids.SUBJECT}'`))
 assert.doesNotMatch(sql,/DELETE FROM (auth\.|public\.(public_reports|report_status_history))/)
 assert.match(sql,/IF actual=recovered THEN RETURN/)
})

test('Invocation rejects invalid state/target/approval before network or session mutation',()=>{
 const env={PHASE4A_LIVE_APPROVAL:'approved-staging-api',PHASE4A_PROJECT_REF:'fweeyflixnqbvvceuent'}
 assert.equal(validateInvocation(['A','USER','--live'],env).mutations,false)
 for(const args of [['A','BAD','--live'],['B','--live'],['SESSION','--live'],['A','USER','--unsafe','--live'],['B','--with-report-fixtures','--live']])
 assert.throws(()=>validateInvocation(args,env))
 assert.throws(()=>validateInvocation(['A','USER','--live'],{...env,PHASE4A_PROJECT_REF:'rekansiaga-dev'}))
})

test('Case evidence reports labels/status only and propagates failures',async()=>{
 const evidence=[],emit=(name,status)=>evidence.push({name,status})
 await runCase('safe-case',async()=>{},emit)
 await assert.rejects(()=>runCase('bad-case',async()=>{throw Error('PRIVATE SENTINEL')},emit))
 assert.deepEqual(evidence,[{name:'safe-case',status:'PASS'},{name:'bad-case',status:'FAIL'}])
 assert.doesNotMatch(JSON.stringify(evidence),/PRIVATE SENTINEL/)
 const bEvidence=[]
 await testB(mockB(),ids,manifest.run_id,(name,status)=>bEvidence.push({name,status}))
 assert.ok(bEvidence.some(x=>x.name==='B-accept-trimmed4000'&&x.status==='PASS'))
 assert.ok(bEvidence.some(x=>x.name==='B-observed-lock-contention'&&x.status==='BLOCKED'))
})

// Bounded lexical boundary checks only; this is not a PostgreSQL parser.
function statements(sql) {
 const parts=[];let buf='';let i=0
 while(i<sql.length) {
  if(sql.startsWith('--',i)) {const end=sql.indexOf('\n',i);i=end<0?sql.length:end;buf+=' ';continue}
  if(sql.startsWith('/*',i)) {let depth=1;i+=2;while(depth&&i<sql.length) {if(sql.startsWith('/*',i)){depth++;i+=2}else if(sql.startsWith('*/',i)){depth--;i+=2}else i++}assert.equal(depth,0);buf+=' ';continue}
  const tag=sql.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/)?.[0]
  if(tag){const end=sql.indexOf(tag,i+tag.length);assert.notEqual(end,-1);buf+=' quoted ';i=end+tag.length;continue}
  if(sql[i]==="'"||sql[i]==='"'){const quote=sql[i++];let closed=false;while(i<sql.length){if(sql[i]===quote){if(sql[i+1]===quote){i+=2;continue}i++;closed=true;break}i++}assert.ok(closed);buf+=' quoted ';continue}
  if(sql[i]===';'){if(buf.trim())parts.push(buf.trim());buf='';i++;continue}
  buf+=sql[i++]
 }
 assert.equal(buf.trim(),'');return parts
}
test('All SQL release/regression files have one outer transaction and expected final boundary',()=>{
 const dir='docs/sql/staging/security-completion/'
 for(const file of fs.readdirSync(dir).filter(x=>x.endsWith('.sql'))) {
 const parts=statements(fs.readFileSync(dir+file,'utf8'))
 assert.equal(parts.filter(x=>/^BEGIN\b/.test(x)).length,1,file)
 const permanent=/deploy-review|01-a-rollback|02-b-recovery/.test(file)
 assert.equal(parts.at(-1),permanent?'COMMIT':'ROLLBACK',file)
 assert.equal(parts.filter(x=>/^COMMIT$|^ROLLBACK$/.test(x)).length,1,file)
 }
 const sql=fixtureSql(manifest,'CROSS_RV',true),parts=statements(sql)
 assert.equal(parts.at(-1),'COMMIT');assert.equal(parts.filter(x=>/^BEGIN\b/.test(x)).length,1)
 const recoveryParts=statements(recoverySql(manifest,'CROSS_RV'))
 assert.equal(recoveryParts.at(-1),'COMMIT');assert.equal(recoveryParts.filter(x=>/^BEGIN\b/.test(x)).length,1)
 const restoreParts=statements(recoverySql(manifest,'CROSS_RV',true))
 assert.equal(restoreParts.at(-1),'COMMIT');assert.equal(restoreParts.filter(x=>/^BEGIN\b/.test(x)).length,1)
})

test('Existing stage validator offers strict USER/NO_ROLE readonly snapshot, effects and actor/role evidence',()=>{
 const sql=fs.readFileSync('docs/sql/staging/security-completion/04-stage-validation-readonly.sql','utf8')
 assert.match(sql,/BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY/)
 assert.match(sql,/-- SET LOCAL rekansiaga.validation_fixture_state='USER'/)
 assert.match(sql,/snapshot mismatch; STOP/)
 assert.match(sql,/USER_SNAPSHOT_MATCH/)
 assert.match(sql,/NO_ROLE_SNAPSHOT_MATCH/)
 assert.match(sql,/IM_SNAPSHOT_MATCH/)
 assert.match(sql,/PRIOR_NO_ROLE_PROBES_NO_OBSERVED_EFFECTS/)
 assert.match(sql,/r.code='information_manager'/)
 assert.match(sql,/-- SET LOCAL rekansiaga.validation_fixture_state='NO_ROLE'/)
 assert.match(sql,/PRIOR_USER_PROBES_NO_OBSERVED_EFFECTS/)
 assert.match(sql,/public.report_status_history WHERE changed_by IN/)
 assert.match(sql,/public.public_reports WHERE reviewed_by IN/)
 assert.match(sql,/SELECT count\(\*\) FROM public.staff_profiles\)<>1/)
 assert.match(sql,/SELECT count\(\*\) FROM public.staff_role_assignments\)<>1/)
 assert.match(sql,/r.code='super_admin'/)
 assert.ok(sql.includes(ids.CONTROL)&&sql.includes(ids.SUBJECT))
 assert.match(sql,/LEFT JOIN public.staff_profiles/)
 assert.match(sql,/LEFT JOIN public.staff_role_assignments/)
 assert.doesNotMatch(sql,/\b(?:INSERT INTO|UPDATE public\.|DELETE FROM|ALTER TABLE|CREATE FUNCTION|CALL )/)
 assert.equal(statements(sql).at(-1),'ROLLBACK')
})
