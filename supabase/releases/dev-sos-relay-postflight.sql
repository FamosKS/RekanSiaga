SELECT json_build_object(
 'project_ref',current_setting('rekansiaga.release_ref',true),
 'current_user',current_user,'session_user',session_user,
 'requests_rls',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.sos_requests')),false),
 'history_rls',coalesce((SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.sos_request_history')),false),
 'anon_select_denied',NOT has_table_privilege('anon','public.sos_requests','SELECT') AND NOT has_table_privilege('anon','public.sos_request_history','SELECT'),
 'public_submit_denied',NOT has_function_privilege('anon','public.sos_submit_v1(text,text,jsonb)','EXECUTE'),
 'service_submit_allowed',has_function_privilege('service_role','public.sos_submit_v1(text,text,jsonb)','EXECUTE'),
 'public_track_denied',NOT has_function_privilege('anon','public.sos_track_v1(text)','EXECUTE'),
 'public_revoke_denied',NOT has_function_privilege('anon','public.sos_revoke_v1(text)','EXECUTE'),
 'service_revoke_allowed',has_function_privilege('service_role','public.sos_revoke_v1(text)','EXECUTE'),
 'admin_update_allowed',has_function_privilege('authenticated','public.sos_admin_update_v1(uuid,timestamptz,text,text)','EXECUTE'),
 'staff_role_guard',to_regprocedure('public.has_staff_role(text[])') IS NOT NULL
) AS sos_relay_postflight;
