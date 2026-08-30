---
phase: 260829-snm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/rocker-drag.ts
  - lib/geometry/rocker-drag.test.ts
  - components/rocker/rocker-viewer.tsx
  - components/rocker/rocker-editor.tsx
autonomous: true
requirements: [QUICK-260829-snm]

estimate:
  tokens: 70000
  raw_tokens: 45000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "With Show construction lines on, the ROCKER screen draws the same construction skeleton the TEMPLATE screen draws: a straight line out of each of the curve's points toward the handle that steers the curve there, in the accent colour, at a constant on-screen thickness whatever size the window is."
    - "There are four such lines — one out of the tail tip, one out of the nose tip, and one out of the centre toward each end — because the rocker curve is two curve segments joined at the centre, and each segment has a steering handle at both of its ends."
    - "Each construction line ends in a small plain dot, and the centre point of the curve carries a plain dot too. A plain dot means 'this shows you the shape, you cannot grab it'; only the round three-part targets can be dragged, exactly as on the TEMPLATE screen."
    - "The only two grab targets left on the side profile are the nose tip and the tail tip of the rocker line. Dragging either still sets that tip's rocker, snapped to the same sixteenth-inch steps its slider uses."
    - "The five thickness (deck) grab points are gone from the drawing entirely — nothing is drawn on the deck curve and nothing on it responds to a pointer."
    - "Thickness is still fully editable from the five Thickness sliders in the sidebar, and those sliders still move the deck curve on the drawing."
    - "Turning Show construction lines off leaves the drawing exactly as it is today: board shape, baseline, station ticks, output rail — no lines, no dots, no targets."
    - "The construction overlay draws correctly in both the horizontal (nose left) and vertical (nose up) orientations, and dragging a tip works in both."
  artifacts:
    - "lib/geometry/rocker-drag.ts — reduced to the two rocker tips; no deck/foil solve path remains"
    - "lib/geometry/rocker-drag.test.ts — deck suites removed, tip suites updated to the reduced signatures, all green"
    - "components/rocker/rocker-viewer.tsx — construction lines + plain dots drawn from geometry.handles / geometry.knots"
    - "components/rocker/rocker-editor.tsx — drag patch wired straight to updateRocker"
  key_links:
    - "buildRocker's already-exported knots and handles are the ONLY source of the overlay's coordinates — the viewer reads them, it never recomputes a control point (Rule 1)"
    - "RockerHandle.from/to are Point2D in board space where x is the station and y is the lift, so they project through the viewer's existing pxX/pxY exactly like every other drawn element"
    - "The whole overlay lives inside the one rotated content group, so it inherits both orientations for free"
    - "onDrag's patch type and design-store's updateRocker signature must line up so the editor can pass the mutator directly"
---

<objective>
Give the ROCKER screen the same construction-line overlay the TEMPLATE screen already has, and
take the five thickness grab points off the side-profile drawing.

Purpose: a shaper tuning Angle, Smoothness and Flatness is currently steering a curve whose
steering geometry is invisible. The TEMPLATE screen solved this already — it draws the lines from
each curve point out to the handle that bends the curve there. The rocker curve was rebuilt on
that exact construction yesterday (260829-rda) and already returns its `knots` and `handles`, so
this is a drawing job, not a maths job. At the same time the five deck (thickness) grab points go:
they crowd the drawing, they are not construction geometry, and the five Thickness sliders in the
sidebar already do that job.

Output: four construction lines plus their plain marker dots on the rocker curve, two remaining
drag targets (the nose and tail tips), and a `rocker-drag.ts` with no deck path left in it.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@lib/geometry/rocker-drag.ts
@lib/geometry/rocker-drag.test.ts
@components/rocker/rocker-viewer.tsx
@components/rocker/rocker-editor.tsx
</context>

<planner_findings>
Read before starting — these were verified against the code while planning, so you do not need to
rediscover them.

**The geometry already exists. Do not add any.**
`buildRocker` in `lib/geometry/rocker.ts` already returns everything the overlay needs:

- `knots: [RockerKnot, RockerKnot, RockerKnot]` — index `0` is the **tail tip** (station 0),
  index `1` is the **centre** (station = length/2, lift 0, the fixed zero), index `2` is the
  **nose tip** (station = length). Confirmed at `buildRocker`'s `knotPoints = [P0, P2, P4]`.
- `handles: RockerHandle[]` — exactly **four**, built in this order: segment 0's start handle
  (out of the tail tip), segment 0's end handle (out of the centre toward the tail side),
  segment 1's start handle (out of the centre toward the nose side), segment 1's end handle
  (out of the nose tip).
- `RockerKnot.point` and `RockerHandle.from`/`.to` are both `Point2D` in **board space**, where
  **`x` is the station and `y` is the lift**, both `Mm`.

So a handle projects into the viewer's existing canonical space as:
`x1 = pxX(mmToInches(h.from.x))`, `y1 = pxY(mmToInches(h.from.y))`, and the same for `h.to`.
No new exported function, no new formula, nothing new under `lib/geometry/` for the drawing.

**Every construction point is inside the existing frame — no clamping needed.**
Checked numerically: `railMult(pct) = 0.8 + (pct/100)*0.8` peaks at 1.6 and `HANDLE_CAP = 0.48`,
so a centre-side handle is at most `0.768 * chord` long and its endpoint stays past station
~0.12*length. A tip-side handle is capped at `HANDLE_CAP * chord`, so its endpoint stays inside
the middle of the board. On the lift axis every control point sits between 0 and its own tip's
lift, because `rockerTipHandleMaxLength` caps it there. The frame's own top is
`ROCKER_LIFT_RANGE_IN.max + FOIL_THICKNESS_RANGE_IN.max`, comfortably above.

**The deck grab path is self-contained.**
`foilStationPoints` is also used by `lib/geometry/volume.ts` and `lib/geometry/foil.test.ts` —
leave `foil.ts` completely alone. Only `rocker-drag.ts`'s own import of it goes.

**`updateRocker` already has the right signature.**
`components/design/design-store.tsx` line 187: `updateRocker: (patch: Partial<RockerSpec>) => void`.
Once the drag solver returns a bare `Partial<RockerSpec>`, the editor can pass `updateRocker`
straight through as `onDrag` and its `handleViewerDrag` splitter is deleted rather than trimmed.

**The overlay grammar to mirror, from `components/outline/outline-viewer.tsx`:**

- lines from `geometry.handles`: `stroke="var(--outline-construction)"`, `strokeWidth={1.5}`
- plain, non-grabbable markers: `r={KNOT_DOT_PX * handleUnit}`, `fill="var(--outline-ink)"`,
  with `const KNOT_DOT_PX = 3`
- grabbable targets: the three-part disc already present in `rocker-viewer.tsx`
  (`DRAG_TARGET_OUTER_PX` / `DRAG_TARGET_RING_PX` / `DRAG_TARGET_CORE_PX`), unchanged
- draw order: lines, then plain dots, then targets, then the transparent hit circles last
- `handleUnit` (`1 / fitScale`) is what holds every one of those at a constant on-screen size;
  `rocker-viewer.tsx` already computes it

**Grammar inversion worth noticing.** On the TEMPLATE screen the fixed knots are the two ends
(`FIXED_KNOT_INDICES = [0, 2]`) and the middle moves. On the ROCKER screen it is the opposite:
the two tips are the grabbable ones and the **centre** is the fixed zero. So the plain-dot knot
index here is `[1]`, not `[0, 2]`.
</planner_findings>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Reduce the side-profile drag solve to the two rocker tips</name>
  <files>lib/geometry/rocker-drag.ts, lib/geometry/rocker-drag.test.ts</files>
  <read_first>lib/geometry/outline-drag.ts (for its `OutlineDragTarget` shape — a plain string union, which is what this module's target type collapses to), lib/geometry/rocker.ts lines 155-330 (`rockerTipHandleMaxLength`, `RockerGeometry`, `buildRocker`)</read_first>
  <behavior>
    Write these as failing tests first, against the new signatures, then make them pass.

    - `sideProfileDragPoints(buildRocker(spec, length))` returns exactly **2** entries for every
      board length across the legal range (check 60", 90", 120"), with targets `"tailTip"` and
      `"noseTip"` and nothing else.
    - Each returned point equals the geometry's own tip knot: entry for `"tailTip"` has
      `station === geometry.knots[0].point.x` and `height === geometry.knots[0].point.y`; entry
      for `"noseTip"` matches `geometry.knots[2].point` the same way. This is the test that pins
      the overlay and the drag targets to one shared source.
    - Round trip, both tips: take the current tip point, drag it 0.75" higher, solve, merge the
      patch into the spec, rebuild, and the tip lands at the solved (snapped, clamped) height.
    - Every solved value is slider-representable: dragging to an awkward height like 3.1234"
      returns a value that is an exact multiple of `ROCKER_LIFT_RANGE_IN.step` and lies within
      `[ROCKER_LIFT_RANGE_IN.min, ROCKER_LIFT_RANGE_IN.max]`.
    - Non-finite drag height returns `ROCKER_LIFT_RANGE_IN.min`.
    - A solved patch carries exactly one key — `noseLift` for the nose tip, `tailLift` for the
      tail tip — and never any other field.
  </behavior>
  <action>
    Reduce this module to the rocker line's own two tips. Four changes, all removals or narrowings:

    1. **Target type.** `SideProfileDragTarget` becomes the plain string union `"noseTip" | "tailTip"`,
       mirroring `outline-drag.ts`'s `OutlineDragTarget`. The discriminated-union wrapper carried
       one live variant plus one that is going away, so once the second variant is gone the
       discriminant can never be false and is dead weight — collapse it rather than leaving a
       one-member union behind.

    2. **`sideProfileDragPoints`.** New signature `sideProfileDragPoints(geometry: RockerGeometry):
       SideProfileDragPointAt[]`. Read the two points straight off `geometry.knots[0]` (tail tip)
       and `geometry.knots[2]` (nose tip) — `knot.point.x` is the station, `knot.point.y` is the
       lift. The `foil` and `length` parameters go; so does the station lookup and the curve
       sampling, both of which existed only to place deck points. Sourcing from the knots (rather
       than re-deriving a station and sampling the curve) is what guarantees the grab targets sit
       on the same points Task 2 hangs the construction lines off.

    3. **`solveSideProfileDrag`.** New signature `solveSideProfileDrag(target: SideProfileDragTarget,
       dragged: SideProfileDragPoint): Partial<RockerSpec>`. The `geometry`, `foil` and `length`
       parameters were read only by the removed branch. Return the bare partial spec, not a
       wrapper object with an optional second key — with one curve left there is nothing to
       disambiguate, and the caller in Task 2 can then hand it to a store mutator unchanged.

    4. **Limits.** Fold the two-key limits table away: have `quantise` take `ROCKER_LIFT_RANGE_IN`
       directly and delete the wrapper constant this module re-exported. Rule 1 of the module's
       own header (one definition per formula) is better served by importing the range from
       `rocker.ts` at the single call site than by re-exporting it under a second name. Update
       `lib/geometry/rocker-drag.test.ts` to assert against `ROCKER_LIFT_RANGE_IN`, which it
       already imports.

    Then rewrite the module header so it describes the module as it now stands — two grabbable
    points, one per tip, each with one degree of freedom (the height; the station coordinate of a
    drag is still discarded because a tip's station is fixed by the board's own end). Do not leave
    prose describing the removed path as though it were still there.

    In the test file, delete the deck round-trip suite, the deck slider-representable case, the
    deck below-the-rocker-line clamp case, the deck non-finite case and the deck
    only-one-station case, along with the `ALL_STATIONS` list and the now-unused foil imports
    (`FOIL_THICKNESS_RANGE_IN`, `FoilSpec`, `FoilStationKey`) and the `curve` argument threaded
    through the local `findPoint` helper. `FOIL`/`DEFAULT_BOARD_SPEC.foil` are no longer needed
    by any surviving case.
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/rocker-drag.test.ts lib/geometry/rocker.test.ts && ! (cat lib/geometry/rocker-drag.ts lib/geometry/rocker-drag.test.ts | grep -v '^[[:space:]]*[*/]' | grep -q '[Ff]oil')</automated>
  </verify>
  <done>
    Both suites pass, and no executable line in either file references the foil layer any more —
    the second gate strips comment lines (`*`, `//`, `/*`) before it looks, so explaining the
    removal in the module header cannot make the gate lie about the code.
  </done>
</task>

<task type="auto">
  <name>Task 2: Draw the construction overlay on the rocker curve and drop the deck grab points</name>
  <files>components/rocker/rocker-viewer.tsx, components/rocker/rocker-editor.tsx</files>
  <read_first>components/outline/outline-viewer.tsx lines 60-90 (the sizing constants and their rationale) and lines 318-358 and 588-637 (how it assembles and draws the overlay) — reuse those exact tokens, widths and draw order rather than choosing new ones</read_first>
  <action>
    **`components/rocker/rocker-viewer.tsx`**

    Take the new drag signatures from Task 1 first, so the file compiles as you go: `onDrag` becomes
    `(patch: Partial<RockerSpec>) => void`; the `dragTargets` build calls `sideProfileDragPoints(geometry)`
    and maps `cx = pxX(mmToInches(d.point.station))`, `cy = pxY(mmToInches(d.point.height))`;
    `handleDragMove` calls `solveSideProfileDrag(draggingRef.current, boardPoint)` and passes the
    result to `onDrag` unchanged. The React keys on the target and hit circles lose the curve
    segment they used to carry, since a target is now just a tip name.

    Then build the overlay, above the existing `showConstruction` render block, in the same
    canonical space `pxX`/`pxY` already draw everything else in:

    - `constructionLines` from `geometry.handles` — one entry per handle, `x1/y1` from `h.from`
      and `x2/y2` from `h.to`, each `Point2D` projected as `pxX(mmToInches(p.x))` /
      `pxY(mmToInches(p.y))`. There will be four.
    - `constructionDots` — the centre knot (`geometry.knots[1]`, the curve's fixed zero) plus
      each handle's `to` endpoint, so every line has a visible terminus and the point the flat
      pivots around is marked.

    Add `const KNOT_DOT_PX = 3` beside the existing drag-target sizing constants, carrying the
    same reasoning the neighbours already state: a marker is a drawing affordance, not board
    geometry, so it holds a constant on-screen size and is divided by the live fit scale
    (`handleUnit`) at render.

    Render inside the existing `showConstruction` block, in this order so nothing hides anything
    it should not: the station lines that are already there, then the construction lines
    (`stroke="var(--outline-construction)"`, `strokeWidth={1.5}`), then the plain dots
    (`r={KNOT_DOT_PX * handleUnit}`, `fill="var(--outline-ink)"`), then the existing three-part
    drag targets, then the existing transparent hit circles last. The whole block already sits
    inside the one rotated content group, so both orientations come for free — do not add a
    second code path for vertical.

    Keep the faint full-height station lines. They no longer mark grab points, but they still mark
    the five measured stations the output rail reads out. Rewrite the sentence justifying them so
    it says that, rather than describing points that no longer exist.

    Two prop doc-comments also describe a count that changes: `showConstruction`'s and `onDrag`'s.
    Restate them against what the overlay now contains, and correct the module header's paragraph
    on construction-line dragging the same way. The header's claim that the Summary order form is
    unaffected still holds and should stay — that consumer passes no `onDrag`, so it draws no
    targets either way.

    **`components/rocker/rocker-editor.tsx`**

    Delete `handleViewerDrag` outright and pass `onDrag={updateRocker}`. It exists only to split a
    two-key patch between two mutators, and after Task 1 there is one key and one mutator.
    `updateFoil` stays — `RockerControls` still uses it for the Thickness sliders, which are now
    the only way to set thickness. Correct the two doc-comments that state how many targets the
    viewer reveals (the module header and the `showConstruction` state declaration).
  </action>
  <verify>
    <automated>npm test && npm run lint && ! (cat components/rocker/rocker-viewer.tsx components/rocker/rocker-editor.tsx | grep -v '^[[:space:]]*[*/]' | grep -q 'handleViewerDrag')</automated>
    <human-check>
      Cannot be run by the executor: `npm run dev` fails inside a git worktree with the Turbopack
      symlink error 260829-rda recorded. Record it as pending for the post-merge browser pass,
      in the shaper's own review cadence:
      1. Open /design/rocker and press the construction-lines button in the viewer toolbar.
      2. Four accent lines appear on the bottom curve — one out of each tip, two out of the
         centre — each ending in a small dot, with a dot on the centre point too.
      3. Only the nose tip and the tail tip carry a round grab target. Nothing is drawn on the
         deck curve above, and nothing up there responds to a drag.
      4. Move Nose Angle, Nose Smoothness and Nose Flatness in turn: the lines swing and stretch
         with the curve and stay attached to it.
      5. Drag each tip: the curve follows, the tip's slider follows, and the number lands on a
         sixteenth.
      6. Move each of the five Thickness sliders: the deck curve still moves.
      7. Press the rotate button and repeat 2, 3 and 5 with the board nose-up.
      8. Turn construction lines back off: the drawing is exactly as it was before.
    </human-check>
  </verify>
  <done>
    Full suite and lint are green, `handleViewerDrag` is gone from both components, and the
    browser pass above is recorded in the summary as pending post-merge review.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| shaper → SVG viewer | Pointer coordinates from a drag cross into geometry values |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-SNM-01 | Tampering | `rocker-viewer.tsx` construction overlay | low | mitigate | Every coordinate is a number computed in `lib/geometry` and written into a JSX attribute — no string-built path data and no raw HTML injection, the posture `outline-viewer.tsx` and this file's own header already record. The overlay adds no new input surface: it reads `geometry.handles`/`geometry.knots`, which `buildRocker` derives from the already-validated spec. |
| T-SNM-02 | Tampering | `solveSideProfileDrag` | low | mitigate | A dragged pointer position is snapped to the slider step and clamped to `ROCKER_LIFT_RANGE_IN` before it can reach the store, and a non-finite value falls back to the range minimum — asserted by Task 1's tests. Narrowing the target type to a two-member string union means an out-of-range target cannot be constructed at all. |
| T-SNM-SC | Tampering | package installs | n/a | accept | No package-manager install in this task — no dependency is added, removed or upgraded, so the legitimacy gate has nothing to audit. |
</threat_model>

<verification>
- `npm test` — full suite green, including the reduced `rocker-drag` suite and every suite that
  touches `rocker.ts`, `foil.ts` and `volume.ts` (none of which this task changes).
- `npm run lint` — clean, or no new warnings beyond the pre-existing ones in unrelated files.
- `npx tsc --noEmit` — expected to be clean apart from the two pre-existing `LayoutProps` phantom
  errors in `app/layout.tsx` and `app/design/layout.tsx`, caused by `next-env.d.ts` being
  gitignored and absent from a fresh worktree. Record them; do not chase them.
- `npm run build` is NOT run here — it fails in a worktree and the orchestrator builds after
  merge.
- The browser pass in Task 2's `<human-check>` is recorded as pending post-merge, per the
  shaper's one-change-then-review cadence.
</verification>

<success_criteria>
- The rocker viewer draws four construction lines (one out of each tip, two out of the centre)
  plus terminus dots and a centre dot, in the accent construction colour, at constant on-screen
  size, in both orientations.
- Every one of those coordinates comes from `buildRocker`'s existing `knots`/`handles`; no
  formula was added to a component and nothing new was added to `lib/geometry/`.
- The side profile offers exactly two grab targets, both on the rocker line's tips.
- No deck/foil grab point is drawn or reachable, and no dead deck-solve code, unused import or
  stale comment describing it survives in `rocker-drag.ts`, its test, the viewer or the editor.
- Thickness remains fully editable through the five sidebar sliders.
- `npm test` and `npm run lint` pass.
</success_criteria>

<output>
Create `.planning/quick/260829-snm-add-construction-lines-for-the-rocker-po/260829-snm-SUMMARY.md` when done.

Write it for a shaper, not a developer: what the ROCKER screen now shows and what it no longer
shows, in plain English, before any file-level detail.
</output>
