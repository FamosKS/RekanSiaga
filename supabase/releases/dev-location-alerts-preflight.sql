DO $$
BEGIN
 IF current_setting('rekansiaga.release_ref', true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh' THEN
   RAISE EXCEPTION 'STOP: expected rekansiaga-dev project reference';
 END IF;
END $$;
SELECT jsonb_build_object(
 'project_ref', current_setting('rekansiaga.release_ref', true),
 'current_user', current_user,
 'session_user', session_user,
 'regions_exists', to_regclass('public.regions') IS NOT NULL,
 'events_exists', to_regclass('public.disaster_events') IS NOT NULL,
 'audit_exists', to_regclass('public.audit_logs') IS NOT NULL,
 'staff_role_checker_exists', to_regprocedure('public.has_staff_role(text[])') IS NOT NULL,
 'events_rls_enabled', coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.disaster_events')),false),
 'alerts_table_absent', to_regclass('public.disaster_alerts') IS NULL,
 'alerts_reader_absent', to_regprocedure('public.public_active_disaster_alerts_v1(uuid)') IS NULL
) AS location_alerts_preflight;
