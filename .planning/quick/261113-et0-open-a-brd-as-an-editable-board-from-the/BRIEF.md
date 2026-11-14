# Brief — quick 261113-et0: a .brd opens as an editable board, with a printable overview

Follows quick 261113-d9b (same day, same branch — read its BRIEF, PLAN and SUMMARY first:
`.planning/quick/261113-d9b-look-first-open-a-board-file-reads-an-ak/`). That task built the closest-fit
**look**: Open a board file… takes a `.brd`, and a preview shows the file in solid lines with the closest
board our sliders can make dashed over it. One button, Close; nothing opened or saved.

## The founder's ruling (2026-11-13, after seeing the look's pictures — locked)

Word for word:

> "Let's go with the editable board, and the preview should have a printable overview with enough info that
> the user can save it, continue with the board as close as possibe under our controls, then add the fine tune
> adjustments to get even closer (add wings, etc). Also, for rocker, we'll want to display their rocker data at
> our 5 stations, so the user can pick a blank and customize it's rocker to fit exactly if they desire."

Read as three things:

- **E1 — The editable board.** The preview gains the action that opens our closest fit as a board: the outline,
  the hand-set rocker and the foil the fit worked out, **no blank picked**, everything else (rails, bottom, fins)
  at the app's defaults for a new board, named after the file (the file's name without `.brd`). It opens the
  SAME way a JSON board file opens today — through `OpenBoardFile`'s `onOpen` with `DesignSnapshotFields`, as a
  new, unsaved board, with the setup screen's existing "Open this board file?" question when a board is already
  in progress. Nothing is saved until the shaper presses Save. Close stays, and still changes nothing.
- **E2 — A printable overview.** From the preview the shaper can print (or Save as PDF from the print box) a
  sheet to keep beside them while fine-tuning the opened board. It must carry "enough info": the file's name and
  size; the top view and side view with both lines (the file solid, our fit dashed) and the key; how close each
  of outline / rocker / thickness comes and WHERE the widest gap is — and for the outline WHICH WAY (the file is
  wider or narrower than our fit there), since that is what tells a shaper where a wing or a tweak belongs; the
  closest fit's control values; the file's own widths at the stations a shaper quotes (12" from the nose, the
  wide point and where it sits, 12" from the tail, and the tail's end width) beside our fit's; the rocker table
  of E3; the file's thickness at the five stations beside our fit's; and the plain line about what is not read
  (rails, bottom contours, wings/flyers — "add these by hand").
- **E3 — The file's rocker at our five stations.** Shown in the preview AND on the printed overview: nose tip,
  12" from the nose, centre (0), 12" from the tail, tail tip — the app's own five stations
  (`rockerStationPositions`, never restated), measured the way the app measures rocker (lift off the centre's
  low point), **read straight off the file's bottom line, the true tips included** — these are "their rocker
  data", the numbers a shaper matches a blank against, so they are NOT the 1"-in fitted figures. Beside each,
  our closest fit's figure. One short line says what they are for: pick a blank on ROCKER and use Custom Rocker
  to match these if you want it exact. (261113-d9b found the fit follows the file from 1" in at each tip because
  the file rounds its tips over in the last inch; that stays the fit's rule. Check what the file's bottom line
  really does in that last inch on the four sample files — if the true-tip figure is misleading for a shaper
  (e.g. a curled-over deck-side roll rather than the bottom), say so in the plan and show the figure the bottom
  of the board really has at the tip.)

## My calls (the founder sees them at his look — flag, don't hide)

- "Save it" = the printed sheet / Save as PDF through the browser's own print box. No new file format, no
  database change, nothing sent anywhere. The overview is NOT kept with the board after it opens (that would
  change what a saved board holds) — so the preview's wording should nudge "print this first", and the order of
  the buttons should make sense: Print overview, then Open as a board; Close.
- Button words are ours for his look. Suggested: **Print Overview** · **Open as a Board** · **Close**. The
  preview's title/description lose "A look only: nothing is opened or saved" and say the truth of the new
  dialog in a shaper's words.
- Fix the awkward `within <1/16"` wording from 261113-d9b (read "within less than 1/16"", or drop the "within"
  when the figure is a "<") — one rule, in `lib/export/brd-fit-preview.ts`, tested.
- The same words and figures feed the dialog and the printed sheet — one builder in `lib/`, tested; the React
  parts only paint. Every figure through `lib/geometry/units.ts` / `measure-display.ts` in the shaper's own
  system (Rule 2: dims in cm to one decimal, marks — rocker heights, the five thicknesses — in whole mm).
- Printing: the app already prints (the Summary order form, the Overview Sheet, the Full Sized Template, the
  Paper Saver — `app/design/summary/`, `components/summary/`, `use-print-fit.ts`, `order-form.css`). Find how
  those put a sheet on paper and hide the rest of the screen, and do the same for this sheet from the home page
  (a dialog is open over the page — the print must show ONLY the sheet: one page, Letter and A4 both, nose
  left, nothing clipped, light paper colours even in the dark theme). CLAUDE.md Rule 2 names the only two places
  allowed their own paper inch/mm figures — reuse them, do not add a third. Read
  `/Users/kontoes/.claude/projects/-Users-kontoes-Code-shaper/memory/shaper-pdf-and-browser-verification.md`
  for how print output is checked here (a real PDF read back, Tailwind v4 print traps).
- The opened board must be exactly the fit shown: the board that opens draws the same dashed outline and side
  profile the preview showed (a unit test: `fitBoardToBrd`'s values → snapshot fields → the app's own builders
  reproduce the fit's lines), and every value sits inside its slider's range so every page can edit it.
- Phones: the footer now holds three buttons — they must fit an upright phone (44-dot touch boxes on a coarse
  pointer) without pushing Close off screen.

## Not in this task (offer afterwards, do not build)

- Keeping the file's outline as a ghost on TEMPLATE, or the file's rocker figures on ROCKER, after the board
  opens (needs the saved board to hold the file's lines).
- Fitting wings, rails or bottom contours from the file.
- Import my designs (account) taking `.brd`.

## House rules that bite here

- Work in THIS checkout: `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`, branch
  `close-bottom-17` (HEAD 74faf9e0; origin/main is 15beb4c3). **Never `cd` into a subfolder** — absolute paths
  and `git -C` only. Never touch `/Users/kontoes/Code/shaper` itself. Nothing is pushed; the founder says when.
- The four AkuShaper sample files in `~/Downloads` (`6'10-Widepoint-Fwd-Egg.brd`,
  `6'2-Round-Tail---Double-Concave.brd`, `Fryer-5'7-Squash-Flyer-Twin.brd`, `Scoop-Noserider.brd`) must NEVER be
  committed or copied into the repo, nor their text. Pictures and PDFs made from them for the founder's look go
  in this task's `pictures/`. The d9b shoot and closeness scripts are in
  `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/` —
  reuse them; keep scratch there.
- `PW_PORT=3117` for Playwright; never start `next dev` by hand; never the whole suite — the new/changed specs
  plus the specs for touched files. `e2e/board-file.spec.ts` test f1 fails on untouched code (a last-digit
  figure, browser vs Node) — known, not ours.
- `npx tsc --noEmit`, `npm run lint`, touched unit tests clean before each commit. Plain-English commit
  messages and SUMMARY. AGENTS.md: read the relevant guide under `node_modules/next/dist/docs/` before page code.
