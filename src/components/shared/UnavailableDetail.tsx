import { isValidIdentifier } from '../../lib/routeParams'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, Panel, EmptyState } from './PageElements'
export function UnavailableDetail({ title, backTo, backLabel, parameter = 'id', fields }: { title: string; backTo: string; backLabel: string; parameter?: string; fields: string[] }) {
  const params = useParams()
  const value = params[parameter]
  const valid = isValidIdentifier(value)
  return <><nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">Beranda</Link><span>/</span><Link to={backTo}>{backLabel}</Link><span>/ Detail</span></nav><PageHeader title={valid ? title : 'Parameter tidak valid'} description={valid ? 'Konten belum dapat ditampilkan karena layanan data belum terintegrasi.' : 'Tautan tidak memiliki pengenal yang valid.'}/><Panel><EmptyState title={valid ? 'Detail belum tersedia' : 'Periksa kembali tautan Anda'}/><dl className="metadata">{fields.map(field => <div key={field}><dt>{field}</dt><dd>Belum tersedia</dd></div>)}</dl><Link className="button secondary" to={backTo}>Kembali ke {backLabel.toLowerCase()}</Link></Panel></>
}
