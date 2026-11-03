import { NavLink, Link } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, TriangleAlert, Newspaper, BookOpen, Phone, Users, Bell, Database, Settings, Siren, ArrowUpRight, MapPinned, ShieldCheck } from 'lucide-react'
import { useStaffAccess } from '../../features/auth/StaffAccessContext'
import { canAccessAdminPath } from '../../features/auth/permissions'
import { adminNavigation } from '../../app/router/navigation'
import { sosAdminEnabled } from '../../features/emergency/sosRelay'
const icons = [LayoutDashboard, ClipboardList, TriangleAlert, Newspaper, Siren, BookOpen, Phone, MapPinned, ShieldCheck, Users, Bell, Database, Settings]
export function AdminSidebar({ onNavigate }: { onNavigate: () => void }) {
  const access = useStaffAccess()
  return <aside id="admin-sidebar" className="admin-sidebar"><Link to="/admin" className="admin-brand" onClick={onNavigate}><Siren aria-hidden="true"/><span>Rekan<span className="accent">Siaga</span><small>RUANG ADMINISTRASI</small></span></Link><p className="eyebrow">MENU UTAMA</p><nav aria-label="Navigasi administrasi">{adminNavigation.map((item, index) => { const Icon = icons[index]; if (!access || !canAccessAdminPath(access.roles, item.to) || (item.to === '/admin/sos' && !sosAdminEnabled)) return null; return <NavLink key={item.to} to={item.to} end={item.to === '/admin'} onClick={onNavigate}><Icon size={18} aria-hidden="true"/>{item.label}</NavLink> })}</nav><div className="admin-sidebar-footer"><Link to="/" onClick={onNavigate}>Buka situs publik <ArrowUpRight size={16} aria-hidden="true"/></Link><p className="muted">Informasi tepercaya.<br/>Kesiapsiagaan bersama.</p></div></aside>
}
