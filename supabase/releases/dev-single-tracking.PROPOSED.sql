-- LOCAL PROPOSAL: explicit approval required before Cloud execution.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres'
 OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
 OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-dev-single-tracking-v2'
 THEN RAISE EXCEPTION 'STOP: approved dev single tracking package required'; END IF;
 PERFORM pg_advisory_xact_lock(50426,6);
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.public_reports') AND relrowsecurity) THEN
 RAISE EXCEPTION 'STOP: public_reports RLS must be enabled'; END IF;
 IF to_regprocedure('public.track_report_v1(text,text)') IS NULL THEN
 RAISE EXCEPTION 'STOP: existing track_report_v1(text,text) required'; END IF;
 IF to_regprocedure('public.submit_report_v1(text,text,text,text,double precision,double precision,text,text,bigint)') IS NULL THEN
 RAISE EXCEPTION 'STOP: Gateway submit_report_v1 contract required'; END IF;
 IF to_regprocedure('public.submit_public_report(text,text,text,uuid,text,double precision,double precision)') IS NULL THEN
 RAISE EXCEPTION 'STOP: underlying CSPRNG submit function required'; END IF;
 IF position('v_token:=replace(gen_random_uuid()::text,''-'','''')||replace(gen_random_uuid()::text,''-'','''');'
 IN regexp_replace(pg_get_functiondef('public.submit_public_report(text,text,text,uuid,text,double precision,double precision)'::regprocedure),'\s+','','g'))=0
 OR position('RPT-' IN pg_get_functiondef('public.track_report_v1(text,text)'::regprocedure))=0 THEN
 RAISE EXCEPTION 'STOP: reviewed CSPRNG generator and legacy tracking compatibility required'; END IF;
 IF to_regprocedure('public.track_report_v2(text)') IS NOT NULL
 OR to_regprocedure('public.replace_report_tracking_v2(text,text)') IS NOT NULL THEN
 RAISE EXCEPTION 'STOP: v2 already exists; reconcile before retry'; END IF;
 IF has_function_privilege('anon','public.track_report_v1(text,text)','EXECUTE')
 OR has_function_privilege('authenticated','public.track_report_v1(text,text)','EXECUTE') THEN
 RAISE EXCEPTION 'STOP: v1 service-only boundary required'; END IF;
END $guard$;
CREATE FUNCTION public.track_report_v2(p_access_token text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $track$
 SELECT public.track_report_v1(r.tracking_code,p_access_token)
 FROM public.report_access_tokens t JOIN public.public_reports r ON r.id=t.report_id
 WHERE p_access_token ~ '^[0-9a-f]{64}$'
 AND t.token_hash=encode(sha256(convert_to(p_access_token,'UTF8')),'hex')
 AND t.expires_at>now() AND t.revoked_at IS NULL LIMIT 1;
$track$;
REVOKE ALL ON FUNCTION public.track_report_v2(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.track_report_v2(text) TO service_role;
-- Trusted operator only. Not exposed as a public Gateway action. Verify
-- ownership out of band before calling; never log arguments or raw result.
CREATE FUNCTION public.replace_report_tracking_v2(p_reference text,p_access_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $rotate$
DECLARE old_token public.report_access_tokens%ROWTYPE; replacement text;
BEGIN
 IF p_access_token !~ '^[0-9a-f]{64}$' OR p_access_token IS NULL THEN
 RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE='P0002'; END IF;
 SELECT t.* INTO old_token FROM public.report_access_tokens t
 JOIN public.public_reports r ON r.id=t.report_id
 WHERE r.tracking_code=p_reference AND t.token_hash=encode(sha256(convert_to(p_access_token,'UTF8')),'hex')
 AND t.revoked_at IS NULL AND t.expires_at>now() FOR UPDATE OF t;
 IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE='P0002'; END IF;
 replacement:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 UPDATE public.report_access_tokens SET revoked_at=now() WHERE id=old_token.id;
 INSERT INTO public.report_access_tokens(report_id,token_hash,expires_at)
 VALUES(old_token.report_id,encode(sha256(convert_to(replacement,'UTF8')),'hex'),old_token.expires_at);
 RETURN replacement;
END $rotate$;
REVOKE ALL ON FUNCTION public.replace_report_tracking_v2(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.replace_report_tracking_v2(text,text) TO service_role;
COMMIT;
SELECT json_build_object('status','APPLIED','scope','v2 service-only tracking and operator replacement RPCs','project_ref','uiuiouosblyuqgnvfpeh');
