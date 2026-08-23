---
id: 260823-jrn
slug: rocker-above-the-template-window
description: Taller rocker strip, narrowed to sit over the template window
date: 2026-08-23
mode: quick
branch: design/order-form-summary
---

# Quick Task 260823-jrn — rocker over the template window

The rocker box spanned the full body width, sitting above both the rail plots column and the
template window. It moves inside the right-hand column, above the template window only, and takes
the height it gains from being narrower.

## Why it belongs there

A rocker profile is the board seen from the side. The one panel it belongs over is the one showing
the board from above — putting it over the rail cross-sections as well was width it had no claim to.

## Approach

Restructure page 1's body from three stacked blocks into two:

```
before                          after
├── dimensions row              ├── dimensions row
├── rocker (full width)         └── drawings row
└── drawings row                    ├── rail sections (1/3, full height)
    ├── rail sections (1/3)         └── right column (2/3)
    └── template window (2/3)           ├── rocker
                                        └── template window
```

Two things follow from the move:

- **The rail plots get taller.** Their column now runs the full height of the drawings row rather
  than starting below the rocker.
- **The height is no longer free.** At the full body width the drawings were width-constrained, so
  the rocker's height came out of slack. Narrowed to the template's width they become
  height-constrained, and every point the rocker takes now comes off the boards. The rocker goes to
  18% of its column — enough that the profile stops looking cramped between the tick columns,
  without the drawings visibly shrinking.

`order-form-band-rocker` is renamed `order-form-rocker`: it is no longer a band of the body, and its
percentage is now read against the right column rather than the whole band.

## Tasks

### Task 1 — Restructure and re-height

**Files:** `components/summary/order-form.tsx`, `app/design/summary/order-form.css`

**Verify:** `npx tsc --noEmit`, `npx eslint`, `npx vitest run`; both sheets still measure zero
overflow and zero clipping at the printable page box with the fit scale at 1; the AA audit from
`260823-ipc` still passes.

## Out of scope

- The rocker's contents, still a placeholder until the rocker screen exists.
- Page 2.
