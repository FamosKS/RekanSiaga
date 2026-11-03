-- Stage B only: run once after migration 002 succeeds in confirmed dev.
-- National row counts are informational here; 91,599 rows belong to stage C.
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
WITH function_checks AS (
 SELECT f.signature,coalesce(
  p.oid IS NOT NULL AND pg_get_userbyid(p.proowner)='postgres'
  AND NOT p.prosecdef AND p.proconfig=ARRAY['search_path=""']::text[]
  AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
  AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
  AND NOT has_function_privilege('service_role',p.oid,'EXECUTE')
  AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE'),false) AS pass
 FROM (VALUES ('validate_region_hierarchy()'),('validate_regions_catalog()')) f(signature)
 LEFT JOIN pg_proc p ON p.oid=to_regprocedure('public.'||f.signature)
), structure AS (
 SELECT
  EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.regions') AND relrowsecurity AND pg_get_userbyid(relowner)='postgres') AS regions_rls,
  EXISTS(SELECT 1 FROM pg_index i WHERE i.indexrelid=to_regclass('public.idx_regions_type_parent_name')
   AND i.indrelid=to_regclass('public.regions') AND i.indisvalid AND i.indisready
   AND i.indnkeyatts=3 AND i.indnatts=3
   AND pg_get_indexdef(i.indexrelid,1,true)='region_type'
   AND pg_get_indexdef(i.indexrelid,2,true)='parent_id'
   AND pg_get_indexdef(i.indexrelid,3,true)='name') AS index_ready,
  EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('public.regions')
   AND t.tgname='regions_validate_hierarchy' AND NOT t.tgisinternal
   AND t.tgfoid=to_regprocedure('public.validate_region_hierarchy()')
   AND t.tgenabled='O' AND t.tgdeferrable AND t.tginitdeferred
   AND t.tgtype=21) AS hierarchy_trigger_ready
), catalog AS (
 SELECT * FROM public.validate_regions_catalog()
), result AS (
 SELECT structure.*,
  catalog.duplicate_codes=0 AND catalog.orphan_regions=0
   AND catalog.invalid_parent_levels=0 AND catalog.invalid_roots=0 AS catalog_integrity,
  (SELECT bool_and(pass) FROM function_checks) AS helper_acl_pass
 FROM structure CROSS JOIN catalog
)
SELECT jsonb_build_object(
 'kind','rekansiaga-dev-regions-migration-postflight-v1',
 'expected_ref','uiuiouosblyuqgnvfpeh',
 'read_only',current_setting('transaction_read_only')='on',
 'migration_pass',regions_rls AND index_ready AND hierarchy_trigger_ready AND catalog_integrity AND helper_acl_pass,
 'checks',to_jsonb(result),
 'functions',(SELECT jsonb_agg(to_jsonb(function_checks) ORDER BY signature) FROM function_checks),
 'catalog',(SELECT to_jsonb(catalog) FROM catalog),
 'next_stage','C: import 91,599 regions after separate approval; no national count requirement at B'
) AS rekansiaga_regions_migration_postflight
FROM result;
ROLLBACK;
