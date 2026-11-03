-- PROPOSED rollback of only the RPT compatibility predicate. No data deletion.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $rollback$
DECLARE
  target oid := to_regprocedure('public.track_report_v1(text,text)');
  definition text;
  old_predicate constant text := 'p_tracking_code ~ ''^RS-[0-9A-F]{16}$''';
  new_predicate constant text := 'p_tracking_code ~ ''^(RS-[0-9A-F]{16}|RPT-[A-Z0-9]{10})$''';
BEGIN
  IF current_user<>'postgres' OR session_user<>'postgres'
     OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
     OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'rollback-dev-e-tracking-rpt-v1'
     OR target IS NULL THEN RAISE EXCEPTION 'STOP: explicit dev compatibility rollback scope required'; END IF;
  PERFORM pg_advisory_xact_lock(50426,5);
  SELECT pg_get_functiondef(target) INTO definition;
  IF array_length(string_to_array(definition,new_predicate),1)<>2 THEN
    RAISE EXCEPTION 'STOP: exact compatibility predicate not present';
  END IF;
  EXECUTE replace(definition,new_predicate,old_predicate);
END $rollback$;
COMMIT;
