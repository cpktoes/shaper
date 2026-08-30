---
phase: 260829-tmj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/rocker/rocker-view-frame.ts
  - components/rocker/rocker-view-frame.test.ts
  - components/rocker/rocker-viewer.tsx
  - components/rocker/rocker-editor.tsx
autonomous: true
requirements: [QUICK-260829-tmj]

estimate:
  tokens: 33000
  raw_tokens: 90000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "On the ROCKER screen the board is drawn as large as the panel allows: nose-to-tail spans the full width of the drawing area for EVERY board length, not just a 10-foot one."
    - "A short board (5'0\") and a long board (10'0\") both fill the drawing the same way — a short board no longer draws small with blank space beside it."
    - "Pressing the rotate button gives the same treatment nose-up: the board runs the full height of the panel, for every board length."
    - "Nose-up, the five station cards sit clear of the board on their own rail, centred on the station they belong to, and none of them is cut off at the tail end of the drawing."
    - "Nose-up, the board-length label (e.g. 6'6\") is fully visible instead of running off the edge."
    - "The rocker line keeps the board's true proportions in both views — the height axis is drawn at the same scale as the length axis, never stretched to fill the panel."
    - "Grab targets, station-card text and the marker dots stay the same size on screen as before; only the board gets bigger."
    - "Dragging the four curve control points still reshapes the curve correctly, in both views, at every board length."
    - "The SUMMARY order form's rocker box is completely unchanged — same board size, same position, same box shape as it prints today."
  artifacts:
    - "components/rocker/rocker-view-frame.ts — the one place the rocker drawing's scale and frame are decided, for both orientations"
    - "components/rocker/rocker-view-frame.test.ts — fit, containment, non-overlap and legacy-frame-pin suites, all green under `npm test`"
    - "components/rocker/rocker-viewer.tsx — draws from the layout object; owns no scale or frame arithmetic of its own"
    - "components/rocker/rocker-editor.tsx — the one call site that opts into the fit-to-board frame"
  key_links:
    - "`rockerViewLayout()` is the single source of scale, baseline, rail position, card size and viewBox — `pxX`, `pxY` and `toBoardPoint` in the viewer all read the SAME `layout.scale`, so a drag can never solve against a different scale than the drawing was made with"
    - "`fitToBoard` defaults to false and is passed ONLY by `rocker-editor.tsx`; `order-form.tsx` never passes it, so the order form's frame is the fixed range-derived one it uses today, by construction rather than by a guard"
    - "`STATION_CARD_WIDTH` stays derived from the NARROWEST column pitch any board can produce (12in at the longest board's scale = 82 units, minus an 8-unit gutter = 74) — under fit-to-board the pitch only ever grows, so the existing expression is what keeps neighbouring cards apart at every length"
    - "The vertical frame is built from its own rotated content (card rects, label anchor, board box), NEVER transposed from the horizontal one — the exact defect quick task 260825-w8d fixed on the outline viewer"
    - "A counter-rotated (`Upright`) element anchored at `a` lands at `R90·a`, i.e. canonical `(x, y)` draws at `(-y, x)`, and the whole group is displaced by `R90·a - a` — this one identity is what places the station cards and the length label in the vertical frame"
---

<objective>
Make the ROCKER screen draw the board as big as the panel allows — the way the TEMPLATE screen
already does — in both the nose-left and the nose-up view.

Purpose: the rocker drawing is currently scaled for a ten-foot board no matter what board is
loaded, so a 6'6" shortboard uses 59% of the drawing width and the remaining 41% is blank frame.
Rotating the board does not help, because the nose-up frame is a straight transposition of the
nose-left one rather than a frame fitted to what is actually drawn — which additionally clips the
board-length label, lets the station cards cross the baseline into the board, and cuts the tail
card off the end at long board lengths. The TEMPLATE screen solved all of this: it scales each
board to fill the frame's long axis and sizes each orientation's frame from its own content.

Output: one pure layout module that decides the rocker drawing's scale and frame for both
orientations, a viewer that owns no frame arithmetic of its own, and a Summary order form that is
provably untouched.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@components/rocker/rocker-viewer.tsx
@components/rocker/rocker-editor.tsx
@components/outline/outline-viewer.tsx
@components/viewer/callout-primitives.tsx
</context>

<planner_findings>
Read before starting. Every number below was derived from the code while planning and is
load-bearing — you do not need to rediscover any of it, but you DO need to confirm the ones marked
**CONFIRM** with a real calculation in the test suite.

**1. Why the board draws small today (the whole bug, in one line).**
`components/rocker/rocker-viewer.tsx` line 98:
`PX_PER_INCH = (VIEW_W - PAD_X * 2) / BOARD_LENGTH_RANGE_IN.max`, with `VIEW_W = 900`,
`PAD_X = 40`, `BOARD_LENGTH_RANGE_IN.max = 120` → **6.8333 user units per inch, the same for every
board**. The drawing area is 820 units wide, so the board's own span is `lengthIn * 6.8333`:

| Board | Drawn span | Share of the 900-unit frame |
|-------|-----------|------------------------------|
| 5'0" (60in) | 410 | 45.6% |
| 6'0" (72in) | 492 | 54.7% |
| 6'6" (78in) | 533 | 59.2% |
| 8'0" (96in) | 656 | 72.9% |
| 10'0" (120in) | 820 | 91.1% |

The svg is `preserveAspectRatio="xMidYMid meet"`, so the on-screen board length is
`panelWidth × span / 900`. Every point of blank frame is a point of board the shaper does not get.

**2. What the TEMPLATE does instead — the pattern to mirror.**
`outlineViewMetrics` in `components/outline/outline-viewer.tsx` computes
`lengthFitScale = (VIEW_H - PAD_Y * 2) / lengthIn` — a **per-board** scale, so every board fills
the frame's long axis. The range-derived fixed frame exists there too, but it is the `fixedFrame`
prop, and the ONLY consumer is the order form's template window (quick task 260823-h6l). The rocker
viewer has the order form's treatment hard-wired for the editor as well. That is the asymmetry to
remove.

**3. What is NOT worth changing, and why (do not "fix" this).**
The frame's cross axis reserves the worst case `ROCKER_LIFT_RANGE_IN.max (9) +
FOIL_THICKNESS_RANGE_IN.max (5) = 14in` of board height for every board. It looks wasteful, and it
is not: the drawing is long-axis-bound in every realistic panel (frame aspect 900:200 = 4.5 against
a panel aspect near 1.5), so under `meet` the cross axis does not affect the drawn board size at
all — trimming it would make the empty band above and below the board LARGER, not smaller, because
the scaled frame would shrink while the panel stayed the same. Keep the worst-case reserve: it is
also what keeps the deck curve from ever being clipped, and what keeps the order form's box aspect
stable. **A surfboard's side profile is genuinely a long thin shape; the empty band above and below
it in a wide panel is the board's true proportion and must not be "filled" by stretching the height
axis** (see the shared-scale comment at line 89 — a shaper checks a rocker line with a straightedge).

**4. The `Upright` identity — the single most important fact for the vertical view.**
The content group carries `rotate(90)`, so ordinary content at canonical `(x, y)` draws at
`(-y, x)`. `Upright` wraps its children in `rotate(-90 x y)` about an anchor `a`, and
`R90 ∘ rotate(-90, a)` composes to a **pure translation by `R90·a - a`**. Consequences:
- the anchor point `a = (x_a, y_a)` itself lands at `R90·a = (-y_a, x_a)`;
- a rect drawn at canonical `(x_s - W/2, railY)` with size `W × H` lands, in the rotated frame, at
  `x ∈ [-railY - W/2, -railY + W/2]`, `y ∈ [x_s, x_s + H]` — so the card's **width** now lies across
  the rail, and the card hangs from its station toward the tail;
- a `translate(0, dy)` placed INSIDE the `Upright` group composes with that translation, so it
  shifts the card along the rotated long (station) axis — which is how the card gets centred on its
  station in the vertical view.

**5. Three real defects in the vertical view today (CONFIRM each numerically in the test).**
With `viewH = PAD_TOP(26) + 14 × 6.8333 + BOTTOM_PAD(78) = 199.67`, `baselineY = 121.67`,
`railY = baselineY + RAIL_GAP(20) = 141.67`, `STATION_CARD_WIDTH = 74`, `STATION_CARD_HEIGHT = 50`,
and the vertical viewBox `-viewH 0 viewH VIEW_W`:
- **Cards cross the baseline into the board.** A card spans rotated `x ∈ [-railY - 37, -railY + 37]`
  = `[-viewH + 21, -viewH + 95]`, while the baseline sits at `-baselineY = -viewH + 78`. The card's
  inner edge is **17 units past the baseline, on the board's side**. In the rotated view the card's
  half-WIDTH (37), not the gap (20), is what has to clear the baseline.
- **The tail card is cut off.** Its rotated `y` reaches `pxX(0) + 50 = PAD_X + span + 50`. At 120in
  that is 910 against a frame long axis of 900. Once Task 1 makes every board span 820, **every**
  board hits 910 — so this must be fixed in the same change, not later.
- **The board-length label runs off the frame.** Anchored at canonical `(PAD_X, PAD_TOP - 8) =
  (40, 18)`, it lands at `R90·a = (-18, 40)` and, being start-anchored, runs toward positive x —
  but the frame's max x is 0. Only ~18 units of it are inside.

**6. Why the station card width can stay exactly 74 units.** Under fit-to-board the scale is
`820 / lengthIn`, which is **smallest at the longest board** — so the narrowest 12in column pitch
any board can produce is still `12 × 820/120 = 82` units, the same worst case the existing
expression `12 * PX_PER_INCH - 8` already encodes. Keep the value at 74 and keep the expression;
only its justification generalises ("the narrowest pitch across the whole length range"). This also
keeps `RAIL_LABEL_HEIGHT` at 58, `viewH` numerically unchanged for the order form, and `PAD_X = 40`
correct (the end cards overhang the tips by exactly `74/2 = 37 < 40`).

**7. The order form is the one consumer that must not move.**
`components/summary/order-form.tsx` line 341 renders
`<RockerViewer rocker foil length hideCallouts />` — no orientation, no `onDrag`, no frame props.
Make the new behaviour opt-in (`fitToBoard`, default `false`) and that call site keeps today's
frame **by construction**, the same posture 260825-vot used for orientation ("the prop defaults to
vertical and those consumers never pass it"). Note honestly in the summary: the viewBox *string*
formatting changes (`0 0 900 199.67` → `0.00 0.00 900.00 199.67`); the four numbers do not, so the
render is identical while the attribute text is not — do not claim byte-identity of the attribute.

**8. What the expected gain is (CONFIRM the ratios in the test).**
Horizontal, every board: span/frame goes from the table in item 1 to a constant `820/900 = 91.1%`
— **×2.00 at 5'0", ×1.54 at 6'6", ×1.25 at 8'0", ×1.00 at 10'0"**. Vertical: the long axis becomes
content-fitted (about 865 units instead of 900) so the board takes about **94.8%** of the panel
height at every length, against the same table today.

**9. Nothing else in the viewer depends on the scale constant.** Verified by grep: `PX_PER_INCH`,
`STATION_CARD_*` and `RAIL_LABEL_HEIGHT` appear only inside `rocker-viewer.tsx`. Inside it, the
scale is used by `pxX`, `pxY`, `viewH` and — critically — by `toBoardPoint`, which inverts the
projection for dragging. **If `toBoardPoint` keeps a stale scale, every drag on the rocker screen
silently solves against the wrong board coordinates.** It must read the same `layout.scale`.

**10. Tests run from `components/`.** `vitest.config.ts` includes
`["lib/**/*.test.ts", "components/**/*.test.ts"]`, node environment, and
`components/template/build-*-pdf.test.ts` are the existing precedent. A pure `.ts` module beside
the component with a co-located test is idiomatic here — no React, no JSX, `import type` only for
the orientation type so nothing React-shaped is pulled into the node run.
</planner_findings>

<planner_assumptions>
State these in the summary if any turns out to be wrong.

1. **The panel is not the problem.** `rocker-editor.tsx` gives the viewer
   `relative flex min-h-0 flex-1 items-center justify-center` and the svg is `absolute inset-0
   h-full w-full`, so the svg already fills the panel — exactly like the TEMPLATE. No container or
   layout change is needed or wanted.
2. **True proportions are non-negotiable.** One scale serves both axes. Nothing in this plan may
   introduce a separate vertical scale factor.
3. **The worst-case height reserve stays** (finding 3). If while working you find the drawing is
   height-bound rather than width-bound in a realistic panel, stop and say so — the reasoning in
   finding 3 would then be wrong and the cross axis would matter.
4. **Centring the cards on their station in the vertical view is an improvement, not a
   requirement.** It is included because it also halves the overhang the frame has to pay for at
   the tail. If it looks wrong in the browser, `cardDy` is one number to zero out.
5. The `Upright` composition identity in finding 4 is derived, not measured. The containment tests
   in both tasks are what actually pin it; if a test contradicts the identity, trust the test.
</planner_assumptions>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Scale every board to fill the drawing (nose-left view, end to end)</name>
  <files>components/rocker/rocker-view-frame.ts, components/rocker/rocker-view-frame.test.ts, components/rocker/rocker-viewer.tsx, components/rocker/rocker-editor.tsx</files>
  <read_first>components/rocker/rocker-viewer.tsx (lines 73-125 for the constants, 194-220 for the frame derivation, 307-332 for the viewBox and fit scale, 351-367 for the drag inversion), components/outline/outline-viewer.tsx (lines 227-243, `outlineViewMetrics` — the per-board fit this mirrors)</read_first>
  <behavior>
    Tests to write first, in `components/rocker/rocker-view-frame.test.ts`:
    - Legacy pin (the order form's path): `rockerViewLayout` with `fitToBoard: false`,
      `orientation: "horizontal"`, `maxDeckIn: 14` returns `scale` 820/120, and frame numbers
      `{ minX: 0, minY: 0, width: 900, height: 199.666…}` — for board lengths 60, 78 and 120in
      alike, i.e. the legacy frame is length-independent.
    - Fit: with `fitToBoard: true`, `lengthIn * scale === 820` (VIEW_W - 2·PAD_X) for every length
      from 60 to 120 in 6in steps.
    - Maximisation: the board's own span is at least 88% of the frame's long axis, in BOTH
      orientations, at every one of those lengths (expected 91.1% horizontal).
    - Proportion: one scale serves both axes — the layout exposes exactly one `scale` field and the
      frame's cross extent equals `PAD_TOP + maxDeckIn * scale + RAIL_GAP + RAIL_LABEL_HEIGHT`.
    - Card pitch: at the tightest case (120in board, fit-to-board), the 12in pitch is 82 units and
      `cardWidth` 74, so neighbouring cards keep an 8-unit gutter; and the gutter only grows as the
      board gets shorter.
    - End cards fit: with `stationCardRect` in the horizontal frame, the nose-tip card
      (station = lengthIn) and the tail-tip card (station = 0) are both fully inside the frame, at
      60in and at 120in.
    - Degenerate input: `lengthIn` of 0, a negative, and `NaN` all still produce finite frame
      numbers (the scale falls back to the range-clamped one) — a corrupt saved board must not
      blank the screen.
  </behavior>
  <action>
Create `components/rocker/rocker-view-frame.ts` as the one place the rocker drawing's scale and
frame are decided, and move the frame constants there from `rocker-viewer.tsx`: `VIEW_W` (900),
`PAD_X` (40), `PAD_TOP` (26), `RAIL_GAP` (20), `STATION_CARD_HEIGHT` (50), `STATION_CARD_WIDTH`
(the existing `12 * fixed scale - 8` expression, 74) and `RAIL_LABEL_HEIGHT` (`STATION_CARD_HEIGHT
+ 8`, 58). Export them; the viewer imports what it still needs. Carry the existing explanatory
comments across rather than rewriting them, and update the `STATION_CARD_WIDTH` comment to the
generalised justification in finding 6 (the narrowest pitch across the whole length range, which
occurs at the longest board — so under a per-board fit the gutter only ever grows).

Export `rockerViewLayout({ lengthIn, maxDeckIn, orientation, fitToBoard })` returning a
`RockerViewLayout` with: `scale`, `viewH`, `baselineY`, `tickEndY`, `railY`, `cardDy`, `cardWidth`,
`cardHeight`, the frame rect `minX`/`minY`/`width`/`height`, and `viewBox` (the four rect numbers,
each at two decimals). In THIS task implement the horizontal orientation only and keep the vertical
branch returning today's transposed frame verbatim (`-viewH 0 viewH VIEW_W`, with `railY =
baselineY + RAIL_GAP`, `tickEndY = railY`, `cardDy = 0`) so the rotate button still works exactly
as it does now; Task 2 replaces it.

The scale rule, mirroring `outlineViewMetrics`'s `lengthFitScale`: `fitToBoard` gives
`(VIEW_W - 2 * PAD_X) / lengthIn`, so every board's nose-to-tail spans the full 820-unit drawing
area; otherwise the existing range-derived `(VIEW_W - 2 * PAD_X) / BOARD_LENGTH_RANGE_IN.max`.
Clamp the length used for the fit into `BOARD_LENGTH_RANGE_IN` and fall back to the range-derived
scale when it is not a finite positive number, so a corrupt board length yields a finite frame
instead of a `NaN` viewBox (threat T-TMJ-02). `viewH`, `baselineY` and the horizontal frame keep
their exact current formulas, now reading `scale` — with `fitToBoard: false` every number is the
number the viewer produces today.

Also export `stationCardRect(layout, stationX, orientation)` returning the card's rect in the
frame's own coordinate space: in horizontal that is `{ x: stationX - cardWidth / 2, y: railY }`; in
vertical apply the `Upright` identity from finding 4 (`x = -railY - cardWidth / 2`, `y = stationX +
cardDy`, and the card's width and height swap roles relative to the rail). Document the identity in
the function's own comment, because it is the fact the containment tests depend on.

Rewire `components/rocker/rocker-viewer.tsx` to draw from the layout: call `rockerViewLayout` once
per render, then take `scale`, `viewH`, `baselineY`, `railY`, `cardWidth`, `cardHeight`, `viewBox`
and the frame's `width`/`height` from it. `pxX`, `pxY`, the station-tick end, the card rects and —
this is the one that silently breaks dragging if missed (finding 9) — `toBoardPoint`'s inverse must
all read `layout.scale`. Pass the layout's frame `width`/`height` to `useSvgFitScale` in place of
the hand-swapped `vbW`/`vbH` pair. Leave the drag targets, construction overlay, card contents and
every colour untouched.

Add the `fitToBoard` prop to `RockerViewerProps`, defaulting to `false`, documented as the
editor-only frame gate that keeps `order-form.tsx`'s rocker box on the fixed range-derived frame by
construction (finding 7 — say why: the order form's window must not resize around whichever board
is loaded, per 260823-h6l). Pass `fitToBoard` from `components/rocker/rocker-editor.tsx`'s
`RockerViewer` call and from nowhere else.
  </action>
  <verify>
    <automated>npx vitest run components/rocker/rocker-view-frame.test.ts && npm test && npm run lint</automated>
    <automated>grep -c "fitToBoard" components/rocker/rocker-editor.tsx  # expect 1; and: grep -vE '^\s*(\*|//|/\*)' components/summary/order-form.tsx | grep -c "fitToBoard" || true  # expect 0 matches in code lines</automated>
    <human-check>
      Post-merge, on `/design/rocker` (the executor cannot run the dev server in a worktree):
      1. Load a 6'6" board. The board now runs nearly the full width of the drawing panel; the
         large blank area to the right of the tail is gone.
      2. Change the length to 5'0" and to 10'0". The board fills the width the same way at both —
         only its shape and the spacing of the station cards change.
      3. The five station cards still sit evenly under the board and none overlaps a neighbour at
         any length.
      4. Turn on construction lines and drag each of the four control points. The curve follows the
         pointer exactly where you grab it (this is the check that the drag inverse got the new
         scale), and the sidebar sliders move with it.
      5. Open `/design/summary` and check the order form's rocker box: same board size, same
         position, same box shape as before.
    </human-check>
  </verify>
  <done>Every board length draws at the same 91.1% share of the nose-left frame; dragging still lands where the pointer is; the order-form path's frame numbers are pinned by test; `npm test` and `npm run lint` are green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Fit the nose-up view to its own content</name>
  <files>components/rocker/rocker-view-frame.ts, components/rocker/rocker-view-frame.test.ts, components/rocker/rocker-viewer.tsx</files>
  <read_first>components/rocker/rocker-viewer.tsx (lines 161-182 `Upright`, 437-502 the station cards and the length label, 504-520 the construction station lines), components/outline/outline-viewer.tsx (lines 430-476 — the horizontal frame built from its own content, the pattern this mirrors)</read_first>
  <behavior>
    Tests to add to `components/rocker/rocker-view-frame.test.ts`, for the vertical orientation at
    board lengths 60, 78 and 120in with `fitToBoard: true`:
    - Containment: all five station-card rects from `stationCardRect` are fully inside the frame —
      including the tail-tip card, whose overhang past the tail is what runs off the end today.
    - Clearance: every card's near edge is at least `RAIL_GAP` from the baseline, on the rail side —
      no card reaches into the board's own footprint (today it crosses it by 17 units).
    - The board's own box (nose tip to tail tip, baseline to the worst-case deck height) is inside
      the frame, and so is the length-label anchor, with at least 150 units of run-room from that
      anchor toward the frame's far cross edge for the label's text to occupy.
    - Non-overlap: adjacent cards along the station axis keep a positive gutter at the tightest
      pitch (120in board).
    - Maximisation: the board's span is at least 88% of the frame's long axis (expected ~94.8%).
    - Independence: the vertical frame is NOT the horizontal frame transposed — assert its long and
      cross extents differ from `{ height, width }` of the horizontal frame for the same input.
    - The horizontal frame numbers from Task 1 are unchanged by everything in this task.
  </behavior>
  <action>
Replace the placeholder vertical branch in `rockerViewLayout` with a frame built from the rotated
content, the way `outline-viewer.tsx` builds its own rotated frame (and the reason it has to:
quick task 260825-w8d found that transposing the other orientation's frame delivers the mechanism
without the value).

Rail position: in the rotated view a card presents its WIDTH across the rail, so anchor the card
rail at `baselineY + RAIL_GAP + cardWidth / 2` — that puts the card's near edge exactly `RAIL_GAP`
from the baseline instead of 17 units past it. Keep `tickEndY` at `baselineY + RAIL_GAP` in both
orientations so a station tick still stops at the card's near edge rather than running into the
card's middle; in horizontal the two coincide, which is why nothing moves there. Set `cardDy` to
`-cardHeight / 2` in vertical so each card is centred on the station it names, and 0 in horizontal.

Frame, in the rotated space (canonical `(x, y)` draws at `(-y, x)` — finding 4): the cross axis runs
from the outer card edge, `-(railY + cardWidth / 2) - 8`, to 0, which leaves the same 26-unit
margin above the board's worst-case deck that the horizontal frame leaves above it. The long axis
runs from the length label's own rotated baseline less its type size and a small pad, to the tail
card's far edge (`PAD_X + boardSpan + cardHeight / 2 + 4` with the centring above) — derive both
ends from the same constants the drawing uses, never from a literal.

In `rocker-viewer.tsx`: apply `cardDy` by wrapping each card's contents in a
`translate(0, cardDy)` group INSIDE the `Upright` group — because the outer composition is a pure
translation, that shift lands along the rotated station axis, which is the axis that needs it
(finding 4). Draw the station tick to `layout.tickEndY` rather than to the card rail. Give the
board-length label `textAnchor="end"` in the vertical orientation only, so it runs back into the
frame from its anchor instead of off the edge; leave the horizontal rendering exactly as it is.
Everything else — board path, baseline, outline reference, construction lines, dots, drag targets,
card contents and colours — stays untouched.

Update the file header comment to say what each orientation's frame is now built from, and delete
any prose the change falsifies (the current text describing the vertical viewBox as the horizontal
one with width and height swapped is now wrong, and a later editor could read it as an
instruction).
  </action>
  <verify>
    <automated>npx vitest run components/rocker/rocker-view-frame.test.ts && npm test && npm run lint</automated>
    <human-check>
      Post-merge, on `/design/rocker`, press the rotate button:
      1. The board runs nose-up down nearly the full height of the panel — at 5'0", at 6'6" and at
         10'0" alike.
      2. The five station cards sit in a column clear of the board, each centred on the station its
         tick points at, and the tail-tip card is fully visible at the bottom (it is cut off today
         on a long board).
      3. The board-length label (e.g. 6'6") is fully readable — today most of it is off the edge.
      4. Turn on construction lines and drag each of the four control points nose-up: the curve
         follows the pointer, and the sliders follow the curve.
      5. Rotate back: the nose-left view is exactly as Task 1 left it.
      6. `/design/summary` order form's rocker box: still unchanged.
    </human-check>
  </verify>
  <done>Nose-up, the board fills the panel height at every length, no card or label is clipped or overlapping the board, and the vertical frame is provably content-derived rather than a transposition.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| saved design → viewer | Board length and rocker/foil values come from the design store, which is fed by saved rows from the database; the viewer turns them into SVG geometry |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-TMJ-01 | Tampering | rocker-viewer.tsx / rocker-view-frame.ts | low | mitigate | Frame values stay numbers written into JSX attributes and one numeric `viewBox` string; no design-supplied text ever enters an attribute, and no string-built markup or `dangerouslySetInnerHTML` is introduced — the existing T-QO-01 posture stated in the viewer's own header |
| T-TMJ-02 | Denial of Service | rocker-view-frame.ts | low | mitigate | The fit-to-board scale divides by the board length; a zero, negative or non-finite length would produce a `NaN` viewBox and a blank drawing. Clamp into `BOARD_LENGTH_RANGE_IN` and fall back to the range-derived scale, pinned by the degenerate-input test in Task 1 |
| T-TMJ-03 | Information Disclosure | components/summary/order-form.tsx | low | accept | No new data is rendered; the order form is not modified at all, and its frame is pinned numerically by the Task 1 legacy test |

No packages are installed by this plan, so the package-legitimacy gate does not apply.
</threat_model>

<verification>
1. `npm test` — the full suite green, including the new
   `components/rocker/rocker-view-frame.test.ts`.
2. `npm run lint` — no new errors (9 pre-existing warnings in `lib/geometry/outline.test.ts` and
   the four `scripts/extract-prototype-*-golden.mjs` are expected and untouched).
3. `npx tsc --noEmit` — no errors beyond the two known phantom `LayoutProps` errors in
   `app/layout.tsx` / `app/design/layout.tsx` (a gitignored `next-env.d.ts` absent from a fresh
   worktree). Anything else is real.
4. `npm run build` and `npm run dev` are deliberately NOT run — Turbopack cannot resolve `next`
   inside a git worktree. The orchestrator builds after merge.
5. Carry both `<human-check>` blocks into the summary as post-merge browser verification for the
   founder, the way quick task 260829-t47's summary did.
</verification>

<success_criteria>
- Every board length draws at the same share of the frame in both views — 91.1% of the long axis
  nose-left, about 94.8% nose-up — instead of today's 45.6%–91.1% sliding scale.
- The nose-up frame is built from its own rotated content: no card and no label is clipped, and no
  card reaches into the board's footprint.
- One scale still serves both axes; the rocker line keeps the board's true proportions.
- Drag, construction lines, station cards, colours and on-screen affordance sizes are visually
  unchanged apart from the board being larger.
- `components/summary/order-form.tsx` is not modified, and the frame its rocker box renders in is
  pinned by a unit test to the numbers it uses today.
- All scale and frame arithmetic lives in `components/rocker/rocker-view-frame.ts`; the viewer
  derives none of its own.
</success_criteria>

<output>
Create `.planning/quick/260829-tmj-rocker-viewer-maximize-board-drawing-to-/260829-tmj-SUMMARY.md`
when done, following `$HOME/.claude/gsd-core/templates/summary.md`. Explain the change in plain
English for a shaper: what the ROCKER screen looks like now, in both views, and that the printed
order form is untouched.
</output>
