"""Local PostgreSQL grammar / PLpgSQL parsing; not a database runtime test."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path('.tools/sql-parser').resolve()))
from pglast import parse_sql, parse_plpgsql

for name in ['dev-live-admin.sql', 'dev-live-admin-rollback.sql']:
    source = Path('supabase/releases', name).read_text(encoding='utf-8')
    statements = parse_sql(source)
    blocks = parse_plpgsql(source)
    assert source.count("-- SET LOCAL rekansiaga.release_approval=") == 1
    assert 'ALTER TABLE' not in source or 'ENABLE ROW LEVEL SECURITY' in source
    assert 'DISABLE ROW LEVEL SECURITY' not in source
    print(f'PASS {name}: {len(statements)} SQL statements, {len(blocks)} PLpgSQL blocks parsed; Cloud NOT_RUN')
