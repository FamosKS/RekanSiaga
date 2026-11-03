import { z } from 'zod'
import { publicSupabase } from '../../lib/supabase'
import { alertIsCurrent, prioritizeAlerts, safeRoute, unseenAlerts } from './alertPolicy'
export { alertIsCurrent, prioritizeAlerts, unseenAlerts }

export const locationAlertsEnabled = import.meta.env.VITE_LOCATION_ALERTS_ENABLED === 'true'
const uuid = z.string().uuid()
export const publicAlertSchema = z.object({
  id: uuid, event_id: uuid, title: z.string().min(1).max(180), description: z.string().min(1).max(2000),
  disaster_type: z.string().min(1).max(80), severity: z.enum(['information', 'watch', 'warning', 'emergency']),
  condition_summary: z.string().max(500).nullable(), region_name: z.string().min(1).max(180),
  issuer_kind: z.enum(['staff', 'official_source']), issuer_name: z.string().min(1).max(180), source_url: z.string().url().refine(value => value.startsWith('https://')),
  starts_at: z.string().datetime({ offset: true }), expires_at: z.string().datetime({ offset: true }),
  source_updated_at: z.string().datetime({ offset: true }).nullable(), updated_at: z.string().datetime({ offset: true }),
  version: z.number().int().positive(), estimated_arrival_at: z.string().datetime({ offset: true }).nullable(),
  action_guidance: z.string().min(1).max(2000), evacuation_route: z.string().max(1000).nullable(),
  evacuation_source_url: z.string().url().refine(value => value.startsWith('https://')).nullable(), evacuation_verified_at: z.string().datetime({ offset: true }).nullable(),
})
export type PublicAlert = z.infer<typeof publicAlertSchema>

export async function listActiveAlerts(regionId: string, signal?: AbortSignal): Promise<PublicAlert[]> {
  const selectedRegion = uuid.parse(regionId)
  const { data, error } = await publicSupabase.rpc('public_active_disaster_alerts_v1', { p_region_id: selectedRegion }).abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return z.array(publicAlertSchema).parse(data)
}

export const safeEvacuationRoute = safeRoute
