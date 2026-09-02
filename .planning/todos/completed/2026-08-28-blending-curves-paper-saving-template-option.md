---
created: 2026-08-28T23:58:00.000Z
title: Blending-curves paper-saving template export option
area: template-export
severity: minor
files:
  - lib/geometry/template.ts
  - components/template/build-template-pdf.ts
  - components/template/export-preview-dialog.tsx
---

## Problem

Captured during Phase 3 execution (2026-08-28). The full tiled 1:1 template prints the
entire half-outline across 14–18 portrait pages. Chris shared an example PDF
(`blending curves_egg_D_7_10_22_5.pdf`, 14 landscape pages) of a "paper saving option":
instead of the whole outline, print only the numbered CURVE SEGMENTS (nose curve, hip,
tail curve) as landscape pages, each with straight blend/station reference lines crossing
the curve. The shaper tapes up just the curved sections, marks the station dims on the
blank, and blends the straight sections between segments by hand — the near-straight
middle of the board needs no paper at all.

Chris: "this is a cool alternative 'paper saving option' that we may also want to
implement as an option."

## Solution

The export dialog is being restructured (2026-08-28, during Phase 3) into an
artifact-picker with cards, modeled on iShaper's export dialog: "Overview sheet" and
"Full template" ship in Phase 3; this todo adds the third card, "Curve segments — saves
paper". Chris: "On the export page, we could offer all three options." The segment layout math belongs in
`lib/geometry/template.ts` (pure + unit-tested, per Rule 1): pick segment boundaries from
outline curvature (where the curve deviates from straight by more than a tolerance),
number the segments, and emit per-segment tiles with their blend-line chords and station
dimensions.

Layout detail from Chris (2026-08-28): the paper-saver print uses LANDSCAPE pages and
"moves most of the board away from the stringer" — each curve segment is translated on
the page rather than kept at its true offset from the stringer, which wastes far less
paper. That translation is acceptable because the nose and tail segments can still be
lined up with the stringer on the blank (they anchor the whole template); the middle
segments register off the blend lines and station dims, not the stringer. The PDF renderer draws each segment landscape at true 1:1 with the same
calibration square, box border, and name/dims block conventions the full template uses.
Reference PDF kept in Chris's Downloads; re-request it if needed when picking this up.
