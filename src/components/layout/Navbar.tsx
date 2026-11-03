import { NavLink } from 'react-router-dom'
import { publicNavigation } from '../../app/router/navigation'
export function Navbar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  return (
    <nav id="public-nav" aria-label="Navigasi utama" className={open ? 'public-nav is-open' : 'public-nav'}>
      {publicNavigation.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={onNavigate}>{item.label}</NavLink>)}
    </nav>
  )
}
