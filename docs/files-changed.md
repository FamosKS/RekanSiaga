# Daftar file implementasi

## Preflight read-only dev-live-admin-v1

- Release dan rollback SQL: perbaikan ACL config/backup/quota, guard konflik overload RPC, fingerprint metadata dan verifikasi recovery. Tidak diterapkan pada Cloud.
- Gateway: _shared/gatewayConfig.ts dan report-gateway/index.ts; validasi konfigurasi/hostname/action dan penanganan kegagalan cleanup. Tidak di-deploy.
- QA: scripts/test-preflight-runtime.mjs, test-gateway-config.mjs, probe-dev-readonly.mjs, package.json test:preflight; docs/qa/live-admin/preflight-runtime.json dan preflight.json serta probe dev terbaru. PGlite/parser hanya di .tools yang di-ignore; dependency/lockfile aplikasi tidak berubah.
- Metadata read-only: docs/sql/dev-mvp-readonly.sql menghasilkan satu JSON katalog tanpa isi tabel atau body function; sudah dieksekusi pada PostgreSQL lokal, belum pada dev Cloud. Kontrak bersama/status diperbarui. Frontend PASS tidak diuji ulang; Flutter/staging tidak diubah.

## Milestone backend bersama dev - perubahan aktif

- Admin: src/features/admin/dataResources.ts, adminDataService.ts, RemoteResourcePage.tsx, staffService.ts, StaffWorkspace.tsx; halaman admin memakai modul database, termasuk lokasi bantuan dan audit.
- Artikel: ArticleWorkspace.tsx, articleAdminService.ts, contracts.ts; pagination server, cover URL publik, validasi, role/write guard. usePublicContent.ts tidak membaca demoStore; route /demo dihentikan.
- Laporan: adminReportService.ts, reviewContract.ts, reportApi.ts, ReportForm.tsx, TrackingForm.tsx, PhotoUpload.tsx, TurnstileChallenge.tsx serta halaman daftar/detail report. Reason NULL/trim/4000 code points dipakai Web dan SQL.
- Publik/sync: contentService.ts, usePublicConfig.ts, EnvironmentNotice.tsx, src/features/maps/mapService.ts dan PublicMap.tsx, ReliefDirectory.tsx; detail guide/event by UUID, riwayat kejadian, client anonim terpisah, timer publik tunggal. AppProviders.tsx, routing/navigation/sidebar, Brand.tsx, useDebouncedValue.ts dan styles terkait.
- Backend lokal: supabase/releases/dev-live-admin.sql dan rollback; supabase/functions/_shared/reportContract.ts, reportHandler.ts; report-gateway/index.ts, template server-only, supabase/config.toml. Tidak dieksekusi/deploy Cloud.
- QA: test-admin-data.mjs, test-report-gateway.mjs, test-mvp.mjs, smoke-live-admin-browser.mjs, regresi browser existing yang diselaraskan, probe-dev-readonly.mjs, test-live-sql.py, test-dev-live.mjs, run-dev-live.ps1. tsconfig.edge.json dan package scripts diperbarui; dependency/lockfile dipertahankan. .tools hanya parser lokal, di-ignore.
- Handoff/status: README.md, docs/mvp-shared-contract.md, docs/sql/dev-mvp-readonly.sql, docs/development-status.md, dokumen ini. Bukti QA memakai folder existing docs/qa/live-admin, phase3b, phase4a dan mvp.
- Environment: .env.example diperluas; .env.local tidak ditimpa/dicetak. Tidak ada perubahan aplikasi Flutter, project staging, fixture CONTROL/SUBJECT, laporan temuan Phase 4A atau akun Auth.

Bagian di bawah merupakan riwayat implementasi sebelumnya, bukan status integrasi terkini.


## File existing yang diubah

- `src/App.tsx`
- `src/index.css`
- `index.html`
- `tsconfig.app.json`

App beralih dari tes koneksi ke router/providers; index.css memuat design system; index.html memakai bahasa Indonesia dan metadata aplikasi; tsconfig.app.json mengaktifkan strict mode.

## File baru

- `AGENTS.md`
- `docs/architecture.md`
- `docs/development-status.md`
- `docs/files-changed.md`
- `docs/routes.md`
- `scripts/check-foundation.mjs`
- `src/app/providers/AppProviders.tsx`
- `src/app/router/navigation.ts`
- `src/app/router/router.tsx`
- `src/components/accessibility/AccessibilityDialog.tsx`
- `src/components/layout/AdminHeader.tsx`
- `src/components/layout/AdminLayout.tsx`
- `src/components/layout/AdminSidebar.tsx`
- `src/components/layout/PublicFooter.tsx`
- `src/components/layout/PublicHeader.tsx`
- `src/components/layout/PublicLayout.tsx`
- `src/components/shared/AdminResourcePage.tsx`
- `src/components/shared/PageElements.tsx`
- `src/components/shared/UnavailableDetail.tsx`
- `src/features/articles/ArticleFilters.tsx`
- `src/features/auth/AuthContext.ts`
- `src/features/auth/ProtectedRoute.tsx`
- `src/features/auth/RoleGuard.tsx`
- `src/features/auth/authService.ts`
- `src/features/disasters/MonitoringFilters.tsx`
- `src/features/donations/DonationSimulator.tsx`
- `src/features/emergency/EmergencyDirectory.tsx`
- `src/features/guides/PreparednessChecklist.tsx`
- `src/features/maps/MapScaffold.tsx`
- `src/features/notifications/NotificationNotice.tsx`
- `src/features/reports/ReportForm.tsx`
- `src/features/reports/TrackingForm.tsx`
- `src/hooks/useAuth.ts`
- `src/lib/routeParams.ts`
- `src/pages/admin/AdminArticlesPage.tsx`
- `src/pages/admin/AdminDashboardPage.tsx`
- `src/pages/admin/AdminDataSourcesPage.tsx`
- `src/pages/admin/AdminDisastersPage.tsx`
- `src/pages/admin/AdminEmergencyContactsPage.tsx`
- `src/pages/admin/AdminGuidesPage.tsx`
- `src/pages/admin/AdminLoginPage.tsx`
- `src/pages/admin/AdminNotificationsPage.tsx`
- `src/pages/admin/AdminReportDetailPage.tsx`
- `src/pages/admin/AdminReportsPage.tsx`
- `src/pages/admin/AdminSettingsPage.tsx`
- `src/pages/admin/AdminStaffPage.tsx`
- `src/pages/public/ArticleDetailPage.tsx`
- `src/pages/public/DisasterDetailPage.tsx`
- `src/pages/public/DonationPage.tsx`
- `src/pages/public/EmergencyPage.tsx`
- `src/pages/public/GuideDetailPage.tsx`
- `src/pages/public/GuidePage.tsx`
- `src/pages/public/HomePage.tsx`
- `src/pages/public/InformationPage.tsx`
- `src/pages/public/MapPage.tsx`
- `src/pages/public/MonitoringPage.tsx`
- `src/pages/public/NotFoundPage.tsx`
- `src/pages/public/ReportPage.tsx`
- `src/pages/public/ReportTrackingPage.tsx`
- `src/pages/public/UnauthorizedPage.tsx`
- `src/stores/accessibilityStore.ts`
- `src/styles/tokens.css`
- `src/types/auth.ts`

## Dipertahankan

`src/lib/supabase.ts`, `.env.local`, `src/main.tsx`, `vite.config.ts`, package.json, package-lock.json, konfigurasi Tailwind v4, dan aset existing tidak diubah. Tidak ada dependensi tambahan. Folder kosong existing dipertahankan.
