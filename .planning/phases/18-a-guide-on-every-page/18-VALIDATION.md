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
| (planner) | | | R2, R6, R9 | T-18-01 | the board's name is a React text child; no raw-HTML API in `components/guide` | unit | `npx vitest run components/guide/guide-words.test.ts` | ❌ W0 | ⬜ pending |
| (planner) | | | R3, R10, R11 | — | N/A | unit | `npx vitest run lib/geometry/guide-tag.test.ts` | ❌ W0 | ⬜ pending |
| (planner) | | | R4, R6 | — | N/A | unit | `npx vitest run lib/geometry/guide-caption.test.ts` | ❌ W0 | ⬜ pending |
| (planner) | | | R5, R11 | — | N/A | unit | `npx vitest run lib/geometry/guide-push.test.ts` | ❌ W0 | ⬜ pending |
| (planner) | | | R5 | T-18-02 | bounded work: one variant per card, memoised per board | unit | `npx vitest run lib/geometry/guide-rocker.test.ts lib/geometry/guide-outline.test.ts lib/geometry/guide-rails.test.ts lib/geometry/guide-volume.test.ts lib/geometry/guide-fins.test.ts` | ❌ W0 | ⬜ pending |
| (planner) | | | R4 | — | N/A | unit | `npx vitest run lib/geometry/guide-draw.test.ts` | ❌ W0 | ⬜ pending |
| (planner) | | | R11 | — | N/A | unit (source contract) | `npx vitest run lib/units-isolation.test.ts` | ✅ extend | ⬜ pending |
| (planner) | | | R7 | T-18-01 | nothing pressable; no `dangerouslySetInnerHTML` / `innerHTML` | unit (source contract) | `npx vitest run components/guide` | ❌ W0 | ⬜ pending |
| (planner) | | | R1, R2, R3, R5, R7, R8, R12 | — | N/A | browser | `PW_PORT=<free> npx playwright test e2e/guide.spec.ts` | ❌ W0 | ⬜ pending |
| (planner) | | | R1, R12 | — | N/A | browser | `PW_PORT=<free> npx playwright test e2e/board-name-band.spec.ts e2e/phone-chrome.spec.ts e2e/volume-fins-panels.spec.ts` | ✅ rewrite | ⬜ pending |
| (planner) | | | R12 | — | N/A | visual | `PW_PORT=<free> npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` | ✅ re-record | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `components/guide/guide-words.test.ts` — R2, R6, R9, and D-22's Metric sayings
- [ ] `lib/geometry/guide-{push,tag,caption,draw,rocker,outline,rails,volume,fins}.test.ts` — R3, R4, R5, R10, R11
- [ ] a Rule 2 ledger and a "nothing pressable" source test over `components/guide` and `lib/geometry/guide-*.ts` — R7, R11
- [ ] `e2e/guide.spec.ts` — R1, R2, R3, R5, R7, R8
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
