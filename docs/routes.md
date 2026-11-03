# Routes

| URL | Komponen | Akses |
| --- | --- | --- |
| `/` | HomePage | Publik |
| `/informasi` | InformationPage | Publik |
| `/informasi/:slug` | ArticleDetailPage | Publik |
| `/pemantauan` | MonitoringPage | Publik |
| `/pemantauan/:id` | DisasterDetailPage | Publik |
| `/peta` | MapPage | Publik |
| `/laporan` | ReportPage | Publik |
| `/laporan/lacak` | ReportTrackingPage | Publik |
| `/donasi` | DonationPage | Publik |
| `/panduan` | GuidePage | Publik |
| `/panduan/:id` | GuideDetailPage | Publik |
| `/darurat` | EmergencyPage | Publik |
| `/403` | UnauthorizedPage | Publik |
| `*` | NotFoundPage | Publik |
| `/admin/login` | AdminLoginPage | Publik, layout terpisah |
| `/admin` | AdminDashboardPage | Sesi + role admin database terverifikasi |
| `/admin/laporan` | AdminReportsPage | Sesi + role admin database terverifikasi |
| `/admin/laporan/:id` | AdminReportDetailPage | Sesi + role admin database terverifikasi |
| `/admin/kejadian` | AdminDisastersPage | Sesi + role admin database terverifikasi |
| `/admin/artikel` | AdminArticlesPage | Sesi + role admin database terverifikasi |
| `/admin/panduan` | AdminGuidesPage | Sesi + role admin database terverifikasi |
| `/admin/kontak-darurat` | AdminEmergencyContactsPage | Sesi + role admin database terverifikasi |
| `/admin/staf` | AdminStaffPage | Sesi + role admin database terverifikasi |
| `/admin/notifikasi` | AdminNotificationsPage | Sesi + role admin database terverifikasi |
| `/admin/sumber-data` | AdminDataSourcesPage | Sesi + role admin database terverifikasi |
| `/admin/pengaturan` | AdminSettingsPage | Sesi + role admin database terverifikasi |

Parameter detail menerima huruf ASCII, angka, underscore, dan tanda hubung, maksimal 128 karakter. Data detail belum terintegrasi. Unknown admin routes tetap melewati kedua guard.

## Phase 3C — Admin UI

Seluruh URL di atas dipertahankan; tidak ada route preview atau bypass auth produksi. Sidebar menempatkan Manajemen Staf sebelum Notifikasi. Daftar menunggu layanan baca, sehingga tautan detail laporan hanya muncul saat row tersedia. Editor/pratinjau memakai dialog pada route existing. Guard legacy tetap menolak akses sampai role database dapat diverifikasi; role usulan UI bukan otorisasi. QA admin memakai MemoryRouter fixture di scripts yang hanya dilayani server pengujian, terpisah dari router produksi.

## Phase 4A — Otorisasi terkini

URL/layout tetap. Semua admin route memerlukan sesi dan user hasil getUser, profil staf aktif dan role yang cocok. Empat role didukung sebagai array. Izin per route dijabarkan di [authorization-matrix.md](authorization-matrix.md), sumber implementasi src/features/auth/permissions.ts. Unknown admin URL kini ditolak ke /403 untuk sesi staf yang terverifikasi, tanpa sesi ke /admin/login. RoleGuard dan sidebar menggunakan aturan yang sama; rule frontend tidak menggantikan RLS. Database schema/policies dan akun nyata masih memerlukan verifikasi sesuai [authentication.md](authentication.md).
