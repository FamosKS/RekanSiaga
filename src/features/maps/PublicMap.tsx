import { eventStatusLabels } from '../content/contentService'
import { Link } from 'react-router-dom'
import { Pagination } from '../../components/shared/Pagination'
import { getPublicEventPage } from '../content/eventFeed'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LocateFixed, MapPinned, Waves, Flame, Mountain, Wind, Building2, TriangleAlert } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Dialog } from '../../components/ui/Dialog'
import { ContentSection } from '../../components/shared/ContentSection'
import { listPublicRelief, type PublicMapLocation } from './mapService'
import { parsePoint, type Point } from '../../lib/geography'
import { LocationAlertFeed } from '../notifications/LocationAlertFeed'

const categoryIcons = { Banjir: Waves, 'Gempa bumi': Mountain, Kebakaran: Flame, 'Gunung api': Mountain, 'Tanah longsor': Wind, 'Lokasi bantuan': Building2, Lainnya: TriangleAlert } as const
const categoryColors = { Banjir: '#0f766e', 'Gempa bumi': '#7c3aed', Kebakaran: '#dc2626', 'Gunung api': '#b45309', 'Tanah longsor': '#92400e', 'Lokasi bantuan': '#2563eb', Lainnya: '#475569' } as const
function categoryKey(kind: string) {
  const normalized = kind.toLocaleLowerCase('id')
  if (normalized.includes('banjir')) return 'Banjir'
  if (normalized.includes('gempa')) return 'Gempa bumi'
  if (normalized.includes('kebakaran')) return 'Kebakaran'
  if (normalized.includes('gunung') || normalized.includes('api') || normalized.includes('erupsi')) return 'Gunung api'
  if (normalized.includes('longsor')) return 'Tanah longsor'
  if (normalized.includes('bantuan') || normalized.includes('posko')) return 'Lokasi bantuan'
  return 'Lainnya'
}
function markerIcon(kind: string, selected: boolean) {
  const key = categoryKey(kind) as keyof typeof categoryIcons
  const Icon = categoryIcons[key]
  return L.divIcon({ className: 'rs-map-marker-wrap', html: `<span class="rs-map-marker${selected ? ' is-selected' : ''}" style="--marker-color:${categoryColors[key]}"><span class="rs-map-marker__icon" aria-hidden="true">${Icon === Waves ? '≋' : Icon === Flame ? '♨' : Icon === Mountain ? '⌂' : Icon === Wind ? '✦' : Icon === TriangleAlert ? '!' : '＋'}</span></span>`, iconSize: [42, 42], iconAnchor: [21, 38], popupAnchor: [0, -38] })
}

function MapCanvas({ points, selectedId, onSelect, devicePoint, onDevicePoint }: { points: PublicMapLocation[]; selectedId: string; onSelect: (id: string) => void; devicePoint: Point | null; onDevicePoint: (point: Point) => void }) {
  const element = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | undefined>(undefined)
  const markers = useRef<L.LayerGroup | undefined>(undefined)
  useEffect(() => {
    if (!element.current || map.current) return
    map.current = L.map(element.current, { center: [-2.5, 118], zoom: 5, scrollWheelZoom: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 18 }).addTo(map.current)
    markers.current = L.layerGroup().addTo(map.current)
    return () => { map.current?.remove(); map.current = undefined }
  }, [])
  useEffect(() => {
    if (!map.current || !markers.current) return
    markers.current.clearLayers()
    points.forEach(point => {
      const marker = L.marker([point.latitude, point.longitude], { icon: markerIcon(point.kind, point.id === selectedId), title: `${point.kind}: ${point.title}` })
      const tooltip = document.createElement('span'); tooltip.textContent = point.kind
      marker.on('click', () => onSelect(point.id)).bindTooltip(tooltip, { direction: 'top', offset: [0, -28] }).addTo(markers.current!)
    })
    if (devicePoint) L.circleMarker([devicePoint.latitude, devicePoint.longitude], { radius: 8, color: '#b45309', fillColor: '#f59e0b', fillOpacity: .85, weight: 3 }).bindTooltip('Lokasi perangkat Anda', { direction: 'top' }).addTo(markers.current)
  }, [devicePoint, onSelect, points, selectedId])
  function locate() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(position => {
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      onDevicePoint(point); map.current?.setView([point.latitude, point.longitude], 13)
    })
  }
  return <div className="rs-map-shell"><div ref={element} className="rs-leaflet-map" role="application" aria-label="Peta publik RekanSiaga"/><Button className="rs-map-locate" variant="secondary" onClick={locate}><LocateFixed size={16} aria-hidden="true"/>Gunakan lokasi saya</Button></div>
}

export function PublicMap() {
  const [eventPage, setEventPage] = useState(1)
  const locations = useQuery({ queryKey: ['public-content','event-feed-map',eventPage], queryFn: ({signal})=>getPublicEventPage(undefined,eventPage,100,signal) })
  if(locations.data&&eventPage>Math.max(1,Math.ceil(locations.data.total/100)))setEventPage(Math.max(1,Math.ceil(locations.data.total/100)))
  const relief = useQuery({ queryKey: ['public-content', 'relief'], queryFn: ({ signal }) => listPublicRelief(signal) })
  const [selectedId, setSelectedId] = useState(''), [search, setSearch] = useState(''), [devicePoint, setDevicePoint] = useState<Point | null>(null)
  const points = useMemo<PublicMapLocation[]>(() => [...(locations.data?.points ?? []), ...(relief.data ?? []).flatMap(row => { const point = parsePoint(row.coordinates); return point ? [{ ...point, id: row.id, title: row.name, label: row.address ?? row.location_type, kind: 'Lokasi bantuan' }] : [] })], [locations.data, relief.data])
  const visible = points.filter(row => `${row.title} ${row.label} ${row.kind}`.toLocaleLowerCase('id').includes(search.toLocaleLowerCase('id')))
  const selected = points.find(row => row.id === selectedId)
  const listState = locations.isLoading ? 'loading' : locations.isError ? 'error' : 'ready'
  const selectedUpdatedAt = selected && 'updatedAt' in selected && typeof selected.updatedAt === 'string' ? selected.updatedAt : null
  return <><LocationAlertFeed/><div className="map-layout"><Card className="map-stage"><div className="map-stage__label"><span><MapPinned size={16} aria-hidden="true"/>Data publik terverifikasi</span><span>Memperbarui otomatis</span></div><MapCanvas points={visible} selectedId={selectedId} onSelect={setSelectedId} devicePoint={devicePoint} onDevicePoint={setDevicePoint}/><div className="map-legend"><h3>Legenda peta</h3><div className="chip-row">{Object.entries(categoryIcons).map(([label, Icon]) => <span key={label}><Icon size={16} aria-hidden="true"/>{label}</span>)}</div><small>Marker hanya dari lokasi kejadian yang diterbitkan. Laporan pendukung tidak digandakan sebagai marker. Kejadian tanpa koordinat tetap tersedia di pemantauan.</small><Pagination page={eventPage} totalPages={Math.ceil((locations.data?.total ?? 0)/100)} onChange={setEventPage}/></div></Card><aside className="map-side"><Card><h2>Cari kejadian atau lokasi</h2><p className="muted">Pencarian mencakup halaman kejadian yang ditampilkan; gunakan pagination untuk halaman lainnya.</p>{relief.isError&&<p role="alert">Lapisan lokasi bantuan belum dapat dimuat. Data kejadian diproses terpisah.</p>}<Input label="Cari di peta" value={search} onChange={event => setSearch(event.target.value)} /><ContentSection state={listState} error="Data peta belum dapat dimuat." hasData={visible.length > 0} empty="Belum ada lokasi publik dengan koordinat valid"><ul className="map-result-list">{visible.map(point => <li key={point.id}><Button variant={point.id === selectedId ? 'primary' : 'secondary'} onClick={() => setSelectedId(point.id)}><span>{point.kind}</span><strong>{point.title}</strong><small>{point.label}</small></Button></li>)}</ul></ContentSection></Card><Card><h2>Ringkasan lokasi</h2>{selected ? <Button variant="primary" onClick={() => setSelectedId(selected.id)}>Buka ringkasan {selected.title}</Button> : <p className="muted">Klik marker atau pilih lokasi untuk melihat ringkasan publik.</p>}<p className="muted">Lokasi perangkat hanya digunakan setelah Anda menekan tombol, dan tidak dikirim ke server.</p></Card></aside></div><Dialog open={!!selected} onClose={() => setSelectedId('')} title={selected?.title ?? 'Ringkasan lokasi'} description="Informasi publik yang aman untuk dibagikan">{selected && <div className="map-summary"><p className="map-summary__kind">{selected.kind}</p>{selected.imageUrl&&<img className="article-cover" src={selected.imageUrl} alt={`Foto kejadian: ${selected.title}`} referrerPolicy="no-referrer"/>}{selected.eventId && <Link to={`/pemantauan/${selected.eventId}`}>Detail kejadian</Link>}<dl>{selected.eventStatus&&<div><dt>Status kejadian</dt><dd>{eventStatusLabels[selected.eventStatus as keyof typeof eventStatusLabels]??selected.eventStatus}</dd></div>}{selected.verificationStatus&&<div><dt>Verifikasi informasi</dt><dd>{selected.verificationStatus==='source_confirmed'?'Dikonfirmasi sumber':'Diverifikasi staf'}</dd></div>}<div><dt>Lokasi publik kejadian</dt><dd>{selected.label}</dd></div><div><dt>Koordinat</dt><dd>{selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}</dd></div><div><dt>Waktu pembaruan</dt><dd>{selectedUpdatedAt ? new Date(selectedUpdatedAt).toLocaleString('id-ID') : 'Data publik terverifikasi'}</dd></div></dl><p className="muted">Identitas, token pelacakan, reviewer, dan catatan internal Admin tidak ditampilkan pada peta publik.</p></div>}  </Dialog></>
}
