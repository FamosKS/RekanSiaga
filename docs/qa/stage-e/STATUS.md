> **Checkpoint integrasi konten 2 November 2026:** PASS LOCAL / NEEDS CLOUD. Test integrated-content 8/8, SQL contract 19/19, build, lint, dan Edge typecheck PASS. Tidak ada Cloud mutation. Feed kejadian publik, CMS artikel, approval/revoke foto, sanitasi salinan, dan akses anonim masih belum LIVE PASS. Tahap E tetap terbuka sampai acceptance LIVE terbatas selesai; jangan mengulang A-D atau CRUD lama.

## Checkpoint Informasi Utama — 3 November 2026

**PASS LOCAL / OPERATOR APPROVAL RECEIVED / CLOUD DEPLOYMENT PENDING / LIVE NOT RUN.** CMS Artikel existing kini memiliki kontrol unggulan khusus artikel published, panel untuk membatalkan pilihan lintas halaman, dan invalidasi cache publik. Beranda membaca featured RPC yang dirancang additive, memakai published terbaru sebagai fallback, dan empty state bila tidak ada artikel terbit. SQL lokal lulus 11/11 skenario PostgreSQL/WASM dengan fixture sintetis. `npm run lint` dan `npm run build` PASS; build masih memberi warning bundle existing >500 kB. Approval migration additive `rekansiaga-dev` diterima 3 Nov 2026. Sesi agent tidak dapat menggunakan Supabase CLI/auth jaringan dan tidak memiliki password untuk prompt native psql; karena itu Cloud belum dimutasi dan LIVE belum dijalankan. Tidak ada artikel dibuat atau Flutter/staging diubah. Detail paket dan checklist operator: `docs/runbooks/featured-article-v1.md`; bukti tes: `docs/qa/stage-e/featured-article-local.json`.

> **Checkpoint RLS prerequisite 2 November 2026:** manifest compatibility telah diselaraskan ke artefak RK2 aktual. Eksekusi paket berhenti sebelum SQL karena sesi alat tidak dapat mengisi prompt password native; tidak ada Cloud mutation. Paket siap dijalankan sekali oleh operator pada PowerShell interaktif.

> **Rekonsiliasi guard RK2 2 November 2026:** hasil read-only operator: `public_reports` RLS **DISABLED**, `track_report_v1(text,text)` **FOUND**. Guard lama juga memeriksa signature submit dasar yang bukan entrypoint langsung Gateway; telah diperbaiki untuk memeriksa `submit_report_v1` 9 argumen, submit dasar 7 argumen/CSPRNG, dan tracking v1 secara terpisah. Manifest diperbarui. Tes terdampak PASS (6 Gateway + 8 SQL/WASM). Tidak ada Cloud mutation/retry. Status **BLOCKED** sampai RLS dipulihkan dengan approval terpisah.

> **Update approval/deployment RK2 2 November 2026:** approval eksplisit operator tersedia dan password diterima. Percobaan resmi berhenti **BLOCKED oleh guard keamanan SQL**: `STOP: existing private report RLS and tracking required` pada baris 12-14. Transaksi berhenti sebelum fungsi v2 dibuat; tidak ada bukti SQL commit atau Gateway deploy. Jangan retry atau melemahkan RLS; lakukan rekonsiliasi read-only terhadap RLS dan signature tracking v1.

> **Checkpoint RK2 2 November 2026:** paket deployment diperiksa dan **READY FOR EXPLICIT OPERATOR APPROVAL**; belum DEPLOYED dan belum PASS LIVE. Preflight hash tanpa switch PASS serta tidak melakukan network call/mutasi. Scope terbatas pada dua RPC service-only, deploy additive Gateway, dan aktivasi flag frontend setelah backend sukses. RLS/policy/data/grant/secret, CAPTCHA, rate limiting, Storage, dan v1 dipertahankan. Rollback: flag false/restart dan v1 tetap tersedia; jangan retry SQL bila hasil tidak pasti.

> Pembaruan setelah penerapan: operator melaporkan SQL dan deploy Gateway berhasil. Pemeriksaan LIVE independen pada 2 November 2026: HEAD anonim pada laporan pilihan HTTP200/count0 PASS; tidak mengambil body. Bukti: live/report-privacy-after-deploy.json. Akses staf setelah RLS, tracking dengan CAPTCHA/token pribadi, dan runtime Flutter masih menunggu acceptance. Kegagalan privasi pada bagian historis di bawah telah ditutup untuk probe yang sama; E keseluruhan belum PASS.

> Pembaruan 2 November 2026: paket perbaikan Cloud yang dijelaskan telah disetujui melalui instruksi pengguna untuk melanjutkan sisanya. Belum diterapkan; menunggu eksekusi skrip di PowerShell operator untuk prompt password psql. Status hasil pengujian sebelumnya tetap. Keterangan PROPOSED/belum disetujui di bawah merupakan riwayat sebelum persetujuan ini.

# Hasil paket E, diperbarui 2 November 2026

Target tunggal: rekansiaga-dev `uiuiouosblyuqgnvfpeh`. Scope seluruh paket disetujui1 November; sesi Super Admin dipulihkan2 November. A-D diterima dan tidak diulang. Tidak ada migration/deployment/security change, perubahan staging/Flutter atau DELETE fisik.

**E belum PASS. Integrasi/cleanup sembilan konten TEST terbukti LIVE. Laporan Flutter pilihan operator terbukti verified dengan history/audit, tanpa mutasi. Dua hambatan nyata tersisa: kode RPT belum kompatibel pada Cloud tracking dan baca anonim kolom privat laporan masih terbuka. Patch lokal + paket Cloud PROPOSED telah siap, belum disetujui/dijalankan. Bagian riwayat di bawah bukan status terbaru.**

| Fitur | Status | Bukti dan batas aktual |
|---|---|---|
| Tracking laporan | BLOCKED Cloud | Operator mengganti kebutuhan dua laporan baru dengan laporan Flutter existing yang dipilihnya; status/history verified dibaca actual. Format RPT ditolak validator lama; fix Web/shared parser dan SQL PROPOSED siap, tes lokal PASS, tetapi Cloud belum diubah dan HTTP200 tracking RPT belum dibuktikan. Token tetap pribadi/64hex. |
| Artikel | PASS LIVE |201 draft;200 publish/update/archive. Detail publik memuat versi terbit yang sama; setelah archive tidak terbaca anonim. |
| Kejadian bencana | PASS LIVE | Create/edit/verifikasi/publikasi, child update dan lokasi pada parent yang sama. Detail/peta publik diperiksa. Cleanup published_at=NULL/status resolved; parent dan child tersembunyi anonim. |
| Kontak darurat | PASS LIVE | Inactive->aktif+verified, edit tampil publik, lalu cleanup inactive. Nomor kosong dan URL example.invalid; tidak memakai nomor darurat palsu. |
| Panduan/lokasi bantuan | PASS LIVE | Panduan published+checklist tampil detail; lokasi verified tampil /darurat (pemeriksaan UI dilengkapi2 November). Cleanup archived/checklist inactive/relief unverified; semuanya tersembunyi anonim. |
| RBAC/audit | FAIL privasi laporan; audit PASS |22 audit TEST cocok; laporan pilihan memiliki audit UPDATE sesuai Admin. Namun client publik session=NULL mendapat HEAD200/count1 untuk kolom privat UUID itu, tanpa body. Tidak menganggap seluruh RBAC PASS. Dua restrictive SELECT policies PROPOSED sudah lulus tes lokal, Cloud belum diubah. Audit anonim tetap ditolak401/42501. |
| Cleanup TEST | PASS LIVE lingkup run |9/9 UUID TEST tersembunyi anonim tanpa filter status aplikasi; audit/relasi dipertahankan, DELETE0. Tidak membuat2 laporan baru. Laporan Flutter pilihan operator hanya dibaca dan tidak masuk cleanup TEST. |
| Kontrak Flutter | BLOCKED tracking RPT; submit/review terbukti |Source Flutter tidak diubah. Operator mengonfirmasi submit mobile; Cloud menunjukkan verified/history/audit. Web/shared parser kini menerima legacy RPT secara lokal; penerapan fungsi/Gateway dan tracking nyata masih pending. Canonical token/CAPTCHA/response contract tetap; transport mobile di luar Gateway perlu dikonfirmasi tim mobile. |

Auto-reload: root fix Auth/RoleGuard/draft sebelumnya tetap dipakai. Tambahan penyebab LIVE adalah Vite reload ketika jurnal QA ditulis; `vite.config.ts` mengabaikan docs/qa, .tools dan scripts, dengan HMR aplikasi tetap aktif. Tab kontak LIVE mencapai hidden->visible dengan dokumen/form/nilai/fokus/scroll utuh; menu kejadian->artikel mempertahankan dokumen. Percobaan laporan/artikel/kejadian lainnya menjaga seluruh state tetapi window tidak kembali foreground, sehingga **BLOCKED_BROWSER_FOREGROUND**, bukan bukti kehilangan input. Tidak mengklaim10 pola LIVE PASS dari tes lokal sebelumnya.

`TurnstileChallenge.tsx` kini mempunyai **Coba verifikasi lagi**, mengulang widget tanpa reload/submission otomatis. Uji widget sungguhan membuktikan draft/form/dokumen tetap; challenge provider tetap terpisah dan belum PASS pada sesi otomasi. CAPTCHA/action/validasi server tidak diturunkan.

Bukti aktual pada `live/TEST-E-20261101-a881d0*`: journal utama9 creates+13 updates=22 HTTP201/200; `-audit.json`22 audit/9 UUID/actor cocok; `-anonymous.json` hasil terakhir9/9 tersembunyi dan audit401/42501; `-browser.json` menyimpan PASS maupun foreground BLOCKED; `-reports.json` lookup/review operator tanpa kode/token. Lint targeted serta `npm.cmd run lint` PASS; build PASS2 November setelah perubahan retry, warning bundle existing >500kB tetap. Unit/regresi yang telah PASS tidak diulang.

Perubahan pelanjutan awal: `vite.config.ts`, `TurnstileChallenge.tsx`; runner/helper `run-stage-e-live.mjs` (resume caps dan route/audit evidence), `stage-e-browser-action.mjs`, `invoke-stage-e-actions.ps1`, `review-stage-e-operator-reports.mjs` (alat rencana dua judul awal yang akhirnya tidak dimutasi); dokumen bukti/runbook. CRUD TEST selesai dalam scope awal. Tidak ada Cloud Gateway/SQL/grants/RLS, Flutter atau staging yang diubah.

**Pembaruan akhir setelah operator memberikan laporan Flutter:** shared `reportContract.ts`, `reportSchema.ts` dan `TrackingForm.tsx` kini mendukung RPT10alnum + RS16hex; token64hex dan semua kontrol tetap.6 tes kompatibilitas +9 regresi handler PASS;7 local PostgreSQL tracking checks dan6 privacy checks PASS. Lint/build/Edge typecheck PASS. Tiga SQL file PROPOSED, `apply-dev-report-compat.ps1`, hash manifest baru dan [paket persetujuan](../../runbooks/stage-e-report-compat-privacy.md) siap. Source/code lokal berubah, **Cloud Gateway/fungsi/policy belum berubah**. Scope awal E hanya data TEST; perubahan policy/fungsi/deploy ini memerlukan satu persetujuan tambahan sesuai batasan pengguna.

Bukti baru: `live/TEST-E-20261101-a881d0-operator-existing-report.json` (read-only verified/history/audit; provenance Flutter dari operator), `-operator-report-privacy.json` (HEAD session=NULL/count1 tanpa body), `-tracking-compatibility.json` (reproduksi validator lama), `tracking-compat-local-runtime.json` dan `report-privacy-local-runtime.json` (PostgreSQL/WASM lokal, bukan Cloud). Tidak mengambil token/isi pribadi laporan. Seluruh code changes Cloud masih PROPOSED; rollback format tidak menghapus pembatasan privacy.

## Riwayat lokal dan persiapan sebelum pengujian LIVE

**Update 1 November 2026:** persetujuan seluruh scope LIVE telah diterima; flag konten/review lokal diaktifkan melalui skrip existing. Server `http://localhost:5173` dan Chrome LIVE dengan profil khusus sedang berjalan, menunggu login Super Admin dev existing. Cloud business mutations0, report TEST baru0, row konten baru0. Tidak mengulang tes lokal yang PASS, A-D, migration, seed atau deployment. Journal: `live/TEST-E-20261101-a881d0.json`. Tabel di bawah belum berubah menjadi PASS LIVE karena operasi tersebut belum dapat dijalankan tanpa sesi staf. Larangan DELETE fisik berlaku juga untuk child. Persetujuan Cloud tidak perlu diminta ulang.

Status keseluruhan: **LOCAL READY; LIVE E BLOCKED** menunggu sesi staf existing dan tindakan CAPTCHA yang sah. Tidak mengklaim seluruh E PASS. A-D tidak dijalankan ulang; tidak ada mutation/deployment/migration Cloud, perubahan staging atau file Flutter.

| Fitur | Hasil lokal yang diuji | Status LIVE E |
|---|---|---|
| Tracking laporan | PASS: RPC review tetap, hasil unverified/under_review/rejected sesuai reader tracking pada Chrome fixture; validasi verified/RBAC/transisi juga diuji pada service | BLOCKED: tracking CAPTCHA nyata setelah perubahan status belum dijalankan |
| Artikel | PASS: create draft, publish, update, archive dan anonim list/detail | BLOCKED: CRUD pada Cloud belum disetujui |
| Kejadian | PASS: create/edit/publikasi dan reader publik; validasi child/FK pada service existing | BLOCKED: operasi Cloud belum dijalankan |
| Kontak | PASS: create/edit/aktif+verified muncul publik, nonaktif hilang | BLOCKED: operasi Cloud belum dijalankan |
| Panduan/lokasi bantuan | PASS: panduan/checklist aktif/detail, lokasi verified dan cleanup logis | BLOCKED: operasi Cloud belum dijalankan |
| RBAC/audit | PASS: matrix route/role, mutation checks dan audit metadata reader; hasil A existing diterima | BLOCKED: audit operasi paket ini pada Cloud belum tersedia; fixture bukan bukti trigger LIVE |
| Cleanup TEST | PASS: alur logis existing dan runbook exact-ID disiapkan | BLOCKED: inventaris/eksekusi LIVE; purge fisik laporan final tidak tersedia pada kontrak existing |
| Kontrak Flutter | PASS: target/core kolom/filter Dart existing vs Web; HTTP/JSON/status/FK/nullable/geography didokumentasikan tanpa perubahan Flutter | BLOCKED untuk runtime aplikasi/perangkat/native CAPTCHA; kontrak lokal tidak membuktikan Flutter E2E |

Anti-auto-reload: **PASS pada Chrome lokal dengan backend sintetis**. Sepuluh pola: artikel, kejadian, kontak, panduan, lokasi bantuan, pengaturan, staf, laporan publik, tracking dan review. Masing-masing memakai tab about:blank nyata, visibility hidden lalu kembali visible, query role sengaja ditunda. DOM form, nilai/checkbox, elemen fokus, posisi kursor dan scroll halaman/modal tetap. Klik menu internal nyata menjaga dokumen dan draft, dengan Lanjutkan draf. Refresh manual untuk menguji recovery sukses, termasuk pilihan wilayah; CAPTCHA dipulihkan sebagai challenge baru dan token/file tidak dicadangkan.

Cadangan recovery opt-in terenkripsi di sessionStorage; frasa/kunci tidak disimpan, berlaku8 jam. Logout/pergantian akun membersihkan draf; error jaringan verifikasi sementara tetap memblokir akses privat tetapi tidak memusnahkan cadangan pemilik terakhir. Owner namespace dicocokkan saat enkripsi/restore. Ini bukan penyimpanan data formulir sensitif di localStorage. Penyimpanan Auth SDK existing terpisah dan tidak diubah.

## Bukti yang benar-benar tersedia

- `browser.json`: **23 skenario PASS_LOCAL_ONLY**, 10 perpindahan tab nyata. Backend/CAPTCHA/Auth/RPC/REST dicegat dengan fixture sintetis; **bukan LIVE acceptance**, Cloud writes0. Navigasi dokumen yang tercatat adalah Page.navigate/reload manual oleh runner; tab/menu checks memakai token dokumen untuk mendeteksi reload yang tidak diminta.
- `local-tests.json`: **8/8 tes E spesifik PASS**, termasuk revalidation, scope content vs role, reader publik, encryption/restore/tamper/expiry dan penolakan token/file. `npm.cmd run test:stage-e` keseluruhan **37/37 PASS**; 23 regresi Auth yang terdampak juga PASS.
- `public-readonly.json`: **6 GET anonim LIVE HTTP200** (artikel, kejadian, kontak, panduan, lokasi, sumber); sampel konten terbit kosong saat pemeriksaan, sumber mempunyai sampel1. Bukan bukti create/update/publication, audit atau tracking LIVE.
- `operator-script-tests.json`: fixture PowerShell PASS untuk check-only, flag scope approved, preserved unrelated settings, wrong-project rejection dan credential output NONE. Check-only pada konfigurasi proyek nyata juga PASS.
- `configuration-check.json`: target dev benar; global/content writes false; routine review dan Gateway existing true. Tidak menampilkan key/secret.
- `npm.cmd run lint` **PASS tanpa warning baru**; `npm.cmd run build` **PASS**, warning bundle existing >500kB tetap.

Percobaan awal harness diperbaiki: menunggu data/redirect role yang benar, label halaman yang tepat, request yang dibatalkan saat navigasi, dan terutama isolasi cache Vite/HMR agar tidak berbenturan dengan server development lain. Konfigurasi HMR aplikasi utama tidak dimatikan. Artefak browser final di atas adalah run lengkap yang sukses.

## Perubahan kode aktual pada paket ini

- `src/features/auth/authLifecycle.ts`, `RoleGuard.tsx`: tidak reset cache/revision untuk revalidation identitas yang sama; background role fetching tidak membongkar Outlet. Logout, expiry, revoke, identity mismatch, timeout dan RBAC tetap ditolak.
- `src/features/drafts/draftVault.ts`, `useDraftState.ts`, `DraftRecovery.tsx`, `src/app/providers/AppProviders.tsx`: draft memori terpusat dan pemulihan terenkripsi per tab/akun, pembersihan, safe field filtering, tanpa penyimpanan kredensial sebagai draft.
- `src/features/content/ArticleWorkspace.tsx`, `src/features/admin/RemoteResourcePage.tsx`, `StaffWorkspace.tsx`, `src/pages/admin/AdminReportDetailPage.tsx`: draft editor, resume, konfirmasi ganti record dan clear sesudah sukses. Data server tidak otomatis menimpa editor.
- `src/features/reports/ReportForm.tsx`, `ReportFormFields.tsx`, `TrackingForm.tsx`: draft field publik/UUID wilayah dan kode tracking; restore RHF secara eksplisit, CAPTCHA baru; access token/receipt/file tetap tidak dicadangkan.
- `src/features/admin/adminDataService.ts`, `src/features/content/articleAdminService.ts`, `.env.example`: approval khusus content dev beserta source dependency; tidak membuka staf/settings/notifikasi/global write. Flag utama konten masih off menunggu persetujuan.
- `scripts/test-stage-e.mjs`, `test-stage-e-browser.mjs`, `check-stage-e-public.mjs`, `prepare-stage-e.ps1`, `package.json`; adaptasi fixture env/draft pada `test-mvp.mjs`, `test-report-review-scope.mjs`. Tidak memasang dependency atau mengubah lockfile.
- Runbook tunggal `docs/runbooks/stage-e-complete.md`, kontrak `docs/stage-e-backend-contract.md`, status/evidence/template pada direktori ini; pembaruan development-status/shared contract. Tidak mengubah source Gateway, SQL, project Flutter atau staging.

## Hambatan tersisa dan satu tindakan operator

1. Persetujuan scope seluruh operasi LIVE, bukan per tombol/per modul, dan login UI staf existing yang sah. Tidak meminta password/JWT di chat.
2. Inventaris exact-ID TEST legacy dan keputusan retensi untuk laporan final. Cleanup logis tersedia; purge fisik final/token/lampiran tidak tersedia melalui aplikasi existing.
3. Aplikasi/perangkat Flutter serta BRD asli belum tersedia untuk klaim penerimaan runtime/BRD penuh.

Gunakan hanya `docs/runbooks/stage-e-complete.md` untuk satu paket approval: maks.2 laporan anonim tanpa foto, 1 artikel, 1 kejadian +1 update +1 lokasi kejadian, 1 kontak, 1 panduan +1 checklist, 1 lokasi bantuan, opsional1 sumber TEST jika perlu. Maksimal11 row bisnis baru dan efek audit/history/quota normal. Reuse TEST existing bila sesuai. Semua operasi/cleanup hanya pada ID run/daftar legacy yang diklasifikasikan operator.

Setelah disetujui, satu perintah `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\prepare-stage-e.ps1" -ApprovedStageEScope`, satu restart Vite, lalu seluruh matriks acceptance dan cleanup pada runbook. Script sendiri hanya mengubah flag lokal; tidak mengirim Cloud mutation. Jangan mengisi template hasil sebagai PASS sebelum operasi LIVE dan pembacaan ulang benar-benar berhasil.
> **Update RK2 deployed 2 November 2026:** output operator membuktikan privacy/compatibility dan RK2 applied/deployed pada `rekansiaga-dev`; Gateway berhasil deployed dan predicate RPT sudah tersedia tanpa replay. Flag frontend lokal aktif. Script aktivasi gabungan berhenti pada hash D lama; server activation probe dan LIVE submit/track/review belum dijalankan. Status **CLOUD DEPLOYED; LIVE NOT RUN**.

> **Fix receipt flag 2 November 2026:** helper aktivasi hanya menulis flag Gateway, sehingga UI fallback masih menampilkan token pribadi. Helper kini menulis flag Gateway + single-code; lint dan 6 tes kontrak single-code PASS. Restart Vite dan submit baru diperlukan; receipt lama tidak berubah retroaktif.
> **Peta publik — 2 November 2026:** Leaflet lokal PASS build/lint. RPC tersanitasi `list_public_verified_report_map()` telah disiapkan sebagai PROPOSED dan operator menyetujui scope terbatasnya; belum diterapkan Cloud dan belum ada LIVE PASS. `public_reports` tetap RLS-protected, marker hanya `verified` + koordinat valid, judul disanitasi, foto/lampiran tetap privat. Feature flag frontend default false. Jangan mencentang peta verified sebagai PASS sampai postflight dan observasi Admin-verify→marker nyata berhasil.

> **Peta/foto follow-up:** akar masalah koordinat telah diperbaiki lokal; Gateway submission sekarang menerima koordinat perangkat/manual. Paket foto publik hanya mengeluarkan signed URL untuk attachment laporan `verified`, melalui RPC service-role-only + Gateway Turnstile/rate limit; tidak ada public SELECT/storage bucket. Belum DEPLOYED/LIVE PASS.
> **Checkpoint bukti lokasi/review — 2 November 2026:** error RPC `42P13` diperbaiki dengan drop/recreate transaksional. Lokal PASS untuk GPS akurasi, camera capture/galeri, kategori peta, modal X-only, Super Admin correction proposal, dan regresi Gateway. Foto asli tetap privat; pipeline salinan publik tanpa EXIF/GPS dan approval Admin masih PROPOSED, belum DEPLOYED/LIVE.

> **Operator report 21:09 WIB:** map RPC reported successful. Admin correction of an already `verified` report failed against the old Cloud review RPC and returned schema/API incompatibility. Super Admin correction package is approved but not yet confirmed applied; status remains BLOCKED until postflight.

> **Update 21:11 WIB:** operator reports correction SQL Success. A local client enum mismatch then blocked `verified → unverified` before the RPC call; fixed locally. Review tests 12/12 PASS. Restart Vite/hard refresh and real Admin postflight remain required.

> **Checkpoint foto publik 2 November 2026:** Admin lokal memiliki tombol persetujuan dan pencabutan publikasi per lampiran verified; peta lokal menampilkan foto hanya jika RPC mengembalikan path salinan publik. Build/lint/Edge typecheck PASS. Cloud **belum berubah** untuk paket foto. Sanitizer/copy Edge Function, bucket policy, approval SQL, postflight EXIF/GPS, dan LIVE marker belum PASS.

> **Update pipeline lokal 2 November 2026:** Edge Function `report-publication` telah ditambahkan untuk validasi JWT/RBAC, sanitasi chunk metadata JPEG/PNG/WebP, copy bucket terpisah, dan approval/revoke. Belum deployed; jangan mengaktifkan flag frontend sebelum SQL + function diterapkan.

> **Issue log 22:28 WIB:** operator melaporkan Function `report-publication` deployed, tetapi tombol approval masih menghasilkan pesan generik. Frontend kini membaca kode respons Function; validasi build/lint/typecheck PASS. Evidence LIVE yang masih kurang: approval RPC berhasil, salinan publik tersedia, EXIF/GPS hilang, revoke bekerja, dan anonim tidak dapat membaca bucket privat. Status fitur foto: **BLOCKED RUNTIME / NOT LIVE PASS**.
# Foto kejadian — 3 November 2026

Status implementasi lokal dan kebutuhan operator tercatat di [event-image-status.json](event-image-status.json). Proposal SQL dan `event-media` Edge Function belum diterapkan; acceptance Cloud belum dijalankan. Feature flag tetap off sampai deployment dev disetujui dan postflight berhasil.


### Status foto kejadian — 3 November 2026 (persetujuan diterima)

- Operator menyetujui paket migrasi + Edge Function khusus `rekansiaga-dev` (`uiuiouosblyuqgnvfpeh`). Tidak ada persetujuan untuk staging/Flutter atau area lain.
- Verifikasi lokal terdampak: ESLint file terkait PASS; `npm run build` PASS (peringatan chunk >500 kB yang sudah ada); `npm run typecheck:edge` PASS.
- Deployment belum dijalankan/terkonfirmasi di sesi agent. CLI Supabase tidak dapat diakses dari terminal ini; SQL parser native lokal juga diblokir Windows Application Control. Tidak ada flag frontend yang diaktifkan dan tidak ada klaim Cloud/LIVE PASS.
- Paket tunggal siap dijalankan dari PowerShell operator dengan password hanya pada prompt native: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Rekan Siaga\rekansiaga-web\scripts\deploy-dev-event-media.ps1" -ApprovedEventMedia`. Runner memeriksa target, read-only baseline, SQL guard dan postflight sebelum deploy function. Bila gagal/hasil commit tidak pasti: berhenti, jangan retry.
- Sesudah postflight/function PASS, aktifkan `VITE_EVENT_MEDIA_ENABLED=true` lokal, restart Vite, lalu uji satu event sintetis TEST: upload, baca di pemantauan/detail/peta, replace, revoke. Tanpa gambar kejadian tetap dapat disimpan.
### Runner correction — Supabase pooler authentication (3 November 2026)

Screenshot showed PostgreSQL password authentication failure during the read-only preflight; no SQL or Edge Function was applied. The event-media runner no longer assumes a pooler hostname: it now prompts for the HOST only copied from Dashboard > `rekansiaga-dev` > Connect > Session pooler, while pinning the username to `postgres.uiuiouosblyuqgnvfpeh`, database `postgres`, port 5432 and SSL. Local-only mode and PowerShell parser check PASS. If authentication still fails with the exact host and project database password, stop and verify the database password in Dashboard; do not paste it into chat/arguments/files and do not retry a failed mutation (none occurred in the shown run).
### Operator deployment confirmation — event media (3 November 2026)

Operator terminal confirms read-only baseline passed, guarded event-media SQL postflight PASS, and Edge Function `event-media` deployed on `rekansiaga-dev` (`uiuiouosblyuqgnvfpeh`). Set local `.env.local` `VITE_EVENT_MEDIA_ENABLED=true`; restart Vite before testing. Cloud deployment status is PASS by operator evidence; synthetic upload and public rendering on monitoring/detail/map plus replace/revoke remain NOT RUN. Do not claim feature acceptance until browser results are observed.
> **Public article cover fix 3 November 2026:** code path fixed locally: public pages now use `public-article-cover`, which signs only an existing private-bucket cover whose article is currently published. No bucket/RLS/schema changes. Lint/build/Edge typecheck and deployment-script parse PASS; build retains existing >500 kB chunk warning. Function deployment and browser rendering acceptance are NOT RUN. See `docs/runbooks/public-article-cover.md`.

# Addendum: location-based disaster alerts (3 November 2026)

Status **PASS LOCAL / NEEDS CLOUD APPROVAL / LIVE NOT RUN**. See `location-alerts-status.md` and `docs/runbooks/location-alerts-v1.md`. 8/8 focused local checks PASS; no alert data or Cloud schema changes. Modal/controller are flag-gated; manual district selection, priority/dedupe/expiry and information displays are wired to a proposed minimized RPC. Admin management, monitoring feed, and peta summary are implemented locally. Peta has no alert geometry overlay because no validated geometry exists. Flutter contract is documented; Flutter source/runtime is untouched. Browser test, Cloud acceptance, push, and native mobile test remain NOT RUN.

