---
phase: quick-260910-2ny
plan: 01
subsystem: ui
tags: [css-print, next-public-folder, playwright]

requires: []
provides:
  - "public/__print-probe.html — a hidden, self-contained static probe page that lets the founder
    print from his own iPhone and hand back a PDF answering whether iOS Safari resolves 100vh/100vw
    against the real printed page area"
affects: [260910-2ny-Task-2, 260910-2ny-Task-3, 260910-2ny-Task-4, 260910-2ny-Task-5, 260910-2ny-Task-6]

actuals:
  tokens: 2917
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "A hidden public/ probe page (noindex, zero external requests) as the only way to settle a
      print-engine question no CLI or emulator can answer — build it, get a human to print it on
      the real device, read the PDF, then delete it."

key-files:
  created:
    - public/__print-probe.html
  modified: []

key-decisions:
  - "Followed the plan's spec exactly for the probe's five sections (vh/inch ruler pair, width
    bar, break test, JS-written flags + scale square, how-to-read text) — no deviations."
  - "Whole-inch tick marks and labels in the width bar are hand-coded HTML (9 explicit ticks plus
    the TODAY tick); the unlabelled quarter-inch ticks in between are a single CSS
    repeating-linear-gradient background rather than 27 more hand-placed elements — same visual
    reading, far less markup to get wrong."
  - "Verified the probe against a real Chromium print pipeline (Playwright's page.pdf) rather than
    trusting the markup by inspection alone: the generated PDF is 5 pages, and pypdf's text
    extraction confirms every band, both break-test labels, all three flags (including
    BEFOREPRINT: fired after a dispatched event), the TODAY 7.6401in tick, and the 50.8 mm caption
    all print correctly and in the right place."

requirements-completed: []

coverage:
  - id: D1
    description: "public/__print-probe.html exists, is self-contained (one network request for the
      whole page load), carries exactly ten data-vh-band and twelve data-in-band elements, and its
      three JS-written flags and viewport readout populate correctly"
    verification:
      - kind: e2e
        ref: "scratchpad Playwright checker (260910-2ny-probe-check.mjs, not a repo artifact) — all
          assertions passed: 1 request, 10 vh bands, 12 in bands, JS: yes, VIEWPORT <w> <h>,
          BEFOREPRINT: fired, PDF >= 3 pages (measured 5)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The probe renders and prints under a real browser engine with every band, bar,
      block, flag and square specified in the plan present and legible"
    verification:
      - kind: other
        ref: "pypdf text extraction over a Playwright-generated Letter PDF of the probe — confirmed
          all ruler labels, the TODAY 7.6401in tick, SHEET A/B TOP/BOTTOM labels, all three flags,
          the how-to-read list, and the 50.8 mm caption appear in the output"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-10
status: incomplete
---

# Quick Task 260910-2ny — Task 1 of 6: the print probe page

**Built and committed the self-contained iPhone print probe (`public/__print-probe.html`); this
plan's remaining five tasks are genuinely unfinished and wait on the founder's own test print.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-10T16:29:00Z
- **Completed:** 2026-09-10T16:54:56Z
- **Tasks:** 1 of 6 (this plan is executed in two goes with a human in the middle, per its own
  `<execution_gate>`)
- **Files modified:** 1

## Why this SUMMARY says `status: incomplete`

This is not the whole plan — it is Task 1 only, by the plan's own explicit design
(`<execution_gate>`). Task 2 is a blocking `checkpoint:human-action`: the founder has to print
this probe from his own iPhone and hand back the PDF, because no CLI, API or emulated browser can
answer the question it asks (does iOS Safari resolve `100vh`/`100vw` against the real printed page
area?). Tasks 3 through 6 are written against a measurement — `260910-2ny-PROBE-READING.md` — that
does not exist yet and cannot be produced by this executor. Per the orchestrator's explicit
instruction for this run, execution stops here.

**Remaining task numbers: 2, 3, 4, 5, 6.**

## Accomplishments

- Built `public/__print-probe.html`: one self-contained static file (no React, no imports, no
  build step, no external request of any kind) carrying all five sections the plan specifies:
  1. The vh/inch ruler pair — ten `10vh`-tall bands beside twelve `1in`-tall bands, each marked
     with a `data-vh-band`/`data-in-band` attribute and a right-aligned cumulative figure, first
     band carrying the "PRINT PROBE — quick task 260910-2ny" caption.
  2. The width bar — a `100vw`-wide, clip-overflowed bar with quarter-inch ticks out to 9in (whole
     inches hand-coded as full-height labelled hairlines; the in-between quarters drawn as a single
     CSS repeating-gradient background rather than 27 more elements), a heavier red `TODAY
     7.6401in` tick, and a second `100vw` wrapper beneath holding a `7.6401in` filled bar with an
     end marker.
  3. The break test — two `100vh` blocks, each requesting `break-after: page` (and the legacy
     `page-break-after: always` alias), labelled SHEET A/B TOP and BOTTOM.
  4. The flags — three fixed-size monospace boxes written by inline JS (`JS: yes` on
     `DOMContentLoaded`, `BEFOREPRINT: fired` from inside a `beforeprint` listener, and a
     `VIEWPORT <w> <h>` readout), beside a 2in × 2in scale-check square captioned `50.8 mm`.
  5. How to read this — five plain-English lines naming the exact readings to take off the printed
     PDF, including that the page declares `@page { size: portrait; margin: 8mm; }`.
- Verified structurally and behaviourally with a Playwright script (kept in the session scratchpad,
  never committed, per the plan's own instruction): exactly one network request for the whole page
  load, the correct band counts, all three flags populate correctly, and a real Chromium PDF export
  comes back with at least three pages (measured five, at Letter size).
- Additionally rendered the probe through Chromium's own print pipeline (`page.pdf`) and read the
  raw text back out with `pypdf` — every ruler figure, the TODAY tick, both break-test blocks' top
  and bottom labels, all three flags (including the post-dispatch `BEFOREPRINT: fired`), the
  how-to-read list, and the `50.8 mm` caption all appear correctly and in DOM order across the five
  generated pages. This is Blink's own answer to the same question the founder's iPhone will
  answer differently — a useful control, not a substitute for it.
- `npm run lint` is clean (0 errors; the 12 warnings present are all pre-existing, in files this
  task did not touch).
- `npm test` matches the documented green baseline exactly: 55 files, 2417 passed, 2 skipped.

## Task Commits

1. **Task 1: the print probe page — build it, then STOP** - `e1dc83d` (feat)

_No plan-metadata commit yet — the orchestrator handles that once this SUMMARY and STATE.md are in
place, per this run's constraints._

## Files Created/Modified

- `public/__print-probe.html` - the hidden, self-contained iPhone print probe. Not linked from
  anywhere in the app; reachable only by its exact URL. Deleted again in Task 6 once its one
  question has been answered (D-02).

## Decisions Made

- Followed the plan's spec for the probe verbatim — no architectural deviations, no Rule 4
  escalations.
- Encoded the width bar's 27 unlabelled quarter-inch ticks as one CSS `repeating-linear-gradient`
  background instead of 27 separately hand-placed `<div>`s, keeping the file's only labelled
  positions (the 9 whole inches plus TODAY) as explicit elements. Same visual reading on paper,
  much less markup surface to get wrong by hand.
- Chose to verify against a real Chromium-generated PDF (via `page.pdf` + `pypdf` text extraction)
  in addition to the plan's required DOM-level Playwright checks, since a full-page screenshot of
  a `vh`-heavy document turned out to be an unreliable verification method in its own right (see
  Issues Encountered) — the PDF path is what actually exercises the same print pipeline the
  founder's phone will use a version of.

## Deviations from Plan

None - plan executed exactly as written. Task 1's `<action>` and `<verify>` were followed as
specified; the checker script was written to the session scratchpad as instructed and was never
committed.

## Issues Encountered

- A first attempt to visually sanity-check the probe with Playwright's `page.screenshot({ fullPage:
  true })` produced a corrupted-looking image with apparently duplicated text. This turned out to
  be an artifact of the verification method, not a bug in the probe: `fullPage` screenshots work by
  resizing the browser viewport to the page's full scroll height before capturing, and because this
  document's layout is built entirely from `vh`-relative bands and blocks, that resize itself
  changes what `100vh` means mid-capture, producing a stitched image that doesn't correspond to any
  single consistent layout. Re-rendered instead with a single fixed, generously large viewport (no
  resize) and, more conclusively, inspected the actual `page.pdf()` output (which is not subject to
  this viewport-resize effect) with `pypdf`'s text extraction — that confirmed the real, print-path
  content is correct and undistorted. No change to the probe file was needed; this was purely a
  verification-tooling wrinkle worth recording so a later executor doesn't chase the same red
  herring if they re-check this file with a full-page screenshot.
- `npx tsc --noEmit` (not part of this task's `<verify>` block, run only as an extra sanity check)
  reports two pre-existing `Cannot find name 'LayoutProps'` errors in `app/design/layout.tsx` and
  `app/layout.tsx`. These are unrelated to this task — `LayoutProps` is a Next.js-generated global
  type that isn't available without a `.next` build, and per this run's orchestrator rulings,
  `npm run build` is expected to fail in this worktree ("Could not find the Next.js package"). Out
  of scope for this task; not touched.

## User Setup Required

None - no external service configuration required for Task 1 itself. Task 2 (next) requires the
orchestrator to push to `main`, wait for the Vercel deploy, and hand the founder a URL to print
from his iPhone — that is the plan's own next step, not a setup gap in this task.

## Next Phase Readiness

- `public/__print-probe.html` is committed on this worktree's branch and ready to ship as soon as
  the orchestrator pushes to `main`.
- Task 2 (blocking `checkpoint:human-action`) is next: push, confirm
  `https://www.shaperassistant.com/__print-probe.html` returns 200, have the founder print it from
  his iPhone at 100% with no pinching, and record the reading in
  `.planning/quick/260910-2ny-size-each-order-form-sheet-to-the-real-p/260910-2ny-PROBE-READING.md`
  per the plan's `<probe_gate>` decision rule.
- Tasks 3-6 cannot start until that reading file exists and names a branch (A or B) — this
  executor did not and should not attempt them.

---
*Phase: quick-260910-2ny*
*Completed: 2026-09-10*
