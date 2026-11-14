# Phase 17: BOTTOM - Pattern Map

**Mapped:** 2026-11-08
**Files analyzed:** 40 (new and modified, counting the e2e specs as one row each group)
**Analogs found:** 38 / 40 (two are "no analog": the sketch reference copy's content, and the shade-band path joiner)

Scope read: 17-CONTEXT (D-01..D-39), 17-RESEARCH ("Recommended Project Structure", "Answers by question" A-L), 17-UI-SPEC sections 15 and 16. Excerpts below are copied from the worktree at the paths and lines given. Line numbers are from the files as of commit 3ed684fe.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `lib/geometry/bottom.ts` (new) | utility (pure maths + types) | transform | `lib/geometry/custom-rocker.ts` (spec types, starting values, normalise) + `lib/geometry/wings.ts` (`takeAt`/`fadeAt`) | role-match |
| `lib/geometry/bottom-draw.ts` (new) | utility (pure geometry for drawings) | transform | `lib/geometry/custom-rocker-art.ts`, `lib/geometry/blank-top-view.ts`, `lib/geometry/three-d-tile-art.ts` | role-match |
| `lib/geometry/bottom-print.ts` (new) | utility (paper words) | transform | `lib/geometry/custom-rocker-text.ts`, `overviewSpecLines` in `components/template/build-overview-pdf.ts:126-170` | role-match |
| `lib/geometry/bottom*.test.ts` (new) | test | golden + relation | `lib/geometry/custom-rocker.test.ts` (golden), `phase16-litres-pin.test.ts` (relation) | exact |
| `lib/geometry/phase17-litres-pin.test.ts` + `__fixtures__/phase17-litres-pin.json` (new) | test + fixture | pin | `lib/geometry/phase16-surface-litres-pin.test.ts` + `phase16-surface-litres-pin.json` | exact |
| `reference/sketches/021-bottom-maths.js` (new) | reference copy | n/a | `reference/sketches/016-custom-rocker-maths.js` | exact |
| `scripts/extract-sketch021-bottom-golden.mjs` (new) | script (golden) | batch | `scripts/extract-sketch016-custom-rocker-golden.mjs` | exact |
| `scripts/extract-phase17-litres-pin.ts` (new) | script (pin) | batch | `scripts/extract-phase16-litres-pin.ts` (and `-surface-` / `-live-` siblings) | exact |
| `app/design/bottom/page.tsx` (new) | route | request-response | `app/design/3d/page.tsx`, `app/design/rails/page.tsx` | exact |
| `components/bottom/bottom-editor.tsx` (new) | component (screen) | event-driven | `components/rails/rail-band-editor.tsx` | exact |
| `components/bottom/bottom-controls.tsx` (new) | component (side panel) | CRUD (store actions) | `components/rails/rail-controls.tsx` | exact |
| `components/bottom/bottom-top-view.tsx` (new) | component (SVG drawing + pointer drag) | event-driven | `components/rocker/rocker-top-view.tsx` (nose-left top view), `components/outline/outline-viewer.tsx:559-566,655-663` (drag) | role-match |
| `components/bottom/bottom-section.tsx` (new) | component (SVG) | transform | `components/rails/rail-section-plot.tsx` | role-match |
| `components/bottom/bottom-data.tsx` (new) | component (table) | transform | `components/rails/rail-data-table.tsx` | exact |
| `components/bottom/bottom-guide.tsx` + `bottom-cartoon.tsx` + guide words (new) | component | transform | `components/3d/three-d-copy.ts` (words in one module) + `components/rocker/custom-rocker-drawing.tsx` (art from lib) | partial |
| `lib/models/bottom-report.ts` + test (new) | utility (read-only report) | batch | `scripts/check-saved-boards.ts` and the 14-D-18 report | role-match |
| `lib/geometry/volume.ts` (modify: `foamOffAt` seam) | service (pure) | transform | its own wing "level variant" at `:1189-1196` (`movedOn`) | exact |
| `lib/geometry/design.ts` (modify: `designCrossSectionInput`, `DesignSummaryFields`) | utility | transform | its own `designCrossSectionInput` `:102-115` | exact |
| `lib/geometry/board-surface.ts` (modify: ring length for channel walls) | utility | transform | its own `placedHalfSection` `:239-247` | exact |
| `lib/geometry/rail-bands.ts` or caller (RAILS-only `railsOnTheBottom`) | utility | transform | `deriveEffectiveRails` `design.ts:191-203` (returns same object when off) | exact |
| `lib/geometry/fins.ts` (add `frontFinStation` read) | utility | transform | `FinMark`/`FinRole` `fins.ts:83,177-188` | exact |
| `lib/geometry/wings.ts` (add `narrowestOutlineAt`) | utility | transform | `wingTakeAt`/`takeAt` `:453-461` with private `prepare`/`fadeAt` | exact |
| `lib/geometry/screen-tiles.ts` (modify: `"bottom"` kind + line) | utility | transform | its own `ScreenTileKind`/`screenTileLines` `:255-275` | exact |
| `lib/geometry/three-d-tile-art.ts` sibling `bottomTileArt` (new) | utility | transform | `threeDTilePicture` | role-match |
| `lib/models/design-snapshot.ts` (modify: `bottom` optional field) | model (schema) | CRUD | `withoutUnreadWings` `:635-640`, `designFieldsSchema` `:514-528` | exact |
| `components/design/design-store.tsx` (modify: state, actions, snapshot) | store | CRUD + undo | `updateRailSection` `:871`, `noteEdit` `:746`, `designSnapshotFields` `:1500` | exact |
| `components/site-nav.tsx` (modify `NAV_LINKS`, gap class) | config | n/a | itself `:31-39` | exact |
| `components/design/screen-tiles.tsx` (modify `TILE_KIND`, grid) | component | transform | itself `:64-72`, `:263` | exact |
| `components/design/phone-menu.tsx`, `lib/screen-steps.ts` (+test), `step-nav` | component/util | n/a | themselves | exact |
| `components/fins/fin-viewer.tsx` (modify: draw contour in tail) | component | transform | itself `:43-45`, `:663-664` | exact |
| `components/summary/order-form.tsx` + `order-form.css` (BOTTOM CONTOURS page) | component | transform | the Rail Band Instructions sheet (`sheetCount` `:262`) | exact |
| `components/template/build-overview-pdf.ts` (modify `overviewSpecLines`) | utility | transform | the wings rows `:158-163` | exact |
| `e2e/helpers/screens.ts` and the seven-count specs | test (e2e) | n/a | themselves | exact |
| `e2e/bottom-screen.spec.ts`, `phone-bottom.spec.ts`, `bottom-guide.spec.ts` (new) | test (e2e) | n/a | `e2e/rocker-top-view.spec.ts`, `e2e/phone-rails.spec.ts` | role-match |
| `components/design/board-lock-scope.test.ts` | test | n/a | itself (control inventory) | exact |
| `lib/geometry/rack-models` / `summarizeDesign` callers | utility | transform | `rackBoardFigures` (`rack-models.ts:55-58`) | exact |
| Hand-lists in `e2e/contact.spec.ts`, `privacy.spec.ts`, `site-footer.spec.ts`, ... | test | n/a | themselves | exact |
| CLAUDE.md Layout wording ("seven" to "eight"), `.claude/skills/sketch-findings-shaper/references/phone-chrome.md` | docs | n/a | themselves | exact |

## Pattern Assignments

### `reference/sketches/021-bottom-maths.js` (reference copy)

**Analog:** `reference/sketches/016-custom-rocker-maths.js`

Header, then the two globals the copied lines read, then the byte-for-byte block between marker comments, then `module.exports`. For 021 the globals are `DATA` (`let DATA = { U: [], boards: [] };`) and whatever `state` the lines read. 016's file layout:

```js
/*
 * REFERENCE COPY — never edited.
 * ... copied byte for byte from the sketch's archive (... template.html, SHA-1 ff1b6d...) ...
 * It is run only by scripts/extract-sketch016-custom-rocker-golden.mjs ... The app never imports it.
 * Do not edit anything between the two marked lines below.
 */
// ---- NOT from the sketch: the two globals the copied lines read (the sketch's DATA and state). ----
let DATA = {};
let state = { board: null, units: "imperial", rocker: { nose: [], tail: [] } };
// ---- BEGIN template.html lines 312, 314–315, ... (byte for byte) ----
...
module.exports = { setData(d) { DATA = d; }, use(board, units) { state.board = board; state.units = units; }, fracIn, ..., delta, floorOf };
```

Per RESEARCH L: 021's header names template.html SHA-1 `53cbf011a3144c40185da1e10e651751133375bf`, lines 326-553, `use(id, units, wingRule)`, and exports `setData`, `use`, `state`, `B`, `makeCut`, `foamOff`, `litresOff`, etc.

### `scripts/extract-sketch021-bottom-golden.mjs` (script, batch)

**Analog:** `scripts/extract-sketch016-custom-rocker-golden.mjs` (lines 1-164)

**Imports + require of the reference copy** (lines 42-56):
```js
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { presetDesignFields } from "../lib/blanks/preset-blanks.ts";
import { BOARD_PRESETS } from "../lib/geometry/presets.ts";
import { mm, mmToInches } from "../lib/geometry/units.ts";
const ROOT = process.cwd();
const OUT = path.resolve(ROOT, "lib/geometry/__fixtures__/custom-rocker-golden.json");
const REFERENCE = "reference/sketches/016-custom-rocker-maths.js";
const require = createRequire(import.meta.url);
const sketch = require(path.resolve(ROOT, REFERENCE));
```

**Core pattern** (lines 90-123): build the sketch's `DATA` from the APP (never typed), `sketch.setData(...)`, loop `sketch.use(board, units)`, call the sketch's own functions, push into `cases`. Guard assertions that refuse to run if an assumption stops holding (`throw new Error(...)` at line 87-89). Header comment lists "fixture keys". Run command line: `npx --no-install tsx --tsconfig ./tsconfig.json scripts/<name>.mjs` from the repo root.

**Output** (lines 148-163): a `provenance` object (`sketch`, `sketchSha1`, `reference`, `producer: "... never hand-edit; re-run the script"`), a `units` string, then `writeFileSync(OUT, JSON.stringify(golden, null, 2) + "\n")`. "Running it twice writes the same bytes."

**Differences for 021 (from RESEARCH L):** sample arrays at 4,801 stations at full precision (no 0.1 mm rounding); `fin`/`toeDeg` come from the store's chain (Import Template ticked, raw angle), not `board-data.ts`; boards are the four presets (`phase16Boards()` `asis`) plus the winged Fish; the `.mjs` imports `.ts` files with explicit extensions exactly as 016's does.

### `scripts/extract-phase17-litres-pin.ts` (script, batch)

**Analog:** `scripts/extract-phase16-litres-pin.ts` (50 lines); for the 102-board set copy `scripts/extract-phase16-surface-litres-pin.ts` (uses `phase16SurfaceBoards()`).

**Whole pattern** (lines 15-50): refuse-to-run guard, label to `toPrecision(17)` map, provenance string, write, per-board console line:
```ts
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { phase16Boards } from "@/lib/geometry/__fixtures__/phase16-boards";
import { summarizeDesign } from "@/lib/geometry/design";
import * as volume from "@/lib/geometry/volume";
const OUTPUT = path.resolve(process.cwd(), "lib/geometry/__fixtures__/phase16-litres-pin.json");
function main() {
  if (!existsSync(path.resolve(process.cwd(), "lib/geometry/volume.ts"))) throw new Error("Run this from the repository root ...");
  if ("boardSections" in volume) throw new Error("the pin records the litres from before boardSections existed — it is never re-run");
  const litres: Record<string, string> = {};
  for (const board of phase16Boards()) litres[board.label] = summarizeDesign(board.fields).volumeLitres.toPrecision(17);
  const provenance = "GENERATED by scripts/extract-phase16-litres-pin.ts from the app as it stood before boardSections ... never hand-edit, never re-run";
  writeFileSync(OUTPUT, `${JSON.stringify({ provenance, litres }, null, 2)}\n`);
```
For 17: swap `phase16Boards` for `phase16SurfaceBoards`, the guard becomes "refuses once `volume.ts` accepts `foamOffAt`" (grep the file text, or check a new export such as `bottomedHalf`), and the provenance says "before the bottom seam". Run it in the plan's FIRST task, before `volume.ts` is touched (RESEARCH F, L; the 102 values already exist in scratch as `phase17-live-litres-now.json` for a cross-check, key shape `"shortboard|asis|hard"`).

### `lib/geometry/phase17-litres-pin.test.ts` (test, pin)

**Analog:** `lib/geometry/phase16-surface-litres-pin.test.ts` (lines 1-40) and `phase16-litres-pin.test.ts` (lines 1-68).

**Pattern** (`phase16-litres-pin.test.ts:28-50`):
```ts
const PIN = pin as { provenance: string; litres: Record<string, string> };
const BOARDS = phase16SurfaceBoards();
describe("... pinned before the seam", () => {
  it("the pin holds the boards the set builds, and names its generator", () => {
    expect(Object.keys(PIN.litres)).toEqual(BOARDS.map((board) => board.label));
    expect(BOARDS).toHaveLength(102);
    expect(PIN.provenance).toContain("GENERATED by scripts/extract-phase17-litres-pin.ts");
  });
  for (const board of BOARDS) {
    it(`${board.label}: ...reproduces the pinned litres to the last digit`, () => {
      const litres = summarizeDesign(board.fields).volumeLitres;
      expect(litres.toPrecision(17)).toBe(PIN.litres[board.label]);
    });
  }
});
```
Run it three ways (RESEARCH L): no `bottom`, `DEFAULT_BOTTOM`, and a bottom with flat sections + channels count 0 but non-default numbers. Add the second block of `phase16-litres-pin.test.ts:52-68` (station-for-station area equality via `Object.is(section.area, volume.stationAreas[i])`) with the seam present and `foamOffAt` absent or f ≡ 0. No typed figures.

### `lib/geometry/bottom.test.ts` (golden relation test)

**Analog:** `lib/geometry/custom-rocker.test.ts` imports `golden from "./__fixtures__/custom-rocker-golden.json"` (line 5) and compares function output to the golden at every case; helper `presetCopy(id)` (lines 49-55) pulls a board from `BOARD_PRESETS`. Copy: import the JSON, loop `golden.cases`, assert within a stated tolerance (RESEARCH L: `foamOff` vs golden within 1e-9 mm). Probe one cut with `cutFoamOff`, never the total (the sketch's lesson).

### `lib/geometry/bottom.ts` (utility, transform)

**Analog 1:** `lib/geometry/custom-rocker.ts` (spec type stored in one place, `normalizeSpec`, `ROCKER_KNOT_STEP_MM`, `floorOf`, `sameRockerSpec`, draft helpers) — shows how a stored spec, its floor and its normaliser sit together in `lib/geometry/`.
**Analog 2:** `lib/geometry/wings.ts` `takeAt` (`:453-461`) with private `prepare` (`:436`) and `fadeAt` (`:448`) — add `export function narrowestOutlineAt(g, s)` beside it (RESEARCH E); Narrowest is `curveHalfWidthAt(g, s) − Σ depth × fade(s)` with no step share.

Shape to follow (RESEARCH A proposal; names may be renamed by the planner): `BOTTOM_CUT_NAMES` as const tuples per section, `BottomCutSpec`, `BottomChannelsSpec`, `BoardBottom`, `DEFAULT_BOTTOM`, `BottomBoard`, then `startingCut`, `startingChannels`, `keepStationsInOrder`, `resolveBottom`, `cutFoamOff`, `foamOff`, `channelLayout`, `bottomFloorFlags`, `bottomDataRows`, `bottomLayoutMarks`, `bottomHasCut`, `isDefaultBottom`, `bottomLitres`.

Conventions to copy from the geometry files (see `board-surface.ts:1-46` header and imports):
```ts
/** ... Pure (CLAUDE.md Rule 1): no React, browser, database or `three` import. */
import { inchesToMm, mm, mmToInches, type Mm } from "./units";
```
Every sketch constant is a named export written through `inchesToMm`, never `25.4` (PINCH 3", OFF_RAIL_MIN 1/2", double 1/4" and 85%, stagger 1" lead-in, the 0.004 "on" threshold, the 1/32" shade step). Types `Mm`, `Degrees`, `Litres` are branded. The port is line for line from template.html 455-524; do not "clean up" the maths. The nose-section stations are stored from the nearest tip (D-07) and the tail cut's Deepest At from the front fins.

### `lib/geometry/volume.ts` (modify: the seam)

**Analog:** itself. The level-variant precedent is `movedOn` (`volume.ts:1189-1196`):
```ts
const movedOn = (built: BoardSection, half: HalfSectionPoints, rollReach: Mm): BoardSection => {
  const drawn = wingStepHalf(half, room, move, rollReach);
  return {
    ...built,
    halfWidth: foam,
    drawn,
    area: built.area + (sampledSectionArea(drawn) - sampledSectionArea(half)),
  };
};
```
Copy this exact "set `drawn`, correct `area` by the ring-area delta" shape for the column map. The input type to extend is `CrossSectionVolumeInput` (`:534-558`) — add one optional field beside `wingShareAt`:
```ts
  wingShareAt?: (station: Mm) => Mm;   // existing, optional, "the old rules never read it"
  // new: foamOffAt?: (station: Mm, across: Mm) => Mm;
```
The file's design rule (`:527-533`) is that volume.ts takes samplers only and never imports the outline builder or `bottom.ts`; keep that. The column map itself is in RESEARCH "Code Examples" (`bottomedHalf`); `SECTION_POINTS = { deck: 48, rail: 32, bottom: 24 }` is imported from `./finished-rail`. Call site order: after wing move and tail roll (`rolled`, around `:1199`), applied at the three `sections.push(…)` sites (:1102, :1246, :1268/:1273). Guard `top > 0`, floor from `inchesToMm(FOIL_THICKNESS_RANGE_IN.min)` (`lib/geometry/foil.ts:55`). Flat must be bit-identical: with f ≡ 0 each area delta is `Object.is(Δ, 0)`; skip the map entirely when `foamOffAt` is absent.

### `lib/geometry/design.ts` (modify)

**Analog:** itself, `designCrossSectionInput` (`:102-115`):
```ts
export function designCrossSectionInput(geometry: OutlineGeometry, profile: BoardSideProfile, rails: RailBandSpec, length: Mm): CrossSectionVolumeInput {
  return { ...crossSectionFoam(geometry), foil: profile.effectiveFoil, thicknessAt: profile.thicknessAt, rails, length };
}
```
Add an optional trailing parameter for the bottom and its board facts; spread `foamOffAt` in only when `bottomHasCut`. Existing test callers (`phase16-litres-pin.test.ts:25-29`) call it with four args, so keep it optional. Extend `DesignSummaryFields` with `bottom?`, `fins?`, `finsImportTemplate?` so `summarizeDesign`/`rackBoardFigures` (`rack-models.ts:55-58`) count a saved board's cut (Pitfall 5). `deriveEffectiveRails` (`:191-203`) stays untouched (Pitfall 6); copy its "return the input untouched when off" idiom for `railsOnTheBottom`:
```ts
if (!importFoilThickness) return rails;
```
i.e. flat bottom, lift 0, return the same object (prove with a deep-equal on the 102 boards).

### `lib/geometry/board-surface.ts` (modify, only for channel walls)

**Analog:** itself. `placedHalfSection` (`:239-247`) already prefers `section.drawn ?? section.blended ?? sampledFinishedRail(...)`, so the surface, `cncFiles` and the writers carry a cut with no change. Only the optional denser bottom run on a board with channels touches `HALF_POINTS` (`:78`, ~10 uses) and `weldKey` (`:246`); `BOTTOM_EDGE` is unchanged. Keep `SECTION_POINTS` global values fixed (Pitfall 7).

### `lib/models/design-snapshot.ts` (modify)

**Analog:** `withoutUnreadWings` (`:635-640`) plus `designFieldsSchema` (`:514-528`).
```ts
const designFieldsSchema = z
  .object({ outline: outlineSpecSchema, rocker: rockerSpecSchema, foil: foilSpecSchema, rails: railBandSpecSchema,
    fins: finPlacementSpecSchema, volume: volumeSpecSchema, finsImportTemplate: z.boolean(),
    railsImportFoilThickness: z.boolean(), boardName: z.string(), finSystem: finSystemSchema,
    blank: boardBlankSchema.nullable() })
  .partial();
```
Add `bottom: bottomSchema.optional().catch(undefined)` (the "optional-forgiving" pattern at `:439-458`: `z.number().min().max().optional().catch(undefined)` then a transform that leaves no key); a parsed `undefined` key is deleted exactly as:
```ts
function withoutUnreadWings<T extends object>(outline: T): T {
  if (!("wings" in outline) || (outline as { wings?: unknown }).wings !== undefined) return outline;
  const copy = { ...outline } as Record<string, unknown>;
  delete copy.wings;
  return copy as T;
}
```
`DESIGN_SNAPSHOT_VERSION` stays 5 (`:200`); `main` drops unknown keys. Each sub-object `.catch(<its default>)`; names `z.enum` per section; numbers bounded to the sliders' ranges widened to the board-length bound.

### `components/design/design-store.tsx` (modify)

**Analog:** itself.

**Undo coalescing + lock guard** (`:746-755`, `:871-886`): every action starts with the lock guard and `noteEdit`, and marks `boardStarted`/`dirty`:
```ts
const updateRailSection = (key: RailSectionKey, patch: Partial<RailSectionSpec>) => {
  if (lockedRef.current) return;
  noteEdit(`rails:${key}:${patchKey(patch)}`);
  setState((prev) => ({
    ...startedFrom(prev, liveTipsRef.current),
    rails: { ...prev.rails, [key]: { ...prev.rails[key], ...patch } },
    boardStarted: true,
    dirty: true,
  }));
};
```
Copy for `updateBottomCut` (`noteEdit(\`bottom:${section}:${patchKey(patch)}\`)`, apply `keepStationsInOrder` in the same `setState`), `updateChannels`, and the discrete ones (`pickBottomCut`, `setChannelCount`, `setChannelRun`, `setChannelLongest`, `setBottomClosesToPoint`, `setBottomWingRule`) with `noteEdit(null)` (see `toggleTailHardEdge` at `:889`). Session-only state (live cut, section station, Height, finished-rail tick) lives in the editor component as `useState`, like `showFinishedRail` in `rail-band-editor.tsx:107`.

**Snapshot fields** (`:1500-1528`): add `bottom: state.bottom` only when `!isDefaultBottom(state.bottom)`, in both the `useMemo` body and its deps list. Also touch `DesignState` (`:177`), `DEFAULT_DESIGN_STATE` (`:254-271`, `finsImportTemplate: true` at `:261`), `historySnapshot` (`:669-690`), `applyPreset`/`applyModel`. Fin read for the BOTTOM board facts uses the store chain `outlineForFins` → `importedFinTailFromOutline` → `computeFinPlacement` (`:1101-1226`), not `board-data.ts`'s.

### `app/design/bottom/page.tsx` (route)

**Analog:** `app/design/rails/page.tsx` (12 lines) and `app/design/3d/page.tsx`:
```tsx
import type { Metadata } from "next";
import { RailBandEditor } from "@/components/rails/rail-band-editor";
export const metadata: Metadata = {
  title: "Rail Band Calculator — Shaper Assistant",
  description: "Shape a surfboard's rail bands with live, calculated dimensions.",
};
export default function RailBandCalculatorPage() { return <RailBandEditor />; }
```
Use the 3D page's variant if the title/description live in a copy module (`THREE_D_COPY.pageTitle`). Run `npx next typegen` in each fresh worktree after adding the route.

### `components/bottom/bottom-editor.tsx` (screen component)

**Analog:** `components/rails/rail-band-editor.tsx` (591 lines).

**Imports and shell** (lines 1-24): `"use client"`, `DesignScreenShell` from `@/components/design/design-screen-shell`, `BoardNameTab`, `TabbedPanel` from `@/components/viewer/tabbed-panel`, `ViewerToolbar`/`ViewerToolbarButton` from `@/components/viewer/toolbar-button`, `useDesign` from the store, `useUnits` from `@/components/units-provider`.

**Core pattern:** read state via `const { ... } = useDesign();` (lines 49-62), local UI-only state with `useState` (page tab `"viewer" | "data" | "instructions"` becomes `"viewer" | "data" | "guide"`; `phoneSection` seeded from a helper for NOSE · CENTER · TAIL, lines 98-111), and the comment idiom "View state only: it lives here, never in the design store, so it is never saved and never an undo step" (lines 100-108) for the Show-finished-rail tick, live cut, Section-at station and Height. `growOnShortScreen` on `TabbedPanel` is RAILS-only today (the short-screen rule, CLAUDE.md "Short screen"); BOTTOM's drawing column follows UI-SPEC section 6 and should not pass it unless the spec says so. Memoise the resolved bottom on (board facts, `state.bottom`) and the shade grid on (resolved, board) (RESEARCH G).

### `components/bottom/bottom-controls.tsx` (side panel)

**Analog:** `components/rails/rail-controls.tsx` (695 lines).

**Imports/props** (lines 1-70): `Checkbox`, `Slider`, `SliderRow`/`sliderValue` from `@/components/design/slider-row`, `formatMark`/`formatSignedMark`/`measureSlider`/`stationLabel` from `@/lib/geometry/measure-display`, `useUnits`, `useControlsLocked` from `@/components/design/use-controls-locked`, `ImportedReadoutCard` for the INPUTS readout. Props are the store's values plus `onChange…` callbacks, never the store itself:
```ts
interface RailControlsProps {
  spec: RailBandSpec;
  onChangeSection: (key: RailSectionKey, patch: Partial<RailSectionSpec>) => void;
  phoneSection?: RailSectionKey;   // upright phone shows only that section's group
  boardLength: Mm;
}
```
**Reusable idioms:** `RULED_HEADING` constant (line ~125) for NOSE/CENTER/TAIL headings; `AdvancedHeading` (the one heading that keeps the arrow); `clampFinite`; `sectionThicknessLabel(system)` composing a Metric label through `stationLabel` rather than hand-typing a second literal; controls that are view-only carry `data-lock-exempt` (see `AdvancedHeading`'s `data-lock-exempt`), so the lock-scope test passes. Sliders in Metric go through `measureSlider` (`measure-display.ts:321`) and `metricSliderRange` (`units.ts:192`).

### `components/bottom/bottom-top-view.tsx` (drawing + drag)

**Analog 1 (frame, nose-left, pinned pixel strokes):** `components/rocker/rocker-top-view.tsx` — imports at lines 36-60:
```ts
import { useSvgFitScale, type ViewerOrientation } from "@/components/viewer/callout-primitives";
import { useViewerZoom, type ViewerZoom } from "@/components/viewer/zoom-viewport";
import { stationLabel } from "@/lib/geometry/measure-display";
import { mmToInches, type Mm } from "@/lib/geometry/units";
```
Header rule to copy: "This file paints only. Every number comes from [a lib function] ... Every line weight and dash is pinned to screen pixels, because the mini display draws at about a quarter of a pixel per unit" — strokes are `px / fitScale` through `useSvgFitScale`.
**Analog 2 (drag):** `components/outline/outline-viewer.tsx:655,663` (`setPointerCapture`) and `:559-566` (`getScreenCTM()` client to board). `lib/.../drag-selection.ts` `TAP_MAX_TRAVEL_PX = 8` separates a tap from a drag. BOTTOM's top view has no zoom, so one handler on the SVG with `touch-none select-none`; station = `clamp(L/2 − (x − 500)/k, 0, L)` (sketch `stationAt`, template 1137-1141). The shade is ONE `<path d>` per 1/32" level, `fill-opacity` 0.04, clipped to the outline with `clipPath` (RESEARCH I), contour lines one `<path>` per 1/16" level, pencil lines one per kind per cut. Never one `<rect>` per band (2,536 nodes).

### `components/bottom/bottom-section.tsx`, `bottom-data.tsx`, `bottom-guide.tsx`, `bottom-cartoon.tsx`

- Section plot: analog `components/rails/rail-section-plot.tsx` (+ `rail-section-plot.test.ts`) for "pure bounds function + SVG component"; geometry from `bottomSection`/`sectionGauges` in `bottom-draw.ts`. The ghost uses the station's own `drawn` ring from `boardSections` (RESEARCH C), not a re-sample.
- DATA: analog `components/rails/rail-data-table.tsx`; numbers `Mm` from `bottomDataRows`, wording through `formatMark`/`formatDim` (Rule 2: marks in whole mm, dims in cm to one decimal; 36" reads `91.4 cm`, 1/2" mark `13 mm`).
- GUIDE: words in a single module like `components/3d/three-d-copy.ts` (`THREE_D_COPY`), art computed by `guideCartoon` in `lib/geometry/bottom-draw.ts`, drafted words in `17-GUIDE-WORDS.md`. The same words feed the order form's "How to shape" notes verbatim.

### `components/fins/fin-viewer.tsx` (modify)

**Analog:** itself. Constants `SCALE = 14`, `ORIGIN_X = 260`, `TAIL_Y = 320` (`:43-45`); insert the contour group between the tail fill and the outline stroke (`:663-664`):
```tsx
<path d={filled} fill="var(--outline-board-fill)" stroke="none" />
<path d={open} fill="none" stroke="var(--outline-ink)" strokeWidth={2 * zoomUnit} />
```
Add the `bottom-draw.ts` shade/lines (board mm mapped by FINS' own transform, `--outline-pencil-line`, strokes `× zoomUnit`). Draw only while FINS' Import Template is ticked; a flat board adds no element so FINS' desktop baseline picture does not move.

### `components/site-nav.tsx`, `components/design/screen-tiles.tsx`, `lib/geometry/screen-tiles.ts`, `lib/screen-steps.ts`

**Analogs:** themselves.
```ts
// site-nav.tsx:31-39  insert { href: "/design/bottom", label: "BOTTOM" } as the THIRD entry: ROCKER, BOTTOM, RAILS (UI-SPEC E01/E03)
export const NAV_LINKS = [ { href: "/design/outline", label: "TEMPLATE" }, { href: "/design/rocker", label: "ROCKER" }, { href: "/design/rails", label: "RAILS" }, ... ] as const;
```
The row's gap class at `site-nav.tsx:96` becomes `gap-1.5 lg:gap-3 xl:gap-5`. `TILE_KIND: Record<NavLink["href"], ScreenTileKind>` (`screen-tiles.tsx:64-72`) is typed on the list, so the build fails until `"/design/bottom": "bottom"` exists; `ScreenTileKind` (`screen-tiles.ts:255`) gains `"bottom"`, `screenTileLines` (`:260-275`) gains a `bottom:` line, the grid `grid grid-cols-4 gap-2 shell:grid-cols-7` (`screen-tiles.tsx:263`) becomes `shell:grid-cols-8`. Tile art goes in a pure module beside `lib/geometry/three-d-tile-art.ts` (imported at `screen-tiles.tsx` as `threeDTilePicture`). `screenWord("BOTTOM")` already reads `Bottom` (`lib/screen-steps.ts:40-46`).

### `components/summary/order-form.tsx` + `order-form.css`

**Analog:** itself, the optional third sheet (`order-form.tsx:262`):
```ts
const sheetCount = printRailInstructions ? 3 : 2;
```
becomes `2 + (bottomHasCut ? 1 : 0) + (printRailInstructions ? 1 : 0)`, with the BOTTOM CONTOURS sheet third, before the instructions (D-29). Dress: `FormBox`, print block `order-form.css:501`, `break-before: page` at `order-form.css:795-796`. Must prove both flat cases (2 and 3 sheets) byte-identical. Paper constants stay in `order-form.css`'s `@media print` block (Rule 2 exception).

### `components/template/build-overview-pdf.ts` (modify `overviewSpecLines`)

**Analog:** the wings rows in the same function (`:126-170`). Signature gains an optional trailing parameter with an empty default, exactly like `wings: readonly WingFigures[] = []`:
```ts
for (const f of wings) {
  lines.push(`${wingPrintName(f)}: ${f.depthAtPosition}`);
  lines.push(`${WING_ROW_INDENT}Run: ${f.run}`);
}
...
lines.push(areaLine);
return lines;
```
Push `bottomLines` (from `bottom-print.ts`) after the `Template Area` line with `WING_ROW_INDENT`; `[]` adds nothing so a flat board's list is byte for byte today's (the wings' D4 rule). The Full Sized Template and Paper Saver builders must never import `bottom` (prove with a source/inventory test, as `components/3d/three-source.test.ts` and the rack-source test do).

### `lib/models/bottom-report.ts` + `scripts/check-saved-boards.ts --bottom-report`

**Analog:** `scripts/check-saved-boards.ts` (the 14-D-18 read-only report: ids and litres only). Read-only; run by the orchestrator on the development branch and by the founder on production (never name `.env*` paths in a Bash command, per memory).

### e2e specs

**Analogs:** the seven-count specs themselves, and `e2e/helpers/screens.ts:14-22` (`SCREENS`, `expectSevenTilesInMenu` at `:74-80`). Change list is UI-SPEC section 16 plus the extras in RESEARCH H: `phone-home.spec.ts:48-62,:131`, `error-pages`, `legal-pages`, `phone-screens`, `prod/phone-controls-clear-undo`, `contact.spec.ts:133-139`, `privacy.spec.ts:104-110`, `old-safari-buttons.spec.ts:146`, `board-name-band.spec.ts:132,:244,:247`. Six desktop baselines (outline, rocker, rails, volume, fins, three-d) re-recorded after an `--update-snapshots` diff review (nav row only). New specs follow `e2e/rocker-top-view.spec.ts` (computer, upright phone, sideways phone) and `e2e/phone-rails.spec.ts` (sideways scroll), run with `PW_PORT=33NN`.

## Shared Patterns

### Rule 1: geometry is pure and tested
**Source:** header of `lib/geometry/board-surface.ts:1-46` ("Pure (CLAUDE.md Rule 1): no React, browser, database or `three` import.")
**Apply to:** `bottom.ts`, `bottom-draw.ts`, `bottom-print.ts`, the `wings.ts` and `fins.ts` additions. Every export gets a test; expected values come from `bottom-golden.json` or the app's own functions, never typed (the sketch's 0.54 L and "+0.26 L" are NOT to be typed; the golden carries the real values).

### Rule 2: units only through `lib/geometry/units.ts` and `measure-display.ts`
**Source:** `lib/geometry/units.ts` (`inchesToMm`, `mmToInches`), `lib/geometry/measure-display.ts` (`formatDim`, `formatMark`, `formatSignedMark`, `measureSlider`, `stationLabel`), and `components/rails/rail-controls.tsx:~108-114` (`sectionThicknessLabel` composes a Metric label through `stationLabel`).
**Apply to:** every BOTTOM component, `bottom-print.ts`, DATA, the order form page. Dims (stations, Start/Deepest/End, Section at) in cm to one decimal; marks (depth, off rail, off stringer, channel numbers, toe-in, base length) in whole mm. Never 25.4 or 10. Toe: format once from the raw angle (`1.9525` reads `2.0°`, Pitfall 8).

### The lock guard + undo key
**Source:** `components/design/design-store.tsx:746-755`, `:871-886`.
**Apply to:** every new store action. `if (lockedRef.current) return;` first, then `noteEdit(...)`. View-only controls carry `data-lock-exempt` and are listed in `components/design/board-lock-scope.test.ts`.

### Flat stays flat (absent means flat, never rewritten)
**Source:** `withoutUnreadWings` (`design-snapshot.ts:635-640`), `deriveEffectiveRails` early return (`design.ts:191-203`), `overviewSpecLines`'s `wings = []` default (`build-overview-pdf.ts:126-131`).
**Apply to:** the snapshot field, the seam in `volume.ts`, RAILS' `railsOnTheBottom`, the order form's sheet count, the Overview Sheet lines, FINS' drawing. Each must return the identical object/bytes/DOM when `bottomHasCut` is false.

### Browser-free generated fixtures
**Source:** `scripts/extract-sketch016-custom-rocker-golden.mjs:1-47` (header: "generated and must never be hand-edited", run command, "No database is involved") and its `provenance` block (`:148-155`).
**Apply to:** `bottom-golden.json` and `phase17-litres-pin.json` producers.

### Three switches, never conflated
**Source:** CLAUDE.md "Layout". Width alone picks the layout (`max-shell`/`shell`), pointer alone picks control size (`coarse`), height alone picks short-screen rules (inline `[@media(max-height:500px)]`). Phone chrome uses the SAME values under `max-shell` and the short-screen rule. JS-side reads use `use-viewer-media.ts`'s `useBelowShellWidth` / `useShortScreen`. The new screen adds no fourth switch.
**Apply to:** `bottom-editor.tsx`, `bottom-controls.tsx`, `bottom-guide.tsx`, `design-screen-shell` usage.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `bottomShadeBands` / the one-path-per-level joiner in `bottom-draw.ts` | utility | transform | No existing code joins per-level rectangles into one `<path d>` (`M x y h w v h h -w z`); use RESEARCH I's recommendation and test node count = level count |
| The column map `bottomedHalf` (`h' = h + f(y)(1 - min(1, h/top))`) | utility | transform | Closest is `wingStepHalf`/`movedOn` in `volume.ts` for the surrounding shape, but the map is new; copy the code from RESEARCH "Code Examples" and prove `Object.is` zero deltas for f ≡ 0 |

## Metadata

**Analog search scope:** `lib/geometry/`, `lib/models/`, `components/{rails,rocker,3d,fins,summary,template,design,outline}`, `app/design/`, `scripts/`, `reference/sketches/`, `e2e/helpers`.
**Files scanned:** about 45 read or grepped (analogs read in part, large files by line range).
**Pattern extraction date:** 2026-11-08
