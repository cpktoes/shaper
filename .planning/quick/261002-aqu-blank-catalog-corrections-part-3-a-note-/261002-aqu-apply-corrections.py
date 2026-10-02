#!/usr/bin/env python3
"""One-off: applies a round of corrections to the blank catalogue files under db/seed/blanks/.

usage (from the repository root): apply-corrections.py <corrections.json>

The JSON lists, per catalogue file, rows to change (cells and/or the row's note) and blanks to
rename. For every row the tool checks the old values and the old note text, and for every rename the
number of rows carrying the old name; it refuses to write ANY file unless everything is found exactly
as listed. It keeps each file's CRLF line endings and re-quotes a cell only when RFC 4180 needs it
(comma, straight quote, line break); every untouched line stays byte-identical.
"""
import csv, io, json, sys

spec = json.load(open(sys.argv[1], encoding='utf-8'))

def cell(text):
    return '"' + text.replace('"', '""') + '"' if any(ch in text for ch in ',"\r\n') else text

def same(text, expected):
    return text != '' and abs(float(text) - float(expected)) < 1e-9

results = []
for path, work in spec['files'].items():
    raw = open(path, newline='', encoding='utf-8').read()
    assert raw.count('\r\n') > 100 and '\n' not in raw.replace('\r\n', ''), f'{path}: expected CRLF line endings throughout'
    rows = list(csv.reader(io.StringIO(raw, newline='')))
    col = {name: i for i, name in enumerate(rows[0])}
    original = raw.split('\r\n')
    assert original[-1] == '', f'{path}: expected a trailing line break'
    for i, row in enumerate(rows):
        assert ','.join(cell(c) for c in row) == original[i], f'{path} line {i + 1} does not round-trip'
    for e in work.get('rows', []):
        hits = [r for r in rows[1:] if r[col['vendor']] == e['vendor'] and r[col['blank_name']] == e['blank'] and r[col['station']] == e['station']]
        assert len(hits) == 1, f"{e['vendor']} {e['blank']} {e['station']}: {len(hits)} rows"
        row = hits[0]
        for change in e.get('cells', []):
            i = col[change['column']]
            assert same(row[i], change['old']), f"{e['blank']} {e['station']} {change['column']}: file has {row[i]!r}, expected {change['old']!r}"
            row[i] = change['new']
        assert row[col['flag']] == e['flag_old'], f"{e['blank']} {e['station']}: note is {row[col['flag']]!r}, expected {e['flag_old']!r}"
        row[col['flag']] = e['flag_new']
    for r in work.get('renames', []):          # after the row edits, which name rows by the OLD name
        hits = [x for x in rows[1:] if x[col['vendor']] == r['vendor'] and x[col['blank_name']] == r['old']]
        assert len(hits) == r['rows'], f"{r['vendor']} {r['old']}: {len(hits)} rows, expected {r['rows']}"
        assert not any(x[col['vendor']] == r['vendor'] and x[col['blank_name']] == r['new'] for x in rows[1:]), f"{r['vendor']} {r['new']} already exists"
        for x in hits:
            x[col['blank_name']] = r['new']
    out = '\r\n'.join(','.join(cell(c) for c in row) for row in rows) + '\r\n'
    changed = sum(1 for a, b in zip(original, out.split('\r\n')) if a != b)
    results.append((path, out, changed))

for path, out, changed in results:          # write only after every file passed every check
    open(path, 'w', newline='', encoding='utf-8').write(out)
    print(f'{changed} lines changed in {path}')
