# Brief — quick 261113-vya (was "si7-B"): the printed BOTTOM CONTOURS tables keep every row on a long board

Follows quick 261113-si7 (boards 4'0"–12'0", 31" wide from 8'0"): read its PLAN (the "Follow-up, needed before
go-live: si7-B" section and its measured numbers) and SUMMARY first —
`.planning/quick/261113-si7-boards-up-to-12-feet-long-and-up-to-31-i/`. Anchor on function names, not line
numbers.

## Why (the founder's ruling it follows)

The founder, 2026-11-13: "We should also increase the max length of a possible board to 12 feet." That is built.
The si7 planner measured one thing it breaks on paper and it was left out on purpose as its own task:

- The Summary order form's BOTTOM CONTOURS sheet (`components/summary/bottom-contours-sheet.tsx`,
  `components/summary/bottom-sheet-fit.ts`, `app/design/summary/order-form.css`) carries data tables with **a
  row every 6" along the board**. A 12'0" board is 25 rows. When any cut has layout marks, the two tables
  stacked on their own sheet **overflow it by 26 dots** even with the rows tightened and no notes — in both
  unit systems and for every cut set that has marks. 11'6" still fits with 7 dots to spare. The bottom rows
  would be cut off the printed page: a shaper would lose numbers they cut foam to.
- si7 pinned `components/summary/bottom-sheet-fit.test.ts`'s longest-board case at 10'0" and left
  `it.todo("the longest board the app allows (12'0") keeps every row — quick si7-B")`.

## What I expect (my calls — flag what you change)

1. **Measure first** (scratch `scratchpad/vya/`; si7's scripts are in `scratchpad/si7/`). Reproduce the
   overflow: which boards and which bottoms overflow today (length × cuts with / without layout marks × notes ×
   Imperial / Metric × Letter / A4), by how much, and what the sheet's own fit rules already do
   (`bottom-sheet-fit.ts` — find every step of its tightening ladder before proposing a new one). Also check
   the same tables anywhere else they print or show (the BOTTOM page's DATA tab on screen is not paper — leave
   it; but the Overview Sheet / any PDF builder that carries them) and the short end (a 4'0" board: 9 rows —
   nothing to fix, say so).
2. **The fix: no row is ever dropped or clipped.** The si7 planner's proposal is a further sheet when the
   tables do not fit: the tables split across sheets at a row boundary, each part with its own header row
   (and the board's name / "continued" in the sheet's own words), in the order form's existing page pattern.
   If your measuring finds something simpler and honest that keeps today's sheets for every board up to 11'6"
   EXACTLY as they print now, propose it — but never by shrinking type below what the sheet's own rules allow
   today, and never by thinning the rows (a row every 6" is the founder's table).
   - Boards that fit today must print byte-for-byte / dot-for-dot as today: pin a spread (the four presets with
     and without cuts, a 10'0" with marks, an 11'6" with marks) before changing anything.
   - `order-form.css`'s `@media print` block is one of the two places allowed its own inch / mm paper figures
     (CLAUDE.md Rule 2) and a test fails if it disagrees with `use-print-fit.ts` — keep them agreeing; add no
     third place.
   - Read the memory note on print traps before touching print CSS:
     `/Users/kontoes/.claude/projects/-Users-kontoes-Code-shaper/memory/shaper-pdf-and-browser-verification.md`
     (headless Chrome over CDP for a real PDF, pypdf to read it back, Tailwind v4 print traps).
3. **Proof on paper, not arithmetic.** A real PDF printed from the order form for a 12'0" × 31" board with a
   marked cut set (Letter and A4, Imperial and Metric): every row present (read back with pypdf — count the
   station rows and check the last one is the tail's), nothing clipped, page count stated; and the same for a
   10'0" marked board proving its page count and content are unchanged. The Include-instructions page and the
   rail-band page options still land in the right order.
4. **Tests:** the `it.todo` becomes a real test at 12'0" (every row kept, the split where it falls); the 10'0"
   pin stays; a browser spec if the print path has one today (find what `e2e/` has for the bottom sheet and
   extend it). Run only touched specs.
5. **For the founder's look** (`pictures/`): the 12'0" board's BOTTOM CONTOURS sheets as page images (both
   sheets, Imperial; one Metric), and the 10'0" sheet before / after (identical).

## House rules that bite here

- Work in THIS checkout: `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`, branch
  `close-bottom-17` (HEAD 454df904). Never `cd` into a subfolder; never touch `/Users/kontoes/Code/shaper`
  itself. Nothing is pushed. No database change.
- **A dev server is running from this checkout on port 3117**; the founder is using it. Playwright with
  `PW_PORT=3117` reuses it. Never stop it, never start another `next dev` or a build, never run the whole
  browser suite. A real PDF can be printed from that server's pages with headless Chrome.
- Rule 1 (fit maths pure and tested — `bottom-sheet-fit.ts` is the place), Rule 2 (units through `units.ts` /
  `measure-display.ts`; marks in whole mm in Metric), plain English in every commit message and the SUMMARY.
- Known and not ours: `e2e/board-file.spec.ts` f1; five-second timeouts under whole-suite load in
  `round-tip.test.ts` / `blank-fit.test.ts` (pass alone). Never assert milliseconds.
- Commits: one per task. Never commit PLAN / BRIEF / SUMMARY / STATE — the orchestrator does.
