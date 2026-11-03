# RekanSiaga development rules

- Preserve the existing React / Vite / TypeScript / Tailwind v4 stack and lockfile.
- Read existing files before changes. Keep feature services separate from presentation and routing.
- Never print `.env.local`, embed secret keys, or change the configured Supabase client without an explicit request.
- No database migrations, schema or RLS changes, or data writes in scaffolding tasks.
- Public pages require no account. Admin routes require both Supabase session and verified database authorization. Fail closed when role verification is unavailable.
- Frontend route guards do not replace backend authorization or RLS.
- Never invent current disasters, risk statistics, articles, emergency numbers, or successful backend operations.
- Mark unintegrated features clearly. Donations remain simulations with no payments.
- Use TypeScript without `any`, semantic HTML, keyboard access, existing Lucide icons, shared components, and centralized navigation.
- Run `npm run lint` and `npm run build` after changes; record actual outcomes in docs/development-status.md.
- Keep work local unless deployment is requested. Do not read credentials into tool output.
- Main development backend for Web and Flutter is rekansiaga-dev (`uiuiouosblyuqgnvfpeh`). Staging (`fweeyflixnqbvvceuent`) is for security testing only; never point the main frontend at staging or copy CONTROL/SUBJECT fixtures into dev.
- Verify dev API/schema/access read-only; staging migrations are not evidence of dev compatibility. Never run dev migrations, bootstrap, DML, grants, or RLS changes without explicit scoped approval.
- Follow `docs/mvp-shared-contract.md` for the shared Web/Flutter contract. Remote article writes default off pending operator approval and dev authorization verification. Local simulation must remain clearly labeled.
- Phase 4A stays BLOCKED until all security acceptance criteria actually pass; local MVP development continues independently.
- Flutter belongs to the mobile team. Do not create or modify Flutter application code; maintain the shared backend contract only.
- Supabase dev is the primary business data source. Do not restore localStorage/mock content as a main application mode; donations remain explicitly simulated.
- Review RPC reason is nullable. A supplied reason must be nonblank and at most 4000 PostgreSQL characters after the agreed ASCII trim. Preserve status transitions, authorization, row locking, history and audit atomicity.
