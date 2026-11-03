-- FOLLOW-UP READ-ONLY EVIDENCE. NOT EXECUTED BY CODEX.
-- Run privately as owner in SQL Editor. Inspect definitions for embedded secrets
-- before sharing; do not paste credentials or tokens. This query reads function
-- definitions and does NOT CALL any application function or change data.
BEGIN TRANSACTION READ ONLY;
SELECT n.nspname, p.proname,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef AS security_definer,
       md5(p.prosrc) AS body_fingerprint,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname IN ('has_staff_role','review_public_report',
    'submit_public_report','track_public_report','set_updated_at')
ORDER BY p.proname, p.oid;
ROLLBACK;
