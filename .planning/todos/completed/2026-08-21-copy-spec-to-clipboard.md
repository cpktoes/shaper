---
created: 2026-08-21
closed: 2026-09-14
resolution: superseded
title: Copy-spec-to-clipboard across the design screens
area: ui
severity: minor
files:
  - components/rails/rail-band-editor.tsx
  - components/fins/fin-placement-editor.tsx
  - components/volume/volume-estimator.tsx
  - components/outline/outline-editor.tsx
source: sweep of deferred items in quick tasks 260818-lm0 / -mr2 / -nyw / -kvp
resolves_phase:
---

# Copy-spec-to-clipboard across screens

**Closed 2026-09-14 at the founder's request, without code.** No shaper-facing "copy this screen's
numbers" button was built. What exists instead:

- The four development-only "Copy preset values" buttons (TEMPLATE, ROCKER, RAILS and FINS) serialise
  the live spec to the clipboard for the preset-capture loop — since 14b03a7 through the shared,
  tested `lib/geometry/preset-source.ts`, copying the exact stored value. They are for capturing
  presets into `lib/geometry/presets.ts`, not a shaper's export, and never ship in production.
- A shaper's numbers now leave the app on paper: the Summary order form, the Overview Sheet, the Full
  Sized Template and the Paper Saver all carry the board's dims in the shaper's chosen units.

If a plain-text export is ever wanted again, reopen this — the prototype's per-screen `specLines`
builders remain the content source, and the preset-source module is the serialisation precedent.


Every prototype screen has a copy-to-clipboard spec export, and all four were deferred
independently, so no single todo ever captured them:

- Rails — "Copy Specs" / "Print Rails & Data" sidebar buttons (`260818-lm0`)
- Fins — "Copy Specs" / `specLines` / `copyToast` (`260818-mr2`)
- Volume — "Copy Volume Spec" / `specLines` / `copyToast` (`260818-nyw`)
- Template/outline — "Copy Template Specs" / `onPrintSpecs` (`260818-kvp`)

Worth doing as one consistent feature rather than four separate ports: a shared "copy this screen's
numbers as text" affordance with a shared toast. The per-screen `specLines` builders in the
prototype are the content source for each.

**Precedent already in the codebase:** the dev-only "Copy preset values" buttons on the outline,
rails and fins screens do exactly this shape of thing (serialise live state to the clipboard with a
"Copied!" confirmation). Reuse that pattern — and note its known wrinkle, that it reports "Copied!"
before the clipboard promise resolves (`01-REVIEW.md`, Info finding).

**Not the same as printing.** The prototype's "Print X & Data" paths are print-path work; group
those with TMPL-01 / Phase 3 instead.
