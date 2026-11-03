# Satu kode pelacakan — paket deployment Cloud DEPLOYED, LIVE pending

## Koreksi error peta dan review — 2 November 2026

Jika SQL Editor melaporkan `42P13 cannot change return type`, gunakan versi terbaru `supabase/releases/dev-public-report-map.PROPOSED.sql`. File tersebut melakukan `DROP FUNCTION public.list_public_verified_report_map()` tanpa argumen di dalam transaksi, kemudian membuat ulang return type terbaru. Jalankan sekali; bila gagal atau hasil tidak pasti, berhenti dan jangan retry buta.

Paket terpisah `supabase/releases/dev-report-review-correction.PROPOSED.sql` memungkinkan Super Admin mengoreksi status apa pun melalui RPC atomik dengan history/audit; role `report_verifier` tetap forward-only. Paket ini belum diterapkan Cloud.

Paket `supabase/releases/dev-public-report-photo-approval.PROPOSED.sql` hanya mendefinisikan kontrak approval/revoke untuk salinan foto publik tersanitasi. Foto asli tetap privat dan tidak boleh disajikan melalui signed URL pada peta. Pipeline image sanitization/copy dan storage public terpisah memerlukan deployment terkontrol serta postflight privasi; belum diterapkan Cloud.

### Postflight koreksi status Super Admin

Setelah operator menjalankan `supabase/releases/dev-report-review-correction.PROPOSED.sql` dan mendapat `Success`, refresh Admin. Pada satu laporan uji yang sudah `verified`, pilih `unverified`, isi alasan, konfirmasi, lalu pastikan status/history berubah. Uji balik `unverified` ke `verified` hanya pada laporan uji yang sama. Jika gagal atau hasil tidak pasti, berhenti dan simpan pesan error tanpa retry SQL.

## Addendum peta publik verified — 2 November 2026

Paket terpisah `supabase/releases/dev-public-report-map.PROPOSED.sql` menambah `list_public_verified_report_map()` sebagai projection read-only. RPC memakai `SECURITY DEFINER`, `search_path` tetap, `anon/authenticated` hanya mendapat EXECUTE, dan tidak ada SELECT langsung ke `public_reports`. Output hanya hash marker non-otoritatif, kategori canonical, judul maksimum 180 karakter dengan penyamaran email/telepon, nama wilayah, koordinat WGS84, dan `updated_at`; hanya status `verified`, koordinat non-null, maksimum 500 baris. Token, tracking code, reviewer, alamat/lokasi description, attachment, dan catatan Admin tidak dikembalikan.

Operator menyetujui scope RPC ini untuk `rekansiaga-dev` saja. **Belum diterapkan Cloud.** Setelah operator menjalankan SQL dan postflight read-only mengonfirmasi anon tidak dapat SELECT tabel privat serta RPC hanya mengembalikan kolom kontrak, set `VITE_PUBLIC_VERIFIED_REPORT_MAP_ENABLED=true` lalu restart Vite. Jika SQL gagal atau hasil tidak pasti, berhenti tanpa retry. Rollback frontend: flag false dan restart; jangan membuka policy tabel.

### Foto verified pada modal peta

Scope foto yang disetujui operator menambahkan `photo_key` hash dan RPC service-role-only `get_public_verified_report_attachment(text)`. Gateway terbaru menyediakan `public_attachment` yang hanya menerima hash, memeriksa `verified`, menerapkan rate limit dan Turnstile action `map-photo`, lalu memberi signed URL 5 menit. Bucket `report-evidence` tetap privat; tidak ada UUID attachment, path storage, token, atau SELECT publik dikembalikan. SQL proposal harus dijalankan ulang versi terbaru dan Gateway additive harus dideploy sebelum foto bekerja. Jika salah satu gagal, jangan retry SQL otomatis dan set flag peta false.

## Rekonsiliasi guard — 2 November 2026

Hasil read-only operator: `public_reports` RLS **DISABLED** dan `track_report_v1(text,text)` **FOUND**. Guard berhenti karena RLS nonaktif. Source Gateway aktual memanggil `submit_report_v1(text,text,text,text,double precision,double precision,text,text,bigint)`, yang membungkus `submit_public_report(text,text,text,uuid,text,double precision,double precision)`. Guard telah diperbaiki untuk memeriksa kedua kontrak secara eksplisit serta CSPRNG. Manifest hash diperbarui; 6 tes Gateway + 8 tes SQL/WASM PASS. Tidak ada Cloud mutation/retry. RLS harus dipulihkan dengan approval terpisah sebelum deployment RK2.

## Hasil percobaan deployment — 2 November 2026

Approval eksplisit RK2 telah diterima dan password database berhasil diterima. Percobaan skrip deployment resmi terhenti oleh guard SQL `STOP: existing private report RLS and tracking required` pada baris 12-14. Guard berada sebelum `CREATE FUNCTION`, sehingga tidak ada bukti mutasi Cloud atau deploy Gateway. Jangan retry otomatis; lakukan rekonsiliasi read-only RLS `public_reports` dan signature `track_report_v1(text,text)` tanpa melemahkan kontrol keamanan.

## Checkpoint pemeriksaan paket — 2 November 2026

Paket saat ini **READY FOR EXPLICIT OPERATOR APPROVAL**, belum DEPLOYED dan belum PASS LIVE. Preflight hash melalui `deploy-dev-single-tracking.ps1` tanpa switch PASS tanpa network call atau mutasi. Scope tetap dua RPC service-only, deploy additive Gateway, dan aktivasi flag frontend setelah backend berhasil; tidak mencakup perubahan RLS/policy/tabel/data/grant/secret. Jangan menjalankan switch approval tanpa persetujuan eksplisit operator.

Target tunggal: rekansiaga-dev `uiuiouosblyuqgnvfpeh`. Tidak mengulang A–D/E CRUD. Tidak mengubah Flutter/staging. Perubahan lokal ini tidak membuktikan LIVE PASS.

## Desain dan keamanan

Kode `RK2-` diikuti 52 simbol Crockford Base32 dalam 13 kelompok empat. Tidak peka huruf besar/kecil, menerima spasi/pemisah dan alias O→0, I/L→1; padding harus kanonis. Base32 adalah encoding, bukan enkripsi/penambah entropy. Kode membawa token 32 byte saja, tanpa reference administratif, UUID database atau data laporan. Satu kode tetap panjang karena mempertahankan kekuatan kredensial; salin/unduh menghindari pengetikan manual.

Generator backend existing memakai dua UUIDv4 penuh dari `gen_random_uuid()` (CSPRNG, sekitar 244 bit acak gabungan, bukan 256 bit penuh). Tidak menggunakan reference RS/RPT sebagai autentikasi. Guard deployment memeriksa ekspresi generator yang ditinjau dan dukungan RPT v1; berhenti bila berbeda. Tidak mengganti generator/data lama. Token mobile di luar generator existing tidak dinyatakan telah diaudit.

Backend menyimpan SHA-256 token hex existing; Base32 didekode Gateway ke token hex yang sama. Hash unik/index existing dipakai RPC `track_report_v2(text)`, yang menerapkan expiry/revocation dan mendelegasikan hasil ke `track_report_v1`. Tidak ada penambahan kolom, plaintext secret, backfill, RLS/policy/grant tabel, ataupun mutasi data bisnis saat instalasi. Dua RPC baru hanya EXECUTE `service_role`; anon/authenticated ditolak. CAPTCHA/action/hostname, origin, quota database terpisah submit/track dan keamanan Storage tetap.

Tidak ditemukan/salah/kedaluwarsa/dicabut semuanya menghasilkan 404 NOT_FOUND setelah challenge/quota. Format rusak 400 bukan indikasi keberadaan laporan. Gateway mengirim no-store; kredensial tidak masuk URL, draft, Web Storage, analytics, console, atau Admin. Clipboard/download hanya atas tindakan pengguna; berkas bukti adalah rahasia, dengan nama tetap tanpa kode, tidak memuat judul/alamat/foto/identitas. Tidak ada pemulihan otomatis kredensial setelah tab dibuang; pengguna harus menyimpan bukti.

## Kontrak tambahan, tanpa memutus v1

- POST submit tetap sama. Receipt v1 `tracking_code`, `access_token`, `expires_in_days` dipertahankan untuk Flutter; field tambahan `tracking_credential` diberikan. Web saat fitur diaktifkan hanya menampilkan kode tunggal.
- POST v2: `{action:"track",tracking_credential:"RK2-…",captcha_token:"…"}`. Jangan menyertakan tracking_code/access_token bersamaan.
- POST v1 tetap `{action:"track",tracking_code,access_token,captcha_token}`. Opsi laporan lama ada di Web. Kode referensi saja tidak pernah cukup.
- Respons publik tetap status/created_at/updated_at/history; tanpa reviewer/alasan privat/lampiran/identitas/token.
- Flutter tidak perlu berubah untuk v1. Untuk UX satu kode, tim mobile perlu menyimpan/menampilkan field tambahan dan memakai request v2. Parser receipt mobile yang menolak field tambahan harus disesuaikan oleh tim mobile sebelum rollout; kompatibilitas runtime perangkat belum diuji.
- Token lama 64-hex dapat di-encode menjadi RK2 di perangkat tepercaya, tanpa mutasi backend, hanya bila format valid. Tidak mengonversi massal atau meminta token lewat chat. Tidak menjanjikan format token mobile yang belum diperiksa.

## Satu paket persetujuan operator

Persetujuan sebelumnya untuk perbaikan RLS bukan persetujuan paket ini. Scope baru yang diminta:

1. Jalankan `supabase/releases/dev-single-tracking.PROPOSED.sql`: tambah dua RPC service-only, tanpa mengubah data/RLS/v1.
2. Deploy report-gateway existing dengan kontrak tambahan dan codec Base32.
3. Setelah SQL/deploy sukses, aktifkan flag publik lokal `VITE_REPORT_SINGLE_CODE_ENABLED=true` pada `.env.local`, lalu restart Vite setelah draft aman. Default flag false mempertahankan UI v1 sampai backend siap. Tidak ada secret baru.
4. Acceptance sintetis normal Chrome, satu submit tanpa foto/PII, track 200, review melalui RPC existing dan track status berubah, satu percobaan kredensial valid-format salah 404, satu pencarian v1 existing dengan token pribadi. CAPTCHA baru tiap pencarian, berhenti jika429/hasil submit tidak pasti. Maksimal satu laporan TEST baru, maksimal enam track; laporan baru direview `rejected` dengan alasan TEST sesuai transisi existing untuk cleanup logis (tetap terlihat pemilik token sampai expiry/revocation). Tidak mengubah laporan pengguna nyata. Tidak melakukan tes expiry/revocation atau rotasi token nyata tanpa scope data spesifik.

Setelah disetujui, satu perintah penerapan:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-single-tracking.ps1" -ApprovedSingleTrackingV2
```

Tanpa switch hanya hash preflight lokal. Dengan switch: CLI resmi memastikan project name/ref; psql18 Session Pooler SSL5432, password hanya prompt native (bukan args/file/env/log). Jika SQL gagal/hasil tidak pasti, berhenti. SQL guard sengaja menolak RPC v2 existing: jangan retry buta. Jika SQL sukses tetapi deploy gagal, v1 tetap berfungsi; rekonsiliasi lalu deploy saja, jangan ulang SQL. Manifest paket `docs/qa/stage-e/single-tracking-manifest.json`; jangan gunakan skrip paket E/RLS lama karena hash kode sudah berubah.

Rollback UX: set flag false dan restart setelah draft aman; v1 tetap tersedia. RPC tambahan dapat dibiarkan service-only sampai rollback terpisah disetujui; jangan menonaktifkan RLS atau mencabut kontrol keamanan. Token yang sudah diterbitkan tidak diganti/dihapus otomatis.

## Kredensial terekspos: pencabutan/penggantian

Existing `report_access_tokens.revoked_at` tetap otoritatif untuk v1 dan v2. RPC baru `replace_report_tracking_v2(reference,old_token)` khusus backend/operator service-role: kunci token aktif, revoke token itu dan insert hash pengganti CSPRNG dalam satu transaksi, kembalikan token pengganti sekali, expiry lama dipertahankan. Token lama langsung gagal pada kedua jalur, pengganti dapat di-encode RK2. SQL transaksi gagal tidak meninggalkan rotasi separuh.

Tidak ada action publik untuk rotasi dan tidak ada service-role key di browser. Operator harus memverifikasi kepemilikan/out-of-band sebelum memakai backend tepercaya, menyampaikan pengganti lewat kanal privat, tanpa console/log/SQL Editor results yang dibagikan. Fungsi ini tidak menyelesaikan recovery token hilang: tanpa bukti kepemilikan, jangan menerbitkan pengganti atau membuka status berdasarkan reference. Pencabutan saja menggunakan mekanisme existing dengan exact token hash/report terverifikasi, bukan pencarian luas/semua laporan. Tidak ada rotasi/revoke Cloud yang dijalankan dalam pekerjaan ini.

## Bukti lokal

- `scripts/test-single-tracking.mjs` plus regresi handler/legacy: 21 tes.
- `scripts/test-single-tracking-sql.mjs`: 8 checks PostgreSQL/WASM aktual, fixture lokal; menjalankan fungsi submit/review source existing. Geografi/claims fixture, bukan Auth/Cloud LIVE.
- `scripts/test-single-tracking-browser.mjs`: 5 pemeriksaan Chrome headless komponen lokal. Receipt sintetis, adapter clipboard, HTTPS diblokir; unduhan nyata diperiksa. Fokus/blur diperiksa, bukan seluruh anti-reload E.
- Lint/build/typecheck Edge wajib dicatat hasil aktual setelah perubahan. Acceptance Cloud/CAPTCHA/mobile tetap pending sampai paket disetujui dan diterapkan.
## Hasil deployment operator — 2 November 2026

## Paket foto publik — status deployment

Paket lokal `supabase/releases/dev-public-report-photo-approval.PROPOSED.sql` bersifat additive dan terkontrol: bucket `public-report-evidence` terpisah, tabel approval/revoke dengan RLS FORCE, fungsi approval staf, serta upgrade RPC map untuk mengembalikan path salinan yang disetujui. Paket tidak boleh dijalankan sebagai fitur lengkap sebelum Edge Function `report-publication` melakukan copy server-side dan sanitasi EXIF/GPS dari bucket privat. `report-evidence` tetap privat.

Urutan operator setelah function sanitizer siap:
1. Deploy Edge Function `report-publication` dengan service-role secret hanya pada environment function.
2. Jalankan SQL foto sekali pada `rekansiaga-dev`; jika hasil tidak pasti, berhenti dan jangan mengulang.
3. Set `VITE_PUBLIC_REPORT_PHOTO_APPROVAL_ENABLED=true`, restart Vite, dan hard-refresh Admin.
4. Uji approve/revoke dan marker map, lalu uji anonim bahwa foto asli tidak dapat diakses dan EXIF/GPS tidak ada pada salinan publik.

Rollback: set flag false dan restart; cabut approval; jangan menghapus objek privat atau menonaktifkan RLS. Status saat ini **LOCAL PASS / CLOUD NOT DEPLOYED / LIVE NOT RUN**.

Output operator menunjukkan privacy/compatibility dan RK2 berhasil applied/deployed pada `rekansiaga-dev`; `track_report_v1` RPT predicate sudah tersedia tanpa replay, dan `report-gateway` berhasil deployed. Flag frontend lokal berhasil diaktifkan. Ini belum membuktikan submit/track/review LIVE atau server activation probe.

Catatan UI: helper lama hanya mengubah flag Gateway, sehingga receipt fallback dapat masih menampilkan kode referensi dan token pribadi. Helper kini mengubah kedua flag (`VITE_REPORT_GATEWAY_ENABLED` dan `VITE_REPORT_SINGLE_CODE_ENABLED`). Restart Vite lalu lakukan submit baru; receipt yang sudah tampil tidak berubah retroaktif.
