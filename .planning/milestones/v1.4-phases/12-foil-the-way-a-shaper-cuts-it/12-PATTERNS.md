# Phase 12: Foil the Way a Shaper Cuts It - Pattern Map

**Mapped:** 2026-09-26
**Files analyzed:** 18 (from 12-RESEARCH.md "Recommended Project Structure (files touched)" + 12-UI-SPEC.md component names)
**Analogs found:** 18 / 18 (most are in-place modifications; the file itself is its own pattern)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/geometry/blank.ts` (TipStyle, deckSkin, tipStyle; `extraCenterThickness` -> `planerMaxDepth`) | model/types | transform | itself | exact |
| `lib/geometry/blank-fit.ts` (boardOnBlank derivation replaced, lines ~239-291) | utility (pure geometry) | transform | itself; RESEARCH Pattern 1 sketch | exact |
| `lib/geometry/board-profile.ts` (foamOffDeck/foamOffBottom, centerGap) | utility | transform | itself | exact |
| `lib/geometry/phase11-foil.ts` NEW (legacy proportional thickness, D-07 only) | utility (legacy converter) | transform | `lib/geometry/rocker.ts:403-420` `bezierToFiveStations` | exact (role: kept-old-math-for-migration) |
| `lib/geometry/blank-reasons.ts` | utility (copy strings) | transform | itself | exact |
| `lib/geometry/measure-display.ts` (planerPasses, formatPasses) | utility | transform | `formatMark`/`formatDim` in same file (lines 63-131) | exact |
| `lib/geometry/__fixtures__/phase11-foil-golden.json` NEW | fixture | generated | `lib/geometry/__fixtures__/prototype-*-golden.json` | exact |
| `scripts/extract-phase11-foil-golden.ts` NEW | script | batch/file-I/O | `scripts/generate-preset-blanks.ts` (tsx, no npm script) + `scripts/extract-prototype-volume-golden.mjs` (golden header rules) | exact |
| `lib/models/design-snapshot.ts` (version 5, blank.deckSkin/tipStyle carry-over) | model | transform (parse/migrate) | itself: v3->v4 rocker migration, lines 300-345 | exact |
| `lib/fit-defaults-preference.ts` | model/preference | CRUD | itself | exact |
| `lib/db/schema.ts` | model | CRUD | itself lines 75-88 | exact |
| `lib/db/queries.ts` | service | CRUD | itself ~line 90-105 | exact |
| `drizzle/0006_*.sql` NEW | migration | batch | `drizzle/0005_fit_defaults.sql` | exact |
| `lib/blanks/preset-blanks.ts` | service | transform | itself | exact |
| `components/design/design-store.tsx` | store | event-driven | itself | exact |
| `components/rocker/{rocker-controls,board-on-blank,rocker-datasheet,rocker-viewer,blank-flag,use-blank-list}` | component/hook | request-response | themselves; settings-destructure pattern at `blank-flag.tsx:133-155`, `use-blank-list.ts:110-114` | exact |
| `components/fit-defaults-dialog.tsx` | component | CRUD (preference) | itself, FIELD_COPY/GROUPS lines 45-80 | exact |
| Tip-style control (Pin deck / Bottom) | component | event-driven | `components/viewer/two-option-toggle.tsx` as used in `components/rails/rail-instructions.tsx:19,135` | exact |

## Pattern Assignments

### `lib/geometry/phase11-foil.ts` (NEW legacy converter)
**Analog:** `lib/geometry/rocker.ts:403-420`
```ts
/**
 * Converts a version-3 saved board's three-knot Bezier rocker into the five-station fallback
 * (Phase 11, the v3 -> v4 migration input): ...
 */
export function bezierToFiveStations(spec: RockerSpec, length: Mm): FiveStationRocker {
  const geometry = buildRocker(spec, length);
  ...
}
```
Copy: a doc-comment that says which version's shape it reads and why it survives; pure, branded `Mm` in/out, no React/DB imports (Rule 1). Only caller should be `design-snapshot.ts` parse path (D-07), mirroring how `bezierToFiveStations` is only called from `parseSnapshot`.

### `lib/geometry/blank-fit.ts` (derivation replacement)
Use RESEARCH.md Pattern 1 (lines 196-240 of 12-RESEARCH.md) verbatim as the body: keep `u`, `onFoam`, `crop`, `blankThicknessAt`, `blankWidthAt`, fine-tune humps, `offsetAt`, `TIP_EASE_WINDOW_MM`, `smoothstep` unchanged; replace `underCentre/ratio/scaledTail/scaledNose` block and `guard`. Callers that destructure settings (`blank-flag.tsx:133`, `use-blank-list.ts:110`) must swap `extraCenterThickness` for `planerMaxDepth` in the destructure AND the `useMemo` dependency arrays:
```ts
const { extraLength, extraCenterThickness, widthMargin } = settings;
() => listBlanks(catalogue.prepared, ctx, { extraLength, extraCenterThickness, widthMargin }),
[catalogue.prepared, ctx, extraLength, extraCenterThickness, widthMargin],
```
Other `extraCenterThickness` sites to rename: `lib/geometry/blank.ts`, `blank-reasons.ts` (+test), `blank-fit.test.ts`, `blank-flag.tsx:180,199`, `fit-defaults-dialog.tsx:55,70`.

### `lib/models/design-snapshot.ts` (version 4 -> 5)
**Analog:** itself. `DESIGN_SNAPSHOT_VERSION = 4` at line 80; migration pattern at lines 312-345:
```ts
function isBezierV3Rocker(rocker: object): boolean {
  return "noseLift" in rocker;
}
export function parseSnapshot(value: unknown): DesignSnapshotFields {
  const parsed = designSnapshotSchema.parse(value);
  const design = parsed.design;
  const outline = (design.outline ?? DEFAULT_BOARD_SPEC.outline) as OutlineSpec;
  const rocker: FiveStationRocker = !design.rocker
    ? bezierToFiveStations(DEFAULT_ROCKER_SPEC, outline.length)
    : isBezierV3Rocker(design.rocker) ? bezierToFiveStations(...) : (design.rocker as FiveStationRocker);
```
Copy: detect old shape by a field presence (`"deckSkin" in blank` absent -> v4), fill via the legacy module, extend the numbered version history in the module doc-comment (lines ~19-55), `.partial()` tolerance (line 251) for new optional fields, `version: z.number()` untouched.

### `lib/fit-defaults-preference.ts`
**Analog:** itself. Every key appears in six parallel tables which must all change together: `FitDefaultsKey` union (l.29-34), `FIT_DEFAULTS_KEYS` (l.37-43), `DEFAULT_FIT_DEFAULTS` (l.56-62, `inchesToMm(...)`), `FIT_DEFAULTS_RANGE_IN` (l.70-76, inches, 1/16 steps, `satisfies Record<FitDefaultsKey, ...>`), `EMPTY_FIT_DEFAULTS_PREFERENCE` (l.81-87), `FIT_DEFAULTS_COLUMNS` (l.169-175), and `toFitSettings` (l.219-225, structurally mirrors `FitSettings` in `blank.ts`).

### `lib/db/schema.ts` + `drizzle/0006_*.sql`
**Analog:** `schema.ts:75-88`, `drizzle/0005_fit_defaults.sql`
```ts
extraCenterThicknessMm: doublePrecision("extra_center_thickness_mm"),
```
```sql
ALTER TABLE "user_preferences" ADD COLUMN "extra_length_mm" double precision;--> statement-breakpoint
```
Generate with `npm run db:generate`, never hand-write. Nullable `double precision`, `*_mm` suffix. CLAUDE.md ordering: an added nullable column migrates production BEFORE deploy; a removed/renamed column (retiring `extra_center_thickness_mm`) only AFTER the deploy — so do not drop the old column in 0006; leave it unread.

### `lib/db/queries.ts`
Pattern ~l.94-103: select column, then `parseFitDefaultValue("key", row?.colMm ?? null)`. Add the new key in the same two places.

### `scripts/extract-phase11-foil-golden.ts` (NEW)
**Analog:** `scripts/generate-preset-blanks.ts:1-25` header:
```ts
/**
 * GENERATED FILE PRODUCER — writes lib/...json ... The output is generated and must never be hand-edited; re-run this script.
 *   npx --no-install tsx --tsconfig ./tsconfig.json scripts/generate-preset-blanks.ts
 * (D-20: nothing in package.json — no npm script ...)
 * ... Running it twice writes the same bytes.
 */
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
```
Plus the "executes the original code, never hand-transcribed" rule from `scripts/extract-prototype-volume-golden.mjs:1-10`. Run once against tag v1.3 code (per RESEARCH), fixture under `lib/geometry/__fixtures__/`.

### `components/fit-defaults-dialog.tsx`
Pattern l.45-80: `FIELD_COPY: Record<FitDefaultsKey, {label, hint?}>` and `GROUPS` listing keys. Swap `extraCenterThickness` row for the new planer setting, copy from 12-UI-SPEC.md.

### Tip-style control
**Analog:** `components/viewer/two-option-toggle.tsx:13-21`
```ts
export interface TwoOptionToggleProps<T extends string> { ... }
export function TwoOptionToggle<T extends string>({ options, labels, value, onChange, className = "" }: TwoOptionToggleProps<T>)
```
Usage example: `components/rails/rail-instructions.tsx:19` (import `@/components/viewer/two-option-toggle`) and `:135`. Value flows through `design-store.tsx` actions like other blank fields.

### `lib/geometry/measure-display.ts` (planerPasses, formatPasses)
Follow `formatMark(value: Mm, system: UnitsSystem): string` (l.81) — take `system`, route unit conversion through `units.ts` only (Rule 2), no literal 25.4.

## Shared Patterns
- **Rule 1 purity:** all new math in `lib/geometry/` with `*.test.ts` beside it; expected values from generated fixtures only.
- **Branded units:** `Mm`, `inchesToMm`, `mm()` from `lib/geometry/units.ts`; display via `measure-display.ts` formatters (Dims vs Marks families).
- **Rename sweep:** `grep -rn extraCenterThickness lib components` returns 14 files — all must move to `planerMaxDepth` in one plan to keep typecheck green.

## No Analog Found
None — every file is either modified in place or has a direct predecessor (Phase 11 did the same shape of change: snapshot bump, fit-defaults columns, migration 0005, generator script).

## Metadata
**Search scope:** lib/, components/, scripts/, drizzle/
**Files scanned:** ~20
