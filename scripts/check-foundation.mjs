import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { matchRoutes } from 'react-router-dom'

// Evaluate actual route/guard modules with isolated auth and component dependencies.
// No Supabase credentials, network, DOM, or database operations are involved.
const require = createRequire(import.meta.url)
function load(relative, mocks = {}) {
  const code = ts.transpileModule(readFileSync(new URL(relative, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  const mockedRequire = (name) => {
    if (name in mocks) return mocks[name]
    if (name.startsWith('.')) return new Proxy({}, { get: (_target, property) => String(property) })
    return require(name)
  }
  new vm.Script(code, { filename: relative }).runInNewContext({ exports, require: mockedRequire })
  return exports
}
const routes = load('../src/app/router/router.tsx', {
  'react-router-dom': { createBrowserRouter: value => value },
}).router
const publicUrls = ['/', '/informasi', '/informasi/artikel-uji', '/pemantauan', '/pemantauan/id-uji', '/peta', '/laporan', '/laporan/lacak', '/donasi', '/panduan', '/panduan/id-uji', '/darurat', '/403', '/halaman-tidak-ada']
const adminUrls = ['/admin', '/admin/laporan', '/admin/laporan/id-uji', '/admin/kejadian', '/admin/artikel', '/admin/panduan', '/admin/kontak-darurat', '/admin/staf', '/admin/notifikasi', '/admin/sumber-data', '/admin/pengaturan', '/admin/tidak-ada']
for (const url of publicUrls) {
  const matches = matchRoutes(routes, url)
  assert.ok(matches, url)
  assert.equal(matches[0].route.element.type, 'PublicLayout', url)
  assert.ok(!matches.some(match => match.route.element?.type === 'AdminLayout'), url)
}
for (const url of adminUrls) {
  const matches = matchRoutes(routes, url)
  assert.ok(matches, url)
  assert.deepEqual(matches.slice(0, 3).map(match => match.route.element.type), ['ProtectedRoute', 'RoleGuard', 'AdminLayout'], url)
}
const login = matchRoutes(routes, '/admin/login')
assert.equal(login.length, 1)
assert.ok(!login[0].route.element)
assert.equal(matchRoutes(routes, '/laporan/lacak').at(-1).route.path, '/laporan/lacak')
assert.equal(matchRoutes(routes, '/informasi/a/b').at(-1).route.path, '*')
assert.equal(matchRoutes(routes, '/pemantauan/a%2Fb').at(-1).params.id, 'a/b')

let auth = { loading: true, session: null, user: null, error: null, revision: 0 }
const { ProtectedRoute } = load('../src/features/auth/ProtectedRoute.tsx', {
  '../../hooks/useAuth': { useAuth: () => auth },
  'react-router-dom': { Navigate: 'Navigate', Outlet: 'Outlet', useLocation: () => ({ pathname: '/admin/laporan' }) },
})
assert.equal(ProtectedRoute().type, 'LoadingState')
auth = { ...auth, loading: false, error: 'unavailable' }
assert.equal(ProtectedRoute().type, 'ErrorState')
auth = { ...auth, error: null }
assert.equal(ProtectedRoute().props.to, '/admin/login')
assert.equal(ProtectedRoute().props.state.from, '/admin/laporan')
auth = { ...auth, session: { user: { id: 'test-user' } } }
assert.equal(ProtectedRoute().props.to, '/admin/login', 'Unverified stored session is insufficient')
auth = { ...auth, user: { id: 'test-user' } }
assert.equal(ProtectedRoute().type, 'Outlet')
let access = { isPending: true }
let pathname = '/admin'
const { canAccessAdminPath } = load('../src/features/auth/permissions.ts')
const { RoleGuard } = load('../src/features/auth/RoleGuard.tsx', {
  '../../hooks/useAuth': { useAuth: () => auth },
  './permissions': { canAccessAdminPath },
  './StaffAccessContext': { StaffAccessContext: { Provider: 'StaffAccessProvider' } },
  '@tanstack/react-query': { useQuery: () => access },
  'react-router-dom': { Navigate: 'Navigate', Outlet: 'Outlet', useLocation: () => ({ pathname }) },
})
assert.equal(RoleGuard().type, 'LoadingState')
access = { isPending: false, isError: true }
assert.equal(RoleGuard().type, 'ErrorState')
for (const data of [null, undefined, { userId: 'other', roles: ['super_admin'] }, { userId: 'test-user', roles: [] }]) {
  access = { isPending: false, isError: false, data }
  assert.equal(RoleGuard().props.to, '/403')
}
access = { isPending: false, isError: false, data: { userId: 'test-user', roles: ['super_admin'] } }
assert.equal(RoleGuard().type, 'StaffAccessProvider')
access.isFetching = true
assert.equal(RoleGuard().type, 'LoadingState', 'Hide admin while revalidating role')
access.isFetching = false
access.data.roles = ['report_verifier']
pathname = '/admin/artikel'
assert.equal(RoleGuard().props.to, '/403')
pathname = '/admin/laporan/id-uji'
assert.equal(RoleGuard().type, 'StaffAccessProvider')
auth = { ...auth, session: null, user: null }
assert.equal(RoleGuard().props.to, '/admin/login')
const { isValidIdentifier } = load('../src/lib/routeParams.ts')
for (const value of [undefined, '', 'a/b', '../admin', '<script>', 'a'.repeat(129)]) assert.equal(isValidIdentifier(value), false)
for (const value of ['article-1', 'id_123', 'a'.repeat(128)]) assert.equal(isValidIdentifier(value), true)
console.log(`PASS: ${publicUrls.length + adminUrls.length + 1} URL matches, separate layouts, auth guard branches, role guard branches, fail-closed verified-user/multi-role guards, dynamic parameter validation.`)
