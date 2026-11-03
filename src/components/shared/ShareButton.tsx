import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { Button } from '../ui/Button'
export function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState('')
  async function share() {
    const url = window.location.origin + window.location.pathname
    try {
      if (navigator.share) { await navigator.share({ title, url }); setMessage('Tautan dibagikan melalui perangkat.') }
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); setMessage('Tautan disalin.') }
      else setMessage('Berbagi tidak didukung. Salin alamat halaman dari browser Anda.')
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage('Tautan belum dibagikan. Silakan salin alamat halaman secara manual.') }
  }
  return <div><Button variant="secondary" onClick={share}><Share2 size={16} aria-hidden="true"/>Bagikan tautan</Button><p className="interaction-message" role="status">{message}</p></div>
}
