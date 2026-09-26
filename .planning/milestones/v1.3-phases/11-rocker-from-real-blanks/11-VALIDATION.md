---
phase: 11
slug: rocker-from-real-blanks
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-26
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Filled by the planner from
> `11-RESEARCH.md` "Validation Architecture" and the thirteen plans.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 (node environment) for every pure module; Playwright 1.63.0 (Chromium + WebKit, projects `iphone`, `android`, `desktop`) for the browser |
| **Config file** | `vitest.config.ts` (includes `lib/**/*.test.ts`, `components/**/*.test.ts`); `playwright.config.ts` (own dev server on 3100, `PW_PORT` override, fake non-secret env, `SHAPER_BLANKS_SOURCE=seed-csv` from 11-05) |
| **Quick run command** | `npx vitest run lib/geometry/pchip.test.ts lib/geometry/blank-fit.test.ts lib/blanks` |
| **Full suite command** | `npm test && npm run lint && npm run test:e2e` (in a worktree: `npx vitest run && npx tsc --noEmit && npm run lint`, and `IS_WEBPACK_TEST=1 PW_PORT=<assigned> npx playwright test`) |
| **Estimated runtime** | ~15 seconds unit suite; ~6–10 minutes full Playwright suite (three projects) |

---

## Sampling Rate

- **After every task commit:** the quick command plus the touched file's own suite (each task's `<verify><automated>`).
- **After every plan wave:** `npm test && npm run lint`, `npm run build` from the main checkout (the orchestrator — Turbopack cannot build in a worktree), then `npm run test:e2e` on the branch.
- **Known-red during execution (declared, not failures):** `e2e/desktop-baseline.spec.ts` VOLUME from wave 2 (11-04 moves the litres 29.79 → 29.94) and ROCKER from wave 3 (11-07 changes the drawing), until 11-12 Task 3 re-records exactly those two. Every other e2e test stays green after every wave. Inside plan 11-09, `npx tsc --noEmit` is red between Task 1 and the end of Task 3 (the rocker's type changes in one plan); it must be clean when the plan ends.
- **Before `/gsd-verify-work`:** full suite green, including the two re-recorded baselines, and the R16 ancestry check passing.
- **Max feedback latency:** ~15 seconds for a unit task; e2e tasks name their single spec and project.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | R4, R16 (a), R7, R10, R11 | T-11-01 | CSV rows strict (13 fields, finite numbers, empty → null) | unit | `npx vitest run lib/geometry/blank-fit.test.ts -t "reproduces the catalogue rocker"` | ❌ W0 (created by this task) | ⬜ pending |
| 11-01-02 | 01 | 1 | R16 (b)(c), R7, R8, R9, R10, R11, R14 | T-11-01, T-11-02 | non-finite knots rejected; empty cell never 0 | unit | `npx vitest run lib/geometry/pchip.test.ts lib/blanks/csv.test.ts lib/blanks/catalog.test.ts lib/geometry/blank-fit.test.ts` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | R16 (d), R3, R12, R13 | T-11-03 | placement clamped on read; outside the blank reads 0 | unit | `npx vitest run lib/geometry/blank-fit.test.ts && npx vitest run && npx tsc --noEmit && npm run lint` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | R15 | — | N/A | unit | `npx vitest run lib/geometry/measure-display.test.ts lib/units-isolation.test.ts` | ✅ (extended) | ⬜ pending |
| 11-02-02 | 02 | 1 | R2, R5 (D-09) | T-11-04, T-11-05 | cookie/localStorage/action values allow-listed, never throw | unit | `npx vitest run lib/fit-defaults-preference.test.ts && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | R2 (D-04, D-06, D-07) | T-11-07 | judging loops bounded; < 250 ms budget test | unit | `npx vitest run lib/geometry/blank-fit.test.ts && npx tsc --noEmit` | ✅ (from 11-01) | ⬜ pending |
| 11-03-02 | 03 | 2 | R6 (D-08) | T-11-07 | — | unit (property) | `npx vitest run lib/geometry/blank-fit.test.ts -t "the offer and the rescue"` | ✅ | ⬜ pending |
| 11-03-03 | 03 | 2 | R12, R15 | T-11-08 | copy composed from numbers only | unit | `npx vitest run lib/geometry/blank-reasons.test.ts && npx vitest run && npx tsc --noEmit && npm run lint` | ❌ W0 | ⬜ pending |
| 11-04-01 | 04 | 2 | R10, R14 (D-14) | T-11-09 | — | unit | `npx vitest run lib/geometry/rocker.test.ts && npx tsc --noEmit` | ✅ (extended) | ⬜ pending |
| 11-04-02 | 04 | 2 | R4, R5, R10, R13, R14 | T-11-09 | no NaN into drawing/verdicts | unit | `npx vitest run lib/geometry/board-profile.test.ts && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 11-04-03 | 04 | 2 | R10 (D-13) | T-11-10 | fixtures only change via their scripts | unit | `npx vitest run && npx tsc --noEmit && npm run lint` | ✅ | ⬜ pending |
| 11-05-01 | 05 | 2 | R8, R9 | T-11-11, T-11-13, T-11-16 | public read is read-only, bounded, never rejects; seed-csv switch only in Playwright config | unit + source contract | `npx vitest run lib/db/blanks.test.ts lib/db/ownership.test.ts lib/auth/open-access.test.ts && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 11-05-02 | 05 | 2 | R7, R8, R9 [BLOCKING] | T-11-14, T-11-15, T-11-SC | parameterised upsert; env never printed; `npx --no-install` | DB check (dev branch) | `WT="$(pwd)"; cd /Users/kontoes/Code/shaper && npx --no-install tsx --tsconfig "$WT/tsconfig.json" "$WT/scripts/seed-blanks.ts" --check \| grep -F "blanks: 162 (US Blanks 101, Arctic Foam 33, Marko Foam 28); pickable: 158"` | ❌ W0 | ⬜ pending |
| 11-06-01 | 06 | 3 | R2, R5 (D-09) | T-11-17, T-11-18, T-11-19 | auth first; allow-listed input; projection-only read in try/catch | source contract | `npx vitest run lib/db/ownership.test.ts lib/auth/open-access.test.ts && npx tsc --noEmit` | ✅ (extended) | ⬜ pending |
| 11-06-02 | 06 | 3 | D-09 [BLOCKING] | T-11-20 | development branch only | migration check | `test "$(grep -c "ADD COLUMN" drizzle/0005_fit_defaults.sql)" = "5" && grep -q '"tag": "0005_fit_defaults"' drizzle/meta/_journal.json` | ❌ W0 | ⬜ pending |
| 11-07-01 | 07 | 3 | R4, R15 (D-15) | T-11-21, T-11-22 | catalogue text as React attribute only; corrupt span → 0 | unit + source contract | `npx vitest run components/rocker/rocker-view-frame.test.ts components/viewer/toolbar-button.test.ts lib/units-isolation.test.ts && npx tsc --noEmit` | ✅ (extended) | ⬜ pending |
| 11-07-02 | 07 | 3 | D-14 (retirements) | T-11-21 | — | source contract + e2e | `npx vitest run components/viewer && IS_WEBPACK_TEST=1 PW_PORT=3157 npx playwright test e2e/phone-screens.spec.ts e2e/viewer-toolbar.spec.ts e2e/touch-drag.spec.ts e2e/desktop-regression.spec.ts` | ✅ (rewritten) | ⬜ pending |
| 11-07-03 | 07 | 3 | D-13, D-14 (deletions) | — | — | type + unit | `test ! -e lib/geometry/rocker-drag.ts && test ! -e lib/geometry/monotone-spline.ts && npx tsc --noEmit && npx vitest run` | ✅ | ⬜ pending |
| 11-08-01 | 08 | 4 | R2, R5 (D-09) | T-11-23, T-11-25 | storage parsed via allow-list; string snapshot | type + e2e | `npx tsc --noEmit && IS_WEBPACK_TEST=1 PW_PORT=3158 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop -g "TEMPLATE\|RAILS\|FINS"` | ✅ | ⬜ pending |
| 11-08-02 | 08 | 4 | R15 (D-09) | T-11-24 | typed input parsed and clamped | unit + e2e | `npx vitest run lib/units-isolation.test.ts && IS_WEBPACK_TEST=1 PW_PORT=3158 npx playwright test e2e/fit-defaults.spec.ts` | ❌ W0 | ⬜ pending |
| 11-09-01 | 09 | 4 | R1 (D-01, D-14) | T-11-26 | bounded v4 schema; oversized/non-pickable copies rejected | unit | `npx vitest run lib/models/design-snapshot.test.ts lib/geometry/rocker.test.ts` | ✅ (extended) | ⬜ pending |
| 11-09-02 | 09 | 4 | R1, R6, R14 (D-11, D-12) | T-11-28 | blank in every hand-written list | source contract | `npx vitest run components/design/design-store.test.ts lib/geometry/summary-line.test.ts lib/units-isolation.test.ts` | ❌ W0 | ⬜ pending |
| 11-09-03 | 09 | 4 | R4, R5 (D-14, D-16) | T-11-27 | catalogue text as React text only | type + unit + e2e | `npx tsc --noEmit && npx vitest run && IS_WEBPACK_TEST=1 PW_PORT=3159 npx playwright test e2e/phone-layout.spec.ts e2e/phone-rails.spec.ts e2e/viewer-toolbar.spec.ts e2e/phone-screens.spec.ts` | ✅ | ⬜ pending |
| 11-10-01 | 10 | 5 | R13 (D-03) | T-11-29, T-11-SC | generated JSON equals CSV rows; `npx --no-install` | unit + determinism | `npx --no-install tsx --tsconfig ./tsconfig.json scripts/generate-preset-blanks.ts && git diff --exit-code lib/blanks/preset-blanks.generated.json && npx vitest run lib/blanks/preset-blanks.test.ts lib/geometry/presets.test.ts && npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 11-10-02 | 10 | 5 | R14 (D-01 across screens) | — | — | unit | `npx vitest run lib/geometry/design.test.ts lib/geometry/summary-line.test.ts lib/units-isolation.test.ts && npx tsc --noEmit` | ✅ | ⬜ pending |
| 11-10-03 | 10 | 5 | R5 (D-19) | T-11-30 | tips only via allow-listed provider | source contract + e2e | `npx vitest run components/design/design-store.test.ts && IS_WEBPACK_TEST=1 PW_PORT=3160 npx playwright test e2e/new-board.spec.ts --project=desktop --project=android` | ❌ W0 (spec) | ⬜ pending |
| 11-11-01 | 11 | 5 | R2, R14 (D-07) | T-11-33, T-11-34 | public data only; verdicts not on placement | type + e2e | `npx tsc --noEmit && npx vitest run lib/units-isolation.test.ts && IS_WEBPACK_TEST=1 PW_PORT=3161 npx playwright test e2e/rocker-blanks.spec.ts --project=desktop --project=android` | ❌ W0 (spec) | ⬜ pending |
| 11-11-02 | 11 | 5 | R6, R12 (D-06, D-08) | T-11-31, T-11-32 | literal substring search; React text only | unit + e2e | `npx vitest run lib/geometry/blank-reasons.test.ts lib/units-isolation.test.ts && IS_WEBPACK_TEST=1 PW_PORT=3161 npx playwright test e2e/rocker-blanks.spec.ts --project=desktop --project=android` | ✅ | ⬜ pending |
| 11-11-03 | 11 | 5 | R1, R3, R4, R5, R15 (D-11, D-12) | — | — | unit + e2e | `npx vitest run components/design/slider-row.test.ts lib/units-isolation.test.ts && IS_WEBPACK_TEST=1 PW_PORT=3161 npx playwright test e2e/rocker-blanks.spec.ts` | ✅ | ⬜ pending |
| 11-12-01 | 12 | 6 | R3, R14 | — | zero requests during a drag (signed out) | e2e | `IS_WEBPACK_TEST=1 PW_PORT=3162 npx playwright test e2e/touch-drag.spec.ts --project=android && IS_WEBPACK_TEST=1 PW_PORT=3162 npx playwright test e2e/desktop-regression.spec.ts --project=desktop` | ✅ | ⬜ pending |
| 11-12-02 | 12 | 6 | R6, R15 (D-16) | — | — | e2e | `IS_WEBPACK_TEST=1 PW_PORT=3162 npx playwright test e2e/touch-sizing.spec.ts e2e/phone-rails.spec.ts e2e/rocker-blanks.spec.ts` | ✅ | ⬜ pending |
| 11-12-03 | 12 | 6 | R15, R16 | T-11-36 | one named re-record; other baselines hash-identical | e2e + git | `IS_WEBPACK_TEST=1 PW_PORT=3162 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop && test ! -e e2e/_volume-diff.tmp.spec.ts` | ✅ | ⬜ pending |
| 11-13-01 | 13 | 7 | R7, R8, R9 (production) | T-11-37, T-11-38, T-11-39 | migrate after deploy; temp env file deleted by trap | manual (human-action) | — (founder pastes migrate + `--check` output) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Every code task carries an `<automated>` verify; the one task without one is the production checkpoint (11-13), and it is
not adjacent to two other unverified tasks, so no three consecutive tasks lack automated verification.

---

## Wave 0 Requirements

Test files that do not exist yet and are created by the first task that needs them (TDD-style, inside the plan — no
separate scaffolding wave is needed, because the geometry wave itself is wave 1 and lands the four named tests first):

- [ ] `lib/geometry/blank-fit.test.ts` — the four R16 tests by exact title: (a) `reproduces the catalogue rocker at the tips and 12" stations for a board exactly as long as Marko 6'0" M-Regular at placement 0`, (b) `pchip never overshoots between two stations on any seeded blank`, (c) `levelling puts the curve's minimum at exactly 0`, (d) `the fit check rejects a board thicker than the blank near the nose even when the centre fits` — plus placement range, scaled foil, fit, judging and nearest-fit suites (11-01, 11-03)
- [ ] `lib/geometry/pchip.test.ts` — SciPy parity cases, prepared API, carried-over no-overshoot tests (11-01)
- [ ] `lib/blanks/csv.test.ts`, `lib/blanks/catalog.test.ts` — reader and mapping over the real CSVs (11-01)
- [ ] `lib/fit-defaults-preference.test.ts` — allow-list, cookie, per-field handoff (11-02)
- [ ] `lib/geometry/blank-reasons.test.ts` — reason vocabulary, placement words, floor/empty copy, search, both systems (11-03, 11-11)
- [ ] `lib/geometry/board-profile.test.ts` — fallback and blank side profiles, deck = rocker + thickness (11-04)
- [ ] `lib/db/blanks.test.ts` — row mapping round trip, seed-csv source, fail-soft states (11-05)
- [ ] `playwright.config.ts` `SHAPER_BLANKS_SOURCE=seed-csv` — so every ROCKER browser test sees the catalogue without a database (11-05)
- [ ] `components/design/design-store.test.ts` — source contract for the store's hand-written lists and profile wiring (11-09, extended 11-10)
- [ ] `lib/blanks/preset-blanks.test.ts` — preset picks drift guard (11-10)
- [ ] `e2e/fit-defaults.spec.ts` (11-08), `e2e/new-board.spec.ts` (11-10), `e2e/rocker-blanks.spec.ts` (11-11, extended 11-12)

Existing suites extended rather than created: `measure-display.test.ts`, `rocker.test.ts`, `volume.test.ts`,
`design-snapshot.test.ts`, `ownership.test.ts`, `rocker-view-frame.test.ts`, `drag-pick-wiring.test.ts`,
`drag-readout-chip.test.ts`, `drag-spacing.test.ts`, `units-isolation.test.ts`, `slider-row.test.ts`, `presets.test.ts`,
`preset-source.test.ts`, `design.test.ts`, `summary-line.test.ts`, and the e2e specs `phone-screens`, `viewer-toolbar`,
`touch-drag`, `desktop-regression`, `phone-layout`, `phone-rails`, `touch-sizing`, `desktop-baseline`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The drawing's look — the blank's faint line, the foam shade, the board inside — in Daylight, Chalk, Slate and Phosphor | D-15, R15 | Colour legibility across four themes is a visual judgement; no AA test exists in the repo | After 11-11: open `/design/rocker`, pick a blank, switch through the four themes; the blank reads as an object behind the board and the foam as a wash (11-07 Task 1 human-check) |
| A real-phone walk of the picker and the placement thumb | R3, R14, touch sizing | Emulator evidence is not phone evidence in this project | Real iPhone and real Pixel: scroll the controls, pick a blank, drag the placement thumb, fine-tune a 12" station (11-11 Task 3 human-check) |
| A board saved before this phase reopens as it looked | D-02, D-14 | Needs the founder's real saved boards | Open an older board from the rack, compare ROCKER with before (11-09 Task 3 human-check) |
| The re-recorded baseline images are right, not just stable | R15 | A baseline is a judgement of the picture | Compare the new ROCKER and VOLUME images with the previous ones in git history (11-12 Task 3 human-check) |
| Held-out visual checks lifted as backstops | UI-SPEC backstops, SPEC edge E1 | The states are unreachable or fixed by construction | Center Thickness half-typed then abandoned leaves the centre untouched; the readouts block shows exactly five rows in both systems; the DATASHEET shows three rows without a blank and eight with one on phone and desktop; E1 "No blank is long enough" copy (unreachable with shipped bounds) |
| Production migration and seed, after the deploy | R7, R8, R9 on production; SPEC Constraints | Needs production credentials and the founder's merge; must follow the deploy (CLAUDE.md Database) | 11-13: `npm run db:migrate:prod`, then the trap-wrapped production seed and `--check` (expects 162 / 101 / 33 / 28 / 158), then the live site checks |
| Replacing the four provisional preset picks | D-03 | The founder's own capture loop, after the phase | On ROCKER, open each preset, pick the blank the founder wants, "Copy preset values", paste the `blank:` line into `lib/geometry/presets.ts`, re-run `npx --no-install tsx scripts/generate-preset-blanks.ts` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s for unit tasks
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
