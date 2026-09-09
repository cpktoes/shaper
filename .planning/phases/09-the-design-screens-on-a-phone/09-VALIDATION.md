---
phase: 9
slug: the-design-screens-on-a-phone
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-08
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (existing — `lib/**/*.test.ts`, `components/**/*.test.ts`); `@playwright/test` 1.63.x (new this phase — `e2e/`) |
| **Config file** | `vitest.config.ts` (existing); `playwright.config.ts` (none — Wave 0 installs) |
| **Quick run command** | `npm test` (all geometry suites) — plus, once Wave 0 lands, the one Playwright spec closest to the task, e.g. `npx playwright test --project=android e2e/touch-drag.spec.ts` |
| **Full suite command** | `npm test && npx tsc --noEmit && npx playwright test` (both device projects); `npm run build` from the main checkout |
| **Estimated runtime** | ~10 s vitest; ~60–120 s Playwright (both projects, dev server reused) |

---

## Sampling Rate

- **After every task commit:** Run `npm test` (must stay green per CLAUDE.md) plus the single most relevant new Playwright spec once it exists
- **After every plan wave:** Run `npm test && npx tsc --noEmit && npx playwright test`; `npm run build` from the main checkout after merge
- **Before `/gsd-verify-work`:** Full suite must be green, plus the manual desktop mouse/keyboard regression pass on every viewer touched (PHON-05) and a real-device Safari toolbar check (PHON-02)
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| — | — | — | — | — | Rows are added per task once PLAN.md files exist; every task carries an `<automated>` verify or names its Wave 0 dependency | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `playwright.config.ts` — framework install and config (`testDir: "./e2e"`, iPhone + Android projects, `webServer` on a port other than 3000 with `reuseExistingServer`)
- [ ] `e2e/phone-layout.spec.ts` — stubs for PHON-01, PHON-02, PHON-06 (stacked layout, dvh fit, drawing width vs viewport width)
- [ ] `e2e/touch-sizing.spec.ts` — stubs for PHON-03 (44px bounding boxes, 16px input font-size)
- [ ] `e2e/touch-drag.spec.ts` — stubs for PHON-04 (CDP touch drag on the outline viewer, Android/Chromium project)
- [ ] `e2e/desktop-regression.spec.ts` — stubs for PHON-05 (desktop-viewport mouse drag on the outline and rocker viewers)
- [ ] `lib/geometry/outline-drag.test.ts` / `lib/geometry/rocker-drag.test.ts` — cases for the new nearest-point pick (D-15), including the overlapping-circles tie
- [ ] `@playwright/test` dev dependency + `npx playwright install chromium webkit` — no framework detected for e2e today

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Desktop mouse drag and keyboard operation unchanged on every viewer touched | PHON-05 | Playwright covers one drag per viewer; the full keyboard/focus/hover behaviour set is a human pass | On a desktop browser ≥ 820px wide, on TEMPLATE and ROCKER: drag every point with the mouse, tab to each control and operate it with arrow keys, rotate with the toolbar button; confirm nothing changed from the deployed site |
| Page fits the visible area as Safari's toolbar shows and hides | PHON-02 | Device emulators do not reproduce Safari's dynamic viewport resize | On a real iPhone in Safari, open each design screen, scroll the controls so the toolbar collapses and re-expands; confirm the bottom tab bar stays visible and nothing is clipped or trapped |
| No long-press text popup during a thumb drag | PHON-04 | The iOS callout is not emulated by Playwright | On a real iPhone, press and hold a drag point for two seconds, then drag; no selection or callout appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
