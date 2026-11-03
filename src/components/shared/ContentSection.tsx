import type { ReactNode } from 'react'
import type { PublicContentState } from '../../types/publicContent'
import { EmptyState } from '../ui/EmptyState'
import { LoadingState } from '../ui/LoadingState'
import { ErrorState } from '../ui/ErrorState'
export function ContentSection({ state = 'unavailable', empty, children, hasData = false, error = 'Informasi tidak dapat dimuat.', onRetry }: { state?: PublicContentState; empty: string; children?: ReactNode; hasData?: boolean; error?: string; onRetry?: () => void }) {
  if (state === 'loading') return <LoadingState/>
  if (state === 'error') return <ErrorState message={error} onRetry={onRetry}/>
  if (state === 'unavailable' || !hasData) return <EmptyState title={empty} description={state === 'ready' ? 'Permintaan berhasil; tidak ada data publik yang cocok untuk ditampilkan.' : 'Sumber data belum terintegrasi. Tidak ada informasi aktual yang ditampilkan.'}/>
  return <>{children}</>
}
