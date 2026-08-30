---
phase: 260829-rda
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/rocker.ts
  - lib/geometry/rocker.test.ts
  - lib/geometry/foil.ts
  - lib/geometry/board.ts
  - lib/geometry/rocker-drag.ts
  - lib/geometry/rocker-drag.test.ts
  - lib/geometry/presets.ts
  - lib/geometry/presets.test.ts
  - lib/models/design-snapshot.ts
  - lib/models/design-snapshot.test.ts
  - components/rocker/rocker-controls.tsx
  - components/rocker/rocker-datasheet.tsx
  - components/rocker/rocker-viewer.tsx
  - components/rocker/rocker-editor.tsx
  - components/summary/order-form.tsx
autonomous: true
requirements: [QUICK-260829-rda]

estimate:
  tokens: 150000
  raw_tokens: 100000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "The bottom rocker line draws as one continuous, smooth curve from nose tip to tail tip — no corner, kink or straight-then-bend at the 12\" stations, at any control setting the sliders allow."
    - "The rocker curve is generated the same way the board's template (outline) curve is: three points — nose tip, centre, tail tip — joined by two curve segments that meet flat and tangent at the centre."
    - "The nose tip and the tail tip each have an Angle control and a Smoothness control, which behave the way the template's nose/tail angle and fullness controls behave."
    - "The centre has a Nose Flatness and a Tail Flatness control, which behave the way the template's nose-rail and tail-rail (widepoint vector) controls behave — a higher value runs the flat further out from the centre."
    - "The rocker measured 12\" in from the nose and 12\" in from the tail are read off the drawn curve and shown as read-only numbers on the sidebar, the datasheet and the viewer's station rail. A shaper can no longer type or drag them."
    - "Rocker lift is never negative anywhere along the board, and never dips back down toward the centre and up again, for any combination of control values the sliders can reach."
    - "A board saved before this change still opens. Its nose-tip and tail-tip rocker numbers are exactly what they were; its 12\" numbers are now read off the new curve."
    - "The four starting presets (Shortboard, Fish, Mid-length, Longboard) still carry their own distinct rocker, with each preset's nose-tip and tail-tip lift unchanged from today's values."
    - "Dragging the nose tip or the tail tip on the rocker line still moves that tip's lift; dragging any of the five deck points still moves that station's thickness."
  artifacts:
    - lib/geometry/rocker.ts
    - lib/geometry/rocker.test.ts
    - lib/geometry/rocker-drag.ts
    - lib/models/design-snapshot.ts
    - components/rocker/rocker-controls.tsx
    - components/rocker/rocker-datasheet.tsx
    - components/rocker/rocker-viewer.tsx
  key_links:
    - "`lib/geometry/foil.ts` gets its five station POSITIONS from `rocker.ts`. That call currently passes a dummy all-zero `RockerSpec` just to reach the station list. If the replacement station-position helper is not exported and consumed there, the deck curve and the rocker line stop being sampled at the same five stations and the datasheet's columns silently stop lining up with the drawing."
    - "`lib/models/design-snapshot.ts` validates the stored rocker object with a Zod `z.object`, which REQUIRES every declared field. A saved board holds the old four-lift shape. If the schema is simply replaced, every existing saved board throws on parse and becomes unopenable — the rocker field must accept the legacy shape and migrate it."
    - "`ROCKER_LIFT_RANGE_IN` is imported by the sliders, the typed fields AND the drag solver so all three clamp identically. The new angle/smoothness/flatness ranges must be exported from `rocker.ts` the same way and imported everywhere, never restated in a component."
    - "The nose-tip handle must be capped so it can never carry its control point below zero lift (the rocker line's own floor), exactly as `noseHandleMaxLength` in `outline.ts` caps the nose handle against the widepoint. Without that cap a steep angle plus high smoothness draws a board with negative rocker."
---

<objective>
Rebuild how the bottom rocker curve is generated, so it draws like a real shaped rocker instead
of the abrupt, kinked line it draws today.

Today the rocker line is a spline forced through five fixed points — nose tip, nose 12", centre,
tail 12", tail tip — where all four lift values are typed or dragged in by hand. Because the
nose tip and the nose 12" station are only 12" apart while the 12" station and the centre are two
feet or more apart, the curve leaves the tip almost dead straight and then has to turn hard at the
12" mark. That corner is the "abrupt unrealistic curve" the shaper is seeing, and no amount of
re-typing the numbers removes it — it is baked into the model.

The board's template (outline) curve does not have this problem, because it is not forced through
mid-span points. It is three knots — tail pod, widepoint, nose tip — joined by two Bezier segments,
where the two ends carry an ANGLE and a FULLNESS and the widepoint carries a rail-length (vector
strength) per side. This plan gives the rocker exactly that construction, in the shaper's own
words: the same two-segment curve, with the nose and tail carrying an angle and a **smoothness**,
the centre carrying a **flatness** per side, and the 12" stations demoted from inputs to derived,
displayed read-outs.

Purpose: the rocker line is one of the numbers a shaper cuts foam to. It has to look like a rocker
a shaper would actually pull, and the 12" figures have to be measurements OFF that curve, the way
they are measured off a real blank — not numbers that bend the curve to reach them.

Output: a rewritten `lib/geometry/rocker.ts` built on the outline module's own Bezier
construction, with every consumer (deck/foil, drag solve, presets, saved-design loading, the three
ROCKER screen components and the order form's rocker box) moved onto it.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

@lib/geometry/outline.ts
@lib/geometry/rocker.ts
@lib/geometry/foil.ts
@lib/geometry/monotone-spline.ts
@lib/geometry/rocker-drag.ts
@lib/geometry/units.ts
</context>

<planner_assumptions>
Two calls the founder should sanity-check when reviewing:

1. **Axis direction.** The shaper described the curve as "X = 0 at the nose, X = length at the
   tail". This codebase's station axis already runs the other way — station 0 is the tail tip,
   station = length is the nose tip — and four other modules (`foil.ts`, `rocker-drag.ts`,
   `rocker-viewer.tsx`, `order-form.tsx`) already read it that way. A Bezier curve is identical
   under a left-right flip, so the curve the shaper described and the curve built on the existing
   axis are the SAME curve read from opposite ends. This plan keeps the existing axis and
   documents the mapping (`x_shaper = length − station`) in the module header, rather than
   flipping every consumer for a change that alters nothing about the shape.

2. **Old boards' 12" numbers move.** The 12" rocker values stop being stored and start being
   measured off the drawn curve. A board saved before this change keeps its nose-tip and tail-tip
   lift exactly, but its 12" read-outs will shift to whatever the new smooth curve actually
   measures there. That is the point of the fix — but it is a visible change to an already-saved
   board, so it is called out here rather than buried.
</planner_assumptions>

<no_tracer_rationale>
Tracer-first is deliberately not used here (`--no-tracer`). The architecture this plan adopts is
already proven and shipping in this same repo: `outline.ts` (three knots, two Bezier segments,
angle + fullness at the ends, vector strength at the middle) → `outline-drag.ts` (inverse solve)
→ `outline-controls.tsx` / `outline-viewer.tsx` (sliders and direct manipulation). This work
ports a known-good construction onto a second curve; a thin vertical slice would settle no open
architectural question. Task 1 still leads and still carries a real runnable verify, so a bad
curve model is caught before any other file is touched.
</no_tracer_rationale>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Rebuild the rocker curve on the template's own three-knot, two-Bezier construction</name>
  <files>lib/geometry/rocker.ts, lib/geometry/rocker.test.ts, lib/geometry/foil.ts, lib/geometry/board.ts</files>
  <read_first>
`lib/geometry/outline.ts` in full — `buildOutline` is the construction being mirrored, and
`railMult`, `HANDLE_CAP`, `OVERSHOOT`, `noseHandleMaxLength`, `tailHandleMaxLength` and
`MEASURE_STATION_MM` are all already exported from it and must be imported, never restated
(CLAUDE.md Rule 1: one definition per formula). `OutlineGeometry`'s shape — especially
`noseWidthAt12in` / `tailWidthAt12in` — is the shape the new `RockerGeometry` mirrors.
`lib/geometry/foil.ts` lines 60-90 shows the dummy all-zero-spec call into `rockerStationPoints`
that this task deletes.
  </read_first>
  <behavior>
Tests to write in `lib/geometry/rocker.test.ts` BEFORE the implementation. Every expected value is
an invariant or a property — no number is hand-transcribed from anywhere (there is no prototype
ancestor for this curve, so no golden fixture applies).

- Knot interpolation: `buildRocker` sampled at station 0 returns `spec.tailLift`, at station
  `length` returns `spec.noseLift`, at `length / 2` returns exactly zero. Assert across several
  lengths spanning `BOARD_LENGTH_RANGE_IN` (min, 72, max).
- Tangent at each tip matches the spec's angle: the direction from the tip knot to its own first
  control point equals `(cos(angle), ∓sin(angle))` in the curve's own frame, within 1e-6.
- The two segments meet the centre knot flat and tangent: both of the centre's control points sit
  at exactly the centre knot's lift (zero), so the curve is horizontal there and C1 across the
  join. This is the assertion that pins "no kink at the middle".
- No fold-back, over the whole control range: reuse the existing `assertNoFoldBack` helper shape
  from today's test file (lift never decreases as the station moves away from the centre toward
  either tip), run over the all-min, all-max, and default control values, plus a handful of mixed
  extremes (max angle with max smoothness, zero angle with zero smoothness, max flatness with max
  smoothness).
- Lift is never negative at any sampled station, for those same extremes. This is what the nose /
  tail handle caps exist to guarantee.
- Sampled stations ascend and are sorted; `sampleRocker` past either end clamps to that end's lift
  (matching `sampleOutline`'s own past-the-end fallback).
- One definition of the 12" figures: `geometry.noseLiftAt12in` equals
  `sampleRocker(geometry, length − MEASURE_STATION_MM)` and `geometry.tailLiftAt12in` equals
  `sampleRocker(geometry, MEASURE_STATION_MM)`, exactly.
- Control-does-what-its-label-says properties (monotone, no transcribed numbers):
  raising `noseSmoothness` with everything else held never LOWERS `noseLiftAt12in`;
  raising `noseFlatness` with everything else held never RAISES `noseLiftAt12in`;
  and the two tail equivalents. Sweep each control across its range in steps and assert the
  sequence is monotone within a 1e-9 tolerance.
  Deliberately NOT asserted: monotonicity in ANGLE. The nose handle's own length cap shrinks as
  the angle steepens, so angle and handle length pull against each other and the relationship is
  not guaranteed monotone. The tangent-direction assertion above is what pins the angle control.
- `migrateLegacyRocker` carries the legacy `noseTip` / `tailTip` through unchanged, and the spec it
  returns builds a curve that passes the no-fold-back and non-negative assertions.
  </behavior>
  <action>
Rewrite `lib/geometry/rocker.ts` as a mirror of `buildOutline`, keeping its existing header
convention (name the prototype ancestor or state there is none, then a numbered list of deliberate
deviations). Add a new numbered deviation recording that the five-station D-05 model is replaced by
this three-knot curve because forcing the curve through the two 12" stations is what produced the
abrupt kinks the shaper reported, and that the 12" figures are now derived.

Replace `RockerSpec` with eight fields, each doc-commented in shaper language:
`noseLift: Mm` and `tailLift: Mm` (the tip lifts a shaper quotes), `noseAngle: Degrees` and
`tailAngle: Degrees` (how steeply the curve leaves each tip, measured from the flat),
`noseSmoothness: number` and `tailSmoothness: number` (0-100; the outline's "fullness" concept
under the shaper-facing name the founder asked for), `noseFlatness: number` and
`tailFlatness: number` (0-100; the outline's nose-rail / tail-rail vector strength under the
founder's name — how far the flat runs out of the centre toward that end).

Keep `ROCKER_LIFT_RANGE_IN` as it is (it now bounds the two tips only). Add
`ROCKER_ANGLE_RANGE_DEG = { min: 0, max: 60, step: 1 }`,
`ROCKER_SMOOTHNESS_RANGE = { min: 0, max: 100, step: 0.5 }` and
`ROCKER_FLATNESS_RANGE = { min: 0, max: 100, step: 0.5 }`, exported for the sliders, the drag
solver and the typed fields to share — the same one-definition posture `ROCKER_LIFT_RANGE_IN`
already has.

Add `buildRocker(spec, length): RockerGeometry`, constructed exactly as `buildOutline` constructs
the outline, with lift standing where half-width stands:

- Three knots on the existing station axis: tail tip at `(0, tailLift)`, centre at
  `(length / 2, 0)`, nose tip at `(length, noseLift)`.
- The centre's tangent is purely along the station axis, `{ x: 1, y: 0 }` — the same choice
  `buildOutline` makes at the widepoint, and the reason the curve reads flat and kink-free through
  the middle.
- Each tip's angle becomes a tangent DIRECTION, not a slope, for the same reason
  `buildOutline` gives at its own `tailRad` / `noseRad`: a parametric handle can point exactly
  along the flat without an infinite-slope problem.
- The centre's two handle lengths come from `railMult(flatness) * HANDLE_CAP * chord` for that
  side, importing `railMult` and `HANDLE_CAP` from `./outline`. Because the centre tangent has no
  lift component, a longer handle can never carry the curve below zero or above a tip — the same
  argument `buildOutline` records for the widepoint, so no cap is needed on this side.
- Each tip's handle length is `(smoothness / 100) * max`, where `max` caps the handle so its
  control point can never fall below zero lift: `min(HANDLE_CAP * chord, OVERSHOOT * tipLift /
  sin(angle))`, guarding a near-zero `sin` with the existing `EPSILON` posture. Write this as one
  small exported helper (`rockerTipHandleMaxLength`) so the drag solver and the tests can reach the
  same cap, mirroring how `outline.ts` exports `noseHandleMaxLength` / `tailHandleMaxLength`.
- Sample both segments at the same density `outline.ts` uses, clamp every sampled lift to be at
  least zero, and sort by station ascending.

`RockerGeometry` mirrors `OutlineGeometry`: `length`, the three `knots` (point + tangent), the four
construction `handles`, the two `segments` as `BezierSegment`s, the sampled `points` (a new
`RockerPoint { station: Mm; lift: Mm }` declared in this module, since board.ts's header already
says rocker types live here), and the two derived figures `noseLiftAt12in` / `tailLiftAt12in`,
named after `OutlineGeometry`'s own `noseWidthAt12in` / `tailWidthAt12in` and computed by
interpolating the sampled points at `MEASURE_STATION_MM` from each end.

Change `sampleRocker` to take the geometry, not the spec: `sampleRocker(geometry, station): Mm`,
matching `sampleOutline(geometry, station)` exactly.

Replace `rockerStationPoints(spec, length)` with `rockerStationPositions(length)`, returning just
`{ key, station }` for the five named stations. It no longer needs a spec at all, because the lifts
are no longer stored per station — which also deletes `foil.ts`'s dummy all-zero-spec call. Update
`foilStationPoints` in `lib/geometry/foil.ts` to call it, and delete the comment explaining the
dummy spec, since the workaround it explains is gone.

Add `migrateLegacyRocker(legacy: { noseTip: number; nose12: number; tail12: number; tailTip: number }): RockerSpec`
for the saved-design path (Task 2 consumes it). It carries `noseTip` to `noseLift` and `tailTip` to
`tailLift` and takes the six shape controls from `DEFAULT_ROCKER_SPEC`. Doc-comment it plainly:
the two 12" numbers are dropped because they are now measured off the curve, so an old board keeps
its tip rockers exactly and gets new 12" figures.

Retune `DEFAULT_ROCKER_SPEC`: keep `noseLift` at 4 1/2" and `tailLift` at 2" (today's values, which
came from the prototype's own side-profile numbers — leave that provenance note in place), and
choose the six shape controls so that on the default 72" board the derived 12" figures land within
1/4" of today's stored figures (nose 1 1/4", tail 3/8"). Record the values you actually land on in a
comment beside the constant. If a natural, smooth curve cannot reach one of them, prefer the smooth
curve and say so in the comment — the whole point of this change is that the curve stops being bent
to hit those two numbers.

`lib/geometry/board.ts` needs no structural change beyond confirming it still compiles against the
new `RockerSpec` (it imports the type and `DEFAULT_ROCKER_SPEC` rather than redeclaring them);
refresh its header note about the five-station D-05 model so it describes what the code now does.
  </action>
  <verify>
    <automated>npm test -- lib/geometry/rocker.test.ts lib/geometry/foil.test.ts lib/geometry/monotone-spline.test.ts</automated>
  </verify>
  <done>The rocker test suite passes. `sampleRocker` takes a `RockerGeometry`. The curve is horizontal at the centre by construction, never negative, never folds back, and its two 12" figures are read off the sampled curve. `foil.ts` no longer builds a throwaway spec to find the station positions. The wider suite is expected to be red until Task 2 — nothing else has been moved onto the new API yet.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Move the drag solve, the presets and saved-design loading onto the new curve</name>
  <files>lib/geometry/rocker-drag.ts, lib/geometry/rocker-drag.test.ts, lib/geometry/presets.ts, lib/geometry/presets.test.ts, lib/models/design-snapshot.ts, lib/models/design-snapshot.test.ts</files>
  <read_first>
`lib/geometry/rocker-drag.ts` in full (its two governing rules and the nine-grab-point comment both
need rewriting). `lib/models/design-snapshot.ts` lines 1-100 and 140-230 — the module header's rule
2 explains the version-tolerance mechanism this task extends, and `designFieldsSchema`'s
non-recursive `.partial()` is why a present-but-legacy rocker object would otherwise throw.
`lib/geometry/presets.ts` lines 1-60 for the D-12 tuning-status note that needs updating alongside
the four rocker blocks.
  </read_first>
  <behavior>
- `rocker-drag.test.ts`: the rocker curve now offers exactly TWO grab points (nose tip, tail tip)
  and the deck still offers five, so `sideProfileDragPoints` returns seven. Round-trip property,
  as today: drag a rocker tip to an arbitrary height, solve, rebuild the geometry, and the tip
  lands at the dragged height snapped to `ROCKER_LIFT_RANGE_IN.step` and clamped to its bounds.
  Same round trip for a deck point, where the solved thickness plus the rocker lift sampled at that
  station returns the dragged height. A non-finite dragged height falls back to the minimum, as
  today.
- `presets.test.ts`: for every preset at its own length, sweep the built curve and assert no
  fold-back, no negative lift, and that each preset's derived 12" lift sits strictly between zero
  and that end's own tip lift — invariants, not transcribed numbers.
- `design-snapshot.test.ts`: a snapshot written under the OLD version carrying the legacy
  four-lift rocker object parses without throwing, keeps its `noseTip` as `noseLift` and its
  `tailTip` as `tailLift`, and yields a spec whose six shape controls equal
  `DEFAULT_ROCKER_SPEC`'s. A snapshot with no rocker field at all still backfills from
  `DEFAULT_ROCKER_SPEC`. A current-shape snapshot round-trips through
  `buildSnapshot`/`parseSnapshot` unchanged. Update `DISTINCT_ROCKER` to the new eight-field
  shape, routing every millimetre value through `mm()` / `inchesToMm()`.
  </behavior>
  <action>
**`lib/geometry/rocker-drag.ts`.** The rocker line now has one grabbable point per end, because the
two 12" stations are derived and the centre is the fixed zero. Narrow `SideProfileDragTarget` into
a discriminated union so an unreachable target cannot be constructed at all:
`{ curve: "rocker"; station: "noseTip" | "tailTip" } | { curve: "deck"; station: FoilStationKey }`.
Change both exported functions to take a `RockerGeometry` where they took a `RockerSpec`, since a
deck drag needs the rocker lift sampled at its station and that now comes off the built curve:
`sideProfileDragPoints(geometry, foil, length)` and `solveSideProfileDrag(target, dragged, geometry,
foil, length)`. The rocker branch returns `{ rocker: { noseLift } }` or `{ rocker: { tailLift } }`;
the deck branch is unchanged except that the lift beneath comes from `sampleRocker(geometry,
station)` rather than a stored station lift. Rewrite the header's "nine grabbable points" paragraph
and the "five stations are fixed by D-05" paragraph — the rocker line's remaining degree of freedom
at each tip is still exactly one (the height; the station coordinate is still discarded), but the
reason is now that a tip knot's station is fixed by the board's own ends, not by D-05.

**`lib/geometry/presets.ts`.** Convert all four presets' `rocker` blocks to the new eight-field
shape. Hold each preset's existing `noseTip` and `tailTip` values exactly as they are today — those
are the numbers that distinguish the four boards and a shaper reads them directly. Start each
preset's six shape controls from `DEFAULT_ROCKER_SPEC`'s tuned values, then adjust only where a
derived 12" figure lands more than 1/4" from that preset's existing stored 12" number, and record
the derived figures you land on in a comment inside each block. Where a smooth curve genuinely
cannot reach the old number, keep the smooth curve and note it — do not bend the curve to the
number. Update the D-12 tuning-status note in the file header to say the rocker blocks were
re-expressed on the new curve model by this task and are still awaiting the founder's review in the
live ROCKER editor.

**`lib/models/design-snapshot.ts`.** This is the one place an already-saved board can break, so it
gets the most care. Keep the existing `rockerSpecSchema` shape under the name
`legacyRockerSpecSchema` (the four lift fields), add the new eight-field `rockerSpecSchema`, and
make the `rocker` field in `designFieldsSchema` a `z.union([rockerSpecSchema,
legacyRockerSpecSchema])`. The two shapes have no field in common that the other also requires, so
the union is unambiguous in either order; put the current shape first so today's saves take the
fast path. In `parseSnapshot`, when the parsed rocker matches the legacy shape (detect it by the
presence of `nose12`), run it through `migrateLegacyRocker` from `lib/geometry/rocker.ts` — the
migration itself is geometry and belongs there, not here. Bump `DESIGN_SNAPSHOT_VERSION` from 2 to
3 and extend the header's rule-2 paragraph with what version 3 tolerates and why: a version-2
snapshot's rocker is a different SHAPE, not merely a missing field, which is the first time this
boundary has had to migrate rather than backfill.
  </action>
  <verify>
    <automated>npm test</automated>
  </verify>
  <done>The whole vitest suite is green. A rocker drag offers exactly the two tips; a deck drag still offers five stations and still round-trips. All four presets build a smooth, non-negative rocker at their own lengths with their tip lifts unchanged. A legacy four-lift snapshot parses, keeps its tip rockers and gains the default shape controls; a snapshot with no rocker at all still backfills.</done>
</task>

<task type="auto">
  <name>Task 3: Give the shaper the new controls and show the 12" figures as measurements</name>
  <files>components/rocker/rocker-controls.tsx, components/rocker/rocker-datasheet.tsx, components/rocker/rocker-viewer.tsx, components/rocker/rocker-editor.tsx, components/summary/order-form.tsx</files>
  <read_first>
`components/outline/outline-controls.tsx` around lines 210-240 and 380-400 — the angle sliders'
own label and `displayValue={`${outline.noseAngle}°`}` treatment, and the fullness / rail-length
sliders beside them, are the house style these new controls copy. `components/rocker/
rocker-viewer.tsx` lines 150-300 for the sampling loop, the `stations` read-out array and the drag
wiring. `components/summary/order-form.tsx` around lines 330-345 for the two rocker tick call sites.
  </read_first>
  <action>
**`rocker-controls.tsx`.** Replace the four rocker-lift sliders with eight, in nose-to-tail reading
order so the sidebar matches the datasheet's own column order: Nose Rocker (the tip lift), Nose
Angle, Nose Smoothness, Nose Flatness, Tail Flatness, Tail Smoothness, Tail Angle, Tail Rocker.
Plain shaper labels, values in inches through `formatInchesFraction` for the two lifts and in
degrees for the two angles, following `outline-controls.tsx`'s own angle label treatment. Bounds
and steps come from the constants exported by `rocker.ts` — `ROCKER_LIFT_RANGE_IN`,
`ROCKER_ANGLE_RANGE_DEG`, `ROCKER_SMOOTHNESS_RANGE`, `ROCKER_FLATNESS_RANGE` — never restated here.
Keep the existing per-slider written-out markup rather than factoring a wrapper, matching the note
already in this file's header.

Under those eight, add a small read-only pair showing the derived figures — nose 12" and tail 12" —
in the muted style the group's existing explanatory line already uses, so a shaper sees the two
standard numbers without being able to force them. Take them from a `RockerGeometry` the component
receives as a prop (built once by the editor), not by rebuilding the curve here. Rewrite the group's
explanatory line to say, in plain English, that rocker is measured up from a flat surface with the
board bottom-down, that the centre is the zero it is measured against, and that the 12" figures are
measured off the drawn curve rather than set by hand.

The Thickness group and its five sliders are untouched.

**`rocker-datasheet.tsx`.** In the Rocker row, the Nose Tip and Tail Tip cells stay typed
`ImperialField`s writing `noseLift` / `tailLift`; the Nose @ 12" and Tail @ 12" cells become
read-only derived text in the same muted style the Width row already uses, reading
`geometry.noseLiftAt12in` / `geometry.tailLiftAt12in`; the Center cell stays the read-only zero.
Take the geometry as a prop. Replace `rockerStationPoints` with `rockerStationPositions(length)` for
the Width row's station lookup. Update the file header — width and the two 12" rockers are now both
derived-and-never-typed, so the D-07 paragraph should say so.

**`rocker-viewer.tsx`.** Build the geometry once per render (`buildRocker(rocker, length)`) and use
it for everything: the bottom-curve sampling loop calls `sampleRocker(geometry, stationMm)`, the
deck loop stacks thickness on that same sampled lift, and the `stations` read-out array takes its
tip values from `rocker.noseLift` / `rocker.tailLift` and its two 12" values from
`geometry.noseLiftAt12in` / `geometry.tailLiftAt12in`. Pass the geometry into
`sideProfileDragPoints` / `solveSideProfileDrag`; the rocker line now shows two grab targets
instead of four, so update the prop doc-comment that promises nine. Out of scope, deliberately:
drawing the new Bezier construction handles as an overlay — the existing construction affordance
(station lines plus grab targets) stays exactly as it is.

**`rocker-editor.tsx`.** Build the geometry once and pass it to the controls, the datasheet and the
viewer, so the curve is derived in exactly one place per render. Update
`buildRockerPresetSource` to emit the new eight fields in the same authored-through-`inchesToMm()`
form the presets file uses, so the dev-only capture affordance still round-trips into
`presets.ts`.

**`order-form.tsx`.** The two rocker tick call sites read `rocker.noseTip` / `rocker.tailTip`;
point them at `rocker.noseLift` / `rocker.tailLift`. Nothing else on the order form changes — the
rocker box renders through `RockerViewer`, which Task 3 has already moved over.
  </action>
  <verify>
    <automated>npm test && npm run lint</automated>
    <automated>npx tsc --noEmit</automated>
    <human-check>
Run `npm run dev` and open http://localhost:3000/design/rocker.

1. The bottom (rocker) line should read as one continuous curve from nose to tail with no corner
   anywhere along it — in particular, no visible bend a foot in from either tip, which is what it
   does today.
2. Drag Nose Angle from one end of its range to the other. The nose should roll up steeper or
   flatter smoothly; the line should never dip below the flat baseline and never turn back down
   toward the nose.
3. Drag Nose Smoothness across its range — the nose lift should carry further out toward the tip
   (a fuller entry) or pull in tighter, without a kink appearing.
4. Drag Nose Flatness and Tail Flatness up — the flat should run further out from the centre before
   the curve starts to lift.
5. Watch the derived Nose @ 12" and Tail @ 12" figures in the sidebar, on the datasheet and on the
   viewer's station rail: all three should show the same number and it should change as you move
   the controls. None of the three should be typeable or draggable.
6. Grab the nose tip and the tail tip on the drawing and drag them — the lift should follow. Grab
   any of the five deck points — the thickness should follow, riding on the rocker line.
7. Apply each of the four presets from the home screen and check each still has a plausible,
   distinct rocker.
8. Open a board saved before today from the rack — it should open without an error and keep its
   nose and tail tip rocker numbers.
    </human-check>
  </verify>
  <done>The ROCKER screen offers Nose/Tail Rocker, Angle, Smoothness and Flatness; the two 12" figures appear as read-only measurements in all three places and agree with each other; the drawn rocker line is smooth end to end; the drag targets are the two tips plus the five deck points; the order form's rocker box still draws. `npm test` and `npm run lint` pass. If `npx tsc --noEmit` fails only on missing Next-generated types (`next-env.d.ts` is gitignored and absent in a fresh worktree), record that in the summary and treat the other two commands as the gate — do not run `npm run build`, which cannot resolve `next` from a worktree.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| stored snapshot → `parseSnapshot` | A saved design row is JSON from the database; its shape is whatever an older version of this app wrote, and it is the only untrusted input in this change. |
| slider / typed field / drag → geometry | Shaper-supplied numbers reach the curve builder. A non-finite or out-of-range value drawn straight into an SVG path blanks the whole board drawing. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-rda-01 | Denial of Service | `lib/models/design-snapshot.ts` `parseSnapshot` | high | mitigate | The rocker field accepts BOTH the new and the legacy shape via `z.union` and migrates the legacy one through `migrateLegacyRocker`. Without this, every board saved before today throws on parse and becomes permanently unopenable. Covered by the legacy-snapshot test in Task 2. |
| T-rda-02 | Denial of Service | `buildRocker` / `sampleRocker` | medium | mitigate | A non-finite station or control value must not propagate a not-a-number through every sampled point and blank the drawing. Keep the existing posture already documented for this codebase (threat T-04-02 in `monotone-spline.ts`, `quantise` in `rocker-drag.ts`): guard non-finite input at the boundary and fall back to a defined value rather than propagating. |
| T-rda-03 | Tampering | stored rocker values → `buildRocker` | low | mitigate | A hand-edited snapshot could carry an angle, smoothness or flatness far outside its slider range. The handle-length caps (`rockerTipHandleMaxLength`, `HANDLE_CAP`) and the clamp of every sampled lift to at least zero bound the drawn curve regardless of the input values, so an absurd stored value produces a poor board, never a broken or negative-rocker drawing. |
| T-rda-04 | Information Disclosure | — | low | accept | No new data leaves the browser and no new field is added to the database row; the snapshot's shape changes but its contents are still only the shaper's own board numbers. |
</threat_model>

<verification>
- `npm test` — every geometry suite green, including the rewritten rocker suite and the legacy
  snapshot migration.
- `npm run lint` — clean.
- `npx tsc --noEmit` — clean, or failing only on Next-generated types absent from a worktree.
- The human check in Task 3 — the shaper's own eyes on the curve, which is the only check that can
  confirm the abrupt bend is actually gone.
- Do NOT run `npm run build` from a worktree; the orchestrator builds after merge.
</verification>

<success_criteria>
- The rocker line draws as one smooth curve nose to tail, with no corner at the 12" stations, at
  every control setting the sliders allow.
- Nose and tail each carry an Angle and a Smoothness; the centre carries a Nose Flatness and a Tail
  Flatness; each control visibly does what its label says.
- The 12" rocker figures are derived from the drawn curve and shown read-only in the sidebar, the
  datasheet and the viewer's station rail, all three agreeing.
- Rocker lift is never negative and never folds back, proven by test across the whole control range.
- A board saved before this change opens, keeping its nose-tip and tail-tip rocker exactly.
- All four presets still carry a distinct, plausible rocker with their tip lifts unchanged.
- Every formula lives in `lib/geometry/`, every exported function is unit-tested, and the outline
  module's existing `railMult` / `HANDLE_CAP` / `OVERSHOOT` / `MEASURE_STATION_MM` are imported
  rather than restated.
</success_criteria>

<output>
Create `.planning/quick/260829-rda-fix-bottom-rocker-curve-template-style-g/260829-rda-SUMMARY.md` when done.
</output>
