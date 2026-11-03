import { z } from 'zod'
import { publicSupabase } from '../../lib/supabase'
import { parsePoint } from '../../lib/geography'
import { disasterSchema, disasterView } from './contentService'
import { resolveEventImages } from './eventMedia'
export const eventFeedFilters = { regionCode: '', kind: '', status: '', search: '', sort: 'updated' as 'updated' | 'occurred' }
export type EventFeedFilters = typeof eventFeedFilters
const location = z.object({ id: z.string(), label: z.string(), coordinates: z.string().nullable(), is_primary: z.boolean() })
export const eventFeedSchema = z.object({ kinds: z.array(z.string()).default([]), total: z.number().int().min(0), regions_count: z.number().int().min(0), updated_at: z.string().nullable(), items: z.array(disasterSchema.extend({ event_locations: z.array(location) })) })
export async function getPublicEventPage(filters: EventFeedFilters = eventFeedFilters, page = 1, size = 12, signal?: AbortSignal) {
  const { data, error } = await publicSupabase.rpc('public_event_feed_v1', {
    p_region_code: filters.regionCode, p_kind: filters.kind, p_status: filters.status,
    p_search: filters.search, p_sort: filters.sort, p_page: page, p_page_size: size,
  }).abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  const feed = eventFeedSchema.parse(data)
  const images=await resolveEventImages(feed.items.map(row=>row.id))
  return { ...feed, events: feed.items.map(row=>({...disasterView(row),...(images[row.id]?{imageUrl:images[row.id]}:{})})), points: feed.items.flatMap(row => {
    // One curated primary/first valid location per event, not per report.
    const selected = [...row.event_locations].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.id.localeCompare(b.id)).find(item => parsePoint(item.coordinates))
    const point = selected && parsePoint(selected.coordinates)
    return point && selected ? [{ ...point, id: row.id, eventId: row.id, title: row.title, label: selected.label, kind: row.disaster_type, updatedAt: row.updated_at, eventStatus: row.event_status, verificationStatus: row.verification_status, ...(images[row.id]?{imageUrl:images[row.id]}:{}) }] : []
  }) }
}
