import { useState } from 'react'
import { MapPinned, Flame, Mountain, Waves } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '../../components/shared/PageElements'
import { MapFilterPanel } from './MapFilterPanel'
type MapState = { status: 'unavailable' } | { status: 'loading' } | { status: 'error'; message: string }
export function MapScaffold({ state = { status: 'unavailable' } }: { state?: MapState }) {
  const [kind, setKind] = useState('')
  const [region, setRegion] = useState('')
  if (state.status === 'loading') return <LoadingState label="Memuat peta..."/>
  if (state.status === 'error') return <ErrorState message={state.message}/>
  return <div className="map-layout"><Card className="map-stage"><div className="map-stage__label"><Badge>Pratinjau antarmuka</Badge><span>Data geografis belum terhubung</span></div><div className="map-empty"><MapPinned size={56} strokeWidth={1.2} aria-hidden="true"/><h2>Peta RekanSiaga</h2><p>Peta interaktif belum tersedia.<br/>Tidak ada marker kejadian aktual.</p><small role="status">Filter: {kind || 'semua jenis'} / {region || 'semua wilayah'}</small></div><div className="map-legend"><h3>Legenda jenis kejadian</h3><div className="chip-row"><span><Waves size={16} aria-hidden="true"/>Banjir</span><span><Mountain size={16} aria-hidden="true"/>Gunung api</span><span><Flame size={16} aria-hidden="true"/>Kebakaran</span></div><small>Contoh simbol kategori, bukan posisi kejadian.</small></div></Card><aside className="map-side"><Card><h2>Filter & lapisan</h2><MapFilterPanel kind={kind} region={region} onKind={setKind} onRegion={setRegion}/></Card><Card><h2>Informasi kejadian</h2><EmptyState title="Belum ada kejadian terpilih" description="Panel detail akan tersedia setelah peta dan sumber kejadian terintegrasi."/></Card></aside></div>
}
