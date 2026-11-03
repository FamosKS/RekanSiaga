# Remediation A - Test plan terkini (Phase 4A.5A)

**Status terkini:** dua akun telah diprovision manual dan UID terdaftar. Checkpoint dry-run 27/1/1 PASS menurut operator; rollback postcondition dan JWT/API belum diterima. A permanen belum disetujui. [Runbook terkini](phase4a-remediation-validation.md) menggantikan instruksi next-step historis di bawah; persiapan lokal B/C1 telah diminta, penerapan tetap menunggu acceptance A. Phase4A BLOCKED.

Rancangan aktif memakai **2 identitas Auth berbeda, CONTROL dan SUBJECT**, dengan sembilan state pengujian serial. Ini menggantikan rancangan 10 akun. Cakupan active/inactive, seluruh limited role, tanpa profil/role, MULTI, inactive-super, known foreign UID dan foreign UID dengan role sama tetap ada. Anonymous tidak memerlukan akun. State serial tidak boleh diuji paralel.

| Artefak | Fungsi |
| --- | --- |
| [Proposal A asli](sql/proposals/phase4a-01-assigned-role-read.sql) | SELECT own-assigned role bagi profil aktif; existing super policy tetap; tidak diubah |
| [Manifest template](qa/phase4a/remediation-a/fixture-manifest.template.json) | Dua UUID/ref/run ID belum diisi, approval false; tanpa credential |
| [Expected/actual matrix](qa/phase4a/remediation-a/access-matrix.csv) | Identity dan state dipisah; seluruh actual kosong/NOT_RUN |
| [SQL dry-run](sql/staging/phase4a-remediation-a-dry-run.sql) | Guard staging/manifest, fixture sementara, exact executable A policy dan SQL role simulation, berakhir ROLLBACK |
| [Rollback rehearsal](sql/staging/phase4a-remediation-a-rollback-review.sql) | Setelah approved persistent A: hanya exact reviewed policy A yang dilepas di dalam transaksi ROLLBACK |

## Tiga tahap terpisah

1. **Fixture preparation:** setelah persetujuan, operator memprovision dua akun sintetis melalui Auth workflow staging. Unknown existing email/account berarti STOP. Reuse hanya UUID yang provenance-nya tercatat dalam manifest staging yang disetujui; tidak reset password, overwrite, delete/recreate atau INSERT auth.users. Credential disimpan privat. App profiles/assignments belum dipersistenkan dan workspace React/Flutter tidak diubah.
2. **SQL rehearsal:** isi salinan manifest dan acknowledgement setelah target Dashboard staging/ref dikonfirmasi. Jalankan seluruh dry-run pada satu sesi postgres terpercaya. Script menolak UUID null/duplikat, manifest tidak cocok, app fixture existing, policy collision dan helper/owner/RLS drift. Operator SQL mengganti state hanya untuk dua UUID fixture. Setelah restore, checkpoint adalah 27 policies dan 1 CONTROL profile/assignment; SUBJECT kembali USER. Setelah ROLLBACK: 26 policies dan 0 app profiles/assignments. Dua akun Auth eksternal tetap ada.
3. **Persistent A dan JWT/API:** hanya setelah hasil dry-run direview dan release A-only/fixture persisten disetujui terpisah. Jangan mengganti ROLLBACK file yang disediakan. HTTP tidak melihat state transaksi yang belum committed. Pada API stage, operator menyiapkan satu state committed, memverifikasinya, lalu menguji JWT masing-masing UID sebelum berganti state. Tidak memulai B/C1.

Custom settings/format ref bukan verifikasi identitas server; cocokkan Dashboard name/ref/endpoint secara independen. SQL rehearsal repeatable setelah rollback terkonfirmasi, **bukan idempotent upsert terhadap data persisten**. Existing app profiles/assignments membuat guard menolak; jangan menghapus massal untuk melewatinya. Jika error/timeout, pastikan transaksi lama selesai dan state kembali sebelum retry. Auth creation di luar transaksi tidak ikut rollback.

## Scope validasi dan acceptance

A tetap least privilege: SELECT role hanya jika assigned ke auth.uid() dan profil aktif, tanpa write grants atau auto assignment. CONTROL super aktif mempertahankan akses empat role existing. SUBJECT inactive dapat membaca own metadata yang memang diperbolehkan policy existing, tetapi roles tetap []. Same-role foreign read harus tetap [] bagi kedua UID saat CROSS_RV; CONTROL kemudian dipulihkan ke super.

SQL SET ROLE/request claims adalah **SQL_SIMULATION**, bukan bukti JWT valid. API memakai key public/publishable staging dan JWT aktor sendiri, bukan service_role/postgres; `/auth/v1/user` harus mengembalikan UID yang sesuai. Matrix mewajibkan exact role sets, own/known foreign/same-role isolation, grant denial untuk self-reactivation/self-assignment/role CRUD, spoof metadata, refresh/logout/revocation dan no recursion. Mutation probe hanya fixture-safe targets dengan approval. Jangan DELETE empat seed role; role PATCH/DELETE menggunakan UUID yang dipastikan tidak ada, invalid-code POST tidak boleh dijadikan PASS hanya karena constraint menolak. Unexpected write berarti STOP dan review, bukan ditutup dengan pergantian state berikutnya.

Actual mencatat identity + state + waktu + versi/ref + HTTP/SQLSTATE + sanitized result + sumber LIVE_JWT/SQL_SIMULATION. Semua masih NOT_RUN. Jika UI staging terisolasi belum tersedia, frontend smoke tetap BLOCKED; direct API tidak menggantikannya. JWT replay/in-flight dicatat tanpa asumsi instant revoke. Tidak ada report fixture, review RPC atau concurrency laporan pada tahap A.

A VALIDATED hanya setelah policy diff 26 ke 27, helper/ACL/seed tidak berubah, SQL simulation lulus serta required JWT/session/negative cases direview dan diterima. B/C1 baru boleh dimulai setelah acceptance A tersebut.

## Rollback

Pre-commit error: ROLLBACK transaksi rehearsal. Sesudah A committed, permanent rollback membutuhkan release baru yang disetujui: hapus hanya roles_assigned_active_staff_read, pertahankan roles_staff_read/helper/grants. Rehearsal rollback memakai exact reviewed MD5 dan flags policy serta berakhir ROLLBACK; ia sendiri tidak menghapus A persisten. Persistent rollback kembali ke 26 policies, super tetap bekerja dan limited kembali blocked. Cleanup akun/fixture dan transaksi HTTP bukan bagian otomatis rollback policy; hanya dua UUID milik manifest dengan persetujuan, tanpa reset/drop schema/dev.

## Satu langkah operator sekarang

**Lengkapi dan setujui manifest rencana dua akun dengan verified staging project reference dan run ID.** UUID tetap null sampai provisioning disetujui dan dilakukan. Belum membuat akun, menjalankan SQL atau memberi izin A persisten.

## Koreksi dan QA

Dry-run lama menyertakan teks komentar CREATE POLICY sebagai SQL dan BEGIN kedua. Kesalahan material diperbaiki lokal dengan ekstraksi yang hanya menerima executable policy bernama tepat pada awal baris. Proposal A asli tetap sama. SQL baru belum diuji pada PostgreSQL; local boundary/consistency checks tidak dianggap runtime PASS. Hasil QA aktual dicatat pada development status.
