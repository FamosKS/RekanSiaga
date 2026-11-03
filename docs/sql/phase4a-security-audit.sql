-- RekanSiaga Phase 4A finalization: catalog audit only, NOT a migration.
-- Run the entire file in the correct Supabase project's SQL Editor as owner.
-- Export the single JSON result for private review. No staff/auth rows, function
-- bodies, credentials, or arbitrary custom functions are selected/executed.
-- SQL has NOT been executed against the remote database by Codex.
-- Catalog visibility depends on the executing role. Empty output is not PASS.
BEGIN TRANSACTION READ ONLY;

WITH
app_schemas AS (
  SELECT oid, nspname, nspowner, nspacl
  FROM pg_namespace
  WHERE nspname !~ '^pg_' AND nspname <> 'information_schema'
    AND nspname NOT IN ('auth','storage','realtime','extensions','graphql',
      'graphql_public','supabase_functions','supabase_migrations','vault',
      'net','cron','pgsodium','pgsodium_masks','_realtime','_analytics')
),
relations AS (
  SELECT c.*, n.nspname
  FROM pg_class c JOIN app_schemas n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r','p','v','m','f','S')
),
functions AS (
  SELECT p.*, n.nspname
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.prokind IN ('f','p') AND (
    n.oid IN (SELECT oid FROM app_schemas)
    OR p.oid IN (
      SELECT d.refobjid FROM pg_depend d
      JOIN pg_policy pol ON d.classid = 'pg_policy'::regclass AND d.objid = pol.oid
      JOIN relations t ON t.oid = pol.polrelid
      WHERE d.refclassid = 'pg_proc'::regclass
    )
  )
),
client_roles AS (SELECT * FROM pg_roles WHERE rolname IN ('anon','authenticated')),
contract(schema_name, table_name, column_name) AS (
  VALUES ('auth','users','id'), ('auth','users','email'),
    ('public','staff_profiles','user_id'), ('public','staff_profiles','display_name'),
    ('public','staff_profiles','is_active'), ('public','roles','id'),
    ('public','roles','code'), ('public','roles','name'),
    ('public','staff_role_assignments','staff_id'),
    ('public','staff_role_assignments','role_id')
)
SELECT jsonb_build_object(
  'audit_kind', 'READ_ONLY_CATALOG_NOT_RUNTIME_RLS_PROOF',
  'captured_at', CURRENT_TIMESTAMP,
  'postgres_version', current_setting('server_version'),
  'executing_role', current_user,
  'transaction_read_only', current_setting('transaction_read_only'),
  'scope_note', 'Application schema candidates; compare with Dashboard Data API exposed schemas. Managed schemas excluded except auth contract and directly referenced policy functions.',
  'contract_columns', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT k.*, c.oid IS NOT NULL AS relation_present, a.attnum IS NOT NULL AS column_present,
      format_type(a.atttypid,a.atttypmod) AS column_type, a.attnotnull AS not_null,
      c.relkind
    FROM contract k LEFT JOIN pg_namespace n ON n.nspname = k.schema_name
    LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = k.table_name
    LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = k.column_name
      AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY k.schema_name,k.table_name,k.column_name
  ) x), '[]'::jsonb),
  'schemas', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT n.nspname, pg_get_userbyid(n.nspowner) AS owner, n.nspacl::text AS acl,
      r.rolname, has_schema_privilege(r.oid,n.oid,'USAGE') AS usage,
      has_schema_privilege(r.oid,n.oid,'CREATE') AS can_create
    FROM app_schemas n CROSS JOIN client_roles r ORDER BY n.nspname,r.rolname
  ) x), '[]'::jsonb),
  'relations', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT t.nspname,t.relname,t.relkind,pg_get_userbyid(t.relowner) AS owner,
      t.relrowsecurity AS rls_enabled,t.relforcerowsecurity AS rls_forced,
      t.relacl::text AS acl,t.reloptions,
      (SELECT count(*) FROM pg_policy p WHERE p.polrelid=t.oid) AS policy_count
    FROM relations t ORDER BY t.nspname,t.relname
  ) x), '[]'::jsonb),
  'columns', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT t.nspname,t.relname,a.attname,format_type(a.atttypid,a.atttypmod) AS column_type,
      a.attnotnull AS not_null,a.attidentity,a.attgenerated,a.attacl::text AS acl
    FROM relations t JOIN pg_attribute a ON a.attrelid=t.oid
    WHERE a.attnum>0 AND NOT a.attisdropped ORDER BY t.nspname,t.relname,a.attnum
  ) x), '[]'::jsonb),
  'constraints', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT n.nspname,c.relname,con.conname,con.contype,con.convalidated,
      pg_get_constraintdef(con.oid,true) AS definition
    FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE con.conrelid IN (SELECT oid FROM relations)
      OR con.confrelid IN (SELECT oid FROM relations)
    ORDER BY n.nspname,c.relname,con.conname
  ) x), '[]'::jsonb),
  'indexes', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT t.nspname,t.relname,i.indisunique,i.indisprimary,i.indisvalid,
      pg_get_indexdef(i.indexrelid) AS definition
    FROM pg_index i JOIN relations t ON t.oid=i.indrelid ORDER BY t.nspname,t.relname,i.indexrelid
  ) x), '[]'::jsonb),
  'policies', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT p.schemaname,p.tablename,p.policyname,p.permissive,p.roles,p.cmd,p.qual,p.with_check
    FROM pg_policies p JOIN app_schemas n ON n.nspname=p.schemaname
    ORDER BY p.schemaname,p.tablename,p.policyname
  ) x), '[]'::jsonb),
  'effective_table_privileges', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT t.nspname,t.relname,r.rolname,
      has_table_privilege(r.oid,t.oid,'SELECT') AS can_select,
      has_table_privilege(r.oid,t.oid,'INSERT') AS can_insert,
      has_table_privilege(r.oid,t.oid,'UPDATE') AS can_update,
      has_table_privilege(r.oid,t.oid,'DELETE') AS can_delete,
      has_table_privilege(r.oid,t.oid,'TRUNCATE') AS can_truncate,
      has_table_privilege(r.oid,t.oid,'REFERENCES') AS can_reference,
      has_table_privilege(r.oid,t.oid,'TRIGGER') AS can_trigger
    FROM relations t CROSS JOIN client_roles r WHERE t.relkind <> 'S'
    ORDER BY t.nspname,t.relname,r.rolname
  ) x), '[]'::jsonb),
  'effective_column_privileges', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT t.nspname,t.relname,a.attname,r.rolname,
      has_column_privilege(r.oid,t.oid,a.attnum,'SELECT') AS can_select,
      has_column_privilege(r.oid,t.oid,a.attnum,'INSERT') AS can_insert,
      has_column_privilege(r.oid,t.oid,a.attnum,'UPDATE') AS can_update
    FROM relations t JOIN pg_attribute a ON a.attrelid=t.oid CROSS JOIN client_roles r
    WHERE a.attnum>0 AND NOT a.attisdropped AND t.relkind <> 'S'
    ORDER BY t.nspname,t.relname,a.attnum,r.rolname
  ) x), '[]'::jsonb),
  'functions', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT p.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
      pg_get_userbyid(p.proowner) AS owner,p.prosecdef AS security_definer,
      p.provolatile,p.proleakproof,p.proacl::text AS acl,
      (SELECT config FROM unnest(p.proconfig) config
       WHERE config LIKE 'search_path=%' LIMIT 1) AS configured_search_path,
      md5(p.prosrc) AS body_fingerprint,
      (SELECT jsonb_object_agg(r.rolname,has_function_privilege(r.oid,p.oid,'EXECUTE'))
       FROM client_roles r) AS client_execute
    FROM functions p ORDER BY p.nspname,p.proname,p.oid
  ) x), '[]'::jsonb),
  'policy_dependencies', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT t.nspname,t.relname,pol.polname,
      pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid) AS referenced_object
    FROM pg_policy pol JOIN relations t ON t.oid=pol.polrelid
    JOIN pg_depend d ON d.classid='pg_policy'::regclass AND d.objid=pol.oid
    ORDER BY t.nspname,t.relname,pol.polname
  ) x), '[]'::jsonb),
  'view_dependencies', COALESCE((SELECT jsonb_agg(DISTINCT to_jsonb(x)) FROM (
    SELECT v.nspname,v.relname,pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid) AS referenced_object
    FROM relations v JOIN pg_rewrite rw ON rw.ev_class=v.oid
    JOIN pg_depend d ON d.classid='pg_rewrite'::regclass AND d.objid=rw.oid
    WHERE v.relkind IN ('v','m') AND d.refclassid='pg_class'::regclass
  ) x), '[]'::jsonb),
  'triggers', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT t.nspname,t.relname,tr.tgname,tr.tgenabled,
      pn.nspname AS function_schema,p.proname AS function_name,p.prosecdef AS security_definer
    FROM pg_trigger tr JOIN relations t ON t.oid=tr.tgrelid
    JOIN pg_proc p ON p.oid=tr.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace
    WHERE NOT tr.tgisinternal ORDER BY t.nspname,t.relname,tr.tgname
  ) x), '[]'::jsonb),
  'client_roles', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolbypassrls
    FROM client_roles ORDER BY rolname
  ) x), '[]'::jsonb),
  'role_memberships', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT parent.rolname AS granted_role,member.rolname AS member_role,m.admin_option
    FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid
    JOIN pg_roles member ON member.oid=m.member ORDER BY member.rolname,parent.rolname
  ) x), '[]'::jsonb),
  'default_privileges', COALESCE((SELECT jsonb_agg(to_jsonb(x)) FROM (
    SELECT pg_get_userbyid(d.defaclrole) AS owner,n.nspname,d.defaclobjtype,d.defaclacl::text AS acl
    FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
    WHERE d.defaclnamespace=0 OR d.defaclnamespace IN (SELECT oid FROM app_schemas)
    ORDER BY n.nspname,d.defaclobjtype
  ) x), '[]'::jsonb)
) AS phase4a_security_audit;

ROLLBACK;
-- Review function bodies privately in Dashboard after inspecting metadata.
-- Catalog dependencies cannot prove absence of recursion/dynamic SQL escalation.
-- Do not run application functions to inspect them. Views, RPC, storage policies
-- and additional Data API exposed schemas need explicit review if used by apps.
