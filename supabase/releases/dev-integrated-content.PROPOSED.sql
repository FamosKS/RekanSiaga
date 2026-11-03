-- NOT EXECUTED. Explicit operator approval; fixed dev project only.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $guard$ BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres'
 OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
 OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-dev-integrated-content-v1'
 THEN RAISE EXCEPTION 'STOP: approved integrated dev content package required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=current_user AND (rolsuper OR rolbypassrls)) THEN RAISE EXCEPTION 'STOP: reviewed definer owner must support FORCE RLS helpers'; END IF;
 PERFORM pg_advisory_xact_lock(50426,9);
 IF to_regprocedure('public.has_staff_role(text[])') IS NULL
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.public_reports') AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.articles') AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.disaster_events') AND relrowsecurity)
 THEN RAISE EXCEPTION 'STOP: existing private RLS/role contract required'; END IF;
 IF to_regprocedure('public.public_event_feed_v1(text,text,text,text,text,integer,integer)') IS NOT NULL
 OR to_regclass('public.article_media_assets') IS NOT NULL THEN
 RAISE EXCEPTION 'STOP: package already present; reconcile before retry'; END IF;
END $guard$;

-- Public projection of curated events, never anonymous report rows/coordinates.
CREATE FUNCTION public.public_event_feed_v1(p_region_code text DEFAULT '',p_kind text DEFAULT '',p_status text DEFAULT '',p_search text DEFAULT '',p_sort text DEFAULT 'updated',p_page integer DEFAULT 1,p_page_size integer DEFAULT 12)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $feed$
DECLARE result jsonb;
BEGIN
 IF p_region_code IS NULL OR (p_region_code<>'' AND p_region_code !~ '^[0-9]{2}(\.[0-9]{2}){0,2}(\.[0-9]{4})?$')
 OR p_status IS NULL OR p_status NOT IN ('','unknown','ongoing','resolved')
 OR p_sort IS NULL OR p_sort NOT IN ('updated','occurred') OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 1000000
 OR p_page_size IS NULL OR p_page_size NOT BETWEEN 1 AND 100 OR p_search IS NULL OR length(p_search)>120
 OR p_kind IS NULL OR length(p_kind)>50 THEN RAISE EXCEPTION 'Invalid public feed input' USING ERRCODE='22023'; END IF;
 WITH eligible AS MATERIALIZED (
 SELECT e.*,r.name region_name,r.code region_code,s.name source_name,s.source_type,s.official_url,
 greatest(e.updated_at,e.source_updated_at,(SELECT max(u.recorded_at) FROM public.event_updates u WHERE u.event_id=e.id)) last_changed
 FROM public.disaster_events e LEFT JOIN public.regions r ON r.id=e.region_id
 LEFT JOIN public.data_sources s ON s.id=e.source_id AND s.is_active
 WHERE e.published_at IS NOT NULL AND e.verification_status IN ('source_confirmed','staff_verified')
 AND (p_region_code='' OR r.code=p_region_code OR starts_with(r.code,p_region_code||'.') OR EXISTS(
 SELECT 1 FROM public.event_locations l JOIN public.regions lr ON lr.id=l.region_id
 WHERE l.event_id=e.id AND (lr.code=p_region_code OR starts_with(lr.code,p_region_code||'.'))))
 AND (p_kind='' OR e.disaster_type=p_kind) AND (p_status='' OR e.event_status=p_status)
 AND (p_search='' OR strpos(lower(e.title),lower(p_search))>0)
 ), page_rows AS (
 SELECT * FROM eligible ORDER BY CASE WHEN p_sort='occurred' THEN occurred_at ELSE last_changed END DESC NULLS LAST,id
 LIMIT p_page_size OFFSET (p_page-1)::bigint*p_page_size
 )
 SELECT jsonb_build_object('total',(SELECT count(*) FROM eligible),
 'kinds',(SELECT coalesce(jsonb_agg(DISTINCT disaster_type ORDER BY disaster_type),'[]'::jsonb) FROM public.disaster_events WHERE published_at IS NOT NULL AND verification_status IN ('source_confirmed','staff_verified')),
 'regions_count',(SELECT count(DISTINCT rid) FROM (SELECT region_id rid FROM eligible UNION SELECT l.region_id FROM public.event_locations l JOIN eligible e ON e.id=l.event_id) region_ids),
 'updated_at',(SELECT max(last_changed) FROM eligible),
 'items',coalesce((SELECT jsonb_agg(jsonb_build_object(
 'id',e.id,'title',e.title,'description',e.description,'disaster_type',e.disaster_type,
 'event_status',e.event_status,'verification_status',e.verification_status,
 'occurred_at',e.occurred_at,'source_updated_at',e.source_updated_at,'updated_at',e.last_changed,
 'regions',CASE WHEN e.region_name IS NULL THEN NULL ELSE jsonb_build_object('name',e.region_name,'code',e.region_code) END,
 'data_sources',CASE WHEN e.source_name IS NULL THEN NULL ELSE jsonb_build_object('name',e.source_name,'source_type',e.source_type,'official_url',e.official_url) END,
 'event_updates','[]'::jsonb,
 'event_locations',coalesce((SELECT jsonb_agg(jsonb_build_object('id',l.id,'label',l.label,'coordinates',extensions.st_astext(l.coordinates),'is_primary',l.is_primary) ORDER BY l.is_primary DESC,l.id) FROM public.event_locations l WHERE l.event_id=e.id),'[]'::jsonb)
 ) ORDER BY CASE WHEN p_sort='occurred' THEN e.occurred_at ELSE e.last_changed END DESC NULLS LAST,e.id) FROM page_rows e),'[]'::jsonb)) INTO result;
 RETURN result;
END $feed$;
REVOKE ALL ON FUNCTION public.public_event_feed_v1(text,text,text,text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_event_feed_v1(text,text,text,text,text,integer,integer) TO anon,authenticated;

-- Retain the old map DTO if deployed, but stop deriving public coordinates
-- from private reports. Known 6/7-column contracts only; never DROP blindly.
DO $legacy_map$
DECLARE target oid:=to_regprocedure('public.list_public_verified_report_map()'); names text[]; extra text; result_type text;
BEGIN
 IF target IS NOT NULL THEN
  SELECT proargnames,pg_get_function_result(oid) INTO names,result_type FROM pg_proc WHERE oid=target;
  IF names=ARRAY['id','report_type','title','region_name','coordinates','updated_at'] THEN extra:='';
  ELSIF names=ARRAY['id','report_type','title','region_name','coordinates','public_photo_path','updated_at'] THEN extra:=',NULL::text';
  ELSE RAISE EXCEPTION 'STOP: unknown legacy map DTO; reconcile before deployment'; END IF;
  EXECUTE format('CREATE OR REPLACE FUNCTION public.list_public_verified_report_map() RETURNS %s LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $body$
   SELECT encode(sha256(convert_to(''event:''||e.id::text,''UTF8'')),''hex''),e.disaster_type,e.title,r.name,extensions.st_astext(l.coordinates)%s,e.updated_at
   FROM public.disaster_events e LEFT JOIN public.regions r ON r.id=e.region_id
   JOIN LATERAL(SELECT coordinates FROM public.event_locations WHERE event_id=e.id AND coordinates IS NOT NULL ORDER BY is_primary DESC,id LIMIT 1) l ON true
   WHERE e.published_at IS NOT NULL AND e.verification_status IN (''source_confirmed'',''staff_verified'')
   ORDER BY e.updated_at DESC,e.id LIMIT 500 $body$',result_type,extra);
 END IF;
END $legacy_map$;

-- Make location/update changes visible in event timestamps and existing audit.
CREATE FUNCTION public.touch_event_content_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $touch$
BEGIN
 IF TG_OP<>'DELETE' THEN UPDATE public.disaster_events SET updated_at=now() WHERE id=NEW.event_id; END IF;
 IF TG_OP='DELETE' THEN UPDATE public.disaster_events SET updated_at=now() WHERE id=OLD.event_id;
 ELSIF TG_OP='UPDATE' AND OLD.event_id IS DISTINCT FROM NEW.event_id THEN UPDATE public.disaster_events SET updated_at=now() WHERE id=OLD.event_id; END IF;
 RETURN NULL;
END $touch$;
REVOKE ALL ON FUNCTION public.touch_event_content_v1() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER rs_event_locations_touch AFTER INSERT OR UPDATE OR DELETE ON public.event_locations FOR EACH ROW EXECUTE FUNCTION public.touch_event_content_v1();
CREATE TRIGGER rs_event_updates_touch AFTER INSERT OR UPDATE OR DELETE ON public.event_updates FOR EACH ROW EXECUTE FUNCTION public.touch_event_content_v1();

-- Existing FK, no report copying or automatic event creation/publication.
CREATE FUNCTION public.admin_link_report_event_v1(p_report_id uuid,p_event_id uuid,p_expected_updated_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $link$
DECLARE row_report public.public_reports%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN
 RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO row_report FROM public.public_reports WHERE id=p_report_id FOR UPDATE;
 IF NOT FOUND OR row_report.status<>'verified' THEN RAISE EXCEPTION 'Ineligible report' USING ERRCODE='22023'; END IF;
 IF row_report.event_id IS NOT DISTINCT FROM p_event_id THEN RETURN true; END IF;
 IF row_report.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 IF p_event_id IS NOT NULL THEN PERFORM id FROM public.disaster_events WHERE id=p_event_id FOR KEY SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing event' USING ERRCODE='23503'; END IF; END IF;
 UPDATE public.public_reports SET event_id=p_event_id WHERE id=p_report_id;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,old_values,new_values)
 VALUES(auth.uid(),'LINK_EVENT','public_reports',p_report_id,jsonb_build_object('event_id',row_report.event_id),jsonb_build_object('event_id',p_event_id));
 -- Existing generic report audit also remains active.
 RETURN true;
END $link$;
REVOKE ALL ON FUNCTION public.admin_link_report_event_v1(uuid,uuid,timestamptz) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_link_report_event_v1(uuid,uuid,timestamptz) TO authenticated;

-- New bucket must be private; refuse an unexpected existing bucket/config.
DO $bucket$ BEGIN
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='article-media') THEN RAISE EXCEPTION 'STOP: article media bucket exists; reconcile'; END IF;
END $bucket$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('article-media','article-media',false,5242880,ARRAY['image/png']);
CREATE TABLE public.article_media_assets (
 storage_path text PRIMARY KEY,article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE RESTRICT,
 created_by uuid NOT NULL REFERENCES auth.users(id),state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','attached')),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.article_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_media_assets FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.article_media_assets FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.article_media_assets TO service_role;
-- Public can sign/read only the CURRENT cover of a published article.
CREATE POLICY rs_article_media_read ON storage.objects FOR SELECT TO anon,authenticated USING(
 bucket_id='article-media' AND (EXISTS(SELECT 1 FROM public.articles a WHERE a.cover_image_path='article-media/'||name
 AND starts_with(name,'articles/'||a.id::text||'/') AND a.publication_status='published' AND a.published_at IS NOT NULL)
 OR public.has_staff_role(ARRAY['super_admin','information_manager'])));
-- Restrictive policies keep this bucket private even if an older permissive
-- Storage policy covers other buckets. Existing buckets are unaffected.
CREATE POLICY rs_article_media_visibility ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated USING(
 bucket_id<>'article-media' OR EXISTS(SELECT 1 FROM public.articles a WHERE a.cover_image_path='article-media/'||name AND starts_with(name,'articles/'||a.id::text||'/') AND a.publication_status='published' AND a.published_at IS NOT NULL)
 OR public.has_staff_role(ARRAY['super_admin','information_manager']));
CREATE POLICY rs_article_media_no_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(bucket_id<>'article-media');
CREATE POLICY rs_article_media_no_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(bucket_id<>'article-media') WITH CHECK(bucket_id<>'article-media');
CREATE POLICY rs_article_media_no_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(bucket_id<>'article-media');
-- No browser INSERT/UPDATE/DELETE on Storage; Edge sanitizes and uploads.
CREATE FUNCTION public.prepare_article_cover_v1(p_article_id uuid,p_expected_updated_at timestamptz,p_extension text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $prepare$
DECLARE path text;
BEGIN
 IF auth.uid() IS NULL OR public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,50426));
 IF p_extension IS NULL OR p_extension<>'png' THEN RAISE EXCEPTION 'Invalid image' USING ERRCODE='22023'; END IF;
 PERFORM id FROM public.articles WHERE id=p_article_id AND updated_at=p_expected_updated_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 IF (SELECT count(*) FROM public.article_media_assets WHERE created_by=auth.uid() AND state='pending')>=10 THEN RAISE EXCEPTION 'Pending upload limit' USING ERRCODE='54000'; END IF;
 path:='articles/'||p_article_id::text||'/'||gen_random_uuid()::text||'.'||p_extension;
 INSERT INTO public.article_media_assets(storage_path,article_id,created_by) VALUES(path,p_article_id,auth.uid());
 RETURN path;
END $prepare$;
CREATE FUNCTION public.commit_article_cover_v1(p_article_id uuid,p_expected_updated_at timestamptz,p_storage_path text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $commit$
DECLARE result public.articles%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 PERFORM id FROM public.articles WHERE id=p_article_id AND updated_at=p_expected_updated_at FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Version conflict' USING ERRCODE='40001'; END IF;
 PERFORM 1 FROM public.article_media_assets m JOIN storage.objects o ON o.bucket_id='article-media' AND o.name=m.storage_path
 WHERE m.article_id=p_article_id AND m.storage_path=p_storage_path AND m.created_by=auth.uid() AND m.state='pending' FOR UPDATE OF m;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unregistered media' USING ERRCODE='22023'; END IF;
 UPDATE public.articles SET cover_image_path='article-media/'||p_storage_path WHERE id=p_article_id RETURNING * INTO result;
 UPDATE public.article_media_assets SET state='attached' WHERE storage_path=p_storage_path;
 RETURN to_jsonb(result);
END $commit$;
CREATE FUNCTION public.abort_article_cover_v1(p_storage_path text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $abort$
BEGIN
 IF auth.uid() IS NULL OR public.has_staff_role(ARRAY['super_admin','information_manager']) IS NOT TRUE THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
 DELETE FROM public.article_media_assets WHERE storage_path=p_storage_path AND created_by=auth.uid() AND state='pending'
 AND NOT EXISTS(SELECT 1 FROM public.articles WHERE cover_image_path='article-media/'||p_storage_path)
 AND NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='article-media' AND name=p_storage_path);
 RETURN FOUND;
END $abort$;
REVOKE ALL ON FUNCTION public.prepare_article_cover_v1(uuid,timestamptz,text),public.commit_article_cover_v1(uuid,timestamptz,text),public.abort_article_cover_v1(text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_article_cover_v1(uuid,timestamptz,text),public.commit_article_cover_v1(uuid,timestamptz,text),public.abort_article_cover_v1(text) TO authenticated;
-- Reconciliation inventory only, not an automatic deletion job.
CREATE FUNCTION public.article_media_cleanup_candidates_v1() RETURNS TABLE(storage_path text,article_id uuid,state text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $cleanup$
SELECT m.storage_path,m.article_id,m.state FROM public.article_media_assets m
WHERE m.created_at<now()-interval '24 hours' AND NOT EXISTS(SELECT 1 FROM public.articles a WHERE a.cover_image_path='article-media/'||m.storage_path)
$cleanup$;
REVOKE ALL ON FUNCTION public.article_media_cleanup_candidates_v1() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.article_media_cleanup_candidates_v1() TO service_role;
COMMIT;
SELECT json_build_object('status','APPLIED','project_ref','uiuiouosblyuqgnvfpeh','scope','event feed/link and private article media');
