-- Focused read-only postflight. Run after the approved migration.
SELECT jsonb_build_object(
 'status',CASE WHEN current_setting('rekansiaga.release_ref',true)='uiuiouosblyuqgnvfpeh'
  AND EXISTS(SELECT 1 FROM pg_class WHERE oid='public.articles'::regclass AND relrowsecurity)
  AND EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='articles' AND policyname='articles_public_read'
   AND roles @> ARRAY['anon'::name,'authenticated'::name]
   AND regexp_replace(lower(qual),'[()[:space:]]','','g')='publication_status=''published''::textandpublished_atisnotnull')
  AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='articles' AND column_name='is_featured' AND is_nullable='NO' AND column_default='false')
  AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.articles'::regclass AND conname='articles_featured_published_check')
  AND to_regclass('public.articles_one_featured_idx') IS NOT NULL
  AND to_regprocedure('public.admin_set_featured_article_v1(uuid,timestamptz)') IS NOT NULL
  AND to_regprocedure('public.public_home_featured_article_v1()') IS NOT NULL
  AND NOT has_function_privilege('anon','public.admin_set_featured_article_v1(uuid,timestamptz)','EXECUTE')
  AND NOT has_function_privilege('service_role','public.admin_set_featured_article_v1(uuid,timestamptz)','EXECUTE')
  AND has_function_privilege('authenticated','public.admin_set_featured_article_v1(uuid,timestamptz)','EXECUTE')
  AND has_function_privilege('anon','public.public_home_featured_article_v1()','EXECUTE')
  AND has_function_privilege('authenticated','public.public_home_featured_article_v1()','EXECUTE')
  THEN 'PASS' ELSE 'FAIL' END,
 'project_ref',current_setting('rekansiaga.release_ref',true),
 'articles_rls_enabled',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.articles')),false),
 'featured_rows',coalesce((SELECT count(*) FROM public.articles WHERE is_featured),0),
 'unique_feature_index',to_regclass('public.articles_one_featured_idx') IS NOT NULL
) AS featured_article_postflight;
