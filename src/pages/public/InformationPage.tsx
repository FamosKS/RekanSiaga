import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '../../components/shared/PageElements'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ContentSection } from '../../components/shared/ContentSection'
import { Pagination } from '../../components/shared/Pagination'
import { ArticleCard } from '../../features/articles/ArticleCard'
import { contentFeedback } from '../../features/content/usePublicContent'
import { listPublishedArticlePage } from '../../features/content/contentService'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
export function InformationPage(){
 const [search,setSearch]=useState(''),[page,setPage]=useState(1),debounced=useDebouncedValue(search)
 const query=useQuery({queryKey:['public-content','articles-page',page,debounced],queryFn:({signal})=>listPublishedArticlePage(page,debounced,signal)})
 if(query.data&&page>Math.max(1,Math.ceil(query.data.total/6)))setPage(Math.max(1,Math.ceil(query.data.total/6)))
 return <><PageHeader title="Informasi & berita" description="Artikel dan edukasi kesiapsiagaan yang diterbitkan redaksi RekanSiaga."/><Card><Input label="Cari judul artikel" type="search" maxLength={120} value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/><p className="muted">Urutan waktu terbit terbaru. Perubahan diperbarui di latar belakang saat halaman aktif.</p></Card><section><h2>Semua artikel {query.data?`(${query.data.total})`:''}</h2><ContentSection {...contentFeedback(query)} hasData={!!query.data?.articles.length} empty={debounced?'Tidak ada artikel yang cocok':'Belum ada artikel yang diterbitkan'}><div className="public-card-grid">{query.data?.articles.map(article=><ArticleCard key={article.slug} article={article}/>)}</div></ContentSection><Pagination page={page} totalPages={Math.ceil((query.data?.total??0)/6)} onChange={setPage}/></section></>
}
