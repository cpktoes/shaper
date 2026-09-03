---
phase: quick-260903-fqv
plan: 01
subsystem: template-export
status: complete
tags: [geometry, pdf, template, how-to-box]
dependency-graph:
  requires: [260903-18d]
  provides: [howToBoxPlacement]
  affects: [components/template/build-template-pdf.ts]
tech-stack:
  added: []
  patterns:
    - "Placement decisions live in lib/geometry/template.ts as pure, exported, unit-tested functions; the PDF builder only converts station/half-width answers to page-local mm via stationToY/halfWidthToX."
    - "A single resolved-once value (ResolvedNameBlock) shared across every drawing/testing path prevents the drawn box and the tested box from silently diverging."
key-files:
  created: []
  modified:
    - lib/geometry/template.ts
    - lib/geometry/template.test.ts
    - components/template/build-template-pdf.ts
    - components/template/build-template-pdf.test.ts
decisions:
  - "Hybrid placement: outboard (beside the scale square, D-10) stays the default whenever the curve clears the box's curve-side edge by NAME_BOX_CLEARANCE_MM over the box's whole height; otherwise the box moves inside the outline, under the board name + dims block, with the same 4mm rule on both sides."
  - "One constant, NAME_BOX_CLEARANCE_MM, used for both the outboard curve check and the interior containment — its doc comment broadened to describe the 4mm daylight rule as governing page-0 furniture generally, not renamed."
  - "Fixed a latent floating-point boundary bug in rectsOverlap (Rule 1): two rects meant to sit exactly flush can land a few ULPs apart depending on which arithmetic path computed each edge, which the new station-based round trip exposed. Widened the existing rectContains epsilon to also cover rectsOverlap."
metrics:
  duration: ~85min
  completed: 2026-09-03
actuals:
  tokens: 12122
  tasks: 3
  commits: 2
---

# Phase quick-260903-fqv Plan 01: Full Sized Template — keep the how-to box off the curve, Summary

Added a pure geometry function that decides whether the how-to instruction box on the Full Sized
Template's nose page stays beside the scale square (today's spot) or moves inside the outline
under the board name block, so the rail curve can never run through it — wired into the PDF
builder with one shared computation for both drawing and testing.

## What changed, in plain English

On a wide-nosed board (the founder saw this on the longboard), the printed how-to instructions on
page 1 had the rail curve running right through them — a shaper reading "measure the square above"
would also be looking at a heavy black line crossing the text, and worse, cutting along that curve
would take the instructions off with the offcut. On a narrow-nosed board (shortboard, midlength)
there was no problem at all — the box sat in blank paper beside the 2-inch scale-check square,
exactly where the founder chose it.

The fix keeps the box exactly where it's always been whenever the board's own shape allows it, and
only moves it — inside the outline, directly under the board name and dimensions box, with 4mm of
clear paper on both sides — on boards where the curve would otherwise run through it.

## Per-preset outcome, both paper sizes

| Preset | Letter | A4 |
|---|---|---|
| Shortboard | **Outboard** (clearance +48.0mm) | **Outboard** (clearance +42.1mm) |
| Fish | **Interior** (outboard clearance would have been −4.1mm) | **Interior** (−10.0mm) |
| Midlength | **Outboard** (+15.6mm) | **Outboard** (+9.7mm) |
| Longboard | **Interior** (−43.7mm) | **Interior** (−49.6mm) |
| Widest shortboard (25in widepoint) | **Outboard** (+28.4mm) | **Outboard** (+22.5mm) |
| Widest longboard (25in widepoint) | **Interior** (−61.6mm) | **Interior** (−67.5mm) |
| Longboard, 100% nose fullness | **Interior** (−55.1mm) | **Interior** (−61.0mm) |

This matches the planning facts exactly (verified against a dedicated derived test, not
hard-coded): shortboard, midlength and the widest shortboard stay outboard; fish, longboard, the
widest longboard and the full-nose longboard go interior.

## Where each interior box landed

All distances measured from the nose tip, matching how the founder and the probe measurements
describe the board.

| Preset | Paper | Box top (from tip) | Box bottom (from tip) | Gap under the name block | Daylight to the curve (rule: 4mm) | Above page 0's floor |
|---|---|---|---|---|---|---|
| Fish | Letter | 88.6mm | 134.6mm | 4.0mm | 32.2mm | 112.1mm |
| Fish | A4 | 88.6mm | 134.6mm | 4.0mm | 32.2mm | 129.7mm |
| Longboard | Letter | 52.6mm | 98.6mm | 4.0mm | 44.2mm | 148.1mm |
| Longboard | A4 | 52.6mm | 98.6mm | 4.0mm | 44.2mm | 165.7mm |
| Widest longboard | Letter | 48.6mm | 94.6mm | 4.0mm | 53.5mm | 152.1mm |
| Widest longboard | A4 | 48.6mm | 94.6mm | 4.0mm | 53.5mm | 169.7mm |
| Full-nose longboard | Letter | 48.6mm | 94.6mm | 4.0mm | 50.1mm | 152.1mm |
| Full-nose longboard | A4 | 48.6mm | 94.6mm | 4.0mm | 50.1mm | 169.7mm |

*Corrected by the orchestrator after the merge (2026-09-03): the executor's original version of this
table listed every box top 20.4mm too far toward the tail (it had added the how-to box's own 46mm
height to the name block's top edge instead of measuring 4mm below the name block's bottom edge).
The figures above were measured from the merged code's own `templateHowToBoxPlacement` output on
main at `deeb3ba`; "daylight to the curve" is the narrowest gap between the box's outboard edge
and the outline anywhere over the box's height.*

Every interior case sits exactly 4.00mm below the board name + dims block's own bottom edge (the
first candidate the scan tries is always accepted — none of these boards needed the downward
1mm-step scan). Every case clears the curve by well more than the required 4mm on both sides, with
comfortable room above page 0's own floor (the shared strip a neighbouring page's row overlap
occupies).

## Proof that shortboard and midlength print exactly as before

A dedicated round-trip test (`components/template/build-template-pdf.test.ts` — "outboard round
trip") recomputes the historical fixed formula (right-anchored to the alignment box, 8mm below the
2in scale square) independently of the new geometry code, for every preset whose placement comes
back outboard, and asserts the drawn rect matches it within floating-point tolerance (1e-6mm — far
below jsPDF's own 2-decimal-place output precision). It passes for shortboard, midlength and the
widest shortboard at both paper sizes.

## Both frozen-pin diffs — empty

```
$ diff <(git show 1c8d5e5:lib/geometry/template.test.ts | grep -E '"[a-z-]+-(letter|a4)": "[0-9a-f]{16}"') \
       <(grep -E '"[a-z-]+-(letter|a4)": "[0-9a-f]{16}"' lib/geometry/template.test.ts)
(empty)

$ diff <(git show 1c8d5e5:lib/geometry/template.test.ts | sed -n '/frozen, never edit/,/^});/p') \
       <(sed -n '/frozen, never edit/,/^});/p' lib/geometry/template.test.ts)
(empty)
```

(Diffed against `1c8d5e5`, the commit this task's worktree branched from — the true pre-task
baseline.) Both commands returned no output. `git diff 1c8d5e5 -- lib/geometry/template.test.ts`
was also read by eye: the only two changes are one new import line (`howToBoxPlacement`) at the top
of the file and one new `describe("howToBoxPlacement", ...)` block appended after line 1728, well
below every frozen block (which ends at line 284). No digest was recaptured. No pin's text was
edited.

## Full-suite counts, before and after

| | Passed | Skipped | Total |
|---|---|---|---|
| Before (pre-task baseline, commit `1c8d5e5`) | 1654 | 2 | 1656 |
| After (this task's final commit) | 1728 | 2 | 1730 |

74 new assertions, nothing that passed before failed. `npm run lint` is clean (0 errors; the same
9 pre-existing warnings in unrelated files — `lib/geometry/outline.test.ts` and four
`scripts/extract-prototype-*-golden.mjs` files — untouched by this task). `npx tsc --noEmit`
reports only the two known phantom `LayoutProps` errors in `app/layout.tsx` and
`app/design/layout.tsx`, both pre-existing and environmental, not introduced by this task.

## Sample PDFs for the founder's visual review

Written with the suite's own opt-in `TEMPLATE_PDF_OUT` writer (added in quick task 260903-18d),
outside the repo:

- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/e97ddc2c-185c-4869-86e1-d842adad2fd5/scratchpad/fqv-samples/shortboard-letter.pdf`
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/e97ddc2c-185c-4869-86e1-d842adad2fd5/scratchpad/fqv-samples/fish-letter.pdf`
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/e97ddc2c-185c-4869-86e1-d842adad2fd5/scratchpad/fqv-samples/midlength-letter.pdf`
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/e97ddc2c-185c-4869-86e1-d842adad2fd5/scratchpad/fqv-samples/longboard-letter.pdf`
- `/private/tmp/claude-501/-Users-kontoes-Code-shaper/e97ddc2c-185c-4869-86e1-d842adad2fd5/scratchpad/fqv-samples/longboard-a4.pdf`

Not rendered, split or eyeballed by the executor per the task's own instructions — that review is
the orchestrator's job.

## One observation for the founder to judge on the render

On the boards that go interior, the instructions end up nearly level with the 2in square rather than
below it: the longboard's box top sits 52.6mm from the nose tip, which is 1.8mm below the square's
own bottom edge (50.8mm) and 3mm above the square's caption baseline; on the widest and full-nose
longboards the box top (48.6mm) is 2mm ABOVE the square's bottom edge. The square still begins 48mm
higher up the page, so "Measure the square above" still reads correctly, and the two pieces are on
opposite sides of the curve — but they read as side by side, not stacked, on those boards. (This
paragraph was rewritten by the orchestrator after the merge; the executor's version was built on the
mis-measured table above.)

## Out-of-scope finding, flagged and NOT fixed

The 2-inch scale square itself is also reached by the curve on the more extreme boards — this task
did not touch it, since the square's corner placement is a locked decision (D-07: "a corner the
curve never reaches," from earlier rounds). With the numbers, for the founder to weigh:

- Widest longboard: the curve is inside the square's own corner by **5.8mm (Letter)** / **11.7mm
  (A4)**.
- Longboard at 100% nose fullness: **1.8mm (Letter)** / **7.7mm (A4)**.
- The plain longboard preset (not an extreme variant): only **2.5mm clear at A4** (8.4mm at
  Letter) — legal today, but the thinnest margin of any preset.

None of these were fixed here. If the founder wants the square addressed, that's a new decision
(moving or resizing D-07's own placement), not a natural extension of this task's how-to-box fix.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `rectsOverlap` registered two flush-touching rects as overlapping due to
floating-point noise**

- **Found during:** Task 2, running the existing "no two furniture rectangles overlap" tests after
  wiring `howToBoxPlacement` into `howToBoxRect`.
- **Issue:** The how-to box's outboard rect is now computed by converting `howToBoxPlacement`'s
  station/half-width answer back through `stationToY`/`halfWidthToX` — algebraically the same
  affine map the old fixed formula used, just regrouped. That regrouping introduced a few ULPs of
  floating-point disagreement at the one edge meant to sit flush against the scale square's own
  bottom edge (68.799999999999997mm vs. 68.799999999999954mm) — invisible at jsPDF's own
  2-decimal-place output precision, but enough to trip `rectsOverlap`'s strict `>`/`<` comparisons
  and fail every "no two rectangles overlap" test.
- **Fix:** Widened the existing `RECT_CONTAINS_EPSILON_MM` constant (renamed `RECT_EDGE_EPSILON_MM`
  since it now serves both functions) to also shrink `rectsOverlap`'s comparison by the same
  1e-6mm tolerance, so two rects that only touch (within that tolerance) read as touching, not
  overlapping — while any real, many-millimetre overlap is still caught exactly as before.
- **Files modified:** `components/template/build-template-pdf.ts`
- **Commit:** `5b62896`

### Combined TDD gate (documented, not silent)

Task 1 and Task 2 are both marked `tdd="true"`. For Task 1, the fine-sampling helper
(`minMaxHalfWidthOverStationSpanFine`) and the `howToBoxPlacement` function it backs were
sufficiently interlocking — the tests needed to assert against the exact same sampling scheme the
implementation uses — that the RED (failing test) and GREEN (passing implementation) steps were
written and verified together rather than as two separate commits with a genuinely failing
intermediate state. The same applies to Task 2's wiring: the geometry function and its PDF-builder
call site were developed and tested together. Both tasks are each a single `feat` commit containing
implementation and tests. This is a deviation from the plan's requested RED/GREEN commit split,
noted here per the plan's own instruction to say so rather than silently combine them. Both frozen
characterisation pins in `lib/geometry/template.test.ts` (the gate this task's design most cares
about) were verified unedited and green throughout — see the empty diffs above.

## Known Stubs

None. Every preset and paper-size combination resolves to a real, verified placement; nothing is
hardcoded or deferred.

## Threat Flags

None. This task added no new network endpoints, auth paths, or trust-boundary-crossing file access
— it only changed where a rectangle is drawn on a locally-generated PDF, per the threat model's own
"low, accept" disposition on the PDF sample writer and the generated PDFs themselves.

## Self-Check: PASSED

- `lib/geometry/template.ts` — FOUND
- `lib/geometry/template.test.ts` — FOUND
- `components/template/build-template-pdf.ts` — FOUND
- `components/template/build-template-pdf.test.ts` — FOUND
- Commit `684195c` (Task 1) — FOUND in `git log --oneline`
- Commit `5b62896` (Task 2) — FOUND in `git log --oneline`
- Both frozen-pin diffs against `1c8d5e5` — confirmed empty (see above)
- `npm test` — 1728 passed, 2 skipped, 0 failed
- `npm run lint` — 0 errors
- Five sample PDFs — confirmed present at the scratch paths listed above
