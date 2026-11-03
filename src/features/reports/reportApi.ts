import { encodeTrackingCredential } from '../../../supabase/functions/_shared/trackingCredential.ts'
import { supabase } from '../../lib/supabase'
import { ApiError, parseReportRequest, type ReportReceipt, type ReportRequest, type ReportTracking, type SubmitReport } from '../../../supabase/functions/_shared/reportContract'
export const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''
// Enable only after the approved v2 SQL/Gateway package is deployed.
export const singleTrackingEnabled = import.meta.env.VITE_REPORT_SINGLE_CODE_ENABLED === 'true'
export const reportGatewayEnabled = import.meta.env.VITE_REPORT_GATEWAY_ENABLED === 'true' && !!turnstileSiteKey
export async function reportRequest<T>(input: ReportRequest, authorization?: string): Promise<T> {
  if (!reportGatewayEnabled) throw new ApiError(503, 'SERVICE_NOT_READY')
  parseReportRequest(input)
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-gateway`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, ...(authorization ? { Authorization: authorization } : {}) }, cache: 'no-store', body: JSON.stringify(input), signal: AbortSignal.timeout(25_000) })
  const data: unknown = await response.json()
  if (!response.ok) { const code = data && typeof data === 'object' && 'error' in data && data.error && typeof data.error === 'object' && 'code' in data.error ? String(data.error.code) : 'SERVICE_UNAVAILABLE'; throw new ApiError(response.status, code) }
  return data as T
}
export async function submitReport(input: SubmitReport): Promise<ReportReceipt> {
  const data = await reportRequest<ReportReceipt>(input)
  if (!/^RS-[\dA-F]{16}$/.test(data.tracking_code) || !/^[\da-f]{64}$/.test(data.access_token)) throw new ApiError(503, 'SUBMISSION_UNCERTAIN')
  return { ...data, tracking_credential: encodeTrackingCredential(data.access_token) }
}
export async function trackReport(code: string, token: string, captcha: string): Promise<ReportTracking> {
  const data = await reportRequest<ReportTracking>({ action: 'track', tracking_code: code, access_token: token, captcha_token: captcha })
  if (!['unverified', 'under_review', 'verified', 'rejected'].includes(data.status) || !Array.isArray(data.history) || typeof data.created_at !== 'string' || typeof data.updated_at !== 'string') throw new ApiError(503, 'SERVICE_UNAVAILABLE')
  return data
}
export async function trackSingleReport(credential: string, captcha: string): Promise<ReportTracking> {
  const data = await reportRequest<ReportTracking>({ action: 'track', tracking_credential: credential, captcha_token: captcha })
  if (!['unverified', 'under_review', 'verified', 'rejected'].includes(data.status) || !Array.isArray(data.history) || typeof data.updated_at !== 'string') throw new ApiError(503, 'SERVICE_UNAVAILABLE')
  return data
}
export async function attachmentUrl(id: string) {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new ApiError(401, 'UNAUTHORIZED')
  const response = await reportRequest<{ signed_url: string }>({ action: 'attachment', attachment_id: id }, `Bearer ${data.session.access_token}`)
  const url = new URL(response.signed_url)
  if (url.origin !== new URL(import.meta.env.VITE_SUPABASE_URL).origin || !url.pathname.startsWith('/storage/v1/object/sign/report-evidence/')) throw new ApiError(503, 'SERVICE_UNAVAILABLE')
  return url.href
}
export function reportError(error: unknown) {
  const code = error instanceof ApiError ? error.code : ''
  if (code === 'NOT_FOUND') return 'Kode pelacakan tidak cocok, kedaluwarsa, dicabut, atau tidak ditemukan.'
  if (code === 'RATE_LIMITED') return 'Terlalu banyak permintaan. Tunggu sebelum mencoba lagi.'
  if (code === 'CHALLENGE_FAILED') return 'Verifikasi keamanan gagal atau kedaluwarsa. Selesaikan verifikasi baru.'
  if (code === 'INVALID_INPUT' || code === 'INVALID_PHOTO' || code === 'PHOTO_TOO_LARGE' || code === 'BODY_TOO_LARGE') return 'Input atau foto ditolak backend. Periksa format, ukuran, dan isian.'
  if (code === 'FORBIDDEN' || code === 'UNAUTHORIZED') return 'Sesi atau role tidak mengizinkan akses lampiran.'
  if (code === 'APPROVAL_FAILED') return 'Salinan foto gagal disetujui. Periksa apakah paket SQL approval sudah berhasil diterapkan.'
  if (code === 'SOURCE_UNAVAILABLE') return 'Foto asli tidak dapat dibaca oleh pipeline publikasi.'
  if (code === 'PUBLIC_COPY_FAILED') return 'Salinan aman foto gagal dibuat di bucket publik.'
  if (code === 'INVALID_PHOTO') return 'Foto tidak dapat disanitasi atau formatnya tidak valid.'
  if (code === 'SERVICE_NOT_READY') return 'Gateway laporan belum diaktifkan atau belum kompatibel pada dev. Hubungi operator.'
  return 'Status operasi belum dapat dipastikan. Periksa koneksi; jangan mengirim laporan berulang sebelum memastikan hasil.'
}
