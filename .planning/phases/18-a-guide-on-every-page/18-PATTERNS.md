# Phase 18: A GUIDE on Every Page - Pattern Map

**Mapped:** 2026-11-09
**Files analyzed:** 31 new or modified (5 editor touches, 6 component files, 10 `lib/geometry/guide-*` files incl. tests, 4 spec/test rewrites, 1 new e2e spec, 1 ledger, 1 css token, 1 deletion, 1 words-page edit)
**Analogs found:** 31 / 31 (nothing is invented; five have only a partial match, flagged below)

## READ THIS FIRST: two kinds of analog

1. **In this branch (`page-guides`)** — import from or edit these.
2. **Phase 17 reference copies — NOT on this branch.** Phase 17's BOTTOM GUIDE lives on branch `claude/beautiful-fermi-ad3fb7`. Reference copies sit in the session scratchpad. Executors READ them from the path and COPY the pattern into `components/guide/`; they must **never import from them** (the files do not exist in the repo, and the BOTTOM code imports `bottom.ts` types that do not exist here).

   Scratch dir `REF` = `/private/tmp/claude-501/-Users-kontoes-Code-shaper--claude-worktrees-elastic-joliot-3e9625/3f78d528-f80a-4ec4-8a1a-073d6c2dfc15/scratchpad/phase17-ref`
   - `REF/bottom-guide.tsx` (129 lines) — the card dress, the grid rule, the group/heading classes
   - `REF/bottom-cartoon.tsx` (152 lines) — the WeakMap memo, the SVG painter, `aria-hidden`, `vectorEffect`
   - `REF/bottom-guide-words.test.ts` (227 lines) — the words-page reader, source-reading tests
   - `REF/bottom-guide.spec.ts` (390 lines) — `openGuide`, `readCards`, `columnsAcross`, phone blocks
   - `REF/17-UI-SPEC.md` — §5 of it is the card spec 18-UI-SPEC extends

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `components/guide/guide-tab.tsx` | component (tab body) | request-response (store read to render) | `REF/bottom-guide.tsx` `BottomGuide` (lines 53-87) | exact (Phase 17 ref) |
| `components/guide/guide-card.tsx` | component (memo'd card) | transform | `REF/bottom-guide.tsx` `GuideCard` (lines 99-129) | exact (Phase 17 ref) |
| `components/guide/guide-cartoon.tsx` | component (SVG painter + WeakMap memo) | transform | `REF/bottom-cartoon.tsx` (1-152) | exact (Phase 17 ref) |
| `components/guide/guide-words.ts` | data module | static data | `bottom-guide-words.ts` (not copied; shape implied by `REF/bottom-guide-words.test.ts` lines 80-93) | role-match |
| `components/guide/guide-copy.ts` | data module | static data | `components/design/board-name-copy.ts` (lines 1-24) + `BOTTOM_COPY` (shape implied by `REF/bottom-guide-words.test.ts` 182-199) | role-match |
| `components/guide/guide-words.test.ts` | test (source-reading + page-reading) | file-I/O | `REF/bottom-guide-words.test.ts` (1-227) | exact (Phase 17 ref) |
| `components/guide/guide-source.test.ts` ("nothing pressable", no formula, no raw HTML) | test (source contract) | file-I/O | `REF/bottom-guide-words.test.ts` 201-227; in-branch `components/rocker/rocker-live-controls.test.ts` 91-95 (`readFileSync` of a sibling source) | exact |
| `lib/geometry/guide-push.ts` | utility (pure, units-aware) | transform | `lib/geometry/measure-display.ts` (63-95, 253-255) + `fins.ts:1372` `finRoundingGrain` | role-match |
| `lib/geometry/guide-{rocker,outline,rails,volume,fins}.ts` | utility (variant builders) | transform | `lib/geometry/design.ts:307` `designSideProfile`; `lib/geometry/__fixtures__/phase16-boards.ts` (the one-field-changed pattern) | role-match |
| `lib/geometry/guide-tag.ts`, `guide-caption.ts` | utility (pure text) | transform | `lib/geometry/measure-display.ts` `diamondDepthClampNote` (lines 259-262) | role-match |
| `lib/geometry/guide-draw.ts` | utility (layout/path arithmetic) | transform | `components/outline/wing-view-layout.ts` + its test; `REF` says Phase 17 put this in `lib/geometry/bottom-draw.ts` (not copied) | role-match |
| `lib/geometry/guide-*.test.ts` | test | transform | `lib/geometry/blank-ghost.test.ts` (1-30) + `measure-display.test.ts` (1-50) | exact |
| `lib/units-isolation.test.ts` (extend) | test (source ledger) | file-I/O | itself, `SCREEN_FOLDERS` at 429-445 | exact |
| `components/outline/outline-editor.tsx` (modify) | component (editor) | request-response | itself; `rail-band-editor.tsx` `instructions` pin idiom | exact |
| `components/rocker/rocker-editor.tsx` (modify) | component | request-response | itself | exact |
| `components/rails/rail-band-editor.tsx` (modify) | component | request-response | itself | exact |
| `components/volume/volume-estimator.tsx` (modify) | component | request-response | `fin-placement-editor.tsx` tab state | exact |
| `components/fins/fin-placement-editor.tsx` (modify) | component | request-response | itself | exact |
| `components/fins/fin-model-info.tsx` (DELETE, after moving its 14 notes) | component | static | n/a | n/a |
| `components/viewer/tabbed-panel.tsx` (modify: trailing wrapper, D-21) + `.test.ts:123` | component + test | request-response | itself | exact |
| `components/rocker/rocker-live-controls.ts` + `.test.ts:76` | utility + test | transform | itself | exact |
| `app/globals.css` (one token line) | config | n/a | `--outline-ghost` at line 932 | exact |
| `e2e/guide.spec.ts` (new) | test (browser) | request-response | `REF/bottom-guide.spec.ts` | exact (Phase 17 ref) |
| `e2e/board-name-band.spec.ts`, `e2e/phone-chrome.spec.ts`, `e2e/volume-fins-panels.spec.ts` (rewrite) | test | request-response | themselves | exact |
| `e2e/desktop-baseline.spec.ts-snapshots/*.png` (5 re-recorded) | test fixtures | n/a | n/a | n/a |
| `18-GUIDE-WORDS.md` (gains Metric sayings + ROCKER captions) | docs / source of truth | static | `17-GUIDE-WORDS.md` (not copied) | role-match |

Partial matches (planner leans on RESEARCH.md/UI-SPEC, not a real analog): `guide-draw.ts` (nothing in-branch draws a strip + window + detail), `guide-cartoon.tsx`'s five per-page SVG painters (only Phase 17's one-page painter exists), `guide-words.ts` (the Phase 17 file is not in the scratch dir; use the test as its spec), `guide-copy.ts`, and the Metric-sayings function.

---

## Pattern Assignments

### `components/guide/guide-tab.tsx` (component, store read to render)

**Analog:** `REF/bottom-guide.tsx` lines 53-87 (Phase 17 reference copy, not on this branch).

**Imports** (REF 1-13, adapt names):
```tsx
"use client";
import { memo } from "react";
import { bandBoardName } from "@/components/design/board-name-copy";
import { useDesign } from "@/components/design/design-store";
import { useUnits } from "@/components/units-provider";
import { cn } from "@/lib/utils";
```

**Core pattern: scroller, intro, group sections, grid** (REF 57-86):
```tsx
<div data-bottom-guide className="min-h-0 flex-1 overflow-y-auto pt-2">
  <p data-guide-intro className="max-w-prose text-xs leading-normal text-surf-ink-muted">
    {BOTTOM_COPY.guideIntro(bandBoardName(modelId, boardName))}
  </p>
  {GUIDE_GROUPS.map(({ group, entries }) => (
    <section key={group} data-guide-group={group}>
      <h3 className={GROUP_HEADING}>{BOTTOM_COPY.guideGroups[group]}</h3>
      {/* `role` is kept on purpose: Safari drops a list's meaning once its bullets are styled away. */}
      <ul role="list" className="grid list-none gap-2 [grid-template-columns:repeat(auto-fill,minmax(max(236px,calc((100%-16px)/3)),1fr))]">
```
Constants (REF 49, 51):
```tsx
const GROUP_HEADING = "mt-4 mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold";
const ACCENT_CAPS = "text-[10px] font-display text-surf-accent-ink uppercase tracking-architectural font-extrabold";
```

**Must differ for Phase 18:**
- One `GuideTab` for all five pages, taking `page` and an `entries` list built from `guide-words.ts`; groups come from the words module, not a hard-coded `GROUP_ORDER`.
- The scroller is the one place `role="region"`, `aria-label`, `tabIndex={0}` are allowed (RESEARCH Pitfall 12; UI-SPEC §9). Put them here, never in `guide-card.tsx`/`guide-cartoon.tsx`.
- Card key is page + group + name (D-27), not `card.key` alone. Emit `data-guide-card={id}`.
- Board name: `bandBoardName` returns `Untitled` for an unsaved board (`components/design/board-name-copy.ts:20-24`, quoted below); map `Untitled`/`""` to `board` (Phase 17's `guideBoardName`, RESEARCH Pitfall 11), possessive in the template.
- Store reads differ per page (RESEARCH Finding 2 table). One width observer on this scroller giving `innerWidth/300` to every cartoon through context (RESEARCH Alternatives) instead of 84 `useSvgFitScale`s.
- GUIDE is mounted only while the tab is active (an `activeTab === "guide" && ...` branch, as FINS does for `info`).

`bandBoardName` (in-branch `components/design/board-name-copy.ts:20-24`):
```ts
export function bandBoardName(modelId: string | null, boardName: string): string {
  if (modelId === null) return BOARD_NAME_COPY.untitled;
  const trimmed = boardName.trim();
  return trimmed === "" ? BOARD_NAME_COPY.untitled : trimmed;
}
```

---

### `components/guide/guide-card.tsx` (component, transform)

**Analog:** `REF/bottom-guide.tsx` lines 89-129 (Phase 17 reference copy).

**Core pattern** (REF 99-128):
```tsx
const GuideCard = memo(function GuideCard({ card, cut, how, on, board, geometry, wingRule }: GuideCardProps) {
  return (
    <li
      data-guide-card={card.key}
      data-guide-on={on ? "true" : "false"}
      className={cn(
        "flex min-w-0 cursor-default flex-col gap-2 rounded-lg border p-3 max-shell:p-2 [@media(max-height:500px)]:p-2",
        on ? "border-surf-line" : "border-surf-line-faint",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="min-w-0 text-sm leading-tight font-semibold text-surf-ink">{card.key}</h4>
        {on && (<span data-guide-tag className={cn(ACCENT_CAPS, "flex-none")}>{BOTTOM_COPY.guideOnThisBoard}</span>)}
      </div>
      <BottomCartoon ... />
      <p data-guide-text className="text-[13px] leading-[1.45] text-surf-ink-muted">
        <span className="font-semibold text-surf-ink">{card.is}</span> {card.does}
      </p>
      <p data-guide-how className="border-t border-dashed border-surf-line-faint pt-2 text-xs leading-normal text-surf-ink-muted">
        <span className={cn(ACCENT_CAPS, "mb-1 block")}>{BOTTOM_COPY.guideHowToShape}</span>
        {how}
      </p>
    </li>
  );
});
```

**Must differ:**
- The tag is not only `On this board`: it is the `guideTag(id, board, system)` result `{kind: on|value|na|none, text}` (D-05), so the tag span renders for value/na too (`6'2"`, `Diamond & swallow only`, `—`, `Needs 8'0"`). Border stays `surf-line` only when `kind === "on"`.
- Add the HTML caption line under the drawing (`dashed · +1" nose rocker` / `drawn as · …`) — a `<p>`, not SVG text (D-06; sketch lesson: a pair of windows is too narrow for a caption).
- Add the one new block: *Model info* (FINS only, 14 cards), same dress as `data-guide-how`, above How to shape. Check UI-SPEC §3 for its exact markup before writing.
- `memo` props must be stable objects (memo key discipline); lines come from `guideLines(card, system)` (D-22), never `card.how` directly (Phase 17's test asserts exactly this: `expect(guide).not.toMatch(/card\.how/)`).
- No `<button`, `role="button"`, `onClick`, `onPointer`, `tabIndex` anywhere in this file.

---

### `components/guide/guide-cartoon.tsx` (component, transform; per-page painters)

**Analog:** `REF/bottom-cartoon.tsx` (Phase 17 reference copy). Closest for the memo and the SVG skeleton; there is NO analog for five pages of strip + window + detail, so geometry comes from `lib/geometry/guide-draw.ts` and the sketch source (`.planning/sketches/022-page-guides/sketch-source.tar.gz`: `pages.js` `cardFrame`).

**WeakMap memo** (REF 32-47, adapt key to the page's stable store object, RESEARCH Pattern 1 table):
```tsx
const drawn = new WeakMap<BottomBoard, Map<string, GuideCartoon>>();
function cartoonFor(cut, board, geometry, rule): GuideCartoon {
  let ofBoard = drawn.get(board);
  if (!ofBoard) { ofBoard = new Map(); drawn.set(board, ofBoard); }
  const key = `${rule}|${cut.section}|${"name" in cut ? cut.name : "channels"}`;
  let cartoon = ofBoard.get(key);
  if (!cartoon) { cartoon = guideCartoon(cut, board, geometry, rule); ofBoard.set(key, cartoon); }
  return cartoon;
}
```
Inner key becomes `${system}|${cardId}` (RESEARCH Pattern 1).

**SVG skeleton** (REF 58-73, 99-107):
```tsx
export const BottomCartoon = memo(function BottomCartoon({ cut, board, geometry, wingRule }) {
  const clipId = useId();
  const cartoon = useMemo(() => cartoonFor(cut, board, geometry, wingRule), [cut, board, geometry, wingRule]);
  return (
    <svg data-guide-cartoon viewBox={cartoon.viewBox} aria-hidden="true" focusable="false"
         className="block h-auto w-full overflow-visible" fill="none" strokeWidth={1}>
      <path d={cartoon.board} fill="var(--outline-board-fill)" stroke="var(--outline-ink)" vectorEffect="non-scaling-stroke" />
      ...
      <line ... stroke="var(--outline-station-line)" strokeDasharray={DASH.stringer} vectorEffect="non-scaling-stroke" />
```
Dash constants (REF 23): `const DASH = { stringer: "12 3 3 3", cutLine: "7 2.5 1.5 2.5", ... } as const;` — "written for the cartoon's 300-unit width". In-branch CSS tokens are `--outline-stringer-dash: 16 4 4 4`, `--outline-station-dash: 5 4`, `--outline-widepoint-dash: 2 3` (`app/globals.css:935-941`); D-18 says use those.

**Drafting primitives to REUSE in-branch** (`components/viewer/callout-primitives.tsx`):
- `DimensionLine` (:398-440), `DimensionTick` (:365-378, 45-degree). Its label is hard-coded `fontSize: sizes.dim`, `fontWeight: 700`, `fill: var(--outline-ink)` (:424-432); UI-SPEC wants 10px/600 tabular `--outline-dim-ink`, so either draw the guide's own `<text>` or add an optional weight prop.
- `pinnedCalloutSizes(fitScale)` (:102), `MIN_PINNED_FIT_SCALE = 0.66` (:311), `CalloutSizeProvider`; `CALLOUT_PX` (:71) is the 14/11/14 set so the guide passes its own 10.
- RAILS colours: `RAIL_SEGMENT_COLORS`, `RAIL_APEX_CENTER_COLOR` from `components/rails/rail-section-plot.tsx` (:91, :105).
- FINS: copy constants from `fin-viewer.tsx` (~687-704), do NOT import from the viewer (Phase 17 rewrites it, RESEARCH Finding 10).

**Must differ:**
- No `Math.sin/cos/tan/atan2/sqrt/pow/hypot`, `innerWidth`, `matchMedia`, `window.`, `document.` in this file (source test, below). All arithmetic lives in `lib/geometry/guide-draw.ts`.
- Push line uses new token `--outline-push-line` (see globals row); the colour pushes are muted dashes, never a new hue (D-18).

---

### `components/guide/guide-words.ts` and `guide-copy.ts` (data modules)

**Analog:** `components/design/board-name-copy.ts:1-24` for the `*_COPY` const-object style (pure, `as const`, no React); shape of the words module is dictated by `REF/bottom-guide-words.test.ts` lines 80-93:
```ts
expect(BOTTOM_GUIDE_WORDS.map((card) => [card.key, card.is, card.does, card.how])).toEqual(page.map((card) => [card.name, ...card.lines]));
```
**Must differ:** 84 cards `{ id, page, group, name, is, does, info?, how }` with `id = "${page}.${groupSlug}.${nameSlug}"` (D-27; names repeat: TEMPLATE has two Fullness and two Depth). Fourteen `info` strings are moved from `components/fins/fin-model-info.tsx` BEFORE it is deleted (RESEARCH Finding 6 verified them verbatim; the Convention paragraph splits into the Convention card's two sentences, grain via `finRoundingGrain(system)`). Add a `guideLines(card, system)` pure function (D-22) returning `{is, does, info, how}` for a system, from the Metric sayings pairs, modelled on Phase 17's `guideHow(card, system)` (`REF/bottom-guide-words.test.ts` 137-155: Imperial returns the page text; Metric swaps one phrase).

---

### `components/guide/guide-words.test.ts` (test, file-I/O)

**Analog:** `REF/bottom-guide-words.test.ts` (Phase 17 reference copy).

**Page finder (copy exactly)** (REF 18-31):
```ts
const PAGE_NAME = "17-GUIDE-WORDS.md";   // becomes "18-GUIDE-WORDS.md"
const PLANNING = fileURLToPath(new URL("../../.planning/", import.meta.url));
function findPage(dir: string): string | null {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isFile() && entry.name === PAGE_NAME) return path;
    if (entry.isDirectory()) { const found = findPage(path); if (found) return found; }
  }
  return null;
}
```
Vitest here runs `components/**/*.test.ts` already (`vitest.config.ts` include; RESEARCH Finding 7), so the file runs where it sits.

**Page reader**: Phase 17's reader (REF 42-66) reads `## Group` / `### N. Name` / `- **Label:** line`. Phase 18's page has a different format, so use RESEARCH "Code Examples" reader (RESEARCH lines 477-491): `## PAGE`, `### Group — qualifier`, `**Name** · tag on the Shortboard: \`..\` · caption: \`..\``, `- is|does|info|how: text`. It was run against the current page and gave 84 cards and 14 info lines (TEMPLATE 22, ROCKER 14, RAILS 17, VOLUME 8, FINS 23).

**Assertions to carry** (REF 68-93, 157-164):
```ts
expect(BOTTOM_GUIDE_WORDS).toHaveLength(page.length);
for (const line of [card.is, card.does, card.how]) {
  expect(line, card.key).toBe(line.trim());
  expect(line.length, card.key).toBeGreaterThan(0);
  expect(line, card.key).not.toMatch(/\*\*|<|>/);
}
// Metric: no inch figure on any card
expect(line, card.key).not.toMatch(/\d\s*("|''|″|in\b|inch)/);
```
**Must differ:** compare module and page BY ORDER asserting page, group, name and each line (not by `name`); add the D-22 tests (every Imperial phrase has its Metric pair; app-number phrases equal what `units.ts` formats: `stationLabel("metric")` = `30.5 cm`, `formatLength(MIN_MCKEE_LONGBOARD_QUAD_LENGTH,"metric")` = `243.8 cm`; the Metric ban regex must tolerate "under foot"/"back foot"); add executable tag and caption tests against the page's backticked examples using `phase16Boards()` (Shortboard, Imperial; do not test the Longboard, its recorded and live blanks differ, RESEARCH Finding 2); ROCKER's ten captions are added to the page first (D-23).

---

### `components/guide/guide-source.test.ts` ("nothing pressable", no formula, no raw HTML)

**Analog:** `REF/bottom-guide-words.test.ts` lines 201-227 (reference copy); in-branch precedent for reading a sibling source is `components/rocker/rocker-live-controls.test.ts` lines 91-95:
```ts
const source = readFileSync(join(__dirname, "rocker-live-controls.ts"), "utf8");
const importLines = source.split("\n").filter((line) => /^\s*import[\s{*"']/.test(line));
expect(importLines).toEqual([]);
```
**Core** (REF 204-226):
```ts
for (const file of files) expect(read(file), file).not.toMatch(/dangerouslySetInnerHTML|innerHTML/);
expect(read(file), file).not.toMatch(/\binnerWidth\b|\bmatchMedia\b|\bouterWidth\b|\bdevicePixelRatio\b|\bwindow\.|\bdocument\./);
expect(read(file), file).not.toMatch(/Math\.(sin|cos|tan|atan2?|sqrt|pow|hypot)\b/);
expect(guide).not.toMatch(/<button|role="button"|onClick|onPointer|tabIndex/);
```
**Must differ:** the `tabIndex` ban applies to `guide-card.tsx` and `guide-cartoon.tsx` only; `guide-tab.tsx` is the one allowed `tabIndex={0}` scroller (RESEARCH Pitfall 12). Also assert no `[tabindex]` inside `[data-guide-card]` in the e2e spec.

---

### `lib/geometry/guide-push.ts` (utility, transform) — the one file allowed `inchesToMm`

**Analog:** `lib/geometry/measure-display.ts` (display boundary) and `finRoundingGrain` (`lib/geometry/fins.ts:1372-1374`):
```ts
export function finRoundingGrain(system: UnitsSystem): string {
  return system === "metric" ? "millimetre" : '1/16"';
}
```
and the formatter family (`measure-display.ts`):
```ts
export function formatDim(value: Mm, system: UnitsSystem): string {                   // :63
  return system === "metric" ? `${formatCentimetres(value)} cm` : formatInchesFraction(value);
}
export function formatMark(value: Mm, system: UnitsSystem): string {                  // :81
  return system === "metric" ? `${formatWholeMm(value)} mm` : formatInchesFraction(value);
}
export function stationLabel(system: UnitsSystem): string {                           // :253
  return system === "metric" ? `${formatCentimetres(MEASURE_STATION_MM)} cm` : `12"`;
}
```
Also `formatLength` (:210), `formatSignedDim` (:177), `formatSignedMark` (:195).

**Must differ / rules to enforce:** `guidePush(system)` returns the amount PER FAMILY and the drawing, the label and the caption read that one number (D-25): dims in clean cm (6" → 15 cm, 4" → 10, 3" → 7.5, 2" → 5, 1" → 2.5, 18" → 45, 24" → 60), marks in whole mm (1/4" → 6, 3/8" → 10, 1/2" → 13, 3/4" → 19, 1" → 25, 1 1/2" → 38, 2" → 50, 4" → 100). Imperial amounts come from `inchesToMm`. Degrees, percentages, scales are identical in both systems. The test must prove no Metric dim formats as `15.2 cm`.

---

### `lib/geometry/guide-{rocker,outline,rails,volume,fins}.ts` (variant builders, transform)

**Analog (shape):** `lib/geometry/__fixtures__/phase16-boards.ts` lines 36-60 — a board with ONE field replaced by spreading:
```ts
const outline = tail ? { ...recorded.outline, tail } : recorded.outline;
boards.push({ label, fields: { ...recorded, railsImportFoilThickness: true, volume: DEFAULT_VOLUME_SPEC, outline, rails: { ...recorded.rails, tailHardEdge: hard } } });
```
and `designSideProfile` (`lib/geometry/design.ts:307-325`), which takes `Pick<DesignSummaryFields, "outline"|"rocker"|"foil"|"blank">` and re-runs `prepareBoardBlank` on every call (0.0-0.2 ms).

**Per-page real function and signature** (verified by RESEARCH Finding 3; line numbers in this branch):
| Page | Call | Where |
|---|---|---|
| ROCKER | `designSideProfile(fields, LIVE_DESIGN_RULES)` | `design.ts:307` |
| TEMPLATE | `buildOutline(spec)`; tails via `TAIL_PRESETS[kind]` (`board.ts:152`); wings via `nextWing([], edges, geometry, system)` (`wings.ts:663`) | `outline.ts:243` |
| RAILS | `computeRailSectionOutput(key, spec, hardEdge)` then `finishedRail(output, x0)` | `rail-bands.ts:910`, `finished-rail.ts:526` |
| VOLUME | `computeVolume({length,width,centerThickness,boardTypeIndex,importTemplateDimensions:false,importRailThickness:false}, null, null)` (tag itself is the store's `quotedVolumeLitres`, never recomputed) | `volume.ts:396` |
| FINS | `computeFinPlacement(spec, importedTail)` with `advanced: resetAdvanced(setup, twinTemplate)` | `fins.ts:1579`, `:1493` |

**Must differ / traps** (each from the research; do not rediscover):
- McKee Longboard availability: `isQuadRearModelAvailable("mckeeLB", boardLength)` (`fins.ts:335`), never `L < 96*25.4`. The fallback is applied inside `computeFinPlacement` (`effectiveQuadRearModel`, :346).
- `FinMark.lateral`/`leadingLateral` are ALREADY signed by side: never multiply by `side`.
- Tail Block / Tail Angle flags: read `tailBlockPinned` (outline.ts:254) and `tailAnglePinned` (:255), never test `tail.kind`.
- `nextWing`/`wingRadiusTop` take the live `system` (a 1/16" grid vs 1 mm); pass it.
- Thinning Start pushes clamp via `thinningStartRange(length)` (`tip-taper.ts:92`).
- A rocker push on a board that already carries an ordered rocker ADDS to that end's amount, within `ROCKER_CHANGE_MAX_MM` (2") and `MAX_CHANGES_PER_END` (2) (D-26).
- Placement push is `null` when `placementRange(...).max <= 0.5 mm` (`blank-fit.ts:197`); caption then draws the other way or none (D-26).
- RAILS `x0` = the min `xAxisMin` of the BASE board's three sections.
- Export no React, browser or DB import (Rule 1).

---

### `lib/geometry/guide-tag.ts`, `guide-caption.ts` (utility, transform)

**Analog:** `diamondDepthClampNote` (`measure-display.ts:259-262`) — a pure sentence built entirely from `formatMark(..., system)`:
```ts
export function diamondDepthClampNote(system: UnitsSystem): string {
  return `Clamped to ${formatMark(DIAMOND_BLOCK_MARGIN_MM, system)} less than Tail Block`;
}
```
**Must differ:** every figure goes through the measure-display family, never `toFixed`/`*25.4`. Return a tagged union (`{kind:"on"|"value"|"na"|"none", text}` / `{kind:"dashed"|"drawnAs"|"none", text}`) so the component can pick the border. Tags the UI-SPEC omits but the sketch applies (RESEARCH Finding 3): Tail Angle on a diamond (`—`, no push), Placement with no slide room. Convention tag in Metric is `to 1 mm` (D-24).

---

### `lib/geometry/guide-draw.ts` (utility, transform)

**Analog (partial):** `components/outline/wing-view-layout.ts` and its test, which is a pure layout/arithmetic module kept out of the SVG file (test header, lines 1-25 of `wing-view-layout.test.ts`: `closeUpFrame`, `spreadApart`, `wingCardHeightPx`). For strip + window + detail there is no in-branch analog; the sketch's `cardFrame` (`pages.js:22-40` in `sketch-source.tar.gz`) is the source. RESEARCH says Phase 17 put its path builder in `lib/geometry/bottom-draw.ts` for the same reason (not in the scratch dir).

**Must differ:** returns path strings, label boxes, window fit and dimension placement in a 300 x H viewBox; zero React; keep the Rule-2 ledger clean.

---

### `lib/geometry/guide-*.test.ts` (tests)

**Analog:** `lib/geometry/blank-ghost.test.ts` lines 1-30 — expected values are READ FROM THE APP'S OWN FUNCTIONS, never typed:
```ts
function presetCase(preset: (typeof BOARD_PRESETS)[number], samples: number) {
  const fields = presetDesignFields(preset);
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  ...
}
```
and `measure-display.test.ts` 1-50 (imports `UNITS_SYSTEMS`, each formatter, a `describe` per function, both systems). Boards: `phase16Boards()` (`lib/geometry/__fixtures__/phase16-boards.ts:40`, labels `${preset.id}|asis|hard`); for Shortboard, Fish and Midlength the recorded blank equals the live preset's blank (Longboard does not). No new golden fixture needed: pushes are relations of the app's own functions (CLAUDE.md Rule 1 forbids hand-typed expected numbers).

---

### `lib/units-isolation.test.ts` (extend; Rule 2 ledger)

**Analog:** itself, lines 429-445:
```ts
const SCREEN_FOLDERS = ["outline", "rocker", "rails", "fins", "volume"];
function findScreenTsxFiles(): string[] {
  const found: string[] = [];
  for (const folder of SCREEN_FOLDERS) {
    const dir = join(REPO_ROOT, "components", folder);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) { ...endsWith(".tsx")... found.push(`components/${folder}/${entry}`); }
  }
  return found;
}
```
Banned list is `BANNED_DISPLAY_FORMATTERS` (:341). **Must differ:** add a describe for `components/guide` (`.ts` and `.tsx`) and for `lib/geometry/guide-*.ts`, banning `formatInchesFraction`, `formatFeetInches`, `formatSignedInchesFraction`, `formatCentimetres`, `formatWholeMm`, `mmToInches`, `inchesToMm` (in components), `mmToCentimetres`, `25.4`, `2.54`; name `guide-push.ts` as the one file allowed `inchesToMm`. NOTE: Phase 17 also appends a describe at the end of this file (adjacent-hunk merge conflict expected, D-19).

---

### The five editor touches (modify; smallest possible, D-19)

Each is: add `"guide"` to the tab id type, one `PanelTab` entry, one panel branch, and a conditional `phonePinned`/`growOnShortScreen`/`compactOnPhone`. `GUIDE` must be the LAST tab.

**TEMPLATE `components/outline/outline-editor.tsx`** — excerpts:
```tsx
const templateTabs = [                                                  // :123
  { id: "viewer" as const, label: "VIEWER" },
  { id: "wings" as const, label: wingCount === 0 ? "ADD WINGS" : `WINGS · ${wingCount}` },
];
...
compactOnPhone="drawing"                                                // :383
{activeTab === "wings" ? (<WingsPanel .../>) : (viewerContent)}        // :388
phonePinned="66dvh"                                                     // :431
```
Change: `type TemplateTab` (:26) gains `"guide"`; append `{ id: "guide" as const, label: "GUIDE" }`; `compactOnPhone={activeTab === "guide" ? "text" : "drawing"}`; `growOnShortScreen={activeTab === "guide"}`; third branch for the guide. Sidebar stays `OutlineControls` on GUIDE (the swap at :344 is `activeTab === "wings"`). The dev footer test `activeTab === "viewer"` (:418) is left alone.

**ROCKER `components/rocker/rocker-editor.tsx`** — two lists, `GUIDE` goes in BOTH:
```tsx
const ROCKER_TABS: readonly PanelTab<RockerTab>[] = [ { id: "viewer", label: "VIEWER" }, { id: "planing", label: "PLANING" }, { id: "datasheet", label: "DATASHEET" } ];   // :104
const ROCKER_TABS_SMALL_SCREEN = [ ... { id: "datasheet", label: "DATASHEET", shortLabel: "DATA" } ];                                                                    // :119
compactOnPhone={activeTab === "datasheet" || activeTab === "planing" ? "text" : "drawing"}   // :316
...ternary chain viewer ? : topView ? : planing ? : <RockerDatasheet/>                        // :320-455
phonePinned="66dvh"                                                                           // :466
```
Change: `RockerTab` (`rocker-live-controls.ts:34`) gains `"guide"`; append `{ id: "guide", label: "GUIDE" }` (no `shortLabel`) to both lists; add `guide` to the `"text"` condition; insert a guide branch BEFORE the final datasheet `else`; add `"guide"` to the `tabs` array in `rocker-live-controls.test.ts:76` (all-live default branch, nothing else changes).

**RAILS `components/rails/rail-band-editor.tsx`** — the pin idiom already exists and is the model for the others:
```tsx
phonePinned={activePage === "instructions" ? "none" : "50dvh"}                               // :288
tabs={[ {id:"viewer",...}, {id:"data",...}, {id:"instructions",...} ]}                       // :338-342
growOnShortScreen                                                                            // :350 (already always on)
compactOnPhone={activePage === "viewer" ? "drawing" : "text"}                                // :354
{activePage === "instructions" && <RailInstructions />}                                      // :586
```
Change: `RailPage` (:20) gains `"guide"`; `phonePinned` becomes `"66dvh"` while guide; add a tab and a `{activePage === "guide" && <GuideTab .../>}` block. After Phase 17 lands, RAILS reads `railsOnBottom` not `effectiveRails`: a one-line merge fix (RESEARCH Finding 10).

**VOLUME `components/volume/volume-estimator.tsx`** — today a single non-interactive tab; add `useState<"estimate"|"guide">` as FINS does (`fin-placement-editor.tsx` `activeTab`/`setActiveTab`):
```tsx
<TabbedPanel tabs={[{ id: "estimate" as const, label: "ESTIMATE" }]} active="estimate"
  panelClassName="overflow-y-auto" compactOnPhone="text"
  trailing={(strip) => <BoardNameTab touchClearance={strip.touchClearance} />}>   // :49-56
...
simpleSidebar
phonePinned="none"                                                                 // :67-68
```
Change: two tabs, `active={activeTab}`, `onSelect={setActiveTab}`, `phonePinned={activeTab === "guide" ? "66dvh" : "none"}`, `growOnShortScreen` while guide. Keep `panelClassName="overflow-y-auto"`. VOLUME's pinned phone GUIDE needs NO shell change: the dormant "simpleSidebar without none" branch (`design-screen-shell.tsx:87-91`) was measured working in Chromium and WebKit (RESEARCH Finding 1). Known knock-on: with `tabs.length > 1`, `interactive` flips to true (`tabbed-panel.tsx:144`), ESTIMATE becomes a `<button role="tab">` and its phone card moves about 9 dots down (D-28).

**FINS `components/fins/fin-placement-editor.tsx`**:
```tsx
type FinTab = "viewer" | "data" | "info";                                                      // :20
const TAB_LABEL: Record<FinTab, string> = { viewer: "VIEWER", data: "DATA", info: "MODEL INFO" };   // :22
const TAB_ORDER: FinTab[] = ["viewer", "data", "info"];                                        // :23
{activeTab === "info" && <FinModelInfo />}                                                      // :159
phonePinned="55dvh"                                                                            // :190
```
Change: `"info"` becomes `"guide"` throughout (`GUIDE`); delete the `FinModelInfo` import (:13); `phonePinned={activeTab === "guide" ? "66dvh" : "55dvh"}`; `growOnShortScreen` while guide. Delete `components/fins/fin-model-info.tsx` only after its 14 notes are in `guide-words.ts` and the words test holds them to the page. Reword the two "MODEL INFO" comments: `tabbed-panel.tsx:125`, `:287`, and `lib/geometry/fins.ts:1389` (`finRoundingNote` stays; the order form uses it).

**Pin literals available:** `PhonePinned = "66dvh" | "55dvh" | "50dvh" | "none"` (`design-screen-shell.tsx:33`), each a complete literal class (:58-62). No shell change.

---

### `components/viewer/tabbed-panel.tsx` trailing wrapper + `tabbed-panel.test.ts:123` (D-21)

Current markup (`tabbed-panel.tsx` ~220-228):
```tsx
<div className="flex flex-none gap-1.5" role={interactive ? "tablist" : undefined}>{tabButtons}</div>
<div className="ml-auto flex min-w-0">{trailing({ touchClearance })}</div>
```
The test pins the exact string (`tabbed-panel.test.ts:123`):
```ts
expect(html).toMatch(/<\/div><div class="ml-auto flex min-w-0"><button>Fish<\/button>/);
```
D-21 ruling: on any strip the name is drawn only when it has about 48 dots of box; below that it is not drawn (never a stub) and the page never scrolls sideways. How (a container query on the trailing wrapper, or `overflow-x: clip` plus a width test) is the planner's choice; whichever is chosen, rewrite line 123's regex in the same change. `overflow-x: clip` keeps `overflow-y` visible so the 44-dot `::after` touch box is not cut (RESEARCH Finding 5). Measured: five ROCKER tabs need 374 dots, four RAILS tabs need 366, tab words not shortened.

---

### `app/globals.css` (one token)

**Analog:** the line it sits beside (`app/globals.css:932`):
```css
--outline-ghost: color-mix(in srgb, var(--surf-ink-muted) 55%, transparent); /* 55%, solid: ... */
```
Add on its own new line beside it (Phase 17 adds nine lines elsewhere in this file; its own line keeps the merge trivial):
```css
--outline-push-line: color-mix(in srgb, var(--surf-ink-muted) 75%, transparent);
```
It lives in the single `:root` drawing block so all four themes follow with no per-theme copy (UI-SPEC §Color; "keep @theme static", memory `shaper-palette-contract`).

---

### `e2e/guide.spec.ts` (new browser test)

**Analog:** `REF/bottom-guide.spec.ts` (Phase 17 reference copy). Copy these helpers (REF lines noted):
- `dismissStrips(page)` (:22-25): `addInitScript` setting `BANNER_DISMISSAL_KEY` (sessionStorage) and `TOOLBAR_TIP_DISMISSAL_KEY` (localStorage).
- `openBottom` → `openPreset(page, presetId)` (:27-48): home page, preset card filtered `Start Shaping|\d\.\d L`, retried with `toPass` until the URL is `/design/outline`, then `goToScreen`. A fresh `/design/outline` opens the stock 72" squash, not a preset, so a preset must be opened from the home card (RESEARCH Finding 7).
- `openGuide(page)` (:51-58):
```ts
const tab = page.getByRole("tab", { name: "GUIDE", exact: true });
await expect(async () => {
  await tab.click({ timeout: 2_000 });
  await expect(guide(page)).toBeVisible({ timeout: 2_000 });
}).toPass({ timeout: 60_000 });
await expect(cards(page)).toHaveCount(EXPECTED_FOR_PAGE);
```
- `columnsAcross` (:90-98): distinct `getBoundingClientRect().left` values in a group = columns (three at 1280, two at 1024, one at 820).
- `readCards` (:103-130): per card `clipped` (scrollWidth/Height > client + 1), `outside` (a part past the card's own edge), `nameMeetsTag`, art size.
- Phone blocks (REF 190-245): upright one-across, and sideways gets the desktop shell; both assert `document.documentElement.scrollWidth <= window.innerWidth`.
- Skip idioms: `test.skip(testInfo.project.name !== "desktop", ...)` / `=== "desktop"` for the phone blocks (projects: `iphone`, `android`, `desktop`).

**Imports:** the specs import app constants from `../components/...` and `../lib/...` directly (REF lines 4-9). Constraint from `e2e/helpers/screens.ts:14-17`: never import `components/site-nav.tsx` (it pulls the DB client into Playwright's Node process); `guide-words.ts` is pure and safe. Helpers: `goToScreen`, `forgetOpenBoardOnEveryLoad` (`e2e/helpers/open-board.ts`, needed before any second preset), `openSettingsMenu` (`settings.ts`).

**Metric** (`e2e/imported-readout.spec.ts:46-48`):
```ts
async function setMetricUnits(page: Page) {
  await page.addInitScript((key) => { window.localStorage.setItem(key, "metric"); }, "shaper-units");
}
```
**Must differ / must prove (R13):** five pages x GUIDE last tab, count equals the words module's count per page, tag follows the board (Shortboard vs Fish), switching boards redraws, a card is never a control, Metric shows no inch figure on a card (use `innerText`, not `textContent`, RESEARCH Pitfall 9), at 360/375/390/412/430/820 no sideways scroll and no name stub, VOLUME's phone card at least 66dvh - 41, FINS lost MODEL INFO. Port: `PW_PORT=<free>`; 3000/3005 belong to the founder.

---

### Existing specs that change on purpose (rewrite)

**`e2e/board-name-band.spec.ts`** (D-21):
- `TAPPABLE` at :247 currently `["TEMPLATE","ROCKER","RAILS","FINS"]` — add `"VOLUME"`; `stripHeightOn` (:401) `TAPPABLE.includes(label) || label === "RAILS" ? 31 : 21` then reads 31 for VOLUME.
- p1 (:409-443) runs ROCKER and RAILS at 360/375 through `expectBandSound`; the `label === "ROCKER"` ellipsis assertions (`m.ellipsis === "ellipsis"`, `textOverflowing`) change: below ~48 dots the name is simply not drawn.
- p1b (:445-453) currently asserts `Untitled` whole on ROCKER at 360 (`toHaveText("Untitled")`) — cannot hold; invert it to the D-21 rule.
- d1 (:481-) at 820 for ROCKER and RAILS.

**`e2e/phone-chrome.spec.ts`**:
- VOLUME block (:636-760): `label()` finds ESTIMATE as `span` — `page.locator("main > div").first().locator("span").filter({ hasText: "ESTIMATE" })`; becomes `getByRole("tab", { name: "ESTIMATE" })`; label top 2 / gap 10 / main bottom 13 shift by the 9-dot touch clearance.
- FINS `infoTab` blocks at :807, 853, 897, 935: `page.getByRole("tab", { name: "MODEL INFO" })` then `assertTabTouchBox(infoTab, bounds)` at :831, 877, 915, 953 — repoint to the GUIDE tab.
- `ALL_FIVE_SCREENS` (:1173-1180): `volume` `tabs: []` becomes `["ESTIMATE","GUIDE"]`; `fins` `["VIEWER","DATA","MODEL INFO"]` becomes `["VIEWER","DATA","GUIDE"]`; the others gain `"GUIDE"`.

**`e2e/volume-fins-panels.spec.ts`**: delete or replace the describe "FINS' MODEL INFO — the side panel's own headings" (:287-313; also the header comments at :14 and :126). Its `tab.click()` after the React-fiber poll
```ts
await expect.poll(() => tab.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber")))).toBe(true);
```
is a reusable idiom for opening a tab before React owns it.

**`components/rocker/rocker-live-controls.test.ts:76`**: `const tabs: RockerTab[] = ["viewer", "planing", "datasheet", "topView"];` add `"guide"`.

**Baselines:** `e2e/desktop-baseline.spec.ts-snapshots/` holds six PNGs; re-record the five (`outline-`, `rocker-`, `rails-`, `volume-`, `fins-desktop-desktop-darwin.png`; 3D untouched), `maxDiffPixels: 100`, from the main checkout, after reading `diff.png`. Phase 17 re-records all six too, so whichever lands second re-records (binary: never merge).

---

## Shared Patterns

### Words are the founder's, tested against his page
**Source:** `REF/bottom-guide-words.test.ts` 18-31, 68-93. **Apply to:** `guide-words.ts`, `guide-copy.ts`, every component that prints a word. Components print only module strings; the module is held line for line to `18-GUIDE-WORDS.md` by a unit test that finds the page by name under `.planning/` (the page moves to the archive when the phase is done).

### Rule 2: every figure through `lib/geometry/units.ts` / `measure-display.ts`
**Source:** `measure-display.ts` 63-95, 177-212, 253. **Apply to:** all tags, captions, dimension labels, the Convention grain, VOLUME's litres. `use-print-fit.ts` and `order-form.css` are the only paper-size exceptions; neither applies here. Dims print cm to one decimal, marks whole mm; a pushed mark in Metric is a round mm of its own family (D-25), a rule of thumb in prose is a second piece of copy, not a conversion (D-22).

### Drawing tokens and dashes
**Source:** `app/globals.css` ~925-942. **Apply to:** `guide-cartoon.tsx`. Use `--outline-board-fill`, `--outline-ink`, `--outline-station-line`, `--outline-ghost`, `--outline-stringer-dash` (16 4 4 4), `--outline-widepoint-dash` (2 3), `--outline-station-dash` (5 4), `--outline-dim-ink`, `--outline-callout-label`, plus the new `--outline-push-line`. Lines keep `vectorEffect="non-scaling-stroke"`.

### Informational only
**Source:** `REF/bottom-guide-words.test.ts` 223-226. **Apply to:** `guide-card.tsx`, `guide-cartoon.tsx`: no `<button`, `role="button"`, `onClick`, `onPointer`, `tabIndex`.

### Screen switches (CLAUDE.md): never conflated
Width picks layout (`max-shell:`), pointer picks control size (`coarse:`), height picks short-screen rules, written inline `[@media(max-height:500px)]`. The card uses `max-shell:p-2 [@media(max-height:500px)]:p-2` as in `REF/bottom-guide.tsx:107`. Do not add a "phone" variant. Where JavaScript must read these, use `use-viewer-media.ts` (`useBelowShellWidth`, `useShortScreen`), never `window.`/`matchMedia` in guide files.

### Memo key discipline
A per-page stable store object keyed into a `WeakMap` (RESEARCH Pattern 1 table): TEMPLATE `outlineGeometry`; ROCKER a `useMemo`'d `{ outline, rocker, foil, blank }`; RAILS `effectiveRails`; VOLUME `effectiveVolume`; FINS `effectiveFins` + `finImportedTail`. Maths cost is 3-21 ms per page (RESEARCH Finding 8), so lazy drawing is NOT built unless the real GUIDE exceeds about 150 ms first paint under a 4x throttle (D-28).

### Phase 17 coordination (D-19)
Keep new code in `components/guide/` and `lib/geometry/guide-*.ts`; touch `fin-placement-editor.tsx`, `rail-band-editor.tsx`, `globals.css`, `units-isolation.test.ts`, `phone-chrome.spec.ts`, `board-name-band.spec.ts` minimally and expect merge conflicts there. Read constants from viewers; import nothing from `fin-viewer.tsx` or `rail-section-plot.tsx` internals beyond the exported `RAIL_SEGMENT_COLORS`/`RAIL_APEX_CENTER_COLOR`.

## No Analog Found

| File / need | Role | Data Flow | Reason |
|---|---|---|---|
| Strip + window + detail cartoon frame (`guide-draw.ts`, `guide-cartoon.tsx` painters for TEMPLATE, ROCKER, RAILS, VOLUME, FINS) | component + utility | transform | Only a one-page cartoon exists (Phase 17, BOTTOM, a ref copy). Use the sketch source `.planning/sketches/022-page-guides/sketch-source.tar.gz` (`pages.js` `cardFrame`, `*Cartoon`) plus `pages-data.ts` for the pushes. |
| Metric sayings pair function (`guideLines`) | utility | transform | Phase 17 has a one-phrase version (`guideHow`, `GUIDE_SPACING`), not copied here; this phase needs ~40 pairs. Spec: `REF/bottom-guide-words.test.ts` 122-155. |
| Container-query or clip rule for the board's name (D-21) | component | request-response | No existing name-gives-way rule; planner's choice (RESEARCH Finding 5). |
| `useDeferredValue` on a slider-driven GUIDE | component | event-driven | Not in the codebase yet; only if a measured slider tick drops frames (RESEARCH Finding 8). |

## Metadata

**Analog search scope:** `components/{viewer,outline,rocker,rails,volume,fins,design}`, `lib/geometry`, `lib/units-isolation.test.ts`, `e2e/` (specs and helpers), `app/globals.css`, plus the five Phase 17 reference copies in the scratchpad.
**Files read:** about 30 (full or targeted ranges). **Pattern extraction date:** 2026-11-09.
