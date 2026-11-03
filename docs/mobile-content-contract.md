# Kontrak konten bersama Web/Flutter — integrated-content-v1

## Addendum — peringatan berbasis wilayah (proposal v1, NEEDS CLOUD)

Reader bersama yang direncanakan: `public_active_disaster_alerts_v1(p_region_id UUID)`. Input untuk MVP adalah UUID kecamatan yang dipilih pengguna secara sadar. Backend mengembalikan field publik alert aktif yang target wilayahnya sama/lebih luas pada jalur parent, waktu berlaku sekarang, dan event induknya tetap published, verified, serta belum resolved. Alert di wilayah sibling, expired, revoked/draft, atau event yang tidak layak publik tidak dikembalikan. Jangan mengirim GPS presisi; pencocokan polygon/radius belum tersedia.

DTO: `id,event_id,title,description,disaster_type,severity,condition_summary,region_name,issuer_kind,issuer_name,source_url,starts_at,expires_at,source_updated_at,updated_at,version,estimated_arrival_at,action_guidance,evacuation_route,evacuation_source_url,evacuation_verified_at`. Tidak ada data laporan, token, lampiran, reviewer, koordinat pribadi, atau catatan Admin. Rute dikembalikan hanya saat teks+URL sumber+verified timestamp tersedia. ETA nullable berarti tidak ada estimasi resmi; jangan membuat countdown/prediksi sendiri.

Web dan Flutter harus dedupe alert dengan `(id,version)`, menampilkan hanya selama waktu berlaku dan memprioritaskan `emergency > warning > watch > information`. Tutup menyimpan versi dilihat lokal; versi baru boleh muncul lagi. Fetch pada open/resume/reconnect dan polling ringan saat visible, tanpa full reload. Push delivery dan izin lokasi merupakan integrasi terpisah.

Paket SQL/RLS/audit belum diterapkan ke rekansiaga-dev. Tidak ada Flutter code yang diubah atau runtime diuji. Status Flutter: kontrak siap ditinjau, implementasi menunggu persetujuan dan penerapan Cloud.

## Addendum Informasi Utama Beranda (usulan additive v1)

Web dan Flutter memakai reader `public_home_featured_article_v1()` pada Supabase dev yang sama. DTO paling banyak satu record artikel existing: `id`, `slug`, `title`, `summary?`, `cover_image_path?`, `published_at`, `updated_at`, `is_featured`. Hanya artikel `published` dengan `published_at` terisi yang dapat muncul; tanpa unggulan, reader memilih artikel published terbaru (`is_featured=false`), dan tanpa artikel terbit hasil kosong. Detail tetap memakai slug/record artikel existing, tidak membuat duplikat. Path sampul `article-media/...` tetap private; Flutter harus membuat signed URL memakai Storage policy existing, bukan mengubah bucket menjadi publik. Tambahan API memerlukan migration Cloud yang tertahan approval; adapter dan aplikasi Flutter tidak diubah atau diuji runtime.

**READY sebagai dokumen; paket baru NEEDS CLOUD dan klien mobile NEEDS UPDATE untuk media/feed baru.** Tidak ada kode proyek Flutter yang diubah atau runtime perangkat yang diuji oleh agent. Backend tetap rekansiaga-dev `uiuiouosblyuqgnvfpeh`, bukan database terpisah. Gunakan konfigurasi client/publishable key existing; jangan memakai service-role/secret pada aplikasi.

## Kejadian bukan laporan

`public_reports.status` adalah unverified/under_review/verified/rejected; bukan status kejadian atau izin publikasi. `public_reports.event_id` existing menghubungkan beberapa laporan ke satu `disaster_events.id`. Hanya Admin berizin pengelolaan kejadian yang mengaitkan melalui `admin_link_report_event_v1`; report_verifier tunggal tidak diberi hak CRUD/publikasi kejadian. Verified saja tidak membuat event atau marker otomatis.

Kejadian publik wajib `published_at IS NOT NULL` serta verification_status source_confirmed/staff_verified. event_status unknown/ongoing/resolved. UI Indonesia: Belum diketahui/Berlangsung/Selesai; jangan mengubah enum backend. Sumber manual tidak sama dengan konfirmasi resmi pemerintah; sumber official_api bukan bukti bahwa sinkronisasi otomatis BMKG sudah terpasang.

### Endpoint baru setelah paket disetujui dan diterapkan

`rpc('public_event_feed_v1', params)` untuk anon atau authenticated. Tidak memakai JWT staf untuk reader publik Web; mobile boleh memakai client anon terpisah agar role staf tidak mengubah tampilan publik.

| Parameter | Nilai/default |
|---|---|
| p_region_code | `''` atau kode resmi `13`, `13.71`, dst; mencakup kode itu dan descendants. Tidak memakai nama wilayah sebagai key. |
| p_kind | `''` atau disaster_type aktual dari array kinds; cocok exact, bukan enum rekaan. |
| p_status | `''`, unknown, ongoing, resolved |
| p_search | Judul, substring literal, maksimal120karakter |
| p_sort | updated (default) atau occurred |
| p_page / p_page_size | 1-based;size1..100. page maksimal1juta; invalid input SQL22023. |

Hasil JSON:

- total: semua kejadian yang cocok filter, bukan hanya items.length.
- regions_count: wilayah berbeda terkait event/lokasi publik yang cocok, bukan seluruh katalog nasional.
- kinds: jenis kejadian dari seluruh kejadian publik (untuk pilihan filter).
- updated_at: timestamp perubahan event/sumber/update terbesar atau null jika kosong.
- items: halaman data dengan id,title,description nullable,disaster_type,event_status,verification_status,occurred_at/source_updated_at nullable,updated_at,regions nullable `{name,code}`,data_sources nullable `{name,source_type,official_url}`,event_updates (ringkasan kosong; detail lewat reader existing),event_locations `[{id,label,coordinates,is_primary}]`.

coordinates adalah WKT `POINT(longitude latitude)` atau null dari event_locations yang Admin tetapkan layak publik. Jangan membalik urutan. Pilih primary/first valid untuk satu marker per event; tidak membuat marker per laporan. Event tanpa koordinat tetap tampil dalam daftar, tanpa titik buatan. Untuk multi-lokasi yang disajikan terpisah, labeli sebagai lokasi satu kejadian, jangan menghitungnya menjadi kejadian baru.

Contoh Dart dalam dokumentasi saja (bukan perubahan proyek Flutter):

```dart
final json = await publicClient.rpc('public_event_feed_v1', params: {
  'p_region_code': selectedOfficialRegionCode ?? '',
  'p_kind': selectedDisasterType ?? '',
  'p_status': selectedEventStatus ?? '',
  'p_search': searchTitle,
  'p_sort': 'updated',
  'p_page': page,
  'p_page_size': 20,
});
final feed = Map<String, dynamic>.from(json as Map);
final total = feed['total'] as int;
final items = (feed['items'] as List)
    .map((row) => Map<String, dynamic>.from(row as Map)).toList();
```

Detail legacy tetap: publicClient.from('disaster_events').select(field whitelist + regions/data_sources/event_updates).eq('id',eventId).not('published_at','is',null).inFilter('verification_status',['source_confirmed','staff_verified']). RLS existing tetap. Filter yang sama pada daftar/detail; jangan memakai tabel laporan privat atau auth staf untuk memperluas reader publik.

RPC peta legacy `list_public_verified_report_map()` jika ada dengan DTO6/7 kolom yang dikenal dipertahankan signature/ACL-nya tetapi source berubah ke kejadian terbit. id adalah hash event, bukan report UUID. public_photo_path jika ada null; tidak memublikasikan koordinat/foto privat laporan. Legacy masih maksimal500; tim mobile harus memakai feed berhalaman untuk akses seluruh data. Tidak DROP/menebak signature yang tak dikenal.

## Foto kejadian terpadu (proposal v1; belum diterapkan ke Cloud)

`disaster_events` dan UI Admin saat ini belum mempunyai kolom/path gambar maupun upload kejadian. Paket lokal menambahkan satu foto utama opsional melalui registry `event_media_assets` dan bucket privat `event-media`; tidak menggunakan bucket privat lampiran laporan atau `article-media`. Foto JPEG/PNG/WebP diproses di browser menjadi PNG dan disanitasi ulang oleh Edge Function, maksimal 5 MiB/16 megapiksel; metadata EXIF/GPS dan chunk teks dihapus. SVG ditolak.

Admin information_manager/super_admin memakai `POST /functions/v1/event-media` dengan user JWT, publishable key, dan JSON `{event_id,expected_updated_at,png_base64}`. RPC prepare/commit memeriksa role, versi event dan audit; pergantian menandai aset lama revoked. Cabut publikasi memanggil `revoke_event_image_v1(event_id,expected_updated_at)`. File lama tidak dihapus fisik. Tanpa foto, kejadian tetap bisa disimpan dan dipublikasikan.

Path backend bukan URL: `event-media/events/<event UUID>/<asset UUID>.png`. Reader Web/Flutter memanggil `public_event_images_v1(uuid[])`, lalu meminta signed URL 60 detik dari bucket privat. Hanya current asset milik event dengan `published_at` dan status `source_confirmed`/`staff_verified` yang dikembalikan; unpublish/unverify/revoke menghentikan penerbitan URL baru. URL signed yang telah diterbitkan dapat hidup sampai TTL berakhir. Gambar tersedia pada daftar pemantauan, detail kejadian, serta ringkasan marker peta. Klien sebaiknya cache URL hanya dalam memori selama TTL dan tampilkan fallback bila gagal.

Foto kejadian tidak otomatis berasal dari laporan masyarakat. Admin harus memastikan foto layak dipublikasikan, tidak memperlihatkan wajah/identitas pribadi yang tidak berizin, dan sesuai kejadian. Sanitasi metadata bukan moderasi konten atau face blurring. Tidak ada perubahan kontrak submit/tracking laporan.

**Flutter:** gunakan path media di atas dan API/RPC yang sama; jangan menganggap path sebagai URL HTTPS, jangan gunakan service-role key, dan jangan mengunggah melalui bucket bukti laporan. Backend/API belum dideploy, jadi klien mobile harus menunggu approval/deployment dan acceptance. Proyek Flutter tidak diubah.

## Artikel

Tabel existing `articles`: id,author_id,title,slug,summary nullable,content,cover_image_path nullable,source_url nullable,publication_status draft/published/archived,published_at nullable,created_at,updated_at. Publik wajib published dan published_at bukan null, sorting published_at DESC lalu id ASC. Detail gunakan slug dan filter publikasi yang sama. Draft/archived tidak menjadi konten publik. source_url opsional untuk artikel original Admin; jangan menyamakan source_url dengan cover.

```dart
final rows = await publicClient.from('articles')
    .select('id,title,slug,summary,content,cover_image_path,source_url,published_at,updated_at')
    .eq('publication_status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', ascending: false)
    .order('id', ascending: true)
    .range((page - 1) * 20, page * 20 - 1);
```

Gunakan count exact pada query list untuk pagination sesuai SDK Flutter yang dipakai tim; jangan menganggap satu halaman merupakan seluruh artikel. Kode di atas tidak mengklaim versi SDK Flutter telah diuji.

### Cover image contract

- HTTPS publik legacy: dipertahankan; render hanya URL aman tanpa credential akun. Jangan mengambil private report attachment sebagai sampul.
- Bentuk baru: `article-media/articles/<article UUID>/<asset UUID>.png` pada field **yang sama** cover_image_path. Ini Storage key, bukan URL. Jangan menambahkan `/object/public/`: bucket privat.
- Ambil URL bertanda tangan60detik lewat Storage SDK dengan reader publik. RLS hanya mengizinkan cover current dari artikel published. Tidak ada direct anon Storage INSERT/UPDATE/DELETE. Non-current/draft/archived gagal memperoleh signed URL baru.
- Simpan signed URL hanya di memori/cache singkat, jangan database/analytics/log; perbarui sebelum kedaluwarsa saat layar aktif. Setelah unpublish, URL yang sudah terbit dapat berlaku sisa TTL60detik dan gambar terunduh tidak dapat ditarik kembali.
- Jika tidak ada/gagal/expired, tampilkan fallback dan tetap tampilkan teks artikel. Dimensi responsif; cover PNG baru maksimum1600px,5MiB setelah sanitasi, bukan foto asli pengguna.

```dart
String? coverUrl;
if (coverPath.startsWith('article-media/articles/')) {
  final objectKey = coverPath.substring('article-media/'.length);
  coverUrl = await publicClient.storage.from('article-media')
      .createSignedUrl(objectKey, 60);
} else if (Uri.tryParse(coverPath)?.scheme == 'https') {
  coverUrl = coverPath; // apply the app's safe URL validation too
}
```

Upload Admin baru dilakukan Edge `POST /functions/v1/article-media` dengan user JWT content staff, apikey, JSON `{article_id,expected_updated_at,png_base64}`. Client Admin harus decode/resize/encode PNG, bukan mengirim arbitrary file/SVG. Respons201 `{article:<row lengkap>}`. Role/versi/path/sanitasi diperiksa backend. API ini bukan endpoint upload pelapor dan tidak perlu dipakai aplikasi mobile publik. Jangan memasukkan service-role ke Flutter.

## Sinkronisasi dan kompatibilitas

- Read/refetch saat layar dibuka/resume/reconnect; polling sekitar20detik hanya saat visible/online. Hentikan timer di background/dispose dan dedup request.
- Setelah mutasi Admin berhasil, invalidasi daftar/detail/feed, bukan full reload atau reset formulir. Jika server berubah ketika editor aktif, tampilkan konflik/rekonsiliasi, jangan timpa teks tanpa persetujuan.
- Web memakai satu timer existing dan public-content query keys; tidak menambah Realtime publication pada private reports/tokens/attachments.
- Tim mobile perlu menambahkan DTO feed, official-region-code filters/pagination, resolver Storage private cover dan TTL refresh; jangan mengganti kontrak tracking RK2/v1. Tabel artikel/kejadian/status lama tetap kompatibel; media path baru memerlukan resolver baru, bukan dianggap URL HTTPS.
- Tracking/report Gateway tidak diubah oleh paket ini. Token RK2/legacy tetap rahasia, CAPTCHA/quota tetap kontrak existing; jangan menaruhnya pada URL atau API publik peta.

## Bukti dan pending

Lihat docs/qa/stage-e/integrated-content-{sql,browser}.json dan runbook integrated-content-v1. Tes SQL/WASM dan browser sintetis hanya PASS LOCAL, bukan perangkat Flutter/Cloud. Paket baru belum diterapkan. Setelah approval: operator deploy, acceptance sintetis pada satu backend dev, lalu tim mobile memastikan reader/image/status memakai sumber yang sama. Jangan mengubah staging atau Flutter dari workspace Web ini.
# Public article covers

For the existing private `article-media` bucket, public clients resolve a published article's cover using `GET /functions/v1/public-article-cover?slug={published-slug}`. The endpoint returns a short-lived redirect to the existing Storage object only while the article is published. Flutter can use the same URL contract; no Storage bucket is made public and no Flutter source is changed by this Web workspace. Deployment of this new function to dev is still pending.

