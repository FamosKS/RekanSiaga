-- PROPOSED: not executed. Only rekansiaga-dev / uiuiouosblyuqgnvfpeh.
-- One existing function predicate changes; no rows, tables, grants or RLS.
-- Use the fixed-dev Session Pooler wrapper after explicit scope approval.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $compat$
DECLARE
  target oid := to_regprocedure('public.track_report_v1(text,text)');
  definition text;
  original_acl aclitem[];
  original_owner oid;
  old_predicate constant text := 'p_tracking_code ~ ''^RS-[0-9A-F]{16}$''';
  new_predicate constant text := 'p_tracking_code ~ ''^(RS-[0-9A-F]{16}|RPT-[A-Z0-9]{10})$''';
BEGIN
  IF current_user<>'postgres' OR session_user<>'postgres'
     OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
     OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-dev-e-tracking-rpt-v1'
     OR target IS NULL THEN
    RAISE EXCEPTION 'STOP: explicit dev tracking compatibility scope required';
  END IF;
  PERFORM pg_advisory_xact_lock(50426,5);
  SELECT pg_get_functiondef(oid),proacl,proowner INTO definition,original_acl,original_owner
    FROM pg_proc WHERE oid=target AND prosecdef;
  IF definition IS NULL OR has_function_privilege('anon',target,'EXECUTE')
     OR has_function_privilege('authenticated',target,'EXECUTE')
     OR NOT has_function_privilege('service_role',target,'EXECUTE') THEN
    RAISE EXCEPTION 'STOP: existing service-only tracking boundary differs';
  END IF;
  IF position('t.token_hash=encode(sha256(convert_to(p_access_token,''UTF8'')),''hex'')' IN definition)=0
     OR position('t.expires_at>now()' IN definition)=0
     OR position('t.revoked_at IS NULL' IN definition)=0
     OR position('p_access_token ~ ''^[0-9a-f]{64}$''' IN definition)=0 THEN
    RAISE EXCEPTION 'STOP: existing token/expiry/revocation contract differs';
  END IF;
  IF position(new_predicate IN definition)>0 AND position(old_predicate IN definition)=0 THEN
    RAISE NOTICE 'Tracking compatibility already present; no replay';
  ELSE
    IF array_length(string_to_array(definition,old_predicate),1)<>2 THEN
      RAISE EXCEPTION 'STOP: expected exactly one existing RS predicate; no replacement attempted';
    END IF;
    EXECUTE replace(definition,old_predicate,new_predicate);
  END IF;
  IF EXISTS(SELECT 1 FROM pg_proc WHERE oid=target AND
       (proacl IS DISTINCT FROM original_acl OR proowner<>original_owner OR NOT prosecdef)) THEN
    RAISE EXCEPTION 'STOP: tracking owner/ACL/security-definer changed';
  END IF;
END $compat$;
COMMIT;
SELECT json_build_object('project_ref','uiuiouosblyuqgnvfpeh',
  'scope','track_report_v1 predicate only','data_rows_modified',0,
  'acl_changed',false,'rls_changed',false,'status','APPLIED');
