-- REVIEW ONLY: permanent staging release, NOT approved or executed by preparation.
-- Verify Dashboard rekansiaga-staging / fweeyflixnqbvvceuent independently.
-- Settings attest operator approval, cannot establish server identity. Full batch only.
BEGIN;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- After separate approval, uncomment the two settings below in an operator copy:
-- SET LOCAL rekansiaga.release_ref = 'fweeyflixnqbvvceuent';
-- SET LOCAL rekansiaga.release_approval = 'approve-B-permanent';
DO $target$
BEGIN
 IF current_user <> 'postgres' OR session_user <> 'postgres' OR
 current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'fweeyflixnqbvvceuent' OR
 current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-B-permanent' THEN
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
-- Also uncomment only after recorded acceptance and business sign-off:
-- SET LOCAL rekansiaga.a_acceptance = 'JWT-A-accepted';
-- SET LOCAL rekansiaga.b_contract = 'optional-null-nonblank-trimmed-max4000-v1';
DO $stage$
BEGIN
 IF current_setting('rekansiaga.a_acceptance',true) IS DISTINCT FROM 'JWT-A-accepted' THEN RAISE EXCEPTION 'Required acceptance/decision missing: a_acceptance'; END IF; IF current_setting('rekansiaga.b_contract',true) IS DISTINCT FROM 'optional-null-nonblank-trimmed-max4000-v1' THEN RAISE EXCEPTION 'Required acceptance/decision missing: b_contract'; END IF; IF (SELECT count(*) FROM pg_policies WHERE schemaname='public')<>27 OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='roles' AND policyname='roles_assigned_active_staff_read') THEN RAISE EXCEPTION 'A deployment required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.review_public_report(uuid,text,text)'::regprocedure
 AND md5(replace(prosrc,E'\r',''))='e6794d177f113714876243dc456bcbe6' AND prosecdef
 AND pg_get_userbyid(proowner)='postgres' AND proconfig=ARRAY['search_path=""']::text[])
 OR NOT has_function_privilege('authenticated','public.review_public_report(uuid,text,text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.review_public_report(uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'B baseline body/owner/path/ACL drift'; END IF;

END;
$stage$;
CREATE TEMP TABLE b_acl_before ON COMMIT DROP AS SELECT proacl FROM pg_proc WHERE oid='public.review_public_report(uuid,text,text)'::regprocedure;
CREATE OR REPLACE FUNCTION public.review_public_report(
  p_report_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_old text;
  v_reason text;
BEGIN
  IF v_actor IS NULL OR public.has_staff_role(
    ARRAY['super_admin', 'report_verifier']::text[]
  ) IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_report_id IS NULL THEN
    RAISE EXCEPTION 'Invalid report identifier' USING ERRCODE = '22023';
  END IF;
  IF p_new_status IS NULL OR p_new_status NOT IN (
    'under_review', 'verified', 'rejected'
  ) THEN
    RAISE EXCEPTION 'Invalid target status' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NOT NULL THEN
    v_reason := pg_catalog.btrim(p_reason, E' \t\n\r\f\013');
    IF pg_catalog.char_length(v_reason) > 4000
      OR p_reason !~ '[^[:space:]]' THEN
      RAISE EXCEPTION 'Invalid review reason' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT report.status INTO v_old
  FROM public.public_reports AS report
  WHERE report.id = p_report_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF NOT (
    (v_old = 'unverified' AND p_new_status IN ('under_review', 'verified', 'rejected'))
    OR (v_old = 'under_review' AND p_new_status IN ('verified', 'rejected'))
  ) THEN
    RAISE EXCEPTION 'Invalid status transition' USING ERRCODE = '22023';
  END IF;

  UPDATE public.public_reports
  SET status = p_new_status, reviewed_by = v_actor, reviewed_at = pg_catalog.now()
  WHERE id = p_report_id;
  INSERT INTO public.report_status_history(
    report_id, from_status, to_status, changed_by, reason
  ) VALUES (p_report_id, v_old, p_new_status, v_actor, v_reason);
  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.review_public_report(uuid, text, text)
  FROM PUBLIC, anon;
DO $stage$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.review_public_report(uuid,text,text)'::regprocedure AND md5(replace(prosrc,E'\r',''))='732ed6c024fe909237d63847547f46e8' AND prosecdef AND pg_get_userbyid(proowner)='postgres' AND proconfig=ARRAY['search_path=""']::text[]) OR has_function_privilege('anon','public.review_public_report(uuid,text,text)','EXECUTE') OR NOT has_function_privilege('authenticated','public.review_public_report(uuid,text,text)','EXECUTE') OR NOT has_function_privilege('service_role','public.review_public_report(uuid,text,text)','EXECUTE') OR EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid='public.review_public_report(uuid,text,text)'::regprocedure AND a.grantee=0 AND a.privilege_type='EXECUTE') OR (SELECT proacl FROM pg_proc WHERE oid='public.review_public_report(uuid,text,text)'::regprocedure) IS DISTINCT FROM (SELECT proacl FROM pg_temp.b_acl_before) THEN RAISE EXCEPTION 'B body or baseline ACL preservation failed'; END IF;
END;
$stage$;
SELECT 'B_METADATA_CHECKED_NOT_RUNTIME_ACCEPTANCE' AS checkpoint;
COMMIT;
