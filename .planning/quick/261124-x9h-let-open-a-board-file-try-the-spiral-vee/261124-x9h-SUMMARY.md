---
phase: quick-261124-x9h
plan: 01
status: complete
base: 6e7541d9dfdbe5c1ba35fde929c609043807f1b8
subsystem: brd-import
tags: [brd, bottom, spiral-vee, import]
requires: [spike-004]
provides: ["Open a board file tries the Spiral Vee on its own before the bottom's cuts are named"]
affects: [lib/geometry/brd-bottom.ts]
tech-stack:
  added: []
  patterns: ["one more candidate in the bottom fit's pool; the choice rules untouched"]
key-files:
  created: []
  modified:
    - lib/geometry/brd-bottom.ts
    - lib/geometry/brd-bottom.test.ts
    - lib/export/brd-look.test.ts
decisions:
  - "A .brd fit also scores the Spiral Vee alone (flat centre) beside any of its four closest bottoms that pair a centre double with a tail Spiral Vee (D-01, spike 004 fix (b)); chooseBrdBottom and every constant unchanged (D-02)"
metrics:
  completed: 2026-11-25
  tasks: 2
actuals:
  tokens: 3400  # chars/4 over the committed code diff (13,711 chars); the SUMMARY and archive not counted
  tasks: 2
  commits: 1
---

BASE: 6e7541d9dfdbe5c1ba35fde929c609043807f1b8

# Quick 261124-x9h: Open a board file tries the Spiral Vee on its own

**A board file whose tail is a double concave running out through a vee, with nothing cut in the centre, now opens as one tail
cut, a Spiral Vee, where it used to open as a centre Early Double Concave over a tail vee that stopped short of the tail. The
founder's SAtwin file goes from 1.61 mm off at the widest to 0.39 mm; his other eleven files open exactly as before.**

## What changes when a shaper opens a .brd

When Open a board file fits BOTTOM's three cuts to a file, it guesses a bottom, then tries swapping each section's cut for
every other name, one section at a time, and keeps the closest. A double concave that runs out through a vee tail is what
the Spiral Vee draws on its own, but from a centre double concave over a Spiral Vee, "nothing in the centre and a Spiral
Vee" is two swaps away, so it was never tried. Now, whenever one of the four closest bottoms is a centre double over a tail
Spiral Vee, the fit also tries two more: that same bottom with the centre flat, and the Spiral Vee afresh from its own
starting numbers under a flat centre, each with its sliders free. Then the usual rules choose, unchanged: fewest cuts, an
extra cut must earn 0.25 mm, the Tri-Plane last, the rails-first try and the polish's guard.

**What stays the same:** every slider, range, step, name and GUIDE word on BOTTOM; every saved board (nothing stored
changes, no database change); every fixture, golden figure, litres pin and screenshot baseline; and the cuts of every other
sample file. Only what a newly opened .brd is fitted to can change, and only for a file that has that pair among its
closest guesses.

## The founder's twelve files through the real import (D-05)

Widest / typical bottom and rails miss in mm; open time is the fastest of three opens. Measured in this worktree, before
the edit on BASE and after on the finished code.

| File | Bottom before | Bottom after | Rails before | Rails after | Cuts before | Cuts after | Open before | Open after |
|---|---|---|---|---|---|---|---|---|
| 6'10-Widepoint-Fwd-Egg | 0.77 / 0.21 | 0.77 / 0.21 | 1.67 / 0.49 | 1.67 / 0.49 | Flat · Flat · Panel Vee | same | 0.49 s | 0.49 s |
| 6'2-Round-Tail---Double-Concave | 0.55 / 0.17 | 0.55 / 0.17 | 2.08 / 0.42 | 2.08 / 0.42 | Teardrop Nose Concave · Deep Single Concave · Double Concave | same | 1.86 s | 1.83 s |
| 6'4-Double-Wing-Groveler | 0.54 / 0.12 | 0.54 / 0.12 | 1.20 / 0.43 | 1.20 / 0.43 | Flat · Deep Single Concave · Flat | same | 0.81 s | 0.80 s |
| 92Log | 1.58 / 0.44 | 1.58 / 0.44 | 1.65 / 0.44 | 1.65 / 0.44 | Flat · Continuous Belly / Rolled Mid · Rolled Vee | same | 1.03 s | 1.03 s |
| Fryer-5'7-Squash-Flyer-Twin | 0.49 / 0.21 | 0.49 / 0.21 | 0.93 / 0.30 | 0.93 / 0.30 | Blended Nose Concave · Deep Single Concave · Double Concave | same | 1.71 s | 1.71 s |
| JFS_BigTwin | 0.70 / 0.32 | 0.70 / 0.32 | 1.42 / 0.35 | 1.42 / 0.35 | Flat · Flat · Panel Vee | same | 0.46 s | 0.46 s |
| SAtri | 0.40 / 0.06 | 0.40 / 0.06 | 2.52 / 0.32 | 2.52 / 0.32 | Flat · Flat · Spiral Vee | same | 1.05 s | 1.11 s |
| **SAtwin** | **1.61 / 0.12** | **0.39 / 0.06** | 2.52 / 0.37 | 2.52 / 0.32 | Flat · Early Double Concave · Panel Vee | **Flat · Flat · Spiral Vee** | 0.97 s | 1.10 s |
| Scoop-Noserider | 1.18 / 0.36 | 1.18 / 0.36 | 2.70 / 0.78 | 2.70 / 0.78 | Blended Nose Concave · Continuous Belly / Rolled Mid · Panel Vee | same | 1.11 s | 1.13 s |
| mid | 0.56 / 0.09 | 0.56 / 0.09 | 1.76 / 0.42 | 1.76 / 0.42 | Blended Nose Concave · Flat · Panel Vee | same | 1.44 s | 1.44 s |
| quadtesting | 6.43 / 0.82 | 6.43 / 0.82 | 55.49 / 2.08 | 55.49 / 2.08 | Flat · Continuous Belly / Rolled Mid · Panel Vee | same | 1.04 s | 1.04 s |
| testLB | 2.08 / 0.26 | 2.08 / 0.26 | 5.01 / 0.80 | 5.01 / 0.80 | Teardrop Nose Concave · Flat · Flat | same | 2.79 s | 2.75 s |
| Total | | | | | | | 14.8 s | 14.9 s |

**Which files moved:** only SAtwin (its cut names, its bottom, and its rails' typical miss, 0.37 to 0.32 mm, because the rails
are fitted over the better bottom). In full: Flat Entry · Early Double Concave 7/64" · Panel Vee 1/4" became Flat Entry ·
Flat Center · Spiral Vee 1/8".

**Against the plan and spike 004:** every bottom figure, rails figure and cut name equals the plan's table (READ THIS FIRST §3)
and spike 004's fix (b) table to the hundredth. No file differs, so there is no finding to report here. Open times sit
within 0.13 s of each other on every file (SAtwin's 0.13 s is the new candidate's cost; SAtri's 0.06 s is wobble, it never
takes the new candidate since its closest bottoms hold no centre double). The total, 14.8 s to 14.9 s fastest-of-three,
agrees with the spike's interleaved 14.6 s to 14.8 s.

## The app's own boards that prove it (D-04)

The Mid-length with a tail Spiral Vee and nothing else, its Start moved further up the board than the name's own Start, on the
Start slider's half-inch grid. Before the change (the RED run, BASE's code) each came back with a centre Early Double Concave;
with it, each comes back as Flat Entry · Flat Center · Spiral Vee within a millimetre:

| Written on the Mid-length | Before (BASE, the RED run) | Fitted with the change (`fitBottomToBrd`) | Opened with the change (`brdLookFromBytes`) |
|---|---|---|---|
| Spiral Vee 1/8", Start 20" further up | centre came back a double | Flat · Flat · Spiral Vee 1/8", 0.56 / 0.09 mm | Flat · Flat · Spiral Vee, 0.35 / 0.08 mm |
| Spiral Vee 1/8", Start 26" further up | centre came back a double; opened as Early Double Concave + Spiral Vee | Flat · Flat · Spiral Vee 1/8", 0.61 / 0.11 mm | Flat · Flat · Spiral Vee, 0.37 / 0.09 mm |
| Spiral Vee 3/16", Start 26" further up | centre came back a double; opened as Early Double Concave + Panel Vee | Flat · Flat · Spiral Vee 3/16", 0.89 / 0.04 mm | Flat · Flat · Spiral Vee, 0.45 / 0.08 mm |

These match the plan's figures (READ THIS FIRST §2) exactly. They are the five new test cases: three in
`lib/geometry/brd-bottom.test.ts` (the fit) and two in `lib/export/brd-look.test.ts` (the real import, including that the board
it opens as carries a Flat Center and a Spiral Vee tail). All five failed on BASE's code because the centre came back a double
(the RED run: "Expected: flat, Received: double" three times; "Flat Center" expected, "Early Double Concave" received twice),
and all five pass with the change.

## What it does not fix

- **A Spiral Vee started far up a Shortboard** (found at plan time, not tuned for). The Shortboard with a Spiral Vee 1/8"
  started 24" or 26" further up (47" or 49" from the tail on a 74" board) comes back as a centre Continuous Belly 1/8" over a
  Spiral Vee, before and after this change (at 24": fit score 1.36 against the written bottom's 0.73, 1.21 mm widest). The
  centre there is a belly, not a double, so the new candidate is not offered; the Spiral Vee alone is already among today's
  candidates, but its fitted Start comes back about 12" short of the written one. Starts up to 22" further up come back as a
  Spiral Vee alone today. The new tests therefore use the Mid-length only. A later question if a real file ever shows it.
  Measured again here, the same: 1.21 / 0.17 mm at 24" and 1.24 / 0.18 mm at 26", score 1.355 and 1.383.
- **A deeper Spiral Vee started far up a Shortboard** (found while executing, a second Shortboard case; reported, not tuned
  for). The Shortboard with a Spiral Vee 3/16" started 24" or 26" further up comes back as an Early Double Concave 1/16" over a
  Spiral Vee 1/8", identically before and after this change (0.73 / 0.11 mm and 0.75 / 0.11 mm). Here the centre IS a double,
  so the Spiral Vee alone is now offered, but it does not win: the shallow double over a shallower vee scores closer to the
  file than even the bottom that was written (0.859 against 0.990 at 24", 0.977 against 1.136 at 26"), so on this board's
  sections the two shapes are near enough the same and the fit's choice is honest rather than a missed name. At 20" it comes
  back as a Spiral Vee alone. Figures in the archive's `out/synth-after.txt` and `out/synth-shortboard-3-16-before.txt`.
- The nose misses on 92Log, Scoop-Noserider and testLB (spike 003's finding), a belly shape control, and quadtesting's rolled
  vee past Depth's half inch: out of scope (CONTEXT).

## Gates

- **The three .brd unit suites** (`brd-bottom`, `brd-fit-preview`, `brd-look`): `Tests  183 passed (183)` (178 before, plus
  the five new ones).
- **`npm test`, the whole unit suite:** `Test Files  240 passed (240)`, `Tests  13964 passed | 2 skipped (13966)`, exit 0. Every
  golden, litres pin, GUIDE test and .brd suite green.
- **`npx tsc --noEmit`:** exit 0 (after `npx next typegen` in this fresh worktree).
- **Lint on the three touched files:** `npx eslint lib/geometry/brd-bottom.ts lib/geometry/brd-bottom.test.ts
  lib/export/brd-look.test.ts`, exit 0.
- **The board-file browser specs** (`IS_WEBPACK_TEST=1 PW_PORT=3151 npx playwright test e2e/brd-fit-preview.spec.ts
  e2e/brd-home-weight.spec.ts e2e/board-file.spec.ts --project=desktop --project=iphone --project=android`):
  `16 failed`, `47 skipped`, `84 passed (12.6m)`, exit 1. By device: **android 0 failed**; **desktop 1 failed** (b12, Open as a
  Board then ROCKER: the page was still on TEMPLATE at 5 s); **iphone 15 failed** (b1, b6, b7, b9, b10, b13, b14, b15, b18,
  b31, b23, b24, b38, b32, b33 — every one waiting for the preview, which still said "Reading the file…" at 5 s).
  - Re-run of just the sixteen: the same sixteen failed, exit 1.
  - **desktop b12 is a load flake:** alone it passes on this change (`1 passed (35.1s)`) and on BASE's code (`1 passed (36.0s)`).
  - **The iPhone failures are not this change:** with BASE's `lib/geometry/brd-bottom.ts` put back temporarily (then restored
    from the commit), iPhone b1 and b14 fail exactly the same way (`2 failed`, the preview not visible at 5 s). Those two are
    the app's own flat Shortboard, whose closest bottoms never pair a centre double with a Spiral Vee, so the new candidate
    never runs for them. Something on this machine keeps the iPhone (WebKit) preview from opening in 5 s under the webpack dev
    server in a worktree; it is the same on BASE, so it is for the orchestrator's run on main (Turbopack) to confirm, not
    something this change touches. No screenshot baseline changed; none was re-recorded.
  - All logs are in the archive's `out/pw*.txt`.
- **`npm run test:e2e:prod`** cannot run in a worktree: left for the orchestrator after the merge.
- **Removed test lines against BASE:** exactly the two widened imports in `lib/export/brd-look.test.ts`:
  - `-import { designCrossSectionInput, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES } from "../geometry/design";`
    (re-added with `designBottomBoard` and `designFinPlacement`)
  - `-import { brdText } from "./brd";` (re-added with `brdBottomStations`)
- **Changed files against BASE:** `lib/export/brd-look.test.ts`, `lib/geometry/brd-bottom.test.ts`, `lib/geometry/brd-bottom.ts`
  (committed), plus this SUMMARY and the re-packed archive (left uncommitted for the orchestrator). No fixture, screenshot
  baseline, `lib/geometry/bottom.ts`, `lib/export/brd-fit-preview.ts`, `components/`, `app/` or `db/` file changed
  (`git diff --stat BASE -- …` empty). `chooseBrdBottom`, `seedSearch`, the scorer and every constant are untouched.
- **The archive** holds `scripts/` and `out/` (before.json, after.json, table.txt, the synthetic runs and the browser logs) and no
  .brd file (listing checked: 0).

## Commits

- `f3ccaa06` feat(quick-261124-x9h): a .brd with a double concave running out through a vee tail now opens as a Spiral Vee on
  its own (`lib/geometry/brd-bottom.ts`, `lib/geometry/brd-bottom.test.ts`, `lib/export/brd-look.test.ts`)

## Deviations from Plan

- **Docs not committed in the worktree.** The plan says to commit the SUMMARY and the re-packed archive in a docs commit; the
  orchestrator's prompt overrides that, so both are left uncommitted for the orchestrator to copy to main. One code commit only.
- **The test-splice script was run with its "scratchpad" path guard lifted** (a copy in the scratchpad): the guard exists so
  the planner's throwaway copy was never confused with the repo; here the target was this task's own worktree, as the plan
  intends. The spliced lines are exactly the drafts.
- **BASE's `lib/geometry/brd-bottom.ts` was put back twice, briefly, for comparison runs** (iPhone b1/b14 and desktop b12 in
  the browser, and the Shortboard 3/16" fits), each time restored with `git checkout -- lib/geometry/brd-bottom.ts`; the
  worktree ended clean against the commit (`git status` shows only the SUMMARY and the archive).
- **The tracer gate:** auto-advance is off in config, which would normally mean a human check right after the tracer task. The
  tracer's check is the unit suites (automated, green), and the orchestrator asked for every task to run, so Task 2 followed
  directly; the founder's own check is below.

## The check for the founder

Open SAtwin.brd with Open a board file… (on localhost after the merge, or on the live site once you say to push). The
preview's bottom should list one cut, a Spiral Vee in the tail, nothing in the centre, about 0.4 mm off at the widest.
Opened as a board, BOTTOM should show TAIL as Spiral Vee and CENTER as Flat.

## Self-Check: PASSED

All five files present; commit f3ccaa06 exists and deletes nothing; the five new cases carry the quick id; `chooseBrdBottom(pool, best)` is called as before.
