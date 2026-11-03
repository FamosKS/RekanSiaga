import type { ReactNode } from 'react'
import { Breadcrumb } from './Breadcrumb'
export function AdminPageHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <><Breadcrumb items={[{ label: 'Administrasi', to: '/admin' }, { label: title }]}/><header className="admin-page-heading"><div><span className="eyebrow">RUANG ADMINISTRASI</span><h1>{title}</h1><p className="muted">{description}</p></div>{children}</header></>
}
