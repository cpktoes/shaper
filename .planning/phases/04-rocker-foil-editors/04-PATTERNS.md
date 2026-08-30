# Phase 4: Rocker & Foil Editors - Pattern Map

**Mapped:** 2026-08-29
**Files analyzed:** 15 new / 8 modified
**Analogs found:** 21 / 23

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `lib/geometry/rocker.ts` | model/service (geometry) | transform | `lib/geometry/rail-bands.ts` | role-match (concept module) |
| `lib/geometry/foil.ts` | model/service (geometry) | transform | `lib/geometry/rail-bands.ts` | role-match (concept module) |
| `lib/geometry/rocker-drag.ts` | utility | event-driven (drag → spec) | `lib/geometry/outline-drag.ts` | exact |
| `lib/geometry/board.ts` (extend) | model | CRUD (types + defaults) | itself (existing file, extend in place) | exact |
| `lib/geometry/volume.ts` (extend) | service | batch (Simpson integration) | itself, using `lib/geometry/outline.ts::sampleOutline` + `rail-bands.ts::computeRailSection` as inputs | role-match |
| `lib/geometry/design.ts` (extend) | service | transform (derived values) | itself (`deriveEffectiveVolume`) | exact |
| `lib/geometry/presets.ts` (extend) | config | CRUD (static data) | itself | exact |
| `lib/models/design-snapshot.ts` (extend) | model/validation | request-response (parse/serialize) | itself | exact |
| `components/design/design-store.tsx` (extend) | provider/store | event-driven (React context) | itself | exact |
| `app/design/rocker/page.tsx` | route | request-response | `app/design/outline/page.tsx` (or `app/design/rails/page.tsx`) | exact |
| `components/rocker/rocker-editor.tsx` | component (screen shell) | event-driven | `components/outline/outline-editor.tsx` | exact |
| `components/rocker/rocker-controls.tsx` | component (sidebar) | event-driven | `components/volume/volume-controls.tsx` + outline sidebar controls | role-match |
| `components/rocker/rocker-viewer.tsx` | component (SVG viewer) | transform (render) | `components/outline/outline-viewer.tsx` (not read this pass, same family) | role-match |
| `components/rails/rail-controls.tsx` (extend) | component | event-driven (add override toggle) | itself, mirroring `components/volume/volume-controls.tsx` import-toggle | exact |
| `components/summary/order-form.tsx` (extend `RockerTicks`) | component | transform (render) | itself | exact |
| `components/site-nav.tsx` (extend `NAV_LINKS`) | config/component | CRUD (static array) | itself | exact |
| `lib/geometry/rocker.test.ts` | test | — | `lib/geometry/rail-bands.test.ts` (not read; same suite family) | role-match |
| `lib/geometry/foil.test.ts` | test | — | same | role-match |
| `lib/geometry/rocker-drag.test.ts` | test | — | `lib/geometry/outline-drag.test.ts` (not read; same suite family) | role-match |
| `lib/geometry/__fixtures__/blank-datasheet-golden.json` | fixture | — | `lib/geometry/__fixtures__/*-golden.json` | role-match (but hand-entered, not `npm run golden`-generated — see D-14) |

## Pattern Assignments

### `lib/geometry/rocker.ts` and `lib/geometry/foil.ts` (geometry modules, transform)

**Analog:** `lib/geometry/rail-bands.ts`

**File-header doc-comment pattern** (lines 1-28 of rail-bands.ts) — every geometry concept module opens with a comment naming its prototype ancestor (or, per D-14/Pitfall 2, explicitly stating it has none and documenting the divergence from `GEOMETRY-MODULE.md`) and enumerating deliberate deviations as a numbered list. `rocker.ts`/`foil.ts` should open the same way, citing CONTEXT.md D-05 as the source of the 4-station/5-station shape (see RESEARCH.md Pitfall 2 for the exact wording to adapt).

**Spec + DEFAULT + compute triad** (lines 42-87):
```typescript
export interface RailSectionSpec { boardThickness: Mm; deckPercent: number; /* ... */ }
export interface RailBandSpec { nose: RailSectionSpec; center: RailSectionSpec; tail: RailSectionSpec; tailHardEdge: boolean; }
export const DEFAULT_RAIL_BAND_SPEC: RailBandSpec = { /* ... */ };
```
Mirror as:
```typescript
export interface RockerSpec { noseTip: Mm; nose12: Mm; tail12: Mm; tailTip: Mm; }
export interface FoilSpec { noseTip: Mm; nose12: Mm; center: Mm; tail12: Mm; tailTip: Mm; }
export const DEFAULT_ROCKER_SPEC: RockerSpec = { /* per D-05, center is implicitly 0, not stored */ };
export const DEFAULT_FOIL_SPEC: FoilSpec = { /* ... */ };
```

**Sampling function signature to match** (`lib/geometry/outline.ts` lines 141-149 — already-built precedent for "sample at any station"):
```typescript
export function sampleOutline(geometry: OutlineGeometry, station: Mm): Mm {
  return mm(interpolateHalfWidth(geometry.points, station));
}
```
`sampleRocker(spec, station): Mm` and `sampleFoil(spec, station): Mm` should follow this exact shape — pure function, `Mm` in and out, no caching of derived spline data outside the call (per RESEARCH.md Open Question 2: recompute tangents fresh each call, matching how `buildOutline` derives Bezier data fresh from `OutlineSpec`).

**Unit boundary discipline:** every constant that is a real-world inch measurement should follow rail-bands.ts's own rule 1 (lines 8-16) — keep an inch-domain private core if the formula reads more naturally that way, convert Mm at the public boundary only.

---

### `lib/geometry/rocker-drag.ts` (utility, event-driven)

**Analog:** `lib/geometry/outline-drag.ts` (full file read — CONTEXT.md explicitly says "should follow it exactly")

**Quantise-to-slider pattern** (lines 63-84):
```typescript
const LIMITS = {
  widePointOffsetIn: { min: -12, max: 12, step: 0.25 },
  railLength: { min: 0, max: 100, step: 0.25 },
  // ...
} as const;

function quantise(value: number, limit: Limit): number {
  if (!Number.isFinite(value)) return limit.min;
  const snapped = Math.round(value / limit.step) * limit.step;
  const clamped = Math.min(limit.max, Math.max(limit.min, snapped));
  return Math.round(clamped / limit.step) * limit.step;
}
```
Every rocker/foil station drag target needs its own `LIMITS` entry and must route through an equivalent `quantise` before returning a spec patch — this is the mechanism that satisfies "every drag result must be slider-representable."

**Solve-returns-partial-spec pattern** (lines 131-223):
```typescript
export function solveOutlineDrag(
  geometry: OutlineGeometry,
  target: OutlineDragTarget,
  dragged: OutlineDragPoint,
): Partial<OutlineSpec> {
  switch (target) { /* one case per grabbable point, each returning only the fields it owns */ }
}
```
Mirror as `solveRockerDrag(geometry, target, dragged): Partial<RockerSpec>` / `solveFoilDrag(...): Partial<FoilSpec>` (or one combined `RockerFoilDragTarget` union if the two curves share one viewer, per RESEARCH.md's structure note). Reuse imported caps/constants from `rocker.ts`/`foil.ts` — never restate a clamp here (rule 1 of the analog's own doc-comment).

**Grabbable-points enumerator pattern** (lines 104-122): `outlineDragPoints(geometry): OutlineDragPointAt[]` returns every draggable point's current position plus its anchor for line-drawing — the rocker/foil viewer needs the same enumerator (five station points on each of the bottom and deck curves).

---

### `lib/geometry/board.ts` (extend types)

**Analog:** itself — extend `BoardSpec` the same way its own doc comment predicts:
```typescript
// lines 92-99
/**
 * The single board-design object. Rocker, foil, rails and fins become
 * sibling keys in later phases, so screens added later extend this object
 * rather than reshaping it.
 */
export interface BoardSpec {
  outline: OutlineSpec;
}
```
Add `rocker: RockerSpec; foil: FoilSpec;` as sibling keys (importing the types from the new `rocker.ts`/`foil.ts`, not redefining them here — `board.ts` stays types-only per RESEARCH.md's Recommended Project Structure). Document the D-05 divergence from `GEOMETRY-MODULE.md`'s 2-value model in this file's header, following the numbered-deviation convention `volume.ts` already uses.

---

### `lib/geometry/volume.ts` (extend — Simpson path)

**Analog:** itself, existing trapezoidal estimator (lines 186-195, 265-279)

**Closing-polygon-per-station technique to generalize:**
```typescript
function stationEffThickness(profile: [number, number][], boardThickness: number, halfWidth: number): number {
  if (!halfWidth) return 0;
  const poly: [number, number][] = [[-halfWidth, boardThickness], ...profile, [-halfWidth, 0]];
  return shoelaceArea(poly) / halfWidth;
}
const trapz = (a: number, b: number, d: number) => ((a + b) / 2) * d;
```
The new `computeVolumeAccurate` (or similarly named export, keeping `computeVolume` untouched per D-13) generalizes this exact shoelace-polygon idea from 3 fixed stations + trapezoidal weights to ~50 (even count) stations + Simpson weights. Composes:
- `sampleOutline` (`lib/geometry/outline.ts` lines 141-149) for half-width at each station
- new `sampleFoil` for thickness at each station
- an interpolated `RailSectionSpec` (linear interpolation of numeric fields between nose/center/tail, per RESEARCH.md Open Question 1) fed into the existing `computeRailSection`/`buildRailProfile` machinery in `rail-bands.ts`

**Litre-constant rule (Pitfall 4):** the new path must call `cubicMmToLitres` (`lib/geometry/units.ts` lines 34-36) — exact conversion. Do not use the existing estimator's `CUBIC_INCHES_PER_LITRE` constant for this path; that constant stays scoped to the kept-alive standalone estimator (D-13).

**Even-panel-count guard (Pitfall 1):** name the station/panel count as an explicit constant (e.g. `SIMPSON_PANEL_COUNT = 50`) and add a unit test asserting it is even.

---

### `lib/geometry/design.ts` (extend — derived "effective" values)

**Analog:** itself, `deriveEffectiveVolume` (lines 57-70)

```typescript
export function deriveEffectiveVolume(
  volume: VolumeSpec,
  templateValues: VolumeTemplateValues,
  railValues: VolumeRailValues,
): VolumeSpec {
  if (!volume.importTemplateDimensions) return volume;
  const centerThickness = volume.importRailThickness ? railValues.centerThickness : volume.centerThickness;
  return { ...volume, length: templateValues.length, width: templateValues.widePointWidth, centerThickness };
}
```
Add `deriveEffectiveRails(rails: RailBandSpec, foil: FoilSpec): RailBandSpec` (or a narrower per-section thickness deriver) using the exact same "return input unchanged unless an override/import flag says otherwise" shape. Per RESEARCH.md Pattern 3 and Pitfall 3: map `foil.nose12 → rails.nose.boardThickness`, `foil.center → rails.center.boardThickness`, `foil.tail12 → rails.tail.boardThickness` — never wire `foil.noseTip`/`foil.tailTip` into rails. Add a per-section `thicknessOverride: Mm | null` field to `RailSectionSpec`, mirroring the existing null-means-linked convention already used by `bottomTuck3Override`/`cornerCutOffsetOverride` in the same interface (`lib/geometry/rail-bands.ts` lines 43-53).

**No sync effect — this is the anti-pattern to avoid** (design-store.tsx's own doc comment, quoted in RESEARCH.md Pattern 3): "no reducer library, and every design-field mutator sets state directly rather than through a synchronization effect that mirrors one piece of state into another." Do not write a `useEffect` that copies foil thickness into `state.rails`.

---

### `components/rails/rail-controls.tsx` (extend — override toggle, D-10)

**Analog:** `components/volume/volume-controls.tsx` lines 87-96 (full import-toggle idiom, already read)

```typescript
{railAvailable && (
  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-surf-ink-muted font-normal">
    <Checkbox
      checked={effectiveVolume.importRailThickness}
      onCheckedChange={() => onToggleImportRailThickness()}
      disabled={!effectiveVolume.importTemplateDimensions}
    />
    Calculate Volume Based on Template and Rail Data
  </label>
)}
```
Add an equivalent `<Checkbox>` on each rail section (or once per screen) for "Use rocker/foil thickness" vs. manual entry, defaulted to linked/imported per D-10 ("boards designed in the app" is the common case). Disable the manual thickness input while linked, exactly as `dimensionsDisabled`/`thicknessDisabled` gate the Volume screen's own inputs (lines 60-64 of the same file).

---

### `components/rocker/rocker-editor.tsx` (screen shell)

**Analog:** `components/outline/outline-editor.tsx` (toolbar section, lines ~60-240)

**Rotate-in-place button** (lines 64-93, 176-203) — `RotateBoardIcon` component and its toggle button are lifted verbatim from the Template screen's sketch-006 pattern; D-03 says the ROCKER screen "carries the same rotate-in-place button." Copy the icon component and the toggle wiring (`orientation` state + `title`/`aria-label` strings) as-is.

**Construction-lines / hide-reference toggle** (lines 103, 207-237) — `showConstruction` is local view state, not design data:
```typescript
const [showConstruction, setShowConstruction] = useState(false);
// ...
<button
  onClick={() => setShowConstruction((v) => !v)}
  aria-pressed={showConstruction}
  aria-label={showConstruction ? "Hide construction lines" : "Show construction lines"}
  title={showConstruction ? "Hide construction lines" : "Show construction lines"}
  // a real ON/OFF toggle, so it keeps the accent fill while it is on
>
```
Superseded in part by quick task 260830-1g3: the accent fill is no longer reserved to one
button. Every button in the Template/Rocker viewer toolbars now fills with the accent colour on
hover, and a button additionally KEEPS that fill while it is on — the toggle add-on — only when
it represents a genuine ON/OFF state carrying a truthful `aria-pressed`. Today that is
Construction Lines and Wide view on both screens.

A new viewer-toolbar button should therefore take the shared base hover rule as its default
(accent fill, accent border, on-accent icon colour) and add the pressed treatment only if it is
really a toggle — rather than inventing a fresh one-off look. D-08's "hide the outline/width
reference" toggle is a genuine toggle, so it takes both (e.g. `showOutlineReference`).

---

### `components/summary/order-form.tsx` (`RockerTicks`, D-04)

**Analog:** itself — the placeholder function at line 137 (`function RockerTicks() { ... }`) is explicitly documented as "Placeholder chrome until the rocker screen exists." Read the full function body before replacing it; the two call sites (lines 327, 350) pass whatever real curve data becomes available (likely `sampleRocker` output at a few stations) in place of the fixed HIGH/MEDIUM/LOW ticks. No other screen in this file should gain a side profile per D-04.

---

### `components/site-nav.tsx` (`NAV_LINKS`, D-02)

**Analog:** itself, lines 22-28:
```typescript
const NAV_LINKS = [
  { href: "/design/outline", label: "TEMPLATE" },
  { href: "/design/rails", label: "RAILS" },
  { href: "/design/volume", label: "VOLUME" },
  { href: "/design/fins", label: "FINS" },
  { href: "/design/summary", label: "SUMMARY" },
] as const;
```
Insert `{ href: "/design/rocker", label: "ROCKER" }` between the TEMPLATE and RAILS entries — a one-line, purely additive change (D-02 marks this reversible).

---

### `lib/models/design-snapshot.ts` (extend — version bump, D-15)

**Analog:** itself — the file's own header comment (lines 17-22) predicts exactly this change: "Phase 4 adds rocker and foil to the design, so `parseSnapshot` tolerates a snapshot written by an older version... by filling that field from the matching geometry module's own DEFAULT_* constant."

**Schema-per-field pattern** (lines 50-118, e.g. `outlineSpecSchema`):
```typescript
const outlineSpecSchema = z.object({
  length: z.number(),
  widePointWidth: z.number(),
  // ... one z.number()/z.boolean()/z.enum() per branded field, never re-branded here
});
```
Add `rockerSpecSchema` (4 `z.number()` fields) and `foilSpecSchema` (5 `z.number()` fields).

**`.partial()` + DEFAULT_* backfill** (lines 122-190):
```typescript
const designFieldsSchema = z.object({ outline: outlineSpecSchema, rails: railBandSpecSchema, /* ... */ }).partial();
// ...
return {
  outline: (design.outline ?? DEFAULT_BOARD_SPEC.outline) as OutlineSpec,
  rails: (design.rails ?? DEFAULT_RAIL_BAND_SPEC) as RailBandSpec,
  // ...
};
```
Add `rocker` and `foil` to both the `.partial()` object and the `parseSnapshot` backfill return, defaulting from the new `DEFAULT_ROCKER_SPEC`/`DEFAULT_FOIL_SPEC`. Bump `DESIGN_SNAPSHOT_VERSION` from `1` to `2` (line 40) — this is the version-tolerance mechanism D-15 exercises, with no migration ceremony needed beyond this.

---

### `components/design/design-store.tsx` (extend)

**Analog:** itself — `useMemo` derivation chain, lines 330-394 (`outlineGeometry` → `railBands` → `templateValues`/`railValues` → `effectiveVolume` → `volumeResult`). New rocker/foil state slots into `DesignState`, and a new `effectiveRails` memo (calling the new `deriveEffectiveRails` from `design.ts`) slots into this exact chain, feeding `railBands`/`volumeResult` the same way `effectiveVolume` currently feeds `computeVolume`. `designSnapshotFields` (line 450) gains `rocker`/`foil` keys alongside the existing seven.

## Shared Patterns

### Geometry-module doc-comment + deviation-numbering convention
**Source:** `lib/geometry/rail-bands.ts` lines 1-28, `lib/geometry/volume.ts` header (deviations 1-4)
**Apply to:** `rocker.ts`, `foil.ts`, `board.ts`'s extended header, and the Simpson addition to `volume.ts`
Every geometry file names its prototype ancestor (or, for rocker/foil, explicitly states it has none per D-14) and lists deliberate deviations as a numbered list. This is the mechanism by which "the approved design doc said X, we did Y" (Pitfall 2) gets recorded in-repo rather than only in CONTEXT.md.

### Derived "effective" value over sync effect
**Source:** `lib/geometry/design.ts::deriveEffectiveVolume`, `components/design/design-store.tsx`'s own doc comment
**Apply to:** `deriveEffectiveRails` (D-09/D-10 thickness link + override)
Never write a `useEffect` that copies one piece of state into another. Compute the effective/derived value in a pure function, memoize it in the store with `useMemo`, and have consumers read the derived value, not the raw one.

### Import/override checkbox idiom
**Source:** `components/volume/volume-controls.tsx` lines 78-96
**Apply to:** the new RAILS override toggle (D-10), and any similar toggle the ROCKER screen itself needs
`<Checkbox checked={effective.importX} onCheckedChange={() => onToggleImportX()} disabled={...} />` plus opacity-dimming the now-non-authoritative manual inputs while imported.

### Units boundary — never reach for 25.4 outside `units.ts`
**Source:** `lib/geometry/units.ts` (full file), `parseImperial`/`formatInchesFraction`
**Apply to:** ROCKER screen's typed datasheet entry (D-06), any new label formatting
All typed station-value parsing routes through `parseImperial`; all displayed values route through `formatInchesFraction`/`formatSignedInchesFraction` as appropriate. `Mm`/`Degrees`/`Litres` stay branded types constructed only via `mm()`/`degrees()`/`litres()`.

### Snapshot version-tolerance
**Source:** `lib/models/design-snapshot.ts` (full file)
**Apply to:** rocker/foil persistence (D-15)
New top-level fields go into the `.partial()` schema and get a `?? DEFAULT_*` fallback in `parseSnapshot`; bump `DESIGN_SNAPSHOT_VERSION`. No migration script, no special-casing per-field — the mechanism already exists and is already tested.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/geometry/__fixtures__/blank-datasheet-golden.json` | fixture | — | No prototype ancestor exists (D-14's sanctioned exception); existing fixtures are all generated by `scripts/extract-prototype-*-golden.mjs`, which has nothing to extract from for this math. Hand-enter with provenance comments per CONTEXT.md D-14; use the *shape* of an existing fixture file as formatting precedent only, not its generation method. |
| Simpson's-rule integration itself (the ~50-station composite rule, as opposed to the surrounding `volume.ts` scaffolding) | algorithm | batch | No composite-Simpson code exists anywhere in this repo (only trapezoidal, in the existing estimator) — this is genuinely new numerical code; RESEARCH.md's Code Examples / Common Pitfalls sections are the reference material, not an in-repo analog. |

## Metadata

**Analog search scope:** `lib/geometry/`, `lib/models/`, `components/design/`, `components/rails/`, `components/volume/`, `components/outline/`, `components/summary/`, `components/site-nav.tsx`
**Files scanned:** 14 read in full or targeted sections this session (`board.ts`, `outline-drag.ts`, `design.ts`, `rail-bands.ts` partial, `design-snapshot.ts`, `units.ts`, `design-store.tsx` partial, `volume-controls.tsx` partial, `outline-editor.tsx` grep + targeted, `site-nav.tsx` partial, `order-form.tsx` grep) plus CONTEXT.md/RESEARCH.md (already exhaustively cite `outline.ts`, `volume.ts`, `rail-bands.ts`, `Rails.dc.html`, `GEOMETRY-MODULE.md`)
**Pattern extraction date:** 2026-08-29
