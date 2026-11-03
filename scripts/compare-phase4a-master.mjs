// Offline source/catalog comparison only. Never connects to a database.
import fs from 'node:fs'
import crypto from 'node:crypto'

const masterPath = 'supabase/migrations/001_rekansiaga_initial_schema.sql'
const metadataPath = 'docs/audits/phase4a-security-audit-result.json'
const raw = fs.readFileSync(masterPath)
const sql = raw.toString('utf8').replace(/--[^\r\n]*/g, '')
const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))[0].phase4a_security_audit
const digest = (value, algorithm = 'sha256') => crypto.createHash(algorithm).update(value).digest('hex')
const norm = value => value.toLowerCase().replace(/public\./g, '').replace(/\s+/g, '')
function splitTop(value) {
  let depth = 0, quoted = false, start = 0
  const result = []
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (ch === "'") { if (quoted && value[i + 1] === "'") { i++; continue }; quoted = !quoted }
    if (quoted) continue
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) { result.push(value.slice(start, i).trim()); start = i + 1 }
  }
  result.push(value.slice(start).trim())
  return result
}
const tables = []
for (const match of sql.matchAll(/CREATE TABLE public\.(\w+)\s*\(/g)) {
  const start = match.index + match[0].length
  let depth = 1, quoted = false, end = start
  for (; end < sql.length; end++) {
    const ch = sql[end]
    if (ch === "'") { if (quoted && sql[end + 1] === "'") { end++; continue }; quoted = !quoted }
    if (!quoted) { if (ch === '(') depth++; if (ch === ')' && --depth === 0) break }
  }
  const parts = splitTop(sql.slice(start, end))
  const columns = parts.filter(p => !/^(CHECK|PRIMARY KEY|UNIQUE|CONSTRAINT|FOREIGN KEY)\b/i.test(p))
    .map(p => {
      const [, name, definition] = p.match(/^(\w+)\s+([\s\S]*)$/)
      const type = definition.split(/\s+(?=PRIMARY|REFERENCES|NOT NULL|DEFAULT|CHECK|UNIQUE)/i)[0].trim()
      return { name, type: type === 'timestamptz' ? 'timestamp with time zone' : type, notNull: /\bNOT NULL\b|\bPRIMARY KEY\b/i.test(definition), definition }
    })
  const groupPk = parts.find(p => /^PRIMARY KEY/i.test(p))?.match(/\(([^)]+)\)/)[1].split(',').map(c => c.trim())
  for (const c of columns) if (groupPk?.includes(c.name)) c.notNull = true
  const counts = Object.fromEntries([['p', /\bPRIMARY KEY\b/gi], ['f', /\bREFERENCES\b/gi], ['u', /\bUNIQUE\b/gi], ['c', /\bCHECK\s*\(/gi]].map(([k, re]) => [k, [...parts.join('\n').matchAll(re)].length]))
  const foreignKeys = columns.flatMap(c => {
    const m = c.definition.match(/REFERENCES\s+([\w.]+)\((\w+)\)\s+ON DELETE\s+(RESTRICT|CASCADE|SET NULL)/i)
    return m ? [{ column: c.name, target: m[1], targetColumn: m[2], onDelete: m[3].toUpperCase() }] : []
  })
  const uniqueKeys = parts.flatMap(p => /^UNIQUE\s*\(/i.test(p) ? [p.match(/\(([^)]+)\)/)[1].replace(/\s+/g, '')] : [])
  for (const c of columns) if (/\bUNIQUE\b/i.test(c.definition)) uniqueKeys.push(c.name)
  const pk = groupPk ?? columns.filter(c => /\bPRIMARY KEY\b/i.test(c.definition)).map(c => c.name)
  const remoteColumns = metadata.columns.filter(c => c.relname === match[1] && c.nspname === 'public')
  const remoteConstraints = metadata.constraints.filter(c => c.relname === match[1] && c.nspname === 'public')
  const columnDifferences = columns.flatMap(c => {
    const remote = remoteColumns.find(r => r.attname === c.name)
    return !remote || norm(remote.column_type) !== norm(c.type) || remote.not_null !== c.notNull ? [{ source: c, remote: remote ?? null }] : []
  })
  const fkDifferences = foreignKeys.filter(fk => !remoteConstraints.some(c => c.contype === 'f' && norm(c.definition) === norm(`FOREIGN KEY (${fk.column}) REFERENCES ${fk.target}(${fk.targetColumn}) ON DELETE ${fk.onDelete}`)))
  const uniqueDifferences = uniqueKeys.filter(key => !remoteConstraints.some(c => c.contype === 'u' && norm(c.definition) === norm(`UNIQUE (${key})`)))
  tables.push({ name: match[1], columns, columnCount: columns.length, remoteColumnCount: remoteColumns.length, columnDifferences, missingSourceColumns: remoteColumns.filter(c => !columns.some(s => s.name === c.attname)).map(c => c.attname), counts, remoteCounts: Object.fromEntries(['p','f','u','c'].map(k => [k, remoteConstraints.filter(c => c.contype === k).length])), pk, pkMatches: remoteConstraints.some(c => c.contype === 'p' && norm(c.definition) === norm(`PRIMARY KEY (${pk.join(',')})`)), foreignKeys, fkDifferences, uniqueDifferences, sourceChecks: parts.flatMap(p => [...p.matchAll(/CHECK\s*\(/gi)].map(() => p)), remoteChecks: remoteConstraints.filter(c => c.contype === 'c').map(c => c.definition) })
}
const functions = [...sql.matchAll(/CREATE FUNCTION public\.(\w+)\([\s\S]*?AS \$\$([\s\S]*?)\$\$;/g)].map(m => {
  const remote = metadata.functions.find(f => f.nspname === 'public' && f.proname === m[1])
  const normalizedBody = m[2].replace(/\r?\n/g, '\r\n')
  return { name: m[1], masterBodyMd5CRLF: digest(normalizedBody, 'md5'), remoteBodyMd5: remote?.body_fingerprint, matchesAfterLineEndingNormalization: digest(normalizedBody, 'md5') === remote?.body_fingerprint }
})
const canonicalIndex = value => norm(value).replace(/usingbtree/g, '').replace(/[();]/g, '')
const indexes = [...sql.matchAll(/CREATE (?:UNIQUE )?INDEX (\w+) ON public\.(\w+)[^;]*;/g)].map(m => ({ name: m[1], table: m[2], definition: m[0], matchesRemote: metadata.indexes.some(i => canonicalIndex(i.definition) === canonicalIndex(m[0])) }))
const droppedPolicies = [...sql.matchAll(/DROP POLICY (\w+) ON public\.(\w+);/g)].map(m => m[1])
const policies = [...sql.matchAll(/CREATE POLICY (\w+) ON public\.(\w+)([^;]*);/g)].filter(m => !droppedPolicies.includes(m[1])).map(m => ({ name: m[1], table: m[2], definition: m[0], remote: metadata.policies.find(p => p.policyname === m[1] && p.tablename === m[2]) ?? null }))
const result = { kind: 'Offline bounded extractor for this Master SQL, not PostgreSQL parse/execute or complete SQL semantic equivalence', masterPath, masterSha256: digest(raw), metadataPath, remoteCapturedAt: metadata.captured_at, tables, missingMasterTables: metadata.relations.filter(t => !tables.some(s => s.name === t.relname)).map(t => t.relname), functions, explicitIndexes: indexes, policies, droppedPolicies, counts: { tables: tables.length, columns: tables.reduce((n,t) => n+t.columnCount,0), constraints: Object.fromEntries(['p','f','u','c'].map(k => [k,tables.reduce((n,t)=>n+t.counts[k],0)])), explicitIndexes: indexes.length, finalPolicies: policies.length, appFunctions: functions.length }, limitations: ['CHECK expression equivalence reviewed manually; source and remote definitions included per table', 'Defaults absent from old metadata; source defaults not proven equal to dev', 'Policy expressions retained for manual semantic review; name/shape alone is insufficient', 'Owner, inherited ACL, extension schema and managed objects depend on target environment', 'No SQL compiled, applied, or authenticated API tested'] }
fs.mkdirSync('docs/audits', { recursive: true })
fs.writeFileSync('docs/audits/phase4a3-master-comparison.json', JSON.stringify(result, null, 2)+'\n')
console.log(JSON.stringify({ ...result.counts, columnDifferences: tables.reduce((n,t)=>n+t.columnDifferences.length+t.missingSourceColumns.length,0), pkDifferences: tables.filter(t=>!t.pkMatches).length, fkDifferences: tables.reduce((n,t)=>n+t.fkDifferences.length,0), uniqueDifferences: tables.reduce((n,t)=>n+t.uniqueDifferences.length,0), countDifferences: tables.filter(t=>JSON.stringify(t.counts)!==JSON.stringify(t.remoteCounts)).map(t=>t.name), indexDifferences: indexes.filter(i=>!i.matchesRemote).map(i=>i.name), bodyMatches: functions.every(f=>f.matchesAfterLineEndingNormalization), policyIdentityDifferences: policies.filter(p=>!p.remote).map(p=>p.name) }))
