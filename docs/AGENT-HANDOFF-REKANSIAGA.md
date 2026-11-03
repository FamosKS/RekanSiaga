### Checkpoint integrasi konten ? 3 November 2026

Status terbaru: **PASS LOCAL / NEEDS CLOUD**. Validasi terakhir: sanitizer/contract 7/7, PostgreSQL/WASM 18/18, lint/build/Edge typecheck PASS; build memberi warning bundle existing >500 kB. Riwayat CORS lokal pernah 3/3 dan UI pernah 9 alur PASS, tetapi pengulangan keduanya sekarang BLOCKED oleh CDP timeout sebelum assertion. Tidak ada mutasi Cloud pada siklus terakhir.

Perubahan yang sudah tersedia lokal mencakup feed terkurasi `public_event_feed_v1`, peta/pemantauan berbagi kontrak kejadian publik, pengaitan laporan verified ke event tanpa publikasi otomatis, CMS artikel dengan upload `article-media` tersanitasi, serta CORS `report-publication` yang menerima `x-client-info`. RLS/RBAC, CAPTCHA, rate limiting, bucket laporan privat, dan kompatibilitas RK2 tidak dilemahkan.

Yang masih BLOCKED: persetujuan operator untuk deploy SQL `dev-integrated-content.PROPOSED.sql`, hotfix CORS Edge Function `report-publication`, Edge Function `article-media`, lalu acceptance LIVE terbatas. Belum ada bukti feed/event, upload artikel, atau photo-approval end-to-end Cloud. Jangan mengulang SQL bila hasil deployment tidak pasti.

Paket persetujuan operator:
1. Terapkan satu SQL `supabase/releases/dev-integrated-content.PROPOSED.sql` pada `rekansiaga-dev`, dengan guard dan postflight read-only.
2. Skrip yang disiapkan deploy hanya hotfix `report-publication` dan `article-media`; jangan deploy ulang Gateway/RK2 atau mengubah secrets/policy.
3. Setelah sukses, aktifkan `VITE_INTEGRATED_CONTENT_ENABLED=true`, rebuild/restart Web, lalu jalankan acceptance LIVE terbatas sesuai runbook `docs/runbooks/integrated-content-v1.md`.

Rollback: jangan menjalankan SQL kedua jika hasil tidak pasti; rekonsiliasi metadata dan deployment function per fungsi. Untuk frontend, kembalikan flag ke `false` dan restart. Bucket laporan asli tetap privat.

# Hotfix publikasi foto ? 2 November 2026

LIVE read-only OPTIONS report-publication HTTP204 mengizinkan authorization,apikey,content-type tetapi belum X-Client-Info yang dikirim SDK. Browser memblokir POST pada preflight; source dan probe cocok. Bukti: docs/qa/stage-e/publication-cors-live-before.json. Local Chrome mereproduksi kegagalan dan membuktikan perbaikan;3 checks PASS di publication-cors-local.json. Lint/build/typecheck Edge PASS (warning bundle existing). Shared publicationCors.ts dan error khusus publicationError.ts diperbaiki; UI memakai pesan foto tanpa anjuran mengirim ulang laporan. Tidak ada Cloud mutation, SQL/RLS/Storage/status atau sanitizer diubah. Keseluruhan pipeline foto belum LIVE PASS.

Deploy hotfix function existing saja oleh operator:
```powershell
npx.cmd --yes supabase@2.120.0 functions deploy report-publication --project-ref uiuiouosblyuqgnvfpeh --use-api --no-verify-jwt
```
GET live tanpa JWT mengembalikan405, konsisten platform verify_jwt nonaktif existing; POST tetap memvalidasi Auth getUser dan staff role di handler. Jangan mengulang report-gateway/SQL atau mengubah secrets/policy. Setelah deploy, cek preflight lalu operator menguji satu foto yang memang diizinkan; jangan agent memublikasikan foto nyata atau retry hasil takpasti. Sanitasi/Storage/RPC tahap berikut belum dibuktikan oleh probe CORS.

# RekanSiaga — handoff agent, 2 November 2026

## Checkpoint integrasi bukti lokasi dan koreksi review — 2 November 2026

Error SQL operator teridentifikasi: `list_public_verified_report_map()` sudah terpasang dengan return type lama, sehingga `CREATE OR REPLACE` menolak `photo_key` (`42P13`). Proposal peta diperbaiki dengan `DROP FUNCTION public.list_public_verified_report_map()` di dalam transaksi lalu recreate; jika gagal transaksi rollback. Peta tetap hanya menerima laporan `verified` dengan koordinat valid.

Perubahan lokal: form meneruskan koordinat GPS/manual yang valid, menampilkan estimasi akurasi GPS, input foto mendukung kamera (`capture=environment`) dan galeri, foto opsional tetap diterima, seluruh kategori bencana dipetakan, dan modal mengunci scroll serta hanya ditutup X. Proposal `dev-report-review-correction.PROPOSED.sql` memberi Super Admin koreksi status kapan saja dengan history/audit; verifier tetap forward-only. Proposal `dev-public-report-photo-approval.PROPOSED.sql` memisahkan persetujuan foto dan mewajibkan salinan publik tersanitasi tanpa EXIF/GPS; belum diterapkan.

Jalur foto signed URL ke foto asli sengaja tidak dipakai pada peta. Foto asli tetap privat. Foto publik baru boleh ditampilkan setelah pipeline salinan aman, approval Admin, bucket publik terpisah, dan revoke/audit tersedia.

Validasi: build PASS, lint PASS, Edge typecheck PASS, review scope 12/12 PASS, Gateway/RK2 regression 15/15 PASS. Belum ada LIVE PASS. Tidak ada mutasi Cloud pada checkpoint ini.

## Status operator 21:09 WIB — approval koreksi review

Operator melaporkan peta RPC sudah dijalankan tetapi Admin gagal menerapkan koreksi status dengan pesan schema/API incompatible. Screenshot menunjukkan laporan `verified` dipilih menuju `unverified`; penyebabnya sesuai kontrak lama Cloud `review_public_report` yang hanya menerima transisi maju. Operator menyetujui scope baru: jalankan `supabase/releases/dev-report-review-correction.PROPOSED.sql` pada `rekansiaga-dev`. Belum ada bukti SQL diterapkan pada checkpoint ini; jangan klaim koreksi LIVE sampai operator mendapat `Success`.

## Status operator 21:11 WIB — blocker client enum ditemukan

SQL koreksi sudah Success, tetapi browser tetap menampilkan error schema/API. Source menunjukkan blocker kedua: `transitions()` sudah menawarkan `unverified`, sedangkan `reviewReport()` masih memvalidasi enum client tanpa `unverified`, sehingga RPC tidak pernah dipanggil. Enum client dan targeted test telah diperbaiki. Validasi ulang review 12/12 PASS dan lint PASS. Operator harus restart Vite/refresh penuh agar bundle terbaru aktif; setelah itu uji koreksi lagi. Tidak ada Cloud mutation tambahan.

## Checkpoint peta publik — 2 November 2026

UI Leaflet lokal telah diimplementasikan: marker kategori, legenda ikon, pencarian, lokasi perangkat atas tindakan pengguna, modal ringkasan, dan refresh 30 detik. Paket Cloud baru `supabase/releases/dev-public-report-map.PROPOSED.sql` menambahkan RPC read-only `list_public_verified_report_map()` dengan `SECURITY DEFINER`; `public_reports` tetap tertutup RLS, hasil dibatasi laporan `verified` berkoordinat, judul disanitasi, dan tidak ada token/UUID privat/reviewer/lampiran. Persetujuan operator untuk scope RPC ini tersedia, tetapi **belum ada mutasi Cloud**. Frontend memakai `VITE_PUBLIC_VERIFIED_REPORT_MAP_ENABLED=false` secara default; aktifkan hanya setelah RPC diterapkan dan postflight lulus. Foto tetap privat.

Tes terakhir perubahan peta: `npm run build` PASS dan `npm run lint` PASS dari `rekansiaga-web`; warning bundle >500 kB tetap existing. Belum ada PASS LIVE untuk marker laporan verified, modal foto, atau sinkronisasi Admin karena RPC belum diterapkan.

## Checkpoint perbaikan peta dan foto — 2 November 2026

Penyebab laporan gunung api tidak muncul teridentifikasi: kontrak Gateway menerima latitude/longitude, tetapi `ReportForm` sebelumnya hanya mengirim teks lokasi; RPC peta memang menyaring laporan verified tanpa koordinat. Form sekarang mengirim koordinat perangkat atau teks `latitude, longitude` yang valid. Semua kategori canonical dipetakan, termasuk variasi `erupsi`, dengan fallback `Lainnya`.

Modal kini mengunci scroll halaman, hanya dapat ditutup melalui tombol X atau kontrol eksplisit yang memanggil handler, dan tidak menutup melalui Escape/backdrop. Paket proposal diperluas dengan `photo_key` serta RPC service-role-only untuk mengambil signed URL foto verified melalui Gateway dengan rate limit + Turnstile `map-photo`; bucket `report-evidence` tetap privat. Perubahan Cloud/Gateway foto **belum diterapkan**.

Validasi terakhir: build, lint, dan Edge typecheck PASS. Laporan lama verified tanpa koordinat tetap tidak dapat diberi titik rekaan; harus direview dengan koordinat sah atau tidak dipetakan.

## Checkpoint RK2 deployed — 2 November 2026

Operator output membuktikan paket privacy/compatibility telah applied/deployed dan RK2 telah applied/deployed pada `rekansiaga-dev` `uiuiouosblyuqgnvfpeh`. RPT predicate memberi notice `already present; no replay`; Gateway `report-gateway` berhasil deployed. Tidak ada row/secret/RLS diubah oleh RK2; RLS/privacy diterapkan oleh paket prerequisite sebelumnya. Ditemukan helper lama hanya mengaktifkan flag Gateway sehingga receipt masih menampilkan fallback kode+token. Helper `report-frontend-env.mjs` diperbaiki agar `--enable` mengaktifkan `VITE_REPORT_GATEWAY_ENABLED` dan `VITE_REPORT_SINGLE_CODE_ENABLED`; flag lokal kini true, sitekey tersedia, tanpa Cloud mutation. Lint dan 6 tes kontrak single-code PASS. Receipt yang sudah ter-render tidak berubah retroaktif; submit baru setelah restart Vite harus menampilkan satu RK2. Status **CLOUD DEPLOYED; LIVE NOT RUN**.

## Checkpoint RLS prerequisite execution — 2 November 2026

Scope yang diperlukan untuk membuka blocker telah disetujui: `public_reports` RLS + dua restrictive SELECT policy, kompatibilitas predicate RPT v1, dan deploy Gateway existing; tanpa data/grant/staging/Flutter/secret. Percobaan paket `apply-dev-report-compat.ps1` pertama berhenti sebelum network karena manifest lama tidak cocok dengan artefak RK2. Manifest kemudian direkonsiliasi ke hash Gateway/contract/handler/schema/form RK2 yang sudah lulus tes. Percobaan kedua lolos hash tetapi sesi alat tidak dapat mengisi prompt password native setelah CLI menampilkan `Cannot find project ref`; proses dihentikan. Tidak ada SQL commit, RLS change, predicate change, atau Gateway deploy yang terkonfirmasi. Tindakan operator tunggal: jalankan skrip interaktif sekali; jika SQL gagal/hasil tidak pasti, berhenti dan rekonsiliasi read-only.

## Checkpoint RK2 guard reconciliation — 2 November 2026

Pemeriksaan operator menunjukkan `public_reports` RLS **DISABLED** dan `track_report_v1(text,text)` **FOUND**. Penyebab guard berhenti adalah RLS benar-benar nonaktif, bukan password atau tracking v1 yang hilang. Pemeriksaan source juga menemukan kontrak Gateway aktual memakai `submit_report_v1(text,text,text,text,double precision,double precision,text,text,bigint)`, yang membungkus `submit_public_report(text,text,text,uuid,text,double precision,double precision)`; guard lama hanya memeriksa signature submit dasar sebagai entrypoint. Guard SQL diperbaiki untuk memverifikasi RLS, `track_report_v1`, wrapper Gateway 9 argumen, dan submit dasar CSPRNG secara terpisah. Manifest hash diperbarui. Tes terdampak PASS: 6 kontrak Gateway + 8 SQL/WASM. Tidak ada mutasi Cloud atau retry deployment. Status **BLOCKED** sampai RLS dipulihkan melalui approval Cloud terpisah; jangan melewati guard.

## Checkpoint deployment attempt RK2 — 2 November 2026 (hasil aktual)

Persetujuan eksplisit operator untuk RK2 telah diterima dengan scope rekansiaga-dev `uiuiouosblyuqgnvfpeh`: dua RPC service-only, deploy additive Gateway, kompatibilitas v1, serta mempertahankan CAPTCHA, rate limiting, RLS/RBAC dan privasi; tanpa staging/Flutter/data existing. Password berhasil diterima, tetapi SQL berhenti pada guard keamanan baris 12-14 dengan `STOP: existing private report RLS and tracking required`. Karena guard berada di dalam transaksi dan fungsi belum dibuat, tidak ada bukti SQL commit, RPC deployed, atau Gateway deployed. Tidak ada retry otomatis. Ini memerlukan pemeriksaan read-only terhadap `public_reports` RLS dan signature `track_report_v1(text,text)`; jangan melemahkan RLS atau mengubah SQL untuk melewati guard.

## Checkpoint deployment RK2 — 2 November 2026

Paket deployment RK2 sudah diperiksa dan **READY FOR EXPLICIT OPERATOR APPROVAL**, tetapi belum disetujui dan belum dimutasi ke Cloud. Preflight hash lokal menjalankan `deploy-dev-single-tracking.ps1` tanpa switch dan PASS; hasilnya tidak melakukan network call atau perubahan Cloud. Scope yang akan dilakukan hanya dua RPC service-only (`track_report_v2`, `replace_report_tracking_v2`), deploy additive `report-gateway`, lalu aktivasi flag frontend lokal setelah kedua langkah backend terkonfirmasi. RLS/policy/tabel/data/grant/secret, CAPTCHA, rate limiting, Storage, dan kontrak tracking v1 tidak diubah. Risiko utama yang tersisa adalah kegagalan/hasil tidak pasti saat SQL atau deploy Gateway serta kompatibilitas runtime Flutter v1/RPT yang belum diuji LIVE; rollback adalah flag false + v1 tetap aktif, tanpa retry SQL buta.

## Mulai di sini

### Instruksi terbaru pengguna: peta laporan terverifikasi + konfirmasi Flutter

**Konfirmasi operator 2 November 2026:** Flutter setelah RLS berhasil mengirim laporan, laporan masuk Dashboard Admin, dan status berhasil diubah/diverifikasi. Catat sebagai **PASS menurut operator** untuk alur tersebut, bukan pengujian perangkat oleh agent dan bukan bukti tracking RK2 mobile. Item Flutter pasca-RLS di bagian historis di bawah digantikan konfirmasi ini.

**Kebutuhan tambahan WAJIB, belum diimplementasikan:** setelah masyarakat submit laporan dan Admin memverifikasinya, peta Web Publik otomatis menampilkan label/marker di wilayah yang benar-benar dipilih pelapor, misalnya Kota Padang, dengan jenis yang sesuai (banjir, gempa, gunung api, dan jenis existing lainnya). Submit unverified saja tidak mempublikasikan marker. Pengguna meminta implementasi **Leaflet**, UI menarik dan selaras desain Figma. Referensi lokal `docs/figma-references/Desktop · Peta.png` dan screenshot terakhir pengguna; gunakan layout peta utama, panel samping, legenda/ikon jenis bencana dan kontrol lapisan yang memang mempunyai data nyata. Jangan mengarang titik bencana, posko, relawan, skor risiko, atau status siaga demi menyerupai ilustrasi.

**Temuan source saat pencatatan, bukan audit Cloud:** `src/features/maps/PublicMap.tsx` masih daftar + iframe OpenStreetMap; belum Leaflet. `src/features/maps/mapService.ts` membaca event_locations dengan parent disaster_events yang published dan source_confirmed/staff_verified, serta relief_locations verified. Belum ada alur laporan verified→publikasi peta yang dibuktikan. Keberhasilan peta kejadian E sebelumnya tidak berarti kebutuhan peta laporan baru ini sudah PASS.

Instruksi implementasi untuk agent berikut:

1. Baca BRD/kontrak existing dan aturan publikasi; petakan acceptance terhadap dokumen sebenarnya bila tersedia. Kebutuhan terbaru pengguna ini merupakan tambahan eksplisit. Jangan mengklaim BRD sudah divalidasi hanya dari screenshot atau handoff; catat bila dokumen BRD belum ditemukan.
2. Gunakan modul laporan, RPC review dan model kejadian existing; jangan membuat modul laporan kedua. Siapkan alur atomik/idempotent yang menghasilkan data peta publik tersanitasi setelah status verified, melalui proyeksi/RPC/kejadian publik existing yang sesuai kontrak. Jangan sekadar memberikan anon SELECT public_reports. Bila menggunakan disaster_events/event_locations, jangan melangkahi aturan published/verification atau memperluas hak report_verifier untuk CRUD kejadian umum; rancangan persetujuan/publikasi otomatis harus eksplisit dan terbatas.
3. Pertahankan hubungan lokasi terstruktur ke official region code/ID dari pilihan form melalui Gateway/backend bila diperlukan. Periksa submit existing: region_name saat ini disisipkan adapter Gateway ke location_description dan submit_report_v1 tidak menerima region_id; jangan mengasumsikan ID wilayah sudah tersimpan. Siapkan penambahan kontrak yang backward-compatible jika diperlukan, tanpa menebak kecocokan nama ambigu atau merusak Flutter lama.
4. Marker harus berdasarkan lokasi terverifikasi dan sumber koordinat/batas wilayah yang sah. Jika hanya Kota Padang diketahui, boleh gunakan geometri/centroid wilayah dari sumber terverifikasi dengan label jelas **perkiraan wilayah, bukan titik kejadian**. Jangan menggunakan koordinat acak, default Jakarta/0,0, atau menyebut centroid sebagai lokasi persis. Jika data geospasial belum ada/ambigu, jangan membuat marker rekaan; tampilkan status lokasi belum dapat dipetakan. Koordinat presisi/alamat pribadi tidak otomatis layak dipublikasikan meskipun laporan verified; proyeksi publik harus mempertimbangkan privasi/agregasi wilayah.
5. Jenis/ikon sesuai report_type canonical, normalisasi hanya dengan mapping eksplisit: banjir, gempa bumi, gunung api, kebakaran, tanah longsor, lainnya. Tooltip/pop-up cukup jenis, nama wilayah, status publik yang sah dan waktu; tanpa identitas, token RK2/legacy, reference pelacakan rahasia, UUID laporan privat, deskripsi/alamat sensitif, lampiran, reviewer atau catatan Admin. Sanitasi teks popup, jangan inject HTML dari input pengguna.
6. Gunakan Leaflet dalam komponen peta existing dengan basemap/attribution sesuai penyedia, responsive desktop/mobile, legenda, filter jenis, fokus keyboard/alternatif daftar, loading/error/empty state. Tombol lokasi pengguna hanya atas izin/tindakan pengguna. Kontrol posko/relawan hanya aktif bila layer nyata tersedia; label disabled bila belum tersedia. Jangan menganggap ilustrasi relawan sebagai dataset yang sudah tersedia.
7. Verifikasi Admin harus tercermin di peta melalui background refetch/invalidation/polling/subscription pada dataset publik yang aman, tanpa window.location.reload, remount/reset draft atau membuka private reports di Realtime. Deduplikasi render/proyeksi, arsip/penarikan publikasi dan batas jumlah/paginasi harus ditangani; unverified/rejected tidak masuk layer laporan terverifikasi.
8. Uji lokal status→proyeksi→marker, lokasi Kota Padang vs wilayah lain, type/icon mapping, privasi, tanpa koordinat, duplikasi/review ulang, error/loading dan tidak full reload. Lalu paket persetujuan Cloud terperinci jika butuh perubahan RPC/schema/policy/deployment, serta acceptance LIVE sintetis dalam batas yang disetujui. Persetujuan RLS sebelumnya dan paket RK2 yang masih pending bukan izin baru untuk publikasi otomatis laporan/peta. Jangan mutasi Cloud atau data pengguna nyata untuk fitur peta tanpa scope approval.
9. Pertahankan kompatibilitas Flutter; dokumentasikan field region/code dan endpoint publik baru bila ada, tim mobile yang mengubah aplikasi. Pekerjaan source lokal yang aman dapat disiapkan satu siklus; jangan mengulang A–D/CRUD E yang sudah PASS.

**Roadmap diperbarui:** lanjut paket RK2 yang siap menunggu approval eksplisit dan implementasi lokal peta Leaflet/laporan verified sebagai satu daftar pekerjaan terbuka; gabungkan kebutuhan Cloud baru yang benar-benar diperlukan dalam paket operator reviewable. Setelah acceptance RK2+peta, tutup sisa E/draft dan lanjut UAT. Peta ini belum memiliki bukti implementasi/tes; status **TODO**, bukan PASS.

Workspace Windows: `D:\Rekan Siaga\rekansiaga-web`. Baca `AGENTS.md` lalu file ini. Target dev tunggal `uiuiouosblyuqgnvfpeh`. Jangan mengubah staging atau proyek Flutter. Jangan cetak `.env.local`, password, token pelacakan, service-role, atau payload pribadi. Jangan mengulang A–D, impor wilayah, CRUD TEST yang sudah PASS, atau menjalankan ulang skrip deployment lama.

Tugas terakhir: simplifikasi tracking menjadi satu kode rahasia. Semua perubahan lokal selesai dan dites. **Paket v2 belum disetujui, belum diterapkan Cloud.** Pesan pengguna meminta checklist/handoff bukan persetujuan deployment. Tindakan berikut adalah memperoleh satu persetujuan paket v2 yang konkret, lalu lanjut implementasi operator/acceptance dalam cakupannya. Jangan menganggap persetujuan perbaikan RLS sebelumnya berlaku untuk v2.

## Selesai dan bukti

- [x] A–D diterima PASS berdasarkan pekerjaan/operator sebelumnya. C: 38 provinsi,514 kabupaten/kota,7285 kecamatan,83762 desa/kelurahan,total91599,hierarchy_errors0. Tidak impor/audit ulang.
- [x] E LIVE artikel: draft→publish→update→archive; Web Publik teramati.
- [x] E LIVE kejadian: CRUD/publication, event updates/locations, peta teramati.
- [x] E LIVE kontak: create/edit/activate/public/deactivate.
- [x] E LIVE panduan/checklist dan lokasi bantuan: admin/public teramati.
- [x] E LIVE cleanup logis9 baris konten/dependensi milik run TEST;22 mutasi/22 audit. Tidak ada physical DELETE. Batas9 row sudah terpakai, jangan buat ulang.
- [x] Laporan existing dari Flutter dipilih operator, status verified/history/audit dibaca. Asal perangkat dan keberhasilan submit/review dikonfirmasi operator; bukan pembuktian perangkat oleh agent.
- [x] RLS laporan ditemukan false lewat screenshot operator; paket terpisah disetujui dan diterapkan operator. Dua restrictive SELECT policies + ENABLE RLS + predicate RS/RPT + deploy Gateway berhasil menurut output terminal operator.
- [x] Probe independen LIVE pasca-RLS: anonymous HEAD private columns laporan pilihan HTTP200/count0, body tidak diambil. Sebelumnya count1; kelemahan pada probe ini tertutup. Tidak menyatakan seluruh policy backend telah diaudit ulang.
- [x] Perbaikan terpusat anti-reload/auth/draft existing dipertahankan; watcher Vite mengabaikan artefak QA. Kontak tab-switch dan SPA routing PASS LIVE. Retry CAPTCHA tidak reload/mereset input.
- [x] Tracking v2 lokal: RK2 Base32 hanya membawa token secret; sekitar244 bit entropy dari dua UUIDv4 penuh existing CSPRNG. Bukan reference/UUID internal, bukan entropy dari encoding. Hash SHA256,expiry/revocation tetap existing.
- [x] Receipt satu kode, salin dan unduh bukti minimal; form satu kolom + opsi v1. Kredensial tidak masuk draft/Web Storage/URL/analytics/log/Admin.
- [x] RPC usulan track_report_v2(text) dan replace_report_tracking_v2(text,text), service-only. Replacement mengunci token aktif, revoke exact token dan insert hash baru atomik, expiry dipertahankan. Tidak ada rotasi Cloud dijalankan.
- [x] V2 tes lokal:21 kontrak/regresi +8 PostgreSQL/WASM +5 Chrome UI =34 PASS. SQL runtime menjalankan source submit/review existing; geografi/claims fixture. Browser receipt sintetis, clipboard adapter, HTTPS diblokir. **Bukan LIVE PASS**. Lint/build/Edge typecheck PASS; warning bundle >500kB existing.

## Belum selesai

- [x] Persetujuan dan penerapan v2 Cloud: dua RPC service-only dan deploy Gateway berhasil menurut output operator; tidak ada row/secret/RLS change oleh RK2.
- [x] Flag frontend lokal `VITE_REPORT_SINGLE_CODE_ENABLED=true` diaktifkan setelah backend deploy; restart Vite masih diperlukan. Server activation probe belum PASS.
- [x] Perbaikan helper aktivasi: `--enable` kini menulis kedua flag frontend; lint dan 6 tes kontrak single-code PASS.
- [ ] LIVE satu-code submit→receipt→track200→Admin review RPC→track status terbaru. CAPTCHA manusia di Chrome biasa, jangan bypass.
- [ ] LIVE satu-code submit→receipt→track200→Admin review RPC→track status terbaru. CAPTCHA manusia di Chrome biasa, jangan bypass.
- [ ] LIVE tracking v1 RS/RPT existing dengan token pribadi; jangan meminta token di chat. Cloud predicate sudah diterapkan, acceptance v1 belum teramati agent.
- [ ] Konfirmasi independen akses Admin setelah RLS bila tersedia sesi. Pengguna pada instruksi fitur terakhir melaporkan Admin masih dapat membaca/review; jangan menyebut itu pemeriksaan agent.
- [ ] Flutter setelah RLS: tim mobile memastikan jalur Gateway/RPC; direct private-table INSERT/SELECT dapat ditolak dan tidak boleh dibuka kembali sebagai solusi. Runtime mobile/v2 belum diuji; jangan ubah Flutter.
- [ ] Semua pola anti-reload/form dan pemulihan draft setelah browser discard belum terbukti penuh LIVE. Sebagian tes gagal mengembalikan foreground di automation, tanpa input loss; bukan full PASS.
- [ ] Tutup flag tulis konten lokal khusus pengujian setelah draft aman. Jangan ubah flag review rutin/global guard secara luas.
- [ ] E keseluruhan belum PASS final.

## Persetujuan dan inventaris Cloud

Persetujuan E lama: maksimal2 laporan TEST +9 konten/dependensi, logical cleanup; tanpa physicaldelete/securitychanges. Run konten `TEST-E-20261101-a881d0` sudah selesai9 row/22 mutation. Tidak ada submit baru agent pada run itu; receipts in-memory0. Jangan mengulang2 laporan: operator mengarahkan pakai laporan existing.

Laporan existing pilihan UUID `0f990f12-71d1-4a31-bad0-903eaf8dbb7d` bukan inventaris TEST; **read-only**, jangan review/cleanup/rotate. Operator punya token pribadi, nilai tidak diterima agent.

Paket privasi/kompatibilitas E lama sudah disetujui dan applied, termasuk persetujuan eksplisit ENABLE RLS. Bukan approval paket v2. Jangan menjalankan ulang `apply-dev-report-compat.ps1` atau skrip D disabled: hash source sudah berubah, D lama dapat menonaktifkan gateway.

## Jalur deployment v2 yang sudah disiapkan

Runbook lengkap: `docs/runbooks/single-tracking-v2.md`. Manifest: `docs/qa/stage-e/single-tracking-manifest.json`. Status aktual **CLOUD DEPLOYED; LIVE ACCEPTANCE PENDING** menurut output operator. Hash inputs diperiksa script; tanpa switch script hanya local preflight.

Setelah mendapat persetujuan eksplisit paket baru, operator menjalankan:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-single-tracking.ps1" -ApprovedSingleTrackingV2
```

Script memastikan CLI project name/ref, psql18 Session Pooler5432 SSL, password prompt native, ON_ERROR_STOP. Host pernah dipakai operator `aws-0-ap-south-1.pooler.supabase.com`; tetap cocokkan Dashboard dev. Jangan minta password/chat/PTYagent. SQL menambah2 fungsi saja, tidak mengubah tabel/RLS/data lama. Guard memeriksa generator CSPRNG existing, RLS aktif, v1 RPT/service-only. SQL menolak function v2 yang sudah ada: jika hasil tidak pasti, rekonsiliasi read-only, jangan retry buta. Deploy via CLI resmi pinned2.120.0 use-api/no-verify-jwt existing public Gateway; CAPTCHA/quota tetap handler. Jika SQL commit tetapi deploy gagal, jangan mengulang SQL; lanjut deploy setelah status dikonfirmasi.

Setelah deploy berhasil: operator aktifkan flag lokal di `.env.local` tanpa menampilkan isi file, restart Vite setelah draft aman, kemudian acceptance sesuai runbook. Tidak ada secret baru untuk v2. Jika frontend dihosting, lakukan rebuild/redeploy frontend dengan flag itu; deployment hosting bukan bagian yang sudah dikerjakan/disetujui.

## Kontrak v1/v2

Receipt submit tetap tracking_code/access_token/expires_in_days untuk Flutter; additive tracking_credential. Web fitur aktif hanya menampilkan RK2. Tracking v2 POST `{action:'track',tracking_credential,captcha_token}`; v1 tetap kode+token+CAPTCHA. Respons hanya status/timestamps/history. Valid-format wrong/expired/revoked404 sama; malformed400 tidak menunjukkan keberadaan row. Semua token mentah hanya di memori/receipt privat yang dipilih pengguna; DB menyimpan hash. Base32 dapat didekode ke secret, bukan enkripsi. Jangan memasukkan kode pada URL/nama file/log.

Flutter parser strict terhadap field tambahan mungkin perlu disesuaikan tim mobile; source Flutter tidak diperiksa/diubah. Dukungan v1 dipertahankan secara kontrak, bukan klaim runtime perangkat. Kredensial hilang tanpa bukti kepemilikan tidak boleh dipulihkan melalui reference saja.

## File sumber terakhir

Frontend: `src/features/reports/{ReportForm.tsx,ReportReceiptView.tsx,TrackingForm.tsx,reportApi.ts,reportSchema.ts}`.
Gateway: `supabase/functions/_shared/{trackingCredential.ts,reportContract.ts,reportHandler.ts}`, `supabase/functions/report-gateway/index.ts`.
SQL/script: `supabase/releases/dev-single-tracking.PROPOSED.sql`, `scripts/deploy-dev-single-tracking.ps1`, `.env.example` default flag false.
Guard deployment terakhir diperbaiki untuk kontrak `submit_report_v1` Gateway; manifest `docs/qa/stage-e/single-tracking-manifest.json` sudah memuat hash SQL baru.
Kontrak/runbook: `docs/mvp-shared-contract.md`, `docs/stage-e-backend-contract.md`, `docs/runbooks/single-tracking-v2.md`.

## Bukti dan cara melanjutkan tanpa tes berulang

- Status terstruktur `docs/qa/stage-e/status.json`; beberapa field waktu/lastObservedBrowser adalah historis, bukan sesi aktif.
- E journal `docs/qa/stage-e/live/TEST-E-20261101-a881d0.json`, audit `…-audit.json`, cleanup `…-anonymous.json`, browser `…-browser.json`.
- Privasi pasca-patch: `docs/qa/stage-e/live/report-privacy-after-deploy.json` (authoritative setelah perbaikan); artefak operator-report-privacy lama count1 adalah reproduksi sebelum patch, jangan hapus/anggap masih terbaru.
- V2 SQL runtime `docs/qa/stage-e/single-tracking-local.json`; UI `single-tracking-browser.json`.
- Tes: `node --test scripts/test-single-tracking.mjs scripts/test-report-gateway.mjs scripts/test-tracking-code-compat.mjs`; `node scripts/test-single-tracking-sql.mjs`; `node scripts/test-single-tracking-browser.mjs`; lint/build/typecheck:edge. Semuanya sudah PASS; ulang hanya setelah perubahan/failure relevan.
- Probe anonim script `node scripts/verify-e-report-privacy.mjs` read-only HEAD, tidak mengambil isi pribadi. Jangan ulang tanpa alasan setelah tiada perubahan keamanan.
- Browser QA dedicated sebelumnya sudah unavailable. Jangan menganggap Super Admin masih login. Jika perlu sesi baru, gunakan akun Web Admin existing dengan operator login sendiri; jangan baca profil browser biasa/kredensial.
- CAPTCHA QA gagal600010, sementara Chrome biasa operator sukses. Jangan mengganti key/test secret, memalsukan challenge, atau memaksa submitulang. Gunakan operator normal Chrome untuk challenge; jangan kumpulkan token/kode/HAR/rawpayload.
- Repo pernah gagal git status (bukan repo Git pada sesi tersebut). Jangan mengklaim commit/diff/PR; periksa keadaan nyata dulu.

## Roadmap setelah pekerjaan ini

1. **Selesaikan tracking v2:** approval→SQL/Gateway→flagfrontend→acceptance terbatasi→catat hasil/cleanup. Perbaiki bug konkret bila ada.
2. **Tutup E:** gabungkan bukti lama yang masih berlaku dan acceptance tersisa, konfirmasi Flutter pasca-RLS serta draft/reload. Jangan buat8 fase baru atau mengulang konten PASS. Hasil perfitur PASS/FAIL/BLOCKED jujur.
3. **UAT lintas tim:** Web Publik, role staf berizin/ditolak, mobile, penanganan kode hilang/terekspos, aksesibilitas dan perangkat. Ini rencana berikut, belum dilaksanakan.
4. **Kesiapan rilis:** origin/domain dan Turnstile production, kuota global dev dievaluasi terhadap kapasitas nyata, secrets perenvironment, backup/restore, monitoring redacted, runbook insiden/rotasi. Jangan mengklaim siap produksi dari dev PASS atau menebak trusted IP header. Setiap perubahan Cloud baru butuh scope approval.
5. **Rilis dan operasi:** deployment hosting yang dipilih operator, smoke test terkontrol dan pemantauan. Infrastruktur/domain/biaya/production backend belum ditentukan di pekerjaan ini. Jangan membuat label tahap F/G resmi tanpa BRD/runbook yang menetapkannya.

## NEXT AGENT — RESUME FROM HERE

### Resume checkpoint integrasi konten ? 3 November 2026

- Tujuan aktif: selesaikan feed pemantauan, Leaflet, pengaitan verified report?event, CMS artikel, upload gambar, CORS publikasi foto, dan bukti kompatibilitas mobile dalam satu paket.
- Status lokal: contract/sanitizer 7/7 PASS; PostgreSQL/WASM 18/18 PASS; lint, build, Edge typecheck PASS. Build mempunyai warning bundle >500 kB existing.
- Browser retest terbaru: BLOCKED sebelum assertion aplikasi oleh Chrome CDP timeout (UI `Page.enable`; CORS command timeout). Artefak terbaru menunjukkan nol assertion. Riwayat sebelumnya merekam 9 alur UI dan 3 CORS PASS, tetapi belum dapat direproduksi sekarang. Jangan klaim ulang PASS.
- Cloud: tidak ada deployment sukses yang dibuktikan untuk paket ini. Catatan historis mencatat percobaan SQL berhenti pada guard RLS/role; jangan retry atau bypass sebelum read-only preflight cocok.
- Persetujuan Cloud: **belum terkonfirmasi untuk paket ini**. Kalimat lanjutkan pekerjaan mengizinkan persiapan lokal; minta persetujuan eksplisit sebelum SQL/function deploy. Target hanya `rekansiaga-dev` ref `uiuiouosblyuqgnvfpeh`.
- Paket satu kali yang telah disiapkan: preflight read-only, SQL guarded + postflight read-only, deploy `report-publication` CORS hotfix dan `article-media`. Script meminta password native untuk preflight dan sekali lagi untuk transaksi; hash file diverifikasi sebelum ada koneksi. Lihat `docs/runbooks/integrated-content-v1.md` dan `docs/qa/stage-e/integrated-content-manifest.json`.
- Sesudah persetujuan/deployment: aktifkan flag lokal `VITE_INTEGRATED_CONTENT_ENABLED=true` dan restart; acceptance sintetis yang dibatasi ada di runbook. Cleanup logis saja, tidak ada hapus fisik.
- Kontrak Flutter terdokumentasi; proyek Flutter belum diubah dan tim mobile perlu adapter feed/paging serta URL sampul bertanda tangan.
- Tidak mengulang A?D, Gateway/RK2, staging, atau Flutter.

### Perbaikan parser koordinat — 2 November 2026

Screenshot Admin membuktikan laporan verified memiliki koordinat pada teks lokasi tetapi kolom `coordinates` NULL. Penyebabnya `parsePoint()` tidak menerima format `latitude, longitude`; patch lokal sudah menambah dukungan format ini. Laporan lama tidak diubah otomatis. Setelah validasi, restart Vite, kirim laporan baru memakai GPS atau `latitude, longitude`, lalu verifikasi dan cek peta.

### Pipeline foto publik lokal — 2 November 2026

Admin sebelumnya tidak memiliki tombol karena flag approval masih false dan Edge Function belum ada. `supabase/functions/report-publication/index.ts` sekarang memvalidasi JWT/RBAC, membaca foto privat via service role, menghapus chunk metadata JPEG/PNG/WebP, mengunggah salinan bucket terpisah, lalu memanggil RPC approval/revoke. Build lokal belum menjadi bukti Cloud; function, SQL approval, dan flag frontend masih harus diterapkan terkontrol.

Runtime follow-up: deployment awal menghasilkan error generik dari UI. Function diperbaiki agar memakai `apikey` request sebagai fallback public key dan memetakan error sanitasi 400/404 secara eksplisit. Typecheck Edge dan lint PASS; Function perlu dideploy ulang, SQL tidak perlu diulang.

### Checkpoint foto publik dan peta — 2 November 2026

- Status: **PASS LOCAL / BLOCKED LIVE**. Admin UI lokal memiliki aksi persetujuan/cabut publikasi foto; peta menampilkan foto hanya dari `public-report-evidence` setelah approval.
- File: proposal SQL foto/map, `PublicMap.tsx`, `mapService.ts`, `adminReportService.ts`, dan `AdminReportDetailPage.tsx`.
- Tes: build, lint, Edge typecheck PASS; warning bundle >500 kB existing.
- Cloud: paket foto belum diterapkan. RPC map dasar tetap kompatibel; SQL foto meng-upgrade RPC setelah tabel approval tersedia.
- Keamanan: sanitizer/copy Edge Function `report-publication` belum dibuat/deploy. Jangan aktifkan flag approval atau klaim foto LIVE PASS sebelum EXIF/GPS dibuang dan salinan server-side diuji anonim.
- Tindakan langsung: implementasikan dan uji Edge Function sanitizer, lalu jalankan SQL foto + deploy function secara terkontrol; uji approve/revoke dan marker map.

### Daftar masalah aktual dan bukti — 2 November 2026 22:28 WIB

1. **Koordinat laporan lama tidak tersimpan sebagai geospasial.** Bukti Admin menunjukkan angka koordinat hanya pada teks lokasi, sedangkan kolom `coordinates` NULL. Status `verified` saja tidak cukup untuk membuat marker. Parser lokal sudah diperbaiki untuk format `latitude, longitude`; laporan lama tidak di-backfill.
2. **Foto tidak langsung tampil di peta.** Ini sesuai desain privasi: foto asli berada di bucket privat dan baru boleh tampil setelah salinan aman dibuat serta disetujui Admin.
3. **Approval foto gagal saat runtime.** Tombol sudah tampil, tetapi UI menerima pesan generik “Status operasi belum dapat dipastikan”. Detail error awal hilang karena `functions.invoke` tidak membaca body respons Function; parser error frontend sudah diperbaiki untuk menampilkan kode seperti `FORBIDDEN`, `APPROVAL_FAILED`, `SOURCE_UNAVAILABLE`, `PUBLIC_COPY_FAILED`, atau `INVALID_PHOTO`.
4. **Edge Function `report-publication` telah dideploy menurut output operator.** CLI memberi warning deprecated `--project-ref` dan Docker tidak berjalan; keduanya bukan bukti kegagalan deployment. Function perlu diuji ulang setelah build frontend terbaru.
5. **Status SQL approval belum dapat dinyatakan LIVE PASS dari bukti agent.** SQL tidak boleh diulang membabi buta. Jika approval masih gagal setelah frontend terbaru, lakukan pemeriksaan read-only terhadap keberadaan tabel/fungsi/bucket dan respons Network, bukan mutasi ulang.
6. **Sanitasi WebP/JPEG/PNG belum memiliki acceptance LIVE.** Implementasi lokal typecheck/lint PASS, tetapi belum ada bukti salinan publik berhasil dibuat, EXIF/GPS hilang, atau foto asli tetap tertutup bagi anonim.
7. **Peta marker sudah bekerja untuk laporan baru berkoordinat.** Screenshot publik menunjukkan marker dan modal koordinat; foto masih menampilkan “Foto belum disetujui untuk publik”, yang merupakan status expected sebelum approval berhasil.

**Status ringkas:** koordinat baru **PASS LOCAL**; build/lint/typecheck **PASS LOCAL**; marker laporan berkoordinat **PASS OBSERVED LOCAL**; approval foto **BLOCKED RUNTIME**; foto publik dan EXIF/GPS **LIVE NOT PROVEN**; tidak ada perubahan Flutter/staging atau akses publik ke bucket asli.

**Tindakan berikutnya tunggal:** restart Vite dengan bundle frontend terbaru, hard-refresh Admin, klik approval sekali, lalu simpan hanya kode error baru yang tampil. Jangan mengulang SQL atau mengirim laporan baru sebelum kode tersebut diketahui.

- Checkpoint: 2 November 2026; AI assistant menggunakan Copilot SDK di VS Code.
- Tugas terakhir: memperbaiki paket peta, koordinat GPS/foto, dan koreksi status Super Admin.
- Status: PARTIAL/BLOCKED — SQL review Success menurut operator dan client patch lokal PASS; LIVE koreksi status/marker/foto belum dibuktikan sampai Vite direstart.
- File berubah: SQL proposal peta/review/foto, `PublicMap.tsx`, `mapService.ts`, `ReportForm.tsx`, `PhotoUpload.tsx`, `useDeviceLocation.ts`, `Dialog.tsx`, `adminReportService.ts`, kontrak/test review, serta dokumen.
- Tes terakhir: build, lint, Edge typecheck PASS; review 12/12 PASS; Gateway/RK2 15/15 PASS. Warning bundle >500 kB existing.
- Mutasi Cloud: RPC peta sudah dilaporkan berhasil oleh operator; RPC koreksi review baru disetujui dan belum dikonfirmasi diterapkan. Foto/lampiran, Flutter, staging, policy tabel, dan data massal tidak termasuk.
- Hambatan konkret: sesi agent tidak memiliki akses admin/password Cloud untuk menjalankan SQL dan postflight.
- Prioritas berikutnya: operator menjalankan SQL koreksi review yang telah disetujui, lalu postflight koreksi status pada laporan uji yang sama.
- Tindakan langsung: hentikan/restart Vite, buka ulang Admin dengan hard refresh, lalu uji verified→unverified; pastikan Network memanggil `review_public_report` bila masih gagal.

### Checkpoint integrated-content package — 3 November 2026

- Operator explicitly approved the scoped integrated-content deployment and synthetic acceptance for `rekansiaga-dev` (`uiuiouosblyuqgnvfpeh`). This approval covers only the package and bounded TEST operations documented in `docs/runbooks/integrated-content-v1.md`; it does not cover staging, Flutter source, unrelated Cloud changes, or physical deletion.
- Local verification rerun: sanitizer/contracts 7/7, PostgreSQL/WASM 18/18, lint, production build, and Edge typecheck PASS. Build still emits the existing >500 kB chunk warning.
- Cloud deployment has **not** been run or confirmed in this agent session. The guarded script's hash-only mode passes. To apply the approved package, operator must run the command in the runbook from local PowerShell; the native `psql` password prompt cannot safely be filled from this agent session. Script checks exact project and performs read-only baseline preflight before SQL; if any guard fails, stop and report only sanitized status.
- Chrome CDP harness still times out before UI assertions. After deployment, browser acceptance must be done in normal Chrome using the bounded TEST workflow in the runbook. Do not claim LIVE PASS until observed.
- Do not repeat A–D, existing E tests, tracking submit/track, staging, Flutter, secrets, Gateway/RK2, or physical deletion.

### Deployment runner fix — 3 November 2026

Operator supplied screenshot of `PropertyNotFoundException` for `integrated_content_preflight`. Root cause: psql with `-A -t` emits the JSON value, not the SELECT column alias, while PowerShell expected the alias wrapper. The SQL was read-only, and the exception occurred before the guarded transaction and Edge deploy calls. Updated `scripts/deploy-dev-integrated-content.ps1` to parse direct JSON (and accept wrapped JSON), validate required metadata fields, and stop safely on malformed output. Direct/wrapped parser fixture checks and no-network package hash check PASS. Operator may rerun the approved command; password stays at native prompts. Cloud deployment remains unconfirmed.

### Baseline mismatch — 3 November 2026

Second operator run authenticated to the DB and executed read-only preflight; the package stopped before mutation due to a baseline predicate mismatch. The version at the time hid which predicate failed. Runner now emits only failed check identifiers. Next step is to inspect `dev-integrated-content-preflight.sql` read-only in the dev SQL Editor (or rerun the guard for diagnostic identifiers) and reconcile the exact baseline. Never bypass the RLS/package-object guards by disabling security or manually creating objects.

### Runner updated after read-only baseline result — 3 November 2026

The operator's preflight JSON showed `public_reports_rls=false`; all other returned predicates met the package baseline. This mismatch is now handled by the same guarded operator command: first the separately approved report privacy SQL enables RLS and adds two restrictive SELECT policies, then content preflight runs again; only a passing preflight allows content SQL and two Edge deployments. No tracking/Gateway compatibility, Flutter, staging, secrets, report rows, or physical deletes are in scope. Runner syntax/hash-only check and local privacy/content SQL suites pass. Cloud execution still requires the operator's native psql prompts and has not been confirmed.

### Cloud deployment and frontend activation — 3 November 2026

Operator terminal confirms the approved SQL/postflight and deployment of `report-publication` and `article-media` to the dev ref. Local `.env.local` was verified to point at the same dev ref; only `VITE_INTEGRATED_CONTENT_ENABLED=true` was added. Vite is running at localhost:5173 and `/pemantauan` returns HTTP 200. Local lint/build/Edge typecheck and content test suites pass. Agent-side Supabase REST smoke requests are blocked at the network layer, so they prove no live API behavior. Remaining E acceptance is in normal Chrome with bounded synthetic TEST data, including Admin→public map/list/article, role/audit, logical cleanup, and tab/draft retention. Do not claim LIVE acceptance until the browser checks are observed.

### NEXT AGENT � RESUME FROM HERE: foto kejadian (3 November 2026)

- Implementasi lokal: Admin kejadian memiliki preview/replace/revoke foto utama; resolver disambungkan ke pemantauan/detail/peta. Kontrak Web/Flutter didokumentasikan. File inti: `src/features/content/eventMedia.ts`, `EventImagePicker.tsx`, `supabase/releases/dev-event-media.PROPOSED.sql`, `supabase/functions/event-media/index.ts`.
- QA: `docs/qa/stage-e/event-image-status.json`. Hasil lokal 3 Nov: lint PASS, build PASS dengan warning bundle existing >500 kB, Edge typecheck PASS. SQL hanya static review; Cloud/live NOT_RUN.
- Cloud belum diubah untuk foto kejadian. Review migration, lalu minta satu approval operator yang mencakup SQL dan deploy Edge ke rekansiaga-dev saja. Jangan sentuh staging, Flutter, Gateway/RK2.
- Setelah postflight: set `VITE_EVENT_MEDIA_ENABLED=true`, restart Vite, uji satu event TEST: upload?gambar tampil di pemantauan/detail/peta?replace?revoke. Tidak ada penghapusan fisik; lakukan pemeriksaan kelayakan gambar manual. Tanpa gambar, event tetap bisa disimpan.

### Roadmap delta � foto kejadian (3 November 2026)

Review local SQL/Edge package ? obtain one explicit approval for SQL migration plus `event-media` deployment to rekansiaga-dev only ? run postflight ? enable VITE_EVENT_MEDIA_ENABLED ? perform a single synthetic event upload/public display/replace/revoke acceptance. Until then the flag stays off and Cloud/live status is NOT_RUN.

Edge deploy command after approval and successful SQL postflight:
```powershell
npx.cmd --yes supabase@2.120.0 functions deploy event-media --project-ref uiuiouosblyuqgnvfpeh --use-api --no-verify-jwt
```
SQL file has release guards requiring the reviewed dev scope/approval acknowledgement; execute only through a guarded operator workflow. Do not run SQL directly without those guards.

### Status foto kejadian — 3 November 2026 (persetujuan diterima)

- Operator menyetujui paket migrasi + Edge Function khusus `rekansiaga-dev` (`uiuiouosblyuqgnvfpeh`). Tidak ada persetujuan untuk staging/Flutter atau area lain.
- Verifikasi lokal terdampak: ESLint file terkait PASS; `npm run build` PASS (peringatan chunk >500 kB yang sudah ada); `npm run typecheck:edge` PASS.
- Deployment belum dijalankan/terkonfirmasi di sesi agent. CLI Supabase tidak dapat diakses dari terminal ini; SQL parser native lokal juga diblokir Windows Application Control. Tidak ada flag frontend yang diaktifkan dan tidak ada klaim Cloud/LIVE PASS.
- Paket tunggal siap dijalankan dari PowerShell operator dengan password hanya pada prompt native: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-event-media.ps1" -ApprovedEventMedia`. Runner memeriksa target, read-only baseline, SQL guard dan postflight sebelum deploy function. Bila gagal/hasil commit tidak pasti: berhenti, jangan retry.
- Sesudah postflight/function PASS, aktifkan `VITE_EVENT_MEDIA_ENABLED=true` lokal, restart Vite, lalu uji satu event sintetis TEST: upload, baca di pemantauan/detail/peta, replace, revoke. Tanpa gambar kejadian tetap dapat disimpan.
### NEXT AGENT — RESUME FROM HERE: foto kejadian setelah persetujuan operator (3 November 2026)

Approval operator sudah diterima untuk SQL+Function event-media di `rekansiaga-dev` saja. Jangan meminta approval ulang dan jangan menyatakan deployment selesai. Jalankan dari PowerShell operator: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-event-media.ps1" -ApprovedEventMedia`. Password hanya pada prompt native `psql`. Bila baseline/postflight/commit uncertain, STOP dan jangan retry/deploy function/aktifkan flag. Di sesi ini tidak ada Supabase CLI network/auth sehingga tidak ada Cloud mutation. Setelah command terkonfirmasi PASS, aktifkan `VITE_EVENT_MEDIA_ENABLED=true` lokal, restart Vite, uji satu event TEST (upload → pemantauan/detail/peta → replace → revoke), lalu perbarui `docs/qa/stage-e/event-image-status.json`, `docs/qa/stage-e/STATUS.md`, dan `docs/development-status.md` sesuai hasil yang benar-benar diamati. Lint target, build, Edge typecheck, dan sanitizer suite 7/7 PASS; parser SQL native diblokir Application Control. Staging, Flutter, report gateway/RK2 tidak disentuh.
### Runner correction — Supabase pooler authentication (3 November 2026)

Screenshot showed PostgreSQL password authentication failure during the read-only preflight; no SQL or Edge Function was applied. The event-media runner no longer assumes a pooler hostname: it now prompts for the HOST only copied from Dashboard > `rekansiaga-dev` > Connect > Session pooler, while pinning the username to `postgres.uiuiouosblyuqgnvfpeh`, database `postgres`, port 5432 and SSL. Local-only mode and PowerShell parser check PASS. If authentication still fails with the exact host and project database password, stop and verify the database password in Dashboard; do not paste it into chat/arguments/files and do not retry a failed mutation (none occurred in the shown run).
### NEXT AGENT — resume event-media deployment after pooler auth error

The user screenshot confirms only `psql` authentication failed in read-only preflight; SQL and Edge deployment were not attempted. Runner fixed: it now asks for the exact host copied from Dashboard > rekansiaga-dev > Connect > Session pooler and explicitly sets user `postgres.uiuiouosblyuqgnvfpeh`, port 5432, SSL. Local-only run and PowerShell syntax PASS. Operator must rerun the same approved command, paste HOST only at its prompt, then type the database password invisibly at native `psql` prompt. If it still rejects, stop and verify the database password in Dashboard; do not send the password to chat or attempt Cloud SQL manually. Once preflight succeeds, runner continues guarded migration/postflight then deploys `event-media`; only then enable frontend flag and run TEST event acceptance.
### Operator deployment confirmation — event media (3 November 2026)

Operator terminal confirms read-only baseline passed, guarded event-media SQL postflight PASS, and Edge Function `event-media` deployed on `rekansiaga-dev` (`uiuiouosblyuqgnvfpeh`). Set local `.env.local` `VITE_EVENT_MEDIA_ENABLED=true`; restart Vite before testing. Cloud deployment status is PASS by operator evidence; synthetic upload and public rendering on monitoring/detail/map plus replace/revoke remain NOT RUN. Do not claim feature acceptance until browser results are observed.
### NEXT AGENT — RESUME FROM HERE: post-deployment browser acceptance (3 November 2026)

Operator screenshot confirms `dev-event-media` SQL postflight PASS and `event-media` Edge Function deployment on `rekansiaga-dev`. Local `.env.local` now has `VITE_EVENT_MEDIA_ENABLED=true`; production build rerun PASS (existing >500 kB warning). Remaining step is browser-only acceptance: restart Vite, sign into existing Admin, create/use one clearly marked synthetic TEST disaster event, upload a suitable non-identifying image, publish/verify via existing authorized workflow, confirm image appears on `/pemantauan`, detail and `/peta`, then replace and revoke. Confirm event remains saveable without image. Do not report feature LIVE PASS until these observations are provided. No staging/Flutter/report gateway changes.
### Checkpoint terbaru — Informasi Utama Beranda (3 November 2026)

- [x] CMS Artikel existing mendapat aksi pilih/batalkan Informasi Utama khusus artikel published.
- [x] Constraint/index + RPC usulan menjamin satu pilihan atomik; draft/archive/unpublish tidak dapat tetap unggulan; perubahan tercatat sebagai audit metadata.
- [x] Beranda menampilkan featured/published terbaru fallback/empty state melalui reader publik; artikel tetap record yang sama pada `/informasi`.
- [x] Cache publik/admin diinvalidasi setelah aksi; refetch tidak melakukan full reload atau menghapus draf CMS.
- [x] Kontrak Flutter additive didokumentasikan, tanpa mengubah proyek Flutter.
- [x] Tes PostgreSQL/WASM terfokus 11/11, lint/build PASS. Artefak `docs/qa/stage-e/featured-article-local.json`.
- [ ] Minta satu approval eksplisit untuk migration additive pada rekansiaga-dev saja; jangan jalankan sebelum diterima.
- [ ] Setelah approval, operator menjalankan `scripts/deploy-dev-featured-article.ps1 -ApprovedFeaturedArticle`; konfirmasi read-only postflight PASS.
- [ ] Aktifkan `VITE_FEATURED_ARTICLE_ENABLED=true`, restart Vite, lalu browser acceptance pilih/ganti/batalkan/archive/fallback/empty dan role denial.
- [ ] Tim mobile mengadopsi RPC/DTO kontrak dan melakukan runtime check; tidak dikerjakan di repo Flutter ini.

Sumber kerja: `docs/runbooks/featured-article-v1.md`. Migration/proposal, preflight, postflight, rollback dan runner ada di `supabase/releases/dev-featured-article*` dan `scripts/deploy-dev-featured-article.ps1`. Tidak ada migration/SQL/RLS/Cloud mutation yang dilakukan oleh agent. Kontrak/BRD file original tidak ditemukan pada workspace saat pencarian; implementasi mengikuti brief pengguna, schema `articles`, kontrak Supabase bersama dan integrated-content runbook. Jangan menyatakan LIVE PASS sampai acceptance setelah deployment benar-benar selesai.

### NEXT AGENT — RESUME FROM HERE: Featured article Cloud approval and acceptance

Jangan mulai ulang A–D, import wilayah, integrated-content deployment atau audit lama. Review `docs/runbooks/featured-article-v1.md` dan paket SQL. Status lokal PASS, Cloud masih belum berubah. Langkah berikutnya hanya setelah persetujuan Cloud eksplisit: jalankan `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-featured-article.ps1" -ApprovedFeaturedArticle`, gunakan pooler host dari Dashboard dan password hanya pada prompt psql, pastikan postflight PASS. Baru kemudian set flag lokal, restart Vite dan jalankan checklist sintetis di runbook. Jangan gunakan data artikel masyarakat sebagai uji, jangan ubah Flutter/staging, dan jangan klaim LIVE PASS dari PGlite/build.
### Featured article - approval received, deployment pending (3 November 2026)

- Operator explicitly approved the additive featured-article migration for rekansiaga-dev only. Approval does not include staging, Flutter, rollback, or unrelated Cloud changes.
- Local implementation remains PASS: focused tests 11/11, lint/build previously PASS. No Cloud mutation or live acceptance has occurred.
- The current agent environment cannot invoke an installed Supabase CLI; `npx supabase projects list` did not complete because network access is unavailable. The deployment runner also requires authenticated operator CLI access and the database password at native psql prompts. Never request or record the password in chat.
- NEXT AGENT - RESUME FROM HERE: run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-featured-article.ps1" -ApprovedFeaturedArticle` in the operator's interactive PowerShell. Use the Dashboard Session Pooler host and enter the DB password only at native psql prompts. If preflight or postflight fails or commit outcome is uncertain, STOP and do not retry. After confirmed PASS, set `VITE_FEATURED_ARTICLE_ENABLED=true` in local `.env.local`, restart Vite, and perform the synthetic acceptance in `docs/runbooks/featured-article-v1.md`. Update QA/status only from observed results; do not claim LIVE PASS before then.
### Public article cover - local fix and operator deployment (3 November 2026)

- Root cause in the public read path: the admin preview signed a private `article-media` object with the staff session, while public readers attempted signing with the anonymous client; the failure was swallowed and rendered as a missing cover.
- Local fix: public article cards, detail and featured content now point to a read-only `public-article-cover` Edge Function. It accepts a published slug, validates the stored object path belongs to that article, then redirects to a short-lived signed URL. The bucket remains private; no database/RLS/Storage policy or article data changed.
- `npm run lint`, `npm run build`, `npm run typecheck:edge`, and PowerShell deployment-script parse PASS. Existing bundle-size warning (>500 kB) remains. Browser/live image acceptance NOT RUN.
- NEXT AGENT - RESUME FROM HERE: deploy only after the operator's scoped approval using `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-public-article-cover.ps1" -ApprovedPublicArticleCover`. Target is pinned to `rekansiaga-dev` (`uiuiouosblyuqgnvfpeh`). No DB password is required. After deployment is confirmed, restart Vite and verify cover on `/informasi`, article detail, and Home; verify unpublished slug returns 404. Do not claim LIVE PASS before observing browser results. See `docs/runbooks/public-article-cover.md`.

### NEXT AGENT - RESUME FROM HERE: location-based disaster alerts (3 November 2026)

- Local implementation is complete. Focused `npm.cmd run test:location-alerts` passed 8/8; `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run typecheck:edge`, and PowerShell parser validation passed. Build retains the existing >500 kB bundle warning.
- The public-article-cover deployment shown by the operator does not deploy/activate location alerts. The alert SQL package was not applied; no alert rows or Cloud objects were created.
- Review `docs/runbooks/location-alerts-v1.md` and the additive package before requesting explicit approval for `rekansiaga-dev` only. Then run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-location-alerts.ps1" -ApprovedLocationAlerts` from interactive PowerShell. Enter Pooler host and DB password only at their prompts. If commit/postflight is uncertain, STOP and reconcile read-only; never blindly retry.
- After postflight PASS, enable only the two documented local flags, restart Vite, and execute the one-event/one-alert synthetic acceptance. Real-browser, Cloud, GPS, Flutter runtime, and push delivery remain NOT RUN. Do not change staging or Flutter and do not claim LIVE PASS before evidence.


### NEXT AGENT - RESUME FROM HERE: Mobile CMS contract delivered (3 November 2026)

- Read `docs/mobile/WEB-MOBILE-INTEGRATION-CONTRACT.md` before asking the mobile team to integrate Articles, /informasi, or Home featured content. It specifies actual article columns/types, published-only RLS, list/detail pagination/search/order, featured RPC/field and archive fallback, private cover media resolver, Dart snippets, and lifecycle refetch.
- Operator terminal evidence already shared in this conversation confirms integrated-content SQL/article-media deployment, Featured-article postflight PASS, and `public-article-cover` Edge deployment for rekansiaga-dev. Earlier handoff entries saying these deployments were pending are superseded by that operator evidence. This does NOT prove Web browser or Flutter runtime acceptance. Local `.env.local` flags for integrated content and featured article were true when checked on 3 November; restart Vite after any changes.
- No migration, deployment, database read/write, or Flutter edit was performed for this documentation task. The next mobile action is to implement against this document, then test on the dev project using the publishable/anon client. Separately finish Web browser cover acceptance on `/informasi`, article detail and Home; verify unpublished slug 404. Never pass secrets or signed URLs into logs.


### NEXT AGENT - RESUME FROM HERE: approved location alerts deployment BLOCKED before preflight (3 November 2026)

- User approved only the existing location-alert package for rekansiaga-dev/uiuiouosblyuqgnvfpeh. Deployment attempt from this agent returned no output and was interrupted before Session Pooler/password prompts or PostgreSQL. No SQL, RLS, RPC, audit object, Edge Function, alert data, or frontend flag was changed. Do not claim deployed or postflight PASS.
- Existing runner sequence first calls `supabase projects list`; then prompts for pooler hostname, performs read-only preflight, applies guarded transaction, and postflights. The command may have stalled at the initial CLI call. Use an interactive operator PowerShell once with `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-location-alerts.ps1" -ApprovedLocationAlerts`. If CLI listing fails/stalls, stop and report sanitized status. Do not retry SQL unless the script confirms it was never attempted; uncertain commit means reconcile read-only first.
- No Edge Function is needed by this package; the public reader is the database RPC. After postflight PASS only, enable `VITE_LOCATION_ALERTS_ENABLED=true` and `VITE_DEV_ALERT_WRITES_ENABLED=true`, then restart Vite. Do not create a synthetic event/alert until separate data-test approval arrives. See `docs/runbooks/location-alerts-v1.md` and `docs/qa/stage-e/location-alerts-status.md`.


### NEXT AGENT - RESUME FROM HERE: location alerts postflight PASS, before frontend/live test (3 November 2026)

- Operator terminal screenshot supersedes the earlier agent-side blocked attempt: read-only baseline passed and `Location-alert SQL postflight PASS on rekansiaga-dev` was reported. The deployed package is SQL/RPC/RLS/RBAC/audit only; no Edge Function, secret, push service, or alert/application row changed. Do not repeat deployment or claim browser acceptance.
- Postflight summary: alert table RLS enabled, anonymous direct table SELECT denied, `public_active_disaster_alerts_v1(uuid)` exists and anon execute is granted, audit trigger exists. These are operator output checks, not an independent live query by the agent.
- Both local frontend flags remain OFF: `VITE_LOCATION_ALERTS_ENABLED` and `VITE_DEV_ALERT_WRITES_ENABLED`. If exposing the UI, set both to `true` in local `.env.local` and restart Vite. Do not create any alert data until separate TEST-data approval is received.
- After data approval, perform one clearly TEST-marked event+alert browser acceptance in Chrome, verify Admin/RBAC/audit, modal, `/pemantauan`, `/peta`, expiry/revoke/dedupe and logical revoke cleanup. No physical deletes. No Flutter/staging/Gateway/SOS changes.
- Current records: `docs/qa/stage-e/location-alerts-status.md`, `docs/roadmap-rekansiaga.md`, `docs/development-status.md`; runbook `docs/runbooks/location-alerts-v1.md`.

### NEXT AGENT — RESUME FROM HERE: location alerts activation and acceptance (3 November 2026)

- The operator reconfirmed approval, but Cloud deployment was already confirmed by earlier operator terminal output: read-only baseline PASS and location-alert SQL postflight PASS on `rekansiaga-dev` (`uiuiouosblyuqgnvfpeh`). Do not redeploy.
- The latest redundant agent-side invocation passed exact project verification and reached the native psql password prompt; it was stopped before read-only preflight because the database password must be entered by the operator locally. No SQL, application data, flags, or other Cloud configuration changed in that invocation.
- Next operator action: set only `VITE_LOCATION_ALERTS_ENABLED=true` and `VITE_DEV_ALERT_WRITES_ENABLED=true` in local `.env.local`, restart Vite, and inspect `/pemantauan`, `/peta`, and Admin → Notifikasi. The live synthetic event/alert test still requires separate data approval; do not create TEST or real alert data yet.
- Use the checklist in `docs/runbooks/location-alerts-v1.md`. Record browser/RBAC/audit/expiry/revoke/deduplication results before claiming LIVE acceptance. No Edge Function is part of this package; do not change staging, Flutter, Gateway, or SOS.

## Smart Rescue Relay SOS - local implementation checkpoint (3 November 2026)

- Existing behavior was only an official-contact directory plus optional local GPS preview; no SOS submit backend, Admin queue, or dispatch. This checkpoint adds a gated public submit/tracking/revoke UI, Admin queue/detail/status UI, additive SQL/RLS/RPC proposal, Edge Function source, pre/postflight, rollback proposal, deployment runner, focused local SQL tests, and Flutter contract section.
- Privacy/safety: one-time 256-bit CSPRNG tracking secret and separate idempotency secret; backend stores HMAC verifiers only; tracking omits private payload and staff notes; expiry/revoke; no anon SELECT; Admin role checks and audit; no automatic retry after uncertain submit; no dispatch claim. GPS/battery opt-in. Public map receives no SOS points.
- `npm.cmd run test:sos-relay` passes 5/5 local PGlite contract checks. `npm.cmd run lint`, `npm.cmd run build`, and `npm.cmd run typecheck:edge` pass; build retains the existing >500 kB warning. Tests use synthetic data in an ephemeral local DB only. PowerShell runner syntax and native PostgreSQL compatibility are NOT TESTED.
- **NOT COMPLETE / Cloud and LIVE blocked:** no scoped SOS Cloud approval was given; no SQL, secret, Function, test row, or frontend flag changed. Required secrets `SOS_CREDENTIAL_HMAC_KEY` and `SOS_ALLOWED_ORIGINS` remain unconfigured/unverified. Browser/CAPTCHA, Cloud RBAC, E2E and Flutter runtime are NOT TESTED. Retention deletion is not implemented; current dev rate limit is project-wide and needs hardening before public launch.
- Admin map intentionally does not load a third-party basemap with private coordinates. A privacy-reviewed/self-hosted tile source is outstanding before map visualization.
- Read `docs/runbooks/sos-relay-v1.md`, then review SQL/Edge package. Request explicit approval for the exact dev-only package before `scripts/deploy-dev-sos-relay.ps1 -ApprovedSosRelay`. If migration result is uncertain, do not retry SQL. Flags remain off until postflight, Function deploy, and separately approved synthetic-data acceptance.

### NEXT AGENT - RESUME FROM HERE: Smart Rescue Relay SOS

1. Review `docs/runbooks/sos-relay-v1.md` and proposal. This work is **LOCAL only**, not production-ready or LIVE end-to-end.
2. Close readiness gaps: parse-check PowerShell runner; compile SQL using native Supabase-compatible PostgreSQL; verify PostgREST DTOs; choose a privacy-safe Admin map provider; implement retention cleanup; design per-caller abuse control using verified caller identity; review consent/idempotency behavior.
3. Obtain explicit approval for the exact package on `rekansiaga-dev` (`uiuiouosblyuqgnvfpeh`) only. Configure required Edge secrets through Dashboard without revealing values. Run guarded deployment once; uncertain SQL outcome means reconcile read-only, never replay.
4. Only after postflight and Function deployment, enable local flags and restart Vite. Get separate approval before making one synthetic TEST request, then follow the live checklist. Never use a real emergency.
5. Share `docs/mobile/WEB-MOBILE-INTEGRATION-CONTRACT.md` as an advance proposal only; SOS API remains PENDING until backend and mobile runtime acceptance pass. Never edit Flutter or staging.

## SOS QA result correction - 3 November 2026

Focused contract suite now passes **8/8** (adds expired credential and durable quota boundaries). PowerShell deployment runner parser-only check is **PASS**; runner was not executed. Native Supabase PostgreSQL/PostgREST compile/runtime remains NOT TESTED. This supersedes the earlier 5/5/runner-parser-pending wording in the initial SOS checkpoint; no Cloud actions occurred.
