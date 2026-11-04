---
phase: 16
slug: 3d-board-and-cnc-export
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-03
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Filled by the planner on 2026-11-04 from the
> research's Validation Architecture (16-RESEARCH.md) and the fourteen plans (16-14 split out of 16-08 at the checker's warning).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 (node; `lib/**/*.test.ts`, `components/**/*.test.ts`) + Playwright 1.63.0 (iphone = iPhone 14 WebKit, android = Pixel 7 Chromium, desktop = Desktop Chrome 1280 × 800) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `playwright.prod.config.ts` |
| **Quick run command** | `npx vitest run lib/geometry/board-surface.test.ts lib/geometry/volume.test.ts lib/geometry/view-3d.test.ts lib/export` |
| **Full suite command** | `npm test && npx tsc --noEmit && npm run lint && npm run test:e2e` (+ `npm run test:e2e:prod` after each merge that touches the 3D route, and before the go-live) |
| **Estimated runtime** | quick ≈ 15 s; full unit suite ≈ 60 s; full browser suite 20 min to 2 h depending on machine load |

Executors run Playwright from their worktrees as `PW_PORT=32NN IS_WEBPACK_TEST=1 npx playwright test <specs>` (Turbopack
cannot resolve `next` in a worktree). Production-build specs and `npm run build` run only from the main checkout (the
orchestrator). WebGL draws headless in all three projects with no launch flags (research §B); the iphone project's
first frame takes about 5 s — specs allow 30 s.

---

## Sampling Rate

- **After every task commit:** the task's own `<verify>` (its vitest files + its named spec on the named projects).
- **After every plan wave:** on the merged `board-3d`, `npm test`, `npx tsc --noEmit`, `npm run lint`, the full `npm run test:e2e`; after waves 3, 5 and 9 also `npm run build` and `npm run test:e2e:prod`; after the waves that move a desktop picture (1, 5, 9) the desktop baseline from the main checkout's Turbopack server. After wave 4 the six-count specs and the five desktop pictures are expected to fail until 16-14 (wave 5) merges.
- **Before `/gsd-verify-work`:** the full suite, the production build and `npm run test:e2e:prod` green on PHASE_TIP (16-13 Task 1).
- **Max feedback latency:** one task's verify (under 2 minutes for unit tasks; a named spec on three projects for screen tasks).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | R2, R11 | T-16-02 | the pin can only hold pre-refactor figures (generator refuses after) | unit (pin) | `npx vitest run lib/geometry/phase16-litres-pin.test.ts` | ❌ W0 (created in task) | ⬜ pending |
| 16-01-02 | 01 | 1 | R2, R9 | T-16-01 | out-of-range / non-finite fade end reads 18" | unit + desktop baseline | `npx vitest run lib/geometry/volume.test.ts lib/geometry/rail-bands.test.ts lib/geometry/blank-reasons.test.ts lib/geometry/phase14-preset-figures.test.ts` + `PW_PORT=3201 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` | ✅ (amend) | ⬜ pending |
| 16-01-03 | 01 | 1 | R12 | — | N/A | founder look | pictures/16-01-volume-before-after.png | ❌ | ⬜ pending |
| 16-02-01 | 02 | 2 | R9, R10, R11 | T-16-03 | crafted `tailHardEdgeEndsAt` parses as absent | unit + e2e | `npx vitest run lib/models/design-snapshot.test.ts` + `PW_PORT=3202 IS_WEBPACK_TEST=1 npx playwright test e2e/rails-advanced.spec.ts -g "Hard Edge Ends At"` | ✅ (amend) | ⬜ pending |
| 16-02-02 | 02 | 2 | R9, R11 | T-16-04, T-16-05 | report prints ids and litres only; read-only | unit + e2e | `npx vitest run lib/models/hard-edge-report.test.ts` + `PW_PORT=3202 IS_WEBPACK_TEST=1 npx playwright test e2e/rails-advanced.spec.ts e2e/undo-redo.spec.ts e2e/board-lock.spec.ts e2e/phone-rails.spec.ts` | ❌ W0 (report test created in task) | ⬜ pending |
| 16-02-03 | 02 | 2 | R12 | — | N/A | founder look | pictures/16-02-rails-hard-edge-ends-at.png | ❌ | ⬜ pending |
| 16-03-01 | 03 | 2 | R2 | T-16-06 | refuses non-finite / out-of-range boards | unit (relation) | `npx vitest run lib/geometry/board-surface.test.ts` | ❌ W0 (created in task) | ⬜ pending |
| 16-03-02 | 03 | 2 | R2, R3, R8 | T-16-07 | slices are mesh vertices | unit (40-board relation, watertight, notch) | `npx vitest run lib/geometry/board-surface.test.ts lib/geometry/board-surface-render.test.ts` | ❌ W0 | ⬜ pending |
| 16-03-03 | 03 | 2 | R12 | — | N/A | founder look | pictures/16-03-surface-fish-shortboard.png | ❌ | ⬜ pending |
| 16-04-01 | 04 | 3 | R12 | — | N/A | founder decision | recorded in 16-04-SUMMARY.md | — | ⬜ pending |
| 16-04-02 | 04 | 3 | R9, R11 | T-16-08, T-16-09 | env file deleted on exit; push only on go | gate (orchestrator) | `npm test && npx tsc --noEmit && npm run lint && npm run build && npm run test:e2e && npm run test:e2e:prod` on LITRES_TIP | ✅ | ⬜ pending |
| 16-04-03 | 04 | 3 | R9 | T-16-09 | merge parent checked | live check | `git rev-parse origin/main^2` = LITRES_TIP + live Playwright | — | ⬜ pending |
| 16-05-01 | 05 | 3 | R7 | T-16-10, T-16-11 | entry names from the cleaned stem; STL header ASCII | unit (round-trip) | `npx vitest run lib/export/cnc-files.test.ts lib/models/board-file.test.ts` | ❌ W0 (created in task) | ⬜ pending |
| 16-05-02 | 05 | 3 | R7, R8 | T-16-10 | no `three`/DOM/inch constant in lib/export | unit (formats, source grep) | `npx vitest run lib/export` | ❌ W0 | ⬜ pending |
| 16-05-03 | 05 | 3 | R12 | — | N/A | founder look | pictures/16-05-files-inside.png | ❌ | ⬜ pending |
| 16-06-01 | 06 | 3 | R1, R2, R3 | T-16-SC, T-16-13 | exact pins; name escaped | unit + e2e (desktop) | `npx vitest run lib/geometry/view-3d.test.ts` + `PW_PORT=3206 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-screen.spec.ts --project=desktop` | ❌ W0 (created in task) | ⬜ pending |
| 16-06-02 | 06 | 3 | R10, R11 | T-16-14, T-16-15 | three only on /design/3d; lost context handled | unit (source contract) + e2e + prod | `npx vitest run components/3d` + `PW_PORT=3206 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-screen.spec.ts` + (orchestrator) `npm run test:e2e:prod` | ❌ W0 | ⬜ pending |
| 16-06-03 | 06 | 3 | R12 | — | N/A | founder look | pictures/16-06-3d-screen-first-look.png | ❌ | ⬜ pending |
| 16-07-01 | 07 | 4 | R4 | T-16-16 | no idle loop; camera never moves | unit + e2e | `npx vitest run lib/geometry/view-3d.test.ts` + `PW_PORT=3207 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-view.spec.ts` | ❌ W0 (created in task) | ⬜ pending |
| 16-07-02 | 07 | 4 | R4, R10 | T-16-17 | keys only while focused; Tab leaves | unit (view relations) + e2e | `npx vitest run lib/geometry/view-3d.test.ts components/design/board-lock-scope.test.ts` + `PW_PORT=3207 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-view.spec.ts e2e/keyboard-focus.spec.ts` | ✅ (amend) | ⬜ pending |
| 16-07-03 | 07 | 4 | R12 | — | N/A | founder look | pictures/16-07-views.png | ❌ | ⬜ pending |
| 16-08-01 | 08 | 4 | R1, R10 | T-16-18, T-16-19 | tile art falls back on an undrawable board | unit + e2e | `npx vitest run lib/screen-steps.test.ts lib/geometry/screen-tiles.test.ts lib/geometry/three-d-tile-art.test.ts` + `PW_PORT=3208 IS_WEBPACK_TEST=1 npx playwright test e2e/step-nav.spec.ts` | ✅ (amend) + ❌ W0 (tile art test) | ⬜ pending |
| 16-08-02 | 08 | 4 | R1, R11 | — | nothing announced | e2e | `PW_PORT=3208 IS_WEBPACK_TEST=1 npx playwright test e2e/site-nav-width.spec.ts e2e/step-nav.spec.ts` (the six-count specs and the five desktop pictures are 16-14's and fail until it merges) | ✅ (amend) | ⬜ pending |
| 16-08-03 | 08 | 4 | R12 | — | N/A | founder look | pictures/16-08-seven-screens.png | ❌ | ⬜ pending |
| 16-14-01 | 14 | 5 | R1, R10 | — | N/A | e2e (the suite counts seven) | `PW_PORT=3214 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-screen-tiles.spec.ts e2e/phone-layout.spec.ts e2e/phone-sideways-top-bar.spec.ts e2e/phone-trip.spec.ts e2e/touch-sizing.spec.ts e2e/app-settings.spec.ts e2e/phone-home.spec.ts e2e/error-pages.spec.ts e2e/legal-pages.spec.ts e2e/site-footer.spec.ts e2e/step-nav.spec.ts e2e/phone-screens.spec.ts e2e/contact.spec.ts` | ✅ (amend) | ⬜ pending |
| 16-14-02 | 14 | 5 | R1, R12 | T-16-31 | pictures re-recorded only on a looked-at diff | desktop baseline | `PW_PORT=3214 IS_WEBPACK_TEST=1 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` | ✅ (re-record) | ⬜ pending |
| 16-14-03 | 14 | 5 | R12 | — | N/A | founder look | pictures/16-14-desktop-pictures-diff.png | ❌ | ⬜ pending |
| 16-09-01 | 09 | 6 | R4, R10 | T-16-20 | zoom clamped to [1, 10] | unit + e2e (desktop) | `npx vitest run components/viewer` + `PW_PORT=3209 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-zoom.spec.ts e2e/viewer-zoom.spec.ts e2e/desktop-baseline.spec.ts --project=desktop` | ❌ W0 (crop-zoom test created in task) | ⬜ pending |
| 16-09-02 | 09 | 6 | R4 | T-16-21 | page never scrolled from the canvas | unit + e2e | `npx vitest run components/viewer` + `PW_PORT=3209 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-zoom.spec.ts e2e/viewer-toolbar.spec.ts` | ❌ W0 | ⬜ pending |
| 16-09-03 | 09 | 6 | R12 | — | N/A | founder look | pictures/16-09-zoom-slide.png | ❌ | ⬜ pending |
| 16-10-01 | 10 | 7 | R3, R5 | T-16-22 | a bad fin is dropped, the board still draws | unit + e2e | `npx vitest run lib/geometry/fin-outline.test.ts` + `PW_PORT=3210 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-show.spec.ts` | ❌ W0 (created in task) | ⬜ pending |
| 16-10-02 | 10 | 7 | R5 | — | N/A | unit (fin relations) + e2e | `npx vitest run lib/geometry/fin-outline.test.ts lib/geometry/units.test.ts` + `e2e/three-d-show.spec.ts` | ✅ (amend units) | ⬜ pending |
| 16-10-03 | 10 | 7 | R12 | — | N/A | founder look | pictures/16-10-fins.png | ❌ | ⬜ pending |
| 16-11-01 | 11 | 8 | R5 | T-16-23 | a bad blank gives no ghost, never a throw | unit + e2e | `npx vitest run lib/geometry/blank-ghost.test.ts` + `PW_PORT=3211 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-show.spec.ts` | ❌ W0 (created in task) | ⬜ pending |
| 16-11-02 | 11 | 8 | R3, R6, R10 | T-16-24 | observer disconnected on unmount | e2e | `PW_PORT=3211 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-show.spec.ts e2e/three-d-screen.spec.ts e2e/three-d-view.spec.ts e2e/three-d-zoom.spec.ts` | ✅ | ⬜ pending |
| 16-11-03 | 11 | 8 | R12 | — | N/A | founder look | pictures/16-11-blank-stripes-themes.png | ❌ | ⬜ pending |
| 16-12-01 | 12 | 9 | R7, R8 | T-16-25, T-16-27 | names from the stem; URL revoked | e2e (download read back) | `PW_PORT=3212 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-export.spec.ts` | ❌ W0 (created in task) | ⬜ pending |
| 16-12-02 | 12 | 9 | R7, R10, R11 | T-16-25, T-16-26 | export works with no drawing, locked, signed out | e2e + desktop baseline | `PW_PORT=3212 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-export.spec.ts e2e/board-lock-screens.spec.ts` + `e2e/desktop-baseline.spec.ts --project=desktop` | ✅ (amend) | ⬜ pending |
| 16-12-03 | 12 | 9 | R12 | — | N/A | founder look | pictures/16-12-export.png | ❌ | ⬜ pending |
| 16-13-01 | 13 | 10 | R8, R11, R12 | T-16-28, T-16-29, T-16-30 | push only on go; Shape3D acceptance first | gate + founder | full gate on PHASE_TIP + research §C acceptance | ✅ | ⬜ pending |
| 16-13-02 | 13 | 10 | R7, R12 | T-16-28 | merge parent checked | live check | `git rev-parse origin/main^2` = PHASE_TIP + live Playwright | — | ⬜ pending |
| 16-13-03 | 13 | 10 | R12 | — | N/A | founder confirmation | recorded in 16-13-SUMMARY.md | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Every missing test file is created by the task that needs it, test first (no separate scaffolding wave):

- [ ] `lib/geometry/phase16-litres-pin.test.ts` + `lib/geometry/__fixtures__/phase16-litres-pin.json` (16-01 Task 1 — the pin is generated from today's code BEFORE `volume.ts` changes)
- [ ] `lib/geometry/board-surface.test.ts`, `lib/geometry/board-surface-render.test.ts` (16-03)
- [ ] `lib/export/cnc-files.test.ts`, `lib/export/formats.test.ts` (16-05)
- [ ] `lib/geometry/view-3d.test.ts`, `components/3d/three-source.test.ts`, `e2e/three-d-screen.spec.ts`, `e2e/helpers/canvas-pixels.ts`, `e2e/prod/three-d.spec.ts` (16-06)
- [ ] `e2e/three-d-view.spec.ts` (16-07); `lib/geometry/three-d-tile-art.test.ts` (16-08); `components/viewer/crop-zoom.test.ts`, `e2e/three-d-zoom.spec.ts` (16-09); `lib/geometry/fin-outline.test.ts`, `e2e/three-d-show.spec.ts` (16-10); `lib/geometry/blank-ghost.test.ts` (16-11); `e2e/three-d-export.spec.ts` (16-12); `lib/models/hard-edge-report.test.ts` (16-02)
- [ ] `e2e/helpers/screens.ts` gains 3D and `expectSevenTilesInMenu` (16-14)
- [x] Framework install: none needed (Vitest and Playwright present; browsers installed in `~/Library/Caches/ms-playwright`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The files open in Shape3D as a guide | R8 | Shape3D runs only on the founder's machine (its trial); no published format details (research A1–A3) | 16-13 Task 1 step 3: research §C's acceptance steps on the Fish's zip; record each file's result |
| Touch gestures on real hardware (one-finger turn, pinch, two-finger slide, double-tap, no page scroll) and Safari before 18.4 | R4 | Playwright's device profiles emulate touch but not a real iPhone/iPad's Safari | 16-07, 16-09 checkpoints and 16-13 Task 1 step 4 on the founder's iPhone and iPad over Wi-Fi |
| Export downloads inside the tap on a real iPhone, and its speed | R7 | Safari's download-after-tap rule and phone JavaScript speed (research A4) | 16-13 Task 1 step 4: Export saves to Files |
| Safari trackpad pinch on the founder's Mac | R4 | Safari's GestureEvent (research A5) | 16-09 checkpoint step 2 and 16-13 |
| The look: foam, lights, stripes, ghost, fins, the light themes' edge | R3, R5, R6 | A picture judgement ("tuned from pictures", CONTEXT discretion) | Each plan's checkpoint pictures |
| The real saved boards' litres move (hard edge fade) | R9 | Production data, founder-only access | 16-04 Task 2 (two go-lives) or 16-13 Task 1 step 5 (one go-live): `scripts/check-saved-boards.ts --hard-edge-report` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a founder checkpoint
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (each created by its own task)
- [x] No watch-mode flags
- [ ] Feedback latency < 16s (unit tasks yes; browser tasks take minutes by nature)
- [ ] `nyquist_compliant: true` set in frontmatter (set by `/gsd-validate-phase`)

**Approval:** pending
</content>
</invoke>
