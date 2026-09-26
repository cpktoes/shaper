---
phase: 11-rocker-from-real-blanks
plan: 13
subsystem: production
tags: [production, migration, seed, deploy, live-checks]
requires: [11-05, 11-06, 11-12]
provides: [production blanks table seeded with 162 blanks, five fit-default columns on production user_preferences, Phase 11 live at www.shaperassistant.com]
affects: []
tech-stack:
  added: []
  patterns: [additive migration before the deploy (CLAUDE.md Database, amended after CR-01), transient production env file deleted by an EXIT trap, read-only proof of the schema before and after the seed]
key-files:
  created: []
  modified: []
key-decisions:
  - "Production migrated and seeded BEFORE the merge and deploy, from the rocker-blanks branch — the expand-first order the founder set after code review CR-01."
  - "The production commands ran in the founder's own Terminal panel (their shell, their Vercel login) rather than the assistant's sandbox; the assistant merged and pushed."
patterns-established:
  - "Prove a production migration read-only, because drizzle-kit prints 'migrations applied successfully!' without naming what it applied: count drizzle.__drizzle_migrations, to_regclass the new table, list information_schema columns, before and after the seed."
  - "Watch a production deploy by polling the live page for a marker the old build never served (here the words 'Center Thickness' on /design/rocker) alongside `npx vercel ls --prod`."
requirements-completed: [R7, R8, R9]
duration: 25min
completed: 2026-09-26
---

# Phase 11 Plan 13: Migrate production, seed the blanks, merge, deploy and check — Summary

**Production carries the blank catalogue and the five preference columns, the Phase 11 code is live at www.shaperassistant.com, and the live ROCKER screen lists real blanks and slides a board along one.**

## Performance

- **Duration:** about 25 minutes from the first production command to the live checks
- **Started:** 2026-09-26 20:40 UTC
- **Completed:** 2026-09-26 21:05 UTC
- **Tasks:** 1 (a blocking-human checkpoint, run with the founder present)
- **Files modified:** 0 in this plan (the merge commit 2d05668 carried the phase)

## Accomplishments

In the order the amended database rule requires — additive changes reach production before the code that uses them:

1. **`npm run db:migrate:prod`** (founder's Terminal, tab "prod migrate"): Vercel CLI 60.1.3 pulled the production settings to a transient file (the usual "1 Secret value cannot be pulled … [SENSITIVE]" note), drizzle-kit reported `migrations applied successfully!`, and the trap removed the file.
2. **Proof, seed, check, proof** (founder's Terminal, tab "prod seed", one trap-guarded command):
   - before the seed: `migrations recorded: 6 (latest 2026-09-26 15:34 UTC)` · `blanks table: blanks` · `user_preferences columns: clerk_user_id, units, created_at, updated_at, print_rail_instructions, extra_length_mm, extra_center_thickness_mm, width_margin_mm, nose_tip_thickness_mm, tail_tip_thickness_mm` · `blanks rows: 0`
   - seed: `blanks: 162 (US Blanks 101, Arctic Foam 33, Marko Foam 28); pickable: 158` · `matching the catalogue CSVs exactly: 162 of 162`
   - `--check` (read-only): the same two lines
   - after the seed: the same schema lines and `blanks rows: 162`
   - the pulled file was gone afterwards (only `.env.local` remains in the project folder)
3. **Merge and deploy:** `rocker-blanks` merged into `main` with a merge commit (2d05668, 150 files, 103 commits) and pushed; Vercel's production deployment `shaper-1fxpecnkh` built in 37 s and went Ready; the live ROCKER page served the new build 80 s after the push.
4. **Live check 4 — www.shaperassistant.com/design/rocker:** the blank list loads with no "The blank catalog didn't load." banner and no console errors; the served page carries all three catalogues (US Blanks, Arctic Foam, Marko Foam); picking "Marko Foam 6'4\" TP" drew the board inside the blank with the placement reading "centered" and the rocker chips at the blank's own numbers (nose tip 4 9/16", tail tip 2 1/4"); four nudges of the placement control read "1/4\" toward tail" and moved the nose tip to 4 7/16" while the foil chips kept the tip settings.
5. **Live check 5 — Fit & Tip Defaults follow the account on the live site:** passed — the founder set Extra Length to 3" signed in on the live site, saw 3" on a second browser/device, restored the defaults, and the pick survived an Imperial/Metric flip and a reload (confirmed 2026-09-26: "Both pass").
6. **Live check 6 — a board saved before Phase 11 opens from the rack unchanged:** passed — the founder opened one of his own boards saved before this phase from the rack on the live site; it looked as it did, with hand-set rocker and no blank picked (confirmed 2026-09-26: "Both pass").

## Task Commits

No repository files changed in this plan. The production work is recorded by the merge commit `2d05668` ("Merge branch 'rocker-blanks': Phase 11, Rocker from Real Blanks") and this summary.

## Files Created/Modified

None.

## Decisions Made

- The expand-first order held: migrate and seed first, then merge and deploy, so the deployed Imperial/Metric and print saves never met a schema they did not know.
- The two production-touching commands ran in the founder's own Terminal panel; the temporary read-only proof script lived in `scripts/` only for the duration and was removed before the merge.

## Deviations from Plan

None in substance. The proof script (not in the plan) was added because drizzle does not name what it applied; it printed counts and column names only, never a connection string.

## Issues Encountered

- npx asked, in the founder's terminal, to install `vercel@60.1.3` before the first pull; the founder answered `y`. The CLI is now cached, so later pulls ran without a prompt.

## Threat Flags

None new. T-11-37 (the pulled production file is trap-deleted; only `.env.local` remains), T-11-38 (additive migration before the deploy) and T-11-39 (the same idempotent, parameterised upsert; `--check` read-only) were each exercised as written.

## Next Phase Readiness

Phase 11 is live. Three follow-ups are filed under `.planning/todos/pending/` (manufacturer tick-boxes, a smoother drawn curve without changing the numbers, and the foil-from-real-shaping model).

---
*Phase: 11-rocker-from-real-blanks*
*Completed: 2026-09-26*
