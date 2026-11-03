# Phase 4A.3 — Staging database preparation

## Pembaruan Phase 4A.4 - deployment manual dilaporkan selesai

Pengguna melaporkan staging sudah di-COMMIT manual dengan counts 26/26/6/26/4/2 dan validator sukses setelah cast roles. [Laporan baseline terkini](phase4a4-staging-baseline-validation.md) menggantikan status deployment pending pada riwayat berikut. Cast utama sudah tersimpan; validator alternatif diperbaiki lokal. Hasil detail pasca-deployment belum diekspor di workspace; **staging belum READY / Phase 4A BLOCKED**. Langkah berikut hanya full manifest/full audit/event inspector dan supplemental READ ONLY; jangan rerun bootstrap/verification/deployment pada target yang sudah berisi 26 tabel. Tidak ada SQL remote dijalankan Codex.

## Pembaruan terkini ? dry-run PASS, persiapan deployment permanen

[Checkpoint aktual](audits/phase4a3-dry-run-checkpoint.json): 26 tabel, 26 RLS aktif, 6 routines dan ensure_rls O; PASS untuk checkpoint di dalam transaksi. Pengguna melaporkan setelah ROLLBACK 0 tabel/0 RLS/1 fungsi; belum ada ekspor pasca-rollback terpisah yang membuktikan seluruh graph/ACL preserved. Bukti counts tidak sama dengan seluruh kontrak/database security PASS.

[Panduan deployment permanen](phase4a3-staging-deployment.md) memuat checklist persetujuan/identitas target, dependency, hard checkpoint sebelum COMMIT, rollback/recovery dan matriks expected/actual. [SQL deployment baru](sql/staging/phase4a3-deploy-staging-review.sql) mempertahankan guard serta seluruh baseline DDL/ACL/seed; menambah approval/ref dan hard assertions. [Validator pasca-deployment](sql/staging/phase4a3-post-deployment-validation.sql) read-only, mencakup manifest struktur/policies/grants dan seed; full audit serta inspector tetap wajib terpisah.

**Staging belum READY; deployment belum dijalankan oleh Codex.** Persetujuan penerapan masih diperlukan. A/B/C1/C2, Master, dry-run ROLLBACK, acknowledgement, Web/Flutter config dan remote database tidak diubah. SQL deployment baru berakhir COMMIT atas permintaan persiapan permanen; tidak mengganti penutup file dry-run. Bagian berikut adalah riwayat review sebelumnya: status dry-run pending/larangan membuat COMMIT pada scope lama digantikan pembaruan ini, bukan hasil runtime persisten/API.

**Status Master: NEEDS ADJUSTMENT / READY FOR REVIEW, bukan verified deployment. Status staging: BLOCKED verifikasi struktur dan keamanan.** Project Cloud `rekansiaga-staging` dilaporkan dibuat pengguna; Codex tidak mengakses atau menjalankan SQL pada staging maupun dev. Tidak memakai Docker Desktop, tidak menjalankan remediation A/B/C1/C2, dan tidak mengubah `.env.local` atau client/config Supabase Web.

## Final event-trigger review — evidence diterima

Seluruh [JSON inspeksi aktual](audits/phase4a3-existing-event-trigger-review.json) telah dibaca, termasuk tujuh event function definitions. [Review final lengkap](phase4a3-event-trigger-final-review.md) menyimpulkan **PASS statis untuk controlled rollback-only dry-run**, bukan staging READY. Candidate signature/event owner/link/deps/config kini terkonfirmasi: postgres definer, event_trigger tanpa input, search_path pg_catalog, ensure_rls ddl_command_end/O dan origin mode. Quoted `%I.%I` dynamic SQL hanya ENABLE RLS tabel public dari metadata DDL. Error helper ditelan sebagai LOG, jadi explicit ENABLE dan checkpoint 26/26 tetap wajib.

Candidate definition MD5 `846ec2fbff751d24b890656d63c3a9bf`, event graph MD5 `7fe832217540802b68d6d56c6ba30f47`: delapan definition rows (candidate + tujuh event entries) dan graph digest konsisten dengan JSON; ekspresi guard/inspector sama. Hash bukan alasan PASS perilaku dan bukan bukti snapshot Cloud masih fresh. Global untrusted-session/temp-type/DDL privilege hardening belum dibuktikan; fresh trusted SQL Editor session tanpa temporary objects menjadi batas dry-run.

[Acknowledgement fragment](sql/staging/phase4a3-dry-run-acknowledgement.sql) berisi empat SET LOCAL siap disisipkan tepat setelah BEGIN pada bootstrap penuh, setelah operator memverifikasi project ref rekansiaga-staging. Jangan menjalankannya terpisah. Pertahankan ROLLBACK; tidak ada COMMIT baru atau setting remote yang dijalankan Codex. Default base bootstrap tetap fail-closed bila acknowledgement tidak diberikan atau graph berubah.

Instruksi exact dan residual risks ada pada review final: full bootstrap + fragment → Run seluruh query → checkpoint 26 tables/26 RLS/6 routines → ROLLBACK → preflight/inspector kembali 0 relations/1 helper dengan hash/graph/ACL/event preserved. NOTIFY schema reload hanya terkirim saat commit, tetapi RAISE LOG/SQL Editor audit dapat tetap ada. Dry-run actual/preservation, persistent structure/security/API masih **BLOCKED/NOT TESTED**. Helper/event, remediation A/B/C1/C2, dev/staging database, Docker dan konfigurasi Web tidak diubah.

## Riwayat revisi guard — existing rls_auto_enable dan ensure_rls

Bagian ini merekam prasyarat saat body belum diterima. Status behavior/metadata yang dahulu BLOCKED telah ditutup **hanya untuk static review scoped dry-run** di atas; hasil runtime/staging/API belum berubah menjadi PASS.

Pengguna telah menjalankan preflight dan melaporkan 0 public application tables, 0 public relation objects, serta satu `public.rls_auto_enable()` owner postgres/SECURITY DEFINER dengan event trigger ensure_rls, ddl_command_end, enabled O, extension dependency NULL. [Catatan provenance](audits/phase4a3-staging-preflight-user-report.json) adalah **USER-REPORTED**, bukan hasil SQL yang dijalankan Codex. Laporan ini menutup asumsi bahwa fresh staging selalu memiliki nol public routines; belum menutup review perilaku fungsi.

Guard lama menolak seluruh pg_proc public dan karena itu menolak kandidat ini sebelum bootstrap. Revisi tidak menghapus/disable/replace fungsi atau trigger dan tidak memberi whitelist nama saja. Public relations tetap wajib nol. Jalur nol public routine tetap seperti semula (dan menolak ensure_rls yang tidak mempunyai kandidat cocok). Bila satu public routine ada, seluruh syarat berikut wajib:

- Tepat satu routine public total: nama rls_auto_enable, prokind f, nol input, bukan variadic/OUT/set-returning, return type **pg_catalog.event_trigger**, owner postgres dan SECURITY DEFINER. Overload, procedure, aggregate, atau fungsi aplikasi existing lain tetap menolak bootstrap.
- ensure_rls menunjuk **OID fungsi yang sama**, owner event postgres, event ddl_command_end, status tepat O dan hanya satu event trigger memanggil kandidat itu. Return type dan event owner ini belum dikonfirmasi oleh bukti chat; query baru harus membuktikannya. session_replication_role harus origin; jangan mengubah mode untuk melewati trigger.
- Normal pg_depend dari event trigger ke fungsi harus ada. Fungsi/event tidak boleh menjadi member/auto-dependent extension (`e`/`x`) bila bertentangan dengan baseline standalone yang dilaporkan. Dependencies lain ditampilkan dan ikut review; dependency NULL **bukan bukti aman atau bukti provenance Supabase**.
- Definition fingerprint dan fingerprint **seluruh event graph** harus sama dengan snapshot yang benar-benar direview. Graph mencakup event owners/tags/status, function owners/ACL/config/definition fingerprints dan outgoing dependencies. Hook DDL lain di luar public tidak diabaikan hanya karena namanya berbeda.
- Operator harus menyatakan behavior review selesai dan memasukkan dua hash hasil review melalui SET LOCAL yang masih dikomentari pada bootstrap. Nilai tidak diisi otomatis; menyalin hash dari output tanpa memahami body **tidak memenuhi acceptance**. Setting ini adalah attestation operator + drift check, bukan authorization boundary terhadap operator yang bisa mengedit SQL.

Query baru [phase4a3-inspect-rls-auto-enable.sql](sql/staging/phase4a3-inspect-rls-auto-enable.sql) hanya membaca katalog/definisi dan tidak memanggil helper, tidak membuat table probe dan tidak menjalankan DDL. Ia mengembalikan code, exact signature/return type, ACL/search_path/config, caller linkage, incoming/outgoing dependencies, extension membership dan definisi semua fungsi event graph. Periksa definisi secara privat sebelum membagikan output; jangan mengirim embedded secrets.

**Review body saat ini BLOCKED.** Nama rls_auto_enable, owner postgres, SECURITY DEFINER dan O tidak membuktikan bahwa fungsi hanya mengaktifkan RLS dengan aman. Tinjau schema filtering, object qualification, quoted identifiers/format(%I), SQL dinamis, recursion/nested ddl_command_end, perubahan grants/owner/RLS, external side effects dan pemanggilan helper lain. Body yang menggunakan nama objek caller tanpa quoting, mematikan RLS, membuka grant atau menyentuh schema tak disetujui harus menghentikan dry-run. Jika body memanggil fungsi lain/dynamic SQL, telusuri logikanya; katalog dependency tidak menangkap seluruh referensi runtime. Search_path/ACL tidak diubah untuk membuat guard lolos.

Status `O` berarti trigger aktif pada mode origin/local, bukan mode replica; evttags membatasi command tags jika non-NULL. Graph harus ditinjau utuh karena DDL bootstrap dapat menjalankan trigger existing sebelum manual ENABLE RLS source dijalankan. [PostgreSQL event trigger catalog](https://www.postgresql.org/docs/17/catalog-pg-event-trigger.html). Signature/return metadata berasal dari [pg_proc](https://www.postgresql.org/docs/17/catalog-pg-proc.html); extension membership/linkage diperiksa melalui [pg_depend](https://www.postgresql.org/docs/17/catalog-pg-depend.html).

### Prasyarat PASS dan BLOCKED terkini

| Pemeriksaan | Evidence / hasil | Status |
| --- | --- | --- |
| Public relation count 0; public function count 1 | Laporan pengguna pada staging | PASS user-reported pada scope count saja |
| Nama helper, owner postgres, definer, event ddl_command_end / O | Laporan pengguna | PASS user-reported metadata parsial |
| Exact signature/return event_trigger; event owner/OID linkage/tags/dependencies/ACL | Belum ada JSON katalog lengkap | BLOCKED |
| Body dan perilaku helper/event graph | Belum diberikan; tidak disimpulkan aman dari nama | BLOCKED |
| Revision guard/query lokal | Siap review; tidak ada remote execution | Pemeriksaan lokal dicatat di QA; bukan PASS PostgreSQL |
| Bootstrap dry-run/rollback preservation | Belum diuji setelah revisi | NOT TESTED |
| Staging siap digunakan / authenticated API | Struktur persisten dan keamanan belum diverifikasi | BLOCKED |

### Prosedur dry-run SQL Editor setelah body review

1. Verifikasi Dashboard **rekansiaga-staging + project reference** dan maintenance window tanpa concurrent DDL. current_database=postgres bukan bukti target. Jangan memakai project dev atau membaca/mengubah .env.local.
2. Jalankan inspector read-only setelah memastikan target. Ekspor seluruh JSON privat sebagai `docs/audits/phase4a3-staging-event-trigger-review.json`; file itu **belum tersedia** saat revisi ini. Review function/event definitions, return type, event owner/tags, ACL/search_path dan dependency graph. Bila belum lengkap atau perilaku belum disetujui, **stop di sini**; jangan mengisi approval token hanya agar bootstrap berjalan.
3. Setelah review memadai, catat definition_md5 kandidat dan event_graph_md5 dari inspector. Hash tidak dipin lintas project/version/snapshot; gunakan hasil review staging yang sama. Di salinan query SQL Editor yang direview, aktifkan hanya empat baris SET LOCAL yang sudah dikomentari: target acknowledgement, behavior approval, definition hash dan graph hash. Pertahankan BEGIN dan ROLLBACK. Jangan mengubah owner/type/dep checks untuk melewati mismatch.
4. Jalankan seluruh dry-run script dalam satu koneksi/transaksi. Guard tidak memanggil helper, tetapi DDL sesudah guard dapat memicu ensure_rls: inilah alasan review body wajib sebelum dry-run. Jika error, jalankan ROLLBACK pada sesi yang sama, simpan error sanitasi; jangan disable/drop event trigger atau membuat pengganti.
5. Checkpoint metadata sebelum ROLLBACK otomatis menyajikan table count, RLS count, public routine count dan existing helper/event metadata. Expected pada kandidat ini: 26 app tables, RLS true 26/26, 6 public routines (5 app + existing helper), ensure_rls tetap O/link sama dan definition hash sama. Tidak ada app mutation RPC dipanggil oleh checkpoint.
6. Bila ingin full structure/seed/inspector checkpoint **sebelum rollback**, perlu review salinan dry-run terlebih dahulu: sisipkan hanya SELECT/WITH bagian validasi sebelum ROLLBACK terakhir. Jangan sisipkan BEGIN/ROLLBACK dari file read-only lain di dalam transaksi berjalan: BEGIN nested bukan transaksi independen dan ROLLBACK akan membatalkan DDL. Jangan menjalankan API lintas koneksi atas DDL uncommitted.
7. Setelah ROLLBACK selesai, jalankan kembali preflight + inspector sebagai query baru. Expected kembali 0 public relation objects dan satu helper existing, dengan definition hash/event graph hash/owner/OID/tags/ACL sama baseline. Jangan mengharapkan 26 tabel bertahan setelah rollback. Jika output editor hanya menampilkan result terakhir, gunakan result-set SELECT yang tersedia atau dry-run split pada koneksi yang dipastikan sama; **jangan menambah COMMIT untuk melihat hasil**.
8. Bila graph/hash berubah, bootstrap gagal, helper/event hilang atau ACL berubah, status tetap BLOCKED; investigasi tanpa menyentuh dev/platform objects. SQL rollback tidak membuktikan ketiadaan side effect eksternal bila body memanggil network/extension fungsi luar transaksi—review sebelum DDL tetap wajib.

### Validasi setelah bootstrap dan acceptance criteria

Dry-run lulus harus mencakup metadata in-transaction yang sesuai baseline serta bukti rollback mengembalikan state awal dan helper/event tetap utuh. Itu **bukan deployment persisten dan bukan staging READY**. Setelah persistent bootstrap yang kelak disetujui manusia (di luar revisi ini), jalankan structure/full-audit/seed validation dan inspector dalam transaksi read-only terpisah. Lima fungsi aplikasi harus dibedakan dari helper event existing; 6 row triggers aplikasi juga berbeda dari global ensure_rls. Hitung jangan mencampurkan kedua tipe trigger.

Acceptance guard: semua metadata exact-candidate checks terpenuhi; body/event graph reviewed; tidak ada public object unknown atau new function overload; semua hash cocok fresh; origin mode; helper tidak dimodifikasi. Acceptance baseline staging: seluruh kontrak 26 tabel/200 kolom/constraints/index/policy/grants tervalidasi, source-intended ACL dipertahankan, helper/event preserved, dan setiap perbedaan dari dev dijelaskan. Authenticated API/role/session/concurrency masih gate Phase 4A terpisah. Known roles-limited/NULL-reason/default ACL findings tetap ada karena A/B/C1/C2 belum diterapkan.

Negative guard cases yang perlu diuji di database disposable approved: extra table/view/sequence, second function/overload, wrong return type/owner/prokind, wrong event owner/link/status/tags, unexpected extension membership, missing approval/hash mismatch dan changed DDL hook. Semua harus ditolak atau memerlukan review ulang sebelum DDL. **Belum dieksekusi**; jangan memodifikasi helper/event staging existing untuk menciptakan kasus negatif. Gunakan project/scratch fixture terpisah yang disetujui, bukan dev atau platform object aktual.

QA revisi guard lokal: lint/build PASS exit 0 (main 585.95 kB / gzip 171.02 kB, warning >500 kB); ekspresi event-graph hashing inspector/guard sama; Master checksum dan lima app function bodies dipertahankan; 26 tabel; tidak ada SQL alteration terhadap existing helper/event, perubahan default privileges/remediation, atau COMMIT baru; link/JSON/read-only/rollback lexical checks PASS. Ini bukan PostgreSQL parser/compile/behavior test. Body review dan dry-run tetap BLOCKED/NOT TESTED sesuai tabel di atas.

## Bukti dan cara pemeriksaan

Master dibaca lengkap: [001_rekansiaga_initial_schema.sql](../supabase/migrations/001_rekansiaga_initial_schema.sql), SHA256 `6e7db11bee992ad34ff534f71198d6fe4ab59c373b8986859e1144d1404b77fb`. Sumber tidak diubah. Dibandingkan dengan [katalog dev](audits/phase4a-security-audit-result.json), [dua definisi fungsi dev](audits/phase4a-function-definitions.json), grants/policies/default ACL dan laporan sebelumnya. Snapshot dev 22 Oktober 2026 21:07:56 WIB bukan bukti state saat ini. Master yang sebelumnya tidak ditemukan kini sudah tersedia; hambatan pembacaan migration awal ditutup untuk file ini, bukan bukti bahwa file tersebut satu-satunya perubahan historis dev.

[Script perbandingan offline](../scripts/compare-phase4a-master.mjs) membaca seluruh file lokal dan menghasilkan [hasil perbandingan terstruktur](audits/phase4a3-master-comparison.json). Jalankan ulang lokal dengan `node scripts/compare-phase4a-master.mjs`. Extractor dibuat untuk sintaks file ini, **bukan parser PostgreSQL/AST**. Tidak menyambung database. Kolom/type/nullability, PK/FK/unique, index definitions dan body fingerprints dibandingkan lebih rinci daripada jumlah tabel. CHECK/policy expressions ditinjau manual dengan definisi source/dev disimpan pada JSON; perbedaan pretty-print/casts tidak dianggap perubahan logika otomatis.

## Hasil struktur: yang cocok dan batas bukti

| Elemen | Master vs snapshot dev | Kesimpulan |
| --- | --- | --- |
| Nama tabel | 26 nama sama, tidak ada yang hilang/ekstra | PASS perbandingan source/metadata |
| Kolom | 200 nama/type/nullability sesuai, termasuk UUID FK dan boolean aktif | PASS dalam scope extractor + review |
| Primary key | 26 tuple PK sesuai, termasuk assignment composite | PASS |
| Foreign key | 33 kolom/target/delete action sesuai | PASS |
| UNIQUE/CHECK | 13 UNIQUE sesuai; 34 CHECK cocok secara logika setelah review casts/IN/ANY | PASS statis; hasil compile staging belum ada |
| Index | 22 explicit definitions cocok, ditambah 39 implicit PK/UNIQUE → expected 61 | PASS source/dev; validitas index staging belum dibuktikan |
| RLS/policy | Enable list mencakup seluruh 26 tabel. 27 policy dibuat lalu reports_staff_update dihapus → final 26; predicate/roles/command sesuai snapshot | PASS baseline; bukan remediation limited-role |
| Trigger | 6 BEFORE UPDATE memanggil set_updated_at, cocok snapshot | PASS source mapping; runtime belum diuji |
| Fungsi aplikasi | 5 source bodies cocok fingerprint dev setelah normalisasi LF → CRLF | PASS isi prosrc setelah normalisasi akhir baris, bukan kesamaan ACL/defaults |
| Default kolom | Master mendefinisikan gen_random_uuid()/now()/status/flags | Dev JSON lama tidak mengekspor defaults: kesetaraan dev BLOCKED, bukan diasumsikan cocok |
| Managed objects | auth.uid / pgbouncer.get_auth berasal platform, tidak didefinisikan Master | Bukan missing application functions; tidak menyalin managed schemas |
| Seed | Empat role dan dua data-source config dalam Master | Tidak ada bukti row seed dev pada katalog; staging harus diperiksa terpisah |

Body set_updated_at, has_staff_role, submit_public_report, track_public_report dan review_public_report masing-masing cocok dengan fingerprint katalog setelah line-ending normalization. Sebelum normalisasi hash byte berbeda; tidak melaporkan kesamaan byte mentah. Dua body helper/review juga cocok dengan file definisi dev setelah mengabaikan CR/LF. Korelasi fingerprint mendukung bahwa Master merepresentasikan body baseline yang ditinjau, bukan bukti ACL dev dihasilkan hanya oleh migration ini.

## Daftar perbedaan, masalah dan unknown

| ID | Temuan | Dampak / tindakan |
| --- | --- | --- |
| STG-01 | Master merevoke function privileges hanya FROM PUBLIC lalu GRANT caller tertentu. Dev default ACL memberi grant langsung anon/authenticated/service_role | Niat service-only/helper-authenticated tidak menjamin effective ACL. Dev menunjukkan anon+authenticated EXECUTE semua app functions. Bootstrap menormalisasi ACL objek baru secara eksplisit, tanpa ALTER DEFAULT PRIVILEGES |
| STG-02 | Master roles_staff_read tetap super-only, sama dev | Active limited roles tidak dapat menyelesaikan Web role-query chain. Simpan sebagai baseline known failure; A **belum diterapkan** |
| STG-03 | Master review RPC sama dev: role guard+row lock+atomic history, target NULL tidak ditolak eksplisit dan reason belum dibatasi | B **belum diterapkan**; baseline hanya untuk staging terisolasi, tidak siap operational acceptance |
| STG-04 | Master tidak mengatur default ACL creator; C1/C2 belum diterapkan | Future objects tetap dipengaruhi platform defaults. Normalisasi bootstrap hanya untuk 26 tabel/lima fungsi baru ini; jangan klaim META-03 tertutup |
| STG-05 | Source geography(Point,4326) bergantung SET LOCAL search_path; CREATE EXTENSION IF NOT EXISTS tidak memindahkan extension yang sudah ada di schema lain | Bootstrap mengualifikasi empat kolom ke extensions.geography dan menolak existing PostGIS di schema berbeda; tidak auto-relocate extension |
| STG-06 | Master berakhir COMMIT, tanpa target/empty-project guard | Berbahaya jika salah project/rerun. Master dipertahankan; draft baru fail-closed dengan acknowledgement + empty public-object check + ROLLBACK |
| STG-07 | Master sempat grant UPDATE public_reports dan membuat update policy, kemudian merevoke/drop pada transaksi sama | Nilai final sesuai dev: SELECT saja. Jangan menjalankan potongan SQL atau berhenti sebelum tail; tidak ada alasan menyalin interim grant ke staging |
| STG-08 | Owner/schema USAGE/platform privileges tidak dinyatakan seluruhnya dalam Master | Bootstrap mensyaratkan runner postgres; staging validation harus memverifikasi owner/USAGE/effective ACL aktual, bukan hanya GRANT source |
| STG-09 | Seed roles dan BMKG/manual data-source hanya static reference configs | Tidak ada copy pengguna/event/laporan; config bukan klaim bahwa integrasi feed hidup atau data resmi sudah disinkronkan |
| STG-10 | Dev may contain later manual changes, provider hooks, other creator defaults | Tidak menyimpulkan “identik dev” dari counts/body. Fresh full audit staging dan comparison wajib |

Explicit intended callers Master vs dev actual:

| Fungsi | Niat source Master | Snapshot dev | Draft staging expected |
| --- | --- | --- | --- |
| has_staff_role | authenticated | anon/authenticated true | anon false; authenticated/service true |
| review_public_report | authenticated | anon/authenticated true | anon false; authenticated/service true; body baseline unchanged |
| submit_public_report | service_role | anon/authenticated true | anon/authenticated false; service true |
| track_public_report | service_role | anon/authenticated true | anon/authenticated false; service true |
| set_updated_at | Tidak ada cleanup explicit caller | PUBLIC + anon/authenticated EXECUTE | anon/authenticated false; tetap invoker trigger, bukan public RPC |

Privilege source tidak bisa disamakan dengan effective grants karena default privileges dan inherited grants. PostgreSQL global PUBLIC EXECUTE dan grant role-specific terpisah; perubahan default juga hanya berlaku untuk objek baru. [PostgreSQL privileges](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html). Trigger dipasang oleh owner; hilangnya direct client EXECUTE bukan larangan menjalankan trigger yang sudah terpasang, tetapi tetap buktikan behavior UPDATE di staging setelah izin test.

## Bootstrap yang siap direview

[phase4a3-bootstrap-review.sql](sql/staging/phase4a3-bootstrap-review.sql) adalah turunan lengkap Master, **bukan wrapper yang memanggil file migration lain** dan tidak masuk folder auto-migration runner. Perubahan terlokalisasi:

1. Header source checksum/scope dan guard: acknowledgement operator, postgres/PG15+, managed auth dan tiga client roles ada; public relations harus kosong. Routines harus kosong atau tepat satu existing event-trigger candidate yang memenuhi seluruh checks dan body/graph review di atas. Existing app objects/unknown routines dihentikan, bukan dihapus/di-overwrite.
2. PostGIS harus di extensions, empat geography columns dikualifikasi. Tidak mengasumsikan extension schema pada project baru. [Supabase PostGIS](https://supabase.com/docs/guides/database/extensions/postgis).
3. Cleanup tabel baru juga FROM PUBLIC, anon, authenticated, kemudian GRANT source yang sama. Cleanup lima function ACL baru secara eksplisit di akhir melawan inherited direct default grants; intended helper/review hanya authenticated/service, submit/track hanya service.
4. Penutup ROLLBACK: dry-run membatalkan bootstrap/seed; tidak mengganti file Master atau membuat schema persisten.

Tidak menambahkan assigned-role policy A, tidak mengganti body review dengan B, tidak menjalankan ALTER DEFAULT PRIVILEGES C1/C2. Secara semantik pencabutan anon review EXECUTE juga tujuan B, tetapi di sini hanya menegakkan niat caller Master pada objek baru; **jangan mengklaim seluruh B diterapkan**. Body NULL/reason baseline tetap sama. Semua file remediation yang sudah ada tidak diubah oleh task ini.

Fungsi submit Master validasi field dan pasangan koordinat, membuat token acak ter-hash, insert report/token/history satu transaksi. Tracking memeriksa hash/expiry/revoked dan hanya mengembalikan status/waktu. Source kini tersedia untuk review lebih lanjut, tetapi tidak menutup rate-limit/CAPTCHA, entropy/runtime, spam, Edge Function atau API privacy acceptance. Jangan membuka anon EXECUTE submit/track agar tes mudah; backend service credential tidak boleh masuk frontend/Flutter.

## Query validasi staging

| Urutan | File | Scope |
| --- | --- | --- |
| 0 | [phase4a3-preflight.sql](sql/staging/phase4a3-preflight.sql) | Read-only version/roles, public object inventory, PostGIS schema/default ACL, tanpa row pengguna |
| 0a | [phase4a3-inspect-rls-auto-enable.sql](sql/staging/phase4a3-inspect-rls-auto-enable.sql) | Read-only full helper definition, exact metadata/dependencies dan semua event hooks; body review wajib sebelum pengecualian guard |
| 1 | [phase4a3-validate-structure.sql](sql/staging/phase4a3-validate-structure.sql) | Read-only expected 200 columns/defaults, seluruh constraint/index definitions/policy tuples, table grants dan 5 function body/ACL checks |
| 2 | [full security audit](sql/phase4a-security-audit.sql) | Read-only full schema/role/column/effective grants/default ACL/functions/view dependencies. Simpan sebagai hasil staging terpisah, bukan menimpa audit dev |
| 3 | [phase4a3-validate-seeds.sql](sql/staging/phase4a3-validate-seeds.sql) | Read-only empat static role code counts, dua source configs dan fixture-related aggregate counts; tanpa data staf/auth/PII |

Semua query belum diparse/dijalankan pada PostgreSQL dalam sesi ini. Structure query menyertakan expected defaults dari **Master**, bukan mengaku defaults dev terverifikasi. Constraint/policy pretty-print antarversi mungkin berbeda; setiap mismatch harus ditinjau, tidak diabaikan agar status PASS. Function checks dengan overload harus diperiksa signature/result type yang dicetak; jangan menyimpulkan satu row yang cocok berarti semua overload aman. Check owner postgres, search_path kosong untuk 4 app definers + 1 app trigger invoker, 6 row triggers aplikasi, RLS true 26/26, final 26 policies, all expected indexes valid. Existing event helper adalah fungsi keenam yang diperiksa terpisah oleh inspector; jangan menganggap search_path-nya aman atau harus diubah mengikuti app functions tanpa review. Tidak ada satu boolean “security safe”.

Read-only seeds query hanya sah setelah persistent baseline disetujui dan dibuat. Expected segera sesudah bootstrap: 4 role rows / 4 distinct codes, 2 config source rows, staff/assignment/report/history/token counts 0. Seed counts bukan bukti tidak ada private data di seluruh managed schemas; target isolation/provisioning tetap perlu diverifikasi.

## Panduan Supabase SQL Editor — hanya tahap manusia sesudah review

1. Pastikan Dashboard **project name rekansiaga-staging dan project reference**; cocokkan catatan operator. `current_database()` umumnya postgres pada dev dan staging, jadi bukan identitas project. Tidak memakai Web `.env.local` untuk menentukan target. Bila ragu, jangan lanjut.
2. Buka SQL Editor query baru dan jalankan hanya preflight read-only setelah review. Public application relations harus kosong; satu helper event existing hanya diterima sesudah exact checks + body/graph review di bagian revisi guard. auth/users/roles managed tersedia. Jika unknown objects, owner bukan yang disepakati atau PostGIS di schema lain: stop, ekspor metadata; jangan DROP/relocate/reset project untuk melewati guard.
3. Tinjau keseluruhan bootstrap. Bila dry-run kelak diizinkan, aktifkan acknowledgement target SET LOCAL **di dalam transaksi yang sama** setelah operator memastikan project ref. Jika existing helper ada, wajib juga behavior review + dua hash yang direview melalui tiga SET LOCAL tambahan sesuai prosedur revisi di atas. Jangan lanjut hanya karena nama/helper count cocok. Token adalah konfirmasi manusia dan hash adalah drift check, bukan verifikasi identitas target atau bukti perilaku aman oleh server. File default sengaja menolak eksekusi tanpa review/ack yang lengkap.
4. Dry-run tetap diakhiri ROLLBACK; jika error, lakukan ROLLBACK dan baca error privat. Jangan menjalankan sebagian file yang melewatkan revoke/drop final. Dry-run berhasil sekalipun **tidak membuat staging siap/persisten**. SQL/RPC/API dari koneksi lain tidak dapat memvalidasi DDL yang belum committed.
5. Bootstrap persisten memerlukan review/approval dan release script/proses manusia terpisah. Task ini tidak membuat COMMIT baru, tidak mengganti ROLLBACK, dan tidak menerapkan apapun. Jangan menempelkan Master original COMMIT langsung untuk menghindari workflow review.
6. Sesudah persistent baseline disetujui dan diterapkan manusia, jalankan structure/full-audit/seeds read-only, simpan hasil ke `docs/audits/phase4a3-staging-*.json` yang baru dan terlabel project/snapshot. Jangan overwrite audit dev atau menyimpan secrets/body yang mengandung secrets tanpa pemeriksaan.
7. Bandingkan semua object definitions dan **intentional ACL deltas** di atas, bukan count saja. Lanjutkan security/API baseline tests hanya setelah fixture disetujui. Remediation A/B/C masih tahap lain; perlu approval sendiri dan tidak dijalankan di fase ini.

Tidak ada langkah panduan di atas yang telah dieksekusi agent pada Cloud. Status target yang dilaporkan dibuat tidak membuktikan schema/keamanan sudah diverifikasi.

## Rencana synthetic data — belum dieksekusi

Tidak melakukan dump/copy data development, auth.users, password hash, JWT, profil, token, kontak atau laporan nyata. Hanya struktur dan static role/source config lokal tersedia pada bootstrap. Tidak membuat Auth users dengan INSERT langsung ke managed auth.users. Operator approved menggunakan Supabase Auth provisioning pada **staging** untuk test identities baru, password terkelola privat dan tanpa email/kredensial akun asli.

| Fixture label | Profil/role target | Kegunaan |
| --- | --- | --- |
| SA | Aktif, super_admin | Baseline login/role/authorized read |
| IM | Aktif, information_manager | Bukti known limited-role SELECT failure sebelum A |
| RV-A / RV-B | Dua Auth IDs berbeda, aktif report_verifier | Dua reviewer, concurrency sesudah remediation/test approval |
| ME | Aktif mitigation_editor | Allowed guidance vs forbidden review |
| USER | Auth valid, tanpa profil admin | 403 UI dan direct API negatives |
| INACTIVE | Profil nonaktif dengan verifier assignment | Aktif wajib; self metadata boleh sesuai policy |
| NO-ROLE / MULTI | Aktif kosong / IM+ME | Empty-role denial dan multi-role union |
| ANON | Tanpa Auth session | Public-only / staff deny |

UUID/Auth IDs dihasilkan baru oleh staging, bukan UUID dev. Hubungkan staff_profiles/assignments oleh operator server berotorisasi setelah fixture plan disetujui; tidak ada frontend auto-role. Jangan membuat script seed akun yang bisa dipakai terhadap target tidak diketahui.

Laporan: fixture terpisah untuk unverified, under_review, verified dan rejected; title/description jelas bertanda `SYNTHETIC STAGING TEST` dan memenuhi bounds, region/event null jika tidak diperlukan. Lokasi/attachment/kontak nyata tidak diperlukan. History baseline dan counts diketahui; tiap concurrency case memakai laporan baru. Jika region/source/event diperlukan, buat sintetik berlabel dan URL reserved example.invalid, bukan peristiwa/kontak resmi rekaan. Tidak mengaktifkan notification delivery, eksternal API jobs, dispatch atau pembayaran; donasi tetap simulasi.

Simpan manifest privat berisi project ref, persetujuan, fixture IDs sintetis, versi/hash schema dan baseline counts. Report mutation/concurrency hanya sesudah izin pada isolated staging; task ini hanya rencana. Bersihkan fixture hanya via manifest/approved operator, jangan reset/drop schema shared. [Paket validasi sebelumnya](phase4a-remediation-validation.md) tetap berlaku untuk test after-remediation; expected baseline di fase ini berbeda: limited-role chain known FAIL, NULL/reason behavior lama, default ACL masih platform-dependent, submit/track client deny secara sengaja.

## Expected / actual dan risiko tersisa

| Pemeriksaan | Expected | Actual / status |
| --- | --- | --- |
| Master local comparison | 26 tables/200 columns + matching keys/index/body/policy semantics | PASS bounded offline comparison, JSON artifact tersedia |
| Staging target identity/empty app schema/PostGIS | Verified project ref + blank app relations + reviewed event helper + extensions | Relation count 0/helper 1 PASS user-reported; body/graph/target/PostGIS verifikasi lengkap masih BLOCKED |
| Bootstrap compile/dry-run | Seluruh statement berhasil lalu rollback | NOT TESTED; tidak dijalankan |
| Persistent staging baseline | Metadata sesuai manifest dan intentional ACL deltas | BLOCKED; belum ada hasil staging |
| Synthetic fixtures | Approved nonproduction identities/reports, tanpa dev data | BLOCKED; hanya rencana |
| Authenticated API/concurrency/security | Bukti positive/negative/session/atomicity | BLOCKED; bukan cakupan eksekusi fase ini |

Risiko: salah project; existing PostGIS namespace; schema/owner/default ACL/DDL hooks berbeda; known roles/read dan review NULL/reason; future object defaults belum diperbaiki; Edge/rate limits belum tersedia; source Master berakhir COMMIT; migration history dev tidak diketahui lengkap; defaults/type formatting baru belum diverifikasi; security/event/managed schema scope belum lengkap; synthetic fixtures belum disetujui. Tidak ada data asli disalin dan tidak ada janji staging identik/siap digunakan.

**Staging belum dinyatakan siap digunakan.** Gate dibuka hanya setelah manusia mereview bootstrap, memverifikasi target, menerapkan tahap yang disetujui, menyediakan hasil struktur/grants/RLS/seed staging, dan menyelesaikan validation yang relevan. Phase 4A tetap BLOCKED; keberadaan Master kini membantu pembandingan tetapi tidak menggantikan authenticated API acceptance.

## QA lokal yang benar-benar dijalankan

- `node scripts/compare-phase4a-master.mjs`: PASS proses offline, 0 column/PK/FK/unique/index differences pada scope extractor; lima normalized-body fingerprints cocok. CHECK/policy review tetap statis dan bukan PostgreSQL execution.
- `npm.cmd run lint`: PASS exit 0. `npm.cmd run build`: PASS exit 0; main chunk 585.95 kB / gzip 171.02 kB, warning >500 kB masih ada.
- Checksum Master dan kedua bukti audit asli tetap sama. Exact body kelima fungsi di bootstrap sama dengan Master; tidak memasukkan body remediation B. Bootstrap tetap 26 tabel, tanpa assigned-role policy A atau ALTER DEFAULT PRIVILEGES C. Link dokumen serta read-only/rollback boundaries lolos pemeriksaan lokal.
- **NOT TESTED:** SQL parser/compiler PostgreSQL, dry-run/persistent bootstrap, query validasi staging, Auth/API/concurrency. Tidak ada Docker, perubahan config Web, SQL remote atau dev-data copy. File proposal A/B/C tidak disentuh oleh pekerjaan ini.
