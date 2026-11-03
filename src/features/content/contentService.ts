import { resolveArticleCover } from './articleMedia'
import { z } from 'zod'
import { publicSupabase as supabase } from '../../lib/supabase'
import type { Article, Disaster, EmergencyContact, Guide } from '../../types/publicContent'
import { articleColumns, articleRowSchema, featuredArticleSchema, type ArticleRow, type FeaturedArticleRow } from './contracts'
import { resolveEventImages } from './eventMedia'

function source(url: string | null, fallback = 'Redaksi RekanSiaga') {
  try { if (url && /^https?:/.test(new URL(url).protocol)) return { name: new URL(url).hostname, url } } catch { /* show attribution without a link */ }
  return { name: fallback }
}
export function articleView(row: ArticleRow): Article {
  return { slug: row.slug, title: row.title, category: 'Artikel', publishedAt: row.published_at ?? '', source: source(row.source_url), excerpt: row.summary ?? '', paragraphs: row.content.split(/\n\s*\n/).filter(Boolean), coverUrl: row.cover_image_path ?? undefined, coverAlt: row.title }
}
export async function listPublishedArticles(signal?: AbortSignal): Promise<Article[]> {
  const { data, error } = await supabase.from('articles').select(`${articleColumns},cover_image_path`).eq('publication_status', 'published').not('published_at', 'is', null).order('published_at', { ascending: false }).order('id').limit(6).abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return Promise.all(z.array(articleRowSchema).parse(data).map(async row => ({...articleView(row),coverUrl:await resolveArticleCover(row.cover_image_path,false,row.slug)})))
}
export async function getHomeFeaturedArticle(): Promise<(FeaturedArticleRow & { coverUrl?: string }) | null> {
  const { data, error } = await supabase.rpc('public_home_featured_article_v1')
  if (error) throw error
  const row = z.array(featuredArticleSchema).parse(data)[0]
  return row ? { ...row, coverUrl: await resolveArticleCover(row.cover_image_path,false,row.slug) } : null
}
export async function getPublishedArticle(slug: string, signal?: AbortSignal): Promise<Article | null> {
  const { data, error } = await supabase.from('articles').select(`${articleColumns},cover_image_path`).eq('slug', slug).eq('publication_status', 'published').not('published_at', 'is', null).abortSignal(signal ?? new AbortController().signal).maybeSingle()
  if (error) throw error
  if(!data)return null
  const row=articleRowSchema.parse(data)
  return {...articleView(row),coverUrl:await resolveArticleCover(row.cover_image_path,false,row.slug)}
}
const guideSchema = z.object({ id: z.string(), title: z.string(), disaster_type: z.string(), content: z.string(), source_url: z.string().nullable(), mitigation_checklist_items: z.array(z.object({ phase: z.enum(['before', 'during', 'after']), instruction: z.string(), sort_order: z.number(), is_active: z.boolean() })) })
export async function listPublishedGuides(signal?: AbortSignal, id?: string): Promise<Guide[]> {
  let query = supabase.from('mitigation_guides').select('id,title,disaster_type,content,source_url,mitigation_checklist_items(phase,instruction,sort_order,is_active)').eq('publication_status', 'published').order('updated_at', { ascending: false }).limit(100).abortSignal(signal ?? new AbortController().signal)
  if (id) query = query.eq('id', z.string().uuid().parse(id))
  const { data, error } = await query
  if (error) throw error
  return z.array(guideSchema).parse(data).map(row => ({ id: row.id, title: row.title, category: row.disaster_type, source: source(row.source_url), phases: [{ title: 'Materi panduan', text: row.content }], checklist: row.mitigation_checklist_items.filter(item => item.is_active).sort((a, b) => ['before', 'during', 'after'].indexOf(a.phase) - ['before', 'during', 'after'].indexOf(b.phase) || a.sort_order - b.sort_order).map(item => `${({ before: 'Sebelum', during: 'Saat', after: 'Sesudah' })[item.phase]}: ${item.instruction}`) }))
}
const regionSchema = z.object({ name: z.string() }).nullable()
export const disasterSchema = z.object({ id: z.string(), title: z.string(), description: z.string().nullable(), disaster_type: z.string(), occurred_at: z.string().nullable(), source_updated_at: z.string().nullable(), updated_at: z.string(), event_status: z.enum(['unknown', 'ongoing', 'resolved']), verification_status: z.enum(['unconfirmed', 'source_confirmed', 'staff_verified']), event_updates: z.array(z.object({ description: z.string(), source_updated_at: z.string().nullable(), recorded_at: z.string() })), regions: regionSchema, data_sources: z.object({ name: z.string(), source_type: z.string(), official_url: z.string().nullable() }).nullable() })
export const eventStatusLabels = { unknown: 'Belum diketahui', ongoing: 'Berlangsung', resolved: 'Selesai' }
export async function listPublishedDisasters(signal?: AbortSignal, id?: string): Promise<Disaster[]> {
  let query = supabase.from('disaster_events').select('id,title,description,disaster_type,occurred_at,source_updated_at,updated_at,event_status,verification_status,regions(name),data_sources(name,source_type,official_url),event_updates(description,source_updated_at,recorded_at)').not('published_at', 'is', null).in('verification_status', ['source_confirmed', 'staff_verified']).order('updated_at', { ascending: false }).limit(100).abortSignal(signal ?? new AbortController().signal)
  if (id) query = query.eq('id', z.string().uuid().parse(id))
  const { data, error } = await query
  if (error) throw error
  const rows=z.array(disasterSchema).parse(data)
  const images=await resolveEventImages(rows.map(row=>row.id))
  return rows.map(row=>({...disasterView(row),...(images[row.id]?{imageUrl:images[row.id]}:{})}))
}
export const disasterView = (row: z.infer<typeof disasterSchema>): Disaster => ({ id: row.id, title: row.title, description: row.description ?? '', category: row.disaster_type, region: row.regions?.name ?? 'Wilayah belum tersedia', location: row.regions?.name ?? 'Lokasi belum tersedia', occurredAt: row.occurred_at ?? '', updatedAt: [row.updated_at, row.source_updated_at, ...row.event_updates.map(item => item.recorded_at)].filter((value): value is string => !!value).sort((a,b) => Date.parse(b)-Date.parse(a))[0], source: source(row.data_sources?.official_url ?? null, row.data_sources?.name ?? 'Sumber belum tersedia'), origin: row.data_sources?.source_type === 'official_api' ? 'official' : row.data_sources?.source_type === 'manual' ? 'staff' : 'unknown', verificationLabel: ({ unconfirmed: 'Belum dikonfirmasi', source_confirmed: 'Dikonfirmasi sumber', staff_verified: 'Diverifikasi staf' })[row.verification_status], statusLabel: eventStatusLabels[row.event_status], updates: row.event_updates.map(item => ({ date: item.source_updated_at ?? item.recorded_at, text: item.description })).sort((a, b) => Date.parse(a.date) - Date.parse(b.date)) })
const contactSchema = z.object({ id: z.string(), organization_name: z.string(), service_type: z.string(), phone_number: z.string().nullable(), official_url: z.string().nullable(), verified_at: z.string().nullable(), regions: regionSchema })
export async function listVerifiedContacts(signal?: AbortSignal): Promise<EmergencyContact[]> {
  const { data, error } = await supabase.from('emergency_contacts').select('id,organization_name,service_type,phone_number,official_url,verified_at,regions(name)').eq('is_verified', true).eq('is_active', true).order('organization_name').limit(100).abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return z.array(contactSchema).parse(data).map(row => ({ id: row.id, name: row.organization_name, category: row.service_type, region: row.regions?.name ?? 'Cakupan belum tersedia', phone: row.phone_number ?? '', source: source(row.official_url, row.organization_name), verifiedAt: row.verified_at ?? '' }))
}

export async function listPublishedArticlePage(page=1,search='',signal?:AbortSignal) {
  let query=supabase.from('articles').select(`${articleColumns},cover_image_path`,{count:'exact'}).eq('publication_status','published').not('published_at','is',null).order('published_at',{ascending:false}).order('id').range((page-1)*6,page*6-1)
  if(search.trim())query=query.ilike('title',`%${search.trim().replace(/[\\%_]/g,'\\$&')}%`)
  const {data,count,error}=await query.abortSignal(signal??new AbortController().signal)
  if(error)throw error
  const rows=z.array(articleRowSchema).parse(data)
  return {total:count??0,articles:await Promise.all(rows.map(async row=>({...articleView(row),coverUrl:await resolveArticleCover(row.cover_image_path,false,row.slug)})))}
}
