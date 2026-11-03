import { useState, useSyncExternalStore } from 'react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { draftBackupEnabled, draftCount, draftRevision, draftStorageFailed, forgetDrafts, hasDraftBackup, protectDrafts, restoreDrafts, subscribeDrafts } from './draftVault'
export function DraftRecovery() {
  useSyncExternalStore(subscribeDrafts, draftRevision, draftRevision)
  const [open, setOpen] = useState(false), [phrase, setPhrase] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  async function run(restore: boolean) {
    if (restore && draftCount() && !window.confirm('Pulihkan cadangan dan ganti draf yang sama di memori?')) return
    setBusy(true)
    try { if (restore) await restoreDrafts(phrase); else await protectDrafts(phrase); setNotice(restore ? 'Draf dipulihkan. Periksa isian dan pilih ulang lampiran serta verifikasi keamanan.' : 'Pemulihan draf terlindungi diaktifkan untuk tab ini.') }
    catch { setNotice('Pemulihan belum berhasil. Periksa frasa, sesi, dan ketersediaan penyimpanan browser. Frasa minimal 12 karakter.') }
    finally { setPhrase(''); setBusy(false) }
  }
  return <><div className="container action-row" aria-label="Pemulihan draf"><Button variant="secondary" size="sm" onClick={() => setOpen(true)}>Draf sementara{hasDraftBackup() && !draftBackupEnabled() ? ' tersedia untuk dipulihkan' : ''}</Button>{draftStorageFailed() && <span role="alert">Cadangan draf gagal disimpan. Isian saat ini masih ada di memori.</span>}</div><Dialog open={open} onClose={() => { if (!busy) { setOpen(false); setPhrase('') } }} title="Pemulihan draf"><p>Isian dipertahankan saat berpindah tab atau menu. Aktifkan pemulihan terlindungi untuk memulihkan pekerjaan jika browser membuang tab. Simpan frasa sendiri; Anda harus memasukkannya kembali setelah halaman dimuat ulang.</p><p>Cadangan terenkripsi hanya untuk tab dan akun ini, berlaku 8 jam. Password, token akses/pelacakan, CAPTCHA dan file lampiran tidak dicadangkan. Keluar akun atau hapus draf akan menghapus cadangan.</p><Input label="Frasa pemulihan draf" type="password" autoComplete="off" value={phrase} onChange={event => setPhrase(event.target.value)} disabled={busy}/><div className="action-row"><Button disabled={busy || phrase.length < 12 || hasDraftBackup() && !draftBackupEnabled()} onClick={() => { void run(false) }}>Lindungi draf tab ini</Button><Button disabled={busy || phrase.length < 12 || !hasDraftBackup()} onClick={() => { void run(true) }}>Pulihkan draf</Button><Button variant="danger" disabled={busy} onClick={() => { if (window.confirm('Hapus semua draf sementara dan cadangannya pada tab ini?')) { forgetDrafts(); setNotice('Draf sementara dihapus.') } }}>Hapus draf</Button></div>{notice && <Alert>{notice}</Alert>}</Dialog></>
}
