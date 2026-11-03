import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'
import { AdminHeader } from './AdminHeader'
export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const shell = useRef<HTMLDivElement>(null)
  const location = useLocation()
  useEffect(() => { if (location.pathname) shell.current?.querySelector<HTMLElement>('#admin-main')?.focus() }, [location.pathname])
  function closeMenu() { setOpen(false); shell.current?.querySelector<HTMLButtonElement>('[aria-controls="admin-sidebar"]')?.focus() }
  return <div ref={shell} className={open ? 'admin-shell nav-open' : 'admin-shell'} onKeyDown={event => { if (event.key === 'Escape' && open) closeMenu() }}><a className="skip-link" href="#admin-main">Lewati ke konten</a><AdminSidebar onNavigate={() => setOpen(false)}/><div className="admin-body"><AdminHeader navigationOpen={open} onMenu={() => setOpen(!open)}/>{open && <button className="admin-menu-dismiss" onClick={closeMenu}>Tutup menu navigasi</button>}<main id="admin-main" tabIndex={-1} className="main-content"><Outlet/></main></div></div>
}
