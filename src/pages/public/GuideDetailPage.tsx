import { useParams } from 'react-router-dom'
import { contentFeedback, useGuide } from '../../features/content/usePublicContent'
import { isUuidIdentifier } from '../../lib/routeParams'
import { Breadcrumb } from '../../components/shared/Breadcrumb'
import { UnavailableDetail } from '../../components/shared/UnavailableDetail'
import { SourceAttribution } from '../../components/shared/SourceAttribution'
import { ContentSection } from '../../components/shared/ContentSection'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LinkButton } from '../../components/ui/LinkButton'
import { ChecklistGroup } from '../../features/guides/ChecklistGroup'
import { PreparednessChecklist } from '../../features/guides/PreparednessChecklist'
export function GuideDetailPage() {
  const { id } = useParams()
  const query = useGuide(id ?? '')
  if (!isUuidIdentifier(id)) return <UnavailableDetail title="Detail panduan" backTo="/panduan" backLabel="Panduan" fields={[]}/>
  const guide = query.data
  return <><Breadcrumb items={[{ label: 'Panduan', to: '/panduan' }, { label: 'Detail panduan' }]}/><div className="reading-layout"><Card><Badge>{guide?.category ?? 'Kategori belum tersedia'}</Badge><h1>{guide?.title ?? 'Detail panduan'}</h1><SourceAttribution source={guide?.source}/><ContentSection {...contentFeedback(query)} hasData={!!guide} empty="Materi panduan belum tersedia">{guide?.phases.map(phase => <details key={phase.title} open><summary>{phase.title}</summary><p>{phase.text}</p></details>)}</ContentSection>{!guide && <div className="guide-phases">{['Sebelum bencana', 'Saat bencana', 'Setelah bencana'].map(phase => <details key={phase}><summary>{phase}</summary><p>Sumber dan materi belum tersedia.</p></details>)}</div>}</Card><Card>{guide ? <ChecklistGroup key={guide.id} title="Checklist panduan" items={guide.checklist}/> : <PreparednessChecklist/>}</Card><LinkButton to="/panduan" variant="secondary">Kembali ke panduan</LinkButton></div></>
}
