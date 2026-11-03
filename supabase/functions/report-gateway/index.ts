import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { ApiError, type ReportTracking } from '../_shared/reportContract.ts'
import { createReportHandler } from '../_shared/reportHandler.ts'
import { DEV_GLOBAL_QUOTA_HASH, readGatewayConfig, verifiedChallenge } from '../_shared/gatewayConfig.ts'

const runtime = (globalThis as unknown as { Deno: { env: { get: (key: string) => string | undefined }; serve: (handler: (request: Request) => Promise<Response>) => void } }).Deno
const env = (key: string) => runtime.env.get(key) ?? ''
const url = env('SUPABASE_URL')
if (url !== 'https://uiuiouosblyuqgnvfpeh.supabase.co') throw new Error('Wrong development project')
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
const publicKey = env('REPORT_PUBLIC_KEY')
const fetchWithTimeout: typeof fetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12_000) })
const admin = createClient(url, serviceKey || 'not-configured', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchWithTimeout } })
const bucket = 'report-evidence'
const config = readGatewayConfig(env)
const { allowedOrigins, enabled } = config
runtime.serve(createReportHandler({
  allowedOrigins, enabled,
  // Temporary dev-global quota: one fixed DB bucket for all callers. The existing
  // atomic RPC enforces its stricter 5 submit / 30 track per 600-second slot
  // across all workers, in addition to its 100 / 1000 global ceilings.
  // Caller headers, tokens, HMAC rotation and cold starts cannot change this key.
  async clientKey() { return DEV_GLOBAL_QUOTA_HASH },
  async rateLimit(action, key) { const { data, error } = await admin.rpc('report_api_rate_limit', { p_action: action, p_client_hash: key }); if (error) throw new ApiError(503, 'SERVICE_NOT_READY'); return data === true },
  async challenge(token, action) {
    const response = await fetchWithTimeout('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env('TURNSTILE_SECRET_KEY'), response: token }) })
    const result: unknown = await response.json()
    return response.ok && verifiedChallenge(result, action, config.hostnames)
  },
  async upload(path, bytes, mime) { const { error } = await admin.storage.from(bucket).upload(path, bytes, { contentType: mime, upsert: false }); if (error) throw new ApiError(503, 'UPLOAD_FAILED') },
  async cleanup(path) { const { error } = await admin.storage.from(bucket).remove([path]); if (error) throw new ApiError(503, 'CLEANUP_PENDING') },
  async submit(input, attachment) {
    const { data, error } = await admin.rpc('submit_report_v1', { p_report_type: input.report_type, p_title: input.title, p_description: input.description, p_location_description: `Wilayah: ${input.region_name}\n${input.location_description}`, p_latitude: input.latitude ?? null, p_longitude: input.longitude ?? null, p_storage_path: attachment?.path ?? null, p_mime_type: attachment?.mime ?? null, p_file_size: attachment?.size ?? null })
    if (error) throw new ApiError(error.code === '22023' ? 400 : 503, error.code === '22023' ? 'INVALID_INPUT' : 'SUBMISSION_UNCERTAIN')
    const row = Array.isArray(data) ? data[0] : null
    if (!row?.tracking_code || !row?.access_token) throw new ApiError(503, 'SUBMISSION_UNCERTAIN')
    return { tracking_code: row.tracking_code, access_token: row.access_token, expires_in_days: 90 }
  },
  async trackSingle(token) { const { data, error } = await admin.rpc('track_report_v2', { p_access_token: token }); if (error) throw new ApiError(503, 'SERVICE_UNAVAILABLE'); return data as ReportTracking | null },
  async track(code, token) { const { data, error } = await admin.rpc('track_report_v1', { p_tracking_code: code, p_access_token: token }); if (error) throw new ApiError(503, 'SERVICE_UNAVAILABLE'); return data as ReportTracking | null },
  async attachment(id, authorization) {
    const userClient = createClient(url, publicKey, { global: { headers: { Authorization: authorization }, fetch: fetchWithTimeout }, auth: { persistSession: false, autoRefreshToken: false } })
    const { data: identity, error: authError } = await userClient.auth.getUser()
    if (authError || !identity.user) throw new ApiError(401, 'UNAUTHORIZED')
    const { data: role, error: roleError } = await userClient.rpc('has_staff_role', { p_codes: ['super_admin', 'report_verifier'] })
    if (roleError || role !== true) throw new ApiError(403, 'FORBIDDEN')
    const { data: row, error } = await userClient.from('report_attachments').select('storage_path').eq('id', id).maybeSingle()
    if (error || !row || !/^reports\/[\da-f-]{36}\/[\da-f-]{36}\.(jpg|png|webp)$/.test(row.storage_path)) return null
    const { data, error: signingError } = await admin.storage.from(bucket).createSignedUrl(row.storage_path, 60)
    if (signingError) throw new ApiError(503, 'SERVICE_UNAVAILABLE')
    return data.signedUrl
  },
}))
