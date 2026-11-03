BEGIN;
DO $$
BEGIN
 IF current_setting('rekansiaga.release_ref', true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh'
    OR current_setting('rekansiaga.release_approval', true) IS DISTINCT FROM 'rollback-dev-location-alerts-v1' THEN
   RAISE EXCEPTION 'STOP: rollback requires explicit scope approval for rekansiaga-dev';
 END IF;
 IF to_regclass('public.disaster_alerts') IS NULL OR to_regprocedure('public.public_active_disaster_alerts_v1(uuid)') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.disaster_alerts'::regclass AND relrowsecurity) THEN
   RAISE EXCEPTION 'STOP: expected alert schema is absent or differs; no rollback performed';
 END IF;
END $$;
-- Non-destructive rollback: stop clients and staff from using the new feature without deleting rows/audit history.
REVOKE ALL ON FUNCTION public.public_active_disaster_alerts_v1(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON TABLE public.disaster_alerts FROM PUBLIC,anon,authenticated;
COMMIT;
