import crypto from 'node:crypto'
import fs from 'node:fs'
import process from 'node:process'

const args = new Map()
for (let index = 2; index < process.argv.length; index += 2) args.set(process.argv[index], process.argv[index + 1])
const input = args.get('--input')
const output = args.get('--output') ?? 'supabase/releases/regions-national.sql'
const batchDir = args.get('--batch-dir')
const fromCode = args.get('--from-code') ?? ''
const batchSize = Number(args.get('--batch-size') ?? 500)
if (!input || !Number.isInteger(batchSize) || batchSize < 1) {
  console.error('Usage: node scripts/seed-regions.mjs --input <official.json|official.ndjson> [--output file] [--from-code code] [--batch-size 500]')
  process.exit(2)
}
if (!fs.existsSync(input)) {
  console.error(`Dataset tidak ditemukan: ${input}`)
  console.error('Gunakan path file ekspor wilayah resmi yang benar, bukan C:\\path\\official-regions.ndjson.')
  process.exit(2)
}
const raw = fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '')
const rows = input.endsWith('.ndjson') ? raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)) : JSON.parse(raw)
if (!Array.isArray(rows)) throw new Error('Dataset must be a JSON array or NDJSON file.')
const required = ['code', 'name', 'region_type']
for (const row of rows) for (const key of required) if (typeof row?.[key] !== 'string' || !row[key].trim()) throw new Error(`Missing ${key} in dataset row`)
const levelOrder = { province: 0, regency: 1, city: 1, district: 2, village: 3 }
const ordered = [...rows].sort((a, b) => (levelOrder[a.region_type] ?? 9) - (levelOrder[b.region_type] ?? 9) || a.code.localeCompare(b.code))
// Resume in the same hierarchy-first order as the original batches. A lexical
// filter can skip a lower-code child whose higher-level parents were seeded.
const fromIndex = fromCode ? ordered.findIndex(row => row.code === fromCode) : 0
if (fromIndex < 0) throw new Error('Resume code is not in this dataset.')
const selected = ordered.slice(fromIndex)
const escaped = value => `'${String(value).replaceAll("'", "''")}'`
const parent = row => row.parent_code ? `(SELECT id FROM public.regions WHERE code = ${escaped(row.parent_code)})` : 'NULL'
const lines = [
  '-- Generated locally from an operator-supplied official government dataset.',
  `-- source_sha256=${crypto.createHash('sha256').update(raw).digest('hex')}`,
  '-- Idempotent by official code; existing UUIDs are preserved. No rows are deleted.',
  '-- REVIEW / APPROVAL REQUIRED. Operator must verify rekansiaga-dev in Dashboard.',
  "-- SET rekansiaga.release_ref='uiuiouosblyuqgnvfpeh';",
  "-- SET rekansiaga.release_approval='approve-dev-regions-91599-v1';"
]
const header = [...lines]
const beginBatch = () => lines.push('BEGIN;', "SET LOCAL lock_timeout='5s';", "SET LOCAL statement_timeout='60s';",
  "DO $seed_guard$ BEGIN IF current_user<>'postgres' OR session_user<>'postgres' OR current_setting('rekansiaga.release_ref',true) IS DISTINCT FROM 'uiuiouosblyuqgnvfpeh' OR current_setting('rekansiaga.release_approval',true) IS DISTINCT FROM 'approve-dev-regions-91599-v1' OR to_regprocedure('public.validate_regions_catalog()') IS NULL THEN RAISE EXCEPTION 'STOP: approved dev region seed and migration 002 required'; END IF; PERFORM pg_advisory_xact_lock(50426,1); END $seed_guard$;")
for (let index = 0; index < selected.length; index += batchSize) {
  const batchStart = lines.length
  beginBatch()
  for (const row of selected.slice(index, index + batchSize)) {
    lines.push(`INSERT INTO public.regions (parent_id, code, name, region_type) VALUES (${parent(row)}, ${escaped(row.code)}, ${escaped(row.name)}, ${escaped(row.region_type)}) ON CONFLICT (code) DO UPDATE SET parent_id = EXCLUDED.parent_id, name = EXCLUDED.name, region_type = EXCLUDED.region_type;`)
  }
  lines.push('COMMIT;')
  if (batchDir) {
    fs.mkdirSync(batchDir, { recursive: true })
    const file = `${batchDir}/batch-${String(index / batchSize + 1).padStart(3, '0')}.sql`
    if (fs.existsSync(file)) throw new Error(`Refusing to overwrite batch: ${file}`)
    fs.writeFileSync(file, [...header, `-- first_code=${selected[index].code}; last_code=${selected[Math.min(index + batchSize, selected.length) - 1].code}`,
      ...lines.slice(batchStart), 'RESET rekansiaga.release_ref;', 'RESET rekansiaga.release_approval;', ''].join('\n'))
  }
}
lines.push('RESET rekansiaga.release_ref;', 'RESET rekansiaga.release_approval;')
fs.mkdirSync(new URL('../supabase/releases/', import.meta.url), { recursive: true })
fs.writeFileSync(output, `${lines.join('\n')}\n`)
console.log(JSON.stringify({ input, output, source_sha256: crypto.createHash('sha256').update(raw).digest('hex'), rows: selected.length, resumable_from: fromCode || null, batch_size: batchSize, batch_dir: batchDir ?? null }, null, 2))
