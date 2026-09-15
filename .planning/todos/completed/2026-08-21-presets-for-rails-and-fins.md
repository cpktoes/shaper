---
created: 2026-08-21
closed: 2026-09-14
resolution: implemented
title: Extend presets beyond outline to rail bands and fin setups
area: general
severity: minor
files:
  - lib/geometry/presets.ts
  - components/design/design-store.tsx
source: UAT feedback, phase 01
resolves_phase:
---

# Extend presets beyond outline: rail bands and fin setups

**Closed 2026-09-14 — done.** Every preset now carries the shaper's own rail bands and fin setup,
captured from the Rails and Fins screens' development-only "Copy preset values" buttons and pasted
into `lib/geometry/presets.ts` wholesale: Shortboard (d376b1a), Fish (63a1848), Mid-length
(9b7df25) and Longboard (a99aace), all on 2026-09-14. Picking a preset now gives a coherent
starting board — outline, rocker, foil, rails and fins — exactly as asked.

- The structural half (`BoardPreset` carrying `rails` and `fins`, seeded with the two defaults)
  landed on 2026-08-29 with the D-12 seeding; today's captures replaced the seeds with the
  founder's own numbers, and no preset carries the defaults any more.
- The prerequisite noted below (WR-01 — `applyPreset` leaving a stale board's rails behind) was
  fixed before this: `applyPreset` now spreads `DEFAULT_DESIGN_STATE` and replaces the whole board,
  never a patch merge (see `components/design/design-store.tsx`).


Board-type presets currently carry only outline character. Extend `BoardPreset` so a preset also
seeds rail-band settings and fin setup, so picking "Fish" gives a coherent starting board rather
than only a starting outline.

**User request (phase 01 UAT):** "I also think I'll want to preset rail bands and fin setups
later, not just the outline."

Relevant code: `lib/geometry/presets.ts` (`BoardPreset` shape), `components/design/design-store.tsx`
(`applyPreset`).

**Related:** the phase-01 code review found `applyPreset` already fails to reset rails/fins/volume/
boardName when replacing a board (REVIEW.md WR-01). Fixing that is a prerequisite for this — a
preset that seeds rails/fins is meaningless if a stale board's rails survive the swap.
