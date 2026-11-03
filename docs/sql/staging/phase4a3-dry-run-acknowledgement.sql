-- FRAGMENT ONLY, NOT A STANDALONE SCRIPT. NOT EXECUTED BY CODEX.
-- Insert these FOUR SET LOCAL statements immediately AFTER BEGIN; and BEFORE
-- DO $staging_guard$ in the complete phase4a3-bootstrap-review.sql query.
-- Verify Dashboard rekansiaga-staging project reference first; use a fresh,
-- trusted SQL Editor session without temporary objects/concurrent DDL.
-- Evidence: docs/audits/phase4a3-existing-event-trigger-review.json
-- Snapshot: 2026-10-22T16:09:45.102203+00:00; full static review documented in
-- docs/phase4a3-event-trigger-final-review.md. PASS for controlled dry-run only.
-- These are snapshot hashes, not credentials, project identity, or API proof.
SET LOCAL rekansiaga.staging_target = 'rekansiaga-staging-confirmed-by-operator';
SET LOCAL rekansiaga.rls_auto_enable_behavior_review = 'approved-for-staging-ddl';
SET LOCAL rekansiaga.reviewed_rls_auto_enable_definition_md5 = '846ec2fbff751d24b890656d63c3a9bf';
SET LOCAL rekansiaga.reviewed_rls_event_graph_md5 = '7fe832217540802b68d6d56c6ba30f47';
-- Keep the complete bootstrap's final ROLLBACK; unchanged. Do not execute this
-- fragment in a separate request: SET LOCAL must share the bootstrap transaction.
-- Drift means STOP/re-inspect/review, never auto-update hashes to bypass checks.
