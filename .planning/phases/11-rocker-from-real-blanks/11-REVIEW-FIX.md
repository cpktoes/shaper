---
phase: 11-rocker-from-real-blanks
fixed: 2026-09-26T19:00:00Z
review: 11-REVIEW.md
iteration: 1
findings_in_scope: 9
counts:
  fixed: 7
  skipped: 2
status: partial
---

# Phase 11: Code Review Fix Report

**Source review:** `.planning/phases/11-rocker-from-real-blanks/11-REVIEW.md`
**Scope:** WR-01, WR-02, WR-03, WR-04, WR-05, IN-01 and IN-02 are fixed as designed by the orchestrator. CR-01 and WR-06 are skipped on purpose (reasons below).
**Where the checks ran:** in the main checkout on branch `rocker-blanks`. No worktree was used, so every number below can be reproduced from this tree.

## Fixed

### WR-01: Remove This Blank keeps the five stations exactly and says so
**Commit:** `b7da4ee`
**Files:** `lib/geometry/board-profile.ts`, `components/design/design-store.tsx`, `components/rocker/blank-picker.tsx`, `lib/geometry/board-profile.test.ts`, `components/design/design-store.test.ts`
**What changed:**
- I measured the reviewer's residuals first. At the five stations, thickness was already exact. So was rocker, except for one thing: the move dropped the centre rocker, which is non-zero when the board sits off-centre on its blank (up to about 0.015 mm across the presets). The larger figures (5.9 mm and 3.8 mm) are between the stations, where the five-station pchip draws a different curve from the blank's own. That is accepted.
- The new pure function `handSetFromProfile(profile, foil)` sets each of the four lifts to the station rocker minus the centre rocker. The two 12" thicknesses come from the final foil (`effectiveFoil`, which includes fine-tunes). `foil.center` and both tips stay the stored values. The store's `removeBlank` now calls this function.
- The hint now reads exactly: "Removing it keeps the rocker and foil at the five stations and re-draws the curve through them, for you to set by hand." No existing test asserted the old wording.

**Proof:** `board-profile.test.ts`, "Remove This Blank keeps the five stations exactly (WR-01)". It covers the four presets and the default board in Marko 6'0" M-Regular, and the four presets in their own blanks, each at placement 0 and +1/2", with non-zero fine-tunes. The checks, all within 1e-6 mm:
- thickness at all five stations is unchanged
- rocker at the four non-centre stations equals the old value minus the old centre
- the centre reads 0

A guard test makes sure at least one case really has a non-zero centre. I temporarily brought back the old behaviour: 5 cases failed, then passed again once restored. A store source test pins that `removeBlank` delegates to the function.

### WR-02: a fit-defaults save writes only the fields it was given
**Commit:** `8953340`
**Files:** `app/actions/fit-defaults.ts`, `lib/fit-defaults-preference.ts`, `components/fit-defaults-provider.tsx`, `lib/fit-defaults-preference.test.ts`, `lib/db/fit-defaults-save.test.ts` (new)
**What changed:**
- `saveFitDefaultsPreference(patch: FitDefaultsPatch)` keeps its name and still runs `await auth()` first.
- `parseFitDefaultsPatch` rejects the whole call if it contains an unknown key or a bad value.
- The update's `set` comes from `fitDefaultsUpdateSet(patch)`, so it names only the keys present plus `updatedAt`. A first-time insert fills every absent key with null (`fitDefaultsInsertColumns`).
- On the provider side:
  - `setDefault` sends `{ [key]: value }`.
  - `restoreDefaults` sends all five as null.
  - The browser merges the patch into what it already holds (`mergeFitDefaultsPatch`).
- The write queue keeps only the last value, so patches made while a save is in flight are collected and sent together. A key leaves the collected set once a save carrying that exact value succeeds.
- The sign-in promotion (`decideFitDefaultsHandoff().promoteToAccount`) is now a patch of only the fields the account lacked. It no longer re-sends the whole merged preference.

**Proof:** `lib/db/fit-defaults-save.test.ts` renders the real upsert through Drizzle's `.toSQL()` with no connection. A one-key patch produces `do update set "width_margin_mm" = $7, "updated_at" = $8`, and the test asserts exactly those two columns. Restore Defaults names all five plus `updated_at`, and `units` and `print_rail_instructions` are never named. Unit tests cover the patch parser (including an unknown key such as `clerkUserId`), the merge, the update set, the insert columns, and the handoff promoting only `widthMargin`. The `ownership.test.ts` contracts stay green.

### WR-03: the seed's --check fails on an empty or short table
**Commit:** `cd19db4`
**Files:** `scripts/seed-blanks.ts`
**What changed:** the existing count line prints first. After it, the script sets exit code 1 in both modes when any of these is true:
- the table is empty
- the stored total differs from `readSeedCatalog`'s count (computed from the catalogue, never typed)
- any vendor's count differs

It prints one line such as `The blanks table does not hold the whole catalogue: expected 162 blanks, found 0 (US Blanks expected 101, found 0; ...)`. The per-row exact-match check is kept. A `missing` count now also fails in check mode. The header comment is updated.

**Proof:** `npx --no-install tsx scripts/seed-blanks.ts --check` against the development branch printed `blanks: 162 (US Blanks 101, Arctic Foam 33, Marko Foam 28); pickable: 158` and `162 of 162` and exited 0. The empty-table path was not run against a real empty table, because there isn't one to point at.

### WR-04: a bad catalogue row is dropped instead of crashing ROCKER
**Commit:** `68ef096`
**Files:** `lib/blanks/catalog.ts`, `lib/models/design-snapshot.ts`, `lib/db/blanks.ts`, `lib/db/blanks.test.ts`, `components/rocker/use-blank-list.ts`
**What changed:**
- There is now one validator. `blankRecordShapeSchema` and `isWellFormedBlankRecord` live in `lib/blanks/catalog.ts`. They check bounds, finite numbers, and stations strictly increasing from the tail.
- The saved-board parser builds on that schema and adds `isPickable`.
- The catalogue read (`isUsableRow`) now requires it too. Every row that fails is dropped with a `console.warn` naming vendor and name. If no blanks survive, the result is still "unavailable".
- The browser-test CSV path goes through the same filter.
- On the client, `prepareCatalogue` wraps each `prepareBlank` in a try/catch that skips that one blank.
- Deviation: the validator lives in `lib/blanks/catalog.ts` rather than the snapshot module. `ownership.test.ts` forbids the word `models` anywhere in `lib/db/blanks.ts`, so importing `@/lib/models/...` there failed that contract. The snapshot module imports the shared schema from `catalog.ts`, so there is still exactly one rule.

**Proof:** in `lib/db/blanks.test.ts`, one row with two stations swapped and one with a repeated station are both dropped. The rest are kept, and exactly two warnings name those two blanks. An all-reversed catalogue returns "unavailable", with one warning per blank. The committed catalogue produces no warnings at all. The client try/catch has no unit test, because `prepareCatalogue` is private to the hook.

### WR-05: a saved board outside the length range reopens hand-set instead of crashing the rack
**Commit:** `62bd9ed`
**Files:** `lib/models/design-snapshot.ts`, `lib/models/rack-models.ts` (new), `lib/models/rack-models.test.ts` (new), `lib/models/design-snapshot.test.ts`, `app/page.tsx`, `components/setup/board-rack-card.tsx`
**What changed:**
- `outline.length` is bounded in the schema to a factor of two either side of `BOARD_LENGTH_RANGE_IN`, which is 30" to 240" (`SNAPSHOT_BOARD_LENGTH_MM`, computed through `inchesToMm`). A length outside that rejects the snapshot as invalid.
- Inside that, a blank on a board outside 60" to 120" (with 1 mm of slack, `isBoardLengthInRange`) is dropped, and the board reopens hand-set.
- For the rack, the new pure helper `rackModelsFromRows` (used by `app/page.tsx`) parses AND summarizes each row, and drops and logs any row where either step throws.
- `BoardRackCard` also catches a throwing `summarizeDesign` and renders nothing for that one card.

**Deviation to review:** the design asked for "the reviewer's crafted 500 mm board with a blank parses to a hand-set board and summarizing it does not throw". That can't be done without changing the geometry. A 500 mm board (under 24") crashes `summarizeDesign` even with no blank, because its centre (250 mm) falls before the tail 12" station (304.8 mm). I checked: every length up to 609 mm throws with `blank: null`. So the 500 mm board falls under the design's own "far outside the range, rejected as invalid" rule:
- The parser rejects it, and the rack drops just that card, which the test proves.
- The "reopens hand-set and summarizes" behaviour is tested instead at 45" and 150", which are outside the range but not far outside it.

**Proof:**
- The snapshot tests cover the 500 mm board being rejected with or without a blank, a length above the far bound being rejected, and 45"/150" boards in a blank parsing with `blank: null` and summarizing without a throw.
- At exactly 60" and 120" (and 0.5 mm past each), the blank is kept.
- Every preset's board in a blank round-trips unchanged.
- An invariant test checks that the lower reject bound keeps every board's centre past the 12" station.
- `rack-models.test.ts` covers the 500 mm board being dropped and logged while the cards before and after it survive, a 50" board kept as a hand-set card, a junk row dropped, and a valid board passed through exactly.

### IN-01: the placement slider can always land on centred
**Commit:** `db51c13`
**Files:** `lib/geometry/blank-reasons.ts`, `lib/geometry/blank-reasons.test.ts`
**What changed:** in Imperial, `placementSlider` now rounds each end's reach inward onto the 1/16" grid before handing the range to `measureSlider`. That gives min = −floor(reach/step)·step and max = +floor(reach/step)·step. Metric already did this through `metricSliderRange`, which rounds inward to whole millimetres, and is unchanged. Zero is therefore always a step in both systems.

**Proof:** a new test in `blank-reasons.test.ts` covers every pickable blank (read through `readSeedCatalog`) under the default board and all four preset boards, in both systems. It simulates Base UI's snap (`min + round((0 − min)/step)·step`) and asserts the snap is exactly 0, the stored value is exactly `0`, `formatPlacement` reads `centered`, and min = −max. With the old code the Imperial case failed, as expected, and it passes now. A second test checks that the Imperial ends never pass the placement range beyond float noise (1e-9 mm).

### IN-02: the fit-defaults cookie is written even when storage is blocked
**Commit:** `07b1fb4`
**Files:** `lib/fit-defaults-preference.ts`, `components/fit-defaults-provider.tsx`, `lib/fit-defaults-preference.test.ts`
**What changed:** the new pure writer `writeFitDefaultsToBrowser(pref, { setStorage, setCookie })` tries each write in its own try/catch and reports which ones landed. The provider hands it `localStorage.setItem` and a `document.cookie` assignment. There is nothing to split on the read side: the browser only ever reads localStorage (falling back to page memory), and the cookie is read by the server.

**Proof:** unit tests in `lib/fit-defaults-preference.test.ts` cover three cases:
- blocked storage still writes the cookie
- a refused cookie still writes storage
- both refused never throws

## Skipped

### CR-01: the new `user_preferences` columns break Imperial/Metric and print-toggle saves before the migration
**File:** `lib/db/schema.ts:80-84`
**Reason:** skipped by instruction. The orchestrator is resolving this as a change to the deployment-order rule in CLAUDE.md and plan 11-13 (commit `b7370fb`, "migrate production before the deploy — the expand-first rule"). No code change.
**Original issue:** Drizzle inserts name every column, so the unchanged units and print saves would fail against a production table that doesn't yet have the five new columns.

### WR-06: pchip's SciPy parity values are hand-typed
**File:** `lib/geometry/pchip.test.ts:33-66`
**Reason:** accepted by decision. CONTEXT D-13's discretion note explicitly allows hand-worked pchip tangent values for the 4- and 5-point cases, with a SciPy fixture optional. SciPy is not installed on this machine.
**Original issue:** Rule 1 wants expected values generated from a fixture script, not transcribed.

## Final verification (main checkout, `rocker-blanks`)

- `npx tsc --noEmit`: clean.
- `npx vitest run`: 73 files, 2865 passed, 2 skipped, 0 failed.
- `npm run lint`: 0 errors, 11 warnings. All the warnings are in files this fix didn't touch (rails figure, drag-spacing and outline tests, the golden-extract scripts).
- `PW_PORT=3100 npx playwright test e2e/rocker-blanks.spec.ts --project=desktop --project=android`: 18 passed.
- Extra: `e2e/fit-defaults.spec.ts` and `e2e/new-board.spec.ts` on desktop: 6 passed, 1 skipped (the skip is by design).
- The dev server on port 3100 is gone afterwards. No `--update-snapshots`, and the baseline PNGs are untouched.

---

_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
