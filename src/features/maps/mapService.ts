import { z } from 'zod'
import { publicSupabase } from '../../lib/supabase'
import { parsePoint, type Point } from '../../lib/geography'
export type PublicMapLocation = Point & { id: string; title: string; label: string; eventId?: string; kind: string; updatedAt?: string; eventStatus?: string; verificationStatus?: string; imageUrl?: string }
export type PublicVerifiedReport = Point & { id: string; title: string; label: string; kind: string; updatedAt: string; publicPhotoPath?: string }
const locationSchema = z.object({ id: z.string(), event_id: z.string(), label: z.string(), coordinates: z.string().nullable(), disaster_events: z.object({ id: z.string(), title: z.string(), disaster_type: z.string() }) })
export async function listPublicMapLocations(signal?: AbortSignal): Promise<PublicMapLocation[]> {
  const { data, error } = await publicSupabase.from('event_locations').select('id,event_id,label,coordinates,disaster_events!inner(id,title,disaster_type)').not('disaster_events.published_at', 'is', null).in('disaster_events.verification_status', ['source_confirmed', 'staff_verified']).limit(300).abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return z.array(locationSchema).parse(data).flatMap(row => { const point = parsePoint(row.coordinates); return point ? [{ ...point, id: row.id, eventId: row.event_id, title: row.disaster_events.title, label: row.label, kind: row.disaster_events.disaster_type }] : [] })
}
const reliefSchema = z.object({ id: z.string(), name: z.string(), address: z.string().nullable(), location_type: z.string(), coordinates: z.string().nullable(), source_url: z.string().nullable(), updated_at: z.string() })
export async function listPublicRelief(signal?: AbortSignal) {
  const { data, error } = await publicSupabase.from('relief_locations').select('id,name,address,location_type,coordinates,source_url,updated_at').eq('verification_status', 'verified').order('updated_at', { ascending: false }).limit(100).abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return z.array(reliefSchema).parse(data)
}
const verifiedReportSchema = z.object({ id: z.string(), report_type: z.string(), title: z.string(), region_name: z.string().nullable(), coordinates: z.string().nullable(), public_photo_path: z.string().nullable().optional(), updated_at: z.string() })
export async function listPublicVerifiedReports(signal?: AbortSignal): Promise<PublicVerifiedReport[]> {
  const { data, error } = await publicSupabase.rpc('list_public_verified_report_map').abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return z.array(verifiedReportSchema).parse(data).flatMap(row => {
    const point = parsePoint(row.coordinates)
    return             point ? [{ ...point, id: row.id, title: row.title, label: row.region_name ?? 'Wilayah belum ditentukan', kind: row.report_type, updatedAt: row.updated_at, ...(row.public_photo_path ? { publicPhotoPath: row.public_photo_path } : {}) }] : []
  })
}
export function osmUrl(point: Point) { return `https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=14/${point.latitude}/${point.longitude}` }
export function osmEmbed(point: Point) {
  const left = Math.max(-180, point.longitude - 0.04), right = Math.min(180, point.longitude + 0.04), bottom = Math.max(-85, point.latitude - 0.03), top = Math.min(85, point.latitude + 0.03)
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${left},${bottom},${right},${top}`)}&layer=mapnik&marker=${point.latitude}%2C${point.longitude}`
}
