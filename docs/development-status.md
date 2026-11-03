# Checkpoint integrasi konten terpadu - 3 November 2026

Status PASS LOCAL / NEEDS CLOUD. Kontrak/sanitizer 7/7 dan SQL PostgreSQL/WASM 18/18 lulus; lint, build, Edge typecheck lulus (build mempertahankan warning bundle >500 kB). Pengulangan tes browser Chrome untuk UI terpadu dan CORS saat ini BLOCKED oleh timeout CDP sebelum assertion aplikasi; artefak terakhir menyimpan kegagalan harness, bukan bukti kegagalan fitur. Tidak ada mutasi Cloud pada siklus terakhir; handoff mencatat percobaan SQL terdahulu berhenti pada guard dan perlu preflight read-only sebelum retry berizin. Paket mencakup SQL feed/link/media, hotfix CORS report-publication, deploy article-media, lalu acceptance LIVE terbatas. Scope belum mendapat persetujuan untuk rekansiaga-dev (uiuiouosblyuqgnvfpeh). Lihat docs/qa/stage-e/integrated-content-status.json, docs/runbooks/integrated-content-v1.md, dan docs/AGENT-HANDOFF-REKANSIAGA.md.
## Hotfix publikasi foto ? 2 November 2026

LIVE read-only OPTIONS report-publication HTTP204 mengizinkan authorization,apikey,content-type tetapi belum X-Client-Info yang dikirim SDK. Browser memblokir POST pada preflight; source dan probe cocok. Bukti: docs/qa/stage-e/publication-cors-live-before.json. Local Chrome mereproduksi kegagalan dan membuktikan perbaikan;3 checks PASS di publication-cors-local.json. Lint/build/typecheck Edge PASS (warning bundle existing). Shared publicationCors.ts dan error khusus publicationError.ts diperbaiki; UI memakai pesan foto tanpa anjuran mengirim ulang laporan. Tidak ada Cloud mutation, SQL/RLS/Storage/status atau sanitizer diubah. Keseluruhan pipeline foto belum LIVE PASS.

Deploy hotfix function existing saja oleh operator:
```powershell
npx.cmd --yes supabase@2.120.0 functions deploy report-publication --project-ref uiuiouosblyuqgnvfpeh --use-api --no-verify-jwt
```
GET live tanpa JWT mengembalikan405, konsisten platform verify_jwt nonaktif existing; POST tetap memvalidasi Auth getUser dan staff role di handler. Jangan mengulang report-gateway/SQL atau mengubah secrets/policy. Setelah deploy, cek preflight lalu operator menguji satu foto yang memang diizinkan; jangan agent memublikasikan foto nyata atau retry hasil takpasti. Sanitasi/Storage/RPC tahap berikut belum dibuktikan oleh probe CORS.

## Hotfix publikasi foto ? 2 November 2026, 22.32 WIB

Pengguna melaporkan error pada Setujui salinan publik. Source SDK mengirim X-Client-Info, sedangkan function report-publication live OPTIONS hanya mengizinkan authorization,apikey,content-type. Probe read-only HTTP204 membuktikan header hilang; tidak ada foto/JWT/request POST dikirim oleh agent. Bukti docs/qa/stage-e/publication-cors-live-before.json. Local Chrome mereproduksi POST diblokir pada header lama dan lolos pada header baru;3 checks PASS di publication-cors-local.json. Build/lint/typecheck Edge PASS, warning bundle existing. Perbaikan lokal: shared publicationCors.ts + import function; publicationError.ts + pemakaian UI khususfoto. Tidak ada SQL/RLS/Storage/data/status laporan atau sanitizer yang diubah. Tidak membuktikan seluruh pipeline foto sudah LIVE PASS. Deployment report-publication masih menunggu operator; tidak deploy report-gateway atau ulang SQL. Operator dapat deploy satu function existing, kemudian uji satu lampiran yang memang diizinkan untuk publikasi. Auth getUser + has_staff_role tetap handler. Jangan otomatis menerbitkan foto pengguna atau retry approval yang hasilnya tidak pasti.

Perintah operator untuk menerapkan hotfix saja:
```powershell
npx.cmd --yes supabase@2.120.0 functions deploy report-publication --project-ref uiuiouosblyuqgnvfpeh --use-api --no-verify-jwt
```
Flag no-verify-jwt mengikuti perilaku endpoint existing yang mengembalikan405 untuk GET tanpa JWT; autentikasi user/role tetap diperiksa handler POST. Jangan mengubah secrets/policy untuk mengatasi CORS. Setelah deploy, probe OPTIONS dengan Access-Control-Request-Headers authorization,apikey,content-type,x-client-info harus mengizinkan semua; approvalfoto nyata membutuhkan tindakan operator, bukan bukti dari endpoint OPTIONS.

# Pembaruan: satu kode pelacakan lokal selesai, deployment Cloud BLOCKED operator

Checkpoint 2 November 2026: operator membuktikan paket privacy/compatibility dan RK2 **APPLIED/DEPLOYED** ke `rekansiaga-dev`; RPT predicate sudah ada tanpa replay, Gateway berhasil deployed. Flag frontend lokal berhasil diaktifkan tanpa Cloud mutation. Script aktivasi gabungan masih tertahan validasi hash D lama; server activation probe dan LIVE acceptance belum dijalankan. Status **CLOUD DEPLOYED; LIVE NOT RUN**.

Perbaikan 2 November 2026: helper frontend sebelumnya hanya menulis `VITE_REPORT_GATEWAY_ENABLED`, sehingga receipt lama masih menampilkan kode referensi + token. `report-frontend-env.mjs --enable` kini menulis kedua flag, termasuk `VITE_REPORT_SINGLE_CODE_ENABLED=true`. Lint PASS dan 6 tes kontrak single-code PASS. Receipt lama tidak berubah retroaktif; restart Vite dan submit baru diperlukan.

Checkpoint RLS prerequisite 2 November 2026: manifest compatibility telah direkonsiliasi ke artefak RK2 aktual. Percobaan paket RLS/privacy lolos hash tetapi berhenti sebelum SQL karena sesi alat tidak dapat mengisi prompt password native; tidak ada Cloud mutation. Paket tetap siap dijalankan sekali pada PowerShell interaktif.

Rekonsiliasi guard RK2 2 November 2026: pemeriksaan operator menunjukkan `public_reports` RLS **DISABLED**, sedangkan `track_report_v1(text,text)` **FOUND**. Source Gateway memakai `submit_report_v1` 9 argumen yang membungkus `submit_public_report` 7 argumen; guard diperbaiki agar memeriksa kedua kontrak secara eksplisit, termasuk generator CSPRNG. Manifest hash diperbarui. Tes terdampak PASS: 6 kontrak Gateway dan 8 SQL/WASM. Tidak ada Cloud mutation/retry. Status tetap **BLOCKED** sampai RLS dipulihkan dengan approval Cloud terpisah.

Checkpoint setelah approval operator 2 November 2026: password database berhasil diterima, tetapi deployment **BLOCKED oleh guard keamanan SQL** (`STOP: existing private report RLS and tracking required`, baris 12-14). Guard menghentikan transaksi sebelum fungsi v2 dibuat; tidak ada bukti SQL commit atau Gateway deploy dan tidak ada retry otomatis. Perlu rekonsiliasi read-only RLS `public_reports` dan signature `track_report_v1(text,text)`; jangan melewati guard.

Checkpoint 2 November 2026: paket RK2 telah diperiksa terhadap SQL, Gateway, manifest hash, dan rollback. Preflight tanpa switch PASS dan tidak melakukan network call/mutasi. Status tetap **READY FOR EXPLICIT OPERATOR APPROVAL**, bukan DEPLOYED atau PASS LIVE. Scope Cloud tetap dua RPC service-only + deploy additive Gateway; RLS/policy/tabel/data/grant/secret, CAPTCHA, rate limiting, Storage, dan v1 tidak dilemahkan atau diubah.

2 November 2026: implementasi RK2 Base32 atas token CSPRNG existing (sekitar244 bit), receipt satu kode dengan copy/download, form satu kolom + mode lama, RPC service-only v2 dan rotasi operator. RLS/tabel/private grants tidak diubah; tidak ada Cloud call atau mutasi pada pekerjaan fitur ini. Rollout VITE_REPORT_SINGLE_CODE_ENABLED default false sampai deployment disetujui.21 kontrak/regresi +8 PostgreSQL/WASM (submit/review existing + expiry/revocation/rotation) +5 UI Chrome lokal PASS; lint/build/Edge typecheck PASS. Build tetap memiliki warning bundle >500kB existing. Cloud acceptance CAPTCHA/mobile belum diuji. [Paket deployment](runbooks/single-tracking-v2.md). Perbaikan E sebelumnya sudah diterapkan operator, probe anonim pasca-RLS count0 PASS; bagian lama berikut merupakan riwayat.

# Status pengembangan

**2 November 2026 - perbaikan koordinat laporan:** ditemukan laporan verified dengan angka koordinat hanya di `location_description`; parser frontend belum menerima format `latitude, longitude`, sehingga `coordinates` NULL dan peta benar menolak marker. `src/lib/geography.ts` kini menerima pasangan desimal tersebut. Laporan lama tidak di-backfill otomatis; laporan baru harus dikirim ulang setelah restart Vite. Build/lint perlu divalidasi ulang.

Pipeline foto publik lokal ditambahkan di `supabase/functions/report-publication/index.ts`: validasi staf, copy privat ke bucket publik terpisah, stripping metadata image, approval/revoke RPC. Belum deploy Cloud dan belum LIVE PASS.

**Daftar masalah aktual 2 November 2026 22:28 WIB:** marker peta sudah muncul untuk laporan baru yang memiliki `coordinates` valid. Foto belum tampil karena approval salinan aman gagal saat runtime dan sebelumnya UI menyembunyikan kode error Function. Parser frontend kini membaca body error Function; build/lint/typecheck PASS. Function `report-publication` dilaporkan operator sudah deployed, tetapi approval foto, sanitasi EXIF/GPS, dan akses anonim terhadap salinan belum LIVE PASS. Jangan mengulang SQL tanpa bukti error baru.

**2 November 2026 - foto publik dan peta:** Admin lokal memiliki kontrol persetujuan dan pencabutan publikasi foto melalui Edge Function `report-publication`; peta menerima `public_photo_path` hanya dari salinan bucket `public-report-evidence`. Build, lint, dan Edge typecheck PASS. **Belum DEPLOYED/LIVE:** sanitizer/copy tanpa EXIF/GPS belum tersedia dan flag approval tetap off. Foto asli `report-evidence` tetap privat.

**2 November2026 - temuan akhir E dan patch lokal siap; Cloud approval masih diperlukan:** operator meminta memakai laporan Flutter existing, bukan membuat2 TEST baru. UUID pilihan terbukti verified, history unverified->verified, audit UPDATE cocok dengan Admin. Tidak dimutasi. Format RPT legacy berbeda dari RS-only; shared parser/Web kini menerima kedua bentuk secara lokal, sedangkan patch predicate fungsi dan deploy Gateway belum dijalankan. Temuan izin baca nyata: client publik session=NULL HEAD kolom privat UUID itu200/count1, body tidak diambil. E RBAC/privacy FAIL sampai diperbaiki; dua restrictive SELECT policies PROPOSED menutup anon/non-staf dan menjaga reviewer/service-role. Tidak menganggap seluruh E PASS.6 tes kompatibilitas +9 regresi handler,7 PostgreSQL/WASM tracking,6 PostgreSQL/WASM privacy, grammar SQL/PLpgSQL, syntax PowerShell, lint/build dan Edge typecheck PASS. Semua tes baru lokal, bukan acceptance Cloud. Sembilan konten TEST tetap selesai/cleanup; tidak ada mutasi Cloud selain22 operasi konten yang telah disetujui. [Satu paket perbaikan reviewable](runbooks/stage-e-report-compat-privacy.md) mencakup2 restrictive SELECT policies,1 predicate tracking dan1 deploy Gateway ke dev saja; butuh persetujuan tambahan karena scope awal hanya CRUD TEST. Tidak mengubah Flutter/staging/secret/grants/data pengguna. Status di bawah adalah riwayat sebelum temuan laporan existing ini.

**2 November 2026 - E LIVE: sembilan konten selesai dan cleanup, laporan belum PASS.** Run yang sama `TEST-E-20261101-a881d0` dilanjutkan tanpa membuat ulang konten.9 creates+13 updates HTTP201/200;22 audit sesuai actor pada seluruh9 UUID. Artikel, kejadian/child/peta, kontak, panduan/checklist dan lokasi bantuan telah dibuktikan pada dev dan reader publik. Seluruh9 UUID kemudian diarsip/nonaktif/unpublish/unverified melalui aplikasi; GET anonim berdasarkan ID tanpa filter publikasi kini0 row, termasuk child. Audit/history tetap, DELETE0; tidak ada schema/security/deploy/A-D/staging/Flutter changes. Super Admin existing diverifikasi; audit anonim ditolak401/42501.

Auto-reload tambahan ditemukan pada watch Vite terhadap jurnal QA; `vite.config.ts` mengabaikan artefak QA/tooling tanpa mematikan HMR aplikasi. `TurnstileChallenge.tsx` menambah retry widget tanpa reload atau hilangnya draft; uji browser sungguhan PASS untuk retensi draft/retry, bukan CAPTCHA acceptance. Tab kontak LIVE dan menu SPA PASS; beberapa pola lain belum dapat kembali foreground dalam otomasi, meski dokumen/nilai/scroll tetap utuh, sehingga tidak diberi PASS penuh. Lint targeted dan full lint PASS, build PASS (warning bundle existing >500kB); unit/regresi lama tidak diulang.

Turnstile Chrome otomasi error600010, sedangkan operator menyatakan CAPTCHA Chrome biasa sukses. Operator kemudian melaporkan hasil submit/tracking gagal/tidak pasti; lookup exact dua judul TEST belum menemukan row. **Jangan retry submit sebelum rekonsiliasi. E tetap BLOCKED untuk laporan/tracking, bukan menunggu persetujuan Cloud baru.** Helper review operator membatasi UI/RPC pada UUID exact dua judul dengan guard tab tersendiri, tanpa menerima/mencetak kode/token. Hasil terbaru dan batas bukti ada di [STATUS E](qa/stage-e/STATUS.md); catatan di bawah adalah riwayat yang telah digantikan pembaruan ini.

**1 November 2026 - scope LIVE E disetujui; eksekusi menunggu sesi staf:** pengguna menyetujui seluruh paket E sekaligus pada dev uiuiouosblyuqgnvfpeh, maksimal2 laporan dan9 row konten/dependensi TEST, cleanup logis saja. `prepare-stage-e.ps1 -ApprovedStageEScope` telah dijalankan: content/review lokal aktif, global writes false, tanpa perubahan Cloud/security. Runner LIVE tanpa mock, server localhost5173 dan Chrome profil khusus sudah dibuka. Request guard membatasi row TEST/run ini serta memblokir DELETE. Browser masih pada /admin/login tanpa sesi/role staf; report baru0 dan row konten baru0. Login akun Super Admin existing dan CAPTCHA dilakukan operator langsung pada Chrome, tanpa kredensial/token ke chat. Tidak mengulang tes lokal/A-D/migration/impor/deploy atau mengubah Flutter/staging. Journal run `docs/qa/stage-e/live/TEST-E-20261101-a881d0.json`; scope tetap disetujui untuk dilanjutkan setelah login, tanpa meminta izin per modul.

**31 Oktober 2026 - seluruh paket E lokal selesai, LIVE belum PASS:** tracking, artikel, kejadian, kontak, panduan/checklist, lokasi, RBAC/audit, cleanup dan kontrak Flutter ditangani satu paket. Root auto-reset diperbaiki di lifecycle Auth (identitas sama tidak membuang cache/revision) dan RoleGuard (background isFetching tidak membongkar workspace). Semua pola editor mempunyai draft memori/resume; pemulihan terenkripsi opt-in per tab/akun tersedia, tanpa token/password/file sebagai draft, dan submit sukses membersihkan draft. Scope konten dev terpisah dari global/staf/settings/notifikasi; konten tetap off sampai satu paket LIVE disetujui. Review rutin dan Gateway existing dipertahankan.

Validasi aktual: **37/37 tes paket E PASS**, **23 regresi Auth PASS**, **23 skenario Chrome lokal PASS** termasuk10 tab switch nyata (DOM, nilai, fokus/caret, scroll), menu SPA/resume, encrypted reload/region recovery, seluruh alur konten, review/tracking sintetis, cleanup logis, audit reader dan role denial. **6 GET anonim LIVE HTTP200** untuk reader konten/sumber, bukan bukti CRUD/status/audit LIVE. Fixture PowerShell/check-only konfigurasi nyata PASS; lint PASS, build PASS (warning bundle existing). Cloud mutations0; tidak ada deploy/migration/A-D ulang, perubahan Flutter atau staging. Detail delapan fitur, file aktual, batas recovery/cleanup dan bukti ada di [STATUS E](qa/stage-e/STATUS.md). Satu paket persetujuan/tindakan operator ada di [runbook E lengkap](runbooks/stage-e-complete.md). Kontrak Flutter lokal terjaga; runtime mobile/BRD asli belum tersedia. Catatan E sebelumnya merupakan riwayat yang digantikan status ini.

**Review rutin laporan dev (30 Oktober 2026):** permintaan terbaru menggantikan mode uji satu UUID dengan alur review rutin bagi staf berwenang. `adminReportService.ts` kini menerima `VITE_DEV_REPORT_REVIEW_ENABLED=true` khusus target persis rekansiaga-dev, dan tetap memverifikasi identitas/role sebelum RPC `review_public_report`. Konfigurasi lokal telah memakai mode rutin, scoped approval false/UUID kosong, global writes false; konfigurasi lain dipertahankan. Laporan baru tidak memerlukan edit UUID atau restart ulang. Scope satu UUID masih tersedia untuk uji terbatas dan mengalahkan mode rutin jika diaktifkan. Autentikasi/RBAC/RLS, validasi alasan/status, RPC/history/audit tetap existing, tanpa UPDATE langsung atau pembukaan modul Admin lain.

Validasi lokal perubahan ini: **12/12 tes review PASS** (termasuk review rutin tiga UUID untuk dua role, penolakan anon/role lain/target staging, prioritas scope satu laporan, UI konfirmasi dan blokir modul lain), **1 tes regresi review existing PASS**, lint **PASS**, build **PASS** (warning bundle existing). Konfigurasi Vite efektif **PASS**; tidak ada Cloud request/mutation, migration/deployment, pengulangan A-D atau perubahan Flutter/staging. Satu restart Vite diperlukan untuk memuat konfigurasi baru; pembuktian keputusan LIVE tetap dilakukan operator melalui konfirmasi UI. Catatan pemindahan UUID dan instruksi cabut scope di bawah adalah riwayat mode uji sebelumnya, bukan prosedur rutin terbaru.

**Perpindahan laporan uji review (30 Oktober 2026):** laporan berikutnya tetap terkunci karena persetujuan sebelumnya hanya satu UUID. Sesuai laporan Testing yang sekarang dipilih operator, hanya `VITE_DEV_REPORT_REVIEW_ID` pada konfigurasi lokal dipindahkan ke UUID tersebut; scoped approval true dan global writes false dipastikan. Laporan sebelumnya tidak lagi termasuk scope, konfigurasi lain identik, target tetap dev. Pemeriksaan konfigurasi efektif Vite **PASS**, lint **PASS**, build **PASS** (warning bundle existing). Tidak ada perubahan source aplikasi, mutasi Cloud, migration/deploy atau perubahan Flutter/staging. Operator perlu restart Vite dan menguji keputusan pada laporan pilihan terbaru; review Cloud belum dijalankan agent. Mode satu laporan masih berlaku untuk laporan lainnya.

**Perbaikan Admin review satu laporan dev (30 Oktober 2026):** penyebab pesan "Penulisan remote belum disetujui" adalah UI dan service review bergantung pada `VITE_DEV_REMOTE_WRITES_APPROVED=false`. Persetujuan operator sekarang diterapkan melalui `VITE_DEV_REPORT_REVIEW_APPROVED` dan satu UUID `VITE_DEV_REPORT_REVIEW_ID` di konfigurasi lokal yang diabaikan Git. Target wajib URL persis rekansiaga-dev; scope aktif mengalahkan persetujuan global. Flag global tetap false sehingga modul Admin lain tetap tertutup. UI, submit melalui Enter, konfirmasi dan service memeriksa scope yang sama sebelum memanggil RPC `review_public_report`. Identitas/role staf diperiksa kembali; RPC existing tetap menangani RLS/RBAC, transisi status, history dan audit atomik. Tidak ada UPDATE langsung, migration, perubahan grants/RLS atau perubahan backend. Scope ini adalah guard operasional frontend, bukan pengganti otorisasi server.

Validasi perubahan review: `npm.cmd run test:report-review` **8 PASS**, regression existing `Report review validates reason/status then uses review RPC; no direct status update` **1 PASS**, `npm.cmd run lint` **PASS**, `npm.cmd run build` **PASS** (warning ukuran bundle existing). Konfigurasi Vite development efektif **PASS** untuk tepat satu laporan pilihan operator, dev target dan global writes false; flag Gateway aktif dipertahankan. Pengujian seluruhnya lokal dengan RPC/Auth sintetis; agent tidak menjalankan mutasi Cloud. Gateway aktif, submit Cloud dan laporan terlihat di Admin merupakan hasil LIVE yang dilaporkan operator dan menggantikan catatan E PREPARED sebelumnya. Review LIVE masih menunggu operator me-restart Vite, membuka laporan yang sama, memilih status lalu mengonfirmasi keputusan; keberhasilan wajib terlihat setelah reload beserta history/reviewer/waktu review. Status verified/rejected final. Sesudah uji, cabut scope dengan `VITE_DEV_REPORT_REVIEW_APPROVED=false` dan restart. Flutter, staging, A-D dan deployment tidak diubah/diulang.

**Perbaikan form wilayah ? Kabupaten/Kota satu tingkat:** RegionSelector sekarang menampilkan Provinsi ? Kabupaten / Kota ? Kecamatan ? Desa / Kelurahan. Query Kabupaten/Kota menggabungkan region_type regency dan city dengan parent provinsi yang sama; kecamatan mengikuti UUID kabupaten ataupun kota. Pergantian/clear induk menghapus semua pilihan turunan, respons lama tidak mengisi pilihan baru, dan value existing/edit/reset Admin dipertahankan secara benar. Tipe database/UUID dan sumber data existing tetap, tanpa migration atau perubahan Cloud.

Validasi perubahan ini: `npm.cmd run test:regions-ui` **11 PASS**, `npm.cmd run lint` **PASS**, `npm.cmd run build` **PASS** (warning bundle existing >500 kB). Browser Chrome nyata pada server lokal terisolasi **PASS**, memakai data dev melalui GET/OPTIONS read-only: Sumatera Barat memuat12 kabupaten +7 kota =19 pilihan, Kota Padang dapat dipilih, 11 kecamatan tersedia, pilihan kelurahan berfungsi, perpindahan ke Kabupaten Agam dan provinsi lain mereset turunan, runtime errors0, Cloud writes0. Screenshot lokal `.tools/region-selector-padang.png`. Percobaan awal harness memblokir preflight GET lalu diperbaiki agar mengizinkan OPTIONS read-only; aplikasi tidak perlu melonggarkan CORS. Tidak mengirim laporan, menjalankan audit A-C atau mengubah Flutter/staging/Gateway/flags.

**Status terbaru D/E:** D = DEPLOYED / DISABLED PASS berdasarkan bukti operator existing, tanpa redeploy atau pemeriksaan D ulang. E = PREPARED; lima nama secrets sudah PASS lewat CLI read-only, tanpa nilai ditampilkan/disimpan. Aktivasi, submit/track, Admin CRUD dan cleanup Cloud NOT_RUN karena persetujuan saat ini hanya persiapan. Skrip aktivasi operator dan E-ACTIVATION.md tersedia; BRD asli belum tersedia sehingga acceptance memakai shared contract existing dan menyatakan gap BRD.

**Tahap D terbaru ? dev-global:** blokir REPORT_TRUSTED_IP_HEADER sudah diselesaikan dengan bucket tetap pada RPC atomik existing. Header IP dan HMAC tidak dibaca; batas bersama5 submit/30 track per slot tetap600 detik, action terpisah. Enam secrets dilaporkan operator tersimpan. Tidak perlu migration atau mutasi DB Cloud. Gateway tetap disabled; deployment/live probe NOT_RUN. Status header/IP/HMAC sebagai blocker pada catatan lama di bawah sudah digantikan.

**30 Oktober 2026 ? C = DEPLOYED / PASS** berdasarkan hasil operator: 38/514/7285/83762, total91599, hierarchy_errors0; bukti existing `C-psql-verification.json`. Tidak mengulang import/audit A-C. D gateway existing siap dieksekusi operator ke dev, disabled, dengan origin `http://localhost:5173` dan Turnstile hostname `localhost`. Panduan: `operator-evidence/dev-release-20261029/D-GATEWAY.md`; skrip `scripts/deploy-dev-report-gateway.ps1`. Cloud deployment/aktivasi dan acceptance submit-track **NOT_RUN** oleh agent; memerlukan persetujuan cakupannya. Catatan pending C di bawah merupakan riwayat yang digantikan status ini. Validasi tooling D baru: parser PowerShell/check-only PASS, 5 skenario CLI mock PASS, 4 tes probe PASS. Tidak ada koneksi Cloud/submit nyata.

## Status terkini - preflight read-only dev-live-admin-v1 (26 Oktober 2026)

Keputusan **NO-GO untuk aktivasi Cloud**. Target ref dev terkonfirmasi dari host HTTPS dan header server sb-project-ref: uiuiouosblyuqgnvfpeh. Nama project dari Management API belum terverifikasi. GET aktual: enam sumber publik PASS/0 baris, sepuluh tabel privat menolak anon401/42501, Auth settings200, gateway OPTIONS404. Tidak ada Cloud mutation/deployment atau pengujian ulang frontend. Phase 4A tetap BLOCKED.

Perubahan lanjutan lokal: kontrak wilayah empat tingkat, trigger/function validasi hierarki, `RegionSelector` cascading, serta generator SQL nasional idempotent/resumable ditambahkan. Dataset resmi belum disalin ke repository karena ekspor Kemendagri memerlukan akses operator; validasi dan pembuatan SQL menolak data tanpa kode/parent resmi. Seeder remote **NOT_RUN** dan tetap memerlukan persetujuan terpisah.

Paket operator lanjutan tersedia di [runbook dev-live-admin](runbooks/dev-live-admin-operator.md). Backup lokal sebelum perubahan disimpan di session storage. Konverter `scripts/convert-regions.py` menerima CSV/JSON/XLSX resmi dan menghasilkan NDJSON tanpa edit manual per baris. Katalog dev tetap **NOT_VERIFIED**, gateway tetap **NOT_VERIFIED**, dan keputusan tetap **NO-GO** sampai checkpoint operator dijalankan pada project dev yang benar.

Perbaikan lokal selesai: view public config dibuat SELECT-only walaupun default grants luas; backup/quota diprivatisasi; konflik overload RPC tidak ditimpa; fingerprint metadata/function melindungi rollback dari drift dan memverifikasi pemulihan baseline. Gateway menolak konfigurasi dev/origin/hostname/header yang tidak valid, CAPTCHA tanpa hostname/action yang cocok, dan tidak mengabaikan error cleanup. Duplicate apply/recovery/re-apply berhenti aman, bukan installer idempoten. Data/evidence/backup/quota sengaja dipertahankan; jangan dihapus untuk memaksa retry.

Validasi terbaru: parser65 statement/11 blok release dan25/4 rollback, 19 tes PostgreSQL18.6 lokal PASS, 12 tes backend gateway PASS, ESLint backend dan typecheck Edge PASS. Fixture lokal Auth/Storage dan stub PostGIS bukan bukti Supabase Cloud, concurrency, JWT atau Flutter. Bukti: [preflight](qa/live-admin/preflight.json), [runtime](qa/live-admin/preflight-runtime.json), [probe dev](qa/mvp/dev-readonly.json).

Hanya blocker eksternal tersisa: (1) hasil katalog administratif dev untuk membandingkan schema/RLS/grants/default ACL/RPC/dependensi/Storage serta kesiapan role Auth; akses publishable tidak cukup, konektor Supabase belum terhubung; (2) konfigurasi provider CAPTCHA, origins/hostnames/sitekey, server secrets/HMAC, trusted ingress IP dan Storage privat belum terverifikasi. Satu ekspor metadata tanpa isi data disiapkan di [SQL read-only](sql/dev-mvp-readonly.sql). Jangan mengirim secret/JWT ke chat. Tidak meminta persetujuan aktivasi sebelum blocker selesai. Runbook persetujuan tunggal tetap pada [kontrak bersama](mvp-shared-contract.md).

Bagian berikut merupakan riwayat sebelum perbaikan preflight ini; angka parser dan batas runtime lama digantikan bukti terbaru di atas.

## Status terkini - live backend integration lokal dan kontrak review opsional (26 Oktober 2026)

Milestone aktif melanjutkan source existing. Main database tetap rekansiaga-dev / uiuiouosblyuqgnvfpeh; staging hanya security testing. Phase 4A tetap BLOCKED. Tidak ada Cloud write/migration/deployment/Auth provisioning, pemindahan fixture staging, bootstrap, penghapusan remote atau perubahan kode aplikasi Flutter.

Implementasi: seluruh route admin memakai service database untuk artikel (pagination server20, draft/publish/archive, URL cover publik), kejadian/pembaruan/lokasi, panduan/checklist, kontak, lokasi bantuan, sumber data, settings allowlist, staf/role melalui RPC, rules/queue notifikasi dan audit read-only. Query utama tidak memakai mock/localStorage; route studio demo dihentikan. RoleGuard tetap fail closed, mutasi memverifikasi izin, error/zero-row mutation tidak menjadi sukses, konfirmasi tersedia untuk delete/role/review. Search backend didebounce300ms. Modul admin belum diklaim LIVE sampai persistence dan otorisasi dev dibuktikan.

Perbaikan review penting: reason boleh NULL; kolom tidak diisi dikirim NULL. String yang diisi tetapi hanya whitespace ditolak. Batas4000 setelah ASCII trim PostgreSQL menggunakan Unicode code points, bukan UTF16 length. Frontend/service/SQL sudah selaras; normalisasi masuk history, transisi wajib, lock/recheck role/update/history/audit tetap atomik pada rancangan SQL. Signature public.review_public_report(uuid,text,text DEFAULT NULL) dipertahankan. SQL belum dieksekusi pada Cloud, sehingga runtime atomicity/RLS tetap NOT_RUN.

Publik: artikel/detail, guide/checklist/detailUUID, monitoring/riwayat, kontak/fasilitas, koordinat geography EWKB/WKT dan peta pilihan OSM dari database. Client publik anonim terpisah dari sesi admin. Filter publikasi eksplisit pada artikel/guide/event dan parent lokasi; tidak ada marker palsu. URL cover lama tidak diubah jika editor tidak menyentuhnya; upload gambar artikel belum dikonfigurasi. Donasi tetap SIMULASI. Push/BMKG live belum diuji/diaktifkan.

Sinkronisasi: satu timer publik per app20detik hanya visible/online; query aktif, dedup inflight, refetch setelah mutasi, tab aktif dan reconnect; admin aktif30detik, role60detik. Timer dibersihkan saat unmount. Tidak ada Postgres Changes/Broadcast/subscription private. Bukti browser menunjukkan perubahan dari klien lain muncul pada siklus polling dan focus/reconnect, tetapi semua respons browser tersebut sintetis; bukan pembuktian Cloud lintas klien atau Flutter.

Gateway lokal: mandatory CAPTCHA/server validation, hostname/action, durable quota global+HMAC client, max body/photo, MIME/magic bytes, private bucket, service-only submission/tracking RPC, signed attachment60detik sesudah Auth/role/RLS. Token tidak ditaruh pada URL/storage/cache/log. Definite SQL rejection berbeda dari uncertain commit agar evidence yang mungkin sudah tersimpan tidak dihapus. Frontend masih disabled karena aktivasi belum disetujui. Status gateway dev OPTIONS404 aktual; pelaporan, upload, review dan tracking live BLOCKED.

QA aktual terbaru: lint PASS, build/typecheck Web PASS (bundle utama676.41kB/gzip197.01kB, warning>500kB), typecheck Edge PASS. Test kontrak/admin/gateway25/25 PASS termasuk reasonNULL/blank/4000 Unicode; Auth23/23 PASS. Browser terisolasi34 layouts+11skenario integrasi PASS; Auth browser11skenario PASS; regresi publik70layouts+14kelompok interaksi PASS. Respons HTTPS browser dicegat/diblokir dan tidak dianggap Cloud PASS. PostgreSQL/pglast menerima59statements/10PLpgSQL release dan24statements/3PLpgSQL rollback; parser bukan runtime/dependency validation. Helper PowerShell JWT tersembunyi lolos parsing tanpa prompt/network; runner live default NOT_RUN/no-network. Scanner195 source/build files tidak menemukan pola privileged key yang dikenal, bukan exhaustive secret audit.

Bukti remote aktual docs/qa/mvp/dev-readonly.json: enam API publik dev200/0visibleRows; sepuluh tabel privat/operasional anon401/code42501. Auth settings200, raw REST artikel200, gatewayOPTIONS404. GET peta dengan filter parent publik juga berhasil/0baris. Tidak ada sesi staf/SQL catalog/Storage admin yang disediakan; full grants/RLS/Auth-role/RPC runtime belum terbukti. Plugin Supabase ditemukan tersedia namun belum terpasang/terhubung; tidak mengubah koneksi atau melakukan instalasi. Operator dapat menghubungkan konektor yang sebelumnya ditawarkan atau menjalankan paket yang sama lewat Dashboard.

Paket lokal final: supabase/releases/dev-live-admin.sql, rollback, report-gateway/_shared, config+template server-only; preflight docs/sql/dev-mvp-readonly.sql. Release memiliki guarded dev acknowledgement, snapshot dan function/ACL drift check saat rollback; tidak menyalin staging, menonaktifkan RLS atau drop tabel aplikasi. Rollback mempertahankan audit/report/privatefiles/quota/backup dan memerlukan review drift izin/policy. Site_name/public_notice adalah usulan allowlist yang perlu sign-off karena BRD asli tidak ditemukan. Bukan izin write otomatis.

Kontrak/API/activation/recovery dan scope persetujuan tunggal: [mvp-shared-contract.md](mvp-shared-contract.md). Daftar perubahan: [files-changed.md](files-changed.md). Cloud acceptance artikel/mitigasi/kejadian/report/RBAC/sync, SQL runtime/concurrency/fault cases, CAPTCHA nyata, Storage dan aplikasi Flutter tetap NOT_RUN/BLOCKED. Tidak mengubah gate keamanan menjadi COMPLETE.


## Riwayat - Web MVP dan shared dev backend (26 Oktober 2026)

Keputusan final: rekansiaga-dev / uiuiouosblyuqgnvfpeh adalah backend utama Web dan Flutter; staging / fweeyflixnqbvvceuent hanya security testing. Konfigurasi lokal tetap dev, publishable key tidak dicetak. Validator bersama runtime dan Vite sebelum bundling menolak staging, project lain, dan privileged/legacy key. Tidak ada migration/bootstrap, remote write, perubahan grants/RLS, Auth provisioning, pemindahan CONTROL/SUBJECT, atau deployment. Phase 4A tetap BLOCKED; temuan dan laporan keamanan lama dipertahankan.

Implementasi lokal: service baca artikel (daftar/detail slug), panduan/checklist, kejadian dan kontak terverifikasi dari dev. Loading/empty/error/retry, timeout 12 detik, validasi bentuk respons, sumber dan waktu, ringkasan dashboard dan filter monitoring tersedia. Query publik membatasi status publikasi meskipun staf sedang login. Peta menampilkan daftar kejadian, sementara renderer geografis tetap belum tersedia. Auth/protected route tetap fail closed; cache konten admin dibersihkan saat siklus sesi berubah.

CMS artikel remote disiapkan dengan validasi input, pemeriksaan ulang identitas/role, response representation wajib sebelum sukses, id + updated_at untuk update/delete, dan default write guard false. BELUM diuji live, BELUM diaktifkan/disetujui; flag bukan pengganti RLS. Studio /demo menyediakan create/edit/publish/archive/delete localStorage tanpa akun, dengan banner SIMULASI dan mode publik eksplisit; tidak mengirim data ke Supabase/Flutter. Donasi SIMULASI; laporan/tracking hanya validasi dan draf lokal. CRUD admin selain artikel, review laporan, BMKG langsung, notifikasi, dan peta interaktif belum diimplementasikan.

Bukti remote GET read-only aktual: service aplikasi berhasil membaca empat sumber publik dev; semuanya 0 baris terlihat. Anon ditolak HTTP401/code42501 pada staff_profiles, staff_role_assignments, roles, public_reports, report_access_tokens. Ini bukti akses API efektif terbatas, BUKAN bukti katalog/RLS/grants lengkap atau authenticated CRUD. Root OpenAPI HTTP401. SQL catalog read-only disiapkan untuk operator, tidak dijalankan. Tidak ada koneksi SQL/sesi staf dev yang disediakan.

Flutter: repository aplikasi tim tidak tersedia. integration/flutter menyediakan adaptor Dart native READ artikel/panduan dengan project/kolom/filter yang sama dan template env. dev.local.json di-ignore dibuat dari konfigurasi Web tanpa mencetak key. Analisis Dart PASS/no issues dan live Dart GET dev PASS (artikel0/panduan0). Flutter UI/build APK/perangkat/Auth dan baris bersama Web-Mobile NOT_TESTED; tidak mengklaim integrasi aplikasi Flutter selesai.

QA aktual: npm run lint PASS; npm run build PASS (tsc + Vite, chunk utama 681.09 kB/gzip198.80 kB, warning >500 kB tetap); npm ls --depth=0 PASS, dependency/lockfile dipertahankan. Test MVP 8/8 PASS termasuk build-time rejection staging/secret dan default zero-write; isolated Auth 23/23 PASS. Chrome public regression 70 route/viewport checks +14 kelompok interaksi PASS; Chrome MVP 30 route/viewport checks +11 skenario PASS; browser Auth 11 skenario PASS dengan respons sintetis. Public/MVP/Auth browser bukan acceptance remote RLS. Scanner 174 source/build files PASS untuk pola Supabase privileged key yang dikenal. Browser HTTP localhost200; semua request remote browser QA dicegat/diblokir, nol DB writes. Kendala awal sandbox Chrome dan fixture OPTIONS CORS diselesaikan lalu pengujian terkait diulang; tidak dihitung sebagai bukti remote.

Kontrak, skenario demo lokal, batas bukti, dan satu paket operator: [mvp-shared-contract.md](mvp-shared-contract.md). Bukti GET Web/Dart dan browser MVP di docs/qa/mvp; Auth/public regression memakai lokasi QA existing. P0 live tersisa: hasil katalog/otorisasi staf dev, sesi staf berizin, persetujuan scope satu artikel SIMULASI beserta cleanup, dan aplikasi/perangkat Flutter tim. Tidak melanjutkan audit staging sebagai penghambat pekerjaan frontend lokal.


## Status terkini - accelerated Phase4A local security completion (23 Oktober 2026)

Operator melaporkan checkpoint A 27 policies/1 profil/1 assignment sebelum ROLLBACK: PASS USER-REPORTED CHECKPOINT ONLY. Tidak ada ekspor per-case/JWT atau fresh post-ROLLBACK 26/0/0/A absent pada pesan terbaru; konfirmasi tetap BLOCKED. Baseline Phase4A.4 tidak diaudit ulang. Overall Phase4A BLOCKED.

Paket lokal diselesaikan pada docs/sql/staging/security-completion: deployment A/B/C1 permanen terpisah dan guarded, A exact-policy permanent rollback, B containment dengan security floor tetap, C1 read-only recovery tanpa membuka broad defaults, B rollback-only fault injection, C1 creator probes dan targeted read-only stage validator. Source proposal/rehearsal ROLLBACK lama tidak diubah; source/approved rehearsal SHA256 cocok sebelumnya. Gate execution A -> acceptance -> B -> acceptance -> C1, reason contract B dan global future-functions scope C1 tetap perlu persetujuan. C2 tidak disentuh.

scripts/prepare-phase4a-fixture.mjs hanya menghasilkan guarded committed-fixture SQL private setelah verifikasi manifest exact ref/run/dua UID; tidak execute atau overwrite output. Sembilan state SQL dan satu report-fixture SQL operasional disiapkan private; semua approval GUC tetap dikomentari. USER tidak pernah menghapus profil existing/FK references. scripts/test-phase4a-api.mjs default no-network; operator-only --live + environment approval/public key/own JWT. Suite A serial role/self/foreign/negative mutation, B input/status/history/race, known-report authorization option, forged JWT dan dedicated refresh/logout. HTTP race dispatch bukan bukti lock contention; observasi lock dua koneksi dan atomicity tetap gate tersendiri. Tidak mengakses password/JWT/key/.env, menjalankan remote, memprovision Auth, mengubah manifest approval, atau mengubah dev/React/Flutter.

QA lokal aktual: node --test scripts/test-phase4a-package.mjs 10/10 PASS; node --check dua entrypoint PASS; canonical A/B payload parity/source approved rehearsal hashes/private ignore rule/local links PASS. Bounded lexer memverifikasi satu outer BEGIN/final COMMIT atau ROLLBACK sesuai file; bukan parser/compile PostgreSQL. Lint PASS exit0, build PASS exit0; main585.95kB/gzip171.03kB warning>500kB tetap. PostgreSQL compiler/runtime, live JWT/API/atomicity/concurrency/UI/Flutter NOT_RUN/BLOCKED. Laporan final, runbook utama, A test plan dan existing CSV diperbarui; tidak membuat laporan JSON/manifest tambahan.

## Status terkini - Phase 4A.5A approved rollback-only dry-run preparation

Pengguna memberikan persetujuan eksplisit untuk dry-run ROLLBACK-only pada staging ref fweeyflixnqbvvceuent/run `phase4a5a-a-20261023-f768e9e3fb2f4223ac497e84871a1c1f` dan dua UID terdaftar. Manifest privat merekam scope persetujuan terbatas (fixture_mutations_approved=true untuk rehearsal ini), bukan izin A persisten/API/B/C1. SQL operasional dan instruksi/review lokal disimpan di folder private yang di-ignore. Sumber template/proposal tidak diubah; copy mengisi acknowledgement/ref/run/UID dan memperketat guard exact ref/run/dua mapping UID sebelum DML. Policy A, sembilan simulation states dan checkpoint tetap identik.

Pemeriksaan statis/lexical: satu BEGIN/final ROLLBACK, tidak ada COMMIT statement atau transaction control di DO, tidak ada auth-table writes, semua placeholder terisi, private ignore rule PASS. PostgreSQL/psql/pglast lokal tidak tersedia; syntax/semantic review bukan compilation/runtime proof. Operator menjalankan SQL lengkap; Codex tidak melakukan SQL remote/provisioning/permanent migration atau mengubah dev/React/Flutter/B/C1. Expected in-transaction27policies/1restoredprofile/1assignment, setelahrollback26/0/0 dan policyA absent. Phase4A BLOCKED. QA:14 local preparation checks PASS (lexical transaction boundaries, exact pins, policy/simulation/checkpoint parity, private ignore rule, source/artifact SHA256). `npm.cmd run lint` PASS exit0; `npm.cmd run build` PASS exit0 (585.95 kB/gzip171.03 kB; warning>500kB tetap). PostgreSQL parser/compiler/runtime dan JWT/API tetap NOT_TESTED.

## Status terkini - Phase 4A.5A Auth fixture UID registration

Manifest operasional privat untuk run `phase4a5a-a-20261023-f768e9e3fb2f4223ac497e84871a1c1f` dan ref `fweeyflixnqbvvceuent` dicocokkan. Dua UID CONTROL/SUBJECT diisi sesuai laporan operator; keduanya canonical UUIDv4 RFC4122 dan berbeda. Pemetaan UID/provenance disimpan hanya pada manifest private yang di-ignore, tanpa email/password/JWT. Struktur field dipertahankan; kind menandai registration USER_REPORTED/NOT_APPROVED dan notes menyatakan kedua akun Confirmed menurut pemeriksaan manual Supabase Dashboard, bukan akses Cloud/Auth API oleh Codex.

fixture_mutations_approved tetap false. Existing UID tak terduga akan menghentikan registrasi, bukan ditimpa. Ignore rule private folder diverifikasi melalui temporary Git repo terisolasi. Tidak ada akun dibuat, SQL/dry-run/migration A/B/C1 dijalankan, atau perubahan dev/React/Flutter. Manifest siap review persetujuan dry-run terpisah, bukan runtime/Auth/session PASS. QA: project/run/UUID/contract/approval and private ignore-rule checks PASS. `npm.cmd run lint` PASS exit0; `npm.cmd run build` PASS exit0 (585.95 kB/gzip171.03 kB; warning chunk>500 kB tetap). Registrasi lokal tidak menguji Auth/JWT/API atau menjalankan SQL.

## Status terkini - Phase 4A.5A operational fixture manifest preparation

Template dan fixture review dibaca; seluruh required fields/actor labels/types divalidasi. Salinan operasional dibuat pada folder lokal `docs/qa/phase4a/remediation-a/private/` dengan project reference staging `fweeyflixnqbvvceuent` dan run ID `phase4a5a-a-20261023-f768e9e3fb2f4223ac497e84871a1c1f`. Struktur/nilai kontrak template dipertahankan; hanya project_reference dan run_id diisi. CONTROL/SUBJECT user_id tetap null, fixture_mutations_approved tetap false; tanpa password/key/JWT/email. Template asli tidak diubah. Operator approval belum diberikan oleh persiapan ini.

Folder private ditambahkan ke .gitignore; ignore rule diuji memakai temporary Git repository terisolasi, bukan menginisialisasi repo workspace. Tidak ada akun Auth, SQL remote, migration atau perubahan dev/React/Flutter. Berhenti pada persiapan manifest; B/C1 tidak dimulai dan Phase 4A BLOCKED. QA: validasi struktur/required fields/labels, exact clone kecuali dua field target/run, template byte unchanged dan ignore rule PASS. `npm.cmd run lint` PASS exit0; `npm.cmd run build` PASS exit0 (main585.95kB/gzip171.03kB, warning bundle>500kB tetap). Tidak ada provisioning/SQL/API execution.

## Status terkini - Phase4A.5A fixture review

ReviewfocusedA, tanpa baselineauditulang/querybaru. Minimum2distinctAuthIDs (CONTROL+SUBJECT) dengan9serialstates termasuk crosssame-role danactive/inactive/multirole; alternate9staticaccounts hanya jika tidakdapat mengelola serialtransitions. Template/matrix/mainrunbook diselaraskan. Kesalahanmaterial rehearsal lama: ekstraksi CREATEPOLICY dari komentar menyisipkan invalidSQL dan BEGINkedua; diperbaiki dengan anchored executablepolicy extraction,satubegin/finalrollback. ProposalA asli tidakdiubah.

Fixtureexistingaccount handling failclosed, reusehanya manifestownedUUIDsapproved; noAuthupsert/autoreset/deletion. Newdryrun includesmanifeststagingref/run/approvalcrosscheck dan2UUIDguards, sortedstate order, rollback; NOT_RUN SQL/JWT/API. A persistengated sesudah dryrunreviewapproval; B/C1 ONHOLD. NoRemote/dev/React/Flutterchanges. QA: `npm.cmd run lint` PASS exit0; `npm.cmd run build` PASS exit0 (main585.95kB/gzip171.03kB; warning>500kB tetap). Bounded lexical splitting verifies one top-level BEGIN/finalROLLBACK, one exact executable A policy and no malformed comment fragment; two-identity/nine-state/approvalnull checks, NOT_RUN matrix, local links and proposal SHA256 checks PASS. Evidence in `docs/qa/phase4a/remediation-a/readiness-review.json`. No PostgreSQL parser/runtime/JWT/API or provisioning performed.

## Status terkini - Phase4A.4 closure dan Remediation A preparation

Final gaps JSON diterima dan seluruh evidence Phase4A.4 direview offline.200default coverage cocok:167text-identical,23 extensions.gen_random_uuid binding deltas accepted sesuai bootstrap search_path dan10 ::text literal;24membership options match graph,authenticator SETtrue/INHERITfalse,client no parents;27schema client pairs CREATEfalse dan database CREATEfalse/TEMPtrue. Phase4A.4 **BASELINE VERIFIED WITH KNOWN SECURITY FINDINGS**; Phase4A **BLOCKED**. Tidak ada query audit tambahan, remote SQL/dev/config changes atau A/B/C1 diterapkan.

Paket `docs/phase4a-remediation-a-test-plan.md`,manifest template/CSV di `docs/qa/phase4a/remediation-a/`,dry-run/rollback review SQL baru disiapkan. Exact proposalA policy dipertahankan;10Auth fixture UUID NULL/approvalfalse,9profile/9assignment hanya transaksional. SQL claims simulation tidak dianggap JWT proof. B/C1 ON HOLD sampai A real acceptance. QA lokal: `npm.cmd run lint` PASS exit0; `npm.cmd run build` PASS exit0 (585.95 kB/gzip171.02 kB; warning>500kB tetap). Offline evidence/default coverage/delta/membership comparison, source JSON/proposal immutability, exact policyA parity, fixture10/9/9 counts, matrixNOT_RUN, local links dan final ROLLBACK boundaries PASS. SQL rehearsal/rollback belum dikompilasi/dijalankan PostgreSQL dan API tidak diuji.

## Status terkini - Phase 4A.4 final evidence review

Seluruh JSON audit dibaca; tiga ekspor live pengguna (supplemental/full security/event graph) kini tersedia. `scripts/review_phase4a4_evidence.py` melakukan offline multiset comparison dan recompute body hashes; `docs/audits/phase4a4-final-evidence-review.json` menyimpan provenance/checks/diffs. Nol perbedaan bounded pada tabel/200 column type-nullability/106 constraints/61 index/26 policy/52 table grants/6 trigger definitions;400 column privilege pairs cocok;5 app bodies/ACL/owner/path cocok;exact seeds dan event graph preservation PASS metadata. EXECUTE review anon/PUBLIC sekarangfalse. Tetap open: super-only role policy, review NULL/reason, broad defaults termasuk postgres storage schema exception. Default expressions/per-edge PG17 membership options dan real JWT/API/concurrency belum lengkap.

Laporan `docs/phase4a4-final-baseline-audit.md` dan query `docs/sql/staging/phase4a4-final-readonly-gaps.sql` disiapkan; A/B/C1 readiness/acceptance/rollback/urutan dipisah per tahap. Phase 4A BLOCKED; tidak ada remote SQL/dev/config change atau proposal remediation diterapkan. QA: offline evidence comparison PASS (zero diff pada10comparison groups,5recomputed body/ACL checks,exact event graph), semua input JSON SHA256 dan proposal A/B/C tetap sama; document links/read-only/final ROLLBACK checks PASS. `npm.cmd run lint` PASS exit0; `npm.cmd run build` PASS exit0 (585.95 kB/gzip171.02 kB; warning>500kB tetap). SQL gap belum dikompilasi/dijalankan PostgreSQL; API/concurrency tidak diuji.

## Status terkini - Phase 4A.4 baseline staging validation (23 Oktober 2026)

Deployment permanen manual dan enam agregat 26/26/6/26/4/2 serta validator sukses dilaporkan pengguna; provenance disimpan dalam `docs/audits/phase4a4-staging-baseline-user-report.json`. Result sets detail pasca-deployment belum tersedia, sehingga manifest/grants/function/default ACL/event preservation belum PASS. Cast roles utama sudah tersimpan; standalone structure validator tanpa cast diperbaiki dan NOT NULL handling diselaraskan lokal. `docs/sql/staging/phase4a4-baseline-supplemental-readonly.sql` disiapkan untuk raw catalog/function/ACL/seed checks tanpa RPC. Laporan `docs/phase4a4-staging-baseline-validation.md` memuat matriks evidence/status, risiko, instruksi SQL Editor read-only serta urutan fixture/A/B/C1 dan review rollback; docs status diselaraskan tanpa menghapus history.

Tidak ada SQL remote/remediation/fixture mutasi, Docker, dev changes atau perubahan config React/Flutter. **Phase 4A tetap BLOCKED dan staging belum READY** sampai hasil detail, authenticated API dan concurrency memadai. QA lokal: `npm.cmd run lint` PASS exit 0; `npm.cmd run build` PASS exit 0, main 585.95 kB/gzip 171.02 kB, warning >500 kB tetap. Cast kedua validator, manifest identik (26/200/106/61/26/52/5), hash fungsi expected query tambahan, read-only/final ROLLBACK, checksum proposal deployment/verifikasi dan link dokumen PASS offline. Checksum validator utama berbeda dari catatan audit lokal lama; file saat ini ditinjau dan tidak diubah task ini, kesamaan exact versi SQL Editor belum terbukti. Hasil lokal di `docs/audits/phase4a4-local-review.json`; bukan parser/compiler/runtime PostgreSQL atau API acceptance.

## Status terkini - final staging deployment verification

Review lokal seluruh proposal deployment selesai. `docs/sql/staging/phase4a3-final-deployment-verification.sql` dibuat: baseline DDL/ACL/seed, approval guard, staging guard dan hard checkpoint sama dengan proposal permanen; statement terakhir ROLLBACK. Empat acknowledgement exact dari bukti yang sudah direview, project ref tidak direka. Dua setting operator tetap harus diaktifkan setelah verifikasi Dashboard; token approval pada salinan rollback hanya fixture untuk menguji gate, bukan persetujuan COMMIT.

Checkpoint proposal permanen/validator diselaraskan: ordering nama tabel eksplisit C dan hitungan 106 untuk PK/FK/UNIQUE/CHECK; PG18 NOT NULL dibandingkan melalui manifest kolom. Tidak mengubah definisi database, file bootstrap awal, helper/event existing, remediation A/B/C, config Web/Flutter atau database remote. Guard/checkpoint/DDL parity, empat ack, satu BEGIN/final ROLLBACK, evidence hashes dan manifest scope PASS pemeriksaan lokal; checksum artefak/review diperbarui dalam `docs/audits/phase4a3-deployment-preparation-review.json`. Instruksi ada di header SQL dan runbook staging.

QA: `npm.cmd run lint` PASS exit 0; `npm.cmd run build` PASS exit 0, main 585.95 kB/gzip 171.02 kB, warning chunk >500 kB tetap. Tidak ada parser/compiler/runtime PostgreSQL lokal yang digunakan, tidak ada SQL Cloud dijalankan. **Review statis PASS; runtime dry-run final NOT TESTED; staging READY dan Phase 4A COMPLETE tetap BLOCKED.**

## Status terkini ? Phase 4A.3 staging deployment preparation

Dry-run JSON dibaca: 26 tabel/26 RLS/6 routines/event O PASS di dalam transaksi. Post-ROLLBACK 0/0/1 user-reported, bukan full graph/ACL preservation evidence. Deployment permanen lokal disiapkan dalam `docs/sql/staging/phase4a3-deploy-staging-review.sql`; seluruh guard dan baseline DDL/ACL/seed dipertahankan, ditambah approval/ref dan hard pre-COMMIT assertions. `phase4a3-post-deployment-validation.sql` read-only menggabungkan assertions, manifest struktur/policies/grants dan seeds. Runbook `docs/phase4a3-staging-deployment.md` menjelaskan dependency, persetujuan, target identity limitation, checklist, recovery, expected/actual dan risiko.

Staging/Phase 4A tetap BLOCKED sampai deployment disetujui/dilakukan manusia, validasi pasca-COMMIT dan authenticated API/concurrency memadai. File dry-run/acknowledgement/Master/remediation tidak diubah; tidak ada remote SQL, Docker, env/client/config Web/Flutter atau dev-data copy. Bagian terdahulu adalah riwayat; status dry-run pending sudah digantikan pembaruan ini. QA lokal: `npm.cmd run lint` PASS exit 0; `npm.cmd run build` PASS exit 0 (main 585.95 kB / gzip 171.02 kB; warning bundle >500 kB tetap). Pemeriksaan lokal baseline DDL/ACL/seed dan guard exact, 26 table definitions, 6 asserted signatures, manifest constraints 106/index 61, satu transaksi read-only validator, boundary COMMIT/ROLLBACK, checksum Master/bootstrap/acknowledgement dan link dokumentasi PASS. Hasil tersimpan di `docs/audits/phase4a3-deployment-preparation-review.json`. Ini bukan PostgreSQL parse/compile/runtime test; SQL baru dan query validasi belum dijalankan pada database.

## Status terkini â€” Phase 4A.3 final event-trigger review

Seluruh `docs/audits/phase4a3-existing-event-trigger-review.json` (capture 22 Oktober 2026 23:09:45 WIB) ditinjau lokal; SQL inspeksi dijalankan pengguna, bukan Codex. Candidate definition + tujuh event definitions fingerprints dan JSONB event graph cocok; exact metadata/link/deps sesuai guard. `rls_auto_enable` PASS statis untuk controlled dry-run: postgres definer, pg_catalog path, trusted DDL metadata public, quoted identifier dan hanya ENABLE RLS. Error helper ditelan sebagai LOG sehingga explicit ENABLE dan flag 26/26 tetap wajib. General untrusted-session/temp-type/DDL privilege hardening tidak diklaim PASS.

`docs/phase4a3-event-trigger-final-review.md` dibuat; staging preparation/final report diperbarui. Fragment empat acknowledgement SET LOCAL di `docs/sql/staging/phase4a3-dry-run-acknowledgement.sql` disiapkan dengan definition MD5 846ec2fbff751d24b890656d63c3a9bf dan graph 7fe832217540802b68d6d56c6ba30f47. Wajib same transaction bootstrap penuh setelah BEGIN, fresh trusted staging session, ROLLBACK tetap. Tidak mengubah helper/event remote, bootstrap source, remediation, Docker, dev/staging database atau Web env/config.

**Review PASS terbatas; staging/Phase 4A tetap BLOCKED** sampai dry-run actual, rollback preservation, struktur/grants/security persisten dan authenticated API/concurrency memadai.

QA final event review: lint/build PASS exit 0 (main 585.95 kB / gzip 171.02 kB, warning >500 kB). Metadata snapshot fields, source SHA256, delapan definition rows, graph MD5 reconstructed for supplied JSONB values, guard/inspector expression parity, empat acknowledgement mappings dan document links PASS pemeriksaan lokal. Tidak mengompilasi/menjalankan PostgreSQL, tidak membuktikan freshness Cloud, dan tidak mengeksekusi acknowledgement fragment.

Perbaikan inspector atas instruksi pengguna: blok `public_routines` di `docs/sql/staging/phase4a3-inspect-rls-auto-enable.sql` diganti dengan kode yang diberikan, menempatkan ORDER BY di dalam jsonb_agg. Lint dan build setelah perubahan PASS exit 0; warning bundle >500 kB tetap. SQL tidak dieksekusi pada PostgreSQL/remote; lint/build bukan validasi sintaks SQL.

## Status terkini â€” Phase 4A.3 bootstrap guard revision

User-reported preflight Cloud staging: 0 public relations, satu public.rls_auto_enable() postgres definer, ensure_rls ddl_command_end/O, extension dependency NULL. Dicatat dengan provenance pada `docs/audits/phase4a3-staging-preflight-user-report.json`; body/return/event-owner/tags/ACL/linkage lengkap belum diterima sehingga review perilaku **BLOCKED**, bukan aman berdasarkan nama.

Bootstrap guard direvisi untuk exact candidate metadata + owner/return/type/OID-link/status/dependencies + behavior-review attestation dan definition/all-event-graph fingerprint pinning. Zero-routine path tetap ada; extra routines/overloads/public relations tetap ditolak. Menjaga existing helper/event tanpa DROP/DISABLE/REPLACE, session mode origin dan penutup ROLLBACK. Query `phase4a3-inspect-rls-auto-enable.sql` read-only dan dry-run checkpoint disiapkan; preflight output diperluas. Panduan staging/laporan final/acceptance diperbarui. Tidak ada SQL remote, remediation, Docker, client/env atau app-source change.

**Staging/Phase 4A tetap BLOCKED**: fungsi/body graph belum direview dan dry-run/rollback preservation belum diuji. Satu helper yang direview hanya pengecualian metadata ketat, bukan whitelist nama.

QA revisi: lint PASS exit 0, build PASS exit 0 (main 585.95 kB / gzip 171.02 kB, warning >500 kB). Pemeriksaan lokal kesamaan ekspresi event-graph digest inspector/guard, Master checksum/5 app bodies unchanged, 26 app tables, tanpa alteration helper/event, batas read-only/rollback, provenance JSON dan link dokumen PASS. Ini bukan SQL compile/runtime guard tests; kasus negatif belum diuji. Tidak ada PostgreSQL/Cloud execution atau app-source/config change.

## Status terkini â€” Phase 4A.3 staging database preparation

Master `supabase/migrations/001_rekansiaga_initial_schema.sql` kini tersedia, dibaca lengkap dan tidak diubah. Script offline `scripts/compare-phase4a-master.mjs` menghasilkan `docs/audits/phase4a3-master-comparison.json`: 26 table names/200 columns tipe-nullability, 26 PK/33 FK/13 UNIQUE dan 34 CHECK, 22 explicit indexes, final 26 policies/6 triggers ditinjau. Kelima function body fingerprints cocok dev setelah normalisasi line endings; bukan kesamaan byte mentah atau effective ACL. Column defaults dev lama tidak diekspor, tidak dinyatakan identik. Hambatan migration awal tak tersedia kini ditutup untuk satu Master ini, bukan seluruh history.

Perbedaan utama: Master hanya revoke function PUBLIC sehingga direct default anon/authenticated grants bisa tersisa; dev memang memperlihatkan grants tersebut. Roles limited-read dan review NULL/reason tetap known baseline findings; default ACL belum diperbaiki. Bootstrap review baru di `docs/sql/staging/` memakai blank-target/ack guard, PostGIS qualification dan explicit new-object ACL intent Master serta ROLLBACK. Query preflight/structure/seeds read-only dibuat. Master dan remediation A/B/C1/C2 tidak diubah/dijalankan; `.env.local`/client/Web config dipertahankan; Docker tidak dipakai; tidak menyalin dev data/auth users.

[Dokumentasi lengkap](phase4a3-staging-preparation.md) memuat diff, review bootstrap, SQL Editor guide, synthetic fixture plan, expected/actual dan risiko. User-reported staging project creation dicatat, tetapi target/schema/security belum diverifikasi. **Master NEEDS ADJUSTMENT/READY FOR REVIEW; staging BLOCKED; Phase 4A BLOCKED.** Tidak ada SQL atau RPC dijalankan pada Cloud dev/staging.

QA Phase 4A.3 lokal: comparison script PASS pada bounded extractor, lint PASS exit 0, build PASS exit 0 (main 585.95 kB / gzip 171.02 kB, warning >500 kB). Master/dua audit hashes tidak berubah; bootstrap exact five bodies dipertahankan, 26 tables dan tanpa A/B/C body/policy/default modification; link/read-only/rollback lexical checks PASS. SQL belum diparse/dikompilasi/dijalankan pada PostgreSQL; stage/Auth/API/concurrency tidak diuji. Semua remediation proposals dipertahankan.

## Status terkini â€” Security remediation dan validation package

Paket [phase4a-remediation-validation.md](phase4a-remediation-validation.md) dibuat: security review A/B/C1/C2, dependencies/order, business/provider gates, pre/post-deployment test plan, fixture contract, expected/actual matrices seluruh aktor/API/sesi, concurrent reviewers dan atomicity, rollback/containment serta residual risks. Laporan final/authentication diperbarui. Semua perubahan lokal; tidak ada SQL remote/RPC mutasi, perubahan data/role/RLS/client/env, atau ROLLBACK diganti COMMIT.

Proposal 01/02 dipertahankan secara logika, ditambah preflight/deployment gates. Proposal 03 memperketat default public table/sequence/function serta global function EXECUTE untuk creator postgres (future all-schema scope perlu approval). File 03b managed creator supabase_admin disiapkan terpisah, BLOCKED provider/capability approval dan tidak otomatis ikut urutan utama. service_role defaults dan existing ACL (kecuali usulan revoke review RPC pada 02) tidak diubah. Reason opsional NULL dan provided nonblank <=4000 tetap proposal business rule yang perlu persetujuan Web/Flutter/backend.

Tidak ditemukan staging terverifikasi/approved SQL fixtures, supabase/config.toml/compose config, atau psql/Supabase CLI/Docker di PATH. API/concurrency/rollback mutation seluruhnya **BLOCKED**. Usulan tidak dikompilasi atau dijalankan pada PostgreSQL; mock/metadata bukan pengganti authenticated API. **Gate tetap BLOCKED**.

QA paket lokal: `npm.cmd run lint` PASS exit 0; `npm.cmd run build` PASS exit 0 (main 585.95 kB / gzip 171.02 kB, warning >500 kB tetap). Pemeriksaan checksum dua bukti asli, dua function body fingerprints, tautan dokumen dan empat proposal rollback-only PASS. Tidak ada COMMIT atau remote execution. Hasil ini tidak memvalidasi semantik SQL/runtime/staging. Browser/auth sintetis tidak diulang karena source aplikasi dan tests tidak diubah.

## Status terkini â€” Function security review Phase 4A

Seluruh dua definisi di `docs/audits/phase4a-function-definitions.json` ditinjau lokal tanpa mengeksekusi SQL/RPC remote. Kedua MD5 prosrc cocok dengan snapshot katalog. `has_staff_role` PASS review statis: auth.uid(), profil aktif, assignment+roles database, search_path kosong; recursion tidak ditemukan dengan owner postgres/FORCE RLS=false pada snapshot. Runtime JWT tetap BLOCKED. File baru hanya memuat dua fungsi terpilih; bukan inventaris seluruh definer database.

`review_public_report` PASS statis untuk active super/report_verifier authorization, row lock, transisi dan UPDATE+history satu transaksi; FAIL kelengkapan input/least privilege: NULL status tidak ditolak eksplisit (NOT NULL DB tetap fail-closed), alasan tidak divalidasi, anon EXECUTE masih ada pada snapshot. Ini bukan bukti anonymous mutation bypass. Proposal 02 direvisi dengan explicit UID/helper checks, validasi NULL target/ID, optional reason nonblank <=4000 karakter (kontrak baru perlu persetujuan), dan revoke PUBLIC/anon. Proposal 01/03 statement tetap; komentar diperbarui. Semuanya NOT EXECUTED, berakhir ROLLBACK; tidak ada source aplikasi/UI/remote DB/role change.

**Gate tetap BLOCKED**: authenticated API, concurrent update/rollback history, body fungsi lain, approved remediation dan kontrak Flutter belum dibuktikan. Review body dua fungsi telah selesai secara statis. Detail terbaru ada di [phase4a-final-report.md](phase4a-final-report.md); status body-belum-tersedia pada bagian metadata sebelumnya berikut adalah historis.

QA setelah revisi function review: `npm.cmd run lint` PASS exit 0; `npm.cmd run build` PASS exit 0, main 585.95 kB / gzip 171.02 kB (warning >500 kB). SHA256 sumber, kecocokan kedua body fingerprints, link dokumen dan marker ROLLBACK proposal PASS pemeriksaan lokal. Tidak ada PostgreSQL parser/eksekusi draft atau authenticated API test. Browser/SDK sintetis tidak diulang untuk review SQL/dokumen; hasil lama tidak dipromosikan menjadi bukti live.

## Status terkini â€” Review hasil audit remote Phase 4A

Snapshot pengguna `2026-10-22T14:07:56.340869+00:00` (21:07:56 WIB) pada PostgreSQL 17.11/role postgres/transaksi read-only telah ditinjau Codex secara lokal. **Phase 4A tetap BLOCKED**, tetapi hambatan ketersediaan katalog telah ditutup. Bukti: [JSON sumber](audits/phase4a-security-audit-result.json), [inventory lengkap](audits/phase4a-metadata-review.md), [laporan](phase4a-final-report.md).

PASS metadata: 26 tabel/200 kolom, RLS aktif 26/26, 26 PK + 33 FK + 13 UNIQUE + 34 CHECK tervalidasi, 61 index valid, kontrak UUID/multi-role/aktif cocok; client tidak punya direct write tabel otorisasi. FAIL metadata: META-01 roles_staff_read super-only menghalangi kontrak limited-role service; META-02 anon EXECUTE SECURITY DEFINER review_public_report; META-03 default privileges untuk future objects terlalu luas. Tidak menyamakan FAIL least privilege dengan bukti exploit runtime yang sudah berhasil.

BLOCKED: body helper/RPC/recursive-policy assessment, authenticated API JWT lintas akun dan sesi, migration awal/BRD/Flutter serta scope exposed/managed schemas. Dua user-reported live browser tests tetap PASS; tes sintetis sebelumnya tetap sintetis. Tidak ada API authenticated atau RPC mutasi baru yang dijalankan.

Tiga draft migration di `docs/sql/proposals/` disiapkan untuk review, semuanya NOT EXECUTED dan berakhir ROLLBACK. Query follow-up `docs/sql/phase4a-function-review.sql` hanya membaca definisi, belum dieksekusi. Database/RLS/grants/akun, source aplikasi dan UI tidak diubah. Bagian finalisasi sebelumnya di bawah adalah riwayat sebelum snapshot diterima.

QA setelah perubahan dokumen/usulan: `npm.cmd run lint` PASS exit 0; `npm.cmd run build` PASS exit 0 (main 585.95 kB / gzip 171.04 kB, warning >500 kB tetap). Pemeriksaan konsistensi metadata lokal, SHA256 sumber, link dokumen dan marker ROLLBACK proposal PASS. Draft SQL belum diparse/dijalankan pada PostgreSQL. Tidak mengulang browser/tes sintetis yang sudah PASS karena source aplikasi/test tidak berubah.

## Status terkini â€” Finalisasi Phase 4A (22 Oktober 2026)

**Acceptance gate: BLOCKED.** User-reported live browser tests PASS: login Super Admin berhasil menampilkan dashboard `/admin`; akun biasa tanpa role admin diarahkan ke `/403` dengan pesan Akses belum terotorisasi. Ini laporan pengguna, bukan pengujian live yang dijalankan Codex. Guard produksi kini membaca profil aktif dan array role backend; pernyataan service menolak semua pengguna pada catatan fondasi di bawah adalah historis.

Audit remote schema/FK/constraints/RLS/grants/function helpers serta negative API authenticated belum dapat dilakukan karena akses katalog dan sesi akun uji tidak tersedia dalam sesi. Plugin Supabase ditemukan tetapi belum terpasang/terhubung. Source Flutter/migration pembentuk tabel tidak ditemukan. SQL read-only finalisasi tersedia di [phase4a-security-audit.sql](sql/phase4a-security-audit.sql); belum dieksekusi remote. Tidak ada perubahan schema, RLS, grants, akun atau data bisnis.

Verifikasi finalisasi oleh Codex: `npm.cmd run lint` PASS exit 0; `npm.cmd run build` PASS exit 0 (main 585.95 kB / gzip 171.04 kB, warning >500 kB); `test-auth.mjs` PASS 23 skenario sintetis; `check-foundation.mjs` PASS 27 URL/cabang guard; `audit-client-secrets.mjs` PASS 160 file dalam cakupan pola known Supabase privileged key. Bukti browser sebelumnya tetap PASS dan tidak diulang karena aplikasi tidak berubah. Tidak menggabungkan hasil sintetis dan live.

Laporan lengkap dan 13 bagian acceptance: [phase4a-final-report.md](phase4a-final-report.md). Catatan live: [user-reported-live-tests.json](qa/phase4a/user-reported-live-tests.json). Dokumen auth/otorisasi diperbarui; UI, source auth, client/env, dependencies dan backend dipertahankan. **Phase 4B belum dimulai.**

## Riwayat fondasi sebelum Phase 2

Bagian fondasi dan phase terdahulu berikut mencatat kondisi pada saat pengerjaan, bukan status terkini. Kekurangan browser QA kemudian ditangani pada Phase 3B/3C; integrasi role dilanjutkan pada 4A; dua bukti browser live terbaru tercatat di atas.

## Berfungsi

- Routing publik/admin, nested layout dan navigasi desktop/mobile telah diimplementasikan. Validasi route dan render terisolasi lulus; perilaku visual/browser masih memerlukan uji manual.
- Sesi, login, logout Supabase Auth memakai client existing. Koneksi runtime memerlukan konfigurasi dan layanan yang tersedia; belum diuji dengan akun nyata.
- ProtectedRoute dan RoleGuard fail-closed. Service role sengaja menolak semua akses sampai kontrak database diverifikasi.
- Preferensi ukuran teks, kontras tinggi, dan reduced motion tersimpan lokal. Modal native mendukung Escape dan focus containment.
- Validasi draf laporan lokal, pilihan foto lokal, konfirmasi simulasi donasi, checklist sementara.

## Scaffolding / belum terintegrasi

- Artikel/detail, kejadian/detail, ringkasan, analisis risiko dan sumber/waktu pembaruan.
- Peta/filter/panel kejadian; tanpa map SDK atau tile.
- Pengiriman laporan, unggahan, pelacakan aman, verifikasi, seluruh admin CRUD dan dashboard.
- Panduan berbasis database, direktori kontak resmi, peringatan dan notifikasi langsung.
- Pembacaan suara otomatis; dukungan semantic HTML untuk pembaca layar tersedia.
- Role database belum diverifikasi. Tidak ada pengguna yang diasumsikan admin.
- Filter belum mengolah data karena sumber belum terhubung. Tidak ada statistik/berita/kejadian rekaan.

## Batasan

Tidak membaca .env.local, mengubah client Supabase, memodifikasi schema/RLS, atau menulis data bisnis. Login dan logout hanya mengelola sesi autentikasi. Tidak ada pembayaran atau pengiriman bantuan.

## Verifikasi

- `npm.cmd run lint`: LULUS, exit code 0.
- `npm.cmd run build`: LULUS, exit code 0, termasuk kompilasi TypeScript strict.
- `node scripts/check-foundation.mjs`: LULUS. Memeriksa 27 kecocokan URL, pemisahan layout, seluruh cabang guard sesi/role, service role fail-closed, dan parameter dinamis valid/tidak valid.
- Script verifikasi memakai modul aktual dengan dependensi auth/komponen terisolasi; tidak mengakses Supabase atau menggantikan pengujian browser/backend.
- Launcher `npm` awalnya diblokir ExecutionPolicy PowerShell untuk npm.ps1. Menggunakan npm.cmd menjalankan script yang sama tanpa mengubah kebijakan sistem.
- Build memberikan peringatan chunk utama di atas 500 kB. Lazy loading halaman sudah diterapkan; bundle inti masih membawa React Router, Supabase, dan provider. Ini peringatan optimasi, bukan kegagalan build. Evaluasi pemisahan vendor sebelum produksi.
- Belum ada script test bawaan di package.json. Tidak ada dependensi test tambahan.
- Pengujian visual/interaksi browser dan login dengan akun Supabase nyata belum dilakukan karena tidak tersedia browser automation dalam sesi ini. Kecocokan route bukan bukti tampilan browser sudah diuji.
- Deploy lokal saja; tidak ada publikasi atau perubahan database.

Daftar file: lihat [files-changed.md](files-changed.md). Daftar lengkap URL: lihat [routes.md](routes.md).

## Berikutnya

Verifikasi kontrak role staf dan RLS bersama backend/mobile, lalu integrasikan read service bertipe dengan loading/error dan tes akses. Setelah itu rancang endpoint pelaporan anonim dengan validasi server, rate limiting, dan token pelacakan acak. Verifikasi sumber resmi sebelum menampilkan kontak atau informasi kebencanaan.


## Phase 2 - Audit arsitektur frontend (21 Oktober 2026, Asia/Jakarta)

### Kesimpulan

Fondasi lulus lint, build TypeScript strict, verifikasi guard, pemeriksaan graph import, dan smoke render terisolasi. Tidak ditemukan circular dependency, broken import/export, route leaf duplikat, atau konflik dependency manifest/lockfile. Hasil ini bukan sertifikasi keamanan backend atau bukti semua interaksi browser telah berjalan.

### Cakupan pemeriksaan

- Semua 60 modul TypeScript/TSX dalam src, mencakup pages publik/admin, auth service/context/guards, hooks, stores, feature modules, router, providers, layout, dan shared components. Graph memiliki 106 relasi import lokal termasuk dynamic import.
- Seluruh lazy route dievaluasi hingga export komponen aktual; seluruh target konfigurasi navigasi dan link yang dirender dicek terhadap router.
- App.tsx/main.tsx, index.html, src/index.css, src/styles/tokens.css, vite.config.ts, seluruh tsconfig, eslint.config.js, package.json, package-lock.json, .gitignore, dan script check-foundation.mjs.
- Supabase client diperiksa sebagai kode dan diuji dengan konfigurasi sintetis. Hanya keberadaan .env.local yang diperiksa; isinya tidak dibaca, dicetak, atau diubah.
- CSS Tailwind v4 diimpor dan diproses build, plugin Vite tersedia. Breakpoint 1250/800/480px, grid, mobile navigation, overflow tabel, focus state, dan reduced motion ditinjau dari kode. src/App.css merupakan aset starter yang tidak diimpor sehingga tidak menimpa styling aktif.

### Temuan dan perbaikan minimal

| Temuan | Dampak | Perbaikan | Bukti |
| --- | --- | --- | --- |
| Route /admin/login tidak memiliki errorElement khusus | Kegagalan lazy route/render memakai fallback default router, tidak konsisten dengan halaman lain | Tambahkan ErrorState khusus pada route login | Assertion route error boundary; lint/build lulus |
| Efek preferensi aksesibilitas hanya berada di dialog PublicLayout | Membuka /admin/login atau admin langsung tidak menerapkan preferensi tersimpan hingga halaman publik dibuka | Pindahkan efek identik ke hook global yang dipanggil AppProviders; hapus efek ganda dari dialog | Efek hook aktual diuji dengan dataset DOM minimal; ketiga preferensi diterapkan tanpa PublicLayout |
| Tombol menu admin tidak menyampaikan state dan target navigasi | Pembaca layar tidak mendapat status buka/tutup dan relasi sidebar | Tambahkan aria-expanded, aria-controls, dan id sidebar; state tetap memakai state existing | Assertion pada render seluruh layout admin |

Tidak ada perubahan desain besar, fitur bisnis baru, dependency tambahan, konfigurasi Supabase, atau database.

### File yang diubah/ditambahkan dalam audit

- src/app/router/router.tsx: error boundary login.
- src/app/providers/AppProviders.tsx: menerapkan preferensi aksesibilitas global.
- src/components/accessibility/AccessibilityDialog.tsx: menghapus efek yang sudah dipindahkan.
- src/components/layout/AdminHeader.tsx, AdminLayout.tsx, AdminSidebar.tsx: menyampaikan state dan relasi navigasi admin kepada pembaca layar.
- src/hooks/useAccessibilityPreferences.ts (baru): efek preferensi yang sebelumnya ada di dialog.
- scripts/audit-foundation.mjs (baru): audit graph import, resolved lazy exports, route/navigation, render komponen aktual, state UI, efek aksesibilitas, dan kontrak konfigurasi dengan input sintetis.
- docs/development-status.md: laporan audit dan langkah manual ini.

### Hasil perintah yang benar-benar dijalankan setelah perbaikan

| Perintah | Hasil |
| --- | --- |
| npm.cmd run lint | LULUS, exit 0 |
| npm.cmd run build | LULUS, exit 0; TypeScript strict dan Vite production build |
| node scripts/check-foundation.mjs | LULUS, exit 0; 27 URL, nested layouts, cabang loading/error/unauthenticated/authenticated, role null/non-admin/admin/error, dan parameter valid/tidak valid |
| node scripts/audit-foundation.mjs | LULUS, exit 0; 60 modul/106 import edges, 27 pola route leaf unik, seluruh lazy exports, navigasi, render 15 URL publik/login dan 11 halaman admin terisolasi, parameter dan state UI |
| npm.cmd ls --depth=0 | LULUS, exit 0; tidak ada dependency missing/invalid |

npm.cmd menjalankan script npm yang sama melalui launcher Windows tanpa mengubah ExecutionPolicy. Tidak ada --force, --legacy-peer-deps, atau instalasi package.

### Status routing dan smoke test

- Semua public routes, /admin/login, admin index, seluruh admin child routes, serta wildcard publik/admin cocok pada router.
- Parent /admin dan index dashboard berbagi URL secara sah sebagai nested route; ini bukan route duplikat.
- /laporan/lacak dipilih sebagai route statis yang benar. Parameter mengandung slash terenkode, karakter tidak sah, dan lebih dari 128 karakter ditolak. Parameter detail yang dihilangkan kembali ke halaman daftar sesuai path induknya; alamat dengan segmen tambahan menuju 404.
- Navigasi internal memakai Link/NavLink. Anchor biasa hanya dipakai sebagai skip link ke main dalam halaman yang sama.
- Seluruh admin URL melewati ProtectedRoute -> RoleGuard -> AdminLayout, termasuk wildcard. Login memakai layout terpisah. Role null, role non-admin, dan error otorisasi tidak menghasilkan Outlet admin pada uji guard.
- Service getVerifiedStaffRole tetap mengembalikan null untuk semua pengguna. Tidak ada role yang berasal dari localStorage dan tidak ada anggapan login berarti admin. Dashboard memang belum dapat diakses melalui aplikasi, termasuk oleh akun yang login, sampai integrasi role database tersedia.
- Smoke render memakai ReactDOMServer dan komponen aktual dengan router memori; Supabase diganti stub yang melempar error jika dipanggil. Halaman admin dirender dalam layout test terisolasi untuk memeriksa presentasi, tanpa mengubah atau melewati guard produksi. Ini tidak membuktikan otorisasi browser/backend.
- State loading/error peta dan loading/empty/error tabel admin diuji terisolasi; empty state dan label simulasi tersedia. Tidak ditemukan error render dalam cakupan tersebut.

### Status Supabase dan keamanan

src/lib/supabase.ts, Project URL/key, .env.local, vite.config.ts, package.json, dan package-lock.json tidak diubah. Kode client memakai VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY, gagal secara eksplisit saat salah satunya tidak tersedia, serta membuat satu client saat keduanya tersedia pada uji sintetis. Tidak ada kredensial literal, service_role atau secret key dalam source frontend yang diperiksa. Jenis/nilai key aktual di environment tidak divalidasi karena file environment tidak dibaca.

Tidak ada query tabel bisnis, INSERT/UPDATE/DELETE, RPC, migration, perubahan schema, atau perubahan RLS dalam audit. Kontrak client lokal tidak menunjukkan regresi; konektivitas layanan aktual, sesi nyata, hak akses database, dan efektivitas RLS belum diuji ulang. Route guards hanya mengendalikan UI dan bukan pengganti keamanan backend.

### Fitur berjalan dan placeholder

Implementasi lokal tersedia untuk routing/layout, guard fail-closed, filter/input UI, validasi draf laporan, pilihan foto lokal, checklist sementara, simulasi donasi, dan preferensi aksesibilitas. Integrasi login/logout ditinjau sebagai kode tetapi tidak dicoba dengan akun nyata. Interaksi form, mobile menu, dialog, dan penyimpanan preferensi di browser masih memerlukan uji manual.

Placeholder tetap: artikel dan detailnya; kejadian, sumber/waktu pembaruan, statistik dan analisis risiko; SDK/tile/data peta; pengiriman laporan, unggahan dan pelacakan; materi panduan database; direktori kontak resmi; notifikasi langsung; campaign donasi; seluruh admin CRUD/dashboard dan verifikasi role. Tidak ada operasi palsu yang mengaku berhasil, pembayaran nyata, atau pengiriman SOS.

### Risiko dan batasan yang belum terselesaikan

- Bundle utama sekitar 584 kB (gzip sekitar 171 kB) memberi peringatan di atas 500 kB. Lazy loading halaman aktif; optimasi vendor dapat dijadwalkan setelah profiling.
- Role database dan kebijakan RLS belum terverifikasi. Jangan mengaktifkan dashboard atau menulis query data sensitif sebelum kontrak backend disepakati.
- Tidak ada browser automation tersedia dalam sesi ini. Render server tidak menjalankan effects, event DOM, focus management native dialog, navigasi historis, localStorage browser, atau perhitungan layout/CSS. Uji efek aksesibilitas hanya menggunakan dataset minimal.
- Dukungan browser nyata untuk dialog native, ukuran layar kecil, dan teks besar belum tervalidasi secara visual.
- Hosting produksi belum diperiksa; deep link BrowserRouter membutuhkan fallback ke index.html.
- Banyak komponen masih ditulis padat dalam satu baris. Build/lint tidak bermasalah, tetapi formatting dapat ditata pada tugas terpisah untuk memudahkan review tanpa mencampurkan perubahan audit.

### Langkah uji manual yang masih diperlukan

1. Jalankan npm.cmd run dev dan buka alamat localhost yang ditampilkan Vite. Pastikan console browser tidak berisi error dan Network tidak mengirim operasi tulis ke database.
2. Buka setiap URL dalam docs/routes.md. Gunakan pengenal contoh seperti artikel-uji atau id-uji untuk route dinamis. Publik harus dapat dibuka tanpa login dan menampilkan placeholder yang jujur. Refresh langsung setiap deep link.
3. Coba /informasi/a%2Fb, /pemantauan/%3Cscript%3E, dan /panduan/ diikuti 129 karakter. Dua detail pertama dan pengenal terlalu panjang harus menampilkan parameter tidak valid. /informasi/, /pemantauan/, /panduan/ harus menampilkan daftar; /alamat-tidak-ada menampilkan 404.
4. Dalam sesi tanpa login, buka /admin, /admin/laporan/id-uji, dan /admin/alamat-tidak-ada langsung. Setelah loading selesai, semuanya harus menuju /admin/login tanpa konten admin. Login dengan akun uji yang memang disediakan pengelola; dengan role service sekarang akses harus ditolak ke /403, bukan dashboard. Jangan mengubah localStorage untuk memberi role.
5. Pada viewport 320, 375, 768, dan 1280px, cek overflow horizontal, navigasi mobile, grid/kartu, tabel, dan footer. Navigasi via Link, tombol Back/Forward, serta refresh harus tetap konsisten.
6. Navigasikan menggunakan Tab, Shift+Tab, Enter, dan Escape. Uji skip link, modal aksesibilitas, focus containment/return, ukuran teks, kontras tinggi, dan reduced motion. Setelah menyimpan preferensi, reload langsung /admin/login untuk memastikan preferensi diterapkan tanpa membuka halaman publik.
7. Form laporan kosong/tidak valid harus memberi pesan validasi. Draf valid hanya divalidasi lokal; foto tidak diunggah. Pelacakan tidak membuka data pribadi. Donasi harus selalu berlabel simulasi tanpa pembayaran. Checklist hanya sementara.
8. Login salah atau jaringan tidak tersedia harus menampilkan pesan gagal tanpa data staf. Pengujian sesi nyata dan RLS dilakukan terpisah dengan akun uji yang disetujui dan operasi baca yang sesuai, tanpa perubahan schema atau data.

### Rekomendasi fase berikutnya

Selesaikan uji browser manual, kemudian verifikasi kontrak role staf/RLS dengan backend dan developer mobile. Tambahkan layanan baca bertipe untuk sumber resmi beserta loading/error dan uji izin. Tunda CRUD, pengiriman laporan, dan integrasi data sensitif sampai otorisasi serta kontrak API tervalidasi. Optimasi bundle mengikuti profiling, bukan menghilangkan guard atau error handling.


## Phase 3A - Design System berbasis screenshot (21 Oktober 2026)

- Seluruh 12 screenshot docs/figma-references dibaca. Figma belum terhubung; warna piksel dibedakan dari metadata Figma yang belum tersedia. Font/radius/spacing/shadow/breakpoint merupakan estimasi implementasi, bukan ekstraksi layer.
- Token semantic terpusat dan mapping Tailwind v4 inline tersedia. Primitive Button/LinkButton, Card, Badge, Field/Input/Textarea/Select, Dialog, Alert, Skeleton, Loading/Empty/Error dibuat. Adapter PageElements menjaga import existing.
- PublicHeader/Navbar/Brand/PublicFooter dan PublicLayout memakai pola referensi. Footer, mobile navigation, focus handling, dan muted yang lebih kontras adalah penyempurnaan. Logo Lucide bersifat substitusi sementara.
- Dialog aksesibilitas memakai primitive Dialog, radio ukuran teks dan switch native. Tidak mengaktifkan pembacaan suara/video isyarat yang belum tersedia.
- Form laporan/tracking dan filter artikel/pemantauan memakai primitive tanpa perubahan fungsi bisnis. Halaman bisnis tidak dibangun ulang. Supabase client, environment, Auth, database/RLS dan route tree tidak diubah. Tidak ada dependensi tambahan.
- npm.cmd run lint LULUS (exit 0); npm.cmd run build LULUS (exit 0), peringatan chunk utama 587.42 kB masih ada.
- check-foundation.mjs LULUS: 27 URL/guard branches. audit-foundation.mjs LULUS: 78 modul, 145 relasi import, render 15 URL publik/login dan 11 halaman admin terisolasi; seluruh lazy exports, semantic contracts primitive, serta pasangan kontras terpilih >=4.5:1 lulus.
- Browser visual/keyboard, focus dialog, event form/ref browser, dan koneksi Supabase nyata belum diuji. Tidak ada klaim pixel-perfect. Semua placeholder bisnis dari fase sebelumnya tetap berlaku.
- Inventaris referensi, token, provenance warna, API komponen, daftar lengkap file baru/diubah, langkah uji manual dan backlog Phase 3B tersedia di [design-system.md](design-system.md).


## Phase 3B - Public UI dan browser QA (22 Oktober 2026)

- UI 12 halaman publik utama serta 403/404 selesai untuk cakupan data kosong/simulasi. BRD/Figma asli tidak tersedia; visual mengikuti PNG Phase 3A dan controlled extension.
- Cards, metadata, filtering/pagination, detail, map placeholder, schema laporan/tracking, GPS opt-in, foto preview, checklist, warning/SOS dan simulasi tersedia. Tidak ada data aktual fiktif, dispatch, pembayaran, query tracking atau pengiriman laporan.
- Lint/build final LULUS, exit 0; chunk utama 576.60 kB / gzip 167.95 kB masih memberi warning. Check-foundation dan audit-foundation LULUS: 100 modul, 279 relasi import, 27 pola route, SSR/state/schema/guard checks.
- Chrome headless nyata lulus 70 route/viewport checks pada 360/390/768/1024/1440px, 14 kelompok interaksi, 0 console/runtime errors, 0 missing local assets. 10 screenshot QA disimpan. HTTPS eksternal diblokir; bukan tes Supabase/RLS. Catatan browser belum diuji pada Phase 2/3A bersifat historis untuk cakupan ini.
- Ditemukan/diperbaiki overflow radio donasi, boundary fokus dialog dan hasil tracking usang; rerun lulus. Data-filled cards, share/call, GPS sukses, perangkat fisik dan pembaca layar belum diuji.
- Supabase client/environment/Auth/database/RLS, route tree, admin dashboard, dependencies dan konfigurasi Vite dipertahankan. Hash file client/manifest/lock/Vite sesuai bukti Phase 2. Tidak ada migration atau operasi tulis bisnis.
- Laporan per route/file/limit dan Phase 3C: [ui-implementation-status.md](ui-implementation-status.md). Sumber/adaptasi visual: [figma-audit.md](figma-audit.md). Bukti mesin: [results.json](qa/phase3b/results.json).

## Phase 3C â€” Admin Dashboard UI (22 Oktober 2026)

- Seluruh 12 halaman admin/login kini memiliki UI konsisten: dashboard, laporan + detail, kejadian, artikel, panduan, kontak, staf, notifikasi, sumber data, pengaturan dan login. Data bisnis tetap kosong dengan penjelasan belum terintegrasi.
- Sidebar terpusat/mobile, header/logout existing, breadcrumb, AdminPageHeader, DataTable, ConfirmDialog dan editor/pratinjau draf tersedia. Filter/reset, validasi form, show/hide password, kembali ke draf dan preferensi kepadatan lokal bekerja. Tidak ada fake success atau tindakan tulis yang aktif.
- Nilai status laporan/publikasi dan empat usulan role mengikuti instruksi pengguna dalam UI, belum menjadi kontrak database terverifikasi. Guard/auth service legacy tetap fail-closed; mapping role server belum tersedia sehingga admin produksi tetap tidak dapat dibuka.
- Lint dan build LULUS (exit 0). Chunk utama 581.58 kB, gzip 169.67 kB; warning >500 kB masih ada. Check-foundation LULUS (27 URL); audit-foundation LULUS (104 modul / 328 relasi import, SSR/state/routing/guard checks).
- QA Chrome headless terisolasi: 36 kombinasi presentasi/viewport pada 390/768/1440px, 13 kelompok interaksi; tanpa overflow horizontal, console/runtime error atau aset lokal hilang. Enam screenshot disimpan. Router produksi tetap mengalihkan route admin tanpa sesi ke login. HTTPS eksternal diblokir; bukan pengujian Supabase/RLS nyata.
- Tidak mengubah client/environment/Auth/guards/route tree/database/RLS/dependencies/Vite; tidak ada migration, SQL atau operasi tulis bisnis. Public page source tetap. Source Figma khusus admin/BRD/schema belum tersedia; layout admin menggunakan ekstensi tokens Phase 3A.
- File, interaksi, bukti QA, batas kontrak dan pekerjaan backend dirinci dalam [ui-implementation-status.md](ui-implementation-status.md), bagian Phase 3C. Bukti: [results.json](qa/phase3c/results.json).

## Phase 4A â€” Supabase Auth dan otorisasi role (22 Oktober 2026)

**Status: implementasi aplikasi dan QA lokal selesai; acceptance live belum seluruhnya terverifikasi.** Tidak ada akun uji terotorisasi/migration SQL yang tersedia dalam workspace untuk membuktikan login super admin dan audit RLS/FK/constraints authenticated secara nyata.

- Login/logout memakai SDK Supabase existing. AppProviders kini memvalidasi kandidat sesi dengan getUser, menangani listener dengan cleanup, bootstrap/event race, pergantian akun, expiry/token refresh, timeout dan error. Session revision membatalkan/menghapus cache role; respons stale tidak memulihkan akses setelah logout.
- authService membaca staff_profiles aktif, staff_role_assignments, lalu roles berdasarkan identitas dari getUser. Mendukung array empat role dan menolak profil nonaktif/hilang, role kosong/tidak dikenal, relasi parsial/malformed, serta error grants/RLS. Kontrak tabel berasal dari instruksi pengguna, belum dari migration terverifikasi.
- ProtectedRoute memerlukan verified user + sesi. RoleGuard menegakkan matriks route, deny unknown admin URL dan revalidasi pada mount/focus/reconnect/interval 60 detik. Sidebar/quick actions mengikuti izin yang sama. SignOutButton tersedia pada header/login/403. Tidak ada role dari localStorage/user metadata atau default admin.
- Probe anonim remote read-only berhasil: staff_profiles, staff_role_assignments, roles masing-masing menolak SELECT dengan HTTP 401 / 42501. Ini bukan bukti RLS enabled, ownership aman, FK/unique benar, atau authenticated query berhasil. Query SQL audit read-only disiapkan di docs/sql/auth-security-audit.sql, belum dieksekusi ke database. Tidak ada policy yang diubah atau migration perbaikan spekulatif.
- QA: lint LULUS exit 0; build LULUS exit 0 (585.95 kB / gzip 171.04 kB main chunk, warning >500 kB tetap ada). test-auth LULUS 23 skenario terisolasi; check-foundation LULUS 27 URL/guards; audit-foundation LULUS 108 modul / 342 import edges, SSR/config/state checks.
- Browser auth: 11 kelompok skenario melalui router produksi dan SDK asli dengan respons jaringan sintetis; 164 request diintersep, 0 console/runtime error dan 0 missing local assets. Browser admin: 36 route/viewport checks dan 13 kelompok interaksi pada 390/768/1440px, tanpa overflow atau error. Tidak ada login akun nyata atau mutasi DB dalam tes.
- Audit pola credential source/build: 160 file, tidak ditemukan pola privileged Supabase key; tidak mencetak key. Ini bukan audit seluruh jenis secret. src/lib/supabase.ts, environment, package.json/lock, Vite dan data/schema/RLS/grants remote dipertahankan.
- Dokumentasi alur, file changes, QA dan pending live: [authentication.md](authentication.md). Izin UI: [authorization-matrix.md](authorization-matrix.md). Artefak di docs/qa/phase4a/.

Langkah berikutnya: jalankan SQL metadata read-only melalui SQL Editor, tinjau policy/grants/constraints beserta helper/RPC, lalu jalankan checklist akun uji existing yang telah disetujui. Jangan mengaktifkan CRUD atau self-assignment role untuk mengatasi kegagalan otorisasi. Phase 4A tidak dinyatakan lolos acceptance penuh sampai bukti live tersebut tersedia.

## Phase 4A â€” Pelaksanaan ulang (22 Oktober 2026, Asia/Jakarta)

- Instruksi Phase 4A yang dilampirkan pengguna ditinjau terhadap implementasi existing. Auth/service, lifecycle, guards, role array, login/logout, layout/router dan matriks UI telah tersedia; tidak membangun ulang UI atau proyek.
- Migration pembentuk tabel/constraints/policies tidak ditemukan. SQL yang tersedia hanya `docs/sql/auth-security-audit.sql` untuk audit read-only. Akses SQL Editor/owner dan akun uji terotorisasi belum tersedia; schema/RLS authenticated tetap belum terverifikasi.
- Lint dan build dijalankan ulang dan lulus exit 0. Main chunk 585.95 kB / gzip 171.04 kB masih memberi warning >500 kB.
- Test auth lulus 23 skenario; foundation lulus 27 URL/cabang guard; audit arsitektur lulus 108 modul / 342 relasi import.
- Run browser auth awal menemukan test logout mengklik sebelum verifikasi sesi selesai. Helper test diperbaiki agar menunggu tombol aktif. Run sesudah perbaikan lulus 11 kelompok skenario / 164 request sintetis; bukan login akun nyata.
- Browser admin lulus 36 route/viewport checks dan 13 kelompok interaksi; tanpa console/runtime error atau aset lokal hilang. Chrome gagal di sandbox lalu berhasil di luar sandbox.
- Probe remote read-only diulang: ketiga tabel menolak SELECT anonim dengan HTTP 401 / 42501. Probe sandbox sebelumnya gagal jaringan. Hasil remote bukan bukti RLS enabled atau authenticated ownership aman.
- Pemindaian known privileged credential patterns lulus pada 160 file source/build; tidak mencetak nilai key. Tidak ada perubahan auth aplikasi, client/environment, dependencies, UI, database/RLS/grants, role/akun, atau data bisnis.
- Perubahan pelaksanaan ulang: `scripts/smoke-auth-browser.mjs`, tiga dokumen auth/otorisasi/status, dan artefak QA `docs/qa/phase4a/`. Detail serta checklist pengujian live tersedia di [authentication.md](authentication.md).

**Status: pelaksanaan ulang lokal selesai; Phase 4A belum selesai secara keseluruhan karena acceptance live masih pending audit katalog database dan pengujian akun existing terotorisasi.**

## Phase 4A - accelerated completion (23 Oktober 2026, Asia/Jakarta)

- PHASE 4A BLOCKED. Laporan operator terbaru: rollback A 26 policies/0 profiles/0 assignments, kemudian A permanen 27 policies/satu policy A. Ini USER-REPORTED, bukan exact-expression/JWT acceptance Codex. Deployment A, akun dan manifest tidak diulang.
- Runner API diperbaiki: semua RPC probe A memerlukan mutation approval; mode read-only hanya GET. Race B memastikan actor/status/reason/timestamp sesuai request pemenang. JWT hasil refresh harus memiliki role authenticated dan subject yang sama sebelum digunakan.
- Package regression PASS 13/13, termasuk seluruh sembilan state read-only, fixture exact-source/no-op, dan oracle B yang menolak race attribution salah. Auth regression PASS 23/23 terisolasi; JavaScript syntax PASS. Sepuluh SQL private cocok dengan generator (parity PASS), tanpa menampilkan UID/fixture/credential atau menimpa artefak existing.
- npm.cmd run lint PASS exit 0. npm.cmd run build PASS exit 0, termasuk TypeScript; chunk utama 585.95 kB/gzip 171.03 kB masih memberi warning >500 kB.
- A/B/C1 migration dan recovery existing dipertahankan. B memakai containment/roll-forward; C1 tidak otomatis mengembalikan broad defaults. PostgreSQL/psql/Docker tidak ditemukan melalui PATH; SQL compile/runtime NOT_RUN. JWT/API, session live, atomicity dan observed lock contention BLOCKED; unit mocks bukan pengganti bukti tersebut.
- Runbook, final report dan access matrix existing diperbarui. Keputusan operator: fixture persisten/API sintetis/sesi khusus pada staging, kontrak B optional NULL/nonblank <=4000 karakter, dan C1 postgres/public + global future functions. B/C1 deployment tetap berurutan sesudah acceptance tahap sebelumnya. Tidak ada SQL Cloud/API live, akses credential, perubahan dev/Flutter/UI atau implementasi Phase 4B sebelum security gate.

## Phase 4A - approval decision and accelerated execution (23 Oktober 2026, Asia/Jakarta)

- Keputusan terbaru diterapkan ke paket lokal: fixture/JWT API sintetis staging APPROVED WITH CONDITIONS; kontrak B APPROVED dengan maksimum 4000 karakter setelah trim; C1 hanya prinsip postgres/public. Izin kontrak B tidak ditafsirkan sebagai izin migration; global postgres EXECUTE tidak diubah.
- B proposal/release memvalidasi v_reason setelah trim ASCII SP/HT/LF/CR/FF/VT; NULL tetap sah, blank/invalid status/transitions ditolak, role guard/FOR UPDATE/history atomic dipertahankan. Fingerprint body LF baru 732ed6c024fe909237d63847547f46e8 konsisten dengan stage/atomicity/C1 guards.
- C1 kini hanya tiga ALTER DEFAULT PRIVILEGES postgres IN SCHEMA public. Global dan non-public/provider defaults serta existing persistent ACL dipertahankan dengan snapshot assertions. Global relation grants yang tidak bisa diatasi secara scoped memicu STOP. Probe membedakan inherited global EXECUTE dari explicit object-level REVOKE; tidak mengklaim schema-local REVOKE sebagai global denial. Bukti existing 24 default ACL entries dipakai tanpa audit baseline ulang; kompatibilitas provider global belum terbukti, sehingga global write dikeluarkan.
- Runner melaporkan per-kelompok PASS/FAIL/BLOCKED/NOT_RUN tanpa credential/body; invalid CLI/approval/state ditolak sebelum HTTP. B mencakup trimmed boundaries ASCII/Unicode, repeated/backward/terminal transitions dan konsistensi history/race. Atomicity injection dan observed contention tetap gate terpisah.
- Generator menambah terminal quarantine dengan exact snapshot guard, hanya menghapus assignment sintetis/menonaktifkan profil dan mempertahankan Auth/laporan/history. Restore USER terpisah menolak inbound SUBJECT references/unknown FK sebelum menghapus profil SUBJECT sintetis yang tidak direferensikan, untuk no-profile B sebelum mutasi laporan. DML hanya disiapkan lokal, tidak dieksekusi. Manifest dan akun tidak dibuat ulang.
- Pengujian aktual: package PASS 19/19; auth PASS 23/23 terisolasi; syntax JavaScript tiga scripts PASS; private SQL parity PASS 12/12; default API runner NOT_RUN tanpa jaringan. npm.cmd run lint PASS exit 0; npm.cmd run build PASS exit 0 termasuk TypeScript. Main chunk 585.95 kB/gzip 171.03 kB masih warning >500 kB.
- Bukti terstruktur diperbarui pada docs/qa/phase4a/remediation-a/readiness-review.json dengan source SHA256; checks/hash rehearsal terdahulu dipertahankan sebagai riwayat. Satu runbook operator existing dipakai untuk urutan A -> B -> C1 -> final gate dan recovery; tidak ada prompt lanjutan atau dokumen subfase baru.
- PHASE 4A BLOCKED: tidak ada tool koneksi SQL Supabase atau staging key/JWT/refresh process environment. PostgreSQL/psql/Docker/pglast lokal tidak tersedia; SQL runtime NOT_RUN. JWT/API A, atomicity/observed contention, scoped C1 provisioning dan UI/metadata/mobile compatibility belum dibuktikan. Operator dapat mengeksekusi acceptance A yang sudah diizinkan; migration B, deployment C1 konkret dan probe DDL/fault injection tetap membutuhkan izin eksekusi sesuai gate. Tidak ada SQL Cloud/API live, credential logging, perubahan rekansiaga-dev/Flutter/UI, atau Phase 4B sebelum security gate.

## Phase 4A - final master prompt, Acceptance A orchestrator (23 Oktober 2026, Asia/Jakarta)

- Implementasi baru scripts/run-phase4a-acceptance.mjs: default NOT_RUN tanpa manifest/credential/network/SQL. Live preflight memakai existing private manifest dan target staging fixed; semua sembilan fixture diverifikasi terhadap canonical generator/SHA256-LF/path sebelum langkah remote. Commit dilakukan operator pada SQL Editor yang sudah diverifikasi, dengan acknowledgement exact per state. Sesudah satu commit, marker self-profile sintetis serta testA JWT/roles/isolation/negative writes harus PASS sebelum fixture berikutnya.
- JWT CONTROL/SUBJECT dicapture sekali untuk seluruh urutan sehingga MULTI -> INACTIVE memakai token yang sama; tidak menyimpan credential. Refresh/logout sesi SUBJECT khusus dapat dijalankan otomatis sesudah CROSS_RV. Resume --from STATE mencatat state sebelumnya NOT_RUN dan tidak mengklaim full acceptance. Kegagalan/ack salah/drift menghentikan urutan; tidak ada retry, reset, cleanup atau deployment migration otomatis. Policy review merupakan attestation operator, bukan bukti SQL independen.
- scripts/test-phase4a-api.mjs: session helper diekspor untuk reuse; transport dapat diinjeksi pada unit tests. Replay refresh harus 400/401; 429/service error tidak diterima sebagai invalidation PASS. Private error/payload tidak dicetak dan instant access-JWT revocation tidak diklaim.
- scripts/test-phase4a-package.mjs diperluas untuk urutan commit/test, abort, target/ack/drift, resume, session failure labels, marker ownership, redirected paths, refreshed-token identity mismatch dan rate-limit negative oracle. Actual package PASS 29/29; auth PASS 23/23; syntax tiga scripts PASS. Actual existing-private-file orchestrator preflight PASS 9/9; SQL parity PASS 12/12; tidak ada manifest/akun/SQL fixture yang dibuat ulang.
- npm.cmd run lint PASS exit 0 dan npm.cmd run build PASS exit 0 termasuk TypeScript. Warning main chunk 585.95 kB/gzip171.03 kB >500 kB tetap. Default orchestrator dijalankan aktual: NOT_RUN, tanpa jaringan/SQL. Seluruh runtime integration tetap belum dibuktikan; unit mock bukan JWT nyata.
- File pelaporan existing yang diperbarui: docs/phase4a-remediation-validation.md (satu perintah operator sebagai alur utama), docs/phase4a-final-report.md (laporan utama), docs/development-status.md, docs/qa/phase4a/remediation-a/readiness-review.json (actual local results/source hashes). Output test-auth existing juga disegarkan oleh runner. Tidak membuat dokumen subfase atau prompt lanjutan.
- Status PHASE 4A BLOCKED; Phase 4B NOT_RUN menunggu security gate PASS. A permanen tetap laporan operator; B setelah-trim dan C1 public-only yang sudah disiapkan dipertahankan tanpa deployment. Tidak ada tool SQL Supabase atau staging key/JWT/refresh pada process environment; operator menjalankan node scripts/run-phase4a-acceptance.mjs --live dengan environment privat sesuai runbook dan menyelesaikan satu commit per prompt. Acceptance A approval tetap berlaku, tidak diminta ulang. Migration B/C1 dan probe DDL menunggu izin konkret/gate sebelumnya. Tidak ada SQL/API live, akses credential, perubahan dev/Flutter/UI atau fitur CRUD mock yang diklaim selesai.

## Acceptance A blocker - diagnostic read-only (23 Oktober 2026, Asia/Jakarta)

- Membaca seluruh orchestrator dan API runner. Catch lama menyamakan preflight, file/ack, HTTP/state assertions dan session failures; tidak mencetak sebab yang dapat ditindaklanjuti. Output operator tanpa header/prompt terjadi sebelum HTTP/fixture-commit prompt menurut urutan kode. Variabel terminal operator belum diobservasi; jangan mengklaim field spesifik hilang di terminal tersebut.
- scripts/run-phase4a-acceptance.mjs menambah --diagnose: hanya membaca process environment dan file lokal; output nama variabel/konfigurasi, status dan kategori. Menolak --diagnose bersama --live; tidak memanggil HTTP/SQL, mutation, prompt, deployment, cleanup atau credential file. Memeriksa cwd/runtime, target/approval/negative-write ack, manifest path/JSON/ref/run/actors, public-key format, JWT role/sub/expiry/issuer, optional session/refresh, dan integritas sembilan SQL.
- Live preflight menggunakan hasil yang sama untuk menampilkan blocker spesifik sebelum HTTP. Catch setelahnya melaporkan kategori tahap, status HTTP terakhir dan flag attempted/possible-commit; tidak mencetak exception, request/response body, UID, key/JWT/refresh atau connection string. Jika HTTP atau prompt commit telah dicapai, meminta verifikasi committed state sebelum retry; tidak menjalankan recovery otomatis. Seluruh fixture/security guards dipertahankan.
- Diagnostic aktual lokal: cwd/runtime PASS, tujuh variabel wajib MISSING_VARIABLE dalam tool process env. Diagnostic kedua dengan empat konfigurasi nonsecret dalam object lokal membuktikan manifest dan sembilan existing SQL PASS; key/JWT tetap hilang. Tidak menganggap environment ini identik dengan terminal operator. Tidak ada SQL/API live, fixture write, migration, mutation, cleanup atau pembuatan manifest.
- Tes lokal relevan PASS 34/34, termasuk no-network diagnostic CLI, secret/exception redaction, missing config, wrong target/key/actor, expired token, missing refresh, invalid/null/malformed manifest dan fixture drift. Syntax tiga scripts PASS. npm.cmd run lint PASS exit 0; npm.cmd run build PASS exit 0 termasuk TypeScript; main chunk 585.95 kB/gzip171.03 kB masih warning >500 kB. Tes dengan --live existing menggunakan env kosong dan berhenti di preflight; tidak menjalankan mutation.
- Runbook existing diperbarui dengan tabel batas kegagalan dan PowerShell perbaikan konfigurasi/secure prompt yang tidak menulis secret literal ke history. Tidak ada dokumen baru. Perintah operator berikutnya: node scripts/run-phase4a-acceptance.mjs --diagnose, tanpa --live. Phase 4A tetap BLOCKED; tidak melanjutkan fase atau mengulang baseline.

## Acceptance A - secure JWT setup (23 Oktober 2026, Asia/Jakarta)

- Tidak ditemukan helper login pengujian existing; test-auth.mjs memakai mock. Ditambahkan scripts/set-phase4a-jwts.ps1 untuk operator PowerShell, dengan validator manifest/publicKey Node existing, fixed staging host, hidden email/password, redirect denial, claims/expiry gates, dan verifikasi UID lewat Auth /user. Kedua JWT baru dipasang ke process environment setelah kedua akun lolos; kegagalan membersihkan JWT/refresh. Refresh SUBJECT hanya dipertahankan bila dedicated-session acknowledgement existing aktif. Tidak menulis credential ke storage/file atau mencetak response/error payload.
- Runbook existing docs/phase4a-remediation-validation.md diperbarui; tidak membuat dokumen tambahan. Gunakan helper di proses PowerShell yang sama; Node tidak dapat mengubah environment induk. Execution policy tool menolak pemanggilan .ps1 langsung; alternatif scriptblock membaca helper yang sama tanpa mengubah policy berhasil diuji.
- Actual PowerShell parser PASS; mocked login/identity kedua akun PASS dengan environment terbaca sesudah helper selesai; wrong-identity mock PASS dengan seluruh JWT/refresh dibersihkan; actual local-config rejection PASS tanpa HTTP. Mock bukan bukti Auth staging nyata. npm.cmd run lint PASS exit 0; npm.cmd run build PASS exit 0, warning chunk existing 585.95 kB >500 kB.
- Tidak membaca credential operator, tidak login Auth live, tidak menjalankan fixture SQL, migration atau Acceptance A live. JWT pada terminal operator baru siap setelah helper PASS dan --diagnose PASS di terminal tersebut. Phase 4A security gate tetap belum ditutup.

## Acceptance A USER - post-ack hash failure and guarded resume (23 Oktober 2026, Asia/Jakarta)

- Root cause reproduced locally: supplied COMMITTED string equals expected USER commitAck. USER review file differs from generator only by uncommented fixture_release SET. Canonical SHA256-LF 36a0883bd791818957fcfac92ffcd529b6103faf3609d849bbf6567141c3fb15 matches terminal screenshot; modified SHA256-LF 727990da5478a9e78319d96de6d3065799eee2b66ba4aa9f0b98e44fe3452eaa. Old runAcceptanceA accepted input then rechecked the file; unchanged execution.stage mislabeled this hash failure as fixture-commit-acknowledgement. Restored only the local approval comment; no remote SQL execution. Actual existing review files now PASS 9/9 canonical hash/path verification.
- Runner now labels file verification fixture-file-integrity and classifies exact acknowledgement rejection without retaining raw input in AssertionError. Security checks remain exact. Added explicit --live --resume-committed USER, incompatible with --from/diagnose and other states. Requires policy attestation plus separate USER-COMMITTED-READONLY attestation, all existing preflight/hash guards, GET-only Auth/profile/assignment/role recheck, then full existing USER API suite. Does not prompt for USER fixture commit; cannot reach NO_ROLE until USER passes. No automatic retry/reset/cleanup.
- Extended existing 04-stage-validation-readonly.sql with optional stage A validation_fixture_state=USER. Repeatable-read READ ONLY transaction asserts both Auth UIDs, global profile/assignment counts, exact CONTROL marker/active/super_admin assignment and absence of SUBJECT profile/assignment; emits actor/role details and USER_SNAPSHOT_MATCH, ends ROLLBACK. SQL is prepared, not executed or PostgreSQL-runtime-validated. RLS-visible HTTP snapshot does not replace complete operator SQL snapshot.
- Actual node --test scripts/test-phase4a-package.mjs PASS 41/41: exact reported input/hash reproduction, redacted input failures, CLI guards, resume ordering, rejected drift/UID/assignment/role, USER test failure blocks NO_ROLE, and bounded readonly SQL structure checks. Syntax checks runner/tests PASS. npm.cmd run lint PASS exit 0; npm.cmd run build PASS exit 0; existing 585.95 kB chunk warning remains.
- Updated existing runbook and status only, no new document. No live HTTP, database mutation, fixture rerun, migration or automatic NO_ROLE execution. Operator USER COMMIT remains reported evidence; current database state and runtime API acceptance remain unobserved by Codex.

## Acceptance A NO_ROLE recovery (23 Oktober 2026, Asia/Jakarta)

- Actual local comparison confirmed NO_ROLE differed only by uncommented fixture_release approval. Restored the comment; all nine existing fixture hashes/paths now PASS. Canonical NO_ROLE SHA256-LF d27634a9bd91a68907de7979feb09674f5bf1d622df41adcf2f88ba801421152 matches screenshot. No SQL rerun. Screenshot PASS A-USER followed by file-integrity failure means NO_ROLE HTTP never started. Final HTTP 401 belongs to anonymous USER GET roles denial, not the hash failure or proven JWT expiry.
- Source/unit reproduction confirms USER PASS requires thirteen write attempts denied as 4xx/42501 (six per actor plus SUBJECT NULL-report RPC), then anonymous GET denial. Attempted flag is cumulative, not evidence of successful mutation. Added in-memory state/actor/operation/status attribution and denied/success/unresolved write-response counts without payload, token, query or raw exception output. Counts do not assert database rollback or prove historic absence of side effects.
- Added standalone --diagnose-auth: existing local preflight followed only by two fixed-host staging Auth GET /user calls, verifies manifest UIDs and reports redacted status categories. No refresh/logout, SQL or API writes. Local preflight now requires finite future exp and exact issuer; expired/malformed tokens stop before Auth requests. Existing masked PowerShell login helper remains the operator recovery path only when sessions fail diagnosis; no automatic token replacement.
- Extended existing readonly SQL to optional USER/NO_ROLE snapshot, plus NO_ROLE probe/actor report/history effects checks. NO_ROLE requires two exact active synthetic profiles, both Auth UIDs, exactly one CONTROL super_admin assignment and none for SUBJECT. Current snapshot plus prior PASS denial evidence cannot reconstruct arbitrary history without before-images/audit logs. SQL prepared only; no PostgreSQL runtime claim.
- --live --resume-committed NO_ROLE now requires policy, exact committed-state attestation, previous USER denial/effects attestation, and GET snapshot verification before first NO_ROLE API suite. Does not replay USER, committed fixture SQL or previous USER negative tests. NO_ROLE must PASS before IM prompt; skipped USER is NOT_RUN in the resumed process, prior screenshot remains separate evidence. All hash/path/target/JWT/approval guards retained; no automatic cleanup/retry/reset. Prompts explicitly forbid editing local canonical fixtures; approval only in SQL Editor copy.
- Actual local tests PASS 47/47, including hash regression, last anonymous 401, all thirteen denied USER writes, GET-only Auth/redaction/expiry, NO_ROLE snapshot/role/marker/assignment guards, missing/wrong effects acknowledgement and failed NO_ROLE blocking IM. Runner/API/test syntax PASS; npm.cmd run lint PASS exit 0; npm.cmd run build PASS exit 0, existing 585.95 kB main chunk warning remains. No live HTTP, login, fixture/migration execution, mutating acceptance rerun or cleanup performed by Codex. Updated existing runbook/status; no new document or audit artifact.

## IM committed recovery and editor-only SQL copy (23 Oktober 2026, Asia/Jakarta)

- Local comparison confirmed IM file differed only by uncommented fixture_release; restored comment, all nine fixture hash/path checks PASS. Screenshot SQL shows operator IM profiles=2/assignments=2; runner failed file integrity before any IM HTTP. Telemetry explicitly attributes last 401 to NO_ROLE anonymous roles GET and reports 13 write attempts/13 denied/0 success/0 unresolved from the completed NO_ROLE suite, not an IM Auth failure.
- Extended guarded committed resume to IM: exact snapshot/effects attestations, prior NO_ROLE PASS denial evidence, all existing manifest/target/hash/expiry guards and GET verification of active exact markers plus CONTROL super_admin/SUBJECT information_manager assignments. No prior-state API or IM SQL replay; IM API must PASS before RV prompt. Existing readonly validator supports IM with probe/business-effects checks and ROLLBACK; prepared only, not PostgreSQL-runtime-validated.
- Added standalone --editor-fixture STATE to existing runner for canonical, guarded editor-copy SQL output. Only enables approval in returned text, not local file; no key/JWT/password reads, network, execution or file writes. Output can be piped to Set-Clipboard in another configured PowerShell. Unknown state, wrong target/path/hash or conflicting --live rejected. Intended to prevent repeated local-file edits while a commit prompt waits.
- Actual node --test scripts/test-phase4a-package.mjs PASS 50/50; syntax runner/tests PASS; npm.cmd run lint PASS exit 0; npm.cmd run build PASS exit 0 (existing main chunk 585.95 kB warning). No live HTTP, database write, fixture rerun, migration or cleanup executed. Existing runbook/status updated; no new document or audit artifact.


## Finalisasi release dev ? 29 Oktober 2026 (Asia/Jakarta)

- Melanjutkan seluruh implementasi dan artefak Copilot existing. Tidak restart proyek, tidak mengubah Flutter/staging/client/env, tidak membuat ulang fitur dan tidak menulis Cloud.
- Paket lokal READY_FOR_SCOPED_APPROVAL; deployment/acceptance live belum dijalankan. Satu [runbook final](runbooks/dev-live-admin-operator.md) memuat scope A?E/R dan fallback SQL Editor, dengan manifest SHA256 di operator-evidence/dev-release-20261029/release-manifest.json.
- Guard supabase_admin diperbaiki berdasarkan dokumentasi resmi Supabase: defaults internal provider tetap identik, bukan syarat untuk mengubah role yang tidak dimiliki operator. Hanya postgres/public dipersempit setelah approval guard. Explicit object ACL serta effective EXECUTE anon/authenticated/service_role (termasuk PUBLIC/inheritance) diverifikasi sebelum COMMIT; grant yang membuka RPC sensitif membatalkan transaksi. RLS/RBAC/review reason/locking/history/audit dan private gateway dipertahankan.
- Postflight membedakan defaults informasional dan security_pass aktual. Rollback mempertahankan batas service-only dan data/evidence/quota/audit/backup serta menolak metadata drift; tidak memulihkan broad defaults.
- Migration regions 002 sekarang mempunyai scope guard sendiri dan menolak overwrite helper existing. Seed existing NDJSON cocok SHA256 manifest Copilot, 91.599 row/38 provinsi/416 kabupaten/98 kota/7.285 kecamatan/83.762 desa. Tidak memvalidasi ulang sumber nasional atau mengganti kandidat. Paket memakai derivative publik yang dipin dan memerlukan persetujuan sumber/atribusi. SQL dibagi 184 batch ber-guard; resume hierarchy diperbaiki agar anak berkode lebih rendah tidak terlewati. Tidak DELETE wilayah, UUID existing tetap.
- Bukti aktual: parser release 71 statement/12 PLpgSQL, rollback 32/4, migration 12/3 dan dua postflight read-only masing-masing 4/0 PASS. PostgreSQL fixture runtime 23/23 PASS; regresi seed resume/unknown code/batch guard PASS. Hash seluruh paket dan 91.599 upsert/184 guard serta parser batch pertama/terakhir PASS. npm.cmd run lint PASS exit 0; npm.cmd run build PASS exit 0, main chunk 676.48 kB/gzip197.03 kB dengan warning >500 kB. Source gateway tidak berubah; test backend/Auth/browser sebelumnya dipertahankan, tidak diulang.
- Backup operator existing dan TOC dipakai; ekstraksi schema public lokal PASS, tanpa membaca/mengekspor row bisnis. Ini bukan bukti full restore atau katalog Cloud terkini. BRD asli tidak ditemukan. Koneksi SQL/deployment resmi tidak tersedia pada sesi ini. Bukti CRUD nyata dari Web Admin ? Supabase ? Web Publik dan acceptance Flutter tetap pending sesudah izin/aktivasi; tes lokal/sintetis tidak diberi label live PASS.


## Stage A approval - 29 Oktober 2026 (Asia/Jakarta)

- Explicit user approval received for Admin/Security dev only. B/C/D/E/R remain unapproved.
- Prepared operator-evidence/dev-release-20261029/A-admin-security.APPROVED.sql by enabling only the two target/scope acknowledgements. Canonical/package SHA256 matched; reversing those two edits reproduces the canonical source exactly. Manifest records approval and the derived SQL checksum.
- No authenticated administrative SQL connection is configured in this process; Supabase plugin is available but not installed/connected. No connected document session exists. No Cloud mutation attempted, no deployment or postflight success claimed.
- SQL Editor fallback: confirmed dev project uiuiouosblyuqgnvfpeh, run the complete approved A transaction once, then existing A-postflight-readonly.sql. Require security_pass=true before requesting B. No new audit, no repeat of previous PASS runtime/lint/build checks; application/SQL implementation unchanged.


## A deployed / B operator SQL ready - 29 Oktober 2026 (Asia/Jakarta)

- A = DEPLOYED / SECURITY PASS from operator-supplied complete postflight JSON plus screenshots on rekansiaga-dev / uiuiouosblyuqgnvfpeh. SQL A reported success; security_pass=true, 10/10 RPC ACL checks PASS, 22/22 RLS enabled, evidence bucket/report boundaries PASS. Recorded as operator evidence, not a new agent Cloud query.
- B ready: derived B-regions-integrity.APPROVED.sql from existing migration 002 by enabling exactly two approval lines; migration body untouched. User requested operator SQL Editor execution only; no automatic Cloud mutation.
- Added requested migration-only B-postflight-readonly.sql: index, deferred hierarchy trigger, invoker helper ACLs, regions RLS and current catalog integrity; no 91599-row requirement until C. New query grammar PASS (4 statements). Existing migration runtime PASS retained; no A audit/runtime/lint/build rerun because the user explicitly requested retaining PASS checks. No application, Flutter or staging changes.
- Existing C SQL/184 batches/91599-region dataset retained, not regenerated/revalidated. After operator B migration_pass=true, prepare C handoff and request separate import approval. Manifest, existing evidence/status and shared contract updated; A deployment is not a claim of live CRUD/gateway/Flutter acceptance.


## B deployed / C import handoff ready - 29 Oktober 2026 (Asia/Jakarta)

- B = DEPLOYED / MIGRATION PASS from user-pasted postflight JSON and SQL Editor screenshots on confirmed dev. migration_pass=true; index_ready/regions_rls/helper_acl_pass/catalog_integrity/hierarchy_trigger_ready=true; both helper checks PASS. All regional counts and integrity error counts are zero before C. Evidence recorded in existing manifest/status; no new Cloud checks or audit.
- C = READY FOR SCOPED APPROVAL: retained existing pinned dataset, 91599 upserts, 184 transaction batches and existing C postflight. Added only C-IMPORT.md handoff with scope, attribution, counts, ordered execution/resume and completion criteria. No seed regeneration, repeat data validation, migration tests, lint or build. No implementation, Flutter or staging changes.
- C permission remains false, import NOT_RUN, agent Cloud mutations 0. Request explicit C approval before enabling the two acknowledgement statements in execution copies. D/E/R remain unapproved.


## C approved / execution copies prepared - 29 Oktober 2026 (Asia/Jakarta)

- Explicit user approval received for 91599-region import into dev. A SECURITY PASS and B MIGRATION PASS evidence retained; no repeated Cloud checks or audit. D/E/R unapproved; operator-only Cloud execution restriction retained.
- Prepared regions-national.APPROVED.sql and regions-batches.APPROVED/batch-001.sql through batch-184.sql from the existing package, enabling only two target/scope SET acknowledgements. All 185 source hashes matched the manifest, and reversing the two comment changes reproduces each source byte-for-byte. No dataset regeneration, row changes, SQL body changes, repeated lint/build or prior PASS tests.
- Operator runs approved batches in order, 500 rows each except final 99, then existing C-regions-postflight-readonly.sql once. Require pass=true, total91599 and expected hierarchy counts/errors. Stop on an error or uncertain commit, verify that batch before resume; do not delete/reset. Agent Cloud mutations 0; import not claimed deployed.


## C batch concatenation requested by user - 29 Oktober 2026 (Asia/Jakarta)

- Prepared C-regions-batches-001-184.APPROVED.sql as one file containing the 184 existing approved batches, with original transactions/guards unchanged and existing read-only C postflight appended. Also prepared conditional remainder C-regions-batches-176-184.APPROVED.sql (4099 upserts), for use only if 001-175 are confirmed committed. No commit state inferred from active IDE tab.
- Input package hashes matched; every concatenated section and final postflight were verified byte-identical. Packaging checks only, no repeated A/B audit, dataset regeneration, prior PASS tests, lint/build or Cloud mutation. No implementation/Flutter/staging changes. C remains approved, actual import completion not observed; require final pass=true and total91599 before D approval.


## C resized to exactly 15 files - 29 Oktober 2026 (Asia/Jakarta)

- User reported the 27 MB concatenation was too long to run and requested 15 connected files plus deletion of the oversized file. Created regions-15-parts.APPROVED/part-01.sql through part-15.sql. First four parts contain 13 original batches each; remaining eleven contain 12 each. All 184 source batches occur once in order, total 91599 upserts; every original section is byte-identical, including guards/transactions. Existing final read-only postflight included only in part15. Largest file 1938226 bytes.
- After verifying replacements, removed exactly C-regions-batches-001-184.APPROVED.sql and C-regions-batches-176-184.APPROVED.sql with PowerShell literal paths checked inside the release directory. Historical hashes retained under removedGeneratedFiles; current manifest/guide/runbook point to the 15-part package. Other original sources, backups and data retained.
- Packaging verification only; no repeated A/B audit, implementation tests, lint/build or Cloud mutation. Prior Cloud committed state remains unknown; use next-uncommitted batch marker if some work succeeded. C approval retained; D/E/R not authorized.


## C actual SQL Editor size rejection fixed by compact VALUES - 29 Oktober 2026

- Operator screenshot confirms old part01 was rejected as too large by SQL Editor. Earlier concatenation/splitting retained repeated row SQL and was insufficient. Replaced the same 15 local files with compact INSERT SELECT VALUES grouped by administrative level inside each original transaction. Original source rows/184 transaction guards/approval scope retained; no new table/RPC/RLS/grants.
- Actual sizes now 299251-375819 bytes per file, versus 1644800-1938226 bytes before. New local tooling scripts/compact-regions-package.py requires every source hash to match, parses all generated SQL, compares all 91599 code/name/type/parent values in exact order, verifies parent-before-statement and enforces a 500000-byte ceiling before replacing output. PASS. No dataset source regeneration or repeated national-source audit.
- New-format runtime test scripts/test-compact-regions.mjs PASS: scope guard before insert; 13000 rows across all four levels with correct 38/514/7285/5163 counts and zero hierarchy errors; ON CONFLICT preserves UUID/count; missing parent triggers transaction rollback. Disposable local PostgreSQL only; no Cloud A/B audit. npm.cmd run lint PASS exit0 for newly added tooling. Frontend build PASS retained; frontend not changed.
- Guide instructs reopening local part files and replacing the complete old SQL Editor text. Existing C postflight remains at end of part15. No Cloud mutation/acceptance claimed; last committed batch unknown. Flutter and staging untouched.


## C operator psql runner ready - 29 Oktober 2026 (Asia/Jakarta)

- Latest user explicitly requested one Windows PowerShell invocation using installed psql18, Session Pooler/SSL and no automatic Cloud mutation. Prepared scripts/import-dev-regions.ps1 plus one complete C-regions-psql.APPROVED.sql (5044469 bytes), formed from 15 existing compact approved parts without changing their SQL/data. All 184 original guarded transactions and 187 compact INSERT statements retained; final existing READ ONLY postflight remains. No A/B audit, dataset regeneration, schema change, Docker/server installation, Flutter or staging change.
- Fixed dev routing via username postgres.uiuiouosblyuqgnvfpeh, database postgres, official Session Pooler host allowlist, port5432, sslmode=require. -X disables startup scripts; -W asks password in native psql, never PowerShell parameters/files/logs. Child-only PG variables removed; parent untouched. One psql process, ON_ERROR_STOP, nonblocking session advisory lock, no --single-transaction around existing batch COMMITs, no automatic retry. Ctrl+C cleanup terminates child; disconnect rolls back current transaction; successful earlier transactions remain. Upsert code preserves UUIDs/avoids duplicate codes on an intentional retry.
- Local new-runner checks PASS: PowerShell parser; installed psql18.6 --version; CheckOnly input hash/ref/scope check without connection; invalid host rejection before connection; mocked native-process success verifies route/SSL/flags/password isolation/count result; mocked exit3 stops without verification artifact/retry; mocked count mismatch fails closed. Test results are fixtures only, not actual psql/TLS/Cloud acceptance.
- System script policy rejects direct .ps1 execution; supplied operator command uses powershell.exe -NoProfile -ExecutionPolicy Bypass -File for that single process, without changing machine policy. No actual database password read or Cloud connection attempted by agent. Existing A/B tests and frontend lint/build not repeated; only PowerShell/SQL packaging changed. C-psql-verification.json is written only by a successful real operator run, never from tests in the release directory. D/E/R remain unapproved.

Tahap D: operator melaporkan tiga secret nonprivileged sudah disimpan. Sumber/format empat variabel tersisa dan generator HMAC ke clipboard didokumentasikan pada D-GATEWAY.md. Deployment disabled diotorisasi secara bersyarat sesudah konfigurasi lengkap; belum dijalankan. Header ingress hosted belum terkonfirmasi; tidak menebak nilai dari nama provider CAPTCHA. Gateway/Flutter/database/A-C tetap tidak diubah atau diuji ulang. Tidak ada nilai secret dibaca/dibuat melalui agent.

### Integrasi Sitekey Web - 30 Oktober 2026

Sitekey publik widget RekanSiaga Dev yang diberikan operator sudah dipasang sebagai `VITE_TURNSTILE_SITE_KEY` pada `.env.local` existing yang diabaikan Git. Environment lain dipertahankan; flag `VITE_REPORT_GATEWAY_ENABLED=false` dibuat eksplisit sesuai kondisi sebelumnya yang default disabled. Tidak ada Secret key atau service-role key ditambahkan ke frontend. Komponen/API existing tidak perlu dibuat ulang atau diubah.

Pemeriksaan fokus fitur laporan: lint `src/features/reports` dan kedua halaman laporan PASS; `npm.cmd run build` Web PASS, dengan warning ukuran bundle existing >500 kB. Lima belas pemeriksaan lokal komponen/kontrak PASS memakai hook/widget/fetch sintetis: sitekey Vite diteruskan ke widget; action submit/track; token kosong/expired/error menahan pengiriman; token baru sesudah penolakan; field `captcha_token` pada JSON POST gateway; request anonim; reset/unmount; flag disabled tidak mengirim request. Tool lokal `.tools/verify-turnstile-components.mjs` tidak memakai provider atau menulis Cloud.

Percobaan browser otomatis lokal tidak dapat membuka WebSocket CDP Chrome (ECONNRESET); tidak dicatat sebagai PASS. Acceptance widget Cloudflare dan submit/track Gateway nyata NOT_RUN. CAPTCHA tidak tampil pada kedua form selama flag frontend false; aktifkan hanya pada pengujian aktivasi yang disetujui setelah backend siap. Operator sudah melaporkan TURNSTILE_SECRET_KEY disimpan di Supabase, tanpa nilai dibaca agent. REPORT_PUBLIC_KEY dan REPORT_RATE_HMAC_KEY belum dikonfirmasi tersimpan, header ingress masih belum terkonfirmasi, deployment Gateway belum terbukti. A-C tidak diulang, Gateway/staging/Flutter/database tidak diubah.

Validasi perubahan kuota D: 20 tes lokal Gateway/config/RPC PASS (termasuk header spoofing, cold-start bucket stability, action limits, fail-closed dan rollback atomik), lint tiga file TS Gateway PASS, typecheck Edge PASS. Tidak menjalankan build/lint Web karena frontend tidak berubah. Runtime SQL hanya fixture PGlite lokal satu koneksi; bukan bukti multi-session Cloud. A-C tidak diulang.

Deployment D quota change: 5 mock PowerShell scenarios PASS without IP/HMAC secret names, CheckOnly PASS against refreshed Gateway source hashes. Cloud deployment/probe remain NOT_RUN; server/Web activation flags remain false. No repeated Web build or A-C checks.

Validasi tooling E baru saja: 4 tes activation-only probe/local-env editor PASS; 9 skenario PowerShell mock PASS (default/names-only tanpa mutasi, missing/malformed metadata berhenti aman, activation success, kegagalan CLI/probe/frontend dan rollback). Local CheckOnly PASS. Hanya pengujian baru ini dijalankan; tes Gateway/UI dan A-D yang sudah PASS tidak diulang. Tidak ada perubahan source Gateway/Flutter/staging atau flag frontend nyata saat persiapan ini.
# Checkpoint peta publik â€” 2 November 2026

Leaflet lokal PASS build/lint. `PublicMap` kini menggabungkan lokasi kejadian/posko existing dengan query feature-flagged untuk laporan verified tersanitasi, polling 30 detik, marker canonical, lokasi perangkat, dan modal ringkasan. SQL proposal `supabase/releases/dev-public-report-map.PROPOSED.sql` belum dijalankan Cloud. Scope operator yang disetujui hanya RPC read-only marker verified; tidak membuka SELECT `public_reports`, tidak mempublikasikan foto/lampiran, dan tidak mengubah Flutter/staging/data existing. Status peta laporan: **READY FOR CONTROLLED DEPLOYMENT; LIVE NOT RUN**.

Perubahan terakhir: `src/features/maps/PublicMap.tsx`, `src/features/maps/mapService.ts`, `.env.example`, dan SQL proposal peta. Validasi aktual: `npm run build` PASS, `npm run lint` PASS. Flag `VITE_PUBLIC_VERIFIED_REPORT_MAP_ENABLED` tetap false sampai postflight Cloud.

Perbaikan lanjutan: form kini meneruskan koordinat perangkat/manual ke Gateway; variasi semua jenis bencana dipetakan termasuk erupsi; modal mengunci scroll dan hanya ditutup X/kontrol eksplisit. Foto verified memakai signed URL sementara melalui Gateway, Turnstile dan rate limit, tanpa membuka bucket privat. Proposal SQL/Gateway foto belum diterapkan Cloud. Build, lint, dan Edge typecheck PASS.
# Checkpoint integrasi bukti lokasi â€” 2 November 2026

Error `42P13` pada SQL peta disebabkan perubahan return type fungsi yang sudah ada; proposal kini drop/recreate dalam transaksi. Laporan peta tetap harus `verified` dan memiliki koordinat valid. Lokal: GPS/manual coordinates diteruskan ke Gateway, akurasi GPS ditampilkan, kamera dan galeri didukung, foto tidak diwajibkan, semua tipe bencana dipetakan, dan modal scroll-lock/X-only. Super Admin correction proposal tersedia dengan history; public-photo approval proposal memisahkan approval dan salinan tanpa EXIF/GPS. Tidak ada Cloud mutation.

Validasi PASS: build, lint, Edge typecheck, review 12/12, Gateway/RK2 15/15. LIVE belum dijalankan.

Status operator 21:09 WIB: peta RPC dilaporkan berhasil, tetapi koreksi Admin `verified â†’ unverified` gagal karena RPC Cloud masih kontrak transisi lama. Operator menyetujui penerapan `dev-report-review-correction.PROPOSED.sql`; belum ada bukti penerapan sampai postflight Success.

Update 21:11 WIB: SQL correction dilaporkan Success, tetapi blocker client enum mencegah `review_public_report` dipanggil untuk `unverified`. Patch enum lokal selesai; review test 12/12 dan lint PASS. Restart Vite + hard refresh diperlukan; LIVE belum PASS.
## Checkpoint terbaru — integrasi konten dan media — 2 November 2026

**Status: PASS LOCAL / NEEDS CLOUD; belum LIVE PASS.**

- `public_event_feed_v1` menjadi kontrak bersama Pemantauan dan peta; event tanpa koordinat tetap tampil di daftar tanpa marker palsu.
- CMS artikel memakai upload server-side `article-media`; gambar dinormalisasi dan metadata sensitif dibuang sebelum penyimpanan.
- `report-publication` memakai CORS bersama yang mengizinkan `x-client-info`; foto asli tetap pada bucket privat dan salinan publik hanya melalui approval terpisah.
- Validasi PASS: integrated-content 8/8, SQL contract 19/19, build, lint, dan Edge typecheck.
- Cloud belum diubah pada checkpoint ini. Deployment SQL integrated-content, `article-media`, dan hotfix `report-publication` masih menunggu persetujuan/eksekusi operator.

Acceptance LIVE yang masih wajib: RPC feed tersedia, event/lokasi publik tampil, upload/publish/archive artikel bekerja, approval/revoke foto bekerja, salinan publik kehilangan EXIF/GPS, anonim tidak dapat membaca `report-evidence`, dan filter/refresh tidak menghapus draft. Tidak mengubah Flutter atau staging.

## Foto utama kejadian bencana — 3 November 2026

- Implementasi lokal: Admin kejadian kini memiliki pemilih, preview, replace dan revoke untuk satu foto utama opsional; penyimpanan teks kejadian tetap dapat dilakukan tanpa foto.
- Desain: bucket privat terpisah `event-media`; normalisasi PNG + sanitizer server-side reused; RPC terikat role/versi dan audit; signed URL 60 detik hanya untuk foto aktif pada event terbit/terverifikasi. Tidak menyentuh lampiran laporan atau objek lama secara fisik.
- Gambar dirender pada kartu pemantauan, detail kejadian, dan ringkasan marker peta. Ini wiring kode lokal, belum acceptance runtime.
- SQL dan Edge Function baru masih proposal lokal. Cloud belum diubah; flag `VITE_EVENT_MEDIA_ENABLED` tetap off. Kontrak mobile didokumentasikan; Flutter/staging tidak diubah.
- QA: lihat `docs/qa/stage-e/event-image-status.json`. Langkah berikut: review paket, persetujuan operator satu kali untuk SQL+Edge dev, postflight, lalu acceptance event TEST upload→public reads→replace→revoke. Tidak mengklaim LIVE PASS.

### Status foto kejadian — 3 November 2026 (persetujuan diterima)

- Operator menyetujui paket migrasi + Edge Function khusus `rekansiaga-dev` (`uiuiouosblyuqgnvfpeh`). Tidak ada persetujuan untuk staging/Flutter atau area lain.
- Verifikasi lokal terdampak: ESLint file terkait PASS; `npm run build` PASS (peringatan chunk >500 kB yang sudah ada); `npm run typecheck:edge` PASS.
- Deployment belum dijalankan/terkonfirmasi di sesi agent. CLI Supabase tidak dapat diakses dari terminal ini; SQL parser native lokal juga diblokir Windows Application Control. Tidak ada flag frontend yang diaktifkan dan tidak ada klaim Cloud/LIVE PASS.
- Paket tunggal siap dijalankan dari PowerShell operator dengan password hanya pada prompt native: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-event-media.ps1" -ApprovedEventMedia`. Runner memeriksa target, read-only baseline, SQL guard dan postflight sebelum deploy function. Bila gagal/hasil commit tidak pasti: berhenti, jangan retry.
- Sesudah postflight/function PASS, aktifkan `VITE_EVENT_MEDIA_ENABLED=true` lokal, restart Vite, lalu uji satu event sintetis TEST: upload, baca di pemantauan/detail/peta, replace, revoke. Tanpa gambar kejadian tetap dapat disimpan.
### Runner correction — Supabase pooler authentication (3 November 2026)

Screenshot showed PostgreSQL password authentication failure during the read-only preflight; no SQL or Edge Function was applied. The event-media runner no longer assumes a pooler hostname: it now prompts for the HOST only copied from Dashboard > `rekansiaga-dev` > Connect > Session pooler, while pinning the username to `postgres.uiuiouosblyuqgnvfpeh`, database `postgres`, port 5432 and SSL. Local-only mode and PowerShell parser check PASS. If authentication still fails with the exact host and project database password, stop and verify the database password in Dashboard; do not paste it into chat/arguments/files and do not retry a failed mutation (none occurred in the shown run).
### Operator deployment confirmation — event media (3 November 2026)

Operator terminal confirms read-only baseline passed, guarded event-media SQL postflight PASS, and Edge Function `event-media` deployed on `rekansiaga-dev` (`uiuiouosblyuqgnvfpeh`). Set local `.env.local` `VITE_EVENT_MEDIA_ENABLED=true`; restart Vite before testing. Cloud deployment status is PASS by operator evidence; synthetic upload and public rendering on monitoring/detail/map plus replace/revoke remain NOT RUN. Do not claim feature acceptance until browser results are observed.
# Checkpoint terbaru — Informasi Utama Beranda (3 November 2026)

Status: **PASS LOCAL / OPERATOR APPROVAL RECEIVED / CLOUD DEPLOYMENT PENDING / LIVE NOT RUN**. Implementasi lokal terhubung ke CMS Artikel dan Supabase reader, bukan record terpisah. SQL package menegakkan satu unggulan atomik, role/RPC + audit, auto-clear saat draft/archive/unpublish, fallback latest published, dan public-only DTO; RLS artikel existing dipertahankan. PostgreSQL/WASM tes terfokus PASS 11/11; lint/build PASS (warning bundle >500 kB existing). Approval migration additive pada `rekansiaga-dev` diterima 3 Nov 2026, tetapi sesi ini tidak memiliki Supabase CLI siap pakai/auth jaringan dan runner memerlukan password database pada prompt native operator; belum ada Cloud mutation atau live verification. Runbook: `docs/runbooks/featured-article-v1.md`; evidence: `docs/qa/stage-e/featured-article-local.json`. Flutter contract ditambahkan, tanpa mengubah proyek Flutter.

Satu paket operator yang tersisa: jalankan `scripts/deploy-dev-featured-article.ps1 -ApprovedFeaturedArticle` dari PowerShell interaktif pada repo `D:\Rekan Siaga\rekansiaga-web`, masukkan pooler host dan password hanya pada prompt native, periksa postflight PASS, aktifkan `VITE_FEATURED_ARTICLE_ENABLED=true`, restart Vite, lalu lakukan acceptance synthetic tanpa membuat row duplikat. Jangan retry jika hasil commit tidak pasti. Rollback SQL memerlukan persetujuan tersendiri.

## UI Admin — kontrol draf sementara (3 November 2026)

Kontrol “Draf sementara” dipindahkan dari header global ke halaman Admin → Pengaturan agar tidak mengganggu presentasi. Penyimpanan draf form tetap aktif; pengikatan/pembersihan draf terhadap sesi akun tetap berjalan global. Verifikasi setelah perubahan: `npm run lint` PASS dan `npm run build` PASS (warning ukuran chunk existing >500 kB). Belum ada uji browser manual pada checkpoint ini.

## Beranda — perbaikan kartu Informasi Utama (3 November 2026)

Kartu unggulan dibatasi lebar kontennya, memakai grid dan rasio gambar yang konsisten, serta memiliki fallback visual yang tidak memaksa tinggi kartu. Sampul unggulan sekarang dimuat eager agar signed URL Storage berumur pendek tidak kedaluwarsa sebelum lazy-load; bila featured RPC tidak memberi URL sampul, komponen memakai URL sampul dari daftar artikel untuk slug yang sama. `npm run lint` PASS dan `npm run build` PASS (warning ukuran chunk existing >500 kB). Belum ada verifikasi browser manual; status render gambar LIVE tetap menunggu konfirmasi visual.

## Perbaikan gambar sampul publik artikel (3 November 2026)

Akar masalah pada jalur kode: Admin menandatangani objek private `article-media` dengan sesi staf, sementara public reader meminta signed URL melalui klien anonim dan diam-diam menjadikan error sebagai sampul kosong. Jalur publik kini diarahkan melalui Edge Function `public-article-cover`, yang hanya menandatangani cover artikel dengan slug valid yang sedang `published` dan `published_at` terisi, serta memastikan path sesuai ID artikel. Bucket tetap privat dan tidak ada policy/schema/data yang diubah. Lint, build, Edge typecheck, dan parser script deployment PASS; warning build chunk >500 kB tetap existing. Deployment function dan browser acceptance belum dilakukan. Paket serta checklist: `docs/runbooks/public-article-cover.md`; perintah operator: `scripts/deploy-dev-public-article-cover.ps1 -ApprovedPublicArticleCover` pada project dev saja.

## Location-based disaster alerts — local implementation checkpoint (3 November 2026)

Status **PASS LOCAL / NEEDS CLOUD APPROVAL / LIVE NOT RUN**. Existing schema has published, verified `disaster_events` and generic `notifications` queue, but no location-targeted, expiring/revocable alert contract. Added an additive proposal: `disaster_alerts` table, RLS, staff role checks, audit trigger, Super Admin-only official source classification, and minimized `public_active_disaster_alerts_v1(uuid)` reader. Public clients cannot SELECT the alert table. Reader returns only active/unexpired alerts linked to published verified unresolved events and matching the manually selected district or its administrative ancestors. No citizen report is auto-promoted.

Local Web now has an app-wide modal/controller, local district preference, ID+version seen dedupe, severity priority, expiry and route/ETA safeguards; an alert management resource under Admin → Notifikasi; and the shared reader panel on `/pemantauan` and `/peta`. Map deliberately does not invent polygons/markers; only existing verified event coordinates remain map points. GPS is not accessed. Alerts and writes default OFF with `VITE_LOCATION_ALERTS_ENABLED` and `VITE_DEV_ALERT_WRITES_ENABLED`; write flag is pinned to dev URL and alert resource only.

Focused PGlite/policy checks **8/8 PASS** (`docs/qa/stage-e/location-alerts-local.json`). Browser visual/accessibility, Cloud, Web live, and Flutter runtime acceptance are NOT RUN. Flutter DTO/RPC guidance is in `docs/mobile-content-contract.md`; Flutter repo was not edited. No Cloud mutation, test alert, push provider, staging operation, or data cleanup was performed. Build warning on existing >500kB bundle is known.

One Cloud approval package, not yet approved/applied: `supabase/releases/dev-location-alerts-preflight.sql`, `dev-location-alerts.PROPOSED.sql`, `dev-location-alerts-postflight.sql`, non-destructive `dev-location-alerts-rollback.sql`, and `scripts/deploy-dev-location-alerts.ps1`. Procedure and LIVE checklist: `docs/runbooks/location-alerts-v1.md`. Next: review/approve this exact dev-only package; operator executes once, then enables the two local flags and tests one synthetic event+alert end-to-end. Do not claim LIVE PASS before observed acceptance.


## Location alerts - final local validation (3 November 2026)

The focused alert suite passed 8/8; lint, production build, Edge typecheck, and deployment-runner PowerShell parse passed. Build retains the existing main-bundle >500 kB warning. No alert Cloud migration, data write, deployment, frontend activation, browser acceptance, GPS, Flutter runtime, or push test occurred. The article-cover deployment is a separate function and does not activate this feature. Continue from `docs/runbooks/location-alerts-v1.md`; Cloud approval and synthetic live acceptance are still required.

## Location alerts - approved deployment attempt blocked before DB preflight (3 November 2026)

Operator approved the exact dev-only package. The guarded runner was started but emitted no CLI/DB prompt or preflight result; it was interrupted before the runner could request the Session Pooler host and native psql password. Its order runs `supabase projects list` first, then prompts for host, then runs read-only preflight, then migration/postflight. Therefore this attempt did not reach PostgreSQL and no migration/RLS/RPC/audit object, Edge Function, alert row, or frontend flag was changed. Postflight is NOT RUN; deployment status is BLOCKED, not PASS. Keep `VITE_LOCATION_ALERTS_ENABLED` and `VITE_DEV_ALERT_WRITES_ENABLED` false/unset. Retry only once from the operator's interactive PowerShell using the guarded runbook command; if CLI project listing stalls/fails, stop and report the sanitized CLI status. No automatic SQL retry was performed.

### Operator deployment confirmation - 3 November 2026 (supersedes blocked attempt)

Operator terminal screenshot confirms read-only baseline PASS and `Location-alert SQL postflight PASS on rekansiaga-dev`. The guarded package created the location alert SQL/RPC/RLS/RBAC/audit objects; postflight checked table RLS, anonymous direct table SELECT denied, public reader presence/anon execution, and audit trigger. No Edge Function, secret, push service, or application data changed; the package does not require an Edge Function. Status is **DEPLOYED / POSTFLIGHT PASS by operator evidence**. Browser/live CRUD acceptance remains NOT RUN. The two flags remain OFF in the operator result: enable locally with `VITE_LOCATION_ALERTS_ENABLED=true` and `VITE_DEV_ALERT_WRITES_ENABLED=true` only after deciding to expose the UI; do not create TEST data until separate approval.

## Mobile CMS integration contract - 3 November 2026

Created `docs/mobile/WEB-MOBILE-INTEGRATION-CONTRACT.md` from the Web CMS/readers, base articles schema/RLS, integrated-content and featured-article SQL packages, media Edge Functions, and operator deployment outputs already present in this conversation. It covers article schema/types, public list/detail queries and pagination, featured RPC/fallback/archive behavior, private `article-media` cover delivery, Dart reader/lifecycle examples, and RLS boundaries. Operator evidence confirms integrated-content/article-media deployment, featured-article SQL postflight PASS, and public-article-cover function deployment on rekansiaga-dev; browser and Flutter runtime acceptance remain unproven. Local integrated-content/featured flags were true in `.env.local` at inspection. No Cloud operation or Flutter edit was made for this documentation-only task. Latest mobile handoff: `docs/AGENT-HANDOFF-REKANSIAGA.md`.

## Location alerts deployment recheck — 3 November 2026

The operator reconfirmed the same deployment scope. A redundant agent-side runner invocation reached the native psql password prompt after project verification and was stopped before read-only preflight; it made no SQL or Cloud changes. The prior operator output confirming read-only baseline PASS and `Location-alert SQL postflight PASS on rekansiaga-dev` remains authoritative. Do not redeploy. Both frontend flags remain unchanged; browser acceptance and separate TEST-data approval are still pending.

## Smart Rescue Relay SOS - 3 November 2026

Status: **PASS LOCAL IMPLEMENTATION / CLOUD NOT DEPLOYED / LIVE NOT TESTED / NOT READY FOR REAL EMERGENCY USE**. Web now has an off-by-default consent-gated submit/track/revoke flow and off-by-default Admin queue/status/history contract. Prior `/darurat` behavior only showed contacts/local location preview. Official contact directory remains separate; no BPBD/SAR dispatch is claimed. GPS and battery are opt-in; SOS never appears on public map.

Files: `src/features/emergency/sosRelay.ts`, `SOSDialog.tsx`, `AdminSosPage.tsx`, router/RBAC/navigation, `supabase/functions/sos-relay/index.ts`, additive SQL/preflight/postflight/rollback proposal, `.env.example`, `supabase/config.toml`, `scripts/deploy-dev-sos-relay.ps1`, `docs/runbooks/sos-relay-v1.md`. Mobile contract updated; Flutter unchanged.

Validation: local PGlite checks **5/5 PASS**; `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run typecheck:edge` **PASS**. Existing >500 kB bundle warning remains. PGlite synthetic DB is not Cloud proof. Native PostgreSQL compile, runner parse, browser, CAPTCHA, Cloud RBAC, Flutter and E2E are **NOT_TESTED**. No Cloud mutation, secrets, synthetic Cloud rows, staging or Flutter edits.

Blockers: explicit exact-scope Cloud approval and postflight; set/verify `SOS_CREDENTIAL_HMAC_KEY` and `SOS_ALLOWED_ORIGINS`; finish native PostgreSQL/API compatibility tests; add retention cleanup (180-day timestamp exists only); improve global quotas to verified caller-specific abuse limiting; approve a privacy-safe internal map provider. See `docs/qa/sos-relay-v1/STATUS.md` and `docs/runbooks/sos-relay-v1.md`.

SOS QA correction: `npm.cmd run test:sos-relay` is now **8/8 PASS**, including expired credential, durable quota, revoke, privacy boundary and Admin monotonic/audit cases. PowerShell parser-only check is PASS; deployment runner was not executed. Native Supabase PostgreSQL/PostgREST remains NOT_TESTED. This supersedes the initial SOS checkpoint count; no Cloud actions occurred.
