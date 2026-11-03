import type { StaffRole } from '../../types/auth'
const allStaff: readonly StaffRole[] = ['super_admin', 'information_manager', 'report_verifier', 'mitigation_editor']
export const adminRoutePermissions: Readonly<Record<string, readonly StaffRole[]>> = {
  '/admin': allStaff,
  '/admin/laporan': ['super_admin', 'report_verifier'],
  '/admin/sos': ['super_admin', 'report_verifier'],
  '/admin/kejadian': ['super_admin', 'information_manager'],
  '/admin/artikel': ['super_admin', 'information_manager'],
  '/admin/panduan': ['super_admin', 'mitigation_editor'],
  '/admin/kontak-darurat': ['super_admin', 'information_manager'],
  '/admin/lokasi-bantuan': ['super_admin', 'information_manager'],
  '/admin/audit': ['super_admin'],
  '/admin/staf': ['super_admin'],
  '/admin/notifikasi': ['super_admin', 'information_manager'],
  '/admin/sumber-data': ['super_admin'],
  '/admin/pengaturan': ['super_admin'],
}
export function canAccessAdminPath(roles: readonly StaffRole[], pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '') || '/'
  const key = /^\/admin\/laporan\/[^/]+$/.test(path) ? '/admin/laporan' : path
  const allowed = adminRoutePermissions[key]
  return !!allowed && roles.some(role => allowed.includes(role))
}
