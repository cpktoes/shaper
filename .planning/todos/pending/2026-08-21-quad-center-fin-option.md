---
created: 2026-08-21
source: UAT feedback, phase 01
resolves_phase:
---

# Quad fin setup: add optional 5th (center) fin

The Quad fin configuration has no option to add a center fin, making a "quad + center"
(5-fin) setup impossible to express.

**User request (phase 01 UAT):** "Quad fin type is missing option to add a 5th/center fin
(imported from the same Thruster model that the quad uses)."

**Implementation note from the user:** the center fin should be derived from the same
Thruster model the quad already uses — not a separately configured fin. Reuse the existing
thruster-model center-fin placement rather than introducing a new calculation path.

Relevant code: `lib/geometry/fins.ts` (placement math, must stay pure + unit tested),
`components/fins/fin-placement-editor.tsx` (fin setup selection UI).
