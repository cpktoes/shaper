---
phase: 11-rocker-from-real-blanks
plan: 12
subsystem: browser-proof
status: complete
tags: [rocker, playwright, touch, baselines, R3, R4, R6, R14, R15, R16, D-13, D-16]
requires:
  - "11-07: the read-only rocker drawing and the settle helper in e2e/touch-drag.spec.ts"
  - "11-09: the store's pick/place/fine-tune/remove moves and undo"
  - "11-10: the presets' provisional blanks and the pchip litres"
  - "11-11: the ROCKER sidebar and its test hooks"
provides:
  - "A real (CDP) thumb drag and a real mouse drag of the placement slider, each proving zero requests during the drag"
  - "/design/rocker in touch-sizing.spec.ts's loop, plus a ROCKER-only test for rows, text links, slider dots and DATASHEET cells"
  - "The DATASHEET-with-a-blank sticky-label test at 360px"
  - "DATASHEET blocks, Remove + one undo, and Metric millimetres in rocker-blanks.spec.ts (all three projects)"
  - "Re-recorded rocker-desktop and volume-desktop baselines"
affects: [11-13]
tech-stack:
  added: []
  patterns:
    - "request counter attached after settle + pick, counting every request to any host between press and release"
    - "thumb centre read only after ten stable frames (the sidebar reflows when a blank is picked)"
    - "screenshot only after React owns the streamed list (a pre-hydration screenshot causes a dev-overlay hydration issue)"
key-files:
  created: []
  modified:
    - e2e/touch-drag.spec.ts
    - e2e/desktop-regression.spec.ts
    - e2e/touch-sizing.spec.ts
    - e2e/phone-rails.spec.ts
    - e2e/rocker-blanks.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
key-decisions:
  - "The zero-request counters count every request to any host (not only same-origin); Clerk's fake-key retries never fired during a drag in 4 runs each"
  - "The ROCKER baseline waits for React to own the blank list and search box before the screenshot, because a screenshot taken before hydration puts the dev server's red '1 Issue' badge in the picture"
  - "The new rocker-blanks cases run on all three projects (the plan asked for desktop + android); they pass on the iPhone too"
metrics:
  duration: "about 35 minutes"
  completed: 2026-09-26
actuals:
  tokens: 6800
  tasks: 3
  commits: 4
---

# Phase 11 Plan 12: The ROCKER screen proven in real browsers, and two desktop screenshots re-taken Summary

The finished ROCKER screen is now proven in real browsers on both phones and the desktop: a thumb
(and a mouse) sliding the board along its blank changes the rocker numbers with not one request
leaving the page; the slider's left end is the nose; every control is finger-sized; the DATASHEET
shows the blank beside the board and keeps its row names in view on the narrowest phone; Metric
reads in millimetres; and a removed blank comes back with one undo. The two desktop screenshots this
phase changes on purpose, ROCKER and VOLUME, were re-taken once, after proving nothing else moved.

## What changed, in plain English

- **Sliding the board (Task 1).** On an Android phone, a real finger drag of the placement slider's
  dot, 64px to the left, moves the board toward the nose, the label ends `… toward nose`, the Nose Tip
  rocker reading changes, and the page sends nothing anywhere while the finger is down. The same with
  a mouse on the desktop.
- **Finger sizes, the narrow DATASHEET, Metric and undo (Task 2).** ROCKER joined the phone sizing
  sweep: every slider dot, the Center Thickness box and the search box. A new ROCKER test also measures
  the blank rows, Show all / Show Fewer, Clear Search, Change Blank / Keep This Blank, Remove This Blank,
  Reset Fine-Tune, and the DATASHEET's typed cells: all at least 44px tall, with 16px text in the typed cells. At 360px wide
  with a blank picked, the DATASHEET box scrolls sideways (the page does not), and after scrolling to
  the far end the column headings have moved but the `Foam Off` row name is still wholly inside the
  box. With a blank picked the DATASHEET shows `BLANK — …`, `YOUR BOARD`, `Foam Off` and the catalogue
  page footnote. Remove This Blank followed by one undo (Cmd/Ctrl+Z, or the phone's Undo button) brings
  back the same blank, where it sat, and its 12" tweak. In Metric the readouts contain `mm` and no `"`,
  the placement reads `… mm toward nose`, and the tweak reads `Tweak +N mm`.
- **Two screenshots re-taken (Task 3).** ROCKER's reference picture now shows the new sidebar and the
  handle-free drawing; VOLUME's shows 29.94 L instead of 29.79 L. TEMPLATE, RAILS and FINS are
  byte-for-byte unchanged.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | A thumb drags the board along the blank and the numbers change, with no request leaving the page (tracer) | 2019aa4 |
| 2 | Finger-sized everywhere, the DATASHEET on a narrow phone, Metric in millimetres, Remove This Blank one undo away | 2edb0c0 |
| 3 | Re-record exactly two desktop screenshots, ROCKER and VOLUME's litres, after proving nothing else moved | f0891de |

## Verification

- **Tracer gate (autonomous):** `IS_WEBPACK_TEST=1 PW_PORT=3162 npx playwright test e2e/touch-drag.spec.ts --project=android`
  10/10; `… e2e/desktop-regression.spec.ts --project=desktop` 3/3; the two new drag tests with
  `--repeat-each 3` 6/6. Both assert the request list is empty (`toHaveLength(0)`) and its length `toBe(0)`.
- **Task 2:** `… e2e/touch-sizing.spec.ts e2e/phone-rails.spec.ts e2e/rocker-blanks.spec.ts` (all three
  projects) 92 passed, 49 skipped (desktop-only / phone-only skips).
- **VOLUME pixel check (step 3, temporary spec created, run, and deleted in one command):**
  ```
  litres figures on the page: [{"text":"29.94 L","x0":1059.47,"y0":350,"x1":1246,"y1":391}]
  VOLUME diff: 760 pixels differ; bounding box x 1160–1223, y 361–378; 0 outside the litres figures
  ```
  Only one `N.NN L` figure shows on the default VOLUME screen (the second `toFixed(2)} L` in
  `volume-calculation-card.tsx` belongs to the other estimate mode). `test ! -e e2e/_volume-diff.tmp.spec.ts` succeeds.
- **Baseline hashes (SHA-256):**

  | Image | Before | After | |
  |---|---|---|---|
  | outline-desktop-desktop-darwin.png | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 | same | unchanged |
  | rails-desktop-desktop-darwin.png | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 | same | unchanged |
  | fins-desktop-desktop-darwin.png | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 | same | unchanged |
  | rocker-desktop-desktop-darwin.png | 6f3ed315f60780ae8816a1fe3b1b1c077262370f2211758299f1c32aa50f8689 | 2767ca46503c9e6ea72d2d76c0672e8c52e867b912317ba6870809c08ad6eb13 | re-recorded |
  | volume-desktop-desktop-darwin.png | 48e7d58d464e90122c6bed9ea2b91ef85e7951756b5d06651ece24ba82148152 | e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372 | re-recorded |

  `git show --stat f0891de` lists only `desktop-baseline.spec.ts` and the two PNGs.
- **Which server rendered the new PNGs:** the webpack dev server (`IS_WEBPACK_TEST=1`, port 3162) in this
  worktree, on this Mac. TEMPLATE, RAILS and FINS matched their Turbopack-recorded baselines under it.
  If the orchestrator's Turbopack run on main disagrees with the two new images, re-record them there.
- **Whole baseline spec without updating:** `… e2e/desktop-baseline.spec.ts --project=desktop` 5/5, and
  10/10 with `--repeat-each 2`.
- **R16 order check:**
  ```
  $ T=$(git log --diff-filter=A --format=%H -- lib/geometry/blank-fit.test.ts | tail -1)   # 04b3b08 (11-01)
  $ C=$(git log --reverse --format=%H main..HEAD -- components/ | head -1)                  # 48b258d (11-07)
  $ git merge-base --is-ancestor "$T" "$C" && echo "R16: the four named tests landed before the first screen change"
  R16: the four named tests landed before the first screen change
  ```
- **Whole e2e suite in the worktree (webpack, port 3162):** desktop 74 passed / 104 skipped; android 114
  passed / 64 skipped; iphone 105 passed / 73 skipped. No failures.
- `npx tsc --noEmit` exit 0 (after `npx next typegen`); `npx vitest run` 71 files, 2781 passed / 2 skipped;
  `npm run lint` 0 errors, 11 warnings, all pre-existing and none in this plan's files. Dev server on 3162
  confirmed stopped; no `e2e/_*` files left.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Test race] The first ROCKER re-recording had the dev server's red "1 Issue" badge in it**
- **Found during:** Task 3, looking at the re-recorded image before committing it.
- **Issue:** the ROCKER shot waited only for the Blanks list to be visible. Playwright's screenshot
  touches the page to hide the text caret, and doing that before React had hydrated the streamed
  list's boundary made React report a hydration mismatch (`style={{caret-color:"transparent"}}` on
  `components/ui/input.tsx`, read from the dev overlay). The dev server then drew its red "1 Issue"
  badge in the bottom-left corner, and the recorded image included it. The badge showed up in every
  `desktop-baseline.spec.ts` run and in none of the diagnostic runs that screenshotted without
  `animations: "disabled"` or after hydration.
- **Fix:** the ROCKER baseline test now waits until React owns the list's first row and the search box
  (the same wait `openRocker` in `e2e/rocker-blanks.spec.ts` uses) before `toHaveScreenshot`. With the
  wait in place the badge never appeared (4/4 diagnostic runs), and ROCKER|VOLUME were recorded a second
  time within Task 3 with the same `-g "ROCKER|VOLUME" --update-snapshots` command. VOLUME came out
  byte-identical to its first recording. Only the clean images were ever committed, and the diagnostic
  spec was deleted.
- **This is not an app defect.** A real browser never changes the page before React hydrates it. The
  hydration mismatch comes from the test tool.
- **Files modified:** e2e/desktop-baseline.spec.ts
- **Commit:** f0891de

**Scope note:** the plan asked for the new `rocker-blanks.spec.ts` cases on desktop and android. They
have no project skip, so they run and pass on the iPhone too.

None of the other steps deviated. No app code changed, no dependency was added, and nothing outside the
eight `files_modified` paths was committed.

## Human verification deferred to end-of-phase UAT

- **Task 3 human check:** open the two re-recorded images beside the previous ones (git history, `f0891de^`).
  Expected: ROCKER shows the new sidebar (Center Thickness, the blank intro and search, the list under
  FITS THIS BOARD) beside the board on its baseline with no grab handles. At 1280×800 the Placement
  slider and the hand-set rocker/thickness sit below the fold of the sidebar, so the picture does not
  show them. VOLUME should differ only in its litres figure (29.79 → 29.94 L).
- **The four themes:** in each theme, the drawn blank's outline and its foam shade are legible
  against the panel.
- **The fit-defaults account round trip:** signed in, change Extra Length / Extra Thickness in the
  defaults dialog, reload on another device, and check the same values come back. Playwright runs signed
  out on fake Clerk keys and cannot reach this.
- **A real iPhone:** the defaults dialog and its number keyboard. Also on a real iPhone and a real Pixel,
  drag the placement dot with a thumb. The label should never wrap, the dot should never jump a line,
  and the readouts should change as you drag.
- **Older saved boards:** open a board saved before this phase from the rack. It should open with no
  blank and its rocker and foil as saved.

## Known Stubs

None. This plan only adds tests and two images.

## Threat Flags

None. No new credential and no app surface. T-11-35 was mitigated: the existing fake keys are unchanged
and nothing was added. T-11-36 was mitigated: one named re-record of two files, guarded by the hash
comparison and the VOLUME pixel-region check.

## For 11-13

- A ROCKER screenshot that doesn't wait for hydration gets a dev-overlay badge. Any new ROCKER
  screenshot or pixel check should wait for React to own the list first.
- The 11-11 note about a cold webpack server reloading TEMPLATE once did not show up in any run here.

## Self-Check: PASSED

- FOUND: all eight `files_modified` paths changed, and nothing else apart from this SUMMARY (`git diff --name-status d143980 HEAD`)
- FOUND commits: 2019aa4, 2edb0c0, f0891de
- `e2e/_volume-diff.tmp.spec.ts` and `e2e/_diag.tmp.spec.ts` are both gone
