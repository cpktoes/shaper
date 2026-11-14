---
created: 2026-11-14
title: Boards at four feet and twelve feet — things worth the founder's eye
area: ui
severity: minor
files:
  - components/3d/board-scene.ts
  - components/summary/order-form.tsx
  - components/summary/bottom-contours-sheet.tsx
  - components/rails/rail-controls.tsx
  - lib/geometry/fins.ts
  - lib/geometry/blank-fit.ts
source: quick tasks 261113-si7, 261113-vya and 261113-psx, their SUMMARY lists, 2026-11-13/14
resolves_phase:
---

# Boards at four feet and twelve feet — things worth the founder's eye

## Problem

Nothing here is broken; each was reported to the founder and left as it is:

- 3D: a 12'0" board looks short and stubby in the default view, because the room makes the viewer stand nearly end-on.
- SUMMARY's rocker strip at 12'0": the nose-tip and 12" readings sit close enough to read as one run.
- SUMMARY's BOTTOM cross-section: the "HEIGHT ×4" label sits about 3 dots above its drawing's top edge, on every board size.
- Blanks: only two fit a 12'0" × 31" (US Blanks 12'1" EPS and 12'6" EPS); Marko's 12'0" SUP blank has no thicknesses on its page.
- The blank list is slow for a short, wide board (about 12 s for a 4'0" × 25"); a 12'0" × 31" `.brd` takes about 3.6 s to read.
- The Paper Saver's caption still says "≤20.5" wide".
- A 4'0" quad's rear fins start 1/4" ahead of where the fronts end; the Longboard preset's single fin has a 10 1/2" base on four feet.
- The printed bottom tables: boards from 11'0" to 11'6" print none of the reading notes while a 12'0" now prints all (see also
  the 2026-11-11 to-do on long boards with channels); and on short wide boards with every cut and 8 channels page 3's picture is squeezed.
- RAILS: with Tail Rail Ends At at its lowest and Blends From at 12", Blends From has no room to move and its dot is not drawn;
  the new default puts that a click or two away.

## What is needed

The founder's pick of which matter, then one small task for each.
