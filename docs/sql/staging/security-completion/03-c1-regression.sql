-- REVIEW ONLY: rollback-only staging regression, NOT approved or executed by preparation.
-- Verify Dashboard rekansiaga-staging / fweeyflixnqbvvceuent independently.
-- Settings attest operator approval, cannot establish server identity. Full batch only.
BEGIN;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- After separate approval, uncomment the two settings below in an operator copy:
-- SET LOCAL rekansiaga.release_ref = 'fweeyflixnqbvvceuent';
-- SET LOCAL rekansiaga.release_approval = 'approve-C1-rollback-regression';
DO $target$
BEGIN
 IF current_user <> 'postgres' OR session_user <> 'postgres' OR
 current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'fweeyflixnqbvvceuent' OR
 current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-C1-rollback-regression' THEN
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

-- Run AFTER approved public-only C1. Disposable probes; all rolled back.
-- Snapshot global/non-public defaults to assert no changes, including built-in
-- fallback PUBLIC EXECUTE. Do not claim public-local REVOKE is global denial.
CREATE TEMP TABLE c1_probe_defaults ON COMMIT DROP AS SELECT * FROM pg_default_acl;
CREATE SCHEMA phase4a_c1_probe;
CREATE TABLE public.phase4a_c1_probe_table(id integer);
CREATE SEQUENCE public.phase4a_c1_probe_sequence;
CREATE FUNCTION public.phase4a_c1_probe_invoker() RETURNS integer LANGUAGE sql AS 'SELECT 1';
CREATE FUNCTION public.phase4a_c1_probe_definer() RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path='' AS 'SELECT 1';
CREATE FUNCTION phase4a_c1_probe.nonpublic_function() RETURNS integer LANGUAGE sql AS 'SELECT 1';
DO $probe$
DECLARE r regrole; f regprocedure;
BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.phase4a_c1_probe_table'::regclass) THEN RAISE EXCEPTION 'Existing ensure_rls behavior failed'; END IF;
 FOREACH r IN ARRAY ARRAY['anon'::regrole,'authenticated'::regrole] LOOP
 IF has_table_privilege(r,'public.phase4a_c1_probe_table','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR
 has_sequence_privilege(r,'public.phase4a_c1_probe_sequence','SELECT,UPDATE,USAGE') THEN RAISE EXCEPTION 'Future relation grant leaked'; END IF;
 END LOOP;
 -- With no non-public schema defaults, the probe must inherit exactly the
 -- unchanged global function ACL (or built-in fallback).
 IF (SELECT COALESCE(proacl,acldefault('f',proowner)) FROM pg_proc WHERE oid='phase4a_c1_probe.nonpublic_function()'::regprocedure)
 IS DISTINCT FROM COALESCE((SELECT defaclacl FROM pg_default_acl WHERE defaclrole='postgres'::regrole AND defaclnamespace=0 AND defaclobjtype='f'),acldefault('f','postgres'::regrole))
 THEN RAISE EXCEPTION 'Non-public function global inheritance drift'; END IF;
END;
$probe$;
SELECT p.proname,has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute_before_object_revoke,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute_before_object_revoke
 FROM pg_proc p WHERE p.oid IN ('public.phase4a_c1_probe_invoker()'::regprocedure,'public.phase4a_c1_probe_definer()'::regprocedure);
-- Required workflow for each future application function, in the SAME transaction
-- as CREATE; choose explicit role grants only when its contract requires them.
REVOKE ALL ON FUNCTION public.phase4a_c1_probe_invoker(),public.phase4a_c1_probe_definer() FROM PUBLIC,anon,authenticated;
DO $object_probe$
DECLARE r regrole; f regprocedure;
BEGIN
 FOREACH r IN ARRAY ARRAY['anon'::regrole,'authenticated'::regrole] LOOP
 FOREACH f IN ARRAY ARRAY['public.phase4a_c1_probe_invoker()'::regprocedure,'public.phase4a_c1_probe_definer()'::regprocedure] LOOP
 IF has_function_privilege(r,f,'EXECUTE') THEN RAISE EXCEPTION 'Explicit application function revoke failed'; END IF;
 END LOOP;
 END LOOP;
 IF EXISTS((SELECT * FROM pg_temp.c1_probe_defaults EXCEPT SELECT * FROM pg_default_acl)
 UNION ALL (SELECT * FROM pg_default_acl EXCEPT SELECT * FROM pg_temp.c1_probe_defaults)) THEN RAISE EXCEPTION 'Probe changed default privileges'; END IF;
END;
$object_probe$;
SELECT 'C1_PUBLIC_LOCAL_PLUS_EXPLICIT_OBJECT_REVOKE_NOT_GLOBAL_DENY' AS checkpoint;
ROLLBACK;
