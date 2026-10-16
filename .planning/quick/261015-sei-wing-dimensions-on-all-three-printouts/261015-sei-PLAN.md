---
phase: quick-261015-sei
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/wing-figures.ts
  - lib/geometry/wing-figures.test.ts
  - components/template/build-overview-pdf.ts
  - components/template/build-overview-pdf.test.ts
  - lib/geometry/template.ts
  - lib/geometry/template.test.ts
  - components/template/build-template-pdf.ts
  - components/template/build-template-pdf.test.ts
  - components/template/build-strip-pdf.test.ts
  - components/template/export-preview-dialog.tsx
  - .planning/quick/261015-sei-wing-dimensions-on-all-three-printouts/261015-sei-SUMMARY.md
autonomous: true
requirements: [QT-261015-sei]
estimate:
  # One sonnet executor in its own git worktree. Three tasks: the tracer (one wing-figures helper, the Overview
  # Sheet's wing lines, the dialog hands them over); the dashed wing lines on both full-size prints with the
  # label rule; the wing lines in the name box, the gates, the pictures and the SUMMARY. Every layout figure
  # below was measured at plan time in scratch copies (F1–F8), so the executor confirms rather than discovers.
  # Calibration: factor 1, 0 samples.
  tokens: 250000
  raw_tokens: 250000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "On a winged board the Overview Sheet's spec list carries each wing right after Swallow Depth / Diamond Depth and before Tail Angle: a head line `Wing 1 · Fin: 3/16\" @ 7 1/2\"` (or `Wing 2: …` when placed by hand), then one indented line per card row — `Run: 1/4\"`, `Radius: 0\"`, and `Offset: 0\"` only when the wing is locked; in Metric the position reads centimetres to one decimal and the depth, run, radius and offset whole millimetres (`Wing 1 · Fin: 5 mm @ 19.1 cm`) (D1, D3)."
    - "Every wing figure printed anywhere is the WINGS card's own figure: the wings the board draws (`placedWings`), the radius actually drawn (`effectiveWingRadius`), `· Fin` and the offset only when `wingLockEdge` is not null — computed once by the export dialog and handed to all three printouts (D1)."
    - "On the Full Sized Template and the Paper Saver a dashed line crosses the board at each wing's station, from the stringer to the curve, in the station-mark dash and weight, labelled `Wing 1 — 7 1/2\" from tail` (Metric `Wing 1 — 19.1 cm from tail`) (D2)."
    - "A wing's label never prints on another label: on the Full Sized Template a wing and a mark within 10 mm of each other take their labels on opposite sides of the pair (the Midlength's wing locked exactly on the 12\" line reads under it, Tail 12\" above it), and on the Paper Saver the strip's own row rule keeps every wing row 6 mm clear of every registration and mark row — both proven by sweeps over every wing position on every preset and both papers (D2)."
    - "Both full-size prints list each wing in the board's name box under the dimensions row, one paragraph per wing (`Wing 1 · Fin: 3/16\" @ 7 1/2\"  ·  Run 1/4\"  ·  Radius 0\"  ·  Offset 0\"`), wrapped only between figures so a number never parts from its unit; the box still sits inside the outline with 4 mm of daylight and page 1's furniture never overlaps (D2)."
    - "A board with no wings prints exactly as today: every frozen digest in `lib/geometry/template.test.ts` and every existing test in the four print test files passes with no existing line edited (D4)."
  artifacts:
    - path: "lib/geometry/wing-figures.ts"
      provides: "each wing's printed figures — the WINGS card's own rule — and its printed name"
      contains: "export function wingFigures"
    - path: "lib/geometry/template.ts"
      provides: "optional wing1/wing2 marks, their labels, and the wing label rule on the tiled template"
      contains: "function resolveWingLabelCollisions"
    - path: "components/template/build-template-pdf.ts"
      provides: "the name box's wing lines, wrapped between figures; a wing mark's distance-from-tail label"
      contains: "export function wrapItemsToWidth"
    - path: "components/template/build-overview-pdf.ts"
      provides: "the Overview Sheet's wing lines in the spec list"
      contains: "wingPrintName"
    - path: "components/template/export-preview-dialog.tsx"
      provides: "one wingFigures array and one winged marks object handed to all three printouts"
      contains: "wingFigures("
  key_links:
    - from: "components/template/export-preview-dialog.tsx"
      to: "lib/geometry/wing-figures.ts"
      via: "wingFigures(placedWings(outline.wings ?? [], outlineGeometry), wingFinEdges, system) — once, for all three printouts"
      pattern: "wingFigures\\(placed"
    - from: "components/template/export-preview-dialog.tsx"
      to: "lib/geometry/template.ts (computeTemplateMarks)"
      via: "the placed wings' stations become the wing1/wing2 marks both full-size prints draw"
      pattern: "computeTemplateMarks\\(outlineGeometry, placed\\)"
    - from: "components/template/build-template-pdf.ts (nameBlockContent)"
      to: "dims.wings"
      via: "the wing lines join the dims row's lines, so both builders' box height and furniture maths see them"
      pattern: "dims\\.wings"
    - from: "lib/geometry/template.ts (markPlacements)"
      to: "resolveWingLabelCollisions"
      via: "the last step of markPlacements; returns its input untouched when no placement is a wing"
      pattern: "resolveWingLabelCollisions\\("
---

<objective>
The founder printed a winged swallow and asked: "I also want to add the wing dimensions on all 3 export template
options." In a shaper's words: the Overview Sheet lists each wing's numbers the way its card on the WINGS close-up
reads them; the Full Sized Template and the Paper Saver put the same numbers in the board's name box and draw a dashed
line across the board at each wing, labelled with its distance from the tail, so the shaper can mark it on the foam.
A board with no wings prints exactly as it does today.

Purpose: the founder's rulings of 2026-10-15 (the brief, rulings 1–4 → D1–D4 below). The founder looks at pictures of
all three printouts for a winged Fish before anything is pushed.

Output: one pure helper (`lib/geometry/wing-figures.ts`), wing marks and their label rule in `lib/geometry/template.ts`,
the name box and Overview wing lines in the two jsPDF builders, the export dialog wiring, tests, and a set of pictures.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<decisions>
The founder's rulings (asked and answered 2026-10-15 — locked; the brief numbers them 1–4):

- **D1 — Which numbers: "Same as WINGS card."** Each wing prints exactly what its card on the WINGS close-up reads
  (`components/outline/wing-close-up.tsx` lines 371–391): name `WING n`, or `WING n · FIN` when
  `wingLockEdge(w, i, edges) !== null`; head `${formatMark(w.depth)} @ ${formatDim(w.station)}`; RUN
  `formatMark(w.run)`; RADIUS `formatMark(effectiveWingRadius(w))` (the radius drawn, never the asked one); OFFSET
  `formatSignedMark(w.finOffset)` only when locked. The wings are `placedWings(outline.wings ?? [], geometry)`. Units
  as on the card: the POSITION is a dim (`formatDim`, cm to one decimal in Metric), depth/run/radius/offset are marks
  (whole mm).
- **D2 — Full Sized Template and Paper Saver: "Name box + mark line."** The wing numbers go in the board's name box,
  under the existing dims row; PLUS a dashed line across the board at each wing's `station`, stringer to curve,
  labelled like the Nose 12" / Wide point marks — `Wing 1 — 20 1/2" from tail` (Metric `Wing 1 — 52.1 cm from
  tail`) — in the station-mark grammar (`MARK_STATION_DASH_PATTERN`, `MARK_TICK_LINE_WEIGHT_MM`).
- **D3 — Overview Sheet:** wing lines in the spec list (`overviewSpecLines`), right after Swallow Depth / Diamond Depth,
  before Tail Angle.
- **D4 — A board with no wings prints exactly as today:** every frozen digest/fingerprint in
  `lib/geometry/template.test.ts` and the builders' byte-identical tests stay green UNEDITED.

The planner's choices (Claude's discretion — each one is for the founder to confirm from the pictures):

- **P1 — Words.** The printouts use the card's words in their own Title Case: `Wing 1 · Fin`, `Wing 2`, `Run`, `Radius`,
  `Offset` (the card's caps are the card's dress; the spec list and the dims row are Title Case). The mark label is
  `Wing 1 — 7 1/2" from tail` (no `· Fin` on the foam line — D2's own example).
- **P2 — Overview layout.** A head line `Wing 1 · Fin: 3/16" @ 7 1/2"`, then one line per card row, each indented by
  two no-break spaces: `  Run: 1/4"`, `  Radius: 0"`, `  Offset: 0"` (locked only). Mirrors the card row for row and
  never wraps on a real board (F2).
- **P3 — Name box layout.** One paragraph per wing: the figures `Wing 1 · Fin: 3/16" @ 7 1/2"`, `Run 1/4"`,
  `Radius 0"`, `Offset 0"` (locked only) joined by the dims row's own `  ·  `, wrapped only BETWEEN figures. Word
  wrapping (today's `wrapTextToWidth`) splits `Radius 37` / `mm` and `Radius 1` / `7/16"` (measured), so it is not used
  for these lines. Each value keeps its own unit — a wing line mixes a cm position with mm marks (the brief's units note;
  Rule 2's "unit once per line" is about the all-cm dims row).
- **P4 — Marks.** `TemplateMarks` gains optional `wing1` / `wing2` keys, present only on a winged board, so every
  existing per-page machinery (row-overlap duplicates, multi-column line segments, the strip's label rows and its
  name-box scan) carries the wings for free; absent keys leave every frozen digest byte-identical. Wing lines draw in
  the station dash (only `widepoint` takes the dotted one).
- **P5 — Tiled-template label rule** (`resolveWingLabelCollisions`, the last step of `markPlacements`): a wing and the
  nearest other mark within `MARK_LABEL_COLLISION_THRESHOLD_MM` (10 mm) take their labels on opposite sides of the
  pair — the nose-ward one keeps its label above its line, the tail-ward one (the wing when level) draws its label
  one threshold under its own line — then a guard walks each wing label further out until it is a threshold clear of
  every other label on the page. Measured (F6): 0 label-on-label overlaps in 24,640 cases.
- **P6 — Paper Saver labels.** The strip's existing `stripLabelRows` settle places wing rows like any mark row
  (measured clean, F6); no new strip rule.
- **P7 — The WINGS card is not touched.** This task changes no screen. `wingFigures` carries the card's rule and a test
  pins it against the card's own formula calls; making the card read `wingFigures` too is a possible follow-up.
- **P8 — One computation.** The export dialog computes `placedWings(...)`, `wingFigures(...)` and the winged marks once
  and hands the same objects to all three printouts, so the three can never disagree with each other.
</decisions>

<measured_facts>
Measured at plan time with `npx tsx` scratch scripts against today's code (scratch copies of the two builders with a
hook that added wing lines to the name box). Confirm, don't re-explore.

- **F1 — The founder's test board.** The Fish preset with two wings added the way the store adds them (`nextWing` twice,
  `resolveWingStations(outline, preset.fins, true)`, fins on Import Template): wing 1 locked to the front fins at
  190.5 mm — `3/16" @ 7 1/2"`, Run `1/4"`, Radius `0"`, Offset `0"` (Metric `5 mm @ 19.1 cm`, `6 mm`, `0 mm`, `0 mm`);
  wing 2 by hand at 114.3 mm — `3/16" @ 4 1/2"`, Run `1/2"`, Radius `1 7/16"` (Metric `5 mm @ 11.4 cm`, `13 mm`,
  `37 mm`). Fin edges `{ front: 190.5, rear: null }`. Other presets: Shortboard wings at 11" (locked) and 8";
  Midlength (a quad) wing 1 locked at exactly 12" (304.8 mm, ON the Tail 12" line) and wing 2 locked to the rear fins
  at 6 1/4"; Longboard (single fin) both by hand at 11" and 8". Every preset's tail knot (`tailPodStation`) is at 0.
- **F2 — Overview spec column.** It has no fixed height: it runs down the left edge to the bottom margin, beside the
  drawing (which sits to its right and is unaffected). Today the Fish's list wraps to 18 lines (Imperial, board name
  set) — its last baseline at 122 mm; P2's seven wing lines bring it to 157 mm, against 269.4 mm (Letter) and 287 mm
  (A4) of room. Worst wing figures add at most eight lines (40 mm). Courier 9 pt holds 31 characters in the 60 mm
  column; every P2 row fits; a head line wraps once only past 31 characters (a 15/16"-deep locked wing at a 33 15/16"
  station: `Wing 2 · Fin: 15/16" @ 33 15/16"` is 32). Today's existing lines already wrap
  (`Nose Angle: 70°  ·  Fullness:` / `48%`) — unchanged.
- **F3 — No-break indent.** Two U+00A0 characters render as blank space in jsPDF's courier (picture checked), measure
  600 units each (`  Run: 1/4"` = 20.95 mm = 11 characters), and survive `wrapTextToWidth` (it splits on U+0020 only).
  `doc.output()` carries the drawn strings verbatim (e.g. `Wing 2: 3/16" @ 4 1/2"`, `Run: 1/4"`, `Wing 1 · Fin`), so
  a test can assert on it; avoid asserting across an em dash.
- **F4 — Name box height.** Helvetica 8 pt in the 68 mm text width. P3's figure-wrapped lines are at most TWO per wing
  even at the worst figures (Imperial `15/16" @ 33 15/16"`, `1 15/16"`, `64 1/16"`, `-2 15/16"`; Metric
  `25 mm @ 137.2 cm`, `51 mm`, `1626 mm`, `-76 mm`). The Fish: Imperial +3 lines (25.6 → 38.2 mm), Metric +4 lines
  (21.4 → 38.2 mm). Exact Metric wing 1 lines: `Wing 1 · Fin: 5 mm @ 19.1 cm  ·  Run 6 mm` / `Radius 0 mm  ·  Offset 0 mm`.
  Exact Imperial: `Wing 1 · Fin: 3/16" @ 7 1/2"  ·  Run 1/4"  ·  Radius 0"` / `Offset 0"`, and wing 2 on one line
  `Wing 2: 3/16" @ 4 1/2"  ·  Run 1/2"  ·  Radius 1 7/16"`.
- **F5 — Furniture still fits.** Full Sized Template page 1, every preset × Letter/A4 × both systems with up to SIX
  extra lines (more than the worst case's four): no two furniture boxes overlap, all inside the alignment box, the name
  box on page 1 with ≥ 4.4 mm of daylight to the curve. Paper Saver: every preset keeps its name box on page 1 except
  the Shortboard, whose box moves to page 2 (index 1) on A4 from three wing lines and on Letter from four — the
  strip's existing narrow-nose rule (`stripFurniture` scans on), contained in its page and clear of the scale square.
  The Fish stays on page 1 on both papers in both systems. Wings never reach page 1 of the tiled template: a wing sits
  at most at the centre or the widepoint (`wingPositionTop`) and page 1 covers only the nose-most 259 mm (Letter) /
  277 mm (A4) of a board at least 60" long.
- **F6 — Where the wing labels land.** Tiled, Fish: Letter puts both wings on page 13 (index 12, 0–247 mm) with only the
  Tail Block label (at 0); A4 puts wing 1 on page 11 (index 10) 114 mm from Tail 12" — no collision. The Midlength's
  wing 1 sits exactly on Tail 12" — the realistic collision. The tiled template has no registration labels (only page
  labels in the bottom margin). Paper Saver, Fish: Letter puts both wings on page 9 (index 8) between registration rows
  at 75.0 and 252.2 mm; A4 puts wing 2 on page 10 (index 9), 4.8 mm from its nose registration row at 122.1 mm — the
  existing settle moves the wing row. Sweeps: P5 over 4 presets × 2 papers × wing 1 every 1/16" from 2" to the top ×
  wing 2 absent or 1/2", 1", 2", 3" behind = 24,640 cases → 0 label-on-label overlaps, 0 lines through a wing's label;
  the only residual is 24 cases (wing 1 within 10 mm nose-ward of Tail 12" AND wing 2 within 10 mm tail-ward of it)
  where wing 2's line crosses Tail 12"'s flipped label — accepted, labels still never touch. Strip (P6): 19,800 cases →
  0 rows closer than 6 mm, 0 rows off their page. Both sweeps run in about a second.
- **F7 — The type trap.** `components/template/build-strip-pdf.test.ts` lines 318 and 335 index `markLabels(...)` with a
  segment's `mark` inside a template literal. If `markLabels` returned `Record<StationMarkName, string>`, tsc would
  fail there (TS7053). Returning `Record<StationMarkName, string> & Partial<Record<WingMarkName, string>>` compiles
  (checked under strict: a template literal accepts `string | undefined`) while the record still holds only the five
  station names, so the 07-01 `toEqual` test (template.test.ts line 352) passes unedited.
- **F8 — Import cycle.** `lib/geometry/outline.ts` imports `applyWings` from `wings.ts`, and `measure-display.ts`
  imports `outline.ts` — so `wings.ts` must not import `measure-display.ts`. The helper lives in a new file,
  `lib/geometry/wing-figures.ts`, which imports both; `template.ts` may import it (no cycle).
</measured_facts>

<interfaces>
New and changed signatures (the executor writes the bodies; doc comments in the files' own voice).

```typescript
// lib/geometry/wing-figures.ts (NEW — imports ./measure-display, ./wings, ./units types only)
export interface WingFigures {
  /** 1 or 2 — the wing's number on its WINGS card. */
  number: number;
  /** True when the wing follows a fin's trailing edge (`wingLockEdge(w, i, edges) !== null`). */
  locked: boolean;
  /** Where the step leaves the curve, from the tail. */
  station: Mm;
  /** The card's head: `3/16" @ 7 1/2"` / `5 mm @ 19.1 cm`. */
  depthAtPosition: string;
  run: string;
  /** The radius actually drawn (`effectiveWingRadius`). */
  radius: string;
  /** `formatSignedMark(finOffset)` when locked, else null. */
  offset: string | null;
}
export function wingFigures(wings: readonly Wing[], edges: WingFinEdges, system: UnitsSystem): WingFigures[];
export function wingPrintName(wing: Pick<WingFigures, "number" | "locked">): string; // "Wing 1 · Fin" | "Wing 2"

// lib/geometry/template.ts
export interface TemplateMarks { /* …existing five… */ wing1?: Mm; wing2?: Mm }
export type WingMarkName = "wing1" | "wing2";
export type StationMarkName = Exclude<keyof TemplateMarks, WingMarkName>;
export function isWingMark(mark: keyof TemplateMarks): mark is WingMarkName;
export function markLabel(mark: keyof TemplateMarks, system: UnitsSystem): string; // "Wing 1" for wing1
export function wingMarkDistanceText(station: Mm, system: UnitsSystem): string;    // `${formatDim(station)} from tail`
export function markLabels(system: UnitsSystem): Record<StationMarkName, string> & Partial<Record<WingMarkName, string>>;
export function computeTemplateMarks(geometry: OutlineGeometry, wings?: readonly { station: Mm }[]): TemplateMarks;
function resolveWingLabelCollisions(placements: TemplateMarkPlacement[]): TemplateMarkPlacement[]; // module-private

// components/template/build-template-pdf.ts
// BuildTemplatePdfOptions["dims"] gains:  wings?: readonly WingFigures[];
export function templateNameBlockWingItems(wing: WingFigures): string[];
export function wrapItemsToWidth(items: readonly string[], separator: string, maxWidthMm: number, doc: jsPDF): string[];

// components/template/build-overview-pdf.ts
// BuildOverviewPdfOptions gains:  wings?: readonly WingFigures[];
export function overviewSpecLines(
  outline: OutlineSpec, geometry: OutlineGeometry, system: UnitsSystem, wings?: readonly WingFigures[],
): string[];
```

Existing pieces this plan builds on (read, don't change): `placedWings`, `effectiveWingRadius`, `wingLockEdge`,
`NO_FIN_EDGES`, `wingRadiusTop`, `type Wing`, `type WingFinEdges` (`lib/geometry/wings.ts`); `formatDim`,
`formatMark`, `formatSignedMark` (`lib/geometry/measure-display.ts`); `wrapTextToWidth`, `nameBlockContent`,
`templateMarkDimensionText`, `templateMarkLabelText`, `markLabelRect`, `templatePageZeroFurnitureRects`,
`templatePageZeroBoxRect`, `rectsOverlap`, `rectContains` (`build-template-pdf.ts`); `stripFurnitureRects`,
`stripPrintableRect` (`build-strip-pdf.ts`); `useDesign().wingFinEdges` (`components/design/design-store.tsx` line 446).
</interfaces>

<context>
@.planning/quick/261015-sei-wing-dimensions-on-all-three-printouts/261015-sei-BRIEF.md
@CLAUDE.md

Read only the ranges named (the files are long):
- `components/outline/wing-close-up.tsx` lines 360–395 — the card's figures (D1's source; do not edit this file).
- `lib/geometry/wings.ts` lines 60–125, 240–300, 470–480 — `Wing`, `WingFinEdges`, `NO_FIN_EDGES`, `wingLockEdge`,
  `effectiveWingRadius`, `placedWings`.
- `lib/geometry/template.ts` lines 85–470 (marks, labels, placements, the centre/widepoint rule, line segments) and
  1270–1455 (`stripMarkSegments`, `stripLabelRows`).
- `components/template/build-template-pdf.ts` lines 46–180 (options and constants), 340–465 (`drawMarks`, label text,
  `markLabelRect`), 515–540 (`wrapTextToWidth`), 700–760 (dims row, `nameBlockContent`), 940–1070 (furniture rects).
- `components/template/build-strip-pdf.ts` lines 46–60 and 300–380 — read only: it draws `nameBlockContent`'s lines and
  `stripLabelRows`' rows, so it needs no edit.
- `components/template/build-overview-pdf.ts` lines 25–40 and 85–130 (`overviewSpecLines`), 330–360 (the spec column).
- `components/template/export-preview-dialog.tsx` lines 139–215.
- `lib/geometry/template.test.ts` lines 1–60 (imports, `PAPERS`) and 120–370 (the frozen pins — never edit).
- `components/template/build-template-pdf.test.ts` lines 1–60 (helpers) and 744–830 (containment and overlap tests to
  mirror); `components/template/build-strip-pdf.test.ts` lines 1–64 and 181–220; `components/template/build-overview-pdf.test.ts`
  lines 1–22 and 86–125.
</context>

<executor_environment>
These rulings come from the orchestrator. Follow them as written.
- **Where to work.**
  - Agent worktree only (branch `agent-*`); never touch the main checkout, and never `cd` into a worktree from the
    main checkout's shell (use `git -C`).
  - `ln -s /Users/kontoes/Code/shaper/node_modules node_modules` if it is missing; unlink it before the worktree is
    cleaned up.
  - Run `npx next typegen` before `npx tsc --noEmit`.
  - `npm run build` does not work in a worktree (the orchestrator runs it on main). No dev server and no Playwright:
    this task changes printouts only (jsPDF + pure geometry), never a screen. Never start a dev server from
    `/Users/kontoes/Code/shaper` and never touch its `.next/dev/lock`.
- **Gates.** Inside the worktree: `npx vitest run` (the whole unit suite); `npx next typegen && npx tsc --noEmit`;
  `npm run lint`. Read each command's exit status in its own call before reporting a pass.
- **No checkpoints.** No human-verify checkpoint: the founder looks at the pictures through the orchestrator.
- **Branded lengths.** Route every length through `mm()` / `inchesToMm()`, tests included (vitest does not type-check).
  Every number a shaper reads goes through `lib/geometry/measure-display.ts` (Rule 2); never a bare 25.4 or 10.
- **Frozen pins (D4).** Never edit an existing line in `lib/geometry/template.test.ts`,
  `components/template/build-template-pdf.test.ts`, `components/template/build-strip-pdf.test.ts` or
  `components/template/build-overview-pdf.test.ts` — add new `describe` blocks at the END of each file and new imports
  at the top only. If an existing test fails, the change is wrong, not the test. Expected deliberate updates to
  existing tests: NONE (F7 is why `markLabels` takes the intersection type).
- **Scratch files.** A scratch `.ts` that needs the `@/` alias goes in the worktree ROOT and is deleted before every
  commit; never leave a `.js`, `.mjs` or `.ts` under `.planning` (tsc, lint and Tailwind read them). Pictures go in
  your session scratchpad directory, never in the repo.
- **Commits.**
  - Each task is its own commit, with a plain-English subject about what changes on the printed page (subjects given
    in each task). No `feat:`-style prefix.
  - Every message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Stage files by name, never with a stage-everything command.
- **Scope.** Stay inside `files_modified`. A one-line compile fix elsewhere is allowed if documented in the SUMMARY.
- **The SUMMARY.** Commit `261015-sei-SUMMARY.md` (frontmatter `status: complete`) inside the worktree as the last
  commit, subject `docs(quick-261015-sei): summary — wing dimensions on all three printouts`. Do not edit STATE.md or
  ROADMAP.md.
- **Code comments.** Follow the surrounding files' voice: plain English citing the decision (D1–D4, P1–P8 here), the
  quick id 261015-sei and the date 2026-10-15, the founder referred to as they/them, their words quoted where a rule
  comes from them.
</executor_environment>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1 (tracer): one wing-figures helper, the Overview Sheet's wing lines, handed over by the export dialog</name>
  <files>lib/geometry/wing-figures.ts, lib/geometry/wing-figures.test.ts, components/template/build-overview-pdf.ts, components/template/build-overview-pdf.test.ts, components/template/export-preview-dialog.tsx</files>
  <read_first>
    - components/outline/wing-close-up.tsx lines 360–395 (D1's card figures — the rule wingFigures carries)
    - lib/geometry/wings.ts lines 60–125, 240–300, 470–480
    - components/template/build-overview-pdf.ts lines 25–40, 85–130, 330–360
    - components/template/build-overview-pdf.test.ts lines 1–22 and 86–125
    - components/template/export-preview-dialog.tsx lines 139–215
  </read_first>
  <behavior>
    - wingFigures on a locked wing 1 (station 7 1/2", depth 3/16", run 1/4", radius 0, lock "front-trailing", finOffset 0) with edges { front: 7 1/2", rear: null }: number 1, locked true, depthAtPosition `3/16" @ 7 1/2"`, run `1/4"`, radius `0"`, offset `0"`; Metric `5 mm @ 19.1 cm`, `6 mm`, `0 mm`, `0 mm`.
    - Every field equals the card's own formula call on the same wing (formatMark(depth) + " @ " + formatDim(station), formatMark(run), formatMark(effectiveWingRadius(w)), formatSignedMark(finOffset)) in both systems.
    - The radius is the one drawn: a wing asking for 4" of radius on a 1/2" run, 3/16" depth prints formatMark(effectiveWingRadius(w)), not formatMark(w.radius).
    - Lock edge cases: "front-trailing" at index 0 with edges.front null → locked false, offset null; "rear-trailing" at index 1 with edges.rear set → locked true; "rear-trailing" at index 0 → locked false; a by-hand wing (lock null) → offset null. finOffset +1/4" → `+1/4"`, −1/2" → `-1/2"`, Metric +1/4" → `+6 mm`.
    - wingPrintName: `Wing 1 · Fin` for a locked wing 1, `Wing 2` for a by-hand wing 2. An empty list gives [].
    - overviewSpecLines(outline, geometry, system) and overviewSpecLines(outline, geometry, system, []) equal today's output for every preset (no wing lines).
    - For the winged Fish (F1's two wings), the lines strictly between the `Swallow Depth:` line and the `Tail Angle:` line are exactly: `Wing 1 · Fin: 3/16" @ 7 1/2"`, NB+`Run: 1/4"`, NB+`Radius: 0"`, NB+`Offset: 0"`, `Wing 2: 3/16" @ 4 1/2"`, NB+`Run: 1/2"`, NB+`Radius: ` + figures[1].radius — where NB is two U+00A0. Metric reads `Wing 1 · Fin: 5 mm @ 19.1 cm` and `Run: 6 mm`.
    - A diamond-tail board's wing lines follow its `Diamond Depth:` line and precede `Tail Angle:`.
    - Every wing line of the Fish survives wrapTextToWidth at 60 mm in courier 9 pt unchanged (one line each, indent intact), both systems.
    - buildOverviewPdf with the Fish's wings builds one page whose doc.output() contains `Wing 2: 3/16" @ 4 1/2"` and `Run: 1/4"`.
  </behavior>
  <action>
    Write the tests first (RED), then the code (GREEN), per the behavior list.

    1. Create `lib/geometry/wing-figures.ts`, pure (no React, browser or database import), importing only
       `./measure-display`, `./wings` and `./units` (types). Never import it from `wings.ts` or `outline.ts` (F8 — the
       cycle). Export `WingFigures`, `wingFigures(wings, edges, system)` and `wingPrintName(wing)` exactly as in
       `<interfaces>`. `wingFigures` maps each wing at index i to its figures per D1: number i + 1; locked =
       `wingLockEdge(w, i, edges) !== null`; station = `w.station`; depthAtPosition = formatMark of the depth, then
       ` @ `, then formatDim of the station; run = formatMark of the run; radius = formatMark of
       `effectiveWingRadius(w)`; offset = formatSignedMark of `w.finOffset` when locked, else null. It takes the wings
       as the board draws them (`placedWings`) and does not place them again. `wingPrintName` returns `Wing n`, plus
       ` · Fin` when locked (P1). The file's header comment names `components/outline/wing-close-up.tsx`'s card as the
       source of the rule and says the card itself is left as it is (P7).
    2. Create `lib/geometry/wing-figures.test.ts` with the wingFigures / wingPrintName behaviors above. Build every
       length with `inchesToMm` / `mm`; compare against the measure-display calls rather than hand-typed numbers, plus
       the literal display strings named in the behavior list.
    3. In `components/template/build-overview-pdf.ts`: add the optional `wings?: readonly WingFigures[]` field to
       `BuildOverviewPdfOptions` (documented: the export dialog always passes it; absent or empty on a board without
       wings, so the sheet prints exactly as before — D4). Give `overviewSpecLines` the optional fourth parameter
       `wings: readonly WingFigures[] = []`. After the Swallow Depth / Diamond Depth lines and before the Tail Angle line
       (D3), push for each wing: the head line `${wingPrintName(f)}: ${f.depthAtPosition}`, then `Run: ${f.run}` and
       `Radius: ${f.radius}`, then `Offset: ${f.offset}` only when offset is not null — the three rows each prefixed by
       a named module constant holding two U+00A0 no-break spaces (P2; the comment says why: `wrapTextToWidth` splits on
       ordinary spaces only, so the indent survives, and jsPDF's courier draws U+00A0 blank — F3). `buildOverviewPdf`
       passes `options.wings ?? []` to it. Update the function's doc comment (the D3 placement and P2 layout).
    4. Add a new `describe` at the END of `components/template/build-overview-pdf.test.ts` ("the Overview Sheet lists
       each wing (quick 261015-sei)") with the overviewSpecLines / buildOverviewPdf behaviors above. Build the winged
       Fish as F1: the Fish preset's outline with wings `[W1, W2]` — W1 `{ station: inchesToMm(7.5), depth:
       inchesToMm(3/16), run: inchesToMm(1/4), radius: mm(0), lock: "front-trailing", finOffset: mm(0) }`, W2
       `{ station: inchesToMm(4.5), depth: inchesToMm(3/16), run: inchesToMm(1/2), radius: wingRadiusTop(...,
       "imperial"), lock: null, finOffset: mm(0) }` — `buildOutline` it, then `wingFigures(placedWings(outline.wings,
       geometry), { front: inchesToMm(7.5), rear: null }, system)`. Existing tests stay untouched (D4).
    5. In `components/template/export-preview-dialog.tsx`: also read `wingFinEdges` from `useDesign()`; compute once per
       render (a `useMemo` on outline, outlineGeometry, wingFinEdges, system is fine) `placed = placedWings(outline.wings
       ?? [], outlineGeometry)` and `wings = wingFigures(placed, wingFinEdges, system)` (P8), and pass `wings` to
       `downloadOverviewPdf`. Keep `placed` in scope — Tasks 2 and 3 hand it and `wings` to the other two printouts.

    Commit (plain English, D1/D3): "The Overview Sheet lists each wing's numbers after the tail depth, the same as its
    card on the WINGS close-up".
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/wing-figures.test.ts components/template/build-overview-pdf.test.ts lib/geometry/wings-readers.test.ts && npx next typegen && npx tsc --noEmit</automated>
  </verify>
  <done>
    The winged Fish's Overview Sheet carries both wings' lines between Swallow Depth and Tail Angle in both systems
    (asserted on the built PDF's own text), every preset without wings prints its spec list byte-for-byte as before,
    tsc is clean, and the commit is in.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: a labelled dashed line across the board at each wing on both full-size prints</name>
  <files>lib/geometry/template.ts, lib/geometry/template.test.ts, components/template/build-template-pdf.ts, components/template/build-template-pdf.test.ts, components/template/export-preview-dialog.tsx</files>
  <read_first>
    - lib/geometry/template.ts lines 85–470 and 1270–1455
    - components/template/build-template-pdf.ts lines 340–465 (drawMarks, templateMarkDimensionText, markLabelRect)
    - lib/geometry/template.test.ts lines 1–60 and 120–370 (the frozen pins — never edit)
    - components/template/build-strip-pdf.test.ts lines 300–340 (why markLabels takes the intersection type — F7)
  </read_first>
  <behavior>
    - computeTemplateMarks(g) and computeTemplateMarks(g, []) give the same object (same JSON, same keys) for every preset, and markPlacements / markLineSegments / stripMarkSegments / stripLabelRows over either are deep-equal (D4).
    - For the winged Fish (F1), computeTemplateMarks(geometry, placed) carries wing1 = 190.5 mm and wing2 = 114.3 mm as its last two keys, after the station marks; one wing gives no wing2 key.
    - markLineSegments gives each wing segments from the stringer (0) out to sampleOutline(geometry, station) — the last segment ends there — with hasLabel only on the column-0 page, label `Wing 1` / `Wing 2`.
    - markLabel("wing1", s) is `Wing 1`; wingMarkDistanceText(inchesToMm(7.5), "imperial") is `7 1/2" from tail` and "metric" `19.1 cm from tail`, each equal to formatDim(station, s) + " from tail"; markLabel of a station mark equals markLabels(s)[that mark].
    - stripMarkSegments labels the Fish's wing 1 `Wing 1 — 7 1/2" from tail` (Metric `Wing 1 — 19.1 cm from tail`); its segments run from max(0, page start) to the curve like any mark's.
    - templateMarkLabelText for the Fish's wing 1 placement reads `Wing 1 — 7 1/2" from tail` (Metric `Wing 1 — 19.1 cm from tail`); templateMarkDimensionText for every non-wing placement is unchanged.
    - P5 on the Midlength (no wings needed — marks from computeTemplateMarks(geometry, [{ station }]) on the plain geometry), Letter and A4, on every page carrying both: a wing exactly at MEASURE_STATION_MM → wing labelOffsetMm = +MARK_LABEL_COLLISION_THRESHOLD_MM, tailTwelve 0; a wing 1/8" nose-ward → wing 0, tailTwelve +threshold; a wing 1/8" tail-ward → wing +threshold, tailTwelve 0; a wing 30 mm from every mark → 0 and every other placement's offset unchanged.
    - In those three cases markLabelRect of the wing and of tailTwelve never overlap (rectsOverlap false), both papers.
    - The tiled sweep (F6): every preset × Letter/A4 × wing 1 every 1/16" from 2" to wingPositionTop × wing 2 absent or 1/2", 1", 3" behind (skipped below 2"): on every page, each wing placement's anchor (station − labelOffsetMm) is at least the threshold (−1e-6) from every other placement's anchor; a wing with offset < threshold has anchor ≥ station; a wing with offset ≥ threshold has anchor ≤ station − threshold.
    - The strip sweep (F6): same wing positions through stripLabelRows — every wing row (text starting `Wing `) is at least STRIP_LABEL_MIN_SEPARATION_MM (−1e-6) from every other row on its page, and its baseline lies inside its page's stationRange (1e-6 slack).
    - buildTemplatePdf with the winged Fish's marks builds on Letter and A4 and its doc.output() contains `7 1/2" from tail` and `4 1/2" from tail` (avoid the em dash in the assertion — F3).
  </behavior>
  <action>
    Write the tests first (RED), then the code (GREEN).

    1. `lib/geometry/template.ts` (P4):
       - `TemplateMarks` gains `wing1?: Mm` and `wing2?: Mm`, documented as each wing's outer corner (its `station`,
         where the step leaves the curve), present only on a winged board (D2, D4). Update the interface's doc ("four
         marks") to say so.
       - Export `WingMarkName`, `StationMarkName`, `isWingMark`, `markLabel` and `wingMarkDistanceText` as in
         `<interfaces>`. `markLabel` returns `Wing 1` / `Wing 2` for the wing marks and `markLabels(system)[mark]`
         otherwise. `wingMarkDistanceText` returns formatDim of the station plus ` from tail` (D1: a position is a dim).
       - Change only `markLabels`' declared return type to `Record<StationMarkName, string> & Partial<Record<WingMarkName,
         string>>` (F7); its body keeps exactly its five entries.
       - `computeTemplateMarks(geometry, wings = [])` — after the existing keys (tailBlock included), set `wing1` from
         `wings[0].station` and `wing2` from `wings[1].station` when present; ignore any further entry (MAX_WINGS is 2).
         With no wings it returns exactly today's object.
       - In `markPlacements`, `markLineSegments` and `stripMarkSegments`, take each label from `markLabel(markName,
         system)` instead of indexing the record. In `stripMarkSegments`, a wing's label is `${markLabel} — ` followed by
         `wingMarkDistanceText(station, system)`; every other mark's label is unchanged.
       - Add the module-private `resolveWingLabelCollisions(placements)` (P5) and make it the last step of
         `markPlacements` (applied to the centre/widepoint rule's result). If no placement is a wing mark, return the
         very same array (order and objects untouched — the frozen digests hash this list's order). Otherwise shallow-copy
         every placement in input order and work page by page on the copies. Step 1, for each wing on the page,
         nose-most first: among the page's OTHER placements, those whose station differs from the wing's by less than
         `MARK_LABEL_COLLISION_THRESHOLD_MM`; none → nothing; else take the nearest (equal distance → a non-wing). If
         that neighbour's station is below the wing's by more than `MARK_LABEL_COINCIDENT_EPSILON_MM`, the neighbour's
         `labelOffsetMm` becomes +threshold (its label drawn under its own line); otherwise (level, or the neighbour is
         nose-ward) the wing's does. Step 2, the guard, for each wing in the same order: anchor = station −
         labelOffsetMm; direction toward the tail when the wing's offset is at least the threshold, else toward the
         nose; up to 20 rounds, find the page's other placements whose anchor lies within the threshold of the wing's
         (strictly less, 1e-9 slack) — none ends the walk — and move the wing's anchor to the nearest one's anchor plus
         direction × threshold; finally the wing's labelOffsetMm = station − anchor (`mm()`). Return the copies in
         input order. Doc comment: the rule in plain words, why a flipped label sits one threshold under its line (one
         or two printed lines both clear the line — 9 pt text plus the 2 mm tick offset), F6's sweep counts, and the
         accepted residual (a mark caught between two wings within 10 mm each may have a wing line cross its label;
         labels never touch). Update `markPlacements`' doc comment to name the new last step.
    2. `components/template/build-template-pdf.ts`: `templateMarkDimensionText` returns `wingMarkDistanceText(placement.station,
       system)` for a wing mark (`isWingMark`) and today's full-width figure otherwise, so `templateMarkLabelText` reads
       `Wing 1 — 7 1/2" from tail` and the two-line fallback reads `Wing 1` over `7 1/2" from tail`. `drawMarks` and
       `markLabelRect` need no change (a wing takes the station dash because only `widepoint` takes the dotted one).
       Update both functions' doc comments for the wing case.
    3. `components/template/export-preview-dialog.tsx`: compute `marks = computeTemplateMarks(outlineGeometry, placed)`
       once (memoised with the layout) and pass it to BOTH `downloadStripPdf` and `downloadTemplatePdf`, replacing the
       two inline `computeTemplateMarks(outlineGeometry)` calls (P8).
    4. Tests — new `describe` blocks at the END of `lib/geometry/template.test.ts` ("wing marks on the full-size prints
       (quick 261015-sei)") and of `components/template/build-template-pdf.test.ts` ("a wing's mark line and label
       (quick 261015-sei)"), covering the behavior list. Use the same F1 Fish wings as Task 1 (build them with
       `inchesToMm`/`mm`; `placedWings` on the winged geometry). Keep each sweep under about two seconds (F6 measured
       about one). No existing line in either file changes (D4).

    Commit (plain English, D2): "Both full-size prints draw a dashed line across the board at each wing, labelled with
    its distance from the tail, so a shaper can mark it on the foam".
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/template.test.ts components/template/build-template-pdf.test.ts components/template/build-strip-pdf.test.ts lib/geometry/wings-readers.test.ts && npx next typegen && npx tsc --noEmit</automated>
  </verify>
  <done>
    Both full-size prints of a winged board carry one labelled dashed station line per wing, the Midlength's wing on the
    12" line reads under it with Tail 12" above, both sweeps pass, every frozen digest and every existing test passes
    unedited, tsc is clean, and the commit is in.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: the wing numbers in both full-size prints' name box, the gates, the pictures and the SUMMARY</name>
  <files>components/template/build-template-pdf.ts, components/template/build-template-pdf.test.ts, components/template/build-strip-pdf.test.ts, components/template/export-preview-dialog.tsx, .planning/quick/261015-sei-wing-dimensions-on-all-three-printouts/261015-sei-SUMMARY.md</files>
  <read_first>
    - components/template/build-template-pdf.ts lines 46–180, 515–540, 700–760, 940–1070
    - components/template/build-strip-pdf.ts lines 300–380 (read only — it draws nameBlockContent's lines; no edit)
    - components/template/build-template-pdf.test.ts lines 1–60 and 744–830
    - components/template/build-strip-pdf.test.ts lines 1–64 and 181–220, 378–400
  </read_first>
  <behavior>
    - templateNameBlockWingItems(Fish wing 1, Imperial figures) is [`Wing 1 · Fin: 3/16" @ 7 1/2"`, `Run 1/4"`, `Radius 0"`, `Offset 0"`]; wing 2 (by hand) has three items and no Offset.
    - wrapItemsToWidth never splits an item: every output line, split on the separator, gives whole items, and all lines' items in order equal the input; every line measures no wider than the limit; the Metric Fish wing 1 at helvetica 8 pt and the name box's 68 mm gives exactly [`Wing 1 · Fin: 5 mm @ 19.1 cm  ·  Run 6 mm`, `Radius 0 mm  ·  Offset 0 mm`] (F4); a single item wider than the limit falls back to wrapTextToWidth for that item.
    - nameBlockContent with no `wings` key or `wings: []` gives exactly today's dimsLines and height; with the Fish's figures its dimsLines are today's lines followed by each wing's wrapped lines, and its height grows by exactly 4.2 mm per added line (the Fish's two wings add 3 lines in Imperial and 4 in Metric — F4; the base height depends on the test's own dims row, so assert the difference, not an absolute height).
    - Full Sized Template page 1, every preset × Letter/A4 × both systems, with (a) the Fish's real figures and (b) two worst-case figure sets (F4's strings, typed as WingFigures literals — display strings for a layout test): templatePageZeroFurnitureRects has no two overlapping rects, every rect lies inside templatePageZeroBoxRect, and the name block sits inside the outline on page 1 with at least NAME_BOX_CLEARANCE_MM between its outboard edge and the curve over its whole height (mirror the existing containment test at line 782).
    - Paper Saver, same matrix: every stripFurnitureRects rect lies inside stripPrintableRect of its own page, the name block and the scale square never overlap when they share a page, the name block's pageIndex is at most 1 (F5: only the Shortboard moves, to index 1), and the Fish's name block stays on page index 0 on both papers in both systems.
    - buildStripPdf and buildTemplatePdf with the winged Fish's marks and dims (wings included) build on Letter and A4; each doc.output() contains `Run 1/4"` and `Radius 1 7/16"` (Imperial) and `7 1/2" from tail`.
  </behavior>
  <action>
    Write the tests first (RED), then the code (GREEN).

    1. `components/template/build-template-pdf.ts` (P3):
       - The `dims` type in `BuildTemplatePdfOptions` gains the optional `wings?: readonly WingFigures[]`, documented: on
         a winged board, each wing's figures as its WINGS card reads them (D1, D2); absent or empty on a board without
         wings, so the box prints exactly as before (D4). The Paper Saver shares this type, so it needs no edit.
       - Export `templateNameBlockWingItems(wing)`: `${wingPrintName(wing)}: ${wing.depthAtPosition}`, `Run ${wing.run}`,
         `Radius ${wing.radius}`, and `Offset ${wing.offset}` only when offset is not null (the dims row's own
         label-space-value grammar, P1).
       - Export `wrapItemsToWidth(items, separator, maxWidthMm, doc)`: greedy — keep joining the next item with the
         separator while the joined line measures within the limit at `doc`'s current font (jsPDF `getTextWidth`, never
         a character count), otherwise start a new line with that item; an item wider than the limit on its own goes
         through `wrapTextToWidth` (defensive — F4's worst item is far narrower).
       - `nameBlockContent`: after today's wrapped dims lines, append for each wing in `dims.wings ?? []`
         `wrapItemsToWidth(templateNameBlockWingItems(wing), ` with the dims row's own `  ·  ` separator (name it once as
         a module constant if you like; the dims row's own join may use it too — same string),
         `NAME_BOX_DIMS_WIDTH_LIMIT_MM, doc)`, at the same font, so they draw at the same 4.2 mm pitch and the height
         formula, both builders' drawing and every furniture computation (`resolvePageZeroFurniture`,
         `templatePageZeroFurnitureRects`, the strip's `drawNameBlock` and `computeStripFurniture`) see them with no
         further change. Comment why each wing value keeps its own unit (P3 — a wing line mixes a cm position with mm
         marks; CLAUDE.md Rule 2's "unit once per line" is the all-cm dims row's rule).
    2. `components/template/export-preview-dialog.tsx`: the shared `dims` object gains `wings` (Task 1's array), so the
       Full Sized Template and the Paper Saver both receive it (P8).
    3. Tests — new `describe` blocks at the END of `components/template/build-template-pdf.test.ts` ("the name box lists
       each wing (quick 261015-sei)") and `components/template/build-strip-pdf.test.ts` ("the Paper Saver's name box and
       wing lines (quick 261015-sei)") covering the behavior list. No existing line changes (D4).
    4. Gates, in the worktree, each exit status read in its own call: `npx vitest run` (whole suite);
       `npx next typegen && npx tsc --noEmit`; `npm run lint`. Then commit (plain English, D2): "Both full-size prints
       list each wing's numbers in the board's name box, under its dimensions".
    5. The pictures (for the founder, through the orchestrator) — follow `<picture_recipe>` and save every PNG in your
       session scratchpad: the winged Fish (F1, built the store's way) on Letter, Imperial — (a) the Overview Sheet;
       (b) the Full Sized Template's page 1 (the name box) and every page whose placements carry a wing mark (measured:
       page 13, index 12, holds both); (c) the Paper Saver's page 1 and every page carrying a wing row (measured: page 9,
       index 8). Plus (d) ONE Metric page: the Full Sized Template's page 1 (the name box in cm and mm). Plus (e) the
       Midlength with its two default wings (F1), Imperial Letter: the Full Sized Template page whose placements carry
       both tailTwelve and wing1 — P5's picture (wing label under the 12" line, Tail 12" above). Confirm or correct
       F1's figures and the page numbers in the SUMMARY.
    6. Write and commit `261015-sei-SUMMARY.md` (frontmatter `status: complete`): what changed on each printout in a
       shaper's words; F1–F8 confirmed or corrected; P1–P8 listed for the founder to confirm (especially P1's Title
       Case, P2's indented rows, P3's figure wrapping, P5's under-the-line label and its accepted residual, F5's
       Shortboard name box moving to Paper Saver page 2, P7's untouched card); every picture's absolute path with one
       line on what it shows; the gate results; any deviation.
  </action>
  <verify>
    <automated>npx vitest run && npx next typegen && npx tsc --noEmit && npm run lint</automated>
  </verify>
  <done>
    Both full-size prints of a winged board list each wing in the name box without splitting a figure, page 1's
    furniture (and the Paper Saver's furniture page) still fits on every preset, paper and system, the whole unit suite,
    tsc and lint pass with every frozen digest unedited, the pictures exist, and the code commit and the SUMMARY commit
    are in.
  </done>
</task>

</tasks>

<picture_recipe>
Build each PDF with a scratch `.ts` in the worktree ROOT (so `@/` resolves; delete it before committing), run with
`npx tsx`, write the bytes with `writeFileSync(path, Buffer.from(doc.output("arraybuffer")))`. Inputs exactly as the
export dialog builds them: `placed = placedWings(outline.wings ?? [], geometry)`, `wings = wingFigures(placed, edges,
system)`, `marks = computeTemplateMarks(geometry, placed)`, `dims` = { length: outline.length, widePointWidth:
outline.widePointWidth, centerThickness: preset.rails.center.boardThickness, noseWidth12in: geometry.noseWidthAt12in,
tailWidth12in: geometry.tailWidthAt12in, widePointOffset: outline.widePointOffset, volumeLitres: litres(34.0), wings }
(the litres only fill the row; the pictures are about layout), boardName `Fish` / `Midlength`.

The winged board, built the store's way (F1): `g0 = buildOutline(preset.outline)`; `e0 = wingFinEdges(computeFinPlacement(
deriveEffectiveFins(preset.fins, true, preset.outline, g0), importedFinTailFromOutline(g0)).marks)`; `w1 = nextWing([], e0,
g0, "imperial")`; `w2 = nextWing([w1], e0, g0, "imperial")`; `outline = resolveWingStations({ ...preset.outline, wings:
[w1, w2] }, preset.fins, true).outline`; `geometry = buildOutline(outline)`; `edges` the same way from `outline` and
`geometry`.

Render a page to PNG with macOS PDFKit (save as `render.swift` in your scratchpad; run
`swift render.swift in.pdf out.png <pageIndex> 2`):

```swift
import PDFKit
import AppKit
let a = CommandLine.arguments
let doc = PDFDocument(url: URL(fileURLWithPath: a[1]))!
let page = doc.page(at: Int(a[3]) ?? 0)!
let box = page.bounds(for: .mediaBox)
let s = CGFloat(Double(a.count > 4 ? a[4] : "2") ?? 2)
let img = page.thumbnail(of: NSSize(width: box.width * s, height: box.height * s), for: .mediaBox)
let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[2]))
```

Name the files so they sort in viewing order, e.g. `sei-1-overview-fish-imperial-letter.png`,
`sei-2-template-p01-fish-imperial-letter.png`, `sei-3-template-p13-fish-imperial-letter.png`,
`sei-4-paper-saver-p01-fish-imperial-letter.png`, `sei-5-paper-saver-p09-fish-imperial-letter.png`,
`sei-6-template-p01-fish-metric-letter.png`, `sei-7-template-tail12-midlength-imperial-letter.png`. Look at each one
yourself before listing it (the wing lines, the labels, nothing overlapping) and say in the SUMMARY if anything looks off.
</picture_recipe>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| design state → printed page | Every wing figure a shaper cuts foam to crosses from the stored board to paper; it must be the stored, formatted value the WINGS card shows, never a re-derived or rounded copy |
| printed label → shaper's eye | A label printed over another label, or a figure split from its unit, can be misread at the shaping stand |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-sei-01 | Tampering (integrity of a number a shaper cuts to) | `wingFigures` and its three consumers | high | mitigate | One helper carries D1's rule; the dialog computes it once for all three printouts (P8); Task 1 pins every field against the card's own measure-display calls in both systems, and the radius against `effectiveWingRadius` |
| T-sei-02 | Tampering (a misread mark) | `resolveWingLabelCollisions`, `stripLabelRows` | high | mitigate | Task 2's two sweeps over every wing position on every preset and paper assert no wing label sits within a label's height of another; Task 2 asserts the Midlength's coincident case with `markLabelRect` |
| T-sei-03 | Tampering (a figure parted from its unit) | `wrapItemsToWidth` | medium | mitigate | Task 3 asserts every wrapped line splits back into whole figures, and pins the Metric Fish's exact lines |
| T-sei-04 | Tampering (a regression on boards without wings) | every print function | high | mitigate | Wing keys and `dims.wings` are absent on a board without wings; `resolveWingLabelCollisions` returns its input untouched; every frozen digest and existing test passes unedited (D4) |
| T-sei-05 | Denial of service | the guard's walk | low | accept | Bounded at 20 rounds over at most a handful of labels per page; inputs are the board's own stations |
| T-sei-SC | Tampering | package installs | low | accept | No package is installed or upgraded by this plan |
</threat_model>

<verification>
- **Same as the card (D1).** Task 1 pins `wingFigures` against the card's own formula calls and the radius drawn, in
  both systems; the dialog hands one array to all three printouts.
- **Overview (D3).** The wing lines sit between the tail depth and Tail Angle, asserted on the built PDF's own text.
- **Mark lines (D2).** One dashed station line per wing on both full-size prints, stringer to curve, labelled with its
  distance from the tail; the label rule proven by two sweeps and the Midlength's 12" case.
- **Name box (D2).** Wing lines under the dims row, never splitting a figure; page 1's furniture (and the Paper Saver's
  furniture page) fits every preset, paper and system, real and worst-case figures.
- **No wings, no change (D4).** Every frozen digest and every existing test passes with no existing test line edited
  (`git diff` of the four print test files and `lib/geometry/template.test.ts` shows added lines only).
- **The founder's look.** Seven pictures of the winged Fish (and one of the Midlength's 12" case), listed in the SUMMARY.
</verification>

<success_criteria>
- All six `must_haves.truths` hold, each proven by the named unit test.
- `npx vitest run`, `npx next typegen && npx tsc --noEmit` and `npm run lint` pass in the worktree.
- In each of the four print test files and `lib/geometry/template.test.ts`, `git diff <task-1 parent>..HEAD` shows no
  removed or changed line (the diff's `-` lines other than the `---` header count zero).
- The SUMMARY lists P1–P8 for the founder, F1–F8 confirmed or corrected, and every picture's absolute path.
- Nothing is pushed. The orchestrator merges, runs `npm run build` on main, and shows the founder the pictures.
</success_criteria>

<output>
Commit `.planning/quick/261015-sei-wing-dimensions-on-all-three-printouts/261015-sei-SUMMARY.md` (frontmatter
`status: complete`) inside the worktree as the last commit. Return the `<worktree_metadata>` block (agent_id,
worktree_path, branch).
</output>
