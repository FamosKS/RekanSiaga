import { useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { encodeTrackingCredential } from '../../../supabase/functions/_shared/trackingCredential.ts'
import type { ReportReceipt } from '../../../supabase/functions/_shared/reportContract'
export function ReportReceiptView({ receipt }: { receipt: ReportReceipt }) {
  const [message, setMessage] = useState('')
  const code = encodeTrackingCredential(receipt.access_token)
  async function copy() {
    try { await navigator.clipboard.writeText(code); setMessage('Kode disalin. Jaga kerahasiaan clipboard Anda.') }
    catch { setMessage('Tidak dapat menyalin otomatis. Pilih dan salin kode di atas.') }
  }
  function save() {
    const blob = new Blob([`BUKTI LAPORAN REKANSIAGA\nKode pelacakan rahasia: ${code}\nMasa berlaku: ${receipt.expires_in_days} hari sejak pengiriman, kecuali dicabut.\nSimpan pribadi. Kode ini memberi akses ke status laporan.\nBukti penerimaan bukan verifikasi kejadian atau permintaan respons darurat.\n`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob), link = document.createElement('a')
    link.href = url; link.download = 'bukti-laporan-rekansiaga.txt'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('Bukti disiapkan untuk diunduh. Simpan berkas secara pribadi.')
  }
  return <Alert tone="success" heading="Laporan diterima backend">
    <p>Status awal: unverified. Belum diverifikasi petugas dan bukan permintaan respons darurat.</p>
    <p>Kode pelacakan rahasia:</p><output className="coordinate-output" style={{ overflowWrap: 'anywhere', userSelect: 'all' }}>{code}</output>
    <p>Simpan kode ini sebelum menutup halaman. Siapa pun yang memilikinya dapat melihat status laporan. Berlaku {receipt.expires_in_days} hari sejak pengiriman, kecuali dicabut.</p>
    <Button onClick={copy}>Salin Kode</Button>{' '}<Button variant="secondary" onClick={save}>Simpan Bukti Laporan</Button>
    <p role="status">{message}</p>
  </Alert>
}
