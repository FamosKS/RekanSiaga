import { publicSupabase } from '../../lib/supabase'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export type SosStatus = 'received' | 'seen' | 'reviewing' | 'closed'
export type SosRelayReceipt = { reference_code: string; received_at: string; status: SosStatus }
export type SosPublicStatus = { reference_code: string; status: SosStatus; received_at: string; updated_at: string; history: Array<{ status: SosStatus; changed_at: string }> }
export type SosSubmission = {
  idempotency_key: string
  access_credential: string
  report: { description: string; latitude: number | null; longitude: number | null; accuracy_m: number | null; location_captured_at: string | null; battery_percent: number | null; charging: boolean | null; online: boolean; network_type: string | null; contact_name: string | null; contact_phone: string | null; consent_version: 'sos-consent-v1' }
  consent: true
}

export type SosAdminRequest = { id: string; reference_code: string; status: SosStatus; received_at: string; updated_at: string; latitude: number | null; longitude: number | null; accuracy_m: number | null; description: string; contact_name: string | null; contact_phone: string | null; battery_percent: number | null; charging: boolean | null; device_online: boolean; network_type: string | null }

const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sos-relay`
export const sosRelayEnabled = import.meta.env.VITE_SOS_RELAY_ENABLED === 'true'
export const sosAdminEnabled = import.meta.env.VITE_SOS_ADMIN_ENABLED === 'true'

export function useSosResumeRefresh() {
  const client = useQueryClient()
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible' && navigator.onLine) void client.invalidateQueries({ queryKey: ['admin-sos'] }) }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('online', refresh) }
  }, [client])
}

export function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

async function relay<T>(body: Record<string, unknown>): Promise<T> {
  const { data: { session } } = await publicSupabase.auth.getSession()
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, ...(session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15_000), cache: 'no-store',
  })
  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new Error(response.status === 429 ? 'Terlalu banyak percobaan. Hubungi layanan resmi bila situasi darurat.' : response.status >= 500 ? 'Status pengiriman belum dapat dipastikan. Jangan kirim ulang; hubungi layanan resmi.' : 'Permintaan tidak dapat diproses. Hubungi layanan resmi bila perlu bantuan segera.')
  return result as T
}

export function submitSos(payload: SosSubmission) { return relay<SosRelayReceipt>({ action: 'submit', ...payload }) }
export function trackSos(accessCredential: string) { return relay<SosPublicStatus>({ action: 'track', access_credential: accessCredential }) }
export function revokeSos(accessCredential: string) { return relay<{ accepted: true }>({ action: 'revoke', access_credential: accessCredential }) }
export function listAdminSos() { return relay<{ requests: SosAdminRequest[] }>({ action: 'admin_list' }) }
export function getAdminSos(id: string) { return relay<{ request: SosAdminRequest; history: Array<{ status: SosStatus; changed_at: string; note: string | null }> }>({ action: 'admin_detail', request_id: id }) }
export function updateAdminSos(id: string, expectedUpdatedAt: string, status: SosStatus, note: string) { return relay<{ updated_at: string }>({ action: 'admin_update', request_id: id, expected_updated_at: expectedUpdatedAt, status, note }) }
