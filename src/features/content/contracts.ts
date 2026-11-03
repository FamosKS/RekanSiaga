import { z } from 'zod'

export const featuredArticleEnabled = import.meta.env.VITE_FEATURED_ARTICLE_ENABLED === 'true'
export const articleColumns = 'id,author_id,title,slug,summary,content,source_url,publication_status,published_at,created_at,updated_at'
export const publicationStatuses = ['draft', 'published', 'archived'] as const
export const articleRowSchema = z.object({
  id: z.string().uuid(), author_id: z.string().uuid().nullable(), title: z.string(), slug: z.string(),
  summary: z.string().nullable(), content: z.string(), source_url: z.string().nullable(),
  publication_status: z.enum(publicationStatuses), published_at: z.string().nullable(),
  created_at: z.string(), updated_at: z.string(), cover_image_path: z.string().nullable().optional(),
})
export type ArticleRow = z.infer<typeof articleRowSchema>
export const featuredArticleSchema = z.object({
  id: z.string().uuid(), slug: z.string(), title: z.string(), summary: z.string().nullable(),
  cover_image_path: z.string().nullable(), published_at: z.string(), updated_at: z.string(), is_featured: z.boolean(),
})
export type FeaturedArticleRow = z.infer<typeof featuredArticleSchema>
export const articleInputSchema = z.object({
  title: z.string().trim().min(5, 'Judul minimal 5 karakter.').max(180),
  slug: z.string().trim().min(3).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug memakai huruf kecil, angka, dan tanda hubung.'),
  summary: z.string().trim().min(10, 'Ringkasan minimal 10 karakter.').max(1000),
  content: z.string().trim().min(20, 'Isi minimal 20 karakter.').max(20000),
  source_url: z.union([z.literal(''), z.string().trim().url('Masukkan URL sumber.').refine(value => /^https?:\/\//i.test(value), 'Sumber harus HTTP/HTTPS.')]),
  publication_status: z.enum(publicationStatuses),
  cover_image_path: z.union([z.literal(''), z.string().regex(/^article-media\/articles\/[\da-f-]{36}\/[\da-f-]{36}\.png$/), z.string().url().refine(value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && ![...url.searchParams.keys()].some(key => /^(token|access_token|secret|apikey|api_key)$/i.test(key)) } catch { return false } }, 'Gunakan URL sampul HTTPS publik tanpa credential/token.')]).optional(),
})
export type ArticleInput = z.infer<typeof articleInputSchema>
export function articlePayload(input: ArticleInput, publishedAt?: string | null) {
  const parsed = articleInputSchema.parse(input)
  const { cover_image_path, ...rest } = parsed
  return { ...rest, source_url: rest.source_url || null, ...(cover_image_path === undefined ? {} : { cover_image_path: cover_image_path || null }), published_at: parsed.publication_status === 'published' ? publishedAt || new Date().toISOString() : publishedAt || null }
}
export function contentError(error: unknown): string {
  if (error instanceof z.ZodError) return 'Schema/API dev mengembalikan bentuk data yang belum kompatibel. Diperlukan pemeriksaan operator.'
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
  if (code === 'APPROVAL_REQUIRED') return 'Penulisan remote belum disetujui operator.'
  if (code === '23503') return 'Relasi masih dipakai atau pengenal terkait tidak ditemukan. Tinjau data terkait.'
  if (code === '22023') return 'Input atau transisi status ditolak backend. Muat ulang data dan periksa isian.'
  if (code === 'SCHEMA_MISMATCH' || code === 'PGRST202') return 'Kontrak backend/RPC dev belum tersedia atau belum kompatibel.'
  if (code === '42501') return 'Akses ditolak oleh grants/RLS dev. Hubungi operator; keamanan tidak diubah.'
  if (code === '23505') return 'Nilai unik sudah dipakai (slug, kode, atau urutan). Pilih nilai lain.'
  if (code === 'PGRST116') return 'Data berubah, tidak ditemukan, atau tidak diizinkan oleh RLS. Muat ulang daftar.'
  if (code === '40001') return 'Artikel sudah berubah sejak editor dibuka. Muat ulang daftar sebelum mengedit.'
  if (code === 'PGRST204' || code === '42P01' || code === '42703' || code === 'PGRST205') return 'Schema/API dev belum kompatibel dengan kontrak. Diperlukan pemeriksaan operator.'
  return 'Operasi gagal. Periksa koneksi dan otorisasi dev, lalu coba kembali.'
}
