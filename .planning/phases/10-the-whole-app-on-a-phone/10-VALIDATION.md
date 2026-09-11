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
| 10-01-T1 (tracer) | 10-01 | 1 | PHON-08, PHON-07 | T-10-01 | The close control still dispatches Base UI's own Close and gains no handler or data path | e2e (browser, 3 projects) | `PW_PORT=3101 npx playwright test e2e/phone-dialogs.spec.ts --project=iphone --project=android --project=desktop` | ❌ W0 — `e2e/phone-dialogs.spec.ts` | ⬜ pending |
| 10-01-T2 | 10-01 | 1 | PHON-08 | T-10-03 | `Input` gains a height class only — no change to type, autocomplete, name, value handling or validation | unit (source + compiled CSS) + e2e regression | `npx vitest run components/ui/input.css.test.ts && PW_PORT=3101 npx playwright test e2e/touch-sizing.spec.ts --project=iphone --project=android --project=desktop` | ❌ W0 — `components/ui/input.css.test.ts` | ⬜ pending |
| 10-01-T3 | 10-01 | 1 | PHON-08 | T-10-02 | No overlay is added, restyled or reordered; the confirm's own copy and actions are unchanged | e2e (browser, 3 projects) | `PW_PORT=3101 npx playwright test e2e/phone-dialogs.spec.ts --project=iphone --project=android --project=desktop` | ❌ W0 — `e2e/phone-dialogs.spec.ts` | ⬜ pending |
| 10-02-T1 (tracer) | 10-02 | 1 | PHON-07 | — | The row grows; the label, its size and the dialog it opens are unchanged | e2e (browser, 3 projects) | `PW_PORT=3102 npx playwright test e2e/phone-account.spec.ts --project=iphone --project=android --project=desktop` | ❌ W0 — `e2e/phone-account.spec.ts` | ⬜ pending |
| 10-02-T2 | 10-02 | 1 | PHON-07 | T-10-04, T-10-05 | Clerk's real trigger grows via `appearance.elements`, never a wrapper; only a class name crosses into Clerk | unit (source + compiled CSS) | `npx vitest run components/auth/nav-auth-control.test.ts` | ❌ W0 — `components/auth/nav-auth-control.test.ts` | ⬜ pending |
| 10-02-T3 | 10-02 | 1 | PHON-07 | T-10-06 | The dismiss handler still writes the one exported sessionStorage key; no new key or value | e2e (browser, 3 projects) + baseline regression | `PW_PORT=3102 npx playwright test e2e/phone-account.spec.ts e2e/desktop-baseline.spec.ts e2e/phone-layout.spec.ts e2e/phone-screens.spec.ts --project=iphone --project=android --project=desktop` | ❌ W0 — `e2e/phone-account.spec.ts` | ⬜ pending |
| 10-03-T1 (tracer) | 10-03 | 1 | PHON-08 | T-10-07 | Exact-equality route check — no prefix or pattern match can suppress the bar on a design screen | e2e (browser, 3 projects) | `PW_PORT=3103 npx playwright test e2e/phone-home.spec.ts e2e/phone-layout.spec.ts e2e/phone-screens.spec.ts e2e/touch-sizing.spec.ts --project=iphone --project=android --project=desktop` | ✅ W0 — `e2e/phone-home.spec.ts` (edited, not created) | ⬜ pending |
| 10-03-T2 | 10-03 | 1 | PHON-08 | T-10-08, T-10-09 | The shared thumbnail takes the same two props and renders the same pure geometry; no snapshot field newly read | type + unit (no geometry may move) + e2e | `npx tsc --noEmit && npx vitest run && PW_PORT=3103 npx playwright test e2e/phone-home.spec.ts --project=iphone --project=android --project=desktop` | ✅ existing suites | ⬜ pending |
| 10-03-T3 | 10-03 | 1 | PHON-08 | — | Desktop card geometry pinned by an explicit computed-ratio assertion, since `/` has no screenshot baseline | e2e (browser, 3 projects) | `PW_PORT=3103 npx playwright test e2e/phone-home.spec.ts e2e/phone-setup-landscape.spec.ts --project=iphone --project=android --project=desktop` | ❌ W0 — `e2e/phone-setup-landscape.spec.ts` | ⬜ pending |
| 10-04-T1 (tracer) | 10-04 | 2 | PHON-10, PHON-09 | — | Reachability only; no credential, no signed-in state, no application code touched | e2e (browser, 2 phone projects) | `PW_PORT=3104 npx playwright test e2e/phone-trip.spec.ts --project=iphone --project=android` | ❌ W0 — `e2e/phone-trip.spec.ts` | ⬜ pending |
| 10-04-T2 | 10-04 | 2 | PHON-10 | T-10-10 | The sheet's recording rules forbid writing any credential, code or token into any file | full suite gate | `npx tsc --noEmit && npx vitest run && PW_PORT=3104 npm run test:e2e` | ✅ existing suites | ⬜ pending |
| 10-04-T3 | 10-04 | 2 | PHON-10, PHON-09, PHON-07, PHON-08 | T-10-10, T-10-11, T-10-12 | Evidence is PASS/FAIL/N-A only; no credential or un-redacted account screenshot enters `.planning/` | `checkpoint:human-action` — real devices only (iOS long-press callout, sticky hover, Safari toolbar collapse, real safe area, a genuinely signed-in Clerk avatar, a real iOS keyboard) | none — the founder's device × step table in `10-SWEEP.md` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

One entry per test file the plans create or rewrite. Kept equal to the `File Exists` column above.

- [ ] `e2e/phone-dialogs.spec.ts` **(new, plan 10-01)** — the Dialog close-X ≥ 44 × 44 on the phone projects and exactly 28 × 28 on the desktop one; the replace-board confirm's two buttons ≥ 44px tall; every dialog in scope ≥ 16px clear of both screen edges. Its header states which of D-03's five dialogs are measured directly (sign-in, replace-board) and which ride the shared-component rule because a signed-out run cannot open them (rename, name-this-board, delete-confirm). (PHON-08/PHON-07, D-03/D-04)
- [ ] `components/ui/input.css.test.ts` **(new, plan 10-01)** — source contract plus a compiled-Tailwind proof that the shared typed field emits both a coarse height rule and the 16px text rule; a variant that fails to compile emits nothing at all and only this catches it. (PHON-08/D-03)
- [ ] `e2e/phone-account.spec.ts` **(new, plan 10-02)** — the signed-out "Sign in" row ≥ 44px tall on the phone projects and exactly 20px on the desktop one, with 14px text on all three; the sign-in banner's dismiss X ≥ 44 × 44 on the phone projects and 32 × 32 on the desktop one, with the banner itself still 36px tall everywhere. (PHON-07, D-06)
- [ ] `components/auth/nav-auth-control.test.ts` **(new, plan 10-02)** — the Clerk padding contract: the appearance prop targets Clerk's own trigger with a coarse-gated padding class, the signed-in branch returns that button directly with nothing wrapped around it, the loading placeholder matches the other two states' footprint, and the class really compiles to a `pointer: coarse` padding rule. This is the only automated proof possible — Playwright cannot render a signed-in Clerk button on fake keys. (PHON-07/D-05)
- [ ] `e2e/phone-home.spec.ts` **(EDIT, plan 10-03)** — the six-tab describe block pins the pre-D-07 behaviour (bar visible on `/`) and is rewritten to assert the bar is absent on `/` and present on `/design/outline`; the six-label, marked-tab and 44px assertions stay where they already live, in `e2e/phone-layout.spec.ts`. The same file gains the card measurements: 520-580px cards with a 387px thumbnail and a ≥ 350 × 85px first outline path on the phone projects; a computed aspect-ratio assertion plus a sub-520px card on the desktop project; and an 819px/820px boundary case. (PHON-08, D-01/D-02/D-07/D-08)
- [ ] `e2e/phone-setup-landscape.spec.ts` **(new, plan 10-03)** — at `devices["iPhone 14 landscape"]` (750 × 340), scoped to the `iphone` project: the viewport is asserted first so the case cannot pass vacuously, then exactly two distinct card left edges (the two-up grid is correct at this width and is deliberately not changed), cards 520-580px tall, outline paths ≥ 350px. (PHON-08, D-08's landscape ruling)
- [ ] `e2e/phone-trip.spec.ts` **(new, plan 10-04)** — the machine walk of PHON-10's trip on both phone projects: home with no tab bar, a preset pick, all six routes tapped in order from the bar, the summary with no sideways scroll and Print on screen, and back home with the board in the rack. Explicitly not the proof of PHON-10 — its header names what it cannot reach. (PHON-10/PHON-09)

*Existing infrastructure (Playwright, the three projects, the fake Clerk keys, `@tailwindcss/node`'s
compiled-CSS pattern) covers the framework; no new dependency and no `npx playwright install` is
needed, and only the files above are new or rewritten.*

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
