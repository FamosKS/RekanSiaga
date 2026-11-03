# SOS Relay v1 QA checkpoint — 3 November 2026

## Result

**PASS LOCAL / CLOUD NOT DEPLOYED / LIVE NOT TESTED / NOT READY FOR REAL EMERGENCY USE.** No Cloud changes, synthetic cloud rows, secrets, staging edits or Flutter edits occurred.

| Check | Result | Boundary |
|---|---|---|
| Local PGlite SQL contract | 8/8 PASS | Synthetic ephemeral DB: RLS/anon denial, verifier submit, safe tracking, revoke/expiry, persistent quota, Admin audit/history, monotonic status |
| ESLint | PASS | Source validation |
| Production build | PASS | Existing >500 kB bundle warning |
| Edge TypeScript | PASS | Compile only, no deployment/runtime |
| Native Supabase PostgreSQL/PostgREST | NOT TESTED | PGlite does not establish Supabase runtime compatibility |
| PowerShell deployment runner parse | PASS | Parser-only; runner was not executed |
| Chrome/CAPTCHA/Cloud RLS/E2E | NOT TESTED | No deployed endpoint/test row |
| Flutter runtime | NOT TESTED | Flutter repository untouched |

## Open readiness blockers

1. Exact dev-only Cloud approval and independent SQL/security review.
2. Configure `SOS_CREDENTIAL_HMAC_KEY` and exact `SOS_ALLOWED_ORIGINS`; verify names only.
3. Native PostgreSQL compilation and PostgREST RPC DTO smoke test.
4. Project-wide quota is coarse: 100 submit/min, 300 track/min; implement verified-caller-based limiting before public launch.
5. `retention_until` is 180 days but automated deletion is absent; define and verify cleanup.
6. Privacy-reviewed/self-hosted Admin map provider; current page avoids sending precise coordinates externally.
7. Separately approve one synthetic TEST row before Chrome live acceptance. Never use real emergency requests.

See `docs/runbooks/sos-relay-v1.md`. Local tests are not LIVE proof.
