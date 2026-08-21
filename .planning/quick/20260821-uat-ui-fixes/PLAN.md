---
quick_id: 260821-dmg
slug: uat-ui-fixes
date: 2026-08-21
status: planned
source: phase 01 UAT feedback
files_modified:
  - components/outline/outline-editor.tsx
  - components/rails/rail-controls.tsx
---

# Quick Task: Fix two UI issues from phase 01 UAT

Two small, independent UI corrections raised by the user during phase 01 UAT. Both are contained
styling/bounds changes with no geometry-math impact.

## Task 1 — Dev-only "Copy preset values" button is invisible at rest

**Problem:** `components/outline/outline-editor.tsx:85` renders the dev-only capture button as
`<Button variant="outline" size="sm" className="mt-4 w-full">`. The shadcn `outline` variant is
designed for a light page background, but this button sits inside the dark sidebar `<aside>`.
Result: light text on a light button — invisible until hovered.

**Fix:** Restyle for the dark sidebar using the design tokens already used by neighbouring sidebar
controls (`outline-sidebar-text`, `outline-sidebar-text-muted`, `outline-accent`). It must be
clearly legible at rest and keep a distinct hover state.

**Constraints:**
- Do NOT change the `process.env.NODE_ENV === "development"` gate.
- The button must remain absent from production output (verify against a production build).

## Task 2 — Corner Cut Offset slider range is far too wide

**Problem:** `components/rails/rail-controls.tsx` uses a single
`TUCK_BOUNDS = { min: 0, max: 1.5, step: 1/16 }` for BOTH the Corner Cut Offset slider (~line 283)
and the Bottom Tuck 3 slider (~line 318). A 0–1.5" range is far too coarse for corner cut, whose
computed defaults are all ≤ 1/8".

**Fix:** Introduce `CORNER_CUT_BOUNDS = { min: 0, max: 0.25, step: 1/32 }` and use it ONLY for the
Corner Cut Offset slider — its `min`/`max`/`step` props AND the `clampFinite(...)` call in its
`onValueChange` (~line 290). Leave Bottom Tuck 3 on `TUCK_BOUNDS` unchanged.

**Why step must be 1/32, not 1/16:** the computed family defaults from
`cornerCutRailOffsetForInches` in `lib/geometry/rail-bands.ts` are 1/8, 3/32, 1/16, 1/32 and 0.
The 3/32 and 1/32 defaults are NOT representable on a 1/16 step — a 1/16 step would make the
slider unable to display the app's own default values for families 2 and 4. Max computed default
is 1/8, so the 1/4 ceiling covers every default with headroom.

## Verification

- `npm run test` — all tests pass
- `npm run lint` — 0 errors
- `npm run build` — succeeds
- Confirm "Copy preset values" does not appear in the production build output
- Confirm Bottom Tuck 3 slider still has min 0 / max 1.5 / step 1/16
