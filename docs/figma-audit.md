# Figma Audit - Phase 3B

Tanggal: 22 Oktober 2026, Asia/Jakarta.

## Sumber dan audit awal

AGENTS.md, architecture.md, design-system.md, routes.md, semua public pages, PublicLayout/shared primitives, tokens, Tailwind/Vite, router/imports dan package.json diperiksa. figma-audit.md belum ada sebelumnya. Tidak ditemukan BRD, URL/node file Figma, font/logo resmi, atau kontrak status database. Referensi berupa 12 PNG lokal yang telah dibaca pada Phase 3A dan dipakai kembali pada Phase 3B. Tidak ada klaim membaca layer/Auto Layout/variables Figma.

Warna tetap memakai token Phase 3A yang membedakan sampel PNG dan turunan implementasi. Font, ukuran, spacing, radius, shadow dan breakpoint adalah estimasi. BRD tetap dibutuhkan untuk verifikasi bisnis final. Batasan keselamatan eksplisit pengguna dipertahankan: tidak ada angka risiko/korban, berita, nomor kontak, data GPS, status resmi atau dispatch yang direkayasa.

## Pemetaan referensi per halaman

| Route | Referensi | Cakupan |
| --- | --- | --- |
| `/` | [Desktop · Home Page.png](<figma-references/Desktop · Home Page.png>) | Desktop lengkap |
| `/informasi` | [Desktop · Informasi.png](<figma-references/Desktop · Informasi.png>) | Parsial; pagination extension |
| `/informasi/:slug` | [Desktop · Detail Artikel.png](<figma-references/Desktop · Detail Artikel.png>) | Desktop lengkap; metadata/share extension |
| `/pemantauan` | [Desktop · Pemantauan Bencana.png](<figma-references/Desktop · Pemantauan Bencana.png>) | Parsial; filter extension |
| `/pemantauan/:id` | Tidak ada frame khusus | Design-system extension |
| `/peta` | [Desktop · Peta.png](<figma-references/Desktop · Peta.png>) | Desktop lengkap; empty extension |
| `/laporan` | [Desktop · Laporan RekanSiaga.png](<figma-references/Desktop · Laporan RekanSiaga.png>) | Parsial; field/privasi extension |
| `/laporan/lacak` | Tidak ada frame khusus | Design-system extension |
| `/donasi` | [Desktop · Donasi.png](<figma-references/Desktop · Donasi.png>) | Parsial; pembayaran diganti simulasi |
| `/panduan` | [Desktop · Panduan Siaga.png](<figma-references/Desktop · Panduan Siaga.png>) | Desktop lengkap; phase extension |
| `/panduan/:id` | Tidak ada frame khusus | Design-system extension |
| `/darurat` | [Desktop · Pusat Darurat.png](<figma-references/Desktop · Pusat Darurat.png>) | Desktop lengkap; SOS disesuaikan |
| `/403` | Tidak ada frame khusus | Design-system extension |
| `* (404)` | Tidak ada frame khusus | Design-system extension |

## Referensi dialog

- [Desktop · Beranda · Modal aksesibilitas.png](<figma-references/Desktop · Beranda · Modal aksesibilitas.png>)
- [Desktop · Peringatan Bencana.png](<figma-references/Desktop · Peringatan Bencana.png>)
- [Desktop · SOS.png](<figma-references/Desktop · SOS.png>)


- Aksesibilitas mengikuti dialog/radio/switch Phase 3A. Wrapping Tab diperkuat berdasarkan temuan browser. Voice/video yang belum tersedia tidak diaktifkan.
- DisasterWarningDialog menerima judul, kategori, lokasi, source, timestamp, severity opsional dari sumber, CTA detail dan dismiss. Data kosong dibuka hanya atas klik, bukan push atau peringatan fiktif otomatis.
- SOS mengikuti motif lingkaran merah tetapi berlabel akses informasi. Dialog tidak mengirim bantuan/lokasi. Izin GPS hanya diminta setelah klik. Nomor dan status GPS aktif dalam screenshot tidak disalin sebagai fakta.

## Adaptasi yang disengaja

Navbar mengambang, card putih, CTA burnt orange, dark slate, input lembut, kategori pastel dan kerangka dialog mengikuti screenshot. Footer, 403/404, tracking, detail kejadian/panduan, metadata, pagination, empty/loading/error dan mobile layouts merupakan controlled extension dari design system. Logo Lucide sementara bukan klaim logo resmi sama persis.

Foto berita dan angka risiko prototype diganti placeholder jujur. Dataset artikel/kejadian/panduan/kontak kosong; view models frontend bukan schema database. Verifikasi staf dibedakan dari konfirmasi resmi pemerintah. Istilah status tidak ditebak; selector yang memerlukan kontrak dinonaktifkan.

Donasi diadaptasi menjadi skenario latihan dengan penanda eksplisit; tidak ada pembayaran, rekening, data kartu, saldo atau dana terkumpul. Checklist hanya contoh interaksi lokal, bukan panduan keselamatan resmi. GPS tidak otomatis; foto hanya preview perangkat.

## Bukti visual dan keterbatasan

Chrome headless menguji 14 route pada 360/390/768/1024/1440px: 70 kombinasi tanpa overflow. Lima halaman direkam pada 390/1440px; [hasil mesin](qa/phase3b/results.json). Home desktop, report mobile, donation mobile dan guides desktop diperiksa visual langsung. Ini bukan pixel-diff atau klaim pixel-perfect.

Frame mobile/tablet dan metadata font/logo/BRD masih perlu disediakan untuk sign-off final. Viewport Chrome desktop bukan perangkat fisik iOS/Android atau uji pembaca layar.
