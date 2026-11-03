> Kontrak tambahan RK2 v2 sudah disiapkan lokal, belum deployed: receipt mempertahankan field v1 dan menambah tracking_credential; track menerima kredensial tunggal melalui Gateway. Feature flag default false menjaga jalur lama sampai backend siap. Lihat [kontrak/rollout/revocation v2](runbooks/single-tracking-v2.md). Tidak mengubah Flutter.

# RekanSiaga - shared backend dan paket aktivasi dev

**31 Oktober 2026 - paket E terpadu:** lihat [runbook tunggal E](runbooks/stage-e-complete.md), [status delapan fitur dan bukti](qa/stage-e/STATUS.md), serta [kontrak HTTP Flutter](stage-e-backend-contract.md). Seluruh integrasi lokal dan anti auto-reset ditangani sekaligus;37 tes paket,23 regresi Auth dan23 skenario Chrome lokal PASS. Enam reader publik dev LIVE200, tetapi CRUD/track setelah review/audit/cleanup LIVE masih menunggu satu scope approval dan sesi staf. Tidak mengubah Flutter/schema/Gateway/RLS atau mengulang A-D. Approval konten terpisah: `VITE_DEV_CONTENT_WRITES_ENABLED` mencakup business content dan dependensi sumber dev; global/staf/settings/notifikasi tidak dibuka. Draft memori dan encrypted recovery tidak mengubah kontrak data backend. Tidak mengklaim E/Flutter runtime/BRD penuh PASS.

**Review rutin Admin dev:** `VITE_DEV_REPORT_REVIEW_ENABLED=true` mengaktifkan alur review laporan existing maupun baru melalui `review_public_report` hanya pada URL persis rekansiaga-dev. Route dan service tetap memeriksa staf terverifikasi dengan role report_verifier/super_admin; RPC tetap berwenang atas akses baris, transisi, history dan audit. Flag ini adalah guard operasional frontend, bukan izin server atau grant baru. Tidak membuka CRUD modul lain: `VITE_DEV_REMOTE_WRITES_APPROVED` tetap false. Untuk mode rutin, `VITE_DEV_REPORT_REVIEW_APPROVED=false` dan `VITE_DEV_REPORT_REVIEW_ID=`; tidak perlu mengganti UUID/restart setiap laporan baru. Jika mode uji satu laporan diaktifkan kembali, scope UUID mengalahkan mode rutin. Konfirmasi tiap keputusan tetap wajib; verified/rejected tetap final. Default template tetap false. Pengguna meminta alur rutin setelah uji satu laporan; tidak ada mutasi Cloud otomatis atau perubahan kontrak Flutter/database.

**Koreksi selector wilayah Web:** Kabupaten dan Kota adalah satu tingkat alternatif di bawah Provinsi, ditampilkan dalam satu dropdown Kabupaten / Kota. Kecamatan memakai parent UUID pilihan tersebut, lalu Desa / Kelurahan. Enum backend regency/city tetap dibedakan; schema, data dan kontrak Flutter tidak berubah. Reset induk mengosongkan seluruh turunan; existing FK value tetap dapat dihidrasi untuk kedua jenis wilayah.

**Update operator tahap D:** DEPLOYED / DISABLED PASS (204/403/405/503, active=false, validReportSubmissions0). E disiapkan, belum disetujui untuk mutasi Cloud tambahan. Lima nama secrets yang diperlukan PASS read-only; values tidak ditampilkan/disimpan. Lanjut sesuai E-ACTIVATION.md pada paket operator; tidak mengulang A-D. Activation probe bukan bukti submit201/track200 atau seluruh BRD.

**30 Oktober 2026 ? C = DEPLOYED / PASS** berdasarkan hasil operator: 38/514/7285/83762, total91599, hierarchy_errors0; bukti existing `C-psql-verification.json`. Tidak mengulang import/audit A-C. D gateway existing siap dieksekusi operator ke dev, disabled, dengan origin `http://localhost:5173` dan Turnstile hostname `localhost`. Panduan: `operator-evidence/dev-release-20261029/D-GATEWAY.md`; skrip `scripts/deploy-dev-report-gateway.ps1`. Cloud deployment/aktivasi dan acceptance submit-track **NOT_RUN** oleh agent; memerlukan persetujuan cakupannya. Catatan pending C di bawah merupakan riwayat yang digantikan status ini.

## Status faktual

**C approval received:** import of the existing pinned 91,599-region dataset is authorized for operator SQL Editor execution. Approved full SQL and 184 approved batches are prepared; only the two acknowledgement comments were enabled. Import has not run. After all batches commit, require C postflight pass=true before requesting D. This supersedes the historical C-awaiting-approval note below.

**Update operator: B = DEPLOYED / MIGRATION PASS.** Five migration checks and both helper checks PASS; regions catalog empty before import. A SECURITY PASS remains accepted. C import package READY (91,599 rows / 184 batches), awaiting separate approval; no automatic Cloud mutation or repeated A/B audit. See the operator package C-IMPORT.md.

**Update operator, 29 Oktober 2026: A = DEPLOYED / SECURITY PASS.** Supplied postflight: 10 RPC ACL PASS, 22 RLS enabled, evidence bucket/report boundaries PASS. This updates the historical pending-A status below; live CRUD/gateway/Flutter acceptance remains pending. B SQL Editor copy and migration-only postflight are READY in the operator package; no repeated A audit or automatic Cloud mutation.

**29 Oktober 2026: paket lokal READY untuk persetujuan per cakupan; aktivasi Cloud dan acceptance live belum dijalankan.** Gunakan hanya [runbook final](runbooks/dev-live-admin-operator.md) dan manifest `operator-evidence/dev-release-20261029/release-manifest.json` untuk urutan A Admin/Security ? B migration regions ? C seed 91.599 ? D gateway disabled ? E enable dan bukti CRUD. Bagian urutan lama di bawah adalah riwayat dan digantikan runbook final. Default internal supabase_admin tidak diubah/tidak menjadi blocker; ACL efektif RPC tetap fail closed. [Bukti lokal](qa/live-admin/preflight.json).

Backend utama Web dan tim Flutter: **rekansiaga-dev / uiuiouosblyuqgnvfpeh**, URL `https://uiuiouosblyuqgnvfpeh.supabase.co`. Staging `fweeyflixnqbvvceuent` tetap terpisah. **Phase 4A BLOCKED**. Tidak ada Cloud write, migration, deployment, bootstrap, akun baru atau fixture staging yang dipindahkan dalam pekerjaan ini.

Implementasi lokal memakai service database, bukan mock/localStorage sebagai sumber utama. Admin CRUD **belum berstatus LIVE** karena sesi staf, catalog/RLS/grants dan aktivasi remote belum diverifikasi. BRD asli tidak ditemukan pada workspace; scope berasal dari brief pengguna dan schema existing. Allowlist settings di bawah adalah usulan yang perlu disetujui, bukan klaim kepatuhan BRD yang sudah dikonfirmasi.

Probe aktual: enam sumber publik berhasil dibaca, semuanya 0 baris terlihat. Sepuluh tabel privat/operasional ditolak anon dengan HTTP401/42501. Auth settings HTTP200; raw REST artikel dengan apikey HTTP200; OPTIONS `/functions/v1/report-gateway` HTTP404. Hasil kosong atau reachability bukan bukti RLS lengkap. [Bukti read-only](qa/mvp/dev-readonly.json).

## Kontrak publik dan RBAC

REST base `/rest/v1`. Gunakan SDK dengan URL/publishable key dev; raw request publik memakai header `apikey`, sedangkan operasi staf memakai `Authorization: Bearer <user access JWT>` tambahan. Gateway publik memakai apikey tanpa memperlakukan publishable key sebagai JWT. Jangan memakai secret/service_role di klien. Web memiliki client publik anonim terpisah sehingga sesi admin tidak ikut pada query publik.

Tipe: `id`/FK = UUID string, timestamps = ISO8601, boolean = JSON boolean, nomor telepon = string, konten = teks biasa. Nilai nullable tetap `null`, bukan status buatan. Daftar publik maksimal 100 terbaru; query detail artikel/guide/event memakai pengenal khusus dan tidak dibatasi jendela daftar tersebut. Peta maksimal 300 lokasi. Admin konten memakai pagination server 20 baris, pencarian debounce 300ms; daftar staf maksimal 200 profil. Kontak dan fasilitas tanpa koordinat/nomor tidak dibuatkan titik/nomor pengganti.

| Tabel/endpoint | Field penting dan filter publik | Operasi admin / role |
| --- | --- | --- |
| articles | id,author_id,title,slug,summary?,content,source_url?,publication_status,published_at?,created_at,updated_at. Publik: published + published_at bukan null, urut published_at desc. Detail: slug. cover_image_path opsional; Web hanya merender URL HTTP(S), editor menerima HTTPS publik tanpa token. | CRUD: information_manager/super_admin. Status draft/published/archived. PATCH/DELETE memakai id + updated_at. Upload Storage untuk gambar artikel belum dikonfigurasi; URL publik dapat dikelola. |
| mitigation_guides | id,disaster_type,title,content,source_url?,publication_status,updated_at. Publik: published. Detail: id. | CRUD: mitigation_editor/super_admin. |
| mitigation_checklist_items | id,guide_id,phase,instruction,sort_order,is_active. Publik: parent published + item aktif; urut phase lalu sort_order. Fase before/during/after. | CRUD: mitigation_editor/super_admin; FK guide existing. |
| disaster_events | id,source_id,region_id?,disaster_type,title,description?,severity?,verification_status,event_status,occurred_at?,source_updated_at?,published_at?,updated_at. Publik: published_at bukan null + source_confirmed/staff_verified. | CRUD: information_manager/super_admin; event_status unknown/ongoing/resolved. published_at null berarti tidak dipublikasikan/arsip. Tidak mengubah enum backend. |
| event_updates / event_locations | Update: event_id,update_type,description,source_updated_at?,recorded_at. Lokasi: event_id,label,location_type,coordinates?,is_primary. Hanya parent publik yang terlihat melalui RLS anonim. | CRUD: information_manager/super_admin. Lokasi epicenter/affected_area/other; satu primary per event. Geography ditulis SRID4326 POINT(longitude latitude); respons EWKB didekode sebelum render. |
| emergency_contacts | organization_name,service_type,phone_number?,official_url?,region_id?,verified_at?. Publik: is_verified AND is_active. | CRUD: information_manager/super_admin; verifikasi memerlukan timestamp. |
| relief_locations | name,location_type,address?,coordinates?,source_url?,updated_at. Publik: verification_status=verified. | CRUD: information_manager/super_admin; shelter/command_post/aid_point. |
| data_sources | name,source_type,official_url?,is_active; sumber aktif dapat dibaca publik. Tidak mengekspos API credentials melalui editor. | CRUD super_admin; log sinkronisasi read-only. Tidak mengklaim feed resmi tersinkron otomatis. |
| app_public_config (baru, pending) | Hanya key/value teks untuk site_name dan public_notice. Tidak mengekspos tabel settings penuh. | admin_set_public_setting, super_admin; allowlist memerlukan persetujuan bisnis dan review nilai existing sebelum dipublikasikan. |

Wilayah memakai `regions.id` (UUID) hanya sebagai foreign key internal dan
`regions.code` resmi Kemendagri sebagai identifier stabil. UI menampilkan
`name` melalui selector cascading `province -> regency/city -> district ->
village`; child selection di-reset ketika parent berubah. Dataset harus
memuat seluruh empat tingkat, lolos pemeriksaan duplicate/orphan/foreign-key/
parent-level, dan diimpor dengan generator idempotent tanpa menghapus baris
existing. Remote seed tetap memerlukan operator approval dan tidak termasuk
status LIVE saat katalog dev belum diverifikasi.

Otorisasi: Auth getUser -> staff_profiles aktif -> staff_role_assignments -> roles (super_admin/information_manager/report_verifier/mitigation_editor). Client guard menolak akses jika verifikasi gagal; RLS/RPC tetap otoritatif. `admin_manage_staff` hanya mengelola akun Auth existing, mengganti assignment secara atomik dan melindungi Super Admin aktif terakhir. Tidak ada direct write assignment dari UI.

Notifikasi: CRUD notification_rules dan enqueue melalui `admin_queue_notification`; antrean berstatus queued bukan bukti delivery. Provider/worker Web/Android push belum tersedia/teruji. Audit hanya menampilkan id,actor_id,action,entity_type,entity_id,created_at; isi laporan/token/credential tidak dibawa ke event publik.

## Laporan anonim, review dan tracking

Endpoint baru (pending deployment): `POST /functions/v1/report-gateway`. Semua respons `Cache-Control: no-store`. Validasi server, CAPTCHA Turnstile (hostname + action + token sekali pakai), kuota dev-global bersama 5 submit / 30 track per slot tetap600 detik memakai RPC atomik existing, tanpa identitas header IP, ukuran body/foto, MIME + magic bytes, private bucket report-evidence. Tidak ada anon INSERT/SELECT ke tabel laporan sensitif.

Submit request:

```json
{"action":"submit","report_type":"Banjir","title":"TEST-LIVE - contoh laporan","description":"Data uji berlabel, bukan kejadian aktual.","region_name":"Wilayah contoh","location_description":"Alamat contoh untuk pengujian","privacy":true,"captcha_token":"<token CAPTCHA baru>"}
```

Opsional: latitude/longitude harus sepasang dengan rentang valid; `photo={mime_type,base64}` hanya JPEG/PNG/WebP maksimal 5 MiB. Foto tidak diberi URL publik. Server tidak mengklaim antivirus atau penghapusan EXIF; UI meminta pengguna menghindari metadata/identitas sensitif. Report, hash token, history awal dan metadata lampiran disimpan dalam satu transaksi. Jika hasil commit tidak pasti, UI tidak menyatakan sukses dan tidak otomatis mengirim ulang; evidence tidak dihapus pada timeout yang mungkin sudah commit. Orphan upload dari kegagalan tidak pasti perlu rekonsiliasi operator, bukan penghapusan luas.

Respons sukses HTTP201: `{tracking_code:"RS-<16 hex uppercase>",access_token:"<64 hex lowercase>",expires_in_days:90}`. Token mentah hanya dikembalikan kepada pengirim dan ditampilkan dalam memori halaman; database menyimpan hash. Jangan menaruh token pada URL, logs, analytics, localStorage atau query cache.

Tracking request: `{action:"track",tracking_code,access_token,captcha_token}`. Token CAPTCHA baru setiap pencarian. Respons: `{status,created_at,updated_at,history:[{status,changed_at}]}`. Tidak memuat judul/identitas pelapor, reviewer, alasan privat, path lampiran atau token. Salah kode/token, kedaluwarsa dan tidak ditemukan sama-sama HTTP404 NOT_FOUND.

Review staf: `review_public_report(p_report_id UUID,p_new_status TEXT,p_reason TEXT DEFAULT NULL)`. `reason` boleh NULL. Kolom kosong yang tidak diisi dikirim NULL; string kosong/whitespace yang sengaja diberikan ditolak. Jika diisi, trim memakai PostgreSQL `btrim` dengan karakter space/tab/LF/CR/FF/VT; maksimum 4000 Unicode code points setelah trim (PostgreSQL char_length), bukan panjang UTF16 JavaScript. Client juga menolak string yang seluruhnya whitespace Unicode. SQL tetap otoritatif untuk regex whitespace sesuai locale database. Signature RPC tidak berubah, sehingga klien Flutter lama yang menghilangkan p_reason tetap kompatibel.

Transisi: unverified -> under_review/verified/rejected; under_review -> verified/rejected; status final tidak dibuka ulang. Role report_verifier/super_admin, lock row, recheck izin, update reviewer/waktu, history dan audit dalam transaksi yang sama. Tidak ada PATCH langsung public_reports dari UI. History menyimpan alasan ternormalisasi atau NULL.

Lampiran: action `attachment` + attachment_id, user JWT wajib. Gateway memverifikasi identitas/role dan row RLS sebelum membuat signed URL 60 detik. Anon tidak memperoleh path atau URL privat. Donasi tetap SIMULASI tanpa pembayaran.

Error stabil: 400 INVALID_INPUT/INVALID_PHOTO; 401 UNAUTHORIZED; 403 FORBIDDEN/CHALLENGE_FAILED; 404 NOT_FOUND; 413 BODY_TOO_LARGE/PHOTO_TOO_LARGE; 429 RATE_LIMITED; 503 SERVICE_NOT_READY/SERVICE_UNAVAILABLE/SUBMISSION_UNCERTAIN. REST: 42501 izin, 23505 nilai unik, 23503 relasi masih dipakai, 40001 konflik versi, PGRST116 zero-row/conflict, PGRST202/204/205 schema/RPC belum cocok.

## Sinkronisasi untuk Web dan tim Flutter

Web memakai **polling**, bukan Postgres Changes/Broadcast: satu timer publik 20 detik, hanya query aktif saat tab terlihat dan online. Request berjalan didedup; mutasi sukses menginvalidasi public-content/admin-content. Refetch saat tab aktif/koneksi pulih. Query admin aktif umumnya 30 detik, verifikasi role 60 detik. Pencarian didebounce 300ms. Cache privat dibuang saat sesi berubah. Tidak ada subscription tabel laporan/token/lampiran atau publikasi Realtime baru.

Tim Flutter memakai tabel/filter/DTO yang sama: fetch ketika layar dibuka/resume/reconnect, polling sekitar 20 detik hanya ketika layar aktif, hentikan timer saat dispose/background, dan jangan gunakan cache publik untuk data privat. Dengan polling, perubahan lintas klien diharapkan pada siklus berikutnya; jangan menyebutnya instan. Tracking tetap POST bertoken + CAPTCHA, bukan stream laporan publik. Kode Flutter, SDK dan aplikasinya tidak diubah/diuji dalam milestone ini. Status aplikasi Flutter **BLOCKED**, bukan PASS karena adaptor sebelumnya dapat SELECT.

## Satu paket persetujuan Cloud: dev-live-admin-v1

Semua berikut **disiapkan lokal dan belum dijalankan pada Cloud**:

- [Preflight metadata read-only](sql/dev-mvp-readonly.sql): schema/RLS/grants/kolom/RPC/storage/publication. Jangan mengekspor Auth rows, report bodies, settings values atau tokens. Review nilai site_name/public_notice secara privat sebelum menyetujui view publik.
- [Release SQL](../supabase/releases/dev-live-admin.sql): reuse tabel existing; assigned-role read, RPC staf/settings/antrean, review reason opsional, audit trigger, private quota table, service-only submit/track, private evidence bucket. Tidak menambah akun, menyalin schema staging, atau menonaktifkan RLS.
- [Rollback/recovery](../supabase/releases/dev-live-admin-rollback.sql): snapshot definisi/grants dan fingerprint metadata sebelum release; guard sembilan function dan 19 relation mendeteksi drift definisi/ACL/schema/policy/trigger sebelum recovery. Metadata baseline diverifikasi kembali sebelum COMMIT. Data laporan, audit, private files dan quota/backup dipertahankan. Tidak ada CASCADE/drop tabel aplikasi. Duplicate apply, rollback berulang, dan re-apply sesudah rollback sengaja berhenti aman; ini bukan installer idempoten. Re-apply memerlukan rekonsiliasi berversi yang direview, bukan menghapus objek proteksi yang dipertahankan.
- [Gateway](../supabase/functions/report-gateway/index.ts), [konfigurasi](../supabase/config.toml), dan [template server-only](../supabase/functions/report-gateway/.env.example). Default disabled. Secret/service_role hanya pada runtime server.

Urutan operator minimum, setelah satu cakupan disetujui:

1. Pastikan Dashboard **rekansiaga-dev / uiuiouosblyuqgnvfpeh**, review hasil preflight. Guard harus lulus; jangan menghapus guard bila dev berbeda. Jalankan release penuh dengan dua GUC persetujuan yang masih dikomentari di source. GUC adalah pernyataan operator, bukan autentikasi/identitas server otomatis. Jika transaction gagal, jangan menjalankan sebagian batch atau bootstrap ulang.
2. Konfigurasikan secrets gateway melalui Dashboard (bukan frontend/source/log): public key dev, allowed origins dan hostname/secret CAPTCHA. Mode dev-global memakai bucket tetap di RPC existing: 5 submit dan30 track per slot tetap600 detik, bersama semua caller. REPORT_TRUSTED_IP_HEADER dan REPORT_RATE_HMAC_KEY tidak diperlukan atau dibaca; nilai existing boleh tetap disimpan. Tidak ada migration baru. Deploy disabled ke ref dev melalui scripts/deploy-dev-report-gateway.ps1; jangan aktifkan sebelum D probe PASS dan persetujuan aktivasi E.
3. Setelah backend siap dan scope data disetujui, set VITE_DEV_REMOTE_WRITES_APPROVED=true; VITE_REPORT_GATEWAY_ENABLED=true + sitekey publik; VITE_PUBLIC_CONFIG_ENABLED=true hanya setelah allowlist disetujui. Restart Vite. Flag bukan kontrol keamanan; database wajib menolak aktor tanpa izin. Template .env.local existing tidak ditimpa oleh pekerjaan ini.
4. Pakai sesi akun DEV existing dan role yang memang tersedia. Jangan kirim password/JWT ke chat. Runner artikel default no-network; untuk scope **satu artikel TEST-LIVE, update/publish/unpublish, negative-write probe pada baris itu dan cleanup id+slug yang sama**, jalankan `& .\scripts\run-dev-live.ps1 -ApprovedArticleScope` setelah disetujui. Helper membaca token tersembunyi ke memori proses, tidak menaruhnya di argumen/history/file, dan memulihkan environment saat selesai. Tidak membuat akun baru. Hasil redacted di docs/qa/live-admin/dev-e2e.json hanya dibuat bila run live benar-benar dieksekusi.
5. Dalam scope uji yang disetujui, operator menyiapkan paling banyak satu panduan (+checklist), satu kejadian (+pembaruan/lokasi), dan satu laporan contoh berlabel TEST-LIVE untuk membuktikan skenario lintas sesi, verifikasi, token benar/salah, izin role/tanpa role/nonaktif, history/audit dan sinkronisasi. Scope tambahan ini belum dijalankan runner artikel dan tidak boleh dianggap PASS. Gunakan UI publik nyata/CAPTCHA baru dan akun existing; bila akun/izin tidak tersedia, catat BLOCKED, jangan provision atau ubah role tanpa target/cakupan eksplisit. Cleanup hanya id milik run yang benar-benar dibuat dan disetujui; jangan hapus audit/data lain. Aplikasi Flutter diuji oleh tim mobile pada id/version yang sama.
6. Bila perlu recovery dalam cakupan yang disetujui, nonaktifkan kedua flag write (VITE_DEV_REMOTE_WRITES_APPROVED dan VITE_DEV_ARTICLE_WRITES_APPROVED), gateway/config flags, serta REPORT_GATEWAY_ENABLED terlebih dahulu. Review drift dan jalankan rollback penuh dengan acknowledgement rollback yang terpisah; pulihkan frontend yang sesuai. Jangan menghapus private bucket, object, backup atau quota table untuk memaksa rerun. Setelah rollback, re-apply otomatis diblokir dan memerlukan rekonsiliasi berversi yang direview.

Cakupan lama ini digantikan tabel A?E/R pada runbook final; tidak ada izin Cloud yang tersirat dari dokumen. Tidak termasuk bootstrap, pembuatan akun, perubahan schema lain, fixture staging, pembayaran atau penghapusan data existing. Konektor Supabase tersedia di katalog tetapi belum terpasang/terhubung (tidak diinstal otomatis). Operator dapat menghubungkan konektor yang sebelumnya ditawarkan atau menjalankan paket yang sama lewat Dashboard. Sesi staf/catalog/secret CAPTCHA/akses operator belum tersedia pada agent; persetujuan saja tidak membuktikan backend sudah dieksekusi atau acceptance lulus.

## Bukti pengujian dan batas hasil

- PASS preflight lokal terbaru: parser menerima 65 statement/11 blok PLpgSQL release dan 25 statement/4 blok rollback; 19 pemeriksaan runtime PostgreSQL 18.6 terisolasi, 12 tes backend gateway, ESLint backend dan typecheck Edge. Jalankan `npm run test:preflight`. [Runtime evidence](qa/live-admin/preflight-runtime.json). PostGIS memakai stub text; Auth/Storage berupa fixture kontrak, bukan layanan Supabase; concurrency/JWT nyata belum diuji. Ini bukan bukti kompatibilitas database Cloud aktual.
- Perbaikan preflight: view config hanya SELECT meskipun default grants luas; backup/quota privat; konflik overload RPC ditolak tanpa menimpa API existing; rollback menolak drift metadata. Gateway memvalidasi konfigurasi dev/origin/hostname/header secara ketat, CAPTCHA wajib hostname/action cocok, error cleanup lampiran tidak diabaikan. Cleanup gagal/commit tidak pasti tetap memerlukan rekonsiliasi operator.
- PASS frontend sebelumnya tetap berlaku sebagai bukti lokal: 25 tes kontrak/admin/gateway, 23 tes Auth, lint dan Web build. Tidak diulang pada preflight ini.
- PASS browser sintetis: 34 layout +11 skenario integrasi termasuk publish, polling, reconnect/tab aktif, checklist, lokasi bantuan, review reason NULL, tracking dan zero raw report PATCH. [Hasil](qa/live-admin/browser.json). Regresi publik 70 layout +14 kelompok interaksi; Auth browser 11 skenario. Seluruh HTTPS pada tes UI dicegat/diblokir; hasilnya bukan Cloud PASS.
- PASS remote read-only: enam API publik + sepuluh penolakan anon; gateway OPTIONS404. [Hasil](qa/mvp/dev-readonly.json).
- NOT_RUN/BLOCKED pada Cloud: katalog schema/RLS/grants/default ACL/RPC, login dan CRUD staf, CAPTCHA nyata, upload/signing Storage, anonymous submit -> review -> tracking, atomicity/concurrency/recovery dan aplikasi Flutter. SQL runtime lokal di atas tidak menggantikan acceptance tersebut. Push/BMKG live tidak diklaim. Warning bundle utama >500 kB tetap.

Rujukan kontrak provider: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Edge authentication](https://supabase.com/docs/guides/functions/auth-headers), [private Storage](https://supabase.com/docs/guides/storage/serving/downloads), [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). CAPTCHA dan quota gateway bukan pengganti pengujian runtime yang masih tertunda.
