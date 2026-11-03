// Optional, read-only anonymous probe. Never submits credentials or mutates data.
import { loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync } from 'node:fs'
if (!process.argv.includes('--live-anon')) throw new Error('Use --live-anon to explicitly run read-only remote requests.')
const env = loadEnv('development', process.cwd(), 'VITE_')
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key || key.startsWith('sb_secret_')) throw new Error('Public Supabase configuration unavailable or invalid; no request sent.')
if (key.startsWith('eyJ')) {
  let role
  try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role } catch { /* reject below */ }
  if (role !== 'anon') throw new Error('Only a publishable/anon key may be used; no request sent.')
} else if (!key.startsWith('sb_publishable_')) throw new Error('Expected a publishable/anon key; no request sent.')
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(12_000) }) } })
const report = { kind: 'Anonymous read-only probe; not a catalog or authenticated RLS audit', tables: [] }
for (const [table, columns] of [['staff_profiles','user_id,is_active'], ['staff_role_assignments','staff_id,role_id'], ['roles','id,code']]) {
  const { data, error, status } = await supabase.from(table).select(columns).limit(1)
  const visible = Array.isArray(data) && data.length > 0
  const outcome = error ? ['42501','PGRST301'].includes(error.code) ? 'access_denied' : status === 0 ? 'network_unavailable' : 'request_failed' : visible ? 'anonymous_rows_visible_review_required' : 'no_rows_visible_not_proof_of_rls'
  report.tables.push({ table, status, outcome, code: error?.code || null })
  console.log(`${table}: ${outcome} (HTTP ${status})`)
}
mkdirSync('docs/qa/phase4a', { recursive: true })
writeFileSync('docs/qa/phase4a/anonymous-probe.json', JSON.stringify(report, null, 2))
if (report.tables.some(table => table.outcome === 'anonymous_rows_visible_review_required')) process.exitCode = 1
