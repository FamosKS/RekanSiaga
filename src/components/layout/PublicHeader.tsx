import { useRef, useState } from 'react'
import { Accessibility, Menu, Siren, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { LinkButton } from '../ui/LinkButton'
import { Brand } from './Brand'
import { Navbar } from './Navbar'
export function PublicHeader({ onAccessibility }: { onAccessibility: () => void }) {
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const closeNavigation = () => setOpen(false)
  return (
    <header className="site-header" onKeyDown={event => {
      if (event.key === 'Escape' && open) { setOpen(false); menuButton.current?.focus() }
    }}>
      <div className="header-inner">
        <Brand onNavigate={closeNavigation}/>
        <Button ref={menuButton} variant="ghost" size="icon" className="mobile-toggle" aria-label={open ? 'Tutup navigasi' : 'Buka navigasi'} aria-expanded={open} aria-controls="public-nav" onClick={() => setOpen(!open)}>{open ? <X aria-hidden="true"/> : <Menu aria-hidden="true"/>}</Button>
        <Navbar open={open} onNavigate={closeNavigation}/>
        <div className="header-actions">
          <Button variant="secondary" size="icon" className="accessibility-trigger" onClick={onAccessibility} aria-label="Pengaturan aksesibilitas"><Accessibility size={22} aria-hidden="true"/></Button>
          <LinkButton variant="danger" to="/darurat" onClick={closeNavigation}><Siren size={16} aria-hidden="true"/>Pusat Darurat</LinkButton>
        </div>
      </div>
    </header>
  )
}
