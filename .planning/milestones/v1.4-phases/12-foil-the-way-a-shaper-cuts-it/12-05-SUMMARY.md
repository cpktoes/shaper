---
phase: 12-foil-the-way-a-shaper-cuts-it
plan: 05
subsystem: design store, ROCKER sidebar, presets, rack-card litres
status: complete
tags: [deck-skin, off-bottom, planer-passes, presets, undo, e2e]
requires:
  - "12-01: DEFAULT_BLANK_CUT, TipStyle, BoardBlank / BoardProfileInput cut fields (optional), BlankSideView.cut / centerGap / foamOffBottom"
  - "12-02: planerPasses, formatPasses (lib/geometry/measure-display.ts)"
  - "12-03: useFitDefaults().defaults.deckSkin / planerMaxDepth / tipStyle; FIT_DEFAULTS_RANGE_IN.deckSkin; useBoardCut()"
provides:
  - "useDesign().setDeckSkin(deckSkin: Mm): void (12-08 imports it)"
  - "pickBlank bakes the live Deck Skin and Tip Style (liveCutRef) and DEFAULT_BLANK_CUT's fine-tune surface into a first pick; a switch keeps the board's own"
  - "the store's side profile and summarizeDesign both pass the blank's own cut to buildBoardProfile"
  - "presetFitContext / presetBlank / presetDesignFields carry DEFAULT_BLANK_CUT (D-17)"
  - "BOARD ON BLANK: Deck Skin slider, OFF BOTTOM column, data-bottom-passes line"
  - "e2e/rocker-cut.spec.ts (five tests; 12-08 extends it)"
affects:
  - "12-07 (use-blank-list's useBoardCut now reads a real per-board cut after a pick, not the account default)"
  - "12-08 (Tip Style and Fine-tune off pills call into the same store; extends e2e/rocker-cut.spec.ts)"
  - "12-09 (makes the cut fields required — every blank literal written here states its cut)"
tech-stack:
  added: []
  patterns:
    - "A live-defaults ref (liveCutRef) kept current by an effect, read only inside event handlers — the liveTipsRef pattern"
    - "A board's cut stored on its blank, so undo, autosave, Remove + undo and a blank switch carry it with no extra field list"
key-files:
  created:
    - e2e/rocker-cut.spec.ts
  modified:
    - components/design/design-store.tsx
    - components/design/design-store.test.ts
    - components/rocker/board-on-blank.tsx
    - lib/blanks/preset-blanks.ts
    - lib/blanks/preset-blanks.test.ts
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
key-decisions:
  - "The passes line reads defaults.planerMaxDepth (the live account setting), as the plan names; the count is planerPasses(view.centerGap, …) so it moves with Placement, Deck Skin and Center Thickness"
  - "The Deck Skin row shows in the no-room-to-slide case too (Placement disabled, skin live)"
  - "The blank-switch e2e picks the first fitting row that is not already the board's blank (aria-pressed=false), rather than a fixed second row, so it can never re-pick the same blank"
metrics:
  duration: "about 30 minutes"
  completed: 2026-09-26
  tasks: 3
  files: 8
actuals:
  tokens: 21000
  tasks: 3
  commits: 4
---

# Phase 12 Plan 05: The cut on the ROCKER screen Summary

A picked board now keeps its own Deck Skin, and the ROCKER sidebar shows, live, how much foam comes
off the bottom at every station and how many planer passes that is at the center. Presets open with
their own 1/8" skin and Pin deck tips, whatever the shaper's defaults say.

## What a shaper sees

- **Deck Skin under Placement.** With a blank picked, BOARD ON BLANK has a second slider,
  `Deck Skin — 1/8"` (`— 3 mm` in Metric), running 1/16" to 1/2" in 1/16" steps (2 to 12 mm). It
  uses the same range as the Deck Skin field in Fit & Tip Defaults, so the two can never disagree.
  The hint under it reads "Off the deck at every station" when the tips are Pin deck, and "Off the
  deck — more at the tips" when they are Bottom. A drag lowers or raises the board's deck at every
  station and moves the foam off the bottom by the same amount. It also re-judges the blank list and
  re-checks the flag. It never clears the pick, and each drag is one undo step.
- **The board's skin is its own.** The first pick takes the Deck Skin and Tip Style from Fit & Tip
  Defaults, with fine-tunes on the Deck. Switching to another blank keeps the board's own skin, the
  same way the 12" fine-tunes are kept. Remove This Blank takes the skin away, and one undo brings
  the blank back with its placement, fine-tunes, skin and Tip Style together.
- **OFF BOTTOM.** The readouts' third column is now `OFF BOTTOM`: the foam off the bottom at each of
  the five stations. A value below zero shows in warning ink with its minus sign, and one that prints
  as zero shows as a plain zero. The column gap narrowed from 16px to 12px so `Nose @ 30.5 cm` still
  fits on one line at the narrowest desktop sidebar.
- **Planer passes.** Under the grid, a line set off by a faint rule reads `Planer passes at the
  center` with the count (`3 passes`; `1 pass`; `0 passes` in muted ink). Under it is the hint
  "At 1/8" a pass — your Planer Max Depth." The count divides the printed center depth by the
  printed Planer Max Depth, so a shaper doing the sum by hand gets the same answer.
- **No blank picked:** none of the new rows show. The sidebar is exactly what it was before.
- **Presets** open in the same four blanks as before (Marko Foam 6'4" TP, Arctic Foam 5'10" MF,
  Marko Foam 7'5" Machine All, US Blanks 9'3"Y, each centered). They are cut with 1/8" off the deck
  and the tips pinned to the deck, never the shaper's own defaults. Without this, a shaper whose Tip
  Style default is Bottom would open a new Shortboard already flagged.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Pick a blank, drag its Deck Skin, watch OFF BOTTOM and the passes change with nothing sent (tracer) | `e25d2d5` | design-store.tsx, design-store.test.ts, board-on-blank.tsx, e2e/rocker-cut.spec.ts |
| 2 (RED) | Failing tests: presets carry their own cut; card litres on that cut | `cb3dbf0` | preset-blanks.test.ts, design.test.ts |
| 2 (GREEN) | Presets open with DEFAULT_BLANK_CUT; summarizeDesign passes the blank's cut | `624ed60` | preset-blanks.ts, design.ts |
| 3 | No blank, Metric, Remove + undo, blank switch, proven in real browsers | `af55e7e` | e2e/rocker-cut.spec.ts |

Tracer gate (Task 1): its verification ran end to end before any other task started (`npx tsc --noEmit`
clean, `npx vitest run lib/units-isolation.test.ts components` 715 passed, the new spec 3/3 on iPhone,
Android and desktop). The tracer did not stop for a human, per the end-of-phase mode.

## Preset litres (D-17 / D-08)

| Preset | Before this plan | After this plan |
|--------|------------------|-----------------|
| Shortboard | 30.180 L | 30.180 L |
| Fish | 35.367 L | 35.367 L |
| Midlength | 51.453 L | 51.453 L |
| Longboard | 75.300 L | 75.300 L |

These figures come from `presetSummary` on this worktree, measured with a throwaway script that was
deleted before any commit.

**Why they don't move here.** D-17 says the preset litres move to the new foil. That move already
happened in 12-01, because the transitional `cutOf()` fills a missing cut with `DEFAULT_BLANK_CUT`,
which is exactly the cut this plan now stores on a preset. There is also a stronger reason, measured
while writing Task 2: **a board's litres never depend on its cut at all.** The skin and the centre gap
cancel, so the thickness at every station is the blank's thickness there, less the blank's thickness
at the center, plus the board's own center. Tip thinning ends at the tip settings either way, and a
fine-tune adds the same thickness on either surface. Across all four presets, as opened and slid and
fine-tuned, Pin deck vs Bottom, 1/8" vs 1/4" skin and Deck vs Bottom fine-tune all quote bit-identical
litres. So passing the cut through `summarizeDesign` is wiring: it keeps the rack card's side profile
the same object the store builds. It does not change any figure a shaper reads. No test pins a
litres number; the tests compare two pipelines or two cuts.

## Desktop baselines (SHA-256), no `--update-snapshots`

| Picture | Before | After |
|---------|--------|-------|
| outline (TEMPLATE) | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 |
| rocker | 75ee2ce14d11fadb7d863762f4a2f72c8f8a367c1960080a8e5509ba55101731 | 75ee2ce14d11fadb7d863762f4a2f72c8f8a367c1960080a8e5509ba55101731 |
| rails | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 |
| volume | e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372 | e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372 |
| fins | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 |

`IS_WEBPACK_TEST=1 PW_PORT=3155 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop`
gave 5 passed. The default board has no blank, so nothing this plan adds is drawn.

## Verification

- `npx next typegen` (once), then `npx tsc --noEmit`: clean.
- `npx vitest run`: 74 files, 2,949 passed, 2 skipped (both skips were already there).
- `npm run lint`: 0 errors. The same 11 warnings as before, none in this plan's files (`npx eslint` on the
  eight files is clean).
- `npx vitest run lib/blanks lib/geometry/design.test.ts lib/geometry/presets.test.ts`: 249 passed.
- `npx --no-install tsx --tsconfig ./tsconfig.json scripts/generate-preset-blanks.ts` wrote the same four
  picks. `git diff --exit-code lib/blanks/preset-blanks.generated.json` exits 0, so the file is
  **byte-identical**.
- `IS_WEBPACK_TEST=1 PW_PORT=3155 npx playwright test e2e/rocker-cut.spec.ts e2e/rocker-blanks.spec.ts e2e/desktop-regression.spec.ts e2e/touch-drag.spec.ts e2e/phone-rails.spec.ts e2e/touch-sizing.spec.ts`:
  123 passed, 75 skipped, 0 failed. Every skip is a device skip written into those specs (desktop-only,
  phone-only, iPhone-only, Pixel-only). No timeout re-runs were needed.
- `e2e/rocker-cut.spec.ts` alone: 15/15 (five tests × iPhone, Android, desktop).
- Acceptance greps:
  - `board-on-blank.tsx` has `OFF BOTTOM`, `gap-x-3`, `data-bottom-passes`, `planerPasses(` and
    `foamOffBottom`, and no `view.foamOff[`.
  - `design-store.tsx` has `setDeckSkin` and `liveCutRef`, and `MAY_ASSIGN_BLANK` names `setDeckSkin`.
  - `DEFAULT_BLANK_CUT` appears 5 times in `preset-blanks.ts`, and `tipStyle: blank.tipStyle` once in
    `design.ts`.
  - No `25.4` or `/ 10` in any changed source file.
- `git diff --name-only 5f9c072..HEAD` lists exactly the eight allowed files (this SUMMARY is the ninth,
  in its own commit). No `package.json`, `package-lock.json`, STATE.md or ROADMAP.md change. No `.env*`
  file touched, and nothing ran against the database.
- The four RED/GREEN test titles and the four Task 3 titles appear verbatim in `e2e/rocker-cut.spec.ts`.
- Every blank literal written here states its cut. That covers `presetBlank` and `presetFitContext`
  (`...DEFAULT_BLANK_CUT`), the store's `pickBlank` and side profile, `summarizeDesign`, and the
  `asTheStoreComputes` mirror in `design.test.ts`. 12-09 can make the fields required without editing
  these files.

## TDD Gate Compliance

- RED: `cb3dbf0 test(12-05): …` failed 9 tests before the change. Five were preset-blanks tests (the fit
  context and four "opens with its own cut"). Four were design tests (preset card litres on the preset's
  own cut, which checks the preset blank's Tip Style first).
- GREEN: `624ed60 feat(12-05): …` passes all 249.
- REFACTOR: not needed.
- Honest note: the `summarizeDesign` half of GREEN cannot turn a litres test red, for the reason given
  under Preset litres (the cut never moves the thickness). Its tests prove the invariance instead:
  Pin deck equals Bottom, and a non-default cut matches the store's pipeline.

## Deviations from Plan

None that change behaviour or scope. Small things to know:

1. **Two extra e2e checks inside the planned tests.** The Metric test also drags the skin one step and
   checks the readouts and passes line still carry no `"`. The drag test also checks the pick is still
   there after the drag ("never clears the pick").
2. **The design-store test file gained a small `describe` block** for the cut. It checks that liveCutRef
   is read from the defaults, that pickBlank bakes or keeps the cut, that setDeckSkin's no-blank guard
   comes before its noteEdit, that the side profile passes the cut, and that setDeckSkin is on the
   context value. `setDeckSkin` was also added to the `STARTS_THE_BOARD` list, so the D-19 "every edit
   starts from startedFrom" rule covers it.
3. **The zero-request counter counts every host**, as the plan asks, not only this site's origin. It
   stayed at zero on all three browsers, so the fake Clerk key's background errors never produced a
   request inside the drag window.

No test-only allow-list or compile fix was needed outside the eight files.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register.
- **T-12-15:** the slider can only produce values on the bounded 1/16"–1/2" (2–12 mm) grid, through
  `measureSlider` over `FIT_DEFAULTS_RANGE_IN.deckSkin`. Every save is still re-parsed through 12-01's
  bounded version-5 schema.
- **T-12-16:** the list's verdicts are memoised on the board's cut (12-03). The e2e counted zero requests
  over a Deck Skin drag.

## Human check (recorded, not stopped for; end-of-phase mode)

On a real iPhone and a real Pixel, pick a blank and drag the Deck Skin thumb with a thumb. Check that:
- the label never wraps;
- the Center's OFF BOTTOM and the passes follow the drag;
- nothing on the drawing jumps.

The e2e drives the slider by keyboard on all three profiles. A real thumb drag of this slider has not
been walked.

## Self-Check: PASSED

- FOUND: e2e/rocker-cut.spec.ts, and the seven modified files.
- FOUND commits: `e25d2d5`, `cb3dbf0`, `624ed60`, `af55e7e`. Each ends with the
  `Co-Authored-By: Claude Fable 5.1` trailer.
- The five baseline hashes are unchanged, and preset-blanks.generated.json is byte-identical.
