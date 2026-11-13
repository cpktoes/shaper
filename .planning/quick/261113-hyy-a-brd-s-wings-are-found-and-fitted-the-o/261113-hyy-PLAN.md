---
phase: quick-261113-hyy
plan: 01
type: execute
wave: 1
depends_on: [quick-261113-gwr]
files_modified:
  - lib/geometry/brd-wings.ts
  - lib/geometry/brd-wings.test.ts
  - lib/geometry/brd-fit.ts
  - lib/geometry/brd-fit.test.ts
  - lib/geometry/__snapshots__/brd-fit.test.ts.snap
  - lib/models/brd-board.test.ts
  - lib/export/brd-fit-preview.ts
  - lib/export/brd-fit-preview.test.ts
  - components/setup/brd-fit-dialog.tsx
  - components/template/build-brd-overview-pdf.ts
  - components/template/build-brd-overview-pdf.test.ts
  - e2e/brd-fit-preview.spec.ts
  - .planning/quick/261113-hyy-a-brd-s-wings-are-found-and-fitted-the-o/pictures/
autonomous: true
requirements: [HYY-W1-find, HYY-W2-fit-around, HYY-W3-our-wing, HYY-W4-say-it, HYY-WINGLESS-unchanged]

estimate:
  tokens: 200000
  raw_tokens: 200000
  tasks: 3
  confidence: low
  # factor 1, no calibration samples. Raw = gwo's three-task plan (150k) plus a search inside the fit and a recorded
  # before-snapshot. One executor, this worktree, the three tasks in order, AFTER 261113-gwr is built and committed.

must_haves:
  truths:
    - "A .brd whose outline steps inward on the way to the tail (like the Fryer's flyer) is found to have a wing: where (off the tail), how deep and how much run along the stringer, up to two, nose-most first; a file with no wing — the Egg, the 6'2, the Scoop and every export of a wingless board — never grows one (W1)"
    - "When a wing is found, the closest fit is our curve PLUS our wing, drawn by the app's own applyWings, fitted to the file's outline end to end — the curve fitted to the outline above the wing and to the tail block, the wing bringing it in; on the Fryer the outline's widest gap falls from 2.8 mm to about 1.3 mm (W2)"
    - "Our wing has values the WINGS tab's sliders hold (inside their ranges and the order rule), sharp corners, no fin lock; the dashed outline in the preview and on the printed overview is the winged one, and Open as a Board opens with the wing on the WINGS tab, editable like any wing (W3)"
    - "The preview and the printed overview state, for each wing, the file's wing as measured beside ours as fitted — off the tail as a dim, depth and run as marks, in the shaper's system; the HOW CLOSE outline line is the winged fit's; the not-read line no longer mentions wings or flyers (W4)"
    - "A file with no wing fits exactly as it did before this task: the same controls and the same figures, pinned by a snapshot recorded on the untouched code (HYY-WINGLESS)"
    - "The whole preview fit stays well under a second with a wing (measured about 0.15–0.25 s for the outline in Node, warm)"
  artifacts:
    - path: lib/geometry/brd-wings.ts
      provides: "findBrdWings(outline) -> BrdFileWing[]; BRD_WING_POCKET_MIN_MM; BRD_WING_STEP_MAX_MM; the BrdFileWing type"
    - path: lib/geometry/brd-fit.ts
      provides: "fitOutline's winged branch (fitTailAroundWings), BrdFit.fileWings, the wingless branch byte-for-byte today's"
    - path: lib/export/brd-fit-preview.ts
      provides: "BRD_FIT_COPY.wingLine, notRead without wings, BrdFitSheet.wings: string[]"
    - path: lib/geometry/__snapshots__/brd-fit.test.ts.snap
      provides: "the wingless fits as they stood before this task (recorded on untouched code)"
  key_links:
    - from: lib/geometry/brd-fit.ts fitOutline
      to: lib/geometry/brd-wings.ts findBrdWings
      via: "called once on the file's outline after the nose fit; [] keeps today's tail code path exactly"
    - from: lib/geometry/brd-fit.ts fitTailAroundWings
      to: lib/geometry/wings.ts (clampWingStations, wingTakeAt, wingFootprint, wingPositionTop) and outline.ts buildOutline -> applyWings
      via: "every candidate drawn by the app's own winged-outline code, so the dashed line IS what the board will draw"
    - from: lib/models/brd-board.ts brdBoardFields
      to: the opened board's WINGS tab
      via: "fit.outline carries wings; readBoardEntry keeps them (a saved board already holds wings); no code change expected there, a test proves it"
---

<objective>
Fifth step of opening a `.brd` (the founder, 2026-11-13, BRIEF W1–W4): "On outlines with wings, like the Flyer, let's try to fit
the tail block and the outline above the wing as best as possible. The wing can be added to bring the curve in ... The preview
needs to state where the wing is, how deep it is, and how much of a run along stringer there is."

Today the closest fit is one smooth curve that splits the difference across the Fryer's flyer (widest gap 2.8 mm at 7 1/16" from
the tail). After this plan the app finds the flyer, fits our curve around it, adds our own wing on top, says both wings in the
preview and on paper, and opens the board with the wing on the WINGS tab.

Output: a pure, tested wing finder; the fit's winged branch (the wingless branch untouched and pinned); the words on screen and
paper; browser proof, pictures and PDFs for the founder's look.

Read first: this task's `BRIEF.md`, then "What the planner measured" below — the method is written out there in full; follow it
step by step. Rule 1 (pure maths in lib/geometry, tested), Rule 2 (units through units.ts / measure-display.ts), plain English
in commit messages and the SUMMARY. Anchor on function names, not line numbers: 261113-gwr (bottom contours) was built just
before this and touched brd-fit.ts, brd-fit-preview.ts, the dialog and the PDF builder — re-read each file as it now stands.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/261113-hyy-a-brd-s-wings-are-found-and-fitted-the-o/BRIEF.md
@.planning/quick/261113-et0-open-a-brd-as-an-editable-board-from-the/261113-et0-SUMMARY.md
@CLAUDE.md
@AGENTS.md
@lib/geometry/brd-fit.ts
@lib/geometry/wings.ts
@lib/export/brd-fit-preview.ts
@lib/models/brd-board.ts
@components/setup/brd-fit-dialog.tsx
@components/template/build-brd-overview-pdf.ts
@.claude/skills/sketch-findings-shaper/references/wings.md
</context>

## What the planner measured (2026-11-13; scratch scripts, never in the repo)

Scripts: `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/hyy/` —
`detect.ts` (the finder, the chosen rule), `wfit.ts` (today's fitOutline copied, plus the winged tail fit; mode `alt` with
`ALT=3` is the chosen method), `rt.ts` / `rt2.ts` (round trips), `edge.ts` (shallow wings and smooth hips), `final.ts`
(timings, the Fryer's figures), `lib.ts` (read a file / export a board). Run with the worktree's
`node_modules/.bin/tsx --tsconfig <worktree>/tsconfig.json <script> aku,plain,wing` (a `node_modules` symlink sits in `hyy/`).

**The Fryer's flyer, as the file draws it.** One flyer per rail (one wing in the app's terms, mirrored on both rails). The
outline climbs the tail at about 0.33 in/in, then from 7.031" to 7.410" off the tail it rises 0.348" in a 45°-ish leg (slope
0.68 to 1.1), corners nearly sharp, then carries on at 0.26 in/in. Measured: **position 7.410" (7 7/16") off the tail, depth
0.252" (1/4"), run 0.379" (3/8") along the stringer**; the dip under a straightedge across it is 4.77 mm. Its squash end has
rounded corners (the file's outline meets the stringer at the very end, so the widths table already reads "No flat end").

**Construction A follows it.** Taking our would-be wing back out of the file (adding its depth back, fading to nothing at the
tail exactly as `wings.ts` does) leaves an outline our curve fits within 1.28 mm — the same size as the fit's error on wingless
files. A wing whose depth did NOT fade (the whole tail block stepped in) would leave 6.39 mm. So the flyer is the kind the
app builds; what is left is the tail block's corner: the file's squash corners are rounded, ours are square — the same limit
the wingless fit already has there.

**Results on the Fryer:** today 2.75 mm widest gap at 7.031", where the file is narrower; typical 0.79 mm. Winged fit:
**1.29 mm at 0.591" (9/16") from the tail, where the file is wider** (the rounded corner); typical 0.41 mm. **Our wing: 7.379"
(7 3/8") off the tail, 0.239" (1/4") deep, 0.389" (3/8") run, sharp, no lock.** Our tail block 2.06" (today 2.80"), tail 12"
width 14.447" vs the file's 14.399".

**How a wing is told from a smooth outline (the rule, W1).** A wingless outline's tail half only ever turns one way: lay a
straightedge across any stretch and the rail stands on or above it. A wing makes a dip: the rail steps in, then climbs back out
faster than the curve either side. The rule: lay the tightest straightedges over the tail half (the upper hull); a wing is a
dip at least **1/32" deep** under one, whose step (from its deepest point to where the rail rejoins the straightedge) is no
longer than **3"** (the longest run, 2", plus an inch for rounded corners). Measured margin:
- Wingless: the Egg, the 6'2 and the Scoop have no dip at all (the hull is the outline). All 40 wingless exports of the app's
  own boards (4 presets x 5 tails x Hard Edge on/off): largest dip 0.03 mm; the writer's wobble beside a rounded wing 0.15 mm.
  Smooth hand-made hips (1/32" to 1/4" over 2" to 12"): none. That is 25 times under the line.
- Wings: the Fryer 4.77 mm; the app's own exported wings 2.79 mm (a 3/16" wing 2 rounded as far as it fits) to 23.9 mm (1"
  deep): at least 3.5 times over.
- Honest limit: a 1/16"-deep wing with a 1–2" run bends the rail by less than 1/32" and reads as part of the curve; the fit's
  HOW CLOSE line then shows it as an outline gap of at most about 1/16". A square 1/16" step is found (1.59 mm).
- Finding takes 0.1 ms.

**Round trips (the known answer).** The app's own exports of winged boards (`phase16WingBoards()`), read back and fitted, radius
not fitted (sharp):
| Board | True wing(s) (station / depth / run / radius) | Fitted | Winged gap |
|---|---|---|---|
| shortboard one | 11 / 0.187 / 0.25 / 0 | 11.003 / 0.191 / 0.254 | 0.13 mm |
| shortboard deep | 11 / 1 / 1 / 0 | 11.006 / 1.000 / 1.006 | 0.13 mm |
| shortboard square | 11 / 0.375 / 0 / 0 | 11.000 / 0.380 / 0 | 0.13 mm |
| shortboard rounded | 11 / 0.5 / 0.5 / 0.25 | 10.998 / 0.503 / 0.512 | 0.47 mm |
| shortboard infade | 22 / 0.187 / 0.25 / 0 | 22.006 / 0.189 / 0.252 | 0.16 mm |
| fish rounded | 11 / 0.5 / 0.5 / 0.25 | 11.016 / 0.501 / 0.531 | 0.49 mm |
| midlength square | 11 / 0.375 / 0 / 0 | 11.000 / 0.375 / 0 | 0.19 mm |
| longboard deep | 11 / 1 / 1 / 0 | 11.001 / 1.000 / 1.000 | 2.30 mm (its nose — 2.3 mm wingless too) |
| shortboard two, wing 2 at 1/4" radius | 11/0.187/0.25/0 + 8/0.187/0.5/0.25 | 11.006/0.182/0.258 + 8.004/0.197/0.510 | 0.18 mm |
| shortboard two as the app adds it (wing 2 rounded 1 7/16") | 11/0.187/0.25/0 + 8/0.187/0.5/1.438 | 10.997/0.188/0.248 + 8.148/0.193/0.801 | 0.17 mm |
Every single wing comes back within a quarter of a slider step (1/16") on position and depth and half a step on run. The base
curve, compared outside each step, lies within 0.14–0.45 mm of the board's own (longboard 2.66 mm, its nose, as wingless).
Two wings come back within one step when wing 2's corners are rounded no more than 1/4". The app's own "+ Add wing 2" rounds
wing 2 as far as it fits (1 7/16" on a 1/2" run): that step is a long gentle S, and a sharp wing matches it with its run
stretched to take in the rounds (0.80–0.92" for 0.5") and sitting about 0.15" forward — the outline still within 0.17–0.49 mm.

**The corner radius (my call: not fitted).** Fitting it was tried: on the Fryer it comes out 0.07" and changes the gap by under
0.01 mm; on the app's own rounded wings it trades against run and position (fitted 0.15–0.35" for a true 0.25", run and
position moving up to 0.06") — not stable. Every wing opens sharp (radius 0, the first wing's own default), and the preview says
"sharp corners".

**Speed (Node, warm):** today's whole Fryer fit 43 ms; the winged outline fit (nose and tail) 153 ms on the Fryer, 213 ms with
two wings; finding 0.1 ms. The wingless path does no extra work beyond the 0.1 ms finder.

## The method — write it exactly like this

**A. `findBrdWings(outline)` — new file `lib/geometry/brd-wings.ts`.** Pure; imports only `P2` (type, `./bezier-fit`), units,
and `MAX_WINGS`, `WING_RUN_RANGE_IN` from `./wings`. It must NOT import `./brd-fit` (brd-fit imports this file); it carries its
own 10-line half-width reader (the highest y among the line's segments spanning a station, a vertical segment giving both
ends, the nearer end's y off the line — the same rule as brd-fit's `lineHighestAt`).
1. The wide point: walk the outline, `half` = the largest y and `wideAt` its x (first maximum, `>` not `>=`, as fitOutline does).
2. `pts` = the outline's points with x <= wideAt + 1e-6, in file order (the same filter as fitOutline's `tailFile`, so indices
   agree between the finder and the fit).
3. Stretches are index ranges of `pts`; start with one, [0, pts.length − 1].
4. In one stretch [lo, hi]: the upper hull of pts[lo..hi] by the monotone-chain walk (for each point in order, pop the last
   hull vertex while cross(second-last, last, point) >= 0, cross(o, a, b) = (a.x − o.x)(b.y − o.y) − (a.y − o.y)(b.x − o.x);
   then push). For each consecutive hull pair a (index ia), b (index ib) with ib − ia >= 2 and b.x − a.x > 1e-9: for every i
   strictly between, skipping any i with b.x − x_i > BRD_WING_STEP_MAX_MM, the dip = a.y + (b.y − a.y)(x_i − a.x)/(b.x − a.x)
   − y_i. The stretch's candidate is the largest dip: inner = pts[i] (innerIndex = i), outer = b (outerIndex = ib).
5. A candidate counts when its dip >= BRD_WING_POCKET_MIN_MM. Take the counting candidate with the largest dip over all
   stretches, record it, and split its stretch into [lo, innerIndex] and [outerIndex, hi]. Repeat until MAX_WINGS are found or
   no stretch has a counting candidate.
6. Each wing as measured (`BrdFileWing`): station = outer.x; run = outer.x − inner.x; depth = max(0, outer.y − inner.y −
   slopeAhead · run) with slopeAhead = (halfWidthAt(outline, outer.x + 1") − outer.y) / 1" (read on the WHOLE outline, not
   `pts`); dip; innerIndex; outerIndex. All millimetres (`Mm`).
7. Return them nose-most first (station descending): wing 1 is the forward wing, as on the WINGS tab.
Constants, exported, each with a one-line why: `BRD_WING_POCKET_MIN_MM = inchesToMm(1/32)`, `BRD_WING_STEP_MAX_MM =
inchesToMm(WING_RUN_RANGE_IN.max + 1)`.

**B. The winged branch of `fitOutline` in `lib/geometry/brd-fit.ts`.** Everything up to and including the nose fit, the tail
seeds (`endHalf`, `tailUnit`, `blockMax`) and the `tailSpec(x, squash)` builder stays as it is. Then `const found =
findBrdWings(file)`. When `found` is empty, run today's tail code exactly (both `tailFamily` runs, the `useSquash` rule, the
pin/round naming) — do not refactor it, do not reorder a single call. When `found` is not empty, call a new
`fitTailAroundWings` (same file, private) that does:
1. Boxes: station in [inchesToMm(WING_POSITION_MIN_IN), wingPositionTop({ length, widePointStation: wideStation })], depth in
   WING_DEPTH_RANGE_IN, run in WING_RUN_RANGE_IN (all through inchesToMm); three unit numbers per wing (the same toUnit /
   fromUnit as the tail). `wingsOf(u)` makes one `Wing` per found wing — { station, depth, run, radius: mm(0), lock: null,
   finOffset: mm(0) } — and passes the list through `clampWingStations(list, { length, widePointStation: wideStation })`
   (it keeps the order, so wing k stays index k).
2. `keep(low)`: the tail-file points minus, for each wing k, every point whose index is < outerIndex_k AND (index >=
   innerIndex_k OR x >= low[k] − 1 mm). This drops the step itself and its footprint and keeps the outer corner point (a square
   step's two points share one station; the index tells them apart — a station test cannot).
3. Target 0 (the file with our wing taken back out): keep(each inner station), each kept point lifted by the sum over wings
   of (x <= inner_k ? depth_k · x / inner_k : 0), depth_k = the measured depth. (The tail pod is at 0 for the squash, pin and
   round the fit makes, so the fade is x / inner.)
4. Base 0: the same two `tailFamily` searches as today but scored against target 0 (pack it once) with the plain `tailSpec`,
   then today's `useSquash` rule picks the family. Keep its unit numbers `xs` and the `squash` flag for the rest.
5. Seeds: base0 = drawnOutline(tailSpec(xs, squash)); for wing k in order (nose-most first): d_k = clamp(lineHighestAt(base0,
   inner_k) − sum over j < k of d_j · min(1, inner_k / inner_j) − lineHighestAt(file, inner_k), depth range). Seed u = for each
   wing [unit(station = outer_k), unit(d_k), unit(clamp(outer_k − inner_k, run range))], each clamped to [0, 1].
6. Three rounds, r = 0, 1, 2. (a) Polish the wings with the base held: u = nelderMead(score of gapBetween(tailFilePacked,
   packLine(drawnOutline({ ...tailSpec(xs, squash), wings: wingsOf(u) }) kept at x <= wideStation + 1e-6)), u). Remember (score,
   xs, u) when it is the best so far. (b) If r < 2, refit the base to these wings: wings = wingsOf(u); g = buildOutline({
   ...tailSpec(xs, squash), wings }); feet = wings.map(wingFootprint); target = keep(k -> min(feet[k].inner, inner_k)), each
   point lifted by wingTakeAt(g, x) (exactly what construction A takes there); xs = nelderMead(tail score against this target
   with the plain tailSpec(·, squash), start xs).x.
7. The answer is the best-scoring round's: spec = { ...tailSpec(xs, squash), wings: wingsOf(u) }, then today's pin/round naming
   for a pointed tail (from xs[0]). Score = today's `largest + typical`. `NELDER_MEAD_ITERATIONS` unchanged.
Why rounds and the best of them: the polish alone gets single wings right but two wings wander (wing 1 came back 0.25–0.28"
deep for 0.187"); re-deriving the base from the polished wings fixes it; on the Fryer round 0 is best, on two wings round 2.
`BrdFit` gains `fileWings: BrdFileWing[]` (the measured wings, [] for none); `fitBoardToBrd` fills it from the same `found`
(have fitOutline return it). A wingless fit's `outline` must have NO `wings` key at all.
If 261113-gwr's bottom fit reads the fitted outline (look in `fitBoardToBrd` and `lib/geometry/brd-bottom.ts`), make sure it
reads the same `OutlineSpec` the board opens with (winged) and that the outline is fitted first; report what you found.

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Find a .brd's wings and fit our curve and our wing around them; a wingless file fits exactly as before</name>
  <files>lib/geometry/brd-wings.ts, lib/geometry/brd-wings.test.ts, lib/geometry/brd-fit.ts, lib/geometry/brd-fit.test.ts, lib/geometry/__snapshots__/brd-fit.test.ts.snap, lib/models/brd-board.test.ts</files>
  <read_first>lib/geometry/brd-fit.ts (fitOutline, tailFamily, drawnOutline, gapBetween/packLine, nelderMead, fitBoardToBrd, BrdFit), lib/geometry/brd-fit.test.ts (tripOf, drawn, expectInsideRanges, TRIP_LABELS), lib/geometry/wings.ts (Wing, clampWingStations, wingPositionTop, wingTakeAt, wingFootprint, the range constants), lib/geometry/__fixtures__/phase16-boards.ts (phase16Boards, phase16WingBoards), lib/models/brd-board.ts and its test, the scratch detect.ts and wfit.ts named above</read_first>
  <behavior>
    - FIRST, on the untouched brd-fit.ts: a test "a file with no wing fits exactly as before" over TRIP_LABELS plus fish|asis|hard (a swallow the fit makes a squash), shortboard|diamond|hard, and one hand-made outline (the Shortboard's drawn outline with a smooth hip: y minus 1/8" x (1 − smoothstep) over 10"–14", passed straight to fitBoardToBrd with that board's bottom and deck) — `expect({ outline, rocker, foil, closeness }).toMatchSnapshot()` per board. Run it once so vitest writes `__snapshots__/brd-fit.test.ts.snap` from today's code. After the change it must pass untouched, never re-run with -u.
    - Every wingless fit has no `wings` key on its outline and `fileWings` = [].
    - findBrdWings: [] for the 20 `|hard` boards of phase16Boards() exported and read back; [] for smooth hand-made hips (1/16", 1/8", 1/4" over 2", 4", 8"); one wing for a square 1/16" step at 11" on a drawn outline (station 11" within 0.1 mm, depth 1/16" within 0.1 mm, run 0); one wing within 1/16" of the truth on station, depth and run for wing|shortboard|one, |deep, |square, |infade exported and read back; two wings, nose-most first, for wing|fish|two; never more than MAX_WINGS (a hand-made outline with three square steps gives the two deepest).
    - The winged round trip (wing|shortboard|one, wing|midlength|square, wing|fish|rounded, wing|longboard|deep, and wing|shortboard|two with wing 2's radius set to 1/4"): every fitted wing within two slider steps (inchesToMm(2/16)) of the truth on station, depth and run; radius 0, lock null, finOffset 0; the same tail kind; the winged outline's largest gap under 1 mm (longboard: under 3 mm, its nose); the fitted curve without wings within 1 mm of the board's own (longboard 3 mm), compared outside each true wing's stretch (station − run − 1" to station + 1"); expectInsideRanges passes and every wing sits inside its slider ranges with clampWingStations returning the same array.
    - The app's default two-wing board (wing|shortboard|two, wing 2 rounded as far as it fits) still finds two wings and its winged outline comes within 1 mm; wing 1 within two steps; a comment records that wing 2's run comes back long because its corners are not fitted (the honest limit, measured 0.80" for 0.5").
    - Speed: fitting wing|shortboard|two (wing 2 at 1/4") takes under 1500 ms inside the test; log the time.
    - brdBoardFields of a winged fit keeps the wings exactly (deep-equal through readBoardEntry); of a wingless fit, no wings key.
  </behavior>
  <action>Implement HYY-W1 and HYY-W2/W3's maths per "The method" A and B above, which is the measured, chosen method — follow it step for step and do not "improve" it without re-measuring with the scratch scripts. Order: (1) add the wingless snapshot test to brd-fit.test.ts and run `npx vitest run lib/geometry/brd-fit.test.ts` on the untouched code so the .snap is written; check the .snap holds the 12 boards; (2) write brd-wings.test.ts (red), then brd-wings.ts (green); (3) the winged branch in fitOutline, `fitTailAroundWings`, `BrdFit.fileWings`, and the round-trip and range tests in brd-fit.test.ts; (4) the brd-board test (no change to brd-board.ts is expected — a saved board already holds wings; if readBoardEntry drops them, stop and report rather than loosening the reader). Fitted wing values are kept as found, not rounded to 1/16" — the founder's round-only-for-display rule, the same as every other fitted control (my call, flagged in the brief's notes). Header comment of brd-wings.ts and the fit's header: say the rule in plain words (a dip at least 1/32" deep under a straightedge, a step no longer than 3"), the measured margin, construction A, and why the radius is not fitted. Then in the scratchpad (never the repo) run the four AkuShaper files through the new code and confirm: the Egg, the 6'2 and the Scoop find no wing and their figures match today's (dump.ts prints them), the Fryer matches the measured figures above within 0.1 mm; record all of it in the SUMMARY.</action>
  <verify>
    <automated>npx vitest run lib/geometry/brd-wings.test.ts lib/geometry/brd-fit.test.ts lib/models/brd-board.test.ts && npx vitest run lib/geometry && npx tsc --noEmit && npm run lint</automated>
  </verify>
  <done>The wingless snapshot was recorded before any change and still passes unchanged; the finder and the winged fit pass their tests; the Fryer's figures in the scratch run match the plan within 0.1 mm; every geometry suite is green. Commit 1, plain English, e.g. "Opening a .brd now finds a wing or flyer in the file's outline and fits our curve around it with our own wing on top; a file without one fits exactly as before (maths and tests only)".</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The preview and the printed overview say each wing, the file's beside ours, and draw the winged fit</name>
  <files>lib/export/brd-fit-preview.ts, lib/export/brd-fit-preview.test.ts, components/setup/brd-fit-dialog.tsx, components/template/build-brd-overview-pdf.ts, components/template/build-brd-overview-pdf.test.ts</files>
  <read_first>lib/export/brd-fit-preview.ts (BRD_FIT_COPY, brdFitWords, BrdFitSheet, brdFitSheet, lessThan, closenessSentence), its test, components/setup/brd-fit-dialog.tsx (where sheet.closeness lines render), components/template/build-brd-overview-pdf.ts (the body list after the closeness lines, the one-page rule) and its test loop, lib/geometry/measure-display.ts (formatDim, formatMark)</read_first>
  <behavior>
    - A winged look's sheet has `wings`: one line per wing, nose-most first, the file's wing (fit.fileWings[k]) beside ours (fit.outline.wings[k]); position as a dim (formatDim), depth and run as marks (formatMark), as the WINGS tab shows them; a run that formats as zero reads as a square step. Imperial Fryer-like example: `Wing 1 — the file: 1/4" deep over a 3/8" run along the stringer, 7 7/16" off the tail. Ours: 1/4" deep over a 3/8" run, 7 3/8" off the tail, sharp corners.`; Metric: `… 6 mm deep over a 10 mm run along the stringer, 18.8 cm off the tail. Ours: …`. Built from the app's functions in the test, never typed numbers.
    - A wingless look's sheet has `wings: []` and every other field as before.
    - `notRead` no longer mentions wings or flyers (keep what 261113-gwr left for rails, wording otherwise unchanged).
    - The overview PDF with a two-wing look stays one page in both systems at every Height and its text holds `Wing 1` and `Wing 2`; with a wingless look the page text is unchanged.
  </behavior>
  <action>Per HYY-W4 and HYY-W3: add `BRD_FIT_COPY.wingLine` (and the square-step variant inside it) and drop "wings or flyers" from `notRead`; add `wings: string[]` to `BrdFitSheet`, filled in `brdFitSheet` from `fit.fileWings` and `fit.outline.wings` (pair them by index, as many as both hold). Say nothing about fin locks (the brief). In the dialog render each line right after the three HOW CLOSE sentences, one `<p data-brd-fit-wing={n}>` each, in the same body style; nothing when the list is empty. In the PDF builder add them as body lines right after the closeness lines. The dashed outline on screen and paper, the widths table and the HOW CLOSE outline line already read the winged fit (they come from `fit.lines.outline`, `fitOutlineWidths(fit.outline)` and `fit.closeness.outline`) — confirm that in the tests rather than adding code. Words are first drafts for the founder's look; keep them in BRD_FIT_COPY only.</action>
  <verify>
    <automated>npx vitest run lib/export components/template/build-brd-overview-pdf.test.ts && npx tsc --noEmit && npm run lint</automated>
  </verify>
  <done>The sheet carries the wing lines for a winged file and nothing for a wingless one; dialog and paper show them under HOW CLOSE; the overview is still one page. Commit 2, plain English, e.g. "The board-file preview and its printed overview now say where each wing is, how deep and how long its run — the file's beside ours — and draw our winged fit".</done>
</task>

<task type="auto">
  <name>Task 3: Browser tests on a computer and both phones, and pictures and PDFs of the Fryer's wing for the founder</name>
  <files>e2e/brd-fit-preview.spec.ts, .planning/quick/261113-hyy-a-brd-s-wings-are-found-and-fitted-the-o/pictures/</files>
  <read_first>e2e/brd-fit-preview.spec.ts (surfaceOf, the board-file helpers, b1, b5, b7, the WebKit shape rule in its header), e2e/wings.spec.ts (how the WINGS tab is opened and read), e2e/helpers/open-board.ts (storedOpenBoard), the scratch shoot scripts under `gwo/shoot` and `et0/pdfs.ts`, /Users/kontoes/.claude/projects/-Users-kontoes-Code-shaper/memory/shaper-pdf-and-browser-verification.md</read_first>
  <action>Add a `WING_BOARDS = phase16WingBoards()` source and a helper that writes a winged board's .brd with the app's own writer (as surfaceOf does). New tests, prefixed w so they never collide with gwr's: w1 (all three projects) — the wing|shortboard|one file opens the preview with exactly one `[data-brd-fit-wing]` line equal to `brdFitSheet(...).wings[0]` computed in the spec (exact on Chromium, by its shape on WebKit per the spec's header rule), and the not-read line holds no "wing"; w2 (desktop) — in Metric the line reads `cm off the tail` and `mm deep`; w3 (desktop) — Open as a Board, then TEMPLATE's WINGS tab shows one wing whose position reads `formatDim(fit.outline.wings[0].station, "imperial")`, and the stored open board's outline holds that wing with lock null; w4 (desktop) — the wingless Shortboard preview shows no `[data-brd-fit-wing]`. Run `PW_PORT=3117 npx playwright test e2e/brd-fit-preview.spec.ts` (reuse the founder's running server; never start, stop or build) and `e2e/board-file.spec.ts` (its f1 fails on untouched code — known, not ours). Pictures, made with a scratch shoot script adapted from `gwo/shoot`, the four AkuShaper files loaded from `~/Downloads` into the 3117 home page, saved into this task's `pictures/`: `wing-desktop-squash-flyer.png` (preview scrolled so the top view's tail and the wing line both show), `wing-desktop-squash-flyer-metric.png`, `wing-phone-squash-flyer.png` (iPhone 14), `wing-tab-squash-flyer.png` (the Fryer opened as a board, TEMPLATE's WINGS tab), `nowing-desktop-{egg,round-tail,noserider}.png` (no wing line), and `overview-squash-flyer.pdf` plus its rendered `.pdf.png`. Read the PDF back with pypdf: one page, holding `Wing 1`. Look at every picture before the commit and check its figures against this plan's measured Fryer figures (within display rounding). The AkuShaper files and their text never enter the repo.</action>
  <verify>
    <automated>PW_PORT=3117 npx playwright test e2e/brd-fit-preview.spec.ts && npx vitest run && npx tsc --noEmit && npm run lint</automated>
  </verify>
  <done>w1–w4 pass on their projects and every older test in the spec still passes; board-file.spec.ts passes apart from the known f1; the pictures and the PDF are in pictures/ and were looked at. The SUMMARY records: the Fryer's wing (the file's and ours), the widest gap before and after, the rule and its margin, the round-trip table, the browser and Node times, what gwr's bottom fit needed, and every call from "Changes to the brief". Commit 3, plain English, e.g. "Browser tests open a winged .brd on a computer and both phones, and pictures of the Fryer's flyer beside our fitted wing for a look". Do not commit the PLAN or the BRIEF.</done>
</task>

</tasks>

## Changes to the brief (the planner's calls — the SUMMARY repeats them for the founder)

1. **The corner radius is not fitted**; every wing opens sharp and the preview says so ("sharp corners"). Measured above: no
   gain on the Fryer, unstable on rounded wings.
2. **Fitted values are not rounded to the 1/16" slider grid** — they sit inside the sliders' ranges and the order rule, as
   found, like every other fitted control (the founder's round-only-for-display rule). The sliders show them as usual.
3. **The two-wing round trip uses a second wing rounded 1/4"**; the app's own "+ Add wing 2" (rounded as far as it fits) is
   tested for its outline and wing 1 only, because a sharp wing matches that long S with a longer run (0.80" for 0.5").
4. The wing lines sit directly under HOW CLOSE on screen and paper; wing 1 is the nose-most, as on the WINGS tab.
5. A very shallow, long wing (1/16" over 1–2") isn't told from the curve; it shows in the outline's gap instead.

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| a picked .brd file -> the browser | an untrusted file the shaper picks; it is read and fitted in the browser only, never sent anywhere |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-hyy-01 | Denial of service | findBrdWings / fitTailAroundWings | low | mitigate | The reader already caps knots and lines (BRD_READ_MAX_KNOTS, BRD_READ_MAX_LINES); the finder is one hull per stretch with at most three stretches; the fit runs a fixed number of searches (three rounds, NELDER_MEAD_ITERATIONS each), so a hostile outline costs the same as the Fryer |
| T-hyy-02 | Tampering | the opened board's wings | low | mitigate | wingsOf clamps every value into its slider range and the order rule, and brdBoardFields still reads the board back through readBoardEntry, which validates wings like a saved board's |
| T-hyy-03 | Information disclosure | sample files | low | mitigate | The AkuShaper files stay in ~/Downloads; pictures and PDFs only in this task's pictures/; no file text enters the repo |
</threat_model>

<verification>
- `npx vitest run` green, the wingless snapshot unchanged since it was recorded on the untouched code.
- `PW_PORT=3117 npx playwright test e2e/brd-fit-preview.spec.ts` green on all projects (board-file.spec.ts f1 known).
- The Fryer, through the shipped code (scratch run): one wing found at 7 7/16", 1/4" deep, 3/8" run; ours about 7 3/8", 1/4",
  3/8", sharp, no lock; widest outline gap about 1.3 mm (from 2.75 mm). The Egg, the 6'2 and the Scoop: no wing, today's figures.
</verification>

<success_criteria>
The founder opens the Fryer's .brd on the dev server: the dashed fit steps in where the file's flyer does, the preview says the
file's wing and ours side by side, the outline's widest gap is about half of today's, the printed overview says the same on one
page, and Open as a Board lands on a board whose WINGS tab already holds the wing. Every wingless file looks and opens exactly
as it did.
</success_criteria>

<output>
Create `.planning/quick/261113-hyy-a-brd-s-wings-are-found-and-fitted-the-o/261113-hyy-SUMMARY.md` when done.
</output>
