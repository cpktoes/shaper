---
quick_id: 260821-bt3
slug: bottom-tuck3-floor
date: 2026-08-21
status: planned
source: user report + .planning/todos/pending/2026-08-21-bottom-tuck3-disabled-when-symmetrical.md
files_modified:
  - lib/geometry/rail-bands.ts
  - lib/geometry/rail-bands.test.ts
  - components/rails/rail-controls.tsx
---

# Quick Task: Stop Bottom Tuck 3 inverting the rail geometry

Two distinct defects, both reachable from the Bottom Tuck 3 advanced slider. Full measured
reproduction is in `.planning/todos/pending/2026-08-21-bottom-tuck3-disabled-when-symmetrical.md`
— read it first.

**Summary:** in symmetrical mode the derived Bottom Tuck 3 is 4" but the slider's max is 1.5", so
the thumb pins at max misrepresenting the value, and any touch collapses Bottom Tuck 3 to <= 1.5" —
below Bottom Tuck 1 (2 1/2") — inverting the bottom marks. The override then permanently shadows
the symmetrical derivation (`rail-bands.ts:230-232`), so it cannot be undone from that slider.

## Pre-verified safety facts (already checked — do not re-derive, but do re-confirm at the end)

- `bottomTuck3 > bottomTuck1` holds in EVERY legitimate derived state:
  - non-symmetrical: `bottomTuck1 = railTuck1/2`, `bottomTuck3 = railTuck1` → exactly 2x
  - symmetrical: `bottomTuck1 = deckMark1`, `bottomTuck3 = deckMark3`, and
    `deckMark3 - deckMark1 = 1.5 * scale` by construction
- All 11 golden fixture cases in `lib/geometry/__fixtures__/prototype-rails-golden.json` ALREADY
  satisfy `bottomTuck3 > bottomTuck1`. Zero violations.
- Only one fixture case (`overrides`) sets a `BottomTuck3Override` (nose 0.5", tail 0.75"), and
  BOTH are `symmetrical: false`. No fixture combines symmetrical with an override.
- Therefore the floor below is a pure guard on user-reachable invalid states and MUST NOT change
  any golden expectation. If a golden test drifts, STOP — it means an assumption above is wrong.

## Task 1 — Enforce the floor in the geometry

`lib/geometry/rail-bands.ts`, `computeSectionInches` (~lines 228-232).

Currently:
```ts
const bottomTuck1 = input.symmetrical ? deckMark1 : railTuck1 / 2;
const bottomTuck2 = bottomTuck1 / 2;
const bottomTuck3 = input.hardEdge
  ? 0
  : (input.bottomTuck3OverrideIn ?? (input.symmetrical ? deckMark3 : railTuck1));
```

Apply a floor of `bottomTuck1` to the OVERRIDE branch only, so a user-supplied override can never
sit below Bottom Tuck 1. The derived branches already satisfy the invariant and must pass through
byte-identical.

**Critical constraints:**
- The `hardEdge` branch MUST still yield exactly `0`. Hard edge means no tuck; do NOT floor it.
- Floor only the override. Do not clamp the derived values — that would be a no-op at best and
  fixture-breaking at worst.
- Enforcing this in the geometry (not only the UI) is the whole point: a stale override set BEFORE
  symmetrical was switched on must not shadow `deckMark3`. A UI-only guard leaves the bug intact
  and merely hides it.

Keep the transcription comments (`C23`, `C24`, `C25`) intact and add a brief note that the floor
is a GSD-added guard, not part of the source workbook — this file is a faithful port and future
readers must be able to tell ported formulas from added guards.

## Task 2 — Dynamic slider bounds in the UI

`components/rails/rail-controls.tsx`, the Bottom Tuck 3 slider (~line 316).

It currently uses the shared `TUCK_BOUNDS = { min: 0, max: 1.5, step: 1/16 }`, which cannot
represent a 4" symmetrical value. Replace its bounds with per-section dynamic values:

- `min` = the section's current `bottomTuck1` in inches (`output.result.bottomTuck1` via `mmToInches`)
- `max` = `Math.max(TUCK_BOUNDS.max, bottomTuck3In)` so the current value is always representable
- `step` = unchanged (`TUCK_BOUNDS.step`, 1/16)

Update the slider's `clampFinite(...)` call in `onValueChange` to use the SAME dynamic min/max, not
the static `TUCK_BOUNDS`.

In symmetrical mode this makes the range ~2.5"–4": the thumb then sits at its true position instead
of pinned at a meaningless max, and the slider stays usable rather than being disabled.

**Do not touch:** the Corner Cut Offset slider (stays on `CORNER_CUT_BOUNDS`) and `TUCK_BOUNDS`
itself, which is still correct as the step source and as the max floor.

## Task 3 — Tests

Extend `lib/geometry/rail-bands.test.ts`:

- symmetrical section + override BELOW `bottomTuck1` → result floors to `bottomTuck1` (never inverts)
- non-symmetrical section + override below `bottomTuck1` → floors likewise
- override ABOVE the floor → passes through unchanged (no silent alteration of valid input)
- `hardEdge` + an override → still exactly `0`
- an invariant test asserting `bottomTuck3 >= bottomTuck1` for every section across the existing
  golden cases, so future regressions are caught structurally

## Verification

- `npm run test` — all pass; **golden rail fixtures must be unchanged**. Investigate any drift, do
  not update a fixture to make a test green.
- `npm run lint` — 0 errors
- `npm run build` — succeeds
- A dev server is already running on port 3000 (orchestrator-managed) — do NOT start another.
