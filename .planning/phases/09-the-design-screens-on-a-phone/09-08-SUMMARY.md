---
phase: 09-the-design-screens-on-a-phone
plan: 08
subsystem: design-screens
tags: [accessibility, keyboard-focus, css, gap-closure]

# Dependency graph
requires:
  - "09-CONTEXT.md / 09-UAT.md's own Test 4 finding (G-09-4): keyboard focus is invisible on sliders and barely visible on tail-shape tiles"
  - ".planning/debug/keyboard-focus-invisible-on-sliders.md's root cause (C1/C2/C3), diagnosed but not fixed"
provides:
  - "`.slider-accent [data-slot=\"slider-thumb\"]:has(:focus-visible)` in app/globals.css — the slider thumb's keyboard ring, keyed on the element Base UI actually focuses (the hidden nested range input), not the thumb DIV that never receives real keyboard focus"
  - "`.focus-ring-accent` in app/globals.css — the one shared focus-visible class every hand-rolled selection button on the design screens now carries"
  - "Full-strength (`ring-ring`, not `ring-ring/50`) focus rings on the four shadcn primitives: Button, Checkbox, Input, Select"
  - "e2e/keyboard-focus.spec.ts — the automated Chromium Tab-walk proof, reading the ring colour off the live `--surf-accent-ink` token"
affects: []

# Actuals (#2632)
actuals:
  tokens: 6406
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A :has(:focus-visible) rule on the CONTAINER, not :focus-visible on the container itself, is the fix whenever a component library gives real keyboard focus to a hidden/nested element (Base UI's Slider.Thumb wraps a visually-hidden <input type=\"range\">) — the container is never itself focus-visible, but it always contains the truly-focused element."
    - "One shared CSS class (`.focus-ring-accent`) for every hand-rolled selection button, declared once in app/globals.css beside the existing `.slider-accent` hooks, rather than a Tailwind utility run repeated at each of the thirteen call sites — the same drift this codebase already named and fixed once for slider styling (the `.slider-accent` comment block itself)."
    - "Reading computed style immediately after a synthetic Playwright keyboard event (page.keyboard.press) can race Chromium's own deferred style recalculation — the exact same lag the earlier debug session hit reading a hover-triggered ring. `expect.poll(...)` around the computed-style read, not a fixed `waitForTimeout`, is the fix; a bare read-once assertion is flaky by construction here."
  key-decisions-elsewhere: []

key-files:
  created:
    - e2e/keyboard-focus.spec.ts
  modified:
    - app/globals.css
    - components/ui/button.tsx
    - components/ui/checkbox.tsx
    - components/ui/input.tsx
    - components/ui/select.tsx
    - components/outline/outline-controls.tsx
    - components/fins/fin-controls.tsx
    - components/rails/rail-controls.tsx
    - components/design/fine-adjust-group.tsx

key-decisions:
  - "The slider thumb's ring lives in app/globals.css as a plain CSS rule, not as a Tailwind `has-[:focus-visible]:` class inside the shadcn-generated `components/ui/slider.tsx` primitive — matching the plan's own assumption_delta_decision and the codebase's existing rationale for `.slider-accent` (app-owned styling has to survive a shadcn regeneration)."
  - "One shared `.focus-ring-accent` class for all thirteen hand-rolled buttons across four files, rather than a Tailwind utility string repeated at each call site — the same anti-drift reasoning this codebase already applied once to slider styling."
  - "The four shadcn primitives (Button, Checkbox, Input, Select) move from `ring-ring/50` to `ring-ring` (their `aria-invalid:` rings and the destructive Button variant's own focus colour are untouched) — closing the gap's own explicit ask about the inherited 50%-opacity default, measured at 2.18-2.65:1 against the sidebar (under the app's own 3:1 UI-boundary rule) and now 5.14-10.57:1."

requirements-completed: [PHON-05]

coverage:
  - id: 09-08-T1
    description: "One focus ring, at a strength you can actually see — the slider thumb's ring keyed on the truly-focused hidden input, and the four shadcn controls raised from ring-ring/50 to ring-ring"
    requirement: "PHON-05"
    verification:
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts — 5/5 passing, no snapshot regenerated"
        status: pass
      - kind: unit
        ref: "npm test (2309 passed, 2 skipped), npx tsc --noEmit (0 errors)"
        status: pass
    human_judgment: false
  - id: 09-08-T2
    description: "Every hand-rolled selection button on the design screens (thirteen buttons across four files) carries the shared focus-ring-accent class, with no change to size, colour or spacing"
    requirement: "PHON-05"
    verification:
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts + e2e/desktop-regression.spec.ts (7/7) and e2e/touch-sizing.spec.ts's desktop half (2/2, 13 correctly skipped) — no snapshot regenerated, no button resized"
        status: pass
      - kind: unit
        ref: "npm test, npm run lint (0 errors), npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: 09-08-T3
    description: "A machine Tabs onto a real slider thumb and a real tail-shape tile on two different screens and reads back a ring in the palette's accent ink"
    requirement: "PHON-05"
    verification:
      - kind: e2e
        ref: "e2e/keyboard-focus.spec.ts — 2/2 passing (desktop/Chromium only, by design)"
        status: pass
      - kind: e2e
        ref: "npx playwright test, all three projects — 98 passed, 82 skipped (project/pointer-gated skips), 0 failed"
        status: pass
    human_judgment: false
  - id: D-Manual-1
    description: "A keyboard walk down every design screen's sidebar shows a ring that is obvious at a glance on every slider, tile, pill, disclosure, checkbox, select and typed field, and nothing at rest/hover/drag differs from the deployed site"
    requirement: "PHON-05"
    verification: []
    human_judgment: true
    rationale: "workflow.human_verify_mode is end-of-phase; the automated half (a real Chromium Tab walk onto one slider and two tail-shape buttons, plus the five pixel-identical baseline screenshots and the mouse-drag regression suite) is what this plan can prove by itself."

duration: 17min
completed: 2026-09-09
status: complete
---

# Phase 9 Plan 08: Keyboard Focus You Can Actually See Summary

**A shaper tabbing through any design screen's sidebar now sees exactly which slider, tile, pill or field the keyboard is on — the slider ring is keyed on the hidden input Base UI actually focuses instead of the thumb outline Tab never touches, every hand-rolled button gets its own ring instead of the browser's faint fallback, and all of it now paints in the palette's full-strength accent ink instead of a muddy 50%-opacity mix that never cleared the app's own 3:1 contrast rule.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-09-09T11:39:14-07:00 (first commit)
- **Completed:** 2026-09-09T11:56:05-07:00 (last commit)
- **Tasks:** 3 (all plain `auto`)
- **Files touched:** 10 (1 created, 9 modified)

## Accomplishments

- **The slider's keyboard ring finally points at the element that really has focus.** Base UI 1.7.0 renders the thumb as a DIV wrapping a visually-hidden `<input type="range">`, and it's the hidden input — not the DIV — that Tab actually lands on. `components/ui/slider.tsx`'s own `focus-visible:ring-3` was written on the DIV and could never match under keyboard navigation. The new rule, `.slider-accent [data-slot="slider-thumb"]:has(:focus-visible)` in `app/globals.css`, keys on "the thumb that CONTAINS the truly-focused element" instead — reaching every slider on all five design screens through the one `.slider-accent` class every `<Slider>` in the app already carries, with `components/ui/slider.tsx` itself left completely untouched (its half-strength ring colour still paints hover and active exactly as before).
- **Every hand-rolled selection button gets a ring of its own.** A second new rule, `.focus-ring-accent:focus-visible`, and one word (`focus-ring-accent`) added to the class list of all thirteen hand-rolled `<button>`s across four files — TEMPLATE's five tail-shape tiles (one component, five renders), FINS' nine buttons (the disclosure heading, `PillButton` — which alone covers every thruster/quad model pill — both Override buttons, the tail-shape grid, the fin-setup grid, both toe-table links, and Reset Advanced Settings), RAILS' two (the section-heading disclosure and Reset Advanced Settings), and the phone-only Fine adjust disclosure row. Nothing else about any of them changed — no colour, border, padding, height or handler.
- **One strength of ring across the whole sidebar.** The four shadcn primitives (`Button`, `Checkbox`, `Input`, `Select`) move from `focus-visible:ring-ring/50` to `focus-visible:ring-ring` — one word each, `aria-invalid:` rings and the destructive Button variant's own colour left alone. Measured contrast against each theme's own sidebar: **Daylight 6.77:1** (was 2.23:1), **Chalk 10.57:1** (was 2.65:1), **Slate 5.14:1** (was 2.18:1), **Phosphor 7.00:1** (was 2.50:1) — every theme now clears the palette contract's 3:1 UI-boundary rule; none did before.
- **A machine now proves it.** New `e2e/keyboard-focus.spec.ts` (Chromium/`desktop` project only — the debug session measured that Playwright's WebKit mirrors Safari's default keyboard mode and never Tabs onto a slider or tail tile at all) Tabs onto a real slider thumb and the "pin" tail-shape tile on TEMPLATE, then onto the "Pin" button on FINS, reading the ring colour live off `--surf-accent-ink` via `getComputedStyle` rather than a hard-coded hex, so the test stays true in every theme.
- **Nothing at rest, on hover, or under a mouse moved.** All five desktop baseline screenshots matched with none regenerated after every task; the mouse-drag regression suite (`e2e/desktop-regression.spec.ts`) and the desktop half of `e2e/touch-sizing.spec.ts` (which re-measures these exact tail-shape/fin-setup buttons at 59.5/65/69px) both stayed green throughout.
- **Whole-suite proof, run at the end:** `npx tsc --noEmit` (0 errors), `npm test` (2309 passed, 2 skipped), `npm run lint` (0 errors, 12 pre-existing warnings unrelated to this plan's files), `npx playwright test` across all three projects (98 passed, 82 correctly skipped by project/pointer, 0 failed), and a final standalone re-run of `e2e/desktop-baseline.spec.ts` (5/5, none regenerated).

## Task Commits

1. **Task 1: One ring, at a strength you can actually see**
   - `26fe27b` — feat(09-08): make the keyboard focus ring on sliders and controls actually paint, at a colour you can see
2. **Task 2: Put that ring on every button the app draws by hand**
   - `781dc12` — feat(09-08): give every hand-rolled selection button on the design screens a visible focus ring
3. **Task 3: Prove the keyboard can be seen, and that nothing else moved**
   - `761e596` — test(09-08): prove the keyboard focus ring with a real Chromium Tab walk

## Files Created/Modified

- `app/globals.css` — two new rules beside the existing `.slider-accent` block: the slider thumb's `:has(:focus-visible)` ring, and the shared `.focus-ring-accent` class. Pure addition — `git diff` shows zero deleted lines; no token value and no base-layer rule changed.
- `components/ui/button.tsx`, `components/ui/checkbox.tsx`, `components/ui/input.tsx`, `components/ui/select.tsx` — one word each, `ring-ring/50` → `ring-ring`.
- `components/outline/outline-controls.tsx` — `focus-ring-accent` on the tail-shape tile.
- `components/fins/fin-controls.tsx` — `focus-ring-accent` on all nine hand-rolled buttons.
- `components/rails/rail-controls.tsx` — `focus-ring-accent` on the section-heading disclosure and Reset Advanced Settings.
- `components/design/fine-adjust-group.tsx` — `focus-ring-accent` on the Fine adjust disclosure row.
- `e2e/keyboard-focus.spec.ts` — new. The Chromium Tab-walk proof.

No file was deleted. `git diff package.json` is empty — no dependency was installed.

## Decisions Made

See `key-decisions` in the frontmatter for the full list. Worth restating in plain English:

1. **The slider ring lives in `app/globals.css`, not inside the shadcn-generated slider primitive.** Matches the plan's own recorded reasoning and the codebase's existing practice for `.slider-accent`: app-owned styling has to survive a shadcn regeneration, and it reaches every slider on every screen through the one class already applied everywhere.
2. **One shared class for thirteen buttons, not thirteen copies of a Tailwind string.** The same anti-drift lesson this codebase already learned once with slider styling ("fourteen copies... is how a treatment drifts").
3. **The four shadcn controls move to full-strength `ring-ring`**, closing the gap's own explicit question about the inherited 50%-opacity default — every theme now clears the palette contract's 3:1 rule; none did before.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The e2e test's computed-style reads raced Chromium's deferred style recalculation after a synthetic Tab press**
- **Found during:** Task 3, first run of `e2e/keyboard-focus.spec.ts`.
- **Issue:** Reading a focused thumb's or button's `getComputedStyle(...).boxShadow` immediately after `page.keyboard.press("Tab")` intermittently returned the pre-focus (transparent, zero-width) box-shadow rather than the new ring — the exact same style-recalc lag the phase's earlier debug session hit reading a hover-triggered ring (`.planning/debug/keyboard-focus-invisible-on-sliders.md`, 16:20 evidence entry: "the JS computed-style read, taken before Chromium's deferred hover update, still reported none"). Diagnosed with a throwaway probe (not committed): the identical read, run again 200ms later with no other change, returned the correct ring value every time, and a CSSOM walk confirmed the new `:has(:focus-visible)` rule was the only stylesheet rule matching the element at all — so the CSS itself was never wrong, only the timing of the read.
- **Fix:** Replaced the bare `await page.evaluate(...)` + `expect(...).toBe(...)` reads with `await expect.poll(() => page.evaluate(...)).toContain(ringColor)`, which retries the computed-style read until Chromium's style recalculation catches up (or the assertion's own timeout is reached) rather than sleeping a fixed amount or reading once.
- **Files modified:** `e2e/keyboard-focus.spec.ts` (written directly with the fix; no separate revert/redo commit was needed since this was caught before the task's own commit).
- **Commit:** `761e596`

Or, in short: one flaky-test timing fix, found and fixed before committing Task 3; every other task's `<action>` shape and acceptance criteria were followed as written.

## Human Verification Deferred to End-of-Phase UAT

- **A full keyboard walk down every design screen's sidebar (this gap's own UAT Test 4, G-09-4/PHON-05).** On a desktop browser at least 820px wide, Tab through the sidebar of all five design screens (TEMPLATE, ROCKER, RAILS, VOLUME, FINS) and confirm every slider, tail/fin-setup tile, pill, disclosure heading, Reset Advanced Settings link, checkbox and typed/select field shows a ring that is obvious at a glance — in every theme (Daylight, Chalk, Slate, Phosphor) — and that nothing at rest, on hover, or under a mouse drag looks any different from the deployed site. The measured contrast numbers above (5.14–10.57:1, up from 2.18–2.65:1) and the automated Chromium Tab-walk are this plan's own proof; the full visual sweep across all five screens and four themes is the human pass.
- **Measured contrast ratios (Task 1), for the record:** Daylight 6.77:1 (was 2.23:1), Chalk 10.57:1 (was 2.65:1), Slate 5.14:1 (was 2.18:1), Phosphor 7.00:1 (was 2.50:1) — computed via the WCAG relative-luminance formula against each theme's own sidebar colour and the `--surf-accent-ink` value at full and half (50%-mixed-to-sidebar) opacity.
- **`npm run build` must be run from the main checkout after this wave merges** — Turbopack cannot resolve `next` from a worktree checkout, per this plan's own executor-environment note.

## User Setup Required

None — no external service configuration required. No dependency was installed (`git diff package.json` is empty).

## Next Phase Readiness

- This gap-closure plan (G-09-4) is complete and ready for merge alongside its sibling gap-closure plan in the same wave (09-09, the phone Print button — disjoint files, no overlap).
- No blockers. The end-of-phase UAT pass (where the "Human Verification Deferred" list above gets worked through, alongside every other plan's own deferred items) is the next step for the phase as a whole.

---
*Phase: 09-the-design-screens-on-a-phone*
*Completed: 2026-09-09*
