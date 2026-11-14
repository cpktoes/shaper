---
phase: 15-the-board-rack
plan: 13
subsystem: go-live — the Board Rack on www.shaperassistant.com
tags: [board-rack, go-live, production, migration, vercel, D-10, D-13, D-14, D-15]
status: complete
requires:
  - 15-01 to 15-12 merged on `board-rack`, plus the code review's fixes (c58a5b0) and the founder's device ruling (15-10, keep)
provides:
  - the Board Rack live for every shaper, shipped in one push (D-10) after the live database received its empty `rack_order` column with the founder present (CLAUDE.md Database, additive first)
  - the read-only check of every real saved board (D-13) and the live check of the home page, both recorded here
  - the founder's rehearsal walk (D-14) handed over on the live site
affects:
  - the phase's verification (next: /gsd-verify-work 15) and the Phase 13 rehearsal walk before the Wed 2026-10-07 freeze
tech-stack:
  added: []
  patterns:
    - go-live from a temporary worktree of `main` (fetch, `--ff-only origin/main`, `merge --no-ff -F <message> RACK_TIP`, push, remove), with `origin/main^2 == RACK_TIP` as the proof
    - the live check by a real Chromium against the live domain from a scratch Playwright config with no dev server, when the Browser pane is hidden
key-files:
  created: []
  modified: []
decisions:
  - "RACK_TIP is the branch tip at the moment of merging (d955b04), docs commits included, so the shipped history carries the go-live's own evidence; its code is identical to the commit the gate ran on (8416c23), checked with `git diff --quiet … -- . ':!.planning/'`"
  - "main's ten newer commits held trees identical to the branch's base (each quick task squash-merged by the app while the branch was built on the same changes), so main's history was folded into the branch first (e83ff4a, no file changes) and the go-live was one clean --no-ff merge"
metrics:
  duration: ~1 h 20 min from the gate's start to the live check (07:35 – 08:52 PDT, 2026-10-06), the founder present from 08:08
  completed: 2026-10-06
  tasks: 3
  files: 0
---

# Plan 15-13 — The Board Rack goes live

## What shipped

**Merge commit `c417257bbd3580809768bac1bfa5d28e5717856f` on `main`**, pushed 08:30 PDT on Tuesday 2026-10-06 —
`RACK_TIP = d955b0407327eed504d3924ef58ac85ef2d88ce8` (`git rev-parse origin/main^2` equals it). Vercel built it in
46 seconds: production deployment **`shaper-fi967okof-cpktoes1.vercel.app`, Ready at 08:45 PDT**, serving
www.shaperassistant.com. The day before the Wednesday-evening freeze, as the brief required.

What every shaper now has on the home page: their saved boards standing sideways on one rack at one true scale,
each with its rocker, its name and dims running up beside it and height lines behind; on a computer the board under
the cursor turns to show its outline, on a phone or iPad the board in the middle turns as they swipe; a drag, ⋯ →
Move left / Move right, Alt + arrow, or a hold-and-slide on a phone sets the order, which saves to their account and
follows them between devices; the unsaved board always first, a new board first, a copy beside its original. Nothing
on screen announces the change (D-15).

## Task 1 — the gate, the pictures, the founder's read-only check

The gate ran on `8416c23` (code-identical to `RACK_TIP`): boundary diff against `origin/main`'s merge-base over the
five design screens, the preset cards and the package list printed nothing; no stray scratch files; `npx tsc --noEmit`
clean; `npm run lint` clean; `npx vitest run` 115 files / **4,375 passed**; `npm run test:e2e:prod` (production build
+ prod specs) **18 passed** — `/test-rack` answers 404 in a real build; full `npm run test:e2e` **829 passed / 0
failed** (30.3 min).

After pictures (committed a760e33, in `pictures/`): `after-desktop-1440x900-15-boards.png` — **all 15 boards on the
first screen, no scrolling to Shape a New Board** (before: 4 boards and 1,323 dots); the same in Metric (height lines
every 50 cm) and in the Slate theme; `after-desktop-1440x900-30-boards.png` (two rows of 15 at one scale);
`after-desktop-1440x900-mid-turn.png`; `after-iphone-390x664-15-boards.png` — **Shape a New Board on the first
screen** (before: 6,590 dots of scrolling).

The founder ran the read-only command in their own terminal (08:10 PDT). Their output:
`saved boards: 10 (v1 6, v2 0, v3 1, v4 0, v5 3); open: 10 of 10` · `Phase 11 boards with a blank: 0` ·
`saved boards: 10; the rack can draw: 10 of 10` · `accounts with saved boards: 3; boards per account: 5, 4, 1` ·
`boards the rack would leave out: none` · `… rack_order missing (4 of 5 columns)` · `drizzle migrations recorded: 9`.
Read back beside the pictures; the founder chose **Go** (08:14 PDT).

## Task 2 — the live database first, the founder present

The founder ran `npm run db:migrate:prod` (migration `0009_rack_order`: `ALTER TABLE "user_preferences" ADD COLUMN
"rack_order" text;`) and the after-check: **`rack_order text (5 of 5 columns)`, `drizzle migrations recorded: 10`**
(one more than before); `ls -a | grep -c '^\.env\.production'` printed `0`. They typed "migrated" (08:25 PDT). The live
site kept working throughout — the deployed code never named the column.

## Task 3 — one push, the live check, the walk

`git fetch origin`; a temporary worktree of `main` fast-forwarded to `origin/main` (still `ba08033`); the dry-run merge
clean; `git merge --no-ff -F <message> RACK_TIP`; `git push origin main` (`ba08033..c417257`); the worktree removed;
`origin/main^2 == RACK_TIP` verified. Then `npx --no-install vercel ls --prod --yes --meta githubCommitSha=c417257…`
watched until `● Ready` (08:45:42 PDT).

**Live check (08:52 PDT, real Chromium against www.shaperassistant.com at 1440 × 900, signed out):**
- A visitor sees the four preset cards (the Longboard reading 73.9 L), the `Shape a New Board` heading, no rack, no
  error, nothing announcing a change.
- Start Shaping on the Shortboard, then home by the wordmark (a client-side click): the **`Board Rack`** heading,
  **`1 board · point to turn, drag to move`**, one board on the rack, **turned (`data-turn="90"`)**, its caption with
  **`Continue This Board`** and `IN PROGRESS — NOT SAVED`; the hover rack on a mouse (`data-rack-kind="hover"`); no
  notice or "what's new" anywhere (D-15). Pictures: `pictures/live-2026-10-06/live-visitor-home.png` and
  `live-home-with-rack.png`.
- The Browser pane was hidden at the time (it cannot take clicks while hidden), so the check ran from a scratch
  Playwright config with no dev server — the same real Chromium, the live domain.

**Handed to the founder (D-14):** the rehearsal walk in `.planning/phases/13-ready-for-the-shapers/13-UAT.md` (18
steps, step 13 the Board Rack, "Phase 15's looks" A–D) and the printed sheet `13-walk-sheet.pdf` (issue 3, four Letter
pages), to walk on the live site with their own boards before the freeze — plus the three signed-in checks no test can
make (from the code review's fix log): move a board, open one, Back keeps the moved order on the real home page; a
duplicate lands beside its original even right after a move; focus lands on the next board after a delete.

## Deviations

- The Browser pane could not be used for the live check (hidden pane, no frames); a real Chromium against the live
  domain stood in. Nothing about what was checked changed.
- The founder answered the checkpoints in their own words and pastes rather than the plan's literal "migrated"
  (they typed it after the paste) — recorded verbatim above.
- The walk sheet gained two corrections before the push (the Longboard's 73.9 L; App Default Settings named in
  step 14), found by 15-12 and applied by the orchestrator (commit `docs(13): …`).

## Self-Check: PASSED

- `git rev-parse origin/main^2` = `d955b0407327eed504d3924ef58ac85ef2d88ce8` = RACK_TIP.
- Deployment `shaper-fi967okof` for `c417257` is Ready; the live home page shows the Board Rack after a preset
  round trip, with no error or notice.
- The founder's pasted outputs read `the rack can draw: 10 of 10`, `boards the rack would leave out: none`,
  `rack_order missing (4 of 5 columns)` before and `rack_order text (5 of 5 columns)` after, with 9 → 10 migrations.
- Nothing was pushed before the founder's "go" and "migrated"; no production env file remains.
