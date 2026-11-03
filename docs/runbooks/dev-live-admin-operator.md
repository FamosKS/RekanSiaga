# dev-live-admin-v1 ? paket aktivasi final

Target tunggal: **rekansiaga-dev / uiuiouosblyuqgnvfpeh**. READY berarti paket lokal siap direview/disetujui; deployment dan acceptance live belum dilakukan. Flutter, staging, akun Auth baru, penghapusan data existing, dan privileged key di frontend dikecualikan.

## Status tahap terkini - 30 Oktober 2026

A = **DEPLOYED / SECURITY PASS**, berdasarkan JSON postflight dan screenshot SQL Editor dari operator: 10 function ACL PASS, 22 RLS aktif, evidence bucket dan report boundaries PASS. A tidak dijalankan/diuji ulang oleh agent.

B = **DEPLOYED / MIGRATION PASS**, berdasarkan JSON dan screenshot operator: kelima pemeriksaan struktur/integritas PASS, dua helper PASS, katalog wilayah 0 baris sebelum import. Tidak mengulang audit A/B.

C = **DEPLOYED / PASS**, berdasarkan hasil operator dan `C-psql-verification.json`: 38 provinsi, 514 kabupaten/kota, 7285 kecamatan, 83762 desa/kelurahan, total91599, hierarchy_errors0. Import dan audit A-C tidak diulang. 

D = **DEPLOYED / DISABLED PASS** dari hasil operator dan D-gateway-probe.json (204/403/405/503, active=false, validReportSubmissions0). Tidak mengulang deployment/probe D atau audit A-C. E = **PREPARED**, belum ada izin mutasi Cloud tambahan. Nama lima secrets PASS dari CLI read-only, tanpa nilai ditampilkan/disimpan. Panduan tahap berikutnya `operator-evidence/dev-release-20261029/E-ACTIVATION.md`; satu perintah operator memakai `scripts/activate-dev-report-gateway.ps1 -ApprovedActivationScope`, hanya untuk dua flag dan probe enabled baru, tanpa submit/CRUD otomatis.

## Perubahan final dan bukti

- Guard tidak lagi menyamakan default ACL internal `supabase_admin` dengan ACL efektif RPC milik `postgres`. Tidak ada ALTER/SET ROLE/default-privilege mutation untuk role internal. Hanya defaults `postgres IN SCHEMA public` dipersempit setelah guard persetujuan; global dan schema lain tetap.
- Semua fungsi release memakai object-level REVOKE dari PUBLIC serta grant minimum. Pemeriksaan efektif anon/authenticated/service_role sebelum COMMIT menggagalkan transaksi bila inheritance membuka RPC sensitif. Review tetap memakai RBAC, row lock, transisi dan history/audit atomik; reason NULL atau <=4000 karakter setelah trim.
- Postflight membedakan provider defaults informasional dari syarat keamanan aktual. Rollback mendeteksi drift, mempertahankan batas service-only serta data laporan/audit/evidence/quota/backup dan defaults aman postgres/public. Rollback bukan pengembalian broad grants.
- Migration 002 memerlukan persetujuan sendiri, menolak overwrite objek existing, mempertahankan RLS dan membatasi EXECUTE helper. Seed mempertahankan UUID melalui upsert code tanpa DELETE. Resume mengikuti urutan hierarchy, bukan perbandingan kode leksikal.
- Hasil sebelumnya dipertahankan. Runtime lokal terbaru: 23 PASS termasuk provider defaults tetap identik, inherited-grant abort, postflight regression, migration hierarchy dan rollback. Parser, lint, build diperbarui; warning bundle >500 kB tetap. Tes Auth/REST/browser sintetis lama tidak diulang dan bukan bukti live.
- Backup existing `operator-evidence/rekansiaga-dev-20261028-223213.dump` dan TOC digunakan. Ekstraksi schema public lokal berhasil; ini **bukan** bukti restore penuh atau identitas database saat ini. Jangan membuat ulang backup/audit tanpa alasan perubahan atau bukti gagal. Pastikan hasil restore operator jika sudah ada; bila belum ada, restore backup ke instance terisolasi sebelum mutasi Cloud.
- BRD asli tidak ditemukan di workspace. Kontrak existing dan brief pengguna dipertahankan; tidak mengklaim sign-off BRD penuh atau acceptance Flutter.

Dasar resmi: [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api), [internal roles](https://supabase.com/docs/guides/database/postgres/roles#supabase_admin), [function ACLs](https://supabase.com/docs/guides/database/functions#function-privileges). Defaults internal adalah model izin provider; schema-local revoke tidak menghilangkan global PUBLIC EXECUTE. Karena itu batas wajib diuji pada objek aktual, termasuk inheritance.

## Satu paket persetujuan, cakupan terpisah

Balas hanya cakupan yang disetujui, misalnya **SETUJUI A**. Persetujuan A tidak memberi izin B?E/R. Paket dan SHA256 tercantum dalam `operator-evidence/dev-release-20261029/release-manifest.json`; salinan SQL harus cocok dengan manifest sebelum dijalankan.

| ID | Cakupan konkret | Artefak / syarat selesai |
|---|---|---|
| A | Admin/Security: defaults postgres/public saja, ACL legacy report RPC service-only, assigned-role read, admin RPC/policies, review, audit, private quota dan bucket 5 MiB JPEG/PNG/WebP; view publik hanya site_name/public_notice | `supabase/releases/dev-live-admin.sql`, lalu postflight `security_pass=true`. Operator mereview dua setting tersebut secara privat sebelum view dibuka. |
| B | Migration regions: index dan dua helper hierarchy beserta trigger, tanpa menulis row wilayah | `supabase/migrations/002_regions_integrity.sql`, hanya sesudah A PASS. |
| C | Upsert **91.599** wilayah dari derivative Kemendagri 2025 yang dipin, mempertahankan ID/data existing; tidak DELETE | `regions-national.sql` atau 184 file `regions-batches/batch-001.sql` ? `batch-184.sql` dalam paket operator, hanya sesudah B PASS. Persetujuan mencakup sumber derivative dan atribusi CC BY 4.0. |
| D | Konfigurasi server-only serta deploy Edge Function report-gateway ke dev dengan REPORT_GATEWAY_ENABLED=false; bukan deployment website | Hanya sesudah C postflight PASS dan konfigurasi dev-global/CAPTCHA di bawah lengkap. |
| E | Aktifkan gateway dan flag Web existing; uji satu laporan TEST-LIVE dengan maksimal satu foto privat serta satu artikel TEST-LIVE melalui Web Admin (create/read/update/publish/archive); verifikasi role denial, audit, tracking dan Web Publik | Tidak menghapus data existing. Artikel/laporan contoh tetap tersimpan untuk bukti; tidak ada perubahan Flutter. |
| R | Recovery bersyarat, hanya bila operator secara eksplisit menyetujui rollback A setelah drift check dan gateway/write flags dinonaktifkan | `supabase/releases/dev-live-admin-rollback.sql`. B/C memakai koreksi roll-forward yang direview, tidak DELETE wilayah. |

## Eksekusi SQL Editor berurutan

1. Verifikasi nama/ref Dashboard secara visual. Gunakan hasil preflight existing yang tersedia, bukan memulai audit ulang. Bila hasil sebelumnya tidak tersedia atau menunjukkan drift, jalankan hanya pemeriksaan metadata yang diperlukan; guard SQL bukan bypass kompatibilitas. GUC target adalah attestation operator, bukan autentikasi project.
2. **Sesudah persetujuan A**, buka salinan lengkap SQL A di SQL Editor project dev. Aktifkan hanya dua baris SET LOCAL yang dikomentari (`release_ref` dan `approve-dev-live-admin-v1`), Run seluruh transaksi, lalu jalankan `docs/sql/dev-live-admin-postflight-readonly.sql` dan simpan JSON. Wajib `security_pass=true`. Hentikan saat error/hasil commit tidak pasti; jangan mengulang sebagian statement.
3. **Sesudah persetujuan B**, lakukan hal yang sama pada migration 002 dengan `approve-dev-regions-integrity-v1`. Jangan jalankan migration 001/bootstrap.
4. **Sesudah persetujuan C**, seed dari paket operator. File penuh dapat dipakai dengan koneksi resmi yang menghentikan eksekusi pada error; untuk SQL Editor gunakan batch 001?184 berurutan. Setiap batch memiliki dua SET persetujuan yang dikomentari (`release_ref`, `approve-dev-regions-91599-v1`), BEGIN/COMMIT dan guard sendiri. Aktifkan pada salinan editor setelah approval. Catat batch terakhir committed; jika koneksi putus, verifikasi kode/parent batch tersebut sebelum melanjutkan, jangan menebak. Sesudah batch 184 jalankan `docs/sql/dev-regions-postflight-readonly.sql`.
5. **Sesudah persetujuan D**, gunakan `scripts/deploy-dev-report-gateway.ps1 -ApprovedDeployScope` sesuai D-GATEWAY.md. Secrets diisi privat melalui Dashboard. Skrip menggunakan dev ref tetap, CLI `--use-api` tanpa Docker, gateway disabled dan probe minimum. Tidak menjalankan ulang SQL A-C.
6. **Sesudah persetujuan E**, enable gateway hanya setelah semua gate lulus. Atur flag Web existing di environment operator sesuai kontrak bersama. Lakukan bukti CRUD di bawah. Tidak menjalankan runner artikel yang melakukan cleanup tanpa persetujuan cakupannya sendiri.

Agent tidak memiliki konektor SQL/deployment Supabase resmi pada sesi ini. Setelah cakupan disetujui, jalankan lewat koneksi resmi jika tersedia; jika tidak, salinan SQL Editor di atas adalah jalur eksekusi. Persetujuan tidak sama dengan bukti deployment berhasil.

## Sumber seed yang dikemas

Gunakan kandidat existing, tidak mencari/mengganti dataset baru. Manifest `data/regions/kemendagri-2025-sandeeffendi.manifest.json` merekam commit `6c48646fa6347926aa8d4c00d972e764e3c89ef6`, referensi Kepmendagri 300.2.2-2138 Tahun 2025 serta checksum upstream. Ini derivative publik, bukan publikasi pemerintah independen. Checksum CSV dan NDJSON cache cocok dengan hasil validasi sebelumnya; validasi penuh tidak diulang.

Jumlah: 38 provinsi + 416 kabupaten + 98 kota + 7.285 kecamatan + 83.762 desa/kelurahan = **91.599**. NDJSON SHA256 `40e6b087d9c6059edb191ad18445577e66556683cc48b26d09189a79ebd1cfbf`. SQL baru berbeda dari checksum dry-run lama karena guard per batch; manifest final menyimpan checksum baru. Salinan sumber dan atribusi disertakan agar eksekusi tidak bergantung folder TEMP.

## Gate gateway

Mode dev-global sementara memakai RPC existing: kuota bersama 5 submit dan 30 track per slot tetap600 detik, operasi atomik dan action terpisah. Header IP/HMAC tidak memilih bucket; tidak ada migration tambahan. Verifikasi nilai secara privat, jangan menebak hostname/origin atau memakai wildcard:

| Nama | Syarat |
|---|---|
| SUPABASE_URL | https://uiuiouosblyuqgnvfpeh.supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | runtime server saja, project dev yang sama |
| REPORT_PUBLIC_KEY | publishable key dev |
| REPORT_GATEWAY_ENABLED | false saat D, true hanya E setelah gate PASS |
| REPORT_ALLOWED_ORIGINS | origin aktual yang disetujui operator, exact-match, HTTPS produksi |
| TURNSTILE_SECRET_KEY / TURNSTILE_HOSTNAMES | secret server dan hostname exact dari site yang sama; action submit/track cocok |
| REPORT_RATE_HMAC_KEY | Tidak diperlukan/dibaca pada mode dev-global; existing value boleh tetap tersimpan. |
| REPORT_TRUSTED_IP_HEADER | Tidak diperlukan/dibaca; identitas kuota memakai satu bucket dev tetap. |

Gate E: SQL/security/regions postflight PASS; CAPTCHA invalid hostname/action ditolak; rate denial; bucket privat; anon tidak dapat invoke submit/track/rate RPC langsung atau membaca laporan/token/lampiran; staf tetap memerlukan JWT dan role terverifikasi. Flags frontend tidak menggantikan RLS/RBAC.

## Bukti setelah deployment

Pakai akun dev existing, jangan mengirim password/JWT. Buat satu artikel berlabel TEST-LIVE melalui Web Admin. Rekam ID, slug, updated_at dan publication_status dari respons Supabase; jangan mengklaim sukses dari toast saja. Sebelum publish pastikan draft tidak terlihat pada sesi anonim. Publish lalu buka `/informasi` dan detail slug pada browser tanpa sesi admin; polling existing <=20 detik atau refresh. Ubah judul melalui Admin, buktikan pembacaan Supabase baru dan tampilan publik memakai ID sama. Cek audit INSERT/UPDATE dan penolakan role yang tidak berhak. Akhiri archived, tanpa DELETE. Simpan hasil redacted dan screenshot sebagai bukti live, terpisah dari tes sintetis lama.

Uji satu laporan TEST-LIVE dengan token CAPTCHA baru: receipt setelah commit, review sesuai role, tracking dengan token benar/salah, dan lampiran tanpa public URL. Jangan menaruh token di URL/log/artefak. Simpan ID/status/time/audit saja. Tim Flutter memakai endpoint, ID/slug, field, status dan kontrak error yang sama pada `docs/mvp-shared-contract.md`; aplikasi Flutter tetap menjadi pengujian tim mobile, bukan klaim acceptance agent.

STOP pada error, drift, count/hierarchy mismatch, exposed evidence atau hasil commit tidak pasti. Jangan menonaktifkan RLS, memperluas RPC atau menghapus data agar gate lulus. Live integration baru PASS setelah bukti di atas tersedia.
