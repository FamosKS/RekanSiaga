import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { trackingSchema, singleTrackingSchema, type TrackingFields } from './reportSchema'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Alert } from '../../components/ui/Alert'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/publicFormatting'
import { reportError, reportGatewayEnabled, singleTrackingEnabled, trackReport, trackSingleReport } from './reportApi'
import { TurnstileChallenge } from './TurnstileChallenge'
import type { ReportTracking } from '../../../supabase/functions/_shared/reportContract'
export function TrackingForm() {
  // Credentials stay in component memory only; never enter the draft vault.
  const [legacy, setLegacy] = useState(!singleTrackingEnabled)
  const [checked, setChecked] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [challenge, setChallenge] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ReportTracking>()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TrackingFields>({ resolver: zodResolver(legacy ? trackingSchema : singleTrackingSchema), defaultValues: { code: '', token: '' } })

  return <>{singleTrackingEnabled && <Button variant="secondary" disabled={busy} onClick={() => { setLegacy(value => !value); reset({ code: '', token: '' }); setResult(undefined); setError(''); setCaptcha(''); setChallenge(value => value + 1) }}>{legacy ? 'Gunakan satu kode pelacakan' : 'Gunakan kode + token laporan lama'}</Button>}<form className="form-stack" onChange={() => { setChecked(false); setResult(undefined); setError('') }} noValidate onSubmit={handleSubmit(async fields => {
    if (busy) return
    if (!reportGatewayEnabled) { setChecked(true); return }
    if (!captcha) return
    setBusy(true); setError(''); setResult(undefined)
    try { setResult(legacy ? await trackReport(fields.code.toUpperCase(), fields.token, captcha) : await trackSingleReport(fields.code, captcha)); reset({ code: '', token: '' }) } catch (failure) { setError(reportError(failure)) } finally { setBusy(false); setCaptcha(''); setChallenge(value => value + 1) }
  })}><Input label="Kode pelacakan" {...register('code')} error={errors.code?.message} disabled={busy} autoComplete="off" placeholder={legacy ? "RS-XXXXXXXXXXXXXXXX / RPT-XXXXXXXXXX" : "RK2-XXXX-XXXX-..."}/>{legacy && <Input label="Token akses pribadi" type="password" {...register('token')} disabled={busy} error={errors.token?.message} autoComplete="off" hint="64 karakter hex dari tanda terima lama. Jangan masukkan password akun."/>}{reportGatewayEnabled && <TurnstileChallenge action="track" resetKey={challenge} onToken={setCaptcha}/>}<Button type="submit" loading={busy} disabled={reportGatewayEnabled && !captcha}>{reportGatewayEnabled ? 'Cari status laporan' : 'Periksa format pelacakan'}</Button>{!reportGatewayEnabled && <Button disabled>Cari status laporan (gateway belum aktif)</Button>}</form>
    {error && <Alert tone="danger">{error}</Alert>}
    {result ? <section aria-live="polite"><h2>Status: {result.status}</h2><p>Diperbarui: {formatDate(result.updated_at)}</p><h3>Riwayat status laporan</h3><ol className="timeline">{result.history.map((item, index) => <li key={index}><time dateTime={item.changed_at}>{formatDate(item.changed_at)}</time><p>{item.status}</p></li>)}</ol></section> : <div role="status">{checked ? <Alert tone="warning" heading="Format input valid secara lokal">Tidak ada pencarian ke server. Token/kode tidak disimpan atau dipindahkan ke URL. Gateway belum aktif.</Alert> : <EmptyState title="Belum ada hasil pelacakan" description="Masukkan satu kode pelacakan rahasia. Untuk bukti lama, gunakan pilihan kode + token laporan lama."/>}</div>}
  </>
}
