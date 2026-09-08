# Phase 7: Metric on Paper - Pattern Map

**Mapped:** 2026-09-06
**Files analyzed:** 4 modified (no new files this phase) plus 1 pure-geometry file with a discretionary edit, plus the ledger test
**Analogs found:** 6 / 6 — every file to touch has a strong same-repo analog because Phase 6 already proved the exact boundary this phase threads one layer further out (into print surfaces)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `components/summary/order-form.tsx` | component (client, print surface) | transform (design state → printed string) | Phase 6's converted design-screen components, e.g. `components/volume/volume-calculation-card.tsx` (already reads `useUnits()` + `formatArea`/`formatCubicVolume`/`formatMark`) | exact — same "client component reads `useUnits()`, calls `measure-display.ts`" shape |
| `components/template/build-template-pdf.ts` (text-composing exports only) | utility / pure-ish builder (jsPDF text) | transform (options object → PDF text) | itself, pre-Phase-7 (own prior imperial-only functions) — closest true analog is `lib/geometry/measure-display.ts`'s call-site convention plus Phase 6's `overviewSpecLines`-style "exported for testability" pattern already in this same file family | role-match |
| `components/template/build-strip-pdf.ts` | utility / pure-ish builder (jsPDF text) | transform | same family as `build-template-pdf.ts` (sibling, deliberately non-importing) | role-match |
| `components/template/build-overview-pdf.ts` | utility / pure-ish builder (jsPDF text) | transform | same family; `overviewSpecLines`/`overviewLengthLabelText` already exported for testability | role-match |
| `components/template/export-preview-dialog.tsx` | component (client, orchestrator) | request-response (assembles options, triggers download) | itself today — already builds a `dims` options object per builder; just add `useUnits()` + a `system` field | exact |
| `lib/geometry/template.ts` (`MARK_LABELS`, `stripRegistrationLabel`, `stripMarkSegments`'s label) | utility (pure geometry, discretionary text-composition edit) | transform | `lib/geometry/measure-display.ts`'s `stationLabel`/`formatMark` (the functions these call sites should route through) | exact for the target formatter; the file itself has no true analog for "pure file growing a UnitsSystem parameter for text only" — this is new territory, flagged below |
| `lib/units-isolation.test.ts` (ledger extension) | test (source-contract) | transform (static analysis of source text) | itself — `DESIGN_SCREEN_DISPLAY_FILES` / `BANNED_DISPLAY_FORMATTERS` idiom, already built and proven in Phase 6 | exact |
| (acceptance criteria for "nothing moved") | test (frozen characterisation pin) | transform (geometry → digest) | `lib/geometry/template.test.ts`'s three frozen `describe` blocks | exact |

## Pattern Assignments

### `components/summary/order-form.tsx` (component, transform)

**Analog:** `components/volume/volume-calculation-card.tsx` (Phase 6 conversion) — read via research citations and confirmed by the file's own doc comments in `lib/units-isolation.test.ts`.

**Current imperial-only call sites in `order-form.tsx`** (read this session):

Dims strip (lines ~255-270):
```typescript
const thicknessDisplay = formatInchesFraction(railBands.center.boardThickness);
...
<DimensionCell label="Length" value={formatFeetInches(outline.length)} />
<DimensionCell
  label="Nose"
  value={formatInchesFraction(outlineGeometry.noseWidthAt12in)}
/>
```

Fin panel (lines ~600-608):
```typescript
<span className="flex-none font-bold text-surf-ink">
  {formatInchesFraction(row.value, 16)}
</span>
...
<span className="flex-none font-bold text-surf-ink">
  {formatInchesFraction(grp.fullSpread, 16)}
</span>
```

**Target pattern** — mirror Phase 6's `VolumeCalculationCard` shape (call `useUnits()` once at the top, then route every value through `measure-display.ts`, using `family` where the data already carries it):

```typescript
// Add near the existing useDesign() destructure:
const { system } = useUnits();

// Dims strip — each is its own bordered cell (D-07), so use formatDim/formatLength (own-unit form),
// never formatDimBare:
<DimensionCell label="Length" value={formatLength(outline.length, system)} />
<DimensionCell label="Nose" value={formatDim(outlineGeometry.noseWidthAt12in, system)} />
// thicknessDisplay:
const thicknessDisplay = formatDim(railBands.center.boardThickness, system);

// Fin panel — every row already carries family: "mark" (lib/geometry/fins.ts), D-08:
{formatMark(row.value, system)}
{formatMark(grp.fullSpread, system)}
```

**Import pattern to add** (mirrors every Phase 6 component):
```typescript
import { useUnits } from "@/components/units-provider";
import { formatDim, formatLength, formatMark, formatSignedDim } from "@/lib/geometry/measure-display";
```

**Volume guard (Pitfall 5 — do NOT touch):** the litres cell stays exactly as-is —
`{quotedVolumeLitres.toFixed(1)} L` (or `.toFixed(2)` depending on exact cell) with no `system`
argument anywhere near it. `lib/units-isolation.test.ts`'s own litres-guard describe block (see
Shared Patterns below) is the enforcement mechanism to extend, not re-invent.

---

### `components/template/build-template-pdf.ts` (utility, transform)

**Analog:** its own prior imperial-only exported functions — this file already has the "exported so text is testable without rendering a page" pattern Phase 7 needs to extend with a `system` parameter.

**Current pattern** (lines 328-340, read this session):
```typescript
export function templateMarkDimensionText(placement: TemplateMarkPlacement): string {
  return formatInchesFraction(mm(placement.halfWidthExtent * 2));
}
export function templateMarkLabelText(placement: TemplateMarkPlacement): string {
  return `${placement.label} — ${templateMarkDimensionText(placement)}`;
}
```

**Scale square caption** (lines ~310-334, `drawScaleSquare`):
```typescript
doc.text('2" x 2" — measure before taping', x + squareMm / 2, y + squareMm + SCALE_SQUARE_CAPTION_GAP_MM, {
  align: "center",
});
```

**Target pattern** — thread `system: UnitsSystem` into every text-composing export, per D-04
(the trailing width is `formatDim`, never `formatMark` — Pitfall 2):
```typescript
export function templateMarkDimensionText(placement: TemplateMarkPlacement, system: UnitsSystem): string {
  return formatDim(mm(placement.halfWidthExtent * 2), system);
}
export function templateMarkLabelText(placement: TemplateMarkPlacement, system: UnitsSystem): string {
  return `${placement.label} — ${templateMarkDimensionText(placement, system)}`;
}

// Scale square caption (D-01/D-02) — 50.8 mm derived from SCALE_SQUARE_MM, never hand-typed:
const caption =
  system === "metric"
    ? `${formatOneDecimalMm(SCALE_SQUARE_MM)} mm x ${formatOneDecimalMm(SCALE_SQUARE_MM)} mm — measure before taping`
    : '2" x 2" — measure before taping';
```
Note: no `formatOneDecimalMm`-style formatter exists yet in `measure-display.ts`/`units.ts` — D-02
explicitly says "never `formatWholeMm`," so this phase needs one new formatter added to
`lib/geometry/units.ts` or `measure-display.ts` (planner's call on which module), tested the same
way every other formatter is (`lib/geometry/units.test.ts` / `measure-display.test.ts` idiom).

**Frozen-pin discipline (critical):** if `system` is threaded into `templateMarkDimensionText`/
`templateMarkLabelText` and these are called from inside `lib/geometry/template.ts` (they aren't —
they live in the PDF builder, not the frozen file), no pin risk exists here. The risk is entirely
in `template.ts` itself (see below).

---

### `components/template/build-strip-pdf.ts` (utility, transform)

**Analog:** sibling file to `build-template-pdf.ts`, deliberately non-importing (own doc comment, lines 60-77 confirmed this session) — same target pattern, duplicated per Pitfall 4.

**Current constants** (lines 68-77, read this session):
```typescript
const SCALE_SQUARE_MM = inchesToMm(2);
const SCALE_SQUARE_CAPTION_TEXT = '2" x 2" — measure before taping';
```

**Target pattern:** `SCALE_SQUARE_CAPTION_TEXT` becomes a function of `system`, computed the SAME
way as `build-template-pdf.ts`'s caption (same new formatter, same `50.8 mm` string) — but as an
independent edit in this file, verified by `build-strip-pdf.test.ts` on its own, not shared with
`build-template-pdf.test.ts` (Pitfall 4's explicit warning).

**Registration label (D-03)** — composed in `lib/geometry/template.ts`, not this file (see below),
but this file's `drawLabelRows` is the caller that must pass `system` through to
`stripRegistrationLabel`/`stripMarkSegments`.

---

### `components/template/build-overview-pdf.ts` (utility, transform)

**Analog:** its own already-exported text functions — the strongest "designed for this" analog
in the whole phase, since these were built exported specifically for testability.

**Current pattern** (lines 109-127, 136-137, 172-208, read via grep this session):
```typescript
export function overviewSpecLines(outline: OutlineSpec, geometry: OutlineGeometry): string[] {
  const lines = [
    `Length: ${formatFeetInches(outline.length)}`,
    `Nose Width @12" (calculated): ${formatInchesFraction(geometry.noseWidthAt12in)}`,
    `Widepoint Width: ${formatInchesFraction(outline.widePointWidth)}`,
    ...
    `Tail Block: ${formatInchesFraction(mm(geometry.halfTailBlockWidth * 2))}`,
  ];
  ...
}
export function overviewLengthLabelText(length: Mm): string {
  return `${formatFeetInches(length)} - ${formatInchesFraction(length)}`;
}
export function overviewWpOffsetLabelText(offset: Mm): string {
  const magnitude = formatInchesFraction(mm(Math.abs(offset)));
  ...
}
export function overviewStationLines(geometry: OutlineGeometry): OverviewStationLine[] {
  ...
  if (formatInchesFraction(mm(Math.abs(offset))) === '0"') { /* merge */ }
  ...
}
```

**Target pattern** — every one of these gains a `system: UnitsSystem` parameter, per Claude's
Discretion in CONTEXT.md:
```typescript
export function overviewSpecLines(outline: OutlineSpec, geometry: OutlineGeometry, system: UnitsSystem): string[] {
  const lines = [
    `Length: ${formatDim(outline.length, system)}`,  // NOTE: Length is a dim per D-04's precedent;
                                                        // the `6'0" - 72"` dual form has no metric
                                                        // counterpart, so Metric prints the single figure
    `Nose Width @12" (calculated): ${formatDim(geometry.noseWidthAt12in, system)}`,
    `Widepoint Width: ${formatDim(outline.widePointWidth, system)}`,
    ...
    `Tail Block: ${formatDim(mm(geometry.halfTailBlockWidth * 2), system)}`,
  ];
  ...
}

export function overviewLengthLabelText(length: Mm, system: UnitsSystem): string {
  return system === "metric" ? formatDim(length, system) : `${formatFeetInches(length)} - ${formatInchesFraction(length)}`;
}

// Precision-trap (Claude's Discretion item, Common Pitfalls #open-question-adjacent):
// decide the merge from the PRINTED magnitude in the ACTIVE system, not a raw-float epsilon:
export function overviewStationLines(geometry: OutlineGeometry, system: UnitsSystem): OverviewStationLine[] {
  ...
  const printedZero = system === "metric" ? formatDim(mm(Math.abs(offset)), system) === "0.0 cm" : formatInchesFraction(mm(Math.abs(offset))) === '0"';
  if (printedZero) { /* merge */ }
  ...
}
```
Area line uses `formatArea` per D-04/Claude's Discretion, dropping the `sq ft` parenthetical in Metric.

---

### `components/template/export-preview-dialog.tsx` (component, request-response)

**Analog:** itself — already assembles a `dims` options object per builder (lines 166-174 per research, confirmed pattern present in this file).

**Current pattern:**
```typescript
const dims = {
  length: templateValues.length,
  widePointWidth: templateValues.widePointWidth,
  centerThickness: railValues.centerThickness,
  noseWidth12in: outlineGeometry.noseWidthAt12in,
  tailWidth12in: outlineGeometry.tailWidthAt12in,
  widePointOffset: outline.widePointOffset,
  volumeLitres: quotedVolumeLitres,
};
```

**Target pattern:**
```typescript
import { useUnits } from "@/components/units-provider";
// Inside the dialog component:
const { system } = useUnits();
// Then, one more field on each Build*PdfOptions object built here:
const dims = {
  ...,
  system,
};
```
The Letter/A4 picker (`paperSize` local state) stays completely untouched (D-11) — do not couple it
to `system`.

---

### `lib/geometry/template.ts` (pure geometry, discretionary text-composition edit)

**No true same-repo analog** — this is the one file in the phase doing something no other file in
the codebase does (a pure geometry file, protected by frozen characterisation pins, that also
composes printed label text). Closest reference is `lib/geometry/measure-display.ts`'s
`stationLabel` function, which is the exact formatter these call sites should route through.

**Current text-composing call sites** (grep confirmed this session, exact line numbers):
```typescript
// line 15
import { type Mm, formatInchesFraction, inchesToMm, mm } from "./units";

// lines 196-202ish
const MARK_LABELS: Record<keyof TemplateMarks, string> = {
  noseTwelve: 'Nose 12"',
  tailTwelve: 'Tail 12"',
  center: "Center",
  widepoint: "Widepoint",
  tailBlock: "Tail Block",
  // ...
};

// lines 1190-1192
function stripRegistrationLabel(station: Mm, halfWidth: Mm): string {
  return `${formatInchesFraction(station)} from tail — rail ${formatInchesFraction(halfWidth)}`;
}

// line 1257 (inside stripMarkSegments)
const label = `${MARK_LABELS[markName]} — ${formatInchesFraction(mm(halfWidthExtent * 2))}`;
```

**Frozen-pin risk (Pitfall 1, CRITICAL for the planner to flag in acceptance criteria):**
`lib/geometry/template.test.ts`'s frozen digest (lines 1-40, `describe(... "frozen, never edit")`)
hashes `JSON.stringify(combined)` where `combined` includes `marks`, `placements` (with `label`),
`lineSegments` (with `label`) — see the exact frozen block read this session:
```typescript
const combined = {
  layout, marks, placements, lineSegments, boxes, closure, closureSegments, namePlacement,
};
const digest = createHash("sha256").update(JSON.stringify(combined)).digest("hex").slice(0, 16);
expect(digest).toBe(EXPECTED_TILE_GRID_DIGESTS[key]);
```
Every call in this frozen block calls `markPlacements`/`markLineSegments`/`nameBlockPlacement` with
**no units argument** today. If the planner threads `system` into `MARK_LABELS`-consuming functions,
every one of these must default to (or be called in the frozen test with) `"imperial"` to keep the
label strings byte-identical, or the pin's digest changes and the pin must NOT be regenerated
(Pitfall 1 is explicit: recapturing the digest erases the proof).

**Recommended target pattern** (per CONTEXT.md's Claude's Discretion — pick ONE approach, applied
consistently to all three call sites):
```typescript
import { type Mm, formatInchesFraction, inchesToMm, mm, type UnitsSystem } from "./units";
import { formatDim, stationLabel } from "./measure-display"; // NOTE: check for import cycle —
                                                                 // measure-display imports from
                                                                 // outline.ts, not template.ts, so
                                                                 // this should be safe, but verify

function markLabels(system: UnitsSystem): Record<keyof TemplateMarks, string> {
  return {
    noseTwelve: `Nose ${stationLabel(system)}`,
    tailTwelve: `Tail ${stationLabel(system)}`,
    center: "Center",
    widepoint: "Widepoint",
    tailBlock: "Tail Block",
  };
}

function stripRegistrationLabel(station: Mm, halfWidth: Mm, system: UnitsSystem = "imperial"): string {
  if (system === "metric") {
    return `${formatWholeMmLabel(station)} from tail — rail ${formatWholeMmLabel(halfWidth)}`; // D-03: both mark-family
  }
  return `${formatInchesFraction(station)} from tail — rail ${formatInchesFraction(halfWidth)}`;
}
```
Every threaded function needs a default parameter of `"imperial"` (or the frozen test must pass
`"imperial"` explicitly) so the existing pin call sites need zero changes and stay byte-identical.

---

## Shared Patterns

### Reading the chosen system
**Source:** `components/units-provider.tsx`'s `useUnits()` — already mounted at `app/layout.tsx` root.
**Apply to:** `order-form.tsx`, `export-preview-dialog.tsx` (both already `"use client"`).
```typescript
const { system } = useUnits();
```

### The only conversion path
**Source:** `lib/geometry/measure-display.ts`
**Apply to:** every metric string in all four print surfaces.
```typescript
export function formatDim(value: Mm, system: UnitsSystem): string {
  return system === "metric" ? `${formatCentimetres(value)} cm` : formatInchesFraction(value);
}
export function formatMark(value: Mm, system: UnitsSystem): string {
  return system === "metric" ? `${formatWholeMm(value)} mm` : formatInchesFraction(value);
}
export function stationLabel(system: UnitsSystem): string {
  return system === "metric" ? `${formatCentimetres(MEASURE_STATION_MM)} cm` : `12"`;
}
```
Never `formatCentimetres`/`formatWholeMm` directly from a print surface — those are
`measure-display.ts`'s own internal building blocks (banned formatters list below).

### Source-contract ledger extension
**Source:** `lib/units-isolation.test.ts` — the exact idiom to extend, not duplicate.
```typescript
const BANNED_DISPLAY_FORMATTERS: string[] = [
  ["format", "InchesFraction"].join(""),
  ["format", "FeetInches"].join(""),
  ["format", "SignedInchesFraction"].join(""),
  ["format", "Centimetres"].join(""),
  ["format", "WholeMm"].join(""),
];
const DESIGN_SCREEN_DISPLAY_FILES: { file: string; converted: boolean }[] = [
  { file: "components/outline/outline-controls.tsx", converted: true },
  // ...
];
```
Add a parallel `PRINT_SURFACE_DISPLAY_FILES` list (or extend the existing structure — CONTEXT.md's
"grow it, don't start a second mechanism" note) naming:
```
components/summary/order-form.tsx
components/template/build-template-pdf.ts
components/template/build-strip-pdf.ts
components/template/build-overview-pdf.ts
```
each starting `converted: false`, flipped `true` per plan, with a completeness assertion mirroring
the closing comment (currently reads "the order form is a different story ... until Phase 7" —
this comment must be rewritten once conversion lands, per CONTEXT.md's explicit instruction).

**Litres guard (do not touch, but is itself the pattern to extend if the ledger grows a new print
guard):**
```typescript
describe("the Volume card's litres figure reads the same in both systems (SCRN-05, 06-07 / T-06-02)", () => {
  it("no line the litres figure lives on takes the units system or a display formatter", () => {
    ...
    expect(line).not.toMatch(/\bsystem\b/);
    expect(line).not.toMatch(/\bformat[A-Z]/);
  });
});
```
This exact per-line-negative-assertion idiom is the template for any new "this value must never
gain a system branch" guard the order form's Volume cell needs (Pitfall 5).

### Frozen characterisation pins — what a pin looks like
**Source:** `lib/geometry/template.test.ts` lines 1-40 (one of three frozen `describe` blocks).
```typescript
describe("existing tile-grid output is unchanged by the strip work (characterisation pin, quick task 260902-cj5 — frozen, never edit)", () => {
  const EXPECTED_TILE_GRID_DIGESTS: Record<string, string> = {
    "shortboard-letter": "3cbffdc1fc29fa49",
    // ... one digest per preset x paper-size
  };
  for (const paper of PAPERS) {
    it.each(BOARD_PRESETS)(`$id (${paper}): tile-grid digest matches the pinned value`, (preset) => {
      const geometry = buildOutline(preset.outline);
      const layout = computeTemplateLayout(geometry, paper);
      const marks = computeTemplateMarks(geometry);
      const placements = markPlacements(layout, marks, geometry);   // <-- no units argument
      const lineSegments = markLineSegments(layout, marks, geometry); // <-- no units argument
      // ...
      const combined = { layout, marks, placements, lineSegments, boxes, closure, closureSegments, namePlacement };
      const digest = createHash("sha256").update(JSON.stringify(combined)).digest("hex").slice(0, 16);
      expect(digest).toBe(EXPECTED_TILE_GRID_DIGESTS[`${preset.id}-${paper}`]);
    });
  }
});
```
**For the planner's acceptance criteria:** any plan touching `template.ts` must state explicitly
"run `npx vitest run lib/geometry/template.test.ts` and confirm all three frozen `describe` blocks
stay green with their EXISTING digest values — a failing digest is a hard stop, never fixed by
regenerating the fixture." This is the concrete proof mechanism for CONTEXT.md's success criterion 5.

## No Analog Found

None — every file in scope has at least a role-match analog in the codebase, because Phase 6
already built and proved the exact display-boundary pattern this phase threads one layer further
out. The one genuinely novel element is `lib/geometry/template.ts` growing a `UnitsSystem`
parameter for TEXT ONLY while its frozen digest must not move — flagged above as needing a
default-parameter or explicit-imperial-call discipline rather than a literal analog, since no other
file in this codebase has ever needed to add a display-facing parameter to a frozen-pinned pure
function.

## Metadata

**Analog search scope:** `components/summary/`, `components/template/`, `lib/geometry/`,
`lib/units-isolation.test.ts`, `lib/geometry/template.test.ts`, plus Phase 6 context/summary docs
under `.planning/phases/06-the-design-screens-in-metric/`
**Files scanned:** ~15 (order-form.tsx, the three PDF builders, export-preview-dialog.tsx,
template.ts, template.test.ts, measure-display.ts, measure-display.test.ts (referenced),
units-isolation.test.ts, units.ts (referenced), fins.ts (referenced via research), plus this
phase's own CONTEXT.md/RESEARCH.md)
**Pattern extraction date:** 2026-09-06
