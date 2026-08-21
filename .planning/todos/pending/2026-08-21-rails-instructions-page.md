---
created: 2026-08-21
title: Rails: port the INSTRUCTIONS page (third tab)
area: ui
severity: minor
files:
  - components/rails/rail-band-editor.tsx
  - lib/geometry/rail-bands.ts
  - reference/project/Rails.dc.html
  - reference/project/assets/rail-bands-plan-bg.png
source: user report; deferred in quick task 260818-lm0
resolves_phase:
---

# Rails: port the INSTRUCTIONS page (third tab)

The prototype's Rail Band Calculator has three page tabs — VIEWER, DATA, **INSTRUCTIONS**. The port
shipped only VIEWER and DATA.

**This was a deliberate deferral, not a port error.** `260818-lm0-PLAN.md` line 116 lists
"The INSTRUCTIONS page (static traced-PPT artwork; a later task)" as out of scope, and line 212
says "Do not render an INSTRUCTIONS tab." It was never captured as a todo, so it fell off the radar —
this file closes that tracking gap.

## What it is

`reference/project/Rails.dc.html` lines 358-520 (~158 lines), gated on `isInstructionsPage`
(line 1503). Titled **"Understanding Rail Markings"**, subtitle "Example rail with mark definitions".

It is NOT static artwork despite the plan's description. It renders a live example rail:

- `howToReadResult = computeSection({ thickness, ratioTopPct: 60, family: 3, domed, domedBandBase: 6,
  scale: 1, halveDeckMark1: true })` (line 1359) — so it reuses the calculator that already exists in
  `lib/geometry/rail-bands.ts` rather than needing new math
- A **Flat / Domed** toggle (`howToReadDomed`, line 521) switching the example thickness between
  3.5" and 3" (line 1358)
- An SVG plot with grid lines, reference lines, segments, dots, x/y ticks and **callouts** naming each
  mark (lines 371-392)
- Background asset `assets/rail-bands-plan-bg.png` — **present in the repo** at
  `reference/project/assets/rail-bands-plan-bg.png` (123 KB). Move to `public/` when porting.

Note `halveDeckMark1: true` — the example uses a variant of the section computation. Check whether
the current `computeSection` supports it or whether it needs a parameter.

## Related, decide together

The prototype also has **"Include Rail Band Instructions in Print"** (`printIncludeInstructions`,
line 279; used at lines 1546 and 1589) which folds the instructions into printed output. That is
print-path work and likely belongs with TMPL-01 / Phase 3 rather than with this tab. Do not build
the print integration here unless print paths are being built at the same time.

Also listed out of scope in the same plan and closely related: the "How to read this" callout plot
(`howToRead`) — that IS this page's plot, not a separate feature. Porting this page covers it.
