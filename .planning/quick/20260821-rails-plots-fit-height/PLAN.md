---
quick_id: 260821-rpf
slug: rails-plots-fit-height
date: 2026-08-21
status: planned
source: user report 2026-08-21
files_modified:
  - components/rails/rail-band-editor.tsx
---

# Quick Task: Rails plots must scale to fit, never force scrolling

**User report:** "As rail thicknesses are increased, the rail marking plots get larger vertically so
much so that they result in scrolling of the page. I'd rather keep the window size fixed and scale
the plots smaller so that scrolling is never necessary."

## Diagnosis

`components/rails/rail-band-editor.tsx:158` wraps the three section plots in:

```
<div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto">
```

Each plot renders with `RailSectionPlot`'s default `fit="width"`, which styles the SVG
`{ width: "100%", aspectRatio: width/height }`. Its rendered height is therefore
`min(containerWidth, 420px) x (svgHeight / svgWidth)`.

In `rail-section-plot.tsx`, `SCALE = 56` px per inch is a fixed constant and
`height = (maxY - minY) * SCALE + AXIS_LABEL_PAD`. So a thicker rail produces a taller viewBox, a
taller aspect ratio, and a taller rendered plot. Three stacked plots then exceed the card and the
`overflow-y-auto` scroll region engages — what the user experiences as the page scrolling.

Worst case is real: center thickness reaches 3.5" (`CENTER_THICKNESS_BOUNDS`), nose/tail 2.5"
(`NT_THICKNESS_BOUNDS`), and all three sections can be open at once.

## Fix — fit to the available height, proportionally

`RailSectionPlot` **already supports** `fit="height"`
(`{ height: "100%", width: "auto", maxWidth: "100%", aspectRatio }`), added for the Summary
dashboard's compact plot row. Reuse it here rather than inventing a new sizing path.

In `rail-band-editor.tsx`:

1. Remove `overflow-y-auto` from the plots container — scrolling is exactly what we are eliminating.
   Keep `min-h-0` so the flex child can shrink below its content height.
2. Give each section wrapper a bounded, proportional share of the container height, and pass
   `fit="height"` to its `RailSectionPlot`.

**Distribute height proportionally, not equally.** Equal thirds would make the short nose/tail plots
waste space and squash the taller centre plot. Each wrapper should take a share proportional to its
plot's natural height, so relative proportions between sections are preserved as everything scales
down together. With `flex-basis: 0` and `flex-grow` set to the section's natural viewBox height, the
children divide the container in exactly that ratio.

The natural height per section is available from the same computation the plot uses — derive it
rather than hardcoding. If exposing it cleanly requires a small helper export from
`rail-section-plot.tsx`, that is acceptable; keep any geometry out of the component per the project's
`lib/`-only rule (this is diagram layout, which already legitimately lives in `components/rails/`).

3. The section title above each plot and the legend below the stack stay fixed-height (`flex-none`);
   only the plot area flexes.

## Acceptance

- With all three sections open and every thickness at maximum (centre 3.5", nose/tail 2.5"), the
  Rail Viewer card shows **no scrollbar** and no plot is clipped, at a normal laptop window height.
- At small thicknesses the plots still fill the card rather than shrinking to a corner.
- Relative sizing between nose / centre / tail is visually preserved as thickness changes.
- Collapsing a section (fewer plots) lets the remaining plots grow to use the freed space.
- The Summary dashboard's compact rail plots are UNCHANGED — do not alter `fit="height"`'s existing
  behaviour or the Summary call site.
- The 01-01 layout invariant still holds: `body` stays viewport-clamped, the sidebar scrolls
  independently, and the page itself never scrolls.

## Verification

- `npm run test`, `npm run lint`, `npm run build` all pass.
- The dev server is orchestrator-managed on port 3000 — do NOT start another. If port 3000 is not
  listening, note it and skip live checks; the orchestrator will verify in a browser.
