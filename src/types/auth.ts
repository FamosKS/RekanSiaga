import type { Session, User } from '@supabase/supabase-js'
export const staffRoleCodes = ['super_admin', 'information_manager', 'report_verifier', 'mitigation_editor'] as const
export type StaffRole = typeof staffRoleCodes[number]
export type StaffAccess = { userId: string; displayName: string; roles: StaffRole[] }
export type AuthState = { session: Session | null; user: User | null; loading: boolean; error: string | null; revision: number }
