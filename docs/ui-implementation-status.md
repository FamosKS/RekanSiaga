# Public UI Implementation Status - Phase 3B

Tanggal: 22 Oktober 2026, Asia/Jakarta.

## Ringkasan

UI 12 halaman publik utama dan 403/404 selesai dalam cakupan data kosong/simulasi. Tidak membuat project/design system baru. Admin dashboard, route tree, Supabase client/Auth, environment, database/RLS dan dependency manifest dipertahankan. Integrasi backend serta sign-off terhadap BRD/Figma asli bukan hasil fase ini.

## Status per halaman

Semua route pada tabel lulus render di 360/390/768/1024/1440px tanpa overflow. Angka ini menguji viewport data kosong saat ini; bukan seluruh kemungkinan data nyata. State loading/empty/error disediakan oleh ContentSection; initial state sengaja unavailable, bukan loading palsu.

| Route | Referensi | Komponen | Interaksi lokal | Placeholder/dependensi/limit |
| --- | --- | --- | --- | --- |
| `/` | [Desktop Â· Home Page.png](<figma-references/Desktop Â· Home Page.png>) | Hero, risk card tanpa angka, quick links, ArticleCard, warning | CTA dan warning on-demand | Risiko/berita/peringatan kosong; perlu sumber resmi |
| `/informasi` | [Desktop Â· Informasi.png](<figma-references/Desktop Â· Informasi.png>) | ArticleFilters, ArticleCard, ContentSection, Pagination | Search/kategori/paging lokal atas data yang tersedia | Artikel kosong; pagination nonaktif; perlu read service |
| `/informasi/:slug` | [Desktop Â· Detail Artikel.png](<figma-references/Desktop Â· Detail Artikel.png>) | Breadcrumb, cover fallback, SourceAttribution, ShareButton, related cards | Validasi slug, kembali; share/copy saat artikel tersedia | Tidak ada artikel; jalur browser share belum dieksekusi |
| `/pemantauan` | [Desktop Â· Pemantauan Bencana.png](<figma-references/Desktop Â· Pemantauan Bencana.png>) | Summary cards, MonitoringFilters, DisasterCard | Wilayah/jenis memperbarui filter lokal | Daftar kosong, status nonaktif; perlu kontrak status/source/timestamp |
| `/pemantauan/:id` | Tidak ada frame khusus | Metadata, origin labels, timeline, map placeholder | Validasi id, kembali/peta | Perlu kejadian dan asal/status terverifikasi |
| `/peta` | [Desktop Â· Peta.png](<figma-references/Desktop Â· Peta.png>) | MapFilterPanel, map stage, legend, side panel | Filter jenis/wilayah memperbarui state | SDK/tile/marker/relawan/posko belum ada; perlu Leaflet/PostGIS/data resmi |
| `/laporan` | [Desktop Â· Laporan RekanSiaga.png](<figma-references/Desktop Â· Laporan RekanSiaga.png>) | ReportFormFields, PhotoUpload, RHF/Zod, Dialog | Error, draf valid, consent, GPS eksplisit, preview/hapus foto | Kirim nonaktif; perlu endpoint anonim, validasi server dan upload aman |
| `/laporan/lacak` | Tidak ada frame khusus | Kode+token form, privacy alert, timeline placeholder | Validasi lokal; edit membersihkan pesan hasil | Tidak ada pencarian; perlu kontrak token dan otorisasi backend |
| `/donasi` | [Desktop Â· Donasi.png](<figma-references/Desktop Â· Donasi.png>) | Campaign radio, nominal, details, Dialog, completion | Pilih/konfirmasi/batal/selesai/coba ulang | Hanya skenario latihan tanpa uang; tidak membutuhkan payment gateway |
| `/panduan` | [Desktop Â· Panduan Siaga.png](<figma-references/Desktop Â· Panduan Siaga.png>) | Kategori, GuideCard, ChecklistGroup, details | Filter, checklist/progres/reset, accordion | Materi resmi kosong; perlu sumber edukasi terverifikasi |
| `/panduan/:id` | Tidak ada frame khusus | Source, phases, checklist, Breadcrumb | Validasi id, checklist, kembali | Panduan kosong; checklist contoh diberi label lokal |
| `/darurat` | [Desktop Â· Pusat Darurat.png](<figma-references/Desktop Â· Pusat Darurat.png>) | EmergencyDirectory/ContactCard, SOSDialog | Buka/tutup info SOS; GPS opsional; tel hanya untuk kontak nyata | Direktori kosong, tidak ada dispatch; perlu kontak resmi per wilayah |
| `/403` | Tidak ada frame khusus | Error card dan LinkButton | Kembali ke publik/login | Role tetap fail-closed; bukan perubahan Auth |
| `* (404)` | Tidak ada frame khusus | Error card dan LinkButton | Kembali ke beranda/informasi | Tidak ada backend |

## Reuse dan modul baru

Dipakai ulang: Button/LinkButton, Card, Badge, Input/Select/Textarea/Field, Dialog, Alert, Skeleton, Loading/Empty/Error, PublicLayout/Header/Navbar/Footer, PageHeader/SectionHeading/UnavailableDetail dan guards existing. ArticleFilters/MonitoringFilters menjadi controlled components, bukan implementasi ganda.

Baru: ArticleCard, DisasterCard, GuideCard, EmergencyContactCard, Breadcrumb, ContentSection, SourceAttribution, Pagination, ShareButton, MapFilterPanel, ChecklistGroup, ReportFormFields, PhotoUpload, DisasterWarningDialog, SOSDialog dan useDeviceLocation. Schema Zod dipisah dari presentasi; publicContent.ts sengaja berisi array kosong, bukan data contoh aktual.

## QA aktual setelah perbaikan

| Perintah | Hasil |
| --- | --- |
| npm.cmd run lint | LULUS, exit 0 |
| npm.cmd run build | LULUS, exit 0; TypeScript strict dan Tailwind v4; warning chunk utama 576.60 kB / gzip 167.95 kB |
| node scripts/check-foundation.mjs | LULUS, 27 URL matches, guards dan parameter |
| node scripts/audit-foundation.mjs | LULUS, 100 modul, 279 local import edges, tanpa cycle/broken imports; lazy exports, SSR 15 publik/login + 11 presentasi admin terisolasi, schema edge cases/state checks |
| node scripts/smoke-public-browser.mjs | LULUS, 70 route/viewport checks, 14 kelompok interaksi, 0 console/runtime errors, 0 missing local assets |

Chrome headless lokal menggunakan CDP dan fetch/WebSocket bawaan Node 24+, tanpa dependency baru. Server localhost:5174. HTTPS eksternal diblokir saat smoke test; tidak menguji layanan Supabase. Chrome dalam sandbox tidak merespons Page.enable sehingga tes dijalankan dengan izin eksekusi di luar sandbox. Browser dimatikan setelah tes; profil QA berada di temporary directory.

### Responsive matrix

| Viewport | Route | Overflow horizontal | Status |
| --- | --- | --- | --- |
| 360px | 14 | Tidak ditemukan | Lulus |
| 390px | 14 | Tidak ditemukan | Lulus |
| 768px | 14 | Tidak ditemukan | Lulus |
| 1024px | 14 | Tidak ditemukan | Lulus |
| 1440px | 14 | Tidak ditemukan | Lulus |

### Interaksi yang benar-benar diuji di browser

1. Menu mobile dibuka dengan Enter dan ditutup Escape.
2. Dialog aksesibilitas menahan siklus Tab; Escape menutup dan fokus kembali ke pemicu.
3. Dialog peringatan dibuka atas klik dan menampilkan peringatan belum tersedia.
4. Form laporan kosong menampilkan error validasi.
5. Draf valid dengan persetujuan privasi membuka konfirmasi lokal yang menegaskan belum dikirim.
6. Penolakan izin GPS setelah klik menghasilkan fallback lokasi manual.
7. Pemilihan PNG uji lokal menampilkan preview dan bisa dihapus tanpa upload.
8. Pelacakan membutuhkan kode dan token.
9. Format valid tetap lokal/tidak masuk URL; edit menghapus pesan format lama.
10. Checklist memperbarui progres/reset; accordion panduan terbuka.
11. Simulasi donasi melalui dialog konfirmasi dan layar selesai simulasi.
12. SOS membuka informasi bantuan tanpa dispatch.
13. Filter peta memperbarui state tanpa marker palsu.
14. Parameter invalid ditangani; admin tanpa sesi dialihkan ke login.

Fixture form/foto/kode/token hanya input QA lokal, tidak masuk dataset publik. Jalur browser Share/copy-link dan panggilan tel belum dieksekusi karena artikel/kontak kosong; komponen menunggu data nyata. GPS sukses, pembaca layar, iOS/Android fisik dan backend/RLS belum diuji.

### Temuan dan perbaikan

- Overflow radio campaign pada 360px: selector input umum memperlebar radio. Diperbaiki dengan selector khusus input[type=radio], min-height dan grid min-width; rerun lima viewport lulus.
- Fokus dialog keluar pada boundary Tab: ditambahkan wrapping first/last focusable element, tetap memakai native modal/Escape; rerun containment/return lulus.
- Tautan referensi PNG lama di design-system.md mengandung mojibake pada pemisah nama file; diperbaiki agar seluruh link referensi lokal dapat dibuka.
- Pesan format tracking usang setelah edit: checked direset pada perubahan input; browser mengonfirmasi hasil lama hilang.

### Artefak

[results.json](qa/phase3b/results.json); 10 screenshot home/report/donation/guides/emergency pada 390/1440px. Contoh: [Home desktop](qa/phase3b/home-1440.png), [Laporan mobile](qa/phase3b/report-390.png), [Donasi mobile](qa/phase3b/donation-390.png). Ini hasil aplikasi localhost, bukan screenshot Figma.

## File baru

- `docs/figma-audit.md`
- `docs/ui-implementation-status.md`
- `scripts/smoke-public-browser.mjs`
- `src/components/shared/Breadcrumb.tsx`
- `src/components/shared/ContentSection.tsx`
- `src/components/shared/Pagination.tsx`
- `src/components/shared/ShareButton.tsx`
- `src/components/shared/SourceAttribution.tsx`
- `src/features/articles/ArticleCard.tsx`
- `src/features/disasters/DisasterCard.tsx`
- `src/features/disasters/originLabels.ts`
- `src/features/donations/donationSimulation.ts`
- `src/features/emergency/EmergencyContactCard.tsx`
- `src/features/emergency/SOSDialog.tsx`
- `src/features/guides/ChecklistGroup.tsx`
- `src/features/guides/GuideCard.tsx`
- `src/features/maps/MapFilterPanel.tsx`
- `src/features/notifications/DisasterWarningDialog.tsx`
- `src/features/reports/PhotoUpload.tsx`
- `src/features/reports/ReportFormFields.tsx`
- `src/features/reports/reportSchema.ts`
- `src/hooks/useDeviceLocation.ts`
- `src/lib/publicContent.ts`
- `src/lib/publicFormatting.ts`
- `src/styles/public.css`
- `src/types/publicContent.ts`

Selain source/docs di atas, 10 PNG QA dan results.json ditambahkan di docs/qa/phase3b/.

## File diubah

- `docs/architecture.md`
- `docs/design-system.md`
- `docs/development-status.md`
- `scripts/audit-foundation.mjs`
- `src/components/ui/Dialog.tsx`
- `src/features/articles/ArticleFilters.tsx`
- `src/features/disasters/MonitoringFilters.tsx`
- `src/features/donations/DonationSimulator.tsx`
- `src/features/emergency/EmergencyDirectory.tsx`
- `src/features/guides/PreparednessChecklist.tsx`
- `src/features/maps/MapScaffold.tsx`
- `src/features/notifications/NotificationNotice.tsx`
- `src/features/reports/ReportForm.tsx`
- `src/features/reports/TrackingForm.tsx`
- `src/index.css`
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

SHA256 src/lib/supabase.ts, package.json, package-lock.json dan vite.config.ts cocok dengan bukti Phase 2. .env.local tidak dibaca/diubah. Tidak ada query tabel, migration, INSERT/UPDATE/DELETE, perubahan Auth/RLS, API contract atau admin dashboard.

## Backlog historis setelah Phase 3B (sebelum instruksi Admin UI Phase 3C)

1. Sediakan/verifikasi BRD, metadata Figma, font/logo resmi dan frame mobile/tablet untuk sign-off final; bukan klaim pixel-perfect.
2. Sepakati kontrak role/RLS, status kejadian/verifikasi, wilayah, dan API bersama backend/Flutter. View models frontend bukan schema database.
3. Integrasikan layanan baca bertipe untuk artikel/kejadian/panduan/kontak resmi, dengan parsing, source/timestamp, error handling dan uji data nyata.
4. Peta memerlukan Leaflet/tile/PostGIS dan data resmi; layer relawan/posko tetap nonaktif.
5. Laporan/upload/track memerlukan validasi server, privasi, rate limiting dan token akses aman. Jangan aktifkan kirim sebelum integrasi sah.
6. Donasi tetap simulasi dan SOS bukan dispatch. Tidak ada data kartu, rekening, dana terkumpul atau bantuan menuju lokasi.
7. Profile bundle >500 kB sebelum optimasi vendor. QA produksi, data-filled cards, share/call, GPS sukses dan lintas browser/perangkat masih diperlukan.

## Phase 3C — Admin Dashboard UI (22 Oktober 2026)

Cakupan terbaru mengikuti instruksi Admin Dashboard UI Phase 3C. Backlog integrasi backend di bagian historis Phase 3B tetap belum dikerjakan.

### Halaman dan interaksi

| Halaman | Implementasi UI | Batas backend |
| --- | --- | --- |
| Login | Branding, email/password required, show/hide, busy dan error, Supabase Auth existing | Tidak membuat akun/role; kondisi Auth nyata belum diuji |
| Dashboard | Empat kartu ringkasan, laporan/kejadian/artikel terbaru, sumber data, aksi cepat, indikator sistem | Nilai memakai tanda belum tersedia, tanpa angka atau status sehat rekaan |
| Laporan | Pencarian kode/lokasi, filter status, reset, tabel dengan link detail saat data tersedia | Dataset kosong, tidak melakukan query |
| Detail laporan | Validasi identifier, panel bukti, rancangan keputusan, catatan, dialog konfirmasi, placeholder timeline | Keberadaan laporan belum diverifikasi; penerapan status disabled |
| Kejadian | Tabel jenis/wilayah/sumber/verifikasi/status, filter jenis/wilayah, editor dan pratinjau draf | Input manual diberi label belum terverifikasi; kontrak event status belum tersedia |
| Artikel | Pencarian, filter publikasi, editor judul/kategori/sumber/isi, pratinjau, edit ulang, konfirmasi publikasi | Penyimpanan/publikasi disabled |
| Panduan | Filter kategori/publikasi; bagian sebelum/saat/sesudah; editor checklist per baris; pratinjau checklist dan sumber | Bentuk field merupakan view model lokal, belum kontrak schema database |
| Kontak darurat | Kolom organisasi/layanan/wilayah/telepon/verifikasi; form dan pratinjau | Tidak ada nomor contoh dalam dataset atau klaim verifikasi |
| Staf | Tabel nama/email/role/status, filter dan badge role, form usulan role dan konfirmasi | Tidak menetapkan role atau mengundang staf |
| Notifikasi | Daftar judul/wilayah/kanal/status delivery, editor aturan pemicu/pesan/wilayah dan pratinjau | Tidak ada pengiriman atau klaim delivery |
| Sumber data | Kolom nama/jenis/aktif/sync/last sync/error, form metadata, pratinjau dan panel detail kosong | Tidak mengarang status aktif, log, waktu sync, atau endpoint yang berhasil |
| Pengaturan | Draf nama aplikasi, tinjau konfigurasi, preferensi kepadatan dengan pratinjau lokal, informasi sistem/integrasi | Tidak menyimpan konfigurasi, membaca secret, atau mengubah environment |

Semua editor memiliki validasi native required, email, URL, panjang maksimum dan format telepon dasar. Draf disimpan di state komponen, hilang ketika halaman dilepas, dan tidak dimasukkan ke localStorage/database. Tombol pratinjau meninjau input lokal; tombol yang mengubah server disabled dengan keterangan. Konfirmasi dapat dibuka, kembali ke draf, dan ditutup tanpa fake success. Daftar kosong berarti integrasi belum tersedia, bukan hasil query bahwa database memiliki nol record. Panel detail daftar menunggu data terpilih dari layanan terotorisasi; edit record existing belum dapat diuji tanpa data nyata.

### Reuse dan batas kontrak

AdminSidebar memakai navigasi terpusat, ikon Lucide, NavLink aktif dan tautan situs publik. Menu mobile membuka seluruh navigasi di atas konten, menutup setelah navigasi, mendukung Escape dan tombol tutup. AdminHeader menggunakan sesi dan signOut existing. AdminLayout mempertahankan Outlet dan skip link; fokus konten diperbarui saat navigasi. Breadcrumb existing digunakan ulang. Warna, radius, shadow, typography dan controls mengikuti tokens Phase 3A; tidak ada referensi Figma admin khusus yang tersedia sehingga layout admin merupakan ekstensi design system, bukan klaim pixel-perfect Figma.

Komponen baru: AdminPageHeader, DataTable generik (caption, headers, row renderer, region scroll keyboard, loading/error/empty), ConfirmDialog. Primitive Button/Input/Select/Textarea/Dialog/Badge/Alert/Panel/EmptyState/LoadingState/ErrorState existing dipakai ulang. AdminResourcePage lama diperbarui menjadi shell daftar/editor bertipe dengan konfigurasi per resource.

`features/admin/resourceConfig.ts` memusatkan nilai UI yang diminta: laporan `unverified / under_review / verified / rejected`, publikasi `draft / published / archived`, serta usulan role `super_admin / information_manager / report_verifier / mitigation_editor`. Nilai tersebut bukan bukti enum database telah diverifikasi. Status kejadian, verifikasi kontak, akun, delivery, dan sync tidak ditebak sebagai enum baru. Kontrak schema/API nyata tetap dibutuhkan.

ProtectedRoute, RoleGuard, auth service/provider, client Supabase, route tree, dependency manifest/lock dan Vite config tidak diubah. Guard legacy membandingkan role `admin`, sedangkan service tetap mengembalikan null. Empat role usulan UI tidak diberikan hak akses; mapping role/izin per fitur perlu dikerjakan bersama backend sebelum membuka akses. Tidak ada kredensial hardcoded, bypass guard produksi, SQL, migration, RLS change, query tabel, INSERT/UPDATE/DELETE, atau operasi bisnis jaringan baru.

### File Phase 3C

Baru:
- `src/features/admin/resourceConfig.ts`
- `src/components/shared/AdminPageHeader.tsx`
- `src/components/shared/DataTable.tsx`
- `src/components/ui/ConfirmDialog.tsx`
- `src/styles/admin.css`
- `scripts/admin-browser-fixture.tsx`
- `scripts/smoke-admin-browser.mjs`
- `docs/qa/phase3c/results.json` dan enam PNG screenshot.

Diubah:
- Seluruh 12 file `src/pages/admin/Admin*Page.tsx` (termasuk login dan detail laporan).
- `src/components/layout/AdminLayout.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`.
- `src/components/shared/AdminResourcePage.tsx`.
- `src/app/router/navigation.ts` (urutan menu staf sebelum notifikasi).
- `src/index.css` (import CSS admin; public page source tidak diubah).
- `scripts/audit-foundation.mjs` (audit state tabel mengikuti DataTable baru).
- `docs/ui-implementation-status.md`, `docs/development-status.md`, `docs/routes.md`, `docs/architecture.md`, `docs/design-system.md`.

### Verifikasi aktual Phase 3C

- `npm.cmd run lint`: LULUS, exit 0.
- `npm.cmd run build`: LULUS, exit 0; chunk utama 581.58 kB / gzip 169.67 kB. Warning ukuran >500 kB tetap ada.
- `node scripts/check-foundation.mjs`: LULUS, 27 URL, branches guards, fail-closed role dan identifier.
- `node scripts/audit-foundation.mjs`: LULUS, 104 TypeScript modules, 328 import edges, routing/lazy exports tanpa cycle; 15 public/login URL dan 11 admin presentation terisolasi; primitive, konfigurasi dan loading/error/empty states.
- Browser: lihat [hasil mesin](qa/phase3c/results.json) dan [dashboard desktop](qa/phase3c/dashboard-1440.png), [dashboard mobile](qa/phase3c/dashboard-390.png). Chrome headless menguji 12 presentasi admin/login pada 390/768/1440px (36 kombinasi), serta 13 kelompok interaksi. Tidak ditemukan overflow horizontal, console/runtime error, atau aset lokal hilang.

Browser admin menggunakan fixture MemoryRouter di `scripts/`, dilayani hanya oleh middleware server QA localhost:5175. Fixture tidak ditambahkan ke router produksi, tidak membuat sesi/role, dan tidak dibundel dalam aplikasi produksi. UI terlindungi diuji terisolasi; redirect tanpa sesi diuji terpisah melalui router produksi untuk /admin, /admin/artikel, dan /admin/unknown. HTTPS diblokir selama QA. Chrome memerlukan eksekusi di luar sandbox karena Page.enable timeout di sandbox. Tidak ada tes kredensial nyata, database/RLS, role nyata, delivery/sync, perangkat fisik atau pembaca layar. Screenshot desktop/mobile dashboard diperiksa visual; ini bukan pixel-diff Figma.

### Pekerjaan backend berikutnya

Verifikasi kontrak database dan mapping empat role/izin per fitur; integrasikan read services terotorisasi dan data detail/riwayat; tambahkan server validation/audit log dan kontrol akses sebelum mengaktifkan penyimpanan, publikasi, verifikasi, konfigurasi atau role assignment. Sinkronisasi dan pengiriman membutuhkan log otoritatif. QA dengan data nyata dan status error layanan harus dilakukan setelah integrasi tersebut.

Temuan QA Phase 3C yang diperbaiki: validasi whitespace input draf; empty state dipisah dari area gulir tabel agar terbaca utuh pada mobile; fokus konten tidak membentuk outline sepanjang halaman; favicon fixture QA ditetapkan eksplisit agar tidak meminta /favicon.ico yang tidak tersedia. Run final browser lulus setelah perbaikan tersebut.
