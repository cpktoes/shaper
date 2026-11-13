---
phase: quick-261112-ogx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/bottom-side-view.ts
  - lib/geometry/bottom-side-view.test.ts
  - lib/geometry/bottom-draw.ts
  - components/bottom/viewer-split.ts
  - components/bottom/bottom-side-view.tsx
  - components/bottom/side-profile-key.tsx
  - components/bottom/station-press.ts
  - components/bottom/bottom-editor.tsx
  - components/bottom/bottom-top-view.tsx
  - components/bottom/bottom-section.tsx
  - components/bottom/bottom-copy.ts
  - components/bottom/bottom-copy.test.ts
  - components/design/board-lock-scope.test.ts
  - components/3d/three-d-copy.ts
  - components/3d/brd-preview-dialog.tsx
  - lib/export/brd-preview.ts
  - lib/export/brd-preview.test.ts
  - e2e/bottom-side-view.spec.ts
  - e2e/helpers/bottom-print.ts
  - e2e/three-d-export.spec.ts
  - e2e/phone-bottom.spec.ts
  - e2e/touch-sizing.spec.ts
  - e2e/bottom-viewer.spec.ts
  - CLAUDE.md
  - .planning/quick/261112-ogx-bottom-draws-the-side-profile-under-the-/pictures/
autonomous: true
requirements: [QT-261112-ogx]
estimate:
  # One executor, this worktree, three tasks: the tracer (the pure split and side frame with tests, the side view drawn
  # in VIEWER with its Height opening at x1 and its station line, one desktop browser spec); the key, facts, tap and drag,
  # the reference lines, and the words, rail line and key shared with the Board file preview, which opens at x1; then
  # every BOTTOM, phone and 3D browser spec on three projects (WebKit is slow on the dev server), nine pictures looked at,
  # and the CLAUDE.md clause. Calibration: factor 1, 0 samples, so confidence is low.
  tokens: 170000
  raw_tokens: 170000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "BOTTOM's VIEWER draws three drawings, top to bottom: the board from below (as today), the cross-section (as today, its Height buttons unchanged and still opening at x4), then SIDE VIEW — the deck as one line, the bottom at the stringer as the board's ink edge, and the bottom at the rail before the rails are shaped, dashed in the preview's own rail line, drawn where it parts from the stringer's line — all from sideProfileLines on the store's resolvedBottom, bottomBoard and sideProfile (brief item 1)."
    - "SIDE VIEW opens at Height x1 every time the page opens (never saved); its caption reads the preview's own words, SIDE VIEW · TRUE HEIGHT at x1 and SIDE VIEW · HEIGHT x4 at x4, beside BOTTOM's own HeightPicker, whose group and buttons are spoken as Side view height and Side view height xN; pressing x4 stretches only the side view's height, and when a Height would not fit its box the caption says the factor actually drawn (HEIGHT x2.6), the section's rule (brief item 1)."
    - "The side view keeps the board from below's length scale, nose left: the side view's dash-dot station line stands within 1 dot of the board from below's cutting line at every station, and a tap or drag along the side view moves the section, the cutting line, Section at and the caption, exactly as the board from below does (brief item 1)."
    - "Under the side view the key reads `at the stringer` and `at the rail, before the rails are shaped` on a Deep Single or a Rolled Vee, and the one entry `at the stringer and at the rail — the same line on this bottom` on a flat board (no dashed line drawn); the facts line reads `2 1/8\" at the stringer · 2 1/4\" side profile max` on the Deep Single 6'2\" Shortboard, each thickness in centimetres to one decimal in Metric (brief item 1)."
    - "The side view takes only the height its drawing needs at the Height picked (never more than 40% of what the three drawings share); the board from below and the cross-section share the rest 1.25 to 1 as they do today, the board from below never taller than its board needs; on an upright phone the drawing stays pinned at 66% of the screen with the three drawings inside it and the controls beneath unmoved; on a short screen the drawing column scrolls to the side view; on a touch screen the side view's Height buttons each take a 44-dot touch box (brief item 3)."
    - "The Board file preview's side view opens at x1 (it opened at x4); its x2, x4 and x8 stay; its caption, key words, rail line and facts phrase are the same code BOTTOM uses, not a copy (brief item 2)."
    - "GUIDE, DATA and the phone's NOSE · CENTER · TAIL row are unchanged (brief item 4)."
  artifacts:
    - path: lib/geometry/bottom-side-view.ts
      provides: "SIDE_VIEW_ROOM_ABOVE, SIDE_VIEW_ROOM_BELOW, SIDE_VIEW_MOST, TOP_VIEW_SHARE, SIDE_PROFILE_APART, sideProfileRise, sideProfileParts, sideProfileRailRuns, bottomViewerSplit, sideViewFrame, sideViewPaths, sideViewStationSpan — pure, no React"
    - path: lib/geometry/bottom-side-view.test.ts
      provides: "the split on tall, computer-sized and phone-sized boxes at x1, x4 and x8; the side frame's x matching the top view's; the fitted factor; rail runs on flat, Deep Single and Rolled Vee"
    - path: components/bottom/bottom-side-view.tsx
      provides: "SIDE VIEW: caption and HeightPicker, the drawing, its station line layer, key and facts"
    - path: components/bottom/viewer-split.ts
      provides: "useViewerSplit: measures what the three drawing boxes share and solves the split"
    - path: components/bottom/side-profile-key.tsx
      provides: "railLineProps (the preview's RAIL_LINE, moved here) and SideProfileKey, used by BOTTOM and the Board file preview"
    - path: components/bottom/station-press.ts
      provides: "useStationPress: the press, drag and tap that move the section, shared by the board from below and the side view"
    - path: e2e/bottom-side-view.spec.ts
      provides: "order, x1 opening and x4 stretch, two lines vs one, station lines within 1 dot, a tap moving the section, key and facts in both systems, the phone layouts, the measured split as annotations"
    - path: .planning/quick/261112-ogx-bottom-draws-the-side-profile-under-the-/pictures/
      provides: "nine pictures, each looked at, and shoot-source.tar.gz"
  key_links:
    - from: components/bottom/bottom-editor.tsx
      to: lib/geometry/bottom-side-view.ts bottomViewerSplit
      via: "useViewerSplit measures the three [data-bottom-box] boxes' summed height and the column width, and passes the split's top and side heights to BottomTopView and BottomSideView"
    - from: components/bottom/bottom-side-view.tsx
      to: lib/geometry/side-profile.ts sideProfileLines
      via: "the editor's memoised sideProfileLines(resolvedBottom, bottomBoard, sideProfile), the same lines the split's rise is read from"
    - from: components/bottom/bottom-side-view.tsx
      to: lib/geometry/bottom-draw.ts topViewX and stationAtPointer
      via: "sideViewFrame carries the split's top-view scale (dots per mm) and the board length, so a station's x is the board from below's x"
    - from: components/3d/brd-preview-dialog.tsx
      to: components/bottom/side-profile-key.tsx and BOTTOM_COPY's side words
      via: "SideProfileKey, railLineProps(1), HeightPicker which=side, THREE_D_COPY's preview side words defined from BOTTOM_COPY's"
---

<objective>
BOTTOM's VIEWER gains a third drawing under the cross-section: the board's side profile — the deck, the bottom along the
stringer and the bottom at the rail before the rails are shaped — so a shaper sees how the contours change the flow of
the rocker. It opens at true height (Height x1), shares the board from below's length scale so the section's station line
runs straight through both, and moves the section when tapped or dragged. The Board file preview's side view opens at x1
to match, and the two side views share their words, their dashed rail line and their key.

Purpose: the founder's ruling of 2026-11-12 on sketch 023 — "I like A, but lets put the side view at the bottom: Bottom,
crossection, side, with sides default scaling to 1x to minimize distortion of the rocker and use up the least amount of
space." BRIEF.md in this folder is locked; everything below implements it.

Output: the pure split and side-frame maths with tests, the side view component and its wiring, the shared key / rail
line / words / press hook, the preview opening at x1, updated and new browser specs, nine pictures, one CLAUDE.md clause.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/261112-ogx-bottom-draws-the-side-profile-under-the-/BRIEF.md
@.planning/quick/261112-lmr-side-profile-at-the-stringer-and-at-the-/261112-lmr-SUMMARY.md
@.planning/sketches/023-bottom-side-profile/README.md
@CLAUDE.md
@lib/geometry/side-profile.ts
@components/bottom/bottom-editor.tsx
@components/bottom/bottom-top-view.tsx
@components/bottom/bottom-section.tsx
@components/bottom/section-station.ts
@components/3d/brd-preview-dialog.tsx

<interfaces>
Already in the code (read, do not re-derive):

- lib/geometry/side-profile.ts: sideProfileLines(resolved, board, profile) returns { points: SideProfilePoint[] (every
  SIDE_PROFILE_STEP = 1/4" from the tail, plus the length), stringerThickness, maxThickness }. Each point has station,
  stringerFoamOff, railFoamOff, planedBottom, stringerBottom, railBottom, deck (all Mm). Channels change neither line.
- useDesign() gives resolvedBottom, bottomBoard (BottomBoard: length, widePoint, widePointWidth, frontFins, railAt) and
  sideProfile (BoardSideProfile, which satisfies SideProfileReader).
- lib/geometry/bottom-draw.ts: topViewFrame(board, boxWidth, boxHeight) returns { width 1000, height, px, k (units/mm),
  cy, padTop, padBottom, length }; k = min(TOP_VIEW_LENGTH_UNITS / length, room / widePointWidth) with room = height less
  TOP_VIEW_ROOM_ABOVE (30) and TOP_VIEW_ROOM_BELOW (46) dots. TOP_VIEW_LENGTH_UNITS (900) is not exported yet.
  topViewX(frame, station) and stationAtPointer(x, frame) read only frame.k and frame.length. sectionHeightLabel({
  heightAsked, heightDrawn }) gives TRUE HEIGHT / HEIGHT x4 / HEIGHT x2.6. SectionHeight is 1 | 2 | 4 | 8.
- lib/geometry/bottom.ts: BOTTOM_DATA_DEPTH_SHOWN = 0.25 mm (the preview's "the lines part" rule).
- components/bottom/bottom-section.tsx: HeightPicker({ height, onHeight }) renders role=group aria-label
  BOTTOM_COPY.height, data-bottom-height, data-lock-exempt, four buttons named BOTTOM_COPY.heightButtonName(f), the
  HEIGHT_TOUCH_BOX classes on a coarse pointer. Exported for the preview.
- components/3d/brd-preview-dialog.tsx: RAIL_LINE = { stroke var(--surf-ink-muted), strokeWidth 1.5, strokeDasharray
  "3 2" } in screen dots; KeyEntry renders data-brd-side-key; the side view's state opens at BRD_PREVIEW_SIDE_HEIGHT (4)
  from lib/export/brd-preview.ts.
- components/3d/three-d-copy.ts: previewSideViewAt, previewKeyStringer, previewKeyRail ("at the rail, before the rails
  are shaped (from your bottom, not in the file)"), previewKeyOneLine, previewFacts(count, gap, dims, stringer, max).
- e2e/helpers/bottom-print.ts: boardWithBottom(presetId, picks) returns { kept, board, bottom, resolved, frontPair } and
  openOnBoard(page, board) seeds the open board before the first goto.
- lib/geometry/side-profile.test.ts already builds a shortboard fixture with deepSingle and rolledVee bottoms (linesOf).
</interfaces>
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Tracer — SIDE VIEW drawn under the cross-section, opening at x1, its station line on the board from below's</name>
  <precondition>No `next dev` is serving this checkout and nothing listens on port 3117; if another dev server holds this checkout's lock, stop and say so rather than stopping it.</precondition>
  <files>lib/geometry/bottom-side-view.ts, lib/geometry/bottom-side-view.test.ts, lib/geometry/bottom-draw.ts, components/bottom/viewer-split.ts, components/bottom/bottom-side-view.tsx, components/bottom/side-profile-key.tsx, components/bottom/bottom-editor.tsx, components/bottom/bottom-top-view.tsx, components/bottom/bottom-section.tsx, components/bottom/bottom-copy.ts, e2e/bottom-side-view.spec.ts</files>
  <read_first>BRIEF.md (this folder), sketch 023's README (What every variant draws, and the Decision), lib/geometry/side-profile.ts and its test's fixtures, lib/geometry/bottom-draw.ts lines 400-470 (topViewFrame, topViewX, stationAtPointer) and sectionHeightLabel, components/bottom/bottom-top-view.tsx (its box, frame, cut-line layer), components/bottom/bottom-section.tsx (HeightPicker, caption row), components/bottom/bottom-editor.tsx, components/viewer/callout-primitives.tsx useSvgClientSize, Skill("sketch-findings-shaper") for the drawing grammar.</read_first>
  <behavior>
    - bottomViewerSplit on a very tall box (width 860, height 2000, the Shortboard, x1): the top box is exactly what its board needs at the width-bound scale (widePointWidth x 0.9 x width / length, plus 76 dots of rails, rounded up), the side box is rise x that scale x factor plus the side view's room above and below, the section takes the rest, and the three sum to the height.
    - On a computer-sized box (width 860, height 460, x1): the board from below is height-bound, top : section is 1.25 : 1 within 1 dot, the side box equals rise x the returned frame's dots-per-mm x 1 plus its room (within 1 dot), and the three sum to the height.
    - The same box at x4: the side box is taller than at x1, top and section both shorter, still 1.25 : 1; at x8 on a phone-sized box (366 x 300) the side box is at most 40% of the height and sideViewFrame on that box reports a heightDrawn under 8.
    - Null when the width is 40 dots or less, or when no positive scale fits.
    - sideViewFrame: a station's x equals topViewX of the split's top frame for the same box width (to 0.01 units); stationAtPointer of that x gives the station back (to 0.5 mm); on the split's own side box heightDrawn is the factor asked at x1 and x4 (within 2%); the highest deck point sits the room-above below the top and the lowest bottom the room-below above the bottom when the drawing is fitted.
    - sideProfileParts is false on a flat Shortboard and true on the Deep Single and the Rolled Vee; sideProfileRailRuns is empty on flat, and on the Deep Single every run's inner points part from the stringer by more than SIDE_PROFILE_APART with the rail below the stringer's height, on the Rolled Vee the tail run's rail is above it; sideProfileRise equals the highest deck less the lowest of the two bottom lines.
  </behavior>
  <action>
Build the thinnest end-to-end path: pure maths, one component, the editor wiring, one browser spec.

1. lib/geometry/bottom-draw.ts: export TOP_VIEW_LENGTH_UNITS, and widen topViewX's and stationAtPointer's frame
parameter to Pick of TopViewFrame's "k" and "length" (no behaviour change; every existing caller still compiles).

2. New lib/geometry/bottom-side-view.ts (pure, no React; CLAUDE.md Rule 1), with a header comment citing the founder's
ruling and sketch 023:
- Constants, in screen dots unless said: SIDE_VIEW_ROOM_ABOVE = 12 and SIDE_VIEW_ROOM_BELOW = 12 (room for the station
  line's 8-dot overshoot, and on a touch screen the Height buttons' touch boxes hang about 18 dots below the caption
  row, so the tail's deck stays clear of them); TOP_VIEW_SHARE = 1.25 / 2.25 (today's flex 1.25 : 1 between the board
  from below and the section); SIDE_VIEW_MOST = 0.4 (the side box's most, as a share of what the three boxes share);
  SIDE_PROFILE_APART = mm(0.05) (the sketch's own run threshold).
- sideProfileRise(lines): the highest deck less the lowest of every stringerBottom and railBottom, as Mm.
- sideProfileParts(lines): true when any point's railBottom and stringerBottom differ by more than
  BOTTOM_DATA_DEPTH_SHOWN — the Board file preview's own "one line or two" rule.
- sideProfileRailRuns(lines): empty unless sideProfileParts; otherwise the runs of consecutive points where the point
  or either neighbour parts by more than SIDE_PROFILE_APART (the sketch's rule, so each run starts and ends on the
  stringer's line), each run an array of SideProfilePoint.
- bottomViewerSplit({ width, height, board: Pick of BottomBoard length and widePointWidth, rise, factor }) returns
  { top, side, section, frame, kDots } or null. Let rails = TOP_VIEW_ROOM_ABOVE + TOP_VIEW_ROOM_BELOW, pad =
  SIDE_VIEW_ROOM_ABOVE + SIDE_VIEW_ROOM_BELOW, cap = SIDE_VIEW_MOST x height, kw = TOP_VIEW_LENGTH_UNITS / DRAWING_WIDTH
  x width / length (the width-bound dots per mm), side(k) = min(rise x k x factor + pad, cap). First try width-bound:
  need = widePointWidth x kw + rails; if need is at most TOP_VIEW_SHARE x (height - side(kw)), top = ceil(need). Else
  height-bound: k = (TOP_VIEW_SHARE x (height - pad) - rails) / (widePointWidth + TOP_VIEW_SHARE x rise x factor); if
  rise x k x factor + pad exceeds cap, the side is the cap and top = TOP_VIEW_SHARE x (height - cap); otherwise top =
  TOP_VIEW_SHARE x (height - (rise x k x factor + pad)). Round top down to a whole dot, then frame = topViewFrame(board,
  width, top) and kDots = frame.k / frame.px (the scale the board from below will really draw at), side = min(ceil(rise
  x kDots x factor + pad), floor(cap)), section = height - top - side. Return null when width is 40 or less, height is
  60 or less, or k or the section comes out at zero or below.
- sideViewFrame(lines, scale: { kDots, length }, box: { width, height }, factor): px = DRAWING_WIDTH / box.width, height
  in units = round(DRAWING_WIDTH x box.height / box.width) (topViewFrame's own rule), k = scale.kDots x px (units per
  mm, so x is topViewX of { k, length }), room = height less both rooms; ky = k x factor, fitted to room / rise when the
  block would overflow the room by more than 2% (the sketch's rule); heightAsked = factor, heightDrawn = ky / k; the
  block centred in the room; returns { width, height, px, k, length, heightAsked, heightDrawn } plus x(station) and
  y(heightMm) mappers.
- sideViewPaths(lines, frame): { board, rail } — board is one closed path along the deck tail to nose and back along
  the stringer bottom nose to tail; rail is the runs' railBottom as M/L subpaths, or null when sideProfileRailRuns is
  empty. One decimal, as polylinesPathData writes.
- sideViewStationSpan(lines, frame, station): { x, yDeck, yBottom } — the deck and the lower of the two bottom lines at
  that station, linearly read between the two neighbouring points.

3. New lib/geometry/bottom-side-view.test.ts with the behaviour cases above, building boards the way
side-profile.test.ts does (its shortboard fixture, pickCut for Deep Single Concave and Rolled Vee); every expected number
comes from the app's own functions (topViewFrame, topViewX, sideProfileLines), never typed. RED first, then GREEN.

4. New components/bottom/side-profile-key.tsx: export railLineProps(px) returning the preview's rail line in drawing
units — stroke var(--surf-ink-muted), strokeWidth 1.5 x px, strokeDasharray of 3 x px and 2 x px — documented as the
preview's RAIL_LINE moved here (the dialog switches to it in Task 2).

5. components/bottom/bottom-copy.ts: add sideViewAt(height) returning `SIDE VIEW · ${height}`, sideHeight "Side view
height", sideHeightButtonName(f) returning `Side view height ×${f}`, sideViewName(boardName, twoLines, heightLabel)
returning `The side of ${boardName}, the deck and the bottom` plus ` at the stringer and at the rail` when twoLines, then
`, ` and the height label in lower case (true height / height ×4).

6. components/bottom/bottom-section.tsx: HeightPicker takes an optional which: "section" | "side" (default "section"):
data-bottom-height={which}; the group's aria-label and the buttons' names are BOTTOM_COPY.sideHeight /
sideHeightButtonName for "side", unchanged for "section"; the visible word stays Height. Update its comment: the side
view's boxes reach 6 dots up into the gap under the section. BottomSection's own box div gets data-bottom-box="section";
nothing else in it changes.

7. components/bottom/bottom-top-view.tsx: optional boxHeight prop. Without it, exactly today's classes. With it, the
outer div is flex-col min-h-0 with style flex "0 1 auto" (not flex-[1.25]) and the press div keeps relative min-h-0 but
takes style flex `0 1 ${boxHeight}px` instead of flex-1. The press div gets data-bottom-box="top". Nothing drawn
changes.

8. New components/bottom/viewer-split.ts: useViewerSplit(wrapperRef, { board, rise, factor }) — a layout effect that
measures once and then on a ResizeObserver watching the wrapper and every [data-bottom-box] inside it: height = the sum
of the three boxes' getBoundingClientRect heights, width = the section box's width; held in state only when either moves
by 1 dot or more (so the split never chases sub-pixel rounding); returns useMemo of bottomViewerSplit over those and the
inputs. The sum is the right height because the section's box takes up whatever the other two leave (flex 1) and the
other two may shrink (flex 0 1 basis), so the three always fill the room together; say so in the hook's comment.

9. New components/bottom/bottom-side-view.tsx, BottomSideView({ lines, split, height, onHeight, boardName }):
- Outer div flex-col min-h-0, style flex "0 1 auto". Caption row exactly like the section's (flex, justify-between,
  pb-1; the caption span text-[10px] font-bold tracking-architectural text-surf-ink-muted, truncate) with
  data-bottom-side-caption reading BOTTOM_COPY.sideViewAt(sectionHeightLabel({ heightAsked: height, heightDrawn:
  frame?.heightDrawn ?? height })), and HeightPicker which="side". The caption row shows on every layout (it holds the
  buttons), unlike the board from below's.
- Box div: relative min-h-0 touch-none select-none, data-bottom-box="side", data-lock-exempt, style flex
  `0 1 ${split?.side ?? 0}px`. Inside, the drawing svg absolute inset-0 (data-bottom-side-view, data-height = heightDrawn
  to 2 decimals, role img, aria-label BOTTOM_COPY.sideViewName(boardName, sideProfileParts(lines), the height label),
  viewBox 0 0 1000 frame.height, preserveAspectRatio xMidYMid meet), measured with useSvgClientSize; frame =
  sideViewFrame(lines, { kDots: split.kDots, length: board length }, the measured box, height); nothing drawn until
  measured and split is not null.
- Drawn, in the app's grammar: the board path (data-bottom-side-line="stringer") fill var(--outline-board-fill), stroke
  var(--outline-ink), 1.1 x px; the rail path when not null (data-bottom-side-line="rail"), fill none, railLineProps(px).
- The station line on its own pointer-events-none svg layer over the drawing (the board from below's pattern, so a drag
  repaints only the line): a g with data-bottom-side-cut-at = the station to 1 decimal, its line data-bottom-side-cut-line
  from 8 dots above yDeck to 8 dots below yBottom (sideViewStationSpan at useSectionStation()), stroke var(--outline-ink),
  1.1 x px, the --outline-cut-dash token through zoomDashToken. No grab dot here: the board from below keeps the one dot.
  Use these data attributes only — the existing specs read data-bottom-cut-at, data-bottom-cut-line and
  data-bottom-section as single elements.

10. components/bottom/bottom-editor.tsx: sideHeight state opening at 1 (x1 when the page opens, never saved, view
state like the section's x4); lines = useMemo(sideProfileLines(resolvedBottom, bottomBoard, sideProfile)); a ref on the
VIEWER wrapper (the data-bottom-live div); split = useViewerSplit(ref, { board: bottomBoard, rise:
sideProfileRise(lines), factor: sideHeight }). Order inside the wrapper: phone row, BottomTopView (boxHeight =
split?.top), BottomSection (unchanged props), BottomSideView, SectionAtRow last (it moves the station line through all
three). Time sideProfileLines once on the Longboard with a full bottom; if it costs more than 8 ms, feed it deferred
copies like the floor scan. On a short screen raise the wrapper's 360-dot floor to one constant that leaves, at x1 on a
sideways iPhone (844 x 390) and a sideways Pixel 7 (863 x 360), the board from below's box at least 150 dots and the
section's at least 100 (phone-bottom.spec.ts's own numbers) — measure it, round up to a whole ten. Rewrite the docblock:
three drawings, the side view opening at x1, the split's rule, the short-screen floor.

11. New e2e/bottom-side-view.spec.ts (desktop project for now; Task 3 adds the phones), signed out, strips dismissed,
boards seeded with boardWithBottom + openOnBoard, first cases: (a) on the flat Shortboard the three boxes stand in the
order board from below, section, side view (their y), the side caption reads BOTTOM_COPY.sideViewAt("TRUE HEIGHT"), the
Side view height x1 button is pressed and the section's Height x4 still is; (b) on the Deep Single Shortboard one
[data-bottom-side-line="rail"] path, on the flat one none; (c) the side station line's centre x is within 1 dot of
[data-bottom-cut-line]'s at the opening station and after Section at is moved with Home and End.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/bottom-side-view.test.ts lib/geometry/bottom-draw.test.ts lib/geometry/side-profile.test.ts && npx next typegen && npx tsc --noEmit && npx eslint lib/geometry/bottom-side-view.ts lib/geometry/bottom-draw.ts components/bottom && PW_PORT=3117 npx playwright test e2e/bottom-side-view.spec.ts --project=desktop</automated>
  </verify>
  <done>On a computer, BOTTOM's VIEWER shows the board from below, the cross-section and SIDE VIEW at true height under it, the two station lines standing at the same dot; the new tests and spec pass; committed (plain English, Co-Authored-By line).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Key, facts, tap and drag on the side view; the words, rail line and key shared with the Board file preview, which opens at x1</name>
  <files>components/bottom/side-profile-key.tsx, components/bottom/station-press.ts, components/bottom/bottom-side-view.tsx, components/bottom/bottom-top-view.tsx, components/bottom/bottom-copy.ts, components/bottom/bottom-copy.test.ts, components/design/board-lock-scope.test.ts, components/3d/three-d-copy.ts, components/3d/brd-preview-dialog.tsx, lib/export/brd-preview.ts, lib/export/brd-preview.test.ts, e2e/three-d-export.spec.ts, e2e/bottom-side-view.spec.ts</files>
  <read_first>components/3d/brd-preview-dialog.tsx (KeyEntry, RAIL_LINE, the side view block), components/3d/three-d-copy.ts lines 90-112, components/bottom/bottom-top-view.tsx's pointer handlers (lines 108-143), components/design/board-lock-scope.test.ts lines 20-50 and 189-209, components/bottom/bottom-copy.test.ts's viewer describe (line 377 on), lib/export/brd-preview.test.ts's "opens at ×4" case, e2e/three-d-export.spec.ts cases 11 and 12.</read_first>
  <behavior>
    - BOTTOM_COPY's side words read exactly: sideKeyStringer "at the stringer"; sideKeyRail "at the rail, before the rails are shaped"; sideKeyOneLine "at the stringer and at the rail — the same line on this bottom"; sideFacts("2 1/8\"", "2 1/4\"") gives `2 1/8" at the stringer · 2 1/4" side profile max`; sideHeightButtonName over 1 2 4 8 gives "Side view height ×1" ... "×8"; sideViewName on a two-line board at true height reads "The side of Shortboard, the deck and the bottom at the stringer and at the rail, true height".
    - THREE_D_COPY's preview words are unchanged strings, now built from BOTTOM_COPY's (previewKeyRail still ends "(from your bottom, not in the file)"; previewFacts still the same sentence).
    - BRD_PREVIEW_SIDE_HEIGHT is 1.
    - The lock inventory: bottom-side-view.tsx is listed; its HeightPicker use and its press box are data-lock-exempt, and the press box carries onPointerDown.
  </behavior>
  <action>
1. components/bottom/side-profile-key.tsx: add SideProfileKey({ twoLines, railWord }) — the preview's KeyEntry pattern
moved here: a 24 x 6 swatch then the word, each entry a div data-side-profile-key = "stringer" | "rail" | "one"; the
stringer swatch stroke var(--outline-ink) 1.1, the rail swatch railLineProps(1); two entries when twoLines (the rail one
reading railWord), otherwise the one entry reading BOTTOM_COPY.sideKeyOneLine. It renders the entries only; each caller
wraps them in its own row.

2. components/bottom/bottom-copy.ts: add sideKeyStringer, sideKeyRail, sideKeyOneLine and sideFacts(stringer, max) with
the strings in the behaviour list. components/3d/three-d-copy.ts: previewSideViewAt = BOTTOM_COPY.sideViewAt,
previewKeyStringer = BOTTOM_COPY.sideKeyStringer, previewKeyRail = BOTTOM_COPY.sideKeyRail followed by " (from your
bottom, not in the file)", previewKeyOneLine = BOTTOM_COPY.sideKeyOneLine, and previewFacts ends with
BOTTOM_COPY.sideFacts(stringer, max) after its own count, gap and dims — one copy of every shared word (brief: "share
them"). Add the new words to bottom-copy.test.ts's viewer describe.

3. components/3d/brd-preview-dialog.tsx: delete RAIL_LINE and KeyEntry; the side polyline uses railLineProps(1); the key
row (data-brd-preview-side-key, its classes unchanged) holds SideProfileKey with twoLines = file.profile.railBottom not
null and railWord THREE_D_COPY.previewKeyRail; HeightPicker which="side". lib/export/brd-preview.ts:
BRD_PREVIEW_SIDE_HEIGHT = 1 and its comment (opens at x1, the founder's ruling of 2026-11-12, matching BOTTOM's side
view); the dialog's comment on the height state says x1. lib/export/brd-preview.test.ts: "opens at ×1". In
e2e/three-d-export.spec.ts: the key helper reads [data-side-profile-key=...]; case 12 opens at x1 (attribute "1",
captionOf(1), the x1 button pressed), then presses x4 and x8 through BOTTOM_COPY.sideHeightButtonName, keeping its
lined-up and only-the-height-stretches checks; retitle it "opening at ×1".

4. New components/bottom/station-press.ts: useStationPress(toStation) — the board from below's press, drag and tap moved
here unchanged (left button only, preventDefault, pointer capture, a move under TAP_MAX_TRAVEL_PX leaves the station where
it landed, release on up and cancel), calling useSetSectionStation with { at }. It returns the four handlers; each press
div assigns onPointerDown, onPointerMove, onPointerUp and onPointerCancel explicitly (the lock test reads onPointerDown= on
the tag). BottomTopView switches to it with its own pointerStation; behaviour identical.

5. components/bottom/bottom-side-view.tsx: the box div takes the four handlers, its toStation the pointer's x through the
drawing group's getScreenCTM and stationAtPointer(x, frame) — so a tap or drag on the side view moves the section exactly
as the board from below does. Over the drawing, the wide point and the front fins as faint station lines from yDeck to
yBottom (sideViewStationSpan): the wide point var(--outline-widepoint-line) with --outline-widepoint-dash, the front fins
var(--outline-station-line) with --outline-station-dash, 1 x px, as the board from below draws them. On the station-line
layer, a 44-dot invisible grab zone round the line, the box's full height, pointer-events-auto cursor-ew-resize (the board
from below's rect). Under the box: a key row (data-bottom-side-key, mt-1 flex flex-wrap items-center gap-x-4 gap-y-1
text-xs text-surf-ink-muted) holding SideProfileKey with twoLines = sideProfileParts(lines) and railWord
BOTTOM_COPY.sideKeyRail, then data-bottom-side-facts (text-xs text-surf-ink) reading BOTTOM_COPY.sideFacts of
formatDim(lines.stringerThickness, system) and formatDim(lines.maxThickness, system) — the preview's own formatter, so
Metric reads centimetres to one decimal.

6. components/design/board-lock-scope.test.ts: list components/bottom/bottom-side-view.tsx with a one-line comment (the
side view's Height and its press only change what is seen); in the BOTTOM view-controls case, read the side view's
source the way the top view's is read: the press div's opening tag has onPointerDown= and data-lock-exempt. If the
inventory reads components/bottom/station-press.ts as a file with tags, it has none.

7. e2e/bottom-side-view.spec.ts, desktop: (d) a click on the side view at a third of its width moves [data-bottom-cut-at]
and both station lines to the click's x (within 1.5 dots) and the caption and Section at name one station; a drag along
it moves them with the pointer; (e) the key shows stringer and rail entries on the Deep Single and the one entry on the
flat Shortboard; the facts line equals BOTTOM_COPY.sideFacts of formatDim over sideProfileLines(resolved, board, profile)
worked out in the spec from the seeded board (add profile to boardWithBottom's result in e2e/helpers/bottom-print.ts —
designSideProfile(fields, LIVE_DESIGN_RULES), which it already builds), in Imperial and, after setMetricUnits, in Metric.
  </action>
  <verify>
    <automated>npx vitest run components/bottom/bottom-copy.test.ts components/design/board-lock-scope.test.ts lib/export/brd-preview.test.ts lib/geometry/bottom-side-view.test.ts && npx next typegen && npx tsc --noEmit && npx eslint components/bottom components/3d lib/export/brd-preview.ts e2e/bottom-side-view.spec.ts e2e/three-d-export.spec.ts && PW_PORT=3117 npx playwright test e2e/bottom-side-view.spec.ts e2e/three-d-export.spec.ts --project=desktop</automated>
  </verify>
  <done>On a computer the side view carries its key and facts, moves the section by tap and drag, and draws the wide point and fins; the Board file preview opens its side view at x1 with the same words, rail line and key; tests green; committed.</done>
</task>

<task type="auto">
  <name>Task 3: Every BOTTOM, phone and 3D browser spec on three projects, the measured split, nine pictures looked at, and CLAUDE.md</name>
  <files>e2e/bottom-side-view.spec.ts, e2e/phone-bottom.spec.ts, e2e/touch-sizing.spec.ts, e2e/bottom-viewer.spec.ts, CLAUDE.md, .planning/quick/261112-ogx-bottom-draws-the-side-profile-under-the-/pictures/</files>
  <read_first>e2e/phone-bottom.spec.ts lines 85-190 and 370-470 (pinned, sidewaysRead, DRAWINGS_FLOOR), e2e/touch-sizing.spec.ts lines 440-570 (the BOTTOM touch case), e2e/bottom-viewer.spec.ts lines 186-222 (the Height test and its note on the 234-dot section), the 261112-lmr pictures folder's shoot-source.tar.gz for how pictures, the Rolled Vee and Slate were shot, CLAUDE.md's Layout paragraph.</read_first>
  <action>
1. e2e/bottom-side-view.spec.ts on all three projects: (f) the side view opens at x1 and pressing Side view height x4
stretches it — data-height reads 4 (or, where the box is too short, the caption names the factor drawn and data-height
matches it), the side box at least twice as tall as at x1, the board from below and the section both shorter, the
section's own Height x4 still pressed; (g) on the phones a touchscreen tap on the side view moves the section; (h) upright
phone: the card is still pinned (reuse phone-bottom's pinned/expectPinned or read the same way) and the three drawings,
key, facts and Section at all lie inside the card, the controls' top unmoved from where VIEWER put it before the side view
existed (66% of the screen); (i) each project attaches testInfo annotations with the measured heights of the board from
below, the cross-section and the side view at x1 and at x4 (desktop at 1280 x 800, the iPhone at 390 x 844).

2. e2e/phone-bottom.spec.ts sideways case: DRAWINGS_FLOOR becomes Task 1's short-screen floor and its comment says three
drawings; keep topView at least 150 and section at least 100; add the side view at least 30 tall, and after the column
scrolls to its end the side view, its key and facts and Section at's thumb in view.

3. e2e/touch-sizing.spec.ts BOTTOM case: run its Height checks once for [data-bottom-height="section"] and once for
[data-bottom-height="side"] (four buttons each, 44-dot boxes side by side, corners and centre press the button, a finger
low in the second box presses it — the second is not the opening pick in either group).

4. e2e/bottom-viewer.spec.ts: if the Height test no longer finds the opening 1/4" Deep Single drawn at the full x8 at
1280 x 800 because the section's box is now shorter, change only that test's window size to one where both of its claims
hold (full x8 at 1/4", fitted at 1/2"), measured, and rewrite its 234-dot note with the new box. Fix any other existing
assertion the third drawing moves the same way: change what the drawing changed, nothing else.

5. Runs, PW_PORT=3117, each spec file in its own call on all three projects (--project=desktop, iphone, android), reading
each run's own exit line before the next: e2e/bottom-side-view, bottom-viewer, bottom-screen, bottom-panel, bottom-guide,
bottom-metric, bottom-saving, bottom-wings, phone-bottom, three-d-export, touch-sizing -g BOTTOM, board-lock-screens -g
bottom; then e2e/desktop-baseline.spec.ts on desktop. There is no BOTTOM picture in e2e/desktop-baseline.spec.ts-snapshots
(the brief expected one): the run must pass with every picture unchanged, nothing re-recorded, and the SUMMARY says no
BOTTOM baseline exists and none was added. A failure that passes alone on a re-run is a load flake: say so; any other
failure is fixed. Check the runs for a ResizeObserver loop message in the page's errors; there must be none.

6. Pictures into this task's pictures/ with headless Playwright against the dev server on 3117, written by a scratch
script in the scratchpad that is then archived as pictures/shoot-source.tar.gz (never a loose script under .planning):
bottom-desktop-deep-single (1280 x 800, Daylight), bottom-desktop-deep-single-slate, bottom-desktop-rolled-vee,
bottom-desktop-flat, bottom-desktop-x4, bottom-desktop-metric, bottom-phone-upright (390 x 844 iPhone),
bottom-phone-sideways (844 x 390, scrolled to the side view), preview-x1 (the 3D page's Board file preview at x1). Read
every PNG. Look for: the station lines on one dot; the dashed rail line legible against the ink edge in both themes; the
key and facts whole; the side caption and its four buttons on one row on the phone; the section's ruler values and gauges
whole inside its box at 1280 x 800; nothing clipped or overlapping; the controls beneath the pinned drawing where they
were. Fix what is wrong (in the component, then re-run the affected spec) before finishing.

7. CLAUDE.md, the Layout paragraph's BOTTOM sentence: add one clause saying its VIEWER draws the board from below, the
cross-section and the side view (the deck and the bottom at the stringer and at the rail, opening at true height; quick
261112-ogx).

8. SUMMARY: the measured split (board from below, cross-section, side view, in dots, at x1 and x4) on 1280 x 800 and on a
390 x 844 iPhone, with the controls' height on the iPhone; the short-screen floor chosen; every run's result; the
pictures; and the choices listed in the plan's verification section.
  </action>
  <verify>
    <automated>for p in desktop iphone android; do PW_PORT=3117 npx playwright test e2e/bottom-side-view.spec.ts e2e/phone-bottom.spec.ts e2e/three-d-export.spec.ts --project=$p || exit 1; done; PW_PORT=3117 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop</automated>
  </verify>
  <done>Every listed spec passes on all three projects (load flakes named and passed alone), the desktop baseline passes unchanged, nine pictures are in pictures/ and were each looked at, CLAUDE.md has its clause, the SUMMARY quotes the measured split; committed in plain English.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| none new | The side view reads the open board already in the browser's design store and draws it; nothing is sent, stored or fetched. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-ogx-01 | Tampering | locked board, BOTTOM side view | low | mitigate | The side view's Height buttons and press box only change what is seen and carry data-lock-exempt; board-lock-scope.test.ts lists the file and checks the press tag (Task 2). |
| T-ogx-02 | Denial of service | sideProfileLines on every bottom change | low | mitigate | Timed once on the Longboard with a full bottom; deferred like the floor scan if over 8 ms (Task 1). |
| T-ogx-03 | Information disclosure | pictures and specs | low | accept | Signed out against seeded stock boards; no account or saved board appears. |
</threat_model>

<verification>
- Vitest on the touched suites only (never the whole suite in one task); `npx next typegen` then `npx tsc --noEmit`; eslint on touched files.
- Browser runs as Task 3 lists them, on desktop, iphone and android with PW_PORT=3117; desktop-baseline on desktop, unchanged.
- Choices the brief left open, to restate in the SUMMARY:
  1. At x1 the side caption reads `SIDE VIEW · TRUE HEIGHT`, the Board file preview's own caption at x1 (the brief wrote `SIDE VIEW` but also "exactly as the preview captions it"; one formatter, sectionHeightLabel, for both).
  2. The split: the side view takes what its drawing needs (at most 40% of the three boxes' height, fitted beyond that with the factor drawn in the caption); the board from below and the cross-section share the rest 1.25 to 1 as today, the board from below never taller than its board needs at full width. Worked out in one pure function from the measured room, so the shared length scale never chases its own tail.
  3. The rail line is drawn only where it parts from the stringer's line (sketch 023's rule), while the key's one-or-two decision is the preview's 0.25 mm rule; the preview keeps drawing its rail line whole.
  4. The side view's Height buttons are spoken "Side view height ×N" (the section's stay "Height ×N"), and the Board file preview's buttons take the side view's names too.
  5. The grab dot stays on the board from below only; the side view has the dash-dot line and an invisible grab zone.
  6. Section at stays the last row, under all three drawings.
  7. No BOTTOM desktop baseline picture exists; none was added.
</verification>

<success_criteria>
- A shaper opening BOTTOM sees the board from below, the cross-section, and the side view at true height, the station line through both length-scaled drawings at one dot, and can tap or drag the side view to move the section.
- Deep Single shows two bottom lines and the two-entry key; a flat board one line and the one-entry key; the facts line quotes both thicknesses in the chosen system.
- Height x4 stretches only the side view; the section's x4 opening is unchanged; the preview opens at x1.
- Upright phone: the drawing stays pinned at 66% and the controls keep their room; sideways: the column scrolls to the side view; touch boxes 44 dots.
- Every listed spec green on three projects, pictures looked at, CLAUDE.md clause in, SUMMARY with the measured split.
</success_criteria>

<output>
Create `.planning/quick/261112-ogx-bottom-draws-the-side-profile-under-the-/261112-ogx-SUMMARY.md` when done.
</output>
