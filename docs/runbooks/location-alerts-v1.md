# Peringatan bencana berbasis lokasi v1

**Status 3 November 2026: PASS LOCAL / NEEDS CLOUD APPROVAL / LIVE NOT RUN.** Tidak ada peringatan atau kejadian TEST yang dibuat di Cloud. Frontend alert dan alert writes default OFF.

## Kontrak dan batas keselamatan

Kejadian `disaster_events` yang sudah dipublikasikan dan diverifikasi menjadi konteks wajib alert. Laporan masyarakat, termasuk laporan berstatus `verified`, tidak pernah menjadi alert otomatis. Antrean `notifications` tetap jalur pengiriman terpisah dan tidak membuktikan push delivery.

Proposal additive membuat `disaster_alerts` yang memuat relasi kejadian + wilayah target, urgensi, sumber/URL, status draft/active/revoked, masa berlaku, kondisi, tindakan keselamatan, ETA opsional, rute evakuasi beserta URL dan waktu verifikasinya, versi, serta actor. Hanya alert aktif, waktunya berlaku, event induk published/verified/belum resolved, dan wilayah target yang sama atau ancestor dari kecamatan pilihan yang dikembalikan. Pilihan wilayah saat ini manual pada tingkat kecamatan dan disimpan lokal di browser; tidak ada geolokasi otomatis atau histori perjalanan. Alert lebih luas dari kecamatan yang dipilih tidak cocok dengan target; tidak ada radius arbitrer/geocoding/centroid.

RLS menolak SELECT anon langsung pada tabel alert. Reader SECURITY DEFINER `public_active_disaster_alerts_v1(uuid)` hanya mengembalikan daftar field publik minimal. `information_manager`/`super_admin` mengelola alert melalui form Admin Notifikasi; `report_verifier` tidak mendapat akses. Perubahan diaudit. Penghapusan fisik tidak diberi grant; pencabutan dilakukan dengan status `revoked`. Klasifikasi `official_source` hanya dapat ditetapkan Super Admin dan harus diverifikasi secara substantif dengan penerbit/sumber berwenang sebelum digunakan. Jangan menafsirkan `source_type=official_api` sendiri sebagai otoritas yang sudah terbukti.

ETA hanya tampil jika sumber memasok timestamp estimasi secara eksplisit. Rute evakuasi hanya keluar dari reader jika ada teks rute, sumber HTTPS, dan waktu verifikasi. Jika kosong, UI menyatakan belum terverifikasi dan mengarahkan ke petugas. Tidak ada hitung mundur, prediksi hujan/banjir, data GPS, push message, atau fallback alert buatan aplikasi.

Modal memilih alert yang masih aktif dengan urgensi tertinggi. Deduplikasi dilakukan lokal dengan `alert id + version`; close mencatat versi yang dilihat, update versi baru dapat ditampilkan lagi. Polling hanya ketika tab terlihat melalui React Query/app timer. Tidak ada `window.location.reload()`.

## Paket Cloud terkontrol

Target tunggal: `rekansiaga-dev` / `uiuiouosblyuqgnvfpeh`. Paket SQL additive dan rollback non-destructive:

- `supabase/releases/dev-location-alerts-preflight.sql`
- `supabase/releases/dev-location-alerts.PROPOSED.sql`
- `supabase/releases/dev-location-alerts-postflight.sql`
- `supabase/releases/dev-location-alerts-rollback.sql`
- `scripts/deploy-dev-location-alerts.ps1`

Jangan jalankan sebelum persetujuan eksplisit pada schema alert, public reader RPC, RLS/RBAC, audit, dan penerimaan risiko konten yang ditulis operator. Sesudah approval, di PowerShell interaktif:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-location-alerts.ps1" -ApprovedLocationAlerts
```

Runner memverifikasi project dev, menerima hanya host Session Pooler dari Dashboard, meminta password di prompt asli psql, memeriksa baseline read-only, menjalankan satu transaksi dengan guard dan postflight, serta berhenti jika hasil tak pasti. Jangan memasukkan password ke chat, argumen, file, atau log. Jangan retry SQL bila commit tidak pasti. Tidak ada function deploy, Storage, secret, push provider, migration wilayah, data TEST, staging, atau Flutter yang disentuh.

Rollback operasional paling aman adalah mengembalikan `VITE_LOCATION_ALERTS_ENABLED` dan `VITE_DEV_ALERT_WRITES_ENABLED` ke `false`, kemudian restart Vite. SQL rollback opsional memerlukan persetujuan terpisah dan hanya mencabut akses reader/table baru; data dan audit tidak dihapus. Re-enable memerlukan review grants terlebih dahulu.

## Setelah postflight PASS

Aktifkan lokal:

```dotenv
VITE_LOCATION_ALERTS_ENABLED=true
VITE_DEV_ALERT_WRITES_ENABLED=true
```

Restart Vite. Flag write terikat project URL dev dan hanya resource alert; izin backend tetap memeriksa Supabase Auth/RLS. Acceptance LIVE harus memakai satu kejadian dan alert sintetis yang diberi label TEST pada project dev:

1. Pastikan tidak ada alert → tidak ada auto-popup. Pilihan wilayah kosong → reader tidak dipanggil.
2. Pilih kecamatan manual. Lokasi tersimpan di browser, tidak ada permintaan GPS.
3. Buat alert draft terhubung event TEST yang sudah published/verified; pastikan belum tampil.
4. Aktifkan alert dengan masa berlaku valid; pastikan kecamatan target atau wilayah induk yang mencakup kecamatan pilihan menerima modal. Alert pada kecamatan sibling tidak muncul.
5. Uji klasifikasi, sumber, pembaruan, tindakan, sumber/waktu route, serta ETA kosong dan terisi dari sumber. Tanpa ETA/rute, fallback aman harus terlihat.
6. Ubah severity, pastikan versi naik dan modal dapat muncul ulang; tutup, pastikan tidak berulang pada versi sama. Uji dua alert dan urutan prioritas.
7. Uji expires, revoke, event unpublish/unverify/resolved → reader tidak mengembalikan alert.
8. Uji role report_verifier dan anon: tidak dapat CRUD/read langsung tabel; Super Admin/information_manager mengikuti policy. Periksa audit row untuk create/update/revoke.
9. Pastikan /pemantauan dan /peta tetap memakai feed event yang sama, tidak membuat event/marker ganda. Belum ada konten alert yang disuntikkan ke map tanpa geometri target tervalidasi.
10. Jangan menguji push sebagai delivered; pipeline push tidak termasuk paket.

Non-destruktif cleanup: set alert TEST menjadi `revoked`, jangan DELETE. Draft TEST konten tetap ditandai dan mengikuti mekanisme cleanup logis yang sudah disetujui. Catat hanya status HTTP/count dan ID artefak yang tidak sensitif; jangan salin payload alert/token ke log QA.

## Flutter

Backend DTO yang sama tersedia lewat `public_active_disaster_alerts_v1(p_region_id: selectedDistrictUUID)`. Aplikasi mobile harus meminta pilihan wilayah secara sadar (atau GPS hanya sesudah izin dan setelah tersedia geometri/bukti pencocokan), memanggil reader publik, memfilter expiry, menerapkan prioritas dan dedupe `(id,version)`, refetch saat resume/reconnect, dan berhenti saat background/dispose. Jangan menggunakan service-role, tabel privat, tracking credentials, atau Realtime laporan. Implementasi/acceptance Flutter tidak termasuk perubahan Web ini dan belum diuji.
