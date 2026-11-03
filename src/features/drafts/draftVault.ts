// Form drafts only. Auth, tracking credentials, CAPTCHA and files never enter this vault.
const storageKey = 'rekansiaga.encrypted-drafts.v1'
const drafts = new Map<string, unknown>()
const listeners = new Set<() => void>()
let revision = 0, recovery = 0, generation = 0
let owner: string | undefined
let encryptionKey: CryptoKey | undefined
let salt: Uint8Array<ArrayBuffer> | undefined
let storageError = false
const lifetime = 8 * 60 * 60 * 1000
export const subscribeDrafts = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const draftRevision = () => revision
export const recoveryRevision = () => recovery
export const draftCount = () => drafts.size
export const draftExists = (key: string) => drafts.has(key)
export const draftBackupEnabled = () => !!encryptionKey
export const draftStorageFailed = () => storageError
function emit() { revision++; listeners.forEach(listener => listener()) }
function removeBackup() { try { sessionStorage.removeItem(storageKey) } catch { /* unavailable storage */ } }
type Envelope = { version: 1; owner: string; expires: number; salt: number[]; iv: number[]; cipher: number[] }
function backup(): Envelope | undefined {
  try {
    const raw = sessionStorage.getItem(storageKey)
    if (!raw || raw.length > 4_000_000) return
    const value = JSON.parse(raw) as Envelope
    if (value.version !== 1 || value.owner !== owner || value.expires <= Date.now() || value.salt?.length !== 16 || value.iv?.length !== 12 || !Array.isArray(value.cipher)) return
    return value
  } catch { return }
}
export const hasDraftBackup = () => !!backup()
export function setDraftOwner(next: string) {
  if (owner === next) return
  if (owner !== undefined) { drafts.clear(); removeBackup(); recovery++ }
  else {
    // A fresh runtime may open without the account that owned the saved tab.
    try { const raw = sessionStorage.getItem(storageKey); if (raw && JSON.parse(raw).owner !== next) removeBackup() } catch { removeBackup() }
  }
  owner = next; encryptionKey = undefined; salt = undefined; generation++; emit()
}
function safeValue(value: unknown): boolean {
  if (value === null || value === undefined || ['string', 'number', 'boolean'].includes(typeof value)) return true
  if (Array.isArray(value)) return value.every(safeValue)
  return typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype && Object.entries(value).every(([key, item]) => !/password|captcha|(?:access|refresh)[_-]?token|service[_-]?role|^token$|^secret$/i.test(key) && safeValue(item))
}
export function readDraft<T>(key: string, fallback: T): T { return drafts.has(key) ? drafts.get(key) as T : fallback }
export function writeDraft<T>(key: string, value: T) {
  if (!safeValue(value)) throw new Error('Data keamanan atau file tidak boleh disimpan sebagai draf.')
  drafts.set(key, value); emit(); void persist()
}
export function clearDraft(key: string) { drafts.delete(key); emit(); void persist() }
export function forgetDrafts() {
  generation++; drafts.clear(); encryptionKey = undefined; salt = undefined; storageError = false; removeBackup(); recovery++; emit()
}
async function derive(phrase: string, keySalt: Uint8Array<ArrayBuffer>) {
  if (phrase.length < 12) throw new Error('Frasa pemulihan minimal 12 karakter.')
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(phrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: keySalt, iterations: 250000 }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
async function persist() {
  const key = encryptionKey, keySalt = salt, activeOwner = owner, attempt = ++generation
  if (!key || !keySalt || !activeOwner) return
  const entries = [...drafts].filter(([namespace]) => namespace.startsWith(activeOwner + ':'))
  if (!entries.length) { removeBackup(); return }
  try {
    const plain = JSON.stringify(entries)
    if (plain.length > 500_000) throw new Error('Draft too large')
    const iv = crypto.getRandomValues(new Uint8Array(12)), expires = Date.now() + lifetime
    const additionalData = new TextEncoder().encode(activeOwner + ':' + expires)
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, key, new TextEncoder().encode(plain))
    if (attempt !== generation || key !== encryptionKey || activeOwner !== owner) return
    sessionStorage.setItem(storageKey, JSON.stringify({ version: 1, owner: activeOwner, expires, salt: [...keySalt], iv: [...iv], cipher: [...new Uint8Array(cipher)] } satisfies Envelope))
    if (storageError) { storageError = false; emit() }
  } catch { if (attempt === generation) { storageError = true; emit() } }
}
export async function protectDrafts(phrase: string) {
  if (!owner) throw new Error('Sesi belum siap.')
  if (backup() && !encryptionKey) throw new Error('Pulihkan atau hapus cadangan lama terlebih dahulu.')
  const activeOwner = owner, keySalt = crypto.getRandomValues(new Uint8Array(16)), key = await derive(phrase, keySalt)
  if (owner !== activeOwner) throw new Error('Sesi berubah. Ulangi setelah masuk.')
  encryptionKey = key; salt = keySalt; emit(); await persist()
}
export async function restoreDrafts(phrase: string) {
  const value = backup(), activeOwner = owner
  if (!value) throw new Error('Draf pemulihan tidak tersedia atau sudah kedaluwarsa.')
  const keySalt = new Uint8Array(value.salt), key = await derive(phrase, keySalt)
  const additionalData = new TextEncoder().encode(value.owner + ':' + value.expires)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(value.iv), additionalData }, key, new Uint8Array(value.cipher))
  const entries: unknown = JSON.parse(new TextDecoder().decode(plain))
  if (owner !== activeOwner || !Array.isArray(entries) || entries.length > 100 || !entries.every(entry => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && entry[0].startsWith(activeOwner + ':') && safeValue(entry[1]))) throw new Error('Draf tidak cocok dengan sesi ini.')
  for (const [key, data] of entries) drafts.set(key, data)
  encryptionKey = key; salt = keySalt; recovery++; emit()
}
