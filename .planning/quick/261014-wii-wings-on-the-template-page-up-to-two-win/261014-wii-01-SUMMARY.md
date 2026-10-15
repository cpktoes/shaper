---
phase: quick-261014-wii
plan: 01
subsystem: ui
tags: [geometry, outline, wings, fins, template, playwright, golden]

requires:
  - phase: quick-261007-c3h
    provides: the reference-sketch golden recipe (a copy of the sketch's code, executed by a generator script)
provides:
  - "lib/geometry/wings.ts: the Wing type and its ranges, the step's maths (construction A), applyWings, wingReadouts, nextWing, wingRadiusTop"
  - "lib/geometry/wing-lock.ts: frontFinEdges and resolveWingStations (a locked wing follows the front fin)"
  - "lib/geometry/design.ts: deriveEffectiveFins (Import Template's mapping, moved out of the store)"
  - "the wings golden from the founder's sketch (reference/sketches/013-wings-curves.js, scripts/extract-wings-golden.ts)"
  - "saved-board rule 7: wings optional, strict per wing, forgiving as a whole, version stays 5"
  - "TEMPLATE's WINGS tab: close-up of the tail, the wing sidebar, Show fins, the dial-in pop-up, WING chips on the VIEWER"
affects: [quick-261014-wii plan 02 (grab points, phones, Metric, readers), FINS, printed templates, Board Rack]

actuals:
  tokens: 38500    # chars/4 over the hand-written diff (153,946 added chars); the generated golden adds 789,986 bytes (about 197,500 more)
  tasks: 4
  commits: 6

tech-stack:
  added: []
  patterns:
    - "A shape change applied after the outline curve inside buildOutline, so every reader of points/sampleOutline follows"
    - "A store-side fixed point (resolveWingStations) instead of an effect writing derived state back"
    - "A sibling close-up viewer sharing callout primitives, with its frame maths pure in a .ts beside it"

key-files:
  created:
    - lib/geometry/wings.ts
    - lib/geometry/wings.test.ts
    - lib/geometry/wing-lock.ts
    - lib/geometry/wing-lock.test.ts
    - lib/geometry/__fixtures__/wings-golden.json
    - reference/sketches/013-wings-curves.js
    - scripts/extract-wings-golden.ts
    - components/outline/wing-controls.tsx
    - components/outline/wings-panel.tsx
    - components/outline/wing-close-up.tsx
    - components/outline/wing-view-layout.ts
    - components/outline/wing-view-layout.test.ts
    - components/outline/wing-dial-in-dialog.tsx
    - e2e/wings.spec.ts
  modified:
    - lib/geometry/board.ts
    - lib/geometry/outline.ts
    - lib/geometry/design.ts
    - lib/geometry/fins.test.ts
    - lib/geometry/preset-source.test.ts
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - lib/units-isolation.test.ts
    - components/design/design-store.tsx
    - components/outline/outline-editor.tsx
    - components/outline/outline-controls.tsx
    - components/outline/outline-viewer.tsx
    - components/viewer/callout-primitives.tsx
    - e2e/phone-chrome.spec.ts
    - e2e/board-name-band.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png

key-decisions:
  - "P3 kept: a locked wing's resolved station is the fin edge plus the offset exactly, never snapped to 1/16\" (the offset and every set value still move in 1/16\")"
  - "P7 kept: this plan updated the specs the two-tab strip moves and re-recorded the TEMPLATE desktop baseline"
  - "board-name-band.spec.ts p1/p2 (phones) also pinned TEMPLATE as a single label: TEMPLATE joined its TAPPABLE list (strip 31 tall, 44-dot touch box), outside F22's list"
  - "wing-close-up.tsx and wing-controls.tsx added to lib/units-isolation.test.ts's design-screen display list (they read units through measure-display)"

patterns-established:
  - "spreadApart: labels pushed apart from the tail up, jumping fixed blocks, only ever moving up"
  - "CalloutChip leaderAtY / OutputRail readoutY: an L leader keeps a moved label on its true station; byte-identical markup when omitted"

requirements-completed: [QT-261014-wii]

coverage:
  - id: D1
    description: "A wing is a step applied after the outline curve, fading out by the tail pod; a board without wings is today's board"
    requirement: QT-261014-wii
    verification:
      - kind: unit
        ref: "lib/geometry/wings.test.ts; lib/geometry/outline.test.ts (untouched)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The wing maths matches the founder's sketch at all 8,090 recorded stations within 1e-9 mm"
    requirement: QT-261014-wii
    verification:
      - kind: unit
        ref: "lib/geometry/wings.test.ts#the wing maths is the founder's own sketch"
        status: pass
    human_judgment: false
  - id: D3
    description: "Fins read the winged rail; a locked wing follows its fin edge in at most three passes"
    requirement: QT-261014-wii
    verification:
      - kind: unit
        ref: "lib/geometry/fins.test.ts#fins listen to the real rail beside them; lib/geometry/wing-lock.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "Wings saved with the board; old boards open unchanged; malformed wings open as no wings"
    requirement: QT-261014-wii
    verification:
      - kind: unit
        ref: "lib/models/design-snapshot.test.ts#wings ride on the outline"
        status: pass
    human_judgment: false
  - id: D5
    description: "The WINGS tab, its close-up, sidebar, Show fins, dial-in pop-up, lock and growing window"
    requirement: QT-261014-wii
    verification:
      - kind: e2e
        ref: "e2e/wings.spec.ts (desktop)"
        status: pass
    human_judgment: true
    rationale: "The close-up's look against sketch 014 and the founder's open D7 questions are the founder's call at the look"

duration: 60min
completed: 2026-10-15
status: complete
---

# Quick 261014-wii Plan 01: Wings on the TEMPLATE page Summary

**A shaper can now add up to two wings to a board from a new WINGS tab on TEMPLATE. Each wing is a step cut after the outline curve, fading out by the tail. The step is checked against the founder's own sketch at 8,090 points. The tab draws the tail close up with the step's dimensions. A wing can lock to the front fin, and the fins measure in from the real rail beside them.**

## Performance

- **Duration:** about 60 min (00:12 to 01:12, 2026-10-15)
- **Tasks:** 4 of 4
- **Files:** 14 created, 16 modified

## Accomplishments

- **The maths** (`lib/geometry/wings.ts`) is the sketch's construction A, ported line for line into millimetres. With no wings, `buildOutline` returns today's object, and the prototype golden in `outline.test.ts` passes untouched.
- **The golden** comes from running the sketch's own code: 7 boards × 5 settings, 8,090 points. Running the generator twice gives the same bytes.
- **The fin rule (D8).** Fin placement reads the winged outline. A locked wing is resolved in the store by `resolveWingStations`, never written back by an effect. That resolved outline is what the screen shows and what a save stores.
- **Saved boards (rule 7).** Wings are checked one by one when a board opens, but a damaged wing list never stops the board opening: it opens without wings. The snapshot version stays 5.
- **The WINGS tab** is labelled ADD WINGS until the board has a wing, then WINGS · n. It shows the close-up and its own two-button toolbar. The sidebar swaps to the wing controls alone, in the Template Builder's dress. Show fins is in the shared Settings block. The first wing opens the "Dial in your wing placement" pop-up.
- **The VIEWER** draws a WING n chip in its left gutter for each wing. The chips are spread apart from the tail up, and the WIDEPOINT/WP OFFSET pair stays where it is.

## Task Commits

1. **Task 1 (tracer):** `5e46425` — Add a wing from the new WINGS tab on TEMPLATE and the board draws the step behind it, fading out by the tail
2. **Task 2:** `10279df` — The wing maths is checked against the founder's own sketch, and fins measure in from the real rail beside them
3. **Task 3:** `288facc` — The WINGS tab draws the last 26 inches of the tail close up with each wing's depth, run and widths, and the VIEWER names each wing in its gutter
4. **Task 4:** `c03d66f` — The wing sidebar sets each wing's position, fin lock, depth, run and corner radius, and the first wing turns Show fins on and asks you to dial it in against FINS
5. **Task 4 baseline:** `f15b161` — TEMPLATE's reference picture now shows the ADD WINGS tab and the Show fins setting

## Measured facts (F13–F26)

| Fact | Result |
|---|---|
| F13 | **Confirmed.** Worst point 2.73e-12 mm at all 8,090 stations; readouts 1.7e-13 mm (planner: 2.3e-13). Tolerance 1e-9 mm. |
| F14 | **Confirmed with one correction:** 35 cases and 8,090 points, byte-stable. The file is **789,986 bytes**, not 789,132. The difference is formatting only: my provenance and units text, and the recorded `boards` block. |
| F15 | **Confirmed.** No wings key or `[]` deep-equals today's geometry on all 7 boards. The full unit suite passes: 138 files, 4,824 passed, 2 skipped. |
| F16 | **Confirmed with one correction:** point counts are 164 / **191** / 271 / 276 / 250 (planner: 192 for the angled step). My 0.02" grid steps by index, so the extra point at the step's start was a shape point already. Area 1041.03 → 1036.91 in². Tail @ 12" stays 14.7199" with the 11" wings and is 14.3054" with the 30" stinger. |
| F17 | **Confirmed.** Each wing's shape is built once per call. On the default board, `buildOutline` with one or two wings takes 0.12–0.27 ms. |
| F18 | Covered by the unit tests: the square-step identity (radius = depth/2) and the golden's maxRadius readouts. |
| F19 | **Confirmed:** front-fin edges 10.9768/15.4768, 11/15.5, 7.5/13, 12/16.5, and none on the Longboard. A wing ahead of the fin moves it −8.91582 mm; at the trailing edge, +0.01031 mm. Narrow tail (12.0003"): trailing+1 takes 2 passes and settles at 12.7520"; trailing+3 settles at 14.7130"; leading+0 at 16.1900"; trailing+0 takes 1 pass. Quad McKee SB: 1 pass, 15.4768", w12 14.7199 → 14.1288, half-spread 3.1441 → 2.9230. Basic: 15.3750", 14.1249, 3.2137 → 2.9906. Mid-length leading: 13.9680, 4.1306 → 3.9864. Mid-length trailing: 14.5233, → 3.9311. Import Template off: 1 pass, 2.5750. |
| F20 | **Confirmed:** [0, 26"] at 21.08 units per inch, width 882, fit 0.912, 19.21 px/in. cx 427.9, values at 745.9, extension lines end at 671.9. Every row of the five-board table matches to 0.01 px/in. |
| F21 | **Confirmed:** `3/8" @ 11"` / `10 mm @ 27.9 cm`, ahead 14 1/4" / 36.2 cm, behind 13 3/8" / 34.0 cm, Tail @ 12" 14 3/4" / 37.4 cm. |
| F22 | **Corrected, with one omission.** The four listed items broke as stated and are updated. **`e2e/board-name-band.spec.ts` p1 and p2** (the phone band tests) also pinned TEMPLATE as a single label: they expected a 21-dot strip and the smaller touch box. TEMPLATE now joins their `TAPPABLE` list, with a 31-dot strip and the 44-dot box. On a computer the strip is 30, as stated. |
| F23 / F24 | **Confirmed.** A malformed value deletes the key. Tested: three wings, a depth of 0, a negative run, a string station, a "sideways" lock, and a non-list. |
| F25 | **Confirmed.** The design-store contracts, the toolbar count (5 and 1 in `outline-editor.tsx`) and the no-raw-Slider rule all hold. |
| F26 | Handled by P5. In the 72" picture, WING 2 at 15 1/2" sits clear above WING 1 with an L leader. |

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 — blocking] Two new screen files added to the units-isolation ledger**
- **Found during:** Task 3 and Task 4.
- **Issue:** `lib/units-isolation.test.ts` fails on any screen `.tsx` that imports `lib/geometry/units` without being on its list.
- **Fix:** Added `components/outline/wing-close-up.tsx` and `wing-controls.tsx` as converted design-screen files. Both read every number through `measure-display.ts`.
- **Commits:** `288facc`, `c03d66f`.

**2. [Rule 1 — bug the plan's own change caused] board-name-band phone tests**
- **Found during:** Task 4 gate.
- **Fix:** See F22 above. TEMPLATE now joins `TAPPABLE`.
- **Commit:** `c03d66f`.

**3. The tracer spec closes the dial-in pop-up before reading the tab label.** A modal hides the page from the tab lookup. This is in `e2e/wings.spec.ts` only.

### Small ordering changes (no change in outcome)
- Task 1 exported `SectionHeading` with its `action` slot, which the plan scheduled for Task 4, because the tracer's Remove button needs it.
- Task 3 added the `showFinsOverride` state, so the close-up had its Show fins input. Task 4 added the toggle, the pop-up and the VIEWER's `hideFinMarks={!showFins}`.

### TDD
- Task 1's wing maths was written alongside its tests rather than strictly test-first. Every task's tests passed before its commit. There are no separate `test(...)` commits, because the plan asks for one commit per task.

### Baseline
- The plan said "nothing inside the drawing changes" in the re-recorded TEMPLATE picture. The drawing does move down one dot, because the tab row is now a 30-dot button row instead of a 29-dot label (F22). The other four desktop baselines (ROCKER, RAILS, VOLUME, FINS) match unchanged.

## Gates

- `npx vitest run`: 138 files, 4,824 passed, 2 skipped.
- `npx next typegen && npx tsc --noEmit`: clean.
- `npm run lint`: clean.
- Playwright gate (the 13 listed files, all three projects): after the board-name-band fix, everything passes except **one cold-server timeout**: `e2e/board-lock-screens.spec.ts` p-screens on the iPhone.
  - It walks six screens inside the 30-second limit per test.
  - On a freshly started webpack dev server the first run took 29.8 s and timed out. Warm reruns passed in 27.6 s and 9.6 s.
  - The failure snapshot shows it had already passed TEMPLATE and ROCKER and was on RAILS. It never touches a wing.
  - `look-summary` failed once in the full run and passed when re-run.
  - I did not raise the test's time limit (out of scope). It is listed under Deferred Issues.

## Deferred Issues

- `e2e/board-lock-screens.spec.ts` › p-screens (iPhone) can hit its 30-second limit on a cold dev server. It passes warm. Worth checking on main after the merge, to see whether it predates this plan.
- **Plan 02** has the grab points (D5), the phone layout of the WINGS tab, Metric proofs, and checks of the readers (prints, FINS' tail drawing, the Board Rack, the tiles).
- At 1024×768 the close-up's fit is 0.62, below the 0.66 floor for pinned callouts, so the station dimensions are hidden there (F20). Plan 02's compact frame takes over at that width.

## Questions for the orchestrator

- **P3 (no snap).** As built, a locked wing sits exactly on the fin edge plus the offset. Confirmed by the orchestrator; F19's numbers are reproduced above.
- **P7 (the re-record moved into plan 01).** Done. Plan 02 should prove the TEMPLATE baseline unchanged. It should also expect the board-name-band phone changes above.

## Questions for the founder's look (D7, still open)

- Does a wing's position mark where the step starts (as built and sketched), or the middle of the step?
- Should the dial-in pop-up open once per board, or every time a board goes from no wings to one (as built)?
- Should the corner-radius slider's top be the step's own limit (as built), or a fixed 3"?
- Coming back from FINS lands on the VIEWER tab, because the WINGS tab is not remembered across screens. Show fins stays on while the board has a wing. Is that the right return?

## Human verification deferred

There is no human-verify checkpoint in this plan (`human_verify_mode` is end-of-phase). For the founder's look on their dev server:
- Compare the WINGS tab with sketch 014's `wings-tab-daylight.png` and `b-stinger-*.png`: the close-up, the chips, the read-outs and the dimensions.
- Compare the VIEWER's WING chips with `viewer-tab-daylight.png`.
- Check the pop-up's wording against `first-wing-popup-daylight.png`.

## Known Stubs

None. The close-up leaves room for plan 02's grab points (under `data-wing-construction`) but draws no placeholder.

## Threat Flags

None beyond the plan's threat model. The new saved-board field is covered by rule 7 (T-wii-01). The fixed point is capped at three passes, and wings with no depth are dropped (T-wii-02).

## Self-Check: PASSED

- All 14 created files are present.
- Commits `5e46425`, `10279df`, `288facc`, `c03d66f` and `f15b161` are all on `worktree-agent-ae8eb02c857717414`.
