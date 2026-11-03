// Actual disposable PostgreSQL/WASM, synthetic local data, zero Cloud calls.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { PGlite } from '../.tools/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js'
const db=await PGlite.create(),checks=[]
const read=p=>readFileSync(p,'utf8'),sql=read('supabase/releases/dev-single-tracking.PROPOSED.sql')
const check=async(name,fn)=>{await fn();checks.push({name,status:'PASS'});console.log('PASS '+name)}
const invoke=async(token)=>(await db.query('SELECT public.track_report_v2($1) AS result',[token])).rows[0].result
const token='a'.repeat(64),id='00000000-0000-4000-8000-000000000001',ref='RPT-TEST000001'
try {
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE TABLE public.public_reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tracking_code text,status text DEFAULT 'unverified',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),reviewed_by uuid,reviewed_at timestamptz,region_id uuid,report_type text,title text,description text,coordinates text,location_description text);
 ALTER TABLE public.public_reports ENABLE ROW LEVEL SECURITY;
 CREATE TABLE public.report_access_tokens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),report_id uuid,token_hash text UNIQUE,expires_at timestamptz,revoked_at timestamptz);
 CREATE TABLE public.report_status_history(id uuid DEFAULT gen_random_uuid(),report_id uuid,from_status text,to_status text,changed_at timestamptz DEFAULT now(),changed_by uuid,reason text);
 CREATE SCHEMA extensions; CREATE DOMAIN extensions.geography AS text; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT '00000000-0000-4000-8000-000000000099'::uuid$$;
 CREATE FUNCTION public.has_staff_role(text[]) RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(current_setting('test.staff',true)='yes',false)$$;`)
 const baseline=read('supabase/releases/dev-live-admin.sql'),start=baseline.indexOf('CREATE FUNCTION public.track_report_v1(')
 await db.exec(baseline.slice(start,baseline.indexOf('$track$;',start)+8).replace("^RS-[0-9A-F]{16}$","^(RS-[0-9A-F]{16}|RPT-[A-Z0-9]{10})$"))
 const initial=read('supabase/migrations/001_rekansiaga_initial_schema.sql'),reviewStart=initial.indexOf('CREATE FUNCTION public.review_public_report(')
 const submitStart=initial.indexOf('CREATE FUNCTION public.submit_public_report(')
 await db.exec(initial.slice(submitStart,initial.indexOf('REVOKE ALL ON FUNCTION public.submit_public_report',submitStart)))
 await db.exec(`CREATE FUNCTION public.submit_report_v1(p_report_type text,p_title text,p_description text,p_location_description text,p_latitude double precision DEFAULT NULL,p_longitude double precision DEFAULT NULL,p_storage_path text DEFAULT NULL,p_mime_type text DEFAULT NULL,p_file_size bigint DEFAULT NULL) RETURNS TABLE(tracking_code text,access_token text) LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT * FROM public.submit_public_report(p_report_type,p_title,p_description,NULL,p_location_description,p_latitude,p_longitude) $$;`)
 await db.exec(initial.slice(reviewStart,initial.indexOf('GRANT EXECUTE ON FUNCTION public.review_public_report',reviewStart)))
 await db.exec(`REVOKE ALL ON FUNCTION public.track_report_v1(text,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.track_report_v1(text,text) TO service_role;
 GRANT EXECUTE ON FUNCTION public.review_public_report(uuid,text,text) TO authenticated;
 INSERT INTO public.public_reports(id,tracking_code,status) VALUES('${id}','${ref}','unverified');
 INSERT INTO public.report_access_tokens(report_id,token_hash,expires_at) VALUES('${id}',encode(sha256(convert_to('${token}','UTF8')),'hex'),now()+interval '1 day');`)
 await check('No approval means no new RPC and no changes',async()=>{await assert.rejects(db.exec(sql),/approved dev single tracking package required/);await db.exec('ROLLBACK');assert.equal((await db.query("SELECT to_regprocedure('public.track_report_v2(text)') AS f")).rows[0].f,null)})
 await db.exec("SET rekansiaga.release_ref='uiuiouosblyuqgnvfpeh'; SET rekansiaga.release_approval='approve-dev-single-tracking-v2'")
 await check('Approved package adds RPCs while report RLS stays active',async()=>{await db.exec(sql);assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.public_reports'::regclass")).rows[0].relrowsecurity,true);assert.equal((await invoke(token)).status,'unverified')})
 await check('Existing actual submit generates CSPRNG token and hash-only storage usable by v2',async()=>{
 const receipt=(await db.query("SELECT * FROM public.submit_public_report('TEST','LOCAL TEST','Synthetic local report body',NULL,'Synthetic location',NULL,NULL)")).rows[0]
 assert.match(receipt.access_token,/^[a-f0-9]{64}$/);assert.equal((await invoke(receipt.access_token)).status,'unverified')
 const stored=(await db.query("SELECT token_hash FROM public.report_access_tokens WHERE token_hash=encode(sha256(convert_to($1,'UTF8')),'hex')",[receipt.access_token])).rows[0]
 assert.ok(stored);assert.notEqual(stored.token_hash,receipt.access_token)
 })
 await check('Incorrect, malformed, expired and revoked credentials return the same null',async()=>{
 for(const t of ['',null,'x'.repeat(64),'b'.repeat(64)])assert.equal(await invoke(t),null)
 await db.exec("UPDATE public.report_access_tokens SET expires_at=now()-interval '1 day'");assert.equal(await invoke(token),null)
 await db.exec("UPDATE public.report_access_tokens SET expires_at=now()+interval '1 day',revoked_at=now()");assert.equal(await invoke(token),null)
 await db.exec('UPDATE public.report_access_tokens SET revoked_at=NULL')
 })
 await check('Real existing review RPC authorization/status/history still drives v2 result',async()=>{
 await db.exec('SET ROLE authenticated');await assert.rejects(db.query('SELECT public.review_public_report($1,$2,$3)',[id,'verified','LOCAL TEST']),e=>e.code==='42501');await db.exec('RESET ROLE')
 await db.exec("SET test.staff='yes'; SET ROLE authenticated")
 await db.query('SELECT public.review_public_report($1,$2,$3)',[id,'verified','LOCAL TEST']);await db.exec('RESET ROLE')
 const result=await invoke(token);assert.equal(result.status,'verified');assert.equal(result.history[0].status,'verified');assert.deepEqual(Object.keys(result).sort(),['created_at','history','status','updated_at'])
 })
 await check('Legacy v1 remains valid and exposes no raw token or private metadata',async()=>{const result=(await db.query('SELECT public.track_report_v1($1,$2) AS result',[ref,token])).rows[0].result;assert.deepEqual(result,await invoke(token));assert.equal(JSON.stringify(result).includes(token),false)})
 await check('Anon and authenticated cannot execute v2 or rotation directly',async()=>{
 for(const role of ['anon','authenticated']){await db.exec(`SET ROLE ${role}`);try{await assert.rejects(invoke(token),e=>e.code==='42501');await assert.rejects(db.query('SELECT public.replace_report_tracking_v2($1,$2)',[ref,token]),e=>e.code==='42501')}finally{await db.exec('RESET ROLE')}}
 })
 await check('Operator rotation atomically revokes old credential, preserves expiry and returns CSPRNG replacement once',async()=>{
 const expiry=(await db.query("SELECT expires_at FROM public.report_access_tokens WHERE report_id='"+id+"'")).rows[0].expires_at
 await db.exec('SET ROLE service_role')
 const replacement=(await db.query('SELECT public.replace_report_tracking_v2($1,$2) AS token',[ref,token])).rows[0].token
 assert.match(replacement,/^[a-f0-9]{64}$/);assert.notEqual(replacement,token);assert.equal(await invoke(token),null);assert.equal((await invoke(replacement)).status,'verified')
 await assert.rejects(db.query('SELECT public.replace_report_tracking_v2($1,$2)',[ref,token]),e=>e.code==='P0002');await db.exec('RESET ROLE')
 const rows=(await db.query("SELECT token_hash,expires_at,revoked_at FROM public.report_access_tokens WHERE report_id='"+id+"'")).rows
 assert.equal(rows.length,2);assert.ok(rows.some(r=>r.revoked_at));assert.ok(rows.every(r=>String(r.expires_at)===String(expiry)&&r.token_hash!==replacement&&r.token_hash!==token))
 })
} finally { await db.close();writeFileSync('docs/qa/stage-e/single-tracking-local.json',JSON.stringify({kind:'LOCAL PostgreSQL/WASM; role claims fixture, not LIVE',cloudCalls:0,checks},null,2)) }
