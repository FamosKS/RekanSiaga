import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { publicationCors } from '../_shared/publicationCors.ts'
import { sanitizeArticlePng } from '../_shared/articleImage.ts'
const runtime=(globalThis as unknown as {Deno:{env:{get:(key:string)=>string|undefined};serve:(handler:(request:Request)=>Promise<Response>)=>void}}).Deno
const env=(key:string)=>runtime.env.get(key)??''
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:publicationCors})
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value)
runtime.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:publicationCors})
 if(request.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405)
 let path:string|undefined
 try{
  const authorization=request.headers.get('Authorization')??'',key=request.headers.get('apikey')??'',url=env('SUPABASE_URL')
  if(!/^Bearer\s+\S+$/i.test(authorization)||!key)return reply({error:'UNAUTHORIZED'},401)
  if(url!=='https://uiuiouosblyuqgnvfpeh.supabase.co')return reply({error:'MEDIA_NOT_READY'},503)
  const user=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}})
  const {data:identity,error:identityError}=await user.auth.getUser()
  if(identityError||!identity.user)return reply({error:'UNAUTHORIZED'},401)
  const {data:role,error:roleError}=await user.rpc('has_staff_role',{p_codes:['super_admin','information_manager']})
  if(roleError||role!==true)return reply({error:'FORBIDDEN'},403)
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'INVALID_IMAGE'},415)
  const reader=request.body?.getReader();if(!reader)return reply({error:'INVALID_IMAGE'},400)
  const chunks:Uint8Array[]=[];let size=0
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>7*1024*1024){await reader.cancel();return reply({error:'IMAGE_TOO_LARGE'},413)}chunks.push(value)}
  const bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length}
  const parsed:unknown=JSON.parse(new TextDecoder().decode(bytes))
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return reply({error:'INVALID_IMAGE'},400)
  const body=parsed as {event_id?:unknown;expected_updated_at?:unknown;png_base64?:unknown}
  if(!uuid(body.event_id)||typeof body.expected_updated_at!=='string'||Number.isNaN(Date.parse(body.expected_updated_at))||typeof body.png_base64!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.png_base64))return reply({error:'INVALID_IMAGE'},400)
  const safe=sanitizeArticlePng(Uint8Array.from(atob(body.png_base64),c=>c.charCodeAt(0)))
  const {data:prepared,error:prepareError}=await user.rpc('prepare_event_image_v1',{p_event_id:body.event_id,p_expected_updated_at:body.expected_updated_at})
  if(prepareError||typeof prepared!=='string')return reply({error:prepareError?.code==='40001'?'VERSION_CONFLICT':'MEDIA_NOT_READY'},409)
  path=prepared
  const admin=createClient(url,env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}})
  const {error:uploadError}=await admin.storage.from('event-media').upload(path,safe,{contentType:'image/png',upsert:false,cacheControl:'60'})
  if(uploadError){if('statusCode'in uploadError&&/^4\d\d$/.test(String(uploadError.statusCode)))await user.rpc('abort_event_image_v1',{p_storage_path:path});return reply({error:'UPLOAD_UNCONFIRMED'},503)}
  const {data:committed,error:commitError}=await user.rpc('commit_event_image_v1',{p_event_id:body.event_id,p_expected_updated_at:body.expected_updated_at,p_storage_path:path})
  if(commitError||committed!==true){if(commitError&&/^\d{5}$/.test(commitError.code??'')){await admin.storage.from('event-media').remove([path]);await user.rpc('abort_event_image_v1',{p_storage_path:path})}return reply({error:commitError?.code==='40001'?'VERSION_CONFLICT':'COMMIT_UNCONFIRMED'},409)}
  return reply({event_id:body.event_id,image_path:`event-media/${path}`},201)
 }catch(error){const invalid=error instanceof SyntaxError||error instanceof Error&&error.message==='INVALID_IMAGE'||error instanceof DOMException&&error.name==='InvalidCharacterError';return reply({error:invalid?'INVALID_IMAGE':path?'COMMIT_UNCONFIRMED':'MEDIA_UNAVAILABLE'},invalid?400:503)}
})
