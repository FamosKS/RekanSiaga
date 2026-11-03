import type { SupabaseClient, Session } from '@supabase/supabase-js'
import type { AuthState } from '../../types/auth'
// A synchronous listener schedules validation outside the auth callback/SDK lock.
export function observeAuthentication(auth: SupabaseClient['auth'], publish: (state: AuthState) => void, resetPrivateCache: () => void) {
  let active = true
  let generation = 0
  let principal: string | null | undefined
  let identityRevision = 0
  let accepted: AuthState | undefined
  let eventReceived = false
  let scheduled: ReturnType<typeof setTimeout> | undefined
  let expiry: ReturnType<typeof setTimeout> | undefined
  let deadline: ReturnType<typeof setTimeout> | undefined
  function clearTimers() { clearTimeout(scheduled); clearTimeout(expiry); clearTimeout(deadline) }
  function accept(session: Session | null) {
    if (!active) return
    const check = ++generation
    clearTimers()
    const nextPrincipal = session?.user.id ?? null
    if (principal !== nextPrincipal) {
      principal = nextPrincipal; identityRevision++; accepted = undefined
      resetPrivateCache()
    }
    const empty = { session: null, user: null, loading: false, error: null, revision: identityRevision }
    function deny(error: string | null = null) {
      accepted = undefined; resetPrivateCache(); publish({ ...empty, error })
    }
    if (!session) { accepted = undefined; publish(empty); return }
    const remainingAccepted = (accepted?.session?.expires_at ?? 0) * 1000 - Date.now()
    if (accepted?.user?.id === session.user.id && remainingAccepted > 0) {
      expiry = setTimeout(() => { if (active && generation === check) accept(null) }, Math.min(remainingAccepted, 2_147_483_647))
    } else publish({ ...empty, loading: true })
    deadline = setTimeout(() => {
      if (active && generation === check) { generation++; clearTimeout(expiry); deny('Pemeriksaan sesi melewati batas waktu. Muat ulang untuk mencoba kembali.') }
    }, 15_000)
    scheduled = setTimeout(() => {
      void auth.getUser(session.access_token).then(({ data, error }) => {
        if (!active || generation !== check) return
        clearTimeout(deadline)
        if (error || !data.user || data.user.id !== session.user.id) {
          clearTimeout(expiry); deny(error && error.status !== 401 && error.status !== 403 ? 'Sesi tidak dapat diverifikasi. Silakan masuk kembali atau periksa koneksi.' : null)
          return
        }
        const remaining = typeof session.expires_at === 'number' ? session.expires_at * 1000 - Date.now() : 0
        if (remaining <= 0) { clearTimeout(expiry); deny(); return }
        accepted = { session: { ...session, user: data.user }, user: data.user, loading: false, error: null, revision: identityRevision }
        publish(accepted)
        clearTimeout(expiry)
        expiry = setTimeout(() => { if (active && generation === check) accept(null) }, Math.min(remaining, 2_147_483_647))
      }).catch(() => {
        if (active && generation === check) { clearTimeout(deadline); clearTimeout(expiry); deny('Layanan autentikasi tidak tersedia. Silakan muat ulang.') }
      })
    }, 0)
  }
  deadline = setTimeout(() => {
    if (active && !eventReceived && generation === 0) { generation++; publish({ session: null, user: null, loading: false, error: 'Pemeriksaan sesi melewati batas waktu. Silakan muat ulang.', revision: generation }) }
  }, 15_000)
  const { data: { subscription } } = auth.onAuthStateChange((_event, session) => { eventReceived = true; accept(session) })
  const initialRevision = generation
  void auth.getSession().then(({ data, error }) => {
    if (!active || eventReceived || generation !== initialRevision) return
    if (error) { clearTimeout(deadline); publish({ session: null, user: null, loading: false, error: 'Sesi tidak dapat diperiksa. Silakan muat ulang.', revision: ++generation }); return }
    accept(data.session)
  }).catch(() => {
    if (active && !eventReceived && generation === initialRevision) { clearTimeout(deadline); publish({ session: null, user: null, loading: false, error: 'Layanan autentikasi tidak tersedia.', revision: ++generation }) }
  })
  return () => { active = false; generation++; clearTimers(); subscription.unsubscribe() }
}
