import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const runtime = (globalThis as unknown as { Deno: { env: { get: (key: string) => string | undefined }; serve: (handler: (request: Request) => Promise<Response>) => void } }).Deno
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'apikey, x-client-info',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}
const response = (status: number) => new Response(null, { status, headers: cors })
const articleMediaPath = /^article-media\/articles\/([\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12})\/([\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12})\.png$/i

runtime.serve(async request => {
  if (request.method === 'OPTIONS') return response(204)
  if (request.method !== 'GET') return response(405)

  const slug = new URL(request.url).searchParams.get('slug')
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return response(404)

  const url = runtime.env.get('SUPABASE_URL') ?? ''
  const key = runtime.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (url !== 'https://uiuiouosblyuqgnvfpeh.supabase.co' || !key) return response(503)

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: article, error: articleError } = await admin.from('articles')
    .select('id,cover_image_path')
    .eq('slug', slug)
    .eq('publication_status', 'published')
    .not('published_at', 'is', null)
    .maybeSingle()
  if (articleError) return response(503)
  if (!article || !article.cover_image_path) return response(404)

  const match = articleMediaPath.exec(article.cover_image_path)
  if (!match || match[1].toLowerCase() !== article.id.toLowerCase()) return response(404)
  const storagePath = article.cover_image_path.slice('article-media/'.length)
  const { data, error: signingError } = await admin.storage.from('article-media').createSignedUrl(storagePath, 60)
  if (signingError || !data.signedUrl) return response(404)

  return new Response(null, { status: 302, headers: { ...cors, Location: data.signedUrl } })
})
