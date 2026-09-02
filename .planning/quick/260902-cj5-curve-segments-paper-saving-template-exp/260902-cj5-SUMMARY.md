---
phase: quick-260902-cj5
plan: 01
subsystem: templates
tags: [jspdf, geometry, pdf-export, vitest]

requires: []
provides:
  - "computeStripLayout / stripRegistrationLines / stripMarkSegments / stripLabelRows / stripPageZeroFurniture in lib/geometry/template.ts — the pure, unit-tested math behind a single-column, sideways-slid landscape PDF strip"
  - "components/template/build-strip-pdf.ts — the jsPDF drawing module for the strip, reusing build-template-pdf.ts's exported helpers without editing that file"
  - "A third 'Paper Saver' card in the Export Template dialog, stacked with Overview Sheet and Full Template, Full Template still the default selection"
affects: [template-export, summary-order-form]

actuals:
  tokens: 20600
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Characterisation digest pin (sha256, first 16 hex chars, over combined JSON of a set of existing pure functions) written and verified red/green BEFORE touching adjacent code in the same file, then frozen for the rest of the task"
    - "One expression deciding two behaviours (the strip's sideways slide AND whether the stringer prints) so the two properties can never disagree"
    - "A shared boundary value computed once and handed to both neighbouring pages, rather than recomputed twice from each page's own formula, to guarantee two labels are identical by construction rather than by floating-point luck"

key-files:
  created:
    - lib/geometry/template.test.ts (characterisation pin + strip test suites, appended)
    - components/template/build-strip-pdf.ts
    - components/template/build-strip-pdf.test.ts
  modified:
    - lib/geometry/template.ts (append-only: five new exported functions, five new types, three new constants — every existing export byte-identical, confirmed by git diff against main)
    - components/template/export-preview-dialog.tsx (third card, stripLayout memo, strip download branch, shared dims object, stacked card grid, dialog max-height/scroll)

key-decisions:
  - "The characterisation pin was written and its real (not placeholder) sha256 digests captured BEFORE any strip code existed, then never edited for the rest of the task — verified real by temporarily bumping TEMPLATE_MARGIN_MM by 1mm (all 8 cases went red) and reverting (all 8 green again)"
  - "The mark-label de-collision algorithm needed a small relaxation loop (push away from the nearest colliding row, iterated) rather than a single try-both-sides check, after the simpler version left two labels as close as 3.35mm apart on the midlength/A4 case — the min-separation invariant is now a hard guarantee, not a best-effort"
  - "The 'no stringer' condition is stricter than the two-arm selection boundary: a page's own maxHalfWidth must exceed usableHalfWidth - STRIP_RAIL_INSET_MM (one inset), not usableHalfWidth - 2*STRIP_RAIL_INSET_MM (the boundary that only picks which of the two slide formulas applies) — caught by an initial test that used the wrong boundary and failed on two real presets"
  - "downloadStripPdf is deliberately NOT unit-tested directly (matching the existing precedent for downloadTemplatePdf/downloadOverviewPdf) — jsPDF's Node build genuinely writes doc.save() to disk rather than no-op'ing outside a browser, confirmed when an initial test for it left a stray shortboard-paper-saver.pdf at the repo root; removed rather than worked around, since buildStripPdf + stripFileName (both already tested) are the wrapper's only two lines of real logic"

patterns-established:
  - "A second jsPDF drawing module (build-strip-pdf.ts) can reuse a sibling builder's exported pure helpers (wrapTextToWidth, nameBlockContent, templateNameBlockText, templateNameBlockDimsText, rectsOverlap, rectContains) without either file importing the other's page-drawing logic"

requirements-completed: [QT-260902-cj5]

coverage:
  - id: D1
    description: "Export Template dialog offers a third 'Paper Saver' card; Full Template stays the default selection"
    verification:
      - kind: unit
        ref: "components/template/build-strip-pdf.test.ts — buildStripPdf suite (page count/orientation), plus manual code inspection of export-preview-dialog.tsx's useState('full') default"
        status: pass
    human_judgment: true
    rationale: "Visual card layout (stacked, non-crowded, non-wrapped titles) and the dialog's laptop-height scroll behavior require a human looking at the rendered dialog — deferred to Task 3."
  - id: D2
    description: "Paper Saver produces a landscape PDF with strictly fewer pages than Full Template for the same board/paper"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts — computeStripLayout > '$id: the strip uses strictly fewer pages than the tiled template...' (both papers, all four presets)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every page prints; the near-straight middle is never skipped; no straightness tolerance exists in the code"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts — computeStripLayout coverage test ('every sampled outline point's station falls inside at least one page') and stripRegistrationLines page-count-per-role test; code inspection confirms no straightness/skip logic exists"
        status: pass
    human_judgment: false
  - id: D4
    description: "Page 1 carries the 2in scale square and name/dims block in the top-right, outboard of the nose taper; every other page carries only a page number and registration lines"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts — stripPageZeroFurniture suite (containment, no-overlap, outboard-of-outline sampled every 5mm)"
        status: pass
    human_judgment: true
    rationale: "Whether the furniture visually reads right on the printed page (not just passes the pure-geometry containment test) is Task 3's rendered-PDF review."
  - id: D5
    description: "Every registration line is labelled with station and rail half-width; the same label appears on both sides of every seam"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts — stripRegistrationLines suite, including the identical-station-and-label test across every page boundary"
        status: pass
    human_judgment: false
  - id: D6
    description: "The stringer prints only on pages where it lands on the paper, decided by the same expression that decides the sideways slide"
    verification:
      - kind: unit
        ref: "lib/geometry/template.test.ts — computeStripLayout > slide-arm and stringerOnPage tests"
        status: pass
    human_judgment: false
  - id: D7
    description: "Overview Sheet and Full Template are provably unaffected — zero-line diff, tile-grid digest pin unedited"
    verification:
      - kind: unit
        ref: "git diff --name-only main -- components/template/build-template-pdf.ts components/template/build-overview-pdf.ts (empty both times); lib/geometry/template.test.ts characterisation pin, 8/8 passing"
        status: pass
    human_judgment: false
  - id: D8
    description: "1:1 print scale — a printed page's 2in scale square measures exactly 2in, and a labelled rail half-width matches a ruler"
    verification: []
    human_judgment: true
    rationale: "Physical print measurement cannot be automated from inside a worktree with no printer access — this is exactly Task 3's step 2."

duration: ~35min active work across two sessions (an API rate-limit interruption paused work from roughly 10:45 to 14:02)
completed: 2026-09-02
status: complete
---

# Quick Task 260902-cj5: Paper-saving rail-strip template export Summary

Added a third "Paper Saver" export to the board's Export Template dialog: a single-column strip
of landscape pages, each one slid sideways so only the rail-curve region uses paper, instead of
tiling the whole board across a two-column grid. Task 3 (the founder's own rendered-PDF review
and a physical 1:1 print check) is deferred — it requires a human looking at real pages, which
this worktree cannot do.

## Performance

- **Duration:** ~35 min active work (two sessions; an API rate-limit interruption paused the
  middle of the task)
- **Tasks:** 2 of 3 complete (Task 3 is the blocking human-verify checkpoint, deferred)
- **Files modified:** 5

## Accomplishments

- `lib/geometry/template.ts` gained five new pure, unit-tested functions
  (`computeStripLayout`, `stripRegistrationLines`, `stripMarkSegments`, `stripLabelRows`,
  `stripPageZeroFurniture`) that compute every number the strip prints — station bands, the
  sideways slide, registration-line stations/labels, mark ticks, de-collided label rows, and page
  1's furniture placement — with every existing export in the file byte-identical to `main`.
- A characterisation digest pin over the tiled template's own layout functions was written and
  verified BEFORE any strip code existed, proven real (a deliberate 1mm change turned it red,
  reverting turned it green), and stayed green and unedited through both tasks.
- `components/template/build-strip-pdf.ts` draws the layout onto a real multi-page landscape
  jsPDF document, reusing six already-exported helpers from `build-template-pdf.ts`
  (`wrapTextToWidth`, `nameBlockContent`, `templateNameBlockText`, `templateNameBlockDimsText`,
  `rectsOverlap`, `rectContains`) without editing that file at all.
- The Export Template dialog offers a third stacked card, "Paper Saver," with Full Template still
  the one selected when the dialog opens, and a comparative page-count line
  ("N pages instead of M — the curve only, one page at a time.").
- Two sample PDFs (longboard preset, the closest in-repo match to the founder's own 7'10" x
  22.5" reference board) were generated for the orchestrator's review:
  `/private/tmp/claude-501/-Users-kontoes-Code-shaper/1351620e-b04a-434a-9a98-cad58f6894ec/scratchpad/strip-out/strip-letter.pdf`
  and `.../strip-out/strip-a4.pdf`.

## Task Commits

1. **Task 1 Step 1 — characterisation pin** — `2495c5e` (test)
2. **Task 1 Step 2/3 — strip layout math + tests** — `1318b40` (feat)
3. **Task 2 — strip PDF drawing module + dialog wiring** — `a85aaa6` (feat)

_No plan-metadata commit — this worktree does not commit `.planning/` artifacts; the orchestrator
copies this SUMMARY out and commits it separately per the task's own constraints._

## Files Created/Modified

- `lib/geometry/template.ts` — appended the strip layout math (5 functions, 5 types, 3 constants); no existing export touched
- `lib/geometry/template.test.ts` — the characterisation pin plus five new describe blocks covering every property in the plan's `<behavior>` section
- `components/template/build-strip-pdf.ts` — the new jsPDF drawing module for the strip
- `components/template/build-strip-pdf.test.ts` — its test suite, including the opt-in `STRIP_PDF_OUT` sample writer
- `components/template/export-preview-dialog.tsx` — third card, `stripLayout` memo, `strip` download branch, shared `dims` object, stacked card grid, dialog scroll

## Decisions Made

See `key-decisions` in the frontmatter above — the de-collision relaxation loop, the corrected
no-stringer boundary, the pinning methodology, and the decision not to unit-test
`downloadStripPdf` directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mark-label de-collision left two rows too close together in a real case**
- **Found during:** Task 1, writing the `stripLabelRows` test suite
- **Issue:** The first de-collision algorithm tried only the mark's two fixed candidate positions
  (its own station ± the interior gap) and picked whichever collided less. On the midlength/A4
  case this still left two label rows 3.35mm apart — inside the 6mm minimum separation — and a
  constructed "mark within 1mm of a registration line" test similarly landed only 5.5mm away.
- **Fix:** Replaced the two-candidate check with a bounded relaxation loop that repeatedly pushes
  a candidate baseline away from whichever already-placed row it's still too close to, in the
  chosen direction, until clear (or a 20-iteration cap, which never triggers for the small number
  of rows one page carries).
- **Files modified:** `lib/geometry/template.ts` (`stripLabelRows`)
- **Verification:** All 353 tests in `template.test.ts` pass, including the "no two rows on the
  same page closer than the minimum separation" invariant across all four presets and both papers.
- **Committed in:** `1318b40` (part of the Task 1 commit — found and fixed before that commit)

**2. [Rule 1 - Bug] Test asserted the wrong "no stringer" boundary**
- **Found during:** Task 1, writing the `computeStripLayout` test suite
- **Issue:** A test asserted the widepoint's page has no stringer whenever its half-width exceeds
  the two-arm SELECTION threshold (`usableHalfWidth - 2 * STRIP_RAIL_INSET_MM`). That threshold
  only decides which of the two slide formulas applies — it does not by itself guarantee the
  result is positive. Two real presets (shortboard/Letter, fish/A4) exceeded that threshold yet
  still printed the stringer, correctly, per the actual code's own math.
- **Fix:** Corrected the test's own boundary to `usableHalfWidth - STRIP_RAIL_INSET_MM` (one
  inset, not two) — the boundary the `halfWidthStart <= 0` condition actually resolves against.
  No production code changed; the implementation was already correct.
- **Files modified:** `lib/geometry/template.test.ts`
- **Verification:** All four presets, both papers, pass with the corrected boundary.
- **Committed in:** `1318b40`

**3. [Rule 1 - Bug] An initial test for `downloadStripPdf` wrote a real file to the repo root**
- **Found during:** Task 2, running the strip PDF test suite
- **Issue:** A test assumed (matching a comment copied from habit, not verified) that jsPDF's
  `doc.save()` is a no-op outside a browser. On this repo's Node build it actually writes the file
  to disk — the test call left `shortboard-paper-saver.pdf` sitting in the repo root as an
  untracked file.
- **Fix:** Removed the test and the stray file, matching the existing precedent already set by
  `build-template-pdf.test.ts` / `build-overview-pdf.test.ts`, neither of which unit-tests
  `downloadTemplatePdf`/`downloadOverviewPdf` directly — only their two real pieces of logic
  (`buildXxxPdf` and `xxxFileName`) are tested, both of which the strip's own suite already covers.
- **Files modified:** `components/template/build-strip-pdf.test.ts`
- **Verification:** Re-ran the full suite twice after the fix; no stray files in `git status`.
- **Committed in:** `a85aaa6`

---

**Total deviations:** 3 auto-fixed (all Rule 1 — bugs caught by the plan's own TDD discipline
before they reached a commit).
**Impact on plan:** All three were caught and fixed during the same task they were introduced in,
before any commit; no scope creep, no architectural change, no plan deviation beyond fixing bugs
in the developing test suite itself.

## Issues Encountered

None beyond the three deviations above.

## Known Stubs

None — Task 1 and Task 2 are both fully implemented, not stubbed. Task 3 (rendered-page review,
physical 1:1 print measurement, dialog laptop-height check) is a deliberate checkpoint, not a stub:
it requires a human with a printer and a browser, neither available inside this worktree.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Task 3 is not done and must run next**, as a `checkpoint:human-verify` with `gate="blocking"`:

1. Render `strip-letter.pdf` and `strip-a4.pdf` (already generated, see paths above) page by page
   against the founder's own reference PDF and the rendered reference pages already in the session
   scratchpad.
2. Print page 1 at 100% ("Fit to page" off) and measure the 2in scale square with a ruler — the
   only check that proves the strip is genuinely 1:1.
3. Open the Export Template dialog from the MAIN checkout's dev server (`npm run dev` — Turbopack
   cannot resolve `next` from this worktree) and confirm: three stacked cards, Full Template still
   selected by default, the Paper Saver page-count line responds to switching Letter/A4, three
   different files download from the three cards, and the dialog scrolls rather than pushing the
   Download button off screen at laptop height (~768px).
4. Answer the plan's two judgement calls (registration-line placement distance from the paper
   edge; whether "from tail" and rail half-width are the right words for the label).
5. `npm run build` from the main checkout (not runnable in this worktree).

All of Task 1 and Task 2's automated gates are green and reported in this SUMMARY; nothing is
blocking Task 3 except needing a human with a printer.

---
*Quick task: 260902-cj5*
*Completed: 2026-09-02*

## Self-Check: PASSED

- FOUND: commit 2495c5e (characterisation pin)
- FOUND: commit 1318b40 (strip layout math)
- FOUND: commit a85aaa6 (strip PDF drawing module + dialog wiring)
- FOUND: lib/geometry/template.ts
- FOUND: lib/geometry/template.test.ts
- FOUND: components/template/build-strip-pdf.ts
- FOUND: components/template/build-strip-pdf.test.ts
- FOUND: components/template/export-preview-dialog.tsx
- FOUND: sample PDF — .../scratchpad/strip-out/strip-letter.pdf
- FOUND: sample PDF — .../scratchpad/strip-out/strip-a4.pdf

## Task 3 checkpoint — orchestrator's results (2026-09-02)

Run against the merged code (`2d14c00`) from the main checkout, with the executor's own sample PDFs
(longboard preset, 9'0" x 22.5"; Letter 15 pages, A4 16 pages):

- **Every page rendered and reviewed** (pypdf split + Quick Look), both papers, against the founder's
  reference. Curve hands off cleanly page to page allowing for the slide; registration lines sit
  0.65in from the edges with readable labels inside the band; page 1 carries the 2in square and the
  name/dims block top-right on blank paper; the stringer prints on the nose page and the last three
  tail pages only; every middle page is present; each station mark lands on its page.
- **Seam labels proven identical** on every seam by text extraction with positions — 14/14 seams on
  Letter, 15/15 on A4, zero mismatches.
- **1:1 proven at the PDF level**: page 1's content stream contains exactly one 144pt x 144pt `re`
  rectangle (2in) on both papers. The physical ruler check remains the founder's.
- **Dialog** (live, main checkout): three cards stacked, none clipped; Full Template selected on
  open; Paper Saver shows "10 pages instead of 16" on Letter and "11 instead of 14" on A4 for the
  6'0" default board, hiding the tile diagram, which returns under Full Template; at 1366x768 the
  dialog (451px tall) fits with Download PDF fully on screen. File-name suffixes covered by test.
- **Other two exports untouched**: zero-line `git diff` against the pre-task base on both builders;
  the tiled-layout digest pin green and unedited. `npm run build` succeeded (all seven routes).
- **Verifier** (gsd-verifier): 9/9 must-haves verified, no code-level gaps, `human_needed` for the
  physical print and the two judgement calls.

**Defect found and fixed (round 1):** on stringer-bearing pages the two-digit page numeral was drawn
at the printable left edge while the slide put the stringer up to 12.7mm to its right — the dashed
stringer ran through the numeral's second digit (Letter p13-15, A4 p16; page 1 escaped only because
"1" is narrow). Per the reference, the numeral now sits between the stringer and the curve: the
layout decides a per-page numeral column start (`pageNumberHalfWidth`), stepping a named gap right
of the stringer on those pages, and the label column follows it so "a numeral never sits under a
label" still holds by construction. Fix commit: 92a8a4e.

**Open for the founder:** the physical 2in-square print check; and the two judgement calls — the
registration lines' 0.65in placement, and the label wording (`36" from tail — rail 10 3/4"`:
"from tail" as the station call-out, and rail half-width rather than full width).
