---
phase: quick-261018-dw6
plan: 01
subsystem: fins
tags: [fins, off-rail, tuner, saved-boards, geometry]
requires: []
provides:
  - "Off-Rail fine tuner on FINS Advanced (front/twin/side pair) and in Rear Fins (stringer-placed quad rears)"
  - "forwardOffRailNudge / rearOffRailNudge stored in FinAdvancedSpec (default 0, read forgivingly)"
affects: [fins, saved boards, TEMPLATE fin marks, phone screen tiles, Summary order form]
key-files:
  created:
    - e2e/fins-off-rail.spec.ts
    - lib/models/fin-off-rail-saved-board.test.ts
  modified:
    - lib/geometry/fins.ts
    - lib/geometry/fins.test.ts
    - lib/geometry/fins-imported.test.ts
    - lib/geometry/presets.ts
    - lib/geometry/preset-source.ts
    - lib/geometry/preset-source.test.ts
    - lib/models/design-snapshot.ts
    - components/fins/fin-controls.tsx
decisions:
  - "Rear toe follows the nudged spread (McKee aimed toe re-aims); a toe set by hand never changes"
  - "Both Aft/Forward position labels drop their bracketed off-rail note"
  - "Slider ends are the tuner window, rounded outward to the slider's own step"
metrics:
  duration: "about 30 minutes"
  completed: "2026-10-18"
status: complete
actuals:
  tokens: 21000
  tasks: 3
  commits: 4
---

# Quick 261018-dw6: Off-Rail fine tuner for the fins Summary

FINS now has an Off-Rail fine tuner: one slider nudges the front, twin or side pair in toward the stringer or out toward the rail, and a second one moves a quad's stringer-placed rear fins together. Every figure comes from `computeFinPlacement`, and nothing moves until a shaper touches a slider.

## What a shaper sees

**Front, twin and side fins (Thruster, Twin, 2+1, Quad fronts).** Open Advanced and a new **Off-Rail** slider sits directly under Aft/Forward position. Its label always says where the fins end up from the rail: `Off-Rail — 1 3/16"` on the default thruster in Imperial, `Off-Rail — 30 mm` in Metric. Left hint `Closer to rail`, right hint `Closer to stringer`. The fins move in 1/16" steps (whole millimetres in Metric). The drawing, the fin's callout, the DATA tab's Off-Rail row, the `· Modified` flag, the fin marks on TEMPLATE, the phone's screen tiles and the Summary order form's drawing and FIN PLACEMENT table all follow, because they all read the one calculation.

**Quad rear fins (Basic - Spread, McKee SB/Gun, McKee Longboard).** Rear Fins gets its own **Off-Rail** slider (after Aft/Forward position) that moves both rears together. Moving them in from the rail brings them closer together by exactly that amount: the DATA tab's Off-Stringer (1/2 Spread) and Full Spread rows and the drawing show the spread, now moved. Basic - Off-Rail keeps its one existing slider (1" to 2") and gets no second control.

**Wording.** Both Aft/Forward position labels lost their bracketed note and read like the centre fin's: `Aft/Forward position — 10 3/8"`.

## The two holds (what the sliders cannot go past)

| Fins | Window | If the template is outside it |
|---|---|---|
| Front, twin and side pair (D-02) | 7/8" to 2" from the rail (22 mm to 51 mm) | the window stretches just far enough to include the template's own figure |
| Stringer-placed quad rears (D-02b) | 1/2" either way from the template, never closer than 7/8" to the rail | a template already under 7/8" is itself the lower end |

So the slider's resting point is always reachable and never moves a board. Whatever is stored, the engine holds it inside the window: a crafted or broken saved value cannot push a fin off the board.

## Measured template figures (from plan time)

- Forward/side pair: Thruster Proportional 1 1/8", Basic 1 3/16", McKee SB 1 3/16", McKee Gun 1 1/8"; Twin (all three) 1 1/4"; 2+1 1 1/4"; Quad fronts 1 3/16" (McKee SB on a pintail 1 1/8"), McKee Longboard 1 5/16". All inside 7/8" to 2", so the front window is 7/8" to 2" everywhere today.
- Stringer-placed quad rears vary board by board: default outline over five tail templates, 60" to 120" long, 16" to 25" wide: Basic 0.92" to 3.41", SB/Gun 0.95" to 3.47", Longboard 1.88" to 4.60". With FINS' own sliders unticked: Basic 0.80" to 3.72", SB/Gun 0.62" to 4.01", Longboard 1.96" to 5.02".
- The default board's quad rears: 2.2135" (`2 3/16"`, 56 mm), half spread `3 1/8"`. Ends of the rear slider: `1 11/16"` to `2 11/16"` in Imperial, `44 mm` to `69 mm` in Metric.

## Why the rear window is 1/2" either way (D-02b)

On the four presets and the default board, the quad rears placed from the stringer already sit MORE than 2" from the rail, so under the plain 7/8" to 2" window they could only ever have moved out toward the rail, never in closer together. The founder amended D-03(b) on 2026-10-18.

| Board | Basic | McKee SB/Gun | McKee Longboard |
|---|---|---|---|
| Shortboard (6'2") | 2.13" | 2.17" | falls back to SB/Gun |
| Fish (5'8") | 2.77" | 2.89" | falls back to SB/Gun |
| Mid-length (7'2") | 2.03" | 2.10" | falls back to SB/Gun |
| Longboard (9'0") | 3.10" | 3.28" | 3.78" |
| Default 6'0" board | – | 2 3/16" | – |

Under D-02b every one of them moves 1/2" either way (the Shortboard's SB/Gun rears 1.67" to 2.67"; the Longboard's McKee Longboard rears 3.28" to 4.28"). None reaches the 7/8" floor; the floor matters only on narrow-shouldered boards whose template sits under 1 3/8".

## Decisions the plan left to the planner (named for the record)

- **Rear toe follows the nudged spread.** The McKee SB/Gun and Longboard rear toe aims the fin's line at a point near the nose, so rears closer together need less toe to aim at the same point; the formula's own behaviour is right. The nudged spread feeds it. A toe the shaper set by hand is never changed. No front toe reads the off-rail, so nothing else re-aims.
- **Aft/Forward wording: drop the bracket.** The new row shows the figure live; on the stringer-placed rears the old words were never true (those rears keep their spread as they slide, so their distance from the rail changed with the board's width); and "unchanged" reads as "can't be changed" once off-rail can move.
- **Slider shape.** The slider holds the nudge. Its two ends are the window (rounded OUTWARD to 1/16" or a whole millimetre) so there is no dead travel and zero always sits on a step; the thumb's resting place shows where the template sits within the window.
- **`· Modified`** shows only when a tuner actually moves the fins off the template, not merely when a non-zero value is stored.
- **Model notes stay as written** (MODEL INFO and the order form's "off-rail 1 1/4"" notes describe the published template, as they already do when Aft/Forward is moved).

## Nothing changes at rest

Every saved board, preset and print is exactly as before until a slider is touched. A board saved before this change stores no nudge and reads 0; a stored nudge round-trips exactly; anything that is not a finite number reads 0 and never stops a board opening (design-snapshot rule 9; the version stays 5, and a rollback reader just drops the unknown key). No database change, no migration, no deploy. Both golden fixture suites and the golden script are byte-identical; the desktop FINS baseline picture passes without being re-recorded (Advanced is closed by default). Reset Advanced Settings and picking a different Fin Setup put both sliders back on the template; changing the thruster model, quad model or twin template keeps the nudge, exactly as Aft/Forward position does.

## Where the tuned figure shows

Everything reads `finPlacement` from `computeFinPlacement` (no component works out the number, Rule 1): the FINS drawing and callouts (`fin-viewer.tsx`), the DATA tab rows and `· Modified` (`fin-data-panel.tsx`), TEMPLATE's fin marks, the phone's screen tiles, and the Summary order form's drawing and FIN PLACEMENT table. The Full Sized Template, Overview Sheet and Paper Saver draw no fins and read only the wings' off-tail stations, which the off-rail never changes.

## Task commits

| Task | Commit | What |
|---|---|---|
| 1 (tracer) | `e267b3e7` | storage, windows, slider range, forward maths, forward Off-Rail row, wording, saved-board tolerance, desktop browser proof |
| 2 | `4af3a965` | rear maths (spread, aimed toe, flags, Modified), rear Off-Rail row, rear browser proof |
| 3 | `940a574e` | phones, a real finger tap on Android, Metric browser proof |

## Deviations from Plan

**1. [Rule 3 - Blocking] Stray symlink in the cloned node_modules.** The main checkout's `node_modules` contains a symlink `node_modules/node_modules` pointing back at itself. After `cp -Rc` the worktree copy of it made Vite resolve `@base-ui/utils` to the main checkout's React, giving a second copy of React ("Invalid hook call") and failing 11 unrelated `components/design/slider-row.test.ts` tests. Unlinked the stray link in the worktree's own `node_modules` (not tracked, the target is untouched); the file then passed 18/18. Not a code change.

**2. [Test adjustment] A preset's imported board is already "Modified".** The zero-nudge test first asserted `isModified === false` for the presets, but the presets carry captured Aft/Forward offsets that already mark them Modified. It now asserts `isModified` equals "any of the pre-existing overrides is set", so the tuner at zero is shown to add nothing.

**3. [Test adjustment] Lighter zero matrix.** The five-setup x every-model x every-template matrix repeated combinations a setup never reads and timed out under load. It now runs each setup only with the models it reads (13 setup variants x 5 tail shapes x 4 lengths x 3 widths = 780 boards), asserting the count.

**4. [Minor] Field placement.** The two nudges are declared after `quadRearOffTailOverridden` (the end of `FinAdvancedSpec` and of the pasteable source) rather than after `rearToeOverride`. Key order has no effect; this keeps the existing fields' order untouched.

**5. [Ruling] Commit trailer and SUMMARY.** Commits end with `Co-Authored-By: Claude Sonnet 5.5` per the orchestrator's ruling (the plan text named Opus 5.5), and this SUMMARY is committed in the worktree (the plan said uncommitted) per the same ruling.

**6. [Scope] Metric on phones.** Metric is proven on desktop and Android, as the plan says; the iPhone project runs the same code path and is skipped there with a one-line reason. The real-finger tap is Android only (Playwright's WebKit has no touch drag, as `slider-touch.spec.ts` already records).

No auth gates. No stubs. No package changes.

## Verification (commands and counts)

- `npx vitest run --testTimeout=30000`: **157 files passed, 5960 tests passed, 2 skipped**. (A plain `npx vitest run` while the sibling task and Playwright were also running timed out five or six of the heavy untouched `blank-fit` / `round-tip` tests at the default 5s; they pass alone: `blank-fit.test.ts` + `round-tip.test.ts` 116/116.)
- Targeted: `fins.test.ts` + `fins-imported.test.ts` 596 passed (golden parity suites included); `fin-off-rail-saved-board.test.ts` 4 presets x old-board proof plus tolerance cases; `preset-source.test.ts` round-trip with both nudges.
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- `git diff --exit-code HEAD -- lib/geometry/__fixtures__ e2e/desktop-baseline.spec.ts-snapshots scripts/extract-prototype-fins-golden.mjs`: clean (never ran `npm run golden`).
- `PW_PORT=3161 IS_WEBPACK_TEST=1 npx playwright test e2e/fins-off-rail.spec.ts` (all three projects): **15 passed, 18 skipped** by design (desktop-only and phone-only describes).
- `desktop-baseline.spec.ts` + `volume-fins-panels.spec.ts` (desktop): **15 passed** (the FINS picture unchanged).
- `board-lock-screens.spec.ts -g s-fins`: **1 passed** (desktop; 2 phone projects skip it by design).
- `phone-fins-labels.spec.ts` (iphone + android): **4 passed, 2 skipped** (desktop-only cases).
- Rule 1 sweep: every `OffRail` line in `components/fins/fin-controls.tsx` is a read of `resolved.*` / `flags.*`, a call to `offRailTunerRangeIn(` with `OFF_RAIL_TUNER_STEP_IN`, or `updateAdvanced({ ...OffRailNudge: ...toMm(v) })`; no `+` or `-` on an off-rail figure.
- Files changed are exactly the plan's `files_modified`; none of sibling 261018-dvu's files are touched. `design-snapshot.ts` hunks: the rule count, rule 9, two schema lines.
- Port 3161 was left free; no watcher or dev server remains.

## Human verification deferred to the founder's review

I did not ask a human to look at anything during the run. Worth a look in the browser:

1. The new rows on a real phone: that `Off-Rail — 1 3/16"` and the two hints fit one line each beside the other FINS rows, and the thumb feels right (especially the rear slider, whose dot should rest mid-track on a stock board).
2. Dragging each slider on the FINS drawing: the fin pair gliding in and out, and the callout following.
3. A quad on a preset (Shortboard, McKee SB/Gun): drag the rear Off-Rail slider and watch the DATA tab's Off-Stringer figure and the spread callout move, and the toe-in change.
4. Whether dropping the bracketed note from the Aft/Forward labels reads the way you want.
5. TEMPLATE's fin marks, the phone's screen tiles, and the Summary order form after a nudge (the numbers come from the one calculation, but I did not screenshot those screens).

## Known Stubs

None.

## Threat Flags

None. The only new input crossing a trust boundary is the two saved numbers, covered by the plan's threat register (read forgivingly, held by the engine).

## Self-Check: PASSED

- Files: `e2e/fins-off-rail.spec.ts`, `lib/models/fin-off-rail-saved-board.test.ts`, `lib/geometry/fins.ts`, `components/fins/fin-controls.tsx` all present.
- Commits `e267b3e7`, `4af3a965`, `940a574e` present in `git log`.
