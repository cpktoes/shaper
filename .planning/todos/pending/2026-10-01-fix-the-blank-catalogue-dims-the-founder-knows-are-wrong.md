---
created: 2026-10-01T06:40:00.000Z
title: Fix the blank catalogue dims the founder knows are wrong
area: data
severity: major
files:
  - db/seed/blanks/us_blanks_stations.csv
  - db/seed/blanks/arctic_foam_stations.csv
  - db/seed/blanks/marko_foam_stations.csv
  - scripts/seed-blanks.ts
  - scripts/generate-preset-blanks.ts
  - lib/db/blanks.ts
  - lib/geometry/presets.ts
---

## Problem

Captured from the founder on 2026-10-01, at the close of the Phase 13 build evening, in their words:
"after this we need to fix quite a few blank dims". Some of the blanks in the three catalogues the
ROCKER screen offers (US Blanks, Arctic Foam, Marko Foam — seeded from the vendor catalogues in
Phase 11) carry dimensions the founder knows to be wrong. Which blanks and which numbers is the
founder's list, still to be written down.

## Solution

Rough shape, after Oct 10 (the freeze is Wednesday 2026-10-07 evening; catalogue data moves litres
and fits, so it does not ship between the freeze and the demo):

- The founder lists each wrong blank with the right numbers and where they come from (the maker's
  current catalogue page or a measured blank), so every change has a source the way the seed data
  does.
- The fix is to the catalogue CSVs under `db/seed/blanks/`, never a hand edit of the database; the
  seed is re-run on the development branch first, then production (additive rule in CLAUDE.md —
  updated rows are not a schema change, but check what the seed does with an existing row before
  running it on production).
- The four presets' blanks come through `scripts/generate-preset-blanks.ts`; if a preset's blank
  changes, regenerate and re-check the four cards' litres against the founder's figures (item 7's
  1/2–1 L tolerance), and the preset tests that record them.
- Saved boards that sit on a corrected blank re-fit on open; check the carry-over on the development
  branch's copies of the production boards before the production seed, as Phase 11/12 did.
