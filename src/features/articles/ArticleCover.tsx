import { useState } from 'react'
import { Newspaper } from 'lucide-react'
export function ArticleCover({src,alt='',detail=false,featured=false}:{src?:string;alt?:string;detail?:boolean;featured?:boolean}){
  const [failed,setFailed]=useState<string>()
  const coverClass=featured?'featured-cover':detail?'detail-cover':'article-cover'
  return src&&failed!==src ? <img className={coverClass} src={src} alt={alt} loading={featured?'eager':'lazy'} fetchPriority={featured?'high':'auto'} referrerPolicy="no-referrer" onError={()=>setFailed(src)}/> : <div className={`${coverClass} cover-unavailable${featured?' featured-cover-placeholder':''}`} role="img" aria-label={alt ? `Sampul tidak tersedia: ${alt}` : 'Sampul tidak tersedia'}><Newspaper aria-hidden="true"/><p>Sampul belum tersedia</p></div>
}
