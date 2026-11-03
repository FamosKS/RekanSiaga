import { z } from 'zod'
import { articlePayload, articleRowSchema, type ArticleInput, type ArticleRow } from './contracts'

const key = 'rekansiaga-demo-articles-v1'
const modeKey = 'rekansiaga-demo-mode-v1'
const event = 'rekansiaga-demo-change'
export function subscribeDemo(callback: () => void) {
  window.addEventListener(event, callback)
  window.addEventListener('storage', callback)
  return () => { window.removeEventListener(event, callback); window.removeEventListener('storage', callback) }
}
export function demoSnapshot() { try { return localStorage.getItem(key) ?? '[]' } catch { return '[]' } }
export function demoModeSnapshot() { try { return localStorage.getItem(modeKey) === 'simulation' } catch { return false } }
export function setDemoMode(enabled: boolean) { localStorage.setItem(modeKey, enabled ? 'simulation' : 'dev'); window.dispatchEvent(new Event(event)) }
export function readDemoArticles(snapshot = demoSnapshot()): ArticleRow[] { try { return z.array(articleRowSchema).parse(JSON.parse(snapshot)) } catch { return [] } }
export function saveDemoArticle(input: ArticleInput, existing?: ArticleRow) {
  const payload = articlePayload(input, existing?.published_at)
  const rows = readDemoArticles()
  if (rows.some(row => row.slug === payload.slug && row.id !== existing?.id)) throw { code: '23505' }
  const row: ArticleRow = { ...payload, id: existing?.id ?? crypto.randomUUID(), author_id: null, created_at: existing?.created_at ?? new Date().toISOString(), updated_at: new Date().toISOString() }
  localStorage.setItem(key, JSON.stringify([row, ...rows.filter(item => item.id !== row.id)]))
  window.dispatchEvent(new Event(event))
  return row
}
export function deleteDemoArticle(id: string) { localStorage.setItem(key, JSON.stringify(readDemoArticles().filter(row => row.id !== id))); window.dispatchEvent(new Event(event)) }
