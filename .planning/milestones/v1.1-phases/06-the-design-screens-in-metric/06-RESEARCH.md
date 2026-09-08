# Phase 6: The Design Screens in Metric - Research

**Researched:** 2026-09-05
**Domain:** Codebase-shaped unit conversion (no new libraries) — extending Phase 5's `lib/geometry/units.ts` boundary to ~300 display sites across 5 screens / ~14 component files
**Confidence:** HIGH — this phase has no external-library unknowns; every finding below is either read directly from the codebase this session or restates a locked CONTEXT.md/UI-SPEC.md decision.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Along the board in cm, small stuff in mm (full family table — see CONTEXT.md `<decisions>` for the complete two-column table). Unchanged in both systems: degrees, percentages, litres, name labels.
- **D-02:** Fin base length reads whole mm (`114 mm`), Override box steps 1 mm.
- **D-03:** Stations stay at exactly 12 inches; labels read the honest conversion `@ 30.5 cm`, formatted from `MEASURE_STATION_MM` through `formatCentimetres`, never hand-typed as `@ 30 cm`.
- **D-04:** Volume card mirrors imperial lines one-for-one: area in cm², cubic supporting line in cm³ (not dropped). Litres figure itself untouched.
- **D-05:** Slider steps — 1 cm for length, 1 mm for everything else in the marks/dims families. Percent and degree sliders keep their steps unchanged.
- **D-06:** Metric slider ends sit just inside today's inch ends, rounded inward onto the metric step grid (min rounds up, max rounds down) — computed by one tested helper in `lib/geometry/units.ts`, never hand-typed per slider. Worked examples: Board Length 153–304 cm (outline/volume) / 122–365 cm (fins), widepoint width 40.7–63.5 cm, rocker lift 0–228 mm, foil thickness 4–127 mm, toe-in 0–12 mm, off-rail 26–50 mm, fin base 64–190 mm.
- **D-07:** Nothing snaps on a flip — a value set in one system may sit between the other system's stops; only the first drag in the new system lands it on that system's grid.
- **D-08:** One typed cm field replaces the feet/inches Selects on Board Length (outline, fins, volume sidebars), same focus/blur/Enter/revert contract as `ImperialField`. `slider-row.test.ts`'s allowlist is updated, not bypassed.
- **D-09:** Every standalone metric value carries its own unit, composed by the caller with a normal space (`51.4 cm`, `67 mm`, `+5.1 cm`).
- **D-10:** Tables carry the unit in the column header, cells stay bare (`Thickness (mm)` over `67`).
- **D-11:** Rail cross-section plot draws a 10 mm grid labelled in mm (`0, 10, 20…`), not a 1 cm grid.
- **D-12:** A typed field shows the unit the way values around it do — bare inside a unit-headed table, suffixed standing alone.

### Claude's Discretion
- Typed entry details: metric-only fields (no cross-system parsing), error copy per Copywriting Contract, snap to whole mm, clamp to D-06 bounds, one field component (`bare` prop) vs. two.
- How the system reaches each site: `useUnits()` in the leaf vs. `system` threaded as a prop — CLAUDE.md Rule 2 applies either way (no component converts on its own).
- The metric bounds helper's name/shape and where per-screen metric range objects live.
- Model-side snaps (`roundToSixteenthInch` in `computeRailBands`, `deckProfileStep`) stay unchanged per system.
- Imperial-after-metric-drag rounding (unchanged, nearest 1/16").
- Fins Base Length Override box: `type="number"` in mm, step 1, D-06 bounds.
- Outline length callout: Imperial keeps dual form (`6'2" (74")`), Metric shows `188.0 cm` alone.
- Number styling of area/volume lines, `(mm)` placement on the rail table, `mm` axis placement on the rail plot.
- Rollout order and review cadence: one plan per screen after a shared-groundwork plan, human-verify checkpoints per screen; ship state may be part-converted between plans.
- Playwright stays uninstalled unless acceptance genuinely needs it.

### Deferred Ideas (OUT OF SCOPE)
- 30 cm stations for Metric (own phase + fixture regeneration).
- Cross-system typed entry (an unmistakably-imperial string typed into a metric field).
- Eight reviewed todos not folded into this phase (copy-spec-to-clipboard, rails instructions page, rails viewer extras, finished-board photos, mobile layout polish, fins imported-tail curve, rail/fin presets, bottom contours).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCRN-01 | In Metric, every slider and value on the outline, rails, fins, volume and rocker screens reads in cm for length/widths and whole mm for rail band/rocker/foil values, with sliders stepping on whole millimetres | Display Site Inventory below enumerates every slider call site and its bounds source; `metricSliderRange` helper design in Architecture Patterns; D-05/D-06 give the exact step/bounds rule |
| SCRN-02 | In Metric, typed entry accepts decimal centimetres and whole millimetres, re-prints in the chosen system, reverts unreadable input as it does today | `ImperialField` contract documented verbatim in Code Examples; `parseMetric` already ships (Phase 5) and is fully tested; the metric field's `bare`/standalone mode split is spec'd in UI-SPEC Component Notes |
| SCRN-03 | Viewer callouts and data tables (rail band marks, fin placement numbers, rocker datasheet, volume card) read in the chosen system | Per-file inventory covers every callout/table site; the `fin-data-panel.tsx` family-ambiguity pitfall (Pitfall 1 below) is the one non-obvious risk in this requirement |
| SCRN-05 | Volume reads in litres in both systems | Confirmed unchanged — `quotedVolumeLitres.toFixed(2)} L` is the only volume-figure call site (`volume-calculation-card.tsx:135,180`); D-04 adds two new sibling lines (cm²/cm³) beside it, never touching the litres line itself |
</phase_requirements>

## Summary

Phase 5 shipped the entire chain this phase plugs into: `useUnits()` (`components/units-provider.tsx`), a server-rendered, flash-free `UnitsSystem` context; and the metric half of `lib/geometry/units.ts` — `formatCentimetres`, `formatWholeMm`, `roundToWholeMm`, `parseMetric`, `mmToCentimetres`/`centimetresToMm`, `MM_PER_CM`. Every one of these is read directly from the file this session and is fully unit-tested in `lib/geometry/units.test.ts`. Nothing in this phase requires a new library, a new API, or a new architectural layer — it requires converting roughly 300 display sites across ~14 component files (verified counts below) from a single hard-coded imperial call to a system-branching call, following the exact pattern `lib/geometry/summary-line.ts` already established in Phase 5 (`if (system === "metric") {...} else {...}`, bare formatter output, unit composed by the caller).

Three things in the existing code are **not yet built** and must be planned as real work, not just "add a branch": (1) a metric sibling of `ImperialField` (D-08/D-12, `bare` mode prop), (2) a tested `metricSliderRange`-shaped helper in `units.ts` that computes D-06's inward-rounded bounds from each existing inch-domain constant (there are at least 11 distinct bounds objects across 5 files, some named constants, some inline literals — inventoried below), and (3) a real change to `rail-section-plot.tsx`'s tick-generation loop (currently `Math.floor` over an inch grid; D-11 wants a 10 mm grid, which is not just a label swap). Everything else is call-site conversion following an established pattern.

One non-obvious risk found this session: `lib/geometry/fins.ts`'s `FinSummaryRow { label: string; value: Mm }` — the model behind `fin-data-panel.tsx`'s DATA tab — has no family tag. Its rows mix cm-family values (`"Off-Tail"`) and mm-family values (`"Toe-In"`, `"Off-Rail"`, `"Off-Stringer (1/2 Spread)"`) under one blanket `formatInchesFraction(row.value, 16)` call today. The metric version cannot use one call site per group the way every other screen can — it needs either a family tag added to the geometry layer's row type (Rule 1: pure, tested) or a label-based classification, which the planner must decide explicitly (see Pitfall 1).

**Primary recommendation:** Land Wave 1 as pure `lib/geometry/units.ts` additions only (the metric bounds helper, cm²/cm³ conversions, the `bare`-mode metric field's parse/clamp/snap pipeline as a pure function) with full unit tests before touching any component — then convert screens one at a time exactly as CONTEXT.md's rollout-order discretion recommends, reusing `formatSummaryLine`'s two-branch pattern at every call site.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Metric formatting/parsing/bounds math | `lib/geometry/` (pure TS) | — | CLAUDE.md Rule 1: geometry math is pure and tested outside React; `units.ts` is already the sanctioned boundary |
| Reading which system is active | Client component (`useUnits()`) | Server (first paint via `handoff` prop) | Phase 5's `UnitsProvider` already does the flash-free server/client reconciliation; this phase only reads it, never re-implements it |
| Slider value/min/max/step per system | Component call site (`SliderRow` caller) | — | `SliderRow`'s own doc comment (`slider-row.tsx:29-36`) designates the call site as "where a future units hook plugs in" — `SliderRow` itself takes plain numbers and must stay units-agnostic |
| Typed-entry parse/clamp/snap pipeline | New `lib/geometry/units.ts` exports (pure) | Component (`MetricField`/`ImperialField` sibling) wires them to React state | Mirrors `ImperialField`'s existing split: `parseImperial`/`roundToSixteenthInch` are pure, the component only owns focus/blur/state |
| Viewer callout / table string composition | Component call site, following `summary-line.ts`'s two-branch pattern | `lib/geometry/fins.ts` for `toeAimTableFor`'s pre-formatted view (per UI-SPEC's own instruction) | Rule 2: "no component converts on its own" — but `toeAimTableFor` already returns *raw numbers*, not formatted strings, so making it system-aware means it must start returning display-ready values, which is a small geometry-layer change, not a component change |
| Rail plot grid pitch (10 mm vs 1 in) | Component (`rail-section-plot.tsx`) | — | This is diagram-layout math (already documented in that file's own header as "not board geometry"), consistent with its existing exemption from `lib/geometry/` |

## Standard Stack

No new dependencies. This phase adds zero npm packages — confirmed by reading `package.json` this session; the UI-SPEC's own Registry Safety section states "This phase adds zero new npm dependencies and zero new `components/ui/*` files," which this research corroborates (nothing in the display-site inventory below requires a library beyond what Phase 5 already installed: React 19, the existing `components/ui/input.tsx` / `components/ui/slider.tsx` / `components/ui/select.tsx`).

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none new) | — | — | — |

### Package Legitimacy Audit

Not applicable — this phase installs no external packages.

## Architecture Patterns

### System Architecture Diagram

```
                    useUnits() [components/units-provider.tsx]
                              |
                              v
        +---------------------------------------------+
        |     Component call site (per SliderRow /     |
        |     per callout / per table cell)            |
        |                                               |
        |  system === "metric"?                        |
        |     -> metricSliderRange(RANGE_IN, stepMm)    |   <- NEW: lib/geometry/units.ts
        |     -> formatCentimetres / formatWholeMm      |   <- SHIPPED: Phase 5
        |     : formatInchesFraction / formatFeetInches |   <- SHIPPED: v1.0/Phase 4
        +---------------------------------------------+
                              |
              +---------------+----------------+
              v                                v
     SliderRow (value/min/max/step        Plain string handed to
     computed at call site, never          CalloutChipFrame /
     inside SliderRow itself)              DimensionTick / table cell
              |
              v
     onValueChange -> design-store.tsx (always stores Mm,
                       never a units-branch value — UNIT-05)
```

Typed-entry path (parallel, same boundary):

```
MetricField (new, sibling of ImperialField)
   focus -> raw string seeded from formatCentimetres/formatWholeMm(+unit) output
   blur/Enter -> parseMetric(raw, fieldUnit)
                    -> null? show error line, revert to last formatted value
                    -> number? clamp to metricSliderRange bounds
                             -> roundToWholeMm
                             -> onCommit(Mm)  [always Mm, never system-tagged]
```

### Recommended Project Structure

No new directories. Every file this phase touches already exists:

```
lib/geometry/
├── units.ts            # gains: metricSliderRange() helper, squareMmToSquareCentimetres,
│                        #        cubicMmToCubicCentimetres (or equivalent), the metric
│                        #        typed-field pipeline (parse/clamp/snap as pure functions)
├── units.test.ts        # new tests beside the existing 280+ lines of coverage
└── fins.ts               # toeAimTableFor becomes system-aware (still returns display-ready
                           #  values per Rule 1/Rule 2, not strings formatted in the component)

components/
├── design/slider-row.tsx        # UNCHANGED — stays units-agnostic per its own doc comment
├── design/slider-row.test.ts    # allowlist updated for the D-08 metric field replacing Selects
├── rocker/imperial-field.tsx    # UNCHANGED (imperial byte-identical) — metric sibling added
├── rocker/metric-field.tsx      # NEW (name is planner's call — MetricField or MeasureField)
├── outline/{outline-controls,outline-viewer}.tsx
├── rocker/{rocker-controls,rocker-datasheet,rocker-viewer}.tsx
├── rails/{rail-controls,rail-data-table,rail-section-plot}.tsx
├── fins/{fin-controls,fin-viewer,fin-data-panel,toe-aim-table-modal}.tsx
└── volume/{volume-controls,volume-calculation-card,volume-estimator}.tsx
```

### Pattern 1: The two-branch composition pattern (already shipped, copy exactly)

**What:** Every per-value metric string is composed by branching on `system` at the display call site, using bare formatter output plus a literal unit, never a component-internal conversion.
**When to use:** Every one of the ~300 display sites this phase touches.
**Example (the actual shipped code, `lib/geometry/summary-line.ts:27-40`):**
```typescript
// Source: lib/geometry/summary-line.ts (Phase 5, shipped)
export function formatSummaryLine(summary: DesignSummary, system: UnitsSystem): string {
  const litresPart = `${summary.volumeLitres.toFixed(1)} L`;
  if (system === "metric") {
    const dims = [
      formatCentimetres(summary.length),
      formatCentimetres(summary.widePointWidth),
      formatCentimetres(summary.centerThickness),
    ].join(" × ");
    return `${dims} cm · ${litresPart}`;
  }
  const dims = [
    formatFeetInches(summary.length),
    formatInchesFraction(summary.widePointWidth),
    formatInchesFraction(summary.centerThickness),
  ].join(" · ");
  return `${dims} · ${litresPart}`;
}
```
Every callout/label/table-cell conversion this phase makes should look like this: a `system === "metric"` branch producing the D-01-classified formatter, an `else` producing today's byte-identical imperial string.

### Pattern 2: Slider bounds/step at the call site, never inside `SliderRow`

**What:** `SliderRow` (`components/design/slider-row.tsx`) takes plain `value`/`min`/`max`/`step` numbers and is deliberately units-agnostic — its own doc comment says the conversion "stays visible at its call site, where... a future units hook plugs in" (`slider-row.tsx:29-36`, quoted verbatim: *"each slider's own conversion — inches to millimetres, a branded degrees value, a plain percentage — stays visible at its call site, where a reader can see it and where a future units hook plugs in, rather than being hidden behind one generic numeric callback in here."*).
**When to use:** Every `SliderRow` call site across the five sidebars.
**Example shape (not yet written — this is the target pattern the planner should specify):**
```typescript
const { system } = useUnits();
const lengthBounds = system === "metric"
  ? metricSliderRange(BOARD_LENGTH_RANGE_IN, /* stepMm */ 10)
  : BOARD_LENGTH_RANGE_IN;
<SliderRow
  value={system === "metric" ? mmToCentimetres(outline.length) : mmToInches(outline.length)}
  min={lengthBounds.min}
  max={lengthBounds.max}
  step={system === "metric" ? 1 : 1}
  onValueChange={(v) => onChange({ length: system === "metric" ? centimetresToMm(v) : inchesToMm(v) })}
  displayValue={system === "metric" ? `${formatCentimetres(outline.length)} cm` : formatFeetInches(outline.length)}
/>
```

### Anti-Patterns to Avoid
- **Formatting inside `SliderRow` or any other shared primitive:** breaks CLAUDE.md Rule 2 and the codebase's own established "conversion stays visible at the call site" convention.
- **Hand-typing a second metric range constant per screen:** D-06 requires the metric bounds to be *derived* from the existing inch constant by one tested helper — CONTEXT.md is explicit that "no screen hand-types a metric range constant."
- **Reformatting `toeAimTableFor`'s numeric output inside `toe-aim-table-modal.tsx`:** the UI-SPEC explicitly directs the opposite — make the `lib/geometry/fins.ts` view function itself system-aware (Rule 1 + Rule 2).
- **Blanket-formatting `fin-data-panel.tsx`'s `FinSummaryRow[]` with one formatter call:** see Pitfall 1 below — this file's row model mixes cm-family and mm-family values under one generic `{ label, value }` shape today.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Metric length/mark formatting | A new `toFixed(1)` / `Math.round` call at each of ~300 sites | `formatCentimetres` / `formatWholeMm` (already shipped, `lib/geometry/units.ts:75-103`) | Already handles the signed-epsilon rounding-boundary nudge that the imperial formatters need — a hand-rolled `toFixed` at a call site would silently disagree with the shipped formatter on tie-break rounding |
| Metric slider bounds per screen | Manually computing "round X inches to the nearest cm/mm inward" at each of ~11 bounds objects | One tested `metricSliderRange`-shaped helper in `units.ts` | D-06's guarantee ("nothing set in Metric can ever sit outside Imperial's range") only holds if every bounds computation uses the same rounding direction (min rounds up, max rounds down) — a hand-rolled version at one call site could round the wrong way and violate UNIT-05 |
| Typed-field commit pipeline (focus/blur/parse/clamp/snap/revert) | A second bespoke `useState`+`onBlur` implementation per typed field | Extend `ImperialField`'s exact contract into a metric sibling, reusing `parseMetric` (already shipped and tested) | `ImperialField` (`components/rocker/imperial-field.tsx`) already solves the "never leave the field in an invalid state" problem correctly, including seeding raw text on focus and reverting on `null`; reimplementing it risks a subtly different revert edge case |
| Area/volume unit conversion (cm²/cm³) | A `/ 100` or `/ 1000` literal inside `volume-calculation-card.tsx` | New `squareMmToSquareCentimetres` / cubic equivalent beside `squareMmToSquareInches` in `units.ts` | CLAUDE.md Rule 2: "Don't reach for 25.4 (or 10) anywhere else" — the existing `squareMmToSquareInches` (`units.ts:151-153`) is the sanctioned pattern to copy, not reinvent |

**Key insight:** Every formatting/parsing/rounding primitive this phase needs either already exists in `lib/geometry/units.ts` (formatCentimetres, formatWholeMm, roundToWholeMm, parseMetric, mmToCentimetres/centimetresToMm) or is a small, obviously-testable pure-function addition beside them (metric bounds helper, cm²/cm³ conversions). There is no case in this phase where hand-rolling at a component call site is faster or safer than adding one more pure function next to the ones already there.

## Common Pitfalls

### Pitfall 1: `fin-data-panel.tsx`'s row model has no cm/mm family tag
**What goes wrong:** `lib/geometry/fins.ts` defines `FinSummaryRow { label: string; value: Mm }` [VERIFIED: lib/geometry/fins.ts:133-135] — `export interface FinSummaryRow {\n  label: string;\n  value: Mm;\n}`. Its rows are built with generic labels that are *sometimes* cm-family and *sometimes* mm-family: [VERIFIED: lib/geometry/fins.ts:907-908,915,930,932,941] — `{ label: "Off-Tail", value: offTail }`, `{ label: "Off-Rail", value: offRail }`, `{ label: "Toe-In", value: forwardToeValue }`, `{ label: "Off-Tail", value: rearFinal }`, `label: isBasicOffRail ? "Off-Rail" : "Off-Stringer (1/2 Spread)"`, `{ label: "Toe-In", value: rearToeValue }`. Per CONTEXT.md D-01's table, "Off-Tail" and the twin `fullSpread` value are **cm**-family (the "fin positions off the tail" row), while "Toe-In", "Off-Rail" and "Off-Stringer" are **mm**-family (the "Toe-in; Off-Rail" row). `fin-data-panel.tsx:56` currently formats every row with one blanket call — [VERIFIED: components/fins/fin-data-panel.tsx:56] `<span className="font-bold">{formatInchesFraction(row.value, 16)}</span>` — with no per-row branch today, because Imperial doesn't need one (inches read the same regardless of family). Metric does need one, and there is no field on `FinSummaryRow` to branch on.
**Why it happens:** The row model was built for a single-system display (Imperial), where cm/mm never diverged from "inches" as a concept. Phase 6 is the first time the model's rows need to know which metric family they belong to.
**How to avoid:** Either (a) add a `family: "cm" | "mm"` field to `FinSummaryRow`/`FinSummaryGroup` at the point each row is constructed in `lib/geometry/fins.ts` (consistent with Rule 1 — pure, testable, and the single source of truth moves to where the row is built, not guessed at display time), or (b) classify by exact label string match in `fin-data-panel.tsx` (a fragile string-matching branch that breaks silently if a label ever changes). Option (a) is recommended; the planner should make this an explicit task, not assume it falls out of the generic "convert every screen" work.
**Warning signs:** If a plan's task list for FINS doesn't mention `FinSummaryRow` or `fin-data-panel.tsx`'s row/group construction at all — only the sidebar sliders and viewer callouts — this file's DATA tab will silently ship with every value in one family (likely all read as cm or all as mm), which is wrong for at least "Toe-In"/"Off-Rail" vs. "Off-Tail" in the same table.

### Pitfall 2: The rail-section-plot grid pitch is a real algorithm change, not a label swap
**What goes wrong:** [VERIFIED: components/rails/rail-section-plot.tsx:17,108-109] — `const SCALE = 56; // px per inch` and `const xGridMin = Math.max(-40, ... Math.floor(xAxisMinIn) ...); const yGridMax = Math.min(40, ... Math.floor(yAxisMaxIn) ...);` — the grid-line and tick-generation loops (`rail-section-plot.tsx:111-113,146-160`) iterate in **whole inches** today (`for (let i = 0; i >= xGridMin; i--)`, `for (let j = 0; j <= yGridMax; j++)`). D-11 wants a 10 mm pitch in Metric, which is a different iteration domain (mm, not inches), not just a different label on the same inch ticks.
**Why it happens:** Easy to read D-11 as "add mm to the existing tick labels" when the UI-SPEC itself flags this ("this is a real change to the tick-generation loop, not just a label swap").
**How to avoid:** Parameterize `xGridMin`/`yGridMax` and the two generation loops by `system`, producing a 10 mm-pitch loop in the mm domain for Metric (converting board geometry to mm for the loop, not inches-then-relabeled). Confirmed already flagged correctly in UI-SPEC Component Notes — the planner should carry this into a specific task with its own test coverage (the tick count/values differ meaningfully between 1-inch and 10-mm pitches for the same physical board).
**Warning signs:** A plan that treats RAILS as "swap the axis label string" without touching the grid-generation loop.

### Pitfall 3: Bounds objects are scattered — some named constants, most inline literals
**What goes wrong:** Only 3 of the ~14 slider bounds objects touched by this phase are exported, named constants from `lib/geometry/` (`BOARD_LENGTH_RANGE_IN`, `WIDEPOINT_WIDTH_RANGE_IN` in `board.ts:102-103`; `ROCKER_LIFT_RANGE_IN` in `rocker.ts:117`; `FOIL_THICKNESS_RANGE_IN` in `foil.ts:38`). The rest are file-local constants inside component files [VERIFIED: components/rails/rail-controls.tsx:34-36,40] — `const NT_THICKNESS_BOUNDS = { min: 1, max: 2.5, step: 1 / 16 };`, `const CENTER_THICKNESS_BOUNDS = { min: 1.75, max: 3.5, step: 1 / 16 };`, `const TUCK_BOUNDS = { min: 0, max: 1.5, step: 1 / 16 };`, `const CORNER_CUT_BOUNDS = { min: 0, max: 0.25, step: 1 / 32 };`; [VERIFIED: components/fins/fin-controls.tsx:46-50] `const BASE_LEN_BOUNDS = { min: 2.5, max: 7.5, step: 0.125 };`, `const POS_BOUNDS = { min: -1.5, max: 1.5, step: 1 / 16 };`, `const TOE_BOUNDS = { min: 0, max: 0.5, step: 1 / 16 };`, `const OFF_RAIL_BOUNDS = { min: 1, max: 2, step: 1 / 16 };`, `const OFF_TAIL_OVERRIDE_BOUNDS = { min: 0.5, max: 12, step: 1 / 16 };`; [VERIFIED: components/volume/volume-controls.tsx:17-18] `const WIDTH_BOUNDS = { min: 16, max: 24, step: 0.125 };`, `const CENTER_THICKNESS_BOUNDS = { min: 1.75, max: 3.5, step: 0.0625 };`. And **several are inline number literals with no named constant at all** [VERIFIED: components/outline/outline-controls.tsx:220-221,306,329] — Widepoint Offset `min={-12} max={12}`, Tail Block `min={0} max={16}`, Depth `min={isDiamond ? 1 : 1} max={isDiamond ? 5 : 8}`.
**Why it happens:** These bounds were written screen-by-screen over v1.0 with no expectation that a second system would ever need to derive a parallel range from them.
**How to avoid:** CONTEXT.md's discretion section explicitly leaves open "whether the inch `*_BOUNDS` objects... move to `lib/geometry/` first." Given the scattered/inline reality confirmed here, the planner should decide file-by-file whether each bounds object needs promoting to a named, exported constant before a `metricSliderRange()` helper can be applied to it — the inline literals (Offset/Tail Block/Depth) cannot be passed to a shared helper without first being named.
**Warning signs:** A plan that assumes "the metric bounds helper just wraps every existing `_BOUNDS` constant" without accounting for the inline-literal sliders in `outline-controls.tsx`.

## Code Examples

### The typed-entry contract to mirror (`ImperialField`, shipped)
```typescript
// Source: components/rocker/imperial-field.tsx:52-70 (verbatim, this session)
function commit(typed: string) {
  const parsedMm = parseImperial(typed);
  if (parsedMm === null) {
    setError(
      `Couldn't read '${typed}' as inches — try a number, a fraction like 2 5/8, or feet and inches like 6'2.`,
    );
    setRaw(formatInchesFraction(value));
    return;
  }
  let inches = mmToInches(parsedMm);
  if (min !== undefined) inches = Math.max(min, inches);
  if (max !== undefined) inches = Math.min(max, inches);
  const snapped = roundToSixteenthInch(inchesToMm(inches));
  setError(null);
  setRaw(formatInchesFraction(snapped));
  onCommit(snapped);
}
```
The metric sibling's `commit` should be: `parseMetric(typed, fieldUnit)` → `null` → error line (Copywriting Contract wording) + revert; else clamp to the metric bounds (mm) → `roundToWholeMm` → `onCommit` → reformat with `formatWholeMm` (bare mode) or `formatCentimetres` + `" cm"` (standalone mode, D-12).

### The metric formatting/parsing primitives already shipped
```typescript
// Source: lib/geometry/units.ts:75-143 (verbatim, this session)
export function formatCentimetres(value: Mm): string {
  const cm = mmToCentimetres(value);
  const nudge = cm < 0 ? -1e-9 : 1e-9;
  const rounded = Math.round((cm + nudge) * 10) / 10;
  return rounded.toFixed(1);
}

export function formatWholeMm(value: Mm): string {
  const nudge = value < 0 ? -1e-9 : 1e-9;
  const rounded = Math.round(value + nudge);
  return String(rounded);
}

export function roundToWholeMm(value: Mm): Mm {
  const nudge = value < 0 ? -1e-9 : 1e-9;
  return mm(Math.round(value + nudge));
}

export function parseMetric(input: string, fieldUnit: "cm" | "mm"): Mm | null {
  if (input == null) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(cm|mm)?$/i);
  if (!match) return null;
  const [, numStr, unitSuffix] = match;
  const value = parseFloat(numStr);
  const unit = unitSuffix ? (unitSuffix.toLowerCase() as "cm" | "mm") : fieldUnit;
  return unit === "cm" ? centimetresToMm(value) : mm(value);
}
```

### Reading the system in a leaf component (shipped pattern to copy)
```typescript
// Source: components/setup/card-metadata-line.tsx:14-25 (verbatim, this session)
import { useUnits } from "@/components/units-provider";
import { formatSummaryLine } from "@/lib/geometry/summary-line";

export function CardMetadataLine({ summary }: { summary: DesignSummary }) {
  const { system } = useUnits();
  return (
    <span className="text-xs leading-[1.4] font-semibold text-surf-ink-muted">
      {formatSummaryLine(summary, system)}
    </span>
  );
}
```

## Display Site Inventory (per screen, this session's grep + read)

Counts are occurrences of `formatInchesFraction`/`formatFeetInches`/`formatSignedInchesFraction`/`parseImperial`/`roundToSixteenthInch`/range-or-bounds identifiers per file — a proxy for "sites needing a metric branch," not a literal 1:1 site count (some lines are imports or repeated per-slider bounds references).

| File | Hits | Sites & classification |
|------|------|------------------------|
| `components/fins/fin-controls.tsx` | 45 | Board Length control (cm, D-08 site #2); Tail Width @12" label+slider (cm value + cm station name, D-03); Base Length Override number box (mm, `BASE_LEN_BOUNDS` 2.5–7.5in→64–190mm); position sliders (cm — `POS_BOUNDS` −1.5/1.5in); toe-in sliders (mm — `TOE_BOUNDS` 0–0.5in); off-rail slider (mm — `OFF_RAIL_BOUNDS` 1–2in); quad rear off-tail override (cm — `OFF_TAIL_OVERRIDE_BOUNDS` 0.5–12in, per D-01's "quad rear off-tail" in the cm row) |
| `components/rocker/rocker-controls.tsx` | 40 | Nose/Tail Rocker lift sliders (mm — `ROCKER_LIFT_RANGE_IN`); Nose/Tail Angle (degrees, **unchanged**); Smoothness/Flatness ×4 (percent, **unchanged**); five foil-thickness sliders (mm — `FOIL_THICKNESS_RANGE_IN`); two `@ 12"` read-outs (mm value + cm station name, D-03) |
| `components/rails/rail-controls.tsx` | 20 | Per-section thickness sliders (mm — `NT_THICKNESS_BOUNDS`/`CENTER_THICKNESS_BOUNDS`); Deck Profile tapered-thickness label (mm, read-only derived); Corner Cut Offset (mm — `CORNER_CUT_BOUNDS`); Bottom Tuck 3 (mm — `TUCK_BOUNDS`, dynamic max) |
| `components/outline/outline-controls.tsx` | 17 | Board Length control (cm, D-08 site #1); Widepoint Width (cm — `WIDEPOINT_WIDTH_RANGE_IN`); Widepoint Offset (cm, signed, inline `min={-12} max={12}` — no named constant); Tail Rail/Nose Rail % (unchanged); Tail Block (cm, inline `min={0} max={16}`); Depth (mm — swallow/diamond only, inline `min/max` per tail kind) |
| `components/rocker/imperial-field.tsx` | 16 | The typed-entry contract itself — reference implementation, not a conversion site |
| `components/volume/volume-controls.tsx` | 13 | Board Length control (cm, D-08 site #3); Board Width (cm — `WIDTH_BOUNDS` 16–24in); Center Thickness (cm here specifically — D-01's explicit exception: this screen's Center Thickness slider is dims-family even though the same value reads mm on the volume card below) |
| `components/rocker/rocker-viewer.tsx` | 13 | Station callouts and names (cm station name + mm/thickness callout values) |
| `components/outline/outline-viewer.tsx` | 12 | Length callout (cm alone in Metric, no dual form); nose/centre/tail width callouts (cm); widepoint chip (cm); tail block value (cm); widepoint-offset-from-centre text (cm, signed) |
| `components/rocker/rocker-datasheet.tsx` | 10 | Station headers (cm honest conversion, `@ 30.5 cm`); row labels (`Width (cm)`/`Thickness (mm)`/`Rocker (mm)`, D-10); Width row (cm, bare, read-only); Thickness/Rocker typed cells (mm, bare mode, D-12) |
| `components/volume/volume-calculation-card.tsx` | 9 | Area line (new cm², D-04); cubic supporting line (new cm³, D-04); three cross-section-thickness rows + weighted-thickness row (mm); dims rows (cm, but these are passed-in pre-formatted label props from `volume-estimator.tsx`, not formatted here) |
| `components/fins/fin-viewer.tsx` | 6 | Toe-in callout (mm, `mark.toe`); off-tail callout (cm, `mark.offTail` — a distinct named field, unlike `fin-data-panel.tsx`'s generic row list); base-length legend (mm, D-02) |
| `components/volume/volume-estimator.tsx` | 4 | Composition site only — builds and passes `lengthDisplay`/`widthDisplayLabel`/`centerThicknessDisplayLabel` strings down to the card; needs its own system branch since it currently calls the imperial formatters to build those strings |
| `components/fins/fin-data-panel.tsx` | 4 | Summary line (cm board length + cm tail width + cm station name); **row values — see Pitfall 1, family-ambiguous today** |
| `components/fins/toe-aim-table-modal.tsx` | 3 | Modal title (cm board length + cm tail width); table headings (`(in)`→`(cm)`, D-10); table cells — currently bare numbers from `toeAimTableFor`, not run through a formatter at all (see Architectural Responsibility Map row on this function) |
| `components/rails/rail-data-table.tsx` | 2 | `formatCell` helper (mm, bare) — one central function, low site count but touches every cell in the table |
| `components/rails/rail-section-plot.tsx` | 0 (by this grep) | Grid pitch and axis tick labels — see Pitfall 2. Zero hits because this file uses raw inch-domain math (`SCALE`, `Math.floor`), not the shared formatters — it needs its own system-aware branch in the tick-generation loop, not a formatter swap |

**Not display sites — confirmed unchanged (per CONTEXT.md canonical refs, verified this session by file existence only, not full read):** the dev-only "copy preset values" builders in `outline-editor.tsx`, `rocker-editor.tsx`, `rail-band-editor.tsx`, `fin-placement-editor.tsx` — these serialise `inchesToMm(...)` source text for `presets.ts` and are explicitly out of scope.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Every design-screen display site calls an imperial formatter unconditionally | Every display site branches on `useUnits().system`, calling the Phase-5-shipped metric formatter or the unchanged imperial one | This phase (6) | The single biggest mechanical change in the codebase to date by site count (~300 sites, ~14 files) — but zero new formatting *logic*, since Phase 5 already built and tested every metric primitive this phase needs |

**Deprecated/outdated:** None — Phase 5's imperial functions stay exactly as they are; nothing is being replaced, only extended with a parallel branch.

## Assumptions Log

> Every claim below was either read directly from a file this session (`[VERIFIED: path:lines]`) or restates a CONTEXT.md/UI-SPEC.md decision already locked by the founder. This research introduces no new `[ASSUMED]` claims of its own — the UI-SPEC's own `[ASSUMPTION]` markers (rail table `(mm)` placement, rail-plot single-tick `mm` suffix, volume-line number styling) are the founder-reviewed defaults already approved in that document's Checker Sign-Off, not new assumptions from this research pass.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Adding a `family: "cm" \| "mm"` field to `FinSummaryRow`/`FinSummaryGroup` in `lib/geometry/fins.ts` is the correct fix for Pitfall 1, rather than label-string matching in the component | Common Pitfalls, Pitfall 1 | If the planner instead chooses label-matching in the component, a future relabel of "Off-Rail" or "Off-Stringer (1/2 Spread)" silently breaks the metric family classification with no compiler or test signal — worth an explicit decision, not a default |

**If this table is short:** most of this phase's substance is either directly-verified code or a restatement of the founder's own already-approved CONTEXT.md/UI-SPEC.md decisions — there was little room for this research pass to introduce new unverified claims.

## Open Questions

1. **Should the ~11 scattered/inline bounds objects (Pitfall 3) be promoted to named `lib/geometry/` constants before the metric-bounds helper is written, or can the helper accept an inline `{min, max, step}` literal directly?**
   - What we know: 3 are already named `lib/geometry/` exports; ~8 are file-local component constants; at least 3 (Widepoint Offset, Tail Block, Depth) are inline literals with no name at all.
   - What's unclear: whether promoting all of them to `lib/geometry/` is in scope for this phase or adds unplanned surface area.
   - Recommendation: the metric-bounds helper (`metricSliderRange` or similar) should accept a plain `{min, max, step}` object regardless of whether its source is a named export or an inline literal — this avoids forcing every bounds object to be promoted just to gain a metric sibling, while still leaving the promotion decision open per CONTEXT.md's own discretion note.

2. **Does `FinDataPanel`'s DATA tab classification (Pitfall 1) need a `lib/geometry/fins.ts` schema change in Wave 1 (shared groundwork) or can it land inside the FINS-specific plan?**
   - What we know: it's a `lib/geometry/` change (Rule 1 territory), and the FINS screen's plan is otherwise UI-only conversion work.
   - What's unclear: whether the founder's "one plan per screen after a shared groundwork plan" rollout order expects all `lib/geometry/` changes up front.
   - Recommendation: land it as part of the FINS-screen plan, but as an explicit early task in that plan (schema change + test, before any component touches the new field) — it's small and screen-scoped, not a cross-screen shared primitive like the metric bounds helper.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 [VERIFIED: package.json — `"vitest": "^4.1.11"`, `vitest.config.ts`] |
| Config file | `vitest.config.ts` — `environment: "node"`, `include: ["lib/**/*.test.ts", "components/**/*.test.ts"]` |
| Quick run command | `npm test -- lib/geometry/units.test.ts` (or the specific new/changed test file) |
| Full suite command | `npm test` (must stay green per CLAUDE.md: "all geometry suites must stay green") |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCRN-01 | Metric slider bounds sit inward of imperial bounds on the metric grid (D-06) | unit | `npm test -- lib/geometry/units.test.ts` | ❌ Wave 0 — new `metricSliderRange` tests, e.g. an invariant test that every metric range lies within its imperial range (CONTEXT.md D-06 explicitly requires this test) |
| SCRN-01 | Metric slider step lands on whole millimetres (length: whole cm) | unit | `npm test -- lib/geometry/units.test.ts` | ❌ Wave 0 — pairs with the bounds test above |
| SCRN-02 | `parseMetric`-null typed input reverts and shows the exact Copywriting Contract error line, leaves the store unchanged | unit | `npm test -- components/rocker/metric-field.test.ts` (new file, mirrors `ImperialField`'s own test idiom) | ❌ Wave 0 — flagged as a UI-SPEC "backstop" (metric-typed-field · error) requiring a wired test, not an inference |
| SCRN-03 | `fin-data-panel.tsx` rows read cm/mm by family, not uniformly | unit | `npm test -- lib/geometry/fins.test.ts` | ❌ Wave 0 — new test asserting `FinSummaryRow`'s family field (or equivalent) matches D-01's classification for `"Off-Tail"` vs `"Toe-In"`/`"Off-Rail"` |
| SCRN-03 | Rail plot 10 mm grid pitch produces correct tick values for a known board (D-11) | unit | `npm test -- components/rails/rail-section-plot.test.ts` (new file — none exists today) | ❌ Wave 0 — no existing test file for this component; grid-generation logic is currently untested even in Imperial |
| SCRN-05 | Litres figure byte-identical in both systems | unit | existing `lib/geometry/volume.test.ts` + a new assertion that `quotedVolumeLitres.toFixed(2)` output does not branch on `system` | ✅ mostly covered — `volume-calculation-card.tsx`'s litres line takes no `system` argument at all, so this is structurally guaranteed rather than needing new test surface |
| UNIT-05 (extended) | Metric round-trip through a slider drag reproduces the exact stored mm value (no clamp on flip, D-07) | unit | extend `lib/units-isolation.test.ts` (per CONTEXT.md canonical refs: "extend it rather than duplicate it") | ❌ Wave 0 — add a Phase 6 case to the existing isolation-guard file |

### Sampling Rate
- **Per task commit:** `npm test -- <changed test file>`
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`, plus `lib/geometry/template.test.ts` (the frozen print pins) confirmed still green — CONTEXT.md's canonical refs flag this file as "the proof" that nothing in this phase touches geometry itself.

### Wave 0 Gaps
- [ ] `lib/geometry/units.test.ts` — new tests for `metricSliderRange` (or equivalent), cm²/cm³ conversions, and the metric typed-field's parse→clamp→snap pipeline if extracted as pure functions
- [ ] `components/rocker/metric-field.test.ts` (or wherever the new field lands) — mirrors `imperial-field.tsx`'s own implicit test coverage (none exists as a dedicated file today — confirmed by directory listing; `ImperialField`'s behavior is exercised only indirectly via `rocker-datasheet.tsx` usage, so the metric sibling's dedicated error-path test is new territory, not a gap being filled)
- [ ] `lib/geometry/fins.test.ts` — family classification test for `FinSummaryRow` (Pitfall 1)
- [ ] `components/rails/rail-section-plot.test.ts` — new file; grid-tick generation has no existing test in either system
- [ ] `slider-row.test.ts` allowlist update — D-08 changes the shape of the three Board Length hand-rolled controls; the existing allowlist entries (`OUTLINE_PATH` count 1, `FINS_PATH` count 2, `VOLUME_PATH` count 1) need review since the Metric variant replaces two `<Select>`s with one field, not a slider — confirm the raw-`<Slider>` count assertion still holds per system

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | Unchanged — this phase touches no auth surface |
| V3 Session Management | No | Unchanged |
| V4 Access Control | No | Unchanged |
| V5 Input Validation | Yes | `parseMetric` (already shipped, `lib/geometry/units.ts:131-143`) rejects malformed input by returning `null` rather than throwing or coercing — the same contract `parseImperial` already uses. The new metric typed field must call `parseMetric` exclusively and never `eval`/`Function`/regex-construct user input beyond what `parseMetric` already does |
| V6 Cryptography | No | Not applicable |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Unvalidated typed numeric input reaching design state (a shaper types a value that produces `NaN`/`Infinity` and it silently corrupts a saved board's stored mm) | Tampering | `parseMetric` returns `null` for anything unparseable (already tested exhaustively in `units.test.ts:242-311`, including comma decimals, imperial fractions, and second-decimal-point inputs) — the metric field's commit pipeline must clamp *after* a successful parse, never clamp a `NaN` into a fallback number silently (T-05-15, referenced in `imperial-field.tsx`'s own doc comment) |
| A units-preference leak into stored design state (a saved board's mm values drift because a formatter mutated its input) | Tampering | Already mechanically guarded by `lib/units-isolation.test.ts`'s `Object.is` identity check (`units-isolation.test.ts:102-128`) — extend this file's coverage for the new metric call sites rather than assuming Phase 5's guard automatically covers Phase 6's new code paths |

## Sources

### Primary (HIGH confidence — read directly this session)
- `lib/geometry/units.ts` — full file read, every metric primitive this phase depends on
- `lib/geometry/units.test.ts` — full file read, confirms test conventions and existing coverage
- `components/rocker/imperial-field.tsx` — full file read, the typed-entry contract to mirror
- `components/design/slider-row.tsx` — full file read, confirms the units-agnostic call-site pattern
- `components/units-provider.tsx` — full file read, confirms `useUnits()`'s shape and flash-free guarantee
- `components/setup/card-metadata-line.tsx` — full file read, the shipped leaf-hook pattern
- `lib/units-isolation.test.ts` — full file read, the UNIT-05 guard to extend
- `lib/geometry/summary-line.ts` — full file read, the two-branch composition pattern
- `components/design/slider-row.test.ts` — allowlist section read, confirms per-file hand-rolled-slider exceptions
- `.planning/config.json` — confirms `nyquist_validation: true`, `security_enforcement: true`, `security_asvs_level: 1`
- `vitest.config.ts`, `package.json` — confirms test framework/version, no new dependencies
- Per-screen component files (`outline-controls.tsx`, `outline-viewer.tsx`, `rocker-controls.tsx`, `rocker-datasheet.tsx`, `rail-controls.tsx`, `rail-data-table.tsx`, `rail-section-plot.tsx`, `fin-controls.tsx`, `fin-viewer.tsx`, `fin-data-panel.tsx`, `toe-aim-table-modal.tsx`, `volume-controls.tsx`, `volume-calculation-card.tsx`) — read or grepped this session for the Display Site Inventory
- `lib/geometry/fins.ts`, `lib/geometry/board.ts`, `lib/geometry/rocker.ts`, `lib/geometry/foil.ts`, `lib/geometry/rail-bands.ts`, `lib/geometry/volume.ts`, `lib/geometry/outline.ts` — grepped for range constants, `MEASURE_STATION_MM`, `FinSummaryRow`, `toeAimTableFor`, `result.area`/`volumeCubicInches`

### Secondary (MEDIUM confidence)
- `.planning/phases/06-the-design-screens-in-metric/06-CONTEXT.md` and `06-UI-SPEC.md` — founder-approved decisions, read in full; treated as locked constraints, not independently re-verified
- `.planning/phases/05-the-units-chooser/*` (referenced, not re-read in full this session) — Phase 5's own artifacts, cited via CONTEXT.md's canonical refs

### Tertiary (LOW confidence)
- None — this phase required no web research; every finding is either a direct code read or a restatement of a locked founder decision.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, confirmed by reading `package.json`
- Architecture: HIGH — every pattern cited is read directly from shipped Phase 5 code
- Pitfalls: HIGH — all three pitfalls are backed by verbatim-quoted code read this session, not inference
- Validation architecture: HIGH — test framework/config confirmed by direct file read; gaps identified by confirming absence of test files (e.g., no `rail-section-plot.test.ts` exists)

**Research date:** 2026-09-05
**Valid until:** No expiry driver — this is an internal-codebase research pass with no external library version dependency; valid until the codebase itself changes (i.e., until Phase 6 plans are written against it)
