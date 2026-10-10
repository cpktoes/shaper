---
phase: quick-261010-km7
plan: 01
subsystem: brand / top bar / printed order form / home-screen icon
tags: [logo, wordmark, top-bar, order-form, manifest, home-screen-icon, playwright]
status: complete
status_reason: "Tasks 1-3 are done and committed. Task 4 (the founder's look) and Task 5 (re-recording the five desktop test pictures) are the orchestrator's, as instructed. Until Task 5 runs, the full browser suite fails exactly the five desktop-baseline tests, by design."
requires:
  - quick-261010-j2f (sign-up email, finished and pushed)
provides:
  - "components/wordmark.tsx: the founder's logo as one inline shape in the surrounding ink"
  - "the logo in the computer row, the phone's compact bar (upright and sideways) and the error screen"
  - "the logo on the printed order form (page 1 alone, page 2 on the board name's baseline)"
  - "the order form's footer address proven a link (screen: new tab; PDF: one annotation per page)"
  - "app/manifest.ts + three circle-logo icons (Home Screen on iPhone, iPad, Android)"
  - "brand/ folder with sources and README"
affects: [top bar, summary order form, home-screen icon, desktop baseline pictures]
tech-stack:
  added: []
  patterns:
    - "inline currentColor SVG instead of a CSS mask (a mask vanishes in a print with background graphics off)"
    - "manifest display 'browser' + iOS label through metadata.other (never appleWebApp)"
key-files:
  created:
    - brand/README.md
    - brand/wordmark.svg
    - brand/wordmark-black-on-white-source.jpg
    - brand/wordmark-white-on-grey-source.jpg
    - brand/circle-logo-source.jpg
    - brand/circle-logo-clean-2000.png
    - components/wordmark.tsx
    - components/wordmark-path.ts
    - components/wordmark.test.ts
    - app/manifest.ts
    - public/home-screen-icon-192.png
    - public/home-screen-icon-512.png
    - lib/site/home-screen-icon.test.ts
    - e2e/wordmark.spec.ts
    - e2e/summary-logo.spec.ts
    - e2e/home-screen-icon.spec.ts
    - .planning/quick/261010-km7-new-logo-top-bar-order-form-and-home-scr/trace-scripts.tar.gz
  modified:
    - components/site-nav.tsx
    - components/design/phone-top-bar.tsx
    - app/global-error.tsx
    - components/summary/order-form-primitives.tsx
    - components/summary/order-form.tsx
    - app/design/summary/order-form.css
    - app/apple-icon.png
    - lib/site/metadata.ts
    - lib/site/metadata.test.ts
    - components/design/toolbar-tip.tsx
    - CLAUDE.md
    - e2e/phone-home.spec.ts
    - e2e/phone-sideways-top-bar.spec.ts
    - e2e/board-lock.spec.ts
    - e2e/site-nav-width.spec.ts
decisions:
  - "Order form page 2: -mt-[0.1em] on the baseline logo so the strip is no taller than before (measured: without it +0.16 dot on screen, +0.64 in print)"
  - "The tab icon files (app/icon.svg, app/favicon.ico) are byte-identical; app/apple-icon.png is the new 180 circle"
metrics:
  duration: "about 1 hour 20 minutes"
  completed: 2026-10-10
actuals:
  tokens: 22900
  tasks: 3
  commits: 3
---

# Phase quick-261010-km7 Plan 01: the new logo in every top bar and on the order form, the circle logo as the home-screen icon

**Tasks 1 to 3 are built, committed and tested. The founder's logo now stands where SHAPER ASSISTANT did, on every top bar and on the printed order form, and the circle logo is the Home Screen icon on iPhone, iPad and Android. The full browser suite fails only the five desktop test pictures, each differing only inside the logo's corner. Task 4 (the founder's look) and Task 5 (re-record) are the orchestrator's.**

## What was built, in plain English

**On a computer.** The top bar shows the "shaperassistant.com" logo where the name used to be, in each theme's own ink (near-black on Daylight and Chalk, near-white on Slate, green on Phosphor), and it still turns the accent colour under the mouse. It takes exactly the room the name took, 175.4 dots wide and 21.8 tall. In a narrow window (820 to 1023 wide), where the name used to wrap onto two lines, the logo shrinks instead (106 dots wide at 820), so that bar is now 81 dots tall instead of 89.

**On a phone.** The logo grows into the bar's spare room: 159 dots wide on a 360 phone, 174 at 375, and 175.4 from 377 up and on every phone held sideways. Save keeps its 20 dots of clear air in its widest face (20.0 at 360, 33.6 at 390, 55.6 at 412), Unlock keeps well over its 8, the menu button has not moved by a hair (box compared before and after at seven sizes), and the bar is still 48 tall. On the home page the logo is a plain picture, not a link.

**The last-resort error screen** carries the logo too, in the device's light or dark ink, with its header exactly as tall as before.

**On paper.** Page 1's title block shows the logo alone, centred in its bordered box, in the sheet's own ink; the web address line and the little rule under the old name are gone. Page 2's strip carries the logo on the same baseline as the board's name. Both print correctly with the browser's "Background graphics" option off (looked at in a real saved PDF).

**The address at the foot of every page** (www.ShaperAssistant.com) is a link, and per the founder's later rule (D-16) it opens in a **new tab**, so a shaper never loses the Summary page or an unsaved board by clicking it. In a saved PDF every page carries exactly one link to the site (Letter and A4). On the narrowest phone print sheets (under 480 dots) the address steps aside and the footer reads "Page N of M" alone, as fast task 154 decided.

**On the Home Screen.** The circle logo, labelled "Shaper Assistant": on iPhone and iPad through the touch icon and a title tag, on Android through a new manifest with 192 and 512 icons. The manifest asks for the ordinary browser ("browser"), nothing asks to open as a standalone app (that mode breaks Print on an iPhone), and the browser tab still shows the tilted board.

**brand/** holds the founder's three images, the cleaned circle, the traced logo and a README saying how every derived file was made; the tracer is archived beside the plan as `trace-scripts.tar.gz`.

## Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 | `25e8a84` | Top bar: the new shaperassistant.com logo replaces SHAPER ASSISTANT, in each theme's own ink |
| 2 | `e569d4e` | Printed order form: the new logo heads page 1 and sits beside the board's name on page 2; the address at the foot of every page is the link |
| 3 | `d2fe79d` | Home screen: the circle logo is the app's icon on iPhone and Android; the browser tab keeps the board |

## Test results

- **Vitest (after the last commit):** 134 files passed, 4682 tests passed, 2 skipped, no timeouts. `npm run lint` clean. `npx tsc --noEmit` clean. `npm run build` passes (the route list shows `/manifest.webmanifest` and `/apple-icon.png`).
- **Whole browser suite** (`PW_PORT=3191 npx playwright test --reporter=list`, log `scratchpad/e2e-km7.log`, last line `EXIT=1`): **1063 passed, 750 skipped (by design: project-specific tests), 5 failed in 36.4 minutes.** The five are exactly the desktop baselines, expected to fail until the re-record:
  - `e2e/desktop-baseline.spec.ts` TEMPLATE, ROCKER, RAILS, VOLUME, FINS (desktop project).
  - **No other test failed.**
- **Production checks** (`npm run test:e2e:prod -- --reporter=list`, log `scratchpad/prod-km7.log`, last line `EXIT=0`): 18 passed, 3 skipped, 0 failed.

Per-spec passes in the whole-suite run for the files this task touches or must protect: wordmark 48, summary-logo 7, home-screen-icon 4, phone-home 30, phone-sideways-top-bar 14, board-lock 10, site-nav-width 12, phone-layout 30, phone-trip 3, phone-dialogs 6, old-safari-buttons 27, phone-chrome 44, summary-preview 12, summary-print-size 3, summary-print-touch-box 10, summary-rail-key 6, summary-rail-instructions-fit 5, summary-planing 22, summary-blank 13. All fully green, including the three protected print gates, which were not edited.

Task-level runs along the way: Task 1's ten-spec verify list, 224 passed, 229 skipped, 0 failed; Task 2's eight-spec list, 78 passed, 48 skipped, 0 failed; `home-screen-icon.spec.ts` 4 passed.

### The five desktop baselines (not re-recorded)

Each has before (the committed picture), after (this run's actual) and diff in `pictures/` as `BASENAME-desktop-before|after|diff.png`. Every pixel that differs, compared exactly:

| Screen | Differing pixels | Bounding box | Outside the logo's box (x 40-232, y 24-58) |
| ------ | ---------------- | ------------ | ------------------------------------------ |
| TEMPLATE (outline) | 1851 | x 48-222, y 29-50 | 0 |
| RAILS | 1851 | x 48-222, y 29-50 | 0 |
| VOLUME | 1851 | x 48-222, y 29-50 | 0 |
| FINS | 1851 | x 48-222, y 29-50 | 0 |
| ROCKER | 1858 | x 48-357, y 29-292 | **7**, at (264,272) (357,272) (263,273) (263,274) (265,291) (265,292) (266,292), each off by 1 or 2 colour steps out of 255, all on the ROCKER board drawing's anti-aliasing |

The ROCKER seven are not the logo: they are 1-2-step colour wobbles on the rocker drawing's edge (the baseline's own header already records ROCKER's few pixels of anti-aliasing noise), far inside the spec's `maxDiffPixels: 100`. The re-record will absorb them. No other pixel anywhere changed.

## Measured sizes and heights

| Item | Before | After |
| ---- | ------ | ----- |
| Computer row, mouse, 1280 wide | 81 | 81 |
| Computer row, mouse, 1024 | 81 | 81 |
| Computer row, mouse, 1023 | 81 | 81 |
| Computer row, mouse, 820 | 89 (name wrapped) | 81 (logo 106.0 x 13.1) |
| Computer row, touch, 1024 x 640 | 93 | 93 |
| Phone bar | 48 | 48 |
| Menu button box at 320, 360, 375, 390, 412, 844 x 390, 863 x 360 | 44 x 44, top 1.5, left = width - 60 | identical (compared field by field) |
| Phone logo at 360 / 375 / 390 and up / sideways | n/a | 159.0 x 19.7 / 174.0 x 21.6 / 175.4 x 21.8 (175.36 x 21.75 exactly) |
| Order form page 2 strip, screen, 1280 | 34.375 | 33.375 (one dot shorter) |
| Order form page 2 strip, print | 28.64 | 28.64 (identical) |
| Page 1 title block / logo, screen | 296 x 137 block, two-line name | logo 270.2 x 33.5 centred in it |
| Sheet clipping at a 268-dot phone print | [0, 18-19, 0] (the second sheet) | [0, 0-1, 0] |
| Sheet clipping at a 300-dot phone print | [0, 0-7, 0] | [0, 0, 0] |

## The footer-link proof

Before the change, a Chromium PDF with background graphics off, three sheets (pypdf, page by page): page 1 had **2** link annotations (title block and footer), pages 2 and 3 had 1 each, all `https://www.shaperassistant.com/`.

After the change (same method, `scratchpad/km7-print-after.pdf`): pages 1, 2 and 3 have **exactly one link each**, each `https://www.shaperassistant.com/`. `e2e/summary-logo.spec.ts` pins this at Letter and at A4 (three pages, three `/Annots` arrays, three addresses). On screen, each of the three sheets' address is a link with `target="_blank"` and `rel="noopener noreferrer"`, nothing covers it, and clicking the first opens `https://www.shaperassistant.com/` in a new tab (answered by a stand-in page so the real site is never touched) while the Summary page's address stays put.

No page needed its footer address "made a link": all three already were. The only code change to it was D-16's new-tab behaviour.

## Pictures (all in `.planning/quick/261010-km7-new-logo-top-bar-order-form-and-home-scr/pictures/`)

Every pair is `NAME-before.png` and `NAME-after.png`.

- **Top bar on a computer, four themes:** `top-bar-computer-daylight`, `-chalk`, `-slate`, `-phosphor`
- **Top bar on a phone (390 wide), four themes:** `top-bar-phone-daylight`, `-chalk`, `-slate`, `-phosphor`
- **Phone widths where the size differs:** `top-bar-phone-360`, `top-bar-phone-375`; sideways: `top-bar-sideways` (844 x 390)
- **A narrow computer window:** `top-bar-820`
- **Order form on screen** (page 1's header band stacked over page 2's strip): `order-form-screen-daylight`, `order-form-screen-phosphor`
- **Order form as a saved PDF, background graphics off, Letter, from Phosphor** (so the print ink is visibly Daylight's): `order-form-print-page1`, `order-form-print-page2`
- **The choice the founder has left open:** `order-form-title-block-rule-kept.png` (page 1's header band, after, with a one-dot rule at two thirds of the box's width put back under the logo by the picture script alone; compare with `order-form-screen-daylight-after.png`)
- **Home-screen icon:** `home-screen-icon-180.png`, `-192.png`, `-512.png`, and the mock-up `home-screen-icon-iphone-look.png` (the 180 with an iPhone's rounded corners on mid-grey)
- **The five desktop pictures:** `outline|rocker|rails|volume|fins-desktop-before|after|diff.png`
- **Plan-time evidence:** `plan-logo-in-four-themes.png`, `plan-print-evidence-svg-vs-mask.png`

## For the orchestrator

Task 5's re-record, once the founder has approved the look (nothing has been re-recorded):

```
cd /Users/kontoes/Code/shaper && PW_PORT=3191 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop --update-snapshots && PW_PORT=3191 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop
```

Then `git status` should show only the five PNGs under `e2e/desktop-baseline.spec.ts-snapshots/` changed. Commit subject from the plan: "Desktop test pictures: re-recorded with the new logo in the top bar (the founder approved)". (The desktop baseline spec's own header carries a re-record log; add its dated entry then.) No dev server is left running on 3191 or 3107.

The title-block rule is the founder's one open choice: the code drops it (D-13); if he wants it back it is one line in `LogoBlock` in `components/summary/order-form-primitives.tsx`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Page 2's strip came out taller than before**
- **Found during:** Task 2 (measuring before and after)
- **Issue:** with the logo in its baseline form the strip stood 0.16 dot taller on screen and 0.64 in print than with the old text, because the plan's "0.859em box is shorter than the old line's 0.864em ascent" arithmetic is a hair off against Inter's real vertical metrics.
- **Fix:** 0.1em of negative top margin on that logo: the letters stay exactly on the baseline, only the box's share of the strip's height shrinks. Print is now exactly identical (28.64); screen is one dot shorter than before (33.375 against 34.375), which is "no taller", as D-09 requires.
- **Files modified:** components/summary/order-form.tsx
- **Commit:** `e569d4e`

**2. [Rule 1 - stale plan figure] Sheet clipping figures in the plan were wrong about which sheet and how much**
- The plan said sheet 1 clips 89 px at 268 and 11 at 300. Measured today (and in every earlier suite log) it is the **second** sheet that clips, 18-19 dots at 268 and 0-7 at 300; sheet 1 clips nothing. `e2e/summary-logo.spec.ts` records the real figures and asserts no sheet clips more than that (plus one dot). After the change the second sheet clips 0-1 at 268 and 0 at 300 (page 2's strip no longer wraps).

**3. [Rule 3 - lint] The error screen's lint-disable comment**
- ESLint's `no-html-link-for-pages` exemption must sit directly above the anchor, so the explanatory comment about the logo goes above it, not between. No behaviour difference.

### Plan items done a little differently, no change to what the founder sees

- The plan's per-spec "page mark is one line" check is asserted on the right-hand mark (address and page number) only. At the very narrowest sheet (268) page 1's *title* ("Custom Surfboard Order") already wraps beside the page number; that is older than this change and untouched by it.
- `trace-scripts.tar.gz` is committed (with Task 1) because `brand/README.md` points to it.
- Sizes read 175.36 x 21.75 dots, not exactly 175.4 x 21.8 (10.96rem at 16px); the specs allow 0.5 dots.

## Known Stubs

None.

## Threat Flags

None. The only new surface is the public `/manifest.webmanifest` (site name, description and icon paths), the plan's accepted T-km7-04.

## Threat-model checks done

- T-km7-01: `components/wordmark.test.ts` proves `WORDMARK_PATH` equals `brand/wordmark.svg`'s path character for character; the file was copied with `cp`.
- T-km7-02: `lib/site/home-screen-icon.test.ts`, `lib/site/metadata.test.ts` and `e2e/home-screen-icon.spec.ts` prove display "browser", no `appleWebApp`, no `mobile-web-app-capable` and no `apple-mobile-web-app-capable` anywhere.
- T-km7-03: `app/icon.svg` (`b44259b6...`) and `app/favicon.ico` (`f93d71a5...`) hashes unchanged; `app/apple-icon.png` is `0c562cdd...` as planned; a unit test lists `app/` and finds no other icon file.

## Self-Check: PASSED

- Commits found: 25e8a84, e569d4e, d2fe79d.
- Files found: components/wordmark.tsx, components/wordmark-path.ts, brand/wordmark.svg, brand/README.md, app/manifest.ts, public/home-screen-icon-192.png, public/home-screen-icon-512.png, app/apple-icon.png, e2e/wordmark.spec.ts, e2e/summary-logo.spec.ts, e2e/home-screen-icon.spec.ts, trace-scripts.tar.gz.
- Pictures folder holds every picture listed above.

## Tasks 4 and 5 (the orchestrator, 2026-10-10)

- **Task 4, the founder's look:** the founder gave a standing go before the build ("push all when live"); the before/after pictures were sent to him, including `order-form-title-block-rule-kept.png` (the rule stays dropped unless he asks for it back).
- **Task 5, re-record:** all five desktop baselines re-recorded on the main checkout (Turbopack, PW_PORT=3191), commit aeb0d58. Old against new: exactly 1851 changed pixels on every screen, all inside the logo's box (x 40-232, y 24-58), 0 anywhere else; the re-recorded pictures pass a second run.
