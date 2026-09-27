---
phase: 12-foil-the-way-a-shaper-cuts-it
review: .planning/phases/12-foil-the-way-a-shaper-cuts-it/12-REVIEW.md
fixed_at: 2026-09-26T21:12:00Z
iteration: 1
findings_in_scope: 8
counts:
  fixed: 5
  skipped: 3
status: complete
---

# Phase 12: Code Review Fix Report

**Fixed at:** 2026-09-26
**Source review:** `.planning/phases/12-foil-the-way-a-shaper-cuts-it/12-REVIEW.md`
**Where it ran:** the main checkout, on branch `foil-real-shaping`. No worktree was used, so every
number below can be reproduced from this tree.

**Scope:** both warnings (WR-01, WR-02), plus IN-01, IN-05 and IN-06. IN-02, IN-03 and IN-04 were
skipped by the orchestrator's ruling.

| Finding | Commit | Outcome |
|---|---|---|
| WR-01: a Deck fine-tune bigger than the Deck Skin led to a dead-end flag | `708dcd2` | fixed |
| WR-02: the Deck Skin copy said the deck comes off evenly | `c4e18ce` | fixed, with deviations (see below) |
| IN-01: stale "scaled" comments | `26e6840` | fixed (comments only) |
| IN-05: the check scripts printed the raw driver error | `a687abb` | fixed |
| IN-06: trivial leftovers | `2b6ccf6` | fixed (no baseline re-recorded) |
| IN-02: the D-18 reason names the wrong cause in two rare cases | — | skipped (orchestrator ruling) |
| IN-03: saved-board Deck Skin bounds wider than the control | — | skipped (orchestrator ruling) |
| IN-04: a Phase 11 tab left open across the deploy | — | skipped (orchestrator ruling) |

## Fixed Issues

### WR-01: A Deck tweak bigger than the Deck Skin left the shaper at a dead end

**Files modified:** `lib/geometry/blank-fit.ts`, `lib/geometry/blank-fit.test.ts`,
`lib/geometry/blank-reasons.ts`, `lib/geometry/blank-reasons.test.ts`,
`components/rocker/blank-flag.tsx`, `e2e/rocker-cut.spec.ts`
**Commit:** `708dcd2`

**What changed:**
- The private `cannotFitAnywhere` is now the exported `tweakExceedsDeckSkin`. The body and the doc
  comment are unchanged, and both call sites (`judgeWith`, `nearestFittingPlacement`) use it. A new
  unit test inside the existing D-13 describe checks four cases:
  - Skin + 1/16" at the nose is true, and so is the same at the tail.
  - Exactly the skin is false.
  - The same tweak on the Bottom is false.
  - A negative tweak is false.
- New `tweakOverSkinLine(tweak, skin, system)` in `blank-reasons.ts`. It formats the tweak with
  `formatSignedMark` and the skin with `formatMark`, and has no trailing full stop (the file's
  convention). It is tested in both systems, and every expected string is built from those same
  formatters. The test also confirms Imperial reads `+3/16"` and `1/8"`, and Metric reads whole
  millimetres.
- In `blank-flag.tsx`, a new first branch catches this case. When the tweak is over the skin, the
  flag shows:
  - the headline `FLAG_HEADLINES.doesNotFit`;
  - the body `tweakOverSkinLine(max of the two 12" offsets, the board's own skin)` plus a full stop;
  - one `↺ Reset Fine-Tune` button (same `ACTION_CLASS` and outline variant as the other flag
    buttons), wired to the store's `resetFineTune`.

  There is no Change Fit Rules button on this branch. `FlagBlock` gained an optional `flag` prop,
  which renders as `data-flag`; this branch sets `data-flag="tweak-over-skin"`.
- New e2e test in `rocker-cut.spec.ts`:
  1. It reads the Deck Skin off its label, then nudges Nose @ 12" up one step at a time until the
     tweak it reads off the row is larger than the skin. Each step waits for the row to change,
     inside `toPass()`; there are no sleeps.
  2. It checks the flag shows "more than this board's", has exactly one `↺ Reset Fine-Tune` and no
     `Change Fit Rules`.
  3. It taps Reset and checks the flag disappears, the row reads "No tweak" and the picked card is
     still there.

  It passes on iPhone, Android and desktop.

**Placement choice (not a deviation, flagged for visibility):** the new branch runs ahead of the
F3/F4 floor branches too, not only ahead of F1/F5. A board whose tweak is over its skin fits no
blank anywhere. Without this ordering, a floor-failing blank would still end in the F5 "Change Fit
Rules" dead end that WR-01 is about.

### WR-02: The Deck Skin copy said the foam off the deck is the same at every station

**Files modified:** `components/rocker/board-on-blank.tsx`, `components/fit-defaults-dialog.tsx`,
`e2e/rocker-cut.spec.ts`
**Commit:** `c4e18ce`

**What changed:**
- **Sidebar hint.** `deckTweaked` is computed from the store's blank: fine-tune surface Deck and
  either 12" offset non-zero. The Deck Skin hint now reads:
  - Tip Style Bottom: "Off the deck — more at the tips" (byte-identical to before).
  - Tweaked on the Deck: the new line.
  - Otherwise: "Off the deck at every station" (byte-identical to before).
- **Header comment.** The comment at the old line 27 now says the deck is the Deck Skin at every
  station until a 12" fine-tune on the Deck changes it. It also notes the Bottom tip thinning and
  the negative tip case (D-16), and names the DATASHEET's FOAM OFF · Deck row for the per-station
  numbers. The "Its hint says…" paragraph above it is updated to match.
- **Dialog hint.** The Fit & Tip Defaults Deck Skin hint now reads: "Taken off the blank's deck,
  the same at every station until a board's 12" fine-tunes move it."
- **e2e.** The existing "Fine-tune off" test now also checks two things. After its Deck tweak, the
  new hint shows. After switching to Bottom, "Off the deck at every station" is back. No e2e quoted
  the old dialog sentence (`grep -rn "the same at every station" e2e/` was empty).

**Deviation to review:**
1. **Sidebar hint wording.** The design's string was `Off the deck — a 12" fine-tune changes it
   there; the DATASHEET's Deck row has the numbers`. Rule 2 means the station has to go through
   `stationLabel(system)`, which reads `30.5 cm` in Metric. That makes the designed string 93
   characters in Metric, over the 90-character cap. The shipped string keeps both rules:
   `Off the deck — a ${stationLabel(system)} fine-tune changes it there; see the DATASHEET's Deck row`.
   That is 78 characters in Imperial and 82 in Metric.
2. **Dialog hint in Metric.** The design's literal `12"` would have printed inches in Metric. To
   keep Rule 2, `FieldCopy.hint` may now be a function of the system as well as a fixed string. The
   Deck Skin hint uses `stationLabel(system)`, so Imperial reads exactly the designed sentence and
   Metric reads `30.5 cm`. The other hints are unchanged.

The OFF DECK column was not added. That is a layout change for the founder to decide, as the
design said.

### IN-01: Stale "scaled" comments

**Files modified:** `components/design/design-store.tsx`, `components/rocker/rocker-datasheet.tsx`
**Commit:** `26e6840`
**Applied fix:** The three comments now describe the thickness cut from the blank: the blank's
thickness less the Deck Skin and the centre gap, plus any fine-tune at the 12" stations. Comments
only.

### IN-05: The check scripts printed the raw driver error

**Files modified:** `scripts/check-preference-columns.ts`, `scripts/check-saved-boards.ts`
**Commit:** `a687abb`
**Applied fix:**
- Each script has a local `describeFailure(error)` that prints the error's `name` and `code` (when
  present), followed by "Run again with --verbose to see the database driver's own message."
- With `--verbose` in `process.argv`, the driver's message is appended instead.
- Both header comments say so.
- `npx tsc --noEmit` is clean. Neither script was run, since both need a database.

### IN-06: Trivial leftovers

**Files modified:** `lib/geometry/blank-fit.ts`, `e2e/desktop-baseline.spec.ts`
**Commit:** `2b6ccf6`
**Applied fix:**
- Removed the doubled blank line after `judgeWith`'s early exit.
- Removed the empty ` *` line that opened the desktop-baseline header.
- Added "(Confirmed identical under the main checkout's Turbopack run on 2026-09-26.)" to the ROCKER
  re-record note.
- No baseline image was touched or re-recorded.

## Skipped Issues

### IN-02: The D-18 reason blames "this blank is too thick" whatever thinned the board

**File:** `lib/geometry/blank-reasons.ts:103-109`
**Reason:** Orchestrator ruling. The D-18 sentence is the founder's own wording. Which cause to name
when a negative tweak, or a run past the blank's end, thins the board is a copy question for the
founder at the walk-through.
**Original issue:** `runsOut` fires whenever the board would run under 1/8". That includes a
negative 12" tweak and a board running past the blank's end, but the sentence always says the blank
is too thick for the centre.

### IN-03: The saved-board Deck Skin bounds (0-50 mm) are wider than the control (1/16"-1/2")

**File:** `lib/models/design-snapshot.ts:173-196`
**Reason:** Orchestrator ruling. Tightening the snapshot bound to the control's range would let a
saved board fail to open, against R9 (every saved board still opens). The ±50 mm bound is the
deliberate tolerate-and-migrate contract. This is a founder question, not a fix.
**Original issue:** a crafted save can store a skin no control can produce.

### IN-04: A Phase 11 tab left open loses Restore Defaults and can overwrite the new cookie keys

**File:** `lib/fit-defaults-preference.ts:190-205`, `app/actions/fit-defaults.ts:44-56`
**Reason:** Orchestrator ruling. This is a deploy-transition edge for browser tabs left open across
the update. It belongs in the ship checkpoint's deploy notes, not in code.
**Original issue:** a stale tab's Restore Defaults is silently rejected, and its cookie write drops
the Phase 12 keys.

## Test Results

All runs were in the main checkout. None used `IS_WEBPACK_TEST` or `PW_PORT`.

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx vitest run` (full) | 74 files, 2,984 passed, 2 skipped (was 2,977 before; +7 new tests) |
| `npm run lint` | 0 errors, 11 warnings, all in files outside this phase (unchanged) |
| `npx playwright test e2e/rocker-cut.spec.ts e2e/fit-defaults.spec.ts e2e/rocker-blanks.spec.ts` | 77 passed, 1 skipped (the phone-only touch-size test on the desktop profile, skipped by design) |
| `npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` | 5/5 passed, no `--update-snapshots` |

## Other note for the orchestrator

**Commit trailer.** The five fix commits end with `Co-Authored-By: Claude Opus 5.5 (1M context)
<noreply@anthropic.com>`, not the requested `Claude Fable 5.1`. The harness attribution for this
session names the model that actually wrote them, and only the user can override it. If you want
the trailer changed, amend the five commits `708dcd2..2b6ccf6`.

---

_Fixed: 2026-09-26_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

## Orchestrator ruling on the deviations (2026-09-26)

Both WR-02 wording deviations are accepted: the sidebar hint and the dialog hint name the 12" station
through `stationLabel(system)` from `lib/geometry/measure-display.ts`, which is how the app already
writes that station for a Metric shaper (`30.5 cm`, an honest conversion of `MEASURE_STATION_MM`).
That is the house convention, not a new one, and it keeps Rule 2. The flag's placement ahead of the
F3/F4 "too short / too thin" branches is accepted for the reason the fixer gave: a blank that is also
too short must not end at the Change Fit Rules dead end either.

The five fix commits carry the fixer's own model attribution in their trailer (`Claude Opus 5.5 (1M
context)`) rather than the phase's `Claude Fable 5.1` line; both are honest, and the founder can amend
`708dcd2..2b6ccf6` before the merge if a single trailer is wanted.

Gate after the fixes, on the branch: `npx tsc --noEmit` clean, `npm run build` passed, `npx vitest run`
74 files / 2984 passed / 2 skipped, `npm run lint` 0 errors; the full Playwright suite's post-fix result
is recorded in 12-VERIFICATION.md's orchestrator addendum.
