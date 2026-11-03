-- READ ONLY. Run in the rekansiaga-dev SQL editor or psql.
-- Returns metadata booleans only; no data payload and no mutation.
SELECT jsonb_build_object(
  'current_user', current_user,
  'session_user', session_user,
  'owner_can_bypassrls', COALESCE((SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user),false),
  'session_user', session_user,
  'has_staff_role', to_regprocedure('public.has_staff_role(text[])') IS NOT NULL,
  'public_reports_rls', EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = to_regclass('public.public_reports') AND relrowsecurity
  ),
  'articles_rls', EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = to_regclass('public.articles') AND relrowsecurity
  ),
  'disaster_events_rls', EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = to_regclass('public.disaster_events') AND relrowsecurity
  ),
  'feed_already_present', to_regprocedure(
    'public.public_event_feed_v1(text,text,text,text,text,integer,integer)'
  ) IS NOT NULL,
  'article_media_bucket_already_present', EXISTS(SELECT 1 FROM storage.buckets WHERE id='article-media'),
  'media_registry_already_present',
    to_regclass('public.article_media_assets') IS NOT NULL
) AS integrated_content_preflight;
