-- RekanSiaga — verified report map projection (dev only)
-- Public reads use this sanitized projection; public_reports remains RLS-protected.
BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;

DROP FUNCTION IF EXISTS public.list_public_verified_report_map();

CREATE OR REPLACE FUNCTION public.list_public_verified_report_map()
RETURNS TABLE (
  id text,
  report_type text,
  title text,
  region_name text,
  coordinates text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT
    encode(sha256(convert_to(r.id::text, 'UTF8')), 'hex') AS id,
    CASE
      WHEN lower(r.report_type) LIKE '%banjir%' THEN 'Banjir'
      WHEN lower(r.report_type) LIKE '%gempa%' THEN 'Gempa bumi'
      WHEN lower(r.report_type) LIKE '%gunung%' OR lower(r.report_type) LIKE '%api%' OR lower(r.report_type) LIKE '%erupsi%' THEN 'Gunung api'
      WHEN lower(r.report_type) LIKE '%kebakaran%' THEN 'Kebakaran'
      WHEN lower(r.report_type) LIKE '%longsor%' THEN 'Tanah longsor'
      ELSE 'Lainnya'
    END AS report_type,
    left(
      regexp_replace(
        regexp_replace(trim(r.title), '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[A-Za-z]{2,}', '[disamarkan]', 'gi'),
        '(\+?[0-9][0-9 ()-]{7,}[0-9])',
        '[disamarkan]',
        'g'
      ),
      180
    ) AS title,
    reg.name AS region_name,
    CASE
      WHEN r.coordinates IS NULL THEN NULL
      ELSE extensions.st_astext(r.coordinates)
    END AS coordinates,
    r.updated_at
  FROM public.public_reports AS r
  LEFT JOIN public.regions AS reg ON reg.id = r.region_id
  WHERE r.status = 'verified'
    AND r.coordinates IS NOT NULL
    AND extensions.st_srid(r.coordinates) = 4326
  ORDER BY r.updated_at DESC
  LIMIT 500;
$$;

REVOKE ALL ON FUNCTION public.list_public_verified_report_map() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_verified_report_map() TO anon, authenticated;

COMMIT;
