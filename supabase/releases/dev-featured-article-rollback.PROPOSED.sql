-- Explicitly reviewed rollback only. Requires frontend flag OFF and no selected featured article.
BEGIN;
DO $guard$ BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres'
 OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
 OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'rollback-dev-featured-article-v1'
 THEN RAISE EXCEPTION 'STOP: featured article rollback approval required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='articles' AND column_name='is_featured')
 THEN RAISE EXCEPTION 'STOP: featured article migration is absent'; END IF;
 IF EXISTS(SELECT 1 FROM public.articles WHERE is_featured)
 THEN RAISE EXCEPTION 'STOP: clear the selected featured article through Admin before rollback'; END IF;
END $guard$;
DROP FUNCTION public.admin_set_featured_article_v1(uuid,timestamptz);
DROP FUNCTION public.public_home_featured_article_v1();
DROP TRIGGER rs_articles_featured_audit ON public.articles;
DROP TRIGGER rs_articles_featured_guard ON public.articles;
DROP FUNCTION public.rs_articles_featured_audit_v1();
DROP FUNCTION public.rs_articles_featured_guard_v1();
DROP INDEX public.articles_one_featured_idx;
ALTER TABLE public.articles DROP CONSTRAINT articles_featured_published_check;
ALTER TABLE public.articles DROP COLUMN is_featured;
COMMIT;
