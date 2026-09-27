---
phase: 12-foil-the-way-a-shaper-cuts-it
reviewed: 2026-09-27T03:57:49Z
depth: standard
files_reviewed: 56
files_reviewed_list:
  - app/actions/fit-defaults.ts
  - app/design/actions.ts
  - app/page.tsx
  - components/design/design-store.test.ts
  - components/design/design-store.tsx
  - components/fit-defaults-dialog.tsx
  - components/fit-defaults-provider.tsx
  - components/rocker/blank-flag.tsx
  - components/rocker/blank-picker.tsx
  - components/rocker/board-on-blank.tsx
  - components/rocker/rocker-controls.tsx
  - components/rocker/rocker-datasheet.tsx
  - components/rocker/rocker-editor.tsx
  - components/rocker/rocker-viewer.tsx
  - components/rocker/use-blank-list.ts
  - components/settings-menu.tsx
  - components/viewer/two-option-toggle.test.ts
  - components/viewer/two-option-toggle.tsx
  - drizzle/0006_deck_skin_planer_tip_style.sql
  - e2e/desktop-baseline.spec.ts
  - e2e/fit-defaults.spec.ts
  - e2e/phone-rails.spec.ts
  - e2e/rocker-blanks.spec.ts
  - e2e/rocker-cut.spec.ts
  - e2e/touch-sizing.spec.ts
  - lib/blanks/preset-blanks.test.ts
  - lib/blanks/preset-blanks.ts
  - lib/db/fit-defaults-save.test.ts
  - lib/db/queries.ts
  - lib/db/schema.ts
  - lib/fit-defaults-preference.test.ts
  - lib/fit-defaults-preference.ts
  - lib/fit-defaults-server.ts
  - lib/geometry/__fixtures__/phase11-foil-golden.json
  - lib/geometry/blank-fit.test.ts
  - lib/geometry/blank-fit.ts
  - lib/geometry/blank-reasons.test.ts
  - lib/geometry/blank-reasons.ts
  - lib/geometry/blank.ts
  - lib/geometry/board-profile.test.ts
  - lib/geometry/board-profile.ts
  - lib/geometry/design.test.ts
  - lib/geometry/design.ts
  - lib/geometry/measure-display.test.ts
  - lib/geometry/measure-display.ts
  - lib/geometry/phase11-foil.test.ts
  - lib/geometry/phase11-foil.ts
  - lib/geometry/presets.test.ts
  - lib/geometry/volume.test.ts
  - lib/models/design-snapshot.test.ts
  - lib/models/design-snapshot.ts
  - lib/models/rack-models.test.ts
  - lib/models/rack-models.ts
  - scripts/check-preference-columns.ts
  - scripts/check-saved-boards.ts
  - scripts/extract-phase11-foil-golden.ts
findings:
  critical: 0
  warning: 2
  info: 6
  total: 8
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-09-27T03:57:49Z
**Depth:** standard
**Files Reviewed:** 56
**Status:** issues_found

## Summary

Reviewed the phase's diff (`42739673..HEAD`, branch `foil-real-shaping`) for all 56 files, reading the
geometry in full and the components, server paths, scripts and specs through their diffs. I ran
`npx tsc --noEmit` (clean), `npx vitest run lib components` (74 files, 2,977 passed, 2 skipped) and
`npm run lint` (0 errors; the 11 warnings are all in files outside this phase).

**Geometry against the decisions.** I traced every surface through `boardOnBlank`
(`lib/geometry/blank-fit.ts:283-397`) and found no sign error:
- The board's deck plus its thickness equals the blank's deck less the skin plus any Deck tweak, in
  all four combinations of Tip Style and fine-tune surface.
- `deckOffAt` and `bottomOffAt` move the correct surface under both Tip Styles, including the
  negative thinning D-16 allows.
- `bottomAt` in `board-profile.ts` cancels both the thinning and a Bottom tweak, so the drawn blank
  keeps its own rocker.
- The tips read exactly their settings, and nothing at or inside a 12" station moves.

**Carry-over and checks.**
- The carry-over (`phase11-foil.ts`, `design-snapshot.ts:377-440`) sets its trigger from the blank's
  shape, not the version number. Offsets are clamped to ±50 mm after they are computed, and the
  result re-parses.
- The D-18 check samples every 1/4" from tip to tip, so it covers both tip windows.
- The over-skin early exit (`cannotFitAnywhere`) is exact, because the fine-tune bump peaks at the
  12" station, where the tip ease weighs nothing.

**Settings, server paths and rule checks.**
- The fit-defaults allow-list refuses a patch that carries `extraCenterThickness`
  (`fit-defaults-preference.ts:194`).
- Every server path takes the shaper's identity from `auth()` alone.
- The Tip Style lookup fails soft on both layers.
- No `25.4` or `/10` leaked outside `units.ts` / `measure-display.ts`.
- Nothing under `lib/geometry/` imports React, a browser API or the database.
- Neither check script prints a connection string, a snapshot or a board name.

**Timing.** I measured the list's judging time for all 12 combinations of cut and tweak over the
full seeded catalogue: 22-87 ms in Node. There is no freeze-class regression.

**Two warnings, both about what the screen tells a shaper to do.** First, a Deck tweak bigger than
the Deck Skin ends in a flag whose only button, Change Fit Rules, cannot fix it. This is reachable
from the slider on any new board, and it is what about nine in ten carried-over Phase 11 boards
will open with. Second, the Deck Skin copy says the foam off the deck is the same at every station,
which is not true once a Deck tweak is set — and the sidebar has no deck readout to show otherwise.

## Warnings

### WR-01: A Deck tweak bigger than the Deck Skin leaves the shaper at a dead end — "Change Fit Rules" cannot fix it

**File:** `components/rocker/blank-flag.tsx:84-93` (with `lib/geometry/blank-fit.ts:595-598`, `lib/geometry/phase11-foil.ts:95-130`)

**Issue:** When a board's fine-tune surface is Deck and either 12" tweak is larger than its Deck
Skin, no blank in any catalogue can take it (`cannotFitAnywhere`): the deck at that 12" station
sits `skin − tweak` below every blank's deck, at every placement.

What the shaper sees:
- Every row in the list goes grey with "… too thin 12" from the nose".
- `nearestFit` gets an empty `fits` list and returns null.
- The flag drops to F5: "No blank in the three catalogs fits this board right now." Its one action
  is **Change Fit Rules**, which opens the account dialog.

Nothing in that dialog can fix the board:
- Extra Length, Planer Max Depth and Width Margin play no part in this failure.
- The dialog's Deck Skin is the default for *new* boards. `useBoardCut` reads the picked board's own
  skin, so changing the dialog does nothing to this board.

The real fixes are all on ROCKER, and the flag names none of them: raise this board's Deck Skin to
at least the tweak, press ↺ Reset Fine-Tune, or switch Fine-tune off to Bottom.

How often this happens:
- **From the slider.** At the default 1/8" skin, any upward tweak past 1/8" triggers it, and the
  slider reaches +1/4" — so half its upward travel.
- **On carried-over boards.** I ran `carryPhase11Blank` over the 39 golden cases in
  `phase11-foil-golden.json`: 34 of 39 come out with a Deck tweak above 1/8". That is to be
  expected: Phase 11's scaled 12" thickness is always at least the parallel cut's, by
  `(U − b)(1 − t/U) ≥ 0`, so the carried tweak is positive. So about nine in ten carried boards
  open with every blank greyed out and this dead-end flag.

D-14 accepted that carried boards open flagged. But UI-SPEC §10 promises "the existing flag and
offer (F1/F2/F4) say so", and for these boards there is never an offer. The only button points at
the wrong settings.

**Fix:**
- Export the predicate from `blank-fit.ts` under a public name, with tests. It is pure geometry
  already.
- Add a reason in `blank-reasons.ts`.
- Give the flag its own branch ahead of F1/F5:
```tsx
// blank-fit.ts
export function tweakExceedsDeckSkin(board: BoardOnBlankInput): boolean { /* body of cannotFitAnywhere */ }

// blank-reasons.ts
export function tweakOverSkinMessage(tweak: Mm, skin: Mm, system: UnitsSystem): string {
  return `Your ${formatSignedMark(tweak, system)} tweak is more than your ${formatMark(skin, system)} deck skin, ` +
    `so the deck would rise above the blank's. Raise the Deck Skin, take the tweak off the Bottom, or reset it.`;
}

// blank-flag.tsx, before the F1/F5 path
if (tweakExceedsDeckSkin(ctx.board)) {
  return (
    <FlagBlock headline={FLAG_HEADLINES.doesNotFit} body={tweakOverSkinMessage(maxTweak, deckSkin, system)}>
      <Button variant="outline" className={ACTION_CLASS} onClick={resetFineTune}>↺ Reset Fine-Tune</Button>
    </FlagBlock>
  );
}
```
Also bring the carry-over consequence (the whole list greyed out, no offer) to the founder at the
walk-through. It is broader than the "opens flagged" that D-14 measured.

### WR-02: The Deck Skin copy says the foam off the deck is the same at every station, and it isn't once a Deck tweak is set

**File:** `components/rocker/board-on-blank.tsx:27`, `components/rocker/board-on-blank.tsx:151`, `components/fit-defaults-dialog.tsx:72`

**Issue:** Three places tell the shaper the deck comes off uniformly:
- The sidebar hint under Pin deck reads "Off the deck at every station".
- The Fit & Tip Defaults hint reads "Taken off the blank's deck, the same at every station."
- The section's own header justifies having no deck column: "The deck needs no column: the foam off
  the deck is the Deck Skin, printed just above."

But `deckOffAt = skin + (Bottom ? thinning : 0) − (Deck surface ? tweak : 0)` (`blank-fit.ts:394`).
Deck is the default fine-tune surface, so any non-zero 12" tweak changes the foam off the deck
there, eased along the half. At a 1/8" skin, a +1/16" nose tweak leaves 1/16" to come off the deck
at the nose 12". A +1/8" tweak leaves nothing to come off there at all.

The sidebar readouts show only OFF BOTTOM, so a shaper working from the sidebar reads a uniform 1/8"
and would plane the deck 1/16" too low at the 12" station. Only the DATASHEET's FOAM OFF · Deck row
shows the true number. These are numbers a shaper cuts foam to (the product's core value).

**Fix:** Either:
- add an OFF DECK column beside OFF BOTTOM in the sidebar readouts
  (`view.foamOffDeck[key]` already exists, with the same warning ink for a negative value); or
- at minimum, make the copy conditional:
```tsx
const deckTweaked = view.cut.fineTuneSurface === "deck" && (blank.nose12Offset !== 0 || blank.tail12Offset !== 0);
leftHint={
  view.cut.tipStyle === "bottom" ? "Off the deck — more at the tips"
  : deckTweaked ? "Off the deck — less or more where you've tweaked"
  : "Off the deck at every station"
}
```
Then correct the header comment at line 27 and the dialog hint at `fit-defaults-dialog.tsx:72`,
for example: "Taken off the blank's deck before any 12" tweak."

## Info

### IN-01: Stale "scaled" comments describe Phase 11's retired proportional foil

**File:** `components/design/design-store.tsx:323`, `components/design/design-store.tsx:840`, `components/rocker/rocker-datasheet.tsx:249-250`

**Issue:** Three comments still describe Phase 11's foil, which this phase replaced with the parallel
cut:
- "added to the blank-scaled thickness at that station"
- "the blank's scaled foil exactly as drawn"
- "the 12" stations are the blank-scaled result plus any fine-tune"

**Fix:** Reword each to "the thickness cut from the blank" (the blank's thickness less the skin and
the centre gap).

### IN-02: The D-18 reason blames "this blank is too thick" whatever actually thinned the board

**File:** `lib/geometry/blank-reasons.ts:103-109`, `lib/geometry/blank-fit.ts:445`

**Issue:** `runsOut` fires whenever `thicknessAt(s)` drops under 1/8". That includes:
- a negative 12" tweak, or a carried-over negative residual (3 of the 39 golden cases carry one);
- the board running past a blank's end, where the blank reads 0 thick. Today only a failed floor
  can get there.

Each time, the sentence says "this blank is too thick for a {center} center". The founder's D-18
wording only fits the thin-centre-in-a-thick-blank case. It is unlikely today, but the wording is
wrong for the other two.

**Fix:** Only use the "too thick for this center" clause when the tweak at that station is 0 and the
station is on the foam. Otherwise fall back to a neutral line, such as "Less than 1/8" would be left
{where}".

### IN-03: The saved-board bounds for Deck Skin (0-50 mm) are far wider than the control (1/16"-1/2")

**File:** `lib/models/design-snapshot.ts:173-196`

**Issue:** A crafted save can store a 0 mm or 50 mm skin that no control can produce:
- The Deck Skin slider's imperial `measureSlider` passes such a value through unclamped.
- A 0 skin quietly drops the "one deck pass" half of D-10.

This does no harm to data, but the parser is looser than the contract it guards.

**Fix:** Bound `deckSkin` by `FIT_DEFAULTS_RANGE_IN.deckSkin` through `inchesToMm`, with the usual
1e-6 slack, the same way `parseFitDefaultValue` does.

### IN-04: A browser tab left open from Phase 11 loses its Restore Defaults, and can overwrite the new cookie keys

**File:** `lib/fit-defaults-preference.ts:190-205`, `app/actions/fit-defaults.ts:44-56`

**Issue:** A Phase 11 tab still running after the deploy behaves badly in two ways:
- Its Restore Defaults sends all five of its keys, including `extraCenterThickness`.
  `parseFitDefaultsPatch` rejects the whole patch, and the action returns quietly. The account keeps
  its values, and the next page load undoes the "restore".
- That tab's cookie write stores its own five keys only. A signed-out shaper's Phase 12 picks
  (Deck Skin, Planer Max Depth, Tip Style) are then dropped from the cookie.

This is transient and only affects stale tabs, but it is silent.

**Fix:** Either accept (and ignore) a `null` `extraCenterThickness` in a patch, or log the
rejection server-side so it can be found. Otherwise record it as accepted with the stale-tab risks
in 12-10's deploy notes.

### IN-05: The check scripts print the raw driver error, which can name the database host

**File:** `scripts/check-preference-columns.ts:99-103`, `scripts/check-saved-boards.ts:205-208`

**Issue:** Both print `error.message` on failure. For a connection failure, the Neon or pg message
typically includes the endpoint host (for example `getaddrinfo ENOTFOUND ep-…-pooler….neon.tech`).
That is not a secret, but the scripts promise never to print any part of the connection string, and
the production run is done with the founder watching.

**Fix:** Print a fixed sentence plus `error.name` / `error.code`, and only print the message when a
`--verbose` flag is set.

### IN-06: Trivial leftovers

**File:** `lib/geometry/blank-fit.ts:611-612`, `e2e/desktop-baseline.spec.ts:4`

**Issue:**
- `judgeWith` has a doubled blank line after the early exit.
- The desktop-baseline header now opens with an empty ` *` line before "RE-RECORDED".
- `rocker-desktop.png` was recorded under the webpack dev server in a worktree. The comment already
  says this, and that the main checkout's Turbopack run may need to re-record ROCKER once.

**Fix:** Drop the extra blank lines. Re-record the ROCKER baseline from the main checkout if the
orchestrator's Turbopack run disagrees.

---

_Reviewed: 2026-09-27T03:57:49Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
