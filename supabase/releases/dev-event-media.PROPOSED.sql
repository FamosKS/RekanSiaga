-- Proposed event photo support. LOCAL REVIEW ONLY; do not apply before separate operator approval.
-- Private PNG assets, sanitized by event-media Edge Function. Reports/media remain separate.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres'
 OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
 OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-dev-event-media-v1'
 THEN RAISE EXCEPTION 'STOP: event media package approval required'; END IF;
 IF to_regclass('public.disaster_events') IS NULL OR to_regclass('public.audit_logs') IS NULL
 OR to_regprocedure('public.has_staff_role(text[])') IS NULL
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.disaster_events'::regclass AND relrowsecurity)
 THEN RAISE EXCEPTION 'STOP: existing event, audit, and RLS contract required'; END IF;
 IF to_regclass('public.event_media_assets') IS NOT NULL OR EXISTS(SELECT 1 FROM storage.buckets WHERE id='event-media')
 THEN RAISE EXCEPTION 'STOP: event-media objects already exist; reconcile, do not retry'; END IF;
 IF EXISTS(SELECT 1 FROM pg_policies WHERE policyname LIKE 'rs_event_media_%')
 OR to_regprocedure('public.prepare_event_image_v1(uuid,timestamptz)') IS NOT NULL
 OR to_regprocedure('public.public_event_images_v1(uuid[])') IS NOT NULL
 THEN RAISE EXCEPTION 'STOP: event media policies/functions already exist; reconcile, do not retry'; END IF;
END $guard$;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('event-media','event-media',false,5242880,ARRAY['image/png']);

CREATE TABLE public.event_media_assets(
 storage_path text PRIMARY KEY,
 event_id uuid NOT NULL REFERENCES public.disaster_events(id) ON DELETE RESTRICT,
 created_by uuid NOT NULL REFERENCES auth.users(id),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','current','revoked')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(storage_path LIKE 'events/%/%' AND storage_path LIKE '%.png')
);
CREATE UNIQUE INDEX event_media_one_current ON public.event_media_assets(event_id) WHERE state='current';
ALTER TABLE public.event_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media_assets FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_media_assets FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.event_media_assets TO service_role;

CREATE POLICY rs_event_media_read ON storage.objects FOR SELECT TO anon,authenticated USING(
 bucket_id='event-media' AND (EXISTS(
   SELECT 1 FROM public.event_media_assets m JOIN public.disaster_events e ON e.id=m.event_id
   WHERE m.storage_path=name AND m.state='current' AND e.published_at IS NOT NULL
   AND e.verification_status IN ('source_confirmed','staff_verified'))
   OR public.has_staff_role(ARRAY['super_admin','information_manager'])));
CREATE POLICY rs_event_media_visibility ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated USING(
 bucket_id<>'event-media' OR EXISTS(
   SELECT 1 FROM public.event_media_assets m JOIN public.disaster_events e ON e.id=m.event_id
   WHERE m.storage_path=name AND m.state='current' AND e.published_at IS NOT NULL
   AND e.verification_status IN ('source_confirmed','staff_verified'))
   OR public.has_staff_role(ARRAY['super_admin','information_manager']));
CREATE POLICY rs_event_media_no_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(bucket_id<>'event-media');
CREATE POLICY rs_event_media_no_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(bucket_id<>'event-media') WITH CHECK(bucket_id<>'event-media');
CREATE POLICY rs_event_media_no_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(bucket_id<>'event-media');

CREATE FUNCTION public.prepare_event_image_v1(p_event_id uuid,p_expected_updated_at timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE path text;
BEGIN
 IF auth.uid() IS NULL OR public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 PERFORM id FROM public.disaster_events WHERE id=p_event_id AND updated_at=p_expected_updated_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 IF (SELECT count(*) FROM public.event_media_assets WHERE created_by=auth.uid() AND state='pending')>=5 THEN RAISE EXCEPTION 'Pending upload limit' USING ERRCODE='54000'; END IF;
 path:='events/'||p_event_id::text||'/'||gen_random_uuid()::text||'.png';
 INSERT INTO public.event_media_assets(storage_path,event_id,created_by) VALUES(path,p_event_id,auth.uid());
 RETURN path;
END $fn$;

CREATE FUNCTION public.commit_event_image_v1(p_event_id uuid,p_expected_updated_at timestamptz,p_storage_path text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=auth.uid(); old_path text;
BEGIN
 IF actor IS NULL OR public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 PERFORM id FROM public.disaster_events WHERE id=p_event_id AND updated_at=p_expected_updated_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 PERFORM 1 FROM public.event_media_assets m JOIN storage.objects o ON o.bucket_id='event-media' AND o.name=m.storage_path
 WHERE m.event_id=p_event_id AND m.storage_path=p_storage_path AND m.created_by=actor AND m.state='pending' FOR UPDATE OF m;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unregistered image' USING ERRCODE='22023'; END IF;
 SELECT storage_path INTO old_path FROM public.event_media_assets WHERE event_id=p_event_id AND state='current' FOR UPDATE;
 UPDATE public.event_media_assets SET state='revoked',updated_at=now() WHERE event_id=p_event_id AND state='current';
 UPDATE public.event_media_assets SET state='current',updated_at=now() WHERE storage_path=p_storage_path;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,old_values,new_values)
 VALUES(actor,'SET_EVENT_IMAGE','disaster_events',p_event_id,jsonb_build_object('image_path',old_path),jsonb_build_object('image_path',p_storage_path));
 UPDATE public.disaster_events SET updated_at=now() WHERE id=p_event_id;
 RETURN true;
END $fn$;

CREATE FUNCTION public.revoke_event_image_v1(p_event_id uuid,p_expected_updated_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE actor uuid:=auth.uid(); old_path text;
BEGIN
 IF actor IS NULL OR public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 PERFORM id FROM public.disaster_events WHERE id=p_event_id AND updated_at=p_expected_updated_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 UPDATE public.event_media_assets SET state='revoked',updated_at=now() WHERE event_id=p_event_id AND state='current' RETURNING storage_path INTO old_path;
 IF old_path IS NULL THEN RETURN true; END IF;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,old_values,new_values)
 VALUES(actor,'REVOKE_EVENT_IMAGE','disaster_events',p_event_id,jsonb_build_object('image_path',old_path),jsonb_build_object('image_path',NULL));
 UPDATE public.disaster_events SET updated_at=now() WHERE id=p_event_id;
 RETURN true;
END $fn$;

CREATE FUNCTION public.abort_event_image_v1(p_storage_path text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 DELETE FROM public.event_media_assets WHERE storage_path=p_storage_path AND created_by=auth.uid() AND state='pending'
 AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='event-media' AND name=p_storage_path);
 RETURN FOUND;
END $fn$;

CREATE FUNCTION public.public_event_image_v1(p_event_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT 'event-media/'||m.storage_path FROM public.event_media_assets m JOIN public.disaster_events e ON e.id=m.event_id
 WHERE m.event_id=p_event_id AND m.state='current' AND e.published_at IS NOT NULL AND e.verification_status IN ('source_confirmed','staff_verified')
 LIMIT 1
$fn$;

CREATE FUNCTION public.public_event_images_v1(p_event_ids uuid[])
RETURNS TABLE(event_id uuid,image_path text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT m.event_id,'event-media/'||m.storage_path FROM public.event_media_assets m JOIN public.disaster_events e ON e.id=m.event_id
 WHERE coalesce(cardinality(p_event_ids),0)<=100 AND m.event_id=ANY(p_event_ids) AND m.state='current' AND e.published_at IS NOT NULL AND e.verification_status IN ('source_confirmed','staff_verified')
 LIMIT 100
$fn$;

CREATE FUNCTION public.admin_event_image_v1(p_event_id uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 RETURN (SELECT 'event-media/'||m.storage_path FROM public.event_media_assets m WHERE m.event_id=p_event_id AND m.state='current' LIMIT 1);
END $fn$;

CREATE FUNCTION public.admin_event_images_v1(p_event_ids uuid[])
RETURNS TABLE(event_id uuid,image_path text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT m.event_id,'event-media/'||m.storage_path FROM public.event_media_assets m WHERE coalesce(cardinality(p_event_ids),0)<=100 AND m.event_id=ANY(p_event_ids) AND m.state='current' LIMIT 100;
END $fn$;

REVOKE ALL ON FUNCTION public.prepare_event_image_v1(uuid,timestamptz),public.commit_event_image_v1(uuid,timestamptz,text),public.revoke_event_image_v1(uuid,timestamptz),public.abort_event_image_v1(text),public.public_event_image_v1(uuid),public.public_event_images_v1(uuid[]),public.admin_event_image_v1(uuid),public.admin_event_images_v1(uuid[]) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_event_image_v1(uuid,timestamptz),public.commit_event_image_v1(uuid,timestamptz,text),public.revoke_event_image_v1(uuid,timestamptz),public.abort_event_image_v1(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_event_image_v1(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.public_event_images_v1(uuid[]) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_event_image_v1(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_event_images_v1(uuid[]) TO authenticated;
COMMIT;
SELECT json_build_object('status','APPLIED','project_ref','uiuiouosblyuqgnvfpeh','scope','optional private disaster event image media') AS event_media_applied;
