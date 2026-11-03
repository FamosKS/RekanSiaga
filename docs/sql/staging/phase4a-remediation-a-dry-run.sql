-- PHASE 4A.5A: TWO AUTH IDENTITIES, SERIAL A-ONLY FIXTURE STATES.
-- REVIEW ONLY, NOT EXECUTED. No B/C1; all app writes rolled back.
-- Auth provisioning outside SQL is NOT rolled back. No INSERT auth.users.
-- Requires approved synthetic CONTROL/SUBJECT IDs on VERIFIED rekansiaga-staging.
-- Manual settings/ref attest operator review, not server-verified project identity.
-- Run whole batch in one trusted postgres session, no concurrent DDL/tests.
-- Missing approvals/null UUIDs fail closed. Existing app fixture/profile rows -> STOP.
-- SQL ROLE/CLAIMS SIMULATION is NOT JWT/API acceptance. Do not change ROLLBACK.
BEGIN;
-- Fill/uncomment ONLY after staging/ref/fixture approval (not approval to deploy A):
-- SET LOCAL rekansiaga.staging_target = 'rekansiaga-staging-confirmed-by-operator';
-- SET LOCAL rekansiaga.reviewed_staging_project_ref = '<actual-staging-project-ref>';
-- SET LOCAL rekansiaga.remediation_a_fixture_approval = 'approved-synthetic-staging-fixtures';
SET LOCAL search_path = pg_catalog, public;
SET LOCAL rekansiaga.remediation_a_fixture_manifest = $fixtures$
{
 "project_name": "rekansiaga-staging",
 "project_reference": null,
 "run_id": null,
 "fixture_mutations_approved": false,
 "actors": [
  {
   "label": "CONTROL",
   "user_id": null
  },
  {
   "label": "SUBJECT",
   "user_id": null
  }
 ]
}
$fixtures$;
DO $guard$
BEGIN
 IF current_user <> 'postgres' OR session_user <> 'postgres' OR
    current_setting('rekansiaga.staging_target',true) IS DISTINCT FROM 'rekansiaga-staging-confirmed-by-operator' OR
    COALESCE(current_setting('rekansiaga.reviewed_staging_project_ref',true),'') !~ '^[a-z]{20}$' OR
    current_setting('rekansiaga.remediation_a_fixture_approval',true) IS DISTINCT FROM 'approved-synthetic-staging-fixtures' THEN
  RAISE EXCEPTION 'Staging identity/operator fixture approval missing; stop';
 END IF;
 IF current_setting('rekansiaga.remediation_a_fixture_manifest')::jsonb->>'project_name' IS DISTINCT FROM 'rekansiaga-staging' OR
    current_setting('rekansiaga.remediation_a_fixture_manifest')::jsonb->>'project_reference' IS DISTINCT FROM current_setting('rekansiaga.reviewed_staging_project_ref',true) OR
    COALESCE(current_setting('rekansiaga.remediation_a_fixture_manifest')::jsonb->>'run_id','') = '' OR
    (current_setting('rekansiaga.remediation_a_fixture_manifest')::jsonb->>'fixture_mutations_approved')::boolean IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Manifest staging ref/run/approval missing or inconsistent';
 END IF;
 IF (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p')) <> 26 OR
    (SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p') AND relrowsecurity) <> 26 OR
    (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace) <> 6 OR
    (SELECT count(*) FROM pg_policies WHERE schemaname='public') <> 26 OR
    EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND policyname='roles_assigned_active_staff_read') THEN
  RAISE EXCEPTION 'Expected unremediated baseline; no overwrite/drop allowed';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid='public.has_staff_role(text[])'::regprocedure
     AND prosecdef AND pg_get_userbyid(proowner)='postgres'
     AND proconfig=ARRAY['search_path=""']::text[]
     AND md5(replace(prosrc,E'\r',''))='67c25ec4933e2b01f8c501bcafb661a2') OR
    (SELECT count(*) FROM pg_class WHERE oid IN ('public.roles'::regclass,
      'public.staff_profiles'::regclass,'public.staff_role_assignments'::regclass)
     AND relrowsecurity AND NOT relforcerowsecurity AND pg_get_userbyid(relowner)='postgres') <> 3 OR
    NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles'
      AND policyname='roles_staff_read' AND cmd='SELECT'
      AND roles::text[]=ARRAY['authenticated']::text[]
      AND qual='has_staff_role(ARRAY[''super_admin''::text])') THEN
  RAISE EXCEPTION 'Reviewed helper/owner/RLS/super policy drifted';
 END IF;
 IF EXISTS(SELECT 1 FROM public.staff_profiles) OR EXISTS(SELECT 1 FROM public.staff_role_assignments) THEN
  RAISE EXCEPTION 'This rehearsal requires zero app profiles/assignments before synthetic setup';
 END IF;
 IF (SELECT count(*) FROM public.roles WHERE code IN
    ('super_admin','information_manager','report_verifier','mitigation_editor')) <> 4 OR
    (SELECT count(*) FROM public.roles) <> 4 THEN
  RAISE EXCEPTION 'Four approved role seeds required';
 END IF;
END;
$guard$;
CREATE TEMP TABLE remediation_a_identity (
 label text PRIMARY KEY, user_id uuid NOT NULL UNIQUE
) ON COMMIT DROP;
INSERT INTO pg_temp.remediation_a_identity
 SELECT label,user_id FROM jsonb_to_recordset(
   current_setting('rekansiaga.remediation_a_fixture_manifest')::jsonb->'actors') AS x(label text,user_id uuid);
DO $fixture_guard$
BEGIN
 IF (SELECT count(*) FROM pg_temp.remediation_a_identity) <> 2 OR
    (SELECT count(*) FROM pg_temp.remediation_a_identity WHERE label IN ('CONTROL','SUBJECT')) <> 2 OR
    EXISTS(SELECT 1 FROM pg_temp.remediation_a_identity a WHERE NOT EXISTS
     (SELECT 1 FROM auth.users u WHERE u.id=a.user_id)) THEN
  RAISE EXCEPTION 'Two distinct approved existing synthetic Auth UUIDs required';
 END IF;
END;
$fixture_guard$;
INSERT INTO public.staff_profiles(user_id,display_name,is_active)
 SELECT user_id,'SYNTHETIC REMEDIATION A / CONTROL',true
 FROM pg_temp.remediation_a_identity WHERE label='CONTROL';
INSERT INTO public.staff_role_assignments(staff_id,role_id)
 SELECT a.user_id,r.id FROM pg_temp.remediation_a_identity a
 CROSS JOIN public.roles r WHERE a.label='CONTROL' AND r.code='super_admin';

-- Exact executable policy from original proposal A (comments/BEGIN excluded).
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

DO $simulate_serial_states$
DECLARE
 control_id uuid; subject_id uuid; s record; principal record;
 actual_codes text[]; expected_codes text[]; foreign_id uuid;
 actual_count bigint; expected_count bigint;
BEGIN
 SELECT user_id INTO STRICT control_id FROM pg_temp.remediation_a_identity WHERE label='CONTROL';
 SELECT user_id INTO STRICT subject_id FROM pg_temp.remediation_a_identity WHERE label='SUBJECT';
 FOR s IN SELECT * FROM (VALUES
(1,'USER',NULL::boolean,ARRAY[]::text[],ARRAY[]::text[]),
(2,'NO_ROLE',true,ARRAY[]::text[],ARRAY[]::text[]),
(3,'IM',true,ARRAY['information_manager']::text[],ARRAY['information_manager']::text[]),
(4,'RV',true,ARRAY['report_verifier']::text[],ARRAY['report_verifier']::text[]),
(5,'ME',true,ARRAY['mitigation_editor']::text[],ARRAY['mitigation_editor']::text[]),
(6,'MULTI',true,ARRAY['information_manager','mitigation_editor']::text[],ARRAY['information_manager','mitigation_editor']::text[]),
(7,'INACTIVE',false,ARRAY['report_verifier']::text[],ARRAY[]::text[]),
(8,'INACTIVE_SA',false,ARRAY['super_admin']::text[],ARRAY[]::text[]),
(9,'CROSS_RV',true,ARRAY['report_verifier']::text[],ARRAY['report_verifier']::text[])
 ) AS cases(ordinal,state,active,assigned,visible) ORDER BY ordinal LOOP
  -- Owner-only state transition, restricted to the two approved fixture UIDs.
  DELETE FROM public.staff_role_assignments WHERE staff_id=subject_id;
  DELETE FROM public.staff_profiles WHERE user_id=subject_id;
  IF s.active IS NOT NULL THEN
   INSERT INTO public.staff_profiles(user_id,display_name,is_active)
    VALUES(subject_id,'SYNTHETIC REMEDIATION A / SUBJECT / '||s.state,s.active);
   INSERT INTO public.staff_role_assignments(staff_id,role_id)
    SELECT subject_id,r.id FROM unnest(s.assigned) AS assigned(code)
    JOIN public.roles r ON r.code=assigned.code;
  END IF;
  IF s.state='CROSS_RV' THEN
   DELETE FROM public.staff_role_assignments WHERE staff_id=control_id;
   INSERT INTO public.staff_role_assignments(staff_id,role_id)
    SELECT control_id,id FROM public.roles WHERE code='report_verifier';
  END IF;
  FOR principal IN SELECT * FROM (VALUES
   ('CONTROL'::text,control_id),('SUBJECT'::text,subject_id)) AS p(label,uid) LOOP
   IF principal.label='CONTROL' THEN
    expected_codes := CASE WHEN s.state='CROSS_RV' THEN ARRAY['report_verifier']::text[]
      ELSE ARRAY['information_manager','mitigation_editor','report_verifier','super_admin']::text[] END;
    foreign_id := subject_id;
   ELSE expected_codes := s.visible; foreign_id := control_id;
   END IF;
   PERFORM set_config('request.jwt.claim.sub',principal.uid::text,true);
   PERFORM set_config('request.jwt.claim.role','authenticated',true);
   PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',principal.uid,'role','authenticated')::text,true);
   EXECUTE 'SET LOCAL ROLE authenticated';
   IF auth.uid() IS DISTINCT FROM principal.uid THEN RAISE EXCEPTION 'Simulated UID mismatch'; END IF;
   SELECT COALESCE(array_agg(code ORDER BY code COLLATE pg_catalog."C"),ARRAY[]::text[])
    INTO actual_codes FROM public.roles;
   IF actual_codes IS DISTINCT FROM expected_codes THEN
    RAISE EXCEPTION 'Roles mismatch %/%: % vs %',s.state,principal.label,actual_codes,expected_codes;
   END IF;
   expected_count := CASE WHEN principal.label='CONTROL' AND s.state<>'CROSS_RV'
      AND s.active IS NOT NULL THEN 1 ELSE 0 END;
   SELECT count(*) INTO actual_count FROM public.staff_profiles WHERE user_id=foreign_id;
   IF actual_count <> expected_count THEN RAISE EXCEPTION 'Foreign profile mismatch %/%',s.state,principal.label; END IF;
   expected_count := CASE WHEN principal.label='CONTROL' AND s.state<>'CROSS_RV'
      THEN cardinality(s.assigned) ELSE 0 END;
   SELECT count(*) INTO actual_count FROM public.staff_role_assignments WHERE staff_id=foreign_id;
   IF actual_count <> expected_count THEN RAISE EXCEPTION 'Foreign assignment mismatch %/%',s.state,principal.label; END IF;
   expected_count := CASE WHEN principal.label='CONTROL' OR s.active IS NOT NULL THEN 1 ELSE 0 END;
   SELECT count(*) INTO actual_count FROM public.staff_profiles WHERE user_id=principal.uid;
   IF actual_count <> expected_count THEN RAISE EXCEPTION 'Own profile mismatch %/%',s.state,principal.label; END IF;
   expected_count := CASE WHEN principal.label='SUBJECT' THEN cardinality(s.assigned) ELSE 1 END;
   SELECT count(*) INTO actual_count FROM public.staff_role_assignments WHERE staff_id=principal.uid;
   IF actual_count <> expected_count THEN RAISE EXCEPTION 'Own assignment mismatch %/%',s.state,principal.label; END IF;
   IF has_table_privilege(current_user,'public.roles','INSERT') OR
      has_table_privilege(current_user,'public.roles','UPDATE') OR
      has_table_privilege(current_user,'public.roles','DELETE') OR
      has_table_privilege(current_user,'public.staff_profiles','UPDATE') OR
      has_table_privilege(current_user,'public.staff_role_assignments','INSERT') THEN
    RAISE EXCEPTION 'Unexpected write grant %/%',s.state,principal.label;
   END IF;
   EXECUTE 'RESET ROLE';
   RAISE NOTICE 'SQL_SIMULATION_PASS %/%, NOT JWT/API proof',s.state,principal.label;
  END LOOP;
 END LOOP;
 -- Restore CONTROL super; SUBJECT to USER. No fixture assignments survive rollback.
 DELETE FROM public.staff_role_assignments WHERE staff_id IN (control_id,subject_id);
 DELETE FROM public.staff_profiles WHERE user_id=subject_id;
 INSERT INTO public.staff_role_assignments(staff_id,role_id)
  SELECT control_id,id FROM public.roles WHERE code='super_admin';
 PERFORM set_config('request.jwt.claim.sub','',true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 SELECT count(*) INTO actual_count FROM public.roles;
 IF actual_count <> 0 THEN RAISE EXCEPTION 'NULL UID gained roles'; END IF;
 EXECUTE 'RESET ROLE';
 PERFORM set_config('request.jwt.claim.role','anon',true);
 PERFORM set_config('request.jwt.claims','{}',true);
 EXECUTE 'SET LOCAL ROLE anon';
 BEGIN
  PERFORM 1 FROM public.roles LIMIT 1;
  RAISE EXCEPTION 'Expected anonymous grant denial';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 EXECUTE 'RESET ROLE';
END;
$simulate_serial_states$;
DO $checkpoint$
BEGIN
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public') <> 27 OR
    (SELECT count(*) FROM public.staff_profiles) <> 1 OR
    (SELECT count(*) FROM public.staff_role_assignments) <> 1 THEN
  RAISE EXCEPTION 'Expected A-only policy27; restored CONTROL-only profile1/assignment1';
 END IF;
END;
$checkpoint$;
SELECT 'TWO_IDENTITIES_SERIAL_SQL_SIMULATION_NOT_JWT_PROOF_BEFORE_ROLLBACK' AS kind,
 (SELECT count(*) FROM pg_policies WHERE schemaname='public') AS policies,
 (SELECT count(*) FROM public.staff_profiles) AS restored_profiles,
 (SELECT count(*) FROM public.staff_role_assignments) AS restored_assignments,
 (SELECT md5(pg_get_expr(polqual,polrelid)) FROM pg_policy
  WHERE polrelid='public.roles'::regclass AND polname='roles_assigned_active_staff_read') AS new_policy_expression_md5;
ROLLBACK;
