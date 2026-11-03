SELECT json_build_object(
 'project_ref',current_setting('rekansiaga.release_ref',true),
 'current_user',current_user,'session_user',session_user,
 'staff_rbac_exists',to_regprocedure('public.has_staff_role(text[])') IS NOT NULL,
 'audit_exists',to_regclass('public.audit_logs') IS NOT NULL,
 'staff_profiles_exists',to_regclass('public.staff_profiles') IS NOT NULL,
 'sos_objects_absent',to_regclass('public.sos_requests') IS NULL AND to_regclass('public.sos_request_history') IS NULL AND to_regclass('public.sos_rate_limits') IS NULL,
 'sos_rpcs_absent',to_regprocedure('public.sos_submit_v1(text,text,jsonb)') IS NULL AND to_regprocedure('public.sos_track_v1(text)') IS NULL AND to_regprocedure('public.sos_revoke_v1(text)') IS NULL AND to_regprocedure('public.sos_admin_update_v1(uuid,timestamptz,text,text)') IS NULL
) AS sos_relay_preflight;
