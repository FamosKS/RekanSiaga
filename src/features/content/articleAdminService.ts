import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { getVerifiedStaffAccess } from '../auth/authService'
import { canAccessAdminPath } from '../auth/permissions'
import { articleColumns, articlePayload, articleRowSchema, featuredArticleEnabled, type ArticleInput, type ArticleRow } from './contracts'

// Operational approval guard only. Database grants/RLS remain authoritative.
export const articleWritesApproved = import.meta.env.VITE_DEV_ARTICLE_WRITES_APPROVED === 'true' || import.meta.env.VITE_DEV_REMOTE_WRITES_APPROVED === 'true' || import.meta.env.VITE_DEV_CONTENT_WRITES_ENABLED === 'true' && import.meta.env.VITE_SUPABASE_URL === 'https://uiuiouosblyuqgnvfpeh.supabase.co'
async function authorizeWrite() {
  if (!articleWritesApproved) throw new Error('Penulisan remote belum disetujui operator.')
  const access = await getVerifiedStaffAccess()
  if (!access || !canAccessAdminPath(access.roles, '/admin/artikel')) throw { code: '42501' }
  return access
}
export async function listAdminArticles(signal?: AbortSignal, { page = 1, search = '', status = '' }: { page?: number; search?: string; status?: string } = {}): Promise<{ rows: ArticleRow[]; count: number }> {
  let query = supabase.from('articles').select(`${articleColumns},cover_image_path`, { count: 'exact' }).order('updated_at', { ascending: false }).range((page - 1) * 20, page * 20 - 1)
  if (search) query = query.ilike('title', `%${search.replace(/[\\%_]/g, '\\$&')}%`)
  if (status) query = query.eq('publication_status', status)
  const { data, count, error } = await query.abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  const rows = z.array(articleRowSchema).parse(data)
  return { rows, count: count ?? rows.length }
}
export async function saveRemoteArticle(input: ArticleInput, existing?: ArticleRow) {
  const payload = articlePayload(input, existing?.published_at)
  const access = await authorizeWrite()
  const request = existing
    ? supabase.from('articles').update(payload).eq('id', existing.id).eq('updated_at', existing.updated_at)
    : supabase.from('articles').insert({ ...payload, author_id: access.userId })
  const { data, error } = await request.select(`${articleColumns},cover_image_path`).single()
  if (error) throw error
  return articleRowSchema.parse(data)
}
export async function deleteRemoteArticle(existing: ArticleRow) {
  await authorizeWrite()
  const { data, error } = await supabase.from('articles').delete().eq('id', existing.id).eq('updated_at', existing.updated_at).select('id').single()
  if (error) throw error
  if (data.id !== existing.id) throw { code: 'PGRST116' }
}

export async function archiveRemoteArticle(existing: ArticleRow) {
  await authorizeWrite()
  const {data,error}=await supabase.from('articles').update({publication_status:'archived'}).eq('id',existing.id).eq('updated_at',existing.updated_at).select(`${articleColumns},cover_image_path`).single()
  if(error)throw error
  return articleRowSchema.parse(data)
}

export async function setFeaturedArticle(article: { id: string; updated_at: string; publication_status?: string; published_at?: string | null }, enabled: boolean) {
  if (!featuredArticleEnabled) throw new Error('Informasi Utama belum diaktifkan operator setelah kontrak Supabase tersedia.')
  await authorizeWrite()
  if (enabled && (article.publication_status !== 'published' || !article.published_at)) throw { code: '22023' }
  const { data, error } = await supabase.rpc('admin_set_featured_article_v1', {
    p_article_id: enabled ? article.id : null,
    p_expected_updated_at: article.updated_at,
  })
  if (error) throw error
  return z.object({ article_id: z.string().uuid().nullable(), is_featured: z.boolean() }).parse(data)
}

export async function getAdminArticle(id: string) {
  const access=await getVerifiedStaffAccess()
  if(!access||!canAccessAdminPath(access.roles,'/admin/artikel'))throw {code:'42501'}
  const {data,error}=await supabase.from('articles').select(`${articleColumns},cover_image_path`).eq('id',z.string().uuid().parse(id)).single()
  if(error)throw error
  return articleRowSchema.parse(data)
}
