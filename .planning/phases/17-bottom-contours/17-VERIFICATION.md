---
phase: 17-bottom-contours
verified: 2026-11-11T05:28:10Z
status: passed
score: 6/6 roadmap success criteria verified in the code and by tests (15/15 requirements accounted for); 0 gaps
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "Open 3D on a board with a cut and with channels; then use Download CNC files on that board — the STL loads in the CNC program as one closed solid"
    reason: "NOT TESTED by hand. Set aside by the founder at the walk-through: \"no, we're working on swapping this export to a .brd file\" (quick 261110-tvk, on branch close-bottom-17). The tests hold the mesh closed and its volume equal to the litres; the .brd export is checked against the solid-board fix (17-20) when it joins main. Shape3D's own test stays open from Phase 16."
    accepted_by: "founder (Chris Kontoes)"
    accepted_at: "2026-11-11T05:45:00Z"
re_verification: false
gaps: []
deferred: []
human_verification:
  - test: "Look at the bottom from above: open BOTTOM on the live site, pick a cut in NOSE, CENTER and TAIL and look at the drawing"
    expected: "Each cut shows as a faint shade, darker where it is deeper, with a fine line at every 1/16 inch of depth over it and the pencil lines you would rule (a concave's edge, a double's flat and trough, the tri-plane's panel). The dash-dot cutting line has a dot you can drag, and tapping the board moves the section to where you tapped."
    why_human: "How it looks and whether it reads like a shaper's drawing is a judgment; the tests prove the numbers and the lines exist, not that they look right."
  - test: "Slide the section along the board and read the gauge dimensions"
    expected: "The cross-section shows the flat slab with a dashed straightedge across the bottom, the cut above it, and numbers where you would put a gauge: the gap under the straightedge at the stringer, the lift at each rail, a double's trough, a channel's floor. No label ever reads 0 inch. Height x1 / x2 / x4 / x8 changes the stretch and says which one is on."
    why_human: "Whether the readings are what a shaper would actually measure with a gauge is a shop judgment."
  - test: "Try all six channel setups on a Shortboard: Channels 4, 6 and 8, then Run Parallel, With the rail and Toe-in, then Longest and Stagger, then the Angle slider"
    expected: "One sawtooth out from the stringer, each channel deeper outward to a straight wall at the rail side, no flat ridge between. Parallel walls run straight; With the rail fans gently and never meets at a point; Toe-in follows the fins' angle. The last wall's distance off the rail is read out, and a set too wide for the board is squeezed and says so."
    why_human: "The shape is the founder's own drawing from sketch 020; only the founder can confirm it is the sawtooth he meant, including the Angle he asked for at his look."
  - test: "Open the GUIDE tab and read a few cards on two different boards (for example the Shortboard and the Fish)"
    expected: "Nineteen cards, each with its name, a cartoon drawn on the board you have open, two short sentences and a dashed-rule How to shape note. The cuts on your board say On this board. Switching boards redraws every cartoon. The cards are not buttons."
    why_human: "The sentences and How to shape notes are first drafts for the founder's own words; whether they are right is his call. The channels card was reworded at the go-live; a picture for each way of laying channels is still to do."
  - test: "Change the cut and watch the litres: on VOLUME, see the litres with and without the Deep Single Concave, and compare the DATA tab's first line"
    expected: "The litres drop by the same figure DATA's first line calls Foam off. A board with every section flat shows exactly the litres it showed before BOTTOM existed."
    why_human: "The tests prove the litres, the 3D board, the CNC files and DATA all read one number; a shaper should still feel that the numbers are the right size for the cut."
  - test: "Open RAILS on a board with a Rolled Vee or a Continuous Belly in the BOTTOM"
    expected: "The rail's thickness at each station reads less than the planed thickness by the rail lift there, and the rail plots show the planed bottom falling away under the rail. On the Longboard's belly the difference is large (up to about 24 mm); it should look right to you."
    why_human: "D-35 shows a large difference on a rolled belly; the founder was shown both pictures at plan approval, but the live behaviour is a shaping judgment."
  - test: "Open FINS with a cut in the tail, press the contour icon, then move the fins forward and back"
    expected: "The contour (shade, lines, pencil) draws under the fins on the tail drawing. Moving the fins on FINS carries the tail cut's Deepest At and the channels' Start and Deepest At with them; go back to BOTTOM and see the marks moved."
    why_human: "The tests prove the carry; the founder should see it behave sensibly in use."
  - test: "Open 3D on a board with a cut and with channels; then use Download CNC files on that board"
    expected: "The solid shows the contour on the underside (channels as real vertical walls), and the downloaded zip's drawing and slices carry the cut. Load the STL in your CNC program and check it is one closed solid."
    why_human: "The tests prove the STL is closed and its volume agrees with the litres; only your CNC program tells you it cuts right. Shape3D's own test (still open from Phase 16) is separate."
  - test: "Print the Summary order form on a board with a cut (and once on a flat board)"
    expected: "The cut board prints a third page, BOTTOM CONTOURS: the bottom from above, a section at each cut's deepest station, DATA's two tables and the How to shape notes. The Overview Sheet has one line per cut. A flat board prints exactly the two pages it always did. The Full Sized Template and Paper Saver show no contour. In Metric every mark reads in whole millimetres and every dim in centimetres."
    why_human: "Printed paper, the scale, and how the page looks on a real printer (your iPhone print of the new page is also still to try) need your eye."
  - test: "On a real phone upright, then held sideways, open BOTTOM"
    expected: "The drawing stays pinned above; the NOSE / CENTER / TAIL switch and one section's controls scroll beneath; every control is finger-sized; the page does not scroll as a whole. Held sideways you get the thin top bar and the desktop layout with controls beside the board. Spots to look at: the Angle's Reset button can sit under the floating Undo/Redo pair until you scroll; 'set by hand' wraps to two lines on a computer; eight channels reach the inch floor almost at once."
    why_human: "A real phone, a real thumb and the founder's own look; the browser specs ran on emulated phones."
  - test: "Switch the Imperial / Metric chooser on BOTTOM and on DATA"
    expected: "Depths, Off Rail, Off Stringer, Trough At, channel width and lifts read in whole millimetres; Start, Deepest At, End and the stations read in centimetres to one decimal; litres read the same."
    why_human: "Rule 2's cm-for-dims, mm-for-marks split is a convention the founder reads by eye."
---

# Phase 17: BOTTOM, Bottom Contours a Shaper Can Map, Measure and Cut: Verification Report

**Phase Goal:** A shaper maps, measures and cuts the bottom of the board they designed: a BOTTOM design screen between ROCKER and RAILS; Nose, Center and Tail each take a named cut (flat, belly, vee, single or double concave), the tail 4/6/8 channels cut last; the bottom seen from above with a contour line every 1/16" of depth, a cross-section at a sliding station with gauge-style depths, DATA every 6", a GUIDE card per cut; one foam-off function read by VOLUME's litres, the 3D board, the CNC files and RAILS.
**Verified:** 2026-11-11T05:28:10Z
**Status:** human_needed
**Re-verification:** No, initial verification
**Checked against:** this worktree on branch `close-bottom-17` at main `556162ba` (code identical to live main `ff5818c0`).

## In plain English

The goal is achieved in the code. Every requirement R1 to R15 has working code behind it and tests that pass. The page is live on the site since 2026-11-10 and the founder's own check of 31 saved boards found every one opens flat with the same litres it had before. Nothing blocks the phase. The status is `human_needed` only because a good deal of this phase is how things look and feel (the drawings, the GUIDE words, the print page, a real phone), which only a person can judge. The list is in the frontmatter above.

## Goal Achievement

### Observable Truths (the six roadmap success criteria, the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every one of the eighteen names opens on its starting numbers on each preset, draws its shade, lines, section and DATA rows, and the five vees draw five different sections | VERIFIED | All eighteen names are in `lib/geometry/bottom.ts` (`BOTTOM_CUT_NAMES`, the starting-number table at lines ~205-227). `bottom.test.ts` "starting numbers (D-08)" and "Start >= Deepest >= End on every board with fins" pass; `bottom-draw.test.ts:756` "the five vees draw five different sections" passes; e2e `bottom-panel.spec.ts:195` does the same in the browser (passed in the go-live gate). |
| 2 | A board with every section flat and no channels counts today's litres bit for bit, and no preset card's litres moves | VERIFIED | `phase17-litres-pin.test.ts` (102 boards, `toPrecision(17)`) passes; `design.ts` adds nothing to the input for a flat bottom (`bottomHasCut` gate, lines 199-208); presets reset to `DEFAULT_BOTTOM` (`design-store.tsx:907`). Production: 31 saved boards, "0 whose litres differ from today's" (17-16-SUMMARY). |
| 3 | For any cut, VOLUME's litres, the 3D board's surface, the STL's enclosed volume and DATA's stringer-left column agree with the one foam-off function | VERIFIED | One function, `foamOff` in `bottom.ts`, read through one sampler (`bottomSampler`) built in `design.ts` and handed to `volume.ts` as `foamOffAt`; `volume.ts` imports no bottom, outline, wing or fin file (`bottom-source.test.ts` import-graph test passes). `cnc-files.test.ts` "the CNC files carry the bottom's cut" (slice at the Deep Single's deepest station within 0.05 mm of `foamOff`; STL one closed skin) passes; `board-surface.test.ts` passes. DATA's first line reads the same sampler (`bottomLitresLine`, `stringerAtCenter`). |
| 4 | RAILS works from what the bottom leaves, FINS shows the contour under the fins, and a fin move on FINS carries a tail cut's Deepest At and the channels' Start and Deepest At | VERIFIED | RAILS: `design-store.tsx:1409-1418` builds `railsOnBottom` / `railBandsOnBottom`; `rail-band-editor.tsx:53-64,310` and the plots read them; `rail-bottom.test.ts` passes. FINS: `fin-viewer.tsx:498-525` paints `bottomShadeBands / bottomContourLines / bottomPencilLines` under the fins. Fin carry: the tail cut's Deepest At and the channels' `startFromFins` / `deepestFromFins` are stored as distances from the front fins (`bottom.ts` lines 63-66, 288, 427-428); `bottom.test.ts` "the tail's deepest from the fins (D-03)" passes. |
| 5 | A board saved before this phase opens flat with nothing rewritten; a board saved with a bottom reopens exact; a board file carries it | VERIFIED | `design-snapshot.ts` rule 14 (optional `bottom`, forgiving per-part parse, never adds a key to a board without one); `design-snapshot.test.ts`, `board-file.test.ts`, `open-board.test.ts`, `saved-board-open.test.ts` all pass; no change to `lib/db/schema.ts`, `drizzle/` or `package.json` between `79294d56` and `ff5818c0` (empty diff). Production: 31 of 31 saved boards open, 25 of them version 5, 0 rewritten (17-16-SUMMARY, run by the founder). |
| 6 | Eight screens everywhere; the phone stack, the sideways phone and the desktop shell pass their browser specs; Metric reads marks in whole millimetres and dims in centimetres; the order form and the Overview Sheet carry the bottom's lines and the templates draw no contour | VERIFIED (visual parts to the founder, see human_verification) | `NAV_LINKS` lists eight with BOTTOM third (`components/site-nav.tsx:33-42`); `screen-steps.test.ts` passes; browser specs `phone-bottom`, `bottom-screen`, `bottom-panel`, `bottom-viewer`, `bottom-metric`, `bottom-guide`, `bottom-wings`, `bottom-saving`, `summary-bottom-page` exist and passed in the go-live gate (1,818 passed; 9 timing failures, every one re-run alone and passing, see Behavioral Spot-Checks). `bottom-print.test.ts` and `bottom-sheet-fit.test.ts` pass; `bottom-source.test.ts` "the full-size prints carry no contour (D-26)" passes. I did not run the browser suites; I relied on the go-live record for those. |

**Score:** 6/6 truths verified. 0 present-but-behavior-unverified: the behavior-dependent truths (litres agreement, fin carry, flat bit-for-bit) each have a passing named test.

### Requirements Coverage (R1 to R15, from 17-SPEC.md)

`.planning/REQUIREMENTS.md` does not exist: the file was archived per milestone (`.planning/milestones/v1.1` to `v1.4-REQUIREMENTS.md`) and none of these carry R1 to R15. As the brief says, 17-SPEC.md is the source. Every ID R1 to R15 appears in at least one plan's `requirements:` frontmatter (R1: 08, 14, 16; R2: 01, 02, 05, 09; R3: 01, 02, 03, 05, 06; R4: 02, 05, 08, 09; R5: 06, 09; R6: 07, 08, 10; R7: 07, 08, 10; R8: 03, 05, 06, 08, 10; R9: 07, 11; R10: 01, 12; R11: 01 to 06, 13, 16; R12: 12, 16; R13: 02, 07, 08, 09, 10, 13, 14, 15; R14: 03, 04, 15, 16; R15: all). No orphans.

| Req | Description | Status | Evidence |
|-----|-------------|--------|----------|
| R1 | BOTTOM screen between ROCKER and RAILS, eight screens everywhere | SATISFIED | `site-nav.tsx` `NAV_LINKS`; `app/design/bottom/page.tsx`; `lib/screen-steps.ts` + test; `lib/geometry/screen-tiles.ts`; live check 17-16 (`/design/bottom` 200, eight links). |
| R2 | Five cuts behind eighteen names in three sections; Bonzer left out | SATISFIED | 18 names present in `bottom.ts`; `bottom.test.ts` "the names (D-04)". |
| R3 | Contours only take foam away, cuts stack, one number, depth 0 to 1/2" | SATISFIED | `foamOff` sums non-negative terms, floors at `BOTTOM_FLOOR`; `bottom.test.ts` "cuts stack, run past their section", "never leaves less than 1/4\"". |
| R4 | Controls per cut (Cut picker, Off Rail, Off Stringer, Trough At, Start/Deepest/End from nearest tip, Depth, Smoothness, Vee Lift, Teardrop tick box); order kept; every section opens flat | SATISFIED | `bottom-controls.tsx`, `bottom-section.tsx`; `keepStationsInOrder`, `stationFromNearestTip`, `DEFAULT_BOTTOM`; `bottom-copy.test.ts`; `e2e/bottom-panel.spec.ts`. |
| R5 | Channels inside TAIL, none to start, Parallel; the sawtooth; Run, Longest, Stagger, fit | SATISFIED | `bottom.ts` `channelFit`, `channelEdges`, `channelFoamOff`, `startingChannels` and the channel sections of `bottom.test.ts` (golden for every count, run and length order). Run option words are superseded by D-44 (Angle slider); that is a later ruling, not a gap. |
| R6 | The bottom from above: shade, 1/16" lines, pencil lines, fins, draggable cutting line | SATISFIED | `bottom-draw.ts` (`BOTTOM_CONTOUR_STEP` = 1/16"; shade wash steps at 1/32" under D-12's wash); `bottom-top-view.tsx`; `bottom-draw.test.ts`. |
| R7 | Cross-section at a station, gauge-style depths, Height x1/x2/x4/x8, ghost rail, ruler | SATISFIED | `bottom-draw.ts`, `bottom-section.tsx`, `section-station.ts`; `bottom-draw.test.ts`; `e2e/bottom-viewer.spec.ts`. |
| R8 | DATA: first line, every 6", layout-marks table | SATISFIED | `bottom.ts` `bottomLitresLine`, `BOTTOM_DATA_STEP`, layout marks (`bottom.test.ts` "DATA: ..."); `bottom-data.tsx`. |
| R9 | GUIDE, third tab, nineteen cards | SATISFIED | `bottom-guide-words.ts` (19 cards, tested), `bottom-guide.tsx`, `bottom-cartoon.tsx`; `e2e/bottom-guide.spec.ts`. The words are first drafts by design (SPEC A1). |
| R10 | Wing rule is a selector, narrowest by default, only on a winged board | SATISFIED | `bottom-controls.tsx:79`, `bottom-copy.ts:58`; `bottom.ts` `refAt`; `e2e/bottom-wings.spec.ts`; tests on the winged Fish in `bottom.test.ts` (D-38). |
| R11 | Everything reads the one number: litres, 3D, CNC, RAILS, FINS, fin-anchored stations | SATISFIED | See truths 3 and 4. |
| R12 | Saved with the board, no database change | SATISFIED | See truth 5. |
| R13 | Rule 2 throughout | SATISFIED | No `25.4` in any new bottom file; the `bottom-source` test passes; `e2e/bottom-metric.spec.ts`; `measure-display.ts`. |
| R14 | On paper: BOTTOM CONTOURS page only when there is a cut; Overview Sheet lines; nothing full size | SATISFIED | `components/summary/bottom-contours-sheet.tsx`, `bottom-sheet-fit.ts`, `order-form.tsx` (`bottomHasCut` gate); `bottom-print.test.ts`, `bottom-sheet-fit.test.ts`; `e2e/summary-bottom-page.spec.ts`. |
| R15 | Shown before it ships; one go-live; nothing pushed without his go | SATISFIED | 17-16-SUMMARY: before/after pictures; the founder's "Go" at the gate; one push, 2026-11-10. |

### Required Artifacts and Key Links

| Artifact | Status | Details |
|----------|--------|---------|
| `lib/geometry/bottom.ts` (1,427 lines): the one number | VERIFIED | Pure (no React/DB imports, checked by test); exports `foamOff`, `bottomSampler`, channels, DATA helpers; goldens from `reference/sketches/021-bottom-maths.js` via `scripts/extract-sketch021-bottom-golden.mjs` |
| `lib/geometry/bottom-draw.ts`, `bottom-print.ts`, `bottom-tile-art.ts` | VERIFIED | Substantive and tested; read by the editor, FINS, the order form and the phone tile |
| `components/bottom/*` (editor, controls, section, top view, data, guide, cartoon) | VERIFIED | Wired into `app/design/bottom/page.tsx` through `BottomEditor`; read the store's `bottom` |
| `lib/models/design-snapshot.ts` rule 14 | VERIFIED | Optional, forgiving, flat when absent |
| `lib/models/bottom-report.ts` | VERIFIED | The read-only saved-boards report that produced the production result |
| Key link: `design-store` -> `design.ts` -> `volume.ts` (`foamOffAt`) | WIRED | `design.ts:199-208`, `volume.ts:561-577`; import-graph test |
| Key link: store -> RAILS (`railsOnBottom`) | WIRED | `design-store.tsx:1409-1418` -> `rail-band-editor.tsx` |
| Key link: store -> FINS contour | WIRED | `fin-viewer.tsx:498-525` |
| Key link: store -> order form | WIRED | `order-form.tsx` reads `bottom`, `bottomBoard`, `resolvedBottom`; gated by `bottomHasCut` |
| Key link: 3D / CNC read the cut through `boardSections` | WIRED | `cnc-files.test.ts` + `board-surface.test.ts` prove the surface carries the cut; `three` is imported only in `components/3d/board-scene.ts` |

### Prohibitions (17-SPEC.md)

All the SPEC's prohibitions that are judged by a source or import-graph test pass here: no reader computes foam off itself; `volume.ts` imports no bottom/outline/wing/fin; the full-size prints carry no contour; the reference copy is not imported; no `25.4` outside `units.ts`; `three` only in `board-scene.ts`; no database change; no new package (`git diff` of `lib/db/schema.ts`, `drizzle/`, `package.json`, `package-lock.json` between `79294d56` and `ff5818c0` is empty); presets open flat; `DESIGN_SNAPSHOT_VERSION` unchanged. None is violated.

### Behavioral Spot-Checks (run in this verification)

I ran the named test files alone (never the whole suite, per instruction):

| Group | Files | Result |
|-------|-------|--------|
| Litres pin, import-graph and drawing/print tests | `phase17-litres-pin`, `bottom-source`, `bottom-draw`, `bottom-print`, `bottom-tile-art`, `rail-bottom`, `bottom-report`, `components/bottom/*`, `screen-steps`, `bottom-sheet-fit` | 11 files, 741 tests passed |
| The board maths | `bottom.test.ts`, `design.test.ts`, `volume.test.ts` | 3 files, 2,032 tests passed (alone, so the CR-01 foam-off sweep stayed inside its 5-second allowance) |
| Saving, board files, CNC, 3D surface | `design-snapshot`, `board-file`, `open-board`, `saved-board-open`, `lib/export`, `components/3d`, `board-surface`, `rail-bottom` | 9 files, 1,571 tests passed |

The orchestrator's full-suite run (12,112 passed, 2 skipped, 3 failed) is explained: the three failures were 5-second timeouts under full-suite load (the CR-01 sweep in `bottom.test.ts`, the R3 diamond in `rack-art.test.ts`, the Sharp Bottom Tuck in `finished-rail.test.ts`); each passes alone. That is a test-budget follow-up, not a failure of the board maths.

`npx tsc --noEmit` in this worktree reports only two `Cannot find name 'LayoutProps'` errors in `app/layout.tsx` and `app/design/layout.tsx`: Next's generated route types are not present in a fresh worktree (the known `next typegen` gotcha). The go-live gate ran route types, TypeScript and lint clean at `25fa9fed`. Not a defect.

**Browser evidence** (not run by me; taken from 17-16-SUMMARY): production build and production-build specs pass; desktop baselines pass; the full webpack browser suite 1,818 passed, 1,365 skipped, 9 failed, every one re-run alone: seven passed straight away, `summary-blank:197` passed alone under both webpack and Turbopack, and `phone-sideways-top-bar:327` is a flaky stopwatch on the home page load (follow-up: a longer allowance).

### Anti-Patterns Found

None. No `TBD`, `FIXME` or `XXX` in any line the phase added (`git diff 79294d56 ff5818c0`, source files); the new files hold no stubs, hardcoded empty data paths or placeholder returns; the tests type no expected figure (goldens come from the sketch's own functions).

### Known, Ruled and Not Counted as Gaps

- **D-44** (channel Angle slider) supersedes `17-UI-SPEC.md`'s old Run option words, which still show the old text. The spec file is stale; the code and tests follow D-44.
- **D-45 / review WR-01:** a channel cut deeper than the foam keeps today's warning and numbers for go-live; a clearer sentence is a follow-up.
- **Saving bottom presets** was asked for and withdrawn: not a requirement.
- **Review:** 17-REVIEW-FIX.md says three findings fixed (CR-01, WR-02, WR-03), one skipped by ruling (WR-01 / D-45); IN-01 and IN-03 are untouched Info items.
- **Deferred-items file:** its one item is closed.

### Follow-ups worth planning (none blocks)

1. Give the three slow tests a bigger time allowance (`bottom.test.ts` CR-01 sweep takes about 3.4 s alone against 5 s; also `rack-art.test.ts` R3 diamond and `finished-rail.test.ts` Sharp Bottom Tuck), and the `phone-sideways-top-bar:327` home-page load.
2. A clearer sentence for the deep-channel warning (D-45, IN-02), words to the founder first.
3. A pictured GUIDE card for each way of laying channels; BOTTOM's GUIDE adopting Phase 18's shared card; CLAUDE.md still does not describe BOTTOM's GUIDE beside the other five.
4. `17-UI-SPEC.md` still shows the old Run option words.
5. Bookkeeping: `.planning/ROADMAP.md` still shows Phase 17 unticked (`- [ ] **Phase 17`) and says "verification and the founder's walk-through still to come"; `.planning/REQUIREMENTS.md` does not exist (R1 to R15 live only in 17-SPEC.md).
6. From the founder's looks at the go-live: the Angle's Reset can sit under the floating Undo/Redo pair on a phone until scrolled; "set by hand" wraps to two lines on a computer; eight channels reach the inch floor almost at once; whether a NOSE/CENTER/TAIL tap should scroll its section to the top; the 177-dot controls box on the shortest upright iPhone and the sideways page at 360 dots; FINS' two 42-dot buttons; one slow slider drag as one Undo step; his iPhone print of the new page.

### Gaps Summary

No gaps. Every roadmap success criterion and every requirement R1 to R15 is delivered in the code, wired to its readers, and covered by tests that pass here and by the go-live gate and the founder's own production check. The phase waits only for the founder's walk-through of the things a person has to judge, listed under `human_verification`.

---

_Verified: 2026-11-11T05:28:10Z_
_Verifier: Claude (gsd-verifier)_

## Close-out (2026-11-11)

The founder walked all eleven checks on the live site (`17-UAT.md`): eight passed outright, two found things to fix
(G-17-5, VOLUME's words; G-17-6, the finished rail rounding the channels), and one was set aside (the CNC-files check,
because that export is being replaced by a .brd file — recorded above as an override: accepted open, **not tested**).

Both gaps were fixed inside the phase by seven more plans (17-17 to 17-23), each approved by him from before-and-after
pictures, and went live on his word as main `93c0ea8f`. He re-checked both on the live site: "Pass all 3". Along the
way he changed one earlier ruling: RAILS now draws every concave (D-41's "a concave changes nothing on RAILS" is
retired); a vee or belly still lifts and thins the rail, and channels are cut last.

The fix waves were pushed before their code review; the review was run afterwards on the live code
(`17-FIXWAVE-REVIEW.md`: no blockers, three warnings, three notes). On his word ("Close 17, log as follow-ups") the
three warnings are to-dos, with the five production-build browser tests that were not run before the push and the
ESTIMATE tab's words (`.planning/todos/pending/2026-11-11-*.md`). Security: `17-SECURITY.md`, 37 threats, none open.

_Closed: 2026-11-11 — status set to passed by the orchestrator after the founder's walk-through and re-check._
