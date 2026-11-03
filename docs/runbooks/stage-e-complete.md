# Satu paket Tahap E: Admin -> Supabase dev -> Web Publik

Tanggal paket: 31 Oktober 2026. Target tunggal `uiuiouosblyuqgnvfpeh`, origin `http://localhost:5173`. A-D yang sudah PASS tetap diterima, tidak diulang. Gateway aktif dan submit/visibilitas Admin sebelumnya berasal dari laporan operator; ini bukan bukti seluruh acceptance E.

**2 November 2026: scope LIVE yang disetujui 1 November sudah dijalankan pada sembilan row konten/dependensi TEST.** Seluruh row tersebut sudah ditutup logis dan tidak terbaca anonim, termasuk child. Ada22 audit INSERT/UPDATE yang cocok dengan akun penguji. Login Super Admin sudah tersedia. Jangan buat ulang konten atau mengulang acceptance yang sudah PASS. Journal run: `docs/qa/stage-e/live/TEST-E-20261101-a881d0.json`; hasil terbaru di `docs/qa/stage-e/STATUS.md`. Penghapusan fisik, perubahan keamanan/schema/grants/Flutter/staging tetap dilarang. Persetujuan seluruh paket tetap berlaku; tidak perlu persetujuan Cloud per modul.

**Steering operator2 November:** tidak perlu dua laporan baru; operator memberikan laporan Flutter existing UUID `0f990f12-71d1-4a31-bad0-903eaf8dbb7d`. Dibaca read-only: verified, history unverified->verified, audit UPDATE cocok. Tidak dimutasi atau dibersihkan. CAPTCHA Chrome biasa berhasil menurut operator; Chrome otomasi gagal600010. Ditemukan format RPT berbeda dari RS pada tracking lama serta HEAD anonim kolom privat200/count1, tanpa mengambil body. Perbaikan lokal/tes selesai, Cloud belum diubah. Gunakan [satu paket kompatibilitas/privacy](stage-e-report-compat-privacy.md) untuk scope tambahan policy/fungsi/deploy. Persetujuan CRUD TEST sebelumnya tidak otomatis mencakup perubahan keamanan tersebut; jangan menjalankan ulang create2 laporan/9 konten. Helper dua judul tetap tersedia sebagai alat run awal, tetapi tidak dijalankan untuk mutasi laporan Flutter pilihan.

Dokumen ini menggantikan instruksi E lama yang meminta flag global untuk review. Tidak perlu mengedit UUID setiap laporan. Tidak ada migration, deployment, perubahan secrets, RLS/grants, Flutter atau staging dalam paket ini.

## Cakupan satu persetujuan

Gunakan run label unik `TEST-E-<tanggal>-<jam>`; semua judul/nama/slug/deskripsi baru jelas menyebut TEST/SIMULASI dan bukan kejadian nyata. Sesi staf dev existing diperlukan, tanpa mengirim password/JWT/token CAPTCHA/pelacakan ke chat, file bukti atau log. Super Admin existing dapat menjalankan seluruh alur; jika menguji pemisahan role, gunakan akun existing berizin terkait, tanpa membuat akun/mengubah role. Browser publik harus memakai client anonim existing. Tidak melakukan percobaan tulis ke data milik orang lain untuk menguji penolakan.

| Fitur/data maksimum | Operasi yang dimintakan persetujuan sekaligus | Bukti penerimaan |
|---|---|---|
| Maksimal 2 laporan anonim sintetis, tanpa foto/identitas/koordinat pribadi. Utamakan reuse laporan TEST yang dipilih operator dan tokennya masih tersedia. | Jika perlu submit201; track200 awal; RPC review unverified -> under_review -> rejected pada laporan pertama, dan unverified -> verified pada laporan kedua hanya jika belum ada laporan TEST final yang dapat dilacak. Tracking memakai CAPTCHA baru setelah setiap perubahan; maksimal 10 track dalam paket ini. | UUID yang sama di Admin dan hasil tracking status/history/timestamp. Reviewer/alasan privat tidak tampil di hasil tracking. Jangan ulang submit bila respons tidak pasti. |
| 1 artikel | Create draft -> published -> update judul/isi -> archived. | Draft tidak terlihat anonim; list/detail slug memuat versi terbit yang sama; archive hilang dari list/detail setelah background refetch. |
| 1 kejadian, 1 pembaruan, 1 lokasi kejadian | Create belum publik, edit, verifikasi/published_at untuk publikasi, tambah child ber-FK tepat. Source memakai ID existing. Maks. 1 sumber manual TEST tambahan hanya jika source existing tidak cocok dan operator memilihnya. | List/detail pemantauan dan peta memakai parent yang sama; kejadian belum terverifikasi tidak tampil publik. Sumber TEST tidak mengaku sebagai API resmi. |
| 1 kontak | Create tidak aktif, edit, set is_verified/verified_at dan is_active untuk pembuktian publik, lalu nonaktifkan. | Direktori publik menampilkan versi yang sama hanya ketika aktif dan terverifikasi. Tidak memakai nomor telepon darurat palsu: kosongkan nomor dan gunakan URL `https://example.invalid/TEST-...` dengan nama layanan jelas SIMULASI. |
| 1 panduan + 1 checklist | Create draft, edit/publish, checklist before/during/after existing dengan FK guide yang sama; archive setelah pembuktian. | List/detail panduan memuat konten dan hanya checklist aktif, sesuai urutan/fase. |
| 1 lokasi bantuan | Create unverified, edit, verified untuk pembuktian, lalu unverified kembali. Gunakan alamat teks SIMULASI; koordinat opsional, jangan lokasi rumah/orang. | Direktori/peta hanya menampilkan lokasi terverifikasi dengan UUID yang sama. |
| RBAC/audit | Login akun existing; baca audit metadata untuk UUID paket. Periksa menu/aksi sesuai role existing; tidak mengubah staf, role, pengaturan, sumber sistem, notifikasi atau RLS. | Audit actor/action/entity_id/waktu untuk perubahan yang sama; report status history terjaga. Role tidak berwenang ditolak tanpa perubahan data. |
| Cleanup | Penutupan logis pada UUID yang telah diinventarisasi/disetujui saja, sesuai tabel cleanup di bawah. | Data TEST tidak menjadi informasi publik, audit/history dipertahankan; data pengguna lain tidak diubah. |

Audit/history/quota yang dihasilkan aplikasi secara normal termasuk efek operasi tersebut; tidak dihapus/disetel ulang. Kuota dev-global 5 submit / 30 track per slot 600 detik tetap berlaku. Berhenti pada429 dan tunggu slot berikutnya; jangan memodifikasi header, CAPTCHA, batas atau tabel quota. Tidak ada retry mutasi otomatis.

## Satu tindakan operator setelah paket disetujui

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\prepare-stage-e.ps1" -ApprovedStageEScope
```

Perintah ini **hanya mengubah flag lokal**, bukan menjalankan mutasi Cloud. Tanpa switch, skrip check-only. Ia mengaktifkan `VITE_DEV_CONTENT_WRITES_ENABLED=true` untuk artikel, kejadian/child, kontak, panduan/checklist, lokasi bantuan dan dependensi sumber; `VITE_DEV_REPORT_REVIEW_ENABLED=true` untuk review. Guard global tetap false; staf/pengaturan/notifikasi tidak dibuka. Izin frontend tetap bukan pengganti RPC/RLS/RBAC. Scope data TEST pada paket ini adalah batas tindakan operator, bukan row policy baru pada database.

Restart Vite satu kali dari folder proyek: `npm.cmd run dev -- --host localhost --port 5173 --strictPort`. Selesaikan seluruh baris matriks dalam sesi yang sama, jangan membuat delapan fase atau mengulang A-D. Jika agent menjalankan otomasi LIVE setelah persetujuan, akun staf harus tersedia melalui login UI yang sah; CAPTCHA tetap dikerjakan pengguna, tidak dibypass. Jika sesi tersebut tidak tersedia, operator menjalankan matriks yang sama secara manual. Jangan kirim kredensial ke chat.

Setiap create harus mengembalikan representasi/ID server. Catat hanya run label, entity_type, UUID, slug publik, versi/timestamp, HTTP status, status workflow dan jumlah audit. Gunakan `docs/qa/stage-e/live-results.template.json`; file itu template BLOCKED, bukan bukti sukses. Jangan ekspor HAR, receipt atau raw JSON yang berisi token/PII. Baca ulang di Admin/Supabase dan pada browser publik setelah perubahan; polling konten aktif sekitar20 detik, atau tombol muat ulang data yang tersedia. Jangan memaksa full-page reload untuk menyinkronkan formulir yang sedang diedit.

Tracking sengaja tidak melakukan polling otomatis: tiap permintaan memerlukan CAPTCHA baru dan mengonsumsi quota. Kode/token tetap di memori formulir; sesudah review, selesaikan challenge baru lalu klik Cari status laporan untuk memperoleh200 dan status/history terbaru. Cache hasil lama bukan bukti sinkronisasi.

## Anti reload dan draft, untuk seluruh pola formulir

Root fix: validasi Auth untuk identitas yang sama berjalan di background tanpa reset cache/revision; RoleGuard tidak mengganti Outlet ketika hanya isFetching. Error, revocation, expiry dan pergantian akun tetap fail closed. SDK refresh token tidak dimatikan. Background refetch tetap aktif; tidak ada handler focus/visibility/blur/pageshow yang melakukan location.reload.

Editor artikel, generic resource (kejadian/child, kontak, panduan/checklist, lokasi, settings), staf dan review menyimpan draft dalam memori per akun/modul/record. Menutup editor tidak menghapus draft: gunakan Lanjutkan draf. Membuka record lain meminta konfirmasi. Server refetch tidak menimpa isian atau versi edit. Submit berhasil membersihkan draft terkait; konfirmasi mutasi tidak dipulihkan secara otomatis.

Untuk menghadapi tab yang dibuang browser, klik Draf sementara -> buat frasa minimal12 karakter -> Lindungi draf tab ini. Cadangan **opt-in**, AES-GCM dengan kunci dari PBKDF2, ciphertext di sessionStorage tab ini, masa berlaku8 jam. Kunci/frasa hanya di memori, tidak disimpan bersama ciphertext. Setelah reload/discard/login akun yang sama, Pulihkan draf dengan frasa tersebut. Salah frasa, ciphertext berubah, akun lain atau cadangan kedaluwarsa ditolak. Tidak menyimpan isi formulir sensitif di localStorage; penyimpanan sesi Auth SDK existing terpisah dan tidak dipakai sebagai tempat draft. Logout/pergantian akun/hapus draf menghapus cadangan. Tanpa mengaktifkan pemulihan sebelum tab dibuang, draft memori tidak dapat dipulihkan.

Password, access/refresh token, token pelacakan, CAPTCHA, receipt dan file tidak dicadangkan. Sesudah pemulihan pilih ulang file dan selesaikan CAPTCHA baru; laporan lokasi/wilayah dan input biasa dapat dipulihkan. Halaman tracking mempertahankan token saat berpindah tab biasa, tetapi token perlu dimasukkan ulang sesudah reload/discard. Ini batas pemulihan keamanan, bukan kegagalan sinkronisasi.

Checklist satu kali untuk masing-masing pola editor dan laporan/tracking: isi tanpa submit; gulir halaman/modal; pindah ke tab lain lalu kembali; nilai, DOM form, fokus dan scroll harus tetap; pindah menu melalui link internal dan lanjutkan draft; ubah data server dari sesi lain dan pastikan input lokal tidak tertimpa; validasi dan submit tetap bekerja; restore setelah reload dengan frasa; logout lalu akun lain tidak boleh melihat draft. Hanya refresh manual/reload untuk menguji recovery yang diperbolehkan.

## Cleanup berdasarkan ID, bukan pencarian prefix lalu hapus massal

Inventaris dahulu seluruh TEST yang dimaksud operator. Setiap entry harus berisi entity/table, UUID/key, label/run, status/versi terbaru dan klasifikasi operator bahwa ini data uji. Prefix TEST saja tidak memberi izin menghapus. UUID yang tidak ada dalam daftar yang disetujui tidak disentuh. Jangan mengubah data TEST legacy yang pemilik/tujuannya belum dapat dipastikan.

| Entity terpilih | Mekanisme aplikasi existing |
|---|---|
| Artikel/panduan | Edit UUID dan versi yang sama -> archived; checklist nonaktifkan jika diperlukan. |
| Kejadian | Kosongkan published_at, set resolved jika sesuai; child tetap terkait untuk audit. Persetujuan terbaru melarang penghapusan fisik child. |
| Kontak | is_active=false; jangan mengubah nomor/kontak milik orang lain. |
| Lokasi bantuan | verification_status=unverified; data tidak tampil pada publik. |
| Sumber TEST tambahan | is_active=false, pertahankan relasi/audit; jangan hapus sumber existing yang digunakan data lain. |
| Laporan unverified/under_review | RPC review -> rejected dengan alasan TEST/SIMULASI selesai. Jangan PATCH tabel langsung. |
| Laporan verified/rejected yang sudah final | Kontrak existing melarang buka ulang. Pertahankan privat beserta history/audit dan catat RETAINED_TERMINAL. Token normal kedaluwarsa maksimal90 hari; tidak mengklaim pencabutan langsung. |

Ini cleanup **logis**, bukan bukti penghapusan fisik. Purge laporan final/token/lampiran tidak tersedia melalui aplikasi existing; bila pengguna mensyaratkan purge fisik seluruh TEST legacy, tandai BLOCKED dan perlukan cakupan/prosedur backend yang sah, bukan DELETE langsung/browser, CASCADE, penghapusan audit atau perubahan status ilegal. Paket baru tidak membuat foto untuk menghindari object Storage yatim. Jangan menghapus wilayah, quota, history/audit atau bucket.

Sesudah acceptance/cleanup, set `VITE_DEV_CONTENT_WRITES_ENABLED=false` dan restart jika izin konten hanya untuk uji. Review rutin yang sudah diminta pengguna boleh tetap true; jangan mengaktifkan global writes. Gateway tetap mengikuti keputusan operator existing, tanpa deploy ulang.

## Kontrak Flutter dan batas sign-off

Lihat `docs/stage-e-backend-contract.md`. Kontrak HTTP/UUID/status/nullable/timestamp/geography dan anonymous-vs-staff tidak berubah. Adapter Dart existing untuk artikel/panduan tetap kompatibel pada kontrak yang diuji lokal; Flutter UI/APK/native CAPTCHA dan modul mobile lainnya tidak diuji atau diubah. Jangan menyatakan Flutter runtime/E seluruhnya PASS dari tes Web.

E hanya PASS setelah bukti LIVE seluruh baris, tracking setelah review, audit dan hasil cleanup/retensi disetujui tercatat. HTTP200 daftar kosong hanyalah jalur baca, bukan CRUD PASS. Chrome dengan backend sintetis membuktikan perilaku UI lokal, bukan LIVE Supabase/CAPTCHA/RLS/audit. BRD asli belum tersedia; penerimaan paket memakai kontrak existing, tanpa mengklaim kesesuaian BRD yang tidak dapat diperiksa.
