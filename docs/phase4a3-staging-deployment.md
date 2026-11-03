# Phase 4A.3 — Persiapan deployment permanen staging

## Pembaruan Phase 4A.4 - setelah penerapan manual

Deployment permanen kini **dilaporkan pengguna telah selesai**, counts 26 tabel/26 RLS/6 routines/26 policies/4 roles/2 sources dan validator sukses setelah cast. Status pending pada riwayat berikut tidak menyatakan deployment belum dilakukan lagi. [Laporan baseline](phase4a4-staging-baseline-validation.md) mencatat scope USER-REPORTED, hasil detail belum tersedia, perbaikan cast alternatif dan pemeriksaan READ ONLY berikutnya. **Staging belum READY, Phase 4A BLOCKED.** Jangan jalankan ulang deployment/rollback verification di project nonempty; persetujuan remediation/fixture belum diberikan. Codex tidak mengeksekusi SQL Cloud.

## Review final dan salinan verifikasi rollback

[Satu file verifikasi final](sql/staging/phase4a3-final-deployment-verification.sql) tersedia untuk menguji proposal deployment lengkap, termasuk approval guard, staging guard dan hard checkpoint yang sama, dengan **ROLLBACK sebagai statement terakhir**. Empat SET LOCAL diisi dari acknowledgement/bukti yang sudah direview; dua setting operator (token uji gate dan actual staging project ref) tetap dikomentari sampai operator memverifikasi target. Token pada salinan rollback hanya menguji syarat guard dan bukan persetujuan menjalankan file permanen. Petunjuk singkat ada di header SQL: preflight/inspector fresh → konfirmasi ref/aktifkan dua setting → Run seluruh file → simpan checkpoint 26/26/6/4/2 dan ROLLBACK → fresh preflight/inspector kembali 0 tabel/1 helper dengan seluruh graph preserved. Jika error, rollback sesi yang sama bila masih terbuka dan investigasi sebelum retry.

Review SQL lokal mencakup semua definisi baseline dan pemeriksaan sebelum COMMIT. Tidak ditemukan perubahan baseline yang diperlukan. Ordering nama tabel dibuat eksplisit `COLLATE pg_catalog."C"` agar maksud pembandingan array jelas ([aturan collation PostgreSQL](https://www.postgresql.org/docs/17/collation.html)). Hitungan 106 dibatasi ke contype p/f/u/c: PK26/FK33/UNIQUE13/CHECK34. PostgreSQL 18 juga menyimpan NOT NULL dalam pg_constraint ([katalog PostgreSQL 18](https://www.postgresql.org/docs/18/catalog-pg-constraint.html)); nullability tetap diperiksa dalam manifest kolom, dan full audit tetap menampilkan katalog lengkap. Proposal deployment dan validator lokal diselaraskan; tidak ada definisi database atau guard keamanan dihilangkan. Struktur validator sekarang memakai manifest yang sama dengan penyesuaian pembandingan NOT NULL tersebut.

**PASS review statis, runtime final dry-run masih NOT TESTED.** Tidak tersedia executable PostgreSQL/psql atau parser PostgreSQL lokal; tidak ada SQL remote dijalankan. Kesesuaian sintaks/semantik diperiksa melalui review dan referensi resmi, tetapi eksekusi pada versi Supabase aktual harus dibuktikan operator. Hasil dry-run awal tidak dianggap hasil dry-run final. Lint/build PASS exit 0; warning chunk >500 kB tetap. Staging belum READY sampai deployment permanen dan post-deployment validation lulus; Phase 4A masih memerlukan API/concurrency acceptance.

**SIAP REVIEW LOKAL; DEPLOYMENT MENUNGGU PERSETUJUAN. Staging belum READY; Phase 4A tetap BLOCKED.** Tidak ada SQL Cloud dieksekusi oleh Codex. Panduan ini menggantikan status dry-run pending pada catatan historis, bukan mengubah hasil audit terdahulu.

## Bukti dan batas kesimpulan

[Checkpoint aktual](audits/phase4a3-dry-run-checkpoint.json) telah dibaca lengkap: 26 tabel, 26 RLS aktif, 6 public routines, ensure_rls O/owner postgres/tags sesuai dan helper definition MD5 `846ec2fbff751d24b890656d63c3a9bf`. Ini bukti **di dalam transaksi**, bukan bukti COMMIT, seluruh kontrak atau keamanan API. Pengguna melaporkan setelah ROLLBACK: 0 tabel/0 RLS/1 fungsi. Hasil terakhir tersebut **USER-REPORTED**, belum ada ekspor katalog pasca-rollback terpisah; counts tidak membuktikan seluruh graph/dependencies/ACL tetap sama.

Kesimpulan **BOOTSTRAP DRY-RUN PASS pada cakupan bukti tersebut**. Review perilaku helper/event graph tetap mengacu pada [review final](phase4a3-event-trigger-final-review.md) dan [snapshot inspeksi](audits/phase4a3-existing-event-trigger-review.json), bukan pada fingerprint saja. Helper menangkap error sebagai LOG, sehingga explicit RLS dan assertion tetap diperlukan.

## Paket yang ditinjau

| File | Tujuan |
| --- | --- |
| [Deployment staging](sql/staging/phase4a3-deploy-staging-review.sql) | Self-contained BEGIN → approvals → guard lama → baseline DDL/ACL/seed → hard assertions → checkpoint → COMMIT |
| [Validasi pasca-deployment](sql/staging/phase4a3-post-deployment-validation.sql) | Read-only repeatable snapshot: hard baseline assertions, seluruh manifest struktur/policies/table grants/function checks yang sudah tersedia, seed dan fixture counts |
| [Preflight](sql/staging/phase4a3-preflight.sql) | Inventaris objek sebelum penerapan; expected public relations 0, routine 1 |
| [Inspector event graph](sql/staging/phase4a3-inspect-rls-auto-enable.sql) | Review body/owner/ACL/config/dependencies/fingerprint semua event hooks sebelum dan setelah penerapan |
| [Full security audit](sql/phase4a-security-audit.sql) | Tambahan audit schema/column/effective grants, role membership, default privileges dan katalog lain |

Deployment berasal dari **bootstrap rollback yang diuji**, SHA256 `feec353e0f1f7fe4022d6c82a076ae5063163ca02dfaab759ee9dc190ffae6a8`. Seluruh blok `CREATE SCHEMA` sampai akhir baseline ACL/seed dipertahankan verbatim setelah normalisasi line endings. Seluruh DO staging_guard lama dipertahankan. Tidak mengubah tabel, policy, constraint, index, body fungsi, seed maupun default privileges. Master dan file dry-run/acknowledgement asli tidak diubah; ROLLBACK asli tetap ada. COMMIT hanya berada di **file deployment baru**, sesuai permintaan persiapan permanen ini.

Tambahan terbatas: approval permanen, format project ref yang wajib diisi manusia, kewajiban helper existing, hard checkpoint. Ref belum tersedia dalam bukti lokal; token/ref adalah **attestation operator**, bukan server-side project identification. Bahkan hash cocok tidak membedakan project hasil clone. Dashboard target tetap gate wajib. Tidak memakai current_database=postgres atau konfigurasi React untuk menentukan target.

## Checklist sebelum penerapan — operator, setelah persetujuan pengguna

1. Dapatkan persetujuan eksplisit untuk file deployment final pada **rekansiaga-staging**, catat reviewer, waktu, project reference dan SHA256 versi yang disetujui. Persiapan lokal ini bukan persetujuan deployment. Jangan menggunakan file Master berakhir COMMIT untuk melewati guard.
2. Pastikan Dashboard project name **rekansiaga-staging** dan project reference cocok dengan catatan provisioning staging; pastikan bukan rekansiaga-dev. Ref Supabase yang diharapkan 20 huruf kecil. Jika berbeda, hentikan dan review konfigurasi, jangan longgarkan guard. Jangan membaca/mengubah `.env.local` React atau konfigurasi Flutter.
3. Gunakan fresh trusted SQL Editor session sebagai postgres tanpa temporary objects; maintenance window tanpa concurrent DDL. Simpan preflight dan inspector baru secara privat. Public relation objects harus 0, public routines tepat satu helper reviewed, managed Auth/roles tersedia, replication origin, PostGIS belum ada atau berada di extensions. Hentikan jika unknown objects/dependency/owner/ACL/config berubah.
4. Cocokkan body/semua event hooks dengan review yang disetujui. Helper MD5 `846ec2fbff751d24b890656d63c3a9bf`; seluruh event graph MD5 `7fe832217540802b68d6d56c6ba30f47`. Jangan memperbarui hash otomatis untuk mengatasi drift. Snapshot lama perlu pemeriksaan fresh; perubahan memerlukan review ulang.
5. Simpan baseline metadata/event graph/extension inventory sebelum deploy dan rencana recovery yang disetujui. Tidak melakukan dump/copy data dev atau akun asli. Pastikan project staging terisolasi dan belum digunakan pengguna/aplikasi/jobs operasional. Seed hanya 4 role dan 2 konfigurasi sumber; tidak membuat akun/assignment atau menjalankan integrasi BMKG.
6. Review seluruh SQL baru. Di salinan SQL Editor, tepat setelah BEGIN: aktifkan dua baris setting approval permanen dan project ref aktual. Sisipkan juga **empat SET LOCAL saja** dari [fragment acknowledgement](sql/staging/phase4a3-dry-run-acknowledgement.sql) sebelum DO guard mana pun. Header fragment berlaku untuk dry-run asli; jangan menyalin penutup transaksi lain ke file deployment. Total enam setting harus berada dalam transaksi deployment yang sama. Jangan menjalankan fragment terpisah, jangan memasukkan BEGIN/ROLLBACK validator di tengah deployment.
7. Run **seluruh file** sekali, tanpa seleksi parsial. Ini deployment atomik: seluruh DDL/seed/ACL disimpan bersama hanya bila tidak ada exception dan COMMIT berhasil. Jangan menekan Run ulang karena timeout. SQL Editor harus mengeksekusi satu batch/sesi; jangan membagi transaksi antar-request yang belum dipastikan mempertahankan koneksi.

## Checkpoint sebelum COMMIT

DO checkpoint memakai RAISE EXCEPTION tanpa menelan error; mismatch membatalkan transaksi. Pemeriksaan: exact 26 nama tabel/owner postgres/RLS 26; exact enam function signatures dan owner postgres; 106 constraints tervalidasi; 61 index valid/ready; 26 policies; 6 noninternal row triggers; empat exact role seeds dan dua exact konfigurasi sources aktif; staff/assignment/report/history/token kosong; definition helper dan ensure_rls owner/link/event/O/tags tetap sesuai. Guard awal tetap memeriksa seluruh event graph, dependencies, signature, owner, search_path lewat definition/config hash, managed prerequisites dan public objects kosong.

SELECT checkpoint menyatakan **PRE_COMMIT_ASSERTIONS_PASSED_NOT_PROOF_OF_COMMIT_OR_READY**. Nilai counts pada output adalah expected constants yang didukung assertions sebelumnya, bukan bukti persistensi. Dalam satu batch, COMMIT berjalan otomatis sesudah assertions; tidak ada kesempatan persetujuan interaktif di antara SELECT dan COMMIT. Semua persetujuan harus didapat sebelum Run. Simpan checkpoint **dan hasil sukses COMMIT**, lalu verifikasi pada fresh session. Counts tidak menggantikan pemeriksaan seluruh definisi/predicate/grants.

Transaksi PostgreSQL bersifat all-or-nothing; ROLLBACK dapat membatalkan transaksi yang belum committed. Sesudah COMMIT perlu recovery terpisah. [PostgreSQL transactions](https://www.postgresql.org/docs/17/tutorial-transactions.html). DDL hooks yang direview dapat mengirim NOTIFY schema reload saat COMMIT; LOG/SQL Editor history tidak dibatalkan oleh rollback. Hindari perubahan hooks bersamaan.

## Validasi setelah penerapan — belum dijalankan

1. Fresh session, ulangi verifikasi Dashboard ref. Jalankan **seluruh** `phase4a3-post-deployment-validation.sql` sebagai batch terpisah. File ini BEGIN READ ONLY/REPEATABLE READ dan berakhir ROLLBACK; tidak memanggil RPC mutasi. Simpan seluruh result sets, bukan hanya hasil terakhir.
2. Assertions harus sukses. Pada struktur manifest, seluruh mismatch arrays harus kosong; pastikan 200 columns/defaults, PK26/FK33/UNIQUE13/CHECK34, expected index definitions, final policy commands/roles/predicates dan effective table privileges cocok. Perbedaan pretty-print PostgreSQL harus ditinjau satu per satu, bukan diabaikan. Lima function checks harus tepat satu row/signature masing-masing, body/definer/ACL cocok; owner/search_path/result ditinjau eksplisit. Keenam row triggers harus sesuai definitions dan enabled, bukan hanya jumlah.
3. Role rows tepat 4/4 distinct codes, sumber BMKG official_api URL https://data.bmkg.go.id dan RekanSiaga Admin manual URL NULL, aktif tanpa api_identifier; tidak ada fixture awal. UUID/time seed dinamis tidak dibandingkan dengan dev. Jangan mengekspor data pengguna.
4. Jalankan inspector terpisah, simpan sebagai `docs/audits/phase4a3-staging-post-deployment-event-review.json` (belum tersedia). Seluruh graph, OIDs existing, helper/body/config/ACL, ensure_rls status/owner/tags/link/dependencies harus tetap sama baseline. Jika graph hash berbeda, stop/review, jangan menyatakan preservation PASS dari helper hash saja.
5. Jalankan full security audit read-only terpisah, simpan `docs/audits/phase4a3-staging-post-deployment-security-audit.json` (belum tersedia). Audit schema USAGE/CREATE, column-level grants, PUBLIC/inherited grants, creator default ACL dan platform roles. Validasi table-level grants saja tidak cukup. Jangan overwrite bukti dev.
6. Simpan validasi utama ke `docs/audits/phase4a3-staging-post-deployment-validation.json` dengan project ref/capture/reviewer/SQL checksum. File output belum dibuat sebagai bukti palsu. Review semua hasil sebelum membuka baseline staging untuk tahap fixture. Provisioning Auth/synthetic fixture dan API mutation/concurrency memerlukan persetujuan terpisah pada staging terisolasi.

## Rollback dan recovery

| Situasi | Tindakan aman |
| --- | --- |
| Guard/assertion/DDL gagal sebelum COMMIT | Jangan lanjut statement parsial. ROLLBACK pada sesi sama bila masih terbuka/aborted. Fresh-session preflight/inspector harus kembali 0 public relations/1 helper dan graph/extension baseline sama. Simpan error sanitasi. Perbaikan lokal → review → persetujuan ulang bila SQL berubah. |
| Timeout/disconnect; hasil COMMIT tidak diketahui | Jangan rerun atau cleanup. Fresh-session read-only preflight/inspector: 0/1 berarti belum ada app bootstrap persisten; 26/6 berarti mungkin committed dan wajib full validation. State lain → BLOCKED/investigasi. Pastikan transaksi lama selesai/rollback lewat operator berwenang sebelum retry. |
| COMMIT sukses tetapi validasi gagal | ROLLBACK baru tidak membatalkan COMMIT lama. Isolasi pemakaian staging; simpan bukti. Pilih reviewed forward fix atau restore/recreate project staging disposable melalui prosedur platform yang disetujui. Cek ketersediaan backup/restore dan blast radius terlebih dahulu; jangan menganggap plan layanan menyediakan PITR. Tidak ada destructive down-migration otomatis. |
| Retry setelah kegagalan terkonfirmasi rollback | Hanya setelah fresh checks 0/1, helper/event/extension preserved, penyebab teratasi dan approval masih berlaku untuk versi SQL yang sama. Nonempty project harus ditolak guard; script bukan idempotent deployment updater. |

Tidak DROP SCHEMA public CASCADE, tidak DROP/DISABLE/REPLACE helper/event, tidak reset dev, tidak menjalankan remediation A/B/C1/C2. Recovery yang menghapus project/objek memerlukan review dan persetujuan eksplisit baru. Seed UUID acak dan log eksternal bukan state yang dijamin kembali identik oleh counts saja.

## Expected / actual dan readiness

| Gate | Expected | Actual | Status |
| --- | --- | --- | --- |
| Dry-run checkpoint | 26 tabel/26 RLS/6 routine/event O | JSON aktual sesuai | PASS scoped |
| Setelah dry-run rollback | 0 tabel/0 RLS/1 helper | Laporan pengguna; full preservation export belum tersedia | PASS counts user-reported; full preservation BLOCKED |
| Deployment package | Baseline tidak berubah, approvals/guard/assertions/atomic COMMIT | File lokal disiapkan; belum diuji pada PostgreSQL | READY FOR REVIEW, runtime NOT TESTED |
| Deployment permanen | Persetujuan + sukses COMMIT | Belum diterapkan oleh Codex; bukti belum tersedia | BLOCKED |
| Struktur/policies/grants/seed/event setelah commit | Semua hasil sesuai kontrak dan deltas terjelaskan | Belum tersedia | BLOCKED |
| Authenticated API / session / concurrency | Positive/negative roles, anon, inactive, atomicity dan concurrent verifiers | Belum selesai | BLOCKED |
| Staging READY / Phase 4A COMPLETE | Seluruh gate relevan lolos, known issues ditangani | Tidak terpenuhi | BLOCKED |

Risiko tersisa: salah target meski manual setting valid; drift/concurrent DDL; perbedaan platform/default ACL/role inheritance; helper soft-failure; SQL baru belum dikompilasi/diuji runtime; baseline roles policy super-only (limited role chain known FAIL); review NULL/reason validation masih kurang; future-object privileges belum di-hardening; Edge/rate limit dan API belum dibuktikan. A/B/C1/C2 tetap proposal terpisah dan **tidak diterapkan**. Web/Flutter role contract, tabel/fungsi dan aplikasi tidak diubah. Tidak ada akun atau role assignment otomatis.

## QA lokal

[Review persiapan terstruktur](audits/phase4a3-deployment-preparation-review.json): guard dan blok baseline exact, source checksum, nama tabel, function signatures, manifest counts, transaction boundaries dan local document links PASS pada pemeriksaan offline. `npm.cmd run lint` dan `npm.cmd run build` PASS exit 0; warning chunk >500 kB tetap (585.95 kB / gzip 171.02 kB). Build/lint tidak memvalidasi sintaks atau perilaku PostgreSQL. Tidak ada PostgreSQL parser/compiler atau SQL runtime dijalankan; validasi penerapan tetap gate manusia.
