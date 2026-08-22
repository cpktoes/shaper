---
phase: quick-260822-wcs
plan: 01
subsystem: ui, geometry
status: complete
tags: [outline, widepoint, rail-length, sliders, spec-change, base-ui]

requires:
  - phase: quick-260822-vcs
    provides: the viewer callout system this screen renders through; untouched here
provides:
  - OutlineSpec.tailRailLength and OutlineSpec.noseRailLength replacing the single symmetric railLength -- each scales one of the widepoint's two handles independently
  - Widepoint Controls laid out as two rows of two (Width|Offset, Tail Rail|Nose Rail)
  - lib/geometry/outline.test.ts asymmetry tests proving the two fields drive different handles
affects: [.planning/todos/pending/2026-08-22-drag-construction-lines-to-shape-the-outline-curve.md -- the spec side of that todo's part 2 is now done; any future saved-design schema, which must carry two fields not one]

actuals:
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "railMult(pct) as a named local in buildOutline instead of a single inline widepointMult -- the multiplier is now applied twice with different inputs, so it needed a name"

key-files:
  modified:
    - lib/geometry/board.ts
    - lib/geometry/outline.ts
    - lib/geometry/presets.ts
    - lib/geometry/outline.test.ts
    - lib/geometry/presets.test.ts
    - components/outline/outline-controls.tsx
    - components/outline/outline-editor.tsx
---

# Summary: Widepoint Controls layout + independent nose/tail rail lengths

Both tasks landed as planned. Groundwork for the draggable-construction-lines todo: the outline spec
can now represent an asymmetric widepoint, so the drag work will have somewhere to write to.

## What changed

**Layout.** Widepoint Width became a `SliderRow` and moved up beside Offset; the row it vacated now
holds the two rail-length sliders. Widepoint Controls is now two rows of two, matching the Nose and
Tail sections.

**The split.** `railLength` is gone from the tree. `tailRailLength` scales `inLen0` (the widepoint's
tail-facing handle), `noseRailLength` scales `outLen1` (its nose-facing handle). The arithmetic is
unchanged when both hold the same value.

## Deviations from plan

**Labels shortened, and this was not in the plan.** The plan assumed a ~168px half-column, measured
from the sidebar's `max-w-[400px]`. In the browser the sidebar sits at its `basis-[340px]` floor, so
the real half-column is ~109px. At that width `WIDEPOINT WIDTH — 19"` (138px) and
`TAIL RAIL LENGTH — 50%` (142px) both wrapped to two lines, and because `OFFSET — -1/2"` (82px) did
not, the Width slider sat a line lower than the Offset slider beside it — a visible misalignment.

Labels are now `Width`, `Offset`, `Tail Rail`, `Nose Rail` — all under 95px, so they hold one line at
any sidebar width. Dropping the section prefix follows the idiom Nose Controls already uses
(`Nose Angle` / `Fullness` under `NOSE CONTROLS`). The cost is that the word "Length" is gone from
the rail sliders; the Short/Long hints beneath still carry that meaning.

**One planned test was dropped.** The plan called for a test that equal values reproduce the old
symmetric behaviour. Written out, it could only compare a spec to itself — the old formula no longer
exists to compare against. The golden fixtures already prove exactly this (both fields driven from
the prototype's single `widepointVector`), so the tautology was removed rather than kept as decoration.

## Verification

- `npm test` — 600 pass, including all outline goldens unchanged. The goldens passing IS the
  proof that the split is behaviour-preserving when both sides agree.
- Two new tests prove the fields are wired to *different* handles: each moves only its own half of
  the curve, and changing one leaves the other side's samples identical to 9 decimal places.
- `tsc --noEmit` and `eslint` clean. No `railLength` anywhere in the tree.
- On screen at Tail Rail 100% / Nose Rail 0%: Tail @ 12" reads 15 7/8" (was 14 3/4") and Nose @ 12"
  reads 10 5/16" (was 12") — each slider moved its own end, in the expected direction.

## Note for whoever does the drag work

The sliders are **Base UI** (`@base-ui/react/slider`), not Radix. `SliderPrimitive.Thumb` renders a
plain div wrapping a hidden `input[type=range]`; the input carries the focus, role and value, and the
thumb div carries none of them. Anything that drives or inspects a slider programmatically has to go
through that inner input.
