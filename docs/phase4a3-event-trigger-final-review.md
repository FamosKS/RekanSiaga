# Phase 4A.3 — Existing event trigger final review

**PASS untuk review statis dan persiapan dry-run terkontrol pada snapshot ini. Bootstrap execution NOT TESTED; staging READY dan Phase 4A COMPLETE tetap BLOCKED.** Tidak ada SQL Cloud, perubahan database dev/staging, remediation A/B/C1/C2, Docker atau perubahan konfigurasi Web yang dijalankan oleh Codex.

## Evidence dan integritas

Seluruh [JSON inspeksi](audits/phase4a3-existing-event-trigger-review.json) dibaca, termasuk satu candidate definition dan tujuh event function definitions. Pengguna menjalankan query remote; Codex melakukan review lokal. Capture `2026-10-22T16:09:45.102203+00:00` (22 Oktober 2026, 23:09:45 WIB), PostgreSQL 17.11, executing_role postgres, replication role origin. Database name postgres bukan verifikasi project ref; pengguna menyatakan target rekansiaga-staging.

SHA256 berkas: `b9854eeb1dc37268f009948289f269006516ae3e6b050400dafa8b3aad937134`. Public relations 0; public routines tepat satu. Raw JSON tidak diubah. Semua tujuh definition_md5 cocok dengan MD5 teks definisi yang disertakan. MD5 event_graph direkonstruksi lokal memakai urutan key/spacing JSONB untuk nilai-nilai snapshot ini dan cocok `7fe832217540802b68d6d56c6ba30f47`. Ini pemeriksaan konsistensi artefak, bukan autentikasi sumber, bukti fresh state atau eksekusi PostgreSQL lokal.

## public.rls_auto_enable() — PASS statis untuk scope dry-run

- Candidate OID 17481, prokind f, input_count=0, signature kosong, arg_modes/all_argtypes NULL, variadic_type=0, bukan set-returning, return event_trigger. Owner postgres, plpgsql, SECURITY DEFINER, search_path=pg_catalog. Guard exact-signature/owner/type checks sesuai JSON.
- Input target berasal dari `pg_event_trigger_ddl_commands()`, bukan parameter client. Filter command_tag hanya CREATE TABLE/CREATE TABLE AS/SELECT INTO dan object_type table/partitioned table. Metadata schema harus public, bukan system/temp/toast.
- Relname diambil dari **pg_catalog.pg_class** dengan OID cmd.objid. Dynamic SQL memakai `format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl)`: dua identifier di-quote `%I`, tidak dikonkatenasi sebagai SQL mentah. Tidak ditemukan input string yang menjadi ekspresi SQL, DML data staf, grants, role assignment, owner change atau DISABLE RLS.
- Body hanya ENABLE RLS pada tabel public yang dilaporkan command metadata, lalu RAISE LOG. Tidak membaca credential, tabel pengguna atau memanggil network function. EXECUTE di sini adalah dynamic SQL identifier-safe, bukan bukti injection dengan sendirinya.
- ACL memberi PUBLIC/anon/authenticated/service_role EXECUTE. Itu permukaan luas yang perlu dicatat, **bukan otomatis arbitrary privileged RPC**: return type event_trigger dan helper pertama memerlukan event-trigger context. `pg_event_trigger_ddl_commands()` menolak panggilan di konteks lain; tidak ada parameter untuk memilih tabel korban. Ordinary DDL/schema CREATE permissions tetap perlu audit terpisah pada staging, karena JSON ini tidak mengekspor seluruh schema privileges. [PostgreSQL event helpers](https://www.postgresql.org/docs/17/functions-event-triggers.html).

Tidak ditemukan privilege-escalation path pada body untuk workflow dry-run oleh operator postgres yang dipercaya. Ini bukan sertifikasi terhadap sesi penyerang/DDL privileges yang belum diaudit. Search_path pg_catalog menghindari public function lookup, dan pg_class dikualifikasi; namun pg_temp tidak dipasang eksplisit terakhir dan tipe lokal `name` tidak qualified. PostgreSQL memberi peringatan tentang temp-schema masking pada definer functions: gunakan **fresh trusted session tanpa temporary objects** untuk dry-run; hardening terhadap arbitrary untrusted sessions/temp-type shadowing tetap perlu analisis terpisah. Tidak mereproduksi exploit atau mengubah fungsi provider untuk menutup asumsi itu. [PostgreSQL definer safety](https://www.postgresql.org/docs/17/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).

### Catatan penting: error ditelan, bukan enforcement fail-closed global

Blok `EXCEPTION WHEN OTHERS THEN RAISE LOG ...` tidak meneruskan kegagalan ENABLE RLS. Tabel dapat tetap tercipta jika helper gagal; log sukses/gagal bukan acceptance evidence. Karena itu **jangan mengandalkan helper sebagai satu-satunya enforcement**. Bootstrap memiliki explicit ENABLE RLS untuk seluruh 26 tabel dalam satu transaksi, lalu checkpoint/validasi wajib memastikan 26/26 flag true. Jika explicit ENABLE gagal, transaksi bootstrap harus gagal dan di-ROLLBACK, bukan diakali dengan menghapus statement.

## ensure_rls dan dampak pada 26 tabel

Event OID 17482, owner postgres, event ddl_command_end, enabled O, tags CREATE TABLE / CREATE TABLE AS / SELECT INTO, function_oid 17481. Kandidat mempunyai satu incoming normal dependent “event trigger ensure_rls”; graph mencatat normal linkage ke fungsi yang sama. Function dependencies: language plpgsql, schema public. Tidak ada extension membership untuk kandidat maupun tujuh event triggers; **absence bukan bukti provenance resmi provider**.

Pada CREATE TABLE public milik bootstrap, helper seharusnya langsung ENABLE RLS sebelum transaksi commit. Itu searah dengan manual ENABLE source, bukan konflik desain. Nested ALTER TABLE dari helper tidak memicu ensure_rls lagi karena command tag ALTER TABLE tidak termasuk tag trigger; loop body juga hanya memproses create-like tags. Tidak ditemukan rekursi tanpa batas untuk alur ini. Runtime semua 26 tabel belum diuji; tags/object type, RLS flags dan logs tetap harus diperiksa pada dry-run.

Status O cocok dengan session_replication_role origin. Jangan mengubah replication role, menonaktifkan trigger, atau DROP/REPLACE helper agar script lolos. [PostgreSQL event catalog](https://www.postgresql.org/docs/17/catalog-pg-event-trigger.html).

## Review seluruh event graph

| Event / fungsi | Owner fungsi / definer | Aktivasi dan analisis pada bootstrap ini |
| --- | --- | --- |
| ensure_rls / public.rls_auto_enable | postgres / ya | CREATE TABLE-like public → ENABLE RLS dengan quoted identifiers; soft-failure LOG mengharuskan explicit RLS validation |
| issue_graphql_placeholder / extensions.set_graphql_placeholder | supabase_admin / tidak | sql_drop, hanya DROP EXTENSION. Bootstrap tidak DROP EXTENSION; placeholder recreation bukan jalur yang direncanakan |
| issue_pg_cron_access / extensions.grant_pg_cron_access | supabase_admin / tidak | CREATE EXTENSION; body hanya bertindak jika command extension pg_cron. Bootstrap hanya PostGIS, bukan cron |
| issue_pg_graphql_access / extensions.grant_pg_graphql_access | supabase_admin / tidak | CREATE EXTENSION; return jika bukan pg_graphql. Wrapper/grants GraphQL tidak diharapkan berubah pada PostGIS |
| issue_pg_net_access / extensions.grant_pg_net_access | supabase_admin / tidak | CREATE EXTENSION; body mensyaratkan pg_net sebelum role/grants/function changes. Bootstrap tidak membuat pg_net; body tidak mengirim HTTP request |
| pgrst_ddl_watch / extensions.pgrst_ddl_watch | supabase_admin / tidak | ddl_command_end, tags NULL; filter DDL body mengirim NOTIFY pgrst reload schema, termasuk table/function creation/ALTER RLS |
| pgrst_drop_watch / extensions.pgrst_drop_watch | supabase_admin / tidak | sql_drop, tags NULL; notify bila tipe object yang tercantum dihapus. Bootstrap hanya melepas policy sementara; tidak DROP EXTENSION/function/table existing |

Enam fungsi extensions adalah invoker, search_path kosong; seluruh event enabled O, dependency graph dan ACL disertakan/fingerprint-pinned. Invoker berjalan dengan hak pelaksana DDL, bukan otomatis hak owner supabase_admin. Bukan hanya ensure_rls yang bisa aktif saat bootstrap: PostGIS CREATE EXTENSION akan memicu hooks extension yang body-nya diperiksa, serta hooks DDL umum. Jangan menambah instalasi pg_net/cron/GraphQL atau DDL lain ke dry-run yang direview ini.

NOTIFY baru dikirim bila transaksi commit; ROLLBACK membatalkan delivery. RAISE LOG/SQL Editor history dapat tetap ada, sehingga dry-run berarti tidak mempersistenkan schema/data/grants aplikasi, bukan menghapus semua jejak audit/log. Tidak ditemukan external network invocation pada jalur bootstrap yang direview; effect provider aktual belum diuji. [PostgreSQL NOTIFY](https://www.postgresql.org/docs/17/sql-notify.html).

## Pencocokan guard dan acknowledgement

Guard memeriksa exact candidate, event owner/linkage/dependency, extension membership, origin mode, kosongnya relasi public dan tidak adanya routine tambahan. Semua field yang diekspor cocok dengan checks tersebut; normal pg_depend raw OID tetap diverifikasi langsung oleh guard saat kelak dijalankan. Ekspresi JSONB event-graph hashing inspector dan guard sama. Definisi helper:

`846ec2fbff751d24b890656d63c3a9bf`

Seluruh event graph:

`7fe832217540802b68d6d56c6ba30f47`

Hash cocok **setelah** behavior review di atas, bukan sebagai pengganti review. [Acknowledgement fragment](sql/staging/phase4a3-dry-run-acknowledgement.sql) disiapkan untuk snapshot ini. Tidak mengisi/mengubah fungsi remote. Base bootstrap tetap mempunyai setting komentar yang fail-closed sampai operator memasukkan acknowledgement di transaksi yang sama. Bila owner/ACL/body/tags/OID/dependencies berubah, graph hash harus menghentikan dry-run; ambil evidence baru dan review ulang, jangan auto-mengganti hash.

## Instruksi tepat dry-run tanpa menyimpan schema/data

1. Di Supabase Dashboard, pilih **rekansiaga-staging** dan verifikasi project reference, bukan hanya database_name postgres. Gunakan trusted fresh SQL Editor session tanpa temp objects dan maintenance window tanpa concurrent DDL. Jangan gunakan rekansiaga-dev.
2. Buka query baru. Salin **seluruh** [phase4a3-bootstrap-review.sql](sql/staging/phase4a3-bootstrap-review.sql), dari BEGIN hingga ROLLBACK terakhir. Jangan menjalankan file Master yang berakhir COMMIT atau proposal remediation.
3. Tempel empat SET LOCAL dari acknowledgement fragment **tepat setelah BEGIN; dan sebelum DO $staging_guard$**. Jangan menambah BEGIN/COMMIT dan jangan menjalankan SET LOCAL di request lain. Hash di atas bukan secret; project-ref verification tetap kewajiban operator.
4. Jalankan seluruh script. Jangan pilih hanya DDL tengah/tail yang melewatkan guard. Jika guard menolak drift, kosongnya target tidak terpenuhi, temp/untrusted session meragukan atau error muncul, stop dan ROLLBACK pada sesi yang sama. Jangan menonaktifkan trigger/merelaksasi guard.
5. Periksa result checkpoint SELECT **sebelum ROLLBACK**: 26 tables, 26 RLS enabled, 6 public routines, existing helper definition_md5 tetap 846ec2fbff751d24b890656d63c3a9bf, ensure_rls tetap postgres/ddl_command_end/O/tags dan function linkage sama. Bila editor tidak menampilkan result SELECT, jangan menganggap sukses hanya dari command status. Lihat panduan same-session di [staging preparation](phase4a3-staging-preparation.md).
6. Untuk full structure check sebelum rollback, review salinan query terlebih dahulu dan sisipkan hanya SELECT/WITH dari validation/inspector sebelum ROLLBACK terakhir; jangan menyisipkan transaksi read-only BEGIN/ROLLBACK di tengah transaksi DDL. Ini pilihan operator terpisah, tidak dilakukan Codex.
7. Sesudah ROLLBACK selesai, jalankan preflight dan inspector read-only sebagai query baru. Expected kembali **0 public relations + 1 existing helper**, hash definition dan graph/ACL/event metadata sama baseline. Simpan checkpoint dan post-rollback evidence baru; jangan menimpa bukti dev/original.

Dry-run ini membuat DDL/seed sementara dalam transaksi yang dibatalkan; tidak menghasilkan staging persisten. API dari koneksi lain tidak bisa memverifikasi schema uncommitted. Klaim bootstrap berhasil masih **NOT TESTED** sampai pengguna memberikan hasil dry-run dan preservation check. Hasil tersebut pun belum menggantikan full persistent structure/security validation dan API/concurrency acceptance setelah tahap deployment yang disetujui.

## Kesimpulan per scope

| Scope | Status | Alasan |
| --- | --- | --- |
| Body + quoted dynamic SQL + event linkage untuk controlled bootstrap | PASS statis bersyarat snapshot/fresh trusted session | Perintah hanya ENABLE RLS public berdasarkan metadata, tipe/owner/link/tags sesuai |
| Fingerprint/integritas snapshot vs guard | PASS lokal | Delapan definisi (candidate + tujuh event rows) dan graph digest konsisten; tidak membuktikan freshness Cloud |
| Global fail-closed RLS automation | FAIL bila helper dianggap satu-satunya jaminan | Error ditelan; bootstrap explicit ENABLE + check 26/26 wajib. Bukan bukti data saat ini bocor |
| Arbitrary untrusted-session temp-type/DDL privilege hardening | BLOCKED / di luar PASS dry-run | ACL EXECUTE luas, pg_temp tidak eksplisit terakhir, schema CREATE/TEMP privileges staging belum lengkap |
| Dry-run actual, rollback preservation, persistent schema/API | BLOCKED / NOT TESTED | Tidak ada SQL dijalankan Codex dan belum ada output dry-run |
| Staging READY / Phase 4A COMPLETE | BLOCKED | Masih perlu bukti struktur/keamanan dan authenticated API/concurrency, serta remediation yang belum diterapkan |

Existing helper/event tidak diubah. Remediation A/B/C1/C2 dan known limited-role/NULL-reason/default-ACL findings tetap tahap terpisah. Tidak ada data dev/akun asli disalin, environment/client Web diubah, atau SQL Cloud dieksekusi otomatis.

QA lokal: lint/build PASS exit 0; main 585.95 kB / gzip 171.02 kB tetap warning >500 kB. Source SHA256, metadata/linkage fields, delapan definition rows, rekonstruksi hash JSONB graph snapshot ini, kesamaan ekspresi guard/inspector, mapping empat acknowledgement dan tautan dokumen PASS. Ini tidak mengompilasi atau mengeksekusi SQL; acknowledgement tetap belum dijalankan. No actual dry-run/rollback-preservation result tersedia.
