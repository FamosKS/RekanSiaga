import { useState } from 'react'
import { useDraftState } from '../drafts/useDraftState'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminPageHeader } from '../../components/shared/AdminPageHeader'
import { DataTable } from '../../components/shared/DataTable'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { staffRoleCodes } from '../../types/auth'
import { contentError } from '../content/contracts'
import { remoteWritesApproved } from './adminDataService'
import { listStaff, saveStaff, staffInputSchema, type StaffInput } from './staffService'
const blank: StaffInput = { user_id: '', display_name: '', is_active: true, roles: [] }
export function StaffWorkspace() {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['admin-content', 'staff'], queryFn: ({ signal }) => listStaff(signal), retry: false, refetchInterval: 30_000 })
  const [input, setInput, clearInput, hasDraft] = useDraftState<StaffInput>('staff:input', blank)
  const [open, setOpen, clearOpen] = useDraftState('staff:open', false)
  const [confirm, setConfirm] = useState(false)
  const [search, setSearch] = useState('')
  const [validation, setValidation] = useState('')
  const [notice, setNotice] = useState('')
  const save = useMutation({ mutationFn: () => saveStaff(input), onSuccess: async () => { setConfirm(false); clearInput(); clearOpen(); setNotice('Perubahan staf dan role dikonfirmasi database.'); await client.invalidateQueries({ queryKey: ['admin-content'] }); await client.invalidateQueries({ queryKey: ['staff-access'] }) } })
  function edit(row: StaffInput) { if (hasDraft) { if (input.user_id === row.user_id) { setOpen(true); return }; if (!window.confirm('Ganti draf profil staf yang sedang diedit?')) return }; setInput(row); setValidation(''); save.reset(); setOpen(true) }
  return <><AdminPageHeader title="Manajemen staf" description="Super Admin mengelola profil dan role akun Auth yang sudah ada, melalui RPC atomik. Tidak membuat akun Auth dari browser."><Button onClick={() => edit(blank)}>Daftarkan profil akun existing</Button>{hasDraft && !open && <Button variant="secondary" onClick={() => setOpen(true)}>Lanjutkan draf staf</Button>}</AdminPageHeader><Alert tone="warning">{remoteWritesApproved ? 'Perubahan role memerlukan konfirmasi. Super Admin aktif terakhir tidak boleh dinonaktifkan atau kehilangan role.' : 'Penulisan remote terkunci. RPC pengelolaan staf memerlukan penerapan paket backend yang disetujui.'}</Alert>{notice && <p role="status">{notice}</p>}<Input label="Cari staf" value={search} onChange={event => setSearch(event.target.value)}/><DataTable title="Staf" rows={(query.data ?? []).filter(row => row.display_name.toLocaleLowerCase('id').includes(search.toLocaleLowerCase('id')))} rowKey={row => row.user_id} loading={query.isPending} error={query.isError ? contentError(query.error) : undefined} columns={[{ key: 'name', label: 'Nama', render: row => row.display_name }, { key: 'id', label: 'User ID', render: row => row.user_id }, { key: 'roles', label: 'Role', render: row => row.roles.join(', ') }, { key: 'active', label: 'Status', render: row => row.is_active ? 'Aktif' : 'Nonaktif' }, { key: 'edit', label: 'Tindakan', render: row => <Button variant="secondary" onClick={() => edit(row)}>Edit staf</Button> }]}/><p className="muted">Maksimal 200 profil, pencarian lokal pada daftar ini. Email/kredensial Auth tidak dibaca.</p>
    <Dialog open={open} onClose={() => { if (!save.isPending) setOpen(false) }} title="Profil dan role staf"><form className="form-stack" onSubmit={event => { event.preventDefault(); const parsed = staffInputSchema.safeParse(input); if (!parsed.success) { setValidation(parsed.error.issues.map(issue => issue.message).join(' ')); return } setValidation(''); setConfirm(true) }}><Input label="User ID akun Auth existing" value={input.user_id} onChange={event => setInput({ ...input, user_id: event.target.value })} required/><Input label="Nama tampilan staf" value={input.display_name} maxLength={100} required onChange={event => setInput({ ...input, display_name: event.target.value })}/><label className="check"><input type="checkbox" checked={input.is_active} onChange={event => setInput({ ...input, is_active: event.target.checked })}/>Staf aktif</label><fieldset><legend>Role</legend>{staffRoleCodes.map(role => <label className="check" key={role}><input type="checkbox" checked={input.roles.includes(role)} onChange={event => setInput({ ...input, roles: event.target.checked ? [...input.roles, role] : input.roles.filter(item => item !== role) })}/>{role}</label>)}</fieldset>{validation && <Alert tone="danger">{validation}</Alert>}<Button type="submit" disabled={!remoteWritesApproved}>Tinjau perubahan staf</Button></form></Dialog>
    <Dialog open={confirm} onClose={() => { if (!save.isPending) setConfirm(false) }} title="Konfirmasi perubahan akses"><p>{input.display_name}: {input.roles.join(', ')}; {input.is_active ? 'aktif' : 'nonaktif'}. Perubahan ini memengaruhi izin akses akun.</p>{save.isError && <Alert tone="danger">{contentError(save.error)}</Alert>}<Button loading={save.isPending} disabled={!remoteWritesApproved} onClick={() => { if (!save.isPending) save.mutate() }}>Terapkan perubahan akses</Button></Dialog>
  </>
}
