---
created: 2026-08-30
title: Extract a shared viewer toolbar button and migrate all screens onto it
area: ui
severity: minor
files:
  - components/outline/outline-editor.tsx
  - components/rocker/rocker-editor.tsx
source: quick task 260830-1g3
resolves_phase:
---

# Extract a shared viewer toolbar button across the design screens

The Template and Rocker screens each float a small row of icon buttons over their drawing —
Rotate, Construction Lines, Wide view, and (Template only) Export Template. Quick task 260830-1g3
gave all seven of these buttons one identical hover/pressed accent-fill treatment, mirrored by hand
between the two files rather than shared. That mirroring now covers three duplicated things:

1. **The button's class string.** Both files carry the same long Tailwind utility string —
   border, radius, padding, the hover accent trio, and (for the toggles) the pressed accent
   add-on — copied verbatim rather than composed once.
2. **The button's box treatment.** Same absolute positioning pattern, same right-offset stepping,
   same icon sizing (`size-6`).
3. **`RotateBoardIcon` itself**, which is already defined twice — once in `outline-editor.tsx`,
   once in `rocker-editor.tsx` — byte-identical, per that file's own header comment describing
   itself as "a faithful local mirror, not a shared extraction."

**Why this task declined to extract:** `rocker-editor.tsx`'s own header states the standing
posture in as many words — these two files are deliberately kept as local mirrors of each other,
not a shared component, so each screen's toolbar stays self-contained. A quick task about a fill
colour is not the place to overturn that standing, explicitly-documented decision. The same
reasoning quick task 260830-122 used for declining to extract a shared `SliderRow` across control
sidebars applies here.

**The trigger:** the moment a THIRD screen grows this same floating toolbar (Rotate / Construction
Lines / Wide view, optionally Export), extract the button — className, box and icon together —
into one shared component and migrate all three screens onto it in the same pass, rather than
letting a third hand-mirrored copy happen.

**Evidence, 2026-08-30:** this same duplicated class string was hand-edited in all seven places
for the second time in one day — quick task 260830-1g3 added the accent fill this morning, and
quick task 260830-1vn removed a border-colour regression from it this afternoon. The duplication
is now costing real edits, not just standing as a documented posture. The trigger above is still
a third screen, which has not happened — this is a cost note, not a decision to extract early.
