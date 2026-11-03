<<<<<<< HEAD
# RekanSiaga Web

React / Vite / TypeScript / Tailwind, dengan Supabase bersama tim Flutter.

Main development: **rekansiaga-dev / uiuiouosblyuqgnvfpeh**. Staging hanya security testing. **Phase 4A tetap BLOCKED.**

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Gunakan environment lokal yang sudah ada; template ada di `.env.example`. Jangan menimpa konfigurasi lokal atau memasukkan secret/service_role ke `VITE_*`. Vite dan client menolak project selain dev serta key selain publishable.

- Publik: artikel/detail, panduan/checklist, monitoring/riwayat kejadian, kontak, lokasi bantuan dan peta membaca database dev. Enam sumber publik berhasil diakses, saat pemeriksaan semuanya kosong.
- Admin: editor database untuk artikel, kejadian/pembaruan/lokasi, panduan/checklist, kontak, lokasi bantuan, sumber data, settings, staf/role, aturan/antrean notifikasi; laporan/review dan audit tersedia pada route berotorisasi. Aktivasi write masih menunggu persetujuan serta backend dev yang kompatibel.
- Laporan/tracking: gateway dengan CAPTCHA, kuota, token dan lampiran privat disiapkan. Endpoint Cloud masih HTTP404 pada OPTIONS terakhir, sehingga fitur belum LIVE. Saat gateway belum aktif, form hanya memeriksa input lokal dan menyatakan laporan belum dikirim.
- Sumber utama selalu Supabase. Route studio artikel lokal sudah dihentikan. Donasi tetap SIMULASI. Push dan sinkronisasi BMKG langsung belum diuji/diaktifkan.
- Sinkronisasi: satu timer publik 20 detik saat tab aktif/online, refetch setelah mutasi, saat tab aktif dan koneksi pulih. Ini polling, bukan pembaruan instan atau Supabase Realtime.

```powershell
npm.cmd run test:mvp
node scripts/test-auth.mjs
npm.cmd run typecheck:edge
npm.cmd run lint
npm.cmd run build
npm.cmd run qa:mvp
# GET/OPTIONS dev tanpa penulisan:
npm.cmd run check:dev
# Default no-network; live memerlukan scope + sesi dev existing:
npm.cmd run test:dev-live
```

Kontrak untuk tim Flutter, bukti pengujian, paket SQL/Edge, recovery dan satu cakupan persetujuan operator: [docs/mvp-shared-contract.md](docs/mvp-shared-contract.md). Kode/aplikasi Flutter tidak diubah dalam milestone ini.

# Rekan Siaga

Pemrograman Berbasis Platform.

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## Status Integrasi Mobile

- Kontrak CMS: `WEB-MOBILE-INTEGRATION-CONTRACT.md`
- CMS Artikel dan `/informasi`: implementasi repository Supabase lokal,
  menunggu verifikasi LIVE Cloud.
- Berita Utama: repository publik `public_home_featured_article_v1()` sudah
  ditulis; LIVE saat ini `BLOCKED` karena RPC mengembalikan 404.
- Cover artikel: resolver `public-article-cover` untuk HTTPS legacy dan path
  private `article-media/...`, LIVE resolver terverifikasi dengan 302; render
  signed image masih menunggu penerapan UI/device.
- Sinkronisasi Admin -> Mobile: `NOT_TESTED` sampai kontrak deployment dan
  browser acceptance dapat diverifikasi.
- Konten CMS dummy tidak boleh digunakan sebagai sumber aplikasi normal.
- Pusat Darurat / konten kontak resmi tetap berfungsi dengan fallback lokal saat tabel
  Supabase belum tersedia atau gagal diakses.

### NEXT AGENT - RESUME FROM HERE

Kontrak Mobile/Web aktual sudah tersedia. Lakukan verifikasi LIVE: daftar artikel
published, detail berdasarkan slug, featured fallback, cover private, perubahan
Admin, archive, dan internet resume. Jangan mengubah Supabase Cloud atau workspace
Web secara sepihak.
>>>>>>> origin/main
