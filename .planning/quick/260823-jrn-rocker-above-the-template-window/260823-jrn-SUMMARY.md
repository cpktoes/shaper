---
id: 260823-jrn
slug: rocker-above-the-template-window
description: Taller rocker strip, narrowed to sit over the template window
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - a8e1cde feat(summary): taller rocker strip over the template window
---

# Quick Task 260823-jrn — rocker over the template window

The rocker no longer spans the full body. It sits inside the right-hand column, above the template
window only, and is 58% taller for it.

## What changed

Page 1's body went from three stacked blocks to two:

```
before                          after
├── dimensions row              ├── dimensions row
├── rocker (full width)         └── drawings row
└── drawings row                    ├── rail sections (1/3, full height)
    ├── rail sections (1/3)         └── right column (2/3)
    └── template window (2/3)           ├── rocker
                                        └── template window
```

| Panel | Before | After |
|---|---|---|
| Rocker | 865 x 85 | **555 x 134** (36% narrower, 58% taller) |
| Rail sections column | 279 x 547 | **279 x 743** (36% taller) |
| Template window | 555 x 653 | 555 x 605 |
| Each drawing | 264 x 605 | 264 x 557 |

`order-form-band-rocker` renamed `order-form-rocker` — it is no longer a band of the body, and its
percentage is now read against the right column rather than the whole band.

## The trade-off, and why 18%

At the full body width the drawings were **width**-constrained, so height given to the rocker came
out of slack and cost nothing. Narrowed to the template's width they became **height**-constrained,
and every point the rocker takes now comes directly off the boards. 18% of the column is where the
profile stops looking cramped between the tick columns without the drawings visibly shrinking; the
boards lost 48px of height, which the fixed frame absorbs as letterboxing rather than as a smaller
scale.

The rail plots are the incidental winner: their column runs the full height of the drawings row now
instead of starting below the rocker, so all three are noticeably larger.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean (one pre-existing unused-var warning in
  `outline.test.ts`, untouched). `npx vitest run` — 638 passed / 7 files.
- **Print: both sheets zero overflow at the printable page box, both at zoom 1, zero clipped
  elements.** Still two pages.
- **AA regression re-run** (the layout moved, so the audit was repeated rather than assumed): zero
  failures, minimum ratio still 4.83:1, smallest printed text still 7.9px.

## Note on a false alarm during the work

A DOM probe mid-way reported the whole band collapsed to zero height and width, which looked like
the restructure had mis-nested. It had not — the probe had run while the dev server was still
recompiling, and the JSX was balanced (`tsc` agreed). Re-measuring after the rebuild showed the
correct tree. Worth remembering: measurements taken immediately after an edit can describe a
half-built page, so a surprising result deserves a second look before it is treated as a bug.
