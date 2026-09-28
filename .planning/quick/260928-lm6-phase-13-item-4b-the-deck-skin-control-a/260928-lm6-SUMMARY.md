---
phase: quick-260928-lm6
plan: 01
status: complete
subsystem: rocker / fit-defaults
tags: [deck-skin, copywriting, blank-fit, fit-defaults, rocker]
dependency-graph:
  requires: [quick-260928-j00]
  provides: [FD-5, FD-6, FD-7, FD-8]
  affects: [components/rocker/board-on-blank.tsx, lib/geometry/blank-reasons.ts, lib/fit-defaults-preference.ts]
tech-stack:
  added: []
  patterns: ["prints-as-zero word substitution (takesNoDeckSkin, following formatPlacement's `centered`)"]
key-files:
  created: []
  modified:
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - components/rocker/board-on-blank.tsx
    - lib/fit-defaults-preference.ts
    - lib/fit-defaults-preference.test.ts
    - lib/models/design-snapshot.test.ts
decisions:
  - "Deck Skin control opened from 1/16\"-1/2\" to 0\"-1\" (Metric 0-25 mm), the founder's cap after first asking for the full 0-50 mm range"
  - "0 means the board takes no deck skin; every line that mentions the skin says so in words (`none`), never as `0\"` / `0 mm`"
actuals:
  tokens: 8400
  tasks: 2
  commits: 2
---

# Phase 13 Plan 4b: The Deck Skin Control (0"-1") Summary

The Deck Skin slider on ROCKER and the Deck Skin box in Fit & Tip Defaults now run from **none**
up to **1"** (0 to 25 mm in Metric) instead of stopping at 1/16"-1/2". At zero, every sentence
that used to quote a skin now says in plain words that the board takes no deck skin, instead of
ever printing `0"` or `0 mm` of skin. Nothing already saved anywhere is silently changed: a board
saved with a thicker skin than the new control offers still opens showing exactly what it was
saved with, and every account default a shaper saved before today still reads back exactly.

## Every changed line, verbatim

Imperial and Metric, using the out-of-the-box rules (2" extra length, 1/8" Planer Max Depth) and
the test file's empty-list board (4 3/4" centre, thickest blank 4 7/8"). All of these are printed
directly by the passing tests above — nothing here was hand-typed independently of them.

| Where | Today at a 1/8" skin (unchanged at any non-zero skin) | At 0, Imperial | At 0, Metric |
|---|---|---|---|
| ROCKER slider label | `Deck Skin — 1/8"` / `Deck Skin — 3 mm` | `Deck Skin — none` | `Deck Skin — none` |
| ROCKER slider hint, Pin deck, no Deck fine-tune | `Off the deck at every station` | `Nothing off the deck at any station` | `Nothing off the deck at any station` |
| WR-01 flag (tweakOverSkinLine; the flag adds the full stop) | `Your +3/16" fine-tune is more than this board's 1/8" Deck Skin, so the deck would sit above any blank's deck there. Raise the Deck Skin, reset the fine-tune, or take it off the Bottom` | `Your +1/16" fine-tune raises the deck, but this board takes no Deck Skin, so the deck would sit above any blank's deck there. Add a Deck Skin, reset the fine-tune, or take it off the Bottom` | `Your +2 mm fine-tune raises the deck, but this board takes no Deck Skin, so the deck would sit above any blank's deck there. Add a Deck Skin, reset the fine-tune, or take it off the Bottom` |
| F4 flag (floorShortfallMessage "center") | `It's 1/16" too thin at the center — there isn't room for your 1/8" deck skin and a 1/8" bottom pass.` | `It's 1/16" too thin at the center — there isn't room for your 1/8" bottom pass.` | `It's 2 mm too thin at the center — there isn't room for your 3 mm bottom pass.` |
| E2 empty list (emptyListMessage "thickness") | `Your center is 4 3/4" and the thickest blank is 4 7/8" at the center, so none leaves room for a 1/8" deck skin and a 1/8" bottom pass. Try a thinner center, or change your Deck Skin or Planer Max Depth.` | `Your center is 4 3/4" and the thickest blank is 4 7/8" at the center, so none leaves room for a 1/8" bottom pass. Try a thinner center, or change your Planer Max Depth.` | `Your center is 121 mm and the thickest blank is 124 mm at the center, so none leaves room for a 3 mm bottom pass. Try a thinner center, or change your Planer Max Depth.` |
| E3 empty list (emptyListMessage "both") | `Nothing in the three catalogs is both 2" longer than your board and thick enough at the center for a 1/8" deck skin and a 1/8" bottom pass.` | `Nothing in the three catalogs is both 2" longer than your board and thick enough at the center for a 1/8" bottom pass.` | `Nothing in the three catalogs is both 51 mm longer than your board and thick enough at the center for a 3 mm bottom pass.` |
| List intro (listIntro) | `Shortest first. Each is at least 2" longer than your board, with room at the center for a 1/8" deck skin and a 1/8" bottom pass. Greyed blanks don't fit somewhere — the line under each says where.` | `Shortest first. Each is at least 2" longer than your board, with room at the center for a 1/8" bottom pass. Greyed blanks don't fit somewhere — the line under each says where.` | `Shortest first. Each is at least 51 mm longer than your board, with room at the center for a 3 mm bottom pass. Greyed blanks don't fit somewhere — the line under each says where.` |

Deliberately unchanged at 0 (still true, so still shown):
- The Bottom Tip Style hint `Off the deck — more at the tips`.
- The Deck-fine-tune hint `Off the deck — a 12" fine-tune changes it there; see the DATASHEET's Deck row`.
- The Fit & Tip Defaults typed box still shows `0"` (Metric `0 mm`) at zero — it's a box a shaper types a number into, not a slider label, so it keeps its number rather than the word.

## FD-6 confirmations, read from the code (file:line)

These were confirmed by reading `blank-fit.ts` and `rocker-datasheet.tsx`, not assumed:

- **Fit check's deck side passes trivially at 0 skin.** `deckOffAt` (`lib/geometry/blank-fit.ts:406`) is `cut.deckSkin + (pinDeck ? 0 : tipThinningAt(s)) - (onDeck ? offsetAt(s) : 0)`. Under Pin deck with no Deck fine-tune, that's `0 + 0 - 0 = 0` at every station, so `thinBy` (`blank-fit.ts:482`, `Math.max(-onBlank.deckOffAt(s), -onBlank.bottomOffAt(s))`) never sees a deck-side shortfall from the skin.
- **Centre floor becomes target plus one bottom pass.** `floorCheck` (`blank-fit.ts:562-572`): `centerShort = board.centerThickness + board.deckSkin + settings.planerMaxDepth - prepared.centerThicknessMm`. At `deckSkin = 0` this is exactly the centre thickness plus one Planer Max Depth pass — the skin term drops out of the floor entirely.
- **`tweakExceedsDeckSkin` still catches any positive Deck fine-tune.** `blank-fit.ts:641-644`: `Math.max(board.nose12Offset, board.tail12Offset) - board.deckSkin > FIT_EPSILON_MM`. At `deckSkin = 0`, any positive fine-tune on the Deck trips it, because the deck cannot rise above the blank's own — which is exactly what the new WR-01 zero sentence explains.
- **DATASHEET's FOAM OFF · Deck row reads `0"` / `0` in muted ink, not warning ink.** `foamOffCell` (`rocker-datasheet.tsx:146-157`): `isZero` prints `formatMarkBare(mm(0), system)` and only a value that pokes out negative (`value < 0 && !isZero`) gets the warning-ink class; a value that prints as zero always keeps `text-surf-ink-muted`. The Deck row (`rocker-datasheet.tsx:270-272`) uses this same cell unchanged, so a table of numbers where zero means nothing comes off reads sensibly with no edit needed there.
- **No deck planer-passes readout exists anywhere today.** `planerPasses` (`lib/geometry/measure-display.ts:115`) has exactly one caller in the whole tree: `components/rocker/board-on-blank.tsx:120`, which counts `view.centerGap` — the BOTTOM. Confirmed by grepping every call site; there is nothing that could read "0 passes" for the deck, so nothing needed changing there.

## The Metric 0-25 mm decision

`FIT_DEFAULTS_RANGE_IN.deckSkin` is now `{ min: 0, max: 1, step: 0.0625 }` (inches). Metric reads
**0 to 25 mm**, not 0-25.4 mm, because the slider is built through `measureSlider`, and
`metricSliderRange` rounds each end inward to a whole millimetre — the same rule every Metric
slider in the app already follows (confirmed: `metricSliderRange({min: 0, max: 1}, 1)` gives
`{ min: 0, max: 25, step: 1 }`). A 1" skin set in Imperial is still stored as 25.4 mm and reads
back as `25 mm` in Metric, with the thumb at the slider's end and nothing written until a drag.

## e2e grep result

Grepped `e2e/` for `Deck Skin —`, `Off the deck`, `deck skin`, `more than this board's`, and any
Home/End/PageDown/ArrowLeft press on the Deck Skin slider specifically:

- `e2e/rocker-cut.spec.ts` only ever presses **ArrowRight** on the Deck Skin slider (nudging it up
  from the 1/8" default), and quotes `Off the deck at every station`, `Off the deck — more at the
  tips`, the Deck-fine-tune hint and `more than this board's` — all at a non-zero skin, all unchanged
  by this plan.
- `e2e/fit-defaults.spec.ts` types `1/4"` and `1/2"` into the Deck Skin box (both well inside the new
  0"-1" range).
- `e2e/rocker-blanks.spec.ts` types `1/2"` into the Deck Skin box, and quotes `deck skin` in a list
  intro that still reflects the (unchanged) 1/8" default.
- `e2e/desktop-baseline.spec.ts`'s ROCKER shot has no blank picked, so there is no Deck Skin slider
  on it, and its quoted list intro is the unchanged 1/8"-default wording.

**No spec drives the skin to zero or pins the old 1/16"-1/2" range, so no e2e edit was made.**

## Gate counts

- `npx vitest run lib/geometry/blank-reasons.test.ts` — 104 passed.
- `npx vitest run lib/fit-defaults-preference.test.ts lib/models/design-snapshot.test.ts` — 110 passed (57 + 53).
- `npm run lint -- --max-warnings 0` — 0 problems.
- `npx tsc --noEmit` — exit 0, no output.
- `npm test` (full suite) — **76 test files passed, 3085 tests passed, 2 skipped (3087 total), 0 failed.**

## Commits

1. `be0d244` — `feat(rocker): plain words when a board takes no deck skin (quick 260928-lm6)`
   (`lib/geometry/blank-reasons.ts`, `lib/geometry/blank-reasons.test.ts`, `components/rocker/board-on-blank.tsx`)
2. `ca7b84c` — `feat(rocker): the Deck Skin control runs from none to 1" (quick 260928-lm6)`
   (`lib/fit-defaults-preference.ts`, `lib/fit-defaults-preference.test.ts`,
   `lib/models/design-snapshot.test.ts`, `components/rocker/board-on-blank.tsx`)

No e2e spec was edited. `design-snapshot.ts`, `blank-fit.ts`, `components/fit-defaults-dialog.tsx`
and `components/rocker/rocker-datasheet.tsx` carry no commits since `b03fb41` (verified by
`git log --format=%h b03fb41..HEAD -- <those four files>` returning empty).

## Deviations from Plan

None — plan executed exactly as written. All measurements matched the plan's plan-time dry run
(the four `fit-defaults-preference.test.ts` failures the dry run predicted were fixed exactly as
described; no other test broke).

## Known Stubs

None.

## Self-Check: PASSED

- `lib/geometry/blank-reasons.ts` — FOUND
- `lib/geometry/blank-reasons.test.ts` — FOUND
- `components/rocker/board-on-blank.tsx` — FOUND
- `lib/fit-defaults-preference.ts` — FOUND
- `lib/fit-defaults-preference.test.ts` — FOUND
- `lib/models/design-snapshot.test.ts` — FOUND
- Commit `be0d244` — FOUND in `git log --oneline --all`
- Commit `ca7b84c` — FOUND in `git log --oneline --all`

---

## Not the executor's — the orchestrator runs these afterwards

1. Gates on main: `npm run build` (main checkout), then `npm run test:e2e` and `npm run test:e2e:prod`.
   Expected: no spec edits needed. rocker-cut.spec.ts only nudges the skin up from 1/8" and quotes
   the non-zero hints and the `more than this board's` flag, all unchanged. fit-defaults.spec.ts
   types 1/4" and rocker-blanks.spec.ts types 1/2", both inside 0"–1". The desktop ROCKER baseline
   has no blank picked, so no Deck Skin slider is on it and the list intro still quotes the 1/8"
   default: expected unchanged. If it moves, inspect the diff before re-recording.
2. Review stop with the founder. Show the verbatim table and the three choices made here:
   - `none` rather than `0"` on the slider (the `centered` precedent);
   - the Pin-deck hint `Nothing off the deck at any station`;
   - E2 dropping "your Deck Skin" at none.
   Also show two consequences a shaper will notice: at none, the foam the skin used to take comes off
   the bottom instead, so the centre's OFF BOTTOM grows and the passes line can read one more; and
   more blanks fit, because the centre floor drops by the skin. Note that Fit & Tip Defaults' typed
   box shows `0"` (`0 mm`) at none.
3. No schema change and no migration. Push only on the founder's go. Then the 13-SPEC Progress Log
   row 4b, STATE.md, and the docs commit carrying this PLAN and SUMMARY.
