"""Offline supplied-evidence comparison. No database/network or SQL execution."""
from pathlib import Path
import collections
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent.parent
AUDITS = ROOT / 'docs/audits'
OUTPUT = AUDITS / 'phase4a4-final-evidence-review.json'
inputs = {p.name: json.loads(p.read_text(encoding='utf-8-sig'))
          for p in sorted(AUDITS.glob('*.json')) if p != OUTPUT}


def unwrap(name, key):
    return inputs[name][0][key]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalized_sql(value):
    """Formatting comparison only; preserve quoted contents. Not SQL equivalence."""
    if value is None:
        return None
    chunks = re.split(r"('(?:''|[^'])*'|\"(?:\"\"|[^\"])*\")", value)
    return ''.join(chunk if i % 2 else re.sub(r'\s+', '', chunk.replace('public.', ''))
                   for i, chunk in enumerate(chunks))


def difference(expected, actual):
    # A multiset comparison detects missing/extra duplicate entries too.
    encode = lambda row: json.dumps(row, sort_keys=True, ensure_ascii=True)
    e = collections.Counter(map(encode, expected))
    a = collections.Counter(map(encode, actual))
    return {'missing_or_different': [json.loads(x) for x in (e - a).elements()],
            'unexpected_or_different': [json.loads(x) for x in (a - e).elements()]}


def select(row, fields):
    return {field: row[field] for field in fields}


audit = unwrap('phase4a4-full-security-audit.json', 'phase4a_security_audit')
supp = unwrap('phase4a4-baseline-supplemental-result.json', 'phase4a4_baseline_supplemental')
event = unwrap('phase4a4-event-graph-review.json', 'phase4a3_existing_event_trigger_review')
previous = unwrap('phase4a3-existing-event-trigger-review.json', 'phase4a3_existing_event_trigger_review')
validator = ROOT / 'docs/sql/staging/phase4a3-post-deployment-validation.sql'
manifest = json.loads(re.search(r'\$manifest\$(.*?)\$manifest\$',
                     validator.read_text(encoding='utf-8'), re.S)[1])
comparisons = {}
comparisons['table_names'] = difference(manifest['tables'], [r['relname'] for r in audit['relations']])
comparisons['columns_type_nullability'] = difference(
    [dict(table=r['table_name'], column=r['column_name'],
          type=r['column_type'].replace('extensions.', ''), not_null=r['not_null']) for r in manifest['columns']],
    [dict(table=r['relname'], column=r['attname'],
          type=r['column_type'].replace('extensions.', ''), not_null=r['not_null']) for r in audit['columns']])
for label, fields in [('constraints', ['relname', 'conname', 'contype', 'definition', 'convalidated']),
                      ('indexes', ['relname', 'definition', 'indisvalid', 'indisunique', 'indisprimary']),
                      ('policies', ['tablename', 'policyname', 'cmd', 'roles', 'permissive', 'qual', 'with_check'])]:
    def project(rows):
        result = []
        for row in rows:
            item = select(row, fields)
            for key in ('definition', 'qual', 'with_check'):
                if key in item:
                    item[key] = normalized_sql(item[key])
            result.append(item)
        return result
    comparisons[label] = difference(project(manifest[label]), project(audit[label]))
priv_fields = ['relname', 'rolname', 'can_select', 'can_insert', 'can_update', 'can_delete',
               'can_truncate', 'can_reference', 'can_trigger']
comparisons['table_privileges'] = difference(
    [select(r, priv_fields) for r in manifest['table_privileges']],
    [select(r, priv_fields) for r in audit['effective_table_privileges']])
expected_privs = {(r['relname'], r['rolname']): r for r in manifest['table_privileges']}
column_grant_mismatches = []
for row in audit['effective_column_privileges']:
    expected = expected_privs.get((row['relname'], row['rolname']))
    if expected is None or any(row[k] != expected[k] for k in ('can_select', 'can_insert', 'can_update')):
        column_grant_mismatches.append(row)
column_fields = ['relname', 'attname', 'rolname', 'can_select', 'can_insert', 'can_update']
comparisons['column_privileges'] = difference([
    dict(relname=c['table_name'], attname=c['column_name'], rolname=role,
         **{k: expected_privs[(c['table_name'], role)][k]
            for k in ('can_select', 'can_insert', 'can_update')})
    for c in manifest['columns'] for role in ('anon', 'authenticated')],
    [select(r, column_fields) for r in audit['effective_column_privileges']])
source = (ROOT / 'docs/sql/staging/phase4a3-bootstrap-review.sql').read_text(encoding='utf-8')
role_values = re.search(r'INSERT INTO public.roles\(code,name,description\) VALUES(.*?);', source, re.S)[1]
expected_roles = [dict(zip(('code', 'name', 'description'), values))
                  for values in re.findall(r"\('([^']*)','([^']*)','([^']*)'\)", role_values)]
comparisons['role_seeds'] = difference(expected_roles, supp['role_seeds'])
source_values = re.search(r'INSERT INTO public.data_sources\(name,source_type,official_url\) VALUES(.*?);', source, re.S)[1]
expected_sources = [dict(name=name, type=kind, url=None if url == 'NULL' else url[1:-1],
                         active=True, api_identifier_is_null=True)
                    for name, kind, url in re.findall(r"\('([^']*)','([^']*)',(NULL|'[^']*')\)", source_values)]
comparisons['source_seeds'] = difference(expected_sources, supp['source_seeds'])
expected_triggers = [normalized_sql(x) for x in re.findall(r'CREATE TRIGGER [^;]+', source)]
comparisons['row_trigger_definitions'] = difference(expected_triggers,
    [normalized_sql(r['definition']) for r in supp['row_triggers']])
function_checks = []
for expected in manifest['functions']:
    actual = next(r for r in supp['all_public_routines'] if r['name'] == expected['name'])
    body = re.search(r'\bAS\s+(\$[A-Za-z_0-9]*\$)(.*?)\1', actual['definition'], re.S | re.I)[2]
    raw_md5 = hashlib.md5(body.encode()).hexdigest()
    lf_md5 = hashlib.md5(body.replace('\r', '').encode()).hexdigest()
    catalog = next(r for r in audit['functions'] if r['nspname'] == 'public' and r['proname'] == actual['name'])
    checks = next(r for r in supp['application_function_checks']
                  if r['expected_signature'].split('(')[0].split('.')[-1] == actual['name'])
    function_checks.append({'name': actual['name'], 'raw_prosrc_md5': raw_md5,
        'lf_prosrc_md5': lf_md5, 'lf_body_matches_manifest': lf_md5 == expected['body_md5_lf'],
        'raw_body_matches_full_audit': raw_md5 == catalog['body_fingerprint'],
        'owner_matches': actual['owner'] == 'postgres',
        'definer_matches': actual['definer'] == expected['security_definer'],
        'empty_search_path': actual['config'] == ['search_path=""'],
        'anon_matches': catalog['client_execute']['anon'] == expected['anon'],
        'authenticated_matches': catalog['client_execute']['authenticated'] == expected['authenticated'],
        'supplemental_signature_result_checks': checks['present'] and checks['result_matches'],
        'public_execute_denied': checks['public_execute'] is False})
memberships = audit['role_memberships']
gaps = unwrap('phase4a4-final-readonly-gaps.json', 'phase4a4_final_readonly_gaps')
expected_columns = {(r['table_name'], r['column_name']): r for r in manifest['columns']}
default_mismatches = []
default_deltas = []
for row in gaps['column_defaults']:
    key = (row['table_name'], row['column_name'])
    expected = expected_columns.get(key)
    if expected is None:
        default_mismatches.append({'unexpected_column': list(key)})
        continue
    wanted, actual = expected['default_expr'], row['default_expr']
    if (row['column_type'].replace('extensions.', '') != expected['column_type']
            or row['not_null'] != expected['not_null']):
        default_mismatches.append({'gap_column_metadata_differs': list(key)})
    allowed_delta = (
        (wanted == 'gen_random_uuid()' and actual == 'extensions.gen_random_uuid()'
         and expected['column_type'] == 'uuid') or
        (expected['column_type'] == 'text' and wanted is not None
         and re.fullmatch(r"'(?:''|[^'])*'", wanted) and actual == wanted + '::text'))
    if wanted != actual and allowed_delta:
        default_deltas.append({'table': key[0], 'column': key[1],
                               'source': wanted, 'catalog': actual})
    elif wanted != actual:
        default_mismatches.append({'table': key[0], 'column': key[1],
                                   'source': wanted, 'catalog': actual})
    if row['identity'] != '' or row['generated'] != '':
        default_mismatches.append({'unexpected_identity_or_generated': list(key)})
default_coverage = difference(list(map(list, expected_columns)),
                             [[r['table_name'], r['column_name']] for r in gaps['column_defaults']])
membership_fields = ['member_role', 'granted_role', 'admin_option']
membership_consistency = difference([select(r, membership_fields) for r in memberships],
                                   [select(r, membership_fields) for r in gaps['membership_options']])
client_parent_edges = [r for r in gaps['membership_options'] if r['member_role'] in ('anon', 'authenticated')]
authenticator_options_valid = (
    {r['granted_role'] for r in gaps['membership_options'] if r['member_role'] == 'authenticator'}
    == {'anon', 'authenticated', 'service_role'} and
    all(r['set_option'] and not r['inherit_option'] and not r['admin_option']
        for r in gaps['membership_options'] if r['member_role'] == 'authenticator'))


def reachable(role):
    found = set()
    pending = [role]
    while pending:
        current = pending.pop()
        for edge in memberships:
            if edge['member_role'] == current and edge['granted_role'] not in found:
                found.add(edge['granted_role'])
                pending.append(edge['granted_role'])
    return sorted(found)


result = {
    'kind': 'OFFLINE_REVIEW_OF_USER_SUPPLIED_LIVE_METADATA_NOT_AGENT_REMOTE_EXECUTION_OR_API_TEST',
    'recorded_date': '2026-10-23',
    'inputs_sha256': {name: sha(AUDITS / name) for name in inputs},
    'captures_utc': {'supplemental': supp['captured_at'], 'event_graph': event['captured_at'],
                     'full_audit': audit['captured_at']},
    'postgres_version': audit['postgres_version'],
    'manifest_source_sha256': sha(validator),
    'comparisons': comparisons,
    'constraint_counts': dict(collections.Counter(r['contype'] for r in audit['constraints'])),
    'all_table_owners_postgres': all(r['owner'] == 'postgres' for r in audit['relations']),
    'all_26_rls_enabled': len(audit['relations']) == 26 and all(r['rls_enabled'] for r in audit['relations']),
    'force_rls_flags': dict(collections.Counter(str(r['rls_forced']) for r in audit['relations'])),
    'indexes_valid_ready': all(r['valid'] and r['ready'] for r in supp['raw_indexes']),
    'all_row_triggers_enabled': all(r['enabled'] == 'O' for r in supp['row_triggers']),
    'column_grant_mismatches': column_grant_mismatches,
    'explicit_column_acls': supp['explicit_column_acls'],
    'function_checks_recomputed': function_checks,
    'event_graph_comparison': {
        'old_md5': previous['event_graph_md5'], 'new_md5': event['event_graph_md5'],
        'graph_objects_equal': event['event_graph'] == previous['event_graph'],
        'candidate_metadata_body_equal': event['candidate_definitions'] == previous['candidate_definitions'],
        'all_event_definitions_equal': event['event_function_definitions'] == previous['event_function_definitions']},
    'role_membership_reachability_ignoring_uncaptured_options':
        {r: reachable(r) for r in ('anon', 'authenticated', 'authenticator')},
    'role_flags': supp['role_flags'], 'schema_privileges': audit['schemas'],
    'all_default_acls': supp['all_default_acls'],
    'role_seeds': supp['role_seeds'], 'source_seeds': supp['source_seeds'],
    'fixture_counts': supp['fixture_counts'],
    'closure_gap_review': {
        'capture_utc': gaps['captured_at'], 'column_coverage': default_coverage,
        'column_default_mismatches': default_mismatches,
        'reviewed_representation_resolution_deltas': default_deltas,
        'uuid_qualification_note': '23 extensions.gen_random_uuid bindings accepted against reviewed public/extensions/pg_catalog bootstrap path; not an assertion of wrapper implementation identity or runtime security',
        'membership_consistency': membership_consistency,
        'client_parent_edges': client_parent_edges,
        'authenticator_options_match_reviewed_delegation': authenticator_options_valid,
        'membership_options': gaps['membership_options'],
        'all_client_schema_create_denied': all(not r['create'] for r in gaps['schema_client_access']),
        'schema_client_access': gaps['schema_client_access'],
        'database_client_access': gaps['database_client_access']},
    'phase4a4_status': 'BASELINE VERIFIED WITH KNOWN SECURITY FINDINGS' if
        not default_mismatches and not any(default_coverage.values()) and
        not any(membership_consistency.values()) and
        not client_parent_edges and authenticator_options_valid and
        all(not any(x.values()) for x in comparisons.values()) and
        all(all(v is True for k, v in r.items()
                if k not in ('name', 'raw_prosrc_md5', 'lf_prosrc_md5')) for r in function_checks) and
        len(audit['relations']) == 26 and
        all(r['owner'] == 'postgres' and r['rls_enabled'] for r in audit['relations']) and
        all(not r['create'] for r in gaps['schema_client_access']) and
        all(not r['create'] for r in gaps['database_client_access']) and
        event['event_graph'] == previous['event_graph'] else 'BLOCKED',
    'blocked': ['Dashboard reference / Data API exposed schemas not independently verified',
                'Authenticated API/session/atomicity/concurrency not tested'],
    'open_findings': ['Roles policy super-only: A not applied',
                      'Review NULL/reason validation gap: B not applied',
                      'Broad new-object defaults: C1/C2 not applied; postgres storage defaults also broad',
                      'Client TEMP database privilege remains; arbitrary SQL/temporary-object runtime not tested'],
    'phase4a_status': 'BLOCKED',
    'limitations': 'Snapshot comparison, not semantic SQL equivalence or authenticated behavior. Different captures are not one transaction. No input evidence modified.'
}
OUTPUT.write_text(json.dumps(result, indent=2, ensure_ascii=True) + '\n', encoding='utf-8')
print(json.dumps({'comparison_difference_counts': {k: {side: len(rows) for side, rows in v.items()}
                    for k, v in comparisons.items()},
                  'function_checks_all_true': all(all(v is True for k, v in row.items()
                    if k not in ('name', 'raw_prosrc_md5', 'lf_prosrc_md5')) for row in function_checks),
                  'column_grant_mismatches': len(column_grant_mismatches),
                  'event_comparison': result['event_graph_comparison']}, indent=2))
