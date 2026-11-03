-- PHASE 4A.4: READ ONLY evidence collection, NOT a migration or API test.
-- Operator verifies Dashboard rekansiaga-staging name AND reference first.
-- Run BEFORE fixtures/remediation; export the single JSON result privately.
-- No auth/staff/report row data or credentials selected; only catalog definitions,
-- static seed configurations and aggregate fixture counts. Review code for secrets
-- before sharing. No application function invoked. NOT executed by Codex.
-- Also run the existing complete manifest validator, full security audit and
-- event graph inspector separately; this file does not replace them.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path = pg_catalog, public, extensions;
WITH tables AS (
 SELECT c.* FROM pg_class c WHERE c.relnamespace='public'::regnamespace
  AND c.relkind IN ('r','p')
), routines AS (
 SELECT p.* FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
), expected_functions(signature,body_md5_lf,definer,client_auth,service_exec,result_type) AS (
 VALUES
 ('public.set_updated_at()','c84e2423149cc50cb9cdc219d6f39271',false,false,NULL::boolean,'trigger'),
 ('public.has_staff_role(text[])','67c25ec4933e2b01f8c501bcafb661a2',true,true,true,'boolean'),
 ('public.review_public_report(uuid,text,text)','e6794d177f113714876243dc456bcbe6',true,true,true,'boolean'),
 ('public.submit_public_report(text,text,text,uuid,text,double precision,double precision)',
  'c5c4be3fd12b17b597631b3b980477ee',true,false,true,'TABLE(tracking_code text, access_token text)'),
 ('public.track_public_report(text,text)','a6b5e22d8884b8c9c3ff1cb00eb6024b',true,false,true,
  'TABLE(report_status text, created_at timestamp with time zone, updated_at timestamp with time zone)')
), client_roles AS (
 SELECT r.* FROM pg_roles r WHERE rolname IN ('anon','authenticated','service_role')
)
SELECT jsonb_build_object(
 'kind','STAGING_BASELINE_ADDITIONAL_METADATA_NOT_AUTHENTICATED_API_PROOF',
 'captured_at',CURRENT_TIMESTAMP,'database_name',current_database(),
 'executing_role',current_user,'session_user',session_user,
 'transaction_read_only',current_setting('transaction_read_only'),
 'server_version',current_setting('server_version'),
 'target_note','Dashboard project reference must be recorded separately; postgres database name is not staging identity',
 'counts',jsonb_build_object(
  'tables',(SELECT count(*) FROM tables),'rls_enabled',(SELECT count(*) FROM tables WHERE relrowsecurity),
  'routines',(SELECT count(*) FROM routines),
  'policies',(SELECT count(*) FROM pg_policy WHERE polrelid IN (SELECT oid FROM tables)),
  'columns',(SELECT count(*) FROM pg_attribute WHERE attrelid IN (SELECT oid FROM tables) AND attnum>0 AND NOT attisdropped),
  'indexes',(SELECT count(*) FROM pg_index WHERE indrelid IN (SELECT oid FROM tables))),
 'relations',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),
  'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl::text,'options',c.reloptions)
  ORDER BY c.relname) FROM pg_class c WHERE c.relnamespace='public'::regnamespace
   AND c.relkind IN ('r','p','v','m','f','S')),'[]'::jsonb),
 'constraint_counts',COALESCE((SELECT jsonb_object_agg(x.contype,x.total) FROM (
  SELECT c.contype::text,count(*) AS total FROM pg_constraint c JOIN tables t ON t.oid=c.conrelid
  GROUP BY c.contype) x),'{}'::jsonb),
 'raw_constraints',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'table',t.relname,'name',c.conname,'type',c.contype,'validated',c.convalidated,
  'definition',pg_get_constraintdef(c.oid,true)) ORDER BY t.relname,c.conname)
  FROM pg_constraint c JOIN tables t ON t.oid=c.conrelid),'[]'::jsonb),
 'raw_indexes',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'table',t.relname,'definition',pg_get_indexdef(i.indexrelid),
  'valid',i.indisvalid,'ready',i.indisready,'primary',i.indisprimary,'unique',i.indisunique)
  ORDER BY t.relname,i.indexrelid) FROM pg_index i JOIN tables t ON t.oid=i.indrelid),'[]'::jsonb),
 'raw_policies',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'table',p.tablename,'name',p.policyname,'roles',p.roles::text[],
  'command',p.cmd,'permissive',p.permissive,'using',p.qual,'with_check',p.with_check)
  ORDER BY p.tablename,p.policyname) FROM pg_policies p WHERE p.schemaname='public'),'[]'::jsonb),
 'application_function_checks',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'expected_signature',e.signature,'present',p.oid IS NOT NULL,
  'kind',p.prokind,'owner',pg_get_userbyid(p.proowner),
  'owner_matches',COALESCE(pg_get_userbyid(p.proowner)='postgres',false),
  'definer_matches',p.prosecdef IS NOT DISTINCT FROM e.definer,
  'result',pg_get_function_result(p.oid),'result_expected',e.result_type,
  'result_matches',pg_get_function_result(p.oid) IS NOT DISTINCT FROM e.result_type,
  'config',p.proconfig,'empty_search_path_matches',COALESCE(p.proconfig @> ARRAY['search_path=""']::text[],false),
  'body_matches_baseline',COALESCE(md5(replace(p.prosrc,E'\r',''))=e.body_md5_lf,false),
  'public_execute',EXISTS (SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a
   WHERE a.grantee=0 AND a.privilege_type='EXECUTE'),
  'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
  'anon_denied',has_function_privilege('anon',p.oid,'EXECUTE') IS NOT DISTINCT FROM false,
  'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
  'authenticated_matches',has_function_privilege('authenticated',p.oid,'EXECUTE') IS NOT DISTINCT FROM e.client_auth,
  'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE'),
  'service_expected',e.service_exec,
  'service_matches_when_specified',CASE WHEN e.service_exec IS NOT NULL THEN
   has_function_privilege('service_role',p.oid,'EXECUTE') IS NOT DISTINCT FROM e.service_exec END)
  ORDER BY e.signature) FROM expected_functions e LEFT JOIN routines p ON p.oid=to_regprocedure(e.signature)), '[]'::jsonb),
 'all_public_routines',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'oid',p.oid,'name',p.proname,'kind',p.prokind,'identity_arguments',pg_get_function_identity_arguments(p.oid),
  'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,
  'config',p.proconfig,'acl',p.proacl::text,
  'definition',CASE WHEN p.prokind IN ('f','p') THEN pg_get_functiondef(p.oid) END)
  ORDER BY p.proname,p.oid) FROM routines p),'[]'::jsonb),
 'row_triggers',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'table',t.relname,'name',g.tgname,'enabled',g.tgenabled,'function',g.tgfoid::regprocedure::text,
  'definition',pg_get_triggerdef(g.oid,true)) ORDER BY t.relname,g.tgname)
  FROM pg_trigger g JOIN tables t ON t.oid=g.tgrelid WHERE NOT g.tgisinternal),'[]'::jsonb),
 'explicit_column_acls',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'table',t.relname,'column',a.attname,'acl',a.attacl::text) ORDER BY t.relname,a.attnum)
  FROM pg_attribute a JOIN tables t ON t.oid=a.attrelid
  WHERE a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL),'[]'::jsonb),
 'schema_privileges',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'role',r.rolname,'usage',has_schema_privilege(r.oid,n.oid,'USAGE'),
  'create',has_schema_privilege(r.oid,n.oid,'CREATE')) ORDER BY r.rolname)
  FROM client_roles r CROSS JOIN pg_namespace n WHERE n.nspname='public'),'[]'::jsonb),
 'role_flags',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'role',r.rolname,'superuser',r.rolsuper,'bypass_rls',r.rolbypassrls,'inherit',r.rolinherit,
  'create_role',r.rolcreaterole,'login',r.rolcanlogin) ORDER BY r.rolname)
  FROM client_roles r),'[]'::jsonb),
 'all_default_acls',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'creator',pg_get_userbyid(d.defaclrole),'schema',n.nspname,'global',d.defaclnamespace=0,
  'object_type',d.defaclobjtype,'acl',d.defaclacl::text)
  ORDER BY d.defaclrole,d.defaclnamespace,d.defaclobjtype)
  FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace),'[]'::jsonb),
 'role_seeds',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'code',r.code,'name',r.name,'description',r.description) ORDER BY r.code) FROM public.roles r),'[]'::jsonb),
 'source_seeds',COALESCE((SELECT jsonb_agg(jsonb_build_object(
  'name',s.name,'type',s.source_type,'url',s.official_url,'active',s.is_active,
  'api_identifier_is_null',s.api_identifier IS NULL) ORDER BY s.name) FROM public.data_sources s),'[]'::jsonb),
 'fixture_counts',jsonb_build_object(
  'profiles',(SELECT count(*) FROM public.staff_profiles),
  'assignments',(SELECT count(*) FROM public.staff_role_assignments),
  'reports',(SELECT count(*) FROM public.public_reports),
  'history',(SELECT count(*) FROM public.report_status_history),
  'tokens',(SELECT count(*) FROM public.report_access_tokens)),
 'note','Metadata only. No overall security PASS. Baseline hashes are pre-remediation; after A/B/C use a reviewed phase-specific manifest. Missing default-ACL rows do not imply deny; built-in defaults and role inheritance require review.'
) AS phase4a4_baseline_supplemental;
ROLLBACK;
