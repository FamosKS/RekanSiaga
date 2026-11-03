# Smart Rescue Relay / SOS v1

**Checkpoint 3 Nov 2026: LOCAL IMPLEMENTATION / CLOUD NOT DEPLOYED / LIVE NOT TESTED.** The development target is `rekansiaga-dev` (`uiuiouosblyuqgnvfpeh`). No database, Edge Function, secret, synthetic request, Flutter source, or staging environment has been changed by this work.

## What this feature does (and does not do)

The public `/darurat` flow can, after its feature flag is deliberately enabled, send an explicitly consented request to RekanSiaga's private queue for staff review. It does **not** contact or dispatch BPBD, SAR, police, ambulance, or another official provider, and it cannot promise continuous monitoring or that help is coming. Keep the official contacts visible and independent. A server receipt means only that the application stored the request.

The browser collects GPS only when the user taps the permission button. Battery is collected only after a separate tap when the browser supports it. Network state is a browser-reported snapshot; it is not proof of server reachability. None of these fields is triage or a proxy for urgency. No background tracking, automatic phone call, third-party dispatch, public map marker, push delivery claim, or local offline auto-retry is implemented.

## Local contract and privacy design

- `sos_requests`, `sos_request_history`, and `sos_rate_limits` are additive private tables. Anonymous SELECT is revoked; there is no public table read or public RPC execution. Admin review methods require a verified `super_admin` or `report_verifier` session and the database checks `has_staff_role` again.
- Public submit, track, and revoke are callable only through `sos-relay`. Submit/track/revoke SQL functions are service-role-only. The Edge Function validates origin for browsers, body bounds, rate limit, consent, then calls narrowly scoped RPCs. Native Flutter may omit Origin; no CORS headers are returned to a browser origin unless allowlisted.
- The UI creates separate CSPRNG 256-bit idempotency and tracking credentials. Edge stores only HMAC-SHA256 verifiers, using the Edge secret `SOS_CREDENTIAL_HMAC_KEY` (minimum 32 bytes); the tracking secret is returned once and held only in page memory. It is not placed in a URL, localStorage, analytics or application logs. Tracking errors deliberately do not distinguish missing, expired, or revoked credentials.
- Tracking exposes only reference code, status and status timestamps. It never returns coordinates, description, contact details, battery/network, staff reviewer or internal notes. Credentials expire after 30 days and can be revoked. Requests have a 180-day `retention_until`; **scheduled deletion/retention enforcement is not yet implemented and is a production blocker**.
- Admin status is monotonic: `received → seen → reviewing → closed`; closed cannot reopen. Optimistic timestamp conflict checks, history, and audit status-only values run atomically. Internal notes are not included in public tracking.
- Browser UI does not load a third-party map with private coordinates. An approved internal tile provider/self-hosted map and data-sharing decision are still needed before the requested visual map is complete. Coordinates are shown to authorized staff with accuracy only.
- Durable rate limit is a project-wide per-minute quota (100 submits and 300 tracks); it fails closed. It is not per-device/per-IP and could throttle all users under load. Before public launch, replace/refine it using a verified gateway caller identity or approved anti-abuse mechanism without trusting caller-controlled headers. This global quota is intended only as a bounded dev guard.

## Cloud package

Review as one package; it is **not approved or executed** by the original request. No Cloud mutation should occur until the operator explicitly approves this exact scope: project dev only; the listed additive tables/RPCs/RLS, two function secrets, and `sos-relay` Edge deployment. No data test rows, staging, Flutter, other Gateway, unrelated secrets, Storage, or official-service integrations.

Files:

- `supabase/releases/dev-sos-relay-preflight.sql`
- `supabase/releases/dev-sos-relay-v1.PROPOSED.sql`
- `supabase/releases/dev-sos-relay-postflight.sql`
- `supabase/releases/dev-sos-relay-rollback.PROPOSED.sql` (destructive only after separate approval, no active records)
- `supabase/functions/sos-relay/index.ts`
- `scripts/deploy-dev-sos-relay.ps1`

The runner is local-only without `-ApprovedSosRelay`; it pins the project ref, checks exact project and required secret **names only**, runs read-only preflight, then a guarded single SQL transaction and postflight before deploying only `sos-relay`. If SQL exit/postflight is uncertain, stop and reconcile read-only; never replay SQL. If function deploy fails after SQL passes, reconcile/deploy only the Function, never rerun SQL blindly. PowerShell parser check passes; native PostgreSQL/Supabase compilation is still pending.

Required Edge secrets, values never belong in source, `.env`, command arguments, screenshots or chat:

- `SOS_CREDENTIAL_HMAC_KEY`: generate 32 random bytes using an approved local secret manager and enter directly in Supabase Dashboard Edge Function secrets.
- `SOS_ALLOWED_ORIGINS`: exact browser origins, comma-separated; include only the actual local and production origins (for example `http://localhost:5173` and the deployed HTTPS origin). Do not add `*`.

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are platform runtime secrets; never expose them to the browser. After operator approval and confirmed SQL postflight/function deploy, set local `.env.local` flags `VITE_SOS_RELAY_ENABLED=true` and `VITE_SOS_ADMIN_ENABLED=true`, restart Vite, and test only synthetic data after separate approval.

## Controlled live acceptance (not run)

Only after Cloud package approval and an additional explicit approval to create a synthetic record:

1. Verify exact dev project, SQL postflight invariants, secret names, and deployed Function. With both flags off, confirm UI cannot submit and no Admin nav item is visible.
2. Enable flags locally; use an obviously synthetic TEST description and no personal contact. Submit once; verify receipt says server accepted only and there is no statement that help is coming. Save the one-time secret without sharing it.
3. Verify Admin nav/route only for `super_admin` and `report_verifier`; anon and unrelated roles cannot list/detail/update. Verify the internal data is absent from `/peta`, `/pemantauan`, article and public feeds.
4. Verify one explicit GPS opt-in; deny permission and verify submission remains possible without coordinates. Check browser network requests/logs and ensure token is absent from URL, app logs, analytics and storage.
5. Verify status lifecycle and audit/history. Check public tracking returns only safe statuses/times; invalid, expired and revoked codes share non-enumerating errors. Revoke credential and verify tracking stops.
6. Disable/restore network around submit. If result is uncertain, do not retry or create a second row; reconcile the idempotency outcome through authorized Admin view. Verify no automatic retry and official contacts remain available.
7. Verify rate limiting in a controlled low-volume test, then cleanup the synthetic request only by approved retention-safe policy. Do not DELETE active/real SOS records.

Passing deployment or local SQL tests is not LIVE acceptance. No real emergency request should be used as a test.

## Flutter contract

The mobile project is not changed. Flutter must use the same function and DTOs, `SUPABASE_URL`, publishable/anon key, and a random 32-byte credential/idempotency key generated with `Random.secure()`. Native clients can call without `Origin`; no service key or direct private-table queries. Keep the credential in memory or platform secure storage only if the user explicitly chooses tracking persistence. Never log it or put it in a deep link/query string. Refetch request status on app open/resume and connectivity restoration; stop on dispose. No background GPS. Display “diterima sistem”, “dilihat”, “ditinjau”, “ditutup” as application workflow only; never translate these into official dispatch states.

Example payload shape:

```json
{
  "action": "submit",
  "idempotency_key": "<base64url-encoded 32 random bytes>",
  "access_credential": "<base64url-encoded 32 random bytes>",
  "consent": true,
  "report": {
    "description": "<user-entered request>",
    "latitude": null,
    "longitude": null,
    "accuracy_m": null,
    "location_captured_at": null,
    "battery_percent": null,
    "charging": null,
    "online": true,
    "network_type": null,
    "contact_name": null,
    "contact_phone": null,
    "consent_version": "sos-consent-v1"
  }
}
```

Function URL: `POST {SUPABASE_URL}/functions/v1/sos-relay`. Actions: `submit`, `track`, `revoke`, `admin_list`, `admin_detail`, `admin_update`. Exact response DTOs are defined in the function and `src/features/emergency/sosRelay.ts`. This contract is **LOCAL/PENDING Cloud**, not a mobile runtime contract until postflight/deployment and a versioned acceptance are complete.
