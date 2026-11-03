import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AuthContext } from '../../features/auth/AuthContext'
import { observeAuthentication } from '../../features/auth/authLifecycle'
import { useAccessibilityPreferences } from '../../hooks/useAccessibilityPreferences'
import type { AuthState } from '../../types/auth'
import { setDraftOwner } from '../../features/drafts/draftVault'
export function AppProviders({ children }: { children: ReactNode }) {
  useAccessibilityPreferences()
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 0, refetchInterval: false, refetchIntervalInBackground: false, refetchOnWindowFocus: 'always', refetchOnReconnect: 'always' } } }))
  const [auth, setAuth] = useState<AuthState>({ session: null, user: null, loading: true, error: null, revision: 0 })
  // One timer per app, rather than one timer for each observer of the same query.
  // QueryClient deduplicates active requests and skips disabled/inactive queries.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void queryClient.refetchQueries({ queryKey: ['public-content'], type: 'active' }, { cancelRefetch: false })
      }
    }, 20_000)
    return () => clearInterval(timer)
  }, [queryClient])
  useEffect(() => observeAuthentication(supabase.auth, setAuth, () => {
    void queryClient.cancelQueries({ queryKey: ['staff-access'] })
    queryClient.removeQueries({ queryKey: ['staff-access'] })
    void queryClient.cancelQueries({ queryKey: ['admin-content'] })
    queryClient.removeQueries({ queryKey: ['admin-content'] })
    void queryClient.invalidateQueries({ queryKey: ['public-content'] })
  }), [queryClient])
  useEffect(() => {
    // Keep draft ownership and logout cleanup active globally, independently
    // from where the recovery controls are displayed.
    if (!auth.loading && !auth.error) setDraftOwner(auth.user?.id ?? 'public')
  }, [auth.user?.id, auth.loading, auth.error])
  return <QueryClientProvider client={queryClient}><AuthContext.Provider value={auth}>{children}</AuthContext.Provider></QueryClientProvider>
}
