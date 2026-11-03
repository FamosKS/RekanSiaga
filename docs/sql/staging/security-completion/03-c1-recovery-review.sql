-- READ ONLY: no automatic inverse which would reopen broad defaults.
-- Stop new object provisioning; keep C1. Explicit least-privilege object grants
-- require object-specific review/approval. Existing objects are not repaired by
-- restoring defaults. C2/storage defaults remain separate risks.
BEGIN TRANSACTION READ ONLY;
SELECT pg_get_userbyid(defaclrole) AS creator,defaclnamespace::regnamespace AS schema,
 defaclobjtype,defaclacl FROM pg_default_acl ORDER BY 1,2,3;
ROLLBACK;
