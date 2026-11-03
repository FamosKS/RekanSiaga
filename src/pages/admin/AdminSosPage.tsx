import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AdminPageHeader } from '../../components/shared/AdminPageHeader'
import { Panel } from '../../components/shared/PageElements'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { getAdminSos, listAdminSos, sosAdminEnabled, updateAdminSos, useSosResumeRefresh, type SosAdminRequest, type SosStatus } from '../../features/emergency/sosRelay'
import { contentError } from '../../features/content/contracts'

const stages: SosStatus[] = ['received', 'seen', 'reviewing', 'closed']
export function AdminSosPage() {
  useSosResumeRefresh()
  const client = useQueryClient()
  const [selectedId, setSelectedId] = useState('')
  const [statusDraft, setStatusDraft] = useState<{ id: string; updatedAt: string; value: SosStatus } | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const list = useQuery({ queryKey: ['admin-sos'], queryFn: listAdminSos, enabled: sosAdminEnabled, refetchInterval: 20_000, retry: false })
  const detail = useQuery({ queryKey: ['admin-sos', selectedId], queryFn: () => getAdminSos(selectedId), enabled: !!selectedId && sosAdminEnabled, refetchInterval: 20_000, retry: false })
  const current: SosAdminRequest | undefined = detail.data?.request
  const status = current && statusDraft?.id === current.id && statusDraft.updatedAt === current.updated_at ? statusDraft.value : current?.status ?? 'received'
  async function save() {
    if (!current) return
    setMessage('')
    try { await updateAdminSos(current.id, current.updated_at, status, note); setNote(''); setMessage('Perubahan status tersimpan.'); await Promise.all([client.invalidateQueries({ queryKey: ['admin-sos'] }), client.invalidateQueries({ queryKey: ['admin-sos', selectedId] })]) }
    catch { setMessage('Status tidak tersimpan. Muat ulang data sebelum mencoba lagi; jangan mengasumsikan perubahan diterapkan.') }
  }
  return <><AdminPageHeader title="Pusat SOS" description="Permintaan privat untuk staf yang berwenang. Data lokasi dan kontak tidak ditampilkan pada peta publik."/>
    {!sosAdminEnabled && <Alert tone="warning">Dashboard SOS nonaktif. Aktifkan hanya setelah paket backend SOS diterapkan dan postflight lulus.</Alert>}
    {list.isError && <Alert tone="danger">{contentError(list.error)}</Alert>}
    {sosAdminEnabled && <div className="sos-admin-grid"><Panel><div className="admin-toolbar"><h2>Permintaan terbaru</h2><Button variant="secondary" loading={list.isFetching} onClick={() => void list.refetch()}>Muat ulang</Button></div><div className="sos-request-list">{(list.data?.requests ?? []).map(row => <button key={row.id} className="sos-request-item" aria-current={selectedId === row.id} onClick={() => setSelectedId(row.id)}><strong>{row.reference_code}</strong><span>{row.status} · {new Date(row.received_at).toLocaleString('id-ID')}</span></button>)}{!list.isPending && !list.isError && !list.data?.requests.length && <p>Belum ada permintaan SOS.</p>}</div></Panel>
      <Panel><h2>Detail permintaan</h2>{!current ? <p>Pilih permintaan untuk melihat data terbatas staf.</p> : <><p><strong>{current.reference_code}</strong> · diterima {new Date(current.received_at).toLocaleString('id-ID')}</p><p>{current.description}</p><dl className="sos-admin-facts"><dt>Kontak</dt><dd>{current.contact_name || 'Tidak disediakan'} · {current.contact_phone || 'Tidak disediakan'}</dd><dt>Lokasi</dt><dd>{current.latitude === null || current.longitude === null ? 'Tidak tersedia' : `${current.latitude}, ${current.longitude} (akurasi ±${current.accuracy_m ?? 'n/a'} m)`}</dd><dt>Perangkat</dt><dd>Baterai {current.battery_percent === null ? 'tidak tersedia' : `${current.battery_percent}%`}; jaringan {current.device_online ? `online${current.network_type ? ` (${current.network_type})` : ''}` : 'offline'} (sekadar data perangkat, bukan triase)</dd></dl>{current.latitude !== null && current.longitude !== null && <Alert tone="warning">Koordinat privat tersedia. Peta basemap eksternal tidak dimuat agar lokasi tidak dikirim ke penyedia pihak ketiga; geovisualisasi internal memerlukan tile source yang disetujui dan dikelola operator.</Alert>}<div className="sos-status-history"><h3>Riwayat</h3>{(detail.data?.history ?? []).map((entry, index) => <p key={index}>{String(entry.status)} · {new Date(String(entry.changed_at)).toLocaleString('id-ID')}{entry.note ? ` · ${String(entry.note)}` : ''}</p>)}</div><Select label="Status baru" value={status} onChange={event => current && setStatusDraft({ id: current.id, updatedAt: current.updated_at, value: event.target.value as SosStatus })}>{stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}</Select><Textarea label="Catatan internal (opsional)" value={note} maxLength={1000} onChange={event => setNote(event.target.value)}/><p className="muted">Status internal hanya menunjukkan pencatatan RekanSiaga; tidak menandakan unit resmi telah ditugaskan.</p><Button disabled={status === current.status} onClick={() => void save()}>Simpan status</Button></>}{message && <p role="status">{message}</p>}</Panel></div>}
    <p className="muted">Gunakan kontak layanan resmi pada <Link to="/darurat">Pusat Darurat</Link>. Dashboard ini bukan kanal dispatcher resmi.</p>
  </>
}
