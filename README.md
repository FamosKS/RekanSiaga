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
