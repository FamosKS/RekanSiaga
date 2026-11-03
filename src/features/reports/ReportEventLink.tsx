import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Pagination } from '../../components/shared/Pagination'
import { listResource, authorize } from '../admin/adminDataService'
import { supabase } from '../../lib/supabase'
import { contentError } from '../content/contracts'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
export function ReportEventLink({ report }: { report: { id: string; event_id?: string | null; status: string; updated_at: string } }) {
  const [search,setSearch]=useState(''),[page,setPage]=useState(1),[event,setEvent]=useState<string | undefined>(),[notice,setNotice]=useState('')
  const debounced=useDebouncedValue(search), client=useQueryClient()
  const enabled=import.meta.env.VITE_INTEGRATED_CONTENT_ENABLED==='true'
  const query=useQuery({queryKey:['admin-content','report-event-options',debounced,page],queryFn:({signal})=>listResource('disasters',{search:debounced,page,signal}),enabled:report.status==='verified',retry:false})
  const save=useMutation({mutationFn:async()=>{
    if(!enabled || event===undefined || report.status!=='verified')throw {code:'APPROVAL_REQUIRED'}
    await authorize('/admin/kejadian',true)
    const {data,error}=await supabase.rpc('admin_link_report_event_v1',{p_report_id:report.id,p_event_id:event||null,p_expected_updated_at:report.updated_at})
    if(error)throw error;if(data!==true)throw {code:'PGRST116'}
  },onSuccess:async()=>{setNotice('Pengaitan laporan dikonfirmasi. Publikasi kejadian tetap dikelola terpisah.');setEvent(undefined);await Promise.all([client.invalidateQueries({queryKey:['admin-content']}),client.invalidateQueries({queryKey:['public-content']})])}})
  if(report.status!=='verified')return null
  return <section className="form-stack"><h3>Kejadian terkait</h3><p>Laporan dapat mendukung kejadian yang sama dengan laporan lain. Pengaitan tidak menyalin alamat/foto/koordinat privat atau otomatis menerbitkan kejadian.</p><p>{report.event_id?'Laporan sudah terhubung ke kejadian.':'Laporan belum dihubungkan ke kejadian.'} <Link to="/admin/kejadian">Kelola atau buat kejadian</Link></p>
    <Input label="Cari kejadian tujuan" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
    <Select label="Hubungkan ke kejadian" value={event??report.event_id??''} disabled={query.isPending||query.isError||save.isPending} onChange={e=>setEvent(e.target.value)}><option value="">Tidak terkait / lepaskan hubungan</option>{report.event_id&&!query.data?.rows.some(r=>r.id===report.event_id)&&<option value={report.event_id}>Kejadian terkait saat ini</option>}{query.data?.rows.map(row=><option key={String(row.id)} value={String(row.id)}>{String(row.title)} — {row.published_at?'terbit':'belum terbit'}</option>)}</Select>
    <Pagination page={page} totalPages={Math.ceil((query.data?.count??0)/20)} onChange={setPage}/>
    <Button disabled={!enabled||event===undefined||query.isError} loading={save.isPending} onClick={()=>{if(window.confirm('Simpan pengaitan laporan ke kejadian pilihan? Publikasi tidak berubah.'))save.mutate()}}>Simpan pengaitan</Button>
    {!enabled&&<p className="muted">Pengaitan memerlukan aktivasi paket integrasi konten oleh operator.</p>}{query.isError&&<Alert tone="warning">{contentError(query.error)} Pengaitan memerlukan izin pengelola kejadian.</Alert>}{save.isError&&<Alert tone="danger">{contentError(save.error)}</Alert>}{notice&&<p role="status">{notice}</p>}
  </section>
}
