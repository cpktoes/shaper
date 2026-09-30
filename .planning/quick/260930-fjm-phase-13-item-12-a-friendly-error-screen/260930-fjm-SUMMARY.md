---
phase: quick-260930-fjm
plan: 01
subsystem: ui
tags: [nextjs, error-boundary, not-found, open-graph, twitter-card, playwright, metadata]

requires:
  - phase: quick-260929-u1t
    provides: the Contact page and its CONTACT_ROUTE/CONTACT_COPY pattern this plan's screens link to
  - phase: quick-260930-03d
    provides: the Privacy page pattern (lib/*/copy.ts, wiring.test.ts, per-page PhoneTabBar mount) this plan follows
provides:
  - an on-brand "Something went wrong" error screen (app/error.tsx) with Try again, Home screen, Tell us what happened and an opaque reference code
  - a standalone frame-failure screen (app/global-error.tsx) for when the root layout itself fails
  - a "We couldn't find that page" not-found page (app/not-found.tsx) for any mistyped or old address, including under /design/
  - every address below 820 dots now gets the phone's compact top bar (components/site-nav.tsx no longer keeps a fixed list of phone-shell routes)
  - a real, re-runnable capture of the Template screen as the app's link-preview picture (app/opengraph-image.png, scripts/capture-link-preview.ts, npm run preview:capture)
  - Open Graph and Twitter/X metadata on every page (lib/site/metadata.ts), inherited from the root layout
  - a test-only /test-error route, provably dead in a production build
affects: [any future phase touching app/layout.tsx, components/site-nav.tsx, or adding a new top-level app/ route]

actuals:
  tokens: 18935
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "lib/error-pages/, lib/site/ and lib/link-preview/ follow the Contact/Privacy pattern: words and pure logic in lib/, pinned by tests, zero React/Next/browser imports"
    - "components/error-pages/recovery-styles.ts centralizes class strings shared by three screens so they can't drift apart"
    - "the forced-error switch (lib/error-pages/forced-error.ts) mirrors resolveContactDelivery's production-guard shape exactly"
    - "app/fonts.ts is a Next 'font definitions file' shared by the root layout and the standalone frame-failure screen"

key-files:
  created:
    - lib/site/metadata.ts
    - lib/link-preview/preview-image.ts
    - scripts/capture-link-preview.ts
    - app/opengraph-image.png
    - app/opengraph-image.alt.txt
    - lib/error-pages/copy.ts
    - components/error-pages/recovery-styles.ts
    - app/not-found.tsx
    - app/error.tsx
    - app/global-error.tsx
    - app/fonts.ts
    - lib/error-pages/forced-error.ts
    - app/test-error/page.tsx
    - e2e/link-preview.spec.ts
    - e2e/error-pages.spec.ts
    - e2e/prod/error-pages.spec.ts
  modified:
    - app/layout.tsx
    - components/site-nav.tsx
    - playwright.config.ts
    - package.json

key-decisions:
  - "The plan's e2e behavior spec called for asserting the home page's plain <meta name=\"description\"> equals SITE_DESCRIPTION, but app/page.tsx (and every other page) already sets its own page-specific description — that's pre-existing and deliberate (every screen's tab title/description differs). Fixed by checking that tag merely exists, and checking og:description (which IS inherited unchanged from the root layout) against SITE_DESCRIPTION instead — that's what a link previewer actually reads."
  - "app/error.tsx and app/global-error.tsx call retry() via onClick={() => retry()} rather than onClick={retry}, so the wiring test's source-reading contract (both files literally contain 'retry()') holds; functionally identical either way."
  - "The CONTACT_ROUTE anchor in app/global-error.tsx carries no eslint-disable comment for @next/next/no-html-link-for-pages — the rule only flags literal string hrefs and never fires on a dynamic expression, so the disable comment there was an unused-directive lint error. The other two anchors (both literal hrefs) keep theirs."

requirements-completed: [QT-260930-fjm, 13-SPEC-item-12]

coverage:
  - id: D1
    description: "A forced error shows the calm error screen with Try again, Home screen, Tell us what happened and a reference code, never the failure's own text"
    requirement: "13-SPEC-item-12"
    verification:
      - kind: unit
        ref: "lib/error-pages/copy.test.ts, lib/error-pages/forced-error.test.ts, lib/error-pages/wiring.test.ts"
        status: pass
      - kind: e2e
        ref: "e2e/error-pages.spec.ts (the error screen describe, all three projects)"
        status: pass
      - kind: e2e
        ref: "e2e/prod/error-pages.spec.ts (the forced-error address is only a not-found page in a production build)"
        status: pass
    human_judgment: true
    rationale: "The founder reviews screenshots of the real screen before the push (success_criteria)."
  - id: D2
    description: "A mistyped or old address shows the not-found page with a way home and a way to report it, as a 404, with exactly one bottom bar on a phone"
    requirement: "13-SPEC-item-12"
    verification:
      - kind: unit
        ref: "lib/error-pages/copy.test.ts, lib/error-pages/wiring.test.ts"
        status: pass
      - kind: e2e
        ref: "e2e/error-pages.spec.ts (the not-found page describe, all three projects)"
        status: pass
    human_judgment: true
    rationale: "The founder reviews screenshots of the real screen before the push (success_criteria)."
  - id: D3
    description: "Every page carries Open Graph and Twitter/X tags with a real 1200x630 capture of the Template screen as the picture, re-makeable with one command"
    requirement: "13-SPEC-item-12"
    verification:
      - kind: unit
        ref: "lib/site/metadata.test.ts, lib/link-preview/preview-image.test.ts"
        status: pass
      - kind: e2e
        ref: "e2e/link-preview.spec.ts (all tags, WhatsApp UA, picture loads at 1200x630)"
        status: pass
      - kind: e2e
        ref: "e2e/prod/error-pages.spec.ts (absolute live picture address on a production build)"
        status: pass
    human_judgment: true
    rationale: "The founder compares the captured picture against the approved option A reference and approves the alt text before the push (success_criteria)."

duration: 80min
completed: 2026-09-30
status: complete
---

# Phase 13 Item 12: A Friendly Error Screen, a Not-Found Page and a Link-Preview Picture Summary

**Failures and mistyped links now land on calm, on-brand screens instead of the framework's bare
defaults, and any texted or posted link to the app shows a real picture of the Template screen
with a line about what the app does.**

## What a shaper sees

**When a screen breaks** ("Something went wrong"): the app's own heading style, a line saying
their saved boards are safe, and three ways forward — **Try again** (asks the server for the same
screen again), **Home screen**, and **Tell us what happened** (opens the Contact page). If the
failure carries a reference code from the server, it shows as a short code they can quote if they
write in — never the failure's own message or a stack trace. This screen replaces the bare
default for a failure on any page or design screen; the nav, the design store and an in-progress
board all survive it.

**If the app's own frame fails** (much rarer — the root layout itself): a second, standalone copy
of the same words appears with its own SHAPER ASSISTANT wordmark. It can't rely on anything the
broken frame would have provided, so Home screen and Tell us what happened are ordinary links
that reload the page fresh, rather than the usual in-app navigation.

**A mistyped or old address** ("We couldn't find that page"): the address may be mistyped, or the
page may have moved, with a way **Home screen** and a way to **Tell us about a broken link**. It
answers as a real 404, and the page is marked so search engines don't index it.

**On a phone**, both screens — and now every address in the app, including a mistyped one — get
the compact top bar (wordmark, Save, Menu) and exactly one bottom tab bar, with no sideways
scroll and every button and link at least 44px tall. Before this, a phone on an address the nav
didn't already know about got the desktop's six-link row squeezed into its width, with no phone
top bar at all.

## What a texted or posted link shows

A link to any page of the app — texted, posted, or pasted into a chat app — now shows the app's
own card instead of a bare address: **Shaper Assistant — Surfboard Design**, the line "Design your
surfboard — outline, rocker, foil and fins — with rail bands, fin placement and volume calculated
from real shaping formulas," and a real picture of the Template screen: a shortboard nose-left
with its orange control points, station marks and the four measurement cards, so the card reads
"this is a design app" at a glance. WhatsApp, iMessage and Slack all read the same tags.

**Re-making the picture:** run `npx next dev -p 3111` in one terminal, then `npm run
preview:capture` — it drives a real signed-out browser through the exact recipe the founder
chose (open the Shortboard, go to Template, rotate the board, show construction lines, hide the
sidebar, hide the dev badge), downscales the shot, checks it against the size and file-size
limits, and only then writes `app/opengraph-image.png` and `app/opengraph-image.alt.txt`.

**The picture's byte count (Task 1's version):** 67,364 bytes, 1200 by 630 — matching the
orchestrator's plan-time measurement of the approved option A capture exactly.

> **Superseded by Task 4.** On seeing it, the founder asked for the board alone: the committed
> picture is now the board, its station marks, control points and four measurement cards, cropped
> tight inside the viewer's own border, with no nav row and no toolbar (62,306 bytes). See "Task 4"
> below; the recipe now crops and frames as well. Viewed side by side with the approved
reference (`option-A-board-large.png`), the two are visually identical: same nav row with
"Sign in" showing (proving the capture is signed out), same board, same control points, same
station marks and measurement cards.

## The test-only address is dead in a real build

`/test-error` throws a forced error only when a flag set solely in the browser test suite's own
config is present — `playwright.prod.config.ts` strips that flag entirely, and the code's literal
`process.env.NODE_ENV` check is what Next inlines as `"production"` in a real build regardless.
`npm run build` and `e2e/prod/error-pages.spec.ts` prove `/test-error` is an ordinary "page not
found" screen there, on all three device profiles.

## Commits

1. **Task 1 — the link-preview picture and description** — `7149266`
   `feat: a link to the app, texted or posted, now shows the Template screen with a shortboard,
   its control points and measurements, and a line about what the app does (quick 260930-fjm)`
2. **Task 2 — the not-found page and the phone shell on every address** — `b5b0475`
   `feat: a mistyped or old address now shows "We couldn't find that page" with a way home and a
   way to tell us, on a computer and a phone (quick 260930-fjm)`
3. **Task 3 — the error screen, the frame-failure fallback, and the dead-in-production proof** —
   `ad79a62`
   `feat: when a screen fails, shapers see a calm "Something went wrong" with Try again, the home
   screen and a way to tell us, instead of the bare framework error (quick 260930-fjm)`

## Test counts

| Stage | Vitest files | Vitest tests | Notes |
|---|---|---|---|
| Before (HEAD bb5ca16) | 86 | 3525 passed, 2 skipped (3527) | |
| After Task 1 | 88 (+2) | 3549 passed, 2 skipped (3551) | +24 tests |
| After Task 2 | 89 (+1) | 3555 passed, 2 skipped (3557) | +6 tests |
| After Task 3 | 91 (+2) | 3581 passed, 2 skipped (3583) | +26 tests |

`npm run lint -- --max-warnings 0` and `npx tsc --noEmit` were clean after every task.

**Playwright (dev server, `PW_PORT=3120`):**
- Task 1: `e2e/link-preview.spec.ts` on `desktop` — 4/4 passed.
- Task 2: `e2e/error-pages.spec.ts e2e/privacy.spec.ts e2e/site-nav-width.spec.ts`, all three
  projects — 52 passed, 8 skipped (project-scoped describes; no failures).
- Task 3: `e2e/error-pages.spec.ts e2e/link-preview.spec.ts e2e/privacy.spec.ts`, all three
  projects — 72 passed, 0 failed.

**Production build (`npm run build`, then `PW_PROD_PORT=3127`):** build succeeded; the route
listing includes `○ /opengraph-image.png` (static). `e2e/prod/error-pages.spec.ts` on all three
projects — 6/6 passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — test bug] The home page's plain description tag is page-specific, not SITE_DESCRIPTION**
- **Found during:** Task 1, running `e2e/link-preview.spec.ts` on the desktop project.
- **Issue:** The plan's behavior spec listed `meta[name="description"]` alongside the Open Graph
  tags as something to check against `SITE_DESCRIPTION` on the home page. But `app/page.tsx` (like
  every other page in the app) already sets its own page-specific `description` in its own
  `metadata` export — Next's metadata merging lets a child page's plain `title`/`description`
  override the parent's, while nested blocks like `openGraph`/`twitter` that no page overrides
  inherit the root layout's values unchanged. So the plain description tag on `/` reads "Pick a
  board type and start shaping.", not the link-preview line — which is correct, pre-existing
  behavior, not a bug in this plan's code.
- **Fix:** The e2e test now only asserts the plain description tag exists (any non-empty content),
  and checks `og:description` (which a link previewer actually reads, and which IS inherited
  unchanged from `SITE_METADATA`) against `SITE_DESCRIPTION`.
- **Files modified:** e2e/link-preview.spec.ts
- **Commit:** 7149266

**2. [Rule 1 — test/lint fix] `retry()` needed to appear literally; one eslint-disable was unused**
- **Found during:** Task 3, writing `lib/error-pages/wiring.test.ts` and running lint on
  `app/global-error.tsx`.
- **Issue:** The wiring test's source contract requires the literal text `retry()` in both
  `app/error.tsx` and `app/global-error.tsx`; `onClick={retry}` doesn't contain that substring.
  Separately, `@next/next/no-html-link-for-pages` only flags a literal string `href`, so the
  `eslint-disable-next-line` comment above the `href={CONTACT_ROUTE}` anchor in
  `app/global-error.tsx` triggered "Unused eslint-disable directive" under `--max-warnings 0`.
- **Fix:** Both screens now call `onClick={() => retry()}`. The unused disable comment was removed
  and replaced with a plain comment explaining why no disable is needed there.
- **Files modified:** app/error.tsx, app/global-error.tsx
- **Commit:** ad79a62

No other deviations — everything else matched the plan's `<action>` steps exactly, including the
capture recipe's exact button order and settle times, and the founder's approved words verbatim.

## Task 4 (the founder's revision, 2026-09-30)

The founder looked at the committed preview picture and said: "the preview picture doesn't need
the nav bar and button icons. Just a tightly cropped shot of the board as pictured here (I do like
the border though)." They approved the orchestrator's prototype, `option-A2-cropped.png`.

**The test-suite fix (its own commit, first).** The orchestrator's full run found that
`playwright.config.ts`'s `testDir: "./e2e"` also pulled in the production-only specs under
`e2e/prod/` — the new `e2e/prod/error-pages.spec.ts` failed 6 times there (all three projects),
because on the dev server `/test-error` throws on purpose and the preview picture's address is
localhost, both correct for dev and exactly what those specs exist to rule out on a real build.
`playwright.config.ts` now carries `testIgnore: ["**/prod/**"]`.

- **[Rule 1 — bug] `testIgnore` is matched against a file's absolute path, so the production
  config's own `testDir: "./e2e/prod"` inherited the same exclusion and found none of its own
  tests ("No tests found").** Playwright's installed types say so plainly ("Matched against the
  absolute file path"), confirmed by running `npx playwright test --config
  playwright.prod.config.ts --list` before the second fix and seeing zero. `playwright.prod.config.ts`
  now resets `testIgnore: []` for itself alone, with a comment explaining why. Both halves of the
  plan's own proof now pass: `PW_PORT=3120 npx playwright test --list | grep -c "e2e/prod"` prints
  `0`, and `npx playwright test --config playwright.prod.config.ts --list` lists both
  `error-pages.spec.ts` and `slider-dots.spec.ts` on all three projects (9 tests).
  **Files modified:** playwright.config.ts, playwright.prod.config.ts. **Commit:** 0e69bed.

**The cropped, framed picture (second commit).** The capture script now measures, in the browser
via `page.evaluate`, the tightest box around every data-carrying mark on the drawing: the board's
own silhouette, its five drag handles, the three station read-outs (Nose @ 12", Center, Tail @
12") and the four named cards (Length, Widepoint, WP Offset, Tail Block) — adds a 16px margin —
and screenshots only that with Playwright's `clip`. It then reads the viewer panel's own computed
border colour and corner radius live from the page (`rgb(137, 124, 88)` at `10px`, the app's real
`--surf-line` token and `--radius`, not a colour guessed once) and composes the final 1200x630
picture as a white page holding that cropped shot inside a matching frame, centred with at least
34px of white on every side.

- **[Rule 2 — missing hook] Two of the four crop selectors had no stable hook to measure by.** A
  station read-out (`OutputRail`) and a named data card (`CalloutChip`) carried no data attribute
  before this — the plan anticipated exactly this ("add a data attribute only if nothing stable
  exists, and say so"). Added `data-output-rail={station}` and `data-callout-chip={name}` to their
  outer `<g>` elements in `components/viewer/callout-primitives.tsx`, and `data-viewer-panel` to
  the bordered panel div in `components/viewer/tabbed-panel.tsx` so the frame colour/radius has
  somewhere to read from. All three are inert — no visual or interactive change for any shaper.
  The board silhouette and its drag handles already had `data-board-silhouette="outline"` and
  `data-drag-target` from earlier work, reused as-is.
- **[Rule 1 — bug] The viewer's own floating toolbar row can fall inside the crop rectangle even
  though it's never one of the measured elements.** `ViewerToolbar` (Rotate, Construction Lines,
  Wide view, Export Template) is pinned `absolute` over the drawing's own top-right corner
  (`components/viewer/toolbar-button.tsx`), so the first cropped capture showed a small sliver of
  one icon bleeding into the top-right corner of the frame. Fixed by hiding the whole row with a
  new `PREVIEW_HIDE_TOOLBAR_CSS` constant (`[data-viewer-toolbar]{display:none!important}`),
  applied via `addStyleTag` right alongside the existing dev-indicator hiding — reusing
  `data-viewer-toolbar`, a hook the browser tests already relied on, rather than adding a second
  one. Re-ran the capture after; the sliver is gone.

**Byte count and comparison:** the new `app/opengraph-image.png` is 62,306 bytes, 1200 by 630 —
well under the 300 KB limit, smaller than both the first committed picture (67,364 bytes) and the
founder-approved reference (`option-A2-cropped.png`, 81,308 bytes), because it holds less: no nav
bar, no toolbar icons, just the board, its handles, its labels and its four cards inside a matching
border. Viewed side by side with the reference, the two are visually identical in framing: same
tan/gold bordered box, same white margins, same board, same control points, same station marks and
measurement cards, and — the specific thing the founder asked to be rid of — no nav bar and no
toolbar icon anywhere in the frame.

**Re-verified:** `npx vitest run lib/link-preview/preview-image.test.ts` (21 passed, up from 20 —
one new test pins `PREVIEW_HIDE_TOOLBAR_CSS`), `npm test` (91 files, 3588 passed / 2 skipped),
`npm run lint -- --max-warnings 0` and `npx tsc --noEmit` clean, and `PW_PORT=3120 npx playwright
test e2e/link-preview.spec.ts` — 12/12 passed on iphone, android and desktop.

**Files modified (second commit):** app/opengraph-image.png, components/viewer/callout-primitives.tsx,
components/viewer/tabbed-panel.tsx, lib/link-preview/preview-image.test.ts,
lib/link-preview/preview-image.ts, scripts/capture-link-preview.ts. **Commit:** 22a5867.

## Known Stubs

None.

## Left for the founder (success_criteria)

1. Look at the pictures of both screens (the orchestrator captures `/test-error` and
   `/no-such-page` at desktop 1280x800 and iPhone 14) and at the captured preview image — now the
   cropped, framed board itself, no nav bar or toolbar — beside the approved reference, and
   approve them (the words and the description are already approved, F-3/F-4).
2. Approve the picture's alt text (their own suggestion, used as written): "Shaper Assistant's
   Template screen: a shortboard outline, nose to the left, with its control points, station
   marks and measurements".
3. Give the go to push.
4. After the deploy, check that
   `curl -s -A "WhatsApp/2.23.20.0" https://www.shaperassistant.com/ | grep -o '<meta property="og:image"[^>]*>'`
   shows `https://www.shaperassistant.com/opengraph-image.png?…` and that the address opens the
   picture, then text the link to a phone and see the card (add `?v=1` if WhatsApp has already
   cached a link to this address).

## Self-Check: PASSED

- FOUND: app/opengraph-image.png (62,306 bytes, 1200x630, cropped/framed board only)
- FOUND: app/opengraph-image.alt.txt
- FOUND: lib/site/metadata.ts, lib/link-preview/preview-image.ts, scripts/capture-link-preview.ts
- FOUND: lib/error-pages/copy.ts, forced-error.ts, wiring.test.ts
- FOUND: app/not-found.tsx, app/error.tsx, app/global-error.tsx, app/fonts.ts, app/test-error/page.tsx
- FOUND: e2e/link-preview.spec.ts, e2e/error-pages.spec.ts, e2e/prod/error-pages.spec.ts
- FOUND: components/viewer/callout-primitives.tsx (data-output-rail, data-callout-chip)
- FOUND: components/viewer/tabbed-panel.tsx (data-viewer-panel)
- FOUND commit 7149266 (git log --oneline --all)
- FOUND commit b5b0475 (git log --oneline --all)
- FOUND commit ad79a62 (git log --oneline --all)
- FOUND commit 0e69bed (git log --oneline --all)
- FOUND commit 22a5867 (git log --oneline --all)
