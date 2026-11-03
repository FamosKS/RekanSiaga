-- Targeted after-release checks, not a repeated full baseline audit or JWT proof.
-- Verify Dashboard staging first. Never call an application RPC here.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path=pg_catalog,public;
SET LOCAL rekansiaga.validation_ref='fweeyflixnqbvvceuent';
SET LOCAL rekansiaga.validation_stage='A'; -- operator chooses A, B or C1
-- For already-committed resume, enable ONE state in the SQL Editor copy:
-- SET LOCAL rekansiaga.validation_fixture_state='USER';
-- SET LOCAL rekansiaga.validation_fixture_state='NO_ROLE';
-- SET LOCAL rekansiaga.validation_fixture_state='IM';
DO $checks$
DECLARE stage text:=current_setting('rekansiaga.validation_stage');
BEGIN
 IF current_setting('rekansiaga.validation_ref',true) IS DISTINCT FROM 'fweeyflixnqbvvceuent' OR current_user<>'postgres' THEN RAISE EXCEPTION 'Verify staging reference'; END IF;
 IF stage NOT IN ('A','B','C1') THEN RAISE EXCEPTION 'Unknown validation stage'; END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public')<>27 OR
 (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p') AND relrowsecurity)<>26 OR
 (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace)<>6 OR
 (SELECT count(*) FROM public.roles)<>4 OR (SELECT count(*) FROM public.data_sources)<>2 OR
 NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.has_staff_role(text[])'::regprocedure AND prosecdef AND pg_get_userbyid(proowner)='postgres' AND proconfig=ARRAY['search_path=""']::text[] AND md5(replace(prosrc,E'\r',''))='67c25ec4933e2b01f8c501bcafb661a2') THEN RAISE EXCEPTION 'Stage counts/helper drift'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='roles_assigned_active_staff_read' AND cmd='SELECT' AND roles::text[]=ARRAY['authenticated']::text[]) OR
 NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='roles_staff_read' AND qual='has_staff_role(ARRAY[''super_admin''::text])') THEN RAISE EXCEPTION 'A policies missing/drifted; inspect full expression below'; END IF;
 IF stage IN ('B','C1') AND NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.review_public_report(uuid,text,text)'::regprocedure AND md5(replace(prosrc,E'\r',''))='732ed6c024fe909237d63847547f46e8' AND prosecdef AND pg_get_userbyid(proowner)='postgres' AND proconfig=ARRAY['search_path=""']::text[]) THEN RAISE EXCEPTION 'B body/owner/path drift'; END IF;
 IF has_function_privilege('anon','public.review_public_report(uuid,text,text)','EXECUTE') OR
 NOT has_function_privilege('authenticated','public.review_public_report(uuid,text,text)','EXECUTE') OR
 NOT has_function_privilege('service_role','public.review_public_report(uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Review EXECUTE drift'; END IF;
 IF stage='C1' AND EXISTS(
 SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a WHERE d.defaclrole='postgres'::regrole
 AND d.defaclnamespace='public'::regnamespace AND d.defaclobjtype IN ('r','S','f') AND a.grantee IN (0,'anon'::regrole::oid,'authenticated'::regrole::oid)) THEN RAISE EXCEPTION 'C1 public-local client defaults remain'; END IF;
END;
$checks$;
-- Optional complete USER / NO_ROLE / IM snapshot verification. No DML or RPC.
DO $user_snapshot$
DECLARE fixture text:=NULLIF(current_setting('rekansiaga.validation_fixture_state',true),'');
BEGIN
 IF fixture IS NULL THEN RETURN; END IF;
 IF fixture NOT IN ('USER','NO_ROLE','IM') OR current_setting('rekansiaga.validation_stage')<>'A' THEN
 RAISE EXCEPTION 'Only stage A USER/NO_ROLE/IM snapshot verification supported'; END IF;
 IF session_user<>'postgres' OR
 (SELECT count(*) FROM auth.users WHERE id IN ('52280fb9-2fc0-4b39-b31b-8c806074c8c4','02c3da94-39c9-4c4d-bd37-d6040607ff81'))<>2 OR
 (fixture='USER' AND (SELECT count(*) FROM public.staff_profiles)<>1) OR
 (fixture IN ('NO_ROLE','IM') AND ((SELECT count(*) FROM public.staff_profiles)<>2 OR
 NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id='02c3da94-39c9-4c4d-bd37-d6040607ff81'
 AND display_name='SYNTHETIC phase4a5a-a-20261023-f768e9e3fb2f4223ac497e84871a1c1f SUBJECT' AND is_active IS TRUE))) OR
 NOT EXISTS(SELECT 1 FROM public.staff_profiles WHERE user_id='52280fb9-2fc0-4b39-b31b-8c806074c8c4'
 AND display_name='SYNTHETIC phase4a5a-a-20261023-f768e9e3fb2f4223ac497e84871a1c1f CONTROL' AND is_active IS TRUE) OR
 (fixture IN ('USER','NO_ROLE') AND (SELECT count(*) FROM public.staff_role_assignments)<>1) OR
 (fixture='IM' AND ((SELECT count(*) FROM public.staff_role_assignments)<>2 OR
 NOT EXISTS(SELECT 1 FROM public.staff_role_assignments a JOIN public.roles r ON r.id=a.role_id
 WHERE a.staff_id='02c3da94-39c9-4c4d-bd37-d6040607ff81' AND r.code='information_manager'))) OR
 NOT EXISTS(SELECT 1 FROM public.staff_role_assignments a JOIN public.roles r ON r.id=a.role_id
 WHERE a.staff_id='52280fb9-2fc0-4b39-b31b-8c806074c8c4' AND r.code='super_admin') THEN
 RAISE EXCEPTION '% snapshot mismatch; STOP, do not rerun fixture or advance',fixture; END IF;
 -- The USER API suite only attempted denied staff/role writes, all-zero role
 -- probes and a report RPC with NULL report ID. No real report was targeted.
 -- These current-state checks complement prior PASS denial evidence; they
 -- cannot reconstruct historical changes without a before-image/audit log.
 IF fixture IN ('NO_ROLE','IM') AND (
 EXISTS(SELECT 1 FROM public.roles WHERE id='00000000-0000-4000-8000-000000000000'
 OR name IN ('Synthetic unauthorized grant probe','Synthetic probe')) OR
 EXISTS(SELECT 1 FROM public.public_reports WHERE reviewed_by IN ('52280fb9-2fc0-4b39-b31b-8c806074c8c4','02c3da94-39c9-4c4d-bd37-d6040607ff81')) OR
 EXISTS(SELECT 1 FROM public.report_status_history WHERE changed_by IN ('52280fb9-2fc0-4b39-b31b-8c806074c8c4','02c3da94-39c9-4c4d-bd37-d6040607ff81')))
 THEN RAISE EXCEPTION 'Unexpected prior probe/business effects; STOP, review before resume'; END IF;
END;
$user_snapshot$;
-- Both expected Auth UIDs, profile presence, assignments and role; no emails.
SELECT actor.label,actor.user_id,EXISTS(SELECT 1 FROM auth.users u WHERE u.id=actor.user_id) AS auth_exists,
 p.display_name,p.is_active,a.role_id,r.code AS role_code
FROM (VALUES ('CONTROL','52280fb9-2fc0-4b39-b31b-8c806074c8c4'::uuid),
 ('SUBJECT','02c3da94-39c9-4c4d-bd37-d6040607ff81'::uuid)) actor(label,user_id)
LEFT JOIN public.staff_profiles p ON p.user_id=actor.user_id
LEFT JOIN public.staff_role_assignments a ON a.staff_id=actor.user_id
LEFT JOIN public.roles r ON r.id=a.role_id
WHERE current_setting('rekansiaga.validation_fixture_state',true) IN ('USER','NO_ROLE','IM')
ORDER BY actor.label;
SELECT CASE current_setting('rekansiaga.validation_fixture_state',true)
 WHEN 'USER' THEN 'USER_SNAPSHOT_MATCH' WHEN 'NO_ROLE' THEN 'NO_ROLE_SNAPSHOT_MATCH' WHEN 'IM' THEN 'IM_SNAPSHOT_MATCH' END AS result,
 (SELECT count(*) FROM public.staff_profiles) AS profiles,
 (SELECT count(*) FROM public.staff_role_assignments) AS assignments,
 'READONLY_DATABASE_SNAPSHOT_NOT_JWT_ACCEPTANCE' AS provenance
WHERE current_setting('rekansiaga.validation_fixture_state',true) IN ('USER','NO_ROLE','IM');
SELECT 'PRIOR_USER_PROBES_NO_OBSERVED_EFFECTS' AS result,
 'CURRENT_SNAPSHOT_PLUS_PRIOR_PASS_DENIALS_REQUIRED_NOT_HISTORICAL_PROOF' AS provenance
WHERE current_setting('rekansiaga.validation_fixture_state',true)='NO_ROLE';
SELECT 'PRIOR_NO_ROLE_PROBES_NO_OBSERVED_EFFECTS' AS result,
 'CURRENT_SNAPSHOT_PLUS_PRIOR_PASS_DENIALS_REQUIRED_NOT_HISTORICAL_PROOF' AS provenance
WHERE current_setting('rekansiaga.validation_fixture_state',true)='IM';
SELECT CURRENT_TIMESTAMP AS captured_at,current_setting('rekansiaga.validation_stage') AS stage,
 'METADATA_ONLY_NOT_API_ACCEPTANCE' AS provenance;
SELECT policyname,cmd,roles::text[],qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='roles';
SELECT proname,pg_get_function_identity_arguments(oid),pg_get_userbyid(proowner) AS owner,prosecdef,proconfig,proacl,
 md5(replace(prosrc,E'\r','')) AS body_md5_lf FROM pg_proc WHERE oid IN ('public.has_staff_role(text[])'::regprocedure,'public.review_public_report(uuid,text,text)'::regprocedure);
SELECT pg_get_userbyid(defaclrole) AS creator,defaclnamespace::regnamespace AS schema,defaclobjtype,defaclacl FROM pg_default_acl ORDER BY 1,2,3;
-- Global EXECUTE is deliberately preserved; the built-in fallback also grants PUBLIC.
SELECT 'C1_PUBLIC_ONLY_GLOBAL_EXECUTE_UNCHANGED' AS scope,
 EXISTS(SELECT 1 FROM aclexplode(COALESCE(
 (SELECT defaclacl FROM pg_default_acl WHERE defaclrole='postgres'::regrole AND defaclnamespace=0 AND defaclobjtype='f'),
 acldefault('f','postgres'::regrole))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS global_public_execute;
ROLLBACK;
