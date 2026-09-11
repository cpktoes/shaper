---
phase: 10
slug: the-whole-app-on-a-phone
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-10
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (unit, `lib/**/*.test.ts` + component contract tests, node env) + Playwright (`@playwright/test`, `e2e/`, iPhone + Android + desktop projects) |
| **Config file** | `vitest.config.ts` (unit), `playwright.config.ts` (e2e; dev server on `PW_PORT`, default 3100) |
| **Quick run command** | `npx vitest run` (unit) · `PW_PORT=310X npx playwright test <spec> --project=iphone --project=android` (one phone spec) |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | unit ~15 s · one phone spec ~30-60 s · full e2e suite ~6-8 min |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` for any `lib/` or contract-test change; `PW_PORT=310X npx playwright test <the task's spec> --project=iphone --project=android` for any UI change.
- **After every plan wave:** Run `npm run build`, `npx vitest run` and the FULL `npm run test:e2e` on `main` after the merge (the desktop project is the regression pass that proves nothing changed for a mouse).
- **Before `/gsd-verify-work`:** Full suite must be green, plus the founder's real-device sweep table (RESEARCH.md "Real-Device Sweep") signed off.
- **Max feedback latency:** 90 seconds for a task-level check.

---

## Per-Task Verification Map

*Filled in by the planner from the PLAN.md tasks. Every task row names its automated command or its `checkpoint:human-verify` reason.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (planner fills) | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `e2e/phone-home.spec.ts` — EDIT the "tab bar shows all six screens" test: it pins the pre-D-07 behaviour (bar visible on `/`) and must assert the bar is absent on `/` and present on `/design/*` (PHON-07/D-07)
- [ ] `e2e/phone-home.spec.ts` (or a new `e2e/phone-account.spec.ts`) — the signed-out "Sign in" row and its loading placeholder measure ≥ 44px under the phone projects (PHON-07/D-06)
- [ ] a `touch-sizing.spec.ts`-style spec for the setup-screen dialogs — rename / name-this-board inputs ≥ 44px tall with 16px text, the Dialog close-X ≥ 44px, on the phone projects (PHON-08/D-03)
- [ ] a phone spec asserting the preset card is 520-580px tall and its outline path ≥ 350 × 85px at the approved height, and that the desktop card is unchanged (PHON-08/D-08)
- [ ] a spec at `devices["iPhone 14 landscape"]` (750 × 340) recording the setup grid's column count at that width (PHON-08, D-08's landscape ruling)
- [ ] the sign-in banner's dismiss X ≥ 44px on the phone projects, on a `/design/*` route (PHON-07)

*Existing infrastructure (Playwright, the phone projects, the fake Clerk keys) covers the framework; only the specs above are new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Clerk `<UserButton />` trigger clears 44px on a phone, or is grown via `appearance.elements` | PHON-07 / D-05 | Playwright runs signed out on fake Clerk keys; the avatar only renders in a real signed-in session | Signed in on a real phone (or the founder's signed-in Chrome at a phone width), measure the avatar button's height; ≥ 44px → leave alone, < 44px → grow the hit area per UI-SPEC |
| The iOS keyboard does not cover the rename / name-this-board dialog's input | PHON-08 / D-03 | iOS keyboard geometry cannot be emulated | On a real iPhone: open Rename, tap the field, confirm the field and Save stay visible with the keyboard up |
| The whole trip end to end on a real iPhone and a real Android phone | PHON-10 | Real-device only (long-press callout, sticky hover, Safari toolbar collapse, safe area) | RESEARCH.md "Real-Device Sweep": 10 ordered steps per phone, recorded as a device × step PASS/FAIL table |
| Summary + on-screen order form read on a phone | PHON-09 | Already green in the suite; the sweep confirms in hand | Sweep step 9 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
