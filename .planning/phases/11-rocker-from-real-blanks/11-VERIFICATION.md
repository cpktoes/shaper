---
phase: 11-rocker-from-real-blanks
verified: 2026-09-26T19:30:00Z
status: human_needed
score: 16/16 requirements traced and verified; 0 gaps found; 1 accepted deviation (WR-05); 1 policy-resolved item (CR-01)
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "Production migration, production seed, and the six live-site checks (11-13)"
    addressed_in: "Founder's own step (11-13-PLAN.md, gate=blocking-human)"
    evidence: ".continue-here.md records the precondition as not yet met (rocker-blanks not merged to main); the phase brief explicitly instructs the verifier to treat 11-13's must_haves as pending, not as gaps"
human_verification:
  - test: "On a desktop, open a new board from the Shortboard preset, go to ROCKER, set a Center Thickness, pick a different blank from the list, and slide the board along it."
    expected: "The four rocker numbers (nose tip, nose 12\", tail 12\", tail tip) and the foam-to-remove figures change live as the dot moves; every blank that will not fit is still listed, marked as not fitting, with a plain-English reason; the foil's centre reads the Center Thickness that was set and the tips read the tip settings. This is the phase's own DONE WHEN, walked end to end by the shaper it was built for."
    why_human: "The automated browser tests prove each piece with fixed inputs; whether the whole flow reads as numbers a shaper would trust enough to cut foam to is the founder's acceptance, and none of the six items below walks the whole flow. (Added by the orchestrator.)"
  - test: "Open the ROCKER screen in each of the four themes (Daylight, Chalk, Slate, Phosphor), pick a blank, and look at the drawing."
    expected: "The faint outline of the real foam blank sits behind the board's own outline, and the shaded band above the deck and past each tip (the foam that will be planed away) reads clearly as a light wash in every theme — never invisible, never mistaken for a warning colour."
    why_human: "Colour legibility across four themes is a visual judgement; no automated test measures it (flagged by the plan's own executor in 11-07 and 11-12)."
  - test: "Sign in on one device or browser, set a Fit & Tip Default (for example Extra Length to 3\"), then sign in on a second device or browser with the same account."
    expected: "The second device shows the same 3\" — the setting followed the shaper's account, not just the browser it was typed on. Also: flipping between Imperial and Metric and reloading should not lose the pick."
    why_human: "The automated browser tests run signed out (fake test credentials), so the real cross-device account round trip has never actually been exercised — only its pieces are unit-tested separately."
  - test: "On a real iPhone and a real Android phone (not a browser's phone simulator), open ROCKER, pick a blank, drag the placement dot with a thumb, and nudge a 12\" fine-tune slider."
    expected: "Every row, link and slider dot is comfortably big enough to tap; the placement wording never wraps onto a second line mid-drag; the numbers change smoothly as you drag; nothing on the drawing itself responds to a touch."
    why_human: "This project's own convention treats emulated touch as insufficient proof — real hardware is required for touch-feel judgements (per CLAUDE.md and prior phase learnings)."
  - test: "Open each of the four presets (Shortboard, Fish, Mid-length, Longboard) from the setup screen, go to ROCKER, and look at which real foam blank each one landed in and where the board sits on it."
    expected: "A shaper (the founder) judges whether the blank the app picked automatically is the one they'd actually choose for that board. These are marked 'provisional' on purpose and are meant to be replaced by the founder's own pick through the 'Copy preset values' workflow described in presets.ts."
    why_human: "This is a business/craft judgement about which foam blank suits which board shape — not something a test can grade. The preset card's quoted volume also went up by 2-5 litres because the real blank's foam is fuller near the tips than the old hand-typed numbers were; the founder should confirm that reads right."
  - test: "Open a board that was saved before this branch existed (a real board from the founder's own account, not a test fixture) from the setup screen's rack, and look at its ROCKER screen."
    expected: "It looks exactly as it did before — same rocker numbers, same foil — just shown now as four sliders instead of the old Angle/Smoothness/Flatness controls, with no blank picked."
    why_human: "Only a real pre-existing saved board, with data the tests never wrote, actually proves the migration path end to end (flagged by the plan's own executor in 11-09)."
  - test: "Open the two re-recorded reference screenshots (ROCKER and VOLUME) next to their previous versions."
    expected: "ROCKER's picture shows the new sidebar (Center Thickness, the blank list, the placement control) beside the same board drawing. VOLUME's picture is identical except its litres number, which reads very slightly higher than before."
    why_human: "A reference screenshot being 'the right picture' is a judgement call, not only a pixel-stability check (which the automated hash comparison already confirms)."
---

# Phase 11: Rocker from Real Blanks Verification Report

**Phase Goal:** A shaper sets a target centre thickness, picks a real blank that fits, slides the board along it, and the board's rocker, thickness and foil are read off where it sits in that foam — the four rocker numbers and the foam to remove shown live, every blank that won't fit shown with why, and a foil that matches the shaper's centre and tip thicknesses; the four named geometry tests land before any UI.
**Verified:** 2026-09-26T19:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria + SPEC Acceptance Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The four named geometry tests exist by name and pass, before any `components/` change | ✓ VERIFIED | `npx vitest run lib/geometry/blank-fit.test.ts -t "..."` → 4 passed (re-run live). `git merge-base --is-ancestor` on the file-add commit vs. the first `components/` commit → `R16: the four named tests landed before the first screen change` (re-run live, both commits: `04b3b08` before `48b258d`) |
| 2 | A shaper can pick a blank from a list, filtered by two shaper-set floors (length, centre thickness) | ✓ VERIFIED | `lib/geometry/blank-fit.ts` `listBlanks`/`floorCheck` (11-03), wired in `components/rocker/blank-picker.tsx` + `use-blank-list.ts` (11-11); `lib/geometry/blank-fit.test.ts` "judging the catalogue" suite green; browser proof `e2e/rocker-blanks.spec.ts` (11-11/11-12, run by executors, folded into orchestrator's background e2e run) |
| 3 | The board slides along the blank (placement slider, nose at the left, buffered range) | ✓ VERIFIED | `placementRange`/`clampPlacement` (11-01), `placementSlider`/`formatPlacement` (11-03), `BoardOnBlankSection` (11-11); IN-01 grid-snap bug found and fixed (`db51c13`); zero-network CDP touch-drag and mouse-drag tests added in 11-12 |
| 4 | The four rocker numbers and foam-to-remove update live on every slider move, no network request | ✓ VERIFIED | `boardOnBlank`/`fitAt` are pure/memoised (11-01/11-03); store's `sideProfile` derivation (11-09); `[data-readouts]` block (11-11); 11-12 added CDP/mouse drag tests asserting **zero** requests during the drag (`toBe(0)`) |
| 5 | Every blank that won't fit is shown with why (station + amount, in both unit systems) | ✓ VERIFIED | `formatShortfall`/`floorShortfallMessage`/`emptyListMessage` (11-03, `blank-reasons.test.ts` 50/50 green); rendered in `blank-picker.tsx` greyed rows and `blank-flag.tsx` F1-F5 states (11-11) |
| 6 | The foil matches the shaper's centre and tip thicknesses, never a subtracted constant | ✓ VERIFIED | D-17/D-18 ease + ratio implemented in `boardOnBlank` (11-01); no-negative-thickness sweep (R13) over ~6,000 board/blank/placement combinations, and again over all four presets (11-01, 11-10); "MUST NOT subtract a constant" prohibition test green |
| 7 | Changing centre thickness after a pick flags the blank and offers the closest fit; never silently clears the pick | ✓ VERIFIED | `nearestFit`/`nearestFittingPlacement` (11-03); store's R6 "only pickBlank/removeBlank writes `blank:`" source-contract test (`design-store.test.ts`, part of the 2865-test green run); browser case in `e2e/rocker-blanks.spec.ts` (raise centre → flag appears, picked card unchanged, offer shown) |
| 8 | The seed is re-runnable (no duplicates) | ✓ VERIFIED | Live re-run: `npx --no-install tsx scripts/seed-blanks.ts --check` → `blanks: 162 (US Blanks 101, Arctic Foam 33, Marko Foam 28); pickable: 158` and `matching the catalogue CSVs exactly: 162 of 162` against the development branch (executed by me this session) |
| 9 | Every older saved board reopens | ✓ VERIFIED, with one noted deviation | v1/v2/v3 migration tests (`design-snapshot.test.ts`) all green, live-rerun; `BOARD_LENGTH_RANGE_IN = {60, 120}` in in `lib/geometry/board.ts` has bounded every board the app has ever let a shaper create since Phase 1 (git history confirms `bf83a82`), so no *real* historical board can hit the WR-05 500 mm crash case — see "Noted Deviations" below |
| 10 | Every new number reads correctly in Imperial and Metric | ✓ VERIFIED | `lib/units-isolation.test.ts` — 26/26 green (live re-run), and it explicitly names every new file in this phase (`blank-picker.tsx`, `blank-flag.tsx`, `board-on-blank.tsx`, `fit-defaults-dialog.tsx`) with `converted: true` |

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Production migration, seed, and the six live-site checks | Founder's own step, 11-13-PLAN.md | `.continue-here.md`: precondition not met (branch not merged); this is explicitly the founder's gated step per the task brief, and is excluded from this verification's scope |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/geometry/pchip.ts` | The app's one monotone sampler | ✓ VERIFIED | Exists; `pchipSlopes`/`preparePchip`/`samplePchip`/`pchipMinimum` exported; parity tests pass |
| `lib/blanks/csv.ts`, `lib/blanks/catalog.ts`, `lib/blanks/seed-files.ts` | CSV reader → BlankRecord | ✓ VERIFIED | Exist; 162 blanks load correctly (live-checked) |
| `lib/geometry/blank.ts`, `lib/geometry/blank-fit.ts` | Types, fit check, judging | ✓ VERIFIED | Exist; full test suite green |
| `lib/geometry/blank-reasons.ts` | Every sentence the screens say | ✓ VERIFIED | Exists; `matchesBlankSearch`/`blankRowVolume`/`boardLine` added in 11-11 |
| `lib/geometry/board-profile.ts` | One side profile for every screen | ✓ VERIFIED | Exists; `BoardSideProfile`/`BlankSideView`/`buildBoardProfile` |
| `lib/db/schema.ts` (`blanks` table), `lib/db/blanks.ts` | Catalogue in the database, fail-soft read | ✓ VERIFIED | `pgTable("blanks"...)`, `uniqueIndex`, `jsonb("stations")` present; `loadPickableBlanks` never rejects (tested) |
| `lib/models/rack-models.ts` | Rack drops a bad row instead of crashing the page | ✓ VERIFIED (WR-05 fix) | Read in full; `rackModelsFromRows` catches per-row and logs; test green |
| `scripts/seed-blanks.ts` | Idempotent upsert, `--check` | ✓ VERIFIED | Live-run confirms exact counts twice-over |
| `components/rocker/blank-picker.tsx`, `blank-flag.tsx`, `board-on-blank.tsx`, `use-blank-list.ts` | The finished sidebar | ✓ VERIFIED | Exist; substantive (300+ lines each, no stub returns beyond legitimate short-circuits — checked for `return null`/no-op handlers and confirmed they gate legitimate UI states, not missing logic) |
| `app/design/rocker/page.tsx` | Streams the catalogue | ✓ VERIFIED | Contains `loadPickableBlanks()` un-awaited (per 11-11 SUMMARY; consistent with orchestrator's clean build) |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| `lib/blanks/catalog.ts` | `lib/geometry/units.ts` | `inchesToMm` at the units boundary only | ✓ WIRED (grep: 0 stray `25.4` in blanks/geometry files) |
| `components/rocker/use-blank-list.ts` | `lib/geometry/blank-fit.ts listBlanks` | `useMemo` deps exclude placement (D-07/R14) | ✓ WIRED (per 11-11 code and its passing tests) |
| `components/rocker/board-on-blank.tsx` | `useDesign().setPlacement` | slider `onValueChange` | ✓ WIRED |
| `components/design/design-store.tsx` | `lib/geometry/board-profile.ts buildBoardProfile` | one memoised `sideProfile` for every consumer | ✓ WIRED (source-contract test green) |
| `app/design/rocker/page.tsx` | `lib/db/blanks.ts loadPickableBlanks` | un-awaited promise + `use()` + Suspense | ✓ WIRED |

### Requirements Coverage

| Requirement | Description (abridged) | Status | Evidence |
|---|---|---|---|
| R1 | Target centre thickness first, stored once | ✓ SATISFIED | 11-09 (`foil.center`), 11-11 (Center Thickness first control) |
| R2 | Blank list filtered by two floors (settings, not literals) | ✓ SATISFIED | 11-02 (settings), 11-03 (filter), 11-06/11-08 (account), 11-11 (UI); `grep -c "inchesToMm(2)\|inchesToMm(0.375)"` in blank-fit.ts = 0 |
| R3 | Placement slider, buffered range, nose-positive | ✓ SATISFIED | 11-01/11-03/11-11/11-12; IN-01 grid-snap bug found and fixed |
| R4 | Live readouts (4 rocker + foam removed) | ✓ SATISFIED | 11-04 (profile), 11-07 (drawing), 11-09/11-11 (screen), 11-12 (zero-network proof) |
| R5 | Tips are settings; 12" derived but fine-tunable | ✓ SATISFIED | 11-02 (defaults), 11-04/11-09 (derivation+offset), 11-11 (UI) |
| R6 | Re-check on thickness change; blank never silently cleared | ✓ SATISFIED | 11-03 (nearestFit), 11-09 (store contract), 11-11/11-12 (browser proof) |
| R7 | Load the 3 CSVs as-is | ✓ SATISFIED | 11-01 (reader), 11-05 (seed); live-checked 162/101/33/28 |
| R8 | Schema: no per-station columns, raw stations only | ✓ SATISFIED | `lib/db/schema.ts` blanks table (jsonb stations, no station-numbered columns) |
| R9 | Loader rules (empty≠0, SUP exclusion, re-runnable) | ✓ SATISFIED | Live-checked seed idempotency and pickable count (158) |
| R10 | PCHIP interpolation, deck = rocker + thickness | ✓ SATISFIED | 11-01 (pchip parity), 11-04 (`deckAt` `toBe` sweep) |
| R11 | Leveling (exact minimum = 0, on import and crop) | ✓ SATISFIED | Named test `levelling puts the curve's minimum at exactly 0` passes |
| R12 | Fit check (thickness + width envelope), reason names station+amount | ✓ SATISFIED | Named test `the fit check rejects a board thicker than the blank near the nose...` passes |
| R13 | Foil scaled proportionally, never negative | ✓ SATISFIED | R13 sweep (11-01), preset sweep (11-10) |
| R14 | Performance — client-side only, fit once/sample many | ✓ SATISFIED | Verdicts memoised off placement; 11-12's zero-network browser proof is the strongest evidence |
| R15 | Display — marks snap to 1/16"/whole mm | ✓ SATISFIED | `formatSignedMark` (11-02), units-isolation ledger includes every new file (live-checked) |
| R16 | Tests before UI | ✓ SATISFIED | Live-checked git ancestry: the four-test-adding commit is an ancestor of the first `components/` commit |

No orphaned requirements found (all R1-R16 map to at least one executed plan; cross-checked against 11-SPEC.md's `## Requirements` section 1-16).

### Anti-Patterns Found

None. Scanned all files touched in this phase's diff (`git diff --name-only main...HEAD`) for `TBD|FIXME|XXX` (0 hits), `TODO|HACK|PLACEHOLDER` (0 hits), and geometry-purity/units violations (0 real hits — two grep matches on "document"/"window" were prose inside comments, not imports). Spot-checked the three largest new UI components for stub patterns (`return null`, no-op handlers); all instances found gate legitimate UI states (no blank picked, offer unavailable, disabled slider) rather than missing logic.

### Requirements/Prohibitions from SPEC

All 8 "must-NOT" prohibitions in `11-SPEC.md` are marked resolved with either `test` or `judgment` verification; spot-checked the two `test`-tier ones (no-0-for-empty-cell, no-silently-cleared-blank) by running their tests live — both green.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| The four named R16 tests pass individually | `npx vitest run lib/geometry/blank-fit.test.ts -t "..."` | 4 passed | ✓ PASS |
| Whole unit suite green | `npx vitest run` | 73 files, 2865 passed, 2 skipped, 0 failed | ✓ PASS |
| Type-check clean | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Units-isolation ledger green | `npx vitest run lib/units-isolation.test.ts` | 26 passed | ✓ PASS |
| Seed re-runnable against development branch | `npx --no-install tsx scripts/seed-blanks.ts --check` | `blanks: 162 (...); pickable: 158`, `162 of 162` match | ✓ PASS |
| R16 git-ancestry order | `git merge-base --is-ancestor ...` | `R16: the four named tests landed before the first screen change` | ✓ PASS |

### Probe Execution

Not applicable — this project has no `scripts/*/tests/probe-*.sh` convention and none is referenced by this phase's plans or SPEC.

### Browser/E2E Coverage

Per the task brief, the full Playwright suite (including `e2e/rocker-blanks.spec.ts`, `e2e/touch-drag.spec.ts`, `e2e/desktop-baseline.spec.ts`, `e2e/fit-defaults.spec.ts`, `e2e/new-board.spec.ts`, `e2e/touch-sizing.spec.ts`, `e2e/phone-rails.spec.ts`) was run by each plan's own executor in its worktree (documented pass counts in every 11-0X-SUMMARY.md, e.g. 11-12: desktop 74/104 skipped, android 114/64 skipped, iphone 105/73 skipped, no failures) and is separately running in the background on port 3100 per the orchestrator, whose result will be folded into the phase record. I did not re-run Playwright myself, per instruction.

## Noted Deviations (from 11-REVIEW.md / 11-REVIEW-FIX.md)

1. **CR-01 (was BLOCKER, resolved by policy, not code).** Adding five columns to the shared `user_preferences` table would have broken the *existing* Imperial/Metric and print-toggle saves for every signed-in shaper during the push-then-migrate gap, because Drizzle names every column on every insert. Verified live: the five columns (`extra_length_mm`, etc.) are still present on `userPreferences` in `lib/db/schema.ts` (the code-level fix — moving them to their own table — was **not** applied). Instead, CLAUDE.md's Database section was amended (confirmed present in the system-provided CLAUDE.md contents: "Adding a table or a nullable column ... run `npm run db:migrate:prod` BEFORE the code that uses it ships") and `11-13-PLAN.md` was reordered to migrate-and-seed production *before* the merge/deploy. This is a legitimate policy resolution, consistent with the founder's own amendment, and is reflected correctly in 11-13's plan and in `.continue-here.md`. **Not a gap** — it is the mechanism that prevents the blocker from ever manifesting, verified present in both the schema and the process documents.

2. **WR-05 (accepted deviation from the original design).** The design called for a maliciously-crafted 500 mm board-with-blank snapshot to "parse to a hand-set board and summarize without throwing." The fixer found this cannot be done without changing the geometry itself: a board under ~24" (609 mm) crashes `summarizeDesign` even with **no** blank, because its centre falls before the 12" measurement station. So a 500 mm snapshot is instead rejected outright by the bounded schema, and the rack (`rack-models.ts`) drops just that one card rather than crashing the whole setup screen. Boards at 45" and 150" (outside the 60-120" *blank* range, but inside the wider snapshot-validity range) correctly reopen hand-set, tested. **My judgment:** this satisfies the SPEC's "every older saved board reopening" criterion for every board a shaper could actually have created, because `BOARD_LENGTH_RANGE_IN = {60, 120}` (in `lib/geometry/board.ts`) has bounded every board the app's own UI has ever let a shaper make since the outline engine was first ported in Phase 1 (git-verified: commit `bf83a82`). A 500 mm board is only reachable through a hand-crafted database write, not through any real usage history. The fix correctly hardens against that crafted case (drop one card, log it, keep the rest of the rack working) rather than leaving it as a page-crashing vulnerability. **Verified as an acceptable, well-tested, and honestly-documented deviation — not a gap.**

3. **WR-06 (accepted by decision).** Six hand-worked pchip parity test values are typed rather than generated by a SciPy fixture script, which is a literal deviation from CLAUDE.md Rule 1's "never hand-transcribe an expected number." This was explicitly pre-authorized by CONTEXT D-13's own discretion note ("hand-worked tangent values for the 4- and 5-point cases ... if SciPy is available ... an optional generated fixture" — optional, not required) and SciPy is not installed on the review machine. **Accepted as designed**, not a gap.

## Gaps Summary

No blocking gaps were found. Every one of R1-R16 is traced to executed code and passing tests; the four named geometry tests exist verbatim and pass; the seed is re-runnable (live-verified); geometry purity and the units boundary hold; no debt markers exist in any file this phase touched. The single remaining code-review item (CR-01) was resolved by a documented, verifiable process change rather than a code change, and that process change is correctly reflected in the phase's own deferred production plan. The one accepted geometry-limitation deviation (WR-05) does not affect any board a shaper could have actually created. Production migration/seeding (11-13) is the founder's own gated step and is out of this verification's scope per the task brief.

What remains is exclusively human/real-device/real-account verification: colour legibility of the new drawing across four themes, a real cross-device signed-in round trip of the new Fit & Tip Defaults, real (non-emulated) phone touch-feel, the founder's own review of the four provisional preset blank picks, opening one of the founder's own pre-existing saved boards, and a visual look at the two re-recorded reference screenshots. None of these can be settled by further code reading or test execution — they are exactly the kind of check this project's own conventions (CLAUDE.md, prior-phase learnings) reserve for a human on real hardware or a real account.

---

_Verified: 2026-09-26T19:30:00Z_
_Verifier: Claude (gsd-verifier)_

## Orchestrator addendum (2026-09-26T19:01:59Z)

- **Browser coverage, verified by the orchestrator's own run:** the full Playwright suite (`npm run test:e2e` — both phones and the desktop, Turbopack dev server on port 3100) ran on HEAD `c0727ec`, after the seven review fixes: 293 passed, 0 failed, 241 skipped (the usual cross-project skips), 8.2 min. The two re-recorded desktop baselines (ROCKER, VOLUME) matched.
- **Verifier claims reproduced by hand:** the four R16 test titles are present verbatim in `lib/geometry/blank-fit.test.ts`; `git merge-base --is-ancestor 04b3b08 48b258d` confirms the four tests landed before the first `components/` commit; `npm run build`, `npx vitest run` (73 files, 2865 passed, 2 skipped) and `npm run lint` (0 errors) were green on the same HEAD.
- **One human item added** at the top of `human_verification`: the phase's own DONE WHEN walked through on a desktop by the founder. The verifier's six items each check one piece; none walks the whole flow.
