---
phase: 10-the-whole-app-on-a-phone
reviewed: 2026-09-12T00:45:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - app/globals.css
  - CLAUDE.md
  - components/design/design-screen-shell.tsx
  - components/design/shell-variant.css.test.ts
  - components/design/toolbar-tip.tsx
  - components/design/toolbar-tip.test.ts
  - components/design/use-viewer-media.ts
  - components/rails/rail-band-editor.tsx
  - components/rails/view-full-sized-dialog.css.test.ts
  - components/setup/card-thumbnail.tsx
  - e2e/phone-fins-landscape.spec.ts
  - e2e/phone-home.spec.ts
  - e2e/phone-layout.spec.ts
  - e2e/phone-rails.spec.ts
  - e2e/phone-setup-landscape.spec.ts
  - e2e/phone-toolbar-tip.spec.ts
  - e2e/slider-touch.spec.ts
  - e2e/viewer-toolbar.spec.ts
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 10 Round-Two Gap Closure (10-09/10-10/10-11): Code Review Report

**Reviewed:** 2026-09-12T00:45:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Reviewed the full diff `ced55db4a7697b67c8f9ecb6b9e08c156443b387..HEAD` covering plan 10-09 (a
floor under the setup screen's board-picture height cap, and moving that cap's gate from the
layout switch to the touch-pointer variant), plan 10-10 (D-10: reverting the phone/desktop layout
switch from "width OR a short touch screen" back to width alone, and moving the Hide Toolbar tip's
gate the same way 10-09 moved the card's cap), and plan 10-11 (hiding the RAILS control column on
the phone's INSTRUCTIONS tab, where nothing on that tab responds to it). `npx tsc --noEmit` is
clean; the three touched Vitest files (`shell-variant.css.test.ts`, `toolbar-tip.test.ts`,
`view-full-sized-dialog.css.test.ts`) pass individually (15 tests). Per this task's constraints I
did not re-run the Playwright suite — the orchestrator's own run at this exact commit (222 passed /
207 skipped / 0 failed) stands.

**The revert itself is executed cleanly.** `app/globals.css`'s `max-shell`/`shell` variants are
back to a plain `width < 820px` / `width >= 820px` pair, kept as explicit `@custom-variant` blocks
(not the pre-10-05 `--breakpoint-shell` theme token) specifically so the compiled-CSS guard test
can keep failing loudly if the decision is ever reversed a third time — a good, deliberate choice.
`shell-variant.css.test.ts` was rewritten correctly from a three-axis proof into a one-axis guard
plus a new case for the tip's own compiled class, and I confirmed no remaining reference to
`--breakpoint-shell` or a Tailwind `screens` token anywhere in the tree. `card-thumbnail.tsx`'s cap
and `toolbar-tip.tsx`'s gate both moved cleanly from `max-shell:` to `coarse:`, exactly as
CLAUDE.md's width-picks-layout/pointer-picks-sizing rule requires, and both moves are proven with a
non-vacuity check in their respective SUMMARYs. WR2-02's remedy (10-REVIEW-2.md) is genuinely
finished, not just relocated: the whole cap is now one CSS custom property
(`--setup-card-thumb-max-h`), and `e2e/phone-home.spec.ts` independently recomputes it from the
three primitives and asserts the browser's own resolved `max-height` agrees within a pixel — a real
closing of the gap, not a re-statement of it.

**What's below is one finding that undoes the very thing plan 10-11 claims to have fixed, for a
real, foreseeable orientation of a real phone, plus a genuine gap left over from the revert's own
completeness, plus a real but narrower scope-creep in the card cap's new pointer gate.**

## Critical Issues

### CR-01: 10-11's RAILS/INSTRUCTIONS fix never reaches a phone turned sideways — D-10, landing one plan earlier in this same round, already moved that exact case into the desktop shell where the fix's gate cannot fire

**File:** `components/rails/rail-band-editor.tsx:236`, tested only at `e2e/phone-rails.spec.ts:253-274`

**Issue:** 10-11 wraps the rail-band controls handed to `DesignScreenShell` in
`<div className={activePage === "instructions" ? "max-shell:hidden" : undefined}>`, so the control
column disappears on INSTRUCTIONS **only when `max-shell:` is active** — i.e., only when the
screen is narrower than 820px. That was a correct gate the day it was tested, against portrait
phones. But plan 10-10, landing immediately before this one in the very same round, redefined what
counts as "phone" for this exact switch: a phone held sideways (about 844 CSS px on a real iPhone,
about 863 on a real Pixel 7 — both measured on 2026-09-11) is now **over** 820px and gets the
**desktop shell**, not the phone stack. In the desktop shell, `DesignScreenShell`'s own
`asideClassName` carries no `order-last` override (that's a `max-shell:` addition too —
`components/design/design-screen-shell.tsx:84,93,95`), so the `<aside>` renders in source order,
beside `<main>`, exactly like a real desktop. Since `max-shell:hidden` cannot fire at 844px or
863px wide, the wrapper carries no class at all there, and the rail-band control column sits
**beside** the INSTRUCTIONS reading on a real phone turned sideways — the exact defect the shaper
reported on 2026-09-11 ("rails keeps the controls under all 3 tabs"), reopened for that one
orientation, with nothing in this diff testing for it.

`e2e/phone-rails.spec.ts`'s two new tests (the phone case at line 253, the desktop case at line
351) both run at their project's *default* viewport — a portrait phone size for `iphone`/`android`,
1280×800 for `desktop`. Neither sets a sideways viewport (`grep -n "844\|863\|setViewportSize"` on
this file turns up only an unrelated `360×700` DATASHEET test). So no test in this repository
proves what a shaper actually sees: rotate a phone on RAILS' INSTRUCTIONS tab, and the controls
that 10-11 claims are now gone come right back — not because the fix regressed, but because the
layout question 10-11's gate depends on was redefined out from under it by the plan directly
before it, in the same round.

10-11-SUMMARY.md's own accomplishment line claims this "clos[es] the shaper's own 2026-09-11
finding ... without touching the shared shell or any other screen" and its "open question for the
founder" section only names the **desktop mouse** case as a deliberately-untouched, pre-existing
oddity — it never considers that D-10 (landing in the wave immediately before it) already moved a
phone turned sideways into that identical bucket. Whether folding phone-sideways into the same
"leave it for the founder" bucket as desktop is the *right* call is a legitimate position — it's
consistent with D-10's own reasoning that a phone on its side should behave like a small desktop —
but nobody made that call explicitly, no comment in `rail-band-editor.tsx` says so, and the
SUMMARY's own unqualified "closes the finding" claim doesn't hold for every orientation the
original sweep exercised (10-SWEEP-2.md's own step 6 explicitly told the tester to rotate the phone
while walking RAILS).

**Fix:** Either (a) decide and document that a phone turned sideways is meant to inherit the same
open desktop question — add a sentence to `rail-band-editor.tsx`'s own comment (right after the
existing "Desktop is deliberately left unchanged" language) naming phone-sideways as the same case
on purpose, and add a test that pins this on purpose (e.g. at `e2e/phone-rails.spec.ts`, a new case
at a real sideways viewport — 844×390 on `iphone`, 863×360 on `android` — asserting the heading IS
visible on INSTRUCTIONS there, with a comment explaining why that's correct); or (b) if the
intended fix really is "phone means phone, any orientation," change the gate to something that
survives D-10 the same way 10-09 already solved this exact problem for the board-card cap: gate on
`coarse:` in combination with the phone-stack layout signal that actually matters here (there isn't
a ready-made "phone regardless of shell" variant, so the pragmatic fix is a small JS check via
`useViewerMedia`-style hook, or accept the narrower `max-shell:hidden` scope and say so explicitly).
Either way, a test at a real sideways-phone viewport must exist before this can be called closed —
right now the fix's coverage table (10-11-SUMMARY.md's own "Six phone results" / "Three desktop
results" tables) never mentions this axis at all.

## Warnings

### WR-01: `e2e/site-nav-width.spec.ts` was not brought along in the revert — it still documents and structurally depends on 10-05's withdrawn width-and-height rule as if it were current fact

**File:** `e2e/site-nav-width.spec.ts:20-21, 126, 157-158, 161-162`

**Issue:** This file was not part of plans 10-09/10-10/10-11 (it's absent from all three plans'
`key-files` lists and from this diff entirely — `git diff --stat` confirms it untouched), but it is
squarely a casualty of D-10's revert and nobody circled back to it. Its own header still states, as
present-tense fact: *"After 10-05, a short TOUCH screen in this band is now the phone layout
(`max-shell` is `width < 820px` OR `coarse pointer AND height < 500px`)"* (lines 20-21) — that rule
no longer exists; `max-shell` is `width < 820px`, full stop, as of this very round. Line 126's
comment repeats the same claim ("keep the desktop shell under the width-and-height `max-shell`
rule"). And the test body itself (lines 157-158, 161-162) still asserts a `tallEnoughForDesktopShell:
window.matchMedia("(min-height: 500px)").matches` precondition and expects it `true` — a check that
used to be load-bearing (proving the touch-tablet viewport genuinely cleared the OLD rule's height
term) but is now testing a condition the current layout switch does not read at all. The test still
*passes* today, because `Galaxy Tab S9 landscape` (1024×640) happens to be both wide and tall enough
regardless of which rule is in force — so this isn't a currently-broken test, it's a **stale,
now-false description of the app** sitting in a comment and a precondition assertion that no longer
proves what it claims to prove. A future reader (or a future height change to this test bed) has no
signal that this file's mental model of the switch is a full round out of date.

This is exactly the kind of leftover 10-10's own thoroughness elsewhere (13 files touched,
including three unrelated doc comments corrected purely for accuracy) shows was in scope for this
round — `site-nav-width.spec.ts` was simply missed.

**Fix:** Update the header comment (lines 20-23) to describe the current rule (width alone, D-10),
noting historically that 10-05 briefly added a height/pointer term and D-10 withdrew it — the same
pattern `phone-fins-landscape.spec.ts`'s header now uses for this exact file's sibling case. Drop
the now-meaningless `tallEnoughForDesktopShell` precondition (lines 158, 162) or replace it with a
comment explaining it's now incidental rather than load-bearing, matching how
`e2e/phone-layout.spec.ts` and `e2e/viewer-toolbar.spec.ts` dropped their own equivalent height
preconditions in this same diff.

### WR-02: The board-card height cap's move from `max-shell:` to `coarse:` (10-09) fixes the sideways-phone case but newly exposes the cap to touch tablets inside the desktop shell at widths and heights nobody tested or decided on

**File:** `app/globals.css:170-179`, `components/setup/card-thumbnail.tsx:74`

**Issue:** Before 10-09, the cap (`max-shell:max-h-[...]`) could only ever apply below 820px wide —
the phone-stack layout, regardless of pointer type. After 10-09, the cap (`coarse:max-h-(--setup-
card-thumb-max-h)`) applies to *any* coarse-pointer device at *any* width, including widths at or
above 820px where the setup screen renders its 4-up desktop grid (`components/setup/setup-
screen.tsx:145`, `lg:grid-cols-4`). This is a deliberate, documented, and correct fix for the case
D-10 needed protected (a real phone held sideways, now living in the desktop-shell width range) —
but it also newly reaches touch tablets that were never in scope for this cap and were never at
risk of it before.

Concretely: at a coarse-pointer viewport of 1024×600 (a plausible small Android tablet, or a
touch-laptop browser window with reduced vertical chrome, landscape) the setup screen's 4-column
grid gives each card thumbnail a computed width of ~198 CSS px (1024 − 2×32px container padding − 3
gaps of 24px, divided by 4, minus 2×12px card padding), whose own `aspect-[340/620]` would draw it
at ~361px tall. But the composed cap at that height is
`max(220, 0.75×(600−56) − 162.6) = max(220, 245.4) = 245.4px` — about 32% shorter than the aspect
ratio wants. The result: a board picture squeezed to 245px inside a 198px-wide box (an aspect far
from the intended 340:620), on a device class (tablets in the desktop-shell width band) this cap
was never gated to reach before this plan, and that no test in this diff — or in
`e2e/phone-home.spec.ts`'s desktop-project (1280×800, fine pointer) or
`e2e/phone-setup-landscape.spec.ts`'s three sideways-phone describes — exercises. This is exactly
the "converse risk" the plan's own reasoning (moving the gate from width to pointer, per CLAUDE.md's
own width-picks-layout/pointer-picks-sizing rule) predicts but never checks: the pointer variant
does not know it's being asked to protect a phone specifically, only that *some* coarse-pointer
device is present, at whatever width and height that device happens to have.

**Fix:** Either (a) accept this consciously — add a sentence to `card-thumbnail.tsx`'s own doc
comment (which currently only discusses the mouse/no-cap and phone/floor cases) naming the tablet
case and stating it's an acceptable consequence of the pointer-based gate, plus one standing test at
a coarse-pointer, desktop-shell-width, modest-height viewport (e.g. 1024×600) proving the cap
resolves to a value the team has actually looked at and approved; or (b) narrow the gate so it only
reaches the phone-stack layout's own width band even while reading the pointer axis — e.g.
`coarse:max-shell:max-h-(...)` is the wrong direction (that's what 10-09 explicitly moved away
from to survive D-10), but a width ceiling on the pointer variant (`coarse:max-w-[some tablet
cutoff]:...`) or a JS-computed cap for the rare tablet case would close it without reopening the
sideways-phone bug 10-09 was written to fix. At minimum, this should be a named, decided question
for plan 10-08's re-sweep (which already owns the open "is 220px the right floor" question) rather
than an unexamined side effect of the gate migration.

## Info

### IN-01: `e2e/phone-toolbar-tip.spec.ts`'s new comment claims more than its own test proves

**File:** `e2e/phone-toolbar-tip.spec.ts:165-168` (comment), `:175-183` (test)
**Issue:** The comment added ahead of the "never appears on a computer" describe says: *"a desktop
CAN be exactly 819px wide (still the phone layout) and still never see this tip, because it has no
coarse pointer to satisfy the gate."* That's true of the code, but the test immediately below it
still only checks 1280px (the desktop project's default viewport), unchanged from before this
plan — the 819px case the comment specifically calls out is never exercised. Not a functional
problem (the underlying claim is correct and the pointer-based gate does make it true), but the
comment oversells what the adjacent assertion demonstrates.
**Fix:** No code change required for correctness. If this comment is kept, either add a second
case at 819px (cheap: `setViewportSize({width: 819, height: 900})` before the existing assertions)
or soften the comment to describe what the gate implies rather than stating it as something this
specific test proves.

---

_Reviewed: 2026-09-12T00:45:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
