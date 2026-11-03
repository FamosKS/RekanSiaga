-- REVIEW / APPROVAL REQUIRED. Disable frontend write/gateway flags and the Edge
-- gateway BEFORE rollback. Preserve reports, audit rows, rate rows and private files.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- SET LOCAL rekansiaga.release_ref='uiuiouosblyuqgnvfpeh';
-- SET LOCAL rekansiaga.release_approval='rollback-dev-live-admin-v1';
DO $guard$ BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh' OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'rollback-dev-live-admin-v1' OR to_regclass('rekansiaga_release.backup_v1') IS NULL THEN RAISE EXCEPTION 'STOP: approved dev rollback with original snapshot required'; END IF;
 PERFORM pg_advisory_xact_lock(50426,1);
 IF (SELECT count(*) FROM rekansiaga_release.backup_v1 WHERE kind='installed_function')<>9 OR EXISTS(SELECT 1 FROM rekansiaga_release.backup_v1 b LEFT JOIN pg_proc p ON p.oid=to_regprocedure(b.name) WHERE b.kind='installed_function' AND (p.oid IS NULL OR md5(pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')) IS DISTINCT FROM b.ddl)) THEN RAISE EXCEPTION 'Post-release function/ACL drift: preserve later hotfixes and review recovery'; END IF;
 IF (SELECT count(*) FROM rekansiaga_release.backup_v1 WHERE kind='installed_relation')<>19 OR EXISTS(SELECT 1 FROM rekansiaga_release.backup_v1 b WHERE b.kind='installed_relation' AND rekansiaga_release.relation_fingerprint(to_regclass(b.name)) IS DISTINCT FROM b.ddl) THEN RAISE EXCEPTION 'Post-release relation/ACL/policy/trigger drift: preserve later changes and review recovery'; END IF;
END $guard$;
DO $triggers$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['staff_profiles','staff_role_assignments','articles','mitigation_guides','mitigation_checklist_items','disaster_events','event_updates','event_locations','emergency_contacts','relief_locations','data_sources','notification_rules','notifications','app_settings','public_reports'] LOOP EXECUTE format('DROP TRIGGER IF EXISTS rs_live_audit ON public.%I',t); END LOOP;
END $triggers$;
DROP FUNCTION public.rs_live_audit_trigger();
DROP FUNCTION public.admin_manage_staff(uuid,text,boolean,text[]);
DROP FUNCTION public.admin_set_public_setting(text,text,timestamptz);
DROP FUNCTION public.admin_queue_notification(text,text,uuid);
DROP VIEW public.app_public_config;
DROP FUNCTION public.report_api_rate_limit(text,text);
DROP FUNCTION public.submit_report_v1(text,text,text,text,double precision,double precision,text,text,bigint);
DROP FUNCTION public.track_report_v1(text,text);
DROP POLICY rs_live_assigned_roles ON public.roles;
DROP POLICY rs_live_settings_read ON public.app_settings;
DROP POLICY rs_live_sources_write ON public.data_sources;
DROP POLICY rs_live_rules ON public.notification_rules;
DROP POLICY rs_live_queue_read ON public.notifications;
DROP POLICY rs_live_sync_read ON public.source_sync_logs;
DROP POLICY rs_live_audit_read ON public.audit_logs;
REVOKE SELECT(key,value,updated_at) ON public.app_settings FROM authenticated;
REVOKE SELECT(id,actor_id,action,entity_type,entity_id,created_at) ON public.audit_logs FROM authenticated;
DO $restore$ DECLARE item record; BEGIN
 FOR item IN SELECT ddl FROM rekansiaga_release.backup_v1 WHERE kind IN ('function','function_acl','table_acl','column_acl') ORDER BY CASE kind WHEN 'function' THEN 0 WHEN 'function_acl' THEN 1 WHEN 'table_acl' THEN 2 ELSE 3 END,name LOOP EXECUTE item.ddl; END LOOP;
END $restore$;
-- Never restore the legacy direct-public report boundary. The gateway-only
-- service-role ACL remains the required safe state after rollback.
-- Keep the narrowed postgres/public defaults. Provider-owned supabase_admin
-- defaults and global/non-public defaults are never changed by release/recovery.
REVOKE ALL ON FUNCTION public.submit_public_report(text,text,text,uuid,text,double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_report(text,text,text,uuid,text,double precision,double precision) TO service_role;
REVOKE ALL ON FUNCTION public.track_public_report(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.track_public_report(text,text) TO service_role;
REVOKE ALL ON FUNCTION public.review_public_report(uuid,text,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.review_public_report(uuid,text,text) TO authenticated;
DO $verify_restore$ BEGIN
 IF EXISTS(SELECT 1 FROM rekansiaga_release.backup_v1 b WHERE b.kind='baseline_relation' AND rekansiaga_release.relation_fingerprint(to_regclass(b.name)) IS DISTINCT FROM b.ddl) THEN RAISE EXCEPTION 'Rollback metadata did not match original snapshot; transaction aborted'; END IF;
 IF has_function_privilege('anon','public.submit_public_report(text,text,text,uuid,text,double precision,double precision)','EXECUTE') OR has_function_privilege('authenticated','public.submit_public_report(text,text,text,uuid,text,double precision,double precision)','EXECUTE') OR has_function_privilege('anon','public.track_public_report(text,text)','EXECUTE') OR has_function_privilege('authenticated','public.track_public_report(text,text)','EXECUTE') OR has_function_privilege('anon','public.review_public_report(uuid,text,text)','EXECUTE') OR has_function_privilege('service_role','public.review_public_report(uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Rollback would expose report RPCs'; END IF;
END $verify_restore$;
-- Intentionally preserve private evidence restriction and RLS-protected quota
-- table/backup so rollback cannot publish evidence or destroy operational data.
NOTIFY pgrst,'reload schema';
COMMIT;
