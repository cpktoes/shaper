---
phase: quick-261017-ojc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/custom-rocker-art.ts
  - lib/geometry/custom-rocker-art.test.ts
  - lib/geometry/custom-rocker-text.ts
  - lib/geometry/custom-rocker-text.test.ts
  - components/rocker/custom-rocker-blank-view.tsx
  - components/rocker/custom-rocker-drawing.tsx
  - components/rocker/customize-rocker-dialog.tsx
  - components/rocker/rocker-viewer.tsx
  - components/viewer/toolbar-button.tsx
  - components/viewer/zoom-viewport.tsx
  - components/design/board-lock-scope.test.ts
  - lib/units-isolation.test.ts
  - e2e/rocker-custom.spec.ts
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-computer-off.png
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-computer-on.png
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-computer-off-daylight.png
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-computer-on-daylight.png
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-computer-on-metric.png
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-iphone-off.png
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-iphone-on.png
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-iphone-on-no-dimensions.png
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-pixel7-sideways-on.png
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-pixel7-sideways-on-no-dimensions.png
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/shoot-source.tar.gz
  - .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/261017-ojc-SUMMARY.md
autonomous: true
requirements: [QT-261017-ojc]
estimate:
  # One executor in its own git worktree, forked from claude/heuristic-kowalevski-9134d9 after this
  # plan's commit. Five tasks: the tracer (Show my board an icon, the board inside the one drawing);
  # the pure figures and layout with a 219-blank gate; the drawing rebuilt on it with the phone's
  # Dimensions icon; the browser tests; the pictures and the summary. The layout module and its gate
  # are the bulk. Calibration: factor 1, 0 samples (estimate-calibration, 2026-10-17).
  tokens: 350000
  raw_tokens: 350000
  tasks: 5
  confidence: low
must_haves:
  truths:
    - "The Customize Rocker popup draws ONE picture in both states (D-01): the bent blank on its bottom plane with its thickness on cards above it and its rocker stacked under it, cards and figures hugging the foam, the page viewer's chip style and its two titles, Thickness above and Rocker below. Show my board adds the board inside that same foam; it never swaps to a second drawing."
    - "Above the foam, one card per blank station (nose tip, 12\" in, centre, 12\" in, tail tip) carries the blank's printed thickness; with Show my board on, the same card carries a second line, BOARD and the board's thickness at its own station, each line with its own leader to what it measures — blank deck or board deck (D-02, P-2)."
    - "Under the foam, at each of the blank's five stations, the rocker figures are stacked and tagged: NAT (the catalogue's printed rocker), CUSTOM (as ordered, the DATASHEET's Custom Rocker row — shown once any change is set) and, with the board on, BOARD (the board's own rocker at that same point, read the way the page reads it; `—` where the board does not reach) (D-03, P-3, P-4)."
    - "The heading over the drawing reads Blank Dimensions with the board off and Blank Dimensions & Your Board with it on (D-04)."
    - "Show my board is an icon button in the drawing card's upper right, the page's toolbar look, pressed in the accent when on; the zoom control sits under it; on a phone (below the shell width, or on a short screen) a second icon, Dimensions, sits beside it — pressed by default — and turning it off hides every card, stacked figure, title and tick so the foam (and the board) fills the drawing, while the dashed natural rocker, the bend marks and the red and blue changes stay and the zoom still works (D-07, D-08, P-10, P-11)."
    - "No two labels in the drawing meet, nothing leaves the drawing, and no label sits under the heading, the icons or the zoom control — proven on all 219 pickable blanks in every popup size by a unit test and on the real page by the browser tests (D-01, P-8)."
    - "The page's own ROCKER drawing draws exactly what it drew: its desktop baseline picture passes unchanged and the page holds no overlay element (D-05, P-15)."
  artifacts:
    - path: "lib/geometry/custom-rocker-art.ts"
      provides: "rockerOverlay / blankFrameOverlay (unchanged), boardInBlankFrame, blankViewStations, blankViewLayout, textWidthPx, BLANK_VIEW — the one drawing's figures, frame and labels in CSS px"
      contains: "export function blankViewLayout"
    - path: "components/rocker/custom-rocker-blank-view.tsx"
      provides: "the popup's one drawing: blank, overlay, board, cards, stacks, titles — or, with Dimensions off, the foam alone filling the box"
      contains: "data-blank-view"
    - path: "components/rocker/custom-rocker-drawing.tsx"
      provides: "the drawing card: heading, toolbar icons (Show my board, Dimensions), zoom control, the one drawing, the key line"
      contains: "data-show-dimensions"
    - path: "e2e/rocker-custom.spec.ts"
      provides: "the browser proof on a computer, an upright phone and both phones held sideways"
      contains: "data-blank-view-rocker"
  key_links:
    - from: "components/rocker/custom-rocker-blank-view.tsx"
      to: "lib/geometry/custom-rocker-art.ts"
      via: "the curve, the overlay and every figure from ONE draft spec: blankFrameOverlay(spec, bent), blankViewStations(bent, spec, system, board), blankViewLayout(...)"
      pattern: "blankFrameOverlay\\("
    - from: "components/rocker/custom-rocker-drawing.tsx"
      to: "lib/geometry/custom-rocker-art.ts"
      via: "the board inside the blank: boardInBlankFrame(the draft's side profile)"
      pattern: "boardInBlankFrame\\("
    - from: "components/rocker/custom-rocker-drawing.tsx"
      to: "components/design/use-viewer-media.ts"
      via: "the Dimensions icon's effect follows the same two switches its CSS shows it by (useBelowShellWidth, useShortScreen)"
      pattern: "useShortScreen\\("
---

<objective>
The Customize Rocker popup's drawing, one grammar for both states (the founder, 2026-10-17: "the edit custom
rocker viewer changes a ton with the show board on/off. I prefer the on view. Can we make the off view match it?").
Today Show my board OFF draws a separate blank-alone picture (figures on rails at the card's edges, long leaders)
and ON mounts the page's own ROCKER viewer. After this plan the popup draws one picture in both states, in the on
view's look: the blank's thickness on cards above the foam (the board's too when on), Natural / Custom / Board
rocker stacked under the blank's five stations, the switches as toolbar icons in the drawing's upper right, and on
a phone a Dimensions icon that hides the figures so the foam fills the drawing.

Purpose: a shaper sees the blank's numbers the same way whether or not their board is drawn inside it, reads at
every station what the catalogue prints, what they are ordering and what their board has there, and on a phone can
clear the figures away to look at the shape.

Output: the pure figures and layout with a 219-blank test gate; the one drawing; the drawing card's toolbar; the
page viewer's unused overlay prop removed; the browser tests; ten pictures `ojc-*.png`; `261017-ojc-SUMMARY.md`.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<decisions>
Locked by the founder (2026-10-17; the brief's "Decided" 1–8 — the brief is
`.planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/261017-ojc-BRIEF.md`, read it first). Do not
reopen them. Each task cites the ones it implements.

- **D-01 — One drawing, one grammar, in both states: the on view's look.** The foam with its cards and figures close to it, the viewer's own chip style and rail titles, in both states.
- **D-02 — The blank's thickness sits above the foam, always; with the board on, the board's thickness shows too.** The blank's printed thickness at its five catalogue stations (the DATASHEET's N0 · N12 · C · T12 · T0); the board's at the board's five stations ("Both when on"); the layout keeps them apart (where: P-2).
- **D-03 — Under the foam, at each of the blank's five stations, the rocker figures are stacked.** Natural (printed), Custom (as ordered — the DATASHEET's Custom Rocker row), and with the board on the board's "current" rocker at that same point; each line says which it is (NAT / CUSTOM / BOARD in the chip's small type); one figure marked natural for a natural draft is the planner's call (P-4).
- **D-04 — The heading reads "Blank Dimensions" with the board off and "Blank Dimensions & Your Board" with it on.** Fast task 171's `drawingHeading`, "&" not a dot.
- **D-05 — Unchanged.** The natural rocker dashed behind the bent foam, a short mark across the bottom where each bend starts, the first change red and the second blue, all from the SAME spec as the curve (with its unit test); the page's zoom on the drawing (buttons, wheel, drag, pinch; strokes, dashes and type at screen size); Show my board off by default; the popup's layout (rows left, drawing right; on an upright phone the drawing pinned on top, nose-up, rows beneath; sideways the desktop shell on a short screen); the board lock; Cancel changes nothing; the page's own ROCKER drawing exactly as it is.
- **D-06 — Pictures before the merge; nothing pushed without the founder's go.** The orchestrator's steps; this plan only shoots the pictures.
- **D-07 — A Dimensions toggle on a phone.** Beside Show my board, Dimensions On / Off (default On) hides every card, stacked figure, rail title and tick line and fits the foam (and the board when on) to the drawing's box — its length across the box's width, or its height when nose-up — with only a stroke's gutter; the natural dashed line, bend marks and red/blue changes stay; the zoom still works. Shown below the shell width (`max-shell`) and on a short screen (`[@media(max-height:500px)]`), never by the pointer; a computer gets none. Remembered or not: P-10.
- **D-08 — The switches are toolbar icons in the drawing card's upper right.** `ViewerToolbarButton`s in a `ViewerToolbar` floating over the drawing's top-right the way ROCKER's VIEWER toolbar does, the zoom control under them (`ViewerZoomControl` default `under-toolbar`; `"corner"` goes); Dimensions only where D-07 gives it, Show my board everywhere; labels keep today's words (`Show my board`, `Dimensions`); `data-show-board` moves to the icon (text assertion becomes `aria-pressed`); the key line under the drawing stays, alone on its line; the heading stays top-left.

**Planner's choices (measured; the SUMMARY carries each to the founder to confirm or overrule).** Numbers come from a
scratch prototype of the layout run on the real catalogue (219 pickable blanks, three rockers, board off and on,
Imperial and Metric, six popup sizes — 31,536 layouts) and from Chromium measuring Inter at the drawing's sizes.

- **P-1 — Route (b): grow the popup's own blank drawing; the popup stops mounting the page's `RockerViewer`.** Measured on `rocker-view-frame.ts`: its frame is 900 units built from the board's length clamped to 60–120" (`resolveEffectiveLengthIn`; 36 of the 219 pickable blanks are longer, up to 151.5", which as the subject would draw 1,035 units into an 820-unit area), it reserves the worst-case deck (9" lift + 5" foil) across, and its cards are fixed at 74 units, centred on stations with no sweep. In the popup's boxes that frame draws card figures at 11.3 px on a computer but 7.0 px on a Pixel 7 held sideways and 5.6 px (names 4.3 px) on an upright iPhone. Carrying blank stations, stacked figures and a no-dimensions fit there would mean a second frame engine behind flags inside the page's module, whose 1,940-line test suite pins the page byte-for-byte. The blank drawing's layout already works in CSS px from the measured box, sweeps labels apart and runs on every blank; grown to this design it passed all 31,536 prototype layouts.
- **P-2 — The board's thickness rides on the blank's cards as a second line, not a second row of cards.** Measured: with a second row, the board's leaders must pass through the blank's cards — each board station sits only 1.06–1.84" inside its blank station on the four presets (about 6–12 px on a computer), closer than any card is wide (55–100 px) — and 1,222 of 1,314 board-on layouts failed even on a computer. One card per station with two tagged lines, BLANK and BOARD, each line with its own leader to its own deck point (blank deck at the blank's station, board deck at the board's), failed none. These are the "two tiers": two lines per card, two leaders, never touching.
- **P-3 — The BOARD rocker figure is the board's rocker as the page reads it (`profile.rockerAt` at the blank station — the board on a flat table, its own low point zero), `—` where the board does not reach.** The board's bottom height above the blank's own plane would add the foam planed off the bottom everywhere (the centre gap: 0.186", reading 3/16", on the Longboard in the 9'4"B) — BOARD would read 3/16" at the centre where the board's rocker is 0". Measured on the Longboard in the 9'4"B with the founder's `-1/4"N18" +1/8"T36" +1/8"T18"`: BOARD reads 2 3/16" · 0" · 2 1/2" at the blank's T12 · C · N12, equal to CUSTOM there; at both blank tips it reads `—`, because the board stops 1.06–1.84" short of each blank tip on all four presets.
- **P-4 — A natural draft shows one figure, NAT; once any change is set, NAT and CUSTOM show at all five stations, even where they agree.** A shaper never has to wonder whether a missing CUSTOM line means "same" or "none".
- **P-5 — Tags.** Board off, a thickness card is the viewer's own (station name over the value, untagged — the heading and the Thickness title say whose); board on, its lines read BLANK and BOARD. Rocker lines are always tagged. `—` reads in the label colour, as the page's centre dash does.
- **P-6 — Station names.** Lying flat, each thickness card carries the viewer's station name (Nose Tip, Nose @ 12" (30.5 cm), Center, Tail @ 12", Tail Tip) and the rocker stack under it carries none. Standing nose-up (an upright phone) neither does: measured, the iPhone's pinned drawing leaves about 31 px along the board per station, room for two lines, not three, and the five stations read by position. Today's "Center · zero" sub-line retires with the blank-alone drawing.
- **P-7 — Titles: the viewer's own words and look.** "Thickness" centred above the cards and "Rocker" centred below the stacks lying flat; standing, each over its own column (Rocker left, Thickness right) — the words `RAIL_LABEL_TEXTS` already holds.
- **P-8 — Label sizes and a shared shrink.** Figures 12 px bold, tags and names 9 px bold tracked 0.08em, titles 10 px — the page viewer's on-screen sizes in the computer popup (11.3 / 8.7 / 10.4 px measured). Where five labels cannot sit side by side at full size, all labels shrink together in 5% steps. Measured on 219 blanks: 100% on a computer, in a narrow browser window and on an upright Pixel 7; 95% on an upright iPhone with the board on; down to 90% on a Pixel 7 held sideways and 85% on an iPhone held sideways (10.2 px figures). The test floor is 80%.
- **P-9 — On a short screen the drawing keeps the width's scale and the drawing column scrolls when it needs more height** (the RAILS rule B precedent, CLAUDE.md "Short screen"). Measured: up to 193 px needed against 143 on a Pixel 7 held sideways with the board on; 187 against 181 on an iPhone held sideways.
- **P-10 — Dimensions is not remembered: it is On every time the popup opens,** like Show my board (the founder's round-nine rule for that switch). Measured growth of the drawn foam with Dimensions off, the 9'4"B: an upright iPhone 135 → about 187 px long (board off) and 111 → about 187 (board on); a Pixel 7 held sideways 314 → about 507 px; an iPhone held sideways 293 → about 486 px.
- **P-11 — The icons and their band.** Show my board is a new glyph, `BoardInBlankIcon` (a blank seen from the side with the board inside it), drawn in `toolbar-button.tsx` beside `RotateBoardIcon` and `BlankTopViewIcon` (lucide has no surfboard); Dimensions is lucide's `RulerDimensionLineIcon`. The drawing starts below a band that holds the heading (top-left), the icons (top-right) and, with a mouse, the zoom row under the icons: 80 px with a mouse, 40 px on a touch screen (where the zoom row shows only once zoomed in, then floats over the drawing as on the page). The icons keep the toolbar's 34-dot drawn size with the zoom control's invisible 44 × 44 touch box on a touch screen, so the zoom row still fits under them.
- **P-12 — The board's Thinning Starts marks are not drawn in the popup.** The page draws them; in the popup the only dashed marks across the foam are the bend marks, so the two never look alike (the old on view drew both).
- **P-13 — Leaders cross only when a board is more than 12" shorter than its blank at an end** (its tip station then lies past the blank's 12" station). Measured: the four presets stop 1.06–1.84" short; in the prototype gate the only crossings were the 18 of 1,314 board-on layouts per box where a 120" board sat in one of the three longest blanks, more than 12" short of each tip; the unit test asserts no crossing within 12".
- **P-14 — Text widths from a per-character table of Inter Bold, measured in Chromium.** The old rule (0.62 em a character) under-reads capitals by about 15% — `CUSTOM` at 9 px tracked is 44.4 px real against 37.8 estimated — and the stacks are full of capitals.
- **P-15 — Nothing is left behind.** `RockerViewer`'s overlay prop and its doc paragraph go (the page never passed it, so its markup is unchanged — the desktop baseline proves it); the overlay's drawing moves into the popup's drawing file; the board-frame overlay and the blank-alone layout retire.
- **P-16 — With Dimensions off the bottom plane (the dashed baseline) stays.** It is the rocker's zero, a reference line, not a dimension.
</decisions>

<context>
@CLAUDE.md
@.claude/CLAUDE.md
@.planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/261017-ojc-BRIEF.md
@.claude/skills/sketch-findings-shaper/SKILL.md
@.claude/skills/sketch-findings-shaper/references/drawing-and-callouts.md

Built before this plan (read their exports, do not rebuild them): `lib/geometry/custom-rocker.ts`
(`withCustomRocker`, `customPrintedStations`, `isNaturalSpec`, `normalizeSpec`, `bendAt`, `bendPoint`,
`blankDisplayName`), `lib/geometry/board-profile.ts` (`BoardSideProfile`, `BlankSideView`, `printedBlankStations`),
`lib/geometry/design.ts` (`designSideProfile`, `LIVE_DESIGN_RULES`), `lib/geometry/measure-display.ts`
(`formatMark`, `stationLabel`), `components/design/use-viewer-media.ts` (`useCoarsePointer`, `usePortraitViewport`,
`useBelowShellWidth`, `useShortScreen`).

Read before building (each once, the named ranges only):
- `components/rocker/custom-rocker-drawing.tsx` (all, 133 lines), `components/rocker/custom-rocker-blank-view.tsx`
  (all, 178), `lib/geometry/custom-rocker-art.ts` (all, 589) and its test (all, 399).
- `components/rocker/rocker-viewer.tsx` lines 1–60 (the header), 143–214 (props), 497–579 (`RockerOverlayLayer`),
  595–610 and 940–960 (where the overlay is drawn).
- `components/rocker/customize-rocker-dialog.tsx` lines 95–120 and 195–247 (the draft, `bent`, `showBoard`, the
  body's layout classes).
- `components/viewer/toolbar-button.tsx` (all), `components/viewer/zoom-viewport.tsx` lines 495–609
  (`ScreenSizeGroup`, `COARSE_TOUCH_BOX`, `ViewerZoomControl`), `components/viewer/callout-primitives.tsx` lines
  160–220 and 470–500 (`DimensionTick`, `CalloutChipFrame`, `useSvgClientSize`).
- `components/rocker/rocker-editor.tsx` lines 300–380 (the page's VIEWER toolbar — the look to match) and
  `components/rocker/blank-filter-bar.tsx` lines 85–105 (a `ViewerToolbarButton` already carrying `data-lock-exempt`).
- `components/viewer/tabbed-panel.tsx` around `growOnShortScreen` (`[@media(max-height:500px)]:min-h-fit` — the
  precedent for a card that grows with its drawing on a short screen).
- `components/design/board-lock-scope.test.ts` lines 1–40 and 95–115, `lib/units-isolation.test.ts` lines 380–405.
- `e2e/rocker-custom.spec.ts` (all — its helpers `openRocker`, `pickFirstFittingBlank`, `openCustomizeRocker`,
  `pressUntil`, `noseHalfInch`, `inches`, `settledBox`, `readingTexts`, `sidewaysChecks`, the real sideways iPhone
  844 × 390 and Pixel 7 landscape devices), `e2e/helpers/settings.ts` (switching to Metric).
- The three pictures `.planning/quick/261016-mkb-custom-rocker-a-blank-s-rocker-as-ordere/pictures/02-computer-popup-blank.png`,
  `02-computer-popup-board.png` (the look the founder prefers) and `02-iphone-popup.png` (look with the Read tool).
</context>

<executor_environment>
These rulings come from the orchestrator. Follow them as written.
- **Where to work.** Your own agent worktree only, forked from `claude/heuristic-kowalevski-9134d9` after this
  plan's commit; every path in this plan is relative to your worktree's root. Never touch the main checkout
  (`/Users/kontoes/Code/shaper`) or `main`, never `cd` into another worktree, never push. If the worktree has no
  `node_modules`, link one: `ln -s /Users/kontoes/Code/shaper/node_modules node_modules`, and remove that link before
  you return. No database in this task.
- **Gates.** `npm run build` does not work in a worktree. Use `npx next typegen && npx tsc --noEmit`, `npx vitest
  run`, `npm run lint`, and Playwright as `PW_PORT=3198 IS_WEBPACK_TEST=1 npx playwright test …`. Before every
  Playwright run, `lsof -nP -iTCP:3198 -sTCP:LISTEN` must print nothing unless the server is your own. Long runs in the
  background (`run_in_background`, or `nohup … > e2e.log 2>&1; echo E2E_EXIT=$? >> e2e.log`); read the final
  pass/fail line yourself. A lone failure on a cold webpack server: re-run that file alone first. Never touch
  `.next/dev/lock`; never stop a server you did not start. Every browser test is signed out (Clerk never settles on
  the suite's fake keys).
- **Rules 1 and 2.** Every figure and position is computed in `lib/geometry/`; components turn points into SVG and
  strings into text, nothing else. Every number through `units.ts` / `measure-display.ts` (thickness and rocker are
  marks: 1/16" or whole mm); every word in `custom-rocker-text.ts`. No 25.4 or 10 for a conversion; tests build
  lengths with `mm()` / `inchesToMm()`. Never type a catalogue figure into a test — read it off the app's
  functions, the page, or a geometric identity.
- **The three switches** (CLAUDE.md "Layout"): width decides a layout (`max-shell:`), the pointer decides a control's
  size and whether the zoom row is drawn at 1x (`coarse:`), height decides the short-screen behaviour (the inline
  `[@media(max-height:500px)]`). The Dimensions icon is shown by width or height, never the pointer (D-07). Older
  Safari (< 18.4): every button that lays out children says `flex` and `items-*` itself; no CSS 3D.
- **The board lock.** View-only controls (both icons, the zoom) carry `data-lock-exempt`.
- **Catalogue text renders as React text only** — SVG text through JSX, no `dangerouslySetInnerHTML`.
- **No checkpoints.** The founder looks at the pictures between this plan and the merge.
- **Commits.** Each task its own commit (Task 3 may be two). Plain-English subjects about the board and the screen —
  the suggested subjects are fine. Every message ends with `Co-Authored-By: <the model you are>
  <noreply@anthropic.com>`. Stage files by name; never a stage-everything command; never `git stash`.
- **Scratch files.** Never a loose `.ts`, `.js`, `.mjs` or `.cjs` under `.planning/` or anywhere in the repo. The
  pictures' scratch Playwright config and spec live in `pictures/` only while they run, then go into
  `pictures/shoot-source.tar.gz` and are deleted. Files outside the worktree are copied with Bash `cp`.
- **Scope.** Stay inside `files_modified`; a one-line compile fix elsewhere is allowed if the SUMMARY records it.
- **Code comments.** The surrounding files' voice, citing D-01 … D-08 and P-1 … P-16, quick 261017-ojc and
  2026-10-17, the founder as they/them.
- **The SUMMARY.** Commit `261017-ojc-SUMMARY.md` (`status: complete`) inside the worktree as the last commit, subject
  `docs(quick-261017-ojc): summary — the Customize Rocker popup's drawing, one grammar for both states`. Do not edit
  STATE.md, ROADMAP.md or the todo (the orchestrator moves it).
</executor_environment>

<tasks>

<task type="tracer">
  <name>Task 1 (tracer): Show my board becomes an icon in the drawing's upper right, and turning it on puts the board inside the same drawing under the heading Blank Dimensions & Your Board</name>
  <files>lib/geometry/custom-rocker-art.ts, lib/geometry/custom-rocker-art.test.ts, lib/geometry/custom-rocker-text.ts, lib/geometry/custom-rocker-text.test.ts, components/rocker/custom-rocker-blank-view.tsx, components/rocker/custom-rocker-drawing.tsx, components/rocker/rocker-viewer.tsx, components/viewer/toolbar-button.tsx, components/viewer/zoom-viewport.tsx, components/design/board-lock-scope.test.ts, e2e/rocker-custom.spec.ts</files>
  <read_first>components/rocker/custom-rocker-drawing.tsx, components/rocker/custom-rocker-blank-view.tsx, lib/geometry/custom-rocker-art.ts (lines 110–180), lib/geometry/board-profile.ts (lines 88–155 and 223–279), lib/geometry/blank-fit.ts (lines 300–340 and 520–570 — how the board's rocker and the blank's bottom are levelled), components/rocker/rocker-viewer.tsx (the ranges in context), components/viewer/toolbar-button.tsx, components/rocker/rocker-editor.tsx (300–380), e2e/rocker-custom.spec.ts (228–305)</read_first>
  <action>
    Implements D-01 (one drawing), D-04, D-08 (Show my board as an icon), P-3, P-11, P-15. The thinnest path through
    every layer: after this task the popup draws one svg in both states, with the board inside it when on. The figures
    and their layout keep today's blank-alone look until Task 3 — only the board, the toolbar and the heading change.

    **lib/geometry/custom-rocker-art.ts — `boardInBlankFrame(profile)`** (pure; doc comment citing P-3). Takes the
    draft's `BoardSideProfile`; returns null when `profile.blank` is null. Otherwise, with `view = profile.blank`, `L =
    profile.length` and `start = view.start`, it returns `{ shift, start, length: L, outline, stations, rockerAt }`:
    - `shift` = `view.onBlank.prepared.rocker.sample(L / 2 − start)` − `view.bottomAt(mm(L / 2))` — the one constant that
      carries a height in the board's frame (zero at the board's own low point) into the blank's frame (zero at the bent
      blank's low point, the drawing's bottom plane). It is constant along the board because the board's rocker and the
      blank's bottom are both the blank's curve less a constant (the crop's re-level, the centre gap, a Bottom
      fine-tune's re-level; Pin deck's tip thinning appears in both and cancels) — the test proves it.
    - `outline`: 121 points along the board, `s` from 0 to L: `{ x: s − start, bottom: rockerAt(s) + shift, deck:
      deckAt(s) + shift }`, in the blank's frame (x from the blank's tail tip).
    - `stations`: for each of `profile.stations`: `{ x: station − start, bottom: rockerAt + shift, deck: deckAt + shift,
      thickness: profile.effectiveFoil[key] }` — exactly the page's thickness figures.
    - `rockerAt(x)`: the board's rocker at blank position x, read the way the page reads it — `profile.rockerAt(mm(x +
      start))` when `x + start` lies within [0, L] (1e-6 slack), else null (P-3: never the height above the blank's
      plane, which would add the centre gap everywhere).
    Remove `boardFrameOverlay` and its `describe` block in the test (the popup no longer draws in the board's frame);
    `rockerOverlay` and `blankFrameOverlay` and their "drawn from ONE spec" tests stay exactly as they are (D-05).

    **lib/geometry/custom-rocker-art.test.ts — the board in the blank's frame.** On the Longboard preset in its own
    blank (found by reading `BOARD_PRESETS` and `presetDesignFields`, as the file already does), for the natural rocker
    and for the existing `SPECS`, each built with `designSideProfile({ ...fields, blank: { ...fields.blank, rocker: spec
    } }, LIVE_DESIGN_RULES)`:
    - `shift` is the same, within 1e-9 mm, at 41 even stations along the board — also with the blank's `tipStyle` set to
      each of `"pinDeck"` and `"bottom"`, with a Bottom fine-tune (`nose12Offset` and `tail12Offset` non-zero, `fineTuneSurface`
      `"bottom"`), and at an off-centre placement (half of `placementRange`'s max);
    - the board's drawn curve and the drawing's bent blank are one curve: `view.onBlank.prepared.rocker.sample(x)`
      equals `withCustomRocker(prepareBlank(copy), spec).rocker.sample(x)` within 1e-9 at 41 x along the blank;
    - with no fine-tune, `shift` equals `view.centerGap + view.onBlank.cropMinimum` within 1e-9 (the board's bottom
      sits the centre gap above the blank's bottom — what P-3 keeps out of the BOARD figure);
    - `rockerAt` is null at the blank's two tips for every preset that opens in a blank (first assert `view.start < 0`
      and `view.end > length` — the board stops short), equals `profile.stationRocker.center` at the board's own centre,
      and equals `profile.rockerAt` itself wherever the board reaches.

    **lib/geometry/custom-rocker-text.ts** — `drawingHeading(showBoard)` reads `Blank Dimensions` / `Blank Dimensions &
    Your Board` (D-04); update its test and the doc comment.

    **components/rocker/rocker-viewer.tsx** (P-15) — remove the `overlay` prop from `RockerViewerProps` and from the
    component's parameters, the JSX branch that drew it, the type import of the overlay lines, and the header paragraph
    about the Customize Rocker popup. Move `RockerOverlayLayer` (unchanged body; its doc comment now says it is the
    popup's) into `components/rocker/custom-rocker-blank-view.tsx`. Nothing else in the file changes: the page never
    passed an overlay, so its markup is byte-for-byte what it was.

    **components/rocker/custom-rocker-blank-view.tsx** — new optional prop `board` (the `boardInBlankFrame` result or
    null). When given, draw the board's silhouette after the overlay: a closed path (the outline's bottom tail to nose,
    its deck back) projected with the layout's own `point`, `data-board-silhouette="profile"`, fill
    `var(--outline-board-fill)`, stroke `var(--outline-ink)` at `2 × zoomUnit`, `strokeLinejoin="round"`. (The layout's
    extents stay the blank's in this task, and so does the drawing's accessible name; Task 3's layout takes the board's
    extents in too, and its name comes from the text module.)

    **components/viewer/toolbar-button.tsx** — `BoardInBlankIcon({ className })`, in the voice of the two glyphs beside
    it (P-11): a 24 × 24 side view, `aria-hidden`, `fill="none"`. The blank: a long closed outline, stroke
    `currentColor` 1.25, its deck curving from about (2, 8.5) down through the middle near y 11 and up to (22, 9.5), its
    bottom running back from about (22, 12.5) through the middle near y 15 to (2, 11.5), so both ends lift like a
    rockered blank. The board: a thinner lens inside it, filled `currentColor`, from about (4, 10.4) to (20, 11.2),
    deck near y 12.3 and bottom near y 14 in the middle. Tune the curves by eye in the Task 5 pictures; it must read as a
    board inside a blank at 24 px.

    **components/viewer/zoom-viewport.tsx** — export the existing `COARSE_TOUCH_BOX` constant; nothing else changes.

    **components/rocker/custom-rocker-drawing.tsx** (D-01, D-08, P-11) — the popup never mounts the page's viewer: drop
    its import and the two-way switch; always render `CustomRockerBlankView` with `board={boardInBlankFrame(profile)}`
    when the board is on (the profile memo as today — the DRAFT's side profile; one spec in). Inside the
    `ViewerZoomProvider` (keyed as today), one `relative min-h-0 flex-1` box holds:
    - the heading (`data-custom-rocker-heading`, today's classes without the `coarse:static coarse:mb-1` pair) absolute
      at the top-left, vertically centred on a 34-px row (`flex h-[34px] items-center`);
    - `ViewerToolbar` holding one `ViewerToolbarButton`: `label={SHOW_BOARD_LABEL}`, `pressed={showBoard}`,
      `onClick` flipping it, `data-show-board`, `data-lock-exempt`, `className={COARSE_TOUCH_BOX}`, child
      `BoardInBlankIcon className="size-6"`;
    - `ViewerZoomControl` with its default placement (under the icons);
    - the drawing's own `relative min-h-0 flex-1` box below the band: `mt-20 coarse:mt-10` (P-11 — the icons and, with a
      mouse, the zoom row under them; on a touch screen the zoom row only shows once zoomed and then floats over the
      drawing as on the page).
    Under the drawing the key line stays, alone on its line: drop the chip, its `CHIP_*` imports and the `justify-between`
    row around it.

    **components/design/board-lock-scope.test.ts** — add `ViewerToolbarButton` to `INTERACTIVE` (the filter bar's
    Flat/Upright button and both new icons carry `data-lock-exempt`; the drawing card stays in `LOCKABLE_FILES` and now
    holds that control).

    **e2e/rocker-custom.spec.ts** — in the popup test: Show my board starts with `aria-pressed="false"`; clicking it
    makes it `"true"`; the heading reads `Blank Dimensions` then `Blank Dimensions & Your Board`; in both states the card
    holds exactly ONE `svg[role="img"]` and, when on, `[data-board-silhouette="profile"]` is inside that svg; the zoom
    check is unchanged.

    Commit: `Customize Rocker: Show my board is now an icon in the drawing's corner, and it draws your board inside the
    same picture of the blank instead of switching to a different drawing`.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/custom-rocker-art.test.ts lib/geometry/custom-rocker-text.test.ts components/design/board-lock-scope.test.ts && npx next typegen && npx tsc --noEmit && npm run lint && PW_PORT=3198 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-custom.spec.ts e2e/desktop-baseline.spec.ts --project=desktop</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "from \"./rocker-viewer\"" components/rocker/custom-rocker-drawing.tsx components/rocker/custom-rocker-blank-view.tsx` totals 0 (the popup imports nothing from the page's drawing).
    - `grep -c "overlay?:" components/rocker/rocker-viewer.tsx` is 0, and `grep -c "export function RockerOverlayLayer" components/rocker/custom-rocker-blank-view.tsx` is 1.
    - `grep -c "export function boardInBlankFrame" lib/geometry/custom-rocker-art.ts` is 1.
    - `git status --short e2e/desktop-baseline.spec.ts-snapshots` prints nothing (no picture re-recorded) and the ROCKER baseline passes.
    - The verify command exits 0.
  </acceptance_criteria>
  <done>On a computer, Show my board is an icon in the drawing's upper right; pressing it draws the board inside the same picture of the bent blank under the heading Blank Dimensions & Your Board; the page's own ROCKER drawing is unchanged.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The drawing's figures and layout, worked out and tested on every blank — the blank's thickness above the foam with the board's beside it, Natural, Custom and Board rocker stacked under each station, in every popup size</name>
  <files>lib/geometry/custom-rocker-art.ts, lib/geometry/custom-rocker-art.test.ts, lib/geometry/custom-rocker-text.ts, lib/geometry/custom-rocker-text.test.ts</files>
  <read_first>lib/geometry/custom-rocker-art.ts (all, after Task 1), lib/geometry/custom-rocker-art.test.ts (all), lib/geometry/custom-rocker.ts (customPrintedStations, isNaturalSpec), lib/geometry/board-profile.ts (printedBlankStations), lib/geometry/measure-display.ts (formatMark, stationLabel), components/rocker/rocker-view-frame.ts (RAIL_LABEL_TEXTS, THINNING_MARK_OVERSHOOT)</read_first>
  <behavior>
    custom-rocker-art.test.ts (real blanks via `readSeedCatalog().filter(isPickable)` and `prepareBlank`; the Longboard
    preset found by reading `BOARD_PRESETS`; no figure typed):
    - `textWidthPx(text, px, trackingEm)` never reads under what Chromium measured for Inter Bold on 2026-10-17 and never
      more than a quarter over: `CUSTOM` at 9 px tracked 0.08 → at least 44.4; `4 15/16"` at 12 → at least 47.9;
      `Nose @ 30.5 cm` at 9 tracked → at least 82.1; `114` at 12 → at least 18.5; `Thickness` at 10 tracked → at least
      57.9; each at most 1.25 × its measured width.
    - `blankViewStations(bent, spec, system, board)`, both systems: five stations tail tip … nose tip at 0, 12", L/2,
      L − 12", L; rocker figures `nat` (printed, `formatMark`, `—` for a printed null) always; `custom`
      (`customPrintedStations`) at all five exactly when the spec is not natural (P-4); `board` at all five exactly when a
      board is given — `formatMark(board.rockerAt(x))`, or `—` marked muted where it is null (P-3); thickness: board
      absent → one untagged `blank` figure; board given → `blank` tagged BLANK and `board` tagged BOARD with
      `formatMark(board.stations[key].thickness)` (P-5); the paired board station's x and deck; the board's bottom at x
      where the board reaches it; the flat card's name through `stationLabel` (P-6).
    - `blankViewLayout` — the gate. Every pickable blank (219) × {natural, `+2"N +2"T`, `-1"N24" +1/2"T`} × board
      {absent, present} × {imperial, metric} × the six boxes below, Dimensions on. The board: the Longboard preset's
      design with its blank swapped to the record (`placement` 0, the spec as its rocker) and its outline length set to
      the blank's length less 3 1/2", held within `BOARD_LENGTH_RANGE_IN`; profiles and bent blanks cached per record and
      spec, so the whole gate stays well under a minute. Boxes (the svg's own CSS-px box, the toolbar band already off):
      computer 778 × 469 flat; narrow browser window 784 × 194 flat; Pixel 7 sideways 523 × 143 flat, scroll; iPhone
      sideways 502 × 181 flat, scroll; iPhone upright 356 × 203 nose-up; Pixel 7 upright 378 × 279 nose-up. Collected as
      sentences and asserted once (as the file's current gate does):
      - one uniform scale (along and across), nose left lying flat and up standing;
      - every label box (cards, stacks, titles) inside [0, width] × [0, layout height]; layout height equals the box's
        height, except a scroll box, where it is at least the box's height (P-9);
      - no two label boxes meet or come within 2 px — cards, stacks and titles alike;
      - every card leader ends exactly on its target (the blank's deck at the blank station; the board's deck at the
        board station) and starts on its own card's edge; every stack leader ends at the blank's bottom at its station
        (running on to the board's bottom there when the board reaches it — whichever is farther from the stack) and
        starts on its stack's edge; ticks sit at those points;
      - leaders of different stations never cross when the board ends within 12" of each blank tip (P-13);
      - the label scale is 1 in the computer and narrow-window boxes and at least 0.8 in every box; `console.log` the
        smallest per box (the SUMMARY quotes it against P-8's measured figures — 1 on the Pixel 7 upright, 0.95 on the
        iPhone upright with the board on, 0.9 / 0.85 on the Pixel 7 / iPhone sideways).
      Dimensions off, every box: no cards, stacks or titles; the blank (and board) outline, baseline and overlay inside
      the box with at least the gutter to spare; the fit tight on one axis (along: box along − 2 × gutter; or across
      likewise) within 1e-6.
    custom-rocker-text.test.ts: `FIGURE_TAGS` reads NAT, CUSTOM, BOARD, BLANK; `BLANK_VIEW_TITLES` equals
    `RAIL_LABEL_TEXTS` (`deck` → thickness, `bottom` → rocker; import it from `components/rocker/rocker-view-frame`, a
    pure module); `DIMENSIONS_LABEL` is `Dimensions`; `blankViewName(...)` (the drawing's accessible name) names the
    blank with its rocker and, with the board on, says the board is inside it.
  </behavior>
  <action>
    Implements D-02, D-03, D-07 (the frame with no dimensions), P-2 … P-9, P-13, P-14, P-16. Tests first. Today's
    blank-alone functions stay untouched in this task (the drawing still uses them until Task 3).

    **lib/geometry/custom-rocker-text.ts** — `FIGURE_TAGS`, `BLANK_VIEW_TITLES` (`Thickness`, `Rocker` — the page
    viewer's words), `DIMENSIONS_LABEL`, `blankViewName(copy, spec, showBoard)` built on `blankDisplayName`.

    **lib/geometry/custom-rocker-art.ts — a new section, "The one drawing (quick 261017-ojc)".**
    - `textWidthPx(text, px, trackingEm = 0)` (P-14): the sum over characters of an advance table for Inter Bold, in em,
      measured in Chromium (2026-10-17) and rounded up about 5%, plus `trackingEm` a character, times `px`: digits 0.71
      except `1` 0.47; space 0.29; slash 0.41; inch mark 0.58; period 0.35; hyphen 0.49; plus 0.71; `@` 1.07; middle dot
      0.35; em dash 1.05; capitals 0.81 except M 0.98 and W 1.11; lower case 0.65 except i, l and j 0.29, t 0.38, r 0.44,
      f 0.42, m 0.97; anything else 0.75. Every drawn text is bold, so there is no weight argument.
    - `BLANK_VIEW` constants, CSS px at label scale 1: pad 8; figure value 12; tag 9; station name 9; title 10; tracking
      0.08 em; card padding 6 across, 3 down; a card's name row 12; line pitch 14; tag-to-value gap 4; two figures on one
      upright line 8 apart; 3 px of air between labels on a rail; leader at least 10; title gap 6; Dimensions-off gutter
      8 (the bend mark's 6-unit overshoot and a hairline); label scales tried 1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7.
    - `blankViewStations(bent, spec, system, board)` → five stations (shape in `<behavior>`). Rocker figure keys `nat`,
      `custom`, `board`; thickness figure keys `blank`, `board`; each figure `{ key, tag, value, muted }` (tag null on
      the lone blank figure when there is no board; muted for a `—`).
    - `blankViewLayout({ width, height, orientation, lengthMm, blank: samples, board: outline or null, stations,
      dimensions, scroll })`. Try each label scale in turn (every size in `BLANK_VIEW` but the pad, leader and gutter
      multiplied by it); the first that fits wins (P-8); return it as `labelScale`. A scale fits when no label is pushed
      past its rail by the sweep, the scale is positive, and standing up the columns fit the width. The extents cover the
      blank AND the board (along: min(0, board x) to max(L, board x); across: min(0, every bottom) to max(every deck)).
      - Label sizes: a card is as wide as the widest of its name (lying flat only — P-6) and its figure lines, plus the
        padding; as tall as the padding, the name row (flat only), one value and a pitch for each further line. A figure
        line is its tag's width, the gap and its value's width (no tag, no gap). A stack holds one figure a line lying
        flat and two a line standing (NAT and CUSTOM, then BOARD), 3 px wider than its widest line, as tall as one
        value and a pitch per further line.
      - Lying flat (nose left): each tip reserves room past its end for the wider of its card and its stack; the along
        scale = (width − 2 pad − both reaches) / along span. The fixed rows across = title + gap + the tallest card +
        leader + leader + the tallest stack + gap + title. Not scrolling, the scale is the smaller of the along scale and
        (height − 2 pad − fixed rows) / across span; scrolling (a short screen — P-9), the along scale alone, and the
        layout's height grows to fit if it must. The whole composition is centred in the height: the Thickness title,
        the cards' row (their bottom edges on one line), the leader gap, the foam (the deck's highest point at the top),
        the leader gap, the stacks' row (their top edges on one line), the Rocker title under the tallest stack; both
        titles centred on the width (P-7).
      - Standing (nose up): the titles' band across the top; each tip reserves room past its end for the taller of its
        card and its stack; the composition is centred across: the stack column (right-aligned on its leader edge), the
        leader gap, the foam, the leader gap, the card column; the scale is the smaller of the along and across fits;
        Rocker titles the stack column and Thickness the card column, each centred over it.
      - Along each rail, each label starts where its anchor wants it — the tips' outward, the 12" stations' inward, the
        centre's centred (today's `REACH`) — and the two-way sweep the file already uses keeps 3 px between neighbours
        and every label on its rail ([pad, width − pad] flat; below the titles' band standing).
      - Leaders and ticks as the `<behavior>` gate states. Card texts are centred in the card; flat stacks anchor on the
        side their leader leaves from (nose tip and tail 12": end; nose 12" and tail tip: start; centre: middle);
        standing stacks anchor end. Every text the layout returns carries its x, baseline, anchor, size and, for figure
        lines, its parts (tag, value, muted).
      - Dimensions off (D-07, P-16): no labels; the scale is the smaller of (along − 2 gutter) / along span and (across
        − 2 gutter) / across span, the foam (and board) centred; the baseline and the overlay still project.
      - Return `{ viewBox: "0 0 width height", width, height, scale, labelScale, point, blankOutline, boardOutline,
        baseline, cards, stacks, titles, type }`, where `type` holds the scaled text sizes.

    Commit: `The Customize Rocker drawing's figures and layout, worked out and tested: the blank's thickness above the
    foam with the board's beside it, Natural, Custom and Board rocker stacked under each station, on every blank in every
    popup size`.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/custom-rocker-art.test.ts lib/geometry/custom-rocker-text.test.ts && npx next typegen && npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -cE "^import .*from \"(react|next/|@/components|@/lib/db)" lib/geometry/custom-rocker-art.ts lib/geometry/custom-rocker-text.ts` reports 0 for each (the test file alone imports the frame module's words).
    - `grep -v '^\s*\(//\|\*\|/\*\)' lib/geometry/custom-rocker-art.ts | grep -c "25\.4"` is 0.
    - The gate runs 219 blanks in all six boxes and passes; the test output names each box's smallest label scale.
    - The verify command exits 0.
  </acceptance_criteria>
  <done>Every figure, card, stack, leader and title of the one drawing is computed and tested in both orientations, both systems, board off and on, Dimensions on and off, on every pickable blank.</done>
</task>

<task type="auto">
  <name>Task 3: The popup draws the new layout — cards hugging the foam, stacked rocker figures, the two titles — and on a phone a Dimensions icon clears the figures so the foam fills the drawing</name>
  <files>components/rocker/custom-rocker-blank-view.tsx, components/rocker/custom-rocker-drawing.tsx, components/rocker/customize-rocker-dialog.tsx, lib/geometry/custom-rocker-art.ts, lib/geometry/custom-rocker-art.test.ts, lib/units-isolation.test.ts, e2e/rocker-custom.spec.ts</files>
  <read_first>components/rocker/custom-rocker-blank-view.tsx and components/rocker/custom-rocker-drawing.tsx (after Task 1), lib/geometry/custom-rocker-art.ts (the new section), components/viewer/callout-primitives.tsx (DimensionTick, CalloutChipFrame, useSvgClientSize), components/viewer/zoom-viewport.tsx (ScreenSizeGroup), components/viewer/tabbed-panel.tsx (growOnShortScreen), components/rocker/customize-rocker-dialog.tsx (95–120, 195–247), components/design/use-viewer-media.ts</read_first>
  <action>
    Implements D-01, D-02, D-03, D-05, D-07, D-08, P-5 … P-12, P-15, P-16.

    **components/rocker/custom-rocker-blank-view.tsx — the one drawing.** Props: `bent`, `spec` (the draft's — one spec
    in), `board` (Task 1's object or null), `orientation`, `dimensions`, `scroll`. The svg (`data-blank-view`, `role="img"`,
    `aria-label` from `blankViewName`) fills a wrapper box; it measures its own box (`useSvgClientSize`) and draws
    nothing until measured. From `blankViewStations` and `blankViewLayout` it paints, in this order: the baseline (as
    today); the blank (as today, `data-blank-silhouette`); the overlay (`RockerOverlayLayer` fed `blankFrameOverlay(spec,
    bent)` — D-05); the board (Task 1's path, from the layout's `boardOutline`); then, Dimensions on, every leader
    (`var(--outline-station-line)`, `zoomUnit` wide), every tick (`DimensionTick`), every card
    (`data-blank-view-card={key}`: `CalloutChipFrame` with the name row and figure rows) and stack
    (`data-blank-view-rocker={key}`), each inside a `ScreenSizeGroup` about its leader's start so it keeps its screen
    size when zoomed, and the titles (`data-blank-view-title="thickness"` / `"rocker"`). A figure row is one SVG text;
    each figure inside it is a tspan carrying `data-figure` (`nat`, `custom`, `board`, `blank`) holding a tag tspan
    (`data-figure-tag`, the tag size, bold, tracked 0.08em, `var(--outline-callout-label)`) and, after the tag gap as
    `dx`, a value tspan (`data-figure-value`, the value size, bold, `var(--outline-ink)`, or the label colour when muted);
    names and titles bold, tracked 0.08em, in the label colour; every size from the layout's `type`. The thinning marks
    are not drawn (P-12). When `scroll` and the layout's height is taller than the measured box, the wrapper takes that
    height as its minimum (P-9). `useViewerZoom(svgRef, layout.viewBox, { touch: "pan" })` as today.

    **Retire the old drawing data** (P-15): delete the blank-alone layout and stations, its constants, its rail titles
    and its old width estimate from `custom-rocker-art.ts`, with the tests that exercised them (the "drawn from ONE spec"
    overlay tests stay).
    <!-- planner-discipline-allow: blankAloneLayout -->
    <!-- planner-discipline-allow: blankAloneStations -->
    <!-- planner-discipline-allow: BLANK_ALONE -->
    <!-- planner-discipline-allow: RAIL_TITLES -->
    <!-- planner-discipline-allow: estimateTextWidth -->
    <!-- planner-discipline-allow: data-blank-alone -->
    Those are `blankAloneLayout`, `blankAloneStations`, `BLANK_ALONE`, `RAIL_TITLES` and `estimateTextWidth`; the
    `data-blank-alone` hooks go with them.

    **components/rocker/custom-rocker-drawing.tsx** (D-07, D-08, P-10, P-11):
    - A second toolbar icon, DOM-after Show my board (so it lands to its left): `ViewerToolbarButton` with
      `label={DIMENSIONS_LABEL}`, `pressed={dimensions}`, `data-show-dimensions`, `data-lock-exempt`, a lucide
      `RulerDimensionLineIcon` (`size-6`), and `className` = `COARSE_TOUCH_BOX` plus `hidden max-shell:flex
      [@media(max-height:500px)]:flex` — shown below the shell width and on a short screen, never by the pointer.
    - What the drawing does follows the same two switches, read in JavaScript as ROCKER's TOP VIEW tab does
      (`useBelowShellWidth()`, `useShortScreen()`): `dimensionsShown = dimensions || !(belowShellWidth || shortScreen)`,
      so a window widening past the line brings the figures back; `scroll = shortScreen`.
    - The zoom provider's key gains `dimensionsShown` (a different frame starts again at 1x).
    - On a short screen the card and the drawing's boxes grow with the drawing
      (`[@media(max-height:500px)]:min-h-fit`, the `tabbed-panel.tsx` precedent) so the drawing column scrolls rather
      than clipping (P-9); the card keeps its `[@media(max-height:500px)]:min-h-[220px]`.

    **components/rocker/customize-rocker-dialog.tsx** — `const [dimensions, setDimensions] = useState(true)` beside
    `showBoard` in `CustomizeRockerBody`, which is keyed on each opening's `session`, so Dimensions starts On every time
    the popup opens, exactly as Show my board starts Off (P-10: not remembered); passed to the drawing with its setter.

    **lib/units-isolation.test.ts** — run it; if its completeness walk asks for the drawing card, list it
    (`converted: true`).

    **e2e/rocker-custom.spec.ts** — move the existing readers to the new hooks so the spec stays green at this commit:
    `readingTexts` becomes a reader of a stack's figure (`[data-blank-view-rocker="{key}"] [data-figure="{nat|custom}"]
    [data-figure-value]`); the +1" check reads CUSTOM − NAT at the nose tip; the five-readings count reads
    `[data-blank-view-rocker]`; `sidewaysChecks` reads the stacks. (Task 4 adds the new proofs.)

    Commits: `The Customize Rocker drawing looks the same with or without your board: the blank's thickness on cards
    above the foam, its natural, custom and board rocker stacked under each station` — and, if split, `On a phone, a
    Dimensions icon clears the figures off the Customize Rocker drawing so the blank fills it`.
  </action>
  <verify>
    <automated>npx vitest run components lib && npx next typegen && npx tsc --noEmit && npm run lint && PW_PORT=3198 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-custom.spec.ts --project=desktop</automated>
  </verify>
  <acceptance_criteria>
    - `grep -rn "blankAloneLayout\|blankAloneStations\|BLANK_ALONE\|RAIL_TITLES\|estimateTextWidth\|data-blank-alone" lib components e2e` prints nothing.
    - `grep -c "useViewerZoom(" components/rocker/custom-rocker-blank-view.tsx` is 1 and `grep -c "blankFrameOverlay(" components/rocker/custom-rocker-blank-view.tsx` is 1.
    - `grep -c "max-shell:flex" components/rocker/custom-rocker-drawing.tsx` is at least 1, and the Dimensions button's className holds no `coarse:` display class (the pointer never decides whether it shows).
    - `grep -c "useShortScreen()" components/rocker/custom-rocker-drawing.tsx` and `grep -c "useBelowShellWidth()" components/rocker/custom-rocker-drawing.tsx` are each at least 1.
    - The verify command exits 0.
  </acceptance_criteria>
  <done>Both states draw the one grammar; on a phone the Dimensions icon hides the figures and the foam fills the drawing; the old blank-alone drawing is gone.</done>
</task>

<task type="auto">
  <name>Task 4: Browser tests prove the stacked figures, the board's thickness beside the blank's, the heading, the icons and the Dimensions toggle on a computer, an upright phone and both phones held sideways</name>
  <files>e2e/rocker-custom.spec.ts</files>
  <read_first>e2e/rocker-custom.spec.ts (all, after Task 3), e2e/helpers/settings.ts, e2e/helpers/blank-picker.ts</read_first>
  <action>
    Proves D-01, D-02, D-03, D-04, D-05, D-07 and D-08 in the browser. Never type a catalogue figure (read it off the page). Add small
    helpers in the spec: `figure(dialog, rail, key, fig)` (the value text), `labelBoxes(dialog)` (every
    `[data-blank-view-card]`, `[data-blank-view-rocker]` and `[data-blank-view-title]` box), `meets(a, b)`, and
    `foamLength(dialog, orientation)` (the `[data-blank-silhouette]` box's width lying flat, height standing).
    - **Computer — figures and states.** In the popup test: Show my board off → five cards each with one untagged figure
      and the station name, five stacks each with `nat` and no `custom` (a natural draft — P-4); after `+1/2"N` → every
      stack has `nat` and `custom`; the existing +1" check (CUSTOM − NAT at the nose tip = 1"). Show my board on
      (`aria-pressed="true"`) → every card has a `blank` figure tagged BLANK and a `board` figure tagged BOARD; every stack
      has a `board` figure; the heading reads `Blank Dimensions & Your Board`.
    - **Computer — nothing meets.** With the board on and a change set: no two label boxes meet; every label box lies
      inside the svg's box; none meets the `[data-viewer-toolbar]`, `[data-viewer-zoom]` or `[data-custom-rocker-heading]`
      boxes; every card's texts lie inside its frame (each text's box within its `rect`, 0.5 px slack — the width table
      never under-reads); `[data-show-dimensions]` is not visible. Log the svg's box (`console.log`, for the SUMMARY and
      the unit gate's computer box).
    - **Computer — Metric.** In the existing Metric test: every stack figure value is whole millimetres or `—`
      (`/^-?\d+$|^—$/`) and the card figures too.
    - **A narrow browser window** (desktop project, viewport 760 × 800): `[data-show-dimensions]` is visible (width
      decides, not the pointer — D-07); pressing it empties `[data-blank-view-card]`.
    - **Upright phones** (iphone and android projects): `[data-show-dimensions]` visible with `aria-pressed="true"`; with
      a change set and the board on, no two label boxes meet; pressing Dimensions → `aria-pressed="false"`, zero cards,
      stacks and titles, the `[data-rocker-overlay]` lines still there, the board silhouette still there, and
      `foamLength` grows by at least 1.2× (log both lengths — P-10); every touch icon's box (with its touch box) is at
      least 44 dots.
    - **Sideways phones** (the real 844 × 390 iPhone and the Pixel 7 landscape, as `sidewaysChecks` builds them): labels
      apart with the board on; Dimensions grows `foamLength` by at least 1.2× (log both); with the board on and Dimensions
      on, the last stack's box and the Rocker title lie inside the drawing card's box after scrolling the drawing column
      to its end (P-9).
    - The page-itself test (no `[data-rocker-overlay]` on the page) stays.
    **Gates, in order:** `npx vitest run`; `npx next typegen && npx tsc --noEmit`; `npm run lint`; then in the
    background, all three projects: `PW_PORT=3198 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-custom.spec.ts
    e2e/desktop-baseline.spec.ts e2e/blank-picker.spec.ts e2e/rocker-blanks.spec.ts e2e/rocker-top-view.spec.ts
    e2e/summary-blank.spec.ts e2e/phone-screen-tiles.spec.ts e2e/board-lock-screens.spec.ts e2e/viewer-toolbar.spec.ts
    e2e/viewer-zoom.spec.ts e2e/touch-sizing.spec.ts e2e/old-safari-buttons.spec.ts e2e/new-board.spec.ts`. The ROCKER
    desktop baseline must pass unchanged; never `--update-snapshots`. If time allows, the full suite
    (`PW_PORT=3198 IS_WEBPACK_TEST=1 npx playwright test`) in the background; quote its final line either way.
    Commit: `Browser tests: the Customize Rocker drawing's stacked rocker figures, the board's thickness beside the
    blank's, the corner icons and the phone's Dimensions toggle, on a computer and on phones held both ways`.
  </action>
  <verify>
    <automated>PW_PORT=3198 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-custom.spec.ts e2e/desktop-baseline.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - The background gate's final line reports 0 failed across desktop, iphone and android (quoted in the SUMMARY); `git status --short e2e/desktop-baseline.spec.ts-snapshots` prints nothing.
    - `grep -c "data-show-dimensions" e2e/rocker-custom.spec.ts` is at least 3 and `grep -c "aria-pressed" e2e/rocker-custom.spec.ts` is at least 2.
    - The verify command exits 0.
  </acceptance_criteria>
  <done>The browser proves the new drawing in every layout the popup has, and every ROCKER, blank, phone, lock, toolbar and zoom spec still passes with no baseline moved.</done>
</task>

<task type="auto">
  <name>Task 5: Pictures of the new drawing on a computer and both phones — off and on, both themes, Metric, and the phone's Dimensions off — for the founder's look, and the summary</name>
  <files>.planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-computer-off.png, .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-computer-on.png, .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-computer-off-daylight.png, .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-computer-on-daylight.png, .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-computer-on-metric.png, .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-iphone-off.png, .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-iphone-on.png, .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-iphone-on-no-dimensions.png, .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-pixel7-sideways-on.png, .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-pixel7-sideways-on-no-dimensions.png, .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/shoot-source.tar.gz, .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/261017-ojc-SUMMARY.md</files>
  <read_first>playwright.config.ts, e2e/rocker-custom.spec.ts (the device constants), the three 261016-mkb pictures named in context</read_first>
  <action>
    Implements D-06 (pictures before the merge — this plan shoots them and pushes nothing). A scratch Playwright config
    and spec under `pictures/` (their own webpack dev server on port 3199 in your worktree —
    `lsof -nP -iTCP:3199 -sTCP:LISTEN` empty first; stop it when done), absolute output paths, Slate unless named. The
    board: the Longboard preset in the US Blanks 9'4"B, with `-1/4"N18" +1/8"T36" +1/8"T18"` set through the popup's rows
    (so NAT and CUSTOM differ and the red and blue both show):
    - `ojc-computer-off.png` / `ojc-computer-on.png` — 1280 × 800, the popup, Show my board off / on.
    - `ojc-computer-off-daylight.png` / `ojc-computer-on-daylight.png` — the same in Daylight.
    - `ojc-computer-on-metric.png` — Metric, Show my board on (the note still in inches).
    - `ojc-iphone-off.png` / `ojc-iphone-on.png` — iPhone 14 upright, the drawing pinned on top.
    - `ojc-iphone-on-no-dimensions.png` — the same with Dimensions off.
    - `ojc-pixel7-sideways-on.png` / `ojc-pixel7-sideways-on-no-dimensions.png` — Pixel 7 held sideways, board on,
      Dimensions on / off.
    Look at every picture with the Read tool; compare the computer pair with `02-computer-popup-board.png` (the look the
    founder prefers) and say in the SUMMARY where the new drawing differs and why; check the new board-in-blank icon
    reads at its size (adjust its curves if not, and re-shoot). Archive the scripts into `pictures/shoot-source.tar.gz`
    and delete the loose copies.

    **SUMMARY** (`261017-ojc-SUMMARY.md`, plain English for a shaper, `status: complete`): what the drawing now shows in
    each state and on each screen; each picture and what to look for; the gates' pass lines (vitest, typegen/tsc, lint,
    the background Playwright gate's final line, the full suite's if run); the smallest label scale per box from the unit
    gate and the real svg boxes the browser logged (note any box more than 8 px off the unit gate's, and the gate updated
    to match); the foam's length with Dimensions on and off as the browser logged it; P-1 … P-16 with their measured
    figures, each marked for the founder to confirm or overrule — P-2 (the board's thickness as a second line on each
    card rather than a second row of cards) and P-6 (no station names standing nose-up) first among them; deviations.

    Commits: `Pictures of the new Customize Rocker drawing on a computer and both phones, for the founder's look`, then
    the SUMMARY commit (subject in `<executor_environment>`).
  </action>
  <verify>
    <automated>test "$(ls .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/ojc-*.png | wc -l | tr -d ' ')" = 10 && test -f .planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/pictures/shoot-source.tar.gz && test "$(git ls-files .planning | grep -cE '\.(ts|mjs|cjs|js)$')" = 0</automated>
  </verify>
  <acceptance_criteria>
    - Ten `ojc-*.png` pictures and `shoot-source.tar.gz` are committed; no loose script remains.
    - The SUMMARY has `status: complete`, quotes the Playwright gate's final line and lists P-1 … P-16.
  </acceptance_criteria>
  <done>The founder has pictures of every state and screen, and a SUMMARY carrying every choice to confirm.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| catalogue / saved blank text → drawing | a blank's maker, name and note reach the drawing's accessible name and its SVG text |
| shaper → design store | the drawing's icons sit beside controls that change the board; a locked board must refuse those |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-ojc-01 | Tampering (markup injection) | `custom-rocker-blank-view.tsx` labels and accessible name | medium | mitigate | every figure, name and title renders as JSX text in SVG `text`/`tspan`, the name as a plain attribute value; no `dangerouslySetInnerHTML` (unchanged posture of T-mkb-07). |
| T-ojc-02 | Elevation of privilege | the two toolbar icons on a locked board | low | mitigate | both change only the view and carry `data-lock-exempt`; `board-lock-scope.test.ts` now counts `ViewerToolbarButton` as a control, so an icon without the marker fails the inventory. |
| T-ojc-03 | Denial of service | the layout recomputed on every slider step | low | accept | measured: the label-scale search runs at most seven layouts of five labels each; the full 31,536-layout prototype sweep ran in under 19 s including building every profile, so one layout is far under a frame. |
</threat_model>

<verification>
- `npx vitest run`, `npx next typegen && npx tsc --noEmit`, `npm run lint` pass, including the 219-blank layout gate,
  the overlay's one-spec tests, the board-in-the-blank's-frame tests, the lock inventory and units isolation.
- The Task 4 Playwright gate passes on desktop, iphone and android with no baseline re-recorded; the ROCKER desktop
  baseline passes unchanged.
- The ten pictures show one grammar in both states, the board inside the foam when on, the icons in the corner, and on
  the phones the foam filling the drawing with Dimensions off.
</verification>

<success_criteria>
- The popup draws one picture with or without the board, in the on view's look, on a computer, an upright phone and a
  phone held sideways, in both themes and both unit systems.
- At every blank station the shaper reads the blank's thickness (and the board's when on) above the foam and NAT,
  CUSTOM and BOARD rocker under it, each tagged.
- Show my board and, on a phone, Dimensions are corner icons in the page's toolbar look; Dimensions off fills the
  drawing with the foam.
- The page's own ROCKER drawing is unchanged; the founder has the pictures and the SUMMARY.
</success_criteria>

<output>
Create `.planning/quick/261017-ojc-customize-rocker-popup-one-drawing-for-b/261017-ojc-SUMMARY.md` when done.
</output>
