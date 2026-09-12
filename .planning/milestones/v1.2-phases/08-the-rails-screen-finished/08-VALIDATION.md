---
phase: 8
slug: the-rails-screen-finished
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-07
updated: 2026-09-08
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.11, `environment: "node"` (no DOM — every test in this repo is a pure-function or source-contract test) |
| **Config file** | `vitest.config.ts` (repo root, already present) |
| **Quick run command** | `npx vitest run <file>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~8 seconds for a single file; the full suite runs in well under a minute |

**Worktree note:** `npm run build` does not work inside a git worktree (Turbopack cannot resolve
`next`). Executors gate on `npx tsc --noEmit` plus `npm test`; the orchestrator runs the real build
from the main checkout after each wave merges.

---

## Sampling Rate

- **After every task commit:** the task's own `<automated>` command (always `npx vitest run <file>`
  plus `npx tsc --noEmit`)
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** full suite green, plus 08-06's byte-identity proof of the three jsPDF
  surfaces
- **Max feedback latency:** ~8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 8-01-01 | 01 | 1 | RAIL-02, RAIL-03 | T-08-01 | Prototype source is executed only by a developer-run extraction script, never bundled or served | unit (golden parity) | `npm run golden:rails && npx vitest run lib/geometry/rail-bands.test.ts lib/units-isolation.test.ts` | ✅ `lib/geometry/rail-bands.test.ts`, `lib/units-isolation.test.ts` | ⬜ pending |
| 8-01-02 | 01 | 1 | RAIL-03 | — | N/A | unit (source contract) | `npx vitest run components/viewer/two-option-toggle.test.ts` | ❌ W0 — created by this task | ⬜ pending |
| 8-01-03 | 01 | 1 | RAIL-02, RAIL-06 | T-08-03 | Callout data is an internal typed array, never a value from storage, a cookie or the network | unit (pure layout math) | `npx vitest run components/rails/rail-callouts.test.ts lib/units-isolation.test.ts` | ❌ W0 — created by this task | ⬜ pending |
| 8-02-01 | 02 | 1 | PRNT-05 | T-08-04 | Every cookie/localStorage read passes an allow-list parser that returns null outside its two valid values | unit (pure preference logic) | `npx vitest run lib/print-instructions-preference.test.ts lib/units-isolation.test.ts` | ❌ W0 — created by this task | ⬜ pending |
| 8-02-02 | 02 | 1 | PRNT-05 | T-08-05, T-08-06 | Identity comes only from `await auth()`; the value is allow-listed before any database statement | unit (source contract) + migration | `npm run db:generate && npm run db:migrate && npm run db:migrate && npx vitest run lib/db/ownership.test.ts lib/print-instructions-preference.test.ts` | ✅ `lib/db/ownership.test.ts` (extended by this task) | ⬜ pending |
| 8-02-03 | 02 | 1 | PRNT-05 | T-08-07, T-08-08 | The account write retries on a bounded ladder and gives up quietly; no unbounded retry can hammer the database | unit (generic invariant) | `npx vitest run lib/preference-handoff.test.ts lib/units-preference.test.ts lib/print-instructions-preference.test.ts && npm test` | ❌ W0 — created by this task | ⬜ pending |
| 8-03-01 | 03 | 2 | RAIL-05 | T-08-10 | Ported path strings are module constants pinned to the prototype source; no runtime input reaches a path attribute | unit (port parity) | `npx vitest run components/rails/rail-reference-paths.test.ts` | ❌ W0 — created by this task | ⬜ pending |
| 8-03-02 | 03 | 2 | RAIL-05, RAIL-06 | T-08-11 | A missing raster degrades to a still-useful line drawing inside a reserved box | unit (units ledger) | `npx vitest run lib/units-isolation.test.ts components/rails/rail-reference-paths.test.ts` | ✅ `lib/units-isolation.test.ts` | ⬜ pending |
| 8-03-03 | 03 | 2 | RAIL-05, RAIL-06 | — | N/A | unit (units ledger) | `npx vitest run lib/units-isolation.test.ts && npm test` | ✅ | ⬜ pending |
| 8-04-01 | 04 | 3 | RAIL-04 | T-08-12 | A non-positive probe measurement falls back to the CSS-spec value rather than a zero-sized drawing | unit (existing plot suite + ledger) | `npx tsc --noEmit && npx vitest run components/rails/rail-section-plot.test.ts lib/units-isolation.test.ts` | ✅ `components/rails/rail-section-plot.test.ts` | ⬜ pending |
| 8-04-02 | 04 | 3 | RAIL-04, RAIL-06 | T-08-13 | The actual-size claim is checkable: the caption is formatter-derived, so the bar and the template's scale square can never disagree | unit (source contract) | `npx vitest run components/rails/view-full-sized-dialog.test.ts` | ❌ W0 — created by this task | ⬜ pending |
| 8-04-03 | 04 | 3 | RAIL-04, RAIL-06 | T-08-15 | The new print stylesheet is route-scoped and cannot alter the order form's or the templates' output | unit (print-surface ledger) | `npx vitest run lib/units-isolation.test.ts components/rails/view-full-sized-dialog.test.ts && npm test` | ✅ | ⬜ pending |
| 8-05-01 | 05 | 4 | PRNT-05, PRNT-06 | T-08-16 | The sheet count derives from an allow-list-parsed preference; a tampered value can only resolve to ticked, unticked or never-chosen | unit (units ledger) | `npx vitest run lib/units-isolation.test.ts` | ✅ | ⬜ pending |
| 8-05-02 | 05 | 4 | PRNT-05, RAIL-06 | T-08-17 | The printed sheet takes no content-varying props and holds no state, so no on-screen state can change what prints | unit (source contract) | `npx vitest run components/summary/rail-instructions-sheet.test.ts lib/units-isolation.test.ts` | ❌ W0 — created by this task | ⬜ pending |
| 8-05-03 | 05 | 4 | RAIL-06, PRNT-06 | T-08-19 | Every file that reaches paper is subject to the print-specific checks | unit (print-surface ledger) | `npx vitest run lib/units-isolation.test.ts && npm test` | ✅ | ⬜ pending |
| 8-06-01 | 06 | 5 | PRNT-06 | T-08-19, T-08-23 | `components/template/` is provably unmodified and no throwaway probe survives | integration (PDF content-stream diff vs pre-phase commit) | `git diff --quiet 3210103522a3a5e59148401f57904a23fae93026 -- components/template/ && npm test` | ✅ (method, not a repo test file) | ⬜ pending |
| 8-06-02 | 06 | 5 | PRNT-06 | T-08-SC | No dependency is installed to rescue the scripted diff | integration (best-effort print-to-PDF diff) + human fallback | `npx vitest run lib/units-isolation.test.ts && npm test` | ✅ | ⬜ pending |
| 8-06-03 | 06 | 5 | PRNT-05 | T-08-20, T-08-21, T-08-22 | Production migrates only after the code is pushed and the deployment is Ready; the transient production env file is removed by the npm script's own trap | human action (blocking checkpoint) | N/A — see Manual-Only Verifications | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No test framework install is needed — Vitest is already configured for exactly this kind of
pure-function and source-contract testing, and every existing suite runs in the node environment
with no DOM.

Test files each task must create before or alongside its implementation (each is created by the task
that needs it; there is no separate Wave 0 plan):

- [ ] `components/viewer/two-option-toggle.test.ts` — the extracted toggle's class strings match the
      source they were extracted from (8-01-02)
- [ ] `components/rails/rail-callouts.test.ts` — the ten anchors, their sides, and the de-overlap
      pass's separation, stability and independence-per-side (8-01-03)
- [ ] `lib/print-instructions-preference.test.ts` — the parser's allow-list and the five handoff
      branches for the print preference (8-02-01)
- [ ] `lib/preference-handoff.test.ts` — the generic invariant: for any preference value type, the
      account wins on sign-in, an explicit browser pick promotes only into an empty account, and a
      default nobody chose is never written (8-02-03)
- [ ] `components/rails/rail-reference-paths.test.ts` — the ported plan/side path data, viewBox
      strings and colour map still equal the prototype's own source, and the artwork is a
      byte-identical copy (8-03-01)
- [ ] `components/rails/view-full-sized-dialog.test.ts` — formatter-derived caption, no local
      conversion factor, no pixel-ratio multiply, no calibration instruction, and the two contract
      copy strings verbatim (8-04-02)
- [ ] `components/summary/rail-instructions-sheet.test.ts` — the sheet is fixed: no state, the
      non-domed rail, every legend group, and rendered only behind the preference conditional
      (8-05-02)

Extended (not created) by this phase: `lib/geometry/rail-bands.test.ts`, `lib/units-isolation.test.ts`,
`lib/db/ownership.test.ts`.

---

## Manual-Only Verifications

Human verification runs **end-of-phase** (`workflow.human_verify_mode`). Executors record these as
`<human-check>` items in their SUMMARYs; the verifier harvests them into UAT. No plan stops for one.

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The 1:1 rail measures true on screen | RAIL-04 | Physical measurement against a real screen; no web API reports a display's physical size | Open /design/rails VIEWER → View Full Sized. Hold a ruler to the two-inch check bar, then to a known rail mark. Both must read true. Repeat in Metric and confirm the caption reads the millimetre value while the bar itself does not move. |
| The 1:1 rail measures true on paper | RAIL-04, RAIL-06 | Requires a physical printer and a ruler | Press Print in the dialog, turn "Fit to page" **off**, print, and measure the check bar and one known mark. Repeat in Metric. |
| Callout anchors match the prototype, Corner Cut included | RAIL-02 | Visual side-by-side against a reference rendering | Open the prototype's own "Understanding Rail Markings" plot at the same zoom beside the app's. Confirm all ten names appear and Corner Cut sits at the same height (RESEARCH.md Pitfall 1). |
| No two callout names overlap | RAIL-02 | Held-out visual check (UI-SPEC backstop) | At the narrowest desktop card width, in both Flat and Domed, confirm every name sits fully inside the SVG with no overlaps. |
| The plan/side figure's lines land on the right features | RAIL-05 | Visual side-by-side; the PNG-to-viewBox coupling is implicit and silent when broken (RESEARCH.md Pitfall 5) | Open the prototype's own figure at the same zoom. Confirm every line lands on the same board-outline feature, the three station labels sit at the same heights, and the side strip and taper note match. |
| Legend show/hide, including all-off and mixed | RAIL-05 | Interactive | Untick all nine and confirm only the marking lines vanish (outline, side strip and station labels stay). Tick a mixed subset and confirm exactly those families draw. |
| Instructional copy is verbatim in Imperial, converted in Metric | RAIL-06 | Word-for-word reading (UI-SPEC backstop) | Read the three steps and the closing note against the prototype's own text. Then switch to Metric and confirm the tail-distance range and the station labels read in centimetres, unit carried once. |
| Legend labels wrap rather than truncate | RAIL-05 | Held-out visual check (UI-SPEC backstop) | At the narrowest desktop card width, confirm every label — the longest is "Deck Mark 3 Center (full board)" — wraps beside its dot. |
| The VIEWER tab is visually unchanged | RAIL-02 | Regression by eye; the callouts prop is additive but the plot is shared | Compare the three VIEWER plots before and after: no callouts, no shift, no scale change. |
| The preference survives a reload with no flash | PRNT-05 | First-paint behaviour is not observable in a node test | Tick the box, reload, confirm it is still ticked and never flashed unticked. |
| The preference follows the shaper to another device | PRNT-05 | Requires two real signed-in sessions | Tick on one browser signed in; open a second browser profile signed in as the same shaper; confirm it is already ticked. Then sign out and confirm the browser's own value still shows. |
| Ticking the box does not dirty a board | D-06 | Requires a saved board and the autosave path | Open a saved board, tick the box, confirm no not-saved badge and no autosave. |
| The unticked order form prints unchanged | PRNT-06 | Fallback for 8-06-02 if the scripted print-to-PDF diff proves unreliable (RESEARCH.md Pitfall 4) | With the box unticked, open print preview in Imperial on Letter and A4 and in Metric on Letter and A4. Pages 1 and 2 must be exactly as before — same layout, values, page marks reading "of 2", same note, nothing clipped. |
| Page 3 ignores the on-screen tab state | PRNT-05, D-08 | Requires printing after setting the tab | Set INSTRUCTIONS to Domed, untick several legend boxes, then print. Page 3 must still show the Flat rail with every line drawn. |
| Page 3 fits one page in both systems on both papers | PRNT-05 | Held-out print-preview check (UI-SPEC backstop) | Preview page 3 in Imperial and Metric, on Letter and A4. Nothing clipped, nothing overflowing, never a fourth page. |
| Push → deploy → migrate production, in that order | PRNT-05 | Touches the live database; CLAUDE.md's rule is absolute | 08-06 Task 3's six ordered steps, ending with: tick the box on the live site signed in, reload, confirm it stayed ticked. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a named Wave 0 test file they create
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (the only task without one
      is 8-06-03, the terminal human checkpoint)
- [x] Wave 0 covers all MISSING references — every ❌ in the map is created by the task that needs it
- [x] No watch-mode flags (`npm test` is `vitest run`; every quick command is `npx vitest run`)
- [x] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter — pending `/gsd-validate-phase` after execution

**Approval:** pending
