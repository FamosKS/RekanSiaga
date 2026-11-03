import { Link } from 'react-router-dom'
import type { Disaster } from '../../types/publicContent'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { SourceAttribution } from '../../components/shared/SourceAttribution'
import { originLabels } from './originLabels'
export function DisasterCard({ event }: { event: Disaster }) {
  return <Card as="article" className="event-card">{event.imageUrl&&<img className="article-cover" src={event.imageUrl} alt={`Foto kejadian: ${event.title}`} referrerPolicy="no-referrer"/>}<Badge>{event.category}</Badge><h3><Link to={`/pemantauan/${encodeURIComponent(event.id)}`}>{event.title}</Link></h3><p>{event.location} / {event.region}</p><div className="chip-row"><Badge>{event.statusLabel}</Badge><Badge>{event.verificationLabel}</Badge></div><small>{originLabels[event.origin]}</small><SourceAttribution source={event.source} date={event.updatedAt}/><Link className="text-link" to={`/pemantauan/${encodeURIComponent(event.id)}`}>Detail kejadian</Link></Card>
}
