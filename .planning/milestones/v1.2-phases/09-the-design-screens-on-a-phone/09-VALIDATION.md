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
| 09-01-T1 | 09-01 | 1 | TEST-01 | T-09-SC, T-09-01, T-09-02 | Playwright pinned `^1.63.0` in devDependencies only; webServer credentials are obvious non-secrets; nothing under app/components/lib imports the test package | config / CLI assertion | `npx playwright test --list && node -e "const p=require('./package.json'); if(p.dependencies['@playwright/test']) throw new Error('must be dev-only'); if(!p.devDependencies['@playwright/test']) throw new Error('missing')" && npx tsc --noEmit` | ❌ Wave 0 (creates `playwright.config.ts`) | ⬜ pending |
| 09-01-T2 | 09-01 | 1 | PHON-05 | — | — | Playwright screenshot baseline | `npx playwright test --project=desktop e2e/desktop-baseline.spec.ts` (run twice, no `--update-snapshots` between) | ❌ Wave 0 (creates the spec + 5 PNGs) | ⬜ pending |
| 09-01-T3 | 09-01 | 1 | PHON-05 | — | — | Playwright mouse drag | `npx playwright test --project=desktop e2e/desktop-regression.spec.ts` | ❌ Wave 0 (creates the spec) | ⬜ pending |
| 09-06-T1 | 09-06 | 1 | PHON-04 | T-09-19 | The coarse hit radius is justified by a committed measurement that re-runs on every test run, not by an assumed number | vitest (measurement) | `npm test -- drag-spacing && npx tsc --noEmit` | ❌ Wave 0 (creates `components/viewer/drag-spacing.test.ts`) | ⬜ pending |
| 09-06-T2 | 09-06 | 1 | PHON-04, PHON-05 | T-09-17, T-09-18 | A NaN or empty input returns null so no drag starts; the solvers' clamps are untouched | vitest unit | `npm test -- outline-drag && npx tsc --noEmit` | ✅ exists (`lib/geometry/outline-drag.test.ts`, extended) | ⬜ pending |
| 09-06-T3 | 09-06 | 1 | PHON-04, PHON-05 | T-09-17 | Same, for the rocker's four handles | vitest unit | `npm test && npx tsc --noEmit` | ✅ exists (`lib/geometry/rocker-drag.test.ts`, extended) | ⬜ pending |
| 09-02-T1 | 09-02 | 2 | PHON-01, PHON-02, PHON-06, TEST-01 | T-09-04, T-09-05, T-09-07 | Every phone rule is an additive `max-shell:` override on an unchanged desktop base; the shell reads no board value | Playwright layout + snapshot | `npx tsc --noEmit && npm test && npx playwright test e2e/phone-layout.spec.ts && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts` | ❌ Wave 0 (creates `e2e/phone-layout.spec.ts`) | ⬜ pending |
| 09-02-T2 | 09-02 | 2 | PHON-01, PHON-05 | T-09-06 | The account control is mounted, never re-implemented; no session value is read by this phase's code | Playwright layout + snapshot | `npx tsc --noEmit && npx playwright test e2e/phone-layout.spec.ts && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts` | ✅ exists (09-02-T1) | ⬜ pending |
| 09-02-T3 | 09-02 | 2 | PHON-01, PHON-05 | T-09-07 | Orientation and overlay defaults are view state only — nothing reaches the design store or snapshot | Playwright layout + snapshot | `npx tsc --noEmit && npm test && npx playwright test e2e/phone-layout.spec.ts && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts` | ✅ exists (09-02-T1) | ⬜ pending |
| 09-02-T4 | 09-02 | 2 | PHON-01 | T-09-07 | Folding is CSS order only — no slider is rendered twice and no DOM is moved | Playwright layout + snapshot | `npx tsc --noEmit && npm test && npx playwright test e2e/phone-layout.spec.ts && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts` | ✅ exists (09-02-T1) | ⬜ pending |
| 09-03-T1 | 09-03 | 3 | PHON-01, PHON-06 | T-09-08 | The pinned box is pure CSS and reads no board value; a degenerate board behaves as it does on the desktop | vitest + Playwright snapshot | `npx tsc --noEmit && npm test && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts` | ✅ exists (09-01-T2/T3) | ⬜ pending |
| 09-03-T2 | 09-03 | 3 | PHON-01 | T-09-10 | A bounded, recorded fallback exists if `max-shell:contents` misbehaves | vitest + Playwright snapshot | `npx tsc --noEmit && npm test && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts` | ✅ exists (09-01-T2) | ⬜ pending |
| 09-03-T3 | 09-03 | 3 | PHON-01 | T-09-09 | FINS' toe-aim modal survives the migration in the shell's outside-columns slot | vitest + Playwright snapshot | `npx tsc --noEmit && npm test && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts` | ✅ exists (09-01-T2/T3) | ⬜ pending |
| 09-03-T4 | 09-03 | 3 | PHON-01, PHON-06 | — | — | Playwright layout | `npx playwright test e2e/phone-screens.spec.ts && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts && npm test` | ❌ Wave 0 (creates `e2e/phone-screens.spec.ts`) | ⬜ pending |
| 09-04-T1 | 09-04 | 3 | PHON-01 | T-09-12 | RAILS' root `data-print-hide` survives the migration via the shell's `printHide` prop | vitest + Playwright snapshot | `npx tsc --noEmit && npm test && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts` | ✅ exists (09-01-T2) | ⬜ pending |
| 09-04-T2 | 09-04 | 3 | PHON-01 | T-09-11 | No `@media print` rule and no `actual-size.css` line changes, so a rail printed from a phone stays ruler-true | vitest + Playwright snapshot + diff assertion | `npx tsc --noEmit && npm test && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts` | ✅ exists (09-01-T2) | ⬜ pending |
| 09-04-T3 | 09-04 | 3 | PHON-01, PHON-06 | T-09-13 | No column, header or formatted value is added or removed from any data sheet | vitest (units ledger) + Playwright snapshot | `npx tsc --noEmit && npm test && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts` | ✅ exists (`lib/units-isolation.test.ts`) | ⬜ pending |
| 09-04-T4 | 09-04 | 3 | PHON-01, PHON-06 | T-09-11, T-09-13 | The phone dialog hides the check bar and the caveat; the desktop dialog still shows both | Playwright layout | `npx playwright test e2e/phone-rails.spec.ts && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts && npm test` | ❌ Wave 0 (creates `e2e/phone-rails.spec.ts`) | ⬜ pending |
| 09-05-T1 | 09-05 | 3 | PHON-03, PHON-05 | T-09-15, T-09-16 | Every enlargement is pointer-keyed, never width-keyed; no scale-limiting viewport field is added | vitest + Playwright snapshot | `npx tsc --noEmit && npm test && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts` | ✅ exists (09-01-T2/T3) | ⬜ pending |
| 09-05-T2 | 09-05 | 3 | PHON-03 | T-09-14 | The coarse rule never re-spaces paper (`print:min-h-0` on the shared print surface; the order form untouched) | vitest (units ledger) + Playwright snapshot | `npx tsc --noEmit && npm test && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts` | ✅ exists (`lib/units-isolation.test.ts`) | ⬜ pending |
| 09-05-T3 | 09-05 | 3 | PHON-03, PHON-05 | — | — | Playwright bounding-box + computed-style | `npx playwright test e2e/touch-sizing.spec.ts && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts` | ❌ Wave 0 (creates `e2e/touch-sizing.spec.ts`) | ⬜ pending |
| 09-07-T1 | 09-07 | 4 | PHON-04, PHON-05 | T-09-20, T-09-24 | One delegated pick for every pointer type; a NaN coordinate returns null so no drag starts | vitest + Playwright mouse drag + snapshot | `npx tsc --noEmit && npm test && npx playwright test --project=desktop e2e/desktop-regression.spec.ts e2e/desktop-baseline.spec.ts` | ✅ exists (09-01-T2/T3) | ⬜ pending |
| 09-07-T2 | 09-07 | 4 | PHON-04, PHON-05 | T-09-21, T-09-22 | No markup is built from a string; the chip reads the solver's clamped value, never the raw pointer position | vitest (units ledger) + Playwright snapshot | `npx tsc --noEmit && npm test && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts` | ✅ exists (`lib/units-isolation.test.ts`, 09-01-T2/T3) | ⬜ pending |
| 09-07-T3 | 09-07 | 4 | PHON-04, TEST-01 | T-09-23 | The CDP call lives only under `e2e/`, outside every app import path | Playwright CDP touch drag | `npx playwright test --project=android e2e/touch-drag.spec.ts && npx playwright test --project=desktop e2e/desktop-regression.spec.ts e2e/desktop-baseline.spec.ts` | ❌ Wave 0 (creates `e2e/touch-drag.spec.ts`) | ⬜ pending |
| 09-07-T4 | 09-07 | 4 | PHON-05, TEST-01 | — | — | Full suite | `npx tsc --noEmit && npm test && npm run lint && npx playwright test && npx playwright test --project=desktop e2e/desktop-baseline.spec.ts` | ✅ exists (everything above) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity:** all 25 tasks carry an `<automated>` verify — there is no run of three (or
even one) consecutive tasks without one. Nine tasks create the file they verify against; all nine are
listed as Wave 0 items below.

---

## Wave 0 Requirements

Nine files do not exist today and are created by the task that first verifies against them. All nine
land in wave 1 or in the task that owns them, so no task is left without an automated verify.

- [ ] `@playwright/test` dev dependency (`^1.63.0`) + `npx playwright install chromium webkit` — 09-01-T1
- [ ] `playwright.config.ts` — 09-01-T1. `testDir: "./e2e"`; projects `iphone` (`devices["iPhone 14"]`, WebKit), `android` (`devices["Pixel 7"]`, Chromium) and `desktop` (Desktop Chrome at 1280x800); `webServer` on port **3100** (never 3000 — the shaper's own `next dev` holds that) with `reuseExistingServer: !process.env.CI`
- [ ] `e2e/desktop-baseline.spec.ts` + five committed PNGs — 09-01-T2 (PHON-05's "before" pixels; must be taken before the shell extraction)
- [ ] `e2e/desktop-regression.spec.ts` — 09-01-T3 (PHON-05's standing mouse-drag proof, passing against untouched code)
- [ ] `components/viewer/drag-spacing.test.ts` — 09-06-T1 (the committed station-spacing measurement that justifies the coarse hit radius)
- [ ] `e2e/phone-layout.spec.ts` — 09-02-T1 (PHON-01, PHON-02, PHON-06 on TEMPLATE; extended by 09-02-T2/T3/T4)
- [ ] `e2e/phone-screens.spec.ts` — 09-03-T4 (ROCKER, VOLUME, FINS)
- [ ] `e2e/phone-rails.spec.ts` — 09-04-T4 (RAILS, the tables, the phone dialog)
- [ ] `e2e/touch-sizing.spec.ts` — 09-05-T3 (PHON-03)
- [ ] `e2e/touch-drag.spec.ts` — 09-07-T3 (PHON-04, CDP touch drag, android project only)

Extended, not created: `lib/geometry/outline-drag.test.ts` and `lib/geometry/rocker-drag.test.ts`
each gain a `describe` block for the new nearest-point pick (D-15), including the overlapping-circles
tie, the empty-list case, and the desktop-radius invariant that keeps PHON-05 true by construction.

**One spec file per plan, deliberately.** Four plans run in wave 3; giving each its own spec file is
what keeps them from colliding on a shared file. No plan edits another plan's spec.

## Executor environment facts these commands depend on

Measured 2026-09-08 — every Playwright row above fails without them.

- The executor works in a git worktree under `.claude/worktrees/`. `npm test` and `npx tsc --noEmit`
  work there (Node resolves up to the main checkout's `node_modules`), but **Turbopack does not**:
  `npm run dev` and `npm run build` both fail with `Could not find the Next.js package
  (next/package.json)`, and symlinking the parent's `node_modules` in is rejected outright
  (`Symlink [project]/node_modules is invalid, it points out of the filesystem root`). Fix: run
  `npm install --no-audit --no-fund` once inside the worktree (~17 s), after which `npm run dev`
  starts and serves. Every plan that runs Playwright states this as a precondition.
- `.env*` files are blocked for the executor and are not needed. Every `/design/*` route is open to a
  signed-out shaper (`proxy.ts` calls no `.protect()`), so `playwright.config.ts`'s `webServer.env`
  supplies its own obviously-fake Clerk and database values. Verified: with those fakes and no
  `.env.local` present, `GET /design/outline` returned 200 and rendered the board.
- `npm run build` is not run in the worktree at all; it runs from the main checkout after merge.

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
