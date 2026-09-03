---
phase: quick-260902-kon
plan: 01
subsystem: templates
tags: [pdf-export, jspdf, geometry, paper-saver-strip]

requires:
  - phase: quick-260902-cj5
    provides: The Paper Saver strip export (computeStripLayout and its siblings, buildStripPdf)
provides:
  - "stripFurniture (renamed from stripPageZeroFurniture): a page-aware placement scan that puts
    the board name + dims block inside the outline, on whichever page has room, instead of
    beside the scale square outside the nose taper"
  - "StripFurniturePlacement.pageIndex, so downstream drawing code can draw furniture on any page
    of the strip, not only page 0"
affects: [paper-saver-strip, template-export]

actuals:
  tokens: 13570
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Three-tier fallback scan (full constraints -> containment-only -> deepest-band) so a pure
      geometry function is total and never throws, mirroring nameBlockPlacement's own posture"
    - "Characterisation pin (frozen sha256 digest + literal founder-locked numbers) captured
      against the unmodified module before touching source, to prove an unrelated area of a
      pure module stayed byte-identical across a change"

key-files:
  created: []
  modified:
    - lib/geometry/template.ts
    - lib/geometry/template.test.ts
    - components/template/build-strip-pdf.ts
    - components/template/build-strip-pdf.test.ts

key-decisions:
  - "The 2in scale square's placement arithmetic and pageIndex (always 0) are left completely
    untouched, per the founder's ruling that the box is good exactly where it is; only the name
    block moves"
  - "The name block's placement scan lives entirely in lib/geometry/template.ts (CLAUDE.md Rule
    1); the drawing module only reads pageIndex/topStation/halfWidthStart and draws"
  - "Fixed a boundary-inclusivity bug found during self-verification: the numeral/label exclusion
    check used strict < / > against the gap distance, which rejected a candidate sitting exactly
    at the gap boundary (10mm) instead of accepting it as clearing the gap. Corrected to <= / >=
    so a band exactly gap-distance away from the numeral or a label counts as clear -- confirmed
    against the plan's own reported placement table (all 10 rows now match exactly)."

patterns-established:
  - "StripFurniture is named for what each piece IS (scaleSquare, nameBlock), not for where it
    lives, since the name block is no longer guaranteed to be page-0 furniture"

requirements-completed: [QT-260902-kon]

coverage:
  - id: D1
    description: "Characterisation pin frozen over the strip's existing maths (station bands,
      registration lines, mark segments, label rows) plus the scale square's literal placement
      numbers, captured against the unmodified module and still passing unedited after the change"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts#Paper Saver strip output is unchanged by the name-block move (characterisation pin, quick task 260902-kon — frozen, never edit)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The board name + dims block is scanned into the first station band, on the
      first page, that sits inside the outline and clears the registration-overlap band, every
      label row, and the page numeral -- all four presets land on page 1, 4mm off the stringer,
      and the scale square's own placement is unchanged"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts#stripFurniture"
        status: pass
    human_judgment: false
  - id: D3
    description: "A legal needle-nosed board (10ft x 16in, 35deg nose, 0% fullness) proves page 0
      genuinely cannot hold the block and the scan falls back to page index 1, still inside the
      outline and still 4mm off the stringer; stale corner-anchoring comments rewritten to
      describe the real placement rule; five review sample PDFs regenerated"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts#stripFurniture (needle-nose tests)"
        status: pass
      - kind: other
        ref: "grep -rq 'both anchored'|'block beneath it' lib/geometry/template.ts components/template/build-strip-pdf.ts (both clean)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Rendered-page checkpoint: confirm the 2in square/caption are unchanged, the name
      block is now inside the curve near the stringer, the midlength/letter box reads as separate
      from the numeral, and the shortboard's narrow nose still fits the box inside the curve"
    verification: []
    human_judgment: true
    rationale: "Requires visual inspection of rendered PDF pages by the founder -- this is the
      plan's own blocking-human checkpoint (Task 4), deferred by explicit instruction since this
      executor cannot render/view a PDF. Sample PDFs are ready for that review."

duration: 18min
completed: 2026-09-02
status: complete
---

# Quick Task 260902-kon: Move the Paper Saver name/dims block inside the outline — Summary

**The Paper Saver strip's board name + dims block now scans into the first clear station band inside the outline (page 1 for every stock preset, page 2 for a needle-nosed board), while the 2in scale square stays byte-identical in its outboard corner.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-09-02T19:44:33Z
- **Completed:** 2026-09-02T20:02:20Z
- **Tasks:** 3 of 4 (Task 4 is a blocking-human checkpoint, deferred — see below)
- **Files modified:** 4

## Accomplishments

- Froze a characterisation pin (Task 1) over everything on the Paper Saver strip that must NOT
  move: one sha256 digest per board preset x paper size over `computeStripLayout`'s page list,
  `stripRegistrationLines`, `stripMarkSegments` and `stripLabelRows`, plus the 2in scale square's
  own `topStation`/`halfWidthStart` as literal numbers — captured against the unmodified module,
  never edited afterwards, still passing after every later commit.
- Rebuilt the strip's furniture placement (Task 2): `stripPageZeroFurniture` renamed to
  `stripFurniture`, `StripFurniturePlacement` gained `pageIndex`, and a new nose-to-tail page
  scan places the board name + dims block in the first station band that sits inside the outline
  over the box's whole real drawn height while clearing the page's own registration-overlap band,
  every label row (6mm gap) and the page numeral (10mm gap). Three fallback tiers keep the
  function total. The scale square's two lines of arithmetic are untouched.
- Proved the narrow-nose fallback (Task 3) with a legal, in-range needle-nosed spec built via
  `buildOutline` from an existing preset (10ft length, 16in widepoint, 35deg nose — the editor's
  own slider floor — 0% nose fullness): page 0 genuinely cannot hold the block, and the scan
  correctly falls back to page index 1, still inside the outline, still 4mm off the stringer.
  Rewrote the stale "shared corner"/"beneath it" comments and regenerated five review sample PDFs.
- Found and fixed a real boundary bug during self-verification: the numeral/label exclusion check
  used strict `<`/`>` against the gap distance, rejecting a candidate that sat exactly at the
  10mm gap boundary instead of accepting it as clearing the gap. Fixed to `<=`/`>=`. Confirmed the
  fix against the plan's own reported placement table — all 10 rows (4 presets x 2 papers, plus
  the needle-nose case at both papers) now match the plan's predicted numbers exactly.

## Task Commits

Each task was committed atomically:

1. **Task 1: Freeze a characterisation pin** - `b12fc71` (test)
2. **Task 2: Place the block inside the outline and draw it there** - `c7d13a6` (feat)
3. **Task 3: Prove the narrow-nose fallback, then make every comment true again** - `a58216b` (test)

_No plan-metadata commit yet — this SUMMARY and STATE.md updates land as a separate docs commit
per the standard flow._

## Files Created/Modified

- `lib/geometry/template.ts` - `stripFurniture` (renamed from `stripPageZeroFurniture`) now
  scans pages nose-to-tail for the name block's placement; `StripFurniturePlacement` gained
  `pageIndex`; two new named constants `STRIP_FURNITURE_ROW_GAP_MM` (6) and
  `STRIP_FURNITURE_NUMERAL_GAP_MM` (10); the scale square's arithmetic is untouched
- `lib/geometry/template.test.ts` - Frozen characterisation pin (Task 1); rewritten `stripFurniture`
  describe block covering every behaviour in the plan; needle-nose fallback tests (Task 3)
- `components/template/build-strip-pdf.ts` - `computeStripFurniture` (renamed, now threads
  geometry + label rows through); `buildStripPdf` draws each piece of furniture on its own
  `pageIndex` instead of assuming page 0; `stripFurnitureRects`/`stripPrintableRect` (renamed,
  page-aware); removed the now-unused `FURNITURE_GAP_MM` stacking constant and its stale comment
- `components/template/build-strip-pdf.test.ts` - Updated to the renamed exports and per-page
  containment checks

## Decisions Made

- The 2in scale square's placement arithmetic and `pageIndex` (always 0) are left completely
  untouched, per the founder's ruling that the box is good exactly where it is; only the name
  block moves. This supersedes quick task 260902-cj5's decision to anchor both pieces to the same
  outboard corner — recorded directly in `StripFurniture`'s own doc comment.
- The name block's placement scan lives entirely in `lib/geometry/template.ts` (CLAUDE.md Rule 1);
  the drawing module only reads `pageIndex`/`topStation`/`halfWidthStart` and draws — it computes
  no placement of its own.
- Dropped the `scaleCaptionMm`/`gapMm` fields from the furniture-sizing object passed into
  `stripFurniture`, since the two pieces of furniture are no longer stacked and those fields had
  become dead weight once the name block was decoupled from the scale square's own footprint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a boundary-inclusivity bug in the numeral/label exclusion check**
- **Found during:** Task 2, while cross-checking computed placements against the plan's own
  reported table (`design_decision` §4)
- **Issue:** `bandClearsExclusionZone` used strict `<`/`>` comparisons against the gap distance
  (`top < center - gap || bottom > center + gap`). A candidate band whose edge sat exactly `gap`
  millimetres from the numeral or a label — which should count as clearing the gap, since the gap
  is a minimum separation — was incorrectly rejected, pushing the midlength/A4 preset's block one
  search step (1mm) further down the page than the plan predicted (2027.6mm instead of 2028.6mm).
- **Fix:** Changed both comparisons to `<=`/`>=` so a band sitting exactly at the gap boundary
  clears it.
- **Files modified:** lib/geometry/template.ts
- **Verification:** Wrote a standalone verification script computing all 10 rows of the plan's own
  placement table (4 presets x 2 papers, plus the needle-nose case at both papers) and confirmed
  every row now matches the plan's predicted numbers exactly. Full suite re-run green afterward.
- **Committed in:** c7d13a6 (Task 2 commit — found and fixed before that commit was made)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for correctness — without the fix, the midlength/A4 preset's
placement would have silently diverged from the plan's own documented rule (a band exactly at the
gap boundary should clear it). No scope creep; the fix is two comparison operators plus an
updated doc comment explaining why the comparisons are inclusive.

## Issues Encountered

None beyond the boundary bug documented above.

## Deferred: Checkpoint (Task 4, blocking-human)

Task 4 is a `checkpoint:human-verify` with `gate="blocking"` — a rendered-page review the founder
must perform. This executor cannot render or view a PDF, so per the harness's explicit
instruction this task is **not attempted and not marked done**. It is recorded here as deferred,
consistent with the constraint that completing Tasks 1-3 with the checkpoint deferred is the
expected outcome of this run.

**What to verify (from the plan's own `<how-to-verify>`):**
1. Render page 1 of the longboard sample — confirm the 2in square and its caption are exactly
   where they were in the last review (top corner, outside the nose taper), and the name/dims box
   is now on the other side of the curve, close to the stringer, with no part crossing the curve,
   sitting on the page numeral, or sitting on a label line.
2. Render page 1 of the midlength/letter sample — this is the board whose box had to move down
   the page to clear the numeral. Confirm the numeral and the box read as two separate things.
3. Render page 1 of the shortboard samples (narrowest nose of the four presets) — confirm the box
   still fits inside the curve.

**Sample PDFs generated for this review** (five, per the plan's Task 3):
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/1351620e-b04a-434a-9a98-cad58f6894ec/scratchpad/strip-out/fix2/longboard-letter.pdf`
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/1351620e-b04a-434a-9a98-cad58f6894ec/scratchpad/strip-out/fix2/longboard-a4.pdf`
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/1351620e-b04a-434a-9a98-cad58f6894ec/scratchpad/strip-out/fix2/shortboard-letter.pdf`
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/1351620e-b04a-434a-9a98-cad58f6894ec/scratchpad/strip-out/fix2/shortboard-a4.pdf`
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/1351620e-b04a-434a-9a98-cad58f6894ec/scratchpad/strip-out/fix2/midlength-letter.pdf`

**Predicted placement table** (from the plan's `design_decision` §4, confirmed against the
implementation by a standalone verification script — every row matches exactly):

| Board | Paper | Page | top | bottom | left |
|-------|-------|------|-----|--------|------|
| shortboard | letter | 1 | 1746.6 | 1721.0 | 4 |
| fish | letter | 1 | 1621.4 | 1595.8 | 4 |
| midlength | letter | 1 | 2025.6 | 2000.0 | 4 |
| longboard | letter | 1 | 2722.2 | 2696.6 | 4 |
| shortboard | a4 | 1 | 1746.6 | 1721.0 | 4 |
| fish | a4 | 1 | 1621.4 | 1595.8 | 4 |
| midlength | a4 | 1 | 2028.6 | 2003.0 | 4 |
| longboard | a4 | 1 | 2722.2 | 2696.6 | 4 |
| needle-nose 10ft x 16in | letter | 2 | 2731.1 | 2705.5 | 4 |
| needle-nose 10ft x 16in | a4 | 2 | 2731.0 | 2705.4 | 4 |

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tasks 1-3 complete, all automated verification green (`npm test`: 1622 passed, 1 skipped;
  `npm run lint`: 0 errors; `npx tsc --noEmit`: only the two known phantom `LayoutProps` errors in
  untouched `app/layout.tsx`/`app/design/layout.tsx`).
- Task 4 (rendered-page checkpoint) is the only remaining item — awaiting the founder's visual
  review of the five sample PDFs listed above.
- `npm run build` was not run in this worktree per the known environmental limitation (Turbopack
  cannot resolve `next` in a worktree); the orchestrator's checkpoint step should confirm a clean
  build from the main checkout if desired.

## Self-Check: PASSED

- FOUND: lib/geometry/template.ts
- FOUND: lib/geometry/template.test.ts
- FOUND: components/template/build-strip-pdf.ts
- FOUND: components/template/build-strip-pdf.test.ts
- FOUND: commit b12fc71
- FOUND: commit c7d13a6
- FOUND: commit a58216b
- FOUND: all five sample PDFs at /private/tmp/claude-501/-Users-kontoes-Code-shaper/1351620e-b04a-434a-9a98-cad58f6894ec/scratchpad/strip-out/fix2/

---
*Phase: quick-260902-kon*
*Completed: 2026-09-02*

## Task 4 checkpoint — orchestrator's results (2026-09-02)

Run against the merged code (`8de85ef`) with the executor's five review samples, page 1 rendered
for each (pypdf split + Quick Look) and the structural checker run over every file:

- **Scale square unchanged**: same top-right placement and caption on all five, pinned as literal
  numbers by the Task 1 test; page 1's content stream still carries exactly one 144pt x 144pt `re`.
- **Name block inside the outline** on all four presets, both papers, 4mm off the stringer, never
  crossing the curve, clear of the registration line/label row and of the numeral. Midlength
  (Letter) is the numeral-collision case: the block stepped down the page and reads as a separate
  object from the "1". Shortboard, the narrowest nose, still fits on page 1 on both papers.
- **Strip maths byte-identical**: the Task 1 digest pin over pages/lines/marks/labels is green and
  unedited; seam labels still match on every seam (0 mismatches across the five files).
- **Gates in main**: 1622 passed / 1 skipped; lint 0 errors; tsc clean; `npm run build` succeeds;
  zero-line diff on `build-template-pdf.ts`/`build-overview-pdf.ts` since the base; the two stale
  "outboard" phrases absent from both source files.

**Observation, not changed (founder's call):** on four of the five renders the block's top-right
corner grazes the curve. That is by construction — the placement rule, mirroring the full
template's `nameBlockPlacement`, requires the curve to clear `clearance + boxWidth` (78mm) so the
4mm clearance lands on the stringer side only and the curve side gets none. Adding the same 4mm on
the curve side (require 82mm) would drop the block one scan step lower on those boards and keep the
box off the cut line. One constant plus re-derived landing expectations if wanted.
