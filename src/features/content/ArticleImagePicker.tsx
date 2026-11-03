import { useEffect, useState } from 'react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { validateArticleFile, resolveArticleCover } from './articleMedia'
import { useQuery } from '@tanstack/react-query'
export function ArticleImagePicker({file,onFile,path,onRemove,disabled,progress}:{file:File|null;onFile:(file:File|null)=>void;path?:string|null;onRemove:()=>void;disabled:boolean;progress:number|null}){
  const [preview,setPreview]=useState(''),[error,setError]=useState('')
  const old=useQuery({queryKey:['admin-content','article-cover-preview',path],queryFn:()=>resolveArticleCover(path,true),enabled:!!path&&!file,refetchInterval:45000})
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
  return <section className="form-stack article-image-picker"><h3>Gambar sampul</h3><Input label={file||path?'Ganti Gambar':'Pilih Gambar'} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} hint="JPEG, PNG atau WebP, maksimal 5 MiB / 16 megapiksel. Upload saat Simpan; metadata dibuang. Hindari wajah/identitas pribadi." onChange={event=>{const selected=event.target.files?.[0];if(!selected)return;try{validateArticleFile(selected);onFile(selected);setPreview(URL.createObjectURL(selected));setError('')}catch(e){setError(e instanceof Error?e.message:'Gambar tidak valid.');event.target.value=''}}}/>
    {((file&&preview)||(!file&&old.data))&&<img className="article-cover" src={file?preview:old.data} alt="Preview sampul artikel" referrerPolicy="no-referrer"/>}
    {(file||path)&&<Button variant="secondary" disabled={disabled} onClick={()=>{onFile(null);onRemove();setError('')}}>Hapus Gambar</Button>}
    {file&&<p className="muted">{(file.size/1024).toFixed(0)} KiB dipilih. Gambar menjadi tersedia untuk publik hanya setelah artikel diterbitkan.</p>}
    {error&&<p role="alert" className="field-error">{error}</p>}
    {progress!==null&&<div role="status"><progress value={progress} max={100}/><p>{progress<100?`Mengirim gambar: ${progress}%`:'Gambar terkirim; menunggu konfirmasi pemrosesan dan penyimpanan server.'}</p></div>}
  </section>
}
