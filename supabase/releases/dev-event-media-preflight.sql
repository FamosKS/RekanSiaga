SELECT json_build_object(
 'project_ref',current_setting('rekansiaga.release_ref',true),
 'current_user',current_user,'session_user',session_user,
 'event_rls',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.disaster_events')),false),
 'media_table_exists',to_regclass('public.event_media_assets') IS NOT NULL,
 'bucket_exists',EXISTS(SELECT 1 FROM storage.buckets WHERE id='event-media'),
 'prepare_rpc_exists',to_regprocedure('public.prepare_event_image_v1(uuid,timestamptz)') IS NOT NULL,
 'read_rpc_exists',to_regprocedure('public.public_event_images_v1(uuid[])') IS NOT NULL,
 'policy_collision',EXISTS(SELECT 1 FROM pg_policies WHERE policyname LIKE 'rs_event_media_%')
) AS event_media_preflight;
