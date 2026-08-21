---
created: 2026-08-21
source: sweep of deferred items in quick task 260818-mr2
resolves_phase:
---

# Fins: placement math still uses the polynomial fallback, not the imported outline

**This is the most substantive item found in the deferral sweep, and it touches the core value
proposition — fin placement numbers a shaper trusts.**

`lib/geometry/fins.ts` deviation 5 (file header, lines 29-32) records that the prototype's
`effectiveHalfWidthAt` chooses between **imported template geometry** and a **polynomial fallback**,
and that only the fallback branch was ported because "cross-screen template import is not built yet".

**Cross-screen import now exists** — Phase 1 built the shared design store, the fins screen has a
working "Import Template Values" checkbox, and `design-store.tsx` already exposes `finTailOutline`,
the designed outline's tail. So the stated precondition for that deferral no longer holds.

## The live discrepancy

With Import Template Values on:

- The fin **viewer** draws the real designed tail outline (`finTailOutline` — its doc comment says
  it exists "for the fin viewer to draw behind the fin marks")
- The fin **placement math** still calls `tailHalfWidthAtInches` (`fins.ts:265`), which
  reconstructs a generic tail from a polynomial using only three scalars carried over by the import
  (`boardLength`, `tailWidth12`, `tailShape`)

So the drawn outline and the computed fin positions are derived from two different shapes. For a
board whose outline departs from the generic polynomial for its width and tail shape, the fin marks
can sit at positions that do not correspond to the curve drawn behind them.

## Fix

`tailHalfWidthAt` is documented as "the single seam where the imported branch will be added"
(`fins.ts:31`), so the change is localised. Port the imported-template branch of the prototype's
`effectiveHalfWidthAt` and route it through that seam, selecting on whether a real outline is
available.

**Testing is non-negotiable here:** `fins.ts` is golden-fixture tested against the prototype
(`prototype-fins-golden.json`). The existing fixtures were captured with the fallback branch, so
they must continue to pass unchanged — the imported branch is an additional path, not a replacement.
Add fixtures or unit tests covering the imported branch specifically.

Relevant code: `lib/geometry/fins.ts:29-32, 262-290, 553, 563`,
`components/design/design-store.tsx` (`finTailOutline`, `effectiveFins`).
