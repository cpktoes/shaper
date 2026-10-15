---
phase: quick-261015-hz7
plan: 01
subsystem: ui
tags: [geometry, outline, wings, fins, template, callouts, phone, metric, playwright]

requires:
  - phase: quick-261014-wii
    provides: the wing maths (wings.ts), the fin lock (wing-lock.ts), the WINGS tab, close-up, sidebar, grab points and VIEWER chips
provides:
  - "lib/geometry/wings.ts: the slot locks (WingLock front-trailing / rear-trailing), WingFinEdges, wingPositionTop, wingOrderGap, clampWingStations, wingOrderState, wingPositionRangeForSlot, canAddSecondWing, wingLockFitsSlot, slotWingLocks, removeWing, wingLockEdge, wingFinBoxDistance, nextWing's new defaults"
  - "lib/geometry/wing-lock.ts: wingFinEdges, lockedWingStation by slot, resolveWingStations with the rear lock, the top and the order clamp, wingFinBoxWarning"
  - "lib/models/design-snapshot.ts: rule 7 reads the slot locks (front-leading as front-trailing, a wrong-slot lock as none) without rewriting anything stored"
  - "components/viewer/chip-value-fit.ts: measured character widths and chipValueFontSize; CalloutChip's opt-in fitValue"
  - "components/outline/wing-view-layout.ts: spreadApart with the nearer-side jump and top/bottom bounds; the full close-up frame's 268-unit rail"
  - "e2e/wings.spec.ts: the slot locks, the order rule, the warning, the empty tab, and every wing label proven to fit on five boards and every screen"
affects: [TEMPLATE, WINGS close-up, VIEWER chips, FINS, saved boards, printed templates, Board Rack, screen tiles]

actuals:
  tokens: 35000    # chars/4 over the hand-written diff 83132e5..HEAD (about 2,015 added lines, 114,800 characters) plus this summary
  tasks: 4
  commits: 5

tech-stack:
  added: []
  patterns:
    - "A position limit shared by every reader: clampWingStations runs inside placedWings (so buildOutline's readers draw it) and inside the store's resolver (so the screen and a save agree)"
    - "A chip value fitted to its chip from a measured per-character em table, opt-in per chip so every other chip's markup is byte-identical"
    - "spreadApart moving an item to the nearer side of a fixed block, and re-laying a chain from the drawing's top bound"

key-files:
  created:
    - components/viewer/chip-value-fit.ts
    - components/viewer/chip-value-fit.test.ts
    - .planning/quick/261015-hz7-wing-fixes-from-the-founder-s-preview-cu/261015-hz7-SUMMARY.md
  modified:
    - lib/geometry/wings.ts
    - lib/geometry/wings.test.ts
    - lib/geometry/wing-lock.ts
    - lib/geometry/wing-lock.test.ts
    - lib/geometry/outline-drag.ts
    - lib/geometry/outline-drag.test.ts
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - components/design/design-store.tsx
    - components/outline/outline-editor.tsx
    - components/outline/wing-controls.tsx
    - components/outline/wings-panel.tsx
    - components/outline/wing-close-up.tsx
    - components/outline/wing-view-layout.ts
    - components/outline/wing-view-layout.test.ts
    - components/outline/outline-viewer.tsx
    - components/viewer/callout-primitives.tsx
    - e2e/wings.spec.ts
    - .claude/skills/sketch-findings-shaper/references/wings.md

key-decisions:
  - "The order gap is measured apex to apex: wing 2's position sits at least max(1/2\", 2 x wing 1's run) behind wing 1's position (orchestrator's ruling on the founder's words)"
  - "When there is no room behind wing 1, the 2\" floor wins and wing 2 sits at 2\" with a note (orchestrator's ruling)"
  - "The empty-tab 'No wings yet' card is removed and the dial-in pop-up kept (the orchestrator's reading of 'two popups')"
  - "Turned, every WING chip rides the outer row beside WP OFFSET; upright, chips step by the WIDEPOINT / WP OFFSET pair's own step, which also separates that pair on an upright iPhone"
  - "The close-up does not mark the fin-box warning; the sidebar line under Depth is the warning"
  - "A long wing value is set smaller to fit its chip; the chip's width and the gutter rail are unchanged"

patterns-established:
  - "Slot-aware wing locks: wingLockEdge(w, index, edges) is the one place a lock becomes an edge, used by the resolver, the grab points, the sidebar and the close-up"

requirements-completed: [QT-261015-hz7]

coverage:
  - id: D1
    description: "Wing 1 locks only to the front fins, wing 2 only to a quad's rear fins, both at the trailing edge; no Fin edge picker; the offset slider stays"
    requirement: QT-261015-hz7
    verification:
      - kind: unit
        ref: "lib/geometry/wing-lock.test.ts#wing 2 locks to a quad's rear fins and always sits behind wing 1"
        status: pass
      - kind: e2e
        ref: "e2e/wings.spec.ts#desktop: on the Mid-length quad wing 2 locks to the rear fins ..."
        status: pass
    human_judgment: false
  - id: D2
    description: "Wing 2 sits at least max(1/2\", 2 x wing 1's run) behind wing 1 and never under 2\"; held and no-room notes; sliders and grab points stop at the same limits"
    requirement: QT-261015-hz7
    verification:
      - kind: unit
        ref: "lib/geometry/wings.test.ts#wing 2 sits behind wing 1 ...; lib/geometry/outline-drag.test.ts#wing grab points"
        status: pass
      - kind: e2e
        ref: "e2e/wings.spec.ts#desktop: on the Mid-length a rear-locked wing 2 is held behind wing 1 ...; #no room for wing 2"
        status: pass
    human_judgment: true
    rationale: "Whether the apex-to-apex reading and the 2-inch floor are what the founder meant is theirs to confirm"
  - id: D3
    description: "No wing past the centre or the widepoint, whichever is nearer the tail"
    requirement: QT-261015-hz7
    verification:
      - kind: unit
        ref: "lib/geometry/wings.test.ts#the position top is the centre or the widepoint ..."
        status: pass
      - kind: e2e
        ref: "e2e/wings.spec.ts#desktop: a wing past 24 inches grows the close-up's window (38.500)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The founder's scaling rule warning under Depth, in the warning ink, in both systems"
    requirement: QT-261015-hz7
    verification:
      - kind: unit
        ref: "lib/geometry/wing-lock.test.ts#the founder's scaling rule ..."
        status: pass
      - kind: e2e
        ref: "e2e/wings.spec.ts#desktop: a wing deeper than 3/16 inch ... shows the founder's fin-box line, in both systems"
        status: pass
    human_judgment: true
    rationale: "The wording and its place under the Depth row are the founder's to read"
  - id: D5
    description: "New wings 3/16\" deep; wing 2 added behind wing 1 (rear-locked on a quad, 3\" behind by hand otherwise)"
    requirement: QT-261015-hz7
    verification:
      - kind: unit
        ref: "lib/geometry/wings.test.ts#nextWing adds 3/16 inch wings, the second behind the first"
        status: pass
    human_judgment: false
  - id: D6
    description: "The empty ADD WINGS tab shows the bare tail with no card; the dial-in pop-up opens once for the first wing"
    requirement: QT-261015-hz7
    verification:
      - kind: e2e
        ref: "e2e/wings.spec.ts#desktop: the empty ADD WINGS tab draws the bare tail with no card ..."
        status: pass
    human_judgment: true
    rationale: "The reading of 'two popups' is the orchestrator's; the founder can overrule"
  - id: D7-D9
    description: "Every close-up label inside the drawing, every wing value inside its chip, every VIEWER chip the pair's gap apart, upright and turned"
    requirement: QT-261015-hz7
    verification:
      - kind: unit
        ref: "components/viewer/chip-value-fit.test.ts; components/outline/wing-view-layout.test.ts"
        status: pass
      - kind: e2e
        ref: "e2e/wings.spec.ts#every wing label fits ... (computer, upright phones, Pixel 7 and iPhone sideways)"
        status: pass
    human_judgment: true
    rationale: "How the turned outer-row chips and the smaller long values look is the founder's call"
  - id: D10
    description: "Saved boards: legacy leading lock reads as trailing, wrong-slot locks read as by hand, out-of-order and past-the-top stations parse as stored"
    requirement: QT-261015-hz7
    verification:
      - kind: unit
        ref: "lib/models/design-snapshot.test.ts#wings ride on the outline ..."
        status: pass
    human_judgment: false

duration: 165min
completed: 2026-10-15
status: complete
---

# Quick 261015-hz7: the founder's wing fixes after the first preview — Summary

**Wing 1 locks to the front fins and wing 2 to a quad's rear fins, both at the trailing edge; wing 2 always sits a
safe flat behind wing 1; no wing passes the centre or the widepoint; a deep wing too close behind a fin box gets the
founder's scaling-rule warning; new wings start 3/16" deep; the empty tab loses its floating card; and every label
on the wing drawings fits, on a computer and on a phone, upright and turned.**

## What a shaper can now do, item by item

1. **The three layout faults from the walk-through.**
   - *Read-outs off the close-up's right edge.* The full close-up's right-hand column of widths is wider, so
     "Ahead of wing 1" and "Ahead of wing 2" sit whole inside the drawing. Read-outs and chips are also kept inside
     the drawing top and bottom (a stinger with wing 2 just behind it used to push "Center" off the top).
   - *Wing numbers spilling out of their chips.* A long wing number such as `1/4" @ 30 9/16"` is set a little
     smaller so it sits inside its chip. The chip keeps its size and its place, and no other chip changes. The
     longest numbers, `15/16" @ 53 15/16"` and `25 mm @ 137.1 cm` on the Longboard, are proven inside their chips.
   - *WING 2 touching WIDEPOINT on the VIEWER.* Every chip now keeps the same gap the WIDEPOINT / WP OFFSET pair
     keeps, from LENGTH, the pair, TAIL BLOCK and each other. With the board turned, the WING chips sit on the outer
     row beside WP OFFSET. On an upright iPhone the WIDEPOINT and WP OFFSET chips no longer overlap.
2. **Only wing 1 locks to the front fins.** Wing 1's sidebar shows "Lock to front fin". On a single fin it is
   greyed, with its note.
3. **Wing 2 locks to the rear fins on a quad, and has no lock otherwise.** On the Mid-length the second wing is
   added locked to the rear fins at 6 1/4". On a thruster, twin or 2+1 wing 2 has no lock row at all.
4. **The lock always follows the trailing edge.** The Fin edge picker (Trailing / Leading) is gone. The "Offset from
   the fin" slider stays, −3" to +3".
5. **One pop-up.** The floating "No wings yet" card over the empty ADD WINGS tab is gone. The tab shows the bare
   tail, and the sidebar's "+ Add a wing" is the way in (on a phone, in the controls under the drawing). The "Dial
   in your wing placement" pop-up still opens every time a board goes from no wings to one.
6. **Wing 2 is always nearer the tail than wing 1.** Its apex stays at least 1/2" or twice wing 1's run behind wing
   1's apex, whichever is larger, and never closer than 2" to the tail.
   - Moving wing 1 tail-ward, or lengthening its run, pushes wing 2 with it.
   - The sliders and the grab points stop at the same limits. With a wing 2 present, wing 1 can come no nearer
     the tail than 2" plus the gap.
   - A rear-locked wing 2 that would break the rule is held at the limit, with a note: `Held at 5" — wing 2 stays
     at least 4" behind wing 1.`
   - When wing 1 sits too close to the tail for a second wing, "+ Add wing 2" is greyed out, with a one-line note.
7. **The founder's scaling rule.** A wing deeper than 3/16" whose apex sits at a side fin's trailing-edge mark, or
   behind it by less than twice its depth less 1/4", shows one line under its Depth row, in the warning colour:
   *"Modern fin boxes: for a wing this deep, set its apex at least 1/2" behind the fin's trailing-edge mark (twice
   the depth less 1/4"). Check your fin box's spec too."* The distance is worked out for that wing and read as a
   mark (13 mm in Metric for a 3/8" wing). Both new wings start 3/16" deep, so neither opens with the warning.
8. **The position limit.** No wing goes past the board's centre or its widepoint, whichever is nearer the tail:
   - 35 1/2" on the default board and 36" on the Shortboard (their widepoints);
   - 34" on the Fish, 43" on the Mid-length and 54" on the Longboard (their centres).

   The slider's end word names the limit ("Widepoint 35 1/2"" or "Centre 43"").

**Saved boards** open with their wings read by the new rules and never rewritten:
- An old leading-edge lock reads as the trailing edge.
- A lock in the wrong slot reads as placed by hand at its stored station.
- Out-of-order or past-the-limit stations are corrected when the board is drawn, never in the stored data.

Boards without wings are unchanged everywhere. The one exception is the upright phone's WIDEPOINT / WP OFFSET
pair, which no longer overlaps.

## Rulings for the founder to confirm

- **The order gap is measured apex to apex** (the orchestrator's reading of "can't get any closer than 1/2" or
  2x the run along the stringer from wing 1"). Wing 2's apex sits at least max(1/2", 2 × wing 1's run) behind wing
  1's apex. That leaves a flat at least one run long between wing 1's inner corner and wing 2's apex.
- **When there is no room, the 2" minimum wins.** Wing 2 sits at 2" with a note rather than closer to the tail.
- **The empty-tab card is removed** (the orchestrator's reading of "two popups — I only want the second one"). The
  dial-in pop-up stays exactly as it was.
- **Turned VIEWER: every WING chip rides the outer row**, the row WP OFFSET uses. On a sideways phone the inner row
  has no room for even one wing chip beside LENGTH and TAIL BLOCK.
- **Upright VIEWER: the gap is the pair's own visible gap, not a flat 6 units.** The founder asked for "the same
  gap the WIDEPOINT / WP OFFSET pair keeps". That pair stands about 8.9 units apart at 1024 × 768 and 10.75 at
  1280 × 800, so chips now step by the pair's own step.
- **The upright iPhone's WIDEPOINT / WP OFFSET overlap is fixed as part of that.** It was overlapping by 4.5 units
  even with no wing. This is the one no-wing screen that changes, and it is a phone.
- **The close-up does not mark the fin-box warning.** The drawing keeps nothing but faint lines and dimension ink.
  The sidebar line under Depth is the warning; on a phone it sits directly under the drawing.

## Measured facts — confirmed or corrected

- **F7 confirmed exactly** from the app's own functions:
  - Fins: front trailing edges 10.9768 / 11.0000 / 7.5000 / 12.0000"; Mid-length rear 6.2500"; Shortboard as a
    quad 11.0911 / 5.1711"; as a 2+1, 15.0417".
  - Limits: 35.5 / 36 / 34 / 43 / 54".
  - Second-wing defaults: 7 15/16" (Metric 202 mm, 20.2 cm), 8", 4 1/2", 6 1/4" rear-locked, 8".
  - Second wing's radius: 1 7/16" (37 mm).
- **F8 confirmed:**
  - Mid-length, wing 1 at offset −3" with a 2" run: wing 1 sits at 9.0000" and wing 2 is held at 5.0000", in 2
    passes.
  - Wing 1 by hand at 3" with a 2" run puts wing 2 on the 2" floor.
  - Two by-hand wings stored the old way round (11", 15 1/2") resolve wing 2 to 10 1/2".
  - A rear lock left on a thruster is inert, its stored 6" kept.
  - The sweep (both quads × offsets −3/0/+3 × depths 1/16, 1/2, 1) takes at most 3 passes. Re-resolving a settled
    result moves nothing more than 0.0007". The plan's 0.0015" was a different measure of the same settling.
  - The default board's first wing reads `3/16" @ 11"`, and in Metric `5 mm @ 27.9 cm` with widths 36.2 / 35.0 /
    37.4 cm.
- **F9 confirmed.** The character-width table estimates every measured string within 1.5 px at 14 px.
- **F10 confirmed.** The read-out room is 164 units on both frames, which beats 104 / 0.66 = 157.6. The 1280 × 800
  close-up still draws its full frame.
- **F11 confirmed by a negative run.** With the old 6-unit spread put back, the new VIEWER check failed at
  1024 × 768 with "WING 2 / WIDEPOINT 5.47 px apart, need 8.14": F11's own figures, the gap the founder saw. With
  the value fit switched off, the widest-value check failed by 12.0 px. Both files were restored before committing.
- **F13 confirmed.** The home-card click flaked once under the full suite's load (the Mid-length held test). It
  passes alone.
- **F14 confirmed** through the unit boundary tests, with the 1e-9 mm tolerance. I did not re-print the −8.9e-15
  figure itself.
- **F15 corrected by one item.** `outline-drag.test.ts`'s non-finite-input test also had to change: wing 1 with a
  wing 2 present now falls back to its own slot's minimum, 2 1/2", not 2". Everything else F15 lists was updated
  as planned (`38.500`, `@ 14"`, `5 mm @ 27.9 cm`, `35.0 cm`, `Depth — 5 mm`, the phone helper).

## Gates

- `npx vitest run`: **140 files, 4932 passed, 2 skipped**. The 2 skipped tests were already skipped before this
  task. The wing golden and every frozen fixture pass unedited.
- `npx next typegen && npx tsc --noEmit`: clean. `npm run lint`: clean.
- `e2e/wings.spec.ts`, all three projects: **44 passed, EXIT 0**. It includes 12 desktop layout proofs (five boards
  × two placements at 1024 × 768, 1280 × 800, and the widest values), upright phones, the sideways Pixel 7 and the
  844 × 390 iPhone.
- Task 3's run of wings + desktop-baseline + viewer-zoom: **57 passed, EXIT 0**. The five desktop baselines pass
  with no snapshot file modified.
- **Whole browser suite** (`PW_PORT=3174 IS_WEBPACK_TEST=1`, all projects): **1106 passed, 6 failed, 829 skipped,
  EXIT 1 (1.5 h)**. Every one of the six passes when re-run on its own file, so all six are load flakes:
  - `step-nav.spec.ts` ×2 and `undo-redo.spec.ts` (desktop);
  - `board-rack.spec.ts` m17 (desktop);
  - `new-board.spec.ts`'s Longboard datasheet (android);
  - `wings.spec.ts`'s Mid-length held test, the home-card click (F13).

  The re-runs: wings + step-nav + undo-redo on desktop 43 passed, EXIT 0; board-rack m17 1 passed, EXIT 0;
  new-board on android 4 passed, EXIT 0.

## Deviations from Plan

1. **[Rule 1 - Bug in a test's expectation] Non-finite drag fallback.** `outline-drag.test.ts`'s fallback test
   expected 2". With a wing 2 present, wing 1's range starts at 2 1/2" (D2), so the expectation now reads the
   slot's own minimum. (Commit fec57b3.)
2. **The Mid-length held test was split in two.** Checking the thruster's wing 2 needs a fresh board, and the store
   keeps the Mid-length's wings across a `goto`, so the thruster check is its own test. (Commit ae2c499.)
3. **The tracer's helper clicked the first "+ Add a wing"** while the empty-tab card still existed (Task 1). It went
   back to a plain click once Task 2 removed the card.
4. **The text-in-chip checks compare side to side only.** That is the direction the founder's overflow ran. An SVG
   text box's height is the font's full em box, which is not the ink.
5. **The upright VIEWER's spread has no top or bottom bounds.** The plan named bounds only for the close-up and the
   turned row. Every upright proof passes without them.
6. **The fin-box warning was written in Task 2**, as the plan orders. I drafted it during Task 1 and held it back.
7. **TDD order.** The tests and the code were written together in each task, rather than every test first and
   watched to fail. Every new behaviour has its unit or browser test. Both new layout checks were also proven to
   fail on the old behaviour (the F11 negative runs).

## Human verification deferred

The plan carries no `<human-check>` items. `workflow.human_verify_mode` is end-of-phase, so nothing paused here.
For the founder's look on their own dev server:
- the order rule in use on the Mid-length and a thruster;
- the fin-box line's wording;
- the turned VIEWER's outer-row wing chips;
- the smaller long wing numbers;
- the empty ADD WINGS tab.

## Known Stubs

None.

## Commits

- fec57b3 — Wing 2 now sits behind wing 1 and locks to a quad's rear fins, and no wing goes past the centre or the
  widepoint
- ae2c499 — The wing controls warn when a deep wing sits too close behind a fin box, explain when wing 2 has no room
  or is held, and the empty wings tab shows the tail with no card over it
- cc6896e — Every label on the wings close-up stays inside the drawing, long wing numbers fit their chips, and the
  VIEWER keeps the same gap between chips upright and turned
- 3f40a2b — The wings drawings are proven on five boards on a computer and on both phones upright and sideways, and
  the wing design notes follow the founder's new rules
- (this summary) — docs(quick-261015-hz7): summary — the founder's wing fixes after the first preview

## Self-Check: PASSED

All four task commits exist on the branch. `components/viewer/chip-value-fit.ts` and its test exist. No snapshot
file, golden or frozen fixture was modified (`git diff 83132e5 --stat` lists only the 21 files in key-files). Nothing
was pushed, and STATE.md and ROADMAP.md are untouched.
