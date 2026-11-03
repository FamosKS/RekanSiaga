// Frontend view models only: not an inferred Supabase schema or status contract.
export type ContentSource = { name: string; url?: string }
export type Article = { slug: string; title: string; category: string; publishedAt: string; source: ContentSource; excerpt: string; paragraphs: readonly string[]; coverUrl?: string; coverAlt?: string }
export type Disaster = { id: string; title: string; category: string; region: string; location: string; occurredAt: string; updatedAt: string; source: ContentSource; origin: 'official' | 'staff' | 'community' | 'unknown'; verificationLabel: string; statusLabel: string; description: string; updates: readonly { date: string; text: string }[]; imageUrl?: string }
export type Guide = { id: string; title: string; category: string; source: ContentSource; phases: readonly { title: string; text: string }[]; checklist: readonly string[] }
export type EmergencyContact = { id: string; name: string; category: string; region: string; phone: string; source: ContentSource; verifiedAt: string }
export type PublicContentState = 'unavailable' | 'loading' | 'ready' | 'error'
