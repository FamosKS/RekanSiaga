BEGIN;
DO $$
BEGIN
 IF current_setting('rekansiaga.release_ref', true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
    OR current_setting('rekansiaga.release_approval', true) IS DISTINCT FROM 'approve-dev-location-alerts-v1' THEN
   RAISE EXCEPTION 'STOP: location-alerts Cloud package requires scoped approval for rekansiaga-dev';
 END IF;
 IF to_regclass('public.regions') IS NULL OR to_regclass('public.disaster_events') IS NULL
    OR to_regclass('public.audit_logs') IS NULL OR to_regprocedure('public.has_staff_role(text[])') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.disaster_events'::regclass AND relrowsecurity) THEN
   RAISE EXCEPTION 'STOP: existing regions, event RLS, audit, and RBAC prerequisites are required';
 END IF;
 IF to_regclass('public.disaster_alerts') IS NOT NULL OR to_regprocedure('public.public_active_disaster_alerts_v1(uuid)') IS NOT NULL THEN
   RAISE EXCEPTION 'STOP: alert objects already exist; reconcile, do not replay';
 END IF;
END $$;

CREATE TABLE public.disaster_alerts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.disaster_events(id) ON DELETE RESTRICT,
 region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
 title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 5 AND 180),
 description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 10 AND 2000),
 disaster_type text NOT NULL CHECK (char_length(btrim(disaster_type)) BETWEEN 1 AND 80),
 severity text NOT NULL CHECK (severity IN ('information','watch','warning','emergency')),
 condition_summary text CHECK (condition_summary IS NULL OR char_length(condition_summary)<=500),
 issuer_kind text NOT NULL DEFAULT 'staff' CHECK (issuer_kind IN ('staff','official_source')),
 issuer_name text NOT NULL CHECK (char_length(btrim(issuer_name)) BETWEEN 2 AND 180),
 source_url text NOT NULL CHECK (source_url ~ '^https://[^[:space:]]+$'),
 starts_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 source_updated_at timestamptz,
 estimated_arrival_at timestamptz,
 action_guidance text NOT NULL CHECK (char_length(btrim(action_guidance)) BETWEEN 10 AND 2000),
 evacuation_route text,
 evacuation_source_url text,
 evacuation_verified_at timestamptz,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','revoked')),
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 created_by uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
 updated_by uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (expires_at > starts_at),
 CHECK (estimated_arrival_at IS NULL OR (estimated_arrival_at >= starts_at AND estimated_arrival_at <= expires_at)),
 CHECK ((evacuation_route IS NULL AND evacuation_source_url IS NULL AND evacuation_verified_at IS NULL)
     OR (char_length(btrim(evacuation_route)) BETWEEN 10 AND 1000 AND evacuation_source_url ~ '^https://[^[:space:]]+$' AND evacuation_verified_at IS NOT NULL))
);
CREATE INDEX disaster_alerts_active_region_idx ON public.disaster_alerts(region_id, starts_at, expires_at) WHERE status='active';
ALTER TABLE public.disaster_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.disaster_alerts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.disaster_alerts TO authenticated;
CREATE POLICY disaster_alerts_admin_all ON public.disaster_alerts FOR ALL TO authenticated
 USING (public.has_staff_role(ARRAY['super_admin','information_manager']))
 WITH CHECK (public.has_staff_role(ARRAY['super_admin','information_manager']));

CREATE FUNCTION public.rs_disaster_alerts_before_write_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.has_staff_role(ARRAY['super_admin','information_manager']) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF NEW.issuer_kind='official_source' AND NOT public.has_staff_role(ARRAY['super_admin']) THEN
   RAISE EXCEPTION 'official-source classification requires super_admin review' USING ERRCODE='42501';
 END IF;
 IF NEW.status='active' AND NOT EXISTS (
   SELECT 1 FROM public.disaster_events e WHERE e.id=NEW.event_id AND e.published_at IS NOT NULL
    AND e.verification_status IN ('source_confirmed','staff_verified') AND e.event_status<>'resolved'
 ) THEN RAISE EXCEPTION 'active alert requires a published, verified, unresolved event' USING ERRCODE='22023'; END IF;
 IF TG_OP='INSERT' THEN
   NEW.created_by=auth.uid(); NEW.updated_by=auth.uid(); NEW.version=1;
 ELSE
   NEW.created_by=OLD.created_by; NEW.updated_by=auth.uid(); NEW.version=OLD.version+1; NEW.updated_at=clock_timestamp();
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.rs_disaster_alerts_before_write_v1() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER disaster_alerts_before_write_v1 BEFORE INSERT OR UPDATE ON public.disaster_alerts
 FOR EACH ROW EXECUTE FUNCTION public.rs_disaster_alerts_before_write_v1();

CREATE FUNCTION public.rs_disaster_alerts_audit_v1() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row jsonb; new_row jsonb; alert_id uuid;
BEGIN
 old_row=CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END;
 new_row=CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END;
 alert_id=CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,old_values,new_values)
 VALUES(auth.uid(),TG_OP,'disaster_alerts',alert_id,old_row,new_row);
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION public.rs_disaster_alerts_audit_v1() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER disaster_alerts_audit_v1 AFTER INSERT OR UPDATE OR DELETE ON public.disaster_alerts
 FOR EACH ROW EXECUTE FUNCTION public.rs_disaster_alerts_audit_v1();

CREATE FUNCTION public.public_active_disaster_alerts_v1(p_region_id uuid)
RETURNS TABLE (
 id uuid,event_id uuid,title text,description text,disaster_type text,severity text,
 condition_summary text,region_name text,issuer_kind text,issuer_name text,source_url text,
 starts_at timestamptz,expires_at timestamptz,source_updated_at timestamptz,updated_at timestamptz,
 version integer,estimated_arrival_at timestamptz,action_guidance text,evacuation_route text,
 evacuation_source_url text,evacuation_verified_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH RECURSIVE ancestors(id,parent_id) AS (
   SELECT r.id,r.parent_id FROM public.regions r WHERE r.id=p_region_id
   UNION SELECT parent.id,parent.parent_id FROM public.regions parent JOIN ancestors a ON parent.id=a.parent_id
 )
 SELECT a.id,a.event_id,a.title,a.description,a.disaster_type,a.severity,a.condition_summary,
   target.name,a.issuer_kind,a.issuer_name,a.source_url,a.starts_at,a.expires_at,a.source_updated_at,
   a.updated_at,a.version,a.estimated_arrival_at,a.action_guidance,
   CASE WHEN a.evacuation_verified_at IS NOT NULL AND a.evacuation_source_url IS NOT NULL THEN a.evacuation_route END,
   CASE WHEN a.evacuation_verified_at IS NOT NULL THEN a.evacuation_source_url END,a.evacuation_verified_at
 FROM public.disaster_alerts a
 JOIN public.regions target ON target.id=a.region_id
 JOIN public.disaster_events e ON e.id=a.event_id
 WHERE p_region_id IS NOT NULL AND a.region_id IN (SELECT id FROM ancestors)
   AND a.status='active' AND a.starts_at<=now() AND a.expires_at>now()
   AND e.published_at IS NOT NULL AND e.verification_status IN ('source_confirmed','staff_verified') AND e.event_status<>'resolved'
 ORDER BY CASE a.severity WHEN 'emergency' THEN 0 WHEN 'warning' THEN 1 WHEN 'watch' THEN 2 ELSE 3 END,
   a.starts_at DESC,a.id LIMIT 20;
$$;
REVOKE ALL ON FUNCTION public.public_active_disaster_alerts_v1(uuid) FROM PUBLIC,authenticated;
GRANT EXECUTE ON FUNCTION public.public_active_disaster_alerts_v1(uuid) TO anon,authenticated;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.disaster_alerts'::regclass AND relrowsecurity)
  OR has_table_privilege('anon','public.disaster_alerts','SELECT')
  OR has_function_privilege('anon','public.public_active_disaster_alerts_v1(uuid)','EXECUTE') IS NOT TRUE
  OR has_function_privilege('authenticated','public.public_active_disaster_alerts_v1(uuid)','EXECUTE') IS NOT TRUE THEN
   RAISE EXCEPTION 'STOP: alert postflight invariant failed';
 END IF;
END $$;
COMMIT;
