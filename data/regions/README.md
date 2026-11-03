# Master wilayah Indonesia

The application accepts only a release of the official administrative-code
dataset supplied by the operator. Do not copy data from an unverified mirror
or invent missing villages.

The authoritative source is the Kemendagri Kode Wilayah application:
<https://kodewilayah.kemendagri.go.id/>.
The source requires operator access; credentials must never be stored in this
repository. Export the four-level dataset as JSON or NDJSON with these fields:

```json
{
  "code": "11.01.01.2001",
  "name": "Example",
  "region_type": "village",
  "parent_code": "11.01.01"
}
```

Allowed levels are `province`, `regency`, `city`, `district`, and `village`.
Use the official code as the stable identifier. `parent_code` is omitted only
for provinces. Keep the source export and its SHA-256 manifest in the
operator-controlled activation package, not in Git.

Validate before generating SQL:

```powershell
node scripts\validate-regions.mjs C:\path\to\official-regions.ndjson
node scripts\seed-regions.mjs --input C:\path\to\official-regions.ndjson --output supabase\releases\regions-national.sql
```

The generator is dry-run only. It never connects to Supabase, never deletes
rows, and preserves UUIDs by upserting on `code`. Use `--from-code` to resume
an interrupted reviewed batch. The generated SQL must be reviewed and
approved before an operator runs it against `rekansiaga-dev`.

## Reviewed public candidate

The pinned public candidate currently selected for local validation is recorded
in [kemendagri-2025-sandeeffendi.manifest.json](./kemendagri-2025-sandeeffendi.manifest.json).
It is a normalized derivative of the 2025 upstream workbook and is not an
independent government publication. Preserve its upstream checksum and CC BY
4.0 attribution. The local dry-run validated 91,599 rows:
38 provinces, 416 regencies, 98 cities, 7,285 districts, and 83,762
villages/kelurahan. Remote migration and seeding remain `NOT_RUN`.
