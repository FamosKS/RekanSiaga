BEGIN;
DO $guard$
BEGIN
 IF current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
 OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-dev-sos-relay-v1'
 THEN RAISE EXCEPTION 'STOP: scoped SOS relay approval required for rekansiaga-dev'; END IF;
 IF to_regclass('public.staff_profiles') IS NULL OR to_regclass('public.audit_logs') IS NULL
 OR to_regprocedure('public.has_staff_role(text[])') IS NULL
 THEN RAISE EXCEPTION 'STOP: existing staff RBAC and audit prerequisites required'; END IF;
 IF to_regclass('public.sos_requests') IS NOT NULL OR to_regclass('public.sos_request_history') IS NOT NULL
 OR to_regclass('public.sos_rate_limits') IS NOT NULL
 OR to_regprocedure('public.sos_submit_v1(text,text,jsonb)') IS NOT NULL
 OR to_regprocedure('public.sos_track_v1(text)') IS NOT NULL
 THEN RAISE EXCEPTION 'STOP: SOS objects already exist; reconcile read-only before any deployment'; END IF;
END $guard$;

CREATE TABLE public.sos_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reference_code text NOT NULL UNIQUE DEFAULT ('SOS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 idempotency_hash text NOT NULL UNIQUE,
 credential_verifier text NOT NULL,
 consent_version text NOT NULL CHECK(consent_version='sos-consent-v1'),
 consent_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 credential_expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
 credential_revoked_at timestamptz,
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','seen','reviewing','closed')),
 description text NOT NULL CHECK(char_length(btrim(description)) BETWEEN 10 AND 2000),
 latitude double precision,
 longitude double precision,
 accuracy_m double precision,
 location_captured_at timestamptz,
 contact_name text,
 contact_phone text,
 battery_percent smallint,
 charging boolean,
 device_online boolean NOT NULL DEFAULT false,
 network_type text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 retention_until timestamptz NOT NULL DEFAULT now()+interval '180 days',
 CHECK((latitude IS NULL)=(longitude IS NULL)),
 CHECK(latitude IS NULL OR latitude BETWEEN -90 AND 90),
 CHECK(longitude IS NULL OR longitude BETWEEN -180 AND 180),
 CHECK(accuracy_m IS NULL OR accuracy_m BETWEEN 0 AND 100000),
 CHECK(battery_percent IS NULL OR battery_percent BETWEEN 0 AND 100),
 CHECK(contact_name IS NULL OR char_length(contact_name)<=100),
 CHECK(contact_phone IS NULL OR char_length(contact_phone)<=32),
 CHECK(network_type IS NULL OR char_length(network_type)<=40)
);
CREATE INDEX sos_requests_status_time_idx ON public.sos_requests(status,created_at DESC);
CREATE TABLE public.sos_request_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES public.sos_requests(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('received','seen','reviewing','closed')),
 note text CHECK(note IS NULL OR char_length(note)<=1000),
 actor_id uuid REFERENCES public.staff_profiles(user_id) ON DELETE SET NULL,
 changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX sos_request_history_order_idx ON public.sos_request_history(request_id,changed_at,id);
CREATE TABLE public.sos_rate_limits (
 action text NOT NULL CHECK(action IN ('submit','track')),
 bucket_start timestamptz NOT NULL,
 request_count integer NOT NULL CHECK(request_count>=0),
 PRIMARY KEY(action,bucket_start)
);
ALTER TABLE public.sos_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_request_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sos_requests,public.sos_request_history,public.sos_rate_limits FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.sos_requests,public.sos_request_history TO authenticated;
CREATE POLICY sos_requests_staff_read ON public.sos_requests FOR SELECT TO authenticated
 USING(public.has_staff_role(ARRAY['super_admin','report_verifier']));
CREATE POLICY sos_history_staff_read ON public.sos_request_history FOR SELECT TO authenticated
 USING(public.has_staff_role(ARRAY['super_admin','report_verifier']));

CREATE FUNCTION public.sos_submit_v1(p_idempotency_hash text,p_credential_verifier text,p_payload jsonb)
RETURNS TABLE(reference_code text,received_at timestamptz,status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v public.sos_requests%ROWTYPE;
BEGIN
 IF char_length(p_idempotency_hash)<>64 OR char_length(p_credential_verifier)<>64
 OR jsonb_typeof(p_payload)<>'object' OR char_length(coalesce(p_payload->>'description','')) NOT BETWEEN 10 AND 2000
 THEN RAISE EXCEPTION 'invalid request' USING ERRCODE='22023'; END IF;
 INSERT INTO public.sos_requests(idempotency_hash,credential_verifier,consent_version,description,latitude,longitude,accuracy_m,location_captured_at,contact_name,contact_phone,battery_percent,charging,device_online,network_type)
 VALUES(p_idempotency_hash,p_credential_verifier,coalesce(p_payload->>'consent_version',''),btrim(p_payload->>'description'),nullif(p_payload->>'latitude','')::double precision,nullif(p_payload->>'longitude','')::double precision,nullif(p_payload->>'accuracy_m','')::double precision,nullif(p_payload->>'location_captured_at','')::timestamptz,nullif(btrim(p_payload->>'contact_name'),''),nullif(btrim(p_payload->>'contact_phone'),''),nullif(p_payload->>'battery_percent','')::smallint,nullif(p_payload->>'charging','')::boolean,coalesce((p_payload->>'online')::boolean,false),nullif(p_payload->>'network_type',''))
 ON CONFLICT(idempotency_hash) DO NOTHING;
 SELECT * INTO v FROM public.sos_requests r WHERE r.idempotency_hash=p_idempotency_hash FOR UPDATE;
 IF v.credential_verifier<>p_credential_verifier THEN RAISE EXCEPTION 'invalid request' USING ERRCODE='22023'; END IF;
 IF v.status='received' AND NOT EXISTS(SELECT 1 FROM public.sos_request_history h WHERE h.request_id=v.id) THEN
   INSERT INTO public.sos_request_history(request_id,status) VALUES(v.id,'received');
 END IF;
 RETURN QUERY SELECT v.reference_code,v.created_at,v.status;
END $fn$;
REVOKE ALL ON FUNCTION public.sos_submit_v1(text,text,jsonb) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.sos_track_v1(p_credential_verifier text)
RETURNS TABLE(reference_code text,status text,received_at timestamptz,updated_at timestamptz,history jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT r.reference_code,r.status,r.created_at,r.updated_at,
  coalesce((SELECT jsonb_agg(jsonb_build_object('status',h.status,'changed_at',h.changed_at) ORDER BY h.changed_at,h.id) FROM public.sos_request_history h WHERE h.request_id=r.id),'[]'::jsonb)
 FROM public.sos_requests r WHERE r.credential_verifier=p_credential_verifier
 AND r.credential_revoked_at IS NULL AND r.credential_expires_at>now();
$fn$;
REVOKE ALL ON FUNCTION public.sos_track_v1(text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.sos_revoke_v1(p_credential_verifier text)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path='' AS $fn$
 WITH revoked AS (UPDATE public.sos_requests SET credential_revoked_at=clock_timestamp(),updated_at=clock_timestamp()
  WHERE credential_verifier=p_credential_verifier AND credential_revoked_at IS NULL RETURNING id)
 SELECT EXISTS(SELECT 1 FROM revoked);
$fn$;
REVOKE ALL ON FUNCTION public.sos_revoke_v1(text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.sos_admin_list_v1()
RETURNS TABLE(id uuid,reference_code text,status text,received_at timestamptz,updated_at timestamptz,latitude double precision,longitude double precision,accuracy_m double precision,description text,contact_name text,contact_phone text,battery_percent smallint,charging boolean,device_online boolean,network_type text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT r.id,r.reference_code,r.status,r.created_at,r.updated_at,r.latitude,r.longitude,r.accuracy_m,r.description,r.contact_name,r.contact_phone,r.battery_percent,r.charging,r.device_online,r.network_type
 FROM public.sos_requests r WHERE public.has_staff_role(ARRAY['super_admin','report_verifier']) AND r.retention_until>now()
 ORDER BY r.created_at DESC LIMIT 100;
$fn$;
REVOKE ALL ON FUNCTION public.sos_admin_list_v1() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sos_admin_list_v1() TO authenticated;

CREATE FUNCTION public.sos_admin_detail_v1(p_request_id uuid)
RETURNS TABLE(id uuid,reference_code text,status text,received_at timestamptz,updated_at timestamptz,latitude double precision,longitude double precision,accuracy_m double precision,description text,contact_name text,contact_phone text,battery_percent smallint,charging boolean,device_online boolean,network_type text,history jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT r.id,r.reference_code,r.status,r.created_at,r.updated_at,r.latitude,r.longitude,r.accuracy_m,r.description,r.contact_name,r.contact_phone,r.battery_percent,r.charging,r.device_online,r.network_type,
  coalesce((SELECT jsonb_agg(jsonb_build_object('status',h.status,'note',h.note,'changed_at',h.changed_at) ORDER BY h.changed_at,h.id) FROM public.sos_request_history h WHERE h.request_id=r.id),'[]'::jsonb)
 FROM public.sos_requests r WHERE r.id=p_request_id AND r.retention_until>now() AND public.has_staff_role(ARRAY['super_admin','report_verifier']);
$fn$;
REVOKE ALL ON FUNCTION public.sos_admin_detail_v1(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sos_admin_detail_v1(uuid) TO authenticated;

CREATE FUNCTION public.sos_admin_update_v1(p_request_id uuid,p_expected_updated_at timestamptz,p_status text,p_note text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v public.sos_requests%ROWTYPE; v_now timestamptz:=clock_timestamp();
BEGIN
 IF NOT public.has_staff_role(ARRAY['super_admin','report_verifier']) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF p_status NOT IN ('received','seen','reviewing','closed') OR (p_note IS NOT NULL AND (char_length(btrim(p_note)) NOT BETWEEN 1 AND 1000)) THEN RAISE EXCEPTION 'invalid request' USING ERRCODE='22023'; END IF;
 SELECT * INTO v FROM public.sos_requests r WHERE r.id=p_request_id FOR UPDATE;
 IF NOT FOUND OR v.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'conflict' USING ERRCODE='40001'; END IF;
 IF v.status='closed' AND p_status<>'closed' THEN RAISE EXCEPTION 'closed request cannot reopen' USING ERRCODE='22023'; END IF;
 IF array_position(ARRAY['received','seen','reviewing','closed']::text[],p_status)
   < array_position(ARRAY['received','seen','reviewing','closed']::text[],v.status)
 THEN RAISE EXCEPTION 'invalid status transition' USING ERRCODE='22023'; END IF;
 UPDATE public.sos_requests SET status=p_status,updated_at=v_now WHERE id=p_request_id;
 INSERT INTO public.sos_request_history(request_id,status,note,actor_id,changed_at) VALUES(p_request_id,p_status,nullif(btrim(p_note),''),auth.uid(),v_now);
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,old_values,new_values)
 VALUES(auth.uid(),'UPDATE','sos_requests',p_request_id,jsonb_build_object('status',v.status),jsonb_build_object('status',p_status));
 RETURN v_now;
END $fn$;
REVOKE ALL ON FUNCTION public.sos_admin_update_v1(uuid,timestamptz,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sos_admin_update_v1(uuid,timestamptz,text,text) TO authenticated;

-- Durable global quotas, fail-closed if a transaction cannot take its quota slot.
CREATE FUNCTION public.sos_consume_quota_v1(p_action text,p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_slot timestamptz:=date_trunc('minute',clock_timestamp()); v_count integer;
BEGIN
 IF p_action NOT IN ('submit','track') OR p_limit NOT BETWEEN 1 AND 300 THEN RETURN false; END IF;
 DELETE FROM public.sos_rate_limits WHERE bucket_start < date_trunc('minute',clock_timestamp())-interval '1 day';
 INSERT INTO public.sos_rate_limits(action,bucket_start,request_count) VALUES(p_action,v_slot,1)
 ON CONFLICT(action,bucket_start) DO UPDATE SET request_count=public.sos_rate_limits.request_count+1
 RETURNING request_count INTO v_count;
 RETURN v_count<=p_limit;
END $fn$;
REVOKE ALL ON FUNCTION public.sos_consume_quota_v1(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sos_submit_v1(text,text,jsonb),public.sos_track_v1(text),public.sos_revoke_v1(text),public.sos_consume_quota_v1(text,integer) TO service_role;

DO $post$
BEGIN
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.sos_requests'::regclass)
 OR has_table_privilege('anon','public.sos_requests','SELECT')
 OR has_table_privilege('anon','public.sos_request_history','SELECT')
 OR has_function_privilege('anon','public.sos_admin_list_v1()','EXECUTE')
 OR NOT has_function_privilege('service_role','public.sos_submit_v1(text,text,jsonb)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.sos_track_v1(text)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.sos_revoke_v1(text)','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.sos_admin_update_v1(uuid,timestamptz,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'STOP: SOS relay postflight invariant failed'; END IF;
END $post$;
COMMIT;
