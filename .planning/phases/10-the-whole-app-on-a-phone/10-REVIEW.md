---
phase: 10-the-whole-app-on-a-phone
reviewed: 2026-09-11T20:34:22Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - components/auth/nav-auth-control.test.ts
  - components/auth/nav-auth-control.tsx
  - components/auth/sign-in-banner.tsx
  - components/design/phone-tab-bar.tsx
  - components/setup/board-rack-card.tsx
  - components/setup/card-thumbnail.tsx
  - components/setup/preset-card.tsx
  - components/site-nav.tsx
  - components/ui/dialog.tsx
  - components/ui/input.css.test.ts
  - components/ui/input.tsx
  - e2e/phone-account.spec.ts
  - e2e/phone-dialogs.spec.ts
  - e2e/phone-home.spec.ts
  - e2e/phone-setup-landscape.spec.ts
  - e2e/phone-trip.spec.ts
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-09-11T20:34:22Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Read every file changed between `6339fc9` and `HEAD` against its diff, plus the surrounding
context needed to check the extraction (`card-thumbnail.tsx`), the route check
(`phone-tab-bar.tsx`), the Clerk `appearance` prop (`nav-auth-control.tsx`), and the responsive
spacing change (`site-nav.tsx`). `npx tsc --noEmit` is clean, and the two new/expanded Vitest
files (`nav-auth-control.test.ts`, `input.css.test.ts`) pass (12/12).

**The extraction, route logic and Clerk usage are all sound.** `CardThumbnail` is a complete,
byte-for-byte-equivalent factoring of the old duplicated markup with no third copy left behind;
both `board-rack-card.tsx` call sites and `preset-card.tsx` pass it the same props the old inline
JSX took. `PhoneTabBar`'s `pathname === "/"` check is exact-equality as advertised, and its claim
of being mounted at both `app/page.tsx` and `app/design/layout.tsx` (each exactly once) checks
out. `nav-auth-control.tsx`'s `appearance={{ elements: { userButtonTrigger: "coarse:p-2" } }}`
carries only a static, hardcoded class-name literal — nothing user-controlled, no email/session/
userId flows near it, confirmed by both reading the source and by
`nav-auth-control.test.ts`'s own regex/substring guard.

**What's below is quality/test-coverage, not correctness.** No BLOCKER-level bug, security
vulnerability, or accessibility regression was found in the reviewed diff. The three warnings are
all about proof gaps: a real, already-fixed layout bug that shipped with no regression test behind
it, a test whose name promises more than its assertions check, and a test docstring whose stated
fact was overtaken by a later plan in this same phase and never corrected.

## Warnings

### WR-01: The top-nav overflow fix in `site-nav.tsx` has no regression test anywhere in this diff

**File:** `components/site-nav.tsx:50,60`
**Issue:** Commit `5dae1f1` (this phase, in scope) changed `px-12` → `px-6 lg:px-12` and
`gap-5` → `gap-4 lg:gap-5` specifically to fix a real, measured horizontal overflow: per that
commit's own message, the desktop-style top nav (wordmark + six tabs + settings + Save + auth
control) ran 51px past the viewport edge at 820px width, and widening the avatar's tap target
(D-05, `nav-auth-control.tsx`) pushed a phone held sideways (where `SiteNav`'s full row — not
`PhoneTopBar` — renders, since sideways crosses the 820px shell threshold) another 7px over. That
is a real bug that shipped broken before this commit and is now fixed.

No test in this diff (or anywhere in the untouched suite, per a scan for `scrollWidth`/`820`/`863`
against `SiteNav`'s own `<nav>`) checks that the top nav fits without horizontal scroll at the
band where the bug occurred: 820–870px width, where `SiteNav`'s row (not `PhoneTabBar` or
`PhoneTopBar`) is what's visible. `e2e/phone-setup-landscape.spec.ts` tests the setup grid at
750px (below the shell breakpoint, where `SiteNav` is `max-shell:hidden` and never the element at
risk). `e2e/phone-home.spec.ts`'s 819/820px test only measures the thumbnail box's height, not the
nav row's width. `e2e/phone-trip.spec.ts`'s `scrollWidth` check runs on the phone projects' default
(port630 portrait) viewports, never at a landscape/desktop-shell width. A future change to any of
the nav's six chrome items (a longer word, a wider button, a new cluster item) could reopen the
exact same 51px/7px overflow with nothing in the suite to catch it.

**Fix:** Add a `scrollWidth`-vs-`viewportSize().width` (or a direct nav-row `boundingBox()`
right-edge) assertion at 820px and at a landscape phone width above it (e.g. 844 or 863px), on the
route where `SiteNav` actually renders (`/` or `/design/outline`), so this specific regression has
a standing test the way the thumbnail cap and the six-tab bar both already do.

### WR-02: `input.css.test.ts`'s "exactly the three known consumers" test doesn't check for a fourth

**File:** `components/ui/input.css.test.ts:96-107`
**Issue:** The test is named "edge case: exactly the three known consumers of Input exist — a
fourth would be a deliberate decision, not an accident," but its body only asserts that the three
named files (`measure-field.tsx`, `rename-dialog.tsx`, `board-name-prompt.tsx`) still import
`Input`. It never greps the codebase for *all* importers of `@/components/ui/input` and asserts
the count is exactly three. If a fourth file starts importing `Input` tomorrow, this test keeps
passing — the "exactly" and "a fourth would be a deliberate decision" language in the test's own
name is not backed by anything the test actually checks, so a reader trusts a completeness
guarantee that isn't there.
**Fix:** Either rename the test to describe what it actually checks ("the three known consumers
still import Input"), or make it live up to its name with something like:
```ts
const importers = execSync(
  `grep -rl 'from "@/components/ui/input"' components app`,
  { cwd: REPO_ROOT },
).toString().trim().split("\n").filter(Boolean);
expect(importers.sort()).toEqual(consumers.sort());
```

### WR-03: `phone-setup-landscape.spec.ts`'s docstring states a figure the same phase later disproved, uncorrected

**File:** `e2e/phone-setup-landscape.spec.ts:4-7`
**Issue:** This file's header states as settled fact: "an iPhone 14 landscape measures 750px wide
(stays in the phone stack)," using Playwright's emulated-device value as "the iPhone case." This
file was written in plan 10-03. Plan 10-04's own real-device sweep (recorded in
`10-04-SUMMARY.md`) later measured a real iPhone held sideways at ~844px and states outright: "The
750px figure the plan trusted for a sideways iPhone came from the test tool's emulated device, not
from hardware... That line is wrong." That correction was applied to CLAUDE.md's Layout section,
but this test file's own docstring — which makes the identical claim about the identical device —
was never revisited. A maintainer reading only this spec (not cross-referencing the later
SUMMARY) would reasonably conclude "the iPhone landscape case" is fully covered and matches real
hardware at 750px, when the phase's own later finding says the opposite for the actual device this
comment names.
**Fix:** Add a one-line note (mirroring CLAUDE.md's own correction) that 750px is Playwright's
`iPhone 14 landscape` emulated viewport, not the ~844px a real iPhone reports sideways, and that
this file therefore doesn't exercise the width band where the real-device sweep found a failure —
so the two-up/height assertions here can't be read as covering that case.

## Info

### IN-01: `nav-auth-control.test.ts`'s "carries no credential handling" test checks less than it implies

**File:** `components/auth/nav-auth-control.test.ts:102-115`
**Issue:** The test title ("carries no credential handling of its own — the only value handed to
Clerk is a class name") reads as a general security guarantee, but the assertions only check for
the absence of three specific literal substrings (`sessionToken`, `email`, `userId`, each built
from concatenated parts to dodge self-matching) plus one regex on the exact `appearance` prop
shape. It would not catch, e.g., a future edit that destructures `const { id } = useUser()` and
passes `id` into a new prop, or accesses `user.emailAddresses` via a different property name. This
is a reasonable smoke check for the specific regression it was written to catch (this diff's own
prior state), but its name overstates what it verifies.
**Fix:** No action required for this diff; if this test is extended later, consider scoping the
claim in the title to "no literal session/email/userId string appears in this file" rather than
the broader "carries no credential handling."

---

_Reviewed: 2026-09-11T20:34:22Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
