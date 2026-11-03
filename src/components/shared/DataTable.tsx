import type { ReactNode } from 'react'
import { EmptyState, ErrorState, LoadingState } from './PageElements'
export type TableColumn<T> = { key: string; label: string; render: (row: T) => ReactNode }
export function DataTable<T>({ title, columns, rows, rowKey, loading, error, emptyDescription }: { title: string; columns: readonly TableColumn<T>[]; rows: readonly T[]; rowKey: (row: T) => string; loading?: boolean; error?: string; emptyDescription?: string }) {
  if (loading) return <LoadingState/>
  if (error) return <ErrorState message={error}/>
  return <><div className="table-scroll" role="region" aria-label={title} tabIndex={0}><table><caption className="sr-only">{title}</caption><thead><tr>{columns.map(column => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={rowKey(row)}>{columns.map(column => <td key={column.key}>{column.render(row)}</td>)}</tr>)}</tbody></table></div>{!rows.length && <EmptyState description={emptyDescription}/>}</>
}
