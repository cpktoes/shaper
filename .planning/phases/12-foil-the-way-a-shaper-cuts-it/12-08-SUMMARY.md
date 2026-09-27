---
phase: 12-foil-the-way-a-shaper-cuts-it
plan: 08
subsystem: design store, ROCKER sidebar THICKNESS section
status: complete
tags: [tip-style, fine-tune-surface, thickness-copy, undo, touch-sizing, e2e]
requires:
  - "12-01: TipStyle, FineTuneSurface, BlankSideView.cut (always complete); the geometry moves only the chosen surface"
  - "12-04: TwoOptionToggle with ariaLabel / aria-pressed / coarse:min-h-11"
  - "12-05: the board's cut stored on its blank; pickBlank bakes it in; e2e/rocker-cut.spec.ts"
provides:
  - "useDesign().setTipStyle(tipStyle: TipStyle): void"
  - "useDesign().setFineTuneSurface(surface: FineTuneSurface): void"
  - "RockerControlsProps.onTipStyle, RockerControlsProps.onFineTuneSurface"
  - "THICKNESS: the Fine-tune off row (under Tail @ 12\"), the Tip Style row (last), the new intro"
affects:
  - "12-09 (reads nothing new from BoardBlank: both rows and both setters read sideProfile.blank.cut)"
tech-stack:
  added: []
  patterns:
    - "A discrete blank choice compared against the side profile's resolved cut, so a tap on the pill already on writes nothing and leaves no empty undo step"
key-files:
  created: []
  modified:
    - components/design/design-store.tsx
    - components/design/design-store.test.ts
    - components/rocker/rocker-controls.tsx
    - components/rocker/rocker-editor.tsx
    - e2e/rocker-cut.spec.ts
    - e2e/touch-sizing.spec.ts
key-decisions:
  - "Both setters skip when the tap matches sideProfile.blank.cut (always complete), not the optional BoardBlank field, per the orchestrator's ruling"
  - "The Fine-tune off e2e nudges Nose @ 12\" a quarter inch DOWN, not up, to keep clear of a pre-existing page stall (see Issues found)"
metrics:
  duration: "about 25 minutes"
  completed: 2026-09-26
  tasks: 2
  files: 6
actuals:
  tokens: 6800
  tasks: 2
  commits: 3
---

# Phase 12 Plan 08: Tip Style and Fine-tune off on the ROCKER sidebar Summary

Each board now has its own Tip Style (Pin deck / Bottom) and its own Fine-tune off setting
(Deck / Bottom). Both are picked on the ROCKER sidebar with small, finger-sized pills, and
THICKNESS now explains in plain words how the foil comes off the blank.

## What a shaper sees

- **THICKNESS with a blank picked** now opens: "Deck and bottom follow your blank's; the tips are
  thinned in the last 12". Set the tips, and fine-tune the 12" stations if you need to." In Metric
  the station reads 30.5 cm. The old "scaled down to your center" sentence is gone.
- **Fine-tune off: Deck / Bottom** sits right under Tail @ 12", beside the two 12" fine-tunes it
  controls.
  - **Deck** is the default for a new board: "Tweaks add or take foam on the deck; the rocker stays
    the blank's."
  - **Bottom:** "Tweaks move the bottom, so the rocker re-levels and its numbers can shift."
  - Changing it keeps the tweak the same size, so the 12" thickness reads the same, but the ROCKER
    readings move as the bottom re-levels.
- **Tip Style: Pin deck / Bottom** is the last thing in THICKNESS, after ↺ Reset Fine-Tune. A new
  board takes it from Fit & Tip Defaults (Pin deck out of the box).
  - **Pin deck:** "The deck stays put and the extra comes off the bottom, so the tip rocker grows —
    or falls, if the tip needs more foam than the cut leaves."
  - **Bottom:** "The bottom stays put and the extra comes off the deck, so the rocker stays the
    blank's own."
  - A tap changes the tip readings. The Nose @ 12" and Tail @ 12" readings don't move at all.
  - Under Bottom, the Deck Skin's hint changes to "Off the deck — more at the tips".
- **Both pairs:**
  - Each tap is one undo step. It re-checks the fit and never drops the blank.
  - Tapping the option that is already on does nothing.
  - On a phone every pill is at least 44px tall. With a mouse the pills are their usual size.
- **No blank picked:** neither pair is on the page, and THICKNESS still reads "Hand-set until you
  pick a blank."
- **The fine-tune slider still reaches 1/4" either way** (`FINE_TUNE_RANGE_IN` unchanged, D-20).

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Tip Style, proved with the 12" readings held still (tracer) | `aaa3e27` | design-store.tsx, design-store.test.ts, rocker-controls.tsx, rocker-editor.tsx, e2e/rocker-cut.spec.ts |
| 2 | Fine-tune off, the new THICKNESS intro, 44px pills on a phone | `6522322` | the same five, plus e2e/touch-sizing.spec.ts |

**Tracer gate (Task 1):** the tracer's own verification ran end to end before Task 2 started:
- `npx vitest run components lib/units-isolation.test.ts`: 720 passed, 2 skipped.
- `npx tsc --noEmit`: clean.
- `e2e/rocker-cut.spec.ts`: 18/18 across iPhone, Android and desktop.

The tracer did not stop for a human, per the end-of-phase mode.

## Code changes

- **Store:**
  - `setTipStyle` and `setFineTuneSurface` are discrete choices:
    `if (!state.blank || sideProfile.blank?.cut.<field> === value) return;`, then `noteEdit(null)`,
    then the `startedFrom` updater writing only `{ ...prev.blank, tipStyle }` or
    `{ ...prev.blank, fineTuneSurface: surface }`.
  - Both are on the context value and in the `DesignContextValue` doc comments. The blank-moves
    list in the header comment now counts eight.
- **Store test:**
  - Both setters are added to `MAY_ASSIGN_BLANK`, to the "blank moves each write the blank" list
    and to `STARTS_THE_BOARD`.
  - Four new source-contract tests: the guard comes before `noteEdit`, `noteEdit(null)`, each setter
    writes only its own field (`setFineTuneSurface` touches no offset, skin or style), and both are
    on the context value.
- **`rocker-controls.tsx`:**
  - Two `Record` copy tables hold the hints word for word from 12-UI-SPEC.
  - The Fine-tune off block sits inside the blank branch right after the Tail @ 12" `FineTuneRow`.
    The Tip Style block comes after ↺ Reset Fine-Tune and needs `view`.
  - Both pairs are `TwoOptionToggle`, `className="self-start"`, labelled `mb-2 text-sm
    text-surf-ink-muted font-normal`, with a `mt-2 text-xs text-surf-ink-muted font-normal` hint,
    reading `view.cut`.
  - The header comment's stale "scaled to the centre" description now says the blank thickness,
    less the skin and the gap.
- **`rocker-editor.tsx`:** passes `onTipStyle={setTipStyle}` and
  `onFineTuneSurface={setFineTuneSurface}`.

## Verification

- `npx next typegen` (once), then `npx tsc --noEmit`: clean.
- `npx vitest run`: 2,972 passed, 2 skipped. The 2 skips were already there.
- `npm run lint`: 0 errors. The same 11 old warnings (the `scripts/extract-prototype-*.mjs`
  files); `npx eslint` on the six changed files is clean.
- `IS_WEBPACK_TEST=1 PW_PORT=3158 npx playwright test e2e/rocker-cut.spec.ts e2e/touch-sizing.spec.ts e2e/rocker-blanks.spec.ts e2e/desktop-regression.spec.ts e2e/touch-drag.spec.ts e2e/undo-redo.spec.ts`:
  **108 passed, 57 skipped, 0 failed.** Every skip is a per-device skip written into the specs.
  No timeout re-runs were needed.
- The same three projects ran the new tests:
  - Tip Style tap (Task 1)
  - Fine-tune off
  - with no blank there is no Tip Style and no Fine-tune off
  - the pills-at-44px check in touch-sizing's ROCKER-only test (phones only)
- Acceptance greps on `rocker-controls.tsx`:
  - It contains `ariaLabel="Tip Style"`, `ariaLabel="Fine-tune off"`, both D-16 hint phrases,
    `Deck and bottom follow your blank's; the tips are thinned in the last`, and
    `const FINE_TUNE_RANGE_IN = { min: -0.25, max: 0.25 } as const;`.
  - It no longer contains `scaled down to your center`.
  - `design-store.tsx` contains `setTipStyle` and `setFineTuneSurface`.
  - No `25.4` or `/ 10` in any changed source file.
- `git diff --name-only df0fa10..HEAD` lists exactly the six allowed files, and this SUMMARY is
  committed on its own. No change to `package.json`, `package-lock.json`, STATE.md or ROADMAP.md.
  No `.env*` file was touched and nothing ran against the database.

## Desktop baselines (SHA-256), no `--update-snapshots`

`IS_WEBPACK_TEST=1 PW_PORT=3158 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop`: **5 passed**.

| Picture | Before | After |
|---------|--------|-------|
| outline (TEMPLATE) | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 |
| rocker | 75ee2ce14d11fadb7d863762f4a2f72c8f8a367c1960080a8e5509ba55101731 | 75ee2ce14d11fadb7d863762f4a2f72c8f8a367c1960080a8e5509ba55101731 |
| rails | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 |
| volume | e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372 | e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372 |
| fins | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 |

All five are unchanged. The default board has no blank, so nothing this plan adds is drawn.

## Issues found (not fixed here, outside this plan's files)

**Pushing a 12" fine-tune up past the Deck Skin freezes the ROCKER page.** I measured it in all
three test browsers with the default board on the first fitting blank:
- Nose @ 12" fine-tune from 0 to +1/8": about 50–80 ms a step.
- The step to +3/16", and every step after it: **about 2 seconds on Chromium (desktop and
  Android) and about 40 seconds on Playwright's WebKit (iPhone).**

Nudging down (−1/16" to −1/4") stays at about 30–85 ms a step, and a Fine-tune off tap takes
about 60–110 ms.

- **Why:** on the Deck, a tweak bigger than the skin lifts the board's deck above the blank's
  deck. That happens on every blank, so nothing fits anywhere. `use-blank-list.ts` has the two
  fine-tunes in its `ctx` and re-runs `listBlanks` over the whole catalogue on every step. With
  nothing fitting, each blank's search tries every placement and never stops early.
  `blank-flag.tsx`'s `judgeBlank` does the same for the picked blank. Both reach the per-sample
  checks in `blank-fit.ts`.
- **Where it came from:** none of this is in this plan's files. It is on the base commit
  (`df0fa10`), in code from 12-01, 12-03, 12-05 and 12-07.
- **Risk:** a real shaper nudging a 12" tweak past 1/8" on the Deck will see the page hang. How
  long on a real iPhone is not measured. Playwright's WebKit is known to run slower than shipping
  Safari, but the 2 seconds on Chromium is a real desktop freeze.
- **What I did:** the Fine-tune off e2e nudges down by a quarter inch instead of up. That moves
  the same surfaces the same distance and keeps the test clear of the stall. A comment in the spec
  records why. The stall itself is left for the orchestrator. It needs a change in
  `use-blank-list.ts` / `blank-fit.ts` (for example an early "can't fit anywhere" exit, or leaving
  the fine-tunes out of the list's judging), and 12-09 owns `blank-fit.ts` this wave.

## Deviations from Plan

1. **The Fine-tune off e2e nudges Nose @ 12" four steps down (ArrowLeft) instead of up.** The plan
   asked for up. Up stalls the page for reasons outside this plan's files (see Issues found). The
   assertions are the ones the plan names: the 12" label is unchanged across the tap, and at least
   one ROCKER cell changes. The test also checks that one undo brings back Deck and the ROCKER
   readings as they were.
2. **Small extra checks inside the planned tests:**
   - Tip Style: both hints show, and the pick survives a tap.
   - Fine-tune off: the new intro sentence (in Imperial), both hints, the pick survives, and undo.
   - No-blank test: the old intro, and none of the new labels or groups.
3. **The header comment's "blank's own foil scaled to the centre" line in `rocker-controls.tsx` was
   corrected** to the new model (blank − skin − gap), because it contradicted the new intro.

No test-only allow-list or compile fix was needed outside the six files.

## Human check (recorded, not stopped for; end-of-phase mode)

- **Real iPhone and Pixel:**
  - Pick a blank and scroll to THICKNESS.
  - Tap Fine-tune off and Tip Style with a thumb. Both pairs should be easy to hit, the hints
    should wrap cleanly and the readouts should respond.
  - While there, push Nose @ 12" up past 1/8" on the Deck and note how long the page hangs (see
    Issues found).
- **A saved board whose carried-over 12" tweak is beyond ±1/4"** (UI contract §10):
  - The label and the Tweak hint should read the true value, with the thumb at the end of its
    track.
  - A drag should replace it, and one undo should bring it back.
  - `FineTuneRow` is unchanged and `measureSlider` never rewrites a value nobody dragged. This has
    not been walked on a real saved board.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register.
- **T-12-21:** each pill only ever sends its two fixed options (`"pinDeck"` / `"bottom"`,
  `"deck"` / `"bottom"`), typed as `TipStyle` / `FineTuneSurface`. Every save is still checked
  again by 12-01's version-5 snapshot schema.
- **T-12-22:** the two `aria-label`s are fixed strings in the code.
- **T-12-SC:** nothing was installed.

## Self-Check: PASSED

- FOUND: all six modified files. `git diff --name-only df0fa10..HEAD` lists exactly them.
- FOUND commits: `aaa3e27` and `6522322`. Each ends with the `Co-Authored-By: Claude Fable 5.1`
  trailer.
- The five desktop baseline hashes are unchanged. STATE.md and ROADMAP.md are untouched.
