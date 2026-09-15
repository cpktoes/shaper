---
phase: quick-260914-rj0
plan: 01
subsystem: ui
tags: [fins, callout-system, playwright, geometry-layout, phone]

requires:
  - phase: 260822-vcs-viewer-callout-system
    provides: "components/viewer/callout-primitives.tsx — CALLOUT_PX/CALLOUT_CHAR_PX (the pinned 14 CSS px callout face and the shared width-per-character estimate) and useSvgFitScale"
  - phase: 01-04-fin-callout-centering-fix
    provides: "components/fins/fin-viewer.tsx's tier-stacking and dimsForMark geometry, unchanged by this task"
provides:
  - "components/fins/fin-label-layout.ts: a pure, React-free rule that nudges an off-tail height label's baseline along its own dimension line only when it would actually collide with another label, clamped so a number can never be pushed off the end of its own line or off-tail below the tail — fully unit-tested including idempotence"
  - "components/fins/fin-viewer.tsx: every dimension callout now carries measure (off-tail/toe/spread/off-rail) and role attributes on its <text>, and the three off-tail heights are run through the new spacing rule right after they are laid out"
  - "e2e/phone-fins-labels.spec.ts: browser proof that measures the real drawn ink (not a bounding box) of the three off-tail numbers on an iPhone and a Pixel 7, in Imperial and Metric, and proves the desktop numbers are pixel-identical to before"
affects: [fin-viewer, e2e-suite]

actuals:
  tokens: 8500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A diagram-layout decision that has to see every label on the drawing at once (not just one label in isolation) lives in its own pure module beside the component, following lib/models/autosave.ts's own pattern: named exported constants (never inline literals), a plain-English header explaining the decision, and a test file with a table of expected numbers computed by hand before the code existed."
    - "A shared calibration constant (CALLOUT_CHAR_PX / CALLOUT_PX.name) is imported and divided at the point of use, not copied as a new literal, so a new module tracks the source calibration if it's ever retuned."
    - "A browser test that has to prove two adjacent labels are legible measures the real drawn ink with a canvas 2d context (ctx.measureText's actualBoundingBox* fields) rather than trusting getBoundingClientRect — the em box of a line of type is taller than the letters actually drawn in it, so two boxes can touch while the numbers stay perfectly readable."
    - "Hooks that a later memo needs the resolved value of (here: the numeric valueFontSize, which useSvgFitScale/useRef produce) are hoisted above that memo in source order — every hook still runs unconditionally on every render, so this is safe, and keeps the new memo from having to guess at a font size."

key-files:
  created:
    - components/fins/fin-label-layout.ts
    - components/fins/fin-label-layout.test.ts
    - e2e/phone-fins-labels.spec.ts
  modified:
    - components/fins/fin-viewer.tsx

key-decisions:
  - "The spacing rule is a forward-then-backward bounded pass (push down for predecessors, then push up for successors, each pass clamped to the label's own dimension-line bounds) rather than a single monotone sweep — a single sweep was proven at plan time to drive the centre label straight through the tail line on an iPhone. Two labels only interact at all if their estimated x-ranges overlap; that gate is what keeps the desktop drawing (where the sideways tier stagger already gives enough separation) completely untouched."
  - "A bound the label's own untouched baseline already violates is relaxed to that untouched baseline, so the rule can never move a label to a position worse than where it started — proven by test 8 (never worse)."
  - "The off-tail labels are sorted by an explicit Record<FinRole, number> rank (front:0, rear:1, center:2) before the rule runs, per orchestrator ruling: that rank is also each label's top-to-bottom order on the drawing for every real fin setup, and stays correct even if an advanced override ever moves a dimension line."
  - "svgRef/useSvgFitScale/valueFontSize were hoisted above marksWithDims (they used to sit below it) so the new label-spacing memo has the resolved numeric font size available — every hook still fires unconditionally, in the same order, on every render."
  - "Only labelY is ever rewritten by the new memo; labelX, the dimension line, the ticks and the extension lines are copied through untouched, and the Summary's compact card (whose font is a CSS variable string, not a number) is bypassed entirely."

requirements-completed: [QT-260914-rj0]

coverage:
  - id: D1
    description: "On a phone, the three off-tail heights each read as their own number with visible air between them, on the Mid-length board, in Imperial and Metric, on an iPhone and a Pixel 7."
    requirement: QT-260914-rj0
    verification:
      - kind: unit
        ref: "components/fins/fin-label-layout.test.ts (tests 3 and 4: the Pixel 7 and iPhone fonts move the centre/rear/front labels to the exact plan-time-computed numbers)"
        status: pass
      - kind: e2e
        ref: "e2e/phone-fins-labels.spec.ts (iphone + android projects, imperial + metric: rear/centre real-ink air >= 2 CSS px, no ink overlaps)"
        status: pass
    human_judgment: false
  - id: D2
    description: "No height number ever prints below the board's tail line or above the fin it describes."
    requirement: QT-260914-rj0
    verification:
      - kind: unit
        ref: "components/fins/fin-label-layout.test.ts (test 7: bounds beat clearance, ink bottom stays above lineBottom)"
        status: pass
      - kind: e2e
        ref: "e2e/phone-fins-labels.spec.ts (every off-tail label's ink bottom <= 320.5, both phone projects, both unit systems)"
        status: pass
    human_judgment: false
  - id: D3
    description: "At 1280x800 the three numbers sit exactly where they sat before this task, to two decimal places, and the five desktop screenshot baselines pass untouched and unregenerated."
    requirement: QT-260914-rj0
    verification:
      - kind: unit
        ref: "components/fins/fin-label-layout.test.ts (tests 1 and 2: desktop font returns the Mid-length trio and the default thruster pair exactly unchanged, asserted with toBe)"
        status: pass
      - kind: e2e
        ref: "e2e/phone-fins-labels.spec.ts (desktop project: front/rear/centre x/y attributes toBeCloseTo the pre-task table to 2 decimals)"
        status: pass
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts --project=desktop (all five screens, including FINS, pass with no snapshot regeneration)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The rule is driven by the labels' own size and text, never by width/pointer/height — a phone held sideways lands in the desktop shell and is still fixed, because the type is still large there."
    requirement: QT-260914-rj0
    verification:
      - kind: unit
        ref: "components/fins/fin-label-layout.ts takes only text/fontSize/x/y/lineTop/lineBottom as input — grep -n \"max-shell\\|shell:\\|coarse\\|max-height\" returns nothing in this file"
        status: pass
      - kind: e2e
        ref: "e2e/phone-fins-landscape.spec.ts (unaffected — still passes, proving the short-screen/sideways-phone rule and this rule never collide)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The order the fins sit on the board is the order their numbers read down the page whenever two of them are close enough to interact."
    requirement: QT-260914-rj0
    verification:
      - kind: unit
        ref: "components/fins/fin-label-layout.test.ts (test 4: iPhone font — order front < rear < centre holds after the rule runs)"
        status: pass
      - kind: e2e
        ref: "e2e/phone-fins-labels.spec.ts (vacuousness guard: exactly 3 off-tail labels, roles sorted [center, front, rear])"
        status: pass
    human_judgment: false
  - id: D6
    description: "The rule lives in one pure file with no React in it, is proven in Vitest, and is idempotent."
    requirement: QT-260914-rj0
    verification:
      - kind: unit
        ref: "components/fins/fin-label-layout.test.ts (test 5: idempotence at all three fonts) plus grep -n \"react|window|document\" returning nothing"
        status: pass
    human_judgment: false
  - id: D7
    description: "The browser proof was run, shown to fail against the un-fixed drawing first, and its real output is recorded before anything ships."
    requirement: QT-260914-rj0
    verification:
      - kind: e2e
        ref: "e2e/phone-fins-labels.spec.ts --project=iphone against a one-line local revert (temporarily rendering labels from marksWithDims instead of marksWithAdjustedDims) — 2 failed, confirmed below, then restored and re-run — 2 passed"
        status: pass
    human_judgment: false
  - id: D8
    description: "The drawing's type size is untouched — a dimension still reads at 14 CSS px no matter how small the drawing is."
    verification: []
    human_judgment: true
    rationale: "valueFontSize's computation (CALLOUT_PX.value / fitScale) was moved earlier in the component's source order (hoisted above marksWithDims) but its formula was not touched — confirmed by code diff inspection. The browser test's own settle gate additionally depends on this: it polls the label's computed font-size moving away from the placeholder 14px value used before useSvgFitScale's layout effect runs, which would not work if the pinned-face calculation had changed."
---

# Quick Task 260914-rj0: The Rear-Fin and Centre-Fin Heights on the Fin Drawing Summary

**The three off-tail height numbers on the FINS drawing — how far the front fins, the rear fins and the centre fin sit up from the tail — now nudge apart along their own dimension lines only when they'd actually overlap, so on a phone the Mid-length board's rear (`6 1/4"`) and centre (`3 5/8"`) numbers no longer print on top of each other as `6 1/4"5/8"`; nothing moves for a mouse.**

## Performance

- **Duration:** ~16 min (task commits span 20:17:10 to 20:26:14 PDT)
- **Started:** 2026-09-14T20:10:49-07:00 (plan commit)
- **Completed:** 2026-09-14T20:26:14-07:00
- **Tasks:** 3 completed (Task 1 ran as a `tracer` per its own automated verify — no checkpoint stop, per orchestrator ruling)
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- **`components/fins/fin-label-layout.ts`** — a pure, React-free module with no browser API. Exports `FIN_LABEL_CHAR_EM` (derived from `CALLOUT_CHAR_PX / CALLOUT_PX.name`, not a new literal), `FIN_LABEL_CLEARANCE_EM` (1.05 em minimum baseline distance — leaves 2.52 CSS px of visible air at the pinned 14px callout face), `FIN_LABEL_INK_TOP_EM`/`FIN_LABEL_INK_BOTTOM_EM` (the per-label bounds that keep a number below the fin it describes and above the tail line), `estimateFinLabelWidth`, and `layoutFinLabelBaselines` — the rule itself: two labels interact only if their estimated x-ranges overlap; a forward pass pushes each label down only as far as interacting predecessors demand (clamped to its own dimension line); a backward pass pushes back up only as far as interacting successors still demand (clamped the other way). Bounds always win over clearance, so a number is never pushed off the end of its own line. Written test-first: all nine cases in `fin-label-layout.test.ts` were committed failing (module didn't exist), then implemented and made to pass in the same commit — `npm test -- components/fins/fin-label-layout.test.ts` showed 0 tests/module-not-found before the implementation, 10 passed after.
- **`components/fins/fin-viewer.tsx`** — every dimension (`PlainDim`/`BelowDim`/`RailVDim`) now carries a `measure: "off-tail" | "toe" | "spread" | "off-rail"` field, set at each of the five push sites in `dimsForMark`. The label render pass puts `data-fin-dim`/`data-fin-role` on every `<text>`, so a test can find a label by what it measures rather than by matching its text. A new memo (`marksWithAdjustedDims`) sits right after `marksWithDims`, bails out unchanged for the Summary's compact card (a CSS-variable font size, not a number) or when fewer than two off-tail labels exist, otherwise collects every `off-tail` dim across every fin mark, sorts front-then-rear-then-centre, and calls `layoutFinLabelBaselines`, writing back only the changed `labelY` values. Both the dimension-line render pass and the label render pass now read from this memo. Nothing else about the drawing changed: `labelX`, the dimension line coordinates, the ticks, the extension lines, `SCALE`, `ORIGIN_X`, `TAIL_Y`, and the sideways tier stagger are all bit-for-bit as they were.
- **`e2e/phone-fins-labels.spec.ts`** — loads the Mid-length board (a quad with the centre fin on) through the real setup-screen flow, opens FINS, waits for the drawing's real fit scale to settle, and proves the test isn't vacuous (exactly three off-tail labels, roles `[center, front, rear]`) before measuring anything. Measures the actual drawn ink of each label with a canvas 2d context (`ctx.measureText`'s `actualBoundingBox*` fields) rather than a DOM bounding box, because a line of type's em box is taller than the letters actually drawn in it. On the two phone projects, in both Imperial and Metric, it asserts the rear and centre labels' ink keeps at least 2 real CSS px of air, that no two of the three ink boxes overlap at all, and that nothing prints past the tail line. On desktop it asserts the three labels' raw `x`/`y` attributes are pixel-identical to the pre-task measured table — the "nothing moved for a mouse" proof.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer, TDD): the pure spacing rule with its own tests** — `4f8afb8` (fix)
2. **Task 2: wire the rule into the fin drawing, label every dimension with what it measures** — `d2f6f56` (feat)
3. **Task 3: the browser proof — two phones, both unit systems, plus the desktop and sideways-phone regressions** — `e29fbed` (test)

## Files Created/Modified

- `components/fins/fin-label-layout.ts` — the pure spacing rule: constants, `estimateFinLabelWidth`, `layoutFinLabelBaselines`.
- `components/fins/fin-label-layout.test.ts` — 10 Vitest cases (9 behavioural + the calibration-constant check), driving every branch against the plan's own measured table.
- `components/fins/fin-viewer.tsx` — `FinDimMeasure` type, `measure` field on every dim, `data-fin-dim`/`data-fin-role` on every label, the new `marksWithAdjustedDims` memo, hooks reordered so the memo has the resolved font size available.
- `e2e/phone-fins-labels.spec.ts` — the browser proof: navigation helper, ink-measurement helper, phone block (2 projects x 2 unit systems), desktop block (pixel-identical attributes).

## Decisions Made

- The spacing rule is a bounded forward-then-backward pass, not a single monotone sweep — the plan proved at plan time that a single sweep drives the centre label through the tail line on an iPhone.
- Two labels only ever interact if their estimated x-ranges overlap; that gate is what keeps the desktop drawing completely untouched even though front and rear technically overlap sideways there — they're already 40+ units apart vertically, well clear of the ~11.5-unit clearance requirement at that font size.
- A bound already violated by a label's own untouched baseline is relaxed to that baseline, so the rule can never make a label's position worse than where it started (proven by test 8).
- The browser test measures real ink via canvas, not `getBoundingClientRect`, because two labels' line-height boxes can touch while the numbers themselves stay perfectly legible — it's the ink that has to be clear.

## Deviations from Plan

None — plan executed exactly as written. Every constant, test count, expected number, and file boundary in the plan matched what was implemented; no auto-fixes, no architectural questions, no scope changes.

## Issues Encountered

None. All four Playwright runs and the full Vitest suite passed on the first attempt after implementation; the one-line temporary revert used to prove the browser test catches the bug (Task 3's own required step) was restored exactly, confirmed clean via `git diff --stat` before its own commit.

## User Setup Required

None — no external service configuration required. No database, schema, or migration touched; no `.env*` file touched; no new dependency added.

## Human Verification Deferred

Per this task's orchestrator ruling (`human_verify_mode: end-of-phase`, no interim checkpoints), nothing was deferred to a human mid-task. One coverage item (D8, "the drawing's type size is untouched") is marked `human_judgment: true` above because it rests on code-diff inspection (the `valueFontSize` formula itself was not touched, only reordered in source) rather than a dedicated automated assertion — a human confirming the FINS screen still reads the same type size on a real phone would close that out, but nothing in this task's own must-haves required a new test for it.

## Next Phase Readiness

- All 3 commits are in this worktree, on top of `82cd7c9` (this task's own plan commit) / `ce54605` (main at dispatch): `4f8afb8`, `d2f6f56`, `e29fbed`.
- Full local verification in this worktree: `npm test` (62 files, 2498 passed, 2 skipped), `npx tsc --noEmit` (clean except the two known phantom `LayoutProps` errors in `app/layout.tsx`/`app/design/layout.tsx`, a pre-existing worktree artefact), `npm run lint` (0 errors, 12 pre-existing warnings unrelated to this task's files).
- All four required Playwright runs executed from this worktree with `PW_PORT=3141 IS_WEBPACK_TEST=1`:
  1. **Prove-it-catches-the-bug run** (`--project=iphone`, against a one-line local revert to `marksWithDims`, not committed): **2 failed** — `expect(lower.top - upper.bottom).toBeGreaterThanOrEqual(2 / upper.fitScale)` received `-26.96` (imperial) and `-23.02` (metric) against an expected `>= 4.67`. Restored the fix, re-ran: **2 passed**, 1 skipped (desktop-only test correctly skipped on the iphone project).
  2. **`e2e/phone-fins-labels.spec.ts`, all three projects**: **5 passed**, 4 skipped (cross-project skip stubs) — iphone imperial/metric, android imperial/metric, desktop attribute test.
  3. **`e2e/desktop-baseline.spec.ts --project=desktop`**: **5 passed** (TEMPLATE, ROCKER, RAILS, VOLUME, FINS) — `git status` shows no change under `e2e/desktop-baseline.spec.ts-snapshots/`.
  4. **`e2e/phone-fins-landscape.spec.ts`, all three projects**: **2 passed** (android sideways-phone, desktop full-height), 4 skipped — unaffected by this task.
- No database, schema or migration touched; no `.env*` file touched; nothing under `drizzle/` or `lib/db/`.

---
*Phase: quick-260914-rj0*
*Completed: 2026-09-14*
