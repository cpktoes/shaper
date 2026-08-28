# Phase 3: Volume, Templates & Verified Math - Pattern Map

**Mapped:** 2026-08-28
**Files analyzed:** 10 (new/modified)
**Analogs found:** 9 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `lib/geometry/template.ts` | utility (pure geometry) | transform | `lib/geometry/volume.ts` | exact (pure calc module, Mm boundary, no React) |
| `lib/geometry/template.test.ts` | test | transform | `lib/geometry/volume.test.ts` | exact (golden/invariant Vitest suite pattern) |
| `lib/geometry/design.test.ts` (extend) | test | transform | `lib/geometry/design.test.ts` (itself, extend in place) | exact |
| `lib/geometry/outline.ts` (export `MEASURE_STATION_MM`) | utility (pure geometry) | transform | `lib/geometry/outline.ts` (itself, small edit) | exact |
| `components/template/build-template-pdf.ts` | service (PDF renderer) | file-I/O | `components/summary/use-print-fit.ts` | role-match (consumer-side "print" module, imperative, single responsibility, heavy inline commentary) |
| `components/template/build-template-pdf.test.ts` | test | file-I/O | `lib/geometry/volume.test.ts` (fixture-driven Vitest, `environment: "node"`) | partial (no existing PDF/byte smoke test precedent) |
| `components/template/export-preview-dialog.tsx` | component (dialog) | request-response (user-driven, client-only) | `components/ui/dialog.tsx` + `components/summary/order-form.tsx` (Print button usage) | exact (Dialog primitives) / role-match (trigger button + paper picker) |
| `components/outline/outline-editor.tsx` (add export/toggle/wide-view buttons) | component (toolbar) | event-driven | `components/outline/outline-editor.tsx` (itself — existing rotate-button pattern) | exact |
| `components/summary/order-form.tsx` (add second export button) | component | event-driven | `components/summary/order-form.tsx` (itself — existing `Print Order Form` button) | exact |
| `.github/workflows/ci.yml` | config (CI) | batch | *(none in repo — net new)* | no analog |

## Pattern Assignments

### `lib/geometry/template.ts` (utility, transform)

**Analog:** `lib/geometry/volume.ts` (and `lib/geometry/outline.ts` for the `Mm`-domain shape)

**Header/deviation-comment pattern** (volume.ts lines 1-33): every geometry module opens with a block comment naming its statement-for-statement source (or, for genuinely new math like `template.ts`, stating plainly that it's new project logic layered on existing `OutlineGeometry` data) and enumerating deliberate deviations. Follow this shape:
```typescript
/**
 * Template tile-layout engine.
 *
 * New module (no prototype source) — computes how OutlineGeometry's half-outline tiles across
 * standard paper (Letter/A4) for a 1:1 printable template (TMPL-01, CONTEXT.md D-01/D-05/D-06/D-09).
 * Pure data in, pure data out: no jsPDF import here — see components/template/build-template-pdf.ts
 * for the one module that draws. Mirrors the volume.ts / design-store.tsx pure-math vs. consumer split.
 */
```

**Imports pattern** (outline.ts lines 21-27, volume.ts lines 35-36):
```typescript
import type { OutlineGeometry } from "./outline";
import { type Mm, inchesToMm, mm } from "./units";
```

**Constants-as-exported-named-values pattern** (volume.ts lines 43-60, outline.ts lines 29-32): magic numbers are named `UPPER_SNAKE_CASE` consts near the top, exported when another module needs the same value (avoids the "two independent constants for one physical quantity" trap the research flags for `MEASURE_STATION_MM`):
```typescript
export const MEASURE_STATION_MM = inchesToMm(12); // moved here from outline.ts per research's anti-pattern note
export type PaperSize = "letter" | "a4";
const PAPER_MM: Record<PaperSize, { width: Mm; height: Mm }> = {
  letter: { width: mm(215.9), height: mm(279.4) },
  a4: { width: mm(210), height: mm(297) },
};
```

**Core transform pattern — plain function, typed input/output interfaces** (outline.ts `buildOutline`, lines 92-120 for the interface shape, 148-318 for the function body): define a result interface first with doc-commented fields, then a single exported function that takes a spec/geometry object and returns that interface, no side effects, no partial mutation of inputs:
```typescript
export interface TemplatePage {
  row: number;
  col: number;
  stationRange: [Mm, Mm];
  halfWidthRange: [Mm, Mm];
  label: string;
}
export interface TemplateLayout {
  pages: TemplatePage[];
  columns: number;
  rows: number;
}
export function computeTemplateLayout(
  geometry: OutlineGeometry,
  paper: PaperSize,
  marginMm: Mm,
  overlapMm: Mm,
): TemplateLayout { /* ... */ }
```

**Mark-derivation pattern** (RESEARCH.md's own worked example, consistent with `outline.ts`'s `tailWidthAt12in`/`noseWidthAt12in`/`widePointStation` fields already on `OutlineGeometry`):
```typescript
export interface TemplateMarks {
  noseTwelve: Mm;
  tailTwelve: Mm;
  center: Mm;
  widepoint: Mm;
}
export function computeTemplateMarks(geometry: OutlineGeometry): TemplateMarks {
  return {
    tailTwelve: MEASURE_STATION_MM,
    noseTwelve: (geometry.length - MEASURE_STATION_MM) as Mm,
    center: (geometry.length / 2) as Mm,
    widepoint: geometry.widePointStation,
  };
}
```

**No error-handling pattern needed** — like `volume.ts`/`outline.ts`, this module has no I/O and no throw paths; invalid input (e.g. a paper size not in `PaperSize`) is a compile-time union check, not a runtime guard (mirrors volume.ts's `V5 Input Validation` treatment in RESEARCH.md).

---

### `lib/geometry/template.test.ts` (test, transform)

**Analog:** `lib/geometry/volume.test.ts` (fixture-typed interfaces + `it.each`) and `lib/geometry/design.test.ts` (simpler `it.each(BOARD_PRESETS)` invariant style)

**Structure pattern** (volume.test.ts lines 1-72): import `describe/expect/it` from vitest, import the module under test, define typed golden-fixture interfaces if a JSON fixture exists (none does for template — this is new geometry, not a prototype port, so use `design.test.ts`'s lighter invariant style instead):
```typescript
import { describe, expect, it } from "vitest";
import { BOARD_PRESETS } from "./presets";
import { computeTemplateLayout, computeTemplateMarks, MEASURE_STATION_MM } from "./template";
import { buildOutline } from "./outline";

describe("computeTemplateLayout", () => {
  it.each(BOARD_PRESETS)("$id: every sampled outline point falls within some page's bounds", (preset) => {
    const geometry = buildOutline(preset.outline);
    const layout = computeTemplateLayout(geometry, "letter", /* margin */ mm(10), /* overlap */ inchesToMm(0.5));
    // assert coverage + overlap invariant per RESEARCH.md Open Question 2
  });
});
```
**Key invariant to test** (per RESEARCH.md Pitfall 1 and Open Question 2): test against `WIDEPOINT_WIDTH_RANGE_IN.max` explicitly, not only `DEFAULT_BOARD_SPEC`, and assert full coverage + overlap rather than a hardcoded page count.

---

### `lib/geometry/design.test.ts` (extend — test, transform)

**Analog:** itself. Current file (23 lines) only exercises `summarizeDesign` end-to-end via `it.each(BOARD_PRESETS)`. RESEARCH.md's Wave-0 gap calls for **direct** unit tests of `deriveTemplateValues`, `deriveRailValues`, `deriveEffectiveVolume` — add new `describe` blocks in the same file, following the existing `it.each(BOARD_PRESETS)` + `DEFAULT_VOLUME_SPEC` idiom:
```typescript
import { buildOutline } from "./outline";
import { computeRailBands } from "./rail-bands";
import { deriveTemplateValues, deriveRailValues, deriveEffectiveVolume } from "./design";

describe("deriveTemplateValues", () => {
  it.each(BOARD_PRESETS)("$id: mirrors design-store.tsx's templateValues memo shape", (preset) => {
    const geometry = buildOutline(preset.outline);
    const values = deriveTemplateValues(preset.outline, geometry);
    expect(values.area).toBe(geometry.area);
    expect(values.noseWidthAt12).toBe(geometry.noseWidthAt12in);
  });
});
```

---

### `components/template/build-template-pdf.ts` (service, file-I/O)

**Analog:** `components/summary/use-print-fit.ts` — the codebase's only existing "produce a physically-accurate printed artifact from live design state" module. Do NOT copy its DOM-measurement mechanism (jsPDF has no DOM/CSS layout at all — RESEARCH.md Pitfall 5) — copy its **posture**: one function per concern, heavy explanatory comments justifying every magic number, and a single narrow public surface.

**Imports pattern** (research's own worked skeleton, RESEARCH.md lines 240-259):
```typescript
import jsPDF from "jspdf";
import type { TemplateLayout, TemplateMarks } from "@/lib/geometry/template";
import type { OutlineGeometry } from "@/lib/geometry/outline";
```

**Single-responsibility "draws only" pattern**: this file is the ONE place `import jsPDF` appears (RESEARCH.md Anti-Patterns) — it must never compute tile bounds or mark positions itself, only iterate `TemplateLayout.pages` and call jsPDF drawing primitives:
```typescript
export function buildTemplatePdf(
  layout: TemplateLayout,
  marks: TemplateMarks,
  geometry: OutlineGeometry,
  paper: "letter" | "a4",
  boardName: string,
): Blob {
  const doc = new jsPDF({ unit: "mm", format: paper });
  layout.pages.forEach((page, i) => {
    if (i > 0) doc.addPage(paper);
    // draw this page's slice of geometry.points, marks, overlap strips, page label
  });
  return doc.output("blob");
}
```

**Naming/download pattern** (mirrors `use-print-fit.ts`'s exported `printOrderForm = () => window.print()` — a thin verb-named export the component calls directly): expose a `downloadTemplatePdf(...)` (or a `.save("<board-name>-template.pdf")` call site in the dialog) rather than the raw `buildTemplatePdf` alone.

**Error handling**: none needed at this layer — jsPDF calls don't throw for the vector/text primitives this phase uses; if `boardName` is empty, fall back to a fixed literal (`"board-template.pdf"`) the way the codebase already treats empty/optional user text elsewhere (no existing project precedent found for this specific fallback — Claude's discretion, note in the plan).

---

### `components/template/build-template-pdf.test.ts` (test, file-I/O smoke)

**Analog:** `lib/geometry/volume.test.ts` for structure; no existing byte/artifact smoke test exists in the repo — this is genuinely new test shape (per RESEARCH.md's Validation Architecture table, marked `❌ Wave 0`).
```typescript
import { describe, expect, it } from "vitest";
import { buildTemplatePdf } from "./build-template-pdf";
import { computeTemplateLayout, computeTemplateMarks } from "@/lib/geometry/template";
import { buildOutline } from "@/lib/geometry/outline";
import { DEFAULT_BOARD_SPEC } from "@/lib/geometry/board"; // or a BOARD_PRESETS entry

describe("buildTemplatePdf", () => {
  it("produces well-formed PDF bytes with the expected page count", () => {
    const geometry = buildOutline(/* preset.outline */);
    const layout = computeTemplateLayout(geometry, "letter", /* margin */ 10, /* overlap */ 12.7);
    const blob = buildTemplatePdf(layout, computeTemplateMarks(geometry), geometry, "letter", "Test Board");
    expect(blob.size).toBeGreaterThan(0);
    // jsPDF's Node build runs under vitest.config.ts's environment: "node" — verified by RESEARCH.md.
  });
});
```

---

### `components/template/export-preview-dialog.tsx` (component, request-response)

**Analog:** `components/ui/dialog.tsx` (Base UI wrapper primitives) for structure; `components/summary/order-form.tsx`'s `Print Order Form` `Button` (lines ~663-669) for the trigger-button styling convention; `components/ui/select.tsx` for the Letter/A4 picker control.

**Dialog composition pattern** (dialog.tsx lines 10-160 — the full set of exported primitives to compose from):
```typescript
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
```

**Trigger-button pattern** (order-form.tsx lines 663-669 — the existing "download/print action" button styling to reuse verbatim for consistency across Template screen + Summary screen per D-03):
```typescript
<Button
  type="button"
  onClick={handleDownload}
  className="border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85"
>
  Export Template
</Button>
```

**Preview body**: reads `computeTemplateLayout()` (pure function, no PDF bytes yet, per D-04's "preview-first" requirement and the architecture diagram's explicit "before any PDF bytes exist" note) — plain `useState<PaperSize>("letter")` for the picker, no new design-store field (RESEARCH.md Architectural Responsibility Map: "Pure UI state ... no new store field required").

**Copy tone**: plain-English, per CLAUDE.md ("explain every change in plain English") and CONTEXT.md D-04/D-10 — e.g. "8 pages — tape nose to tail," "Print at 100% (no 'fit to page')."

---

### `components/outline/outline-editor.tsx` (extend — component, event-driven)

**Analog:** itself — the existing rotate-board icon button (lines 158-191) is the direct precedent for adding more absolutely-positioned icon buttons over the viewer panel.

**Icon-button pattern to copy verbatim in shape** (lines 159-191): `absolute`-positioned button, bordered, `surf-ground` fill (never the accent fill directly, per the in-code warning at line ~176-180 referencing three prior regressions), `aria-label` as the accessible name, `title` for a hover tooltip:
```typescript
<button
  type="button"
  onClick={() => setShowConstruction((v) => !v)}
  aria-label={showConstruction ? "Hide construction lines" : "Show construction lines"}
  title="Toggle construction lines"
  className="absolute top-0 right-12 z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-well hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
>
  {/* icon */}
</button>
```
**View-state-not-design-data pattern** (lines 101, 105, and the file's own header comment lines 13-25): `showConstruction`, `orientation`, and the new wide-view toggle are all local `useState`, explicitly NOT persisted to the design store — the header comment itself states the rule ("a view preference, not design data"). Follow this for any new toolbar toggle.

**Template-export button placement**: per D-03, add a third icon or labeled button alongside rotate/construction-toggle in this same `relative` positioning context (line ~153-158), wired to open `ExportPreviewDialog`.

---

### `components/summary/order-form.tsx` (extend — component, event-driven)

**Analog:** itself — the existing `Print Order Form` button (lines 660-669) is the direct precedent for the second export button D-03 requires. Add a second `Button` beside it, using `ExportPreviewDialog`'s trigger instead of a bare `onClick={printOrderForm}`, same `data-print-hide` wrapper (line 661) so the new button also disappears from the printed sheet:
```typescript
<div data-print-hide className="mt-4 flex flex-none items-center gap-3">
  <Button type="button" onClick={printOrderForm} className="...">Print Order Form</Button>
  <ExportPreviewDialog trigger={<Button type="button" className="...">Export Template</Button>} />
</div>
```

**Print-sheet refit (folded todo)**: no new pattern — this is a verification/fix task against the existing `use-print-fit.ts` + `order-form.tsx` + `order-form.css` + `outline-viewer.tsx` + `callout-primitives.tsx` stack after the callout-system rebuild changed the outline viewBox. Read those files directly when executing that task; nothing here needs a new analog.

---

### `.github/workflows/ci.yml` (config, batch)

**No analog** — first GitHub Actions workflow in this repo. Use RESEARCH.md's verified skeleton (Code Examples section) as the direct source, cross-checked against `package.json`'s actual scripts (`test`, `lint`, `build` all confirmed present):
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgres://user:pass@localhost:5432/shaper_ci
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_Y2ktcGxhY2Vob2xkZXIuZXhhbXBsZS5jb20k
      CLERK_SECRET_KEY: sk_test_ci_placeholder_0000000000000000000000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: "npm"
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run build
```
**Verify empirically** (RESEARCH.md Open Question 1 / Pitfalls 2-3) whether the placeholder `DATABASE_URL`/Clerk env values are actually sufficient for `next build` before treating this as final — `lib/db/client.ts:12` calls `neon(process.env.DATABASE_URL!)` at module scope.

---

## Shared Patterns

### Pure math / thin consumer split
**Source:** `lib/geometry/volume.ts` (private inch-domain core + public Mm boundary) paired with `components/design/design-store.tsx` (the `useMemo` consumer)
**Apply to:** `lib/geometry/template.ts` (pure) + `components/template/build-template-pdf.ts` (consumer) — never let tile-math and jsPDF drawing calls share a function.

### Geometry module header comment (deviation log)
**Source:** `lib/geometry/volume.ts` lines 1-33, `lib/geometry/outline.ts` lines 1-19
**Apply to:** `lib/geometry/template.ts` — even though it's new (no prototype source), keep the same "what this is, what it deliberately does/doesn't do" opening block so it reads consistently with every other file in `lib/geometry/`.

### Branded `Mm`/`Litres` units at the boundary only
**Source:** `lib/geometry/units.ts`, referenced throughout `volume.ts` and `outline.ts`
**Apply to:** All new template math and the PDF renderer — page dimensions convert through `mm()`/`inchesToMm()` once, at the top of `template.ts`; never a bare `25.4` literal anywhere else (CLAUDE.md Rule 2).

### Icon-only toolbar button over the viewer panel
**Source:** `components/outline/outline-editor.tsx` lines 158-191 (rotate button)
**Apply to:** New construction-lines toggle, wide-view button, and template-export trigger — same `absolute`, bordered, `surf-ground`-filled, `aria-label`-driven treatment; stack at different `right-*` offsets so they don't collide.

### Local view-state, never design-store state, for UI-only toggles
**Source:** `components/outline/outline-editor.tsx` lines 101, 105 + header comment lines 13-25
**Apply to:** `showConstruction`, `orientation`, wide-view, and the export dialog's paper-size pick — all local `useState`, no new field on `components/design/design-store.tsx`.

### Existing action-button styling for "produce an artifact" actions
**Source:** `components/summary/order-form.tsx` lines 663-669 (`Print Order Form` button classes)
**Apply to:** The new "Export Template" trigger buttons on both the Template screen and the Summary screen (D-03), for visual consistency.

### Vitest fixture-typed golden test structure
**Source:** `lib/geometry/volume.test.ts` lines 1-72 (typed golden interfaces, `it.each`)
**Apply to:** `lib/geometry/template.test.ts` where a golden fixture doesn't exist (new math) — use `design.test.ts`'s simpler `it.each(BOARD_PRESETS)` invariant style instead of inventing a new golden JSON, since TMPL-01 is new project logic, not a prototype port.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.github/workflows/ci.yml` | config | batch | No `.github/workflows/` directory exists in the repo today — first CI workflow. Use RESEARCH.md's verified skeleton directly (Standard Stack / Code Examples sections), not a codebase analog. |

## Metadata

**Analog search scope:** `lib/geometry/`, `components/design/`, `components/outline/`, `components/summary/`, `components/ui/`, repo root (`package.json`, `.github/`)
**Files scanned:** `lib/geometry/outline.ts`, `lib/geometry/volume.ts`, `lib/geometry/design.ts`, `lib/geometry/design.test.ts`, `lib/geometry/volume.test.ts`, `components/design/design-store.tsx`, `components/outline/outline-editor.tsx`, `components/summary/use-print-fit.ts`, `components/summary/order-form.tsx`, `components/ui/dialog.tsx`, `components/ui/select.tsx`, `package.json`
**Pattern extraction date:** 2026-08-28
