-- READ ONLY. Human runs only after verifying Dashboard rekansiaga-staging ref.
-- current_database() is usually postgres on both projects, NOT target identity.
-- Do not use this output as proof that an unknown connection is staging.
-- A public rls_auto_enable() is NOT automatically safe/forbidden by its name.
-- If present, next inspect phase4a3-inspect-rls-auto-enable.sql read-only and
-- complete behavior/config review before setting bootstrap hash acknowledgements.
BEGIN TRANSACTION READ ONLY;
SELECT CURRENT_TIMESTAMP AS captured_at, current_user AS executing_role,
       current_database() AS database_name,
       current_setting('server_version') AS postgres_version,
       to_regclass('auth.users') IS NOT NULL AS managed_auth_present;
SELECT r.rolname,r.rolsuper,r.rolbypassrls,r.rolcreaterole
FROM pg_roles r WHERE r.rolname IN ('postgres','anon','authenticated','service_role');
SELECT n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')
ORDER BY c.relname;
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid) AS return_type,
       pg_get_userbyid(p.proowner) AS owner,p.prokind,p.prosecdef,p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' ORDER BY p.proname;
SELECT e.evtname,pg_get_userbyid(e.evtowner) AS owner,e.evtevent,e.evtenabled,
       e.evttags,e.evtfoid::regprocedure::text AS linked_function
FROM pg_event_trigger e ORDER BY e.evtname;
SELECT e.extname,e.extversion,n.nspname AS extension_schema
FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
WHERE e.extname='postgis';
SELECT pg_get_userbyid(d.defaclrole) AS creator,n.nspname,d.defaclobjtype,
       d.defaclacl::text AS acl
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
WHERE d.defaclnamespace=0 OR n.nspname='public'
ORDER BY creator,n.nspname,d.defaclobjtype;
ROLLBACK;
