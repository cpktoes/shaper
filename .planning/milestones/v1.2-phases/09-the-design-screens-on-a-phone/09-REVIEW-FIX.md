---
phase: 09-the-design-screens-on-a-phone
source: 09-REVIEW.md
fixed: 2026-09-09T12:31:00Z
findings_fixed: 7
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

## Gap-closure review fixes (2026-09-09)

A second review round, after the phase's end-of-phase UAT surfaced two real gaps (the phone Print
button doing nothing on a real iPhone, and keyboard-focus testing's Tab-walk ceiling being a bare
guess) and this pass's own code review found a third: the Home-Screen print note's CSS condition
matched more than the one broken platform. This section covers those three findings, all fixed.
Verification ran in this agent's isolated worktree (`.claude/worktrees/agent-a49b62765d47b7f0b`),
which has its own `npm install` — numbers below are reproducible from that tree while it exists;
after the orchestrator's merge and `npm run build` on `main`, re-run to confirm from there too.

### CR-01: the Home-Screen print note fired for every "installed app" launch, not just the broken one

**Files modified:** `components/rails/view-full-sized-dialog.tsx`, `components/rails/view-full-sized-dialog.test.ts`, `e2e/phone-rails.spec.ts`
**Commit:** `85bbaf5`

**Plain-English change:** On a phone, the View Full Sized dialog was built to notice when a
shaper has the site running as its own app (added to the Home Screen) rather than open in a
regular browser tab — because on an iPhone, tapping Print in that situation silently does
nothing. But the way it noticed that was too broad: a desktop shaper who "installs" the site as
its own window in Chrome or Edge, or an Android shaper who adds it to their home screen, look the
same to that check — and printing works fine for both of them. So they were losing a working
Print button for no reason. The fix narrows the check to iOS specifically, using a CSS feature
(`-webkit-touch-callout`) that only iPhones and iPads understand, so the swapped-in note ("open
this page in Safari to print") now only shows up on the one platform where it's true. Also removed
a browser-automation test that was permanently skipping itself and would keep doing so forever
under the new, narrower check — the CSS itself is now proven a different way (see WR-01 below).

**How verified:** `npx tsc --noEmit` clean; `npx eslint` clean on touched files; `npx vitest run
components/rails/view-full-sized-dialog.test.ts` — 23 passed (21 existing + 2 new cases pinning
the iOS guard on every occurrence); `PW_PORT=3116 npx playwright test e2e/phone-rails.spec.ts`
(iphone/android/desktop) — 21 passed, 15 skipped (expected project-scoped skips), 0 failed.

### WR-01: the CSS gating was proven only by reading its source text, never by compiling it

**Files modified:** `components/rails/view-full-sized-dialog.css.test.ts` (new file)
**Commit:** `6372464`

**Plain-English change:** The existing tests checked that the dialog's code *named* the right
CSS classes, but nothing actually ran those classes through the tool (Tailwind) that turns them
into real browser rules — so a typo or a future Tailwind change in that one unusual class chain
could quietly compile to nothing, and no test would catch it. Added a new test that runs the
dialog's real class names through the app's own styling pipeline and checks the CSS that comes
out the other end: it confirms the note only appears below the 820px "phone" width, only on
iPhone/iPad, and only when the site is launched as its own app — the actual browser behavior,
not just the source code's wording.

**How verified:** `npx tsc --noEmit` clean; `npx eslint` clean; `npx vitest run
components/rails/view-full-sized-dialog.css.test.ts` — 2 passed in 432ms (well under the 2s
budget).

### WR-02: the keyboard-focus test's "give up and fail" point was a fixed guess

**Files modified:** `e2e/keyboard-focus.spec.ts`
**Commit:** `94daf6d`

**Plain-English change:** A test that checks a shaper can see which slider or button their
keyboard is on works by pressing Tab repeatedly until it finds the right control, then giving up
and failing after some number of presses if it never finds it. That number was a flat 150,
picked without reference to how many things are actually on the page. Now it's calculated from
the page itself — twice the number of tabbable things on screen, plus 20 — so if the design
screens grow a lot more controls later, this test's ceiling grows with them automatically instead
of needing a manual bump, and a failure message now says both numbers so it's obvious whether the
page just got bigger or the focus ring genuinely broke.

**How verified:** `npx tsc --noEmit` clean; `npx eslint` clean; `PW_PORT=3116 npx playwright test
--project=desktop e2e/keyboard-focus.spec.ts e2e/desktop-baseline.spec.ts` — 7 passed, including
all 5 desktop baseline screenshots unchanged (`git status` on the snapshots directory is clean;
`--update-snapshots` was never run).

### Final verification (all three gap-closure fixes)

- `npx tsc --noEmit` — clean, no errors at all (the intermittent phantom `LayoutProps` noise
  noted in the earlier fix pass did not appear in this run).
- `npx vitest run` — 46 test files, 2315 passed, 2 skipped (pre-existing, unrelated to this pass).
- `npm run lint` — 0 errors, 12 pre-existing warnings, none in any file this pass touched.
- `PW_PORT=3116 npx playwright test e2e/phone-rails.spec.ts` (iphone/android/desktop) — 21
  passed, 15 skipped (expected), 0 failed.
- `PW_PORT=3116 npx playwright test --project=desktop e2e/keyboard-focus.spec.ts
  e2e/desktop-baseline.spec.ts` — 7 passed, including all 5 desktop baseline screenshots
  unchanged.
- `git diff package.json package-lock.json` — empty; `npm install --no-audit --no-fund` matched
  the existing lockfile exactly.
- `npm run build` was left to the orchestrator, to run from the main checkout after merge.

---

_Fixed: 2026-09-09T10:23:53Z_
_Fixer: Claude (gsd-code-fixer)_
_Gap-closure section appended: 2026-09-09T12:31:00Z_
