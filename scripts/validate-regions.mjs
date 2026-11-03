import fs from 'node:fs'
import process from 'node:process'

const input = process.argv[2]
if (!input) {
  console.error('Usage: node scripts/validate-regions.mjs <regions.json|regions.ndjson>')
  process.exit(2)
}
if (!fs.existsSync(input)) {
  console.error(`Dataset tidak ditemukan: ${input}`)
  console.error('Gunakan path file ekspor wilayah resmi yang benar, bukan C:\\path\\official-regions.ndjson.')
  process.exit(2)
}

const text = fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '')
const rows = input.endsWith('.ndjson')
  ? text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
  : JSON.parse(text)
if (!Array.isArray(rows)) throw new Error('Dataset must be a JSON array or NDJSON file.')

const types = new Set(['province', 'regency', 'city', 'district', 'village'])
const byCode = new Map()
const errors = []
for (const [index, row] of rows.entries()) {
  if (!row || typeof row !== 'object' || typeof row.code !== 'string' || typeof row.name !== 'string' || typeof row.region_type !== 'string') {
    errors.push(`row ${index + 1}: code, name, and region_type are required`)
    continue
  }
  if (byCode.has(row.code)) errors.push(`row ${index + 1}: duplicate code ${row.code}`)
  byCode.set(row.code, row)
  if (!types.has(row.region_type)) errors.push(`row ${index + 1}: unsupported region_type ${row.region_type}`)
}
for (const [code, row] of byCode) {
  const parent = row.parent_code ? byCode.get(row.parent_code) : undefined
  if (row.region_type === 'province' && row.parent_code) errors.push(`${code}: province must not have parent_code`)
  if (row.region_type !== 'province' && !row.parent_code) errors.push(`${code}: non-province requires parent_code`)
  if (row.parent_code && !parent) errors.push(`${code}: orphan parent_code ${row.parent_code}`)
  if (parent && !code.startsWith(`${row.parent_code}.`)) errors.push(`${code}: code is not under parent_code ${row.parent_code}`)
  if (parent) {
    const valid = row.region_type === 'regency' || row.region_type === 'city'
      ? parent.region_type === 'province'
      : row.region_type === 'district'
        ? ['regency', 'city'].includes(parent.region_type)
        : row.region_type === 'village' && parent.region_type === 'district'
    if (!valid) errors.push(`${code}: invalid parent level ${parent.region_type} for ${row.region_type}`)
  }
}
const counts = Object.fromEntries([...types].map(type => [type, rows.filter(row => row.region_type === type).length]))
if (errors.length) {
  console.error(JSON.stringify({ valid: false, rows: rows.length, counts, errors }, null, 2))
  process.exit(1)
}
console.log(JSON.stringify({ valid: true, rows: rows.length, counts, levels: 4, source: 'official-government-dataset-required' }, null, 2))
