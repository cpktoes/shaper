---
phase: 11-rocker-from-real-blanks
plan: 11
subsystem: rocker-sidebar
status: complete
tags: [rocker, blank-picker, fit-flag, placement, readouts, fine-tune, streaming, R1, R2, R3, R4, R5, R6, R12, R14, R15, D-04, D-06, D-07, D-08, D-11, D-12]
requires:
  - "11-03: listBlanks / judgeBlank / floorCheck / fitAt / nearestFit / nearestFittingPlacement / catalogueExtremes / placementRange (lib/geometry/blank-fit.ts); every sentence in lib/geometry/blank-reasons.ts"
  - "11-05: loadPickableBlanks (lib/db/blanks.ts, never rejects) and the SHAPER_BLANKS_SOURCE=seed-csv test catalogue"
  - "11-07: RockerViewer draws the blank ([data-blank-silhouette])"
  - "11-08: useFitDefaults() → settings, openDialog"
  - "11-09: useDesign() → blank, preparedBlank, sideProfile, pickBlank, setPlacement, setFineTune, resetFineTune, removeBlank"
provides:
  - "app/design/rocker/page.tsx streams loadPickableBlanks() un-awaited to RockerEditor({ blanks })"
  - "BlankPicker (states A/B/C, E1–E5), BlankFlag (F1–F5), BoardOnBlankSection (placement + readouts), useBlankList"
  - "matchesBlankSearch, blankRowVolume, boardLine in lib/geometry/blank-reasons.ts"
  - "RockerControls sections: center | blank | boardOnBlank | rocker (no blank only) | thickness"
  - "e2e/rocker-blanks.spec.ts — 6 tests × 3 projects"
affects: [11-12, 11-13]
tech-stack:
  added: []
  patterns:
    - "promise prop + use() + Suspense around the list region only; the flag's offer reads the same promise in its own Suspense"
    - "prepared catalogue cached per streamed records array (WeakMap) so the list and the offer fit the 150-odd blanks once"
    - "verdict memos keyed on board + settings, never placement; the flag's per-move check is one fitAt sample"
    - "browser tests wait for React to own the streamed list's first row before typing or tapping"
key-files:
  created:
    - components/rocker/blank-picker.tsx
    - components/rocker/blank-flag.tsx
    - components/rocker/board-on-blank.tsx
    - components/rocker/use-blank-list.ts
    - e2e/rocker-blanks.spec.ts
  modified:
    - app/design/rocker/page.tsx
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-controls.tsx
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - components/design/slider-row.test.ts
    - lib/units-isolation.test.ts
    - lib/blanks/seed-files.ts
    - components/ui/input.css.test.ts
key-decisions:
  - "The units ledger counts an import of lib/geometry/blank-reasons as reading through the display boundary, with a new assertion that blank-reasons itself imports ./measure-display and calls no banned formatter — the picker's numbers all arrive through those sentences"
  - "The flag's F5 sentence renders as its own line under the reason (inside the offer's Suspense), not appended to the reason paragraph, so the reason never waits for the catalogue"
  - "F1/F2 bodies end in a full stop (the UI-SPEC's examples do); F3/F4 bodies already carry one"
  - "Placement readouts and the fine-tune hint print a zero that would read -0 as an unsigned zero, matching 11-09's datasheet rule"
metrics:
  duration: "about 35 minutes"
  completed: 2026-09-26
actuals:
  tokens: 17100
  tasks: 3
  commits: 4
---

# Phase 11 Plan 11: The ROCKER sidebar — pick a real blank, slide the board along it, read the numbers Summary

The ROCKER sidebar now reads top to bottom the way the brief asked: set the board's centre
thickness, pick a real foam blank from a list of every blank long and thick enough (the ones that
fit on top, the rest greyed with the one place and amount each fails by), slide the board along
it and watch the rocker and the foam to come off change at the five stations, then set the tips
and nudge the two 12" stations. A pick that stops fitting stays picked with a warning and a
one-tap swap to the closest blank that does fit.

## What changed, in plain English

- **The catalogue streams in (Task 1).** The ROCKER page asks for the blank catalogue once per
  visit without waiting for it: "Loading blanks…" shows in the list's own corner while it arrives,
  and "The blank catalog didn't load." if it can't — the drawing and every other control never
  wait. Tapping a row puts the board in that blank where it fits nearest the centre, and the
  drawing shows the blank behind the board.
- **Search, browse, live with a pick (Task 2).** A search box filters by vendor and name (an
  iPhone's curly `6’2` still finds `6'2"`); the list shows its six shortest first with "Show all
  {n} blanks". Once picked, the blank shows as a card with Change Blank and Remove This Blank. If
  the board changes so the blank no longer fits, a warning box says why and offers the closest
  blank that fits (Switch to This Blank), or Move to Where It Fits when it only fits further along
  the blank, or Change Fit Rules when nothing in the catalogues fits. The board's length and width
  from TEMPLATE read under the subtitle.
- **Centre, placement, numbers, fine-tune (Task 3).** Center Thickness is the first control (typed
  box plus slider, the same centre RAILS and VOLUME read). BOARD ON BLANK has the placement slider,
  nose at the left, and a five-row table of rocker and foam off that changes on every move with
  nothing sent to the server. With a blank picked, the hand-set ROCKER sliders step aside and the
  two 12" thicknesses become "From blank …" plus "Tweak …", with ↺ Reset Fine-Tune.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | The catalogue streams onto the ROCKER page and a tap on a blank puts the board in it (tracer) | 35f7d73 |
| 2 | Search, browse, and live with a pick — the picked card, the flag that never clears it, and the closest blank that fits | 11b918e |
| 3 | Center thickness first, the placement slider with its live numbers, and the tips with their 12" fine-tune | 9728cca |

## Verification

- Tracer gate (autonomous, `end-of-phase` human verify): `npx tsc --noEmit`, `npx vitest run lib/units-isolation.test.ts`
  and `IS_WEBPACK_TEST=1 PW_PORT=3161 npx playwright test e2e/rocker-blanks.spec.ts --project=desktop --project=android`
  — green after the seed-folder fix below.
- Task 2 TDD: `lib/geometry/blank-reasons.test.ts` failed first (8 of 50, RED — the three functions did not exist),
  then 50/50 GREEN. RED and GREEN are one commit (the orchestrator's one-atomic-commit-per-task rule).
- End of plan: `npx tsc --noEmit` exit 0; `npx vitest run` 70 files, 2717 passed / 2 skipped; `npm run lint`
  0 errors (11 pre-existing warnings, none in this plan's files).
- `IS_WEBPACK_TEST=1 PW_PORT=3161 npx playwright test e2e/rocker-blanks.spec.ts` — 18/18 on iphone, android and
  desktop; plus the ROCKER DATASHEET phone test in `phone-rails.spec.ts` — 20 passed, 1 skipped.
- Neighbouring specs `phone-layout`, `phone-screens`, `viewer-toolbar`, `desktop-regression`, `phone-trip`,
  `touch-drag`, `touch-sizing`: 92 passed, 90 skipped, 1 failed — see "Pre-existing flake" below.
- `grep -c "new RegExp"` → 0 in `blank-picker.tsx` and `blank-reasons.ts`; no `dangerouslySetInnerHTML` in any
  `components/rocker/*.tsx`. Dev server on 3161 confirmed stopped.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The seed catalogue's folder path broke the ROCKER page under webpack**
- **Found during:** Task 1 (the orchestrator's watch item from 11-05)
- **Issue:** `lib/blanks/seed-files.ts` built `SEED_CSV_DIR` with `new URL("../../db/seed/blanks/", import.meta.url)`;
  webpack reads that form as an asset import, so the page failed to build ("Module not found: Can't resolve
  '../../db/seed/blanks/'") the moment it imported the server read.
- **Fix:** `resolve(dirname(fileURLToPath(import.meta.url)), "../../db/seed/blanks")` — the same folder, no asset
  reference. `lib/blanks/*` and `lib/db/blanks.test.ts` stay green.
- **Files modified:** lib/blanks/seed-files.ts (outside `files_modified`, allowed by orchestrator ruling 3)
- **Commit:** 35f7d73

**2. [Rule 3 - Blocking] The shared text box's consumer guard counted the search box as an accident**
- **Found during:** Task 3's full unit run (introduced by Task 2's search box)
- **Issue:** `components/ui/input.css.test.ts` asserts exactly three consumers of `components/ui/input.tsx`; the
  UI-SPEC deliberately makes the blank search the fourth (the installed Input, not a Command palette).
- **Fix:** named `components/rocker/blank-picker.tsx` in the list with the reason, and renamed the case to
  "four known consumers — a fifth would be a deliberate decision".
- **Files modified:** components/ui/input.css.test.ts (outside `files_modified`; nobody else edits it this wave)
- **Commit:** 9728cca

**3. [Rule 2 - Ledger] The units ledger's boundary check accepts the sentence layer**
- **Found during:** Task 1
- **Issue:** `blank-picker.tsx` prints every number through `lib/geometry/blank-reasons.ts`'s sentences and needs
  no direct `measure-display` import, so `converted: true` would have failed the ledger's import check.
- **Fix:** `importsDisplayBoundary` also accepts `@/lib/geometry/blank-reasons`, with a new test that
  `blank-reasons.ts` itself imports `./measure-display` and calls none of the banned formatters.
- **Commit:** 35f7d73

**4. [Rule 1 - Test race] Browser tests wait for React to own the streamed list**
- **Found during:** Task 3 (iPhone WebKit)
- **Issue:** the list arrives server-rendered inside its own Suspense boundary; a search typed before React
  hydrated it was lost (the box came back empty).
- **Fix:** `openRocker` waits until the list's first row and the search box carry a React fiber.
- **Commit:** 9728cca

**Task-boundary note:** Task 1's browser test asserts "a picked card shows that name", so Task 1 shipped a minimal
picked card (name + meta) that Task 2 replaced with the full state C. Task 2's flag test raised the centre with the
old THICKNESS "Center" slider's arrow keys; Task 3 moved it to typing `3 1/2` into Center Thickness as planned.

### Pre-existing flake (not fixed, not caused here)

On a COLD webpack dev server, the first visit to `/design/rocker` from `/design/outline` makes Fast Refresh
full-reload the TEMPLATE page, interrupting the navigation (`phone-layout.spec.ts` "Width and the hand-set rocker
are on screen…", iPhone, first run only; 5 of 6 repeats pass). Reproduced with the base commit's own ROCKER files
(page, editor, controls restored from 18fdba7), so it predates this plan. Logged here for 11-12.

## Human verification deferred to end-of-phase UAT

- **Task 3 human-check:** on a real iPhone and a real Pixel (not an emulator), open ROCKER, scroll the controls
  column, pick a blank, drag the placement thumb with a thumb, and fine-tune a 12" station. Expected: rows and links
  comfortably tappable; the placement label never wraps and the thumb never jumps a line; the readouts change as
  you drag; nothing on the drawing moves when you touch it.
- **Backstops (UI-SPEC):** a half-typed Center Thickness abandoned mid-edit leaves the stored centre untouched;
  exactly five readout rows in both unit systems; E1 "No blank is long enough" (unreachable with shipped bounds).

## For 11-12

- **Browser proof to add:** the placement slider's REAL touch drag on a phone with zero same-origin requests counted
  during the drag (this plan counts them for keyboard moves only); `/design/rocker` in `touch-sizing.spec.ts`'s loop
  (rows `coarse:min-h-11`, text links `coarse:min-h-11 coarse:flex coarse:items-center`, the search box and the
  Center Thickness field via Input/MeasureField); Metric labels (`Placement — 13 mm toward nose`, `Nose @ 30.5 cm`,
  `Tweak +1 mm`); F2 "Move to Where It Fits" (reach it by picking a greyed row whose nearly-fits placement differs,
  or by sliding a tight blank to an end); E4 by pointing the test catalogue at nothing; "Show all {n} blanks" /
  "Show Fewer"; Keep This Blank closing the list; one undo bringing a removed blank back.
- **Hooks for tests:** `getByRole("list", { name: "Blanks" })`, `li[data-group="fits"|"wontFit"]`, `[data-blank-name]`,
  `[data-picked-blank]`, `[data-blank-flag]`, `[data-blank-offer]`, `[data-readouts]` with five `[data-readout-row]`,
  `getByRole("textbox", { name: "Center Thickness" })`, `getByRole("searchbox", { name: "Search blanks" })`. Wait for
  hydration as `openRocker` in `e2e/rocker-blanks.spec.ts` does before the first interaction.
- **Baselines:** the ROCKER desktop baseline moves a lot (new sections, the list, the board line) — re-record once,
  deliberately, as planned. `phone-layout.spec.ts`'s "Rocker ▾" section check still holds because a new board has
  no blank; once 11-10 gives presets blanks, a preset-opened board will have no ROCKER section.
- **Known gaps:** the placement slider's imperial grid runs from its end (Base UI steps from `min`), so a drag lands
  on 1/16" steps offset from centre; the label rounds to the nearest 1/16" and reads "centered" within 1/32", which
  is what a shaper sees, but the stored value is not on an exact 1/16" grid. The list's cap and search state reset
  when Change Blank closes (view state, by design).

## Known Stubs

None. Every section reads live store and catalogue data; the search box's placeholder text is the UI-SPEC's.

## Threat Flags

None beyond the plan's register. T-11-31 mitigated (plain `includes`, metacharacter test, grep 0). T-11-32
mitigated (React text only, no `dangerouslySetInnerHTML`). T-11-34 mitigated (verdicts memoised off the placement;
the prepared catalogue is cached per streamed records array; a slider move samples one prepared blank).

## Self-Check: PASSED

- FOUND: components/rocker/blank-picker.tsx, components/rocker/blank-flag.tsx, components/rocker/board-on-blank.tsx,
  components/rocker/use-blank-list.ts, e2e/rocker-blanks.spec.ts, app/design/rocker/page.tsx
- FOUND commits: 35f7d73, 11b918e, 9728cca
