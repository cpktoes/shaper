#!/usr/bin/env python3
"""One-off: applies corrections to db/seed/blanks/us_blanks_stations.csv in place.

usage: apply_corrections.py <csv path> <corrections.json>

Fails loudly (and writes nothing) unless every old value is found exactly as expected. Keeps the
file's CRLF line endings and re-quotes a cell only when RFC 4180 needs it (comma, quote, newline).
"""
import csv, io, json, sys

path, spec_path = sys.argv[1], sys.argv[2]
spec = json.load(open(spec_path))
raw = open(path, newline='', encoding='utf-8').read()
assert raw.count('\r\n') > 1000 and '\n' not in raw.replace('\r\n', ''), 'expected CRLF line endings throughout'
rows = list(csv.reader(io.StringIO(raw, newline='')))
header = rows[0]
col = {name: i for i, name in enumerate(header)}

def cell(text):
    return '"' + text.replace('"', '""') + '"' if any(ch in text for ch in ',"\r\n') else text

original_lines = raw.split('\r\n')
assert original_lines[-1] == '', 'expected a trailing line break'
# The file's own quoting must round-trip before we touch anything.
for i, row in enumerate(rows):
    assert ','.join(cell(c) for c in row) == original_lines[i], f'line {i + 1} does not round-trip: {original_lines[i]!r}'

def find(blank, station):
    hits = [r for r in rows[1:] if r[col['vendor']] == 'US Blanks' and r[col['blank_name']] == blank and r[col['station']] == station]
    assert len(hits) == 1, f'{blank} {station}: {len(hits)} rows'
    return hits[0]

def same(text, expected):
    return text != '' and abs(float(text) - float(expected)) < 1e-9

changed = 0
for c in spec['cells']:
    row = find(c['blank'], c['station'])
    i = col[c['column']]
    assert same(row[i], c['old']), f"{c['blank']} {c['station']} {c['column']}: file has {row[i]!r}, expected {c['old']!r}"
    row[i] = c['new']
    if 'flag_replace' in c:
        assert row[col['flag']] == c['flag_replace']['old'], f"{c['blank']} {c['station']}: flag is {row[col['flag']]!r}"
        row[col['flag']] = c['flag_replace']['new']
    elif c.get('flag_add'):
        row[col['flag']] = (row[col['flag']] + '; ' if row[col['flag']] else '') + c['flag_add']
    changed += 1

for b in spec.get('blank_level', []):
    hits = [r for r in rows[1:] if r[col['vendor']] == 'US Blanks' and r[col['blank_name']] == b['blank']]
    assert len(hits) == b['rows'], f"{b['blank']}: {len(hits)} rows, expected {b['rows']}"
    for r in hits:
        for column, (old, new) in b['columns'].items():
            assert same(r[col[column]], old), f"{b['blank']} {r[col['station']]} {column}: file has {r[col[column]]!r}, expected {old!r}"
            r[col[column]] = new
        if r[col['station']] in b.get('station_moves', {}):
            old, new = b['station_moves'][r[col['station']]]
            assert same(r[col['station_in_from_tail']], old), f"{b['blank']} {r[col['station']]}: at {r[col['station_in_from_tail']]!r}, expected {old!r}"
            r[col['station_in_from_tail']] = new
        if r[col['station']] == b.get('flag_station'):
            r[col['flag']] = (r[col['flag']] + '; ' if r[col['flag']] else '') + b['flag_add']
    changed += len(hits)

out = '\r\n'.join(','.join(cell(c) for c in row) for row in rows) + '\r\n'
open(path, 'w', newline='', encoding='utf-8').write(out)
new_lines = out.split('\r\n')
print(f'{sum(1 for a, b in zip(original_lines, new_lines) if a != b)} lines changed in {path}')
