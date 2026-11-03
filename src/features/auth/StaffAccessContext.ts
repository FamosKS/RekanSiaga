import { createContext, useContext } from 'react'
import type { StaffAccess } from '../../types/auth'
export const StaffAccessContext = createContext<StaffAccess | null>(null)
export const useStaffAccess = () => useContext(StaffAccessContext)
