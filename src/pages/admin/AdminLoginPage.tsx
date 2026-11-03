import { SignOutButton } from '../../features/auth/SignOutButton'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { PageHeader, Panel, ErrorState } from '../../components/shared/PageElements'
import { Brand } from '../../components/layout/Brand'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { signIn } from '../../features/auth/authService'
import { useAuth } from '../../hooks/useAuth'
export function AdminLoginPage() {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [visible, setVisible] = useState(false)
  const { session } = useAuth()
  const navigate = useNavigate()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setError(''); setBusy(true)
    const form = new FormData(event.currentTarget)
    try { const result = await signIn(String(form.get('email')).trim(), String(form.get('password'))); if (result.error) setError('Login gagal. Periksa kredensial atau coba kembali.'); else navigate('/admin', { replace: true }) } catch { setError('Layanan autentikasi tidak tersedia.') } finally { setBusy(false) }
  }
  return <main className="login-shell"><Brand/><Panel><span className="admin-login-icon"><LockKeyhole size={24} aria-hidden="true"/></span><PageHeader eyebrow="AKSES STAF" title="Masuk administrasi" description="Gunakan akun staf terdaftar untuk mengakses ruang kerja RekanSiaga."/>{error && <ErrorState message={error}/>}<form className="form-stack" onSubmit={submit}><Input label="Email" type="email" name="email" required maxLength={254} autoComplete="username" disabled={busy}/><Input label="Kata sandi" type={visible ? 'text' : 'password'} name="password" required autoComplete="current-password" disabled={busy}/><Button variant="ghost" aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>} {visible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}</Button><Button type="submit" loading={busy}>{busy ? 'Memeriksa...' : 'Masuk'}</Button></form>{session && <p>Sesi tersedia. <Link to="/admin">Periksa akses administrasi</Link></p>}{session && <SignOutButton/>}<p className="muted admin-login-note">Akses memerlukan profil staf aktif dan role dari database. Jika akses ditolak, hubungi pengelola akun staf.</p></Panel><Link to="/">Kembali ke beranda</Link></main>
}
