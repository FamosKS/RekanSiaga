import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, MapPinned, Clock } from 'lucide-react'
import { PageHeader } from '../../components/shared/PageElements'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Pagination } from '../../components/shared/Pagination'
import { ContentSection } from '../../components/shared/ContentSection'
import { MonitoringFilters, type MonitoringFilterValues } from '../../features/disasters/MonitoringFilters'
import { DisasterCard } from '../../features/disasters/DisasterCard'
import { contentFeedback } from '../../features/content/usePublicContent'
import { getPublicEventPage } from '../../features/content/eventFeed'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { formatDate } from '../../lib/publicFormatting'
import { LocationAlertFeed } from '../../features/notifications/LocationAlertFeed'
export function MonitoringPage() {
  const [filters, setFilters] = useState<MonitoringFilterValues>({ region: '', regionCode: '', kind: '', status: '' })
  const [search,setSearch] = useState(''), [sort,setSort] = useState<'updated'|'occurred'>('updated'), [page,setPage] = useState(1)
  const debounced = useDebouncedValue(search)
  const query = useQuery({ queryKey:['public-content','event-feed',filters,debounced,sort,page], queryFn:({signal})=>getPublicEventPage({regionCode:filters.regionCode??'',kind:filters.kind,status:filters.status,search:debounced,sort},page,12,signal) })
  if(query.data&&page>Math.max(1,Math.ceil(query.data.total/12)))setPage(Math.max(1,Math.ceil(query.data.total/12)))
  const available = !!query.data && !query.isError
  const filtered = !!(filters.regionCode || filters.kind || filters.status || debounced)
  return <>
    <PageHeader title="Pemantauan terkini" description="Kejadian yang diterbitkan oleh staf atau dikonfirmasi sumber. Laporan masyarakat tetap melalui peninjauan dan pengaitan kejadian."/>
    <LocationAlertFeed/>
    <div className="public-card-grid summary-grid">{[
      {title:'Kejadian sesuai filter',value:available?String(query.data!.total):'Belum tersedia',text:'Jumlah seluruh hasil, bukan hanya halaman ini. Daftar kosong bukan berarti aman.',Icon:Activity},
      {title:'Wilayah kejadian',value:available?String(query.data!.regions_count):'Belum tersedia',text:'Wilayah berbeda pada kejadian/lokasi publik yang sesuai filter; bukan jumlah master wilayah.',Icon:MapPinned},
      {title:'Pembaruan informasi',value:query.data?.updated_at?formatDate(query.data.updated_at):'Belum tersedia',text:'Waktu perubahan data kejadian/sumber. Diperbarui di latar belakang saat halaman aktif.',Icon:Clock},
    ].map(({title,value,text,Icon})=><Card key={title}><span className="summary-icon"><Icon aria-hidden="true"/></span><h2>{title}</h2><p>{value}</p><p className="muted">{text}</p></Card>)}</div>
    <Card><div className="section-heading"><h2>Filter kejadian</h2><Badge>Kejadian terbit</Badge><Button variant="secondary" loading={query.isFetching} onClick={()=>{void query.refetch()}}>Muat ulang</Button></div>
      <MonitoringFilters value={filters} onChange={value=>{setFilters(value);setPage(1)}} kinds={query.data?.kinds??[]}/>
      <div className="admin-toolbar"><Input label="Cari judul kejadian" type="search" maxLength={120} value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/><Select label="Urutkan" value={sort} onChange={e=>{setSort(e.target.value as 'updated'|'occurred');setPage(1)}}><option value="updated">Pembaruan terbaru</option><option value="occurred">Waktu kejadian terbaru</option></Select></div>
      <p className="muted">Verifikasi laporan, status kejadian, dan publikasi adalah keputusan berbeda. Wilayah dicocokkan melalui kode resmi beserta turunannya.</p>
    </Card>
    <section><h2>Daftar kejadian</h2><ContentSection {...contentFeedback(query)} hasData={!!query.data?.events.length} empty={filtered?'Tidak ada kejadian yang cocok dengan filter':'Belum ada kejadian yang diterbitkan'}><div className="public-card-grid">{query.data?.events.map(event=><DisasterCard key={event.id} event={event}/>)}</div></ContentSection><Pagination page={page} totalPages={Math.ceil((query.data?.total??0)/12)} onChange={setPage}/></section>
  </>
}
