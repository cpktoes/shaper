# Phase 6: The Design Screens in Metric - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** ~19 (2 pure geometry files gain exports, ~1 new component, ~14 display components modified, 3-4 new test files)
**Analogs found:** 19 / 19 (this phase's whole point is "everything already has a shipped analog from Phase 5" — the research doc confirms zero new architectural layers)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/geometry/units.ts` (add `metricSliderRange`, `squareMmToSquareCentimetres`, `cubicMmToCubicCentimetres`) | utility (pure geometry) | transform | itself — existing `squareMmToSquareInches`, `formatCentimetres`, `formatWholeMm`, `parseMetric` in the same file | exact |
| `lib/geometry/units.test.ts` (new cases) | test | transform | itself — existing suite structure | exact |
| `lib/geometry/fins.ts` (`FinSummaryRow` family tag) | model | transform | itself — existing row-construction code | exact |
| `lib/geometry/fins.ts` (`toeAimTableFor` system-aware) | model | transform | `lib/geometry/summary-line.ts` (`formatSummaryLine`'s two-branch pattern, applied inside a geometry-layer view function instead of a component) | role-match |
| `components/rocker/metric-field.tsx` (new, sibling of `ImperialField`) | component (typed control) | request-response (focus/blur/commit) | `components/rocker/imperial-field.tsx` | exact |
| `components/rocker/metric-field.test.ts` (new) | test | request-response | none exists for `ImperialField` today — see "No Analog Found" | none |
| `components/design/slider-row.test.ts` (allowlist update) | test | event-driven | itself — existing allowlist assertions | exact |
| `components/outline/outline-controls.tsx` | component (control sidebar) | event-driven (slider/select → design-store) | itself (Imperial branch untouched); Board Length hand-rolled block is the analog for the fins/volume equivalents | exact (self) |
| `components/fins/fin-controls.tsx` | component (control sidebar) | event-driven | `components/outline/outline-controls.tsx` (Board Length block, D-08 site #1) | exact |
| `components/volume/volume-controls.tsx` | component (control sidebar) | event-driven | `components/outline/outline-controls.tsx` (Board Length block, D-08 site #1) | exact |
| `components/rocker/rocker-controls.tsx` | component (control sidebar) | event-driven | `components/outline/outline-controls.tsx` (`SliderRow` call-site conversion pattern) | role-match |
| `components/rails/rail-controls.tsx` | component (control sidebar) | event-driven | `components/outline/outline-controls.tsx` (`SliderRow` call-site conversion pattern) | role-match |
| `components/outline/outline-viewer.tsx` | component (viewer callouts) | request-response (pure render of formatted strings) | `components/setup/card-metadata-line.tsx` (`useUnits()` leaf pattern) + `components/viewer/callout-primitives.tsx` (drafting grammar) | role-match |
| `components/rocker/rocker-viewer.tsx` | component (viewer callouts) | request-response | `components/outline/outline-viewer.tsx` (once converted) + `callout-primitives.tsx` | role-match |
| `components/fins/fin-viewer.tsx` | component (viewer callouts) | request-response | `components/outline/outline-viewer.tsx` (once converted) + `callout-primitives.tsx` | role-match |
| `components/rocker/rocker-datasheet.tsx` | component (typed table) | CRUD (per-cell read + typed commit) | `components/rocker/imperial-field.tsx` (typed cells) + `components/rails/rail-data-table.tsx` (`formatCell`/header pattern) | exact |
| `components/rails/rail-data-table.tsx` | component (data table) | CRUD (read-only) | itself — `formatCell` is the exact site to branch | exact |
| `components/fins/fin-data-panel.tsx` | component (data table) | CRUD (read-only) | `components/rails/rail-data-table.tsx` (`formatCell`-style helper), plus `lib/geometry/fins.ts` for the family-tag fix (Pitfall 1) | role-match |
| `components/fins/toe-aim-table-modal.tsx` | component (data table) | CRUD (read-only) | `components/rails/rail-data-table.tsx` | role-match |
| `components/rails/rail-section-plot.tsx` | component (SVG diagram) | transform (geometry → pixel ticks) | itself — no existing system-aware analog; closest shape is its own current `Math.floor` inch-tick loop, parameterized by a new `system` argument | partial (algorithm change, not just formatter swap — see Pitfall 2 in RESEARCH.md) |
| `components/volume/volume-calculation-card.tsx` | component (data card) | CRUD (read-only) | itself — mirrors its own imperial branch line-for-line (D-04); `squareMmToSquareInches` call site is the template for the new cm²/cm³ calls |
| `components/volume/volume-estimator.tsx` | component (composition/passthrough) | transform (builds display strings, passes as props) | `components/setup/card-metadata-line.tsx` (leaf reads `useUnits()`, composes via a `lib/geometry/` formatter) | role-match |

## Pattern Assignments

### `components/rocker/metric-field.tsx` (new component, typed control)

**Analog:** `components/rocker/imperial-field.tsx` (full file read above)

**Imports pattern** (`imperial-field.tsx` lines 23-32):
```typescript
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  formatInchesFraction,
  inchesToMm,
  type Mm,
  mmToInches,
  parseImperial,
  roundToSixteenthInch,
} from "@/lib/geometry/units";
```
Metric sibling swaps in `formatCentimetres` / `formatWholeMm`, `parseMetric`, `roundToWholeMm`, `centimetresToMm`/`mmToCentimetres` — no new import source, everything already lives in `lib/geometry/units.ts`.

**Core commit pipeline** (`imperial-field.tsx` lines 52-70, copy structure exactly):
```typescript
function commit(typed: string) {
  const parsedMm = parseImperial(typed);
  if (parsedMm === null) {
    setError(`Couldn't read '${typed}' as inches — try a number, a fraction like 2 5/8, or feet and inches like 6'2.`);
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
Metric version: `parseMetric(typed, fieldUnit)` → null → UI-SPEC's exact metric error line (see Copywriting Contract table, two variants: mm-domain vs cm-domain) + revert to bare/standalone-formatted `value` → else clamp to caller's metric bounds (mm) → `roundToWholeMm` → `onCommit` → reformat via `formatWholeMm` (bare mode) or `formatCentimetres` + `" cm"` (standalone mode, add a `bare: boolean` prop per UI-SPEC's Component Notes).

**Markup / classes to reuse verbatim** (`imperial-field.tsx` lines 72-108):
```typescript
<Input
  type="text"
  inputMode="text"
  aria-label={label}
  aria-invalid={error ? true : undefined}
  aria-describedby={error ? errorId : undefined}
  value={focused ? raw : formatInchesFraction(value)}
  onFocus={() => { setFocused(true); setError(null); setRaw(formatInchesFraction(value)); }}
  onChange={(event) => setRaw(event.target.value)}
  onBlur={() => { commit(raw); setFocused(false); }}
  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(raw); } }}
  className="h-7 w-16 min-w-16 max-w-16 rounded-md border border-surf-line bg-surf-ground px-1.5 text-right text-sm text-surf-ink"
/>
{error && (
  <div id={errorId} className="mt-0.5 w-24 text-right text-[10px] text-surf-warning-ink">
    {error}
  </div>
)}
```
Reuse these classes byte-for-byte per UI-SPEC's Spacing/Typography sections (no new size, no new colour).

**Error handling / validation pattern:** never throw, `parseMetric` returns `null` on unreadable input (already shipped and tested in `lib/geometry/units.ts` lines 118-143); field reverts to last good formatted value, never left blank or invalid — same T-05-15 guarantee `ImperialField`'s own doc comment states.

---

### The three Board Length hand-rolled controls (D-08) — `outline-controls.tsx`, `fin-controls.tsx`, `volume-controls.tsx`

**Analog:** `components/outline/outline-controls.tsx` lines 118-155 (the existing Board Length block; fins/volume controls repeat this exact shape per the file's own comment: "Named in slider-row.test.ts's allowlist alongside its FINS and VOLUME counterparts, which share this exact shape.")

**Imports pattern** (`outline-controls.tsx` lines 1-26):
```typescript
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  BOARD_LENGTH_RANGE_IN, TAIL_PRESETS, WIDEPOINT_WIDTH_RANGE_IN,
  type OutlineSpec, type TailShape,
} from "@/lib/geometry/board";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import {
  degrees, formatFeetInches, formatInchesFraction, formatSignedInchesFraction,
  inchesToMm, mm, mmToInches,
} from "@/lib/geometry/units";
import { SliderRow, sliderValue } from "@/components/design/slider-row";
```
Add `useUnits` from `@/components/units-provider`, plus the new metric formatters/`metricSliderRange`, plus the new `MetricField`/`MeasureField` component.

**Existing hand-rolled Board Length block** (`outline-controls.tsx` lines 118-155, current Imperial-only shape):
```typescript
<SectionHeading>Board Length</SectionHeading>
{/* Board Length keeps its own hand-rolled markup — the feet/inches Select combo sits
    between the label and the slider, which SliderRow's fixed label-then-track layout has
    no room for. Named in slider-row.test.ts's allowlist alongside its FINS and VOLUME
    counterparts, which share this exact shape. */}
<div>
  <div className="mb-2 text-sm text-surf-ink-muted font-normal">
    Board Length — {formatFeetInches(outline.length)}
  </div>
  <div className="mb-2 flex gap-2">
    <Select value={lengthFeet} onValueChange={(v) => setLengthIn((v as number) * 12 + lengthInches)}>
      <SelectTrigger className="flex-1 border-outline-sidebar-input-border bg-outline-sidebar-input-bg text-outline-sidebar-text">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{[5,6,7,8,9,10].map((f) => <SelectItem key={f} value={f}>{f}&apos;</SelectItem>)}</SelectContent>
    </Select>
    <Select value={lengthInches} onValueChange={(v) => setLengthIn(lengthFeet * 12 + (v as number))}>
      {/* second Select, 0-11 inches */}
    </Select>
  </div>
  {/* Slider underneath, unchanged */}
</div>
```
Per UI-SPEC Component Notes: keep the label row and `Slider` untouched; only the middle `mb-2 flex gap-2` row branches — Imperial keeps the two `Select`s, Metric renders one `MetricField` (standalone mode) sized to its own content, not `flex-1 flex-1`. This exact block is what the FINS and VOLUME Board Length controls should mirror once one of the three is converted.

**Slider bounds/step pattern to add at each call site** (from RESEARCH.md's target-shape example, not yet written — the pattern to follow):
```typescript
const { system } = useUnits();
const lengthBounds = system === "metric"
  ? metricSliderRange(BOARD_LENGTH_RANGE_IN, /* stepMm */ 10)
  : BOARD_LENGTH_RANGE_IN;
<SliderRow
  value={system === "metric" ? mmToCentimetres(outline.length) : mmToInches(outline.length)}
  min={lengthBounds.min}
  max={lengthBounds.max}
  step={1}
  onValueChange={(v) => onChange({ length: system === "metric" ? roundToWholeMm(centimetresToMm(v * 10)) : inchesToMm(v) })}
  displayValue={system === "metric" ? `${formatCentimetres(outline.length)} cm` : formatFeetInches(outline.length)}
/>
```

---

### `components/rails/rail-data-table.tsx` (data table, CRUD read-only)

**Analog:** itself — `formatCell` is the single choke point every cell already flows through.

**Core pattern** (lines 1-30, verbatim):
```typescript
import { mergeRailDataTable, type RailDataGroup, type RailDataValue, type RailSectionKey } from "@/lib/geometry/rail-bands";
import { formatInchesFraction } from "@/lib/geometry/units";

function formatCell(value: RailDataValue): string {
  if (value === "hard-edge") return "Hard Edge";
  if (value === null) return "—";
  return formatInchesFraction(value, 16);
}
```
Metric branch: `formatCell` takes a `system: UnitsSystem` argument, returns `formatWholeMm(value)` in Metric (D-10: bare cell, unit in the column header). Column headers gain a literal ` (mm)` suffix per-column in Metric (UI-SPEC's `[ASSUMPTION]`, not the group heading).

Same `formatCell`-style single-choke-point pattern is the template for `rocker-datasheet.tsx`'s width-row cells (bare `formatCentimetres`) and thickness/rocker cells (the new `MetricField` in `bare` mode).

---

### `components/rails/rail-section-plot.tsx` (SVG diagram, transform — no direct analog, algorithm change)

**Current state** (lines 1-30, plus grep-confirmed lines 17, 108-113, 146-160 per RESEARCH.md Pitfall 2):
```typescript
const SCALE = 56; // px per inch
// ...
const xGridMin = Math.max(-40, ... Math.floor(xAxisMinIn) ...);
const yGridMax = Math.min(40, ... Math.floor(yAxisMaxIn) ...);
for (let i = 0; i >= xGridMin; i--) { /* whole-inch tick */ }
for (let j = 0; j <= yGridMax; j++) { /* whole-inch tick */ }
```
**No shipped analog exists for a metric grid.** This is real new algorithm work: parameterize the grid-generation loops by `system`, iterating in a 10mm-pitch mm domain for Metric rather than relabeling inch ticks. Reuse `CALLOUT_PX`/`useSvgFitScale` from `components/viewer/callout-primitives.tsx` unchanged — only the tick math changes, not the rendering primitives. Flagged explicitly in RESEARCH.md Pitfall 2 and UI-SPEC Component Notes — this file has its own entry in "No Analog Found" below for the *test*, since `rail-section-plot.test.ts` does not exist yet in either system.

---

### `lib/geometry/units.ts` new pure functions (utility, transform)

**Analog:** `squareMmToSquareInches` (lines 145-153, verbatim) is the exact template for the new cm²/cm³ conversions:
```typescript
export function squareMmToSquareInches(areaMm2: number): number {
  return areaMm2 / (MM_PER_INCH * MM_PER_INCH);
}
```
New `squareMmToSquareCentimetres(areaMm2: number)` divides by `MM_PER_CM * MM_PER_CM`; new cubic mm→cm³ equivalent divides by `MM_PER_CM ** 3`. Both land beside this function, both get unit tests beside `units.test.ts`'s existing coverage, per CLAUDE.md Rule 2 ("Don't reach for 25.4 (or 10) anywhere else").

**`metricSliderRange` helper** — no direct shipped analog (it's genuinely new), but should follow the same doc-comment-heavy, single-exported-pure-function style as `roundToWholeMm` (lines 105-116) and `parseMetric` (lines 118-143): pure, takes an inch range + a step in mm, returns `{ min, max, step }` rounded per D-06 (min rounds up, max rounds down onto the metric grid). Test the invariant "every metric range lies within its imperial range" per D-06 and RESEARCH.md's Validation Architecture table.

---

### `components/setup/card-metadata-line.tsx` (the shipped `useUnits()` leaf pattern — reuse everywhere a viewer/table needs the system)

**Full pattern** (verbatim, 26 lines):
```typescript
"use client";
import { useUnits } from "@/components/units-provider";
import type { DesignSummary } from "@/lib/geometry/design";
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
This is the template for every viewer/table leaf that reads `useUnits()` directly rather than receiving `system` as a prop (planner's call per CONTEXT.md's discretion note) — e.g. `fin-data-panel.tsx`'s summary line, `outline-viewer.tsx`'s callouts if they read the hook directly rather than via a threaded prop.

---

### `lib/geometry/summary-line.ts` (the two-branch composition pattern — copy exactly for every per-value string)

**Full pattern** (verbatim, lines 26-42):
```typescript
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
Every one of the ~300 display sites this phase touches (callouts, table cells, labels) should look like this: a `system === "metric"` branch producing the D-01-classified formatter (`formatCentimetres` or `formatWholeMm`), an `else` producing today's byte-identical imperial string. This is the single most important pattern in the whole phase.

## Shared Patterns

### Reading the units system
**Source:** `components/units-provider.tsx` (`useUnits() → { system, setSystem }`, server-rendered, flash-free)
**Apply to:** Every component in the "Display Site Inventory" — either read directly in a leaf (`CardMetadataLine` pattern) or threaded as a `system: UnitsSystem` prop into viewer/table sub-components (planner's call, per CONTEXT.md discretion).

### Composition pattern (never convert inside a shared primitive)
**Source:** `lib/geometry/summary-line.ts` `formatSummaryLine` (see above)
**Apply to:** All viewer callouts, all table cells, all slider labels, all typed-field displays. CLAUDE.md Rule 2 / the codebase's own `SliderRow` doc comment ("a future units hook plugs in [at the call site]", `slider-row.tsx` lines 29-36) — never inside `SliderRow`, `CalloutChipFrame`, `DimensionTick`, or the metric field component itself.

### Typed-entry commit pipeline
**Source:** `components/rocker/imperial-field.tsx` (full file, see excerpt above)
**Apply to:** The new `MetricField`/`MeasureField` component — same focus/raw-string/blur-or-Enter/parse/clamp/snap/revert contract, `parseMetric` substituted for `parseImperial`, `roundToWholeMm` for `roundToSixteenthInch`.

### Formatting/parsing/bounds primitives (all already shipped, none hand-rolled)
**Source:** `lib/geometry/units.ts` lines 52-143 (`MM_PER_CM`, `mmToCentimetres`/`centimetresToMm`, `formatCentimetres`, `formatWholeMm`, `roundToWholeMm`, `parseMetric`)
**Apply to:** Every display/typed-entry site in this phase. Never reach for `/ 10` or `* 10` anywhere else (CLAUDE.md Rule 2, restated in RESEARCH.md's "Don't Hand-Roll" table).

### Source-contract / isolation tests
**Source:** `lib/units-isolation.test.ts` (UNIT-05 guard — design store/snapshot cannot see the preference), `components/design/slider-row.test.ts` (allowlist of hand-rolled controls)
**Apply to:** Extend both rather than duplicate — add a Phase 6 case to `units-isolation.test.ts` for the new metric call sites, and update (not bypass) `slider-row.test.ts`'s allowlist for D-08's Board Length control shape change.

## No Analog Found

Files/behaviors with no close shipped match in the codebase — planner should treat as real new work, not "add a branch":

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `components/rocker/metric-field.test.ts` | test | request-response | No dedicated test file exists for `ImperialField` itself today (its behavior is only exercised indirectly via `rocker-datasheet.tsx` usage) — this is new test territory, not a gap being filled, per RESEARCH.md's Wave 0 Gaps list |
| `components/rails/rail-section-plot.test.ts` | test | transform | No test file exists for the rail plot's grid-tick generation in either system today — confirmed by directory listing in RESEARCH.md |
| `components/rails/rail-section-plot.tsx`'s 10mm-pitch tick loop | component (SVG diagram) | transform | The current loop iterates whole inches (`Math.floor`); this is a genuine algorithm change (new domain, mm not inches), not a label-swap-on-existing-code pattern — flagged as Pitfall 2 |
| `lib/geometry/fins.ts`'s `FinSummaryRow` family tag | model | transform | No existing field distinguishes cm-family rows ("Off-Tail") from mm-family rows ("Toe-In", "Off-Rail") under the current generic `{ label, value }` shape — flagged as Pitfall 1, needs a schema addition before `fin-data-panel.tsx` can branch correctly |
| `metricSliderRange` (or equivalent) helper | utility | transform | Genuinely new pure function; closest stylistic analog is `roundToWholeMm`/`parseMetric`'s doc-comment-heavy pattern, but no prior "derive one range from another" helper exists in `units.ts` today |

## Metadata

**Analog search scope:** `lib/geometry/`, `components/{outline,rocker,rails,fins,volume,setup,design,viewer,units-provider.tsx}`, plus `lib/units-isolation.test.ts` and `lib/geometry/summary-line.ts`
**Files scanned:** `units.ts`, `units.test.ts` (headers only), `imperial-field.tsx`, `slider-row.tsx`, `summary-line.ts`, `card-metadata-line.tsx`, `outline-controls.tsx` (partial), `rail-data-table.tsx` (partial), `rail-section-plot.tsx` (partial) — 9 full/partial reads, cross-referenced against RESEARCH.md's own verified-line citations for the remaining ~10 files (fin-controls.tsx, volume-controls.tsx, rocker-controls.tsx, rocker-datasheet.tsx, rocker-viewer.tsx, outline-viewer.tsx, fin-viewer.tsx, fin-data-panel.tsx, toe-aim-table-modal.tsx, volume-calculation-card.tsx, volume-estimator.tsx) to avoid re-reading ranges RESEARCH.md already quoted verbatim this same session.
**Pattern extraction date:** 2026-09-05
