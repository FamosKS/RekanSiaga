import { Phone } from 'lucide-react'
import type { EmergencyContact } from '../../types/publicContent'
import { Card } from '../../components/ui/Card'
import { SourceAttribution } from '../../components/shared/SourceAttribution'
import { safePhone } from '../../lib/publicFormatting'
export function EmergencyContactCard({ contact }: { contact: EmergencyContact }) {
  const phone = safePhone(contact.phone)
  return <Card as="article" className="emergency-contact"><div><h3>{contact.name}</h3><p>{contact.category} / {contact.region}</p><strong>{contact.phone}</strong><SourceAttribution source={contact.source} date={contact.verifiedAt}/></div>{phone ? <a className="rs-button rs-button--secondary" href={phone}><Phone size={16} aria-hidden="true"/>Panggil {contact.name}</a> : <p>Nomor belum dapat dipanggil.</p>}</Card>
}
