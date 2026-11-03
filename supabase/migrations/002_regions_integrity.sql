-- Regional reference-data integrity. This migration is intentionally local-only
-- until the dev catalog has been reviewed and activation is approved.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- Operator acknowledgement, not automatic project identity verification:
-- SET LOCAL rekansiaga.release_ref='uiuiouosblyuqgnvfpeh';
-- SET LOCAL rekansiaga.release_approval='approve-dev-regions-integrity-v1';
DO $guard$
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh' OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-dev-regions-integrity-v1' THEN RAISE EXCEPTION 'STOP: explicit dev regions migration approval required'; END IF;
 PERFORM pg_advisory_xact_lock(50426,1);
 IF to_regclass('rekansiaga_release.backup_v1') IS NULL OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.regions'::regclass AND relrowsecurity AND pg_get_userbyid(relowner)='postgres') THEN RAISE EXCEPTION 'STOP: Admin/Security release and reviewed regions RLS required'; END IF;
 IF to_regprocedure('public.validate_region_hierarchy()') IS NOT NULL OR to_regprocedure('public.validate_regions_catalog()') IS NOT NULL OR to_regclass('public.idx_regions_type_parent_name') IS NOT NULL OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.regions'::regclass AND tgname='regions_validate_hierarchy') THEN RAISE EXCEPTION 'STOP: regions migration already present or conflicting objects; do not overwrite'; END IF;
END $guard$;

CREATE INDEX IF NOT EXISTS idx_regions_type_parent_name
  ON public.regions(region_type, parent_id, name);

CREATE FUNCTION public.validate_region_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path=''
AS $$
DECLARE
  parent_type text;
BEGIN
  IF NEW.region_type = 'province' THEN
    IF NEW.parent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Province % cannot have a parent', NEW.code USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.parent_id IS NULL THEN
      RAISE EXCEPTION 'Non-province region % requires a parent', NEW.code USING ERRCODE = '23514';
    END IF;
    SELECT region_type INTO parent_type FROM public.regions WHERE id = NEW.parent_id;
    IF parent_type IS NULL OR
       (NEW.region_type IN ('regency', 'city') AND parent_type <> 'province') OR
       (NEW.region_type = 'district' AND parent_type NOT IN ('regency', 'city')) OR
       (NEW.region_type = 'village' AND parent_type <> 'district') THEN
      RAISE EXCEPTION 'Invalid parent for region % (% -> %)', NEW.code, NEW.region_type, parent_type USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_region_hierarchy() FROM PUBLIC,anon,authenticated,service_role;
CREATE CONSTRAINT TRIGGER regions_validate_hierarchy
AFTER INSERT OR UPDATE OF parent_id, region_type ON public.regions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION public.validate_region_hierarchy();

CREATE FUNCTION public.validate_regions_catalog()
RETURNS TABLE (
  duplicate_codes bigint,
  orphan_regions bigint,
  invalid_parent_levels bigint,
  invalid_roots bigint,
  province_count bigint,
  regency_city_count bigint,
  district_count bigint,
  village_count bigint
)
LANGUAGE sql
STABLE
SET search_path=''
AS $$
  WITH duplicates AS (
    SELECT count(*) - count(DISTINCT code) AS count FROM public.regions
  ), orphans AS (
    SELECT count(*) AS count FROM public.regions r
    LEFT JOIN public.regions p ON p.id = r.parent_id
    WHERE r.parent_id IS NOT NULL AND p.id IS NULL
  ), invalid AS (
    SELECT count(*) AS count
    FROM public.regions r
    LEFT JOIN public.regions p ON p.id = r.parent_id
    WHERE (r.region_type = 'province' AND r.parent_id IS NOT NULL)
       OR (r.region_type <> 'province' AND (r.parent_id IS NULL OR
           (r.region_type IN ('regency', 'city') AND p.region_type <> 'province') OR
           (r.region_type = 'district' AND p.region_type NOT IN ('regency', 'city')) OR
           (r.region_type = 'village' AND p.region_type <> 'district')))
  ), roots AS (
    SELECT count(*) AS count FROM public.regions WHERE region_type = 'province' AND parent_id IS NOT NULL
  )
  SELECT d.count, o.count, i.count, r.count,
    (SELECT count(*) FROM public.regions WHERE region_type = 'province'),
    (SELECT count(*) FROM public.regions WHERE region_type IN ('regency', 'city')),
    (SELECT count(*) FROM public.regions WHERE region_type = 'district'),
    (SELECT count(*) FROM public.regions WHERE region_type = 'village')
  FROM duplicates d, orphans o, invalid i, roots r;
$$;

REVOKE ALL ON FUNCTION public.validate_regions_catalog() FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
