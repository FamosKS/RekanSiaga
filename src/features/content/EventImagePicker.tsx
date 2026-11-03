import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { eventMediaEnabled, resolveEventImage, validateEventImage } from './eventMedia'
export function EventImagePicker({eventId,file,onFile,removeImage,onRemove,disabled,progress}:{eventId?:string;file:File|null;onFile:(file:File|null)=>void;removeImage:boolean;onRemove:()=>void;disabled:boolean;progress:number|null}){
 const [preview,setPreview]=useState(''),[error,setError]=useState('')
 const image=useQuery({queryKey:['admin-content','event-image',eventId],queryFn:()=>resolveEventImage(eventId!,true),enabled:!!eventId&&!file&&!removeImage,staleTime:30_000})
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview)},[preview])
 return <section className="form-stack article-image-picker"><h3>Foto utama kejadian</h3><Input label={file||image.data?'Ganti foto kejadian':'Pilih foto kejadian'} type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||!eventMediaEnabled} hint="JPEG, PNG, WebP; maksimal 5 MiB dan 16 megapiksel. File dinormalisasi ke PNG tanpa EXIF/GPS sebelum upload. Hindari foto wajah atau identitas yang belum diperiksa." onChange={event=>{const selected=event.target.files?.[0];if(!selected)return;try{validateEventImage(selected);onFile(selected);onRemove();setPreview(URL.createObjectURL(selected));setError('')}catch(reason){setError(reason instanceof Error?reason.message:'Format gambar tidak valid.');event.target.value=''}}}/>
 {file&&preview&&<img className="article-cover" src={preview} alt="Pratinjau foto kejadian terpilih"/>}{!file&&!removeImage&&image.data&&<img className="article-cover" src={image.data} alt="Foto utama kejadian saat ini" referrerPolicy="no-referrer"/>}
 {(file||image.data)&&<Button type="button" variant="secondary" disabled={disabled||!eventMediaEnabled} onClick={()=>{onFile(null);onRemove();setPreview('');setError('')}}>Batalkan foto / cabut publikasi</Button>}
 {!eventMediaEnabled&&<p className="muted">Penyimpanan foto menunggu migration dan Edge Function event-media pada Supabase dev. Kejadian tetap dapat disimpan tanpa foto.</p>}
 {file&&<p className="muted">Foto hanya dapat dibaca publik saat kejadian dipublikasikan dan terverifikasi. {Math.ceil(file.size/1024)} KiB dipilih.</p>}{error&&<p role="alert" className="field-error">{error}</p>}{progress!==null&&<div role="status"><progress value={progress} max={100}/><p>{progress<100?`Mengunggah foto: ${progress}%`:'Upload selesai; menunggu konfirmasi backend.'}</p></div>}</section>
}
