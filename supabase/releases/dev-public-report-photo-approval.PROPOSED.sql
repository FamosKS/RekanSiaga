-- Public report photo approval contract (dev only).
-- The original report-evidence object remains private. A trusted server-side
-- image processor must create the sanitized copy before approval.
BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public-report-evidence', 'public-report-evidence', true, 5242880, ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS rs_public_report_evidence_read ON storage.objects;
CREATE POLICY rs_public_report_evidence_read
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'public-report-evidence');

CREATE TABLE IF NOT EXISTS public.report_public_photo_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid NOT NULL UNIQUE REFERENCES public.report_attachments(id) ON DELETE RESTRICT,
  public_storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  approved_by uuid NOT NULL REFERENCES public.staff_profiles(user_id) ON DELETE RESTRICT,
  approved_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (public_storage_path LIKE 'public-report-evidence/%')
);

ALTER TABLE public.report_public_photo_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_public_photo_approvals FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_public_photo_approvals FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.approve_report_public_photo(
  p_attachment_id uuid,
  p_public_storage_path text,
  p_mime_type text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR public.has_staff_role(ARRAY['super_admin','report_verifier']) IS NOT TRUE
     OR p_attachment_id IS NULL
     OR p_public_storage_path NOT LIKE 'public-report-evidence/%'
     OR p_mime_type NOT IN ('image/jpeg','image/png','image/webp') THEN
    RAISE EXCEPTION 'Forbidden or invalid public photo' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.report_public_photo_approvals(attachment_id,public_storage_path,mime_type,approved_by)
  SELECT a.id,p_public_storage_path,p_mime_type,actor
  FROM public.report_attachments a
  JOIN public.public_reports r ON r.id=a.report_id
  WHERE a.id=p_attachment_id AND r.status='verified'
  ON CONFLICT (attachment_id) DO UPDATE SET
    public_storage_path=excluded.public_storage_path,
    mime_type=excluded.mime_type,
    approved_by=excluded.approved_by,
    approved_at=now(),
    revoked_at=NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attachment is not eligible' USING ERRCODE='22023'; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_report_public_photo(p_attachment_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_staff_role(ARRAY['super_admin','report_verifier']) IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
  END IF;
  UPDATE public.report_public_photo_approvals
  SET revoked_at=now()
  WHERE attachment_id=p_attachment_id AND revoked_at IS NULL;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_report_public_photo(uuid,text,text) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.revoke_report_public_photo(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.approve_report_public_photo(uuid,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_report_public_photo(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.list_public_verified_report_map();
CREATE OR REPLACE FUNCTION public.list_public_verified_report_map()
RETURNS TABLE (id text, report_type text, title text, region_name text, coordinates text, public_photo_path text, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT encode(sha256(convert_to(r.id::text, 'UTF8')), 'hex'),
    CASE
      WHEN lower(r.report_type) LIKE '%banjir%' THEN 'Banjir'
      WHEN lower(r.report_type) LIKE '%gempa%' THEN 'Gempa bumi'
      WHEN lower(r.report_type) LIKE '%gunung%' OR lower(r.report_type) LIKE '%api%' OR lower(r.report_type) LIKE '%erupsi%' THEN 'Gunung api'
      WHEN lower(r.report_type) LIKE '%kebakaran%' THEN 'Kebakaran'
      WHEN lower(r.report_type) LIKE '%longsor%' THEN 'Tanah longsor'
      ELSE 'Lainnya'
    END,
    left(trim(r.title), 180), reg.name, extensions.st_astext(r.coordinates),
    pa.public_storage_path, r.updated_at
  FROM public.public_reports r
  LEFT JOIN public.regions reg ON reg.id = r.region_id
  LEFT JOIN public.report_public_photo_approvals pa ON pa.revoked_at IS NULL
    AND pa.attachment_id IN (SELECT a.id FROM public.report_attachments a WHERE a.report_id = r.id ORDER BY a.created_at ASC LIMIT 1)
  WHERE r.status = 'verified' AND r.coordinates IS NOT NULL AND extensions.st_srid(r.coordinates) = 4326
  ORDER BY r.updated_at DESC LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.list_public_verified_report_map() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_verified_report_map() TO anon, authenticated;

COMMIT;
