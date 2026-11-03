import { Link } from 'react-router-dom'
import { Brand } from './Brand'
export function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div><Brand/><p>Bersama membangun masyarakat yang tangguh bencana.</p><small>Development / Periksa sumber dan waktu pembaruan data</small></div>
        <nav aria-label="Navigasi footer"><Link to="/panduan">Panduan Siaga</Link><Link to="/laporan/lacak">Lacak laporan</Link></nav>
      </div>
    </footer>
  )
}
