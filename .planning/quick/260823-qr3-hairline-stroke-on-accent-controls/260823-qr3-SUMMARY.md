---
id: 260823-qr3
slug: hairline-stroke-on-accent-controls
description: Hairline stroke around the accent-filled controls
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - 609554c feat(controls): hairline stroke on the accent-filled controls
---

# Quick Task 260823-qr3 — a stroke around the accent controls

The accent-filled controls were flat blobs of `#006994` on white: a solid slider thumb whose border
was the same colour as its fill, a filled range in an unbordered track, and filled toggle buttons.
No edge anywhere. Everything else this app draws — the outline viewers, the rail plots, every box on
the order form — is defined by a hairline, so the controls were the one place that language dropped.

They now carry a `surf-black` hairline. The accent fill is unchanged; it just gained an outline.

| Element | Before | After |
|---|---|---|
| Slider track | no border, 4px | **1px surf-black**, 6px |
| Slider range | accent fill | accent fill (unchanged) |
| Slider thumb | accent fill, accent border | accent fill, **1px surf-black** |
| Fin setup / model toggles (3) | `border-surf-accent-blue` | `border-surf-black` |
| Summary Print button | `border-surf-accent-blue` | `border-surf-black` |

## Centralised first, then changed

The slider treatment was one identical three-utility string —
`[&_[data-slot=slider-range]]:bg-surf-accent-blue [&_[data-slot=slider-thumb]]:border-surf-accent-blue [&_[data-slot=slider-thumb]]:bg-surf-accent-blue`
— repeated **14 times** across outline (2), rails (5), volume (4) and fins (3). Editing fourteen
copies to make one visual change is how they drift apart, so it moved to a single `.slider-accent`
class in `globals.css` and the call sites became one class name.

`components/ui/slider.tsx` was deliberately left untouched: it is shadcn-generated and may be
regenerated, so the app's own styling has to live outside it. Reaching the primitive through its
`data-slot` hooks is exactly what the call sites were already doing through arbitrary variants — this
just says it once.

## The track had to grow

A 1px stroke either side of the primitive's 4px track leaves 2px of interior, which reads as a muddy
line rather than a channel with something in it. The track is 6px now, so the accent range still has
4px to show. This was the one thing flagged in the plan as needing to be looked at rather than
assumed, and it did need the change.

Worth noting for anyone reading the geometry: the range measures the full 6px, not the 4px interior.
It cannot paint over the stroke, because `overflow: hidden` on the track clips descendants to the
padding box, which excludes the border — so the outline is always visible, including across the
filled portion.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean (one pre-existing unused-var warning in
  `outline.test.ts`, untouched). `npx vitest run` — 638 passed / 7 files.
- **All 14 slider call sites replaced**, plus the 3 fin toggles and the print button — a grep for
  either old string returns nothing.
- Computed values on the rails screen: track `1px rgb(17, 17, 17)` at 6px, range
  `rgb(0, 105, 148)`, thumb `1px rgb(17, 17, 17)` on `rgb(0, 105, 148)`. 12 sliders on that screen
  all carry the class.
- Print button: `1px rgb(17, 17, 17)` border, `rgb(0, 105, 148)` fill, white text — fill and text
  unchanged, so its 6.09:1 contrast is untouched.
- Visual check on the rails and fins screens; the order form still prints two pages at zoom 1 with
  zero overflow.

## Not done

- `components/ui/*` primitives — out of scope by design.
- The checkbox's checked state, which is `--primary` (near-black), not the accent.
- The tail-shape selector's *tinted* selected state, which already carries a visible border — it is a
  wash rather than a fill, so it was never edgeless.
- The design sidebars' label wrapping at narrow widths (`Family — med` colliding with its tick
  labels, visible in the rails screenshot). Pre-existing and unrelated to this change, but real.
