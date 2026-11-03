import { useQuery } from '@tanstack/react-query'
import { getPublishedArticle, listPublishedArticles, listPublishedDisasters, listPublishedGuides, listVerifiedContacts } from './contentService'
import { featuredArticleEnabled } from './contracts'
import { getHomeFeaturedArticle } from './contentService'
import type { PublicContentState } from '../../types/publicContent'
import { contentError } from './contracts'

export function useArticles() {
  const query = useQuery({ queryKey: ['public-content', 'articles'], queryFn: ({ signal }) => listPublishedArticles(signal), refetchOnWindowFocus: true, refetchOnReconnect: true })
  return { ...query, data: query.data ?? [] }
}
export function useHomeFeaturedArticle() {
  return useQuery({ queryKey: ['public-content', 'featured-article'], queryFn: getHomeFeaturedArticle, enabled: featuredArticleEnabled, refetchOnWindowFocus: true, refetchOnReconnect: true })
}
export function useArticle(slug: string) {
  return useQuery({ queryKey: ['public-content', 'article', slug], queryFn: ({ signal }) => getPublishedArticle(slug, signal), enabled: !!slug })
}
export function useGuides() { return useQuery({ queryKey: ['public-content', 'guides'], queryFn: ({ signal }) => listPublishedGuides(signal), refetchOnWindowFocus: true }) }
export function useDisasters() { return useQuery({ queryKey: ['public-content', 'disasters'], queryFn: ({ signal }) => listPublishedDisasters(signal), refetchOnWindowFocus: true }) }
export function useContacts() { return useQuery({ queryKey: ['public-content', 'contacts'], queryFn: ({ signal }) => listVerifiedContacts(signal), refetchOnWindowFocus: true }) }
export function contentState(query: { isPending: boolean; isError: boolean }): PublicContentState { return query.isPending ? 'loading' : query.isError ? 'error' : 'ready' }
export function contentFeedback(query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }) {
  return { state: contentState(query), error: contentError(query.error), onRetry: () => { void query.refetch() } }
}

export function useGuide(id: string) { return useQuery({ queryKey: ['public-content', 'guide', id], enabled: /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id), queryFn: async ({ signal }) => (await listPublishedGuides(signal, id))[0] ?? null }) }
export function useDisaster(id: string) { return useQuery({ queryKey: ['public-content', 'disaster', id], enabled: /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id), queryFn: async ({ signal }) => (await listPublishedDisasters(signal, id))[0] ?? null }) }
