# Phase 4A — Final security acceptance report

## Status terkini - accelerated local completion (23 Oktober 2026)

Perbaikan blocker operator terbaru: `run-phase4a-acceptance.mjs --diagnose` sekarang melaporkan kategori konfigurasi lokal tanpa HTTP/SQL/mutasi/prompt atau nilai credential. Catch live membedakan tahap dan attempted HTTP/mutation/possible operator commit. Output operator tanpa header/prompt berarti berhenti sebelum HTTP menurut urutan kode; nama variabel spesifik terminal operator belum diamati. Tool environment Codex kehilangan tujuh variabel wajib, sementara diagnostic dengan konfigurasi nonsecret membuktikan manifest/sembilan file SQL existing PASS. **Tes lokal terbaru 34/34 PASS**, syntax/lint/build PASS; tidak ada operasi remote atau retry mutasi. Perintah berikutnya hanya `--diagnose`, dengan perbaikan PowerShell masked-input pada runbook existing. Phase 4A tetap BLOCKED. Angka 29/29 berikut adalah hasil sebelum penambahan diagnostic.

Pembaruan master prompt terbaru: [orchestrator A](../scripts/run-phase4a-acceptance.mjs) selesai. Satu perintah mengikat urutan fixture committed oleh operator -> real JWT testA per state; semua private SQL dicek canonical hash/path sebelum dan sesudah acknowledgement. Marker profil sintetis diperiksa melalui API. Kegagalan menghentikan urutan; resume tidak mengklaim state yang dilewati PASS. JWT tetap sama sepanjang pergantian role, sesi khusus dapat refresh/logout otomatis di akhir. SQL commit tetap dilakukan operator karena tidak ada koneksi SQL Cloud dalam sesi ini. Tidak ada migration/cleanup otomatis.

Hasil terbaru: **29/29 package regression PASS**, **23/23 auth PASS**, preflight sembilan file private **9/9 PASS**, SQL private parity **12/12 PASS**, syntax tiga script **PASS**, lint/build **PASS exit 0** (warning chunk utama 585.95 kB/gzip171.03 kB >500 kB tetap). Package tests memakai mock transport; tidak ada JWT/API atau SQL Cloud yang dieksekusi. Refresh replay rate-limit tidak lagi dapat menjadi false PASS. Bukti aktual/hash source diperbarui pada readiness-review existing. Rincian file dan satu instruksi operator ada di [runbook](phase4a-remediation-validation.md). **Phase 4A BLOCKED; Phase 4B NOT_RUN karena security gate belum PASS.** Angka 19/19 pada catatan sebelumnya di bawah adalah pelaksanaan sebelum orchestrator.

**PHASE 4A BLOCKED.** Laporan operator terbaru: rollback A telah diverifikasi **26 policies/0 profiles/0 assignments**, lalu A permanen diterapkan dengan **27 policies/satu policy A**. Ini bukti USER-REPORTED, bukan pemeriksaan exact expression/JWT/API oleh Codex. Jangan mengulang deployment A, pembuatan akun atau manifest. Status rollback-pending/A-belum-diterapkan dalam riwayat di bawah telah digantikan.

[Paket eksekusi operator](phase4a-remediation-validation.md) menjadi runbook utama. Keputusan terbaru: fixture/JWT API staging sintetis **disetujui dengan syarat**; kontrak B v1 **disetujui** dengan batas 4000 karakter **setelah trim**; prinsip C1 postgres/public **disetujui sebagian** dan perubahan global EXECUTE **belum disetujui**. B/C1 belum diterapkan; approval kontrak B bukan izin migration. Paket C1 kini hanya tiga ALTER DEFAULT PRIVILEGES postgres/public, tanpa global write. Existing ACL/defaults luar scope termasuk storage/creator provider dijaga; inherited global PUBLIC EXECUTE tetap menjadi batas yang dilaporkan. Fungsi aplikasi baru harus memiliki REVOKE/grant eksplisit sebelum COMMIT; probe mencakup workflow ini dan preservasi inheritance non-public. Tidak ada SQL Cloud/API live/credential access atau perubahan dev/React/Flutter/C2 oleh Codex.

PASS lokal terbaru: package tests **19/19**, auth tests **23/23**, syntax runner. Runner mencakup reason 4000/4001 setelah trim termasuk Unicode, terminal/repeated/backward transitions, history/race actor consistency, CLI fail-closed sebelum HTTP, serta label/status evidence tanpa payload. Recovery quarantine mematikan akses sintetis sambil menyimpan seluruh audit; restore USER terpisah menolak inbound FK references sebelum menghapus hanya profil SUBJECT sintetis yang tidak direferensikan, agar no-profile B dapat diuji sebelum mutasi laporan. SQL private parity **12/12**. B body MD5 LF terbaru `732ed6c024fe909237d63847547f46e8` konsisten proposal/release/validators. Temuan baseline NULL/reason RPC dan broad future defaults masih menunggu penerapan/runtime; acceptance A JWT/API/isolasi/session, izin deploy B/C1/probe DDL, atomicity/observed contention dan scoped C1 provisioning tetap **BLOCKED**. PostgreSQL/psql/Docker/pglast tidak tersedia; SQL runtime **NOT_RUN**. Phase 4B menunggu security gate. Bagian historis berikut tidak menggantikan status ini.

## Phase4A.5A - fixture review dan A test readiness

[Review readiness](phase4a5a-fixture-review.md) menetapkan minimum2akun Auth berbeda dengan serialstate CONTROL/SUBJECT, menggantikan10akun lama tanpa mengurangi known-foreign/same-role/active/role-union coverage A. Verifierkedua untuk concurrency report bukan cakupanA. Manifest/CSV/dry-run diselaraskan; actualNOT_RUN. Bug material dry-run lama (comment CREATE POLICY dan BEGINkedua tersalin) diperbaiki lokal; proposalA asli/leastprivilege tetap. Rehearsal repeatable setelahrollback, bukan upsert fixturepersisiten. ExistingAuth collisions/reuse perlu provenance/approval, bukan overwrite.

Phase4A.4 tetap BASELINE VERIFIED WITH KNOWN SECURITY FINDINGS tanpa auditulang. SQLruntime/JWT/API belum diuji, Phase4A BLOCKED; B/C1 tidakdimulai. Tidak ada provisioning/SQLremote/dev/config React/Flutterchanges. Satuaksioperator:lengkapi/setujui rencana manifest2akun/ref/runID, bukan membuatakun sekarang.

## Closure metadata Phase 4A.4 dan persiapan A

**Phase4A.4: BASELINE VERIFIED WITH KNOWN SECURITY FINDINGS. Phase4A tetap BLOCKED.** [Closure final](phase4a4-final-baseline-audit.md) meninjau final gaps JSON:200 defaults sesuai kontrak dengan23 reviewed UUID qualification deltas dan10 literal ::text,24 membership options konsisten,27schema role pairs CREATE=false, database CREATE=false/TEMP=true. TEMP dan wrapper provenance/runtime dicatat sebagai batas/capability, bukan arbitrary API SQL exploit yang sudah terbukti. Tidak ada audit baseline tambahan atau remote change.

[Paket A](phase4a-remediation-a-test-plan.md) siap review:10 synthetic Auth actor templates (belum diprovision),9 profile/9 assignment transaksional,expected/actual matrix NOT_RUN,dry-run exact policy A+SQL role simulation dan guarded rollback rehearsal, semuanya ROLLBACK. Proposal A asli dipertahankan dan hanya SELECT own-assigned active role; existing active super policy tetap. Real JWT/API/session/negative writes belum diuji. **Jangan mulai B/C1 sebelum A diuji dan divalidasi.** Roles super-only/review NULL-reason/default ACL/Edge/runtime findings tetap terbuka. Status defaults/membership missing pada riwayat berikut superseded; tidak ada COMPLETE keamanan.

## Phase 4A.4 - final evidence review (23 Oktober 2026)

[Laporan final baseline](phase4a4-final-baseline-audit.md) meninjau tiga ekspor live pengguna pada PostgreSQL17.11: supplemental capture00:35:58 WIB, event graph00:39:05, full audit00:40:29. Offline multiset comparison menunjukkan nol missing/extra/different pada tabel, 200 kolom/type/nullability,106 constraints,61 indexes,26 policies,52 grants tabel dan6 trigger definitions;400 column grants sesuai. Lima app body/owner/path/ACL/result checks cocok dan seed static/config sesuai. Full audit8functions mencakup6public+auth.uid+pgbouncer.get_auth, bukan8public. Event graph/body/dependencies/owners/ACL identik baseline reviewed (MD5 7fe832217540802b68d6d56c6ba30f47).

**PASS metadata dalam scope, Phase 4A tetap BLOCKED.** EXECUTE anon/PUBLIC review RPC staging sekarang false, tetapi policy role masih super-only dan body review NULL/reason gap tetap. Broad future defaults postgres/supabase_admin live terkonfirmasi; C1 tidak menghapus explicit postgres storage-schema defaults. Column defaults, PG17 inherit_option/set_option, Dashboard reference/exposed schemas serta authenticated API/session/concurrency/atomicity masih belum diterima. [Hasil review lokal terstruktur](audits/phase4a4-final-evidence-review.json) bukan SQL execution oleh Codex. A siap rehearsal/test terkontrol setelah approval/fixtures; B menunggu sign-off reason/runtime; C1 menunggu scope global/provider dan probes. Tidak ada SQL remote/dev/config change; tidak ada persetujuan deployment remediation. Status detail-belum-tersedia pada riwayat berikut telah digantikan hasil ini.

## Phase 4A.4 - baseline staging (23 Oktober 2026)

**Phase 4A tetap BLOCKED.** Pengguna melaporkan deployment permanen manual rekansiaga-staging dan direct-query counts 26 tabel/26 RLS/6 routines/26 policies/4 role/2 sources, serta validator sukses setelah cast roles. Dicatat sebagai USER-REPORTED, bukan ekspor katalog yang sudah ditinjau. Tidak ditemukan result sets detail pasca-deployment di workspace; keenam agregat tidak membuktikan seluruh manifest atau keamanan API lulus.

[Laporan baseline dan remediation bertahap](phase4a4-staging-baseline-validation.md) memuat PASS/FAIL/BLOCKED, provenance, temuan terbuka, rollback A/B/C1 dan matriks API/concurrency. Cast `p.roles::text[]` sudah tersimpan di validator utama; validator struktur alternatif yang masih tanpa cast diselaraskan lokal. [SQL tambahan read-only](sql/staging/phase4a4-baseline-supplemental-readonly.sql) mengumpulkan raw definitions/exact function checks/grants/default ACL/seeds tanpa RPC mutasi. Metadata dev/dry-run/sintetis tidak menjadi actual staging. Akun biasa belum dinyatakan terbatas berdasarkan API staging nyata. Tidak ada perubahan remote, remediation atau konfigurasi Web/Flutter; staging belum READY. Status deployment-belum-dilakukan pada bagian terdahulu adalah riwayat sebelum laporan pengguna terbaru.

## Pembaruan terkini ? Phase 4A.3 deployment preparation

**Phase 4A tetap BLOCKED; staging belum READY.** [Checkpoint dry-run](audits/phase4a3-dry-run-checkpoint.json) menunjukkan 26 tabel/26 RLS/6 routines/helper hash sesuai/event O. Post-ROLLBACK 0/0/1 dilaporkan pengguna; full graph/ACL preservation pasca-rollback belum diekspor terpisah. PASS tersebut terbatas pada bukti dry-run, bukan persisted schema atau authenticated authorization.

[SQL deployment staging baru](sql/staging/phase4a3-deploy-staging-review.sql) siap review lokal: seluruh guard dan baseline definisi dipertahankan, approval permanen/ref operator wajib, hard assertions mendahului COMMIT atomik. [Validasi setelah deployment](sql/staging/phase4a3-post-deployment-validation.sql) dan [runbook/checklist/recovery/readiness](phase4a3-staging-deployment.md) tersedia. Runtime SQL baru, penerapan permanen dan hasil fresh-session validation masih NOT TESTED/BLOCKED. Tidak ada SQL remote dijalankan; file dry-run tetap ROLLBACK, A/B/C1/C2 tidak diterapkan, konfigurasi Web/Flutter tidak diubah.

Known baseline limited-role policy, review NULL/reason dan future-default-privilege findings tetap terbuka. Akun biasa belum dapat dinyatakan terbatas dengan benar berdasarkan API nyata; metadata dan static function review saja tidak mencukupi. Authenticated positive/negative role/session/API dan concurrency dua verifikator tetap diperlukan pada fixture staging terisolasi yang disetujui. Status dry-run pending pada bagian historis berikut digantikan pembaruan ini, bukan diterjemahkan menjadi Phase 4A COMPLETE.

Tanggal pencatatan: 22 Oktober 2026, Asia/Jakarta. **Acceptance gate: BLOCKED.**

## Phase 4A.3 — Final event-trigger review terkini

[Inspeksi staging lengkap](audits/phase4a3-existing-event-trigger-review.json) diterima dan dibaca seluruhnya. [Review final](phase4a3-event-trigger-final-review.md): **PASS statis untuk controlled rollback-only dry-run**, bukan staging READY. Definer postgres/search_path pg_catalog, event_trigger tanpa args, ensure_rls owner/OID/link/deps/tags/O/origin cocok. Dynamic SQL quote identifier %I.%I dan hanya ENABLE RLS public dari DDL metadata. WHEN OTHERS hanya LOG: helper bukan enforcement fail-closed; bootstrap explicit ENABLE dan checkpoint 26/26 wajib.

Seluruh tujuh event function definitions ditinjau: extension hooks memiliki guards pg_cron/pg_graphql/pg_net, sementara bootstrap hanya PostGIS; DDL/drop watchers NOTIFY pgrst yang delivery-nya dibatalkan rollback. Tidak ditemukan network invocation pada alur yang direview. ACL helper EXECUTE luas tidak otomatis arbitrary event-context RPC; hardening terhadap arbitrary untrusted sessions/temp types/DDL privileges masih di luar PASS scoped dry-run.

Definition MD5 `846ec2fbff751d24b890656d63c3a9bf` dan graph MD5 `7fe832217540802b68d6d56c6ba30f47` konsisten dengan JSON dan bentuk guard. [Acknowledgement lokal](sql/staging/phase4a3-dry-run-acknowledgement.sql) disiapkan untuk disisipkan setelah BEGIN dalam bootstrap penuh oleh operator yang memastikan target staging/fresh trusted session. Hash cocok bukan pengganti review perilaku atau jaminan freshness remote.

Tidak ada SQL Cloud/remediation/COMMIT/Docker atau konfigurasi Web diubah. Staging/Phase 4A tetap **BLOCKED**: dry-run actual, rollback preservation, struktur/keamanan persisten dan API belum dibuktikan. Status body-belum-tersedia di riwayat berikut telah digantikan review ini khusus helper staging yang diterima.

## Riwayat Phase 4A.3 — Bootstrap guard revision

Pengguna melaporkan preflight staging: 0 public relation objects, satu public.rls_auto_enable() owner postgres/SECURITY DEFINER dan ensure_rls ddl_command_end enabled O, tanpa extension dependency. [Catatan user-reported](audits/phase4a3-staging-preflight-user-report.json) bukan hasil eksekusi Codex dan belum memuat body/return type/event owner/ACL/tags/linkage lengkap. **Behavior review helper tetap BLOCKED**, tidak dianggap aman karena nama atau owner.

[Bootstrap guard](sql/staging/phase4a3-bootstrap-review.sql) kini menerima zero-routine path lama atau tepat satu kandidat yang diverifikasi: exact zero-arg ordinary function return pg_catalog.event_trigger, postgres definer, exact ensure_rls owner/OID/event/status, normal dependency, tanpa extension membership yang bertentangan, origin replication mode, body-review attestation dan dua fingerprint fresh (definition + seluruh event graph). Semua unknown public routines/overloads/tables/views/sequences tetap ditolak. Hash/settings belum diisi: pengecualian tidak otomatis terbuka sebelum body/graph review.

[Inspector read-only](sql/staging/phase4a3-inspect-rls-auto-enable.sql) disiapkan untuk definisi/ACL/config/dependencies dan semua event hooks; tidak CALL helper atau membuat probe table. Event trigger/fungsi existing tidak di-DROP/DISABLE/REPLACE, dan remediation A/B/C1/C2 tidak dijalankan. Checkpoint sebelum ROLLBACK ditambahkan untuk metadata dry-run. [Panduan staging](phase4a3-staging-preparation.md) memperjelas review gate → approved same-session dry-run → checkpoint 26 tables/26 RLS/6 routines → ROLLBACK → kembali 0 relations/1 helper dan hash/event graph utuh. Checkpoint bukan persistent staging/API acceptance.

Bootstrap/dry-run dan SQL inspector belum dijalankan pada PostgreSQL oleh Codex. Project dev/staging, konfigurasi Web dan Docker tidak disentuh. **Staging tetap BLOCKED, bukan READY** sampai body review, dry-run, rollback-preservation serta struktur/keamanan persisten diverifikasi; Phase 4A belum COMPLETE.

QA guard revision lokal: lint/build PASS exit 0; graph-digest expression parity, source checksum/app body preservation, read-only/rollback boundaries, provenance JSON dan document links PASS. Main bundle warning >500 kB tetap. SQL compilation, live guard cases dan dry-run NOT TESTED; hasil lokal tidak menutup behavior/structure gate.

## Riwayat Phase 4A.3 — Staging preparation

Master awal kini tersedia dan dibaca lengkap di [001_rekansiaga_initial_schema.sql](../supabase/migrations/001_rekansiaga_initial_schema.sql). Hambatan “file migration awal belum tersedia” pada riwayat di bawah ditutup untuk file ini; tidak membuktikan seluruh history perubahan dev tersedia. [Laporan staging](phase4a3-staging-preparation.md) dan [comparison JSON](audits/phase4a3-master-comparison.json) mencatat pemeriksaan lebih rinci dari jumlah tabel: 26 nama/200 kolom tipe-nullability, 26 PK/33 FK/13 UNIQUE, 34 CHECK, 22 explicit index + 39 implicit, final 26 policy/6 trigger, dan kelima body fungsi cocok snapshot dev sesudah normalisasi line endings.

Master **NEEDS ADJUSTMENT / READY FOR REVIEW**: revoke fungsi hanya FROM PUBLIC belum menutup grant langsung dari default ACL, limited-role policy dan NULL/reason review masih baseline known findings, default privileges tidak dinormalisasi, source berakhir COMMIT tanpa guard. Defaults kolom dan platform/extension state dev tidak semuanya ada pada metadata lama sehingga tidak diklaim identik.

[Bootstrap staging review](sql/staging/phase4a3-bootstrap-review.sql) menambahkan guard operator/blank target, memastikan PostGIS extensions + qualified geography, normalisasi ACL objek baru sesuai intended callers Master, dan ROLLBACK. Tidak menambahkan policy A, tidak mengganti body dengan B atau menjalankan defaults C1/C2. Object ACL review tightening di sini menegakkan intent Master, bukan klaim remediation B lengkap. Master, semua proposal remediation, `.env.local` dan client/config Web dipertahankan.

Query [preflight](sql/staging/phase4a3-preflight.sql), [structure validation](sql/staging/phase4a3-validate-structure.sql), [seed checks](sql/staging/phase4a3-validate-seeds.sql) dan panduan SQL Editor/synthetic fixtures siap direview. Belum ada SQL dijalankan pada dev/staging, Docker tidak digunakan, data dev/akun asli tidak disalin. User-reported project `rekansiaga-staging` creation belum membuktikan schema kosong/target identity maupun keamanan. Staging **BLOCKED verifikasi**; Phase 4A belum COMPLETE.

QA lokal Phase 4A.3: comparison script, hashes sumber, exact baseline bootstrap bodies, tautan/read-only/rollback checks PASS; lint/build PASS exit 0 (main 585.95 kB / gzip 171.02 kB, warning >500 kB). SQL parsing/compilation/execution dan staging authenticated API/concurrency NOT TESTED. Hasil ini tidak menjadi bukti staging siap.

## Riwayat paket remediation dan validation

**Gate tetap BLOCKED; SQL READY FOR REVIEW, NOT APPLIED.** Paket [phase4a-remediation-validation.md](phase4a-remediation-validation.md) menjadi rujukan urutan, dependency, security review per migration, rollback/containment, pre/post-deployment test plan, fixture contract, expected/actual matrix dan risiko tersisa. Tidak ada SQL remote atau API mutasi dijalankan dan tidak mengganti ROLLBACK dengan COMMIT.

- A: [policy assigned-role read](sql/proposals/phase4a-01-assigned-role-read.sql) mempertahankan super policy, menambah hanya own assigned role SELECT bagi staf aktif; tanpa role assignment/write grant otomatis.
- B: [review RPC](sql/proposals/phase4a-02-review-rpc-execute.sql) mempertahankan actor/active/role checks, row lock, transisi serta atomic status/history; memperketat NULL ID/status dan provided reason, revoke PUBLIC/anon. Signature/default/boolean/role codes tetap. Reason NULL masih kompatibel; nonblank <=4000 karakter jika disediakan adalah usulan yang perlu sign-off Web/Flutter/backend. Aturan rejected wajib alasan belum ditemukan dan tidak diasumsikan.
- C1: [default privileges creator postgres](sql/proposals/phase4a-03-future-object-defaults.sql) kini meliputi public table/sequence/function defaults **dan global default function PUBLIC/anon/authenticated EXECUTE**. Scope global memengaruhi future functions di semua schemas oleh creator tersebut; perlu persetujuan scope sebelum deploy. Existing ACL dan service_role defaults tidak diubah.
- C2: [managed creator supabase_admin](sql/proposals/phase4a-03b-managed-owner-defaults.sql) terpisah dan CONDITIONAL/BLOCKED capability/provider approval. Tidak otomatis ikut urutan utama. C1 saja tidak menutup META-03 seluruh creators; jangan memaksa izin role managed.

Urutan yang direkomendasikan untuk proses manusia setelah approval: fresh snapshot + business/provider/fixture gates → staging A → B → C1 → C2 hanya jika gate terpisah lolos → audit + seluruh API/session/concurrency/atomicity matrix. Semua file review tetap rollback-only sehingga **tidak menghasilkan deployment persisten**; API lintas koneksi tidak bisa memvalidasi DDL yang dibatalkan atau belum committed. Deployment staging persisten adalah tahap manusia terpisah yang belum diotorisasi/dijalankan di sesi ini.

Tidak ditemukan staging terverifikasi, approved database fixtures, konfigurasi Supabase lokal/compose atau executable psql/Supabase CLI/Docker pada PATH. Seluruh actual after-remediation **BLOCKED**, bukan FAIL yang telah dieksekusi. Alternatif aman adalah disposable Supabase project/branch atau local stack approved dengan schema/data sintetis; plain PostgreSQL saja tidak menggantikan JWT/PostgREST acceptance. Tidak menggunakan project shared Web/Flutter sebagai target mutation/concurrency.

Rencana rollback menjaga security floor: hapus hanya policy tambahan A bila perlu (limited role kembali restrictive); untuk B stop review/roll-forward atau restore versi reviewed dengan UID/NULL/role/lock/history/ACL guard tetap; untuk C hentikan new provisioning dan beri explicit least-privilege grants, bukan memulihkan broad defaults otomatis. Backup actual function/policy/owner/ACL/default ACL wajib. Tidak mereset database shared atau memodifikasi operational reports.

Expected/actual mencakup SA, USER, IM, RV, ME, inactive, anon, no-role/multi-role, refresh/logout, own/foreign APIs, status/reason bounds, failure history rollback dan dua verifier. Concurrency terminal conflict wajib satu sukses/satu reject; under_review lalu verified boleh dua sukses dengan dua history sah. Actual tetap kosong/BLOCKED sampai staging nyata dijalankan; baseline user-reported live dan synthetic PASS dipertahankan terpisah.

QA paket lokal setelah perubahan: lint/build PASS exit 0 (main 585.95 kB / gzip 171.02 kB, warning >500 kB); hash bukti sumber, dua fingerprint, tautan dokumen dan empat proposal rollback-only PASS. Belum ada PostgreSQL compile/execution, authenticated API atau concurrency test. Hasil lokal ini tidak menutup gate staging.

## Riwayat function review — definisi fungsi diterima

Seluruh dua definisi di [phase4a-function-definitions.json](audits/phase4a-function-definitions.json) telah dibaca lengkap. SQL pemeriksaan dijalankan pengguna; review body dilakukan lokal oleh Codex, tanpa CALL RPC/SQL remote atau perubahan database. SHA256 sumber: `6a937228ac8addf0d67dc7721cdec14a814ea32049ffc438b0628634d479d6b1`. Berkas asli dipertahankan.

File ini berisi **dua fungsi yang dipilih**, bukan bukti bahwa database hanya mempunyai dua SECURITY DEFINER. Snapshot metadata sebelumnya memuat pula submit_public_report, track_public_report dan pgbouncer.get_auth sebagai definer. Body ketiganya tidak disertakan dalam file baru.

| Fungsi | Kesimpulan body/config statis | Alasan | Runtime/API |
| --- | --- | --- | --- |
| public.has_staff_role(text[]) | **PASS** dalam scope review statis dan konfigurasi snapshot | auth.uid(), profil aktif, assignment/roles server, read-only, search_path kosong; tidak ada jalur eskalasi yang ditemukan pada body | **BLOCKED**, belum diuji dengan JWT aktor nyata |
| public.review_public_report(uuid,text,text) | **FAIL kelengkapan validasi / least privilege**; auth, row lock dan atomic history **PASS statis** | NULL status tidak ditolak eksplisit; alasan tak divalidasi; anon EXECUTE masih ada pada snapshot. Ini bukan bukti bypass role | **BLOCKED**, termasuk status/history/concurrency tests |

**Gate Phase 4A tetap BLOCKED**, belum COMPLETE. Definisi kedua fungsi menutup hambatan pembacaan body untuk keduanya saja. Laporan lama di bawah yang menyebut kedua body belum tersedia telah digantikan bagian ini. Tidak ada tes exploit runtime yang terbukti, sehingga tidak memberi gate FAILED hanya dari celah validasi fail-closed ini.

### Korelasi evidence, owner dan EXECUTE

MD5 prosrc yang diekstrak dari teks definisi cocok dengan body_fingerprint snapshot metadata:

| Fungsi | Fingerprint body | Owner / ACL dari snapshot sebelumnya |
| --- | --- | --- |
| has_staff_role | 9e70eaadd27c167b311359955f2ccc65 | postgres; EXECUTE postgres, anon, authenticated, service_role |
| review_public_report | 937aecde21a310b767494fc60de9d389 | postgres; EXECUTE postgres, anon, authenticated, service_role |

Fingerprint dipakai untuk mencocokkan isi body, bukan bukti kriptografis autentisitas atau state remote terkini. File definisi baru tidak memuat owner/ACL/capture time, jadi pemilik/grants tetap merujuk snapshot sebelumnya. Definisi baru sendiri mengonfirmasi SECURITY DEFINER dan `SET search_path TO ''`. Tidak ditemukan dynamic SQL atau identifier/table/function aplikasi tanpa schema qualification pada kedua body; built-ins seperti now/EXISTS/ANY diproses PostgreSQL, bukan objek public yang dipilih input client.

### has_staff_role — PASS static review

Predikat lengkap yang menentukan izin adalah `sp.user_id=(SELECT auth.uid()) AND sp.is_active AND r.code=ANY(p_codes)`, dengan join `public.staff_role_assignments sra ON sra.staff_id=sp.user_id` dan `public.roles r ON r.id=sra.role_id`.

- Identitas berasal dari Auth JWT melalui auth.uid(), bukan parameter user_id/email/metadata. Tanpa UID, persamaan tidak memilih baris dan SELECT EXISTS mengembalikan false. Tidak ada role default atau auto-promotion.
- Boolean sp.is_active harus true; false/NULL tidak memenuhi WHERE. Kolom pada snapshot juga NOT NULL.
- p_codes hanya memilih kode role yang diperiksa terhadap assignment database **milik aktor itu sendiri**. Client memilih array kode tidak menciptakan assignment, mengaktifkan staf atau memeriksa identitas orang lain. Null/empty array tidak memberi akses; EXISTS tetap boolean false bila tidak ada hasil.
- Helper hanya SELECT EXISTS; tidak menulis profil/role atau menjalankan SQL yang dibangun dari input. Snapshot grants menolak direct client mutation tabel authz.
- Dengan owner postgres, tabel yang sama owner-nya dan FORCE RLS=false pada snapshot, SELECT di helper memakai hak owner dan melewati policy tabel tersebut. Karena itu pemanggilan dari policy roles/profiles/assignment tidak memanggil policy itu lagi: **tidak ditemukan RLS recursion pada konfigurasi yang ditinjau**. Ini alasan definer di sini dibutuhkan; jangan mengganti ke SECURITY INVOKER atau mengaktifkan FORCE RLS tanpa menilai ulang graf policy.

PASS ini bersyarat konfigurasi owner/flags tetap seperti snapshot. Runtime role changes, revocation selama request berlangsung, expiry/logout replay dan active/limited/multi-role matrix belum diuji. Tidak ada jaminan pencabutan izin seketika terhadap transaksi yang sudah berjalan.

### review_public_report — auth dan atomic history PASS statis

Langkah pertama `IF NOT public.has_staff_role(ARRAY['super_admin','report_verifier']) THEN RAISE ... 42501` terjadi sebelum membaca/mengunci/mengubah laporan. Berdasarkan body helper yang mengembalikan EXISTS, anon, akun biasa, staf nonaktif dan role lain tidak lolos. Array role adalah konstanta fungsi, bukan input RPC yang dikendalikan caller. reviewed_by dan changed_by berasal dari auth.uid(), bukan parameter aktor.

Maka META-02 diperjelas: anon EXECUTE **masih FAIL least-privilege**, tetapi **body menunjukkan penolakan anonim sebelum mutation**; tidak ada dasar menyebut anonymous status-change bypass sudah terbukti. Prioritas rekomendasi ACL menjadi defense-in-depth sedang, sementara verifikasi API tetap wajib. Ordinary authenticated mempunyai EXECUTE tetapi seharusnya ditolak helper; grant bukan berarti mutasi diizinkan.

Fungsi mengunci satu laporan dengan `SELECT status ... FOR UPDATE`, mengembalikan false jika tidak ditemukan, dan hanya mengizinkan transisi unverified → under_review/verified/rejected atau under_review → verified/rejected. Terminal verified/rejected tidak bisa diubah ulang melalui transisi non-NULL; same-status transition juga ditolak. Dua reviewer terhadap baris sama diserialisasi oleh row lock. Request kedua tetap bisa melakukan transisi berikutnya jika state baru membolehkannya; jangan mengharapkan semua request kedua selalu gagal.

UPDATE status/reviewed_by/reviewed_at dan INSERT report_status_history(from_status,to_status,changed_by,reason) berada dalam satu function invocation/transaksi, tanpa COMMIT atau EXCEPTION handler yang menelan kegagalan. Jika INSERT gagal, UPDATE tidak boleh bertahan sendiri. **PASS desain atomicity**, bukan hasil uji concurrency/rollback PostgreSQL yang sudah dijalankan. Constraint/FK riwayat ada pada snapshot; default id/changed_at tidak diekspor sehingga keberhasilan INSERT runtime masih perlu dibuktikan. Tidak ada INSERT audit_logs pada fungsi; report_status_history adalah jejak yang memang ditulis, bukan klaim audit log terpusat.

### FN-01 — FAIL validasi target NULL (sedang, bukan privilege bypass)

`IF p_new_status NOT IN (...)` bernilai NULL ketika input NULL; PL/pgSQL IF hanya mengeksekusi cabang untuk true. Pemeriksaan transisi `IF NOT (...)` juga bisa bernilai NULL, sehingga tidak menolak eksplisit. Untuk laporan existing dengan status valid, UPDATE status=NULL lalu ditolak NOT NULL constraint (23502), bukan error validasi 22023. Tidak ada bukti status NULL dapat tersimpan atau riwayat parsial terjadi. Untuk ID tidak ditemukan, fungsi dapat return false terlebih dahulu. Ini masalah validasi deterministik, bukan eskalasi. [PostgreSQL IF semantics](https://www.postgresql.org/docs/17/plpgsql-control-structures.html#PLPGSQL-CONDITIONALS).

### FN-02 — alasan belum divalidasi (gap audit quality, kontrak keputusan pending)

p_reason DEFAULT NULL disalin langsung ke kolom TEXT nullable: NULL, teks kosong/whitespace dan alasan sangat panjang tidak ditolak body. Itu bukan SQL injection karena INSERT menggunakan parameter statis. Tidak ada kontrak yang membuktikan alasan penolakan harus wajib; ketiadaan alasan tidak otomatis pelanggaran kebijakan resmi. UI draf Web saat ini required/maxLength=4000, tetapi belum terintegrasi dan aturan client bukan kontrol database.

Rekomendasi proposal: pertahankan NULL sebagai alasan opsional untuk kompatibilitas; jika diberikan, tolak whitespace-only dan panjang >4000 karakter PostgreSQL, lalu trim spasi tepi. Batas 4000 dan perilaku penolakan input baru **memerlukan persetujuan backend/Flutter**, bukan dianggap kontrak resmi yang sudah disepakati. Kewajiban alasan khusus rejected ditunda sampai pemilik kebijakan memutuskan. Input reason disimpan sebagai teks; rendering aman pada Web/Flutter tetap tanggung jawab client.

### Hasil perbandingan tiga proposal — tidak dieksekusi

1. [Proposal policy roles](sql/proposals/phase4a-01-assigned-role-read.sql): logika tetap, komentar diperbarui dengan hasil review helper/recursion. META-01 kini didukung body helper: staf tanpa super_admin memang tidak memenuhi roles_staff_read existing. Proposal own-assigned role SELECT untuk staf aktif tetap dibutuhkan dan perlu uji JWT; tidak membuka role/assignment writes.
2. [Proposal review RPC](sql/proposals/phase4a-02-review-rpc-execute.sql): direvisi menjadi CREATE OR REPLACE dengan signature/default/return boolean dan transisi yang sama, auth UID null check dan helper IS NOT TRUE, validasi report ID/target NULL, alasan opsional nonblank <=4000, actor ditangkap server, FOR UPDATE serta UPDATE+history atomik. REVOKE PUBLIC/anon EXECUTE tetap ada; existing authenticated grant tidak diperluas. Owner/ACL dipertahankan CREATE OR REPLACE; tidak memakai DROP/recreate. [PostgreSQL CREATE OR REPLACE](https://www.postgresql.org/docs/17/sql-createfunction.html).
3. [Proposal default privileges](sql/proposals/phase4a-03-future-object-defaults.sql): statement tidak berubah, komentar menegaskan body dua fungsi yang aman tidak membenarkan default ACL luas bagi fungsi baru. Scope tetap tabel/sequence baru oleh postgres; function global PUBLIC EXECUTE dan managed owner supabase_admin tetap perlu review terpisah.

Semua proposal tetap PROPOSAL ONLY, NOT EXECUTED, berakhir ROLLBACK. Draft RPC belum dikompilasi/dijalankan pada PostgreSQL. Tidak mengubah owner, helper body, remote grants/RLS/data/akun ataupun UI/source aplikasi. Restore body sesudah deployment hanya melalui backup reviewed; jangan otomatis memulihkan anon EXECUTE. Definisi sumber asli tetap tersedia sebagai bukti, bukan otomatis menjadi rollback deployment yang disetujui.

### Bukti yang masih BLOCKED dan syarat acceptance

- API helper dengan UID anon/biasa/nonaktif/active tiap role/multi-role; NULL/empty/unknown p_codes; other-user assignment dan role yang dicabut pada fixture approved.
- API chain profile → own assignments → assigned roles untuk setiap limited role setelah approved policy fix; foreign admin rows tetap ditolak.
- Review RPC sebagai anon/biasa/nonaktif/role salah harus ditolak; active super/report_verifier harus lolos hanya transisi valid. NULL/unknown/same/terminal status, ID NULL/missing, reason NULL/blank/whitespace/4000/4001 harus memberi kontrak hasil yang diharapkan.
- Concurrent reviewers, riwayat tepat per perubahan, actor dari JWT, kegagalan INSERT history merollback status, serta token refresh/logout/replay. Uji mutasi hanya pada staging/fixture dengan izin eksplisit: review ini tidak menjalankannya.
- Body submit_public_report/track_public_report dan auth/storage/exposed-schema scope yang belum diterima tetap BLOCKED; hanya dua body yang sudah ditutup review statis. Kesepakatan reason, snapshot owner/ACL terbaru, migration awal dan kompatibilitas Flutter masih pending.

Atomicity yang dianalisis adalah status+history, bukan serialisasi global pencabutan role; helper menilai snapshot saat pemeriksaan dan tidak mengunci semua row izin selama transaksi. Kebijakan pencabutan in-flight request harus diputuskan backend bila dibutuhkan. Tidak mengklaim function static review menggantikan authenticated API acceptance.

QA lokal setelah revisi: lint/build PASS exit 0; main chunk 585.95 kB / gzip 171.02 kB masih memberi warning >500 kB. Pemeriksaan hash sumber, dua fingerprint body terhadap snapshot, link dokumen dan marker ROLLBACK PASS. Proposal tidak dikompilasi/dijalankan pada PostgreSQL; tidak ada uji authenticated API atau mutasi remote. Hasil browser/adapter sintetis lama tetap memiliki provenance sebelumnya dan tidak diulang untuk review ini.

## Riwayat review metadata — sebelum definisi fungsi diterima

Bagian metadata dan finalisasi terdahulu berikut dipertahankan sebagai riwayat. Pernyataan “body helper/RPC belum tersedia” untuk dua fungsi yang kini ditinjau telah digantikan review terbaru; berlaku tetap untuk fungsi lain yang body-nya belum disediakan.

Bagian ini menggantikan kesimpulan riwayat finalisasi di bawah yang menyebut katalog belum tersedia. Seluruh [JSON audit](audits/phase4a-security-audit-result.json) telah dibaca dan diperiksa oleh Codex secara lokal. SQL remote dijalankan pengguna, bukan Codex. Snapshot PostgreSQL 17.11, role postgres, transaksi read-only `on`, pada `2026-10-22T14:07:56.340869+00:00` (22 Oktober 2026, 21:07:56 WIB). Ini bukti metadata pada waktu snapshot, bukan pengujian API JWT atau jaminan state database saat ini.

SHA256 berkas asli: `b5eb27fcf897297885f247914835d2c3f1120ee660283829a4e4a9136f331d49`. Berkas asli tidak diubah. [Inventaris review lengkap](audits/phase4a-metadata-review.md) memuat seluruh 26 tabel, 200 kolom, 106 constraints, 61 index, 26 policies dan 7 functions. Bagian ini adalah status terkini; 13 bagian finalisasi lama sesudahnya dipertahankan sebagai riwayat bukti/test.

### PASS — database contract dan integritas metadata

- 26/26 relasi adalah ordinary tables public; masing-masing memiliki PK dan RLS enabled. Seluruh 106 constraint convalidated=true: 26 PK, 33 FK, 13 UNIQUE, 34 CHECK. Semua 61 index indisvalid=true; 41 unique termasuk dua partial unique index.
- Sepuluh contract columns termasuk auth.users.id/email tersedia. staff_profiles.user_id UUID NOT NULL merupakan PK dan FK auth.users(id) ON DELETE CASCADE; display_name TEXT NOT NULL dan is_active BOOLEAN NOT NULL.
- roles.id UUID PK, code TEXT NOT NULL UNIQUE dengan CHECK tepat super_admin/information_manager/report_verifier/mitigation_editor; name TEXT NOT NULL. CHECK tidak membuktikan keempat seed row tersedia.
- Assignment staff_id/role_id UUID NOT NULL, PK komposit (staff_id,role_id), FK ke profil ON DELETE CASCADE dan ke roles ON DELETE RESTRICT. Mendukung multi-role dan mencegah duplikasi pasangan.
- Dua partial unique index: (source_id,external_id) ketika external_id non-null, dan satu primary location per event. GIST geo tersedia pada event_locations, public_reports, relief_locations. Validitas index bukan bukti kecukupan performa seluruh FK/query. idx_checklists_guide mengulang susunan kolom unique index; tinjau setelah profiling, bukan temuan security.
- CHECK status aktual: laporan unverified/under_review/verified/rejected; publikasi draft/published/archived; event unknown/ongoing/resolved; verifikasi event unconfirmed/source_confirmed/staff_verified. donation_campaigns memiliki is_simulation NOT NULL + CHECK(is_simulation). auth.users.email nullable tidak otomatis melanggar kontrak auth.users.

### PASS bersyarat scope — grants dan policies existing

Seluruh tabel owner postgres, FORCE RLS false. Tidak ada view/materialized view/sequence dalam snapshot. anon/authenticated bukan superuser/BYPASSRLS/CREATEROLE/CREATEDB dan tidak memiliki CREATE schema public; tidak ada membership yang memberikan role istimewa kepada keduanya. Arah membership authenticator → client roles bukan authenticated → service_role. FORCE=false bukan otomatis kelemahan, tetapi jalur SECURITY DEFINER owner tetap perlu diperiksa. RLS tidak melindungi TRUNCATE. [PostgreSQL 17 RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).

52 grants tabel dan 400 grants kolom diperiksa: semua grants kolom S/I/U sama dengan grants tabel, tanpa tambahan akses tersembunyi. Tidak ada client TRUNCATE/REFERENCES/TRIGGER pada tabel existing. anon tidak punya direct SELECT atau DML pada staff_profiles/roles/staff_role_assignments. authenticated hanya SELECT pada ketiganya, tanpa direct INSERT/UPDATE/DELETE: tidak ada jalur self-role/self-activation lewat direct table DML yang diizinkan grants snapshot. Ini belum menutup jalur RPC.

Semua 26 policies PERMISSIVE; hasilnya dapat digabung OR. Public SELECT pada 11 tabel:

| Tabel | Predicate public-read |
| --- | --- |
| articles | publication_status=published dan published_at terisi |
| data_sources | is_active |
| disaster_events | published_at terisi dan verification_status bukan unconfirmed |
| donation_campaigns | is_active dan is_simulation |
| emergency_contacts | is_verified dan is_active |
| event_locations / event_updates | parent event memenuhi published/confirmed |
| mitigation_checklist_items | is_active dan parent guide published |
| mitigation_guides | publication_status=published |
| regions | true; seluruh wilayah dimaksudkan publik |
| relief_locations | verification_status=verified |

Public SELECT tidak membatasi kolom: seluruh kolom yang di-grant dapat terbaca, termasuk api_identifier data_sources. Periksa apakah isi kolom layak publik; metadata tidak membuktikan data sensitif benar-benar bocor. Akun biasa maupun staf nonaktif tetap boleh membaca konten publik; itu tidak sama dengan izin administrator.

Authenticated mendapat grant CRUD sembilan tabel konten (kelompok public di atas kecuali data_sources/regions); akses baris staff ALL memakai has_staff_role untuk super+information_manager, atau super+mitigation_editor bagi guides/checklist. Grant CRUD sendiri bukan bukti semua akun login bisa menulis; helper yang salah dapat membuka banyak tabel sekaligus.

Sembilan tabel tertutup direct access client dan tanpa policy: api_idempotency_keys, app_settings, audit_logs, notification_deliveries, notification_rules, notification_subscriptions, notifications, report_access_tokens, source_sync_logs. Ini default-deny yang valid untuk jalur backend. public_reports/report_attachments/report_status_history hanya SELECT authenticated dengan predicate super/report_verifier. Self-read profil/assignment memakai auth.uid() OR helper super_admin, tanpa is_active pada cabang self; staf nonaktif mungkin membaca metadata sendiri, bukan otomatis memperoleh hak admin.

### FAIL — META-01: role terbatas tidak selaras dengan query Web

Prioritas tinggi, temuan kontrak fungsional metadata/service. Satu-satunya policy roles, `roles_staff_read`, memakai `has_staff_role(ARRAY['super_admin'])`. Service Web membaca assignment sendiri lalu SELECT id/code/name dari roles untuk SEMUA role yang didukung, dan menolak hasil relasi parsial/kosong.

Dengan helper berperilaku sesuai kontrak, information_manager/report_verifier/mitigation_editor tanpa super_admin tidak bisa membaca role yang diperlukan dan akan ditolak service. Ini inferensi metadata + kode, **bukan tes login live limited-role yang sudah dijalankan**. Bila helper justru true bagi non-super, itu risiko helper yang perlu diaudit, bukan alasan menyatakan policy cocok. Mock browser sebelumnya tidak mereproduksi pembatasan ini.

[Migration usulan assigned-role read](sql/proposals/phase4a-01-assigned-role-read.sql) mempertahankan super policy dan menambahkan SELECT hanya own-assigned roles bagi staf aktif. Tidak memberikan write grant. Memerlukan review body/helper recursion dan pengujian JWT sebelum persetujuan penerapan.

### FAIL — META-02: anonymous EXECUTE pada review RPC

Prioritas tinggi, FAIL least-privilege; keberhasilan exploit belum terbukti. `public.review_public_report(uuid,text,text)` adalah SECURITY DEFINER owner postgres, search_path kosong, dan anon serta authenticated memiliki EXECUTE. Jika public diekspos Data API, fungsi dapat dijangkau tanpa login; body mungkin menolak, tetapi body tidak disertakan.

Rekomendasi: [usulan mencabut PUBLIC/anon EXECUTE](sql/proposals/phase4a-02-review-rpc-execute.sql) sambil mempertahankan authenticated existing, kemudian verifikasi body menuntut auth.uid(), staf aktif dan super/report_verifier. EXECUTE authenticated saja tidak membatasi akun biasa. Jangan memanggil RPC mutasi remote untuk menguji penolakan karena fungsi yang salah bisa benar-benar menulis.

### FAIL — META-03: default privileges objek masa depan terlalu luas

Prioritas sedang, FAIL baseline hardening; bukan bukti tabel existing terbuka. Default ACL public untuk creator postgres dan supabase_admin memberi anon/authenticated hak tabel `arwdDxtm` (termasuk TRUNCATE/MAINTAIN), sequence rwU dan function EXECUTE. Objek baru dapat terekspos jika migration berikutnya lupa memperketat grants/RLS. Default privileges tidak mengubah hak objek existing. [PostgreSQL default privileges](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).

[Usulan owner-scoped future defaults](sql/proposals/phase4a-03-future-object-defaults.sql) hanya menargetkan tabel/sequence baru buatan postgres. Managed owner supabase_admin dan global default PUBLIC EXECUTE fungsi memerlukan review provider/backend terpisah; mencabut grant EXECUTE khusus schema saja tidak membatalkan global default. Existing APIs tidak diubah usulan tersebut.

### SECURITY DEFINER, EXECUTE dan search_path

| Fungsi | Definer / owner | anon EXECUTE | authenticated EXECUTE | Penilaian |
| --- | --- | --- | --- | --- |
| public.has_staff_role(text[]) | Ya / postgres | Ya | Ya | Body BLOCKED: wajib identitas auth.uid(), profil aktif, assignment sah; argumen kode bukan bukti identitas |
| public.review_public_report(uuid,text,text) | Ya / postgres | Ya | Ya | META-02; pemeriksaan role/active/atomic audit di body belum tersedia |
| public.submit_public_report(text,text,text,uuid,text,double precision,double precision) | Ya / postgres | Ya | Ya | Akses publik mungkin disengaja; validasi/rate limiting/token/idempotency/output belum terbukti |
| public.track_public_report(text,text) | Ya / postgres | Ya | Ya | Akses publik mungkin disengaja; token hash/expiry/revocation dan anti-enumeration belum terbukti |
| public.set_updated_at() | Tidak / postgres | Ya | Ya | Invoker, dipakai enam trigger enabled O; EXECUTE luas sendiri bukan bukti eskalasi |
| auth.uid() | Tidak / supabase_auth_admin | Ya | Ya | Managed identity helper; unset search_path bukan temuan definer |
| pgbouncer.get_auth(text) | Ya / supabase_admin | Tidak | Tidak | Managed pooler, client tanpa schema USAGE; tidak diubah |

Lima definer functions seluruhnya memiliki search_path kosong eksplisit: **PASS konfigurasi ini saja**. Tidak membuktikan objek dalam body fully-qualified atau aktor divalidasi. [Supabase function security](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker).

77 policy dependencies ditinjau. Child public-read menuju parent events/guides; policy staff menuju has_staff_role, profil/assignment juga auth.uid. Tidak ada siklus tabel langsung pada ekspresi yang ditampilkan. Body helper/dynamic SQL tidak tersedia: belum dapat menutup recursion, SQL injection, caller-controlled identity, self-role mutation atau kebocoran owner privilege. Fingerprint bukan audit body. [Query follow-up read-only](sql/phase4a-function-review.sql) disiapkan untuk definisi fungsi, tanpa CALL RPC; periksa secrets dalam definisi secara privat sebelum membagikannya.

### Perbandingan dokumentasi, migration dan Flutter

Migration awal/BRD/source Flutter tidak ditemukan di workspace; hanya dua SQL audit tersedia sebelum usulan ini. **Diff migration awal: BLOCKED**, tidak mengklaim snapshot cocok migration yang belum dibaca. Struktur auth pada instruksi pengguna cocok dengan metadata; kebijakan roles berbeda dari kebutuhan Web (META-01).

| Modul Web | Metadata backend | Penilaian |
| --- | --- | --- |
| Artikel/kejadian | ALL super+information_manager; event child serupa | Bentuk predicate cocok, helper/runtime belum terbukti |
| Panduan/checklist | ALL super+mitigation_editor | Bentuk predicate cocok, helper/runtime belum terbukti |
| Laporan/lampiran/riwayat | SELECT super+report_verifier; review RPC | Bentuk SELECT cocok, jalur RPC BLOCKED/META-02 |
| Kontak darurat | ALL super+information_manager | Izin ini kini didukung bentuk policy, bukan sekadar dugaan frontend |
| Notifikasi | Tabel notifications/rules/subscriptions/deliveries tertutup client | Gap integrasi; menu UI bukan bukti backend boleh diakses |
| Pengaturan | app_settings tertutup client | Jalur admin backend belum tersedia dalam snapshot |
| Sumber data | data_sources hanya baca active; source_sync_logs tertutup | Tidak ada bukti kemampuan CRUD admin |
| Staf | Self/super SELECT profil/assignment; roles super-only; tanpa DML | CRUD belum tersedia; limited-role read FAIL |

donation_campaigns/relief_locations juga ALL super+information_manager meskipun belum punya modul admin Web khusus. Kontrak Flutter harus mempertimbangkan ini; bukan otomatis eskalasi. Nilai role/status aktual tersedia di metadata, tetapi implementasi Flutter dan kesepakatan modul bisnis tetap BLOCKED. Jangan memperluas grants hanya agar menu bekerja.

### Apakah akun biasa sudah dibatasi dengan benar?

**Sebagian didukung bukti, belum dapat dinyatakan sepenuhnya terverifikasi.** Laporan pengguna membuktikan redirect browser ke 403. Metadata mendukung penolakan direct staff access bagi anon dan direct self-role/self-activation DML bagi authenticated. Bila helper benar, akun biasa hanya memenuhi public-read/self-read dan tidak memenuhi policy admin.

Namun helper/RPC berhak owner belum ditinjau, review RPC mempunyai anonymous EXECUTE, dan request authenticated lintas objek belum dijalankan. Tidak menyimpulkan semua endpoint aman dari redirect UI atau grants tabel. Snapshot owner postgres juga bukan hasil menjalankan SELECT sebagai authenticated.

### Pengujian authenticated API yang masih diperlukan

Prasyarat: approved existing test accounts (biasa, nonaktif, tiap limited role, Super Admin), target fixture own/foreign/published/draft yang diketahui ada, lingkungan uji aman. Jangan mencatat JWT/password/email/data pribadi. Pisahkan bukti aktor/endpoint/operasi/expected/actual/HTTP/time; hasil 0 rows tidak PASS bila target memang kosong.

| Uji | Expected | Status |
| --- | --- | --- |
| Akun biasa GET foreign profile/assignment/roles dan laporan/lampiran/riwayat | Foreign/admin rows ditolak/0 sesuai kontrak; own metadata boleh sesuai policy | BLOCKED |
| Akun biasa GET audit_logs/tokens/settings | Deny direct client grants; public content boleh dibaca | BLOCKED API; metadata mendukung deny |
| Setiap limited role GET own profile/assignment/assigned roles | Rantai auth harus lengkap; dokumentasikan META-01 sebelum/sesudah approved fix | BLOCKED |
| Limited role GET allowed/forbidden admin resource | Role-specific allow/deny sesuai kontrak tanpa menganggap public content rahasia | BLOCKED |
| Super Admin GET resource admin | Allow hanya jalur yang memang di-grant; settings/notifikasi tidak diasumsikan terbuka | BLOCKED |
| Staf nonaktif GET admin-only rows / helper result | Tidak memperoleh hak admin; self metadata dan public content boleh tetap terlihat | BLOCKED |
| Tracking token salah/hilang/expired/revoked/foreign/valid | Tidak membocorkan data; jalankan hanya setelah body membuktikan read-only | BLOCKED |
| Refresh/logout/expiry dan replay JWT | UI tanpa sesi ditolak; JWT lama ditangani sesuai kebijakan backend/expiry | BLOCKED live/API |
| review RPC/self-role/is_active/submit/CRUD negative writes | Wajib ditolak untuk aktor tak berizin | NOT TESTED; staging/fixture dan izin mutasi eksplisit diperlukan |

Review ini **tidak menjalankan mutation atau RPC aplikasi**. Uji negatif mutasi berpotensi berhasil menulis bila implementasi salah; utamakan body/policy review lalu rencana staging yang disetujui. Jangan memakai transaksi owner sebagai substitusi JWT Data API.

### Bukti, scope, tindak lanjut dan acceptance

Kategori A: pemeriksaan lokal seluruh JSON/metadata, SHA256 sumber, link dokumen dan marker ROLLBACK proposal PASS. `npm.cmd run lint` dan `npm.cmd run build` setelah perubahan PASS exit 0; main chunk 585.95 kB / gzip 171.04 kB masih memberi warning >500 kB. Draft SQL belum divalidasi terhadap PostgreSQL. Kategori B: tes auth/browser sintetis sebelumnya tetap PASS, tidak diubah menjadi live evidence; tidak diulang karena source aplikasi/test tidak berubah. Kategori C: dua user-reported live browser tests (Super Admin dashboard dan ordinary /403) tetap PASS sesuai provenance. Kategori D: SQL katalog dijalankan pengguna dan ditinjau Codex kini **PASS untuk pengumpulan/review metadata**, bukan PASS keamanan keseluruhan. Probe anonim Codex sebelumnya tetap bukti penolakan tiga SELECT saja.

Katalog tidak mencakup function bodies/return types/default values, seluruh auth triggers/managed schemas/storage policies atau daftar Data API exposed schemas. Seed role rows tidak dipilih. Kesesuaian semua fitur terhadap BRD dan Flutter belum dapat dinyatakan. Tidak ada live authenticated API test baru pada review ini.

Usulan migration terpisah semuanya **PROPOSAL ONLY, NOT EXECUTED**, tidak pada direktori auto-migration, dan sengaja berakhir ROLLBACK. Penerapan sesungguhnya memerlukan persetujuan manusia, body review, staging dan deployment/rollback plan. Usulan assigned-role read melewati self-read policy/helper yang existing: tanpa body review tidak diklaim bebas recursion. Tidak mematikan RLS, memperluas write grant atau mengubah role akun.

**Gate tetap BLOCKED, bukan COMPLETE.** Hambatan hasil katalog sudah ditutup; yang tersisa ialah META-01/02/03, review body, authenticated API, migration awal dan kompatibilitas Flutter. FAIL di sini adalah pemeriksaan kontrak/least-privilege/baseline metadata; tidak ada exploit runtime yang diuji dan terbukti sehingga bukan gate FAILED. Urutan berikut: review body → sepakati remediation → manusia menerapkan hanya yang disetujui → audit snapshot baru → positive/negative API dan sesi live → evaluasi COMPLETE. Phase 4B belum dimulai.

## Riwayat finalisasi sebelum hasil katalog diterima

Pernyataan “audit remote belum tersedia” dan “belum ada temuan metadata” pada bagian historis berikut telah digantikan review terkini di atas. Hasil test lama tetap dipertahankan dengan batasnya; jangan gunakan status historis untuk menilai gate sekarang.

## 1. Executive summary

Implementasi Supabase Auth dan otorisasi frontend tersedia. Pengguna melaporkan dua pengujian browser nyata berhasil: Super Admin masuk ke dashboard `/admin`, dan akun biasa diarahkan ke `/403` dengan pesan “Akses belum terotorisasi”. Keduanya berstatus **PASS — USER-REPORTED LIVE BROWSER TEST**, bukan tes yang dijalankan Codex. Waktu pelaksanaan, browser dan identitas akun tidak disediakan dan tidak direkayasa.

Audit remote schema, policies, grants dan API authenticated masih **BLOCKED**. Tidak tersedia koneksi SQL owner/SQL Editor dalam sesi; plugin Supabase ditemukan tetapi belum terpasang/terhubung. Tidak ditemukan migration pembentuk schema maupun source Flutter dalam proyek. Tidak meminta atau membaca password, JWT, connection string, atau isi `.env.local` ke output.

Tidak ditemukan bypass frontend pada pemeriksaan kode dan tes yang tersedia; ini tidak membuktikan ketiadaan kelemahan backend. Tidak ada kelemahan database tertentu yang telah terkonfirmasi sehingga tidak dibuat migration perbaikan spekulatif. Tidak melanjutkan Phase 4B.

## 2. Authentication verification

Pemeriksaan meliputi `src/lib/supabase.ts`, seluruh `src/features/auth/`, tipe/context/hooks, AppProviders, AdminLoginPage, halaman 403, AdminLayout, sidebar/header, router dan skrip QA. Client existing menggunakan SDK Supabase. `signInWithPassword`, `getUser`, `onAuthStateChange` dan `signOut` digunakan secara nyata dalam kode produksi. Form mempertahankan desain, validasi native email/required, loading, error umum dan show/hide password. Password tidak dipersist oleh aplikasi atau dicetak ke log.

Kandidat sesi SDK harus lolos `getUser` sebelum guard menerima identitas; listener memiliki cleanup. Lifecycle menangani bootstrap/event race, account switch, timeout, token refresh, expiry dan logout. Cache role dibatalkan/dihapus pada perubahan sesi; hasil lama tidak boleh memulihkan akses. Refresh/logout/expiry **PASS pada tes sintetis**, sedangkan live refresh/logout **NOT TESTED**. Login Super Admin nyata **PASS berdasarkan laporan pengguna**.

Logout memakai scope global default SDK; ini juga dapat mengakhiri refresh session pengguna di perangkat/aplikasi lain yang memakai akun sama. Scope tidak diubah sepihak. Access JWT yang telah diterbitkan dapat tetap valid sampai expiry setelah logout. Jika kebijakan mengharuskan penolakan API seketika, evaluasi validasi sesi server untuk operasi sensitif bersama backend/Flutter; efektivitasnya pada proyek ini **BLOCKED** sampai policy/session audit tersedia. Lihat [Supabase signout](https://supabase.com/docs/guides/auth/signout) dan [session validation](https://supabase.com/docs/guides/auth/sessions#how-to-ensure-an-access-token-jwt-cannot-be-used-after-a-user-signs-out).

## 3. Authorization verification

`getVerifiedStaffAccess()` mendapatkan user dari `getUser()`, membaca `staff_profiles` berdasarkan `user_id`, menuntut boolean `is_active=true`, lalu membaca `staff_role_assignments.staff_id` dan `roles.id`. Role berupa array empat kode yang didukung. Tidak ada role langsung pada profil, auto-admin, otorisasi dari email, atau role dari user_metadata/localStorage. Filter permintaan frontend tidak menggantikan RLS.

ProtectedRoute menolak sesi tanpa verified user. RoleGuard menolak profil hilang/nonaktif, assignment kosong, role asing, relasi parsial, error query dan URL tanpa izin. Revalidasi berlangsung saat mount/focus/reconnect dan interval 60 detik; admin disembunyikan selama fetching. Pencabutan akses seketika tetap memerlukan enforcement backend. Revalidasi dapat melepas editor dan menghapus draf lokal; tidak ada data bisnis tersimpan pada fase ini.

Matriks route/menu berada di [authorization-matrix.md](authorization-matrix.md). `information_manager` existing juga mendapat kontak darurat/notifikasi. Instruksi finalisasi hanya menyebut berita/artikel/kejadian; cakupan tambahan ini **memerlukan konfirmasi pemilik kebijakan**, bukan otomatis dianggap mismatch backend karena policy remote belum tersedia. Tidak mengubah izin sepihak. Super Admin mengakses semua route yang dikenal; URL tidak dikenal tetap ditolak.

## 4. RLS audit

**BLOCKED** untuk audit policy remote dan konsistensi UI/service/RLS. Bukti remote yang tersedia hanya probe anonim read-only sebelumnya: SELECT `staff_profiles`, `staff_role_assignments`, `roles` ditolak HTTP 401 / PostgreSQL 42501. Bukti ini **PASS untuk penolakan tiga request anonim itu saja**; bukan bukti RLS enabled, ownership benar, atau authenticated aman.

Query baru: [phase4a-security-audit.sql](sql/phase4a-security-audit.sql). Query menghasilkan satu JSON dari katalog di dalam transaksi read-only, lalu ROLLBACK. Tidak membaca baris staf/auth, memanggil RPC aplikasi, menampilkan function bodies, atau mengubah schema/data. SQL **NOT TESTED terhadap PostgreSQL**, karena koneksi database tidak tersedia; peninjauan teks lokal bukan bukti sukses eksekusi.

Query memprioritaskan kontrak auth/staf dan menginventarisasi kandidat schema aplikasi beserta seluruh tabel, partition, foreign table, view/materialized view, kolom, constraint termasuk FK masuk/keluar, index, policy, ACL, grants efektif tabel/kolom, role/membership, default ACL, metadata fungsi, search_path, execute privilege, trigger dan dependency policy/view. Managed schemas dikecualikan dari inventaris umum. Cocokkan dengan daftar Data API exposed schemas di Dashboard; audit storage/managed schemas secara terpisah bila dipakai aplikasi.

Function bodies harus diperiksa secara privat untuk ownership, validasi aktor, dynamic SQL, search_path dan recursive policy. Dependency katalog tidak menangkap semua referensi dalam string SQL/body fungsi. View dapat membuka jalur akses berbeda; jangan menyimpulkan RLS aman hanya dari flag tabel. Pedoman: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) dan [security-definer functions](https://supabase.com/docs/guides/database/functions#security-definer-vs-invoker).

## 5. Database schema verification

**BLOCKED** sampai JSON katalog diterima dan ditinjau. Laporan live mendukung keberhasilan alur profil/role pada akun Super Admin, tetapi tidak membuktikan constraint database. Verifikasi wajib:

- `staff_profiles.user_id`: tipe kompatibel dengan auth ID, PK/UNIQUE dan FK tepat ke `auth.users.id`.
- Assignment: FK `staff_id` ke profil dan `role_id` ke roles, pasangan unik dan reference NOT NULL.
- `roles.id` PK; `roles.code` unik, tipe/nullability sesuai, empat kode role yang disepakati tersedia. Query katalog tidak membaca seed role: daftar kode harus diperiksa pemilik database secara terpisah tanpa membagikan data akun.
- `is_active` boolean dan constraint/default sesuai kontrak; kolom display_name/name sesuai service. Jangan menebak default yang dianggap benar.
- FK/constraint tervalidasi; index unique valid; semua tabel aplikasi yang terekspos memiliki enforcement yang sesuai.

## 6. Privilege escalation assessment dan negative testing

Status runtime berikut khusus live/backend; bukti sintetis dicatat terpisah.

| Skenario | Bukti yang tersedia | Status live/backend |
| --- | --- | --- |
| Tanpa sesi membuka `/admin` | PASS browser produksi tanpa sesi pada run sebelumnya | PASS lokal; deployment NOT TESTED |
| Akun biasa membuka admin | USER-REPORTED LIVE: dialihkan ke 403 | PASS untuk alur yang dilaporkan |
| Akun biasa memanggil endpoint admin langsung | Tidak ada sesi uji authenticated yang tersedia | BLOCKED |
| Role terbatas membuka route terlarang | PASS sintetis report_verifier | BLOCKED live |
| Staf nonaktif membuka dashboard | PASS sintetis | BLOCKED live |
| Manipulasi frontend/user_metadata untuk menyamar admin | PASS adapter mengabaikan metadata; client tetap dapat dimodifikasi pengguna | BLOCKED untuk pembuktian penolakan API backend |
| Membaca profil/assignment staf lain | Tidak dijalankan dengan JWT uji | BLOCKED |
| Mengubah role sendiri | Tidak melakukan write; policy belum diaudit | BLOCKED; mutation NOT TESTED |
| Mengubah is_active / membuat profil sendiri | Tidak melakukan write; policy belum diaudit | BLOCKED; mutation NOT TESTED |
| Akses kembali endpoint sesudah logout | PASS sintetis untuk route; replay JWT belum diuji | BLOCKED API; live logout NOT TESTED |

Tidak ada uji negatif yang memodifikasi role, akun, is_active atau data remote. Pencegahan self-assignment/self-activation harus dibuktikan lewat grants + policy/helper dan pengujian di lingkungan uji yang disetujui. Menyembunyikan tombol tidak menjadi bukti.

## 7. Frontend security assessment

**PASS dalam cakupan inspeksi/test lokal**: fail-closed, pemeriksaan identitas backend, array role, penolakan payload malformed/error, cache terisolasi per identitas/revision, tanpa kredensial akun hardcoded dalam src, dan tanpa operasi tulis role dari React. Pemindaian 160 file source/build tidak menemukan pola known Supabase privileged key; ini bukan audit semua jenis secret. Konfigurasi client/environment tidak diubah. Tidak ada klaim bahwa manipulasi client tidak mungkin; server wajib menolak permintaan tidak berizin.

Warning bundle utama 585.95 kB / gzip 171.04 kB tetap ada. Ini risiko performa yang tercatat, bukan kegagalan auth atau bukti kelemahan kritis.

## 8. Web/Flutter compatibility

Source Flutter dan kontrak backend resmi tidak ditemukan: verifikasi lintas aplikasi **BLOCKED**. Empat kode role Web sesuai instruksi dan dipusatkan di `src/types/auth.ts`; mapping route Web adalah konfigurasi UI, bukan sumber hak backend. Tidak ada perubahan kontrak, role, status atau policies. Nilai status draf UI bukan bukti enum database. Cocokkan role array, is_active, seluruh status bisnis dan semantics logout bersama developer Flutter. Audit RLS harus bekerja dari JWT dan state database tanpa bergantung framework, header khusus Web atau menu client.

## 9. A — Automated Tests dan B — Mocked/Synthetic Tests

| Kategori | Perintah / bukti | Hasil dan provenance |
| --- | --- | --- |
| A | `npm.cmd run lint` | PASS exit 0; dijalankan Codex pada finalisasi |
| A | `npm.cmd run build` | PASS exit 0; dijalankan Codex pada finalisasi, warning bundle tetap |
| A | `node scripts/audit-client-secrets.mjs` | PASS 160 file; dijalankan Codex pada finalisasi |
| B | `node scripts/test-auth.mjs` | PASS 23 adapter/lifecycle scenarios; dijalankan Codex pada finalisasi; [JSON](qa/phase4a/auth-tests.json) |
| B | `node scripts/check-foundation.mjs` | PASS 27 URL/cabang guard; dijalankan Codex pada finalisasi, dependencies terisolasi |
| B | `node scripts/audit-foundation.mjs` | PASS 108 modul / 342 edges; bukti run sebelumnya, mencakup SSR/stub |
| B | `node scripts/smoke-auth-browser.mjs` | PASS 11 kelompok / 164 synthetic requests; [hasil run sebelumnya](qa/phase4a/browser-auth/results.json) |
| B | `node scripts/smoke-admin-browser.mjs --phase4a` | PASS 36 kombinasi dan 13 kelompok interaksi; [hasil run sebelumnya](qa/phase4a/admin-ui/results.json) |

Tidak ada npm test script; skrip node relevan dijalankan langsung. Browser tidak diulang karena run sebelumnya sudah lulus dan finalisasi tidak mengubah aplikasi, SDK, konfigurasi, ataupun test browser. Tidak mencampurkan PASS sintetis dengan bukti live. Hasil unit relevan diulang untuk memverifikasi state workspace saat finalisasi; tidak ada klaim unit test sebagai tes integrasi remote.

## 10. C — User-Reported Live Tests

Sumber: instruksi finalisasi yang dilampirkan pengguna. [Catatan terstruktur](qa/phase4a/user-reported-live-tests.json).

| ID | Hasil yang dilaporkan | Status | Batas bukti |
| --- | --- | --- | --- |
| A | Login akun Super Admin Supabase berhasil; `/admin` menampilkan dashboard | PASS | USER-REPORTED LIVE BROWSER TEST; bukan CODEX-EXECUTED |
| B | Akun biasa tanpa role administrator diarahkan ke `/403`, pesan “Akses belum terotorisasi” | PASS | USER-REPORTED LIVE BROWSER TEST; tidak diketahui apakah profil hilang, nonaktif atau assignment kosong |

Kedua hasil tidak membuktikan semua route, role, refresh, logout, RLS atau grants telah lulus.

## 11. D — Remote Database Verification dan cara menjalankan audit

| Pemeriksaan | Status | Bukti |
| --- | --- | --- |
| Tiga SELECT anonim read-only | PASS, run Codex sebelumnya | [anonymous-probe.json](qa/phase4a/anonymous-probe.json), HTTP 401 / 42501 |
| Schema/PK/FK/UNIQUE/nullability aktual | BLOCKED | Belum ada hasil katalog remote |
| RLS/grants/policy/helper/search_path/recursion | BLOCKED | Belum ada hasil katalog dan peninjauan function body |
| API authenticated lintas akun dan role | BLOCKED | Sesi uji approved tidak tersedia dalam sesi Codex |
| SQL audit baru dieksekusi | NOT TESTED | File hanya disiapkan lokal |

Langkah pemilik proyek:

1. Buka Supabase Dashboard dan pilih **project yang sama dengan RekanSiaga Web/Flutter**. Buka SQL Editor, buat query baru.
2. Salin seluruh isi `docs/sql/phase4a-security-audit.sql`, termasuk `BEGIN TRANSACTION READ ONLY` dan `ROLLBACK`. Jalankan sebagai owner. Jika editor hanya menampilkan hasil statement terakhir, jalankan blok BEGIN + SELECT dahulu pada sesi editor yang sama, ekspor JSON, kemudian ROLLBACK; jangan mengeksekusi statement tambahan atau function aplikasi.
3. Simpan satu hasil JSON tanpa truncation untuk tinjauan privat. Periksa metadata sebelum membagikan; jangan sertakan password, JWT, secret, email atau data baris staf. Jika UI tidak mempertahankan sesi antar-run, jalankan seluruh script dan gunakan result SELECT yang disediakan editor, atau pilih hanya statement WITH ... SELECT (statement itu juga hanya membaca katalog).
4. Cocokkan inventory dengan exposed schemas di Data API, serta modul Web/Flutter. Tinjau function bodies di Dashboard secara privat: fingerprint bukan verifikasi logika fungsi.
5. Dengan akun uji existing yang disetujui, lanjutkan uji baca langsung API sebagai anon, akun biasa, staf terbatas, staf nonaktif dan Super Admin. Catat aktor anonim/label akun, resource, operasi, HTTP/kode error dan hasil yang diharapkan tanpa menyimpan JWT/data pribadi. Query own-profile positif harus berhasil untuk staf aktif; query foreign-profile negatif harus ditolak/0 rows sesuai kontrak. Untuk hasil kosong, gunakan target fixture yang keberadaannya diketahui pengelola agar tidak menyimpulkan PASS hanya karena tabel kosong.
6. Uji refresh/logout dan replay token hanya di lingkungan uji resmi; jangan membagikan token. Jangan melakukan mutation akun/role/profil. Jika write enforcement belum terbukti lewat policy, pengujian mutasi memerlukan rencana fixture/staging dan izin eksplisit terlebih dahulu.

SQL Editor dengan role owner dapat melewati RLS: sukses SELECT sebagai owner tidak membuktikan akses authenticated aman. Tidak menggunakan SET ROLE sebagai substitusi bukti JWT end-to-end. Akses audit juga dapat diberikan melalui plugin Supabase setelah dipasang dan dihubungkan; belum ada koneksi yang dikonfirmasi saat laporan ini ditulis.

## 12. Outstanding issues dan acceptance gate

| ID | Masalah | Penutupan yang dibutuhkan |
| --- | --- | --- |
| SEC-01 | Audit katalog/policy remote BLOCKED | Hasil SQL lengkap + review schema, grants, fungsi, view dan keterkaitan tabel |
| SEC-02 | Negative API authenticated BLOCKED | Bukti own/foreign reads, role terbatas/nonaktif, endpoint sensitif dan replay/logout |
| SEC-03 | Konsistensi permission lintas backend/Flutter BLOCKED | Review kontrak termasuk kontak/notifikasi information_manager dan status bisnis |
| SEC-04 | Live refresh/logout/expiry/error dan cabang staf belum lengkap | Pengujian approved accounts tanpa perubahan data nyata |

Tidak ada temuan kritis backend yang sudah terbukti; **ketiadaan bukti bukan pernyataan aman**. Tidak ada critical test yang dijalankan dan terbukti bypass, sehingga status bukan FAILED. COMPLETE belum boleh diberikan karena SEC-01/02 dan pemeriksaan wajib lain belum selesai. Status final **BLOCKED** mengikuti acceptance gate pengguna.

File finalisasi: dokumen ini, `sql/phase4a-security-audit.sql`, `authentication.md`, `authorization-matrix.md`, `development-status.md`, `qa/phase4a/user-reported-live-tests.json`; hasil auth test/secret scan diperbarui oleh perintah. Source aplikasi, UI, client/env, dependency/lockfile, database dan akun dipertahankan.

## 13. Recommendations for Phase 4B

Jangan mulai Phase 4B sebelum hambatan wajib ditutup dan gate ditinjau ulang. Urutannya: audit katalog nyata, review helper/policy/backend, uji API negatif/positif lintas peran, lalu lengkapi sesi live dan kompatibilitas Flutter. Jika ada kelemahan terkonfirmasi, dokumentasikan sumber/dampak dan siapkan migration usulan terpisah untuk persetujuan manusia; jangan menerapkannya otomatis. Integrasi data bisnis/CRUD memerlukan kontrak schema dan otorisasi server yang sudah dibuktikan.
