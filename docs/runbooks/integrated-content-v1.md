# Paket terpadu kejadian, pemantauan/peta, artikel dan media

Checkpoint lokal terbaru (3 November 2026): contract/sanitizer 7/7 PASS, PostgreSQL/WASM 18/18 PASS, lint/build/Edge typecheck PASS. Pengulangan Chrome UI dan browser CORS terhambat timeout Chrome CDP (Page.enable/command timeout); laporan terbaru tidak berisi alur yang lulus. Catatan terdahulu merekam 9 alur UI dan 3 CORS pass, tetapi harness kini belum dapat mengulanginya. Operator melaporkan runner berhasil: privacy/content SQL + postflight lulus dan dua Edge Functions dideploy ke dev. Frontend flag sudah aktif lokal; live browser acceptance masih pending.

Status: **CLOUD DEPLOYED BY OPERATOR / LIVE BROWSER ACCEPTANCE PENDING**, bukan LIVE PASS. Operator menyetujui paket SQL/fungsi dan data sintetis di bawah dalam instruksi 3 November 2026. Target tunggal rekansiaga-dev `uiuiouosblyuqgnvfpeh`. Tidak mengulang Aâ€“D, impor wilayah, audit menyeluruh atau CRUD E lama. Gateway laporan/RK2, Flutter, staging, private report Storage dan secrets tidak diubah/dideploy oleh paket ini.

## Masalah dan keputusan source

`public_reports.event_id` sudah ada. Verified adalah status laporan, bukan otomatis menjadi disaster_events terbit. Halaman pemantauan sebelumnya hanya membaca100 kejadian terbit dan memfilter nama wilayah di browser. Layer peta laporan terpisah dapat memberi kesan laporan verified otomatis menjadi kejadian. CMS mewajibkan URL sumber dan hanya mengedit URL sampul.

Kini Admin berizin membuat/mengelola kejadian existing (`/admin/kejadian`, modul kejadian/update/lokasi), memilih informasi yang layak publikasi, dan mengaitkan beberapa laporan verified melalui RPC ke satu event_id. Tidak ada trigger membuat kejadian per laporan, tidak menyalin alamat/koordinat/foto privat. UI pengaitan dari Detail laporan memerlukan akses review **dan** pengelola kejadian, atau Super Admin; report_verifier tunggal tidak diberi hak publikasi/CRUD kejadian.

Pemantauan dan Leaflet membaca feed kejadian yang sama. Event tanpa koordinat tetap ada di daftar, tanpa marker palsu. Marker memakai satu primary/first valid event_location per kejadian; beberapa laporan tidak menggandakan marker. Filter memakai kode wilayah resmi dan descendants, bukan nama ambigu. Summary/count/distinct region/latest mencakup seluruh hasil filter, pagination server12/100event pada Pemantauan/Peta, sorting stabil dengan ID. Search judul memakai substring literal. Jenis dari katalog nilai kejadian publik, bukan tebakan enum. Event dan lokasi RLS/private report tetap.

Jika RPC legacy `list_public_verified_report_map()` telah ada dengan DTO6/7 kolom yang dikenal, paket mengganti isi proyeksinya dengan lokasi **kejadian publik**, bukan public_reports. Nama/tipe/ACL existing dipertahankan; field foto lama jika ada menjadi null. Tidak DROP signature atau menyalin foto privat. DTO tak dikenal menghentikan transaksi untuk rekonsiliasi. Legacy tetap maksimal500 sebagai kompatibilitas; klien harus memakai feed baru berhalaman untuk seluruh kejadian. Pergantian semantik ini disengaja sesuai instruksi terbaru; jangan menghidupkan kembali publikasi koordinat privat laporan.

Timer publik existing20detik hanya halaman aktif/online, refetch focus/reconnect dan cache invalidation dipakai. Tidak menambah Realtime/private report publication, full reload, atau polling agresif. Lokasi/update menyentuh updated_at parent melalui trigger baru agar timestamp/cursor konsisten. Draft tidak dihidrasi ulang oleh respons server.

## SQL usulan â€” satu transaksi

`supabase/releases/dev-integrated-content.PROPOSED.sql`:

- Guard ref/approval/postgres dan pg_advisory_xact_lock. Runner lebih dahulu menerapkan paket privasi laporan yang sebelumnya disetujui: ENABLE RLS yang masih false dan dua restrictive SELECT policies setelah guard permissive staff policy existing. Setelah transaksi privacy, preflight content read-only mensyaratkan RLS aktif pada reports/articles/events dan menolak feed/bucket/registry yang sudah ada.
- `public_event_feed_v1(text,text,text,text,text,int,int)` whitelist data kejadian terbit + source_confirmed/staff_verified, total/kinds/regions_count/updated_at/items; anon/authenticated EXECUTE, bukan grants tabel baru.
- `admin_link_report_event_v1(uuid,uuid,timestamptz)` pakai FK existing, auth.uid+super_admin/information_manager, verified, lock/version/idempotence, event tidak otomatis terbit. Audit LINK_EVENT metadata event_id saja, generic audit existing tetap.
- Trigger parent timestamp pada event_updates/event_locations; tidak mengubah review/status/history/RK2.
- Bucket **privat** `article-media`, PNG maksimal5MiB; tabel privat FORCE RLS `article_media_assets` (path,article_id,created_by,state,created_at), FK restrict agar artikel beraset tidak terhapus fisik menjadi orphan.
- Storage SELECT hanya cover CURRENT artikel published dengan published_at, atau staf konten; restrictive rules melindungi bucket baru bahkan jika ada permissive policy legacy. Browser INSERT/UPDATE/DELETE pada bucket baru diblokir; service-role Edge yang upload setelah sanitasi. Bucket laporan tidak berubah.
- prepare/commit/abort_article_cover_v1: authenticated staf konten, path server unik, optimistic version, registry owner, verifikasi object exists. Pending per aktor dibatasi10 dengan advisory lock atomik. Commit update cover artikel (audit existing); public/anon/service_role tidak mendapat EXECUTE RPC mutasi. Internal Edge menggunakan JWT staf untuk RPC, service-role hanya Storage upload.
- `article_media_cleanup_candidates_v1()` hanya inventory service-only unreferenced assets >24jam, tidak menghapus otomatis. Referenced cover/draft/arsip dipertahankan. Aborted pre-upload reservation dibersihkan, uncertain upload/commit dipertahankan untuk rekonsiliasi. Tidak menjanjikan worker/cron yang belum disediakan.

## Media & CMS

Gambar dipilih JPEG/PNG/WebP max5MiB/16MP, preview Blob lokal. Browser memeriksa magic, decode Canvas, resize maksimum1600px dan encode PNG. Edge `article-media` memverifikasi user/role, batas body7MiB, signature/CRC PNG/ukuran/resolusi, lalu hanya mempertahankan chunk pixel/header/palette/transparency yang dibolehkan. EXIF/GPS/text/unknown metadata dibuang lagi. Tidak mengklaim antivirus, sensor wajah atau penghapusan steganografi. Admin tetap harus memilih gambar layak publikasi.

Upload dimulai saat Simpan, bukan pemilihan/cancel. Artikel baru dengan gambar dibuat draft dahulu; ID/version checkpoint disimpan di memori/draft agar gagal upload tidak membuat duplikat. Commit cover terkonfirmasi baru dilanjutkan save/publish teks. Jika upload/commit tidak pasti, jangan retry otomatis; cek artikel/registry dahulu. Teks tetap ada. File asli/Blob/credential tidak masuk draft recovery; setelah browser membuang tab pengguna harus memilih ulang file. Existing Storage path/HTTPS lama dipertahankan, source_url opsional/null untuk artikel original. UI archive menggantikan physical delete; preview artikel, ganti/hapus sampul dan progres transfer nyata tersedia.100% transfer berarti masih menunggu server, bukan klaim upload berhasil.

Publik `/informasi` memakai REST pagination6, count exact, sort published_at+id, filter published/non-null timestamp; draft/archived disaring. Home/related membaca6 terbaru, bukan menyembunyikan artikel lama dari halaman daftar. Cover internal diselesaikan dengan Storage signed URL **60detik** berdasarkan RLS; Web refresh aktif20detik. Setelah archive/removal, signing baru ditolak; signed URL yang sudah terbit bisa tetap berlaku maksimal60detik, unduhan yang sudah dimiliki tidak dapat ditarik kembali. Jangan menyimpan signed URL ke database/log. Gambar lama tanpa path yang dapat diresolusi mendapat fallback; kegagalan gambar tidak merusak teks artikel.

## Satu paket operator untuk persetujuan

1. Terapkan SQL di atas, jalankan postflight read-only terfokus (disertakan skrip), lalu deploy `report-publication` untuk hotfix CORS `x-client-info` dan `article-media` untuk upload artikel. Keduanya tetap memeriksa autentikasi/role dalam handler. Tidak deploy `report-gateway`/RK2, tidak mengubah secrets, dan tidak menyalakan bucket publik.
2. Aktifkan `VITE_INTEGRATED_CONTENT_ENABLED=true` setelah berhasil dan restart/rebuild Web setelah draft aman. Default template false. Tidak ada secrets baru; pakai reserved Supabase env pada Edge. Jika RPC belum dipasang, public feed menampilkan error kontrak, bukan angka nol palsu. Jangan salah menganggap frontend source lokal sebagai backend Cloud applied.
3. Acceptance LIVE baru: maksimal1 artikel TEST+2 gambar sintetis (awal dan pengganti; maksimal2 objek PNG/registry media),1 kejadian TEST,1 lokasi publik TEST,1 update TEST; pakai sumber manual existing. Jika belum ada sumber yang boleh dipakai, maksimal1 sumber TEST tambahan. Pengaitan2 laporan TEST verified **yang ditunjuk operator** ke kejadian sama; bila tidak ada, persetujuan mencakup maksimal2 laporan sintetis baru melalui Chrome biasa/CAPTCHA. Jangan memakai laporan pengguna nyata yang pernah ditunjuk read-only. Tidak menjalankan submit/track atau mengubah Gateway/secrets; tracking lama tidak diulang. Ini scope baru, bukan menghabiskan ulang inventaris E9 baris lama.
4. Buktikan event create/publish/status/updateâ†’Pemantauan/Peta sama, filter/count/pagination, link dedup; artikel original/draft+media/publish/update/archive, signing publik ditolak untukdraft/non-current/arsip, role tak berhak ditolak, audit dan tab/draft tetap. Tes lokal tidak menggantikan bukti LIVE; Flutter diuji tim mobile dengan kontrak MD yang diperbarui.
5. Cleanup logis: archive artikel; tarik publikasi event (published_at null), event_status resolved; child lokasi/update ditahan di bawah parent tidak publik; unlink TEST reports jika diperlukan, tidak membuka ulang status final tanpa kontrak yang sah. Report TEST final tetap privat; expiry/revocation existing dipakai hanya jika exact TEST IDs dan operasi pencabutan disetujui. Tidak physical delete/baris user atau objek pengguna nyata. Aset sampul TEST terikat pada artikel arsip tetap privat dan tracked. Cleanup objek takterkait perlu rekonsiliasi inventory dan approval exact path, bukan wildcard/semua bucket.

Perintah deployment paket yang telah disetujui (jalankan dari PowerShell operator agar password hanya masuk pada prompt psql native):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-integrated-content.ps1" -ApprovedIntegratedContent
```

Tanpa switch: verifikasi hash lokal saja, tanpa network. Dengan switch CLI memeriksa project, lalu psql18 memakai Session Pooler5432 SSL. Prompt pertama menjalankan transaksi privacy reports yang sebelumnya disetujui, lalu preflight content read-only. Jika guard privacy gagal, berhenti; jika content baseline gagal, privacy commit mungkin sudah berlaku tetapi content SQL/fungsi tidak dijalankan. Prompt kedua hanya muncul jika preflight lulus, untuk transaksi content. Password tidak disimpan di args/env/log/chat. ON_ERROR_STOP; gagal/uncertain berhenti. Jika SQL commit tetapi salah satu deployment gagal, jangan ulang SQL; rekonsiliasi status SQL/function lalu deploy hanya function yang belum terkonfirmasi. Jangan auto rollback ke RLS nonaktif atau public bucket. Rangkaian ini tidak menjalankan acceptance LIVE otomatis.

Rollback lokal: jangan aktifkan flag upload, kembali ke build frontend sebelumnya bila feed belum tersedia; RPC/private assets baru dapat dipertahankan sampai rollback terpisah direview. Jangan jalankan paket Aâ€“D/E/RK2 lama untuk rollback.

## Bukti lokal dan batasnya

-18 checks PostgreSQL/WASM aktual SQL: guard,126event/pagination,filter,legacy safe projection,link/dedup/audit,unpublish,timestamp,media role/version/RLS/policy/cleanup. Auth/PostGIS/Storage metadata adalah fixture, bukan Supabase LIVE.
-7 tes kontrak/sanitizer PNG aktual PASS: metadata stripping, malformed/oversized/checksum, optional source, legacy path, privilege-sensitive URLs, workflow invariants.
-Riwayat lokal terdahulu merekam 9 alur Chrome synthetic PASS dan 3 CORS PASS. Pengulangan sekarang gagal pada koneksi Chrome CDP sebelum assertion aplikasi; artefak terkini menyimpan status BLOCKED harness. Acceptance browser perlu checklist manual setelah restart lokal atau perbaikan harness.
- Screenshot monitoring desktop/mobile di docs/qa/stage-e/integrated-monitoring-*.png berisi TEST LOCAL, bukan kejadian nyata.
- RK2/report-gateway tidak diubah, bukti regresi existing tetap; tidak mengulang tes yang tak terdampak.
- BRD asli tidak ditemukan pada pencarian filename workspace; kontrak schema dan tiga lampiran pengguna yang identik menjadi scope implementasi. Jangan mengklaim full BRD compliance yang belum ditrace terhadap dokumen asli.

Deployment parser incident (3 Nov 2026): the first operator run completed only the read-only preflight then hit a PowerShell JSON alias parsing error; parser was fixed. The second run exposed `public_reports_rls=false` and stopped before content migration/function deployment. The integrated runner now applies the separately approved report privacy transaction, then preflights content and applies its SQL/functions only if all guards pass.

Baseline diagnosis (3 Nov 2026): operator supplied preflight JSON showing `public_reports_rls=false`; all other listed checks matched expected values. The previously approved RLS/privacy SQL is now included first in the runner; it validates the existing staff policy and adds only the approved restrictive SELECT policies. If that guard or later content preflight fails, stop and report the sanitized error; do not disable RLS or bypass checks.




