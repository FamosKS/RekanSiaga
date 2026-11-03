import { Clock3, MapPin, Route, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { safeEvacuationRoute, type PublicAlert } from './disasterAlerts'

function dateTime(value: string | null, empty = 'Belum tersedia') {
  if (!value) return empty
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? empty : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB'
}
const severityLabel = { information: 'Informasi', watch: 'Waspada', warning: 'Siaga', emergency: 'Darurat' } as const

export function DisasterWarningDialog({ open, onClose, warning, others = [], error = false }: { open: boolean; onClose: () => void; warning: PublicAlert | null; others?: PublicAlert[]; error?: boolean }) {
  const route = warning ? safeEvacuationRoute(warning) : null
  return <Dialog open={open} onClose={onClose} title="Peringatan Bencana" description="Informasi aktif yang cocok dengan wilayah pilihan Anda.">
    {error && !warning ? <p role="status">Peringatan belum berhasil dimuat. Coba kembali saat koneksi pulih dan ikuti sumber resmi; kondisi tidak dapat disimpulkan dari kegagalan data.</p> : warning ? <article className="disaster-warning">
      <Badge tone={warning.severity === 'emergency' || warning.severity === 'warning' ? 'danger' : 'warning'}><ShieldAlert size={14} aria-hidden="true"/> {warning.issuer_kind === 'official_source' ? 'SUMBER RESMI TERVERIFIKASI' : 'INFORMASI REKAN SIAGA'}</Badge>
      <h3>{warning.title}</h3><p className="disaster-warning__description">{warning.description}</p>
      <div className="disaster-warning__facts"><p><MapPin aria-hidden="true"/><span><strong>Lokasi:</strong> {warning.region_name}</span></p><p><Clock3 aria-hidden="true"/><span><strong>Waktu peringatan:</strong> {dateTime(warning.starts_at)}</span></p><p><Clock3 aria-hidden="true"/><span><strong>Perkiraan tiba:</strong> {dateTime(warning.estimated_arrival_at, 'Belum ada estimasi waktu resmi')}</span></p><p><ShieldAlert aria-hidden="true"/><span><strong>Kondisi:</strong> {warning.condition_summary || 'Belum ada indikator kondisi resmi yang tersedia'}</span></p></div>
      <section className="disaster-warning__action"><h4>Tindakan keselamatan</h4><p>{warning.action_guidance}</p></section>
      <section className="disaster-warning__route"><h4><Route size={16} aria-hidden="true"/> Rute evakuasi</h4>{route ? <><p>{route}</p><a href={warning.evacuation_source_url!} target="_blank" rel="noreferrer">Sumber verifikasi rute</a></> : <p>Rute evakuasi belum terverifikasi. Ikuti arahan petugas dan informasi resmi setempat.</p>}</section>
      <dl className="disaster-warning__source"><div><dt>Sumber</dt><dd>{warning.issuer_name} · <a href={warning.source_url} target="_blank" rel="noreferrer">Buka sumber</a></dd></div><div><dt>Diperbarui</dt><dd>{dateTime(warning.source_updated_at ?? warning.updated_at)}</dd></div><div><dt>Status</dt><dd>{severityLabel[warning.severity]} · berlaku sampai {dateTime(warning.expires_at)}</dd></div></dl>
      {others.length > 0 && <section aria-label="Peringatan aktif lainnya"><h4>Peringatan aktif lain di wilayah ini</h4><ul>{others.map(item => <li key={item.id}>{item.title} — {severityLabel[item.severity]}</li>)}</ul></section>}
      <p className="muted">Informasi ini mengikuti status dan sumber yang tercatat. Jika ada bahaya langsung, hubungi layanan resmi dan ikuti arahan petugas.</p>
      <div className="action-row"><Link className="rs-button rs-button--secondary" to={`/pemantauan/${encodeURIComponent(warning.event_id)}`} onClick={onClose}>Lihat detail kejadian</Link><Button onClick={onClose}>Tutup</Button></div>
    </article> : <p>Tidak ada peringatan aktif untuk wilayah yang dipilih.</p>}
  </Dialog>
}
