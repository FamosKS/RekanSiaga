export class ReviewReasonError extends Error {
  readonly code = '22023'
}

// Match PostgreSQL btrim(value, E' \t\n\r\f\013'), not JS trim(),
// and count Unicode code points like PostgreSQL char_length(), not UTF-16 units.
export function normalizeReviewReason(reason: string | null): string | null {
  if (reason === null) return null
  const trimmed = reason.replace(/^[ \t\n\r\f\v]+|[ \t\n\r\f\v]+$/g, '')
  if (!/\S/u.test(reason)) throw new ReviewReasonError('Alasan yang diisi tidak boleh kosong atau hanya whitespace. Kosongkan kolom untuk mengirim NULL.')
  if (Array.from(trimmed).length > 4000) throw new ReviewReasonError('Alasan maksimal 4000 karakter setelah trim.')
  return trimmed
}
