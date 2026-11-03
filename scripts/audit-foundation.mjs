import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import React from 'react'
import { renderToString } from 'react-dom/server'
import * as routing from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const read = name => readFileSync(path.join(root, name), 'utf8')
function filesIn(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(folder, entry.name)
    return entry.isDirectory() ? filesIn(name) : [name]
  })
}
const sources = filesIn(path.join(root, 'src')).filter(name => /\.tsx?$/.test(name))
const graph = new Map()
let localEdges = 0
for (const file of sources) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true)
  const edges = []
  function visit(node) {
    let specifier
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifier = node.moduleSpecifier.text
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) specifier = node.arguments[0].text
    if (specifier?.startsWith('.')) {
      const target = ts.resolveModuleName(specifier, file, { moduleResolution: ts.ModuleResolutionKind.Bundler, allowArbitraryExtensions: true }, ts.sys).resolvedModule?.resolvedFileName
      if (specifier.endsWith('.css')) assert.ok(existsSync(path.resolve(path.dirname(file), specifier)))
      else { assert.ok(target, `Broken import: ${path.relative(root, file)} -> ${specifier}`); edges.push(path.normalize(target)); localEdges++ }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  graph.set(path.normalize(file), edges)
}
const done = new Set()
const active = new Set()
function visitGraph(file) {
  assert.ok(!active.has(file), `Circular dependency: ${path.relative(root, file)}`)
  if (done.has(file)) return
  active.add(file)
  for (const edge of graph.get(file) ?? []) visitGraph(edge)
  active.delete(file); done.add(file)
}
for (const file of graph.keys()) visitGraph(file)
console.log(`PASS architecture: ${sources.length} TypeScript modules, ${localEdges} local import edges; no broken imports or cycles.`)

// Execute real TS/TSX components and their local imports. Only Supabase and
// createBrowserRouter are replaced. Never load .env files or contact a service.
const cache = new Map()
function load(file) {
  file = path.resolve(root, file)
  if (cache.has(file)) return cache.get(file)
  if (file === path.join(root, 'src/lib/supabase.ts')) {
    const blocked = () => { throw new Error('Unexpected backend operation during render audit') }
    return { supabase: { auth: { signInWithPassword: blocked, signOut: blocked, getSession: blocked, onAuthStateChange: blocked }, from: blocked, rpc: blocked } }
  }
  const exports = {}
  cache.set(file, exports)
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
  const localRequire = name => {
    if (name === 'react-router-dom') return { ...routing, createBrowserRouter: routes => routes }
    if (!name.startsWith('.')) return require(name)
    const base = path.resolve(path.dirname(file), name)
    const target = [base, base + '.ts', base + '.tsx'].find(candidate => existsSync(candidate))
    assert.ok(target, `Missing render dependency: ${name}`)
    return load(target)
  }
  new vm.Script(code, { filename: file }).runInNewContext({ exports, require: localRequire, console, setTimeout, clearTimeout, URL, AbortController })
  return exports
}
const routes = load('src/app/router/router.tsx').router
async function resolveLazy(items) {
  for (const route of items) {
    if (route.lazy) { Object.assign(route, await route.lazy()); delete route.lazy }
    if (route.children) await resolveLazy(route.children)
  }
}
await resolveLazy(routes)
const paths = new Set()
function validatePaths(items, parent = '') {
  for (const route of items) {
    const full = route.index ? parent : route.path ? (route.path.startsWith('/') ? route.path : `${parent}/${route.path}`) : parent
    if (route.index || (route.path && !route.children)) {
      assert.ok(!paths.has(full), `Duplicated route: ${full}`)
      paths.add(full)
    }
    if (route.children) validatePaths(route.children, full)
  }
}
validatePaths(routes)
const navigation = load('src/app/router/navigation.ts')
for (const item of [...navigation.publicNavigation, ...navigation.adminNavigation]) {
  const matches = routing.matchRoutes(routes, item.to)
  assert.ok(matches && matches.at(-1).route.path !== '*', `Broken navigation: ${item.to}`)
}
assert.ok(routes.find(route => route.path === '/admin/login').errorElement)
console.log(`PASS routing: ${paths.size} unique route patterns, all lazy exports resolve, all navigation targets match, login error boundary present.`)

const { AuthContext } = load('src/features/auth/AuthContext.ts')
const auth = { loading: false, session: null, error: null }
function render(url, customRoutes = routes) {
  const router = routing.createMemoryRouter(customRoutes, { initialEntries: [url] })
  const query = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  try {
    return renderToString(React.createElement(QueryClientProvider, { client: query }, React.createElement(AuthContext.Provider, { value: auth }, React.createElement(routing.RouterProvider, { router }))))
  } finally { router.dispose(); query.clear() }
}
const urls = ['/', '/informasi', '/informasi/artikel-uji', '/pemantauan', '/pemantauan/id-uji', '/peta', '/laporan', '/laporan/lacak', '/donasi', '/panduan', '/panduan/id-uji', '/darurat', '/403', '/tidak-ada', '/admin/login']
for (const url of urls) {
  const html = render(url)
  assert.ok(html.includes('<h1'), `Page heading missing: ${url}`)
  assert.ok(!html.includes('Unexpected Application Error'), url)
  if (url !== '/admin/login') assert.ok(html.includes('id="main-content"'), url)
  else assert.ok(!html.includes('site-header'), 'Login must have independent layout')
  for (const [, href] of html.matchAll(/href="([^"#]+)"/g)) {
    if (href.startsWith('/')) assert.ok(routing.matchRoutes(routes, href).at(-1).route.path !== '*', `Broken rendered link: ${href}`)
  }
}
for (const url of ['/informasi/a%2Fb', '/pemantauan/%3Cscript%3E', '/panduan/' + 'x'.repeat(129)]) assert.ok(render(url).includes('Parameter tidak valid'), url)
for (const url of ['/informasi/', '/pemantauan/', '/panduan/']) assert.ok(render(url).includes('<h1'), url)
assert.ok(render('/tidak-ada').includes('404'))
assert.ok(render('/donasi').includes('Tidak melibatkan pembayaran nyata'))

// Admin presentation is rendered in an isolated test layout, without altering
// production guards. Authorization branches are covered by check-foundation.mjs.
const adminLayoutRoute = routes.find(route => route.path === '/admin').children[0].children[0]
const adminUrls = ['/admin', '/admin/laporan', '/admin/laporan/id-uji', '/admin/kejadian', '/admin/artikel', '/admin/panduan', '/admin/kontak-darurat', '/admin/staf', '/admin/notifikasi', '/admin/sumber-data', '/admin/pengaturan']
const presentationRoutes = [{ path: '/admin', element: adminLayoutRoute.element, children: adminLayoutRoute.children }]
for (const url of adminUrls) {
  const html = render(url, presentationRoutes)
  assert.ok(html.includes('id="admin-main"') && html.includes('<h1'), url)
  assert.ok(!html.includes('site-header'), url)
  assert.ok(html.includes('aria-expanded="false"') && html.includes('aria-controls="admin-sidebar"') && html.includes('id="admin-sidebar"'), 'Admin menu must expose its state and target')
}
assert.ok(render('/admin/laporan/a%2Fb', presentationRoutes).includes('Pengenal laporan tidak valid.'))
const { MapScaffold } = load('src/features/maps/MapScaffold.tsx')
assert.ok(renderToString(React.createElement(MapScaffold, { state: { status: 'loading' } })).includes('role="status"'))
assert.ok(renderToString(React.createElement(MapScaffold, { state: { status: 'error', message: 'Map unavailable' } })).includes('role="alert"'))
const { DataTable } = load('src/components/shared/DataTable.tsx')
for (const extra of [{ loading: true }, { error: 'Backend unavailable' }, {}]) assert.ok(renderToString(React.createElement(DataTable, { title: 'Audit', columns: [{ key: 'status', label: 'Status', render: row => row.status }], rows: [], rowKey: row => row.id, ...extra })).length > 0)
console.log(`PASS render smoke: ${urls.length} public/login URLs, ${adminUrls.length} isolated admin pages, invalid/missing parameters, 404, links, map/admin loading-empty-error states. No browser effects or backend connection tested.`)

// Run the real preference effect against a minimal dataset to reproduce direct
// admin/login startup without mounting PublicLayout or its dialog.
const preferences = { textSize: 'extra', highContrast: true, reducedMotion: true }
const dataset = {}
const hookSource = ts.transpileModule(read('src/hooks/useAccessibilityPreferences.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const hookExports = {}
new vm.Script(hookSource).runInNewContext({ exports: hookExports, document: { documentElement: { dataset } }, require: name => name === 'react' ? { useEffect: effect => effect() } : { useAccessibilityStore: () => preferences } })
hookExports.useAccessibilityPreferences()
assert.equal(dataset.textSize, 'extra')
assert.equal(dataset.contrast, 'true')
assert.equal(dataset.reducedMotion, 'true')
assert.ok(read('src/app/providers/AppProviders.tsx').includes('  useAccessibilityPreferences()'))
console.log('PASS accessibility: stored preferences effect applies globally, independent of PublicLayout.')

// Inspect the existing client contract with synthetic inputs only. This is not
// a connectivity or RLS test and never reads real environment values.
const clientCode = ts.transpileModule(read('src/lib/supabase.ts').replaceAll('import.meta.env', 'auditEnvironment'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
function evaluateClient(auditEnvironment) {
  const exports = {}
  const calls = []
  new vm.Script(clientCode).runInNewContext({ exports, auditEnvironment, require: () => ({ createClient: (...args) => { calls.push(args); return { marker: 'audit-client' } } }) })
  return { exports, calls }
}
assert.throws(() => evaluateClient({}), /Konfigurasi Supabase belum tersedia/)
assert.throws(() => evaluateClient({ VITE_SUPABASE_URL: 'https:\/\/audit.invalid' }), /Konfigurasi Supabase belum tersedia/)
assert.throws(() => evaluateClient({ VITE_SUPABASE_PUBLISHABLE_KEY: 'audit-publishable-placeholder' }), /Konfigurasi Supabase belum tersedia/)
const client = evaluateClient({ VITE_SUPABASE_URL: 'https:\/\/audit.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'audit-publishable-placeholder' })
assert.equal(client.calls.length, 1)
assert.equal(client.exports.supabase.marker, 'audit-client')
assert.ok(existsSync(path.join(root, '.env.local')))
assert.ok(read('.gitignore').includes('*.local'))
const manifest = JSON.parse(read('package.json'))
const lock = JSON.parse(read('package-lock.json'))
assert.deepEqual(manifest.dependencies, lock.packages[''].dependencies)
assert.deepEqual(manifest.devDependencies, lock.packages[''].devDependencies)
console.log('PASS config: Supabase client fail-fast/singleton contract with synthetic values, .env.local exists and is ignored, package manifest matches lockfile. Live connectivity and RLS not tested.')

// Design-system contracts: accidental form submission, invalid field semantics,
// and loading actions are regressions that static page matching cannot catch.
const { Button } = load('src/components/ui/Button.tsx')
const defaultButton = renderToString(React.createElement(Button, null, 'Periksa'))
assert.ok(defaultButton.includes('type="button"'))
const busyButton = renderToString(React.createElement(Button, { loading: true }, 'Memproses'))
assert.ok(busyButton.includes('disabled=""') && busyButton.includes('aria-busy="true"'))
for (const [componentName, tag] of [['Input', 'input'], ['Textarea', 'textarea'], ['Select', 'select']]) {
  const Component = load(`src/components/ui/${componentName}.tsx`)[componentName]
  const html = renderToString(React.createElement(Component, { id: 'field-audit', label: 'Label uji', hint: 'Petunjuk', error: 'Kesalahan uji' }, componentName === 'Select' ? React.createElement('option', { value: 'test' }, 'Pilihan uji') : undefined))
  assert.ok(html.includes(`<${tag}`) && html.includes('for="field-audit"'))
  assert.ok(html.includes('aria-invalid="true"') && html.includes('aria-describedby="field-audit-hint field-audit-error"'))
  assert.ok(html.includes('id="field-audit-hint"') && html.includes('id="field-audit-error"'))
}
const { Dialog } = load('src/components/ui/Dialog.tsx')
const dialogHtml = renderToString(React.createElement(Dialog, { open: false, onClose: () => {}, title: 'Dialog uji', description: 'Deskripsi uji' }, 'Konten uji'))
assert.ok(dialogHtml.includes('<dialog') && dialogHtml.includes('aria-labelledby=') && dialogHtml.includes('aria-describedby='))
const { Skeleton } = load('src/components/ui/Skeleton.tsx')
assert.ok(renderToString(React.createElement(Skeleton)).includes('aria-hidden="true"'))
const { Card } = load('src/components/ui/Card.tsx')
assert.ok(renderToString(React.createElement(Card, { as: 'section' }, 'Konten')).startsWith('<section'))
const { Badge } = load('src/components/ui/Badge.tsx')
const { Alert } = load('src/components/ui/Alert.tsx')
for (const tone of ['neutral', 'primary', 'success', 'warning', 'danger']) {
  assert.ok(renderToString(React.createElement(Badge, { tone }, 'Label uji')).includes(`rs-tone--${tone}`))
  assert.ok(renderToString(React.createElement(Alert, { tone }, 'Pesan uji')).includes(tone === 'danger' ? 'role="alert"' : 'role="status"'))
}
const tokenText = read('src/styles/tokens.css')
const colors = Object.fromEntries([...tokenText.matchAll(/--([\w-]+): (#[0-9a-f]{6});/g)].map(([, key, value]) => [key, value]))
function luminance(hex) {
  const rgb = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
}
for (const [foreground, background] of [['primary', 'on-primary'], ['danger-fill', 'on-danger'], ['muted', 'background'], ['muted', 'surface'], ['danger', 'danger-soft'], ['success', 'success-soft']]) {
  const values = [luminance(colors[foreground]), luminance(colors[background])].sort((a, b) => a - b)
  assert.ok((values[1] + .05) / (values[0] + .05) >= 4.5, `Insufficient text contrast: ${foreground}/${background}`)
}
console.log('PASS design system: button submission/loading contracts, field label/error relations, dialog markup, skeleton semantics, badge/alert tones, selected text color pairs >= 4.5:1. Browser interaction evidence is collected separately by smoke-public-browser.mjs.')

const { reportSchema, trackingSchema } = load('src/features/reports/reportSchema.ts')
const validDraft = { type: 'Banjir', title: 'Draf uji lokal', description: 'Contoh teks uji validasi frontend, bukan kejadian aktual.', region: 'Wilayah uji', location: 'Alamat uji lokal', privacy: true }
assert.equal(reportSchema.safeParse(validDraft).success, true)
for (const override of [{ title: '     ' }, { description: ' '.repeat(30) }, { region: '' }, { location: '' }, { privacy: false }, { type: 'invalid-kind' }]) assert.equal(reportSchema.safeParse({ ...validDraft, ...override }).success, false)
assert.equal(trackingSchema.safeParse({ code: 'qa_tracking_123', token: 'qa-local-placeholder-token-not-real' }).success, true)
assert.equal(trackingSchema.safeParse({ code: 'short', token: 'short' }).success, false)
const { safeExternalUrl, safePhone, formatDate } = load('src/lib/publicFormatting.ts')
assert.equal(safeExternalUrl('javascript:alert(1)'), undefined)
assert.equal(safeExternalUrl('https://example.invalid/source'), 'https://example.invalid/source')
assert.equal(safePhone('javascript:alert(1)'), undefined)
assert.equal(formatDate('not-a-date'), 'Waktu belum tersedia')
const content = load('src/lib/publicContent.ts')
for (const collection of ['articles', 'disasters', 'guides', 'emergencyContacts', 'eventStatusOptions', 'regionOptions']) assert.equal(content[collection].length, 0)
const { ContentSection } = load('src/components/shared/ContentSection.tsx')
assert.ok(renderToString(React.createElement(ContentSection, { empty: 'Tidak ada data', state: 'loading' })).includes('role="status"'))
assert.ok(renderToString(React.createElement(ContentSection, { empty: 'Tidak ada data', state: 'error' })).includes('role="alert"'))
assert.ok(renderToString(React.createElement(ContentSection, { empty: 'Tidak ada data' })).includes('Tidak ada data'))
console.log('PASS Phase 3B: draft/tracking schema edge cases, safe external URL/phone formatting, empty public datasets, reusable loading/empty/error states.')
