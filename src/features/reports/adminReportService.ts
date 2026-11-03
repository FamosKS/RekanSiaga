import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { authorize, pageSize, remoteWritesApproved } from '../admin/adminDataService'
import { normalizeReviewReason } from './reviewContract'
import { ApiError } from '../../../supabase/functions/_shared/reportContract'
const columns = 'id,event_id,tracking_code,report_type,title,description,coordinates,location_description,status,reviewed_by,reviewed_at,created_at,updated_at'
const reportSchema = z.object({ id: z.string().uuid(), event_id: z.string().uuid().nullable().optional(), tracking_code: z.string(), report_type: z.string(), title: z.string(), description: z.string(), coordinates: z.unknown().nullable(), location_description: z.string().nullable(), status: z.enum(['unverified', 'under_review', 'verified', 'rejected']), reviewed_by: z.string().nullable(), reviewed_at: z.string().nullable(), created_at: z.string(), updated_at: z.string() })
const scopedReviewApproved = import.meta.env.VITE_DEV_REPORT_REVIEW_APPROVED === 'true'
const scopedReportId = import.meta.env.VITE_DEV_REPORT_REVIEW_ID ?? ''
const staffReviewEnabled = import.meta.env.VITE_DEV_REPORT_REVIEW_ENABLED === 'true'
const reviewDevTarget = import.meta.env.VITE_SUPABASE_URL === 'https://uiuiouosblyuqgnvfpeh.supabase.co'
export function isReportReviewApproved(id: string): boolean {
  if (!reviewDevTarget) return false
  // A specific scope takes precedence even if a broader flag is later enabled.
  // This is an operator guard; the RPC still enforces real authentication/RBAC.
  if (scopedReviewApproved) return /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(scopedReportId) && id.toLowerCase() === scopedReportId.toLowerCase()
  return staffReviewEnabled || remoteWritesApproved
}
export async function listReports(page: number, search: string, status: string, signal?: AbortSignal) {
  await authorize('/admin/laporan')
  let query = supabase.from('public_reports').select(columns, { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1)
  if (search) query = query.ilike('tracking_code', `%${search.replace(/[\\%_]/g, '\\$&')}%`)
  if (status) query = query.eq('status', status)
  if (signal) query = query.abortSignal(signal)
  const { data, count, error } = await query
  if (error) throw error
  return { rows: z.array(reportSchema).parse(data), count: count ?? 0 }
}
export async function getReport(id: string, signal?: AbortSignal) {
  z.string().uuid().parse(id)
  await authorize('/admin/laporan')
  const options = signal ?? new AbortController().signal
  const [report, history, attachments] = await Promise.all([
    supabase.from('public_reports').select(columns).eq('id', id).abortSignal(options).maybeSingle(),
    supabase.from('report_status_history').select('id,from_status,to_status,changed_by,reason,changed_at').eq('report_id', id).order('changed_at').abortSignal(options),
    supabase.from('report_attachments').select('id,mime_type,file_size,created_at').eq('report_id', id).abortSignal(options),
  ])
  for (const result of [report, history, attachments]) if (result.error) throw result.error
  return { report: report.data ? reportSchema.parse(report.data) : null, history: history.data ?? [], attachments: attachments.data ?? [] }
}
export function transitions(status: string) {
  const forward = status === 'unverified' ? ['under_review', 'verified', 'rejected'] : status === 'under_review' ? ['verified', 'rejected'] : []
  return Array.from(new Set([...forward, ...(status === 'verified' || status === 'rejected' ? ['unverified', 'under_review', 'verified', 'rejected'] : [])])).filter(value => value !== status)
}
export async function reviewReport(id: string, status: string, reason: string | null) {
  z.string().uuid().parse(id); z.enum(['unverified', 'under_review', 'verified', 'rejected']).parse(status)
  const normalized = normalizeReviewReason(reason)
  if (!isReportReviewApproved(id)) throw { code: 'APPROVAL_REQUIRED' }
  // Approval above covers only report review. Reuse the verified staff/role check,
  // without turning on the global approval guard for other Admin mutations.
  await authorize('/admin/laporan')
  const { data, error } = await supabase.rpc('review_public_report', { p_report_id: id, p_new_status: status, p_reason: normalized })
  if (error) throw error
  if (data !== true) throw { code: 'PGRST116' }
}
export async function approveReportPhoto(attachmentId: string) {
  z.string().uuid().parse(attachmentId)
  await authorize('/admin/laporan')
  const { data, error } = await supabase.functions.invoke('report-publication', { body: { action: 'approve', attachment_id: attachmentId } })
  if (error) {
    const response = (error as { context?: Response }).context
    let code = 'SERVICE_UNAVAILABLE'
    if (response) {
      try {
        const body = await response.clone().json() as { error?: string }
        if (typeof body.error === 'string') code = body.error
      } catch {
        // Keep the repository-standard safe fallback when the response is not JSON.
      }
    }
    throw new ApiError(response?.status ?? 503, code)
  }
  if (!data || data.approved !== true) throw { code: 'PGRST116' }
}
export async function revokeReportPhoto(attachmentId: string) {
  z.string().uuid().parse(attachmentId)
  await authorize('/admin/laporan')
  const { data, error } = await supabase.functions.invoke('report-publication', { body: { action: 'revoke', attachment_id: attachmentId } })
  if (error) {
    const response = (error as { context?: Response }).context
    let code = 'SERVICE_UNAVAILABLE'
    if (response) {
      try {
        const body = await response.clone().json() as { error?: string }
        if (typeof body.error === 'string') code = body.error
      } catch {
        // Keep the repository-standard safe fallback when the response is not JSON.
      }
    }
    throw new ApiError(response?.status ?? 503, code)
  }
  if (!data || data.revoked !== true) throw { code: 'PGRST116' }
}
