// Operator-assisted SQL commits, real user-JWT HTTP tests. No SQL connection,
// credential files, automatic retries, fixture resets, or migration execution.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline/promises'
import { states,fixtureSql,fixtureSnapshot,validateManifest } from './prepare-phase4a-fixture.mjs'
import { actorToken,publicKey,client,testA,runCase,sessions,validateInvocation } from './test-phase4a-api.mjs'

const projectRef='fweeyflixnqbvvceuent'
const privateDir=path.resolve('docs/qa/phase4a/remediation-a/private')
const stateOrder=Object.freeze(Object.keys(states))
const resumeStates=['USER','NO_ROLE','IM']
const priorResumeState={NO_ROLE:'USER',IM:'NO_ROLE'}
const normalize=sql=>sql.replace(/\r/g,'')
const digest=sql=>createHash('sha256').update(normalize(sql)).digest('hex')
const execution={stage:'local-preflight',httpAttempted:false,mutationAttempted:false,commitPrompted:false,lastHttpStatus:null,networkFailure:null}

// In-memory labels only; distinguishes historical HTTP from current local failure.
export function httpEvidence() {
 let last=null,writesAttempted=0,writesDenied=0,writesSucceeded=0,writesUnresolved=0
 return {
 observe:(state,actor)=>event=>{
 last={state,actor,...event}
 if(event.method!=='GET') {
 if(event.status===null) {writesAttempted++;writesUnresolved++}
 else if(event.status>=400&&event.status<500) {writesDenied++;writesUnresolved--}
 else if(event.status>=200&&event.status<300) {writesSucceeded++;writesUnresolved--}
 }
 },
 summary:()=>({last,writesAttempted,writesDenied,writesSucceeded,writesUnresolved}),
 }
}
const evidence=httpEvidence()

// Local reads only. No fetch, SQL, subprocess, credential-file loading or writes.
// Exception messages/assertion actual/expected values are never returned.
export function diagnosticPreflight(env=process.env,io=fs,now=Date.now()) {
 const checks=[]
 const record=(name,status,category)=>checks.push({name,status,category})
 const check=(name,fn,category)=>{
 try {fn();record(name,'PASS','CONFIG_VALID')} catch {record(name,'BLOCKED',category)}
 }
 check('WORKING_DIRECTORY',()=>assert.ok(io.existsSync(path.resolve('scripts/run-phase4a-acceptance.mjs'))),'WRONG_WORKING_DIRECTORY')
 check('NODE_RUNTIME',()=>assert.ok(typeof fetch==='function'&&typeof AbortSignal.timeout==='function'),'UNSUPPORTED_RUNTIME')
 for(const [name,expected] of Object.entries({PHASE4A_PROJECT_REF:projectRef,PHASE4A_LIVE_APPROVAL:'approved-staging-api',PHASE4A_MUTATIONS_APPROVED:'approved-synthetic-only'})) {
 if(!env[name]) record(name,'BLOCKED','MISSING_VARIABLE')
 else check(name,()=>assert.equal(env[name],expected),name==='PHASE4A_PROJECT_REF'?'TARGET_MISMATCH':'ACKNOWLEDGEMENT_MISMATCH')
 }
 let manifest,ids
 if(!env.PHASE4A_MANIFEST) record('PHASE4A_MANIFEST','BLOCKED','MISSING_VARIABLE')
 else {
 const input=path.resolve(env.PHASE4A_MANIFEST)
 let safePath=false
 try {assert.equal(path.dirname(input),privateDir);assert.equal(io.realpathSync(input),input);safePath=true}
 catch {record('PHASE4A_MANIFEST','BLOCKED','MANIFEST_PATH_MISSING_UNREADABLE_OR_REDIRECTED')}
 if(safePath) {
 let parsed=false
 try {manifest=JSON.parse(io.readFileSync(input,'utf8').replace(/^\uFEFF/,''));parsed=true}
 catch {record('PHASE4A_MANIFEST','BLOCKED','MANIFEST_UNREADABLE_OR_INVALID_JSON')}
 if(parsed) {
 try {ids=validateManifest(manifest);record('PHASE4A_MANIFEST','PASS','MANIFEST_TARGET_RUN_ACTORS_VALID')}
 catch {record('PHASE4A_MANIFEST','BLOCKED','MANIFEST_TARGET_RUN_OR_ACTOR_MISMATCH')}
 }
 }
 }
 if(!env.PHASE4A_PUBLIC_KEY) record('PHASE4A_PUBLIC_KEY','BLOCKED','MISSING_VARIABLE')
 else check('PHASE4A_PUBLIC_KEY',()=>publicKey(env.PHASE4A_PUBLIC_KEY),'PUBLIC_KEY_FORMAT_OR_PRIVILEGED_KEY_REJECTED')
 for(const label of ['CONTROL','SUBJECT']) {
 const name=`PHASE4A_${label}_JWT`,token=env[name]
 if(!token) {record(name,'BLOCKED','MISSING_VARIABLE');continue}
 let claims
 try {
 const parts=token.split('.');assert.equal(parts.length,3)
 claims=JSON.parse(Buffer.from(parts[1],'base64url'))
 assert.equal(claims.role,'authenticated');assert.ok(claims.sub)
 if(ids) actorToken(token,ids[label])
 } catch {record(name,'BLOCKED','JWT_FORMAT_ROLE_OR_SUBJECT_MISMATCH');continue}
 if(!Number.isFinite(claims.exp)||claims.exp*1000<=now) record(name,'BLOCKED','JWT_EXPIRED_OR_INVALID_EXPIRY')
 else if(claims.iss!==`https://${projectRef}.supabase.co/auth/v1`) record(name,'BLOCKED','JWT_ISSUER_TARGET_MISMATCH')
 else record(name,ids?'PASS':'NOT_RUN',ids?'JWT_LOCAL_CLAIMS_VALID_SIGNATURE_NOT_CHECKED':'JWT_ACTOR_CHECK_REQUIRES_VALID_MANIFEST')
 }
 if(env.PHASE4A_SESSION_APPROVED==='approved-dedicated-session') {
 record('PHASE4A_SESSION_APPROVED','PASS','SESSION_ACKNOWLEDGED')
 record('PHASE4A_SUBJECT_REFRESH',env.PHASE4A_SUBJECT_REFRESH?'PASS':'BLOCKED',env.PHASE4A_SUBJECT_REFRESH?'PRESENT_NOT_VERIFIED':'MISSING_VARIABLE')
 } else if(env.PHASE4A_SESSION_APPROVED) record('PHASE4A_SESSION_APPROVED','BLOCKED','ACKNOWLEDGEMENT_MISMATCH')
 else record('PHASE4A_SESSION_APPROVED','NOT_RUN','OPTIONAL_SESSION_DISABLED')
 if(ids) {
 for(const entry of acceptancePlan(manifest)) check(`FIXTURE_${entry.state}`,()=>verifyReviewCopy(entry,io),'FIXTURE_MISSING_UNREADABLE_REDIRECTED_OR_HASH_DRIFT')
 } else record('FIXTURE_FILES','NOT_RUN','REQUIRES_VALID_MANIFEST')
 record('HTTP_CONNECTION','NOT_RUN','LOCAL_ONLY_NO_HTTP')
 record('REMOTE_COMMITTED_STATE','NOT_RUN','NOT_OBSERVED_NO_SQL')
 return {ok:!checks.some(c=>c.status==='BLOCKED'),checks}
}

function printDiagnostic(result) {
 for(const {name,status,category} of result.checks) console.log(`${status} ${name} ${category}`)
 console.log(`${result.ok?'PASS':'BLOCKED'} LOCAL_PREFLIGHT; HTTP=NOT_RUN; SQL=NOT_RUN; MUTATION=NOT_RUN`)
}

export async function diagnoseStagingAuth(env=process.env,io=fs,transport=fetch) {
 const preflight=diagnosticPreflight(env,io)
 if(!preflight.ok) return preflight
 const manifest=JSON.parse(io.readFileSync(path.resolve(env.PHASE4A_MANIFEST),'utf8').replace(/^\uFEFF/,''))
 const ids=validateManifest(manifest),checks=[]
 for(const label of ['CONTROL','SUBJECT']) {
 try {
 const result=await client(publicKey(env.PHASE4A_PUBLIC_KEY),env[`PHASE4A_${label}_JWT`],transport)('/auth/v1/user')
 const valid=result.status===200&&result.data?.id===ids[label]
 checks.push({name:`AUTH_${label}`,status:valid?'PASS':'BLOCKED',category:valid?'STAGING_AUTH_UID_VERIFIED':
 result.status===401?'AUTH_SESSION_REJECTED_401':result.status===200?'AUTH_UID_MISMATCH':`AUTH_HTTP_${result.status}`})
 } catch {checks.push({name:`AUTH_${label}`,status:'BLOCKED',category:'AUTH_NETWORK_OR_RESPONSE_FAILURE'})}
 }
 return {ok:checks.every(c=>c.status==='PASS'),checks}
}

export function acceptancePlan(manifest) {
 validateManifest(manifest)
 return stateOrder.map(state=>({state,
 file:path.join(privateDir,`fixture-${manifest.run_id}-${state}.review.sql`),
 sha256:digest(fixtureSql(manifest,state)),
 commitAck:`COMMITTED ${projectRef} ${state}`,
 }))
}

export function verifyReviewCopy(entry,io=fs) {
 assert.equal(io.realpathSync(entry.file),path.resolve(entry.file),'Review copy must not redirect outside private folder')
 assert.equal(path.dirname(entry.file),privateDir,'Private fixture path required')
 assert.equal(digest(io.readFileSync(entry.file,'utf8')),entry.sha256,'Fixture review copy differs from guarded generator')
}

// Editor-only SQL text, never executed or written. Canonical file stays intact.
export function editorFixture(state,env=process.env,io=fs) {
 assert.ok(stateOrder.includes(state),'Unknown fixture state')
 assert.equal(env.PHASE4A_PROJECT_REF,projectRef,'Staging target required')
 const input=path.resolve(env.PHASE4A_MANIFEST||'')
 assert.equal(path.dirname(input),privateDir,'Private manifest required')
 assert.equal(io.realpathSync(input),input,'Manifest redirect rejected')
 const manifest=JSON.parse(io.readFileSync(input,'utf8').replace(/^\uFEFF/,''))
 const entry=acceptancePlan(manifest).find(e=>e.state===state)
 verifyReviewCopy(entry,io)
 const sql=io.readFileSync(entry.file,'utf8')
 // Verify the very bytes used for the copy, including changes between reads.
 assert.equal(digest(sql),entry.sha256,'Fixture changed while preparing copy')
 return sql.replace("-- SET LOCAL rekansiaga.fixture_release=", "SET LOCAL rekansiaga.fixture_release=")
}

export async function verifyOwnFixture(apis,manifest,state) {
 const ids=validateManifest(manifest),snapshot=fixtureSnapshot(manifest,state)
 for(const label of ['CONTROL','SUBJECT']) {
 const result=await apis[label](`/rest/v1/staff_profiles?select=user_id,display_name,is_active&user_id=eq.${ids[label]}`)
 assert.equal(result.status,200,'Fixture self-profile must be readable')
 const expected=snapshot.filter(p=>p.user_id===ids[label]).map(({user_id,display_name,is_active})=>({user_id,display_name,is_active}))
 assert.deepEqual(result.data,expected,'Committed synthetic profile marker/state mismatch')
 }
}

// No normalization: target/state must remain exact. Never include raw input in
// an AssertionError (it may be a credential pasted at the wrong prompt).
export function requireAcknowledgement(actual,expected) {
 if(actual===expected) return
 const error=new Error('Acknowledgement rejected; input suppressed')
 error.code=typeof actual!=='string'?'ACK_INPUT_UNAVAILABLE':actual.length===0?'ACK_EMPTY':
 actual.trim()===expected?'ACK_OUTER_WHITESPACE':/[^\x20-\x7e]/.test(actual)?'ACK_NON_ASCII_OR_CONTROL':'ACK_TEXT_MISMATCH'
 throw error
}

export async function verifyCommittedUser(apis,manifest,state='USER') {
 assert.ok(resumeStates.includes(state),'Unsupported committed snapshot')
 const ids=validateManifest(manifest)
 const read=async(api,route)=>{
 const result=await api(route)
 assert.equal(result.status,200,'Committed snapshot read must succeed')
 return result.data
 }
 for(const label of ['CONTROL','SUBJECT'])
 assert.equal((await read(apis[label],'/auth/v1/user'))?.id,ids[label],'Verified actor mismatch')
 const expected=fixtureSnapshot(manifest,state).map(({user_id,display_name,is_active})=>({user_id,display_name,is_active}))
 assert.deepEqual(await read(apis.CONTROL,'/rest/v1/staff_profiles?select=user_id,display_name,is_active&order=user_id'),expected,'Committed profiles drift')
 const roles=await read(apis.CONTROL,'/rest/v1/roles?select=id,code&code=eq.super_admin')
 assert.equal(roles.length,1,'Exactly one super_admin role required')
 assert.equal(roles[0].code,'super_admin','Role code mismatch')
 assert.ok(roles[0].id,'Role identity required')
 const expectedAssignments=[{staff_id:ids.CONTROL,role_id:roles[0].id}]
 if(state==='IM') {
 const subjectRoles=await read(apis.CONTROL,'/rest/v1/roles?select=id,code&code=eq.information_manager')
 assert.equal(subjectRoles.length,1,'Exactly one information_manager role required')
 assert.equal(subjectRoles[0].code,'information_manager','Subject role code mismatch')
 assert.ok(subjectRoles[0].id,'Subject role identity required')
 expectedAssignments.unshift({staff_id:ids.SUBJECT,role_id:subjectRoles[0].id})
 }
 assert.deepEqual(await read(apis.CONTROL,'/rest/v1/staff_role_assignments?select=staff_id,role_id&order=staff_id'),
 state==='IM'?expectedAssignments.sort((a,b)=>a.staff_id.localeCompare(b.staff_id)):expectedAssignments,'Committed assignments drift')
 await verifyOwnFixture(apis,manifest,state)
 // HTTP sees only RLS-visible rows. The operator's readonly SQL snapshot is
 // still required to attest the complete database state, including hidden rows.
}

// Injectable boundaries let local tests prove commit/test ordering without any
// network or SQL. Production callbacks below use only the existing JWT runner.
export async function runAcceptanceA({plan,confirmPolicy,confirmCommit,verifyCopy,executeState,
 executeSession=null,startState='USER',resumeCommitted=null,confirmResume=null,verifyCommitted=null,confirmPreviousEffects=null,emit=()=>{}}) {
 assert.deepEqual(plan.map(p=>p.state),stateOrder,'All nine ordered states required')
 const start=stateOrder.indexOf(startState)
 assert.ok(start>=0,'Unknown starting state')
 assert.ok(resumeCommitted===null||(resumeStates.includes(resumeCommitted)&&startState===resumeCommitted&&typeof confirmResume==='function'&&typeof verifyCommitted==='function'),'Guarded committed-state resume required')
 if(priorResumeState[resumeCommitted]) assert.equal(typeof confirmPreviousEffects,'function','Previous denial/effects review required')
 const completed=[]
 let current='preflight',sessionStarted=false
 try {
 // Validate every local artifact BEFORE asking for the first remote action.
 for(const entry of plan) await verifyCopy(entry)
 requireAcknowledgement(await confirmPolicy(),`VERIFIED ${projectRef} A-POLICY`)
 emit('A-policy-review','PASS') // operator attestation, not independent SQL proof
 for(const entry of plan.slice(0,start)) emit(`A-${entry.state}`,'NOT_RUN')
 for(const entry of plan.slice(start)) {
 current=entry.state
 await verifyCopy(entry)
 if(entry.state===resumeCommitted) {
 requireAcknowledgement(await confirmResume(entry),`VERIFIED ${projectRef} ${entry.state}-COMMITTED-READONLY`)
 if(priorResumeState[entry.state]) requireAcknowledgement(await confirmPreviousEffects(),`VERIFIED ${projectRef} ${priorResumeState[entry.state]}-DENIALS-NO-EFFECTS`)
 await verifyCopy(entry)
 await verifyCommitted(entry.state)
 emit(`A-${entry.state}-committed-readonly`,'PASS')
 } else requireAcknowledgement(await confirmCommit(entry),entry.commitAck)
 await verifyCopy(entry)
 await executeState(entry.state)
 completed.push(entry.state)
 emit(`A-${entry.state}`,'PASS')
 }
 if(completed.includes('MULTI')&&completed.includes('INACTIVE')) emit('A-same-JWT-DB-revocation','PASS')
 else emit('A-same-JWT-DB-revocation','NOT_RUN')
 if(executeSession) {current='refresh-logout';sessionStarted=true;await executeSession()}
 else emit('A-refresh-logout','BLOCKED')
 emit('A-all-nine-states',completed.length===stateOrder.length?'PASS':'BLOCKED')
 emit('A-UI-metadata-smoke','BLOCKED')
 emit('Phase4A-security-gate','BLOCKED')
 return {completed,allStatesPassed:completed.length===stateOrder.length,sessionRun:executeSession!==null}
 } catch(error) {
 emit(`A-${current||'preflight'}`,'FAIL')
 for(const entry of plan.slice(start)) if(entry.state!==current&&!completed.includes(entry.state)) emit(`A-${entry.state}`,'NOT_RUN')
 if(!sessionStarted) emit('A-refresh-logout','NOT_RUN')
 emit('A-recovery-review-required','BLOCKED')
 throw error // main deliberately discards exception details/private response data
 }
}

export function orchestratorOptions(args) {
 const allowed=new Set(['--live','--from','--diagnose','--diagnose-auth','--resume-committed','--editor-fixture'])
 let startState='USER',resumeCommitted=null,editorState=null
 const seen=new Set()
 for(let i=0;i<args.length;i++) {
 assert.ok(allowed.has(args[i]),'Unknown option')
 assert.ok(!seen.has(args[i]),'Duplicate option');seen.add(args[i])
 if(args[i]==='--from') {startState=args[++i];assert.ok(stateOrder.includes(startState),'Unknown starting state')}
 else if(args[i]==='--resume-committed') {resumeCommitted=args[++i];assert.ok(resumeStates.includes(resumeCommitted),'Unsupported committed resume state')}
 else if(args[i]==='--editor-fixture') {editorState=args[++i];assert.ok(stateOrder.includes(editorState),'Unknown editor fixture state')}
 }
 assert.ok(!(args.includes('--diagnose')&&args.includes('--live')),'Diagnostic cannot run live')
 if(seen.has('--diagnose-auth')) assert.equal(args.length,1,'Auth diagnostic is standalone and GET-only')
 if(editorState) assert.equal(args.length,2,'Editor fixture copy is standalone, never live')
 if(resumeCommitted) {
 assert.ok(seen.has('--live')&&!seen.has('--from')&&!seen.has('--diagnose'),'Committed resume requires live, no from/diagnose')
 startState=resumeCommitted
 }
 return {live:args.includes('--live'),startState,...(resumeCommitted?{resumeCommitted}:{}),...(args.includes('--diagnose')?{diagnose:true}:{}),...(seen.has('--diagnose-auth')?{diagnoseAuth:true}:{}),...(editorState?{editorState}:{})}
}

async function main() {
 const {live,startState,diagnose,diagnoseAuth,editorState,resumeCommitted=null}=orchestratorOptions(process.argv.slice(2))
 if(editorState) {process.stdout.write(editorFixture(editorState));return}
 if(diagnoseAuth) {
 const result=await diagnoseStagingAuth()
 for(const {name,status,category} of result.checks) console.log(`${status} ${name} ${category}`)
 console.log(`${result.ok?'PASS':'BLOCKED'} AUTH_DIAGNOSTIC; GET_ONLY; SQL=NOT_RUN; MUTATION=NOT_RUN`)
 if(!result.ok) process.exitCode=1
 return
 }
 if(diagnose) {
 const result=diagnosticPreflight();printDiagnostic(result)
 if(!result.ok) process.exitCode=1
 return
 }
 if(!live) {
 console.log(`NOT_RUN Acceptance A: ${stateOrder.join(' -> ')}; no files/credentials read, no network or SQL`)
 console.log('Use --live only with approved staging process environment and a verified SQL Editor session.')
 return
 }
 const preflight=diagnosticPreflight()
 if(!preflight.ok) {printDiagnostic(preflight);process.exitCode=1;return}
 validateInvocation(['A',startState,'--live'],process.env)
 assert.equal(process.env.PHASE4A_MUTATIONS_APPROVED,'approved-synthetic-only','Full A requires negative-write approval')
 const input=path.resolve(process.env.PHASE4A_MANIFEST||'')
 assert.equal(path.dirname(input),privateDir,'Existing private manifest required')
 assert.equal(fs.realpathSync(input),input,'Manifest must not redirect outside private folder')
 const manifest=JSON.parse(fs.readFileSync(input,'utf8').replace(/^\uFEFF/,'')),ids=validateManifest(manifest)
 const key=publicKey(process.env.PHASE4A_PUBLIC_KEY)
 // Capture once: fixture changes never replace/refresh the actor JWTs mid-run.
 const tokens={CONTROL:actorToken(process.env.PHASE4A_CONTROL_JWT,ids.CONTROL),SUBJECT:actorToken(process.env.PHASE4A_SUBJECT_JWT,ids.SUBJECT)}
 const transport=async(url,options)=>{
 execution.httpAttempted=true
 if(options.method!=='GET') execution.mutationAttempted=true
 try {
 const response=await fetch(url,options);execution.lastHttpStatus=response.status;return response
 } catch(error) {
 const code=error?.cause?.code
 execution.networkFailure=['ENOTFOUND','EAI_AGAIN','ECONNREFUSED','ECONNRESET','ETIMEDOUT'].includes(code)?code:
 ['TimeoutError','AbortError'].includes(error?.name)?'TIMEOUT_OR_ABORT':'NETWORK_FAILURE'
 throw error
 }
 }
 const observe=actor=>event=>evidence.observe(execution.state||'PREFLIGHT',actor)(event)
 const apis={CONTROL:client(key,tokens.CONTROL,transport,observe('CONTROL')),SUBJECT:client(key,tokens.SUBJECT,transport,observe('SUBJECT')),ANON:client(key,null,transport,observe('ANON'))}
 const doSession=process.env.PHASE4A_SESSION_APPROVED==='approved-dedicated-session'
 if(doSession) validateInvocation(['SESSION','--live'],process.env)
 const emit=(name,status)=>console.log(`${status} ${name}${name==='A-policy-review'?' (operator attestation; not independent SQL verification)':''}`)
 const ui=createInterface({input:process.stdin,output:process.stdout})
 try {
 console.log(`Acceptance A ref=${projectRef} run=${manifest.run_id} at=${new Date().toISOString()}`)
 console.log('SQL is executed only by the operator. Do not enter credentials at prompts. STOP on SQL error/timeout; never acknowledge an unconfirmed COMMIT.')
 await runAcceptanceA({plan:acceptancePlan(manifest),startState,resumeCommitted,emit,
 verifyCopy:entry=>{execution.stage='fixture-file-integrity';execution.state=entry.state;verifyReviewCopy(entry)},
 confirmPolicy:async()=>{
 execution.stage='policy-acknowledgement'
 console.log('Run docs/sql/staging/security-completion/04-stage-validation-readonly.sql stage A in the verified staging Dashboard. Compare exact policy expression with existing A release; do not redeploy A.')
 return ui.question(`After successful target/policy/helper/grants review, type VERIFIED ${projectRef} A-POLICY: `)
 },
 confirmCommit:async entry=>{
 execution.stage='fixture-commit-acknowledgement';execution.commitPrompted=true
 console.log(`Fixture ${entry.state}: ${path.relative(process.cwd(),entry.file)} SHA256-LF=${entry.sha256}`)
 console.log(`Verify Dashboard ${projectRef}; execute ONLY this full guarded fixture in SQL Editor, enabling its approved acknowledgement in an editor copy. Wait for COMMIT; do not run the next fixture.`)
 console.log('Keep the local .sql file unchanged. Uncomment fixture_release ONLY in the SQL Editor copy; editing the local file while this prompt waits will FAIL integrity verification.')
 console.log(`Alternatively, in a second configured PowerShell: node scripts/run-phase4a-acceptance.mjs --editor-fixture ${entry.state} | Set-Clipboard ; paste into SQL Editor. This only copies SQL, never executes it.`)
 return ui.question(`Type ${entry.commitAck}: `)
 },
 confirmResume:async entry=>{
 execution.stage='committed-state-readonly-acknowledgement';execution.commitPrompted=true
 console.log(`Do NOT rerun ${entry.state} fixture. Verify current ${entry.state} with 04-stage-validation-readonly.sql, validation_stage=A and validation_fixture_state=${entry.state}, in the verified staging Dashboard. Require ${entry.state}_SNAPSHOT_MATCH and completed ROLLBACK. Counts alone are insufficient.`)
 return ui.question(`Type VERIFIED ${projectRef} ${entry.state}-COMMITTED-READONLY: `)
 },
 confirmPreviousEffects:async()=>{
 execution.stage='previous-effects-review'
 const prior=priorResumeState[resumeCommitted]
 console.log(`Require prior PASS A-${prior} (both actor denial suites and anonymous denial), matching ${resumeCommitted} snapshot and readonly probe-effects checks. If any prior write was successful/unknown, STOP. This is operator attestation, not automatic audit-log proof.`)
 return ui.question(`Type VERIFIED ${projectRef} ${prior}-DENIALS-NO-EFFECTS: `)
 },
 verifyCommitted:async state=>{
 execution.stage='committed-state-readonly-http'
 await verifyCommittedUser(apis,manifest,state)
 },
 executeState:async state=>{
 execution.stage='fixture-state-and-authorization'
 await runCase(`A-${state}-synthetic-marker`,()=>verifyOwnFixture(apis,manifest,state),emit)
 const parts=tokens.SUBJECT.split('.')
 const claims=JSON.parse(Buffer.from(parts[1],'base64url'))
 const forged=[parts[0],Buffer.from(JSON.stringify({...claims,sub:ids.CONTROL,role:'service_role'})).toString('base64url'),parts[2]].join('.')
 await runCase(`A-${state}-forged-JWT`,async()=>assert.equal((await client(key,forged,transport,observe('FORGED'))('/rest/v1/roles?select=code')).status,401),emit)
 await testA(apis,ids,state,true,null,emit)
 },
 executeSession:doSession?()=>{execution.stage='session-refresh-logout';return runCase('A-refresh-logout',()=>sessions(key,tokens.SUBJECT,process.env.PHASE4A_SUBJECT_REFRESH,ids.SUBJECT,transport),emit)}:null,
 })
 } finally {ui.close()}
 console.log('Completed bounded A run. Phase4A remains BLOCKED pending runtime gates; no B/C1 migration or automatic cleanup executed.')
 }
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 main().catch(error=>{
 const inputCategory=['ACK_INPUT_UNAVAILABLE','ACK_EMPTY','ACK_OUTER_WHITESPACE','ACK_NON_ASCII_OR_CONTROL','ACK_TEXT_MISMATCH'].includes(error?.code)?error.code:
 error?.code==='ERR_USE_AFTER_CLOSE'?'ACK_INPUT_CLOSED':null
 if(inputCategory) console.error(`BLOCKED acknowledgement=${inputCategory}; raw input suppressed; exact target/state required`)
 const history=evidence.summary()
 if(history.last) console.error(`LAST_HTTP state=${history.last.state} actor=${history.last.actor} operation=${history.last.operation} status=${history.last.status??'NOT_OBSERVED'}; historical, not necessarily failing operation`)
 console.error(`WRITE_ATTEMPTS=${history.writesAttempted} WRITE_HTTP_DENIED=${history.writesDenied} WRITE_HTTP_SUCCESS=${history.writesSucceeded} WRITE_UNRESOLVED=${history.writesUnresolved}; response classifications, not database rollback proof`)
 console.error(`BLOCKED category=${execution.networkFailure||execution.stage} HTTP_STATUS=${execution.lastHttpStatus??'NOT_OBSERVED'} HTTP_ATTEMPTED=${execution.httpAttempted?'YES':'NO'} MUTATION_ATTEMPTED=${execution.mutationAttempted?'YES':'NO'} OPERATOR_COMMIT_POSSIBLE=${execution.commitPrompted?'YES':'NO'}. Private error details suppressed.`)
 console.error(execution.httpAttempted||execution.commitPrompted?'STOP: verify committed fixture/database/session state before any live retry. No automatic recovery or cleanup.':'No HTTP or fixture-commit prompt reached. Run --diagnose to inspect local configuration without network or writes.')
 process.exitCode=1
 })
}
