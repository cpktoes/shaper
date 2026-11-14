---
phase: 17
slug: bottom-contours
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-08
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Filled by the planner on 2026-11-08 from the
> research's Validation Architecture (17-RESEARCH.md) and the sixteen plans, in the founder's build order: the maths
> (17-01…17-07), the screen from its tracer (17-08…17-14), the paper (17-15), one go-live (17-16).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 (node; `lib/**/*.test.ts`, `components/**/*.test.ts`) + Playwright 1.63.0 (iphone = iPhone 14 WebKit, android = Pixel 7 Chromium, desktop = Desktop Chrome 1280 × 800) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `playwright.prod.config.ts` |
| **Quick run command** | `npx vitest run lib/geometry/bottom.test.ts lib/geometry/bottom-draw.test.ts lib/geometry/phase17-litres-pin.test.ts lib/geometry/volume.test.ts lib/geometry/board-surface.test.ts lib/export` |
| **Full suite command** | `npm test && npx tsc --noEmit && npm run lint && npm run test:e2e` (+ `npm run build` and `npm run test:e2e:prod` from the main checkout after 17-08, 17-12 and 17-15, and before the go-live) |
| **Estimated runtime** | quick ≈ 20 s; full unit suite ≈ 70 s; full browser suite 20 min to 2 h depending on machine load |

Executors run Playwright from their worktrees as `PW_PORT=33NN IS_WEBPACK_TEST=1 npx playwright test <specs>` (3301 for
17-01 up to 3316 for 17-16's gate copy; Turbopack cannot resolve `next` in a worktree); `npx next typegen` once in a
fresh worktree before `tsc`; the production specs and `npm run build` only from the main checkout (the orchestrator).
The golden is made by executing `reference/sketches/021-bottom-maths.js` at 4,801 stations; the litres pin is made
before `volume.ts` is touched; no test types a figure.

---

## Sampling Rate

- **After every task commit:** the task's own `<verify>` (its vitest files, and its named spec on the named projects).
- **After every plan wave:** on the merged phase branch, `npm test`, `npx tsc --noEmit`, `npm run lint` and the full `npm run test:e2e`; after 17-08 (the nav row) also `npm run build`, `npm run test:e2e:prod` and the six desktop pictures under Turbopack from the main checkout; after 17-12 and 17-15 `npm run test:e2e:prod` again. The seven-to-eight move and the six pictures land in ONE plan (17-08), so no wave leaves a seven-count spec red.
- **Before `/gsd-verify-work`:** the full suite, the production build and `npm run test:e2e:prod` green on PHASE_TIP (17-16 Task 1), and the bottom report on production quoted.
- **Max feedback latency:** one task's verify (under 2 minutes for unit tasks; a named spec on three projects for screen tasks).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | R3, R10, R11 | T-17-02 | the pin can hold only pre-seam figures (its generator refuses once `volume.ts` names `foamOffAt`) | unit (pin, board facts) | `npx vitest run lib/geometry/phase17-litres-pin.test.ts lib/geometry/fins.test.ts lib/geometry/wings.test.ts lib/geometry/design.test.ts` | ❌ W0 (pin created in task, committed alone first) | ⬜ pending |
| 17-01-02 | 01 | 1 | R2, R3 | T-17-01 | every expected figure from the executed, byte-for-byte reference copy | golden script, idempotent | `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-sketch021-bottom-golden.mjs && shasum -a 256 lib/geometry/__fixtures__/bottom-golden.json` before and after a second run, compared with diff | ❌ W0 | ⬜ pending |
| 17-01-03 | 01 | 1 | R15 | — | N/A | founder look | pictures/17-01-the-sketch-on-the-app-boards.png | ❌ | ⬜ pending |
| 17-02-01 | 02 | 2 | R2, R4, R13 | T-17-18, T-17-19 | resolve never mutates the stored cut; nose stations from the nose | unit (golden) | `npx vitest run lib/geometry/bottom.test.ts lib/geometry/design.test.ts` | ❌ W0 (bottom.test.ts created in task) | ⬜ pending |
| 17-02-02 | 02 | 2 | R3, R11 | T-17-04 | foam off never below 0 nor past thickness − 1/4" | unit (golden) | `npx vitest run lib/geometry/bottom.test.ts` | ✅ (Task 1) | ⬜ pending |
| 17-02-03 | 02 | 2 | R15 | — | N/A | founder look | pictures/17-02-four-cuts-against-the-sketch.png | ❌ | ⬜ pending |
| 17-03-01 | 03 | 3 | R3, R8, R11, R14 | T-17-03, T-17-04 | flat boards bit-identical; per-column floor; no NaN at a tip | unit (pin ×3, column map, litres) | `npx vitest run lib/geometry/phase17-litres-pin.test.ts lib/geometry/volume.test.ts lib/geometry/design.test.ts lib/geometry/bottom.test.ts` | ✅ (amend) | ⬜ pending |
| 17-03-02 | 03 | 3 | R11 | T-17-04 | watertight with cuts; mesh within (−0.15%, 0] of the litres; one foam-off function | unit (mesh, CNC, source) + desktop specs | `npx vitest run lib/geometry/board-surface.test.ts lib/export lib/geometry/bottom-source.test.ts` + `PW_PORT=3303 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts e2e/volume-fins-panels.spec.ts e2e/three-d-export.spec.ts --project=desktop` | ❌ W0 (bottom-source.test.ts created in task) | ⬜ pending |
| 17-03-03 | 03 | 3 | R15 | — | N/A | founder look | pictures/17-03-litres-and-sections.png | ❌ | ⬜ pending |
| 17-04-01 | 04 | 4 | R11 | T-17-06 | the headline thickness and VOLUME's estimator never read the lift | unit | `npx vitest run lib/geometry/design.test.ts lib/geometry/imported-readout.test.ts lib/geometry/rail-bands.test.ts` | ✅ (amend) | ⬜ pending |
| 17-04-02 | 04 | 4 | R11, R14 | T-17-05, T-17-03 | one bottom read by every screen; flat unchanged everywhere | unit + e2e | `npm test` + `PW_PORT=3304 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts e2e/template-rails-panels.spec.ts e2e/volume-fins-panels.spec.ts e2e/three-d-screen.spec.ts e2e/three-d-export.spec.ts e2e/summary-planing.spec.ts e2e/summary-rail-instructions-fit.spec.ts e2e/imported-readout.spec.ts --project=desktop` + `e2e/phone-rails.spec.ts` | ✅ (amend) | ⬜ pending |
| 17-04-03 | 04 | 4 | R15 | — | N/A | founder look | pictures/17-04-rails-on-the-bottom.png | ❌ | ⬜ pending |
| 17-05-01 | 05 | 5 | R2, R3, R4, R11 | T-17-01 | golden relations only | unit (golden, litres) | `npx vitest run lib/geometry/bottom.test.ts lib/geometry/design.test.ts` | ✅ (amend) | ⬜ pending |
| 17-05-02 | 05 | 5 | R8 | T-17-04 | the floor flagged where it bites | unit | `npx vitest run lib/geometry/bottom.test.ts -t DATA` | ✅ (amend) | ⬜ pending |
| 17-05-03 | 05 | 5 | R15 | — | N/A | founder look | pictures/17-05-doubles-vees-teardrop.png | ❌ | ⬜ pending |
| 17-06-01 | 06 | 6 | R3, R5, R8 | T-17-11 | count is 0/4/6/8; at most four a side | unit (golden) | `npx vitest run lib/geometry/bottom.test.ts -t channels` | ✅ (amend) | ⬜ pending |
| 17-06-02 | 06 | 6 | R11 | T-17-04, T-17-03 | walls watertight; channel-free boards untouched | unit (mesh, pin) + desktop specs | `npx vitest run lib/geometry/volume.test.ts lib/geometry/board-surface.test.ts lib/geometry/phase17-litres-pin.test.ts lib/export` + `PW_PORT=3306 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-screen.spec.ts e2e/three-d-export.spec.ts e2e/desktop-baseline.spec.ts --project=desktop` | ✅ (amend) | ⬜ pending |
| 17-06-03 | 06 | 6 | R15 | — | N/A | founder look | pictures/17-06-channels.png | ❌ | ⬜ pending |
| 17-07-01 | 07 | 7 | R6, R13 | T-17-11 | one shade path per level; no device read | unit | `npx vitest run lib/geometry/bottom-draw.test.ts lib/geometry/bottom-tile-art.test.ts lib/geometry/blank-reasons.test.ts` | ❌ W0 (created in task) | ⬜ pending |
| 17-07-02 | 07 | 7 | R7, R9 | — | N/A | unit | `npx vitest run lib/geometry/bottom-draw.test.ts -t section` | ✅ (Task 1) | ⬜ pending |
| 17-07-03 | 07 | 7 | R15 | — | N/A | founder look | pictures/17-07-the-drawings.png | ❌ | ⬜ pending |
| 17-08-01 | 08 | 8 | R1, R4, R6, R7, R8 | T-17-16, T-17-10, T-17-11 | lock guard on both actions; text never as markup | e2e (THE TRACER, desktop) + unit | `PW_PORT=3308 IS_WEBPACK_TEST=1 npx playwright test e2e/bottom-screen.spec.ts --project=desktop` + `npx vitest run lib/geometry/screen-tiles.test.ts lib/geometry/imported-readout.test.ts components/design/board-lock-scope.test.ts` | ❌ W0 (spec created in task) | ⬜ pending |
| 17-08-02 | 08 | 8 | R1 | T-17-12 | the sideways tile floor of 92 on both phones | e2e (every eight-count spec, three projects) + desktop baseline (six pictures) | `PW_PORT=3308 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-screen-tiles.spec.ts e2e/phone-sideways-top-bar.spec.ts e2e/step-nav.spec.ts e2e/site-nav-width.spec.ts e2e/phone-trip.spec.ts …` (the plan's full list) + `e2e/desktop-baseline.spec.ts --project=desktop` | ✅ (amend, re-record) | ⬜ pending |
| 17-08-03 | 08 | 8 | R15 | — | N/A | founder look | pictures/17-08-bottom-screen-first-look.png | ❌ | ⬜ pending |
| 17-09-01 | 09 | 9 | R2, R4 | T-17-16 | every new action locked out on a locked board | unit + e2e | `npx vitest run components/bottom components/design/board-lock-scope.test.ts` + `PW_PORT=3309 IS_WEBPACK_TEST=1 npx playwright test e2e/bottom-panel.spec.ts e2e/bottom-screen.spec.ts --project=desktop` | ❌ W0 (created in task) | ⬜ pending |
| 17-09-02 | 09 | 9 | R5, R13 | T-17-16 | as above | e2e (three projects) | `PW_PORT=3309 IS_WEBPACK_TEST=1 npx playwright test e2e/bottom-panel.spec.ts e2e/bottom-screen.spec.ts e2e/board-lock-screens.spec.ts` | ✅ (Task 1) | ⬜ pending |
| 17-09-03 | 09 | 9 | R15 | — | N/A | founder look | pictures/17-09-every-row-and-the-channels.png | ❌ | ⬜ pending |
| 17-10-01 | 10 | 10 | R6, R7 | T-17-11 | drag cost measured on a throttled Pixel 7 | e2e | `PW_PORT=3310 IS_WEBPACK_TEST=1 npx playwright test e2e/bottom-viewer.spec.ts e2e/bottom-screen.spec.ts` | ❌ W0 (created in task) | ⬜ pending |
| 17-10-02 | 10 | 10 | R8 | T-17-16 | a locked board unchanged by BOTTOM | e2e | `PW_PORT=3310 IS_WEBPACK_TEST=1 npx playwright test e2e/bottom-viewer.spec.ts e2e/board-lock-screens.spec.ts e2e/board-lock.spec.ts` | ✅ (amend) | ⬜ pending |
| 17-10-03 | 10 | 10 | R15 | — | N/A | founder look | pictures/17-10-the-viewer-and-data.png | ❌ | ⬜ pending |
| 17-11-01 | 11 | 11 | R9 | T-17-10 | the board name as text only | unit + e2e | `npx vitest run components/bottom` + `PW_PORT=3311 IS_WEBPACK_TEST=1 npx playwright test e2e/bottom-guide.spec.ts e2e/phone-chrome.spec.ts e2e/bottom-screen.spec.ts` | ❌ W0 (words test and spec created in task) | ⬜ pending |
| 17-11-02 | 11 | 11 | R9 | — | N/A | unit + e2e | `npx vitest run components/bottom/bottom-guide-words.test.ts` + `PW_PORT=3311 IS_WEBPACK_TEST=1 npx playwright test e2e/bottom-guide.spec.ts --project=desktop` | ✅ (Task 1) | ⬜ pending |
| 17-11-03 | 11 | 11 | R15 | — | N/A | founder look | pictures/17-11-guide.png | ❌ | ⬜ pending |
| 17-12-01 | 12 | 12 | R10 | T-17-16 | the wing rule locked with the board | e2e | `PW_PORT=3312 IS_WEBPACK_TEST=1 npx playwright test e2e/bottom-wings.spec.ts e2e/wings.spec.ts` | ❌ W0 (created in task) | ⬜ pending |
| 17-12-02 | 12 | 12 | R12 | T-17-07, T-17-08, T-17-09 | a crafted bottom forgiven, never rejecting the board; no key when absent; the report prints ids and litres only | unit + e2e | `npx vitest run lib/models` + `PW_PORT=3312 IS_WEBPACK_TEST=1 npx playwright test e2e/bottom-saving.spec.ts e2e/board-file.spec.ts e2e/undo-redo.spec.ts e2e/open-board-reload.spec.ts` | ✅ (amend) + ❌ W0 (report test, saving spec) | ⬜ pending |
| 17-12-03 | 12 | 12 | R12, R15 | T-17-09 | the env file never named; the orchestrator runs the report with the founder | founder look + development report | `--bottom-report` on the development branch, quoted in 17-12-SUMMARY.md | — | ⬜ pending |
| 17-13-01 | 13 | 13 | R11 | T-17-18 | a fin move writes nothing to the board | e2e + desktop baseline | `PW_PORT=3313 IS_WEBPACK_TEST=1 npx playwright test e2e/fins-contour.spec.ts e2e/volume-fins-panels.spec.ts e2e/fins-off-rail.spec.ts` + `e2e/desktop-baseline.spec.ts --project=desktop` | ❌ W0 (created in task) | ⬜ pending |
| 17-13-02 | 13 | 13 | R13 | — | Rule 2 holds in every new file | unit (source) + e2e | `npx vitest run lib/units-isolation.test.ts lib/geometry/bottom-source.test.ts` + `PW_PORT=3313 IS_WEBPACK_TEST=1 npx playwright test e2e/bottom-metric.spec.ts e2e/app-settings.spec.ts` | ❌ W0 (metric spec created in task) | ⬜ pending |
| 17-13-03 | 13 | 13 | R15 | — | N/A | founder look | pictures/17-13-fins-and-metric.png | ❌ | ⬜ pending |
| 17-14-01 | 14 | 14 | R1 | — | N/A | e2e (phones) | `PW_PORT=3314 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-bottom.spec.ts e2e/bottom-screen.spec.ts --project=iphone --project=android` | ❌ W0 (created in task) | ⬜ pending |
| 17-14-02 | 14 | 14 | R1, R13 | T-17-12 | the sideways floor and the column's own scroll | e2e (three projects) | `PW_PORT=3314 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-bottom.spec.ts e2e/phone-chrome.spec.ts e2e/touch-sizing.spec.ts e2e/phone-sideways-top-bar.spec.ts e2e/bottom-screen.spec.ts e2e/bottom-panel.spec.ts e2e/bottom-viewer.spec.ts e2e/bottom-guide.spec.ts` | ✅ (Task 1) | ⬜ pending |
| 17-14-03 | 14 | 14 | R15 | — | N/A | founder look | pictures/17-14-phones.png | ❌ | ⬜ pending |
| 17-15-01 | 15 | 15 | R14, R13 | T-17-17 | the Full Sized Template and Paper Saver take nothing from the bottom | unit + PDF read-back | `npx vitest run lib/geometry/bottom-print.test.ts components/template lib/geometry/bottom-source.test.ts` + pypdf read-back recorded | ❌ W0 (created in task) | ⬜ pending |
| 17-15-02 | 15 | 15 | R14 | T-17-17 | a flat board's sheets identical in both flat cases | e2e + markup capture | `PW_PORT=3315 IS_WEBPACK_TEST=1 npx playwright test e2e/summary-bottom-page.spec.ts e2e/summary-planing.spec.ts e2e/summary-rail-instructions-fit.spec.ts e2e/summary-print-size.spec.ts` | ❌ W0 (created in task) | ⬜ pending |
| 17-15-03 | 15 | 15 | R15 | — | N/A | founder look | pictures/17-15-paper.png | ❌ | ⬜ pending |
| 17-16-01 | 16 | 16 | R1, R11, R12, R14, R15 | T-17-14, T-17-09, T-17-08 | push only on the founder's go; the production report first | gate (orchestrator) + founder | full gate on PHASE_TIP (`npm test && npx tsc --noEmit && npm run lint && npm run build && npm run test:e2e && npm run test:e2e:prod`) + `--bottom-report` on production | ✅ | ⬜ pending |
| 17-16-02 | 16 | 16 | R15 | T-17-14 | the merge's second parent checked | live check | `git rev-parse origin/main^2` = PHASE_TIP + live Playwright | — | ⬜ pending |
| 17-16-03 | 16 | 16 | R15 | — | N/A | founder confirmation | recorded in 17-16-SUMMARY.md | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Every missing test file is created by the task that needs it, test first (no separate scaffolding wave):

- [ ] `scripts/extract-phase17-litres-pin.ts` + `lib/geometry/__fixtures__/phase17-litres-pin.json` + `lib/geometry/phase17-litres-pin.test.ts` (17-01 Task 1 — FIRST, committed alone, before `volume.ts` changes)
- [ ] `reference/sketches/021-bottom-maths.js` + `scripts/extract-sketch021-bottom-golden.mjs` + `lib/geometry/__fixtures__/bottom-golden.json` (17-01 Task 2)
- [ ] `lib/geometry/bottom.test.ts` (17-02); `lib/geometry/bottom-source.test.ts` (17-03)
- [ ] `lib/geometry/bottom-draw.test.ts`, `lib/geometry/bottom-tile-art.test.ts` (17-07)
- [ ] `e2e/bottom-screen.spec.ts` and `e2e/helpers/screens.ts` counting eight (17-08)
- [ ] `components/bottom/bottom-copy.test.ts`, `e2e/bottom-panel.spec.ts` (17-09); `e2e/bottom-viewer.spec.ts` (17-10)
- [ ] `components/bottom/bottom-guide-words.test.ts`, `e2e/bottom-guide.spec.ts` (17-11)
- [ ] `lib/models/bottom-report.test.ts`, `e2e/bottom-wings.spec.ts`, `e2e/bottom-saving.spec.ts` (17-12)
- [ ] `e2e/fins-contour.spec.ts`, `e2e/bottom-metric.spec.ts` (17-13); `e2e/phone-bottom.spec.ts` (17-14)
- [ ] `lib/geometry/bottom-print.test.ts`, `e2e/summary-bottom-page.spec.ts` (17-15)
- [x] Framework install: none needed (Vitest and Playwright present; no new package, C5)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The founder's look at every plan's pictures | R15 | A picture judgement in his own words; each plan ends `autonomous: false` | Each plan's last task: open its `pictures/17-NN-*.png`, answer "approved" or say what to change |
| A finger on real hardware: dragging the cutting line, GUIDE scrolling inside its card, the 360-dot sideways floor, eight tiles in one row on a real iPhone with its insets | R1 (D-02, D-27) | Playwright's profiles emulate touch but not a real phone's Safari and insets (UI-SPEC open item 2) | 17-14 Task 3 (optional, over Wi-Fi) and 17-16 Task 1 step 3 on his iPhone and iPad |
| The drawing's frame rate while dragging on a real mid-range Android | R6 | Research assumption A1 (phone CPU 3–6× slower than Node) | 17-10 measures on the throttled Pixel 7 profile and records it; the founder's phone at the gate |
| The saved boards open flat and unchanged | R12 (D-24) | Real data, read through env files the executors may not touch | 17-12 Task 3 (the orchestrator on the development branch, with the founder) and 17-16 Task 1 step 4 (the founder on production, `--bottom-report`) |
| The GUIDE's words and the starting numbers | R9, R2 (D-08, D-18) | First drafts for the founder's pen | 17-11 Task 2 folds his marked-up copy; the UAT on the live page is his last chance |
| The research's readings taken for his overrule: DATA's Foam off on the Longboard (D-34), RAILS on the Longboard's belly (D-35), nose stations from the nose (D-39), the floor at the rails (D-33) | R8, R11, R12 | His rulings, flagged at plan approval | 17-02, 17-04 and 17-05 checkpoints show the pictures; 17-16 Task 1 step 5 records his answers |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a founder checkpoint
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (each created by its own task)
- [x] No watch-mode flags
- [ ] Feedback latency < 17s (unit tasks yes; browser tasks take minutes by nature)
- [ ] `nyquist_compliant: true` set in frontmatter (set by `/gsd-validate-phase`)

**Approval:** pending
