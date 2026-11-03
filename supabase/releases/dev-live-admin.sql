-- REVIEW / APPROVAL REQUIRED. DEV ONLY: uiuiouosblyuqgnvfpeh.
-- First inspect docs/sql/dev-mvp-readonly.sql. This is not a staging migration.
-- The GUC is an operator attestation, not proof of Cloud project identity.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- Uncomment only in the approved operator copy after Dashboard project verification:
-- SET LOCAL rekansiaga.release_ref='uiuiouosblyuqgnvfpeh';
-- SET LOCAL rekansiaga.release_approval='approve-dev-live-admin-v1';
-- Supabase's internal supabase_admin defaults are provider-managed metadata,
-- not effective privileges on these postgres-owned RPCs. Never alter that role.
-- https://supabase.com/docs/guides/api/securing-your-api
-- Every release function gets an explicit object ACL in this transaction;
-- effective privileges (including PUBLIC/inheritance) are asserted before COMMIT.
DO $guard$
DECLARE t text; f text;
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh' OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-dev-live-admin-v1' THEN RAISE EXCEPTION 'STOP: explicit dev project/scope approval required'; END IF;
 PERFORM pg_advisory_xact_lock(50426,1);
 FOREACH t IN ARRAY ARRAY['staff_profiles','staff_role_assignments','roles','articles','mitigation_guides','mitigation_checklist_items','disaster_events','event_updates','event_locations','emergency_contacts','relief_locations','data_sources','source_sync_logs','notification_rules','notifications','audit_logs','app_settings','public_reports','report_attachments','report_status_history','report_access_tokens'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t AND c.relkind='r' AND c.relrowsecurity AND pg_get_userbyid(c.relowner)='postgres') THEN RAISE EXCEPTION 'Missing/unreviewed RLS table: %',t; END IF;
 END LOOP;
 FOREACH f IN ARRAY ARRAY['has_staff_role(text[])','submit_public_report(text,text,text,uuid,text,double precision,double precision)','track_public_report(text,text)','review_public_report(uuid,text,text)'] LOOP
  IF to_regprocedure('public.'||f) IS NULL THEN RAISE EXCEPTION 'Missing reviewed function: %',f; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.'||f) AND prosecdef AND pg_get_userbyid(proowner)='postgres' AND proconfig=ARRAY['search_path=""']::text[]) THEN RAISE EXCEPTION 'Unreviewed helper owner/path/security: %',f; END IF;
 END LOOP;
 IF has_table_privilege('authenticated','public.public_reports','UPDATE') THEN RAISE EXCEPTION 'Unsafe report table UPDATE grant; review catalog before this release'; END IF;
 IF to_regnamespace('rekansiaga_release') IS NOT NULL OR to_regclass('public.report_api_limits') IS NOT NULL OR to_regclass('public.app_public_config') IS NOT NULL THEN RAISE EXCEPTION 'Release already present or conflicting objects; do not rerun blindly'; END IF;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename IN ('app_settings','audit_logs','source_sync_logs','notification_rules','notifications')) THEN RAISE EXCEPTION 'Existing operational policies require explicit merge review'; END IF;
 FOREACH t IN ARRAY ARRAY['staff_profiles','staff_role_assignments','roles'] LOOP IF NOT has_table_privilege('authenticated','public.'||t,'SELECT') THEN RAISE EXCEPTION 'Missing baseline staff SELECT grant: %',t; END IF; END LOOP;
 FOREACH f IN ARRAY ARRAY['admin_manage_staff(uuid,text,boolean,text[])','admin_set_public_setting(text,text,timestamp with time zone)','admin_queue_notification(text,text,uuid)','report_api_rate_limit(text,text)','submit_report_v1(text,text,text,text,double precision,double precision,text,text,bigint)','track_report_v1(text,text)','rs_live_audit_trigger()'] LOOP
  IF EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=split_part(f,'(',1)) THEN RAISE EXCEPTION 'Conflicting RPC name/overload: %',f; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE policyname LIKE 'rs_live_%') THEN RAISE EXCEPTION 'Conflicting release policies'; END IF;
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='report-evidence' AND (public OR file_size_limit IS DISTINCT FROM 5242880 OR allowed_mime_types IS DISTINCT FROM ARRAY['image/jpeg','image/png','image/webp']::text[])) THEN RAISE EXCEPTION 'Existing evidence bucket requires separate review'; END IF;
 IF EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename IN ('public_reports','report_access_tokens','report_attachments','report_status_history')) THEN RAISE EXCEPTION 'Private report tables present in public Realtime publication; review before release'; END IF;
END $guard$;

-- Only the operator-owned postgres/public defaults are narrowed. This does not
-- revoke global PUBLIC EXECUTE; explicit per-function REVOKEs below do that.
-- Global/non-public defaults and provider-owned defaults remain unchanged.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon,authenticated;

-- Remediate legacy report RPC ACLs before installing the gateway-only wrappers.
-- These functions are SECURITY DEFINER and must never be directly callable by
-- anon/authenticated; rollback below preserves this secure boundary.
REVOKE ALL ON FUNCTION public.submit_public_report(text,text,text,uuid,text,double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_report(text,text,text,uuid,text,double precision,double precision) TO service_role;
REVOKE ALL ON FUNCTION public.track_public_report(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.track_public_report(text,text) TO service_role;

-- Exact pre-release function definition/ACL and table ACL snapshots for rollback.
CREATE SCHEMA IF NOT EXISTS rekansiaga_release;
REVOKE ALL ON SCHEMA rekansiaga_release FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE rekansiaga_release.backup_v1(kind text NOT NULL,name text NOT NULL,ddl text NOT NULL,PRIMARY KEY(kind,name));
ALTER TABLE rekansiaga_release.backup_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rekansiaga_release.backup_v1 FROM PUBLIC,anon,authenticated,service_role;
-- Fingerprints exclude row contents. They protect later schema/ACL/policy hotfixes
-- and let rollback prove it restored the exact pre-release metadata.
CREATE FUNCTION rekansiaga_release.relation_fingerprint(p_relation oid) RETURNS text LANGUAGE sql STABLE SET search_path='pg_catalog' AS $fingerprint$
 SELECT md5(jsonb_build_object(
  'owner',c.relowner,'kind',c.relkind,'options',c.reloptions,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,
  'acl',(SELECT jsonb_agg(to_jsonb(a) ORDER BY a.grantor,a.grantee,a.privilege_type,a.is_grantable) FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a),
  'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'acl',a.attacl::text) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
  'constraints',(SELECT jsonb_agg(pg_get_constraintdef(k.oid) ORDER BY k.conname) FROM pg_constraint k WHERE k.conrelid=c.oid),
  'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY p.policyname) FROM pg_policies p WHERE p.schemaname=(SELECT nspname FROM pg_namespace WHERE oid=c.relnamespace) AND p.tablename=c.relname),
  'triggers',(SELECT jsonb_agg(pg_get_triggerdef(t.oid) ORDER BY t.tgname) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
  'view',CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid) END
 )::text) FROM pg_class c WHERE c.oid=p_relation;
$fingerprint$;
REVOKE ALL ON FUNCTION rekansiaga_release.relation_fingerprint(oid) FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO rekansiaga_release.backup_v1(kind,name,ddl)
SELECT 'baseline_relation',c.oid::regclass::text,rekansiaga_release.relation_fingerprint(c.oid) FROM pg_class c
WHERE c.oid IN ('public.staff_profiles'::regclass,'public.staff_role_assignments'::regclass,'public.roles'::regclass,'public.articles'::regclass,'public.mitigation_guides'::regclass,'public.mitigation_checklist_items'::regclass,'public.disaster_events'::regclass,'public.event_updates'::regclass,'public.event_locations'::regclass,'public.emergency_contacts'::regclass,'public.relief_locations'::regclass,'public.data_sources'::regclass,'public.notification_rules'::regclass,'public.notifications'::regclass,'public.app_settings'::regclass,'public.audit_logs'::regclass,'public.source_sync_logs'::regclass,'public.public_reports'::regclass);
INSERT INTO rekansiaga_release.backup_v1 SELECT 'function','review_public_report',pg_get_functiondef('public.review_public_report(uuid,text,text)'::regprocedure);
INSERT INTO rekansiaga_release.backup_v1
SELECT 'function_acl','review_public_report', 'REVOKE ALL ON FUNCTION public.review_public_report(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;'||coalesce(string_agg(format('GRANT EXECUTE ON FUNCTION public.review_public_report(uuid,text,text) TO %s%s;',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END,CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END),''),'')
FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid='public.review_public_report(uuid,text,text)'::regprocedure;
INSERT INTO rekansiaga_release.backup_v1
SELECT 'table_acl',c.relname,'REVOKE ALL ON TABLE public.'||quote_ident(c.relname)||' FROM anon,authenticated;'||coalesce(string_agg(format('GRANT %s ON TABLE public.%I TO %I%s;',a.privilege_type,c.relname,pg_get_userbyid(a.grantee),CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END),'') FILTER(WHERE a.grantee IN ('anon'::regrole,'authenticated'::regrole)),'')
FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
WHERE c.oid IN ('public.data_sources'::regclass,'public.source_sync_logs'::regclass,'public.notification_rules'::regclass,'public.notifications'::regclass,'public.audit_logs'::regclass,'public.app_settings'::regclass) GROUP BY c.relname;
INSERT INTO rekansiaga_release.backup_v1
SELECT 'column_acl',c.relname||'.'||att.attname,string_agg(format('GRANT %s(%I) ON TABLE public.%I TO %I%s;',a.privilege_type,att.attname,c.relname,pg_get_userbyid(a.grantee),CASE WHEN a.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END),'')
FROM pg_class c JOIN pg_attribute att ON att.attrelid=c.oid CROSS JOIN LATERAL aclexplode(att.attacl) a
WHERE c.oid IN ('public.app_settings'::regclass,'public.audit_logs'::regclass) AND att.attnum>0 AND NOT att.attisdropped AND a.grantee IN ('anon'::regrole,'authenticated'::regrole) GROUP BY c.relname,att.attname;

-- Assigned active staff can resolve their own role labels. No anonymous role access.
CREATE POLICY rs_live_assigned_roles ON public.roles FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.staff_role_assignments a JOIN public.staff_profiles s ON s.user_id=a.staff_id WHERE a.role_id=roles.id AND a.staff_id=(SELECT auth.uid()) AND s.is_active));

CREATE FUNCTION public.rs_live_audit_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $audit$
DECLARE old_row jsonb; new_row jsonb; actor uuid; entity uuid;
BEGIN
 old_row:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
 new_row:=CASE WHEN TG_OP='DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
 SELECT s.user_id INTO actor FROM public.staff_profiles s WHERE s.user_id=auth.uid();
 entity:=coalesce(new_row->>'id',old_row->>'id',new_row->>'user_id',old_row->>'user_id',new_row->>'staff_id',old_row->>'staff_id')::uuid;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,old_values,new_values)
 VALUES(actor,TG_OP,TG_TABLE_NAME,entity,
  jsonb_build_object('publication_status',old_row->'publication_status','status',old_row->'status','is_active',old_row->'is_active','verification_status',old_row->'verification_status'),
  jsonb_build_object('publication_status',new_row->'publication_status','status',new_row->'status','is_active',new_row->'is_active','verification_status',new_row->'verification_status'));
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $audit$;
REVOKE ALL ON FUNCTION public.rs_live_audit_trigger() FROM PUBLIC,anon,authenticated,service_role;
DO $triggers$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['staff_profiles','staff_role_assignments','articles','mitigation_guides','mitigation_checklist_items','disaster_events','event_updates','event_locations','emergency_contacts','relief_locations','data_sources','notification_rules','notifications','app_settings','public_reports'] LOOP
  EXECUTE format('CREATE TRIGGER rs_live_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.rs_live_audit_trigger()',t);
 END LOOP;
END $triggers$;

CREATE FUNCTION public.admin_manage_staff(p_user_id uuid,p_display_name text,p_is_active boolean,p_roles text[]) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $staff$
DECLARE actor uuid:=auth.uid();
BEGIN
 PERFORM pg_advisory_xact_lock(50426,2);
 IF actor IS NULL OR public.has_staff_role(ARRAY['super_admin']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_user_id IS NULL OR p_display_name IS NULL OR length(btrim(p_display_name)) NOT BETWEEN 2 AND 100 OR p_is_active IS NULL OR p_roles IS NULL OR cardinality(p_roles) NOT BETWEEN 1 AND 4 OR EXISTS(SELECT 1 FROM unnest(p_roles) r WHERE r IS NULL OR r NOT IN ('super_admin','information_manager','report_verifier','mitigation_editor')) OR (SELECT count(DISTINCT r) FROM unnest(p_roles) r)<>cardinality(p_roles) THEN RAISE EXCEPTION 'Invalid staff fields' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RAISE EXCEPTION 'Existing Auth account required' USING ERRCODE='22023'; END IF;
 IF (NOT p_is_active OR NOT ('super_admin'=ANY(p_roles))) AND NOT EXISTS(SELECT 1 FROM public.staff_profiles s JOIN public.staff_role_assignments a ON a.staff_id=s.user_id JOIN public.roles r ON r.id=a.role_id WHERE s.is_active AND r.code='super_admin' AND s.user_id<>p_user_id) THEN RAISE EXCEPTION 'Last active super admin cannot be removed' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.roles WHERE code=ANY(p_roles))<>cardinality(p_roles) THEN RAISE EXCEPTION 'Role catalog incomplete' USING ERRCODE='22023'; END IF;
 INSERT INTO public.staff_profiles(user_id,display_name,is_active) VALUES(p_user_id,btrim(p_display_name),p_is_active) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name,is_active=excluded.is_active;
 DELETE FROM public.staff_role_assignments WHERE staff_id=p_user_id;
 INSERT INTO public.staff_role_assignments(staff_id,role_id) SELECT p_user_id,id FROM public.roles WHERE code=ANY(p_roles);
 RETURN true;
END $staff$;
REVOKE ALL ON FUNCTION public.admin_manage_staff(uuid,text,boolean,text[]) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_manage_staff(uuid,text,boolean,text[]) TO authenticated;

-- Only explicitly approved public-text settings; no arbitrary JSON/credential editor.
CREATE FUNCTION public.admin_set_public_setting(p_key text,p_value text,p_expected_updated_at timestamptz DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $settings$
DECLARE result jsonb;
BEGIN
 IF public.has_staff_role(ARRAY['super_admin']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_key IS NULL OR p_key NOT IN ('site_name','public_notice') OR p_value IS NULL OR length(btrim(p_value)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid public setting' USING ERRCODE='22023'; END IF;
 IF p_expected_updated_at IS NULL THEN
  INSERT INTO public.app_settings(key,value,updated_by) VALUES(p_key,to_jsonb(btrim(p_value)),auth.uid()) ON CONFLICT(key) DO NOTHING RETURNING jsonb_build_object('key',key,'value',value,'updated_at',updated_at) INTO result;
 ELSE
  UPDATE public.app_settings SET value=to_jsonb(btrim(p_value)),updated_by=auth.uid() WHERE key=p_key AND updated_at=p_expected_updated_at RETURNING jsonb_build_object('key',key,'value',value,'updated_at',updated_at) INTO result;
 END IF;
 IF result IS NULL THEN RAISE EXCEPTION 'Setting changed; reload' USING ERRCODE='40001'; END IF;
 RETURN result;
END $settings$;
REVOKE ALL ON FUNCTION public.admin_set_public_setting(text,text,timestamptz) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_public_setting(text,text,timestamptz) TO authenticated;
GRANT SELECT(key,value,updated_at) ON public.app_settings TO authenticated;
CREATE POLICY rs_live_settings_read ON public.app_settings FOR SELECT TO authenticated USING(key IN ('site_name','public_notice') AND public.has_staff_role(ARRAY['super_admin']));
-- New, additive public endpoint exposes two text values, never the whole settings table.
CREATE VIEW public.app_public_config WITH (security_barrier=true) AS SELECT key,value FROM public.app_settings WHERE key IN ('site_name','public_notice') AND jsonb_typeof(value)='string';
-- Views inherit table default ACLs. An updatable definer view must not inherit
-- INSERT/UPDATE/DELETE from managed defaults, even when base-table RLS is strict.
REVOKE ALL ON public.app_public_config FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.app_public_config TO anon,authenticated;

CREATE FUNCTION public.admin_queue_notification(p_title text,p_body text,p_event_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $notification$
DECLARE result jsonb;
BEGIN
 IF public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 5 AND 180 OR p_body IS NULL OR length(btrim(p_body)) NOT BETWEEN 10 AND 2000 THEN RAISE EXCEPTION 'Invalid notification' USING ERRCODE='22023'; END IF;
 INSERT INTO public.notifications(event_id,dedupe_key,title,body,status) VALUES(p_event_id,'manual:'||gen_random_uuid(),btrim(p_title),btrim(p_body),'queued') RETURNING jsonb_build_object('id',id,'status',status) INTO result;
 RETURN result;
END $notification$;
REVOKE ALL ON FUNCTION public.admin_queue_notification(text,text,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_queue_notification(text,text,uuid) TO authenticated;

GRANT INSERT,UPDATE,DELETE ON public.data_sources,public.notification_rules TO authenticated;
GRANT SELECT ON public.notification_rules,public.notifications,public.source_sync_logs TO authenticated;
GRANT SELECT(id,actor_id,action,entity_type,entity_id,created_at) ON public.audit_logs TO authenticated;
CREATE POLICY rs_live_sources_write ON public.data_sources FOR ALL TO authenticated USING(public.has_staff_role(ARRAY['super_admin'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin']));
CREATE POLICY rs_live_rules ON public.notification_rules FOR ALL TO authenticated USING(public.has_staff_role(ARRAY['super_admin','information_manager'])) WITH CHECK(public.has_staff_role(ARRAY['super_admin','information_manager']));
CREATE POLICY rs_live_queue_read ON public.notifications FOR SELECT TO authenticated USING(public.has_staff_role(ARRAY['super_admin','information_manager']));
CREATE POLICY rs_live_sync_read ON public.source_sync_logs FOR SELECT TO authenticated USING(public.has_staff_role(ARRAY['super_admin']));
CREATE POLICY rs_live_audit_read ON public.audit_logs FOR SELECT TO authenticated USING(public.has_staff_role(ARRAY['super_admin']));

-- Existing signature remains compatible. Row lock + role recheck + history are atomic.
CREATE OR REPLACE FUNCTION public.review_public_report(p_report_id uuid,p_new_status text,p_reason text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $review$
DECLARE previous text; actor uuid:=auth.uid(); normalized_reason text;
BEGIN
 IF actor IS NULL OR public.has_staff_role(ARRAY['super_admin','report_verifier']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF p_report_id IS NULL OR p_new_status IS NULL OR p_new_status NOT IN ('under_review','verified','rejected') THEN RAISE EXCEPTION 'Invalid review input' USING ERRCODE='22023'; END IF;
 IF p_reason IS NOT NULL THEN
  normalized_reason:=pg_catalog.btrim(p_reason,E' \t\n\r\f\013');
  IF pg_catalog.char_length(normalized_reason)>4000 OR p_reason !~ '[^[:space:]]' THEN RAISE EXCEPTION 'Invalid review reason' USING ERRCODE='22023'; END IF;
 END IF;
 SELECT status INTO previous FROM public.public_reports WHERE id=p_report_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF public.has_staff_role(ARRAY['super_admin','report_verifier']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 IF NOT ((previous='unverified' AND p_new_status IN ('under_review','verified','rejected')) OR (previous='under_review' AND p_new_status IN ('verified','rejected'))) THEN RAISE EXCEPTION 'Invalid transition' USING ERRCODE='22023'; END IF;
 UPDATE public.public_reports SET status=p_new_status,reviewed_by=actor,reviewed_at=now() WHERE id=p_report_id;
 INSERT INTO public.report_status_history(report_id,from_status,to_status,changed_by,reason) VALUES(p_report_id,previous,p_new_status,actor,normalized_reason);
 RETURN true;
END $review$;
REVOKE ALL ON FUNCTION public.review_public_report(uuid,text,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.review_public_report(uuid,text,text) TO authenticated;

CREATE TABLE public.report_api_limits(bucket_key text PRIMARY KEY,attempts integer NOT NULL CHECK(attempts>0),expires_at timestamptz NOT NULL);
ALTER TABLE public.report_api_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_api_limits FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX report_api_limits_expiry ON public.report_api_limits(expires_at);
CREATE FUNCTION public.report_api_rate_limit(p_action text,p_client_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $rate$
DECLARE slot bigint:=floor(extract(epoch FROM clock_timestamp())/600); scope text; attempts integer; allowed boolean:=true; limit_count integer;
BEGIN
 IF p_action IS NULL OR p_action NOT IN ('submit','track') OR p_client_hash IS NULL OR p_client_hash !~ '^[0-9a-f]{64}$' THEN RAISE EXCEPTION 'Invalid quota request' USING ERRCODE='22023'; END IF;
 FOREACH scope IN ARRAY ARRAY['global',p_client_hash] LOOP
  limit_count:=CASE WHEN scope='global' THEN CASE WHEN p_action='submit' THEN 100 ELSE 1000 END ELSE CASE WHEN p_action='submit' THEN 5 ELSE 30 END END;
  INSERT INTO public.report_api_limits(bucket_key,attempts,expires_at) VALUES(p_action||':'||scope||':'||slot,1,to_timestamp((slot+2)*600)) ON CONFLICT(bucket_key) DO UPDATE SET attempts=least(public.report_api_limits.attempts+1,1000000) RETURNING public.report_api_limits.attempts INTO attempts;
  IF attempts>limit_count THEN allowed:=false; END IF;
 END LOOP;
 WITH expired AS (SELECT bucket_key FROM public.report_api_limits WHERE expires_at<now() ORDER BY expires_at LIMIT 100) DELETE FROM public.report_api_limits WHERE bucket_key IN (SELECT bucket_key FROM expired);
 RETURN allowed;
END $rate$;
REVOKE ALL ON FUNCTION public.report_api_rate_limit(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.report_api_rate_limit(text,text) TO service_role;

CREATE FUNCTION public.submit_report_v1(p_report_type text,p_title text,p_description text,p_location_description text,p_latitude double precision DEFAULT NULL,p_longitude double precision DEFAULT NULL,p_storage_path text DEFAULT NULL,p_mime_type text DEFAULT NULL,p_file_size bigint DEFAULT NULL) RETURNS TABLE(tracking_code text,access_token text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $submit$
DECLARE receipt record; report_id uuid;
BEGIN
 IF (p_storage_path IS NULL)<>(p_mime_type IS NULL) OR (p_storage_path IS NULL)<>(p_file_size IS NULL) OR p_storage_path IS NOT NULL AND (p_storage_path !~ '^reports/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' OR p_mime_type NOT IN ('image/jpeg','image/png','image/webp') OR p_file_size NOT BETWEEN 1 AND 5242880) THEN RAISE EXCEPTION 'Invalid attachment' USING ERRCODE='22023'; END IF;
 SELECT * INTO receipt FROM public.submit_public_report(p_report_type,p_title,p_description,NULL,p_location_description,p_latitude,p_longitude);
 SELECT id INTO STRICT report_id FROM public.public_reports r WHERE r.tracking_code=receipt.tracking_code;
 IF p_storage_path IS NOT NULL THEN INSERT INTO public.report_attachments(report_id,storage_path,mime_type,file_size) VALUES(report_id,p_storage_path,p_mime_type,p_file_size); END IF;
 tracking_code:=receipt.tracking_code; access_token:=receipt.access_token; RETURN NEXT;
END $submit$;
REVOKE ALL ON FUNCTION public.submit_report_v1(text,text,text,text,double precision,double precision,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.submit_report_v1(text,text,text,text,double precision,double precision,text,text,bigint) TO service_role;

CREATE FUNCTION public.track_report_v1(p_tracking_code text,p_access_token text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $track$
 SELECT jsonb_build_object('status',r.status,'created_at',r.created_at,'updated_at',r.updated_at,'history',coalesce((SELECT jsonb_agg(jsonb_build_object('status',h.to_status,'changed_at',h.changed_at) ORDER BY h.changed_at,h.id) FROM public.report_status_history h WHERE h.report_id=r.id),'[]'::jsonb))
 FROM public.public_reports r JOIN public.report_access_tokens t ON t.report_id=r.id
 WHERE p_tracking_code ~ '^RS-[0-9A-F]{16}$' AND p_access_token ~ '^[0-9a-f]{64}$' AND r.tracking_code=p_tracking_code AND t.token_hash=encode(sha256(convert_to(p_access_token,'UTF8')),'hex') AND t.expires_at>now() AND t.revoked_at IS NULL LIMIT 1;
$track$;
REVOKE ALL ON FUNCTION public.track_report_v1(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.track_report_v1(text,text) TO service_role;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('report-evidence','report-evidence',false,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
CREATE POLICY rs_live_private_evidence ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated USING(bucket_id<>'report-evidence') WITH CHECK(bucket_id<>'report-evidence');
-- No Postgres Changes publication is added. Public clients poll public-safe queries only.
-- Refuse rollback if a later hotfix changes these function definitions/ACLs.
INSERT INTO rekansiaga_release.backup_v1(kind,name,ddl)
SELECT 'installed_function',p.oid::regprocedure::text,md5(pg_get_functiondef(p.oid)||coalesce(p.proacl::text,'')) FROM pg_proc p
WHERE p.oid IN ('public.rs_live_audit_trigger()'::regprocedure,'public.admin_manage_staff(uuid,text,boolean,text[])'::regprocedure,'public.admin_set_public_setting(text,text,timestamptz)'::regprocedure,'public.admin_queue_notification(text,text,uuid)'::regprocedure,'public.review_public_report(uuid,text,text)'::regprocedure,'public.report_api_rate_limit(text,text)'::regprocedure,'public.submit_report_v1(text,text,text,text,double precision,double precision,text,text,bigint)'::regprocedure,'public.track_report_v1(text,text)'::regprocedure,'rekansiaga_release.relation_fingerprint(oid)'::regprocedure);
INSERT INTO rekansiaga_release.backup_v1(kind,name,ddl)
SELECT 'installed_relation',name,rekansiaga_release.relation_fingerprint(to_regclass(name)) FROM rekansiaga_release.backup_v1 WHERE kind='baseline_relation';
INSERT INTO rekansiaga_release.backup_v1(kind,name,ddl) VALUES('installed_relation','public.app_public_config',rekansiaga_release.relation_fingerprint('public.app_public_config'::regclass));
-- A managed default ACL is never a substitute for checking the actual RPCs.
-- Abort the entire transaction if PUBLIC or inherited privileges reopen one.
DO $verify_acl$
DECLARE f text; staff_only boolean; role_name text; expected boolean;
BEGIN
 FOREACH f IN ARRAY ARRAY['submit_public_report(text,text,text,uuid,text,double precision,double precision)','track_public_report(text,text)','report_api_rate_limit(text,text)','submit_report_v1(text,text,text,text,double precision,double precision,text,text,bigint)','track_report_v1(text,text)','review_public_report(uuid,text,text)','admin_manage_staff(uuid,text,boolean,text[])','admin_set_public_setting(text,text,timestamp with time zone)','admin_queue_notification(text,text,uuid)','rs_live_audit_trigger()'] LOOP
  staff_only:=split_part(f,'(',1) IN ('review_public_report','admin_manage_staff','admin_set_public_setting','admin_queue_notification');
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   expected:=CASE WHEN f='rs_live_audit_trigger()' OR role_name='anon' THEN false WHEN staff_only THEN role_name='authenticated' ELSE role_name='service_role' END;
   IF has_function_privilege(role_name,to_regprocedure('public.'||f),'EXECUTE') IS DISTINCT FROM expected THEN RAISE EXCEPTION 'STOP: effective RPC EXECUTE mismatch: % / %',f,role_name; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=to_regprocedure('public.'||f) AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'STOP: PUBLIC RPC EXECUTE: %',f; END IF;
 END LOOP;
END $verify_acl$;
NOTIFY pgrst,'reload schema';
COMMIT;
