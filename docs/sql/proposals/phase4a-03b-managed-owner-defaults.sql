-- PROPOSAL ONLY. NOT EXECUTED. CONDITIONAL/SEPARATE APPROVAL REQUIRED.
-- Snapshot also contains defaults for managed creator supabase_admin.
-- This file is NOT part of automatic 01 -> 02 -> 03 execution.
-- BLOCKED until Supabase/provider and backend approve role capability and the
-- effect on NEW managed objects. postgres may not be allowed to change these
-- defaults; do not elevate credentials or alter role membership to force it.
-- Global function default below affects NEW supabase_admin functions in ALL
-- schemas, not just public. Review managed provisioning/upgrades/Flutter first.
BEGIN;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ROLLBACK;
-- No existing grants/objects are changed. New intended-client objects will need
-- explicit reviewed grants. This does not grant or revoke service_role defaults.
-- If unavailable/unapproved, keep META-03 partially BLOCKED and enforce explicit
-- REVOKE/grants in each managed/app creation migration; re-audit every deployment.
