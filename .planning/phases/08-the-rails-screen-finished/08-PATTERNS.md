# Phase 8: The Rails Screen, Finished - Pattern Map

**Mapped:** 2026-09-07
**Files analyzed:** ~24 (new + modified)
**Analogs found:** 20 / 24 (4 pure-port items with no code analog — asset move, static path data)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `components/rails/rail-band-editor.tsx` (widen `RailPage` union, wire 1:1 button) | component (screen shell) | request-response (tab switch, local state) | itself (existing file) + `components/viewer/tabbed-panel.tsx`/`toolbar-button.tsx` for the pattern being added | exact (self) |
| `components/viewer/two-option-toggle.tsx` (NEW, extracted) | component (control) | request-response | `components/fins/fin-controls.tsx`'s private `PillButton` | exact (source of extraction) |
| `components/rails/rail-instructions.tsx` (NEW) | component (screen panel) | transform (pure render from geometry) | `components/rails/rail-band-editor.tsx`'s `viewer`/`data` page bodies | role-match |
| `components/rails/rail-plan-side-figure.tsx` (NEW) | component (static diagram) | transform | none (ported literal SVG/PNG overlay — no existing analog in-repo) | no analog |
| `components/rails/view-full-sized-dialog.tsx` (NEW) | component (dialog) | request-response + print | `components/template/export-preview-dialog.tsx` (Dialog override pattern), `components/summary/use-print-fit.ts` (measured-probe sizing) | role-match (composite) |
| `components/rails/rail-section-plot.tsx` (add optional `callouts` prop; fix header comment) | component (SVG plot) | transform | itself + `components/viewer/callout-primitives.tsx` (`DimensionLine`, `CalloutChip`, `useSvgFitScale`) | exact (self + primitive lib) |
| `components/rails/rail-controls.tsx` (append print-toggle Checkbox row) | component (sidebar control) | request-response | its own existing `railsImportFoilThickness` Checkbox block (same file) | exact |
| `components/summary/order-form.tsx` (third `Sheet`, `PageMark` "of N", mirror checkbox) | component (print surface) | request-response + print | its own existing `Sheet`/`PageMark`/page-2 block (same file) | exact |
| `app/design/summary/order-form.css` (new sheet variant rules) | config (print CSS) | transform | existing `.order-form-sheet-reference` variant block | exact |
| `components/summary/use-print-fit.ts` | utility (read-only reuse) | transform | itself — no changes, read for `measurePxPerInch` pattern | exact |
| `lib/db/schema.ts` (new nullable column on `userPreferences`) | model (Drizzle schema) | CRUD | `userPreferences.units: text("units")` (same file) | exact |
| new `drizzle/*.sql` migration | migration | batch | existing `drizzle/0000_moaning_zodiak.sql` + 2 more (via `npm run db:generate`) | exact |
| `lib/db/queries.ts` (new `readXPreference`) | service (DB read) | CRUD | `readUnitsPreference` (same file) | exact |
| `app/actions/units.ts` or sibling `app/actions/print-instructions.ts` | service (server action) | CRUD | `saveUnitsPreference` (same file) | exact |
| `lib/units-preference.ts` (generalize) or sibling `lib/print-instructions-preference.ts` | utility (pure preference logic) | transform | `parseUnitsPreference`/`decideUnitsHandoff`/`createUnitsWriteQueue` (same file) | exact |
| `lib/units-server.ts` (generalize) or sibling | service (SSR resolution) | request-response | `resolveUnitsHandoff` (same file) | exact |
| `components/units-provider.tsx` (generalize) or sibling `PrintInstructionsProvider` | provider (client state) | event-driven (useSyncExternalStore) | `UnitsProvider`/`useUnits` (same file) | exact |
| `app/layout.tsx` (mount provider, read cookie) | config (root layout) | request-response | existing `resolveUnitsHandoff()` call + `UnitsProvider` mount (same file) | exact |
| `scripts/extract-prototype-rails-golden.mjs` (new fixture block) | utility (fixture extraction) | batch | its own existing per-scenario loop (same file) | exact |
| `lib/geometry/__fixtures__/prototype-rails-golden.json` (new `exampleRail` key) | config (fixture data) | batch | its own existing eleven scenario entries | exact |
| `lib/geometry/rail-bands.test.ts` (new golden-parity block) | test | transform | existing `expectCloseIn`/`NUMERIC_RESULT_FIELDS` blocks (same file) | exact |
| `lib/units-isolation.test.ts` (ledger entries) | test | batch | existing `DESIGN_SCREEN_DISPLAY_FILES`/`findPrintSurfaceFiles()` append pattern (`lib/geometry/template.ts` one-off) | exact |
| `public/rail-bands-plan-bg.png` (moved) | static asset | file-I/O | `reference/project/assets/rail-bands-plan-bg.png` | exact (byte-preserving copy) |

## Pattern Assignments

### `components/viewer/two-option-toggle.tsx` (component, extracted control)

**Analog:** `components/fins/fin-controls.tsx` lines 96-122 (`PillButton`)

**Core pattern (copy byte-for-byte, generalize to two named options):**
```typescript
function PillButton({
  active,
  onClick,
  children,
  className = "",
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        `rounded-md border px-1 py-2.5 text-[11px] font-bold ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"} ${
          active
            ? "border-surf-on-accent bg-surf-accent text-surf-on-accent"
            : "border-surf-line bg-surf-sidebar text-surf-ink"
        } ${className}`
      }
    >
      {children}
    </button>
  );
}
```
UI-SPEC (Interaction & Layout Contract, "Flat/Domed toggle") mandates this exact class string be preserved verbatim in the new shared component; two options only, laid out side by side in a card header, right-aligned against the title. Place beside `toolbar-button.tsx`/`tabbed-panel.tsx` in `components/viewer/`, per RESEARCH.md's structure and UI-SPEC's placement note. `fin-controls.tsx` keeps its own `PillButton` unless the executor chooses to have it delegate to the new shared component — CONTEXT.md/UI-SPEC only require extraction, not that every existing call site be migrated in this phase (confirm scope with the plan).

---

### `components/rails/rail-section-plot.tsx` (optional `callouts` prop)

**Analog:** self (existing file) — read its current props/legend/color exports, and `components/viewer/callout-primitives.tsx` for the label primitives.

**Segment colours already exported (reuse, do not redeclare):**
```typescript
// components/rails/rail-section-plot.tsx — RAIL_SEGMENT_COLORS, buildRailLegend,
// computeRailPlotBounds, buildRailPlotGrid (10mm-pitch Metric grid) already exist and are
// imported today by rail-band-editor.tsx:
import { RailSectionPlot, buildRailLegend, computeRailPlotBounds } from "./rail-section-plot";
```

**Callout label primitives to import** (`components/viewer/callout-primitives.tsx`):
```typescript
export const CALLOUT_PX = { value: 14, name: 11, dim: 14, chipW: 104, chipH: 32 } as const;
export function useSvgFitScale(/* ... */): number { /* ... */ }
export function pinnedCalloutSizes(fitScale: number): CalloutSizes { /* ... */ }
export function DimensionLine({ /* ... */ }: DimensionLineProps) { /* supports haloColor */ }
export function CalloutChip({ x, y, name, value, nameColor, leaderToX }: CalloutChipProps) { /* ... */ }
```
D-17/UI-SPEC direct: labels render as SVG `<text>` at the Label role (11px via `useSvgFitScale`), using `DimensionLine`'s `haloColor` (`var(--outline-page-bg)`) for legibility — reuse the existing primitive rather than inventing a new halo technique. The stale header comment ("callouts belong to the out-of-scope Instructions page") must be corrected in the same edit (RESEARCH.md Anti-Patterns, CONTEXT.md Reusable Assets).

**Anchor computation — copy character-for-character from the prototype (Pitfall 1), not re-derived from segment geometry:**
```javascript
// Source: reference/project/Rails.dc.html lines 1093-1104 (verbatim)
const raw = [
  { x: px(0), y: py(r.apexCenter), text: `Apex`, color: '#1c1b19', side: 1 },
  { x: px(0), y: py(segs.find(s => s.key === 'domedBand').p1[1]), text: `Domed Taper`, color: '#6b8e4e', side: 1 },
  { x: px(0), y: py(r.railMark1), text: `Rail Mk1`, color: 'var(--accent)', side: 1 },
  { x: px(-r.cornerCutDeck), y: py(r.railMark1), text: `Corner Cut`, color: '#4d8a86', side: -1 },
  { x: px(-r.deckMark3), y: py(thickness), text: `Deck 3`, color: '#b5563a', side: -1 },
  { x: px(-r.deckMark2), y: /* band1Y(-r.deckMark2) */ null, text: `Deck 2`, color: 'var(--accent)', side: -1 },
  { x: px(-r.deckMark1), y: py(thickness), text: `Deck 1`, color: 'var(--accent)', side: -1 },
  { x: px(0), y: py(r.railTuck1), text: `Tuck 1`, color: '#1c1b19', side: 1 },
  { x: px(-r.bottomTuck1), y: py(0), text: `Bottom Tuck 1`, color: '#1c1b19', side: -1 },
  { x: px(-r.bottomTuck3), y: py(0), text: `Bottom Tuck 3`, color: '#8a8272', side: -1 },
];
```
UI-SPEC's own color-mapping table (Interaction & Layout Contract, "Callout colour mapping") overrides the prototype's arbitrary hexes with `RAIL_SEGMENT_COLORS` keys — use the UI-SPEC table, not the prototype's literal `color` fields, for the actual fill/stroke; keep only the `x`/`y`/`text`/`side` positions from the prototype block above.

---

### `components/rails/rail-instructions.tsx` (NEW component, INSTRUCTIONS tab)

**Analog:** `components/rails/rail-band-editor.tsx`'s existing `viewer`/`data` page bodies (same file, `RailPage` conditional render) for how a `TabbedPanel` page composes `RailSectionPlot` + controls; `components/rails/rail-section-plot.tsx`'s geometry-call chain for the example rail.

**Geometry call chain (D-20, no `lib/geometry/` changes):**
```typescript
// Same chain computeRailBands's internal build() closure already runs — one more call, not a
// new exported function (lib/geometry/rail-bands.ts, existing exports):
import { computeRailSection, buildRailSegments, buildRailProfile, railPlotBounds } from "@/lib/geometry/rail-bands";
import { inchesToMm } from "@/lib/geometry/units";

const thicknessIn = domed ? 3 : 3.5;
const thickness = inchesToMm(thicknessIn);
const domedBandBase = inchesToMm(6);
const result = computeRailSection({
  thickness, ratioTopPercent: 60, family: 3, domed, domedBandBase, scale: 1,
  cornerCutOffsetOverride: null, removeCornerCut: false, singleTuck: false,
  bottomTuck3Override: null, symmetrical: false, hardEdge: false,
});
const opts = { boardThickness: inchesToMm(3.5), railThicknessVal: inchesToMm(3), domedBandBase };
const segments = buildRailSegments(result, thickness, domed, opts);
const profile = buildRailProfile(result, thickness, domed, opts);
const bounds = railPlotBounds(result, { domed, thickness, ...opts });
```
Never hand-type these numbers into a test — pin via the golden fixture (see below).

**Card shell / typography:** reuse `rail-controls.tsx`'s own heading class byte-for-byte for the two card titles (UI-SPEC Typography table, Heading role): `text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold` (source: `rail-controls.tsx` line ~364, "Rail Band Calculator" heading).

---

### `components/rails/rail-controls.tsx` (print-toggle Checkbox row)

**Analog:** its own existing `railsImportFoilThickness` block, same file, lines ~373-383.

**Core pattern (copy shape, new label/helper per UI-SPEC):**
```typescript
<div>
  <label className="flex cursor-pointer items-center gap-1.5 text-sm text-surf-ink-muted font-normal">
    <Checkbox
      checked={railsImportFoilThickness}
      onCheckedChange={() => onToggleRailsImportFoilThickness()}
    />
    Use Board&#39;s Rocker &amp; Foil Thickness
  </label>
  <div className="mt-1 text-xs text-surf-ink-muted font-normal">
    {railsImportFoilThickness
      ? "Thickness comes from the ROCKER screen — turn this off to type your own numbers."
      : "You're typing your own thickness here — turn this on to use the board's foil instead."}
  </div>
</div>
```
UI-SPEC (Interaction & Layout Contract, "Print toggle placement") directs: add this new block at the **end** of `RailControls` (after the Tail `RailSectionControls`, before any dev-only footer) — same `Checkbox` + label row shape, but the helper line for this toggle is **one static line** (unlike the foil-link toggle, this one doesn't flip meaning with state): `"Adds a third reference page to the printed order form, explaining what each rail band mark means."` (Copywriting Contract).

---

### `components/summary/order-form.tsx` (third `Sheet`, `PageMark`, mirror checkbox)

**Analog:** its own existing page-2 `Sheet`/`PageMark` block, same file, lines ~536-695, plus the `Sheet`/`PageMark` component definitions at lines 116-146.

**`Sheet`/`PageMark` primitives (unchanged, reused for the third sheet):**
```typescript
function Sheet({
  variant = "form",
  children,
}: { variant?: "form" | "reference"; children: ReactNode }) {
  return (
    <div
      data-order-form-sheet
      className={cn(
        "flex flex-col gap-1 border-[1.5px] border-surf-ink bg-surf-panel p-1.5",
        variant === "reference" && "order-form-sheet-reference",
      )}
    >
      {children}
    </div>
  );
}

function PageMark({ page, title }: { page: number; title: string }) {
  return (
    <div className="flex flex-none items-baseline justify-between gap-2 pt-0.5 text-surf-ink-muted order-form-micro">
      <span className="font-display font-extrabold tracking-architectural uppercase">{title}</span>
      <span>Page {page} of 2</span>
    </div>
  );
}
```
`PageMark`'s hardcoded `of 2` (line ~146) must be generalized to an `of` prop (`of 3` when the print toggle is ticked) — this is the one required signature change, per D-09/Copywriting Contract's "Page 1 of 3" rows. A third `<Sheet variant="reference">` (or a new `variant="instructions"` if the reference sheet's type-scale override doesn't fit — see `order-form.css` below) wraps a fixed-Flat, all-legend-lines render of the same `RailSectionPlot`+callouts+figure the INSTRUCTIONS tab renders (D-08: never reflects the on-screen Flat/Domed switch or legend ticks).

**Print/export button row (mirror checkbox goes here), same file lines ~699-712:**
```typescript
<div data-print-hide className="mt-4 flex flex-none items-center gap-3">
  <Button
    type="button"
    onClick={printOrderForm}
    className="border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85"
  >
    Print Order Form
  </Button>
  {/* mirror checkbox goes here per D-10, UI-SPEC "Print toggle placement": beside Print Order
      Form, in the same data-print-hide row as the page-count note. */}
</div>
```

---

### `app/design/summary/order-form.css` (third sheet variant)

**Analog:** existing `.order-form-sheet-reference` variant block (referenced by `Sheet`'s `variant === "reference"` className) — read this block for the pattern of a per-sheet type-scale override, and extend/sibling it for the new sheet rather than hand-rolling a fresh rule set.

---

### `components/rails/view-full-sized-dialog.tsx` (NEW, 1:1 dialog)

**Analog (Dialog override):** `components/setup/board-name-prompt.tsx` line 62 / `components/auth/sign-in-dialog.tsx` line 58, generalized per UI-SPEC's own explicit override spec (wider than either existing example, since this dialog holds a true-size drawing, not a form):

```typescript
// UI-SPEC's prescribed override (Interaction & Layout Contract, "1:1 dialog"):
<DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90dvh] overflow-y-auto border-surf-line-faint bg-surf-panel text-surf-ink">
```
Base pattern for `Dialog`/`DialogTrigger`/`DialogContent`/`DialogClose` imports: `components/ui/dialog.tsx` (Base UI `@base-ui/react/dialog` wrapper, already vendored — no new shadcn install).

**Trigger:** `components/viewer/toolbar-button.tsx`'s `ViewerToolbarButton`, slot pattern:
```typescript
export type ViewerToolbarSlot = 0 | 1 | 2 | 3;
const TOOLBAR_SLOT_POSITION: Record<ViewerToolbarSlot, string> = {
  0: "top-0 right-0", 1: "top-0 right-10", 2: "top-0 right-20", 3: "top-0 right-30",
};
```
Add "View Full Sized" at the next open slot in the VIEWER toolbar per D-12.

**Tabs inside dialog:** reuse `TabbedPanel`/`PanelTab` from `components/viewer/tabbed-panel.tsx` (non-bare mode) for Nose/Center/Tail — UI-SPEC explicitly requires this rather than a second tab-switch pattern.

**1:1 sizing (measured, never `devicePixelRatio`):**
```typescript
// Source: components/summary/use-print-fit.ts lines 57-65 (verbatim) — the pattern to mirror in
// a new, view-full-sized-dialog-local hook, per D-13/RESEARCH.md Pattern 4 (use-print-fit.ts
// keeps its own 25.4-adjacent convention by design; don't import it, replicate the technique):
function measurePxPerInch(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "width:1in;height:0;position:absolute;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px > 0 ? px : 96;
}
```

**Check bar caption:** call `formatCalibrationMark` (`lib/geometry/measure-display.ts`) — do not hand-type `"2 in"` (Pitfall 6). Reuse/import the existing `SCALE_SQUARE_MM`-equivalent constant from `components/template/build-template-pdf.ts`'s `scaleSquareCaptionText` composition if it's exported, or replicate its call shape.

---

## Shared Patterns

### The units-preference stack (extend for the print-instructions boolean)
**Source:** `lib/db/schema.ts`, `lib/db/queries.ts`, `lib/units-preference.ts`, `lib/units-server.ts`, `app/actions/units.ts`, `components/units-provider.tsx` — all read in full above.
**Apply to:** every file in the "preference stack" row of File Classification.

Exact pieces to mirror one-for-one (full file bodies read above and available verbatim to the planner):
- Schema: `userPreferences.units: text("units")` → nullable boolean/text column, same table, same `clerkUserId` primary key. **Nullable is load-bearing** — Pitfall 3: "absence" must never collapse into an explicit `false`.
- Parse/allow-list: `parseUnitsPreference` returns `T | null`, never a default — mirror for the boolean.
- Handoff: `decideUnitsHandoff({signedIn, account, browser})`'s four-branch return shape — retype for boolean, same branches.
- Write queue: `createUnitsWriteQueue({save, setTimer, clearTimer})` — same at-most-one-in-flight, last-pick-wins, `[1000, 4000, 15000]`ms ladder; reuse the generic shape rather than re-deriving.
- Server action: `saveUnitsPreference`'s `"use server"` + `await auth()` + allow-list + `onConflictDoUpdate` shape — copy for `savePrintInstructionsPreference(value: boolean)`.
- Server resolution: `resolveUnitsHandoff`'s `await auth()` + cookie read + try/catch-degraded account read, called from `app/layout.tsx` before render.
- Client provider: `UnitsProvider`'s `useSyncExternalStore` + `reconciledRef` (prevents the sign-in reconciliation flash) + `emitPreferenceChange()` (same-tab sync) + `storage` event listener (cross-tab sync) — the full ~120-line body above is the exact shape to mirror or generalize (RESEARCH.md's own recommendation: generalize only the pure logic, keep `UnitsProvider` untouched, add a sibling `PrintInstructionsProvider`).

### Dialog override treatment
**Source:** `components/ui/dialog.tsx` (Base UI wrapper) + `components/setup/board-name-prompt.tsx`/`components/auth/sign-in-dialog.tsx` (override className precedent)
**Apply to:** `view-full-sized-dialog.tsx` — UI-SPEC gives the exact override string, don't invent a new one.

### Checkbox row (label + helper line)
**Source:** `components/rails/rail-controls.tsx`'s `railsImportFoilThickness` block
**Apply to:** the new print-toggle row in `rail-controls.tsx` and its mirror in `order-form.tsx`.

### Print-surface units-isolation ledger extension
**Source:** `lib/units-isolation.test.ts`'s `findPrintSurfaceFiles()` one-off append pattern:
```typescript
return [...found, "lib/geometry/template.ts"];
```
**Apply to:** append the new `view-full-sized-dialog.tsx` (and the third-sheet-rendering portion of `order-form.tsx`, already covered) by name to this same return statement — do NOT widen `PRINT_SURFACE_FOLDERS` to include all of `components/rails/` (Pitfall 2 — would drag unrelated rails files into a ledger they don't belong in).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `components/rails/rail-plan-side-figure.tsx` | component (static diagram) | transform | No existing component in this codebase composes a raster PNG with hand-traced SVG overlay paths at a fixed `viewBox` — this is a first-of-its-kind ported literal asset. Source of truth is `reference/project/Rails.dc.html` lines 671-675 (path data) and 420/432 (`viewBox` values), not a codebase analog. Byte-preserving copy required (Pitfall 5). |
| `public/rail-bands-plan-bg.png` | static asset | file-I/O | New asset move, not a code pattern — use `cp` (byte-preserving), verify with checksum before/after. |
| Third sheet's fixed-Flat/all-legend render composition | transform | transform | D-08's "always Flat, always every legend line" behavior has no existing precedent in `order-form.tsx` (page 2's reference sheet reads live design data, not a fixed example) — this is new composition logic layered on top of the exact `Sheet`/`PageMark` analog above, not a separate file needing its own analog. |
| Golden-fixture `exampleRail` shape | config (fixture data) | batch | The existing eleven fixtures are all `{state, sections: {nose, center, tail}}`; the example rail is a single-section result in two states (`flat`/`domed`) with no `state` object at all — RESEARCH.md's own Code Examples section already provides the concrete new-shape code (`EXAMPLE_RAIL_INPUTS`/`exampleRail` object), which should be used directly rather than searched for elsewhere. |

## Metadata

**Analog search scope:** `components/rails/`, `components/viewer/`, `components/fins/`, `components/summary/`, `components/ui/`, `components/setup/`, `components/auth/`, `lib/`, `lib/db/`, `app/actions/`, `lib/geometry/`, `scripts/`
**Files scanned:** ~30 (targeted reads/greps, no full-repo walk)
**Pattern extraction date:** 2026-09-07
