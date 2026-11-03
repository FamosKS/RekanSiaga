-- PROPOSAL ONLY. NOT EXECUTED. Finding META-03: broad future-object ACLs.
-- Owner-scoped hardening for NEW objects created by postgres in public only.
-- Existing tables, grants, RLS, role assignments and current APIs are unchanged.
-- Future migrations must grant only explicit, approved privileges + RLS.
-- Coordinate with Flutter/backend provisioning; do not change managed owners
-- such as supabase_admin without reviewing provider-managed workflows.
-- Approved principle scope: postgres/public local defaults only. Migration
-- execution still requires approval. No global/default managed-schema writes.
-- Schema-level REVOKE alone cannot cancel built-in global PUBLIC EXECUTE.
-- Existing function/table ACLs and service_role grants remain unchanged.
-- Verify creator identities/default ACLs have not drifted from the snapshot.
-- Managed creator supabase_admin is a separate gated proposal (03b); do not run
-- it as a workaround with broader credentials if Supabase rejects ownership.
BEGIN;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ROLLBACK;
-- Deliberately rolls back; explicit approval required before real application.
-- New app objects need explicit least-privilege grants + RLS in their own reviewed
-- migrations. New intended-public submit/tracking RPCs require explicit grants;
-- do not confuse changed defaults with revocation on EXISTING submit/track RPCs.
-- Other creators and non-public schema-specific function grants need inventory.
-- Do not restore broad defaults as an automatic compatibility rollback.
