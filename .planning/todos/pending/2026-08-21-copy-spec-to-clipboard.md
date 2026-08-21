---
created: 2026-08-21
source: sweep of deferred items in quick tasks 260818-lm0 / -mr2 / -nyw / -kvp
resolves_phase:
---

# Copy-spec-to-clipboard across screens

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
