---
phase: quick-260910-jfp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/rails/rail-plan-side-figure.tsx
  - components/rails/rail-legend-ticks.tsx
  - components/summary/rail-instructions-sheet.tsx
  - components/rails/rail-plan-side-figure.test.ts
  - components/summary/rail-instructions-sheet.test.ts
  - e2e/summary-rail-key.spec.ts
autonomous: false
requirements: [QT-260910-jfp, PRNT-05]

estimate:
  # Three tasks. Task 1 is the whole change (three source files, two test files). Task 2 writes one
  # Playwright spec it cannot run. Task 3 is the ORCHESTRATOR's own browser run on a clean checkout.
  tokens: 46000
  raw_tokens: 46000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A printed Rail Band Instructions sheet says what each coloured line on the deck means: beside the plan/side drawing, in the blank paper that was already there, a list of colour dot plus line name — one entry for every line the shaper left ticked, and none for a line he unticked (founder decision 2)."
    - "The key costs NO vertical space. The plan/side figure's box is the same height it is today at every page width — measured identical, not argued (founder decision 1). The example rail band above it, which is the sheet's only flexible band and the one thing that shrinks when anything else grows, is untouched."
    - "The drawing keeps its exact 373.854 x 471.98px box. It stops being centred in the card and goes flush left, with the key in the blank column to its right — that is the whole point of the placement the founder chose."
    - "A swatch can never print a different colour from the line it names, because both read the SAME expression: `RAIL_REFERENCE_LEGEND`'s own `color` field, which is `REF_GROUP_SCREEN_COLORS[key]` — the identical map `refPathElements` already strokes the paths with. Measured in print media in both engines: the two resolve to the same value, and that value is the prototype's own hex."
    - "It is a KEY, not a control (founder decision 3). No checkbox, no `coarse:min-h-11` touch target, nothing clickable — the ticks stay where they already are, on the RAILS screen and under the Summary's print buttons."
    - "It appears on the printed sheet and on the Summary's on-screen preview of that sheet, which are the same DOM (D-09). It does NOT appear a second time on the RAILS screen's INSTRUCTIONS tab, where the same nine already sit as tick boxes."
    - "With every line unticked there is no key at all — no stray heading, no empty column, no border round nothing — and the figure is byte-identical to today's, drawing re-centred. With one line ticked there is one entry."
    - "On a page too narrow to hold the key beside the drawing, the key is not drawn and the sheet is exactly today's sheet. The threshold sits well below the narrowest page in the existing print sweep, and a browser test proves the key is actually PRESENT at every width in that sweep rather than silently dropping out."
    - "`e2e/summary-print-touch-box.spec.ts` still reports `overflow=[ok, ok, ok]` at 560, 618, 680, 733, 760, 812 and 900 dots, and that file is not edited at all — not even a comment. `e2e/summary-print-size.spec.ts` keeps its current constants and is not edited either."
    - "No board number changes. This task names lines on a piece of paper; every calculator in `lib/geometry/` and every saved design is untouched."
    - "The browser gates are RUN, by the orchestrator, on a clean checkout, and the numbers are written down before anything ships. A plan that records a Playwright command and never runs it is how a broken sheet reached his printer once already."
  artifacts:
    - components/rails/rail-plan-side-figure.tsx
    - components/rails/rail-plan-side-figure.test.ts
    - components/summary/rail-instructions-sheet.tsx
    - components/summary/rail-instructions-sheet.test.ts
    - e2e/summary-rail-key.spec.ts
    - .planning/quick/260910-jfp-print-a-key-beside-the-rail-plan-side-dr/260910-jfp-BROWSER-READING.md
  key_links:
    - "**THE SWATCH-COLOUR QUESTION, SETTLED BY MEASUREMENT AT PLAN TIME — and the brief's own premise needed one correction.** The brief says the printed LINES come from `REF_GROUP_COLORS` and the legend from `REF_GROUP_SCREEN_COLORS`. Read at plan time, that is not what the code does: `refPathElements` (rail-plan-side-figure.tsx) strokes every path with `REF_GROUP_SCREEN_COLORS[p.group]`, on paper as much as on screen. `REF_GROUP_COLORS` is the prototype's own hex, pinned by the fidelity test, and `REF_GROUP_SCREEN_COLORS` spreads it and overrides four entries. **So the drawn line and the key's swatch will both read `REF_GROUP_SCREEN_COLORS`, through the one `RAIL_REFERENCE_LEGEND.color` field. They cannot disagree, in any medium or any theme, because they are the same expression.** That is the mechanism this plan relies on — not an assumption that two maps happen to hold the same numbers."
    - "**AND THE THREE VARIABLES, ALSO CORRECTED AND MEASURED.** The brief names three CSS variables in the legend. There are only TWO in the nine legend entries — `--color-surf-rail-mark` (Rail Marks 1, Rail Band 1) and `--color-surf-rail-tuck` (Rail Tucks 1, Tuck blend to hard tail), four entries between them. `--color-surf-ink` belongs to the `black` group, which is the side view's own board OUTLINE: `GATEABLE_RAIL_REFERENCE_GROUPS` excludes it and `RAIL_REFERENCE_LEGEND` never lists it, so no swatch is ever drawn for it. The other five entries are the prototype's literal hex and were never in question."
    - "**MEASURED AT PLAN TIME, real Chromium and real WebKit, a standalone Playwright script on a `data:` URL** replicating globals.css's print block (`:root:root:root` pinning `--surf-rail-mark`/`--surf-rail-tuck` to the Daylight ramp) with an SVG `stroke=\"var(--color-surf-rail-mark)\"` beside an HTML `style=\"background: var(--color-surf-rail-mark)\"`, on a page wearing `.theme-slate`. **Screen: both read `rgb(224, 80, 80)`. Print: both read `rgb(192, 0, 0)` — `#C00000`, the prototype's own hex.** Same for the tuck purple: `rgb(168, 116, 224)` on screen, `rgb(112, 48, 160)` = `#7030A0` in print. Identical in both engines. Two facts fall out and both were open questions: `var()` DOES resolve inside an SVG `stroke` presentation attribute (it is already shipped, but nothing had measured it), and a variable pinned by the print block resolves to the SAME value for a stroke and for a background. `--ramp-daylight-rail-mark` is literally `#C00000` and `--ramp-daylight-rail-tuck` literally `#7030A0` in app/globals.css, so print puts the prototype's own ink on paper from a dark theme too."
    - "**MEASURED AT PLAN TIME — THE PLACEMENT COSTS NOTHING VERTICALLY, IN EITHER ENGINE, IN PRINT MEDIA.** A second standalone Playwright script laid TODAY's figure (`mx-auto w-full` + `maxWidth: 373.854px` + `aspect-ratio: 499 / 630`) beside the NEW one (a flex row: drawing at `flex: 0 1 373.854px; min-width: 0`, key at `flex: 1 1 0%; min-width: 0`, `gap: 12px`, `justify-content: center`) at card widths 376, 420, 470, 500, 515, 516, 517, 520, 546, 604, 666, 719, 746, 798, 886 and 1000. **The card's height came back IDENTICAL at all sixteen widths, key on or key off, in Chromium and in WebKit, in screen media and again with `emulateMedia({media:'print'})`** — 501.98px above a 420px card, and today's own 466.83px at 376 where today's drawing already shrinks. The drawing's own box stayed 373.84 x 471.98 at every width from 420 up. The row's `container-type: inline-size` does NOT steal the drawing's own `@container`: the `3.2cqw` station labels computed 11.963px in both the old and the new tree, at every width."
    - "**WHY IT CANNOT GROW, in one number.** The drawing is 471.98px tall. The key's nine entries at 11.963px/1.4 are 150.75px tall in a 188px column (the founder's own 618-dot page) and 201px at the narrowest column the threshold below allows. The row's height is the taller of the two items, and the key is never the taller one. Stress-measured by widening the type with letter-spacing until the longest label measured 208px (matching the orchestrator's own real-Inter measurement) and then 244px (22% wider than real Inter, deliberately beyond anything the font could do): at a 130px column the key was still 201px against 471.98 available, 2.35x clear, in both engines. Even at an 80px column — narrower than the threshold permits — it was 385px, still inside."
    - "**THE ONE FAILURE MODE, AND THE GUARD.** Squeeze the key column below its own min-content (measured 51-68px) and the labels stack a word per line: at a 376px card the key measured 1876px tall and the figure exploded to 1906px. That is the only way this can hurt the sheet, so the key is not drawn below a threshold. `KEY_ROW_MIN_WIDTH_PX = Math.ceil(FIGURE_MAX_RENDERED_WIDTH + KEY_GAP_PX + KEY_MIN_COLUMN_PX) = ceil(373.854 + 12 + 100) = 486px` of row width, i.e. a card 516px wide or more. Enforced as a container query on the row, so the key's column is guaranteed at least 100.146px whenever it is drawn — the container query IS the min-width, applied to the right element, which is why the key carries no `min-width` of its own (one would re-open the drawing-shrink path). Measured flipping cleanly at 515 (off) / 516 (on) in both engines. `Math.ceil` rounds UP on purpose: rounding up can only ever turn the key on later, never earlier."
    - "**THE CLEARANCE, AND WHY IT IS TESTED RATHER THAN TRUSTED.** The founder's page (618 dots) gives a 604px card — 88px clear of the 516px threshold. The NARROWEST page in the existing print sweep (560 dots) gives 546px — only 30px clear. 30px is thin enough that a future change to the sheet's padding could switch the key off at 560 dots and nobody would see it happen. So Task 2's spec asserts the key is PRESENT, with the right entries, at every width in that sweep — turning 30px of clearance from a hope into a tested fact."
    - "**WHAT HAPPENS ON A NARROW PAGE.** Below a 516px card the key is not drawn and the figure is byte-identical to today's, drawing re-centred (`justify-center` on the row reproduces the old `mx-auto` exactly the moment the key is the only thing missing — measured, drawing x = 70.58 in both trees at a 515px card). The only real width where that bites is the 390-dot print row, which the brief already records as PRE-EXISTING OVERFLOW (+44px with the example rail squeezed to nothing) and out of scope. This task neither fixes nor worsens it: at 390 the key is absent and the figure is the same figure it is today, to the pixel."
    - "**ON SCREEN THE KEY IS ALWAYS THERE, on any phone.** `app/design/summary/order-form.css` lays the stack out at `--order-form-design-width: 880px` ALWAYS — 'on a phone as much as on a desktop' — and scales it with `--order-form-preview-scale`. So the preview's LAYOUT width is 880px whatever the device, the figure card is far above the 516px threshold, and the key draws at every screen size. The narrow-layout branch is a print-media condition only."
    - "**THE KEY'S TYPE SIZE, DERIVED NOT TYPED.** The drawing's station labels are `clamp(9px, 3.2cqw, 20px)` against the drawing's own `@container`, which at the capped 373.854px computes to 11.963px — the prototype's own 16px label at its own 0.7492 rendering, as that file's comment already records. The key sits BESIDE the drawing, OUTSIDE that container, so a `cqw` of its own would read the key column's page-dependent width instead. It therefore takes the same number directly: `KEY_FONT_SIZE_PX = FIGURE_MAX_RENDERED_WIDTH * (LABEL_FONT_CQW / 100)`, with `LABEL_FONT_CQW = 3.2` factored out so the clamp string and this derivation cannot drift. 11.963px is also, exactly, the smallest `--order-form-*` token on the whole sheet (`260910-2ny-BROWSER-READING.md`), which prints at 10.24pt on the founder's own 7.347in of paper. The key prints at the sheet's own floor size, not below it."
    - "**THE e2e SWEEP'S SCALING ASSERTION DOES NOT APPLY TO THE KEY, and that is correct rather than convenient.** `e2e/summary-print-touch-box.spec.ts` case 6(a) is scoped to `isTokenScale` — elements carrying one of nine `order-form-*` clamp classes. The key carries none, exactly as the figure's own station labels and the board-drawing labels carry none, because the whole plan/side figure is a FIXED-SIZE illustration: it is capped at 373.854px and does not scale with the page at all. Case 6(a)'s own comment names that family as a legitimate exclusion. Putting the key on the `order-form-*` token scale was considered and rejected: it would couple a `components/rails/` file to the order form's stylesheet (only `components/summary/` uses those classes today) and it would size the key differently from the drawing it names."
    - "**MEASURED AT PLAN TIME — the Tailwind syntax compiles.** Installed Tailwind is 4.3.3. Compiling `@container/rail-key` and `@min-[486px]/rail-key:block` through `@tailwindcss/postcss` against this repo emits `.@container\\/rail-key { container-type: inline-size; container-name: rail-key }` and `@container rail-key (width >= 486px) { ... }`. Both the hyphenated container name and the arbitrary container-query variant are real; neither was assumed. `components/ui/card.tsx` already uses a named container (`@container/card-header`), so the pattern is in the codebase."
    - "**CONSIDERED AND REJECTED: a `min-width` on the key instead of a threshold.** It removes the cliff — the drawing absorbs the shrink and the figure just gets shorter — but it changes the DRAWING's size on a narrow page, and the drawing is the thing a shaper actually reads. A key is worth no part of the picture it explains. The threshold keeps the figure bit-identical to today at every width and pays for it with the key's absence on a page that already overflows."
    - "**WHERE THE KEY LIVES IN THE DOM.** Inside `RailPlanSideFigure`, behind a new opt-in prop `showLineKey` that defaults to false — so `components/rails/rail-instructions.tsx` (the RAILS tab) needs no edit at all and gains no key, while `components/summary/rail-instructions-sheet.tsx` opts in. Inside the figure because the blank paper IS the figure's own box; reaching into that layout from the sheet would put the figure's proportions in two files."
    - "**THE SWATCH IS SHARED, so it cannot drift.** `RailLegendTicks` already draws a 9px round dot from `entry.color`. That span moves into an exported `RailLegendSwatch` in `rail-plan-side-figure.tsx` (where `RAIL_REFERENCE_LEGEND` itself lives) and both call sites use it. Alignment stays with the caller — the ticks are `items-center` on one line, the key is `items-baseline` so a wrapped label keeps its dot beside the FIRST line rather than floating mid-block."
    - "**DO NOT run `next dev` and do not touch `.next/dev/lock`.** No dev server is running. A WORKTREE EXECUTOR CANNOT RUN PLAYWRIGHT AT ALL — `npm run dev` fails there with Turbopack's 'Could not find the Next.js package', the same error `npm run build` gives. So Task 2 WRITES a spec and does not run it, and Task 3 is addressed to the ORCHESTRATOR on the main checkout with `PW_PORT=3108`. **A previous plan's four Playwright commands were written down, recorded `pending`, and shipped unrun — that is how a broken sheet reached his printer. It does not happen twice.**"
    - "**GREEN BASELINE AT PLAN TIME:** working tree clean at `8ac6902`. Vitest is `environment: \"node\"` with `include: [\"lib/**/*.test.ts\", \"components/**/*.test.ts\"]` — no DOM, no React rendering — so every assertion Task 1 adds is a SOURCE-CONTRACT assertion in this repo's established idiom (read the real file, strip comments, assert structure), and everything needing a browser is a Playwright spec."
---

<objective>
Print a key beside the rail plan/side drawing, naming every line the shaper left ticked, so a
printed Rail Band Instructions sheet says what each coloured line on the deck actually means.

Purpose: the sheet already draws the marks — an orange pair, a blue pair, a green centre line, a red
rail mark, a purple tuck — but nothing on paper says which is which. On screen the shaper has nine
tick boxes with their names beside them; on paper he has nine anonymous colours. A shaper cutting
foam to that sheet has to remember what he ticked.

Output: a colour-dot-plus-name list in the blank paper to the right of the drawing, listing only the
lines he left ticked, in the same order the ticks appear on screen, drawn in the same ink the lines
are drawn in — costing not one pixel of the sheet's height.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@components/rails/rail-plan-side-figure.tsx
@components/rails/rail-reference-paths.ts
@components/rails/rail-legend-ticks.tsx
@components/summary/rail-instructions-sheet.tsx
@components/summary/rail-instructions-sheet.test.ts
@.planning/quick/260910-2ny-size-each-order-form-sheet-to-the-real-p/260910-2ny-BROWSER-READING.md
</context>

<the_shape_of_the_change>

This section is the design, settled and measured. Nothing below it re-decides any of it.

**The figure's card today** is `mx-auto w-full ... p-3.5` wrapping ONE element: a `@container relative
mx-auto w-full` box with `aspectRatio: 499 / 630` and `maxWidth: 373.854px`, holding the four
absolutely-positioned columns (plan / station labels / side / taper note).

**The figure's card after this change** wraps a flex ROW holding TWO items:

```
card  (unchanged: mx-auto w-full rounded-lg border bg-surf-ground p-3.5)
└─ row   @container/rail-key   flex w-full items-start justify-center   gap: KEY_GAP_PX
   ├─ drawing   @container relative min-w-0
   │            flex: 0 1 FIGURE_MAX_RENDERED_WIDTH px   aspectRatio: 499 / 630
   │            (its four inner columns are UNTOUCHED)
   └─ key       hidden  @min-[486px]/rail-key:block  min-w-0 flex-1
                fontSize: KEY_FONT_SIZE_PX   lineHeight: 1.4
                (rendered only when showLineKey && at least one line is ticked)
```

Why each piece, all of it measured (see `must_haves.key_links`):

- `flex: 0 1 373.854px` on the drawing behaves EXACTLY like today's `w-full` + `maxWidth` — grow 0
  keeps it at its cap when there is room, shrink 1 lets it shrink when there is not. Measured
  identical to today at every width tried, in both engines.
- `justify-center` on the row is what reproduces today's `mx-auto` when the key is absent. When the
  key IS present it is a no-op, because the key's `flex: 1 1 0%` has already eaten every pixel of
  free space — which is precisely why the drawing goes flush left with all the blank paper gathered
  into one column on its right, the placement the founder chose.
- `min-w-0` on the key plus wrapping labels means the key's min-content contribution is its longest
  WORD, not its longest label, so it cannot widen the sheet.
- `hidden @min-[486px]/rail-key:block` is the guard, and the only guard needed.

</the_shape_of_the_change>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: the key itself — a colour dot and a name for every line still ticked</name>
  <files>components/rails/rail-plan-side-figure.tsx, components/rails/rail-legend-ticks.tsx, components/summary/rail-instructions-sheet.tsx, components/rails/rail-plan-side-figure.test.ts, components/summary/rail-instructions-sheet.test.ts</files>
  <read_first>
    `components/rails/rail-plan-side-figure.tsx` in full — especially the `FIGURE_*` constant block and
    its comment on where `373.85` comes from, and `LABEL_FONT_SIZE`'s comment on why `3.2cqw` computes
    to the prototype's own label size. `components/rails/rail-reference-paths.ts`'s comment on
    `REF_GROUP_SCREEN_COLORS`. `components/summary/rail-instructions-sheet.test.ts` for the
    source-contract idiom you are extending (`readStripped`, then a structural assertion, so a mention
    inside a doc comment can never false-positive).
  </read_first>
  <behavior>
    Source-contract assertions, written FIRST and failing, in this repo's established idiom — read the
    real file, strip comments, assert structure. Vitest is node-environment: no DOM, no rendering.

    In a new `components/rails/rail-plan-side-figure.test.ts`:
    - The derived threshold and the literal in the class string agree:
      `KEY_ROW_MIN_WIDTH_PX === 486` AND the stripped source contains `@min-[486px]/rail-key:block`.
      (Tailwind cannot compose a class name from a variable, so the literal is unavoidable — this is
      the same contract `components/summary/order-form-print.test.ts` keeps over its own two-number
      aspect ratio.)
    - The threshold is DERIVED, not typed: the source computes it with `Math.ceil` from
      `FIGURE_MAX_RENDERED_WIDTH`, `KEY_GAP_PX` and `KEY_MIN_COLUMN_PX`, and the file contains no bare
      `486` outside that class string.
    - The key's type size is derived from the same two constants the station labels use: the source
      contains `FIGURE_MAX_RENDERED_WIDTH * (LABEL_FONT_CQW / 100)`, and the `clamp(...)` string is
      interpolated from `LABEL_FONT_CQW` rather than carrying a second copy of that percentage — i.e.
      the coefficient appears exactly once in the whole file, on the constant's own declaration.
      (Asserted against the comment-stripped source, as every case here is, so a doc comment that
      mentions the number cannot false-positive it.)
    - The swatch and the line read ONE source of truth: `RAIL_REFERENCE_LEGEND` is built from
      `REF_GROUP_SCREEN_COLORS` only (its nine entries contain no `#` hex literal), `refPathElements`
      strokes with `REF_GROUP_SCREEN_COLORS`, and the key's swatch takes `entry.color`.
    - The key lists only ticked lines: the source filters `RAIL_REFERENCE_LEGEND` on
      `visibleGroups.has`.
    - The key is not a control: no `Checkbox` import, no `coarse:min-h-11`, no `onCheckedChange` and
      no `toggleGroup` anywhere in the file.
    - The key is opt-in and off by default: the prop is `showLineKey` with a `= false` default.
    - The row keeps `justify-center`, so the drawing re-centres when the key is absent.

    In `components/summary/rail-instructions-sheet.test.ts` (extend; every existing case must keep
    passing untouched):
    - The sheet asks for the key: its `<RailPlanSideFigure` call carries both `visibleGroups={visibleGroups}`
      and `showLineKey`.
    - The RAILS tab does NOT: read `components/rails/rail-instructions.tsx` stripped and assert its own
      `<RailPlanSideFigure` call carries no `showLineKey` — the nine already sit there as tick boxes and
      a second, unclickable copy beside them would be noise.
  </behavior>
  <action>
    Build the key exactly as `<the_shape_of_the_change>` lays it out. Do not re-derive any number in
    it; every one was measured at plan time and the measurements are in `must_haves.key_links`.

    In `components/rails/rail-plan-side-figure.tsx`:

    1. Factor `LABEL_FONT_CQW = 3.2` out of the existing `LABEL_FONT_SIZE` string and compose the
       clamp from it, leaving that constant's own comment intact and adding a line saying the key
       beside the drawing takes the same number in px.
    2. Add the key's three constants: `KEY_GAP_PX` (12), `KEY_MIN_COLUMN_PX` (100), and an exported
       `KEY_ROW_MIN_WIDTH_PX = Math.ceil(FIGURE_MAX_RENDERED_WIDTH + KEY_GAP_PX + KEY_MIN_COLUMN_PX)`.
       Comment what each is FOR: the gap between drawing and key; the narrowest column the key may be
       drawn in; and the row width at which it turns on — with the note that `Math.ceil` rounds up on
       purpose, since rounding up can only turn the key on later, never earlier, and that the matching
       literal lives in a Tailwind class the test pins against this value.
    3. Add `KEY_FONT_SIZE_PX = FIGURE_MAX_RENDERED_WIDTH * (LABEL_FONT_CQW / 100)`, with the comment
       explaining WHY it is not a `cqw`: the key sits outside the drawing's own container, so a `cqw`
       there would read the key column's page-dependent width instead of the figure's fixed one.
    4. Export a `RailLegendSwatch({ color })` — the 9px round dot, `inline-block h-[9px] w-[9px]
       flex-shrink-0 rounded-full` with `style={{ background: color }}`, exactly the span
       `RailLegendTicks` draws today. Its comment says what it is for: one swatch expression, so the
       dot and the line it names can never resolve to different ink.
    5. Give `RailPlanSideFigure` a second prop, `showLineKey = false`, and restructure the card's
       single child into the flex row above. The drawing's four inner columns, its `<img>`, both
       SVGs, the station labels and the taper note are NOT edited — only the box around them changes
       from `mx-auto w-full` + `maxWidth` to a flex item with `flex: 0 1 ${FIGURE_MAX_RENDERED_WIDTH}px`.
    6. Render the key as a `<ul>` carrying `data-rail-line-key` (Task 2's spec finds it by that), with
       one `<li>` per entry of `RAIL_REFERENCE_LEGEND.filter((e) => visibleGroups.has(e.key))`:
       `flex items-baseline gap-1.5 text-surf-ink [overflow-wrap:break-word]`, a `RailLegendSwatch`,
       and the label in a `min-w-0` span so it wraps on words instead of forcing the column wide.
       Render it only when `showLineKey` AND that filtered list is non-empty — so nothing is left
       behind when every line is unticked, and there is no heading and no border to leave behind in
       the first place (founder decision 3: swatch plus name, nothing else).
    7. Put `data-rail-figure` on the card so Task 2's spec can measure its height by a stable hook
       rather than a brittle selector.
    8. Update the file's head comment. It currently says "This file is presentation only: it lays the
       four columns out as one box that fits its container's width..." — it now lays those four
       columns out BESIDE an optional key, and the head comment should say so, including that the key
       is opt-in (the RAILS tab has the same nine as tick boxes and does not want a second copy) and
       that it is deliberately not drawn at all below `KEY_ROW_MIN_WIDTH_PX`.

    In `components/rails/rail-legend-ticks.tsx`: replace its inline dot span with `RailLegendSwatch`.
    Nothing else about that component changes — the `coarse:min-h-11` touch rule, the `Checkbox` and
    the caller's `className` all stay exactly as they are.

    In `components/summary/rail-instructions-sheet.tsx`: pass `showLineKey` on the
    `<RailPlanSideFigure>` call and extend the comment above it — it already explains that the lines
    are the shaper's own chosen ones (D-01); add that the sheet now also NAMES them, and that the key
    is asked for here and only here, because the RAILS tab shows the same nine as ticks.

    Do not touch `components/rails/rail-instructions.tsx`, `app/design/summary/order-form.css`,
    `components/summary/use-print-fit.ts`, `e2e/summary-print-touch-box.spec.ts` or
    `e2e/summary-print-size.spec.ts`. None of them needs a line, and the last two are the founder's
    printer gates.
  </action>
  <verify>
    <automated>npx vitest run components/rails/rail-plan-side-figure.test.ts components/summary/rail-instructions-sheet.test.ts &amp;&amp; npm test &amp;&amp; npx tsc --noEmit &amp;&amp; npm run lint &amp;&amp; test -z "$(git diff --name-only -- e2e/summary-print-touch-box.spec.ts e2e/summary-print-size.spec.ts app/design/summary/order-form.css)"</automated>
  </verify>
  <done>
    The new tests were RED before the change and are green after it. `npm test` is green with no
    pre-existing case lost, `tsc` and `lint` are clean, and `git diff` proves neither printer gate nor
    the order form's stylesheet was touched. `RAIL_REFERENCE_LEGEND` and `REF_GROUP_SCREEN_COLORS` are
    unchanged — this task names lines, it does not recolour them. Committed with a subject a shaper
    would understand.
  </done>
</task>

<task type="auto">
  <name>Task 2: write the browser test that proves the key costs nothing — do not run it</name>
  <files>e2e/summary-rail-key.spec.ts</files>
  <precondition>
    You cannot run this. `npm run dev` fails inside a worktree with Turbopack's "Could not find the
    Next.js package", and the Playwright suite starts its own dev server. Write the spec, run the
    vitest and lint gates, and say plainly in your summary that the browser run was left to the
    orchestrator (Task 3). Do NOT run `next dev` and do NOT touch `.next/dev/lock`.
  </precondition>
  <read_first>
    `e2e/summary-print-touch-box.spec.ts` — for its `enableRailBandInstructions` helper, its
    `SWEEP_WIDTHS` list, its `forceTouchSheet` approach and its head-comment discipline about what a
    browser test can and cannot claim.
  </read_first>
  <action>
    Write a NEW spec. **Do not edit `e2e/summary-print-touch-box.spec.ts`, and do not import its
    helpers** — copy what you need locally. That file is the gate that protects the founder's printer,
    it went green only today after three rounds, and the whole point of a separate file is that it is
    never touched again. `260910-2ny-BROWSER-READING.md` records the same discipline for
    `e2e/summary-print-size.spec.ts`.

    Sweep the SAME widths that file sweeps — 560, 618, 680, 733, 760, 812, 900 — with the rail-band
    instructions preference on, three sheets present, and `emulateMedia({ media: 'print' })`. At each
    width measure the figure card (`[data-rail-figure]`) in two states and assert:

    - **The key costs no height.** The card's height with all nine lines ticked equals its height with
      every line unticked, to within half a pixel, at every swept width. This is the founder's whole
      reason for choosing this placement and it is the one number worth measuring.
    - **The drawing does not shrink.** The drawing box inside the card is the same width in both
      states at every swept width.
    - **The key is actually there.** `[data-rail-line-key]` exists and is visible at every swept
      width — the sweep's narrowest page leaves only about 30px of clearance over the threshold, so
      this is the assertion that stops the key silently dropping out of a future build.
    - **It lists what he ticked, and nothing else.** With all nine ticked the key's entries read the
      nine legend labels in `RAIL_REFERENCE_LEGEND` order. Untick two: seven entries, the right seven,
      still in order. Untick every one: `[data-rail-line-key]` is absent from the DOM entirely — no
      stray heading, no empty column.
    - **Nothing overflows in either state.** `scrollHeight <= clientHeight + 0.5` for all three sheets
      at every swept width. This deliberately re-proves case 6(b) locally so this spec stands on its
      own if the other one ever moves.

    Toggle the ticks in SCREEN media through the Summary's own mirrored `RailLegendTicks` under the
    print buttons, then switch to print media to measure — that control row carries `data-print-hide`,
    so it is `display: none` in print media and cannot be clicked there. Log the per-width table the
    way the touch-box spec logs its own, so Task 3 has numbers to write down rather than a pass mark.

    Run it on the same projects the touch-box spec runs on (desktop, iphone, android): the key matters
    most on the founder's phone print, and a computer's sheet has to be shown unharmed too.
  </action>
  <verify>
    <automated>npx tsc --noEmit &amp;&amp; npm run lint &amp;&amp; test -z "$(git diff --name-only -- e2e/summary-print-touch-box.spec.ts e2e/summary-print-size.spec.ts)"</automated>
    <human-check>The spec was NOT executed here and the summary says so in as many words.</human-check>
  </verify>
  <done>
    `e2e/summary-rail-key.spec.ts` exists, type-checks and lints, and neither existing print spec was
    edited. The summary states plainly that the browser run is outstanding and belongs to Task 3.
    Committed.
  </done>
</task>

<task type="auto">
  <name>Task 3: run the browser gates on a clean checkout, and write the reading down</name>
  <files>.planning/quick/260910-jfp-print-a-key-beside-the-rail-plan-side-dr/260910-jfp-BROWSER-READING.md</files>
  <precondition>
    ORCHESTRATOR, on the MAIN CHECKOUT of `main` — not in a worktree. Chromium and WebKit are already
    installed. Do not run `next dev` by hand and do not touch `.next/dev/lock`; the suite starts and
    stops its own server on `PW_PORT`.
  </precondition>
  <read_first>
    This plan's `must_haves.key_links` — the plan-time measurements are what the browser numbers are
    being read against.
  </read_first>
  <action>
    **This is the gate. A previous plan wrote four Playwright commands down, recorded them `pending`,
    and shipped anyway — which is how a broken sheet reached the founder's printer. This task exists
    so that cannot happen again, and its `<done>` asks for measured numbers, not a pass mark.**

    Run all three, capturing full output including the console tables:

    ```
    PW_PORT=3108 npx playwright test e2e/summary-rail-key.spec.ts
    PW_PORT=3108 npx playwright test e2e/summary-print-touch-box.spec.ts
    PW_PORT=3108 npx playwright test e2e/summary-print-size.spec.ts --project=desktop
    ```

    The second one is the founder's printer gate and this task's real question is whether it still
    reports `overflow=[ok, ok, ok]` at 560, 618, 680, 733, 760, 812 and 900 dots on all three
    projects, exactly as `260910-2ny-BROWSER-READING.md` recorded it. The third proves a computer's
    sheet is still the measured 733.44 x 990.55 dot box.

    Then write `260910-jfp-BROWSER-READING.md` in the same shape as
    `260910-2ny-BROWSER-READING.md`: front matter naming what was run and on what, then the numbers,
    then the verdict in plain English. Record, at minimum: the figure card's height with the key on
    and with it off at each swept width (the pair that proves the placement is free), whether the key
    was present at every swept width, the entry counts for nine / seven / zero ticked, and the
    `overflow=[...]` row from the untouched touch-box sweep.

    If anything fails, fix it and re-measure — do not write a reading around a failure.
  </action>
  <verify>
    <automated>PW_PORT=3108 npx playwright test e2e/summary-rail-key.spec.ts e2e/summary-print-touch-box.spec.ts &amp;&amp; PW_PORT=3108 npx playwright test e2e/summary-print-size.spec.ts --project=desktop &amp;&amp; test -f .planning/quick/260910-jfp-print-a-key-beside-the-rail-plan-side-dr/260910-jfp-BROWSER-READING.md</automated>
    <human-check>Once deployed, the founder opens the Summary, ticks and unticks a couple of lines, and sees the key beside the drawing change with them — the on-screen preview IS the print (D-09), so his eye on the preview is the same check as a sheet of paper. A confirming print is welcome but not required: the sheet's box is measured unchanged.</human-check>
  </verify>
  <done>
    All three specs have been RUN on a clean checkout and pass.
    `260910-jfp-BROWSER-READING.md` exists and carries the measured numbers — the key-on/key-off card
    heights at every swept width, the key's presence and entry counts, and the untouched touch-box
    sweep's own `overflow=[ok, ok, ok]` row — not a pass mark. Committed.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (nothing newly crossed) | Every change is client-side presentation inside one already-rendered figure, plus one optional boolean prop. No new route, no server action, no database column, no network call, no new dependency, and no user-supplied string is read, stored or rendered — the nine labels are compile-time constants ported from the prototype. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-jfp-01 | Denial of service | components/rails/rail-plan-side-figure.tsx | medium | mitigate | A key squeezed below its own min-content stacks a word per line and was measured at 1876px tall, exploding the figure to 1906px — on a sheet that is `overflow: hidden` in print, that CLIPS silently rather than erroring. Mitigated by the `@min-[486px]/rail-key` threshold, which guarantees the column at least 100.146px whenever the key is drawn, and by Task 2's spec asserting the key is PRESENT and nothing overflows at every width in the founder's own print sweep. |
| T-jfp-02 | Tampering | the printed swatch's ink | medium | mitigate | A swatch printing a different colour from the line it names is worse than no key at all. Mitigated structurally rather than by care: swatch and line read the SAME `REF_GROUP_SCREEN_COLORS` entry through one `RAIL_REFERENCE_LEGEND.color` field, measured resolving identically in print media in both engines, and pinned by a source-contract test asserting the legend carries no hex literal of its own. |
| T-jfp-03 | Repudiation | never-run browser gates | high | mitigate | The failure that cost the founder a print: Playwright commands written into a plan, recorded `pending`, shipped unrun. Mitigated by making the browser run Task 3 — a task in its own right, addressed to the orchestrator on a clean checkout, with a written artefact whose `<done>` requires the measured numbers — rather than a `<verify>` line inside a task an executor cannot run. |
| T-jfp-04 | Information disclosure | components/summary/rail-instructions-sheet.tsx | low | accept | The key names the same nine lines already visible as tick boxes on two screens, from a compile-time constant. Nothing about the shaper's board, his account or any saved design reaches it. |
| T-jfp-05 | Tampering | npm/pip/cargo installs | n/a | mitigate | No package is installed by this task, so no legitimacy gate applies. |
</threat_model>

<verification>
**Automated:**

- `npx vitest run components/rails/rail-plan-side-figure.test.ts components/summary/rail-instructions-sheet.test.ts` — the source contract: the threshold is derived and agrees with its class literal, the key's type size comes from the same two constants the station labels use, swatch and line share one colour source, the key filters on the ticked set, it carries no control, and the RAILS tab does not ask for it.
- `npm test` — green, with every pre-existing case in `rail-instructions-sheet.test.ts` still passing (the Flat example hard-set, the Copywriting Contract strings verbatim, the `rail-instructions` import list unchanged, the conditional on the print preference).
- `npx tsc --noEmit` and `npm run lint` clean.
- `test -z "$(git diff --name-only -- e2e/summary-print-touch-box.spec.ts e2e/summary-print-size.spec.ts app/design/summary/order-form.css)"` — proof that neither printer gate nor the order form's stylesheet was touched.
- `PW_PORT=3108 npx playwright test e2e/summary-rail-key.spec.ts` — the key costs no height, the drawing does not shrink, the key is present at every swept width, it lists exactly the ticked lines and vanishes entirely when none are, and nothing overflows.
- `PW_PORT=3108 npx playwright test e2e/summary-print-touch-box.spec.ts` — still `overflow=[ok, ok, ok]` at all seven widths on all three projects, from a file this task never edited.
- `PW_PORT=3108 npx playwright test e2e/summary-print-size.spec.ts --project=desktop` — a computer's sheet still 733.44 x 990.55 dots.
- `260910-jfp-BROWSER-READING.md` exists and carries numbers, not a pass mark.

**Known pre-existing condition, recorded so a future reader does not mistake it for a regression:**
at a 390-dot page area in print media the instructions sheet already overflows by about 44px with the
example rail band squeezed to nothing. That is a screen-preview-only width, not the founder's print
width, it predates this task, and it is out of scope. This task neither fixes nor worsens it: below a
516px card the key is not drawn and the figure is byte-identical to today's.
</verification>

<success_criteria>
A printed Rail Band Instructions sheet names every line the shaper left ticked, in a colour-dot-plus-name
list beside the drawing, in the ink those lines are actually drawn in — and the sheet is the same height
it was, at every page width the founder's printer can hand it.
</success_criteria>

<output>
Create `.planning/quick/260910-jfp-print-a-key-beside-the-rail-plan-side-dr/260910-jfp-SUMMARY.md` when done
</output>
