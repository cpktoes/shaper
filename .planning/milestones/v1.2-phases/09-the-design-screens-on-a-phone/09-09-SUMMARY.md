---
phase: 09-the-design-screens-on-a-phone
plan: 09
subsystem: design-screens
tags: [rails, print, css-media-query, playwright, cdp, gap-closure]

# Dependency graph
requires:
  - phase: "09-04"
    provides: "The View Full Sized dialog's phone gating (D-13): the check bar, the caveat, and the plain 'Shown smaller than actual size — tap Print for the full-sized rail.' line, all `max-shell:`-gated"
provides:
  - "The Home-Screen note and its CSS-only `[@media(display-mode:standalone)]` gating in components/rails/view-full-sized-dialog.tsx, replacing the phone Print button in the one context (iOS Home-Screen web app) where it cannot work"
  - "Two source-contract vitest cases pinning the note's exact wording and the CSS-only (no-JavaScript) detection rule"
  - "A print-call counting stub in e2e/phone-rails.spec.ts, proving a phone tap really reaches the browser's print — the assertion this phase never had"
  - "A documented, empirically-confirmed finding: this Chromium build's CDP `Emulation.setEmulatedMedia` does not honour a `display-mode` media-feature override, in any spelling — the android/CDP Home-Screen case skips itself rather than false-failing"
affects: []

# Actuals (#2632)
actuals:
  tokens: 2834
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "CSS-only launch-context detection: Tailwind's arbitrary-variant syntax `max-shell:[@media(display-mode:standalone)]:` written inline at each of three call sites in one file, never a named variant in app/globals.css (a plan running beside this one owns that stylesheet this wave) and never a JavaScript matchMedia/navigator.standalone check — both the button and the note are always in the server-rendered tree, chosen by CSS alone."
    - "A print-call counting stub via page.addInitScript, mirroring the existing sign-in-banner-dismissal helper's shape: a counter on window, incremented by a replacement for window.print, read back through page.evaluate with an explicit narrow type."
    - "test.skip() called mid-test-body (not just in beforeEach) to turn an environment limitation discovered at run time into a skip rather than a failure — used here when a CDP media-feature emulation does not actually take effect, so a future Chromium that supports it runs the real check without a code change."

key-files:
  created: []
  modified:
    - components/rails/view-full-sized-dialog.tsx
    - components/rails/view-full-sized-dialog.test.ts
    - e2e/phone-rails.spec.ts

key-decisions:
  - "The android/CDP Home-Screen emulation case checks whether Chrome DevTools Protocol's display-mode media-feature override actually took effect before asserting anything about the app, and calls test.skip() (not a hard failure) when it did not. Confirmed empirically at execution time: the identical Emulation.setEmulatedMedia call shape correctly flips prefers-color-scheme (sanity-checked against example.com), but display-mode is not honoured in this Chromium build (version 153.0.8010.12) in any of the spellings tried (display-mode, displayMode, display_mode) or parameter combinations (with/without an explicit media:\"screen\", with/without a page reload). The plan's own text anticipated exactly this failure mode ('so a failure reads as the emulation did not apply rather than being mistaken for a CSS bug') — this plan extends that intent from a diagnostic failure message to a genuine skip, so the suite still exits 0 and the real device case stays honestly on the human-verification list rather than reporting false coverage."
  - "The D-13 phone line's ' — tap Print for the full-sized rail' clause is wrapped in its own inline span (not a second full sentence) so the sentence reads identically in Safari today and drops to 'Shown smaller than actual size.' in the Home-Screen app with no JSX-inserted or swallowed space, keeping the existing phone e2e's exact-sentence assertion intact."

requirements-completed: [PHON-01]

coverage:
  - id: 09-09-T1
    description: "A plain Home-Screen note ('Printing isn't available from the Home-Screen app — open this page in Safari to print the full-sized rail.') replaces the Print button, the 'turn off Fit to page' caveat, and the D-13 line's 'tap Print' clause, in CSS only (display-mode:standalone + the phone width), with the desktop dialog, the print stylesheet, and the print handler itself completely untouched"
    requirement: "PHON-01"
    verification:
      - kind: unit
        ref: "components/rails/view-full-sized-dialog.test.ts — 21 tests, including the two new source-contract cases for the note's exact wording and the no-JavaScript-detection rule"
        status: pass
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts (5/5, no snapshot regenerated) + e2e/phone-rails.spec.ts's existing phone/desktop View Full Sized cases"
        status: pass
    human_judgment: false
  - id: 09-09-T2
    description: "Tapping Print in Safari on a phone really calls the browser's own print exactly once (the assertion the phase never had); the desktop keeps its Print button and never shows the note"
    requirement: "PHON-01"
    verification:
      - kind: e2e
        ref: "e2e/phone-rails.spec.ts — 'tapping Print in Safari really calls the browser's print, exactly once' (iphone + android, both pass) and 'the Print button is visible, and the Home-Screen note is not' (desktop, pass)"
        status: pass
    human_judgment: false
  - id: 09-09-T3-android-cdp
    description: "The Home-Screen web app shows the note instead of the Print button, proven with a real display-mode:standalone emulation on the android project"
    requirement: "PHON-01"
    verification:
      - kind: e2e
        ref: "e2e/phone-rails.spec.ts — 'the Home-Screen web app shows the note instead of the Print button (G-09-6, android/CDP only)'"
        status: unknown
    human_judgment: true
    rationale: "This Chromium build's CDP does not honour a display-mode media-feature override (confirmed empirically — see key-decisions), so the test detects that and calls test.skip() rather than asserting a false pass or false fail. The CSS-only gating mechanism itself is proven by the source-contract tests (09-09-T1) and by the fact that the identical selector pattern already works correctly for max-shell/print/pointer variants elsewhere in this codebase; only the test-time emulation of the launch context is unavailable. The real Home-Screen-app case is on this SUMMARY's own 'Human verification deferred to end-of-phase UAT' list below."
  - id: D-Manual-G-09-6
    description: "On the shaper's own iPhone: the Home-Screen icon shows the note where Print was, and typing the address into Safari itself still prints correctly"
    requirement: "PHON-01"
    verification: []
    human_judgment: true
    rationale: "The whole reason this plan exists is that Playwright cannot exercise iOS's native print step or a genuine Home-Screen web-app launch; per workflow.human_verify_mode this is deferred to end-of-phase UAT with a device in hand, per this plan's own <verification> section."

duration: 22min
completed: 2026-09-09
status: complete
---

# Phase 9 Plan 09: A Home-Screen Note Where the Dead Print Button Was Summary

**Replaces the phone View Full Sized dialog's Print button with a plain, CSS-gated note ("open this page in Safari to print") only when the site is running as an iOS Home-Screen web app — Safari itself, and every desktop, see no change at all — and adds the print-call-counting proof the phase never had.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-09T11:40:46-07:00 (first commit)
- **Completed:** 2026-09-09T11:53:57-07:00 (last code commit; this SUMMARY follows)
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- **A shaper who opened the app from their Home Screen no longer taps a dead button.** The View Full Sized dialog on RAILS now shows one plain sentence in that exact context — "Printing isn't available from the Home-Screen app — open this page in Safari to print the full-sized rail." — in place of the Print button, the "turn off 'Fit to page'" caveat (which is advice for a print dialog that can't be reached from there), and the " — tap Print for the full-sized rail" clause of D-13's own phone line (which now reads "Shown smaller than actual size."). Printing itself was not touched anywhere: not the print stylesheet, not the `@page` rule, not the print handler's own `window.print()` call.
- **The condition is CSS only, exactly as the phase's own rule requires.** Every swap is gated by the Tailwind arbitrary-variant pair `max-shell:[@media(display-mode:standalone)]:`, written inline at four call sites in this one file (not a named variant in `app/globals.css`, which a plan running beside this one owns this wave). No `matchMedia`, no `navigator.standalone`, no new React state, no hydration branch — both the note and the button are always in the server-rendered tree, and the browser's own CSS engine picks between them.
- **In Safari itself, and on any desktop, nothing changed.** The desktop dialog keeps its Print button, its check bar, its 100%-zoom caveat and its "— Actual Size" title exactly as Phase 8 built them; the five desktop baseline screenshots matched pixel-for-pixel after every task, with none regenerated.
- **A phone tap really calling print is now proven, not assumed.** The debug session's throwaway measurement (a stubbed `window.print` counted 3/3 on both phone projects) is now a kept Playwright test: tapping the Print button in the normal Safari case increments a real counter exactly once, on both the iphone and android projects.
- **A real environment limitation was found and handled honestly, not hidden.** The plan's own design calls for proving the Home-Screen case with Chrome DevTools Protocol's `display-mode` media-feature emulation on the android project. Testing that directly (see Deviations) showed this Chromium build (153.0.8010.12) does not actually honour that override — confirmed by first proving the identical call shape correctly flips `prefers-color-scheme`, then trying every spelling and parameter combination for `display-mode` and finding none took effect. Rather than ship a test that silently passes for the wrong reason or fails and blocks the suite, the test checks whether the emulation took and calls `test.skip()` when it did not — so today's run reads honestly as "not run in this environment" and a future Chromium build that adds support runs the real check automatically.
- **Whole-suite proof, run at the end (Task 3):** `npx tsc --noEmit` (0 errors — two pre-existing `LayoutProps` phantom errors in `app/layout.tsx`/`app/design/layout.tsx` are unrelated to this plan and were present before it), `npm test` (2311 passed, 2 skipped), `npm run lint` (0 errors, 12 pre-existing warnings unrelated to this plan's files), `npx playwright test` across all three projects (99 passed, 84 skipped by project/environment, 0 failed), and a final standalone re-run of `e2e/desktop-baseline.spec.ts` — all five images matched, none regenerated. `git diff package.json` is empty.

## Task Commits

1. **Task 1: A note where the dead button was** — `ab6905f` (feat)
2. **Task 2: Prove a tap really asks the browser to print, and that the note takes the button's place** — `f3da72b` (test)
3. **Task 3: Run everything once, and write down what only a person can check** — this SUMMARY's own commit (docs)

## Files Created/Modified

- `components/rails/view-full-sized-dialog.tsx` — the Home-Screen note, the CSS-only gating on the Print button/caveat/D-13 clause, and a short in-file comment naming the debug session.
- `components/rails/view-full-sized-dialog.test.ts` — two new source-contract cases: the note's exact sentence, and no-JavaScript-detection (built-from-parts needles for `navigator.standalone`, `matchMedia`, and a JS `displayMode` property read, so the assertions can never accidentally match themselves).
- `e2e/phone-rails.spec.ts` — a `stubPrintCounter`/`readPrintCount` helper pair; the Safari tap-and-count case (both phone projects); the android/CDP Home-Screen case (self-skipping when the CDP emulation doesn't take, per the finding above); and the desktop guard case.

No file was deleted. `git diff package.json` is empty — no dependency was installed.

## Decisions Made

See `key-decisions` in the frontmatter for the full rationale. In plain English:

1. **The android/CDP Home-Screen test proves what it can and honestly skips what it can't.** Rather than assume the plan's specified CDP technique (`Emulation.setEmulatedMedia` with a `display-mode` feature) works, it was tested directly against this exact Chromium build before writing the assertion — and it does not take effect, confirmed by a working sanity check (`prefers-color-scheme` on the identical call shape) ruling out a mistake in the call itself. The test now checks for that up front and skips itself when the emulation didn't apply, rather than reporting a false pass (asserting nothing meaningful) or a false fail (blocking the suite over an environment gap the app itself has nothing to do with).
2. **The "tap Print" clause is a span inside the same sentence, not a second sentence.** Keeps the phone's existing "Shown smaller than actual size — tap Print for the full-sized rail." reading character-for-character identical in Safari (an existing e2e test already pins that exact string) while cleanly dropping to "Shown smaller than actual size." in the Home-Screen app.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Chrome DevTools Protocol's `display-mode` media-feature emulation does not work in this Chromium build**
- **Found during:** Task 2, while implementing the android-only Home-Screen case exactly as the plan specifies.
- **Issue:** The plan's `key_links` names `Emulation.setEmulatedMedia` with a `{ name: "display-mode", value: "standalone" }` feature as the technique for proving the Home-Screen case on Android. Sending that exact call and then reading `window.matchMedia("(display-mode: standalone)").matches` back always returned `false`, regardless of navigation timing, an explicit `media: "screen"` parameter, or the spelling of the feature name (`display-mode`, `displayMode`, `display_mode`). A sanity check using the identical call shape with `prefers-color-scheme: dark` correctly returned `true`, ruling out a mistake in the CDP session or the call itself — this specific Chromium build (153.0.8010.12) simply does not wire `display-mode` into its emulated-media override path. A brief further search of the full CDP protocol schema for this build found no working alternative short of the experimental `PWA.install` domain, which requires a real installed web-app manifest and browser-level app registration — disproportionate to a three-file gap-closure plan and outside its own stated file scope.
- **Fix:** The test performs the CDP call and the emulation-check exactly as planned, then calls Playwright's `test.skip(!standaloneMatched, "...")` instead of a hard `expect(...).toBe(true)` when the check fails, with a comment recording the empirical finding in full so a future Chromium version that adds support runs the real assertion automatically with no code change. The rest of the plan's `<verify>` and acceptance criteria (`exits 0 on all three projects`) hold exactly as written, because a skipped test does not fail the run.
- **Files modified:** `e2e/phone-rails.spec.ts` (no other file affected)
- **Verification:** Confirmed the emulation gap empirically (a throwaway diagnostic script, not committed) before writing the skip logic; re-ran the full `e2e/phone-rails.spec.ts` suite afterward — 21 passed, 18 skipped (including this case, correctly), 0 failed.
- **Committed in:** `f3da72b` (Task 2 commit)

**2. Pre-existing acceptance-criterion mismatch (not a code deviation, recorded for completeness)**
- **Found during:** Task 2, verifying the acceptance criterion `grep -c 'toHaveCount(0)' e2e/phone-rails.spec.ts is 0`.
- **Issue:** This file already carried one unrelated, pre-existing `toHaveCount(0)` usage before this plan touched it — `railSwitchTabs(page)).toHaveCount(0)` in the desktop describe block's "no NOSE/CENTER/TAIL strip" test, added in 09-04. This plan's own three new footer/note assertions correctly use visibility checks only, as the plan requires, but the blanket file-wide grep the acceptance criterion specifies cannot pass as literally written regardless of what this plan does, since it counts that unrelated pre-existing line too.
- **Fix:** None applied — out of scope per the deviation rules' scope boundary (only auto-fix issues directly caused by this plan's own changes; that line is unrelated to G-09-6 and belongs to 09-04's own NOSE/CENTER/TAIL coverage). Recorded here rather than silently ignored.
- **Files modified:** none.

---

**Total deviations:** 1 auto-fixed (Rule 3, blocking), 1 recorded-not-fixed (pre-existing, out of scope).
**Impact on plan:** The CDP limitation does not weaken the plan's actual proof: the CSS-only gating mechanism is fully covered by the source-contract tests (Task 1) and by the desktop/Safari e2e cases (Task 2), and the one case Playwright's automation genuinely cannot exercise in this environment is honestly deferred to the phase's own end-of-phase human check, exactly like the phase's other on-device-only items (the iOS long-press callout, the dynamic-viewport-resize check).

## Human Verification Deferred to End-of-Phase UAT

- **The Home-Screen icon shows the note (G-09-6's own founder decision).** On the shaper's real iPhone: open the site from its Home-Screen icon, go to RAILS, tap View Full Sized, and confirm the plain note — "Printing isn't available from the Home-Screen app — open this page in Safari to print the full-sized rail." — appears exactly where the Print button used to be, and there's no Print button visible.
- **Safari itself still prints correctly, ruler-true, in both unit systems.** Type the site's address into Safari itself (not the Home-Screen icon), go to RAILS, tap View Full Sized, and confirm the Print button is there, tapping it opens the print sheet, and the printed rail measures true with a ruler in both Imperial and Metric. **If this still fails from Safari itself, the Home-Screen app was not the whole story** — the debug session's second falsification check is the next step: tap Print, then switch on Airplane Mode; a print sheet appearing the moment the network drops would mean Safari was holding the print for a page it considered still "loading," a different cause entirely.
- **The android/CDP automated proof of the Home-Screen case itself is skipped in this environment** (see Deviations above) — this Chromium build does not support emulating `display-mode: standalone`, so the first bullet above is this plan's only real proof that the note appears in that exact context.

## SUMMARY's Own Print Buttons Share This Cause (Not This Plan's Scope)

`components/summary/use-print-fit.ts`'s `printOrderForm` is the same bare `window.print()` call, so the SUMMARY screen's "Print Order Form" button on a phone shares this exact iOS Home-Screen no-op cause — and, separately, that button also sits partly off a phone's left edge on a phone-sized screen. Neither was touched here: SUMMARY is Phase 10's screen, and this plan's own file scope is limited to the three files it changed.

## User Setup Required

None — no external service configuration required. No dependency was installed (`git diff package.json` is empty).

## Next Phase Readiness

- This closes gap G-09-6 from the phase's own UAT — PHON-01 and D-13's phone View Full Sized dialog no longer offer a control that silently fails in the one context where it cannot work.
- `npm run build` was **not** run in this worktree — Turbopack cannot resolve `next` from a worktree checkout — and must be run from the main checkout after this wave merges, per this plan's own executor-environment note.
- No blockers for the phase's own end-of-phase UAT pass, where the "Human Verification Deferred" list above (plus every other plan's own deferred list this wave) gets worked through with a real device in hand.

---
*Phase: 09-the-design-screens-on-a-phone*
*Completed: 2026-09-09*

## Self-Check: PASSED

All files this plan touched verified present on disk: `components/rails/view-full-sized-dialog.tsx`,
`components/rails/view-full-sized-dialog.test.ts`, `e2e/phone-rails.spec.ts`, and this SUMMARY.
Both task commits (`ab6905f`, `f3da72b`) verified present in `git log`.
