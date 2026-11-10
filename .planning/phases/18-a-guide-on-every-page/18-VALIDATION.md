---
phase: 18
slug: a-guide-on-every-page
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-09
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Seeded from 18-RESEARCH.md § Validation Architecture;
> the planner fills the task ids in the Per-Task Verification Map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (node) for the maths and the words; Playwright for the browser (projects `iphone`, `android`, `desktop`) |
| **Config file** | `vitest.config.ts` (`lib/**/*.test.ts`, `components/**/*.test.ts`); `playwright.config.ts` |
| **Quick run command** | `npx vitest run components/guide lib/geometry/guide-` |
| **Full suite command** | `npm test && npm run lint`, then `PW_PORT=<free> npx playwright test e2e/guide.spec.ts` plus the specs the wave changed |
| **Estimated runtime** | quick about 10 seconds; full Vitest about 60 seconds; the GUIDE browser spec a few minutes |

---

## Sampling Rate

- **After every task commit:** `npx vitest run <the touched test files>` and `npm run lint`
- **After every plan wave:** `npm test` (all of Vitest) and the wave's own browser specs on a port of the executor's own (`PW_PORT`)
- **Before the go-live gate:** `npm test`, `npm run lint`, `npm run build`, then the full `npm run test:e2e` read to its EXIT line in
  its own call; a changed baseline means reading its `diff.png`, re-recording on purpose, and running again
- **Max feedback latency:** 60 seconds for unit work; browser specs run at the end of a wave

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-T1 | 18-01 | 1 | R3, R4, R5, R11 | T-18-02 | bounded work: eight cards, memoised on the store object and system | unit | `npx vitest run lib/geometry/guide-card.test.ts lib/geometry/guide-push.test.ts lib/geometry/guide-draw.test.ts lib/geometry/guide-volume.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-T1 | 18-01 | 1 | R1, R2, R4, R5 | — | N/A | browser (tracer) | `PW_PORT=3111 npx playwright test e2e/guide-volume.spec.ts --project=desktop` | ❌ W0 | ⬜ pending |
| 18-01-T2 | 18-01 | 1 | R2, R6, R7, R11 | T-18-01 | the board's name is a React text child; no raw-HTML API, handler or tabIndex in a card; Rule 2 ledger over the guide folders | unit (source contract + words page) | `npx vitest run components/guide lib/units-isolation.test.ts` | ❌ W0 | ⬜ pending |
| 18-01-T3 | 18-01 | 1 | R8, R12 | — | N/A | browser | `PW_PORT=3111 npx playwright test e2e/guide-volume.spec.ts e2e/phone-chrome.spec.ts e2e/phone-screens.spec.ts e2e/volume-fins-panels.spec.ts` | ✅ rewrite | ⬜ pending |
| 18-02-T1 | 18-02 | 1 | R1 | T-18-04 | the name gives way by room in dots, never by its length | unit | `npx vitest run components/viewer/tabbed-panel.test.ts` | ✅ rewrite | ⬜ pending |
| 18-02-T2 | 18-02 | 1 | R1, R8, R12 | — | N/A | browser | `PW_PORT=3112 npx playwright test e2e/board-name-band.spec.ts e2e/desktop-baseline.spec.ts` | ✅ rewrite | ⬜ pending |
| 18-03-T1 | 18-03 | 2 | R3, R4, R5, R10, R11 | T-18-02 | 22 outlines, one build per store object and system | unit | `npx vitest run lib/geometry/guide-outline.test.ts` | ❌ W0 | ⬜ pending |
| 18-03-T2 | 18-03 | 2 | R1, R2, R6, R8, R10 | — | N/A | unit + browser | `npx vitest run components/guide/words/template.test.ts && PW_PORT=3113 npx playwright test e2e/guide-template.spec.ts` | ❌ W0 | ⬜ pending |
| 18-04-T1 | 18-04 | 2 | R3, R4, R5, R11 | T-18-02 | 14 side profiles, the base reused from the store | unit | `npx vitest run lib/geometry/guide-rocker.test.ts` | ❌ W0 | ⬜ pending |
| 18-04-T2 | 18-04 | 2 | R1, R2, R6, R8 | — | N/A | unit + browser | `npx vitest run components/guide/words/rocker.test.ts components/rocker/rocker-live-controls.test.ts && PW_PORT=3114 npx playwright test e2e/guide-rocker.spec.ts` | ❌ W0 | ⬜ pending |
| 18-05-T1 | 18-05 | 2 | R3, R4, R5, R11 | T-18-02 | 17 sections, one build per store object and system | unit | `npx vitest run lib/geometry/guide-rails.test.ts` | ❌ W0 | ⬜ pending |
| 18-05-T2 | 18-05 | 2 | R1, R2, R6, R8 | — | N/A | unit + browser | `npx vitest run components/guide/words/rails.test.ts && PW_PORT=3115 npx playwright test e2e/guide-rails.spec.ts e2e/phone-rails.spec.ts` | ❌ W0 | ⬜ pending |
| 18-06-T1 | 18-06 | 2 | R3, R4, R5, R9, R11 | T-18-02 | 23 fin sets, one build per store object and system | unit | `npx vitest run lib/geometry/guide-fins.test.ts` | ❌ W0 | ⬜ pending |
| 18-06-T2 | 18-06 | 2 | R1, R2, R6, R9 | T-18-05 | every MODEL INFO sentence checked present before its file is deleted | unit + browser | `npx vitest run components/guide/words/fins.test.ts && PW_PORT=3116 npx playwright test e2e/guide-fins.spec.ts` | ❌ W0 | ⬜ pending |
| 18-06-T3 | 18-06 | 2 | R1, R12 | — | N/A | browser + visual | `PW_PORT=3116 npx playwright test e2e/phone-chrome.spec.ts e2e/volume-fins-panels.spec.ts e2e/desktop-baseline.spec.ts` | ✅ rewrite | ⬜ pending |
| 18-07-T2 | 18-07 | 2 | R6, R11 | T-18-06 | every app-number Metric phrase equals the formatter's output for its constant | unit (words page) | `npx vitest run components/guide/words/metric-sayings.test.ts` | ❌ W0 | ⬜ pending |
| 18-08-T1 | 18-08 | 3 | R2, R3, R4, R5, R6, R9, R11 | T-18-02, T-18-03 | deep-frozen inputs unchanged; bounded fixed counts | unit (cross-page) | `npx vitest run components/guide/guide-words.test.ts lib/geometry/guide-pages.test.ts && npm test` | ❌ W0 | ⬜ pending |
| 18-08-T2 | 18-08 | 3 | R1, R2, R3, R5, R7, R8, R11, R12 | T-18-03 | no card changes a sidebar value | browser | `PW_PORT=3118 npx playwright test e2e/guide.spec.ts` | ❌ W0 | ⬜ pending |
| 18-08-T3 | 18-08 | 3 | R8 | T-18-02 | first paint under a 4× throttle against 150 ms | timing (scratch script) + browser | `PW_PORT=3118 npx playwright test e2e/guide.spec.ts` | ❌ W0 | ⬜ pending |
| 18-03/04/05/06-T3, 18-01-T3 | 18-01, 18-03 to 18-06 | 1, 2 | R12 | — | N/A | visual | `PW_PORT=<plan's port> npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` | ✅ re-record | ⬜ pending |
| 18-10-T1/T2 | 18-10 | 5 | R12, R13 | T-18-08 | nothing pushed until every gate step is read green | gate | `npm test && npm run lint`, `npm run build`, `PW_PORT=3120 npm run test:e2e` (EXIT line read in its own call) | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `components/guide/guide-words.test.ts` — R2, R6, R9, and D-22's Metric sayings
- [ ] `lib/geometry/guide-{card,push,draw,volume}.test.ts` (18-01), `guide-{outline,rocker,rails,fins}.test.ts` (18-03 to 18-06), `guide-pages.test.ts` (18-08) — R3, R4, R5, R10, R11 (tags and captions are tested inside each page's builder test; there is no separate guide-tag or guide-caption file)
- [ ] a Rule 2 ledger and a "nothing pressable" source test over `components/guide` and `lib/geometry/guide-*.ts` — R7, R11
- [ ] `e2e/guide-{volume,template,rocker,rails,fins}.spec.ts` (one per page plan) and `e2e/guide.spec.ts` (18-08, all five together) — R1, R2, R3, R5, R7, R8
- [ ] rewrites: `e2e/board-name-band.spec.ts`, `e2e/phone-chrome.spec.ts`, `e2e/volume-fins-panels.spec.ts`,
      `components/viewer/tabbed-panel.test.ts`, `components/rocker/rocker-live-controls.test.ts`

No framework to install.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The words read right to a shaper | R6 | first drafts for the founder's pen | he reads the GUIDE on each page; corrections land on the words page and the module in one change |
| The board's name giving way on ROCKER and RAILS on a narrow phone | R1 (D-21) | his rule of 2026-10-08 changes | pictures at 360, 390 and 430 put to him at the look |
| The GUIDE on his own phone | R13 | a real thumb and a real Safari | the last step of the go-live gate |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s for unit work
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
