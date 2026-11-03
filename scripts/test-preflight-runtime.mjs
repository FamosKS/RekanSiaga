// Real PostgreSQL/WASM execution against disposable LOCAL schema fixtures.
// Not Supabase Cloud, Auth JWT, Storage service, PostGIS, or concurrent-session acceptance.
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { PGlite } from '../.tools/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js'

const db = await PGlite.create()
const evidence = { kind: 'Local PostgreSQL runtime / contract fixtures, never Cloud', checks: [], cloudWrites: 0, limitations: ['PostGIS replaced with text fixture', 'Auth/storage schemas are fixtures, not external services', 'No concurrent-session or real JWT acceptance'], phase4a: 'BLOCKED' }
const ids = { super: '10000000-0000-4000-8000-000000000001', manager: '10000000-0000-4000-8000-000000000002', verifier: '10000000-0000-4000-8000-000000000003', editor: '10000000-0000-4000-8000-000000000004', inactive: '10000000-0000-4000-8000-000000000005', outsider: '10000000-0000-4000-8000-000000000006' }
const read = name => readFileSync(name, 'utf8')
const approved = (source, action) => source.replace('-- SET LOCAL rekansiaga.release_ref=', 'SET LOCAL rekansiaga.release_ref=').replace(`-- SET LOCAL rekansiaga.release_approval='${action}';`, `SET LOCAL rekansiaga.release_approval='${action}';`)
async function query(sql, params = []) { return (await db.query(sql, params)).rows }
async function check(name, run) { await run(); evidence.checks.push({ name, outcome: 'PASS' }); console.log('PASS ' + name) }
async function asRole(role, user, sql, params = []) {
  await db.exec('BEGIN')
  try { await query(`select set_config('request.jwt.claims',$1,true)`, [JSON.stringify(user ? { sub: user } : {})]); await db.exec(`SET LOCAL ROLE ${role}`); const rows = await query(sql, params); await db.exec('COMMIT'); return rows }
  catch (error) { await db.exec('ROLLBACK'); throw error }
}
try {
  evidence.engine = (await query('select version() AS version'))[0].version
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE ROLE supabase_admin;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    CREATE SCHEMA extensions; CREATE DOMAIN extensions.geography AS text;
    CREATE FUNCTION extensions.st_makepoint(double precision,double precision) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT 'LOCAL SPATIAL FIXTURE'::text $$;
    CREATE FUNCTION extensions.st_setsrid(text,integer) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT $1 $$;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text NOT NULL);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role;
    GRANT ALL ON storage.objects TO anon,authenticated;
    CREATE POLICY existing_storage_policy ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);`)
  let baseline = read('supabase/migrations/001_rekansiaga_initial_schema.sql')
    .replace('CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;', '-- PostGIS not available in this LOCAL contract harness.')
    .replaceAll('geography(Point,4326)', 'text')
    .replace(/^CREATE INDEX .* USING gist\(coordinates\);$/gm, '-- Spatial index not tested in this harness.')
  await db.exec(baseline)
  // Keep broad table defaults for the fixture, but model safe function defaults.
  await db.exec(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated;`)
  for (const [name, id] of Object.entries(ids)) {
    await query('INSERT INTO auth.users VALUES($1)', [id])
    if (name === 'outsider') continue
    await query('INSERT INTO public.staff_profiles(user_id,display_name,is_active) VALUES($1,$2,$3)', [id, 'LOCAL fixture '+name, name !== 'inactive'])
    const code = { super: 'super_admin', manager: 'information_manager', verifier: 'report_verifier', editor: 'mitigation_editor', inactive: 'information_manager' }[name]
    await query('INSERT INTO public.staff_role_assignments(staff_id,role_id) SELECT $1,id FROM public.roles WHERE code=$2', [id, code])
  }
  await db.exec(`INSERT INTO public.articles(title,slug,content,publication_status,published_at) VALUES('EXISTING LOCAL DATA','existing-local-data','Keep this row','published',now());
    INSERT INTO public.app_settings(key,value) VALUES('site_name','"Existing local name"'),('private_integration_key','"LOCAL DUMMY - NOT A REAL KEY"');
    INSERT INTO storage.objects(bucket_id) VALUES('existing-public-bucket');`)
  const release = approved(read('supabase/releases/dev-live-admin.sql'), 'approve-dev-live-admin-v1')
  const rollback = approved(read('supabase/releases/dev-live-admin-rollback.sql'), 'rollback-dev-live-admin-v1')
  const baselineReview=(await query(`SELECT pg_get_functiondef(oid) AS definition,proacl::text AS acl FROM pg_proc WHERE oid='public.review_public_report(uuid,text,text)'::regprocedure`))[0]
  await check('Catalog export is one read-only metadata JSON with no user data/function bodies',async()=>{
    const results=await db.exec(read('docs/sql/dev-mvp-readonly.sql'))
    const catalog=results.find(result=>result.rows?.[0]?.rekansiaga_preflight)?.rows[0].rekansiaga_preflight
    assert.ok(catalog);assert.equal(catalog.connection.transaction_read_only,'on');assert.equal(catalog.expected_target.management_identity_verified,false)
    assert.ok(catalog.columns.length>100);assert.equal(catalog.staff_role_summary.length,4)
    const encoded=JSON.stringify(catalog);assert.ok(!encoded.includes('LOCAL DUMMY'));assert.ok(!encoded.includes(ids.super));assert.ok(!encoded.includes('Keep this row'));assert.ok(!encoded.includes('CREATE FUNCTION'))
  })
  await check('Unapproved release fails before changing the local schema', async () => { await assert.rejects(db.exec(read('supabase/releases/dev-live-admin.sql'))); await db.exec('ROLLBACK'); assert.equal((await query(`select to_regclass('rekansiaga_release.backup_v1') AS object`))[0].object, null) })
  await check('An existing RPC overload is preserved and blocks conflicting new RPC deployment',async()=>{
    await db.exec('CREATE FUNCTION public.admin_manage_staff(integer) RETURNS integer LANGUAGE sql AS $$SELECT $1$$')
    await assert.rejects(db.exec(release),error=>/Conflicting RPC name\/overload/.test(error.message));await db.exec('ROLLBACK')
    assert.ok((await query(`SELECT to_regprocedure('public.admin_manage_staff(integer)') AS object`))[0].object)
    assert.equal((await query(`SELECT to_regclass('rekansiaga_release.backup_v1') AS object`))[0].object,null)
    await db.exec('DROP FUNCTION public.admin_manage_staff(integer)')
  })
  // Provider defaults are broad in hosted Supabase; the tenant must leave them alone.
  await db.exec('ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon,authenticated')
  const managedDefaults=await query(`SELECT defaclrole,defaclnamespace,defaclobjtype,defaclacl::text FROM pg_default_acl WHERE defaclrole='supabase_admin'::regrole ORDER BY defaclnamespace,defaclobjtype`)
  await check('Inherited client EXECUTE aborts release without changing provider defaults or installing objects', async () => {
    await db.exec('GRANT service_role TO anon')
    await assert.rejects(db.exec(release), error => /effective RPC EXECUTE mismatch/.test(error.message))
    await db.exec('ROLLBACK')
    assert.equal((await query(`SELECT to_regclass('rekansiaga_release.backup_v1') AS object`))[0].object,null)
    await db.exec('REVOKE service_role FROM anon')
  })
  await check('Approved release executes on the compatible local contract schema', () => db.exec(release))
  await check('Release narrows postgres/public defaults while leaving internal provider defaults exactly unchanged', async () => {
    const unsafe = await query(`SELECT count(*)::int AS n FROM pg_default_acl d JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE n.nspname='public' AND d.defaclobjtype='f' AND d.defaclrole='postgres'::regrole AND EXISTS (SELECT 1 FROM aclexplode(d.defaclacl) a WHERE a.grantee IN ('anon'::regrole,'authenticated'::regrole) AND a.privilege_type='EXECUTE')`)
    assert.equal(unsafe[0].n, 0)
    assert.deepEqual(await query(`SELECT defaclrole,defaclnamespace,defaclobjtype,defaclacl::text FROM pg_default_acl WHERE defaclrole='supabase_admin'::regrole ORDER BY defaclnamespace,defaclobjtype`),managedDefaults)
  })
  await check('Postflight passes with provider defaults intact and detects an effective grant regression', async () => {
    async function postflight(){const results=await db.exec(read('docs/sql/dev-live-admin-postflight-readonly.sql'));return results.find(r=>r.rows?.[0]?.rekansiaga_live_admin_postflight)?.rows[0].rekansiaga_live_admin_postflight}
    let result=await postflight();assert.equal(result.security_pass,true);assert.equal(result.public_function_defaults.find(r=>r.creator==='supabase_admin').classification,'PROVIDER_MANAGED_INFORMATIONAL')
    await db.exec('GRANT EXECUTE ON FUNCTION public.track_report_v1(text,text) TO anon')
    result=await postflight();assert.equal(result.security_pass,false)
    await db.exec('REVOKE EXECUTE ON FUNCTION public.track_report_v1(text,text) FROM anon')
  })
  await check('Regions migration requires its own approval, preserves UUIDs and rejects invalid parents', async () => {
    const source=read('supabase/migrations/002_regions_integrity.sql')
    await assert.rejects(db.exec(source), error=>/explicit dev regions migration approval/.test(error.message));await db.exec('ROLLBACK')
    await db.exec(approved(source,'approve-dev-regions-integrity-v1'))
    for(const role of ['anon','authenticated','service_role']) assert.equal((await query(`SELECT has_function_privilege($1,'public.validate_regions_catalog()','EXECUTE') AS allowed`,[role]))[0].allowed,false)
    const province=(await query(`INSERT INTO public.regions(code,name,region_type) VALUES('11','LOCAL province','province') RETURNING id`))[0].id
    await query(`INSERT INTO public.regions(code,name,region_type) VALUES('11','LOCAL renamed','province') ON CONFLICT(code) DO UPDATE SET name=excluded.name`)
    assert.equal((await query(`SELECT id FROM public.regions WHERE code='11'`))[0].id,province)
    await assert.rejects(query(`INSERT INTO public.regions(code,name,region_type,parent_id) VALUES('11.01','LOCAL invalid district','district',$1)`,[province]), error=>error.code==='23514')
    const catalog=(await query('SELECT * FROM public.validate_regions_catalog()'))[0]
    assert.equal(Number(catalog.invalid_parent_levels),0)
    await assert.rejects(db.exec(approved(source,'approve-dev-regions-integrity-v1')),error=>/already present or conflicting/.test(error.message));await db.exec('ROLLBACK')
  })
  await check('Release preserves pre-existing content/settings and their original values',async()=>{
    assert.equal((await query(`SELECT content FROM public.articles WHERE slug='existing-local-data'`))[0].content,'Keep this row')
    assert.equal((await query(`SELECT value FROM public.app_settings WHERE key='site_name'`))[0].value,'Existing local name')
    assert.equal((await query(`SELECT count(*)::int AS n FROM public.roles`))[0].n,4)
  })
  await check('Public config remains SELECT-only under broad default grants', async () => {
    for (const role of ['anon','authenticated']) for (const op of ['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) assert.equal((await query('SELECT has_table_privilege($1,$2,$3) AS allowed',[role,'public.app_public_config',op]))[0].allowed,false,`${role} inherited ${op} on definer view`)
    const rows = await asRole('anon',null,'SELECT key FROM public.app_public_config'); assert.deepEqual(rows.map(row=>row.key),['site_name'])
    await assert.rejects(asRole('anon',null,`UPDATE public.app_public_config SET value='"tamper"'`), error=>error.code==='42501')
  })
  await check('Backup/quota remain private despite managed default grants',async()=>{
    for(const role of ['anon','authenticated','service_role']){
      assert.equal((await query(`SELECT has_table_privilege($1,'rekansiaga_release.backup_v1','SELECT') AS allowed`,[role]))[0].allowed,false)
      assert.equal((await query(`SELECT has_table_privilege($1,'public.report_api_limits','SELECT') AS allowed`,[role]))[0].allowed,false)
      await assert.rejects(asRole(role,null,'SELECT kind FROM rekansiaga_release.backup_v1'),error=>error.code==='42501')
    }
  })
  await check('Assigned role labels resolve without granting administrative writes', async () => {
    const rows=await asRole('authenticated',ids.manager,'SELECT code FROM public.roles');assert.deepEqual(rows.map(row=>row.code),['information_manager'])
    for (const user of [ids.inactive,ids.outsider]) await assert.rejects(asRole('authenticated',user,`INSERT INTO public.articles(title,slug,content) VALUES('Denied','denied','Denied')`),error=>error.code==='42501')
    await assert.rejects(asRole('anon',null,'SELECT id FROM public.public_reports'),error=>error.code==='42501')
  })
  await check('Manager/editor writes obey actual table RLS and public publication filters',async()=>{
    const article=(await asRole('authenticated',ids.manager,`INSERT INTO public.articles(title,slug,content) VALUES('LOCAL manager draft','local-manager-draft','Local draft content') RETURNING id`))[0].id
    assert.equal((await asRole('anon',null,'SELECT id FROM public.articles WHERE id=$1',[article])).length,0)
    await asRole('authenticated',ids.manager,`UPDATE public.articles SET publication_status='published',published_at=now() WHERE id=$1`,[article])
    assert.equal((await asRole('anon',null,'SELECT id FROM public.articles WHERE id=$1',[article])).length,1)
    const guide=(await asRole('authenticated',ids.editor,`INSERT INTO public.mitigation_guides(title,disaster_type,content,publication_status) VALUES('LOCAL guide','Banjir','Local guide content','published') RETURNING id`))[0].id
    await asRole('authenticated',ids.editor,`INSERT INTO public.mitigation_checklist_items(guide_id,phase,instruction) VALUES($1,'before','LOCAL checklist')`,[guide])
    assert.equal((await asRole('anon',null,'SELECT id FROM public.mitigation_checklist_items WHERE guide_id=$1',[guide])).length,1)
    await assert.rejects(asRole('authenticated',ids.editor,`UPDATE public.articles SET title='Denied editor' WHERE id=$1 RETURNING id`,[article]).then(rows=>{if(rows.length===0)throw Object.assign(new Error('RLS filtered mutation'),{code:'42501'})}),error=>error.code==='42501')
    await assert.rejects(asRole('authenticated',ids.manager,`INSERT INTO public.mitigation_guides(title,disaster_type,content) VALUES('Denied manager','Banjir','Denied')`),error=>error.code==='42501')
  })
  await check('Staff/settings/queue RPCs execute with server RBAC and bounded contracts',async()=>{
    await assert.rejects(asRole('authenticated',ids.manager,`SELECT public.admin_set_public_setting('public_notice','Denied',NULL)`),error=>error.code==='42501')
    await assert.rejects(asRole('authenticated',ids.super,`SELECT public.admin_set_public_setting('private_integration_key','Denied',NULL)`),error=>error.code==='22023')
    const setting=(await asRole('authenticated',ids.super,`SELECT public.admin_set_public_setting('public_notice','LOCAL notice',NULL) AS result`))[0].result
    assert.equal(setting.value,'LOCAL notice')
    await assert.rejects(asRole('authenticated',ids.super,`SELECT public.admin_set_public_setting('public_notice','Conflict',NULL)`),error=>error.code==='40001')
    const queue=(await asRole('authenticated',ids.manager,`SELECT public.admin_queue_notification('LOCAL notice','Local notification body',NULL) AS result`))[0].result
    assert.equal(queue.status,'queued')
    await assert.rejects(asRole('authenticated',ids.manager,`UPDATE public.notifications SET status='completed' WHERE id=$1`,[queue.id]),error=>error.code==='42501')
    await asRole('authenticated',ids.super,'SELECT public.admin_manage_staff($1,$2,true,$3)',[ids.outsider,'LOCAL existing user',['report_verifier']])
    assert.equal((await query('SELECT is_active FROM public.staff_profiles WHERE user_id=$1',[ids.outsider]))[0].is_active,true)
    assert.equal((await asRole('authenticated',ids.outsider,`SELECT public.has_staff_role(ARRAY['report_verifier']) AS allowed`))[0].allowed,true)
  })
  let reportId, code, token
  await check('Service-only submission persists report, receipt hash and initial history', async () => {
    const rows=await asRole('service_role',null,`SELECT * FROM public.submit_report_v1('Banjir','LOCAL TEST REPORT','Local report contract test','Local location',NULL,NULL,NULL,NULL,NULL)`)
    code=rows[0].tracking_code;token=rows[0].access_token
    reportId=(await query('SELECT id FROM public.public_reports WHERE tracking_code=$1',[code]))[0].id
    assert.equal((await query('SELECT count(*)::int AS n FROM public.report_status_history WHERE report_id=$1',[reportId]))[0].n,1)
    await assert.rejects(asRole('anon',null,`SELECT * FROM public.submit_report_v1('Banjir','LOCAL DENIED','Denied','Location',NULL,NULL,NULL,NULL,NULL)`),error=>error.code==='42501')
  })
  await check('Reason NULL succeeds; blank/overflow rejected; update/history are atomic on failure', async () => {
    for (const reason of [' ', '\t\r\n', 'x'.repeat(4001)]) await assert.rejects(asRole('authenticated',ids.verifier,'SELECT public.review_public_report($1,$2,$3)',[reportId,'under_review',reason]),error=>error.code==='22023')
    const auditBefore=(await query('SELECT count(*)::int AS n FROM public.audit_logs'))[0].n
    await db.exec(`CREATE FUNCTION public.local_reject_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'LOCAL injected history failure'; END $$; CREATE TRIGGER local_reject_history BEFORE INSERT ON public.report_status_history FOR EACH ROW EXECUTE FUNCTION public.local_reject_history();`)
    await assert.rejects(asRole('authenticated',ids.verifier,'SELECT public.review_public_report($1,$2,NULL)',[reportId,'under_review']))
    assert.equal((await query('SELECT status FROM public.public_reports WHERE id=$1',[reportId]))[0].status,'unverified')
    assert.equal((await query('SELECT count(*)::int AS n FROM public.audit_logs'))[0].n,auditBefore)
    await db.exec('DROP TRIGGER local_reject_history ON public.report_status_history; DROP FUNCTION public.local_reject_history()')
    await asRole('authenticated',ids.verifier,'SELECT public.review_public_report($1,$2,NULL)',[reportId,'under_review'])
    assert.equal((await query(`SELECT reason FROM public.report_status_history WHERE report_id=$1 AND to_status='under_review'`,[reportId]))[0].reason,null)
    await asRole('authenticated',ids.verifier,'SELECT public.review_public_report($1,$2,$3)',[reportId,'verified',' \t'+String.fromCodePoint(0x1f642).repeat(4000)+'\n'])
    assert.equal((await query(`SELECT char_length(reason) AS n FROM public.report_status_history WHERE report_id=$1 AND to_status='verified'`,[reportId]))[0].n,4000)
  })
  await check('Tracking rejects a foreign token and does not expose private report fields', async () => {
    assert.equal((await asRole('service_role',null,'SELECT public.track_report_v1($1,$2) AS result',[code,'b'.repeat(64)]))[0].result,null)
    const row=(await asRole('service_role',null,'SELECT public.track_report_v1($1,$2) AS result',[code,token]))[0].result
    assert.equal(row.status,'verified'); assert.deepEqual(Object.keys(row).sort(),['created_at','history','status','updated_at'])
  })
  await check('Last Super Admin is protected and rate quotas enforce durable client bounds', async () => {
    await assert.rejects(asRole('authenticated',ids.super,'SELECT public.admin_manage_staff($1,$2,false,$3)',[ids.super,'LOCAL super',['super_admin']]),error=>error.code==='22023')
    for(let i=0;i<5;i++) assert.equal((await asRole('service_role',null,`SELECT public.report_api_rate_limit('submit',$1) AS allowed`,['a'.repeat(64)]))[0].allowed,true)
    assert.equal((await asRole('service_role',null,`SELECT public.report_api_rate_limit('submit',$1) AS allowed`,['a'.repeat(64)]))[0].allowed,false)
  })
  await check('Private evidence policy blocks even an existing permissive storage policy', async () => {
    await db.exec(`INSERT INTO storage.objects(bucket_id) VALUES('report-evidence')`)
    assert.equal((await asRole('anon',null,'SELECT bucket_id FROM storage.objects')).length,1)
    await assert.rejects(asRole('authenticated',ids.super,`INSERT INTO storage.objects(bucket_id) VALUES('report-evidence')`),error=>error.code==='42501')
  })
  await check('Repeat release fails closed without replacing existing objects/data', async () => {
    await assert.rejects(db.exec(release)); await db.exec('ROLLBACK')
    assert.equal((await query(`SELECT count(*)::int AS n FROM public.articles WHERE slug='existing-local-data'`))[0].n,1)
  })
  await check('Rollback refuses later table grants/policy changes instead of overwriting them',async()=>{
    await db.exec('GRANT INSERT ON public.source_sync_logs TO authenticated')
    await assert.rejects(db.exec(rollback),error=>/relation\/ACL\/policy\/trigger drift/.test(error.message));await db.exec('ROLLBACK')
    assert.equal((await query(`SELECT has_table_privilege('authenticated','public.source_sync_logs','INSERT') AS allowed`))[0].allowed,true)
    await db.exec('REVOKE INSERT ON public.source_sync_logs FROM authenticated')
    const original=(await query(`SELECT qual FROM pg_policies WHERE policyname='rs_live_sources_write' AND schemaname='public'`))[0].qual
    await db.exec('ALTER POLICY rs_live_sources_write ON public.data_sources USING(true)')
    await assert.rejects(db.exec(rollback),error=>/relation\/ACL\/policy\/trigger drift/.test(error.message));await db.exec('ROLLBACK')
    await db.exec(`ALTER POLICY rs_live_sources_write ON public.data_sources USING(${original})`)
  })
  await check('Rollback restores the original review body/ACL and preserves app data/evidence', async () => {
    await db.exec(rollback)
    assert.equal((await query(`SELECT count(*)::int AS n FROM public.public_reports WHERE id=$1`,[reportId]))[0].n,1)
    assert.equal((await query(`SELECT count(*)::int AS n FROM public.articles WHERE slug='existing-local-data'`))[0].n,1)
    assert.ok((await query(`SELECT to_regclass('rekansiaga_release.backup_v1') AS object`))[0].object)
    assert.equal((await asRole('anon',null,'SELECT bucket_id FROM storage.objects')).length,1)
    const restored=(await query(`SELECT pg_get_functiondef(oid) AS definition,proacl::text AS acl FROM pg_proc WHERE oid='public.review_public_report(uuid,text,text)'::regprocedure`))[0]
    assert.deepEqual(restored,baselineReview)
    assert.deepEqual(await query(`SELECT defaclrole,defaclnamespace,defaclobjtype,defaclacl::text FROM pg_default_acl WHERE defaclrole='supabase_admin'::regrole ORDER BY defaclnamespace,defaclobjtype`),managedDefaults)
  })
  await check('Repeated rollback/release after recovery stop safely and preserve retained data',async()=>{
    await assert.rejects(db.exec(rollback));await db.exec('ROLLBACK')
    await assert.rejects(db.exec(release));await db.exec('ROLLBACK')
    assert.equal((await query('SELECT count(*)::int AS n FROM public.public_reports WHERE id=$1',[reportId]))[0].n,1)
    assert.equal((await query(`SELECT count(*)::int AS n FROM public.articles WHERE slug='existing-local-data'`))[0].n,1)
  })
} catch(error) {
  evidence.failure={code:error.code??'ASSERTION',message:error.message};console.error('FAIL LOCAL SQL:',error.code??'ASSERTION',error.message);process.exitCode=1
} finally {
  await db.close();mkdirSync('docs/qa/live-admin',{recursive:true});writeFileSync('docs/qa/live-admin/preflight-runtime.json',JSON.stringify(evidence,null,2))
}
