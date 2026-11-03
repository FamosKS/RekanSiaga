-- Phase 4A metadata audit. READ ONLY. Run in Supabase SQL Editor as project owner.
-- No auth.users rows, email, tokens, credentials, or staff personal data are selected.
BEGIN TRANSACTION READ ONLY;

-- 1. Presence, RLS enabled/forced, table owner.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relkind, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced,
       pg_get_userbyid(c.relowner) AS owner_name
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname = 'public' AND c.relname IN ('staff_profiles','roles','staff_role_assignments'))
   OR (n.nspname = 'auth' AND c.relname = 'users')
ORDER BY 1,2;

-- 2. Column types/nullability/defaults. Verify against the documented contract.
SELECT table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE (table_schema = 'public' AND table_name IN ('staff_profiles','roles','staff_role_assignments'))
   OR (table_schema = 'auth' AND table_name = 'users' AND column_name IN ('id','email'))
ORDER BY table_schema, table_name, ordinal_position;

-- 3. PK, UNIQUE, FK, CHECK. Validate exact FK targets and convalidated.
SELECT n.nspname AS schema_name, c.relname AS table_name, con.conname,
       con.contype, con.convalidated, pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('staff_profiles','roles','staff_role_assignments')
ORDER BY c.relname, con.contype, con.conname;

-- 4. Include indexes: uniqueness may be enforced by an index rather than constraint.
SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('staff_profiles','roles','staff_role_assignments')
ORDER BY tablename, indexname;

-- 5. Inspect every policy, including permissive OR-composition, write policies,
-- PUBLIC/anon role targets, and functions referenced in qual/with_check.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
AND tablename IN ('staff_profiles','roles','staff_role_assignments')
ORDER BY tablename, policyname;

-- 6. Table and column grants. Policies do not replace grants and vice versa.
SELECT grantee, table_schema, table_name, privilege_type, is_grantable
FROM information_schema.table_privileges WHERE table_schema = 'public'
AND table_name IN ('staff_profiles','roles','staff_role_assignments')
ORDER BY table_name, grantee, privilege_type;
SELECT grantee, table_schema, table_name, column_name, privilege_type
FROM information_schema.column_privileges WHERE table_schema = 'public'
AND table_name IN ('staff_profiles','roles','staff_role_assignments')
ORDER BY table_name, grantee, column_name, privilege_type;

-- 7. Effective privileges, including inherited grants (Supabase database roles).
SELECT r.rolname, n.nspname AS schema_name, c.relname AS table_name,
       has_schema_privilege(r.oid,n.oid,'USAGE') AS schema_usage,
       has_table_privilege(r.oid,c.oid,'SELECT') AS can_select,
       has_table_privilege(r.oid,c.oid,'INSERT') AS can_insert,
       has_table_privilege(r.oid,c.oid,'UPDATE') AS can_update,
       has_table_privilege(r.oid,c.oid,'DELETE') AS can_delete,
       r.rolsuper, r.rolbypassrls
FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE r.rolname IN ('anon','authenticated') AND n.nspname='public'
AND c.relname IN ('staff_profiles','roles','staff_role_assignments')
ORDER BY r.rolname,c.relname;

-- 8. List exposed functions for manual privilege/security review. No function
-- source or secret settings are printed. Review policy helper bodies privately.
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer, p.proacl AS grants
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' ORDER BY p.proname;
ROLLBACK;
