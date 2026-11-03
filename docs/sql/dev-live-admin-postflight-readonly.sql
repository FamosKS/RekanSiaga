-- Run after Admin/Security, before regions or gateway activation.
-- SQL Editor project identity must be verified by the operator; expected_ref is
-- a label, not proof of the connected project. No RPC is invoked.
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
WITH expected_functions(signature,authenticated_execute,service_role_execute) AS (
 VALUES
 ('submit_public_report(text,text,text,uuid,text,double precision,double precision)',false,true),
 ('track_public_report(text,text)',false,true),
 ('review_public_report(uuid,text,text)',true,false),
 ('submit_report_v1(text,text,text,text,double precision,double precision,text,text,bigint)',false,true),
 ('track_report_v1(text,text)',false,true),
 ('report_api_rate_limit(text,text)',false,true),
 ('admin_manage_staff(uuid,text,boolean,text[])',true,false),
 ('admin_set_public_setting(text,text,timestamp with time zone)',true,false),
 ('admin_queue_notification(text,text,uuid)',true,false),
 ('rs_live_audit_trigger()',false,false)
), function_acl AS (
 SELECT e.signature,
  p.oid IS NOT NULL AS present,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') AS service_role_execute,
  coalesce(pg_get_userbyid(p.proowner)='postgres' AND p.prosecdef
   AND p.proconfig=ARRAY['search_path=""']::text[]
   AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
   AND has_function_privilege('authenticated',p.oid,'EXECUTE')=e.authenticated_execute
   AND has_function_privilege('service_role',p.oid,'EXECUTE')=e.service_role_execute
   AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'),false) AS pass
 FROM expected_functions e LEFT JOIN pg_proc p ON p.oid=to_regprocedure('public.'||e.signature)
), public_defaults AS (
 SELECT r.creator,
  CASE WHEN r.creator='supabase_admin' THEN 'PROVIDER_MANAGED_INFORMATIONAL' ELSE 'OPERATOR_PUBLIC_SCOPE' END AS classification,
  EXISTS(SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
   WHERE d.defaclrole=to_regrole(r.creator) AND d.defaclnamespace='public'::regnamespace
    AND d.defaclobjtype='f' AND a.grantee IN ('anon'::regrole,'authenticated'::regrole) AND a.privilege_type='EXECUTE') AS direct_client_execute
 FROM (VALUES ('postgres'),('supabase_admin')) r(creator)
), release_objects AS (
 SELECT to_regnamespace('rekansiaga_release') IS NOT NULL AS release_schema,
  to_regclass('rekansiaga_release.backup_v1') IS NOT NULL AS backup_snapshot,
  to_regclass('public.app_public_config') IS NOT NULL AS public_config_view,
  to_regclass('public.report_api_limits') IS NOT NULL AS rate_table
), rls AS (
 SELECT t.name,coalesce(c.relrowsecurity,false) AS enabled
 FROM unnest(ARRAY['staff_profiles','staff_role_assignments','roles','articles','mitigation_guides','mitigation_checklist_items','disaster_events','event_updates','event_locations','emergency_contacts','relief_locations','data_sources','source_sync_logs','notification_rules','notifications','audit_logs','app_settings','public_reports','report_attachments','report_status_history','report_access_tokens','report_api_limits']) t(name)
 LEFT JOIN pg_class c ON c.oid=to_regclass('public.'||t.name)
), evidence_bucket AS (
 SELECT count(*)=1 AND coalesce(bool_and(NOT public AND file_size_limit=5242880
  AND allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp']::text[]),false) AS pass
 FROM storage.buckets WHERE id='report-evidence'
), boundaries AS (
 SELECT NOT has_table_privilege('authenticated','public.public_reports','UPDATE')
  AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename IN ('public_reports','report_access_tokens','report_attachments','report_status_history'))
  AND EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='rs_live_private_evidence' AND permissive='RESTRICTIVE') AS pass
)
SELECT jsonb_build_object(
 'kind','rekansiaga-dev-live-admin-postflight-v1',
 'read_only',current_setting('transaction_read_only')='on',
 'target',jsonb_build_object('current_user',current_user,'session_user',session_user,'expected_ref','uiuiouosblyuqgnvfpeh','management_identity_verified',false),
 'security_pass',(SELECT bool_and(pass) FROM function_acl)
  AND NOT (SELECT direct_client_execute FROM public_defaults WHERE creator='postgres')
  AND (SELECT release_schema AND backup_snapshot AND public_config_view AND rate_table FROM release_objects)
  AND (SELECT bool_and(enabled) FROM rls) AND (SELECT pass FROM evidence_bucket) AND (SELECT pass FROM boundaries),
 'function_acl',(SELECT jsonb_agg(to_jsonb(function_acl) ORDER BY signature) FROM function_acl),
 'public_function_defaults',(SELECT jsonb_agg(to_jsonb(public_defaults) ORDER BY creator) FROM public_defaults),
 'defaults_note','Provider defaults are informational. postgres/public narrowing does not revoke global PUBLIC defaults; effective per-function ACLs are authoritative.',
 'release_objects',(SELECT to_jsonb(release_objects) FROM release_objects),
 'evidence_bucket',(SELECT to_jsonb(evidence_bucket) FROM evidence_bucket),
 'rls',(SELECT jsonb_agg(to_jsonb(rls) ORDER BY name) FROM rls),
 'report_boundaries',(SELECT to_jsonb(boundaries) FROM boundaries),
 'acceptance','Catalog security only; Admin CRUD, Web Public, gateway and Flutter runtime acceptance remain separate.'
) AS rekansiaga_live_admin_postflight;
ROLLBACK;
