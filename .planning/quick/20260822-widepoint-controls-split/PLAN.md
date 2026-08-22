---
quick_id: 260822-wcs
slug: widepoint-controls-split
date: 2026-08-22
status: planned
source: user request 2026-08-22; groundwork for .planning/todos/pending/2026-08-22-drag-construction-lines-to-shape-the-outline-curve.md
files_modified:
  - components/outline/outline-controls.tsx
  - components/outline/outline-editor.tsx
  - lib/geometry/board.ts
  - lib/geometry/outline.ts
  - lib/geometry/presets.ts
  - lib/geometry/outline.test.ts
  - lib/geometry/presets.test.ts
---

# Quick Task: Widepoint Controls layout + independent nose/tail rail lengths

Two changes to the outline screen's Widepoint Controls, in this order so each commit leaves a
compiling tree with passing tests.

This is deliberate groundwork for the draggable-construction-lines todo: once each widepoint handle
can be dragged on its own, one symmetric `railLength` cannot describe the resulting curve. Splitting
the field now means the drag work lands against a spec that can already represent what it draws.

## Task 1 — Widepoint Width and Offset on one line

`components/outline/outline-controls.tsx`. Widepoint Width is currently a bare full-width `Slider`
in its own `<div>` with a hand-rolled label; Offset and Rail Length share a `flex gap-4` row below.

Convert Widepoint Width to a `SliderRow` (same props the other rows use) and pair it with Offset in
a `flex gap-4` row. Rail Length drops to its own row — which is the row Task 2 fills with two
sliders.

The sidebar is `max-w-[400px]` with `p-6`, so a half-column is ~168px. `SliderRow` already carries
`flex-1`, so the two halves size themselves; no width classes needed.

Widepoint Width keeps its existing bounds (16-25", step 0.125) and its `formatInchesFraction`
display. It has no left/right hints today — leave it that way rather than inventing copy.

## Task 2 — Split `railLength` into `tailRailLength` and `noseRailLength`

`railLength` (0-100) currently scales **both** widepoint handles through one multiplier. Split it
into one field per side, following the `noseFullness`/`tailFullness` naming already in `OutlineSpec`.

Which handle is which — verified against `lib/geometry/outline.ts`:

- `inLen0` is the widepoint's handle pointing back toward the **tail** (`controls[0].c2 = P2 -
  inLen0*dir2`) → driven by `tailRailLength`
- `outLen1` is the widepoint's handle pointing toward the **nose** (`controls[1].c1 = P2 +
  outLen1*dir2`) → driven by `noseRailLength`

### 2a. `lib/geometry/board.ts`

Replace `railLength: number` in `OutlineSpec` with `tailRailLength: number` and `noseRailLength:
number`, both 0-100, keeping the doc comment's "widepoint vector strength" wording since that is what
the prototype calls it. `DEFAULT_BOARD_SPEC` gets both at `50` — the old default.

### 2b. `lib/geometry/outline.ts`

Extract the multiplier into a small named helper and apply it per side:

```ts
const railMult = (pct: number) => 0.8 + (pct / 100) * 0.8;
const inLen0 = railMult(spec.tailRailLength) * HANDLE_CAP * chords[0];
const outLen1 = railMult(spec.noseRailLength) * HANDLE_CAP * chords[1];
```

Identical arithmetic to today when both fields hold the same value — that equivalence is what the
golden tests check. Keep the existing comment explaining why the widepoint handles need no overshoot
cap (its tangent is `dir2`, so `dir2.y = 0`); that reasoning is unchanged by the split and applies to
both sides independently.

### 2c. `lib/geometry/presets.ts`

Four presets carry `railLength` (50, 60, 55, 50). Each becomes both fields at the same value, so
every preset draws exactly the board it draws today.

### 2d. Tests

- `lib/geometry/outline.test.ts:53` — `toOutlineSpec` maps the prototype's `state.widepointVector`.
  Set **both** fields from it. The prototype only ever had one symmetric control, so this is the
  regression guard: goldens must still pass, proving the split is behaviour-preserving when the two
  sides agree.
- `lib/geometry/presets.test.ts:45-46` — the 0-100 range assertion now covers both fields.
- Add one new test asserting the split actually does something: a spec with a long nose rail and a
  short tail rail must produce a different outline from the mirrored spec (nose short, tail long).
  Without it nothing proves the two fields are wired to different handles, and a copy-paste slip
  that pointed both at the same handle would pass every other test.

### 2e. UI

`outline-controls.tsx` — Rail Length becomes two `SliderRow`s in the row Task 1 freed up: "Tail Rail
Length" then "Nose Rail Length", left to right. That order matches the Offset slider directly above,
whose hints already read Tail on the left and Nose on the right. Both keep Rail Length's bounds
(0-100, step 0.25) and its Short/Long hints.

`outline-editor.tsx:48` — `buildPresetSource` is the dev-only "Copy preset values" helper that emits
pasteable preset source. It must emit both fields or captured presets will not compile.

## Verify

- `npm test` — goldens pass unchanged (the equivalence proof) and the new asymmetry test passes.
- `npm run lint` and a build/type-check clean, with no `railLength` left in the tree.
- On screen: Width and Offset share a line; the two rail-length sliders share the line below; moving
  Tail Rail Length changes only the tail half of the curve and Nose Rail Length only the nose half.
