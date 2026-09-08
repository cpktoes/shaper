---
phase: 8
slug: the-rails-screen-finished
status: draft
shadcn_initialized: true
preset: base-nova (components.json — baseColor neutral, iconLibrary lucide, no third-party registries)
created: 2026-09-07
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

Applicable state considerations resolved: 7 covered, 2 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Plan/side legend (9 tick-boxes, list-collection of toggles) | ✅ covered | Unticking every legend item hides only the drawn marking lines; the PNG board outline and the plan/side frame itself never disappear — RAIL-05's own wording ("show or hide each reference") implies a baseline drawing that persists at zero ticks |
| empty | 1:1 dialog / example rail (media, always computed) | ✅ covered | Neither surface is ever "no data" — both render from the fixed prototype inputs (D-20) or the shaper's own always-present rail spec; there is no fetch and no user-created collection that could be empty |
| loading | All new surfaces (interactive-control, media) | ✅ covered | Everything renders synchronously from the already-loaded design store (client-side geometry, no network fetch) — dismissed, no loading state applies |
| error | 1:1 dialog Print button, print toggle (interactive-control) | ✅ covered | `window.print()` and a client-only checkbox toggle have no failure mode this contract needs to author copy for — dismissed, consistent with the order form's own existing Print Order Form button, which carries no error state either |
| populated | Example rail card, plan/side figure (media) | ✅ covered | Both are permanently "populated" — the example rail always renders the prototype's fixed Flat/Domed inputs (D-20), the figure always renders the fixed example board; there is no sparse/typical/dense volume axis to design for |
| overflow | 1:1 dialog content when a rail's true size exceeds the dialog | ✅ covered | Resolved above: the plot's own container scrolls; the drawing is never scaled down (see Interaction & Layout Contract, "Scroll behaviour") |
| overflow | Third print sheet, if the instructions content is taller than one page at some future content change | ✅ covered | Uses the same per-sheet fit (`useOrderFormPrintFit`) the other two sheets already use (D-09) — not a new mechanism, so no new overflow behaviour to design |
| zero-one-many | 1:1 dialog's Nose/Center/Tail tab set | ✅ covered | Resolved above: the dialog always shows exactly 3 tabs regardless of sidebar collapse state — never 0, 1 or 2 |
| long-text | Instructional copy, closing note, dialog caveat (static-content) | 🧪 backstop | Every string is a short, fixed, English sentence at the app's existing card widths — no user input and no dynamic length; held out as a backstop rather than "covered" only because no automated wrap/overflow test exists yet for these specific new strings |
| long-text | Legend labels ("Deck Mark 3 Center (full board)", the longest of the nine) | 🧪 backstop | The existing legend-dot layout (`RailBandEditor`'s VIEWER legend) already wraps a `flex-wrap` row without truncation; the new 9-item grid inherits the same wrapping behaviour, but is called out as backstop pending a visual check at narrow sidebar/dialog widths |

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

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
