---
phase: 04-rocker-foil-editors
reviewed: 2026-08-29T00:00:00Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - app/design/rocker/page.tsx
  - components/design/design-store.tsx
  - components/rails/rail-band-editor.tsx
  - components/rails/rail-controls.tsx
  - components/rocker/imperial-field.tsx
  - components/rocker/rocker-controls.tsx
  - components/rocker/rocker-datasheet.tsx
  - components/rocker/rocker-editor.tsx
  - components/rocker/rocker-viewer.tsx
  - components/setup/board-rack-card.tsx
  - components/site-nav.tsx
  - components/summary/order-form.tsx
  - components/template/export-preview-dialog.tsx
  - components/volume/volume-calculation-card.tsx
  - components/volume/volume-controls.tsx
  - components/volume/volume-estimator.tsx
  - lib/geometry/__fixtures__/blank-datasheet-golden.json
  - lib/geometry/board.ts
  - lib/geometry/design.test.ts
  - lib/geometry/design.ts
  - lib/geometry/foil.test.ts
  - lib/geometry/foil.ts
  - lib/geometry/monotone-spline.test.ts
  - lib/geometry/monotone-spline.ts
  - lib/geometry/presets.test.ts
  - lib/geometry/presets.ts
  - lib/geometry/rocker-drag.test.ts
  - lib/geometry/rocker-drag.ts
  - lib/geometry/rocker.test.ts
  - lib/geometry/rocker.ts
  - lib/geometry/volume.test.ts
  - lib/geometry/volume.ts
  - lib/models/design-snapshot.test.ts
  - lib/models/design-snapshot.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-08-29
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

This phase adds the rocker/foil geometry (`rocker.ts`, `foil.ts`, `monotone-spline.ts`), the
drag-to-edit solver (`rocker-drag.ts`), the Simpson's-rule cross-section volume path
(`computeCrossSectionVolume` in `volume.ts`), rocker/foil presets, the ROCKER screen UI, the
foil-thickness link into RAILS (D-09/D-10), and a version-2 design snapshot schema.

The core geometry is careful and well-tested: the monotone spline sampler, the rocker/foil
station model, the drag solver's round-trip/clamp/quantise behaviour, and the Simpson integrator
all have direct unit coverage, including a hand-entered blank-datasheet validation against a real
foam blank's stated volume. `Mm`/inch boundary discipline (Rule 2) and the "no React/DB import in
lib/geometry" rule (Rule 1) both hold throughout the files reviewed. No security issues, hardcoded
secrets, or dangerous-function usage were found in this batch.

Two real defects were found, both `WARNING`-level (UI/state inconsistency, not data loss or a
crash), plus three `INFO`-level maintainability notes. No `BLOCKER`s.

## Warnings

### WR-01: RAILS screen's thickness sliders have narrower bounds than the foil values they can display when linked

**File:** `components/rails/rail-controls.tsx:33-34`, `179`, `214-224`
**Issue:**

`railsImportFoilThickness` defaults to `true` (`components/design/design-store.tsx:137`), and while
it is on, `deriveEffectiveRails` (`lib/geometry/design.ts:91-103`) copies the foil's `nose12`/
`center`/`tail12` values straight into `rails.nose/center/tail.boardThickness` with no clamping:

```ts
// lib/geometry/design.ts
export function deriveEffectiveRails(
  rails: RailBandSpec,
  foil: FoilSpec,
  importFoilThickness: boolean,
): RailBandSpec {
  if (!importFoilThickness) return rails;
  return {
    ...rails,
    nose: { ...rails.nose, boardThickness: foil.nose12 },
    center: { ...rails.center, boardThickness: foil.center },
    tail: { ...rails.tail, boardThickness: foil.tail12 },
  };
}
```

The foil sliders on the ROCKER screen allow any value in `FOIL_THICKNESS_RANGE_IN` (0.125"–5",
`lib/geometry/foil.ts:38`), but the RAILS screen's own (now-disabled-while-linked) thickness
slider is hardcoded much narrower:

```ts
// components/rails/rail-controls.tsx
const NT_THICKNESS_BOUNDS = { min: 1, max: 2.5, step: 1 / 16 };
const CENTER_THICKNESS_BOUNDS = { min: 1.75, max: 3.5, step: 1 / 16 };
```

`RailSectionControls` passes `spec.boardThickness` (the *effective*, foil-derived value while
linked) straight into the `Slider`'s `value` with these bounds as `min`/`max`, disabled but not
re-ranged:

```tsx
<ControlSlider
  label={`${SECTION_THICKNESS_LABEL[sectionKey]} — ${formatInchesFraction(spec.boardThickness)}`}
  value={boardThicknessIn}
  min={thicknessBounds.min}
  max={thicknessBounds.max}
  ...
  disabled={thicknessDisabled}
  ...
/>
```

Because Base UI's `Slider` (`components/ui/slider.tsx`) positions the thumb from `(value - min) /
(max - min)` against the `min`/`max` it's given, any foil value a shaper dials outside 1"–2.5"
(nose/tail) or 1.75"–3.5" (center) — e.g. a thin ~0.75" fish tail, well within the ROCKER screen's
own allowed range — renders the disabled RAILS thickness slider's thumb pinned or clipped at the
wrong end, while the label text beside it (`formatInchesFraction(spec.boardThickness)`) still
reads the correct number. The computed geometry itself is unaffected (`computeRailBands` reads the
real value, not the slider's clamped range), so this is a display inconsistency rather than a
data-correctness bug, but it is reachable through completely ordinary use of the phase's
headline feature (the foil→rails link, on by default).

**Fix:** Either widen `NT_THICKNESS_BOUNDS`/`CENTER_THICKNESS_BOUNDS` to match
`FOIL_THICKNESS_RANGE_IN`, or derive the slider's bounds dynamically while linked so the current
value is always representable, e.g.:

```ts
const effectiveMin = thicknessDisabled ? Math.min(thicknessBounds.min, boardThicknessIn) : thicknessBounds.min;
const effectiveMax = thicknessDisabled ? Math.max(thicknessBounds.max, boardThicknessIn) : thicknessBounds.max;
```

### WR-02: `applyPreset` doesn't reset the autosave failure-backoff counter that `applyModel` does

**File:** `components/design/design-store.tsx:311-327` (compare `333-352`)
**Issue:** `applyModel` explicitly resets the save-failure counter when opening a saved board,
with the reasoning spelled out in its own comment:

```ts
const applyModel = (id: string, snapshot: DesignSnapshotFields) => {
  // A fresh row has no save-failure history of its own — carrying over a backoff earned by
  // whatever board was open before would slow its first autosave for no reason.
  consecutiveFailuresRef.current = 0;
  setState(() => ({ ...DEFAULT_DESIGN_STATE, ... }));
};
```

`applyPreset` — the "Discard & Start New" path, which produces an equally fresh, previously-unsaved
board — does not:

```ts
const applyPreset = (preset: BoardPreset) =>
  setState(() => ({
    ...DEFAULT_DESIGN_STATE,
    outline: preset.outline,
    rocker: preset.rocker,
    foil: preset.foil,
    rails: preset.rails,
    fins: preset.fins,
    boardStarted: true,
    dirty: true,
  }));
```

If a shaper's previous board suffered several consecutive autosave failures (a flaky connection, an
expired session) and they then discard it and start a new preset-based board, `consecutiveFailuresRef`
still holds the old count. The very first autosave of the genuinely new board — once the shaper's
first manual Save sets `modelId` via `markSaved` — uses `autosaveDelayFor(staleCount)` instead of the
normal `AUTOSAVE_DEBOUNCE_MS`, so an edit on a brand-new board can sit unsaved for up to 30 seconds
for no reason tied to that board's own history. Self-corrects after one save cycle, so this is a
minor UX inconsistency, not data loss.

**Fix:**

```ts
const applyPreset = (preset: BoardPreset) => {
  consecutiveFailuresRef.current = 0;
  setState(() => ({
    ...DEFAULT_DESIGN_STATE,
    outline: preset.outline,
    rocker: preset.rocker,
    foil: preset.foil,
    rails: preset.rails,
    fins: preset.fins,
    boardStarted: true,
    dirty: true,
  }));
};
```

## Info

### IN-01: `computeCrossSectionVolume` reads its three rail anchors by array index rather than by key

**File:** `lib/geometry/volume.ts:530-536`
**Issue:**

```ts
const anchors = foilStationPoints(foil, length);
const tailAnchor = anchors[1]; // tail12
const centerAnchor = anchors[2]; // center
const noseAnchor = anchors[3]; // nose12
```

This is correct today because `foilStationPoints` (via `rockerStationPoints`) always returns the
five stations in the fixed order `[tailTip, tail12, center, nose12, noseTip]`. But nothing in the
type system enforces that order at this call site — a future reordering of that array (e.g. to
match `DATASHEET_STATIONS`'s nose-to-tail reading order elsewhere in this same phase) would silently
shift which anchor is which, with no compile error, and the resulting volume error would only be
caught if it happened to move the blank-datasheet test's 1% margin past its 10% tolerance.

**Fix:** Look the anchors up by key instead of position, e.g.:

```ts
const tailAnchor = anchors.find((a) => a.key === "tail12")!;
const centerAnchor = anchors.find((a) => a.key === "center")!;
const noseAnchor = anchors.find((a) => a.key === "nose12")!;
```

### IN-02: All four board presets share the exact same `rails`/`fins` object reference

**File:** `lib/geometry/presets.ts:96-97, 128-129, 160-161, 192-193`
**Issue:** Every entry in `BOARD_PRESETS` assigns `rails: DEFAULT_RAIL_BAND_SPEC` and
`fins: DEFAULT_FIN_PLACEMENT_SPEC` verbatim — not just equal in value, but literally the same
object reference across all four presets and the shared default. The current store update pattern
(`updateRailSection` spreads into new objects rather than mutating) makes this safe today, and
`design.test.ts`'s "the input spec object is not mutated by either branch" test guards the one
function that reads them. But it's a latent hazard: any future code path that mutates a rail/fin
section object in place (instead of spreading) would silently corrupt all four presets and the
shared default simultaneously, and the bug would not be local to whichever preset triggered it.

**Fix:** Give each preset its own shallow copy (e.g. `rails: { ...DEFAULT_RAIL_BAND_SPEC }`) or
document at the `BoardPreset` definition site that these fields are intentionally shared references
and must never be mutated in place.

### IN-03: The blank-datasheet fixture's `rockerIn` field is never read by any test

**File:** `lib/geometry/__fixtures__/blank-datasheet-golden.json:7`
**Issue:** The fixture carries a hand-entered `rockerIn` array (`[5.5625, 2.25, 0, 1.25, 2.5625]`)
alongside `widthIn`/`thicknessIn`, but `volume.test.ts`'s `blank-datasheet validation (D-14)` suite
only destructures and uses `widthIn`, `thicknessIn`, and `statedVolumeLitres` — `rockerIn` is dead
data. Since rocker lift doesn't affect cross-section area (`computeCrossSectionVolume` takes no
rocker argument by design), this isn't wrong, but it does suggest an intended rocker-against-a-real-blank
validation (mirroring the volume validation) was scoped but never written, and a future reader may
assume this field is exercised when it isn't.

**Fix:** Either add a `sampleRocker` sanity check against `rockerIn` (e.g. asserting the sampled
rocker line stays within a tolerance band of the blank's own five quoted heights) or remove the
unused field and note in the fixture's `note` string that rocker is out of scope for this
validation.

---

_Reviewed: 2026-08-29_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
