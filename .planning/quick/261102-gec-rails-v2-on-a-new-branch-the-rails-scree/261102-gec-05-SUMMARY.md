---
phase: quick-261102-gec
plan: 05
subsystem: rails
status: complete
tags: [rails, rails-v2, finished-rail, deck-blend, sharp-bottom-edge, volume]
requires: ["261102-gec-01", "261102-gec-02", "261102-gec-03", "261102-gec-04"]
provides:
  - "lib/geometry/finished-rail.ts: PC35's continuous deck-corner rule (one cubic over the dome mark and Deck Mark 3, sliding into the matched blends or today's), the sharp bottom edge, the cubic step kind, railBlendArea as the cut's area less Green's theorem on the curve; deckBlendWeight, matchedDomeReach, cubicArea, cubicBlendArea, DECK_BLEND_MAX_REACH_IN, FinishedRailOptions"
  - "lib/geometry/rail-bands.ts: sharpBottomEdge on RailSectionSpec, ComputeRailSectionInput and RailSectionResult; off in defaultRailAdvanced and on a new board"
  - "lib/models/design-snapshot.ts: rule 12, sharpBottomEdge read with .catch(false)"
  - "lib/geometry/volume.ts: each station takes the box from its nearest rail"
  - "components/rails/rail-controls.tsx: the Sharp Bottom Edge box after Bottom Tuck 3"
affects: [RAILS drawing (VIEWER, View Full Sized), RAILS Advanced menu, every litres figure, VOLUME, saved boards, Copy preset values, the preset litres record, the RAILS and VOLUME desktop reference pictures]
tech-stack:
  added: []
  patterns: ["a curve blended point by point between two end shapes, each written as Bézier control points (degree raising), so it stays inside the cuts and smooth by construction", "area by Green's theorem in closed form per step"]
key-files:
  created: []
  modified:
    - lib/geometry/finished-rail.ts
    - lib/geometry/finished-rail.test.ts
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bands.test.ts
    - lib/geometry/volume.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/design.test.ts
    - lib/geometry/presets.ts
    - lib/geometry/preset-source.ts
    - lib/geometry/preset-source.test.ts
    - lib/geometry/__fixtures__/phase14-preset-figures.json
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - lib/models/saved-board-open.test.ts
    - components/rails/rail-instructions.tsx
    - components/rails/rail-callouts.test.ts
    - components/rails/rail-controls.tsx
    - components/design/design-store.tsx
    - e2e/rails-advanced.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/rails-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
decisions:
  - "R22 (the founder): a per-rail Sharp Bottom Edge box, off by default, that leaves the corner at Bottom Tuck 3 as the cut leaves it"
  - "R23 (the founder's pick): (d), one curve over the dome mark and Deck Mark 3, with the hand-over to separate blends made continuous (PC35)"
  - "PC36-PC44 applied as planned; the desktop references were re-recorded although they passed inside the config's 100-pixel tolerance"
metrics:
  completed: 2026-11-02
  duration: about 51 min
actuals:
  tokens: 30600    # chars/4 over the realized code + test + spec diff (122,288 chars; pictures and the archive left out)
  tasks: 3
  commits: 5
---

# Quick 261102-gec Plan 05: a Sharp Bottom Edge box, and the rail rolling off the deck in one smooth curve — Summary

**Two changes to the finished rail, both of them the founder's. Each rail's Advanced menu now has a Sharp Bottom
Edge box that leaves the bottom edge crisp at Bottom Tuck 3. And where the rail meets the deck, the knuckle is
gone: the rail rolls off the deck in one smooth curve over Deck Mark 3 and the Domed Deck Band mark, and slides
steadily into separate blends as the dome mark moves further out. Every board loses a few hundredths of a litre
at the deck corner. Nothing else on the curve moved.**

## For the founder, in plain words

**The Sharp Bottom Edge box.** You asked for "an advanced checkbox for leaving the bottom edge fairly sharp
(follow the angle at bottom tuck 3)".
- Every rail's Advanced menu has a "Sharp Bottom Edge" box. It sits right after the Bottom Tuck 3 slider, just
  above Reset Advanced Settings, because that corner is Bottom Tuck 3's.
- It is off on every board, new or saved, until you tick it.
- Ticked, the finished rail comes straight down the last tuck band at that band's own angle and meets the bottom
  at Bottom Tuck 3 exactly as the cut leaves it. That corner is not rolled away. Every other corner still blends
  as before. You see it on VIEWER and in View Full Sized.
- The marks never move, so the DATA tab, INSTRUCTIONS, the order form and the RAILS picture in the phone menu
  are unchanged.
- On the tail, the box hides with the other tuck controls while Hard Edge is on, because a hard edge is already
  sharp at the bottom.
- Reset Advanced Settings unticks it. Each tick is its own undo step.
- The litres keep the little foam that corner's blend used to take off. It only counts at the stations whose
  nearest rail has the box ticked.

**Where the rail meets the deck.** You said "the rail blending into the deck appears to have a bit of a knuckle.
Can we smooth that out, perhaps blending it better with regard to dome deck mark", worst "with domed and mark
close to deck mark 3". From the planner's pictures you chose (d), one curve over both corners, "with the
hand-over made continuous first". Here is what that does:
- **Dome mark close to Deck Mark 3** (closer than half of Band 2): the rail rolls off the deck in ONE smooth
  curve. It starts on the deck beyond the dome mark and runs over both marks to the middle of Band 2. This is
  every rail of every preset and the first board, as they open.
- **On a flat deck** the curve now leaves the deck with no bend at all and eases in. Before, its bend started at
  once, right where it left the deck.
- **On a domed deck** the bend no longer bunches up just inside Deck Mark 3. The first board's centre at 90%
  went from a 4.7" tightest bend to an 18.9" one. Your worst case, a domed tail with the dome pulled in to
  1/16" past Deck Mark 3, went from a near-corner (0.01" radius) to a 4.2" bend at 90%, and from 0.02" to 3.5"
  at 75%.
- **As you slide the dome mark out**, the one curve slides steadily into separate blends: matched ones on a
  domed deck, today's on a flat one. The slide is complete once the gap between the marks is as long as all of
  Band 2. The line never jumps. Per 1/16" step of the Domed Deck Band slider it moved at most 0.13 mm on the
  rails tested, where today's own curve moved up to 0.16 mm.
- **Everything from Band 2's middle over the rail to the bottom is exactly as it was.** It matches the reference
  page sample for sample.

**It stays honest.** The curve never crosses a cut and touches the rail only at the Apex Center. The litres
count it exactly, not by sampling (the cut's area less the area under the curve, worked out in closed form).

**One thing you accepted with the pick, still true.** On a flat deck with the dome slider pulled right in to
Deck Mark 3, the new curve bends tighter than today's there (the planner measured 31.5" down to 12.6" on the
Longboard's centre). Today had no knuckle in that spot. A one-line floor on how close the curve's guide point
may sit to Deck Mark 3 would remove it if you ever want.

## Litres, before and after this plan

From `scripts/phase14-before-after.ts --step curves`, run before any code change and after Task 1. Both runs
print exactly the plan's M28 figures.

| Board | Before | After | Difference |
|-------|--------|-------|------------|
| Shortboard preset | 29.650 L | 29.612 L | -0.038 L |
| Fish preset | 34.881 L | 34.843 L | -0.038 L |
| Mid-length preset | 49.566 L | 49.406 L | -0.160 L |
| Longboard preset | 72.422 L | 72.351 L | -0.071 L |
| The first board a visitor sees | 30.327 L | 30.290 L | -0.037 L |
| The Arctic board | 47.147 L | 47.087 L | -0.060 L |

The cards: Shortboard 29.7 to 29.6 L, Fish 34.9 to 34.8 L, Mid-length 49.6 to 49.4 L. The Longboard (72.4), the
first board (30.3) and the Arctic (47.1) stay. The first board's VOLUME screen reads 30.33 L to 30.29 L.

**The box's own effect, if ticked on all three rails** (on top of the new deck curve; scratch run of the same
script with the box ticked, rounded litres differenced, matching M28): Shortboard +0.007 L, Fish +0.006 L,
Mid-length +0.010 L, Longboard +0.191 L (it is Symmetrical, with a long last tuck band), first board +0.006 L,
Arctic +0.010 L. Off by default, it moves nothing.

**The preset record** (`phase14-preset-figures.json`, regenerated by its own script; the Longboard is on its
recorded blank, so its figure differs from the table above). Only the four `litres` lines changed, to M29's
figures:

| Preset | Before | After |
|--------|--------|-------|
| Shortboard | 29.6501 | 29.6122 |
| Fish | 34.8815 | 34.8426 |
| Mid-length | 49.5661 | 49.4062 |
| Longboard | 73.6474 | 73.5743 |

Note: the plan's Task 3 text says the card that moved is "Mid-length 49.6 to 49.5". The record and the script both
say 49.4 (49.4062), as M28 does. Three cards moved, as listed above.

## What was built

- **Before pictures** (`36d17ed3`), from the unchanged code.
- **Task 1 — the two rules, storage, volume, presets, record and unit tests** (`7af93bf5`). Covers PC35-PC39,
  PC41, PC42 and PC44.
  - `finished-rail.ts`:
    - `finishedRailFromCuts` takes a fifth parameter, `options: FinishedRailOptions` (`domedDeckBand`,
      `sharpBottomEdge`). Without a dome mark it draws the reference page's own curve.
    - `finishedRail` and `sectionFinishedRail` always pass the section's Domed Deck Band and box.
    - The deck corner is found from the cut outline's own points (PC36). It is domed when the chain's second
      point is the dome mark and its third sits below the deck.
    - PC35's four cases are written as Bézier control points with small named helpers: `raise` (a parabola as a
      cubic), `lerpPts`, `splitCubic` (de Casteljau at τ) and `cubicSamples`. The 2" reach is the named
      constant `DECK_BLEND_MAX_REACH_IN`, tied to rule 12 in its comment.
    - A new `cubic` step kind. `finishedRailPath` draws it as `C`.
    - The sharp bottom edge: the last corner is pushed as one straight step with one sample, like the hard edge.
    - `railBlendArea` is now the cut outline's shoelace area less Green's theorem on the curve, in closed form
      for lines, parabolas and cubics (`cubicArea`). `cubicBlendArea` is the per-piece cross-check.
    - The header is rewritten with the founder's words for both rulings.
  - `rail-bands.ts`: `sharpBottomEdge` on the spec, input and result, inch and Mm. It is off in
    `DEFAULT_SECTION_COMMON` and `defaultRailAdvanced`. `computeRailSectionOutput` reads a section held in
    memory without the field as off (T-gec-20).
  - `volume.ts`: `sharpBottomEdge: nearestSpec.sharpBottomEdge`.
  - `design-snapshot.ts`: rule 12 and `sharpBottomEdge: z.boolean().catch(false)`.
  - The presets: 12 × `sharpBottomEdge: false,`. The printer writes it after `singleTuck`.
  - The INSTRUCTIONS example and `rail-callouts.test.ts` pass `sharpBottomEdge: false` only so they compile.
  - The litres record was regenerated by its script.
- **Task 2 — the sidebar and the browser proof** (`b09d6535`). Covers PC40.
  - The box sits after `nudgeRow("bottomTuck3")`, guarded by `showTucks`, and is built exactly as Use Single
    Tuck's row is.
  - The comments of the Advanced menu, Reset and `resetRailAdvanced` are amended. There is no store logic change.
  - The browser spec: tests 1, 4 and 6 are amended, and a new test 16 covers the box.
- **Task 3 — gates, reference pictures, after pictures** (`54d99fe2`) and this summary.

### The tests (all relations, the golden or the app's own output)

- **R13 d** (reference parity with no dome mark) is unchanged and green.
- **The end-to-end test** is rewritten per PC42. It matches the page from Band 2's middle on, sample for sample
  within a millionth of an inch, and at its start.
- **R13 a and b** pass each case's own dome mark. They run plain, with the sharp bottom edge, and with Single
  Tuck (with and without the box).
- **The end shapes:**
  - On every short-run golden case: a line to Fd, then a cubic guided by D and V to A. On a flat deck Fd, D and
    V are collinear.
  - On every long-run case: (b) on a domed deck, with even legs and equal bends where the blends meet; and on a
    flat deck exactly today's curve (`toEqual`).
- **The continuity sweep:** the first board's centre and tail and the Shortboard's tail, at 100% and 90%, with
  the dome at −2" to +2" in 1/16" steps, from one fixed left edge.
  - The largest move per step was 0.132 mm, against today's 0.162 mm on the same sweep.
  - Inside the hand-over (117 positions) the tightest bend was never tighter than the tighter end. The worst
    ratio was 1.025.
  - The curve leaves along the deck, meets Band 2 along Band 2, and is G1 at the domed join, at every position.
  - The per-piece area equals Green's theorem at every position.
- **The knuckle test:** at 90% the first board's tightest deck-side bends went from 2.45" / 4.72" / 3.01" to
  9.83" / 18.91" / 12.06" (nose / centre / tail). At 75% they went from 2.95" / 5.74" / 3.52" to
  10.63" / 20.14" / 12.65". In the founder's worst case they went from 0.013" to 4.21" (90%) and from 0.016"
  to 3.50" (75%). These figures are printed by a temporary probe; the test asserts only "gentler than today's".
- **The sharp edge:** on every golden case, with Single Tuck off and on:
  - The steps up to the last tuck band's middle are the plain curve's.
  - One line runs to the corner, collinear with the last tuck band, then one along the bottom.
  - The corner is sampled once.
  - The blend area falls by exactly a third of the old corner triangle.
  - On a hard edge the box changes nothing.
- **Exactness:** VARIANTS gained the sharp edge and the sharp edge with Single Tuck. For each:
  - Cut less `railBlendArea` equals Green's theorem.
  - The per-piece rule equals Green's theorem.
  - Sampling converges as 1/n².
  - `sectionFinishedRail` has the same steps as `finishedRail`.
  - On the page's all-parabola curves, `railBlendArea` still equals plan 03's sum of thirds.
- **Storage:**
  - `defaultRailAdvanced` puts the box off.
  - Absent, a string or a number reads off. `true` round-trips.
  - Main's frozen schema still parses the rollback board with the box ticked, and drops it.
  - The printer prints it after `singleTuck`, and a ticked box pastes back exactly.
- **Volume:** with the box ticked on the centre and on the hard-edge tail, only the stations nearest the centre
  lose blend area, and the litres rise. The nose and tail stations are unchanged.

### PC35-PC44 and M23-M33

- PC35-PC42 and PC44 were applied as written.
- PC43: see the deviation below on the 100-pixel tolerance.
- **M23-M25 confirmed:**
  - The first board at 90% today: 2.5" / 4.7" / 3.0".
  - The centre at 90%: 4.7" becomes 18.9".
  - The worst case: 0.01" becomes about 4", measured on the first board's tail here.
- **M26:** confirmed on this plan's smaller sweep. The line moves less per step than today's (0.13 mm against
  0.16 mm), and the hand-over is never tighter than its ends.
- **M28 and M29:** confirmed to the last printed digit.
- **M30:** confirmed in kind. The moves were real but small, 3 pixels on RAILS and 37 on VOLUME at zero tolerance.
- **M31:** the unit suite was green after the rewrite.
- **M32:** confirmed. No component needed an edit to draw the cubic or the sharp edge.
- **M33:** confirmed. Every literal builder was found by `tsc`. `design.test.ts` had no literal spec; it gained
  a carry-through check instead.

## Gates

| Gate | Result |
|------|--------|
| Unit suite (`npx vitest run`) after Task 1 and after Task 2 | 156 files, 5,935 passed, 2 skipped, 0 failed (both times) |
| RED check: the two new rules switched off in a scratch edit, then restored | 9 failed in `finished-rail.test.ts` and `volume.test.ts` (the end shapes, hand-over, G1, knuckle, sharp edge, path `C`, volume box), 199 passed |
| `npx next typegen` + `npx tsc --noEmit` | clean (both tasks) |
| `npm run lint` | clean (both tasks) |
| Golden generator re-run + `git diff --exit-code rails-v2-golden.json scripts/` | clean: 1,450 cases, 180 half-way skips, 33 finished curves, 3,772 samples |
| No database change (`lib/db`, `drizzle`, the golden) | 0 files |
| Preset record re-run in Task 3 + `git diff --exit-code` | clean: the same bytes as Task 1 committed |
| `e2e/rails-advanced.spec.ts` (desktop, iPhone, Android) | 45 passed, 3 skipped (test 10 on desktop; test 13 on both phones, a computer-only test from an earlier fast task), 0 failed |
| The twelve-spec list (plan 04's RAILS list plus plan 03's litres readers), every project | 264 passed, 219 skipped, 0 failed, no re-runs (21.4 min) |
| `e2e/desktop-baseline.spec.ts`, before re-recording | 5 passed, 10 skipped (phones). RAILS and VOLUME moved inside the 100-pixel tolerance |
| Zero-tolerance comparison (scratch config, deleted) | RAILS 3 pixels, VOLUME 37 pixels; TEMPLATE, ROCKER and FINS 0 |
| `e2e/desktop-baseline.spec.ts`, after re-recording | 5 passed, 10 skipped, 0 failed |

Every Playwright run used `PW_PORT=3177 IS_WEBPACK_TEST=1`, and port 3177 was free before the first run.

## Pictures (`pictures/`)

| Picture | What to look at |
|---------|-----------------|
| `p5-before-viewer-desktop.png` / `p5-after-viewer-desktop.png` | The flat Shortboard. Each finished rail now leaves the deck a little further out, past the green dome dot, and rolls in with no crease. Everything else draws as before. |
| `p5-before-domed-desktop.png` / `p5-after-domed-desktop.png` | The Center Rail at Heavily Domed (75%). The bend no longer bunches just inside Deck Mark 3; the curve rolls over the dome dot and Deck Mark 3 as one. |
| `p5-before-domed-fullsize-desktop.png` / `p5-after-domed-fullsize-desktop.png` | The same in View Full Sized, the Center section. |
| `p5-before-advanced-center-desktop.png` / `p5-after-advanced-center-desktop.png` | The Center Rail's Advanced menu. Sharp Bottom Edge sits after Bottom Tuck 3, unticked. |
| `p5-before-advanced-iphone.png` / `p5-after-advanced-iphone.png` | The same on an iPhone. |
| `p5-after-sharp-desktop.png` | The box ticked on the Center Rail, with Ghost Bands on. The centre's bottom corner at Bottom Tuck 3 is crisp, and the rail runs straight down the last tuck band into it. The Next.js dev "Compiling" badge shows in the lower left corner; it is the dev server's own marker, not part of the app. |
| `p5-after-sharp-fullsize-desktop.png` | The same in View Full Sized. |
| `p5-after-sharp-iphone.png` | CENTER on an iPhone with the box ticked. Compare its bottom right corner with `p5-after-advanced-iphone.png`. |

The planner's `p5-candidate-*.png` are untouched. The picture script is in `pictures/shoot-source-05.tar.gz`, and
no loose `.ts` is left in `pictures/`.

## Deviations from Plan

- **The desktop references passed inside their tolerance, and were re-recorded anyway.**
  - Run as written, `desktop-baseline.spec.ts` passed with no re-record. The config's `maxDiffPixels: 100`
    absorbed both moves.
  - So I compared at zero tolerance with a scratch config, which is now deleted. RAILS differed by 3 pixels and
    VOLUME by 37. The diff pictures lit only the deck ends of the three finished rails and the litres' last two
    digits. TEMPLATE, ROCKER and FINS were identical.
  - I re-recorded RAILS and VOLUME so the references show the page as it now is (30.29 L, not 30.33 L), as PC43
    and the orchestrator asked. Plain `--update-snapshots` writes nothing for a passing shot, so it needed
    `--update-snapshots=all`, limited to `--project=desktop -g RAILS`, then `-g VOLUME`.
  - The log entry in the spec header says all of this, with SHA-256 RAILS 68b1fe4e to e3ca0666 and VOLUME
    ff9f48b1 to 14f11e4c.
- **One commit for Task 1, with RED checked by switching the rules off.** The plan asks for one commit for the
  task, so there is no separate `test(...)` commit. The rules were written before the tests ran, so RED was
  checked afterwards: a scratch edit switched both rules off, 9 tests failed, and the file was restored with
  `git checkout`. The figures are in the Gates table.
- **The archive was not re-packed.** The picture script did not change between the before and after runs (checked
  with `diff` against the archive), so the archive from the before commit still holds it.
- **The continuity test runs a smaller sweep than M26.** As the plan's behavior section asks, it covers three
  rails at 100% and 90%. The largest move is compared with today's largest move over the whole sweep. A
  per-rail comparison cannot work: on a flat deck today's curve never moves with the dome, while the new one
  does, by design.
- **Small additions inside the plan's files:**
  - `deckCornerInches` also caps the reach by the room to the drawing's edge, `min(L, 2", edge)`, for both
    shapes. No real board reaches that cap.
  - A null guard returns today's blend if τ cannot be formed.
  - `computeRailSectionOutput` reads a missing box as off (`=== true`), for a board held in memory from before
    the field existed.

## Known Stubs

None.

## Threat Flags

None. The box is read with `z.boolean().catch(false)` (T-gec-19). A section in memory without it draws today's
curve (T-gec-20). Main's frozen schema drops the key, and its test now ticks it (T-gec-21). The new curve is
inside the cuts by construction and counted exactly (T-gec-22).

## Self-Check: PASSED

- Commits `36d17ed3`, `7af93bf5`, `b09d6535` and `54d99fe2` are on this branch.
- Five `p5-before-*.png` and eight `p5-after-*.png` pictures, plus `shoot-source-05.tar.gz`, are present.
- `grep -c "sharpBottomEdge: false," lib/geometry/presets.ts` prints 12.
- `grep -c "sharpBottomEdge: nearestSpec.sharpBottomEdge" lib/geometry/volume.ts` prints 1.
- `rails-v2-golden.json`, its generator, `lib/db` and `drizzle/` are unchanged against the base `a9d3f14e`.
