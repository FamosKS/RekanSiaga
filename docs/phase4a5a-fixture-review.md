# Phase 4A.5A - Fixture review dan test readiness A

**Pembaruan 23 Oktober 2026:** keputusan approval dan paket committed/JWT terbaru berada pada [runbook utama](phase4a-remediation-validation.md). A permanen telah dilaporkan operator; fixture/API sintetis telah diizinkan dengan syarat, B after-trim disetujui sebagai kontrak, C1 hanya public-only. Uraian readiness/dry-run berikut adalah riwayat dan tidak meminta approval ulang atau deployment A ulang.


**READY FOR REVIEW; provisioning, SQL dry-run, migration A dan JWT/API tests belum dijalankan. Phase 4A BLOCKED.** Baseline Phase4A.4 tetap BASELINE VERIFIED WITH KNOWN SECURITY FINDINGS; tidak diaudit ulang. Dokumen Phase4A.4, proposal A, test plan, fixture template, matrix dan kedua rehearsal SQL ditinjau. B/C1 tidak dimulai. Tidak ada perubahan dev/React/Flutter atau SQL Cloud.

## Hasil review dan jumlah akun

**Minimum untuk cakupan A: 2 akun Auth berbeda**, dengan pergantian state fixture terkontrol dan serial. CONTROL adalah kontrol super_admin; SUBJECT dipakai bergantian untuk skenario di bawah. Dua UID diperlukan agar baris foreign yang benar-benar ada bisa diuji: dengan satu UID/missing UUID saja, [] tidak membuktikan isolasi kepemilikan. Anonymous/NULL-sub adalah konteks request, bukan akun tambahan.

Sepuluh akun lama tidak wajib: RV_B menggandakan RV untuk A dan baru relevan bagi concurrency laporan yang bukan tahap ini. USER, NO_ROLE, IM, RV, ME, MULTI, INACTIVE dan INACTIVE_SA adalah **state database**, tidak harus identitas Auth permanen berbeda. Simpan dua sesi/JWT sesuai UID fisik; pergantian role/profile dilakukan operator fixture yang disetujui, bukan akun yang sedang diuji. State harus committed/dikonfirmasi sebelum request API; tidak boleh menjalankan cases secara paralel atau menggabungkan hasil state berbeda.

Jika operator tidak dapat mengelola pergantian state secara disiplin, alternatif **9 akun statis** mempertahankan semua state sekaligus (10 lama dikurangi RV_B). Paket aktif sekarang memakai 2 akun; jangan mencampur template dua akun dengan SQL/counts lama 10/9/9. Untuk same-role foreign isolation, satu case mengubah CONTROL sementara ke report_verifier, sehingga dua UID berbeda sama-sama verifier; ini **bukan concurrency/report mutation**, lalu CONTROL dikembalikan ke super_admin.

| Identitas / state | Expected GET roles sesudah A | Foreign profile/assignment | Actual |
| --- | --- | --- | --- |
| CONTROL aktif super_admin | Semua4role | Boleh membaca SUBJECT ketika row ada, sesuai policy existing | NOT_RUN |
| SUBJECT USER tanpa profil | [] | Tidak membaca CONTROL yang diketahui ada | NOT_RUN |
| SUBJECT NO_ROLE aktif tanpa assignment | [] | Tidak membaca CONTROL | NOT_RUN |
| SUBJECT IM aktif | information_manager saja | Tidak membaca CONTROL | NOT_RUN |
| SUBJECT RV aktif | report_verifier saja | Tidak membaca CONTROL | NOT_RUN |
| SUBJECT ME aktif | mitigation_editor saja | Tidak membaca CONTROL | NOT_RUN |
| SUBJECT MULTI aktif | information_manager + mitigation_editor | Tidak membaca CONTROL | NOT_RUN |
| SUBJECT INACTIVE verifier | [] | Tidak membaca CONTROL; self metadata tetap sesuai policy existing | NOT_RUN |
| SUBJECT INACTIVE_SA | [] | Tidak membaca CONTROL; assignment super saja tidak cukup tanpa aktif | NOT_RUN |
| CONTROL+SUBJECT CROSS_RV, dua UID aktif role sama | Masing-masing report_verifier saja | Kedua arah foreign read [] meski role sama | NOT_RUN |
| Anonymous tanpa JWT | Grant denial, bukan role rows | Tidak membuka data staf | NOT_RUN |
| Authenticated context tanpa sub (SQL-only) | [] | Bukan sesi Auth valid/API proof | NOT_RUN |

Sebelum A, limited SUBJECT tetap[] dan CONTROL super melihat4. Role CRUD/self-reactivation/self-assignment harus tetap ditolak; spoof metadata/UI tidak menambah role; refresh/logout/revocation mengikuti sesi dan DB permissions. Matrix lengkap [CSV](qa/phase4a/remediation-a/access-matrix.csv) memisahkan identity/state, expected/actual; seluruh actual kosong/NOT_RUN. Tidak ada report fixture atau tes B/C1.

## Policy A dan temuan script

**PASS statis least privilege:** A hanya SELECT TO authenticated, row role harus assigned ke auth.uid() lewat FK roles/profile/assignment dan profil aktif. Tidak menambah role write/assignment/provisioning, tidak mengubah helper/grants, tidak meluaskan staff-table policies. Existing active-super policy tetap melihat4role; inactive-super tidak lolos helper. Foreign UID check dan MULTI union harus diuji, bukan hanya login berhasil. Proposal A asli tidak diubah.

**FAIL lama diperbaiki lokal:** dry-run sebelumnya mengambil substring CREATE POLICY dari komentar, sehingga menyisakan baris `CREATE POLICY deliberately ...` yang bukan SQL dan BEGIN kedua. Rehearsal dibangun ulang memakai hanya executable CREATE POLICY bernama tepat di awal baris, dengan satu BEGIN/satu ROLLBACK. Pemeriksaan lokal kini menolak fragmen komentar tersebut dan nested transaction wrapper. Tidak mengubah database atau melaporkan rehearsal PostgreSQL PASS.

**Idempotensi:** file fixture bukan upsert/migration idempoten terhadap schema persisten; ia rehearsal transaksional yang **repeatable setelah rollback terkonfirmasi**, memakai dua Auth UUID sama yang provenance-nya sudah diverifikasi. Null/duplikat UUID, label tidak sesuai, akun tidak ada, profil/assignment existing, policy A sudah ada atau baseline drift menghentikan script. Tidak DROP unknown policy, ON CONFLICT overwrite atau membersihkan existing account. Jika run sebelumnya error/timeout, pastikan transaksi lama berakhir dan state kembali melalui checkpoint yang sudah tersedia sebelum retry. Jangan melewati guard profiles0 dengan DELETE massal.

SQL menyimpan app fixture sementara; hanya SUBJECT dan CONTROL dari manifest yang boleh ditulis saat pergantian state. Semua DML dan policy baru dibatalkan akhir ROLLBACK. Akun Auth yang dibuat di luar transaksi tetap ada. Guard mensyaratkan staging acknowledgement/ref dan manifest ref yang sama, run ID serta approval; semua placeholder gagal tertutup. **Custom settings bukan bukti identitas server**: operator harus mencocokkan Dashboard name/ref/endpoint staging secara independen. Ref aktual belum diberikan, sehingga tidak ada klaim pengamanan kriptografis yang mengenali dev otomatis.

## Provisioning aman - prosedur setelah approval, bukan tindakan sekarang

1. Catat verified Dashboard project **rekansiaga-staging**, project ref dan endpoint; cocokkan dengan manifest. Jangan mengambil target dari config React/Flutter. Setujui run ID, dua akun dan izin fixture state transitions; approval fixture tidak sama dengan approval migration A.
2. Gunakan Auth Dashboard/admin workflow yang disetujui, hanya di staging. Buat dua identitas sintetis dengan label CONTROL/SUBJECT serta email/credential khusus test yang dikelola privat; jangan undang/kirim email ke orang nyata, menyalin dev atau INSERT auth.users. Admin createUser hanya server/trusted operator, bukan frontend ([Supabase createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser)). Tidak menyiapkan script auto-provisioning atau menjalankannya.
3. Jika email/account sudah ada: **STOP dan cocokkan ledger run, project ref, UID dan provenance**. Boleh reuse hanya akun sintetis milik manifest run terdahulu yang disetujui. Unknown collision bukan izin reset password, mengganti metadata/role, menghapus lalu create, atau memilih akun biasa yang sudah ada. Jika request create timeout, cari hasil request itu di Auth Dashboard/ledger sebelum retry, jangan menciptakan akun duplikat. Email prefix saja bukan bukti provenance.
4. Simpan UUID aktual dan project ref pada manifest privat. Template tracked tetap null/approvalfalse; password, key, JWT, refresh token dan email tidak masuk source/CSV. Dua UID harus berbeda dan Auth users tersedia sebelum rehearsal. Verifikasi `/auth/v1/user` dengan masing-masing JWT kelak sesuai UID, bukan hanya decode token.
5. App profile/assignment **belum dipersistenkan** saat provisioning. Rehearsal memerlukan nol profile/assignment app pada target baseline; jika sudah ada, hentikan, review lifecycle fixture tanpa menghapus data. Auth users baru tidak otomatis membuat role atau profil admin melalui paket ini. Jika Auth provisioning memicu hook lain yang membuat profil, guard harus gagal dan hook tersebut ditinjau, bukan diabaikan.

## Tiga tahap yang terpisah

| Tahap | Write/scope | Bukti / gate |
| --- | --- | --- |
| Persiapan fixture | Provision2Auth di staging setelah approval; ledger+UID. Belum apply A | Approval/target/UUID/provenance lengkap; tidak ada actual hasil test |
| SQL dry-run | Exact A policy + serial states di satu transaksi berakhir ROLLBACK | SQL role/claims simulation saja. SET ROLE mengubah principal SQL, bukan validasi JWT ([PostgreSQL SET ROLE](https://www.postgresql.org/docs/17/sql-set-role.html)). Simpan state/principal results dan rollback |
| Persistent A dan JWT/API | Hanya setelah dry-run, review hasil dan approval release A-only/fixture persisten terpisah | HTTP real JWT sesuai identity+state; no service_role principal; negative/self/foreign/same-role/session cases accepted sebelum A VALIDATED |

Dry-run checkpoint baru setelah state restore: **27policies,1CONTROL profile,1CONTROL assignment**, SUBJECT kembali USER. Saat MULTI maksimum2profiles/3assignments. Setelah ROLLBACK: **26policies,0app profiles/assignments**; kedua Auth account tetap ada. State CROSS_RV harus dipulihkan sebelum checkpoint. SQL dry-run belum diuji runtime; assertion failure bukan alasan mengganti expected.

Jangan menempelkan API tests dari koneksi lain ke transaksi belum committed; API tidak melihat state rehearsal tersebut. Setelah dry-run PASS direview, siapkan approved persistent A-only release baru tanpa mengubah ROLLBACK file rehearsal. Pada tahap API, operator mengubah fixture satu state per batch committed, mencatat expected state, baru menjalankan request; state dipulihkan bila case selesai. Reuse JWT yang UID-nya valid memungkinkan menguji DB revocation; refresh/logout cases dicatat terpisah, tidak menganggap instant JWT revoke. Tidak mengubah React/Flutter; frontend smoke tetap BLOCKED jika belum ada lingkungan UI staging yang terisolasi.

Rollback rehearsal tetap hanya menghapus exact policy A yang reviewed di transaksi ROLLBACK, bukan cleanup akun. Persistent rollback memerlukan approval baru, mempertahankan super policy/helper/grants dan kembali26policies. Cleanup hanya dua UUID milik manifest dengan persetujuan; tidak drop/reset schema atau dev.

## Urutan ringkas dan tindakan manual berikutnya

**Approve manifest2akun → provision/reuse terverifikasi → isi UUID/ref pada salinan rehearsal → dry-run ROLLBACK → review hasil → approve A-only persistent release → JWT/API matrix per state → acceptance A.** B/C1 tetap ON HOLD sampai A tervalidasi.

**Satu tindakan operator sekarang:** lengkapi dan setujui **manifest rencana dua akun** dengan verified staging project reference serta run ID. Biarkan UUID belum terisi sampai provisioning yang disetujui dilakukan; jangan membuat akun atau menjalankan SQL pada langkah review ini. Template: [fixture-manifest.template.json](qa/phase4a/remediation-a/fixture-manifest.template.json).

## QA lokal

[Readiness checks](qa/phase4a/remediation-a/readiness-review.json): bounded SQL lexer memisahkan top-level statements, memastikan satu BEGIN/final ROLLBACK dan satu exact executable policy (tanpa komentar rusak/nested wrapper). Dua identity/sembilan ordered states, NULL UUID/approvalfalse, matrix NOT_RUN, proposal checksum dan link checks PASS. Ini bukan SQL parser PostgreSQL atau runtime test. Lint/build PASS exit0; main585.95kB/gzip171.03kB dengan warning bundle>500kB. Tidak ada provisioning, SQL Cloud atau API execution.
