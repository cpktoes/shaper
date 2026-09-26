---
phase: 11-rocker-from-real-blanks
reviewed: 2026-09-26T18:00:50Z
depth: standard
files_reviewed: 85
files_reviewed_list:
  - app/actions/fit-defaults.ts
  - app/design/rocker/page.tsx
  - app/globals.css
  - app/layout.tsx
  - components/design/design-store.test.ts
  - components/design/design-store.tsx
  - components/design/slider-row.test.ts
  - components/fit-defaults-dialog.tsx
  - components/fit-defaults-provider.tsx
  - components/rocker/blank-flag.tsx
  - components/rocker/blank-picker.tsx
  - components/rocker/board-on-blank.tsx
  - components/rocker/rocker-controls.tsx
  - components/rocker/rocker-datasheet.tsx
  - components/rocker/rocker-editor.tsx
  - components/rocker/rocker-view-frame.test.ts
  - components/rocker/rocker-view-frame.ts
  - components/rocker/rocker-viewer.tsx
  - components/rocker/use-blank-list.ts
  - components/settings-menu.tsx
  - components/setup/board-rack-card.tsx
  - components/summary/order-form.tsx
  - components/ui/input.css.test.ts
  - components/viewer/drag-pick-wiring.test.ts
  - components/viewer/drag-readout-chip.test.ts
  - components/viewer/drag-spacing.test.ts
  - drizzle/0004_blanks.sql
  - drizzle/0005_fit_defaults.sql
  - e2e/desktop-baseline.spec.ts
  - e2e/desktop-regression.spec.ts
  - e2e/fit-defaults.spec.ts
  - e2e/new-board.spec.ts
  - e2e/phone-layout.spec.ts
  - e2e/phone-rails.spec.ts
  - e2e/phone-screens.spec.ts
  - e2e/rocker-blanks.spec.ts
  - e2e/touch-drag.spec.ts
  - e2e/touch-sizing.spec.ts
  - e2e/viewer-toolbar.spec.ts
  - lib/blanks/catalog.test.ts
  - lib/blanks/catalog.ts
  - lib/blanks/csv.test.ts
  - lib/blanks/csv.ts
  - lib/blanks/preset-blanks.test.ts
  - lib/blanks/preset-blanks.ts
  - lib/blanks/seed-files.ts
  - lib/db/blanks.test.ts
  - lib/db/blanks.ts
  - lib/db/ownership.test.ts
  - lib/db/queries.ts
  - lib/db/schema.ts
  - lib/fit-defaults-preference.test.ts
  - lib/fit-defaults-preference.ts
  - lib/fit-defaults-server.ts
  - lib/geometry/blank-fit.test.ts
  - lib/geometry/blank-fit.ts
  - lib/geometry/blank-reasons.test.ts
  - lib/geometry/blank-reasons.ts
  - lib/geometry/blank.ts
  - lib/geometry/board-profile.test.ts
  - lib/geometry/board-profile.ts
  - lib/geometry/board.ts
  - lib/geometry/design.test.ts
  - lib/geometry/design.ts
  - lib/geometry/foil.ts
  - lib/geometry/measure-display.test.ts
  - lib/geometry/measure-display.ts
  - lib/geometry/pchip.test.ts
  - lib/geometry/pchip.ts
  - lib/geometry/preset-source.test.ts
  - lib/geometry/preset-source.ts
  - lib/geometry/presets.test.ts
  - lib/geometry/presets.ts
  - lib/geometry/rocker.test.ts
  - lib/geometry/rocker.ts
  - lib/geometry/summary-line.test.ts
  - lib/geometry/summary-line.ts
  - lib/geometry/volume.test.ts
  - lib/geometry/volume.ts
  - lib/models/design-snapshot.test.ts
  - lib/models/design-snapshot.ts
  - lib/units-isolation.test.ts
  - playwright.config.ts
  - scripts/generate-preset-blanks.ts
  - scripts/seed-blanks.ts
findings:
  critical: 1
  warning: 6
  info: 2
  total: 9
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-09-26T18:00:50Z
**Depth:** standard
**Files Reviewed:** 85
**Status:** issues_found

## Summary

This review covers all of Phase 11 (Rocker from Real Blanks) on `rocker-blanks` since `0b03135`. Several claims were checked by running the real code with `npx --no-install tsx` rather than by reading it: the SQL Drizzle generates, what Remove This Blank does to each preset, the saved-board parser against a short board, the seed catalogue's station order, and where the placement slider snaps.

Most of it holds up. pchip's tangent rules match SciPy's `_edge_case` and interior rule term for term. The Server Action checks the session first, takes no owner id from the caller, and filters every field through an allow-list before any SQL. `loadPickableBlanks` and `resolveFitDefaultsHandoff` never throw. The version-4 blank copy is bounded, finite, strictly tail-to-nose and has to be pickable. The placement slider's sign flip is correct. Fine-tunes carry through blank, centre and placement changes. Placement is not a dependency of any verdict. No stray `25.4` or `10` conversion factor was added outside `units.ts`.

What does not hold:

- **One blocker:** adding five columns to `user_preferences` breaks the existing Imperial/Metric and print-toggle saves for every signed-in shaper during the push-then-migrate window. Drizzle names every column on insert.
- **Remove This Blank moves the board.** It says it keeps the rocker and foil "exactly as they are now", but it doesn't.
- **Two rows can crash a page.** A malformed catalogue row can crash the ROCKER page, and a short saved board in a blank can crash the rack.
- **Operational gaps:** the seed script's `--check` passes on an empty table, and the fit-defaults account save can overwrite a setting made on another device.

## Critical Issues

### CR-01: BLOCKER — the new `user_preferences` columns break Imperial/Metric and print-toggle saves in production until the migration runs

**File:** `lib/db/schema.ts:80-84` (with `app/actions/units.ts:36-41`, `app/actions/print-instructions.ts:30-35`)
**Issue:** Drizzle's pg insert lists **every** column in the table and writes `default` for the ones the caller didn't set (`node_modules/drizzle-orm/pg-core/dialect.js:372-388`). Running the unchanged `saveUnitsPreference` insert against the new schema produces this SQL (checked):

```sql
insert into "user_preferences" ("clerk_user_id", "units", "print_rail_instructions",
  "extra_length_mm", "extra_center_thickness_mm", "width_margin_mm",
  "nose_tip_thickness_mm", "tail_tip_thickness_mm", "created_at", "updated_at")
values ($1, $2, default, default, default, default, default, default, default, default) ...
```

CLAUDE.md requires push, then deploy, then `db:migrate:prod`, and 11-13 deliberately parks the production migration until after the merge. For that whole window every signed-in shaper's Imperial/Metric pick and "print rail instructions" tick fails with `column "extra_length_mm" does not exist`. The write queue retries three times and then gives up silently. After the migration, the next page load follows the account-wins rule (`decidePreferenceHandoff`), so the old account value is adopted back into the browser and the pick the shaper made during the window is **reverted**. Only the new fit-defaults read and write were made fail-soft; the two existing writers to the same table were not. The schema comment says "the existing units and print reads never ask for a column that a not-yet-migrated database doesn't have", but that is only true of the reads.
**Fix:** Keep the five new columns off the table the old writers insert into. Give them their own table, so `units.ts` and `print-instructions.ts` build exactly the SQL they did before:

```ts
export const userFitDefaults = pgTable("user_fit_defaults", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  extraLengthMm: doublePrecision("extra_length_mm"),
  extraCenterThicknessMm: doublePrecision("extra_center_thickness_mm"),
  widthMarginMm: doublePrecision("width_margin_mm"),
  noseTipThicknessMm: doublePrecision("nose_tip_thickness_mm"),
  tailTipThicknessMm: doublePrecision("tail_tip_thickness_mm"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Point `readFitDefaultsPreference` and `saveFitDefaultsPreference` at that table and regenerate 0005. The other option is to record an explicit exception: purely additive, nullable columns get migrated *before* the push, because old code keeps working against them. Either way, add a unit test that renders `saveUnitsPreference`'s insert with `.toSQL()` and asserts the column list.

## Warnings

### WR-01: WARNING — "Remove This Blank" does not keep the rocker and foil as they are; the drawing and the litres move

**File:** `components/design/design-store.tsx:856-876`, copy at `components/rocker/blank-picker.tsx:335-337`
**Issue:** `removeBlank` copies only the five station numbers into the hand-set fallback. The fallback then redraws the board through just those five knots on pchip, which is a different curve from the blank's dense one between the stations. It also forces the centre rocker to 0, dropping `stationRocker.center`, which is non-zero whenever the crop's low point is not at the centre (e.g. an off-centre placement). Measured on the four presets straight after Remove:

| Preset | Max rocker change | Max thickness change | Litres |
|---|---|---|---|
| Shortboard | 4.07 mm | 2.32 mm | 30.90 → 30.79 L |
| Fish | 2.10 mm | 2.71 mm | 35.93 → 36.19 L |
| Mid-length | 5.50 mm | 3.84 mm | 52.76 → 52.83 L |
| Longboard | 5.86 mm | 2.00 mm | 76.87 → 77.25 L |

The sidebar still promises "Removing it keeps the rocker and foil exactly as they are now". UI-SPEC says it "changes nothing on the board at the moment it runs". A shaper who trusts that line gets a different volume and a different curve between the stations, with no warning.
**Fix:** Either correct the copy and the spec ("keeps the five station numbers; the curve between them is redrawn through them"), or make the seed honest. At minimum, rebase the lifts on the centre so the fallback's centre = 0 invariant holds (`noseTip: stationRocker.noseTip - stationRocker.center`, and the same for the other three). Also add a test that pins the maximum drift after removal on each preset, so a future change can't widen it silently.

### WR-02: WARNING — the fit-defaults account save overwrites all five settings, so a second device or tab erases picks it never touched

**File:** `components/fit-defaults-provider.tsx:190-212`, `app/actions/fit-defaults.ts:50-63`
**Issue:** `setDefault` builds the whole five-field preference from this tab's own storage and queues it. The Server Action then upserts all five columns. Suppose device A was loaded before device B set Width Margin. When A later changes Nose Tip, it writes `widthMargin: null` (or A's stale value) over B's pick. The header of `fit-defaults-preference.ts` promises the opposite ("a tip chosen on one device and a margin chosen on another both survive — neither device's pick overwrites the other's"). The per-field handoff only protects the moment of sign-in; after that, every save is whole-row last-writer-wins.
**Fix:** Save the field that changed, not the whole preference. For example, `saveFitDefault(key, value)` validates `key` against `FIT_DEFAULTS_KEYS`, runs `value` through `parseFitDefaultValue`, and upserts only that column (`set: { [columnFor[key]]: value, updatedAt }`). Keep a separate all-nulls action for Restore Defaults, and one for the sign-in promotion, which only writes the fields the account lacked.

### WR-03: WARNING — `seed-blanks.ts --check` passes on an empty or partly seeded table

**File:** `scripts/seed-blanks.ts:119-131`
**Issue:** `missing` only sets exit code 1 when `!checkOnly`. On a production `blanks` table that was migrated but never seeded, `--check` prints `blanks: 0 …; pickable: 0` and `matching the catalogue CSVs exactly: 0 of 162`, and then **exits 0**. The read-only check is supposed to be the operator's proof that production is seeded (11-13). As written, it can only catch a row that is wrong, not rows that are missing.
**Fix:**

```ts
if (differing.length > 0 || missing > 0) {
  for (const record of differing) console.error(`  differs from (or is not in) the CSVs: ${record.vendor} ${record.name}`);
  if (missing > 0) console.error(`  ${missing} catalogue blank(s) are not in the table`);
  process.exitCode = 1;
}
```

### WR-04: WARNING — a malformed catalogue row passes the server read and crashes the ROCKER page in the browser

**File:** `lib/db/blanks.ts:87-119`, `components/rocker/use-blank-list.ts:48-62`
**Issue:** `isUsableRow` checks each station's field types and finiteness. It does not check that stations run strictly from tail to nose, that the `C` station is unique, or any range. `isPickable` doesn't check order either. A stored row with two stations at the same `fromTailMm`, or out of order, is therefore sent to the browser. There `prepareCatalogue` calls `prepareBlank` during render, and `preparePchip` throws (`pchip knot k … does not lie after knot k-1`). `app/` has no error boundary (`error.tsx`/`global-error.tsx`), so the whole ROCKER screen fails, not just that row. The file header promises "a row that fails is dropped, not shown". The saved-board parser (`blankRecordSchema`) already enforces the order rule, but the catalogue read doesn't. The committed CSVs are clean today (all 162 blanks were checked strictly increasing), so this is a robustness gap, not a live crash.
**Fix:** Add the same ordering rule to `isUsableRow`:

```ts
row.stations.every((s, i, all) => i === 0 || (s as any).fromTailMm > (all[i - 1] as any).fromTailMm)
```

Better still, validate each row with `blankRecordSchema.safeParse` (exported from `design-snapshot.ts`, or moved to `lib/blanks/catalog.ts` and shared), so the two untrusted-input boundaries can't drift apart. In `prepareCatalogue`, also wrap each `prepareBlank` in try/catch and skip a record that throws.

### WR-05: WARNING — the version-4 parser accepts a board too short for the blank maths, which then crashes the rack and the design screens

**File:** `lib/models/design-snapshot.ts:86-97` (`outline.length` is a bare `z.number()`), `lib/geometry/blank-fit.ts:268-277`
**Issue:** `boardOnBlank` builds its fine-tune humps with knots at `0, W, L/2` and `L/2, L−W, L`, where W = 304.8 mm. `preparePchip` throws unless L > 609.6 mm. The parser bounds every field of the blank copy but not the board length it will be laid against. Checked: a snapshot with a preset's blank and `outline.length: 500` passes `parseSnapshot`, and `saveModel` re-parses and stores it. After that, `summarizeDesign` throws `pchip knot 2 (x=250) does not lie after knot 1 (x=304.8)`. `summarizeDesign` runs during render in `BoardRackCard` (`components/setup/board-rack-card.tsx:127`) and in the design store's `sideProfile` memo. So a board like that crashes the setup screen on every load, outside the `parseSnapshot` try/catch in `app/page.tsx`. Only the owner can store such a board, through a crafted request, but it is a crash that never goes away, on the one screen that would let them delete it.
**Fix:** When a blank is present, bound the length in the schema. Reuse `BOARD_LENGTH_RANGE_IN` through `inchesToMm`, never a literal, with a little slack. For example, apply `.superRefine` on `designFieldsSchema` to reject `blank !== null && (outline.length < inchesToMm(BOARD_LENGTH_RANGE_IN.min) - 1 || outline.length > inchesToMm(BOARD_LENGTH_RANGE_IN.max) + 1)`. As defence in depth, have `boardOnBlank` fall back to `offsetAt = () => 0` when `L / 2 <= W`, instead of throwing.

### WR-06: WARNING — pchip's "SciPy digit parity" expected values are hand-typed, against Rule 1

**File:** `lib/geometry/pchip.test.ts:33-66`
**Issue:** Rule 1 says expected values must come from a generated fixture and must never be hand-transcribed. The six parity cases (`[29/288, 33/304, 55/372, 49/192]`, `[-101/576, -117/3808, 0, 65/688, 11/32]`, `[0.15, 0, 0, 0.45]`, …) were worked out by hand and "checked against SciPy 1.13.1". No script regenerates them, and no fixture records SciPy's own output. A transcription slip, or a SciPy change, would go unnoticed. This is the one module this phase claims is exact against an outside reference.
**Fix:** Add `scripts/extract-pchip-golden.py` (or an `.mjs` that shells out to Python with SciPy), which runs `scipy.interpolate.PchipInterpolator` on the six knot sets and writes `lib/geometry/__fixtures__/pchip-scipy-golden.json` (slopes and a set of sample values). Then have `pchip.test.ts` assert against that JSON.

## Info

### IN-01: INFO (minor) — the Imperial placement slider snaps from its own minimum, not from centre, so it can't land exactly on "centered" for 68 of 158 blanks

**File:** `lib/geometry/blank-reasons.ts:119-134`
**Issue:** Base UI rounds slider values as `min + k·step` (`roundValueToStep`). The Imperial branch of `measureSlider` passes `min = −reach` unrounded. Metric's `metricSliderRange` rounds its bounds inward to the step; Imperial's doesn't. 68 pickable blanks have lengths off the 1/16" grid (US Blanks lengths such as 72.748"). For a 70" board on `6'0"P`, the reachable positions sit 0.001" off every sixteenth, and the nearest one to centre stores −0.0254 mm. The label still reads "centered". But the stored placement no longer matches the grid that `judgeBlank`/`nearestFittingPlacement` used, and a preset capture prints a value that isn't a sixteenth.
**Fix:** In `placementSlider`'s Imperial path, round the reach inward to 1/16" before negating: `const reachIn = Math.floor(mmToInches(range.max) * 16 + 1e-9) / 16`.

### IN-02: INFO (minor) — with localStorage blocked, the fit-defaults cookie is never written either

**File:** `components/fit-defaults-provider.tsx:100-110`
**Issue:** `localStorage.setItem` and `document.cookie = …` share one `try`. When storage throws (a blocked-storage context where cookies still work), the cookie is skipped too. The server then renders the defaults on every request, and the shaper's pick shows up only after hydration, on that one page.
**Fix:** Give the cookie write its own `try`, so a refused localStorage still leaves the server-readable cookie.

---

_Reviewed: 2026-09-26T18:00:50Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
