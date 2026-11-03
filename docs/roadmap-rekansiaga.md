# RekanSiaga roadmap checkpoint — 3 November 2026

## Peringatan berbasis lokasi

- [x] Inspect existing events, notification queue, map and region selector contracts.
- [x] Build disabled-by-default local alert reader/controller and Figma-inspired responsive modal.
- [x] Require manual district choice; no automatic GPS, history, arbitrary distance or fabricated map location.
- [x] Add Admin alert editor contract, active period/revoke controls, role/source constraints in proposed SQL, audit trail and limited public RPC.
- [x] Add Monitoring/Peta alert summary without making up alert geometry; document Flutter DTO.
- [x] 8 focused local PGlite/policy tests PASS.
- [x] Operator approved the one Cloud package for rekansiaga-dev.
- [x] Operator ran the guarded package; terminal screenshot confirms baseline and postflight PASS.
- [ ] Enable flags locally only after postflight, restart Vite, and run synthetic TEST event/alert acceptance including RBAC, expiration, revoke, dedupe and logical cleanup.
- [ ] Perform real-browser visual/accessibility acceptance.
- [ ] Mobile team implements and tests shared RPC/DTO; no Flutter workspace edit was made here.
- [ ] Add geographic alert overlay only after authoritative boundary/impact geometry is available and its publication is approved.
- [ ] Push notifications remain a separate project until provider, consent, pipeline and delivered receipt are tested.

### 3 November 2026 - approved package execution status

- [x] Operator approval received for the existing location-alert SQL/RPC/RLS/RBAC/audit package on rekansiaga-dev only.
- [x] Agent-side attempt stopped before DB; operator later completed deployment and provided postflight PASS evidence.
- [x] Operator ran the exact guarded command interactively; baseline and postflight PASS were reported.
- [ ] Only after postflight PASS: set `VITE_LOCATION_ALERTS_ENABLED=true` and `VITE_DEV_ALERT_WRITES_ENABLED=true`, restart Vite, then wait for separate approval before creating the TEST event/alert.


## Location-based disaster alerts - checkpoint (3 November 2026)

- [x] Local focused tests 8/8, lint, build, Edge typecheck, and guarded-runner parse passed.
- [x] Review and approve the additive alert schema/RPC/RLS/RBAC/audit package for rekansiaga-dev only.
- [x] Run guarded deployment once and verify the operator-reported postflight.
- [ ] Restart Vite and complete synthetic event/alert acceptance in a real browser, including expiry, revoke, roles, audit, version dedupe, and logical cleanup.
- [ ] Mobile team implements/tests the shared DTO; browser accessibility, GPS matching, geospatial overlay, and push delivery remain outside local PASS.

### Operator deployment update - 3 November 2026

The operator later ran the approved guarded deployment. Terminal output confirms read-only baseline PASS and SQL postflight PASS on rekansiaga-dev. This supersedes the earlier blocked-attempt status: migration/RPC/RLS/RBAC/audit are now deployed by operator evidence. No Edge Function or alert/test row was created. Remaining: activate the two local flags, obtain separate approval before making TEST rows, then perform browser acceptance. Flutter runtime, GPS matching, map impact geometry, and push delivery remain unverified/out of scope.

The operator reconfirmed the same deployment scope on 3 November. A redundant agent-side run stopped at the native password prompt before read-only preflight; no new Cloud action occurred. Existing operator postflight evidence remains authoritative. Do not redeploy; next is local flag activation and acceptance planning.

## Smart Rescue Relay SOS v1 - checkpoint 3 November 2026

- [x] Local public consent form, opt-in device data, one-time credential, safe receipt, tracking/revocation; default off.
- [x] Local Admin queue/detail/status; route limited to `super_admin` / `report_verifier`; public tracking omits private fields.
- [x] Additive Cloud package prepared: private tables, service-only submit/track/revoke, authenticated Admin RPCs, RLS/RBAC/audit, bounded quota, pre/postflight and guarded deployment/rollback.
- [x] Flutter contract documented; Flutter source unchanged.
- [ ] Readiness: parse-check PowerShell, compile on native PostgreSQL, verify PostgREST DTOs, implement verified-caller rate limiting and retention cleanup.
- [ ] Privacy review and approved internal map provider; no third party currently receives coordinates.
- [ ] Explicitly approve exact dev Cloud package/secrets; deploy once and confirm postflight. No staging.
- [ ] Separately approve synthetic TEST data; run `/darurat` → Edge → Admin → status/history → track/revoke acceptance. No real emergency.
- [ ] Flutter runtime acceptance after deployed contract.
- [ ] Operations/monitoring/staff ownership and lawful retention review before public activation.
