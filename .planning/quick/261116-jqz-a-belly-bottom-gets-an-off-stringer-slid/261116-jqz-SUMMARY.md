---
phase: quick-261116-jqz
plan: 01
subsystem: bottom-contours, brd-import
tags: [bottom, belly, off-stringer, brd-import, tri-plane, rails-first]
base: 5ba4e2134043cadb68b6e168419339eaef2faa25
status: complete
requires: []
provides:
  - "A belly (Rolled Belly Entry, Continuous Belly / Rolled Mid) shows an Off Stringer slider on BOTTOM, 0 to 9 inches"
  - "bottomLayoutMarks / pencil lines / print / foam follow a belly's panel"
  - "The .brd fit moves a belly's Off Stringer and reaches for the Tri-Plane Hull Center last (chooseBrdBottom, BRD_BOTTOM_TRI_PLANE_MM)"
  - "The rails-first try starts at 3 mm (BRD_RAIL_FIRST_TRY_MM)"
affects: [BOTTOM, DATA, printed BOTTOM CONTOURS, Open a board file]
key-files:
  created:
    - lib/geometry/bottom-belly-panel.test.ts
    - e2e/bottom-belly-panel.spec.ts
  modified:
    - components/bottom/bottom-controls.tsx
    - lib/geometry/bottom.ts
    - lib/geometry/bottom-draw.ts
    - lib/geometry/bottom-print.ts
    - lib/geometry/brd-bottom.ts
    - lib/geometry/brd-bottom.test.ts
    - lib/geometry/brd-rails.ts
    - lib/export/brd-fit-preview.ts
    - lib/export/brd-fit-preview.test.ts
    - lib/models/design-snapshot.test.ts
    - e2e/bottom-panel.spec.ts
    - e2e/bottom-metric.spec.ts
decisions:
  - "D-09: the Tri-Plane margin stays 1 mm"
  - "D-08: the rails-first try starts at 3 mm (gate-3mm)"
metrics:
  tasks: 3
  commits: 2
actuals:
  tokens: 60000
  tasks: 3
  commits: 2
---

# Phase quick-261116-jqz Plan 01: A belly gets an Off Stringer panel, the .brd import reaches for the Tri-Plane last Summary

BASE: 5ba4e2134043cadb68b6e168419339eaef2faa25 (worktree-agent-a67eca33a10627c8a)

**A belly bottom now has the Tri-Plane's Off Stringer slider (a flat panel each side of the stringer, the belly rolling from its edge out to the rail), and Open a board file now brings 92Log.brd, Scoop-Noserider.brd and quadtesting.brd in as belly bottoms instead of Tri-Planes.**

## What it does to the board and the screen

- **BOTTOM.** The Rolled Belly Entry (nose) and the Continuous Belly / Rolled Mid (centre) show an **Off Stringer** row in the Tri-Plane's place in the row order: same label, 0" to 9", 1/16" steps, whole millimetres in Metric, "At the stringer" under the left end. It opens at 0", so every existing board, preset, GUIDE card, litre figure and golden reads exactly as before.
- **Moved out** (for example 3"), the belly is flat for that distance either side of the stringer and rolls from the panel's edge to the rail. The litres, the 3D board and the .brd export follow it, BOTTOM draws a dotted panel line 3" out and the section drawing shows the flat middle with an "OFF THE STRINGER 3"" dimension, DATA gets a "Center flat" (or "Nose flat") column reading 3" wherever the cut is on, the floor check follows it, and the printed BOTTOM CONTOURS line ends "; panel 3" off the stringer." in both Imperial and Metric.
- **Saved boards.** Nothing to migrate: a belly's Off Stringer was already stored and bounded on every cut. It survives a save, a board file and a reload (the browser test reloads).
- **Open a board file (.brd).** The fit moves a belly's Off Stringer on the same grid as the Tri-Plane's (every 1/4", then every 1/16" near the best). The Tri-Plane Hull Center is now reached for last: it is kept only when it fits at least 1 mm (on the fit's own score) closer than the closest bottom without one; in a tie or near tie any other name wins. The fit sheet's Across row says `Off Stringer 3"` for a belly over 0".
- **Rails-first try at 3 mm (D-08).** `BRD_RAIL_FIRST_TRY_MM` is 3 mm instead of 4 mm. Without it, once a belly can carry a panel, a log with a flat bottom and soft 50/50 rails is read bottom-first as a panelled belly only 3.94 mm off, which the old 4 mm let through, and the existing "H4 (a log's soft 50/50 rail) goes rails-first" round trip failed. At 3 mm it passes and every .brd suite passes.

## The twelve files through the real import (before = planner's run on main 7fcd9a18; after = my run on the finished code)

Widest / typical miss in mm, seconds for each file run one after another.

| File | Before | After |
|---|---|---|
| 92Log | Reverse Vee Nose 1/8" · Tri-Plane 1/2" panel 4 3/8" · Rolled Vee 7/16" — 1.89 / 0.58, 1.0 s | Flat Entry · **Continuous Belly / Rolled Mid 3/8" panel 2 9/16"** · Rolled Vee 7/16" — 2.14 / 0.71, 1.2 s |
| Scoop-Noserider | Blended Nose Concave 5/16" · Tri-Plane 1/4" panel 7 1/2" · Panel Vee 1/8" — 1.92 / 0.54, 0.6 s | Blended Nose Concave 5/16" · **Continuous Belly / Rolled Mid 3/16"** · Panel Vee 1/8" — 1.92 / 0.52, 1.3 s |
| quadtesting | Flat Entry · Tri-Plane 1/2" · Panel Vee 1/2" — 5.79 / 0.66, 1.1 s | Flat Entry · **Continuous Belly / Rolled Mid 1/2"** · Panel Vee 1/2" — 6.46 / 0.84, 1.7 s |
| SAtri | Flat · Flat · Spiral Vee 1/8" — 0.66 / 0.04 | unchanged — 0.66 / 0.04, 1.1 s |
| SAtwin | Flat · Early Double Concave 1/8" · Panel Vee 1/4" — 1.63 / 0.22 | unchanged — 1.63 / 0.22, 0.8 s |
| mid | Blended Nose Concave 1/2" · Flat · Panel Vee 3/16" — 0.85 / 0.09 | unchanged — 0.85 / 0.09, 1.2 s |
| testLB | Teardrop 7/16" · Flat · Flat — 2.39 / 0.34, 3.8 s | unchanged — 2.39 / 0.34, 3.0 s |
| JFS_BigTwin | Flat · Flat · Panel Vee 1/8" — 0.70 / 0.36 | unchanged — 0.70 / 0.36, 0.5 s |
| 6'10 Widepoint Fwd Egg | Flat · Flat · Panel Vee 1/8" — 0.84 / 0.27 | unchanged — 0.84 / 0.27, 0.5 s |
| 6'2 Round Tail Double Concave | Teardrop 1/16" · Deep Single 1/8" · Double Concave Exit 1/8" — 0.95 / 0.27 | unchanged — 0.95 / 0.27, 0.7 s |
| 6'4 Double Wing Groveler | Flat · Deep Single 1/8" · Flat — 0.83 / 0.14 | unchanged — 0.83 / 0.14, 0.9 s |
| Fryer 5'7 Squash Flyer Twin | Blended Nose 1/16" · Deep Single 3/16" · Double Concave Exit 1/8" — 1.04 / 0.31 | unchanged — 1.04 / 0.31, 0.7 s |

The after run matches the planner's prototype figure for figure (the three changed rows and the nine unchanged ones). Total 13.6 s across the twelve against the planner's 13.4 s before: the same, within the noise of a busy machine. 92Log and Scoop-Noserider both have a Continuous Belly / Rolled Mid centre (D-06).

The miss on 92Log and quadtesting is a little larger than with the Tri-Plane (92Log 1.89 to 2.14 mm widest; quadtesting 5.79 to 6.46 mm widest). That is the price of "the Tri-Plane is the rarest", which the founder asked for; it is stated here, not hidden.

### The margin (D-05): why 1 mm stays

On the fit's own score the Tri-Plane was this much closer than the closest bottom without one: 92Log 0.55 mm on the first fit and 0.06 mm on the refit with our rail's windows, Scoop 0.09 mm, quadtesting 0.86 mm; on the other nine it was never closer.

| Margin | 92Log | Scoop | quadtesting |
|---|---|---|---|
| 0 or 0.25 mm | Tri-Plane | Tri-Plane | Tri-Plane |
| 0.5 mm | Tri-Plane | belly | Tri-Plane |
| 0.75 mm | belly | belly | Tri-Plane |
| 1 mm or 1.5 mm | belly | belly | belly |

**Question for the founder (D-09 answered "1 mm"; recorded for the record):** quadtesting's tail is a vee 1 1/8" deep, deeper than the Panel Vee's 1/2" can reach, so either centre cut there is standing in for the missing vee depth, not for a tri-plane hull. At 0.75 mm quadtesting would keep its Tri-Plane, about 0.7 mm closer at the widest point. The founder chose 1 mm, so quadtesting comes in as a belly.

### What it does to the app's own Tri-Plane round trips (the one planned deviation from D-07)

A Tri-Plane the app writes at its starting 1/8" depth to a file and reads back is a near tie with a Continuous Belly with a flat panel (the belly scores 0.07 mm closer, 0.02 mm farther and 0.20 mm farther in the three cases that write one: the Shortboard alone, and the Shortboard and Mid-length each with a Panel Vee). The rule gives every near tie to the belly, so those three come back as a Continuous Belly at the same depth, no further from the file than the written bottom. A 1/2" Tri-Plane, alone or with a Panel Vee, on the Shortboard and the Mid-length still comes back as a Tri-Plane (tested): rare, not gone. Shallower than 3/8" it mostly comes back as a panelled belly.

## Task 2 (checkpoint): the founder's answer

Answered before the run: **gate-3mm**. `BRD_RAIL_FIRST_TRY_MM` goes 4 mm to 3 mm (header doc and the fit-preview doc updated, with the measured reason). RAILS itself does not change. H4 passes unchanged; every brd suite passes; the twelve files read as above (Scoop tries rails-first and keeps bottom-first).

## Tasks and commits

| Task | What | Commit |
|---|---|---|
| 1 (tracer) | Belly Off Stringer slider, DATA/draw/print/foam readers, unit file, snapshot cases, browser spec and five pictures | 96aa165f |
| 2 | Decision (answered: gate-3mm, margin 1 mm) | no code |
| 3 | The fit moves a belly's panel, `chooseBrdBottom`, `BRD_BOTTOM_TRI_PLANE_MM`, Across row, rails-first at 3 mm, tests | 5826a786 |

## Tests and gates

- Unit: whole suite `npx vitest run --maxWorkers=6` 238 files, 13893 passed, 2 skipped, exit 0. The brd-fit "finishes the Longboard well inside a second" case passes.
- `npx tsc --noEmit` clean. `npm run lint`: 0 errors, 1 pre-existing warning (`lib/db/import-designs-action.test.ts` `_calls`), untouched.
- Browser (PW_PORT=3141, desktop and android): `bottom-belly-panel`, `bottom-guide`, `bottom-metric`, `bottom-panel`, `bottom-saving`, `bottom-screen`, `bottom-side-view`, `bottom-trough`, `bottom-viewer`, `bottom-wings`, `phone-bottom`, `summary-bottom-page`: 99 passed, 51 skipped (the iPhone project, skipped by design), exit 0. `desktop-baseline.spec.ts` on desktop: 6 passed, no baseline changed.
- `git diff -U0 $BASE -- '*.test.ts' '*.spec.ts'` excluding the four allowed files prints no removed line; `git diff --quiet $BASE -- lib/geometry/__fixtures__ e2e/*-snapshots` succeeds (no fixture or baseline touched). `lib/geometry/brd-rails.test.ts` is not changed.

### Removed test lines in the allowed files, with reasons

`e2e/bottom-panel.spec.ts` (the rows each belly shows, now including Off Stringer):
- ` * (the Spiral Vee is one) Off Rail, Off Stringer, Trough At; the Tri-Plane Off Stringer; then every cut Start, Deepest` — comment re-worded to name the belly beside the Tri-Plane.
- `  "Rolled Belly Entry": "liftOnly",` and `  "Continuous Belly / Rolled Mid": "liftOnly",` — both bellies now map to the new `belly` row list (Off Stringer first).

`e2e/bottom-metric.spec.ts`:
- `  if (cut.kind === "double" || cut.name === "Tri-Plane Hull Center") rows.push("offStringer");` — the spec's twin of `cutRows`, now also for a belly.

`lib/geometry/brd-bottom.test.ts`:
- ``      expect(cutKind(found.bottom[key].name), `${c.name}: ${key} kind`).toBe(cutKind(wanted[key].name));`` — re-pointed through the named helper `comesBackAs`, which expects a written Tri-Plane at its starting 1/8" back as a belly (D-05, the three near-tie cases above). Every other kind, depth and closeness check is unchanged.

## Deviations from Plan

None beyond the planned ones above (the three Tri-Plane round trips re-pointed; the rails-first constant at 3 mm per the founder).

Two small implementation notes, no behaviour change: `cutFoamOffParts`'s comment already named a belly's panel so only `markColumnsOf` / `marksOf` needed code; `lib/geometry/bottom-draw.ts` and `bottom-print.ts` got comment-only edits (their code already followed a belly's panel).

The RED step: the two DATA-column cases fail on the old `markColumnsOf` and the other readers pass, as the plan predicted (verified by reverting `bottom.ts` for one run). In Task 3 the new functions did not exist before the code, so those cases were written with the code in one pass.

## Known Stubs

None.

## Threat Flags

None. The only new input path is a belly's `offStringer`, already bounded 0 to 12" by the snapshot schema (T-jqz-01); the fit's belly sweep is the Tri-Plane's existing bounded grid and the twelve files take the same total time (T-jqz-02).

## Pictures (not committed; for the founder's look)

In `.planning/quick/261116-jqz-a-belly-bottom-gets-an-off-stringer-slid/pictures/`: `belly-panel-0-desktop.png`, `belly-panel-0-android.png`, `belly-panel-3-desktop.png`, `belly-panel-3-android.png`, `belly-panel-data-desktop.png`. I looked at the 3" and DATA pictures: the panel lines run parallel to the stringer 3" out, the section shows the flat middle, and DATA's Center flat column reads 3" at every station the cut is on.

## Human check after the push

The founder opens 92Log.brd and Scoop-Noserider.brd on the live site: each should come in with a Continuous Belly / Rolled Mid centre, and 92Log's should show its Off Stringer on BOTTOM.

## Self-Check: PASSED

Files found: lib/geometry/bottom-belly-panel.test.ts, e2e/bottom-belly-panel.spec.ts, the five pictures. Commits found: 96aa165f, 5826a786.
