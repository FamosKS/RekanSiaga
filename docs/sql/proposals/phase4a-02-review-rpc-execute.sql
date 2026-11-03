-- PROPOSAL ONLY. NOT EXECUTED. Human review and staging validation required.
-- Finding META-02: anon has EXECUTE on the privileged report review RPC.
-- Remove unauthenticated reachability; preserve current authenticated privilege.
-- Supplied function body now statically verifies active super_admin/report_verifier
-- through has_staff_role. Fingerprint matches the metadata snapshot.
-- Revision also closes NULL status validation and validates supplied reason text.
-- Approved business contract v1: optional NULL; otherwise non-whitespace and
-- <=4000 PostgreSQL characters AFTER trimming ASCII SP/HT/LF/CR/FF/VT edges.
-- Business approval does not authorize remote migration. Rejected may use NULL.
-- Public function signature/default/boolean return and transitions are preserved.
-- CREATE OR REPLACE preserves existing owner and ACL; recheck owner=postgres.
-- No API/staging/PostgreSQL execution has validated this draft.
-- Runbook/approval gates: docs/phase4a-remediation-validation.md. Require an
-- existing reviewed function/owner/ACL and current helper fingerprint; do not
-- use CREATE OR REPLACE to create an absent function under an unreviewed owner.
-- Business-rule default is backward-compatible NULL reason, including rejected.
-- Do not call this mutating RPC on production for audit testing.
BEGIN;
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
ROLLBACK;
-- Deliberately rolls back. Apply only after approval with a reviewed transaction.
-- Compatibility: Web/Flutter report review requires an authenticated staff token.
-- Ordinary/inactive authenticated users must still fail the helper check.
-- An existing authenticated EXECUTE is preserved, not broadened to new callers.
-- Status + history remain one transaction; no swallowed exceptions/COMMIT.
-- Rejection of absent/blank reason for 'rejected' needs a separate business
-- decision; NULL is still allowed for backward compatibility.
-- Restoring the original body requires the reviewed backup from
-- docs/audits/phase4a-function-definitions.json; do not auto-restore unsafe ACLs.
-- submit_public_report and track_public_report are intentionally unchanged;
-- public submit/tracking may be valid and need their own body/security review.
-- Restoring EXECUTE to anon restores the risk and is not an automatic rollback.
