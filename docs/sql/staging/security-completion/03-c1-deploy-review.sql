-- REVIEW ONLY: permanent staging release, NOT approved or executed by preparation.
-- Verify Dashboard rekansiaga-staging / fweeyflixnqbvvceuent independently.
-- Settings attest operator approval, cannot establish server identity. Full batch only.
BEGIN;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- After separate approval, uncomment the two settings below in an operator copy:
-- SET LOCAL rekansiaga.release_ref = 'fweeyflixnqbvvceuent';
-- SET LOCAL rekansiaga.release_approval = 'approve-C1-permanent';
DO $target$
BEGIN
 IF current_user <> 'postgres' OR session_user <> 'postgres' OR
 current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'fweeyflixnqbvvceuent' OR
 current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-C1-permanent' THEN
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
-- PUBLIC-ONLY scope. Global defaults and all provider schemas/creators preserved.
-- Schema REVOKE cannot override global PUBLIC EXECUTE. New application functions
-- require explicit object REVOKE/grants in their CREATE transaction before COMMIT.
-- SET LOCAL rekansiaga.b_acceptance = 'JWT-B-atomicity-concurrency-accepted';
-- SET LOCAL rekansiaga.c1_scope = 'postgres-public-only-approved';
DO $stage$
BEGIN
 IF current_setting('rekansiaga.b_acceptance',true) IS DISTINCT FROM 'JWT-B-atomicity-concurrency-accepted' THEN RAISE EXCEPTION 'Required acceptance/decision missing: b_acceptance'; END IF; IF current_setting('rekansiaga.c1_scope',true) IS DISTINCT FROM 'postgres-public-only-approved' THEN RAISE EXCEPTION 'Required acceptance/decision missing: c1_scope'; END IF; IF (SELECT count(*) FROM pg_policies WHERE schemaname='public')<>27 OR NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.roles'::regclass AND polname='roles_assigned_active_staff_read') OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.review_public_report(uuid,text,text)'::regprocedure AND md5(replace(prosrc,E'\r',''))='732ed6c024fe909237d63847547f46e8' AND prosecdef AND pg_get_userbyid(proowner)='postgres' AND proconfig=ARRAY['search_path=""']::text[]) OR has_function_privilege('anon','public.review_public_report(uuid,text,text)','EXECUTE') OR NOT has_function_privilege('authenticated','public.review_public_report(uuid,text,text)','EXECUTE') OR NOT has_function_privilege('service_role','public.review_public_report(uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Reviewed A/B required'; END IF;
END;
$stage$;
DO $global_relation_guard$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
 WHERE d.defaclrole='postgres'::regrole AND d.defaclnamespace=0 AND d.defaclobjtype IN ('r','S')
 AND a.grantee IN (0,'anon'::regrole::oid,'authenticated'::regrole::oid)) THEN
 RAISE EXCEPTION 'Global relation defaults grant client access; public-only revoke cannot override; STOP for review'; END IF;
END;
$global_relation_guard$;
CREATE TEMP TABLE c1_existing_acl ON COMMIT DROP AS
 SELECT 'relation'::text AS kind,oid,relacl::text AS acl FROM pg_class WHERE relpersistence<>'t'
 UNION ALL SELECT 'function',oid,proacl::text FROM pg_proc;
CREATE TEMP TABLE c1_other_defaults ON COMMIT DROP AS SELECT * FROM pg_default_acl
 WHERE NOT (defaclrole='postgres'::regrole AND (defaclnamespace='public'::regnamespace AND defaclobjtype IN ('r','S','f')));
CREATE TEMP TABLE c1_preserved_grantees ON COMMIT DROP AS
 SELECT d.defaclnamespace,d.defaclobjtype,a.grantor,a.grantee,a.privilege_type,a.is_grantable
 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
 WHERE d.defaclrole='postgres'::regrole AND a.grantee NOT IN (0,'anon'::regrole::oid,'authenticated'::regrole::oid)
 AND (d.defaclnamespace='public'::regnamespace AND d.defaclobjtype IN ('r','S','f'));
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
DO $stage$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a
 WHERE d.defaclrole='postgres'::regrole AND (d.defaclnamespace='public'::regnamespace AND d.defaclobjtype IN ('r','S','f'))
 AND a.grantee IN (0,'anon'::regrole::oid,'authenticated'::regrole::oid)) THEN RAISE EXCEPTION 'C1 client default privilege remains'; END IF;
 IF EXISTS(WITH now_acl AS (
 SELECT 'relation'::text AS kind,oid,relacl::text AS acl FROM pg_class
 WHERE relpersistence<>'t'
 UNION ALL SELECT 'function',oid,proacl::text FROM pg_proc)
 (SELECT * FROM pg_temp.c1_existing_acl EXCEPT SELECT * FROM now_acl)
 UNION ALL (SELECT * FROM now_acl EXCEPT SELECT * FROM pg_temp.c1_existing_acl)) THEN RAISE EXCEPTION 'Existing ACL changed'; END IF;
 IF EXISTS((SELECT * FROM pg_temp.c1_other_defaults EXCEPT SELECT * FROM pg_default_acl) UNION ALL (SELECT * FROM pg_default_acl WHERE NOT (defaclrole='postgres'::regrole AND (defaclnamespace='public'::regnamespace AND defaclobjtype IN ('r','S','f'))) EXCEPT SELECT * FROM pg_temp.c1_other_defaults)) THEN RAISE EXCEPTION 'Out-of-scope defaults changed'; END IF;

END;
$stage$;
DO $preserve$
BEGIN
 IF EXISTS(SELECT * FROM pg_temp.c1_preserved_grantees EXCEPT
 SELECT d.defaclnamespace,d.defaclobjtype,a.grantor,a.grantee,a.privilege_type,a.is_grantable
 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a WHERE d.defaclrole='postgres'::regrole)
 THEN RAISE EXCEPTION 'Non-client default ACL lost'; END IF;
END;
$preserve$;
SELECT 'C1_DEFAULTS_CHECKED_PROBES_STILL_REQUIRED'  AS checkpoint;
COMMIT;
