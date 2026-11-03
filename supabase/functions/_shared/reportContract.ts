import { decodeTrackingCredential } from './trackingCredential.ts'
export type ReportPhoto = { mime_type: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string }
export type SubmitReport = { action: 'submit'; report_type: string; title: string; description: string; region_name: string; location_description: string; privacy: true; captcha_token: string; latitude?: number; longitude?: number; photo?: ReportPhoto }
export type TrackReport = { action: 'track'; tracking_code: string; access_token: string; captcha_token: string }
export type TrackSingleReport = { action: 'track'; tracking_credential: string; captcha_token: string }
export type AttachmentRequest = { action: 'attachment'; attachment_id: string }
export type ReportRequest = SubmitReport | TrackReport | TrackSingleReport | AttachmentRequest
export type ReportReceipt = { tracking_code: string; access_token: string; expires_in_days: number; tracking_credential?: string }
export type ReportTracking = { status: string; created_at: string; updated_at: string; history: { status: string; changed_at: string }[] }
export const reportStatuses = ['unverified', 'under_review', 'verified', 'rejected'] as const
// New gateway receipts remain RS. Existing mobile receipts observed in dev
// use RPT plus ten uppercase alphanumeric characters; both still require the
// private 64-hex access token and the normal CAPTCHA/quota checks.
export const reportTrackingCodePattern = /^(?:RS-[0-9A-F]{16}|RPT-[A-Z0-9]{10})$/
export const maxPhotoBytes = 5 * 1024 * 1024
export const maxRequestBytes = 7 * 1024 * 1024 + 20000
export class ApiError extends Error { status: number; code: string; constructor(status: number, code: string) { super(code); this.status = status; this.code = code } }
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'INVALID_INPUT'); return value as Record<string, unknown> }
function bounded(row: Record<string, unknown>, key: string, min: number, max: number) { const value = row[key]; if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new ApiError(400, 'INVALID_INPUT'); return value.trim() }
export function parseReportRequest(value: unknown): ReportRequest {
  const row = record(value)
  if (row.action === 'attachment') { const id = bounded(row, 'attachment_id', 36, 36); if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) throw new ApiError(400, 'INVALID_INPUT'); return { action: 'attachment', attachment_id: id } }
  const captcha_token = bounded(row, 'captcha_token', 1, 2048)
  if (row.action === 'track' && 'tracking_credential' in row) {
    if ('tracking_code' in row || 'access_token' in row) throw new ApiError(400, 'INVALID_INPUT')
    const tracking_credential = bounded(row, 'tracking_credential', 4, 100)
    try { decodeTrackingCredential(tracking_credential) } catch { throw new ApiError(400, 'INVALID_INPUT') }
    return { action: 'track', tracking_credential, captcha_token }
  }
  if (row.action === 'track') { const tracking_code = bounded(row, 'tracking_code', 14, 19).toUpperCase(); const access_token = bounded(row, 'access_token', 64, 64); if (!reportTrackingCodePattern.test(tracking_code) || !/^[\da-f]{64}$/.test(access_token)) throw new ApiError(400, 'INVALID_INPUT'); return { action: 'track', tracking_code, access_token, captcha_token } }
  if (row.action !== 'submit' || row.privacy !== true) throw new ApiError(400, 'INVALID_INPUT')
  const report_type = bounded(row, 'report_type', 2, 50), title = bounded(row, 'title', 5, 180), description = bounded(row, 'description', 20, 5000), region_name = bounded(row, 'region_name', 3, 120), location_description = bounded(row, 'location_description', 5, 300)
  if ((row.latitude == null) !== (row.longitude == null) || row.latitude != null && (typeof row.latitude !== 'number' || typeof row.longitude !== 'number' || !Number.isFinite(row.latitude) || !Number.isFinite(row.longitude) || Math.abs(row.latitude) > 90 || Math.abs(row.longitude) > 180)) throw new ApiError(400, 'INVALID_INPUT')
  let photo: ReportPhoto | undefined
  if (row.photo != null) { const input = record(row.photo); if (!['image/jpeg', 'image/png', 'image/webp'].includes(String(input.mime_type)) || typeof input.base64 !== 'string' || input.base64.length > Math.ceil(maxPhotoBytes / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(input.base64)) throw new ApiError(400, 'INVALID_PHOTO'); photo = { mime_type: input.mime_type as ReportPhoto['mime_type'], base64: input.base64 } }
  return { action: 'submit', report_type, title, description, region_name, location_description, privacy: true, captcha_token, ...(row.latitude != null ? { latitude: row.latitude as number, longitude: row.longitude as number } : {}), ...(photo ? { photo } : {}) }
}
export function decodePhoto(photo: ReportPhoto) {
  let bytes: Uint8Array
  try { bytes = Uint8Array.from(atob(photo.base64), char => char.charCodeAt(0)) } catch { throw new ApiError(400, 'INVALID_PHOTO') }
  if (!bytes.length || bytes.length > maxPhotoBytes) throw new ApiError(413, 'PHOTO_TOO_LARGE')
  const valid = photo.mime_type === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff : photo.mime_type === 'image/png' ? [137,80,78,71,13,10,26,10].every((byte, i) => bytes[i] === byte) : String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP'
  if (!valid) throw new ApiError(400, 'INVALID_PHOTO')
  return bytes
}
