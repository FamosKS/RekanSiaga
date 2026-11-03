import type { Article, Disaster, Guide, EmergencyContact } from '../types/publicContent'
// Deliberately empty: no fake incidents, articles, contacts, or inferred database queries.
// A read service can replace these after the shared backend contract is verified.
export const articles: readonly Article[] = []
export const disasters: readonly Disaster[] = []
export const guides: readonly Guide[] = []
export const emergencyContacts: readonly EmergencyContact[] = []
export const eventStatusOptions: readonly string[] = []
export const regionOptions: readonly string[] = []
