-- Operator SQL Editor, confirmed rekansiaga-dev; metadata/counts only.
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
WITH actual AS (SELECT * FROM public.validate_regions_catalog()), counts AS (
 SELECT count(*) AS total,
  count(*) FILTER(WHERE region_type='regency') AS regencies,
  count(*) FILTER(WHERE region_type='city') AS cities
 FROM public.regions
)
SELECT jsonb_build_object(
 'kind','rekansiaga-dev-regions-postflight-v1',
 'expected_ref','uiuiouosblyuqgnvfpeh',
 'read_only',current_setting('transaction_read_only')='on',
 'actual',to_jsonb(actual),'counts',to_jsonb(counts),
 'pass',duplicate_codes=0 AND orphan_regions=0 AND invalid_parent_levels=0 AND invalid_roots=0
  AND province_count=38 AND regency_city_count=514 AND district_count=7285 AND village_count=83762
  AND total=91599 AND regencies=416 AND cities=98,
 'on_failure','STOP; preserve existing rows and investigate. No automatic deletion or reseed.'
) AS rekansiaga_regions_postflight FROM actual CROSS JOIN counts;
ROLLBACK;
