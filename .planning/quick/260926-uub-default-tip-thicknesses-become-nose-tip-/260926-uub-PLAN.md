---
phase: quick-260926-uub
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/foil.ts
  - lib/geometry/foil.test.ts
  - lib/fit-defaults-preference.ts
  - lib/geometry/blank-fit.test.ts
  - lib/geometry/board-profile.test.ts
  - e2e/fit-defaults.spec.ts
  - e2e/new-board.spec.ts
  - e2e/desktop-baseline.spec.ts
  - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
  - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
autonomous: true
requirements: [QT-260926-uub]

estimate:
  # Small in edited lines, heavy in browser-test output. Task 1 is two numbers, four comments, two
  # test helpers and two browser specs, then tsc/vitest/lint and two specs in a browser. Task 2 is
  # two full Playwright runs, a scoped re-record, a pixel check, one header paragraph and a
  # throwaway measuring script, and most of its cost is the runs' console output.
  tokens: 60000
  raw_tokens: 60000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "A brand-new board nobody has touched opens on ROCKER reading Nose Tip — 1/2\" and Tail Tip — 5/8\", and its side view is drawn with those thicker tips."
    - "The gear menu's Fit & Tip Defaults, with nothing chosen, shows Nose Tip Thickness 1/2\" and Tail Tip Thickness 5/8\" in Imperial and 13 mm and 16 mm in Metric, and Restore Defaults brings back exactly those."
    - "A shaper who already chose their own tip defaults (saved on their account or in their browser) keeps them. The account columns, the stored preference format and the rules for reading it back are untouched."
    - "Presets keep their own tips (Phase 11 D-19). lib/geometry/presets.ts, every golden fixture, the generator scripts and the database schema are untouched."
    - "Both values are written in inches through inchesToMm in DEFAULT_FOIL_SPEC and nowhere else. The founder's choice is pinned as a literal exactly once (lib/geometry/foil.test.ts), and every other test or browser test that needs the default reads it from the constant."
    - "The desktop reference pictures of ROCKER (new tip labels, thicker tips) and VOLUME (the default board now 30.06 L, was 29.94 L) are re-recorded after their differences were inspected. TEMPLATE, RAILS and FINS are byte-for-byte what they were, proved with SHA-256 before and after."
    - "tsc, the full unit suite, lint and the full Playwright suite pass, and the SUMMARY tells the founder in plain English what the thicker tips do to the blank list."
  artifacts:
    - path: lib/geometry/foil.ts
      provides: "The out-of-the-box foil: a 1/2\" nose tip and a 5/8\" tail tip, the founder's choice of 2026-09-26"
      contains: "noseTip: inchesToMm(0.5),"
    - path: lib/geometry/foil.test.ts
      provides: "The one literal pin of the founder's two tip values"
      contains: "inchesToMm(5 / 8)"
    - path: e2e/fit-defaults.spec.ts
      provides: "The dialog's expected defaults, derived from DEFAULT_FIT_DEFAULTS through the app's own formatter"
      contains: "formatMark(DEFAULT_FIT_DEFAULTS[key]"
    - path: e2e/new-board.spec.ts
      provides: "The untouched board's Nose Tip label, derived from DEFAULT_FOIL_SPEC"
      contains: "formatMark(DEFAULT_FOIL_SPEC.noseTip"
    - path: e2e/desktop-baseline.spec.ts
      provides: "The re-record record for ROCKER and VOLUME, with the hashes of the three untouched pictures"
      contains: "260926-uub"
    - path: e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
      provides: "ROCKER at 1280px with the 1/2\" and 5/8\" tip labels and the thicker foil near both tips"
    - path: e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
      provides: "VOLUME at 1280px reading the default board's 30.06 L"
  key_links:
    - from: lib/fit-defaults-preference.ts
      to: lib/geometry/foil.ts
      via: "DEFAULT_FIT_DEFAULTS.noseTipThickness / tailTipThickness import DEFAULT_FOIL_SPEC.noseTip / tailTip (unchanged code, so the dialog follows the new values)"
      pattern: "DEFAULT_FOIL_SPEC\\.(noseTip|tailTip)"
    - from: e2e/fit-defaults.spec.ts
      to: lib/fit-defaults-preference.ts
      via: "relative import of DEFAULT_FIT_DEFAULTS and FIT_DEFAULTS_MM_KEYS, formatted with lib/geometry/measure-display.ts formatMark"
      pattern: "from \"\\.\\./lib/fit-defaults-preference\""
    - from: components/rocker/use-blank-list.ts
      to: lib/geometry/foil.ts
      via: "the blank list judges the board with foil.noseTip / foil.tailTip, so a new board's list is judged with the thicker tips (no code change; measured in Task 2)"
      pattern: "noseTip: foil\\.noseTip"
---

<objective>
The founder's instruction, verbatim: "Set these as defaults: Nose Tip Thickness: 1/2", Tail Tip Thickness: 5/8"."

In the app, that means a brand-new board now starts with a 1/2" nose tip and a 5/8" tail tip, where today it starts with 5/16" and 1/4". The gear menu's Fit & Tip Defaults dialog shows the same pair under NEW BOARDS START WITH when a shaper hasn't chosen their own. Presets keep their own tips, and a shaper who already saved their own defaults keeps theirs.

Purpose: the founder has replaced the placeholder tips a planner picked in 04-01 with the numbers he actually shapes to.
Output: the two values changed in `DEFAULT_FOIL_SPEC`. Every test and browser test that pinned the old numbers now reads the constant, and one test pins the founder's choice literally. The ROCKER and VOLUME desktop reference pictures are re-recorded after their differences were inspected. The SUMMARY carries a note for the founder on what the thicker tips do to the blank list.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@lib/geometry/foil.ts
@lib/fit-defaults-preference.ts
@e2e/fit-defaults.spec.ts
@e2e/new-board.spec.ts
@e2e/desktop-baseline.spec.ts

<plan_time_measurements>
Everything below was measured by the planner on main at b662532, in a throwaway worktree with the two values changed. The worktree has since been removed. None of it replaces the executor's own runs; it tells the executor what to expect.

- **Unit suite, only the two values changed:** 74 files, 2,984 passed, 2 skipped, 0 failed. So no unit test, and no golden-fixture test, depends on the default tips. Do not regenerate or edit any `lib/geometry/__fixtures__/*-golden.json`. `phase11-foil-golden.json` carries its own board inputs.
- **The two test helpers switched to derive** (blank-fit.test.ts `defaultBoard`, board-profile.test.ts `boardInput`): blank-fit and board-profile together pass 146 of 146.
- **The two browser specs, edited as in Task 1** (fit-defaults, new-board; three projects; webpack dev server): 24 passed, 3 skipped. The skips are each spec's own phone-only or desktop-only rules. `tsc --noEmit` and eslint are clean.
- **Formatter output:** Imperial defaults read `2"`, `1/8"`, `1"`, `1/8"`, `1/2"`, `5/8"`. Metric reads `51 mm`, `3 mm`, `25 mm`, `3 mm`, `13 mm`, `16 mm`. 1/2" is 12.7 mm and 5/8" is 15.875 mm, shown as whole millimetres.
- **Desktop reference pictures:**
  - ROCKER fails its comparison (494 pixels). Only the station labels over the drawing changed (Nose Tip and Tail Tip now read 1/2" and 5/8"), plus the foil outline near both tips.
  - VOLUME passes its comparison, but its litres figure changed: 29.94 L became 30.06 L (about 565 raw pixels at x 1159–1223, y 361–378). That is under the config's `maxDiffPixels: 100` once Playwright's colour threshold is applied.
  - RAILS is byte-identical.
  - TEMPLATE and FINS show only faint edge-smoothing noise on slider edges and fin icons under the webpack dev server. That is the renderer, not a change.
- **The blank list for the default board** (6'0" × 2 1/2" centre, default outline; seed catalogue, 158 pickable blanks):
  - Pin deck, before and after: 140 fit and 1 is listed as won't fit (Arctic Foam 6'2" F, on width). Same blanks, same order, same placements. The top of the list is US Blanks 6'2"A, centred. The board's tip rocker on it goes from 4 3/4" to 4 9/16" at the nose and from 2 3/8" to 2" at the tail: a thicker tip needs less foam off the bottom, so the bottom lifts less.
  - Bottom: the same 140 and 1. One placement moves (Arctic Foam 6'8" F, from centred to about 4.8 mm off centre). The tip rocker is unchanged at 4 1/4" nose and 1 11/16" tail, because Bottom takes the tips' extra off the deck.
  - Fitting blanks with a tip setting thicker than the cut leaves: before, 0 of 140; after, 2 tails and 1 nose. On those blanks the Pin deck tip rocker falls instead of growing, exactly as Phase 12 D-16 describes.
- **Saved boards from before the foil existed** (snapshot version 1) reopen through `lib/models/design-snapshot.ts`'s `design.foil ?? DEFAULT_FOIL_SPEC` fallback. They will now show the new tips. No stored data changes, and this plan does not change the fallback. It goes in the founder's note.
- **Browser specs importing app code:** `e2e/prod/slider-dots.spec.ts` already imports pure `lib/` modules by relative path. The chain behind `lib/fit-defaults-preference.ts`, `lib/geometry/foil.ts` and `lib/geometry/measure-display.ts` is all relative imports with no `@/` alias, and Playwright loads it (checked with `--list`).
</plan_time_measurements>
</context>

<tasks>

<task type="tracer">
  <name>Task 1: New boards start with a 1/2" nose tip and a 5/8" tail tip, from the constant through the defaults dialog to the ROCKER screen</name>
  <files>lib/geometry/foil.ts, lib/geometry/foil.test.ts, lib/fit-defaults-preference.ts, lib/geometry/blank-fit.test.ts, lib/geometry/board-profile.test.ts, e2e/fit-defaults.spec.ts, e2e/new-board.spec.ts</files>
  <read_first>
    - lib/geometry/foil.ts (DEFAULT_FOIL_SPEC and the doc paragraph above it)
    - lib/geometry/foil.test.ts (the sampleFoil describe; where the new pin goes)
    - lib/fit-defaults-preference.ts lines 70–101 (the DEFAULT_FIT_DEFAULTS doc comment, the constant, FIT_DEFAULTS_RANGE_IN)
    - lib/geometry/blank-fit.test.ts lines 250–265 (the defaultBoard helper) and lines 364–376 (the two-set tip sweep, which stays)
    - lib/geometry/board-profile.test.ts lines 34–47 (the boardInput helper)
    - e2e/fit-defaults.spec.ts lines 1–35 and e2e/new-board.spec.ts lines 1–103
    - lib/geometry/measure-display.ts (`formatMark`) and e2e/prod/slider-dots.spec.ts lines 1–5 (the relative-import precedent)
    - CLAUDE.md Rule 1 and Rule 2
  </read_first>
  <action>
This is the tracer. It is one thin path: the constant, then the defaults the dialog reads, then the dialog and the ROCKER screen in a real browser, with every test that pinned the old numbers moved in the same commit. It is seven files, over the usual five, on purpose. Each edit is one to four lines, and splitting them would leave a commit whose browser tests still assert the old tips.

(a) lib/geometry/foil.ts. In DEFAULT_FOIL_SPEC, set `noseTip` to `inchesToMm(0.5)` and `tailTip` to `inchesToMm(0.625)`: 1/2" and 5/8", the founder's decision of 2026-09-26. Leave `nose12`, `center` and `tail12` exactly as they are. Author both in inches through `inchesToMm` and never type millimetres (CLAUDE.md Rule 2). Rewrite the doc paragraph above the constant, the one that calls the tip pair "a planner choice" flagged "for the founder's own sanity check". It should now say:
- the two tips are the founder's own choice of 2026-09-26 (quick task 260926-uub): a 1/2" nose tip and a 5/8" tail tip;
- they replace a thinner placeholder pair a planner picked in 04-01;
- presets set their own tips (Phase 11 D-19);
- a shaper's own Fit & Tip Defaults, once chosen, still win over these.

Keep the first paragraph (nose12, center and tail12 matching DEFAULT_RAIL_BAND_SPEC and DEFAULT_VOLUME_SPEC) unchanged. Do not write the old tip fractions or the old `inchesToMm` calls anywhere in the new comment; the acceptance greps look for them.

(b) lib/geometry/foil.test.ts. Next to "both tip thicknesses are strictly greater than zero", add one test titled `a new board starts with the founder's 1/2" nose tip and 5/8" tail tip (2026-09-26)`. It asserts `DEFAULT_FOIL_SPEC.noseTip` `toBe(inchesToMm(1 / 2))` and `DEFAULT_FOIL_SPEC.tailTip` `toBe(inchesToMm(5 / 8))`. This is the only place the founder's choice is pinned as a literal. It is a stated spec value, like fit-defaults-preference.test.ts pinning `inchesToMm(2)` for Extra Length, not a prototype golden (Rule 1's no-hand-transcription rule covers goldens). Everything else derives from the constant, so this one pin is what stops a future accidental change from going unnoticed.

(c) lib/fit-defaults-preference.ts. The DEFAULT_FIT_DEFAULTS doc comment (about lines 70–76) quotes the foil's old tip fractions. Make it value-free so it cannot go stale again. The end of that sentence should read: "…Pin deck — `DEFAULT_BLANK_CUT`) and the foil's own nose and tail tips (`DEFAULT_FOIL_SPEC`), each imported rather than restated." Change no code in this file: `noseTipThickness` and `tailTipThickness` already import from DEFAULT_FOIL_SPEC. FIT_DEFAULTS_RANGE_IN stays as it is. Both new tips sit inside the 1/8" to 1 1/2" tip range, and the existing "every number default sits inside its own bounds" test proves it.

(d) lib/geometry/blank-fit.test.ts. The `defaultBoard` helper (about lines 254–263) retypes the old tips, while its doc comment calls them the "Default tip settings". Make it derive: `noseTip: DEFAULT_FIT_DEFAULTS.noseTipThickness` and `tailTip: DEFAULT_FIT_DEFAULTS.tailTipThickness`. DEFAULT_FIT_DEFAULTS is already imported. Make its comment value-free: "The default tip settings (`DEFAULT_FIT_DEFAULTS`) and the out-of-the-box cut — inputs, not expected values." Leave three things alone:
- the explicit two-set sweep in "changing Tip Style or a tip thickness moves no number at or inside the 12" stations" (about lines 372–375). It is about a change between two tip sets, not the default, and the two sets still differ;
- the Marko CSV-relative tips at about lines 226–227;
- the MIN_FOIL_THICKNESS_MM cases.

(e) lib/geometry/board-profile.test.ts. The `boardInput` helper (about lines 36–47) types the two old default tips as fixed inputs, with nothing saying why. Make it derive: `noseTip: DEFAULT_FOIL_SPEC.noseTip` and `tailTip: DEFAULT_FOIL_SPEC.tailTip`. DEFAULT_FOIL_SPEC is already imported.

(f) e2e/fit-defaults.spec.ts. Replace the two hand-typed arrays with arrays derived from the app:
- `IMPERIAL_DEFAULTS` = `FIT_DEFAULTS_MM_KEYS.map((key) => formatMark(DEFAULT_FIT_DEFAULTS[key], "imperial"))`;
- `METRIC_DEFAULTS` = the same with `"metric"`.

Import DEFAULT_FIT_DEFAULTS and FIT_DEFAULTS_MM_KEYS from "../lib/fit-defaults-preference", and formatMark from "../lib/geometry/measure-display". Use relative paths, as e2e/prod/slider-dots.spec.ts already does. FIT_DEFAULTS_MM_KEYS is in the dialog's row order, the same order as FIELD_LABELS. Rewrite the comment above the arrays to say they are read from DEFAULT_FIT_DEFAULTS through the formatter the dialog itself uses, so a changed default moves them with it; name the tips as the founder's 1/2" and 5/8" (2026-09-26) and the rest as the Phase 11/12 decisions it already cites. Leave every other assertion alone. The values the tests type (`3"`, `3/16"`, `1/4"`, the `1/8"` Restore checks) are the tests' own inputs, or the Planer and Deck Skin defaults, which are not changing.

(g) e2e/new-board.spec.ts. Two changes:
- The first Nose Tip label assertion in the D-19 test becomes derived: `Nose Tip — ${formatMark(DEFAULT_FOIL_SPEC.noseTip, "imperial")}`, importing DEFAULT_FOIL_SPEC from "../lib/geometry/foil" and formatMark from "../lib/geometry/measure-display".
- The second default the test types (the `setNoseTipDefault` call after the Tail Tip nudge, currently "1/2") becomes "3/4". Now that 1/2" is the out-of-the-box nose tip, typing it reads like restoring the default rather than choosing a new one. 3/4" is neither the board's own 3/8" nor the default, so "a new default does not reach a board that has already been started" stays unambiguous. Add a few words to the comment above that call saying why.

Keep the first typed default (3/8) and the final assertion that the board still reads 3/8".

Touch nothing else. Specifically not lib/geometry/presets.ts, lib/geometry/__fixtures__/, scripts/, lib/db/, drizzle/, lib/models/design-snapshot.ts, or any component.

Run the gate below. Then make one commit with the subject `feat: new boards start with a 1/2" nose tip and a 5/8" tail tip`. The body, in plain English for a shaper: a brand-new board now starts with a 1/2" nose tip and a 5/8" tail tip, and the gear menu's Fit & Tip Defaults shows those two when you haven't chosen your own; presets keep their own tips, and anyone who already set their own tip defaults keeps them. End the body with the trailer line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run && npm run lint && npx playwright test e2e/fit-defaults.spec.ts e2e/new-board.spec.ts   # in a worktree prefix the Playwright run with IS_WEBPACK_TEST=1 PW_PORT=3160; first check nothing is listening on that port (lsof -ti :3100 or :3160 prints nothing)</automated>
    <automated>test "$(grep -c 'noseTip: inchesToMm(0.5),' lib/geometry/foil.ts)" = 1 && test "$(grep -c 'tailTip: inchesToMm(0.625),' lib/geometry/foil.ts)" = 1</automated>
    <automated>! grep -q '5/16' lib/geometry/foil.ts lib/fit-defaults-preference.ts lib/geometry/blank-fit.test.ts e2e/new-board.spec.ts e2e/fit-defaults.spec.ts && ! grep -q 'inchesToMm(0.3125)' lib/geometry/board-profile.test.ts lib/geometry/foil.ts</automated>
    <automated>test "$(grep -c 'noseTip: DEFAULT_FIT_DEFAULTS.noseTipThickness,' lib/geometry/blank-fit.test.ts)" = 3 && test "$(grep -c 'tailTip: DEFAULT_FIT_DEFAULTS.tailTipThickness,' lib/geometry/blank-fit.test.ts)" = 2 && test "$(grep -c 'noseTip: DEFAULT_FOIL_SPEC.noseTip,' lib/geometry/board-profile.test.ts)" = 1 && grep -q 'formatMark(DEFAULT_FIT_DEFAULTS\[key\]' e2e/fit-defaults.spec.ts && grep -q 'formatMark(DEFAULT_FOIL_SPEC.noseTip' e2e/new-board.spec.ts && grep -q 'inchesToMm(5 / 8)' lib/geometry/foil.test.ts</automated>
    <automated>test -z "$(git diff --name-only HEAD~1 HEAD -- lib/geometry/presets.ts lib/geometry/__fixtures__ scripts lib/db drizzle lib/models components app)"   # run after this task's commit</automated>
  </verify>
  <done>
    - lib/geometry/foil.ts's DEFAULT_FOIL_SPEC reads `noseTip: inchesToMm(0.5)` and `tailTip: inchesToMm(0.625)`, and its comment says these are the founder's choice of 2026-09-26.
    - vitest reports 74 files and 2,985 passed with 2 skipped (plan-time 2,984, plus the one new pin).
    - tsc and lint are clean.
    - fit-defaults.spec.ts and new-board.spec.ts pass on all three projects (plan-time: 24 passed, 3 skipped). The dialog reads 1/2" and 5/8" (13 mm and 16 mm in Metric), and an untouched board's ROCKER Nose Tip reads 1/2".
    - All grep gates pass. The commit touches only the seven files listed.
  </done>
</task>

<task type="auto">
  <name>Task 2: Re-record the ROCKER and VOLUME reference pictures, prove the other three untouched, run every browser test, and measure what the thicker tips do to the blank list</name>
  <files>e2e/desktop-baseline.spec.ts, e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png, e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png</files>
  <read_first>
    - e2e/desktop-baseline.spec.ts (the whole header comment: the re-record history, newest first, and the five shots)
    - playwright.config.ts (port 3100, PW_PORT, reuseExistingServer, maxDiffPixels)
    - components/rocker/use-blank-list.ts lines 110–170 (how the app builds the default board's fit context and list)
    - the plan_time_measurements block in this plan's context
  </read_first>
  <action>
(a) Before anything else, save the SHA-256 of all five reference pictures to a scratchpad file with `shasum -a 256 e2e/desktop-baseline.spec.ts-snapshots/*.png`. At b662532 the planner read: outline ef4fa37e…36c0, rails 6c2c6b2b…2373, fins a925ba15…6b62, rocker 75ee2ce1…1731, volume e6d97a8d…8372.

(b) Check that nothing is listening on the suite's port: `lsof -ti :3100`, or the PW_PORT you use. The config reuses an existing server outside CI, so a stale server from another checkout would get tested in place of this code. Then run the full suite with `npm run test:e2e`. In a worktree, use `IS_WEBPACK_TEST=1 PW_PORT=3160 npx playwright test`. Expect exactly one failure: the desktop ROCKER picture (about 494 pixels at plan time). Any other failure is a real problem. Stop and investigate it. Never re-record a picture to make a failure go away.

(c) Inspect ROCKER's failure images in test-results/: the `-diff`, `-actual` and `-expected` PNGs. Only two things may differ:
- the Nose Tip and Tail Tip station labels over the drawing, which now read 1/2" and 5/8";
- the foil outline near both tips, which is now thicker.

At plan time these were exactly two bands at 1280×800: the label row (about y 342–352) and the drawing (about y 465–498), both within x 459–1217. If the sidebar, the blank list or the top bar moved, stop.

(d) VOLUME passes its comparison but has changed. The default board now reads 30.06 L where it read 29.94 L. That patch is small enough to pass under `maxDiffPixels: 100` once Playwright's colour threshold is applied. Re-record it anyway, so the reference picture shows the real number; a stale picture that still passes lets later changes pile up unseen. Do NOT re-record TEMPLATE or FINS. The planner saw faint edge-smoothing noise in both under the webpack dev server, which comes from the renderer, not from this change. RAILS did not change at all.

(e) Re-record only those two pictures with `npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g "ROCKER|VOLUME" --update-snapshots=all`, using the same port settings as (b). You need `=all`. The flag's default mode, `changed`, rewrites only pictures that fail, so it would leave VOLUME stale.

(f) Prove the new pictures show what they should, and nothing else:
1. Write each old picture out with `git show HEAD:e2e/desktop-baseline.spec.ts-snapshots/<name>.png` into the scratchpad.
2. Compare old and new with Python PIL, which is installed. Take ImageChops.difference on RGB, group the changed rows into bands, and save old-over-new crops of each band.
3. Look at the crops. ROCKER should show only the two tip labels and the foil near the tips. VOLUME should show only the litres figure, 29.94 L becoming 30.06 L.
4. Re-hash all five pictures. Outline, rails and fins must match the hashes from (a) byte for byte, and `git status --short e2e/desktop-baseline.spec.ts-snapshots/` must list only the rocker and volume pictures.

(g) Add a new RE-RECORDED paragraph at the top of the header comment in e2e/desktop-baseline.spec.ts, newest first, in the same style as the entries under it. It should say:
- 2026-09-26, quick task 260926-uub, ROCKER and VOLUME only;
- why: the founder's new default tips. On ROCKER, the tip labels now read 1/2" and 5/8" and the foil is thicker near both tips. On VOLUME, the default board reads 30.06 L instead of 29.94 L, re-recorded even though it passed within tolerance, so the picture shows the real number;
- that the differences were inspected before re-recording and nothing else moved;
- that TEMPLATE, RAILS and FINS were not re-recorded, with their SHA-256 in the short form the file already uses (first 8 characters…last 2);
- which dev server drew the new pictures: Turbopack from the main checkout, or webpack (`IS_WEBPACK_TEST=1`, port N) in a worktree. If it was webpack, add that the orchestrator may re-record once from the main checkout if its Turbopack run disagrees, as the 12-03 entry already says.

(h) Run `npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` and expect 5 passed. Then run the full `npm run test:e2e` once more, with the same port settings. It must be all green; that run is the gate's proof.

(i) Measure the blank list for the founder. This is a note, not a blocker, and the fit rule is not to be changed.

Write a throwaway `.mts` script in the scratchpad; top-level await needs `.mts` under tsx. Run it from the repo root with `npx tsx <script>` so the `@/` imports inside the app's modules resolve. It loads these from the checkout:
- DEFAULT_BOARD_SPEC (lib/geometry/board.ts)
- DEFAULT_BLANK_CUT (lib/geometry/blank.ts)
- buildOutline and sampleOutline (lib/geometry/outline.ts)
- prepareBlank, listBlanks and boardOnBlank (lib/geometry/blank-fit.ts)
- DEFAULT_FIT_DEFAULTS and toFitSettings (lib/fit-defaults-preference.ts)
- readSeedCatalog (lib/blanks/seed-files.ts)
- isPickable (lib/blanks/catalog.ts)
- buildBlankProfile and handSetFromProfile (lib/geometry/board-profile.ts)

Build the default board's BoardFitContext exactly as components/rocker/use-blank-list.ts does: the length, the centre and both tips from DEFAULT_BOARD_SPEC, both 12" offsets at 0, DEFAULT_BLANK_CUT, and the tip style set per run. Run `listBlanks` over the pickable seed catalogue, prepared, with `toFitSettings(DEFAULT_FIT_DEFAULTS)`, once for Pin deck and once for Bottom. For each run, report:
1. how many blanks fit and how many are listed as won't fit;
2. the top blank on the list and, through buildBlankProfile and handSetFromProfile at its placement, the board's nose and tail tip rocker;
3. how many fitting blanks, and which ones, have a tip thicker than the cut leaves: `tipThinningAt(0)` or `tipThinningAt(length)` below zero on `boardOnBlank`. On those, Pin deck makes the tip rocker fall (Phase 12 D-16).

Compare your results with the plan-time figures in this plan's context. The "before" figures come from main at b662532, measured with the same method and the old tips. If your "after" figures differ, report both and say which is current.

(j) Make one commit with the subject `test: the ROCKER and VOLUME reference pictures show the new default tips`. The body, in plain English: the ROCKER reference picture now shows the 1/2" and 5/8" tip labels and the thicker tips; the VOLUME picture shows the default board's new 30.06 L; the other three pictures are untouched, with their hashes. End it with the trailer line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

The SUMMARY must have a "Note for the founder" section in plain English with:
- the blank-list measurement from (i): whether any blanks dropped out, how the top blank's tip rocker changed under Pin deck, and how many blanks now have a tip thicker than the cut leaves;
- the default board's litres change;
- that boards saved before the foil existed (snapshot version 1) now reopen showing the new tips, with no stored data changed;
- that shapers who already chose their own tip defaults, and all presets, are unaffected;
- that `npm run build` is left to the orchestrator.
  </action>
  <verify>
    <automated>npx playwright test e2e/desktop-baseline.spec.ts --project=desktop && npm run test:e2e   # in a worktree: IS_WEBPACK_TEST=1 PW_PORT=3160 npx playwright test ...; port checked free first</automated>
    <automated>shasum -a 256 e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png e2e/desktop-baseline.spec.ts-snapshots/rails-desktop-desktop-darwin.png e2e/desktop-baseline.spec.ts-snapshots/fins-desktop-desktop-darwin.png | grep -c -E '^(ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0|6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373|a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62) '   # must print 3</automated>
    <automated>test "$(git diff --name-only HEAD~1 HEAD | sort | tr '\n' ' ')" = "e2e/desktop-baseline.spec.ts e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png " && grep -q '260926-uub' e2e/desktop-baseline.spec.ts   # run after this task's commit</automated>
  </verify>
  <done>
    - Only rocker-desktop and volume-desktop were re-recorded, each after its old-over-new crops were inspected. ROCKER changed only at the tip labels and the foil near the tips; VOLUME changed only in its litres figure, 29.94 L to 30.06 L.
    - outline, rails and fins hash exactly as before.
    - The header comment records the re-record.
    - desktop-baseline passes 5 of 5, and the final full Playwright run is green.
    - The blank-list measurement for Pin deck and Bottom is in the SUMMARY's note for the founder.
    - The commit touches only the three listed files.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser storage / cookie → app | A shaper's stored Fit & Tip Defaults are untrusted input, read through the existing allow-list parsers. This plan does not touch that code. |
| account row → app | The saved `noseTipThicknessMm` / `tailTipThicknessMm` columns. Untouched; a chosen value still wins over the default. |
| shaping numbers → the foam | A default tip thickness flows into every new board's cut, rocker and litres. A wrong number here is a wrong board. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-uub-01 | Tampering (integrity of shaping numbers) | lib/geometry/foil.ts DEFAULT_FOIL_SPEC | medium | mitigate | The values are authored once, in inches, through `inchesToMm`. One literal pin in foil.test.ts guards them. Every other reader derives from the constant, and the full unit and Playwright suites run (Task 1 and Task 2). |
| T-uub-02 | Tampering (a shaper's saved choice overwritten) | lib/fit-defaults-preference.ts resolve/merge/handoff; the account columns | medium | mitigate | No change to parse, merge, handoff, `resolveFitDefaults` or the schema. `resolveFitDefaults` fills only fields nobody chose (existing tests). Task 1's diff gate proves lib/db, drizzle and components are untouched. |
| T-uub-03 | Repudiation (the desktop proof quietly rewritten) | e2e/desktop-baseline.spec.ts-snapshots | low | mitigate | Only ROCKER and VOLUME are re-recorded (`-g`), each after its differences are inspected. TEMPLATE, RAILS and FINS are hashed before and after, and the header comment records the re-record (Task 2). |
| T-uub-04 | Information disclosure | whole change | low | accept | No new data, endpoint, cookie field or package. Two constants and tests change. |
</threat_model>

<verification>
- `npx tsc --noEmit`, `npx vitest run` (2,985 passed, 2 skipped) and `npm run lint` are clean.
- The full `npm run test:e2e` is green after the scoped re-record, and desktop-baseline passes 5 of 5.
- SHA-256 of the outline, rails and fins pictures matches the pre-change values exactly. Only the rocker and volume pictures changed.
- `git diff --name-only b662532..HEAD` lists only the ten files in files_modified, plus this quick task's planning files.
- `npm run build` is the orchestrator's, from the main checkout (it cannot run in a worktree).
</verification>

<success_criteria>
- A brand-new board opens with a 1/2" nose tip and a 5/8" tail tip on ROCKER, drawn thicker at both ends.
- The Fit & Tip Defaults dialog shows 1/2" and 5/8" (13 mm and 16 mm in Metric) when nothing is chosen, and Restore Defaults returns to them.
- Presets, golden fixtures, the generator scripts, the database schema and every saved choice are unchanged.
- Nothing retypes the default tips except the one pin that records the founder's decision.
- The ROCKER and VOLUME reference pictures are re-recorded with the evidence written down; the other three are provably untouched.
- The SUMMARY gives the founder a plain-English note on the blank list, the litres and the boards saved before the foil existed.
</success_criteria>

<output>
Create `.planning/quick/260926-uub-default-tip-thicknesses-become-nose-tip-/260926-uub-SUMMARY.md` when done. Include the "Note for the founder" section from Task 2, the before-and-after hash table for the five pictures, and both commit hashes.
</output>
