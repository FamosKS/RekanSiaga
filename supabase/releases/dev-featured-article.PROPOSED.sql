-- MVP single featured article. LOCAL PROPOSAL ONLY; never run without explicit operator approval.
-- Target is rekansiaga-dev only. Does not change article rows, public RLS, Storage, or grants on tables.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres'
 OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
 OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-dev-featured-article-v1'
 THEN RAISE EXCEPTION 'STOP: featured article package approval required'; END IF;
 IF to_regclass('public.articles') IS NULL OR to_regclass('public.audit_logs') IS NULL
 OR to_regprocedure('public.has_staff_role(text[])') IS NULL
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.articles'::regclass AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='articles' AND policyname='articles_public_read'
   AND roles @> ARRAY['anon'::name,'authenticated'::name]
   AND regexp_replace(lower(qual),'[()[:space:]]','','g')='publication_status=''published''::textandpublished_atisnotnull')
 THEN RAISE EXCEPTION 'STOP: existing article, audit, and public RLS contract required'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='articles' AND column_name='is_featured')
 OR to_regprocedure('public.admin_set_featured_article_v1(uuid,timestamptz)') IS NOT NULL
 OR to_regprocedure('public.public_home_featured_article_v1()') IS NOT NULL
 OR EXISTS(SELECT 1 FROM pg_trigger WHERE tgname IN ('rs_articles_featured_guard','rs_articles_featured_audit') AND NOT tgisinternal)
 THEN RAISE EXCEPTION 'STOP: featured article objects already exist; reconcile before retry'; END IF;
END $guard$;

ALTER TABLE public.articles ADD COLUMN is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.articles ADD CONSTRAINT articles_featured_published_check
 CHECK(NOT is_featured OR (publication_status='published' AND published_at IS NOT NULL));
CREATE UNIQUE INDEX articles_one_featured_idx ON public.articles(is_featured) WHERE is_featured;

CREATE FUNCTION public.rs_articles_featured_guard_v1() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $fn$
BEGIN
 IF NEW.publication_status<>'published' OR NEW.published_at IS NULL THEN NEW.is_featured:=false; END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER rs_articles_featured_guard BEFORE INSERT OR UPDATE OF publication_status,published_at,is_featured
 ON public.articles FOR EACH ROW EXECUTE FUNCTION public.rs_articles_featured_guard_v1();

CREATE FUNCTION public.rs_articles_featured_audit_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
 IF OLD.is_featured IS DISTINCT FROM NEW.is_featured THEN
  INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,old_values,new_values)
  VALUES(auth.uid(),'SET_FEATURED','article',NEW.id,
    jsonb_build_object('is_featured',OLD.is_featured),jsonb_build_object('is_featured',NEW.is_featured));
 END IF;
 RETURN NEW;
END $fn$;
CREATE TRIGGER rs_articles_featured_audit AFTER UPDATE ON public.articles
 FOR EACH ROW WHEN (OLD.is_featured IS DISTINCT FROM NEW.is_featured)
 EXECUTE FUNCTION public.rs_articles_featured_audit_v1();

CREATE FUNCTION public.admin_set_featured_article_v1(p_article_id uuid,p_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_target public.articles%ROWTYPE; v_current public.articles%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN
  RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501';
 END IF;
 IF p_expected_updated_at IS NULL THEN RAISE EXCEPTION 'Expected version required' USING ERRCODE='22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(50426, 31);
 IF p_article_id IS NULL THEN
  SELECT * INTO v_current FROM public.articles WHERE is_featured FOR UPDATE;
  IF NOT FOUND OR v_current.updated_at IS DISTINCT FROM p_expected_updated_at THEN
   RAISE EXCEPTION 'Featured article changed; reload and retry' USING ERRCODE='40001';
  END IF;
  UPDATE public.articles SET is_featured=false WHERE id=v_current.id;
  RETURN jsonb_build_object('article_id',NULL,'is_featured',false);
 END IF;
 SELECT * INTO v_target FROM public.articles WHERE id=p_article_id FOR UPDATE;
 IF NOT FOUND OR v_target.updated_at IS DISTINCT FROM p_expected_updated_at THEN
  RAISE EXCEPTION 'Article changed; reload and retry' USING ERRCODE='40001';
 END IF;
 IF v_target.publication_status<>'published' OR v_target.published_at IS NULL THEN
  RAISE EXCEPTION 'Only published articles can be featured' USING ERRCODE='22023';
 END IF;
 UPDATE public.articles SET is_featured=false WHERE is_featured AND id<>p_article_id;
 IF NOT v_target.is_featured THEN UPDATE public.articles SET is_featured=true WHERE id=p_article_id; END IF;
 RETURN jsonb_build_object('article_id',p_article_id,'is_featured',true);
END $fn$;
REVOKE ALL ON FUNCTION public.admin_set_featured_article_v1(uuid,timestamptz) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_featured_article_v1(uuid,timestamptz) TO authenticated;

CREATE FUNCTION public.public_home_featured_article_v1()
RETURNS TABLE(id uuid,slug text,title text,summary text,cover_image_path text,published_at timestamptz,updated_at timestamptz,is_featured boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT a.id,a.slug,a.title,a.summary,a.cover_image_path,a.published_at,a.updated_at,a.is_featured
 FROM public.articles AS a
 WHERE a.publication_status='published' AND a.published_at IS NOT NULL
 ORDER BY a.is_featured DESC,a.published_at DESC,a.id ASC
 LIMIT 1
$fn$;
REVOKE ALL ON FUNCTION public.public_home_featured_article_v1() FROM PUBLIC,service_role;
GRANT EXECUTE ON FUNCTION public.public_home_featured_article_v1() TO anon,authenticated;

COMMIT;
