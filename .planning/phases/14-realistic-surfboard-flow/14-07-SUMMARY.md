---
phase: 14-realistic-surfboard-flow
plan: 07
subsystem: go-live 1 — the curves on the live site
status: complete
tags: [go-live, curves-step, D-15, D-18, D-28, R8, R9, founder-checkpoint]
requires:
  - "14-01 to 14-06: the whole curves step, merged on surfboard-flow"
  - "14-05: scripts/phase14-before-after.ts --step curves and check-saved-boards.ts --curves-report"
  - "14-06: the preset record and the two re-recorded reference pictures"
provides:
  - "The new curves live on www.shaperassistant.com (Vercel production deployment shaper-cz135jsz9, Ready, 33 s build)"
  - "CURVES_TIP = adffc5d17939c7c7dc5eb7813eb6112dc2072cfb; merge commit b3c2d9afdfa3652b890e1d1bd6ca510c28963731 on main (origin/main^2 is CURVES_TIP)"
  - "The founder's read-only report on the 10 real saved boards, read back and recorded here"
  - "Before-and-after pictures in pictures/go-live-1/"
  - "The D-08 tape-check follow-up as a pending todo"
affects: [14-08, 14-09, 14-10, 14-18]
tech-stack:
  added: []
  patterns:
    - "A go-live is a founder checkpoint: full gate on the main checkout, the founder's read-only production report, before-and-after pictures, then a --no-ff merge of one named commit and a push"
key-files:
  created:
    - .planning/phases/14-realistic-surfboard-flow/pictures/go-live-1/ (rocker/volume before, after and diff; curve and litres close-ups; arctic-9-4-g-curves.svg)
    - .planning/todos/pending/2026-10-02-tape-check-a-real-arctic-blank-against-the-new-curve.md
  modified: []
decisions:
  - "D-15: pushed only on the founder's explicit \"go\" (2026-10-02, after the report and the pictures); the push waited for the full browser suite to be green."
  - "D-28: the commit shipped is CURVES_TIP, the tracking commit after wave 4; it contains no tips code (git grep for slopeAt / tipRule / ThinningStart over non-test files: nothing; lib/geometry has no tip-taper file; components, app, package.json, package-lock.json, drizzle and lib/db/schema.ts are unchanged since ed39f4a)."
  - "The three unpushed docs commits that local main carried (todo captures from 2026-10-01/02) went up with the merge; they change no code."
  - "Browser-suite failures under a load average of 400 (another project's test run shared the machine) were not taken as evidence: the nine failures were re-run alone and all passed (52 + 6 of 58), so the suite is green in full."
metrics:
  duration: "about 1 h 50 min of wall clock, most of it the browser suite under load"
  completed: 2026-10-02
  tasks: 2
  files: 0 in the repo's code; pictures and one todo under .planning
actuals:
  tokens: 0
  tasks: 2
  commits: 1 merge commit on main
---

# Phase 14 Plan 07: Go-live 1 — the curves are live. Summary

**The new curves are on the live site, and only the curves.** Every blank's bottom, thickness and width, and every board without a blank, are drawn by the square-root rule on www.shaperassistant.com since the production deployment `shaper-cz135jsz9` (Ready, 2026-10-02). The tip rule — the 12" blend — is untouched; the tips step follows as go-live 2.

## What this means for a shaper

- The preset cards read **29.5, 35.1, 50.3 and 75.3 L** (from 29.4, 35.0, 50.3, 75.3). Checked on the live site after the deployment: the four cards print exactly those figures.
- The first board a visitor sees reads **30.5 L instead of 30.1**, with the same ten station numbers; only the curve between the stations moved (up to about 1/8").
- A board on a sparse blank (the Arctic Foam 9'4" G example) gains a little volume between its stations (46.3 → 47.6 L) and its five rocker numbers move at most 0.055".
- No board that fitted its blank is refused; four Arctic boards once refused for width now fit. Boards saved under Phase 11 keep their five thicknesses exactly. Nothing is said on screen (D-19).

## The founder's read-only report on the real saved boards (D-18)

Run by the founder in their own terminal from the main checkout at CURVES_TIP (`npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --curves-report; rm -f .env.production.pull` — the `trap` form in the plan is refused by the terminal tool, so the cleanup ran as a trailing `rm`; the temporary file was confirmed gone afterwards):

```
saved boards: 10 (v1 7, v2 0, v3 1, v4 0, v5 2); open: 10 of 10
Phase 11 boards with a blank: 0; five station thicknesses kept: 0 of 0
carried boards that no longer fit where they sit: 0 of 0
Boards in a blank, today's curves → the new curves: 2 boards compared (2 with a blank both ways)
  largest move of any station number: 0"; boards moving more than 1/16": 0; more than 1/32": 0
  litres change: median 0.09%, largest 0.17%; boards moving more than 1%: 0
  fit verdicts: fits before, refused now: 0; refused before, fits now: 0
Hand-set boards, today's curves → the new curves: 8 boards compared (0 with a blank both ways)
  largest move of any station number: 0"; boards moving more than 1/16": 0; more than 1/32": 0
  litres change: median 1.58%, largest 1.88%; boards moving more than 1%: 7
  fit verdicts: fits before, refused now: 0; refused before, fits now: 0
```

Read back to the founder: all 10 saved boards open; none is a Phase 11 board; the 2 boards in a blank move no station number and 0.09–0.17% in litres; the 8 hand-set boards keep their station numbers and rise 1.6–1.9% in litres; no fit verdict changes.

## The pictures the founder decided from (D-15)

In `pictures/go-live-1/`: the ROCKER and VOLUME reference screens of the first board a visitor sees before and after (`rocker-before/after.png`, `volume-before/after.png`, the Playwright difference pictures and close-ups of the curve and the litres), and the Arctic Foam 9'4" G board's bottom and thickness curves, today's against the new (`arctic-9-4-g-curves.svg`, drawn from `scripts/phase14-before-after.ts --step curves --samples`). The preset figures came from the same script's output (14-05's SUMMARY has the full print-out).

The one change on ROCKER besides the curve — the Center Thickness slider's knob about 5 dots further left — comes from quick 260928-j00 (the 1/4" minimum), already live before this phase; it was shown to the founder as such.

## The gate before the ask

On the main checkout at CURVES_TIP: `npm run build` ✓, `npx vitest run` 100 files / 3,719 tests ✓ (an earlier run under load showed 3 timeouts in the heaviest catalogue-wide tests; a clean run and a 120 s-timeout run of those files passed), `npx tsc --noEmit` ✓, `npm run lint` ✓. The full `npm run test:e2e` on port 3150 (another project's suite held 3100 and drove the load average to 400): 576 passed, 9 failed, 399 skipped in 1.6 h; the 9 failures (six `page.goto` connection refusals at the end of the run, two click timeouts in the iPhone rail-key test, one hung DATASHEET test) were re-run alone — `rocker-blanks`, `summary-rail-key`, `undo-redo` and `viewer-toolbar`: 52 passed, 2 failed; `summary-rail-key` again alone: 6 passed. Every failure was load, none an assertion about the curves.

## The push (D-15, D-28)

On the founder's "go" (2026-10-02, after the report and the pictures): `git fetch origin`; in a temporary worktree of `main`, `git merge --no-ff -F <message> adffc5d` and `git push origin main` → `ed39f4a..b3c2d9a`. `git rev-parse origin/main^2` = `adffc5d17939c7c7dc5eb7813eb6112dc2072cfb` (CURVES_TIP). Local `main` equals `origin/main`. The deployment of `b3c2d9a` (`shaper-cz135jsz9-cpktoes1.vercel.app`) is Ready and the newest production deployment; the live Shortboard card reads 29.5 L.

## Follow-ups recorded

- D-08: the tape-measure check on a real Arctic blank — `.planning/todos/pending/2026-10-02-tape-check-a-real-arctic-blank-against-the-new-curve.md`.
- D-17: the rehearsal walk is not due yet; it follows the last change (plan 14-18 says when).

## Deviations from Plan

- The plan's report command used `bash -c 'trap … EXIT; …'`; the terminal tool refuses `trap`, so the same command ran with a trailing `rm -f` instead. Same read, same cleanup, confirmed.
- The founder's "go" was asked for while the browser suite was still running; the push itself waited for the suite to be green, as the plan requires.
- No `.continue-here.md` was written: the founder was present and the checkpoint resolved in the same session.

## Known Stubs

None.

## Threat Flags

None. The production credentials were pulled to a temporary file in the founder's own terminal and removed; the orchestrator never read them. The report printed counts only.

## Self-Check: PASSED

- origin/main^2 equals CURVES_TIP ✓; the deployment is Ready ✓; the live Shortboard card reads the recorded 29.5 L ✓; no tips code on CURVES_TIP ✓; pictures in `pictures/go-live-1/` ✓.
