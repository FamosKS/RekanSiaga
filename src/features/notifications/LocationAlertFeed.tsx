import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BellRing, Clock3, MapPin } from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { alertRegionChangedEvent, alertRegionStorageKey } from './AlertRegionPreference'
import { locationAlertsEnabled, listActiveAlerts, prioritizeAlerts } from './disasterAlerts'
import { openAlertCenterEvent } from './LocationAlertCenter'
import { contentError } from '../content/contracts'

function storedRegion() { try { return localStorage.getItem(alertRegionStorageKey) ?? '' } catch { return '' } }
export function LocationAlertFeed() {
  const [regionId, setRegionId] = useState(storedRegion)
  useEffect(() => {
    const sync = () => setRegionId(storedRegion())
    window.addEventListener(alertRegionChangedEvent, sync); window.addEventListener('storage', sync)
    return () => { window.removeEventListener(alertRegionChangedEvent, sync); window.removeEventListener('storage', sync) }
  }, [])
  const query = useQuery({ queryKey: ['public-content', 'location-alerts', regionId], queryFn: ({ signal }) => listActiveAlerts(regionId, signal), enabled: locationAlertsEnabled && !!regionId, staleTime: 10_000, refetchOnWindowFocus: true, refetchOnReconnect: 'always' })
  if (!locationAlertsEnabled) return <Alert tone="neutral" icon={<BellRing size={20}/>} heading="Peringatan wilayah">Feed peringatan aktif menunggu kontrak backend Cloud. Daftar kosong bukan tanda aman.</Alert>
  if (!regionId) return <Alert tone="neutral" icon={<MapPin size={20}/>} heading="Pilih wilayah pemantauan">Pilih kecamatan pada Beranda untuk melihat peringatan yang ditargetkan ke wilayah tersebut.</Alert>
  if (query.isError) return <Alert tone="warning" icon={<BellRing size={20}/>} heading="Peringatan belum dapat diperbarui">{contentError(query.error)} Data tidak tersedia bukan berarti keadaan aman.</Alert>
  const alerts = prioritizeAlerts(query.data ?? [])
  return <section className="location-alert-feed" aria-label="Peringatan bencana aktif">
    <div className="section-heading"><div><h2>Peringatan wilayah</h2><p className="muted">Sumber Supabase yang sama dengan pusat peringatan. Tanpa geometri tervalidasi, peringatan tidak digambar sebagai area atau marker.</p></div><Button variant="secondary" size="sm" onClick={() => window.dispatchEvent(new Event(openAlertCenterEvent))}>Buka pusat peringatan</Button></div>
    {!alerts.length ? <Alert tone="neutral">Tidak ada peringatan aktif yang cocok saat ini. Ini bukan pernyataan bahwa wilayah aman.</Alert> : <ul>{alerts.map(alert => <li key={alert.id}><strong>{alert.title}</strong><span><MapPin size={15} aria-hidden="true"/>{alert.region_name} · {alert.disaster_type}</span><span><Clock3 size={15} aria-hidden="true"/>Berlaku sampai {new Date(alert.expires_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'})} WIB</span></li>)}</ul>}
  </section>
}
