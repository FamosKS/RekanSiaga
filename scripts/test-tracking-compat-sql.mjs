// Only the new tracking predicate is exercised in disposable local PostgreSQL.
// No A-D release replay, Supabase connection, external service or Cloud writes.
import assert from 'node:assert/strict'
import { readFileSync,writeFileSync } from 'node:fs'
import { PGlite } from '../.tools/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js'
const db=await PGlite.create()
const evidence={kind:'LOCAL PostgreSQL/WASM tracking compatibility only; not LIVE',cloudRequests:0,checks:[]}
const read=p=>readFileSync(p,'utf8')
const patch=read('supabase/releases/dev-e-tracking-rpt.PROPOSED.sql')
const rollback=read('supabase/releases/dev-e-tracking-rpt-rollback.PROPOSED.sql')
const release=read('supabase/releases/dev-live-admin.sql')
const start=release.indexOf('CREATE FUNCTION public.track_report_v1(')
const baseline=release.slice(start,release.indexOf('$track$;',start)+8)
const track=async(code,token='a'.repeat(64))=>(await db.query('SELECT public.track_report_v1($1,$2) AS result',[code,token])).rows[0].result
const snapshot=async()=>(await db.query(`SELECT proacl::text AS acl,proowner,prosecdef FROM pg_proc WHERE oid='public.track_report_v1(text,text)'::regprocedure`)).rows[0]
const check=async(name,fn)=>{await fn();evidence.checks.push({name,status:'PASS'});console.log('PASS '+name)}
try{
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE TABLE public.public_reports(id uuid PRIMARY KEY,tracking_code text,status text,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
 CREATE TABLE public.report_access_tokens(report_id uuid,token_hash text,expires_at timestamptz,revoked_at timestamptz);
 CREATE TABLE public.report_status_history(id uuid DEFAULT gen_random_uuid(),report_id uuid,to_status text,changed_at timestamptz DEFAULT now());`)
 await db.exec(baseline)
 await db.exec(`REVOKE ALL ON FUNCTION public.track_report_v1(text,text) FROM PUBLIC,anon,authenticated;
 GRANT EXECUTE ON FUNCTION public.track_report_v1(text,text) TO service_role;
 INSERT INTO public.public_reports(id,tracking_code,status) VALUES
 ('00000000-0000-4000-8000-000000000001','RS-0123456789ABCDEF','verified'),
 ('00000000-0000-4000-8000-000000000002','RPT-TEST000001','verified');
 INSERT INTO public.report_access_tokens SELECT id,encode(sha256(convert_to(repeat('a',64),'UTF8')),'hex'),now()+interval '1 day',NULL FROM public.public_reports;
 INSERT INTO public.report_access_tokens SELECT id,encode(sha256(convert_to(repeat('b',64),'UTF8')),'hex'),now()-interval '1 day',NULL FROM public.public_reports;
 INSERT INTO public.report_access_tokens SELECT id,encode(sha256(convert_to(repeat('c',64),'UTF8')),'hex'),now()+interval '1 day',now() FROM public.public_reports;
 INSERT INTO public.report_status_history(report_id,to_status) SELECT id,'verified' FROM public.public_reports;`)
 const before=await snapshot()
 await check('Baseline reproduces RPT rejection while RS works',async()=>{assert.equal((await track('RS-0123456789ABCDEF')).status,'verified');assert.equal(await track('RPT-TEST000001'),null)})
 await check('Unapproved patch rolls back without modifying function ACL',async()=>{await assert.rejects(db.exec(patch),/explicit dev tracking compatibility scope required/);await db.exec('ROLLBACK');assert.deepEqual(await snapshot(),before)})
 await db.exec(`SET rekansiaga.release_ref='uiuiouosblyuqgnvfpeh'; SET rekansiaga.release_approval='approve-dev-e-tracking-rpt-v1';`)
 await check('Approved predicate enables both formats and preserves owner/ACL/security definer',async()=>{await db.exec(patch);assert.deepEqual(await snapshot(),before);for(const code of ['RS-0123456789ABCDEF','RPT-TEST000001']){const x=await track(code);assert.equal(x.status,'verified');assert.deepEqual(Object.keys(x).sort(),['created_at','history','status','updated_at']);assert.deepEqual(Object.keys(x.history[0]).sort(),['changed_at','status'])}})
 await check('Wrong, malformed, expired and revoked private tokens remain rejected',async()=>{for(const token of ['d'.repeat(64),'x'.repeat(64),'a'.repeat(63),'b'.repeat(64),'c'.repeat(64)])assert.equal(await track('RPT-TEST000001',token),null);assert.equal(await track('RPT-TEST000002'),null)})
 await check('Anonymous and authenticated direct RPC execution remain denied',async()=>{for(const role of ['anon','authenticated']){await db.exec(`SET ROLE ${role}`);try{await assert.rejects(track('RPT-TEST000001'),e=>e.code==='42501')}finally{await db.exec('RESET ROLE')}}})
 await check('Reapplying patch is idempotent and changes no report rows',async()=>{await db.exec(patch);assert.equal((await db.query('SELECT count(*)::int AS n FROM public.public_reports')).rows[0].n,2);assert.deepEqual(await snapshot(),before)})
 await check('Rollback restores RS-only predicate without changing owner/ACL or records',async()=>{await db.exec(`SET rekansiaga.release_approval='rollback-dev-e-tracking-rpt-v1'`);await db.exec(rollback);assert.equal(await track('RPT-TEST000001'),null);assert.equal((await track('RS-0123456789ABCDEF')).status,'verified');assert.deepEqual(await snapshot(),before)})
}finally{
 await db.close()
 writeFileSync('docs/qa/stage-e/live/tracking-compat-local-runtime.json',JSON.stringify(evidence,null,2))
}
