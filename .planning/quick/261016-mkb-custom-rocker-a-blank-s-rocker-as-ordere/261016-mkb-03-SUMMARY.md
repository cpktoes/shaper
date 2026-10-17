---
phase: quick-261016-mkb
plan: 03
status: complete
subsystem: rocker blank picker, order form, phone screen tiles
tags: [custom-rocker, saved-blanks, pick-a-blank, order-form, screen-tiles, us-blanks-notation]
requires:
  - phase: quick-261016-mkb plan 01
    provides: withCustomRocker, orderedTipRockers, customPrintedStations, blankDisplayLines/Name, blankStarIdentity, sameRockerSpec, rockerSpecOf, pickBlank(record, placement, rocker?), user_blanks
  - phase: quick-261016-mkb plan 02
    provides: useSavedBlanks (mounted around the BLANK section), the Customize Rocker popup, the BLANK button's rocker line, naturalRockerRowLabel / customRockerRowLabel
  - phase: quick-261016-usz
    provides: stars on the shaper's account (the merged StarredBlanksProvider this plan stars through)
provides:
  - The shaper's saved blanks as cards in PICK A BLANK (savedBrowseRows, useBlankList's saved list)
  - Every card's rocker line, the pick button's whole-blank name, NAT Rocker over Custom Rocker, Remove
  - The order form's blank line through blankDisplayName
  - screenTileRocker and the ROCKER tile's second line
affects: [go-live of quick 261016-mkb (the orchestrator's and the founder's)]
actuals:
  tokens: 61000   # chars/4 over the realized code and test diff (23 files, +1,216 / -84), pictures excluded
  tasks: 3
  commits: 6
tech-stack:
  added: []
  patterns:
    - "A saved blank is judged like a maker's blank, on its own bent copy, beside the catalogue's list and never inside it"
key-files:
  created: []
  modified:
    - lib/geometry/blank-browse.ts
    - lib/geometry/blank-card-text.ts
    - lib/geometry/blank-reasons.ts
    - lib/geometry/screen-tiles.ts
    - components/rocker/use-blank-list.ts
    - components/rocker/blank-picker.tsx
    - components/rocker/blank-picker-dialog.tsx
    - components/rocker/blank-card.tsx
    - components/rocker/rocker-viewer.tsx
    - components/rocker/rocker-top-view.tsx
    - components/design/screen-tiles.tsx
    - components/summary/order-form.tsx
    - CLAUDE.md
key-decisions:
  - "P-20 measured: a saved card's natural row reads NAT Rocker, in both systems (Natural Rocker ran 3 dots past a 290-dot card in Imperial)"
  - "P-4 measured: the ROCKER tile's rocker line stays on every layout, an upright phone included — every tile picture is 46.0 dots tall with no blank, Natural, or a two-line note"
  - "A long custom note on a long-named blank can be cut off with '…' on the order form's Blank line once the board is slid off centre — measured and left for the founder's decision (P-24)"
requirements-completed: [QT-261016-mkb]
duration: "about 6h wall clock (06:15 to 12:15 local, 2026-10-17), two API outages and a 2.9h full browser suite inside it"
completed: 2026-10-17
---

# Quick 261016-mkb Plan 03: Saved blanks in Pick a Blank, and the blank's rocker named everywhere — Summary

**A blank you saved with a custom rocker is now a blank of your own in PICK A BLANK. It sits beside the maker's natural
blank, which stays listed. It's starred, marked Saved by you, and found, filtered, sorted and picked like any blank;
picking it puts its rocker back on the board. Every blank is now named with its rocker on its own line (`Natural` on a
maker's blank, the note on yours): on every card, on the order form's blank line, on the phone's ROCKER tile, and in
what a screen reader hears.**

## What a shaper can now do

- **Find their saved blanks in PICK A BLANK.** Each one is a card of its own, under ★ STARRED while starred (it's starred
  the moment it's saved), otherwise under FITS or WON'T FIT like any blank. It reads `US BLANKS · SAVED BY YOU`, with its
  note on the line under its name. The maker's natural 9'4"B is still listed, reading `Natural`.
- **Pick one.** The board gets that blank and its rocker, the BLANK button reads the note, and the button under it reads
  Edit Custom Rocker. Picking the maker's natural card instead is a plain pick and clears the custom rocker (D-10). Only
  the card actually on the board is marked Currently selected; the natural one and its saved twins never both are.
- **Search, filter and sort them.** The search finds a saved blank by its whole name, note included
  (`US Blanks 9'4"B -1/4"N18"`, or just the note). The nose-rocker range and sort read its nose as ordered: the printed
  tip plus the bend. A saved blank is judged on its own bent copy with the catalogue's own rule, and bending changes no
  thickness or width, so its verdict always equals its natural base's (P-19, unit-tested). The header's "of {m} blanks"
  counts the saved blanks long enough for the board. The button's count line and the flag's "closest blank that fits"
  still count only the makers' blanks.
- **Read a saved blank's numbers.** Its table reads Width, Thick, then **NAT Rocker** (the catalogue's printed figures)
  over **Custom Rocker** (as ordered). The upright card's Rocker fact and the sideways phone's one-line card read the
  tips as ordered.
- **Remove one.** A small `Remove` on the saved card asks once ("Remove this saved blank?" · Remove · Keep). Remove takes
  the blank and its star out of the list. A board already using it keeps its own copy and rocker. Remove and the star
  stay usable on a locked board (they change the list, not the board); picking does not.
- **See the blank named the same way everywhere (D-02):**
  - every card in the popup: `Natural` or the note under the name, and the pick button's accessible name says
    `Use US Blanks 9'4"B Natural`;
  - the order form's Blank line: `US Blanks 9'4"B Natural — centered`, or the note in its place, through the same helper
    ROCKER uses, so the two can't disagree;
  - the phone's ☰ ROCKER tile: `On a 9'4"B`, then `Natural` or the note on a second line, held upright or sideways. Its
    name says `ROCKER — On a 9'4"B Natural`;
  - the flag's offer: `Closest blank that fits: US Blanks 9'4"B Natural, 9'4"`;
  - what a screen reader hears for the ROCKER side view and the top view.
- **CLAUDE.md** records, beside Rule 2's other look-like-a-mistake cases ("Three printed-page specifics"), why the note
  stays in inches in Metric too.

## The pictures (`pictures/`, Slate; the Longboard in the US Blanks 9'4"B with two saved blanks)

| Picture | What to look for |
| --- | --- |
| `03-computer-picker-saved.png` | 1280×800, searched `US Blanks 9'4"B`: ★ STARRED · 2 holds the two saved cards (`+1/2"T`, marked Currently selected, and `-1/4"N18" +1/8"T36" +1/8"T18"`), each `US BLANKS · SAVED BY YOU`, NAT Rocker over Custom Rocker, Remove; FITS THIS BOARD · 1 holds the natural 9'4"B reading `Natural`. The header says `3 of 67 blanks`. |
| `03-computer-picker-upright.png` | The same as Upright cards: each saved card's Rocker fact reads as ordered (`4 1/2" nose · 3 3/4" tail` for the three-change blank, against the natural `4 3/4" nose · 3 1/2" tail`). |
| `03-iphone-picker-saved.png` | iPhone 14 upright: the `+1/2"T` card whole: name, note, Saved by you, the drawing, the four-row table, Remove. |
| `03-pixel7-sideways-picker.png` | Pixel 7 held sideways: the narrow cards with the note on its own lines (the long note wraps), the length and litres under the name (see the card fix below). |
| `03-computer-order-form.png` | The Summary's Shaper Use Only box: `BLANK: US Blanks 9'4"B -1/4"N18" +1/8"T36" +1/8"T18" — centered`. |
| `03-iphone-tiles.png` | The ☰ sheet on an upright iPhone: ROCKER reads `On a 9'4"B` / `+1/2"T`; every tile's drawing the same size as the others. |
| `03-pixel7-sideways-tiles.png` | The sheet on a Pixel 7 held sideways: one row of six, ROCKER with its second line. |

The scripts that shot them are archived in `pictures/shoot-source-03.tar.gz`; no loose script remains.

## For the founder to confirm or overrule (planner's choices, with what was measured)

- **P-4: the ROCKER tile's rocker line shows on an upright phone too.** Measured by the browser test on all four phone
  sizes. Every one of the six tile pictures stayed **46.0 dots tall** in all three states: no blank, `Natural`, and a
  three-change note (`+1/2"N +1/8"N18" +1/4"T`, which wraps to 2 lines). Only the ROCKER tile itself grows:
  - iPhone upright 390×664: 117 wide; 100 tall with no blank, 118 with `Natural`, 132 with the note;
  - Android upright 412×839: 124 wide, 100 / 118 / 132;
  - iPhone sideways 844×390: 130 wide, 100 / 118 / 132;
  - Pixel 7 sideways 863×360: 133 wide, 100 / 118 / 132.

  The drawing never shrinks, so the founder's fallback (no line on an upright phone) was not needed.
- **P-19: saved blanks are judged on their own copy** with the catalogue's own rule. A saved blank too short for the
  board isn't listed. Its verdict equals its natural base's on the same board (unit test: fits, placement and worst
  shortfall all equal). The flag's offer stays on the makers' catalogue.
- **P-20: the saved card's natural row reads `NAT Rocker`**, the founder's accepted short form, in both systems.
  Measured on a card exactly 290 dots wide, the narrowest a flat card draws:
  - **Imperial:** a maker's own table already reaches the card's inner edge (278 of 278 dots). `Natural Rocker`
    wrapped to two lines still ran 3 dots past it (281). `NAT Rocker` lands exactly on it (278). The cause was the
    label column: `CUSTOM` set 3 dots wider than `ROCKER` in the 9-px tracked capitals. The two rocker labels on a
    saved card are set a little tighter (0.02em instead of 0.08em) so `CUSTOM ROCKER` fits too.
  - **Metric:** a maker's own table already runs past the edge at 290 (292 of 278). The saved card's is narrower (283).

  The browser test now checks that a saved card's table is never wider than its maker's own card at the same width.
- **P-21: Remove asks once on the card** (`Remove this saved blank?` · Remove · Keep).
- **P-22: every card shows the rocker line**, the short-screen one-line card included.
- **P-23: named nowhere else.** The Board Rack's cards name no blank, and `blankRowMeta` carries no name. The flag's
  offer and the two ROCKER drawings' spoken names now say the rocker.
- **P-24 (new, found while measuring): the order form's Blank line has room for the founder's own note when the board
  is centred, but not always once it is slid along the blank.** On a desktop screen the line is 737 dots wide; on
  paper it is 603.
  - With `— centered`, the founder's three-change note fits after **every** one of the catalogue's 223 blank names, on
    screen and on paper (the browser test asserts this).
  - With the longest name (`Marko Foam 10'0" MK-SUP-STD`, 597 dots on screen with that note), **only** `— centered`
    fits. Any slide along the blank (`— center 1/2" toward nose` and up) ends the line in `…`.
  - With the widest possible four-change note (`-1 15/16"N44" -1 15/16"N43" -1 15/16"T44" -1 15/16"T43"`), even
    centred, every name is cut off.
  - A short name like the 9'4"B with a typical note has room.

  Making the shop's line wrap onto a second line (or shrink) changes the printed sheet's layout, so it is the
  founder's call, not built here. The measurement stays in `e2e/summary-blank.spec.ts` as a reported test.
- The account path (signed in: save, reload, Pick a Blank shows it, Remove deletes the account row) is proved by plan
  01's unit tests only. **It waits for the founder's own signed-in check at go-live.** Every browser test runs signed out.

## Task 0: the development database's migration record

Migration `0012_user_blanks.sql`'s hash matched the row on the development branch
(`c42b749262051ee82bd2d85978e97e35c15ced9e54f9affe8ba28dd5f339d5ec`). A one-off script in the session scratchpad (never
in the repo, no connection string or row data printed) re-stamped it:

- Before, the check script (exit 0):
  ```
  user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text, rack_order text, starred_blanks text (6 of 6 columns); extra_center_thickness_mm absent (expected absent)
  models: locked boolean (1 of 1 columns)
  user_blanks: id uuid, clerk_user_id text, copy jsonb, rocker jsonb, created_at timestamp with time zone, updated_at timestamp with time zone (6 of 6 columns)
  drizzle migrations recorded: 13
  ```
- `rows with the hash at the old time: 1; at the new time: 0` → the update printed `rows touched: 1` →
  `rows with the hash at the old time: 0; at the new time: 1`. The fallback (delete and re-create) was not needed.
- `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install drizzle-kit migrate`: "migrations applied
  successfully!", exit 0, nothing new applied.
- After, the check script (exit 0): the same four lines, `user_blanks … (6 of 6 columns)`,
  `drizzle migrations recorded: 13`.

Production was not touched.

## The board-lock finding

`e2e/board-lock-screens.spec.ts` alone, all three projects, on a quiet machine after Task 2:
**`39 passed, 18 skipped, 0 failed (4.5m)`.** No control escapes the lock. Plan 02's failures were load, not code.
Every failure in plan 02's runs, and in this plan's full run, fell in the rack setup (opening a practice board
locked from the rack), before any ROCKER control was reached.

In the full run and its re-runs, single board-lock tests (`p-screens`, `p-sideways`, `look-template`) and the name
band's `e3` still failed now and then. Each time the cause was a board opened from the practice rack arriving without
its lock, which the spec's own `openLockedBoard` comment describes ("a cold dev server can answer the very first
client-side navigation with a full page load, which forgets the open board"). Each passed in at least one run. This
plan touches nothing on the rack, the lock or that navigation.

The new controls are covered by a unit test added to `components/design/board-lock-scope.test.ts`: the card's pick
button is `disabled={locked}`, while the star, Remove, its confirmation and Keep are `data-lock-exempt`.

## Gates

| Gate | Result |
| --- | --- |
| `npx vitest run` | **152 files, 5,666 passed, 2 skipped, 0 failed** |
| `npx next typegen && npx tsc --noEmit` | clean |
| `npm run lint` | clean (0 problems) |
| Task 1 tracer (`e2e/rocker-custom.spec.ts`, desktop) | 7 passed, 3 skipped. It ran end to end before Task 2 began. |
| Task 2 verify (summary-blank, phone-screen-tiles, blank-picker, rocker-custom, rocker-blanks, blank-makers; all projects) | **155 passed, 97 skipped, 0 failed (14.7m)** |
| board-lock-screens alone, after Task 2 | **39 passed, 18 skipped, 0 failed (4.5m)** |
| **Full browser suite** (`PW_PORT=3193 IS_WEBPACK_TEST=1 npx playwright test`) | **`29 failed, 936 skipped, 1147 passed (2.9h)` — not green** (details below) |
| Re-run 1 (`--last-failed`, the 29) | 11 passed, 18 failed (19.3m), with the load average 49–52 throughout |
| Re-run 2 (`--last-failed`, the 18, quiet machine) | 14 passed, 4 failed (4.3m) |
| Re-run 3 (those four files whole: board-name-band, undo-redo, outline-ghost, board-lock-screens) | 83 passed, 67 skipped, 3 failed (13.5m): p-sideways, look-template, outline-ghost (e) |
| outline-ghost (e), iPhone, alone `--repeat-each` | this branch 4 of 5 (and 2 of 3 before that); **the base commit 4a2a6abf also failed 1 of 5** (and passed 3 of 3 before that) |
| After the card fix: blank-picker, rocker-custom, touch-sizing, rocker-blanks (all projects) | **128 passed, 88 skipped, 0 failed (12.9m)** |
| `git status --short e2e/*-snapshots` | empty; no baseline re-recorded |

**About the full run.** No test took an absurd time, so the machine did not sleep. About 30 minutes in, **another
Claude session started its own Playwright run** from a scratch copy of the suite
(`…/a943832e-…/scratchpad/suite-copy`). The load average then sat between 24 and 58 on this 8-core machine for most of
the run. Every one of the 29 failures was a page that didn't load in time or a timeout: `net::ERR_ABORTED`, a
`toHaveURL` still on the previous screen after 3 s, a 30 s test budget running out. None is a wrong figure or a wrong
word. Every test that failed passed in at least one later run except `outline-ghost (e)` on the iPhone. That test
fails on the base commit too, at about the same rate, at a different step each time. The 2.9h run is **not** green and
is not called green here. One quiet full run on `main` at go-live is still owed (the go-live step 1 below already asks
for it).

## Commits

| Task | Commit | What |
| --- | --- | --- |
| 1 (tracer) | 11c132a1 | Your saved blanks show in Pick a Blank beside the makers': starred, marked Saved by you; picking one puts its custom rocker back on the board |
| 2 | 9e0f3ca1 | Every blank named with its rocker on its own line: the cards, NAT Rocker over Custom Rocker, Remove, the order form, the screen tile, a screen reader, CLAUDE.md |
| 3 | aef49634 | The phone screen-tile rocker check gets the suite's slow allowance |
| 3 | b848f22d | On a phone held sideways a card's name no longer runs into its length and litres |
| 3 | 4e398670 | The pictures and their archived scripts |
| 3 | (this file) | This summary |

Task 2 landed as one commit, not two; the plan allowed either.

## Deviations from Plan

1. **[Rule 1] P-20 took the short form, with tighter spacing on the two rocker labels** (measured above). The card's
   NAT label is `cardNaturalRockerLabel` in `lib/geometry/blank-card-text.ts`. The DATASHEET keeps `Natural Rocker`
   (it has room). Commit 9e0f3ca1.
2. **[Rule 1] The card's name and its length · litres overlapped on a sideways phone's narrow cards** (`9'4"B9'3 1/2"`).
   The bug predates this plan; it was found in the Pixel 7 picture and fixed in `blank-card.tsx`, a file this plan
   owns. Where there's no room, the figures now drop under the name, which keeps its width. Commit b848f22d.
3. **The ROCKER drawing's spoken name passes `{ vendor: blank.record.vendor, name: blank.record.name }`** to
   `blankDisplayName`, rather than the record itself. `components/viewer/drag-readout-chip.test.ts` (outside this plan)
   pins those two reads in `rocker-viewer.tsx` (T-11-21), so they stay literal and that test is unchanged.
4. **`uprightFacts` / `compactLine` take the optional rocker as planned**, and bend the blank only if it isn't already
   bent by that rocker. A card always hands them its bent copy, so nothing is bent twice.
5. **`e2e/summary-blank.spec.ts` gained a measuring test** (P-24). It asserts only what holds (the founder's note,
   centred) and reports the rest.
6. **`e2e/phone-screen-tiles.spec.ts`'s new walk is `test.slow()`** (commit aef49634). It does a preset, the popup and
   three menu trips. The board-lock spec needed no fix (see the finding above).
7. **`e2e/blank-makers.spec.ts`** needed no change: its checks read `Use {maker} ` prefixes and never the full pick
   name.
8. `blank-flag.tsx` is unchanged (its offer changed only through `offerLine`).

## Human verification deferred

- The founder's look at the seven pictures and P-4, P-19 to P-24 (P-24 needs a decision).
- The signed-in path, at go-live: save a custom blank signed in, reload, find it in Pick a Blank, Remove it.
- One quiet full browser run on `main` (go-live step 1).

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model:
- T-mkb-11: saved names and notes render as React text and `aria-label` strings only.
- T-mkb-12: Remove calls `useSavedBlanks().removeBlank`. Signed in, that is plan 01's owner-scoped
  `removeUserBlank`; signed out, it is this browser's own list.
- T-mkb-13: each saved blank is prepared once (a WeakMap on the entry), and with no saved blanks nothing new is judged.
- T-mkb-14: the go-live order below.

## GO-LIVE STEPS (the plan's `<go_live>`, verbatim — for the orchestrator and the founder, NOT the executor)

**For the orchestrator and the founder — NOT the executor.** Run only after the founder has looked at plan 03's pictures
and said go (D-12). The change is additive, so production is migrated BEFORE the push that deploys (CLAUDE.md
"Database": the old, still-deployed code never mentions `user_blanks`, so it keeps working; the new code finds the
table in place the moment it deploys).

1. **Merge to main, gates on main.** Merge the task branch into `main` the usual way (a temporary main worktree if the
   main checkout is busy). On main: `npm test`, `npx tsc --noEmit` (after `npx next typegen`), `npm run lint`,
   `npm run build` from the main checkout, and the full browser suite (`PW_PORT=<free> npm run test:e2e`, background,
   read its final line before anything is pushed). Re-check the ROCKER desktop baseline under Turbopack if the
   webpack-rendered pictures in the worktrees ever disagree (none was re-recorded in this task).
2. **The founder migrates production, in their own terminal, from the main checkout** (the orchestrator opens the tab
   and hands them these three lines; the orchestrator itself never runs them):
   - check first — expected `user_blanks missing (0 of 6 columns)` and exit 1:
     `bash -c 'trap "rm -f .env.production.pull" EXIT INT TERM; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts'`
   - migrate: `npm run db:migrate:prod`
   - check again — expected `user_blanks: id uuid, clerk_user_id text, copy jsonb, rocker jsonb, created_at timestamp
     with time zone, updated_at timestamp with time zone (6 of 6 columns)`, exit 0, one more migration recorded:
     the same `bash -c '…'` line as the first check.
   Any step that fails stops the rest; nothing is pushed until the second check reads 6 of 6.
3. **Push main** (the deploy), then watch the Vercel deployment for the pushed commit until it is live.
4. **Live check on www.shaperassistant.com** (signed out, then the founder signed in): pick a blank on ROCKER →
   Customize Rocker › → `+1/2"N` → Use and save as a new blank → the BLANK button reads the note; Pick a Blank shows the
   saved card under ★ STARRED beside the natural one; the order form's blank line carries the note; the phone's ☰
   ROCKER tile reads it. Signed in: save one, reload, it is still there (the account path); Remove it from its card.
5. Only then: the task's own SUMMARY, the STATE.md quick-task line and the memory notes (orchestrator).

## Self-Check: PASSED

Commits 11c132a1, 9e0f3ca1, aef49634, b848f22d and 4e398670 are on this branch. The seven `03-*.png` pictures and
`shoot-source-03.tar.gz` are committed. No `.ts/.js/.mjs/.cjs` is tracked under `.planning/`, and no file under
`e2e/*-snapshots/` changed. STATE.md and ROADMAP.md are untouched.
