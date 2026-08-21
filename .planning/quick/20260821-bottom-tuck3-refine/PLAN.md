---
quick_id: 260821-bt3b
slug: bottom-tuck3-refine
date: 2026-08-21
status: planned
source: user request following browser verification of quick task 260821-bt3
files_modified:
  - lib/geometry/rail-bands.ts
  - lib/geometry/rail-bands.test.ts
  - components/rails/rail-controls.tsx
---

# Quick Task: Strict Bottom Tuck separation, and let the slider climb back to the derived value

Follow-up to quick task 260821-bt3, which floored the Bottom Tuck 3 override at Bottom Tuck 1 and
gave the slider dynamic bounds. Browser verification confirmed the inversion is fixed but surfaced
two residual issues the user asked to close.

## Task 1 — Make the separation strict, not merely non-inverting

The current floor is `Math.max(override, bottomTuck1)` — inclusive. At the boundary Bottom Tuck 3
lands exactly on Bottom Tuck 1 (measured: both 2 1/2" in symmetrical mode), producing coincident
marks and a zero-length segment. Not inverted, but the user asked for strictly larger.

In `lib/geometry/rail-bands.ts`:

- Declare an exported named constant, e.g.
  `export const MIN_BOTTOM_TUCK_SEPARATION_IN = 1 / 16;`
- Document it explicitly as a **GSD product decision, not a source-workbook formula** — this file is
  a faithful port and readers must be able to tell ported math from added policy. Keep it visually
  distinct from the `C##:` transcription comments.
- Change the override floor to `Math.max(override, bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN)`.

Rationale for a named constant rather than an epsilon: the minimum meaningful gap is a product
decision tied to the app's 1/16" fractional-inch granularity, not a floating-point artifact. An
arbitrary epsilon would be unexplainable to the next reader.

Derived branches remain unfloored — they exceed Bottom Tuck 1 by construction (2x in
non-symmetrical, `+1.5 * scale` in symmetrical), so the floor only ever binds on user overrides.

## Task 2 — Expose the derived Bottom Tuck 3 so the slider can climb back

Currently the slider's `max` is computed from the EFFECTIVE (post-override) value, so once an
override exists the range can collapse. Measured failure: after a stale override floored to 2 1/2",
the range became `[2.5, 2.5]` — a single position, with no way back to the natural symmetrical 4"
except the section's Advanced Reset. That is a milder form of the original "can't come back from"
complaint and must close too.

**Do not compute the derived value in the component.** `symmetrical ? deckMark3 : railTuck1` is
geometry logic, and this project requires geometry math to live in `lib/` (see CLAUDE.md). Instead:

- Add a `bottomTuck3Derived` field to the section result (both the inches-level result and the
  `Mm`-branded outer result, following exactly how `bottomTuck3` is already threaded).
- It is the value `bottomTuck3` would take with **no override**, including the hard-edge rule:
  `hardEdge ? 0 : (symmetrical ? deckMark3 : railTuck1)`.

Then in `components/rails/rail-controls.tsx`, the Bottom Tuck 3 slider uses:

- `min` = `bottomTuck1In + MIN_BOTTOM_TUCK_SEPARATION_IN` (import the constant — do NOT hardcode
  1/16 in the component; a duplicated literal will drift)
- `max` = `Math.max(TUCK_BOUNDS.max, bottomTuck3DerivedIn)`
- `step` unchanged
- the `clampFinite(...)` call in `onValueChange` must use the SAME min/max

This guarantees the natural derived value is always reachable: in symmetrical mode the range
becomes roughly `[2.5625, 4]`, so the user can always walk back up to 4".

## Golden-fixture safety

`lib/geometry/rail-bands.test.ts` compares an explicit allowlist (`NUMERIC_RESULT_FIELDS`), so
adding `bottomTuck3Derived` will NOT break golden parity — it is simply not compared. Do not add it
to that allowlist; the golden fixtures have no expectation for it.

All 11 golden cases already satisfy `bottomTuck3 > bottomTuck1` with a wide margin, so the stricter
floor must not change any golden expectation. **If a golden test drifts, STOP and report** rather
than editing a fixture.

## Task 3 — Tests

Update and extend `lib/geometry/rail-bands.test.ts`:

- Update the existing floor tests: a below-floor override now clamps to
  `bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN`, not to `bottomTuck1`.
- Tighten the golden-wide invariant to STRICTLY greater (`bottomTuck3 > bottomTuck1`).
- New: `bottomTuck3Derived` equals the un-overridden value in both symmetrical and non-symmetrical
  modes, and is unaffected by the presence of an override.
- New: `hardEdge` yields `bottomTuck3Derived === 0` as well as `bottomTuck3 === 0`.

## Verification

- `npm run test` — all pass, golden fixtures unchanged
- `npm run lint` — 0 errors
- `npm run build` — succeeds
- A dev server is already running on port 3000 (orchestrator-managed) — do NOT start another.
