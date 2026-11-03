import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BellRing } from 'lucide-react'
import { Alert } from '../../components/ui/Alert'
import { alertRegionChangedEvent, alertRegionStorageKey, alertSeenStorageKey } from './AlertRegionPreference'
import { DisasterWarningDialog } from './DisasterWarningDialog'
import { locationAlertsEnabled, listActiveAlerts, prioritizeAlerts, unseenAlerts } from './disasterAlerts'

export const openAlertCenterEvent = 'rekansiaga:open-alert-center'
function readSeen(): Record<string, number> {
  try {
    const raw = localStorage.getItem(alertSeenStorageKey)
    if (!raw || raw.length > 20_000) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isSafeInteger(entry[1]) && entry[1] >= 0).slice(-100))
  } catch { return {} }
}
function persistSeen(alerts: { id: string; version: number }[]) {
  try { const next = { ...readSeen(), ...Object.fromEntries(alerts.map(alert => [alert.id, alert.version])) }; localStorage.setItem(alertSeenStorageKey, JSON.stringify(Object.fromEntries(Object.entries(next).slice(-100)))) } catch { /* session still dismisses this dialog */ }
}
function readRegion() { try { return localStorage.getItem(alertRegionStorageKey) ?? '' } catch { return '' } }

export function LocationAlertCenter() {
  const [regionId, setRegionId] = useState(readRegion)
  const [manualOpen, setManualOpen] = useState(false)
  const [dismissedKey, setDismissedKey] = useState('')
  const query = useQuery({
    queryKey: ['public-content', 'location-alerts', regionId],
    queryFn: ({ signal }) => listActiveAlerts(regionId, signal),
    enabled: locationAlertsEnabled && !!regionId, staleTime: 10_000,
    refetchInterval: 20_000, refetchIntervalInBackground: false,
    refetchOnWindowFocus: true, refetchOnReconnect: 'always',
  })
  useEffect(() => {
    const sync = () => { setRegionId(readRegion()); setDismissedKey('') }
    const manual = () => setManualOpen(true)
    window.addEventListener(alertRegionChangedEvent, sync)
    window.addEventListener('storage', sync)
    window.addEventListener(openAlertCenterEvent, manual)
    return () => { window.removeEventListener(alertRegionChangedEvent, sync); window.removeEventListener('storage', sync); window.removeEventListener(openAlertCenterEvent, manual) }
  }, [])
  const active = query.isError ? [] : prioritizeAlerts(query.data ?? [])
  const unseen = unseenAlerts(active, readSeen())
  const warning = active.find(alert => alert.id === unseen[0]?.id) ?? active[0] ?? null
  const modalKey = warning ? `${warning.id}:${warning.version}` : ''
  const open = manualOpen || (!!warning && !!unseen.length && dismissedKey !== modalKey)
  function close() {
    persistSeen(active.map(alert => ({ id: alert.id, version: alert.version })))
    setManualOpen(false)
    setDismissedKey(modalKey)
  }
  if (!locationAlertsEnabled) return null
  return <>
    <button type="button" className="alert-center-trigger" aria-label="Buka pusat peringatan aktif" onClick={() => setManualOpen(true)}><BellRing size={20} aria-hidden="true"/><span>Peringatan {active.length ? `(${active.length})` : ''}</span></button>
    {query.isError && <div className="alert-center-error"><Alert tone="warning" role="status">Peringatan wilayah gagal diperbarui. Data tidak tersedia bukan berarti keadaan aman; ikuti kanal resmi dan arahan petugas.</Alert></div>}
    <DisasterWarningDialog open={open} onClose={close} warning={warning} others={active.filter(alert => alert.id !== warning?.id)} error={query.isError}/>
  </>
}
