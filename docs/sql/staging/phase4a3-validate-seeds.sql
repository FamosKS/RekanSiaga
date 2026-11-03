-- READ ONLY. Run only AFTER an approved persistent bootstrap on staging.
-- Selects only four static role codes/config counts, no user/operational rows.
BEGIN TRANSACTION READ ONLY;
WITH expected(code) AS (VALUES ('super_admin'),('information_manager'),
 ('report_verifier'),('mitigation_editor'))
SELECT e.code, count(r.id) AS matching_role_rows
FROM expected e LEFT JOIN public.roles r ON r.code=e.code GROUP BY e.code ORDER BY e.code;
SELECT count(*) AS role_rows, count(DISTINCT code) AS distinct_role_codes FROM public.roles;
SELECT count(*) AS source_config_rows FROM public.data_sources;
SELECT (SELECT count(*) FROM public.staff_profiles) AS staff_profiles_before_fixture,
       (SELECT count(*) FROM public.staff_role_assignments) AS assignments_before_fixture,
       (SELECT count(*) FROM public.public_reports) AS reports_before_fixture,
       (SELECT count(*) FROM public.report_status_history) AS history_before_fixture,
       (SELECT count(*) FROM public.report_access_tokens) AS tracking_tokens_before_fixture;
-- Expected immediately after bootstrap: 4/4 roles, 2 config sources, all five
-- fixture-related counts zero. Counts do not prove absence of private data in
-- unqueried tables; bootstrap source/target isolation must be independently reviewed.
ROLLBACK;
