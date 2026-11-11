---
phase: 17-bottom-contours
plan: 01
subsystem: geometry (bottom contours — the maths first)
status: checkpoint
tags: [bottom, litres-pin, fins, wings, narrowest-outline, golden, D-03, D-10, D-19, D-20, D-34]
requires: []
provides:
  - "phase17-litres-pin.json — today's litres of the 102 Phase 16 boards, pinned before the bottom seam (17-0x's flat-bottom proof)"
  - "frontFinStation(placement), frontFinToeDegrees(placement) — lib/geometry/fins.ts"
  - "narrowestOutlineAt(geometry, station) — lib/geometry/wings.ts (D-19)"
  - "designFinPlacement(fields) — lib/geometry/design.ts, the store's own fin chain in pure code"
  - "reference/sketches/021-bottom-maths.js — the sketch's maths byte for byte (never imported by the app)"
  - "bottom-golden.json — the sketch's own figures on the app's five boards, 4,801 stations"
affects: [17-02, 17-03, 17-04, 17-05, 17-06, 17-07]
tech-stack:
  added: []
  patterns:
    - "Pin today's litres from today's code; the generator refuses once volume.ts names foamOffAt"
    - "Execute the founder's sketch byte for byte on the app's own boards and keep what it says as the golden (the sketch-016 precedent)"
key-files:
  created:
    - scripts/extract-phase17-litres-pin.ts
    - lib/geometry/__fixtures__/phase17-litres-pin.json
    - lib/geometry/phase17-litres-pin.test.ts
    - reference/sketches/021-bottom-maths.js
    - scripts/extract-sketch021-bottom-golden.mjs
    - lib/geometry/__fixtures__/bottom-golden.json
    - .planning/phases/17-bottom-contours/pictures/17-01-the-sketch-on-the-app-boards.png
    - .planning/phases/17-bottom-contours/pictures/17-01-pictures-source.tar.gz
  modified:
    - lib/geometry/fins.ts
    - lib/geometry/fins.test.ts
    - lib/geometry/wings.ts
    - lib/geometry/wings.test.ts
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
decisions:
  - "The front fins the bottom reads are FINS' own, Import Template ticked as a board opens (D-03): Shortboard 11\", Fish 7 1/2\", Mid-length 12\", Longboard's single fin 5 1/2\""
  - "The toe-in angle is kept raw in the maths and rounded once on screen (D-10): the Fish reads 2.0 degrees, not the sketch's 1.9"
  - "The Narrowest outline is the drawn curve less each wing's full depth times its fade to the tail pod, with no step share (D-19)"
  - "designFinPlacement takes any object with an outline (plus optional fins and Import Template) — a wider parameter than the plan's DesignSummaryFields, which every DesignSummaryFields still satisfies"
metrics:
  duration: "about 25 minutes (11:20 to 11:46 by the clock, plus the founder's look)"
  completed: 2026-11-08
actuals:
  tokens: 246000
  tasks: 2
  commits: 3
---

# Phase 17 Plan 01: Today's litres pinned, the board facts the bottom reads, and the sketch's own maths on the app's boards — Summary

Today's litres for 102 test boards are recorded to every digit before anything can move them; the app can now say
where a board's front fins sit, how they toe in and where a winged board's Narrowest outline runs; and sketch 021's
own bottom maths, copied byte for byte, has been run on the app's five real boards at 4,801 stations and kept as the
figures every later bottom test is checked against.

## What changes for the founder

Nothing on any screen. This is the arithmetic underneath the coming BOTTOM page:

- **The litres you see today are locked in as a record.** Every one of the 102 test boards has a flat bottom, so when
  the bottom joins the litres later in this phase, each must still read exactly what it reads now.
- **The bottom will read the fins where FINS puts them.** The sketch read the fins with Import Template off; the app
  reads them as a board opens (ticked). That moves the Mid-length's front fins from 10 7/8" to 12" and the
  Shortboard's from 10 7/8" to 11"; the Fish (7 1/2") and the Longboard's single fin (5 1/2") don't move.
- **On a winged board, Off Rail is measured from the Narrowest outline** — the real rail behind the wing, carried
  forward the wing's depth inside the curve you drew, so no cut can run out through the step.
- **The sketch's numbers, on the app's boards** (the picture):

| Board | Opening cuts | Front fins | Toe-in | Foam off — the sketch showed | Foam off — the app's boards | Six channels add |
|-------|--------------|------------|--------|------------------------------|-----------------------------|------------------|
| Shortboard | Flat Entry · Deep Single Concave · Flat Exit | 11" (sketch 10 7/8") | 3.2° | 0.75 L | 0.75 L | +0.38 L |
| Fish | Flat Entry · Flat Center · Panel Vee | 7 1/2" | 2.0° (sketch 1.9°) | 0.31 L | 0.31 L | +0.30 L |
| Mid-length | Blended Nose Concave · Shallow Single Concave · Spiral Vee | 12" (sketch 10 7/8") | 3.2° | 1.18 L | 1.23 L | +0.40 L |
| Longboard | Teardrop Nose Concave · Continuous Belly / Rolled Mid · Rolled Vee | 5 1/2" (single) | none | 3.33 L | 3.33 L | +0.27 L |
| Fish, winged | Flat Entry · Flat Center · Extending Single Concave | 7 1/2" | 2.0° | 0.13 L | 0.13 L | +0.31 L |

  "The sketch showed" is the same byte-for-byte maths run on the board data the sketch shipped with (its 241-station
  arrays), not a figure typed from its README. Only the Mid-length moves, because its cuts are set from its fins and
  the app's fins sit 1 1/8" further up. (These figures appear in no test; the tests read `bottom-golden.json`.)

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1a | Today's litres pinned (alone, before any seam) | 05fc140d | scripts/extract-phase17-litres-pin.ts, phase17-litres-pin.json, phase17-litres-pin.test.ts |
| 1b | Front fins, their toe, the Narrowest outline, designFinPlacement | 9799b5e9 | fins.ts/.test, wings.ts/.test, design.ts/.test |
| 2 | The sketch's maths byte for byte, its golden script and the golden | c7d748d6 | reference/sketches/021-bottom-maths.js, scripts/extract-sketch021-bottom-golden.mjs, bottom-golden.json |
| 3 | The founder's look | — (checkpoint) | pictures/17-01-the-sketch-on-the-app-boards.png, pictures/17-01-pictures-source.tar.gz |

## Verification

- The pin: all 102 figures equal the research's own run (`phase17-live-litres-now.json`) to every digit; the pin
  test (103 cases) passes; `volume.ts` does not name `foamOffAt`.
- `designFinPlacement` returns marks deep-equal to `phase16FinCases()`'s `opened` marks on all four presets.
- `narrowestOutlineAt`: within 1e-9 mm of `sampleOutline` at every outline point behind the inner corner(s); the curve
  less the summed depths at and ahead of the wing(s), on the winged Fish and `wing|fish|two`; `Object.is` the curve on
  every wingless preset.
- The reference copy, proven byte for byte by `python3 -I assemble.py <q> <template.html> <out>` (archived in the
  pictures tarball): it checks the template's SHA-1 `53cbf011…`, then splits the written file at its BEGIN/END markers
  and compares each block's bytes to template.html lines 326–553 (18,354 bytes) and 1013–1018 (545 bytes) — both
  identical.
- The golden: 5 boards, 1,103 cases (90 cut, 10 opening, 675 normalize, 54 channels, 274 refAt), 0.91 MB; run twice,
  `shasum -a 256` identical (`$TMPDIR` was set). `grep -c 25.4` on the script prints 0.
- `npx tsc --noEmit`, `npm run lint` (0 errors; one pre-existing warning in `lib/db/import-designs-action.test.ts`,
  out of scope) and `npm test` (181 files, 9,804 passed after Task 1 and again after Task 2) all exit 0.
- `git diff` of `lib/geometry/volume.ts`, `drizzle/` and `lib/db/schema.ts` from the plan's base prints nothing.

## Deviations from Plan

1. **[Rule 3 - Blocking] `designFinPlacement` takes `Pick<DesignSummaryFields, "outline">` plus optional fins and
   Import Template**, not the whole `DesignSummaryFields`. The tests pass a preset's own fields
   (`recordedPresetDesignFields`), which carry no `volume` or `railsImportFoilThickness`; the function reads neither.
   Every `DesignSummaryFields & { fins?, finsImportTemplate? }` still type-checks, so later plans calling it as the
   plan wrote are unaffected. Commit 9799b5e9.
2. **The acceptance grep `git grep -n "021-bottom-maths" -- app components lib`** prints one line: the golden's own
   `provenance.reference` string (`lib/geometry/__fixtures__/bottom-golden.json`), which the plan's interfaces block
   requires. Nothing imports or requires the copy — `git grep -nE "(require|import).*021-bottom-maths" -- app
   components lib` prints nothing. The sketch-016 precedent has the same single line.
3. **The commit trailer** reads `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, as the plan and the
   session's attribution rule say; the orchestrator's ruling named a different model, which is not the one that did
   this work.
4. **The pictures tarball** also carries the scratch assembler (`assemble.py`, `head.js`, `mid.js`, `tail.js`) that
   built and proved the reference copy, beside the picture's `gen-page.mts`, `shot.cjs` and `page.html`.

## Known Stubs

None.

## Founder's look: Approved (2026-11-08)

The founder, on the checkpoint card with the picture: *"Approved — merge it."* The figures stand as drawn: the Shortboard, Fish, Longboard and winged Fish match the sketch to two decimals, the Mid-length takes 1.23 L with the app's own fins at 12", the Fish's toe reads 2.0°. Merged as 4627bc5a.

`.planning/phases/17-bottom-contours/pictures/17-01-the-sketch-on-the-app-boards.png` — awaiting "approved" or
changes.

## Self-Check: PASSED

All created files exist; commits 05fc140d, 9799b5e9 and c7d748d6 are in the branch; both pictures are in `pictures/`.
