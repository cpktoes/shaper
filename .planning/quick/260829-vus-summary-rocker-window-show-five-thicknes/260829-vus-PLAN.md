---
phase: 260829-vus
plan: 01
type: execute
wave: 1
depends_on: [260829-uue]
subsystem: rocker-viewer
tags: [rocker, order-form, print, callouts, viewer-frame, geometry]
files_modified:
  - components/rocker/rocker-view-frame.ts
  - components/rocker/rocker-view-frame.test.ts
  - components/rocker/rocker-viewer.tsx
  - components/summary/order-form.tsx
autonomous: true
requirements: [QT-260829-vus]
user_setup: []

estimate:
  tokens: 30000
  raw_tokens: 25000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "On the Summary order form's ROCKER box, five thickness figures read above the board and four rocker figures read below it (D-01, D-02)."
    - "The centre station carries a thickness figure but NO rocker figure — the rocker's zero is not printed (D-02)."
    - "Every compact reading's printed type lands at ~9pt (12px) for real boards and never under 8pt (10.67px) (D-03)."
    - "The ROCKER box's own flex share, position and the sheet's page count are unchanged; only the profile inside it gets smaller (D-04)."
    - "The rocker editor screen at /design/rocker renders exactly as it does today — same two card rails, same drag behaviour."
  artifacts:
    - components/rocker/rocker-view-frame.ts
    - components/rocker/rocker-view-frame.test.ts
    - components/rocker/rocker-viewer.tsx
    - components/summary/order-form.tsx
  key_links:
    - "rocker-view-frame.ts owns EVERY number behind the compact rails (band depths, row baselines, type size, reading x positions, printed-size model) — rocker-viewer.tsx derives none of them (Rule 1)."
    - "order-form.tsx selects the compact mode through one prop on RockerViewer; the print path (@media print + use-print-fit.ts) is untouched."
---

<objective>
Put the measurement callouts back into the Summary order form's ROCKER box: the five thickness
figures on the deck side of the profile and four rocker figures (nose tip, nose @ 12", tail @ 12",
tail tip) on the bottom side, printed small but never below ~8pt.

The founder's ask, read as four locked decisions:

- **D-01** — five thickness figures on the deck side (all five stations, centre included).
- **D-02** — four rocker figures on the bottom side: nose tip, nose @ 12", tail @ 12", tail tip.
  The centre rocker reading (zero by construction) is deliberately NOT printed.
- **D-03** — callouts are "fairly small", with ~9pt (12px, this sheet's own existing type floor)
  as the target and ~8pt (10.67px) as a hard floor at print size.
- **D-04** — the ROCKER box's own size and position on the sheet do not change. The rails cost the
  profile some height inside the box; that is accepted, but the profile stays as large as the box
  allows.

Purpose: the ROCKER box is currently the only place on the two-page order form where rocker numbers
could appear, and right now it prints a bare curve with no numbers at all. A shaper cannot cut foam
to a curve — quick task 260829-uue removed the two tick squares that used to carry the tip lifts,
and the founder is asking for the full measurement set in their place.

Output: a compact callout mode on `RockerViewer`, all of its geometry decided in the pure, tested
`rocker-view-frame.ts`, selected by `components/summary/order-form.tsx`.
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
@components/viewer/callout-primitives.tsx
@components/summary/order-form.tsx
@components/summary/use-print-fit.ts
@app/design/summary/order-form.css
@.planning/quick/260829-uue-rocker-cards-rocker-dims-on-bottom-side-/260829-uue-SUMMARY.md
</context>

<design_decision>

## Why the compact rails look the way they do (read this before writing code)

This section is the reasoning the founder asked to have recorded. Task 1 transcribes it, in the
planner's numbers, into `rocker-view-frame.ts`'s own header comment.

### 1. The printed box is 4.7in x 0.92in — that is the whole problem

Derived from the sheet's own chain, in CSS px at print size (96px/in):

**Width.** `use-print-fit.ts` pins the sheet to `min(Letter 8.5in, A4 8.27in) - 2 x 8mm` =
**7.640in** = 733.4px. Sheet inset (1.5px border + 6px `p-1.5`, both sides) = -15px -> 718.4px.
Band 2 spends `--order-form-spine` 24px + `--order-form-gap` 4px -> 690.4px. The drawings row gives
`--order-form-left` 0.32 to the rail plots (220.9px) plus a 4px gap, leaving the right column
**465.5px**. The ROCKER `FormBox` takes 2px of border and its body's `px-1.5` takes 12px:

> **drawing width = 451.5px = 4.70in**

**Height.** Sheet height `10.370in x 0.995` (FIT_SAFETY) = 990.5px; inset -15px -> 975.5px. Header
12% (117.1px), glassing 11% (107.3px), page mark ~17px, three 4px gaps -> band 2 = 722.1px. Inside
it the dims strip is 7.4% (53.4px) plus a 4px gap -> drawings row 664.7px. `.order-form-rocker` is
18% of the right column = 119.6px. Less 2px border, ~21px caption row and the body's `py-1` (8px):

> **drawing height = 88.6px = 0.92in**  (box aspect 5.10 : 1)

### 2. That geometry forbids the card grammar, and forbids station names

The SVG is `preserveAspectRatio="xMidYMid meet"`, so one uniform scale maps user units to paper:
`k = min(451.5 / frameWidth, 88.6 / frameHeight)`. The frame is 900 units wide, so while the frame
is width-bound **k = 451.5 / 900 = 0.5017 px per user unit, for every board alike**.

At `k = 0.5017`, hitting 12px (9pt) of printed type needs a font size of **24 user units** — nearly
twice `STATION_VALUE_SIZE` (13). A `CalloutChipFrame` card sized for 24-unit type would need a band
roughly 60 units deep on each side; two of those plus a real board box blows past the frame height
at which `k` stops being width-bound (176.6 units), and the type collapses back under 8pt. The same
argument kills the second text row a card or an `OutputRail` reading carries (its station name).

> **Decision: in compact mode every reading is a bare value — no card surface, no station name.**
> Which figure is which is carried by *position* (five stations along the board) and by *side*
> (deck = thickness, bottom = rocker), reinforced by a `captionRight` note on the box itself. This
> is the "plain-reading treatment for everything" option, chosen because the card grammar
> physically does not fit on a 0.92in strip at 9pt.

### 3. The board box has to shrink to the board's own envelope

`rockerViewLayout` reserves `maxDeckIn` on the cross axis — today the worst case any board can dial
in, `ROCKER_LIFT_RANGE_IN.max (9) + FOIL_THICKNESS_RANGE_IN.max (5) = 14in`. A real 6'6" board uses
about 5in of that. In the editor the drawing is long-axis-bound so the reserve costs nothing (that
is planner finding 3 in the module's own comment) — but this box is short and wide, the frame is
about to become height-bound, and every reserved-but-empty unit now comes straight out of the type.

> **Decision: in compact mode the cross-axis reserve is the loaded board's OWN deck envelope**
> (`max` over the sampled stations of rocker lift + foil thickness), not the worst case. `scale` is
> unchanged, so the drawing is still one honest scale on both axes (the module's straightedge
> rule holds). A corrupt/non-finite envelope falls back to the worst-case constant.

### 4. The bottom rail needs two rows; the deck rail does not

The tightest station pitch is 12in on a 10'0" board: `12 x (820/120) = 82 units`. A rocker value
like `2 15/16"` is about 97 units wide at 24-unit type, so nose tip and nose @ 12" **would overlap
on the bottom rail**. Thickness values at those same two stations are short by nature (`15/16"`,
`1 7/16"` — about 76 and 83 units), so the deck rail's own worst realistic pair fits.

> **Decision: the deck rail is one row; the bottom rail is two rows — the two tip figures on the
> outer row, the two @ 12" figures on the inner row.** Same-row neighbours are then at least half a
> board apart and can never collide. A pure separation sweep (see below) is the safety net for
> anything either rail is handed that the estimate did not predict.

### 5. The resulting budget, and where it stops holding

With `COMPACT_VALUE_SIZE = 24` and `cap = 0.72 x 24 = 17.28`:

- deck band = `8 + 17.28 + 4` = **29.28 units**
- bottom band = `8 + 17.28 + 5 + 17.28 + 4` = **51.56 units**
- `frameHeight = 80.84 + deckEnvelopeIn x (820 / lengthIn)`

Width-bound (and therefore exactly 12.04px = 9.03pt of printed type) holds while
`frameHeight <= 176.6`, i.e. while the board box is <= 95.8 units:

| board | scale | envelope that still prints 9pt | envelope that still prints 8pt |
|-------|-------|-------------------------------|--------------------------------|
| 5'0"  | 13.67 | <= 7.0in | <= 8.4in |
| 6'6"  | 10.51 | <= 9.1in | <= 11.0in |
| 10'0" | 6.83  | <= 14in (the whole range) | <= 14in |

Real boards sit at 4.5-6in of envelope, so **every realistic board prints at 9.03pt**, and the type
degrades gradually (never clips) outside that. Task 1 pins both bars with tests.

### 6. Everything above is a model, and the model is only checkable one way

The box dimensions in section 1 are derived, not measured — the executor cannot run `npm run dev`
in a worktree. They go into the module as one named constant with the derivation attached, so the
type-size decision is explicit and testable and any future change to the compact bands has to
answer to it. The error direction is safe: a box **taller** than modelled only keeps the frame
width-bound, i.e. keeps the type at 9pt. The founder's post-merge print check is the real
verification and is carried in `<human-check>` blocks below.

</design_decision>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Decide the compact rails' geometry in the pure frame module</name>
  <files>components/rocker/rocker-view-frame.ts, components/rocker/rocker-view-frame.test.ts</files>
  <read_first>
    components/rocker/rocker-view-frame.ts (whole file), components/rocker/rocker-view-frame.test.ts
    (whole file), components/viewer/callout-primitives.tsx (CALLOUT_TICK_SIZE and DimensionTick only)
  </read_first>
  <behavior>
    - `rockerViewLayout` with `stationRails: "compact"` returns a frame 900 units wide whose height
      is `COMPACT_DECK_BAND + maxDeckIn * scale + COMPACT_BOTTOM_BAND`, and `compactRows` with three
      finite rows.
    - `compactValuePrintPx` returns >= 11.9 (9pt) for the representative trio
      (60in/5.0in, 78in/5.5in, 120in/6.5in), all with `fitToBoard: true`.
    - `compactValuePrintPx` returns >= 10.67 (8pt) for every combination of
      `lengthIn` in {60, 78, 120} and `maxDeckIn` in {4, 5, 6, 7, 8}.
    - `compactValueWidth('2 15/16"')` is wider than `compactValueWidth('5"')`, and both are positive
      and finite.
    - `compactRailReadingXs` keeps every returned text box inside the frame's own x range, including
      a tip reading whose natural centre sits `PAD_X` from the frame edge.
    - `compactRailReadingXs` leaves at least `COMPACT_READING_GUTTER` of clear space between
      neighbouring boxes on one row, including a deliberately over-subscribed row.
    - `compactRailReadingXs` returns the stations' own centres unchanged when nothing collides.
    - The bottom rail's two rows never overlap vertically, and the deepest glyph of the outer row
      stays inside `COMPACT_BOTTOM_BAND`; the deck row's highest glyph stays inside
      `COMPACT_DECK_BAND`.
    - `stationRails: "compact"` with `orientation: "vertical"` returns the identical layout it
      returns for `"horizontal"` (compact is a horizontal-only contract — its one consumer never
      rotates).
    - Every existing suite still passes with `stationRails: "full"` / `"none"` substituted for the
      old boolean, byte-identical numbers.
  </behavior>
  <action>
Extend the pure layout module so it decides the compact rails completely. `rocker-viewer.tsx` must
be able to draw them without computing a single band depth, baseline, type size or x position of
its own (Rule 1 — this module is the tested place those live).

**1. Widen the mode from a boolean to three named modes.** Replace `RockerViewLayoutInput`'s
`showStationCards: boolean` with `stationRails: "full" | "compact" | "none"` (export the union as
`RockerStationRails`), no default. Map the existing behaviour straight across: `"full"` is today's
`true` branch (both card rails, `PAD_TOP`), `"none"` is today's `false` branch (`BARE_PAD`, no
band). Update the module header comment and the field's doc comment to describe all three. In the
test file this is a mechanical substitution — `true` becomes `"full"`, `false` becomes `"none"`,
and the loop that iterates the old boolean iterates `["full", "none"] as const` instead; every
existing expectation keeps its exact numbers. TypeScript will surface any site you miss, since the
field is required and renamed.

**2. Add the compact constants**, each exported and each carrying the one-line reason it holds that
value (transcribe the relevant numbers from this plan's `<design_decision>` section 5):
`COMPACT_VALUE_SIZE = 24` (the size that lands on 12px = 9pt at the order form's own printed scale),
`COMPACT_CAP_RATIO = 0.72` (cap height as a share of font size — these strings are digits, a
fraction slash and an inch mark, none of which descend), `COMPACT_CURVE_GAP = 8` (board box edge to
the nearest glyph edge), `COMPACT_ROW_GAP = 5` (between the bottom rail's two rows),
`COMPACT_EDGE_GUTTER = 4` (outside the outermost row), `COMPACT_READING_GUTTER = 6` (minimum clear
space between two readings sharing a row), `COMPACT_TICK_SIZE = 7` (half-length of the 45-degree
tick; `CALLOUT_TICK_SIZE`'s 4 units would print as a 4px dot at this scale),
`COMPACT_LEADER_WIDTH = 1.6` (a 1-unit leader prints at half a pixel and washes out). Derive
`COMPACT_CAP = COMPACT_VALUE_SIZE * COMPACT_CAP_RATIO`, then
`COMPACT_DECK_BAND = COMPACT_CURVE_GAP + COMPACT_CAP + COMPACT_EDGE_GUTTER` and
`COMPACT_BOTTOM_BAND = COMPACT_CURVE_GAP + 2 * COMPACT_CAP + COMPACT_ROW_GAP + COMPACT_EDGE_GUTTER`.

**3. Add `compactRows` to `RockerViewLayout`** — one nested object holding the three rows the
viewer draws, each `{ textY, leaderStartY, kneeY }` in canonical coordinates:

- `deck`: `textY = deckTopY - COMPACT_CURVE_GAP`, `leaderStartY = textY + 2`,
  `kneeY = deckTopY - 2`.
- `bottomInner`: `textY = baselineY + COMPACT_CURVE_GAP + COMPACT_CAP`,
  `leaderStartY = textY - COMPACT_CAP - 2`, `kneeY = baselineY + 2`.
- `bottomOuter`: `textY = bottomInner.textY + COMPACT_CAP + COMPACT_ROW_GAP`,
  `leaderStartY = textY - COMPACT_CAP - 2`, `kneeY = baselineY + 2`.

`textY` is the SVG text baseline, `leaderStartY` is where that reading's leader leaves the type,
`kneeY` is where the leader turns to run straight down (or up) the station. Populate the object in
all three modes so the field is never `NaN`; outside compact it is unused and the existing card
fields carry the drawing.

**4. Give compact its own frame branch** inside `rockerViewLayout`: top pad is zero (the deck band
IS the pad), `deckTopY = COMPACT_DECK_BAND`, `baselineY = deckTopY + maxDeckIn * scale`,
`viewH = baselineY + COMPACT_BOTTOM_BAND`, and the frame is `minX 0 / minY 0 / width VIEW_W /
height viewH` regardless of the `orientation` argument. Document that contract on the union member:
compact is horizontal-only because its single consumer, the Summary order form, never rotates the
box, and a rotated single-row rail would present its own width across the rail the way a card does.
Leave `railY` / `deckRailY` / `tickEndY` / `deckTickEndY` / `cardDy` / `labelX` / `labelY` finite in
compact mode (reuse the `"none"` branch's values) so no consumer can read a `NaN`.

**5. Add `compactValueWidth(text: string, size = COMPACT_VALUE_SIZE): number`** — the printed width
of a formatted inch string, from a small per-character em-advance table for the bold body face:
space `0.30`, `"` `0.35`, `/` `0.42`, `-` `0.40`, everything else (the digits) `0.60`. Comment that
these are advance estimates for sizing decisions, not a text-metrics engine, and that the
separation sweep below is what actually protects the layout.

**6. Add `compactRailReadingXs(layout, readings: { stationX: number; width: number }[]): number[]`**
— the text centre x for each reading on ONE row, given the readings in ascending `stationX` order.
Three passes: left-to-right, pushing each reading right until it clears its predecessor by
`COMPACT_READING_GUTTER`; then right-to-left, pulling readings left so the last one's right edge
lands inside `layout.minX + layout.width - COMPACT_EDGE_GUTTER` and each still clears its successor;
then a final clamp of the first reading's left edge to `layout.minX + COMPACT_EDGE_GUTTER`. When
nothing collides this returns the station centres untouched. Comment that an over-subscribed row
distributes its shortfall (the leaders dogleg) rather than letting two numbers print on top of each
other, and that this is what makes a tip reading at the frame's own edge safe — `PAD_X` is 40 units
and a tip value can be 48 units wide.

**7. Add the printed-size model.** Export
`ORDER_FORM_ROCKER_BOX_PX = { width: 451.5, height: 88.6 }` with the full derivation from this
plan's `<design_decision>` section 1 in its comment (printable width, sheet inset, spine and gap,
`--order-form-left`, the `FormBox` border and `px-1.5`; then the sheet height, the band
percentages, the caption row and `py-1`) plus the note that these are derived rather than measured,
that the founder's print check is the real verification, and that an error in the taller direction
only keeps the type at target. Then
`renderedUnitPx(layout, box): number` = `Math.min(box.width / layout.width, box.height / layout.height)`
and `compactValuePrintPx(layout, box = ORDER_FORM_ROCKER_BOX_PX): number` =
`COMPACT_VALUE_SIZE * renderedUnitPx(layout, box)`.

**8. Extend the test suite** with a `describe` per behaviour bullet above. Use the 8pt bar as the
literal `10.67` and the 9pt bar as `11.9`, each with a comment naming the point size it stands for.
For the over-subscribed separation case, hand one row four readings each 300 units wide and assert
only that no pair overlaps by more than a rounding epsilon and that all boxes stay in the frame.
Keep the existing suites' numbers untouched — this task must not move the editor's frame by a unit.

Do not touch `rocker-viewer.tsx` or `order-form.tsx` in this task; the module compiles and its
suite passes on its own, with the viewer still calling the old field name failing to type-check
until Task 2. Run the module's own suite (below) rather than the full suite for this task's gate.
  </action>
  <verify>
    <automated>npx vitest run components/rocker/rocker-view-frame.test.ts</automated>
    <automated>grep -v "^\s*\*" components/rocker/rocker-view-frame.ts | grep -c "stationRails"</automated>
    <automated>grep -c "compactRows\|compactRailReadingXs\|compactValuePrintPx" components/rocker/rocker-view-frame.ts</automated>
  </verify>
  <done>
    The module's suite passes, including the new compact suites. `stationRails` appears at least 4
    times in the module outside comments. `compactValuePrintPx` returns >= 11.9 for the
    representative trio and >= 10.67 across the 15-case floor sweep. Every pre-existing expectation
    in the file still asserts the same numbers it asserted before.
  </done>
  <reversibility rating="reversible">Pure module plus tests; the compact branch is additive and the boolean-to-union change is mechanical.</reversibility>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Draw the compact readings in the rocker viewer</name>
  <files>components/rocker/rocker-viewer.tsx</files>
  <read_first>
    components/rocker/rocker-viewer.tsx (whole file), components/rocker/rocker-view-frame.ts (the
    compact exports Task 1 added), components/viewer/callout-primitives.tsx (DimensionTick)
  </read_first>
  <action>
Give the viewer a third callout mode and draw it. Nothing here computes a band, a baseline, a type
size or an x position — every one of those comes off `layout` (Rule 1).

**1. Replace the `hideCallouts` prop with `callouts?: "full" | "compact" | "none"`**, defaulting to
`"full"`, and pass it straight through as `stationRails`. Grep confirms only two consumers exist —
`components/rocker/rocker-editor.tsx` (which passes nothing and therefore keeps `"full"`, unchanged)
and `components/summary/order-form.tsx` (Task 3) — so the two booleans that could contradict each
other collapse into one prop that cannot. Write the prop's doc comment to describe all three modes
and to say which consumer takes which.

**2. Reorder the sampling so the deck envelope is known before the layout is built.** Today the
loop projects straight into `bottomPoints` / `deckPoints`, which needs `baselineY`, which needs
`maxDeckIn`. Split it: first build a plain array of `{ stationIn, rockerLiftIn, thicknessIn }` for
the `SAMPLES + 1` stations (pure inches, no projection); derive
`deckEnvelopeIn = Math.max(...samples.map((s) => s.rockerLiftIn + s.thicknessIn))`; choose
`maxDeckIn` as the envelope in compact mode and the existing worst-case constant otherwise; build
`layout`; then project the same samples into `bottomPoints` / `deckPoints` exactly as now. Guard the
envelope: a non-finite or non-positive value falls back to the worst-case constant, mirroring the
frame module's own corrupt-length fallback (threat T-VUS-01). Note in a comment that the
construction overlay's `pxY(maxDeckIn)` station lines are unaffected because construction only ever
runs in `"full"` mode, where `maxDeckIn` keeps its old value.

**3. Add a `CompactReading` local component** beside `StationCard` and `StationReadout`: no card
surface, no station name, one `<text>` at `textY` centred on the swept `textX` at
`COMPACT_VALUE_SIZE`, `fontWeight: 700`, `fontFamily: var(--font-body)`, filled `var(--outline-ink)`;
a `DimensionTick` at the measured point on the curve, drawn at `COMPACT_TICK_SIZE` (pass the size
through if `DimensionTick` accepts one, otherwise draw the 45-degree slash inline with the same
`--outline-dim-ink` stroke and note why); and a `<polyline>` leader with the three points
`(textX, leaderStartY) -> (stationX, kneeY) -> (stationX, curveY)`, stroked
`var(--outline-station-line)` at `COMPACT_LEADER_WIDTH`, `fill="none"`. Document that the dogleg
exists so a reading the separation sweep nudged off its station still points at the exact place it
measures.

**4. Render the three rows** in the compact branch. Build the reading lists in ASCENDING x order —
`pxX` puts the nose at the frame's left, so ascending x runs nose to tail, the reverse of
`stationInputs`. Deck row: all five stations with `thicknessValue` (D-01). Bottom inner row:
`tail12` and `nose12` with `rockerValue` (D-02). Bottom outer row: `tailTip` and `noseTip` with
`rockerValue` (D-02). The centre station appears on the deck row only — its rocker figure is the
curve's own zero and is deliberately not printed (D-02). For each row, measure every reading with
`compactValueWidth`, hand the `{ stationX, width }` list to `compactRailReadingXs`, and draw each
reading at the returned centre. Deck readings leader to `pxY(deckHeightIn)`; bottom readings leader
to `pxY(rockerHeightIn)`.

**5. Keep the three branches cleanly separated:** `"full"` renders exactly the two card rails and
the board-length label it renders today, untouched; `"compact"` renders the three rows and no length
label (the sheet's dims strip already prints Length); `"none"` renders the board and baseline alone.
Update the module header comment's drafting-grammar paragraph to describe the compact grammar and
why it drops the card surface and the station names (one sentence each, sourced from this plan's
`<design_decision>` section 2).
  </action>
  <verify>
    <automated>npm test</automated>
    <automated>grep -c "CompactReading\|compactRailReadingXs\|deckEnvelopeIn" components/rocker/rocker-viewer.tsx</automated>
    <automated>npx tsc --noEmit 2>&1 | grep -v "LayoutProps" | grep -c "error TS" || true</automated>
  </verify>
  <done>
    The full suite passes. `CompactReading`, `compactRailReadingXs` and `deckEnvelopeIn` all appear
    in the viewer. `npx tsc --noEmit` reports no errors other than the two known phantom
    `LayoutProps` ones (`app/layout.tsx`, `app/design/layout.tsx`) that a fresh worktree always
    produces. The editor path is untouched: `rocker-editor.tsx` still compiles without passing any
    callout prop.
  </done>
  <reversibility rating="reversible">One component, additive branch; the full mode's render tree is unchanged.</reversibility>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Switch the order form's ROCKER box to the compact callouts</name>
  <files>components/summary/order-form.tsx</files>
  <read_first>
    components/summary/order-form.tsx (module header comment and the ROCKER FormBox around line
    300), app/design/summary/order-form.css (the `.order-form-rocker` block and the `@media print`
    block)
  </read_first>
  <action>
Wire the box up and say, on the sheet itself, which side is which.

**1. Swap the prop:** the `RockerViewer` inside the ROCKER `FormBox` takes `callouts="compact"`
alongside the existing `fitToBoard`. Nothing else about the box changes — its `FormBox`, its
`flex-none order-form-rocker` class, its `bodyClassName="p-0"`, its inner `px-1.5 py-1` row and the
`relative min-h-0 min-w-0 flex-1` drawing container all stay exactly as they are, and
`.order-form-rocker`'s 18% share in `app/design/summary/order-form.css` is NOT touched (D-04).

**2. Give the box a `captionRight`** reading `Thickness above, rocker below` — the compact readings
carry no station names, so this is the sheet's own legend for them. `FormBox` already renders
`captionRight` non-wrapping and truncating at `order-form-micro`; the caption row has room for it
beside the six-character `ROCKER` caption at this box's width, and it costs the drawing no height
because the caption row's height is set by the caption's own type.

**3. Update the prose.** The module header's `ROCKER` bullet currently says the box draws the
profile and nothing else — rewrite it to describe the five thickness figures above the board and the
four rocker figures below it, the missing centre rocker reading and why (the rocker's zero), and the
fact that the profile is smaller than it was because the rails now take height inside an unchanged
box. Keep it in the plain shaper's English the rest of that comment is written in.

**4. Confirm the print path needs nothing.** `use-print-fit.ts` sizes sheets, not this box, and
`@media print` already darkens `--outline-station-line` for paper — check both by reading rather
than assuming, and record what you found in the summary. The leaders and ticks are drawn in that
same station-line ink, so they inherit that treatment; the reading text is `--outline-ink`, which
prints as the sheet's ink in every theme.
  </action>
  <verify>
    <automated>npm test</automated>
    <automated>npm run lint</automated>
    <automated>grep -c 'callouts="compact"' components/summary/order-form.tsx</automated>
    <automated>grep -c "order-form-rocker" app/design/summary/order-form.css</automated>
  </verify>
  <done>
    The suite passes and lint reports no new errors (the 9 pre-existing warnings are in files this
    plan never touches). `callouts="compact"` appears once in the order form.
    `.order-form-rocker`'s block in the CSS is unchanged and still declares its 18% share.
  </done>
  <reversibility rating="reversible">A one-prop change plus a caption note.</reversibility>
</task>

</tasks>

<post_merge_check>
## For the founder, after merge (carry this into the SUMMARY verbatim)

The executor cannot start the dev server inside a worktree, so the printed type size — the one
number this whole plan is built around — can only be confirmed here. Run from the main checkout.

1. `npm run dev`, then open http://localhost:3000/design/summary.
2. The ROCKER box: five numbers above the board, four below it, and nothing below the middle of the
   board (the centre rocker reading is zero by construction and deliberately absent). The caption
   reads `ROCKER` with `Thickness above, rocker below` opposite it. Nothing is clipped by the box,
   and no two numbers touch.
3. Load or dial a 5'0" board, a 6'6" board and a 10'0" board in turn and re-check the box at each.
   The 10'0" board is the tight case: nose tip and nose @ 12" are only a tenth of the board apart,
   and they should sit on separate rows below the board with clear space between every number on a
   row.
4. Print preview (Cmd-P) both pages. Still exactly two pages, same layout, same box position.
   **Measure the printed numbers**: they should read about 9pt — roughly 1/8in cap height on paper —
   and must never look smaller than about 8pt. If they measure smaller, the box model in
   `rocker-view-frame.ts`'s `ORDER_FORM_ROCKER_BOX_PX` is off, and that one constant is where to
   correct it.
5. Print preview in a dark theme (Slate or Phosphor) too — the sheet must still print white with the
   callouts in the sheet's ink.
6. Open http://localhost:3000/design/rocker and confirm the editor screen is completely unchanged:
   the same two card rails, rotate button, construction lines and drag behaviour.
</post_merge_check>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| saved design -> viewer | A stored board's rocker/foil values arrive as numbers this drawing scales its own frame from. |
| design values -> SVG | Every value reaching the DOM is a number formatted by `lib/geometry/units.ts` and written into a JSX attribute. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-VUS-01 | Denial of Service | `rocker-viewer.tsx` deck-envelope derivation | low | mitigate | A corrupt saved design could make the sampled envelope `NaN` or <= 0, which would produce a `NaN` viewBox and blank the ROCKER box on the printed sheet. Task 2 falls back to the worst-case `ROCKER_LIFT_RANGE_IN.max + FOIL_THICKNESS_RANGE_IN.max` constant, mirroring `resolveEffectiveLengthIn`'s existing posture (T-TMJ-02). |
| T-VUS-02 | Tampering | `CompactReading` text | low | accept | Reading text is `formatInchesFraction` output — digits, a space, a slash and an inch mark — bound as a JSX child, never string-built markup and never `dangerouslySetInnerHTML`. Same posture as every other callout in this viewer (T-QO-01). |
| T-VUS-03 | Information Disclosure | printed sheet | low | accept | The compact rails print figures the shaper already owns and already sees on `/design/rocker`; nothing new crosses a boundary. |
| T-VUS-SC | Tampering | package installs | n/a | accept | No package-manager install in this plan — no new dependency is added, so no legitimacy gate applies. |
</threat_model>

<verification>
Run from inside the worktree, in this order:

1. `npx vitest run components/rocker/rocker-view-frame.test.ts` — the frame module's own suite,
   including the new compact geometry, printed-size and separation suites.
2. `npm test` — the whole suite; every pre-existing geometry expectation must stay green, and the
   29 rail-containment tests 260829-uue added must still assert their original numbers.
3. `npm run lint` — no new errors; the 9 known warnings live in files this plan never touches.
4. `npx tsc --noEmit` — no errors beyond the two phantom `LayoutProps` ones a fresh worktree always
   reports for `app/layout.tsx` and `app/design/layout.tsx`.

Do NOT run `npm run build` or `npm run dev` here — Turbopack cannot resolve `next` inside a git
worktree. The orchestrator builds after merge, and the founder's print check above is the real
verification of the printed type size.
</verification>

<success_criteria>
- The order form's ROCKER box draws five thickness readings on the deck side and four rocker
  readings (nose tip, nose @ 12", tail @ 12", tail tip) on the bottom side, with no centre rocker
  reading (D-01, D-02).
- Every number in that box is a bare value with a leader and a 45-degree tick — no card surface and
  no station name — and the reason that grammar was chosen over the card grammar is written into
  `rocker-view-frame.ts` with the box geometry it was derived from (D-03).
- `compactValuePrintPx` is >= 11.9px (9pt) for representative boards and >= 10.67px (8pt) across the
  documented envelope range, both pinned by tests (D-03).
- `.order-form-rocker`'s 18% share and the ROCKER box's position on the sheet are unchanged, and the
  sheet still prints as two pages (D-04).
- `/design/rocker` renders identically to before — the frame module's existing expectations still
  assert their original numbers.
- Every band depth, row baseline, type size and reading x position lives in
  `components/rocker/rocker-view-frame.ts` and is unit-tested; `rocker-viewer.tsx` derives none of
  them (Rule 1).
- All display values still come from `lib/geometry/units.ts`'s `formatInchesFraction`; no new
  25.4 anywhere (Rule 2).
</success_criteria>

<output>
Create `.planning/quick/260829-vus-summary-rocker-window-show-five-thicknes/260829-vus-SUMMARY.md`
when done, following `$HOME/.claude/gsd-core/templates/summary.md`. Carry the founder's post-merge
print check forward into it verbatim — the executor cannot run the dev server in a worktree, so
that checkpoint is the only verification of the printed type size.
</output>
