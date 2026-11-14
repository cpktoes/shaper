---
phase: 14
slug: realistic-surfboard-flow
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-02
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `14-RESEARCH.md` → "Validation Architecture". The planner fills the Per-Task Verification Map.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 (node environment; `lib/**/*.test.ts` and `components/**/*.test.ts`) for the maths, words and store; Playwright for the screens and the printed pages |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` (own dev server on port 3100; `PW_PORT=` per parallel run) |
| **Quick run command** | `npx vitest run <the touched file's own test file>` — e.g. `npx vitest run lib/geometry/root-curve.test.ts` (seconds). `lib/geometry/blank-fit.test.ts` alone takes about 17 s |
| **Full suite command** | `npm test` (93 files, 3,654 tests, about 19 s today) plus `npx tsc --noEmit` and `npm run lint` |
| **Browser suite** | `npm run test:e2e` (both phones and the desktop); `npm run test:e2e:phone` while iterating |
| **Generators and reports** | `npx --no-install tsx --tsconfig ./tsconfig.json scripts/<file>.ts` |
| **Estimated runtime** | ~20 seconds for the full Vitest suite; the browser suite runs once per wave on the main checkout |

---

## Sampling Rate

- **After every task commit:** Run the touched file's own test file (quick run above)
- **After every plan wave:** Run `npm test`, `npx tsc --noEmit` and `npm run lint`; the full browser suite on the main checkout
- **Before each go-live:** Full suite green, `npm run build` from the main checkout, the browser suite, the read-only saved-boards report read back to the founder (D-18), and the before-and-after pictures (D-15)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-T1 | 14-01 | 1 | R2, R4, R8, R9 | T-14-01, T-14-02 | The pin is generated only from code byte-identical to `ed39f4a`; its blanks are carried by value | unit + generator | `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase14-today-golden.ts && git diff --exit-code lib/geometry/__fixtures__/phase14-today-golden.json && npx vitest run lib/geometry/phase14-today.test.ts lib/geometry/phase14-today-handset.test.ts` | ❌ W0 (created by this task) | ⬜ pending |
| 14-01-T2 | 14-01 | 1 | R8, R9 | T-14-01 | The generator refuses moved code | unit | `npx vitest run lib/geometry/phase14-today.test.ts lib/geometry/phase14-today-handset.test.ts` | ❌ W0 (14-01-T1) | ⬜ pending |
| 14-02-T1 | 14-02 | 2 | R1, R2, R3, R5 | T-14-03 | Bad knots fail loudly, as `preparePchip` | unit, catalogue-wide | `npx vitest run lib/geometry/root-curve.test.ts` | ❌ W0 (created by this task) | ⬜ pending |
| 14-02-T2 | 14-02 | 2 | R1, R2, R3, R5, R8 | — | — | unit, catalogue-wide + pinned hidden stations | `npx vitest run lib/geometry/root-curve.test.ts` | ❌ W0 (14-02-T1) | ⬜ pending |
| 14-03-T1 | 14-03 | 3 | R2, R3, R5, R8 | T-14-04, T-14-05 | A Phase 11 board's numbers are read on today's rule whatever the live switch | unit (Phase 11 tests unmodified) | `npx vitest run lib/geometry/phase11-foil.test.ts lib/models/design-snapshot.test.ts lib/geometry/phase14-today.test.ts lib/blanks/preset-blanks.test.ts` | ✅ | ⬜ pending |
| 14-03-T2 | 14-03 | 3 | R1, R4, R5 | — | — | unit, catalogue + stress set | `npx vitest run lib/geometry/phase14-curves.test.ts lib/geometry/blank-fit.test.ts` | ❌ W0 (`phase14-curves.test.ts`, this task) | ⬜ pending |
| 14-04-T1 | 14-04 | 3 | R4 | T-14-06 | — | unit | `npx vitest run lib/geometry/board-profile.test.ts lib/geometry/phase14-today-handset.test.ts` | ✅ | ⬜ pending |
| 14-04-T2 | 14-04 | 3 | R4 | — | — | unit | `npx vitest run lib/geometry/foil.test.ts lib/geometry/volume.test.ts lib/geometry/rocker.test.ts lib/geometry/design.test.ts` | ✅ | ⬜ pending |
| 14-04-T3 | 14-04 | 3 | R3, R4 | T-14-07 | One pipeline for every figure | unit | `npx vitest run lib/geometry/design.test.ts lib/geometry/phase14-today-handset.test.ts` | ✅ | ⬜ pending |
| 14-05-T1 | 14-05 | 4 | R9 | T-14-08 | Report lines carry only counts, lengths and percentages | unit + script (no database) | `npx vitest run lib/geometry/before-after.test.ts && npx --no-install tsx --tsconfig ./tsconfig.json scripts/phase14-before-after.ts --step curves` | ❌ W0 (created by this task) | ⬜ pending |
| 14-05-T2 | 14-05 | 4 | R8, R9 | T-14-08, T-14-09, T-14-10 | One select, no write, counts only; never run by the executor | static | `npx tsc --noEmit && grep -c "db.select" scripts/check-saved-boards.ts` | ✅ | ⬜ pending |
| 14-05-T3 | 14-05 | 4 | R8 | T-14-10 | Opening writes nothing; the curves release opens a later board | unit | `npx vitest run lib/models/saved-board-open.test.ts lib/models/design-snapshot.test.ts` | ❌ W0 (created by this task) | ⬜ pending |
| 14-06-T1 | 14-06 | 4 | R4, R9 | T-14-11 | — | unit + generator | `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase14-preset-figures.ts --step curves && npx vitest run lib/geometry/phase14-preset-figures.test.ts` | ❌ W0 (created by this task) | ⬜ pending |
| 14-06-T2 | 14-06 | 4 | R4, R8 | T-14-12 | Only the ROCKER and VOLUME baselines are re-recorded | e2e (desktop) | `IS_WEBPACK_TEST=1 PW_PORT=3141 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` | ✅ | ⬜ pending |
| 14-07-T1 | 14-07 | 5 | R8, R9 | T-14-13, T-14-14, T-14-15 | The production env file is deleted on exit; no tips code ships | checkpoint (founder) + full gate | orchestrator: `npm test && npx tsc --noEmit && npm run lint && npm run build && npm run test:e2e`; founder: the read-only `--curves-report` command | n/a | ⬜ pending |
| 14-07-T2 | 14-07 | 5 | R9 | T-14-14, T-14-15 | Only `CURVES_TIP` is merged, on the founder's go | manual + CLI | `git rev-parse origin/main^2` and `npx --no-install vercel ls --prod --yes` | n/a | ⬜ pending |
| 14-08-T1 | 14-08 | 6 | R6, R7 | T-14-16, T-14-17 | Bounded scan; a non-number reads Automatic | unit | `npx vitest run lib/geometry/tip-taper.test.ts lib/geometry/pchip.test.ts lib/geometry/root-curve.test.ts` | ❌ W0 (`tip-taper.test.ts`, this task) | ⬜ pending |
| 14-08-T2 | 14-08 | 6 | R6 | — | — | unit, catalogue-wide | `npx vitest run lib/geometry/pchip.test.ts lib/geometry/root-curve.test.ts` | ✅ | ⬜ pending |
| 14-08-T3 | 14-08 | 6 | R6, R7 | T-14-17 | — | unit | `npx vitest run lib/geometry/tip-taper.test.ts` | ❌ W0 (14-08-T1) | ⬜ pending |
| 14-09-T1 | 14-09 | 6 | R6, R8 | T-14-18, T-14-19, T-14-20 | Bounded, tolerant read; a corrupt start never rejects a board (ASVS V5) | unit | `npx vitest run lib/models/saved-board-open.test.ts lib/models/design-snapshot.test.ts lib/models/rack-models.test.ts` | ✅ | ⬜ pending |
| 14-09-T2 | 14-09 | 6 | R6, R8 | T-14-18 | No database change, no account setting | unit + git | `npx vitest run lib/models/saved-board-open.test.ts && git diff --quiet <wave base> -- drizzle lib/db/schema.ts lib/fit-defaults-preference.ts` | ✅ | ⬜ pending |
| 14-10-T1 | 14-10 | 7 | R1, R6, R7 | T-14-21, T-14-22 | — | unit, stress set (full and buildable) | `npx vitest run lib/geometry/tip-flow.test.ts lib/geometry/phase14-today.test.ts lib/geometry/phase14-curves.test.ts lib/geometry/before-after.test.ts lib/geometry/phase11-foil.test.ts lib/models/design-snapshot.test.ts` | ❌ W0 (`tip-flow.test.ts`, this task) | ⬜ pending |
| 14-10-T2 | 14-10 | 7 | R6, R7 | — | — | unit | `npx vitest run lib/geometry/blank-fit.test.ts` | ✅ | ⬜ pending |
| 14-10-T3 | 14-10 | 7 | R7 | — | — | unit + generator | `npx vitest run lib/geometry/phase14-preset-figures.test.ts` | ✅ | ⬜ pending |
| 14-11-T1 | 14-11 | 7 | R6 | — | — | unit, both unit systems | `npx vitest run lib/geometry/blank-reasons.test.ts` | ✅ | ⬜ pending |
| 14-11-T2 | 14-11 | 7 | R6 | T-14-23 | No "Automatic would clear that" sentence where Automatic cannot | unit, both unit systems | `npx vitest run lib/geometry/blank-reasons.test.ts` | ✅ | ⬜ pending |
| 14-11-T3 | 14-11 | 7 | R6 | — | — | unit (source contract) | `npx vitest run components/design/slider-row.test.ts` | ✅ | ⬜ pending |
| 14-12-T1 | 14-12 | 8 | R6, R8 | T-14-24 | — | unit | `npx vitest run lib/geometry/board-profile.test.ts` | ✅ | ⬜ pending |
| 14-12-T2 | 14-12 | 8 | R6 | T-14-24 | One helper carries the starts on every path | unit + source contract | `npx vitest run lib/geometry/thinning-start-paths.test.ts lib/geometry/design.test.ts` | ❌ W0 (created by this task) | ⬜ pending |
| 14-12-T3 | 14-12 | 8 | R9 | T-14-08 | Tips report lines carry counts and one length only | unit | `npx vitest run lib/geometry/before-after.test.ts lib/geometry/thinning-start-paths.test.ts` | ✅ | ⬜ pending |
| 14-13-T1 | 14-13 | 8 | R6 | T-14-25 | The reason names the true cause | unit | `npx vitest run lib/geometry/blank-reasons.test.ts lib/geometry/tip-flow.test.ts lib/geometry/blank-fit.test.ts` | ✅ | ⬜ pending |
| 14-13-T2 | 14-13 | 8 | R6, R7 | — | — | unit, stress set | `npx vitest run lib/geometry/tip-flow.test.ts` | ✅ | ⬜ pending |
| 14-13-T3 | 14-13 | 8 | R6 | T-14-26 | The blank list stays fast | unit (size guard) | `npx vitest run lib/geometry/tip-flow.test.ts lib/geometry/blank-fit.test.ts` | ✅ | ⬜ pending |
| 14-14-T1 | 14-14 | 9 | R6 | T-14-27, T-14-28 | Automatic deletes the stored value; one undo step each | unit (source contract) + static | `npx vitest run components/design/design-store.test.ts components/design/slider-row.test.ts && npx tsc --noEmit && npm run lint` | ✅ | ⬜ pending |
| 14-14-T2 | 14-14 | 9 | R6 | — | — | static | `npx tsc --noEmit && npm run lint` | ✅ | ⬜ pending |
| 14-14-T3 | 14-14 | 9 | R6 | — | — | e2e (iphone, android, desktop) | `IS_WEBPACK_TEST=1 PW_PORT=3142 npx playwright test e2e/rocker-cut.spec.ts e2e/touch-sizing.spec.ts e2e/rocker-blanks.spec.ts` | ✅ | ⬜ pending |
| 14-15-T1 | 14-15 | 9 | R6 | T-14-29 | — | e2e (three projects) | `IS_WEBPACK_TEST=1 PW_PORT=3143 npx playwright test e2e/rocker-blanks.spec.ts` | ✅ | ⬜ pending |
| 14-15-T2 | 14-15 | 9 | R6 | — | — | e2e + four theme screenshots (a look) | `IS_WEBPACK_TEST=1 PW_PORT=3143 npx playwright test e2e/rocker-blanks.spec.ts` | ✅ | ⬜ pending |
| 14-16-T1 | 14-16 | 9 | R6 | T-14-30 | — | unit, both unit systems | `npx vitest run lib/geometry/planing.test.ts` | ✅ | ⬜ pending |
| 14-16-T2 | 14-16 | 9 | R6 | — | — | e2e (print fit, both papers, phone widths) | `IS_WEBPACK_TEST=1 PW_PORT=3144 npx playwright test e2e/summary-planing.spec.ts` | ✅ | ⬜ pending |
| 14-17-T1 | 14-17 | 9 | R6 | T-14-33 | The list and flag are never stale after a start changes | static + source contract | `npx tsc --noEmit && npm run lint && npx vitest run lib/geometry/thinning-start-paths.test.ts` | ✅ | ⬜ pending |
| 14-17-T2 | 14-17 | 9 | R8, R9 | T-14-31, T-14-32 | One select, no write, counts only; never run by the executor | static + unit | `npx tsc --noEmit && npx vitest run lib/geometry/thinning-start-paths.test.ts` | ✅ | ⬜ pending |
| 14-17-T3 | 14-17 | 9 | R9 | — | — | script (no database) | `npx --no-install tsx --tsconfig ./tsconfig.json scripts/phase14-before-after.ts --step tips` | ✅ | ⬜ pending |
| 14-18-T1 | 14-18 | 10 | R6, R7, R8, R9 | T-14-34, T-14-35, T-14-36 | The production env file is deleted on exit; no database change ships | checkpoint (founder) + full gate | orchestrator: `npm test && npx tsc --noEmit && npm run lint && npm run build && npm run test:e2e`; founder: the read-only `--tips-report` command | n/a | ⬜ pending |
| 14-18-T2 | 14-18 | 10 | R9 | T-14-35 | Only `TIPS_TIP` is merged, on the founder's go, before the freeze | manual + CLI | `git rev-parse origin/main^2` and `npx --no-install vercel ls --prod --yes` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Confirmed by the planner, each with the plan that creates it (every one is written before the rule it guards changes):

- [ ] `scripts/extract-phase14-today-golden.ts`, `lib/geometry/__fixtures__/phase14-today-golden.json`, `lib/geometry/__fixtures__/phase14-today.ts`, `lib/geometry/__fixtures__/phase14-stress-set.ts`, `lib/geometry/phase14-today.test.ts`, `lib/geometry/phase14-today-handset.test.ts` — today's numbers pinned from the live commit `ed39f4a` before any rule changes (SPEC constraint 2, D-26) — **14-01, wave 1**
- [ ] `lib/geometry/root-curve.test.ts` — new; R1–R5, acceptance 1, 2 and 8 at the curve level, the hidden-station score — **14-02, wave 2** (before either switch)
- [ ] `lib/geometry/phase14-curves.test.ts` — acceptance 1 and 2 through `prepareBlank`, no stress board newly refused — **14-03, wave 3**
- [ ] `lib/geometry/before-after.test.ts` (today's rules reproduce the pin's litres) and `lib/models/saved-board-open.test.ts` (acceptance 7; the rollback edge, written before the starts exist) — **14-05, wave 4**
- [ ] `lib/geometry/phase14-preset-figures.test.ts` with its generated record — acceptance 5 — **14-06, wave 4**
- [ ] `lib/geometry/tip-taper.test.ts` — the taper, Automatic, the range and the flag — **14-08, wave 6** (before the tip rule changes)
- [ ] `lib/geometry/tip-flow.test.ts` — acceptance 3 and 4 on the stress set and its buildable subset — **14-10, wave 7**, extended by **14-13**
- [ ] `lib/geometry/thinning-start-paths.test.ts` — one start through every board-input path (Pitfall 5) — **14-12, wave 8**, extended by **14-17**
- [ ] Tests that would otherwise go quiet instead of red, repointed at the live curve in the same plan that switches it: `blank-fit.test.ts` (the neighbouring-stations and levelling tests, and the rocker-golden block onto `prepareBlankPchip`) — **14-03**; `rocker.test.ts` (the hand-set rocker's stations and minimum), `board-profile.test.ts` and `volume.test.ts` (the tests that build today's curve themselves) — **14-04**; the tips step's eight — **14-10**
- [ ] No framework install: the existing infrastructure covers everything else

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The before-and-after pictures for each go-live, and the founder's go | R9 (D-15) | The founder decides from pictures; nothing is pushed without their go | Draw the preset cards, the first board a visitor sees and a saved-board-like case before and after, with the app's own maths; show them with the saved-boards report |
| The read-only report on the real saved boards, once per go-live | R8, R9 (D-18) | It reads production; the founder runs it in their own terminal | One command; it only reads; the counts are read back to the founder |
| The desktop reference screenshots that move (ROCKER and VOLUME at the curves step; none at the tips step) | R4, R8 | The baselines are macOS-rendered and local; the difference needs the founder's eye | Re-record only the expected two, show the difference, confirm RAILS, FINS and TEMPLATE did not move |
| The rehearsal walk on real devices after the last change | R9 (D-17, acceptance 9) | Real phones and the presenting laptop | Phase 13's walk sheet (`13-UAT.md`), on the live site |
| The starts line on a printed order form, both papers | R6 (D-12) | Paper | Print page 2 on Letter and A4 from the live site |
| The Metric slider's ends and an off-grid Automatic thumb | R6 | A look, and the arrow keys | In Metric, set a 6" start in Imperial first, switch, and step with the arrow keys |
| The tape-measure check on a real Arctic blank | R2 (D-08) | Needs a blank in the bay; after go-live, gates nothing | The one-page sheet `arctic-blank-tape-check-sheet.pdf` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
