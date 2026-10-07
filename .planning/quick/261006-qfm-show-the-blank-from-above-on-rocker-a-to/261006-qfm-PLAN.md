---
phase: quick-261006-qfm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/blank-top-view.ts
  - lib/geometry/blank-top-view.test.ts
  - components/rocker/rocker-view-frame.ts
  - components/rocker/rocker-view-frame.test.ts
  - components/rocker/rocker-top-view.tsx
  - components/rocker/rocker-viewer.tsx
  - components/rocker/rocker-editor.tsx
  - components/viewer/toolbar-button.tsx
  - components/design/use-viewer-media.ts
  - e2e/rocker-top-view.spec.ts
  - e2e/viewer-toolbar.spec.ts
  - e2e/desktop-baseline.spec.ts
  - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
  - .planning/quick/261006-qfm-show-the-blank-from-above-on-rocker-a-to/pictures/
  - .planning/quick/261006-qfm-show-the-blank-from-above-on-rocker-a-to/261006-qfm-SUMMARY.md
autonomous: true
requirements: [QT-261006-qfm]
estimate:
  # One executor in its own git worktree. Three tasks: a new pure geometry module and a small frame
  # function (both test-first, no change to the side view's frame), a new drawing component with a
  # mini-display wrapper plus edits to the editor, the toolbar glyph file, the media hooks and two
  # constants in the viewer, then one new browser spec, two small spec edits, one baseline re-record,
  # about twenty regression spec files on three projects, and five pictures.
  # Revised 2026-10-06 (the founder's mini-display decision): about a third lower than the first
  # version's 160k, because the side view's frame and its 1,800-line test suite are no longer touched.
  # Calibration: factor 1, 0 samples (estimate-calibration, 2026-10-06).
  tokens: 105000
  raw_tokens: 105000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "On a computer (the desktop layout, at least 820 dots wide and taller than 500 dots), ROCKER's VIEWER shows a small drawing of the board seen from above, a mini display for reference only (not at the side view's scale). It sits on its own opaque plate over the panel's top-left corner, clear of the toolbar, and turns nose-up with the Rotate button. The side view itself is untouched: same size, same place, same spoken name (D-03)."
    - "With a blank picked, the top view shows the blank's outline through its printed widths (faint foam shade, thin solid line), the board's outline on it where Placement puts it (TEMPLATE's own shape, a swallow's notch or a diamond's point included, and no marks of its own), the blank's stringer (dash-dot, end to end), its centre mark and its two 12-inch marks (12 inches in from each blank tip). There is no text and no figure anywhere on it. Every line and dash is drawn at a fixed on-screen weight, so the mini display reads at its small size (D-01, D-17)."
    - "With no blank picked, the top view is the board's outline alone: no stringer, no marks (D-02)."
    - "A fourth toolbar button, at the far left of the row, hides and shows the mini display. It is on when the screen opens, reads 'Hide the blank from above' while shown and 'Show the blank from above' while hidden, and is absent on a phone and on a short screen (D-03)."
    - "Moving the Placement slider moves the board in the side view and in the mini display together; the blank in the mini display does not move (D-01)."
    - "On an upright phone, on a phone held sideways, and in any window narrower than 820 or no taller than 500, VIEWER shows the side view alone (no mini display) and a third tab, TOP VIEW, shows the same top view filling the panel: standing up on an upright phone, lying flat on a sideways one. If the window crosses that line while TOP VIEW is open, the screen lands on VIEWER (D-04)."
    - "With the measuring points on, plain dots sit on the blank's top-view outline, both sides, at every station whose width the catalogue prints, in the mini display and in the tab alike; nothing is dotted on the board's outline (D-01, D-15)."
    - "Nothing printed and nothing saved changes: the side view's own frame, the Summary order form's rocker box, the other four desktop reference pictures (TEMPLATE, RAILS, VOLUME, FINS) and every saved board are exactly as before (D-08)."
  artifacts:
    - path: "lib/geometry/blank-top-view.ts"
      provides: "buildBlankTopView: the blank's and the board's outlines seen from above, the three blank marks, the stringer, the printed-width dots, the widest half-width and the drawn extent, all in millimetres in board coordinates"
      contains: "export function buildBlankTopView"
    - path: "lib/geometry/blank-top-view.test.ts"
      provides: "unit proof of decision 5's list, built from real preset blanks through prepareBlank/buildBlankProfile"
      contains: "buildBlankProfile"
    - path: "components/rocker/rocker-view-frame.ts"
      provides: "rockerTopViewLayout (the top view's own frame, for the mini display and the tab alike), the two moved pixel constants and the top view's screen-pinned line weights and dashes"
      contains: "export function rockerTopViewLayout"
    - path: "components/rocker/rocker-top-view.tsx"
      provides: "TopViewShapes (the paths, lines and dots), RockerTopView (the drawing, used by the tab and the mini display) and TopViewInset (the mini display's plate over the VIEWER panel's top-left corner)"
      contains: "data-top-view-inset"
    - path: "components/rocker/rocker-editor.tsx"
      provides: "the top view's on/off state, the fourth toolbar button, the mini display on a computer, the derived tab list with TOP VIEW on small screens, and the derived fallback to VIEWER"
      contains: "TOP VIEW"
    - path: "components/design/use-viewer-media.ts"
      provides: "useBelowShellWidth and useShortScreen, with the header paragraph saying why ROCKER may read them"
      contains: "(max-height: 500px)"
    - path: "components/viewer/toolbar-button.tsx"
      provides: "BlankTopViewIcon, the toggle's glyph"
      contains: "BlankTopViewIcon"
    - path: "e2e/rocker-top-view.spec.ts"
      provides: "the browser proof on a computer, a narrow or short window, an upright phone, a sideways phone and a tall touch screen, tagged 261006-qfm"
      contains: "261006-qfm"
  key_links:
    - from: "components/rocker/rocker-editor.tsx"
      to: "components/rocker/rocker-top-view.tsx"
      via: "TopViewInset inside the VIEWER tab when the screen is not small and the toggle is on; RockerTopView as the TOP VIEW tab's content on a small screen; one topView value built with useMemo and handed to both"
      pattern: "TopViewInset"
    - from: "components/rocker/rocker-top-view.tsx"
      to: "components/rocker/rocker-view-frame.ts"
      via: "rockerTopViewLayout for the frame and the mini display's aspect ratio; the screen-pinned line weights and dashes"
      pattern: "rockerTopViewLayout"
    - from: "components/rocker/rocker-editor.tsx"
      to: "components/design/use-viewer-media.ts"
      via: "the two new hooks, combined into the one derived small-screen boolean"
      pattern: "useBelowShellWidth\\(\\)"
    - from: "components/rocker/rocker-top-view.tsx"
      to: "lib/geometry/blank-top-view.ts"
      via: "the BlankTopView value, built once in the editor and drawn in either place"
      pattern: "BlankTopView"
---

<objective>
Show the picked blank from above on ROCKER, with the board's outline on it, as a small reference drawing.

The founder's words. 2026-10-02: "I think I want to show a miniature version of the blank outline (with 12" stations,
center, and stringer line) on the rocker viewer page. Ideally, with the board outline also shown (no station marks) so a
user can see that part of the board visually too. On small screens, the top preview can just be a new tab." 2026-10-06:
"Lets add the blank outline with the board preview in it", and "On a large desktop screen, the mini blank/board image can
be turned on/off by another button. ON smaller screens where theres no room with the rocker/blank view, let's make a new
viewer tab." Later on 2026-10-06, which revised this plan: "The blank/board top view does not need to be the same scale.
It can be a mini display, it's really just for reference only."

Today ROCKER shows the board and its blank from the side only, so width is the one part of the fit a shaper cannot see.
After this task:
- On a computer, a small drawing in the top-left corner of the VIEWER panel shows the blank from above, with the stringer,
  centre mark and 12" marks a shaper would find on the real foam, and the board's own outline on it where the Placement
  slider puts it. A toolbar button hides and shows it.
- On a phone, the same drawing fills its own TOP VIEW tab.
- The side view does not change at all.

Purpose: the shaper can see where the board lands on the blank's own marks, and how much foam is left outside the rails,
without reading the fit numbers.
Output: one pure geometry module and its tests; one small frame function with tests; one new drawing component that also
provides the mini display; edits to the editor, the toolbar glyph file, the media hooks and two constants in the viewer;
one new browser spec; one re-recorded desktop picture; five pictures for the founder.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<decisions>
D-01 to D-08 are the orchestrator's locked decisions, numbered as it gave them. D-03 was revised on 2026-10-06 by the
founder's mini-display sentence above. Each one settles a question the founder's todo
(`.planning/todos/pending/2026-10-02-show-a-miniature-blank-outline-on-the-rocker-viewer.md`) left open. Do not reopen
them. D-09 to D-18 are the planner's, from reading the code and measuring.

- **D-01 What is drawn: the "top view".** The picked blank seen from above, in the board's own coordinates (tail tip 0,
  nose tip = board length, as `BlankSideView.start`/`end`). Its outline runs through the catalogue's printed widths:
  `onBlank.blankWidthAt(s) / 2` each side of the stringer, from `start` to `end`. A tip printed 0 wide draws pointed. A
  tip printed wider than 0 draws square, the closed path crossing the tip at that half-width. Its stringer: one dash-dot
  line (`--outline-station-line`, the stringer dash) from the blank's tail tip to its nose tip, drawn ON TOP of the
  board. Its centre mark: a line across the blank's full width at half the blank's length (stringer dash). Its two 12"
  marks: lines across the blank's width 12" in from each BLANK tip (station dash). These two only, not every catalogue
  station. The board's outline on it: TEMPLATE's own silhouette (`silhouette(geometry)` from
  `lib/geometry/screen-tiles.ts`), notch and all, at the Placement offset, with no marks of its own. That is the shape
  the phone's TEMPLATE tile and the Board Rack already draw, so the board looks the same everywhere in the app; a swallow
  shows its crotch and a diamond its point (revised 2026-10-06). Paint: blank = `--outline-foam-shade` fill plus `--outline-blank-line` stroke at a
  screen-pinned 1px; board = `--outline-board-fill` plus `--outline-ink`; marks and stringer = `--outline-station-line`.
  (D-17 pins every weight and dash to screen pixels.) No text and no figures. The drawing's spoken name is set by D-11.
  Test hooks: `data-top-view-blank`, `data-top-view-board`, `data-top-view-stringer`,
  `data-top-view-mark="T12" | "C" | "N12"`. Measuring points on: with a blank, plain `--outline-blank-line` dots on the
  blank's outline at every station that prints a width, both sides. Nothing on the board's outline. Mirror symmetric
  about the stringer by construction.
- **D-02 No blank picked:** the top view is the board's outline alone. No stringer, no marks (those belong to the blank).
  The toggle and the tab still work.
- **D-03 (revised 2026-10-06) A computer (the desktop layout, ≥ 820 wide AND taller than 500): a MINI DISPLAY.**
  - **What it is.** Its own small SVG, drawn by the SAME `RockerTopView` component the TOP VIEW tab uses, with the same
    `rockerTopViewLayout` frame. It is a sibling of the side view's `<svg>` inside the VIEWER tab's
    `relative flex min-h-0 flex-1` div.
  - **Placement.** Positioned like the toolbar row: `absolute top-0 left-0 z-10`. The panel card's own `p-3` inset
    applies, so no further offset. It takes the top-LEFT corner because the `ViewerToolbar` row owns the top-right.
  - **Plate.** Opaque, so the side view's lines never run under it: `rounded-md border border-surf-line bg-surf-ground
    p-1` (the toolbar button's own plate, see `TOOLBAR_BUTTON_BASE`).
  - **Behaviour.** `pointer-events-none`, so it never intercepts a tap or a long press on the drawing beneath. Test hook
    `data-top-view-inset`.
  - **Size.** Nose-left `w-[36%] max-w-[360px]`; nose-up `h-[45%] max-h-[450px]`. In both cases a `relative` wrapper
    inside the plate carries an inline `aspect-ratio` of the frame's own `width / height`, so the SVG
    (`absolute inset-0 h-full w-full`, `preserveAspectRatio="xMidYMid meet"`) fills it with no wasted plate.
  - **Orientation.** It follows `boardOrientation`, so it turns with the Rotate button. Nose-up it is a tall narrow box
    in the free column left of the standing side view.
  - **Overlap.** On a very wide, short window it may overlap the side view's Nose Tip card, the way the toolbar may
    overlap the top-right. That is accepted; it is what the toggle is for.
  - **The toggle.** Default ON. A FOURTH toolbar button is appended at the end of the `ViewerToolbar` JSX (it lands at
    the far left of the row). `pressed` = showing. Label and title: "Hide the blank from above" / "Show the blank from
    above". A custom glyph beside `RotateBoardIcon`. The state is a plain `useState` in `rocker-editor.tsx`, never
    persisted. Wide view leaves it alone. The button is absent on a phone and on a short screen
    (`max-shell:hidden [@media(max-height:500px)]:hidden`).
  - **The side view is NOT touched.** Its frame function, its props and its spoken name stay exactly as they are; no band
    and no shared scale. The viewer file changes only for D-13.
- **D-04 A phone (< 820 wide) or a short screen (≤ 500 tall, any width):** VIEWER draws the side view ALONE (no mini
  display). A THIRD tab, `TOP VIEW`, draws `RockerTopView` filling the panel the way VIEWER's drawing does: absolute
  inset-0, `useSvgFitScale`, `preserveAspectRatio="xMidYMid meet"`. It stands nose-up or lies nose-left following the
  editor's `boardOrientation` (one rotated `<g>`, frame built from its own rotated content). `compactOnPhone="drawing"`
  for that tab. The tab exists ONLY on those screens. The active tab is DERIVED: a requested tab that is not in the
  current list reads as VIEWER. No effect, no render-time setState. "Small" comes from two new JS media-query hooks in
  `use-viewer-media.ts`, server snapshot `false`, documented as a legitimate use: they drive React STATE (whether the
  mini display draws and which tab list exists), never the page layout. The mini display and the tab are mutually
  exclusive through this one derived boolean, so the top view is never drawn twice.
- **D-05 The geometry lives in `lib/geometry/blank-top-view.ts`** (Rule 1): `buildBlankTopView(...)`, pure, no React,
  browser or database import. Inputs are the `BlankSideView | null`, the board's `OutlineGeometry`, its `length` and a
  sample count for the BLANK outline. Output (mm, board coordinates): blank outline samples (one half-width per
  station), the board outline as TEMPLATE's own signed closed polygon (`silhouette(geometry)`, notch included), `marks`,
  `stringer`, `widthDots`, `halfWidthMax` (and `extent`, D-12). Every conversion to inches happens in the component
  through `mmToInches`. Unit tests are built from real preset blanks through `prepareBlank`/`buildBlankProfile`, with
  expected values read off `blankWidthAt`/`silhouette` and the catalogue record. Never a typed number.
- **D-06 (revised) Frame tests cover only `rockerTopViewLayout` and the new constants.** The side view's frame function is
  unchanged, and its existing suite (print-path pins included) must pass untouched.
- **D-07 Browser tests:** a new `e2e/rocker-top-view.spec.ts`. `e2e/viewer-toolbar.spec.ts` passes with four desktop
  buttons. `rocker-desktop.png` is re-recorded ON PURPOSE (the fourth button, and the default board's mini display over
  the panel's top-left corner). Every other desktop picture must hold unchanged.
- **D-08 Nothing printed changes.** The Summary order form is never given the top view. `npm run test:e2e:prod` is not
  needed for this task.
- **D-09 Tab order: VIEWER | DATASHEET | TOP VIEW.** "A THIRD tab" is read literally: appended after DATASHEET. VIEWER
  and DATASHEET keep the positions every existing phone test measures.
- **D-10 The width hook's query is `not all and (min-width: 820px)`.** `max-shell` is written `(width < 820px)` in
  `app/globals.css`, but the built stylesheet ships it as `@media not all and (min-width:820px)` (read off the current
  `.next` CSS on 2026-10-06). That form matches exactly the same widths, and older Safari understands it; the range form
  needs Safari 16.4. The short hook's query is `(max-height: 500px)`, the inline rule's own text.
- **D-11 (revised) One spoken name, shared by the mini display and the tab.** With a blank: "The board's outline seen
  from above, on the {vendor} {name} blank, with its stringer, centre mark and {12-inch | 30.5 cm} marks". With no
  blank: "The board's outline seen from above".
  - Metric reads "30.5 cm marks", using `stationLabel("metric")` from `lib/geometry/measure-display.ts` (Rule 2:
    all-metric, through the units module). Imperial reads "12-inch marks".
  - The side view's own name is unchanged. No existing name-based browser lookup can match the new name; each one
    searches for "Side profile…" or the thinning sentence.
- **D-12 `extent`.** `buildBlankTopView` also returns `extent: { from, to }`: `min(0, start)` to `max(length, end)` with a
  blank, 0 to length without. That is how the top view's frame learns the blank's overhangs without re-deriving them.
- **D-13 Shared constants move into the frame module.** `KNOT_DOT_PX` (3) and `BLANK_LINE_PX` (1) move from
  `rocker-viewer.tsx` into `rocker-view-frame.ts` as exports, same values, same comments. The viewer imports them back,
  and that is its only change. Kept after the revision because D-17's new screen-pinned constants live beside them, in
  the one pure module both drawings already import. The values are never duplicated.
- **D-14 (revised) The top view's frame pad.** `TOP_VIEW_EDGE_PAD = BARE_PAD` (8 units) is the pad round the drawn
  extent in `rockerTopViewLayout`. A corrupt length, overhang or half-width resolves to a finite frame (the T-11-22
  posture).
- **D-15 The TOP VIEW tab has no toolbar of its own.** The tab and the mini display both show the measuring-point dots
  when the shaper has turned them on in VIEWER, the same state.
- **D-16 No checkpoint inside this plan.** Every task is `type="auto"`. The founder judges the pictures after the merge.
- **D-17 (new with the revision) Every line weight and dash in the top view is pinned to screen pixels.** The mini
  display draws at about 0.22 to 0.28 px per unit (measured below), where D-01's 2-unit board line would be half a pixel
  and a 1-unit mark or stringer a quarter of a pixel: the marks the founder asked for would vanish. So, for the top view
  only, every weight is a pixel constant times `handleUnit`, the technique D-01 already uses for the blank's line:
  - The blank's line: `BLANK_LINE_PX` (1).
  - The board's line: `TOP_VIEW_BOARD_LINE_PX` = 1.5. My pick: heavier than the blank's hairline, lighter than a
    full-size drawing's ink. The founder can overrule it from the pictures.
  - Marks and stringer: `TOP_VIEW_MARK_LINE_PX` = 1.
  - Dashes: `TOP_VIEW_STRINGER_DASH_PX` = [16, 4, 4, 4] and `TOP_VIEW_STATION_DASH_PX` = [5, 4], each value times
    `handleUnit`. These are the same numbers as `app/globals.css`'s `--outline-stringer-dash` and
    `--outline-station-dash`, read here in screen pixels, because a CSS variable's list cannot be multiplied in an SVG
    attribute.
  - A unit test reads `app/globals.css` and fails if the two ever disagree (the `use-print-fit.ts` /
    `order-form.css` precedent in CLAUDE.md).
  - Colours stay the tokens. Applies to the tab too, so the two read alike.
- **D-18 (new with the revision) The mini display's sizing fallback.** The nose-up box takes its width from its height
  through `aspect-ratio`, inside an absolutely positioned plate that shrinks to fit. If either browser collapses that
  width (the browser test's minimum-size checks catch it), put the size class and the inline `aspect-ratio` on the plate
  itself instead (border-box), accepting a few pixels of letterbox from the plate's padding. Record which form shipped in
  the SUMMARY.
</decisions>

<context>
@.planning/STATE.md
@CLAUDE.md
@.planning/todos/pending/2026-10-02-show-a-miniature-blank-outline-on-the-rocker-viewer.md
@components/rocker/rocker-view-frame.ts
@components/rocker/rocker-editor.tsx
@components/design/use-viewer-media.ts
@components/viewer/toolbar-button.tsx
@lib/geometry/board-profile.ts
@e2e/rocker-blanks.spec.ts

What is already true (confirmed at plan time; do not re-explore):

- `BlankSideView` (`lib/geometry/board-profile.ts`): `record` (the `BlankRecord`), `placement`, `onBlank` (a
  `BoardOnBlank`), `start` (= `length/2 - Lb/2 - placement`, where the blank's tail tip falls) and `end` (= `start + Lb`).
  A catalogue station at `fromTailMm` sits at board station `start + fromTailMm`. `onBlank.blankWidthAt(s)`
  (`lib/geometry/blank-fit.ts` ~line 410) is the FULL width under board station `s`, 0 off the foam (an epsilon covers
  `start`/`end` exactly). The width curve is the square-root rule through the printed widths and reads each printed
  station exactly (floating-point aside: compare with `toBeCloseTo`).
- `BlankStation.widthMm` (`lib/geometry/blank.ts`) is the FULL printed width, `null` when not printed.
  `MEASURE_STATION_MM` (12") is exported from `lib/geometry/outline.ts`. Board stations run from 0 at the tail tip, the
  same convention the blank fit uses (`design-store.tsx` ~line 905).
- `silhouette(geometry: OutlineGeometry)` (`lib/geometry/screen-tiles.ts` ~line 84, pure, already tested; it imports
  nothing that imports the new module, so there is no cycle) returns `{ station: number; w: number }[]`:
  - the right edge tail to nose from `geometry.points` (`w` = half-width);
  - the left edge back nose to tail with `w` negated;
  - one closing point at `(geometry.centreCloseStation, 0)`: the crotch of a swallow tail, the tip of a diamond, the
    tail end's centre for a squash (0 there).

  The phone's TEMPLATE tile and the Board Rack draw the board from exactly this. `mm()` in `lib/geometry/units.ts` is a
  bare type cast (`value as Mm`), so mapping the points through it keeps them deep-equal to `silhouette`'s own.
- Catalogue facts (2026-10-06, `readSeedCatalog`): 158 pickable blanks, every one printing a width at both tips, 39 with a
  0 tip. The widest is 33" (Marko Foam 8'0" MK-SUP-STD). Among the preset blanks (`PRESET_BLANKS.blanks` from
  `@/lib/blanks/preset-blanks`): US Blanks 5'10"RP prints T0 14" and N0 8" (square both ends); US Blanks 7'4"SP prints
  T0 7.5" and N0 0 (pointed nose). `board-profile.test.ts` shows the fixture shape: a `boardInput()` helper with length,
  `centerThickness`, `DEFAULT_FOIL_SPEC` tips, zero offsets and `...DEFAULT_BLANK_CUT`, then
  `buildBlankProfile(prepareBlank(record), input, placement)`. `placementRange(prepared.lengthMm, boardLength)` (from
  `blank-fit.ts`) gives the slider's reach.
- The default board (`DEFAULT_BOARD_SPEC.outline`) is 72" long, 19" at its widest (half 9.50"), 4" across the tail, with
  a pointed nose. `/design/rocker` opens with NO blank picked, which is what `rocker-desktop.png` shows.
- `rockerTopViewLayout` (Task 1), measured with `npx tsx` on 2026-10-06. It is a tight box round the drawn extent:
  - x from `PAD_X - 8` to `PAD_X + span × scale + 8`; y from `-(hw × scale + 8)` to `+(hw × scale + 8)`; centre line
    y = 0; scale `(VIEW_W - 2 × PAD_X) / spanIn` = `820 / spanIn`.
  - A 72" board with no blank (half 9.5"): 836.00 × 232.39 nose-left, 232.39 × 836.00 nose-up.
  - A 96" board in a 33" blank (100" span): 836.00 × 286.60. A 60" board in a 25" blank (64" span): 836.00 × 336.31.
  - Nose-up is `rotate(90)` on the content group: canonical `(x, y)` lands at `(-y, x)`. Build the nose-up box from those
    turned extents.
- The mini display on today's 1024 × 768 window (VIEWER content 548 × 546 px, measured by the orchestrator in the Browser
  pane):
  - Nose-left, the side view is width-bound with about 166 px free above it. The plate is 36% = about 197 px wide; inside
    the 1px border and 4px padding the drawing is about 187 × 52 px, about 0.22 px per unit.
  - Nose-up, the side view is 344 px wide, centred, about 102 px free each side. The plate is 45% = about 246 px tall;
    the drawing is about 65 × 236 px, about 0.28 px per unit.
  - Those scales are why D-17 pins every line. For comparison, the tab on an upright iPhone draws at about 0.67 px per
    unit, and sideways at about 0.57.
- `RockerEditor` today: `ROCKER_TABS` = VIEWER, DATASHEET. `activeTab` is `useState<RockerTab>("viewer")`.
  `compactOnPhone={activeTab === "viewer" ? "drawing" : "text"}`. `boardOrientation` follows the device on a coarse
  pointer and the Rotate button on a mouse. The toolbar's JSX order is Rotate, measuring points, wide view (corner
  first). The VIEWER content is `<div className="relative flex min-h-0 flex-1 items-center justify-center">` holding
  `ViewerToolbar` then `RockerViewer`, and it is the containing block for both absolutely positioned layers. The editor
  already has `outlineGeometry` from `useDesign()`, and `sideProfile.length` is the board length the side view projects
  with.
- `useViewerMedia`'s `useMediaQueryMatch(query, serverSnapshot)` is the shape to copy. The lint config rejects setState
  inside an effect and setState during render. A derived value is the only allowed fallback.
- `vitest.config.ts` includes `components/**/*.test.ts` in a node environment, so a frame test may read `app/globals.css`
  with `node:fs` (D-17).
- Test hooks the top view must NOT reuse, because existing specs locate them in strict mode:
  - `data-measuring-points`: `e2e/desktop-regression.spec.ts` asserts that one group is visible, and a second match
    would throw.
  - `data-blank-silhouette` and `data-board-silhouette`: `rocker-blanks`, `new-board`, `touch-drag`, `phone-screens`,
    `desktop-regression`.
  - The top view uses only `data-top-view-inset`, `data-top-view`, `data-top-view-blank`, `data-top-view-board`,
    `data-top-view-stringer`, `data-top-view-mark` and `data-top-view-points`.

Existing browser specs that open ROCKER, name its tabs or count its toolbar, and what each expects:

- `e2e/viewer-toolbar.spec.ts`: the desktop `DESKTOP_CASES` row for ROCKER says `expectedCount: 3`. It becomes 4 ON
  PURPOSE: the new button is DOM-last, so it sits 120 px in, on the same 40 px step the test already measures. The phone
  upright ROCKER case stays at 1 visible button, because the new one is `max-shell:hidden`.
- `e2e/rocker-blanks.spec.ts` (all projects): the side view's name and its thinning sentence are untouched. The mini
  display's own name never contains "Side profile" or "thinning", so no lookup can match two pictures.
  `[data-blank-silhouette]` stays a single element.
- `e2e/desktop-regression.spec.ts`: the mouse drag runs across the side view's middle, well below the mini display, and
  the plate passes the pointer through anyway.
- `e2e/phone-chrome.spec.ts`: ROCKER's upright and sideways frame bands, and the VIEWER and DATASHEET touch boxes. Three
  tabs now share the strip on phones; the measured tabs keep their positions (D-09). `ALL_FIVE_SCREENS` at 1180×820,
  1280×800, 1024×768 and 820×800 never shows TOP VIEW. None of its assertions should change.
- `e2e/phone-screens.spec.ts`, `e2e/phone-layout.spec.ts`, `e2e/touch-drag.spec.ts` (android, waits for the profile to
  settle; `svg:has([data-board-silhouette])` finds VIEWER's drawing), `e2e/new-board.spec.ts`, `e2e/rocker-cut.spec.ts`,
  `e2e/blank-makers.spec.ts`, `e2e/touch-sizing.spec.ts`, `e2e/old-safari-buttons.spec.ts` (the shared toolbar class
  sets `items-center`, so old Safari's rule cannot move the new glyph; the plate is a div, not a button),
  `e2e/step-nav.spec.ts`, `e2e/undo-redo.spec.ts`, `e2e/phone-sideways-top-bar.spec.ts`, `e2e/phone-rails.spec.ts` (its
  ROCKER DATASHEET describe), `e2e/summary-blank.spec.ts`, `e2e/summary-planing.spec.ts`. No assertion in any of these
  should change.
- `e2e/desktop-baseline.spec.ts`: `rocker-desktop-desktop-darwin.png` is re-recorded (D-07). `outline-`, `rails-`,
  `volume-` and `fins-desktop-desktop-darwin.png` must pass untouched.
</context>

<execution_notes>
- You run in your own git worktree. If it has no `node_modules`, clone the main checkout's:
  `cp -Rc /Users/kontoes/Code/shaper/node_modules ./node_modules` (APFS clone, instant). If `npx tsc --noEmit` reports
  missing route types, run `npx next typegen` once first.
- Never `cd` into the main checkout to work, never start `next dev` in /Users/kontoes/Code/shaper, never touch
  `.next/dev/lock`. Port 3100 belongs to another project's server on this Mac: never use it, never kill it. Every
  browser run here uses `PW_PORT=3143 IS_WEBPACK_TEST=1` (the suite starts its own webpack dev server on 3143; the ROCKER
  blank list reads the seed CSVs because `playwright.config.ts` already sets `SHAPER_BLANKS_SOURCE=seed-csv`).
- `npm run build` and the production specs cannot run in a worktree, and this task does not need them (D-08). Never read,
  copy or name environment files.
- Long Playwright runs: use `run_in_background` (or split the files across commands) rather than hitting the 10-minute
  foreground limit. If a lone test on a screen this task does not touch fails under a cold webpack server, re-run that
  file alone before blaming the change.
- No human checkpoint inside this plan (D-16). Do not stop between tasks.
- Commit messages are for a shaper: what changed on the screen and why, in plain English, no component or function names
  in the subject. Every commit message ends with the trailer line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, never a different model name.
- Code comments match the surrounding files' voice: long explanatory comments that cite the decision, the quick id
  (261006-qfm) and the date, the founder referred to as they/them. Quote the founder's mini-display sentence where the
  mini display is built.
- Tailwind v4 only generates classes it finds as whole strings in source. Every class string must be a complete literal:
  write the two size choices as two full strings in a ternary, never joined fragments.
- Do not edit anything under `app/`, `components/summary/`, `components/outline/`, `components/ui/`, `lib/blanks/`, `db/`,
  `CLAUDE.md`, or any desktop picture but ROCKER's.
- Last: write `.planning/quick/261006-qfm-show-the-blank-from-above-on-rocker-a-to/261006-qfm-SUMMARY.md` (frontmatter
  `status: complete`) at that path INSIDE your worktree and commit it together with the pictures as your final commit. The
  worktree is force-removed after the merge, so anything uncommitted is lost.
</execution_notes>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: The blank and board seen from above, worked out in millimetres, and the top view's own small frame (tests first)</name>
  <files>lib/geometry/blank-top-view.ts, lib/geometry/blank-top-view.test.ts, components/rocker/rocker-view-frame.ts, components/rocker/rocker-view-frame.test.ts</files>
  <read_first>lib/geometry/board-profile.ts (lines 86-137 for BlankSideView, 223-282 for buildBlankProfile), lib/geometry/blank-fit.ts (lines 110-121 PreparedBlank, 385-415 boardOnBlank's width), lib/geometry/board-profile.test.ts (lines 1-60 for the fixture helpers), components/rocker/rocker-view-frame.ts (lines 246-282 the frame constants, 527-562 resolveEffectiveLengthIn/resolveScale/resolveSpanIn), components/rocker/rocker-view-frame.test.ts (lines 1-60 and 1562-1590 for the imports and the rendered/expectInsideFrame helpers), app/globals.css (lines 830-836, the two dash tokens)</read_first>
  <behavior>
    buildBlankTopView, built from real preset blanks (`PRESET_BLANKS.blanks`: US Blanks 5'10"RP and 7'4"SP) on a 70" board
    (`geometry = buildOutline({ ...DEFAULT_BOARD_SPEC.outline, length })`, passed as `geometry`):
    - The blank outline runs tail to nose in ascending station order, first sample at `blank.start`, last at
      `blank.end`, and every sample's halfWidth equals `blank.onBlank.blankWidthAt(station) / 2`.
    - For every record station with a printed width, the outline has a sample at `start + fromTailMm` whose halfWidth is
      `widthMm / 2` (toBeCloseTo, 6). This is how the outline passes exactly through each printed station.
    - Every halfWidth is at least 0 (mirrored about the stringer by construction: one half-width per station).
    - Marks are in tail-to-nose order, T12, C, N12. T12 is at `start + MEASURE_STATION_MM`, N12 at
      `end - MEASURE_STATION_MM`, C at `(start + end) / 2`. Each halfWidth is `blankWidthAt(station) / 2`.
    - The stringer runs from `start` to `end`.
    - `widthDots` has one entry per printed width, at `start + fromTailMm`, holding exactly `widthMm / 2`.
    - Tips: the 5'10"RP's first and last samples hold half its printed T0 and N0 widths (square ends). The 7'4"SP's last
      sample is 0 (pointed). Expectations are read off the record, never typed.
    - The board: `boardOutline` deep-equals `silhouette(geometry)`.
      - A swallow tail: build `buildOutline({ ...DEFAULT_BOARD_SPEC.outline, tail: { kind: "swallow", endWidth:
        inchesToMm(12), crotchDepth: inchesToMm(2) } })`. The polygon's last point is at station `crotchDepth` with
        `w` 0, and its first point has `w > 0` at the tail pod (station read off `geometry.points[0]`).
      - The default squash tail: the last point is `(0, 0)`.
    - Placement: at placement 0 and at `placementRange(...).max`, the blank outline, the marks and the stringer measured
      from `start` (station minus start) are identical. `boardOutline` is deep-equal at both placements, because the
      board never moves in its own coordinates; only the blank does. `extent` follows the blank.
    - No blank: the blank outline, marks and widthDots are empty, the stringer is null, `extent` is 0 to length, and
      `halfWidthMax` is the largest `|w|` of the board polygon.
    - `halfWidthMax` is at least every blank half-width and every `|w|` of the board polygon, and equals the largest of
      them.
    - Corrupt input: a `blankWidthAt` returning NaN gives a 0 half-width there (test it by wrapping a real `BlankSideView`
      with an `onBlank` whose `blankWidthAt` returns NaN), and `halfWidthMax` stays finite. A blank sample count below 2
      or non-finite still gives at least 2 intervals. A non-finite point in the outline geometry is out of scope:
      `buildOutline` never produces one.
    rockerTopViewLayout and the new constants:
    - Scale is `(VIEW_W - 2 × PAD_X) / (lengthIn + tailOverhangIn + noseOverhangIn)`. `boardOffsetX` is
      `noseOverhangIn × scale`. `centerY` is 0.
    - Containment, both orientations, through `rendered()`/`expectInsideFrame()`: the four corners at the drawn extent's
      two ends (`pxX(lengthIn + noseOverhangIn)` and `pxX(-tailOverhangIn)`, with
      `pxX = PAD_X + boardOffsetX + (lengthIn - stationIn) × scale`) at `±halfWidthIn × scale` lie inside the frame.
      Cases: lengths 60, 78 and 120; half-widths 9.5, 12.5 and 16.5; overhangs (0, 0), (1.5, 2.5) and (6, 0).
    - The measured box: a 72" board, half-width 9.5, no overhang, gives width 836.00 and height 232.39 nose-left, and
      the same two numbers swapped nose-up (`toBeCloseTo(…, 2)`). Each box's edges sit exactly `TOP_VIEW_EDGE_PAD` past
      the drawn extent.
    - Corrupt input: a non-finite or non-positive length, overhang or half-width gives a finite frame with a positive
      width and height. A corrupt overhang or half-width resolves to 0.
    - D-17: `TOP_VIEW_STRINGER_DASH_PX.join(" ")` and `TOP_VIEW_STATION_DASH_PX.join(" ")` equal the values of
      `--outline-stringer-dash` and `--outline-station-dash` read out of `app/globals.css` (with `node:fs`, a regex on
      the declaration, whitespace normalised). `TOP_VIEW_BOARD_LINE_PX`, `TOP_VIEW_MARK_LINE_PX`, `BLANK_LINE_PX` and
      `KNOT_DOT_PX` are finite and positive.
    - The side view's frame is untouched: the existing suite in the same file passes with no edit to any existing test.
  </behavior>
  <action>
**Part A, RED.** Write `lib/geometry/blank-top-view.test.ts` and new describes at the END of
`components/rocker/rocker-view-frame.test.ts`, covering every bullet in the behavior block above. Do not edit any existing
describe in that file.
- The unit test file builds its blanks from `PRESET_BLANKS.blanks` (find by vendor and name). It uses a `boardInput()`
  helper copied from `lib/geometry/board-profile.test.ts`, `prepareBlank`, `buildBlankProfile`, `placementRange`,
  `MEASURE_STATION_MM`, `buildOutline`, `inchesToMm` and `silhouette` (from `./screen-tiles`), and reads every expected
  value off those functions or the record.
- Extend the frame test's import list with the new names (`rockerTopViewLayout`, `TOP_VIEW_EDGE_PAD`,
  `TOP_VIEW_BOARD_LINE_PX`, `TOP_VIEW_MARK_LINE_PX`, `TOP_VIEW_STRINGER_DASH_PX`, `TOP_VIEW_STATION_DASH_PX`,
  `BLANK_LINE_PX`, `KNOT_DOT_PX`). Reuse `rendered()` and `expectInsideFrame()`.
- Run `npx vitest run lib/geometry/blank-top-view.test.ts components/rocker/rocker-view-frame.test.ts`. Expected: the new
  module is missing and the new frame names are undefined, so the new tests fail; every existing frame test still passes.
  Record the failing lines for the SUMMARY and commit the tests alone. Subject along the lines of "Tests: the blank seen
  from above, and its own small drawing frame (fail until the next commit)".

**Part B, GREEN.** Create `lib/geometry/blank-top-view.ts` (D-05, D-12, Rule 1), with a header comment in the style of
`board-profile.ts`: what the module is, the founder's request and its dates, quick 261006-qfm, and pure with tests.
- Exports:
  - `TopViewSample { station: Mm; halfWidth: Mm }`.
  - `TopViewBoardPoint { station: Mm; w: Mm }` (w signed).
  - `TopViewMarkLabel` (`"T12" | "C" | "N12"`) and `TopViewMark` (label, station, halfWidth).
  - `BlankTopView`: `blankOutline: TopViewSample[]`, `boardOutline: TopViewBoardPoint[]`, `marks`,
    `stringer: { from; to } | null`, `widthDots`, `halfWidthMax`, `extent: { from; to }`.
  - `BlankTopViewInput`: `blank: BlankSideView | null`, `geometry: OutlineGeometry`, `length: Mm`, and `samples: number`
    (the BLANK outline's density only).
  - `buildBlankTopView(input)`.
- Imports, type-only where it can: `BlankSideView` from `./board-profile`, `MEASURE_STATION_MM` and the type
  `OutlineGeometry` from `./outline`, `silhouette` from `./screen-tiles`, `mm` and `Mm` from `./units`.
- Rules:
  - Resolve `samples` to an integer of at least 2 (a non-finite value falls back to 2).
  - Board outline: `silhouette(geometry)` mapped through `mm()`. It is already in board coordinates, so there is no
    shift.
  - Blank outline: the evenly spaced stations from `start` to `end` merged with every printed-width station, sorted
    ascending. Drop a station within 1e-6 mm of the one before it. Each halfWidth is
    `blank.onBlank.blankWidthAt(station) / 2`, clamped to a finite value of at least 0.
  - `widthDots`: from `blank.record.stations`, the exact printed `widthMm / 2`.
  - Marks: T12, C, N12 as in the behavior block.
  - `halfWidthMax`: the largest of every blank half-width and every `|w|` of the board polygon (0 when everything is
    0).
  - `extent`: per D-12.
  - Never a formula duplicated: every blank width comes from `blankWidthAt`, and the board's shape from `silhouette`.

In `components/rocker/rocker-view-frame.ts` (D-13, D-14, D-17). Do NOT change `rockerViewLayout`, its input or its
output in any way; this file only gains:
- `KNOT_DOT_PX` (3) and `BLANK_LINE_PX` (1), moved here from `rocker-viewer.tsx` as exports with their existing comments.
  (Task 2 switches the viewer's import and deletes its copies; until then the viewer keeps compiling on its own copies.)
- `TOP_VIEW_EDGE_PAD` (= `BARE_PAD`).
- `TOP_VIEW_BOARD_LINE_PX` (1.5) and `TOP_VIEW_MARK_LINE_PX` (1).
- `TOP_VIEW_STRINGER_DASH_PX` (`[16, 4, 4, 4] as const`) and `TOP_VIEW_STATION_DASH_PX` (`[5, 4] as const`).
- Each constant gets a doc comment carrying D-17's reason: the mini display's measured 0.22 to 0.28 px per unit; the same
  numbers as the two CSS tokens, read in screen pixels; and the test that keeps them equal.
- `RockerTopViewLayoutInput` (`lengthIn`, `halfWidthIn`, `tailOverhangIn`, `noseOverhangIn`, `orientation`) and
  `rockerTopViewLayout(input)` returning `{ scale, boardOffsetX, centerY, minX, minY, width, height, viewBox }`:
  - Use `resolveScale(lengthIn, true, overhangs)`, `resolveSpanIn` for the overhangs and the half-width (corrupt → 0),
    and `resolveEffectiveLengthIn` for the span. Centre line y = 0.
  - Nose-left box: x from `PAD_X - TOP_VIEW_EDGE_PAD`, width `span × scale + 2 × TOP_VIEW_EDGE_PAD`, y from
    `-(hw × scale + TOP_VIEW_EDGE_PAD)`, height twice that.
  - Nose-up: the same box turned through `(x, y) → (-y, x)`, built from those extents, not by swapping the strings.
  - The viewBox is at two decimals like the side view's.
  - Doc comment: the top view's own frame for the TOP VIEW tab and the mini display alike (D-03, D-04); not at the side
    view's scale, by the founder's 2026-10-06 decision.

Re-run the same vitest command until every test passes. Then run the whole unit suite, tsc and lint. Commit, subject along
the lines of "Work out the blank and the board as seen from above, ready to draw small", with a short plain-English body:
the marks a shaper finds on real foam, the board placed where the slider puts it, measured off the catalogue's printed
widths, and that nothing on screen changes yet.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/blank-top-view.test.ts components/rocker/rocker-view-frame.test.ts</automated>
    <automated>npx vitest run</automated>
    <automated>npx tsc --noEmit</automated>
    <automated>npm run lint</automated>
    <automated>! grep -nE "^import .*(react|next/|@/lib/db|@/components)" lib/geometry/blank-top-view.ts</automated>
    <automated>grep -c "export function buildBlankTopView" lib/geometry/blank-top-view.ts</automated>
    <automated>grep -c "silhouette(" lib/geometry/blank-top-view.ts</automated>
    <automated>grep -c "export function rockerTopViewLayout" components/rocker/rocker-view-frame.ts</automated>
    <automated>! grep -nE "topView(In|CenterY)" components/rocker/rocker-view-frame.ts</automated>
  </verify>
  <done>
A test-only commit exists whose new tests fail (failure lines recorded for the SUMMARY), followed by the implementation
commit. Every new and existing unit test passes, including the print-path viewBox pins and the side view's whole frame
suite, with no existing test edited. The dash constants are proved equal to the CSS tokens. tsc and lint are clean. The
new module imports nothing from React, Next, the database or `components/`. The side view's frame function gained no
band input.
  </done>
</task>

<task type="auto">
  <name>Task 2: Draw it, as a mini display in the corner of the VIEWER panel on a computer with an on/off button, and as its own TOP VIEW tab on a phone or short screen</name>
  <files>components/rocker/rocker-top-view.tsx, components/rocker/rocker-viewer.tsx, components/rocker/rocker-editor.tsx, components/viewer/toolbar-button.tsx, components/design/use-viewer-media.ts</files>
  <read_first>components/rocker/rocker-editor.tsx (whole file), components/rocker/rocker-viewer.tsx (lines 120-140 for the two constants, 485-510 and 640-660 for how the svg, fitScale and handleUnit are set up), components/design/use-viewer-media.ts, components/viewer/toolbar-button.tsx (lines 30-75 the row and button classes, 160-190 RotateBoardIcon), components/viewer/tabbed-panel.tsx (props only, lines 35-110), components/outline/outline-viewer.tsx (lines 975-1010, TEMPLATE's stringer and station lines)</read_first>
  <action>
**`components/design/use-viewer-media.ts` (D-04, D-10).**
- Add `useBelowShellWidth()` (query `not all and (min-width: 820px)`) and `useShortScreen()` (query
  `(max-height: 500px)`), both through `useMediaQueryMatch` with server snapshot `false`.
- Give each its own doc comment, and the query constant a note on why it is written the way the built stylesheet ships
  `max-shell` (D-10).
- Add a header paragraph in the file's voice. Quick 261006-qfm: ROCKER reads these two to decide React STATE (whether the
  top view draws as a mini display inside VIEWER, and whether a TOP VIEW tab exists). They never move a layout, which
  stays the CSS `max-shell`/`shell` switch and the inline short-screen rule. The server snapshot is a computer, corrected
  on the first render after hydration: the same posture `boardOrientation` has, and no hydration mismatch.

**`components/viewer/toolbar-button.tsx`.**
- Add `BlankTopViewIcon({ className })` beside `RotateBoardIcon`: a 24 × 24 viewBox, `fill="none"`, `aria-hidden`,
  `currentColor` strokes. Starting geometry, which you may refine by eye at 24 px:
  - The blank: a rounded horizontal outline from about x 2.5 to 21.5 and y 6.5 to 17.5, stroke 1.25.
  - The board inside it: a smaller outline, pointed at the left (the nose, as ROCKER draws nose-left), from about x 5 to
    19 and y 8.8 to 15.2, stroke 1.5.
  - A dash-dot centreline across the whole glyph at y 12, stroke 1, dash pattern about `3 1.5 1 1.5`.
- Doc comment: the founder's request (2026-10-06), what it pictures, and that only the button's label changes between
  states, like `RotateBoardIcon`. Add one line to the file header's list of what the ROCKER toolbar holds.

**`components/rocker/rocker-viewer.tsx` (D-13 only).** Import `KNOT_DOT_PX` and `BLANK_LINE_PX` from `./rocker-view-frame`
and delete the two local declarations. Nothing else in the file changes: no new prop, no new import from the new files,
the same spoken name, the same drawing.

**`components/rocker/rocker-top-view.tsx` (new, `"use client"`).** Header comment: what a shaper sees on a computer and on
a phone, D-01 to D-04 and D-17, quick 261006-qfm with the founder's mini-display sentence, and that it paints only, with
every number from `buildBlankTopView` and the frame module. Exports:
- `TOP_VIEW_SAMPLES` = 120, the blank outline's density (a drawing parameter only, like the viewer's `BLANK_SAMPLES`;
  the board's shape comes from TEMPLATE's own points, not from sampling).
- `topViewFrame(topView, length, orientation)`: converts through `mmToInches` and calls `rockerTopViewLayout`.
  - Overhangs come from `topView.extent`: tail = `-extent.from`, nose = `extent.to - length`.
  - The half-width is `topView.halfWidthMax`.
  - It is the one place both drawings below get their frame, so the mini display's aspect ratio and the drawing inside
    it can never disagree.
- `TopViewShapes`. Props: `topView: BlankTopView`, `pxX: (stationIn: number) => number`, `centerY`, `scale`,
  `handleUnit`, `showMeasuringPoints`. It returns one `<g data-top-view>` holding, in paint order:
  1. The blank path (`data-top-view-blank`, only with a blank). Fill `var(--outline-foam-shade)`, stroke
     `var(--outline-blank-line)` at `BLANK_LINE_PX * handleUnit`, `strokeLinejoin="round"`.
  2. The board path (`data-top-view-board`). Fill `var(--outline-board-fill)`, stroke `var(--outline-ink)` at
     `TOP_VIEW_BOARD_LINE_PX * handleUnit`, `strokeLinejoin="round"`.
  3. The stringer line (`data-top-view-stringer`). From `pxX(from)` to `pxX(to)` at `centerY`, stroke
     `var(--outline-station-line)` at `TOP_VIEW_MARK_LINE_PX * handleUnit`. Its dash is `TOP_VIEW_STRINGER_DASH_PX`,
     each value times `handleUnit`, joined with spaces.
  4. One line per mark (`data-top-view-mark={label}`), across `centerY ∓ halfWidth × scale` at `pxX(station)`, with
     the same stroke. The C mark uses the stringer dash. T12 and N12 use `TOP_VIEW_STATION_DASH_PX`, scaled the same
     way.
  5. When `showMeasuringPoints` and there are `widthDots`, a `<g data-top-view-points pointerEvents="none">` with two
     circles per dot (both sides), radius `KNOT_DOT_PX * handleUnit`, fill `var(--outline-blank-line)`.

  The two closed paths are built differently, every coordinate at two decimals:
  - The blank path uses a small local helper: up the +halfWidth side tail to nose, back down the −halfWidth side, then
    `Z`. Upper side y = `centerY - halfWidthIn × scale`.
  - The board path runs straight through the signed polygon: `M`/`L` through
    `(pxX(mmToInches(station)), centerY - mmToInches(w) × scale)` for every point, in order, then `Z`. The notch comes
    with it.

  Every millimetre value goes through `mmToInches` first. No text element anywhere. No reuse of the side view's hook names
  (see context).
- `RockerTopView`. Props: `topView`, `length: Mm`, `blank?: BlankSideView`, `orientation: ViewerOrientation`,
  `showMeasuringPoints`.
  - Get the frame from `topViewFrame`. Measure `useSvgFitScale(svgRef, frame.width, frame.height)`. `handleUnit` is
    `1 / fitScale`, guarded as the viewer guards it.
  - Project `pxX = PAD_X + boardOffsetX + (lengthIn - stationIn) × scale`.
  - Render an `<svg>` with the side view's class (`absolute inset-0 block h-full w-full select-none`), its long-press
    style, `role="img"`, `preserveAspectRatio="xMidYMid meet"`, the D-11 name built in this file, and one
    `<g transform={vertical ? "rotate(90)" : undefined}>` around `TopViewShapes` (`centerY` = `frame.centerY`).
- `TopViewInset`, the mini display (D-03, D-18). The same props as `RockerTopView`, which it renders.
  - The outer plate is a `div` with `data-top-view-inset` and the class
    `pointer-events-none absolute top-0 left-0 z-10 rounded-md border border-surf-line bg-surf-ground p-1`, plus
    `w-[36%] max-w-[360px]` nose-left or `h-[45%] max-h-[450px]` nose-up. Each choice is one complete literal in a
    ternary; merge with `cn`.
  - Inside it, a `relative` wrapper carries `w-full` nose-left or `h-full` nose-up, with
    `style={{ aspectRatio: \`${frame.width} / ${frame.height}\` }}` from `topViewFrame`. `RockerTopView` sits inside.
  - Doc comment: the founder's sentence and date; the top-left corner because the toolbar owns the top-right; the
    opaque plate; why the plate passes the pointer through; the accepted overlap on a very wide, short window; and the
    D-18 fallback if a browser collapses the nose-up width.

**`components/rocker/rocker-editor.tsx` (D-03, D-04, D-09, D-15).**
- Import `useMemo` with `useState`, plus `buildBlankTopView`, `TOP_VIEW_SAMPLES`, `RockerTopView`, `TopViewInset` and
  `BlankTopViewIcon`.
- Widen `RockerTab` with `"topView"`. Keep `ROCKER_TABS` as it is, and add `ROCKER_TABS_SMALL_SCREEN` = VIEWER,
  DATASHEET, TOP VIEW (D-09).
- `const [showTopView, setShowTopView] = useState(true)`, with a doc comment in the style of `orientation`'s.
- `smallScreen` = `ViewerMedia.useBelowShellWidth() || ViewerMedia.useShortScreen()`. The tab list follows it.
- Rename the tab state to `requestedTab`. The rendered tab is derived: the requested tab if it is in the current list,
  else `"viewer"`. Comment: why this is derived (a window crossing the line while TOP VIEW is open lands on VIEWER), and
  that the lint config rejects every other way.
- Build `topView` once with `useMemo`: `buildBlankTopView({ blank: sideProfile.blank, geometry: outlineGeometry,
  length: sideProfile.length, samples: TOP_VIEW_SAMPLES })`. `outlineGeometry` is already destructured from
  `useDesign()`. Hand the same value to both places.
- Inside the VIEWER content div, after `ViewerToolbar` and before `RockerViewer`, render
  `{!smallScreen && showTopView && <TopViewInset topView={topView} length={sideProfile.length}
  blank={sideProfile.blank ?? undefined} orientation={boardOrientation} showMeasuringPoints={showMeasuringPoints} />}`.
  `RockerViewer`'s props stay exactly as they are.
- Append the fourth `ViewerToolbarButton` at the END of the toolbar JSX:
  - `pressed={showTopView}`, label "Hide the blank from above" / "Show the blank from above".
  - className exactly `max-shell:hidden [@media(max-height:500px)]:hidden`, as one complete literal.
  - `<BlankTopViewIcon className="size-6" />` inside.
  - A comment naming the founder's words (2026-10-06), D-03, and why it is absent where the tab takes over.
- `compactOnPhone` becomes `"text"` only for DATASHEET, `"drawing"` otherwise.
- Render the TOP VIEW tab's content as a `relative flex min-h-0 flex-1 items-center justify-center` div holding
  `<RockerTopView>` with the same five props.
- Update the header comment:
  - The mini display on a computer and the third tab on a small screen.
  - Wide view's `bare` stays safe because TOP VIEW is never active while wide view is on (the button that starts wide
    view lives on VIEWER).
  - Wide view leaves the mini display as it is.

Then: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`. Then a first browser smoke on the desktop project:
`PW_PORT=3143 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-blanks.spec.ts e2e/desktop-regression.spec.ts --project=desktop`
(the side view's names, the strict measuring-points locator, and the mouse drag across the drawing). Commit, subject
along the lines of "ROCKER shows the blank from above: a small drawing in the corner on a computer, its own tab on a
phone", with a short plain-English body:
- What a shaper sees on a computer: the corner drawing, the button that hides it, the Placement slider moving the board
  in both drawings, and the drawing turning with Rotate.
- What they see on a phone: the TOP VIEW tab, upright or flat.
- That the side view, prints and saved boards are unchanged.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
    <automated>npm run lint</automated>
    <automated>npx vitest run</automated>
    <automated>PW_PORT=3143 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-blanks.spec.ts e2e/desktop-regression.spec.ts --project=desktop</automated>
    <automated>grep -c "not all and (min-width: 820px)" components/design/use-viewer-media.ts</automated>
    <automated>grep -c "(max-height: 500px)" components/design/use-viewer-media.ts</automated>
    <automated>grep -c 'className="max-shell:hidden \[@media(max-height:500px)\]:hidden"' components/rocker/rocker-editor.tsx</automated>
    <automated>grep -c "pointer-events-none absolute top-0 left-0 z-10 rounded-md border border-surf-line bg-surf-ground p-1" components/rocker/rocker-top-view.tsx</automated>
    <automated>grep -c '"w-\[36%\] max-w-\[360px\]"' components/rocker/rocker-top-view.tsx</automated>
    <automated>grep -c '"h-\[45%\] max-h-\[450px\]"' components/rocker/rocker-top-view.tsx</automated>
    <automated>! grep -nE "^import .*useEffect" components/rocker/rocker-editor.tsx</automated>
    <automated>! grep -n "sampleOutline" components/rocker/rocker-editor.tsx</automated>
    <automated>! grep -nE "^\s+data-(measuring-points|blank-silhouette|board-silhouette)" components/rocker/rocker-top-view.tsx</automated>
    <automated>! grep -nE "^const (KNOT_DOT_PX|BLANK_LINE_PX)" components/rocker/rocker-viewer.tsx</automated>
    <automated>! grep -nE "^import .*(rocker-top-view|blank-top-view)" components/rocker/rocker-viewer.tsx</automated>
  </verify>
  <done>
tsc, lint and the unit suite pass. The two desktop spec files pass: the side view's names are unchanged, the
measuring-points group is still one element, and the mouse drag still changes nothing. Both hooks use the planned
queries. The fourth button carries the exact hide class literal. The mini display carries the planned plate class and both
size literals. The editor imports no effect hook. The new drawing reuses none of the side view's test hooks. The two pixel
constants live only in the frame module, and the viewer imports nothing from the new files.
  </done>
</task>

<task type="auto">
  <name>Task 3: Browser proof on a computer, a narrow or short window, an upright phone, a sideways phone and a tall touch screen; the one desktop picture re-recorded; the regression run; pictures for the founder</name>
  <files>e2e/rocker-top-view.spec.ts, e2e/viewer-toolbar.spec.ts, e2e/desktop-baseline.spec.ts, e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png, .planning/quick/261006-qfm-show-the-blank-from-above-on-rocker-a-to/pictures/, .planning/quick/261006-qfm-show-the-blank-from-above-on-rocker-a-to/261006-qfm-SUMMARY.md</files>
  <read_first>e2e/rocker-blanks.spec.ts (lines 1-80 helpers, 229-262 the Placement slider by keyboard), e2e/phone-sideways-top-bar.spec.ts (lines 181-200 and 300-320, the sideways device set-up), e2e/viewer-toolbar.spec.ts (lines 40-60 measureToolbar, 196-228 the desktop cases), e2e/desktop-baseline.spec.ts (lines 1-60)</read_first>
  <action>
**Part A: `e2e/rocker-top-view.spec.ts`.**
- Header comment: the founder's words (all three, with dates), D-01 to D-04, and that every describe title carries
  "261006-qfm".
- Copy from `e2e/rocker-blanks.spec.ts`: `dismissChrome`, `blankList`, `firstFittingRow`, `pickedCard`, `openRocker`
  (with its hydration wait), `pickFirstFittingBlank` and `sliderUnder`.
- Small helpers:
  - `inset(page)`, the `[data-top-view-inset]` locator.
  - `topViewParts(scope)`, returning locators for the board, blank, stringer and `[data-top-view-mark]` inside a given
    scope.
  - `topViewButton(page)`, `getByRole("button", { name: /the blank from above$/ })`.
  - `topViewTab(page)`, `getByRole("tab", { name: "TOP VIEW" })`.
  - `viewerContent(page)`, the toolbar row's parent (`[data-viewer-toolbar]` then `xpath=..`): the VIEWER content box
    both corner layers sit in.
- Wait for the TOP VIEW tab's first appearance with a 30 s timeout: it only appears after hydration.
- Every test must finish inside the suite's default 30 s. Split rather than raise a timeout.

Describe 1, "ROCKER on a computer: a mini display of the blank from above (quick 261006-qfm)". It runs on the desktop
project only, with `dismissChrome` in beforeEach.
- (a) No blank:
  - The mini display is visible, and inside it the board part is visible while the blank, stringer and mark parts have
    count 0.
  - The TOP VIEW tab has count 0.
  - The button is visible with `aria-pressed="true"` and name "Hide the blank from above".
  - `getByRole("img", { name: "The board's outline seen from above", exact: true })` is visible.
  - The side view's own name is unchanged: `getByRole("img", { name: "Side profile of the board, showing the rocker
    line and deck thickness", exact: true })` is visible.
- (b) Pick the first fitting blank:
  - Inside the mini display, blank and stringer have count 1 and are visible. There are exactly three marks: one each
    of T12, C and N12.
  - The mini display's name matches `/^The board's outline seen from above, on the .+ blank, with its stringer, centre
    mark and 12-inch marks$/`.
  - Position: the mini display's bounding box has its left and top each within 16 px of `viewerContent`'s left and top.
    Its width is at most 36% of `viewerContent`'s width + 2 px, and at most 362 px. It does not intersect the toolbar
    row's bounding box (`[data-viewer-toolbar]`).
- (c) Toggle:
  - Click the button. It reads "Show the blank from above" with `aria-pressed="false"`, and the mini display has count
    0.
  - Click again and it is back, still with the blank.
- (d) Placement:
  - Pick the blank and read the `d` of the mini display's `[data-top-view-board]` and `[data-top-view-blank]`.
  - Focus the Placement slider (`sliderUnder(page, /^Placement — /)`) and press ArrowLeft twice. Wait for the
    "toward nose" label.
  - The board's `d` has changed and the blank's `d` has not.
- (e) Measuring points: click "Show measuring points". The count of `[data-top-view-inset] [data-top-view-points]
  circle` is even and at least 10.
- (f) Rotate: click "Rotate the board". The mini display is taller than it is wide. Its height is at most 45% of
  `viewerContent`'s height + 2 px, and at most 452 px. Its width is at least 30 px and its height at least 100 px (D-18's
  collapse check). Its left and top are still within 16 px of `viewerContent`'s.

Describe 2, "ROCKER in a window that is narrow or short: TOP VIEW is a tab (quick 261006-qfm)". It runs on the desktop
project only (a mouse, so width and height alone decide).
- (a) `setViewportSize(1280×480)` before `goto`:
  - The TOP VIEW tab is visible and VIEWER is selected.
  - VIEWER shows no mini display and no `[data-top-view-board]`. Wait for the side view's profile to be visible first,
    so a zero count is meaningful.
  - The button is hidden (`toBeHidden`).
- (b) `setViewportSize(810×1000)`, then the same checks.
- (c) At 810×1000:
  - Click TOP VIEW and check `aria-selected="true"`. `[data-top-view-board]` is visible.
  - Resize to 1280×800. The TOP VIEW tab has count 0, VIEWER has `aria-selected="true"`, and the mini display is
    visible.

Describe 3, "ROCKER on an upright phone: VIEWER and a TOP VIEW tab (quick 261006-qfm)". It runs on the iphone and android
projects at their own viewports.
- VIEWER first: the tab is visible and VIEWER is selected. Once the profile is visible, the mini display and
  `[data-top-view-board]` both have count 0. The button is hidden.
- Click TOP VIEW: the board part is visible, the blank part has count 0, and the name "The board's outline seen from
  above" is found. It stands up: `[data-top-view]`'s bounding box is taller than it is wide.
- Back to VIEWER, then pick the first fitting blank (the row click scrolls it into view). Then TOP VIEW again: the blank,
  the stringer and three marks are visible.

Describe 4, "ROCKER on a phone held sideways: TOP VIEW lies flat (quick 261006-qfm)". Two describes copied from
`phone-sideways-top-bar.spec.ts`'s set-up: iphone with the real 844×390 viewport built from `devices["iPhone 14
landscape"]`, android with `devices["Pixel 7 landscape"]` (863×360), each skipping the other projects.
- The TOP VIEW tab is present, the button is hidden, and VIEWER shows no mini display.
- Click TOP VIEW: the board is visible and lies flat (`[data-top-view]` is wider than it is tall).

Describe 5, "ROCKER on a tall touch screen held upright: the mini display stands up (quick 261006-qfm)". It runs on the
iphone project only (WebKit, a coarse pointer), at `setViewportSize(820×1180)` before `goto` (an iPad Air held upright:
the desktop layout, with the board following the device nose-up).
- The mini display is visible and taller than it is wide.
- Its width is at least 30 px and its height at least 100 px: D-18's collapse check in WebKit.
- The TOP VIEW tab has count 0, and the button is visible.

**Part B: the two edits.**
- In `e2e/viewer-toolbar.spec.ts`, change the ROCKER row of `DESKTOP_CASES` to `expectedCount: 4`. Add a comment: quick
  261006-qfm added the blank-from-above toggle as the fourth, DOM-last button, so it sits 120 px in on the same 40 px
  step; the phone describe is unchanged because the button is hidden below 820.
- In `e2e/desktop-baseline.spec.ts`, add a "RE-RECORDED 2026-10-06 (quick task 261006-qfm)" paragraph at the top of the
  header comment, in the existing entries' style. ROCKER only, `rocker-desktop.png`: the fourth toolbar button, and a
  small drawing of the default board seen from above over the panel's top-left corner; the side view itself did not
  move. Record what the diff image showed before re-recording, that the other four pictures were not re-recorded (give
  their SHA-256 prefixes from `shasum -a 256 e2e/desktop-baseline.spec.ts-snapshots/*.png` before and after), and that
  it was rendered by the webpack dev server in this worktree (the orchestrator may re-record once from the main checkout
  if Turbopack disagrees, as earlier entries say).

**Part C: the run.**
1. `PW_PORT=3143 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-top-view.spec.ts` must pass on all three projects.
   - If Describe 1 (f) or Describe 5 fails its size check, apply D-18's fallback in `rocker-top-view.tsx` and re-run.
2. `npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g "ROCKER"` must FAIL. Open the diff image under
   `test-results/` with the Read tool and confirm the only changes are the toolbar's fourth button and the mini display
   in the top-left corner, with the side view's pixels in place.
3. Re-record that one picture:
   `npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g "ROCKER" --update-snapshots=all`.
4. Run the whole `e2e/desktop-baseline.spec.ts` on desktop: all five pass, and the other four files' hashes are
   unchanged.
5. Run the regression set below, in the background if needed.

Fix any failure this change causes in the code from Task 2, never by loosening an existing assertion. The one allowed
exception is an assertion that counts ROCKER's tabs or toolbar buttons, which you update and name with its reason in the
SUMMARY. A failure that also happens with the plan's base commit checked out (`git stash` or a temporary checkout of
`$BASE`) is pre-existing: report it, and do not fix it here.

**Part D: pictures for the founder.**
- Make a scratch folder `.gsd/pictures-261006-qfm/` (gitignored, never committed). It holds a Playwright config that
  spreads `./playwright.config` the way `playwright.prod.config.ts` does, sets `testDir` to its own folder,
  `testIgnore: []`, the webServer's `cwd` to the worktree root, and keeps the desktop and iphone projects. It also holds
  one spec.
- The spec dismisses the banner and tip, opens ROCKER, waits for the list's hydration and picks the first fitting blank.
- Viewport screenshots go straight into this quick task's `pictures/` folder:
  - `rocker-desktop-blank.png`: desktop, nose-left, blank picked, the mini display in the corner.
  - `rocker-desktop-nose-up.png`: the same after pressing "Rotate the board".
  - `rocker-desktop-hidden.png`: after pressing "Hide the blank from above".
  - `rocker-iphone-top-view.png`: iphone upright, the TOP VIEW tab with the blank.
  - `rocker-iphone-sideways-top-view.png`: the iphone project at 844×390, the TOP VIEW tab with the blank.
- Wait two animation frames before each screenshot. Run with
  `PW_PORT=3143 IS_WEBPACK_TEST=1 npx playwright test -c .gsd/pictures-261006-qfm/<config>`.
- Open every picture with the Read tool and check it against D-01 and D-17:
  - The blank and the board from above, the dash-dot stringer through both, three marks across the blank, and no text.
  - In the mini display, every line is visible at its small size, the plate is clear of the toolbar, and the side view
    sits where it always did.
  - Standing on an upright phone, flat sideways.
  - Retake any half-drawn frame.
- Delete the scratch folder.

**Part E: SUMMARY.** Write it in plain English for the founder (frontmatter `status: complete`):
- What a shaper now sees on a computer and on a phone.
- The RED evidence from Task 1.
- Every gate and spec result per project.
- The existing assertions that changed: expected only the ROCKER toolbar count, with its reason.
- The baseline re-record, with the diff observation and the hashes.
- Which form of the mini display's box shipped (D-18).
- The 1.5 px board line (D-17), offered for the founder to overrule from the pictures.
- The five pictures, one line each. Mention that the "Copy preset values" button, if it shows, is development-only.
- The orchestrator's follow-ups: the full browser suite on main after the merge; a Turbopack re-check of
  `rocker-desktop.png` from the main checkout; the founder's look at the pictures before anything is pushed; and one
  CLAUDE.md note to consider. The Layout section's short-screen list and `use-viewer-media.ts`'s doctrine now have a
  fifth thing height decides: ROCKER's top view moves from a corner drawing into a tab.
- Note that the planner's earlier caveat ("swallow tails draw square") is resolved: the board's outline is TEMPLATE's own
  silhouette, so a swallow shows its notch and a diamond its point.

Commit the spec edits and the re-recorded picture in one commit, subject along the lines of "Browser proof that ROCKER
shows the blank from above, in the corner on a computer and as a TOP VIEW tab on a phone; the ROCKER reference picture
re-recorded". Commit the pictures and the SUMMARY together as the final commit:
`docs(quick-261006-qfm): summary and pictures — the blank from above on ROCKER`.
  </action>
  <verify>
    <automated>PW_PORT=3143 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-top-view.spec.ts</automated>
    <automated>PW_PORT=3143 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop</automated>
    <automated>PW_PORT=3143 IS_WEBPACK_TEST=1 npx playwright test e2e/viewer-toolbar.spec.ts e2e/rocker-blanks.spec.ts e2e/desktop-regression.spec.ts e2e/phone-screens.spec.ts e2e/new-board.spec.ts</automated>
    <automated>PW_PORT=3143 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-chrome.spec.ts e2e/phone-layout.spec.ts e2e/touch-drag.spec.ts e2e/phone-sideways-top-bar.spec.ts</automated>
    <automated>PW_PORT=3143 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-cut.spec.ts e2e/touch-sizing.spec.ts e2e/old-safari-buttons.spec.ts e2e/blank-makers.spec.ts e2e/step-nav.spec.ts e2e/undo-redo.spec.ts e2e/summary-blank.spec.ts e2e/summary-planing.spec.ts</automated>
    <automated>PW_PORT=3143 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts -g "ROCKER DATASHEET"</automated>
    <automated>npx vitest run && npx tsc --noEmit && npm run lint</automated>
    <automated>BASE=$(git log -1 --format=%H -- .planning/quick/261006-qfm-show-the-blank-from-above-on-rocker-a-to/261006-qfm-PLAN.md); test -z "$(git diff --name-only "$BASE"..HEAD -- app components/summary components/outline components/ui lib/blanks db CLAUDE.md e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png e2e/desktop-baseline.spec.ts-snapshots/rails-desktop-desktop-darwin.png e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png e2e/desktop-baseline.spec.ts-snapshots/fins-desktop-desktop-darwin.png)"</automated>
    <automated>ls .planning/quick/261006-qfm-show-the-blank-from-above-on-rocker-a-to/pictures/ | grep -c "^rocker-.*\.png$"</automated>
    <automated>test ! -e .gsd/pictures-261006-qfm && test -z "$(git status --short)"</automated>
  </verify>
  <done>
- The new spec passes on iphone, android and desktop. That includes the mini display's corner position, its size limits
  and its collapse checks in Chromium (nose-up after Rotate) and WebKit (820×1180).
- All five desktop pictures pass. Only ROCKER's was re-recorded, after its diff was inspected; the other four hashes are
  unchanged.
- Every listed regression spec passes on every project it runs on. The only existing assertion changed is ROCKER's
  desktop toolbar count (3 → 4), named in the SUMMARY.
- The unit suite, tsc and lint pass. The diff since the plan commit touches none of the out-of-scope paths.
- Five pictures exist and each was looked at. The scratch folder is gone, the SUMMARY and pictures are the final commit,
  and `git status --short` is empty.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| catalogue record → drawing name | A blank's vendor and name (from the seed catalogue or the database) reach the top view only as a React attribute value in its spoken name, as the side view's name already does (T-11-21) |
| saved board → drawing | A saved board's outline and blank feed the new geometry and frame; a corrupt saved value must not blank or break the screen |
| the mini display → the drawing beneath | The plate sits over the side view's own SVG; it must never take a tap, a drag or a long press meant for the screen |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-qfm-01 | Tampering | `aria-label` on the top view's drawing | low | mitigate | The vendor and name go in as a plain JSX attribute value; no string-built markup, no raw HTML injection (same posture as `rocker-viewer.tsx`, T-11-21) |
| T-qfm-02 | Denial of service | `buildBlankTopView`, `rockerTopViewLayout` | low | mitigate | A non-finite or negative half-width is clamped to 0; a corrupt length, overhang or sample count resolves to a finite frame. Unit tests feed NaN and corrupt values (Task 1) |
| T-qfm-03 | Denial of service | `TopViewInset` over the VIEWER drawing | low | mitigate | `pointer-events-none` on the plate (a grep gate in Task 2); `desktop-regression.spec.ts`'s mouse drag across the drawing still passes; the toggle hides it entirely |
| T-qfm-04 | Tampering | saved boards, the design store, the side view, the printed order form | low | accept | Display only: the toggle and the tab are screen state, never persisted; no design value is written; the side view's frame is untouched and its whole test suite, print-path pins included, passes unedited (D-03, D-08) |
| T-qfm-05 | Information disclosure | pictures committed to the repo | low | accept | Signed-out local dev server with the default board and a public catalogue blank; no account, email or saved-board data appears |
</threat_model>

<verification>
- On a computer:
  - The mini display sits on its plate in the VIEWER panel's top-left corner, clear of the toolbar, with the side view
    unchanged.
  - A blank adds the blank, stringer and three marks. The fourth button hides and shows it.
  - Placement moves the board in both drawings and leaves the blank's top view still.
  - Rotate stands the mini display up, and the measuring points add dots at the printed widths.
- On an upright phone, a sideways phone, and a narrow or short window: VIEWER is the side view alone, and TOP VIEW draws
  the top view standing or flat. Crossing the line while on TOP VIEW lands on VIEWER.
- On a tall touch screen held upright, the mini display stands up at a real size in WebKit.
- The unit suites prove the geometry against the catalogue's own printed numbers, prove the top view's frame, and prove
  the pinned dashes equal the CSS tokens. The side view's frame suite passes unedited.
- Only `rocker-desktop.png` changed among the desktop pictures, and only the ROCKER toolbar count changed among existing
  assertions.
- The Summary order form's rocker box is unchanged (print-path pins plus the summary specs).
</verification>

<success_criteria>
- The eight truths under must_haves hold, proven by `lib/geometry/blank-top-view.test.ts`,
  `components/rocker/rocker-view-frame.test.ts` and `e2e/rocker-top-view.spec.ts` on all three projects, with the
  regression specs green.
- The code change is:
  - one new geometry module;
  - one new drawing component that also provides the mini display;
  - a small frame function and constants in `rocker-view-frame.ts`;
  - two constants moved out of the viewer;
  - edits to the editor, the toolbar glyph file and the media hooks.
- The side view, prints and saved boards are unchanged, and nothing is pushed. The orchestrator merges and runs the full
  suite on main, and the founder judges the pictures.
</success_criteria>

<output>
Write `.planning/quick/261006-qfm-show-the-blank-from-above-on-rocker-a-to/261006-qfm-SUMMARY.md` (frontmatter
`status: complete`) inside the worktree and commit it, with the five pictures, as the final commit.
</output>
