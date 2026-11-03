import { useQuery } from '@tanstack/react-query'
import { ContentSection } from '../../components/shared/ContentSection'
import { SourceAttribution } from '../../components/shared/SourceAttribution'
import { Card } from '../../components/ui/Card'
import { contentFeedback } from '../content/usePublicContent'
import { listPublicRelief, osmUrl } from '../maps/mapService'
import { parsePoint } from '../../lib/geography'
import { safeExternalUrl } from '../../lib/publicFormatting'
export function ReliefDirectory() {
  const query = useQuery({ queryKey: ['public-content', 'relief'], queryFn: ({ signal }) => listPublicRelief(signal) })
  return <section><h2>Lokasi bantuan terverifikasi</h2><ContentSection {...contentFeedback(query)} hasData={!!query.data?.length} empty="Belum ada lokasi bantuan terverifikasi"><div className="public-card-grid">{query.data?.map(row => { const point = parsePoint(row.coordinates); return <Card key={row.id}><h3>{row.name}</h3><p>{row.location_type} / {row.address ?? 'Alamat belum tersedia'}</p>{point && <a href={osmUrl(point)} target="_blank" rel="noreferrer">Buka lokasi di peta</a>}<SourceAttribution date={row.updated_at} source={{ name: safeExternalUrl(row.source_url ?? undefined) ? new URL(row.source_url!).hostname : 'RekanSiaga', url: row.source_url ?? undefined }}/></Card> })}</div></ContentSection></section>
}
