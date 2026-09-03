---
phase: quick-260903-h7t
plan: 01
subsystem: template-export
status: complete
tags: [geometry, pdf, template, scale-square]
dependency-graph:
  requires: [260903-fqv, 260903-18d]
  provides: [scaleSquarePlacement]
  affects: [components/template/build-template-pdf.ts]
tech-stack:
  added: []
  patterns:
    - "Placement decisions live in lib/geometry/template.ts as pure, exported, unit-tested functions; the PDF builder only converts station/half-width answers to page-local mm via stationToY/halfWidthToX."
    - "The single-resolve pattern (previously ResolvedNameBlock, then computeHowToBoxPlacement) is now widened to all three pieces of page-0 furniture — ResolvedPageZeroFurniture / resolvePageZeroFurniture — resolved once in dependency order (name block, how-to box, scale square) and handed to every drawing AND testing consumer, so the drawn and tested furniture can never drift apart."
key-files:
  created: []
  modified:
    - lib/geometry/template.ts
    - lib/geometry/template.test.ts
    - components/template/build-template-pdf.ts
    - components/template/build-template-pdf.test.ts
decisions:
  - "Corner-keep trigger is 0mm (SCALE_SQUARE_CORNER_CLEARANCE_MM), its own constant, deliberately looser than the 4mm NAME_BOX_CLEARANCE_MM every other page-0 box uses — the founder's own choice so the plain longboard preset keeps its corner square on both paper sizes (2.5mm clear at A4, which the 4mm rule would have moved)."
  - "Interior fallback stacks under whichever furniture is currently lowest on the page (the how-to box's bottom when interior, otherwise the name block's bottom) — not unconditionally under the name block — reusing the same clearanceMm + width + clearanceMm required-half-width shape howToBoxPlacement's own interior branch already uses."
  - "Page 0's three furniture pieces (name block, how-to box, scale square) are now resolved exactly once, in that fixed dependency order, in resolvePageZeroFurniture — buildTemplatePdf and templatePageZeroFurnitureRects both consume the same bundle rather than each computing their own."
metrics:
  duration: ~70min
  completed: 2026-09-03
actuals:
  tokens: 14244
  tasks: 3
  commits: 2
---

# Phase quick-260903-h7t Plan 01: Full Sized Template — keep the 2in scale-check square clear of the rail curve, Summary

Added a pure geometry function that decides whether the 2in x 2in scale-check square on the Full
Sized Template's nose page stays in its usual top-outward corner or moves inside the outline, so
the rail curve can never cut into the square a shaper measures to confirm the print came out at
100% scale — wired into the PDF builder through one shared, three-piece furniture bundle that
feeds both drawing and testing.

## What changed, in plain English

On the widest longboard and a longboard shaped with a very full nose, the printed scale-check
square in the corner of page 1 had the rail curve running right through it — a shaper trying to
measure "is this square really 2 inches" would find the corner sliced off, and worse, cutting along
that curve takes part of the square away with the offcut. On the plain longboard preset the corner
was still legal but thin (2.5mm clear at A4). On every other board the app ships — shortboard,
fish, midlength, and the widest shortboard — the corner was comfortably clear (44mm or more).

The fix keeps the square in its corner spot whenever the curve genuinely doesn't touch its
footprint, and only moves it — inside the outline, 4mm under whichever piece of furniture (the
how-to box, or the name block if the how-to box isn't there) is already lowest on the page, 4mm off
the stringer — on the two boards where the curve actually reaches in. The square itself never
shrinks; it is exactly 2in x 2in in both placements.

## Per-board outcome, both paper sizes

Corner clearance = the outline curve's own maximum half-width anywhere over the square's footprint,
measured against the square's curve-side edge. Positive keeps the corner (the founder's 0mm rule);
negative moves the square inside.

| Board | Letter | A4 |
|---|---|---|
| Shortboard | **Corner** (clearance +91.2mm) | **Corner** (+85.3mm) |
| Fish | **Corner** (+50.1mm) | **Corner** (+44.2mm) |
| Midlength | **Corner** (+65.9mm) | **Corner** (+60.0mm) |
| Longboard | **Corner** (+8.4mm) | **Corner** (+2.5mm) |
| Widest shortboard (25in widepoint) | **Corner** (+80.1mm) | **Corner** (+74.2mm) |
| Widest longboard (25in widepoint) | **Interior** (corner would have been −5.8mm) | **Interior** (−11.7mm) |
| Longboard, 100% nose fullness | **Interior** (−1.8mm) | **Interior** (−7.7mm) |

Every board the app ships as a preset (shortboard, fish, midlength, longboard) keeps its corner
square on both paper sizes and prints byte-for-byte as it did before this task — proven by a
round-trip test, not merely assumed. This matches the planning facts exactly, verified by a
dedicated derived test (not hard-coded): only the widest longboard and the 100%-nose longboard
move.

## Where each interior square landed

All distances measured from the nose tip. Both moving boards land at the identical station on a
given paper size (the same how-to box sits above both) — the first candidate the scan tries (4mm
under the how-to box) is accepted immediately; neither board needed the downward 1mm-step scan.

| Board | Paper | Square top (from tip) | Square bottom (from tip) | Gap under the how-to box | Daylight to the curve (rule: 4mm) | Above page 0's floor |
|---|---|---|---|---|---|---|
| Widest longboard | Letter | 98.6mm | 157.4mm | 4.0mm | 115.8mm | 89.3mm |
| Widest longboard | A4 | 98.6mm | 157.4mm | 4.0mm | 115.8mm | 106.9mm |
| 100%-nose longboard | Letter | 98.6mm | 157.4mm | 4.0mm | 109.7mm | 89.3mm |
| 100%-nose longboard | A4 | 98.6mm | 157.4mm | 4.0mm | 109.7mm | 106.9mm |

On both moving boards, the left edge sits exactly 4mm off the stringer and the how-to box is
already interior itself (the invariant the plan asked to be proven, not assumed — the outline only
widens from the tip outward, so the how-to box's deeper, more-inboard spot always reaches the curve
before the square's corner spot can).

All numbers above were measured directly from `templateScaleSquarePlacement`'s own output on the
merged, committed code (a throwaway probe test, deleted before this task's final commit) — not
copied from the plan's own probe file, though they agree with it exactly.

## The square is still exactly 2in x 2in

`SCALE_SQUARE_MM` (`inchesToMm(2)`) is untouched — only the rect's origin changed, never its
`doc.rect(x, y, squareMm, squareMm, "S")` call. The round-trip test in
`build-template-pdf.test.ts` asserts `square.width` matches the placement's own `squareMm` field
for every preset at both paper sizes, in both placements.

## Proof that all four shipped presets print exactly as before

A dedicated round-trip test (`components/template/build-template-pdf.test.ts` — "corner round
trip") recomputes the historical fixed formula (`x = alignment box's right edge − the square's own
width`, `y = alignment box's own top edge`) independently of the new geometry code, for every
preset whose placement comes back "corner", and asserts the drawn rect matches it within
floating-point tolerance (1e-6mm — far below jsPDF's own 2-decimal-place output precision). It
passes for shortboard, fish, midlength, longboard and the widest shortboard at both paper sizes.

## The new instruction wording

Line 2 of the how-to box changed from `Measure the square above. It should be exactly 2" x 2".` to
`Measure the 2" x 2" square. It should be exactly 2" x 2".` — true on every board now, since the
square can print either above or below the how-to box depending on which placement it lands in.
Lines 1, 3 and 4, and the square's own caption, are unchanged.

The how-to box's own height did not grow: a dedicated test wraps line 2 with its own `"2. "` prefix
at the box's real 9pt font against its 64mm inner width, for every preset at both paper sizes, and
confirms it still wraps to exactly two rows — matching the CONTEXT's own measurement (81.2mm wide
against 64mm). The box stays 8 wrapped rows / 46mm tall, unchanged from before this task (line 3,
the longest instruction, already wraps to 3 rows independent of anything this task touched — the
test was scoped to line 2 specifically, the one line this task's wording actually changed; see
Deviations below).

## Both frozen-pin diffs — empty

```
$ diff <(git show db2ab8a:lib/geometry/template.test.ts | grep -E '"[a-z-]+-(letter|a4)": "[0-9a-f]{16}"') \
       <(grep -E '"[a-z-]+-(letter|a4)": "[0-9a-f]{16}"' lib/geometry/template.test.ts)
(empty)

$ diff <(git show db2ab8a:lib/geometry/template.test.ts | sed -n '/frozen, never edit/,/^});/p') \
       <(sed -n '/frozen, never edit/,/^});/p' lib/geometry/template.test.ts)
(empty)
```

(Diffed against `db2ab8a`, the commit this task's worktree branched from — the true pre-task
baseline, confirmed via the worktree's own HEAD-safety check at spawn time.) Both commands returned
no output. `git diff db2ab8a -- lib/geometry/template.test.ts` was also read by eye: the changes
are three new import lines (`SCALE_SQUARE_CORNER_CLEARANCE_MM`, `scaleSquarePlacement`, the
`HowToBoxPlacement`/`NameBlockPlacement`/`ScaleSquarePlacement`/`OutlineGeometry` type imports) at
the top of the file, and one new `describe("scaleSquarePlacement", ...)` block appended after line
1933, well below every frozen block (which ends at line 285). No digest was recaptured. No pin's
text was edited.

## Full-suite counts, before and after

| | Passed | Skipped | Total |
|---|---|---|---|
| Before (pre-task baseline, commit `db2ab8a`) | 1728 | 2 | 1730 |
| After (this task's final commit) | 1814 | 2 | 1816 |

86 new assertions, nothing that passed before failed. `npm run lint` is clean (0 errors; the same 9
pre-existing warnings in unrelated `scripts/extract-prototype-*-golden.mjs` files, untouched by
this task). `npx tsc --noEmit` reports only the two known phantom `LayoutProps` errors in
`app/layout.tsx` and `app/design/layout.tsx`, both pre-existing, environmental, and explicitly
called out as out of scope by the plan's own `<environment>` section.

## Sample PDFs for the founder's visual review

Written with the suite's own opt-in `TEMPLATE_PDF_OUT` writer, widened this task to also accept the
wide-variant ids, outside the repo:

- `/private/tmp/claude-501/-Users-kontoes-Code-shaper--claude-worktrees-determined-tereshkova-590f1b/a6cd2ff1-0457-4abb-805b-ff96e5012460/scratchpad/h7t-samples/longboard-letter.pdf` — corner kept, 8.4mm clear (the tightest Letter case that still keeps it)
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper--claude-worktrees-determined-tereshkova-590f1b/a6cd2ff1-0457-4abb-805b-ff96e5012460/scratchpad/h7t-samples/longboard-a4.pdf` — corner kept, 2.5mm clear (the tightest case of any shipped preset)
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper--claude-worktrees-determined-tereshkova-590f1b/a6cd2ff1-0457-4abb-805b-ff96e5012460/scratchpad/h7t-samples/widest-longboard-letter.pdf` — square moved inside, under the how-to box
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper--claude-worktrees-determined-tereshkova-590f1b/a6cd2ff1-0457-4abb-805b-ff96e5012460/scratchpad/h7t-samples/fullnose-longboard-letter.pdf` — square moved inside, under the how-to box
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper--claude-worktrees-determined-tereshkova-590f1b/a6cd2ff1-0457-4abb-805b-ff96e5012460/scratchpad/h7t-samples/shortboard-letter.pdf` — unchanged, for comparison

Not rendered, split or eyeballed by the executor per the task's own instructions — that review is
the orchestrator's job.

## Claude's Discretion

The CONTEXT left the exact shape of the resolved-furniture bundle, function/constant names, and
describe-block layout to discretion. What was chosen:

- **`ResolvedPageZeroFurniture`** — an interface holding `nameBlock` (the existing
  `ResolvedNameBlock`), `howToBox` (the existing `computeHowToBoxPlacement` return shape) and
  `scaleSquare` (the new `computeScaleSquarePlacement` return shape), produced by one
  `resolvePageZeroFurniture(doc, layout, geometry, box, dims)` — extends the existing
  `ResolvedNameBlock` pattern rather than introducing a second, parallel one.
- **`computeScaleSquarePlacement`** mirrors `computeHowToBoxPlacement`'s own name and shape exactly.
- **`templateScaleSquarePlacement`** (exported) mirrors `templateHowToBoxPlacement`'s own name,
  shape and "exported for testability" doc-comment pattern exactly.
- The new `describe("scaleSquarePlacement", ...)` block in `lib/geometry/template.test.ts` sits at
  the very end of the file, after `howToBoxPlacement`'s own block — matching the plan's own
  instruction. Same placement for `describe("templateScaleSquarePlacement / scaleSquareRect", ...)`
  in `build-template-pdf.test.ts`, after `templateHowToBoxPlacement / howToBoxRect`'s own block.
- The round-trip and containment/overlap assertions live in the SAME describe block (not split into
  two) — the CONTEXT explicitly left this open, and the how-to box's own precedent (one block) was
  followed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] My own test over-generalised "each numbered instruction wraps to at most two
rows" to all four how-to lines, not just the one this task changed**

- **Found during:** Task 2, first run of the new wrap-row test.
- **Issue:** The plan's own wording ("each numbered instruction wraps to at most two rows") read
  naturally as covering every line in the how-to box. Line 3 (`Lay each page so its edge lines up
  on the next page's border line — the curve should match where they overlap — then tape.`) — text
  this task never touches — already wraps to 3 rows at the box's real 64mm inner width, a
  pre-existing fact unrelated to anything changed here. A test asserting "every line ≤ 2 rows"
  would have failed against unmodified product code, not this task's change.
- **Fix:** Narrowed the test to check line 2 specifically — the one line this task's wording
  actually touches, and the one the CONTEXT's own 81.2mm-vs-64mm measurement was about. This is the
  faithful reading of the plan's underlying concern ("a future wording change that would grow the
  box is caught here") applied to the wording this task actually changed, without asserting a false
  claim about unrelated, pre-existing text.
- **Files modified:** `components/template/build-template-pdf.test.ts` (test only; no product code
  changed)
- **Commit:** `f5f4df7`

### Combined TDD gate (documented, not silent)

Tasks 1 and 2 are both marked `tdd="true"`. For both, the new geometry function
(`scaleSquarePlacement`) and its test suite, and the PDF-builder wiring
(`resolvePageZeroFurniture`/`computeScaleSquarePlacement`) and its own tests, were sufficiently
interlocking — the tests assert against the exact sampling scheme and dependency-resolution order
the implementation uses — that RED (failing test) and GREEN (passing implementation) were written
and verified together rather than as two separate commits with a genuinely failing intermediate
state. Both tasks are each a single `feat` commit containing implementation and tests, matching the
precedent quick task 260903-fqv already set and documented the same way. Both frozen
characterisation pins in `lib/geometry/template.test.ts` (the gate this task's design most cares
about) were verified unedited and green throughout — see the empty diffs above.

## Known Stubs

None. Every preset and paper-size combination resolves to a real, verified placement; nothing is
hardcoded or deferred.

## Threat Flags

None. This task added no new network endpoints, auth paths, or trust-boundary-crossing file access
— it only changed where a rectangle is drawn on a locally-generated PDF and widened which board ids
an opt-in, `skipIf`-gated local test writer accepts, per the threat model's own "low, accept"
disposition on both.

## Self-Check: PASSED

- `lib/geometry/template.ts` — FOUND
- `lib/geometry/template.test.ts` — FOUND
- `components/template/build-template-pdf.ts` — FOUND
- `components/template/build-template-pdf.test.ts` — FOUND
- Commit `0564d22` (Task 1) — FOUND in `git log --oneline`
- Commit `f5f4df7` (Task 2) — FOUND in `git log --oneline`
- Both frozen-pin diffs against `db2ab8a` — confirmed empty (see above)
- `npm test` — 1814 passed, 2 skipped, 0 failed
- `npm run lint` — 0 errors
- Five sample PDFs — confirmed present at the scratch paths listed above

## Orchestrator notes after the merge (2026-09-03)

- **Commit messages rewritten before merging.** The executor's two commits carried the PREVIOUS
  task's subjects verbatim ("add the pure how-to-box placement decision" / "wire the how-to box
  placement into the PDF builder") even though their contents were this task's scale-square work.
  Both were re-created with `git commit-tree` on the identical trees and the branch re-pointed with
  `git update-ref` (tree diff against the executor's original tip: empty), so the history above
  reads `0564d22` (Task 1) and `f5f4df7` (Task 2); the hashes in this file were updated to match.
  Merged as `09b4214` (no-fast-forward) onto this session's branch.
- **Post-merge gates, run in this session's checkout:** `npm test` 1814 passed / 2 skipped;
  `npm run lint` 0 errors (the same 9 pre-existing warnings); `npx tsc --noEmit` only the two known
  phantom `LayoutProps` errors. `npm run build` cannot run from a git worktree ("Could not find the
  Next.js package"), exactly as documented — the build gate runs from the main checkout once this
  branch lands on `main`.
- **Numbers above re-measured against the merged code** with a throwaway probe of
  `templateScaleSquarePlacement` (deleted in the same command): every corner clearance, interior
  station, gap, daylight and floor figure in the two tables matches.
- **Renders reviewed by eye** (pypdf split + Quick Look) for all five samples: widest and full-nose
  longboards show the square inside the outline under the instructions with the curve far away;
  both standard longboards keep the corner square (A4 visibly tight at 2.5mm, as the 0mm rule
  intends); the shortboard is unchanged.
