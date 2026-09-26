---
phase: 11-rocker-from-real-blanks
plan: 09
subsystem: design-store-and-snapshot
status: complete
tags: [rocker, blank, snapshot-v4, design-store, side-profile, datasheet, D-01, D-02, D-11, D-12, D-14, D-16, R1, R4, R5, R6, R14]
requires:
  - "11-01/11-03: BlankRecord / BoardBlank (lib/geometry/blank.ts), prepareBlank / PreparedBlank (lib/geometry/blank-fit.ts), isPickable (lib/blanks/catalog.ts), readSeedCatalog (lib/blanks/seed-files.ts)"
  - "11-04: FiveStationRocker, DEFAULT_FALLBACK_ROCKER, bezierToFiveStations (lib/geometry/rocker.ts); buildBoardProfile / BoardSideProfile (lib/geometry/board-profile.ts); computeCrossSectionVolume's thicknessAt input"
  - "11-07: the read-only RockerViewer({ profile, blank?, ... })"
provides:
  - "DESIGN_SNAPSHOT_VERSION = 4 with a bounded boardBlankSchema; DesignSnapshotFields.blank and a five-station rocker; v1/v2/v3 migration"
  - "useDesign(): rocker (FiveStationRocker), blank, preparedBlank, sideProfile, pickBlank, setPlacement, setFineTune, resetFineTune, removeBlank; updateRocker(Partial<FiveStationRocker>)"
  - "buildRockerPresetSource({ foil, blank }) — the D-03 capture line"
  - "RockerDatasheet({ profile, rocker, foil, outlineGeometry, onChangeRocker, onChangeFoil }) — both DATASHEET states"
affects: [11-10, 11-11, 11-12]
tech-stack:
  added: []
  patterns:
    - "one memoised side profile in the store, read by every consumer (RAILS, VOLUME, drawing, DATASHEET, order form)"
    - "a saved snapshot's untrusted array/free text is bounded in zod (size AND shape), plus a refine that runs the same pickable rule the list uses"
    - "source-contract test for the store's hand-written field lists and for which handlers may write a field"
key-files:
  created:
    - components/design/design-store.test.ts
  modified:
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - lib/geometry/board.ts
    - lib/geometry/rocker.ts
    - lib/geometry/rocker.test.ts
    - components/design/design-store.tsx
    - lib/geometry/preset-source.ts
    - lib/geometry/preset-source.test.ts
    - components/rocker/rocker-editor.tsx
    - components/rocker/rocker-controls.tsx
    - components/rocker/rocker-datasheet.tsx
    - components/summary/order-form.tsx
    - e2e/phone-layout.spec.ts
key-decisions:
  - "Snapshot v4's blank copy must also have strictly tail-to-nose stations (a refine beyond the plan's bounds list): the blank's curves are fitted in that order and prepareBlank would throw on a tampered, unsorted save, crashing the board on reopen"
  - "The store's placement, fine-tune and reset moves are no-ops with no blank picked (guarded before noteEdit, so they never leave a stray pending undo key)"
  - "Foam Off cells that print as zero read as zero, never a warning-ink '-0'"
metrics:
  duration: "about 75 minutes"
  completed: 2026-09-26
actuals:
  tokens: 32300
  tasks: 3
  commits: 4
---

# Phase 11 Plan 09: Saved boards carry their blank, one side profile feeds every screen, and the hand-set rocker is four stations Summary

A board saved from here on keeps its own copy of its foam blank's catalogue rows (snapshot
version 4, bounded against tampering); every board saved before reopens as the same five rocker
numbers it showed; the design store builds one side profile that RAILS, VOLUME, the ROCKER drawing,
the DATASHEET and the Summary all read; and the ROCKER screen's Angle/Smoothness/Flatness sliders
gave way to four plain hand-set rocker sliders, with a DATASHEET that can show a blank's numbers
beside the board's.

## What changed, in plain English

- **Saving and reopening (Task 1).** A saved board now carries its blank by value — the blank's
  station rows, where the board sits on it, and the two 12" fine-tunes — so a later catalogue fix
  can never move it. Boards saved on any earlier version reopen showing the same rocker numbers:
  the old curve is read at the nose tip, nose 12", tail 12" and tail tip at the board's own length.
  A tampered save (33 stations, a 401-character note, a placement of 4001 mm, a fine-tune of 51 mm,
  a blank missing its centre thickness, stations out of order, an infinite number, a garbled rocker)
  is refused outright.
- **The board in memory (Task 2).** The open board knows its blank, placement and fine-tunes, and
  undo, autosave and reopening all carry them. One side profile is built from the blank (or from
  the four hand-set rocker stations when there is none); RAILS' thicknesses and the volume read it.
  For a board without a blank the numbers are exactly what they were (the RAILS desktop baseline did
  not move). New moves exist for the next plans to wire: pick a blank, slide it, fine-tune, reset,
  and remove it without the drawing jumping — one undo step brings a removed blank back.
- **The ROCKER screen (Task 3).** With no blank, the sidebar's ROCKER section is the intro "Hand-set
  until you pick a blank — measured up from a flat surface with the board bottom-down." and four
  sliders (Nose Tip, Nose @ 12", Tail @ 12", Tail Tip). The DATASHEET's rocker row can be typed at
  those four stations again, the centre a fixed 0. With a blank it shows the blank's rows, your
  board's rows and Foam Off (negative in warning ink), the catalogue footnote and any catalogue
  notes; the row names stay put while a phone scrolls the table sideways. The dev-only "Copy preset
  values" button now copies the foil's centre and tips plus a `blank:` line.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | A board saved on any version reopens as five stations, and a new save is version 4 with its blank inside it (tracer) | bde5c49 |
| 2 | The design store holds the picked blank and builds one side profile that RAILS, VOLUME and every drawing read | cb7376c |
| 3 | The ROCKER screen's hand-set rocker is four sliders and a typed row, the DATASHEET can show a blank beside the board, and nothing reads the old curve any more | 7db0752 |

## Verification

- `npx vitest run lib/models/design-snapshot.test.ts lib/geometry/rocker.test.ts` — green (tracer
  verify re-run after commit).
- `npx vitest run components/design/design-store.test.ts lib/geometry/summary-line.test.ts lib/units-isolation.test.ts`
  — failed first (9 of 12, RED), green after the store change.
- End of plan: `npx tsc --noEmit` exit 0; `npx vitest run` 70 files, 2708 passed / 2 skipped;
  `npm run lint` 0 errors (11 pre-existing warnings, none in this plan's files).
- `IS_WEBPACK_TEST=1 PW_PORT=3159 npx playwright test e2e/phone-layout.spec.ts e2e/phone-rails.spec.ts e2e/viewer-toolbar.spec.ts e2e/phone-screens.spec.ts --project=iphone --project=android`
  — 66 passed, 40 skipped.
- `IS_WEBPACK_TEST=1 PW_PORT=3159 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g "TEMPLATE|RAILS|FINS"`
  — 3 passed (RAILS did not move). ROCKER and VOLUME baselines were not run: expectedly stale
  until 11-12.
- Extra: `e2e/desktop-regression.spec.ts` and `e2e/phone-trip.spec.ts` — 5 passed, 7 skipped.
- Dev server on 3159 confirmed stopped afterwards.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing validation] Snapshot v4 rejects a blank whose stations are not strictly tail to nose**
- **Found during:** Task 1
- **Issue:** the bounds list in the plan let a tampered save carry stations in any order;
  `preparePchip` throws on non-ascending knots, so such a save would pass `parseSnapshot` and then
  crash the store the moment the board reopened.
- **Fix:** a `.refine` on `blankRecordSchema` requiring strictly ascending `fromTailMm`, plus a
  rejection test ("stations out of tail-to-nose order are rejected") and a test that every pickable
  seeded blank passes the bounded schema.
- **Files modified:** lib/models/design-snapshot.ts, lib/models/design-snapshot.test.ts
- **Commit:** bde5c49

**2. [Rule 1 - Correctness] Blank moves are no-ops without a blank**
- **Found during:** Task 2
- **Issue:** `setPlacement` / `setFineTune` / `resetFineTune` / `removeBlank` called with no blank
  would have noted a pending undo key with nothing to record.
- **Fix:** each returns before `noteEdit` when `state.blank` is null (the updater also guards).
- **Commit:** cb7376c

Otherwise the plan executed as written. Task 2's RED and GREEN were one commit (the orchestrator's
one-atomic-commit-per-task rule); the RED run is recorded under Verification.

## Human verification deferred to end-of-phase UAT

- **Task 3 human-check:** open a board saved before this phase from the rack, go to ROCKER, compare
  with how it looked before the branch. Expected: the same rocker numbers at the five stations, now
  as four hand-set sliders; the drawing's shape between stations is the five-station pchip curve (a
  small change the founder accepted in D-14). Only a real saved board proves the migration on data
  the tests did not write.
- **DATASHEET zero-one-many backstop:** the three-row (no blank) and eight-row (blank) states, on a
  phone and on desktop. The blank state is not reachable from the screen until 11-11 wires the list.

## Interface notes for 11-10 and 11-11

**Store (`useDesign()`), new or changed:**
- `rocker: FiveStationRocker` — the hand-set fallback `{ noseTip, nose12, tail12, tailTip }`; the
  centre is always 0. Kept, unread, while a blank is picked. `updateRocker(patch: Partial<FiveStationRocker>)`.
- `blank: BoardBlank | null` — `{ copy: BlankRecord, placement: Mm, nose12Offset: Mm, tail12Offset: Mm }`.
- `preparedBlank: PreparedBlank | null` — `prepareBlank(state.blank.copy)`, memoised on the copy's
  identity (so pass a stable record object to `pickBlank`; re-picking the same record object reuses it).
- `sideProfile: BoardSideProfile` — `buildBoardProfile(...)`; `sideProfile.blank` is the
  `BlankSideView` or null. `effectiveRails` reads `sideProfile.effectiveFoil`; the cross-section
  volume reads `sideProfile.effectiveFoil` and `sideProfile.thicknessAt`.
- `pickBlank(record: BlankRecord, placement: Mm)` — one undo step; keeps existing offsets when
  switching blanks, else 0. The record is stored as given (the board's own copy) — pass the list's
  record, not a derived object.
- `setPlacement(p: Mm)` — coalesces per drag (`blank:placement`); stored unclamped, clamped on read
  (`sideProfile.blank.placement` is the clamped value to show).
- `setFineTune(patch: Partial<{ nose12Offset: Mm; tail12Offset: Mm }>)` — coalesces per field.
- `resetFineTune()` — both offsets to 0, one step.
- `removeBlank()` — seeds `rocker` from `sideProfile.stationRocker` (four non-centre values) and
  `foil.nose12`/`foil.tail12` from `sideProfile.effectiveFoil`, sets `blank: null`; one undo step
  restores all of it.
- All four are no-ops (except `pickBlank`) while `blank` is null.
- `applyPreset` still converts `preset.rocker` with `bezierToFiveStations(preset.rocker, preset.outline.length)`
  and sets `blank: null` — **11-10 replaces that** with the presets' blanks. `DEFAULT_DESIGN_STATE.blank`
  is `null`; `useFitDefaults` is not imported anywhere in the store (11-10 wires D-19).
- The R6 source contract (`components/design/design-store.test.ts`) allows only `pickBlank`,
  `removeBlank`, `setPlacement`, `setFineTune`, `resetFineTune`, `applyPreset`, `applyModel` to
  write `blank:`. A new handler that must write it has to be added to that list deliberately.

**Snapshot v4 (`lib/models/design-snapshot.ts`):** exactly one new top-level key, `blank`
(`boardBlankSchema.nullable()`, absent → null). Bounds: ≤ 32 stations (≥ 2), label ≤ 16 chars,
vendor/name/catalogSlug ≤ 120, flag ≤ 400, `pdfPage` integer 0–10000, `lengthMm` (0, 5000],
`fromTailMm` 0–5000 strictly ascending, station values ±1000 or null, `deckLengthMm` 0–5000 or null,
`volumeLitres` 0–1000 or null, `placement` ±4000, offsets ±50, and `isPickable`. **A preset or
test blank must stay inside these bounds or saving it will throw** (a 51 mm fine-tune slider range
would fail). `rocker` is `z.union([fiveStation, bezierV3])`; v3 and v1 go through
`bezierToFiveStations` at the board's own length. `boardBlankSchema` is exported.

**What the sidebar still lacks (11-11):** the CENTER THICKNESS section, the blank list and search,
the picked-blank card with Change/Remove, the BOARD ON BLANK placement slider, the live readouts,
the fine-tune hints/Reset link, and the new subtitle/board line. Today the ROCKER section's four
hand-set sliders and the THICKNESS section's five absolute sliders show in **both** states — 11-11
must show the ROCKER section only in the fallback, and in the blank state turn the 12" thickness
rows into fine-tunes (the stored `foil.nose12`/`tail12` are ignored while a blank is picked, so
those two sliders do nothing visible then). The drawing already receives `blank={sideProfile.blank ?? undefined}`.

**Outside this plan's files, noticed:** the rack card's numbers come from `summarizeDesign`
(`lib/geometry/design.ts`), which reads the snapshot's stored foil and does not know the blank — a
board saved in a blank will show a rack-card volume integrated through its stored five foil
stations, not the blank's scaled foil. 11-10 or 11-11 should route `summarizeDesign` through
`buildBoardProfile` (prepare the copy, pass `thicknessAt`/`effectiveFoil`) so the rack and the
VOLUME screen agree for a blank board.

## Known Stubs

None. The blank-state DATASHEET is fully wired to the store's side profile; it is simply unreachable
until 11-11 lets a shaper pick a blank.

## Threat Flags

None beyond the plan's threat register. T-11-26 mitigated (bounded schema + ordering refine;
`saveModel` re-parses every save). T-11-27 mitigated (catalogue text rendered as React text only; no
`dangerouslySetInnerHTML` in the datasheet). T-11-28 mitigated (`blank` in every hand-written list,
enforced by `design-store.test.ts`).

## Self-Check: PASSED

- FOUND: components/design/design-store.test.ts, lib/models/design-snapshot.ts, components/rocker/rocker-datasheet.tsx, lib/geometry/preset-source.ts
- FOUND commits: bde5c49, cb7376c, 7db0752
