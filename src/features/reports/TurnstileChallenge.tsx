import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { turnstileSiteKey } from './reportApi'
type Widget = { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void }
let loading: Promise<Widget> | undefined
function loadWidget() {
  if (!loading) loading = new Promise<Widget>((resolve, reject) => {
    const current = (window as unknown as { turnstile?: Widget }).turnstile
    if (current) { resolve(current); return }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true
    script.onload = () => { const widget = (window as unknown as { turnstile?: Widget }).turnstile; if (widget) resolve(widget); else reject(new Error('Widget unavailable')) }
    script.onerror = () => { loading = undefined; reject(new Error('Widget unavailable')) }
    document.head.appendChild(script)
  })
  return loading
}
export function TurnstileChallenge({ action, resetKey, onToken }: { action: 'submit' | 'track' | 'map-photo'; resetKey: number; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const callback = useRef(onToken)
  const [failed, setFailed] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  useEffect(() => { callback.current = onToken }, [onToken])
  useEffect(() => {
    let disposed = false; let id: string | undefined; let widget: Widget | undefined
    void loadWidget().then(api => { if (disposed || !container.current) return; widget = api; id = api.render(container.current, { sitekey: turnstileSiteKey, action, callback: (token: string) => { setFailed(false); callback.current(token) }, 'expired-callback': () => callback.current(''), 'error-callback': () => { callback.current(''); setFailed(true) } }) }).catch(() => { if (!disposed) setFailed(true) })
    return () => { disposed = true; if (id) widget?.remove(id) }
  }, [action, resetKey, retryKey])
  return <div><div ref={container} aria-label="Verifikasi keamanan"/>{failed && <><p role="alert">Verifikasi keamanan gagal. Periksa koneksi lalu coba lagi. Isian formulir tetap tersimpan.</p><Button variant="secondary" onClick={() => { callback.current(''); setFailed(false); setRetryKey(value => value + 1) }}>Coba verifikasi lagi</Button></>}</div>
}
