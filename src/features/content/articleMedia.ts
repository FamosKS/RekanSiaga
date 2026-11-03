import { supabase } from '../../lib/supabase'
import { authorize } from '../admin/adminDataService'
import { articleRowSchema, type ArticleRow } from './contracts'
export const articleMediaEnabled = import.meta.env.VITE_INTEGRATED_CONTENT_ENABLED === 'true'
export const articleMediaPath = /^article-media\/articles\/[\da-f-]{36}\/[\da-f-]{36}\.png$/
export function validateArticleFile(file: Pick<File,'type'|'size'>) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Pilih gambar JPEG, PNG, atau WebP. SVG tidak diterima.')
  if(!file.size||file.size>5*1024*1024)throw Error('Gambar harus berukuran 1 byte sampai 5 MiB.')
}
export async function preparePng(file: File) {
  validateArticleFile(file)
  const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer())
  const magic=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==='image/png'?[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n):new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'
  if(!magic)throw Error('Isi file tidak sesuai format gambar.')
  const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'})
  try{
    if(bitmap.width*bitmap.height>16_000_000)throw Error('Resolusi gambar terlalu besar (maksimal 16 megapiksel).')
    const ratio=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio))
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('Pemrosesan gambar tidak tersedia.')
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height)
    const png=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Gambar tidak dapat diproses.')),'image/png'))
    if(png.size>5*1024*1024)throw Error('Hasil gambar melebihi 5 MiB. Pilih gambar yang lebih kecil.')
    const data=new Uint8Array(await png.arrayBuffer());let binary='';for(let i=0;i<data.length;i+=8192)binary+=String.fromCharCode(...data.subarray(i,i+8192))
    return btoa(binary)
  }finally{bitmap.close()}
}
export async function uploadArticleCover(file: File, article: ArticleRow, progress: (value:number)=>void) {
  if(!articleMediaEnabled)throw Error('Paket upload artikel belum diaktifkan operator.')
  await authorize('/admin/artikel',true)
  const png_base64=await preparePng(file)
  const {data,error}=await supabase.auth.getSession()
  if(error||!data.session)throw Error('Sesi Admin tidak tersedia.')
  const result=await new Promise<unknown>((resolve,reject)=>{
    const xhr=new XMLHttpRequest()
    xhr.open('POST',`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/article-media`)
    xhr.setRequestHeader('Content-Type','application/json');xhr.setRequestHeader('apikey',import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
    xhr.setRequestHeader('Authorization',`Bearer ${data.session.access_token}`)
    xhr.timeout=90000
    xhr.upload.onprogress=e=>{if(e.lengthComputable)progress(Math.round(e.loaded/e.total*100))}
    xhr.onerror=xhr.ontimeout=()=>reject(Error('Hasil upload belum dapat dipastikan. Teks/draf tetap ada; periksa artikel sebelum mencoba ulang.'))
    xhr.onload=()=>{
      let body:unknown;try{body=JSON.parse(xhr.responseText)}catch{reject(Error('Respons upload tidak valid; periksa status sebelum mencoba ulang.'));return}
      if(xhr.status>=200&&xhr.status<300){resolve(body);return}
      const code=body&&typeof body==='object'&&'error'in body?body.error:''
      reject(Error(code==='VERSION_CONFLICT'?'Artikel berubah di server. Pertahankan teks Anda dan tinjau versi terbaru.':code==='INVALID_IMAGE'?'Gambar ditolak pemeriksaan server.':code==='MEDIA_NOT_READY'?'RPC/Storage upload artikel belum siap.':code==='FORBIDDEN'?'Role tidak mengizinkan upload.':'Upload belum dikonfirmasi. Draf tetap ada; jangan mengulang sebelum memeriksa hasil.'))
    }
    xhr.send(JSON.stringify({article_id:article.id,expected_updated_at:article.updated_at,png_base64}))
  })
  if(!result||typeof result!=='object'||!('article'in result))throw Error('Hasil upload belum dikonfirmasi.')
  return articleRowSchema.parse(result.article)
}
export async function resolveArticleCover(path: string | null | undefined, staff=false, publishedSlug?: string): Promise<string | undefined> {
  if(!path)return undefined
  if(/^https?:\/\//.test(path))return path
  if(!articleMediaPath.test(path))return undefined
  // Public article covers stay in a private bucket. Resolve them through a
  // server endpoint that verifies the article is currently published; an
  // anonymous Storage signature is not reliable across project policy states.
  if(!staff){
    if(!publishedSlug)return undefined
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-article-cover?slug=${encodeURIComponent(publishedSlug)}`
  }
  const {data,error}=await supabase.storage.from('article-media').createSignedUrl(path.slice('article-media/'.length),60)
  if(error)return undefined
  return data.signedUrl
}
