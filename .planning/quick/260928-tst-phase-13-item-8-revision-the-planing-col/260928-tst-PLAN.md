---
phase: quick-260928-tst
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/planing.ts
  - lib/geometry/planing.test.ts
  - components/summary/order-form.tsx
  - app/design/summary/order-form.css
  - e2e/summary-planing.spec.ts
autonomous: true
requirements: [QT-260928-tst, 13-SPEC-item-8]

estimate:
  # Sequential on main, on top of item 8's commits (e7dd48d, f42cfe3, 8972620, bbd8176, f5e9559; not
  # pushed). Three tasks:
  # - Task 1 adds ~60 lines to lib/geometry/planing.ts and ~170 lines of vitest.
  # - Task 2 replaces ~30 lines of page-2 JSX in order-form.tsx (843 lines, the heaviest read) and
  #   edits one CSS rule and its comment.
  # - Task 3 reworks about 200 of e2e/summary-planing.spec.ts's 632 lines and deletes the old
  #   planingBox and its tests.
  # `npm test` (~3,330 tests) runs in every task; `npx playwright test --list` runs once (lists only).
  # estimate-calibration: factor 1, 0 samples, so confidence is low.
  tokens: 100000
  raw_tokens: 100000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "The founder, 2026-09-29, after seeing item 8's PDFs: 'Let's organize this like the rail dims. Deck and Bottom are headers. Font size should match the other dim text, and I'd like to add a #of passes for the deck too. There's room to make the column wider too if that helps the layout better.' The PLANING box on page 2 becomes a small TABLE beside the Rail Bands table. It has the same header-row style (extra-bold header text over a 2 px rule), the same row style (muted label, bold right-aligned value, 1 px rule under each row, the same padding) and the SAME type sizes, `--summary-font-label` for headers and `--summary-font-row` for rows, as the rail table beside it."
    - "The table's column headers are `Deck` and `Bottom`, and its two rows are `Foam Off` and `Passes`. With a blank picked, Foam Off reads the Deck Skin under Deck (`none` at zero, 4b's word) and the foam off the bottom at the center under Bottom. Passes reads the planer passes for the skin under Deck and for the centre gap under Bottom. Both counts come from the app's own `planerPasses` at the shaper's Planer Max Depth, so Bottom's count is exactly the number ROCKER's `Planer passes at the center` shows. The pass depth lives in the footnote under the table: `At the center, at 1/8\" a pass — your Planer Max Depth.`"
    - "With no blank picked the SAME table prints, with the rail table's own `—` in all four cells and the footnote `Pick a blank on ROCKER for the planing numbers.`, so page 2 has one layout either way."
    - "The column is wider: 28% of the Shaping Data column instead of 20% (193.6 px on a computer's Letter/A4 print, up from 138.3), with a floor of the table's own minimum width (`min-width: min-content`), so no planing number is ever cut off at any print size. On a computer print and at every phone print width from 618 to 900 dots, in both systems and with the widest strings any board can produce, every rail row stays one line and the rail table, the rail box and the Fin Placement box are exactly as tall as after item 8. A quad's fin numbers still clear Shaper Use Only on a computer print (4.2 px, unchanged)."
    - "At the narrowest phone print (560 dots) the two tables cannot sit side by side: the rail table's minimum is 399 px and the PLANING table's 165 px, 568 px in all against 518. So there the rail labels wrap: rail content 400 → 415 px Imperial / 433 px Metric in a 291 px box that the rail table already overflowed. This is handed to item 8b with the numbers and the levers in <for_item_8b>. The browser spec checks the rail rows at 618–900 and on a computer print, and logs 560."
    - "Every string comes from ONE pure, tested function, `planingTable` in `lib/geometry/planing.ts`, reading only `blank.cut.deckSkin` and `blank.centerGap` through `formatMark`/`planerPasses` (measure-display.ts) and `formatDeckSkin` (blank-reasons.ts), with ROCKER's -0\" guard on the Bottom depth. The Deck values equal the DATASHEET's own FOAM OFF Deck cell at Center (`foamOffDeck.center`), and a unit test pins that. There is no second formula and no conversion factor (CLAUDE.md Rules 1 and 2)."
    - "Page 1 is unchanged, and so is the rail table's own file (components/rails/rail-data-table.tsx). Nothing stored changes: no file under lib/models, lib/db or db/ is touched."
    - "`npm run lint -- --max-warnings 0` exits 0, `npx tsc --noEmit` exits 0, and `npm test` shows 0 failed after every task."
  artifacts:
    - path: lib/geometry/planing.ts
      provides: "planingTable(profile, planerMaxDepth, system): headers, the Foam Off and Passes rows, and the footnote, with and without a blank (planingBox removed in Task 3)"
      contains: "export function planingTable"
    - path: lib/geometry/planing.test.ts
      provides: "Both systems, blank/no blank, none / 1 / many passes on each column, the -0\" and negative-depth edges, and a real Marko Foam blank profile against the DATASHEET's own FOAM OFF cells"
      contains: "describe(\"planingTable"
    - path: components/summary/order-form.tsx
      provides: "Page 2's PLANING box as a real <table> styled like the rail table beside it"
      contains: "data-planing-table"
    - path: app/design/summary/order-form.css
      provides: "--order-form-planing: 0.28 and .order-form-planing-col with min-width: min-content"
      contains: "min-width: min-content;"
    - path: e2e/summary-planing.spec.ts
      provides: "The PLANING table checked against ROCKER in both systems, Letter/A4 PDFs, and the widest strings at the computer print and all seven phone widths"
      contains: "data-planing-cell"
  key_links:
    - from: components/summary/order-form.tsx
      to: lib/geometry/planing.ts
      via: "the store's one side profile and the shaper's Planer Max Depth from useFitDefaults()"
      pattern: "planingTable\\(sideProfile, defaults\\.planerMaxDepth, system\\)"
    - from: lib/geometry/planing.ts
      to: lib/geometry/measure-display.ts
      via: "planerPasses for BOTH columns: the skin for Deck, the centre gap for Bottom"
      pattern: "planerPasses\\(blank\\.cut\\.deckSkin, planerMaxDepth, system\\)"
    - from: components/summary/order-form.tsx
      to: components/rails/rail-data-table.tsx
      via: "the same --summary-font-label / --summary-font-row sizes and the same rule classes, so the two tables read as one type scale"
      pattern: "var\\(--summary-font-row, 11px\\)"
---

<objective>
Quick 260928-tst, a revision of Phase 13 item 8 (quick 260928-r9h, committed on main and not pushed). The
founder saw the printed page 2 and asked for the PLANING column to be organised like the rail markings
beside it:
- Deck and Bottom as column headers;
- the same type size as the rail numbers;
- a planer-pass count for the deck as well as the bottom;
- a wider column if that helps.

Purpose: a shaper reads the foam off and the passes for both faces of the blank in the same shape and at the
same size as the rail marks they sit beside.

Output:
- `planingTable` in lib/geometry/planing.ts, replacing `planingBox`;
- page 2's PLANING box as a small table;
- the column widened from 20% to 28%, with a min-content floor;
- the browser spec reworked;
- a measured hand-off to item 8b for the 560-dot phone print.
</objective>

<decisions>
Each decision the coordinator asked this plan to make, with its reason:

1. **Zero skin: `none` under Foam Off and `0` under Passes, not a dash.** `0` is a true answer (plane nothing
   off the deck), and the Bottom column follows the same rule (a zero centre gap reads `0"` and `0`). The
   rail table's `—` means "no number here at all", and this table keeps it for the no-blank case, which
   really has no number.
2. **The pass depth lives in the footnote under the table:** `At the center, at 1/8" a pass — your Planer Max
   Depth.` It is ROCKER's own hint wording, extended with "At the center", which is true for BOTH columns:
   the Deck value is the deck skin, identical to the DATASHEET's FOAM OFF Deck cell at Center, and the Bottom
   value is the centre gap. The other places don't work:
   - the caption line's right side truncates on a narrow page;
   - putting the depth in a row label or an extra row costs exactly the width the rail markings need.
   A footnote wraps freely and never widens the table.
3. **Passes print as bare whole numbers (`3`), with the row labelled `Passes`.** This is the rail table's own
   idiom, a label plus a bare value. formatPasses' wording ("3 passes") would repeat the row label and adds
   about 45 px per cell, which the column does not have on a phone print. The count is planerPasses', the
   same number ROCKER's "3 passes" shows.
4. **Row labels are `Foam Off` and `Passes`.** `Foam Off` is the DATASHEET's own group name; `Passes` sits
   under the PLANING caption. `Planer Passes` was measured and needs about 40 px more than 618 dots allows.
5. **Units.** In Imperial every value carries its inch mark, as the rail table's do. In Metric the Foam Off
   cells carry ` mm` on each value (`3 mm`, `10 mm`) rather than bare numbers under a `(mm)` header.
   Each column here mixes a depth row with a count row, so a unit in the column header would sit over the
   pass counts too. A per-value unit keeps each number self-describing (CLAUDE.md Rule 2's boxed-value rule).
6. **No blank: the same table with `—` in all four cells**, and the footnote
   `Pick a blank on ROCKER for the planing numbers.`. The table is the same size and position with or
   without a blank (one layout), the dashes are the rail table's own "nothing here", and the footnote says
   why.
7. **Width: 28% of the Shaping Data column, floored at the table's own minimum width.**
   - On a computer print the table needs about 25%, and the rail markings stay one line up to 38%, so 28%
     gives the table air: 193.6 px, with value columns sized to their widest content and the label column
     taking the rest.
   - At 618 dots, the founder's own phone page, 28% is 161.3 px, but the table's floor takes it to 165 px.
     The rail markings stay one line up to 172.8 px there, which leaves 7.7 px of margin.
   - The floor guarantees a planing number is never clipped at any width. Where the page is too narrow for
     both (560), the rail labels wrap instead: 8b's to fix, see <for_item_8b>.
</decisions>

<printed_table>
Every new printed string, exactly. The caption `Planing` is unchanged and prints in capitals.

Examples use skin 1/8", centre gap 3/8" and Planer Max Depth 1/8", unless a column says otherwise.

| | Imperial | Metric | No blank (both) |
|---|---|---|---|
| Header row | `Deck` · `Bottom` | `Deck` · `Bottom` | `Deck` · `Bottom` |
| Foam Off row | `1/8"` · `3/8"` | `3 mm` · `10 mm` | `—` · `—` |
| Passes row | `1` · `3` | `1` · `4` | `—` · `—` |
| Footnote | `At the center, at 1/8" a pass — your Planer Max Depth.` | `At the center, at 3 mm a pass — your Planer Max Depth.` | `Pick a blank on ROCKER for the planing numbers.` |

Metric's Bottom count is 4: 10 printed mm over 3 printed mm rounds up. That is planerPasses' documented
printed-number rule, the same as ROCKER.

The edges (Deck | Bottom):
- **None.** Skin 0, gap 3/8" at 1/8": Foam Off `none` · `3/8"`, Passes `0` · `3`. Metric: `none` · `10 mm`, `0` · `4`.
- **One pass.** Skin 1/8" at 1/8": Deck Passes `1`. Metric: skin 3 mm at 3 mm, Deck Passes `1`.
- **Many passes.** Skin 1" and gap 1 3/16" at 1/16": Foam Off `1"` · `1 3/16"`, Passes `16` · `19`.
  Metric: skin 25.4 mm (prints 25) and gap 30 mm at 2 mm: `25 mm` · `30 mm`, `13` · `15`.
- **Prints as zero.** Gap mm(-0.3): Bottom `0"` (never `-0"`) / `0 mm`, Bottom Passes `0`.
- **Below zero.** Gap -1/16": Bottom `-1/16"` / `-2 mm`, Bottom Passes `0`.

The row labels are `Foam Off` and `Passes` in both systems, and the column headers `Deck` and `Bottom`.
</printed_table>

<plan_time_measurements>
Measured 2026-09-29 on main at f5e9559 (item 8 in place) through a headless Chromium print render. The
planned table was built in place: a real `<table>`, headers at `--summary-font-label` and rows at
`--summary-font-row`, 1.5 (6 px) of left padding on value cells, `px-1 py-2` body, labels on one line, and
the box at 28% with `min-width: min-content`. The widest strings any board can produce were written into
every cell:
- rail cells: `Hard Edge`;
- PLANING, Imperial: `13/16"`, `-4 13/16"`, `88`, `88`;
- PLANING, Metric: `25 mm`, `-152 mm`, `70`, `70`.
Imperial and Metric gave the same geometry except where noted.

| print size | PLANING width | rail rows one line? | rail content / rail box | fin box | rail ceiling for PLANING |
|---|---|---|---|---|---|
| computer (Letter/A4 box) | 193.6 | yes | 427.09 / 438.86 | 213.42 | 38% |
| touch 560 | 165.1 (I) / 164.5 (M), its floor | NO, rows 35 px | 415 (I) / 433 (M) / 291.36 | 124.09 | 22%, below the table's floor |
| touch 618 | 165.1 / 164.5 (floor; 28% = 161.3) | yes | 400 / 332.97 | 150.09 | 30% (172.8 px), 7.7 px margin |
| touch 680 | 178.6 | yes | 405.5 / 376.81 | 177.52 | 36.5% |
| touch 733 | 193.5 | yes | 426.97 / 413.03 | 197.30 | 38% |
| touch 760 | 201.0 | yes | 438.77 / 431.05 | 206.94 | 38% |
| touch 812 | 215.6 | yes | 461.75 / 465.81 | 225.50 | 39% |
| touch 900 | 240.2 | yes | 500.88 / 524.50 | 256.80 | 40% |

- Every rail content, rail box and fin box figure above equals item 8's own after-measurement, except rail
  content at 560. The row share is unchanged, so the box heights cannot move.
- The table's own need, without the floor: about 25% on a computer print, 26.5% at 680, 29.5% at 618, and
  33% at 560.
- The header text of `Deck`/`Bottom` sits at exactly the same height as `Nose`/`Center`/`Tail` (0.0 px), and
  the two header rules are within 1 px (the table's collapsed 2 px border sits half a pixel lower).
- The first probe of this design used the rail table's own flex ratios (label 1.75 : 1 : 1) and needed
  36%+. That is why this plan uses a real `<table>`, whose value columns size to their widest content.
</plan_time_measurements>

<for_item_8b>
What item 8b (page 2 on a phone print, next) should take into account:
- At 560 dots the rail table and the PLANING table cannot sit side by side.
  - The rail table's minimum is 399 px: `Tapered Rail Thickness` needs 131.5 px, and Metric's `Center (mm)`
    header needs 74.8 px per value column, at the 12px type floor.
  - The PLANING table's minimum is about 165 px.
  - 399 + 4 + 165 = 568 px, against a 518 px Shaping Data column: 50 px short.
- After this task the rail labels wrap at 560, taking rail content from 400 to 415 px (Imperial) and 433 px
  (Metric) in its 291 px box. Before this task they did not wrap, because the 20% column was stacked label
  over value.
- Levers, measured or derived here:
  - Stack PLANING under Rail Bands on a narrow sheet (the order-form root is already an `@container`). This
    costs about 110 px of page-2 height on a phone print.
  - Move the Metric `(mm)` out of the three rail column headers (for example into the Rail Bands caption
    note) and raise the rail label share to about 2.2. The rail minimum then falls to about 355 px, set by
    `Hard Edge` at 60.5 px: 524 px in all, still about 6 px short at 560, comfortable at 618.
  - 8b's own core problem is unchanged: the rail table is taller than its box at every phone width at or
    under 733 (427 in 413 at 733, 400 in 333 at 618, 400 in 292 at 560).
- The browser spec this task leaves, e2e/summary-planing.spec.ts case D, logs 560 and does not assert the rail
  rows there. 8b's spec should take that assertion over.
</for_item_8b>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@lib/geometry/planing.ts
@lib/geometry/planing.test.ts
@components/rails/rail-data-table.tsx
@components/summary/order-form.tsx
@e2e/summary-planing.spec.ts
</context>

<interfaces>
Existing, used as-is:

```ts
// lib/geometry/measure-display.ts
export function formatMark(value: Mm, system: UnitsSystem): string;        // `3/8"` | `10 mm`
export function planerPasses(depth: Mm, passDepth: Mm, system: UnitsSystem): number; // from PRINTED numbers
// lib/geometry/blank-reasons.ts
export function formatDeckSkin(skin: Mm, system: UnitsSystem): string;       // `none` when it prints as zero, else formatMark
// lib/geometry/units.ts
export function parseImperial(input: string): Mm | null;                     // parseImperial('1/8"') -> 3.175
export function parseMetric(input: string, fieldUnit: "cm" | "mm"): Mm | null; // parseMetric("3 mm", "mm") -> 3
// lib/geometry/board-profile.ts: BlankSideView { cut: BlankCut; centerGap: Mm; foamOffDeck / foamOffBottom: Record<FoilStationKey, Mm> }
// lib/geometry/planing.ts (item 8, stays until Task 3): PlaningInput, unsignedZeroMark (private), planingBox
// components/rails/rail-data-table.tsx compact variant (the style to match):
//   header row: className "mb-1 flex gap-2 border-b-2 border-surf-line-faint pb-1", style fontSize var(--summary-font-label, 12px); header cells "text-right font-extrabold text-surf-ink"
//   body rows:  className "flex gap-2 border-b border-surf-line-faint py-0.5 leading-tight", style fontSize var(--summary-font-row, 11px); label "text-surf-ink-muted"; value "text-right font-bold whitespace-nowrap text-surf-ink"; a missing value prints "—" (U+2014)
```

New in Task 1 (lib/geometry/planing.ts; `PlaningInput` is kept as is):

```ts
export interface PlaningRow { label: string; deck: string; bottom: string }
export interface PlaningTable {
  headers: { deck: string; bottom: string }; // "Deck", "Bottom"
  rows: PlaningRow[];                         // always two: Foam Off, Passes
  footnote: string;
}
export function planingTable(profile: PlaningInput, planerMaxDepth: Mm, system: UnitsSystem): PlaningTable;
```
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: The planing numbers as a Deck/Bottom table, with a pass count for the deck</name>
  <files>lib/geometry/planing.ts, lib/geometry/planing.test.ts</files>
  <behavior>
    All expectations below are the literal strings in `<printed_table>`, except the wired cases, which compute theirs through the named helpers and never type a value.
    - No blank, both systems, depth inchesToMm(1/8): headers {deck "Deck", bottom "Bottom"}; rows exactly [{Foam Off, —, —}, {Passes, —, —}] (the U+2014 em dash); footnote `Pick a blank on ROCKER for the planing numbers.`.
    - Blank, Imperial: skin inchesToMm(1/8), gap inchesToMm(3/8), depth inchesToMm(1/8). Rows exactly [{Foam Off, `1/8"`, `3/8"`}, {Passes, `1`, `3`}]; footnote `At the center, at 1/8" a pass — your Planer Max Depth.`.
    - The same, Metric: [{Foam Off, `3 mm`, `10 mm`}, {Passes, `1`, `4`}]; footnote `At the center, at 3 mm a pass — your Planer Max Depth.`.
    - Zero skin, both systems (skin mm(0), gap 3/8", depth 1/8"): Foam Off deck `none`, Passes deck `0`.
    - Many passes, Imperial: skin inchesToMm(1), gap inchesToMm(19/16), depth inchesToMm(1/16) give Foam Off `1"` · `1 3/16"` and Passes `16` · `19`. Metric: skin inchesToMm(1), gap mm(30), depth mm(2) give `25 mm` · `30 mm`, `13` · `15`.
    - One pass on the deck in Metric: skin mm(3), depth mm(3) gives Passes deck `1`.
    - Gap mm(-0.3): Bottom `0"` / `0 mm` (never `-0"`), Bottom Passes `0`.
    - Gap inchesToMm(-1/16): Bottom `-1/16"` / `-2 mm`, Bottom Passes `0`.
    - Wired to a real blank, both systems. Use the Marko Foam 6'0" M-Regular profile exactly as the existing file's wired case builds it (readSeedCatalog, prepareBlank, board-profile.test.ts's boardInput, placement mm(0)), with depth inchesToMm(1/8). Guard non-vacuity with `view.cut.deckSkin > 0` and `view.centerGap > 0`. Then:
      - Foam Off deck equals formatDeckSkin(view.cut.deckSkin) AND formatMark(view.foamOffDeck.center): the DATASHEET's FOAM OFF Deck cell at Center;
      - Foam Off bottom equals formatMark(view.centerGap) AND formatMark(view.foamOffBottom.center);
      - Passes deck equals String(planerPasses(view.cut.deckSkin, depth, system)), which also equals String(planerPasses(view.foamOffDeck.center, depth, system));
      - Passes bottom equals String(planerPasses(view.centerGap, depth, system));
      - the footnote is `At the center, at ${formatMark(depth, system)} a pass — your Planer Max Depth.`
    - Wired to the hand-set profile `buildFallbackProfile(DEFAULT_FALLBACK_ROCKER, DEFAULT_FOIL_SPEC, inchesToMm(70))`: the no-blank table.
  </behavior>
  <action>
Per `<decisions>` and `<printed_table>`. This task only ADDS `planingTable`. `planingBox` and its describe block stay until Task 3, so order-form.tsx and the e2e spec keep compiling at every commit.

RED: in lib/geometry/planing.test.ts, add a second `describe("planingTable — the order form's PLANING table (quick 260928-tst)")` covering every bullet in `<behavior>`, reusing the file's existing findBlank/boardInput helpers and SYSTEMS constant. Run `npx vitest run lib/geometry/planing.test.ts` and confirm the new block fails because `planingTable` does not exist.

GREEN: in lib/geometry/planing.ts, keep `PlaningInput` and the private `unsignedZeroMark`, and add the `PlaningRow`/`PlaningTable` interfaces and `planingTable` exactly as in `<interfaces>`:
- Private constants: headers {deck "Deck", bottom "Bottom"}, the labels "Foam Off" and "Passes", the no-data cell "—" (U+2014, the same character rail-data-table.tsx prints), and the existing NO_BLANK_LINE.
- No blank: both rows with "—" cells, and the footnote NO_BLANK_LINE.
- With a blank:
  - Foam Off: deck = formatDeckSkin(blank.cut.deckSkin, system), bottom = unsignedZeroMark(blank.centerGap, system).
  - Passes: deck = String(planerPasses(blank.cut.deckSkin, planerMaxDepth, system)), bottom = String(planerPasses(blank.centerGap, planerMaxDepth, system)).
  - footnote = "At the center, at " + formatMark(planerMaxDepth, system) + " a pass — your Planer Max Depth."
- Doc comment on `planingTable`, in plain English:
  - the founder's 2026-09-29 words;
  - that it is laid out like the rail markings beside it;
  - decisions 1–6 from `<decisions>`, one line each: zero = `0`, not a dash; the depth in the footnote; bare counts; the labels; per-value units in Metric; dashes with no blank;
  - that the Deck value is the deck skin, identical to the DATASHEET's FOAM OFF Deck cell at Center, which is why "At the center" covers both columns;
  - that no factor or formula lives here.
- Update the module header comment's first paragraph to mention the rework (quick 260928-tst) in one sentence.

Run the file until green, then `npm run lint -- --max-warnings 0`, `npx tsc --noEmit` and `npm test`. Note the passed count.

Commit with explicit paths (the two files; check `git diff --cached --name-only`; `git commit -F <message file in the scratchpad>`). Subject: `feat(summary): the planing numbers as a Deck/Bottom table, with a pass count for the deck (quick 260928-tst)`. The body, in plain English, says:
- As the founder asked after seeing the printed sheet, the planing numbers are now worded as a small table like the rail markings: Deck and Bottom across the top, then how much foam comes off each, then how many planer passes each takes at your Planer Max Depth. The deck now gets its own pass count too.
- The bottom's count is the same number ROCKER shows. The deck's is worked the same way from the Deck Skin.
- A skin of none reads 0 passes.
- With no blank, the table shows dashes and says to pick a blank.
- Nothing on paper changes yet.
End with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && npx vitest run lib/geometry/planing.test.ts && npm run lint -- --max-warnings 0 && npx tsc --noEmit && npm test && grep -q "export function planingTable" lib/geometry/planing.ts && grep -q "planerPasses(blank.cut.deckSkin, planerMaxDepth, system)" lib/geometry/planing.ts && grep -q "planerPasses(blank.centerGap, planerMaxDepth, system)" lib/geometry/planing.ts && test -z "$(grep -E "^import" lib/geometry/planing.ts | grep -E "react|next/|@/components|lib/db")"</automated>
  </verify>
  <done>The new describe block passes every behaviour bullet in both systems: blank and no blank; none, 1 and many passes on each column; the -0" and negative edges; the real Marko profile against the DATASHEET's FOAM OFF cells; and the hand-set profile. Lint shows 0 warnings, tsc is clean and `npm test` shows 0 failed. One commit holds exactly the two files.</done>
</task>

<task type="auto">
  <name>Task 2: Page 2's PLANING box becomes the table, 28% wide, never narrower than its numbers</name>
  <files>components/summary/order-form.tsx, app/design/summary/order-form.css</files>
  <action>
Per `<decisions>` 7 and `<printed_table>`. Page 1 and components/rails/rail-data-table.tsx are NOT touched. The sheet is drawn at its design width and scaled, so no width, pointer or height media query is added (CLAUDE.md's three switches).

1. app/design/summary/order-form.css:
   - change `--order-form-planing: 0.2;` to `--order-form-planing: 0.28;`, and update its trailing comment to "page 2's PLANING table, as a share of the Shaping Data column";
   - in `[data-order-form-root] .order-form-planing-col`, keep `flex: none;` and the `width: calc(...)` line, and add `min-width: min-content;`.
   - Rewrite the comment above that rule in plain English, with the measured numbers from `<plan_time_measurements>`:
     - 28% is 193.6 px on a computer print, where the table needs about 25% and the rail markings stay one line up to 38%;
     - the min-content floor means no planing number is ever cut off at any width: at 618 dots the table takes its own 165 px, where the rail markings still fit up to 172.8;
     - at 560 dots the two cannot sit side by side (399 + 165 + 4 against 518), so the rail labels wrap there. That is item 8b's (quick 260928-tst).
2. components/summary/order-form.tsx:
   - Change the import `planingBox` to `planingTable`, and the call to `const planing = planingTable(sideProfile, defaults.planerMaxDepth, system);`. Update the comment above it to mention the table.
   - In the PLANING FormBox, keep caption "Planing", captionRight non-breaking space, className and bodyClassName "p-0". Replace everything inside its `data-planing` div. Give the div className `flex min-h-0 min-w-0 flex-1 flex-col px-1 py-2`; `py-2` is the rail box's own 8 px top padding, so the two header rows sit at the same height (measured 0.0 px apart). The div holds:
     - A `table` with the attribute `data-planing-table` and className `w-full border-collapse`.
     - Its `thead` has one `tr` with className `border-b-2 border-surf-line-faint` and `style={{ fontSize: "var(--summary-font-label, 12px)" }}`, holding:
       - an empty `td` with className `pb-1` (the label column, as the rail header's empty first cell);
       - two `th` cells (`scope="col"`, the attribute `data-planing-header`, className `whitespace-nowrap pb-1 pl-1.5 text-right font-extrabold text-surf-ink`) holding `planing.headers.deck` and `planing.headers.bottom`.
     - Its `tbody` maps `planing.rows` (index i, key row.label) to a `tr` with the attribute `data-planing-row`, className `border-b border-surf-line-faint leading-tight` and `style={{ fontSize: "var(--summary-font-row, 11px)" }}`. Each row has three `td` cells:
       - a label `td` with the attribute `data-planing-label`, className `w-full whitespace-nowrap pb-0.5 text-surf-ink-muted` plus `pt-1.5` when i === 0 and `pt-0.5` otherwise ({row.label}). The first row's extra top padding stands in for the rail header's `mb-1`, since a table row cannot take a margin;
       - two value `td` cells with the attribute `data-planing-cell`, className `whitespace-nowrap pb-0.5 pl-1.5 text-right font-bold text-surf-ink` plus the same pt rule ({row.deck}, then {row.bottom}).
       Use `cn` for the pt switch.
     - After the table, a `p` with the attribute `data-planing-footnote` and className `mt-1 text-surf-ink-muted leading-tight order-form-micro` ({planing.footnote}). On page 2, `order-form-micro` is the same 1.75cqw size as `--summary-font-row`. It wraps freely and never widens the table.
   - The header and row type use the rail table's own CSS variables, not a new size. That is the founder's "font size should match the other dim text".
   - Rewrite the PLANING comment block in plain English:
     - the founder's 2026-09-29 words;
     - a small table like the rail markings, same header, rules and type size;
     - Deck and Bottom, with Foam Off and Passes;
     - the pass depth in the footnote and why;
     - dashes and the pick-a-blank line with no blank (one layout);
     - the 28% and min-content floor, pointing at order-form.css's comment.
     Keep its existing notes that the tips stay on page 1's rocker strip and the FOAM OFF five-station rows on ROCKER's DATASHEET, and the reason for the non-breaking-space captionRight.
   - In the file's header doc comment, change the page-2 sentence about the PLANING column to say it is a small Deck/Bottom table of the foam off and the planer passes.
3. Run the gates in `<verify>`.

Commit with explicit paths (the two files). Subject: `feat(summary): the PLANING column prints as a Deck/Bottom table the size of the rail marks (quick 260928-tst)`. The body, in plain English, says:
- On the back of the order form, the planing numbers now sit in a small table laid out like the rail markings beside it: Deck and Bottom across the top, Foam Off and Passes down the side, at the same type size as the rail numbers.
- The deck gets its own pass count.
- The footnote says it is measured at the center and what a pass is (your Planer Max Depth).
- The column is a little wider, and on a narrow phone print it never gets narrower than its own numbers.
- The rail markings are still one line and no taller on a computer print and on phone prints from 618 dots up. On the very narrowest phone print (560 dots) the rail labels wrap; that is the next item, 8b.
- Nothing stored changes.
Trailer as in Task 1. Do not run Playwright; the orchestrator does.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && npm run lint -- --max-warnings 0 && npx tsc --noEmit && npm test && grep -q "planingTable(sideProfile, defaults.planerMaxDepth, system)" components/summary/order-form.tsx && grep -q "data-planing-table" components/summary/order-form.tsx && grep -q "data-planing-footnote" components/summary/order-form.tsx && test "$(grep -c 'var(--summary-font-row, 11px)' components/summary/order-form.tsx)" -ge 1 && test "$(grep -c 'var(--summary-font-label, 12px)' components/summary/order-form.tsx)" -ge 1 && grep -q -- "--order-form-planing: 0.28;" app/design/summary/order-form.css && grep -q "min-width: min-content;" app/design/summary/order-form.css && test -z "$(git diff --name-only HEAD~2 -- components/rails components/rocker lib/models lib/db db)"</automated>
  </verify>
  <done>Lint shows 0 warnings, tsc is clean, and `npm test` shows 0 failed (the units-isolation ledger still passes for order-form.tsx). Page 2's PLANING box is a real table on the rail table's own type sizes and rules, with the data-* hooks Task 3 needs. The column is 28% with a min-content floor. Nothing under components/rails, components/rocker, lib/models, lib/db or db/ changed. One commit holds exactly the two files.</done>
</task>

<task type="auto">
  <name>Task 3: The browser spec checks the table in both systems at every print size — and the old wording goes</name>
  <files>e2e/summary-planing.spec.ts, lib/geometry/planing.ts, lib/geometry/planing.test.ts</files>
  <action>
Rework e2e/summary-planing.spec.ts in place. Keep its copied helpers, SWEEP_WIDTHS, forceTouchSheet, selectSystem, thickestCatalogueThicknessIn, the PDF helpers and the four-tests-times-two-systems shape: 24 tests listed. Update the file doc comment:
- the table (quick 260928-tst);
- that expected values still come from ROCKER's screen or the app's own lib helpers;
- that case D now also logs the 560-dot print, where the rail labels are known to wrap. That is handed to item 8b, whose spec takes the assertion over.
Rename the describe to `Summary — the PLANING table (Phase 13 item 8, quick 260928-r9h; reworked 260928-tst)`. Replace the `planingBox` import with `planingTable`. Add `planerPasses` to the measure-display import and `parseImperial, parseMetric` to the units import.

Locators: `[data-planing-table]`, `[data-planing-header]` (2), `[data-planing-row]` (2), `[data-planing-label]` (2), `[data-planing-cell]` (4, row-major: Foam Off deck, Foam Off bottom, Passes deck, Passes bottom), `[data-planing-footnote]` (1). The old `-item`, `-value`, `-note` and `-empty` hooks are gone.

A. `with no blank picked, the PLANING table shows dashes and says to pick a blank (${system})`, on all projects. Expect:
- `[data-rail-bands-row]` visible;
- caption `Planing`;
- headers exactly ["Deck", "Bottom"];
- labels exactly ["Foam Off", "Passes"];
- the four cells all `—`;
- footnote exactly `Pick a blank on ROCKER for the planing numbers.`.

B. `with a blank picked, the PLANING table prints ROCKER's own foam off and passes, and the deck's passes worked the same way (${system})`, on all projects.
- Read from ROCKER as today: `skin` from `Deck Skin — `; `offBottom` from the Center OFF BOTTOM readout; `passesText` from `[data-bottom-passes] span`, last; `depth` from the `At … a pass — your Planer Max Depth.` hint. Keep the system guard.
- Compute:
  - `bottomPasses = passesText.replace(/ passes?$/, "")`;
  - `deckPasses`: `"0"` when skin is `none`, otherwise `String(planerPasses(parse(skin), parse(depth), system))`. `parse` is `parseImperial` in Imperial and `(s) => parseMetric(s, "mm")` in Metric. Expect each parse non-null. Parsing the printed strings gives exactly the printed values planerPasses counts from.
- `goToSummary`. Expect:
  - headers ["Deck", "Bottom"];
  - labels ["Foam Off", "Passes"];
  - cells exactly [skin, offBottom, deckPasses, bottomPasses];
  - footnote exactly `At the center, at ${depth} a pass — your Planer Max Depth.`

C. PDF (desktop only): unchanged apart from the readiness check. Replace the item-count check with `[data-planing-cell]` count 4 and the first cell not equal to `—`.

D. Widest strings (desktop only), setup unchanged (blank + Quad).
- Build the candidate lists with `planingTable`:
  - `deckFoam`: rows[0].deck over the skin sweep (0 to inchesToMm(FIT_DEFAULTS_RANGE_IN.deckSkin.max), 0.5 mm steps, centerGap mm(0));
  - `bottomFoam`: rows[0].bottom over the existing centre-gap sweep;
  - `deckPasses`: rows[1].deck over the skin sweep × passDepths;
  - `bottomPasses`: rows[1].bottom over the gap sweep × passDepths;
  - `footnote`: over passDepths.
  Keep `railCells` as today.
- Non-vacuity guards that match the real ranges:
  - `deckFoam.size ≥ Math.round(FIT_DEFAULTS_RANGE_IN.deckSkin.max * 16) + 1`;
  - `bottomFoam.size > 20` and `bottomPasses.size > 20`;
  - `deckPasses` contains "0", and contains `String(planerPasses(inchesToMm(FIT_DEFAULTS_RANGE_IN.deckSkin.max), passDepths[0], system))`, the most passes the deck can need;
  - `footnote.size === passDepths.length`.
- Rework `measureAndWrite`:
  - write the widest of each list into the matching `[data-planing-cell]` (0 deckFoam, 1 bottomFoam, 2 deckPasses, 3 bottomPasses) and into `[data-planing-footnote]`;
  - return, in addition to today's rail/fin/sheet/caption figures:
    - the table's `getBoundingClientRect().width` minus its parent's `clientWidth`;
    - every `[data-planing-cell]` and `[data-planing-header]` `scrollWidth - clientWidth`;
    - whether each `[data-planing-label]` is one line: a `Range` over its contents, with the set of rounded `getClientRects()` tops of size 1;
    - the `[data-planing-header]` text top (first header's getBoundingClientRect().top) and the rail header's second child's top;
    - the planing box's `scrollHeight - clientHeight`;
    - the PLANING FormBox width.
- `assertMeasurement(result, label, mode)` with mode `"computer" | "touch" | "touch-560"`:
  - Every mode:
    - table overflow ≤ 0.5;
    - every planing cell and header overflow ≤ 0.5;
    - every planing label one line;
    - planing box overflow ≤ 0.5;
    - caption bottoms within 0.5;
    - every sheet overflow ≤ 0.5;
    - rail value cells' overflow ≤ 0.5.
  - Every mode except `"touch-560"`: rail row heights spread ≤ 0.5, rail header cell heights spread ≤ 0.5, and the two header text tops within 0.5.
  - `"computer"` only: rail content ≤ rail box + 0.5 and fin content ≤ fin box + 0.5.
  - At 560, log the rail row spread and rail content vs box in the report line (the 8b hand-off) and assert nothing about the rail rows.
- The report line adds the PLANING width and the rail ceiling evidence (label column px, value column px).

Then retire the old wording. The names below appear here only so they can be deleted; none may survive in any comment either:
<!-- planner-discipline-allow: planingBox -->
<!-- planner-discipline-allow: PlaningItem -->
<!-- planner-discipline-allow: data-planing-item -->
<!-- planner-discipline-allow: data-planing-value -->
<!-- planner-discipline-allow: data-planing-note -->
<!-- planner-discipline-allow: data-planing-empty -->
- in lib/geometry/planing.ts, delete `planingBox`, `PlaningItem` and `PlaningBox` (keep `PlaningInput`, `unsignedZeroMark`, `planingTable`). Reword `PlaningInput`'s doc comment, which today names the old function, so it says what `planingTable` needs;
- in e2e/summary-planing.spec.ts, make sure the file doc comment (today it names the old function around line 23) and every other comment names `planingTable` and the new hooks;
- in lib/geometry/planing.test.ts, delete the old `planingBox` describe block;
- grep the repo (`grep -rn "planingBox\|PlaningItem\|data-planing-item\|data-planing-value\|data-planing-note\|data-planing-empty" components lib e2e app`) and expect no hits.

Run `npx tsc --noEmit`, `npm run lint -- --max-warnings 0`, `npm test` and `npx playwright test --list e2e/summary-planing.spec.ts`, which lists only and must report `Total: 24 tests in 1 file`. Do NOT run the tests.

Commit with explicit paths (the three files). Subject: `test(summary): the PLANING table checked against ROCKER in both systems, on Letter, A4 and every phone print width (quick 260928-tst)`. The body, in plain English, says:
- These browser checks prove the new planing table shows exactly what ROCKER shows, and that the deck's passes are worked the same way, with and without a blank, in Imperial and Metric.
- They prove the order form still prints two true-size pages on Letter and A4.
- They prove that even the widest numbers any board can print never get cut off.
- They prove the rail markings stay one line on a computer print and on phone prints from 618 dots up. The narrowest phone print (560 dots) is logged for item 8b.
- The old stacked wording is removed.
Trailer as in Task 1.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && npx tsc --noEmit && npm run lint -- --max-warnings 0 && npm test && npx playwright test --list e2e/summary-planing.spec.ts | grep -q "Total: 24 tests in 1 file" && test -z "$(grep -rn 'planingBox\|PlaningItem\|data-planing-item\|data-planing-value\|data-planing-note\|data-planing-empty' components lib e2e app)" && test "$(git log -3 --format=%s | grep -c '(quick 260928-tst)$')" = "3" && test -z "$(git status --porcelain -- e2e lib components app)"</automated>
  </verify>
  <done>The spec type-checks, lints clean and lists exactly 24 tests. Every expected value comes from ROCKER's screen or the app's own helpers, and the deck passes come from planerPasses on ROCKER's own printed skin and depth. The old planingBox wording and hooks are gone everywhere. Three commits end `(quick 260928-tst)`, and nothing stray is left in e2e, lib, components or app.</done>
</task>

</tasks>

<browser_tests_expected_to_move>
For the orchestrator. The executor does not run Playwright. Run `npx playwright test e2e/summary-planing.spec.ts` and the full suite (`npm run test:e2e`, in the background):
- e2e/summary-planing.spec.ts (reworked): expected green on all three projects. D's console line at 560 shows the known rail wrap (rows about 35 px, rail content 415 Imperial / 433 Metric), handed to 8b.
- summary-print-size.spec.ts, summary-print-touch-box.spec.ts, summary-preview.spec.ts, summary-blank.spec.ts, summary-rail-key.spec.ts and summary-rail-instructions-fit.spec.ts: expected to HOLD.
  - They print the default board with no blank: the dashes table and the pick-a-blank footnote.
  - No sheet overflows its page box (touch-box case 6(b)), because the rail box's height share is unchanged.
  - The table's text uses the rail table's CSS variables, which touch-box case 6(a) does not sample (the rail table's own text is outside its token-class set too). The footnote carries `order-form-micro`, which it does sample and which scales with the page.
- desktop-baseline.spec.ts has no Summary screenshot; phone-trip.spec.ts only checks the sheet is visible.
</browser_tests_expected_to_move>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Shaper's own design state → printed sheet | Only the shaper's own board and their own Planer Max Depth preference are rendered. No new network, database or third-party surface. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-tst-01 | Tampering (integrity of saved boards) | lib/models, lib/db, db/ | medium | mitigate | Display-only change: nothing is written. Task 2's verify requires no diff under components/rails, components/rocker, lib/models, lib/db or db/. |
| T-tst-02 | Tampering (a wrong number on paper) | lib/geometry/planing.ts | medium | mitigate | One pure function reads only the side profile's own fields through the existing formatters and planerPasses. Unit tests pin both systems and the none/1/many/-0"/negative edges, and tie the Deck and Bottom values to the DATASHEET's own FOAM OFF cells at Center. Browser test B compares the printed table with ROCKER's screen text exactly. |
| T-tst-03 | Denial of service (a number cut off, or a rail mark pushed onto a second line) | PLANING column width | high | mitigate | The min-content floor makes a clipped planing number impossible. Browser test D writes the widest strings any board can produce and asserts no planing clip at every width, and one-line rail rows at a computer print and at 618–900 dots. The 560 wrap is measured, logged and handed to 8b (<for_item_8b>). |
| T-tst-04 | Information disclosure | printed sheet | low | accept | The only printed preference is the shaper's own Planer Max Depth, on their own sheet. |
| T-tst-SC | Tampering | package installs | low | accept | No package is installed. |
</threat_model>

<verification>
Executor:
- `npx vitest run lib/geometry/planing.test.ts` passes.
- `npm run lint -- --max-warnings 0`, `npx tsc --noEmit` and `npm test` pass after each task.
- `npx playwright test --list e2e/summary-planing.spec.ts` reports `Total: 24 tests in 1 file` (lists only).
- Three commits, each with a conventional subject ending `(quick 260928-tst)`, a plain-English body and the Co-Authored-By trailer, staged with explicit paths. PLAN.md and SUMMARY.md stay uncommitted. STATE.md, ROADMAP.md, 13-SPEC.md and config.json are untouched. Nothing is pushed.

Orchestrator (browser, then paper):
- Run the suites in `<browser_tests_expected_to_move>`.
- Make a headless print-to-PDF before (f5e9559) and after, on Letter and A4, in Imperial and Metric. Print the default board with no blank, and then a blank-picked board with Quad fins. Check each PDF for:
  - Page 1 identical to before.
  - On page 2, PLANING is a small table beside RAIL BANDS:
    - `Deck`/`Bottom` on the same line as `Nose`/`Center`/`Tail`;
    - the same bold weight and size as the rail numbers;
    - `Foam Off` and `Passes` rows;
    - the footnote with the pass depth;
    - with no blank, dashes and the pick-a-blank line.
  - The rail markings one line each, ending at the same height as before.
  - The quad's fin numbers above SHAPER USE ONLY.
  - Metric reads ` mm` on each Foam Off value.
  - Two pages each.
- Show the founder the after-PDFs.
- Record `<for_item_8b>` against item 8b: the 560-dot wrap and the two levers.
</verification>

<success_criteria>
- A shaper reads the foam off and the planer passes for the deck and the bottom in one small table beside the rail markings, at the same size and in the same shape. The numbers match ROCKER's, and a deck pass count is worked the same way as the bottom's, in Imperial or Metric.
- The column is wider on a computer print. No planing number is ever cut off. The rail markings stay one line and no taller on a computer print and on phone prints from 618 dots up. The 560-dot print is measured and handed to 8b.
- One pure tested function words it all; the old stacked wording is gone.
</success_criteria>

<output>
Create `.planning/quick/260928-tst-phase-13-item-8-revision-the-planing-col/260928-tst-SUMMARY.md` when done. Leave it uncommitted, and write it in plain English for the founder:
- what the table shows, with the Imperial and Metric examples from `<printed_table>`, including a skin of none and a many-pass case;
- where the pass depth now lives, and the reasons from `<decisions>`;
- the new column width and why, with the measured numbers;
- that page 1 and the rail table's own file are unchanged;
- the 560-dot hand-off to 8b from `<for_item_8b>`;
- the `npm test` count before and after;
- the list from `<browser_tests_expected_to_move>`;
- the three commit hashes.
</output>
