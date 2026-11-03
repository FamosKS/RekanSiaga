-- REVIEW ONLY: rollback-only staging regression, NOT approved or executed by preparation.
-- Verify Dashboard rekansiaga-staging / fweeyflixnqbvvceuent independently.
-- Settings attest operator approval, cannot establish server identity. Full batch only.
BEGIN;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- After separate approval, uncomment the two settings below in an operator copy:
-- SET LOCAL rekansiaga.release_ref = 'fweeyflixnqbvvceuent';
-- SET LOCAL rekansiaga.release_approval = 'approve-B-rollback-regression';
DO $target$
BEGIN
 IF current_user <> 'postgres' OR session_user <> 'postgres' OR
 current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'fweeyflixnqbvvceuent' OR
 current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-B-rollback-regression' THEN
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

-- Separate synthetic fixture / fault-injection approval REQUIRED, never operational data.
-- Only the atomic report generated for this run can be injected.
DO $guard$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.review_public_report(uuid,text,text)'::regprocedure AND md5(replace(prosrc,E'\r',''))='732ed6c024fe909237d63847547f46e8' AND prosecdef AND pg_get_userbyid(proowner)='postgres' AND proconfig=ARRAY['search_path=""']::text[]) THEN RAISE EXCEPTION 'Reviewed B required for fault injection'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.public_reports WHERE id='ba9998cf-1a5e-4a06-8d97-161e524eb726' AND
 tracking_code='SYNTH-phase4a5a-a-20261023-f768e9e3fb2f4223ac497e84871a1c1f-atomic' AND status='unverified') OR
 EXISTS(SELECT 1 FROM public.report_status_history WHERE report_id='ba9998cf-1a5e-4a06-8d97-161e524eb726') OR
 NOT EXISTS(SELECT 1 FROM public.staff_profiles p JOIN public.staff_role_assignments a ON a.staff_id=p.user_id JOIN public.roles r ON r.id=a.role_id
 WHERE p.user_id='52280fb9-2fc0-4b39-b31b-8c806074c8c4' AND p.is_active AND r.code='report_verifier') THEN RAISE EXCEPTION 'Fresh synthetic atomic fixture/actor required'; END IF;
END;
$guard$;
CREATE FUNCTION public.phase4a_atomic_test_failure() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $body$
BEGIN
 IF NEW.report_id='ba9998cf-1a5e-4a06-8d97-161e524eb726'::uuid THEN RAISE EXCEPTION 'Synthetic history insert failure' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION public.phase4a_atomic_test_failure() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER phase4a_atomic_test BEFORE INSERT ON public.report_status_history
 FOR EACH ROW EXECUTE FUNCTION public.phase4a_atomic_test_failure();
DO $test$
DECLARE before_row jsonb; failed boolean:=false;
BEGIN
 SELECT to_jsonb(r) INTO before_row FROM public.public_reports r WHERE id='ba9998cf-1a5e-4a06-8d97-161e524eb726';
 PERFORM set_config('request.jwt.claim.sub','52280fb9-2fc0-4b39-b31b-8c806074c8c4',true);
 PERFORM set_config('request.jwt.claims','{"sub":"52280fb9-2fc0-4b39-b31b-8c806074c8c4","role":"authenticated"}',true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 BEGIN
 PERFORM public.review_public_report('ba9998cf-1a5e-4a06-8d97-161e524eb726','verified','Synthetic failure injection');
 EXCEPTION WHEN check_violation THEN
 IF SQLERRM <> 'Synthetic history insert failure' THEN RAISE; END IF;
 failed:=true;
 END;
 EXECUTE 'RESET ROLE';
 IF NOT failed OR (SELECT to_jsonb(r) FROM public.public_reports r WHERE id='ba9998cf-1a5e-4a06-8d97-161e524eb726') IS DISTINCT FROM before_row OR
 EXISTS(SELECT 1 FROM public.report_status_history WHERE report_id='ba9998cf-1a5e-4a06-8d97-161e524eb726') THEN RAISE EXCEPTION 'Atomic rollback regression failed'; END IF;
END;
$test$;
SELECT 'SQL_FAULT_INJECTION_PASS_NOT_JWT_PROOF' AS checkpoint;
ROLLBACK;
-- Real contention: in a dedicated trusted DB session BEGIN; SELECT id FROM
-- public.public_reports WHERE id=<fresh race fixture> FOR UPDATE;
-- Keep that session open while launching the two HTTP race requests. Record
-- pg_stat_activity wait_event_type=Lock for the requests from a trusted observer,
-- then ROLLBACK the lock holder. Never leave an idle transaction unattended.
-- Without observed overlap/wait, HTTP Promise.all is concurrent dispatch only.
