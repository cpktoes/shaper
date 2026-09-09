---
phase: 09-the-design-screens-on-a-phone
source: 09-REVIEW.md
fixed: 2026-09-09T10:23:53Z
findings_fixed: 4
findings_skipped: 0
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-09-09T10:23:53Z
**Source review:** `.planning/phases/09-the-design-screens-on-a-phone/09-REVIEW.md`

**Summary:**
- Findings in scope: 4 (CR-01, WR-01, WR-02, IN-01)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: "Wide view" on TEMPLATE/ROCKER strips every phone control with no phone-side gating or benefit

**Files modified:** `components/design/design-screen-shell.tsx`, `components/outline/outline-editor.tsx`, `components/rocker/rocker-editor.tsx`, `e2e/phone-layout.spec.ts`
**Commit:** `312a3ee`

**Applied fix:**
- Added `className="max-shell:hidden"` to the wide-view `ViewerToolbarButton` in both
  `outline-editor.tsx` and `rocker-editor.tsx`, with a comment in the same voice as the Rotate
  button's, explaining that on a phone the drawing already has the whole width and the controls
  are the entire column beneath it, so the button would only strip every control with no way
  back. Gated on width like Rotate, so a touchscreen laptop at desktop width keeps it.
- Updated the Rotate button's "one of the phase's only two removed controls" comment in both
  files to say wide view (added after the post-execution code review, 09-REVIEW.md CR-01) is
  the third.
- In `design-screen-shell.tsx`, the `<aside>` is now always in the tree, even when `wideView` is
  true — CSS-only (no `useCoarsePointer`/`usePortraitViewport`/`matchMedia`), replacing
  `{!wideView && (<aside>...)}` with an aside whose `asideClassName` swaps its own leading
  `flex` for `hidden` (non-simple sidebar) or appends `hidden max-shell:block` (simple sidebar,
  which has no display class of its own) when `wideView` is true, with a `max-shell:flex` /
  `max-shell:block` override restoring it below the shell breakpoint. `flex` and `hidden` are
  never both present on the element. Every other class byte is unchanged from before, verified
  by the unchanged desktop baseline screenshots.
- Added tests in `e2e/phone-layout.spec.ts`: a phone-only assertion on `/design/outline` that the
  wide-view button is hidden and `[data-design-controls-scroll]` stays visible; the same
  assertion for `/design/rocker` in a new phone-only describe block; and a desktop-only
  assertion in the existing "desktop shell — unchanged" describe that pressing the wide-view
  button hides `aside` and pressing it again shows it.

**How verified:** `npx tsc --noEmit` clean; `npx eslint` clean on touched files;
`PW_PORT=3108 npx playwright test e2e/phone-layout.spec.ts e2e/desktop-baseline.spec.ts` — 31
passed (iphone/android/desktop), including all 5 desktop baseline screenshots unchanged.

### WR-01: `data-design-controls-scroll` is placed on an element that doesn't actually scroll on a phone for its one real consumer

**Files modified:** `components/design/design-screen-shell.tsx`
**Commit:** `7b75cee`

**Applied fix:** Rewrote the doc comment above `<aside>` to state plainly which element scrolls
in each of the three modes — the inner controls div normally; the aside itself in
`simpleSidebar` mode on desktop; and, in `simpleSidebar` + `phonePinned="none"` (VOLUME) on a
phone, the shell ROOT div, since `asideClassName` deliberately ends in
`max-shell:overflow-visible` there. Added a second pixel-inert test hook,
`data-design-page-scroll={nonePinned ? true : undefined}`, on the root `<div>` so a future test
can name that phone scroller truthfully. Left `data-design-controls-scroll` exactly where it
was (no functional change), kept the `simpleSidebar && !nonePinned` class branch (with a comment
noting no current caller exercises it — VOLUME, the only `simpleSidebar` caller, always pairs it
with `phonePinned="none"`), and did not touch `e2e/phone-screens.spec.ts`.

**How verified:** `npx tsc --noEmit` clean; `npx eslint` clean;
`PW_PORT=3108 npx playwright test e2e/phone-screens.spec.ts e2e/desktop-baseline.spec.ts` — 20
passed, including VOLUME's own `xpath=..`-based phone scroll test (untouched, still passing) and
all 5 desktop baseline screenshots unchanged.

### WR-02: Hand-rolled selection-grid buttons on TEMPLATE and FINS never received the phase's touch-sizing treatment

**Files modified:** `components/outline/outline-controls.tsx`, `components/fins/fin-controls.tsx`, `e2e/touch-sizing.spec.ts`
**Commit:** `48a6b8f`

**Applied fix:** Added `coarse:min-h-11` (mirroring `Button`'s own `coarse:h-11` pointer-keyed
idiom — no effect on a mouse at any window width) to: the tail-shape grid buttons in
`outline-controls.tsx`; `PillButton` in `fin-controls.tsx` (which covers the Thruster Model row,
Quad Model grid, and Twin Template row, all built from it); and the tail-shape grid and Fin
Setup grid buttons in `fin-controls.tsx`. All of these render icon-plus-label stacked buttons,
not small icon-only squares, so no `coarse:min-w-11` was needed. No padding, font size, colour,
or desktop dimension was changed. Extended `e2e/touch-sizing.spec.ts` with a phone-only test that
every TEMPLATE tail-shape button is at least 44px tall, a phone-only test that every FINS
tail-shape/Fin-Setup button is at least 44px tall, and a desktop-only test asserting those same
buttons keep today's exact resting heights (59.5px, 65px, 69px, measured before the fix) on a
mouse.

**How verified:** `npx tsc --noEmit` clean; `npx eslint` clean;
`PW_PORT=3108 npx playwright test e2e/touch-sizing.spec.ts e2e/desktop-baseline.spec.ts` — 33
passed (iphone/android/desktop), including the new phone and desktop assertions and all 5
desktop baseline screenshots unchanged.

### IN-01: `RailControls`'s checkbox rows use `coarse:min-h-11` while the Family/Ratio sliders rely on the `Slider` primitive's own touch ring

**Files modified:** `components/rails/rail-controls.tsx`
**Commit:** `16e6be3`

**Applied fix:** Comment-only. Added a comment beside the Sym label row's `coarse:min-h-11`
explaining that only the shared `Button`/`Input`/`Slider` primitives get their touch sizing for
free (the `Slider` beside this row grows its own touch ring via `coarse:after:-inset-4`), and any
hand-rolled interactive element needs its own explicit `coarse:` rule — pointing at WR-02, fixed
in this same pass, as the example of what happens when one doesn't. No behavior change.

**How verified:** `npx tsc --noEmit` clean; `npx eslint` clean; re-read the modified section to
confirm the comment landed correctly with no code touched;
`PW_PORT=3108 npx playwright test e2e/phone-rails.spec.ts e2e/desktop-baseline.spec.ts` — 23
passed, including all 5 desktop baseline screenshots unchanged.

## Skipped Issues

None — all four findings were fixed.

## Final Verification (after all four fixes)

- `npx tsc --noEmit` — clean (only the known phantom `LayoutProps` noise, none in any touched
  file; that noise did not appear at all in this run).
- `npm test` — 45 test files, 2309 passed, 2 skipped (pre-existing skips, unrelated to this
  phase).
- `npm run lint` — 0 errors, 12 pre-existing warnings (unrelated files: `rail-plan-side-figure.tsx`
  img element, a few test/script `eslint-disable` directives, one unused test import) — none in
  any file this fix touched.
- `PW_PORT=3108 npx playwright test` (whole suite: iphone, android, desktop) — **96 passed, 0
  failed, 78 skipped** (project-scoped `test.skip`s, e.g. phone-only specs skipped on `desktop`,
  `touch-drag.spec.ts`'s android/CDP-only tests skipped elsewhere — all expected).
- The five desktop baseline PNGs under `e2e/desktop-baseline.spec.ts-snapshots/` all matched;
  `git status` confirms the snapshot directory has no changes. `--update-snapshots` was never
  run.

---

_Fixed: 2026-09-09T10:23:53Z_
_Fixer: Claude (gsd-code-fixer)_
