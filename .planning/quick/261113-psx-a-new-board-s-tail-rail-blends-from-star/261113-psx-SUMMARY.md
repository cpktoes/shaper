---
phase: quick-261113-psx
plan: 01
subsystem: rails / volume / 3D / .brd fit
tags: [tail-rail-blend, defaults, pins, reports, guide]
requires: [quick-261113-kvo]
provides:
  - "A board that says nothing reads Tail Rail Blends From = 12 in and Ends At = the top of its slider (the centre)"
  - "D-30's old default kept by name (d30HardEdgeBlendsFrom, d30HardEdgeEndsAt, withD30TailRailBlend)"
  - "scripts/check-saved-boards.ts --tail-blend-report (read-only)"
key-files:
  created: [lib/models/tail-blend-report.ts, lib/models/tail-blend-report.test.ts]
  modified: [lib/geometry/rail-bands.ts, lib/geometry/volume.ts, lib/geometry/blank-reasons.ts, lib/geometry/guide-rails.ts, lib/models/surface-report.ts, lib/models/rail-character-report.ts]
status: complete
actuals:
  tokens: 37000
  tasks: 4
  commits: 4
---

# Quick 261113-psx: Tail Rail Blends From 12" and Ends At the top of its slider, as the default

A new board's tail rail now blends evenly from the 12" station to the board's centre, the way the nose's does. Founder, 2026-11-13: "Let's change Tail Rail Blends From 12" and Ends At the max value as the new default."

## What changes for a shaper

- RAILS -> TAIL RAIL -> Advanced on a board that never moved the two sliders reads **Blends From 12"** and **Ends At = the board's centre** (36" on the stock 6'0", 37" Shortboard, 34" Fish, 43" Mid-length, 54" Longboard). Both slider dots sit at their ends and the labels agree, in Imperial and Metric (`30.5 cm` and, on a 6'0", `91.4 cm`). 3D reads the same two figures. Reset Advanced Settings still deletes both fields and now lands there.
- Preset cards: 29.6, 34.6, 49.4, **72.3** L (the Longboard was 72.4). Stock 6'0" still 30.29 L on VOLUME.
- A board that moved the sliders keeps its own figures exactly. Anything absent, crafted or outside its window reads the new default; the pair never crosses.
- RAILS GUIDE card: Shortboard `12" · 37"`, dashed `18" · 37"` (Metric `30.5 cm · 94.0 cm`, `45.5 cm`). The dashed push now moves Blends From alone, 6" toward the nose (both marks are at their ends, so the pair cannot move together); a stored mid pair still pushes as a pair.

## Commits

| Task | Commit | What |
|---|---|---|
| 1 | 4ada746e | readers, sliders, litres and 3D rule on the new default; D-30 kept by name |
| 2 | f6833568 | pins / hashes / snapshots read their boards as D-30 read them; preset record regenerated |
| 3 | b3c65e5d | GUIDE card, help-note words, old reports on D-30, `--tail-blend-report` |
| 4 | cb59eecd | browser specs on the new default, pictures |

## Parity with the plan's tables (re-measured on the shipped code)

**Defaults** (`sliders.mts`): 12 lengths from 60" to 120", Imperial and Metric: every line "at its start" / "at its end"; 73 1/4" and 73 7/8" read 36 1/2" (the slider's top, short of the centre). Metric thumbs at 310 mm and 910 / 930 / 1370 mm, as planned.

**Litres** (`cards.mts`, `litres.mts`):

| Board | Before -> after (L) | Card | VOLUME |
|---|---|---|---|
| Shortboard (Hard Edge) | 29.613 -> 29.612 | 29.6 | 29.61 |
| Fish (Hard Edge) | 34.649 -> 34.645 | 34.6 | 34.65 -> 34.64 |
| Mid-length | 49.404 -> 49.398 | 49.4 | 49.40 |
| Longboard (tucked) | 72.388 -> 72.343 | **72.4 -> 72.3** | 72.39 -> 72.34 |
| stock 6'0" | 30.2874 -> 30.2850 | | 30.29 |
| Mid tucked (flipped) | 49.365 -> 49.356 | | |
| Longboard hard (flipped) | 73.306 -> 73.600 (+0.294) | | |

**Rail moves** (largest gap, mm): Shortboard hard 2.24 at 19 1/2"; Fish hard 2.67 at 19 1/2"; Mid hard 1.57 at 19 1/2"; Longboard as preset 0.48 at 34 1/2"; Longboard hard ticked 6.47 at 18". All equal the plan.

**.brd rails fit**: Egg 2.07/0.73 -> 2.07/0.70, tail Ratio 50/50 -> 49/51 and Domed Deck Band +1/2"; mid.brd 1.76/0.41 -> 2.18/0.43 (worst 27.8"); Round Tail, Fryer, Scoop, testLB unchanged; every order and bottom the same (bottom-first except testLB rails-first). New-board figures: Egg 7.51/2.36, Fryer 5.57/1.47, mid 5.43/0.99, testLB 21.42/3.92. Equal to the plan.

**brd-bottom new-default figure**: the "Panel Vee 3/16" from 30", deepest 8"" round trip, on boards with the new default, reads the vee's start **5.333" off** (the test's limit is 4"; 4" on D-30's boards). Measured by running that one case unpinned, then restored.

## Tests and pictures re-pointed, and why

Nothing that the plan said must hold was re-recorded: no pin JSON, snapshot, hash or golden touched; `git diff` of `__fixtures__/` is `phase14-preset-figures.json` and `phase16-boards.ts` (new helper `asD30Read`) only.

- Re-pointed to the new default, figures from the readers: rail-bands (new-default tests, the D-30 tests kept by name unchanged in figure), blank-reasons (slider-end test), volume (4 tests + the 4 "live rule with a fit set back" cases now take `SMOOTH_SURFACE_FADE.at`), design-snapshot rule 13 (2 tests), guide-rails (+ stored-pair and all-presets-inside-the-box cases), tail-blend-report (new).
- volume "every blending station is the level-variant area": built the expected halves as the live blend does (each end's `drawn` half when it has one). **The narrow-tail check was consistent** with no code change; the live code was not patched.
- Read as D-30 read them (`asD30Read`, one comment line each): surface pin (the tips-only and narrow-station loops), phase-17 litres pin (170) and channel pin (25), the wireLines hash (74 surfaces), brd-fit's two snapshot describes (21), brd-bottom's two builders, surface-report test, rail-character-report test.
- `phase14-preset-figures.json` regenerated by its own script, litres only: Shortboard 29.61306 -> 29.61163, Fish 34.64901 -> 34.64488, Mid 49.40388 -> 49.39777, Longboard (recorded blank) 73.61420 -> 73.56736; no thickness or rocker number moved.
- build-brd-overview-pdf: the tail name is read from `look.bottom.bottom.tail.name` (Rolled Vee 3/16" now).
- Browser specs: rails-advanced tests 1-5, 7-10 and three-d-hard-edge 1-2 (see below). Desktop baselines: all six held, **none re-recorded**.

## Browser specs (one at a time, PW_PORT=3117)

| Spec | Result |
|---|---|
| e2e/rails-advanced.spec.ts | 74 passed |
| e2e/three-d-hard-edge.spec.ts | 4 passed |
| e2e/three-d-screen.spec.ts -g "Hard Edge Ends At" | 1 passed |
| e2e/guide-rails.spec.ts | 8 passed (10 skipped, phone/desktop split) |
| e2e/brd-fit-preview.spec.ts | 56 passed (37 skipped) |
| e2e/phone-screen-tiles.spec.ts | 38 passed (28 skipped) |
| e2e/desktop-baseline.spec.ts --project=desktop | 6 passed, no baseline changed |

Not run: board-file.spec.ts (f1 known failure, not touched), the whole suite, any build.

## Unit suite

`npx vitest run --maxWorkers=6`: **Test Files 229 passed (229); Tests 13478 passed, 2 skipped (13480)**; exit 0. `npx tsc --noEmit` clean; `npm run lint`: only the old import-designs-action.test.ts warning.

## Pictures (`pictures/`), looked at

- `rails-tail-advanced-{shortboard,longboard}-{desktop,iphone}.png` (+ `-desktop-panel.png`): Longboard on a computer reads `Tail Rail Blends From — 12"` / `Ends At — 54"`, first dot at its left end, second at its right end; Shortboard on the iPhone reads 12" / 37", dots at the ends, Reset below. (The dark round "N" badge is Next's dev-mode button.)
- `3d-longboard-{preset,hardedge}-{before,after}-bottom.png` + `…-before-after-diff.png`: Bottom view, no room, Contour Stripes on, 2x, tail toward the bottom. "Before" is the same kept board with Blends From 18" and Ends At 36" stored (the old default). As the preset only thin slivers of the stripes differ (733 pixels; the rail moves at most 0.48 mm); with the Hard Edge ticked the stripes along both tail-half rails visibly shift (7,597 differing pixels, up to 6.5 mm at 18"), the red areas in the diff.
- `guide-blends-{shortboard,longboard}[-metric].png`: the Longboard in Metric shows `30.5 cm` and `137.2 cm` fully inside the drawing box, dashed `45.5 cm`.

## Calls the founder should see

1. **Saved boards that never moved the two sliders follow the new default** (his earlier call). It moves some by more than the presets: a hard-edged 9'0" board up to +0.3 L, a single-tucked one down about 0.2 L. `scripts/check-saved-boards.ts --tail-blend-report` lists every real board it moves (id, settings before/after, litres before/after, largest first; nothing else). Built and tested on the 102 stand-ins, **not run against any database**. Production line (in the script header too): `npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --tail-blend-report; rm -f .env.production.pull`. He can drop the report.
2. **Ends At's default is the top of its own slider**, so on a 73 7/8" board it is 36 1/2" (the centre is 36 15/16"); on every preset and whole-inch length it is the centre.
3. **Shortening a board**: a stored Ends At past the new centre reads the centre (it used to jump back to L/6 + 18"); lengthen it again and the stored figure returns.
4. **Longboard card 72.4 L -> 72.3 L**; Fish's VOLUME 34.65 -> 34.64.
5. **.brd round trip**: the app's own Shortboard with a 3/16" Panel Vee now reads back as a Rolled Vee 3/16" with the tail's Hard Edge found; a Panel Vee moved to 30" comes back 5 1/3" off in its start (4" before). A .brd this app wrote before this change (mid.brd) carries the old blend and reads up to 0.42 mm further off between 24" and 39".
6. **Observation, not changed (pre-existing)**: when Ends At is at its floor (2" past Blends From) and Blends From is at 12", Blends From has a one-point window and its dot is not drawn (Base UI hides a thumb whose range is zero). It was reachable before; the new default makes 12" the common start, so it is a click or two away. Two browser tests were reordered to avoid pressing a dot that is not there.
7. The GUIDE push's "Ends At alone toward the tail" fallback (after the pair and Blends-From-alone tries) is built as planned but is practically unreachable on real boards, so it has no test of its own.

## Deviations from Plan

- **[Rule 3 - blocking] Task 1 also touched design-snapshot.test.ts and two e2e imports** so `tsc` stayed clean at the first commit (the old `defaultHardEdgeEndsAt` / `DEFAULT_HARD_EDGE_*` names are gone); the real re-pointing of those files followed in Tasks 2 and 4.
- **[Rule 1] build-brd-overview-pdf "Bottom: within"** also failed (the plan expected only the "Panel Vee" word): the closer fit now reads "Bottom: less than 1/16" off". The check accepts either form (`closenessSentence`).
- volume.test had four failures, not five; the "forty boards" check needed the `drawn`-half expectation as the plan anticipated.
- rails-advanced tests 2 and 3 were restructured (not just re-figured) because of the collapsed-window quirk in call 6; test 3 uses PageUp (Base UI moves a slider 10 inches).
- Picture 3D view: Bottom view with Contour Stripes, no room, 2x, rather than a tail-half crop (the viewer's zoom is a crop of a fixed camera); a diff map was added to make the sub-millimetre moves visible.

## Self-Check: PASSED

Commits 4ada746e, f6833568, b3c65e5d, cb59eecd exist; `pictures/` holds 16 files; no `.env*` path was named; no sample file or its text is in the repo; PLAN, BRIEF, SUMMARY and STATE are uncommitted.
