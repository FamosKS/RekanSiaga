# Design System RekanSiaga - Phase 3A

Tanggal: 21 Oktober 2026 (Asia/Jakarta).

## Status sumber dan batasan verifikasi

Seluruh 12 PNG lokal di docs/figma-references sudah dibaca secara visual. Figma plugin belum terpasang/terhubung pada saat pengerjaan dan tidak ada file URL/node ID di dokumentasi yang diperiksa. Implementasi memakai screenshot yang diberikan pengguna; tidak mengklaim inspeksi layer, Auto Layout, variables, styles, font metadata, atau pengukuran asli Figma. Untuk presisi berikutnya diperlukan file/node Figma yang dapat diakses atau ekspor spesifikasi/font/logo resmi.

Warna berstatus **sampel PNG** merupakan nilai piksel yang benar-benar ada dalam file, bukan bukti nama/ID design token asli Figma. Dimensi frame merupakan ukuran file PNG. Spacing/radius/shadow/font/breakpoint berikut adalah **estimasi implementasi** dari pola visual; nilainya dapat disesuaikan ketika metadata asli tersedia.

## Inventaris seluruh referensi yang diperiksa

| Referensi | Dimensi PNG terverifikasi | Pola yang diamati |
| --- | --- | --- |
| [Desktop · Beranda · Modal aksesibilitas.png](<figma-references/Desktop · Beranda · Modal aksesibilitas.png>) | 1440 x 900 | Dialog putih, scrim blur, pilihan ukuran teks, switch, pemisah, CTA. |
| [Desktop · Detail Artikel.png](<figma-references/Desktop · Detail Artikel.png>) | 1440 x 1200 | Card konten, tipografi heading/body, badge kategori, navigasi kembali. |
| [Desktop · Donasi.png](<figma-references/Desktop · Donasi.png>) | 1440 x 1051 | Input lembut, tombol primer, pemisah, pilihan nominal; pembayaran tidak diimplementasikan. |
| [Desktop · Home Page.png](<figma-references/Desktop · Home Page.png>) | 1440 x 1289 | Navbar, hero/card, CTA, badge risiko, kartu berita; angka dan berita contoh tidak disalin. |
| [Desktop · Informasi.png](<figma-references/Desktop · Informasi.png>) | 1440 x 970 | Search, chip kategori, card ringkasan; statistik contoh tidak disalin. |
| [Desktop · Laporan RekanSiaga.png](<figma-references/Desktop · Laporan RekanSiaga.png>) | 1440 x 1078 | Input/textarea, area foto, CTA dan bantuan; operasi backend tetap nonaktif. |
| [Desktop · Panduan Siaga.png](<figma-references/Desktop · Panduan Siaga.png>) | 1440 x 1000 | Latar warm white, card kategori pastel, progress, media card. |
| [Desktop · Pemantauan Bencana.png](<figma-references/Desktop · Pemantauan Bencana.png>) | 1440 x 900 | Card status, ikon, pasangan CTA, semantic tone. |
| [Desktop · Peringatan Bencana.png](<figma-references/Desktop · Peringatan Bencana.png>) | 1440 x 900 | Dialog, badge danger, alert/rute informasi; peringatan aktual tidak disalin. |
| [Desktop · Peta.png](<figma-references/Desktop · Peta.png>) | 1440 x 900 | Shell, filter, panel, switch, tombol primer; tidak mengambil tile atau membuat marker aktual. |
| [Desktop · Pusat Darurat.png](<figma-references/Desktop · Pusat Darurat.png>) | 1440 x 900 | Warm white, card kontak dan aksen emergency; nomor/SOS/GPS contoh tidak disalin. |
| [Desktop · SOS.png](<figma-references/Desktop · SOS.png>) | 1440 x 900 | Dialog/scrim serta aksen emergency; pemancaran lokasi tidak diimplementasikan. |

Tidak ada frame mobile/tablet atau footer yang disertakan. Sampel konten berita, angka risiko, lokasi, nomor darurat, dan status GPS pada prototipe tidak dianggap data aplikasi aktual dan tidak disalin ke UI.

## Audit sebelum implementasi

- Struktur React Router, public/admin layouts dan Supabase client sudah tersedia dan dipertahankan.
- components/ui sebelumnya kosong; tombol dan input ditulis langsung di fitur dengan class CSS.
- PageElements.tsx menggabungkan Panel, StatusBadge dan empty/loading/error states. Saat ini primitive dipisah, sedangkan import existing dipertahankan melalui adapter/re-export sehingga tidak ada implementasi state ganda.
- Warna sebelumnya belum berbasis referensi (#b64b25, #26332f), navbar berupa strip penuh, dan token Tailwind/CSS memiliki nilai terpisah. Sekarang satu sumber semantic variables dipetakan melalui @theme inline.
- Halaman bisnis tidak dibangun ulang; struktur hero, daftar, peta placeholder, dan admin scaffolding tetap untuk Phase 3B.

## Design tokens yang digunakan

Sumber tunggal: src/styles/tokens.css. Tailwind v4: @theme inline memetakan semantic variables sehingga bg-primary, text-ink, border-line, rounded-card, shadow-card, dan font-sans memakai sumber yang sama dengan CSS existing. Breakpoint Tailwind bersifat statis, bukan runtime CSS variable di media query.

### Warna

| Token CSS | Nilai | Dasar |
| --- | --- | --- |
| --primary | #b45309 | Sampel PNG: tombol Donasi dan aksesibilitas |
| --primary-hover | #92400e | Turunan implementasi untuk hover; bukan hasil ekstraksi |
| --background | #f6f5f2 | Sampel PNG Panduan/Pusat Darurat; dipilih sebagai latar warm white bersama |
| --background-cool | #f3f4f6 | Sampel PNG Home/Donasi/Informasi; surface netral sekunder |
| --surface | #ffffff | Sampel PNG kartu/navbar/dialog |
| --surface-subtle | #f9fafb | Sampel PNG input Donasi/Laporan |
| --text | #111827 | Sampel PNG teks utama Donasi/Detail Artikel |
| --muted | #626a78 | Turunan lebih gelap dari sampel #6b7280 agar kontras pada warm white lebih baik |
| --border | #e5e7eb | Sampel PNG border Donasi/Laporan |
| --tint | #fff7ed | Sampel PNG panel bantuan Laporan dan Pemantauan |
| --success / --success-soft | #1b4332 / #e6f4ed | Sampel PNG badge Home/Pemantauan dan kategori Panduan |
| --warning / --warning-soft | #92400e / #fff0d9 | Teks turunan implementasi / sampel PNG kategori Panduan |
| --danger / --danger-soft | #b42318 / #fce8e5 | Teks error turunan implementasi / sampel PNG kategori Panduan |
| --danger-fill / --danger-hover | #c94e3b / #a63b2d | Isi tombol emergency sampel PNG navbar / hover turunan |
| --on-primary / --on-danger | #ffffff | Teks putih pada tombol isi |
| --focus-ring | var(--primary) | Penyempurnaan keyboard focus |
| --overlay | rgb(17 24 39 / .36) | Estimasi scrim dialog, bukan nilai layer Figma |

Contoh bukti sampling tanpa memodifikasi PNG: pada Desktop Donasi, pixel #b45309 muncul 29.511 kali, #111827 1.952 kali, #e5e7eb 15.605 kali, dan #f9fafb 158.174 kali. Pada Panduan, #f6f5f2 muncul 755.093 kali. Jumlah ini adalah histogram file, bukan pengukuran area layer Figma.

Pasangan teks primer/putih, emergency/putih, muted/warm white, muted/putih, danger/danger-soft, dan success/success-soft melewati pemeriksaan rasio kontras minimal 4.5:1 dalam script audit. Ini pemeriksaan matematis pasangan warna tertentu, bukan klaim seluruh aplikasi telah lolos audit aksesibilitas browser.

### Tipografi (estimasi)

Tidak ada font file atau metadata Figma yang tersedia. Menggunakan Segoe UI, system-ui, sans-serif, tanpa mengunduh font dari pihak lain.

| Skala | Nilai |
| --- | --- |
| xs / sm / md | .75rem / .875rem / 1rem |
| lg / xl | 1.125rem / 1.25rem |
| 2xl / 3xl | 1.5rem / 1.75rem |
| Bobot | 400 / 500 / 600 / 700 |
| Line height body / heading | 1.6 / 1.25 |

Pada root default 16px, skala tersebut setara 12/14/16/18/20/24/28px. Ukuran teks aksesibilitas mengubah root menjadi 18 atau 20px. Heading halaman memakai clamp; ukuran hero existing tetap khusus halaman dan belum disamakan keseluruhan dengan frame Home.

### Spacing, radius, shadow, ukuran (estimasi)

- Spacing: --space-1/2/3/4/5/6/8/10/12/16 = .25/.5/.75/1/1.25/1.5/2/2.5/3/4rem (basis 4px pada root 16px).
- Radius: kecil .5rem, kontrol .75rem, card/dialog 1rem, pill 999px.
- Shadow card: 0 6px 14px rgb(17 24 39 / .07); dialog: 0 24px 64px rgb(17 24 39 / .18).
- Container: 75rem (1200px pada root default); dialog: 30rem (480px); kontrol default: 2.75rem (44px).
- Navbar mengambang: margin atas 1.5rem, panel putih, border dan shadow lembut; mendekati posisi visual frame 1440px, bukan hasil pengukuran Auto Layout.
- Transisi: 150ms; skeleton pulse 1.6 detik, dimatikan oleh reduced motion.
- Breakpoint sm/md/lg: 30/50/75rem (480/800/1200px dengan initial font browser 16px). Semua adalah keputusan responsif implementasi karena hanya screenshot desktop tersedia. Media query native memakai nilai statis yang sama.

## Struktur dan kontrak reusable components

```text
src/components/ui/
  Button.tsx          native button, primary/secondary/ghost/danger, sm/md/lg/icon
  buttonStyles.ts     shared styling contract for buttons and internal links
  LinkButton.tsx      React Router Link styled as button
  Card.tsx            div/section/article, padding sm/md/lg
  Badge.tsx           neutral/primary/success/warning/danger
  Field.tsx           shared label, hint, error presentation
  Input.tsx           native input and React 19 ref props
  Textarea.tsx        native resizable textarea
  Select.tsx          native select/options, keyboard behavior from browser
  Dialog.tsx          controlled native dialog, title/description/body/footer
  Alert.tsx           semantic tones, optional heading/icon
  Skeleton.tsx        decorative loading placeholder
  LoadingState.tsx    polite status with spinner
  EmptyState.tsx      title/description and optional action
  ErrorState.tsx      alert with optional actual onRetry callback
src/components/layout/
  Brand.tsx           shared brand lockup
  Navbar.tsx          central public navigation
  PublicHeader.tsx    responsive header and actions
  PublicLayout.tsx    skip link, Outlet, footer, accessibility dialog
  PublicFooter.tsx    brand and links
src/styles/
  tokens.css
  components.css
src/lib/classNames.ts
```

- Semua component memakai named export. Tidak ada library UI/icon tambahan, class-merging dependency, atau import barrel baru yang berpotensi menyebabkan cycle.
- Button default type=button untuk mencegah submit tak sengaja. Set type=submit secara eksplisit pada form. Loading menonaktifkan tombol dan memberi aria-busy. Untuk size=icon, pemanggil wajib memberi aria-label yang jelas.
- LinkButton dipakai hanya untuk navigasi; bukan button bersarang dalam anchor. Disabled action memakai Button, bukan anchor palsu.
- Input/Textarea/Select menerima props native, termasuk ref React 19 untuk React Hook Form. Label dikaitkan ke id; id dibuat dengan useId jika tidak diberikan. Hint/error memiliki id dan aria-describedby, error mengaktifkan aria-invalid. Tetap gunakan label atau aria-label pada pemanggilan tanpa label visual.
- Field memusatkan markup label/hint/error; tiap kontrol mempertahankan elemen native agar keyboard, autofill dan formulir tetap bekerja.
- Dialog memakai showModal/close, label/deskripsi unik, tombol tutup fokus awal, Escape native, serta scrolling untuk konten tinggi. Fokus containment dan return memanfaatkan browser native. Hanya dialog aktif yang boleh memiliki open=true; tidak dirancang untuk nested dialog. Interaksi browser belum diuji otomatis.
- Alert tone danger default role=alert, lainnya status. Status statis Badge selalu menyertakan teks; warna bukan satu-satunya penanda. Skeleton aria-hidden; gunakan LoadingState/label status pada parent untuk pengumuman loading.
- Adapter Panel dan StatusBadge tetap tersedia. LoadingState/EmptyState/ErrorState diekspor ulang dari PageElements agar import lama tidak rusak.
- High contrast memakai override semantic variables; reduced motion mematikan animasi/transisi. Kontrol switch dan radio ukuran teks tetap input native dengan focus indicator.

Contoh penggunaan:

```tsx
import { Button } from './components/ui/Button'
import { Input } from './components/ui/Input'
import { Dialog } from './components/ui/Dialog'

<Input label="Lokasi" id="location" hint="Alamat kejadian" error={errors.location?.message} />
<Button type="submit" loading={isSubmitting}>Periksa draf</Button>
<Dialog open={open} onClose={close} title="Pengaturan">
  {/* Hanya kontrol yang benar-benar tersedia */}
</Dialog>
```

State pada contoh adalah milik pemanggil; tidak ada API backend baru.

## Penerapan pada proyek

Navbar, brand tile, card, badge, field dan kerangka modal mengikuti pola visual yang terlihat pada screenshot. PublicLayout tetap menggunakan Outlet, skip link, dan routing existing. Footer serta shell dengan tinggi minimum adalah penyempurnaan karena footer tidak tampak dalam referensi.

Header mempertahankan Pemantauan dan Panduan Siaga dari kebutuhan existing meskipun frame hanya memperlihatkan lima link. Tombol tetap bernama Pusat Darurat dan hanya membuka halaman; tidak menyatakan mengirim SOS. Logo resmi belum tersedia sebagai aset terpisah: ikon Siren dari Lucide dipakai sebagai substitusi bergaya konsisten, bukan klaim logo resmi sama persis.

Dialog aksesibilitas mengikuti kelompok ukuran teks/switch/divider pada referensi. Native radio mendukung tombol panah. Preferensi existing tersimpan otomatis; CTA jujur bertuliskan Selesai, bukan tombol simpan palsu. Reduced motion dipertahankan; kontrol pembacaan suara dan video isyarat tidak diaktifkan karena belum tersedia.

Loading/Empty/Error, Skeleton, hover, disabled, field validation, fokus keyboard, perbaikan kontras muted, serta navigasi mobile adalah penyempurnaan sistem, bukan hasil ekstraksi frame. Warna error/hover yang diturunkan tidak dianggap nilai resmi Figma.

Form laporan, tracking, pencarian artikel dan filter pemantauan memakai primitive baru tanpa perubahan validasi bisnis atau query. Halaman lain mendapat style token/adapter bersama; seluruh halaman tidak direkonstruksi pada fase ini. Tidak ada data fiktif aktual, font/image baru, API/SDK peta, atau operasi tulis backend.

## Daftar file baru

- `docs/design-system.md`
- `src/components/layout/Brand.tsx`
- `src/components/layout/Navbar.tsx`
- `src/components/ui/Alert.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Dialog.tsx`
- `src/components/ui/EmptyState.tsx`
- `src/components/ui/ErrorState.tsx`
- `src/components/ui/Field.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/LinkButton.tsx`
- `src/components/ui/LoadingState.tsx`
- `src/components/ui/Select.tsx`
- `src/components/ui/Skeleton.tsx`
- `src/components/ui/Textarea.tsx`
- `src/components/ui/buttonStyles.ts`
- `src/lib/classNames.ts`
- `src/styles/components.css`

## Daftar file diubah

- `src/styles/tokens.css`
- `src/index.css`
- `src/components/shared/PageElements.tsx`
- `src/components/layout/PublicHeader.tsx`
- `src/components/layout/PublicFooter.tsx`
- `src/components/layout/PublicLayout.tsx`
- `src/components/accessibility/AccessibilityDialog.tsx`
- `src/features/reports/ReportForm.tsx`
- `src/features/reports/TrackingForm.tsx`
- `src/features/articles/ArticleFilters.tsx`
- `src/features/disasters/MonitoringFilters.tsx`
- `scripts/audit-foundation.mjs`
- `docs/development-status.md`

Supabase client, .env.local, auth service/guards/providers, route tree, package.json, package-lock.json, vite.config.ts, dan semua komponen halaman pages tidak diubah pada fase ini. Tidak ada migration, RLS, database, atau Supabase Auth change. Aset referensi hanya dibaca, tidak diedit.

## Verifikasi aktual

- npm.cmd run lint: LULUS, exit 0.
- npm.cmd run build: LULUS, exit 0, TypeScript strict dan CSS Tailwind v4 terproses. Peringatan bundle utama 587.42 kB (gzip 171.57 kB) masih ada; bukan kegagalan build.
- node scripts/check-foundation.mjs: LULUS, 27 URL dan guard branches.
- node scripts/audit-foundation.mjs: LULUS, 78 modul / 145 import edges, tanpa cycle/broken imports, semua lazy exports dan link tersedia; render 15 URL publik/login dan 11 halaman admin terisolasi; semantic contracts primitive dan pasangan kontras terpilih lulus.
- Script memakai komponen aktual, ReactDOMServer, router memori, dan backend stub. Tidak menguji real Supabase, efek DOM native, atau layout visual.
- Browser automation tidak tersedia dalam sesi ini. Tidak mengklaim pixel-perfect atau validasi visual responsif telah selesai. Tidak ada publikasi.

## Checklist uji manual

1. Jalankan npm.cmd run dev. Bandingkan header, card, warna dan dialog pada viewport 1440px dengan PNG lokal; tandai perbedaan akibat font asli belum tersedia.
2. Uji pada 320/375/768/1200/1440px dan teks besar: tidak boleh ada overflow; seluruh link tetap dapat diakses lewat menu.
3. Tab ke toggle navigasi, Enter untuk membuka, Escape untuk menutup dan kembali fokus ke tombol. NavLink aktif tetap jelas. Uji Back/Forward dan deep link.
4. Buka dialog aksesibilitas. Uji Tab/Shift+Tab, Escape, fokus kembali ke pemicu, radio dengan panah, switch dengan Space, scroll konten pada layar pendek.
5. Uji ukuran teks/kontras/reduced motion, reload langsung /admin/login, dan periksa preferensi tetap berlaku. Voice/video tetap diberi keterangan belum tersedia.
6. Uji error form, hubungan label/input, native Select dan file picker. Draf/track tetap lokal; tidak mengirim laporan atau mengunggah foto. Button loading/disabled tidak boleh memicu action ganda.

## Phase 3B - komponen dan pekerjaan berikutnya

- ArticleCard, FeaturedArticle, ArticleMetadata dan layout detail artikel.
- SearchField berikon, FilterChip/FilterGroup, Pagination untuk daftar yang benar-benar terhubung.
- DisasterSummaryCard, RiskIndicator/Progress, sumber/timestamp; menunggu data terverifikasi, bukan angka rekaan.
- GuideCategoryCard, ChecklistItem/progress dan EducationalMediaCard.
- UploadArea/PhotoPreview, LocationField dan TrackingTimeline setelah kontrak privasi/pengiriman tersedia.
- DonationAmountOption dan SimulationSummary dengan label simulasi yang tetap jelas.
- EmergencyContactCard, MapLayerControl dan NotificationDialog; jangan mengaktifkan pengiriman SOS/peta/notifikasi tanpa integrasi nyata.
- Checkbox/Switch/segmented control reusable jika digunakan di luar dialog; sekarang native input cukup.
- DataTable, TableToolbar dan pola admin actions setelah izin database tersedia.
- Review desain per halaman, logo/font resmi, metadata Figma, mobile/tablet frames, uji browser/focus, dan optimasi bundle berdasarkan profiling.


## Pembaruan Phase 3B (22 Oktober 2026)

Tokens/primitive Phase 3A dipertahankan. public.css memperluas hero dua kolom, grids, metadata, form, map unavailable, radio campaign, checklist dan SOS info sesuai screenshot/controlled extension. Dialog menambah wrapping keyboard first/last setelah temuan browser; radio campaign mendapat selector khusus untuk menghindari overflow.

Seluruh 14 route publik lulus pada 360/390/768/1024/1440px (70 kombinasi); 14 kelompok interaksi lokal lulus. Catatan Phase 3A tentang browser belum diuji adalah status historis; bukti terbaru ada di [ui-implementation-status.md](ui-implementation-status.md). Tidak ada klaim pixel-perfect, font/logo resmi, atau data backend terverifikasi.

Cards/filter/pagination, source/meta, ReportFormFields/PhotoUpload, ChecklistGroup, warning/SOS dan simulasi kini tersedia. DataTable/admin dan integrasi backend tetap di luar fase ini. Tidak ada data bencana/nomor kontak contoh yang ditampilkan sebagai fakta.

## Pembaruan Phase 3C — Admin UI

Admin menggunakan tokens/primitive yang sama: burnt orange, warm white, dark slate, Card, Badge, Input/Select/Textarea, Button, native Dialog dan state UI. AdminPageHeader, DataTable dan ConfirmDialog menambah pola admin tanpa menggandakan primitive. Sidebar memakai NavLink, ikon Lucide dan menu mobile in-flow. Editor menyediakan form, pratinjau dan kembali ke draf; tindakan server disabled. Tidak ada frame Figma admin yang tersedia, sehingga komposisi layout merupakan ekstensi implementasi. Bukti desktop/mobile dan batas verifikasi tersedia pada bagian Phase 3C ui-implementation-status.md.
