---
phase: quick-261113-vya
plan: 01
type: execute
wave: 1
depends_on: [quick-261113-si7]
files_modified:
  - components/summary/bottom-sheet-fit.ts
  - components/summary/bottom-sheet-fit.test.ts
  - components/summary/bottom-contours-sheet.tsx
  - components/summary/order-form.tsx
  - e2e/helpers/bottom-print.ts
  - e2e/summary-bottom-page.spec.ts
  - e2e/summary-planing.spec.ts
  - .planning/quick/261113-vya-the-printed-bottom-contours-tables-keep-/pictures/
autonomous: true
requirements: [VYA-R1-every-row-on-paper, VYA-R2-today-unchanged, VYA-R3-paper-proof, VYA-R4-tests, VYA-R5-pictures]

estimate:
  tokens: 190000
  raw_tokens: 190000
  tasks: 3
  confidence: low
  # estimate-calibration: factor 1, 0 samples. Raw = 60k (rule + sheets + form, one end-to-end print) + 70k (unit sweep,
  # two browser specs, their runs) + 60k (160-PDF spread after, comparisons, pictures).

must_haves:
  truths:
    - "On a board longer than 11'6\" (11'6 1/16\" up; 350.7 cm up in Metric) whose bottom has any layout-mark column, the order form prints the depths table on its own sheet and the layout-marks table on the next, each whole, Tail to Nose tip, 25 rows, nothing over the page mark, on Letter and A4, Imperial and Metric (VYA-R1)"
    - "Every board up to 11'6\", and every board of any length whose bottom has no layout-mark column, prints exactly as it does today: the same sheets, the same layout, the PDF pages byte for byte (VYA-R2)"
    - "The order form counts the extra sheet everywhere: Page N of M on every sheet, the line under the paper says three Bottom Contours pages, and the Rail Band Instructions page still prints last when ticked (VYA-R1)"
    - "Each of the two sheets reads on its own at the bay: its own page title, its table's column heads, the board's name strip, and DATA's notes for that table (VYA-R1)"
    - "A real PDF printed from the order form proves it: rows counted and placed from the PDF itself for a 12'0\" x 31\" board, and the 10'0\" and 11'6\" boards' PDFs unchanged (VYA-R3)"
    - "The it.todo is a real 12'0\" test, the 10'0\" pin stays, and the two browser specs that print the bottom carry a 12'0\" board (VYA-R4)"
    - "The founder's pictures exist: the 12'0\" board's sheets before and after, one Metric, and the 10'0\" sheet before and after (VYA-R5)"
  artifacts:
    - path: components/summary/bottom-sheet-fit.ts
      provides: "BottomSheetLayout.tablesSplit, .splitNotes {depths, marks}, sheets 1 | 2 | 3; bottomSheetSpare(...).split {depths, marks} | null"
    - path: components/summary/bottom-contours-sheet.tsx
      provides: "BottomTablesSheet part 'both' | 'depths' | 'marks'; BOTTOM_SHEET_COPY.depthsPageTitle / marksPageTitle"
    - path: components/summary/order-form.tsx
      provides: "two bottom-variant sheets on a split, page marks 4 and 5, the print line's three pages"
    - path: e2e/helpers/bottom-print.ts
      provides: "boardWithBottom(presetId, picks, size?) — a stock board at a given length and width"
  key_links:
    - from: components/summary/order-form.tsx bottomLayout
      to: components/summary/bottom-sheet-fit.ts bottomSheetLayout
      via: "sheetCount = 2 + layout.sheets + rails; the split's two sheets render from layout.tablesSplit — one answer for the stack, the page marks and the print line"
    - from: components/summary/bottom-sheet-fit.ts tablesSplit
      to: the shared tables sheet's own count (tablesHeight, tight, no notes)
      via: "split exactly when today's last rung (tight rows, no notes) would leave less than BOTTOM_SHEET_SPARE — so every sheet that fits today is untouched"
---

# Quick 261113-vya — the printed BOTTOM CONTOURS tables keep every row on a board up to 12'0"

Read `BRIEF.md` (this folder) first; its house rules bind every task. Follows quick 261113-si7 (boards 4'0"–12'0").

## READ THIS FIRST — what the planner measured (2026-11-13, HEAD 454df904)

Scratch: `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/vya/`
(called `$V` below). `tree/` is a scratch copy of HEAD (node_modules symlinked); `scripts/`, `pw/` and `out/` hold the
tools and results named in each task; `pdf/before/` is the "before" print set.

### 1. Where it overflows — the rule's own count (`bottom-sheet-fit.ts`)

A row every 6" from the tail plus the nose tip (`bottomDataStations`: stations below the length less 1 mm). So **25 rows
starts at 11'6 1/16" (Metric 350.7 cm)**; 11'6" and 350.6 cm have 24. Counted over the four shapes × narrowest / stock /
widest width × 11 bottoms × both systems, 4'0" to 12'0" (4,488 layouts), and every one of the 863 bottoms (6 × 6 × 6 cuts
× 0/4/6/8 channels) at 11'6", 11'6 1/16" and 12'0" on four shapes at stock width and 31" (20,712 layouts):

| Length | Rows | Tables' own sheet, both tables stacked, rows tight, no notes — spare on the computer's / phone's sheet | Outcome |
|---|---|---|---|
| up to 11'6" | ≤ 24 | ≥ +7.2 / +33.4 dots (the rule needs 4) | fits — **every** bottom, every shape, both systems |
| 11'6 1/16" – 12'0" | 25 | **−26.0 / +2.7** | **every bottom with a layout-mark column overflows** (6,768 of 6,904 per length; 1 to 11 columns; same −26 for every shape, width and system); the 136 depths-only bottoms fit (337 to spare, both notes) |

At 25 rows no bottom keeps its tables on page 3, so the tables' own sheet is the only place at risk. Imperial and Metric
never disagree on the sheet count (0 of 2,244 pairs).

### 2. On paper today (real PDFs from the dev server on 3117, computer print — `$V/pdf/before/`, `$V/pdf/touch/`)

| Board, bottom | Rows | Pages | The tables sheet's last row |
|---|---|---|---|
| 11'6" × 22 1/2" Longboard, a cut in every section + 8 channels (11 mark columns) | 24 | 4 | Nose tip clears the page mark by 18.7 pt (DOM: 12.4 dots) |
| 12'0" × 31" Longboard, the same bottom | 25 | 4 (5 ticked) | **the layout-marks table's Nose tip row prints on top of the page mark** — −6.1 pt on paper; DOM: the content runs 20.8 dots past the mark's top, the row ends 15.3 dots below it, the table's bottom rule is lost under the mark. Letter and A4 alike (the sheet is the same box on both); the Rail Band page still prints last. Picture: `$V/png/lb-144x31-every8-imperial-rails-off-Letter-p4.pdf.png` |
| 12'0" × 31", 4 channels (2 mark columns, heads on one line) | 25 | 4 | the row box reaches 0.3 dot into the mark (content 5.8 dots past it) |
| 12'0" every cut + 8 channels on a phone's sheet, 560–900 dots | 25 | — | clears by 21.5–54 dots: the computer's sheet is the one that fails |

So nothing falls off the sheet — the overflow is shorter than the page mark's own band — but the last station's numbers
print over the page's footer, which is the same loss for a shaper. (The brief said "check the last row is the tail's":
the tables run from **Tail** down to **Nose tip**, so the last row, and the one lost today, is Nose tip.)

### 3. The sheet's fit ladder today, end to end (`bottomSheetLayout`)

1. Page 3 keeps the tables — beside each other when the marks table has ≤ 6 columns, else stacked — if the page still has
   4 dots on both the computer's sheet (922) and the phone's (882). The picture from above is the one part allowed to give way.
2. Else the tables take sheet 4, full width, stacked, with every DATA note at today's rows.
3. Else the rows lose their one dot of padding (`tablesTight`, 2 dots a row) and keep as many notes as fit, in DATA's order.
4. Nothing after that: at 25 rows with a marks column, tight with no notes is still −26.

Notes on the tables sheet by length today (marked bottoms): 8'0" every note at today's rows; 9'0"–9'6" tight with every
note (the stock 9'0" Longboard is one); 10'0": 1 or 3 of 3; 10'6": 1 of 3; **11'0"–11'6": none** (the existing "as many as
fit" rule — see My calls 6).

### 4. The fixes measured at 25 rows (12'0")

| Option | Holds | Room left (tighter sheet) |
|---|---|---|
| **A — one table a sheet**: depths on sheet 4, layout marks on sheet 5, today's rows, each with its notes | all 6,768 marked bottoms | depths 337, marks ≥ 308.5 dots |
| B — the two tables beside each other on their sheet | only ≤ 6 mark columns: 5,016 of 6,768 | 259 |
| C — both tables broken at a station row ("continued") | all | ~320 |
| D — smaller type, thinner rows, fewer rows | forbidden by the brief | — |

### 5. Elsewhere the tables could print (checked)

The Overview Sheet lists the bottom's cuts in words only (`bottomPrintLines`); the `.brd` Overview's BOTTOM block is a
three-row table (Nose / Center / Tail, `brdBottomRows`) — neither grows with length. BOTTOM's DATA tab is on screen and
scrolls (left alone, per the brief). **The 4'0" end:** 9 rows, the tables' sheet has 335+ dots to spare — nothing to fix.

## My calls (for the founder)

1. **One table a sheet, not both tables broken at a row (option A).** Each table stays whole and reads straight down from
   Tail to Nose tip; it is also the shop's two jobs — rule the layout marks on the blank, then check the cut under a
   straightedge; no "continued" words; every row at today's height. It is what the si7 planner proposed ("they take one
   sheet each"). Option C fits too, if he would rather keep each station's depths and marks on one sheet.
2. **The split starts exactly where today's last rung fails**: the shared sheet cannot hold the rows even tight with no
   notes — in practice a board over 11'6" with any layout-mark column. Every board up to 11'6", and any board with no
   marks column, prints byte for byte as today.
3. **On the two sheets the rows keep their padding** (not tight) and each carries DATA's notes for its own table: the
   depths sheet the depths note and the full-ink rows note; the marks sheet the layout-marks note and the full-ink rows
   note. The full-ink rows note goes on both because both tables draw those two rows bold.
4. **Page titles:** `Bottom Contours · Depths` and `Bottom Contours · Layout Marks` (the one sheet of today keeps
   `Bottom Contours · Tables`); the line under the paper says "plus three Bottom Contours pages".
5. **One answer for every printer**, from the board alone, as today: a phone's sheet would just hold the 25 rows (2.7 dots)
   and a computer's not, so both get the two sheets.
6. **Not changed, his call:** boards 11'0"–11'6" print no reading notes on their tables sheet (10'0": 1 or 3 of 3, 10'6": 1
   of 3) — today's "as many as fit" rule. After this fix a 12'0" board prints every note and an 11'6" none. Starting the split
   wherever not every note fits (from about 10'0") would give every board every note, but changes 10'0" prints that are live
   today, so it is not built here.
7. **Not ours, flagged:** on page 3 of a short, wide board with a cut in every section and 8 channels — 5'0"–6'0" × 25" (live
   today), and the new 4'0" boards and 8'0" × 31" — the fit rule counts the page 3.6 to 20.7 dots short, so the picture from
   above is the part that gives way (on the real 4'0" × 16" page the content still cleared the page mark by 16 dots). No row
   or note is involved, and the tables there sit on their own sheet with 335+ dots to spare.

## Rules for the executor

- Rule 1: the fit stays pure arithmetic in `bottom-sheet-fit.ts`, tested. Rule 2: no new number formatting — the tables
  already go through `measure-display.ts`. **No CSS change**: the new sheets are `<Sheet variant="bottom">`, so
  `order-form.css`'s print block and `use-print-fit.ts` stay the only two places with paper figures, untouched.
- Plain English in every string a shaper reads and in every commit message (CLAUDE.md). One commit per task, staged by name.
- The dev server on 3117 is the founder's: browser specs with `PW_PORT=3117`, one file at a time, never a second `next dev`,
  never a build, never the whole suite. Absolute paths and `git -C` only. Nothing is pushed. No database change.
- Known and not ours: `e2e/board-file.spec.ts` f1; five-second timeouts in `round-tip` / `blank-fit` under load.
- **The "before" set is already taken** at HEAD 454df904: the layout pin `$V/out/pin-before.json` (5,856 layouts) and the
  print spread `$V/pdf/before/` (20 boards — the four presets flat / Deep Single + 6 channels / every cut + 8 channels, and Longboard-shaped 10'0", 11'6", 12'0" and 4'0" boards with marked and unmarked bottoms — × Imperial/Metric × Rail Band page off/on × Letter/A4 = 160 PDFs, plus a JSON
  per print of what print media measured). Chrome's PDFs repeat byte for byte (two runs of 8 PDFs: identical), so page
  content streams compare exactly. The set stands while no file outside `.planning/` differs from 454df904 (Task 1's
  precondition — the orchestrator committing this PLAN does not matter); otherwise retake both before the first edit, into
  `$V/out/pin-before-2.json` and `$V/pdf/before-2/` (the commands in Task 3 with those names), and compare against them.

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: A 12'0" board's two tables print a sheet each — the rule, the sheets, the order form, one board end to end</name>
  <files>components/summary/bottom-sheet-fit.ts, components/summary/bottom-sheet-fit.test.ts, components/summary/bottom-contours-sheet.tsx, components/summary/order-form.tsx</files>
  <precondition>No file outside `.planning/` differs from 454df904 (`git -C /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 diff --stat 454df904 -- . ':!.planning'` and `git -C … status --short -- . ':!.planning'` both print nothing), and `curl -s -o /dev/null -w "%{http_code}" http://localhost:3117/design/summary` prints 200.</precondition>
  <behavior>
    - The it.todo becomes a real test (BOARD_LENGTH_RANGE_IN.max, the Longboard preset's fields at that length, every8, both systems): dataRows equals bottomDataRows (25 rows); tablesOnOwnSheet and tablesSplit true; sheets 3; tablesTight false; tableNotes empty; splitNotes.depths equals [BOTTOM_COPY.depthsNote, referenceRowsNote(...)] and splitNotes.marks equals [layoutMarksNote(resolved.channels, system), referenceRowsNote(...)]; bottomSheetSpare gives tables null and split.depths and split.marks both at least BOTTOM_SHEET_SPARE.
    - A 12'0" board whose bottom has no layout-mark column (a Panel Vee tail alone) does not split: one tables sheet, sheets 2, both its notes, rows not tight.
    - Where the split falls: the same every8 bottom at 138" keeps today's one tables sheet (tablesSplit false, sheets 2, tight, no notes); at 138 1/16" it splits.
  </behavior>
  <action>
Tests first (RED), from the behaviour above, in bottom-sheet-fit.test.ts beside the 10'0" pin, which stays; delete the si7-B comment and it.todo they replace.

Then the rule (GREEN), per My calls 2 and 3, in bottom-sheet-fit.ts:
- BottomSheetLayout gains `tablesSplit: boolean` (doc: a board too long for its two tables to share their sheet — over 11'6" with a layout-mark column — prints the depths on one sheet and the layout marks on the next, each whole; false on every board that prints today) and `splitNotes: { depths: string[]; marks: string[] }` (DATA's notes for each of the two sheets; both empty when not split). `sheets` becomes `1 | 2 | 3`.
- In bottomSheetLayout, after tablesOnOwnSheet is decided and before today's notes block: tablesSplit is tablesOnOwnSheet, a marks column, and spareAfter of tablesHeight(sheet, rows, markColumns, false, true) — today's last rung, tight rows, no notes — below PAGE.spare. When split, skip today's notes block (tableNotes stays empty, tablesTight false) and fill splitNotes: depths list [depthsNote, referenceRowsNote], marks list [layoutMarksNote, referenceRowsNote], each kept in order only while it fits its sheet at today's rows (it always does — 300+ dots — but count it). Add one small pure helper for one table alone at full width: tableFrameWide + (tableHeadOne for the depths, tableHeadTwo for the marks) + rows × tableRow. When not split, today's code runs unchanged and splitNotes is two empty lists. Do not touch tablesHeight, tableNotesHeight, pageHeightWithoutTables or SHEETS — every figure that decides today's sheets must stay bit for bit.
- bottomSheetSpare returns `split: { depths: number; marks: number } | null` (null unless split) and `tables` null on a split. Update the head comment (the tables move to a sheet of their own, and on a board too long for both, a sheet each) and the `sheets` doc.

The sheets, in bottom-contours-sheet.tsx:
- BOTTOM_SHEET_COPY gains `depthsPageTitle: "Bottom Contours · Depths"` and `marksPageTitle: "Bottom Contours · Layout Marks"` (My calls 4); tablesPageTitle stays.
- BottomTablesSheet takes `part?: "both" | "depths" | "marks"`, default "both", which must render exactly today's tree (no new attribute or class on that path). For "depths" / "marks": the same outer div (`data-bottom-tables-sheet`, same classes) plus `data-bottom-tables-part` naming the part; inside, a `data-bottom-sheet-part="tables"` div (`flex flex-none flex-col gap-1`) holding DepthsTable or MarksTable alone, beside false, tight false; then, when its list is not empty, today's notes block (`data-bottom-sheet-part="table-notes"`, same classes) from layout.splitNotes[part]. Update the head comment's item 3.

The order form, in order-form.tsx:
- Today's tables `<Sheet variant="bottom">` (page 4, tablesPageTitle) renders when tablesOnOwnSheet and not tablesSplit — nothing else about it changes.
- When tablesSplit: two `<Sheet variant="bottom">`, each `{sheetHead}`, `<BottomTablesSheet layout part="depths" />` then `part="marks"`, `<PageMark page={4} … title={depthsPageTitle} />` and `<PageMark page={5} … title={marksPageTitle} />`. A fragment adds no element, so the print block's `:last-child` and `+` sheet rules keep working. sheetCount already follows layout.sheets; the Rail Band page already takes page sheetCount.
- printHint: the bottom pages in words for 1, 2 and 3 — "a Bottom Contours page", "two Bottom Contours pages", "three Bottom Contours pages" — the 1 and 2 wordings exactly as today. Update the Sheet variant doc comment ("…and the sheet, or two, its tables take").

Then print the one board end to end from the dev server (the founder's 3117, read-only) with the scratch spread spec and read the PDF back (verify). Look at the two new pages: `python3 $V/scripts/split.py <pdf> $V/png 4,5`, then `qlmanage -t -s 1600 -o $V/png <page pdf>` for each.

Commit (plain English), for example: "On a board over 11'6\", the printed bottom tables take a sheet each, so no row of numbers runs into the page's footer".
  </action>
  <verify>
    <automated>V=/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/vya; npx vitest run components/summary/bottom-sheet-fit.test.ts && npx tsc --noEmit && VYA_OUT=$V/pdf/after VYA_ONLY=lb-144x31-every8 VYA_SYSTEMS=imperial VYA_RAILS=off VYA_PAPERS=Letter npx --no-install playwright test --config $V/pw/playwright.config.ts && python3 $V/scripts/rows-on-paper.py $V/pdf/after/lb-144x31-every8-imperial-rails-off-Letter.pdf</automated>
  </verify>
  <done>The unit tests pass (the it.todo now a passing 12'0" test, the 10'0" pin green); tsc clean; the 12'0" × 31" PDF reads 5 pages — p4 [BOTTOM CONTOURS · DEPTHS] 25 rows Tail … Nose tip, p5 [BOTTOM CONTOURS · LAYOUT MARKS] 25 rows Tail … Nose tip, each lowest row clear of the page mark by more than 0 pt; the two page pictures looked at; one commit.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The tests — no board up to 11'6" ever splits, and both browser specs print a 12'0" board</name>
  <files>components/summary/bottom-sheet-fit.test.ts, e2e/helpers/bottom-print.ts, e2e/summary-bottom-page.spec.ts, e2e/summary-planing.spec.ts</files>
  <behavior>
    - Unit sweep (pure, both systems): the four presets' fields at 4'0", 4'6" … 11'0" every 6", 11'5" and 11'6", at the narrowest, stock and widest width the length allows (widePointWidthRangeIn), with every SETS bottom: tablesSplit false and sheets at most 2; non-vacuity — some take their own sheet and some are tight at 11'6". At 11'6 1/16", 11'9" and 12'0": every bottom with a mark column splits, both split sheets have at least BOTTOM_SHEET_SPARE, every note listed; a bottom with none never splits.
    - The rule by its own definition, on every layout of that sweep whose tables take their own sheet: tablesSplit is true exactly when bottomSheetSpare of the layout with tablesSplit false, tablesTight true and tableNotes empty leaves tables below BOTTOM_SHEET_SPARE; a layout whose tables stay on page 3 never splits.
    - Existing tests made three-way, not loosened: "the sheet count follows the tables" expects 3 on a split, 2 on one tables sheet, 1 otherwise; "every sheet the bottom prints on has room" checks split.depths and split.marks on a split.
  </behavior>
  <action>
Unit tests in bottom-sheet-fit.test.ts per the behaviour. Build boards as the file already does (presetFields + build with the outline's length and widePointWidth changed); keep the sweep under the file's 60-second style (it is about 2,200 layouts — the planner's scratch run of 4,488 took 18 s). Name lengths with inchesToMm and say in a comment that 11'6 1/16" is where the 25th row begins (bottomDataStations), not a typed threshold of the rule.

e2e/helpers/bottom-print.ts: boardWithBottom takes an optional third argument `size?: { lengthIn: number; widthIn: number }` — the outline's length and widePointWidth set through inchesToMm, and `blank: null` (a stock board's blank is shorter than a 12'0"; with no blank the side profile is the fallback rocker, as si7's walk used). With no size, everything it returns is exactly what it returns today.

e2e/summary-bottom-page.spec.ts: a new test, desktop only and slow, looping Imperial and Metric: "a 12'0\" board too long for its two tables to share a sheet prints them a sheet each, every row kept". Board: boardWithBottom("longboard", a cut in every section + 8 channels as the existing four-sheet test picks them, { lengthIn: 144, widthIn: 31 }). Non-vacuity from bottomSheetLayout: tablesSplit true and 25 rows. Then on the page: 5 sheets; sheet 3 reads pageMark("Bottom Contours", 3, 5) with no table; sheet 4 pageMark("Bottom Contours · Depths", 4, 5), exactly one table, `table[data-bottom-sheet-depths] tbody tr` count 25, first row's th "Tail", last "Nose tip"; sheet 5 pageMark("Bottom Contours · Layout Marks", 5, 5), exactly one table, `table[data-bottom-sheet-marks] tbody tr` count 25 and its thead th count = mark columns + 1; each sheet's `[data-bottom-sheet-part="table-notes"] p` has the text of layout.splitNotes.depths / .marks; no `[data-bottom-rows="tight"]` anywhere; the line under the paper is exactly "Two portrait pages, printed double-sided — plus three Bottom Contours pages."; in Metric neither sheet carries an inch mark (`"`) and the marks caption carries `(mm)`. Tick the Rail Band Instructions (the file's tickRailInstructions(page, 5)): sheet 5 reads … · Layout Marks 5 of 6 and sheet 6 "Rail Band Reference" 6 of 6. The existing four-sheet test stays as the 9'0" pin.

e2e/summary-planing.spec.ts: BOTTOM_FIT_BOARDS gains an optional `size` and `tablesSplit`, and a fifth board — "the longest board — a 12'0\" × 31\" Longboard with a cut in every section and 8 channels" (size 144 × 31, tablesOnOwnSheet true, tablesSplit true); boardWithBottom gets the size. Non-vacuity: layout.tablesSplit equals the entry's. Generalise the assertions without loosening them for the four boards already there: the tables sheets are every run sheet of kind "tables" (2 on a split, 1 on a tables sheet, 0 otherwise); each split sheet's parts are ["tables", "table-notes"]; the rows collected across the tables sheets (or page 3) equal [rows, rows] with a marks column; every existing clip, mark and width check runs on every tables sheet. The PDF part already expects sheetCount pages (5 here) at true size on both papers. Update the describe's head comment (five boards, the longest one a sheet each).

Commit (plain English), for example: "Tests: a 12'0\" board's bottom tables are proved whole on their two sheets, on paper and on screen, and no shorter board's printout moves".
  </action>
  <verify>
    <automated>npx vitest run components/summary/bottom-sheet-fit.test.ts && npx tsc --noEmit && npm run lint && PW_PORT=3117 npx playwright test e2e/summary-bottom-page.spec.ts && PW_PORT=3117 npx playwright test e2e/summary-planing.spec.ts --project=desktop -g "BOTTOM CONTOURS page fits"</automated>
  </verify>
  <done>Unit suite green with the sweep and the rule-by-definition check; tsc clean; lint with only the one old warning; summary-bottom-page.spec.ts green on every project it runs on; the planing spec's BOTTOM fit describe green for all five boards × both systems (computer print, eight phone widths, Letter and A4 PDFs with 5 pages for the 12'0"); one commit.</done>
</task>

<task type="auto">
  <name>Task 3: Proof on paper — every other printout unchanged byte for byte, every 12'0" row placed — and the founder's pictures</name>
  <files>.planning/quick/261113-vya-the-printed-bottom-contours-tables-keep-/pictures/</files>
  <action>
1. The layout pin after (pure): `mkdir -p $V/tree-after && git -C /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 archive HEAD | tar -x -C $V/tree-after` after Task 2's commit, then `ln -s /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules $V/tree-after/node_modules`; copy `$V/scripts/pin.test.ts` to `$V/tree-after/components/summary/_vya-pin.test.ts`, run `VYA_PIN_OUT=$V/out/pin-after.json npx --no-install vitest run --root $V/tree-after components/summary/_vya-pin.test.ts`, then `python3 $V/scripts/compare-pin.py $V/out/pin-before.json $V/out/pin-after.json`. Expected: every preset layout and every board 4'0"–11'6" identical; the only differences are the 138 1/16", 140" and 144" boards with a mark column (tablesTight true → false, sheets 2 → 3, spareTables −26 → null); the depths-only bottoms (panel, belly, flat) at those lengths identical.
2. The print spread after, from 3117: `VYA_OUT=$V/pdf/after npx --no-install playwright test --config $V/pw/playwright.config.ts` (all 160 PDFs, about 8 minutes), then `python3 $V/scripts/compare-pdfs.py $V/pdf/before $V/pdf/after`. Expected: every PDF identical page for page except the 16 of `lb-144x31-every8-*` and `lb-144x31-ch4-*` (2 boards × 2 systems × Rail Band page off/on × Letter/A4); `lb-144x31-panel-*` identical (no marks, no split). Any other difference stops the task: find and fix it in Task 1's code, then rerun.
3. Rows on paper: `python3 $V/scripts/rows-on-paper.py $V/pdf/after/lb-144x31-*.pdf` — for each of the 16: 5 pages (6 with the Rail Band page, which is last), p4 BOTTOM CONTOURS · DEPTHS and p5 BOTTOM CONTOURS · LAYOUT MARKS each 25 rows Tail … Nose tip (Metric stations in cm), lowest row clear of the page mark by more than 0 pt; and the 10'0" (`lb-120x22.5-*`) and 11'6" (`lb-138x*`) PDFs' page counts as before. Put the table in `pictures/numbers.md`.
4. Pictures (split pages with `$V/scripts/split.py`, render with `qlmanage -t -s 1600`), into `pictures/`: `12ft-x-31in-every-cut-imperial-letter-page-3.png`, `-page-4-depths.png`, `-page-5-layout-marks.png`; `12ft-x-31in-every-cut-metric-a4-page-4-depths.png`, `-page-5-layout-marks.png`; `12ft-x-31in-every-cut-before-page-4.png` (today's sheet, the Nose tip row over the footer, from `$V/pdf/before`); `10ft-every-cut-page-4-before.png` and `-after.png` with a line in numbers.md that their PDFs are byte-identical. Look at every picture before committing.
5. numbers.md: this plan's tables 1, 2 and 4, the pin and spread comparison lines verbatim, and the rows-on-paper table — in plain English for the founder.

Commit only the pictures folder (plain English), for example: "Pictures and numbers for the founder: the 12'0\" board's bottom tables on their two sheets, and the 10'0\" sheet unchanged".
  </action>
  <verify>
    <automated>V=/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/vya; python3 $V/scripts/compare-pin.py $V/out/pin-before.json $V/out/pin-after.json && python3 $V/scripts/compare-pdfs.py $V/pdf/before $V/pdf/after && python3 $V/scripts/rows-on-paper.py $V/pdf/after/lb-144x31-every8-metric-rails-on-A4.pdf $V/pdf/after/lb-144x31-ch4-imperial-rails-off-Letter.pdf && ls /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/.planning/quick/261113-vya-the-printed-bottom-contours-tables-keep-/pictures/</automated>
  </verify>
  <done>Pin: only the 25-row marked boards differ, as listed. Spread: 144 identical, 16 different (only the two marked 12'0" boards), 0 missing. Every one of the 16 reads 25 + 25 rows Tail … Nose tip on pages 4 and 5, clear of the mark, the Rail Band page last when ticked. Eight pictures and numbers.md exist, each picture looked at; one commit.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| board file / saved board → order form | a board's length decides how many rows and sheets print; a hand-made file is untrusted |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-vya-01 | Tampering | bottomSheetLayout on a hand-made board length | low | mitigate | lengths are already refused outside 4'0"–12'0" on read (quick si7, `BOARD_LENGTH_RANGE_IN`), so 25 rows is the most; the split's two sheets each keep 300+ dots, and Task 2's sweep pins every length to 12'0" |
| T-vya-02 | Information disclosure | the print path | low | accept | nothing leaves the browser; a print layout change, no new data, no network call |
</threat_model>

<verification>
- `npx vitest run components/summary/bottom-sheet-fit.test.ts` green; `npx tsc --noEmit` clean; `npm run lint` one old warning.
- `PW_PORT=3117 npx playwright test e2e/summary-bottom-page.spec.ts` and the planing spec's BOTTOM fit describe green.
- The pin and the 160-PDF spread compare as Task 3 lists; every 12'0" row read back from the PDF itself.
</verification>

<success_criteria>
A 12'0" × 31" board with any layout-mark column prints its depths table and its layout-marks table on two sheets, every
row from Tail to Nose tip clear of the page mark, on Letter and A4, Imperial and Metric, with the Rail Band page last when
ticked; every other printout is byte for byte what it was; the founder has the pictures and the numbers.
</success_criteria>

<output>
Create `.planning/quick/261113-vya-the-printed-bottom-contours-tables-keep-/261113-vya-SUMMARY.md` when done (the orchestrator commits it).
</output>
