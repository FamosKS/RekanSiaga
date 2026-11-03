import { createClient } from '@supabase/supabase-js'
import { validateDevelopmentEnvironment } from './environment'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const config = validateDevelopmentEnvironment(supabaseUrl, supabaseKey)

export const supabase = createClient(
  config.url,
  config.key,
  { global: { fetch: (input, init) => {
    const timeout = AbortSignal.timeout(12_000)
    return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout })
  } } }
)

// Public reads never inherit a staff session, even when an administrator opens the public site.
export const publicSupabase = createClient(config.url, config.key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'rekansiaga-public-anonymous' },
  global: { fetch: (input, init) => { const timeout = AbortSignal.timeout(12_000); return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout }) } },
})
