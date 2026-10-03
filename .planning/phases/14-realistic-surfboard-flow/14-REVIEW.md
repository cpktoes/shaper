---
phase: 14-realistic-surfboard-flow
reviewed: 2026-10-02T22:45:00Z
depth: standard
files_reviewed: 49
files_reviewed_list:
  - lib/geometry/root-curve.ts
  - lib/geometry/tip-taper.ts
  - lib/geometry/pchip.ts
  - lib/geometry/blank-fit.ts
  - lib/geometry/blank.ts
  - lib/geometry/board-profile.ts
  - lib/geometry/design.ts
  - lib/geometry/foil.ts
  - lib/geometry/phase11-foil.ts
  - lib/geometry/before-after.ts
  - lib/geometry/blank-reasons.ts
  - lib/geometry/planing.ts
  - lib/models/design-snapshot.ts
  - components/design/design-store.tsx
  - components/design/slider-row.tsx
  - components/rocker/rocker-controls.tsx
  - components/rocker/rocker-editor.tsx
  - components/rocker/rocker-viewer.tsx
  - components/rocker/rocker-view-frame.ts
  - components/rocker/rocker-datasheet.tsx
  - components/rocker/use-blank-list.ts
  - components/rocker/blank-flag.tsx
  - components/summary/order-form.tsx
  - scripts/check-saved-boards.ts
  - scripts/extract-phase14-today-golden.ts
  - scripts/extract-phase14-preset-figures.ts
  - scripts/phase14-before-after.ts
  - lib/geometry/root-curve.test.ts
  - lib/geometry/tip-taper.test.ts
  - lib/geometry/tip-flow.test.ts
  - lib/geometry/thinning-start-paths.test.ts
  - lib/geometry/phase14-curves.test.ts
  - lib/geometry/phase14-today.test.ts
  - lib/geometry/phase14-today-handset.test.ts
  - lib/geometry/phase14-preset-figures.test.ts
  - lib/geometry/before-after.test.ts
  - lib/geometry/blank-reasons.test.ts
  - lib/geometry/volume.test.ts
  - lib/geometry/design.test.ts
  - lib/geometry/rocker.test.ts
  - lib/geometry/__fixtures__/phase14-stress-set.ts
  - lib/geometry/__fixtures__/phase14-today.ts
  - lib/models/saved-board-open.test.ts
  - components/design/design-store.test.ts
  - components/design/slider-row.test.ts
  - e2e/rocker-blanks.spec.ts
  - e2e/rocker-cut.spec.ts
  - e2e/summary-planing.spec.ts
  - e2e/touch-sizing.spec.ts
findings:
  critical: 0
  warning: 2
  info: 8
  total: 10
status: issues_found
---

# Phase 14: Code Review Report

**Reviewed:** 2026-10-02T22:45:00Z
**Depth:** standard
**Files Reviewed:** 49 (plus CLAUDE.md's Rule 2 addition)
**Status:** issues_found

## Summary

I reviewed the diff `ed39f4a..HEAD` against 14-SPEC, 14-CONTEXT (D-01 to D-28) and 14-UI-SPEC. I put most of the time into the maths: I traced every formula by hand and checked the suspicious ones with five scratch probes against the real catalogue. Three Vitest files were run, all green: tip-taper, root-curve and saved-board-open (64 tests).

The maths holds up. I found no blocker in what a shaper cuts foam to:

- **The square-root curve.** It reads the printed value exactly at every station and cannot leave the range of the two stations either side. The pchip end slopes are capped at 3·d₀ and the inner slopes use a weighted harmonic mean, so each interval stays monotone. Every root interval has neighbours of the same sign, or the anchor's 0. A bottom drawn with the rise has its exact low point at its first lowest station, so `pchipMinimum` still levels correctly.
- **The slopes.** Both `slopeAt` functions are the analytic derivatives of their Hermite segments. The nose sign flip in `noseCut` is right.
- **The steady taper.** Algebra confirms it reads the tip setting at the tip, the planer cut at the start, and leaves along slope m. The steady test (D-03 plus `P′(W) ≥ 0`) makes it rise steadily all the way. Automatic tries 12" first, then 12½" (k = 25) up to the slider's far end, and otherwise falls back to 12".
- **A 12" start.** It is bit-identical to the 12" blend at all five stations, for thickness and rocker, including the tip-thinning value under Pin deck. I traced both paths term by term.
- **The Phase 11 number.** It is read only through `prepareBlankPchip`.
- **The per-tip view, `runsOutCause` and `thinningStartsOf`.** All three behave as the contract says, and every construction site passes the starts through `thinningStartsOf`.

Two probes back this up:

- **Deck-tweak refusal.** Automatic never took foam off a 12" station under Tip Style Bottom on 53,550 boards: tip settings from 1/4" to 1¼", centres from 1¾" to 3½", three placements. So the `tweakExceedsDeckSkin` quick refusal stays exact on Automatic well beyond the stress set.
- **Thin-spot sentence.** Of 88,200 hand-set starts further in than Automatic's, none got the thin-spot sentence. The "Automatic would … clear that" wording is never said falsely.

The stored-board boundary is sound:

- `.optional().catch(undefined)` plus `withoutAutomaticStarts` reads bad values as Automatic and leaves no key behind.
- Opening a board writes nothing to it, and the version stays 5.
- The store's two new moves are written correctly: one undo key per tip, Automatic is its own step and a no-op when already Automatic, `pickBlank` keeps a hand-set start, and Reset Fine-Tune leaves the starts alone.
- The report script makes one select and prints counts and maxima only.

The findings that remain are one accessibility gap on the new sliders, one older drawing-versus-numbers mismatch that the phase now makes reachable on boards the list calls fitting, and a set of test-strength and wording items.

## Warnings

### WR-01: The two Thinning Starts sliders have no accessible name, so a screen reader cannot tell nose from tail

**File:** `components/rocker/rocker-controls.tsx:272` (via `components/design/slider-row.tsx:89`, `components/ui/slider.tsx:111`)

**Issue:** `ThinningStartRow` renders a `SliderRow`. `SliderRow` draws its label as a plain `<div>` and hands no `aria-label`, `aria-labelledby` or `getAriaValueText` to Base UI's `Slider`/`Thumb`. Each Thinning Starts thumb is therefore an unnamed slider.

The phase adds two of them, one after the other, identical except for which tip they belong to. A screen-reader user hears "slider, 12" twice with no way to tell nose from tail. In Metric, `aria-valuenow` is the raw millimetre figure (`647.7`) with no unit, while the label reads `64.8 cm`.

The UI-SPEC took care to give the two Automatic buttons different names for exactly this reason (`automaticButtonLabel`, §2), but the sliders above them were missed. The gap exists on every `SliderRow` in the app. It bites hardest here, because these are the only twin sliders whose sole difference is nose/tail.

**Fix:** let `SliderRow` name its slider from its own label, and let the caller give a spoken value. A sketch:

```tsx
// slider-row.tsx
const labelId = useId();
<div id={labelId} className={...}>{displayValue !== undefined ? `${label} — ${displayValue}` : label}</div>
<Slider aria-labelledby={labelId} getAriaValueText={ariaValueText ? () => ariaValueText : undefined} ... />

// rocker-controls.tsx, ThinningStartRow
<SliderRow ... ariaValueText={formatThinningStart(tip.fromTip, system)} />
```

Add a `touch-sizing`/`rocker-cut` check: `getByRole("slider", { name: /^Nose Thinning Starts/ })` resolves to exactly one element.

### WR-02: A thin board the phase newly accepts can come out with a reverse-rocker tail, and Remove This Blank then draws its rocker 0.2" off its own numbers

**File:** `lib/geometry/blank-fit.ts:523-539` (Pin deck rocker = levelled bottom + tip thinning), `lib/geometry/board-profile.ts:147-151` (hand-set rocker levelled over the board), `lib/geometry/board-profile.ts:261` (`handSetFromProfile`), `components/design/design-store.tsx:1047` (`removeBlank`)

**Issue:** The board's rocker is levelled on the un-thinned bottom. Under Pin deck the tip thinning is then added on top, and it is negative wherever the taper runs above the planer cut. Automatic moves a start in exactly when the planer cut at 12" is thinner than the tip setting, so the negative thinning now spreads over a longer run.

Measured on the Arctic Foam 7'9" SBF, default 6'0" outline, default tips, Pin deck:

| Centre | 12" blend | Steady taper (Automatic) |
|---|---|---|
| 1 1/4" | refused (runs out) | **fits**; tail tip rocker −0.212", tail @ 12" −0.168" |
| 1" | refused | **fits**; tail tip −0.462", tail @ 12" −0.369" |

So the list now offers a fitting board whose tail sits below its own centre flat over its last two feet. D-20 accepted "tips flatter than the blank's own rocker". A negative 12" rocker is flatter than flat. These are 1–1¼" centres, which the Center Thickness slider allows (its floor is 1/4"); at 1½" the dip is 0.038" and at 2" there is none.

The concrete defect is what Remove This Blank does with such a board:

1. `handSetFromProfile` seeds hand-set lifts of `tailTip = −0.212"` and `tail12 = −0.168"`. Those are outside `ROCKER_LIFT_RANGE_IN` (min 0).
2. `fallbackProfileWith` levels the square-root rise on its lowest station, the negative tail tip.
3. The drawing therefore puts the centre at **+0.212"**, while `stationRocker` (the DATASHEET and readouts) still says centre 0 and tail tip −0.212".

The drawing and the numbers disagree by the whole dip. The mismatch mechanism predates Phase 14 (the old pchip path levelled the same way). What is new is that it is reachable from a board the app says fits, and that the 12" rocker can now go negative too.

**Fix:** two parts, the first being the minimum:

1. Make the hand-set seed agree with the drawing. In `handSetFromProfile`, rebase the four lifts on the profile's lowest station rocker rather than on the centre:

   ```ts
   const low = Math.min(stationRocker.center, stationRocker.tailTip, stationRocker.tail12, stationRocker.nose12, stationRocker.noseTip);
   // seed lift = stationRocker[key] − low, and keep 0 at whichever station is lowest
   ```

   Alternatively, clamp the seeded lifts to `ROCKER_LIFT_RANGE_IN.min` and say so. Add a test: after `handSetFromProfile`, `buildFallbackProfile(...).rockerAt(station) === stationRocker[station]` at all five stations.
2. Show the founder a reverse-rocker example (the 1¼" Arctic 7'9" SBF) in the tips go's before-and-after pictures, so D-20's acceptance explicitly covers a negative tip rocker, or decide that Pin deck should never drop a tip below the board's own low point.

## Info

### IN-01: The saved-boards reports print their largest move and largest 12" rise rounded to the nearest 1/16"

**File:** `lib/geometry/before-after.ts:230`, `lib/geometry/before-after.ts:246`

**Issue:** `movesReportLines` and `tipsReportLines` print maxima through `formatMark(..., "imperial")`, a shaper's 1/16" mark. Any move up to 1/32" prints `0"` (probe: 0.01", 0.02" and 0.03" all print `0"`). Anything from 1/32" up to about 3/32" prints `1/16"`. The founder reads these lines at each go (D-18). "Largest move 0"" reads as "nothing moved", while the Mid-length preset moves 0.0149" at go-live 1. Combined with the over-1/32" and over-1/16" counts the lines are never contradictory, only coarse.

**Fix:** print the two maxima in decimal inches to three places, beside the mark if wanted. For example: `` `${mmToInches(mm(x)).toFixed(3)}" (${formatMark(mm(x), "imperial")})` ``.

### IN-02: The store's new behaviour is proven by matching source text

**File:** `components/design/design-store.test.ts:262-296`

**Issue:** "one coalescing key per tip", "a no-op on Automatic", "a switch keeps a hand-set start" and "Reset Fine-Tune leaves both starts alone" are asserted by regexes over the handler source. The Reset test in particular is `not.toMatch(/ThinningStart/)`. It would still pass if `resetFineTune` rebuilt the blank from named fields and dropped both starts, because such code would never mention `ThinningStart`.

Undo per tip, Automatic as one step, and the blank switch are covered behaviourally by `e2e/rocker-cut.spec.ts`. Reset-keeps-starts has no behavioural test anywhere. The code itself is correct (`{ ...prev.blank, nose12Offset: 0, tail12Offset: 0 }`, line 1004).

**Fix:** add one `rocker-cut` e2e step. Set a tail start by hand, press ↺ Reset Fine-Tune, and assert the `Tail Thinning Starts — …` label is unchanged and the Automatic button is still enabled.

### IN-03: Two assertions that pass whatever they name

**File:** `lib/geometry/tip-taper.test.ts:302`, `e2e/rocker-blanks.spec.ts:374`, `e2e/rocker-blanks.spec.ts:388`

**Issue:**

- `expect(automaticStart.length).toBe(3)` checks the function's arity as "proof" that Automatic ignores the fine-tune, Deck Skin and Tip Style. The real proof is `tip-flow.test.ts:454`, which compares starts across those settings on the stress set. The arity line adds nothing.
- The DATASHEET e2e compares the From tip cells with the drawing's accessible name. Both read the same `blank.tips`, and on the first fitting blank both starts are `12"`. The test would pass with nose and tail swapped in either place.

**Fix:** drop the arity assertion. In the e2e, set one start by hand first (for example tail to its far end) so the two cells differ, then assert which column holds which.

### IN-04: Three board-input sites in the preset generator, the preset test and the pin generator bypass `thinningStartsOf`

**File:** `scripts/extract-phase14-preset-figures.ts:63-78`, `lib/geometry/phase14-preset-figures.test.ts:21-36`, `scripts/extract-phase14-today-golden.ts:291-304`; the guard list at `lib/geometry/thinning-start-paths.test.ts:154`

**Issue:** These build `buildBoardProfile` blank inputs by hand without spreading `thinningStartsOf(fields.blank)`. That is harmless today: presets never carry a start (D-06), and the pin predates starts. But if Fit & Tip Defaults gains a start after the showing (the deferred idea), the preset record and its test would silently judge Automatic. The "every place that builds a board" guard lists five sites and does not include these, nor `lib/geometry/before-after.ts`, which does pass the starts.

**Fix:** spread `...thinningStartsOf(fields.blank)` in the two preset sites, or build them through `boardProfileWith(fields, RULES_LIVE)`. Add `./before-after.ts` and the preset generator to `SITES`.

### IN-05: Comments that no longer describe the code

**File:** `lib/geometry/blank-fit.ts:432`, `lib/geometry/tip-taper.ts:100-108`, `components/rocker/rocker-datasheet.tsx:16`

**Issue:**

- `blank-fit.ts:432` says the planer cut and its slope "both read 0 where the board runs off the blank". Only the slope does. Off the foam, `unthinned(s)` is `0 − drop`, a negative thickness.
- `pullThinningStart` documents and handles `NaN` (returns the minimum), but its only caller (`tipView`) already turns every non-finite value into Automatic. The branch is dead. An `Infinity` passed directly would be pulled to the maximum, unlike `NaN`.
- The DATASHEET header's block count was not updated when THINNING STARTS was added as its own group.

**Fix:** correct the three comments. Either remove the `NaN` branch or make `pullThinningStart` treat every non-finite value the same way.

### IN-06: The suite's only real-board litres check moved further from the maker's figure

**File:** `lib/geometry/volume.test.ts:553-560`

**Issue:** The datasheet reference board now computes 79.72 L against the stated 77.17 L, a 3.30% deviation. It was 2.17% before the square-root fall replaced pchip through a hand-set board's five thicknesses. The 10% tolerance cannot notice this. It is the one external check on hand-set litres, and the curves step pushed it the wrong way. This already shipped at go-live 1. It is recorded here as evidence, not as a defect.

**Fix:** none required. Mention it to the founder beside the hand-set board's 30.1 → 30.5 L move, and consider a tighter, generated bound once a second real board with a stated volume is available.

### IN-07: `SliderRow` mishandles a falsy-but-defined `hintAction`

**File:** `components/design/slider-row.tsx:78`, `components/design/slider-row.tsx:106`

**Issue:** `hasAction` treats only `undefined`/`null` as "no action". A caller writing `hintAction={cond && <Button/>}` with `cond === false` gets the `items-center gap-2` classes, and `hintAction ?? <span>{rightHint}</span>` renders `false`, so the right hint disappears. No caller does this today.

**Fix:**

```ts
const hasAction = hintAction !== undefined && hintAction !== null && hintAction !== false;
...
{hasAction ? hintAction : <span>{rightHint}</span>}
```

### IN-08: The rollback test now exercises today's reader, not the curves release's

**File:** `lib/models/saved-board-open.test.ts:123-158`

**Issue:** The describe block still says the rollback edge is "proven on that release's own reader by plan 14-05". Its assertions now run against the current `parseSnapshot`: "version 6 still parses", "645 is now kept". The property that matters for a rollback to go-live 1 (that release's reader drops `noseThinningStart` and accepts a higher version) was proven at the 14-05 commit and is no longer re-checked by any test on HEAD. That is acceptable, because the go-live 1 commit is what is deployed. But if anything is cherry-picked onto the go-live 1 line before go-live 2, nothing re-proves it.

**Fix:** none required now. Before go-live 2, confirm the rollback target is exactly the go-live 1 commit the 14-05 test ran on, or re-run that test there (`git worktree add`).

---

_Reviewed: 2026-10-02T22:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
