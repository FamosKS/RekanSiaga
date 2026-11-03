-- Focused metadata/public-feed contract checks; no private payloads or secrets returned.
BEGIN READ ONLY;
WITH checks AS (SELECT
 jsonb_typeof(public.public_event_feed_v1('','','','','updated',1,1)->'items')='array' feed_contract,
 EXISTS(SELECT 1 FROM pg_class WHERE oid='public.public_reports'::regclass AND relrowsecurity) reports_private,
 EXISTS(SELECT 1 FROM storage.buckets WHERE id='article-media' AND NOT public AND file_size_limit=5242880 AND allowed_mime_types=ARRAY['image/png']::text[]) private_media_bucket,
 EXISTS(SELECT 1 FROM pg_class WHERE oid='public.article_media_assets'::regclass AND relrowsecurity AND relforcerowsecurity) registry_private,
 has_function_privilege('anon','public.public_event_feed_v1(text,text,text,text,text,integer,integer)','EXECUTE') public_feed,
 NOT has_function_privilege('anon','public.admin_link_report_event_v1(uuid,uuid,timestamptz)','EXECUTE') link_not_public,
 has_function_privilege('authenticated','public.prepare_article_cover_v1(uuid,timestamptz,text)','EXECUTE')
 AND NOT has_function_privilege('anon','public.prepare_article_cover_v1(uuid,timestamptz,text)','EXECUTE') staff_prepare,
 has_function_privilege('authenticated','public.commit_article_cover_v1(uuid,timestamptz,text)','EXECUTE')
 AND NOT has_function_privilege('anon','public.commit_article_cover_v1(uuid,timestamptz,text)','EXECUTE') staff_commit,
 NOT has_function_privilege('anon','public.article_media_cleanup_candidates_v1()','EXECUTE')
 AND NOT has_function_privilege('authenticated','public.article_media_cleanup_candidates_v1()','EXECUTE')
 AND has_function_privilege('service_role','public.article_media_cleanup_candidates_v1()','EXECUTE') cleanup_service_only,
 (SELECT count(*)=4 FROM pg_policy WHERE polrelid='storage.objects'::regclass AND NOT polpermissive AND polname IN('rs_article_media_visibility','rs_article_media_no_insert','rs_article_media_no_update','rs_article_media_no_delete')) storage_restrictive
)
SELECT json_build_object('project_ref',current_setting('rekansiaga.release_ref',true),'scope','integrated content metadata and public feed contract',
 'status',CASE WHEN feed_contract AND reports_private AND private_media_bucket AND registry_private AND public_feed AND link_not_public AND staff_prepare AND staff_commit AND cleanup_service_only AND storage_restrictive THEN 'PASS' ELSE 'BLOCKED' END,
 'checks',row_to_json(checks)) FROM checks;
COMMIT;
