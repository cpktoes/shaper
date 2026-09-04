---
created: 2026-08-21
title: Global settings: units toggle (inches vs cm) and colour themes
area: ui
severity: minor
files:
  - components/site-nav.tsx
  - lib/geometry/units.ts
source: UAT feedback, phase 01
resolves_phase: 5
---

# Global settings: units toggle (inches vs cm) and colour themes

Add a global settings surface offering a units preference (inches vs centimetres) alongside
other global preferences such as colour themes.

**User request (phase 01 UAT):** "Later, we'll want to add a Units option for Inches vs cm
but that can be added in a later phase when I add other global settings like color themes."

**Explicitly deferred by the user** — do not implement standalone; bundle with the global
settings work.

Note: the project constraint already stores all data in metric internally and converts only at
the UI surface (`mmToInches`, `formatInchesFraction`, `cubicMmToLitres`), so a units toggle is a
presentation-layer change, not a data change. That existing separation is what makes this cheap.
