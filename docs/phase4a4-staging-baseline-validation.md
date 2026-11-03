# Phase 4A.4 - Staging baseline validation

## Closure Phase4A.4

[Final baseline audit](phase4a4-final-baseline-audit.md) kini menutup metadata sebagai **BASELINE VERIFIED WITH KNOWN SECURITY FINDINGS** setelah final gaps diterima:200defaults,24membership options,27schema privilege pairs dan database capabilities direview.33 default text/resolution deltas dicatat, bukan diasumsikan byte-identical. Phase4A tetap BLOCKED karena temuan keamanan dan runtime. [Paket Remediation A](phase4a-remediation-a-test-plan.md) disiapkan lokal,fixture/API actual NOT_RUN. B/C1 ON HOLD hingga A tervalidasi. Status/permintaan gap audit lama berikut adalah riwayat; tidak perlu query baseline tambahan sekarang.

## Pembaruan final evidence review

Tiga ekspor live pasca-deployment kini tersedia dan seluruhnya ditinjau: supplemental, full security audit dan event graph. [Laporan final baseline](phase4a4-final-baseline-audit.md) menggantikan status hasil-detail-belum-tersedia pada riwayat di bawah. Exact 26 tabel/200 kolom type-nullability/106 constraints/61 indexes/26 policies/52 table grants/400 column privilege pairs/5 app functions/6 triggers/seeds cocok; event graph identik. Column defaults dan per-membership PG17 options belum diekspor. Policy roles super-only, review NULL/reason dan broad future defaults tetap temuan terbuka. API/concurrency tidak diuji; **Phase 4A tetap BLOCKED**, bukan blanket security PASS.

Tanggal pencatatan: **23 Oktober 2026, Asia/Jakarta**. **Baseline detail BLOCKED menunggu ekspor hasil; Phase 4A tetap BLOCKED.** Deployment permanen staging telah dilaporkan dijalankan manual oleh pengguna. Tidak ada SQL remote, remediation, fixture, Docker atau perubahan konfigurasi React/Flutter yang dijalankan Codex. Rekansiaga-dev tidak disentuh.

## Bukti yang tersedia dan yang belum tersedia

[Catatan laporan pengguna](audits/phase4a4-staging-baseline-user-report.json) menyimpan provenance enam hasil query yang dilaporkan: tabel 26, RLS 26, routines 6, policies 26, roles 4, sources 2. Pengguna juga melaporkan validator berhasil dieksekusi setelah cast roles diperbaiki. Ini **USER-REPORTED DIRECT QUERY / EXECUTION**, bukan ekspor hasil SQL yang diperiksa Codex. Project reference, checksum SQL yang benar-benar diterapkan, log COMMIT, waktu capture dan result sets lengkap belum diberikan. Tidak menyamakan keberhasilan script dengan kosongnya mismatch arrays.

File audit yang tersedia saat review: metadata/fungsi **dev**, comparison Master offline, inspeksi event trigger staging **sebelum deployment**, checkpoint **dry-run**, local deployment preparation review, dan laporan preflight pengguna. Tidak ditemukan ekspor manifest/full grants/event graph **setelah deployment permanen**. Hasil dev tidak diberi label ulang menjadi staging; checkpoint rollback tidak menjadi bukti persisten; review JSON lokal bukan hasil Supabase. Bukti sintetis/UI terdahulu tidak menutup authenticated API staging.

Seluruh dokumen Phase 4A.3, SQL staging, manifest, Master comparison, proposal A/B/C1/C2 dan runbook remediation dibaca/diperiksa. Referensi: [preparation](phase4a3-staging-preparation.md), [deployment](phase4a3-staging-deployment.md), [event review](phase4a3-event-trigger-final-review.md), [remediation/validation](phase4a-remediation-validation.md), [authentication](authentication.md), [laporan final](phase4a-final-report.md). Status historis “deployment belum dilakukan/staging belum tersedia” digantikan laporan pengguna ini; status verifikasi detail/API belum menjadi PASS.

## Review validator lokal

- [Validator utama](sql/staging/phase4a3-post-deployment-validation.sql) **sudah menyimpan** `e.roles IS DISTINCT FROM p.roles::text[]`. Tidak perlu mengulang perbaikan hanya di SQL Editor. `pg_policies.roles` bertipe **name[]**, sedangkan manifest memakai **text[]**; cast eksplisit menyamakan tipe ([katalog PostgreSQL](https://www.postgresql.org/docs/17/view-pg-policies.html)).
- [Validator struktur terpisah](sql/staging/phase4a3-validate-structure.sql) masih mempunyai perbandingan tanpa cast saat review; **FAIL lokal tersebut diperbaiki** dengan cast yang sama. Filter NOT NULL pg_constraint juga diselaraskan dengan validator utama; nullability tetap diperiksa melalui kolom. Tidak ada perubahan tabel/policy/fungsi/grants remote atau definisi bootstrap.
- Array daftar tabel sudah text[] dengan urutan C eksplisit; daftar signature cast ke regprocedure; evttags dibandingkan text[]. Perbandingan roles masih membandingkan urutan/dimensi array, bukan set bebas urutan. Jika mismatch, periksa output mentah; jangan mengganti expected agar cocok tanpa review ([perbandingan array PostgreSQL](https://www.postgresql.org/docs/17/functions-array.html)).
- Manifest memuat **26 tabel, 200 kolom, PK26/FK33/UNIQUE13/CHECK34 (106), 61 indeks, 26 policies, 52 pasangan grants anon/authenticated, lima fungsi aplikasi**. Helper event existing adalah fungsi keenam dan diperiksa terpisah. Enam row triggers berbeda dari global ensure_rls.
- Hard assertions sebelum manifest memeriksa counts/nama/owner/RLS/signature/seed/helper; error di sana menghentikan transaksi sebelum detail. Perbandingan detail kemudian mengeluarkan arrays/flags; tidak otomatis RAISE untuk setiap mismatch. Semua result sets perlu dibaca. Sukses eksekusi saja bukan manifest PASS.
- Normalisasi whitespace/schema/type casts adalah pembandingan teks terbatas, **bukan parser atau bukti ekuivalensi semantik**. Penghapusan whitespace juga dapat menyamarkan perubahan di dalam string literal. Tinjau raw definitions dari audit tambahan terhadap source approved. Function-check utama memilih nama, sehingga tetap cocokkan exact signature/result/owner/config dan jumlah routine, bukan satu boolean body saja.
- Validator utama read-only dan berakhir ROLLBACK; ROLLBACK tersebut tidak membatalkan deployment yang sudah COMMIT. Validator baseline mensyaratkan fixture counts nol: jalankan **sebelum fixtures/remediation**. Setelah A, expected policies menjadi 27; setelah B, body RPC harus berubah; setelah fixtures, counts nol tidak berlaku. Jangan menganggap kegagalan manifest baseline lama sebagai regresi tanpa memperhatikan versi.

## Matriks PASS / FAIL / BLOCKED

| Pemeriksaan | Expected / bukti | Actual yang tersedia | Status |
| --- | --- | --- | --- |
| Deployment permanen | COMMIT di staging yang dikonfirmasi | Pengguna menyatakan selesai manual; log/ref/checksum belum diekspor | PASS user-reported deployment; identitas/provenance lengkap BLOCKED |
| Enam agregat | 26/26/6/26/4/2 | Angka direct-query dilaporkan pengguna | PASS user-reported, scope count saja |
| Eksekusi validator | Seluruh batch tanpa error | Dilaporkan sukses setelah cast | PASS user-reported execution; isi result sets BLOCKED |
| Cast validator utama | p.roles::text[] tersimpan lokal | Ditemukan di file lokal | PASS pemeriksaan lokal |
| Cast validator terpisah | Tipe array sama | Tanpa cast ditemukan, lalu diperbaiki lokal | FAIL lama ditangani lokal; runtime versi perbaikan NOT TESTED |
| Struktur lengkap | Semua nama/200 kolom/default/nullability sesuai, raw definitions reviewed | Belum ada result detail staging | BLOCKED |
| PK/FK/UNIQUE/CHECK | 26/33/13/34, target/action/predicate valid | Hanya manifest/source dan snapshot dev | BLOCKED staging |
| Indeks | 61 definitions cocok, valid/ready, tanpa extra tak dikenal | Belum ada hasil staging | BLOCKED |
| Policies | 26 nama/command/roles/USING/WITH CHECK/permissive sesuai baseline | Count 26 saja | BLOCKED detail |
| Effective grants | Table/column/schema/PUBLIC/inherited, EXECUTE dan default ACL sesuai intended callers | Belum ada audit pasca-deployment | BLOCKED |
| Routines/row triggers | 5 app + helper, exact signatures/result/owner/path/ACL/body, 6 trigger definitions/enabled | Count 6 routines saja | BLOCKED detail |
| Seeds | Exact empat role code/name/description dan dua source config, tidak ada assignment otomatis | Count 4/2 saja | BLOCKED detail |
| Helper/event preservation | Complete event graph/ACL/OIDs/dependencies sama reviewed baseline | Inspeksi pre-deploy dan dry-run saja | BLOCKED pasca-COMMIT |
| Identitas/isolasi fixture | Dashboard ref + nonoperational staging + approved synthetic identities | Nama project dilaporkan; fixture belum disetujui | BLOCKED |
| Authenticated API/session/concurrency | Semua positive/negative/atomicity cases relevan | Belum ada hasil staging | BLOCKED |

Tidak ditemukan bukti kegagalan akses API staging aktual karena hasil request belum tersedia. **FAIL statis kontrak baseline** di bawah tidak disamakan dengan exploit yang sudah direproduksi di staging. Tidak ada blanket PASS keamanan.

## Temuan keamanan yang masih terbuka

| Temuan | Bukti / dampak | Penanganan / status |
| --- | --- | --- |
| META-01 role read super-only | Source baseline dan snapshot dev memakai roles_staff_read super-only; limited staff role-query chain tidak terpenuhi | FAIL statis kontrak limited-role; konfirmasi staging lewat audit. A belum dilaporkan diterapkan |
| META-02 input review NULL/reason | Body baseline tidak menolak status NULL secara eksplisit; alasan tidak divalidasi. Role/active helper, row lock dan atomic history ada secara statis | FAIL statis validasi; B proposal. Business rule alasan/4000 karakter perlu sign-off, bukan diasumsikan disahkan |
| META-02 anonymous EXECUTE | Snapshot dev dahulu luas; bootstrap staging memiliki cleanup intended callers | **Unknown aktual staging**, jangan menyalin FAIL grants dev. Expected anon/PUBLIC false pada lima app routines; helper event ACL existing ditinjau terpisah |
| META-03 future defaults | Bootstrap tidak mengubah default ACL; C1 belum dilaporkan diterapkan | Open, actual defaults/creators harus diekspor. Missing pg_default_acl row dapat berarti built-in PUBLIC EXECUTE, bukan deny |
| Provider owner / C2 | C1 hanya creator postgres, global function scope mencakup seluruh schema; managed creator dapat berbeda | C2 tetap BLOCKED terpisah, tidak termasuk urutan A/B/C1 |
| Recursion / privilege escalation | Helper membaca UID/profil aktif/assignments/roles, owner postgres menghindari policy recursion pada snapshot FORCE=false | PASS statis lama bersyarat; actual owner/FORCE/path/schema CREATE/inherited privileges harus diperiksa fresh dan via JWT |
| Event helper soft-failure | Body reviewed menelan error sebagai LOG | Explicit RLS wajib, counts tidak membuktikan predicate/privilege aman; full graph preservation belum dibuktikan setelah COMMIT |
| API/edge/session | No evidence authenticated role negatives, submit/track rate limits, logout replay/expiry, role revocation in-flight dan concurrency | BLOCKED, tidak diganti SQL owner/SDK mock |

**Akun biasa belum dinyatakan dibatasi dengan benar pada staging berdasarkan API nyata.** Source RLS/helper menunjukkan intended denial, tetapi admin/owner SQL dapat bypass RLS dan tidak membuktikan keputusan JWT pengguna. RLS SELECT dapat sukses HTTP 200 dengan []: perlu fixture target diketahui ada, bukan mensyaratkan selalu HTTP 403. Public published data yang sah bukan privilege escalation.

## SQL Editor berikutnya - hanya READ ONLY

Pastikan Dashboard **rekansiaga-staging + actual project reference**, fresh trusted postgres session, tanpa concurrent DDL/fixtures. Nama database postgres bukan bukti target. Jangan menjalankan ulang bootstrap/deployment/verification rollback pada database yang sekarang berisi 26 tabel; guard memang akan menolak nonempty target. Tidak memakai atau mengubah .env.local/Flutter untuk menentukan koneksi.

1. Jalankan seluruh [validator utama](sql/staging/phase4a3-post-deployment-validation.sql), simpan JSON `phase4a3_staging_structure` dan seluruh result seed/counts secara privat. Nama hasil yang disarankan `docs/audits/phase4a4-staging-structure-results.json`. File hasil tersebut **belum tersedia**; jangan mengisi expected sebagai actual. Expected mismatch arrays kosong; table_security 26 benar; lima function checks cocok; enam raw trigger definitions/enabled direview.
2. Jalankan [query tambahan baru](sql/staging/phase4a4-baseline-supplemental-readonly.sql), simpan satu JSON sebagai `docs/audits/phase4a4-staging-supplemental-results.json`. Query tidak memanggil RPC aplikasi, tidak membuat probe atau membaca row staf/laporan; hanya katalog/definisi, seed statis dan aggregate fixture counts. Ia mengeluarkan raw constraints/index/policies, exact function/body/owner/path/ACL/result checks, column ACL, schema CREATE/USAGE, default ACL lintas schema dan exact seed config. Metadata code diperiksa privat sebelum dibagikan; bukan security PASS otomatis.
3. Jalankan [full security audit](sql/phase4a-security-audit.sql), simpan `docs/audits/phase4a4-staging-security-audit.json`. Review effective table/column grants, role membership, superuser/bypass flags, schema privileges, defaults global/schema per creator dan exposed schema di Dashboard. Service_role bypass RLS adalah kemampuan backend yang harus tetap privat, bukan token uji akun biasa. C1 baru dapat direview setelah inventory ini lengkap.
4. Jalankan [inspector event graph](sql/staging/phase4a3-inspect-rls-auto-enable.sql), simpan `docs/audits/phase4a4-staging-event-trigger-review.json`. Bandingkan complete graph, helper definition/config/owner/ACL/OID, ensure_rls owner/link/O/tags/deps terhadap [snapshot reviewed](audits/phase4a3-existing-event-trigger-review.json). Fingerprint cocok hanya drift check; perubahan graph memerlukan review body/deps ulang, bukan auto-update hash. Helper MD5 expected 846ec2fbff751d24b890656d63c3a9bf; graph MD5 expected 7fe832217540802b68d6d56c6ba30f47 pada snapshot yang sama.
5. Untuk tiap ekspor, sertakan project ref yang dikonfirmasi operator, capture time, executing role, SQL file SHA256 dan versi PostgreSQL. Simpan semua result sets; SQL Editor dapat hanya menonjolkan hasil terakhir. Jangan kirim JWT, password, service key atau data pengguna. Setelah detail diterima, klasifikasikan per mismatch/privilege; jangan mengklaim kosong tanpa membaca hasil.

Semua file di atas memakai transaksi READ ONLY/ROLLBACK. Query baru **belum diuji pada PostgreSQL** oleh Codex. Jika error, ROLLBACK sesi sama bila masih terbuka, simpan error sanitasi dan perbaiki proposal lokal; jangan mengubah database/grants untuk membuat validator lulus.

## Remediation bertahap dan review rollback

Tidak ada penerapan A/B/C1 yang diizinkan/dijalankan oleh laporan ini. Keberadaan staging tidak otomatis mengizinkan fixture mutations atau penerapan proposal. File proposal tetap ROLLBACK; jangan mengganti penutupnya. Tiap tahap berhenti jika actual tidak sesuai atau backup/approval belum lengkap.

| Urutan | Prasyarat dan tindakan yang kelak disetujui | Expected / test gate | Rollback / containment yang direview |
| --- | --- | --- | --- |
| 0 baseline | Lengkapi empat ekspor read-only, close mismatch kritis; catat target/versi/backup policies+function owner/body/ACL+global/schema default ACL | Baseline detail accepted dengan known findings terdaftar; inventaris creator aktual lengkap | Belum ada perubahan. Unknown COMMIT/drift → stop, jangan rerun/drop/reset |
| 1 fixtures | Persetujuan synthetic fixture manifest, isolasi staging tanpa pengguna/jobs operasional; provision akun Auth baru melalui mekanisme Auth, profil/assignment oleh operator berwenang | SA, IM, RV-A/RV-B, ME, USER tanpa profil, INACTIVE verifier, NO-ROLE, MULTI; known foreign rows; laporan sintetik baru per kasus. Tidak copy dev/PII | Cleanup hanya IDs/objek dari manifest yang disetujui; SQL ROLLBACK tidak membatalkan HTTP transaction lain |
| 2 A | Review [proposal A](sql/proposals/phase4a-01-assigned-role-read.sql), helper owner/FORCE/body dan self policies fresh. Rehearsal rollback-only, kemudian deployment staging terpisah hanya jika disetujui | Policies 27 = baseline26 + own-assigned policy; SA tetap dapat membaca, active limited hanya role sendiri; USER/inactive/no-role/foreign deny; tanpa recursion atau role assignment otomatis | Jika sudah committed, operator approved DROP **hanya policy baru** setelah identitas/definition dikonfirmasi; baseline super policy dipertahankan. Limited-role login kembali gagal; catat dampak. Tidak DROP tabel/disable RLS |
| 3 B | Sign-off reason (NULL tetap opsional? rejected wajib alasan? batas4000/Unicode), Web/Flutter/backend; backup aktual function/owner/ACL. Review [proposal B](sql/proposals/phase4a-02-review-rpc-execute.sql) terhadap staged current function, bukan snapshot dev saja | UID/active/SA-or-verifier, NULL ID/status, transitions/reason, row lock/atomic history; anon/PUBLIC EXECUTE false; auth/service existing sesuai contract. Body hash baseline berubah secara sengaja | Pre-COMMIT error → ROLLBACK. Setelah COMMIT: hentikan review flow dan roll-forward reviewed fix/compatible caller. Jangan restore body NULL-gap atau anon EXECUTE dari backup lama. Restore version harus mempertahankan security floor/lock/history/owner/path |
| 4 C1 | Review [proposal C1](sql/proposals/phase4a-03-future-object-defaults.sql) setelah inventory global+semua schema/creator; approval scope postgres new functions ALL schemas dan workflow provider/backend | Existing ACL/owner/body/data/policies sama dengan post-B; hanya defaults berubah. Approved disposable table/sequence/safe function probes dibuat **sebagai postgres**, public dan schema uji lain untuk global scope; client/PUBLIC deny kecuali grant eksplisit approved | Hentikan object creation; reviewed explicit minimal grants/creator-workflow fix. Jangan otomatis restore broad defaults. Jika default harus direvisi, gunakan backup exact yang direview; objek yang sudah dibuat perlu audit ACL terpisah |

C1 bergantung pada **creator aktual**, bukan sekadar role membership; ia tidak mengubah objek existing. Schema-specific function grants pada schema lain dapat tetap memberikan EXECUTE meski global grant dicabut. Uji public dan schema lain dibutuhkan untuk scope tersebut. Global/schema defaults dan managed provisioning harus direview sebelum approval ([PostgreSQL default privileges](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html)). C2 managed owner tidak ikut otomatis; jika belum disetujui, catat risiko tersisa, jangan gunakan elevated credentials untuk memaksanya.

Masing-masing proposal rollback-only hanya rehearsal DDL. Uji HTTP dari koneksi lain **tidak melihat perubahan yang belum COMMIT**. Oleh karena itu A → validasi nyata → B → validasi nyata → C1 → validasi nyata memerlukan release staging terpisah yang direview/disetujui per tahap. Jangan menjalankan file baseline strict setelah menambah fixtures/remediation; buat expected manifest versi tahap berdasarkan diff approved, tanpa mengubah actual agar terlihat PASS.

## Matriks API dan concurrency - semua actual belum diuji

Setiap request memakai JWT aktor uji masing-masing, bukan postgres/service_role. Owner hanya provisioning dan verifikasi expected state; jangan log Authorization/refresh token. Rekam project/ref, stage/hash, actor label, waktu, HTTP + SQLSTATE, sanitized response, fixture IDs dan state/history sebelum-sesudah. Detail cases tetap mengikuti [matriks lengkap sebelumnya](phase4a-remediation-validation.md).

| Gate | Expected | Actual / status |
| --- | --- | --- |
| SA login, refresh, deep link | Identity valid + profil aktif + super role database, akses sesuai policy | Belum dijalankan / BLOCKED |
| USER, NO-ROLE, INACTIVE | Auth boleh valid, admin deny; role/profile/assignment write ditolak; tidak dapat memverifikasi laporan | Belum dijalankan / BLOCKED |
| IM / RV-A / RV-B / ME / MULTI setelah A | Hanya assigned roles terbaca; IM content, RV reports, ME guidance, MULTI union IM/ME; cross-role/foreign staff denied | Belum dijalankan / BLOCKED |
| Anonymous | Public published content saja; staff/private reports denied; review RPC denied ACL | Belum dijalankan / BLOCKED |
| Logout, refresh, role/active revocation | Cache/route revalidated; request baru memakai DB permissions. Catat JWT replay sampai expiry/in-flight behavior, jangan asumsikan instant revocation | Belum dijalankan / BLOCKED |
| B input dan transisi | SA/RV success true + satu history/actor tepat; missing valid UUID false; unauthorized 42501; NULL/invalid/status terminal/reason invalid 22023 dan nol perubahan. Kebijakan NULL reason sesuai sign-off | Belum dijalankan / BLOCKED |
| Atomicity failure injection | Pada fixture disposable approved, gagalnya history membatalkan perubahan status/actor/time/history seluruhnya | Belum dijalankan / BLOCKED, fault-injection approval diperlukan |
| CC-01 terminal vs terminal | Dua verifier bersamaan atas laporan sama: satu sukses, satu invalid transition; tepat satu history | Belum dijalankan / BLOCKED |
| CC-02 under_review vs verified dari unverified | Jika under_review menang dulu, dua sukses sah dengan dua history berantai; jika verified dulu, satu sukses dan satu gagal | Belum dijalankan / BLOCKED |
| CC-03 dua laporan berbeda | Transisi sah independen, tidak ada global lock buatan | Belum dijalankan / BLOCKED |
| C1 defaults/probes | Existing ACL tidak berubah; future object creator/scope sesuai, probe aman tanpa grants tidak bisa client invoke; intended explicit grant bekerja | Belum dijalankan / BLOCKED |

Concurrency memakai dua JWT dan koneksi berbeda, fresh synthetic report per percobaan, dengan overlap dibuktikan (coordinator row lock approved lalu ROLLBACK; inspeksi locks privat), bukan request berurutan. Jangan memodifikasi function production untuk menambahkan sleep. Catat isolation/timeouts/deadlocks; jangan menyembunyikan kegagalan dengan retries. Semua mutation hanya di staging terisolasi setelah approval fixture; bukan laporan operasional existing.

## Keputusan acceptance

Deployment/counts/eksekusi berhasil **PASS USER-REPORTED dalam scope masing-masing**; cast utama PASS lokal dan bug validator alternatif sudah ditangani lokal. Manifest detail, effective authorization, actual staging function/default ACL/event preservation dan authenticated API/concurrency tetap **BLOCKED**. Known baseline contract findings tetap terbuka sampai remediation dan pengujiannya terbukti. **Staging belum dinyatakan READY dan Phase 4A belum COMPLETE.**

## QA lokal dan provenance versi

Lint/build PASS exit 0; main 585.95 kB/gzip 171.02 kB dengan warning chunk >500 kB tetap. [Review lokal](audits/phase4a4-local-review.json) mencatat cast/manifest parity, expected hashes, batas read-only/ROLLBACK, link dan source SHA256. Query tambahan tidak dikompilasi/dijalankan PostgreSQL; local lexical checks bukan bukti runtime.

Checksum validator utama saat ini berbeda dari catatan local review Phase 4A.3 lama. File utama telah ditinjau dan tidak diubah pada task ini; perbedaan tidak diasumsikan hanya formatting atau hanya cast tanpa versi byte lama. Checksum proposal deployment dan final verification masih cocok catatan lama. Catat exact checksum SQL yang dijalankan operator pada ekspor berikutnya; jangan menggunakan arsip checksum lama untuk mengklaim kesamaan revision SQL Editor. Ini keterbatasan provenance, bukan bukti perubahan database remote.
