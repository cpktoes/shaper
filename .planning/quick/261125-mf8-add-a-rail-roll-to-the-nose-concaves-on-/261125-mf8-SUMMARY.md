---
base: 2fa001ed3901a6fa4fd7c35dcf240c22926359f6
worktree: /Users/kontoes/Code/shaper/.claude/worktrees/agent-a1986e92abb8dacb2
branch: worktree-agent-a1986e92abb8dacb2
phase: quick-261125-mf8
plan: 01
subsystem: bottom contours, .brd import
tags: [bottom, rail-roll, nose-concave, brd-import, rails]
status: complete
requires:
  - spike 005 (nose fit, Edge Roll trial) and spike 006 (a wider nose rail cannot draw the blend)
provides:
  - a Rail Roll slider on the Teardrop Nose Concave, the Blended Nose Concave and the Slight Single Concave Entry
  - the Rail Roll in the bottom's one foam-off number (litres, drawings, DATA, print, .brd export, RAILS' nose rail)
  - Open a board file tries the nose once more with a Rail Roll on a file still over 1 mm
affects:
  - BOTTOM's panel and DATA, RAILS' nose rail, VOLUME's litres, the 3D board, the .brd export, the printed sheets
tech-stack:
  added: []
  patterns:
    - an optional cut key that reads 0 when absent and is tidied away at 0 (tidyRailRoll), so saved boards are byte-for-byte unchanged
    - the fast scorer calls the same along/across functions the slow maths multiplies (no copy of the formula)
key-files:
  created:
    - lib/geometry/bottom-rail-roll.test.ts
    - e2e/bottom-rail-roll.spec.ts
  modified:
    - lib/geometry/bottom.ts
    - lib/geometry/bottom-print.ts
    - lib/geometry/design.ts (comments only)
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - components/design/design-store.tsx
    - components/bottom/bottom-copy.ts
    - components/bottom/bottom-copy.test.ts
    - components/bottom/bottom-controls.tsx
    - components/bottom/bottom-data.tsx
    - e2e/bottom-panel.spec.ts
    - lib/geometry/brd-bottom.ts
    - lib/geometry/brd-bottom.test.ts
    - lib/export/brd-fit-preview.ts
    - lib/export/brd-fit-preview.test.ts
    - lib/export/brd-look.test.ts
decisions:
  - "The nose retry keeps spike 005's bar: 0.25 mm closer when it renames the nose, any gain when the nose already is a Blended Nose Concave (CONTEXT D-05 as amended; Finding A)"
  - "No GUIDE card: BOTTOM's GUIDE has one card per cut, not per control (D-07); draft words below for the founder"
  - "Browser gates re-run on PW_PORT=3137 because another agent's worktree was running its own suite on 3127"
metrics:
  duration: about 70 minutes of work, plus about 40 minutes of gate runs
  completed: 2026-11-25
estimate:
  tokens: 260000
  tasks: 3
actuals:
  tokens: 17300    # chars/4 over the added lines of the realized diff against BASE (69,191 characters)
  tasks: 3
  commits: 3
---

# Phase quick-261125-mf8 Plan 01: Rail Roll on the nose concaves, and fitted from a .brd — Summary

BASE: 2fa001ed3901a6fa4fd7c35dcf240c22926359f6

**One line:** BOTTOM's three nose concaves get a Rail Roll slider that curves the bottom up from the concave's edge to the
rail (full from the nose tip back to Deepest At, gone by End). Everything that reads the bottom follows it. Open a board
file now tries it on a nose that is still more than 1 mm off, so 92Log, Scoop-Noserider and testLB open closer and keep
their roll.

## What is new on BOTTOM

- **The slider.** Pick a Teardrop Nose Concave, a Blended Nose Concave or a Slight Single Concave Entry on the NOSE card:
  a **Rail Roll** row now sits right under **Off Rail**. It opens at 0 and runs to 1/2". Like a Depth, it steps 1/64" and
  reads as a reduced fraction (`11/64"`), and in Metric it steps and reads 0.1 mm. Its left hint reads *Level to the rail*
  and its right hint is the slider's top (`1/2"`, `12.7 mm`). No other cut shows it: not the Reverse Vee Nose, not the
  Rolled Belly Entry, and not a centre or tail cut.
- **What it does to the board.** Above 0, the bottom outside the concave's edge (the line Off Rail already marks) curves up
  to the rail, by the Rail Roll's amount at the rail itself. The curve is the Rolled Vee's own at its Smoothness 60, a
  rounded roll rather than a straight chine. The full roll stands from the nose tip back to the concave's Deepest At, ahead of
  the concave's Start too (*"all the way"*), and fades to nothing by its End. Nothing changes inside the concave's edge, and
  nothing at the stringer.
- **What follows it, with no formula of its own.** The roll is a lift, like a vee or a belly. So the cross-section drawing
  bends up at the rail. DATA's Rail lift column reads the roll from the nose tip back. The litres fall: the Shortboard with a
  Blended Nose Concave reads 29.359 L with no roll, 29.303 L at 1/8", 29.246 L at 1/4" and 29.133 L at 1/2". The 3D board and
  the .brd export carry it. **RAILS' nose rail is thinner by the roll** (Shortboard 1.584" to 1.459" at 1/8"). The floor
  warning guards it too: on the Shortboard a 1/2" roll on any of the three nose concaves is flagged at the nose, while 1/8"
  and none are not.
- **On paper.** A nose concave's printed line names the roll only when there is one:
  `Nose: Blended Nose Concave 3/16", 2" to 36" from the nose, deepest 12"; 1 5/8" off the rail, 1/8" rail roll.`
  (On the Teardrop the roll comes before `closes to a point`.) With no roll the line is exactly as it was.
- **What stays.** Every saved board, every preset and every GUIDE picture is exactly as it was. A board with no roll stores
  no new key, a roll dragged back to 0 leaves none, and the board reader drops a roll that is not a sensible number or sits
  on any other cut. There is no database change and no migration.

## What is new in Open a board file

Once the usual fit and its polish are done, a file whose bottom is **still more than 1 mm off at its widest** has its nose
tried once more as a Blended Nose Concave (1/16" deep, with a 1/8" Rail Roll to start). The three cuts are then polished
again with the roll free to move, and the answer is kept only when it is really closer (see Finding A for the bar). The
roll is never part of choosing the cut names, never part of the Tri-Plane or Spiral Vee rules, and never part of deciding
whether rails or bottom are read first. In the preview's BOTTOM table, the nose's Across cell names it, e.g.
`Off Rail 1 5/8" · Rail Roll 11/64"`, and the board that opens keeps it.

## The founder's twelve files through the real import (D-09)

Widest / typical miss in mm. Open time is the fastest of three. "identical" means the fitted cuts, every measured section
value and the fitted rails all matched (one digest), not just the rounded figures.

| File | Bottom before | Bottom after | Rails before | Rails after | Cuts before | Cuts after | Open before | Open after |
|---|---|---|---|---|---|---|---|---|
| 6'10-Widepoint-Fwd-Egg | 0.77 / 0.21 | identical | 1.67 / 0.49 | identical | Flat · Flat · Panel Vee 6/64" | same | 0.50 s | 0.58 s |
| 6'2-Round-Tail---Double-Concave | 0.55 / 0.17 | identical | 2.08 / 0.42 | identical | Teardrop Nose Concave 4/64" · Deep Single Concave 8/64" · Double Concave Exit 8/64" | same | 1.87 s | 2.24 s |
| 6'4-Double-Wing-Groveler | 0.54 / 0.12 | identical | 1.20 / 0.43 | identical | Flat · Deep Single Concave 7/64" · Flat | same | 0.82 s | 0.92 s |
| **92Log** | 1.58 / 0.44 | **1.28 / 0.38** | 1.65 / 0.44 | 1.64 / 0.45 | Flat · Continuous Belly / Rolled Mid 32/64" · Rolled Vee 28/64" | Blended Nose Concave 4/64", Rail Roll 11/64" · Continuous Belly / Rolled Mid 32/64" · Rolled Vee 27/64" | 1.04 s | 2.49 s |
| Fryer-5'7-Squash-Flyer-Twin | 0.49 / 0.21 | identical | 0.93 / 0.30 | identical | Blended Nose Concave 4/64" · Deep Single Concave 12/64" · Double Concave Exit 7/64" | same | 1.76 s | 2.22 s |
| JFS_BigTwin | 0.70 / 0.32 | identical | 1.42 / 0.35 | identical | Flat · Flat · Panel Vee 7/64" | same | 0.55 s | 0.53 s |
| SAtri | 0.40 / 0.06 | identical | 2.52 / 0.32 | identical | Flat · Flat · Spiral Vee 8/64" | same | 1.12 s | 1.32 s |
| SAtwin | 0.39 / 0.06 | identical | 2.52 / 0.32 | identical | Flat · Flat · Spiral Vee 8/64" | same | 1.10 s | 1.28 s |
| **Scoop-Noserider** | 1.18 / 0.36 | **1.01 / 0.37** | 2.70 / 0.78 | 2.20 / 0.68 | Blended Nose Concave 22/64" · Continuous Belly / Rolled Mid 19/64" · Panel Vee 6/64" | Blended Nose Concave 22/64", Rail Roll 19/64" · Continuous Belly / Rolled Mid 20/64" · Panel Vee 4/64" | 1.07 s | 2.55 s |
| mid | 0.56 / 0.09 | identical | 1.76 / 0.42 | identical | Blended Nose Concave 32/64" · Flat · Panel Vee 12/64" | same | 1.41 s | 1.72 s |
| quadtesting | 6.43 / 0.82 | identical | 55.49 / 2.08 | identical | Flat · Continuous Belly / Rolled Mid 32/64" · Panel Vee 32/64" | same (the retry is tried, nothing kept) | 1.03 s | 1.50 s |
| **testLB** | 2.08 / 0.26 | **1.45 / 0.21** | 5.01 / 0.80 | 4.98 / 0.72 | Teardrop Nose Concave 24/64" · Flat · Flat | Blended Nose Concave 24/64", Rail Roll 7/64" · Flat · Flat | 2.76 s | 3.61 s |
| Total | | | | | | | 15.0 s | 21.0 s |

**What moved:** 92Log, Scoop-Noserider and testLB, each now opening with a Blended Nose Concave and its Rail Roll (11/64",
19/64", 7/64"). The other nine open identically. Every miss figure, every cut list and every rail figure equals spike 005's
table and the plan's to the hundredth. **The board that opens carries the roll the preview shows on all three:** the
measuring script printed no `!!` line. (On spike 005's trial code all three opened without their roll, because the board
reader dropped a key it did not know. Task 1 taught it the key.)

**Open times, read with care.** The "after" run was taken while another agent's browser suite was running on the same
machine (load average 15 to 31; see Deviations), and the "before" run was taken at the start on a quieter machine. The three
nose files take 0.85 to 1.48 s longer here (D-06 allows about 2.5 s). Of the eight files under 1 mm, five are within 0.2 s;
three are 0.31 to 0.46 s slower (Round Tail, Fryer, mid). On those eight files the only new work is one extra check of the
widest miss after the polish, plus three empty-slot tests per point in the scorer, so I read the extra as machine load and not
the code. Even so, it is the planner's "about 0.2 s" exceeded as measured, so it is worth a re-time on a quiet machine after
the merge.

## The app's own boards that prove it (measured on this build)

Through the real import, a board written with a Blended Nose Concave at its starting stations, 3/16" deep, with a 1/4" Rail
Roll (`out/after-roundtrip.txt`):

| Board | Before this task | Now |
|---|---|---|
| Mid-length | Blended Nose Concave + Continuous Belly, no roll, 1.35 / 0.16 mm | Blended Nose Concave 0.191", Rail Roll 0.226", Off Rail 1.75" + Continuous Belly 0.065"; 0.36 / 0.05 mm; the opened board's nose carries 0.226" |
| Fish | Blended Nose Concave + Continuous Belly, no roll, 1.20 / 0.21 mm | Blended Nose Concave 0.192", Rail Roll 0.211", Off Rail 1.73" + Continuous Belly 0.063"; 0.36 / 0.07 mm; the opened board's nose carries 0.211" |

The polish alone on sections that are exactly the written Shortboard bottom (`out/after-exact.txt`):

- a 1/4" roll: grid answer Rolled Belly Entry + Deep Single Concave, 3.22 / 0.45 mm; polished Blended Nose Concave 1/16",
  Rail Roll 0.251" + Deep Single Concave 0.112", 0.47 / 0.07 mm;
- a 1/16" roll: grid answer 0.71 mm (under the 1 mm gate, so no retry); polished Blended Nose Concave 0.191" + Continuous
  Belly 1/16", no roll, 0.56 / 0.08 mm.

## For the founder to rule on or mark up

### Finding A: the 0.25 mm bar, as built

Built as spike 005 measured it and as CONTEXT D-05 was amended: the retry must be **0.25 mm closer** (widest plus typical)
**when it changes the nose's name** (92Log's Flat Entry and testLB's Teardrop both became a Blended Nose Concave). It may be
**any amount closer when the nose already was a Blended Nose Concave** (Scoop-Noserider), as the polish itself is. The other
reading, 0.25 mm asked of every retry, leaves Scoop-Noserider exactly as it was (1.18 / 0.36, rails 2.70 / 0.78; its gain is
0.16 mm) and changes nothing on 92Log or testLB. That is one condition in `polishBrdBottom` if you prefer it.

### First-draft words on the screen and on paper (yours to change)

- The row label: **Rail Roll**. Its left hint: **Level to the rail**. Its right hint is the slider's own maximum.
- The printed line, only above 0: after the off-the-rail figure, a comma and the roll with the words *rail roll*, e.g.
  `1 5/8" off the rail, 1/8" rail roll.` On the Teardrop the roll comes before `closes to a point`.
- The floor warning's fix when the rail form holds on a cut that carries a roll: **Lower the Depth or the Rail Roll, or move
  the cut away from the tip.** (Today's sentence, *Lower the Depth, or move the cut away from the tip.*, is kept everywhere
  else, because lowering the Depth alone does nothing when the roll is what thins the rail.)
- The preview's Across cell for a fitted nose concave with a roll: `Off Rail 1 5/8" · Rail Roll 11/64"`.

### The GUIDE: no card added

BOTTOM's GUIDE has one card per **cut** (eighteen names and the channels), not one per control, so D-07 adds no card. Your
GUIDE words page and every GUIDE picture are untouched. If you want the three nose-concave cards to mention the roll, here is
a first draft in the house style:

- *What it does:* "Rail Roll: the bottom outside the concave's edge curves up to the rail, by the amount you set at the rail,
  where a concave alone leaves it level. It softens the nose rail the way a noserider's turned-up edge does: full from the
  nose tip back to Deepest At, gone by End."
- *How to shape:* "Mark the concave's edge first, Off Rail in from the rail, and cut the concave to that line. Then roll the
  rail into it: nothing off at the line, the Rail Roll's amount off at the rail, and blend the two."

### A Rail Roll on a concave with Depth 0 draws nothing

A nose concave set to Depth 0 is not on the board, so its Rail Roll takes no foam either (the slider still shows and keeps
its figure). If you want a roll that stands without a concave, that is a separate change.

### A clause for CLAUDE.md (proposed, not edited)

In Rule 2's BOTTOM depth exception, after "a cut's, the channels'": **"and a nose concave's Rail Roll"**. The roll steps and
reads exactly as a Depth does, through `formatBottomDepth`.

## What it does not fix (Finding B, measured on the app's own boards)

1. A small roll does not come back as one: the Mid-length written with 1/8" or 3/16" opens with a centre Continuous Belly
   standing in for it (0.69 and 0.81 mm off), because that is already under the 1 mm gate.
2. A board that does come back with its roll usually keeps a leftover 1/16" centre cut (the belly or single that the name
   choice read the roll as), which the polish cannot take below 1/16".
3. The Longboard is read rails first, and most of its roll hides in the rail (0.91 mm, no roll kept).
4. A Slight Single Concave Entry with a roll came back as a Rolled Belly Entry (1.76 mm).
5. The Mid-length written 1/4" deep with a 1/4" roll came back without one (1.15 mm): the single retry from 1/16" lost what
   the fitted nose had.

Also out of scope (CONTEXT): any RAILS change; the concave's own across-curve (Scoop's next 0.2 mm); the tail belly and
Depth past 1/2"; a roll on any other cut; pushing.

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 1, a test claim too strong] The centre rail with a roll is not always the same object.**
- Found during: Task 1 (GREEN). The plan's measurement covered the Blended Nose Concave on the Shortboard, Mid-length and
  Longboard. On the Fish, and for the Teardrop and the Slight Single Concave Entry, the roll's fade still reaches RAILS'
  centre station, so the centre rail is lowered by that small lift (e.g. 0.05 mm on the Shortboard).
- Fix: the test now checks the rule as it is: the centre rail is the same rail where the lift there is 0, and lowered by
  exactly that lift where the fade still reaches. The tail rail is always the same. No code change. Commit 5509918a.

**2. [Rule 3, blocking] The worktree could not start its own dev server.** The worktree had no `node_modules`, so Turbopack
could not find Next.js (`Could not find the Next.js package`). Fixed with the project's own recipe,
`rsync -a --link-dest=<main>/node_modules <main>/node_modules/ <worktree>/node_modules/` (hardlinks, no extra disk, main
untouched). Nothing committed (node_modules is ignored).

**3. [Rule 3, test isolation] A port shared with another agent.** Another agent's worktree
(`.claude/worktrees/agent-a2733b7d987e8a9b0`, a different session) was running its own browser suite with `PW_PORT=3127`,
the port this task was given. The suite reuses any server already on its port, so some of my early 3127 runs may have been
served from that worktree. All three browser gates were therefore re-run on `PW_PORT=3137`, a port nobody else held, where
the server could only be this worktree's own. Those results are the ones below.

**4. [Rule 1] Two of the new checks timed out under the whole suite's load.** Run alone they take seconds, but with the
whole suite running at once two of them took 6.6 and 11.7 s against vitest's 5 s default. They now use the 60 s limit the
board-file suites use (commit 321173c7). This was a third, small commit. The plan asked for one commit per task, and Task 3's
docs commit is the orchestrator's.

**5. Android's first run of the new spec failed while the server compiled cold** (the home page's preset card did not show
within 90 s). Run again straight after, it passed, and it has passed on every run since.

### Not done here by instruction

- The SUMMARY and the re-packed `261125-mf8-scripts.tar.gz` are left **uncommitted** for the orchestrator, as its prompt
  says, overriding the plan's "commit the SUMMARY and the archive".
- `npm run build` and `npm run test:e2e:prod` cannot run in a worktree. **e2e:prod is the orchestrator's, after the merge.**

## Gates (each run in its own call, read to its exit line)

- `npm test`: the first full run gave 14061 passed, 4 failed, 2 skipped in 241 files (863 s). All four failures were time
  limits under load: my two new cases (now with a 60 s limit, see Deviation 4) and two existing files this task does not touch,
  `components/template/build-brd-overview-pdf.test.ts` (6.3 s) and `lib/models/surface-report.test.ts` (6.1 s). Re-run alone,
  the three files gave **414 passed**. So these were load flakes: both results are reported here.
- `npx tsc --noEmit`: exit 0. `npx eslint` on all eighteen touched source and test files: exit 0.
- Browser, `PW_PORT=3137` (see Deviation 3):
  - `bottom-rail-roll`, `bottom-depth-fine`, `bottom-metric` on desktop and android: **6 passed** (57 s), exit 0.
  - `bottom-panel` on desktop: **14 passed** (1.7 min), exit 0.
  - `brd-fit-preview`, `brd-home-weight`, `board-file` on desktop, iphone and android: **100 passed, 47 skipped** (the
    specs' own project rules), 8.8 min, exit 0. The iPhone .brd specs did not stall at "Reading the file…" here.
  - (The same three runs on 3127 earlier also passed: 6, 14, and 100 passed with 47 skipped.)
- Protected files: `git diff --quiet BASE -- lib/geometry/__fixtures__ e2e/desktop-baseline.spec.ts-snapshots db drizzle
  lib/db lib/geometry/presets.ts lib/geometry/rail-bands.ts lib/geometry/brd-rails.ts components/bottom/bottom-guide-words.ts
  components/bottom/bottom-guide.tsx components/bottom/bottom-cartoon.tsx CLAUDE.md`: exit 0 (nothing changed).
- `git diff --name-only BASE` lists only the plan's `files_modified`: the eighteen code and test files, plus the re-packed
  archive (modified, uncommitted). The SUMMARY is new and untracked. Both are left for the orchestrator.

### Test lines removed since BASE (every one, quoted)

`git diff -U0 BASE -- '*.test.ts' '*.spec.ts' | grep -E '^-[^-]'` printed exactly these eight lines:

```
- * At, End, Depth; the Spiral Vee Vee Lift; Smoothness. A flat none.
-  "Teardrop Nose Concave": "single",
-  "Blended Nose Concave": "single",
-  "Slight Single Concave Entry": "single",
-          if (section === "nose" && kind === "single") {
-import { DEFAULT_BOTTOM, keepStationsInOrder, resolveBottom, resolveCut, startingCut, storeCutStation } from "../geometry/bottom";
-import { inchesToMm, mm, mmToInches } from "../geometry/units";
-import { brdFitLook } from "./brd-fit-preview";
```

The first five are `e2e/bottom-panel.spec.ts`: the comment line beside the table, reworded to add the Rail Roll; the three
nose concaves' `KIND_OF` lines, now pointing to the new `noseSingle` kind; and the tick-box condition that reads that kind.
The last three are `lib/export/brd-look.test.ts` import lines that gained names. Nothing else was removed.

## Checks for the founder (after the merge, on localhost or the live site once you say to push)

1. On BOTTOM pick a Blended Nose Concave. A Rail Roll slider sits right under Off Rail at 0. Drag it to 1/4". The
   cross-section's bottom should curve up from the concave's edge to the rail, DATA's Rail lift should fill from the nose tip
   back, the litres should fall, and on RAILS the nose rail should be thinner by the roll.
2. Open 92Log.brd, Scoop-Noserider.brd and testLB.brd with Open a board file. The preview's BOTTOM table should read Off Rail
   and Rail Roll in the nose's Across cell. Opened as a board, BOTTOM's NOSE should be a Blended Nose Concave with a Rail
   Roll of about 11/64", 19/64" and 7/64".

## Commits

- 5509918a: feat(quick-261125-mf8): BOTTOM: a Rail Roll on the three nose concaves curves the bottom up from the concave's edge to the rail
- ced2b27f: feat(quick-261125-mf8): opening a .brd whose nose turns up outside its concave now tries a Rail Roll, and opens closer on three longboard files
- 321173c7: test(quick-261125-mf8): give the Rail Roll's own checks a generous time limit

## The measuring archive

`261125-mf8-scripts.tar.gz` is re-packed with `scripts/`, `out/` (now also this worktree's `before.json`, `after.json`, the
two run logs, `table.txt`, `after-roundtrip.txt`, `after-exact.txt`, `after-litres.txt`, `after-rails.txt`) and `README.txt`.
Its listing holds no .brd file. The sample files were read where they are in ~/Downloads and never copied.

## Self-Check: PASSED

- FOUND: lib/geometry/bottom-rail-roll.test.ts, e2e/bottom-rail-roll.spec.ts, this SUMMARY, the re-packed archive (29
  entries, no .brd).
- FOUND: commits 5509918a, ced2b27f, 321173c7 on worktree-agent-a1986e92abb8dacb2.
