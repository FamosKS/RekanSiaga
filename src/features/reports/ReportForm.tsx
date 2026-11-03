import { ReportReceiptView } from './ReportReceiptView'
import { useState } from 'react'
import { useDraftRecovery, useDraftState } from '../drafts/useDraftState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Dialog } from '../../components/ui/Dialog'
import { reportSchema, type ReportFields } from './reportSchema'
import { ReportFormFields } from './ReportFormFields'
import { PhotoUpload } from './PhotoUpload'
import { useDeviceLocation } from '../../hooks/useDeviceLocation'
import { reportError, reportGatewayEnabled, singleTrackingEnabled, submitReport } from './reportApi'
import { TurnstileChallenge } from './TurnstileChallenge'
import type { ReportPhoto, ReportReceipt } from '../../../supabase/functions/_shared/reportContract'
import { parsePoint } from '../../lib/geography'
export function ReportForm() {
  const [draft, setDraft, clearDraft] = useDraftState<{ fields: Partial<ReportFields>; regionId?: string }>('public-report', { fields: { title: '', description: '', region: '', location: '', privacy: false } })
  const [prepared, setPrepared] = useState(false)
  const [photoValid, setPhotoValid] = useState(true)
  const [photo, setPhoto] = useState<File | null>(null)
  const [captcha, setCaptcha] = useState('')
  const [challenge, setChallenge] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<ReportReceipt>()
  const location = useDeviceLocation()
  const [deviceCoordinates, setDeviceCoordinates] = useState<{ latitude: number; longitude: number }>()
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const { register, handleSubmit, setValue, reset, getValues, formState: { errors } } = useForm<ReportFields>({ resolver: zodResolver(reportSchema), defaultValues: draft.fields })
  useDraftRecovery(() => { reset(draft.fields); setCaptcha(''); setChallenge(value => value + 1) })
  async function submit(fields: ReportFields) {
    if (!photoValid || busy || receipt) return
    if (!reportGatewayEnabled) { setPrepared(true); return }
    if (!captcha) { setError('Selesaikan verifikasi keamanan.'); return }
    setBusy(true); setError('')
    try {
      let attachment: ReportPhoto | undefined
      if (photo) { const bytes = new Uint8Array(await photo.arrayBuffer()); let binary = ''; for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192)); attachment = { mime_type: photo.type as ReportPhoto['mime_type'], base64: btoa(binary) } }
      const coordinates = deviceCoordinates ?? parsePoint(fields.location)
      const result = await submitReport({ action: 'submit', report_type: fields.type, title: fields.title, description: fields.description, region_name: fields.region, location_description: fields.location, privacy: true, captcha_token: captcha, ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}), ...(attachment ? { photo: attachment } : {}) })
      clearDraft(); setReceipt(result)
    } catch (failure) { setError(reportError(failure)) }
    finally { setBusy(false); setCaptcha(''); setChallenge(value => value + 1) }
  }
  if (receipt) return singleTrackingEnabled ? <ReportReceiptView receipt={receipt}/> : <Alert tone="success" heading="Laporan diterima backend"><p>Kode referensi: <output>{receipt.tracking_code}</output></p><p>Token pribadi: <output style={{ overflowWrap: 'anywhere' }}>{receipt.access_token}</output></p><p>Simpan keduanya secara pribadi sebelum menutup halaman. Berlaku {receipt.expires_in_days} hari sejak pengiriman kecuali dicabut.</p></Alert>
  return <><form className="form-stack" onChange={() => setDraft(previous => ({ ...previous, fields: getValues() }))} onSubmit={handleSubmit(submit)} noValidate><fieldset className="form-stack" disabled={busy} style={{ border: 0, padding: 0 }}>
    <ReportFormFields register={register} errors={errors} regionId={draft.regionId} onRegionChange={(name, regionId) => { setValue('region', name, { shouldDirty: true, shouldValidate: true }); setDraft(previous => ({ ...previous, regionId, fields: getValues() })) }}/>
    <div className="location-consent"><Button variant="secondary" loading={location.busy} onClick={() => location.request((value, accuracyMeters) => { const point = parsePoint(value); setDeviceCoordinates(point ?? undefined); setAccuracy(accuracyMeters); setValue('location', value, { shouldDirty: true, shouldValidate: true }); setDraft(previous => ({ ...previous, fields: getValues() })) })}>Gunakan lokasi perangkat</Button><p className="muted" role="status">{location.message}</p>{accuracy !== null && <small>Estimasi akurasi perangkat: ±{Math.round(accuracy)} meter. Periksa kembali lokasi kejadian.</small>}<small>Lokasi hanya diminta setelah tombol ditekan. GPS adalah bukti pendukung, bukan verifikasi otomatis.</small></div>
    <PhotoUpload onValidityChange={setPhotoValid} onFileChange={setPhoto}/>
    <Alert tone="primary" heading="Privasi laporan">{reportGatewayEnabled ? 'Saat dikirim, laporan disimpan privat dan hanya diperiksa staf berwenang. Hindari identitas pribadi, wajah orang lain, atau foto dengan metadata sensitif.' : 'Gateway laporan belum diaktifkan operator. Input hanya di memori halaman; pemeriksaan lokal tidak mengirim data.'}</Alert>
    <label className="check"><input type="checkbox" {...register('privacy')} aria-invalid={!!errors.privacy} aria-describedby={errors.privacy ? 'privacy-error' : undefined}/>Saya memahami penggunaan data dan telah memeriksa informasi laporan.</label>{errors.privacy && <p id="privacy-error" className="field-error" role="alert">{errors.privacy.message}</p>}
    {reportGatewayEnabled && <TurnstileChallenge action="submit" resetKey={challenge} onToken={setCaptcha}/>}
    {error && <Alert tone="danger">{error}</Alert>}
    <Button type="submit" loading={busy} disabled={!photoValid || reportGatewayEnabled && !captcha}>{reportGatewayEnabled ? 'Kirim laporan' : 'Periksa draf laporan'}</Button>{!reportGatewayEnabled && <Button disabled>Kirim laporan (gateway belum aktif)</Button>}
  </fieldset></form><Dialog open={prepared} onClose={() => setPrepared(false)} title="Draf selesai diperiksa" description="Validasi frontend lulus. Laporan belum dikirim, belum diverifikasi, dan belum memiliki kode pelacakan." footer={<Button onClick={() => setPrepared(false)}>Kembali ke draf</Button>}><Alert tone="warning">Gateway belum diaktifkan. Tidak ada laporan yang diterima petugas.</Alert></Dialog></>
}
