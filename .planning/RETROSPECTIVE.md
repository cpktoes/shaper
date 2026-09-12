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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | — | 4 (1–4) | Prototype ported into a real app; geometry math isolated in `lib/geometry/` with golden fixtures |
| v1.1 | — | 3 (5–7) | Units as display-only preference; byte-identical PDF proofs; milestone audit before close |
| v1.2 | ~12 | 3 (8–10) | Real-device sweeps as the only proof for phone work; code review between last code wave and human checkpoint; Playwright projects + desktop baselines |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | ~1,900 unit | — | — |
| v1.1 | ~2,240 unit | — | 0 new runtime deps |
| v1.2 | 2,463 unit + 225 browser | — | Playwright (dev-only) |

### Top Lessons (Verified Across Milestones)
1. Proof that a machine can run (golden fixtures, byte-identical PDFs, compiled-CSS contracts) beats prose in a summary — every milestone found at least one "Self-Check: PASSED" that main's own run disproved.
2. The founder's hands are the final instrument for anything printed or held — v1.1's ruler-checked 1:1 templates and v1.2's real-phone sweeps both caught what tests could not.
