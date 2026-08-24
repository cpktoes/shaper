---
id: 260823-sv4
slug: wider-order-form-spines
description: Widen the order form's spine labels
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - e5e76a8 feat(summary): widen the order form's spine labels
---

# Quick Task 260823-sv4 — wider spines

The vertical band labels — `RIDER INFO`, `SURFBOARD SHAPE AND DESIGN`, `GLASSING` and page 2's
`SHAPING DATA` — were 18.4px wide holding 12px type, barely 3px of air either side. They are 24px
now, leaving 6px.

**One value moved:** `--order-form-spine`, `1.15rem` → `1.5rem`.

## The column geometry passed its first real test

`--order-form-spine` is one of the three properties the sheet's column geometry derives from
(`260823-nv2`), and the logo column is written as `calc(spine + gap + (100% - spine - gap) * left)`
specifically so it tracks the spine rather than being tuned to it. Widening the spine should
therefore keep the logo / Rail Sections / Laminating right edges aligned by construction.

It did. All three edges moved together from 252.63 to **256.44px** — **0px spread**, no other value
touched. That geometry was built two tasks ago on the argument that deriving beats hand-tuning; this
is the first edit that could have falsified it, and it held.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean (one pre-existing unused-var warning in
  `outline.test.ts`, untouched). `npx vitest run` — 638 passed / 7 files.
- **All four spines measure exactly 24px** (three on page 1, one on page 2).
- **Right edges: 0px spread** at print width.
- Both sheets zero overflow, zero clipped elements, zoom 1. Still two pages.
- The 9pt floor still holds at exactly 12px.

## One thing worth knowing, not caused by this change

A screenshot mid-verification showed the dimension captions colliding badly. That was the browser
pane sitting at a **483px** viewport, not the print layout — every measurement above was taken at the
pinned 733px printable width, and at a normal window the sheet renders cleanly.

But it is a genuine standing consequence of the 9pt floor from `260823-pw7`: below roughly a 600px
viewport the type cannot shrink any further while the sheet keeps narrowing, so captions outgrow
their cells — measured at 483px, four of the seven dimension captions exceed their 56px cell. The
sheet is a fixed-aspect paper preview and there is no responsive treatment for it. Worth a task if
the form is ever expected to be readable on a phone; harmless if it is a desktop-and-print screen.
