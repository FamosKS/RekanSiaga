import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, FilePenLine, MapPinned, Radio, Siren } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LinkButton } from '../../components/ui/LinkButton'
import { SectionHeading } from '../../components/shared/PageElements'
import { ContentSection } from '../../components/shared/ContentSection'
import { ArticleCard } from '../../features/articles/ArticleCard'
import { FeaturedArticle } from '../../features/articles/FeaturedArticle'
import { NotificationNotice } from '../../features/notifications/NotificationNotice'
import { contentFeedback, useArticles, useHomeFeaturedArticle } from '../../features/content/usePublicContent'
import { featuredArticleEnabled } from '../../features/content/contracts'
export function HomePage() {
  const query = useArticles()
  const featuredQuery = useHomeFeaturedArticle()
  const articles = query.data
  const selected = featuredArticleEnabled ? featuredQuery.data ?? (featuredQuery.isSuccess ? articles[0] : undefined) : articles[0]
  const highlighted = selected ? ('is_featured' in selected ? { ...selected, coverUrl: selected.coverUrl ?? articles.find(article => article.slug === selected.slug)?.coverUrl } : { slug: selected.slug, title: selected.title, summary: selected.excerpt, coverUrl: selected.coverUrl, is_featured: false }) : undefined
  const featuredFeedbackQuery = featuredArticleEnabled && !featuredQuery.isSuccess ? featuredQuery : query
  return <>
    <header className="welcome"><p>Selamat datang</p><h1>Halo, RekanSiaga</h1></header>
    <Card as="section" className="home-feature">
      <div><Badge tone="primary">BERSAMA LEBIH SIAP</Badge><h2>Kenali informasi.<br/>Siapkan langkah Anda.</h2><p>Ruang bersama untuk informasi kebencanaan, pemantauan wilayah, dan kesiapsiagaan masyarakat.</p><div className="action-row"><LinkButton to="/laporan">Siapkan laporan</LinkButton><LinkButton to="/peta" variant="secondary">Cek peta</LinkButton></div></div>
    </Card>
    <section aria-label="Informasi Utama"><SectionHeading title="Informasi Utama"/><ContentSection {...contentFeedback(featuredFeedbackQuery)} hasData={!!highlighted} empty="Belum ada artikel terbit untuk ditampilkan.">{highlighted && <FeaturedArticle article={highlighted}/>}</ContentSection></section>
    <Card as="section" className="risk-overview"><div className="section-heading"><div><h2>Informasi risiko wilayah</h2><p className="muted">Analisis lokasi belum terintegrasi</p></div><Badge>Belum tersedia</Badge></div><div className="unavailable-track" aria-hidden="true"/><p className="muted">Belum ada skor atau tingkat risiko yang dapat ditampilkan. Tidak ada lokasi perangkat yang diakses secara otomatis.</p><Link className="text-link" to="/pemantauan">Buka pemantauan wilayah <ArrowRight size={16} aria-hidden="true"/></Link></Card>
    <section><SectionHeading title="Akses cepat"/><div className="public-quick-grid">{[{ to: '/pemantauan', title: 'Pemantauan', text: 'Informasi kejadian', Icon: Radio }, { to: '/peta', title: 'Peta bencana', text: 'Ruang peta wilayah', Icon: MapPinned }, { to: '/laporan', title: 'Laporan', text: 'Siapkan draf kejadian', Icon: FilePenLine }, { to: '/panduan', title: 'Panduan siaga', text: 'Persiapan pribadi', Icon: BookOpen }, { to: '/darurat', title: 'Pusat darurat', text: 'Informasi bantuan', Icon: Siren }].map(({ to, title, text, Icon }) => <Link className="quick-card" key={to} to={to}><Icon aria-hidden="true"/><h3>{title}</h3><p>{text}</p><ArrowRight size={16} aria-hidden="true"/></Link>)}</div></section>
    <NotificationNotice/>
    <section><SectionHeading title="Berita terbaru"><Link to="/informasi">Lihat semua</Link></SectionHeading><ContentSection {...contentFeedback(query)} hasData={!!articles.filter(article => article.slug !== highlighted?.slug).length} empty="Belum ada artikel terbit lainnya"><div className="public-card-grid">{articles.filter(article => article.slug !== highlighted?.slug).slice(0, 3).map(article => <ArticleCard key={article.slug} article={article}/>)}</div></ContentSection></section>
    <Card className="quiet-banner"><h2>Siaga dimulai dari informasi yang jelas</h2><p>Kenali fungsi aplikasi dan ikuti kanal resmi serta arahan petugas setempat. Data kebencanaan langsung belum terhubung.</p></Card>
  </>
}
