import { Link } from 'react-router-dom'
export function Breadcrumb({ items }: { items: readonly { label: string; to?: string }[] }) {
  return <nav className="breadcrumb" aria-label="Breadcrumb"><ol><li><Link to="/">Beranda</Link></li>{items.map((item, index) => <li key={index}>{item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>
}
