import { useEffect, useRef, useState } from 'react'
export function useDeviceLocation() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Lokasi perangkat belum diakses.')
  const requestId = useRef(0)
  useEffect(() => () => { requestId.current += 1 }, [])
  function request(onSuccess: (coordinates: string, accuracyMeters: number | null) => void) {
    if (!navigator.geolocation) { setMessage('Perangkat tidak mendukung lokasi. Isi lokasi secara manual.'); return }
    const current = ++requestId.current
    setBusy(true); setMessage('Meminta izin lokasi melalui browser...')
    navigator.geolocation.getCurrentPosition(position => {
      if (current !== requestId.current) return
      setBusy(false); setMessage(`Koordinat diperoleh. Perkiraan akurasi ±${Math.round(position.coords.accuracy)} m.`)
      onSuccess(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`, Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null)
    }, () => {
      if (current !== requestId.current) return
      setBusy(false); setMessage('Lokasi tidak dapat diakses atau izin ditolak. Isi lokasi secara manual.')
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 })
  }
  return { busy, message, request }
}
