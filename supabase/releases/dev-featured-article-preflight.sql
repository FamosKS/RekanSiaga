-- Read-only preflight. Run in SQL Editor on rekansiaga-dev; output contains booleans only.
SELECT jsonb_build_object(
 'project_ref',current_setting('rekansiaga.release_ref',true),
 'current_user',current_user,
 'session_user',session_user,
 'articles_exists',to_regclass('public.articles') IS NOT NULL,
 'articles_rls_enabled',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.articles')),false),
 'published_only_policy_exists',EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='articles' AND policyname='articles_public_read'
   AND roles @> ARRAY['anon'::name,'authenticated'::name]
   AND regexp_replace(lower(qual),'[()[:space:]]','','g')='publication_status=''published''::textandpublished_atisnotnull'),
 'audit_logs_exists',to_regclass('public.audit_logs') IS NOT NULL,
 'staff_role_rpc_exists',to_regprocedure('public.has_staff_role(text[])') IS NOT NULL,
 'feature_column_exists',EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='articles' AND column_name='is_featured'),
 'feature_rpcs_absent',to_regprocedure('public.admin_set_featured_article_v1(uuid,timestamptz)') IS NULL AND to_regprocedure('public.public_home_featured_article_v1()') IS NULL
) AS featured_article_preflight;
