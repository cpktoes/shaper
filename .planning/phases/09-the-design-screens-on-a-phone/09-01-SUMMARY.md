---
phase: 09-the-design-screens-on-a-phone
plan: 01
subsystem: testing
tags: [playwright, e2e, screenshot-testing, pointer-events, clerk]

requires: []
provides:
  - "@playwright/test dev dependency, pinned ^1.63.0, with iphone/android/desktop projects"
  - "playwright.config.ts — port 3100 dev server, deliberate non-secret Clerk/DB env, no .env.local needed"
  - "e2e/desktop-baseline.spec.ts + five committed baseline PNGs — the desktop 'before' picture every later plan in this phase must not disturb"
  - "e2e/desktop-regression.spec.ts — PHON-05's standing mouse-drag proof on TEMPLATE and ROCKER"
  - "data-drag-target test hook on outline-viewer.tsx's and rocker-viewer.tsx's hit circles"
affects: [09-02, 09-03, 09-04, 09-05, 09-06, 09-07]

actuals:
  tokens: 3942
  tasks: 3
  commits: 4

tech-stack:
  added: ["@playwright/test@^1.63.0"]
  patterns:
    - "webServer env carries deliberate non-secret pk_live_/sk_live_-format Clerk keys (not pk_test_/sk_test_) so the design routes render signed-out without ever touching .env.local or a real Clerk instance"
    - "test.beforeEach(async ({}, testInfo) => test.skip(testInfo.project.name !== 'desktop', ...)) is the working desktop-only guard for a describe block (a describe-level test.skip callback errors — testInfo is only available inside a test/hook body)"
    - "data-drag-target attribute on SVG hit circles as a stable, pixel-inert Playwright locator hook"

key-files:
  created:
    - playwright.config.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/rails-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/fins-desktop-desktop-darwin.png
    - e2e/desktop-regression.spec.ts
  modified:
    - package.json
    - package-lock.json
    - .gitignore
    - components/outline/outline-viewer.tsx
    - components/rocker/rocker-viewer.tsx

key-decisions:
  - "Clerk fake keys must use pk_live_/sk_live_ prefixes, not pk_test_/sk_test_ — pk_test_ marks a Clerk 'development' instance, which makes clerkMiddleware redirect every request through a dev-browser JWT handshake against the decoded fake host; that handshake 400s and aborts navigation before the page ever paints. pk_live_ skips that dev-only handshake entirely."
  - "The widepoint's mouse-drag regression proof asserts on WP Offset changing, not Width — the widepoint drag solve (lib/geometry/outline-drag.ts) reads only the along-the-board component and discards the cross-board one by design (quick task 260822-lg3), so Width can never move from a drag."

requirements-completed: [TEST-01, PHON-05]

coverage:
  - id: D1
    description: "@playwright/test installed as a dev-only dependency with iphone (WebKit), android (Chromium) and desktop (Chromium, 1280x800) projects; suite needs no .env.local"
    requirement: "TEST-01"
    verification:
      - kind: other
        ref: "npx playwright test --list (21 tests in 2 files across 3 projects)"
        status: pass
      - kind: other
        ref: "node -e check devDependencies['@playwright/test'] present, dependencies absent"
        status: pass
    human_judgment: false
  - id: D2
    description: "Committed 'before' screenshots of all five desktop design screens (TEMPLATE/ROCKER/RAILS/VOLUME/FINS), stable across repeated runs with no source change"
    requirement: "PHON-05"
    verification:
      - kind: e2e
        ref: "e2e/desktop-baseline.spec.ts (5 tests, desktop project) — passed 3 consecutive runs, no --update-snapshots"
        status: pass
    human_judgment: false
  - id: D3
    description: "Automated mouse-drag proof: TEMPLATE's widepoint and ROCKER's nose tip handle still reach the geometry solver via a real page.mouse drag, against unmodified app source"
    requirement: "PHON-05"
    verification:
      - kind: e2e
        ref: "e2e/desktop-regression.spec.ts (2 tests, desktop project) — passed 2 consecutive runs"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-09-09
status: complete
---

# Phase 9 Plan 1: Playwright Installed, Desktop Baseline Locked In Summary

**Playwright installed dev-only with iPhone/Android/Desktop device profiles; five committed desktop screenshots and a passing mouse-drag test now measure "desktop untouched" as pixels and behavior, not a promise.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3 (plus one same-scope fix commit, see Deviations)
- **Files modified:** 13 (2 app-source files each with a single-line test hook; the rest are new test/config files and 5 committed PNGs)

## Accomplishments

- `@playwright/test@^1.63.0` installed as a dev-only dependency (verified absent from `dependencies`), Chromium and WebKit browsers downloaded successfully
- `playwright.config.ts`: `iphone` (`devices["iPhone 14"]`), `android` (`devices["Pixel 7"]`), `desktop` (`devices["Desktop Chrome"]` at 1280×800); dev server on port 3100 (never 3000); no `.env.local` needed anywhere in the suite
- `e2e/desktop-baseline.spec.ts` + five committed baseline PNGs (`outline/rocker/rails/volume/fins-desktop-desktop-darwin.png`) — the "before" picture PHON-05's "desktop untouched" is measured against for the rest of this phase; passed three consecutive runs with no `--update-snapshots` between them
- `e2e/desktop-regression.spec.ts` — a real `page.mouse` drag on TEMPLATE's widepoint (proves WP Offset updates) and ROCKER's nose tip handle (proves Nose Angle updates), run against today's untouched pointer-event wiring
- `npm test` (2260 tests) and `npx tsc --noEmit` both stay clean throughout

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Playwright and point it at a dev server that needs no secrets** — `4121b5b` (test)
2. **Fix: fake Clerk keys must be pk_live_/sk_live_, not pk_test_/sk_test_** — `2efe936` (fix — Rule 3 auto-fix, discovered while implementing Task 2, see Deviations)
3. **Task 2: Photograph all five desktop design screens before anything moves** — `f9c9c86` (test)
4. **Task 3: An automated mouse drag that proves the desktop drawings still answer to a mouse** — `a23a255` (test)

## Files Created/Modified

- `playwright.config.ts` - new config: testDir `./e2e`, webServer on port 3100 with fake Clerk/DB env, three projects, `fullyParallel: false`/`workers: 1`
- `package.json` - added `test:e2e` and `test:e2e:phone` scripts, `@playwright/test` devDependency
- `package-lock.json` - lockfile diff for the new dependency
- `.gitignore` - ignores Playwright's own scratch dirs (`test-results/`, `playwright-report/`, `blob-report/`, `playwright/.cache/`); `e2e/` and `*-snapshots/` stay committed
- `e2e/desktop-baseline.spec.ts` - five desktop screenshots (TEMPLATE/ROCKER/RAILS/VOLUME/FINS), sign-in banner dismissed via `sessionStorage` before each shot
- `e2e/desktop-baseline.spec.ts-snapshots/*.png` - the five committed baseline images
- `e2e/desktop-regression.spec.ts` - the mouse-drag regression proof
- `components/outline/outline-viewer.tsx` - one line: `data-drag-target={d.target}` on the transparent hit circle (test hook only, no visual/behavioural change)
- `components/rocker/rocker-viewer.tsx` - same one-line hook on its own hit circle

## Decisions Made

- **Clerk fake keys must be `pk_live_`/`sk_live_`, not `pk_test_`/`sk_test_`.** RESEARCH.md's own env values (`pk_test_...`) were verified only with a `curl` request, which never runs Clerk's client-side JS. A real headless-browser render showed `pk_test_` marks the app a Clerk "development" instance, and `@clerk/nextjs`'s `clerkMiddleware` then redirects every request through a dev-browser JWT handshake against the decoded fake host (`example.clerk.accounts.dev`) before the page ever paints — that handshake 400s ("Invalid host") against a host with no real registered Clerk instance, aborting navigation entirely, no matter how open the route is. Switching to `pk_live_`/`sk_live_` (same fake payload, still no real credential — all-zeros secret) marks the instance "production," which skips that dev-only handshake; Clerk fails quietly with a console warning instead and the page renders normally, signed out, exactly as intended. See fix commit `2efe936`.
- **The TEMPLATE mouse-drag proof asserts on WP Offset, not Width.** The plan's task text named "Width" as the field to assert on, but `lib/geometry/outline-drag.ts`'s `"widepoint"` case reads only the along-the-board (station) component of a widepoint drag and discards the cross-board (width) one entirely by design — quick task `260822-lg3`'s "widepoint drag constrained to offset only" (recorded in STATE.md). A widepoint drag can never move Width, in any direction, at any distance; Width stays a slider-only input on purpose. The test asserts on the field the code actually updates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `pk_test_`/`sk_test_` fake Clerk keys blocked every design screen from rendering in a real browser**
- **Found during:** Task 2 (writing the desktop baseline screenshots — every one of the five routes failed with zero `<svg>` elements found)
- **Issue:** RESEARCH.md's chosen fake env values use the `pk_test_`/`sk_test_` prefix. A `pk_test_` key marks the Clerk instance "development" to `@clerk/nextjs`'s middleware, which then redirects the browser through a dev-browser JWT handshake against the fake key's decoded host. That handshake hits Clerk's real servers and returns `400 Invalid host` (no such instance exists), which aborts the page navigation before any content — including the drawing — ever paints. `curl`, which never executes Clerk's client-side JS, cannot see this failure, which is why it slipped past RESEARCH.md's own verification.
- **Fix:** Switched both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` in `playwright.config.ts`'s `webServer.env` to the `pk_live_`/`sk_live_` prefix (same fake base64 payload / all-zeros secret — still no real credential, still never touching `.env.local`). Production-instance keys skip the dev-browser handshake entirely; Clerk fails quietly with a console warning and the app renders normally.
- **Files modified:** `playwright.config.ts`
- **Verification:** Confirmed with a scripted headless-browser render before and after the change (`SVG COUNT: 0` → `SVG COUNT: 14`), then all five baseline tests + both regression tests passing across three consecutive full-suite runs.
- **Committed in:** `2efe936` (separate commit, ahead of the Task 2 commit, since Task 1's own file was what needed the fix)

**2. [Rule 1 - Bug] TEMPLATE's mouse-drag proof named the wrong field**
- **Found during:** Task 3 (the widepoint drag test failed — Width never changed, no matter the drag distance or direction)
- **Issue:** The plan's task text says to assert on "Width — …" text changing after a widepoint drag. `lib/geometry/outline-drag.ts`'s `"widepoint"` case discards the cross-board (width) component of every widepoint drag by design (quick task `260822-lg3`), so Width can never change from a drag — only WP Offset can.
- **Fix:** Test asserts on `Offset — …` instead, and the drag direction changed from horizontal (width axis, which the code ignores) to vertical (the board's length axis, which the code reads). Both the test name and its header comment were corrected to describe the actual behavior, with a note explaining why.
- **Files modified:** `e2e/desktop-regression.spec.ts`
- **Verification:** Test passes reliably across two consecutive full-suite runs; `lib/geometry/outline-drag.test.ts`'s existing suite (part of `npm test`'s 2260 passing tests) already covers the exact solve this test exercises end-to-end through the browser.
- **Committed in:** `a23a255` (part of the Task 3 commit — the file was still in-progress when this was found)

---

**Total deviations:** 2 auto-fixed (1 Rule 3, 1 Rule 1)
**Impact on plan:** Both fixes were necessary for the suite to run at all / to assert something true. No scope creep — no application behavior changed, no file outside the plan's own `files_modified` list (plus the one line each on the two viewers the plan explicitly permitted) was touched.

## Issues Encountered

None beyond the two deviations above.

## Human verification deferred to end-of-phase UAT

None for this plan — no application behavior changed. The five committed baseline screenshots and the two mouse-drag assertions are themselves the evidence that "desktop untouched" holds; a human re-checking them visually would be re-doing what the automated suite already measures. `workflow.human_verify_mode` is end-of-phase per project config, and there is nothing here that automation cannot already confirm.

## User Setup Required

None - no external service configuration required. The suite runs entirely against fake, non-secret env values baked into `playwright.config.ts`; no `.env.local` is read, created, or needed.

## Next Phase Readiness

- `npm run test:e2e` (all three projects) and `npm run test:e2e:phone` (iphone + android only) are ready for later plans in this phase to extend.
- The five baseline PNGs and `e2e/desktop-regression.spec.ts` are the standing "desktop untouched" proof every later plan in Phase 9 must re-run and keep passing.
- `data-drag-target` is now available on both viewers' hit circles for any later plan that needs to locate a drag target reliably (e.g. touch-drag tests).
- No blockers for 09-02 onward.

## Self-Check: PASSED

All 9 created artifacts confirmed on disk (`playwright.config.ts`, both spec files, five baseline
PNGs, this SUMMARY) and all 5 commits (`4121b5b`, `2efe936`, `f9c9c86`, `a23a255`, `2ffed90`)
confirmed in `git log`. No missing items.

---
*Phase: 09-the-design-screens-on-a-phone*
*Completed: 2026-09-09*
