-- READ ONLY. PostgreSQL 17+ (supplied staging exports: 17.11).
-- Verify Dashboard rekansiaga-staging reference first; never use dev for this workflow.
-- Closes two export gaps: column defaults and per-membership inheritance/SET options.
-- Does not invoke any application/default function or read application row data.
-- Export JSON privately. No remote execution by Codex; SQL runtime not tested here.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT jsonb_build_object(
 'kind','STAGING_METADATA_GAPS_NOT_AUTHENTICATED_API_PROOF',
 'captured_at',CURRENT_TIMESTAMP,'executing_role',current_user,
 'database_name',current_database(),'server_version',current_setting('server_version'),
 'transaction_read_only',current_setting('transaction_read_only'),
 'target_note','Operator must record verified Dashboard staging reference separately',
 'column_defaults',COALESCE((SELECT jsonb_agg(jsonb_build_object(
   'table_name',c.relname,'column_name',a.attname,
   'column_type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,
   'identity',a.attidentity,'generated',a.attgenerated,
   'default_expr',pg_get_expr(d.adbin,d.adrelid)) ORDER BY c.relname,a.attnum)
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_attribute a ON a.attrelid=c.oid
  LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
  WHERE n.nspname='public' AND c.relkind IN ('r','p')
    AND a.attnum>0 AND NOT a.attisdropped),'[]'::jsonb),
 'membership_options',COALESCE((SELECT jsonb_agg(jsonb_build_object(
   'member_role',member.rolname,'granted_role',parent.rolname,
   'grantor',grantor.rolname,'admin_option',m.admin_option,
   'inherit_option',m.inherit_option,'set_option',m.set_option)
   ORDER BY member.rolname,parent.rolname,m.oid)
  FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid
  JOIN pg_roles member ON member.oid=m.member
  JOIN pg_roles grantor ON grantor.oid=m.grantor),'[]'::jsonb),
 'schema_client_access',COALESCE((SELECT jsonb_agg(jsonb_build_object(
   'schema',n.nspname,'owner',pg_get_userbyid(n.nspowner),'role',r.rolname,
   'usage',has_schema_privilege(r.oid,n.oid,'USAGE'),
   'create',has_schema_privilege(r.oid,n.oid,'CREATE')) ORDER BY n.nspname,r.rolname)
  FROM pg_namespace n CROSS JOIN pg_roles r
  WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
   AND r.rolname IN ('anon','authenticated','service_role')),'[]'::jsonb),
 'database_client_access',COALESCE((SELECT jsonb_agg(jsonb_build_object(
   'role',r.rolname,'create',has_database_privilege(r.oid,current_database(),'CREATE'),
   'temporary',has_database_privilege(r.oid,current_database(),'TEMPORARY')) ORDER BY r.rolname)
  FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role')),'[]'::jsonb),
 'note','No overall PASS. Compare 200 defaults to approved Master; inspect membership direction/options. Exposed schemas and real JWT decisions still need separate evidence.'
) AS phase4a4_final_readonly_gaps;
ROLLBACK;
