---
phase: 14-realistic-surfboard-flow
plan: 18
subsystem: go-live 2 — the tips on the live site
status: complete
tags: [go-live, tips-step, D-15, D-16, D-17, D-18, D-20, D-28, R6, R7, R8, R9, founder-checkpoint]
requires:
  - "14-07: go-live 1 (CURVES_TIP adffc5d, merge b3c2d9a)"
  - "14-08 to 14-17: the whole tips step, merged on surfboard-flow"
  - "The code review (14-REVIEW.md) and its fixes (14-REVIEW-FIX.md)"
provides:
  - "The steady taper and the Thinning Starts controls live on www.shaperassistant.com (Vercel production deployment shaper-ainecs434, Ready, 41 s build)"
  - "TIPS_TIP = 50eea48020a3955f6b535c5928cb45a2c6c18fb4; merge commit 9468fd556d77738e9c9c8811f5c6eda2c4bc08ec on main (origin/main^2 is TIPS_TIP)"
  - "The founder's read-only tips report on the 10 real saved boards, read back and recorded here"
  - "Before-and-after pictures in pictures/go-live-2/"
affects: [phase-13-item-13]
tech-stack:
  added: []
  patterns:
    - "A go-live is a founder checkpoint: full gate on the main checkout, a code review with its fixes, the founder's read-only production report, pictures, then a --no-ff merge of one named commit and a push"
key-files:
  created:
    - .planning/phases/14-realistic-surfboard-flow/pictures/go-live-2/ (the new screens on the fixture board, the taper against the old blend, the mark and DATASHEET in two themes, the thin-board corner)
    - .planning/todos/pending/2026-10-02-decide-what-happens-when-a-thin-boards-tip-sits-below-its-center.md
    - .planning/todos/pending/2026-10-02-give-every-slider-a-spoken-name.md
  modified: []
decisions:
  - "D-15: pushed only on the founder's explicit \"go\" (2026-10-02, 23:38 PDT), after the full gate, the report and the pictures."
  - "D-16: the cut line was not needed — the tips were proven and shipped on Friday 2026-10-02, four days ahead of Tuesday evening."
  - "The founder's ruling at this checkpoint: a very thin board whose tail ends below its own center (one blank, centers of 1 1/4\" and under) is left as built for the showing; the rule is decided after the 10th (todo filed)."
  - "The review's two warnings were fixed before the push (the two Thinning Starts sliders carry spoken names and values; Remove This Blank no longer leaves a board drawn off its own rocker numbers); its eight notes are closed."
metrics:
  duration: "about 1 h 15 min from the last wave's merge to the push, including the review, its fixes and two full browser runs"
  completed: 2026-10-02
  tasks: 2
  files: 0 in the repo's code; pictures and two todos under .planning
actuals:
  tokens: 0
  tasks: 2
  commits: 1 merge commit on main
---

# Phase 14 Plan 18: Go-live 2 — the tips are live. Summary

**Each tip now runs down steadily from where its thinning starts, on the live site.** The steady taper, the Automatic start and the two Thinning Starts controls are on www.shaperassistant.com since the production deployment `shaper-ainecs434` (Ready, 2026-10-02). Both steps of the phase are live; the Tuesday cut line (D-16) was not needed.

## What this means for a shaper

- A board cut from a blank is never thinner on the way to a tip than the tip itself. Each tip's thickness runs down along one smooth curve from its start to the tip setting. The start is 12" for most boards; where a board cannot run down steadily from there, Automatic starts it further in.
- On ROCKER, THICKNESS ends with **Nose Thinning Starts** and **Tail Thinning Starts**: a slider from 6" to the board's center with an Automatic button each. A faint dashed line marks each start on the drawing; the DATASHEET has a THINNING STARTS row; the printed order form's Planing box says where each tip's thinning starts.
- A start set too close to its tip is drawn as set and says where the board is thinnest and where Automatic would start instead.
- A thin board in a thick blank is no longer refused as "too thick for this center" (D-20): the default 6'0" board at a 1" center goes from 120 blanks fitting and 23 refused to 142 fitting and 1 refused.
- The preset cards read **29.6, 35.3, 50.4 and 75.3 L** (from 29.5, 35.1, 50.3, 75.3). No preset station number moves: all eight tips start at 12". With a start at 12" every board's five thicknesses and five rocker numbers are exactly what they were.
- Nothing is said on screen about the change (D-19), and nothing in the database changed (D-06, D-24).

## The founder's read-only tips report on the real saved boards (D-18)

Run in the founder's own terminal from the main checkout at TIPS_TIP (`npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --tips-report; rm -f .env.production.pull`; the temporary file was confirmed gone afterwards):

```
saved boards: 10 (v1 7, v2 0, v3 1, v4 0, v5 2); open: 10 of 10
Phase 11 boards with a blank: 0; five station thicknesses kept: 0 of 0
carried boards that no longer fit where they sit: 0 of 0
Boards in a blank, the 12" blend → the steady taper: 2 boards compared (2 with a blank both ways)
  largest move of any station number: 0.000"; boards moving more than 1/16": 0; more than 1/32": 0
  litres change: median 0.39%, largest 0.41%; boards moving more than 1%: 0
  fit verdicts: fits before, refused now: 0; refused before, fits now: 0
  tips: boards with a thinning start further in than 12": 0 of 2 with a blank
  largest rise of a 12" thickness: 0.000"
Hand-set boards, the 12" blend → the steady taper: 8 boards compared (0 with a blank both ways)
  largest move of any station number: 0.000"; boards moving more than 1/16": 0; more than 1/32": 0
  litres change: median 0.00%, largest 0.00%; boards moving more than 1%: 0
  fit verdicts: fits before, refused now: 0; refused before, fits now: 0
```

Read back to the founder: all 10 saved boards open; the 2 boards in a blank keep every station number and gain 0.4% in litres, both with their tips still starting at 12"; the 8 hand-set boards do not change; no fit verdict changes.

## The pictures the founder decided from (D-15)

In `pictures/go-live-2/`, all from the branch's own dev server and the app's own maths:

- `rocker-fixture-screen.png`, `rows-automatic.png`, `rows-tail-by-hand-too-close.png`: ROCKER with the fixture board (a 10'0" board on the Arctic Foam 10'9" LB slid to the tail end, D-27) — the rows on Automatic (nose 12", tail 26") and the tail set by hand to 12" with its too-close sentence.
- `datasheet-fixture.png`, `order-form-planing-fixture.png`: the THINNING STARTS row and the printed line ("Thinning starts from the tip: nose 12", tail 26".").
- `fixture-tail-taper.svg`: the fixture board's tail, the 12" blend against the steady taper — the blend dips to 0.48" some 9 1/2" from the tip, under the 5/8" tip; the taper never does.
- `iphone-*-tail-mark-zoom.png`, `desktop-daylight-drawing.png`, `*-datasheet.png`: the mark and the DATASHEET block in two themes (from 14-15).
- `thin-board-*.png`: the one corner shown for a decision — a 1 1/4" center on the Arctic Foam 7'9" SBF fits and reads −3/16" tail rocker.

The figures came from `scripts/phase14-before-after.ts --step tips` (14-17's SUMMARY has the full print-out): the stress set's thin spots 82 → 0, boards thicker toward a tip 181 → 12 (all on the US Blanks 9'9"B, D-14), none newly refused, ten more fitting.

## What the founder ruled at the checkpoint

- **The thin-board corner is left for the showing.** Measured (`scratchpad/orch14/reverse-rocker.ts`): on the default 6'0" board only the Arctic Foam 7'9" SBF leaves a station rocker below 0, and only at 1" and 1 1/4" centers; from 1 1/2" up none; none of the 1,635 stress boards; never under Tip Style Bottom. The decision on a rule is a pending todo for after the 10th.
- Shown for the founder's eye, no change asked: the mark is hard to pick out on a computer at a 12" start (the design predicted it), and the printed line wraps after "nose" on the two narrowest phone print widths.

## The gate before the ask

On the main checkout at the final code (`884a315`; the commits after it are documents only):

- `npm run build` ✓; `npx vitest run` 103 files / 3,882 passed / 2 skipped ✓; `npx tsc --noEmit` ✓; `npm run lint` ✓.
- The full `npm run test:e2e` on port 3150: **623 passed, 0 failed, 400 skipped**. (An earlier run on the pre-fix code was void: its dev server stopped answering after 248 clean passes; the specs it would have run next passed on a fresh server in the fixer's own verification, 137 of 137.)
- `git diff --stat ed39f4a TIPS_TIP -- drizzle lib/db/schema.ts package.json package-lock.json` is empty; `git diff --stat CURVES_TIP TIPS_TIP -- e2e/desktop-baseline.spec.ts-snapshots` is empty.
- The code review (`14-REVIEW.md`, 49 files): 0 critical, 2 warnings, 8 info; all eight findings in scope fixed one commit each (`14-REVIEW-FIX.md`).

## The push (D-15, D-28)

On the founder's "go": `git fetch origin`; `main` equalled `origin/main` (`b3c2d9a`, go-live 1); in a temporary worktree of `main`, `git merge --no-ff -F <message> 50eea48` and `git push origin main` → `b3c2d9a..9468fd5`. `git rev-parse origin/main^2` = TIPS_TIP. The deployment of `9468fd5` (`shaper-ainecs434-cpktoes1.vercel.app`) is Ready and the newest production deployment. On the live site: the four cards read 29.6 / 35.3 / 50.4 / 75.3 L, and ROCKER with US Blanks 6'2"A picked shows `Nose Thinning Starts — 12"` and `Tail Thinning Starts — 12"`, both Automatic buttons and the new THICKNESS opening line.

**Rollback:** Vercel's previous deployment is go-live 1's (`shaper-cz135jsz9`, merge `b3c2d9a`), whose reader was proven at 14-05 to drop a stored start and open the board on Automatic.

## The rehearsal walk (D-17)

The last change is live as of Friday 2026-10-02 evening, so the founder's one rehearsal walk (Phase 13 item 13, `13-UAT.md`) is **due now**, on the site exactly as the shapers will see it, any day before the freeze on Wednesday 2026-10-07 evening. Two things to look at on a real phone during it, held out from the automated checks: how the blank list feels while Automatic works at every placement, and the two ends of a Thinning Starts slider in Metric.

## Follow-ups recorded

- `.planning/todos/pending/2026-10-02-decide-what-happens-when-a-thin-boards-tip-sits-below-its-center.md`
- `.planning/todos/pending/2026-10-02-give-every-slider-a-spoken-name.md`
- `.planning/todos/pending/2026-10-03-retire-todays-curve-and-12-inch-blend-after-the-showing.md` (from 14-10)
- `.planning/todos/pending/2026-10-02-tape-check-a-real-arctic-blank-against-the-new-curve.md` (D-08, from 14-07)
- The quick "fits nowhere" refusal's cautious corner (Tip Style Bottom, a Deck tweak over the skin, a hand-set start past 12") is documented in the code and in 14-13's and 14-17's summaries.

## Deviations from Plan

- The plan's report command used `bash -c 'trap … EXIT; …'`; the terminal tool refuses `trap`, so the same command ran with a trailing `rm -f`, as at go-live 1.
- A code review and its fix pass ran between the last code wave and this checkpoint (the workflow's code-review gate, placed before the ship step as on Phases 11 and 12). TIPS_TIP therefore includes the eight fix commits.
- No `.continue-here.md` was written: the founder was present and the checkpoint resolved in the same session.

## Known Stubs

None.

## Threat Flags

None. The production credentials were pulled to a temporary file in the founder's own terminal and removed; the orchestrator never read them. The report printed counts only. No database change shipped.

## Self-Check: PASSED

- origin/main^2 equals TIPS_TIP ✓; the deployment is Ready ✓; the live cards read the recorded litres ✓; ROCKER shows both rows with a blank ✓; the database, packages and desktop baselines are unchanged ✓; pictures in `pictures/go-live-2/` ✓.
