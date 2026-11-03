SELECT json_build_object(
 'status',CASE WHEN current_setting('rekansiaga.release_ref',true)='uiuiouosblyuqgnvfpeh'
   AND current_user='postgres' AND session_user='postgres'
   AND EXISTS(SELECT 1 FROM storage.buckets WHERE id='event-media' AND public=false AND file_size_limit=5242880 AND allowed_mime_types=ARRAY['image/png']::text[])
   AND to_regclass('public.event_media_assets') IS NOT NULL
   AND to_regprocedure('public.prepare_event_image_v1(uuid,timestamptz)') IS NOT NULL
   AND to_regprocedure('public.commit_event_image_v1(uuid,timestamptz,text)') IS NOT NULL
   AND to_regprocedure('public.revoke_event_image_v1(uuid,timestamptz)') IS NOT NULL
   AND to_regprocedure('public.public_event_images_v1(uuid[])') IS NOT NULL
   AND to_regprocedure('public.admin_event_images_v1(uuid[])') IS NOT NULL
   THEN 'PASS' ELSE 'FAIL' END,
 'project_ref',current_setting('rekansiaga.release_ref',true),
 'private_bucket',coalesce((SELECT NOT public FROM storage.buckets WHERE id='event-media'),false),
 'rls_enabled',coalesce((SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid=to_regclass('public.event_media_assets')),false)
) AS event_media_postflight;
