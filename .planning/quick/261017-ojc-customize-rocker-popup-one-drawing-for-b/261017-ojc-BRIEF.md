# Brief — quick 261017-ojc: the Customize Rocker popup's drawing, one grammar for both states

Written by the orchestrator for the planner, 2026-10-17. Everything under "Decided" is the founder's and locked.

## Where this came from

- Custom rocker went live on 2026-10-17 (quick 261016-mkb; its brief, plans and summaries sit beside this folder,
  and its plan 02's P-3 explains today's two drawings). Fast tasks 170–172 followed the same day: the tail Bend
  starts slider mirrored, a heading over the popup's drawing, the RAILS full-size popup widened.
- The founder, after using it: *"the edit custom rocker viewer changes a ton with the show board on/off. I prefer
  the on view. Can we make the off view match it?"* — then, on 2026-10-17: *"Let's do the off view now — keep
  thickness of the blank above. Under it list the Natural Rocker, the Custom Rocker value, and when the board view
  is on, add the Board's 'current' rocker values too."* Three follow-up answers the same day (below).
- The todo: `.planning/todos/pending/2026-10-17-draw-the-customize-rocker-off-view-like-the-on-view.md` (move it
  to `completed/` in the docs commit; the orchestrator does STATE.md).

## Decided (the founder, 2026-10-17 — locked)

1. **One drawing, one grammar, in both states — the ON view's look.** Today Show my board OFF draws a separate
   blank-alone picture (figures on rails at the card's top and bottom edges, long leaders) and ON draws the page's
   own ROCKER viewer (cards hugging the foam). The founder prefers the on view. Both states now draw the way the
   viewer does: the foam with its cards and figures close to it, the viewer's own chip style and rail titles.
2. **The blank's thickness sits above the foam, always:** its printed thickness at its five catalogue stations
   (nose tip, 12" in, centre, 12" in, tail tip — the DATASHEET's N0 · N12 · C · T12 · T0). **With the board on, the
   board's own thickness cards show too** ("Both when on") — the board's thickness at the board's five stations,
   as the page draws them — so there are two tiers of thickness above the foam when the board is on; the layout
   keeps them apart (the plan measures where).
3. **Under the foam, at each of the blank's five stations, the rocker figures are stacked:** the **Natural** figure
   (the catalogue's printed rocker), the **Custom** figure (as ordered — the same figures the DATASHEET's Custom
   Rocker row prints: printed + the bend, tips exact, the centre as it prints), and **with the board on, the
   board's "current" rocker at that same point** — the board's bottom height above the blank's levelled plane at
   that blank station, read off the draft's side profile. Each line says which it is (Natural / Custom / Board, or
   NAT / CUSTOM / BOARD in the chip's small type) so a shaper can't confuse them; where natural and custom agree
   (a natural draft) the plan may show one figure marked natural rather than two equal lines — the planner's
   call, recorded as a P-item.
4. **The heading** (fast task 171's `drawingHeading`): **"Blank Dimensions"** with the board off; **"Blank
   Dimensions & Your Board"** with it on ("use & instead of a dot").
5. **Unchanged:** the natural rocker dashed behind the bent foam, a short mark across the bottom where each bend
   starts, the first change's outline red and the second's blue, drawn from the SAME spec as the curve (one spec
   in, one drawing out — the founder's round-ten catch, with its unit test); the page's zoom on the drawing
   (buttons, wheel, drag, pinch; strokes, dashes and type at screen size); Show my board off by default; the
   popup's layout (rows left, drawing right; on an upright phone the drawing pinned on top, turned nose-up, the
   rows beneath; a sideways phone the desktop shell on a short screen); the board lock; Cancel changes nothing.
6. **Pictures before the merge, nothing pushed without the founder's go** (the orchestrator's steps).
7. **A Dimensions toggle on a phone** (the founder, 2026-10-17, while this was being planned: *"lets also add a
   toggle to turn off dimensions when on a phone (so the user can see the board in a larger view). This toggle
   will need to maximize the board/blank size in the available viewspace."*). On a phone the popup's drawing is
   small (pinned at ~299 tall upright, ~222 tall sideways), so a second chip beside Show my board — **Dimensions:
   On / Off**, the same chip style — hides every card, stacked figure, rail title and tick line and lets the foam
   (and the board, when on) **fill the drawing's box**: the frame fitted to the blank's length across the box's
   width (its height when the drawing stands nose-up), with only the gutter a stroke needs. The natural dashed
   line, the bend marks and the red/blue changes stay (they are the live aid); the zoom still works. Default
   **On** — today's view. Which screens get the chip is decided by CLAUDE.md's switches, never the pointer: the
   stacked-and-pinned layout below the shell width (`max-shell`) and a short screen (`[@media(max-height:500px)]`,
   a phone held sideways) — the two places the drawing is small; a computer keeps its room and no chip. Whether
   the choice is remembered (localStorage like the picker's Flat/Upright) or is view state for the visit is the
   planner's call, recorded as a P-item; a browser test proves the foam grows (its drawn length in CSS px, with
   and without the dimensions) on an upright phone and a sideways one.
8. **The switches are toolbar icons, not chips** (the founder, 2026-10-17, a minute later: *"Rather than the show
   my board and dims chips. lets make icons in the upper right like the other pages have."*). Show my board and
   Dimensions become icon buttons in the drawing card's upper right, in the page's own toolbar grammar —
   `components/viewer/toolbar-button.tsx`'s `ViewerToolbarButton` (an icon as its child, `label` as its
   accessible name and tooltip, `pressed` for a toggle, which paints `aria-pressed` in the accent exactly as the
   ROCKER page's measuring-points and construction buttons do; 44-dot boxes on a coarse pointer) — floating over
   the drawing's top-right corner the way `rocker-editor.tsx`'s VIEWER toolbar floats (its `relative` box at
   :312–:320; `LocateFixedIcon` / `PanelLeftOpenIcon` from lucide there), with the zoom control under them as on
   the page (`ViewerZoomControl placement="under-toolbar"`, today's `"corner"` goes). The Dimensions icon appears
   only where ruling 7 gives it (a phone's two layouts); Show my board everywhere. Icons from lucide-react,
   chosen by the planner (a surfboard-shaped glyph is not in lucide — the page's own `RotateBoardIcon` in
   `toolbar-button.tsx` is the precedent for drawing one, if a ready icon reads wrong); the two labels keep
   today's words (`Show my board`, `Dimensions`). The `data-show-board` hook the spec reads moves to the icon
   button (its text assertion becomes an `aria-pressed` assertion); the key line under the drawing stays, alone
   on its line now that no chip sits beside it. The heading (ruling 4) stays top-left.

## What to build

One plan (or two if the planner finds a clean seam — e.g. the pure layout first, the drawing second), one executor.

- **The drawing data stays pure (Rule 1):** the stations' figures (blank thickness, natural, custom, the board's
  height at the blank's stations), the frame, the rails and every label position come from tested functions in
  `lib/geometry/` (today `custom-rocker-art.ts`: `blankAloneStations` :207, `blankAloneLayout` :390,
  `BLANK_ALONE` :254, `RAIL_TITLES` :347, `estimateTextWidth` :249, and the overlays `rockerOverlay` :116,
  `blankFrameOverlay` :156, `boardFrameOverlay` :167). Components turn points into SVG and strings into text.
  Every figure through `units.ts` / `measure-display.ts` (Rule 2: thickness and rocker are marks — 1/16" or
  whole mm). No catalogue figure typed into a test.
- **Two honest routes — the planner measures and picks one, recording why (a P-item):**
  (a) **Grow the page's viewer.** `components/rocker/rocker-viewer.tsx` already draws one board side profile with
  two card rails (`Thickness` above, `Rocker` below), has a `fitToBoard` frame rule, station-rail modes (:168–
  172: `"full"`, `"none"`, a bare-value mode), and the popup's `overlay` prop (:213; drawn at :498–570 with
  `data-rocker-overlay`). It would gain a "blank stations" layer — the blank's thickness chips on a tier above,
  the stacked rocker figures under the blank's five stations — and a no-board subject for the off state (the foam
  alone as the subject; the frame rule in `rocker-view-frame.ts`'s `rockerViewLayout` :579 relaxed past the
  60–120" clamp for the 36 pickable blanks longer than 120", the longest 151.5"). The page itself must draw
  byte-for-byte what it draws today — it never passes the new props; the ROCKER desktop baseline proves it.
  (b) **Grow today's blank-alone drawing** (`custom-rocker-blank-view.tsx`, 178 lines) into the one drawing for
  both states — the board inside the foam and the board's thickness cards when on — restyled to the viewer's
  grammar (cards hugging the foam, the viewer's chip style and rail titles, its tick lines). Then the popup never
  mounts `RockerViewer`, and `custom-rocker-drawing.tsx` (124 lines) loses its two-way switch.
  Whichever wins, the other path's dead code goes (no second drawing left behind), and the overlay is drawn from
  one function fed the draft spec.
- **No label collisions:** today's `blankAloneLayout` keeps neighbours ≥ 4 px apart with slanted leaders and is
  tested over all 219 pickable blanks × three box sizes (computer ~790×600, iPhone ~350×180 pinned, Pixel 7
  sideways ~530×220) in both orientations; the new layout carries that gate, now with up to three stacked lines
  per station below and two tiers above. Measure the tight cases (the shortest blank 60.25"; a board whose
  stations fall between the blank's; Metric's wider `mm` figures) before writing the plan.
- **The spec** `e2e/rocker-custom.spec.ts` (its `[data-blank-alone-reading]` count of 5, the heading texts, the
  overlay checks, the zoom) follows the new grammar: prove the five stations' stacked figures (natural / custom /
  board) on a computer, the two thickness tiers with the board on, the heading in both states, on a computer, an
  upright phone and a sideways one. `desktop-baseline.spec.ts`'s ROCKER picture must pass unchanged.
- **Pictures** `pictures/ojc-*.png` in this task folder: computer off and on (Daylight and Slate), Metric once,
  iPhone upright off and on, Pixel 7 sideways on; shot from a scratch Playwright config kept under `pictures/`
  while it runs, archived to `pictures/shoot-source.tar.gz`, deleted. Look at every picture before calling it done.
- **Docs in the executor's commits:** none beyond code comments; the orchestrator moves the todo and logs STATE.

## What is true today (checked 2026-10-17)

- `components/rocker/custom-rocker-drawing.tsx` — the card (`data-custom-rocker-drawing`): `ViewerZoomProvider`
  keyed on orientation+showBoard; the heading `data-custom-rocker-heading` (absolute top-left in the zoom band on
  a mouse, static on a touch screen); `profile` (board on) → `<RockerViewer profile blank orientation fitToBoard
  overlay={boardFrameOverlay(...)}>`, else `<CustomRockerBlankView bent spec orientation>`; `ViewerZoomControl
  placement="corner"`; the key line (`OVERLAY_KEY`) beside the `data-show-board` chip.
- `components/rocker/custom-rocker-blank-view.tsx` — `useViewerZoom(svgRef, baseViewBox, {touch:"pan"})`,
  `ScreenSizeGroup` per label, `data-blank-alone`, `data-blank-alone-chip={key}`, `data-blank-alone-reading={key}`.
- `lib/geometry/custom-rocker-text.ts` — every word: `drawingHeading(showBoard)` (fast 171), `OVERLAY_KEY`,
  `SHOW_BOARD_LABEL`, `naturalRockerRowLabel` / `customRockerRowLabel` (the DATASHEET's row words, with `(mm)` in
  Metric), `customRockerFootnote`; tests in `custom-rocker-text.test.ts`.
- `lib/geometry/custom-rocker.ts` — `customPrintedStations(copy, spec)` (the five figures as ordered, exact),
  `withCustomRocker`, `naturalOf`, `bendAt`; the board's side profile from `designSideProfile(fields, rules)` with
  `blank: {...blank, rocker: draftSpec}` (see the drawing component :58–62) — its `BlankSideView` gives
  `bottomAt(s)` / `deckAt(s)` in the board's own station coordinates; `blankStationOf` maps a board station to the
  blank's. The board's "current rocker at a blank station" is the board's bottom height at that x, levelled the
  way the page levels it (the plan states exactly which function and proves it on the Longboard in the 9'4"B).
- `components/rocker/rocker-viewer.tsx` (:143 props, :495 component, :601 `fitToBoard`, :700 zoom) and
  `rocker-view-frame.ts` (`rockerViewLayout` :579, card-pin scale, the `clamp` at :505/:614).
- The popup's measured layout (plan 02's P-12): computer 1180×736, rows 340 wide, drawing card ~804×598; iPhone
  upright 390×664 with the drawing capped at 45dvh (~299 tall); Pixel 7 sideways 863×360, drawing ~539×222.
- Specs: `e2e/rocker-custom.spec.ts` (helpers `openRocker`, `pickFirstFittingBlank`, `openCustomizeRocker`,
  `pressUntil`, `readingTexts`, `settledBox`; tests on a computer, iPhone and Android, plus the tail-direction and
  heading checks from fast tasks 170–171). `e2e/helpers/blank-picker.ts` (`customizeRockerButton`,
  `customRockerDialog`).
- Executor environment: an agent worktree forked from this branch; `npm run build` does not work there (`npx next
  typegen && npx tsc --noEmit`, `npx vitest run`, `npm run lint`, Playwright with `PW_PORT=3198 IS_WEBPACK_TEST=1`);
  `ln -s /Users/kontoes/Code/shaper/node_modules node_modules` if the worktree has none, removed before returning;
  no database in this task; commit the SUMMARY in the worktree; never push.

## Not in this task

The page's own ROCKER viewer (it draws exactly what it draws today), the DATASHEET, the picker's cards, the
hand-set rocker, any change to the maths of the bend or the floor.
