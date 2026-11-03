import { Menu } from 'lucide-react'
import { SignOutButton } from '../../features/auth/SignOutButton'
export function AdminHeader({ onMenu, navigationOpen }: { onMenu: () => void; navigationOpen: boolean }) {
  return <header className="admin-header"><button className="icon-button" aria-label="Buka atau tutup navigasi admin" aria-expanded={navigationOpen} aria-controls="admin-sidebar" onClick={onMenu}><Menu aria-hidden="true"/></button><span>Ruang administrasi</span><SignOutButton/></header>
}
