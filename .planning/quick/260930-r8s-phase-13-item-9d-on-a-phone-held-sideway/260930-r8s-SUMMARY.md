---
phase: quick-260930-r8s
plan: 01
subsystem: ui
tags: [top-nav, phone-menu, playwright, responsive, tailwind]

requires:
  - phase: quick-260930-fjm
    provides: "PhoneTopBar mounted on every address below the shell width, including the not-found page"

provides:
  - "On any screen 500 dots tall or less (a phone held sideways, at any width), the phone's 56-dot thin top bar replaces the desktop link row, so SHAPER ASSISTANT stays on one line"
  - "The phone menu's new first group: the six design screens, current one ticked, drawn only at the desktop-shell width where there is no bottom tab bar"
  - "A new browser spec (e2e/phone-sideways-top-bar.spec.ts) proving the thin bar and the screens group on both real sideways-phone widths, a tall computer window, and an upright phone"
  - "Two older sideways tests in e2e/phone-layout.spec.ts rewritten to expect the thin bar and the menu walk instead of the now-hidden desktop row"

affects: [design-screens, layout, claude-md-layout-section]

actuals:
  tokens: 12100
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Height-alone media query written inline as [@media(max-height:500px)] on a component's own className, the same form design-screen-shell.tsx, RAILS and FINS already use — never a named Tailwind variant"
    - "A list (NAV_LINKS) handed down as a prop through one import edge (SiteNav to PhoneTopBar to PhoneMenu) to avoid an import loop, rather than importing it back from a child"

key-files:
  created:
    - e2e/phone-sideways-top-bar.spec.ts
  modified:
    - components/site-nav.tsx
    - components/design/phone-top-bar.tsx
    - components/design/phone-menu.tsx
    - components/design/phone-tab-bar.tsx
    - e2e/phone-layout.spec.ts
    - e2e/site-nav-width.spec.ts

key-decisions:
  - "F-1 (founder): one thin line sideways — the phone's own compact bar with its menu button, so SHAPER ASSISTANT stops wrapping"
  - "O-1 (orchestrator): height alone, inline as [@media(max-height:500px)], at any width — width still picks the layout, pointer still picks sizes"
  - "O-2 (orchestrator): the six screens become the menu's own group, drawn only where the tab bar is absent (the desktop-shell width), so an upright phone's menu is unchanged"

requirements-completed: [QT-260930-r8s, 13-SPEC-item-9d]

coverage:
  - id: D1
    description: "On a phone held sideways, every screen (the six design screens, the home screen, a mistyped address) shows the 56-dot phone bar with the name on one line, not the wrapped desktop row"
    requirement: "13-SPEC-item-9d"
    verification:
      - kind: e2e
        ref: "e2e/phone-sideways-top-bar.spec.ts#every screen has the thin bar (both the Pixel 7 and the iPhone describes, lines 268 and 370)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Sideways, the menu's first group is the six screens, current one ticked, all six reachable by a client-side move with no page reload"
    requirement: "13-SPEC-item-9d"
    verification:
      - kind: e2e
        ref: "e2e/phone-sideways-top-bar.spec.ts#the menu walks to all six screens, current one ticked, without reloading (line 280); #the menu walks to all six screens (line 382)"
        status: pass
    human_judgment: false
  - id: D3
    description: "All six screens are in the menu's first view the moment it opens, on both real sideways-phone widths, including with Safari's own bar showing on an iPhone"
    requirement: "13-SPEC-item-9d"
    verification:
      - kind: e2e
        ref: "e2e/phone-sideways-top-bar.spec.ts#all six screens are in view the moment the menu opens (line 284); #with Safari's bar showing (844x340), all six screens are in view (line 386)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Everything the desktop row offered — Save, Home, Contact, Privacy, Units, Theme, Fit & Tip Defaults, Blank Makers, the account control — is still reachable sideways"
    requirement: "13-SPEC-item-9d"
    verification:
      - kind: e2e
        ref: "e2e/phone-sideways-top-bar.spec.ts#everything the desktop row offered is still here (line 289)"
        status: pass
    human_judgment: false
  - id: D5
    description: "A tall computer window (1280x800, 1024x768, 820x800) and an upright phone are unchanged: the desktop row (or tab bar) still shows, and the gear/phone menu carries no screens group"
    requirement: "13-SPEC-item-9d"
    verification:
      - kind: e2e
        ref: "e2e/phone-sideways-top-bar.spec.ts#at {size} the desktop row shows, and the gear menu has no screens group (line 404, x3); #the desktop row stays hidden, the tab bar and phone bar are unchanged, and the menu has no screens group (line 438)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The five desktop reference pictures (TEMPLATE, ROCKER, RAILS, VOLUME, FINS) pass untouched, and the two older sideways tests in phone-layout.spec.ts pass with the rewritten expectations"
    verification:
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts (5 screenshots, no snapshot re-recorded); e2e/phone-layout.spec.ts's two sideways describes"
        status: pass
    human_judgment: false
  - id: D7
    description: "How the thin bar and the menu's screens group actually look and feel on a real phone held sideways — a human's eye and thumb"
    verification: []
    human_judgment: true
    rationale: "Playwright's emulated viewports prove the mechanism (the right rule fires, the right elements show) but not how it reads or feels in the hand — the founder walks this on real hardware, as they did for 10-SWEEP-2.md's D-10"

duration: 70min
completed: 2026-09-30
status: complete
---

# Phase 13 Quick Task 260930-r8s: A Thin Top Bar on a Phone Held Sideways Summary

**On any screen 500 dots tall or less — a phone held sideways, at any width — the phone's own 56-dot thin top bar now replaces the desktop link row, and its Menu gains the six design screens as a new first group, so SHAPER ASSISTANT stops wrapping and every screen stays one tap away.**

## What a shaper sees

**Before this task:** holding a phone sideways (an iPhone at roughly 844 dots wide, a Pixel 7 at roughly 863), the app judged the screen wide enough for the desktop layout and drew the full desktop top row — the name, six screen links, the gear, Save and the account button. At that width the name wrapped onto two lines and the row ate about a quarter of the screen's height (93 dots in this test harness, about 105 on the live site, where Clerk's real account button is wider than the harness's signed-out stand-in).

**After this task:** the same sideways phone now gets the phone's own thin bar instead — 56 dots tall, SHAPER ASSISTANT on one line, Save, then the Menu button — on every address, including the home screen and a mistyped address. The drawing gets the 37 dots of headroom back. Opening the Menu shows the six screens first (TEMPLATE, ROCKER, RAILS, VOLUME, FINS, SUMMARY), the current one ticked, all six fitting in the first view with no scrolling — tapping one moves there without reloading the page, so a board in progress is kept. Everything else the desktop row used to offer — Home, Contact, Privacy, Units, Theme, Fit & Tip Defaults, Blank Makers, the account control — is still in the menu below the six screens. The board's own layout is unchanged: controls still sit beside the board, never stacked above it. An upright phone and a computer see no change at all.

## How the switch works

Screen height alone — not width, not pointer type — now also decides which top bar draws, written inline on each component's own className as `[@media(max-height:500px)]`, the same form `design-screen-shell.tsx`, RAILS and FINS already use for their own short-screen rules (CLAUDE.md's third switch). A real desktop window is never under 500 dots tall, so a mouse never sees this. The desktop row (`components/site-nav.tsx`) now hides there; the phone bar (`components/design/phone-top-bar.tsx`) now shows there. The one list of six screens (`NAV_LINKS`) is handed down as a prop — `SiteNav` to `PhoneTopBar` to `PhoneMenu` — rather than imported back into the menu, so the one list stays one list with no import loop. The menu's new screens group (`components/design/phone-menu.tsx`) is drawn only at the desktop-shell width (`hidden shell:flex` on each row), so an upright phone's menu — where the bottom tab bar already offers the six screens — is unchanged; each row stays a real menu item even while hidden by CSS, so Base UI's arrow-key navigation and type-to-jump correctly skip it there instead of landing on an invisible row.

## Commits

1. **Task 1 (tracer): the thin bar and the menu's screens group, proven on one sideways phone and one screen walk** — `7613189`
   - `[@media(max-height:500px)]:hidden` added to the desktop row; `[@media(max-height:500px)]:flex` added to the phone bar
   - `PhoneMenu`'s first group: the six screens, current one ticked, drawn only at the desktop-shell width
   - New spec `e2e/phone-sideways-top-bar.spec.ts` with its shared helpers and one Pixel-7-sideways test (TEMPLATE to ROCKER via the menu)
2. **Task 2: both sideways phones, every screen, a tall computer window, and an upright phone, all proven** — `f012b19`
   - Expanded the new spec: every route on both real sideways widths, the full six-screen walk, the fold check (including with Safari's own bar showing on an iPhone), everything the desktop row offered, arrow-key behavior, a tall computer window, and an upright phone
   - Rewrote the two sideways describes in `e2e/phone-layout.spec.ts` that used to assert the now-hidden desktop row
   - Comment-only updates in `e2e/site-nav-width.spec.ts` and `components/design/phone-tab-bar.tsx`
3. **Fix: a doc comment no longer duplicates the literal Tailwind token the orchestrator's post-merge grep checks for** — `e3f78e7`
   - `components/design/phone-top-bar.tsx`'s own doc comment had restated `[@media(max-height:500px)]:flex` in backticks, which would have made the orchestrator's `grep -c ... is 1` check fail against 2; reworded to describe the rule in words

**Plan metadata:** this SUMMARY, committed separately inside the worktree per the plan's `<output>`.

## Measured, before and after

Bar heights, measured in this harness with Clerk's real (wider) account control replaced by its signed-out stand-in — the plan's own P-1 provides the "before" figures, carried forward from plan-time measurement; "after" is what this task's own tests logged on every route:

| Screen | Before (this harness) | Before (live site estimate) | After |
|---|---|---|---|
| Pixel 7 sideways, 863x360 | desktop row, 93 dots, name on 2 lines | about 105 dots | phone bar, 56 dots, name on 1 line (confirmed on all 8 routes) |
| iPhone sideways, 844x390 | desktop row, 93 dots, name on 2 lines | about 105 dots | phone bar, 56 dots, name on 1 line (confirmed on all 8 routes) |

Menu popup box, measured by this task's own tests (`console.log` in `assertAllSixInFirstView`):

- Pixel 7 sideways, 863x360: popup 295.5 dots tall, last screen row's bottom edge at 330.4 (page-absolute y) — close to the plan's P-4 estimate of 294.
- iPhone sideways with Safari's own bar showing, 844x340: popup 275.5 dots tall, last screen row's bottom edge at 330.7 — close to the plan's P-4 estimate of 274.

All six screen rows measured at least 43.5 dots tall under a touch pointer (the `coarse:min-h-11` token is 44px by its own rem math; the browser's subpixel layout can round a measured box a shade under that, observed 43.99998) and sat whole inside the popup's own box — no clipping, no scrolling needed to reach the sixth screen.

## Test counts

- **Unit (`npx vitest run lib/error-pages/wiring.test.ts`):** 16 passed
- **Full unit suite (`npm test`):** 92 files, 3612 passed, 2 skipped
- **`npx tsc --noEmit`:** clean
- **`npm run lint -- --max-warnings 0`:** clean
- **Targeted run** (`e2e/phone-sideways-top-bar.spec.ts e2e/phone-layout.spec.ts e2e/site-nav-width.spec.ts e2e/desktop-baseline.spec.ts`, all three projects): 53 passed, 70 skipped, 0 failed
- **The sideways/menu specs P-8 named as "should not move"** (`phone-rails`, `phone-setup-landscape`, `phone-fins-landscape`, `viewer-toolbar`, `slider-touch`, `phone-toolbar-tip`, `phone-home`, `contact`, `privacy`, `error-pages`, all three projects): 187 passed, 89 skipped, 0 failed — none needed a changed expectation
- **Full browser suite, one foreground run per project:**
  - **desktop:** 165 passed, 119 skipped, 0 failed (9.5m)
  - **iphone:** 182 passed, 102 skipped, 0 failed (12.0m)
  - **android:** 194 passed, 90 skipped, 0 failed (10.5m)
  - **Total:** 541 passed, 311 skipped, 0 failed

No desktop reference screenshot was re-recorded (`git diff --stat 892635c -- e2e/*-snapshots` is empty) — confirmed after both the Task 2 commit and the doc-comment fix commit.

## Human verification deferred

Per the orchestrator's rulings (`workflow.human_verify_mode` is end-of-phase, so these go here rather than a mid-run checkpoint), the founder walks this on real hardware before it ships:

1. On a real iPhone and a real Android phone held sideways: TEMPLATE, RAILS, SUMMARY, the home screen and a mistyped address each show one thin bar with the name on one line, not the old wrapped desktop row.
2. Opening the Menu sideways shows the six screens first, current one ticked; tapping two of them moves there and the board in progress is kept.
3. The Menu also still has Save on the bar, and Sign in (or the account button), Units, Theme, Blanks, Contact, Privacy and Home inside it.
4. Turning the phone upright shows today's bar, tab bar and menu — unchanged.
5. On a computer, today's top row — unchanged.

## Found, not fixed

- **P-10 (the plan's own finding, carried forward): a narrow but tall computer window (820 wide, 800+ tall) still wraps the name onto two lines.** That row is 89 dots tall there — decided by width, not height, so it's outside this item. Left for the founder; fixing it would change the desktop row on a computer, which this quick task was scoped not to touch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A too-early click on a freshly opened menu row closed the menu without navigating**
- **Found during:** Task 1, writing the tracer test
- **Issue:** Clicking a `Menu.Item` in the Screens group immediately after opening the menu was flaky — about 1 run in 3, the click landed before Base UI's anchored positioning had fully settled, which still closed the popup (Base UI's own default behavior on any item click) without the row's own `onClick` ever firing, so the navigation never happened.
- **Fix:** Added `navigateViaMenu`, which retries the whole open-and-click gesture (reopening the menu if it's already closed) rather than retrying the click alone — the same "retry the whole interaction" idiom `e2e/blank-makers.spec.ts` and `e2e/contact.spec.ts` already use for their own popups. Reused for `walkAllSixFromTheMenu` in Task 2.
- **Files modified:** `e2e/phone-sideways-top-bar.spec.ts`
- **Verification:** Re-ran the affected test 4 times in a row after the fix — all passed; the same navigation pattern then ran cleanly across the full six-screen walk on both sideways phones in every subsequent run.
- **Committed in:** `7613189` (part of Task 1's commit)

**2. [Rule 3 - Blocking] `page.goto` on real WebKit raced a background Fast Refresh reload**
- **Found during:** Task 2, running the "every screen has the thin bar" test on the `iphone` project
- **Issue:** Repeated hard navigations (one per route) on WebKit hit a known dev-server quirk, already documented in this codebase's own comments (`e2e/phone-layout.spec.ts`, `e2e/phone-toolbar-tip.spec.ts`): a background Fast Refresh full reload right after `/design/outline`'s first paint can interrupt a `page.goto` that follows soon after, throwing "interrupted by another navigation."
- **Fix:** Added a `gotoRoute` helper that retries `page.goto` itself (via `expect(...).toPass`), rather than switching to client-side navigation — this test's whole point is proving every address with a fresh hard load, so retrying the goto (not changing what it proves) was the right fix.
- **Files modified:** `e2e/phone-sideways-top-bar.spec.ts`
- **Verification:** Both the android (Chromium) and iphone (WebKit) "every screen has the thin bar" tests passed cleanly afterward, including the eight-route iPhone run that originally failed.
- **Committed in:** `7613189`/`f012b19` (the helper was added in Task 1 alongside the other helpers, used starting in Task 2's route loops)

**3. [Rule 1 - Bug] A doc comment literally re-quoted the one Tailwind token the orchestrator's post-merge grep checks for**
- **Found during:** final self-check, running the orchestrator's own post-merge grep commands locally before writing this SUMMARY
- **Issue:** `components/design/phone-top-bar.tsx`'s doc comment restated `` `[@media(max-height:500px)]:flex` `` in backticks as prose, so `grep -c '\[@media(max-height:500px)\]:flex' components/design/phone-top-bar.tsx` returned 2, not the 1 the plan's `<verification>` section expects.
- **Fix:** Reworded the comment to describe the rule in words instead of re-quoting the exact class string.
- **Files modified:** `components/design/phone-top-bar.tsx`
- **Verification:** Re-ran all five of the orchestrator's listed grep checks after the fix — every one now returns the exact count the plan expects (1, 1, ≥1, ≥1, 1); re-ran `npx tsc --noEmit`, `npm run lint`, the wiring unit test, and `e2e/desktop-baseline.spec.ts --project=desktop` (5/5 passed, no re-record).
- **Committed in:** `e3f78e7`

**Also noted, not a deviation:** the test timeout for the eight-route "every screen has the thin bar" test needed raising to 90 seconds (matching `e2e/contact.spec.ts`'s own eight-route walk, which uses the identical budget) — a test-authoring choice within the plan's own instructions, not a fix to anything broken.

---

**Total deviations:** 3 auto-fixed (2 Rule 1, 1 Rule 3). **Impact on plan:** all three are test-robustness and verification-compliance fixes inside the plan's own named files — no scope creep, no change to the shipped behavior the plan specified.

## Issues Encountered

None beyond the three deviations above, all resolved before moving on.

## Threat Flags

None — no new attack surface. This plan's own `<threat_model>` registered the only new surface (the menu's screens group and its reachability), and nothing built here goes beyond what that register already covers: no new request, no new storage, no new logging.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Code and tests are complete and committed inside this worktree (`7613189`, `f012b19`, `e3f78e7`), ready for the orchestrator's merge. CLAUDE.md's Layout section (P-9) and the docs commit are explicitly the orchestrator's work, not this executor's — see the plan's `<objective>` scope note. The five items under "Human verification deferred" above are the founder's own check on real hardware before the merge is pushed.

---
*Phase: quick-260930-r8s*
*Completed: 2026-09-30*

## Self-Check: PASSED

- `e2e/phone-sideways-top-bar.spec.ts` — FOUND
- `components/site-nav.tsx` — FOUND
- `components/design/phone-top-bar.tsx` — FOUND
- `components/design/phone-menu.tsx` — FOUND
- `components/design/phone-tab-bar.tsx` — FOUND
- `e2e/phone-layout.spec.ts` — FOUND
- `e2e/site-nav-width.spec.ts` — FOUND
- Commit `7613189` — FOUND in `git log`
- Commit `f012b19` — FOUND in `git log`
- Commit `e3f78e7` — FOUND in `git log`
- `e2e/*-snapshots` diff against 892635c — empty (no screenshot re-recorded)
- All five orchestrator post-merge grep checks — re-run locally, all return the expected count
