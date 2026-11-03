import { useAccessibilityStore } from '../../stores/accessibilityStore'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'
export function AccessibilityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useAccessibilityStore()
  return (
    <Dialog open={open} onClose={onClose} title="Aksesibilitas & Bantuan Khusus" description="Preferensi diterapkan dan disimpan otomatis pada perangkat ini."
      footer={<><Button variant="secondary" onClick={settings.reset}>Atur ulang</Button><Button onClick={onClose}>Selesai</Button></>}>
      <fieldset className="text-size-picker">
        <legend>Ukuran teks</legend>
        <div>{([{ value: 'normal', label: 'Normal' }, { value: 'large', label: 'Besar' }, { value: 'extra', label: 'Sangat besar' }] as const).map(option => (
          <label key={option.value}><input type="radio" name="text-size" value={option.value} checked={settings.textSize === option.value} onChange={() => settings.update({ textSize: option.value })}/><span>{option.label}</span></label>
        ))}</div>
      </fieldset>
      <label className="setting-row"><span>Kontras tinggi<small>Teks dan batas elemen lebih tegas</small></span><input className="rs-switch" role="switch" type="checkbox" checked={settings.highContrast} onChange={event => settings.update({ highContrast: event.target.checked })}/></label>
      <label className="setting-row"><span>Kurangi gerakan<small>Nonaktifkan animasi antarmuka</small></span><input className="rs-switch" role="switch" type="checkbox" checked={settings.reducedMotion} onChange={event => settings.update({ reducedMotion: event.target.checked })}/></label>
      <p className="muted">Pembaca layar perangkat didukung melalui struktur halaman. Pembacaan suara otomatis dan video bahasa isyarat belum tersedia.</p>
    </Dialog>
  )
}
