import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { signOut } from './authService'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../../components/ui/Button'
export function SignOutButton() {
  const { session, loading } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function logout() {
    if (busy) return
    setError(''); setBusy(true)
    try { const result = await signOut(); if (result.error) setError('Tidak dapat keluar. Coba kembali.') }
    catch { setError('Layanan tidak tersedia. Coba keluar kembali.') }
    finally { setBusy(false) }
  }
  return <div className="admin-signout"><Button variant="secondary" disabled={!session || loading} loading={busy} onClick={logout}><LogOut size={18} aria-hidden="true"/>{busy ? 'Keluar...' : 'Keluar'}</Button>{error && <p role="alert">{error}</p>}</div>
}
