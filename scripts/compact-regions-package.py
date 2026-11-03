"""Compact the approved C SQL package locally; never connect to a database.

Preserve each 500-row transaction/guard. Combine only consecutive rows whose
parents were inserted by an earlier statement, including level boundaries
inside a batch. Region values come only from the approved SQL, unchanged.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT.parent / 'operator-evidence' / 'dev-release-20261029'
MANIFEST = PACKAGE / 'release-manifest.json'
LITERAL = r"'(?:[^']|'')*'"
ROW = re.compile(
    r"INSERT INTO public\.regions \(parent_id, code, name, region_type\) VALUES \("
    rf"(?P<parent>NULL|\(SELECT id FROM public\.regions WHERE code = {LITERAL}\)), "
    rf"(?P<code>{LITERAL}), (?P<name>{LITERAL}), (?P<kind>{LITERAL})"
    r"\) ON CONFLICT \(code\) DO UPDATE SET parent_id = EXCLUDED\.parent_id, "
    r"name = EXCLUDED\.name, region_type = EXCLUDED\.region_type;"
)
LEVEL = {'province': 0, 'regency': 1, 'city': 1, 'district': 2, 'village': 3}


def decode(literal):
    return literal[1:-1].replace("''", "'")


def record(match):
    parent = match['parent']
    parent = None if parent == 'NULL' else decode(parent[len('(SELECT id FROM public.regions WHERE code = '):-1])
    return (decode(match['code']), decode(match['name']), decode(match['kind']), parent)


def compact(source, already_inserted):
    output, group, records = [], [], []
    group_level = None

    def flush():
        if not group:
            return
        # A SELECT cannot resolve a parent inserted by that same statement.
        # Splitting on administrative level avoids this, including boundaries
        # that occur in the middle of an original 500-row batch.
        for match in group:
            code, _, _, parent = record(match)
            if parent is not None and parent not in already_inserted:
                raise ValueError(f'Parent must precede this statement: {code}')
        values = []
        for match in group:
            parent = match['parent']
            parent = 'NULL::text' if parent == 'NULL' else parent[len('(SELECT id FROM public.regions WHERE code = '):-1]
            values.append(f"({match['code']},{match['name']},{match['kind']},{parent})")
        output.append(
            'INSERT INTO public.regions(parent_id,code,name,region_type)\n'
            'SELECT p.id,v.code,v.name,v.region_type FROM (VALUES\n'
            + ',\n'.join(values)
            + '\n) AS v(code,name,region_type,parent_code)\n'
            'LEFT JOIN public.regions p ON p.code=v.parent_code WHERE true\n'
            'ON CONFLICT(code) DO UPDATE SET parent_id=EXCLUDED.parent_id,name=EXCLUDED.name,region_type=EXCLUDED.region_type;'
        )
        for match in group:
            code, *_ = record(match)
            if code in already_inserted:
                raise ValueError(f'Duplicate source code: {code}')
            already_inserted.add(code)
        group.clear()

    for line in source.splitlines():
        match = ROW.fullmatch(line)
        if match:
            level = LEVEL[decode(match['kind'])]
            if group and level != group_level:
                flush()
            group_level = level
            group.append(match)
            records.append(record(match))
        else:
            if line.startswith('INSERT INTO public.regions'):
                raise ValueError('Unrecognized source INSERT; refusing to guess')
            flush()
            output.append(line)
    flush()
    return '\n'.join(output) + '\n', records


def main():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    assert manifest['cloudMutationApproval']['C'] is True
    # Produce/validate everything before replacing any execution file.
    seen, transformed, source_records = set(), {}, []
    for number in range(1, 185):
        name = f'regions-batches.APPROVED/batch-{number:03d}.sql'
        source = (PACKAGE / name).read_bytes()
        assert hashlib.sha256(source).hexdigest() == manifest['files'][name]['sha256'], name
        sql, records = compact(source.decode('utf-8'), seen)
        assert len(records) == (99 if number == 184 else 500)
        transformed[number] = sql
        source_records.extend(records)
    assert len(source_records) == len(seen) == 91599
    postflight = (PACKAGE / 'C-regions-postflight-readonly.sql').read_text(encoding='utf-8')
    parts = manifest['stageC']['sqlEditorParts']
    prepared = []
    for part in parts:
        sql = (f"-- APPROVED C: rekansiaga-dev / uiuiouosblyuqgnvfpeh; PART {part['part']:02d}/15.\n"
               '-- COMPACT VALUES: same source rows, original batch transactions/guards retained.\n'
               '-- Run parts in order. Stop on error; do not assume prior commit state.\n')
        for number in range(part['firstBatch'], part['lastBatch'] + 1):
            sql += f'\n-- ===== BEGIN APPROVED BATCH {number:03d} =====\n'
            sql += transformed[number]
            sql += f'\n-- ===== END APPROVED BATCH {number:03d} =====\n'
        if part['part'] == 15:
            sql += '\n-- ===== FINAL C POSTFLIGHT (READ ONLY) =====\n' + postflight
        data = sql.encode('utf-8')
        assert len(data) < 500_000, f"Part too large: {part['file']}"
        prepared.append((part, data))
    # Parse only new compact SQL and compare every VALUES row with its exact
    # approved input. No network, no repeated A/B checks or source re-audit.
    sys.path.insert(0, str(ROOT / '.tools/sql-parser'))
    from pglast import parse_sql
    parsed_records = []
    for part, data in prepared:
        for statement in parse_sql(data.decode('utf-8')):
            node = statement.stmt
            if type(node).__name__ != 'InsertStmt':
                continue
            assert node.relation.schemaname == 'public' and node.relation.relname == 'regions'
            rows = node.selectStmt.fromClause[0].larg.subquery.valuesLists
            for row in rows:
                values = []
                for value in row:
                    if type(value).__name__ == 'TypeCast':
                        value = value.arg
                    values.append(None if value.isnull else value.val.sval)
                parsed_records.append(tuple(values))
    assert parsed_records == source_records, 'Compacted row/parent/order changed'
    for part, data in prepared:
        path = PACKAGE / part['file']
        path.write_bytes(data)
        part['bytes'] = len(data)
        part['sha256'] = hashlib.sha256(data).hexdigest()
        manifest['files'][part['file']].update({'bytes': len(data), 'sha256': part['sha256'], 'format': 'compact INSERT SELECT VALUES, split by parent level; original batch transactions retained'})
    manifest['stageC']['sqlEditorFormat'] = 'COMPACT_VALUES'
    manifest['stageC']['packagingCheck'] = '15 parts each under 500000 bytes; all 91599 parsed row/parent values equal approved SQL in original order; parent-before-statement checked; original 184 guards/transactions retained'
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'parts': 15, 'rows': len(parsed_records), 'minBytes': min(len(data) for _, data in prepared), 'maxBytes': max(len(data) for _, data in prepared), 'allValuesAndOrderMatch': True, 'parentBeforeStatement': True, 'grammar': 'PASS', 'cloudWrites': 0}, indent=2))


if __name__ == '__main__':
    main()
