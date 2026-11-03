export type GatewayConfig = { allowedOrigins: string[]; hostnames: string[]; quotaMode: 'dev-global'; enabled: boolean; issues: string[] }
// Reserved development bucket, shared by every caller and every worker restart.
// This is not a secret or a client identity. RPC p_action separates submit/track.
export const DEV_GLOBAL_QUOTA_HASH = '0'.repeat(64)
const placeholder = (value: string) => /replace[_ -]|change[_ -]?me|not.configured/i.test(value)
function validServiceKey(value: string) {
  if (/^sb_secret_[A-Za-z0-9_-]+$/.test(value)) return true
  try { const payload = value.split('.')[1]; return value.split('.').length === 3 && JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role' } catch { return false }
}
export function readGatewayConfig(env: (name: string) => string): GatewayConfig {
  const issues: string[] = []
  const origins = env('REPORT_ALLOWED_ORIGINS').split(',').map(value => value.trim()).filter(Boolean)
  const hostnames = env('TURNSTILE_HOSTNAMES').split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
  if (env('SUPABASE_URL') !== 'https://uiuiouosblyuqgnvfpeh.supabase.co') issues.push('SUPABASE_URL')
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env('REPORT_PUBLIC_KEY')) || placeholder(env('REPORT_PUBLIC_KEY'))) issues.push('REPORT_PUBLIC_KEY')
  // This checks key type, not its signature or ownership; Supabase verifies it on requests.
  if (!validServiceKey(env('SUPABASE_SERVICE_ROLE_KEY'))) issues.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!env('TURNSTILE_SECRET_KEY') || placeholder(env('TURNSTILE_SECRET_KEY'))) issues.push('TURNSTILE_SECRET_KEY')
  if (!origins.length || origins.some(origin => { try { const url = new URL(origin); return url.origin !== origin || !['http:', 'https:'].includes(url.protocol) || url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) } catch { return true } })) issues.push('REPORT_ALLOWED_ORIGINS')
  if (!hostnames.length || hostnames.some(hostname => { try { const url = new URL('https://' + hostname); return url.hostname !== hostname || url.host !== hostname || url.pathname !== '/' || !!url.username || !!url.password || !!url.search || !!url.hash || hostname.includes('*') } catch { return true } })) issues.push('TURNSTILE_HOSTNAMES')
  // No forwarding header is trusted in development. Legacy IP/HMAC settings
  // are intentionally not read; neither can change or rotate the shared bucket.
  return { allowedOrigins: origins, hostnames, quotaMode: 'dev-global', enabled: env('REPORT_GATEWAY_ENABLED') === 'true' && issues.length === 0, issues }
}
export function verifiedChallenge(result: unknown, action: string, hostnames: readonly string[]) {
  if (!result || typeof result !== 'object') return false
  const value = result as Record<string, unknown>
  return value.success === true && value.action === action && typeof value.hostname === 'string' && !!value.hostname && hostnames.includes(value.hostname.toLowerCase())
}
