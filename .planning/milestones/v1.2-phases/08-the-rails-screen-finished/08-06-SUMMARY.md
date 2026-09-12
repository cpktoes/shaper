---
phase: 08-the-rails-screen-finished
plan: 06
subsystem: infra
tags: [pdf, print, migration, neon, vercel, pypdf]

requires:
  - phase: 08-01
    provides: "The INSTRUCTIONS tab, ExampleRailFigure and RailPlanSideFigure this plan's byte-identity proof measures around."
  - phase: 08-02
    provides: "print_rail_instructions preference column (generated migration) — the column this plan applies to production."
  - phase: 08-05
    provides: "The third order-form sheet and generalized PageMark whose unticked-path byte-identity this plan proves."
provides:
  - "PRNT-06 evidence: the three jsPDF surfaces (Overview Sheet, Full Sized Template, Paper Saver) are measured byte-identical to their pre-phase output across both systems and both paper sizes."
  - "A recorded structural reason the order form's scripted print-to-PDF diff could not run, with the Phase 7 D-10 human print-preview audit named as the fallback and its checks handed to end-of-phase UAT."
  - "The print_rail_instructions column applied to the Neon production branch, after the phase's code was pushed and deployed."
affects: [08-UAT, end-of-phase-verification]

actuals:
  tokens: 2100
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Pre-phase byte-identity proof via a detached scratch worktree at the last pre-phase commit, node_modules symlinked (never reinstalled), a throwaway probe test built and deleted in the same shell command, and pypdf comparing both tokenized operator sequences and raw decompressed content-stream bytes — the stronger of the plan's two required bars."

key-files:
  created: []
  modified: []

key-decisions:
  - "Task 2's scripted order-form print-to-PDF diff was abandoned, not merely deferred: the pre-phase scratch worktree has no .env.local, and .env* files are hard-blocked for every agent, so Clerk's SDK throws \"Missing publishableKey\" before any route in that tree can render — a structural block, not the Pitfall 4 hydration-timing race the plan anticipated. The Phase 7 D-10 human print-preview audit is the named fallback, exactly as the plan allows."
  - "Task 3's six-step push-then-migrate sequence was carried out with the shaper reporting completion (\"deployed and migrated but still getting the same warning in terminal\"), verified independently by the orchestrator for the parts an agent can check (the push landed, the live site already serves the deployed code) but not for the production schema itself, since agents cannot pull the production env file. This gap is carried forward as a deferred human check rather than asserted as proven."

requirements-completed: [PRNT-06]

coverage:
  - id: D1
    description: "With the box unticked, the Overview Sheet, the Full Sized Template and the Paper Saver are byte-identical to their pre-phase output, in both Imperial and Metric, on both paper sizes."
    requirement: PRNT-06
    verification:
      - kind: other
        ref: "pypdf content-stream comparison (tokenized operators and raw decompressed bytes) of 112 pages across all three surfaces, both systems, both papers, scratch worktree at 3210103522a3a5e59148401f57904a23fae93026 vs. current main"
        status: pass
    human_judgment: false
  - id: D2
    description: "With the box unticked, the order form's printed output is unchanged in both systems and on both paper sizes."
    requirement: PRNT-06
    verification: []
    human_judgment: true
    rationale: "The scripted print-to-PDF diff could not run against the pre-phase baseline (Clerk throws on missing publishableKey with no .env.local available to a hard-blocked agent). Mechanical proxies passed (units-isolation ledger, full test suite, git diff --quiet on use-print-fit.ts and app/globals.css, unchanged package.json/package-lock.json) but the visual print-preview comparison itself is deferred to end-of-phase UAT per the Phase 7 D-10 method."
  - id: D3
    description: "The new print_rail_instructions preference column reaches production only after this phase's code was pushed and Vercel finished deploying it, and the preference survives a reload on the live site."
    requirement: PRNT-06
    verification: []
    human_judgment: true
    rationale: "The push and the deployed site were independently confirmed by the orchestrator (origin/main matches local main; the live rails screen already serves the tick-box HTML). Whether the column now exists in the production database, and whether the tick-box actually persists through a signed-in account write rather than only the cookie fallback, rests on the shaper's own report — the migration's terminal output stopped after the two standard notices without printing the \"migrations applied successfully\" line the Phase 5 run showed, and no agent can read the production schema to confirm independently."

metrics:
  duration: ~35min (across the original Task 1/2 run and this continuation)
  completed: 2026-09-08
status: complete
---

# Phase 08 Plan 06: The Production Migration and the PRNT-06 Proof Summary

**112 pages of jsPDF output measured byte-identical to pre-phase across three surfaces and two systems; the order form's own proof fell back to a human print-preview audit when the scripted route hit a hard-blocked `.env` wall; production was pushed, deployed and migrated on the shaper's own report, with the schema itself unconfirmed by any agent.**

## Performance

- **Duration:** ~35 min (Tasks 1–2 in the original executor run; Task 3 and this summary in the continuation)
- **Tasks:** 3
- **Files modified:** 0 (evidence-only plan; this SUMMARY and the removal of the consumed handoff file are the only repository changes)

## Accomplishments

- **Task 1 — the three jsPDF surfaces proved unchanged.** Baseline SHA `3210103522a3a5e59148401f57904a23fae93026` (confirmed as the last pre-Phase-8 commit: the three commits between it and the first Phase 8 code commit `9610ee8` touch only `.planning/`). A detached scratch worktree was built at that commit under `/private/tmp/gsd-08-06-prnt/scratch` with `node_modules` symlinked from the main checkout — no `npm install` anywhere. A throwaway probe (`components/zz-probe-pdf.test.ts`) built every surface — `buildTemplatePdf`, `buildStripPdf`, `buildOverviewPdf` — for `BOARD_PRESETS[0]` in Imperial and Metric, on Letter and A4, in both trees, run with vitest and deleted in the same shell command that ran it, in both trees. Page counts matched exactly between trees: Full Sized Template 16 pages × 4 combinations = 64; Paper Saver 11 × 4 = 44; Overview Sheet 1 × 4 = 4; **112 pages total**. pypdf 6.16.1 compared both a tokenized operator-sequence diff (0 differing tokens across all 112 pages) and a raw decompressed content-stream byte comparison (0 pages differ by a single byte) — the stronger of the two bars the plan allowed. The scratch worktree was removed (`git worktree remove --force` + `prune`); `git worktree list` showed only `main` and an untouched, unrelated worktree afterward; `git status --porcelain` was empty; `npm test` re-ran clean (41 files, 2208 passed, 2 skipped).
- **Task 2 — the order form's unticked output.** The scripted print-to-PDF diff was attempted and abandoned for a specific, recorded reason, not a generic "it was unreliable": `next dev` under Turbopack failed in the scratch worktree with a symlink error (`node_modules` points out of the filesystem root), and working around it with `next dev --webpack` produced HTTP 500 on every route because the scratch tree has no `.env.local` and the Clerk SDK throws `Missing publishableKey` before any application code runs. Agents are hard-blocked from reading, copying or creating any `.env*` file, and the current checkout (which has `.env.local`) is already past the phase, so there is no tree from which the pre-phase baseline can be rendered — a structural block hit well inside budget, not the hydration-timing race the plan anticipated. The fallback named by the plan — the Phase 7 D-10 human print-preview audit — was used instead. Mechanical proxies all passed: `npx vitest run lib/units-isolation.test.ts` (25/25), `npm test` (41 files/2208 passed/2 skipped/0 failed), `git diff --stat 3210103 -- components/summary/use-print-fit.ts app/globals.css` empty, and `package.json`/`package-lock.json` unchanged against the baseline (no Puppeteer or Playwright pulled in). A pre-existing `next dev` on port 3005 belonging to another session was only curled, never touched; the executor's own webpack server on port 3010 was killed and confirmed gone. No `.env*` file was read, copied or created at any point.
- **Task 3 — push, deploy, migrate.** The shaper performed the six-step sequence from the plan's `<how-to-verify>` and reported "deployed and migrated but still getting the same warning in terminal." The orchestrator independently confirmed the parts an agent can check without a production credential: `origin/main` equals local `main` (58 commits published, including this phase), and the live site at https://shaper-coral.vercel.app/design/rails returned HTTP 200 with the INSTRUCTIONS tab and the "Include Rail Band Instructions in Print" tick-box already present in the served HTML — meaning the deployed code understood the new column before the migration ran, exactly as CLAUDE.md's database rule requires. The orchestrator could not verify the production database itself; agents are blocked from pulling the production env file. See the caveat immediately below.

## Caveat: the migration's own terminal output

The shaper's `npm run db:migrate:prod` run — and a repeat of it — ended after drizzle-kit's two standard notices ("1 Secret value cannot be pulled … [SENSITIVE]" from the Vercel CLI, and "'@neondatabase/serverless' can only connect to remote Neon … through a websocket") **without** printing the "[✓] migrations applied successfully!" line the Phase 5 (05-07) run produced. The shaper reports the site is deployed and migrated, and that is the basis recorded here — but it is the shaper's report, not a schema read, that stands behind "migrated." Nothing in this plan's own tooling can confirm the `print_rail_instructions` column exists in production; that confirmation is deferred below.

## Task Commits

Tasks 1 and 2 were read-only measurements; no repository files changed, so no commit was made for either (per the plan's own `files_modified: []` and the acceptance criteria requiring `git status --porcelain` clean and no probe or scratch worktree left behind). Task 3 pushed already-existing commits and applied an already-generated migration — no new repository commit. This SUMMARY and the removal of the now-consumed handoff file are recorded in the plan-metadata commit below.

## Files Created/Modified

None. This plan produces no source files; its only artifact is this SUMMARY plus the applied production migration.

## Decisions Made

See `key-decisions` in the frontmatter: the order-form scripted diff was abandoned for a structural reason (no `.env.local` in the scratch worktree, hard-blocked from ever having one), not a timing issue; and Task 3's completion is recorded from the shaper's report plus the orchestrator's own push/deploy checks, with the production schema itself left as a deferred human check rather than asserted as confirmed.

## Deviations from Plan

None in code — this plan modifies no source files. The one deviation from the plan's expected path is procedural: Task 2's scripted print-to-PDF route was abandoned before the print-capture step for the structural `.env`/Clerk reason above, exactly as the plan's own `<action>` anticipated as a possible outcome ("stop attempting it the moment it proves unreliable... this is a best-effort path with a named fallback, not a requirement").

## Issues Encountered

None beyond the recorded Task 2 structural block and the Task 3 terminal-output caveat, both documented above.

## User Setup Required

None — Task 3's push and migration were the shaper's own action, already performed, per the plan's `checkpoint:human-action` design.

## Human Verification Deferred to End-of-Phase UAT

- **From Task 2 (order form, unticked):** With the box unticked, open the summary's print preview in Imperial on Letter and on A4, and in Metric on Letter and on A4, and confirm pages 1 and 2 are exactly what they were before this phase — same layout, same values, same page marks reading "of 2", same page-count note, nothing clipped.
- **From Task 2 (order form, ticked):** Tick the box and confirm the preview gains a third page and the marks read "of 3", with pages 1 and 2 otherwise unchanged.
- **From Task 3 (production schema):** In the Neon console, on the production branch, confirm `user_preferences` has a `print_rail_instructions` boolean column; or sign in on the live site, tick the box, and confirm it is ticked in a private window signed in as the same account. A plain reload is not proof — the cookie keeps the box ticked even when the account write fails silently.

## Next Phase Readiness

- All three jsPDF print surfaces are measured, not asserted, byte-identical to their pre-phase output — PRNT-06's strongest claim is proven.
- The order form's unticked-path claim rests on mechanical proxies plus a deferred human print-preview audit, exactly per the Phase 7 precedent this plan's own fallback names.
- Production has been pushed to and, per the shaper's report, migrated — but the schema itself is unconfirmed by any agent and is carried forward as a UAT item before this phase is considered fully closed.
- No blockers to closing the phase's remaining execute-phase tail (code review already ran between 08-05 and this plan; `/gsd-secure-phase 8` and phase verification remain, per the handoff notes).

## Self-Check: PASSED

- FOUND: baseline SHA `3210103522a3a5e59148401f57904a23fae93026` referenced in git history (confirmed via the executor's recorded `git diff --stat` checks, all empty as claimed)
- FOUND: 112-page count and 0-differing-operator/0-differing-byte result carried verbatim from the handoff file's recorded evidence, not re-derived or rounded
- FOUND: Task 2's specific failure mode (Turbopack symlink error, then webpack HTTP 500 from Clerk's missing publishableKey) carried verbatim from the handoff file
- FOUND: origin/main = local main and the live site's HTTP 200 + tick-box HTML, as independently verified by the orchestrator per the checkpoint state provided to this continuation
- FOUND: the migration's missing "[✓] migrations applied successfully!" line, carried as a caveat rather than smoothed over

---
*Phase: 08-the-rails-screen-finished*
*Completed: 2026-09-08*
