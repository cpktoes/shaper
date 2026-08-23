---
id: 260823-ffv
slug: rebuild-the-summary-screen-as-a-portrait
description: Rebuild the Summary screen as a portrait order-form layout
date: 2026-08-23
mode: quick
branch: design/order-form-summary
---

# Quick Task 260823-ffv — Summary as a shop order form

Rebuild `/design/summary` as a **single portrait page that reads like a real custom board
order form**, using `LB_order_form.pdf` (Kontoes Surfboards) as the layout muse. This replaces
the landscape dashboard on `main`; the branch exists so the two styles can be compared.

## The muse, and what changes

The muse is a fillable shop order form: a boxed header (logo block, `RIDER INFO`, a
`SHAPER USE ONLY` sub-box), a `SURFBOARD SHAPE AND DESIGN` body with vertical rail labels down
the left edge, and a `GLASSING` band across the bottom. Everything is hairline-boxed, ALL-CAPS,
and dense — a working document, not a dashboard.

| Muse section | What we do |
|---|---|
| Logo block (top-left) | App logo + info placeholder. Paid users upload their own later. |
| `RIDER INFO` | Keep as-is — name, ph #, height, weight. |
| `SHAPER USE ONLY` | Keep, **add a Board Name slot**. Blank & Rocker / Board# / Price stay. |
| Dimensions row | Keep. Length / Nose / Center / Tail / Thickness, **plus Volume** — it is the app's headline calculated number and the row is its natural home. |
| `TAIL SHAPE` row | **Removed** — tail shape is built into the outline. |
| `ROCKER` | Keep as a **placeholder box**, to be populated when the rocker feature lands. |
| `CONTOURS` / `RAILS` checkboxes | **Replaced** by the real rail section plots + the rail band marking data table. |
| Board outlines | Drawn **twice** — `DECK` and `BOTTOM` — callout dimensions suppressed (they have their own row). Fin marks on `BOTTOM` only. |
| Fin placement numbers | **New** — computed table beside the bottom outline (D-01). |
| `LAMINATING` / `FINISH` | Keep. |
| `FIN SETUP` checkboxes | **Replaced** by a fin system selector (FCS II, Futures, …) — fins are defined on the board now. |
| `CLEAR FORM` button | Becomes the **Print** button, rendered below what actually prints. |

## Decisions (locked — from the user, do not revisit)

- **D-01** — Computed fin placement numbers sit **beside the bottom outline**, where the fin
  marks are drawn, so the numbers sit next to the picture they describe. The `SHAPER USE ONLY`
  box keeps only Blank & Rocker / Board# / Price.
- **D-02** — **Board Name** and the new **Fin System** selector are live now. Every other
  order-form field (rider info, glassing weights, finish, board#, price) renders as a blank
  ruled write-in field. All fields go through one shared field component, so making a field
  live later is adding a `value`/`onChange` pair — the user's stated goal is all-live
  eventually, and the layout must not have to change to get there.

## Tasks

### Task 1 — Store + print-fit groundwork

**Files:** `components/design/design-store.tsx`, `components/summary/use-print-fit.ts`

- Add `finSystem: FinSystem` to `DesignState` / `DesignContextValue` with `setFinSystem`,
  defaulting to `"fcs2"`, and set `boardStarted` on write like every other mutator. Declare the
  `FIN_SYSTEMS` option list in `lib/geometry/fins.ts` beside the existing `FIN_SETUPS`, so the
  fin vocabulary stays in one place.
- Generalize `useSummaryPrintFit` to take an orientation. Portrait target = the smaller of
  Letter-portrait (8.5×11) and A4-portrait (8.27×11.69) on each axis, same
  `PAGE_MARGIN_MM` / `FIT_SAFETY` derivation the landscape path already uses. The `@page`
  rule flips to `size: portrait`.

**Verify:** `npx tsc --noEmit` clean; `npx vitest run` still green.
**Done:** Store exposes `finSystem`/`setFinSystem`; the hook fits a portrait page box.

### Task 2 — Order-form components

**Files:** `components/summary/order-form-primitives.tsx`, `components/summary/order-form.tsx`,
`app/design/summary/order-form.css`

- Primitives, matching the muse's drafting vocabulary: `FormBox` (hairline-boxed panel with an
  ALL-CAPS caption), `RailLabel` (the vertical `RIDER INFO` / `SURFBOARD SHAPE AND DESIGN` /
  `GLASSING` spine labels), `FormField` (D-02 — ruled write-in line by default, live input when
  handed `value`/`onChange`), `LogoBlock` (SHAPER wordmark + shop info placeholder).
- `order-form.tsx` assembles the sheet from those primitives, reading every calculated number
  from `useDesign()` and rendering the **existing** view components (`OutlineViewer`,
  `RailSectionPlot`, `RailDataTable`, `VolumeCalculationCard` values) — no panel reimplements a
  view, so a printed number cannot drift from the screen it came from.
- Deck outline: `hideCallouts` + `hideFinMarks`. Bottom outline: `hideCallouts`, fin marks on.
- Fin placement table built from `finPlacement.sections` — the same
  Trailing Edge / Leading Edge grouping `fin-data-panel.tsx` renders.

**Verify:** Screen renders at desktop width with no console errors.
**Done:** The full sheet renders from live store values.

### Task 3 — Route swap and print verification

**Files:** `app/design/summary/page.tsx`, remove `components/summary/board-summary.tsx` and
`app/design/summary/summary.css`

- Point the route at the order form; drop the landscape dashboard and its stylesheet (both stay
  on `main`).
- Print button sits **below** the sheet and is `data-print-hide`, so it never prints.
- Verify in the browser: portrait sheet, one page, nothing clipped.

**Verify:** `npx tsc --noEmit`, `npx next lint`, `npx vitest run`; browser render + print check.
**Done:** `/design/summary` is the order form and prints to one portrait page.

## Out of scope

- Persisting rider/glassing/price fields (Phase 2's named-model saving).
- Real logo upload (a paid-tier feature).
- The rocker plot itself — the box is a placeholder until the rocker feature exists.
