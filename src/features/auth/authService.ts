import { supabase } from '../../lib/supabase'
import { staffRoleCodes, type StaffAccess, type StaffRole } from '../../types/auth'
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function isRoleId(value: unknown): value is string | number { return (typeof value === 'string' && value.length > 0) || (typeof value === 'number' && Number.isSafeInteger(value)) }
function isStaffRole(value: unknown): value is StaffRole { return staffRoleCodes.some(role => role === value) }
const accessError = () => new Error('Profil atau role staf tidak dapat diverifikasi. Akses ditolak. Periksa koneksi, grants, dan RLS melalui administrator.')
// Auth verifies identity; filters narrow requests, while database RLS must enforce ownership.
export async function getVerifiedStaffAccess(signal?: AbortSignal): Promise<StaffAccess | null> {
  const { data: identity, error: identityError } = await supabase.auth.getUser()
  if (identityError || !identity.user) throw accessError()
  const userId = identity.user.id
  let profileQuery = supabase.from('staff_profiles').select('user_id,display_name,is_active').eq('user_id', userId)
  if (signal) profileQuery = profileQuery.abortSignal(signal)
  const { data: profile, error: profileError } = await profileQuery.maybeSingle()
  if (profileError) throw accessError()
  if (profile === null) return null
  if (!isRecord(profile) || profile.user_id !== userId || typeof profile.is_active !== 'boolean') throw accessError()
  if (!profile.is_active) return null
  let assignmentQuery = supabase.from('staff_role_assignments').select('staff_id,role_id').eq('staff_id', userId)
  if (signal) assignmentQuery = assignmentQuery.abortSignal(signal)
  const { data: assignments, error: assignmentError } = await assignmentQuery
  if (assignmentError || !Array.isArray(assignments)) throw accessError()
  if (!assignments.length) return null
  if (!assignments.every(item => isRecord(item) && item.staff_id === userId && isRoleId(item.role_id))) throw accessError()
  const roleIds = [...new Set(assignments.map(item => String(item.role_id)))]
  let roleQuery = supabase.from('roles').select('id,code,name').in('id', roleIds)
  if (signal) roleQuery = roleQuery.abortSignal(signal)
  const { data: roleRows, error: roleError } = await roleQuery
  if (roleError || !Array.isArray(roleRows)) throw accessError()
  // Partial results can indicate RLS hiding a related row; never silently grant a subset.
  if (new Set(roleRows.map(item => isRecord(item) ? String(item.id) : '')).size !== roleIds.length || roleRows.length !== roleIds.length || !roleRows.every(item => isRecord(item) && roleIds.includes(String(item.id)) && isStaffRole(item.code))) throw accessError()
  const roles = [...new Set(roleRows.map(item => item.code as StaffRole))]
  return roles.length ? { userId, displayName: typeof profile.display_name === 'string' ? profile.display_name : '', roles } : null
}
export const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password })
export const signOut = () => supabase.auth.signOut()
