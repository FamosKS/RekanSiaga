import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
type EmptyStateProps = { title?: string; description?: string; action?: ReactNode }
export function EmptyState({ title = 'Data belum tersedia', description = 'Sumber data belum terintegrasi. Informasi akan tampil setelah integrasi tersedia.', action }: EmptyStateProps) {
  return <div className="rs-state"><span className="rs-state__icon"><Inbox size={26} aria-hidden="true"/></span><h3>{title}</h3><p>{description}</p>{action && <div className="rs-state__action">{action}</div>}</div>
}
