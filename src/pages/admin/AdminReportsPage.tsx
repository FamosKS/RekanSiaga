import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AdminPageHeader } from '../../components/shared/AdminPageHeader'
import { DataTable } from '../../components/shared/DataTable'
import { Pagination } from '../../components/shared/Pagination'
import { Panel } from '../../components/shared/PageElements'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { listReports } from '../../features/reports/adminReportService'
import { contentError } from '../../features/content/contracts'
import { pageSize } from '../../features/admin/adminDataService'
import { formatDate } from '../../lib/publicFormatting'
export function AdminReportsPage() {
  const [search, setSearch] = useState(''), [status, setStatus] = useState(''), [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)
  const query = useQuery({ queryKey: ['admin-content', 'reports', page, debouncedSearch, status], queryFn: ({ signal }) => listReports(page, debouncedSearch, status, signal), retry: false, refetchInterval: 30_000 })
  return <><AdminPageHeader title="Laporan masyarakat" description="Data privat hanya untuk staf berwenang. Tidak ada token akses atau URL lampiran di daftar."/><Panel><div className="admin-toolbar"><Input label="Cari kode laporan" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }}/><Select label="Status laporan" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">Semua status</option>{['unverified','under_review','verified','rejected'].map(value => <option key={value}>{value}</option>)}</Select><Button variant="secondary" loading={query.isFetching} onClick={() => { void query.refetch() }}>Muat ulang</Button></div><DataTable title="Laporan masyarakat" rows={query.data?.rows ?? []} rowKey={row => row.id} loading={query.isPending} error={query.isError ? contentError(query.error) : undefined} columns={[{ key: 'code', label: 'Kode', render: row => <Link to={`/admin/laporan/${row.id}`}>{row.tracking_code}</Link> }, { key: 'title', label: 'Judul', render: row => row.title }, { key: 'type', label: 'Jenis', render: row => row.report_type }, { key: 'status', label: 'Status', render: row => row.status }, { key: 'created', label: 'Waktu', render: row => formatDate(row.created_at) }]}/><Pagination page={page} totalPages={Math.ceil((query.data?.count ?? 0)/pageSize)} onChange={setPage}/></Panel></>
}
