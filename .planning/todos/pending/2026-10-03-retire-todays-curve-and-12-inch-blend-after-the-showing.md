---
created: 2026-10-03T00:00:00.000Z
title: Retire today's curve and 12-inch blend after the showing
area: rocker
severity: minor
files:
  - lib/geometry/blank-fit.ts
  - lib/geometry/board-profile.ts
  - lib/geometry/design.ts
  - lib/geometry/before-after.ts
  - lib/geometry/phase11-foil.ts
  - lib/geometry/phase14-today.test.ts
  - lib/geometry/phase14-today-handset.test.ts
  - lib/geometry/phase14-curves.test.ts
  - lib/geometry/tip-flow.test.ts
  - lib/geometry/before-after.test.ts
  - scripts/phase14-before-after.ts
  - scripts/check-saved-boards.ts
---

# Retire today's curve and 12-inch blend after the showing

Phase 14 changed how the app draws a blank (the square-root curves, go-live 1) and how it thins each
tip (the steady taper from each tip's Thinning Starts point, go-live 2). The old ways were kept,
callable only by name, so the before-and-after pictures, the saved-boards report and the record of
the live site's numbers could show what moved (decision D-25). Plan 14-10 removes nothing. This note
says what comes out once the Oct 10 showing is done.

## 1. Remove the old rules (D-25)

After the showing, remove:

- `prepareBlankPchip`: a blank drawn with pchip straight through its printed values.
- The `handSetCurve` option (`"pchip"`): a board with no blank drawn with pchip through its five numbers.
- The `tipRule` option and its `"blend"` branch in `boardOnBlank`: the S-shaped ease over the last 12"
  at each tip. `TIP_EASE_WINDOW_MM` goes with it, but Phase 11's conversion (`phase11-foil.ts`) still
  reads the 12" station, so it should read `MEASURE_STATION_MM` instead.
- `RULES_BEFORE_CURVES`, and `RULES_BEFORE_TIPS` if a later plan adds it, in `before-after.ts`.
- The parts of the scripts and tests that exist only to prove those rules. That means the pin's
  reproduction tests (`phase14-today.test.ts`, `phase14-today-handset.test.ts`, and the "today's rules
  reproduce the pin" block in `before-after.test.ts`), the comparison against the blend in
  `tip-flow.test.ts` and `phase14-curves.test.ts`, the `--curves-report` option of
  `scripts/check-saved-boards.ts` (and a tips report, if a later plan adds one), and the "before" side
  of `scripts/phase14-before-after.ts`.

Keep the pin file itself (`lib/geometry/__fixtures__/phase14-today-golden.json` and its generator)
as a record of what the site showed before Phase 14.

One thing to watch: `phase11-foil.ts` prepares a Phase 11 board's blank with `prepareBlankPchip`,
because Phase 11 boards were drawn on that curve. Removing the function must not change what a Phase
11 board converts to. Either keep a private copy of that preparation inside `phase11-foil.ts`, or
re-pin `phase11-foil-golden.json` first. `phase11-foil.test.ts` and `design-snapshot.test.ts` must
pass unchanged either way.

## 2. The deck-tweak shortcut corner (for the founder to decide)

When a board's 12" fine-tune on the Deck is bigger than its Deck Skin, the list and the flag say at
once that no blank fits (`tweakExceedsDeckSkin`), without trying every placement. That was always
true while the 12" station was never thinned, which is what Phase 12 assumed.

Since the tips step there is one corner where it is not quite true: **Tip Style Bottom, a 12" Deck
fine-tune bigger than the Deck Skin, and that tip's Thinning Start set further in than 12"**. There
the steady taper also takes foam off the deck at the 12" station, so some placements of some blanks
do fit. The planner measured 113 such fits among 4,218 probe boards in that corner. The app still
says no blank fits, because searching every placement in that corner costs about 30 seconds per
change in Node.

After the showing, the founder decides whether to keep the quick refusal, which is a little cautious
in a rare corner, or to search, which is exact but slow there.

## Done when

The old curve, the hand-set pchip option and the 12" blend are gone from the code. Phase 11 boards
and saved boards still open to exactly the numbers they open to today. And the founder's decision on
the deck-tweak corner is written down here, and built if it needs building.
