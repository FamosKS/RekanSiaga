import { useState } from 'react'
import { Siren } from 'lucide-react'
import { PageHeader } from '../../components/shared/PageElements'
import { Alert } from '../../components/ui/Alert'
import { Card } from '../../components/ui/Card'
import { EmergencyDirectory } from '../../features/emergency/EmergencyDirectory'
import { ReliefDirectory } from '../../features/emergency/ReliefDirectory'
import { SOSDialog } from '../../features/emergency/SOSDialog'
import { sosRelayEnabled } from '../../features/emergency/sosRelay'
export function EmergencyPage() {
  const [open, setOpen] = useState(false)
  return <><PageHeader title="Pusat darurat" description="Informasi bantuan dan akses ke direktori layanan resmi di wilayah Anda."/><section className="emergency-hero"><span className="emergency-hero__icon"><Siren size={28} aria-hidden="true"/></span><button className="sos-access" onClick={() => setOpen(true)} aria-label="Buka akses bantuan darurat"><strong>SOS</strong><span>{sosRelayEnabled ? 'MINTA TINJAUAN' : 'AKSES INFORMASI'}</span></button><h2>Temukan akses bantuan</h2><p>{sosRelayEnabled ? 'Permintaan hanya dikirim ke sistem RekanSiaga untuk ditinjau staf, bukan petugas resmi.' : 'Relay belum aktif. Tombol membuka informasi layanan resmi saja.'}</p></section><Alert tone="danger">RekanSiaga bukan pusat komando resmi dan tidak menjamin petugas datang. Jika keselamatan terancam, hubungi layanan resmi yang tersedia di wilayah Anda dan ikuti arahan petugas.</Alert><Card><h2>Kontak darurat resmi</h2><EmergencyDirectory/></Card><ReliefDirectory/><SOSDialog open={open} onClose={() => setOpen(false)}/></>
}
