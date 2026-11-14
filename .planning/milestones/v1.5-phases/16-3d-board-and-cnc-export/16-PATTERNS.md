# Phase 16: 3D Board and CNC Export - Pattern Map

**Mapped:** 2026-11-03
**Files analyzed:** 30 (new and modified)
**Analogs found:** 27 / 30 (the WebGL scene, the zip writer and the STL/DXF byte formats have no analog in the code)

Every on-screen word below comes from 16-UI-SPEC.md's Copywriting section. Do not invent labels.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `app/design/3d/page.tsx` (new) | route | request-response | `app/design/volume/page.tsx` | exact |
| `components/board-3d/board-3d-screen.tsx` (new) | component (screen shell) | store read | `components/volume/volume-estimator.tsx` | exact |
| `components/board-3d/board-3d-controls.tsx` (new, the panel) | component | event-driven | `components/rails/rail-controls.tsx` (checkbox rows :317-329), `components/volume/volume-controls.tsx` | role-match |
| `components/board-3d/board-3d-viewer.tsx` (new, canvas + corner toolbar) | component | event-driven / streaming frames | `components/rails/rail-band-editor.tsx:353-385`, `components/viewer/toolbar-button.tsx`, `components/viewer/zoom-viewport.tsx` + `zoom-math.ts` | partial (no WebGL yet) |
| `components/board-3d/export-cnc.ts` (new, download) | utility (browser) | file-I/O | `components/setup/board-file-download.ts` | exact |
| `lib/geometry/board-surface.ts` (new, loft) + test | geometry (pure) | transform | `lib/geometry/volume.ts:715-750` per-station loop, `lib/geometry/finished-rail.ts`, `lib/geometry/rack-art.ts` | role-match |
| `lib/geometry/board-views.ts` (new, preset turns + 1x framing) + test | geometry (pure) | transform | `lib/geometry/rack-art.ts` (`turnedBoardPoints`, `halfExtent`), `components/viewer/zoom-math.ts` | role-match |
| `lib/geometry/fin-outline.ts` or inside `fins.ts` (new fn) + test | geometry (pure) | transform | `lib/geometry/fins.ts` | role-match |
| `lib/export/dxf.ts`, `stl.ts`, `xyz.ts`, `zip.ts` (new) + tests | utility (pure writer) | transform / file bytes | `lib/models/board-file.ts:83-107` (`buildBoardFile`/`boardFileText`) | partial |
| `lib/models/board-file.ts` (modify: shared stem + export names) | model/utility | transform | itself, `boardFileName` :96-107 | exact |
| `lib/geometry/rail-bands.ts` (modify: optional `tailHardEdgeEndsAt` on `RailBandSpec`) | model type | — | `RailBandSpec` :213-218, `sharpBottomTuck` default :221-231 | exact |
| `lib/models/design-snapshot.ts` (modify: new rule 13, forgiving optional field) | model/validation | transform | rule 12 `sharpBottomTuck: z.boolean().catch(false)` :400; wings `.optional().catch(undefined)` :251; `railBandSpecSchema` :406-418 | exact |
| `lib/geometry/volume.ts` (modify: hard-edge blend weight replacing the step at :724/:741) | geometry | transform | `finished-rail.ts:298` `deckBlendWeight`; `nearestAnchorSection` :581 | exact |
| `lib/geometry/blank-reasons.ts` or rail module (new slider + formatter) | geometry | transform | `formatThinningStart` :278, `thinningStartSlider` :303-315 | exact |
| `components/rails/rail-controls.tsx` (modify: Hard Edge Ends At row) | component | event-driven | `nudgeRow` :200-219, placed before Reset (~:410) | exact |
| `components/design/design-store.tsx` (modify: setter + Reset Advanced) | store | CRUD | existing `onResetAdvanced` / `onToggleHardEdge` actions | exact |
| `scripts/extract-phase14-preset-figures.ts` (re-run; may need a step name) | script | batch | itself | exact |
| `components/site-nav.tsx` (modify `NAV_LINKS`, "six" comments) | config | — | `NAV_LINKS` :30-37 | exact |
| `components/design/screen-tiles.tsx` (modify: seventh tile, 4x2 grid) | component | store read | itself | exact |
| `lib/geometry/screen-tiles.ts` (new `threeDTileArt`) + test | geometry (pure) | transform | `summaryTileArt` :228-247, `rack-art.ts` `turnedBoardPath` :266 | exact |
| `lib/screen-steps.ts` (modify `screenWord`) + test | utility | transform | `screenWord` (last fn) | exact |
| `components/design/step-nav.tsx` (comment "six" -> seven) | component | — | itself | exact |
| `components/design/phone-top-bar.tsx` (seven tiles) | component | — | itself | exact |
| `package.json` (three.js or similar, zip lib) | config | — | — | none |
| `e2e/board-3d.spec.ts` (new) | test | e2e | `e2e/board-file.spec.ts` (download), `e2e/rails-advanced.spec.ts`, `e2e/board-rack-turn.spec.ts` | exact |
| `e2e/helpers/screens.ts` + the specs in UI-SPEC §15 | test | e2e | `SCREENS` :14-21 | exact |
| `e2e/rails-advanced.spec.ts` (add D-20 cases) | test | e2e | its own `openAdvanced`/`advancedRows` :84-100 | exact |
| `e2e/desktop-baseline.spec.ts` (re-record note) | test | e2e | its RE-RECORDED header blocks :205-221 | exact |
| CLAUDE.md Layout + `.claude/skills/sketch-findings-shaper/references/phone-chrome.md` | docs | — | — | n/a |
| WebGL scene, lighting, zebra shader | component | streaming | none | none |

## Pattern Assignments

### `app/design/3d/page.tsx` (route)
**Analog:** `app/design/volume/page.tsx` (whole file):
```tsx
import type { Metadata } from "next";
import { VolumeEstimator } from "@/components/volume/volume-estimator";

export const metadata: Metadata = {
  title: "Volume Estimator — Shaper Assistant",
  description: "Estimate a designed board's volume from its template area and rail-band cross-sections.",
};

export default function VolumeEstimatorPage() {
  return <VolumeEstimator />;
}
```
Title per D-02: `3D — Shaper Assistant`. The route sits inside `app/design/layout.tsx` (SignInBanner, BoardLockScope, PhoneUndoBar) for free. Read `node_modules/next/dist/docs/` for any lazy-load (`next/dynamic`) API before using it to keep the 3D library on this route only (AGENTS.md).

### `components/board-3d/board-3d-screen.tsx` (screen shell)
**Analog:** `components/volume/volume-estimator.tsx` :16-79:
```tsx
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import { BoardNameTab } from "@/components/design/board-name-tab";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
...
    <DesignScreenShell
      controls={<VolumeControls ... />}
      canvas={
        <TabbedPanel
          tabs={[{ id: "estimate" as const, label: "ESTIMATE" }]}
          active="estimate"
          panelClassName="overflow-y-auto"
          compactOnPhone="text"
          trailing={(strip) => <BoardNameTab touchClearance={strip.touchClearance} />}
        >
          ...
        </TabbedPanel>
      }
      simpleSidebar
      phonePinned="none"
    />
```
Use the tab label `3D`. Unlike VOLUME, the drawing must stay pinned on a phone, so take `phonePinned` from `rail-band-editor.tsx`/`outline-editor.tsx` rather than `"none"`. Read the store's `effectiveRails`, `sideProfile`, `outlineGeometry`, fin placement and blank through `useDesign()` (CONTEXT, Reusable Assets).

### `components/board-3d/board-3d-controls.tsx` (the panel: SHOW / VIEW / EXPORT)
**Analog for the tick boxes:** `components/rails/rail-controls.tsx` :317-329:
```tsx
<label className="mt-2 flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
  <Checkbox
    disabled={locked}
    checked={spec.symmetrical}
    onCheckedChange={() => onChange({ symmetrical: !spec.symmetrical })}
  />
  Symmetrical
</label>
```
and the dimmed variant (:376-382) `className={cn("...", locked && "opacity-40")}`. Labels: `Fins` (on), `Blank` (off; dimmed with hint `No blank on this board — pick one on ROCKER to see it here.`), `Contour Stripes` (off; hint `Bands of light that kink at a bump or a flat spot.`). View buttons `Deck` `Bottom` `Side` `Nose` `Tail` in a group named `Views`; `Reset View`; primary `Export for CNC…` with note `Shape3D and AkuShaper read this as a guide and fit their own curves to it.` and a live-region status line (UI-SPEC rows).
- Do **not** pass `disabled={locked}` to the switches or Export: the UI-SPEC says a locked board shows exactly as unlocked. Precedent: rail-band-editor.tsx:356-358, "A view switch, not a control, so a locked board keeps it live".
- The switches are local `useState`, like `showFinishedRail`/`ghostBands` (rail-band-editor.tsx:95, :103). No store, no database (D-17).
- End the panel with the shared Back/Next `StepNav`, as every screen does.

### `components/board-3d/board-3d-viewer.tsx` (canvas + corner toolbar)
**Analog:** `components/rails/rail-band-editor.tsx` :354-381:
```tsx
<div className="relative flex min-h-0 flex-1 flex-col [@media(max-height:500px)]:flex-none">
  <ViewerToolbar>
    <ViewerToolbarButton
      onClick={() => setShowFinishedRail((on) => !on)}
      pressed={showFinishedRail}
      label={showFinishedRail ? "Hide finished rail" : "Show finished rail"}
      title="Finished Rail"
    >
      <FinishedRailIcon className="size-6" />
    </ViewerToolbarButton>
```
`ViewerToolbarButton` (toolbar-button.tsx:86-105): `label` is the accessible name; supply `pressed` only for toggles. The toolbar holds only the inherited controls: Wide view (copy `outline-editor.tsx:257-273` exactly) and the Zoom row (`Back to 1x — the whole drawing`, `Zoom in`, `Zoom out`, the level from `formatZoomLevel`). Take zoom limits and gestures from `components/viewer/zoom-math.ts` (`MIN_ZOOM`, `ZOOM_STEP`, `DEFAULT_MAX_ZOOM = 10`, `WHEEL_STEP_PX`, `PINCH_WHEEL_RATE`, `DOUBLE_TAP_MS`) so the 3D zoom steps the same way as the 2D zoom. The canvas's spoken name is `{board name} in 3D`; take it from `components/design/board-name-copy.ts:15`. Copy reduced-motion handling from `components/setup/hover-rack.tsx` (`reduced` passed into `tween`, :345-361). Messages for no WebGL, can't build and didn't load use the UI-SPEC "On the canvas" table word for word.

### `components/board-3d/export-cnc.ts` (download)
**Analog:** `components/setup/board-file-download.ts` (whole function):
```ts
export function downloadBoardFile(name: string, fields: DesignSnapshotFields, now: Date = new Date()): string {
  const fileName = boardFileName(name);
  const blob = new Blob([boardFileText(buildBoardFile(name, fields, now))], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.hidden = true;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return fileName;
}
```
Keep it synchronous inside the tap, for Safari. Use `application/zip`. Return the file name and slice count so the panel can build `Downloaded {file}. The outline, the profile and {n} slices, in millimetres.` CONTEXT says "inside the page's own root". Check how `open-board-file.tsx` and the rack call it so a dialog's portal doesn't swallow the click. The writers take the bare board and ignore the Fins and Blank switches (D-16).

### `lib/geometry/board-surface.ts` (the loft, pure)
**Analog:** `lib/geometry/volume.ts` :715-750. This is the per-station section the litres already integrate:
```ts
const nearestKey = nearestAnchorSection(station, tailStation, centerStation, noseStation);
const nearestSpec = rails[nearestKey];
...
const sectionInput: ComputeRailSectionInput = {
  thickness: thicknessEff, boardThickness: thickness, ratioTopPercent,
  family: nearestSpec.family, scale, nudges,
  singleTuck: nearestSpec.singleTuck, sharpBottomTuck: nearestSpec.sharpBottomTuck,
  symmetrical: nearestSpec.symmetrical,
  hardEdge: nearestKey === "tail" && rails.tailHardEdge,
};
const result = computeRailSection(sectionInput);
const profile = buildRailProfile(result);
```
Plus `finishedRail(output, x0)` (finished-rail.ts:526) for the blended foam, and `buildBoardProfile` (board-profile.ts:335) for the rocker/deck spine. **Factor that loop into one shared per-station section function**. volume.ts and the surface then both call it, so the mesh and the litres can never disagree (D-05). The relation test is the mesh's enclosed volume against `computeCrossSectionVolume`. Test style: `lib/geometry/rack-art.test.ts` (`describe("R3: ...")`, expected values from the app's own functions, never typed numbers).

### `lib/geometry/board-views.ts` (preset turns, 1x framing)
**Analog:** `lib/geometry/rack-art.ts` `turnedBoardPoints(art, theta)` :245, `halfExtent` :295, `drawnSpan` :306. These are pure projection and extent maths on a board. Framing fills 85% of the canvas's tighter direction (UI-SPEC §14).

### `lib/export/*` (DXF, STL, XYZ text, zip)
**Analog:** `lib/models/board-file.ts` :83-90. The idiom is a pure builder plus a pure text serialiser:
```ts
export function buildBoardFile(name: string, fields: DesignSnapshotFields, now: Date): BoardFile { ... }
export function boardFileText(file: BoardFile): string { return JSON.stringify(file, null, 2); }
```
Keep them free of React and the DOM so vitest (node, `lib/**/*.test.ts`) covers them. Write in millimetres as stored, with no `units.ts` conversion (Rule 2: files are metric). Number the slices from the tail as `01` and use three digits past 99.

### `lib/models/board-file.ts` (shared stem)
Lift the cleaning out of `boardFileName` (:96-107) into an exported `boardFileStem(name)`. `boardFileName` then becomes `${boardFileStem(name)}${BOARD_FILE_EXTENSION}`, and the export uses `${stem}-3d.zip`, `${stem}.dxf`, `${stem}.stl`, `${stem}-outline.txt`, `${stem}-profile.txt` and `${stem}-slice-NN.txt`:
```ts
const cleaned = name.replace(UNSAFE_FILE_NAME_CHARACTERS, " ").replace(/\s+/g, " ").replace(/^[\s.]+|[\s.]+$/g, "");
const cut = Array.from(cleaned).slice(0, FILE_NAME_MAX_LENGTH).join("").replace(/[\s.]+$/, "");
return `${cut === "" ? UNTITLED_BOARD_NAME : cut}${BOARD_FILE_EXTENSION}`;
```

### D-20: Hard Edge Ends At (five files)
1. **`lib/geometry/rail-bands.ts`**: add the optional field beside `tailHardEdge` in `RailBandSpec` (:213-218). Absent reads 18" (457.2 mm). Put the default in one exported constant.
2. **`lib/models/design-snapshot.ts`**: add rule 13 to the header list, in the style of rule 12 (:136-142: "Absent ... reads ..., so an old board opens exactly as it was ... The version stays 5, for rule 6's reason ... No database change"). In `railBandSpecSchema` (:406-418), beside `tailHardEdge: z.boolean()`, copy the forgiving form `z.number().min(..).max(..).optional().catch(undefined)` (wings, :251). The `.transform` rule 11 stays.
3. **`lib/geometry/volume.ts`**: replace the step `hardEdge: nearestKey === "tail" && rails.tailHardEdge` (:741) with a blend. Compute both the hard-edged and tucked sections and weight them 1 up to the 12" station, easing to 0 at the set distance. Analog for the weight function: `deckBlendWeight(run, halfBand2)` (finished-rail.ts:298). Export it so the surface and the STL read the same rule.
4. **Slider + formatter** (blank-reasons.ts :278-315 pattern):
```ts
export function formatThinningStart(start: Mm, system: UnitsSystem): string { return formatDim(start, system); }
...
return measureSlider(view.fromTip, rangeIn, stepIn, 10, system);
```
Use a range of 14" to 24", a 0.5" step and a Metric step of 10 mm, through `measureSlider` and `formatDim`. Never use `formatMark`.
5. **`components/rails/rail-controls.tsx`**: build the row like `nudgeRow` (:200-219):
```tsx
<SliderRow
  key={key}
  label={`${RAIL_NUDGE_NAMES[key]} — ${markText} (${formatSignedMark(nudges[key], system)})${trimmed}`}
  value={slider.value} min={slider.min} max={slider.max} step={slider.step}
  onValueChange={(v) => onChangeNudge(key, slider.toMm(v))}
  sliderLabel={`${SECTION_TITLE[sectionKey]} ${RAIL_NUDGE_NAMES[key]} nudge`}
  sliderValueText={markText}
/>
```
Use label `Hard Edge Ends At — 18"`, sliderLabel `Tail Rail hard edge ends at` and value text `18" from the tail`. Render it only when `isTail && hardEdgeOn` (the complement of `showTucks`, :223), after `nudgeRow("domedDeckBand")` and the tuck block, directly before the `↺ Reset Advanced Settings` button. `SliderRow` reads the lock itself.
   **Store:** add a setter, and make the existing Reset Advanced action set the field back to 18" in the same single undo step (the doc comment at the Reset button names that action).
6. **Fixtures:** re-run `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase14-preset-figures.ts --step ...`. Its `--step` takes only `curves`/`tips` today, so add a step name or document the re-run. Run `scripts/check-saved-boards.ts` / `phase14-before-after.ts` for the saved-boards report. Never type a figure by hand.

### Seventh screen
- **`components/site-nav.tsx` :30-37**: append `{ href: "/design/3d", label: "3D" }` to `NAV_LINKS`. Every reader (row, tiles, StepNav via `screenStepsAround`) follows automatically. Change "six" to "seven" in the comments at :26-29.
- **`lib/screen-steps.ts`**: `screenWord` currently gives `label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()`. That turns "3D" into "3d", so it needs the amendment (UI-SPEC §14: "3D stays 3D"). Also change the "six" wording in the doc comment.
- **`lib/geometry/screen-tiles.ts`**: add `threeDTileArt` in the shape of `summaryTileArt` (:228-247). It returns `{ viewBox, ...paths }` built with `boxOfPoints`, `meetScale` and `polylinePath`. Get the turned silhouette and stringer from `rack-art.ts` `turnedBoardPath`/`stringerPath` at 50°, lying nose-left. The same art serves as the loading picture.
- **`components/design/screen-tiles.tsx`**: add the seventh tile. The grid changes from 3x2 to 4x2 upright and from a row of six to a row of seven sideways (width alone).

## Shared Patterns

- **Rule 1 (pure geometry):** new maths goes only in `lib/geometry/` or `lib/export/`, with no React, DOM or DB imports, and every export gets a vitest test (`import { describe, expect, it } from "vitest"`) with expected values from the app's functions or generated fixtures.
- **Rule 2 (units):** the D-20 value goes through `formatDim`/`measureSlider` only. The 3D screen quotes no numbers. Files are written in raw mm.
- **View switches are local state and live on a locked board:** rail-band-editor.tsx:95, :103, :356-358.
- **Three switches:** inherit the layout through `DesignScreenShell`. Short screen uses inline `[@media(max-height:500px)]`. Touch size uses `coarse:min-h-11`. Never add a fourth.
- **Download inside the tap:** board-file-download.ts.
- **Snapshot tolerance:** an optional field with `.catch(...)`, version stays 5, a numbered rule in the header (design-snapshot.ts rules 6, 7 and 12).

## Tests

- **`e2e/board-3d.spec.ts`**: take the download capture and reading from `e2e/board-file.spec.ts` (imports :1-15: `type Download`, `readFileSync`, `boardFileName`, `freshPracticeRack`, `storedOpenBoard`; expected names from `boardFileStem`, never typed). Take the reduced-motion and turn checks from `e2e/board-rack-turn.spec.ts`. Use `PW_PORT` per executor.
- **`e2e/rails-advanced.spec.ts`**: reuse `openAdvanced(group)` (:84-93) and `advancedRows(body)` (:95). Assert the new row sits directly above `/Reset Advanced Settings$/`.
- **`e2e/helpers/screens.ts` :14-21**: add `{ href: "/design/3d", label: "3D" }` and make the six-tile helper (:73) check seven. Then update every spec in UI-SPEC §15.
- **`e2e/desktop-baseline.spec.ts`**: add a dated "RE-RECORDED 2026-11-xx (Phase 16)" block in the style of :205-221. Explain that the nav row gained 3D (and VOLUME's litres, if the default tail is hard-edged), and that a diff showed nothing else moved. Re-record from the main checkout.

## No Analog Found

| File | Reason |
|---|---|
| The WebGL scene (renderer, fixed room lights, matte foam material, ghost blank, contour stripes) | The app has no 3D drawing. Use RESEARCH.md. |
| `lib/export/zip.ts` (or a library) | No archive writing exists. RESEARCH.md decides between a library and a small hand-written writer. |
| The STL and DXF byte formats | No CAD writer exists. Only the builder/serialiser split from board-file.ts carries over. |

## Metadata
**Searched:** app/design, components/{volume,fins,rails,viewer,setup,design}, lib/geometry, lib/models, scripts, e2e
**Files scanned:** about 30
