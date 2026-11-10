---
phase: 17-bottom-contours
plan: 12
subsystem: bottom-screen
status: checkpoint
tags: [bottom, wings, saving, board-file, undo, rack, old-boards]
requires:
  - 17-01..17-06 (the bottom's maths in `lib/geometry/bottom`, with `wingRule` already in the stored bottom)
  - 17-08..17-10 (the BOTTOM screen, its rows, VIEWER and DATA)
  - 17-11 (the GUIDE tab, merged as 82ec6c17)
provides:
  - the WINGS row on BOTTOM, shown only on a board with a wing — where Off Rail is measured from
  - the bottom kept with the board — in a save, in a board file, in Undo and Redo, on the Board Rack's cards
  - a read-only saved-boards report (`--bottom-report`) the founder runs before this ships
affects:
  - components/bottom (one new row at the top of the side panel)
  - components/design/design-store.tsx (what a save writes and what opening a board reads)
  - lib/models (the saved board's shape, board files, rack cards, the report)
tech-stack:
  added: []
  patterns:
    - one optional field on the saved board, written only once a board has a bottom, read forgivingly part by part
    - a report that reads rows already fetched and prints ids and litres only
key-files:
  created:
    - e2e/bottom-wings.spec.ts
    - e2e/bottom-saving.spec.ts
    - lib/models/bottom-report.ts
    - lib/models/bottom-report.test.ts
    - .planning/phases/17-bottom-contours/pictures/17-12-wings-and-saving.png
    - .planning/phases/17-bottom-contours/pictures/17-12-pictures-source.tar.gz
  modified:
    - components/bottom/bottom-controls.tsx
    - components/bottom/bottom-copy.ts
    - components/bottom/bottom-copy.test.ts
    - components/bottom/bottom-top-view.tsx
    - components/design/design-store.tsx
    - components/design/design-store.test.ts
    - components/design/board-lock-scope.test.ts
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - lib/models/board-file.test.ts
    - lib/models/rack-models.ts
    - lib/models/rack-models.test.ts
    - scripts/check-saved-boards.ts
decisions:
  - "Narrowest outline is the rule every winged board starts on; Natural outline, before the wing is the other answer. A board with no wing never sees the row."
  - "The bottom is written into a save only once it is no longer the flat opening bottom, so a board never touched on BOTTOM saves key for key as it did before."
  - "A saved board with no bottom opens flat and is not rewritten; a damaged bottom is read part by part and never rejects a board or breaks the rack."
  - "The saved board's version number stays 5, and nothing in the database changed."
  - "The saved-boards report prints ids and litres only, never changes the check's own result, and is run by the orchestrator with the founder — never by the build."
metrics:
  duration: about 2 h 25 min on the clock (2026-11-09 22:08 to 2026-11-10 00:34 UTC), most of it waiting on browser and unit runs on a busy machine
  completed: 2026-11-10 UTC (Tasks 1 and 2; Task 3 is the founder's look)
actuals:
  tokens: 27700
  tasks: 2
  commits: 3
---

# Phase 17 Plan 12: WINGS on BOTTOM, and the bottom saved with the board — Summary

On a winged board BOTTOM now asks where Off Rail is measured from, and whatever is cut on the bottom is kept with the
board — in a save, a board file, Undo and Redo and the Board Rack — while every board saved before opens flat and
unchanged.

## What changes for the founder

- **A WINGS row, only on a board with a wing.** It is the first row of BOTTOM's side panel. Its heading echoes the wing
  — `3/16" wing at 7 1/2"`, or `wings at 7 1/2" and 4 1/2"` on a board with two — and under it one menu, **Measure Off
  Rail from**, with two answers.
- **Narrowest outline** is what every board starts on. Its note: *"The real rail behind the wing, and that narrower
  line carried forward past it — so no cut ever crosses the rail."*
- **Natural outline, before the wing** is the other. Its note: *"The curve you drew before the wing. Behind the wing it
  sits outside the real rail, so a cut can run out through the step."*
- **What the answer moves.** Every cut's Off Rail edge behind the wing. On the Fish with an Extending Single Concave 2"
  off the rail, the edge at the fins sits 4 15/16" off the stringer on Narrowest and 5 1/8" on Natural, and DATA's
  layout marks move with it.
- **A board with no wing** shows no WINGS row at all, and nothing about its bottom changes.
- **A Metric shaper** reads `5 mm wing at 19.1 cm` — the step in millimetres, where it sits in centimetres.
- **The bottom is kept with the board.** Save a board with a cut and it reopens with every cut, every slider, the
  channels and the wing rule exactly as left. **Save board as file…** carries it, and **Open a board file…** brings it
  back. Undo and Redo walk a cut pick, a slider drag, a channel count and the wing rule like any other change. The
  Board Rack's cards read the litres with the bottom cut out.
- **Old boards are untouched.** A board saved before today has no bottom in its save; it opens flat with the litres it
  always read, and opening it does not rewrite it. A board you never touch on BOTTOM saves exactly as it did before —
  nothing new is added to it.
- **Nothing in the database changed.** No migration, no new column. There is nothing to run on production for this.
- **A report to run before this ships.** `scripts/check-saved-boards.ts` takes a new `--bottom-report` flag that reads
  every saved board and prints, for each, whether it opens, whether it has a cut, and its litres beside the litres it
  reads without a bottom. It prints ids and litres only. The build never ran it; see the Pending section below.

## Tasks

| Task | What | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | The WINGS row on a winged board, its words, and the rule reaching the drawings and DATA | `4f06fd3d` | `components/bottom/bottom-controls.tsx`, `bottom-copy.ts`, `bottom-copy.test.ts`, `bottom-top-view.tsx`, `components/design/design-store.tsx`, `board-lock-scope.test.ts`, `e2e/bottom-wings.spec.ts` |
| 2 | The bottom saved with the board, in board files, on rack cards; old boards open flat; the saved-boards report | `8065bff7` | `lib/models/design-snapshot.ts`, `design-snapshot.test.ts`, `board-file.test.ts`, `rack-models.ts`, `rack-models.test.ts`, `bottom-report.ts`, `bottom-report.test.ts`, `scripts/check-saved-boards.ts`, `components/design/design-store.tsx`, `design-store.test.ts`, `e2e/bottom-saving.spec.ts` |
| 3 | The founder's look (checkpoint) | pending | `pictures/17-12-wings-and-saving.png`, `pictures/17-12-pictures-source.tar.gz`, this summary |

## Verification

Every run below finished before this was written. The machine was busy throughout (the founder's own browser and other
work), which shows in the browser runs.

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` (after each task) | exit 0 |
| `npm run lint` (after each task) | exit 0 — one warning that was there before (`lib/db/import-designs-action.test.ts`, an unused name) |
| Task 1: `npm test -- --testTimeout=120000` (whole unit suite) | 186 files passed, **2 failed — exit 1** (748 s): 11,391 passed, 2 failed, 2 skipped. Both failures were a test running past its two minutes under load, in files this plan does not touch (`finished-rail.test.ts`, `shaping-bay.test.ts`). |
| Those two files alone | 180 passed — exit 0 (369 s). Load, not a fault. |
| Task 1: `e2e/bottom-wings.spec.ts` and `e2e/wings.spec.ts` on the computer and both phones, port 3312 | 59 passed, 97 skipped (tests written for one profile only), 0 failed — exit 0 (9.8 min) |
| Task 2, written tests-first: the new tests before the code | 13 failing and `bottom-report.test.ts` unable to load — exit 1, as it should be |
| Task 2: `npx vitest run lib/models` | 19 files, 681 passed — exit 0 |
| Task 2: `npm test -- --testTimeout=120000` (whole unit suite, final code) | 189 files, 11,423 passed, 2 skipped — exit 0 (283 s) |
| Task 2: the plan's browser line — `bottom-saving`, `board-file`, `undo-redo`, `open-board-reload` on all three profiles — first run | 54 passed, 19 skipped, **2 failed — exit 1** (8.7 min). One was mine: the iPhone's Undo walk in `bottom-saving.spec.ts` (fixed, see Deviations 11). The other was `undo-redo.spec.ts:251` on the computer — a page load timing out. |
| The same line again, with the final code | 54 passed, 19 skipped, **2 failed — exit 1** (9.0 min). Every `bottom-saving` test passed on all three profiles. The two failures were page loads on tests this plan does not touch: `board-file.spec.ts:271` on the iPhone (still on Home after 5 s) and `undo-redo.spec.ts:251` on the computer (a page load cut off). |
| Those two tests alone, twice each, with a two-minute allowance (`--timeout=120000`) | 8 passed, 4 skipped, 0 failed — exit 0 (1.9 min) |
| `bottom-saving.spec.ts:188` (the Undo walk) and `undo-redo.spec.ts:251`, twice each on all three profiles | 7 passed, 4 skipped, **1 failed — exit 1** (3.9 min): the Undo walk passed six times of six; `undo-redo:251` failed once on its 30-second budget |
| End of task: `e2e/board-lock-screens.spec.ts` and `e2e/board-file.spec.ts` on the computer | 27 passed, 2 skipped, **1 failed — exit 1** (3.3 min): the 3D lock test (`board-lock-screens.spec.ts:942`), the known Phase 16 race the brief names |
| That 3D test alone, twice | 2 passed — exit 0 (44 s) |
| The picture run (scratch, port 3312) | 7 passed — exit 0 (2.1 min) |
| Nothing under `drizzle/` or in `lib/db/schema.ts` changed; `DESIGN_SNAPSHOT_VERSION = 5` | confirmed by `git diff` and one match |

**Said plainly:** the plan's four-spec browser line never came back with exit 0 as a whole run. Its recorded exit with
the final code is 1, from two page-load timeouts on tests this plan does not touch; both pass alone. `undo-redo.spec.ts:251`
loads six design screens and Home inside 30 seconds and does not open BOTTOM; on this machine it took 19–26 s warm and
33–41 s when the server had to build a page first, so it fails whenever it is the first to visit a page. An earlier
quick task (261017-vdh) recorded the same test needing the same two-minute allowance.

What the tests hold:

- **The row** appears only on a winged board; Narrowest is picked to start; each answer shows its own note; the heading
  echoes one wing or two, in inches and in Metric; picking Natural moves the cut's edge in the drawing and in DATA;
  a board with no wing shows no row and its drawing's caption reads as it always has; a locked board cannot change
  the rule, and a change of rule is one Undo step.
- **Saving:** a Spiral Vee, six channels and the Natural rule on a winged Fish come back exact after a reload and from
  the Board Rack; Undo and Redo walk a cut pick, a slider drag, a channel count and the wing rule; a board file written
  by the app carries the bottom and opens with it; a board saved before BOTTOM opens flat and nothing is added to it.
- **Old boards (each pinned by a unit test):** the version stays 5; a board never touched on BOTTOM saves key for key
  as before; a save with no bottom opens flat and is not rewritten; a bad bottom — a number that is not a number, a
  billion, an unknown cut name, five channels, a word where a number belongs — never rejects a board and never breaks
  the rack; each bad part falls back to flat on its own and the good parts are kept.
- **The report**, on made-up boards only: its counts, its one line per board, and its closing yes or no.

### Measured, for the founder

- **The wing the app adds:** "+ Add a wing" on TEMPLATE places a 3/16" wing 7 1/2" from the tail. Every figure here is
  off that wing on the Fish.
- **What Natural moves (Extending Single Concave, Off Rail 2"):** DATA's **Tail edge** column reads 4 5/8", 5 13/16"
  and 6 3/4" at 6", 12" and 18" from the tail on Narrowest, and 4 3/4", 6" and 6 15/16" on Natural. The section at the
  fins reads 4 15/16" off the stringer, then 5 1/8".
- **A board kept and reopened:** all 24 sliders and menus on BOTTOM read the same before leaving and after Continue
  This Board on the rack, and the two pictures of the TAIL card are identical dot for dot.
- **One slider drag, one Undo step — while the drag keeps moving.** The app folds a drag's moves into one step when each
  lands within half a second of the one before; that is its rule for every slider, not new here. On the test server
  BOTTOM redraws one Depth notch in 0.17–0.37 s on the computer. A 4-move drag came back in one Undo; a 12-move drag
  came back in two. On the iPhone profile three arrow presses never folded into one step (three tries of three). The
  live site's redraw speed was not measured — a production build cannot be made from this folder — so this is worth
  your thumb at the look or the UAT: drag a Depth slider slowly on a real phone and press Undo once.
- **The picture:** 5400 × 5927 dots.

## Deviations from Plan

### Followed a ruling instead of the plan

**1. The commit trailer.** The plan names a different trailer; the brief sets
`Co-Authored-By: Claude <noreply@anthropic.com>`, and every commit ends with that.

**2. One commit per task.** Task 2 is marked tests-first, which would be a test commit and then a code commit. Ruling 5
asks for one commit per task, so the tests and the code went in together as `8065bff7`; the failing run made before the
code is recorded in the table above.

**3. The report was written and tested but never run.** Ruling 2: the build names no environment file and runs nothing
against a database. The orchestrator runs it with the founder; see the Pending section.

### Raised for the founder — a plan figure that measured differently (ruling 8)

**4. The DATA column that moves is Tail edge, not Center edge.** The plan says picking Natural "changes the Center
edge's layout mark" with an Extending Single Concave. That cut is a TAIL cut, so the column that moves is **Tail
edge**; the test pins that, with the figures above.

**5. The wing in the heading is `3/16" wing at 7 1/2"`,** not the design page's example `1/4" wing at 11 1/2"`. The
words and the format are the design page's; the numbers are what "+ Add a wing" actually places.

**6. "One slider drag is one Undo step" holds only while the drag keeps moving** — see Measured. The test makes a
4-move drag on the computer (three tries allowed, for a busy test server), three arrow presses on Android, and a single
arrow press on the iPhone, where it does not check the folding. The fold itself is held by the unit tests of the undo
history. If a slow drag should always be one step, that is a change to the app's undo rule for every slider and a
decision for you.

**7. "Save, reopen from the rack" and "save as a file, open that file" could not be walked end to end in the browser
tests for a board with a bottom.** The practice rack keeps no saved boards and the browser suite has no database. What
is walked instead: the browser's own kept copy of the open board (the same writer and reader a save uses) through a
reload and through the rack's In Progress board, and a board file the app itself wrote. The signed-in save and a rack
card's file are held at unit level. A real signed-in save is the one for your own hand at item 2 of the look.

### Small things added or adjusted while building

**8. Two test files outside the plan's list were touched:** `components/bottom/bottom-copy.test.ts` (the WINGS words)
and `components/design/design-store.test.ts` (that a save writes the bottom only once it is cut, and that opening a
board without one gives the flat bottom). Tests only.

**9. [Rule 1 — a fault in my own test] `rack-models.test.ts`** first used a field name the rack's row does not have;
the type check caught it and it was corrected before the commit.

**10. On the phones the two-wing and Metric walk of `bottom-wings.spec.ts` is skipped;** it runs on the computer. The
row's presence, its start on Narrowest and the switch to Natural run on all three.

**11. [Rule 1 — a fault in my own test] The iPhone's Undo walk** first pressed the arrow three times and expected one
Undo step; on that profile the presses never fold (deviation 6). It now makes one press there.

**12. The saved bottom's number limits are generous outer limits,** not each slider's exact range, so a board from a
later build with a wider slider still opens. A number that is not finite, or absurdly large, still falls back to flat.

**13. The report carries one figure more than the plan lists:** each board's litres read without its bottom, beside its
litres as saved. "Today's litres" in the report therefore means this build reading the board with its bottom left out,
which is what the app on the live site reads for every board saved so far.

**14. The drawing's caption** (`Nose left · 5'8" · wing 3/16" at 7 1/2"`) is on the computer's layout; an upright phone
has no room for it and shows the heading in the WINGS row instead, as before.

## Known Stubs

None. The row, the save, the board file, the rack cards and the report are all wired to real data; nothing is a
placeholder.

## Threat Flags

None new. **T-17-07** (a crafted saved bottom): names, counts, runs and the wing rule are fixed lists; every number
must be finite and inside limits; each part falls back on its own and so does the whole field; tests feed it the
crafted values. **T-17-08** (re-saving an old board): no bottom is written unless the board has one, the version stays
5, and a key-for-key re-save test holds it. **T-17-09** (the report): ids and litres only, read-only, and never run by
the build. No new page address, sign-in path or file access was added.

## Saved-boards report (development branch): Pending — the orchestrator runs it with the founder

Not run by this build. The command forms are in the header of `scripts/check-saved-boards.ts`. What it prints: a first
line `bottom report: N saved boards; k open…; c with a cut; m whose litres differ from today's`, one line per board
(`<id>: opens · no cut — <litres> L (same as today)`), and a last line `every saved board opens flat, with the litres
it reads today: yes` — or `no — N to look at`. The flag never changes the check's own pass or fail.

## Founder's look: Approved (2026-11-09)

The founder, on the checkpoint card with the picture: *"Approved — merge it"* He kept the WINGS heading as built (the step's size, then where it sits) and will check that one slow slider drag is one Undo step on his own phone at go-live, with the drag-speed check. Merged as 8ca00e9e.

**The picture:** `.planning/phases/17-bottom-contours/pictures/17-12-wings-and-saving.png` (5400 × 5927 dots; every
panel is the running page from this build's own test server). Its makings are in
`pictures/17-12-pictures-source.tar.gz`.

On it: (1) the winged Fish with an Extending Single Concave on Narrowest outline; (2) the same on Natural outline,
before the wing; (3) the tail's corner six times life size, Narrowest beside Natural, the concave's edge moved;
(4) DATA's layout marks for both, full size; (5) the menu open, and the row at full size on each answer; (6) a board
with two wings; (7) the Shortboard, no wing, no WINGS row; (8) the Fish for a Metric shaper; (9) the heading for two
wings, and in Metric for one and two; (10) an upright phone on each answer; (11) a Fish with a Spiral Vee, six channels
and the Natural rule waiting on the Board Rack; (12) its TAIL card before leaving and after Continue This Board, with
its WINGS row.

What to look for:

1. The WINGS row appears only on a winged board, Narrowest first, the note saying what each rule means (D-19).
2. A board you save with a bottom reopens with every cut exact; a board file carries it.
3. The report: every saved board on the development branch opens, none has a cut, and every litres figure is what the
   app reads today — so nothing a shaper saved changes when this ships.

Type "approved", or describe what should change.

## Self-Check: PASSED

- Found: `e2e/bottom-wings.spec.ts`, `e2e/bottom-saving.spec.ts`, `lib/models/bottom-report.ts`,
  `lib/models/bottom-report.test.ts`, `pictures/17-12-wings-and-saving.png`, `pictures/17-12-pictures-source.tar.gz`.
- Found: commits `4f06fd3d` and `8065bff7` on this branch, on top of `c2b6192d`.
- No loose script under `.planning/`; the picture's makings are inside the archive only.
- `STATE.md` and `ROADMAP.md` were not touched.
