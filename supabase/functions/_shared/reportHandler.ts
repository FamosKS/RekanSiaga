import { decodeTrackingCredential, encodeTrackingCredential } from './trackingCredential.ts'
import { ApiError, decodePhoto, maxRequestBytes, parseReportRequest, type ReportReceipt, type ReportTracking, type SubmitReport } from './reportContract.ts'
export type ReportGateway = {
  allowedOrigins: readonly string[]; enabled: boolean;
  clientKey: (request: Request) => Promise<string>;
  rateLimit: (action: string, key: string) => Promise<boolean>;
  challenge: (token: string, action: string) => Promise<boolean>;
  upload: (path: string, bytes: Uint8Array, mime: string) => Promise<void>;
  cleanup: (path: string) => Promise<void>;
  submit: (input: SubmitReport, attachment: { path: string; mime: string; size: number } | null) => Promise<ReportReceipt>;
  track: (code: string, token: string) => Promise<ReportTracking | null>;
  trackSingle?: (token: string) => Promise<ReportTracking | null>;
  attachment: (id: string, authorization: string) => Promise<string | null>;
}
export function createReportHandler(gateway: ReportGateway) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin')
    const allowed = !origin || gateway.allowedOrigins.includes(origin)
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...(origin && allowed ? { 'Access-Control-Allow-Origin': origin } : {}), 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
    if (!allowed) return json({ error: { code: 'ORIGIN_DENIED' } }, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return json({ error: { code: 'METHOD_NOT_ALLOWED' } }, 405)
    if (!gateway.enabled) return json({ error: { code: 'SERVICE_NOT_READY' } }, 503)
    try {
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new ApiError(415, 'JSON_REQUIRED')
      if (Number(request.headers.get('Content-Length') ?? 0) > maxRequestBytes) throw new ApiError(413, 'BODY_TOO_LARGE')
      const reader = request.body?.getReader()
      if (!reader) throw new ApiError(400, 'INVALID_INPUT')
      const chunks: Uint8Array[] = []; let size = 0
      try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > maxRequestBytes) { await reader.cancel(); throw new ApiError(413, 'BODY_TOO_LARGE') } chunks.push(value) } } finally { reader.releaseLock() }
      const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
      let value: unknown; try { value = JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new ApiError(400, 'INVALID_INPUT') }
      const input = parseReportRequest(value)
      if (input.action === 'attachment') {
        const authorization = request.headers.get('Authorization') ?? ''
        if (!/^Bearer\s+\S+$/i.test(authorization)) throw new ApiError(401, 'UNAUTHORIZED')
        const url = await gateway.attachment(input.attachment_id, authorization)
        if (!url) throw new ApiError(404, 'NOT_FOUND')
        return json({ signed_url: url, expires_in_seconds: 60 })
      }
      const key = await gateway.clientKey(request)
      // Durable DB quota precedes third-party verification and all data operations.
      // The dev adapter supplies a fixed shared bucket, never a caller header.
      if (!await gateway.rateLimit(input.action, key)) throw new ApiError(429, 'RATE_LIMITED')
      if (!await gateway.challenge(input.captcha_token, input.action)) throw new ApiError(403, 'CHALLENGE_FAILED')
      if (input.action === 'track') { const data = 'tracking_credential' in input ? await (() => { if (!gateway.trackSingle) throw new ApiError(503, 'SERVICE_NOT_READY'); return gateway.trackSingle(decodeTrackingCredential(input.tracking_credential)) })() : await gateway.track(input.tracking_code, input.access_token); if (!data) throw new ApiError(404, 'NOT_FOUND'); return json(data) }
      let attachment: { path: string; mime: string; size: number } | null = null
      if (input.photo) {
        const photo = decodePhoto(input.photo)
        const extension = input.photo.mime_type === 'image/jpeg' ? 'jpg' : input.photo.mime_type === 'image/png' ? 'png' : 'webp'
        const path = `reports/${crypto.randomUUID()}/${crypto.randomUUID()}.${extension}`
        await gateway.upload(path, photo, input.photo.mime_type)
        attachment = { path, mime: input.photo.mime_type, size: photo.length }
      }
      try { const receipt = await gateway.submit(input, attachment); return json({ ...receipt, tracking_credential: encodeTrackingCredential(receipt.access_token) }, 201) }
      catch (error) {
        // Only clean up on a definite SQL rejection; transport errors may have committed.
        if (attachment && error instanceof ApiError && error.status === 400) await gateway.cleanup(attachment.path).catch(() => undefined)
        throw error
      }
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 503
      return json({ error: { code: error instanceof ApiError ? error.code : 'SERVICE_UNAVAILABLE' } }, status)
    }
  }
}
