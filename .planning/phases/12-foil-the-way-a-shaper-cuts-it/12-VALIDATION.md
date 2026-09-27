---
phase: 12
slug: foil-the-way-a-shaper-cuts-it
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-26
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.11 (node env, `lib/**/*.test.ts`, `components/**/*.test.ts`) + Playwright 1.63.0 (chromium-1243, webkit-2359; projects desktop / android / iphone) |
| **Config file** | `vitest.config.ts`; `playwright.config.ts` (own dev server on 3100, `PW_PORT` override; in a worktree `IS_WEBPACK_TEST=1 PW_PORT=3150+`, one port per plan: 12-03 3153, 12-04 3154, 12-05 3155, 12-07 3157, 12-08 3158, 12-09 3159) |
| **Quick run command** | `npx vitest run lib/geometry/blank-fit.test.ts lib/geometry/board-profile.test.ts lib/geometry/phase11-foil.test.ts lib/geometry/measure-display.test.ts lib/geometry/blank-reasons.test.ts lib/models/design-snapshot.test.ts lib/fit-defaults-preference.test.ts lib/blanks` |
| **Full suite command** | `npm test && npm run lint && npm run test:e2e` (plus `npx tsc --noEmit` after `npx next typegen` in a worktree; `npm run build` from the main checkout only) |
| **Estimated runtime** | ~12 seconds for the quick run (whole unit suite baseline 9.6 s, 73 files); the full e2e suite several minutes |

---

## Sampling Rate

- **After every task commit:** Run the quick run command plus the touched file's own suite (each task's `<verify><automated>`).
- **After every plan wave:** Run `npm test && npm run lint`, then `npm run test:e2e` on the branch after the merge, and `npm run build` from the main checkout (orchestrator).
- **Before `/gsd-verify-work`:** Full suite must be green; `e2e/desktop-baseline.spec.ts` 5/5 with only the ROCKER image changed since `main` (re-recorded once, in 12-03 Task 3).
- **Max feedback latency:** 15 seconds (quick run); Playwright checks are per task where a screen changes.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | R7, R9 (Wave 0 golden) | T-12-03 | Golden generated only against tag v1.3's `blank-fit.ts`/`pchip.ts` (byte-identity guard); re-run writes identical bytes | unit + script | `npx --no-install tsx --tsconfig ./tsconfig.json scripts/extract-phase11-foil-golden.ts && git diff --exit-code lib/geometry/__fixtures__/phase11-foil-golden.json && npx vitest run lib/geometry/phase11-foil.test.ts` | ❌ W0 (created by this task) | ⬜ pending |
| 12-01-02 | 01 | 1 | R1, R2, R3, R4, R5, R6, R10 — named tests (a)–(e) | T-12-01 | N/A (pure geometry) | unit | `npx vitest run lib/geometry/blank-fit.test.ts lib/geometry/board-profile.test.ts lib/geometry/phase11-foil.test.ts && npx tsc --noEmit && npx vitest run` | ✅ extend / rewrite | ⬜ pending |
| 12-01-03 | 01 | 1 | R9 — named test (f); snapshot v5 | T-12-01, T-12-02, T-12-04 | Cut fields zod-bounded, all-three-or-none; carried offsets clamped ±50 mm; carry-over by shape, never by version | unit | `npx vitest run lib/models/design-snapshot.test.ts lib/models/rack-models.test.ts lib/geometry/phase11-foil.test.ts && npx tsc --noEmit && npx vitest run && npm run lint` | ✅ extend | ⬜ pending |
| 12-02-01 | 02 | 1 | R11; D-01/D-03/D-04 columns [BLOCKING schema push] | T-12-05, T-12-06, T-12-07 | Env file loaded by the script, never printed; 0006 additive only (no DROP); dev migrated + read-only proof | migration + script | `grep -c "ADD COLUMN" drizzle/0006_deck_skin_planer_tip_style.sql && test "$(grep -ci drop drizzle/0006_deck_skin_planer_tip_style.sql)" = "0" && npx tsc --noEmit` (plus the check script's before/after output in the SUMMARY) | ❌ W0 (created by this task) | ⬜ pending |
| 12-02-02 | 02 | 1 | R2, R8 (passes on the printed grid) | — | N/A | unit | `npx vitest run lib/geometry/measure-display.test.ts lib/units-isolation.test.ts && npx tsc --noEmit && npm run lint` | ✅ extend | ⬜ pending |
| 12-03-01 | 03 | 2 | R1, R2, R8; D-10 floor, seven settings | T-12-08, T-12-09, T-12-10, T-12-11 | Allow-list per key; patch naming the retired or an unknown key rejected whole; identity from `auth()` only | unit | `npx vitest run lib/fit-defaults-preference.test.ts lib/geometry/blank-reasons.test.ts lib/geometry/blank-fit.test.ts lib/blanks lib/db && npx tsc --noEmit && npx vitest run && npm run lint` | ✅ extend / rewrite | ⬜ pending |
| 12-03-02 | 03 | 2 | R1, R2, R8 (dialog rows, F4 words) | T-12-08 | Browser copy re-parsed on read | e2e | `IS_WEBPACK_TEST=1 PW_PORT=3153 npx playwright test e2e/fit-defaults.spec.ts e2e/rocker-blanks.spec.ts e2e/new-board.spec.ts` | ✅ extend | ⬜ pending |
| 12-03-03 | 03 | 2 | R8 (the one ROCKER baseline re-record) | T-12-12 | Only ROCKER re-recorded; four other hashes unchanged | e2e (visual) | `IS_WEBPACK_TEST=1 PW_PORT=3153 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop && shasum -a 256 e2e/desktop-baseline.spec.ts-snapshots/*.png` | ✅ | ⬜ pending |
| 12-04-01 | 04 | 3 | R4 (Tip Style default), R8 | T-12-13, T-12-14 | Pill emits only two literals; server re-validates the patch | unit + e2e | `npx vitest run components/viewer/two-option-toggle.test.ts && npx tsc --noEmit && IS_WEBPACK_TEST=1 PW_PORT=3154 npx playwright test e2e/fit-defaults.spec.ts` | ✅ extend | ⬜ pending |
| 12-04-02 | 04 | 3 | R8 (menu copy, touch sizes), R11 | — | N/A | e2e | `IS_WEBPACK_TEST=1 PW_PORT=3154 npx playwright test e2e/touch-sizing.spec.ts e2e/phone-rails.spec.ts e2e/keyboard-focus.spec.ts && IS_WEBPACK_TEST=1 PW_PORT=3154 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` | ✅ extend | ⬜ pending |
| 12-05-01 | 05 | 3 | R1, R2, R3 (Deck Skin, OFF BOTTOM, passes) | T-12-15, T-12-16 | Slider bounded by the shared range; zero network requests on a drag | unit + e2e | `npx tsc --noEmit && npx vitest run lib/units-isolation.test.ts components && IS_WEBPACK_TEST=1 PW_PORT=3155 npx playwright test e2e/rocker-cut.spec.ts` | ❌ W0 (`e2e/rocker-cut.spec.ts` created by this task) | ⬜ pending |
| 12-05-02 | 05 | 3 | R11; D-08 / D-17 presets and litres | — | N/A | unit + script | `npx vitest run lib/blanks lib/geometry/design.test.ts lib/geometry/presets.test.ts && npx --no-install tsx --tsconfig ./tsconfig.json scripts/generate-preset-blanks.ts && git diff --exit-code lib/blanks/preset-blanks.generated.json && npx tsc --noEmit` | ✅ extend | ⬜ pending |
| 12-05-03 | 05 | 3 | R1, R2, R8 (fallback, Metric, undo) | — | N/A | e2e | `IS_WEBPACK_TEST=1 PW_PORT=3155 npx playwright test e2e/rocker-cut.spec.ts e2e/rocker-blanks.spec.ts e2e/desktop-regression.spec.ts e2e/touch-drag.spec.ts e2e/phone-rails.spec.ts e2e/touch-sizing.spec.ts && IS_WEBPACK_TEST=1 PW_PORT=3155 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` | ✅ | ⬜ pending |
| 12-06-01 | 06 | 3 | R9 (account Tip Style carry-over) | T-12-17, T-12-18 | No user id parameter; identity from `auth()`; fail soft before production migrates | unit | `npx vitest run lib/models lib/db/ownership.test.ts && npx tsc --noEmit && npm run lint` | ✅ extend | ⬜ pending |
| 12-06-02 | 06 | 3 | R9 (every dev board opens) | T-12-19 | Select-only; prints counts, never snapshots or the URL | script | `npx tsc --noEmit` + `grep -cE "\.(insert\|update\|delete)\(" scripts/check-saved-boards.ts` = 0 (plus the development output in the SUMMARY) | ❌ W0 (created by this task) | ⬜ pending |
| 12-07-01 | 07 | 3 | R2 (D-15 one pass at the placement) | T-12-20 | N/A | unit | `npx vitest run lib/geometry/blank-fit.test.ts && npx tsc --noEmit` | ✅ extend | ⬜ pending |
| 12-07-02 | 07 | 3 | R8 (D-18 foil runs out, its sentence) | T-12-20 | N/A | unit + e2e | `npx vitest run lib/geometry/blank-fit.test.ts lib/geometry/blank-reasons.test.ts lib/blanks && npx tsc --noEmit && npx vitest run && IS_WEBPACK_TEST=1 PW_PORT=3157 npx playwright test e2e/rocker-blanks.spec.ts` | ✅ extend | ⬜ pending |
| 12-08-01 | 08 | 4 | R4, R5 (Tip Style on the board) | T-12-21, T-12-22 | Pills emit two literals; saves re-parsed by the v5 schema | unit + e2e | `npx vitest run components lib/units-isolation.test.ts && npx tsc --noEmit && IS_WEBPACK_TEST=1 PW_PORT=3158 npx playwright test e2e/rocker-cut.spec.ts` | ✅ extend | ⬜ pending |
| 12-08-02 | 08 | 4 | R6 (Fine-tune off), R8 | T-12-21 | as above | unit + e2e | `npx vitest run components && npx tsc --noEmit && IS_WEBPACK_TEST=1 PW_PORT=3158 npx playwright test e2e/rocker-cut.spec.ts e2e/touch-sizing.spec.ts e2e/rocker-blanks.spec.ts e2e/desktop-regression.spec.ts e2e/touch-drag.spec.ts e2e/undo-redo.spec.ts && IS_WEBPACK_TEST=1 PW_PORT=3158 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` | ✅ extend | ⬜ pending |
| 12-09-01 | 09 | 4 | R1, R2, R4 (DATASHEET FOAM OFF, drawing name) | T-12-23 | Catalogue text as React text only; no `dangerouslySetInnerHTML` | e2e | `npx tsc --noEmit && IS_WEBPACK_TEST=1 PW_PORT=3159 npx playwright test e2e/rocker-blanks.spec.ts e2e/phone-rails.spec.ts` | ✅ extend | ⬜ pending |
| 12-09-02 | 09 | 4 | R7, R10, R11 (type contract; R7 order check) | T-12-24 | A board without its cut cannot compile | unit + git | `npx tsc --noEmit && npx vitest run && npm run lint && git diff --quiet main -- lib/geometry/pchip.ts package.json package-lock.json` (+ the `git merge-base --is-ancestor` R7 check) | ✅ | ⬜ pending |
| 12-10-01 | 10 | 5 | R9, R11 on production | T-12-25, T-12-26, T-12-27 | Pulled env deleted by an EXIT trap; migrate BEFORE deploy; no DROP | manual (founder) | — (checkpoint:human-action; the founder pastes `db:migrate:prod` and both read-only checks' output) | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/extract-phase11-foil-golden.ts` + `lib/geometry/__fixtures__/phase11-foil-golden.json` — generated from tag v1.3's `boardOnBlank` as the FIRST commit, before any `lib/geometry/blank-fit.ts` edit (12-01 Task 1)
- [ ] `lib/geometry/phase11-foil.ts` + `lib/geometry/phase11-foil.test.ts` — Phase 11's 12" formula pinned to the golden (12-01 Task 1)
- [ ] The six named tests (R7), before any `components/` change: (a)–(e) in `lib/geometry/blank-fit.test.ts` (12-01 Task 2), (f) in `lib/models/design-snapshot.test.ts` (12-01 Task 3)
- [ ] `planerPasses` / `formatPasses` cases in `lib/geometry/measure-display.test.ts` (12-02 Task 2)
- [ ] `scripts/check-preference-columns.ts` (12-02 Task 1) and `scripts/check-saved-boards.ts` (12-06 Task 2) — read-only database proofs, reused by the founder in 12-10
- [ ] `e2e/rocker-cut.spec.ts` — Phase 12's ROCKER browser proof (created in 12-05 Task 1, extended in 12-08)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production migration order and live walk-through | R9, R11 | Needs the founder's production credentials and his go-ahead on the merge | 12-10: `npm run db:migrate:prod` (0006 only), the two read-only checks through the pulled-env trap, then merge, push, Vercel green, and the live ROCKER / Fit & Tip Defaults / rack checks |
| The drawing's two foam bands and eased tips in all four themes; a non-fitting board crossing the blank's line (UI backstop) | R1, R4 | Visual judgment across themes; no pixel baseline shows a blank | 12-09 Task 1 human-check: pick a blank in each theme; deck band above, bottom band below, widening over the last 12" on the Tip Style's side; a board that does not fit crosses the blank's 1px line with no warning colour on the drawing |
| A carried-over 12" tweak beyond ±1/4" (UI backstop, Edge) | R9, D-20 | Needs a saved Phase 11 board whose residual exceeds the slider's reach | 12-08 Task 2 human-check: open such a board; the label and Tweak hint read the true value, the thumb sits at the end, a drag replaces it, one undo restores it |
| Account round trip for the new defaults (Tip Style, Deck Skin, Planer Max Depth) | R4 (D-01/D-03/D-04) | Playwright runs signed out on fake Clerk keys | 12-04 Task 1 human-check: signed in, set Tip Style to Bottom; another signed-in device reads Bottom |
| A Phase 11 board from the rack opens with the shaper's own Tip Style and its five numbers | R9 (D-14) | Needs a signed-in account with a saved Phase 11 board | 12-06 Task 1 human-check |
| Real-phone walk of the Deck Skin slider, Tip Style and Fine-tune off pills | R8 (touch) | Playwright's emulated phones are not real hardware (Phase 10 lesson) | 12-05 Task 1 and 12-08 Task 2 human-checks on a real iPhone and a real Pixel |
| Development-database evidence (check scripts) | R9, R11 | Needs the development credentials; a reviewer re-runs only from the main checkout | 12-02 Task 1 and 12-06 Task 2 paste their check output into their SUMMARYs |
| The re-recorded ROCKER baseline shows only the list intro's new wording | R8 | Visual comparison of two images | 12-03 Task 3 human-check: open the new image beside `HEAD~1`'s |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (12-10 is the founder's checkpoint, verified by pasted output)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [ ] Feedback latency < 15s (quick run; Playwright steps are longer by nature — validate-phase to confirm)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
