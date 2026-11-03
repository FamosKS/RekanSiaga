export const DEV_PROJECT_REF = 'uiuiouosblyuqgnvfpeh'
export const STAGING_PROJECT_REF = 'fweeyflixnqbvvceuent'

export function validateDevelopmentEnvironment(url: string | undefined, key: string | undefined) {
  if (!url || !key) throw new Error('Konfigurasi Supabase dev belum tersedia. Periksa environment lokal.')
  const target = new URL(url)
  if (target.protocol !== 'https:' || target.hostname !== `${DEV_PROJECT_REF}.supabase.co` || target.pathname !== '/' || target.username || target.password || target.port || target.search || target.hash) {
    throw new Error('Frontend development wajib menggunakan rekansiaga-dev. Environment ditolak.')
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) throw new Error('Gunakan publishable key dev. Secret dan service_role dilarang di frontend.')
  return { url: target.origin, key }
}
