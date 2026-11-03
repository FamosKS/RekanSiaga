// Explicit opt-in. GET and endpoint OPTIONS only; never invoke RPCs or write data.
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer, loadEnv } from 'vite'
import { createClient } from '@supabase/supabase-js'

if (!process.argv.includes('--live-readonly')) throw Error('Use --live-readonly for dev GET requests.')
const env = loadEnv('development', process.cwd(), 'VITE_')
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const report = { kind: 'Live dev read-only GET/OPTIONS; not authenticated RLS/catalog acceptance', projectRef: 'uiuiouosblyuqgnvfpeh', checkedAt: new Date().toISOString(), phase4a: 'BLOCKED', identity: { responseHost: null, observedProjectRef: null, managementProjectName: 'NOT_VERIFIED' }, publicReads: [], deniedReads: [], endpointChecks: [], catalog: 'NOT_VERIFIED: no SQL connection provided', authenticatedCrud: 'NOT_RUN: approval and authorized dev session required', remoteWrites: 0 }
try {
  const { validateDevelopmentEnvironment } = await server.ssrLoadModule('/src/lib/environment.ts')
  const config = validateDevelopmentEnvironment(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
  for (const [endpoint, method] of [['/auth/v1/settings', 'GET'], ['/rest/v1/articles?select=id&limit=0', 'GET'], ['/functions/v1/report-gateway', 'OPTIONS']]) {
    try {
      const response = await fetch(config.url + endpoint, { method, headers: { apikey: config.key }, redirect: 'error', signal: AbortSignal.timeout(12000) })
      const observedRef = response.headers.get('sb-project-ref') ?? response.headers.get('x-supabase-project-ref')
      if (observedRef && observedRef !== report.projectRef) { await response.body?.cancel(); throw Object.assign(new Error('Project identity mismatch; probe stopped'), { code: 'PROJECT_REF_MISMATCH' }) }
      report.identity.responseHost = new URL(response.url).hostname
      if (observedRef) report.identity.observedProjectRef = observedRef
      report.endpointChecks.push({ endpoint, method, status: response.status, note: 'Reachability only; no login, RPC invocation, or deployment-version proof' }); await response.body?.cancel()
    }
    catch (error) { if (error.code === 'PROJECT_REF_MISMATCH') throw error; report.endpointChecks.push({ endpoint, method, status: 'NETWORK_UNAVAILABLE' }) }
  }
  const readOnlyFetch = (url, init) => {
    if ((init?.method ?? 'GET').toUpperCase() !== 'GET') throw Error('Probe permits GET only')
    return fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(12000) })
  }
  // The application service is loaded unchanged; enforce GET at the client boundary.
  const { publicSupabase: supabase } = await server.ssrLoadModule('/src/lib/supabase.ts')
  const transport = supabase.rest.fetch
  supabase.rest.fetch = (url, init) => {
    if ((init?.method ?? 'GET').toUpperCase() !== 'GET') throw Error('Probe permits GET only')
    return transport(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(12000) })
  }
  const service = await server.ssrLoadModule('/src/features/content/contentService.ts')
  const maps = await server.ssrLoadModule('/src/features/maps/mapService.ts')
  for (const [name, read] of [['articles', service.listPublishedArticles], ['mitigation_guides', service.listPublishedGuides], ['disaster_events', service.listPublishedDisasters], ['emergency_contacts', service.listVerifiedContacts], ['event_locations', maps.listPublicMapLocations], ['relief_locations', maps.listPublicRelief]]) {
    try { const rows = await read(); report.publicReads.push({ table: name, outcome: 'PASS', visibleRows: rows.length }) }
    catch (error) { report.publicReads.push({ table: name, outcome: 'FAIL', code: error.code ?? error.name }); process.exitCode = 1 }
  }
  const client = createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: readOnlyFetch } })
  for (const table of ['staff_profiles', 'staff_role_assignments', 'roles', 'public_reports', 'report_access_tokens', 'audit_logs', 'app_settings', 'notification_rules', 'notifications', 'source_sync_logs']) {
    const column = table === 'staff_profiles' ? 'user_id' : table === 'staff_role_assignments' ? 'staff_id' : table === 'app_settings' ? 'key' : 'id'
    const { error, status } = await client.from(table).select(column).limit(0)
    report.deniedReads.push({ table, status, code: error?.code ?? null, outcome: error?.code === '42501' ? 'DENIED_AS_EXPECTED' : 'REVIEW_REQUIRED' })
    if (error?.code !== '42501') process.exitCode = 1
  }
} finally {
  await server.close()
  mkdirSync('docs/qa/mvp', { recursive: true })
  writeFileSync('docs/qa/mvp/dev-readonly.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}
