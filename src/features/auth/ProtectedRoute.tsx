import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ErrorState, LoadingState } from '../../components/shared/PageElements'
export function ProtectedRoute() {
  const { session, user, loading, error } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingState label="Memeriksa sesi..."/>
  if (error) return <ErrorState message={error}/>
  if (!session || !user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }}/>
  return <Outlet/>
}
