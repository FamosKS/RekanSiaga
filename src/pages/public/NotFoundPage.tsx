import { MapPinned } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { LinkButton } from '../../components/ui/LinkButton'
export function NotFoundPage() { return <Card className="error-page"><MapPinned size={48} aria-hidden="true"/><span className="eyebrow">404 / HALAMAN TIDAK DITEMUKAN</span><h1>Sepertinya Anda tersesat</h1><p>Alamat ini tidak tersedia. Kembali ke beranda atau cari informasi kesiapsiagaan.</p><div className="action-row"><LinkButton to="/">Kembali ke beranda</LinkButton><LinkButton to="/informasi" variant="secondary">Buka informasi</LinkButton></div></Card> }
