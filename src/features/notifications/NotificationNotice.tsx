import { Bell, BellRing } from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { AlertRegionPreference } from './AlertRegionPreference'
import { locationAlertsEnabled } from './disasterAlerts'
import { openAlertCenterEvent } from './LocationAlertCenter'

export function NotificationNotice() {
  return <section className="location-alert-preferences" aria-label="Pengaturan peringatan wilayah">
    <Alert tone="primary" icon={<Bell size={20}/>} heading="Peringatan bencana berbasis wilayah">
      <p>{locationAlertsEnabled ? 'Peringatan aktif hanya ditampilkan jika cocok dengan wilayah pilihan dan masih berlaku.' : 'Pusat peringatan menunggu kontrak data peringatan terverifikasi di Supabase. Aplikasi tidak membuat prediksi atau peringatan sendiri.'} Ikuti kanal resmi dan arahan petugas setempat.</p>
      {locationAlertsEnabled && <Button variant="secondary" size="sm" onClick={() => window.dispatchEvent(new Event(openAlertCenterEvent))}><BellRing size={16} aria-hidden="true"/>Buka pusat peringatan</Button>}
    </Alert>
    <AlertRegionPreference/>
  </section>
}
