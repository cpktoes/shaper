---
phase: 12-foil-the-way-a-shaper-cuts-it
plan: 09
subsystem: ROCKER DATASHEET, ROCKER drawing, blank-fit type contract
status: complete
tags: [datasheet, foam-off, deck, bottom, accessibility, type-contract, expand-and-contract]
requires:
  - "12-01: BlankSideView.foamOffDeck / foamOffBottom, cutOf (transitional), the optional cut fields"
  - "12-03 / 12-05 / 12-07: every caller passes each board's own cut"
provides:
  - "DATASHEET FOAM OFF block: Deck and Bottom rows at the five stations"
  - "the drawing's accessible name 'Side profile of the board inside the {vendor} {name} blank, with the foam to come off the deck and the bottom shaded'"
  - "deckSkin / tipStyle / fineTuneSurface REQUIRED on BoardBlank, BoardOnBlankInput and BoardProfileInput.blank"
  - "cutOf and BlankSideView.foamOff deleted"
affects:
  - "12-10 and anything later that lays a board on a blank: it must pass the board's own cut (the compiler enforces it)"
tech-stack:
  added: []
  patterns:
    - "Expand-and-contract closed: optional fields plus one fallback (12-01), every caller migrated (12-03/05/07), then fields required and fallback deleted (here)"
key-files:
  created: []
  modified:
    - components/rocker/rocker-datasheet.tsx
    - components/rocker/rocker-viewer.tsx
    - e2e/rocker-blanks.spec.ts
    - e2e/phone-rails.spec.ts
    - lib/geometry/blank.ts
    - lib/geometry/blank-fit.ts
    - lib/geometry/board-profile.ts
    - lib/geometry/board-profile.test.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/presets.test.ts
key-decisions:
  - "A Deck cell below zero takes the same warning ink and minus sign as a Bottom cell (the planner's flagged decision, matching the UI-SPEC Color section as amended 2026-09-26); both rows share one local cell function"
  - "The retired total's test coverage moved to a property on the per-surface records: foam off the deck plus foam off the bottom equals the blank's thickness less the board's, at every station"
metrics:
  duration: "about 25 minutes"
  completed: 2026-09-26
  tasks: 2
  files: 10
actuals:
  tokens: 5750
  tasks: 2
  commits: 3
---

# Phase 12 Plan 09: FOAM OFF on the DATASHEET, and every board carries its own cut — Summary

The sheet a shaper takes to the supplier now says, station by station, how much foam comes off the
deck and how much comes off the bottom, beside the blank's own rocker and the board's. A screen
reader hears the same from the drawing. Under the hood, a board can no longer be laid on a blank
without its own Deck Skin, Tip Style and fine-tune surface; the compiler checks every place.

## What a shaper sees

- **DATASHEET with a blank picked** now reads four blocks: `BLANK — {VENDOR} {NAME}` (the blank's
  rocker, thickness, width), `YOUR BOARD` (the board's rocker including the Pin deck lift, thickness,
  width), then a new **FOAM OFF** label over two read-only rows:
  - **Deck**: the skin, plus the tip thinning under Bottom, less a Deck fine-tune.
  - **Bottom**: the gap, plus the tip lift under Pin deck, less a Bottom fine-tune. It is the last
    row, with no rule under it.
  - In Metric these read `Deck (mm)` and `Bottom (mm)`, in whole millimetres.
  - A value that prints as zero reads as zero. A value below zero (the board would poke out of the
    blank on that surface) reads in warning ink with its minus sign, on either row.
- The old single **Foam Off** row and the heavier rule above it are gone.
- **No blank:** the sheet is exactly as before (three typed rows, no FOAM OFF block).
- **The drawing** is painted exactly as before. Its accessible name now reads "Side profile of the
  board inside the {vendor} {name} blank, with the foam to come off the deck and the bottom shaded".
  Its notes no longer claim the blank's bottom is the board's bottom.
- Nothing a shaper reads changes from the contract half. Every screen already passed each board's own
  cut, so the tightening only removes the chance of a future screen forgetting to.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | The DATASHEET's FOAM OFF block and the drawing's new name (tracer) | `7c20165` | rocker-datasheet.tsx, rocker-viewer.tsx, e2e/rocker-blanks.spec.ts, e2e/phone-rails.spec.ts |
| 2 | The three cut fields required; `cutOf` and the retired foam total deleted | `5a9cab4` | blank.ts, blank-fit.ts, board-profile.ts, board-profile.test.ts, volume.test.ts, presets.test.ts |

**Tracer gate (Task 1):** the task's verification passed end to end before Task 2 started.
`npx tsc --noEmit` was clean, and `rocker-blanks.spec.ts` + `phone-rails.spec.ts` gave 61 passed and
29 device skips. The two changed tests ran on iPhone, Android and desktop. The 360px test is
phone-only by design, so its desktop run is a skip. The tracer did not stop for a human
(end-of-phase mode).

## Callers the contract touched

With the fields required, `cutOf` deleted and the `DEFAULT_BLANK_CUT` import dropped from
`blank-fit.ts`, `npx tsc --noEmit` reported errors in only three files, and I own all three:

- `lib/geometry/board-profile.test.ts:154,155,319`: assertions on the retired `foamOff` total.
  - :154–155 now assert that `foamOffDeck + foamOffBottom` equals the blank's thickness less the
    board's, at every station.
  - :319 was deleted. The `foamOffDeck` / `foamOffBottom` equalities on the next two lines stay.
  - I also removed two now-unneeded `!` on `board.deckSkin` (:144, :167).
- `lib/geometry/presets.test.ts:257`: `presetProfile` now passes the preset blank's own
  `deckSkin` / `tipStyle` / `fineTuneSurface`, as the store does.
- `lib/geometry/volume.test.ts:620`: the Marko 6'0" M-Regular `buildBlankProfile` literal spreads
  `...DEFAULT_BLANK_CUT` (a fixture board). I added one import line.

`lib/geometry/design.test.ts` needed no edit. Its `:441` literal already passes the blank's own
cut (12-05), and `:467` spreads `fields.blank`, which carries it.

**No caller outside my eleven files omitted the cut.** Nothing was defaulted, and there is no
out-of-scope caller to report.

## Checks

- `npx next typegen` (once), then `npx tsc --noEmit`: clean.
- `npx vitest run`: 74 files, 2,968 passed, 2 skipped (the two skips were already there).
- `npm run lint`: 0 errors. The same 11 warnings as before, none in this plan's files.
  `npx eslint` on the four Task 1 files is clean.
- `git diff --quiet main -- lib/geometry/pchip.ts package.json package-lock.json` exits 0, so
  `pchip.ts` and both package files are byte-identical to main (R10, R11 / D-20).
- Acceptance greps:
  - `cutOf` appears nowhere in `lib components app scripts`.
  - `?? DEFAULT_BLANK_CUT` in `blank-fit.ts`: 0.
  - No `deckSkin?:` / `tipStyle?:` / `fineTuneSurface?:` in `blank.ts`, `blank-fit.ts` or
    `board-profile.ts`.
  - `grep -rnw foamOff lib components` prints nothing.
  - `ratio` in `blank-fit.ts` / `board-profile.ts`: one comment line (`blank-fit.ts:16`, describing
    Phase 11), and no use in code.
  - `rocker-datasheet.tsx` has `FOAM OFF`, `foamOffDeck` and `foamOffBottom`, and has no
    `blank.foamOff[` and no `border-t-2`.
  - `rocker-viewer.tsx`: `IS the board's` count 0.
  - The `Foam Off` hits left in the two specs are one comment each plus one `toHaveCount(0)`.
  - `grep -rn dangerouslySetInnerHTML components/rocker` prints nothing (T-12-23).
  - No `25.4` or `/ 10` in either component.
- `IS_WEBPACK_TEST=1 PW_PORT=3159 npx playwright test e2e/rocker-blanks.spec.ts e2e/phone-rails.spec.ts`:
  61 passed, 29 skipped. The skips are device skips written into the specs. It ran after Task 1 and
  again after Task 2. No timeout re-runs were needed.

### R7 order check

- Named test (f) was added by `c610ac92f252e4480181a399502d8d6e438fbbcb`
  (`git log --format=%H -S "every version-4 board with a blank reopens" -- lib/models/design-snapshot.test.ts`).
- The first commit on the branch touching `components/` is `21b3924abdca8c095022c282805df400c5d4983c`.
- `git merge-base --is-ancestor c610ac9… 21b3924…` exits 0, so the check **passes**.
- All six named-test titles are present: (a), (b), (c), (d), (e) in `lib/geometry/blank-fit.test.ts`
  at :347, :363, :403 and above, and (f) in `lib/models/design-snapshot.test.ts`.

### Desktop baselines (SHA-256), no `--update-snapshots`

`IS_WEBPACK_TEST=1 PW_PORT=3159 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop`
gave 5 passed.

| Picture | Before | After |
|---------|--------|-------|
| outline (TEMPLATE) | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 |
| rocker | 75ee2ce14d11fadb7d863762f4a2f72c8f8a367c1960080a8e5509ba55101731 | 75ee2ce14d11fadb7d863762f4a2f72c8f8a367c1960080a8e5509ba55101731 |
| rails | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 |
| volume | e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372 | e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372 |
| fins | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 |

## Deviations from Plan

None that change behaviour or scope. Small things to know:

1. **`lib/geometry/design.test.ts` is unchanged.** It is in `files_modified`, but 12-05 had already
   written its literals with the cut.
2. **The drawing-name assertion** in `rocker-blanks.spec.ts` checks the `role="img"` name before the
   DATASHEET tab opens, while the drawing is showing. It matches the name's ending, so it works
   whatever blank the catalogue lists first.
3. **The Deck/Bottom e2e locators are scoped to the table box** (the `.overflow-x-auto` containing
   `FOAM OFF`). Without that scope, the sidebar's Deck Skin row and Bottom pills could match.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register.
- T-12-23: the vendor and name reach the page only as React text and a plain `aria-label` value.
- T-12-24: a board without a cut no longer compiles.
- T-12-SC: nothing was installed.

## Human check (recorded, not stopped for; end-of-phase mode)

- In each of the four themes, with a blank picked, check the drawing:
  - the deck band shows above the board and the bottom band below it;
  - both widen over the last 12" on the side the Tip Style takes the extra from.
- On a board that does not fit, check that the outline crosses the blank's line where it runs out of
  foam, with no warning colour on the drawing itself.

Neither has been walked in a browser by eye.

## Self-Check: PASSED

- FOUND: all ten modified files. `git diff --stat df0fa10..HEAD` lists exactly these ten, all within
  the eleven allowed (plus this SUMMARY).
- FOUND commits: `7c20165` and `5a9cab4`. Each ends with the `Co-Authored-By: Claude Fable 5.1`
  trailer.
- STATE.md and ROADMAP.md were not touched. No `.env*` file was read, and nothing ran against a
  database.
