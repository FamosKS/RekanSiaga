// LOCAL PostgreSQL test of the new compact INSERT/SELECT format only.
// Does not connect to Supabase or rerun stage A/B acceptance.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '../.tools/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js'

const read = path => readFileSync(path, 'utf8')
const dir = '../operator-evidence/dev-release-20261029/regions-15-parts.APPROVED/'
const first = read(dir + 'part-01.sql')
const second = read(dir + 'part-02.sql')
const db = await PGlite.create()
try {
  // Existing regions schema/helper definitions are fixture setup, not a new
  // migration audit. No Auth, report tables or stage A objects are installed.
  const initial = read('supabase/migrations/001_rekansiaga_initial_schema.sql')
  const table = initial.match(/CREATE TABLE public\.regions \([\s\S]*?\n\);/)[0]
  const migration = read('supabase/migrations/002_regions_integrity.sql')
  const helpers = migration.slice(migration.indexOf('CREATE FUNCTION public.validate_region_hierarchy()'), migration.indexOf("NOTIFY pgrst,'reload schema';"))
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;')
  await db.exec(table)
  await db.exec('ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;')
  await db.exec(helpers)
  await assert.rejects(db.exec(first.replaceAll("release_approval='approve-dev-regions-91599-v1'", "release_approval='NOT_APPROVED'")), /approved dev region seed/)
  await db.exec('ROLLBACK')
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.regions')).rows[0].n, 0)
  console.log('PASS compact package still requires the approved scope before any insert')

  await db.exec(first)
  const province = (await db.query("SELECT id FROM public.regions WHERE code='11'")).rows[0].id
  await db.exec(second)
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.regions')).rows[0].n, 13000)
  const catalog = (await db.query('SELECT * FROM public.validate_regions_catalog()')).rows[0]
  for (const name of ['duplicate_codes', 'orphan_regions', 'invalid_parent_levels', 'invalid_roots']) assert.equal(Number(catalog[name]), 0)
  assert.equal(Number(catalog.province_count), 38)
  assert.equal(Number(catalog.regency_city_count), 514)
  assert.equal(Number(catalog.district_count), 7285)
  assert.equal(Number(catalog.village_count), 5163)
  console.log('PASS 13000 compact rows resolve parents across province/regency/district/village boundaries')

  const firstBatch = first.split('-- ===== BEGIN APPROVED BATCH 001 =====')[1].split('-- ===== END APPROVED BATCH 001 =====')[0]
  await db.exec(firstBatch)
  assert.equal((await db.query("SELECT id FROM public.regions WHERE code='11'")).rows[0].id, province)
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.regions')).rows[0].n, 13000)
  console.log('PASS compact ON CONFLICT preserves existing UUIDs and row count')

  await assert.rejects(db.exec(`BEGIN;
    INSERT INTO public.regions(parent_id,code,name,region_type)
    SELECT p.id,v.code,v.name,v.region_type FROM (VALUES ('99.01','LOCAL invalid parent','regency','99')) v(code,name,region_type,parent_code)
    LEFT JOIN public.regions p ON p.code=v.parent_code WHERE true
    ON CONFLICT(code) DO UPDATE SET parent_id=excluded.parent_id,name=excluded.name,region_type=excluded.region_type;
    COMMIT;`), error => error.code === '23514')
  await db.exec('ROLLBACK')
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.regions')).rows[0].n, 13000)
  console.log('PASS missing parent still rejects and rolls back the compact transaction')
} finally {
  await db.close()
}
