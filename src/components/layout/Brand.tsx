import { Link } from 'react-router-dom'
import { usePublicConfig } from '../../features/content/usePublicConfig'
import { Siren } from 'lucide-react'
export function Brand({ onNavigate }: { onNavigate?: () => void }) {
  const config = usePublicConfig()
  const name = config.data?.site_name ?? 'RekanSiaga'
  return (
    <Link className="brand" to="/" onClick={onNavigate} aria-label={`${name} - Beranda`}>
      <span className="brand__symbol"><Siren size={24} aria-hidden="true"/></span>
      <span><small>Sistem Siaga</small><span className="brand__name" title={name} style={{ display: 'block', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span></span>
    </Link>
  )
}
