---
created: 2026-11-14
title: Read and write quad and five-fin setups in a .brd
area: export
severity: major
files:
  - lib/geometry/brd-fins.ts
  - lib/export/brd-fin-line.ts
  - lib/export/brd.ts
  - lib/export/brd-preview.ts
source: quick 261113-qyz (its SUMMARY's limits) and the founder's AkuShaper screenshot, 2026-11-13
resolves_phase:
---

# Read and write quad and five-fin setups in a .brd

## Problem

A board file's fin line (`p50`, nine figures) holds one side pair and one centre fin. AkuShaper's Fin setup list also has
QUAD and FIVE, with a Back Fin beside the Front Fin, but where a saved file keeps the rear pair is not known. So today a quad
writes no fins to the file ("A quad's fins aren't written to the file yet."), and a file AkuShaper saved as a quad or five-fin
may open here as a Twin or Thruster.

What was tried on 2026-11-13, all still read as TWIN in AkuShaper: the rear fin's figures added to the end of `p50` (ignored),
the four zero fields `p66`–`p69` filled, a `p52 : [...]` line after `p50`. `p53` is not a setup code (a 4 there threw AkuShaper
onto its Blank Fitting tab). A Demo Mode save (`.demobrd`) carries the same stamp but is locked with a different key and was
not opened — that lock is AkuShaper's own on unpaid saves and is not to be worked around. A layout from an AI chat (`p30`–`p43`
as fin fields) is wrong: `p32`–`p35` are the board's curves.

## What is needed

A real quad `.brd` (and a five-fin one) saved from a licensed AkuShaper, or the plain `_decrypt` copy the program leaves when it
opens a file through File → Open. Compare it with the founder's twin file to find the rear pair; then read it (FINS' Quad, both
pairs fitted), write it, say it on both previews, and prove the round trip. Logged in, AkuShaper's Board Info shows each fin's
figures, which is the way to check what a written file draws.
