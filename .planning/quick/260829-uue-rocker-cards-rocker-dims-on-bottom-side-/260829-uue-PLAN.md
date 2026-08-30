---
phase: 260829-uue
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/rocker/rocker-view-frame.ts
  - components/rocker/rocker-view-frame.test.ts
  - components/rocker/rocker-viewer.tsx
  - components/summary/order-form.tsx
autonomous: true
requirements: [QUICK-260829-uue]

estimate:
  tokens: 16000
  raw_tokens: 125000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "On the ROCKER screen each station's ROCKER figure sits below the board, on the same side as the bottom curve it measures; each station's THICKNESS figure sits above the board, on the deck side."
    - "A shaper reads the same rule on the ROCKER screen as on the TEMPLATE screen: a filled card means a value they set, a plain number means a value measured off the drawing."
    - "On the rocker rail only the two tip figures — the ones with their own sliders — sit on cards; Nose @ 12\", Center and Tail @ 12\" read as plain numbers, because they are measured off the drawn curve."
    - "On the thickness rail all five figures sit on cards, because all five are set by their own sliders."
    - "Every read-out, either kind, is attached by a leader to the exact point on the curve it measures, and each measured point carries the same 45-degree drafting tick the TEMPLATE screen uses for its derived values."
    - "No card overlaps the board at any board length or any control setting, on either side, because both rails clear the worst-case board box (highest rocker plus thickest foil) rather than this board's own drawn height."
    - "Neighbouring cards on the same rail never touch, at every length from 5'0\" to 10'0\"."
    - "Turning the board nose-up keeps the split correct: the rocker cards sit on the board's bottom side (screen left) and the thickness cards on its deck side (screen right), every card fully inside the drawing."
    - "Nose-up, the board-length label is fully readable and does not collide with the thickness cards that now occupy the space it used to sit in."
    - "The SUMMARY order form's ROCKER box shows the side profile alone — no tick squares beside it — and the drawing spans the full width of the box at every board length."
    - "The order form's sheet geometry is unchanged: same two pages, same box in the same place at the same size, and it still prints correctly."
    - "Dragging the four curve control points still reshapes the curve correctly in both views, at every board length."
  artifacts:
    - "components/rocker/rocker-view-frame.ts — one pure layout module deciding BOTH card rails, the frame and the length label's anchor, for both orientations"
    - "components/rocker/rocker-view-frame.test.ts — containment, clearance, non-overlap and order-form-path suites, all green under `npm test`"
    - "components/rocker/rocker-viewer.tsx — draws a thickness card on the deck rail and a rocker card on the bottom rail per station; owns no frame arithmetic of its own"
    - "components/summary/order-form.tsx — ROCKER box holding the drawing alone, at full box width"
  key_links:
    - "Card-or-plain follows one rule and nothing else: a figure the shaper can move with a slider gets a card, a figure read off the drawn curve does not — `rocker.noseLift` and `rocker.tailLift` are the only two sliders on the rocker side, and all five foil thicknesses have one"
    - "Both kinds hang off the SAME rail anchor and the same band depth, so the frame's containment proof is unchanged: a plain read-out's two text rows are proven to sit inside the box a card occupies at that anchor, which makes card containment imply read-out containment in both orientations"
    - "`rockerViewLayout()` stays the ONE place scale, baseline, both rail anchors, card size, label anchor and viewBox are decided — `pxX`, `pxY` and the drag inverse `toBoardPoint` all keep reading the SAME `layout.scale`, so a drag can never solve against a different scale than the drawing was made with"
    - "Both rails clear the frame's worst-case deck line (`baselineY - maxDeckIn * scale`) and the baseline respectively, by `RAIL_GAP` — clearance is measured against the reserve, never against the board actually drawn, which is what makes non-overlap true at EVERY control setting rather than at the ones that were eyeballed"
    - "A card band is reserved only when cards are actually drawn (`showStationCards`), so the order form's compact box no longer carries an empty rail band that was eating 39% of its drawing height"
    - "A counter-rotated (`Upright`) element anchored at `a` lands at `R90·a`, i.e. canonical `(x, y)` draws at `(-y, x)` — the identity that places both rails' cards and the length label in the nose-up frame"
    - "The order form's ROCKER box size on the sheet is CSS-driven (`.order-form-rocker`, `flex: 0 0 18%`) and the viewer's `<svg>` is `absolute inset-0`, so changing the drawing's viewBox changes what fills the box, never the box itself or the sheet around it"
---

<objective>
Split the ROCKER screen's station read-outs so each figure sits on the side of the board it
describes — rocker below (the bottom curve), thickness above (the deck) — draw them in the
TEMPLATE screen's own grammar, where a filled card means a value you set and a plain number means
a value measured off the drawing, and give the SUMMARY order form's rocker box the whole box: no
tick squares beside the drawing, and a profile that actually spans the width available to it.

Purpose: today all five station cards sit in one rail below the board, each stacking that
station's R over its T. A shaper reading the drawing has to map a number back to the surface it
came from; putting each figure on its own side makes the drawing say it. On the order form the
side profile currently occupies about 59% of its own drawing area (it is drawn at a scale sized
for a ten-foot board no matter which board is loaded), that drawing area is itself squeezed by two
flanking tick squares, and 39% of its height is a card rail reserved for cards the compact mode
never draws. All three are fixable, and together they roughly double the printed profile.

Output: one layout module that decides both card rails, a viewer that draws them, and an order
form whose rocker box holds the drawing and nothing else.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@components/rocker/rocker-view-frame.ts
@components/rocker/rocker-view-frame.test.ts
@components/rocker/rocker-viewer.tsx
@components/summary/order-form.tsx
@.planning/quick/260829-tmj-rocker-viewer-maximize-board-drawing-to-/260829-tmj-SUMMARY.md
</context>

<planner_findings>
Measured from the code before planning; the task actions below depend on these numbers.

1. `maxDeckIn` = 14 (`ROCKER_LIFT_RANGE_IN.max` 9 + `FOIL_THICKNESS_RANGE_IN.max` 5). The fixed
   scale is `820 / 120` = 6.8333 units per inch.
2. Order form path today (`fitToBoard` absent, `hideCallouts` on): `viewH` = 26 + 14 x 6.8333 + 78
   = 199.67, so the viewBox is 900 x 199.67 (aspect 4.51). The band below the baseline — 78 units,
   39% of the height — holds nothing, because the compact mode draws no rail.
3. The order-form box measured off the CSS: sheet aspect 7.87/10.37 at a max 880px container;
   header 12%, dims 7.4%, glassing 11%, rocker box `flex: 0 0 18%` of the right-hand `flex-[2]`
   column. That lands the box body near 537 x 114 CSS px (aspect ~4.7). Since 4.51 < 4.7 the
   drawing is WIDTH-bound today: it fills the drawing div's width, and the board inside it spans
   `lengthIn x 6.8333 / 900` of that — 59% at 6'6". The two tick columns take a further ~23% of
   the box width before the drawing gets any. That is the whole diagnosis: fixed scale, dead band,
   flanking columns. All three are addressed below.
4. Rotated-content identity (from 260829-tmj, unchanged): the content group carries `rotate(90)`,
   so canonical `(x, y)` lands at `(-y, x)`. A card drawn at canonical `(x_s - W/2, rail)` with
   size `W x H` therefore presents its WIDTH across the rail in the nose-up view — which is why a
   vertical rail anchor is a card CENTRE and clears its neighbour by `W/2`, while a horizontal one
   is a card TOP edge and clears by `H`.
5. Nose-up, canonical y grows toward the board's BOTTOM side, and `(-y, x)` maps that to screen
   left. So the bottom (rocker) rail is the left column nose-up and the deck (thickness) rail is
   the right column — the same physical split as nose-left, seen from the side.
6. The length label is anchored at canonical `(PAD_X, PAD_TOP - 8)`. Nose-up that puts it exactly
   where the deck rail is about to go, at the nose station — it must move (Task 1).
7. `rocker-view-frame.ts`'s exports are consumed by `rocker-viewer.tsx` and its own test file only
   (grepped) — no third consumer to keep in step.
8. **The TEMPLATE screen's grammar, read out of `components/viewer/callout-primitives.tsx`.** An
   INPUT is a `CalloutChip`: a `CalloutChipFrame` card (fill `--outline-page-bg`, stroke
   `--border`, radius 4) carrying its station NAME over its VALUE, with a plain leader line
   (`--outline-station-line`, width 1) to the point it names, and no tick. A DERIVED value is an
   `OutputRail`: no card at all — an extension line from the measured point on the board's own
   edge out to the rail, a 45-degree `DimensionTick` at that measured point (`--outline-dim-ink`,
   width 1.1, half-length 4), then the VALUE over the STATION NAME. Note the stacking flips
   between the two kinds — name-over-value for an input, value-over-name for a derived reading —
   and that the name is always `--outline-callout-label` while the value is always
   `--outline-ink`.
9. **Which rocker figures are inputs, audited in `components/rocker/rocker-controls.tsx`.** Rocker
   side: `noseLift` and `tailLift` have sliders; `noseLiftAt12in` and `tailLiftAt12in` are printed
   as read-only text in the sidebar (they became measurements off the drawn curve in 260829-rda),
   and the centre's lift is zero by construction. So exactly two of the five rocker figures are
   inputs. Foil side: all five thicknesses have their own slider. This is the founder's split,
   confirmed in the code rather than assumed.
10. `DimensionTick` is a pure exported function component with no hooks and no context use, so the
   rocker viewer can draw it directly. `CalloutChip` and `OutputRail` cannot be reused wholesale:
   both read `useViewerOrientation()` and counter-rotate with `rotate(90)`, which is the OUTLINE
   viewer's convention and the OPPOSITE of this viewer's `rotate(-90)` local `Upright`, and
   `OutputRail` additionally assumes the outline's single shared `valueX` gutter. The parity to
   copy is the treatment — surface, tick, type, fills, stacking — not the two composite components.
</planner_findings>

<tasks>

<task type="tracer">
  <name>Task 1: The frame learns about two card rails</name>
  <files>components/rocker/rocker-view-frame.ts, components/rocker/rocker-view-frame.test.ts</files>
  <behavior>
    - A layout built with cards on reserves a card band on BOTH sides of the board: `viewH` = top pad + deck band + `maxDeckIn * scale` + bottom band.
    - A layout built with cards off reserves neither band, so a compact consumer's frame is the board plus a hairline of pad.
    - Every station card on either rail, in either orientation, at 60in / 78in / 120in, sits fully inside the returned frame.
    - Every deck card's near edge clears the worst-case deck line by exactly `RAIL_GAP`; every bottom card's near edge clears the baseline by exactly `RAIL_GAP`.
    - Neighbouring cards on one rail keep a positive gutter at the tightest pitch (120in).
    - Both read-out stacks — a card's name-over-value and a plain reading's value-over-name — fit inside one card's own box at the shared rail anchor, ink included, so containment proved for cards holds for plain readings too.
    - Nose-up, the length label's own anchor and its type band sit inside the frame and clear the nose station's cards.
    - A zero, negative or NaN length still produces a finite frame with no NaN in the viewBox string.
  </behavior>
  <action>
Extend `components/rocker/rocker-view-frame.ts` so it decides TWO card rails instead of one. Keep
it pure (no React import) and keep it the only place any of this arithmetic lives — the viewer
must still derive nothing of its own (Rule 1).

Constants. Take `STATION_CARD_HEIGHT` from 50 to 35: a card now carries a station name row plus a
single value row instead of two stacked values, and 35 keeps the existing type rhythm (name
baseline at rail + 13, value baseline at rail + 28, 7 units of tail below). Add `CARD_GUTTER = 8`
(the gutter already written as a bare 8 in the existing frame expressions — name it and use it
everywhere) and `BARE_PAD = 8` (the pad a compact, card-less frame leaves around the board so a
stroked edge is not half-clipped). `STATION_CARD_WIDTH` stays as it is, derived from the narrowest
12in column pitch. Replace `RAIL_LABEL_HEIGHT` and the module-level `BOTTOM_PAD` with one exported
helper `cardBandDepth(orientation)` returning `RAIL_GAP + (orientation === "horizontal" ?
STATION_CARD_HEIGHT : STATION_CARD_WIDTH) + CARD_GUTTER` — a band has to be as deep as the card
actually presents across it, and finding 4 says that is the card's height nose-left and its width
nose-up.

Typography metrics move here too, so the module owns the whole band's arithmetic and the viewer is
left with nothing but rendering. Export the rail's existing type scale as
`STATION_NAME_SIZE = 10` and `STATION_VALUE_SIZE = 13` (the sizes the viewer hard-codes today),
the card's two baselines as `CARD_NAME_DY = 13` over `CARD_VALUE_DY = 28` (measured from that
card's rail anchor, unchanged from today's first two rows), and the plain reading's two baselines
as `READOUT_VALUE_DY = STATION_CARD_HEIGHT / 2 - 2` over
`READOUT_NAME_DY = READOUT_VALUE_DY + STATION_VALUE_SIZE` — value first, station name under it,
which is the TEMPLATE screen's stacking for a derived value (finding 8), the block sitting centred
in the same band depth a card occupies.

One band per side, sized for a card, even though only two of the five bottom-rail figures are on
cards (finding 9). A card is the deepest thing either rail carries, so a shallower band would save
the frame nothing; and one shared anchor is what makes the two kinds line up along the rail
instead of each finding its own offset — the rule sketch 001 exists to enforce. It also keeps the
containment proof simple: a plain reading's rows sit inside the box a card occupies at the same
anchor, so every card containment test carries the plain readings with it, in both orientations.

Input. Add a required `showStationCards: boolean` to `RockerViewLayoutInput`, documented as: a
band is reserved only when read-outs are drawn there, so a consumer in compact mode is not paying
for a rail it never renders. Do not give it a default — every call site should have to say which
it is.

Bands and baseline. Compute `topPad` = `showStationCards ? PAD_TOP : BARE_PAD`; `band` =
`showStationCards ? cardBandDepth(orientation) : 0`; `deckTopY` (the worst-case deck reference,
the y the tallest board this app can dial in would reach) = `topPad + band`; `baselineY` =
`deckTopY + maxDeckIn * scale`; `viewH` = `baselineY + (showStationCards ?
cardBandDepth(orientation) : BARE_PAD)`. Keep `viewH` on the returned layout.

Rails, symmetric about the board. Bottom rail (unchanged in shape): `tickEndY = baselineY +
RAIL_GAP` in both orientations; `railY` = `tickEndY` horizontal, `tickEndY + cardWidth / 2`
vertical. Deck rail (new): `deckTickEndY = deckTopY - RAIL_GAP` in both orientations — this is the
deck cards' near edge, the mirror of `tickEndY`; `deckRailY` = `deckTickEndY - cardHeight`
horizontal (a card hangs UP from the rail here, so the anchor is its top edge), `deckTickEndY -
cardWidth / 2` vertical (the anchor is the card's cross-axis centre, per finding 4). Return
`deckRailY` and `deckTickEndY` on the layout. `cardDy` is unchanged and applies to both rails.

Length label anchor. Return `labelX` and `labelY` (canonical coordinates) so the viewer stops
hard-coding them. Horizontal: `PAD_X` and `PAD_TOP - 8`, byte-identical to today. Vertical: the
label can no longer sit beside the nose (finding 6) — put it just before the nose station's cards
along the long axis and align it to the deck rail's outer edge, i.e. `labelX = PAD_X + cardDy -
LENGTH_LABEL_GAP` with a named `LENGTH_LABEL_GAP = 6`, and `labelY = deckRailY - cardWidth / 2`.
Add a named `LENGTH_LABEL_SIZE = 12` matching the label's own font size in the viewer, used only
to reserve the label's type band on the frame. When `showStationCards` is false the label is not
drawn, but still return the horizontal values so the field is never NaN.

Frame. Horizontal is unchanged in shape: `minX` 0, `minY` 0, `width` `VIEW_W`, `height` `viewH`.
Vertical is built from its own rotated content, both rails now:
- cross axis: `crossFar` = `showStationCards ? railY + cardWidth / 2 + CARD_GUTTER : baselineY +
  BARE_PAD`; `crossNear` = `showStationCards ? deckRailY - cardWidth / 2 - CARD_GUTTER : deckTopY
  - BARE_PAD`; then `minX = -crossFar` and `width = crossFar - crossNear`.
- long axis with cards: `minY` = `labelX - LENGTH_LABEL_SIZE - 4` (the label's type runs back
  toward the frame's start from its own baseline), `maxY` = `PAD_X + boardSpan + cardHeight / 2 +
  4`, `height = maxY - minY`. Without cards: `minY = PAD_X - BARE_PAD`, `maxY = PAD_X + boardSpan
  + BARE_PAD`. `boardSpan` keeps reading the same clamped effective length it reads today.

`stationCardRect`. Add a fourth required parameter `side: RockerCardSide` (`"deck" | "bottom"`,
exported type). It selects the rail anchor — `layout.deckRailY` or `layout.railY` — and the two
existing orientation branches are otherwise unchanged: horizontal returns `{ x: stationX -
cardWidth / 2, y: rail }`, vertical returns `{ x: -rail - cardWidth / 2, y: stationX + cardDy }`.
Update the doc comment to name both rails.

Now bring `components/rocker/rocker-view-frame.test.ts` with it. Every existing
`rockerViewLayout` call needs the new input field, and every `stationCardRect` call needs the new
side argument; where a suite asserts containment, clearance or non-overlap, loop it over BOTH
sides rather than only the bottom one. Specifically:
- The `legacy pin` suite is superseded — Task 3 deliberately moves the order form onto the
  fit-to-board, card-less path. Rewrite it as an order-form-path pin (same job, new numbers):
  with `fitToBoard: true, showStationCards: false`, at 60in / 78in / 120in, assert the drawn span
  is 820, the frame is `0 0 900 x` with `x` equal to `BARE_PAD + 14 * scale + BARE_PAD`, and that
  this height is strictly less than the same length's height with `showStationCards: true` — the
  print box must never silently regain a band it does not draw.
- The cross-extent suite becomes the new band formula: `topPad + cardBandDepth(orientation) + 14 *
  scale + cardBandDepth(orientation)`, checked in both orientations for both `fitToBoard` values.
- The card-constant assertions become 74 wide by 35 tall.
- Add a horizontal clearance suite: at 60in / 78in / 120in every deck card's bottom edge is
  `RAIL_GAP` above `baselineY - 14 * scale`, and every bottom card's top edge is `RAIL_GAP` below
  `baselineY` — i.e. neither rail can reach the worst-case board box.
- Extend the vertical clearance suite the same way, in final (rotated) coordinates: a deck card's
  near edge is at least `RAIL_GAP` outside `-(baselineY - 14 * scale)`.
- Add a rail-vs-rail suite: at the same station the deck card and the bottom card never overlap on
  the cross axis, in both orientations.
- Add a stacks-fit suite: for BOTH stacks — the card's `CARD_NAME_DY`/`CARD_VALUE_DY` and the
  plain reading's `READOUT_VALUE_DY`/`READOUT_NAME_DY` — the topmost ink (a baseline less its own
  font size) is above 0 and the bottommost ink (a baseline plus a quarter of its font size for the
  descender) is within `STATION_CARD_HEIGHT`, with the rows in their intended order. This is what
  makes "a plain reading lives inside a card's box" a checked claim rather than a comment.
- Replace the label run-room assertions with ones reading `layout.labelX` / `layout.labelY`:
  nose-up, the anchor is inside the frame with at least 150 units of run-room toward `minX`, and
  the label's long-axis band (`labelX - LENGTH_LABEL_SIZE` to `labelX`) does not intersect the
  nose station's card band (`PAD_X + cardDy` to `PAD_X + cardDy + cardHeight`).
- Keep the fit, maximisation (>= 88% of the long axis in both orientations), pitch, degenerate-
  input, not-a-transposition and horizontal-frame-shape suites, adjusted only for the new input.

The board must keep its true proportions: one `scale` field shared by both axes, never a second
one for the cross axis. No formula moves into a component.
  </action>
  <verify>
    <automated>npx vitest run components/rocker/rocker-view-frame.test.ts</automated>
    <automated>grep -v '^[[:space:]]*[/*]' components/rocker/rocker-view-frame.ts | grep -c 'deckRailY' | awk '$1 >= 2 {exit 0} {exit 1}'</automated>
  </verify>
  <done>The layout module returns a deck rail, a bottom rail and a label anchor for both orientations; the frame contains every card on both rails at 60in, 78in and 120in; `npx vitest run components/rocker/rocker-view-frame.test.ts` is green with the order-form path pinned to its new numbers.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Rocker below, thickness above, in the template's own card-or-plain grammar</name>
  <files>components/rocker/rocker-viewer.tsx</files>
  <action>
Draw two read-outs per station instead of one stacked card, in the two kinds the TEMPLATE screen
uses (finding 8), reading every position and type size from the layout module (this component
still derives no frame or band arithmetic of its own).

Pass the new input through: `rockerViewLayout({ lengthIn, maxDeckIn, orientation, fitToBoard,
showStationCards: !hideCallouts })`, and destructure `deckRailY`, `deckTickEndY`, `labelX` and
`labelY` alongside the fields it already takes. Import the type-scale and row-offset constants
from the same module rather than keeping the sizes inline, and import `DimensionTick` from
`components/viewer/callout-primitives` (it is hook-free and orientation-agnostic, so it draws
correctly inside this viewer's own rotated group — finding 10).

Give each entry in the `stations` array three more fields, all sampled exactly the way the drawing
loop already samples them at that station's `stationIn` — projection of existing geometry calls,
not new formulas:
- `rockerHeightIn`: `mmToInches(sampleRocker(geometry, stationMm))`, the point on the bottom curve
  the rocker figure measures.
- `deckHeightIn`: that same value plus `mmToInches(sampleFoil(foil, length, stationMm))`, the
  point on the deck curve the thickness figure measures.
- `rockerKind`: `"input"` for the two tips and `"derived"` for the other three — declared here as
  a field so the rule is visible in one place, with a comment naming why (finding 9: those two
  have sliders, the 12in figures are measured off the drawn curve, and the centre's lift is zero
  by construction). Every thickness figure is an input, so the deck side needs no such field.

Write one small local component for each kind, so neither treatment is spelled out five times:
- **Card** (an input, mirroring `CalloutChip`): the existing
  `Upright`/`translate(0, cardDy)`/`CalloutChipFrame` composition anchored at the given rail, with
  the station NAME at `CARD_NAME_DY` in `STATION_NAME_SIZE`, weight 700, `--outline-callout-label`,
  over the VALUE at `CARD_VALUE_DY` in `STATION_VALUE_SIZE`, weight 700, `--outline-ink`; both
  centred on the station. Plus a plain leader line at the station's x, from that rail's near edge
  to the measured point on the curve, stroked `--outline-station-line` at width 1 — no tick, which
  is how the template distinguishes an input's leader.
- **Plain reading** (a derived value, mirroring `OutputRail`): NO card surface at all. A leader
  line on the same terms, plus a `DimensionTick` at the measured point on the curve, then the
  VALUE at `READOUT_VALUE_DY` in `STATION_VALUE_SIZE`, weight 700, `--outline-ink`, over the
  STATION NAME at `READOUT_NAME_DY` in `STATION_NAME_SIZE`, weight 700, letter-spaced,
  `--outline-callout-label` — value first, the template's order for a derived reading, inside the
  same `Upright`/`translate(0, cardDy)` composition so it rides the rail exactly as a card does.

Then render, per station:
- the deck side: a Card at `deckRailY`, leadered from `deckTickEndY` to `pxY(deckHeightIn)`,
  showing the `T` value. All five stations, because all five thicknesses are inputs.
- the bottom side: at the two tips a Card at `railY` showing the `R` value; at the other three a
  Plain reading at `railY`, leadered from `tickEndY` to `pxY(rockerHeightIn)` with its tick on the
  curve. The centre keeps the em-dash it shows today, in the muted label colour — it stands in for
  a value that is zero by definition rather than one that was measured.

This replaces the old fixed tick that ran from the baseline down to the rail: every read-out on
either side is now leadered to the exact point it measures, which is the template's rule and what
makes the two sides symmetric. The dashed baseline itself is untouched.

Both kinds keep the existing card width and the existing `Upright` anchoring convention (`x` at
the station, `y` at that rail's anchor), which is what keeps them upright and correctly placed
nose-up as well as nose-left.

Anchor the board-length label at `labelX` / `labelY` from the layout instead of the hard-coded
`PAD_X` / `PAD_TOP - 8` — both the `Upright` anchor and the `<text>` coordinates. Keep the
end-anchoring in the nose-up view. Drop the now-unused `PAD_TOP` import if lint reports it; `PAD_X`
stays, it is still what `pxX` and the drag inverse are written against.

Update the doc comments this changes: the module header's description of the output rail — it is
now two rails, one per surface, drawn in the TEMPLATE screen's grammar, and the header should
state the rule a reader needs (a filled card is a value the shaper sets, a plain number is one
measured off the drawn curve) along with which figures fall on which side of it — and, on the
`hideCallouts` prop, the claim that the frame is fixed regardless of that flag, since the flag now
also decides whether a band is reserved at all. Say what is true now; leave no sentence a later
reader could follow back into the old single-rail layout.

Nothing about dragging changes: `toBoardPoint` keeps reading `layout.scale` and `layout.baselineY`,
both of which move with the new bands, so the inverse follows automatically.
  </action>
  <verify>
    <automated>npm test</automated>
    <automated>npm run lint</automated>
    <automated>grep -v '^[[:space:]]*[/*]' components/rocker/rocker-viewer.tsx | grep -c 'deckRailY' | awk '$1 >= 2 {exit 0} {exit 1}'</automated>
    <human-check>Post-merge, on `/design/rocker`: each station's rocker figure reads below the board and its thickness figure above it. Below the board, only the nose-tip and tail-tip rocker figures sit on cards; Nose @ 12", Center and Tail @ 12" are plain numbers with a 45-degree tick on the curve. Above the board, all five thickness figures sit on cards. Put the screen beside `/design/outline` — a card and a plain reading look the same on both screens, and moving a rocker slider moves a carded figure while the plain ones follow the curve. Both rails read cleanly at 5'0", 6'6" and 10'0", and nothing touches the board with rocker and thickness dialled to their maximums. Press the rotate button: rocker read-outs left of the upright board, thickness cards right, everything fully on screen, the board-length label readable above the nose. Turn on construction lines and drag each of the four control points in both views — the curve follows the pointer and the sliders follow the curve.</human-check>
  </verify>
  <done>Each station draws a thickness card on the deck side and, on the bottom side, a card at the two tips and a plain template-style reading at the other three, in both orientations, with the length label read from the layout; `npm test` and `npm run lint` are clean.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: The order form's rocker box holds the drawing and nothing else</name>
  <files>components/summary/order-form.tsx, components/rocker/rocker-viewer.tsx, components/rocker/rocker-view-frame.ts</files>
  <action>
In `components/summary/order-form.tsx`, take the two flanking tick columns out of the ROCKER box
and give the drawing the whole body. Delete the local helper that renders a tip lift as a ticked
value, delete both of its call sites, and leave the box's inner row holding one child: the
`relative min-h-0 min-w-0 flex-1` container the viewer draws into. Keep the row's small padding so
the drawing does not touch the box's ink border, and keep the shared `OrderFormTick` primitive —
four other boxes on the sheet still use it. Remove any import the deletion leaves unused (lint
will name it).

Pass `fitToBoard` to that `RockerViewer` call. Together with the card-less frame Task 1 gives it
(`hideCallouts` is already set here, so no band is reserved), this is what makes the profile span
the box: the board is scaled to its own length instead of to a ten-foot one, and the frame is the
board plus a hairline instead of the board plus a rail it never draws.

Task 2's card-or-plain grammar does not reach this box, and confirm that rather than assume it:
`hideCallouts` is already set here and it suppresses the whole station rail — both kinds of
read-out, the leaders and the ticks — leaving the closed board shape and the baseline. If anything
from that rail does render on the sheet, stop and report it instead of hiding it with a second
guard.

Nothing about the sheet's geometry may move: the box keeps its caption, its `.order-form-rocker`
share of the column, its position above the template window and its print behaviour. The viewer's
`<svg>` is absolutely positioned to fill its container, so the frame change alters what fills the
box, never the box.

Then bring three doc comments back in line with the code, because each of them currently states
something this task makes false:
- the module header bullet describing the ROCKER panel — it no longer prints its tip lifts in two
  flanking columns; it draws the side profile across the box.
- the `fitToBoard` prop comment in `components/rocker/rocker-viewer.tsx` — the order form now opts
  in, so the sentence naming the editor as the only caller has to go, and the reason the flag
  exists should be restated as what it now is: a per-consumer choice of scale rule.
- the same claim restated in `components/rocker/rocker-view-frame.ts`'s own comments about which
  path the order form takes.
Say what is true now; a later reader must not be able to follow any of these back into the old
arrangement.

Note for the summary: this removes the only printed nose and tail rocker figures from the sheet —
the drawn curve stays, the two numbers go. That is the change as asked. Record in the SUMMARY that
`FormBox` already accepts a `captionRight`, so those two figures could ride on the box's caption
line at zero cost to the drawing if the founder wants them back.
  </action>
  <verify>
    <automated>npm test</automated>
    <automated>npm run lint</automated>
    <automated>grep -c 'OrderFormTick label=' components/summary/order-form.tsx | awk '$1 == 4 {exit 0} {exit 1}'</automated>
    <automated>grep -v '^[[:space:]]*[/*]' components/summary/order-form.tsx | grep -c 'fitToBoard' | awk '$1 >= 1 {exit 0} {exit 1}'</automated>
    <human-check>Post-merge, on `/design/summary`: the ROCKER box shows the side profile alone, spanning the box, with no tick squares beside it — noticeably larger than before at 5'0", 6'6" and 10'0" alike, and never clipped or overflowing its box. The rest of page 1 is where it was: same header, dims row, rail plots, template window, glassing band. Print preview both pages in a light and a dark theme — still two pages, sheet layout unchanged, nothing scrolling or cut off.</human-check>
  </verify>
  <done>The order form's rocker box contains the drawing alone at full width, the four remaining tick call sites elsewhere on the sheet are untouched, the sheet's layout and print path are unchanged, and `npm test` plus `npm run lint` are clean.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| saved design -> viewer | A stored board's length, lifts and thicknesses are drawn without re-validation; a corrupt or hand-edited row reaches the frame math directly. |
| design values -> SVG attributes | Every coordinate is a number written into a JSX attribute; no markup is string-built and no HTML is injected. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-UUE-01 | Denial of Service | `rocker-view-frame.ts` | low | mitigate | The existing clamp/fallback on a zero, negative or NaN length still governs both new bands and both rails; the degenerate-input suite is kept and extended so no NaN can reach a viewBox and blank the screen. |
| T-UUE-02 | Tampering | `rocker-viewer.tsx`, `order-form.tsx` | low | accept | All new elements are `<line>`, `<rect>` and `<text>` with numeric or `formatInchesFraction`-produced attributes, matching the posture already in place; no string-built markup and no `dangerouslySetInnerHTML` is introduced. |
| T-UUE-03 | Information Disclosure | `order-form.tsx` | low | accept | The change removes printed values from the sheet and adds none; no new data reaches the printed page. |

No package-manager installs in this plan, so no package legitimacy gate applies.
</threat_model>

<verification>
- `npm test` — all suites green, including the extended `components/rocker/rocker-view-frame.test.ts`.
- `npm run lint` — no new errors (nine pre-existing warnings in untouched files are expected).
- `npx tsc --noEmit` — no errors beyond the two known phantom `LayoutProps` errors in
  `app/layout.tsx` / `app/design/layout.tsx` caused by a gitignored `next-env.d.ts` being absent
  from a fresh worktree.
- `npm run build` and `npm run dev` are deliberately NOT run here — Turbopack cannot resolve
  `next` inside a git worktree. The orchestrator builds after merge, and the `<human-check>` items
  above are the post-merge browser pass.
</verification>

<success_criteria>
- Rocker figures read below the board and thickness figures above it, on the ROCKER screen, in
  both the nose-left and the nose-up view.
- The card-or-plain rule reads identically to the TEMPLATE screen's: cards for the seven figures a
  shaper sets with a slider, plain template-style readings for the three measured off the curve.
- No card overlaps the board or a neighbouring card at any board length or control setting, proven
  by the frame suite at 60in, 78in and 120in on both rails rather than by inspection.
- The order form's rocker box shows the profile alone and the profile spans the box.
- The order form's sheet layout, page count and print path are unchanged.
- All frame and side/scale arithmetic lives in `components/rocker/rocker-view-frame.ts`; the two
  components only project and render.
</success_criteria>

<planner_assumptions>
1. **Diagnosis of the summary box** (finding 3): the drawing is width-bound in its box today, and
   the board occupies only 59% of that width because `fitToBoard` is off. The fix is all three
   levers — remove the tick columns, opt into `fitToBoard`, and stop reserving a card band the
   compact mode never draws. Modelled result at 6'6": the drawn board goes from ~243px to ~489px
   of a ~537px box. Short boards gain slightly less (the worst-case deck reserve makes the frame
   height-bound at 5'0") but still roughly double.
2. **This reverses one decision from 260829-tmj on purpose.** That task pinned the order form to
   the legacy fixed frame by construction. The founder has now asked for the opposite for this
   box, so the pin is rewritten — not deleted — to lock the NEW order-form path, keeping the
   guarantee that an editor-only change can never silently move the print sheet.
3. **Removing the ticks removes the sheet's only printed nose and tail rocker numbers.** That is
   the literal ask and it is what the plan does. `FormBox` already supports a `captionRight`, so
   those two figures could return on the caption line at zero cost to the drawing — flagged for
   the founder rather than decided here.
4. **The centre station keeps its em-dash**, now as a plain reading rather than a card — it stands
   in for a value that is zero by construction rather than one measured off the curve, which is
   the distinction the muted colour already carried.
5. **Card height drops 50 -> 35** because each card now holds one value instead of two.
6. **One band per side, sized for a card, rather than a shallower band where the readings are
   plain.** A card is the deepest thing either rail carries, so a mixed band saves the frame
   nothing; one shared anchor is what makes the two kinds line up along the rail; and it keeps the
   containment proof to a single geometry — a plain reading's rows are checked to sit inside the
   box a card occupies at the same anchor, so every card containment test carries the plain
   readings with it. This is the choice the coordinator left open.
7. **Both kinds keep the TEMPLATE screen's own stacking**: name over value on a card, value over
   station name on a plain reading. On the template the two kinds live in separate gutters and
   never share a rail; here they do share one, so the value rows of the two kinds sit a row apart.
   The card border is the cue that matters and it stays unambiguous. If the mixed rail reads badly
   in the browser, the fallback is to align the plain reading's value row with the card's value
   row (its name would then sit above), which is a two-constant change in the frame module.
8. **The parity copied is the treatment, not the components.** `CalloutChip` and `OutputRail`
   both counter-rotate on the OUTLINE viewer's convention, the opposite of this viewer's, and
   `OutputRail` assumes the outline's single shared value gutter — so the rocker viewer keeps its
   own `Upright` and draws the same surface (`CalloutChipFrame`), the same 45-degree
   `DimensionTick`, the same fills and the same stacking. Related boundary: the rocker rail keeps
   its own unit-based type sizes rather than adopting the template's pinned-pixel callout scale.
   Pinning would make a chip grow in user units as the fit scale falls, which is exactly what
   forced the outline viewer's wider gutters, and it would put the station-card pitch guarantee
   (a card is 74 units because the narrowest column pitch is 82) back in play. Worth doing one
   day, deliberately, as its own task.
9. **Nose-up, the board-length label moves** from beside the nose to just above the nose tip — the
   space it used to occupy is now the thickness rail (finding 6).
10. **The editor's frame gets taller in canonical units** (two bands instead of one: viewBox aspect
   at 6'6" goes 3.58 -> 3.00). If the drawing panel turns out to be wider than about 3:1, the board
   would become height-bound and slightly smaller than today. The post-merge browser check should
   confirm the board still fills the panel width; if it does not, the deck band is the knob.
</planner_assumptions>

<output>
Create `.planning/quick/260829-uue-rocker-cards-rocker-dims-on-bottom-side-/260829-uue-SUMMARY.md` when done
</output>
