---
phase: 15
slug: the-board-rack
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-05
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Seeded from `15-RESEARCH.md`
> § Validation Architecture; the planner fills the per-task map with task IDs.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 (unit, node environment) and Playwright 1.63.0 (iphone = WebKit 390×664, android = Chromium Pixel 7, desktop = Chromium 1280×800) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` (port 3100, `PW_PORT` override), `playwright.prod.config.ts` |
| **Quick run command** | `npx vitest run lib/models lib/geometry/rack-art.test.ts lib/geometry/rack-layout.test.ts lib/db components/setup` |
| **Full suite command** | `npm test`, then `npm run test:e2e` (detached, watched), `npm run lint`, and `npm run build` from the main checkout |
| **Estimated runtime** | quick ~5 s; `npm test` ~60 s; full e2e ~15–20 min |

---

## Sampling Rate

- **After every task commit:** the quick run command
- **After every plan wave:** `npm test` plus the new rack specs on all three Playwright projects; the full e2e suite on the merged tree after each wave (project rule)
- **Before `/gsd-verify-work`:** `npm test`, `npm run lint`, `npm run build`, full `npm run test:e2e` and `npm run test:e2e:prod` green
- **Max feedback latency:** 10 seconds for the quick command

---

## Per-Requirement Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| R1 | A saved board's rack art builds from its snapshot (profile + outline, 65 finite stations); card line unchanged | unit | `npx vitest run lib/geometry/rack-art.test.ts lib/models/rack-models.test.ts` | ❌ W0 | ✅ green |
| R2 | One scale = tallest board, never below 7'0"; rows balanced; every board placed once | unit | `npx vitest run lib/geometry/rack-layout.test.ts` | ❌ W0 | ✅ green |
| R3 | At 0° the edges equal the side profile; at 90° the path is the TEMPLATE silhouette (swallow notch on the fish preset); stringer inside the polygon; inputs from the app's own pipeline, never hand-typed | unit | `npx vitest run lib/geometry/rack-art.test.ts` | ❌ W0 | ✅ green |
| R4 | Theme tokens exist; no text crosses a board; the stringer uses `--outline-station-line` | unit (source contract) | `npx vitest run components/setup/rack-source.test.ts` | ❌ W0 | ✅ green |
| R5 | Hover rack: the cursor turns boards as it passes; rest finishes the nearest; caption under it; click opens | e2e desktop on `/test-rack` | `npx playwright test e2e/board-rack.spec.ts --project=desktop` | ❌ W0 | ✅ green |
| R6 | Swipe rack snaps one board to the middle; boards turn as they pass; Shape a New Board on the first screen at 390×664 with 15 boards | e2e iphone + android | `npx playwright test e2e/board-rack-phone.spec.ts --project=iphone --project=android` | ❌ W0 | ✅ green |
| R7 | Heading "Board Rack" with the count and the hint per rack | e2e + unit | as R5/R6 | ❌ W0 | ✅ green |
| R8 | Order functions (`applyStoredOrder`, `moveInOrder`, `insertAfter`, `insertFirst`, parsers); drag (incl. into another row), Alt+arrow, ⋯ Move; hold-and-drag via CDP touch events; `saveRackOrder` ownership-guarded | unit + e2e | `npx vitest run lib/models lib/db/ownership.test.ts` and the two rack specs | ❌ W0 / extend | ✅ green |
| R8 | Order survives reload and shows on another device | manual (dev branch + live walk) | n/a | n/a | ⬜ pending |
| R9 | The unsaved board is first in every merge, never lifts, nothing lands before it | unit + e2e | as R8 | ❌ W0 | ✅ green |
| R10 | Read-only `--rack-report` prints counts and exits 0; `check-preference-columns.ts` shows `rack_order` | script | `npx --no-install tsx scripts/check-saved-boards.ts --rack-report` | ❌ W0 | ✅ green |
| D-04 | Rack kind read only from the pointer (`useCoarsePointer`), never width | unit (source contract) | `npx vitest run components/setup/rack-source.test.ts` | ❌ W0 | ✅ green |
| D-11 | Moves-offered matrix: hover always; swipe only with the fallback on | unit | `npx vitest run components/setup/rack-config.test.ts` | ❌ W0 | ✅ green |
| D-16 | A duplicate lands after its original and fixes the order, arranged or not | unit | `npx vitest run lib/models/rack-order.test.ts` | extend | ✅ green |
| Rule 2 | Height lines every foot / 50 cm; no `25.4` or `304.8` literals in new files | unit | `npx vitest run lib/geometry/rack-layout.test.ts lib/units-isolation.test.ts` | ❌ W0 / existing | ✅ green |
| WR-05 | A board whose art can't be built is dropped and logged; the rest stay | unit | `npx vitest run lib/models/rack-models.test.ts` | extend | ✅ green |
| A11y | Arrows walk, Enter opens, Alt+arrow moves, the status line speaks the move; reduced motion swaps without eased frames | e2e desktop | `npx playwright test e2e/board-rack.spec.ts` | ❌ W0 | ✅ green |
| Old Safari | The rack's buttons keep their layout under old Safari's button rule | e2e | `npx playwright test e2e/old-safari-buttons.spec.ts` | update | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Per-Task Verification Map (from the plans, 2026-10-05)

| Plan / Task | Wave | Automated Command | Status |
|-------------|------|-------------------|--------|
| 15-01 T1 / T2 | 1 | `npx vitest run lib/geometry/rack-art.test.ts` / `npx vitest run lib/models/rack-models.test.ts` | ✅ green |
| 15-02 T1, T2 / T3 | 1 | `npx vitest run lib/geometry/rack-layout.test.ts` / `npx vitest run lib/models/rack-gesture.test.ts` | ✅ green |
| 15-03 T1, T2 / T3 | 1 | `npx vitest run lib/models/rack-order.test.ts` / `npx vitest run lib/models/rack-order-saver.test.ts components/setup/rack-config.test.ts` | ✅ green |
| 15-05 T1 / T2 / T3 | 1 | `npx vitest run lib/models/rack-stand-in.test.ts` and `PW_PORT=3121 npx playwright test e2e/test-rack.spec.ts` / the pictures exist / `npx tsc --noEmit` (orchestrator: `npm run test:e2e:prod` after the merge) | ✅ green |
| 15-04 T1 / T2 | 2 | migration-file checks and the development column check (`scripts/check-preference-columns.ts`) / `npx vitest run lib/db/ownership.test.ts` | ✅ green |
| 15-06 T1, T2 / T3 | 2 | `PW_PORT=3122 npx playwright test e2e/board-rack.spec.ts --project=desktop` / the specs that visit the home page, all projects | ✅ green |
| 15-07 T1, T2 / T3 | 3 | `PW_PORT=3123 npx playwright test e2e/board-rack-phone.spec.ts` / `npx vitest run components/setup/rack-source.test.ts` | ✅ green |
| 15-08 T1 / T2 | 3 | `npx vitest run lib/db/ownership.test.ts lib/models/rack-order.test.ts` / `--rack-report` on the development branch | ✅ green |
| 15-09 T1–T3 | 4 | `PW_PORT=3125 npx playwright test e2e/board-rack-phone.spec.ts` (android, CDP touch) | ✅ green |
| 15-10 T2 | 5 | `npx vitest run components/setup/rack-config.test.ts` and the phone spec (after the founder's device ruling) | ✅ green |
| 15-11 T1–T3 | 5 | `PW_PORT=3127 npx playwright test e2e/board-rack.spec.ts e2e/board-rack-phone.spec.ts` | ✅ green |
| 15-12 T1 / T2 / T3 | 6 | `npx vitest run components/setup/rack-source.test.ts lib/units-isolation.test.ts` / CLAUDE.md check / walk-sheet check | ✅ green |
| 15-13 | 7 | full gate on the go-live commit: `npm test`, `tsc`, `npm run lint`, `npm run build`, `npm run test:e2e`, `npm run test:e2e:prod` | ✅ green |

---

## Wave 0 Requirements

- [ ] `lib/geometry/rack-art.test.ts`, `lib/geometry/rack-layout.test.ts` — R1, R2, R3, Rule 2
- [ ] `lib/models/rack-gesture.test.ts` — R8, R9 (fake timers)
- [ ] extend `lib/models/rack-order.test.ts`, `lib/models/rack-models.test.ts`, `lib/db/ownership.test.ts`
- [ ] `components/setup/rack-config.test.ts`, `components/setup/rack-source.test.ts`
- [ ] `app/test-rack/page.tsx` stand-in (flag `SHAPER_RACK_STAND_IN` + literal `NODE_ENV`) and `e2e/prod/` spec proving it 404s in production
- [ ] `e2e/board-rack.spec.ts`, `e2e/board-rack-phone.spec.ts`; update `e2e/phone-home.spec.ts`, `e2e/phone-trip.spec.ts`, `e2e/old-safari-buttons.spec.ts`
- [ ] Framework install: none

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hold-and-drag works on the founder's iPad 9th gen (Safari < 18.4) and an Android phone | R8, D-11 | Real WebKit touch handling differs from emulation | On the dev build over Wi-Fi: hold a board 0.5 s, carry it to the edge, drop; a quick swipe still scrolls |
| The order follows the shaper to a second device | R8 | Playwright runs signed out with no database | Arrange on the laptop (dev branch), open the home page on the phone |
| Long names at the sideways-phone floor read acceptably | UI-SPEC E04 backstop | Visual | iPhone held sideways, a 20-character name |
| The status pill doesn't cover Open This Board on an iPhone | UI-SPEC E09 backstop | Visual | Move a board on an iPhone 14; read the pill |
| Read-only report on production boards before the push | R10, D-13 | Production data, founder's terminal | The founder runs the `--rack-report` command |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (every W0 file exists)
- [x] No watch-mode flags
- [x] Feedback latency < 10s (the quick command ~5 s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated by the orchestrator 2026-10-06 after the go-live gate (vitest 4,375 passed; e2e 829 / 0; e2e:prod 18) — every automated row green; the manual rows belong to the founder's walk (15-UAT.md)
