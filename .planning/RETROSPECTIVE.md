# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2 — Rails Finished, Phone Ready

**Shipped:** 2026-09-12
**Phases:** 3 (8–10) | **Plans:** 29 | **Sessions:** ~12 across 2026-09-06 → 2026-09-12

### What Was Built
- The RAILS screen's missing third tab — INSTRUCTIONS with a named live example rail, Flat/Domed, View Full Sized at 1:1, a plan/side reference — and the sheet folded into the printed order form with byte-identical PDFs when unticked.
- One shared DesignScreenShell that stacks all five design screens on a phone, thumb-sized controls under a separate pointer switch, drag under a finger with measured hit zones, and Playwright proof on iPhone/Android/desktop.
- Everything around the design screens on a phone: dialogs, account controls and the home screen sized for a thumb; a floored board-card picture; sideways treated as a normal browser; the drawing column scrolling on a short screen — all walked on a real iPhone.

### What Worked
- **Real phones in the founder's hand found every defect that mattered** (the 844px sideways width, the zero-height cards, the unscrollable drawing column) — none of which an emulator could see.
- **Code review between the last code wave and the human checkpoint**, with fixes dispatched from exact per-finding designs, closed 1 critical + 6 warnings across three rounds in the same session they were found.
- **Compiled-CSS contract tests** proved what Playwright cannot emulate (iOS-only gating, `!important` cascade wins, the layout switch's boundary).
- **The post-merge full Playwright run on main** was, again, where the only cross-plan defects appeared; per-plan self-checks never caught one.

### What Was Inefficient
- A fix shipped on an emulator's number (750px sideways) and was reverted six hours later on the founder's verdict — a real-device check before the fix would have saved a wave.
- Two executors started background test runs and returned to "wait", despite explicit instructions; one orphaned run had to be killed to stop it flaking its sibling.
- A machine load spike (desktop apps, load 250–500) turned a six-minute suite into 1.7 hours and produced false failures that had to be re-proven individually.
- A same-wave gate dependency (the RAILS fix keyed on a variant the sibling plan was removing) reached code review before it was caught.
- The avatar's five-tap sweep question was mis-specified — a 2mm ring against an 8mm fingertip — and could not answer itself.

### Patterns Established
- Width picks the layout (820px), pointer picks control size, height (500px) picks whether a short screen scrolls and where the FINS key sits — three switches, never conflated, now written in CLAUDE.md.
- Every executor prompt carries `PW_PORT`, `IS_WEBPACK_TEST=1` for worktrees, the no-`--update-snapshots` rule, the no-`git stash` rule, and the "never wait on a background job" rule.
- A human checkpoint parks as `.continue-here.md`; the sweep sheet records every answer verbatim and marks unwalked cells explicitly; requirement rows carry any founder exception in the same commit that marks them complete.
- Sweep questions must be behaviours a thumb can resolve, with a distance the hardware can distinguish.

### Key Lessons
1. When a real phone contradicts a plan, re-derive which symptom belongs to which mechanism before changing the mechanism — two of three "layout switch" symptoms were separate bugs.
2. A plan in the same wave as a variant change must not gate its fix on that variant; serialise, or gate on the axis that survives.
3. Test failures during a load spike are not evidence: check whether the change can reach the failing screen, whether the failure is an assertion or a timeout, and whether the spec passes alone when load is sane.
4. A latent desktop-only bug (no overflow on the drawing column) surfaces the day a short screen enters the desktop layout — audit the desktop shell for height assumptions when phones can land in it.

### Cost Observations
- Model mix: planning on opus; execution, review and verification on sonnet; plan-checking and integration-checking on haiku.
- Sessions: ~12.
- Notable: the phase-10 gap rounds cost roughly as much as the phase's first pass; most of that was the machine, not the model — one 1.7-hour suite run and ~40 minutes of waiting on an overloaded desktop.

---

## Milestone: v1.3 — Rocker from Real Blanks

**Shipped:** 2026-09-26
**Phases:** 1 (11) | **Plans:** 13 | **Sessions:** ~3 across 2026-09-25 → 2026-09-26

### What Was Built
- The blank maths first — PCHIP with SciPy parity, a catalogue reader that never stores 0, levelling to exactly 0, the board on the blank, a fit check at every point, a foil scaled to the centre thickness with eased tips — with four named tests green before any UI.
- 162 real blanks seeded from three vendor CSVs behind a read that cannot break the page, and the ROCKER screen rebuilt around picking a blank and sliding the board along it, with every blank that won't fit named with why.
- Fit & Tip Defaults on the account; saved boards at version 4 with the blank travelling with the board; presets in provisional real blanks; production migrated and seeded before the deploy and checked live.

### What Worked
- **Opus executors in worktrees were fast and clean:** 12 code plans in 6 waves, every one inside its file list, 5–43 minutes each; the post-merge full Playwright run on main was again the real gate.
- **Founder rulings written back as decisions before planning** (D-17–D-20) meant no downstream agent had to guess at the foil, the tip ease, the ratio or the seed's tooling.
- **Code review before the human checkpoint caught a production-order bug** (CR-01) that would have broken every Imperial/Metric and print save on deploy — and the fix was a rule, not code.
- **A read-only proof around the production migration** turned drizzle's silent "applied successfully" into numbers: 6 migrations, 0 → 162 rows, before and after the seed.
- **The whole DONE WHEN walked first in UAT**, then the verifier's piece-checks; the founder's two "pass, but…" remarks became todos, not gaps.

### What Was Inefficient
- A hydration race in a new phone test surfaced only on main's Turbopack server, one wave after the test was written.
- The api-coverage gate blocked UAT on the words "Store API" in a plan; a one-line declaration cleared it, after a 200-character limit tripped once.
- Phones over Wi-Fi hit the dev server's cross-origin default on the first UAT attempt; ten minutes to diagnose from the server log, one config line to fix.
- The completion helper called the verification stale the moment the production step's summary landed; an addendum to the report was needed before the phase could close.

### Patterns Established
- Expand-first migrations: additive changes reach production before the deploy; removals after (CLAUDE.md Database, amended 2026-09-26).
- The production step runs in the founder's own terminal with proof before and after the seed; the assistant merges, pushes and watches the deploy for a marker the old build never served.
- Human UAT items come from the verifier's frontmatter with the phase's own DONE WHEN on top; ideas raised mid-UAT go to `## Deferred Follow-Ups` and then to todos.
- Never name a `.env*` path in a shell command; never wait on a prompt the assistant cannot answer — say what to press.

### Key Lessons
1. Check what the ORM sends on insert before choosing a migration order — "code first, then migrate" was wrong for every nullable column added to a table the live code already writes.
2. A keyword gate that can block a workflow needs its escape hatch known in advance (the COVERAGE.md declaration), or it costs the founder's time mid-UAT.
3. The verifier's human items are piece-checks; the whole flow, walked by the shaper it was built for, belongs at the top of the UAT.
4. A spec-locked, one-phase milestone still wants a requirements archive — write it from the spec's numbered list at close so the next audit has a matrix to read.

### Cost Observations
- Model mix: planning and execution on opus; verification, plan-checking and the fixer on sonnet; UI checker on haiku.
- Sessions: ~3 (one long session, compacted twice).
- Notable: 13 plans planned, executed, reviewed, verified, walked and shipped to production in about 36 hours of wall clock; the two production commands took under ten minutes with the founder present.

---

## Milestone: v1.4 — Foil the Way a Shaper Cuts It

**Shipped:** 2026-09-27
**Phases:** 1 (12) | **Plans:** 10 | **Sessions:** ~2 across 2026-09-26 → 2026-09-27

### What Was Built
- Phase 11's foil pinned in a golden fixture generated from tag `v1.3`, then replaced by the planer's cut — a constant deck skin, the bottom planed parallel to the blank's down to the centre thickness, the tips thinned last inside 12" with the deck or the bottom pinned — with six named geometry tests green on every seeded blank before any screen moved.
- The ROCKER screen's Deck Skin slider, OFF BOTTOM column and planer-pass count, Tip Style and Fine-tune off pills, and the DATASHEET's FOAM OFF Deck and Bottom rows; Fit & Tip Defaults grown to seven with Planer Max Depth in place of Extra Center Thickness; the fit check refusing a board under 1/8" or without a pass under its centre.
- Saved boards at version 5 with the cut on the blank, every Phase 11 board reopening with its five station numbers kept; production migrated before the merge and the live site walked the same night.

### What Worked
- **A golden from the last release tag before touching the maths:** the fixture made "nothing a shaper cut to may move" a named test over 39 boards rather than a promise, and the same read-only script proved it on production (10 of 10 open, 1 of 1 kept).
- **Expand-and-contract applied to types, not just columns:** optional cut fields with one fallback in 12-01, every caller migrated across three plans, then the fields made required and the fallback deleted in 12-09 — the compiler closed the loop.
- **Research measured before the founder ruled:** the 65% of Phase 11 boards that would open flagged, the 9–31% of blank × tip combinations where the tip is thicker than the parallel cut, the 1-in-1,953 one-pass failures — so D-14, D-15 and D-16 were rulings on counted numbers, not guesses.
- **The v1.3 shape ran again without friction:** discuss → plan → five waves → code review → verify → UAT with the DONE WHEN first → production migrated before the merge, in about 21 hours of wall clock.
- **The code review's two warnings were real:** a dead-end flag (WR-01) and copy that stopped being true once a Deck tweak was set (WR-02), both fixed before the founder saw the screen; the three notes it did not fix became founder questions rather than silent skips.

### What Was Inefficient
- 12-02's imperial read-back tripped over a pre-existing parser bug (a bare 11/16" read an inch high); the plan worked around it inside a test and the fix waited for a quick task the next morning — the sweep should have failed loudly and filed the bug in the same commit.
- 12-08 found a stall the earlier waves had introduced (a 12" fine-tune pushed past the Deck Skin froze the ROCKER page); its own test was steered around it and the fix landed as a separate orchestrator commit in the same wave (d1d96fc).
- One Android browser-test flake (Clerk's boot traffic inside a "no request" window) cost a full-suite run before the timing fix (df0fa10).
- `summary-extract` again returned each summary's first DEVIATION line as its one-liner and counted 0 tasks, so the MILESTONES entry, the task count and the archive header were written by hand.

### Patterns Established
- Replacing a calculator: pin the old numbers from the last release tag first, keep the old maths only inside the carry-over reader, and decide the carry-over by the saved value's shape, never its version stamp.
- A retired column stays declared until its own DROP after the deploy (D-19) — a DROP never rides in the same migrate run as an additive change.
- Review findings the orchestrator rules out are written into the UAT as founder questions, so the close can name them instead of losing them.

### Key Lessons
1. When a phase changes numbers a shaper already cut to, the carry-over is a requirement with its own named test, and the read-only proof script runs on production too.
2. A per-board setting a saved board should remember (Tip Style) needs its ROCKER control even when the founder first asked for an account default only — ask "should a saved board remember this?" at discussion, before planning.
3. A workaround inside a test is a bug report in disguise — file the todo in the same commit, not the next morning.

### Cost Observations
- Model mix: the quality profile, as in v1.3 — planning and execution on opus; verification, review and the fixer on sonnet; the UI checker on haiku.
- Sessions: ~2 (one long session compacted, then the founder's production and UAT session).
- Notable: opened the afternoon v1.3 shipped and closed the next morning — about 21 hours from the first commit to the last, with production migrated, deployed and walked inside that window.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | — | 4 (1–4) | Prototype ported into a real app; geometry math isolated in `lib/geometry/` with golden fixtures |
| v1.1 | — | 3 (5–7) | Units as display-only preference; byte-identical PDF proofs; milestone audit before close |
| v1.2 | ~12 | 3 (8–10) | Real-device sweeps as the only proof for phone work; code review between last code wave and human checkpoint; Playwright projects + desktop baselines |
| v1.3 | ~3 | 1 (11) | Opus executors in worktrees; founder rulings as D-NN before planning; expand-first migrations; the production step run with the founder present; the DONE WHEN walked first in UAT |
| v1.4 | ~2 | 1 (12) | A golden from the last release tag before replacing a calculator; expand-and-contract on types; research counted the carry-over before the founder ruled; review notes ruled out become founder questions in the UAT |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | ~1,900 unit | — | — |
| v1.1 | ~2,240 unit | — | 0 new runtime deps |
| v1.2 | 2,463 unit + 225 browser | — | Playwright (dev-only) |
| v1.3 | 2,865 unit + 293 browser | — | 0 new deps (D-20) |
| v1.4 | 3,043 unit + 360 browser | — | 0 new deps (R11) |

### Top Lessons (Verified Across Milestones)
1. Proof that a machine can run (golden fixtures, byte-identical PDFs, compiled-CSS contracts) beats prose in a summary — every milestone found at least one "Self-Check: PASSED" that main's own run disproved.
2. The founder's hands are the final instrument for anything printed or held — v1.1's ruler-checked 1:1 templates and v1.2's real-phone sweeps both caught what tests could not.
3. Numbers a shaper already cut to are pinned before they are changed — v1.3's R16 and v1.4's R7 both put the named geometry tests before the first screen commit, v1.4 added a golden from the previous release tag, and both closes proved the order by git ancestry.
