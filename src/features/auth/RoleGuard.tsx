import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getVerifiedStaffAccess } from './authService'
import { canAccessAdminPath } from './permissions'
import { StaffAccessContext } from './StaffAccessContext'
import { ErrorState, LoadingState } from '../../components/shared/PageElements'
export function RoleGuard() {
  const { session, user, loading, error, revision } = useAuth()
  const location = useLocation()
  const access = useQuery({
    queryKey: ['staff-access', user?.id, revision],
    queryFn: async ({ signal }) => {
      const result = await getVerifiedStaffAccess(signal)
      if (result && result.userId !== user?.id) throw new Error('Identitas sesi berubah. Akses ditolak.')
      return result
    },
    enabled: !!session && !!user && !loading && !error,
    retry: false, staleTime: 0, gcTime: 0,
    refetchOnMount: 'always', refetchOnWindowFocus: 'always', refetchOnReconnect: 'always', refetchInterval: 60_000,
  })
  if (loading) return <LoadingState label="Memeriksa sesi..."/>
  if (error) return <ErrorState message={error}/>
  if (!session || !user) return <Navigate to="/admin/login" replace/>
  // A background role check must not unmount the authenticated workspace.
  // Errors, revocation and writes still require verified server authorization.
  if (access.isPending) return <LoadingState label="Memeriksa otorisasi..."/>
  if (access.isError) return <ErrorState message="Otorisasi tidak dapat diverifikasi. Akses ditolak. Periksa koneksi atau hubungi administrator." onRetry={() => { void access.refetch() }}/>
  if (!access.data || access.data.userId !== user.id || !canAccessAdminPath(access.data.roles, location.pathname)) return <Navigate to="/403" replace/>
  return <StaffAccessContext.Provider value={access.data}><Outlet/></StaffAccessContext.Provider>
}
