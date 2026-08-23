---
id: 260823-ipc
slug: accent-tinted-shading-and-aa-compliant-t
description: Accent-tinted shading and AA-compliant type on the order form
date: 2026-08-23
mode: quick
branch: design/order-form-summary
---

# Quick Task 260823-ipc — accent-tinted shading, readable type

Two changes to the order form: the shaded panels take the reduced accent hue instead of grey, and
page 1's type comes up to a size that survives printing.

## What the audit found first

Measured in the browser across every text node on both sheets, compositing each translucent
background down its ancestor chain and converting screen sizes to their printed equivalents (the
sheet prints at 733px against an 880px screen, so **printed type is 83% of what the screen shows**).

**Contrast is very nearly fine.** Exactly one AA failure: the logo block's placeholder line, muted
`#6b6b6b` on the muted/10 wash, at **4.25:1** against the 4.5:1 it needs. Everything else clears —
most text is 5.33:1 or better. So this is a one-line fix, not a palette problem, and the real work
is size.

**Size is the actual problem, and it is worse than it looks on screen.** The smallest band prints at
**5.8px** and the caption band — every field label on the form — prints at **6.7px**. That is the
"too small to be useful" complaint, and it is why it reads worse on paper than in the browser.

| Token | Screen now | Prints now | Prints after |
|---|---|---|---|
| micro | 7px | 5.8px | 7.9px |
| caption | 8px | 6.7px | 8.3px |
| group | 8px | 6.7px | 8.3px |
| row | 9px | 7.5px | 8.8px |
| value | 10px | 8.3px | 9.6px |
| dim | 15px | 12.5px | unchanged |
| wordmark | 22px | 18.3px | unchanged |

Page 2's scale is declared separately and already prints 9–11.6px, so it is left alone.

## Approach

**Shading.** A sheet-local `--order-form-shade` token, built the same way as globals.css's existing
`--outline-board-fill`: `color-mix(in srgb, var(--color-surf-accent-blue) N%, white)`. That recipe is
already this app's vocabulary for "reduced accent hue", so the form borrows it rather than inventing
a second one. Applied to the shaded panels on the paper — logo block, the three spine labels, and the
`SHAPER USE ONLY` box.

The percentage is bounded by contrast, not taste: the tint darkens the background under muted text,
which is what pushed the logo line to 4.25:1 in the first place. It has to stay light enough that
`#6b6b6b` still clears 4.5:1 on it — to be confirmed by measurement, not arithmetic.

The desk behind the paper stays neutral grey. It is screen furniture that never prints, and a
neutral surround is what makes the sheet read as paper.

**Type.** Raise the `cqw` coefficients (and their clamp floors proportionally) to hit the printed
targets above. The risk is page 1 overflowing — it is the densely packed page and the header band is
already carrying four fields plus the shaper box — so the print measurement is the gate on this task,
not an afterthought.

## Tasks

### Task 1 — Accent-tinted shading

**Files:** `app/design/summary/order-form.css`, `components/summary/order-form-primitives.tsx`,
`components/summary/order-form.tsx`

### Task 2 — Type scale

**Files:** `app/design/summary/order-form.css`

### Task 3 — Verify

Re-run the contrast/size audit: **zero** AA failures, and no printed text below 7.9px. Then confirm
both sheets still measure zero overflow at the printable page box with the fit scale at 1 — if page 1
no longer fits, the band proportions give way before the type does.

## Out of scope

- Page 2's type scale, already legible.
- The desk background behind the paper.
