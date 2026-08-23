---
id: 260823-ipc
slug: accent-tinted-shading-and-aa-compliant-t
description: Accent-tinted shading and AA-compliant type on the order form
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - f43dea9 feat(summary): accent-tinted shading and print-legible type on the order form
---

# Quick Task 260823-ipc — accent-tinted shading, readable type

## What the audit found before changing anything

Measured in the browser across every text node on both sheets, compositing each translucent
background down its ancestor chain and converting screen sizes to printed ones (the sheet prints at
733px against an 880px screen, so **printed type is 83% of what the screen shows**).

**Contrast was very nearly fine.** Exactly one AA failure — the logo block's placeholder line, muted
`#6b6b6b` on the grey wash, at **4.25:1** against the 4.5:1 it needed. Everything else cleared, most
at 5.33:1 or better.

**Size was the real problem, and worse on paper than it looked on screen.** The smallest band printed
at **5.8px** and the caption band — every field label on the form — at **6.7px**.

## What changed

**Type scale.** Coefficients and clamp floors raised so nothing prints under ~8px:

| Token | Prints before | Prints after |
|---|---|---|
| micro | 5.8px | 7.9px |
| caption | 6.7px | 8.3px |
| group | 6.7px | 8.3px |
| row | 7.5px | 8.8px |
| value | 8.3px | 9.6px |

`dim` (12.5px) and `wordmark` (18.3px) were already fine and are unchanged. Page 2's scale is
declared separately, already prints 9–11.6px, and was left alone.

**Shading.** A sheet-local `--order-form-shade` token — `color-mix(in srgb, var(--color-surf-accent-blue)
7%, white)`, built the same way globals.css builds `--outline-board-fill`, so the form borrows this
app's existing vocabulary for "accent at low strength" rather than inventing a second one. Applied to
the logo block, the three spine labels and the `SHAPER USE ONLY` box.

**7% is a contrast ceiling, not a taste choice.** Any tint darkens the ground under the muted text on
it — which is exactly what put the logo line under AA when it was grey. 7% leaves that line at
4.83:1; a heavier tint would fail it again.

The desk behind the paper stays neutral: it is screen furniture that never prints, and a neutral
surround is what makes the sheet read as paper.

## Two things the bigger type broke, and how

Raising the scale was not free, and the print measurement caught both:

1. **The dimensions cells clipped their measurements by 2px.** Not a band-height problem, which is
   why raising the band did not fix it: the value span carried `leading-none`, making its line box
   shorter than the glyphs inside it, and `truncate`'s `overflow: hidden` then cut them. Now
   `leading-[1.15]` — still tight, but tall enough to contain its own ink. This was latent before the
   change and would have clipped a descender at any size.
2. **The rocker box clipped by 12px.** Genuinely a height problem: it is a caption-over-content box
   and the caption grew. Its band went 7.5% → 11.5%, and the dims band 5.4% → 6.2%. Both took the
   height from the drawings row, which is `flex-1` and had the slack.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean (one pre-existing unused-var warning in
  `outline.test.ts`, untouched). `npx vitest run` — 638 passed / 7 files.
- **Contrast: zero AA failures** across all 23 distinct text styles on both sheets, against the real
  composited backgrounds. Minimum ratio now **4.83:1** (was 4.25:1 failing). Large-text styles were
  scored against the 3:1 threshold, everything else against 4.5:1.
- **Size: smallest printed text is 7.9px**, up from 5.8px.
- **Clipping: zero.** Every element with a hidden overflow was checked for content exceeding its box,
  at the printable page size — 8 clipped elements before the fixes, none after.
- **Print: both sheets pinned to 733.4 x 990.6px inside the 733.4 x 995.5px page box, zero overflow,
  both at zoom 1.** Still two pages.

## Note

AA is a contrast standard and sets no minimum font size, so "AA compliant" was read as both parts of
the request: contrast measured against the real thresholds, and the sizes raised on the separate
grounds that they were too small to be useful. The two interact — the tint had to be held light
enough not to break the contrast the larger type was meant to make readable.
