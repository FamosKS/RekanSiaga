SELECT jsonb_build_object(
 'status',CASE WHEN c.relrowsecurity AND NOT has_table_privilege('anon','public.disaster_alerts','SELECT')
   AND has_function_privilege('anon','public.public_active_disaster_alerts_v1(uuid)','EXECUTE') THEN 'PASS' ELSE 'FAIL' END,
 'rls_enabled',c.relrowsecurity,
 'anonymous_table_select',has_table_privilege('anon','public.disaster_alerts','SELECT'),
 'public_reader',to_regprocedure('public.public_active_disaster_alerts_v1(uuid)') IS NOT NULL,
 'audit_trigger',EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.disaster_alerts'::regclass AND tgname='disaster_alerts_audit_v1' AND NOT tgisinternal),
 'active_alert_count', (SELECT count(*) FROM public.disaster_alerts WHERE status='active'),
 'public_reader_anon_execute',has_function_privilege('anon','public.public_active_disaster_alerts_v1(uuid)','EXECUTE')
) AS location_alerts_postflight
FROM pg_class c WHERE c.oid='public.disaster_alerts'::regclass;
