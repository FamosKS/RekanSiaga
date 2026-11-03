import { SignOutButton } from '../../features/auth/SignOutButton'
import { ShieldAlert } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { LinkButton } from '../../components/ui/LinkButton'
export function UnauthorizedPage() { return <Card className="error-page"><ShieldAlert size={48} aria-hidden="true"/><span className="eyebrow">403 / AKSES TERBATAS</span><h1>Akses belum terotorisasi</h1><p>Sesi login tidak otomatis memberi akses administrator. Halaman ini memerlukan profil staf aktif dan role yang sesuai. Hubungi administrator jika izin akun perlu diperiksa.</p><div className="action-row"><LinkButton to="/">Kembali ke beranda</LinkButton><SignOutButton/></div></Card> }
