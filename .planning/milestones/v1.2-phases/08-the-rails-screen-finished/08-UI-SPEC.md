---
phase: 8
slug: the-rails-screen-finished
status: approved
shadcn_initialized: true
preset: base-nova (components.json — baseColor neutral, iconLibrary lucide, no third-party registries)
created: 2026-09-07
reviewed_at: 2026-09-07
---

# Phase 8 — UI Design Contract

> Visual and interaction contract for the rails screen's INSTRUCTIONS tab, the "View Full Sized"
> 1:1 dialog, the plan/side reference figure, and the print toggle + third print sheet
> (RAIL-02..06, PRNT-05, PRNT-06). Every visual decision below is prescriptive so the executor
> needs no further design judgment calls; every "Claude's Discretion" item CONTEXT.md left open
> is settled here with a one-line rationale.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `components.json`) |
| Preset | `base-nova`, baseColor `neutral`, no third-party registries (`"registries": {}`) |
| Component library | Base UI (`@base-ui/react`) via shadcn's Base UI preset — not Radix |
| Icon library | lucide-react |
| Font | Inter (`--font-body`/`--font-display`, both aliased to `var(--font-inter)`) |

No new shadcn components are installed this phase. `Dialog`, `Checkbox`, `Button` and `Slider`
already exist under `components/ui/` and are reused as-is (see Registry Safety below).

---

## Spacing Scale

Declared values (must be multiples of 4) — this is the app's existing scale, not a new one:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon/glyph gaps, tick marks |
| sm | 8px | Compact element spacing (legend item gaps, chip padding) |
| md | 16px | Default element spacing (card gaps, section padding) |
| lg | 24px | Section padding, sidebar inset (`p-10` in the rails sidebar is an established outlier, see below) |
| xl | 32px | Layout gaps between major blocks |
| 2xl | 48px | Major section breaks (rare in this phase) |
| 3xl | 64px | Page-level spacing (not used by this phase's surfaces) |

**Exceptions — already established in this codebase, not introduced here:** the app pervasively
uses Tailwind's half-steps (6px/`1.5`, 10px/`2.5`, 14px/`3.5`, 22px) inside control panels —
`rail-controls.tsx`'s `gap-3.5` (14px) between slider blocks, `mb-1.5`/`px-1.5` (6px) around
labels, and the rails sidebar's own `p-10` (40px) content inset. New surfaces in this phase
(the INSTRUCTIONS tab's three cards, the 1:1 dialog, the third print sheet) use **only** the
4pt-multiple values in the table above — `gap-4` (16px) between the tab's three stacked cards,
`p-5`/`p-4` (20px/16px) card interior padding, `gap-2` (8px) inside the legend grid. No new
half-step value is introduced; where the app's existing half-step components (e.g.
`RailControls`, `PillButton`) are reused verbatim, their existing spacing is inherited unchanged.

---

## Typography

All four roles reuse existing type treatments already established elsewhere in the app — no new
size is introduced by this phase.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 14px (`text-sm`) | 400 | 1.5 — instructional paragraph copy, legend item labels, the closing note, dialog caveat text |
| Label | 11px | 700, `tracking-architectural` uppercase | 1.2 — rail callout names (`CALLOUT_PX.name`, matches `RailSectionPlot`'s own axis labels), the "@ 12"" plan-figure station labels |
| Heading | 18px (`text-lg`), `font-display`, `tracking-architectural` uppercase | 800 | 1.2 — the two INSTRUCTIONS card titles ("Understanding Rail Markings", "Turning Marks Into Rail Bands"), reusing `rail-controls.tsx`'s own `"Rail Band Calculator"` heading class byte-for-byte |
| Display | 12px (`text-xs`), `font-display`, `tracking-architectural` uppercase | 800 | 1 — the INSTRUCTIONS tab label itself (matches `TabbedPanel`'s existing VIEWER/DATA tab treatment), the third sheet's `PageMark` title |

Additional reused (not new) scale, for the SVG diagrams specifically — these are the app's
established callout-system sizes, not UI chrome type:

- Callout **value** text (example rail's stated thickness, `3 1/2"` / `89 mm`): 14px pinned via
  `CALLOUT_PX.value`.
- Callout **name** text (mark labels — "Deck 1", "Rail Mk1", "Bottom Tuck 3"): 11px pinned via
  `CALLOUT_PX.name` / `useSvgFitScale`, exactly as `RailSectionPlot`'s own axis ticks already do.
- Plan/side figure's static labels (`@12"`, `@Center`, "Taper Tuck to a Sharp Edge…") stay at their
  ported literal size (16px in the prototype's 499×630 layout) since the whole figure scales as one
  box (see "The figure's fit" below) rather than through the pinned-callout system.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surf-ground` / `--surf-canvas` | Page background, the VIEWER/DATA/INSTRUCTIONS canvas the sidebar sits beside |
| Secondary (30%) | `--surf-panel`, `--surf-sidebar`, `--surf-tab-active` | The rails sidebar, `TabbedPanel`'s content card, the three INSTRUCTIONS cards, the 1:1 dialog's popup surface |
| Accent (10%) | `--surf-accent` / `--surf-accent-ink` | See reserved-for list below — never a default surface fill |
| Destructive | n/a | This phase introduces no destructive action — no delete, no irreversible confirm |

**Accent reserved for, explicitly (nothing else in this phase's new surfaces takes it):**
- The Flat/Domed toggle's active option fill (`TwoOptionToggle`, extracted per D-18 — see
  Copywriting/Interaction notes below).
- The 1:1 dialog's **Print** button — same accent-filled `Button` treatment as the summary
  screen's existing **Print Order Form** button (`border-surf-on-accent bg-surf-accent
  text-surf-on-accent`), so "the button that sends this to paper" reads identically everywhere
  it appears.
- The existing `ViewerToolbarButton` hover/pressed accent fill on the new "View Full Sized"
  toolbar button — inherited automatically from the shared component, not a new declaration.
- Rail segment identity colours (`RAIL_SEGMENT_COLORS`, the plan/side legend's five hex hues) are
  **categorical data colours, not brand accent** — same rule the codebase already documents for
  `RAIL_SEGMENT_COLORS` and `--chart-*`. They are reused verbatim, never swapped for
  `--surf-accent`.

**Not accent:** the 2-inch/50.8mm check bar draws in ink (`--surf-ink` / `--outline-dim-ink`), the
same as the Full Sized Template's own scale-check square — it is a passive measuring reference,
not an interactive or brand element, and accent would misread it as clickable.

**The plan/side figure's card is pinned to a light surface, not themed.** The PNG background
(`rail-bands-plan-bg.png`) is a fixed light raster asset that cannot invert for a dark theme, so
the card holding it (only that one card, not the example-rail card, which is a live themed SVG)
uses the prototype's own literal light values — `background: #fff`, ink `#1c1b19`, border
`#e4ddc9` — exactly the way `app/globals.css`'s `@media print` block already pins Daylight tokens
because a printed page and this PNG share the same constraint (a fixed light surface that can't
follow `.dark`/`.theme-*`). This is the answer to CONTEXT's open "how the light PNG reads on dark
themes" question: it doesn't try to — the one card wearing it stays light on purpose, in every
theme.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA (open 1:1 view) | **View Full Sized** (toolbar button label, D-12 — unchanged from CONTEXT) |
| Primary CTA (print the 1:1 view) | **Print** (dialog footer button, matches the prototype's own label) |
| Primary CTA (fold instructions into print) | **Include Rail Band Instructions in Print** (checkbox label, both the rails sidebar and its summary-screen mirror — D-10, verbatim from the prototype) |
| 1:1 dialog title | **"{Section} Rail — Actual Size"** (e.g. "Nose Rail — Actual Size"), reusing the prototype's own `{{actualSizeTitle}} — Actual Size` pattern; the title updates as the Nose/Center/Tail tab changes |
| 1:1 view caveat (D-16) | **"This assumes a standard screen at 100% zoom — check it against the bar below."** One line, no calibration imperative; ties directly to the check bar rather than repeating the prototype's separate "adjust your zoom" instruction |
| 1:1 print note | **"In your print dialog, turn off 'Fit to page' — scaling to fit would break the true size."** Sits beside the Print button so it is seen before, not after, printing |
| Sidebar checkbox helper line | **"Adds a third reference page to the printed order form, explaining what each rail band mark means."** One static line (unlike the neighbouring `railsImportFoilThickness` toggle, this one's meaning doesn't change with state, so the helper text doesn't need to flip) |
| Third sheet's own heading (on-page, top of the sheet) | **"Rail Band Instructions"** — matches RAIL-02's tab name and the checkbox's own label, so a shaper recognizes it as the same thing they ticked |
| Third sheet's `PageMark` title | **"Rail Band Reference"** — follows page 2's own naming pattern (`PageMark`'s `title` prop is "Shaper Reference" on page 2; "Rail Band Reference" reads as its sibling) |
| Page count note (unticked, 2 pages) | **"Two portrait pages — print double-sided for a front-and-back form."** — byte-identical to today, per PRNT-06 |
| Page count note (ticked, 3 pages) | **"Two portrait pages, printed double-sided — plus a single-sided Rail Band Instructions page."** — tells a shaper exactly what changed rather than just bumping a number |
| Page marks | **"Page 1 of 3" / "Page 2 of 3" / "Page 3 of 3"** when ticked; **"Page 1 of 2" / "Page 2 of 2"** when unticked (PRNT-05/06, `PageMark`'s existing `page`/`of N` composition, generalized from its current hardcoded "of 2") |
| Empty/loading/error state | n/a — every surface in this phase computes synchronously from the already-loaded design store; there is no fetch, no empty collection and no failure path to author copy for (see UI Considerations below) |
| Destructive confirmation | n/a — no destructive action is introduced by this phase |

---

## Interaction & Layout Contract

*(Not a template row, but load-bearing enough to spec here rather than leave to the executor's
judgment — this is where CONTEXT's "Claude's Discretion" items are settled.)*

**INSTRUCTIONS tab structure.** Inside the existing `TabbedPanel` content card (the same
`bg-surf-panel` / `border-surf-line-faint` / `p-3` shell VIEWER and DATA already render into), the
tab holds a vertically stacked, scrollable (`overflow-y-auto`) column of exactly three cards,
`gap-4` apart, each `rounded-lg border p-5`:

1. **"Understanding Rail Markings"** — header row: title (Heading role) on the left, the
   Flat/Domed `TwoOptionToggle` on the right (D-18). Beneath the header, a muted one-line caption
   ("Example rail with mark definitions", Body role at `--surf-ink-muted`) over a divider, then
   the live `RailSectionPlot` output (with the new `callouts` prop, D-17) filling the remaining
   card height. This card themes normally — it's a live SVG, not a raster asset.
2. **"Turning Marks Into Rail Bands"** — header (title only), then the three-step instructional
   list (Body role, verbatim copy per D-04), then the 9-item legend grid, then the plan/side
   figure box. The legend reuses the existing `Checkbox` component plus the app's own 9px
   colour-dot pattern already rendered in `RailBandEditor`'s VIEWER legend (`inline-block h-[9px]
   w-[9px] rounded-full`) — **not** the prototype's custom bordered/filled checkbox widget. This
   keeps one checkbox visual language across the whole screen instead of introducing a second.
   The figure box is the one surface pinned to a light card (see Color, above).
3. **Closing note** — a single bordered card, italic Body-muted text, verbatim copy (D-04),
   matching the prototype's own third block so the tab reads as three peers rather than two cards
   and an orphaned paragraph.

**The figure's fit.** The prototype's plan/side figure was a fixed 499×630 box hard-scaled by a
literal `0.7492`. Port it as a box that fits its container's available width/height (the same
"scales to fit, never a magic constant" principle `RailSectionPlot`'s own `fit="width"|"height"`
already encodes) — the PNG, the two SVG overlays and the side strip all scale together as one
unit, preserving their relative proportions exactly as today, just parameterized by the
container's measured size instead of a hardcoded transform.

**Flat/Domed toggle (D-18).** Extract `fin-controls.tsx`'s private `PillButton` into a shared
`TwoOptionToggle` component (new file, `components/viewer/two-option-toggle.tsx`, following the
precedent of `toolbar-button.tsx`/`tabbed-panel.tsx` living beside it) rather than hand-rolling a
third pill-button styling for this screen. Visual treatment is copied byte-for-byte from
`PillButton`: `rounded-md border px-1 py-2.5 text-[11px] font-bold`, active state
`border-surf-on-accent bg-surf-accent text-surf-on-accent`, inactive `border-surf-line
bg-surf-sidebar text-surf-ink`. Two options only (`Flat` / `Domed`), laid out side by side in the
card header, right-aligned against the title.

**1:1 dialog (D-12–D-16).**
- Trigger: `ViewerToolbarButton` in VIEWER's toolbar, slot 0 or the next open slot after Rotate
  (if the rails screen ever grows one) — one-shot action, no `pressed` state.
- `DialogContent` overrides the default `sm:max-w-sm`: use `max-w-[95vw] sm:max-w-3xl max-h-[90dvh]
  overflow-y-auto border-surf-line-faint bg-surf-panel text-surf-ink`, matching
  `ExportPreviewDialog`'s own override pattern (surf tokens, not the bare popover neutral) but
  wide enough to hold a true-size rail drawing rather than a settings list.
- **Default tab (resolves the zero-one-many gap in CONTEXT):** the dialog always offers all three
  tabs — Nose, Center, Tail — regardless of which sections are collapsed in the sidebar (a rail's
  band data is always computed even when its plot is hidden on VIEWER). It opens on the first
  section with `sectionOpen[key] === true`, in Nose → Center → Tail order; if every section is
  collapsed, it opens on Nose. This means the 1:1 view is never a 0-tab or 1-tab surface — always
  exactly 3.
- Tabs reuse `TabbedPanel` (non-bare) inside the dialog body, not a second tab-switch pattern — one
  tab visual language for the whole app (VIEWER/DATA/INSTRUCTIONS and this dialog all read the
  same).
- Content, top to bottom: the caveat line, the true-size `RailSectionPlot` (D-13, CSS
  inches/millimetres, never `devicePixelRatio`) with its shared legend beneath, the 2-inch/50.8mm
  check bar beside the caveat (not beneath the drawing — it needs to be seen before the shaper
  starts measuring, not after).
- **Scroll behaviour (resolves the CONTEXT gap):** the drawing is never scaled down to fit the
  dialog — that would break the 1:1 promise RAIL-04 exists to make. If a rail's true-size width or
  height exceeds the dialog's available area (a wide board's tail section on a small laptop
  screen), the plot's own container scrolls (`overflow-auto`), the same trade-off the order form
  already makes for its own long tables (`data-print-unfold`'s screen-scroll/print-unfold split).
- Footer (`DialogFooter`): the print note (Body-muted, left), then **Print** (accent-filled
  `Button`, right) — no separate Cancel button needed; the dialog's own `X` close (from
  `DialogContent`'s `showCloseButton`) is sufficient, matching `ExportPreviewDialog`'s own choice
  not to duplicate a Cancel action.
- Print path: `@media print` on the dialog's own content, CSS-inch sized, the check bar included
  on the printed page too (D-15) — this is a new print surface and joins the units-isolation
  ledger as a converted surface in both systems (planner's call on ledger mechanics, not a UI
  concern).

**Print toggle placement (D-10, resolves the sidebar-placement gap).** In `RailControls`, add a
new block at the **end** of the component (after the Tail `RailSectionControls`, inside the same
scrolling region, before the dev-only footer) — visually identical to the existing
`railsImportFoilThickness` block at the top: a `Checkbox` + label row, then the helper line below
it in `text-xs text-surf-ink-muted`. On the summary screen, the mirrored checkbox sits directly
beside the **Print Order Form** button in the existing `data-print-hide` control row (same row as
Print Order Form / Export Template / the page-count note), so both controls that decide what
comes off the printer are visually adjacent.

**Callout colour mapping (D-17).** Each of the ten prototype callout names is coloured to match
its corresponding entry in the DATA tab / `RAIL_SEGMENT_COLORS`, not the prototype's own arbitrary
per-callout hex values — this is what "names match the VIEWER legend" means concretely:

| Callout name | Colour source |
|---|---|
| Apex | The Apex Center dot colour (`#a8425f`, `buildRailLegend`'s own literal — extract a named constant if convenient, not required) |
| Domed Taper | `RAIL_SEGMENT_COLORS.domedBand` (`#6b8e4e`) |
| Rail Mk1 | `RAIL_SEGMENT_COLORS.band1` (`var(--color-surf-accent-ink)`) |
| Corner Cut | `RAIL_SEGMENT_COLORS.cornerCut` (`#4d8a86`) |
| Deck 3, Deck 2, Deck 1 | `RAIL_SEGMENT_COLORS.band1` (`var(--color-surf-accent-ink)`) — all three sit along the Rail Band 1 line the DATA tab draws in that colour |
| Tuck 1 | `RAIL_SEGMENT_COLORS.tuck1` (`#7d5ba6`) |
| Bottom Tuck 1 | `RAIL_SEGMENT_COLORS.hardEdge` (`var(--color-surf-ink)`) — it sits on the board's own bottom edge, an ink role like `hardEdge`/`boardConn`, not a data hue |
| Bottom Tuck 3 | `RAIL_SEGMENT_COLORS.tuck2` (`#3a6ea5`) if a second tuck is present, else the same ink token as Bottom Tuck 1 |

Labels render as SVG `<text>` at the Label role (11px, pinned via `useSvgFitScale`), using
`DimensionLine`'s optional `haloColor` (`var(--outline-page-bg)`) for legibility over the plot's
grid and coloured segment lines — the prototype's own halo technique, reproduced through the
existing primitive rather than a new one. The prototype's cluster-and-push de-overlap pass
(minimum vertical gap within a side's column, split into left/right sides by the callout's `x`
sign) is preserved as diagram layout math local to the component that renders the callouts —
Apex/Domed Taper/Rail Mk1/Tuck 1 cluster on the right (toward centreline), Corner
Cut/Deck 3/Deck 2/Deck 1/Bottom Tuck 1/Bottom Tuck 3 cluster on the left (toward the rail edge),
exactly as `raw`'s `side` values already establish in the prototype.

---

## UI Considerations

> Populated by the ui-phase UI-consideration probe (Step 9.5) and lifted by plan-phase's
> `## UI Considerations` lift rule via the identical rule as SPEC `## Edge Coverage`. Shape-rooted UI *state*
> coverage (empty / loading / error / populated / partial / overflow / zero-one-many / long-text).
> Empty-state and error-state COPY live in `## Copywriting Contract` above — this section covers
> state coverage and REFERENCES those rows rather than restating the copy (de-dup).

Probe run 2026-09-07 over eight surfaces with authored element kinds (non-interactive session: kinds
confirmed and considerations resolved under the workflow's `--auto` convention; nothing was dismissed).

Surfaces probed:

- **INSTRUCTIONS tab (nav)** — INSTRUCTIONS — the third tab in the rails screen's TabbedPanel strip beside VIEWER and DATA; a nav tab whose label is the fixed uppercase word INSTRUCTIONS.
- **Example rail card (media, control, text)** — 'Understanding Rail Markings' card — the live example rail drawn by RailSectionPlot with ten named SVG callouts (Apex … Bottom Tuck 3), a muted caption, and the Flat/Domed TwoOptionToggle in the card header.
- **Instructional copy + closing note (text)** — The instructional copy — the three numbered steps under 'Turning Marks Into Rail Bands' and the italic closing-note card, verbatim prototype text with the units rule applied.
- **Legend, nine tick-boxes (list, control)** — The legend — nine tick-boxes (Checkbox + 9 px colour dot + label) that show or hide each family of lines on the plan/side figure; all start ticked; screen-only state.
- **Plan/side figure (media, text)** — The plan/side figure — the rail-bands-plan-bg.png raster with SVG deck-mark, rail-mark and tuck overlays, the side strip, the @ 12" / @Center station labels and the 'Taper Tuck to a Sharp Edge' note, scaled as one box to its container.
- **View Full Sized dialog (control, nav, media, text)** — 'View Full Sized' — the VIEWER toolbar button and the 1:1 dialog it opens: Nose/Center/Tail tabs, the true-size RailSectionPlot in CSS inches/millimetres with legend, the caveat line, the 2 in / 50.8 mm check bar, the print note and the accent Print button.
- **Print tick-box + mirror (form, control, text)** — 'Include Rail Band Instructions in Print' — the preference tick-box in the rails sidebar with its helper line, and its identical mirror beside Print Order Form on the summary screen; one boolean stored like units (account column + localStorage + cookie).
- **Third print sheet + sheet stack (media, text, list)** — The printed third sheet 'Rail Band Instructions' — page 3 of 3 of the order form, fixed Flat example rail and figure with every legend line drawn, its page mark, plus the summary's stack of two or three sheets and the page-count note beside Print Order Form.

Applicable state considerations resolved: 46 applicable — 42 covered, 4 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| loading | INSTRUCTIONS tab (nav) | ✅ covered | Opening INSTRUCTIONS is local component state (`RailPage`); the tab's content is in the first frame after the click with no spinner or placeholder, because the example rail is computed synchronously from fixed inputs (D-20). |
| error | INSTRUCTIONS tab (nav) | ✅ covered | Switching tabs cannot fail: it sets a local value and renders; nothing is fetched, so no error state or copy exists. |
| overflow | INSTRUCTIONS tab (nav) | ✅ covered | The `TabbedPanel` strip is a non-wrapping flex row; three uppercase labels (INSTRUCTIONS is the longest) fit on one row at every desktop width the rails screen supports, so the strip never wraps or pushes the panel. Phone widths are Phase 9's. |
| long-text | INSTRUCTIONS tab (nav) | ✅ covered | The label is the fixed word INSTRUCTIONS at the Display role, like VIEWER and DATA; it renders on one line and never truncates. |
| empty | Example rail card (media, control, text) | ✅ covered | The card is never empty: the example rail is drawn from the fixed prototype inputs pinned by the golden fixture (D-20), in both Flat and Domed. |
| loading | Example rail card (media, control, text) | ✅ covered | The example rail and its ten callouts are present in the tab's first painted frame; `computeRailSection` runs synchronously on constants, so no skeleton, spinner or placeholder exists. |
| error | Example rail card (media, control, text) | ✅ covered | Flipping Flat/Domed swaps between two fixture-pinned results held in local state; nothing can fail, and no error copy is authored (Copywriting Contract, Empty/loading/error row). |
| populated | Example rail card (media, control, text) | ✅ covered | The populated state is the only state: the plot with grid, bands and dots exactly as VIEWER draws them, plus all ten callouts (Apex through Bottom Tuck 3) in their legend colours; the grid reads in mm or whole inches and any stated thickness goes through `formatMark` (D-19). |
| overflow | Example rail card (media, control, text) | 🧪 backstop | The plot scales to its card through `RailSectionPlot`'s `fit` prop, so the drawing itself never clips, and the cluster-and-push pass keeps labels apart within each side. Held-out visual check: at both Flat and Domed, at the narrowest desktop card width, every callout name sits fully inside the SVG with no two labels overlapping. |
| long-text | Example rail card (media, control, text) | ✅ covered | Every string in the card is fixed and short: ten callout names of at most three short words, the toggle's Flat and Domed, the title and the caption; no user text enters the card, so no truncation rule is needed. |
| overflow | Instructional copy + closing note (text) | ✅ covered | The copy is ordinary block text inside its card; the INSTRUCTIONS column scrolls vertically (`overflow-y-auto`) and cards grow to their content, so nothing clips at any card width. |
| long-text | Instructional copy + closing note (text) | 🧪 backstop | All copy is fixed English (D-04); only the tail-distance range and the station labels change between systems, through the display boundary. Held-out check: view the tab in Imperial and Metric and confirm the three steps and the closing note wrap without truncation and the Metric figures read in cm. |
| empty | Legend, nine tick-boxes (list, control) | ✅ covered | With every box unticked only the drawn marking lines disappear; the PNG outline, side strip and station labels stay, so the figure is never a blank box (RAIL-05: show or hide each reference). |
| loading | Legend, nine tick-boxes (list, control) | ✅ covered | All nine boxes start ticked on first render (D-03); legend state is local component state with nothing to fetch. |
| error | Legend, nine tick-boxes (list, control) | ✅ covered | Ticking a box flips a local boolean; there is no failure path and no error copy. |
| populated | Legend, nine tick-boxes (list, control) | ✅ covered | The legend is always exactly nine rows in the prototype's order, each a `Checkbox`, a 9 px dot in that family's legend colour and its label, all ticked by default. |
| partial | Legend, nine tick-boxes (list, control) | ✅ covered | Any mix of ticked and unticked boxes draws exactly the ticked line families over the figure and hides the rest; the figure's frame, PNG and labels are unaffected by the mix. |
| overflow | Legend, nine tick-boxes (list, control) | ✅ covered | The nine rows sit in a wrapping grid (`gap-2`) that grows downward inside the scrolling INSTRUCTIONS column; the grid never clips or scrolls sideways. |
| zero-one-many | Legend, nine tick-boxes (list, control) | ✅ covered | The set is fixed at nine; there is no zero- or one-item layout and no count-dependent copy. |
| long-text | Legend, nine tick-boxes (list, control) | 🧪 backstop | Labels are fixed; the longest is 'Deck Mark 3 Center (full board)'. Held-out visual check: at the narrowest desktop card width every label wraps onto a second line beside its dot rather than truncating, matching the VIEWER legend's `flex-wrap` behaviour. |
| empty | Plan/side figure (media, text) | ✅ covered | The figure always has content: the PNG (`public/rail-bands-plan-bg.png`), the two SVG overlays and the side strip are fixed assets, not data, so there is no data-dependent empty state. |
| loading | Plan/side figure (media, text) | ✅ covered | The figure box reserves the PNG's full aspect ratio before the raster loads, so the SVG overlays draw at once and nothing shifts when it paints; no spinner or placeholder. |
| error | Plan/side figure (media, text) | ✅ covered | If the PNG fails to load (offline, missing asset) the SVG overlays, side strip, station labels and note still draw inside the same reserved box; the image carries the alt text 'Plan and side view of an example board showing where the rail sections sit', and no error copy is shown. |
| populated | Plan/side figure (media, text) | ✅ covered | The only state: the PNG outline with all nine line families in their legend colours, the station labels through `stationLabel` (`@ 30.5 cm` in Metric), the side strip and the 'Taper Tuck to a Sharp Edge' note, laid out as the prototype draws them. |
| overflow | Plan/side figure (media, text) | ✅ covered | The whole figure scales as one box to its container's width, keeping the prototype's 499:630 proportions, so it never clips or scrolls sideways; the column scrolls vertically if the card is taller than the panel. |
| long-text | Plan/side figure (media, text) | ✅ covered | The figure's labels are fixed strings inside the scaled drawing; they shrink with the figure and never wrap, clip or reflow. |
| empty | View Full Sized dialog (control, nav, media, text) | ✅ covered | The dialog always has three rails to draw: the design store always holds a full rail spec, so no section is ever missing and the tab set is never short. |
| loading | View Full Sized dialog (control, nav, media, text) | ✅ covered | The dialog opens on the first open section (Nose if none is open) with its true-size plot already drawn; the plot is computed synchronously from the store and sized in CSS inches or millimetres, so no spinner exists. |
| error | View Full Sized dialog (control, nav, media, text) | ✅ covered | Print hands off to the browser's own print dialog; cancelling it returns to the open dialog unchanged. Nothing in the dialog fetches or submits, so no error state or copy exists. |
| populated | View Full Sized dialog (control, nav, media, text) | ✅ covered | The true-size plot shows grid, axis ticks, coloured bands and dots exactly as VIEWER draws them, the shared legend beneath, the caveat line with the check bar (`2 in` or `50.8 mm`) above the drawing, and the print note beside the accent Print button. |
| overflow | View Full Sized dialog (control, nav, media, text) | ✅ covered | The drawing is never scaled to fit: when a rail's true size exceeds the dialog's area, the plot's own container scrolls (`overflow-auto`) in both directions while the caveat, check bar and footer stay put; the dialog is capped at 90 dvh (Interaction & Layout Contract, Scroll behaviour). |
| long-text | View Full Sized dialog (control, nav, media, text) | ✅ covered | Every string is fixed: the title ('Center Rail — Actual Size' is the longest), one caveat sentence and one print-note sentence; each wraps within the dialog width and never truncates. |
| empty | Print tick-box + mirror (form, control, text) | ✅ covered | Absence means unticked (D-05, D-07): a shaper who never touches the box sees it unticked on every device, and no default is ever written to the account or the browser. |
| loading | Print tick-box + mirror (form, control, text) | ✅ covered | The box paints in its final state on the first frame, the cookie read on the server the way units is (D-07), so it never flickers from unticked to ticked after hydration and the summary's page count is right from its first frame. |
| error | Print tick-box + mirror (form, control, text) | ✅ covered | A tick takes effect at once in the browser (localStorage plus cookie) and both boxes and the third sheet follow immediately; the account write goes through the same background write queue units uses (retried, never blocking), so a failed write never reverts the box and shows no message (D-07 parity). |
| partial | Print tick-box + mirror (form, control, text) | ✅ covered | There is one boolean and two views of it: the sidebar box and the summary mirror read the same preference, so they can never disagree; ticking either updates the other on its next render. |
| overflow | Print tick-box + mirror (form, control, text) | ✅ covered | Label and helper wrap beside a top-aligned checkbox inside the sidebar's scrolling column, like the foil-link row above; nothing clips. |
| long-text | Print tick-box + mirror (form, control, text) | ✅ covered | Label and helper are the fixed strings in the Copywriting Contract; the label wraps to a second line at the sidebar's width rather than truncating. |
| empty | Third print sheet + sheet stack (media, text, list) | ✅ covered | Unticked there is no third sheet: the summary shows two sheets, the page marks read 'of 2', the note is byte-identical to today's, and the printed output is unchanged (PRNT-06). |
| loading | Third print sheet + sheet stack (media, text, list) | ✅ covered | The third sheet joins the on-screen stack in the same render pass as the tick, fitted per sheet by `useOrderFormPrintFit` like the other two; on a fresh load the cookie decides the count before the first frame, so there is no blink from two sheets to three (D-09). |
| error | Third print sheet + sheet stack (media, text, list) | ✅ covered | Printing is the browser's own print dialog and nothing fetches. If the figure's PNG fails to load the sheet still prints its SVG overlays inside the reserved box; nothing else on the sheet depends on it. |
| populated | Third print sheet + sheet stack (media, text, list) | ✅ covered | The sheet always carries the Flat example rail with all ten callouts and the figure with every legend line drawn (D-08), the heading 'Rail Band Instructions', and the page mark 'Page 3 of 3' titled 'Rail Band Reference', in the shaper's chosen system. |
| partial | Third print sheet + sheet stack (media, text, list) | ✅ covered | The sheet never reflects the tab's Flat/Domed switch or legend ticks: two prints of the same board are the same sheet (D-08), so there is no partial-content state. |
| overflow | Third print sheet + sheet stack (media, text, list) | ✅ covered | If the sheet's content is taller than one portrait page it shrinks with CSS zoom to fit, per sheet, exactly as the order form's two existing sheets do; it never clips and never spills onto a fourth page. |
| zero-one-many | Third print sheet + sheet stack (media, text, list) | ✅ covered | The stack is exactly two or three sheets, never fewer or more; page marks read 'of 2' or 'of 3' and the page-count note switches between its two fixed variants (Copywriting Contract). |
| long-text | Third print sheet + sheet stack (media, text, list) | 🧪 backstop | All sheet copy is fixed, with the Metric figures replacing the Imperial ones through the display boundary. Held-out check: the print-preview audit in both systems on both paper sizes (D-11) confirms no clipped or overflowing text on page 3. |

<!-- Status vocabulary (locked by probe-core projectTruths):
     ✅ covered   → a plain truth string lifted into must_haves.truths
     🧪 backstop  → a flat scalar { statement, verification: backstop }; at verify time, no explicit
                    evidence → insufficient_spec → human_needed (never a silent pass, #1154)
     ⚠ unresolved → an explicit planner assumption (surfaced, never silently dropped)
     Rows are REPLACED (not appended) on a probe re-run — idempotent. -->

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `Dialog`, `Checkbox`, `Button` (all already installed, no new `shadcn add`) | not required |
| Third-party | none declared | not applicable |

No third-party registry is introduced by this phase. `components.json`'s `"registries": {}` stays
empty.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-09-07
