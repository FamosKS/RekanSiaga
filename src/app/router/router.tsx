import { createBrowserRouter } from 'react-router-dom'
import { PublicLayout } from '../../components/layout/PublicLayout'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { ProtectedRoute } from '../../features/auth/ProtectedRoute'
import { RoleGuard } from '../../features/auth/RoleGuard'
import { ErrorState, LoadingState } from '../../components/shared/PageElements'
export const router = createBrowserRouter([
  { element: <PublicLayout/>, HydrateFallback: LoadingState, errorElement: <ErrorState message="Halaman tidak dapat dimuat. Silakan muat ulang aplikasi."/>, children: [
    { path: '/', lazy: async () => ({ Component: (await import('../../pages/public/HomePage')).HomePage }) },
    { path: '/informasi', lazy: async () => ({ Component: (await import('../../pages/public/InformationPage')).InformationPage }) },
    { path: '/informasi/:slug', lazy: async () => ({ Component: (await import('../../pages/public/ArticleDetailPage')).ArticleDetailPage }) },
    { path: '/pemantauan', lazy: async () => ({ Component: (await import('../../pages/public/MonitoringPage')).MonitoringPage }) },
    { path: '/pemantauan/:id', lazy: async () => ({ Component: (await import('../../pages/public/DisasterDetailPage')).DisasterDetailPage }) },
    { path: '/peta', lazy: async () => ({ Component: (await import('../../pages/public/MapPage')).MapPage }) },
    { path: '/laporan', lazy: async () => ({ Component: (await import('../../pages/public/ReportPage')).ReportPage }) },
    { path: '/laporan/lacak', lazy: async () => ({ Component: (await import('../../pages/public/ReportTrackingPage')).ReportTrackingPage }) },
    { path: '/donasi', lazy: async () => ({ Component: (await import('../../pages/public/DonationPage')).DonationPage }) },
    { path: '/panduan', lazy: async () => ({ Component: (await import('../../pages/public/GuidePage')).GuidePage }) },
    { path: '/panduan/:id', lazy: async () => ({ Component: (await import('../../pages/public/GuideDetailPage')).GuideDetailPage }) },
    { path: '/darurat', lazy: async () => ({ Component: (await import('../../pages/public/EmergencyPage')).EmergencyPage }) },
    { path: '/403', lazy: async () => ({ Component: (await import('../../pages/public/UnauthorizedPage')).UnauthorizedPage }) },
    { path: '*', lazy: async () => ({ Component: (await import('../../pages/public/NotFoundPage')).NotFoundPage }) },
  ] },
  { path: '/admin/login', errorElement: <ErrorState message="Halaman login tidak dapat dimuat. Silakan muat ulang aplikasi."/>, HydrateFallback: LoadingState, lazy: async () => ({ Component: (await import('../../pages/admin/AdminLoginPage')).AdminLoginPage }) },
  { path: '/admin', HydrateFallback: LoadingState, element: <ProtectedRoute/>, errorElement: <ErrorState message="Halaman administrasi tidak dapat dimuat."/>, children: [
    { element: <RoleGuard/>, children: [{ element: <AdminLayout/>, children: [
      { index: true, lazy: async () => ({ Component: (await import('../../pages/admin/AdminDashboardPage')).AdminDashboardPage }) },
      { path: 'laporan', lazy: async () => ({ Component: (await import('../../pages/admin/AdminReportsPage')).AdminReportsPage }) },
      { path: 'sos', lazy: async () => ({ Component: (await import('../../pages/admin/AdminSosPage')).AdminSosPage }) },
      { path: 'laporan/:id', lazy: async () => ({ Component: (await import('../../pages/admin/AdminReportDetailPage')).AdminReportDetailPage }) },
      { path: 'kejadian', lazy: async () => ({ Component: (await import('../../pages/admin/AdminDisastersPage')).AdminDisastersPage }) },
      { path: 'artikel', lazy: async () => ({ Component: (await import('../../pages/admin/AdminArticlesPage')).AdminArticlesPage }) },
      { path: 'panduan', lazy: async () => ({ Component: (await import('../../pages/admin/AdminGuidesPage')).AdminGuidesPage }) },
      { path: 'kontak-darurat', lazy: async () => ({ Component: (await import('../../pages/admin/AdminEmergencyContactsPage')).AdminEmergencyContactsPage }) },
      { path: 'lokasi-bantuan', lazy: async () => ({ Component: (await import('../../pages/admin/AdminReliefPage')).AdminReliefPage }) },
      { path: 'audit', lazy: async () => ({ Component: (await import('../../pages/admin/AdminAuditPage')).AdminAuditPage }) },
      { path: 'staf', lazy: async () => ({ Component: (await import('../../pages/admin/AdminStaffPage')).AdminStaffPage }) },
      { path: 'notifikasi', lazy: async () => ({ Component: (await import('../../pages/admin/AdminNotificationsPage')).AdminNotificationsPage }) },
      { path: 'sumber-data', lazy: async () => ({ Component: (await import('../../pages/admin/AdminDataSourcesPage')).AdminDataSourcesPage }) },
      { path: 'pengaturan', lazy: async () => ({ Component: (await import('../../pages/admin/AdminSettingsPage')).AdminSettingsPage }) },
      { path: '*', lazy: async () => ({ Component: (await import('../../pages/public/NotFoundPage')).NotFoundPage }) },
    ] }] },
  ] },
])
