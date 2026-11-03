import { useState } from 'react'
import { Activity, Flame, Mountain, Waves } from 'lucide-react'
import { PageHeader, SectionHeading } from '../../components/shared/PageElements'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { ContentSection } from '../../components/shared/ContentSection'
import { PreparednessChecklist } from '../../features/guides/PreparednessChecklist'
import { GuideCard } from '../../features/guides/GuideCard'
import { contentFeedback, useGuides } from '../../features/content/usePublicContent'
export function GuidePage() {
  const query = useGuides()
  const guides = query.data ?? []
  const [category, setCategory] = useState('')
  const results = guides.filter(guide => !category || guide.category === category)
  return <><PageHeader eyebrow="REKANSIAGA / EDUKASI" title="Panduan siaga" description="Ruang panduan kesiapsiagaan. Materi terbit dibaca dari database dev; periksa sumber pada setiap panduan."/><Card><PreparednessChecklist/></Card><section><SectionHeading title="Panduan berdasarkan bencana"><Button variant="ghost" size="sm" onClick={() => setCategory('')}>Semua kategori</Button></SectionHeading><div className="guide-category-grid">{[{ label: 'Gempa bumi', tone: 'danger', Icon: Activity }, { label: 'Banjir', tone: 'neutral', Icon: Waves }, { label: 'Kebakaran', tone: 'warning', Icon: Flame }, { label: 'Gunung api', tone: 'success', Icon: Mountain }].map(({ label, tone, Icon }) => <button key={label} className={`guide-category rs-tone--${tone}`} aria-pressed={category === label} onClick={() => setCategory(category === label ? '' : label)}><span><Icon size={28} aria-hidden="true"/></span><strong>{label}</strong><small>{category === label ? 'Kategori dipilih' : 'Lihat kategori'}</small></button>)}</div><p className="muted" role="status">Kategori: {category || 'semua panduan'}</p><ContentSection {...contentFeedback(query)} hasData={!!results.length} empty="Panduan terverifikasi belum tersedia"><div className="public-card-grid">{results.map(guide => <GuideCard key={guide.id} guide={guide}/>)}</div></ContentSection></section><section><h2>Tahapan kesiapsiagaan</h2><div className="guide-phases">{['Sebelum bencana', 'Saat bencana', 'Setelah bencana'].map(title => <details key={title}><summary>{title}</summary><p>Materi {title.toLowerCase()} belum tersedia. Konten memerlukan sumber edukasi yang diverifikasi; ikuti arahan petugas setempat.</p></details>)}</div></section></>
}
