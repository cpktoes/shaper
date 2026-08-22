---
quick_id: 260822-n02
slug: fin-placement-not-clipped
date: 2026-08-22
status: planned
source: user report 2026-08-22 — fin placement diagram cut off on the Summary; blocks finishing the print-sheet todo
files_modified:
  - components/fins/fin-viewer.tsx
  - components/summary/board-summary.tsx
---

# Quick Task: Stop the Summary's fin placement diagram being cut off

Two separate causes. The user reported the second and asked for the fix to come from Volume's spare
space rather than from shrinking the diagram — but the first is why the drawing is clipped at all,
and a bigger card alone would just scale the same clipped drawing up.

## 1. The fin viewer's content overflows its own viewBox (the actual clipping)

`fin-viewer.tsx` draws into `viewBox="0 0 530 370"`, but its own drawing starts ABOVE y=0:

- `svgTopY = TAIL_Y - (24 - VIEW_TOP_MARGIN) * SCALE` = `320 - 23.4*14` = **-7.6**. Every constant,
  so this is true for every board.
- Measured content bboxes in the browser: the tail outline path tops out at **-15.7**, the
  centreline at -7.6, and the compact heading (`6'0" · 14 3/4" tail`, drawn at `svgTopY - 6`) at
  **-25.1** — that heading is entirely above the viewBox, i.e. never visible on the Summary at all.

Fix: start the viewBox above the content instead of at zero. Add named constants next to the
existing `TAIL_Y` / `SCALE` group so the frame stays tied to the drawing:

```ts
const VIEW_MIN_Y = -36;              // clears the compact heading with margin to spare
const VIEW_WIDTH = 530;
const VIEW_HEIGHT = 370 - VIEW_MIN_Y;
```

and use them for both the `viewBox` and the aspect-ratio wrapper, which currently hardcodes
`aspect-[530/370]` and would letterbox against a taller viewBox.

This also affects the Fins screen (same component, non-compact). There the outline was clipped too,
just less visibly — check that screen after.

## 2. The Summary's right column splits 50/50 regardless of need

`board-summary.tsx` stacks Volume Estimate and Fin Placement in a flex column with **both** on
`flex-1 min-h-0`. Measured at 1280x860: Volume 338px tall for about 120px of content, Fin 326px.

Volume becomes `flex-none` (sized by its content) and Fin Placement keeps `flex-1 min-h-0`, taking
everything left over. No change to the diagram's own scale rules — it simply gets a bigger box, which
is what the user asked for.

## Verify

- The fin SVG's content bbox sits fully inside its viewBox (no negative overflow on any side).
- The compact heading is visible on the Summary — it never has been.
- Fin Placement card is materially taller than before; Volume is content-height with no dead space.
- The Fins screen still renders correctly at full size.
- `npm test`, `tsc`, `eslint` clean.
