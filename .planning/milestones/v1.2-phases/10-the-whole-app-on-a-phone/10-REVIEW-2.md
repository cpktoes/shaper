---
phase: 10-the-whole-app-on-a-phone
reviewed: 2026-09-11T17:20:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - app/globals.css
  - CLAUDE.md
  - components/design/design-screen-shell.tsx
  - components/design/shell-variant.css.test.ts
  - components/design/toolbar-tip.tsx
  - components/design/use-viewer-media.ts
  - components/rails/view-full-sized-dialog.css.test.ts
  - components/setup/card-thumbnail.tsx
  - components/auth/nav-auth-control.tsx
  - components/auth/nav-auth-control.test.ts
  - components/ui/input.css.test.ts
  - e2e/phone-fins-landscape.spec.ts
  - e2e/phone-home.spec.ts
  - e2e/phone-layout.spec.ts
  - e2e/phone-setup-landscape.spec.ts
  - e2e/site-nav-width.spec.ts
  - e2e/slider-touch.spec.ts
  - e2e/viewer-toolbar.spec.ts
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 10 Gap-Closure (10-05/10-06/10-07): Code Review Report

**Reviewed:** 2026-09-11T17:20:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the full diff `8f44ff5..HEAD` (18 files) covering plans 10-05 (width-and-height
`max-shell`/`shell` layout switch), 10-06 (the setup card's viewport-relative height cap), and
10-07 (the avatar's `!important` tap padding, the new nav-row-width regression test, and the
`Input` consumer-count fix). `npx tsc --noEmit` is clean; `npx vitest run` is green (59 files,
2461 passed, 2 skipped); the four Vitest files touched by this diff (`shell-variant.css.test.ts`,
`nav-auth-control.test.ts`, `input.css.test.ts`, `view-full-sized-dialog.css.test.ts`) pass
individually. I additionally cross-checked the compiled-CSS claim in `nav-auth-control.test.ts`
against this checkout's own stale `.next` build artifacts (built ~6 minutes before `HEAD`) and
confirmed the real Tailwind pipeline does emit `coarse\:p-2\!{padding:calc(var(--spacing) *
2)!important}` for the real source file — the fix genuinely ships, not just compiles as an
isolated test candidate.

**The three findings this gap set was supposed to close are, in fact, closed.** WR-01 (no
regression test for the nav-row overflow) now has `e2e/site-nav-width.spec.ts`. WR-02 (the
"exactly three consumers" test didn't count) now runs a real `grep -rlF` across `components/` and
`app/` and asserts set equality; the SUMMARY's own non-vacuity check (temporarily adding a fourth
importer) is a real, appropriate proof. WR-03 (a stale 750px "iPhone" figure, disproven by 10-04,
left uncorrected in `phone-setup-landscape.spec.ts`'s header) is fixed — that file's three
describes are now explicitly labelled EMULATED/HAND-SET/EMULATED-that-matches-hardware, so nobody
reading only this file can mistake one number for the other again.

**The `max-shell`/`shell` CSS rewrite itself is logically sound.** Working through the boundary
algebra: `max-shell` fires on `width < 820px` OR `(coarse AND height < 500px)`; `shell` fires on
`width >= 820px` AND `NOT(coarse AND height < 500px)`. By De Morgan's law `NOT(A OR B) = NOT A AND
NOT B`, so `shell`'s condition is the exact complement of `max-shell`'s, at every point including
both boundaries (820px, 500px) and on a device with no pointer information (`pointer: coarse`
simply evaluates false there, which only ever helps the desktop side). I confirmed no remaining
reference to the retired `--breakpoint-shell` token or to Tailwind-derived `min-[820px]:` /
`screens` semantics exists anywhere in the tree. Every e2e spec in this diff that needs to prove
"this viewport keeps the desktop shell" checks all three axes (width, height, pointer) together as
a load-bearing precondition, rather than trusting width alone — `phone-layout.spec.ts`,
`viewer-toolbar.spec.ts`, `slider-touch.spec.ts`, and `site-nav-width.spec.ts` all do this
correctly.

**What's below is a completeness gap in the new regression test that most directly matters (the
one closing WR-01), plus two lower-severity notes.** No BLOCKER-level bug, security issue, or
incorrect production behavior was found in the reviewed diff.

## Warnings

### WR2-01: `e2e/site-nav-width.spec.ts` cannot exercise the real "widened account control" its own title and rationale claim to test — Clerk's fake keys mean it only ever measures a same-suite placeholder of unproven width

**File:** `e2e/site-nav-width.spec.ts:68, 116-135`
**Issue:** This file exists specifically to close WR-01 — the top-nav row that ran 51px past the
viewport at 820px, made 7px worse once the account avatar's tap target grew for touch (D-05). Its
touch-project test is literally named `"the row fits with no horizontal scroll and both end items
on screen, **with the wider touch account control**"` (line 116), and its header comment (lines
16-18) explicitly frames the 863px case as "the touch case where the account control's extra width
made the overflow 7px worse."

But this same diff's own `components/auth/nav-auth-control.test.ts` (lines 13-24) and
`e2e/phone-account.spec.ts` (lines 7-24, unchanged, pre-existing) document, as an empirically
confirmed fact, that under this suite's deliberately fake Clerk publishable key `useUser().isLoaded`
never settles `true` in ANY Playwright project — confirmed by polling the DOM for over 20 seconds.
That means `NavAuthControl` (`components/auth/nav-auth-control.tsx:35-37`) is permanently stuck on
its `!isLoaded` loading-placeholder branch (`<span aria-hidden className="block size-7
coarse:size-11" />`) for the entire life of this suite. Neither the real signed-out "Sign in" text
button (D-06, whose width is driven by 14px text, not by any `coarse:` width class) nor Clerk's
real avatar (D-05, `coarse:p-2!`) is EVER the element `nav.locator("> div").last()` measures in
`site-nav-width.spec.ts` — only the placeholder is, at a fixed `size-7` (28px) on the desktop/mouse
project and `coarse:size-11` (44px) on the touch/android project.

The placeholder's 44px touch footprint happens to match the avatar's target footprint by design
(`nav-auth-control.tsx`'s own comment: "all three states of this control are 44px tall on touch"),
but that equivalence is asserted only for the AVATAR case, not for the "Sign in" text button — which
grows only in HEIGHT under `coarse:` (`coarse:flex coarse:min-h-11 coarse:items-center`, no width
class at all), so its real rendered width is whatever "Sign in" measures at 14px, on BOTH the
mouse-driven and touch-driven cases. That width was never measured or asserted anywhere in this
diff, and there's no reason to expect it exactly equals either 28px or 44px — it's plausibly wider
than the 28px placeholder the mouse-driven desktop describe (`820/844/863px`, the exact band where
the original 51px overflow was measured) uses as its stand-in. If a future change (or the real,
un-faked account state a real user actually sees) makes the true rendered account-control cluster
wider than this suite's synthetic placeholder, the exact bug this file exists to catch could reopen
in production while `site-nav-width.spec.ts` stays green — silently defeating the point of closing
WR-01.

This isn't flagged anywhere in the file's own header, unlike the parallel gap in
`nav-auth-control.test.ts` and `phone-account.spec.ts`, which both explicitly document the
Clerk-never-settles limitation and its consequences for what they can and cannot prove. A reader
of `site-nav-width.spec.ts` alone would reasonably believe the touch case tests the real widened
avatar; it does not, and the file gives no hint that it doesn't.

**Fix:** Either (a) add the same disclosure this codebase's own convention already uses elsewhere
in this exact diff — a comment naming the Clerk-fake-key gap and stating plainly that this file's
account-control measurements come from the loading placeholder, not the real "Sign in" button or
avatar, with a residual-risk note pointing at the founder's real-device sweep the same way
`nav-auth-control.tsx`'s own comment does for the avatar; or (b) close the gap for real with a
component-level (non-Clerk, no-network) measurement of the actual "Sign in" button's rendered
width — e.g. a Vitest + `@testing-library/react` render of `NavAuthControl` with `useUser` mocked
to return `{ isLoaded: true, isSignedIn: false }` (bypassing Clerk's actual network settle), reading
the button's real `getBoundingClientRect().width` under both `pointer: fine` and a forced `coarse`
media condition, and asserting that width is `<=` whatever slack `site-nav-width.spec.ts` currently
assumes is available at 820/844/863px. Option (b) is the one that would actually prove WR-01 is
closed for the case that caused the bug; option (a) is the minimum honest fix.

### WR2-02: `card-thumbnail.tsx`'s viewport-height cap bakes two independently-measured constants into one arbitrary Tailwind value with no shared source of truth, and only a wide (0.70–0.82) band stands between silent drift and a broken "three-quarters" promise

**File:** `components/setup/card-thumbnail.tsx:85`
**Issue:** `max-shell:max-h-[calc(75dvh-204.6px)]` combines two separately-measured constants —
56px of "shell chrome" (the compact phone top bar's height, measured on 2026-09-11 against
`PhoneTopBar`) and 162.59375px of "card chrome" (the preset card's own text/padding, measured
against `preset-card.tsx`) — into a single literal, `204.6`, with no CSS custom property, no named
constant, and no test that would fail if either input drifts independently while the other happens
to compensate. If `PhoneTopBar`'s height ever changes (a longer wordmark, a taller Save button, an
added row) or the preset card's text stack changes (the `text-sm` descriptor line growing or
shrinking), nothing links this literal back to either source; the only backstop is
`e2e/phone-home.spec.ts`'s ratio assertion, which tolerates anywhere from 0.70 to 0.82 — a margin of
roughly ±8% around the intended 0.75. A real regression that moves the ratio to, say, 0.71 or 0.81
(clearly visible to a shaper as "that's not three-quarters anymore") would pass every test in the
suite. The doc comment (lines 40-58) is exemplary at explaining WHERE the number came from, but
that doesn't make the number itself resilient to either input changing later — the whole reason
D-08's original fixed `387px` cap failed was exactly this shape of problem (a number correct for
one measurement, silently wrong once a precondition changed).
**Fix:** At minimum, extract the two named constants into CSS custom properties in `app/globals.css`
next to the `max-shell`/`shell` declarations they're logically related to (e.g.
`--phone-top-bar-height: 56px` and reference it from both `phone-top-bar.tsx`'s own height class and
this calc), so a future height change to the real element is structurally forced to update the one
place this cap reads from, rather than requiring someone to remember to re-measure and re-derive
`204.6`. If that's too large a refactor for this plan's scope, at least add a standing unit or
component test that independently measures `PhoneTopBar`'s rendered height and asserts it still
equals 56 (parallel to `card-thumbnail.tsx`'s own claim that this was "measured identical at two
different viewport heights"), so a future PhoneTopBar change fails loudly here instead of silently
degrading the ratio band.

## Info

### IN2-01: `10-06-SUMMARY.md`'s D3 coverage claim overstates what `phone-home.spec.ts` actually asserts

**File:** `.planning/phases/10-the-whole-app-on-a-phone/10-06-SUMMARY.md:75` (claim);
`e2e/phone-home.spec.ts:322` (actual assertion)
**Issue:** The SUMMARY's D3 coverage entry states: "`e2e/phone-home.spec.ts` and
`e2e/phone-setup-landscape.spec.ts` both assert the first two presets draw outlines at visibly
different widths at every measured viewport." That's true for `phone-setup-landscape.spec.ts`
(which explicitly compares `pathWidths[0]` against `pathWidths[1]`, per that file's own comment
about "the shortboard and the fish specifically"), but not for `phone-home.spec.ts`, whose actual
assertion is `expect(new Set(pathWidths.map((w) => Math.round(w))).size).toBeGreaterThan(1)` — a
weaker "at least one pair among all four differs somewhere" check, not specifically the first two.
The SUMMARY's own "Decisions Made" section (line 149) correctly describes this distinction for
`phone-setup-landscape.spec.ts` ("rather than a set-based 'some pair differs somewhere' check") but
then the D3 coverage table conflates the two files as if they use the same, stronger check. This is
a low-stakes documentation-accuracy slip (the underlying behavior — four visibly distinct presets —
is still true and still tested, just via a looser assertion in one of the two files), not a code
defect.
**Fix:** No code change needed. If the SUMMARY is ever regenerated or amended, correct D3's wording
to note that `phone-home.spec.ts` checks "at least two of the four differ" while
`phone-setup-landscape.spec.ts` checks "the first two specifically differ."

---

_Reviewed: 2026-09-11T17:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
