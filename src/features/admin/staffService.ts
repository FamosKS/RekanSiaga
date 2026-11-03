import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { staffRoleCodes } from '../../types/auth'
import { authorize } from './adminDataService'

export const staffInputSchema = z.object({ user_id: z.string().uuid(), display_name: z.string().trim().min(2).max(100), is_active: z.boolean(), roles: z.array(z.enum(staffRoleCodes)).min(1).max(4) })
export type StaffInput = z.infer<typeof staffInputSchema>
const staffSchema = z.object({ user_id: z.string().uuid(), display_name: z.string(), is_active: z.boolean(), staff_role_assignments: z.array(z.object({ roles: z.object({ code: z.enum(staffRoleCodes) }).nullable() })) })
export async function listStaff(signal?: AbortSignal) {
  await authorize('/admin/staf')
  let query = supabase.from('staff_profiles').select('user_id,display_name,is_active,staff_role_assignments(roles(code))').order('display_name').limit(200)
  if (signal) query = query.abortSignal(signal)
  const { data, error } = await query
  if (error) throw error
  return z.array(staffSchema).parse(data).map(row => ({ user_id: row.user_id, display_name: row.display_name, is_active: row.is_active, roles: row.staff_role_assignments.flatMap(assignment => assignment.roles ? [assignment.roles.code] : []) }))
}
export async function saveStaff(input: StaffInput) {
  const value = staffInputSchema.parse(input)
  await authorize('/admin/staf', true)
  const { data, error } = await supabase.rpc('admin_manage_staff', { p_user_id: value.user_id, p_display_name: value.display_name, p_is_active: value.is_active, p_roles: value.roles })
  if (error) throw error
  if (data !== true) throw { code: 'PGRST116' }
}
