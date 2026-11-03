import { useState } from 'react'
import { MapPinned } from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { RegionSelector } from '../regions/RegionSelector'

export const alertRegionStorageKey = 'rekansiaga.alert-region.v1'
export const alertSeenStorageKey = 'rekansiaga.alert-seen.v1'
export const alertRegionChangedEvent = 'rekansiaga:alert-region-changed'
function storedRegion() { try { return localStorage.getItem(alertRegionStorageKey) ?? '' } catch { return '' } }
function persistRegion(regionId: string) {
  try {
    if (regionId) localStorage.setItem(alertRegionStorageKey, regionId)
    else localStorage.removeItem(alertRegionStorageKey)
    window.dispatchEvent(new Event(alertRegionChangedEvent))
  } catch { /* preference remains unset when browser storage is unavailable */ }
}

export function AlertRegionPreference() {
  const [regionId, setRegionId] = useState(storedRegion)
  const [hasDistrict, setHasDistrict] = useState(!!regionId)
  const [editing, setEditing] = useState(!regionId)
  if (!editing && regionId) return <Alert tone="primary" icon={<MapPinned size={20}/>} heading="Peringatan berdasarkan wilayah pilihan"><p>Wilayah pemantauan disimpan hanya di perangkat ini. Lokasi GPS tidak diakses.</p><Button variant="secondary" size="sm" onClick={() => { setHasDistrict(true); setEditing(true) }}>Ubah wilayah</Button><Button variant="ghost" size="sm" onClick={() => { persistRegion(''); setRegionId(''); setHasDistrict(false); setEditing(true) }}>Hapus wilayah</Button></Alert>
  return <Alert tone="primary" icon={<MapPinned size={20}/>} heading="Pilih wilayah untuk peringatan"><p>Pilih kecamatan secara manual. Tanpa pilihan wilayah, peringatan tidak akan dicocokkan atau ditampilkan.</p><RegionSelector label="Wilayah pemantauan" value={regionId || undefined} maxLevel="district" onChange={selection => { const next = selection?.id ?? ''; setRegionId(next); const district = selection?.region_type === 'district'; setHasDistrict(district); if (district) { persistRegion(next); setEditing(false) } }} hint="Pilihan wilayah disimpan lokal di browser; bukan lokasi GPS."/><div className="action-row"><Button type="button" variant="secondary" onClick={() => { if (hasDistrict) setEditing(false) }} disabled={!hasDistrict}>Selesai</Button></div></Alert>
}
