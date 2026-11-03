import { Link } from 'react-router-dom'
import type { Guide } from '../../types/publicContent'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { SourceAttribution } from '../../components/shared/SourceAttribution'
export function GuideCard({ guide }: { guide: Guide }) { return <Card as="article"><Badge>{guide.category}</Badge><h3><Link to={`/panduan/${encodeURIComponent(guide.id)}`}>{guide.title}</Link></h3><SourceAttribution source={guide.source}/><Link className="text-link" to={`/panduan/${encodeURIComponent(guide.id)}`}>Buka panduan</Link></Card> }
