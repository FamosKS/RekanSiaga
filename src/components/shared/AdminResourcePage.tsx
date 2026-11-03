import { useState, type FormEvent } from 'react'
import { Dialog } from '../ui/Dialog'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Textarea } from '../ui/Textarea'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Panel, EmptyState } from './PageElements'
import { AdminPageHeader } from './AdminPageHeader'
import { DataTable } from './DataTable'
import type { ResourceConfig } from '../../features/admin/resourceConfig'
export function AdminResourcePage({ config }: { config: ResourceConfig }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [editor, setEditor] = useState(false)
  const [preview, setPreview] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const activeFilters = search || Object.values(filters).some(Boolean)
  function review(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPreview(true) }
  return <><AdminPageHeader title={config.title} description={config.description}><Button onClick={() => { setPreview(false); setEditor(true) }}>{config.action}</Button></AdminPageHeader><Alert tone="warning">Data belum terintegrasi. Draf hanya ada selama halaman ini terbuka; penyimpanan dan tindakan server belum tersedia.</Alert><Panel><div className="section-heading"><h2>Daftar {config.title.toLowerCase()}</h2><Badge>Backend belum tersedia</Badge></div><div className="admin-toolbar"><Input label="Pencarian" type="search" placeholder={`Cari ${config.title.toLowerCase()}`} value={search} onChange={event => setSearch(event.target.value)}/>{config.filters?.map(filter => <Select key={filter.label} label={filter.label} value={filters[filter.label] ?? ''} onChange={event => setFilters({ ...filters, [filter.label]: event.target.value })}><option value="">Semua</option>{filter.options.map(option => <option key={option}>{option}</option>)}</Select>)}{config.title === 'Kejadian bencana' && <Input label="Filter wilayah" value={filters.region ?? ''} onChange={event => setFilters({ ...filters, region: event.target.value })}/>}<Button variant="secondary" onClick={() => { setSearch(''); setFilters({}) }} disabled={!activeFilters}>Reset filter</Button></div><p className="muted" role="status">{activeFilters ? 'Filter diterapkan pada daftar lokal. Sumber data belum tersedia.' : 'Daftar menunggu integrasi layanan baca.'}</p><DataTable<Record<string, string>> title={config.title} columns={config.columns.map(label => ({ key: label, label, render: row => row[label] }))} rows={[]} rowKey={row => row.id} emptyDescription={activeFilters ? 'Belum ada data untuk ditampilkan dengan filter ini. Data backend belum terintegrasi.' : undefined}/></Panel><Panel><h2>Detail {config.title.toLowerCase()}</h2><EmptyState title="Belum ada data terpilih" description="Detail, status, dan riwayat akan tersedia setelah layanan baca terotorisasi terintegrasi. Draf lokal dapat ditinjau melalui pratinjau editor."/>{config.title === 'Manajemen staf' && <div className="action-row" aria-label="Role yang didukung">{config.filters?.[0].options.map(role => <Badge key={role}>{role}</Badge>)}</div>}</Panel><Dialog open={editor} onClose={() => setEditor(false)} title={preview ? `Pratinjau · ${config.title}` : config.action} description="Draf lokal, belum disimpan. Tutup halaman akan menghapus draf.">{preview ? <><Badge tone="warning">Pratinjau draf lokal · belum terverifikasi</Badge><dl className="admin-preview">{config.fields.map(field => <div key={field.name}><dt>{field.label}</dt><dd>{values[field.name] || 'Belum diisi'}</dd></div>)}</dl>{values.checklist && <fieldset className="checklist"><legend>Pratinjau checklist lokal</legend>{values.checklist.split('\n').filter(Boolean).map((item, index) => <label className="check" key={index}><input type="checkbox"/>{item}</label>)}</fieldset>}<div className="action-row"><Button variant="secondary" onClick={() => setPreview(false)}>Edit draf</Button><Button onClick={() => { setEditor(false); setConfirm(true) }}>{config.confirm}</Button></div></> : <form className="form-stack" onSubmit={review}>{config.fields.map(field => {
    const shared = { label: field.label, required: field.required, hint: field.hint, value: values[field.name] ?? '', onChange: (event: { target: { value: string } }) => setValues({ ...values, [field.name]: event.target.value }), maxLength: field.type === 'textarea' ? 20000 : 500 }
    return field.type === 'select' ? <Select key={field.name} {...shared}><option value="">Pilih {field.label.toLowerCase()}</option>{field.options?.map(option => <option key={option}>{option}</option>)}</Select> : field.type === 'textarea' ? <Textarea key={field.name} {...shared}/> : <Input key={field.name} {...shared} type={field.type ?? 'text'} pattern={field.type === 'tel' ? '[+]?[0-9 ]{3,30}' : field.required ? '.*\\S.*' : undefined}/>
  })}<Alert>Input manual merupakan draf yang belum terverifikasi. Nilai status yang belum memiliki kontrak database tidak ditetapkan dari form ini.</Alert><Button type="submit">Pratinjau draf</Button><Button disabled>Simpan ke server belum tersedia</Button></form>}</Dialog><ConfirmDialog open={confirm} onClose={() => { setConfirm(false); setEditor(true) }} title={config.confirm} description="Periksa draf sebelum integrasi backend tersedia."/></>
}

