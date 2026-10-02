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
| *(filled by the planner)* | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/extract-phase14-today-golden.ts` and `lib/geometry/__fixtures__/phase14-today-golden.json` — today's numbers pinned from the live commit `ed39f4a` before any rule changes (SPEC constraint 2, D-26)
- [ ] `lib/geometry/root-curve.test.ts` — new; R1–R5, acceptance 1, 2 and 8
- [ ] `lib/geometry/tip-taper.test.ts` — new; R6, R7, acceptance 3 and 4
- [ ] Tests that would otherwise go quiet instead of red, repointed at the live curve in the same change that switches it: `blank-fit.test.ts` (the neighbouring-stations and levelling tests), `rocker.test.ts` (the hand-set rocker's stations and minimum), `board-profile.test.ts` and `volume.test.ts` (the tests that build today's curve themselves)
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
