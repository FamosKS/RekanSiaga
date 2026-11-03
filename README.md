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
