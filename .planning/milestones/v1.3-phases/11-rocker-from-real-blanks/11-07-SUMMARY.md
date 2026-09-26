---
phase: 11-rocker-from-real-blanks
plan: 07
subsystem: rocker-drawing
status: complete
tags: [rocker, side-profile, blank, drawing, palette, D-13, D-14, D-15, R4, R15]
requires:
  - "11-04: lib/geometry/board-profile.ts (BoardSideProfile, BlankSideView, buildFallbackProfile, buildBoardProfile)"
  - "11-04: lib/geometry/rocker.ts bezierToFiveStations (the transitional bridge from the saved curve)"
  - "11-01: lib/geometry/pchip.ts (the one monotone sampler, so monotone-spline.ts could go)"
provides:
  - "RockerViewerProps { profile, blank?, callouts, orientation, showMeasuringPoints, fitToBoard, boardFill } — a read-only side profile"
  - "RockerViewLayoutInput.blankSpanIn (optional) and RockerViewLayout.boardOffsetX in components/rocker/rocker-view-frame.ts"
  - "--outline-blank-line and --outline-foam-shade drawing weights in app/globals.css"
  - "data-blank-silhouette and data-measuring-points test hooks"
affects: [11-09, 11-11, 11-12]
tech-stack:
  added: []
  patterns:
    - "the drawing is handed one side profile and draws it — no curve built in the component"
    - "an optional input to the frame that, absent, leaves every field byte-for-byte unchanged (proved by deep-equality tests)"
key-files:
  created: []
  modified:
    - components/rocker/rocker-viewer.tsx
    - components/rocker/rocker-view-frame.ts
    - components/rocker/rocker-view-frame.test.ts
    - app/globals.css
    - components/rocker/rocker-editor.tsx
    - components/summary/order-form.tsx
    - components/viewer/drag-pick-wiring.test.ts
    - components/viewer/drag-readout-chip.test.ts
    - components/viewer/drag-spacing.test.ts
    - e2e/phone-screens.spec.ts
    - e2e/viewer-toolbar.spec.ts
    - e2e/touch-drag.spec.ts
    - e2e/desktop-regression.spec.ts
  deleted:
    - lib/geometry/rocker-drag.ts
    - lib/geometry/rocker-drag.test.ts
    - lib/geometry/monotone-spline.ts
    - lib/geometry/monotone-spline.test.ts
decisions:
  - "Whether the rails show cards or readings depends on whether the board sits in a blank (profile.blank), not on whether the drawing was handed the blank's outline to draw, so the numbers always tell the truth about the board"
  - "The blank's outline is a screen-pinned 1px line, so it stays a hairline behind the board's own outline at any panel size"
  - "The rocker drawing no longer blocks touch scrolling (touch-none removed). That was only there so a finger dragging a handle wasn't taken over by page scrolling. With nothing to drag, a thumb on the drawing can now scroll a short screen's drawing column. The long-press text-selection guard stays"
  - "On the fixed (not fit-to-board) frame, a blank keeps the shared scale unless the whole blank would not fit, in which case the drawing shrinks just enough to keep the whole blank in view"
metrics:
  duration: "about 30 minutes"
  completed: 2026-09-26
actuals:
  tokens: 49000
  tasks: 3
  commits: 3
---

# Phase 11 Plan 07: The rocker drawing shows the board inside its blank, and nothing on it drags any more

The ROCKER drawing no longer builds its own curve. It is handed the board's one side profile and draws exactly that. When it is also handed the board's blank, it draws the blank's side outline faintly behind the board and shades the foam that comes off. The frame widens to fit the whole blank. The old drag handles, construction lines and the touch readout card are all gone, along with the two files that only they used.

## What a shaper sees (plain English)

- **The board inside its blank.** Once plan 11-11 lets a shaper pick a blank, the drawing shows that blank's side outline behind the board as a thin solid line around a light wash. The board's own fill covers the wash, so the only shading left showing is the foam to come off: above the deck and past each tip. It never shows under the bottom, because along the board the blank's bottom is the board's bottom. If the board is too thick for the blank, it simply pokes through the blank's line. There is no warning colour in the drawing.
- **The whole blank is always in view.** With a blank, the drawing fits the blank's full length and height, so the board draws a little smaller inside it. The numbers stay on the board's own five stations.
- **Which numbers are yours and which are calculated.** Numbers the shaper sets are shown as cards; numbers the app calculates are shown as plain readings. With no blank, all four rocker numbers and all five thicknesses are cards. With a blank, the four rocker numbers are readings (the blank decides them). So are the two 12" thicknesses (the blank derives them). The Center, Nose Tip and Tail Tip thickness stay cards. The Center rocker is always a grey dash, since it is the zero the rocker is measured from.
- **Nothing on the drawing can be dragged.** Shaping happens in the sidebar. The toolbar button that used to show construction lines is now **Show measuring points** / **Hide measuring points**, in the same slot. It shows plain dots at the board's five stations, on its bottom and deck. With a blank it also shows a dot at every station the catalogue measured. The dots start off on every device, phones included. Wide view still turns them on and puts them back on the way out.
- **Until plan 11-09**, the sidebar still has the old Nose Angle / Smoothness / Flatness sliders. The drawing shows the curve they make through its five stations, using the same conversion an older saved board gets when it is reopened. The numbers on the drawing match what the old curve read at each station. The curve between stations is now the no-overshoot curve, so its shape is slightly different. That is why the ROCKER desktop screenshot will change; plan 11-12 re-records it.
- **The Summary order form** still draws the board alone in its small rocker box, with the same readings.

## Tasks and commits

| Task | What | Commit |
|------|------|--------|
| 1 (tracer) | The drawing reads one side profile. It can show the blank behind the board with the foam shaded. The frame fits the whole blank. Adds the two palette weights, the measuring-points toggle, and the editor and order form passing the profile | `48b258d` |
| 2 | The drag-wiring, readout-card and hit-spacing unit tests are rewritten to prove the rocker drawing is read-only, and so are the phone, toolbar, touch-drag and desktop browser tests | `ff48823` |
| 3 | The drag solver and the old spline, with their tests, are deleted | `ecec30b` |

## Deleted files (merge by hand)

All four were deleted with `git rm` in Task 3's commit `ecec30b`. Before deleting, a grep confirmed nothing outside these four files imported either module; the only hits were the two test files importing their own module.

- `lib/geometry/rocker-drag.ts`
- `lib/geometry/rocker-drag.test.ts`
- `lib/geometry/monotone-spline.ts`
- `lib/geometry/monotone-spline.test.ts`

## Verification

- `npx vitest run`: 69 files, 2,682 passed, 2 skipped (the skips were already there). `rocker-view-frame.test.ts` went from 74 to 80 tests: all the old ones unchanged and green, plus six new ones in three groups:
  - With no blank, nothing moves. The layout deep-equals itself with no blank, with `blankSpanIn: undefined` and with an all-zero span. This holds for both orientations, all three rail styles, both scale rules and 60/78/120in boards. A corrupt span (negative, NaN, infinite) gives the same result.
  - The whole blank fits. Its tail end, nose end, lowest bottom and highest deck all land inside the frame, in both orientations and every rail style. Every board station card stays inside the frame too, and the fixed frame keeps the whole blank in view.
  - The numbers stay on the board's five stations. At the same scale, every rail anchor is unchanged and every station card moves along the board by exactly `boardOffsetX`.
- `npx tsc --noEmit`: exit 0, after one `npx next typegen` in the fresh worktree.
- `npm run lint`: 0 errors and 11 warnings, all of them unused `eslint-disable` directives that were already there (one is the outline half of `drag-spacing.test.ts`, which was not touched).
- Playwright, from the worktree with `IS_WEBPACK_TEST=1 PW_PORT=3157`:
  - `phone-screens` and `viewer-toolbar` on iPhone and Android: 17 passed.
  - `touch-drag` on Android: 9 passed. The 7 outline cases are unchanged and the 2 new rocker cases pass.
  - `desktop-regression` on desktop: 2 passed.
  - A wider run of `summary-print-touch-box`, `phone-layout`, `viewer-toolbar` and `phone-screens` on every project: 63 passed, 57 skipped (project-gated).
  - The dev server was gone afterwards; nothing was listening on 3157.
- The tracer's own check was re-run before Task 2 began, and it passed.
- A throwaway render of the new viewer with a real catalogue blank (horizontal and nose-up) was screenshotted and looked at before Task 1 was committed. It showed the blank outline and foam shade behind the board, the frame fitting the whole blank, the correct card/reading split, and the measuring-point dots. The scratch test was deleted before the commit.
- `git diff --name-only df00b26 HEAD` lists exactly the plan's 17 `files_modified` paths.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The new rocker browser tests read the drawing before it had settled**
- **Found during:** Task 2
- **Issue:** On a phone, the first paint draws the board flat. Then the phone's orientation check turns it nose-up, which redraws the profile in a different frame. A "the shape didn't change" check that read the drawing on first paint therefore failed for the wrong reason. The existing grid probe (`findInteriorBoardPoint`) can also miss a side profile completely, because the profile is a thin band that runs the whole length of its bounding box.
- **Fix:** Added `settledProfileD`, which reads the profile a few frames apart until two reads agree, and `profilePointAt`, which finds a point on the board from the path's own outline in either orientation. Both rocker cases use them.
- **Files modified:** `e2e/touch-drag.spec.ts`
- **Commit:** `ff48823`

**2. [Rule 2 - Correctness] With no blank, the deck height reserve is taken as-is, never passed through `max()`**
- **Found during:** Task 1
- **Issue:** Writing the reserve as `Math.max(maxDeckIn, 0)` without a blank would quietly change the layout for a negative `maxDeckIn`. That breaks the promise that nothing moves without a blank.
- **Fix:** Without `blankSpanIn` the reserve is exactly `maxDeckIn`. The same pattern is used wherever the blank enters the frame arithmetic. The deep-equality test covers this.
- **Commit:** `48b258d`

### Choices the plan left open

- The card/reading split reads `profile.blank`, not the `blank` prop (see decisions). Once 11-09 lands, the order form may be handed a profile that has a blank without being given the blank outline. Its compact readings draw no cards either way.
- `touch-none` was removed from the drawing's `svg`. The drag was the only reason it was there, and the plan retires every drag-related piece. `select-none` and the iOS long-press suppression stay.
- Measuring-point dots carry `pointerEvents="none"` and sit in a `data-measuring-points` group, which the desktop test uses.

## Deferred Issues

- Four comments outside this plan's files still mention the deleted files by name: `lib/geometry/rocker.ts:12`, `lib/geometry/preset-source.ts:46`, `lib/geometry/pchip.ts:20`, and the `pchip.test.ts` header. These are prose only (no import), and `tsc` and the tests pass. They can be reworded whenever those files are next edited (11-09 owns `rocker.ts`'s neighbours).
- The `avoidPathSelector` option on `findEmptyCanvasProbe` in `e2e/touch-drag.spec.ts` no longer has a caller, because only the retired rocker cases passed it. It was kept on purpose, since the helper serves the outline tests, and the plan says to keep those helpers.

## Known Stubs

None. The editor's profile is built from the saved curve (`bezierToFiveStations`), and no blank is passed yet. Both are marked in the code as transitional until plans 11-09 (the store's own side profile) and 11-11 (picking a blank). That is the plan's stated in-between state, not a stub.

## Human verification deferred to end-of-phase UAT

- After 11-11 lands, open /design/rocker, pick a blank, and look at the drawing in Daylight, Chalk, Slate and Phosphor. The blank's faint 1px line should sit behind the board's 2px outline. The shaded band above the deck and past each tip, which is the foam to come off, should read as a light wash in every theme. Nothing on the drawing should respond to a drag. (The tracer's human check. Colour legibility across themes is a visual judgement no test measures.)

## Threat Flags

None new. T-11-21: the blank's vendor and name reach the drawing only as a plain React `aria-label` value, and the rewritten `drag-readout-chip.test.ts` checks there is no `dangerouslySetInnerHTML` and that the name goes only into the `ariaLabel` attribute. T-11-22: a negative or non-finite blank span resolves to 0 in `rockerViewLayout`, and there is a test for it.

## Self-Check: PASSED

- All 13 modified files exist, and the 4 deleted paths are absent (`test ! -e` for each).
- Commits `48b258d`, `ff48823` and `ecec30b` are present in `git log`.
