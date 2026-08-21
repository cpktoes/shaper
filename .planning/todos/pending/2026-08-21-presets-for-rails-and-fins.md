---
created: 2026-08-21
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
