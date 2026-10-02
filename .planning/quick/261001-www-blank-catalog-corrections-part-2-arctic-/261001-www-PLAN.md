---
phase: quick-261001-www
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - db/seed/blanks/arctic_foam_stations.csv
  - db/seed/blanks/us_blanks_stations.csv
  # Only if a picture fails, or shows a figure this round changed, AND the difference is proven to come from this
  # round (Task 2 step 3). Expected: nothing re-recorded.
  - e2e/desktop-baseline.spec.ts-snapshots/
  - .planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-SUMMARY.md
autonomous: true
requirements: [QT-261001-www, TODO-2026-10-01-fix-the-blank-catalogue-dims]
estimate:
  # One executor in its own git worktree. Two tasks, no code written:
  # - Task 1: one tool run, three throwaway probes (preset litres, read-back, and the base CSVs to compare against),
  #   two generator runs, the whole unit suite twice.
  # - Task 2: the browser suite in three foreground runs (~35 min), five reference pictures viewed, tsc, lint, SUMMARY.
  # estimate-calibration: factor 1, 0 samples, so confidence is low. Part 1 (three tasks, one of them writing code)
  # used about 156k; this round has no code and one fewer task.
  tokens: 85000
  raw_tokens: 85000
  tasks: 2
  confidence: low
must_haves:
  truths:
    - "On ROCKER, Arctic Foam's 10'2\" LB, 9'4\" G, 9'9\" G and 10'6\" G read the inch figure printed on their June 2022 catalog pages at all 29 cells in 261001-www-CORRECTIONS.md section A (for example the 9'9\" G's rocker 12\" from the nose reads 3 7/8\", not 4 13/16\"), and each of those 13 rows' DATASHEET note now says the catalog's centimetre figure disagrees with the inch figure and the inch was used (founder decision 1, 2026-10-01)."
    - "The six US Blanks numbers in section B take the sister blank's figure (for example the 6'2\"A's thickness 18\" from the nose reads 2 7/16\", not 3 1/16\"), and each row's note says what the page prints and where the figure used comes from (founder decision 2, 2026-10-01)."
    - "Nothing outside the list moves: the 7'9\"HX keeps 71.2 L and the 8'4\"SPX 84.0 L as the page prints them (founder decision 3), every other blank and every other station reads exactly as before, still 101 US Blanks / 33 Arctic Foam / 28 Marko Foam with 158 pickable, and the Marko file is byte-identical."
    - "The four presets still open in the same blanks (none is in this round): lib/blanks/preset-blanks.generated.json is byte-identical and the four preset cards' litres are identical to the last digit."
    - "A board a shaper already saved never moves (it carries its own copy of its blank), and Phase 11's recorded boards still reproduce exactly: the pinned-blanks generator reports 9 blanks differing from today's catalogue (part 1's six plus 6'4\"EAX, 7'2\"X EPS and Arctic 9'9\" G) while its fixture and phase11-foil-golden.json stay byte-identical."
    - "The unit suite passes with no test edited, the type check, lint and the whole browser suite pass, and a desktop reference picture is re-recorded only if it shows a figure this round changed — proven, not assumed."
  artifacts:
    - path: "db/seed/blanks/arctic_foam_stations.csv"
      provides: "the 13 corrected Arctic rows (29 cells), CRLF kept, each row's note rewritten to say the inch figure was used"
      contains: "catalog cm (39.16 cm = 15.417 in) disagrees with inch (17 1/5”); used inch"
    - path: "db/seed/blanks/us_blanks_stations.csv"
      provides: "the 6 corrected US Blanks rows, CRLF kept, each with its sister-blank note"
      contains: "the 6'2\"\"AX less 1/4\"\""
    - path: ".planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-SUMMARY.md"
      provides: "what changed for a shaper, the founder's three decisions, the five cells beyond 'the 12-inch stations' and why, and the evidence"
      contains: "status: complete"
  key_links:
    - from: ".planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-corrections.json"
      to: "db/seed/blanks/arctic_foam_stations.csv and db/seed/blanks/us_blanks_stations.csv"
      via: "261001-www-apply-corrections.py, run once from the worktree root; writes neither file unless every old value and old note is found"
      pattern: "lines changed in db/seed/blanks/"
    - from: "db/seed/blanks/*.csv"
      to: "the ROCKER list and DATASHEET"
      via: "lib/blanks/seed-files.ts readSeedCatalog (the tests, the generators and the browser suite's SHAPER_BLANKS_SOURCE=seed-csv all read it)"
      pattern: "readSeedCatalog"
    - from: "db/seed/blanks/*.csv"
      to: "lib/geometry/__fixtures__/phase11-foil-golden-blanks.json"
      via: "NOT linked on purpose: the fixture is pinned from git at 7b2a499, so this round shows up only as the generator's '9 differ' line"
      pattern: "9 differ from today's catalogue"
---

<objective>
Apply the second round of blank-catalogue corrections — exactly the list in `261001-www-CORRECTIONS.md`, applied from
`261001-www-corrections.json` by `261001-www-apply-corrections.py` — to the Arctic Foam and US Blanks catalogue files,
and prove nothing else in the app moved.

These are the founder's three decisions of 2026-10-01, made on the question cards of the findings sheet:
1. Arctic Foam's four June 2022 pages (10'2" LB, 9'4" G, 9'9" G, 10'6" G) — "The inch figures": 29 numbers in 13 rows
   now follow the page's inch figure instead of its centimetre figure, and each row's note says so.
2. Six US Blanks numbers the catalog prints wrong in both units — "The sister-blank figure, with a note": each takes
   the figure its sister blank (the same blank made thicker by a fixed amount) says it should be.
3. The 7'9"HX and 8'4"SPX litres — "Keep the page's litres": nothing changes for those two.

Five of the 29 Arctic cells sit outside the founder's literal wording ("the 12-inch stations": 24 cells). They are the
same four pages' remaining cells carrying the same note — the 10'2" LB's width 3" back from the nose, the 9'4" G's two
tip rockers, the 9'9" G's centre and nose-tip thickness — changed with the rest so that no curve is drawn through a mix
of the page's two sets of figures (CORRECTIONS.md section A explains this). They are part of the locked list.

Purpose: the founder's todo `2026-10-01-fix-the-blank-catalogue-dims-the-founder-knows-are-wrong.md` — a shaper picking
one of these blanks on ROCKER must see the numbers the founder chose from the page in their hand. Part 1 (quick
261001-v1q) already did the rest of that todo, including pinning Phase 11's recorded boards to their blanks as they were;
that pinning is DONE and is not repeated here.

Output: the two corrected catalogue files (one `fix(blanks):` commit), any proven re-recorded desktop picture (expected:
none), and the SUMMARY committed last.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-CORRECTIONS.md
@.planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-apply-corrections.py
@.planning/quick/261001-v1q-blank-catalog-corrections-part-1-us-blan/261001-v1q-SUMMARY.md
@lib/blanks/seed-files.ts

Facts measured at plan time (2026-10-01, on HEAD 82de081, which already holds part 1) — confirm cheaply, do not
re-derive:

- **The JSON.** `261001-www-corrections.json` is `{ files: { <csv path>: [entry, ...] } }` with two paths:
  `db/seed/blanks/arctic_foam_stations.csv` (13 entries, 29 cells) and `db/seed/blanks/us_blanks_stations.csv`
  (6 entries, 6 cells). Each entry has `vendor`, `blank` (the blank's name), `station` (the label, e.g. `T12`, `N12`,
  `C`, `N0`), `page`, `cells` (each `{ column, old, new, ... }`, `column` one of `width_in` / `thickness_in` /
  `rocker_in`, `old` a number, `new` a string), `flag_old` and `flag_new` (UTF-8; the Arctic notes contain a curly
  closing quote). The ten blanks: Arctic 10'2" LB, 9'4" G, 9'9" G, 10'6" G; US Blanks 6'2"A, 6'4"EAX, 7'2"X EPS, 8'0"H,
  8'4"SPX, 10'6"AX.
- **The tool** takes ONE argument, the JSON's path, and writes the two paths the JSON names relative to the current
  directory — so it must run from the worktree root. Dry run on a copy printed exactly
  `13 lines changed in db/seed/blanks/arctic_foam_stations.csv` then `6 lines changed in db/seed/blanks/us_blanks_stations.csv`.
  It asserts CRLF throughout, that every line round-trips through its own quoting, every old value and every old note,
  and writes neither file unless both pass.
- **The reader.** `readSeedCatalog(dir?)` (`lib/blanks/seed-files.ts`) takes an optional directory, so a probe can read
  BASE's files from a scratch copy and HEAD's from the repo. A station (`BlankStation`, `lib/geometry/blank.ts`) has
  `label`, `fromTailMm`, `rockerMm`, `thicknessMm`, `widthMm` (full width) and `flag`; convert with `mmToInches`
  (`lib/geometry/units.ts`). `isPickable` is in `lib/blanks/catalog.ts`.
- **Presets.** None of the four preset blanks (6'3"RP, 5'10"RP, 7'4"SP, 9'3"Y) is in this round;
  `scripts/generate-preset-blanks.ts` after the patch leaves `lib/blanks/preset-blanks.generated.json` byte-identical.
  The four preset cards' litres (`presetSummary(preset).volumeLitres` over `BOARD_PRESETS`) were 29.410053261414706,
  35.04695638572988, 50.27691945917586, 75.30048759197255 at part 1's end.
- **Phase 11's pinned blanks.** Three of this round's blanks are pinned in
  `lib/geometry/__fixtures__/phase11-foil-golden-blanks.json`: Arctic Foam 9'9" G, US Blanks 6'4"EAX, US Blanks
  7'2"X EPS. Before this round `scripts/extract-phase11-golden-blanks.ts` reports 6 differing (part 1's 6'0"P, 6'5"R,
  6'5"X EPS, 6'9"EAX, 7'11"A, 9'2"A); after it, 9; the fixture stays byte-identical either way.
- **Unit suite** on a corrected copy: 3,614 passed, 2 skipped, 0 failed, no test edited.
- **The ROCKER reference picture.** `rocker-desktop-desktop-darwin.png` shows the default 6'0" x 19" board with no blank
  picked; its first list rows are 6'2"A, 6'2"AX, 6'2" MF, 6'4" SBM. A plan-time probe judged that default board
  (`DEFAULT_BOARD_SPEC`, the out-of-the-box cut, `toFitSettings(DEFAULT_FIT_DEFAULTS)`) against BASE's catalogue and a
  corrected copy through `prepareBlank` + `listBlanks`, the same functions `components/rocker/use-blank-list.ts` uses:
  141 rows on both, **0 rows differ** in group (FITS / WON'T FIT), order, placement or worst shortfall. The 6'2"A's
  corrected station (thickness 18" from the nose) is not printed on its list row. So no picture is expected to change.
- **Browser suite** (part 1's run on the part 1 catalogue, same specs): desktop 180 passed / 148 skipped, iphone
  199 / 129, android 206 / 122, 0 failed. Not measured for this round.
- No app code changes, no test changes, no database step for the executor (the orchestrator reseeds the development
  database after the merge), saved boards carry their blank by value.
- A fresh worktree may have no `node_modules`. Part 1's executor cloned the main checkout's with
  `cp -Rc /Users/kontoes/Code/shaper/node_modules ./node_modules` run from the worktree root (git-ignored, an APFS
  copy-on-write copy, takes seconds). Do the same if `node_modules` is missing.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Apply the corrections to the Arctic Foam and US Blanks catalogue files and prove nothing else moved</name>
  <files>db/seed/blanks/arctic_foam_stations.csv, db/seed/blanks/us_blanks_stations.csv</files>
  <read_first>.planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-CORRECTIONS.md (the locked list), .planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-apply-corrections.py, lib/blanks/seed-files.ts, lib/geometry/blank.ts lines 16–45 (BlankStation / BlankRecord fields)</read_first>
  <action>
The corrections are LOCKED (the founder's three decisions of 2026-10-01): apply exactly `261001-www-corrections.json`
with its tool; never edit either CSV, the JSON or the tool by hand, and never add, drop or alter a correction. The tool
and the JSON stay in the quick-task folder as the record — do not move or copy them into scripts/.

0. Setup. Confirm `git rev-parse --show-toplevel` is your worktree (not /Users/kontoes/Code/shaper) and run every
   command from that root. If `node_modules` is missing, run `cp -Rc /Users/kontoes/Code/shaper/node_modules ./node_modules`.
   Record the starting commit with `git merge-base HEAD main` — it is called BASE below (shell variables do not survive
   between commands, so paste the hash or write `$(git merge-base HEAD main)` in each command). Run `npm test` once and
   note the count (expected 3,614 passed, 2 skipped). If the sandbox refuses a compound command as too complex, run its
   parts as separate commands — that is not a deviation.
1. Before the tool runs, in your session scratch directory (OUTSIDE the repository, never committed):
   - write BASE's three catalogue files there with `git show BASE:db/seed/blanks/<file>` redirected into a `base-csv`
     folder, one per file under `db/seed/blanks/` (keep the bytes; this is what the read-back probe compares against);
   - write a throwaway tsx probe that prints `presetSummary(preset).volumeLitres` for each of `BOARD_PRESETS`
     (`@/lib/geometry/presets`, `@/lib/geometry/summary-line`), run it with
     `npx --no-install tsx --tsconfig ./tsconfig.json <probe>` and keep the four figures (expected: the four in the
     context block);
   - run `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase11-golden-blanks.ts` and note its last
     line (expected: "(37 blanks, 6 differ from today's catalogue)"); `git diff --exit-code -- lib/geometry/__fixtures__/phase11-foil-golden-blanks.json` clean.
2. Run the tool exactly once, from the worktree root:
   `python3 .planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-apply-corrections.py .planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-corrections.json`.
   Expected output, exactly two lines: "13 lines changed in db/seed/blanks/arctic_foam_stations.csv" and
   "6 lines changed in db/seed/blanks/us_blanks_stations.csv". If it prints anything else or an assertion fires, STOP
   and report the exact output — do not retry, do not edit any file.
3. Diff shape: `git diff --numstat BASE -- db` lists exactly two lines, `13 13 db/seed/blanks/arctic_foam_stations.csv`
   and `6 6 db/seed/blanks/us_blanks_stations.csv`; `git diff --exit-code BASE -- db/seed/blanks/marko_foam_stations.csv`
   is clean; and a `python3 -c` check on each of the two changed files finds no bare newline once every CRLF is removed.
4. Read the catalogue back through the tested reader with a second throwaway probe (scratch directory, never
   committed). It loads the JSON (UTF-8), `readSeedCatalog()` (HEAD) and `readSeedCatalog(<scratch>/base-csv)` (BASE),
   and types no figure — every expected value comes from the JSON or from BASE:
   - for each of the 19 entries: the blank (by `vendor` and `blank`) has exactly one station with that `label` in both
     catalogues; for each cell, the field (`rocker_in` → `rockerMm`, `thickness_in` → `thicknessMm`, `width_in` →
     `widthMm`) converted with `mmToInches` equals `Number(new)` within 1e-9 at HEAD and `Number(old)` within 1e-9 at
     BASE; the station's `flag` equals `flag_new` exactly at HEAD and `flag_old` exactly at BASE;
   - nothing else moved: set the listed fields and the flag of the 19 listed stations aside on both sides, then
     `JSON.stringify` of every HEAD record equals that of the BASE record with the same vendor and name, and both
     catalogues hold the same vendor + name pairs in the same order. This covers the 7'9"HX's and 8'4"SPX's litres the
     founder kept (decision 3), every name and slug, and every station outside the list;
   - exactly ten records differ between HEAD and BASE before the set-aside (the ten blanks named in the context block);
   - counts at HEAD: 101 US Blanks, 33 Arctic Foam, 28 Marko Foam, 158 pickable by `isPickable`.
   Print "all 35 cells and 19 notes read back; 10 blanks changed, nothing else moved (101 / 33 / 28, 158 pickable)"
   and exit non-zero on any mismatch. A mismatch is a stop-and-report.
5. Presets: run `npx --no-install tsx --tsconfig ./tsconfig.json scripts/generate-preset-blanks.ts`, then
   `git diff --exit-code -- lib/blanks/preset-blanks.generated.json` must be clean (none of the four preset blanks is in
   this round). A difference is a stop-and-report: restore the file with `git checkout -- lib/blanks/preset-blanks.generated.json`
   and report what changed. Re-run the step-1 litres probe: the four figures must be identical to step 1's. A
   difference is a stop-and-report too (the preset file did not change, so nothing should move them).
6. Phase 11's pinned blanks: re-run `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase11-golden-blanks.ts`.
   Expected last line "(37 blanks, 9 differ from today's catalogue)", the nine being 6'0"P, 6'5"R, 6'5"X EPS, 6'9"EAX,
   7'11"A, 9'2"A, 6'4"EAX, 7'2"X EPS and Arctic Foam 9'9" G; then
   `git diff --exit-code BASE -- lib/geometry/__fixtures__/phase11-foil-golden-blanks.json lib/geometry/__fixtures__/phase11-foil-golden.json`
   is clean. That is the proof Phase 11's recorded boards are untouched by this round.
7. `npm test`: every test passes, the same count as step 0 (expected 3,614 passed, 2 skipped). A failing test is a
   stop-and-report — do not edit any test. Then `git status --short` must list only the two CSVs (restore
   `next-env.d.ts` or `AGENTS.md` with `git checkout --` if a tool rewrote them; the quick-task folder is already
   committed).
8. Commit exactly the two CSVs. Write your own subject, fresh (never copied from part 1), in plain English for a
   shaper, prefix `fix(blanks):`, saying that Arctic Foam's 10'2" LB, 9'4" G, 9'9" G and 10'6" G now follow the inch
   figures on their catalog pages and that six US Blanks numbers the catalog misprints now take the sister blank's
   figure. Body, two to four plain sentences: these apply the founder's three decisions of 2026-10-01; every change,
   its catalog page and its evidence is listed in the quick task's CORRECTIONS file, and each corrected row's DATASHEET
   note says what the page prints and which figure the app uses; the 7'9"HX and 8'4"SPX keep the litres their pages
   print; saved boards are unaffected (they keep their own copy of their blank) and no preset's blank changed. End with
   the attribution line from the environment's instructions.
  </action>
  <verify>
    <automated>git diff --numstat $(git merge-base HEAD main) -- db && git diff --exit-code $(git merge-base HEAD main) -- db/seed/blanks/marko_foam_stations.csv lib/blanks/preset-blanks.generated.json lib/geometry/__fixtures__/phase11-foil-golden.json lib/geometry/__fixtures__/phase11-foil-golden-blanks.json && npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase11-golden-blanks.ts && git diff --exit-code -- lib/geometry/__fixtures__/phase11-foil-golden-blanks.json && npm test</automated>
  </verify>
  <acceptance_criteria>
    - The tool's single run printed exactly "13 lines changed in db/seed/blanks/arctic_foam_stations.csv" and "6 lines changed in db/seed/blanks/us_blanks_stations.csv".
    - `git diff --numstat BASE -- db` shows `13 13` for the Arctic file and `6 6` for the US Blanks file and nothing else; both files are CRLF throughout.
    - The read-back probe prints its "all 35 cells and 19 notes read back; 10 blanks changed, nothing else moved" line with 101 / 33 / 28 and 158 pickable.
    - `marko_foam_stations.csv`, `lib/blanks/preset-blanks.generated.json`, `phase11-foil-golden.json` and `phase11-foil-golden-blanks.json` are byte-identical to BASE; the four preset litres are identical before and after.
    - The pinned-blanks generator reports 9 differing (6 before the tool); `npm test` passes with the step-0 count; the commit holds exactly the two CSVs.
  </acceptance_criteria>
  <done>The two catalogue files carry exactly the 19 corrected lines of the locked list, read back through the tested reader with nothing else moved, the presets' blanks and litres untouched, Phase 11's recorded boards untouched, every unit test green with no test edited, and one `fix(blanks):` commit holds exactly the two CSVs.</done>
</task>

<task type="auto">
  <name>Task 2: The browser suite, the desktop reference pictures, types, lint and the SUMMARY</name>
  <files>e2e/desktop-baseline.spec.ts-snapshots/ (only a picture proven to show a figure this round changed — expected none), .planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-SUMMARY.md</files>
  <read_first>playwright.config.ts lines 13–60 (port and the seed-csv catalogue source), e2e/desktop-baseline.spec.ts lines 55–115 (how the pictures are taken, the ROCKER shot), components/rocker/use-blank-list.ts lines 124–191 (how the list builds its fit context — only if a picture differs)</read_first>
  <action>
The suite starts its own dev server and reads the catalogue from the CSVs (`SHAPER_BLANKS_SOURCE=seed-csv`), so the
corrected numbers reach it. Always use `PW_PORT=3182 IS_WEBPACK_TEST=1`; never ports 3000, 3100, 3120 or 3190, never
touch `.next/dev/lock`, never edit a spec.

1. Run the whole browser suite as three foreground commands, one per project, each with a 600000 ms timeout:
   `PW_PORT=3182 IS_WEBPACK_TEST=1 npx playwright test --project=desktop --reporter=line`, then the same with
   `--project=iphone` and `--project=android`. If a run is cut off by the timeout, re-run that project with
   run_in_background and wait for it to exit. Note each project's passed / skipped / failed counts (part 1's: desktop
   180 / 148 / 0, iphone 199 / 129 / 0, android 206 / 122 / 0).
2. Expected: everything passes. ANY failure is a stop-and-report unless step 3 proves it is a desktop reference picture
   whose difference comes from this round: write what failed and its error verbatim into the SUMMARY and stop; do not
   fix it, do not edit a spec.
3. Reference pictures. Open each of the five PNGs in `e2e/desktop-baseline.spec.ts-snapshots/` with Read. None should
   show a figure this round changed: the ROCKER picture has no blank picked and its visible rows (6'2"A, 6'2"AX,
   6'2" MF, 6'4" SBM) print length, litres and centre thickness, none of which this round touches; the other four show
   no blank figures. If all five desktop-baseline tests passed and no picture shows a changed figure, re-record nothing.
   Only if `rocker-desktop` failed in step 1 (or visibly shows a figure from the CORRECTIONS list):
   - re-record it alone with `PW_PORT=3182 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop --update-snapshots=all -g "ROCKER"`,
     write BASE's copy to your scratch directory with `git show BASE:e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png`,
     and Read old and new; write down the first list rows each shows (name, group, litres, length, centre);
   - prove where the difference comes from with a throwaway tsx probe in your scratch directory: build the default
     board's fit context the way `useBlankList` does with no blank picked — `DEFAULT_BOARD_SPEC`'s outline and foil
     (`@/lib/geometry/board`), half-width from `buildOutline` + `sampleOutline` (`@/lib/geometry/outline`), both
     fine-tunes `mm(0)`, Deck Skin and Tip Style from `DEFAULT_FIT_DEFAULTS` (`@/lib/fit-defaults-preference`), the
     fine-tune surface from `DEFAULT_BLANK_CUT` (`@/lib/geometry/blank`) — and for both `readSeedCatalog(<scratch>/base-csv)`
     and `readSeedCatalog()` run the pickable records through `prepareBlank` and `listBlanks(..., toFitSettings(DEFAULT_FIT_DEFAULTS))`
     (`@/lib/geometry/blank-fit`), then print every row whose group, position, placement or worst shortfall differs;
   - keep the new picture ONLY if every row that moved in the picture is a blank named in the corrections JSON, the
     probe shows those same rows (and only blanks from the JSON) moving, and nothing else in the picture differs.
     Otherwise restore it with `git checkout BASE -- e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png`
     and stop-and-report. Note: the same probe at plan time found 0 of 141 rows differing, so a differing ROCKER picture
     is most likely NOT from this round — expect to stop and report it.
   A difference in any of the other four pictures is a stop-and-report (they show no blank). If a picture was kept,
   run `PW_PORT=3182 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` once more —
   all five pass — and commit only that PNG with your own plain-English subject (prefix `test(e2e):`) saying which
   blank figures the ROCKER reference picture now shows and why, plus the attribution line.
4. `npx tsc --noEmit` (if a fresh worktree reports missing generated route types, run `npx next typegen` first, then
   tsc again) and `npm run lint` — both clean. `npm run build` is NOT run here (Turbopack cannot build in a worktree; the
   orchestrator builds on main after the merge). No database step: the orchestrator reseeds the development database
   from the main checkout after the merge.
5. If `git status --short` shows `next-env.d.ts`, `AGENTS.md` or anything else rewritten by the dev server or typegen,
   restore it with `git checkout --`.
6. Write the SUMMARY at `.planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-SUMMARY.md`
   inside the worktree (if your Write tool refuses the path, write it in your scratch directory and `cp` it in via
   Bash), with `status: complete` in its frontmatter. Plain English for a shaper first:
   - that these changes apply the founder's three decisions of 2026-10-01: Arctic Foam's four June 2022 pages take the
     page's inch figures; six US Blanks numbers the catalog prints wrong take the sister blank's figure, with a note;
     the 7'9"HX and 8'4"SPX keep the litres their pages print;
   - which blanks changed and how they now read on ROCKER and in its DATASHEET notes (a couple of examples from the
     CORRECTIONS tables, e.g. the 9'9" G's rocker 12" from the nose 3 7/8", the 6'2"A's thickness 18" from the nose
     2 7/16");
   - plainly, that five of the 29 Arctic cells are outside the founder's literal wording ("the 12-inch stations") — the
     10'2" LB's width 3" back from the nose, the 9'4" G's two tip rockers, the 9'9" G's centre and nose-tip thickness —
     and that they were changed with the rest because they carry the same note on the same pages, so no curve is drawn
     through a mix of the page's two sets of figures (CORRECTIONS.md section A);
   - that saved boards do not move, no preset's blank changed and the four preset cards' litres are identical.
   Then the evidence: BASE, the commit hashes, the tool output, the diff numstat, the read-back probe's line, the preset
   file and litres checks, the pinned-blanks generator's "6 differ" before and "9 differ" after, unit counts before and
   after, the three Playwright results, which pictures were re-recorded and why (or that none were), tsc and lint. End
   with what the orchestrator still does after the merge: `npm run build` on main, reseed the development database from
   the main checkout and run the seed's `--check`; nothing goes to production in this task and nothing is pushed.
7. Commit the SUMMARY as the LAST commit in the worktree, subject `docs(quick-261001-www): summary` followed by a short
   plain-English phrase of your own, plus the attribution line — the worktree is removed after the merge and an
   uncommitted SUMMARY would be lost. Do not touch CLAUDE.md, ROADMAP.md, STATE.md, the todo file, part 1's folder,
   app code or any test.
  </action>
  <verify>
    <automated>PW_PORT=3182 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop && npx tsc --noEmit && npm run lint && test -f .planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-SUMMARY.md && git diff --exit-code $(git merge-base HEAD main) -- lib components app e2e/*.ts</automated>
  </verify>
  <acceptance_criteria>
    - All three Playwright projects pass (or the run stopped and the SUMMARY reports the unexplained failure verbatim).
    - Every PNG under `e2e/desktop-baseline.spec.ts-snapshots/` is byte-identical to BASE's, unless re-recorded with the probe's proof recorded in the SUMMARY.
    - `npx tsc --noEmit` and `npm run lint` are clean; no file under lib/, components/, app/ or any spec differs from BASE.
    - The SUMMARY has `status: complete`, names the founder's three decisions of 2026-10-01, and explains the five cells beyond "the 12-inch stations".
    - `git log --format=%s -1` starts with `docs(quick-261001-www): summary`, and `git status --short` is empty.
  </acceptance_criteria>
  <done>The browser suite passes on the corrected catalogue, no reference picture holds a stale or unexplained figure, types and lint are clean, and the SUMMARY is committed last in the worktree.</done>
</task>

</tasks>

<source_coverage>
| Source | Item | Covered by |
|--------|------|-----------|
| GOAL (todo) | Fix the blank dims the founder knows are wrong, each with its source | Task 1 (the locked list, each row naming its catalog page) |
| Founder decision 1 | Arctic Foam's four 2022 pages take the inch figures: 29 cells in 13 rows, notes rewritten | Task 1 steps 2–4 |
| CORRECTIONS A | The five cells beyond "the 12-inch stations", changed with the rest | Task 1 steps 2–4 (in the JSON); Task 2 step 6 (SUMMARY says so and why) |
| Founder decision 2 | Six US Blanks numbers take the sister blank's figure, each with a note | Task 1 steps 2–4 |
| Founder decision 3 | 7'9"HX and 8'4"SPX keep the page's litres | Task 1 step 4 (nothing outside the list moved, read back against BASE) |
| Todo | Fix in the CSVs, never a hand edit of the database | Task 1 (CSV via the tool); the reseed is the orchestrator's after the merge |
| Todo | Presets' blanks and the four cards' litres re-checked | Task 1 steps 1 and 5 |
| Todo | Saved boards and Phase 11's recorded boards unaffected | Task 1 step 6 (9 differ, fixtures byte-identical) |
| Excluded | Part 1's pinning task; the twelve inch-label slips, the 10'0"T's name, repeated addresses, length and deck-length rounding, 48-inch zero rockers, the Marko grid | CORRECTIONS "Not changed" and part 1 — not in this task |
</source_coverage>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| catalog page to catalogue file | A number a shaper will cut foam to crosses from the maker's page into the app here |
| catalogue file to new picks | Every new pick on ROCKER copies these rows; a wrong or broken row reaches every shaper who picks that blank |
| catalogue to saved boards | A saved board carries its own copy of its blank; a catalogue change must never reach it |
| tests to recorded numbers | A reference picture re-recorded without proof can hide a regression |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-www-01 | Tampering (a wrong number reaches a shaper's cut) | the two catalogue CSVs | high | mitigate | Only the locked JSON is applied, by a tool that refuses to write unless every old value and note is found and each file round-trips byte for byte; the read-back probe checks all 35 cells and 19 notes through `readSeedCatalog` against the JSON and proves every other record equals BASE; `git diff --numstat` must show 13 + 6 lines. |
| T-www-02 | Repudiation (a shaper holding the page can't see why the app differs from it) | the 19 corrected rows | medium | mitigate | Each row's note says what the page prints and which figure was used, read back exactly by the probe; CORRECTIONS.md names the page and evidence for every change; the SUMMARY records the founder's three decisions and the five cells beyond the card's wording. |
| T-www-03 | Tampering (a saved board or a recorded Phase 11 number moves) | saved boards, phase11 fixtures | high | mitigate | Boards carry their blank by value; no migration; the pinned-blanks generator reports 9 differing while both Phase 11 fixtures stay byte-identical and the whole unit suite passes untouched. |
| T-www-04 | Tampering with test evidence (a picture re-recorded to hide a regression) | e2e/desktop-baseline.spec.ts-snapshots/ | medium | mitigate | A picture is kept only if a probe over the same list functions shows exactly the JSON's blanks moving and the picture differs by those rows alone; plan-time probe found 0 rows differing, so a difference is expected to be a stop-and-report. |
| T-www-05 | Denial of service (a malformed row empties the ROCKER list) | catalogue reader | medium | mitigate | `catalog.test.ts`'s counts and part 1's station-position guard run on the corrected files; the probe confirms 101 / 33 / 28 and 158 pickable; the browser suite runs ROCKER on the CSV source. |
| T-www-06 | Information disclosure | all | low | accept | No secret, request, storage or database is touched; the worktree has no environment file. |
| T-www-SC | Tampering | npm/pip installs | low | accept | No package is installed; the tool uses Python's standard library only. |
</threat_model>

<verification>
- `git log --oneline BASE..HEAD` shows the Task 1 commit (`fix(blanks):`), an optional proven `test(e2e):` commit
  (expected: none), and the SUMMARY commit last.
- `git diff --numstat BASE -- db` lists `13 13` for `arctic_foam_stations.csv` and `6 6` for `us_blanks_stations.csv`,
  nothing else; `git diff --exit-code BASE -- db/seed/blanks/marko_foam_stations.csv lib/blanks/preset-blanks.generated.json lib/geometry/__fixtures__/phase11-foil-golden.json lib/geometry/__fixtures__/phase11-foil-golden-blanks.json lib components app` is clean.
- `npm test`, `npx tsc --noEmit`, `npm run lint` and all three Playwright projects are green in the worktree.
- `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase11-golden-blanks.ts` leaves its fixture
  byte-identical and reports 9 blanks differing from today's catalogue.
</verification>

<success_criteria>
- The ten corrected blanks read on ROCKER and in its DATASHEET exactly as CORRECTIONS.md lists them, each row with its
  new note — the founder's decisions 1 and 2 of 2026-10-01.
- No other blank, no other station, no Marko number, no litres (decision 3), no preset blank and no preset card's
  litres changed.
- No saved board and no recorded Phase 11 number moved.
- No expected number was typed by hand; every check reads its expectation from the JSON, from BASE or from a generator.
</success_criteria>

<output>
Create `.planning/quick/261001-www-blank-catalog-corrections-part-2-arctic-/261001-www-SUMMARY.md` (Task 2, step 6) and
commit it as the worktree's last commit.
</output>
