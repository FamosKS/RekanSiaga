# Authentication & Security — Phase 4A

## Closure baseline Phase4A.4 - A saja berikutnya

Metadata baseline ditutup **BASELINE VERIFIED WITH KNOWN SECURITY FINDINGS**, lihat [closure](phase4a4-final-baseline-audit.md). Defaults dan membership option gaps sudah ditinjau; itu bukan real JWT authorization PASS. [Paket A](phase4a-remediation-a-test-plan.md) mempertahankan active-super visibility dan menambah own-assigned read hanya untuk active staff, tanpa auto assignment atau write grants. Fixture10actors dan matrix masih NOT_RUN; SQL claims simulation bukan autentikasi nyata. **Phase4A BLOCKED; B/C1 tidak dimulai sebelum A diuji/diterima.** Tidak mengubah React/Flutter/client/env/dev.

## Final evidence review Phase 4A.4

[Final baseline audit](phase4a4-final-baseline-audit.md): metadata live staging sekarang mendukung contract/grant/function/seed comparison dan preservation event graph PASS dalam scope. Anon/PUBLIC EXECUTE pada review RPC sudah false; akun authenticated biasa tetap belum diuji memakai JWT. Policy roles super-only, review NULL/reason dan broad future defaults masih temuan; column defaults/per-membership options/API/session/concurrency belum lengkap. **Phase 4A BLOCKED.** Tidak mengubah Web/Flutter/config/dev atau menerapkan A/B/C1. Riwayat hasil-detail-belum-ada di bawah digantikan ekspor live yang kini ditinjau, bukan dianggap tes API PASS.

## Phase 4A.4 - status terkini staging

Deployment permanen rekansiaga-staging dilaporkan selesai manual; counts 26 tabel/26 RLS/6 routines/26 policies/4 roles/2 sources dan eksekusi validator sukses adalah USER-REPORTED, bukan full metadata/API PASS. [Laporan baseline](phase4a4-staging-baseline-validation.md) memisahkan bukti, pemeriksaan read-only berikutnya dan urutan fixture/A/B/C1 beserta rollback. Cast name[] ke text[] dikonfirmasi tersimpan lokal dan validator alternatif diselaraskan. Tidak mengubah React/Flutter/client/env atau remote database. Akun biasa, active/inactive limited roles, anon, refresh/logout/replay serta concurrency belum diuji pada staging; **Phase 4A tetap BLOCKED**. Pernyataan historis staging belum tersedia/deployment pending di bawah tidak lagi mewakili laporan ketersediaan terbaru, tetapi acceptance detail tetap terbuka.

Tanggal: 22 Oktober 2026, Asia/Jakarta.

## Status implementasi dan bukti

**Phase 4A.3 terkini:** Master schema kini ditemukan, dibaca dan dibandingkan dengan snapshot dev. Lima function bodies cocok setelah normalisasi CR/LF; grants source yang hanya merevoke PUBLIC tidak sama dengan effective ACL dev/defaults. Laporan [staging preparation](phase4a3-staging-preparation.md) menyiapkan baseline bootstrap/query validation dan synthetic fixture plan, tanpa menjalankan SQL, remediation A/B/C, Docker atau mengubah konfigurasi Web. Staging dan API acceptance tetap BLOCKED; catatan migration-belum-tersedia di bawah bersifat historis untuk file yang kini diterima.

**Remediation/validation terkini:** [paket review](phase4a-remediation-validation.md) melengkapi A/B/C1 dan C2 managed-owner terpisah, urutan/gates, rollback plan, fixture dan matriks expected/actual. Global default function EXECUTE kini dicakup proposal C1; C2 masih memerlukan provider/capability approval. Kebijakan reason belum disahkan; signature/role contract dipertahankan tanpa menebak rejection-reason-required. Semua SQL rollback-only, lokal dan NOT APPLIED. Staging/fixture approved tidak tersedia dalam sesi; API mutation/concurrency dan Phase 4A tetap BLOCKED. Catatan function/metadata sebelumnya berikut adalah riwayat dan tidak mengubah actual after-remediation menjadi PASS.

**Function review terbaru:** body has_staff_role dan review_public_report telah diterima, fingerprint cocok snapshot. Helper PASS statis untuk identity/active/role database dan tidak ditemukan recursion pada owner/FORCE-RLS snapshot; review RPC PASS statis auth/row-lock/atomic history tetapi FAIL validasi NULL target dan least privilege, alasan masih gap kontrak. Proposal 02 direvisi, belum dieksekusi. API JWT tetap BLOCKED. Lihat bagian terbaru [laporan final](phase4a-final-report.md); pernyataan dua body-belum-tersedia di catatan sebelumnya bersifat historis.

**Review remote terbaru:** pengguna telah menjalankan SQL katalog dan menyimpan [hasil JSON](audits/phase4a-security-audit-result.json); Codex meninjau seluruh metadata. Struktur auth, 26 tabel/RLS, constraints dan index PASS dalam scope metadata. Temuan: META-01 roles SELECT super-only tidak cocok login limited-role; META-02 anon EXECUTE review RPC; META-03 default ACL future objects luas. Helper/RPC body dan API authenticated masih BLOCKED. Detail/proposals: [laporan review terkini](phase4a-final-report.md). Status di paragraf finalisasi sebelumnya berikut adalah riwayat sebelum katalog diterima, bukan pernyataan bahwa bukti remote sekarang belum ada. Tidak ada SQL migration/database change yang dijalankan.

**Status finalisasi terkini: BLOCKED**, sesuai acceptance gate Phase 4A. Laporan pengguna mengonfirmasi **PASS — USER-REPORTED LIVE BROWSER TEST** untuk login Super Admin yang menampilkan dashboard `/admin` dan penolakan akun biasa ke `/403`. Codex tidak menjalankan kedua tes live itu. Audit remote schema/RLS/grants dan pengujian negatif API authenticated tetap BLOCKED; tidak menyimpulkan RLS lulus dari keberhasilan browser. Laporan utama, pemisahan kategori bukti, risiko replay JWT setelah logout, dan langkah penutupan ada di [phase4a-final-report.md](phase4a-final-report.md). Query finalisasi: [phase4a-security-audit.sql](sql/phase4a-security-audit.sql), menggantikan query awal sebagai paket audit utama tanpa menghapus bukti historis.

Finalisasi menjalankan ulang lint/build (PASS exit 0), 23 tes auth sintetis, 27 URL/cabang guard, dan pemindaian privileged credential patterns pada 160 file (PASS). Bukti browser yang sudah PASS dipakai kembali karena source aplikasi tidak berubah. Tidak ada audit katalog remote atau perubahan database yang dilakukan. Bagian pelaksanaan ulang berikut merupakan riwayat sebelum hasil live pengguna diterima.

### Pelaksanaan ulang sesuai instruksi Phase 4A (22 Oktober 2026)

Inspeksi ulang mencakup AGENTS.md, arsitektur/status, package.json, client Supabase, lifecycle/service auth, login/logout, ProtectedRoute/RoleGuard, halaman 403, AdminLayout/sidebar, router, matriks izin, serta SQL yang tersedia. Satu-satunya SQL di proyek adalah query audit read-only; migration pembentuk tabel, FK, constraints dan policies belum ditemukan. Tidak tersedia koneksi SQL Editor/owner database atau akun uji terotorisasi dalam sesi ini. Kontrak tabel tetap berasal dari instruksi pengguna; belum dinyatakan sebagai schema remote terverifikasi.

Implementasi auth yang sudah tersedia dipertahankan setelah pemeriksaan dan pengujian ulang. Perbaikan pada pelaksanaan ulang terbatas pada sinkronisasi `scripts/smoke-auth-browser.mjs`: helper logout menunggu tombol Keluar aktif setelah verifikasi sesi sebelum mengklik. Run awal gagal pada kondisi tersebut; run setelah perbaikan lulus 11 kelompok skenario dengan 164 request sintetis. Perubahan ini tidak menambahkan bypass pada aplikasi.

Hasil aktual pelaksanaan ulang:

| Pemeriksaan | Hasil |
| --- | --- |
| `npm.cmd run lint` | Lulus exit 0 |
| `npm.cmd run build` | Lulus exit 0; main chunk 585.95 kB / gzip 171.04 kB, warning >500 kB |
| `node scripts/test-auth.mjs` | Lulus 23 skenario terisolasi |
| `node scripts/check-foundation.mjs` | Lulus 27 URL dan cabang guard |
| `node scripts/audit-foundation.mjs` | Lulus 108 modul / 342 relasi import |
| `node scripts/smoke-auth-browser.mjs` | Lulus 11 kelompok skenario; respons Auth/REST sintetis |
| `node scripts/smoke-admin-browser.mjs --phase4a` | Lulus 36 kombinasi route/viewport dan 13 kelompok interaksi; tanpa console/runtime error atau aset lokal hilang |
| `node scripts/probe-auth-anonymous.mjs --live-anon` | Remote: ketiga tabel menolak SELECT anonim, HTTP 401 / 42501 |
| `node scripts/audit-client-secrets.mjs` | Lulus pemindaian pola privileged key pada 160 file source/build; bukan audit seluruh jenis secret |

Chrome dan probe jaringan gagal dalam sandbox; keduanya berhasil setelah dijalankan dengan izin eksekusi di luar sandbox. Hasil JSON/screenshot di `docs/qa/phase4a/` diperbarui oleh run terbaru. Tidak ada pengujian login akun nyata, audit katalog remote, SQL migration, perubahan schema/RLS/grants, perubahan akun/role, atau penulisan data bisnis. Matriks izin UI tidak berubah.

**Status akhir pelaksanaan ulang: QA lokal dan probe anonim selesai; acceptance live tetap pending.** Untuk menyelesaikannya, jalankan `docs/sql/auth-security-audit.sql` melalui SQL Editor, tinjau hasil schema/FK/constraints/policies/grants/helper, kemudian ikuti tabel pengujian live di bawah menggunakan akun uji existing yang disetujui. Penolakan anonim tidak membuktikan akses staf aktif berhasil atau pembatasan authenticated benar. Tidak disiapkan migration perbaikan spekulatif karena belum ada policy salah yang terbukti.

Integrasi aplikasi memakai Supabase SDK asli untuk login/logout/identity serta query baca profil dan role. Tidak ada autentikasi palsu dalam aplikasi produksi. **Phase 4A belum terverifikasi penuh terhadap acceptance criteria live**: hasil audit katalog database serta sesi akun uji terotorisasi untuk pengujian oleh Codex belum tersedia. Dua hasil browser nyata telah dilaporkan pengguna sebagaimana status terkini di atas. Uji sintetis membuktikan perilaku aplikasi terhadap kontrak respons, bukan kebenaran schema atau RLS remote.

Tidak ditemukan migration SQL RekanSiaga dalam workspace saat inspeksi (sebelum penambahan query audit fase ini). Tidak tersedia koneksi owner database/SQL Editor dalam sesi. Relasi `auth.users.id = staff_profiles.user_id = staff_role_assignments.staff_id`, serta `staff_role_assignments.role_id = roles.id`, berasal dari kontrak instruksi pengguna, **belum dari migration yang berhasil diaudit**. Query REST memakai default schema public client existing. Tidak melakukan DDL, migration, RLS/grants change, atau INSERT/UPDATE/DELETE.

## Alur autentikasi

1. AdminLoginPage tetap menggunakan UI Phase 3C. Form memvalidasi email/password, menampilkan password atas pilihan pengguna, serta menangani loading/error dengan pesan umum. Password tidak disimpan dalam persistent state aplikasi atau log.
2. `signIn` memanggil `supabase.auth.signInWithPassword`. Sukses Auth mengarahkan ke `/admin`; status ini belum memberikan hak administrator.
3. AppProviders memakai `observeAuthentication`. Listener `onAuthStateChange` sinkron menjadwalkan verifikasi di luar callback; subscription dan timer dibersihkan saat unmount. `getSession()` hanya memulihkan kandidat sesi SDK. `getUser(access_token)` harus memverifikasi identitas kandidat sebelum ProtectedRoute menerima sesi.
4. Event login, pergantian akun, token refresh, initial session, serta logout membatalkan dan menghapus cache `staff-access`. Counter revision memisahkan cache sesi, tanpa memasukkan token ke query key. Respons validasi lama diabaikan setelah sesi berubah atau observer berhenti.
5. Loading awal dan verifikasi dibatasi 15 detik. User mismatch, token kedaluwarsa, penolakan Auth atau error jaringan tidak memberikan akses. Timer `expires_at` menutup akses jika refresh token belum menghasilkan sesi baru. Refresh otomatis tetap ditangani SDK; frontend tidak menciptakan token.
6. ProtectedRoute memerlukan sesi **dan user hasil verifikasi**, menangani loading/error dan mengalihkan tanpa sesi ke `/admin/login`.
7. RoleGuard mengambil izin dari database (alur berikut). Gagal otorisasi tidak diganti dengan localStorage atau user_metadata.
8. SignOutButton dipakai pada header, login ketika bersesi, serta 403 sehingga staf yang ditolak tetap bisa keluar. `supabase.auth.signOut()` menggunakan scope default SDK (global); keberhasilan event menghapus akses lokal. Kegagalan menampilkan error dan tidak menampilkan sukses palsu.

SDK Supabase dapat menyimpan material sesi sesuai konfigurasi default client existing; ini berbeda dari menyimpan role sebagai sumber otorisasi. Aplikasi tidak membaca role dari localStorage, email, user_metadata, atau input user_id. Identitas berasal dari `getUser`, dan query filter hanya mempersempit data yang diminta, bukan membuktikan hak akses. RLS/grants harus memvalidasi request melalui JWT/Auth server.

## Profil dan role

`getVerifiedStaffAccess()` tidak menerima user_id/email dari pemanggil. Service memanggil `getUser()`, lalu:

- `staff_profiles.select('user_id,display_name,is_active').eq('user_id', verifiedUser.id).maybeSingle()`.
- Profil harus tersedia, identitas cocok, dan `is_active` harus boolean true.
- `staff_role_assignments.select('staff_id,role_id').eq('staff_id', verifiedUser.id)`.
- `roles.select('id,code,name').in('id', assignmentRoleIds)`.

Hasil dikembalikan sebagai `{ userId, displayName, roles: StaffRole[] }`. Role IDs menerima string atau safe integer untuk kompatibilitas tipe identifier yang belum terverifikasi; role codes hanya empat nilai yang diminta. Beberapa role digabung dan dideduplikasi. Error grants/RLS, data malformed, assignment milik staf lain, role tidak dikenal atau relasi role parsial menolak akses. Profil tidak ada/nonaktif atau assignment kosong menghasilkan penolakan 403. Tidak ada join FK tebakan maupun kolom role langsung pada profil.

RoleGuard memastikan user hasil service masih sama dengan user sesi terverifikasi. Query memakai cancellation signal, retry otomatis nonaktif, gcTime/staleTime nol, refetch saat guard mount/focus/reconnect dan setiap 60 detik. Selama revalidasi, admin disembunyikan; error tidak memakai cached success. Perubahan role/inaktivasi lintas sesi tidak bisa dijamin seketika oleh UI, sehingga backend harus menolak request berdasarkan state database terkini. Revalidasi dapat melepas halaman dan menghapus draf editor lokal; draf belum disimpan ke backend pada fase ini.

Sidebar dan aksi cepat dashboard mengikuti [authorization-matrix.md](authorization-matrix.md). Unknown admin route ditolak. Aturan ini adalah pembatasan UI yang konservatif; bukan klaim policy database sudah memiliki matriks yang sama.

## Audit database/RLS yang benar-benar dilakukan

Probe anonim read-only ke proyek Supabase existing dijalankan dengan publishable/anon key tanpa mencetak nilainya atau data staf. Hasil:

| Tabel | HTTP | Kode | Hasil |
| --- | --- | --- | --- |
| staff_profiles | 401 | 42501 | SELECT anonim ditolak |
| staff_role_assignments | 401 | 42501 | SELECT anonim ditolak |
| roles | 401 | 42501 | SELECT anonim ditolak |

Bukti: [anonymous-probe.json](qa/phase4a/anonymous-probe.json). Awalnya jaringan sandbox tidak tersedia; probe diulang dengan izin eksekusi luar sandbox. Penolakan 42501 membuktikan request anonim itu tidak dapat membaca tabel; **bukan bukti RLS enabled, FK benar, constraint unik, ownership assignment aman, atau authenticated SELECT/UPDATE dibatasi dengan benar**. Tidak ada akun nyata yang diloginkan atau diubah.

Jalankan [auth-security-audit.sql](sql/auth-security-audit.sql) secara manual melalui Supabase SQL Editor sebagai owner. File hanya berisi transaksi read-only dan SELECT metadata: presence/schema, types/nullability, PK/UNIQUE/FK/CHECK, indexes, policies, table/column/effective grants, dan metadata function. Tidak memilih baris auth.users, email staf, atau secrets. ROLLBACK mengakhiri transaksi. Periksa:

- `staff_profiles.user_id` unik/PK dan FK ke `auth.users.id`; assignment FK ke profil dan role benar; pasangan `(staff_id, role_id)` unik; `roles.code` unik dan empat kode yang didukung tersedia.
- Kolom user/role references, code, dan is_active memiliki nullability/constraint yang sesuai kontrak.
- RLS enabled pada semua tabel otorisasi yang terekspos; apakah FORCE RLS diperlukan ditinjau berdasarkan ownership, bukan diubah otomatis.
- Grants anon/authenticated serta setiap policy permissive/restrictive (policy SELECT permissive dapat digabung OR).
- Profil hanya dapat dibaca oleh diri sendiri atau pengelola yang benar-benar berwenang. Assignment tidak boleh dapat dipilih/dibuat/diubah untuk staf lain hanya dengan memasok staff_id.
- Read role sendiri harus tersedia bagi staf aktif melalui assignment yang diotorisasi; role sensitif tidak diberikan lewat user-editable metadata.
- Tidak ada grants/policies yang memungkinkan self-activation atau self-assignment role. Periksa privilege per kolom dan function/RPC SECURITY DEFINER yang bisa melewati tabel; tinjau helper policy secara privat untuk recursion, search_path, kepemilikan dan EXECUTE grants.
- Menu bisnis memerlukan RLS/backend enforcement tersendiri; fase ini belum mengintegrasikan data bisnis.

Belum ada bukti policy remote tertentu salah, sehingga tidak dibuat migration perbaikan yang menebak kondisi schema. Jika audit menemukan masalah, siapkan migration usulan terpisah berdasarkan hasil tersebut untuk ditinjau sebelum dijalankan. Jangan mematikan RLS atau memperluas grants hanya agar login berhasil. Bila SELECT profile/assignment/roles ditolak, guard tetap menutup akses; perbaikan memerlukan policy self-read atau endpoint server terotorisasi yang dibuktikan aman.

Panduan otoritatif: [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [Auth state listener](https://supabase.com/docs/reference/javascript/auth-onauthstatechange), dan [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). RLS dan grants adalah batas otorisasi server; route guard merupakan lapisan UI.

## QA lokal dan sintetis

| Perintah | Bukti/cakupan |
| --- | --- |
| `node scripts/test-auth.mjs` | 23 skenario SDK-adapter/lifecycle terisolasi; [hasil](qa/phase4a/auth-tests.json) |
| `node scripts/check-foundation.mjs` | 27 URL; loading/error/no-session/unverified-user/multi-role guards dan parameter |
| `node scripts/audit-foundation.mjs` | Graph/import/lazy/SSR/config/design-system; bukan koneksi database |
| `node scripts/smoke-auth-browser.mjs` | 11 kelompok skenario browser pada router produksi dengan respons Auth/REST sintetis; [hasil](qa/phase4a/browser-auth/results.json) |
| `node scripts/smoke-admin-browser.mjs --phase4a` | 36 route/viewport checks, 13 kelompok interaksi, 390/768/1440px; [hasil](qa/phase4a/admin-ui/results.json) |
| `node scripts/probe-auth-anonymous.mjs --live-anon` | Tiga SELECT remote anonim read-only, tidak menggunakan sesi/password |
| `node scripts/audit-client-secrets.mjs` | Pemeriksaan pola known sb_secret/service_role di source/build; tidak mencetak nilai, bukan audit semua kemungkinan secrets |

Browser auth mengintersep seluruh HTTPS menggunakan CDP Fetch, sehingga kredensial/identitas sintetis hanya ditangani fixture jaringan. Aplikasi dan guard produksi tidak diberi backdoor. Fixture presentasi admin di scripts diberi context role khusus QA, tidak dimasukkan router/build produksi. Tidak ada akun hardcoded dalam src aplikasi. Chrome headless dijalankan di luar sandbox karena inisialisasi Chrome sandbox sebelumnya timeout.

Skenario terisolasi meliputi profil aktif super admin, password salah, tidak punya identitas/profil, staf nonaktif, tanpa role, multi-role, penolakan query di setiap tabel, payload malformed/foreign identity/unknown role, izin semua pasangan route-role, refresh sesi, logout vs respons lama, account switch, expiry/token refresh, cleanup, timeout/offline dan SDK logout. Browser menguji login/error, direct protected URL, refresh, logout, profil hilang/nonaktif/role kosong, limited-role deep link, multi-role dan RLS error. Ini bukan tes RLS/akun nyata.

## Pengujian live terkini

| Skenario | Status live | Langkah manual dengan akun uji yang disetujui |
| --- | --- | --- |
| Super admin aktif | PASS — USER-REPORTED LIVE BROWSER TEST | Login dan dashboard /admin dilaporkan berhasil; seluruh menu/deep link belum dibuktikan |
| Akun biasa tanpa role administrator | PASS — USER-REPORTED LIVE BROWSER TEST | Pengguna melaporkan /403 dan pesan Akses belum terotorisasi; penyebab profil/role tidak dirinci |
| Password salah | BLOCKED untuk Codex; live NOT TESTED | Gunakan akun uji dengan satu password salah; harus menampilkan error umum |
| Tanpa sesi membuka /admin | Lulus browser SDK tanpa sesi | Juga cek browser privat pada deployment target |
| Tanpa staff_profiles | BLOCKED | Gunakan akun uji yang sudah disiapkan backend; harus 403 |
| is_active=false | BLOCKED | Gunakan fixture akun nonaktif yang telah disetujui; harus 403 |
| Staf aktif tanpa role | BLOCKED | Gunakan fixture existing tanpa assignment; harus 403 |
| Role terbatas/multi-role | BLOCKED | Periksa menu sesuai matriks dan akses URL terlarang; harus 403 |
| Refresh setelah login | BLOCKED untuk Codex; live NOT TESTED | Reload deep link; identitas/profil/role diverifikasi ulang tanpa flash admin |
| Logout | BLOCKED untuk Codex; live NOT TESTED | Keluar lalu akses deep link/refresh; harus diarahkan ke login; penolakan API memerlukan audit JWT/backend tersendiri |
| Akses data sensitif | PASS anonim ditolak; authenticated BLOCKED | Dengan JWT fixture resmi di lingkungan uji, SELECT profil/assignment milik orang lain harus ditolak/0 rows sesuai policy; jangan melakukan mutation pada data nyata |

Tidak membuat akun atau mengubah status/role akun nyata untuk pengujian. Gunakan akun yang sudah disiapkan pengelola; jangan mengirim password, JWT, atau secret ke chat/dokumentasi. Jalankan SQL metadata dan simpan hasil audit yang telah diperiksa untuk melengkapi bukti acceptance.

## File perubahan Phase 4A

Baru: `src/features/auth/authLifecycle.ts`, `permissions.ts`, `StaffAccessContext.ts`, `SignOutButton.tsx`; `scripts/test-auth.mjs`, `probe-auth-anonymous.mjs`, `smoke-auth-browser.mjs`, `audit-client-secrets.mjs`; `docs/authentication.md`, `authorization-matrix.md`, `sql/auth-security-audit.sql`; artefak QA di `docs/qa/phase4a/`.

Diubah: `src/types/auth.ts`, `features/auth/AuthContext.ts`, `authService.ts`, `ProtectedRoute.tsx`, `RoleGuard.tsx`; `app/providers/AppProviders.tsx`; `components/layout/AdminHeader.tsx`, `AdminSidebar.tsx`; `pages/admin/AdminLoginPage.tsx`, `AdminDashboardPage.tsx`, `AdminSettingsPage.tsx`; `pages/public/UnauthorizedPage.tsx`; `features/admin/resourceConfig.ts` (kode role terpusat); `styles/admin.css` (posisi/logout error); `scripts/check-foundation.mjs`, `smoke-admin-browser.mjs`, `admin-browser-fixture.tsx`; dokumentasi status/arsitektur/routes.

Tidak mengubah client Supabase, environment, package.json/lockfile, Vite config, schema/RLS/grants remote atau CRUD bisnis. Implementasi UI Phase 3B/3C dipertahankan selain integrasi izin, logout, dan keterangan status yang relevan.

Hasil QA final: `npm.cmd run lint` dan `npm.cmd run build` lulus exit 0. Main chunk 585.95 kB / gzip 171.04 kB memberi warning >500 kB. Foundation checks lulus (108 modul / 342 import edges). Known privileged credential scan lulus pada 160 file source/build; [bukti](qa/phase4a/client-secret-audit.json). Tidak ada klaim audit secret menyeluruh atau acceptance live lengkap.
