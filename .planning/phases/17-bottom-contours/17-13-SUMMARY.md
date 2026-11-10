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
  - FINS' tail drawing showing the bottom's contours under the fins, read-only, only for this board's own tail and only when something is cut
  - browser proof that moving the front fins on FINS carries the tail cut's deepest station and the channels on BOTTOM
  - browser proof that BOTTOM reads all-metric for a Metric shaper, and a unit check that keeps every BOTTOM file reading its measurements through the one unit boundary
affects:
  - components/fins/fin-viewer.tsx (one read-only group in the tail drawing, absent on a flat board)
  - lib/units-isolation.test.ts (BOTTOM's whole folder and the bottom's geometry files added to the units check)
tech-stack:
  added: []
  patterns:
    - a second page paints the bottom through the same pure drawing functions, with its own board-to-drawing map and nothing worked out in the component
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
    - lib/units-isolation.test.ts
decisions:
  - "FINS draws the bottom only while Import Designed Board is ticked and the bottom has a cut. A flat board, or the box unticked, adds nothing to the drawing at all — not an empty group."
  - "What FINS draws is BOTTOM's own shade, 1/16\" lines and pencil lines, in the pencil grey, under the fins and every dimension. Nothing in it can be pressed or dragged."
  - "The shade is allowed to trail a fin slider by a moment so the slider stays under the finger."
  - "No file under components/bottom needed a change for Metric: every label already read through the unit boundary. This plan pins that with a browser test and a units check instead of rewriting anything."
  - "A Depth kept at the full 1/2\" (12.7 mm) reads 13 mm on its label in Metric while its thumb rests at the track's last whole millimetre, 12 mm — and showing it that way writes nothing to the board."
metrics:
  duration: about 1 h on the clock (2026-11-10 00:54 to 01:55 UTC)
  completed: 2026-11-10 UTC (Tasks 1 and 2; Task 3 is the founder's look)
actuals:
  tokens: 16400
  tasks: 2
  commits: 4
---

# Phase 17 Plan 13: The bottom under the fins on FINS, and BOTTOM in Metric — Summary

FINS' tail drawing now shows what is cut into the bottom under the fins, moving the fins on FINS is proven to carry the
tail cut and the channels on BOTTOM, and BOTTOM is proven to read all-metric for a Metric shaper — millimetres for the
marks, centimetres for the size and every station.

## What changes for the founder

- **FINS shows the bottom under the fins.** With a cut on BOTTOM, FINS' tail drawing carries the same shade (darker is
  deeper), the same lines at every 1/16" and the same pencil lines — the channels' walls as the heavier lines — that
  BOTTOM's view from above draws. They sit under the fins and under every dimension, so the fins read exactly as they
  did. Nothing in it can be pressed or dragged; it is there to look at while you place fins.
- **A flat board's FINS is exactly as it was.** Nothing is added to the drawing for a board with no cut. The reference
  pictures the tests keep of the computer's screens did not move.
- **Only this board's own tail.** Untick **Import Designed Board** and FINS draws a tail from the numbers typed in, not
  your board's — so nothing of the bottom is drawn on it. Tick it again and the bottom is back.
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

## Tasks

| Task | What | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | FINS shows the contour under the fins, and a fin move carries the fin-anchored stations | `cc0d0335` | `components/fins/fin-viewer.tsx`, `e2e/fins-contour.spec.ts` |
| 2 | BOTTOM in Metric — every mark in whole millimetres, every dim in centimetres | `cd57f16e` | `e2e/bottom-metric.spec.ts`, `lib/units-isolation.test.ts` |
| 3 | The founder's look (checkpoint) — the picture | `eb7b9cd1` | `pictures/17-13-fins-and-metric.png`, `pictures/17-13-pictures-source.tar.gz`, this summary |

## Verification

Every run below finished before this was written. All browser runs used port 3313.

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
| The picture run (scratch, port 3313) | 3 passed, 3 skipped, 0 failed — exit 0 (76 s) |
| Nothing under `drizzle/` or in `lib/db/schema.ts` changed; no `db:*` command and no saved-boards check was run | confirmed by `git diff --name-only` (six files, listed above) |

What the tests hold:

- **FINS and the bottom (computer):** a flat Shortboard's tail drawing has no contour element at all; with a Spiral Vee
  and six channels it has the shade, the lines and the walls, none of which takes a press; unticking Import Designed
  Board removes them all and ticking it brings them back; moving the front fins 1" toward the nose moves the tail cut's
  Deepest At and the channels' Start and Deepest At with them while a Center cut stays; and a fin move past the tail
  cut's Start shows Start pushed to Deepest At, with the board written only when a BOTTOM slider is actually moved.
- **BOTTOM in Metric (computer and an Android phone):** with a Deep Single Concave, a Spiral Vee and six channels, every
  slider's label, end labels and thumb position, the size line, the section's heading, its gauges and ruler, the marks
  along the rail, the warning sentence, the litres line and every DATA heading and row match what the app's own unit
  rule gives for the stored value — in Imperial, then Metric, then Imperial again — and the kept board is identical
  before and after. No expected string in that test is typed by hand.
- **The units check (unit test):** every file under `components/bottom`, the bottom's three geometry files and FINS'
  viewer carry no inch or centimetre factor of their own, name no one-system formatter, convert no measure themselves,
  and read the units system only through the display boundary. The check walks the folder, so a new file is covered.

### Measured, for the founder

- **What FINS draws for a Spiral Vee and six channels:** 16 levels of shade, 8 levels of 1/16" line and 3 drawn wall
  paths (as counted in the page). For a flat board, and with Import Designed Board unticked: nothing.
- **The fin move:** front fins 11" to 12". Tail cut: Start 23" and End 0" unchanged, Deepest At 11" to 12". Channels:
  Start 23" to 24", the inner pair 19" to 20", Deepest At 11" to 12", End 0" unchanged.
- **Imperial beside Metric on the same board:** `6'2" / 18 3/4" / 2 1/4"` is `188.0 cm / 47.6 cm / 5.7 cm`; the section
  `11" from the tail, 13 3/4" wide` is `27.9 cm from the tail, 34.9 cm wide`; `3/16" rail lift` and `1/2" in the channel`
  are `5 mm` and `13 mm`; the ruler `1 3/4" 3 1/2" 5 1/4"` is `44 89 133`; the warning's `1/4"` is `6 mm`; the litres
  line's `finishes 2 1/16" at the center, planed 2 1/4"` is `finishes 53 mm at the center, planed 57 mm`. Litres are the
  same in both: foam off 1.50 L, 28.11 L now, 29.61 L before contours.
- **The picture:** 5400 × 6539 dots, thirteen numbered pictures in three columns.

## Deviations from Plan

### Followed a ruling instead of the plan

**1. The commit trailer.** The plan names a different trailer; the brief sets
`Co-Authored-By: Claude <noreply@anthropic.com>`, and every commit ends with that.

**2. The reference pictures were run at the base commit first.** Ruling 3 asks for proof that a flat board's FINS is
untouched, so the computer's reference-picture test was run before any change (6 passed) and again after (6 passed, no
picture changed). The plan asked only for the run after.

**3. More pictures than the plan's list.** Ruling 6 adds the tail with Import Designed Board unticked and an upright
phone in both systems; both are on the sheet.

### Raised for the founder — a plan expectation that measured differently (ruling 8)

**4. The warning sentence in Metric names millimetres, not a station in centimetres.** The plan expected a warning
that names a station in centimetres. On the Shortboard only the rail's warning can be raised ("leaves the rail under
6 mm near the tail"); the stringer's warning, the one that names where, cannot be reached with this board's thickness.
The browser test pins the rail's warning in both systems; the stringer's wording is already pinned in both systems by
`components/bottom/bottom-copy.test.ts`.

**5. A Depth of exactly 1/2" reads 13 mm in Metric, on a track that ends at 12 mm.** 1/2" is 12.7 mm. The track's end
label is the last whole millimetre inside the range, `12 mm`, which is what the plan's "the Depth slider stops at
12 mm" describes. A board that already keeps the full 1/2" shows `13 mm` on its label (12.7 rounded) with its thumb at
the end of the track, and showing it writes nothing. The test pins exactly that. If you would rather that label read
`12 mm`, or the Metric track run to 13, that is your call — it is the same rule every mark slider in the app follows.

### Small things added or adjusted while building

**6. No file under `components/bottom` was changed.** The plan lists `bottom-controls.tsx`, `bottom-data.tsx`,
`bottom-section.tsx`, `bottom-top-view.tsx` and `bottom-copy.ts` as files that might need a Metric fix. None did:
walking every label in Metric found no miss. The plan's work for Task 2 became the browser test and the units check.

**7. The FINS test runs on the computer only, and the Metric test skips the iPhone.** Both tests drive BOTTOM's side
panel. BOTTOM on a phone is the next plan's (17-14), so the FINS test is the computer's, and the Metric test runs on
the computer and one phone (Android) — enough to prove the words, without pinning a phone layout that is about to
change.

**8. The shade is allowed to trail a fin slider.** Not in the plan: the shade is the heavy part of the drawing, so it
is let lag a moment behind a moving fin slider rather than make the slider stutter. It settles as soon as the slider
rests.

**9. A slider's position is read from what the app reports, not from the browser's own range box.** A test-only
finding: the hidden range box snaps to its step, so the Metric test reads the thumb's true value instead.

### Seen while taking the pictures, and left alone

**10. A vee and six channels together make FINS' tail busy.** Picture 2 shows it: the shade, the 1/16" lines and the
walls, all under the fins. It is what the design page asks for, drawn faithfully. If you would rather FINS drew less —
the walls and the shade only, for instance — say so at the look.

**11. On an upright phone, DATA's two tables show their headings and no rows, in both systems.** The rows are in the
page (the Android test reads them) but squeezed out of sight. This was so before this plan and is not a Metric fault.
BOTTOM on a phone is 17-14's, so it is left for that plan; pictures 12 and 13 show it.

**12. On BOTTOM's view from above, the START, DEEPEST and END marks under the board show only while a tail row is in
hand.** That is why picture 6's "before" has them and its "after" (taken on arriving at BOTTOM, nothing touched) does
not. The FRONT FINS line reads 11" and then 12" in both.

## Known Stubs

None.

## Threat Flags

None. FINS reads the bottom and draws it; nothing here takes input, saves, or reaches the network. The plan's two
threats are covered: a Metric shaper's labels can no longer drift from the stored values without a test failing
(T-17-18), and a switch of system is proven to write nothing (T-17-03).

## Founder's look: Pending

**The picture:** `.planning/phases/17-bottom-contours/pictures/17-13-fins-and-metric.png` (its sources are archived
beside it as `17-13-pictures-source.tar.gz`). Every picture on it is the running page on a 6'2" Shortboard.

What to look for:

1. FINS' tail shows the vee's shade and the channel walls under the fins, read-only; a flat board's FINS looks exactly
   as before (pictures 1, 2 and 3).
2. Move the front fins on FINS and the tail cut's deepest station and the channels' start and deepest follow on BOTTOM
   (pictures 4, 5 and 6).
3. In Metric, depths and marks read whole millimetres and stations centimetres; the Depth slider stops at 12 mm
   (pictures 8 to 11 and 13).

For your call while you look: whether FINS' tail is too busy with a vee and six channels together (item 10 above),
whether a kept 1/2" Depth should read 13 mm or 12 mm in Metric (item 5), and the phone's DATA rows (item 11, the next
plan's).

Type "approved", or describe what should change.

## Self-Check: PASSED

- Files: `e2e/fins-contour.spec.ts`, `e2e/bottom-metric.spec.ts`, `pictures/17-13-fins-and-metric.png` and
  `pictures/17-13-pictures-source.tar.gz` all exist in the worktree.
- Commits: `cc0d0335`, `cd57f16e` and `eb7b9cd1` are on `worktree-agent-a5c3348348b0c6dd8`, on top of `8094b2bf`.
- `STATE.md` and `ROADMAP.md` were not touched.
