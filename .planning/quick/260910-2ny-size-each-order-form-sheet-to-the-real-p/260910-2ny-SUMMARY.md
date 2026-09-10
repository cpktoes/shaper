---
phase: quick-260910-2ny
plan: 01
subsystem: ui
tags: [css-print, next-public-folder, playwright, ios-safari]

requires: []
provides:
  - "public/__print-probe.html — a hidden, self-contained static probe page that lets the founder
    print from his own iPhone and hand back a PDF answering whether iOS Safari resolves 100vh/100vw
    against the real printed page area. Built in Task 1, deleted again in Task 6 once its one
    question was answered."
  - "SUPERSEDED by Task 9 — a phone-only print rule giving a shorter, PAPER-SHAPED box with an
    absolute inch width. Task 7's confirming print showed the width was the actual bug (iOS does not
    honour an absolute inch width at all); see the Task 9 entry below for what replaced it."
  - "Two touch print rules in app/design/summary/order-form.css
    (`[data-order-form-root][data-print-touch]` and its `[data-order-form-sheet]` descendant) that
    give a touch device's sheet its WIDTH FROM THE PAGE (a plain 100%) and its SHAPE FROM THE PAPER
    (`aspect-ratio: 8.5 / 11`) — no absolute length anywhere in either rule — while a computer's
    printed sheet stays byte-identical to before (D-01)."
  - "components/summary/use-print-fit.ts's `beforePrint` now writes NOTHING on the touch path — it
    reads the touch attribute the mount effect already set and returns before any inline width or
    height is written, so nothing in the app can put a fixed size back."
  - "components/summary/order-form-print.test.ts's source-contract cases, rewritten to guard the new
    mechanism: the phone rule's shape must stay the squarest paper `use-print-fit.ts` claims to fit,
    neither touch rule may carry an absolute length or a viewport unit, and the handler must return
    before writing anything on the touch path."
  - "e2e/summary-print-touch-box.spec.ts — rewritten around the page-relative mechanism (six cases:
    desktop control, touch relationships at two page widths, PDF page count with its control, and a
    type-size/fit sweep across seven page widths). Written and gated by vitest/tsc/lint only — NOT
    RUN in this worktree; see 'NOT RUN' below."
affects: [260910-2ny-Task-11, 260910-2ny-Task-12]

actuals:
  tokens: 29500
  tasks: 8
  commits: 8

tech-stack:
  added: []
  patterns:
    - "A hidden public/ probe page (noindex, zero external requests) as the only way to settle a
      print-engine question no CLI or emulator can answer — build it, get a human to print it on
      the real device, read the PDF, then delete it."
    - "SUPERSEDED (Task 7 disproved the premise) — a phone-only print box expressed as a SHAPE
      applied to an absolute width. Kept here so the record shows what was tried and why it failed:
      the shape half was right, the absolute width beside it was not."
    - "A touch sheet's box expressed as a WIDTH FROM THE PAGE (`width: 100%` on the container, plain
      `width: auto` on the sheet) and a SHAPE FROM THE PAPER (`aspect-ratio`) — no size, no
      calculation, no absolute length anywhere — because iOS Safari was measured (twice, on the
      founder's own phone) to scale a page-relative layout to fit while letting an absolute-width
      one overflow. `aspect-ratio` on a definite width still yields a definite height, so the
      sheet's `flex` bands keep dividing a real number rather than going content-proportional."
    - "A print handler that WRITES NOTHING on the path it used to control — reading a DOM attribute
      and returning immediately is a stronger contract than mirroring two files' numbers, because
      there is no longer anything for the two files to disagree about."
    - "A DOM attribute written once at mount from a screen-media `matchMedia` query
      (`data-print-touch`), read only by print-media CSS — keeps the print stylesheet from ever
      having to ask a printer what kind of pointer it has, and keeps 'which device' out of a print
      media query that would otherwise test the page, not the screen."

key-files:
  created:
    - public/__print-probe.html (Task 1, deleted again in Task 6)
  modified:
    - components/summary/order-form-print.test.ts (Tasks 3, 8)
    - app/design/summary/order-form.css (Tasks 4, 9)
    - components/summary/use-print-fit.ts (Tasks 4, 9)
    - components/summary/order-form.tsx (Tasks 4, 9)
    - components/rocker/rocker-view-frame.ts (Tasks 4, 9)
    - e2e/summary-print-touch-box.spec.ts (Tasks 5, 10 — still not run; see "NOT RUN" below)
    - e2e/summary-print-size.spec.ts (comment-only, Task 4 — untouched again in Tasks 9-10, D-01)

key-decisions:
  - "Task 8's rewritten test cases assert ABSENCE (no absolute length, no viewport unit anywhere in
    either touch rule) rather than a specific number, because the defect the founder's second print
    found was exactly a property nobody reviewing a diff would notice going missing. A positive
    'the height is X' assertion could never have caught this task's own predecessor bug."
  - "Deleted `TOUCH_SHEET_RATIO` from use-print-fit.ts entirely rather than keeping it unused —
    confirmed with a grep first that nothing outside that file imported it. The stylesheet now owns
    the shape outright (`aspect-ratio: 8.5 / 11`); a derived constant with no consumer is exactly
    the kind of stale reference that outlives the code it described."
  - "`aspect-ratio: 8.5 / 11` is the plain two-number form, not the measured-and-working
    `max(8.5 / 11, 8.27 / 11.69)` — this project has already shipped a case where Safari and
    Playwright's WebKit disagreed on a CSS math function in this exact file
    (`--order-form-preview-scale`'s `tan(atan2())`), the founder has exactly one print left, and a
    two-number ratio has been bedrock everywhere since 2021. The derivation itself still lives in
    `order-form-print.test.ts`, which works out the squarest paper from `PORTRAIT_PAPER_IN` and
    asserts these two figures, so the stylesheet stays dumb and the two files still cannot drift."
  - "The handler's early return sits immediately after `data-printing` is set and before
    `printableBoxPx()` is even called — not just before the inline width write — so nothing between
    the touch check and the return does any work for a device that is about to discard it."
  - "e2e/summary-print-touch-box.spec.ts's six cases assert RELATIONSHIPS (sheet width equals root
    width equals page width; height/width equals the paper's own ratio) instead of absolute dot
    figures, because the touch sheet no longer has a size of its own — an absolute assertion there
    would test the Playwright viewport, not the app."
  - "The type-size/fit sweep (case 6) pairs samples by DOM position across two page widths rather
    than by a CSS class label, so a fixed-pixel size that fails to scale is caught by index even if
    it shares a class name with a token that does scale correctly."
  - "Followed the plan's spec for Task 1's probe verbatim — no architectural deviations, no Rule 4
    escalations (recorded in the original Task-1 summary, kept below unmodified)."
  - "The founder's own iPhone print sent this plan down research fallback (b) — a phone-only box —
    because `100vh`/`100vw` in the probe resolved to the SCREEN viewport (402 x 750 CSS px), not the
    printed page. A page-relative mechanism was therefore refuted before Tasks 3-6 ever started;
    see 260910-2ny-PROBE-READING.md."
  - "The touch sheet's height is a RATIO — `min(11 / 8.5, 11.69 / 8.27)`, the squarest of the two
    portrait papers this form already fits (US Letter) — applied to the same width expression the
    desktop rule already uses, never a literal number. Proof: for a portrait page with a uniform
    margin on every side, the printable box's ratio is at or above the paper's own height/width for
    any margin from zero upward, so a sheet built to that ratio fits inside whatever uniform margin
    a touch device's browser picks. Measured against the founder's own iPhone page (9.82in /
    7.34in = 1.3379): the chosen ratio (1.294118) leaves 3.3% to spare."
  - "`FIT_SAFETY` (0.995) and the `zoom` overflow guard were both KEPT on the desktop path, reversing
    the original plan's intent to remove them. The original plan assumed (from RESEARCH.md Finding
    1) that iOS slices a continuous ribbon, which would make a proportional shave accumulate across
    sheets. The founder's iPhone print DISPROVED that: `SHEET A TOP`/`BOTTOM` landed together on one
    page and `SHEET B`'s pair on the next, so iOS fragments and honours forced breaks exactly like
    every other engine measured. `FIT_SAFETY` is part of the desktop box the measured e2e gate pins
    (D-01), so it stays untouched; the touch height does not use it at all — it carries 3.3% of
    headroom by construction and does not need one."
  - "The touch height is derived in `use-print-fit.ts` as `TOUCH_SHEET_RATIO = Math.min(...PORTRAIT_PAPER_IN.map(p => p.height / p.width))`
    rather than a second literal — it can only ever mean 'the squarest paper we claim to fit', and
    it cannot silently drift from the same four constants the desktop box already shares with the
    stylesheet."
  - "The touch attribute (`data-print-touch`) is decided from the POINTER, at mount, in a separate
    `useEffect` from the print-time one — never from a width, and never inside `beforePrint`. A
    width query in print media tests the PAGE, not the screen, which would either match on a
    computer (wrecking D-01) or miss an iPad (a coarse pointer on a wide screen, running the same
    WebKit print path an iPhone does). `beforePrint` then reads the attribute the mount effect
    already wrote, rather than asking the media query a second time, so the inline height it writes
    can never disagree with the CSS rule that is about to apply."
  - "Added `[data-order-form-sheet] + [data-order-form-sheet] { break-before: page; }` beside the
    existing per-sheet `break-after: page` (D-03) — belt and braces, not a repair. Verified at plan
    time (and unchanged by this session) that the print buttons sit outside
    `[data-order-form-root]`, so the existing `:last-child` reset already prevents a trailing blank
    page; the new rule is what keeps that true if the tree around the sheets ever changes."
  - "Moved the sheet's `overflow: hidden` print backstop out of the `[data-order-form-root][data-printing]`
    scope and made it unconditional. That scoping rested on the (now-disproven) belief that a
    phone's print path never applies the print handler's work; unconditional, it holds whether or
    not any JavaScript ever runs. `data-printing` itself is still written by the handler, kept only
    because `e2e/summary-print-size.spec.ts`'s middle case still reads its absence to prove the
    handler was really suppressed there."
  - "Four comment sites were found false against the founder's iPhone print and corrected in place,
    following the plan's own comment audit exactly (no site outside that audit's list was touched):
    `order-form.css`'s head comment and its printed-sheet-box rule comment (both claimed a phone
    never ran the print handler and printed roughly 86% too big — corrected to say the handler runs
    there, and the 86% is Safari's own automatic width shrink); `use-print-fit.ts`'s head comment
    (same false story, same correction); and `e2e/summary-print-size.spec.ts`'s head comment's third
    'fact' (claimed the suppressed-handler case reproduces what a phone's print path actually did —
    corrected to say it is a deliberate simulation, not a description, now that the probe print
    showed `beforeprint` really does fire on iOS). Three further sites got one added clause each,
    per the plan's audit, rather than a rewrite: the `@page` margin comment (iOS ignores it
    entirely); the root-width comment (cut the false 'phone failure' attribution, kept the load-
    bearing half); and `rocker-view-frame.ts`'s `ORDER_FORM_ROCKER_BOX_PX` comment (recorded the
    4.18%-shorter touch box costs the rocker frame nothing — still width-bound — and repointed a
    dangling `<post_merge_check>` reference at Task 7)."

requirements-completed: [PRNT-06]

coverage:
  - id: D1
    description: "public/__print-probe.html exists, is self-contained, and its bands/flags populate
      correctly (Task 1, unchanged this session)"
    verification:
      - kind: e2e
        ref: "recorded in the original Task-1 summary section below"
        status: pass
    human_judgment: false
  - id: D2
    description: "The probe renders and prints under a real browser engine (Task 1, unchanged this
      session)"
    verification:
      - kind: other
        ref: "recorded in the original Task-1 summary section below"
        status: pass
    human_judgment: false
  - id: D3
    description: "SUPERSEDED (Task 7's print disproved the mechanism this pinned) — the stylesheet's
      phone rule and use-print-fit.ts's touch height described the same box, changing only height.
      See E1/E2 below for the mechanism that replaced it; the pointer-not-width half of this ID
      (now E5) is unchanged and still correct."
    verification:
      - kind: unit
        ref: "components/summary/order-form-print.test.ts — the 2 cases this covered were rewritten
          in Task 8; see E1/E2."
        status: superseded
    human_judgment: false
  - id: D4
    description: "SUPERSEDED (Task 7's print disproved the box this pinned) — a touch device's sheet
      was 733.44 x 949.16 CSS px, a fixed size derived from the same paper constants as the desktop
      box. Task 7 showed the WIDTH half of that box was never honoured by iOS Safari. See E1-E3 for
      the page-relative mechanism that replaced it."
    verification:
      - kind: unit
        ref: "components/summary/order-form-print.test.ts's old case — rewritten in Task 8; see E1."
        status: superseded
      - kind: e2e
        ref: "e2e/summary-print-touch-box.spec.ts — rewritten in Task 10; see 'NOT RUN' in the body
          below."
        status: superseded
    human_judgment: false
  - id: D5
    description: "The desktop gate (e2e/summary-print-size.spec.ts) still passes on its current
      733.44 x 990.55 constants, with not one non-comment line changed"
    verification:
      - kind: other
        ref: "`git diff -U0 -- e2e/summary-print-size.spec.ts | grep -E '^[+-]' | grep -vE '^(\\+\\+\\+|---)' | grep -vE '^[+-][[:space:]]*(\\*|/\\*|\\*/|//)'` — empty output, confirmed before
          committing Task 4"
        status: pass
      - kind: e2e
        ref: "PW_PORT=3108 npx playwright test e2e/summary-print-size.spec.ts --project=desktop —
          NOT run in this worktree; see Deviations. Left for the orchestrator on a clean checkout."
        status: pending
    human_judgment: false
  - id: D6
    description: "Three sheets (with Rail Band Instructions on) still make exactly three PDF pages
      with the touch box forced on, and exactly three without it (control)"
    verification:
      - kind: e2e
        ref: "e2e/summary-print-touch-box.spec.ts's two page-count cases — rewritten in Task 10 for
          the new mechanism, still NOT run in this worktree; see 'NOT RUN' in the body below."
        status: pending
    human_judgment: false
  - id: D7
    description: "public/__print-probe.html no longer exists and nothing outside .planning/
      references it"
    verification:
      - kind: other
        ref: "`test ! -e public/__print-probe.html` and `grep -rl '__print-probe' --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude-dir=.planning .` — both confirmed empty/passing"
        status: pass
    human_judgment: false
  - id: E1
    description: "Neither touch rule (`[data-order-form-root][data-print-touch]` or its
      `[data-order-form-sheet]` descendant) carries an absolute CSS length or a viewport unit
      anywhere in its declarations; the sheet rule's shape is the squarest paper
      PORTRAIT_PAPER_IN claims to fit"
    verification:
      - kind: unit
        ref: "components/summary/order-form-print.test.ts — 2 rewritten cases, RED against
          pre-Task-9 source (confirmed 3 of 8 failing for the right reasons, 5 passing), GREEN
          after Task 9 (8/8 passing)."
        status: pass
    human_judgment: false
  - id: E2
    description: "The print handler (use-print-fit.ts's beforePrint) returns before writing any
      inline width or height on the touch path — reads the mount-time attribute, never the media
      query a second time"
    verification:
      - kind: unit
        ref: "components/summary/order-form-print.test.ts's new case, checking the comment-stripped
          source for the attribute read, the first inline width write, and a bare return between
          them — RED before Task 9, GREEN after."
        status: pass
    human_judgment: false
  - id: E3
    description: "A touch device's sheet width equals the root's width equals the page wrapper's own
      content width, at more than one page width, in both phone engines; its height/width ratio is
      1.294118 (US Letter); a computer's box (733.44 x 990.55) is unmoved"
    verification:
      - kind: e2e
        ref: "e2e/summary-print-touch-box.spec.ts — rewritten in Task 10 (six cases, including this
          relationship at two page widths). NOT RUN in this worktree; see 'NOT RUN' in the body
          below. tsc/lint/npm test all pass against the new file."
        status: pending
    human_judgment: false
  - id: E4
    description: "Every text size on a touch sheet scales with the page area above the design width
      (no fixed-pixel size hiding in the sheet), and no sheet overflows its band across a swept
      range of page widths, with the Rail Band Instructions sheet on"
    verification:
      - kind: e2e
        ref: "e2e/summary-print-touch-box.spec.ts's sweep case (case 6) — written in Task 10. NOT RUN
          in this worktree; see 'NOT RUN' in the body below. This is the measurement Task 11 exists
          to take and could not."
        status: pending
    human_judgment: false
  - id: E5
    description: "The touch rule keys on the pointer attribute the handler writes, decided from the
      pointer rather than the window's width (unchanged from D3, still correct)"
    verification:
      - kind: unit
        ref: "components/summary/order-form-print.test.ts's kept case, untouched by Tasks 8-9,
          still passing."
        status: pass
    human_judgment: false

duration: 55min + this session
completed: 2026-09-10
status: incomplete
---

# Quick Task 260910-2ny — Tasks 8-11 of 12: a phone's sheet now sizes itself off the page

**This session picked the plan up after Task 7's confirming print FAILED, and ran Tasks 8, 9 and
10 to green — a new print test, the fix it demands, and the browser spec that will prove it on
real WebKit and Chromium. Task 11, the measurement the founder's last print depends on, could NOT
be run: this worktree cannot start a Next.js dev server, and Playwright needs one. Task 11 is
recorded below as NOT RUN, with the exact commands the orchestrator has to run before Task 12.**

## Why this session exists — Task 7 failed

The founder printed the real order form from his iPhone at 100% on 2026-09-10 at 11:53, after
Tasks 3-6 shipped the first phone-only fix. **Still four pages for three sheets.** The reading is
`260910-2ny-PROBE-READING-2.md`, and it is the most useful measurement of the three taken so far,
because it isolates exactly what was wrong:

| | CSS sheet | printed | scale |
|---|---|---|---|
| before the first fix | 7.6400 x 10.3182in | 8.758 x 11.832in | 1.1464 |
| after the first fix  | 7.6400 x  9.8870in | 8.719 x 11.288in | 1.1413 |

**The identical 7.640in of CSS width printed at 8.758in and then 8.719in — the width barely moved
while only the height changed.** iOS Safari does not honour an absolute inch width at all; it
scales the whole document by about 1.144 regardless of the sheet's own height, so the sheet
overhung the 7.347in printable width by about 19% on both edges no matter what shape it was given.
No height could have fixed that — fitting at that printed width would need a ratio 13% squarer than
the paper, visibly distorting the form and calibrated to one phone's margins.

The lever had been sitting in round 1's own probe print the whole time, unread: a layout with NO
absolute width printed at exactly 7.347 x 9.821in — the printable box, Safari's own margins
honoured, nothing overhanging. iOS scales a page-relative layout to fit and lets an absolute-width
one overflow.

## Task 8 — the contract test first, RED again

Rewrote two of Task 3's three phone cases in `components/summary/order-form-print.test.ts` and
added a fourth, all confirmed failing against Task 4's shipped (now-disproven) source before Task 9
made them pass:

1. **The phone rule's shape is the squarest paper `use-print-fit.ts` claims to fit** — reads the
   touch sheet rule's `aspect-ratio`, works out which of `PORTRAIT_PAPER_IN`'s papers is squarest,
   and asserts the two match (both the figures and the evaluated ratio, to six places).
2. **The phone rules carry no absolute length at all** — the file's most important assertion. Reads
   every declaration in both touch rules (the root's and the sheet's) and asserts none carries an
   inch, millimetre, centimetre, point, pica, quarter-millimetre, pixel or viewport unit; the sheet
   declares `width`/`height: auto` plus an `aspect-ratio`; the root declares a plain `100%` width
   and nothing else is allowed a percentage; both rules sit later in the file than their desktop
   counterparts.
3. **The handler returns before writing anything on the touch path** — reads the comment-stripped
   hook source, finds where it reads the touch attribute and where it first writes an inline root
   width, and asserts the attribute read comes first with a bare `return` between them.

Confirmed before committing: exactly the 3 new/rewritten cases failed, the 4 original desktop cases
and the kept pointer case (5 total) still passed. `npm run lint` clean (0 errors, the same 12
pre-existing warnings). Commit: `338fa9c` (test).

## Task 9 — GREEN, and every stale comment corrected again

Four files changed (commit `076e8f2`, fix):

- **`app/design/summary/order-form.css`.** The desktop rules (`[data-order-form-root]`,
  `[data-order-form-sheet]`) are byte-for-byte unchanged. Replaced the shipped
  `[data-order-form-root][data-print-touch] [data-order-form-sheet]` height-only rule with two
  rules: `[data-order-form-root][data-print-touch] { width: 100% !important; }`, and the sheet
  descendant rule now declaring `width: auto !important; height: auto !important; aspect-ratio: 8.5
  / 11 !important;` — nothing else. No inch, millimetre, pixel or viewport unit anywhere in either
  rule. Corrected the head comment, the `@page` margin comment, the desktop sheet box comment, and
  rewrote the `cqw` type-scale comment to add the touch-path arithmetic (the 8.65pt-to-10.3pt range
  and what it means).
- **`components/summary/use-print-fit.ts`.** Deleted `TOUCH_SHEET_RATIO` outright (grepped first —
  no consumer outside this file). `beforePrint` now reads the touch attribute immediately after
  setting `data-printing`, before `printableBoxPx()` is even called, and returns — nothing below
  that point runs on a touch device. Rewrote the head comment's closing paragraph.
- **`components/summary/order-form.tsx`** and **`components/rocker/rocker-view-frame.ts`** — one
  paragraph each rewritten (no code changes) to describe the new mechanism; see `key-decisions`
  above for exactly what changed in each.
- **`e2e/summary-print-size.spec.ts`** — untouched. Confirmed empty diff before committing (D-01).

Gates run, all green: `npx vitest run components/summary/order-form-print.test.ts` (8/8),
`npx tsc --noEmit` (only the two documented pre-existing `LayoutProps` errors), `npm test` (55
files, 2421 passing — the 2420 baseline plus Task 8's one net new case — 2 skipped), `npm run lint`
(0 errors, 12 pre-existing warnings), the diff gate on `e2e/summary-print-size.spec.ts` (empty).

## Task 10 — the browser spec rewritten around the new mechanism

Rewrote `e2e/summary-print-touch-box.spec.ts` (commit `c809bed`, test) from scratch around
relationships instead of absolute dot figures — the touch sheet no longer has a size of its own, so
an absolute assertion would test the Playwright viewport rather than the app. Six cases:

1. **Desktop control (D-01)** — unchanged box, 733.44 x 990.55 within a dot.
2. **A touch device's sheet takes its width from the page** — on `iphone`/`android`: the
   load-bearing pointer precondition first, then the touch attribute, then three relationships:
   sheet width = root width = page wrapper's own content width, and sheet height/width = 1.294118.
3. **The same three relationships at a materially different page width** (+300px viewport) — if any
   relationship moves with the viewport, something absolute is still in the chain.
4. **The shorter sheet still makes exactly 3 PDF pages** with the touch box forced on (desktop
   only, real Chromium PDF, page-object count).
5. **The control** — same 3 sheets, same PDF, without the touch box forced on: still 3.
6. **THE MEASUREMENT** — sweeps 7 page widths (560, 618, 680, 733, 760, 812, 900 dots) on all three
   projects, with the Rail Band Instructions sheet on and the touch box forced on. At each width:
   walks every element inside every sheet, records the smallest computed font size and which
   element carries it, every distinct size, and whether `scrollHeight` exceeds `clientHeight` per
   sheet — printed to the console as a table. Asserts (a) every font size scales with the page
   between the two widths above the design width (760 vs 812), paired by DOM position so a
   fixed-pixel size is caught even if it shares a class name with a token that scales correctly, and
   (b) nothing overflows at any width.

Gates run, all green: `npx tsc --noEmit` (same two pre-existing errors only), `npm run lint` (0
errors, unchanged), `npm test` (55/55, 2421 passing, 2 skipped — vitest's `include` never touches
`e2e/`, so this only proves nothing else broke). **None of this file's own Playwright commands
could be run — see Task 11 below.**

## Task 11 — NOT RUN (this is the task this session exists for, and it could not be performed here)

**This worktree cannot start a Next.js dev server at all**, confirmed directly this session (not
assumed from the prior session's note): `npm run dev -- --port 3108` produces the identical
Turbopack "Could not find the Next.js package" error `npm run build` already fails with —

```
Turbopack build encountered 1 error:
./app
Error: Could not find the Next.js package (next/package.json)
Resolved from: <worktree>/app
```

Playwright's `webServer` config runs exactly that command, so no Playwright test that needs the
real app running — which is every case in `e2e/summary-print-touch-box.spec.ts` and
`e2e/summary-print-size.spec.ts` — can execute inside this worktree. There is no standalone
workaround this time either: unlike a static probe page, the order form is a full React app behind
the design store, and there is no way to render it without either the broken dev server or a build.
Hitting the deployed production site instead would not help — it is still running the FIRST
(now-disproven) fix, not the code this session just wrote.

**Per this run's own rulings, a derived number is not a measurement, and writing
`260910-2ny-BROWSER-READING.md` with anything other than real measured numbers is explicitly
prohibited.** No such file has been written. Task 11 is left unclaimed rather than faked.

### NOT RUN — orchestrator must run these before the founder prints

On a clean checkout of this worktree's branch (where `next dev` actually resolves):

```bash
PW_PORT=3108 npx playwright test e2e/summary-print-touch-box.spec.ts
PW_PORT=3108 npx playwright test e2e/summary-print-size.spec.ts --project=desktop
```

The first command runs all three projects (`desktop`, `iphone`, `android`) — deliberate, since the
touch relationships have to be measured on WebKit as well as Chromium. The second is the desktop
half of D-01: if it does not pass, STOP — a computer's printing changing is worse than anything else
this plan could produce, and it has never been run since the touch rules first existed.

After both pass, write `.planning/quick/260910-2ny-size-each-order-form-sheet-to-the-real-p/260910-2ny-BROWSER-READING.md`
per Task 11's own `<action>` block: front matter naming what ran and on what, the measured desktop
box, the three touch relationships on both phone projects at both swept widths (with real numbers,
not "within tolerance"), both PDF page counts, case 6's whole console table, and the two plain-
English answers the founder's print depends on — the printed type size in points (convert with
`72 x dots x P / C`, `P` = 7.347in measured on his phone, `C` = the page area in dots) and the
narrowest page the form still fits. **If case 6(a) or 6(b) fails, do not proceed to Task 12** — the
named remedies are in the plan's Task 11 `<action>` block.

## What the founder's one remaining print (Task 12) must show

Unchanged from the plan itself, restated here so it is not buried three files away: with **Include
Rail Band Instructions in Print** ticked, **three sheets on three pages at 100%** — one sheet per
page, nothing sliced across a page break, no sliver of the next sheet at the foot of a page, and no
blank page at the end. (Two sheets on two pages if that box is left unticked.) Worth a glance but
not a pass condition on their own: the rail band marking table's last row is present; there is
white space down both sides of each page as well as at the foot (Safari's own margin, respected for
the first time); the numbers read a whisker smaller than a computer's — about 4%, because his phone
leaves 7.35in of usable paper against a computer's 7.64in once Safari takes its own margins.

**This print cannot be requested — Task 11 must pass first (D-06).** The founder has done two
prints already and this plan is written so the third is the last one.

## Task Commits (this session)

6. Task 8: the contract test, RED again — `338fa9c` (test)
7. Task 9: the page-relative fix, GREEN, comments corrected — `076e8f2` (fix)
8. Task 10: the browser spec rewritten around the new mechanism — `c809bed` (test)

_No plan-metadata commit — the orchestrator handles STATE.md/ROADMAP.md updates once this SUMMARY
is in place, per this run's constraints. This SUMMARY.md is left uncommitted and modified on disk
for the orchestrator to pick up, same as the previous session left it._

## Deviations from Plan

**Task 11 could not be executed — a discovered environment limitation, not a code defect, and it is
the reason this whole run exists rather than a surprise found along the way.** See "Task 11 — NOT
RUN" above for the full account and the exact commands left for the orchestrator. No Rule 1-3
auto-fixes were needed for Tasks 8-10 — the plan's own arithmetic and file contents matched what was
found in the repo at each task's start.

## Human verification deferred to end-of-phase UAT

Per this run's orchestrator rulings (no mid-plan human-verify checkpoints;
`workflow.human_verify_mode: "end-of-phase"`), no `<human-check>` items were raised this session.
**Task 12 itself is the deferred human verification for the whole plan** — see "What the founder's
one remaining print must show" above — and it is explicitly blocked on Task 11 completing first.

## Next Steps

1. Orchestrator runs the two Playwright commands under "NOT RUN" above, on a clean checkout.
2. If both pass, orchestrator writes `260910-2ny-BROWSER-READING.md` with the real measured numbers
   per Task 11's own `<action>` block, applying either named remedy if case 6(a) or 6(b) calls for
   one, then re-measures.
3. Only then: push to `main`, confirm the deploy, and hand the founder the Task 12 print steps
   above — his third and, per this plan, his last.

---

# Quick Task 260910-2ny — Tasks 3-6 of 7: a phone gets a shorter, paper-shaped sheet

**Built and committed the phone-only print fix (Tasks 3-6): a contract test that failed on purpose,
the phone print rule and hook wiring that made it pass, a new browser spec measuring the box across
three engines, and the temporary probe page's removal. Task 7 — the founder's own confirming iPhone
print of the real order form — is still outstanding and cannot be performed by this executor.**

## Performance

- **Duration:** 55 min (this session — Tasks 3, 4, 5, 6)
- **Tasks:** 4 of 7 this session (Tasks 1 and 2 were already done and are recorded unchanged below;
  Task 7 is next, and is a blocking `checkpoint:human-action` this executor cannot perform)
- **Files modified:** 7 (1 created, 5 modified, 1 deleted)
- **Commits:** 4 (`6d0f97d`, `30dfd9f`, `625bf81`, `288c211`)

## Why Task 7 is still outstanding

Task 7 asks the founder to print the real order form from his own iPhone at 100% and report what
came off the printer — three sheets, three pages, no manual scaling. That is a physical action on
a physical device this executor has no access to, and per this plan's own `<execution_gate>` and
the run's orchestrator rulings, execution stops before it. Everything measurable on this machine —
the source-contract test, the desktop diff gate, the desktop and A4/Letter arithmetic — is green;
what remains is the one thing no browser in this repo can prove: what iOS Safari's own print
pipeline actually does with the box this session built for it.

## Task 3 — the contract test first, RED before anything was fixed

Added three new cases to `components/summary/order-form-print.test.ts` (commit `6d0f97d`), all
confirmed to fail against Task-2-era source and pass again once Task 4 landed:

1. **The phone rule and the print handler's own box describe the same piece of paper.** Extracts
   the phone rule's `height` declaration, checks its width figures and margin against
   `PORTRAIT_PAPER_IN`/`PAGE_MARGIN_MM`, checks its ratio pairs are `PORTRAIT_PAPER_IN`'s own
   height/width pairs (not a paper the handler has never heard of), then evaluates both sides at
   CSS's fixed 96px/25.4mm-per-inch and requires them within 0.02 dots.
2. **The phone rule changes only the height.** Asserts the rule declares no `width`, that its height
   value carries no viewport unit and no percentage, and that the rule appears later in the file
   than the desktop sheet rule (source order as the belt to the selector's own specificity braces).
3. **The phone rule keys on the pointer, not a width.** Reads the `data-print-*` attribute name
   straight out of the CSS selector, then asserts `use-print-fit.ts`'s comment-stripped,
   whitespace-collapsed source carries that same attribute name and the coarse-pointer media query
   as quoted strings.

Confirmed before committing: the three new cases failed (the phone rule and touch height did not
exist yet), and the four pre-existing cases — which cover the desktop box this whole plan leaves
untouched — still passed. `npm run lint` clean (12 pre-existing warnings, 0 errors, no new ones).

## Task 4 — GREEN, and every stale comment corrected

Four source files changed (commit `30dfd9f`):

- **`app/design/summary/order-form.css`.** Left the existing desktop `[data-order-form-sheet]` box
  rule untouched. Added, immediately after it: the phone-only height rule
  (`[data-order-form-root][data-print-touch] [data-order-form-sheet] { height: calc((min(8.5in,
  8.27in) - 16mm) * min(11 / 8.5, 11.69 / 8.27)) !important; }`); an adjacent-sibling
  `break-before: page` (plus the legacy `page-break-before: always` alias) beside the existing
  `break-after` pair, asking for the break between two sheets from both sides (D-03); and moved the
  `overflow: hidden` backstop out from under `[data-order-form-root][data-printing]` to apply
  unconditionally. Corrected the four false comment sites and added the three one-sentence clauses
  the plan's comment audit called for (see `key-decisions` above for the exact list).
- **`components/summary/use-print-fit.ts`.** Added `TOUCH_PRINT_ATTRIBUTE`, `COARSE_POINTER_QUERY`
  and a derived `TOUCH_SHEET_RATIO` constant; a new mount-time `useEffect` that sets/clears
  `data-print-touch` on the root from `matchMedia("(pointer: coarse)")` and follows its `change`
  event; and, inside `beforePrint`, a branch that reads that same attribute back off the root to
  choose the sheet height — the touch path uses `page.width * TOUCH_SHEET_RATIO`, the desktop path
  is `page.height * FIT_SAFETY`, byte-for-byte unchanged. Rewrote the head comment's false closing
  paragraph.
- **`components/summary/order-form.tsx`** and **`components/rocker/rocker-view-frame.ts`** each got
  one added sentence (no code changes) — see `key-decisions` above.
- **`e2e/summary-print-size.spec.ts`** — comment-only correction to its head comment's third "fact".
  Confirmed with a diff gate before committing that no non-comment line moved.

Gates run: `npx vitest run components/summary/order-form-print.test.ts` (7/7 green),
`npx tsc --noEmit` (only the two documented pre-existing `LayoutProps` errors, no new ones),
`npm test` (55 files, 2420 passing — the documented 2417 baseline plus Task 3's three new cases —
2 skipped), `npm run lint` (0 errors, 12 pre-existing warnings, unchanged), the diff gate on
`e2e/summary-print-size.spec.ts` (empty output — comment-only). **The Playwright desktop gate
(`PW_PORT=3108 npx playwright test e2e/summary-print-size.spec.ts --project=desktop`) could not be
run in this worktree — see Deviations below.**

Independently re-verified the touch-box arithmetic outside the test file, with `node -e` against
the same four constants: width 733.4476px, touch height 949.167px (vs. desktop's 990.550px —
0.9582 of it, 4.18% shorter), matching both the plan's own figures and the vitest contract test's
own evaluation.

## Task 5 — a new browser spec measuring the phone box in three engines

Wrote `e2e/summary-print-touch-box.spec.ts` (commit `625bf81`), a new file — `e2e/summary-print-size.spec.ts`
was not modified again and its helpers were not lifted out into anything shared, so that file's own
one permitted comment edit (Task 4) stays its only change. Four cases:

1. **A computer's sheet is untouched (D-01).** Desktop project only: no `data-print-touch`
   attribute, sheet box 733.44 x 990.55 CSS px within a dot, read directly off computed style after
   `page.emulateMedia({ media: "print" })` (no `beforeprint` needs to run — the stylesheet's own
   `!important` declarations apply the instant print media does).
2. **A touch device's sheet is the shape of the paper.** `iphone`/`android` projects only: asserts
   `window.matchMedia("(pointer: coarse)")` matches first (the load-bearing precondition, in the
   house style, so a project that silently stopped emulating touch cannot pass by accident), then
   the root carries the attribute, then the sheet box is 733.44 x 949.16 within a dot AND its
   height/width ratio is 1.294118 within half a thousandth — the ratio assertion is what proves WHY
   the box is that shape, not just that the numbers happen to match.
3. **The shorter sheet still makes one sheet per page, nothing blank at the end (D-03).** Desktop
   only (`page.pdf()` is Chromium-headless only): forces the touch attribute on, turns on Rail Band
   Instructions, prints a real Letter PDF, and counts PDF *page objects* (`/Type /Page`, never
   `/Type /Pages`) rather than pages carrying drawn content — a blank page still gets a page object,
   so this is what actually catches a trailing blank page a content-stream count would miss. Expects
   exactly 3.
4. **The control.** Same three sheets, same PDF, without the attribute forced on — also expects
   exactly 3, so case 3 cannot pass on a stylesheet that never worked without anyone noticing which
   half was being measured.

Gates run: `npm test` (55/55 files, 2420 passing, 2 skipped — unchanged), `npm run lint` (0 errors,
unchanged). **Both Playwright commands in this task's `<verify>` block — the new spec across all
three projects, and the desktop gate re-run — could not be executed in this worktree; see
Deviations below.**

## Task 6 — the probe leaves the live site

Deleted `public/__print-probe.html` (commit `288c211`, D-02). Re-confirmed at commit time (not
taken on trust, since Tasks 4 and 5 had touched files since the plan was written) that nothing
outside `.planning/` references it: `grep -rl '__print-probe' --exclude-dir=node_modules
--exclude-dir=.next --exclude-dir=.git --exclude-dir=.planning .` came back empty. No todo was
filed about the rails "View Full Sized" dialog (D-05) — it stayed untouched, as the founder closed
that follow-up permanently.

Gates run after deletion: `test ! -e public/__print-probe.html` (pass), the grep above (pass),
`npm test` (55/55, 2420 passing, 2 skipped), `npm run lint` (0 errors, unchanged).

## Task Commits

1. Task 1 (done previously): the print probe page — `e1dc83d` (feat)
2. Task 3: the contract test, RED — `6d0f97d` (test)
3. Task 4: the phone rule + hook wiring, GREEN, comments corrected — `30dfd9f` (fix)
4. Task 5: the new browser spec measuring the phone box — `625bf81` (test)
5. Task 6: the probe deleted — `288c211` (chore)

_No plan-metadata commit yet — the orchestrator handles that once this SUMMARY and STATE.md are in
place, per this run's constraints. This SUMMARY.md is left uncommitted and modified on disk for the
orchestrator to pick up._

## Files Created/Modified

- `public/__print-probe.html` — created Task 1, **deleted again in Task 6** once its one question
  (does iOS Safari resolve `100vh`/`100vw` against the printed page?) was answered.
- `components/summary/order-form-print.test.ts` — three new source-contract cases pinning the phone
  box to the desktop box's own constants.
- `app/design/summary/order-form.css` — the phone-only height rule, the adjacent-sibling forced
  break, the unconditional overflow backstop, and four corrected comment sites.
- `components/summary/use-print-fit.ts` — `TOUCH_PRINT_ATTRIBUTE`, `COARSE_POINTER_QUERY`,
  `TOUCH_SHEET_RATIO`, the mount-time pointer effect, and the `beforePrint` branch that reads it.
- `components/summary/order-form.tsx` — one added sentence noting the touch box in the sizing
  paragraph.
- `components/rocker/rocker-view-frame.ts` — one added paragraph recording the touch box costs the
  rocker frame nothing (still width-bound), and a repointed dangling reference.
- `e2e/summary-print-size.spec.ts` — one comment-only correction (Task 4); untouched again in Task 5.
- `e2e/summary-print-touch-box.spec.ts` — new file, the phone-box browser measurement (Task 5).

## Decisions Made

See `key-decisions` in the frontmatter above for the full list with reasoning. In short: kept
`FIT_SAFETY` and the `zoom` guard (the founder's print disproved the assumption that made the
original plan want them gone); derived `TOUCH_SHEET_RATIO` rather than hardcoding it; decided the
touch attribute from the pointer at mount, never from a width or inside `beforePrint`; added the
adjacent-sibling break as belt-and-braces, not a repair; made the overflow backstop unconditional;
and corrected exactly the comment sites the plan's own audit named — no site outside that list was
touched, and nothing marked "still true" in the audit was rewritten.

## Deviations from Plan

**The desktop Playwright gate and the new touch-box browser spec could not be run in this
worktree — this is a discovered environment limitation, not a code defect, and it is the one
substantive deviation this session has.**

Task 4's and Task 5's own `<precondition>` blocks anticipated one failure mode — another process
already holding `.next/dev/lock` — and gave an explicit fallback for it ("if the lock exists, do
not start a server ... leave the browser run to the orchestrator on a clean checkout"). What was
actually hit is a different, more fundamental one: `npm run dev` fails inside this worktree with
the exact same error CLAUDE.md already documents for `npm run build`:

```
Turbopack build encountered 1 error:
./app
Error: Could not find the Next.js package (next/package.json)
Resolved from: <worktree>/app
Filesystem root used for resolution: <worktree>
```

This is the documented "npm run build fails inside a worktree... Expected, not a failure, do not
work around it" limitation (this run's orchestrator ruling #3) — it turns out to also apply to
`npm run dev`, not just `npm run build`, because both go through the same Turbopack module
resolution. Diagnosed directly (one `npm run dev -- --port 3108` run, confirmed the identical
error, then stopped — no further attempts, no workaround). Applied the plan's own escape hatch by
analogy: made every source edit, ran every non-browser gate (`npx tsc --noEmit`, `npm test`,
`npm run lint`, the diff gate) to green, wrote the new browser spec in full, and left the four
Playwright commands (the desktop re-run in Task 4, the new spec's three-project run plus the
desktop re-run in Task 5) for the orchestrator to run against a clean checkout.

**What was independently verified in place of the browser run:** the vitest contract test
(`order-form-print.test.ts`) evaluates the CSS `calc()` expression and the hook's own arithmetic
numerically and requires them to agree to within 0.02 dots — this passing is strong evidence the
two files describe the same box, even without a browser rendering it. A second, fully independent
`node -e` calculation outside the test file (see Task 4 above) reproduced the same width/height/
ratio figures the plan itself derived at planning time. What neither of these can do is prove a
real browser lays the box out this way, or that three sheets with the shorter box really do land as
three PDF pages — that is exactly what `e2e/summary-print-touch-box.spec.ts` is written to measure,
and exactly what is still unmeasured pending a clean-checkout run.

No other deviations. Rule 1-3 auto-fixes: none needed — the plan's own arithmetic and file contents
matched what was found in the repo at each task's start.

## Human verification deferred to end-of-phase UAT

Per this run's orchestrator rulings (no mid-plan human-verify checkpoints; this project runs
`workflow.human_verify_mode: "end-of-phase"`), no `<human-check>` items were raised during Tasks 3-6
— every one of this session's own `<verify>` blocks was either run automatically or, where the
worktree could not run it (the browser gates above), left for the orchestrator with the reason
recorded rather than silently skipped.

**Task 7 itself is the deferred human verification for this entire plan**, and it is unusual in
being the plan's own last task rather than an incidental `<human-check>`: the founder needs to
print the real Summary order form from his own iPhone at 100% (no pinching, no percentage typed
in) and confirm three sheets came off as three pages, with the rail band table's last row present.
Everything else in this plan is measurable on a machine; that one step is not.

## Issues Encountered

- The worktree's inability to run `next dev` (see Deviations above) was the only blocker this
  session hit. It was diagnosed with a single direct `npm run dev -- --port 3108` invocation
  (confirmed to fail identically to `npm run build`'s already-documented worktree limitation), then
  not repeated — no further attempts were made to work around it, per this run's orchestrator
  ruling #3 ("Expected, not a failure, do not work around it").
- Task 1's probe-verification issue (a `fullPage` screenshot artifact) remains recorded, unchanged,
  in the section below — it was resolved in that session and had no bearing on this one.

## User Setup Required

None for Tasks 3-6. Task 7 (next) needs the orchestrator to push to `main`, wait for the Vercel
deploy, confirm `https://www.shaperassistant.com/design/summary` loads and that
`https://www.shaperassistant.com/__print-probe.html` no longer returns the probe, and then hand the
founder the print steps in the plan's own Task 7 `<how-to-verify>`.

## Next Phase Readiness

- Tasks 3-6 are committed on this worktree's branch (`6d0f97d`, `30dfd9f`, `625bf81`, `288c211`)
  and ready to ship once the orchestrator merges and pushes to `main`.
- **Before or immediately after merging, the orchestrator should run the four Playwright commands
  this worktree could not run** (see Deviations): the desktop gate re-run from Tasks 4 and 5, and
  the new `e2e/summary-print-touch-box.spec.ts` across all three projects — on a clean checkout
  where `next dev` actually resolves.
- Task 7 (blocking `checkpoint:human-action`) is next: push, confirm the live URLs, have the
  founder print the real order form from his iPhone at 100%, and record the outcome per the plan's
  own Task 7 instructions. If a sheet still splits, the single lever named in the plan is the ratio
  in `order-form.css`'s phone rule and the matching `TOUCH_SHEET_RATIO` derivation in
  `use-print-fit.ts`.

---

# Original Task 1 record (unchanged from the prior session)

## Quick Task 260910-2ny — Task 1 of 6: the print probe page

**Built and committed the self-contained iPhone print probe (`public/__print-probe.html`); this
plan's remaining five tasks were, at that point, genuinely unfinished and waited on the founder's
own test print.**

### Performance

- **Duration:** 25 min
- **Started:** 2026-09-10T16:29:00Z
- **Completed:** 2026-09-10T16:54:56Z
- **Tasks:** 1 of 6 (this plan is executed in two goes with a human in the middle, per its own
  `<execution_gate>`)
- **Files modified:** 1

### Accomplishments

- Built `public/__print-probe.html`: one self-contained static file (no React, no imports, no
  build step, no external request of any kind) carrying all five sections the plan specified:
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
     `VIEWPORT <w> <h>` readout), beside a 2in x 2in scale-check square captioned `50.8 mm`.
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
  generated pages.
- `npm run lint` clean (0 errors); `npm test` matched the documented green baseline exactly: 55
  files, 2417 passed, 2 skipped.

### Task Commits

1. Task 1: the print probe page — build it, then STOP — `e1dc83d` (feat)

### Files Created/Modified

- `public/__print-probe.html` — the hidden, self-contained iPhone print probe. Not linked from
  anywhere in the app; reachable only by its exact URL. **Deleted again in Task 6 (this session)
  once its one question was answered (D-02).**

### Decisions Made

- Followed the plan's spec for the probe verbatim — no architectural deviations, no Rule 4
  escalations.
- Encoded the width bar's 27 unlabelled quarter-inch ticks as one CSS `repeating-linear-gradient`
  background instead of 27 separately hand-placed `<div>`s.
- Verified against a real Chromium-generated PDF (via `page.pdf` + `pypdf` text extraction) in
  addition to the plan's required DOM-level Playwright checks, since a full-page screenshot of a
  `vh`-heavy document turned out to be an unreliable verification method in its own right.

### Issues Encountered

- A first attempt to visually sanity-check the probe with Playwright's `page.screenshot({ fullPage:
  true })` produced a corrupted-looking image, an artifact of `fullPage` resizing the viewport
  mid-capture against a `vh`-relative layout — not a bug in the probe. Re-verified with a fixed
  viewport and the real `page.pdf()` output instead.
- `npx tsc --noEmit` (not part of Task 1's own `<verify>`) reported the same two pre-existing
  `LayoutProps` errors this session's own runs also show — unrelated, expected inside a worktree.

---
*Phase: quick-260910-2ny*
*Completed: 2026-09-10*
