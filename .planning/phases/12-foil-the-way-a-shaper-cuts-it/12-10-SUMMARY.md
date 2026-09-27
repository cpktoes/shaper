---
phase: 12-foil-the-way-a-shaper-cuts-it
plan: 10
subsystem: production
tags: [database, migration, deploy, vercel, neon]
requires: [12-02, 12-06]
provides: [production carrying migration 0006; Phase 12 live on www.shaperassistant.com]
affects: []
tech-stack:
  added: []
  patterns: [expand-first migration — additive columns to production BEFORE the deploy]
key-files:
  created: []
  modified: []
key-decisions:
  - "Migrate production first, then merge and deploy (CLAUDE.md Database, amended 2026-09-26): the old site never names the three new columns, so adding them was harmless, and the new site found them in place."
  - "The retired extra_center_thickness_mm column stays until a separate quick task after this deploy (D-19)."
patterns-established: []
requirements-completed: [R9, R11]
duration: founder's step, run 2026-09-27 with the orchestrator driving the terminal
completed: 2026-09-27
---

# Phase 12 Plan 10: Production migrated first, then the phase merged, deployed and walked live

**The live site now cuts boards the way a planer does, and the live database carried the three new settings columns before the code that uses them arrived.**

## What happened, in order

1. **`npm run db:migrate:prod`** (the founder's terminal, from the main checkout on `foil-real-shaping`): Vercel pulled the production settings to a temporary file, drizzle applied the pending migration and printed `migrations applied successfully!`, and the trap removed the file.
2. **Read-only proof on production**, both checks through the same trap-guarded one-liner:
   ```
   user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text (3 of 3 new columns); extra_center_thickness_mm kept
   drizzle migrations recorded: 7
   saved boards: 10 (v1 7, v2 0, v3 2, v4 1, v5 0); open: 10 of 10
   Phase 11 boards with a blank: 1; five station thicknesses kept: 1 of 1
   carried boards that no longer fit where they sit: 0 of 1
   ```
   The pulled settings file was gone afterwards (only `.env.local` present).
3. **Merge and deploy:** `foil-real-shaping` merged into `main` with a no-fast-forward merge commit (`125a90f`, 73 commits) and pushed at 04:48 UTC; Vercel's production deployment was Ready 30 s later (28 s build).
4. **Live ROCKER screen** (orchestrator, built-in browser, signed out): with US Blanks 6'2"A picked, the sidebar shows `Deck Skin — 1/8"`, the readouts headed `OFF BOTTOM`, `Planer passes at the center`, and in THICKNESS `Fine-tune off` and `Tip Style`. Nudging Deck Skin from 1/8" to 1/4" moved the Center’s OFF BOTTOM from 5/16" to 3/16" and the passes from 3 to 2; tapping Tip Style to Bottom moved the Nose Tip rocker 4 3/4" → 4 1/4" and the Tail Tip 2 3/8" → 1 11/16" while Nose @ 12" (1 1/2") and Tail @ 12" (7/8") stayed; the DATASHEET showed `FOAM OFF` with a Deck row (3/4", 1/4", 1/4", 1/4", 15/16") and a Bottom row (3/16" at all five stations).
5. **Fit & Tip Defaults, signed in** (founder): Fit & Tip Defaults showed Planer Max Depth, Deck Skin and Tip Style with no Extra Center Thickness; a Tip Style set to Bottom read Bottom on a second signed-in device; Restore Defaults put it back; an Imperial/Metric flip survived a reload (the CR-01 case). Confirmed by the founder.
6. **An older board from the rack** (founder): an older saved board opened from the rack normally. Confirmed by the founder.

## Deploy notes carried from the code review

- Browser tabs left open from before the update behave oddly until reloaded (Restore Defaults refused quietly; a signed-out tab can overwrite the three new remembered settings) — one reload fixes it (review finding IN-04).
- The D-19 follow-up — dropping `extra_center_thickness_mm` from the schema, deploying, then generating and running the DROP — is a separate quick task, not this run.

## Deviations from Plan

None in substance. The founder chose to see the phase running locally first (port 3005, from the branch) and then asked the orchestrator to drive steps 1–3 from a terminal tab under the founder's own login; steps 5 and 6 need the founder's real account and were the founder's.

## Self-Check: PASSED

- Migration 0006 applied to production before the merge; the read-only checks read 3 of 3, kept, 10 of 10, 1 of 1.
- `main` = `origin/main` = `125a90f`; the production deployment is Ready.
- The five new controls and the FOAM OFF rows are present on the live ROCKER screen.
