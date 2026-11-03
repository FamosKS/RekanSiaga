-- PROPOSED, NOT EXECUTED. Fixed-dev wrapper and separate explicit approval.
-- Close the observed anonymous read of private verified reports.
-- Approved RLS enablement plus two restrictive SELECT policies; no grants, writes, row deletion,
-- existing-policy removal, RLS disabling or service-role access changes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $privacy$
DECLARE
  item record;
  existing record;
  role_oid oid;
  normalized text;
BEGIN
  IF current_user<>'postgres' OR session_user<>'postgres'
     OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
     OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-dev-e-report-compat-privacy-v1'
     OR to_regprocedure('public.has_staff_role(text[])') IS NULL THEN
    RAISE EXCEPTION 'STOP: explicit dev report privacy scope required';
  END IF;
  PERFORM pg_advisory_xact_lock(50426,5);
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.public_reports') AND relrowsecurity) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=to_regclass('public.public_reports') AND relkind='r') THEN
      RAISE EXCEPTION 'STOP: expected existing reports table';
    END IF;
  END IF;
  -- A restrictive policy cannot provide the required permissive staff access.
  IF NOT EXISTS (SELECT 1 FROM pg_policy
    WHERE polrelid='public.public_reports'::regclass AND polname='reports_staff_read'
      AND polpermissive AND polcmd='r'
      AND polroles=ARRAY[(SELECT oid FROM pg_roles WHERE rolname='authenticated')]
      AND replace(replace(regexp_replace(pg_get_expr(polqual,polrelid),'\s+','','g'),'public.',''),'::text','')
        = 'has_staff_role(ARRAY[''super_admin'',''report_verifier''])') THEN
    RAISE EXCEPTION 'STOP: expected existing staff SELECT policy required';
  END IF;
  FOR item IN SELECT * FROM (VALUES
    ('rs_e_reports_anon_private','anon','false','false'),
    ('rs_e_reports_staff_private','authenticated','public.has_staff_role(ARRAY[''super_admin'',''report_verifier''])','has_staff_role(ARRAY[''super_admin'',''report_verifier''])')
  ) AS definitions(policy_name,role_name,expression,normalized_expression) LOOP
    SELECT oid INTO role_oid FROM pg_roles WHERE rolname=item.role_name;
    IF role_oid IS NULL THEN RAISE EXCEPTION 'STOP: expected API role missing'; END IF;
    SELECT * INTO existing FROM pg_policy WHERE polrelid='public.public_reports'::regclass AND polname=item.policy_name;
    IF FOUND THEN
      normalized:=replace(replace(regexp_replace(pg_get_expr(existing.polqual,existing.polrelid),'\s+','','g'),'public.',''),'::text','');
      IF existing.polpermissive OR existing.polcmd<>'r' OR existing.polroles<>ARRAY[role_oid]
         OR existing.polwithcheck IS NOT NULL OR normalized<>item.normalized_expression THEN
        RAISE EXCEPTION 'STOP: same-named report privacy policy differs';
      END IF;
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.public_reports AS RESTRICTIVE FOR SELECT TO %I USING (%s)',item.policy_name,item.role_name,item.expression);
    END IF;
  END LOOP;
  ALTER TABLE public.public_reports ENABLE ROW LEVEL SECURITY;
END $privacy$;
COMMIT;
SELECT json_build_object('project_ref','uiuiouosblyuqgnvfpeh',
  'scope','enable report RLS and two restrictive SELECT policies','data_rows_modified',0,
  'grants_changed',false,'status','APPLIED');
