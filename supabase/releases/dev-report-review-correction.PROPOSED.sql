-- Super Admin correction of report review decisions (dev only).
-- Report verifiers retain forward-only transitions; Super Admin may correct any
-- status with an audit/history row. No direct table UPDATE is granted.
BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;

CREATE OR REPLACE FUNCTION public.review_public_report(
  p_report_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $review$
DECLARE
  previous text;
  actor uuid := auth.uid();
  is_super_admin boolean;
  normalized_reason text;
BEGIN
  IF actor IS NULL OR public.has_staff_role(ARRAY['super_admin','report_verifier']) IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  IF p_report_id IS NULL OR p_new_status IS NULL
     OR p_new_status NOT IN ('unverified','under_review','verified','rejected') THEN
    RAISE EXCEPTION 'Invalid review input' USING ERRCODE='22023';
  END IF;
  IF p_reason IS NOT NULL THEN
    normalized_reason := pg_catalog.btrim(p_reason, E' \t\n\r\f\013');
    IF pg_catalog.char_length(normalized_reason) > 4000 OR p_reason !~ '[^[:space:]]' THEN
      RAISE EXCEPTION 'Invalid review reason' USING ERRCODE='22023';
    END IF;
  END IF;
  is_super_admin := public.has_staff_role(ARRAY['super_admin']) IS TRUE;
  SELECT status INTO previous FROM public.public_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT is_super_admin AND NOT (
    (previous = 'unverified' AND p_new_status IN ('under_review','verified','rejected'))
    OR (previous = 'under_review' AND p_new_status IN ('verified','rejected'))
  ) THEN
    RAISE EXCEPTION 'Invalid transition' USING ERRCODE='22023';
  END IF;
  UPDATE public.public_reports
  SET status = p_new_status, reviewed_by = actor, reviewed_at = now()
  WHERE id = p_report_id;
  INSERT INTO public.report_status_history(report_id, from_status, to_status, changed_by, reason)
  VALUES (p_report_id, previous, p_new_status, actor, normalized_reason);
  RETURN true;
END
$review$;

REVOKE ALL ON FUNCTION public.review_public_report(uuid,text,text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.review_public_report(uuid,text,text) TO authenticated;

COMMIT;
