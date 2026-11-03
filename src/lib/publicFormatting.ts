export function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Waktu belum tersedia' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(date) + ' WIB'
}
export function safeExternalUrl(value: string | undefined) {
  if (!value) return undefined
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined } catch { return undefined }
}
export function safePhone(value: string) { return /^[+\d][\d ()-]{1,24}$/.test(value) ? 'tel:' + value.replace(/[ ()-]/g, '') : undefined }
