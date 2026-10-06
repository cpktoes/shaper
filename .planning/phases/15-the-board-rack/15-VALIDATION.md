---
phase: 15
slug: the-board-rack
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| R1 | A saved board's rack art builds from its snapshot (profile + outline, 65 finite stations); card line unchanged | unit | `npx vitest run lib/geometry/rack-art.test.ts lib/models/rack-models.test.ts` | ❌ W0 | ⬜ pending |
| R2 | One scale = tallest board, never below 7'0"; rows balanced; every board placed once | unit | `npx vitest run lib/geometry/rack-layout.test.ts` | ❌ W0 | ⬜ pending |
| R3 | At 0° the edges equal the side profile; at 90° the path is the TEMPLATE silhouette (swallow notch on the fish preset); stringer inside the polygon; inputs from the app's own pipeline, never hand-typed | unit | `npx vitest run lib/geometry/rack-art.test.ts` | ❌ W0 | ⬜ pending |
| R4 | Theme tokens exist; no text crosses a board; the stringer uses `--outline-station-line` | unit (source contract) | `npx vitest run components/setup/rack-source.test.ts` | ❌ W0 | ⬜ pending |
| R5 | Hover rack: the cursor turns boards as it passes; rest finishes the nearest; caption under it; click opens | e2e desktop on `/test-rack` | `npx playwright test e2e/board-rack.spec.ts --project=desktop` | ❌ W0 | ⬜ pending |
| R6 | Swipe rack snaps one board to the middle; boards turn as they pass; Shape a New Board on the first screen at 390×664 with 15 boards | e2e iphone + android | `npx playwright test e2e/board-rack-phone.spec.ts --project=iphone --project=android` | ❌ W0 | ⬜ pending |
| R7 | Heading "Board Rack" with the count and the hint per rack | e2e + unit | as R5/R6 | ❌ W0 | ⬜ pending |
| R8 | Order functions (`applyStoredOrder`, `moveInOrder`, `insertAfter`, `insertFirst`, parsers); drag (incl. into another row), Alt+arrow, ⋯ Move; hold-and-drag via CDP touch events; `saveRackOrder` ownership-guarded | unit + e2e | `npx vitest run lib/models lib/db/ownership.test.ts` and the two rack specs | ❌ W0 / extend | ⬜ pending |
| R8 | Order survives reload and shows on another device | manual (dev branch + live walk) | n/a | n/a | ⬜ pending |
| R9 | The unsaved board is first in every merge, never lifts, nothing lands before it | unit + e2e | as R8 | ❌ W0 | ⬜ pending |
| R10 | Read-only `--rack-report` prints counts and exits 0; `check-preference-columns.ts` shows `rack_order` | script | `npx --no-install tsx scripts/check-saved-boards.ts --rack-report` | ❌ W0 | ⬜ pending |
| D-04 | Rack kind read only from the pointer (`useCoarsePointer`), never width | unit (source contract) | `npx vitest run components/setup/rack-source.test.ts` | ❌ W0 | ⬜ pending |
| D-11 | Moves-offered matrix: hover always; swipe only with the fallback on | unit | `npx vitest run components/setup/rack-config.test.ts` | ❌ W0 | ⬜ pending |
| D-16 | A duplicate lands after its original and fixes the order, arranged or not | unit | `npx vitest run lib/models/rack-order.test.ts` | extend | ⬜ pending |
| Rule 2 | Height lines every foot / 50 cm; no `25.4` or `304.8` literals in new files | unit | `npx vitest run lib/geometry/rack-layout.test.ts lib/units-isolation.test.ts` | ❌ W0 / existing | ⬜ pending |
| WR-05 | A board whose art can't be built is dropped and logged; the rest stay | unit | `npx vitest run lib/models/rack-models.test.ts` | extend | ⬜ pending |
| A11y | Arrows walk, Enter opens, Alt+arrow moves, the status line speaks the move; reduced motion swaps without eased frames | e2e desktop | `npx playwright test e2e/board-rack.spec.ts` | ❌ W0 | ⬜ pending |
| Old Safari | The rack's buttons keep their layout under old Safari's button rule | e2e | `npx playwright test e2e/old-safari-buttons.spec.ts` | update | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
