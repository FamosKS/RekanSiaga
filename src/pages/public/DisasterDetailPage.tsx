import { useParams } from 'react-router-dom'
import { MapPinned } from 'lucide-react'
import { contentFeedback, useDisaster } from '../../features/content/usePublicContent'
import { isUuidIdentifier } from '../../lib/routeParams'
import { formatDate } from '../../lib/publicFormatting'
import { UnavailableDetail } from '../../components/shared/UnavailableDetail'
import { Breadcrumb } from '../../components/shared/Breadcrumb'
import { SourceAttribution } from '../../components/shared/SourceAttribution'
import { ContentSection } from '../../components/shared/ContentSection'
import { Card } from '../../components/ui/Card'
import { Alert } from '../../components/ui/Alert'
import { LinkButton } from '../../components/ui/LinkButton'
import { originLabels } from '../../features/disasters/originLabels'
export function DisasterDetailPage() {
  const { id } = useParams()
  const query = useDisaster(id ?? '')
  if (!isUuidIdentifier(id)) return <UnavailableDetail title="Detail kejadian" backTo="/pemantauan" backLabel="Pemantauan" fields={[]}/>
  const event = query.data
  const entries = [['Jenis bencana', event?.category], ['Lokasi', event?.location], ['Wilayah', event?.region], ['Waktu kejadian', event ? formatDate(event.occurredAt) : undefined], ['Status verifikasi', event?.verificationLabel], ['Status kejadian', event?.statusLabel], ['Asal informasi', event ? originLabels[event.origin] : undefined]]
  return <><Breadcrumb items={[{ label: 'Pemantauan', to: '/pemantauan' }, { label: 'Detail kejadian' }]}/><header className="page-heading"><span className="eyebrow">INFORMASI KEJADIAN</span><h1>{event?.title ?? 'Detail kejadian bencana'}</h1><SourceAttribution source={event?.source} date={event?.updatedAt}/></header><div className="detail-columns"><Card>{event?.imageUrl&&<img className="article-cover" src={event.imageUrl} alt={`Foto kejadian: ${event.title}`} referrerPolicy="no-referrer"/>}<h2>Informasi kejadian</h2><dl className="metadata">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Belum tersedia'}</dd></div>)}</dl><ContentSection {...contentFeedback(query)} hasData={!!event} empty="Detail kejadian belum tersedia"><p>{event?.description}</p></ContentSection><Alert tone="warning">Verifikasi staf berbeda dengan konfirmasi resmi pemerintah. Laporan masyarakat yang belum diverifikasi bukan informasi resmi.</Alert></Card><Card><MapPinned size={32} className="accent" aria-hidden="true"/><h2>Lokasi kejadian</h2><div className="small-map-placeholder">Lokasi publik tersedia pada halaman peta jika koordinatnya sudah diisi.</div><LinkButton to="/peta" variant="secondary">Buka halaman peta</LinkButton></Card></div><Card><h2>Riwayat informasi</h2><ContentSection {...contentFeedback(query)} hasData={!!event?.updates.length} empty="Riwayat pembaruan belum tersedia"><ol className="timeline">{event?.updates.map((update, index) => <li key={index}><time dateTime={update.date}>{formatDate(update.date)}</time><p>{update.text}</p></li>)}</ol></ContentSection></Card><LinkButton to="/pemantauan" variant="secondary">Kembali ke pemantauan</LinkButton></>
}
