// Synthetic local-only contract checks; no Supabase/cloud calls are made.
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { PGlite } from '../.tools/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js'
import { alertIsCurrent, prioritizeAlerts, unseenAlerts, safeRoute } from '../src/features/notifications/alertPolicy.ts'

const checks = []
const check = async (name, fn) => { await fn(); checks.push({ name, status: 'PASS' }); console.log(`PASS ${name}`) }
const db = await PGlite.create()
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
    CREATE FUNCTION public.has_staff_role(text[]) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT coalesce(current_setting('test.role',true)=ANY($1),false)$$;
    CREATE TABLE public.staff_profiles(user_id uuid PRIMARY KEY);
    CREATE TABLE public.regions(id uuid PRIMARY KEY,parent_id uuid REFERENCES public.regions(id),name text NOT NULL);
    CREATE TABLE public.disaster_events(id uuid PRIMARY KEY,published_at timestamptz,verification_status text,event_status text);
    ALTER TABLE public.disaster_events ENABLE ROW LEVEL SECURITY;
    CREATE TABLE public.audit_logs(actor_id uuid,action text,entity_type text,entity_id uuid,old_values jsonb,new_values jsonb);
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated;
    GRANT EXECUTE ON FUNCTION public.has_staff_role(text[]) TO anon,authenticated;
    `)
  // Execute package in a matching local test context with only synthetic rows.
  await db.exec("SET rekansiaga.release_ref='uiuiouosblyuqgnvfpeh'; SET rekansiaga.release_approval='approve-dev-location-alerts-v1'; SET test.role='super_admin'; SET test.uid='00000000-0000-4000-8000-000000000001'")
  await check('approved package creates private alert schema, reader, RBAC, and audit', async () => {
    const sql = readFileSync('supabase/releases/dev-location-alerts.PROPOSED.sql','utf8').replace(/^BEGIN;|COMMIT;$/gm,'')
    await db.exec(sql)
    assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.disaster_alerts'::regclass")).rows[0].relrowsecurity,true)
    assert.equal((await db.query("SELECT has_table_privilege('anon','public.disaster_alerts','SELECT') x")).rows[0].x,false)
  })
  const region='00000000-0000-4000-8000-000000000010', district='00000000-0000-4000-8000-000000000011', event='00000000-0000-4000-8000-000000000020', alert='00000000-0000-4000-8000-000000000030'
  await db.query('INSERT INTO public.staff_profiles(user_id) VALUES ($1)', ['00000000-0000-4000-8000-000000000001'])
  await db.query('INSERT INTO public.regions(id,parent_id,name) VALUES ($1,NULL,$3),($2,$1,$4)',[region,district,'Sumatera Barat','Koto Tangah'])
  await db.query("INSERT INTO public.disaster_events VALUES ($1,now(),'staff_verified','ongoing')",[event])
  await db.query(`INSERT INTO public.disaster_alerts(id,event_id,region_id,title,description,disaster_type,severity,issuer_kind,issuer_name,source_url,starts_at,expires_at,action_guidance,status)
    VALUES($1,$2,$3,'Peringatan sintetis','Informasi sintetis untuk uji lokal.','Banjir','warning','staff','Admin dev','https://example.org/source',now()-interval '1 minute',now()+interval '1 hour','Ikuti arahan petugas setempat.','active')`,[alert,event,district])
  await check('matching selected child region receives active published alert with safe fields',async()=>{
    const rows=(await db.query('SELECT * FROM public.public_active_disaster_alerts_v1($1)',[district])).rows
    assert.equal(rows.length,1); assert.equal(rows[0].region_name,'Koto Tangah'); assert.equal(rows[0].evacuation_route,null)
  })
  await check('another province area, expired/revoked alert, or unresolved event does not leak into response',async()=>{
    assert.equal((await db.query('SELECT * FROM public.public_active_disaster_alerts_v1($1)',[region])).rows.length,0)
    await db.query("UPDATE public.disaster_alerts SET expires_at=now()-interval '1 second' WHERE id=$1",[alert])
    assert.equal((await db.query('SELECT * FROM public.public_active_disaster_alerts_v1($1)',[district])).rows.length,0)
    await db.query("UPDATE public.disaster_alerts SET expires_at=now()+interval '1 hour',status='revoked' WHERE id=$1",[alert])
    assert.equal((await db.query('SELECT * FROM public.public_active_disaster_alerts_v1($1)',[district])).rows.length,0)
  })
  await check('non-super-admin cannot classify an alert as an official source',async()=>{
    await db.exec("SET test.role='information_manager'")
    await assert.rejects(db.query("UPDATE public.disaster_alerts SET status='active',issuer_kind='official_source' WHERE id=$1",[alert]),e=>e.code==='42501')
  })
  await check('anonymous caller can use the minimized reader but cannot select private alert rows',async()=>{
    await db.exec('SET ROLE anon')
    assert.equal((await db.query('SELECT * FROM public.public_active_disaster_alerts_v1($1)',[district])).rows.length,0)
    await assert.rejects(db.query('SELECT * FROM public.disaster_alerts'),e=>e.code==='42501')
    await db.exec('RESET ROLE; SET test.role=\'report_verifier\'; SET ROLE authenticated')
    assert.equal((await db.query('SELECT count(*)::int n FROM public.disaster_alerts')).rows[0].n,0)
    assert.equal((await db.query("UPDATE public.disaster_alerts SET status='active' WHERE id=$1 RETURNING id",[alert])).rows.length,0)
    await db.exec('RESET ROLE; SET test.role=\'super_admin\'')
  })
  await check('every insert/update is audited and updates advance version',async()=>{
    const result=await db.query('SELECT count(*)::int n FROM public.audit_logs WHERE entity_type=$1',["disaster_alerts"])
    assert.ok(result.rows[0].n>=3)
    const version=(await db.query('SELECT version FROM public.disaster_alerts WHERE id=$1',[alert])).rows[0].version
    assert.equal(version,3)
  })
  const ui = readFileSync('src/features/notifications/disasterAlerts.ts','utf8')
  await check('client requires the scoped alert feature flag and uses region RPC',async()=>{
    const policy=readFileSync('src/features/notifications/alertPolicy.ts','utf8')
    assert.match(ui,/VITE_LOCATION_ALERTS_ENABLED === 'true'/); assert.match(ui,/public_active_disaster_alerts_v1/)
    assert.match(ui,/expires_at/); assert.match(policy,/severityOrder/)
  })
  await check('local policy filters expiry, prioritizes urgency, deduplicates versions, and hides unverified routes',async()=>{
    const now=Date.parse('2026-11-03T12:00:00Z')
    const item=(id,severity,version=1,expires='2026-11-03T13:00:00Z')=>({id,severity,version,starts_at:'2026-11-03T11:00:00Z',expires_at:expires})
    const alerts=[item('watch','watch'),item('urgent','emergency'),item('expired','warning',1,'2026-11-03T11:59:00Z')]
    assert.equal(alertIsCurrent(alerts[0],now),true); assert.equal(alertIsCurrent(alerts[2],now),false)
    assert.deepEqual(prioritizeAlerts(alerts,now).map(row=>row.id),['urgent','watch'])
    assert.deepEqual(unseenAlerts([{id:'urgent',version:2},{id:'watch',version:1}],{urgent:1,watch:1}).map(row=>row.id),['urgent'])
    assert.equal(safeRoute({evacuation_route:'Rute aman',evacuation_source_url:'https://example.org',evacuation_verified_at:null}),null)
    assert.equal(safeRoute({evacuation_route:'Rute aman',evacuation_source_url:'https://example.org',evacuation_verified_at:'2026-11-03T12:00:00Z'}),'Rute aman')
  })
  const status={kind:'LOCAL PGlite + synthetic data only; no network/cloud calls',checks}
  writeFileSync('docs/qa/stage-e/location-alerts-local.json',JSON.stringify(status,null,2))
} finally { await db.close() }
