---
phase: quick-260927-pij
plan: 01
subsystem: housekeeping
tags: [gitignore, git-branches, worktrees, lint, debug-sessions, todos, windows-ledger]
requires: []
provides:
  - "A clean git workspace: only `main` locally, only the main checkout in `git worktree list`,
    `.claude/worktrees/` empty."
  - "Zero lint warnings, with the golden fixtures proved byte-identical and the full unit suite
    green."
  - "A pre-close scanner that reports the real backlog (0 debug sessions, 0 quick tasks, 9 todos)
    instead of 17 stale entries."
affects:
  - components/rails/rail-plan-side-figure.tsx
  - components/viewer/drag-spacing.test.ts
  - lib/geometry/outline.test.ts
  - scripts/extract-prototype-fins-golden.mjs
  - scripts/extract-prototype-golden.mjs
  - scripts/extract-prototype-rails-golden.mjs
  - scripts/extract-prototype-volume-golden.mjs
  - .gitignore
  - public/
  - .planning/debug/
  - .planning/quick/
  - .planning/WINDOWS.md
  - .planning/todos/
decisions:
  - "Closed WINDOWS entry 1 as `fixed` (not `waived`) — Phase 1's own UAT (01-UAT.md, tests 1-3,
    16:20-16:46 the same afternoon) ran exactly the three checks the entry said were missing, and
    all three passed."
  - "Closed WINDOWS entry 2 as `waived`, reason `superseded` — the 260830-2dy browser pass was
    never run as a pass of its own, but later real-phone walks (10-SWEEP-2 rows 6/9, 11-UAT test 4)
    covered the same ground."
key-files:
  created:
    - .planning/debug/resolved/fin-placement-numbers-in-cm.md
    - .planning/debug/resolved/keyboard-focus-invisible-on-sliders.md
    - .planning/debug/resolved/metric-axis-labels-instructions-card.md
    - .planning/debug/resolved/order-form-letter-blank-pages.md
    - .planning/debug/resolved/phone-print-button-does-nothing.md
    - .planning/debug/resolved/typed-length-box-too-narrow.md
    - .planning/debug/resolved/view-full-sized-print-offset.md
  modified:
    - components/rails/rail-plan-side-figure.tsx
    - components/viewer/drag-spacing.test.ts
    - lib/geometry/outline.test.ts
    - scripts/extract-prototype-fins-golden.mjs
    - scripts/extract-prototype-golden.mjs
    - scripts/extract-prototype-rails-golden.mjs
    - scripts/extract-prototype-volume-golden.mjs
    - .gitignore
    - .planning/quick/260910-2ny-size-each-order-form-sheet-to-the-real-p/260910-2ny-SUMMARY.md
    - .planning/quick/260910-jfp-print-a-key-beside-the-rail-plan-side-dr/260910-jfp-SUMMARY.md
    - .planning/quick/260910-kz2-stop-the-rail-instructions-sheet-clippin/260910-kz2-SUMMARY.md
    - .planning/quick/260914-rj0-the-rear-fin-and-centre-fin-heights-on-t/260914-rj0-SUMMARY.md
    - .planning/WINDOWS.md
    - .planning/todos/completed/2026-08-19-mobile-phone-width-layout-polish.md (moved from pending/)
  deleted:
    - public/file.svg
    - public/globe.svg
    - public/next.svg
    - public/vercel.svg
    - public/window.svg
metrics:
  duration: "~1 session"
  completed: 2026-09-28
status: complete
actuals:
  tokens: 9836
  tasks: 3
  commits: 4
---

# Phase 13 Plan 1: Housekeeping — Clear the Mess Summary

**The project was tidied — old finished side copies of the work, old branches already folded into
the real thing, and five sample pictures nobody uses are gone; a research scratch folder no longer
gets saved into the project's history; the code checker's eleven small tidiness warnings are
cleared; and paperwork for work that shipped weeks ago but was never marked done is now closed.
Nothing about how a shaper's board draws, calculates, saves or prints changed.**

## Branches deleted (all merged into main, `-d`; tips recoverable from these SHAs)

| Branch | Tip SHA |
|---|---|
| foil-real-shaping | 1076c77 |
| rocker-blanks | 46a1720 |
| claude/heuristic-snyder-fb0d8b | e37e12d |
| claude/musing-austin-196b4c | 65ac41b |
| claude/determined-tereshkova-590f1b | 3a96f71 |
| design/order-form-summary | 12b6023 |
| design/horizontal-template-view (`-D`, founder-approved, unmerged) | a73d8f8 |

None of these were pushed or deleted on GitHub. The three still-remote branches
(`claude/heuristic-snyder-fb0d8b`, `design/order-form-summary`, `design/horizontal-template-view`)
are left for the orchestrator to delete at push time, after the founder's go — they stay
recoverable from GitHub until then.

## Worktrees and folders removed

- `.claude/worktrees/determined-tereshkova-590f1b` (detached at 65ac41b) — `git worktree remove`,
  no `--force` needed, both clean.
- `.claude/worktrees/heuristic-snyder-fb0d8b` (detached at e37e12d) — same, ~1 GB.
- `.claude/worktrees/agent-ae9b23f4f20c9eada` — an orphan folder (not a registered worktree),
  confirmed to hold exactly the two expected `.recovery-probe.txt` probe files before deletion.
- `.claude/worktrees/` is now empty (the folder itself stays, for Claude Code's own session
  worktrees).
- `.planning/quick/260818*-rebuild-volume*` — the literal star-named folder from a bad mkdir on
  2026-08-18, removed with `rmdir` on a single-quoted path (empty, so `rmdir` was the safety net).
  Its real sibling `260818-nyw-rebuild-volume-estimator-screen-lib-geom` was confirmed to still
  exist afterward.

## Starter images and the research cache

- Deleted `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`,
  `public/window.svg` — the create-next-app starter pictures. Nothing in the app referenced any of
  them. `public/rail-bands-plan-bg.png` (referenced 9 times) stays.
- `.planning/research/.cache/` (GSD's research-lookup cache) is now ignored: 7 tracked files
  untracked with `git rm -r --cached`, all 9 files on disk stay exactly where they are.
- `.env.example` finding: `.gitignore` line 47's blanket `.env*` (added for GSD's runtime scratch)
  sat after the earlier `!.env.example` allowance near line 36 and, because the last matching rule
  wins, was silently re-ignoring it — so the founder's own hand-made example file would never have
  been committable. Fixed with one allowance line (`!.env.example`) placed directly after the
  `.env*` line. Every other `.env*` file and `client_secret_*.json` stay ignored (verified by the
  gate).

## Lint warnings cleared (11 → 0)

| File | Warning | What was done |
|---|---|---|
| components/rails/rail-plan-side-figure.tsx:291 | `@next/next/no-img-element` | Kept the plain `img` (it must be loaded when the printed sheet fires, and next/image would lazy-load it through an optimiser this app deliberately doesn't use) and added one explanatory `eslint-disable-next-line` comment above it. |
| components/viewer/drag-spacing.test.ts:183 | unused `no-console` directive | Deleted the directive line; the `console.log` under it is untouched. |
| lib/geometry/outline.test.ts:7 | unused `TOLERANCE_IN` | Deleted the whole constant line (confirmed unused elsewhere in the file by grep before and after). |
| scripts/extract-prototype-fins-golden.mjs:97,141,149,164 | unused `no-new-func` (×4) | Deleted each directive line whole, bottom-up. |
| scripts/extract-prototype-golden.mjs:55 | unused `no-new-func` | Deleted. |
| scripts/extract-prototype-rails-golden.mjs:104 | unused `no-new-func` | Deleted. |
| scripts/extract-prototype-volume-golden.mjs:97,105 | unused `no-new-func` (×2) | Deleted, bottom-up. |

`eslint --fix` was deliberately not used (measured at plan time to leave whitespace-only lines
behind); every directive was deleted by hand instead.

**Golden proof:** `npm run golden` regenerated all four fixtures; `git diff --quiet --
lib/geometry/__fixtures__/` held — byte-identical, exactly as the plan-time dry run predicted.

**Unit-test count:** `npm test` → 76 test files, **3,043 tests passed, 2 skipped** (3,045 total).
Matches the plan-time count from item 1 exactly. Re-ran again after Task 1's commit with the same
result.

## Stale records closed

| Record | Evidence | Closed as |
|---|---|---|
| fin-placement-numbers-in-cm (debug) | 907bd5d, 909f72c on main (plan 06-08) | resolved |
| keyboard-focus-invisible-on-sliders (debug) | 26fe27b, 781dc12, 761e596 on main (plan 09-08) | resolved |
| metric-axis-labels-instructions-card (debug) | 1df06ef, 2843309, ca8778f, d46307f on main (plan 08-08) | resolved |
| order-form-letter-blank-pages (debug) | 1360d62, bc9f13d on main (plan 08-09) | resolved |
| phone-print-button-does-nothing (debug) | ab6905f, f3da72b, 85bbaf5 on main (plan 09-09); app side was never broken — iOS refuses printing from a Home-Screen web app, and the shipped note tells the shaper so; the PDF route the diagnosis floated was **not built** | resolved |
| typed-length-box-too-narrow (debug) | e76c237 on main (plan 06-09) | resolved |
| view-full-sized-print-offset (debug) | 4a28874, 27a26a8, 2fd8941 on main (plan 08-07) | resolved |
| 260910-2ny quick task | BROWSER-READING: fit gate PASS at every swept width, all 3 browsers; the one failing check was a rocker-drawing label, narrowed in 7aad8ff; founder's own iPhone print confirmed 3 sheets on 3 pages at 100%; guarded by e2e/summary-print-touch-box.spec.ts | complete |
| 260910-jfp quick task | BROWSER-READING verdict PASS (key costs no height, all 3 browsers); shipped 71a624a; guarded by e2e/summary-rail-key.spec.ts | complete |
| 260910-kz2 quick task | BROWSER-READING verdict PASS (example rail survives from 268 dots up); shipped 1a8705c; guarded by e2e/summary-rail-instructions-fit.spec.ts | complete |
| 260914-rj0 quick task | No status field at all in frontmatter; shipped 2026-09-14 via PR #1, merged as 0dfc6bf | complete |
| WINDOWS entry 1 | 01-UAT.md tests 1-3 (fin config switching, rail-band recalc, per-screen units), passed 16:20-16:46 the same afternoon the entry was logged | fixed |
| WINDOWS entry 2 | Overtaken by 260830-31h and by later real-phone walks (10-SWEEP-2, 11-UAT test 4) | waived |
| 2026-08-19 phone-width todo | Delivered by Phase 9 and Phase 10, whose UATs walked it on a real iPhone | completed (moved to todos/completed/) |

**Two corrections for the orchestrator to carry into STATE.md's Quick Tasks table** (from the
earlier milestone close):
1. `order-form-letter-blank-pages` shipped in **plan 08-09**, not "quick task, Phase 7/8" as the
   table currently says — the commits (1360d62, bc9f13d) are plan commits, not quick-task commits.
2. WINDOWS entry 1 (Task 2 Part B walkthrough) was in fact checked, the same afternoon it was
   logged, by Phase 1's own UAT — it was never actually an unmet truth by the end of that day.

All three specs guarding the 260910 quick tasks (`e2e/summary-print-touch-box.spec.ts`,
`e2e/summary-rail-key.spec.ts`, `e2e/summary-rail-instructions-fit.spec.ts`) run in the full
browser suite, which passed on main on 2026-09-27 (360 tests, Phase 13 item 1) — cited in each
record's Outcome note per the plan's measured fact.

## Scanner and ledger — before and after

| | Before | After |
|---|---|---|
| Debug sessions | 7 | 0 |
| Quick tasks (open) | 6 (5 stale + this task's own folder, "missing") | 0 (this SUMMARY carries `status: complete`) |
| Todos | 10 | 9 (5 listed + a remainder of 4) |
| WINDOWS ledger open_count | 2 | 0 |

## Founder-only steps still open (Claude cannot do these)

- Move `client_secret_*.json` out of the project folder into a password manager.
- Create `.env.example` at the repo root with the three names and no values
  (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=`, `CLERK_SECRET_KEY=`, `DATABASE_URL=`) — the `.gitignore`
  fix in this task means it can now be committed once it exists.
- The model-profile question from SPEC item 2 — the orchestrator records this from the founder's
  answer.

## Gates handed to the orchestrator (not run by this executor)

- `npm run build` (from the main checkout).
- The full browser suite, `npm run test:e2e` (source files were touched by Task 1's lint fixes).
- STATE.md (Quick Tasks table — including the two corrections above — Deferred Items, Blockers,
  Pending Todos), the 13-SPEC.md Progress Log, and the ROADMAP.md Phase 13 tick.
- The docs commit carrying this PLAN.md and SUMMARY.md alongside STATE.md/ROADMAP.md.
- On the founder's go: the push, and the deletion of the three remaining GitHub branches
  (`claude/heuristic-snyder-fb0d8b`, `design/order-form-summary`, `design/horizontal-template-view`).

## Deviations from Plan

None — every measured fact at plan time held exactly: the 11 lint warnings matched line-for-line,
both worktrees were clean and removed without `--force`, all six merge-eligible branches deleted
with plain `-d` (no refusals), the orphan folder held exactly the two expected probe files, the
golden fixtures came out byte-identical, the unit-test count matched (3,043), and every commit
cited for a debug session or quick-task closure was verified as an ancestor of `HEAD` before the
record was closed.

## Self-Check: PASSED

- FOUND: components/rails/rail-plan-side-figure.tsx (eslint-disable comment present)
- FOUND: .gitignore (`.planning/research/.cache/` and `!.env.example` present)
- FOUND: .planning/debug/resolved/ (7 files, all `status: resolved` with a `shipped:` line)
- FOUND: .planning/WINDOWS.md (open_count 0)
- FOUND: .planning/todos/completed/2026-08-19-mobile-phone-width-layout-polish.md (with `## Outcome`)
- FOUND commit aa086a3 (chore(lint): clear the eleven code-checker warnings)
- FOUND commit 3cb5e31 (chore(public): delete five unused starter images)
- FOUND commit 1464bcd (chore(gitignore): stop committing the research cache, and let .env.example be committed)
- FOUND commit f722d32 (docs(planning): close the stale debug, quick-task, ledger and todo records)
