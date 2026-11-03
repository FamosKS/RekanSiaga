import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, Newspaper, Radio, ShieldCheck } from 'lucide-react'
import { useStaffAccess } from '../../features/auth/StaffAccessContext'
import { canAccessAdminPath } from '../../features/auth/permissions'
import { listPublishedArticles } from '../../features/content/contentService'
import { contentFeedback, useDisasters, useGuides } from '../../features/content/usePublicContent'
import { articleWritesApproved } from '../../features/content/articleAdminService'
import { AdminPageHeader } from '../../components/shared/AdminPageHeader'
import { ContentSection } from '../../components/shared/ContentSection'
import { Panel } from '../../components/shared/PageElements'
import { Badge } from '../../components/ui/Badge'
import { Alert } from '../../components/ui/Alert'
export function AdminDashboardPage() {
  const access = useStaffAccess()
  const allowed = (path: string) => !!access && canAccessAdminPath(access.roles, path)
  const articles = useQuery({ queryKey: ['public-content', 'articles'], queryFn: ({ signal }) => listPublishedArticles(signal) })
  const guides = useGuides()
  const disasters = useDisasters()
  return <>
    <AdminPageHeader title="Dashboard" description="Ringkasan konten publik dari rekansiaga-dev. Maksimal 100 data terbaru per daftar, bukan total seluruh database."/>
    <Alert tone="warning">{articleWritesApproved ? 'CRUD artikel diaktifkan melalui persetujuan operator; database tetap memeriksa izin.' : 'Penulisan artikel remote terkunci sampai persetujuan operator dan verifikasi backend dev.'} Laporan dan antrean mengikuti grants/RLS dev; pengiriman push dan sinkronisasi eksternal belum diuji. Phase 4A tetap BLOCKED.</Alert>
    <div className="admin-summary">{[{ label: 'Artikel terbit', query: articles }, { label: 'Panduan terbit', query: guides }, { label: 'Kejadian terbit', query: disasters }].map(({ label, query }) => <Panel key={label}><h2>{label}</h2><p className="admin-metric">{query.isPending || query.isError ? 'Belum tersedia' : query.data?.length ?? 0}</p><span className="muted">{query.isError ? 'Gagal membaca data dev' : 'Data publik dalam daftar dev'}</span></Panel>)}</div>
    <Panel><div className="section-heading"><h2>Artikel terbaru dari dev</h2>{allowed('/admin/artikel') && <Link to="/admin/artikel">Kelola artikel</Link>}</div><ContentSection {...contentFeedback(articles)} empty="Belum ada artikel terbit" hasData={!!articles.data?.length}><ul>{articles.data?.slice(0, 5).map(article => <li key={article.slug}>{article.title}</li>)}</ul></ContentSection></Panel>
    <Panel><h2>Aksi cepat</h2><div className="admin-quick-actions">{allowed('/admin/artikel') && <Link to="/admin/artikel"><Newspaper size={20}/>Kelola artikel</Link>}{allowed('/admin/panduan') && <Link to="/admin/panduan"><BookOpen size={20}/>Kelola panduan</Link>}{allowed('/admin/sumber-data') && <Link to="/admin/sumber-data"><Radio size={20}/>Kelola sumber data</Link>}</div></Panel>
    <Panel><div className="section-heading"><h2><ShieldCheck size={20} aria-hidden="true"/> Status sistem</h2><Badge>Development</Badge></div><dl className="admin-system"><div><dt>Otorisasi staf</dt><dd>Identitas Auth, profil aktif, assignment dan role diperiksa pada server. Kegagalan verifikasi menolak akses.</dd></div><div><dt>Layanan data</dt><dd>Artikel, panduan, kejadian, dan kontak publik menggunakan dev. RLS/grants untuk operasi staf masih memerlukan verifikasi operator.</dd></div><div><dt>Pengiriman notifikasi</dt><dd>Belum tersedia; tidak ada bukti pengiriman.</dd></div></dl></Panel>
  </>
}
