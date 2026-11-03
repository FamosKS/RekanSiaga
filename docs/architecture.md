# Arsitektur RekanSiaga

React + Vite + TypeScript strict, Tailwind CSS v4. Tidak ada dependency tambahan atau perubahan konfigurasi Supabase.

## Pembagian folder

- `src/app/router`: React Router browser router, lazy loading halaman, nested Outlet, konfigurasi navigasi publik/admin.
- `src/app/providers`: TanStack Query dan lifecycle sesi Supabase.
- `src/components/ui`: primitive design system Phase 3A, Button/Card/Field/Dialog dan state UI.
- `src/components/shared`: header halaman, panel, status loading/empty/error, detail unavailable, tabel admin reusable.
- `src/components/layout`: header/footer publik dan sidebar/header admin; layout terpisah.
- `src/components/accessibility`: modal native dialog dengan focus handling browser.
- `src/pages/public`, `src/pages/admin`: seluruh komponen halaman terpisah sesuai URL.
- `src/features`: auth, articles, disasters, maps, reports, guides, donations, emergency, notifications, accessibility. Logika fitur berada dekat UI fitur. Folder accessibility disediakan untuk pengembangan fitur selanjutnya.
- `src/hooks`: akses state auth.
- `src/lib`: client Supabase lama, tidak diubah.
- `src/stores`: preferensi aksesibilitas saja, disimpan lokal menggunakan Zustand persist.
- `src/types`: kontrak sesi/role dan view models publik (bukan schema database).
- `src/styles`: tokens dari sampel PNG/turunan aksesibilitas, components.css dan public.css; bukan klaim metadata Figma.
- `src/assets`, `public`: aset yang sudah ada dipertahankan.

## Alur data dan keamanan

AppProviders mengamati sesi Supabase, bukan tabel bisnis. Login menggunakan Supabase Auth; tidak mengubah role pengguna. ProtectedRoute memeriksa loading/error/sesi. RoleGuard memanggil service `getVerifiedStaffRole` yang saat ini mengembalikan null. Semua akses admin ditolak sampai kontrak role database, izin per fitur, dan RLS dapat diverifikasi. Jangan mengganti ini dengan localStorage atau metadata yang dikendalikan pengguna. Integrasi berikutnya harus memeriksa role database melalui layanan yang otoritatif dan memvalidasi ulang perubahan role.

Tidak ada query tabel bisnis, INSERT, UPDATE, DELETE, migration, map tile, atau SDK peta. Service layer auth dipisah; service data bisnis perlu ditambahkan setelah schema dan kontrak API diketahui, tanpa mengasumsikan tabel.

Form laporan menggunakan React Hook Form + Zod untuk validasi lokal. Foto hanya dipilih; belum diunggah. Pelacakan tidak melakukan pencarian. Simulasi donasi hanya state perangkat. Checklist tidak dipersist. TanStack Query dipakai pada pemeriksaan role; UI tabel admin menerima loading/error untuk integrasi berikutnya.

## Routing dan deployment berikutnya

BrowserRouter membutuhkan SPA fallback ke index.html pada hosting. Belum ada path alias; import relatif konsisten agar konfigurasi existing tetap terjaga. Route detail memvalidasi pengenal sebelum menampilkan unavailable state. Halaman data menyediakan empty state jujur, bukan data aktual palsu.


## Phase 3B

lib/publicContent.ts menyediakan array publik bertipe kosong, tanpa backend/query/schema tebakan. Filtering/render lokal memakai view models; ContentSection menyediakan loading/empty/error. Schema report/tracking dipisah dari presentasi; GPS hanya on-demand, object URL foto direvoke, tidak ada upload. Tracking tidak menaruh token di URL/storage. Donasi hanya simulasi; warning tidak otomatis; SOS tidak dispatch. Bukti QA di docs/ui-implementation-status.md.

## Phase 3C — Admin UI

AdminResourcePage mengelola state pencarian/filter dan draf editor lokal dengan ResourceConfig dari features/admin/resourceConfig.ts. DataTable bertipe menerima rows/column renderers/loading/error dan empty state. Tidak ada data service bisnis atau schema tabel asumsi baru. AdminPageHeader dan ConfirmDialog memakai primitive existing. CSS admin merupakan ekstensi tokens Phase 3A dan diimpor global dengan selector admin. Seluruh guards/auth/client produksi dipertahankan; role usulan editor tidak menjadi sumber otorisasi. Pengujian browser memakai fixture presentasi terisolasi di scripts; fixture tidak ditautkan ke router aplikasi atau build produksi.

## Phase 4A — Auth dan izin terkini

Bagian status auth Phase 2/3 di atas merupakan catatan historis. AppProviders sekarang memakai authLifecycle.ts: kandidat getSession diverifikasi getUser, listener sinkron menjadwalkan pemeriksaan, cleanup/race generation/expiry/timeout dan session revision tersedia. authService membaca staff_profiles, staff_role_assignments dan roles dari backend berdasarkan identitas getUser. Profil harus aktif; role berbentuk array empat kode, tanpa user-metadata/localStorage authorization. RoleGuard menggunakan cache terisolasi per user/revision, membuang hasil error/stale dan memeriksa permissions.ts. StaffAccessContext hanya memaparkan hasil terverifikasi untuk menu/aksi. SignOutButton dipakai ulang pada header/login/403.

Relasi database berdasarkan kontrak pengguna; migration/FK/RLS remote belum diaudit. Probe anonim ditolak 401/42501 pada ketiga tabel. SQL audit read-only dan matriks izin tersedia di authentication.md/authorization-matrix.md. Client guards tidak menggantikan RLS; CRUD bisnis tetap nonaktif dan tidak ada perubahan database. Pengujian SDK/browser sintetis dipisahkan dari hasil probe remote; acceptance akun live masih pending.
