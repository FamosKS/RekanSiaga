# Authorization Matrix — Phase 4A

Tanggal: 22 Oktober 2026, Asia/Jakarta.

**Review katalog terbaru:** hasil remote tersedia dan ditinjau di [phase4a-final-report.md](phase4a-final-report.md). Policy roles hanya super_admin (META-01), sehingga kebutuhan SELECT role tiga staf terbatas tidak cocok dengan service Web, dengan asumsi helper sesuai kontrak. Bentuk policy artikel/kejadian/panduan/laporan dan kontak darurat cocok dengan kode role UI; body helper tetap BLOCKED. Notifikasi/pengaturan tidak punya direct grant/policy client meski menu tersedia; sumber data hanya public active-read. Jangan menganggap menu berarti CRUD backend siap. Pernyataan sebelum review di bawah yang menyebut katalog belum ada bersifat historis. Matriks frontend tidak diubah sepihak; usulan SQL belum dieksekusi.

**Finalisasi: BLOCKED untuk kesetaraan frontend/backend/RLS.** Pengguna melaporkan PASS live untuk Super Admin masuk dashboard dan akun biasa dialihkan ke 403. Keduanya USER-REPORTED LIVE BROWSER TEST; tidak membuktikan semua izin tabel ini. Bukti/provenance dan pengujian API yang masih BLOCKED ada di [phase4a-final-report.md](phase4a-final-report.md).

Matriks existing tidak diubah sepihak. Izin kontak-darurat/notifikasi untuk information_manager lebih luas dari modul yang disebut secara eksplisit dalam instruksi finalisasi (berita/artikel/kejadian); perlu keputusan pemilik kebijakan dan pembandingan policy backend. Belum ada bukti perbedaan frontend/backend yang terkonfirmasi karena audit remote belum tersedia. Semua izin di bawah adalah akses UI; operasi tulis bisnis tetap nonaktif. Kontrak bersama Flutter dan nilai status backend masih memerlukan verifikasi.

Pelaksanaan ulang Phase 4A pada tanggal yang sama mempertahankan matriks ini. Pemeriksaan semua pasangan route/role lulus pada test terisolasi; browser dengan respons sintetis membuktikan penolakan profil hilang/nonaktif/tanpa role, akses report_verifier terbatas dan gabungan multi-role. Probe remote hanya membuktikan SELECT anonim ditolak pada ketiga tabel otorisasi (HTTP 401 / 42501). Kesetaraan matriks dengan policy backend dan pengujian live seluruh role tetap BLOCKED; lihat [authentication.md](authentication.md).

Semua izin memerlukan identitas Auth terverifikasi, profil `is_active=true`, dan minimal satu role sah dari backend. Matriks UI ini merupakan keputusan implementasi konservatif berdasarkan nama/tugas role dari instruksi Phase 4A; belum bukti policy/database permission matrix resmi. Backend/RLS harus menegakkan pembatasan data yang sama atau lebih ketat. Tidak ada operasi tulis bisnis yang diaktifkan oleh matriks ini.

| Route / menu | super_admin | information_manager | report_verifier | mitigation_editor |
| --- | --- | --- | --- | --- |
| /admin — dashboard kosong/aksi sesuai izin | Ya | Ya | Ya | Ya |
| /admin/laporan | Ya | Tidak | Ya | Tidak |
| /admin/laporan/:id | Ya | Tidak | Ya | Tidak |
| /admin/kejadian | Ya | Ya | Tidak | Tidak |
| /admin/artikel | Ya | Ya | Tidak | Tidak |
| /admin/panduan | Ya | Tidak | Tidak | Ya |
| /admin/kontak-darurat | Ya | Ya | Tidak | Tidak |
| /admin/staf | Ya | Tidak | Tidak | Tidak |
| /admin/notifikasi | Ya | Ya | Tidak | Tidak |
| /admin/sumber-data | Ya | Tidak | Tidak | Tidak |
| /admin/pengaturan | Ya | Tidak | Tidak | Tidak |
| URL admin yang tidak dikenali | Tidak | Tidak | Tidak | Tidak |

Role berbentuk array. Multi-role memperoleh gabungan izin role sah; tidak ada role default atau auto-promotion setelah login. Kode legacy admin/editor/verifier tidak diterima sebagai pengganti empat kode di atas. Kode tidak dikenal atau hasil relasi parsial membuat verifikasi gagal, bukan fallback super admin.

Sumber tunggal izin UI: `src/features/auth/permissions.ts`. RoleGuard memeriksa URL langsung; AdminSidebar dan quick actions dashboard memakai fungsi yang sama. Navigasi yang disembunyikan bukan mekanisme keamanan server. Ringkasan dashboard masih placeholder tanpa data operasional; layanan statistik berikutnya harus memfilter informasi per izin server.

| Kondisi | Perilaku |
| --- | --- |
| Sesi belum diperiksa | Loading, admin tidak ditampilkan |
| Hanya sesi tersimpan tanpa verified user | Tidak diberi akses |
| Tidak login / sesi kedaluwarsa | /admin/login |
| Auth error / timeout | Error, admin tidak ditampilkan |
| Profil tidak ada atau nonaktif | /403 |
| Assignment kosong | /403 |
| Role tidak cocok dengan halaman | /403 |
| Error query, RLS/grants menolak, relasi/payload tidak valid | Error akses, tanpa cached-success fallback |
| Revalidasi role sedang berjalan | Loading, admin disembunyikan |
| Logout/pergantian akun | Cache role dibatalkan/dihapus; respons lama diabaikan |

Pembacaan role tidak mengubah role. Manajemen staf tetap berupa usulan lokal; pembuatan akun/assignment/pengaktifan staf memerlukan endpoint backend yang mengotorisasi pelaksana dan menulis audit log. Tidak ada perubahan privilege, policy, role database, atau schema yang diterapkan pada fase ini. Lihat [authentication.md](authentication.md) untuk bukti QA, SQL audit dan batas integrasi live.
