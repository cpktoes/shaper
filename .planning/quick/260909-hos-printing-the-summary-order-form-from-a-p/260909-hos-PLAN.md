---
phase: quick-260909-hos
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/design/summary/order-form.css
  - components/summary/use-print-fit.ts
  - components/summary/order-form-print.test.ts
  - e2e/summary-print-size.spec.ts
  - CLAUDE.md
autonomous: true
requirements: [QT-260909-hos]

estimate:
  tokens: 68000
  raw_tokens: 68000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Print the Summary order form at 100% and each sheet lands on its own page, whole, with no blank page after — whether or not the browser ran the app's print JavaScript first. MEASURED at planning time by printing /design/summary to a real PDF with the app's beforeprint handler switched off: today every sheet comes out a ragged, content-sized box (755 x 647 dots on page 1, 755 x 892 on page 2); with this change every sheet comes out 734 x 991 dots inside Letter's 756 x 996 printable area, on exactly 2 pages."
    - "The printed sheet is the same size it has always been from a computer. MEASURED: today's normal desktop print puts the sheet border at 734 x 991 dots; after this change, with the print JavaScript running OR suppressed, it is still 734 x 991. On paper that border measures about 194 x 262 mm (7 5/8 x 10 5/16 in)."
    - "Nothing is shrunk to fit. MEASURED in every PDF taken at planning time, before and after: the page's content transform comes out at exactly 0.75 points per screen dot, which is true size. There is no extra factor, so the printer is never being handed a silently scaled page."
    - "Turning on the Rail Band Instructions print preference still gives three sheets on three pages and no fourth. MEASURED with the preference on and the print JavaScript suppressed: 3 pages, every sheet 734 x 991."
    - "The Summary screen itself does not change by a single dot. Every new declaration lives inside @media print, so a screen never sees it — the five desktop reference pictures still match without being re-recorded."
    - "No board number changes. Nothing under lib/geometry/ is read or written differently, no rail band, fin mark, volume or dimension is recalculated, and no label moves relative to its drawing."
  artifacts:
    - "app/design/summary/order-form.css — the printed sheet's width and height declared in physical paper units inside the existing @media print block, plus the head-comment note explaining why the size is now a CSS fact"
    - "e2e/summary-print-size.spec.ts — NEW. Prints /design/summary to a PDF and reads the page geometry back out: page count, content scale, and the sheet's printed box, with and without the app's print JavaScript"
    - "components/summary/order-form-print.test.ts — one added case pinning the CSS paper numbers to use-print-fit.ts's own constants so the two can never drift apart"
    - "components/summary/use-print-fit.ts — head comment only. No constant, no branch and no line of logic changes"
    - "CLAUDE.md — one added clause naming order-form.css's print block alongside use-print-fit.ts in Rule 2's paper-not-board carve-out"
  key_links:
    - "The CSS numbers must be LITERALLY use-print-fit.ts's own constants, not their metric equivalents. MEASURED in the browser: calc(min(8.5in, 8.27in) - 16mm) = 733.4375px against the hook's 733.4476px — a hundredth of a dot apart. Writing the same idea as calc(min(8.5in, 210mm) - 16mm) gives 733.21875px, a fifth of a dot adrift, which would put the stylesheet and the hook on two different numbers for no gain."
    - "The new declarations need !important. The hook writes the same width and height inline at beforeprint, and the file's existing print rules (max-width: none, padding: 0) already use !important for the same reason — the stylesheet has to be the one that decides."
    - "[data-order-form-root] must be pinned too, not just the sheets. It is the @container every cqw font size resolves against, so if it is left at the print viewport's width the type prints at a size the layout was never drawn for."
    - "The rule targets [data-order-form-sheet], which all three sheets carry — the order form, the shaper's reference page, and the optional Rail Band Instructions page. That is what makes the third sheet correct by construction rather than by a second rule."
    - "page.pdf() is Chromium-headless only, so the new spec runs on the desktop project alone. It must skip the iphone (WebKit) and android projects rather than fail on them."
    - "Chromium's print path lays out at the PAPER's width and ignores the screen viewport entirely. MEASURED: a 1280x800 desktop, an iPhone 14 and an 880x900 window produce identical printed geometry. So a phone-viewport print case proves nothing and must not be written — the spec's real leverage is switching the print JavaScript OFF, not changing the viewport."
    - "The suppressed-JavaScript case must assert its own suppression worked (no data-printing attribute, no inline width on the root after the PDF), or it silently becomes a duplicate of the normal case."
---

<objective>
Make the Summary order form print at its right size from a phone at 100%, the way it already does
from a computer.

Purpose: the founder's own words — "I had to print at 86% on a phone to get the summary sheets to
size correctly. fix to print at 100%." Today the printed sheet's size is decided entirely by
JavaScript that runs the instant before the browser takes its print snapshot. On a computer that
works. On the phone it did not, and with nothing in the stylesheet to fall back on, the sheet
printed at whatever size it happened to be rather than at the size of a page — so the shaper dialled
the missing 14% in by hand.

Output: the printed sheet's box becomes a plain CSS fact in paper units, so it is right before any
JavaScript runs; the existing JavaScript keeps its one remaining job (shrinking a sheet whose
content genuinely will not compress); and a browser test prints the page to a real PDF and measures
what came out, with the print JavaScript deliberately switched off.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md

@components/summary/use-print-fit.ts
@app/design/summary/order-form.css
@components/summary/order-form-print.test.ts
@playwright.config.ts
</context>

<measured_facts>

Everything below was measured at planning time in this checkout, against a dev server started from
this repo, by printing `/design/summary` to real PDFs with headless Chromium and reading the page
geometry back out of them. Nothing here is estimated. Reuse these numbers; do not re-derive them,
and do not substitute a guess for one.

## How the printed page was read

Each PDF's page content stream was inflated and its operators read directly. Two things matter:

- The **content transform**: Chromium writes an outer `cm` of `0.24` (the page is in 1/300 inch
  units) and a nested `cm` of `3.125` (which converts those to screen dots). Their product is the
  points-per-screen-dot the page was drawn at. `0.24 x 3.125 = 0.75` is true size, because a screen
  dot is 1/96 inch and 72/96 = 0.75. Any extra factor would be a silent shrink.
- The **sheet's printed box**: the `re` (rectangle) operators inside that nested transform are in
  screen dots. The sheet's border shows up as a pair of rectangles one dot apart (its outer and
  inner edge).

This was cross-checked two ways — a Node reader using only `node:zlib` and a regex, and Python's
`pypdf` — and both give identical numbers. **No PDF library needs to be added to this project.**

## Fact 1 — Chromium's print path ignores the screen viewport entirely

Printing `/design/summary` at a 1280x800 desktop viewport, at an iPhone 14 viewport (390x844, device
pixel ratio 3, mobile emulation on) and at an 880x900 window produced **identical printed geometry**
in all three cases — same page count, same transform, same rectangles to the dot.

Consequence, and it is the most important one for this plan: **Playwright cannot reproduce a
phone-only print problem by changing the viewport.** The reproduction and proof the founder's
briefing suggested — print at a phone viewport and assert no shrink — passes today, would pass after
any change, and therefore tests nothing. Do not write it.

## Fact 2 — nothing is being auto-shrunk, in any case measured

Every PDF taken at planning time — with the print JavaScript running, with it suppressed, at every
viewport, before and after the prototype fix — came out at exactly `0.75` points per screen dot.
Chromium applied no shrink-to-fit in any of them. "Chrome silently shrank a too-wide page" is a real
failure mode this project has hit before, but it is not what is happening here.

## Fact 3 — the printed sheet's size is 100% JavaScript today

Printing `/design/summary` to Letter, `printBackground: false`:

| Run | Pages | Sheet's printed box, page 1 | page 2 |
|-----|-------|------------------------------|--------|
| Normal (the `beforeprint` handler runs) | 2 | 734 x 991 | 734 x 991 |
| `beforeprint` never registered | 2 | 755 x 647 | 755 x 892 |

Letter's printable area, less the stylesheet's own `@page { margin: 8mm }`, is **756 x 996 dots**.

So with the handler the sheet is a page. Without it the sheet is a ragged content-sized box: as wide
as whatever the print viewport is, and as tall as its own contents, different on every page. That is
because in print media the stylesheet takes the sheet's size *away* — `[data-order-form-root]` loses
its `max-w-[880px]` to `max-width: none !important`, `[data-order-form-page]` loses its padding, and
`[data-order-form-sheet]` has its `aspect-ratio` released to `auto !important` — on the understanding
that the handler will put a size back. Nothing in CSS gives the printed sheet a physical size at all.

## Fact 4 — the handler itself is not the phone-specific part

Dispatching `beforeprint` by hand and reading what the handler wrote, at BOTH viewports:

    desktop  root 733.448px, sheets 733.448 x 990.55px, zoom 1, scrollHeight 989
    iPhone   root 733.448px, sheets 733.448 x 990.55px, zoom 1, scrollHeight 989

Identical. The handler derives everything from paper, not from the screen, so when it runs, a phone
gets the same answer a desktop does. The phone problem is therefore that the phone's print path
**did not apply the handler's work to the snapshot it printed** — not that the handler computed
something phone-specific and wrong.

Also worth knowing: **`zoom` came out `1`** on both sheets (scrollHeight 989 against a 990.55 box).
The overflow guard is inert for a real board today. It is kept because a longer rail table could
still need it, not because it is doing anything now.

This is the one link that could not be tested directly here — Playwright cannot print from WebKit,
and there is no iOS device on this machine. The fix below is deliberately designed not to depend on
the answer.

## Fact 5 — where the founder's 86% comes from

On screen the order form's sheet is **880 x 1159.53 dots** (measured at 1280x800: the root's
`max-w-[880px]`, and the height its `aspect-ratio: 7.87/10.37` gives it). Letter less the 8mm
`@page` margin is **756 x 996 dots**.

    756 / 880      = 0.8591
    996 / 1159.53  = 0.8590

Both axes, the same number: **86%**. The factor the founder dialled in by hand is exactly the factor
that maps this form's on-screen sheet onto a Letter page. That is the signature of a sheet that
printed at about its screen size instead of at the page box — which is precisely what Fact 3 says
happens the moment the handler's work does not reach the snapshot.

Stated honestly: two sub-mechanisms fit that arithmetic — the phone printed a screen-media snapshot,
or it printed in print media at a layout viewport near 880 dots — and there is no way to tell them
apart from this machine. The fix covers the second and every variant of it, because it puts a
physical size in the print stylesheet. It could not cover the first, but the first would also mean
the phone ignored `@page { margin: 8mm }` and the whole print block, which no shipping browser does.
The founder's ruler check in `<verification>` is what settles it.

## Fact 6 — the fix was prototyped and measured, not reasoned about

Injecting the candidate print rules into the live page **with `beforeprint` suppressed**:

| Run | Pages | Sheet's printed box, every page | Scale |
|-----|-------|----------------------------------|-------|
| Desktop viewport, JS suppressed, rules injected | 2 | 734 x 991 | 0.75 |
| iPhone viewport, JS suppressed, rules injected | 2 | 734 x 991 | 0.75 |
| Rail Band Instructions on, JS suppressed, rules injected | 3 | 734 x 991 | 0.75 |

Identical to today's working desktop print, with no JavaScript involved at all, and no fourth page
when the third sheet is switched on.

## Fact 7 — the exact CSS lengths, measured by the browser

    calc(min(8.5in, 8.27in) - 16mm)              = 733.4375px    hook computes 733.4476px  (0.010px apart)
    calc((min(11in, 11.69in) - 16mm) * 0.995)    = 990.546875px  hook computes 990.5499px  (0.003px apart)
    calc(min(8.5in, 210mm) - 16mm)               = 733.21875px   -- 0.23px adrift, do NOT use

`8.5in`/`11in` and `8.27in`/`11.69in` are literally `PORTRAIT_PAPER_IN`'s two entries. `16mm` is
literally `2 x PAGE_MARGIN_MM`. `0.995` is literally `FIT_SAFETY`. Writing the CSS this way means the
stylesheet and the hook are the same four numbers arranged the same way, which is what makes Task 2's
contract test a straight comparison rather than a tolerance fudge.

(`min()` is not a compatibility risk: it has shipped in Safari since 13.4, and this app's Tailwind v4
floor is Safari 16.4.)

## Fact 8 — the third sheet

`/design/summary` renders three `[data-order-form-sheet]` elements when the Rail Band Instructions
print preference is on. That preference is stored in `localStorage` under
`shaper-print-rail-instructions` (see `lib/print-instructions-preference.ts`), so a test can turn it
on with an init script before the page loads, the same way the phone specs already dismiss the
sign-in banner.

</measured_facts>

<tasks>

<task type="tracer">
  <name>Task 1: Make the printed sheet's size a fact of the stylesheet, and print a PDF to prove it</name>
  <files>app/design/summary/order-form.css, components/summary/use-print-fit.ts, e2e/summary-print-size.spec.ts</files>
  <precondition>`npm install --no-audit --no-fund` has been run once in this worktree, the Playwright browsers are already installed on this machine, and port 3120 is free.</precondition>
  <read_first>
    - components/summary/use-print-fit.ts lines 1-90 — the whole head comment and the four constants (`PAGE_MARGIN_MM`, `PORTRAIT_PAPER_IN`, `FIT_SAFETY`, `measurePxPerInch`). The three earlier print bugs it records are the reasons the numbers are what they are; the new stylesheet rules must reuse those numbers, not invent parallel ones.
    - app/design/summary/order-form.css lines 303-330 — the `@page` block and the start of `@media print`, including the existing `[data-order-form-root] { max-width: none !important; gap: 0 !important; }` rule this task extends.
    - app/design/summary/order-form.css lines 445-477 — the existing `[data-order-form-sheet] { aspect-ratio: auto !important; }` rule this task extends, and the `[data-order-form-root][data-printing] [data-order-form-sheet] { overflow: hidden !important }` backstop below it.
    - e2e/phone-screens.spec.ts lines 12-52 — the `BANNER_DISMISSAL_KEY` constant, the `dismissSignInBanner` helper and the per-describe `beforeEach` project-skip idiom. Copy these idioms; do not import from that file and do not edit it.
    - playwright.config.ts lines 57-64 — the three projects. Only `desktop` is Chromium at a desktop size; `iphone` is WebKit.
  </read_first>
  <action>
    Two files change in substance, one gains a comment, and one new test file appears.

    **1. app/design/summary/order-form.css — give the printed sheet a physical box.**

    Extend the two rules that already exist inside `@media print`; do not add new selectors beside
    them.

    - The existing `[data-order-form-root]` rule (the one carrying `max-width: none !important` and
      `gap: 0 !important`) gains one declaration: `width: calc(min(8.5in, 8.27in) - 16mm)
      !important;`.
    - The existing `[data-order-form-sheet]` rule carrying `aspect-ratio: auto !important` gains two:
      `width: calc(min(8.5in, 8.27in) - 16mm) !important;` and `height: calc((min(11in, 11.69in) -
      16mm) * 0.995) !important;`.

    Use exactly those expressions. Fact 7 records why the inch figures rather than their metric
    equivalents, and why `!important` is required. Do not touch any other declaration in either rule,
    and do not remove `aspect-ratio: auto` — with both axes now given it is redundant, but it is also
    the thing that documents that the on-screen shape is deliberately released.

    Then rewrite the comment above the `aspect-ratio` rule, and add a paragraph to the file's own head
    comment, to record the division of labour a later editor would otherwise get wrong: the
    STYLESHEET decides the printed sheet's size, in paper units, and it is right before a line of
    JavaScript runs; `useOrderFormPrintFit` writes the same numbers inline for one reason only, which
    is that it has to force the printing layout into existence before it can measure whether a sheet's
    contents overflow it. Say plainly what went wrong: the size used to come only from that handler,
    and on a phone whose print path never applied the handler's work the sheet printed at roughly its
    on-screen size instead of at a page — 86% too big, exactly the factor the shaper had to dial in by
    hand. Keep it in the file's existing voice, and describe what a shaper sees on paper.

    **2. components/summary/use-print-fit.ts — comment only.**

    Change no constant, no branch and no line of logic. Add a short paragraph to the head comment
    naming the stylesheet as the source of truth for the printed size, and stating that this handler's
    inline width and height now exist to force the printing layout so `scrollHeight` measures the
    right thing — its own decision is the `zoom` overflow guard, and nothing else. Record that the
    stylesheet's `calc()` expressions are built from these same four constants and that
    `components/summary/order-form-print.test.ts` fails if the two ever drift apart.

    **3. e2e/summary-print-size.spec.ts — the browser proof. NEW file.**

    Import `expect`, `test` and `type Page` from `@playwright/test`, and `inflateSync` from
    `node:zlib`. Add no dependency to the project.

    Head the file with a comment carrying the three facts that make it meaningful and that would
    otherwise be re-litigated: that `page.pdf()` is Chromium-headless only, so this runs on the
    `desktop` project alone; that Chromium's print path lays out at the paper's width and ignores the
    screen viewport, measured identical at 1280x800, on an iPhone 14 and at 880x900, so a phone
    viewport case would prove nothing; and that the leverage here is instead switching the app's print
    JavaScript OFF, which is the phone's situation.

    Write one helper that takes the PDF bytes and returns, per page, the points-per-screen-dot and the
    list of rectangles. It walks the file as latin1, finds each `stream` keyword that is not part of
    `endstream`, takes the bytes up to the next `endstream`, inflates them, and keeps the results that
    contain both a `cm` and an `re` operator — those are the page content streams, one per page. For
    each, multiply the first `cm`'s x-scale by the second `cm`'s x-scale to get points per screen dot,
    and read every `re` operator's width and height. Fact 6 says this recipe returns the right numbers
    on the real output; the `[^d]stream` guard is what stops `endstream` being mistaken for a stream
    start.

    Write a second helper that asserts one page is correct: the scale is `0.75` within `0.001`, and at
    least one rectangle has a width within `1.5` of `733.44` and a height within `1.5` of `990.55`.
    That tolerance is what covers the sheet border's outer and inner edge, measured at 734 x 991 and
    733 x 990.

    A `beforeEach` skips every project whose name is not `desktop`. Every case navigates to
    `/design/summary`, waits for `[data-order-form-sheet]`, and calls `page.pdf({ format: "Letter",
    printBackground: false })` — a real shaper does not tick background graphics, so no case may pass
    `printBackground: true`.

    Three cases:

    - "prints two pages at true size with the print handler running" — a plain load. Assert exactly
      two content pages and run the page assertion on both.

    - "prints two pages at true size even when the browser never runs the print handler" — an
      `addInitScript` that replaces `window.addEventListener` with a wrapper dropping `beforeprint`
      and `afterprint` registrations and forwarding everything else, so the app's handler is never
      installed. Before asserting anything about the PDF, prove the suppression really happened: after
      the print, read `[data-order-form-root]` and assert it carries no `data-printing` attribute and
      no inline `style.width`. Then assert exactly two content pages and run the page assertion on
      both. **This is the case that fails today** — measured, today's suppressed print puts the sheets
      at 755 x 647 and 755 x 892, so no rectangle lands in the asserted band.

    - "the Rail Band Instructions sheet gets the same page box" — the same suppression init script,
      plus setting `localStorage` key `shaper-print-rail-instructions` to `"true"` in the same script
      (wrap the `localStorage` write in a try/catch, as the phone specs already do). Assert exactly
      three content pages and run the page assertion on all three.

    Before trusting any of it, watch it fail: remove just the three CSS declarations from step 1, run
    the spec, and confirm the second and third cases fail with no rectangle in the asserted band while
    the first still passes. Put the declarations back and confirm all three go green.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && npm install --no-audit --no-fund && npx tsc --noEmit && npx vitest run && npm run lint && grep -q 'min(8.5in, 8.27in)' app/design/summary/order-form.css && grep -q 'min(11in, 11.69in)' app/design/summary/order-form.css && ! grep -q 'printBackground: true' e2e/summary-print-size.spec.ts && git diff --name-only e2e/phone-screens.spec.ts e2e/desktop-baseline.spec.ts | wc -l | grep -qx '0' && PW_PORT=3120 npx playwright test --project=desktop e2e/summary-print-size.spec.ts</automated>
    <human-check>Open `/design/summary` in a browser and use the browser's own Print preview at 100%: each sheet fills its page with nothing cropped and there is no blank page at the end.</human-check>
  </verify>
  <done>`app/design/summary/order-form.css` declares the printed root's width and the printed sheet's width and height in paper units inside `@media print`, using `use-print-fit.ts`'s own four constants. `e2e/summary-print-size.spec.ts` passes all three cases on the desktop project, and its two suppressed-handler cases were watched failing with the CSS declarations removed. `use-print-fit.ts` has a new head-comment paragraph and no change to any constant or line of logic.</done>
  <reversibility rating="reversible">Three CSS declarations inside a print-only block, two comments, and one new test file. Reverting is a single `git revert`; no data, schema, saved board or geometry formula is involved, and nothing on screen is touched.</reversibility>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Pin the stylesheet's paper numbers to the handler's, so they cannot drift apart</name>
  <files>components/summary/order-form-print.test.ts</files>
  <read_first>
    - components/summary/order-form-print.test.ts, the whole file — in particular `stripComments`, `readStripped`, `readNumericConst` and `readPortraitPapersIn`, which already parse `PAGE_MARGIN_MM`, `FIT_SAFETY` and `PORTRAIT_PAPER_IN` out of `use-print-fit.ts`, and the third existing case, which already does the "fitted sheet fits the shortest paper" arithmetic. Reuse these helpers; do not rewrite them and do not change any existing case.
  </read_first>
  <behavior>
    - The stylesheet's printed WIDTH expression names the same two paper widths as `PORTRAIT_PAPER_IN`, and subtracts twice `PAGE_MARGIN_MM`.
    - The stylesheet's printed HEIGHT expression names the same two paper heights, subtracts twice `PAGE_MARGIN_MM`, and multiplies by `FIT_SAFETY`.
    - Evaluating both expressions and the handler's own computation gives the same width and the same height to within 0.02 screen dots.
    - Changing any one of the four constants in `use-print-fit.ts` without changing the stylesheet makes the case fail.
  </behavior>
  <action>
    Add one `it(...)` to the existing describe block in `components/summary/order-form-print.test.ts`,
    in the file's established idiom: read the real source, strip comments so this file's own prose can
    never satisfy an assertion about itself, and assert a structural property.

    Add a small helper that pulls the two `calc(...)` expressions out of the stripped stylesheet — the
    `width` and `height` declarations inside the `[data-order-form-sheet]` rule that also carries
    `aspect-ratio: auto` — and reads the numbers out of each: the two paper figures inside `min()`, the
    millimetre figure subtracted, and (for height) the trailing multiplier.

    Then assert, against `readPortraitPapersIn`, `readNumericConst(source, "PAGE_MARGIN_MM")` and
    `readNumericConst(source, "FIT_SAFETY")`:

    - the width expression's two `min()` figures, sorted, equal the two `PORTRAIT_PAPER_IN` widths;
    - the height expression's two `min()` figures, sorted, equal the two `PORTRAIT_PAPER_IN` heights;
    - both expressions subtract exactly twice `PAGE_MARGIN_MM` millimetres;
    - the height expression's multiplier equals `FIT_SAFETY`, and the width expression has none;
    - computing both expressions at 96 dots per inch lands within 0.02 dots of the handler's own
      `printableBoxPx()` arithmetic — measured at planning time as 0.010 and 0.003 dots apart.

    Name the case so its purpose is plain to someone reading a failure: the stylesheet and the print
    handler have to be describing the same piece of paper. Head it with a short comment saying why
    this matters — the printed size is now declared in two places on purpose (the stylesheet decides,
    the handler mirrors it to force the layout it measures), and two places is exactly how a number
    goes quietly wrong.

    Watch it fail before trusting it: temporarily change one paper figure in the stylesheet, confirm
    the case fails and names the mismatch, then put it back.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && npx vitest run components/summary/order-form-print.test.ts && npx tsc --noEmit && npm run lint</automated>
  </verify>
  <done>`components/summary/order-form-print.test.ts` has one added case asserting the stylesheet's two printed-box expressions are built from `PORTRAIT_PAPER_IN`, `PAGE_MARGIN_MM` and `FIT_SAFETY` and land within 0.02 dots of `printableBoxPx()`. It was watched failing with a paper figure altered. The three existing cases are unchanged and still pass.</done>
</task>

<task type="auto">
  <name>Task 3: Write down where paper units are allowed, then prove nothing on any screen moved</name>
  <files>CLAUDE.md</files>
  <read_first>
    - CLAUDE.md, the `## Rule 2` section — specifically the paragraph ending "(`components/summary/use-print-fit.ts` has its own copy on purpose: it scales paper sizes, not board dimensions.)". Read it as it stands at execution time rather than assuming today's wording; other quick tasks may also be editing this file.
    - e2e/desktop-baseline.spec.ts lines 1-25 — the header explaining that these five pictures are the definition of "the desktop did not change", that they are macOS-rendered and local only, and the `maxDiffPixels: 100` tolerance.
  </read_first>
  <action>
    Extend that one parenthetical in Rule 2 so the carve-out names both files rather than one. Say
    that `app/design/summary/order-form.css`'s `@media print` block is the second place allowed its own
    inch and millimetre figures, for the same reason: it sizes a sheet of paper, not a surfboard. Add
    that the numbers there are deliberately the same four constants
    `components/summary/use-print-fit.ts` uses, and that a test fails if the two ever disagree.

    Keep it to a sentence or two, in the paragraph's own voice. Do not restructure Rule 2, do not
    touch the cm/mm sentences, and do not add a new heading.

    Then run the whole browser suite — all three projects, including the five desktop reference
    pictures. Never pass `--update-snapshots`: if a baseline disagrees, that is a print-only change
    somehow reaching a screen, and it must be fixed in the stylesheet, not re-recorded.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit && npx vitest run && npm run lint && grep -q 'order-form.css' CLAUDE.md && PW_PORT=3120 npx playwright test && git status --porcelain e2e/desktop-baseline.spec.ts-snapshots | wc -l | grep -qx '0'</automated>
  </verify>
  <done>CLAUDE.md's Rule 2 carve-out names `app/design/summary/order-form.css`'s print block alongside `use-print-fit.ts`. The full Playwright suite is green on all three projects, the five desktop reference pictures match, and no baseline file was rewritten.</done>
</task>

</tasks>

<executor_constraints>

- Work in a git worktree. Run `npm install --no-audit --no-fund` once there before any Playwright
  command.
- `PW_PORT=3120` on **every** Playwright invocation. Port 3000 is the founder's own dev server and
  3100 is the suite's default — never either.
- Playwright browsers are already installed on this machine. Never run `npx playwright install`.
- Never `--update-snapshots`, for any reason.
- `npx vitest run`, never bare `vitest`. `npx tsc --noEmit` and `npm run lint` before each commit.
- `npm run build` is the orchestrator's, on main — Turbopack will not resolve `next` from a worktree.
- Add no dependency. The PDF is read with `node:zlib` and a regex; that recipe was verified against
  this app's real print output at planning time.
- Every PDF taken anywhere in this task uses `printBackground: false`. A shaper does not tick
  background graphics, so a test that does is testing a page nobody prints.
- Do not edit anything under `lib/geometry/`, `components/ui/*`, `app/globals.css`,
  `e2e/phone-screens.spec.ts`, `e2e/phone-layout.spec.ts` or `e2e/desktop-baseline.spec.ts` — the
  last three are either another task's file or the guard this task is measured against.
- Do not change the Summary screen's on-screen layout in any way. Making the printed preview fit a
  phone's screen is the NEXT quick task and must not be started here.
- Explain every commit in plain English, about the paper and the board — a shaper reads these.
  Suggested subjects: `fix(summary): print the order form at its right size from a phone at 100%` for
  Task 1, `test(summary): pin the printed sheet's paper size to the print handler's own numbers` for
  Task 2, and `docs: note that the order form's print block may carry paper units` for Task 3.

</executor_constraints>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| none crossed | This change adds three print-only CSS declarations, two comments, a unit test and a browser test. No input is parsed, no request is made, no storage is read or written by the app, and no value leaves the browser. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260909-hos-01 | Tampering | app/design/summary/order-form.css | high | mitigate | A wrong paper figure here silently mis-sizes every order form a shaper prints, and paper is the one artefact that leaves the app and gets cut to. Mitigated three ways: the numbers are literally `use-print-fit.ts`'s existing constants rather than new ones (Fact 7); Task 2's contract test fails if the two ever disagree by more than 0.02 dots; and Task 1's browser test measures the box out of a real PDF rather than trusting the declaration. |
| T-260909-hos-02 | Denial of Service | app/design/summary/order-form.css | medium | mitigate | An over-tall sheet pushes each page onto two, so a two-page order form prints as four with half of them blank — the exact failure G-08-10 fixed once already. Mitigated by keeping `FIT_SAFETY`'s 0.995 shave in the CSS height and by Task 1 asserting an exact page count (two normally, three with Rail Band Instructions on) rather than only asserting the sheet's size. |
| T-260909-hos-03 | Tampering | e2e/desktop-baseline.spec.ts-snapshots | medium | mitigate | The easy wrong fix for a failing baseline is to re-record it, which would let a supposedly print-only change reach the screen unnoticed. Mitigated by the never-`--update-snapshots` constraint and by Task 3's `git status --porcelain` gate on the snapshot directory, which fails if any baseline file was rewritten. |
| T-260909-hos-04 | Repudiation | e2e/summary-print-size.spec.ts | low | mitigate | A test that suppresses the print handler but fails to actually suppress it becomes a silent duplicate of the normal case and would pass on broken code forever. Mitigated by requiring the suppressed case to assert its own suppression (no `data-printing` attribute, no inline width on the root after printing) and by requiring the executor to watch both suppressed cases fail with the CSS removed. |
| T-260909-hos-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package is installed by this task. The PDF is read with Node's own `node:zlib`. `npm install --no-audit --no-fund` in the worktree only materialises the committed lockfile, so the package-legitimacy gate has nothing to audit. |
</threat_model>

<verification>

1. `npx tsc --noEmit`, `npx vitest run` and `npm run lint` all clean.
2. `PW_PORT=3120 npx playwright test` green across all three projects, including the five desktop
   reference pictures, with no snapshot file rewritten.
3. The two suppressed-handler cases in `e2e/summary-print-size.spec.ts` were watched FAILING with the
   three CSS declarations removed (expect no rectangle in the 733 x 990 band; today's suppressed
   print puts the sheets at 755 x 647 and 755 x 892) and passing with them restored.
4. Task 2's contract case was watched FAILING with one paper figure in the stylesheet altered.
5. `git diff` on `app/design/summary/order-form.css` shows only three added declarations inside
   `@media print` plus comment changes. `git diff` on `components/summary/use-print-fit.ts` shows
   comment changes only — no constant, no branch, no line of logic.
6. `lib/geometry/`, `app/globals.css`, `components/ui/`, `e2e/phone-screens.spec.ts`,
   `e2e/phone-layout.spec.ts` and `e2e/desktop-baseline.spec.ts` are untouched.

**Deferred to the founder — the check this fix actually exists for, which no machine here can run:**

7. On the phone, open the Summary screen and print the order form at **100%** — no hand-dialled
   scale. Each sheet should land on its own page, whole, with no blank page after the last, exactly
   as it does from the computer. Do it once with the gear menu set to **Imperial** and once set to
   **Metric**, because the dimensions row carries different text in each and a longer row is what
   would push a sheet over.
8. With a ruler on the printed page, the sheet's printed border should measure about **194 x 262 mm**
   (**7 5/8 x 10 5/16 in**). That is the whole point of the fix: the same box a computer prints.
9. Worth knowing while checking: the Summary screen is Phase 10's screen, and PHON-09 says printing
   stays a desktop job there. This task changes only how the printed page is sized — the Summary
   screen itself is untouched, and making its preview fit a phone is the next quick task.

</verification>

<success_criteria>

- The Summary order form prints at its right size from a phone at 100%, with no hand-dialled scale.
- The printed sheet measures 734 x 991 dots inside Letter's 756 x 996 printable area whether or not
  the browser ran the app's print JavaScript — where today, without that JavaScript, it comes out
  755 x 647 and 755 x 892.
- Two sheets print on two pages, three on three with Rail Band Instructions on, and never one more.
- The printed page carries no silent shrink: exactly 0.75 points per screen dot, measured out of a
  real PDF.
- The Summary screen, and every other screen, renders exactly as it does today — the five desktop
  reference pictures match without being re-recorded.
- The stylesheet and the print handler are provably describing the same sheet of paper, and a test
  fails the moment they stop.

</success_criteria>

<output>
Create `.planning/quick/260909-hos-printing-the-summary-order-form-from-a-p/260909-hos-SUMMARY.md` when done
</output>
