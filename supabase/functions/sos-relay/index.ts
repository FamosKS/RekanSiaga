import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

type Action = 'submit' | 'track' | 'revoke' | 'admin_list' | 'admin_detail' | 'admin_update'
type Body = Record<string, unknown> & { action?: Action }
const runtime = (globalThis as unknown as { Deno: { env: { get: (key: string) => string | undefined }; serve: (handler: (request: Request) => Promise<Response>) => void } }).Deno
const env = (key: string) => runtime.env.get(key) ?? ''
const url = env('SUPABASE_URL')
if (url !== 'https://uiuiouosblyuqgnvfpeh.supabase.co') throw new Error('Wrong development project')
const anonKey = env('SUPABASE_ANON_KEY')
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
const hmacKey = env('SOS_CREDENTIAL_HMAC_KEY')
const allowedOrigins = new Set(env('SOS_ALLOWED_ORIGINS').split(',').map(value => value.trim()).filter(Boolean))
const db = createClient(url, serviceKey || 'not-configured', { auth: { persistSession: false, autoRefreshToken: false } })
const safeHeaders = (origin: string | null) => ({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...(origin && allowedOrigins.has(origin) ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}) })
const respond = (status: number, body: unknown, origin: string | null) => new Response(JSON.stringify(body), { status, headers: safeHeaders(origin) })
const validSecret = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
const validUuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)
async function hmac(value: string) {
  if (hmacKey.length < 32) throw new Error('not-ready')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(hmacKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
function validPayload(value: unknown): value is Body { return !!value && typeof value === 'object' && !Array.isArray(value) }
async function rate(action: 'submit' | 'track') {
  const { data, error } = await db.rpc('sos_consume_quota_v1', { p_action: action, p_limit: action === 'submit' ? 100 : 300 })
  if (error || data !== true) return false
  return true
}
async function staff(request: Request) {
  const authorization = request.headers.get('authorization') ?? ''
  if (!/^Bearer\s+\S+$/i.test(authorization)) return null
  const client = createClient(url, anonKey || 'not-configured', { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } })
  const { data: identity, error } = await client.auth.getUser()
  if (error || !identity.user) return null
  const { data: allowed, error: roleError } = await client.rpc('has_staff_role', { p_codes: ['super_admin', 'report_verifier'] })
  if (roleError || allowed !== true) return null
  return client
}
runtime.serve(async request => {
  const origin = request.headers.get('origin')
  if (request.method === 'OPTIONS') {
    if (!origin || !allowedOrigins.has(origin)) return new Response(null, { status: 403, headers: safeHeaders(null) })
    return new Response(null, { status: 204, headers: { ...safeHeaders(origin), 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info', 'access-control-max-age': '600' } })
  }
  // Native Flutter clients commonly omit Origin; browser origins remain strictly allowlisted.
  if (request.method !== 'POST' || (origin !== null && !allowedOrigins.has(origin))) return respond(404, { error: 'NOT_FOUND' }, null)
  let body: Body
  try { const raw = await request.text(); if (raw.length > 12_000) return respond(413, { error: 'INVALID_REQUEST' }, origin); const parsed: unknown = JSON.parse(raw); if (!validPayload(parsed)) return respond(400, { error: 'INVALID_REQUEST' }, origin); body = parsed }
  catch { return respond(400, { error: 'INVALID_REQUEST' }, origin) }
  if (body.action === 'submit') {
    if (!validSecret(body.idempotency_key) || !validSecret(body.access_credential) || body.consent !== true || !validPayload(body.report)) return respond(400, { error: 'INVALID_REQUEST' }, origin)
    const idempotencyKey = body.idempotency_key as string
    const accessCredential = body.access_credential as string
    const report = body.report as Record<string, unknown>
    if (typeof report.description !== 'string' || report.description.trim().length < 10 || report.description.length > 2000) return respond(400, { error: 'INVALID_REQUEST' }, origin)
    if (!await rate('submit')) return respond(429, { error: 'RATE_LIMITED' }, origin)
    try {
      const [idempotencyHash, credentialVerifier] = await Promise.all([hmac(idempotencyKey), hmac(accessCredential)])
      const { data, error } = await db.rpc('sos_submit_v1', { p_idempotency_hash: idempotencyHash, p_credential_verifier: credentialVerifier, p_payload: report })
      if (error || !Array.isArray(data) || !data[0]) return respond(503, { error: 'SUBMISSION_UNCERTAIN' }, origin)
      return respond(201, data[0], origin)
    } catch { return respond(503, { error: 'SERVICE_UNAVAILABLE' }, origin) }
  }
  if (body.action === 'track') {
    if (!validSecret(body.access_credential)) return respond(404, { error: 'NOT_FOUND' }, origin)
    const accessCredential = body.access_credential as string
    if (!await rate('track')) return respond(429, { error: 'NOT_FOUND' }, origin)
    try {
      const verifier = await hmac(accessCredential)
      const { data, error } = await db.rpc('sos_track_v1', { p_credential_verifier: verifier })
      if (error || !Array.isArray(data)) return respond(503, { error: 'SERVICE_UNAVAILABLE' }, origin)
      if (!data[0]) return respond(404, { error: 'NOT_FOUND' }, origin)
      return respond(200, data[0], origin)
    } catch { return respond(503, { error: 'SERVICE_UNAVAILABLE' }, origin) }
  }
  if (body.action === 'revoke') {
    if (!validSecret(body.access_credential)) return respond(200, { accepted: true }, origin)
    if (!await rate('track')) return respond(429, { error: 'SERVICE_BUSY' }, origin)
    try { const verifier = await hmac(body.access_credential as string); await db.rpc('sos_revoke_v1', { p_credential_verifier: verifier }); return respond(200, { accepted: true }, origin) }
    catch { return respond(503, { error: 'SERVICE_UNAVAILABLE' }, origin) }
  }
  const user = await staff(request)
  if (!user) return respond(401, { error: 'UNAUTHORIZED' }, origin)
  if (body.action === 'admin_list') {
    const { data, error } = await user.rpc('sos_admin_list_v1')
    return error ? respond(503, { error: 'SERVICE_UNAVAILABLE' }, origin) : respond(200, { requests: data ?? [] }, origin)
  }
  if (body.action === 'admin_detail' && validUuid(body.request_id)) {
    const { data, error } = await user.rpc('sos_admin_detail_v1', { p_request_id: body.request_id })
    if (error) return respond(503, { error: 'SERVICE_UNAVAILABLE' }, origin)
    if (!Array.isArray(data) || !data[0]) return respond(404, { error: 'NOT_FOUND' }, origin)
    const { history, ...row } = data[0]
    return respond(200, { request: row, history: history ?? [] }, origin)
  }
  if (body.action === 'admin_update' && validUuid(body.request_id) && typeof body.expected_updated_at === 'string' && typeof body.status === 'string' && typeof body.note === 'string') {
    const { data, error } = await user.rpc('sos_admin_update_v1', { p_request_id: body.request_id, p_expected_updated_at: body.expected_updated_at, p_status: body.status, p_note: body.note.trim() || null })
    if (error) return respond(error.code === '40001' ? 409 : error.code === '42501' ? 403 : 400, { error: error.code === '40001' ? 'CONFLICT' : 'UPDATE_REJECTED' }, origin)
    return respond(200, { updated_at: data }, origin)
  }
  return respond(400, { error: 'INVALID_REQUEST' }, origin)
})
