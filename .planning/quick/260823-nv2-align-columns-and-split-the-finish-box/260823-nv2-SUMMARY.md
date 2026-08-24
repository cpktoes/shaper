---
id: 260823-nv2
slug: align-columns-and-split-the-finish-box
description: Align the left column across bands and split Finish into Leash and Finish
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - a3815b3 feat(summary): one column geometry, taller dims row, split leash and finish
---

# Quick Task 260823-nv2 — one left column, and a split finish box

## 1. The logo box, Rail Sections and Laminating now share a right edge

They were "about a third" arrived at three different ways — `w-[34%]`, `flex-[1]` against a
`flex-[2]`, and one of three equal boxes — which is why none of them lined up. Two things were
wrong underneath:

- **The bands did not share a left inset.** `RailLabel` sized to its own text, so the spine was a
  different width in each band. It now has a fixed width (`--order-form-spine`), which also lines
  page 2's spine up with page 1's.
- **The same percentage meant different pixels.** The glassing boxes were direct children of their
  band while the drawings row sat inside a content column, so percentages resolved against different
  widths. The glassing boxes are now wrapped in a content column too.

With those fixed, all three derive from one geometry — `--order-form-spine`, `--order-form-gap`,
`--order-form-left` — rather than three hand-tuned numbers. The logo is the odd one out because it
sits *before* its band's spine rather than after it, so it spans the spine, the gap and the left
column together:

```
calc(spine + gap + (100% - spine - gap) * left)
```

**Measured, not eyeballed** — right edges from the sheet's left, at print width:

| | logo | Rail Sections | Laminating |
|---|---|---|---|
| before | 200.36 | 299.52 | 298.53 |
| after (screen) | 299.53 | 299.52 | 299.52 |
| **after (print)** | **252.63** | **252.63** | **252.63** |

Spread at print width: **0px**.

## 2. Core dims row taller, with room to breathe

6.2% → 7.4%, and the cells go from `gap-[1px] px-1.5 py-1` to `gap-[3px] px-2 py-1.5`, so the
caption is no longer jammed against its measurement.

## 3. Finish splits into Leash and Finish

- **Leash** — Leash Cup, Drill Hole
- **Finish** — Sanded, Gloss & Polish

They are separate jobs — one is hardware set into the blank, the other is how the glass gets taken
down. Ticks stack rather than pair up: at a third of the row there is no width for two across.

## 4. Fin System, Leash and Finish take three equal portions

`flex: 1 1 0` each, of what remains after Laminating's left column. Measured at print width:
**153.77px each, identical.**

## The one that cost time

`flex: 0 0 calc(...)` did not survive this project's CSS pipeline. The rule reached the browser
intact — it is right there in `document.styleSheets` — and the elements matched the selector, but the
computed `flex-basis` came back `auto` while grow and shrink applied, **on some elements and not
others**. The same declaration set inline computed correctly (`calc(32% + 15.232px)` → 292.03px,
exactly the intended value), and the custom properties resolved identically on the failing and
working elements, so neither syntax nor inheritance explained it.

Rather than keep chasing it, the geometry moved to `flex: none` plus an explicit `width`. A
percentage `width` on a flex item resolves against the same container inner width a percentage basis
would, so the geometry is identical — and the longhand is clearer anyway about which axis is being
fixed. Everything aligned to the pixel on the first measurement after the switch.

Worth knowing before reaching for `flex: 0 0 calc(...)` again in this codebase.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean (one pre-existing unused-var warning in
  `outline.test.ts`, untouched). `npx vitest run` — 638 passed / 7 files.
- **Alignment: 0px spread across the three right edges at print width** (0.01px on screen, sub-pixel
  rounding). All three spines measure 18.4px.
- **Thirds: Fin System, Leash and Finish all exactly 153.77px.**
- **Print: both sheets zero overflow at the printable page box, both at zoom 1, zero clipped
  elements.** Still two pages.
- **AA re-run** (layout moved, so repeated rather than assumed): zero failures, minimum ratio 4.83:1,
  smallest printed text 7.9px.
