BEGIN;
DO $guard$
BEGIN
 IF current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
 OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'rollback-dev-sos-relay-v1'
 THEN RAISE EXCEPTION 'STOP: explicit scoped SOS rollback approval required'; END IF;
 IF EXISTS(SELECT 1 FROM public.sos_requests WHERE retention_until>now()) THEN
   RAISE EXCEPTION 'STOP: active SOS records exist; preserve records and use feature flags instead of destructive rollback';
 END IF;
END $guard$;
DROP FUNCTION public.sos_consume_quota_v1(text,integer);
DROP FUNCTION public.sos_admin_update_v1(uuid,timestamptz,text,text);
DROP FUNCTION public.sos_admin_detail_v1(uuid);
DROP FUNCTION public.sos_admin_list_v1();
DROP FUNCTION public.sos_track_v1(text);
DROP FUNCTION public.sos_revoke_v1(text);
DROP FUNCTION public.sos_submit_v1(text,text,jsonb);
DROP TABLE public.sos_rate_limits;
DROP TABLE public.sos_request_history;
DROP TABLE public.sos_requests;
COMMIT;
