// Local-only PostgreSQL contract checks; uses synthetic SOS data in an ephemeral PGlite database.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '../.tools/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js'

const db = await PGlite.create()
const passed = []
async function check(name, fn) { await fn(); passed.push(name); console.log(`PASS ${name}`) }
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE TABLE public.staff_profiles(user_id uuid PRIMARY KEY);
    CREATE TABLE public.audit_logs(id uuid DEFAULT gen_random_uuid(),actor_id uuid,action text,entity_type text,entity_id uuid,old_values jsonb,new_values jsonb,created_at timestamptz DEFAULT now());
    CREATE FUNCTION public.has_staff_role(p_codes text[]) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT coalesce(current_setting('test.role',true)=ANY(p_codes),false)$$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    GRANT EXECUTE ON FUNCTION auth.uid(),public.has_staff_role(text[]) TO anon,authenticated,service_role;
    `)
  await db.exec("SET rekansiaga.release_ref='uiuiouosblyuqgnvfpeh'; SET rekansiaga.release_approval='approve-dev-sos-relay-v1'; SET test.uid='00000000-0000-4000-8000-000000000001'; SET test.role='super_admin'")
  const sql = readFileSync('supabase/releases/dev-sos-relay-v1.PROPOSED.sql','utf8')
  try { await db.exec(sql) } catch (error) { console.error(`SOS SQL install failed: ${error?.message ?? 'unknown error'}`); process.exitCode = 1; throw new Error('SOS SQL install failed') }
  await check('private tables have RLS and no anonymous SELECT or RPC access', async () => {
    const row = (await db.query(`SELECT (SELECT relrowsecurity FROM pg_class WHERE oid='public.sos_requests'::regclass) rls,
      has_table_privilege('anon','public.sos_requests','SELECT') anon_select,
      has_function_privilege('anon','public.sos_track_v1(text)','EXECUTE') anon_track,
      has_function_privilege('anon','public.sos_submit_v1(text,text,jsonb)','EXECUTE') anon_submit,
      has_function_privilege('service_role','public.sos_submit_v1(text,text,jsonb)','EXECUTE') service_submit`)).rows[0]
    assert.equal(row.rls,true); assert.equal(row.anon_select,false); assert.equal(row.anon_track,false); assert.equal(row.anon_submit,false); assert.equal(row.service_submit,true)
  })
  const idempotency='a'.repeat(64), credential='b'.repeat(64)
  await db.exec('SET ROLE service_role')
  const submitted = await db.query(`SELECT * FROM public.sos_submit_v1($1,$2,$3::jsonb)`,[idempotency,credential,JSON.stringify({description:'Memerlukan bantuan medis segera.',latitude:-0.95,longitude:100.42,accuracy_m:12,online:true,consent_version:'sos-consent-v1'})])
  await db.exec('RESET ROLE')
  await check('service submit stores only a verifier and returns a receipt',async()=>{
    assert.equal(submitted.rows.length,1); assert.match(submitted.rows[0].reference_code,/^SOS-/); assert.equal(submitted.rows[0].status,'received')
    const stored=(await db.query('SELECT credential_verifier FROM public.sos_requests')).rows[0].credential_verifier
    assert.equal(stored,credential)
  })
  await db.exec('SET ROLE service_role')
  const tracked=await db.query('SELECT * FROM public.sos_track_v1($1)',[credential])
  await check('tracking returns public status only without location, contacts, or internal notes',async()=>{
    assert.equal(tracked.rows.length,1); assert.equal(tracked.rows[0].history[0].status,'received'); assert.equal('latitude' in tracked.rows[0],false); assert.equal('note' in tracked.rows[0].history[0],false)
  })
  await db.query('SELECT public.sos_revoke_v1($1)',[credential])
  await check('revoked tracking credentials are no longer accepted',async()=>{ assert.equal((await db.query('SELECT * FROM public.sos_track_v1($1)',[credential])).rows.length,0) })
  await db.query(`SELECT * FROM public.sos_submit_v1($1,$2,$3::jsonb)`,['c'.repeat(64),'d'.repeat(64),JSON.stringify({description:'Need assistance at this location.',consent_version:'sos-consent-v1'})])
  await db.exec('RESET ROLE')
  await db.exec("UPDATE public.sos_requests SET credential_expires_at=now()-interval '1 day' WHERE idempotency_hash='"+'c'.repeat(64)+"'; SET ROLE service_role")
  await check('expired credentials are rejected with the same empty public tracking result',async()=>{ assert.equal((await db.query("SELECT * FROM public.sos_track_v1($1)",['d'.repeat(64)])).rows.length,0) })
  await check('persistent per-minute quota stops after its configured limit',async()=>{
    for(let index=0;index<100;index++) assert.equal((await db.query("SELECT public.sos_consume_quota_v1('submit',100) ok")).rows[0].ok,true)
    assert.equal((await db.query("SELECT public.sos_consume_quota_v1('submit',100) ok")).rows[0].ok,false)
  })
  await db.exec('RESET ROLE; SET ROLE authenticated')
  await db.exec("RESET ROLE; INSERT INTO public.staff_profiles(user_id) VALUES ('00000000-0000-4000-8000-000000000001'); SET ROLE authenticated")
  const updated=await db.query(`SELECT public.sos_admin_update_v1((SELECT id FROM public.sos_requests LIMIT 1),(SELECT updated_at FROM public.sos_requests LIMIT 1),'reviewing','Ditinjau staf')`)
  await db.exec('RESET ROLE')
  await check('authorized Admin transition writes history and audit atomically',async()=>{
    assert.ok(updated.rows[0].sos_admin_update_v1); assert.equal((await db.query('SELECT count(*)::int n FROM public.sos_request_history')).rows[0].n,3); assert.equal((await db.query("SELECT count(*)::int n FROM public.audit_logs WHERE entity_type='sos_requests'")).rows[0].n,1)
  })
  await db.exec("SET test.role='report_verifier'; SET ROLE authenticated")
  await assert.rejects(db.query(`SELECT public.sos_admin_update_v1((SELECT id FROM public.sos_requests WHERE idempotency_hash=$1),(SELECT updated_at FROM public.sos_requests WHERE idempotency_hash=$1),'seen',NULL)`,['a'.repeat(64)]))
  await db.exec('RESET ROLE')
  await check('status cannot move backwards and closed requests cannot reopen',async()=>{
    assert.equal((await db.query('SELECT status FROM public.sos_requests WHERE idempotency_hash=$1',['a'.repeat(64)])).rows[0].status,'reviewing')
  })
  console.log(`SOS relay local SQL checks: ${passed.length} PASS`)
} finally { await db.close() }
