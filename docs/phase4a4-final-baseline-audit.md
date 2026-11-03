# Phase 4A.4 - Final baseline evidence review

## Closure final - 23 Oktober 2026

**Phase 4A.4: BASELINE VERIFIED WITH KNOWN SECURITY FINDINGS. Phase 4A: BLOCKED.** Keputusan ini menutup verifikasi kontrak baseline berdasarkan seluruh ekspor live yang disediakan, bukan acceptance keamanan/runtime aplikasi. [Paket Remediation A](phase4a-remediation-a-test-plan.md) siap direview; belum diterapkan atau diuji. **B dan C1 ON HOLD sampai A diuji dan divalidasi.** Tidak ada SQL Cloud/dev/config React/Flutter diubah; tidak dibuat query audit baseline tambahan.

[Final gaps JSON](audits/phase4a4-final-readonly-gaps.json), capture **23 Oktober 00:56:00 WIB**, PostgreSQL17.11/postgres/read-only, telah dibaca bersama seluruh JSON Phase4A.4 dan laporan sebelumnya. Nama file aktual berbeda dari nama output yang pernah disarankan, tetapi content kind/key sesuai query gap. Ekspor live adalah hasil pengguna; offline comparison lokal bukan query Cloud yang dijalankan Codex. Dashboard ref/exposed schema tetap attestation/operator verification sebelum test, bukan identitas yang dibuktikan current_database=postgres.

| Pemeriksaan closure | Bukti / hasil | Status |
| --- | --- | --- |
| Struktur/constraints/index/policy/fungsi/grants/seeds/event preservation | Sepuluh comparison groups sebelumnya tetap nol missing/extra/different; app bodies/owner/path/ACL cocok, event graph identik | PASS metadata |
| Coverage defaults | Exact200 kolom; type/nullability konsisten ekspor sebelumnya; identity/generated kosong seluruhnya | PASS |
| Default expressions |167 sama secara tekstual;10 literal mendapat ::text;23 UUID bound extensions.gen_random_uuid | PASS kontrak baseline dengan33 reviewed deltas, bukan byte-identical |
| Membership options |24edges konsisten dengan full audit termasuk admin_option; anon/authenticated tidak punya parent grant; authenticator?anon/authenticated/service_role SET=true, INHERIT=false, ADMIN=false | PASS metadata delegasi; tidak ada reverse privilege path dari client |
| Schema privileges |27pairs (9schemas?3roles), CREATE=false semua; public/auth/extensions/graphql/graphql_public/realtime/storage USAGE bagi anon/auth, pgbouncer/vault deny; service vault USAGE=true | PASS inventory/batas client CREATE; USAGE bukan izin membaca semua data |
| Database privileges |anon/authenticated/service CREATE=false, TEMPORARY=true | PASS inventory; TEMP dicatat sebagai capability/residual, bukan bukti API arbitrary SQL |
| Role policy baseline |Super-only masih live; limited staff tidak bisa membaca own role chain | FAIL security/business contract terbuka untuk A |
| Review/default ACL findings |NULL/reason body gap, future defaults luas dan storage exception belum berubah | FAIL/security findings terbuka; B/C1 tidak dimulai sekarang |
| Real JWT/session/negative writes/concurrency/atomicity |Belum ada actual results | BLOCKED; bukan syarat menutup metadata baseline, tetap syarat Phase4A |

**Default resolution ditinjau khusus, tidak dinormalisasi membabi buta:** source gen_random_uuid() dibentuk dengan reviewed search_path public,extensions,pg_catalog; katalog mengikat23kolom ke extensions.gen_random_uuid(). Ini bukan perubahan default ke schema tak dikenal; extensions owner postgres dan client CREATE=false sesuai ekspor. PostgreSQL mendokumentasikan pgcrypto gen_random_uuid sebagai wrapper core UUID function ([pgcrypto](https://www.postgresql.org/docs/17/pgcrypto.html)); dokumentasi tersebut tidak membuktikan implementasi/provenance wrapper pada project ini. Binding yang diekspor diterima untuk kontrak default UUID baseline; kesamaan implementasi/hasil runtime tidak diklaim. Batas kepercayaan provider/DBA dan tes runtime tetap berlaku. Tidak mengganti UUID defaults remote atau meminta audit tambahan untuk menghilangkan perbedaan teks. Validator SQL lama dapat menampilkan23 qualification deltas tersebut; rujuk accepted deltas pada [review terstruktur](audits/phase4a4-final-evidence-review.json), bukan mengubah database agar output kosong.

Sepuluh literal ::text hanya diterima ketika expected kolom bertipe text dan literal persis sama; NULL/bool/angka/now() tidak diubah. Tidak ada unexpected default expression, identity atau generated column pada ekspor ini. Hasil comparison diulang offline dengan source approved; tidak invoke default functions.

Membership options kini benar-benar tersedia; tidak lagi BLOCKED karena kekurangan ekspor. Privileged/platform members seperti postgres/realtime/storage bukan role yang diwarisi anon/auth; arah grant serta SET/INHERIT harus dibaca benar ([pg_auth_members](https://www.postgresql.org/docs/17/catalog-pg-auth-members.html)). Authenticator delegation adalah kemampuan backend, bukan cara client memilih service_role tanpa JWT valid. JWT validation belum diuji. TEMP=true tidak sama dengan CREATE persistent schema atau akses SQL Editor dari Data API; pertahankan trusted session tanpa temp objects untuk rehearsal dan review definer paths. Tidak mencabut TEMP atau mengubah managed role pada task ini.

**Temuan tersisa yang dibawa ke tahap berikutnya:** A limited-role read; B NULL/reason/input-contract dan runtime; C1/C2 broad future defaults termasuk explicit postgres storage-schema grants; existing event helper broad EXECUTE/soft-failure behavior; platform wrapper/capability scope; Data API exposed-schema confirmation; real JWT/RLS/session/logout/replay/in-flight behavior, atomicity/concurrency dan Edge rate-limit. Snapshot bukan bukti keadaan Cloud selalu fresh. Semua itu terpisah dari kelengkapan metadata kontrak baseline.

**Next step tunggal:** review/approve synthetic fixture + dry-run A dalam [runbook A](phase4a-remediation-a-test-plan.md). Tidak perlu audit baseline berulang tanpa drift atau bukti baru. Auth accounts/fixture/policy belum dibuat Codex; seluruh actual matrix tetap NOT_RUN. Remediation B/C1 hanya boleh dibahas implementasi/diuji setelah acceptance A ditandatangani.

## Riwayat audit sebelum final gap tersedia

Bagian berikut mempertahankan bukti/keputusan sebelum closure. Pernyataan defaults/membership BLOCKED atau permintaan menjalankan gap query di bawah telah ditutup/digantikan bagian closure di atas; API dan security findings tetap terbuka.

Tanggal review: **23 Oktober 2026, Asia/Jakarta**. **Kontrak baseline cocok pada metadata yang tersedia; baseline masih memiliki temuan keamanan. Phase 4A tetap BLOCKED.** Belum ada authenticated API/concurrency acceptance. Tidak ada SQL Cloud, remediation, perubahan dev atau konfigurasi React/Flutter yang dijalankan Codex.

## Bukti live yang kini tersedia

| Bukti pengguna | Capture WIB / scope |
| --- | --- |
| [Supplemental result](audits/phase4a4-baseline-supplemental-result.json) | 23 Oktober 00:35:58; counts, raw definitions, body/ACL/signature checks, seeds, defaults ACL |
| [Event graph review](audits/phase4a4-event-graph-review.json) | 23 Oktober 00:39:05; full candidate/event metadata, definitions dan dependencies |
| [Full security audit](audits/phase4a4-full-security-audit.json) | 23 Oktober 00:40:29; 200 columns, constraints/index/policies, effective grants dan memberships |

Ketiganya ekspor katalog PostgreSQL **17.11**, executing role postgres dan transaksi read-only. Sumbernya query live yang dijalankan pengguna; Codex membaca dan membandingkan hasil lokal, bukan mengakses project Cloud. Ketiga capture terpisah, bukan satu transaksi snapshot bersama. Dashboard project reference masih belum disertakan sebagai bukti independen; current_database=postgres tidak membedakan dev/staging. Identitas rekansiaga-staging mengikuti konteks/penegasan pengguna. Data API exposed schemas tetap perlu konfirmasi Dashboard.

Seluruh JSON yang tersedia di docs/audits dibaca/di-parse. Metadata dev, function review dev, Master comparison offline, dry-run checkpoint, user reports dan local QA diperlakukan sebagai kategori bukti historis yang berbeda. Tidak menganggap review JSON lokal sebagai hasil SQL, atau tes sintetis/browser lama sebagai API staging. Tidak mengubah input evidence.

Perbandingan dapat diulang lokal dengan `python scripts/review_phase4a4_evidence.py`. [Hasil review terstruktur](audits/phase4a4-final-evidence-review.json) berisi SHA256 input, multiset differences, body hashes yang dihitung ulang, perbandingan event graph dan batas pemeriksaan. Ini offline review atas ekspor live, bukan SQL execution/API proof. Canonicalization hanya mengabaikan formatting/schema qualification di luar quoted strings, mempertahankan literal; tetap bukan parser/semantic equivalence umum.

## Matriks final PASS / FAIL / BLOCKED

| Area | Hasil dan alasan | Status / jenis bukti |
| --- | --- | --- |
| Tabel/kolom | Exact 26 nama dan 200 nama/type/nullability sesuai manifest, tidak ada missing/extra | PASS metadata live dibandingkan lokal |
| RLS/owner | Semua 26 tabel owner postgres, RLS enabled; FORCE RLS false seluruhnya sesuai baseline | PASS metadata. Bukan bukti row filtering API; owner bypass disengaja untuk helper |
| Column defaults | Full audit tidak mengekspor pg_attrdef; supplemental juga tidak memuat default_expr per kolom | **BLOCKED** default expressions; tidak diklaim PASS dari keberhasilan validator |
| Constraints | PK26/FK33/UNIQUE13/CHECK34 = 106; nama/type/definitions/validation sesuai, termasuk FK targets/delete actions | PASS metadata, nol missing/extra/different pada comparison |
| Indeks | 61 definitions/unique/primary cocok; semuanya valid dan ready | PASS metadata, nol diff; tidak mengklaim performa query |
| Policies | Exact 26 nama/command/roles/permissive/USING/WITH CHECK sesuai baseline | PASS kesesuaian baseline. Policy role baseline sendiri tetap bermasalah di bawah |
| Table grants | 52 pasangan anon/authenticated × tabel cocok intended baseline | PASS effective table metadata; bukan hasil request JWT |
| Column grants | 400 pasangan kolom/role SELECT/INSERT/UPDATE sesuai table expectations, explicit column ACL tidak ada | PASS dalam scope tiga privilege kolom yang diekspor |
| Schema privileges | Public USAGE true, CREATE false untuk anon/authenticated; pgbouncer USAGE/CREATE false; service CREATE public false | PASS batas public metadata; schema lain/Data API exposure belum seluruhnya accepted |
| Role flags / graph | anon/authenticated bukan superuser/BYPASSRLS/CREATEROLE/login; tidak punya parent granted-role pada 24 edges yang diekspor | PASS graph/flags snapshot; tidak ditemukan jalur membership anon/auth → service/postgres |
| Membership options | Full audit hanya mengekspor admin_option; PG17 inherit_option dan set_option belum ada | **BLOCKED** audit delegasi per-edge, terutama authenticator; rol INHERIT saja tidak cukup |
| App functions | Lima exact routines expected, owner postgres, result/definer/path/ACL sesuai, body hashes dihitung ulang cocok manifest dan full audit | PASS metadata + review statis; runtime belum diuji |
| RPC review EXECUTE | anon=false, PUBLIC=false; authenticated/service=true | **PASS metadata staging**: gap grants dev lama telah tertutup oleh bootstrap cleanup; bukan bukti B sudah diterapkan |
| Submit/track EXECUTE | anon/authenticated/PUBLIC=false; service=true | PASS intended backend-only metadata; Edge/CAPTCHA/rate-limit belum diuji |
| Updated-at helper | Invoker, client/PUBLIC execute false, service=true, six trigger definitions/enabled sesuai | PASS metadata; direct RPC service intent sebelumnya tidak dipatok, actual dicatat |
| Seeds | Exact empat role code/name/description dan dua source config sesuai Master; aktif, identifier NULL | PASS live static seed/config rows. Bukan bukti akun admin atau feed berjalan |
| Fixture aggregates | profiles/assignments/reports/history/tokens seluruhnya nol | PASS lima counts baseline; tidak mengklaim Auth users atau semua tabel kosong |
| Existing event graph | Tujuh event hooks, candidate metadata/body dan semua definitions identik snapshot reviewed | PASS preservation metadata + retained scoped static review; lihat detail berikut |
| Limited-role read | roles_staff_read masih memerlukan super_admin, tidak ada policy A | **FAIL kontrak akses role staf terbatas**, dibuktikan policy live; API reproduction belum dilakukan |
| Review validation | Body live masih NOT IN tanpa NULL guard dan tidak memvalidasi reason | **FAIL validasi eksplisit baseline**, dibuktikan body live; tidak mengklaim NULL berhasil disimpan |
| New-object defaults | Public defaults luas untuk postgres/supabase_admin, tidak ada global default ACL override | **FAIL target least privilege future objects**; existing app ACL sudah dinormalisasi terpisah |
| Authenticated authorization / sessions / concurrency | Tidak ada request JWT/overlap/atomicity results yang disediakan | **BLOCKED**; Phase 4A bukan COMPLETE |

Full audit mencatat **8 fungsi dalam scope**, bukan 8 public routines: 6 public + managed auth.uid dan pgbouncer.get_auth yang ikut dependency/scope audit. Tidak ada mismatch count. Kedua managed functions bukan tambahan app routine. auth.uid invoker PUBLIC EXECUTE adalah bagian Auth contract; get_auth definer dengan empty search_path dan anon/auth execute false, schema pgbouncer juga tidak bisa diakses client. Tidak mengubah managed functions.

## Function security dan grants yang benar-benar terbukti

`has_staff_role` memakai auth.uid(), profil is_active, assignments dan roles database; p_codes adalah filter role, tidak memberikan assignment. Owner postgres/FORCE false dan qualified table references menghindari policy recursion pada metadata ini. App definers memiliki empty search_path; invoker updated-at juga empty path. Lima normalized LF body MD5 cocok manifest; raw prosrc hashes cocok full audit. Perbedaan raw/LF hashes berasal karakter CR dalam body yang diekspor, bukan otomatis function drift. Exact return/parameter/default contract tetap ditinjau dari definition export.

`review_public_report` mempertahankan active super_admin/report_verifier check, SELECT FOR UPDATE dan update + history satu transaksi. NULL target melewati pemeriksaan IF tiga-nilai lalu dapat gagal pada NOT NULL constraint; ini kekurangan validasi/error contract, **bukan bukti authorization bypass atau invalid status tersimpan**. NULL ID dapat mengembalikan false dan alasan kosong/tanpa batas masih diterima oleh body. Tidak ditemukan SQL dinamis atas reason. Pemeriksaan actor sebelum menunggu lock tidak menjanjikan pencabutan role instan bagi request yang sudah in-flight.

Anonymous sekarang tidak punya EXECUTE pada lima app functions; authenticated hanya helper role dan review. Authenticated tidak punya direct UPDATE public_reports; perubahan status harus melalui RPC. Akses profil/assignments self-or-super tetap dapat memperbolehkan staf nonaktif membaca metadata dirinya sendiri sesuai policy; jangan menyamakan admin deny dengan larangan seluruh self-read. Public published content tetap sah. RLS menentukan rows, effective grants metadata tidak menguji row visibility.

**Akun biasa belum dinyatakan terverifikasi dibatasi melalui API.** Metadata dan body yang ada mendukung intended deny, tetapi SQL owner postgres dan service_role tidak boleh dijadikan token pembuktian akun biasa. Uji harus memakai JWT aktor tanpa profil/role serta fixture target yang diketahui ada, termasuk usaha role assignment/status mutation; HTTP 200 + [] dapat merupakan RLS filtering yang benar.

## Event graph: preservation PASS, bukan seluruh keamanan PASS

Old dan new event_graph_md5 sama: **7fe832217540802b68d6d56c6ba30f47**. Pembandingan seluruh object graph juga identik, bukan hanya string hash. Candidate definitions/metadata (termasuk OID, owner, ACL, config, dependencies) dan seluruh event function definitions sama. Candidate definition MD5 tetap **846ec2fbff751d24b890656d63c3a9bf**. ensure_rls tetap owner postgres, ddl_command_end, O, tags CREATE TABLE/CREATE TABLE AS/SELECT INTO, dengan function linkage yang sama; origin mode. Tidak ditemukan drift pada tujuh hooks.

Behavior review tetap mengacu [review lengkap sebelumnya](phase4a3-event-trigger-final-review.md), kini didukung body identik pasca-deployment: metadata DDL public-only, identifier `%I.%I`, search_path pg_catalog, hanya ENABLE RLS; helper menangkap error sebagai LOG sehingga bukan enforcement fail-closed tunggal. ACL PUBLIC/anon/auth EXECUTE helper masih luas dan return event_trigger/context khusus tidak otomatis membuktikan caller dapat melakukan arbitrary ALTER TABLE. Tidak mengklaim endpoint/helper aman sepenuhnya tanpa runtime/capability review. Jangan DROP/DISABLE/REPLACE/revoke managed helper hanya agar semua ACL terlihat sama dengan app functions. Existing broad ACL dicatat sebagai risiko terpisah yang perlu keputusan provider/DBA, bukan bagian B atau C1.

## Default privileges dan role inheritance

Public defaults milik **postgres dan supabase_admin** memberi anon/authenticated table privileges `arwdDxtm` (termasuk TRUNCATE/TRIGGER/REFERENCES/MAINTAIN), sequence `rwU`, function `X`. RLS tidak menggantikan hardening default ACL dan tidak menjadi pelindung semua privilege tersebut pada objek baru. Tidak ada global rows pada 24 all_default_acls yang diekspor: untuk fungsi baru, built-in global PUBLIC EXECUTE tetap relevan. Schema-level revoke saja tidak menghapus global grant. Existing 26 tables/5 functions yang sudah dibersihkan ACL-nya **tidak menjadi terbuka lagi hanya karena defaults luas**. [PostgreSQL default privileges](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).

**Penting untuk scope C1:** ada schema-specific function defaults **creator postgres di storage** yang memberi anon/authenticated/service EXECUTE. Sesudah C1 menghapus global/public grants, explicit storage defaults tetap dapat menambahkan grant pada future storage functions. C1 tidak boleh diklaim deny seluruh functions di semua schemas. Jangan memperluas proposal ke storage/managed schemas otomatis. Defaults supabase_admin pada graphql/graphql_public dan creator lain juga tidak ditutup C1. C2 tetap terpisah, memerlukan provider/capability approval.

24 membership edges menunjukkan authenticator adalah member anon/authenticated/service_role, bukan kebalikannya. postgres dan beberapa managed roles punya platform memberships; tidak boleh menafsirkan arah tersebut sebagai anon mewarisi postgres. service_role BYPASSRLS adalah kemampuan backend yang harus tetap privat. Untuk PG17, inherit_option dan set_option per membership merupakan data yang berbeda dari admin_option/rolinherit dan perlu ekspor tambahan sebelum menutup audit delegasi. [PostgreSQL pg_auth_members](https://www.postgresql.org/docs/17/catalog-pg-auth-members.html).

## Prioritas rekomendasi

1. **P1 - A:** perbaiki limited-role chain melalui own-assigned read untuk profil aktif; pertahankan super policy dan tanpa write/auto-assignment. Snapshot live sudah mendukung prerequisite statis A.
2. **P1 - B:** perketat NULL ID/status dan reason tanpa mengurangi actor/role/lock/history/ACL. Sign-off bisnis NULL reason opsional vs rejected wajib alasan serta batas4000/Unicode harus ditutup sebelum menerima kontrak B. Anon revoke sudah benar sekarang, tetapi tetap dipertahankan proposal.
3. **P1 - C1:** hardening new-object defaults creator postgres setelah scope global/provider workflow disetujui; existing ACL unchanged. Dokumentasikan exception/residual storage. C2 bukan implicit dependency atau izin mengubah managed role.
4. **P1 acceptance:** synthetic fixture + real JWT/session/negative API/concurrency/atomicity tests; ini gate COMPLETE. Belum ada exploit API yang direproduksi dalam bukti ini.
5. **P2 evidence gaps:** capture defaults/membership options + Dashboard identity/exposure; existing helper ACL/capability review, Edge submit/track/rate limits, JWT expiry/replay/in-flight policy. Jangan mengulang semua audit yang sudah cocok tanpa perubahan baru.

## Kesiapan dan acceptance A/B/C1

Tidak ada persetujuan penerapan database yang diberikan oleh laporan ini. Seluruh proposal tetap ROLLBACK; tidak dibuat COMMIT remediation otomatis. **Siap direview/diuji bukan siap diterapkan tanpa persetujuan.**

| Paket | Kesiapan berdasarkan bukti sekarang | Acceptance sebelum lanjut | Rollback/containment |
| --- | --- | --- | --- |
| [A](sql/proposals/phase4a-01-assigned-role-read.sql) | **READY untuk rehearsal/staging test terkontrol**, menunggu persetujuan dan synthetic fixture; helper/owner/FORCE/self policies terkonfirmasi | Baseline known gaps dicatat; defaults fixture diperiksa. Setelah approved deployment staging: 27 policies, existing policy unchanged, aktif IM/RV/ME hanya assigned roles; USER/inactive/no-role/foreign deny; SA tetap berfungsi; tidak recursion; no assignment/role writes | Sebelum COMMIT ROLLBACK. Setelah penerapan, approved DROP hanya roles_assigned_active_staff_read setelah definition/version dikonfirmasi; super policy tetap. Limited roles kembali terblokir, bukan security widening |
| [B](sql/proposals/phase4a-02-review-rpc-execute.sql) | **READY review teknis; BLOCKED acceptance kontrak reason dan runtime** | Sign-off reason; signature/default/return/owner/path dipertahankan; auth/active/SA-or-RV benar; anon/PUBLIC deny; NULL/unknown/status transitions/reason edges, missing ID, exact history/actor; forced failure rollback; dua JWT concurrent | Stop flow lalu compatible caller/forward fix. Jangan restore raw baseline NULL gap atau anon EXECUTE. Backup live body/ACL untuk comparison, bukan automatic insecure rollback |
| [C1](sql/proposals/phase4a-03-future-object-defaults.sql) | **READY review scoped draft; BLOCKED approval global/provider dan creator probe runtime** | Approve scope postgres all-schema global default + public-specific revoke; inventory storage residual acknowledged. Existing app ACL/body/data/policy sama; safe new table/sequence/functions sebagai creator postgres deny clients/PUBLIC dalam intended scope; explicit grants bekerja; global effect diuji di scratch schema tanpa schema grants, storage exception dilaporkan | Stop new-object provisioning, reviewed minimal explicit grants/workflow fix; jangan restore broad defaults otomatis. Default rollback tidak mengubah ACL objek yang sudah dibuat |

Readiness A tidak berarti fixture sudah approved/provisioned. Tidak ada staf/assignment/report fixtures saat capture. Auth users tidak diperiksa atau disalin. Identitas baru dibuat melalui Auth provisioning yang disetujui pada project staging terisolasi; tidak copy PII/password/UUID dev. Actor fixtures: SA, IM, RV-A/RV-B, ME, USER, INACTIVE, NO-ROLE, MULTI serta known foreign rows. Report baru sintetik terpisah per case, bukan operational report existing.

## Urutan berikutnya yang paling aman dan efisien

1. Konfirmasi/ref catat Dashboard staging dan Data API exposed schemas; simpan capture/checksum/operator untuk tiga ekspor. Jalankan **hanya** [query read-only gap baru](sql/staging/phase4a4-final-readonly-gaps.sql) pada PG17 staging dan simpan `docs/audits/phase4a4-final-readonly-gaps-result.json` (belum tersedia). Ia mengambil 200 default expressions, membership options dan schema/database client capabilities tanpa invoke aplikasi atau default function. Bandingkan dengan Master; jangan sekadar hitung200.
2. Review hasil gap, approve isolasi/fixture manifest + rehearsal A. Backup live policies/function owner/body/ACL/default ACL; snapshot evidence tersedia tetapi harus fresh bila ada drift. File proposal dijalankan apa adanya hanya DDL rehearsal rollback, bukan persistent remediation/API acceptance.
3. Setelah persetujuan terpisah, operator menerapkan **A saja** melalui release staging reviewed; verifikasi diff27 policies dan jalankan JWT role/self/foreign/SA/ordinary/inactive cases. Simpan actual response/SQLSTATE/fixture/version; hentikan jika gagal. Tidak menerapkan B/C1 bersamaan agar penyebab jelas.
4. Tutup sign-off reason dan setujui **B saja**, review/persist staging oleh operator, lalu uji input/transition/error no-mutation/history/actor + concurrency. CC terminal vs terminal: satu sukses/satu gagal/1 history. CC under_review vs verified dari unverified: bisa dua sukses dengan 2 history berantai jika urutannya sah. Buktikan overlap dua JWT/koneksi memakai coordinator fixture lock yang approved, bukan request serial. Fault injection history failure hanya disposable fixture approved.
5. Setelah A/B cases diterima, scope/provider sign-off **C1 saja**. Rehearsal lalu reviewed deployment staging jika disetujui. Probe safe future objects sebagai postgres: public dan scratch nonpublic; periksa default ACL dan effective grants, lalu approved harmless API function probes. Existing object ACL unchanged. Jangan membuat probe storage atau mengubah defaults provider tanpa izin tersendiri; catat inherited/global/schema exceptions dan C2 residual.
6. Ulangi hanya audit yang terpengaruh dan smoke API/session (refresh, logout, replay sampai expiry, role/active revocation) pada fixture staging. Baseline strict lama mengharuskan26 policies/body lama/zero fixtures dan tidak cocok sesudah A/B/fixtures; gunakan manifest versi tahap yang direview. Cleanup hanya manifest fixtures/probes yang disetujui. ROLLBACK SQL Editor tidak membatalkan transaksi HTTP lain.

Panduan cases lengkap: [baseline validation](phase4a4-staging-baseline-validation.md) dan [remediation/API matrix](phase4a-remediation-validation.md). Pada current task, semua langkah perubahan tetap **rencana**, tidak dieksekusi. Jangan rerun bootstrap pada project nonempty, jangan mengubah rekansiaga-dev atau client React/Flutter untuk menutup gate.

**Keputusan:** banyak gate metadata kini benar-benar PASS atas ekspor live, termasuk kesesuaian constraints/index/policies/grants/seeds dan preservation event graph. Temuan A/B/C1 masih terbuka dan default/membership/exposure gaps serta authenticated API/concurrency belum selesai. **Staging belum dinyatakan READY untuk penggunaan aplikasi dan Phase 4A tetap BLOCKED.**

## QA lokal

`python scripts/review_phase4a4_evidence.py`: seluruh 10 comparison groups nol missing/extra/different; recomputed lima body/owner/path/ACL checks cocok; complete event graph/candidate/definitions sama. Input JSON dan proposal SQL SHA256 tetap tidak berubah. Local document links dan read-only/ROLLBACK boundary checks PASS. `npm.cmd run lint` dan `npm.cmd run build` PASS exit0; warning bundle >500 kB tetap (585.95 kB / gzip171.02 kB). Ini bukan PostgreSQL parse/runtime/API test; gap SQL baru belum dieksekusi.
