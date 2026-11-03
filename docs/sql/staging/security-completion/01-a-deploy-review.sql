-- REVIEW ONLY: permanent staging release, NOT approved or executed by preparation.
-- Verify Dashboard rekansiaga-staging / fweeyflixnqbvvceuent independently.
-- Settings attest operator approval, cannot establish server identity. Full batch only.
BEGIN;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- After separate approval, uncomment the two settings below in an operator copy:
SET LOCAL rekansiaga.release_ref = 'fweeyflixnqbvvceuent';
SET LOCAL rekansiaga.release_approval = 'approve-A-permanent';
DO $target$
BEGIN
 IF current_user <> 'postgres' OR session_user <> 'postgres' OR
 current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'fweeyflixnqbvvceuent' OR
 current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-A-permanent' THEN
  RAISE EXCEPTION 'STOP: explicit staging release approval/ref required';
 END IF;
 PERFORM pg_advisory_xact_lock(414, 451);
 IF (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p'))<>26 OR
 (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p') AND relrowsecurity AND pg_get_userbyid(relowner)='postgres')<>26 OR
 (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace)<>6 OR
 NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.has_staff_role(text[])'::regprocedure
 AND prosecdef AND pg_get_userbyid(proowner)='postgres' AND proconfig=ARRAY['search_path=""']::text[]
 AND md5(replace(prosrc,E'\r',''))='67c25ec4933e2b01f8c501bcafb661a2') OR
 EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.roles'::regclass,'public.staff_profiles'::regclass,'public.staff_role_assignments'::regclass) AND relforcerowsecurity) THEN
 RAISE EXCEPTION 'Reviewed baseline/helper drift'; END IF;
END;
$target$;
DO $stage$
BEGIN
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public')<>26 OR EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND policyname='roles_assigned_active_staff_read') OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='roles_staff_read' AND roles::text[]=ARRAY['authenticated']::text[] AND cmd='SELECT' AND qual='has_staff_role(ARRAY[''super_admin''::text])') THEN RAISE EXCEPTION 'Expected baseline before A'; END IF;
END;
$stage$;
CREATE POLICY roles_assigned_active_staff_read ON public.roles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.staff_role_assignments AS assignment
    JOIN public.staff_profiles AS profile ON profile.user_id = assignment.staff_id
    WHERE assignment.role_id = roles.id
      AND assignment.staff_id = (SELECT auth.uid())
      AND profile.is_active = true
  ));
DO $stage$
BEGIN
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public')<>27 THEN RAISE EXCEPTION 'A policy count'; END IF;
END;
$stage$;
SELECT 'A_APPLIED_BEFORE_COMMIT_NOT_API_ACCEPTANCE' AS checkpoint;
COMMIT;
