-- READ-ONLY catalog export for dev-live-admin-v1. No DDL, DML or RPC invocation.
-- Confirm the Dashboard/Management API project before running. expected_target
-- below is a local expectation, NOT evidence of the connected project identity.
-- Export only this single JSON result. No table contents, Auth identities,
-- tokens, function bodies, passwords, setting values or object paths are returned.
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
WITH relations AS (
 SELECT c.*,n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname IN ('public','rekansiaga_release') AND c.relkind IN ('r','p','v','m')
), functions AS (
 SELECT p.*,n.nspname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','rekansiaga_release') AND p.prokind IN ('f','p')
)
SELECT jsonb_build_object(
 'kind','rekansiaga-dev-preflight-catalog-v1',
 'captured_at',now(),
 'expected_target',jsonb_build_object('name','rekansiaga-dev','ref','uiuiouosblyuqgnvfpeh','management_identity_verified',false),
 'connection',jsonb_build_object('database',current_database(),'current_user',current_user,'session_user',session_user,'server_version',current_setting('server_version'),'transaction_read_only',current_setting('transaction_read_only')),
 'relations',coalesce((SELECT jsonb_agg(jsonb_build_object('schema',r.nspname,'name',r.relname,'kind',r.relkind,'owner',pg_get_userbyid(r.relowner),'rls',r.relrowsecurity,'force_rls',r.relforcerowsecurity,'options',r.reloptions) ORDER BY r.nspname,r.relname) FROM relations r),'[]'::jsonb),
 'columns',coalesce((SELECT jsonb_agg(jsonb_build_object('schema',r.nspname,'table',r.relname,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'acl',a.attacl::text) ORDER BY r.nspname,r.relname,a.attnum) FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid WHERE a.attnum>0 AND NOT a.attisdropped),'[]'::jsonb),
 'constraints',coalesce((SELECT jsonb_agg(jsonb_build_object('table',r.relname,'name',k.conname,'type',k.contype,'definition_sha256',encode(sha256(convert_to(pg_get_constraintdef(k.oid),'UTF8')),'hex'),'referenced_schema',(SELECT nspname FROM pg_namespace WHERE oid=ref.relnamespace),'referenced_table',ref.relname) ORDER BY r.relname,k.conname) FROM relations r JOIN pg_constraint k ON k.conrelid=r.oid LEFT JOIN pg_class ref ON ref.oid=k.confrelid),'[]'::jsonb),
 'policies',coalesce((SELECT jsonb_agg(jsonb_build_object('schema',p.schemaname,'table',p.tablename,'name',p.policyname,'roles',p.roles,'command',p.cmd,'permissive',p.permissive,'using_md5',md5(coalesce(p.qual,'')),'check_md5',md5(coalesce(p.with_check,'')),'using_is_true',p.qual='true','check_is_true',p.with_check='true') ORDER BY p.schemaname,p.tablename,p.policyname) FROM pg_policies p WHERE p.schemaname IN ('public','storage')),'[]'::jsonb),
 'table_grants',coalesce((SELECT jsonb_agg(jsonb_build_object('schema',r.nspname,'table',r.relname,'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'grantor',pg_get_userbyid(a.grantor),'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY r.nspname,r.relname,a.grantee,a.privilege_type) FROM relations r CROSS JOIN LATERAL aclexplode(coalesce(r.relacl,acldefault('r',r.relowner))) a),'[]'::jsonb),
 'functions',coalesce((SELECT jsonb_agg(jsonb_build_object('schema',p.nspname,'name',p.proname,'identity_arguments',pg_get_function_identity_arguments(p.oid),'result',pg_get_function_result(p.oid),'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'volatility',p.provolatile,'default_argument_count',p.pronargdefaults,'search_path',(SELECT setting FROM unnest(p.proconfig) setting WHERE setting LIKE 'search_path=%' LIMIT 1),'definition_sha256',encode(sha256(convert_to(replace(pg_get_functiondef(p.oid),chr(13),''),'UTF8')),'hex')) ORDER BY p.proname,p.oid) FROM functions p),'[]'::jsonb),
 'function_grants',coalesce((SELECT jsonb_agg(jsonb_build_object('schema',p.nspname,'name',p.proname,'identity_arguments',pg_get_function_identity_arguments(p.oid),'grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY p.proname,p.oid,a.grantee) FROM functions p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),'[]'::jsonb),
 'default_acl',coalesce((SELECT jsonb_agg(jsonb_build_object('creator',pg_get_userbyid(d.defaclrole),'schema',n.nspname,'object_type',d.defaclobjtype,'acl',d.defaclacl::text) ORDER BY d.defaclrole,d.defaclnamespace,d.defaclobjtype) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace),'[]'::jsonb),
 'role_membership',coalesce((SELECT jsonb_agg(jsonb_build_object('role',pg_get_userbyid(m.roleid),'member',pg_get_userbyid(m.member),'admin_option',m.admin_option) ORDER BY m.roleid,m.member) FROM pg_auth_members m),'[]'::jsonb),
 'staff_role_summary',coalesce((SELECT jsonb_agg(jsonb_build_object('code',r.code,'active_count',(SELECT count(*) FROM public.staff_role_assignments a JOIN public.staff_profiles s ON s.user_id=a.staff_id WHERE a.role_id=r.id AND s.is_active),'inactive_count',(SELECT count(*) FROM public.staff_role_assignments a JOIN public.staff_profiles s ON s.user_id=a.staff_id WHERE a.role_id=r.id AND NOT s.is_active)) ORDER BY r.code) FROM public.roles r),'[]'::jsonb),
 'publications',coalesce((SELECT jsonb_agg(jsonb_build_object('publication',p.pubname,'schema',p.schemaname,'table',p.tablename) ORDER BY p.pubname,p.schemaname,p.tablename) FROM pg_publication_tables p WHERE p.schemaname='public'),'[]'::jsonb),
 'evidence_bucket',coalesce((SELECT jsonb_agg(jsonb_build_object('id',b.id,'public',b.public,'file_size_limit',b.file_size_limit,'allowed_mime_types',b.allowed_mime_types)) FROM storage.buckets b WHERE b.id='report-evidence'),'[]'::jsonb)
) AS rekansiaga_preflight;
ROLLBACK;
