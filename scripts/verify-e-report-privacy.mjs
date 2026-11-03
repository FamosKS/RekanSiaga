// Read-only anonymous HEAD; never retrieve private report values or credentials.
import { loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
const env = loadEnv('development', process.cwd(), 'VITE_')
const ref = 'uiuiouosblyuqgnvfpeh'
if (env.VITE_SUPABASE_URL !== `https://${ref}.supabase.co`) throw Error('Exact dev target required')
const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }) },
})
const result = await client.from('public_reports')
  .select('description,location_description,reviewed_by,reviewed_at', { head: true, count: 'exact' })
  .eq('id', '0f990f12-71d1-4a31-bad0-903eaf8dbb7d')
const pass = result.status === 200 && !result.error && result.count === 0
const proof = { at: new Date().toISOString(), projectRef: ref, kind: 'LIVE anonymous HEAD after operator deployment',
  status: pass ? 'PASS' : 'BLOCKED_OR_FAIL', http: result.status, errorCode: result.error?.code ?? null,
  privateColumnRowCount: result.count, bodyRead: false, authenticated: false }
writeFileSync('docs/qa/stage-e/live/report-privacy-after-deploy.json', JSON.stringify(proof, null, 2))
console.log(JSON.stringify(proof))
if (!pass) process.exitCode = 1
