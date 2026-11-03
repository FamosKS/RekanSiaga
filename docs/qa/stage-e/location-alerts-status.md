# Location-based disaster alerts ? QA checkpoint (3 November 2026)

## Current status

| Area | Status | Evidence / boundary |
|---|---|---|
| Modal and responsive content | PASS LOCAL / BROWSER NOT RUN | Dialog, source/time, conditional ETA and verified route, safe fallback, detail link, and alert list are implemented. Visual/accessibility browser check remains undone. |
| Location relevance | PASS LOCAL | Manual district preference; RPC contract matches exact district or a parent region. No GPS or arbitrary radius is used. |
| Data source and database | DEPLOYED / POSTFLIGHT PASS BY OPERATOR EVIDENCE | Operator terminal screenshot reports read-only baseline and location-alert SQL postflight PASS on rekansiaga-dev. No TEST or real alert row has been created. |
| Admin | BACKEND DEPLOYED / LIVE CRUD NOT TESTED | RLS/RBAC and audit are in the deployed package per postflight. Frontend flags are still OFF; no live alert write was performed. |
| Monitoring | PASS LOCAL / NEEDS FRONTEND ACTIVATION + LIVE | Same reader panel exists on `/pemantauan`; still needs local flag activation and browser acceptance. |
| Map | PARTIAL / NEEDS FRONTEND ACTIVATION + LIVE | Same reader panel exists on `/peta`. No alert polygon/centroid/marker is drawn because no approved impact geometry exists. Existing verified event coordinates are unchanged. |
| Synchronization | PASS LOCAL / NEEDS LIVE | React Query focus/reconnect and 20-second visible polling, expiry and ID+version dedupe are implemented. No browser/cross-client check. |
| Flutter | CONTRACT READY / RUNTIME NOT TESTED | `docs/mobile-content-contract.md` documents DTO/RPC; Flutter source/runtime is untouched. |
| Push | OUT OF SCOPE / NOT PROVEN | Queue is not delivery. No provider, subscription, or receipt test. |

## Local evidence

`docs/qa/stage-e/location-alerts-local.json` contains 8/8 PASS PGlite/policy checks: matching parent/child regions, rejection of sibling/expired/revoked/unresolved alerts, anon reader versus private-table boundary, official-source role restriction, audit/version updates, feature flag and RPC contract, priority/deduplication/route policy. `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run typecheck:edge`, and deployment script PowerShell parsing passed. Build retains the existing >500 kB JS chunk warning. These are local checks, not live acceptance.

## Cloud deployment record

The operator's terminal output shows `Read-only baseline passed` and `Location-alert SQL postflight PASS on rekansiaga-dev`. The runner postflight verifies alert-table RLS, anonymous direct table SELECT denied, public reader function present and callable by anon, and audit trigger. The output also confirms no Edge Function, secret, push service, or application data changed. This package is SQL/RPC-only; no Edge Function is required. Deployment status is PASS by operator evidence, not an independent agent-side Cloud probe.

No alert data was created. Both flags were OFF in the deployment output. After setting them locally, browser checks still need to happen; creating one TEST event and alert requires separate data-test approval.

## Next actions

1. Set `VITE_LOCATION_ALERTS_ENABLED=true` and `VITE_DEV_ALERT_WRITES_ENABLED=true` locally only when ready to expose the alert UI to authorized Admins, then restart Vite. Server RLS/RBAC remains authoritative.
2. Before creating any TEST event/alert, get the separate data-test approval required by the operator scope.
3. With approval, use one clearly marked TEST event and one TEST alert; verify modal, `/pemantauan`, `/peta`, role denial, audit, expiry/revoke, deduplication, and logical revoke cleanup. Do not physically delete data.
4. Do not claim LIVE feature acceptance until these browser observations are recorded.

Runbook: `docs/runbooks/location-alerts-v1.md`.

## Deployment recheck — 3 November 2026

The operator reconfirmed the same deployment scope. The latest redundant agent-side runner stopped at the native psql password prompt before preflight, with no SQL or Cloud changes. Existing operator postflight PASS remains the deployment evidence. Continue with local flag activation and browser acceptance; do not rerun deployment.
