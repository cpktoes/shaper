---
phase: quick-261102-gec
plan: 01
subsystem: rails
status: complete
tags: [rails, geometry, chris-rails-v2, finished-rail, volume]
requires: []
provides:
  - "lib/geometry/rail-bands.ts — the Chris Rails v2 rules (scale, nudges, apex trim, floors, 2.4 x T dome band, no Corner Cut), computeRailSectionOutput"
  - "lib/geometry/finished-rail.ts — the finished rail, blended halfway (finishedRail, finishedRailFromCuts, railCutFoam)"
  - "lib/geometry/__fixtures__/rails-v2-golden.json — the reference page's own numbers"
  - "RailSectionSpec.scaleFromCenter + RailSectionSpec.nudges (design-snapshot rule 10)"
affects: [RAILS screen, DATA tab, INSTRUCTIONS example, order form rail figures, phone RAILS tile, VOLUME litres]
tech-stack:
  added: []
  patterns: ["reference page code executed by node:vm into a golden", "rule tests for what the sheet leaves out"]
key-files:
  created:
    - scripts/extract-rails-v2-golden.ts
    - lib/geometry/__fixtures__/rails-v2-golden.json
    - lib/geometry/finished-rail.ts
    - lib/geometry/finished-rail.test.ts
  modified:
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bands.test.ts
    - lib/models/design-snapshot.ts
    - lib/geometry/volume.ts
    - lib/geometry/presets.ts
    - lib/geometry/preset-source.ts
    - components/rails/rail-controls.tsx
    - components/rails/rail-callouts.ts
    - components/rails/rail-instructions.tsx
    - components/rails/rail-section-plot.tsx
    - scripts/extract-phase14-preset-figures.ts
decisions:
  - "PC1-PC13 applied as planned (see below)"
  - "Deviation: the preset-figures record's generator now reads each preset in the blank its record was first taken on, as its test does"
  - "Deviation: the tile litres checks (unit and browser) read the card's own litres from the app, not the preset-figures record"
metrics:
  completed: 2026-11-02
actuals:
  tokens: 40350    # chars/4 over the realized diff, leaving out the generated 1 MB rails-v2-golden.json (about 267,000 more)
  tasks: 4
  commits: 6
duration: 54 min
---

# Quick 261102-gec Plan 01: Rails v2, the rules — Summary

**The RAILS screen now works every rail's marks out from the founder's "Chris Rails v2" sheets (apex from
the rail's own thickness, deck marks from the board's thickness, Fred's 30° tool for the bottom tucks, a
2.4 x T domed deck band, no Corner Cut), proven against the founder's own reference page, with a finished
rail module ready for plan 02.**

## For the founder, in plain words

**What the RAILS screen shows now.** Every rail — nose, centre and tail — is worked out from your two v2
sheets instead of the prototype's rules:

- The **apex** grows and shrinks with the rail's own thickness: Apex Thickness = (-0.125 x Family + 1.375)
  x thickness x 0.35, scaled by 0.75 on the nose and tail.
- The **deck marks** follow the board's thickness: Deck Mark 1 is the thickness (x 0.75 on the tips), Deck
  Mark 2 half of it, Deck Mark 3 1.8 x the thickness.
- The **bottom tucks** use Fred's 30° tool: Bottom Tuck 1 = Rail Tuck 1 x 0.577, Bottom Tuck 2 half of
  that, Bottom Tuck 3 = Rail Tuck 1 (with Sym on they follow the deck marks, as your sheet says).
- The **domed deck band** is 2.4 x the board thickness.
- The **Corner Cut is gone** — from the drawing, the colour key, the DATA tab and the printed order form.
- Where your sheet would put the apex off the rail (Family 1 at either end of the Ratio), the app shrinks
  it evenly about the Apex Center until it sits 1/16" inside the deck and the bottom. No mark is ever
  under 1/16".

On the Shortboard you'll see, for example, the centre rail's Apex Thickness go from 5/8" to 11/16", the nose's
Deck Mark 1 from 1 7/8" to 1 3/16", and the bottom tucks sit closer in (nose Bottom Tuck 1 now 1/4").

**What did NOT change.** The sidebar reads as before — thickness, Deck Profile, Family, Ratio, Sym and the
tail's Hard Edge, with the same ranges (Deck Profile still runs to 66% and Ratio 30/70 to 70/30 in whole steps
until plan 02). Advanced now holds only **Use Single Tuck** and **Reset Advanced Settings**: the Corner Cut
Offset slider and the Bottom Tuck 3 slider went with the old rules. Single Tuck and Hard Edge work exactly as
before. How a board is saved is unchanged apart from two new settings per rail (below). No database change.

**Your saved boards.** Each rail now also stores "Scaled from center by" (0.75 on the nose and tail, 1 on the
centre) and seven nudges (all 0 for now — their sliders come in plan 02). A board saved before today opens
on those defaults. Its **old Bottom Tuck 3 setting and its Corner Cut settings are kept in the saved board but
no longer used**: your new sheets work out Bottom Tuck 3 themselves, and plan 02's Bottom Tuck 3 nudge replaces
the old setting. A board saved on this branch still opens on the live site's code, too. If a saved board has
Deck Profile below 75%, it draws at 75% (your sheet's minimum rail thickness) without its saved number
changing.

**Litres move a little, because the rails' shape moved.** Volume still reads the cut, faceted rail exactly as
before; the drawn finished rail is not counted. Proven: the shape volume adds up encloses exactly the foam the
cuts leave, on over 10,000 sections. Measured with the app's own volume code (`scripts/phase14-before-after.ts`):

| Board | Litres before | Litres after | Card before → after |
|-------|---------------|--------------|---------------------|
| Shortboard | 29.562 | 30.085 | 29.6 → 30.1 |
| Fish | 35.313 | 35.318 | 35.3 → 35.3 |
| Mid-length | 50.401 | 50.057 | 50.4 → 50.1 |
| Longboard | 73.945 | 73.957 | 73.9 → 74.0 |
| The first board a visitor sees | 30.509 | 30.732 | 30.5 → 30.7 |
| An Arctic board (Arctic Foam 9'4" G, 2" shorter) | 47.443 | 47.757 | 47.4 → 47.8 |

Each moved only because its rails' cut shape moved (nothing about the outline, rocker or thickness changed):
the apex, deck marks and tucks now come from the board's own thickness, and there is no Corner Cut. Some boards
gain a little foam and some lose a little, depending on how their thickness and Family play through the new
rules.

**A question for you (R5, not done here):** should volume keep reading the cut rail, or switch to the
finished (blended) rail? Switching would take a little foam off every board, since the blend rounds every
corner the cuts leave.

**What to look at in the browser.** Open the Shortboard and go to RAILS:
- VIEWER: three cross-sections on the new marks, no Corner Cut line, no "Corner Cut" in the key.
- DATA: no Corner Cut rows; the new Apex Thickness, Deck Marks and Bottom Tucks.
- INSTRUCTIONS: the example rail on the new rules (its domed band is now 2.4 x its 3 1/2" board).
- Advanced on each rail: only Use Single Tuck and Reset (the tail's shows only Reset while Hard Edge is on).
- VOLUME and the preset cards: the new litres above.

## Pictures (`pictures/`)

Before (from the unchanged code, committed first) and after, one for one, Shortboard preset:
`*-viewer-desktop.png`, `*-data-desktop.png`, `*-instructions-desktop.png` (1280 x 800, 2x) and
`*-viewer-nose-iphone.png`, `*-viewer-center-iphone.png`, `*-viewer-tail-iphone.png`, `*-data-iphone.png`
(iPhone 14). Seven each — the plan's "eight (three desktop, five iPhone)" miscounted its own shot list (three
VIEWER rails + DATA = four on the iPhone). The shooting script is in `pictures/shoot-source.tar.gz`.

## Commits

| # | Hash | Subject |
|---|------|---------|
| 1 | f0a646fc | docs(quick-261102-gec): before pictures — the RAILS screen of the Shortboard as it draws today |
| 2 | 7ebcb19b | RAILS (underneath): the finished rail — the cut rail blended halfway into every band — worked out to match the founder's reference page |
| 3 | c3f736e4 | RAILS: every rail's marks now come from the founder's Chris Rails v2 sheets — the apex follows the rail's thickness, Fred's 30° tool sets the bottom tucks, and the Corner Cut is gone |
| 4 | 1c932b15 | RAILS: a locked board's rail headings stay marked as view-only, so the lock check reads the tail's Advanced correctly |
| 5 | 32478904 | RAILS: after pictures of the Shortboard on the new rules, and the litres the four preset cards now read |
| 6 | (this) | docs(quick-261102-gec): plan 01 summary |

## Gates

- **Unit suite:** 156 files, 5,881 passed, 2 skipped (pre-existing skips), 0 failed — after making the three
  heavy sweeps collect misses (a first full run timed two of them out at 5 s under load; alone they take
  under 0.2 s now, with a 30 s backstop).
- **`npx tsc --noEmit`:** clean (after `npx next typegen`). **`npm run lint`:** clean.
- **Browser specs** (`phone-screen-tiles`, `phone-rails`, `template-rails-panels`, `summary-rail-key`,
  `summary-rail-instructions-fit`, `summary-planing`, `rocker-blanks`, `board-lock-screens`, `slider-touch`,
  every project): 210 passed, 118 skipped, 2 failed on the first run. (1) `board-lock-screens` look-rails
  (desktop): a real consequence of this plan, fixed in commit 4 (see deviation 3). (2) `board-lock-screens`
  x-rails (desktop): a lock-arrival timeout under load, passed alone. Re-run of both alone: 2 passed; re-run of
  every RAILS lock test on all projects: 9 passed, 3 skipped.
- **`desktop-baseline.spec.ts`:** RAILS differed in its three cross-sections, their dots and the key only
  → re-recorded, now passes. **VOLUME is NOT re-recorded and still fails** (deviation 4). Final run: 4 passed,
  10 skipped, 1 failed (VOLUME).
- `git diff c5ad73e7..HEAD -- lib/db drizzle` is empty; `prototype-rails-golden.json`,
  `extract-prototype-rails-golden.mjs` and `reference/sketches/018-chris-rails-v2.js` are unchanged.

## The planner's measured facts, confirmed

- **M1** — confirmed in the app: the workbook's three sets and all 1,450 golden cases agree with the
  reference page to 1e-9 inch on every mark and drawn line, with no trim; the finished rail matches the page's
  samples to 1e-6 inch on all 33 curves, both from the page's own cuts and end to end from the app's own section.
- **M2** — consistent: the golden's own exclusion counts are apexTrim 336, bottomTuck2 278, bottomTuck1Floor
  158, bottomTuck3Separation 202, and 0 for every deck-side guard and the apex floor.
- **M3** — 180 half-way cases skipped, all at 1 5/8" x 75%, as planned.
- **M4** — exactly: 1,450 kept, 180 half-way, 33 curves, 3,772 samples, 1,067,121 bytes; a second run writes
  the same bytes.
- **M5** — as listed, plus three the plan did not foresee: deviations 2-4.
- **M6** — exactly, all six boards, both columns (table above).
- **M7** — confirmed as a rule test on 14,400 sections (trims, floors, Sym, Single Tuck, Hard Edge, two
  scales): the profile area equals the cut foam within 1e-9 sq in.
- **M8** — confirmed by a test holding a frozen copy of main's rail schema (36d701d8): a board saved here
  parses there with the new keys dropped; without the legacy keys it would not.
- **M10** — confirmed by the trim tests (Family 1 trimmed at both Ratio ends on all three default rails; the
  centre at Family 3, 80/20 lands exactly on the room and is not trimmed).
- **M11** — covered by the finished-rail tests: a tucked rail meets the rail line only at its Apex Center; a
  hard edge leaves the wall at half of Rail Mark 1 and runs straight to a sharp bottom corner.
- **M12** — held: the only typed figures in tests are the founder's rule constants, windows and step sizes.

## The planner's choices, as applied

PC1 (fields `scaleFromCenter` + `nudges` keyed by `RAIL_NUDGE_KEYS`), PC2 (the three legacy keys kept, carried,
never read), PC3 (apex floor then trim, trim wins), PC4 (Deck Mark 3 ≥ Deck Mark 1 + 1/16"), PC5 (Bottom Tuck
2 inside Bottom Tuck 1), PC6 (Ratio, scale and nudges held in their windows), PC7 (volume blends scale and
nudges between the anchors; Deck Profile held at 75% at each anchor first), PC8 (the profile starts at the
Domed Deck Band), PC9 (old prototype golden untouched), PC10 (the API as named; `computeRailSectionOutput`
used by `computeRailBands`), PC11 (DATA shows the trimmed apex), PC12 (Single Tuck on its own line; Reset sets
Single Tuck off), PC13 (hard-edge corner as one straight step) — all applied as written. One note on PC10: the
INSTRUCTIONS example calls `computeRailSection` directly with its literal 3" rail and 3 1/2" board (as Task 3's
action spells out), rather than `computeRailSectionOutput`, so the 3" never passes through a Deck Profile
percentage.

## Deviations from Plan

**1. [Rule 3 — blocking] Whole-millimetre nudges can't paste back exactly through the preset printer.**
- Found during: Task 3, `preset-source.test.ts`.
- Issue: the printer writes every length as `inchesToMm(<decimal inches>)` (a deliberate non-goal recorded in
  `preset-source.ts`: `presets.ts` is authored in inches). A whole-millimetre nudge (6 mm) pastes back
  within 0.0000127 mm, not exactly.
- Fix: the exact round trip carries the 1/16" nudges and the 0.55 scale; a second test proves whole-mm nudges
  paste back within the printer's documented 0.0000127 mm and every other field exactly. Commit c3f736e4.

**2. [Rule 1 — pre-existing bug] The preset-figures record's generator and its test read different blanks.**
- Found during: Task 3, regenerating `phase14-preset-figures.json`.
- Issue: since 2026-10-03 (the Longboard moved from the 9'3"Y to the 9'4"B) the generator recorded each preset
  in its LIVE blank while the record's only reader, `phase14-preset-figures.test.ts`, reads each preset in the
  blank it opened in at go-live 2 (`recordedPresetDesignFields`, as `phase14-preset-blanks.ts` sets out).
  Regenerating as planned moved the Longboard's thickness and rocker in the record too, and broke that test's
  Longboard row. M5's "the thicknesses and rockers do not move" did not hold for the Longboard.
- Fix: `scripts/extract-phase14-preset-figures.ts` (OUTSIDE `files_modified`, about 10 lines plus its header)
  now builds each preset from `recordedPresetDesignFields` and `summarizeDesign`, exactly as its test does.
  The regenerated record now changes only the four `litres` lines (plus the provenance line naming the new
  path), as the plan's acceptance asks: Shortboard 29.562 → 30.085, Fish 35.313 → 35.318, Mid-length 50.401 →
  50.057, Longboard (its go-live 9'3"Y board) 75.311 → 75.259. Commit c3f736e4. **The orchestrator may prefer
  the other fix** (keep the generator, point the test's record row at the live pick); this one was chosen
  because it keeps every historical record on its own blank, as that fixture's header says.
- Consequence: the record's Longboard litres (75.259, the 9'3"Y board) is not the Longboard card's litres
  (73.957, the 9'4"B). So the tile litres checks no longer read the record, as the plan said: `screen-tiles.test.ts`
  now checks the tile figure is the card's own litres (`presetSummary`) to one decimal (a rule relation), and
  `e2e/phone-screen-tiles.spec.ts` reads each card's litres from the app (`presetSummary` + `formatTileLitres`).
  No typed litres remain in either (`grep -cE '29\.6|35\.3|73\.9'` prints 0).

**3. [Rule 1 — caused by this plan] The board-lock "greyed look" browser check misread the tail's Advanced.**
- Found during: Task 4, `board-lock-screens` look-rails on desktop.
- Issue: with the Corner Cut row gone, a tail with Hard Edge on has nothing in Advanced but Reset, so the check's
  row-finder climbed to the whole Tail Rail group and flagged its live heading and View label.
- Fix: the rail's heading row (name + View box, view-only by design) carries `data-lock-exempt` in
  `components/rails/rail-controls.tsx`. No pixel changes. Commit 1c932b15. Plan 02's sliders will put real
  rows back into the tail's Advanced anyway.

**4. [Stopped, for the orchestrator] VOLUME's desktop reference picture changed in more than its litres.**
- Found during: Task 4, `desktop-baseline.spec.ts`.
- What changed on VOLUME (default board): Estimated Volume 30.51 → 30.73 L, **and** Tail Cross-Section
  Thickness 1 7/16" → 1 1/2" and Nose Cross-Section Thickness 1 3/16" → 1 1/4". Nothing else moved (Center 2
  5/16", Length-Weighted 1 1/2" and the rest unchanged). The two thickness rows are each end's average thickness
  across its 12" cross-section, worked out from the same rail profile volume reads, so they moved for exactly
  the reason the litres did.
- Per the plan ("Any other baseline difference: STOP and report it"), `volume-desktop-desktop-darwin.png` was
  **not** re-recorded; `desktop-baseline` still fails on VOLUME alone. The expected / actual / diff images are
  at `/private/tmp/claude-501/-Users-kontoes-Code-shaper/83ff3531-9289-46f6-95de-7b57b8eb15bc/scratchpad/volume-baseline-diff/`.
  To accept it: `PW_PORT=<port> IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g VOLUME --update-snapshots`.
- Also owed with the re-records: the spec's header keeps a RE-RECORDED log; no entry was added for RAILS (the
  spec file is outside `files_modified`).

**5. Minor.** The golden generator was written before the Task 1 commit landed. It's a standalone script, not
app code, so the before pictures still come from the unchanged app.

## Known Stubs

None. The seven nudges and the tip scale are stored and honoured by the rules, but nothing on screen sets them
yet. That is plan 02 by design, not a stub: every board reads them at their defaults.

## Threat Flags

None beyond the plan's threat register: T-gec-01 (forgiving reads, held windows) and T-gec-02 (frozen main
schema test) are implemented and tested; no new endpoint, auth path or database change.

## Self-Check: PASSED

- Created files present: `scripts/extract-rails-v2-golden.ts`, `lib/geometry/__fixtures__/rails-v2-golden.json`,
  `lib/geometry/finished-rail.ts`, `lib/geometry/finished-rail.test.ts`; 14 pictures + `shoot-source.tar.gz`, no
  loose `.ts` in `pictures/`.
- Commits present on the branch: f0a646fc, 7ebcb19b, c3f736e4, 1c932b15, 32478904.
- One open item for the orchestrator: VOLUME's desktop reference picture (deviation 4).
