import type { ReactNode } from 'react'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
// Preserve existing page imports while the primitives have one implementation.
export { EmptyState } from '../ui/EmptyState'
export { LoadingState } from '../ui/LoadingState'
export { ErrorState } from '../ui/ErrorState'
export function PageHeader({ title, description, eyebrow = 'REKANSIAGA', children }: { title: string; description: string; eyebrow?: string; children?: ReactNode }) {
  return <header className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p>{children}</header>
}
export function SectionHeading({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="section-heading"><h2>{title}</h2>{children}</div>
}
export function StatusBadge({ children }: { children: ReactNode }) { return <Badge>{children}</Badge> }
export function Panel({ children }: { children: ReactNode }) { return <Card as="section" className="panel">{children}</Card> }
