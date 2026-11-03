import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { publicSupabase } from '../../lib/supabase'
export function usePublicConfig() {
  return useQuery({ queryKey: ['public-content', 'config'], enabled: import.meta.env.VITE_PUBLIC_CONFIG_ENABLED === 'true', queryFn: async ({ signal }) => {
    const { data, error } = await publicSupabase.from('app_public_config').select('key,value').abortSignal(signal)
    if (error) throw error
    const rows = z.array(z.object({ key: z.enum(['site_name', 'public_notice']), value: z.string().max(500) })).parse(data)
    return Object.fromEntries(rows.map(row => [row.key, row.value]))
  } })
}
