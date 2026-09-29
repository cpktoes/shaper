---
phase: quick-260928-vpi
plan: 01
subsystem: ui
tags: [css, container-queries, playwright, print, summary, fins]

requires:
  - phase: 13-08 (quick 260928-tst / 260928-r9h)
    provides: page 2's PLANING table, left of the Rail Bands markings
provides:
  - "A phone-printed page 2 where the rail marks and fin numbers each stay inside their own box, at
    every page width from 560 to 900 dots, in both Imperial and Metric"
  - "A computer print measuring identical to before, except the fin notes' reworded last line"
  - "The fin notes' rounding line worded per system (Imperial sixteenths, Metric millimetres), on
    both the order form and FINS' MODEL INFO tab"
affects: [phase-13-item-9, phase-13-item-9b]

actuals:
  tokens: 12807
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A print-only, phone-sheet-scoped CSS custom property (`--order-form-ref-unit`) that follows
      the sheet's own shape ratio instead of a fixed clamp() floor, for a container whose printed
      shape differs from its width-mate"
    - "`min-height: min-content` as a content floor on a flex child, so a box never shrinks past
      what it holds while still sharing the parent's spare room"

key-files:
  created: []
  modified:
    - lib/geometry/fins.ts
    - lib/geometry/fins.test.ts
    - components/summary/order-form.tsx
    - components/fins/fin-model-info.tsx
    - e2e/summary-planing.spec.ts
    - app/design/summary/order-form.css
    - components/rails/rail-data-table.tsx
    - components/summary/order-form-print.test.ts

key-decisions:
  - "finRoundingNote(system)/finRoundingGrain(system) live in lib/geometry/fins.ts as pure,
    system-aware functions; computeFinPlacement's own notes array no longer carries the rounding
    line, since that function never sees the shaper's chosen system"
  - "Page 2's phone-sheet type follows one CSS custom property, 0.94cqw tapering by 0.003px per
    dot below the 733.44-dot design width, keyed on [data-print-touch] rather than a width query —
    a 733-dot phone sheet and the computer's 733.44-dot sheet are the same WIDTH and differ only in
    SHAPE, so no width-only rule can tell them apart (coordinator-confirmed, plan's
    <coordinator_confirm>)"
  - "Content floor (min-height: min-content) on the rail row and Fin Placement box is a measured
    no-op on the computer print; it only ever lifts a box on a phone sheet or a board whose fin
    content already overflowed on the computer print too"

requirements-completed: [QT-260928-vpi, 13-SPEC-item-8b]

coverage:
  - id: D1
    description: "The fin notes' closing line reads 'nearest 1/16\"' in Imperial and 'nearest
      millimetre' in Metric, tied to the printed fin numbers over every golden fixture; FINS'
      MODEL INFO Convention paragraph reads the same grain"
    requirement: 13-SPEC-item-8b
    verification:
      - kind: unit
        ref: "lib/geometry/fins.test.ts#finRoundingNote — the fin notes' rounding line in the shaper's own units (quick 260928-vpi)"
        status: pass
      - kind: e2e
        ref: "e2e/summary-planing.spec.ts#the fin notes' last line is worded per system, under data-fin-notes"
        status: pass
    human_judgment: false
  - id: D2
    description: "On a phone print, page 2's rail marks and fin numbers each fit their own box at
      every width from 560 to 900 dots, in both systems, with Shaper Use Only clear of the footer;
      a computer print and page 1 are unchanged"
    requirement: 13-SPEC-item-8b
    verification:
      - kind: e2e
        ref: "e2e/summary-planing.spec.ts#the rail markings never wrap and a quad's fins still clear the shop box... (imperial, metric)"
        status: pass
      - kind: unit
        ref: "components/summary/order-form-print.test.ts (11 cases, incl. the 3 new quick 260928-vpi contract tests)"
        status: pass
    human_judgment: true
    rationale: "The Playwright suite proves the CSS math in Chromium/WebKit emulation; the founder's
      own iPhone paper check (coordinator step, per this plan's <verification>) is the only proof
      of what shipping Safari's printer actually produces."

duration: 81min
completed: 2026-09-29
status: complete
---

# Quick 260928-vpi: Page 2 on a phone print Summary

**Page 2's rail marks and fin numbers now fit their own boxes at every phone print width (560-900
dots) via a phone-sheet-scoped CSS fit unit. A computer print is identical to before apart from the
fin notes' rounding line, now reworded per system.**

## Performance

- **Duration:** 81 min
- **Started:** 2026-09-28T22:42:37-07:00 (previous commit a9408f7)
- **Completed:** 2026-09-29T00:03:42-07:00
- **Tasks:** 3
- **Files modified:** 8

## What was wrong, in plain English

Printed from a phone, page 2 of the order form — Rail Bands and Fin Placement — used to run its
numbers into each other. Three things combined to cause it:

1. **A phone's printed sheet is a different SHAPE, not just a different width.** It's built to fit
   any paper a phone's browser hands it, so it's Letter-shaped — about 4.2% shorter for its width
   than a computer's own printed page, at the same width.
2. **Below 733 dots, an old "never print smaller than 12px" floor took over**, and on the already-
   shorter phone sheet that made the type relatively bigger still.
3. **Fixed-pixel rules, padding and gaps don't shrink with the page** the way the type itself does,
   so a narrower phone page loses proportionally more room to them.

On top of that, on a phone print a quad's fin numbers ran into their own notes at every width up
to 800 dots before this fix. (On a computer print a quad fitted, with 4.2 px to spare.)

## What changed on paper

- **Page 2's phone-print type now follows one size rule** instead of the old fixed floor. On the
  founder's own iPhone (618 dots) the rail marks now print at about **8.2 pt**, down from an
  overflowing 10.3 pt before. From 733 dots up they print at about **8.7 pt**. A **computer print
  is unchanged at 9.6 pt** — it never sees this new rule at all.
- **Each table's box now grows to fit what it holds** (Rail Bands and Fin Placement), so the
  page's spare room goes where the numbers actually are. On a computer print this changes nothing
  — it was already measured a no-op there.
- **The fin notes' last line now says what each system actually prints:** `nearest 1/16"` on an
  Imperial sheet, `nearest millimetre` on a Metric one — dropping the old line's promise of "0.1
  cm," which was never true of the whole-millimetre numbers Metric actually prints. FINS' MODEL
  INFO tab says the same. No fin number itself changed.

## The RED and GREEN case D report lines

Quad on the first fitting blank, both systems. `rail content / box` and `fin content / box` in CSS
dots — "content" is the tallest thing inside; "box" is the space it has. Overflow is 0 at both
report widths marked with no discrepancy below.

**RED (today's main, before this task's CSS fix, after Task 1's reworded notes line):**

| width | rail content/box | fin content/box | notes |
|---|---|---|---|
| computer | 427.1 / 438.9 | 151.5 / 175.0 | **passed** |
| 560 | 415.0 / 291.4 | 141.0 / 70.1 | rail rows wrapped, both overflow |
| 618 | 400.0 / 333.0 | 141.0 / 96.1 | both overflow |
| 680 | 405.5 / 376.8 | 142.4 / 141.5 | both overflow |
| 733 | 427.0 / 413.0 | 151.5 / 158.8 | rail overflows |
| 760 | 438.8 / 431.0 | 156.6 / 167.1 | rail overflows |
| 800 | 456.7 / 457.7 | 164.3 / 179.2 | fits (as before) |
| 900 | 500.9 / 524.5 | 183.3 / 209.5 | fits (as before) |

Imperial and Metric matched to the decimal except rail at 560 (Imperial 415.0, Metric 433.0 — the
label width difference, both against the same 291.4 box).

**GREEN (after Task 3's CSS fix), both systems — identical to the decimal:**

| width | rail content/box | fin content/box | rail row font |
|---|---|---|---|
| computer | 427.1 / 438.9 (unchanged) | 151.5 / 175.0 (unchanged) | 12.835 px (unchanged) |
| 560 | 312.5 / 312.5 | 102.2 / 128.6 | 8.301 px |
| 618 | 344.5 / 344.5 | 116.0 / 150.0 | 9.560 px |
| 680 | 378.4 / 384.4 | 130.6 / 169.7 | 10.905 px |
| 733 | 407.7 / 418.1 | 143.2 / 166.9 | 12.056 px |
| 760 | 418.8 / 436.3 | 148.0 / 175.5 | 12.502 px |
| 800 | 435.3 / 463.3 | 155.1 / 207.8 | 13.160 px |
| 812 | 440.3 / 471.5 | 157.3 / 211.9 | 13.357 px |
| 900 | 477.2 / 530.8 | 173.1 / 241.8 | 14.805 px |

Every GREEN number matched `<plan_time_measurements>`'s own "AFTER Task 3" table to the decimal —
**nothing here differed from the plan by more than 1 px.** The computer print's report line is
byte-for-byte identical between the RED and GREEN runs (rail 427.1/438.9, fin 151.5/175.0, rail row
font 12.835px), confirming L-3 (computer print and page 1 unchanged).

At every GREEN width, in both systems: column overflow was 0, Shaper Use Only's bottom sat 4.0 px
above the PAGE 2 OF 2 footer, and no rail row wrapped.

## `npm test` counts before and after each task

Vitest only — the new Playwright tests below aren't part of `npm test`.

| point | passed | skipped | total |
|---|---|---|---|
| before Task 1 | 3333 | 2 | 3335 |
| after Task 1 (+5 new tests in fins.test.ts) | 3338 | 2 | 3340 |
| after Task 2 (no vitest change — Playwright only) | 3338 | 2 | 3340 |
| after Task 3 (+3 new tests in order-form-print.test.ts) | 3341 | 2 | 3343 |

One unrelated test (`lib/geometry/blank-fit.test.ts`'s deck-skin geometry sweep) timed out once
under parallel load during a full-suite run and passed cleanly (699 ms) on its own — a pre-existing
flaky timeout, untouched by this task, not counted as a failure above.

## Commits

1. `69d5f19` — **Task 1:** `fix(fins): the fin notes' last line says the numbers round to the
   nearest 1/16" or the nearest millimetre, whichever the shaper reads (quick 260928-vpi)`
2. `f9c4da9` — **Task 2:** `test(summary): page 2 of a phone print checked at every width for rail
   marks and fin numbers that stay in their own boxes — fails until the fix lands (quick
   260928-vpi)`
3. `55890f1` — **deviation fix** (found during Task 3's green pass): `fix(e2e): two of case D's own
   new checks were reading the wrong number (quick 260928-vpi)`
4. `5a416dd` — **Task 3:** `fix(summary): page 2 printed from a phone keeps every rail mark and fin
   number in its own box, and a computer print is unchanged (quick 260928-vpi)`

## Files Created/Modified

- `lib/geometry/fins.ts` — adds `finRoundingGrain`/`finRoundingNote`; the notes block no longer
  pushes the rounding sentence
- `lib/geometry/fins.test.ts` — pins both wordings and ties them to every golden fixture's printed
  fin numbers
- `components/summary/order-form.tsx` — appends `finRoundingNote(system)` under `data-fin-notes`;
  adds `order-form-content-floor` to the rail row and the Fin Placement box
- `components/fins/fin-model-info.tsx` — MODEL INFO's Convention paragraph reads the rounding grain
  per system
- `e2e/summary-planing.spec.ts` — case D reworked to assert the fit at every width 560-900 (the old
  560-dot exemption is gone); a new wording test; two of the new checks' own measurement bugs fixed
- `app/design/summary/order-form.css` — the phone-sheet fit rule (`--order-form-ref-unit`) and the
  `.order-form-content-floor` rule, both inside `@media print`
- `components/rails/rail-data-table.tsx` — the compact rail table's last group loses its trailing
  margin (`last:mb-0`)
- `components/summary/order-form-print.test.ts` — three new contract tests pinning the fit rule

## Decisions Made

See `key-decisions` in the frontmatter above. All three were already locked by the plan's own
`<decisions>` and `<coordinator_confirm>` sections — none required a fresh decision during
execution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The Metric wording test read the page before the units preference reached it**
- **Found during:** Task 3's green pass (running the new wording test on the `iphone` project)
- **Issue:** `selectSystem` only set `localStorage`, but the server resolves the very first
  paint's system from a cookie (`app/layout.tsx`'s `resolveUnitsHandoff()`). A page read
  immediately after `page.goto`, with no click in between to trigger React's own re-sync, still
  showed the server's Imperial default — reproduced deterministically (3/3) on the `iphone`
  project.
- **Fix:** `selectSystem` now also sets the `shaper-units` cookie via `page.context().addCookies`
  (not an in-page `document.cookie` write, which would arrive too late for the first request).
- **Files modified:** `e2e/summary-planing.spec.ts`
- **Commit:** `55890f1`

**2. [Rule 1 - Bug] Guard (a)'s sheet-ratio check read the wrong box**
- **Found during:** Task 3's green pass (desktop project, 560 dots)
- **Issue:** The check compared `clientHeight / clientWidth` (the sheet's content box, integer-
  rounded, excluding its 1px border) against the Letter ratio the CSS locks on the sheet's BORDER
  box. At 560 dots that rounding was enough (1.2957 vs. 1.294118) to trip the check's own 0.001
  tolerance even though the sheet's real printed shape was correct.
- **Fix:** Reads the sheet's `getBoundingClientRect()` instead — sub-pixel, same border box the
  CSS actually locks — matching the pattern `e2e/summary-print-touch-box.spec.ts`'s own ratio
  check already uses.
- **Files modified:** `e2e/summary-planing.spec.ts`
- **Commit:** `55890f1`

**3. [Rule 1 - Bug, minor] A doc comment quoted the class name it was documenting, breaking a raw
`grep -c` gate**
- **Found during:** Task 3, before its own commit
- **Issue:** A prose comment above the rail row div wrote the literal string
  `order-form-content-floor` in backticks, making the raw file's occurrence count 3 instead of 2
  (the plan's own gate checks the RAW file, not the comment-stripped one the contract test uses).
- **Fix:** Reworded the comment to describe the class without repeating its literal name.
- **Files modified:** `components/summary/order-form.tsx`
- **Committed in:** `5a416dd` (folded into Task 3's own commit, caught before it was made)

---

**Total deviations:** 3 auto-fixed (all Rule 1 — bugs in this task's own test instrumentation and
documentation, none in the shipped CSS or geometry code).
**Impact on plan:** All three fixes are to the test's own measurement code or a comment; none
touched the fix's actual mechanism (`--order-form-ref-unit`, `.order-form-content-floor`), which
matched the plan's own pre-measured numbers to the decimal at every width. No scope creep.

## Issues Encountered

None beyond the deviations above.

## Known Stubs

None.

## Threat Flags

None - no new attack surface. This is a display-only change (Rule 2, CLAUDE.md): no new network
call, no new stored key, no new input, and Task 1's gate confirmed no diff under
`lib/geometry/__fixtures__`, `scripts`, `lib/models`, `lib/db` or `db`.

## Self-Check

- `lib/geometry/fins.ts` — FOUND, exports `finRoundingGrain`/`finRoundingNote`
- `e2e/summary-planing.spec.ts` — FOUND, contains `FIT_WIDTHS`/`data-fin-notes`/`columnOverflow`
- `app/design/summary/order-form.css` — FOUND, contains `--order-form-ref-unit`
- `components/summary/order-form-print.test.ts` — FOUND, 11 tests passing
- Commit `69d5f19` — FOUND in `git log`
- Commit `f9c4da9` — FOUND in `git log`
- Commit `55890f1` — FOUND in `git log`
- Commit `5a416dd` — FOUND in `git log`

## Self-Check: PASSED

## Next Phase Readiness

- Phase 13 item 8b is done. Next per STATE.md: item 9 (catalogue links, if time) and 9b (the ghost
  outline, optional).
- **Coordinator steps still open** (per this plan's `<verification>`, not part of this executor's
  scope): `npm run test:e2e` (full suite, desktop baselines), `npm run test:e2e:prod`, `npm run
  build`, before/after headless PDFs on Letter and A4 in both systems, and — the one proof no
  browser engine here can substitute for — **a forced-touch print at 618 dots on the founder's own
  iPhone.**

---
*Task: quick-260928-vpi*
*Completed: 2026-09-29*
