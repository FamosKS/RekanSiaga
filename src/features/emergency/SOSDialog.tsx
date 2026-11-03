import { useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { useDeviceLocation } from '../../hooks/useDeviceLocation'
import { EmergencyDirectory } from './EmergencyDirectory'
import { randomSecret, revokeSos, sosRelayEnabled, submitSos, trackSos, type SosPublicStatus, type SosRelayReceipt } from './sosRelay'

type LocationValue = { latitude: number; longitude: number; accuracy: number; capturedAt: string }
type BatteryValue = { level: number | null; charging: boolean | null }
type NavigatorWithBattery = Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> }
type NavigatorWithConnection = Navigator & { connection?: { type?: string; effectiveType?: string } }

export function SOSDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useDeviceLocation()
  const [point, setPoint] = useState<LocationValue | null>(null)
  const [description, setDescription] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [battery, setBattery] = useState<BatteryValue>({ level: null, charging: null })
  const [receipt, setReceipt] = useState<SosRelayReceipt | null>(null)
  const [credential, setCredential] = useState('')
  const [tracked, setTracked] = useState<SosPublicStatus | null>(null)
  const [trackingCode, setTrackingCode] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [consented, setConsented] = useState(false)
  async function captureLocation() {
    location.request((coordinates, accuracy) => {
      const [latitude, longitude] = coordinates.split(',').map(Number)
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) setPoint({ latitude, longitude, accuracy: accuracy ?? 0, capturedAt: new Date().toISOString() })
    })
  }
  async function captureBattery() {
    try {
      const batteryApi = (navigator as NavigatorWithBattery).getBattery
      if (!batteryApi) { setBattery({ level: null, charging: null }); return }
      const value = await batteryApi.call(navigator)
      setBattery({ level: Math.round(value.level * 100), charging: value.charging })
    } catch { setBattery({ level: null, charging: null }) }
  }
  async function send() {
    if (description.trim().length < 10) { setMessage('Jelaskan kebutuhan bantuan minimal 10 karakter, atau tulis “SOS, saya membutuhkan bantuan”.'); return }
    if (!window.confirm('Kirim data SOS yang ditampilkan kepada backend RekanSiaga untuk ditinjau staf? Ini tidak menghubungi BPBD/SAR atau layanan resmi.')) return
    setBusy(true); setMessage('Mengirim permintaan SOS...')
    try {
      const access = randomSecret()
      const connection = (navigator as NavigatorWithConnection).connection
      const data = await submitSos({ idempotency_key: randomSecret(), access_credential: access, consent: true, report: { description: description.trim(), latitude: point?.latitude ?? null, longitude: point?.longitude ?? null, accuracy_m: point?.accuracy ?? null, location_captured_at: point?.capturedAt ?? null, battery_percent: battery.level, charging: battery.charging, online: navigator.onLine, network_type: connection?.effectiveType ?? connection?.type ?? null, contact_name: contactName.trim() || null, contact_phone: contactPhone.trim() || null, consent_version: 'sos-consent-v1' } })
      setReceipt(data); setCredential(access); setMessage('Server menerima permintaan. Ini hanya penerimaan sistem, bukan konfirmasi bantuan sedang menuju lokasi.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Status pengiriman belum dapat dipastikan. Jangan kirim ulang; hubungi layanan resmi.') }
    finally { setBusy(false) }
  }
  async function checkStatus() {
    if (trackingCode.trim().length < 32) { setMessage('Masukkan kode pelacakan rahasia yang diterima saat pengiriman.'); return }
    setBusy(true); setMessage('Memeriksa status...')
    try { setTracked(await trackSos(trackingCode.trim())); setMessage('Status diperbarui dari server.') }
    catch { setTracked(null); setMessage('Status tidak tersedia atau kode tidak valid. Bila darurat, hubungi layanan resmi.') }
    finally { setBusy(false) }
  }
  async function revokeCredential() {
    if (!credential || !window.confirm('Cabut kode pelacakan ini? Setelah dicabut, kode tidak bisa digunakan lagi untuk melihat status.')) return
    setBusy(true); setMessage('Mencabut kode...')
    try { await revokeSos(credential); setCredential(''); setTrackingCode(''); setTracked(null); setMessage('Kode pelacakan telah dicabut. Permintaan tetap tersimpan untuk staf sesuai masa retensi.') }
    catch { setMessage('Status pencabutan belum dapat dipastikan. Jangan ulangi otomatis; hubungi layanan resmi bila darurat.') }
    finally { setBusy(false) }
  }
  return <Dialog open={open} onClose={onClose} title="Akses bantuan darurat" description="Peringatan penting: relay ini mengirim permintaan ke staf RekanSiaga, bukan layanan tanggap darurat resmi.">
    {!sosRelayEnabled && <><Alert tone="danger">Relay SOS belum diaktifkan atau backend belum siap. Tidak ada permintaan yang dikirim. Hubungi layanan resmi dari direktori di bawah.</Alert><EmergencyDirectory/><details><summary>Lihat koordinat perangkat saya</summary><p className="muted">Opsional. Izin browser diminta hanya setelah tombol ditekan; data tidak dikirim pada mode ini.</p><Button variant="secondary" loading={location.busy} onClick={captureLocation}>Izinkan akses lokasi</Button><p role="status">{location.message}</p>{point && <output className="coordinate-output">{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)} (akurasi ±{Math.round(point.accuracy)} m)</output>}</details></>}
    {sosRelayEnabled && <>
      <Alert tone="warning">RekanSiaga bukan pusat komando resmi. Pengiriman tidak menghubungi BPBD, SAR, polisi, ambulans, atau kontak eksternal; staf RekanSiaga mungkin tidak memantau terus-menerus. Jika keselamatan terancam, hubungi layanan resmi sekarang.</Alert>
      {!receipt ? <>
        <Textarea label="Kebutuhan bantuan" hint="Hindari memasukkan informasi orang lain yang tidak perlu." maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} />
        <Input label="Nama kontak (opsional)" maxLength={100} autoComplete="name" value={contactName} onChange={event => setContactName(event.target.value)}/>
        <Input label="Nomor untuk dihubungi (opsional)" type="tel" maxLength={32} autoComplete="tel" value={contactPhone} onChange={event => setContactPhone(event.target.value)}/>
        <section className="sos-capture"><h3>Data perangkat opsional</h3><p>Lokasi, baterai, dan jaringan hanya dikumpulkan setelah pilihan Anda. Data tidak dipakai untuk memastikan respons atau menentukan prioritas.</p><Button variant="secondary" loading={location.busy} onClick={captureLocation}>Izinkan lokasi sekali</Button><span role="status">{point ? `Lokasi tersedia (akurasi ±${Math.round(point.accuracy)} m)` : location.message}</span><Button variant="secondary" onClick={() => void captureBattery()}>Periksa baterai perangkat</Button><span>{battery.level === null ? 'Baterai: tidak tersedia/belum dipilih' : `Baterai ${battery.level}%${battery.charging ? ', mengisi daya' : ''}`}</span><span>Koneksi browser: {navigator.onLine ? 'online (belum mengonfirmasi koneksi server)' : 'offline'}</span></section>
        <label className="sos-consent"><input type="checkbox" required checked={consented} onChange={event => setConsented(event.target.checked)}/> Saya menyetujui pengiriman rincian yang saya isi ke backend RekanSiaga agar staf berwenang dapat meninjaunya. Saya paham ini tidak mengirim petugas resmi.</label>
        <Button loading={busy} disabled={description.trim().length < 10 || !consented} onClick={() => void send()}>Kirim permintaan ke RekanSiaga</Button>
        <EmergencyDirectory/>
      </> : <><Alert tone="success">Permintaan diterima server pada {new Date(receipt.received_at).toLocaleString('id-ID')}. Penerimaan sistem bukan konfirmasi bantuan sedang dikirim.</Alert><p>Referensi: <strong>{receipt.reference_code}</strong></p>{credential && <><p>Kode pelacakan rahasia (hanya ditampilkan sekali, simpan dengan aman):</p><code className="sos-secret">{credential}</code><Button variant="secondary" onClick={() => void navigator.clipboard?.writeText(credential)}>Salin kode rahasia</Button><Button variant="secondary" loading={busy} onClick={() => void revokeCredential()}>Cabut kode pelacakan</Button></>}<p>Status: {receipt.status}</p><Button variant="secondary" onClick={onClose}>Selesai</Button></>}
      <section className="sos-tracking"><h3>Lacak status permintaan</h3><Input label="Kode pelacakan rahasia" type="password" autoComplete="off" value={trackingCode} onChange={event => setTrackingCode(event.target.value)} hint="Kode tidak dimasukkan ke URL atau disimpan otomatis."/><Button variant="secondary" loading={busy} onClick={() => void checkStatus()}>Periksa status</Button>{tracked && <><p>Status: {tracked.status}</p><p>Diperbarui: {new Date(tracked.updated_at).toLocaleString('id-ID')}</p><ol>{tracked.history.map((item, index) => <li key={`${item.changed_at}-${index}`}>{item.status} — {new Date(item.changed_at).toLocaleString('id-ID')}</li>)}</ol></>}</section>
    </>}
    <p role="status">{message}</p>
  </Dialog>
}
