// Disposable local PostgreSQL/WASM; role-claims helper is a fixture, not LIVE Auth.
import assert from 'node:assert/strict'
import { readFileSync,writeFileSync } from 'node:fs'
import { PGlite } from '../.tools/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js'
const db=await PGlite.create()
const patch=readFileSync('supabase/releases/dev-e-report-privacy.PROPOSED.sql','utf8')
const evidence={kind:'LOCAL PostgreSQL/WASM restrictive SELECT policies; Auth helper fixture, not LIVE',cloudRequests:0,checks:[]}
const query=async(sql,params=[])=>(await db.query(sql,params)).rows
const count=async(role,staff='')=>{
 await db.query("SELECT set_config('test.staff_role',$1,false)",[staff]);await db.exec(`SET ROLE ${role}`)
 try{return (await query('SELECT count(*)::int AS n FROM public.public_reports'))[0].n}finally{await db.exec('RESET ROLE')}
}
const check=async(name,fn)=>{await fn();evidence.checks.push({name,status:'PASS'});console.log('PASS '+name)}
try{
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE TABLE public.public_reports(id uuid PRIMARY KEY,status text,description text);

 GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
 GRANT SELECT ON public.public_reports TO anon,authenticated,service_role;
 CREATE FUNCTION public.has_staff_role(text[]) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT current_setting('test.staff_role',true)=ANY($1)$$;
 CREATE POLICY reports_staff_read ON public.public_reports FOR SELECT TO authenticated USING(public.has_staff_role(ARRAY['super_admin','report_verifier']));
 CREATE POLICY fixture_legacy_verified_public ON public.public_reports FOR SELECT TO anon,authenticated USING(status='verified');

 INSERT INTO public.public_reports VALUES('00000000-0000-4000-8000-000000000001','verified','LOCAL synthetic private description');`)
 const before=(await query("SELECT relacl::text AS acl,relrowsecurity FROM pg_class WHERE oid='public.public_reports'::regclass"))[0]
 await check('Fixture reproduces anonymous access to private verified row',async()=>assert.equal(await count('anon'),1))
 await check('Unapproved privacy change is rejected without changing existing policy',async()=>{await assert.rejects(db.exec(patch),/explicit dev report privacy scope required/);await db.exec('ROLLBACK');assert.equal(await count('anon'),1)})
 await db.exec(`SET rekansiaga.release_ref='uiuiouosblyuqgnvfpeh'; SET rekansiaga.release_approval='approve-dev-e-report-compat-privacy-v1';`)
 await check('Restrictive policies block anonymous and non-reviewer authenticated reads',async()=>{await db.exec(patch);assert.equal(await count('anon'),0);for(const role of ['', 'information_manager','mitigation_editor'])assert.equal(await count('authenticated',role),0)})
 await check('Super Admin/report verifier and service-role access remain available',async()=>{assert.equal(await count('authenticated','super_admin'),1);assert.equal(await count('authenticated','report_verifier'),1);assert.equal(await count('service_role'),1)})
 await check('RLS enabled without changing rows, existing policy or grants',async()=>{assert.deepEqual((await query("SELECT relacl::text AS acl,relrowsecurity FROM pg_class WHERE oid='public.public_reports'::regclass"))[0],{...before,relrowsecurity:true});assert.equal((await query('SELECT count(*)::int AS n FROM public.public_reports'))[0].n,1);assert.equal((await query("SELECT count(*)::int AS n FROM pg_policy WHERE polrelid='public.public_reports'::regclass AND polname='fixture_legacy_verified_public'"))[0].n,1)})
 await check('Repeated privacy patch is idempotent',async()=>{await db.exec(patch);assert.equal((await query("SELECT count(*)::int AS n FROM pg_policy WHERE polrelid='public.public_reports'::regclass"))[0].n,4);assert.equal(await count('anon'),0)})
}finally{await db.close();writeFileSync('docs/qa/stage-e/live/report-privacy-local-runtime.json',JSON.stringify(evidence,null,2))}
