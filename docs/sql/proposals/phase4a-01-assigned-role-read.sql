-- PROPOSAL ONLY. NOT EXECUTED. Requires human/backend/Flutter review.
-- Finding META-01: roles_staff_read allows only super_admin, but Web must read
-- assigned roles for active information_manager/report_verifier/mitigation_editor.
-- Function review: supplied has_staff_role body uses auth.uid(), active profile,
-- assignment + roles. Its fingerprint matches the metadata snapshot. With owner
-- postgres and FORCE RLS=false, owner access avoids recursive policy evaluation.
-- Reconfirm owner/flags/body at deployment; changing to invoker/forced RLS can
-- reintroduce recursion through roles/profile/assignment policies.
-- Validate in staging with real JWTs; static review is not API proof.
-- Keep the existing super-admin policy; add only own assigned role visibility.
-- No write privileges or role assignment capability are granted.
-- Package/runbook: docs/phase4a-remediation-validation.md. Release gate: snapshot
-- helper body/owner/flags and self-read policies must match reviewed evidence.
-- CREATE POLICY deliberately fails on a name collision; inspect drift, do not
-- DROP existing policies or silently replace an unknown deployed policy.
BEGIN;
CREATE POLICY roles_assigned_active_staff_read ON public.roles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.staff_role_assignments AS assignment
    JOIN public.staff_profiles AS profile ON profile.user_id = assignment.staff_id
    WHERE assignment.role_id = roles.id
      AND assignment.staff_id = (SELECT auth.uid())
      AND profile.is_active = true
  ));
-- Negative cases: inactive/no-profile/no-role/foreign assignments must not gain
-- role visibility through this new policy. Existing super-admin policy still
-- depends on the reviewed helper. Active staff see assigned roles only.
-- Confirm unchanged helper/owner/profile/assignment RLS before applying.
ROLLBACK;
-- Deliberately rolls back. Do not replace with COMMIT without explicit approval.
-- Approved rollback after deployment: DROP POLICY roles_assigned_active_staff_read
-- ON public.roles; this restores the restrictive snapshot behavior.
