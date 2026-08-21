---
created: 2026-08-21
closed: 2026-08-21
source: UAT feedback, phase 01
resolution: already-implemented
---

# Quad fin setup: add optional 5th (center) fin — ALREADY EXISTS

**Closed without code change.** Investigated 2026-08-21: the feature is fully implemented.

- `lib/geometry/fins.ts` — `FinPlacementSpec.quadCenterFinOn` (line 77); center fin computed at
  lines 483/575/651; setup labelled `" + Center (Five-fin)"` (line 797). Covered by the
  golden-fixture suite in `lib/geometry/fins.test.ts`.
- `components/fins/fin-controls.tsx:442` — an "Add 5th/Center fin" checkbox, rendered whenever
  `flags.quadCenterFinAvailable` is true.
- It already derives from the thruster center-fin placement, which is exactly what the user
  asked for ("imported from the same Thruster model that the quad uses").

**Why the user did not find it:** the checkbox sits below the fold in the fins sidebar (measured
at y=1229 in a 720px-tall viewport), so it required scrolling. It is additionally hidden when
`quadRearModel === "mckeeLB"` (McKee Longboard), which instead shows the explanatory note
"Longboard quad model has no center-fin option." — so on that model it is genuinely absent by design.

**Possible follow-up (discoverability, not functionality):** the fins sidebar is long enough that
real controls sit well below the fold. Worth considering whether fin-setup-specific options should
sit nearer their setup pills. Not filed as a separate todo — raise if it recurs.
