# Brief — quick 261113-gwo: the .brd preview suggests a blank from each maker

Third step of opening a `.brd` (read first: `.planning/quick/261113-d9b-*/` and `.planning/quick/261113-et0-*/`
— BRIEF, PLAN, SUMMARY of each; both built today on this branch). Open a board file… takes a `.brd`; the
preview shows the file with our closest fit laid over it, three tables (widths, rocker, thickness — the file
beside our fit, at the app's five stations), Print Overview (a one-page PDF) and Open as a Board.

## The founder (2026-11-13, after seeing et0's pictures — locked)

> "do the display fix, open the dev server for me to try it. It looks promising, so we should then try to fit
> bottom contours and rail shapes too. Maybe suggest a blank (from each mfg?) that gets the rocker very close."

Earlier the same day: "for rocker, we'll want to display their rocker data at our 5 stations, so the user can
pick a blank and customize it's rocker to fit exactly if they desire."

THIS task is the last sentence only: **suggest a blank, one from each maker, that gets the rocker very close.**
(Bottom contours are quick 261113-gwr, planned in parallel with this one and built right after it; rails come
after that. Do not touch them here.)

## What "suggest a blank" means (my reading — flag anything you change)

- For each maker in the catalogue (four today: see `db/seed/blanks/` and `lib/db/blanks.ts`), among the blanks
  **the fitted board actually fits inside** by the app's own rules (`lib/geometry/blank-fit.ts`,
  `blank-reasons.ts` — length, width, thickness/foam, at the best placement along the blank, with the shaper's
  own Tip Style / fit defaults the way ROCKER's Pick a Blank judges it), the one whose rocker under the board
  comes closest to **the file's** rocker — the file's bottom line, not our hand-set fit of it. Closeness is the
  same kind of figure the preview already quotes: the largest gap and where, from 1" in at each tip (and say it
  in the app's own way: nose rocker and tail rocker differences at the stations a shaper reads).
- A maker with no blank the board fits in says so plainly ("no blank this board fits in") rather than showing a
  bad match.
- **Customize Rocker:** the app can bend a blank's rocker (`lib/geometry/custom-rocker.ts`, the maker's order
  code written by `formatRockerNote`, e.g. `-1/4"N18" +1/8"T36"` — always inches). Measure whether, for the
  suggested blank, the bends that bring it closest to the file can be worked out quickly and land inside what
  Customize Rocker allows. If yes, show them beside the blank ("with -1/4"N18" it is within 1/16""). If it is
  not cheap or not reliable, leave it out and say so in the plan — the suggestion alone is the ask.
- Shown in the preview (a small block under the rocker table) AND on the printed overview, in the shaper's
  system through `units.ts` / `measure-display.ts` (the blank's name and the order code stay as the maker
  writes them — CLAUDE.md Rule 2's third printed-page note).
- **A suggestion only.** Open as a Board still opens with NO blank picked (the founder: "so the user can pick a
  blank"). Do not auto-pick. The line under the rocker table already tells the shaper to pick a blank on ROCKER;
  the suggestions make that line concrete.
- The catalogue lives on the server (Neon in production, the committed CSVs when `SHAPER_BLANKS_SOURCE=seed-csv`
  — the suite and the founder's dev server use that). Find how ROCKER's Pick a Blank gets it to the browser and
  get it to the home page's preview the same way, loaded only when a `.brd` is being looked at (the home page
  must not get heavier for everyone). If the catalogue cannot load, the preview says so quietly and everything
  else still works. The `.brd` itself still never leaves the browser.

## House rules that bite here

- Work in THIS checkout: `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`, branch
  `close-bottom-17`. Never `cd` into a subfolder; never touch `/Users/kontoes/Code/shaper` itself. Nothing is
  pushed. No database migration (reading the catalogue only).
- **A dev server is already running from this checkout on port 3117** with the browser suite's own settings
  (the founder is trying the feature on it). Playwright with `PW_PORT=3117` reuses it. Never stop it, never
  start another `next dev` in this checkout, never run the whole suite.
- The four AkuShaper sample files in `~/Downloads` (`6'10-Widepoint-Fwd-Egg.brd`,
  `6'2-Round-Tail---Double-Concave.brd`, `Fryer-5'7-Squash-Flyer-Twin.brd`, `Scoop-Noserider.brd`) are never
  committed nor their text copied into the repo; pictures and PDFs made from them go in this task's `pictures/`.
  Scratch stays under
  `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/`
  (the earlier tasks' scripts are there: `brdfit/`, `et0/`).
- Rule 1: the matching maths is pure, in `lib/geometry/`, tested (the round trip is the best test: a preset
  shaped in a known blank, exported with the app's own `.brd` writer, read back — its own blank must be that
  maker's suggestion, with a near-zero gap). Rule 2: units. Plain-English words, commit messages and SUMMARY.
- The fit must stay instant: measure the time to rank the whole catalogue in the browser and say it in the plan.
- `e2e/board-file.spec.ts` test f1 fails on untouched code — known, not ours.
