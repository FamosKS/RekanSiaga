import { publicSupabase, supabase } from '../../lib/supabase'
import { authorize } from '../admin/adminDataService'
import { preparePng, validateArticleFile } from './articleMedia'

export const eventMediaEnabled=import.meta.env.VITE_EVENT_MEDIA_ENABLED==='true'
const pathPattern=/^event-media\/events\/[\da-f-]{36}\/[\da-f-]{36}\.png$/i
export function validateEventImage(file:Pick<File,'type'|'size'>){validateArticleFile(file)}
export async function resolveEventImage(eventId:string,staff=false){
 const client=staff?supabase:publicSupabase
 const {data:path,error}=await client.rpc(staff?'admin_event_image_v1':'public_event_image_v1',{p_event_id:eventId})
 if(error||typeof path!=='string'||!pathPattern.test(path))return undefined
 const {data,error:signError}=await client.storage.from('event-media').createSignedUrl(path.slice('event-media/'.length),60)
 return signError?undefined:data.signedUrl
}
export async function resolveEventImages(eventIds:string[],staff=false):Promise<Record<string,string>>{
 const ids=[...new Set(eventIds)].filter(id=>/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)).slice(0,100)
 if(!ids.length)return {}
 const client=staff?supabase:publicSupabase
 const {data,error}=await client.rpc(staff?'admin_event_images_v1':'public_event_images_v1',{p_event_ids:ids})
 if(error||!Array.isArray(data))return {}
 const rows=data.flatMap((row:unknown)=>{if(!row||typeof row!=='object')return [];const item=row as {event_id?:unknown;image_path?:unknown};return typeof item.event_id==='string'&&typeof item.image_path==='string'&&pathPattern.test(item.image_path)?[{id:item.event_id,path:item.image_path.slice('event-media/'.length)}]:[]})
 if(!rows.length)return {}
 const {data:urls,error:signError}=await client.storage.from('event-media').createSignedUrls(rows.map(row=>row.path),60)
 if(signError||!urls)return {}
 const urlByPath=new Map(urls.flatMap(item=>item.path&&item.signedUrl?[[item.path,item.signedUrl] as const]:[]))
 return Object.fromEntries(rows.flatMap(row=>{const url=urlByPath.get(row.path);return url?[[row.id,url]]:[]}))
}
export async function uploadEventImage(file:File,event:Record<string,unknown>,progress:(value:number)=>void){
 if(!eventMediaEnabled)throw Error('Paket gambar kejadian menunggu aktivasi operator.')
 await authorize('/admin/kejadian',true)
 if(typeof event.id!=='string'||typeof event.updated_at!=='string')throw Error('Simpan kejadian lebih dahulu sebelum mengunggah foto.')
 const png_base64=await preparePng(file)
 const {data,error}=await supabase.auth.getSession();if(error||!data.session)throw Error('Sesi Admin tidak tersedia.')
 const result=await new Promise<unknown>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('POST',`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/event-media`);xhr.setRequestHeader('Content-Type','application/json');xhr.setRequestHeader('apikey',import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);xhr.setRequestHeader('Authorization',`Bearer ${data.session.access_token}`);xhr.timeout=90000;xhr.upload.onprogress=e=>{if(e.lengthComputable)progress(Math.round(e.loaded/e.total*100))};xhr.onerror=xhr.ontimeout=()=>reject(Error('Hasil upload belum dapat dipastikan; periksa ulang kejadian sebelum mencoba lagi.'));xhr.onload=()=>{let body:unknown;try{body=JSON.parse(xhr.responseText)}catch{reject(Error('Respons upload tidak valid.'));return}if(xhr.status>=200&&xhr.status<300){resolve(body);return}const code=body&&typeof body==='object'&&'error'in body?body.error:'';reject(Error(code==='VERSION_CONFLICT'?'Kejadian berubah di server. Muat ulang sebelum mencoba lagi.':code==='FORBIDDEN'?'Role tidak mengizinkan pengelolaan foto kejadian.':code==='INVALID_IMAGE'?'Gambar ditolak pemeriksaan server.':'Upload belum dikonfirmasi. Periksa status gambar sebelum mencoba lagi.'))};xhr.send(JSON.stringify({event_id:event.id,expected_updated_at:event.updated_at,png_base64}))})
 if(!result||typeof result!=='object'||!('image_path'in result))throw Error('Hasil upload belum dikonfirmasi.')
 return result
}
export async function revokeEventImage(eventId:string,expectedUpdatedAt:string){
 await authorize('/admin/kejadian',true)
 const {data,error}=await supabase.rpc('revoke_event_image_v1',{p_event_id:eventId,p_expected_updated_at:expectedUpdatedAt})
 if(error)throw error
 if(data!==true)throw Error('Pencabutan gambar belum dikonfirmasi.')
}
