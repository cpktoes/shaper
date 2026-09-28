---
phase: quick-260927-pij
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/rails/rail-plan-side-figure.tsx
  - components/viewer/drag-spacing.test.ts
  - lib/geometry/outline.test.ts
  - scripts/extract-prototype-fins-golden.mjs
  - scripts/extract-prototype-golden.mjs
  - scripts/extract-prototype-rails-golden.mjs
  - scripts/extract-prototype-volume-golden.mjs
  - .gitignore
  - public/file.svg
  - public/globe.svg
  - public/next.svg
  - public/vercel.svg
  - public/window.svg
  - .planning/research/.cache/
  - .planning/debug/
  - .planning/debug/resolved/
  - .planning/quick/260910-2ny-size-each-order-form-sheet-to-the-real-p/260910-2ny-SUMMARY.md
  - .planning/quick/260910-jfp-print-a-key-beside-the-rail-plan-side-dr/260910-jfp-SUMMARY.md
  - .planning/quick/260910-kz2-stop-the-rail-instructions-sheet-clippin/260910-kz2-SUMMARY.md
  - .planning/quick/260914-rj0-the-rear-fin-and-centre-fin-heights-on-t/260914-rj0-SUMMARY.md
  - .planning/WINDOWS.md
  - .planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md
  - .planning/todos/completed/2026-08-19-mobile-phone-width-layout-polish.md
autonomous: true
requirements: [QT-260927-pij, 13-SPEC-item-2]

estimate:
  # Sequential on the main checkout (orchestrator decision: this task deletes files, worktrees and branches,
  # none of which a worktree can do cleanly). Many files, but every edit is a one-line deletion, a one-line
  # insertion, a git mv or a git rm. The heaviest steps are `npm test` (~3,043 unit tests) and `npm run golden`.
  # Every gate below was dry-run at plan time against today's main (b745389).
  tokens: 55000
  raw_tokens: 55000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "`npm run lint -- --max-warnings 0` exits 0 — 0 errors and 0 warnings, down from 11 warnings — and the only source change behind it is one added comment line in rail-plan-side-figure.tsx plus ten whole deleted lines across six other files; no app behaviour changes."
    - "`npm run golden` regenerates all four prototype fixtures and `git diff --quiet -- lib/geometry/__fixtures__/` holds afterwards (the fixture scripts produce byte-identical output, as they did in the plan-time dry-run), and `npm test` passes in full."
    - "`git for-each-ref refs/heads` lists only `main`; the three `origin/...` remote-tracking refs are left for the orchestrator to delete at push time; nothing is pushed."
    - "`git worktree list` shows only /Users/kontoes/Code/shaper; `.claude/worktrees/` holds nothing (the two finished session worktrees and the orphan `agent-ae9b23f4f20c9eada` folder are gone)."
    - "The five create-next-app starter images are gone from `public/` and from git; `public/rail-bands-plan-bg.png` stays."
    - "`.planning/research/.cache/` is ignored and untracked (its 9 files stay on disk); `.env.example` is no longer ignored, so the founder's own file can be committed, while every other `.env*` file stays ignored and `client_secret_*.json` stays ignored."
    - "The milestone-close scanner (`gsd-tools query audit-open --json`) reports 0 debug sessions, 0 quick tasks once this task's SUMMARY carries `status: complete`, and 9 pending todos (5 listed + a remainder of 4); `gsd-tools windows status` reports open_count 0."
  artifacts:
    - path: components/rails/rail-plan-side-figure.tsx
      provides: "The rails plan background stays a plain img, with a one-line reason for keeping it that way"
      contains: "eslint-disable-next-line @next/next/no-img-element"
    - path: .gitignore
      provides: "GSD's research cache ignored; `.env.example` re-allowed after the GSD block's `.env*` line"
      contains: ".planning/research/.cache/"
    - path: .planning/debug/resolved/
      provides: "The seven diagnosed debug sessions, each `status: resolved` with a dated line naming the plan and commits that shipped its fix"
    - path: .planning/WINDOWS.md
      provides: "The broken-windows ledger with no open entry"
      contains: "open_count: 0"
    - path: .planning/todos/completed/2026-08-19-mobile-phone-width-layout-polish.md
      provides: "The phone-width todo closed with an Outcome note naming the phases that delivered it"
      contains: "## Outcome"
  key_links:
    - from: scripts/extract-prototype-*-golden.mjs
      to: lib/geometry/__fixtures__/prototype-*-golden.json
      via: "`npm run golden` runs the four scripts, which execute the original prototype's own functions and write the expected numbers every geometry test checks against (CLAUDE.md Rule 1). Deleting a comment line must not move one byte of those files."
      pattern: "new Function"
    - from: .planning/debug/*.md
      to: "~/.claude/gsd-core/bin/lib/audit.cjs scanDebugSessions"
      via: "The scanner treats `status: resolved` or `status: complete` as closed and never looks inside `.planning/debug/resolved/`; GSD's own debug workflow reads resolved sessions from that folder."
      pattern: "status: resolved"
    - from: .planning/quick/*/*-SUMMARY.md
      to: "~/.claude/gsd-core/bin/lib/audit.cjs scanQuickTasks"
      via: "A quick-task folder counts as open unless its SUMMARY's frontmatter says exactly `status: complete` — including this task's own folder until its SUMMARY is written."
      pattern: "status: complete"
    - from: .gitignore
      to: "git index"
      via: "An ignore rule does not untrack files already committed; `git rm --cached` does. And the LAST matching rule wins, so the `.env.example` allowance has to sit after the GSD block's `.env*` line to take effect."
      pattern: ".planning/research/.cache/"
---

<objective>
**Phase 13 item 2 — housekeeping and old records** (`.planning/phases/13-ready-for-the-shapers/13-SPEC.md`, item 2).

**What it does, in plain English.** Nothing a shaper sees changes: no board draws, calculates, saves or
prints any differently. This is tidying the workshop before visitors arrive. It throws away finished side
copies of the project and old branches that were already folded into the real thing; deletes five sample
pictures the project's starter kit came with that nothing uses; stops a research scratch folder being saved
into the project's history; clears the eleven small tidiness warnings the code checker prints; and closes
paperwork for work that shipped weeks ago but was never marked done — so the checklist run at each milestone
close shows only the real to-do list instead of 17 stale entries.

**Execution mode (orchestrator decision): sequentially, on the main checkout, NOT in a worktree.** Plain `git`
in /Users/kontoes/Code/shaper is expected — GSD's worktree merge refuses any merge that deletes files, and
worktrees and branches cannot be removed from inside a worktree.

**Hard limits — do not cross any of these:**
- No `git push`, no remote branch deletion. The three GitHub branches are the orchestrator's, at push time,
  after the founder's go.
- Do not edit or stage `.planning/STATE.md`, `.planning/ROADMAP.md`, `13-SPEC.md` or `.planning/config.json`
  (config.json carries the founder's model-profile change, uncommitted — leave it exactly as it is).
- Do not touch `package.json`, `package-lock.json` or `node_modules`. The only source edits allowed are the
  Task 1 lint fixes.
- Commit with explicitly staged paths only — never `git add -A`, `git add .` or `git commit -a`. Before every
  commit, `git diff --cached --name-status` must list only that commit's intended paths. This task's own
  PLAN.md and SUMMARY.md stay uncommitted (the orchestrator's docs commit takes them with STATE.md).
- Commit messages: conventional prefix, subject ending `(quick 260927-pij)`, a plain-English body a shaper
  could read (CLAUDE.md: what it does to the board or the screen, not which file changed), and the final line
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Write each message to a file in your scratchpad
  and use `git commit -F <file>`.
- If any git operation refuses (a worktree that is not clean, a branch `-d` calls unmerged), STOP that step
  and report it — never escalate to `--force` or `-D` beyond the one branch this plan names for `-D`.

**Measured at plan time (2026-09-27, main at b745389) — use these facts; re-derive nothing at length:**

| What | Measured |
|---|---|
| Local branches merged into main (`git merge-base --is-ancestor`) | foil-real-shaping, rocker-blanks, claude/heuristic-snyder-fb0d8b, claude/musing-austin-196b4c, claude/determined-tereshkova-590f1b, design/order-form-summary |
| Unmerged branch | design/horizontal-template-view — 1 commit, a73d8f8 (2026-08-23), an early draft of sketch 005; main holds the newer copy (2827b95, 2026-08-25). Founder approved deleting it. Still on GitHub until the orchestrator deletes it, so it stays recoverable |
| Upstreams | heuristic-snyder, order-form-summary and horizontal-template-view track origin and are level with it (local tip = remote tip), so `git branch -d` will not trip on an unpushed upstream |
| Worktrees | .claude/worktrees/determined-tereshkova-590f1b (detached at 65ac41b, on main) and .claude/worktrees/heuristic-snyder-fb0d8b (detached at e37e12d, on main): 0 changed files each (only ignored .next/, node_modules/, test-results/ inside), not locked, no process using them. heuristic-snyder is ~1 GB, so its removal takes a moment |
| Orphan folder | .claude/worktrees/agent-ae9b23f4f20c9eada — not a registered worktree; exactly two files, `.recovery-probe.txt` at its root and in `e2e/`; 8 KB |
| Star-named folder | `.planning/quick/260818*-rebuild-volume*` — the `*` characters are literally part of its name (a bad mkdir on 2026-08-18); empty; untracked. Its real sibling `260818-nyw-rebuild-volume-estimator-screen-lib-geom` must NOT be touched |
| Starter images | public/file.svg, globe.svg, next.svg, vercel.svg, window.svg — no reference anywhere in app/, components/, lib/, e2e/, scripts/, README; rail-bands-plan-bg.png is referenced 9 times and stays |
| Research cache | .planning/research/.cache/: 7 files tracked, 2 untracked, 9 on disk. Contents are short web-research notes (no keys or secrets — scanned) |
| `.env.example` | `git check-ignore -v .env.example` → `.gitignore:47:.env*` — the GSD block's `.env*` line comes after the earlier `!.env.example` allowance and wins, so the founder's file would be silently ignored. One allowance line after line 47 fixes it |
| `eslint --fix` | Measured on two of the files: it replaces an unused directive with a whitespace-only line instead of deleting the line. Do not use it — delete each directive line whole |
| `npm run golden` | Ran all four scripts: fixtures byte-identical (`git diff --quiet` held). No timestamp or run-dependent field in any fixture |
| `gsd-tools frontmatter set` | Measured on copies: it rewrites the whole file and inserts blank lines through the body (62 changed lines on the rj0 SUMMARY). Do not use it — edit the single frontmatter line in place |
| Scanner today | 7 debug, 6 quick tasks (the five stale ones + this task's own folder, "missing" until its SUMMARY exists), 10 todos |

Purpose: SPEC item 2's "Done when" — only `main` remains, `git worktree list` shows only the main checkout,
lint reports 0 warnings, and the pre-close scanner lists only the real backlog.
Output: four commits (lint; starter images; ignore rules + cache untrack; records), and the SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/phases/13-ready-for-the-shapers/13-SPEC.md
@.planning/WINDOWS.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Clear the eleven lint warnings, and prove the expected-number files and the unit tests did not move</name>
  <files>components/rails/rail-plan-side-figure.tsx, components/viewer/drag-spacing.test.ts, lib/geometry/outline.test.ts, scripts/extract-prototype-fins-golden.mjs, scripts/extract-prototype-golden.mjs, scripts/extract-prototype-rails-golden.mjs, scripts/extract-prototype-volume-golden.mjs</files>
  <read_first>
    - components/rails/rail-plan-side-figure.tsx lines 280-300 (the img that draws the rails plan background PNG, line 291)
    - components/viewer/drag-spacing.test.ts lines 178-188
    - lib/geometry/outline.test.ts lines 1-12
    - the directive lines in the four scripts: fins-golden 97, 141, 149, 164; golden 55; rails-golden 104; volume-golden 97, 105
  </read_first>
  <action>
1. Run `npm run lint` first and confirm it reports exactly the 11 warnings listed below at those lines (0
   errors). If the list differs, stop and report — do not fix anything not on this list.

2. `components/rails/rail-plan-side-figure.tsx` line 291 (`@next/next/no-img-element`): KEEP the plain `img`.
   It draws the rails plan background on the printed Rail Band Instructions sheet; swapping it for next/image
   would lazy-load it (a print can fire before it arrives) and route it through the framework's image
   optimiser, which this app deliberately does not use. Insert ONE line directly above the `<img` line, at the
   same indentation: a JSX comment in braces holding `eslint-disable-next-line @next/next/no-img-element`
   followed by ` -- ` and a one-line reason, for example "a plain img on purpose: it must be loaded when the
   page prints, and next/image lazy-loads it through an image optimiser this app does not use". Change nothing
   else in the file.

3. `components/viewer/drag-spacing.test.ts` line 183: delete the whole unused no-console directive line (the
   `console.log` under it stays exactly as it is).

4. `lib/geometry/outline.test.ts` line 7: delete the whole `TOLERANCE_IN` constant line. Plan-time grep: it is
   referenced nowhere else in that file (fins.test.ts and rail-bands.test.ts have their own separate
   constants of the same name — leave them alone). Grep once more before deleting.

5. The four golden-fixture scripts: delete each whole unused no-new-func directive line — eight lines:
   fins-golden 97, 141, 149, 164; golden 55; rails-golden 104; volume-golden 97, 105. Line numbers shift as you
   delete, so work from the bottom of each file upwards, or use the Edit tool on each exact directive-plus-next-
   line pair. Do NOT run `eslint --fix`: measured at plan time, it leaves a whitespace-only line where each
   directive was. Touch no other line: these scripts produce the expected numbers every geometry test checks
   (CLAUDE.md Rule 1).

6. Prove it: `npm run lint -- --max-warnings 0` exits 0; `npm run golden` then `git diff --quiet --
   lib/geometry/__fixtures__/` holds (byte-identical — at plan time there was no timestamp field to allow for,
   so ANY fixture diff is a failure: stop, restore the fixtures with `git checkout -- lib/geometry/__fixtures__/`,
   and report); `npm test` passes in full (3,043 at item 1 — record the actual count).

7. Stage exactly the seven files with `git add <path>` each, check `git diff --cached --name-status` lists only
   them, and commit. Subject: `chore(lint): clear the eleven code-checker warnings (quick 260927-pij)`. Body, in
   plain English: nothing about any board changes; the picture behind the rail band plan on the printed
   instructions sheet stays a plain picture so it is always there when the page prints, now with a note saying
   why; the rest were leftover notes and one unused number in the tests and in the four tools that produce the
   expected measurements, and those tools were re-run and produce byte-identical files. End with the
   Co-Authored-By trailer.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && npm run lint -- --max-warnings 0 >/dev/null && echo "lint: 0 problems" && test "$(grep -c 'eslint-disable-next-line @next/next/no-img-element' components/rails/rail-plan-side-figure.tsx)" = 1 && node -e 'const cp=require("child_process");const ns=cp.execSync("git show --numstat --format= HEAD").toString().trim().split("\n").map(l=>l.split("\t"));const want={"components/rails/rail-plan-side-figure.tsx":"1/0","components/viewer/drag-spacing.test.ts":"0/1","lib/geometry/outline.test.ts":"0/1","scripts/extract-prototype-fins-golden.mjs":"0/4","scripts/extract-prototype-golden.mjs":"0/1","scripts/extract-prototype-rails-golden.mjs":"0/1","scripts/extract-prototype-volume-golden.mjs":"0/2"};const got={};for(const [a,d,f] of ns)got[f]=a+"/"+d;const keys=Object.keys(want);const ok=Object.keys(got).length===keys.length&&keys.every(k=>got[k]===want[k]);const dl=cp.execSync("git show -U0 --format= HEAD -- scripts/").toString().split("\n").filter(l=>/^[+-]/.test(l)&&!/^(\+\+\+|---)/.test(l));const odd=dl.filter(l=>!/^-\s*\/\/ eslint-disable-next-line no-new-func$/.test(l));console.log(JSON.stringify(got));console.log(dl.length+" script lines changed, "+odd.length+" unexpected");process.exit(ok&&dl.length===8&&odd.length===0?0:1)' && npm run golden >/dev/null && git diff --quiet -- lib/geometry/__fixtures__/ && echo "fixtures byte-identical" && npm test 2>&1 | tail -5</automated>
  </verify>
  <done>
`npm run lint -- --max-warnings 0` exits 0; the lint commit changes exactly the seven files (one line added in
rail-plan-side-figure.tsx, ten whole lines deleted elsewhere, the eight script deletions all being the unused
no-new-func directives); `npm run golden` leaves every fixture byte-identical; `npm test` passes in full.
  </done>
</task>

<task type="auto">
  <name>Task 2: Remove the finished worktrees, the old branches, the orphan folders, the starter images, and stop committing the research cache</name>
  <files>.gitignore, public/file.svg, public/globe.svg, public/next.svg, public/vercel.svg, public/window.svg, .planning/research/.cache/</files>
  <read_first>
    - .gitignore (whole file; the env block near line 36 and the GSD block at lines 45-47)
  </read_first>
  <action>
Order matters: worktrees before branches.

1. **Worktrees.** Run `git worktree remove .claude/worktrees/determined-tereshkova-590f1b`, then the same for
   `.claude/worktrees/heuristic-snyder-fb0d8b` (no `--force` — both measured clean; if git refuses either,
   stop that step and report the message), then `git worktree prune`.

2. **Orphan folder.** First assert `.claude/worktrees/agent-ae9b23f4f20c9eada` is not in `git worktree list`
   and that `find` shows exactly two files in it, both named `.recovery-probe.txt` (root and `e2e/`). Only if
   both hold, delete that one exact path recursively. Leave the now-empty `.claude/worktrees/` folder itself in
   place (Claude Code puts its session worktrees there).

3. **Star-named folder.** Remove the empty `.planning/quick/260818*-rebuild-volume*` with `rmdir`, the path in
   SINGLE quotes so the shell never expands the stars into its real sibling
   `260818-nyw-rebuild-volume-estimator-screen-lib-geom` (which must survive). `rmdir` removes only an empty
   folder, which is the safety net. Confirm afterwards that the nyw folder still exists.

4. **Branches.** `git branch -d` each of the six merged branches: foil-real-shaping, rocker-blanks,
   claude/heuristic-snyder-fb0d8b, claude/musing-austin-196b4c, claude/determined-tereshkova-590f1b,
   design/order-form-summary. Then `git branch -D design/horizontal-template-view` (founder-approved: an Aug 23
   draft of sketch 005 that main holds a newer copy of). Keep git's "Deleted branch X (was SHA)" lines for the
   SUMMARY so every tip stays recoverable. Do NOT touch the `origin/...` refs or push anything.

5. **Starter images.** `git rm public/file.svg public/globe.svg public/next.svg public/vercel.svg
   public/window.svg`. Commit those five deletions alone. Subject: `chore(public): delete five unused starter
   images (quick 260927-pij)`. Body: the sample pictures the project's starter kit came with (a file, a globe,
   a window and two logos); no page shows them; the rail band plan picture stays.

6. **Ignore rules.** Edit `.gitignore`: (a) directly after the GSD block's lone `.env*` line (line 47), add a
   line re-allowing `.env.example` — the same negation the env block near line 36 already has, which line 47
   currently overrides because the last matching rule wins; keep the `.env*` line itself; (b) add a short
   commented block ignoring `.planning/research/.cache/` (GSD's research cache — lookups saved between
   research runs, rebuilt on demand, not project history). Touch no other rule, and leave the
   `client_secret_*.json` block exactly as it is. Then `git rm -r --cached .planning/research/.cache` (untracks
   the 7 tracked files; all 9 stay on disk). Stage `.gitignore` and commit. Subject: `chore(gitignore): stop
   committing the research cache, and let .env.example be committed (quick 260927-pij)`. Body: GSD's research
   cache is scratch that gets rebuilt, so it no longer goes into the project's history (the files stay on this
   machine); and the example settings file — three names, no values — that the founder is creating by hand was
   being silently ignored by a later rule, so it can now be committed, while every real settings file holding
   keys stays ignored.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && test "$(git for-each-ref --format='%(refname:short)' refs/heads)" = main && echo "branches: only main" && test "$(git worktree list --porcelain | grep -c '^worktree ')" = 1 && echo "worktrees: only the main checkout" && test -z "$(ls -A .claude/worktrees 2>/dev/null)" && echo ".claude/worktrees empty" && test ! -e '.planning/quick/260818*-rebuild-volume*' && test -d .planning/quick/260818-nyw-rebuild-volume-estimator-screen-lib-geom && echo "star folder gone, nyw kept" && test "$(git ls-files public/)" = public/rail-bands-plan-bg.png && echo "public: only the rail plan picture" && test -z "$(git ls-files .planning/research/.cache)" && test "$(ls .planning/research/.cache | wc -l | tr -d ' ')" = 9 && git check-ignore -q .planning/research/.cache/probe.json && echo "cache: ignored, untracked, 9 files on disk" && ! git check-ignore -q .env.example && test -z "$(git ls-files --others --exclude-standard | grep '^\.env')" && git check-ignore -q client_secret_probe.json && echo "env: .env.example allowed, every other env file and client_secret still ignored" && git rev-parse -q --verify refs/remotes/origin/design/horizontal-template-view >/dev/null && echo "origin refs untouched"</automated>
  </verify>
  <done>
Only `main` remains locally (the three origin refs untouched, nothing pushed); `git worktree list` shows only
the main checkout; `.claude/worktrees/` is empty; the star-named folder is gone and its real nyw sibling
survives; `public/` in git holds only rail-bands-plan-bg.png; the research cache is ignored and untracked with
all 9 files still on disk; `.env.example` is committable while every other `.env*` file and
`client_secret_*.json` stay ignored; two commits (images; ignore rules + untrack), each with a plain-English
body and the trailer.
  </done>
</task>

<task type="auto">
  <name>Task 3: Close the stale records — seven debug sessions, four quick-task records, two ledger entries and the phone-width todo</name>
  <files>.planning/debug/ (7 files moved to .planning/debug/resolved/), .planning/quick/260910-2ny-size-each-order-form-sheet-to-the-real-p/260910-2ny-SUMMARY.md, .planning/quick/260910-jfp-print-a-key-beside-the-rail-plan-side-dr/260910-jfp-SUMMARY.md, .planning/quick/260910-kz2-stop-the-rail-instructions-sheet-clippin/260910-kz2-SUMMARY.md, .planning/quick/260914-rj0-the-rear-fin-and-centre-fin-heights-on-t/260914-rj0-SUMMARY.md, .planning/WINDOWS.md, .planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md</files>
  <read_first>
    - the frontmatter (first ~10 lines) and the LAST section of each of the seven .planning/debug/*.md files — four end in a `## Resolution` section (fin-placement-numbers-in-cm, keyboard-focus-invisible-on-sliders, phone-print-button-does-nothing, typed-length-box-too-narrow); three end in `## Suggested fix direction` and have no Resolution section (metric-axis-labels-instructions-card, order-form-letter-blank-pages, view-full-sized-print-offset)
    - each 260910 SUMMARY's frontmatter tail (the single `status: incomplete` line) and its sibling `*-BROWSER-READING.md` frontmatter (the verdict)
    - .planning/quick/260914-rj0-the-rear-fin-and-centre-fin-heights-on-t/260914-rj0-SUMMARY.md lines 120-128 (the frontmatter closes at line 128 with no status field)
    - .planning/milestones/v1.0-phases/01-foundation-port-deploy-the-design-tool/01-UAT.md (frontmatter and tests 1-3)
  </read_first>
  <action>
Edit every frontmatter field IN PLACE — change the one line. Do not use `gsd-tools frontmatter set` (measured at
plan time: it rewrites the file and inserts blank lines throughout the body). Take one timestamp with
`date -u +%Y-%m-%dT%H:%M:%SZ` and use it for every `updated:` value; write the day as 2026-09-27 in prose.

1. **Debug sessions (7).** `mkdir -p .planning/debug/resolved`, then `git mv` each file into it under the same
   name. In each moved file: change `status: diagnosed` to `status: resolved`; set `updated:` to the timestamp;
   append at the very end of the file one line starting `shipped:` that names the plan, the gap and the
   commits below, plus "Closed 2026-09-27 by quick 260927-pij (Phase 13 item 2)." For the three files with no
   `## Resolution` section, add that heading first, then the line. Evidence, every commit verified on main at
   plan time (confirm each with `git log -1 --format='%h %ad %s' --date=short SHA` as you go):
   - fin-placement-numbers-in-cm: plan 06-08, gaps G-06-12 and G-06-15, 2026-09-05 — 907bd5d (fin placement
     numbers read in millimetres on Metric), 909f72c (the toe-aim tables' aim distances read in millimetres).
   - keyboard-focus-invisible-on-sliders: plan 09-08, gap G-09-4, 2026-09-09 — 26fe27b, 781dc12, 761e596 (the
     focus ring now paints on sliders and every hand-rolled selection button, proved by a real Tab walk).
   - metric-axis-labels-instructions-card: plan 08-08, gap G-08-9, 2026-09-08 — 1df06ef, 2843309, ca8778f,
     d46307f.
   - order-form-letter-blank-pages: plan 08-09, gap G-08-10, 2026-09-08 — 1360d62 (the order form drops its
     screen padding when it prints), bc9f13d (test pinning the @page margin). Note in the SUMMARY that the
     STATE.md table from the earlier milestone close attributes this one to "quick task, Phase 7/8"; the
     commits show plan 08-09.
   - phone-print-button-does-nothing: plan 09-09, gap G-09-6, 2026-09-09 — ab6905f (a plain note replaces the
     phone Print button when it cannot work), f3da72b (test proving a phone tap really calls print), 85bbaf5
     (the note shows only on iOS, where printing actually fails). Say it plainly: the app side was never broken;
     iOS refuses printing from a Home-Screen web app, and the shipped fix tells the shaper so. The PDF route the
     diagnosis also floated was not built — record that, don't imply it.
   - typed-length-box-too-narrow: plan 06-09, gap G-06-4, 2026-09-05 — e76c237 (the typed board length box
     shows its whole value).
   - view-full-sized-print-offset: plan 08-07, gap G-08-5, 2026-09-08 — 4a28874, 27a26a8, 2fd8941.

2. **Quick-task records (4).** Each 260910 SUMMARY said `incomplete` only because its Task 3 — a browser
   reading the worktree executor could not take — was outstanding when the executor handed back. The
   orchestrator took each reading on the main checkout the same day, 2026-09-10, and wrote it to the task's own
   `*-BROWSER-READING.md`. Confirm each verdict and spec file yourself, then in each SUMMARY change the single
   `status: incomplete` line to `status: complete` and append a final section headed
   `## Outcome (2026-09-27, quick 260927-pij)` with two or three plain sentences:
   - 260910-2ny: the reading (260910-2ny-BROWSER-READING.md) found the fit gate passing at every swept width on
     all three browsers; its one failing check (case 6(a)) was a rocker drawing label, not the form's own type,
     and was narrowed to the form's type classes in 7aad8ff; the founder's own iPhone print confirmed three
     sheets on three pages at 100% (the task's row in STATE.md's Quick Tasks table); shipped as 7aad8ff and
     guarded by e2e/summary-print-touch-box.spec.ts.
   - 260910-jfp: reading verdict PASS (the key costs no height at any of seven page widths on all three
     browsers); shipped as 71a624a; guarded by e2e/summary-rail-key.spec.ts.
   - 260910-kz2: reading verdict PASS (the example rail survives from 268 dots up, nothing that already shipped
     moved); shipped as 1a8705c; guarded by e2e/summary-rail-instructions-fit.spec.ts.
   - All three specs run in the full browser suite, which passed on main on 2026-09-27 (360 tests, Phase 13
     item 1) — say so in each note.
   - 260914-rj0: its SUMMARY frontmatter has no status field at all (work shipped 2026-09-14 via PR #1, merged
     as 0dfc6bf). Insert one line `status: complete` directly above the closing `---` of the frontmatter (line
     128). No Outcome section needed.
   If any evidence does NOT hold when you check it (a verdict that is not a pass, a missing spec, a commit not
   on main), leave that record open and report it — do not close on a guess.

3. **The broken-windows ledger (2 open).** Use only the ledger's own CLI, never a hand edit of WINDOWS.md:
   - Entry 1 → `node ~/.claude/gsd-core/bin/gsd-tools.cjs windows fixed 1`. Honest status is fixed, not
     waived: the entry (recorded 2026-08-21 16:08 UTC) says steps 5-8 of the Phase 1 production walkthrough —
     switching fin setups, the rail bands recalculating, units on every screen — were not re-confirmed against
     production; Phase 1's own UAT (01-UAT.md, status passed, 16:20-16:46 UTC the same afternoon) ran exactly
     those three checks on production as its tests 1-3 and passed them. The `fixed` command stores no reason,
     so put this evidence in the commit body and the SUMMARY.
   - Entry 2 → `node ~/.claude/gsd-core/bin/gsd-tools.cjs windows waive 2 "<reason>"`. Honest status is waived:
     the 260830-2dy browser pass was never run as a pass of its own, but it was overtaken. Reason (plain words,
     no pipe characters): superseded — the founder looked at this change nose-up in the browser and caught the
     title overlap that 260830-31h fixed; the ROCKER drawing and the Summary's on-screen order form were then
     walked upright and sideways on a real iPhone in the phone sweep (10-SWEEP-2 rows 6 and 9), and ROCKER on a
     real iPhone and Android phone in Phase 11 (11-UAT test 4).
   Then `windows status` must show open_count 0.

4. **The phone-width todo.** `git mv .planning/todos/pending/2026-08-19-mobile-phone-width-layout-polish.md
   .planning/todos/completed/`, then append an `## Outcome` section: delivered by Phase 9 (The Design Screens
   on a Phone) and Phase 10 (The Whole App on a Phone), whose UATs walked it on a real iPhone — below 820 dots
   wide the design screens now stack the drawing above the controls with a bottom tab bar instead of letting
   the sidebar and the drawing overlap; closed 2026-09-27 by quick 260927-pij (Phase 13 item 2). The other nine
   pending todos stay where they are.

5. **Stage and commit.** `git add` the seven moved-and-edited debug files, the four quick SUMMARYs,
   `.planning/WINDOWS.md` and the moved-and-edited todo. `git diff --cached --name-status` must show exactly 13
   entries — 7 debug renames, 4 modified SUMMARYs, WINDOWS.md, 1 todo rename — and nothing else (not
   config.json, not this task's folder). Commit. Subject: `docs(planning): close the stale debug, quick-task,
   ledger and todo records (quick 260927-pij)`. Body: plain English — seven fault investigations whose fixes
   shipped weeks ago are marked resolved with where each fix shipped; three print-page tasks and one fin-label
   task marked complete with the evidence; the two open ledger entries closed (one was actually checked the
   same afternoon it was logged, the other overtaken by later real-phone walks); the phone-layout todo marked
   done by Phases 9 and 10. Nothing in the app changes.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && test -z "$(ls .planning/debug/*.md 2>/dev/null)" && test "$(grep -l '^status: resolved$' .planning/debug/resolved/*.md | wc -l | tr -d ' ')" = 7 && test "$(grep -l '^shipped:' .planning/debug/resolved/*.md | wc -l | tr -d ' ')" = 7 && echo "debug: 7 resolved with a shipped line" && test "$(grep -l '^status: complete$' .planning/quick/260910-2ny-*/260910-2ny-SUMMARY.md .planning/quick/260910-jfp-*/260910-jfp-SUMMARY.md .planning/quick/260910-kz2-*/260910-kz2-SUMMARY.md .planning/quick/260914-rj0-*/260914-rj0-SUMMARY.md | wc -l | tr -d ' ')" = 4 && echo "quick records: 4 complete" && test -f .planning/todos/completed/2026-08-19-mobile-phone-width-layout-polish.md && grep -q '^## Outcome' .planning/todos/completed/2026-08-19-mobile-phone-width-layout-polish.md && test "$(ls .planning/todos/pending | wc -l | tr -d ' ')" = 9 && echo "todos: 9 pending" && node ~/.claude/gsd-core/bin/gsd-tools.cjs windows status | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const l=JSON.parse(s).ledger;console.log("windows open_count",l.open_count);process.exit(l.open_count===0?0:1)})' && node ~/.claude/gsd-core/bin/gsd-tools.cjs query audit-open --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);const q=j.items.quick_tasks.filter(t=>!String(t.slug).startsWith("260927-pij")&&!t._remainder_count);const td=j.items.todos.reduce((n,t)=>n+(t._remainder_count?t._remainder_count:1),0);console.log("scanner: debug",j.counts.debug_sessions,"other quick tasks",q.length,"todos",td);process.exit(j.counts.debug_sessions===0&&q.length===0&&td===9?0:1)})' && test "$(git show --name-status --format= HEAD | wc -l | tr -d ' ')" = 13 && echo "records commit: 13 entries"</automated>
  </verify>
  <done>
Seven debug sessions live in `.planning/debug/resolved/`, each `status: resolved` with a dated `shipped:` line
citing plan, gap and commits; the three 260910 SUMMARYs read `status: complete` with an Outcome note citing
their browser reading, commit and spec, and the rj0 SUMMARY carries `status: complete`; WINDOWS.md shows
open_count 0 (entry 1 fixed, entry 2 waived with its reason); the phone-width todo is in `completed/` with an
Outcome; the scanner shows 0 debug sessions, no quick task other than this one, and 9 todos; one records commit
of exactly 13 entries.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| working tree → git history (and, at push, GitHub) | What the ignore rules let through is what can end up public in the repository; secrets must stay on the ignored side |
| local branches and worktrees → the only copy of unmerged work | Deleting a branch or a worktree that holds work found nowhere else destroys it |
| golden-fixture scripts → the numbers a shaper cuts foam to | The four scripts write the expected values every geometry test checks; an unnoticed change there would move the test oracle itself |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-q-pij-01 | Information disclosure | `.gitignore` edit re-allowing `.env.example` | high | mitigate | The allowance names only `.env.example`; the `.env*` line and the earlier `.env`/`.env.*` rules stay; Task 2's gate proves no `.env*` file shows up as untracked-and-not-ignored and that `client_secret_*.json` is still ignored |
| T-q-pij-02 | Tampering (loss of work) | `git branch -d` / `-D`, `git worktree remove` | medium | mitigate | Six branches via `-d`, which refuses anything unmerged; `-D` only for design/horizontal-template-view (founder-approved, tip a73d8f8 recorded, and still on GitHub until the orchestrator deletes it); worktrees removed without `--force`, both measured clean and detached at commits already on main; any refusal stops the step |
| T-q-pij-03 | Tampering | Recursive delete of the orphan folder; `rmdir` of the star-named folder | medium | mitigate | Orphan: exact literal path, asserted unregistered and holding exactly the two probe files before deletion. Star folder: single-quoted path (no glob expansion into the real nyw sibling) and `rmdir`, which only removes an empty folder; gate confirms the nyw folder survives |
| T-q-pij-04 | Tampering | Golden-fixture scripts (directive deletions) | high | mitigate | Gate: the scripts' diff is exactly eight deleted lines, each an unused directive; `npm run golden` then `git diff --quiet -- lib/geometry/__fixtures__/`; `npm test` in full |
| T-q-pij-05 | Repudiation | Closing records without proof | low | mitigate | Every closure cites commits verified on main, a BROWSER-READING verdict, a spec file or a UAT test; any record whose evidence fails the check stays open and is reported |
| T-q-pij-06 | Information disclosure | Research cache files already in git history | low | accept | Scanned at plan time: short web-research notes about Clerk and Next.js setup, no keys or secrets; untracking stops future additions, and rewriting history is out of all proportion |
| T-q-pij-07 | Tampering | Accidental staging of the founder's uncommitted `.planning/config.json` or this task's PLAN/SUMMARY | low | mitigate | Explicit per-path staging only, and `git diff --cached --name-status` checked before every commit; each task's gate checks its commit's exact file list |
</threat_model>

<verification>
**The executor runs these on main after Task 3, and after writing the SUMMARY (whose frontmatter must say
`status: complete`, or the scanner keeps listing this task's own folder):**
- `npm run lint` → 0 problems (`npm run lint -- --max-warnings 0` exits 0).
- `npm run golden` → `git diff --quiet -- lib/geometry/__fixtures__/` holds.
- `npm test` → all passing (3,043 at item 1; record the count).
- `git for-each-ref --format='%(refname:short)' refs/heads` → only `main`.
- `git worktree list` → only /Users/kontoes/Code/shaper. `ls -A .claude/worktrees` → nothing.
- `node ~/.claude/gsd-core/bin/gsd-tools.cjs query audit-open --json` → debug_sessions 0, quick_tasks 0,
  todos 5 listed + remainder 4 = 9.
- `node ~/.claude/gsd-core/bin/gsd-tools.cjs windows status` → open_count 0.
- `git status --short` → only ` M .planning/config.json` and `?? .planning/quick/260927-pij-.../` (PLAN +
  SUMMARY). The two formerly untracked cache files are now ignored and must not appear.
- `git log --oneline origin/main..main` → b745389 plus this task's four commits; nothing pushed.

**Not the executor's — the orchestrator runs afterwards:** `npm run build` (main checkout); the full browser
suite `npm run test:e2e` (source files were touched); STATE.md (Quick Tasks row, Deferred Items, Blockers,
Pending Todos), the 13-SPEC Progress Log and the ROADMAP Phase 13 tick, and the docs commit carrying this PLAN
and SUMMARY; then, on the founder's go, the push and the deletion of the three GitHub branches
(`claude/heuristic-snyder-fb0d8b`, `design/order-form-summary`, `design/horizontal-template-view`).
</verification>

<success_criteria>
- Lint: 0 errors, 0 warnings. The one source change beyond deleted lines is a single explanatory comment above
  the rails plan picture; no board draws, calculates, saves or prints differently.
- The golden fixtures are byte-identical after regeneration; the unit suite passes in full.
- Only `main` locally; only the main checkout in `git worktree list`; `.claude/worktrees/` empty; the
  star-named folder gone.
- The five starter images deleted; the research cache ignored and untracked with its files still on disk;
  `.env.example` committable; every other `.env*` file and `client_secret_*.json` still ignored.
- Scanner: 0 debug sessions, 0 quick tasks, 9 todos. Ledger: open_count 0.
- Four commits with plain-English bodies and the trailer; nothing pushed; STATE.md, ROADMAP.md, 13-SPEC.md and
  config.json untouched.
</success_criteria>

<output>
Create `.planning/quick/260927-pij-phase-13-item-2-housekeeping-clear-the-m/260927-pij-SUMMARY.md` when done,
with `status: complete` in its frontmatter (the scanner reads it). Do not commit it. Open with a short
plain-English paragraph a shaper could read (the project was tidied; nothing about their boards changed). Then
record:
- each deleted branch with its tip SHA (from git's "Deleted branch" lines), and that the three GitHub branches
  are left for the orchestrator at push time;
- the two worktrees and the orphan folder removed, and the star-named folder;
- the five images, the cache untracking (7 untracked from git, 9 still on disk), and the `.env.example` finding:
  line 47's `.env*` had been silently re-ignoring it, so the founder's hand-made file would never have been
  committed — now fixed by one allowance line;
- the eleven lint warnings, each with what was done; the golden proof; the unit-test count;
- a table of every record closed with its evidence, including two corrections to STATE.md's table from the
  earlier milestone close for the orchestrator to carry: order-form-letter-blank-pages shipped in plan 08-09 (not
  a quick task), and WINDOWS entry 1 was in fact checked by Phase 1's own UAT the afternoon it was logged;
- the scanner's before and after counts (7 / 6 / 10 → 0 / 0 / 9) and the ledger's (open 2 → 0);
- **founder-only steps still open** (Claude cannot do these): move `client_secret_*.json` out of the project
  folder into a password manager; create `.env.example` at the repo root with the three names and no values
  (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=, CLERK_SECRET_KEY=, DATABASE_URL=) — it can now be committed; and the
  model-profile question from SPEC item 2, which is the orchestrator's to record from the founder's answer;
- the gates handed to the orchestrator (build, the full browser suite, STATE/SPEC/ROADMAP, the docs commit, the
  push and remote branch deletion on the founder's go), marked not run by the executor;
- anything that differed from the plan-time measurements, or "none".
</output>
