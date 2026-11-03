import { publicationCors } from '../_shared/publicationCors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const runtime = (globalThis as unknown as { Deno: { env: { get: (key: string) => string | undefined }; serve: (handler: (request: Request) => Promise<Response>) => void } }).Deno
const env = (key: string) => runtime.env.get(key) ?? ''
const url = env('SUPABASE_URL')
const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY')
const sourceBucket = 'report-evidence'
const publicBucket = 'public-report-evidence'
const cors = publicationCors
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors })

function uuid(value: unknown): value is string {
  return typeof value === 'string' && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value)
}
function fail(status: number): never { throw new Error(`${status}`) }
function sanitizeJpeg(input: Uint8Array) {
  const output = [input.slice(0, 2)]
  let offset = 2
  while (offset < input.length) {
    if (input[offset] !== 0xff) fail(400)
    const marker = input[offset + 1]
    if (marker === 0xda || marker === 0xd9) { output.push(input.slice(offset)); break }
    if (marker === 0xff) { offset++; continue }
    if (offset + 4 > input.length) fail(400)
    const length = (input[offset + 2] << 8) | input[offset + 3]
    if (length < 2 || offset + 2 + length > input.length) fail(400)
    const keep = marker === 0xe1 || marker === 0xed || marker === 0xfe ? false : true
    if (keep) output.push(input.slice(offset, offset + 2 + length))
    offset += 2 + length
  }
  return concat(output)
}
function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((size, part) => size + part.length, 0))
  let offset = 0
  for (const part of parts) { result.set(part, offset); offset += part.length }
  return result
}
function ascii(input: Uint8Array, offset: number, length: number) { return String.fromCharCode(...input.slice(offset, offset + length)) }
function sanitizePng(input: Uint8Array) {
  const parts = [input.slice(0, 8)]
  let offset = 8
  while (offset + 12 <= input.length) {
    const length = new DataView(input.buffer, input.byteOffset + offset, 4).getUint32(0)
    const end = offset + 12 + length
    if (end > input.length) fail(400)
    const type = ascii(input, offset + 4, 4)
    if (!['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME', 'pHYs'].includes(type)) parts.push(input.slice(offset, end))
    offset = end
    if (type === 'IEND') break
  }
  if (offset !== input.length) fail(400)
  return concat(parts)
}
function sanitizeWebp(input: Uint8Array) {
  const parts = [input.slice(0, 12)]
  let offset = 12
  while (offset + 8 <= input.length) {
    const size = new DataView(input.buffer, input.byteOffset + offset + 4, 4).getUint32(0, true)
    const end = offset + 8 + size + (size & 1)
    if (end > input.length) fail(400)
    const type = ascii(input, offset, 4)
    if (type !== 'EXIF' && type !== 'XMP ') parts.push(input.slice(offset, end))
    offset = end
  }
  if (offset !== input.length) fail(400)
  return concat(parts)
}
function sanitize(input: Uint8Array, mime: string) {
  if (mime === 'image/jpeg' && input[0] === 0xff && input[1] === 0xd8) return sanitizeJpeg(input)
  if (mime === 'image/png' && ascii(input, 0, 8) === '\x89PNG\r\n\x1a\n') return sanitizePng(input)
  if (mime === 'image/webp' && ascii(input, 0, 4) === 'RIFF' && ascii(input, 8, 4) === 'WEBP') return sanitizeWebp(input)
  fail(400)
}

runtime.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)
  try {
    const authorization = request.headers.get('Authorization')
    if (!authorization?.match(/^Bearer\s+\S+$/i)) return json({ error: 'UNAUTHORIZED' }, 401)
    const body = await request.json() as { action?: string; attachment_id?: unknown }
    if (!uuid(body.attachment_id) || !['approve', 'revoke'].includes(body.action ?? '')) return json({ error: 'INVALID_INPUT' }, 400)
    const publicKey = request.headers.get('apikey') ?? env('SUPABASE_PUBLISHABLE_KEY') ?? env('SUPABASE_ANON_KEY')
    if (!publicKey) return json({ error: 'SERVICE_NOT_READY' }, 503)
    const user = createClient(url, publicKey, { global: { headers: { Authorization: authorization, apikey: publicKey } }, auth: { persistSession: false, autoRefreshToken: false } })
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: identity, error: identityError } = await user.auth.getUser()
    if (identityError || !identity.user) return json({ error: 'UNAUTHORIZED' }, 401)
    const { data: staff, error: roleError } = await user.rpc('has_staff_role', { p_codes: ['super_admin', 'report_verifier'] })
    if (roleError || staff !== true) return json({ error: 'FORBIDDEN' }, 403)
    if (body.action === 'revoke') {
      const { error } = await user.rpc('revoke_report_public_photo', { p_attachment_id: body.attachment_id })
      if (error) return json({ error: 'REVOKE_FAILED' }, 400)
      return json({ revoked: true })
    }
    const { data: attachment, error: attachmentError } = await user.from('report_attachments').select('storage_path,mime_type').eq('id', body.attachment_id).maybeSingle()
    if (attachmentError || !attachment || !['image/jpeg', 'image/png', 'image/webp'].includes(attachment.mime_type)) return json({ error: 'NOT_FOUND' }, 404)
    const { data: original, error: downloadError } = await admin.storage.from(sourceBucket).download(attachment.storage_path)
    if (downloadError || !original || original.size > 5 * 1024 * 1024) return json({ error: 'SOURCE_UNAVAILABLE' }, 503)
    const safe = sanitize(new Uint8Array(await original.arrayBuffer()), attachment.mime_type)
    const extension = attachment.mime_type === 'image/jpeg' ? 'jpg' : attachment.mime_type === 'image/png' ? 'png' : 'webp'
    const path = `${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await admin.storage.from(publicBucket).upload(path, safe, { contentType: attachment.mime_type, upsert: false })
    if (uploadError) return json({ error: 'PUBLIC_COPY_FAILED' }, 503)
    const { error: approvalError } = await user.rpc('approve_report_public_photo', { p_attachment_id: body.attachment_id, p_public_storage_path: `public-report-evidence/${path}`, p_mime_type: attachment.mime_type })
    if (approvalError) {
      await admin.storage.from(publicBucket).remove([path])
      return json({ error: 'APPROVAL_FAILED' }, 400)
    }
    return json({ approved: true })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (['400', '404'].includes(code)) return json({ error: code === '400' ? 'INVALID_PHOTO' : 'NOT_FOUND' }, Number(code))
    return json({ error: 'SERVICE_UNAVAILABLE' }, 503)
  }
})
