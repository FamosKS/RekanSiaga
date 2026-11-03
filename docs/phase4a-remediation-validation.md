# Phase 4A - paket eksekusi operator dan acceptance staging

Status 23 Oktober 2026: **PHASE 4A BLOCKED**. Runbook ini menggantikan keputusan/rekomendasi terdahulu. Baseline tidak diaudit ulang; akun dan manifest existing dipertahankan. Tidak ada SQL Cloud/API live, akses credential, perubahan dev/Flutter, atau implementasi Phase 4B oleh Codex pada pelaksanaan ini.

## Keputusan yang berlaku

| Cakupan | Keputusan operator | Batas eksekusi |
| --- | --- | --- |
| A fixture/API | APPROVED WITH CONDITIONS | Hanya CONTROL/SUBJECT pada manifest, run sintetis existing, staging `fweeyflixnqbvvceuent`; tidak menimpa data lain; recovery wajib |
| B kontrak v1 | APPROVED | Reason NULL boleh; jika diisi non-whitespace dan <=4000 karakter **setelah trim**; approval kontrak bukan izin migration B |
| C1 public-only | Prinsip scope APPROVED | Hanya local defaults postgres/public; penerapan konkret masih perlu review target dan izin deployment |
| C1 global function defaults | NOT APPROVED | Tidak ada perintah perubahan global dalam paket C1 terkini |
| Dev / provider-managed | NOT AUTHORIZED | Tidak disentuh; C2/storage/creator supabase_admin di luar cakupan |

Rollback A 26 policies/0 profiles/0 assignments dan deployment permanen A 27 policies/satu policy A adalah **laporan operator**. Bukan exact-expression/JWT/API acceptance oleh Codex. **Jangan menjalankan ulang `01-a-deploy-review.sql`, membuat akun atau manifest baru.**

## Artefak yang digunakan

Semua SQL deployment/probe berada di [security-completion](sql/staging/security-completion/). Ini paket review, belum PostgreSQL-runtime-validated. Jalankan satu batch lengkap; jangan hilangkan guard. GUC hanya attestation operator, bukan bukti identitas server. Dashboard harus menunjukkan **rekansiaga-staging / fweeyflixnqbvvceuent** sebelum setiap batch. Bekukan perubahan DDL/fixture lain; advisory lock hanya mengoordinasi paket yang memakai lock yang sama.

| Paket | Artefak | Perilaku / pemulihan |
| --- | --- | --- |
| A | `01-a-deploy-review.sql`, `01-a-rollback-review.sql` | Deployment sudah dilaporkan; rollback menghapus hanya exact policy A dan membutuhkan persetujuan baru |
| B | `02-b-deploy-review.sql`, `02-b-recovery-review.sql`, `02-b-atomicity-regression.sql` | Migration belum diizinkan. Recovery berupa containment EXECUTE/roll-forward; tidak mengembalikan NULL/reason gap |
| C1 | `03-c1-deploy-review.sql`, `03-c1-recovery-review.sql`, `03-c1-regression.sql` | Tiga perubahan local defaults postgres/public saja; global/provider ACL dipertahankan; recovery tidak membuka broad defaults |
| Readonly | `04-stage-validation-readonly.sql` | Pilih A/B/C1; berakhir ROLLBACK; metadata bukan bukti API |
| Fixture | [Generator existing](../scripts/prepare-phase4a-fixture.mjs) | Exact source snapshot, locks, collision guard, same-state no-op; output private, tanpa overwrite otomatis |
| JWT/API | [Runner existing](../scripts/test-phase4a-api.mjs) | Default tanpa jaringan; target host fixed staging, user token diverifikasi lewat Auth, service key ditolak, output label/status saja |
| Orchestrator A | [run-phase4a-acceptance.mjs](../scripts/run-phase4a-acceptance.mjs) | Satu perintah; commit SQL oleh operator lalu API per state; berhenti pada kegagalan, tidak deploy migration/reset otomatis |

B baseline body MD5 LF `e6794d177f113714876243dc456bcbe6`; body baru `732ed6c024fe909237d63847547f46e8`. Proposal, release, stage validator dan atomicity guard telah diselaraskan. Hash menunjukkan versi, bukan runtime security PASS. Signature/return/default/owner/search_path, auth.uid + active role guard, FOR UPDATE dan status/history satu transaksi dipertahankan.

Trim B didefinisikan konsisten SQL/runner: whitespace ASCII SP/HT/LF/CR/FF/VT pada tepi; interior tetap. NULL diterima termasuk rejected. Jika non-NULL wajib non-whitespace; maksimum 4000 code points PostgreSQL **setelah** trim, bukan UTF-16 JavaScript. NULL ID/status ditolak 22023; target under_review/verified/rejected. unverified boleh ke ketiganya; under_review hanya ke verified/rejected; terminal/repeated/backward ditolak. Missing UUID valid mengembalikan false.

## Evaluasi C1 dan batas provider

Capture existing [final-evidence-review](audits/phase4a4-final-evidence-review.json) berisi 24 default ACL entries: scope postgres meliputi public dan storage, tidak ada explicit global function default postgres. Ketiadaan entry global bukan berarti deny: fallback PostgreSQL memberi EXECUTE kepada PUBLIC. Ini pembacaan bukti existing, bukan audit ulang atau keadaan Cloud terkini.

[PostgreSQL 17 ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html) menjelaskan bahwa default schema menambahkan grant pada default global; REVOKE schema tidak dapat menghapus grant global. Perubahan global postgres akan memengaruhi **fungsi postgres baru di semua schema**, termasuk workflow storage/non-public; tidak mengubah objek existing atau creator lain secara langsung. Belum ada bukti kompatibilitas provisioning/provider untuk dampak tersebut. Karena itu, perubahan global **dihapus**, bukan dianggap disetujui.

C1 terbatas mencabut client grants lokal public pada tabel/sequence/function. Snapshot menjaga seluruh existing persistent relation/function ACL, default ACL di luar scope (termasuk global/storage/creator lain), dan non-client grants. Global relation grants yang membuat local REVOKE tidak efektif menyebabkan STOP. Probe public table/sequence wajib menolak client access; probe non-public function harus tetap mewarisi global ACL yang sama.

**Batas fungsi:** public-local REVOKE saja belum menjamin fungsi baru menolak EXECUTE. Setiap migration fungsi aplikasi harus melakukan CREATE + explicit REVOKE FROM PUBLIC/anon/authenticated + grant minimal yang dibutuhkan **dalam satu transaksi sebelum COMMIT**. Probe C1 membuktikan workflow object-level ini, dan melaporkan hak sebelum REVOKE. Tidak ada automatic global-deny PASS. Acceptance workflow dan residual default EXECUTE tetap perlu bukti/review pada final gate. Global REVOKE hanya perlu keputusan baru bila otomatisasi denial lintas schema tetap dipilih; alternatif scoped ini tidak memerlukannya.

## Satu rangkaian tindakan operator

### Diagnostic blocker Acceptance A - lokal, tanpa HTTP

Jika `--live` langsung menampilkan BLOCKED tanpa header `Acceptance A ref=...` atau prompt, jalankan dari folder `rekansiaga-web`:

```powershell
node scripts/run-phase4a-acceptance.mjs --diagnose
```

Mode ini hanya membaca process environment dan manifest/SQL lokal. Tidak ada HTTP (termasuk GET), SQL, prompt commit, mutasi, deployment, cleanup, atau credential file loading. Output hanya nama konfigurasi/variabel, status, kategori; tidak memuat nilai token/key/refresh/connection string/UID/path privat. Exit 1 berarti ada local configuration blocker, bukan bukti database gagal. `--diagnose --live` ditolak. PASS lokal bukan verifikasi signature/JWT, konektivitas atau committed state.

Urutan seluruh sumber BLOCKED pada kode:

| Batas | Kondisi yang menghentikan proses | Risiko operasi sebelumnya |
| --- | --- | --- |
| Sebelum header/live prompt | CLI/runtime/cwd tidak sesuai; project ref atau approval/mutation ack hilang/salah; manifest path/JSON/ref/run/actor tidak sesuai; key bukan public; JWT format/role/sub/expiry/issuer salah; ack sesi tanpa refresh | HTTP belum dipanggil; orchestrator belum meminta commit |
| Pemeriksaan file/review policy | Sembilan SQL hilang/tidak terbaca/redirected/hash drift; input policy acknowledgement salah/terminal tertutup | Sebelum prompt commit pertama tidak ada HTTP/fixture prompt |
| Prompt commit / pemeriksaan ulang SQL | Ack commit salah/terminal tertutup; file berubah setelah ack | Operator mungkin sudah COMMIT walaupun HTTP belum dimulai; wajib verifikasi state |
| Marker/identity/role/isolation/negative tests | HTTP nonexpected, data marker/profil/role/assignment/RLS tidak sesuai, forged token tidak ditolak, mutation denial tidak sesuai | Fixture operator sudah mungkin committed; negative POST/PATCH/DELETE mungkin sudah dikirim |
| Koneksi HTTP | DNS/socket/TLS/fetch error, timeout/abort, JSON/response tidak sesuai | Request mungkin diterima server sebelum error; tidak retry otomatis |
| Refresh/logout/replay | Auth identity/role mismatch, refresh/signout/replay status tidak sesuai termasuk 429 bukan invalidation | Sesi mungkin sudah berubah; verifikasi sesi dan fixture sebelum retry |

Catch live sekarang menampilkan kategori tahap, status HTTP terakhir (jika ada), HTTP_ATTEMPTED, MUTATION_ATTEMPTED dan OPERATOR_COMMIT_POSSIBLE tanpa exception/response body. Flag attempted bukan bukti sukses ataupun rollback. Jika HTTP atau prompt commit telah tercapai, **STOP dan verifikasi state committed sebelum live retry**. Diagnostic tetap aman dijalankan untuk membaca konfigurasi, tetapi tidak menyatakan state Cloud diketahui.

Perbaikan minimum bila diagnostic menunjukkan MISSING_VARIABLE: isi di **PowerShell yang sama** yang menjalankan Node; Node runner sengaja tidak membaca `.env`/`.env.local`. Empat konfigurasi nonsecret existing:

```powershell
$env:PHASE4A_PROJECT_REF = 'fweeyflixnqbvvceuent'
$env:PHASE4A_LIVE_APPROVAL = 'approved-staging-api'
$env:PHASE4A_MUTATIONS_APPROVED = 'approved-synthetic-only'
$env:PHASE4A_MANIFEST = 'docs/qa/phase4a/remediation-a/private/fixture-manifest.phase4a5a-a-20261023-f768e9e3fb2f4223ac497e84871a1c1f.json'
# Masukkan hanya variabel sensitif yang dilaporkan hilang, tanpa nilai literal
# pada command/history. Nama dalam array boleh disesuaikan dengan diagnostic.
'PHASE4A_PUBLIC_KEY','PHASE4A_CONTROL_JWT','PHASE4A_SUBJECT_JWT' | ForEach-Object {
  Set-Item -LiteralPath "Env:$_" -Value ([Net.NetworkCredential]::new('', (Read-Host $_ -AsSecureString)).Password)
}
```

Jika session acknowledgement diaktifkan, PHASE4A_SUBJECT_REFRESH wajib berasal dari sesi SUBJECT khusus yang sama; supply dengan masked prompt serupa. Jangan menghapus guard atau menganggap session PASS jika refresh belum tersedia. Jangan ulang live untuk menebak konfigurasi; jalankan diagnostic lagi dahulu.

Pemeriksaan Codex terbaru: cwd/runtime PASS; process environment milik tool tidak memiliki tujuh variabel wajib (bukan observasi environment terminal operator). Saat empat konfigurasi nonsecret supplied hanya dalam object diagnostic lokal, manifest dan sembilan SQL existing PASS; key/JWT tetap MISSING_VARIABLE. Tidak ada request Cloud atau perubahan fixture pada pemeriksaan ini. Screenshot operator tanpa header/prompt menunjukkan kegagalan sebelum HTTP, tetapi variabel spesifik terminal operator baru diketahui dari output --diagnose di terminal tersebut.

### Konfigurasi JWT lewat login Auth staging (tanpa Acceptance live)

Repository sebelumnya hanya mempunyai mock login `test-auth.mjs`, bukan helper login akun pengujian. Gunakan [helper PowerShell](../scripts/set-phase4a-jwts.ps1) dari folder `rekansiaga-web` pada **terminal PowerShell operator yang sudah berisi konfigurasi existing**:

```powershell
& .\scripts\set-phase4a-jwts.ps1
node scripts/run-phase4a-acceptance.mjs --diagnose
```

Masukkan email dan password CONTROL, lalu SUBJECT pada prompt tersembunyi. Jangan jalankan helper dengan `powershell -File`, `pwsh -File`, atau melalui Node: proses anak tidak dapat mengisi environment PowerShell induk. `&` menjalankan script dalam proses PowerShell saat ini; Node runner berikutnya mewarisi kedua JWT. Tidak perlu dot-source atau menyalin token.

Jika execution policy menolak `.ps1` (terjadi pada shell tool saat validasi), ganti **baris helper saja** dengan perintah berikut yang membaca script lokal yang sama dan menjalankannya dalam proses saat ini, tanpa mengubah execution policy:

```powershell
& ([scriptblock]::Create((Get-Content -LiteralPath .\scripts\set-phase4a-jwts.ps1 -Raw)))
```

Helper memakai validator manifest/public key existing, menolak target selain staging fixed, lalu login password dan memanggil `/auth/v1/user` pada host staging (redirect ditolak). Issuer, authenticated role, expiry (>60 detik tersisa), UID respons login, dan UID hasil verifikasi Auth wajib cocok dengan actor manifest sebelum **kedua** variabel JWT dipasang. Decode claims sendiri bukan verifikasi signature; pemeriksaan Auth server wajib berhasil. Output hanya status; tidak ada credential/token/key yang dicetak atau ditulis ke file, log, repository, maupun localStorage. Password plaintext sementara hanya digunakan dalam memory untuk request HTTPS. Jangan aktifkan tracing/debug request atau perekaman payload eksternal saat memasukkan credential.

JWT lama dibersihkan di awal; kegagalan membersihkan keduanya tanpa retry otomatis. Login yang sudah diterima Auth dapat tetap membuat sesi meskipun verifikasi berikutnya gagal; helper tidak melakukan logout/cleanup otomatis. Bila `PHASE4A_SESSION_APPROVED=approved-dedicated-session` sudah diaktifkan untuk sesi pengujian khusus, refresh SUBJECT dari login yang sama disimpan hanya ke process environment untuk runner existing; selain itu refresh dibuang dan variabel refresh lama dibersihkan. Helper tidak mengaktifkan acknowledgement tersebut sendiri.

Lanjut hanya bila helper menampilkan PASS dan diagnostic menunjukkan `PASS LOCAL_PREFLIGHT`. Diagnostic tetap lokal; helper hanya melakukan Auth login/identity, bukan fixture SQL, migration, negative writes, atau Acceptance A. Berhenti setelah diagnostic untuk konfigurasi ini. Setelah pengujian selesai, bersihkan JWT/refresh dengan `Remove-Item Env:PHASE4A_CONTROL_JWT, Env:PHASE4A_SUBJECT_JWT, Env:PHASE4A_SUBJECT_REFRESH -ErrorAction SilentlyContinue` atau tutup sesi PowerShell.

### Pemulihan USER sudah COMMIT: hash lokal, bukan input acknowledgement

Audit 23 Oktober 2026: teks operator `COMMITTED fweeyflixnqbvvceuent USER` cocok persis dengan `commitAck` runner. File USER lokal mempunyai satu perubahan: komentar `--` pada `SET LOCAL rekansiaga.fixture_release` dihapus. SHA256-LF canonical `36a0883bd791818957fcfac92ffcd529b6103faf3609d849bbf6567141c3fb15` sama dengan screenshot sebelum prompt; sesudah perubahan hash menjadi `727990da5478a9e78319d96de6d3065799eee2b66ba4aa9f0b98e44fe3452eaa`. Reproduksi lokal menerima acknowledgement tersebut lalu gagal di `verifyReviewCopy` setelah prompt, sebelum HTTP. Runner lama mempertahankan kategori `fixture-commit-acknowledgement` saat memeriksa hash sehingga salah mengarahkan diagnosis. Komentar file lokal telah dikembalikan ke canonical; ini tidak menjalankan SQL atau mengubah database. Aktifkan approval fixture hanya pada salinan SQL Editor, jangan ubah file canonical saat runner menunggu.

Runner sekarang memberi kategori `fixture-file-integrity` pada pemeriksaan file; input acknowledgement tetap exact dan mismatch dilaporkan dengan kategori aman tanpa mencetak input atau exception privat. Tidak ada trimming yang melemahkan target/state check.

**Prosedur resume USER, tanpa menjalankan ulang fixture:**

1. Pastikan Dashboard **rekansiaga-staging / fweeyflixnqbvvceuent**, tanpa perubahan fixture paralel. Buka [04-stage-validation-readonly.sql](sql/staging/security-completion/04-stage-validation-readonly.sql). Pada **salinan SQL Editor**, aktifkan `SET LOCAL rekansiaga.validation_ref='fweeyflixnqbvvceuent';`, pertahankan `validation_stage='A'`, dan aktifkan `SET LOCAL rekansiaga.validation_fixture_state='USER';`. Jalankan seluruh batch read-only hingga `ROLLBACK`, tanpa SQL fixture. Wajib tidak ada error dan hasil `USER_SNAPSHOT_MATCH`, profiles=1, assignments=1. Auth kedua UID harus ada; CONTROL `52280fb9-2fc0-4b39-b31b-8c806074c8c4` harus memiliki exact synthetic marker run ini, aktif, satu assignment `super_admin`; SUBJECT `02c3da94-39c9-4c4d-bd37-d6040607ff81` tanpa profil/assignment. Guard memeriksa jumlah seluruh profil/assignment, bukan hanya dua UID. Tetap bandingkan expression policy A sesuai instruksi existing. Bila berbeda, STOP; jangan rerun fixture atau pindah NO_ROLE.
2. Pada PowerShell yang berisi JWT/config valid, jalankan:

   ```powershell
   node scripts/run-phase4a-acceptance.mjs --diagnose
   # Hanya setelah LOCAL_PREFLIGHT PASS dan SQL readonly cocok:
   node scripts/run-phase4a-acceptance.mjs --live --resume-committed USER
   ```

3. Jawab prompt policy dengan `VERIFIED fweeyflixnqbvvceuent A-POLICY`, lalu prompt resume dengan `VERIFIED fweeyflixnqbvvceuent USER-COMMITTED-READONLY`. Jangan ketik COMMITTED pada prompt resume. Mode ini tidak menawarkan SQL USER; semua hash/path/target/manifest/key/JWT/approval guards tetap wajib. Sesudah acknowledgement, runner melakukan GET Auth kedua akun dan memeriksa snapshot profil/assignment/role yang terlihat melalui RLS, lalu seluruh pengujian API USER existing (marker, forged JWT, roles, isolation, negative writes sesuai approval). GET RLS bukan pengganti snapshot SQL lengkap.
4. **Jangan jalankan NO_ROLE sampai `PASS A-USER`.** Runner baru menawarkan fixture NO_ROLE setelah semua pengujian USER berhasil. Kegagalan snapshot/UID/hash/ack/API menghentikan proses tanpa advance, reset, retry atau cleanup otomatis. `--from USER` bukan pengganti mode resume ini karena masih meminta commit fixture USER. Jangan gunakan `--from NO_ROLE` untuk melewati pengujian USER.

SQL read-only, lint/build dan unit test lokal bukan bukti bahwa database saat ini masih USER atau Acceptance A sudah PASS. Prosedur live di atas disiapkan untuk operator, tidak dijalankan oleh Codex pada perbaikan ini.

### Recovery NO_ROLE sudah committed setelah USER PASS

Penyebab aktual pada screenshot 23 Oktober 2026 adalah perubahan hash NO_ROLE: approval `fixture_release` diaktifkan pada file lokal saat runner menunggu. Sebelum dikembalikan, perbandingan lokal membuktikan penghapusan `--` itu satu-satunya perbedaan terhadap generator. Canonical SHA256-LF NO_ROLE `d27634a9bd91a68907de7979feb09674f5bf1d622df41adcf2f88ba801421152` sesuai screenshot. File lokal telah dikembalikan tanpa menjalankan SQL. Jangan ulang fixture USER/NO_ROLE dan jangan kembali ke resume USER setelah database beralih ke NO_ROLE.

`HTTP_STATUS=401` adalah status terakhir lintas tahap, bukan status HTTP kegagalan hash: request terakhir setelah kedua actor USER lulus adalah **GET `/rest/v1/roles?select=code` tanpa JWT** pada `A-ANON`; penolakan 401 dengan kode `42501` memenuhi oracle. Request forged JWT GET sebelumnya juga memang harus 401. Tidak ada request NO_ROLE sebelum kegagalan hash. `MUTATION_ATTEMPTED=YES` berasal dari negative write USER (PATCH/POST profil, POST assignment/role, DELETE/PATCH role all-zero, dan RPC SUBJECT dengan report ID NULL). `PASS A-USER` mengharuskan semuanya 4xx/42501; tidak ada respons sukses write yang diterima sebagai PASS. Flag attempted bukan bukti data berubah. Tanpa before-image/audit log tidak bisa mengklaim bukti historis menyeluruh; snapshot berikut memeriksa drift staf/role dan efek laporan/history yang dapat diatribusikan ke kedua akun. Jika ada efek tak dikenal, STOP tanpa cleanup.

Prosedur operator minimal:

1. Pada Dashboard **rekansiaga-staging / fweeyflixnqbvvceuent**, jalankan seluruh [SQL read-only existing](sql/staging/security-completion/04-stage-validation-readonly.sql) dengan ref staging, `validation_stage='A'`, dan **hanya** `validation_fixture_state='NO_ROLE'` di salinan SQL Editor. Jangan aktifkan USER bersamaan. Wajib ada `NO_ROLE_SNAPSHOT_MATCH` (profiles=2, assignments=1), `PRIOR_USER_PROBES_NO_OBSERVED_EFFECTS`, dan batch selesai `ROLLBACK` tanpa error. Kedua UID Auth tersedia; CONTROL dan SUBJECT aktif dengan exact synthetic marker run existing; satu assignment hanya CONTROL `super_admin`, SUBJECT tanpa assignment. Periksa policy expression A seperti biasa. Bila hasil berbeda atau hasil write lama tidak jelas, jangan resume.
2. Pada PowerShell operator yang sama, jalankan `node scripts/run-phase4a-acceptance.mjs --diagnose` untuk hash/path/claims/expiry lokal. Setelah PASS, jalankan `node scripts/run-phase4a-acceptance.mjs --diagnose-auth`. Mode kedua standalone GET-only, memanggil `/auth/v1/user` staging untuk CONTROL/SUBJECT, tanpa refresh/logout, SQL, acceptance atau API writes. Wajib kedua `AUTH_*` PASS. Expiry/issuer sekarang wajib ada dan valid. Penolakan Auth 401 saat ini dilaporkan terpisah dari anonymous-denial 401 pada screenshot; jangan menganggapnya bukti expiry tanpa diagnosis lokal.
3. **Hanya bila expired atau Auth menolak sesi**, login ulang memakai helper existing di proses PowerShell ini: `& ([scriptblock]::Create((Get-Content -LiteralPath .\scripts\set-phase4a-jwts.ps1 -Raw)))`. Masukkan email/password melalui prompt tersembunyi, lalu ulang kedua diagnostic. Helper memverifikasi staging/manifest UID, tidak mencetak/menulis token, dan memperbarui process environment. Jangan login ulang bila diagnostic sudah PASS; login ulang mengganti sesi dan harus dicatat dalam evidence operator. Tidak merefresh JWT otomatis di tengah MULTI -> INACTIVE.
4. Setelah snapshot, efek sebelumnya dan Auth valid, jalankan:

   ```powershell
   node scripts/run-phase4a-acceptance.mjs --live --resume-committed NO_ROLE
   ```

   Jawab prompt secara berurutan:

   ```text
   VERIFIED fweeyflixnqbvvceuent A-POLICY
   VERIFIED fweeyflixnqbvvceuent NO_ROLE-COMMITTED-READONLY
   VERIFIED fweeyflixnqbvvceuent USER-DENIALS-NO-EFFECTS
   ```

   Acknowledgement terakhir hanya boleh diberikan setelah prior PASS denial suite dan SQL effects checks cocok; bukan substitusi review. Resume tidak menjalankan ulang USER, SQL NO_ROLE, atau negative tests USER. GET snapshot NO_ROLE harus lolos sebelum **tes API NO_ROLE pertama kali**, termasuk negative writes sesuai approval existing. Jangan jalankan mode live ini bila hanya menginginkan diagnosis read-only; berhenti setelah langkah 2. Mode live disiapkan untuk operator, tidak dieksekusi Codex pada perbaikan ini. NO_ROLE harus PASS sebelum prompt fixture IM. Hash/ack/snapshot/efek/API gagal menghentikan proses tanpa cleanup/retry/reset. USER pada proses baru dicatat NOT_RUN; PASS USER dari screenshot dipertahankan sebagai evidence pelaksanaan sebelumnya, bukan diklaim ulang otomatis atau full nine-state PASS.

Runner sekarang menampilkan label state/actor/jenis operasi/status HTTP terakhir sebagai **historical** dan counts respons write (attempted/denied/success/unresolved), tanpa URL query/payload/JWT. Counts tersebut bukan bukti rollback database. Pertahankan file fixture lokal canonical untuk semua state selanjutnya; aktifkan approval hanya pada salinan Dashboard.

### Recovery IM committed dan salinan SQL tanpa mengedit file lokal

Screenshot berikutnya menunjukkan NO_ROLE PASS, 13 write attempts/13 denied/0 success/0 unresolved dan LAST_HTTP NO_ROLE/ANON/READ_ROLES/401; IM gagal hash sebelum request IM. Perbandingan lokal membuktikan file IM hanya berbeda pada approval yang di-uncomment. Komentar sudah dipulihkan, bukan SQL/database. Hasil SQL IM=2 profiles/2 assignments merupakan laporan operator; jangan ulang fixture IM atau resume NO_ROLE setelah state beralih.

1. Pada salinan SQL Editor staging, jalankan seluruh `04-stage-validation-readonly.sql` dengan ref staging, stage A dan **hanya** `validation_fixture_state='IM'`. Wajib `IM_SNAPSHOT_MATCH`, profiles=2, assignments=2, kedua akun aktif/marker exact, CONTROL `super_admin`, SUBJECT `information_manager`; hasil `PRIOR_NO_ROLE_PROBES_NO_OBSERVED_EFFECTS` dan batch `ROLLBACK` tanpa error. Jika drift/efek tak diketahui, STOP.
2. Di PowerShell operator jalankan `node scripts/run-phase4a-acceptance.mjs --diagnose`, kemudian `--diagnose-auth` pada script yang sama. Setelah keduanya PASS, jalankan `node scripts/run-phase4a-acceptance.mjs --live --resume-committed IM`. Jawab `VERIFIED fweeyflixnqbvvceuent A-POLICY`, `VERIFIED fweeyflixnqbvvceuent IM-COMMITTED-READONLY`, lalu `VERIFIED fweeyflixnqbvvceuent NO_ROLE-DENIALS-NO-EFFECTS` hanya setelah evidence cocok. Runner tidak mengulang fixture/API NO_ROLE atau SQL IM; GET snapshot dan seluruh tes API IM wajib PASS sebelum menawarkan RV. Resume tetap mencatat state sebelumnya NOT_RUN di proses baru, bukan full nine-state PASS.
3. Untuk fixture **berikutnya** yang benar-benar diminta runner, hindari mengedit file lokal sama sekali. Di PowerShell kedua dengan project ref/manifest nonsecret yang sama, gunakan mode salinan baru:

   ```powershell
   node scripts/run-phase4a-acceptance.mjs --editor-fixture RV | Set-Clipboard
   ```

   Mode standalone ini memverifikasi target/manifest/path/hash canonical lalu mengeluarkan SQL dengan approval aktif hanya pada teks salinan. Tidak membaca JWT/key/password, tidak mengubah file, tidak HTTP/SQL. Paste clipboard ke SQL Editor staging dan review source state/target sebelum eksekusi; jalankan hanya saat prompt RV tampil setelah IM PASS. Sesudah COMMIT baru acknowledge pada terminal runner. Ganti RV sesuai state yang sedang diminta; jangan menyiapkan/mengeksekusi seluruh fixture sekaligus. Jika command error, jangan paste clipboard lama. File lokal harus tetap berkomentar, termasuk bila buffer IDE sebelumnya masih berisi approval aktif.

### 1. Acceptance A - satu perintah, sudah diizinkan

[Orchestrator](../scripts/run-phase4a-acceptance.mjs) menggunakan sembilan fixture existing dalam urutan **USER -> NO_ROLE -> IM -> RV -> ME -> MULTI -> INACTIVE -> INACTIVE_SA -> CROSS_RV**. Tidak mempunyai koneksi SQL: operator melakukan commit di SQL Editor; sesudah acknowledgement yang tepat, orchestrator langsung menjalankan marker/identity/role/isolation/negative-write tests state tersebut. Baru setelah PASS ia menampilkan fixture berikutnya. Tidak menjalankan seluruh fixture dahulu.

Dari folder `rekansiaga-web`, siapkan process environment privat existing. Gunakan sesi SUBJECT khusus dari awal bila ingin refresh/logout otomatis di akhir:

```powershell
$env:PHASE4A_MANIFEST = 'docs/qa/phase4a/remediation-a/private/fixture-manifest.phase4a5a-a-20261023-f768e9e3fb2f4223ac497e84871a1c1f.json'
$env:PHASE4A_PROJECT_REF = 'fweeyflixnqbvvceuent'
$env:PHASE4A_LIVE_APPROVAL = 'approved-staging-api'
$env:PHASE4A_MUTATIONS_APPROVED = 'approved-synthetic-only'
# Supply PHASE4A_PUBLIC_KEY, PHASE4A_CONTROL_JWT, PHASE4A_SUBJECT_JWT
# hanya lewat mekanisme privat; jangan print/paste token ke chat atau source.
# Untuk refresh/logout otomatis, supply juga PHASE4A_SUBJECT_REFRESH
# milik sesi SUBJECT khusus yang sama, lalu aktifkan ack berikut:
$env:PHASE4A_SESSION_APPROVED = 'approved-dedicated-session'
node scripts/run-phase4a-acceptance.mjs --live
```

Jika sesi khusus/refresh belum tersedia, jangan set session acknowledgement; bagian role tetap bisa dijalankan dan refresh/logout dilaporkan BLOCKED. Jika ack session diaktifkan tetapi refresh tidak tersedia, preflight berhenti sebelum operasi remote. Ini process acknowledgement untuk pengujian yang telah diizinkan, bukan permintaan approval bisnis baru.

Orchestrator memvalidasi semua sembilan SQL terhadap generator guarded dan menolak redirect path/drift **sebelum** meminta operasi remote. Sebelum setiap commit, file diperiksa kembali dan SHA256-LF ditampilkan. Pertahankan file review existing; enable acknowledgement fixture hanya pada editor copy yang dieksekusi. Jangan mengubah source state/guard atau menjalankan B/C1 melalui orchestrator ini.

Ikuti prompt berikut dalam proses yang sama:

1. Verifikasi Dashboard **rekansiaga-staging / fweeyflixnqbvvceuent**. Jalankan readonly stage A; bandingkan exact policy expression dengan release A serta retained helper/grants. Ketik `VERIFIED fweeyflixnqbvvceuent A-POLICY` hanya jika review berhasil. Ini **attestation operator**, bukan verifikasi SQL independen Codex. Jangan deploy ulang A.
2. Untuk state yang ditampilkan, verifikasi target lagi, jalankan **satu full batch fixture** yang ditunjuk, tunggu COMMIT berhasil, lalu ketik `COMMITTED fweeyflixnqbvvceuent STATE` sesuai prompt. Jangan acknowledge error/timeout/SQL transaction yang belum jelas. USER membutuhkan SUBJECT tanpa profil; fixture target identik adalah no-op, unknown snapshot/collision tetap menolak perubahan.
3. Orchestrator memeriksa marker sintetis pada self profile kedua UID, forged-JWT denial dan menjalankan testA existing termasuk negative writes. Capture JWT CONTROL/SUBJECT tetap sama selama seluruh siklus: MULTI -> INACTIVE membuktikan perubahan DB permissions pada token yang sama, tanpa mengganti token/cache. Tidak ada service_role, password login, auto-refresh atau credential file.
4. Setelah CROSS_RV PASS, sesi khusus di-refresh/logout bila tersedia. Refresh replay harus ditolak sebagai 400/401; 429/service error tidak dihitung sebagai invalidation PASS. Token baru hanya di memory dan tidak disimpan. Access JWT mungkin tetap valid sampai expiry; tidak mengklaim instant invalidation. Gunakan sesi valid existing untuk B sesudah logout, dengan UID akun yang sama.
5. Simpan stdout tersanitasi ke folder private existing dan perbarui [matrix](qa/phase4a/remediation-a/access-matrix.csv) dengan provenance. Output hanya label/status, waktu/ref/run/hash/path; tidak mencetak credential atau HTTP body. Semua error menghentikan proses; fixture berikutnya dan tes sesudahnya NOT_RUN. Tidak ada retry/reset/cleanup otomatis. Gunakan recovery sesuai **state yang benar-benar committed**, bukan menebak dari timeout.

Default tanpa `--live` hanya mencetak NOT_RUN dan urutan, tanpa membaca manifest/credential atau melakukan jaringan/SQL. Resume eksplisit `--live --from IM` hanya untuk state yang diketahui sesudah inspeksi; state sebelumnya dicatat NOT_RUN dan tidak boleh dianggap full nine-state acceptance pada pelaksanaan itu. UI staging login/logout/deep-link/user_metadata-spoof tetap membutuhkan runtime smoke terpisah. Orchestrator selalu menahan Phase4A security gate: role suite PASS bukan Phase4A COMPLETE.

Runner per-state `node scripts/test-phase4a-api.mjs A STATE --live` dan SESSION existing tetap tersedia untuk pemeriksaan terarah, bukan pengganti urutan commit/test atau bukti yang belum ada.

### 2. B — setelah acceptance A dan izin migration B tersendiri

- Review `02-b-deploy-review.sql` dengan kontrak trim terbaru. **Approval kontrak saat ini bukan izin COMMIT B.** Setelah izin deployment konkret, isi ref/release approval, `a_acceptance=JWT-A-accepted`, `b_contract=optional-null-nonblank-trimmed-max4000-v1`. Jalankan full batch lalu readonly stage B.
- Provision file CROSS_RV-reports existing yang telah diselaraskan menjadi 19 fresh report cases, hanya setelah target/fixture diverifikasi. File tidak mereset laporan/history existing yang sudah terpakai. Tidak menyalin data dev.
- **Sebelum mutasi laporan B**, jalankan private `fixture-<run>-CROSS_RV-restore-user.review.sql` setelah review target/source/fixture ack. Ini mengembalikan CONTROL super dan SUBJECT tanpa profil hanya bila exact snapshot cocok dan tidak ada inbound SUBJECT FK references selain assignment sintetis. Semua dependent public tables dikunci selama pemeriksaan; FK bentuk tak dikenal/provider schema atau reference history/business menolak seluruh batch. Auth, laporan/history dan CONTROL profile dipertahankan. Tidak boleh memaksa restore setelah history SUBJECT tercatat.
- Setelah restore USER, ulang **USER -> NO_ROLE -> IM -> RV -> ME -> MULTI -> INACTIVE -> INACTIVE_SA -> CROSS_RV**, masing-masing `node scripts/test-phase4a-api.mjs A STATE --with-report-fixtures --live` setelah commit fixture yang sesuai. Ini menguji no-profile dan semua negative authorization B pada **known existing report**, bukan missing UUID. Semua report harus tetap fresh; baru kemudian jalankan suite B/concurrency. Restore USER bukan quarantine dan bukan reset laporan. Jika restore ditolak, simpan bukti dan stop bagian no-profile; jangan menghapus history atau membuat akun baru.
- Setelah siklus authorization selesai, jalankan `node scripts/test-phase4a-api.mjs B --live`. Tes status/reason NULL, blank, panjang setelah trim, Unicode, missing ID, terminal/repeated/backward transitions, actor/reason/history dan dua HTTP race. Output B-concurrent-dispatch bukan observed lock contention.
- Untuk contention, gunakan dua koneksi trusted + observer sesuai akhir `02-b-atomicity-regression.sql`: tahan FOR UPDATE pada fixture race fresh, kirim runner, buktikan wait_event_type=Lock dari request review, ROLLBACK lock holder. Jangan meninggalkan transaksi idle; simpan bukti waktu/lock yang tidak memuat request body/token. Jika tidak ada observer aman, contention tetap BLOCKED.
- `02-b-atomicity-regression.sql` membutuhkan izin **DDL fault injection terpisah**; fixture/API approval tidak mengizinkan trigger injection otomatis. Batch ROLLBACK membuktikan kegagalan history mengembalikan seluruh report row/history, bukan JWT acceptance.

### 3. C1 — setelah acceptance B dan izin penerapan paket public-only

Review tiga ALTER DEFAULT PRIVILEGES `IN SCHEMA public` pada `03-c1-deploy-review.sql`. Tidak ada global ALTER. Setelah izin eksekusi konkret dan acceptance B, isi ref/release approval, `b_acceptance=JWT-B-atomicity-concurrency-accepted`, `c1_scope=postgres-public-only-approved`. Jalankan full batch, readonly stage C1 dan probe rollback-only `03-c1-regression.sql` dengan izin probe DDL. Existing ACL/non-target defaults wajib tetap. Setelah ROLLBACK tidak boleh ada probe schema/table/function tertinggal; counts kembali 26 tabel/6 routines. Untuk bounded read-only regression, hapus ack mutasi dari process environment terlebih dahulu (`Remove-Item Env:PHASE4A_MUTATIONS_APPROVED -ErrorAction SilentlyContinue`), lalu jalankan `node scripts/test-phase4a-api.mjs A CROSS_RV --live` sesuai state aktual. Negative writes akan NOT_RUN karena ini hanya regresi baca; jangan mengulang suite B mutating pada fixture terpakai.

### 4. Recovery fixture — terminal quarantine, bukan reset tes

File private `fixture-<run>-CROSS_RV-recovery.review.sql` telah disiapkan untuk state akhir CROSS_RV. Jika berhenti pada state lain, siapkan satu recovery copy sesuai state committed aktual:

```powershell
node scripts/prepare-phase4a-fixture.mjs $fixtureManifest IM --recovery
# IM contoh: wajib ganti dengan state yang benar-benar committed.
```

Review SQL, verifikasi target, aktifkan `verified_ref` dan fixture acknowledgement. Guard mencocokkan **seluruh exact snapshot** terhadap source yang dikenal atau hasil quarantine yang sama; unknown/drift menghentikan proses sebelum DML. Hanya assignment dua UID sintetis dihapus dan profil yang ada dinonaktifkan. **Tidak menghapus Auth, profil, laporan/history/attachments/tokens atau evidence; tidak memodifikasi role seeds atau data lain.** Hasil sama dapat diulang dengan aman. Quarantine menjaga audit trail dan FK; bukan cleanup destruktif. Sesudah quarantine jangan menjalankan transisi tes normal atau mengaktifkan ulang tanpa review kondisi baru. Kegagalan guard -> ROLLBACK dan inspeksi targeted, bukan cleanup massal.

## Status aktual dan final gate

| Pengujian | Actual | Status |
| --- | --- | --- |
| Baseline metadata | Bukti terdahulu dipertahankan; tidak diulang | PASS dalam scope historis |
| A deployment | Operator melaporkan 27 policies/satu policy A | PASS laporan operator; bukan acceptance |
| Package regression | 34/34 transport-mock/static/generator tests | PASS lokal |
| Auth aplikasi | 23/23 skenario terisolasi; hasil rerun dicatat di development-status | PASS lokal |
| Orchestrator local preflight | File private existing 9/9 lolos canonical hash/path checks; urutan/gagal/resume/session diuji lokal | PASS lokal |
| SQL private parity | 12/12 cocok generator: 10 fixture + quarantine + restore USER; laporan mencakup kasus trim baru | PASS lokal |
| Exact A live expression/JWT/isolation/session/UI | Tidak ada koneksi SQL atau key/JWT process env dalam sesi Codex | BLOCKED |
| B runtime/atomicity/observed contention | Migration belum diizinkan; tidak dijalankan | BLOCKED |
| C1 runtime/provider/provisioning regression | Scope direvisi public-only; belum diterapkan | BLOCKED |
| SQL compile/runtime lokal | PostgreSQL/psql/Docker/pglast tidak tersedia melalui pemeriksaan lokal | NOT_RUN |
| Phase 4B | Menunggu security gate | NOT_RUN |

Lihat [development-status](development-status.md) untuk hasil lint/build/syntax aktual. Tes lokal bukan simulasi yang boleh disebut JWT/API nyata. Tidak ada bukti baru yang menutup security gate. Final gate tetap mensyaratkan A/B/C1 runtime sesuai scope, otorisasi/isolation/negative writes/session, atomicity dan observed contention, kompatibilitas UI/mobile yang relevan, serta penutupan temuan high/critical termasuk risiko future function EXECUTE/provisioning. A/B/C1 COMMIT saja bukan COMPLETE.

**Blocker sekarang:** tidak ada tool koneksi SQL Supabase langsung atau key publik/JWT/refresh staging pada process environment yang tersedia. Operator dapat menjalankan tahap 1 yang sudah diizinkan tanpa persetujuan ulang. Izin migration B, eksekusi C1 konkret dan probe DDL/fault injection baru diperlukan saat gate tahap sebelumnya terpenuhi. Jangan kirim credential melalui chat.
