# Phase 11: Rocker from Real Blanks - Pattern Map

**Mapped:** 2026-09-26
**Files analyzed:** 30 (new + modified, from 11-CONTEXT.md "Code this phase changes or extends" and 11-RESEARCH.md "Recommended Project Structure")
**Analogs found:** 28 / 30

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/blanks/csv.ts` (new) | utility | transform | none in repo (RFC-4180 reader) | no analog |
| `lib/blanks/catalog.ts` (new) | utility | transform (inches -> Mm once) | `lib/geometry/foil.ts` (`DEFAULT_FOIL_SPEC` via `inchesToMm`) | partial |
| `lib/blanks/preset-blanks.generated.json` (new) | fixture | generated | `lib/geometry/__fixtures__/*-golden.json` | exact (by process) |
| `lib/geometry/pchip.ts` (new, replaces monotone-spline.ts) | utility (pure math) | transform | `lib/geometry/monotone-spline.ts` + `.test.ts` | exact |
| `lib/geometry/blank.ts` (types) | model | - | `lib/geometry/board.ts`, `FoilSpec` in `foil.ts` | role-match |
| `lib/geometry/blank-fit.ts` | utility (pure math) | transform | `lib/geometry/foil.ts` / `rocker.ts` | role-match |
| `lib/geometry/blank-reasons.ts` | utility | transform (both systems) | `lib/geometry/measure-display.ts` | role-match |
| `lib/geometry/board-profile.ts` | utility | transform | `foil.ts` `sampleFoil` + `rocker.ts` `sampleRocker` | role-match |
| `lib/geometry/rocker.ts` (modify: FiveStationRocker + keep legacy for migration) | utility | transform | itself (`migrateLegacyRocker`, line 355) | exact |
| `lib/geometry/measure-display.ts` (+ `formatSignedMark`) | utility | transform | existing `formatMark` in same file | exact |
| `lib/geometry/foil.ts`, `volume.ts`, `presets.ts`, `preset-source.ts` (modify) | utility | transform | themselves | exact |
| `lib/models/design-snapshot.ts` (v3 -> v4) | model/boundary | validate+migrate | itself (v3 legacy-rocker union) | exact |
| `lib/db/schema.ts` (+ `blanks`, + 5 nullable pref columns) | model | CRUD | itself (`models`, `userPreferences`) | exact |
| `drizzle/0004_*.sql`, `drizzle/0005_*.sql` | migration | - | `drizzle/0002_*.sql`, `drizzle/0003_*.sql` | exact |
| `lib/db/blanks.ts` (`loadPickableBlanks`, public, unscoped) | service | read | `lib/db/queries.ts` `readUnitsPreference` | role-match (deliberately outside queries.ts) |
| `lib/db/queries.ts` (+ `readFitDefaultsPreference`) | service | read | `readPrintRailInstructionsPreference` (lines 70-75) | exact |
| `lib/db/ownership.test.ts` (extend) | test | source-contract | itself | exact |
| `lib/fit-defaults-preference.ts` (+ test) | utility | parse/cookie/handoff | `lib/units-preference.ts`, `lib/print-instructions-preference.ts` | exact |
| `lib/fit-defaults-server.ts` | service | request-response | `lib/units-server.ts` | exact |
| `app/actions/fit-defaults.ts` | server action | request-response (upsert) | `app/actions/units.ts` | exact |
| `components/fit-defaults-provider.tsx` | provider | event-driven (external store) | `components/units-provider.tsx`, `components/print-instructions-provider.tsx` | exact |
| `components/fit-defaults-dialog.tsx` | component | request-response | `components/setup/rename-dialog.tsx` | role-match |
| `components/settings-menu.tsx` (+ menu row) | component | event-driven | itself (`UnitsRow`, lines 191-216) | exact |
| `scripts/seed-blanks.ts` | script | batch | `scripts/extract-prototype-golden.mjs` (shape) + `app/actions/units.ts` (upsert) | partial |
| `scripts/generate-preset-blanks.ts` | script | file-I/O | `scripts/extract-prototype-*-golden.mjs` | role-match |
| `components/design/design-store.tsx` (modify) | store | state | itself (`applyPreset`, `DEFAULT_DESIGN_STATE`) | exact |
| `components/rocker/rocker-editor.tsx`, `rocker-controls.tsx`, `rocker-datasheet.tsx`, `rocker-viewer.tsx`, `rocker-view-frame.ts` (rebuild) | component | event-driven | themselves + `components/design/slider-row.tsx`, `measure-field.tsx`, `components/viewer/tabbed-panel.tsx` | exact |
| `components/summary/order-form.tsx` (ROCKER box) | component | render | itself | exact |
| `e2e/phone-*.spec.ts` / `e2e/touch-drag.spec.ts` (rewrite rocker drag tests) | test | e2e | `e2e/touch-drag.spec.ts` (tip-handle tests lines 575-699) | exact |
| `lib/auth/open-access.test.ts` (keep green) | test | source-contract | itself | exact |

## Pattern Assignments

### `lib/geometry/pchip.ts` (pure math) — analog `lib/geometry/monotone-spline.ts`

Keep the header convention (lines 1-16: purpose, why monotone, "No React/browser/database import ... per CLAUDE.md Rule 1") and the `SplinePoint {x,y}` type (lines 19-22). Only the tangent rule changes: current `threePointTangent` (lines 31-43) is already the weighted-harmonic pchip interior formula; `monotoneSlopes` (line 52+) adds the Fritsch-Carlson circle clamp — pchip replaces that clamp with pchip's end-point rule. Evaluator (past-end clamping, non-finite guard) stays:
```typescript
function threePointTangent(hBefore, hAfter, secantBefore, secantAfter): number {
  if (secantBefore === 0 || secantAfter === 0) return 0;
  if (secantBefore > 0 !== secantAfter > 0) return 0;
  const hs = hBefore + hAfter;
  const w1 = (hBefore + hs) / (3 * hs);
  const w2 = (hs + hAfter) / (3 * hs);
  return 1 / (w1 / secantBefore + w2 / secantAfter);
}
```
Tests: extend `lib/geometry/monotone-spline.test.ts`'s no-overshoot suite into `pchip.test.ts`. Callers to repoint: `foil.ts` `sampleFoil` (lines 89-95), `rocker.ts`.

### `lib/geometry/blank-fit.ts`, `board-profile.ts`, `blank.ts` — analog `lib/geometry/foil.ts`

Pattern: branded `Mm` in/out, rebuild points fresh, no caching, defaults built with `inchesToMm` (foil.ts lines 55-95):
```typescript
export function sampleFoil(spec: FoilSpec, length: Mm, station: Mm): Mm {
  const points: SplinePoint[] = foilStationPoints(spec, length).map((p) => ({
    x: p.station, y: p.thickness,
  }));
  return mm(sampleMonotoneSpline(points, station));
}
```
Station positions reuse `rockerStationPositions(length)` (rocker.ts line 337) — one definition of the five stations. Range constants follow `FOIL_THICKNESS_RANGE_IN = { min, max, step } as const` (foil.ts:38). Every export gets a colocated `*.test.ts`; expected values from script-generated fixtures only.

### `lib/geometry/rocker.ts` (FiveStationRocker + legacy) — self
Keep `RockerSpec`/`migrateLegacyRocker` (line 355) only as a migration input; the new fallback type mirrors `FoilSpec`'s five keys (`RockerStationKey`, line 55).

### `lib/models/design-snapshot.ts` (v3 -> v4) — self
Bump `DESIGN_SNAPSHOT_VERSION = 3` (line 53). Copy the union + detector + migrate pattern:
```typescript
const rockerSpecSchema = z.union([currentRockerSpecSchema, legacyRockerSpecSchema]); // line 101
function isLegacyRocker(rocker: unknown): rocker is {...} {
  return typeof rocker === "object" && rocker !== null && "nose12" in rocker;
}
// parseSnapshot (241+):
const rocker = design.rocker
  ? isLegacyRocker(design.rocker) ? migrateLegacyRocker(design.rocker) : (design.rocker as RockerSpec)
  : DEFAULT_ROCKER_SPEC;
```
New optional fields (blank pick, placement, etc.) backfill via `design.x ?? DEFAULT_X` in the return block (lines 255-266); the `.partial()` top level (line ~172) is the tolerance mechanism. The v3 eight-field Bezier shape becomes a *third* union member migrated to the five-station fallback (D-14). Update the module doc-comment's numbered rules.

### `lib/db/schema.ts` + `drizzle/0004`, `0005` — self
Imports line 24 (add `doublePrecision`, `integer`, `uniqueIndex`). Table style from `models` (lines 26-37) — third arg returns an index array. Preference columns follow `userPreferences` (41-47): **nullable, no `.notNull()`, no `.default()`** ("hasn't chosen yet" is a state). Extend the header doc-comment. Migrations via `npm run db:generate`; `0003` is a single `ALTER TABLE "user_preferences" ADD COLUMN "print_rail_instructions" boolean;` — 0005 is five of those.

### `lib/db/queries.ts` (+ `readFitDefaultsPreference`) — analog lines 57-75
```typescript
export async function readPrintRailInstructionsPreference(clerkId: string): Promise<boolean | null> {
  const [row] = await db.select({ printRailInstructions: userPreferences.printRailInstructions })
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, clerkId));
  return parsePrintRailInstructionsPreference(row?.printRailInstructions ?? null);
}
```
Each column goes through the allow-list parser from `lib/fit-defaults-preference.ts`.

### `lib/db/blanks.ts` — public read, NOT in queries.ts
Reason: `ownership.test.ts` lines 119-151 require every `db.select|insert|update|delete` in `queries.ts` (and the action files) to match `eq(<table>.clerkUserId, ...)` or set `clerkUserId:` on insert. An unscoped blank read would fail that test, so it lives in its own file. Add a new ownership-test case asserting `lib/db/blanks.ts` only ever `db.select`s from `blanks` (no insert/update/delete, no user tables).

### `lib/db/ownership.test.ts` — self
Add `FIT_DEFAULTS_ACTIONS_PATH` next to line 17, include its source in: the auth-before-db test (line 66), a new "exports exactly the expected action" test (copy lines 106-118), and the owned-table loop (lines 120-125).

### `lib/fit-defaults-preference.ts` — analog `lib/units-preference.ts` / `lib/print-instructions-preference.ts`
Copy: storage-key + cookie-name constants, one-year max-age (units lines 23-28); `parseX(value: unknown): T | null` allow-list that never defaults (36-40); `resolveX` as the one place the default applies (43-45); `xCookieString` (52-54, no Secure, no HttpOnly, SameSite=Lax); `readXCookie` header parser (61-77, try/catch on decodeURIComponent); handoff via the generic in `lib/preference-handoff.ts`:
```typescript
const result = decidePreferenceHandoff<UnitsSystem>({ ...input, fallback: DEFAULT_UNITS_SYSTEM });
```
RESEARCH says per-field handoff — call `decidePreferenceHandoff` once per field (it is generic `T`, lines 43-61). Write queue: `createPreferenceWriteQueue` / `PREFERENCE_WRITE_RETRY_DELAYS_MS` (preference-handoff.ts 71-121). Test file analog: `lib/print-instructions-preference.test.ts`.

### `lib/fit-defaults-server.ts` — analog `lib/units-server.ts` (whole file, 40 lines)
```typescript
export async function resolveUnitsHandoff(): Promise<UnitsHandoff> {
  const { userId } = await auth();
  const cookieStore = await cookies();
  const browser = parseUnitsPreference(cookieStore.get(UNITS_COOKIE_NAME)?.value ?? null);
  let account = null;
  if (userId) {
    try { account = await readUnitsPreference(userId); }
    catch (error) { console.error("Shaper: failed to read units preference", error); account = null; }
  }
  return decideUnitsHandoff({ signedIn: userId !== null, account, browser });
}
```
The try/catch is load-bearing: code ships before `db:migrate:prod`, so the columns may not exist yet. Wire into `app/layout.tsx` beside `resolveUnitsHandoff()`.

### `app/actions/fit-defaults.ts` — analog `app/actions/units.ts` (whole file)
```typescript
"use server";
export async function saveUnitsPreference(system: UnitsSystem): Promise<void> {
  const { userId } = await auth();
  if (!userId) return;                         // signed-out = quiet no-op
  if (!(UNITS_SYSTEMS as readonly string[]).includes(system)) return; // allow-list
  await db.insert(userPreferences)
    .values({ clerkUserId: userId, units: system })
    .onConflictDoUpdate({ target: userPreferences.clerkUserId, set: { units: system, updatedAt: new Date() } });
}
```
No user id in params; no `revalidatePath`; exactly one export.

### `components/fit-defaults-provider.tsx` — analog `components/units-provider.tsx`
Imports lines 28-47 (`useSyncExternalStore`, action import from `@/app/actions/...`, lib preference helpers). External-store block lines 49-76 (listener set, `storage` event cross-tab sync, try/catch around localStorage for Safari private mode). Context + `handoff` prop (80-90+): server snapshot must equal what the server rendered. Also compare `components/print-instructions-provider.tsx` (the second instance).

### `components/fit-defaults-dialog.tsx` — analog `components/setup/rename-dialog.tsx`
Imports `Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle` from `@/components/ui/dialog`, `Button`, `Input`; props `{ open, onOpenChange, ... }`; local `error`/`saving` state; the render-phase `wasOpen` reset (not an effect) to re-arm on open. Use `MeasureField` for any length inputs (never raw 25.4).

### `components/settings-menu.tsx` — self
Rows are `Menu.RadioItem` inside `Menu.RadioGroup` (lines 53-70, `UnitsRow` 191-216) in the factored popup content (comment at line 43). A plain action row that opens the dialog sits in the same popup content; reads through the provider hook the way `useUnits()` is read at line 53.

### `components/rocker/*` rebuild — shared controls
- `SliderRow` (`components/design/slider-row.tsx` lines 16-75): props `label, displayValue?, value, min, max, step, onValueChange, disabled?, leftHint?, rightHint?, note?, density`; each call site does its own unit conversion via `measureSlider`.
- `MeasureField` (`components/design/measure-field.tsx` 41-75): `value: Mm, onCommit, label, family: "dim"|"mark"|"length", min, max, system, bare?, disabled?` — `bare` for datasheet table cells; bounds from the same `measureSlider` result.
- VIEWER/DATASHEET tabs: `components/viewer/tabbed-panel.tsx`; callouts: `callout-primitives.tsx`; shell: `design-screen-shell.tsx`. Keep Phase 9 D-18 (nose-up on phone, 66dvh ceiling) in `rocker-view-frame.ts`; its 1593-line test is the regression net.
- Import-or-manual idiom (blank pick vs five-station fallback) copies `finsImportTemplate` / `railsImportFoilThickness` in `design-store.tsx` and snapshot.

### `scripts/seed-blanks.ts`, `scripts/generate-preset-blanks.ts` — analog `scripts/extract-prototype-golden.mjs`
Header lines 1-6 ("GENERATED FILE PRODUCER ... never hand-edited; re-run npm run ..."), `repoRoot` via `fileURLToPath(import.meta.url)` (11-12), fail loudly with a specific `throw new Error(...)` when input is missing (22-27), `writeFileSync` to the fixture path. Seed: single `db.insert(blanks).values(records).onConflictDoUpdate({ target: [blanks.vendor, blanks.name], set: {...excluded...} })` (neon-http has no interactive transactions — RESEARCH Pattern 1). Add npm scripts beside `golden`.

### E2E rewrites — analog `e2e/touch-drag.spec.ts`
Imports `{ expect, test, type Page } from "@playwright/test"`; helpers `findEmptyCanvasProbe` (34), `findInteriorBoardPoint` (108); the retired rocker tip-drag cases are lines 575-699 ("a tap picks the nose tip handle ...", readout-card clearance tests) — replace with blank pick/placement tests. Phone layout assertions: `e2e/phone-screens.spec.ts`, `phone-rails.spec.ts` (settle-wait recipe). `e2e/desktop-baseline.spec.ts` snapshots for other screens must not move.

## Shared Patterns

### Auth-first server writes
**Source:** `app/actions/units.ts`; enforced by `lib/db/ownership.test.ts` lines 66-151. **Apply to:** `app/actions/fit-defaults.ts`, any new query. `await auth()` before any `db.` call; never accept userId/ownerId/clerkUserId params; every owned-table statement scopes on `eq(x.clerkUserId, ...)`.

### Degrade-don't-break reads
**Source:** `lib/units-server.ts` try/catch -> null. **Apply to:** `fit-defaults-server.ts`, `lib/db/blanks.ts` callers (a missing `blanks` table before prod migration must render the fallback five-station rocker, not an error).

### Units boundary
**Source:** `lib/geometry/units.ts` + `measure-display.ts` (`formatMark`, `formatDim`, `measureSlider`, `commitTypedMeasure`). **Apply to:** catalog loader (CSV inches -> Mm once), every rocker sidebar number, reasons strings. Rocker heights/foil stations are **marks** (whole mm); length/width are **dims** (cm 1dp).

### Tolerate-and-migrate
**Source:** `design-snapshot.ts` `parseSnapshot`. **Apply to:** v4 snapshot, and `applyPreset` rebuilding from `DEFAULT_DESIGN_STATE`.

### Goldens by script
**Source:** `scripts/extract-prototype-*-golden.mjs`. **Apply to:** `preset-blanks.generated.json`, any fixture pchip nudges (`blank-datasheet-golden.json`, `pinned-preset-outlines.ts` via `preset-source.ts`).

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `lib/blanks/csv.ts` | utility | transform | No CSV parsing exists; use RESEARCH.md's RFC-4180 rules (CRLF, doubled quotes, quoted commas, strict numeric parse) |
| `lib/db/blanks.ts` public-read posture | service | read | Every existing query is user-scoped; this is the first unscoped table — must be kept out of `queries.ts` and given its own ownership-test assertion |

## Metadata

**Analog search scope:** `lib/`, `lib/db/`, `lib/geometry/`, `lib/models/`, `app/actions/`, `components/`, `components/rocker/`, `components/design/`, `scripts/`, `drizzle/`, `e2e/`
**Files scanned:** ~35
**Pattern extraction date:** 2026-09-26
