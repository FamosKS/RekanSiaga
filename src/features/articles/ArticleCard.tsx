import { ArticleCover } from './ArticleCover'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Article } from '../../types/publicContent'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { SourceAttribution } from '../../components/shared/SourceAttribution'
import { safeExternalUrl } from '../../lib/publicFormatting'
export function ArticleCard({ article }: { article: Article }) {
  const cover = safeExternalUrl(article.coverUrl)
  return <Card as="article" className="article-card"><ArticleCover src={cover} alt={article.coverAlt}/><Badge>{article.category}</Badge><h3><Link to={`/informasi/${encodeURIComponent(article.slug)}`}>{article.title}</Link></h3><p>{article.excerpt}</p><SourceAttribution source={article.source} date={article.publishedAt}/><Link className="text-link" to={`/informasi/${encodeURIComponent(article.slug)}`}>Selengkapnya <ArrowRight size={16} aria-hidden="true"/></Link></Card>
}
