---
phase: quick-260930-fjm
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/site/metadata.ts
  - lib/site/metadata.test.ts
  - lib/link-preview/preview-image.ts
  - lib/link-preview/preview-image.test.ts
  - scripts/capture-link-preview.ts
  - package.json
  - app/opengraph-image.png
  - app/opengraph-image.alt.txt
  - app/layout.tsx
  - e2e/link-preview.spec.ts
  - app/fonts.ts
  - lib/error-pages/copy.ts
  - lib/error-pages/copy.test.ts
  - components/error-pages/recovery-styles.ts
  - app/not-found.tsx
  - components/site-nav.tsx
  - e2e/error-pages.spec.ts
  - lib/error-pages/forced-error.ts
  - lib/error-pages/forced-error.test.ts
  - app/test-error/page.tsx
  - playwright.config.ts
  - app/error.tsx
  - app/global-error.tsx
  - lib/error-pages/wiring.test.ts
  - e2e/prod/error-pages.spec.ts
autonomous: true
requirements: [QT-260930-fjm, 13-SPEC-item-12]

estimate:
  # Sequential on main in the main checkout. HEAD at plan time is bb5ca16. Three tasks:
  # - Task 1: two small pure modules (~50 + ~80 lines) with tests, a ~110-line capture script, one npm
  #   script, one standalone dev server started and stopped, one capture run, a one-line layout edit
  #   and a ~90-line Playwright spec on one project.
  # - Task 2: a copy module (~50) with tests, a class-string module, a ~50-line Server Component page, a
  #   SiteNav simplification, and the first half of a Playwright spec, run with two neighbour specs.
  # - Task 3: a tiny switch module with tests, a 15-line test route, one config line, the shared font
  #   definitions file, two error screens (~70 lines each), a source-contract + server-render test, the
  #   second half of the spec, a production build and a production-suite spec — the heaviest output.
  # estimate-calibration: factor 1, 0 samples, so confidence is low.
  tokens: 120000
  raw_tokens: 120000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "When a screen fails to load, a shaper sees 'Something went wrong' in the app's own heading style, a calm line that says their saved boards are safe, and three ways forward: Try again (which asks the server for the screen again), Home screen, and Tell us what happened (the Contact page). When the server gave the failure a reference, it shows as a short code the shaper can quote. The failure's own message text and any stack trace never appear."
    - "If the app's frame itself fails (the root layout), a standalone copy of the same screen shows: the SHAPER ASSISTANT wordmark, the same words, and the same three ways forward, where Home screen and Tell us what happened are full page loads."
    - "A mistyped or old address shows 'We couldn't find that page' with Home screen and Tell us about a broken link. It answers with a 404 status, the browser tab reads 'Page not found — Shaper Assistant', and search engines are told not to index it."
    - "Below 820 dots wide, both screens have the phone's compact top bar (wordmark, Save, Menu) and exactly one bottom tab bar, with no sideways scroll and actions at least 44px tall on a touch screen. At 820 and wider they sit under the desktop nav. Width alone decides, on every address, including a mistyped one."
    - "A link to any page of the app, texted or posted, carries in its page head (readable by a link previewer that runs no scripts): og:title 'Shaper Assistant — Surfboard Design', the founder's approved og:description, og:site_name 'Shaper Assistant', og:type website, og:url the home address, and og:image pointing at /opengraph-image.png with its width 1200, height 630, type image/png and the plain-English alt text; plus a Twitter/X summary_large_image card showing the same picture with the same alt text. On the built site the picture's address is the absolute https://www.shaperassistant.com/opengraph-image.png?… address."
    - "The preview picture is a real capture of the Template screen, the founder's option A: the nav with the SHAPER ASSISTANT wordmark, the six tabs and Sign in, the Shortboard lying nose-left with its orange control points and construction lines, the station marks (Nose @ 12\", Center, Tail @ 12\") and the LENGTH / WIDEPOINT / WP OFFSET / TAIL BLOCK cards. It is a committed 1200 by 630 PNG well under 300 KB (the same downscale measured 67 KB at plan time), served as a plain file, and made again at any time with one command against a running dev server."
    - "The forced-error address used by the browser tests answers only on the test dev server (not a production build AND SHAPER_FORCED_ERROR=1). In a production build it is an ordinary not-found page, proven by the production-build suite."
  artifacts:
    - path: "lib/site/metadata.ts"
      provides: "SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION and SITE_METADATA (metadataBase, title, description, openGraph, twitter)"
      contains: "export const SITE_METADATA"
    - path: "lib/link-preview/preview-image.ts"
      provides: "PREVIEW_IMAGE_FILE, PREVIEW_ALT_FILE, PREVIEW_IMAGE_ROUTE, PREVIEW_IMAGE_SIZE, PREVIEW_IMAGE_MAX_BYTES, PREVIEW_IMAGE_ALT, PREVIEW_CAPTURE (the founder's capture recipe as data), pngDimensions() and previewImageProblems()"
      contains: "export function previewImageProblems"
    - path: "scripts/capture-link-preview.ts"
      provides: "The re-runnable capture: drives a running dev server with Playwright, downscales in Chromium, checks, writes both app files"
      contains: "PREVIEW_CAPTURE"
    - path: "app/opengraph-image.png"
      provides: "The committed 1200x630 Template-screen capture Next serves at /opengraph-image.png and names in og:image"
    - path: "app/opengraph-image.alt.txt"
      provides: "The picture's alt text, no trailing newline (Next copies the file's bytes into og:image:alt verbatim)"
    - path: "app/fonts.ts"
      provides: "The Inter and Geist Mono font definitions shared by the root layout and global-error"
      contains: "export const inter"
    - path: "lib/error-pages/copy.ts"
      provides: "ERROR_COPY, NOT_FOUND_COPY and errorReference()"
      contains: "export const ERROR_COPY"
    - path: "lib/error-pages/forced-error.ts"
      provides: "FORCED_ERROR_ROUTE, FORCED_ERROR_ENV, FORCED_ERROR_MESSAGE and forcedErrorRouteEnabled()"
      contains: "export function forcedErrorRouteEnabled"
    - path: "app/not-found.tsx"
      provides: "The not-found page with its own metadata title and PhoneTabBar"
      contains: "data-not-found-page"
    - path: "app/error.tsx"
      provides: "The in-app error screen (Client Component) with its own PhoneTabBar"
      contains: "data-error-screen"
    - path: "app/global-error.tsx"
      provides: "The standalone root-layout error screen with its own html and body"
      contains: "data-global-error-screen"
    - path: "app/test-error/page.tsx"
      provides: "The test-only forced server error, notFound() everywhere else"
      contains: "forcedErrorRouteEnabled"
    - path: "e2e/error-pages.spec.ts"
      provides: "Browser proof of both screens on iphone, android and desktop"
      contains: "FORCED_ERROR_ROUTE"
    - path: "e2e/link-preview.spec.ts"
      provides: "Browser proof of the preview tags and the served picture on the dev server"
      contains: "PREVIEW_IMAGE_ROUTE"
    - path: "e2e/prod/error-pages.spec.ts"
      provides: "Production-build proof: the forced-error address is a 404, the tags and picture load"
      contains: "FORCED_ERROR_ROUTE"
  key_links:
    - from: "app/layout.tsx"
      to: "lib/site/metadata.ts"
      via: "export const metadata: Metadata = SITE_METADATA"
      pattern: "metadata: Metadata = SITE_METADATA"
    - from: "scripts/capture-link-preview.ts"
      to: "lib/link-preview/preview-image.ts"
      via: "PREVIEW_CAPTURE drives the clicks; previewImageProblems gates the write; PREVIEW_IMAGE_ALT is written to the alt file"
      pattern: "previewImageProblems\\("
    - from: "lib/link-preview/preview-image.test.ts"
      to: "app/opengraph-image.png and app/opengraph-image.alt.txt"
      via: "reads the committed files and requires no problems and the exact alt text"
      pattern: "PREVIEW_IMAGE_FILE"
    - from: "app/test-error/page.tsx"
      to: "lib/error-pages/forced-error.ts"
      via: "forcedErrorRouteEnabled({ nodeEnv: process.env.NODE_ENV, flag: process.env.SHAPER_FORCED_ERROR })"
      pattern: "nodeEnv: process\\.env\\.NODE_ENV"
    - from: "playwright.config.ts"
      to: "app/test-error/page.tsx"
      via: "webServer.env SHAPER_FORCED_ERROR: \"1\" (stripped by playwright.prod.config.ts)"
      pattern: "SHAPER_FORCED_ERROR: \"1\""
    - from: "components/site-nav.tsx"
      to: "components/design/phone-top-bar.tsx"
      via: "PhoneTopBar rendered on every address, desktop row always max-shell:hidden"
      pattern: "<PhoneTopBar />"
    - from: "app/global-error.tsx"
      to: "app/fonts.ts and app/globals.css"
      via: "import './globals.css' and the shared inter/geistMono variables on its own <html>"
      pattern: "from \"./fonts\""
---

<objective>
Phase 13 item 12 (the founder: "let's do 12", 2026-09-30; 13-SPEC.md item 12). Three things:

1. **A friendly error screen.** When a screen fails, the framework's bare default is replaced with an on-brand
   "Something went wrong" screen that has three ways forward (try again, the home screen, tell us what happened).
   A second, standalone copy covers a failure of the app's frame itself.
2. **A not-found page.** A mistyped or old address shows "We couldn't find that page" with a way home and a way to
   report the broken link. Both screens look right on a phone.
3. **A link-preview picture and description.** A texted or posted link to the app shows the app's own card: its
   name, a plain-English line about what it does, and a real picture of the Template screen. The picture shows a
   shortboard nose-left with its control points, station marks and measurement cards, so the card says "this is a
   design app" at a glance.

Purpose: the founder shows the app to many shapers on 2026-10-10 and will be texting and posting its link. A shaper
who hits a failure or a bad link should land somewhere calm with a way back, and a shared link should look like
the app.

Done when (13-SPEC): a forced error shows the new screen on desktop and phone, and the live page carries the preview
tags with an image that loads.

Output: three commits on `main`, never pushed. The founder sees pictures of both screens and the preview image and
approves the words before anything is pushed.
</objective>

<decisions>
The founder's brief (13-SPEC item 12 and the orchestrator's item-12 notes) fixes: an on-brand error screen and
not-found page, each with a way back and a way to report the problem; a link-preview picture and description;
metadataBase `https://www.shaperassistant.com`; Open Graph site name, title, description, url and type; a
Twitter/X `summary_large_image` card; a 1200 by 630 picture from the `opengraph-image` file convention; no new npm
dependency; the forced-error switch unreachable in production.

The founder's decisions after seeing the first draft (2026-09-30; the orchestrator's message):

- **F-1 — The preview picture is a real capture of the Template screen, option A.** In the founder's words: "a
  board shot that encourages design, like the template view (nose to the left) with station marks and dragable
  control points visible. Maybe even the data cards so the app card really shows that this is a design app."
  The capture recipe is pinned exactly:
  1. On the home screen, click the Shortboard's Start Shaping. Then go to TEMPLATE by client-side navigation, so the
     in-memory board survives, and wait about 1.5 s.
  2. Click "Rotate the board to horizontal", then "Show construction lines", then "Hide the sidebar for a wider
     view", waiting about 0.7–0.9 s after each.
  3. Hide Next's dev indicator. An init script dismisses the sign-in banner and the toolbar tip.
  4. Use a 1440×756 viewport at device scale factor 2 and take a full-viewport screenshot, then downscale it to
     exactly 1200×630.

  The approved reference is
  `/private/tmp/claude-501/-Users-kontoes-Code-shaper/0643c743-7152-4080-bf10-e612e3e02f8b/scratchpad/og-proto/option-A-board-large.png`,
  and the orchestrator's capture is `scratchpad/og-proto2.mjs`, case "e-horizontal-lines-wide".
- **F-2 — The capture is a committed, re-runnable script** that writes `app/opengraph-image.png` (1200×630, under
  300 KB, asserted) and `app/opengraph-image.alt.txt`. It downscales with no new dependency. There is no generated
  ImageResponse drawing, no font work, no tagline and no board-path builder.
- **F-3 — The approved description:** "Design your surfboard — outline, rocker, foil and fins — with rail bands, fin
  placement and volume calculated from real shaping formulas."
- **F-4 — The error-screen and not-found words are approved as written** (the context table).

Choices made at plan time (the planner's discretion, recorded so the executor does not re-decide them):

- **P-1 — The not-found page offers the home screen and Contact only.** The six design screens are already one tap
  away on the same page (the desktop nav row at 820 dots and wider, the phone's bottom tab bar below), so a second
  list of them in the page body would only repeat what is already on screen.
- **P-2 — Every address gets the phone shell below 820 dots.** SiteNav drops its list of phone-shell addresses and
  always hides the desktop row below the shell breakpoint and always mounts `PhoneTopBar`. The not-found page can
  appear at any address, so no list of known addresses can ever cover it. Every page the app has today was already
  on that list, so nothing changes for any existing screen; only a mistyped address changes. Measured at plan time:
  an address outside the list gave an iPhone the desktop link row squeezed into its width ("SHAPER / ASSISTANT
  TEMPLATE ROCKER RAILS" running off the edge) and no phone top bar. This is CLAUDE.md's first switch, width alone
  picks the layout.
- **P-3 — Both screens mount their own `PhoneTabBar` as their last child.** This is the Contact/Privacy pattern.
  Measured: `/design/no-such-screen` renders the root not-found WITHOUT `app/design/layout.tsx` (zero tab bars
  without one of its own), and an error thrown by a design screen replaces the design layout too (it sits inside
  `app/error.tsx`'s boundary). Mounting one each gives exactly one tab bar. On the home address the tab bar hides
  itself, as it does on the home screen.
- **P-4 — The forced error is a server-side throw at `/test-error`.** It is honoured only when `NODE_ENV` is not
  `"production"` AND `SHAPER_FORCED_ERROR` is exactly `"1"`. Otherwise the page calls `notFound()`. The flag is set
  only in `playwright.config.ts`'s webServer env, which `playwright.prod.config.ts` strips. It follows
  `resolveContactDelivery`'s pattern: a pure decider in `lib/`, and the page passes the literal
  `process.env.NODE_ENV`, which Next inlines as `"production"` in a real build. A server throw is the realistic
  failure (a database hiccup), and it is the one that carries a reference (digest).
- **P-5 — The error screen is exercised on the dev-server suite; the production suite proves the switch is dead
  there.** By design the forced error cannot be reached in a production build, so `e2e/prod/error-pages.spec.ts`
  asserts exactly that (a 404 and the not-found page) and also checks the preview tags and picture on the built
  site. Measured on the dev server: the forced throw renders `app/error.tsx` under the root layout with HTTP 500 and
  a digest (a numeric string such as `1603484608`). The thrown message is absent from the page text, and Next's dev
  overlay does not block clicks. Clicking Try again sends `GET /<route>?_rsc=…` with header `rsc: 1`, and the screen
  stays. A link clicked afterwards navigates normally. Measured on Desktop Chrome and iPhone 14 WebKit. Assertions
  are still scoped to the screen's own element, and each action gets its own test on a fresh page.
- **P-6 — `app/global-error.tsx` stands alone.** It has its own `<html lang="en">` and `<body>`, imports
  `./globals.css`, uses the app's own Inter and Geist Mono (through a shared `app/fonts.ts` definitions file, per
  Next's font docs), and shows a plain header wordmark. It has no providers, no SiteNav and no tab bar. Home screen
  and Tell us what happened are plain anchors, meaning full page loads on purpose: the app's frame just failed, and a
  fresh load is the surest way back. It follows the device's light/dark setting, because Next's docs say an app's
  theme class never reaches this screen. It is proven by a server-render unit test (measured feasible at plan time
  with vitest). It is not proven in a browser, because forcing it would mean putting a test switch into the root
  layout, and this plan refuses to do that.
- **P-7 — The capture runs against one standalone `npx next dev -p 3111`, not Playwright's own webServer.**
  Playwright's webServer injects fake Clerk keys, and under them Clerk never loads. The nav's sign-in control then
  stays an empty placeholder (`components/auth/nav-auth-control.tsx` renders a blank span until `isLoaded`), but the
  founder's chosen picture shows "Sign in". A plain `npx next dev -p 3111` loads the machine's own development
  environment exactly as `npm run dev` does, so Clerk loads and "Sign in" appears. The executor starts it only after
  confirming no dev server of this project is running, and stops it straight after the capture. The script refuses
  to capture until "Sign in" is visible. That also proves the fresh browser is signed out, so no account name or
  picture can ever appear in the image.
- **P-8 — The downscale happens in Chromium, with no new dependency.** The 2x screenshot (2880×1512) is loaded as a
  data URL into an `<img>` sized 1200×630 on a 1200×630, scale-1 page, which is then screenshotted. `sharp` is
  present only as Next's own optional dependency (`npm ls sharp` shows it under `next`; `package.json` does not
  list it), so relying on it could break on a machine where npm skips optional packages. Measured at plan time on
  the orchestrator's own 2x capture: 67,364 bytes, 1200×630, and it looks the same as option A.
- **P-9 — Twitter/X gets the same picture with no second file.** Measured at plan time with a static
  `app/opengraph-image.png` and alt file plus this metadata, twitter:image, twitter:image:alt, twitter:image:type,
  twitter:image:width and twitter:image:height were all filled from the Open Graph picture (`postProcessMetadata` in
  `node_modules/next/dist/lib/metadata/resolve-metadata.js` runs after the file-based picture is merged). So there is
  no `twitter-image` copy. The e2e spec asserts twitter:image, so a future change that broke this would fail.
- **P-10 — og:url is the home address, and every page inherits the root's Open Graph block.** Every shared link, to
  any screen, shows the app's card. Browser-tab titles still differ per page, exactly as today.
- **P-11 — Where the picture's address points.** Next's `getSocialImageMetadataBaseFallback`
  (`node_modules/next/dist/lib/metadata/resolvers/resolve-url.js`) gives it the live address
  `https://www.shaperassistant.com/opengraph-image.png?…` in a production build: on the live deploy and on a local
  `next start`. On a Vercel preview it uses the preview's own address, and on the dev server it deliberately uses
  the dev server's address (measured: `http://localhost:3111/opengraph-image.png?opengraph-image.<hash>.png`). So
  the dev spec checks the picture's path, and the production-build spec checks the absolute live address. og:url
  follows metadataBase everywhere (measured in dev: `https://www.shaperassistant.com`, no trailing slash).
- **P-12 — Every word lives in a pure module, pinned by tests.** This is the Contact/Privacy pattern:
  `lib/error-pages/copy.ts`, `lib/site/metadata.ts` and `PREVIEW_IMAGE_ALT` in `lib/link-preview/preview-image.ts`.
- **P-13 — The capture recipe is data, and a test pins it to the real buttons.** `PREVIEW_CAPTURE` holds the
  viewport, the scale, the preset's name and the three button names. A source-reading test requires each button
  name to appear verbatim in `components/outline/outline-editor.tsx`, so renaming a button fails a unit test
  instead of silently breaking the next capture. The same test checks that 1440/756 equals 1200/630, so the
  downscale never stretches the picture.
- **P-14 — The alt file has no trailing newline.** Measured: Next copies the alt file's bytes into
  `og:image:alt` and `twitter:image:alt` verbatim, newline included. The script writes the text exactly, and the
  unit and e2e tests compare it exactly.
</decisions>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/kontoes/Code/shaper/CLAUDE.md
@/Users/kontoes/Code/shaper/AGENTS.md
@/Users/kontoes/Code/shaper/.planning/STATE.md
@/Users/kontoes/Code/shaper/.planning/phases/13-ready-for-the-shapers/13-SPEC.md

The pattern to follow is the Contact and Privacy pages:
- app/contact/page.tsx
- app/privacy/page.tsx
- lib/privacy/copy.ts and lib/privacy/copy.test.ts
- lib/privacy/wiring.test.ts (the `stripComments` source-reading idiom)
- lib/contact/delivery.ts (`resolveContactDelivery`, the production-guarded stand-in)
- lib/contact-server.ts (the literal `process.env.NODE_ENV` pass-through)
- playwright.config.ts and playwright.prod.config.ts (the env block and its stripping)
- e2e/privacy.spec.ts (phone vs desktop assertions, overflow check, 44px check)
- e2e/prod/slider-dots.spec.ts (a production-suite spec)

Also read before touching:
- components/site-nav.tsx, components/design/phone-top-bar.tsx, components/design/phone-tab-bar.tsx
- components/ui/button.tsx (`buttonVariants`)
- app/layout.tsx
- components/setup/preset-card.tsx (each preset card is one button: its name, then "Start Shaping")
- components/outline/outline-editor.tsx (the three viewer toolbar buttons' labels, lines 115-170)
- components/auth/nav-auth-control.tsx (why "Sign in" only appears once Clerk has loaded)
- package.json's scripts block (the `golden:fins` entry is the `tsx --tsconfig ./tsconfig.json` habit to copy)
- The orchestrator's capture, the source of the recipe:
  `/private/tmp/claude-501/-Users-kontoes-Code-shaper/0643c743-7152-4080-bf10-e612e3e02f8b/scratchpad/og-proto2.mjs`
  (case "e-horizontal-lines-wide"), and the approved result `.../scratchpad/og-proto/option-A-board-large.png`

Next.js 16.3.6 docs, already read at plan time. Re-read only if a shape below surprises you:
- node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md
- node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/not-found.md
- node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md (the
  "Image files (.jpg, .png, .gif)" and `opengraph-image.alt.txt` sections)
- node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md (`metadataBase`,
  `openGraph`, `twitter`)
- node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md ("Using a font definitions file")

## The words (the error and not-found words and the description are approved by the founder, F-3 and F-4; pin them exactly)

| Where | Key | Text |
|-------|-----|------|
| Error screen | `ERROR_COPY.heading` | Something went wrong |
| Error screen | `ERROR_COPY.lead` | This screen ran into a problem and couldn't finish loading. Your saved boards are safe. |
| Error screen | `ERROR_COPY.hint` | Try again — it often clears on its own. If it keeps happening, tell us what you were doing and we'll look into it. |
| Error screen | `ERROR_COPY.tryAgain` | Try again |
| Error screen | `ERROR_COPY.home` | Home screen |
| Error screen | `ERROR_COPY.contact` | Tell us what happened |
| Error screen | `ERROR_COPY.referenceLead` | If you write to us, include this reference: |
| Frame failure tab title | `ERROR_COPY.documentTitle` | Something went wrong — Shaper Assistant |
| Not-found page | `NOT_FOUND_COPY.pageTitle` | Page not found — Shaper Assistant |
| Not-found page | `NOT_FOUND_COPY.heading` | We couldn't find that page |
| Not-found page | `NOT_FOUND_COPY.lead` | The address may be mistyped, or the page may have moved. |
| Not-found page | `NOT_FOUND_COPY.hint` | Head back to the home screen, or tell us about the link that brought you here. |
| Not-found page | `NOT_FOUND_COPY.home` | Home screen |
| Not-found page | `NOT_FOUND_COPY.contact` | Tell us about a broken link |
| Every page (tab + preview title) | `SITE_TITLE` | Shaper Assistant — Surfboard Design (unchanged) |
| Every page (description + preview) | `SITE_DESCRIPTION` | Design your surfboard — outline, rocker, foil and fins — with rail bands, fin placement and volume calculated from real shaping formulas. (137 characters; replaces today's "Design custom surfboards with calculated rail bands, fin placement, and volume.") |
| Preview | `SITE_NAME` | Shaper Assistant |
| Picture alt text | `PREVIEW_IMAGE_ALT` | Shaper Assistant's Template screen: a shortboard outline, nose to the left, with its control points, station marks and measurements (the founder's own suggestion) |

Headings render in ALL CAPS through the house heading classes (CSS only; the text and accessible name stay as
written). "Your saved boards are safe" is true on both screens: nothing in a failed screen touches the database, and
a design-screen failure keeps the in-progress board too, because the design store lives in the root layout, above
`app/error.tsx`'s boundary.
</context>

<interfaces>
Pinned from the installed Next 16.3.6 docs and types (`node_modules/next/dist/client/components/error-boundary.d.ts`:
`ErrorInfo = { error: unknown; reset: () => void; retry: () => void }`):

- `app/error.tsx` and `app/global-error.tsx` must start with the `"use client"` directive. Their default export
  receives `{ error: Error & { digest?: string }; retry: () => void }`. Use `retry` (stable since 16.3.0; it
  re-fetches and re-renders the segment), not `reset`. In production, a Server Component error's message is
  replaced with a generic one, and `digest` is the hash that matches the server log.
- `app/global-error.tsx` replaces the root layout and must render its own `<html>` and `<body>`. `metadata` exports
  are NOT supported there, so use React's `<title>` element instead (React 19 hoists it).
- `app/not-found.tsx` takes no props and is a Server Component by default. `export const metadata: Metadata`
  works there (measured: the tab title comes from it, Next adds `<meta name="robots" content="noindex">`, and the
  status is 404). It handles every unmatched address, including ones under `/design/`.
- `notFound` is imported from `next/navigation`.
- The static picture file convention: `app/opengraph-image.png` plus `app/opengraph-image.alt.txt` in the root
  segment. Next serves the file at `/opengraph-image.png` (measured: status 200, `Content-Type: image/png`). The
  proxy matcher in `proxy.ts` already excludes `.png`, so Clerk never touches it. Next writes these tags into every
  page's head (measured):
  - og:image `<base>/opengraph-image.png?opengraph-image.<hash>.png`, where `<base>` follows P-11;
  - og:image:type `image/png`;
  - og:image:width `1200` and og:image:height `630`, read from the file;
  - og:image:alt, the alt file's exact bytes (P-14);
  - the same five as `twitter:image*` (P-9).

  The build fails if the picture is over 8 MB, which is not a risk here.
- Metadata (root layout): `metadataBase: new URL(SITE_URL)`, `title`, `description`,
  `openGraph: { type: "website", siteName, title, description, url: "/", locale: "en_US" }` and
  `twitter: { card: "summary_large_image", title, description }`. Do NOT set `images` on either: the static file
  supplies the Open Graph picture, and Next copies it into the Twitter card (P-9). Measured in dev, og:url renders
  as `https://www.shaperassistant.com` with no trailing slash.
- The capture's Playwright calls (from `@playwright/test`, already installed):
  - `chromium.launch()`;
  - `browser.newContext({ viewport, deviceScaleFactor, colorScheme: "light" })`;
  - `page.addInitScript(fn)`, `page.goto(url, { waitUntil: "networkidle" })` and
    `getByRole("button", { name, exact: true })`;
  - `getByRole("button", { name: /Start Shaping/ }).filter({ hasText: "Shortboard" })`;
  - `getByRole("link", { name: "TEMPLATE", exact: true }).filter({ visible: true }).first()`;
  - `page.waitForURL(/\/design\/outline$/)` and `page.addStyleTag({ content })`;
  - `page.screenshot({ type: "png" })`, which returns a Buffer at viewport × deviceScaleFactor pixels (2880×1512
    here);
  - `page.setContent(html)`.

  Run it with `tsx --tsconfig ./tsconfig.json`, as `golden:fins` does. tsx compiles a `.ts` script to CommonJS here
  (no `"type": "module"` in package.json), so there is no top-level await: wrap the work in an async `main()`.
- For link previewers, Next's `HTML_LIMITED_BOT_UA_RE` (`node_modules/next/dist/shared/lib/router/utils/html-bots.js`)
  includes WhatsApp, facebookexternalhit (iMessage), Twitterbot, Slackbot and Discordbot. For those user agents the
  metadata is rendered blocking, inside `<head>`.
- `buttonVariants({ variant, size })` from `@/components/ui/button` returns a class string: `default` is the accent
  fill and `outline` the bordered one. Its default size carries `coarse:h-11` (44px on a touch screen, by pointer
  alone). That file has no `"use client"` directive, so calling `buttonVariants` from a Server Component is fine.
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: A texted or posted link shows the app's card with a real picture of the Template screen</name>
  <files>lib/site/metadata.ts, lib/site/metadata.test.ts, lib/link-preview/preview-image.ts, lib/link-preview/preview-image.test.ts, scripts/capture-link-preview.ts, package.json, app/opengraph-image.png, app/opengraph-image.alt.txt, app/layout.tsx, e2e/link-preview.spec.ts</files>
  <read_first>app/layout.tsx, components/setup/preset-card.tsx, components/outline/outline-editor.tsx (lines 105-170), components/auth/nav-auth-control.tsx, lib/privacy/copy.ts, lib/privacy/wiring.test.ts, e2e/privacy.spec.ts, package.json (scripts), and the orchestrator's capture /private/tmp/claude-501/-Users-kontoes-Code-shaper/0643c743-7152-4080-bf10-e612e3e02f8b/scratchpad/og-proto2.mjs</read_first>
  <behavior>
    - SITE_METADATA.metadataBase is a URL whose href is exactly https://www.shaperassistant.com/ and SITE_URL is https://www.shaperassistant.com
    - SITE_METADATA.title equals SITE_TITLE ("Shaper Assistant — Surfboard Design") and description equals SITE_DESCRIPTION (the founder's approved line, F-3)
    - openGraph matches { type: "website", siteName: "Shaper Assistant", title: SITE_TITLE, description: SITE_DESCRIPTION, url: "/", locale: "en_US" } and has no images key; twitter matches { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION } and has no images key
    - SITE_DESCRIPTION is at most 160 characters, has no double spaces and no leading or trailing whitespace
    - pngDimensions of a PNG buffer made in the test (the 8-byte signature, then an IHDR chunk with width 1200 and height 630 written with DataView) is { width: 1200, height: 630 }; of a buffer that does not start with the signature, or is shorter than 24 bytes, it is null
    - previewImageProblems returns [] for a well-formed 1200x630 buffer under PREVIEW_IMAGE_MAX_BYTES, and one plain-English problem each for not a PNG, the wrong size (naming the size found), and too big (naming the byte count)
    - PREVIEW_CAPTURE.viewport.width / viewport.height equals PREVIEW_IMAGE_SIZE.width / height (1440/756 = 1200/630), and viewport.width * deviceScaleFactor is at least PREVIEW_IMAGE_SIZE.width (the picture is only ever shrunk)
    - Each of PREVIEW_CAPTURE.buttons appears verbatim in components/outline/outline-editor.tsx, and PREVIEW_CAPTURE.presetName is the name of a preset in BOARD_PRESETS
    - The committed app/opengraph-image.png has no previewImageProblems, and app/opengraph-image.alt.txt's contents equal PREVIEW_IMAGE_ALT exactly, with no trailing newline
  </behavior>
  <action>
Write the tests first (RED), then the modules, then run the capture (GREEN).

1. **`lib/site/metadata.ts`** (new, pure). The only import is a type-only `Metadata` import from `next`; there is
   no React or browser import. Export:
   - `SITE_URL = "https://www.shaperassistant.com"`;
   - `SITE_NAME = "Shaper Assistant"`;
   - `SITE_TITLE = "Shaper Assistant — Surfboard Design"`;
   - `SITE_DESCRIPTION`: the approved line (F-3);
   - `SITE_METADATA: Metadata`, built as in `<interfaces>` (`metadataBase: new URL(SITE_URL)`, `title`,
     `description`, the `openGraph` and `twitter` blocks, no `images` on either).

   The doc comment says:
   - every page inherits this block, so every shared link shows the app's card (P-10);
   - the picture is the static `app/opengraph-image.png`, which Next also puts in the Twitter card (P-9);
   - where the picture's address points on the dev server, a preview deploy and the live site (P-11).

   Test it in `lib/site/metadata.test.ts` per `<behavior>`. Use `toMatchObject` for the Open Graph and Twitter
   blocks, which avoids narrowing Next's union types.

2. **`lib/link-preview/preview-image.ts`** (new, pure). No React, Next, Node or browser import: bytes come in as a
   `Uint8Array`, read through a DataView. Export:
   - `PREVIEW_IMAGE_FILE = "app/opengraph-image.png"`;
   - `PREVIEW_ALT_FILE = "app/opengraph-image.alt.txt"`;
   - `PREVIEW_IMAGE_ROUTE = "/opengraph-image.png"`;
   - `PREVIEW_IMAGE_SIZE = { width: 1200, height: 630 }`;
   - `PREVIEW_IMAGE_MAX_BYTES = 300_000`;
   - `PREVIEW_IMAGE_ALT`: the alt text from the words table;
   - `PREVIEW_CAPTURE` (F-1, as data, P-13):
     - `viewport: { width: 1440, height: 756 }` and `deviceScaleFactor: 2`;
     - `presetName: "Shortboard"`;
     - `buttons`: "Rotate the board to horizontal", "Show construction lines", then "Hide the sidebar for a wider
       view";
     - `settleMs: { afterPreset: 1200, afterTemplate: 1500, afterButton: 800, afterSidebar: 900, afterStyle: 300 }`;
     - `hideDevIndicatorCss: "nextjs-portal{display:none!important}"`;
   - `pngDimensions(bytes)`: returns null unless the bytes start with the 8-byte PNG signature (137 80 78 71 13 10 26
     10) and are at least 24 long; otherwise returns `{ width, height }` read big-endian at offsets 16 and 20;
   - `previewImageProblems(bytes)`: returns plain-English strings, or `[]`. For example: "not a PNG file", "is
     2880 by 1512, not 1200 by 630", "is 312,000 bytes, over the 300,000 limit".

   The doc comment says:
   - this is the founder's option A (F-1) written down as data, so the recipe is reviewable and a renamed button
     fails a unit test (P-13);
   - the size limit keeps the picture small enough for WhatsApp and iMessage to show it.

   Test it in `lib/link-preview/preview-image.test.ts` per `<behavior>`:
   - build the fake PNG buffers in the test;
   - read `components/outline/outline-editor.tsx` and the two committed app files with `readFileSync`, resolved
     from the repo root as `lib/privacy/wiring.test.ts` does;
   - read `BOARD_PRESETS` from `@/lib/geometry/presets`.

   The committed-files cases fail until step 4 has run. That is the RED this step expects.

3. **`scripts/capture-link-preview.ts`** (new) and the npm script. In package.json's scripts, add
   `"preview:capture": "tsx --tsconfig ./tsconfig.json scripts/capture-link-preview.ts"` directly after the
   `golden:volume` entry. The script's header comment says:
   - what it makes, and that it drives a RUNNING dev server;
   - the base address comes from `PREVIEW_BASE_URL` (default `http://localhost:3111`);
   - why a plain `npx next dev -p 3111` and not Playwright's webServer (P-7);
   - that it needs no new dependency (P-8).

   Inside an async `main()` (no top-level await), follow F-1 exactly, the same order as og-proto2.mjs's
   "e-horizontal-lines-wide" case:
   1. `chromium.launch()`, then a context with `PREVIEW_CAPTURE.viewport`, `deviceScaleFactor` and `colorScheme:
      "light"`. A fresh context means signed out, Imperial and the Daylight theme.
   2. `addInitScript` sets sessionStorage `shaper-sign-in-banner-dismissed` = "true" and localStorage
      `shaper-toolbar-tip-dismissed` = "true". Import `BANNER_DISMISSAL_KEY` and `TOOLBAR_TIP_DISMISSAL_KEY` from
      `lib/models/` rather than retyping the keys.
   3. `goto(base + "/", { waitUntil: "networkidle", timeout: 120_000 })`.
   4. Wait up to 60 s for `getByRole("button", { name: "Sign in", exact: true })` to be visible. If it never appears,
      throw a plain Error: "Clerk never loaded on the dev server, so the nav would show a blank where Sign in
      belongs. Start the dev server with `npx next dev -p 3111` (it loads the machine's own development keys), not
      the test server." This also guarantees a signed-out picture with no account details.
   5. Click `getByRole("button", { name: /Start Shaping/ }).filter({ hasText: PREVIEW_CAPTURE.presetName }).first()`,
      then wait `afterPreset`.
   6. Click the visible TEMPLATE link (client-side navigation keeps the in-memory board), wait for the URL to match
      `/\/design\/outline$/`, then wait `afterTemplate`.
   7. Click each of `PREVIEW_CAPTURE.buttons` in order with `exact: true`. Wait `afterButton` after the first two and
      `afterSidebar` after the third.
   8. `addStyleTag({ content: hideDevIndicatorCss })`, then wait `afterStyle`.
   9. `const big = await page.screenshot({ type: "png" })`. Check `pngDimensions(big)` is 2880 by 1512 (viewport ×
      scale), or throw.
   10. Downscale (P-8): open a second context with `viewport: PREVIEW_IMAGE_SIZE` and `deviceScaleFactor: 1`, then
       `setContent` a page whose html and body have zero margin, zero padding, hidden overflow and a white
       background, holding one `<img>` with `display:block`, width 1200px, height 630px and src
       `data:image/png;base64,` followed by the big screenshot. Await the image's `decode()` (via
       `locator("img").evaluate`), then take `small = await page.screenshot({ type: "png" })`.
   11. If `previewImageProblems(small)` is non-empty, throw with the problems joined.
   12. Only then write `small` to `PREVIEW_IMAGE_FILE` and `PREVIEW_IMAGE_ALT` to `PREVIEW_ALT_FILE`, with no
       trailing newline (P-14). Paths resolve from the repo root.
   13. Print one line, for example `Wrote app/opengraph-image.png (1200 x 630, 67,364 bytes) and
       app/opengraph-image.alt.txt`, close the browser, and exit 0. Any throw exits non-zero with the message.

4. **Run the capture once (P-7).**
   1. Confirm no dev server of this project is running:
      - `lsof -nP -iTCP:3111 -sTCP:LISTEN` prints nothing;
      - `for p in $(pgrep -f "next dev"); do lsof -a -p $p -d cwd -Fn 2>/dev/null | grep -qx "n$PWD" && echo "BUSY
        $p"; done` prints nothing.

      If either finds one, stop and report. Never kill a server you did not start.
   2. Start exactly one `npx next dev -p 3111` in the background, from the main checkout with no environment
      overrides. It loads the machine's own development environment file, as `npm run dev` does; never read, print
      or name that file.
   3. Wait until `curl -s -o /dev/null -w "%{http_code}" http://localhost:3111/design/outline` prints 200.
   4. Run `npm run preview:capture`.
   5. Stop the server with `pkill -f "next dev -p 3111"` and confirm port 3111 is free.
   6. Open the new `app/opengraph-image.png` (Read tool) beside the approved reference
      `/private/tmp/claude-501/-Users-kontoes-Code-shaper/0643c743-7152-4080-bf10-e612e3e02f8b/scratchpad/og-proto/option-A-board-large.png`.
      The framing must match: the nav with SHAPER ASSISTANT, TEMPLATE underlined and "Sign in" at the right; the
      Shortboard nose-left with its orange control points; the three station labels (11 1/4" Nose @ 12", 18 3/4"
      Center, 14 3/16" Tail @ 12"); and the LENGTH 6'2" (74"), WIDEPOINT 18 3/4", WP OFFSET 1" back and TAIL BLOCK
      4" wide cards. If it differs (a banner, a tip, an open sidebar, a dev badge, dark colours), fix the script and
      capture again. Record the byte count in the SUMMARY.

5. **`app/layout.tsx`** (edit). Replace the inline metadata object with `export const metadata: Metadata =
   SITE_METADATA;`, importing it from `@/lib/site/metadata`. Change nothing else.

6. **`e2e/link-preview.spec.ts`** (new; runs on all three projects). Import from `../lib/site/metadata` and
   `../lib/link-preview/preview-image`.
   - **"the home screen carries the link-preview tags".** Use `page.goto("/")` and check with
     `toHaveAttribute("content", …)`:
     - `meta[name="description"]`, `og:title`, `og:description`, `og:site_name`, `og:type` (website),
       `og:image:width` (1200), `og:image:height` (630), `og:image:type` (image/png);
     - `og:image:alt` and `twitter:image:alt`, both equal to `PREVIEW_IMAGE_ALT` exactly;
     - `og:url` against `/^https:\/\/www\.shaperassistant\.com\/?$/`;
     - `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`.

     Read `og:image` and `twitter:image` with `getAttribute`. Each parses as a URL whose `pathname` is
     `PREVIEW_IMAGE_ROUTE`. A comment says the dev server deliberately points the picture at itself (P-11), and the
     production-build spec proves the live absolute address. Open Graph tags use `property=`; twitter and
     description use `name=`.
   - **"a link previewer reads the tags in the page head without running scripts".** Call
     `request.get("/", { headers: { "user-agent": "WhatsApp/2.23.20.0" } })`, then take the text up to
     `</head>`. It contains `property="og:image"`, `/opengraph-image.png`, `summary_large_image` and
     SITE_DESCRIPTION.
   - **"a design screen shares the same picture".** On `/design/rails`, og:image's pathname is again
     `PREVIEW_IMAGE_ROUTE`.
   - **"the preview picture loads at 1200 by 630".** `request.get(PREVIEW_IMAGE_ROUTE)` returns status 200 and a
     `content-type` starting `image/png`, and `previewImageProblems(new Uint8Array(await response.body()))` equals
     `[]`.

   Give each test `test.setTimeout(90_000)`.

Commit with explicit paths, including the two app files and package.json, writing the message to a temp file and
using `git commit -F`. Subject: `feat: a link to the app, texted or posted, now shows the Template screen with a
shortboard, its control points and measurements, and a line about what the app does (quick 260930-fjm)`. The body
is two or three plain-English lines about what a shaper sees when the link arrives and how the picture is re-made,
ending with the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.
  </action>
  <verify>
    <automated>npx vitest run lib/site lib/link-preview && npm test && npm run lint -- --max-warnings 0 && npx tsc --noEmit && PW_PORT=3120 npx playwright test e2e/link-preview.spec.ts --project=desktop</automated>
  </verify>
  <done>Both modules and their tests pass, including the committed picture: 1200x630, under 300 KB, with an exact alt file. The capture matches the founder's option A, and its dev server on 3111 is stopped. The root layout reads SITE_METADATA. /opengraph-image.png loads as a 1200x630 PNG, and the home page head carries every tag listed, for a browser and for a WhatsApp user agent, with twitter:image filled from the same picture. One commit on main.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: A mistyped address shows a friendly not-found page, laid out for a phone too</name>
  <files>lib/error-pages/copy.ts, lib/error-pages/copy.test.ts, components/error-pages/recovery-styles.ts, app/not-found.tsx, components/site-nav.tsx, e2e/error-pages.spec.ts</files>
  <read_first>components/site-nav.tsx, components/design/phone-top-bar.tsx, components/design/phone-tab-bar.tsx, app/privacy/page.tsx, components/ui/button.tsx, lib/contact/message.ts (CONTACT_ROUTE, CONTACT_COPY.heading), lib/models/banner-dismissal.ts, lib/models/toolbar-tip.ts, e2e/privacy.spec.ts</read_first>
  <behavior>
    - ERROR_COPY and NOT_FOUND_COPY hold exactly the words in the context table (every key listed there)
    - errorReference(undefined) is null, errorReference("") is null, errorReference("   ") is null, errorReference(" 1603484608 ") is "1603484608"
    - No string in ERROR_COPY or NOT_FOUND_COPY contains the jargon words "404", "500", "digest", "exception", "stack" or "null" (case-insensitive): plain English only
  </behavior>
  <action>
Tests first (RED), then the modules (GREEN), then the page and SiteNav.

1. **`lib/error-pages/copy.ts`** (new, pure, no React or Next import). Export `ERROR_COPY` and `NOT_FOUND_COPY`
   `as const` with the keys and words from the context table, and `errorReference(digest: string | undefined):
   string | null`, which returns the trimmed digest, or null when it is missing or blank. The doc comment follows
   `lib/privacy/copy.ts`'s: the words are the product here and are pinned by tests (P-12), and the reference is
   Next's own opaque hash, never the failure's message. Test it in `lib/error-pages/copy.test.ts` per
   `<behavior>`, pinning every string exactly.

2. **`components/error-pages/recovery-styles.ts`** (new). Class strings shared by the three screens, so they can
   never drift apart:
   - `RECOVERY_MAIN`: "min-h-0 flex-1 overflow-y-auto bg-surf-ground".
   - `RECOVERY_COLUMN`: "mx-auto max-w-xl px-8 pt-16 pb-16 max-shell:px-4 max-shell:pt-6 max-shell:pb-8".
   - `RECOVERY_HEADING`: the Contact/Privacy h1 classes exactly, "text-3xl max-shell:text-xl leading-[1.2]
     font-display text-surf-ink uppercase tracking-architectural font-extrabold".
   - `RECOVERY_LEAD`: "mt-4 text-sm leading-relaxed text-surf-ink".
   - `RECOVERY_HINT`: "mt-3 text-sm leading-relaxed text-surf-ink".
   - `RECOVERY_ACTIONS`: "mt-8 flex flex-wrap gap-3 max-shell:mt-6".
   - `RECOVERY_PRIMARY_ACTION`: `buttonVariants({ variant: "default" })`.
   - `RECOVERY_SECONDARY_ACTION`: `buttonVariants({ variant: "outline" })`.
   - `RECOVERY_REFERENCE`: "mt-8 text-xs leading-relaxed text-surf-ink-muted".
   - `RECOVERY_REFERENCE_CODE`: "font-mono text-surf-ink select-all".

   Widths use `max-shell:` (layout by width); the actions' touch height comes from `buttonVariants`' `coarse:h-11`
   (sizing by pointer). CLAUDE.md's three switches are never mixed.

3. **`app/not-found.tsx`** (new, Server Component). Export `metadata: Metadata = { title: NOT_FOUND_COPY.pageTitle }`.
   The default export `NotFound()` returns a fragment containing:
   - a `<main data-not-found-page>` with `RECOVERY_MAIN`, holding a `RECOVERY_COLUMN` div with:
     - the h1 (heading), then the lead and hint paragraphs;
     - an actions div holding a `next/link` `Link href="/"` (Home screen, primary style) and a
       `Link href={CONTACT_ROUTE}` (Tell us about a broken link, secondary style);
   - `<PhoneTabBar />` as the fragment's last child (P-3).

   The doc comment records P-1 and P-3, and that Next answers this page with a 404 and a noindex tag.

4. **`components/site-nav.tsx`** (edit, P-2):
   - Delete the boolean that lists the phone-shell addresses, and delete the two route imports it alone used.
   - Make the desktop `<nav>` className one static string that always ends in `max-shell:hidden`.
   - Render `<PhoneTopBar />` unconditionally in the phone top bar's place.
   - Keep `usePathname` for the active-link highlight.
   - Rewrite the two comments that explained the list. They now say: below the shell breakpoint every page the app
     draws uses the phone's top bar, because the not-found page can sit at any address. Each page mounts its own
     bottom bar as its last child: `app/page.tsx`, `app/design/layout.tsx`, the Contact and Privacy pages,
     `app/not-found.tsx` and (next task) `app/error.tsx`. Before this change a mistyped address gave a phone the
     desktop link row squeezed into its width (measured 2026-09-30, quick 260930-fjm).

5. **`e2e/error-pages.spec.ts`** (new; Task 3 appends the error-screen half). Imports:
   - `BANNER_DISMISSAL_KEY` from `../lib/models/banner-dismissal`;
   - `TOOLBAR_TIP_DISMISSAL_KEY` from `../lib/models/toolbar-tip`;
   - `CONTACT_COPY` and `CONTACT_ROUTE` from `../lib/contact/message`;
   - `NOT_FOUND_COPY` from `../lib/error-pages/copy`.

   A `beforeEach` sets both dismissal keys with `addInitScript`, as `e2e/privacy.spec.ts` does. Write one helper,
   `expectShell(page, projectName, screen)`, which Task 3 reuses:
   - On a phone project: the banner's "Menu" button is visible, the "Settings" button is hidden, and
     `getByRole("navigation", { name: "Screens" })` has count 1 and is visible. The screen element's `scrollWidth`
     is at most its `clientWidth + 1`, and every link and button inside it has `offsetHeight` of at least 44.
   - On desktop: "Settings" is visible and the banner's Menu is hidden.

   Tests, each with `test.setTimeout(90_000)` and every locator scoped to `[data-not-found-page]`:
   - **"an unknown address shows the not-found page with its ways forward".** `page.goto("/no-such-page")` returns
     status 404, the page has the title `NOT_FOUND_COPY.pageTitle`, the h1 heading is visible, and the lead and
     hint text are shown. Link "Home screen" (`exact: true`) has href "/", and link "Tell us about a broken link"
     has href `CONTACT_ROUTE`. Then call `expectShell`.
   - **"an unknown design address keeps exactly one bottom bar".** `page.goto("/design/no-such-screen")` returns
     status 404, the heading is visible, then call `expectShell`.
   - **"Home screen takes a shaper home".** Click it; the URL matches `/\/$/` and `[data-setup-content]` is visible.
   - **"Tell us about a broken link opens the Contact page".** Click it; the URL matches `/\/contact$/` and the h1
     `CONTACT_COPY.heading` is visible.

Commit with explicit paths via `git commit -F`. Subject: `feat: a mistyped or old address now shows "We couldn't
find that page" with a way home and a way to tell us, on a computer and a phone (quick 260930-fjm)`. The body is
plain English, one line of which says a phone now gets its own top bar on any address, followed by the trailer.
  </action>
  <verify>
    <automated>npx vitest run lib/error-pages && npm test && npm run lint -- --max-warnings 0 && npx tsc --noEmit && PW_PORT=3120 npx playwright test e2e/error-pages.spec.ts e2e/privacy.spec.ts e2e/site-nav-width.spec.ts</automated>
  </verify>
  <done>The copy tests pin every word. /no-such-page and /design/no-such-screen answer 404 with the new page on all three projects, with exactly one bottom bar and the phone top bar below 820 dots. Both links work. The privacy and nav-width specs still pass. One commit on main.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: A failing screen shows a calm "Something went wrong" with three ways forward</name>
  <files>lib/error-pages/forced-error.ts, lib/error-pages/forced-error.test.ts, app/test-error/page.tsx, playwright.config.ts, app/fonts.ts, app/layout.tsx, app/error.tsx, app/global-error.tsx, lib/error-pages/wiring.test.ts, e2e/error-pages.spec.ts, e2e/prod/error-pages.spec.ts</files>
  <read_first>lib/contact/delivery.ts (resolveContactDelivery), lib/contact-server.ts, lib/contact/delivery.test.ts (its boundary block), playwright.config.ts, playwright.prod.config.ts, app/layout.tsx (the two font definitions at the top), lib/privacy/wiring.test.ts, e2e/prod/slider-dots.spec.ts, the files Tasks 1 and 2 created</read_first>
  <behavior>
    - forcedErrorRouteEnabled: { nodeEnv: "production", flag: "1" } is false; { "development", "1" } is true; { "test", "1" } is true; { undefined, "1" } is true (the contact stand-in's rule); { "development", undefined } is false; { "development", "true" } is false; { "development", " 1" } is false
    - FORCED_ERROR_ROUTE is "/test-error", FORCED_ERROR_ENV is "SHAPER_FORCED_ERROR", and FORCED_ERROR_MESSAGE is a non-empty sentence that appears in no copy module
    - GlobalError, server-rendered with a digest "ref-123" and an Error whose message is FORCED_ERROR_MESSAGE, produces markup that begins with <html, has lang="en", contains a <title> with ERROR_COPY.documentTitle, every ERROR_COPY string, a button labelled Try again, an anchor to "/" labelled Home screen, an anchor to "/contact" labelled Tell us what happened, and ref-123 after ERROR_COPY.referenceLead; it never contains FORCED_ERROR_MESSAGE or a <pre
    - Rendered without a digest, it omits ERROR_COPY.referenceLead
  </behavior>
  <action>
Tests first (RED), then the code (GREEN).

1. **`lib/error-pages/forced-error.ts`** (new, pure). Export:
   - `FORCED_ERROR_ROUTE = "/test-error"`;
   - `FORCED_ERROR_ENV = "SHAPER_FORCED_ERROR"`;
   - `FORCED_ERROR_MESSAGE = "Forced test failure for the browser suite — never shown to a shaper"`;
   - `forcedErrorRouteEnabled({ nodeEnv, flag })`, which is true only when `nodeEnv !== "production"` and `flag ===
     "1"` exactly (P-4, mirroring `resolveContactDelivery`).

   Test it in `lib/error-pages/forced-error.test.ts` per `<behavior>`.

2. **`app/test-error/page.tsx`** (new, Server Component, async default export). If
   `forcedErrorRouteEnabled({ nodeEnv: process.env.NODE_ENV, flag: process.env.SHAPER_FORCED_ERROR })` is false,
   call `notFound()`. Otherwise throw `new Error(FORCED_ERROR_MESSAGE)`. Both env reads must be those literal
   property accesses, because Next inlines the first as `"production"` in a real build. The doc comment says:
   - this is a test-only address;
   - the flag is set only in `playwright.config.ts`'s webServer env, which the production config strips;
   - it is proven dead in production by `e2e/prod/error-pages.spec.ts`.

3. **`playwright.config.ts`** (edit). Add `SHAPER_FORCED_ERROR: "1"` to `webServer.env`, directly after the
   contact stand-in entry. Give it a comment in that block's own style: test-only, never set in Vercel or in any env
   file, honoured only outside a production build, and it makes `/test-error` throw on the server so
   `e2e/error-pages.spec.ts` can see the error screen. `playwright.prod.config.ts` needs no change, because it
   already strips the whole env block.

4. **`app/fonts.ts`** (new) and **`app/layout.tsx`** (edit). Move the `Geist_Mono` and `Inter` definitions (with
   their options and the Inter doc comment) out of `app/layout.tsx` unchanged, and export them as `geistMono` and
   `inter`. This follows Next's "Using a font definitions file", so the root layout and the frame-failure screen
   share one font instance each. In `app/layout.tsx`, import `{ geistMono, inter }` from `./fonts` in place of the
   local definitions and the `next/font/google` import. The `<html>` className keeps reading `geistMono.variable`
   and `inter.variable`, and nothing else changes.

5. **`app/error.tsx`** (new). Starts with the `"use client"` directive. Default export
   `ErrorScreen({ error, retry }: { error: Error & { digest?: string }; retry: () => void })` returns a fragment:
   - `<main data-error-screen>` with `RECOVERY_MAIN`, holding a `RECOVERY_COLUMN` div with:
     - the h1 (`ERROR_COPY.heading`), then the lead and hint paragraphs;
     - an actions div holding a native `<button type="button">` (primary style) whose onClick calls `retry()`,
       labelled Try again; a `Link href="/"` (secondary style), labelled Home screen; and a
       `Link href={CONTACT_ROUTE}` (secondary style), labelled Tell us what happened;
     - when `errorReference(error.digest)` is non-null, a `RECOVERY_REFERENCE` paragraph: `ERROR_COPY.referenceLead`,
       a space, then `<code data-error-reference>` with `RECOVERY_REFERENCE_CODE` holding the reference;
   - `<PhoneTabBar />` as the last child (P-3).

   Render nothing else from the error object: never its message text, never its stack. The doc comment says:
   - it catches a failure in any page or nested layout under the root layout, so the nav, the design store and the
     in-progress board survive;
   - Try again re-fetches the screen from the server (measured);
   - the reference is the digest a server log can be matched by;
   - it records P-5.

6. **`app/global-error.tsx`** (new, P-6). Starts with the `"use client"` directive. It imports `"./globals.css"`
   and `{ geistMono, inter }` from `"./fonts"`. Default export `GlobalError({ error, retry })` with the same props
   type. It returns `<html lang="en">` with the `className` built from `geistMono.variable`, `inter.variable` and
   "antialiased". Inside it is `<body className="flex min-h-dvh flex-col bg-surf-ground text-surf-ink">` holding:
   - `<title>{ERROR_COPY.documentTitle}</title>`;
   - a `<header>` with "flex flex-none items-center border-b border-surf-line-faint bg-surf-ground px-6 py-6
     max-shell:px-4 max-shell:py-4", holding a plain `<a href="/">` wordmark "SHAPER ASSISTANT" with SiteNav's
     wordmark classes "text-sm font-extrabold tracking-architectural text-surf-ink";
   - `<main data-global-error-screen>` with the same inner layout as `app/error.tsx`, except:
     - Home screen and Tell us what happened are plain `<a href="/">` and `<a href={CONTACT_ROUTE}>` anchors, not
       Link components (full page loads on purpose);
     - there is no PhoneTabBar and no provider.

   eslint-config-next's `@next/next/no-html-link-for-pages` flags internal anchors in an app-dir project. Put one
   `// eslint-disable-next-line @next/next/no-html-link-for-pages -- a full page load on purpose: the app's own
   frame just failed` line above each of the three anchors; lint must end with 0 warnings. The doc comment records
   P-6, including that it follows the device's light/dark setting.

   Fallback, only if `npm run build` rejects the `./fonts` import in this client file: drop that import and the two
   font variables from `<html>`. The app's `font-display` chain in `globals.css` then falls back to the device's
   sans-serif on this last-resort screen. Record it as a deviation in the SUMMARY, and remove the `from "./fonts"`
   assertion and the `vi.mock` for global-error from the wiring test.

7. **`lib/error-pages/wiring.test.ts`** (new). Source-reading contracts, using the `stripComments` idiom from
   `lib/privacy/wiring.test.ts`, plus one server render:
   - **`app/test-error/page.tsx`:** contains `nodeEnv: process.env.NODE_ENV`, `process.env.SHAPER_FORCED_ERROR`,
     `notFound()` and `forcedErrorRouteEnabled(`, and has no `"use client"` directive.
   - **`playwright.config.ts`:** contains `SHAPER_FORCED_ERROR: "1"`.
   - **`playwright.prod.config.ts`:** still contains `env: _fakeDevServerEnv`.
   - **`app/error.tsx` and `app/global-error.tsx`:** the trimmed stripped source starts with `"use client";`. Neither
     matches `/\.(message|stack)\b/` (the error object's text and trace are never read). Both contain `retry()`.
   - **`app/global-error.tsx`:** contains `<html`, `<body`, `import "./globals.css"` and `from "./fonts"`. Its import
     lines include nothing from the framework's Link module (the one `app/privacy/page.tsx` imports Link from) and
     nothing from `@/components/design`.
   - **`app/error.tsx` and `app/not-found.tsx`:** each contains `<PhoneTabBar />` exactly once.
   - **`components/site-nav.tsx`:** contains `<PhoneTopBar />`, and no `&&` sits immediately before it (match
     `/&&\s*<PhoneTopBar/` must fail). The desktop nav's className literal contains `max-shell:hidden`.
   - **`app/layout.tsx`:** contains `metadata: Metadata = SITE_METADATA` and `from "./fonts"`.
   - **The render test** (per `<behavior>`):
     - Call `vi.mock("@/app/fonts", () => ({ inter: { variable: "font-inter-test" }, geistMono: { variable:
       "font-mono-test" } }))` at the top level, then import GlobalError from `@/app/global-error`. Render it with
       `renderToStaticMarkup(createElement(GlobalError, { error, retry: () => {} }))` from `react-dom/server`.
     - Vitest resolves the `.css` import to an empty module (measured feasible at plan time).
     - Before comparing text, decode the entities React writes: `&#x27;` to an apostrophe, `&quot;` to a double
       quote, `&amp;` to an ampersand. Otherwise the apostrophe in "couldn't" will not match.

8. **`e2e/error-pages.spec.ts`** (append). Import `ERROR_COPY`, plus `FORCED_ERROR_MESSAGE` and
   `FORCED_ERROR_ROUTE` from `../lib/error-pages/forced-error`. Add four tests, each with
   `test.setTimeout(90_000)`, each starting fresh with `page.goto(FORCED_ERROR_ROUTE)`, and each with every locator
   scoped to `[data-error-screen]`:
   - **"a failing screen shows the error screen with its three ways forward".** The response status is 500, the h1
     is visible, and the lead and hint text are shown. There is a button "Try again", a link "Home screen"
     (`exact: true`) with href "/", and a link "Tell us what happened" with href `CONTACT_ROUTE`.
     `ERROR_COPY.referenceLead` is visible, and `[data-error-reference]` text matches `/^\S+$/`. The screen does not
     contain `FORCED_ERROR_MESSAGE`, and `pre` inside it has count 0. Then call `expectShell`.
   - **"Try again asks the server for the screen again".** Set up
     `page.waitForRequest((r) => r.url().includes(FORCED_ERROR_ROUTE) && r.headers()["rsc"] === "1")`, click Try
     again, await the request, and assert the screen is still visible.
   - **"Home screen leaves the error behind".** Click it; the URL matches `/\/$/` and `[data-setup-content]` is
     visible.
   - **"Tell us what happened opens the Contact page".** Click it; the URL matches `/\/contact$/` and the h1
     `CONTACT_COPY.heading` is visible.

9. **`e2e/prod/error-pages.spec.ts`** (new; the production-build suite, all three projects). Import from
   `../../lib/...`. Use the dismissal init scripts as in `e2e/prod/slider-dots.spec.ts`.
   - **"the forced-error address is only a not-found page in a production build".** `page.goto(FORCED_ERROR_ROUTE)`
     has a final status of 404, the h1 `NOT_FOUND_COPY.heading` is visible, and `[data-error-screen]` has count 0.
   - **"the built home screen points the preview at the live address, and the picture loads".** On
     `page.goto("/")`:
     - og:image and twitter:image both match `/^https:\/\/www\.shaperassistant\.com\/opengraph-image\.png\?/`. In a
       production build Next uses metadataBase for the picture (P-11); this is the check the dev spec cannot make.
     - og:image:alt equals `PREVIEW_IMAGE_ALT`, twitter:card is summary_large_image, and og:description equals
       SITE_DESCRIPTION.

     Then `page.request.get(PREVIEW_IMAGE_ROUTE)` returns status 200 with image/png, and `previewImageProblems` of
     its body is `[]`.

   Use the browser page, not a bare request, for the HTML here. This suite runs Clerk's development instance, which
   may send a script-less request through its handshake redirect.

10. Run the suites in the order the verify command lists. The build output lists the picture's route
    (`/opengraph-image.png`). Record that line in the SUMMARY.

Commit with explicit paths via `git commit -F`. Subject: `feat: when a screen fails, shapers see a calm "Something
went wrong" with Try again, the home screen and a way to tell us, instead of the bare framework error (quick
260930-fjm)`. The body is plain English: the reference code, the frame-failure fallback, and the test-only address
being dead in a real build. Then the trailer.

Write `.planning/quick/260930-fjm-phase-13-item-12-a-friendly-error-screen/260930-fjm-SUMMARY.md` and leave it
uncommitted. The orchestrator commits the docs.
  </action>
  <verify>
    <automated>npx vitest run lib/error-pages && npm test && npm run lint -- --max-warnings 0 && npx tsc --noEmit && PW_PORT=3120 npx playwright test e2e/error-pages.spec.ts e2e/link-preview.spec.ts e2e/privacy.spec.ts && npm run build && PW_PROD_PORT=3127 npx playwright test -c playwright.prod.config.ts error-pages.spec.ts</automated>
  </verify>
  <done>The switch, source-contract and render tests pass. On all three projects the forced error shows the error screen with its three ways forward, a reference, and neither the thrown message nor a stack. Try again re-fetches, and Home screen and Contact navigate. The not-found and link-preview specs still pass. The root layout and the frame-failure screen share app/fonts.ts. On the production build /test-error is a plain 404 not-found page, og:image and twitter:image are the absolute live address, and the picture loads. One commit on main; SUMMARY written, uncommitted.</done>
</task>

<task type="auto">
  <name>Task 4 (the founder's revision, 2026-09-30): the preview picture is the board itself, cropped tight and framed — no menu bar, no toolbar</name>
  <files>playwright.config.ts, scripts/capture-link-preview.ts, lib/link-preview/preview-image.ts, lib/link-preview/preview-image.test.ts, app/opengraph-image.png</files>
  <read_first>scripts/capture-link-preview.ts and lib/link-preview/preview-image.ts as committed in Task 1; components/outline/outline-editor.tsx (and the viewer/drawing components it renders) to find stable hooks for the drawing and its label cards; the founder-approved reference /private/tmp/claude-501/-Users-kontoes-Code-shaper/0643c743-7152-4080-bf10-e612e3e02f8b/scratchpad/og-proto/option-A2-cropped.png and the orchestrator's prototype of it (it cropped the 2x capture to the union of the station labels, the board, its control points and the four data cards, then framed it)</read_first>
  <action>
The founder looked at the committed picture and said: "the preview picture doesn't need the nav bar and button icons. Just a tightly cropped shot of the board as pictured here (I do like the border though)." They approved the orchestrator's prototype (the reference above). FIRST, a fix the orchestrator's full run found (commit it separately, before the picture work): `playwright.config.ts` has `testDir: "./e2e"`, so the everyday dev-server suite also runs the production-only specs under `e2e/prod/`. The new `e2e/prod/error-pages.spec.ts` failed 6 times there (all three projects) — on the dev server `/test-error` throws on purpose and the preview's address is localhost, both correct for dev. `e2e/prod/slider-dots.spec.ts` had been running there too, passing only incidentally. Add `testIgnore: ["**/prod/**"]` (or the equivalent pattern the installed Playwright documents) to `playwright.config.ts` with a one-line comment saying those specs run only through `playwright.prod.config.ts` (its `testDir: "./e2e/prod"` is unaffected). Prove it: `PW_PORT=3120 npx playwright test --list | grep -c "e2e/prod"` prints 0, and `npx playwright test --config playwright.prod.config.ts --list` still lists both prod specs. Commit subject: `test: the everyday browser suite no longer runs the production-only checks, which only a production build can pass (quick 260930-fjm)`.

THEN make the capture script produce that look, reproducibly, with NO new dependency:

1. Capture exactly as today (same window, 2x, the Shortboard, the three clicks, the "Sign in" signed-out guard).
2. Before the screenshot, measure in the page (page.evaluate) the union of the bounding rects of what must be in the picture: the board drawing (the outline, its centreline and station lines), the three station labels above it (Nose @ 12", Center, Tail @ 12"), the control points and handles, and the LENGTH / WIDEPOINT / WP OFFSET / TAIL BLOCK cards. Use stable hooks from the components (data attributes or roles already there; add a data attribute only if nothing stable exists, and say so). Exclude the site nav and the viewer toolbar buttons. Add a margin of 16 CSS px around the union. Also read the viewer panel's own computed border colour and radius, so the frame matches the app instead of a hard-coded colour (the prototype sampled rgb(137,124,88) and used a 16 px radius).
3. Screenshot only that clip (Playwright `clip`, in CSS px; at 2x it comes out sharp).
4. Compose the final 1200×630 in the browser, the same way Task 1 downscales: page.setContent a white 1200×630 page with a frame inset 14 px on every side (border 3 px, the panel's colour and radius) and the cropped image centred inside with at least 34 px of white on every side, scaled to fit (object-fit: contain), then screenshot the page at deviceScaleFactor 1.
5. Keep previewImageProblems as the gate (1200×630, PNG, under 300 KB). Record the new crop/frame numbers (margin, inset, border width, minimum padding) in PREVIEW_CAPTURE or a sibling constant with one-line reasons, and pin them in preview-image.test.ts. The alt text stays as it is ("Shaper Assistant's Template screen: a shortboard outline, nose to the left, with its control points, station marks and measurements") — still true.
6. Re-run the capture exactly like Task 1 (check port 3111 and that no next dev from this folder runs; `npx next dev -p 3111`; `npm run preview:capture`; stop ONLY that server with `pkill -f "next dev -p 3111"`; confirm the port is free), then look at the new app/opengraph-image.png beside the reference and report any visible difference. It must show no part of the nav bar and no toolbar icon.
7. `npm test`, `npm run lint -- --max-warnings 0`, `npx tsc --noEmit`, then `PW_PORT=3120 npx playwright test e2e/link-preview.spec.ts` (all three projects).
8. Commit the four picture files (not playwright.config.ts, already committed above) with explicit paths. Subject: `feat: the link-preview picture is now the board itself, cropped tight inside the viewer's border, with no menu bar or toolbar (quick 260930-fjm)`. Plain-English body; end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Then add a short "Task 4" section to the SUMMARY (uncommitted).
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && npx vitest run lib/link-preview/preview-image.test.ts && npm test && npm run lint -- --max-warnings 0 && npx tsc --noEmit && PW_PORT=3120 npx playwright test e2e/link-preview.spec.ts</automated>
  </verify>
  <done>app/opengraph-image.png is the board cropped tight and framed like the approved reference — no nav bar, no toolbar icon — 1200×630 PNG under 300 KB, produced by the committed script; tests green; one commit.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| server → browser (error screen) | A server-side failure's details must not cross to the shaper's screen |
| test harness → server | The forced-error switch must be reachable only by the local dev-server test run |
| link previewer → site | Unauthenticated crawlers (WhatsApp, iMessage, X) fetch the page head and the picture |
| developer's machine → committed picture | The capture runs a browser against a dev server holding the machine's own development keys; whatever it photographs becomes public |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-fjm-01 | Information disclosure | app/error.tsx, app/global-error.tsx | medium | mitigate | Render only the copy module's words and Next's opaque digest (through `errorReference`). The error object's message and stack are never read (a wiring test fails on any property read of them). The e2e checks the thrown sentence is absent from the screen and that the screen has no `pre` element. |
| T-fjm-02 | Elevation of privilege | app/test-error/page.tsx | high | mitigate | Double lock: literal `process.env.NODE_ENV` (inlined `"production"` in a real build) AND `SHAPER_FORCED_ERROR === "1"`, which is set only in playwright.config.ts's env block, stripped by the production config and never in Vercel. Every other case calls `notFound()`. Pinned by forced-error.test.ts and wiring.test.ts, and proven by the production-build spec (404). The route can only throw, never read or write data. |
| T-fjm-03 | Denial of service | app/opengraph-image.png | low | accept | A plain committed file (about 67 KB) served as-is, with no rendering per request, and excluded from the Clerk proxy by its `.png` extension. A crawler burst costs almost nothing. |
| T-fjm-07 | Information disclosure | scripts/capture-link-preview.ts | medium | mitigate | A fresh browser context is always signed out. The script refuses to capture until the nav's "Sign in" button is visible, which proves no account name, picture or saved board can be in the frame. It photographs only the Shortboard preset. The executor compares the result with the founder's approved reference before committing. Nothing about the dev keys is ever printed or written. |
| T-fjm-04 | Information disclosure | lib/site/metadata.ts | low | accept | The tags carry only public marketing words and the public address. No user or board data is ever in metadata. |
| T-fjm-05 | Spoofing | metadataBase | low | accept | Fixed to the app's own live address. A built picture points at the live site, or at a Vercel preview's own address on a preview (P-11), so a preview can never point at another host. |
| T-fjm-06 | Tampering | app/global-error.tsx anchors | low | accept | Hard-coded same-origin paths ("/", "/contact") and no user input in any href. |
| T-fjm-SC | Tampering | npm installs | low | accept | No package is installed. Playwright and tsx are already dev dependencies, the downscale runs in Chromium, and `sharp` (present only as Next's optional dependency) is not used (P-8). |
</threat_model>

<verification>
- After every task: `npm test`, `npm run lint -- --max-warnings 0` and `npx tsc --noEmit`. The task's own targeted
  Playwright run uses `PW_PORT=3120` (port 3100 belongs to another project).
- End of plan: the error-pages, link-preview and privacy specs on all three projects, `npm run build` from the main
  checkout, and the production suite's new spec on `PW_PROD_PORT=3127`.
- The orchestrator runs afterwards:
  - the full suite (`PW_PORT=3120 npm run test:e2e`), because SiteNav and the root layout changed for every page;
  - pictures for the founder. On a dev server started with `SHAPER_FORCED_ERROR=1`, capture `/test-error` and
    `/no-such-page` at desktop 1280x800 and iPhone 14. Show the committed `app/opengraph-image.png` beside the
    approved option A reference
    (`/private/tmp/claude-501/-Users-kontoes-Code-shaper/0643c743-7152-4080-bf10-e612e3e02f8b/scratchpad/og-proto/option-A-board-large.png`).
- The executor never reads, prints or names `.env*` files or any key value, and never pushes. It starts at most one
  standalone dev server (`npx next dev -p 3111`, Task 1 step 4, P-7), only after confirming none of this project's is
  running, and stops it straight after the capture. Every other browser run uses Playwright's own webServer on
  `PW_PORT=3120`.
</verification>

<success_criteria>
- A forced error shows the new error screen on desktop and on both phone profiles, with its three ways forward and
  a reference, and never the failure's own text.
- A mistyped address shows the new not-found page with a way home and a way to report it, as a 404, on desktop and
  both phones, with exactly one bottom bar on a phone.
- Every page's head carries the Open Graph and Twitter/X tags. On a production build the picture's address is the
  absolute live one. The picture is the founder's option A capture of the Template screen: a committed 1200 by 630
  PNG under 300 KB with exact alt text, re-made at any time with `npm run preview:capture`.
- `/test-error` is a plain not-found page in a production build.
- Left for the founder, before and after the push:
  1. look at the pictures of both screens and at the captured preview image beside option A, and approve them (the
     words and the description are already approved, F-3 and F-4);
  2. approve the picture's alt text (their own suggestion, used as written);
  3. give the go to push;
  4. after the deploy, check that
     `curl -s -A "WhatsApp/2.23.20.0" https://www.shaperassistant.com/ | grep -o '<meta property="og:image"[^>]*>'`
     shows `https://www.shaperassistant.com/opengraph-image.png?…` and that the address opens the picture, then text
     the link to a phone and see the card. WhatsApp caches a link's preview, so use a link never sent before (add
     `?v=1` if needed).
</success_criteria>

<output>
Create `.planning/quick/260930-fjm-phase-13-item-12-a-friendly-error-screen/260930-fjm-SUMMARY.md` when done. In
plain English it covers:
- what a shaper sees on each screen, and on a phone;
- what a texted link shows, and how to re-make the picture (`npm run preview:capture` against `npx next dev -p 3111`);
- the picture's byte count and how it compares with option A;
- that the test-only address is dead in a real build;
- the three commits;
- the test counts, and the build's `/opengraph-image.png` line;
- the founder's four steps from success_criteria.

Do not commit PLAN.md or SUMMARY.md, and do not touch ROADMAP.md, STATE.md, the SPEC or CLAUDE.md.
</output>
