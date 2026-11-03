-- PERMANENT ROLLBACK REVIEW ONLY. Separate operator approval required.
-- REVIEW ONLY: permanent rollback AFTER approved persistent A deployment, never baseline.
-- Removes only the exact reviewed A policy in one atomic committed transaction.
-- NOT executed. Requires separate approval for permanent removal.
-- Fixture rows/accounts are NOT deleted; no B/C1 or managed object changes.
BEGIN;
-- Fill/uncomment after verifying staging Dashboard and approving rehearsal:
-- SET LOCAL rekansiaga.staging_target = 'rekansiaga-staging-confirmed-by-operator';
-- SET LOCAL rekansiaga.reviewed_staging_project_ref = 'fweeyflixnqbvvceuent';
-- SET LOCAL rekansiaga.remediation_a_rollback_approval = 'approved-remediation-a-permanent-rollback';
-- Copy md5(pg_get_expr(polqual,polrelid)) from reviewed persistent A release
-- captured under the SAME pg_catalog,public search_path, not an unknown policy.
-- SET LOCAL rekansiaga.reviewed_remediation_a_policy_md5 = '<reviewed-policy-expression-md5>';
SET LOCAL search_path = pg_catalog, public;
DO $rollback_guard$
DECLARE policy_oid oid;
BEGIN
 IF current_user <> 'postgres' OR
    current_setting('rekansiaga.staging_target',true) IS DISTINCT FROM 'rekansiaga-staging-confirmed-by-operator' OR
    current_setting('rekansiaga.reviewed_staging_project_ref',true) IS DISTINCT FROM 'fweeyflixnqbvvceuent' OR
    current_setting('rekansiaga.remediation_a_rollback_approval',true) IS DISTINCT FROM 'approved-remediation-a-permanent-rollback' OR
    COALESCE(current_setting('rekansiaga.reviewed_remediation_a_policy_md5',true),'') !~ '^[a-f0-9]{32}$' THEN
  RAISE EXCEPTION 'Rollback target/approval/reviewed policy fingerprint missing';
 END IF;
 SELECT oid INTO policy_oid FROM pg_policy WHERE polrelid='public.roles'::regclass
   AND polname='roles_assigned_active_staff_read' AND polcmd='r' AND polpermissive
   AND polroles=ARRAY['authenticated'::regrole::oid]
   AND md5(pg_get_expr(polqual,polrelid))=current_setting('rekansiaga.reviewed_remediation_a_policy_md5');
 IF policy_oid IS NULL OR
    (SELECT count(*) FROM pg_policies WHERE schemaname='public') <> 27 OR
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles'
      AND policyname='roles_staff_read' AND cmd='SELECT'
      AND roles::text[]=ARRAY['authenticated']::text[]
      AND qual='has_staff_role(ARRAY[''super_admin''::text])') THEN
  RAISE EXCEPTION 'Expected exact A policy/version and retained baseline super policy';
 END IF;
END;
$rollback_guard$;
DROP POLICY roles_assigned_active_staff_read ON public.roles;
DO $rollback_check$
BEGIN
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public') <> 26 OR
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='roles' AND policyname='roles_staff_read') THEN
  RAISE EXCEPTION 'Rollback must retain 26 baseline policies including super policy';
 END IF;
END;
$rollback_check$;
SELECT 'A_REMOVAL_BEFORE_COMMIT' AS kind;
COMMIT;
