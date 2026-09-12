---
phase: 10-the-whole-app-on-a-phone
plan: 11
subsystem: rails-screen-phone-layout
tags: [phone-layout, rails, instructions-tab, playwright]
dependency-graph:
  requires: ["10-09"]
  provides: ["RAILS INSTRUCTIONS tab no longer shows the rail-band controls on a phone"]
  affects: ["components/rails/rail-band-editor.tsx", "e2e/phone-rails.spec.ts"]
tech-stack:
  added: []
  patterns:
    - "Always-present wrapper element whose class alone follows active-tab state, so the shell's `controls` prop never changes shape between tabs — only its phone-only visibility does."
key-files:
  created: []
  modified:
    - "components/rails/rail-band-editor.tsx"
    - "e2e/phone-rails.spec.ts"
decisions:
  - "Fix lives entirely inside rail-band-editor.tsx as a wrapper div around RailControls, never as a new DesignScreenShell prop, so this plan cannot collide with the sibling wave-6 plan editing the shell."
  - "Desktop is deliberately left unchanged. The same oddity exists there (a control column beside a page none of its controls target), but the standing rule for this phase is that nothing a mouse sees changes, and the founder has not been asked. Recorded as an open question, not decided here."
metrics:
  duration: "~50m"
  completed: "2026-09-12"
actuals:
  tokens: 1632
  tasks: 2
  commits: 3
status: complete
---

# Phase 10 Plan 11: Stop showing the RAILS controls under a page they don't act on Summary

Wrapped the rail-band controls in an always-present element inside `rail-band-editor.tsx` whose
class alone follows the active tab, so on a phone the rail-band control column disappears on
INSTRUCTIONS (read-only reference reading) and stays exactly where it was, one tap away, on VIEWER
and DATA — closing the shaper's own 2026-09-11 finding, "rails keeps the controls under all 3
tabs," for an **upright** phone, without touching the shared shell or any other screen. **(CR-01,
10-REVIEW-3.md, corrected after this SUMMARY first shipped: a phone turned sideways is deliberately
left in the same open bucket as a desktop mouse — see "The open question for the founder" below —
because D-10, landing one plan earlier in this very round, already moved that orientation into the
desktop shell, where this fix's `max-shell:` gate cannot fire. The finding is closed for the
orientation the shaper actually reported it in; sideways was never tested by this plan and is not
claimed closed here.)**

## What shipped

- `components/rails/rail-band-editor.tsx`: the `controls` value handed to `DesignScreenShell` is
  now wrapped in a single `<div>` that is present on every tab. On INSTRUCTIONS it carries
  `max-shell:hidden` (a phone-only rule); on VIEWER and DATA it carries no class at all. The
  comment above the block (which already said INSTRUCTIONS "is read-only reference content with no
  control targeting it") is extended to say that sentence is now acted on, and to record the
  desktop side of the same oddity as an open, unanswered question rather than a silent fix.
- `e2e/phone-rails.spec.ts`: one new phone test proving the control column's own heading ("Rail
  Band Calculator") is out of sight on INSTRUCTIONS and back in sight on VIEWER and DATA; one new
  desktop test proving a mouse still sees it on all three tabs, with a comment naming the
  unresolved desktop question by name.

## Results, as required by the plan's output spec

**Six phone results** (both phone projects, run with `PW_PORT=3111 IS_WEBPACK_TEST=1`):

| Project | Tab | Rail Band Calculator heading |
|---|---|---|
| iphone | VIEWER | visible (PASS) |
| iphone | DATA | visible (PASS) |
| iphone | INSTRUCTIONS | not visible (PASS) |
| android | VIEWER | visible (PASS) |
| android | DATA | visible (PASS) |
| android | INSTRUCTIONS | not visible (PASS) |

**Three desktop results** (desktop project, 1280x800):

| Tab | Rail Band Calculator heading |
|---|---|
| VIEWER | visible (PASS) |
| DATA | visible (PASS) |
| INSTRUCTIONS | visible (PASS) |

**Non-vacuity check** (plan-required, `git stash` never used): captured the fix as a patch,
restored `rail-band-editor.tsx` with `git checkout --`, re-ran the new INSTRUCTIONS assertion —
it failed exactly as expected (`expect(locator).not.toBeVisible()` — element resolved visible, on
both iphone and android). Re-applied the patch — the same assertion then passed on both projects.

**What `git log -S` said about when this behaviour started:** `git log -S'no control targeting
it' -- components/rails/rail-band-editor.tsx` finds exactly one commit, `821c104` — "feat(09-04):
show one rail at a time on a phone, and let INSTRUCTIONS scroll as one page." That plan (09-04, in
Phase 9) is the commit that first introduced `DesignScreenShell` for this screen and wrote the
comment saying INSTRUCTIONS has no control targeting it — and handed the controls to the shell on
every tab regardless, in the same diff. The defect is confirmed pre-existing since Phase 9; it is
not a regression from any plan in Phase 10.

**The open question for the founder**, recorded rather than answered: on a desktop the rail-band
control column sits *beside* the INSTRUCTIONS reading rather than after it, but the controls still
don't act on anything that tab shows. Should the desktop someday hide them there too, matching the
phone? Not decided here — the standing rule for this phase is that nothing a mouse sees changes,
and nobody has asked the founder this question yet.

**Added by CR-01 (10-REVIEW-3.md):** a phone turned sideways sits in that identical bucket, and for
the identical reason — D-10, landing in this same round one plan before this one, redefined the
phone/desktop switch to read width alone, so a phone held sideways (about 844 CSS px on a real
iPhone, about 863 on a real Pixel 7, both measured 2026-09-11) now clears 820px and renders the
same desktop shell a mouse gets, where this fix's `max-shell:hidden` gate cannot fire. That is
consistent with D-10's own reasoning that a phone on its side should behave like a small desktop,
but nobody made that call for this fix specifically before now. `rail-band-editor.tsx`'s comment
and `e2e/phone-rails.spec.ts` now say so and pin it with a test at 844×390 (iPhone) and 863×360
(Pixel 7). Whether a sideways phone belongs in the same bucket as a desktop mouse, or should behave
like an upright phone instead, is left for the founder's real-device sweep to decide, same as the
desktop question above.

## Verification

- `npx tsc --noEmit`: exits 0.
- `npx vitest run`: 2461 passed, 2 skipped, 0 failed.
- `PW_PORT=3111 IS_WEBPACK_TEST=1 npx playwright test e2e/phone-rails.spec.ts --project=iphone
  --project=android --project=desktop`: 24 passed, 18 skipped (correct per-project scoping), 0
  failed.
- `e2e/desktop-baseline.spec.ts` (desktop project): 5 passed, 0 failed. `git status --short` under
  `e2e/*-snapshots/` showed no changes — no baseline was re-recorded.
- `git diff --stat components/design/design-screen-shell.tsx components/rails/rail-controls.tsx`:
  empty for both files — neither was touched.
- **Full Playwright suite** (`PW_PORT=3111 IS_WEBPACK_TEST=1 npx playwright test`, all specs, all
  three projects): **220 passed, 203 skipped, 0 failed** (14.8 minutes). Zero failures anywhere in
  the suite.

## Deviations from Plan

None — plan executed exactly as written. One self-caught slip during Task 1's GREEN step is worth
recording for the record, though it never reached a commit: my first pass at the wrapper edit
accidentally dropped the `phonePinned={activePage === "instructions" ? "none" : "50dvh"}` prop
from the `DesignScreenShell` call while inserting the new comment above it. That silently
re-enabled the pinned 66dvh split on INSTRUCTIONS, which made `RailInstructions`' own internal
`overflow-y-auto` div start clipping content instead of the outer shell scrolling — collapsing
cards 2 and 3 out of the visible area and (coincidentally, on the iPhone/Android viewports tested)
making the outer shell's scroll-needed assertion fail. Diagnosed via `getComputedStyle` on `main`/
`aside` before landing on the actual cause (the missing prop, not a CSS cascade issue), fixed
before the first commit, and re-verified with the full non-vacuity cycle above. No commit ever
carried the broken state.

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path, file access pattern, or schema change — a wrapper
element, a class name, two test assertions and a comment, exactly as scoped.

## Self-Check: PASSED

- FOUND: `components/rails/rail-band-editor.tsx` (modified, wrapper present)
- FOUND: `e2e/phone-rails.spec.ts` (modified, two new tests)
- FOUND commit `6c305ad` (test: RED)
- FOUND commit `e83c89c` (feat: GREEN)
- FOUND commit `54305b2` (test: desktop proof)

## TDD Gate Compliance

Task 1 (`tdd="true"`) followed RED → GREEN correctly:
- RED: `6c305ad` — `test(10-11): prove the RAILS controls should hide on INSTRUCTIONS, phone only`
  (confirmed failing against the unmodified component before commit).
- GREEN: `e83c89c` — `feat(10-11): stop showing rail-band controls under a page they do not act on`
  (confirmed passing, plus the plan's own non-vacuity revert/reapply cycle).
- No REFACTOR commit — none was needed.
