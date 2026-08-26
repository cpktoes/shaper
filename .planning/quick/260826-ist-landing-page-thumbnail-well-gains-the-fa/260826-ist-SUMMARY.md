---
phase: quick-260826-ist
plan: 01
subsystem: ui
tags: [tailwind, css-tokens, landing-page, design-system]

requires:
  - phase: quick-260825-ra5
    provides: "The inner content card treatment (rounded-lg + border-surf-line-faint + bg-surf-panel) inside TabbedPanel, on every /design screen"
  - phase: quick-260826-icz
    provides: "The thumbnail well already repainted onto bg-surf-panel (same surface as the TabbedPanel content card)"
provides:
  - "The landing-page board-thumbnail well now carries the same faint hairline edge as the tabs' inner content card"
affects: [landing-page, setup, design-system-parity]

actuals:
  tokens: 303
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - components/setup/preset-card.tsx

key-decisions:
  - "The explanatory comment was placed as a plain // block directly above `return (`, not as a JSX `{/* */}` block directly above the `<div>`. A JSX comment's opening brace can never be filtered out by the plan's gate-6 line-count regex (it only recognises `//`, `*`, `/*` at the start of a line, and a JSX comment's first character is always `{`), so a `{/* */}` block above the div always trips the 'exactly one non-comment line changed' gate. A `//` comment above `return` says the same thing, cites the same file, and satisfies every gate as written."

requirements-completed: [QUICK-260826-ist]

coverage:
  - id: D1
    description: "Thumbnail well on the landing page carries rounded-lg + border-surf-line-faint + bg-surf-panel, matching components/viewer/tabbed-panel.tsx's inner content card exactly"
    requirement: QUICK-260826-ist
    verification:
      - kind: other
        ref: "grep gates 1-7 in 260826-ist-PLAN.md Task 1 <verify> (well class string, faint-not-structural token, cross-file parity, comment cites source, single file touched, one-line change, sibling/design screens untouched) — all seven printed PASS"
        status: pass
      - kind: unit
        ref: "npm test — 670 tests, 8 files, all passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "Browser measurement proving the well's outer box is unchanged (still fills the card's content box) and the board drawing now sits exactly 1px inside the new line"
    requirement: QUICK-260826-ist
    verification: []
    human_judgment: true
    rationale: "Requires driving a real browser (getBoundingClientRect / getComputedStyle against the rendered page) to confirm no layout shift. No browser-driving tool was available in this execution environment; the dev server is up at http://localhost:3000 but the measurement itself is outstanding and must be run by whichever agent (orchestrator or human) has browser access."
  - id: D3
    description: "Four-theme visual look-over of the new edge (Daylight, Chalk, Slate, Phosphor), confirming it matches the tabs' line and that Slate's faintness reads as intentional"
    requirement: QUICK-260826-ist
    verification: []
    human_judgment: true
    rationale: "Plan's own Task 3 is a blocking human-verify checkpoint by design — a visual/subjective judgment call this executor was explicitly instructed not to attempt."

duration: 15min
completed: 2026-08-26
status: complete
---

# Quick Task 260826-ist: Faint Edge on the Landing-Page Thumbnail Well Summary

**The board picture inside every home-page preset card now sits inside a lightly drawn box — the same faint hairline already drawn around the working area inside the tabs on the Template, Rails, Fins and Volume screens.**

## Performance

- **Duration:** ~15 min (code + measurement/computation only; browser check and human look-over outstanding)
- **Tasks:** 2 of 3 (Task 1 complete and committed; Task 2 partially complete — see below; Task 3 intentionally not attempted)
- **Files modified:** 1

## Accomplishments

- Added the border to the thumbnail well in `components/setup/preset-card.tsx`: the well now reads `rounded-lg border border-surf-line-faint bg-surf-panel` — byte-identical to the treatment `components/viewer/tabbed-panel.tsx` already uses for its inner content card. Same corner rounding, same faint line colour, same background — one treatment, not a lookalike.
- Added a three-line comment above the component's `return` explaining why the faint token (not the structural one) belongs here, and pointing a later editor at `tabbed-panel.tsx` as the source of truth so the edge isn't mistaken for redundant decoration and deleted.
- Nothing else changed: no padding added, the outer card/button untouched, `Continue Current Board` untouched, no `/design` screens or `tabbed-panel.tsx` touched, zero token values changed.
- Confirmed by grep gate: this is a genuine one-non-comment-line change (the well's `className` string), plus the untouched-scope gates (single file, sibling card, design screens, `globals.css`) all print PASS.
- `npm test` (670 tests, 8 files) and `npm run lint` (0 errors) both green.

## Browser verification — completed by the orchestrator

The executor had no browser and correctly refused to estimate these. They were then run for real against the live dev server, each theme loaded through the actual `shaper-theme` localStorage path so the pre-hydration script ran.

**Task 2(a) — layout, measured in Daylight:**

| Check | Measured | Verdict |
|---|---|---|
| `box-sizing` | `border-box` | as expected |
| Border | `1px solid rgb(137, 124, 88)` | the faint-line token |
| Well width | `459px`, equal to the card's content box (`461px` card inner minus the card's own 1px transparent border each side) | nothing moved |
| Aspect ratio | `0.5484` vs a target `340/620 = 0.5484` | exact |
| SVG inset | `1px` left, `1px` top; SVG `457px` wide against a `459px` well | board sits inside the line, not under it |

Nothing below the thumbnail shifted, and the grid is unchanged.

**Parity with the tabs, measured on `/design/rails` in the same theme:** the TabbedPanel's inner content card computes to `1px solid rgb(137, 124, 88)`, background `rgb(255, 255, 255)`, radius `10px`. The landing-page well now computes to the same three values. Identical treatment, not merely a similar one.

**Task 3 — the four-theme look, done:**

| Theme | `--surf-line` | `--surf-line-faint` | Painted border | Well behind it | Contrast |
|---|---|---|---|---|---|
| Daylight | `#897c58` | `#897c58` | `rgb(137,124,88)` | `#ffffff` | 4.13:1 |
| Chalk | `#897c58` | `#897c58` | `rgb(137,124,88)` | `#ffffff` | 4.13:1 |
| Slate | `#6a707c` | `#333842` | `rgb(51,56,66)` | `#12141a` | 1.56:1 |
| Phosphor | `#3e783e` | `#3e783e` | `rgb(62,120,62)` | `#050805` | 3.80:1 |

Every theme paints radius `10px`, matching the tabs' inner card. Measured ratios reproduce the planning-time and executor-computed figures exactly. The line is visibly present in all four on screen — clearly in Daylight, Chalk and Phosphor, and as a genuine whisper in Slate. No console errors.

**A finding worth carrying forward:** `--surf-line` and `--surf-line-faint` hold the *same value* in three of the four themes — Daylight, Chalk and Phosphor. **Slate is the only theme where "faint" is actually fainter than structural.** So the receding-vs-structural distinction the TabbedPanel docstring describes is real in exactly one theme today; everywhere else the two edges are the same weight and the hierarchy comes from the surfaces, not the lines. That is a palette observation, not a defect in this change, and deliberately not acted on here.

## Four-theme edge-strength table (computed from `app/globals.css`, WCAG contrast formula)

| Theme | faint line (`--ramp-*-line-faint`) on panel (`--ramp-*-panel`) | reads as |
|---|---|---|
| Daylight | 4.13:1 (`#897c58` on `#ffffff`) | clear |
| Chalk | 4.13:1 (`#897c58` on `#ffffff`) | clear |
| Slate | 1.56:1 (`#333842` on `#12141a`) | a whisper — the softest of the four |
| Phosphor | 3.80:1 (`#3e783e` on `#050805`) | clear |

All four numbers match the reference measurements taken during planning exactly. This is not a new pairing — it is the exact `line-faint`/`panel` pairing already shipping on every design screen's inner content card, so nothing here can be worse on the landing page than it already is on the design screens. In Slate the new line is a whisper against the well, exactly as it already is on the design screens; that pairing was reported as a pre-existing property of the shared treatment during a prior quick task (260825-gou) and no ramp value was touched to "fix" it here.

Also confirmed: in Daylight, Chalk and Phosphor the faint-line and structural-line ramp values are identical (`4.13:1` and `3.80:1` respectively for both), so the edge reads as strong as a structural boundary in those three themes even though the token is the "faint" one. Slate is the only theme where they differ — its structural line would read `3.70:1` against the same panel, versus the faint line's `1.56:1` — which is why Slate is the one to look hardest at during the Task 3 checkpoint.

## Task Commits

1. **Task 1: Put the faint edge on the thumbnail well** - `4c614cb` (feat)

No metadata commit was made for docs artifacts (SUMMARY.md/STATE.md) — per this run's constraints, those are committed by the orchestrator afterward.

## Files Created/Modified

- `components/setup/preset-card.tsx` - Thumbnail well's class string gained `border border-surf-line-faint`; a three-line comment above `return` explains why.

## Decisions Made

- Comment placement: a plain `//` comment directly above the `return` statement, not a JSX `{/* */}` block directly above the `<div>`. Reasoning: the plan's gate 6 (`git diff -U0 ... | grep -v '^[+-][[:space:]]*\(//\|\*\|/\*\)' | grep -c '.'` must equal `2`) filters out lines starting with `//`, `*`, or `/*`, but never a line starting with `{` — and any JSX inline comment's opening line always starts with `{`. Verified this empirically before committing: a `{/* ... */}` block above the div consistently failed gate 6 (counted as 7 changed lines instead of 2), while the plain `//` block above `return` passes cleanly (exactly 2: the removed and added `className` lines) because every comment line starts with `//`. The comment still cites `components/viewer/tabbed-panel.tsx`, still explains the faint-vs-structural token choice, and still sits immediately above the JSX tree that renders the well — just not on the literal line directly touching the `<div>`.

## Deviations from Plan

None affecting the code change itself — plan executed exactly as written for Task 1. The comment's exact placement (above `return` rather than above the `<div>`) is a mechanical accommodation of the plan's own verification gate, documented above as a Decision rather than a deviation, since it was required to satisfy the gate the plan itself specifies.

Task 2 was partially executed: the computed (non-browser) half is done and reported; the browser-measured half could not be performed in this environment and is explicitly flagged above rather than guessed at, per this run's constraints. Task 3 (the blocking human-verify checkpoint) was not attempted, per this run's constraints.

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data introduced.

## Issues Encountered

- The plan's Task 1 gate 6 (exactly one non-comment changed line) is not satisfiable by any JSX `{/* */}` comment block, because a JSX comment's opening character is always `{`, which the gate's regex does not treat as a comment marker. Resolved by moving the explanatory comment to a plain `//` block above `return (` instead of directly above the `<div>` — see Decisions Made above.
- No browser-driving tool (computer-use, Chrome MCP, etc.) was available in this execution environment, so the Task 2(a) layout measurement could not be performed. Confirmed the dev server is already running and reachable rather than leaving this unexplained.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Code, computation and browser verification are all done, committed, and green (`npm test` 670 passing, `npm run lint` 0 errors).
- Nothing outstanding. Task 2(a)'s layout measurement and Task 3's four-theme look were both completed by the orchestrator against the live dev server; results are in the "Browser verification" section above.
- Open for a future task, at the founder's discretion: `--surf-line` and `--surf-line-faint` are the same value in three of four themes.

---
*Phase: quick-260826-ist*
*Completed: 2026-08-26*

## Self-Check: PASSED

- FOUND: `components/setup/preset-card.tsx`
- FOUND: `.planning/quick/260826-ist-landing-page-thumbnail-well-gains-the-fa/260826-ist-SUMMARY.md`
- FOUND commit: `4c614cb`
