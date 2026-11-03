import { supabase } from '../../lib/supabase'
import { getVerifiedStaffAccess } from '../auth/authService'
import { canAccessAdminPath } from '../auth/permissions'
import { resource, type DataRow, type ResourceName } from './dataResources'
import { pointInput, pointPayload } from '../../lib/geography'
import { resolveEventImages } from '../content/eventMedia'

export const remoteWritesApproved = import.meta.env.VITE_DEV_REMOTE_WRITES_APPROVED === 'true'
const contentWritesApproved = import.meta.env.VITE_DEV_CONTENT_WRITES_ENABLED === 'true' && import.meta.env.VITE_SUPABASE_URL === 'https://uiuiouosblyuqgnvfpeh.supabase.co'
const contentPaths = new Set(['/admin/artikel', '/admin/kejadian', '/admin/panduan', '/admin/kontak-darurat', '/admin/lokasi-bantuan', '/admin/sumber-data'])
export function isAdminWriteApproved(path: string, name?: ResourceName) {
  if (name === 'alerts') return import.meta.env.VITE_DEV_ALERT_WRITES_ENABLED === 'true' && import.meta.env.VITE_SUPABASE_URL === 'https://uiuiouosblyuqgnvfpeh.supabase.co'
  return remoteWritesApproved || contentWritesApproved && contentPaths.has(path)
}
export const pageSize = 20
export async function authorize(path: string, write = false, name?: ResourceName) {
  if (write && !isAdminWriteApproved(path, name)) throw { code: 'APPROVAL_REQUIRED' }
  const access = await getVerifiedStaffAccess()
  if (!access || !canAccessAdminPath(access.roles, path)) throw { code: '42501' }
  return access
}
export async function listResource(name: ResourceName, { page = 1, search = '', status = '', signal }: { page?: number; search?: string; status?: string; signal?: AbortSignal } = {}): Promise<{ rows: DataRow[]; count: number }> {
  const config = resource(name)
  await authorize(config.path)
  let query = supabase.from(config.table).select(config.columns, { count: 'exact' }).order(config.order, { ascending: ['name', 'organization_name', 'key', 'label', 'sort_order'].includes(config.order) }).range((page - 1) * pageSize, page * pageSize - 1)
  if (name === 'settings') query = query.in('key', ['site_name', 'public_notice'])
  if (search.trim()) query = query.ilike(config.search, `%${search.trim().replace(/[\\%_]/g, '\\$&')}%`)
  if (status && config.status) query = query.eq(config.status, status)
  if (signal) query = query.abortSignal(signal)
  const { data, count, error } = await query
  if (error) throw error
  if (!Array.isArray(data)) throw { code: 'SCHEMA_MISMATCH' }
  const rows = data as unknown as DataRow[]
  if (name === 'disasters') {
    const images = await resolveEventImages(rows.map(row=>String(row.id)),true)
    return { rows: rows.map(row=>({...row,image_url:images[String(row.id)]??null})), count: count ?? data.length }
  }
  return { rows, count: count ?? data.length }
}
export async function references(table: 'regions' | 'data_sources' | 'disaster_events' | 'mitigation_guides', signal?: AbortSignal) {
  const title = ['disaster_events', 'mitigation_guides'].includes(table) ? 'title' : 'name'
  let query = supabase.from(table).select(`id,${title}`).order(title).limit(300)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map(row => { const item = row as unknown as DataRow; return { id: String(item.id), label: String(item[title]) } })
}
export function editorValues(name: ResourceName, row?: DataRow): Record<string, string> {
  return Object.fromEntries(resource(name).fields.map(field => {
    const value = row?.[field.key]
    return [field.key, field.key === 'coordinates' ? pointInput(value) : field.type === 'boolean' ? String(value ?? false) : field.type === 'datetime-local' && typeof value === 'string' ? localDate(value) : value == null ? field.type === 'number' ? '0' : '' : String(value)]
  }))
}
function localDate(value: string) { const date = new Date(value); return Number.isNaN(+date) ? '' : new Date(+date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
export function parseEditor(name: ResourceName, values: Record<string, string>): DataRow {
  const config = resource(name)
  const payload = Object.fromEntries(config.fields.map(field => {
    const value = values[field.key] ?? ''
    return [field.key, field.key === 'coordinates' ? pointPayload(value) : field.type === 'boolean' ? value === 'true' : field.type === 'number' ? value.trim() ? Number(value) : NaN : field.type === 'datetime-local' ? value ? new Date(value).toISOString() : null : value.trim() || (field.required ? '' : null)]
  }))
  return config.schema.parse(payload)
}
export async function saveResource(name: ResourceName, values: Record<string, string>, existing?: DataRow) {
  const config = resource(name)
  if (config.readOnly) throw { code: '42501' }
  const payload = parseEditor(name, values)
  const actor = await authorize(config.path, true, name)
  if (name === 'queue') {
    if (existing) throw { code: '42501' }
    const { data, error } = await supabase.rpc('admin_queue_notification', { p_title: payload.title, p_body: payload.body, p_event_id: payload.event_id })
    if (error) throw error
    if (!data) throw { code: 'PGRST116' }
    return data
  }
  if (name === 'settings') {
    const { data, error } = await supabase.rpc('admin_set_public_setting', { p_key: payload.key, p_value: payload.value, p_expected_updated_at: existing?.updated_at ?? null })
    if (error) throw error
    if (!data) throw { code: 'PGRST116' }
    return data
  }
  if (!existing && name === 'guides') payload.author_id = actor.userId
  if (!existing && name === 'updates') payload.recorded_by = actor.userId
  let query = existing ? supabase.from(config.table).update(payload).eq(config.key, existing[config.key]) : supabase.from(config.table).insert(payload)
  if (existing && config.version) query = query.eq(config.version, existing[config.version])
  const { data, error } = await query.select(config.columns).single()
  if (error) throw error
  if (!data) throw { code: 'PGRST116' }
  return data
}
export async function deleteResource(name: ResourceName, row: DataRow) {
  const config = resource(name)
  if (config.readOnly || config.appendOnly || name === 'settings') throw { code: '42501' }
  if (config.deleteDisabled) throw { code: '42501' }
  await authorize(config.path, true, name)
  let query = supabase.from(config.table).delete().eq(config.key, row[config.key])
  if (config.version) query = query.eq(config.version, row[config.version])
  const { data, error } = await query.select(config.key).single()
  if (error) throw error
  if (!data) throw { code: 'PGRST116' }
}
