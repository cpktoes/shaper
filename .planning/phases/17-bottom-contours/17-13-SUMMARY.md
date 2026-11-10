---
phase: 17-bottom-contours
plan: 13
subsystem: bottom-screen
status: checkpoint
tags: [bottom, fins, contours, metric, units, display-only]
requires:
  - 17-01..17-06 (the bottom's maths in `lib/geometry/bottom`, with the tail cut and the channels tied to the front fins)
  - 17-07 (the bottom's drawings, pure, in `lib/geometry/bottom-draw.ts`)
  - 17-08..17-10 (the BOTTOM screen, its rows, VIEWER and DATA)
  - 17-12 (the bottom kept with the board, merged as 8ca00e9e)
provides:
  - FINS' tail drawing able to show the bottom's contours under the fins, read-only, on a Bottom Contours button that is off to start and is there only for this board's own tail with something cut
  - browser proof that moving the front fins on FINS carries the tail cut's deepest station and the channels on BOTTOM
  - browser proof that BOTTOM reads all-metric for a Metric shaper, and a unit check that keeps every BOTTOM file reading its measurements through the one unit boundary
affects:
  - components/fins/fin-viewer.tsx (one icon button in the drawing's top-right row and one read-only group in the tail drawing, both absent on a flat board)
  - components/fins/fin-placement-editor.tsx (keeps the button's on/off beside the callouts button's)
  - lib/units-isolation.test.ts (BOTTOM's whole folder and the bottom's geometry files added to the units check)
tech-stack:
  added: []
  patterns:
    - a second page paints the bottom through the same pure drawing functions, with its own board-to-drawing map and nothing worked out in the component
    - a view choice kept as plain screen state beside the screen's other view toggle, never in the board and never an Undo step
    - a folder walk in the units check, so a new BOTTOM file is covered the day it is added
    - every expected Metric string in the browser test is computed from the stored value through the app's own unit rule, never typed
key-files:
  created:
    - e2e/fins-contour.spec.ts
    - e2e/bottom-metric.spec.ts
    - .planning/phases/17-bottom-contours/pictures/17-13-fins-and-metric.png
    - .planning/phases/17-bottom-contours/pictures/17-13-pictures-source.tar.gz
  modified:
    - components/fins/fin-viewer.tsx
    - components/fins/fin-placement-editor.tsx
    - lib/units-isolation.test.ts
decisions:
  - "FINS draws the bottom only when its Bottom Contours button is pressed. The button is off every time FINS opens (the founder, at his first look: \"let's add a contour toggle icon to FINS with default off\")."
  - "The button is there only when there is something to show: Import Designed Board is ticked and the bottom has a cut. A flat board, or the box unticked, adds nothing to FINS at all — no button, no drawing, not an empty group."
  - "The button's on/off is a view choice, kept exactly the way the fin placement callouts button beside it is kept (and ROCKER's toolbar buttons): not saved with the board, not an Undo step, kept while you switch between VIEWER and DATA, back to off when you leave FINS or reload."
  - "The icon is three wavy lines running up and down (lucide's WavesVertical), the way the bottom's lines run along the tail on this drawing. The app's striped icon already means the 3D screen's zebra stripes, and a stack-of-layers icon reads as 3D."
  - "What FINS draws when the button is on is BOTTOM's own shade, 1/16\" lines and pencil lines, in the pencil grey, under the fins and every dimension. Nothing in it can be pressed or dragged."
  - "The shade is allowed to trail a fin slider by a moment so the slider stays under the finger."
  - "No file under components/bottom needed a change for Metric: every label already read through the unit boundary. This plan pins that with a browser test and a units check instead of rewriting anything."
  - "The Depth slider's end label stays 12 mm in Metric (the founder: \"leave the 12 mm\"). A Depth kept at the full 1/2\" (12.7 mm) reads 13 mm on its own label with its thumb at the end of that track, and showing it that way writes nothing to the board."
metrics:
  duration: about 1 h on the clock for the first pass (2026-11-10 00:54 to 01:55 UTC), then about 35 min for the button after the founder's first look (finished 02:35 UTC)
  completed: 2026-11-10 UTC (Tasks 1 and 2, and the change from the first look; Task 3 is the founder's look)
actuals:
  tokens: 19700
  tasks: 2
  commits: 7
---

# Phase 17 Plan 13: The bottom under the fins on FINS, and BOTTOM in Metric — Summary

FINS' tail drawing can now show what is cut into the bottom under the fins, on a Bottom Contours button that is off to
start; moving the fins on FINS is proven to carry the tail cut and the channels on BOTTOM; and BOTTOM is proven to read
all-metric for a Metric shaper — millimetres for the marks, centimetres for the size and every station.

## What changes for the founder

- **FINS has a Bottom Contours button, off to start.** With a cut on BOTTOM, FINS' tail drawing gains one icon button
  in its top-right row, left of the fin placement callouts button: three wavy lines, named **Show bottom contours**.
  Until you press it, FINS looks exactly as a flat board's. Pressed, it fills with the accent colour like the button
  beside it, its name becomes **Hide bottom contours**, and the drawing shows the bottom under the fins. Press it again
  and the bottom is gone.
- **What the button shows.** The same shade (darker is deeper), the same lines at every 1/16" and the same pencil lines
  — the channels' walls as the heavier lines — that BOTTOM's view from above draws. They sit under the fins and under
  every dimension, so the fins read exactly as they did. Nothing in it can be pressed or dragged; it is there to look
  at while you place fins.
- **It is a view choice, not part of the board.** It is not saved, it is not an Undo step, and nothing is written to
  the board when you press it. It stays as you left it while you switch between VIEWER and DATA, and it is off again
  each time you come to FINS.
- **A flat board's FINS is exactly as it was.** No button and nothing in the drawing for a board with no cut. The
  reference pictures the tests keep of the computer's screens did not move.
- **Only this board's own tail.** Untick **Import Designed Board** and FINS draws a tail from the numbers typed in, not
  your board's — so nothing of the bottom is drawn on it and the button is gone from the row. Tick it again and the
  button is back, as you left it.
- **On a phone or tablet the button takes a 44-dot touch.** It is drawn the same 34 dots as the button beside it, with
  an unseen touch area round it.
- **Move the fins and the bottom follows.** Slide the front fins 1" toward the nose on FINS (11" to 12" off the tail) and,
  on BOTTOM, the tail cut's **Deepest At** reads 12" where it read 11", the channels' **Start** reads 24" where it read
  23" (the inner pair 20" where it read 19") and their **Deepest At** 12" — with no slider on BOTTOM touched. The tail
  cut's own **Start** stays at 23", and a cut in the CENTER does not move. That link was already in the bottom's maths;
  this plan shows it on FINS and proves it in the browser.
- **BOTTOM in Metric is all-metric.** Pick Metric in App Default Settings and every depth, Off Rail, Off Stringer, Vee
  Lift and Channel Width reads in whole millimetres; the size line, every Start, Deepest At and End, the Stagger, the
  marks along the rail and the section's heading read in centimetres to one decimal. Depth reads `6 mm` on a track
  whose end label is `12 mm`; the ruler under the section reads `44 89 133` under `OFF THE STRINGER · mm`; DATA's
  headings say which unit each column is in (`From the tail (cm)`, `Deepest cut (mm)`), and a 36" station reads `91.4`,
  never `914`. Litres read the same in both systems.
- **Switching is display-only.** Going to Metric and back restores every label exactly and writes nothing to the board.
- **Nothing in the database changed.** No migration, nothing to run on production.

## Changes after the first look

The founder looked at the first picture and said: **"approved, let's add a contour toggle icon to FINS with default
off, leave the 12 mm"**.

What was built for it, in one commit (`010df8a0`), with the picture taken again (`22c54b34`):

- **The button.** One icon button in FINS' drawing toolbar, built the way the app's other viewer buttons are built
  (the same shared button ROCKER's toolbar uses): the same 34-dot size, the same accent fill when pressed, a pressed
  state a screen reader hears, and one plain name that is also its tooltip — "Show bottom contours" when off, "Hide
  bottom contours" when on.
- **The icon.** Three wavy lines running up and down (lucide's `WavesVertical`). They run the way the bottom's lines
  run along the tail on this drawing. The app's own striped icon already means the 3D screen's zebra stripes, and a
  stack-of-layers icon reads as 3D, so neither was used.
- **Off to start.** A board with a cut opens FINS exactly as a flat board's. Everything built before the first look —
  the shade, the 1/16" lines, the walls — draws unchanged once the button is pressed.
- **Only when there is something to show.** The button appears only while the bottom has a cut and Import Designed
  Board is ticked. A flat board's FINS gains no element at all.
- **Where the on/off lives.** The pattern followed is FINS' own fin placement callouts button, which is also how
  ROCKER's toolbar buttons keep theirs: plain state on the screen. None of those is saved or carried across a reload,
  so this one is not either. It is not in the board, not in what a save keeps, and not an Undo step. It survives a
  switch between VIEWER and DATA and goes back to off when you leave FINS.
- **Touch size.** A 44-dot touch area on a phone or tablet, through the same shared touch box the 3D screen's icons
  and BOTTOM's section buttons use.
- **The 12 mm.** The Depth slider's end label in Metric is left exactly as built.
- **The picture.** Pictures 2 to 5 on the sheet are new (the button off, the button pressed, the button up close on a
  computer and a phone, and Import Designed Board ticked beside unticked); the fin-move pictures were taken again with
  the button pressed.

## Tasks

| Task | What | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | FINS shows the contour under the fins, and a fin move carries the fin-anchored stations | `cc0d0335` | `components/fins/fin-viewer.tsx`, `e2e/fins-contour.spec.ts` |
| 2 | BOTTOM in Metric — every mark in whole millimetres, every dim in centimetres | `cd57f16e` | `e2e/bottom-metric.spec.ts`, `lib/units-isolation.test.ts` |
| 3 | The founder's look (checkpoint) — the first picture and summary | `eb7b9cd1`, `597e6ee2` | `pictures/17-13-fins-and-metric.png`, `pictures/17-13-pictures-source.tar.gz`, this summary |
| After the first look | FINS' Bottom Contours button, off to start | `010df8a0` | `components/fins/fin-viewer.tsx`, `components/fins/fin-placement-editor.tsx`, `e2e/fins-contour.spec.ts` |
| After the first look | The picture again, for the second look | `22c54b34` | `pictures/17-13-fins-and-metric.png`, `pictures/17-13-pictures-source.tar.gz` |

## Verification

Every run below finished before this was written. All browser runs used port 3313.

### The first pass

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` (after each task, and after the last test addition) | exit 0 |
| `npm run lint` (after each task) | exit 0 — one warning that was there before (`lib/db/import-designs-action.test.ts`, an unused name) |
| Before any change: `e2e/desktop-baseline.spec.ts` on the computer, at the base commit | 6 passed, 0 failed — exit 0 (63 s) |
| Task 1: `e2e/fins-contour.spec.ts` on the computer | 3 passed, 0 failed — exit 0 (54 s) |
| Task 1: `fins-contour`, `volume-fins-panels` and `fins-off-rail` on the computer and both phones | 28 passed, 44 skipped (tests written for one profile only), 0 failed — exit 0 (129 s) |
| Task 1: `e2e/desktop-baseline.spec.ts` on the computer, after the change | 6 passed, 0 failed — exit 0 (46 s); no reference picture changed |
| Task 1: `npm test -- --testTimeout=120000` (whole unit suite) | 189 files, 11,423 passed, 2 skipped — exit 0 (286 s) |
| Task 2: `npx vitest run lib/units-isolation.test.ts lib/geometry/bottom-source.test.ts` | 2 files, 43 passed — exit 0 |
| Task 2: does the new units check bite? A throwaway file planted under `components/bottom` with an inch factor and a one-system formatter | 5 of the new checks failed, as they should; the file was removed and all pass again |
| Task 2: the plan's browser line — `e2e/bottom-metric.spec.ts` and `e2e/app-settings.spec.ts` on the computer and both phones | 29 passed, 4 skipped, 0 failed — exit 0 (153 s) |
| Task 2: `npm test -- --testTimeout=120000` (whole unit suite, final code) | 189 files, 11,430 passed, 2 skipped — exit 0 (282 s) |
| Task 2, after the last addition (the kept 1/2" Depth): `e2e/bottom-metric.spec.ts` twice over on all three profiles | 4 passed, 2 skipped (the iPhone, on purpose), 0 failed — exit 0 (70 s) |
| `git grep "25.4"` over `components/bottom` and the bottom's three geometry files | no match |
| The first picture run (scratch, port 3313) | 3 passed, 3 skipped, 0 failed — exit 0 (76 s) |

### The button, after the first look

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` (after every edit, and again on the committed code) | exit 0 |
| `npm run lint` (on the committed code) | exit 0 — the same one warning that was there before |
| `npx vitest run lib/units-isolation.test.ts lib/geometry/bottom-source.test.ts` | 2 files, 43 passed — exit 0 |
| `e2e/fins-contour.spec.ts` on the computer and the Android phone — final run | 4 passed, 4 skipped (each test is written for one profile), 0 failed — exit 0 (79 s) |
| The two runs of that file before it | 1 failed in each, both my own mistakes in the new test, not faults in the page: the first counted the new icon's own three lines as parts of the board's drawing; the second pressed Undo after unticking Import Designed Board, which is itself an Undo step. Both were fixed in the test; the page's code did not change between those runs |
| `fins-contour`, `volume-fins-panels` and `fins-off-rail` on the computer | 22 passed, 3 skipped, 0 failed — exit 0 (126 s) |
| `e2e/desktop-baseline.spec.ts` on the computer | 6 passed, 0 failed — exit 0 (68 s); no reference picture changed, none updated |
| `npm test -- --testTimeout=120000` (whole unit suite, once, final code) | 189 files, 11,430 passed, 2 skipped — exit 0 (383 s) |
| The second picture run (scratch, port 3313) | 4 passed, 4 skipped, 0 failed — exit 0 (145 s) |
| Nothing under `drizzle/` or in `lib/db/schema.ts` changed; no `db:*` command and no saved-boards check was run | confirmed by `git diff --name-only` against the base: the seven files listed above and this summary |

What the tests hold:

- **FINS and its Bottom Contours button (computer):** a flat Shortboard's tail drawing has no contour element and no
  button for one; with a Spiral Vee and six channels the button is there, not pressed, named "Show bottom contours",
  the same size as the callouts button and to its left, and the drawing is still part for part a flat board's;
  pressed, the shade, the lines and the walls draw over the tail's fill and under the fins, none of which takes a
  press, and the kept board is unchanged; pressed again they are gone; the choice survives a switch to DATA and back;
  one Undo takes back the six channels, not the button; unticking Import Designed Board removes the drawing and the
  button, and ticking it brings both back still pressed; leaving for BOTTOM and coming back finds it off.
- **The button on a phone (Android):** it starts off, is drawn the size of the button beside it, takes a touch of at
  least 44 dots each way, and a tap draws the bottom and a second tap removes it.
- **The fin move (computer), unchanged:** moving the front fins 1" toward the nose moves the tail cut's Deepest At and
  the channels' Start and Deepest At with them while a Center cut stays; and a fin move past the tail cut's Start shows
  Start pushed to Deepest At, with the board written only when a BOTTOM slider is actually moved.
- **BOTTOM in Metric (computer and an Android phone):** with a Deep Single Concave, a Spiral Vee and six channels, every
  slider's label, end labels and thumb position, the size line, the section's heading, its gauges and ruler, the marks
  along the rail, the warning sentence, the litres line and every DATA heading and row match what the app's own unit
  rule gives for the stored value — in Imperial, then Metric, then Imperial again — and the kept board is identical
  before and after. No expected string in that test is typed by hand.
- **The units check (unit test):** every file under `components/bottom`, the bottom's three geometry files and FINS'
  viewer carry no inch or centimetre factor of their own, name no one-system formatter, convert no measure themselves,
  and read the units system only through the display boundary. The check walks the folder, so a new file is covered.

### Measured, for the founder

- **The button, as measured in the page:** drawn 34 × 34 dots on a computer and on a phone; on the phone its touch
  area is 44 × 44 dots. Its name and tooltip read "Show bottom contours", then "Hide bottom contours".
- **What FINS draws for a Spiral Vee and six channels:** with the button off, nothing; with it on, 16 levels of shade,
  8 levels of 1/16" line and 3 drawn wall paths (as counted in the page). For a flat board, and with Import Designed
  Board unticked: nothing, and no button.
- **The fin move:** front fins 11" to 12". Tail cut: Start 23" and End 0" unchanged, Deepest At 11" to 12". Channels:
  Start 23" to 24", the inner pair 19" to 20", Deepest At 11" to 12", End 0" unchanged.
- **Imperial beside Metric on the same board:** `6'2" / 18 3/4" / 2 1/4"` is `188.0 cm / 47.6 cm / 5.7 cm`; the section
  `11" from the tail, 13 3/4" wide` is `27.9 cm from the tail, 34.9 cm wide`; `3/16" rail lift` and `1/2" in the channel`
  are `5 mm` and `13 mm`; the ruler `1 3/4" 3 1/2" 5 1/4"` is `44 89 133`; the warning's `1/4"` is `6 mm`; the litres
  line's `finishes 2 1/16" at the center, planed 2 1/4"` is `finishes 53 mm at the center, planed 57 mm`. Litres are the
  same in both: foam off 1.50 L, 28.11 L now, 29.61 L before contours.
- **The picture:** 5400 × 7760 dots, fifteen numbered pictures in three columns (the first look's was 5400 × 6539 with
  thirteen).

## Deviations from Plan

### Followed a ruling instead of the plan

**1. The commit trailer.** The plan names a different trailer; the brief sets
`Co-Authored-By: Claude <noreply@anthropic.com>`, and every commit ends with that.

**2. The reference pictures were run at the base commit first.** Ruling 3 asks for proof that a flat board's FINS is
untouched, so the computer's reference-picture test was run before any change (6 passed) and again after each change
(6 passed both times, no picture changed). The plan asked only for the run after.

**3. More pictures than the plan's list.** Ruling 6 adds the tail with Import Designed Board unticked and an upright
phone in both systems; both are on the sheet.

### Raised for the founder — a plan expectation that measured differently (ruling 8)

**4. The warning sentence in Metric names millimetres, not a station in centimetres.** The plan expected a warning
that names a station in centimetres. On the Shortboard only the rail's warning can be raised ("leaves the rail under
6 mm near the tail"); the stringer's warning, the one that names where, cannot be reached with this board's thickness.
The browser test pins the rail's warning in both systems; the stringer's wording is already pinned in both systems by
`components/bottom/bottom-copy.test.ts`.

**5. A Depth of exactly 1/2" reads 13 mm in Metric, on a track that ends at 12 mm — settled: "leave the 12 mm".**
1/2" is 12.7 mm. The track's end label is the last whole millimetre inside the range, `12 mm`, which is what the
plan's "the Depth slider stops at 12 mm" describes. A board that already keeps the full 1/2" shows `13 mm` on its
label (12.7 rounded) with its thumb at the end of the track, and showing it writes nothing. The test pins exactly
that. This was raised at the first look and the founder's answer was to leave it; nothing was changed.

### Small things added or adjusted while building

**6. No file under `components/bottom` was changed.** The plan lists `bottom-controls.tsx`, `bottom-data.tsx`,
`bottom-section.tsx`, `bottom-top-view.tsx` and `bottom-copy.ts` as files that might need a Metric fix. None did:
walking every label in Metric found no miss. The plan's work for Task 2 became the browser test and the units check.

**7. The FINS test runs on the computer, with one check on an Android phone, and the Metric test skips the iPhone.**
Both tests drive BOTTOM's side panel. BOTTOM on a phone is the next plan's (17-14), so the FINS tests are the
computer's — all but the one that measures the new button's touch size, which has to be a phone's and picks one cut on
BOTTOM to get there — and the Metric test runs on the computer and one phone (Android): enough to prove the words,
without pinning a phone layout that is about to change.

**8. The shade is allowed to trail a fin slider.** Not in the plan: the shade is the heavy part of the drawing, so it
is let lag a moment behind a moving fin slider rather than make the slider stutter. It settles as soon as the slider
rests.

**9. A slider's position is read from what the app reports, not from the browser's own range box.** A test-only
finding: the hidden range box snaps to its step, so the Metric test reads the thumb's true value instead.

**13. One file outside the plan's list: `components/fins/fin-placement-editor.tsx`.** The button's on/off has to live
where the callouts button's does, which is FINS' screen file, not the drawing's. Six lines were added there and
nothing else in it changed.

### Seen while taking the pictures, and left alone

**10. A vee and six channels together make FINS' tail busy — answered by the button.** Picture 3 shows it: the shade,
the 1/16" lines and the walls, all under the fins. It is what the design page asks for, drawn faithfully. Raised at
the first look; the founder's answer was the button, off to start, so a shaper sees it only on asking.

**11. On an upright phone, DATA's two tables show their headings and no rows, in both systems.** The rows are in the
page (the Android test reads them) but squeezed out of sight. This was so before this plan and is not a Metric fault.
BOTTOM on a phone is 17-14's, so it is left for that plan; pictures 14 and 15 show it.

**12. On BOTTOM's view from above, the START, DEEPEST and END marks under the board show only while a tail row is in
hand.** That is why picture 8's "before" has them and its "after" (taken on arriving at BOTTOM, nothing touched) does
not. The FRONT FINS line reads 11" and then 12" in both.

**14. The fin placement callouts button has no 44-dot touch area of its own.** It is drawn 34 dots and that is all a
thumb gets; the new button beside it has the wider touch area the brief asked for. The callouts button was there
before this plan and is not this plan's to change, so it was left as it is. If you would like the pair to match, it is
a one-line change.

## Known Stubs

None.

## Threat Flags

None. FINS reads the bottom and draws it; the new button changes only what is drawn, and nothing here saves or reaches
the network. The plan's two threats are covered: a Metric shaper's labels can no longer drift from the stored values
without a test failing (T-17-18), and a switch of system is proven to write nothing (T-17-03).

## Founder's look: Pending

**The picture:** `.planning/phases/17-bottom-contours/pictures/17-13-fins-and-metric.png` (its sources are archived
beside it as `17-13-pictures-source.tar.gz`). Every picture on it is the running page on a 6'2" Shortboard. This is the
second look: the first was approved with one change — "approved, let's add a contour toggle icon to FINS with default
off, leave the 12 mm" — and that change is what pictures 2 to 5 show.

What to look for:

1. FINS opens with the bottom not drawn and a new button to draw it; press it and the bottom shows under the fins,
   press it again and it is gone (pictures 2, 3 and 4). A flat board's FINS has no such button and looks exactly as
   before (picture 1).
2. Untick Import Designed Board and both the drawing of the bottom and the button are gone (picture 5).
3. Move the front fins on FINS and the tail cut's deepest station and the channels' start and deepest follow on BOTTOM
   (pictures 6, 7 and 8).
4. In Metric, depths and marks read whole millimetres and stations centimetres; the Depth slider's end label is 12 mm,
   left as it was (pictures 10 to 13 and 15).

For your call while you look: whether the three wavy lines read as "bottom contours" to you and the button sits where
you want it; whether the callouts button beside it should take the same wider touch on a phone (item 14 above); and the
phone's DATA rows (item 11, the next plan's).

Type "approved", or describe what should change.

## Self-Check: PASSED

- Files: `e2e/fins-contour.spec.ts`, `e2e/bottom-metric.spec.ts`, `components/fins/fin-viewer.tsx`,
  `components/fins/fin-placement-editor.tsx`, `pictures/17-13-fins-and-metric.png` and
  `pictures/17-13-pictures-source.tar.gz` all exist in the worktree.
- Commits: `cc0d0335`, `cd57f16e`, `eb7b9cd1`, `597e6ee2`, `010df8a0` and `22c54b34` are on
  `worktree-agent-a5c3348348b0c6dd8`, on top of `8094b2bf`.
- `STATE.md` and `ROADMAP.md` were not touched.
