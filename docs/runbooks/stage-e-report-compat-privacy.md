> Persetujuan tambahan diterima: aktifkan RLS public_reports di dev. Screenshot operator membuktikan RLS false dan reports_staff_read existing. Paket kini memvalidasi policy staf existing, menambah restrictive policies, dan ENABLE ROW LEVEL SECURITY dalam satu transaksi. Enam tes lokal dari kondisi RLS nonaktif PASS. Cloud belum diterapkan; Flutter direct-table belum terverifikasi dan dapat ditolak setelah RLS aktif. Gateway source menggunakan service-role RPC. Tidak menambah grant/policy INSERT.

> **Checkpoint eksekusi 2 November 2026:** manifest paket telah direkonsiliasi ke artefak RK2 aktual. Percobaan dengan scope disetujui lolos hash, tetapi berhenti sebelum SQL karena sesi alat tidak dapat mengisi prompt password native. Tidak ada mutasi Cloud. Jalankan perintah interaktif di bawah sekali; jangan retry bila hasil SQL/deploy tidak pasti.

> Pembaruan 2 November 2026: paket perbaikan Cloud yang dijelaskan telah disetujui melalui instruksi pengguna untuk melanjutkan sisanya. Belum diterapkan; menunggu eksekusi skrip di PowerShell operator untuk prompt password psql. Status hasil pengujian sebelumnya tetap. Keterangan PROPOSED/belum disetujui di bawah merupakan riwayat sebelum persetujuan ini.

# Sisa E: kompatibilitas tracking dan privasi laporan

Status2 November2026: **PROPOSED / NOT APPLIED TO CLOUD**. Scope E sebelumnya hanya mutasi data TEST. Paket ini memerlukan persetujuan tambahan karena mengganti kode fungsi/Gateway dan menambah pembatasan SELECT. Tidak mengulang A-D, migration awal, import atau deploy disabled.

## Bukti masalah dan pekerjaan yang sudah selesai

- Operator memilih laporan Flutter UUID `0f990f12-71d1-4a31-bad0-903eaf8dbb7d`. Pembacaan staf actual menunjukkan verified, history unverified->verified, audit UPDATE cocok dengan akun Admin. Asal Flutter dikonfirmasi operator, bukan observasi perangkat oleh runner. Laporan ini bukan inventaris TEST; tidak dimutasi/dibersihkan.
- Kode existing berformat RPT+10 alnum, sedangkan validator Web/Gateway dan source SQL tracking lama menerima RS+16hex. Token pribadi tersedia menurut operator; nilainya tidak diambil. Patch tetap mensyaratkan64 hex, hash cocok, belum kedaluwarsa dan tidak revoked. Token mobile yang berbeda format tidak boleh ditebak/diubah.
- Client publik yang session-nya NULL mendapatkan HEAD200/count1 pada kolom description/location_description/reviewer UUID tersebut. Tidak ada body/isi pribadi diambil. Ini izin baca yang terlalu luas; E RBAC belum PASS. Penyebab policy/grant aktual tidak diasumsikan atau diaudit ulang secara menyeluruh.
-9 konten/dependensi TEST telah selesai LIVE,22 audit cocok, cleanup logis9/9 tersembunyi anonim. Tidak membuat dua laporan tambahan karena operator meminta memakai integrasi yang telah berjalan.

## Satu paket persetujuan Cloud tambahan

Target tetap rekansiaga-dev `uiuiouosblyuqgnvfpeh` saja:

1. Dua **restrictive SELECT policies** pada public.public_reports: anon tidak membaca row; authenticated hanya super_admin/report_verifier melalui helper role existing. Existing policies/grants/role tidak dihapus/diperluas, RLS tidak dimatikan, service-only tracking dan Admin review tetap existing. SQL berhenti jika RLS existing tidak aktif atau policy bernama sama berbeda. Ini perubahan keamanan terbatas yang harus disetujui, bukan bagian CRUD TEST lama.
2. Ubah hanya predicate format kode pada public.track_report_v1(text,text) agar menerima RS16hex dan RPT10alnum. Signature, response minimal, hash/token64hex, expiry/revocation, owner, ACL dan SECURITY DEFINER dipertahankan. Guard berhenti bila body/batas service-only berbeda. Tidak menerbitkan token baru/backfill data.
3. Deploy kode report-gateway existing dengan parser track yang kompatibel. CAPTCHA/action/hostname, origin, dev-global durable quota terpisah submit/track, attachment/Storage Auth dan secrets tetap. Tidak mengubah REPORT_GATEWAY_ENABLED atau key/secret.
4. Verifikasi read-only: HEAD anon pada UUID pilihan tidak mengembalikan row privat; Admin masih membaca verified/history/audit; operator tracking existing RPT dengan token pribadinya dan CAPTCHA baru dari Chrome biasa, target HTTP200 verified. Tidak membuka ulang/mengubah status laporan final. Maksimal10 tracking paket tetap berlaku; berhenti pada429.

Jumlah perubahan data bisnis:0. Tidak menyentuh staging, Flutter, data pengguna lain, grants, audit/history atau object Storage. Dua SELECT policies membatasi baca, tidak menambah hak tulis.

## Perintah setelah scope di atas disetujui

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\apply-dev-report-compat.ps1" -ApprovedReportCompatibilityAndPrivacy
```

Tanpa switch, skrip hanya memeriksa hash lokal, network0. Dengan switch, CLI resmi mengidentifikasi nama+ref dev, psql18 memakai Session Pooler5432/SSL dan user fixed postgres.uiuiouosblyuqgnvfpeh. Host saja diminta; password hanya pada prompt native psql, tidak lewat argument/env/repository/log. CLI memakai sesi login resmi existing; tidak memasang Docker/server.

SQL privacy commit lebih dahulu. Jika langkah berikutnya gagal/commit tidak pasti, berhenti dan rekonsiliasi; pembatasan privacy yang committed dipertahankan. Tidak retry otomatis dan tidak otomatis menghapus policy. Rollback format tersedia di dev-e-tracking-rpt-rollback.PROPOSED.sql dengan acknowledgement rollback; ia tidak mencabut pembatasan privacy atau menghapus data. Rollback Gateway/parser tidak diperlukan untuk RS karena parser tambahan tetap menerima RS.

Hash paket baru ada di docs/qa/stage-e/live/report-compat-proposed-manifest.json. Manifest D lama tidak diedit. Skrip D disabled lama bukan perintah hotfix ini; paket baru mempertahankan Gateway aktif.

## Hasil lokal actual, bukan LIVE acceptance

-6 tes format Web/Gateway dan quota/CAPTCHA/token/privacy handler PASS;9 regresi handler yang terdampak PASS.
-7 PostgreSQL/WASM tracking checks PASS: reproduce bug, guard scope, owner/ACL, kedua format, token salah/expired/revoked, anon/auth direct RPC denial, idempotence dan rollback.
-6 PostgreSQL/WASM privacy checks PASS: reproduce overly broad read fixture, guard approval, anon/non-staff denied, Super Admin/verifier/service preserved, rows/grants/RLS unchanged, idempotence. Auth helper pada tes adalah fixture, bukan bukti JWT Cloud.
-Grammar SQL/PLpgSQL, syntax PowerShell, lint/build Web dan typecheck Edge PASS. Embedded runtime/parser sudah tersedia; tidak menginstal server/dependency baru.
-Cloud SQL/deploy dan tracking RPT belum dijalankan. Tidak mengklaim E PASS.

## Satu checklist operator akhir

Setujui paket di atas lalu jalankan satu perintah; simpan password/token secara pribadi. Setelah applied, gunakan tracking RPT existing dengan token64hex dan CAPTCHA Chrome biasa, laporkan HTTP/status/history saja. Jangan kirim receipt/HAR/raw responses. Konfirmasi tab-switch draft yang foreground-nya belum teramati otomasi memakai checklist E existing; jangan mengulang CRUD yang sudah PASS. Setelah draft aman dan uji selesai, tutup flag konten lokal VITE_DEV_CONTENT_WRITES_ENABLED=false dan restart Vite; review rutin tetap, global writes false. Runtime Flutter adalah tanggung jawab tim mobile; backend JSON baru tetap kompatibel dengan canonical receipt dan legacy format yang teramati.
