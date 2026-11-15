---
created: 2026-11-14
title: Open the exported fin files in AkuShaper and Shape3D
area: export
severity: minor
files:
  - lib/export/brd.ts
  - lib/geometry/brd-fins.ts
source: quick 261113-qyz, 2026-11-13 — the check I said I would do and did not
resolves_phase:
---

# Open the exported fin files in AkuShaper and Shape3D

## Problem

The `.brd` export now carries the board's fins and fin system (live 2026-11-14). Round trips through the app's own reader come
back exact, and the fin line's meaning was confirmed in AkuShaper from the founder's twin file — but the app's own exported files
were never opened in AkuShaper or Shape3D to see that the fins draw where FINS puts them, or what the fin-system word (`p51`,
believed) shows as.

## What is needed

Export a single, twin, twin with trailer, thruster and 2+1 from the 3D page and open each in AkuShaper (Board Info, logged in,
shows From Tail, From Rail, Toe-in and Marks dist for each fin) and in Shape3D. Compare with FINS' own marks. Ask the founder
before opening files in his AkuShaper: on 2026-11-13 a test file left it on the Blank Fitting tab.

## Done

2026-11-15 — the founder's check: the app's exported .brd files open in AkuShaper with their fins, tested on a Twin and a Thruster; Shape3D opens them too, though its free Lite version does not appear to draw fins at all, so fins cannot be checked there. A quad does not work yet — that stays with `2026-11-14-read-and-write-quad-and-five-fin-setups-in-a-brd.md`.
