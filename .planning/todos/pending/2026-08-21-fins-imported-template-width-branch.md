---
created: 2026-08-21
title: Fins imported tail uses the generic polynomial curve, not the drawn outline
area: general
severity: minor
files:
  - lib/geometry/fins.ts
  - components/design/design-store.tsx
  - lib/geometry/fins.test.ts
source: sweep of deferred items in quick task 260818-mr2; scoped by user 2026-08-21
resolves_phase:
---

# Fins: imported tail uses the generic polynomial curve, not the drawn outline

## Design context (from the user, 2026-08-21) — read this first

The polynomial fallback is **intended behaviour, not a gap**. There are two supported modes:

1. **Full-board workflow** — the shaper designs an outline and imports it, so the real tail informs
   fin placement.
2. **Standalone calculator** — the shaper only wants the rail band calculator or fin placement and
   never draws an outline. There is no real tail to use, so a generic shape is required. That is
   what the polynomial provides, and it is why the import toggle exists at all.

The user's assessment: "the math is true in either case even if the outline is a little ugly for the
non-imported tails." The generic shapes are **visually** rough and the user wants to improve their
appearance later — that is the main open item here, and it is cosmetic.

An earlier version of this todo framed the fallback as a correctness gap threatening the project's
core value. That framing was wrong and has been removed.

## The one narrow point that remains open

In the **imported** case the placement math still uses the generic curve, not the drawn one:

- `computeFinPlacement(effectiveFins)` (`design-store.tsx:220`) receives only the spec.
- `effectiveFins` (`design-store.tsx:204-211`) carries three real measurements from the outline —
  `boardLength`, `tailWidth12` (= `outlineGeometry.tailWidthAt12in`), `tailShape`.
- The half-width at any point along the tail is then reconstructed by
  `tailHalfWidthAtInches` (`fins.ts:265`) — the generic polynomial scaled to those measurements.
- The real curve, `finTailOutline` (`design-store.tsx:222`), is built separately and passed **only
  to the viewer** (`fin-placement-editor.tsx:180`, `outlineOverride`).

`fins.ts` deviation 5 (header, lines 29-32) records that the prototype's `effectiveHalfWidthAt`
chose between imported geometry and the polynomial, and that only the fallback branch was ported
because "cross-screen template import is not built yet". That precondition no longer holds — the
shared store landed in Phase 1 and the import toggle works.

**Consequence:** for an outline whose tail is fuller or finer than the generic curve at the same
width-at-12", the half-width at the fin's y-position differs, so the computed spread differs — and
differs from what the prototype produced for the same imported board.

**Open question for the user (domain judgement, not a code question):** does that difference matter
for real outlines? If the generic curve tracks real tails closely enough at the widths that matter,
this can be closed as won't-fix and only the visual improvement remains.

## If it is worth fixing

`tailHalfWidthAt` is documented as "the single seam where the imported branch will be added"
(`fins.ts:31`), so the change is localised: port the imported branch of the prototype's
`effectiveHalfWidthAt` and route the already-available `finTailOutline` through that seam.

`fins.ts` is golden-fixture tested against the prototype. The existing fixtures were captured on the
fallback branch and must keep passing unchanged — the imported branch is an additional path, not a
replacement. Add fixtures covering it specifically.
