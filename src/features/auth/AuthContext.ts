import { createContext } from 'react'
import type { AuthState } from '../../types/auth'
export const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true, error: null, revision: 0 })
