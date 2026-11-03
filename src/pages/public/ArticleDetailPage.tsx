import { ArticleCover } from '../../features/articles/ArticleCover'
import { useParams } from 'react-router-dom'
import { contentFeedback, useArticle, useArticles } from '../../features/content/usePublicContent'
import { isValidIdentifier } from '../../lib/routeParams'
import { safeExternalUrl } from '../../lib/publicFormatting'
import { UnavailableDetail } from '../../components/shared/UnavailableDetail'
import { Breadcrumb } from '../../components/shared/Breadcrumb'
import { SourceAttribution } from '../../components/shared/SourceAttribution'
import { ShareButton } from '../../components/shared/ShareButton'
import { ContentSection } from '../../components/shared/ContentSection'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { LinkButton } from '../../components/ui/LinkButton'
import { ArticleCard } from '../../features/articles/ArticleCard'
export function ArticleDetailPage() {
  const { slug } = useParams()
  const query = useArticle(isValidIdentifier(slug) ? slug : '')
  const articleList = useArticles()
  if (!isValidIdentifier(slug)) return <UnavailableDetail title="Detail artikel" backTo="/informasi" backLabel="Informasi" parameter="slug" fields={[]}/>
  const article = query.data
  const related = articleList.data.filter(item => item.slug !== slug).slice(0, 3)
  const cover = safeExternalUrl(article?.coverUrl)
  return <><Breadcrumb items={[{ label: 'Informasi', to: '/informasi' }, { label: 'Detail artikel' }]}/><article className="reading-layout"><Card><Badge>{article?.category ?? 'Kategori belum tersedia'}</Badge><h1>{article?.title ?? 'Detail artikel'}</h1><SourceAttribution source={article?.source} date={article?.publishedAt}/><ArticleCover src={cover} alt={article?.coverAlt} detail/><ContentSection {...contentFeedback(query)} hasData={!!article} empty="Artikel belum tersedia">{article?.paragraphs.map((paragraph, index) => <p className="article-paragraph" key={index}>{paragraph}</p>)}</ContentSection><div className="action-row"><LinkButton to="/informasi" variant="secondary">Kembali ke informasi</LinkButton>{article && <ShareButton title={article.title}/>}</div></Card></article><section><h2>Artikel terkait</h2><ContentSection {...contentFeedback(articleList)} hasData={!!related.length} empty="Artikel terkait belum tersedia"><div className="public-card-grid">{related.map(item => <ArticleCard key={item.slug} article={item}/>)}</div></ContentSection></section></>
}
