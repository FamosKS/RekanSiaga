import { useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
export function PhotoUpload({ onValidityChange, onFileChange }: { onValidityChange: (valid: boolean) => void; onFileChange?: (file: File | null) => void }) {
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const activeUrl = useRef('')
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => () => { if (activeUrl.current) URL.revokeObjectURL(activeUrl.current) }, [])
  function clear() {
    if (activeUrl.current) URL.revokeObjectURL(activeUrl.current)
    activeUrl.current = ''; setPreview(''); setName(''); setError(''); onValidityChange(true); onFileChange?.(null)
  }
  return <div className="photo-upload"><div className="section-heading"><h3><ImagePlus size={18} aria-hidden="true"/> Foto pendukung (opsional)</h3></div><Input ref={input} type="file" label="Pilih foto atau ambil dari kamera" accept="image/jpeg,image/png,image/webp" capture="environment" error={error} hint="JPEG, PNG, atau WebP, maksimal 5 MB. Hanya dikirim saat laporan dikirim melalui gateway privat. Metadata EXIF tidak dianggap bukti mutlak dan foto tanpa GPS tetap diterima." onChange={event => {
    clear()
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Pilih foto JPEG/PNG/WebP maksimal 5 MB.'); onValidityChange(false); return }
    activeUrl.current = URL.createObjectURL(file); setPreview(activeUrl.current); setName(file.name); onFileChange?.(file)
  }}/>{preview && <div className="photo-preview"><img src={preview} alt="Pratinjau foto pendukung pilihan Anda"/><span>{name}</span><Button variant="secondary" size="sm" onClick={() => { clear(); if (input.current) input.current.value = '' }}>Hapus foto</Button></div>}</div>
}
