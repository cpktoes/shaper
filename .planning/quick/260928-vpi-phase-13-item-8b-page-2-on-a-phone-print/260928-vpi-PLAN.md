---
phase: quick-260928-vpi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/fins.ts
  - lib/geometry/fins.test.ts
  - components/summary/order-form.tsx
  - components/fins/fin-model-info.tsx
  - e2e/summary-planing.spec.ts
  - app/design/summary/order-form.css
  - components/rails/rail-data-table.tsx
  - components/summary/order-form-print.test.ts
autonomous: true
requirements: [QT-260928-vpi, 13-SPEC-item-8b]

estimate:
  # Sequential on main, on top of item 8's commits (159521f is HEAD at plan time). Three tasks:
  # - Task 1 adds two small functions to lib/geometry/fins.ts, ~60 lines of vitest, and edits a few
  #   lines in order-form.tsx and fin-model-info.tsx.
  # - Task 2 reworks case D of e2e/summary-planing.spec.ts (769 lines, the heaviest read) and adds
  #   one test; one Playwright run (desktop project) to watch it fail.
  # - Task 3 adds two CSS rules plus comments to order-form.css (732 lines), two class hooks in
  #   order-form.tsx (965 lines), one class in rail-data-table.tsx, ~80 lines of contract tests,
  #   and three Playwright specs across all three projects.
  # estimate-calibration: factor 1, 0 samples, so confidence is low.
  tokens: 130000
  raw_tokens: 130000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "On a sheet printed from a phone, at every page width from 560 to 900 dots, in Imperial and Metric, with a quad on a blank and the widest rail numbers any board can carry: the Rail Bands markings fit inside their own box, the fin numbers fit inside the Fin Placement box without running into its notes, the notes stay inside that box, and Shaper Use Only stays clear of the PAGE 2 OF 2 footer. Before this task a quad overflowed at every width up to 800 (rail content 415 in a 291 px box at 560 Imperial, 433 Metric; 400 in 333 at 618; 427 in 413 at 733)."
    - "Every rail row prints on one line at every phone width, including 560, where the rail labels wrapped before. PLANING stays to the LEFT of Rail Bands (locked L-1), and its caption row and its Deck/Bottom header row stay level with Rail Bands' own at every width. The PLANING table keeps its 28% share floored at its own width and the rail marks' type size (locked L-2)."
    - "The computer's print (Letter and A4, both systems) is unchanged (locked L-3): rail content 427.1 in a 438.9 px box, rail row 479.9 px, Fin Placement box 301.9 px, Shaper Use Only 128.9 px, rail row type 12.835 px (9.6 pt on paper), measured identical before and after. The only change a computer print shows is the reworded fin-notes line (the founder's decision), which now fits one line, so the fin grid's own room inside the unchanged Fin Placement box grows from 155.7 to 175.0 px for a quad."
    - "Page 1 is unchanged at every width, on a computer and on a phone sheet: the new type rule is scoped to page 2's `.order-form-sheet-reference` sheet on a phone sheet only, and the content floor is on two page-2 elements only. The browser spec proves page 1's own small type still sits at its 12 px floor on a phone sheet while page 2's has moved."
    - "The fin notes' closing line reads right in each system: Imperial `All measurements round to the nearest 1/16\" — expect a hair of play when routing to these numbers.`, Metric `All measurements round to the nearest millimetre — expect a hair of play when routing to these numbers.` (the app's own British spelling, as in measure-display.ts's `millimetres`). The same claim on FINS' MODEL INFO tab (Convention paragraph) reads `the nearest 1/16\"` or `the nearest millimetre` too. A unit test ties each wording to what the fin numbers actually print: every fin placement number parses back to a whole sixteenth in Imperial and a whole millimetre in Metric."
    - "No stored value changes and no saved board opens differently: nothing under lib/models, lib/db or db/ is touched; the fin placement numbers themselves are unchanged (golden parity tests untouched and green)."
    - "`npm test`, `npm run lint -- --max-warnings 0` and `npx tsc --noEmit` pass after every task; `e2e/summary-planing.spec.ts`, `e2e/summary-print-touch-box.spec.ts` and `e2e/summary-print-size.spec.ts` pass on all three Playwright projects with `PW_PORT=3120` after Task 3."
  artifacts:
    - path: lib/geometry/fins.ts
      provides: "finRoundingGrain(system) and finRoundingNote(system); computeFinPlacement's notes no longer carry the rounding line"
      contains: "export function finRoundingNote"
    - path: lib/geometry/fins.test.ts
      provides: "Both wordings pinned, and tied to the printed fin numbers over every golden fixture"
      contains: "finRoundingNote"
    - path: components/summary/order-form.tsx
      provides: "The fin notes end with finRoundingNote(system) under a data-fin-notes hook; the rail row and Fin Placement box carry order-form-content-floor"
      contains: "data-fin-notes"
    - path: components/fins/fin-model-info.tsx
      provides: "MODEL INFO's Convention paragraph reads the rounding grain in the shaper's own units"
      contains: "finRoundingGrain"
    - path: app/design/summary/order-form.css
      provides: "Inside @media print: page 2's type fitted to the phone sheet (--order-form-ref-unit) and each page-2 table box at least as tall as what it holds"
      contains: "--order-form-ref-unit"
    - path: components/rails/rail-data-table.tsx
      provides: "The compact table's last group carries no trailing margin"
      contains: "mb-1.5 last:mb-0"
    - path: components/summary/order-form-print.test.ts
      provides: "Contract tests: the fit rule redeclares every page-2 token without a floor, measures against the same paper as the computer's box, and lives in @media print with the content floor"
      contains: "order-form-ref-unit"
    - path: e2e/summary-planing.spec.ts
      provides: "Case D asserts the rail and fin fit, notes, footer clearance, one-line rows and level headers at every phone width 560-900 and on the computer print, both systems; a wording test for the fin notes' last line"
      contains: "data-fin-notes"
  key_links:
    - from: components/summary/order-form.tsx
      to: lib/geometry/fins.ts
      via: "finRoundingNote(system) appended after finPlacement.notes"
    - from: components/fins/fin-model-info.tsx
      to: lib/geometry/fins.ts
      via: "finRoundingGrain(system) in the Convention paragraph"
    - from: app/design/summary/order-form.css
      to: components/summary/order-form.tsx
      via: "the .order-form-content-floor class on [data-rail-bands-row] and on the Fin Placement FormBox; .order-form-sheet-reference on page 2's Sheet"
    - from: app/design/summary/order-form.css
      to: components/summary/use-print-fit.ts
      via: "the fit unit's design width is min(8.5in, 8.27in) - 16mm, the same PORTRAIT_PAPER_IN widths and 2 x PAGE_MARGIN_MM the computer's box uses (pinned by order-form-print.test.ts)"
---

<objective>
Phase 13 item 8b (quick 260928-vpi), from the founder's own report: on a sheet printed from a phone, page 2's
rail markings run into the Fin Placement box below. Plus the founder's decision of 2026-09-29: the fin notes'
last line should say what each system actually prints.

Purpose: a shaper who prints the order form from a phone gets a page 2 where every rail mark and every fin
number sits in its own box and nothing overlaps. A computer print stays exactly as the founder approved it.

Output:
- The fin notes' closing line, and the same claim on FINS' MODEL INFO tab, worded per system from one pure,
  tested function.
- A browser spec that fails on today's code at the phone widths and passes after the fix.
- Two print-only CSS rules: page 2's type fitted to a phone sheet, and each page-2 table box at least as tall
  as what it holds. Plus contract tests that pin both rules.
</objective>

<locked_decisions>
The founder's, approved on paper. Do not revisit:
- **L-1:** PLANING sits to the LEFT of Rail Bands in the `data-rail-bands-row` row.
- **L-2:** The PLANING table has Deck / Bottom headers and Foam Off / Passes rows. It uses the same type size
  as the rail marks, and a 28% share floored at its own min-content width.
- **L-3:** The COMPUTER print (Letter and A4, both systems) stays as it is. Page 1 stays as it is at every
  width.
- **L-4:** CLAUDE.md's three switches. Width decides layout, pointer decides control size, height decides
  short-screen scrolling.
- **L-5 (the founder, 2026-09-29):** Reword the fin notes' rounding line so it reads right in each system.
</locked_decisions>

<root_cause>
Measured at plan time in headless Chromium and WebKit on a dev server, using the harness's own method:
forced `data-print-touch`, print media, viewport width = page width. It is NOT one cause but three, and each
needs its own lever:

1. **The phone sheet is a different shape, not just a different width.**
   - A computer's sheet is 733.44 × 990.55 dots (1.351 tall per wide).
   - A phone's sheet is Letter-shaped, `aspect-ratio: 8.5 / 11` (1.294), by design since 260910-2ny, so it
     fits any paper inside any margin iOS picks.
   - At the same 733-dot width the phone's page 2 is 948.6 tall against the computer's 990.5: 42 dots
     shorter, with the same type.
   - So the rail table overflows at 733 (427 in 413) while the computer's 733.44 print fits (427.1 in 438.9).
   - A width-only rule cannot tell those two sheets apart. They differ only in shape, and the shape comes
     from the `data-print-touch` attribute the phone's print path already keys on.
2. **Below 733 dots the 12 px type floor takes over.**
   - Page 2's clamp floor holds type at 12 CSS px while the sheet keeps shrinking.
   - At 618 (the founder's own iPhone page) that is 10.3 pt on paper against the computer's 9.6 pt, on a
     shorter sheet.
3. **Fixed-pixel lines and padding don't shrink with the page.** The rules under every row, the box padding
   and the gaps take a bigger share of a narrower page.

On top of that, a Fin Placement box with a quad overflowed into its own notes at every width up to 800.
</root_cause>

<decisions>
**The fix, and why it beats the alternatives.** All numbers were measured with a quad on the first fitting
blank, Metric, with the reworded notes line. Imperial measured identical.

The chosen rule has two parts, both inside `@media print` only, so the screen preview never changes.

**Part A. A content floor (width-agnostic, pointer-agnostic).**
- Page 2's rail row and Fin Placement box each get `min-height: min-content`. Each is at least as tall as what
  it holds, and the page's spare room is shared as before.
- The rail table's last group loses its trailing 6 px margin (`last:mb-0`), which counted towards the floor
  and never showed.
- On the computer print both floors sit below the boxes' flex shares, so the rule is a no-op there (measured:
  every computer figure identical).
- The one case where Part A can move anything on a computer print is a board whose fin content already ran
  into its own notes there. For example, a quad with the narrow-tail and pintail notes both showing:
  - before this task that board printed overlapping;
  - after it, the Fin Placement box takes the room it needs out of the rail box's own spare room.
  No measured board is in that state today. The unchanged-computer claim is for every board that fit before.

**Part B. On the phone sheet only, page 2's type follows one fit unit.**
- The rule is `[data-order-form-root][data-print-touch] .order-form-sheet-reference`, in `@media print`,
  right after the phone sheet's own shape rule.
- `--order-form-ref-unit: calc(0.94cqw - 0.003 * max(0px, min(8.5in, 8.27in) - 16mm - 100cqw))`.
- Every page-2 token is then `N × unit`, with no 12 px floor, using the same N the reference sheet already
  uses: 1.9 / 1.75 / 2.15 / 1.75 / 1.9, and the four `--summary-font-*` aliases.
- What the numbers mean:
  - **0.94.** The phone sheet is 95.8% as tall for its width as the computer's, since 1.294 / 1.351 =
    0.958. The type is fitted a little under that because the fixed-pixel rules and padding don't shrink
    with it.
  - **0.94 is tuned for parity.** It is the value at which a phone sheet keeps at least the computer print's
    own share of spare room at every width. The computer has 35.3 px spare, 3.8% of the Shaping Data column.
  - **0.003 per dot.** Below the 733.44-dot design width the fixed pixels are a bigger share of the page, so
    the unit takes 0.003 px off per dot of narrowing: 0.884 cqw at 618, 0.847 cqw at 560.
  - **The design-width expression.** It is the computer box's own `min(8.5in, 8.27in) - 16mm` (733.45 px),
    so the two can't drift. A contract test pins it to use-print-fit.ts's PORTRAIT_PAPER_IN and
    PAGE_MARGIN_MM.
- No box moves and nothing is re-arranged. Page 2's layout is identical at every width; only the type size
  on a phone sheet changes.

**Why not the others (measured):**
- **(a) Floor removal alone** (pure `cqw`, the "faithful physical size" idea, width-only below 733).
  - It still overflows at every width up to 733: rail 350 in 297 at 560, 376 in 336 at 618, 427 in 413 at
    733.
  - A phone sheet that is a perfect photograph of the computer's page 2 still fails, because the phone sheet
    is 4.2% shorter for its width (root cause 1).
- **(b) Stacking PLANING under Rail Bands on a narrow sheet.** It costs about 110 px of the height that is
  already short, and it breaks L-1.
- **(b) Moving Metric `(mm)` out of the rail headers.** It only fixes the 560 label wrap; the wrap already
  goes away with the fit unit (rail row spread 0 at 560 with `Hard Edge` in every cell).
- **(c) Re-balancing the rail row against Fin Placement.** On its own there is nothing to re-balance:
  - the quad's fin box itself overflowed at 560–680 (141 in 70, 141 in 96, 142.4 in 141.5);
  - floors alone still leave the column 12.6 px too tall at 733 (6.6 px with the trailing-margin trim);
  - either way Shaper Use Only slides over the PAGE 2 OF 2 footer.
- **A width-only container query** (the coordinator's suggested form, L-4).
  - It fixes 560–~720 and ≥ ~760 but cannot reach 733–~755. There a phone sheet and the computer's
    733.44-dot sheet are the same width, and only the phone sheet's shape tells them apart.
  - Measured with floors + trim + width-only: Shaper Use Only's bottom lands 2.6 px over the footer at 733,
    with the column 6.6 px too tall, and the column 2.3 px too tall at 745.
  - So Part B keys on the phone sheet: the same `data-print-touch` attribute that already gives that sheet
    its paper shape. `order-form-print.test.ts` already documents why the phone rule keys on this attribute
    and never on a width (an iPad is a coarse pointer on a wide page).
  - It decides a type size on paper, never a layout. The arrangement of page 2 is the same at every width.
    See `<coordinator_confirm>`.
- **CSS `zoom`, `transform`, or a size container on the sheet.**
  - `zoom` resolves `cqw` against the shrunken box in WebKit (order-form.css's own note).
  - `transform` doesn't move page breaks.
  - A size container would re-base every page-2 `cqw` on the sheet instead of the root and change the
    computer print.
  - All three are untestable on the founder's real iPhone before the paper check.

**Type on paper** (rail rows, `--summary-font-row`; points on the founder's measured 7.347 in of iPhone
paper, 72 × px × 7.347 / width):

| page width | before (px → pt) | after (px → pt) |
|---|---|---|
| 560 | 12.00 → 11.3 (overflowing) | 8.30 → 7.8 |
| 618 (founder's phone) | 12.00 → 10.3 (overflowing) | 9.56 → 8.2 |
| 680 | 12.00 → 9.3 (overflowing) | 10.91 → 8.5 |
| 733–900 | 1.75 cqw → 9.3 | 1.645 cqw → 8.7 |
| computer print | 12.835 → 9.6 | 12.835 → 9.6 (unchanged) |

Page 1's own type on a phone sheet is untouched: 12 px floor, 10.3 pt at 618.

**The fin-notes line.**
- **Where it lives.** It is a fixed sentence at the end of `computeFinPlacement`'s notes. That function never
  sees the shaper's system (the preference is display-only and lives outside the design store, CLAUDE.md
  Rule 2), so it cannot word the line itself.
- **Nothing pins it.** Neither golden fixture (`prototype-fins-golden.json`,
  `prototype-fins-imported-golden.json`) nor `scripts/extract-prototype-fins-golden.mjs` carries the notes.
  Its only reader is the order form, the one place the notes render.
- **So the line moves out.** It comes out of the notes array into `finRoundingNote(system)` in the same file:
  pure, tested, and taking the system the way `toeAimTableFor` and `planingTable` already do. The order form
  appends it after the model notes.
- **FINS screen.** FINS doesn't render the notes array, but its MODEL INFO tab repeats the same claim in the
  Convention paragraph, with the same centimetre aside. It uses `finRoundingGrain(system)` so it reads right
  everywhere.
- **The Thruster — Basic note** (`Off-rail 1.1875", toe ¼"`) quotes the source table's own inch convention.
  It is out of scope and left alone. Like every other model note it is inch-based in both systems today, and
  on the Metric sheet it reads as a quotation of that convention rather than a claim about the printed
  numbers.
</decisions>

<coordinator_confirm>
This is the one thing the coordinator should confirm (with the founder if they judge L-4 to forbid it)
before execution.

**What Part B does.**
- It keys page 2's type size on the phone sheet (`[data-print-touch]`), not on a container width.
- The measured reason is in `<decisions>`: no width rule can separate a 733-dot phone sheet from the
  733.44-dot computer sheet.
- It changes type size only. Page 2's arrangement is identical at every width, and page 1 is untouched.

**If width-alone is required instead:**
- Replace Part B's selector with `@container (width < 733px)` wrapping
  `[data-order-form-root] .order-form-sheet-reference`, inside `@media print`.
- That leaves a quad's page 2 overlapping the footer at 733–~755 dots, by up to 2.6 px at 733 (column 6.6 px
  too tall), which item 8b's Done-when does not allow.

**Also worth telling the founder before they print.** On their iPhone (618 dots) page 2's rail marks will
print at about 8.2 pt, down from 10.3 pt today (where they overflow). A computer print stays at 9.6 pt.
</coordinator_confirm>

<plan_time_measurements>
Chromium, the harness's method (`page.emulateMedia({media:"print"})`, forced `data-print-touch`, viewport =
page width, height 1400). Pixels are CSS dots.
- "rail" = the compact rail table's content height against its box (`[data-print-unfold]` #1).
- "fin" = the fin grid's content against its box (`[data-print-unfold]` #2).
- Negative slack = overflow.

**BEFORE, today's main (159521f), today's notes wording.**

Shortboard preset (thruster, a blank), Imperial. Metric is identical except rail at 560: 433.0 in 291.4.

| width | rail content / box (slack) | fin content / box (slack) | notes px |
|---|---|---|---|
| computer | 427.1 / 438.9 (+11.8) | 134.5 / 175.0 (+40.5) | 81.9 |
| 560 | 415.0 / 291.4 (−123.6), labels wrap (row spread 15) | 125.0 / 88.1 (−36.9) | 77.0 |
| 618 | 400.0 / 333.0 (−67.0) | 125.0 / 114.1 (−10.9) | 77.0 |
| 680 | 405.5 / 376.8 (−28.7) | 126.4 / 141.5 (+15.1) | 77.0 |
| 733 | 427.0 / 413.0 (−14.0) | 134.5 / 158.8 (+24.3) | 81.9 |
| 800 | 456.7 / 457.7 (+1.0) | 145.8 / 179.2 (+33.4) | 89.0 |
| 900 | 500.9 / 524.5 (+23.6) | 162.6 / 209.5 (+46.9) | 99.5 |

Quad on the first fitting blank (case D's own board). Metric is identical except rail at 560: 433.0.

| width | rail content / box (slack) | fin content / box (slack) | notes px (lines) |
|---|---|---|---|
| computer | 427.1 / 438.9 (+11.8) | 151.5 / 155.7 (+4.2) | 101.2 (3+2) |
| 560 | 415.0 / 291.4 (−123.6) | 141.0 / 70.1 (−70.9) | 95.0 |
| 618 | 400.0 / 333.0 (−67.0) | 141.0 / 96.1 (−44.9) | 95.0 |
| 680 | 405.5 / 376.8 (−28.7) | 142.4 / 123.5 (−18.9) | 95.0 |
| 733 | 427.0 / 413.0 (−14.0) | 151.5 / 139.6 (−11.9) | 101.2 |
| 800 | 456.7 / 457.7 (+1.0) | 164.3 / 158.2 (−6.1) | 110.0 |
| 900 | 500.9 / 524.5 (+23.6) | 183.3 / 185.9 (+2.6) | 123.1 |

The sheet's own overflow reads 0 at every width even so. The overflowing rail and fin text lands on
neighbouring boxes inside the sheet: the rail marks on Fin Placement, and the fin numbers on their own
notes. That is why case D gains the column and notes checks below.

**AFTER Task 1 only** (reworded line; the RED baseline Task 2 sees), quad on a blank:
- Rail is unchanged.
- Fin: computer 151.5 / 175.0; 560 141.0 / 70.1; 618 141.0 / 96.1; 680 142.4 / 141.5; 733 151.5 / 158.8;
  760 156.6 / 167.1; 800 164.3 / 179.2; 900 183.3 / 209.5.
- Rail at 760: 438.8 / 431.0 (−7.8).

**AFTER Task 3** (both parts plus the reworded line), quad on a blank. Metric and Imperial are identical, and
WebKit agrees within 0.7 px.

| width | rail content / box | fin content / box | pooled spare | rail row type |
|---|---|---|---|---|
| computer | 427.1 / 438.9 | 151.5 / 175.0 | 35.3 (3.8%) | 12.835 px |
| 560 | 312.5 / 312.5 | 102.2 / 128.6 | 26.4 (4.0%) | 8.301 px |
| 618 | 344.5 / 344.5 | 116.0 / 150.0 | 34.0 (4.6%) | 9.560 px |
| 680 | 378.4 / 384.4 | 130.6 / 169.7 | 45.1 (5.5%) | 10.905 px |
| 733 | 407.7 / 418.1 | 143.2 / 166.9 | 34.1 (3.9%) | 12.056 px |
| 760 | 418.8 / 436.3 | 148.0 / 175.5 | 45.0 (4.9%) | 12.502 px |
| 800 | 435.3 / 463.3 | 155.1 / 207.8 | 80.7 | 13.160 px |
| 812 | 440.3 / 471.5 | 157.3 / 211.9 | 85.8 | 13.357 px |
| 900 | 477.2 / 530.8 | 173.1 / 241.8 | 122.3 | 14.805 px |

At every width after Task 3:
- column overflow is 0;
- Shaper Use Only's bottom sits 4.0 px above the footer (the same as the computer print);
- rail row spread is 0 with `Hard Edge` written into every rail cell;
- the Rail Bands and PLANING caption bottoms, and their header text tops, are level (difference 0);
- the PLANING panel doesn't overflow.

The Shortboard thruster and the no-blank default board also fit at every width. The no-blank board's notes
are the rounding line alone.

At 560–618 the rail sits exactly at its floor and the fin box takes the rest. That is the content floor
working as intended.
</plan_time_measurements>

<exact_rules>
Part B and Part A exactly as measured. Task 3 inserts these into `app/design/summary/order-form.css`, inside
the existing `@media print { ... }` block, immediately after the
`[data-order-form-root][data-print-touch] [data-order-form-sheet] { ... }` rule and before the
`[data-order-form-sheet] + [data-order-form-sheet]` rule. Each rule is preceded by its own plain-English
comment (see Task 3):

```css
  [data-order-form-root][data-print-touch] .order-form-sheet-reference {
    --order-form-ref-unit: calc(0.94cqw - 0.003 * max(0px, min(8.5in, 8.27in) - 16mm - 100cqw));
    --order-form-caption: calc(1.9 * var(--order-form-ref-unit));
    --order-form-micro: calc(1.75 * var(--order-form-ref-unit));
    --order-form-value: calc(2.15 * var(--order-form-ref-unit));
    --order-form-row: calc(1.75 * var(--order-form-ref-unit));
    --order-form-group: calc(1.9 * var(--order-form-ref-unit));

    --summary-font-callout: calc(2.15 * var(--order-form-ref-unit));
    --summary-font-group: calc(1.9 * var(--order-form-ref-unit));
    --summary-font-row: calc(1.75 * var(--order-form-ref-unit));
    --summary-font-label: calc(1.9 * var(--order-form-ref-unit));
  }

  [data-order-form-root] .order-form-content-floor {
    min-height: min-content;
  }
```

Why each detail is load-bearing:
- **Specificity.** The phone rule scores (0,3,0) against the reference sheet's own (0,2,0) token rule, so it
  wins whatever the source order.
- **Where `cqw` resolves.** `--order-form-ref-unit` is an unregistered custom property, so its `cqw` resolves
  where a font-size uses it, against `[data-order-form-root]`, the same as the existing clamp tokens. Do NOT
  register it with `@property`.
- **No trig.** `max()`/`min()` with `cqw` are already used safely on this sheet (the clamp tokens). No
  `tan()`/`atan2()`, and no division of lengths.
- **Why the floor wins.** `.order-form-content-floor` is unlayered with specificity (0,2,0), so it beats
  Tailwind's layered `min-h-0` utility on the same elements (measured: it wins in both engines).
</exact_rules>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@AGENTS.md
@.planning/phases/13-ready-for-the-shapers/13-SPEC.md
@lib/geometry/fins.ts
@lib/geometry/fins.test.ts
@components/summary/order-form.tsx
@components/fins/fin-model-info.tsx
@components/rails/rail-data-table.tsx
@app/design/summary/order-form.css
@components/summary/order-form-print.test.ts
@components/summary/use-print-fit.ts
@e2e/summary-planing.spec.ts
@e2e/summary-print-touch-box.spec.ts
</context>

<interfaces>
Existing, used as-is:

```ts
// lib/geometry/units.ts
export type UnitsSystem = "imperial" | "metric";
export function parseImperial(input: string): Mm | null;                       // parseImperial('1 3/16"') -> 30.1625
export function parseMetric(input: string, fieldUnit: "cm" | "mm"): Mm | null;   // parseMetric("67 mm", "mm") -> 67
export function mmToInches(v: Mm): number;
// lib/geometry/measure-display.ts
export function formatMark(value: Mm, system: UnitsSystem): string;   // Imperial formatInchesFraction ('1 3/16"'), Metric `${whole} mm`
// lib/geometry/fins.ts
export function computeFinPlacement(spec: FinPlacementSpec, importedTail?: ImportedFinTail | null): FinPlacementResult;
//   result.sections[].groups[].rows[] = { label, value: Mm, family: MeasureFamily }; groups[].fullSpread: Mm | null
//   result.notes: string[]   (model notes; after Task 1 the rounding line is no longer among them)
// lib/geometry/fins.test.ts already defines goldenEntries and toSpec(fixture.state) (see its first describe)
// components/units-provider.tsx
export function useUnits(): { system: UnitsSystem; ... };
```

New in Task 1 (lib/geometry/fins.ts):

```ts
export function finRoundingGrain(system: UnitsSystem): string; // imperial: 1/16" (with the inch mark), metric: millimetre
export function finRoundingNote(system: UnitsSystem): string;  // `All measurements round to the nearest ${grain} — expect a hair of play when routing to these numbers.`
```

Page-2 DOM facts case D relies on (from components/summary/order-form.tsx; verified at plan time):
- `[data-order-form-sheet]` #0 is page 1 and #1 is page 2. Each Sheet's LAST child is its PageMark, which
  carries `order-form-micro`.
- `[data-rail-bands-row]`'s parent is the Shaping Data column. The column's children are the rail row, the
  Fin Placement FormBox, and Shaper Use Only (the column's last child).
- Page 2's `[data-print-unfold]` #0 is the compact rail table and #1 the fin grid. The fin grid's
  parentElement is the Fin Placement FormBox body (`gap-1 overflow-hidden p-2`). The notes container is that
  body's second child; Task 1 gives it `data-fin-notes`.
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: The fin notes' rounding line says what each system prints (L-5)</name>
  <files>lib/geometry/fins.ts, lib/geometry/fins.test.ts, components/summary/order-form.tsx, components/fins/fin-model-info.tsx</files>
  <read_first>lib/geometry/fins.ts lines 1055-1180 (the notes block, the result's notes field, computeFinPlacement), lib/geometry/fins.test.ts lines 1-100 and 440-570, components/summary/order-form.tsx lines 80-120 and 760-845, components/fins/fin-model-info.tsx</read_first>
  <behavior>
    - finRoundingNote("imperial") equals exactly: All measurements round to the nearest 1/16" — expect a hair of play when routing to these numbers.  (em dash U+2014, straight inch mark)
    - finRoundingNote("metric") equals exactly: All measurements round to the nearest millimetre — expect a hair of play when routing to these numbers.
    - finRoundingGrain("imperial") is 1/16" (with the inch mark); finRoundingGrain("metric") is millimetre. Neither wording contains "cm".
    - For every golden fixture (goldenEntries, toSpec), computeFinPlacement(spec).notes contains no line matching /round to the nearest/ and no line matching /0\.1 cm/.
    - The wording is true of the printed numbers. For every golden fixture:
      - every fin section row whose family is "mark", plus every non-null fullSpread, formats with formatMark(v, "metric") to a string that parseMetric(s, "mm") reads back as a whole number (Number.isInteger after rounding to 1e-9);
      - the same value formats with formatMark(v, "imperial") to a string whose parseImperial value, in inches (mmToInches), times 16 is a whole number within 1e-9;
      - the test also asserts it checked more than 20 values in total, so it cannot pass empty.
  </behavior>
  <action>
RED first:
1. In lib/geometry/fins.test.ts add a describe block titled
   `finRoundingNote — the fin notes' rounding line in the shaper's own units (quick 260928-vpi)`, covering
   every bullet in <behavior>.
2. Reuse the file's own goldenEntries and toSpec, and import parseImperial and parseMetric from ./units.
   Hand-type no expected number: the whole-number checks read the app's own formatter output back through
   the app's own parsers.
3. Run `npx vitest run lib/geometry/fins.test.ts` and see it fail (the functions don't exist yet).

GREEN, in lib/geometry/fins.ts:
1. Add the two exported pure functions from <interfaces>. finRoundingNote builds its sentence from
   finRoundingGrain.
2. Give each a doc comment in plain English:
   - the sentence is the prototype's own closing note (reference/project/Fins.dc.html line 1286), worded
     per system;
   - Imperial fin numbers print to the sixteenth (formatMark via formatInchesFraction) and Metric fin numbers
     print to the whole millimetre (formatMark via the whole-mm formatter, CLAUDE.md Rule 2's marks family);
   - the prototype's bracketed centimetre aside was never true of either printed system.
3. Remove the final push of that rounding sentence onto notesItems (currently the line after the pintail
   note). Nothing else in the notes block changes.
4. Update the block's opening comment ("Ported verbatim from notesItems ...") to say the prototype's closing
   rounding line is no longer in this list: this function never sees the shaper's system, so the display
   layer appends finRoundingNote(system).
5. Do not quote the old centimetre aside anywhere in the code or comments. The gate below searches for it.
6. No React, browser or database import (CLAUDE.md Rule 1).

In components/summary/order-form.tsx:
1. Add finRoundingNote to the existing import from "@/lib/geometry/fins".
2. Build the rendered notes as finPlacement.notes followed by finRoundingNote(system). There is always at
   least one note now, so the length guard can go.
3. Add a `data-fin-notes` attribute to the notes container div (the flex-none border-t div). Keep its
   classes.
4. Update the comment above it in one sentence: the last line is worded per system here, because the
   geometry doesn't know the shaper's units.

In components/fins/fin-model-info.tsx:
1. Add "use client" at the top, since it now reads a hook.
2. Import useUnits from "@/components/units-provider" and finRoundingGrain from "@/lib/geometry/fins".
3. Read `system` in FinModelInfo.
4. In the Convention paragraph, replace the sentence's ending (the sixteenth-inch figure followed by its
   bracketed centimetre aside) so it reads "rounded to the nearest {finRoundingGrain(system)}." with no
   bracketed aside.
5. Add one sentence to the file's head comment: this is the one departure from the verbatim prototype copy,
   so the rounding claim matches the numbers FINS prints in each system (Phase 13 item 8b).
6. Nothing else in the file changes.

Then run `npm test`, `npm run lint -- --max-warnings 0` and `npx tsc --noEmit`. Record the `npm test` count
before and after.

Commit with explicit paths (the four files):
- Subject: `fix(fins): the fin notes' last line says the numbers round to the nearest 1/16" or the nearest millimetre, whichever the shaper reads (quick 260928-vpi)`
- Body, in plain English:
  - on the Metric sheet the line used to promise sixteenths and a centimetre figure while every fin number
    printed in whole millimetres;
  - the FINS MODEL INFO tab says the same now;
  - no fin number changes.
- End the message with the line: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && npx vitest run lib/geometry/fins.test.ts && npm test && npm run lint -- --max-warnings 0 && npx tsc --noEmit && grep -q "export function finRoundingNote" lib/geometry/fins.ts && grep -q "export function finRoundingGrain" lib/geometry/fins.ts && test -z "$(grep -n '0\.1 cm' lib/geometry/fins.ts components/fins/fin-model-info.tsx components/summary/order-form.tsx)" && grep -q "finRoundingNote(system)" components/summary/order-form.tsx && grep -q "data-fin-notes" components/summary/order-form.tsx && grep -q "finRoundingGrain(system)" components/fins/fin-model-info.tsx && test -z "$(grep -E '^import' lib/geometry/fins.ts | grep -E 'react|next/|@/components|lib/db')" && test -z "$(git diff --name-only HEAD~1 -- lib/geometry/__fixtures__ scripts lib/models lib/db db)"</automated>
  </verify>
  <done>Both wordings are pinned by unit tests and tied to the printed fin numbers across every golden fixture. computeFinPlacement's notes no longer carry the rounding line. The order form appends finRoundingNote(system) under `data-fin-notes`. MODEL INFO reads the grain per system. Fixtures, scripts and stored data are untouched. The suite, lint and tsc are green, and one commit is made.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Case D proves the fit at every phone width, and fails on today's page 2 (RED)</name>
  <files>e2e/summary-planing.spec.ts</files>
  <read_first>e2e/summary-planing.spec.ts (all of it: the header comment, measureAndWrite, assertMeasurement, case D), e2e/summary-print-touch-box.spec.ts lines 36-65 (EXPECTED_TOUCH_RATIO and its comment)</read_first>
  <precondition>Port 3120 is free (`lsof -iTCP:3120 -sTCP:LISTEN` prints nothing; playwright.config.ts reuses any server already on the port), and no `next dev` whose working directory is /Users/kontoes/Code/shaper is running (Next 16 refuses a second one). If either is busy, stop and report. Never kill another project's server.</precondition>
  <behavior>
    - Case D measures the computer print and then, with the touch sheet forced, every width in FIT_WIDTHS = [560, 618, 680, 733, 760, 800, 812, 900]. It logs every report line BEFORE asserting anything, so a failing run shows every width.
    - At EVERY width, touch and computer alike, both systems (560 included; the old 560 exemption goes):
      - rail row heights spread ≤ 0.5 and header cell heights spread ≤ 0.5;
      - the Rail Bands and PLANING header text tops are level within 0.5, and the caption bottoms are level within 0.5 (already asserted);
      - rail content ≤ rail box + 0.5 and fin content ≤ fin box + 0.5;
      - the fin notes' bottom ≤ the Fin Placement body's content-box bottom + 0.5;
      - Shaper Use Only's bottom ≤ the Shaping Data column's bottom + 0.5, and ≤ page 2's PageMark top + 0.5;
      - plus every existing assertion (PLANING left of Rail Bands, no planing clip, no rail cell overflow, no sheet overflow).
    - Non-vacuity guards:
      - (a) at every touch width the root's clientWidth is within 1 of the width and page 2's sheet clientHeight/clientWidth is within 0.001 of EXPECTED_TOUCH_RATIO (1.294118, copied from summary-print-touch-box.spec.ts with its comment), so the phone sheet really was in effect;
      - (b) at every touch width page 1's PageMark font-size is ≥ 11.99 (page 1's own 12 px floor holds), and at 560, 618 and 680 page 2's PageMark font-size is < 12 (page 2's fit reached it and page 1's didn't);
      - (c) on the computer print the first rail row's font-size is within 0.01 of 1.75 × root clientWidth / 100 (the reference sheet's own 1.75cqw row token, unchanged on a computer print), and the root clientWidth is within 1 of EXPECTED_SHEET_WIDTH_DOTS.
    - A new test per system, on every project: open /design/summary (default board). `[data-fin-notes] > div` has at least one line, its LAST line's text equals finRoundingNote(system) imported from ../lib/geometry/fins, and exactly one line starts with "All measurements round".
  </behavior>
  <action>
Rework case D and assertMeasurement in e2e/summary-planing.spec.ts. Keep every existing helper and its
comments. Follow the repo convention that a spec carries its own copies.

**measureAndWrite (runs in the page, self-contained).** Extend PlaningMeasurement and the function with
these fields, each with a one-line doc comment. Use clientWidth/clientHeight rather than bounding rects
wherever a width or a ratio is read.

| field | what it reads |
|---|---|
| rootWidth | `[data-order-form-root]`'s clientWidth |
| sheetRatio | page 2 sheet's clientHeight / clientWidth |
| finNotesOverflow | `[data-fin-notes]`'s bounding bottom minus (the fin body's bounding bottom minus its computed paddingBottom). The fin body is finGrid.parentElement. |
| columnOverflow | shop box bottom minus column bottom. The column is railBandsRow.parentElement; the shop box is its lastElementChild. |
| shopToMark | page 2's lastElementChild top minus the shop box bottom |
| railRowFontPx | parseFloat of the first rail row's computed fontSize |
| page1MarkFontPx | the computed fontSize of sheets[0].lastElementChild |
| page2MarkFontPx | the computed fontSize of sheets[1].lastElementChild |

<!-- planner-discipline-allow: touch-560 -->
**assertMeasurement.**
1. Change `mode` to `"computer" | "touch"` and delete the `touch-560` branch.
2. Move the rail-row spread, header-cell spread and header-top checks out of the mode guard, so they run at
   every width.
3. Move the rail-content and fin-content checks out of the computer-only guard, so they run at every width.
4. Add the notes, column and footer checks, and guards (a)/(b)/(c) from <behavior>. Guard (b)'s "< 12" half
   applies only when the width is below 733.
5. Pass the width in so the guards can use it. Every message names the width, the system and the two
   numbers compared, like the existing messages.

**Case D.**
1. Add `const FIT_WIDTHS = [560, 618, 680, 733, 760, 800, 812, 900];` with a comment: the touch-box spec's
   SWEEP_WIDTHS plus 800, which is the coordinator's width list for item 8b.
2. Loop over FIT_WIDTHS instead of SWEEP_WIDTHS. Keep SWEEP_WIDTHS if another case uses it; delete it if
   nothing does.
3. Collect every width's result and report line first (console.log plus testInfo.attach, as today), then
   assert the computer result and each touch result.
4. Extend the report line with column overflow, shop-to-mark and railRowFontPx.

**Header comment.**
1. Replace the paragraph that hands the 560 assertion to item 8b. It now says quick 260928-vpi took it over:
   - one-line rail rows, level headers, rail and fin content inside their boxes, the notes inside Fin
     Placement, and Shaper Use Only clear of the footer are asserted at every phone width from 560 to 900
     and on the computer print, in both systems;
   - Letter and A4 are covered because the computer's printed box is the smaller of the two papers on each
     axis and the phone sheet's shape is Letter's whatever the paper, while case C and
     summary-print-touch-box.spec.ts print both papers.
2. Update case D's own comments to match.

**New test.** Add it inside the describe, per system, as specified in <behavior>. Import finRoundingNote
from "../lib/geometry/fins".

**RED run.** Case D is expected to fail against today's CSS. Run:

`PW_PORT=3120 npx playwright test e2e/summary-planing.spec.ts --project=desktop --reporter=list`

Copy the case D report lines into your notes for the SUMMARY. Expected failures, from
<plan_time_measurements> "AFTER Task 1 only":
- at 560: the rail rows wrap, and rail 415.0 (Imperial) / 433.0 (Metric) is taller than its 291.4 box;
- at 618 and 680 the rail is taller than its box;
- at 560, 618 and 680 the fin content (141.0 / 141.0 / 142.4) is taller than its box (70.1 / 96.1 / 141.5);
- at 733 and 760 the rail is taller than its box (427.0 in 413.0, 438.8 in 431.0);
- guard (b)'s "< 12" fails at 560–680, because page 2 still sits on its 12 px floor.

The computer print must PASS every assertion in this run: rail 427.1 in 438.9, fin 151.5 in 175.0, column 0.

**If a measurement contradicts the plan by more than 2 px:**
1. Stop and record both numbers.
2. Do not loosen a tolerance to make RED look right.
3. If the computer print fails, a guard is wrong. Fix the guard from real measured ranges, never by
   widening it past what the computer print measures.

The new wording test and cases A–C must pass.

Run `npm run lint -- --max-warnings 0` and `npx tsc --noEmit`.

Commit e2e/summary-planing.spec.ts alone:
- Subject: `test(summary): page 2 of a phone print checked at every width for rail marks and fin numbers that stay in their own boxes — fails until the fix lands (quick 260928-vpi)`
- Body: plain English about what the test checks, and which widths fail today and why.
- End the message with the line: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && npm run lint -- --max-warnings 0 && npx tsc --noEmit && grep -q "FIT_WIDTHS = \[560, 618, 680, 733, 760, 800, 812, 900\]" e2e/summary-planing.spec.ts && grep -q "data-fin-notes" e2e/summary-planing.spec.ts && grep -q "finRoundingNote" e2e/summary-planing.spec.ts && test -z "$(grep -n 'touch-560' e2e/summary-planing.spec.ts)" && grep -q "columnOverflow" e2e/summary-planing.spec.ts && npx playwright test --list e2e/summary-planing.spec.ts | grep -q "Total:"</automated>
  </verify>
  <done>Case D asserts the rail fit, the fin fit, the notes, footer clearance, one-line rows and level headers at every width from 560 to 900 and on the computer print, in both systems, with guards proving the phone sheet was in effect and page 1 was left alone. The desktop RED run shows the computer print passing and the listed phone widths failing, and the report lines are saved for the SUMMARY. The wording test passes. One commit is made.</done>
</task>

<task type="auto">
  <name>Task 3: Page 2 fits a phone sheet, and a computer print stays as approved (GREEN)</name>
  <files>app/design/summary/order-form.css, components/summary/order-form.tsx, components/rails/rail-data-table.tsx, components/summary/order-form-print.test.ts</files>
  <read_first>app/design/summary/order-form.css (all of it, especially lines 36-90, 181-199, 262-288 and 479-732), components/summary/order-form-print.test.ts (all of it), components/rails/rail-data-table.tsx lines 44-95, components/summary/order-form.tsx lines 630-770, the <exact_rules> and <decisions> sections of this plan</read_first>
  <precondition>Same as Task 2: port 3120 is free and no `next dev` from this checkout is running.</precondition>
  <action>
**1. app/design/summary/order-form.css.** Insert the two rules from <exact_rules> verbatim, at the position
stated there, inside `@media print`.

Above the fit rule, write a plain-English comment (house style, like its neighbours) that says:
- A phone's sheet is Letter-shaped (the rule just above), so at any width its page 2 is shorter for its width
  than a computer's: 948.6 against 990.5 dots at 733. Below 733 dots the old 12 px floor made the type
  relatively bigger still, and the fixed-pixel rules and padding don't shrink with the page.
- So on a phone sheet every page-2 type size follows one unit, `--order-form-ref-unit`, and no longer has the
  12 px floor. 0.94 of the sheet width is the shape ratio (0.958) less a hair for those fixed pixels, tuned so
  a phone sheet keeps at least the computer print's own share of spare room at every width. Below the
  design width the unit loses 0.003 px per dot. The design width is the computer box's own
  `min(8.5in, 8.27in) - 16mm`, pinned by order-form-print.test.ts.
- The measured result: a quad's rail marks and fin numbers fit their own boxes from 560 to 900 dots. The rail
  row type is 8.30 px at 560, 9.56 px at 618 (8.2 pt on the founder's iPhone paper) and 1.645 cqw from 733
  up (8.7 pt), against a computer's unchanged 9.6 pt.
- Why the rule keys on the phone sheet rather than a width: a 733-dot phone sheet and the computer's
  733.44-dot sheet are the same width and differ only in shape. It decides a type size, never a layout;
  page 2 is arranged the same at every width.
- The unit is deliberately not registered with `@property`, so `cqw` resolves where a font-size uses it.
- Quick 260928-vpi, Phase 13 item 8b.

Above the floor rule, comment that each of page 2's two table boxes (the rail row and Fin Placement) is at
least as tall as what it holds, so the page's spare room goes where the content is. On a computer print both
floors sit below the boxes' own shares and change nothing (measured identical).

Update comments that are now untrue, and nothing else:
- In the `.order-form-planing-col` comment, the "At 560 dots the two tables can no longer both fit ... item
  8b's" paragraph becomes: on a phone sheet page 2's type follows the fit unit, so at 560 the PLANING table's
  own minimum drops under its 28% share and every rail row stays one line.
- In the type-scale head comment's touch paragraph, add one sentence: page 2 on a phone sheet no longer uses
  these clamp floors (see the fit rule in the print block); page 1 still does.

**2. components/summary/order-form.tsx.** Add the class `order-form-content-floor` to exactly two elements:
- the `data-rail-bands-row` div's className;
- the Fin Placement FormBox's className, beside `min-h-0 min-w-0 flex-1`.

Extend the Shaping Data comment above the row with one sentence naming the floor and the phone-sheet fit rule
in order-form.css (item 8b).

**3. components/rails/rail-data-table.tsx.**
- In the compact variant only, change each group wrapper's className from `mb-1.5` to `mb-1.5 last:mb-0`.
  The last group's margin sits below the last row, inside the table's own box, and never shows; it only made
  the content floor 6 px taller.
- Update the compact comment's 560 sentence ("at the narrowest phone print (560 dots, type at its 12px
  floor)") to say that since item 8b a phone sheet's page-2 type follows the fit unit rather than the 12 px
  floor.
- The full (non-compact) variant is untouched.

**4. components/summary/order-form-print.test.ts.** Add three `it` cases inside the existing describe,
reusing the file's own helpers (readStripped, extractDeclarationValue, ruleDeclarations, parseCalcNumbers,
readPortraitPapersIn, readNumericConst, phoneSheetRuleBody):
1. **The phone sheet's page-2 fit rule redeclares every type size the reference sheet declares, none of them
   floored.**
   - Find the body of the first rule whose selector is exactly `[data-order-form-root] .order-form-sheet-reference {`
     and the body of the rule `[data-order-form-root][data-print-touch] .order-form-sheet-reference {`.
   - Every custom property declared in the first is declared in the second.
   - Each of those values contains `var(--order-form-ref-unit)` and no `clamp(`.
2. **The fit unit measures a phone sheet against the same printed width the computer's sheet is pinned to.**
   - parseCalcNumbers on the `--order-form-ref-unit` value.
   - Its two inch figures equal PORTRAIT_PAPER_IN's two widths, in any order.
   - Its mm figure equals 2 × PAGE_MARGIN_MM from use-print-fit.ts.
3. **The fit rule and the content floor apply only in print, after the phone sheet's own shape rule.**
   - Both rules' offsets are greater than the offset of `@media print {` and than phoneSheetRuleBody's index.
   - The body of `[data-order-form-root] .order-form-content-floor {` declares `min-height: min-content`.
   - components/summary/order-form.tsx contains `order-form-content-floor` exactly twice.

Do not change the existing "phone rules carry no absolute length" test or the two rules it checks. The new
fit rule is a separate rule, its lengths size type and never a box, and its comment says so.

**5. Run the gates.**
1. `npm test`, `npm run lint -- --max-warnings 0` and `npx tsc --noEmit`.
2. `PW_PORT=3120 npx playwright test e2e/summary-planing.spec.ts e2e/summary-print-touch-box.spec.ts e2e/summary-print-size.spec.ts --reporter=list`
   (all three projects). Case D must now pass at every width in both systems. Its report lines must match
   <plan_time_measurements>'s AFTER table within 1 px, or record the differences. The computer line must
   read rail 427.1 / 438.9 and fin 151.5 / 175.0 exactly as in the RED run.
3. If any assertion fails:
   - Do NOT change 0.94 or 0.003 on your own, and do not loosen a tolerance.
   - Record the measured numbers, check the rule text against <exact_rules> character for character, and
     report back.

**6. Commit** the four files with explicit paths:
- Subject: `fix(summary): page 2 printed from a phone keeps every rail mark and fin number in its own box, and a computer print is unchanged (quick 260928-vpi)`
- Body, in plain English:
  - page 2 from a phone printed its type as big as ever on a shorter sheet, so the rail marks ran into Fin
    Placement and a quad's fin numbers ran into their own notes;
  - now the page-2 type on a phone sheet shrinks just enough to fit: about 8.2 pt on the founder's iPhone,
    and 8.7 pt from a 733-dot page up;
  - each table's box is never shorter than what it holds;
  - nothing moves, and a computer print and page 1 are exactly as before.
- End the message with the line: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

Then write the SUMMARY (see <output>).
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && npx vitest run components/summary/order-form-print.test.ts && npm test && npm run lint -- --max-warnings 0 && npx tsc --noEmit && grep -q -- "--order-form-ref-unit: calc(0.94cqw - 0.003 \* max(0px, min(8.5in, 8.27in) - 16mm - 100cqw));" app/design/summary/order-form.css && grep -q "\[data-order-form-root\]\[data-print-touch\] .order-form-sheet-reference {" app/design/summary/order-form.css && grep -q "\[data-order-form-root\] .order-form-content-floor {" app/design/summary/order-form.css && test "$(grep -c 'order-form-content-floor' components/summary/order-form.tsx)" -eq 2 && grep -q "mb-1.5 last:mb-0" components/rails/rail-data-table.tsx && PW_PORT=3120 npx playwright test e2e/summary-planing.spec.ts e2e/summary-print-touch-box.spec.ts e2e/summary-print-size.spec.ts --reporter=list && test -z "$(git diff --name-only HEAD~3 -- lib/models lib/db db lib/geometry/__fixtures__)" && test "$(git log -3 --format=%s | grep -c '(quick 260928-vpi)$')" = "3"</automated>
  </verify>
  <done>On a phone sheet page 2's type follows the fit unit with no 12 px floor. Page 2's rail row and Fin Placement box are floored at their own content. Case D passes at every width from 560 to 900 and on the computer print, in both systems, and the computer print measures identical to the RED run. The touch-box and print-size specs are green on all three projects. The contract tests pin the rule. Three commits end `(quick 260928-vpi)`.</done>
</task>

</tasks>

<source_audit>
| Source | Item | Covered by |
|---|---|---|
| GOAL (13-SPEC 8b Done-when) | Rail markings and fin numbers each fit their own box, nothing overlapping, at every phone width 560–900 and on a computer print, both systems, Letter and A4, proven by a browser spec | Task 2 (spec), Task 3 (fix + GREEN run). Letter/A4 via the computer box (smaller of both papers) plus case C's PDFs and touch-box's page-count PDFs. The printed PDF is the coordinator's step. |
| GOAL | The fin notes' rounding line reads right in both systems | Task 1 |
| REQ | 13-SPEC-item-8b | Tasks 1–3 |
| CONTEXT | L-1 PLANING left of Rail Bands | Kept: no JSX order change; case D's existing left-of assertion now runs at 560 too |
| CONTEXT | L-2 PLANING table styling, 28% floored share, the rail marks' type size | Kept: no change to the table or its column. Its type follows the same `--summary-font-*` tokens as the rail marks on every sheet |
| CONTEXT | L-3 computer print and page 1 unchanged | Part B keyed to the phone sheet; Part A a measured no-op on the computer print; guards (b)/(c) in Task 2; the computer line identical between RED and GREEN |
| CONTEXT | L-4 three switches | Layout is identical at every width. Part B decides a type size on the existing phone-sheet key. Flagged in `<coordinator_confirm>` with the measured reason and the width-only fallback |
| CONTEXT | L-5 reword the fin notes' line | Task 1 (plus the same claim on MODEL INFO) |
| RESEARCH | none (quick task) | none |
</source_audit>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Shaper's own design state → printed sheet | Only the shaper's own board and their own Imperial/Metric choice are rendered. There is no new input, no network, no database and no third-party surface. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-vpi-01 | Tampering (a wrong or unreadable number on paper) | page 2 on a phone print | high | mitigate | Case D writes the widest rail strings and the widest PLANING strings any board can carry. At every width 560–900 and on the computer print, both systems, it asserts one-line rail rows, rail and fin content inside their boxes, notes inside Fin Placement, and Shaper Use Only clear of the footer. Guards prove the phone sheet was in effect. |
| T-vpi-02 | Tampering (the approved computer print drifts) | order-form.css print block | high | mitigate | Part B is scoped to `[data-print-touch]` and page 2's sheet. Part A is a measured no-op on the computer print. Guard (c) pins the computer rail row type to the unchanged 1.75cqw token. The computer report line must match between the RED and GREEN runs. |
| T-vpi-03 | Tampering (a misleading claim beside the fin numbers) | fin notes' rounding line | medium | mitigate | finRoundingNote's unit test reads every golden fixture's printed fin numbers back through the app's parsers: whole sixteenths in Imperial, whole millimetres in Metric. The e2e test checks the printed last line in both systems. |
| T-vpi-04 | Tampering (saved boards) | lib/models, lib/db, db/ | medium | mitigate | Display-only change. Task 3's gate requires no diff there, or under the golden fixtures. |
| T-vpi-05 | Denial of service (the phone print path breaks on real iOS) | new CSS on the touch path | medium | mitigate | No trig, no length division, no `zoom`/`transform`, no registered property. `max()`/`min()` with `cqw` are already in use on this sheet. Measured in WebKit at plan time (agrees within 0.7 px). The founder's paper check is the final proof. |
| T-vpi-SC | Tampering | package installs | low | accept | No package is installed. |
</threat_model>

<verification>
Executor:
- After every task: `npm test`, `npm run lint -- --max-warnings 0` and `npx tsc --noEmit` pass.
- Task 2's RED run: the computer print passes, and the phone widths fail as listed.
- Task 3's GREEN run: `PW_PORT=3120` summary-planing, summary-print-touch-box and summary-print-size pass on
  all three projects.
- Three commits, each ending `(quick 260928-vpi)`, with plain-English bodies and the Co-Authored-By line,
  staged with explicit paths.
- PLAN.md and SUMMARY.md stay uncommitted. STATE.md, ROADMAP.md, 13-SPEC.md and CLAUDE.md are untouched.
  Nothing is pushed.

Coordinator:
- `npm run test:e2e` (the desktop screenshot baselines must pass; none of them shows the Summary),
  `npm run test:e2e:prod` and `npm run build`.
- Headless PDFs before (159521f) and after, on Letter and A4, Imperial and Metric: the Shortboard preset,
  and a quad on a blank. Page 1 and page 2 must be identical except for the fin notes' last line, which now
  reads `nearest 1/16"` or `nearest millimetre` and fits one line.
- A forced-touch print at 618 dots for the founder's own check of page 2.
- Consider one sentence in CLAUDE.md's Layout or Rule 2 section recording that a phone sheet's page-2 type
  follows its own fit unit.
</verification>

<success_criteria>
- A shaper printing from a phone gets a page 2 where every rail mark sits on one line inside Rail Bands and
  every fin number sits inside Fin Placement above its notes, with Shaper Use Only clear of the footer, at
  every page width from 560 to 900 in either system.
- A computer print measures exactly as before, and page 1 is untouched everywhere.
- The fin notes' last line says "nearest 1/16"" on an Imperial sheet and "nearest millimetre" on a Metric
  one, and FINS' MODEL INFO says the same.
</success_criteria>

<output>
Create `.planning/quick/260928-vpi-phase-13-item-8b-page-2-on-a-phone-print/260928-vpi-SUMMARY.md` when
done. Leave it uncommitted, and write it in plain English for the founder:
- What was wrong on a phone print, and the three causes from `<root_cause>`, in shaper terms.
- What changed on paper:
  - the phone print's page-2 type, with the before/after point sizes from `<decisions>`;
  - the boxes sharing spare room;
  - the reworded fin line in both systems, and MODEL INFO.
- That a computer print and page 1 are unchanged, with the computer report line from the RED and GREEN runs.
- The RED and GREEN case D report lines, both systems, every width.
- The `npm test` count before and after each task.
- The three commit hashes.
- Anything that differed from `<plan_time_measurements>` by more than 1 px.
</output>
