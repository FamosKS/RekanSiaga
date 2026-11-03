# Informasi Utama Beranda — kontrak dan aktivasi

Status: **PASS LOCAL / OPERATOR APPROVAL RECEIVED 3 NOV 2026 / CLOUD DEPLOYMENT PENDING / LIVE NOT RUN**. Implementasi memakai tabel dan CMS `articles` existing. Approval mencakup migration additive pada `rekansiaga-dev` saja; tidak mencakup staging, Flutter, rollback, atau perubahan lain. Belum ada artikel duplikat, seed, data mutation, atau Cloud call dari pekerjaan lokal ini.

## Perilaku

- Beranda membaca satu artikel melalui `public_home_featured_article_v1()`. RPC memilih artikel `is_featured=true`; bila belum ada pilihan, mengembalikan artikel published terbaru. Artikel harus berstatus `published` dengan `published_at` terisi. Bila tidak ada artikel terbit, hasilnya kosong dan Web menunjukkan empty state.
- CMS memperlihatkan “Jadikan Informasi Utama” hanya pada baris published. Artikel yang sedang dipilih dapat dibatalkan dari panel Informasi Utama meskipun barisnya tidak berada pada halaman/filter saat ini. Memilih artikel published lain mengganti pilihan.
- Penggantian serialized menggunakan advisory transaction lock; partial unique index menjaga maksimal satu artikel unggulan. Constraint dan trigger menolak/membersihkan status unggulan untuk draft, archived, atau artikel yang tidak lagi memiliki `published_at`.
- `admin_set_featured_article_v1(uuid,timestamptz)` hanya dapat dieksekusi role `information_manager`/`super_admin`, memeriksa versi terbaru, dan menulis audit metadata `SET_FEATURED`. Artikel draft/archived tidak dapat dipilih. Tidak ada UPDATE langsung untuk aksi unggulan dari browser.
- Publikasi artikel dan RLS existing tetap berlaku. `articles_public_read` harus tetap membatasi artikel ke published + published_at; migration guard menghentikan eksekusi bila baseline policy/RLS tidak cocok. Tidak ada policy atau grant tabel baru.
- Setelah aksi admin sukses, React Query membatalkan cache `admin-content/articles` dan `public-content`; refetch berjalan di background/focus/reconnect tanpa full-page reload atau menghapus draf CMS.

## Paket Cloud disetujui, menunggu operator menjalankan runner

File SQL disiapkan dan **belum dijalankan**:

- `supabase/releases/dev-featured-article-preflight.sql` — read-only baseline, hasil boolean/metadata saja.
- `supabase/releases/dev-featured-article.PROPOSED.sql` — transaksi additive kolom/index/check/trigger/RPC; guard exact project ref, role postgres, dan acknowledgement `approve-dev-featured-article-v1`.
- `supabase/releases/dev-featured-article-postflight.sql` — memastikan RLS/policy published-only tetap aktif, constraint/index/RPC/EXECUTE ACL sesuai.
- `supabase/releases/dev-featured-article-rollback.PROPOSED.sql` — tertahan untuk rollback terpisah; guard meminta acknowledgement lain dan menghentikan rollback jika pilihan unggulan masih aktif.
- `scripts/deploy-dev-featured-article.ps1` — project CLI pin ke `rekansiaga-dev`/`uiuiouosblyuqgnvfpeh`, meminta host Session Pooler dari Dashboard, menjalankan preflight, lalu transaksi dan postflight. Password diminta native oleh psql dan tidak masuk parameter/file/log. Tidak deploy Edge Function.

Approval Cloud eksplisit telah diberikan. Runner tetap harus dijalankan dari PowerShell operator interaktif karena memerlukan autentikasi Supabase dan password database pada prompt native. Jalankan satu perintah:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-featured-article.ps1" -ApprovedFeaturedArticle
```

Jika project, policy, schema, preflight, atau hasil commit berbeda/uncertain: STOP, jangan retry. Jalankan postflight hanya setelah migration terkonfirmasi.

Setelah output `Featured-article SQL postflight PASS`, tambahkan `VITE_FEATURED_ARTICLE_ENABLED=true` ke `.env.local` dev dan restart Vite. Ini hanya mengaktifkan UI/query feature; hak tulis artikel tetap memerlukan guard operator existing, sesi staf dan database RBAC.

## Penerimaan minimum setelah aktivasi

1. Login Admin sebagai `information_manager` atau `super_admin`. Pilih satu artikel published; pastikan badge/panel Informasi Utama muncul dan Beranda menampilkan sampul, judul, ringkasan, tautan detail artikel yang sama.
2. Pilih artikel published kedua; pastikan pilihan pertama hilang, satu pilihan tetap ada, audit `SET_FEATURED` tercatat, dan Beranda berganti ke artikel kedua tanpa membuat row baru.
3. Batalkan pilihan; Beranda menggunakan artikel published terbaru. Arsipkan/tarik artikel yang dipilih melalui CMS; pilihan harus otomatis nonaktif dan fallback terbaru muncul.
4. Pastikan draft/archived tidak memiliki tombol pilihan dan tidak muncul di RPC publik. Bila semua artikel tidak published, Beranda menampilkan empty state. Jangan menggunakan artikel/data masyarakat sebagai fixture.
5. Jalankan sebagai role tanpa izin artikel untuk memastikan RPC mutasi ditolak. Catat hanya status berhasil/gagal; jangan ekspor payload isi artikel pribadi.

## Flutter / shared contract

RPC publik additive `public_home_featured_article_v1()` memakai Supabase dev yang sama dan mengembalikan maksimal satu record: `id` UUID, `slug`, `title`, `summary` nullable, `cover_image_path` nullable, `published_at`, `updated_at`, `is_featured`. Tidak ada body penuh, author, data privat atau record baru. `is_featured=false` berarti fallback terbaru. Flutter dapat menautkan detail existing dengan `slug`; sampul `article-media/...` tetap private dan harus dibaca melalui Storage signed URL dengan policy existing untuk sampul artikel published. URL HTTPS lama diperlakukan sesuai kontrak article cover existing. Tidak ada proyek Flutter diubah dan runtime Flutter belum diuji.

## Rollback

Untuk rollback aplikasi, ubah `VITE_FEATURED_ARTICLE_ENABLED=false` lalu restart Vite: Home kembali ke artikel published terbaru yang telah dibaca reader existing; CMS menyembunyikan kontrol. Rollback SQL bukan bagian dari aktivasi dan perlu approval terpisah. SQL rollback hanya dapat dipakai setelah flag off dan semua pilihan unggulan dibatalkan; tidak ada penghapusan artikel.
