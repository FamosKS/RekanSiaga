import { z } from 'zod'
import { publicSupabase } from '../../lib/supabase'

export const regionLevels = ['province', 'regency', 'city', 'district', 'village'] as const
export type RegionLevel = typeof regionLevels[number]
// Database types regency and city occupy the same administrative level.
export const regionSteps = ['province', 'regency_city', 'district', 'village'] as const
export type RegionStep = typeof regionSteps[number]
export type RegionOption = { id: string; parent_id: string | null; code: string; name: string; region_type: RegionLevel }
const regionSchema = z.object({ id: z.string().uuid(), parent_id: z.string().uuid().nullable(), code: z.string(), name: z.string(), region_type: z.enum(regionLevels) })

export async function listRegions(parentId: string | null, level: RegionLevel | RegionStep, signal?: AbortSignal): Promise<RegionOption[]> {
  let query = publicSupabase.from('regions').select('id,parent_id,code,name,region_type')
  query = level === 'regency_city' ? query.in('region_type', ['regency', 'city']) : query.eq('region_type', level)
  query = query.order('name').limit(2000)
  query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null)
  const { data, error } = await query.abortSignal(signal ?? new AbortController().signal)
  if (error) throw error
  return z.array(regionSchema).parse(data)
}

export async function getRegionPath(id: string, signal?: AbortSignal): Promise<RegionOption[]> {
  const path: RegionOption[] = []
  const seen = new Set<string>()
  let current: string | null = id
  while (current) {
    if (seen.has(current) || path.length >= regionSteps.length) throw new Error('Hierarki wilayah tidak valid.')
    seen.add(current)
    const { data, error } = await publicSupabase.from('regions').select('id,parent_id,code,name,region_type').eq('id', current).abortSignal(signal ?? new AbortController().signal).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Wilayah tidak ditemukan.')
    const region = regionSchema.parse(data)
    path.unshift(region)
    current = region.parent_id
  }
  return path
}
