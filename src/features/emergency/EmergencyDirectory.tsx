import { useState } from 'react'
import { contentFeedback, useContacts } from '../content/usePublicContent'
import { Select } from '../../components/ui/Select'
import { ContentSection } from '../../components/shared/ContentSection'
import { EmergencyContactCard } from './EmergencyContactCard'
export function EmergencyDirectory() {
  const query = useContacts()
  const emergencyContacts = query.data ?? []
  const [category, setCategory] = useState('')
  const categories = [...new Set(emergencyContacts.map(contact => contact.category))]
  const results = emergencyContacts.filter(contact => !category || contact.category === category)
  return <><Select label="Kategori layanan" value={category} disabled={!categories.length} hint="Kategori tersedia setelah direktori resmi terverifikasi." onChange={event => setCategory(event.target.value)}><option value="">Semua layanan</option>{categories.map(value => <option key={value}>{value}</option>)}</Select><ContentSection {...contentFeedback(query)} hasData={!!results.length} empty="Direktori kontak resmi belum tersedia"><div className="contact-grid">{results.map(contact => <EmergencyContactCard key={contact.id} contact={contact}/>)}</div></ContentSection></>
}
