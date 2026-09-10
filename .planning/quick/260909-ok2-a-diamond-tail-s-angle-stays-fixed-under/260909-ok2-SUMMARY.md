---
quick_id: 260909-ok2
status: complete
completed: 2026-09-09
plan: 260909-ok2-PLAN.md
---

# Quick task 260909-ok2 — A diamond tail's angle stays fixed under the drag point

## What a shaper sees now

On a diamond tail the Tail Angle slider is greyed out, and now the drawing agrees with it: dragging
the tail's handle — with a mouse on a desktop or a thumb on a phone — changes only the tail's
fullness. The handle slides along the fixed 30° direction; pushing it sideways does nothing. The
touch readout card for that handle shows just `Fullness — 30%`. Every other tail shape keeps both
degrees of freedom exactly as before.

## What changed

- `lib/geometry/outline.ts`: the outline geometry now records `tailAnglePinned` (true for a
  diamond, mirroring the existing `tailBlockPinned`) and `tailAngle`, the angle it was built with.
- `lib/geometry/outline-drag.ts`: the tail-handle solve, when pinned, projects the drag onto the
  fixed direction for fullness and never writes `tailAngle` back.
- `components/outline/outline-viewer.tsx`: the readout card names only Fullness for a pinned tail.
- `lib/geometry/outline-drag.test.ts`: five new cases — the flag on a diamond and not a squash; a
  diamond drag writes only `tailFullness`; an undragged handle round-trips its fullness; sideways
  travel leaves fullness unchanged while travel along the direction raises it; a squash keeps both
  fields.

## Proof

`npx tsc --noEmit` clean; `npx vitest run` 52 files, 2381 passed, 2 skipped; `npm run lint` 0
errors; `PW_PORT=3131 npx playwright test` 165 passed, 0 failed, five desktop baselines unchanged
(the default board is a squash, so no desktop pixel moves); `npm run build` clean.

## Human verification deferred

- Pick the Diamond tail on TEMPLATE (desktop and phone), drag the tail handle: the angle stays at
  30° while fullness follows the handle along that line; switch to Squash and both move again.
