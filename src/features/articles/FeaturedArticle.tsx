import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { ArticleCover } from './ArticleCover'

export type HomeFeaturedArticle = {
  slug: string
  title: string
  summary: string | null
  coverUrl?: string
  is_featured: boolean
}

export function FeaturedArticle({ article }: { article: HomeFeaturedArticle }) {
  return <Card as="article" className="home-featured-article" padding="md">
    <ArticleCover src={article.coverUrl} alt={article.title} featured />
    <div className="home-featured-copy">
      <Badge tone="primary"><Sparkles size={14} aria-hidden="true"/> {article.is_featured ? 'Pilihan redaksi' : 'Informasi terbaru'}</Badge>
      <h3><Link to={`/informasi/${encodeURIComponent(article.slug)}`}>{article.title}</Link></h3>
      <p>{article.summary?.trim() || 'Buka artikel untuk membaca informasi selengkapnya.'}</p>
      <Link className="text-link" to={`/informasi/${encodeURIComponent(article.slug)}`}>Baca informasi <ArrowRight size={16} aria-hidden="true"/></Link>
    </div>
  </Card>
}
