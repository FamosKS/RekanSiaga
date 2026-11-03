import { useId, useState } from 'react'
import { useDraftState } from '../drafts/useDraftState'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useAuth } from '../../hooks/useAuth'
import { AdminPageHeader } from '../../components/shared/AdminPageHeader'
import { DataTable } from '../../components/shared/DataTable'
import { Pagination } from '../../components/shared/Pagination'
import { Panel } from '../../components/shared/PageElements'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { contentError } from '../content/contracts'
import { RegionSelector } from '../regions/RegionSelector'
import { resource, type DataField, type DataRow, type ResourceName } from './dataResources'
import { deleteResource, editorValues, listResource, pageSize, references, isAdminWriteApproved, saveResource } from './adminDataService'
import { EventImagePicker } from '../content/EventImagePicker'
import { eventMediaEnabled, revokeEventImage, uploadEventImage } from '../content/eventMedia'

function ReferenceField({ field, value, onChange, error, disabled }: { field: DataField; value: string; onChange: (value: string) => void; error?: string; disabled?: boolean }) {
  const id = useId()
  const query = useQuery({ queryKey: ['admin-content', 'refs', field.reference], queryFn: ({ signal }) => references(field.reference!, signal), staleTime: 15_000 })
  return <><Input label={field.label} list={id} value={value} required={field.required} disabled={disabled} error={error} onChange={event => onChange(event.target.value)} hint={query.isError ? contentError(query.error) : 'Pilih UUID dari direktori (maks. 300 pilihan) atau masukkan UUID valid yang sudah ada.'}/><datalist id={id}>{query.data?.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</datalist></>
}
function RegionReferenceField({ field, value, onChange, error, disabled }: { field: DataField; value: string; onChange: (value: string) => void; error?: string; disabled?: boolean }) {
  return <RegionSelector label={field.label} value={value || undefined} required={field.required} disabled={disabled} onChange={selection => onChange(selection?.id ?? '')} error={error} hint={field.hint ?? 'Nama ditampilkan; UUID hanya digunakan sebagai foreign key database.'}/>
}
function display(value: unknown) { return value == null ? '—' : typeof value === 'boolean' ? value ? 'Ya' : 'Tidak' : typeof value === 'object' ? JSON.stringify(value) : String(value) }
export function ResourceModulesPage({ names }: { names: readonly ResourceName[] }) {
  const [name, setName] = useState(names[0])
  return <>{names.length > 1 && <div className="action-row" aria-label="Modul data">{names.map(item => <Button key={item} variant={name === item ? 'primary' : 'secondary'} onClick={() => setName(item)}>{resource(item).title}</Button>)}</div>}<RemoteResourcePage key={name} name={name}/></>
}
export function RemoteResourcePage({ name }: { name: ResourceName }) {
  const config = resource(name)
  const writesApproved = isAdminWriteApproved(config.path, name)
  const { user, revision } = useAuth()
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [editor, setEditor, clearEditor] = useDraftState('resource:'+name+':editor', false)
  const [existing, setExisting, clearExisting] = useDraftState<DataRow | undefined>('resource:'+name+':existing', undefined)
  const [values, setValues, clearValues, hasDraft] = useDraftState<Record<string, string>>('resource:'+name+':values', {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [removing, setRemoving] = useState<DataRow>()
  const [notice, setNotice] = useState('')
  const [eventImage, setEventImage] = useState<File | null>(null)
  const [removeEventImage, setRemoveEventImage] = useState(false)
  const [eventImageProgress, setEventImageProgress] = useState<number | null>(null)
  const query = useQuery({ queryKey: ['admin-content', name, user?.id, revision, page, debouncedSearch, status], queryFn: ({ signal }) => listResource(name, { page, search: debouncedSearch, status, signal }), retry: false, refetchInterval: 30_000, refetchOnWindowFocus: true, refetchOnReconnect: 'always' })
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ['admin-content'] }), client.invalidateQueries({ queryKey: ['public-content'] })]) }
  const save = useMutation({ mutationFn: async () => {
    const saved = await saveResource(name, values, existing)
    if (name === 'disasters' && saved && typeof saved === 'object') {
      const row = saved as DataRow
      setExisting(row)
      if (eventImage) { setEventImageProgress(0); await uploadEventImage(eventImage,row,setEventImageProgress) }
      else if (removeEventImage && existing?.id && typeof row.updated_at === 'string') await revokeEventImage(String(existing.id),row.updated_at)
    }
    return saved
  }, onSuccess: async () => { clearEditor(); clearExisting(); clearValues(); setEventImage(null); setRemoveEventImage(false); setEventImageProgress(null); setNotice('Perubahan dikonfirmasi database dev.'); await refresh() }, onError: error => { if (error instanceof z.ZodError) setErrors(Object.fromEntries(error.issues.map(issue => [String(issue.path[0]), issue.message]))) } })
  const remove = useMutation({ mutationFn: (row: DataRow) => deleteResource(name, row), onSuccess: async () => { setRemoving(undefined); setNotice('Penghapusan dikonfirmasi database dev.'); await refresh() } })
  function open(row?: DataRow) { if (hasDraft) { if (existing?.[config.key] === row?.[config.key]) { setEditor(true); return }; if (!window.confirm('Ganti draf yang sedang diedit?')) return }; setExisting(row); setValues(editorValues(name, row)); setErrors({}); setNotice(''); setEventImage(null); setRemoveEventImage(false); setEventImageProgress(null); save.reset(); setEditor(true) }
  const labels = new Map(config.fields.map(field => [field.key, field.label]))
  const columns = config.columns.split(',').filter(key => !['coordinates', 'author_id', 'recorded_by'].includes(key))
  const statusOptions = config.fields.find(field => field.key === config.status)?.options ?? []
  return <>
    <AdminPageHeader title={config.title} description="Sumber data: rekansiaga-dev. Izin efektif diperiksa oleh database; tidak ada penyimpanan draf di localStorage.">{!config.readOnly && <Button onClick={() => open()}>Tambah {config.title.toLowerCase()}</Button>}{hasDraft && !editor && <Button variant="secondary" onClick={() => setEditor(true)}>Lanjutkan draf</Button>}</AdminPageHeader>
    {!writesApproved && !config.readOnly && <Alert tone="warning">Penulisan remote terkunci sampai cakupan operator dan kompatibilitas backend dev disetujui. Daftar tetap dibaca dari database.</Alert>}
    {name === 'queue' && <Alert>Antrean bukan bukti push terkirim. Worker/provider delivery belum dikonfigurasi atau diuji.</Alert>}
    {name === 'settings' && <Alert>Hanya site_name dan public_notice diusulkan sebagai teks publik. Aktivasi memerlukan persetujuan allowlist pada paket backend; kredensial tidak dapat diedit dari halaman ini.</Alert>}
    {notice && <p role="status">{notice}</p>}
    <Panel><div className="admin-toolbar"><Input label={`Cari ${labels.get(config.search) ?? config.search}`} type="search" value={search} maxLength={120} onChange={event => { setSearch(event.target.value); setPage(1) }}/>{statusOptions.length > 0 && <Select label="Filter status" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">Semua</option>{statusOptions.map(value => <option key={value}>{value}</option>)}</Select>}<Button variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch() }}>Muat ulang</Button></div>
      <DataTable title={config.title} rows={query.data?.rows ?? []} rowKey={row => String(row[config.key])} loading={query.isPending} error={query.isError ? contentError(query.error) : undefined} emptyDescription="Tidak ada baris yang cocok atau terlihat oleh role Anda." columns={[...columns.map(key => ({ key, label: labels.get(key) ?? key, render: (row: DataRow) => <span className="data-cell">{display(row[key])}</span> })), ...(!config.readOnly && !config.appendOnly ? [{ key: 'actions', label: 'Tindakan', render: (row: DataRow) => <div className="action-row"><Button variant="secondary" size="sm" onClick={() => open(row)}>Edit</Button>{name !== 'settings' && !config.deleteDisabled && <Button variant="danger" size="sm" disabled={!writesApproved} onClick={() => { remove.reset(); setRemoving(row) }}>Hapus</Button>}</div> }] : [])]}/>
      <Pagination page={page} totalPages={Math.ceil((query.data?.count ?? 0) / pageSize)} onChange={setPage}/>
    </Panel>
    <Dialog open={editor} onClose={() => { if (!save.isPending) setEditor(false) }} title={`${existing ? 'Edit' : 'Tambah'} ${config.title.toLowerCase()}`} description="Penyimpanan hanya menyatakan sukses setelah respons database diterima.">{editor && <form className="form-stack" noValidate onSubmit={event => { event.preventDefault(); if (writesApproved && !save.isPending) { setErrors({}); save.mutate() } }}><fieldset className="form-stack" disabled={save.isPending} style={{ border: 0, padding: 0 }}>{config.fields.map(field => {
      const change = (value: string) => setValues(current => ({ ...current, [field.key]: value }))
      const shared = { label: field.label, hint: field.hint, required: field.required, value: values[field.key] ?? '', error: errors[field.key], onChange: (event: { target: { value: string } }) => change(event.target.value) }
      if (field.reference === 'regions') return <RegionReferenceField key={field.key} field={field} value={values[field.key] ?? ''} onChange={change} error={errors[field.key]} disabled={save.isPending}/>
      if (field.reference) return <ReferenceField key={field.key} field={field} value={values[field.key] ?? ''} onChange={change} error={errors[field.key]} disabled={save.isPending}/>
      if (field.type === 'textarea') return <Textarea key={field.key} {...shared} maxLength={20000}/>
      if (field.type === 'boolean') return <label className="check" key={field.key}><input type="checkbox" checked={values[field.key] === 'true'} onChange={event => change(String(event.target.checked))}/>{field.label}</label>
      if (field.type === 'select') return <Select key={field.key} {...shared} disabled={name === 'settings' && !!existing}><option value="">Pilih</option>{field.options?.map(value => <option key={value}>{value}</option>)}</Select>
      return <Input key={field.key} {...shared} type={field.type ?? 'text'} maxLength={500}/>
    })}{name === 'disasters' && <EventImagePicker eventId={typeof existing?.id === 'string' ? existing.id : undefined} file={eventImage} onFile={setEventImage} removeImage={removeEventImage} onRemove={() => setRemoveEventImage(true)} disabled={save.isPending} progress={eventImageProgress}/>}</fieldset>{save.isError && <Alert tone="danger">{save.error instanceof Error && !(save.error instanceof z.ZodError) ? save.error.message : contentError(save.error)}</Alert>}<Button type="submit" loading={save.isPending} disabled={!writesApproved || (!!eventImage || removeEventImage) && !eventMediaEnabled}>Simpan ke dev</Button></form>}</Dialog>
    <Dialog open={!!removing} onClose={() => { if (!remove.isPending) setRemoving(undefined) }} title="Konfirmasi penghapusan" description="Hanya baris terpilih yang dihapus. Relasi yang masih dipakai akan ditolak database; tidak ada cascade otomatis dari UI."><p>{removing ? display(removing[config.search]) : ''}</p>{remove.isError && <Alert tone="danger">{contentError(remove.error)}</Alert>}<Button variant="danger" disabled={!writesApproved} loading={remove.isPending} onClick={() => { if (removing && !remove.isPending) remove.mutate(removing) }}>Konfirmasi hapus</Button></Dialog>
  </>
}
