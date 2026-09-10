---
phase: quick-260909-sda
plan: 01
status: complete
subsystem: branding
tags: [rename, ui, print, e2e]
dependency-graph:
  requires: []
  provides: [product-name-shaper-assistant]
  affects: [site-nav, phone-top-bar, order-form, browser-tab-titles, project-paperwork]
tech-stack:
  added: []
  patterns: [wordmark-hoisted-class-constant, one-visual-token-per-name-length]
key-files:
  created: []
  modified:
    - components/site-nav.tsx
    - components/design/phone-top-bar.tsx
    - components/summary/order-form-primitives.tsx
    - components/summary/order-form.tsx
    - app/design/summary/order-form.css
    - app/layout.tsx
    - app/page.tsx
    - app/design/outline/page.tsx
    - app/design/rocker/page.tsx
    - app/design/rails/page.tsx
    - app/design/volume/page.tsx
    - app/design/fins/page.tsx
    - app/design/summary/page.tsx
    - package.json
    - README.md
    - CLAUDE.md
    - .claude/CLAUDE.md
    - .planning/PROJECT.md
    - e2e/phone-home.spec.ts
    - e2e/phone-layout.spec.ts
    - e2e/summary-preview.spec.ts
    - e2e/prod/slider-dots.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/rails-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/fins-desktop-desktop-darwin.png
decisions:
  - "D-01: phone wordmark stepped down from text-sm to text-xs (phone bar only), leaving 28.7px of clear air before Save in Save's widest face"
  - "D-02: printed identity box keeps its type size, name stacks onto two centred lines"
  - "D-03: desktop screenshots may only change inside the name's own painted area"
metrics:
  duration: ~75min
  completed: 2026-09-09
actuals:
  tokens: 42000
  tasks: 3
  commits: 3
---

# Phase quick-260909-sda Plan 01: The Product Is Now Called Shaper Assistant Summary

Renamed the product from SHAPER to Shaper Assistant everywhere it names itself on screen, in
print, in the browser tab, and in the project's own paperwork — with zero changes to any
geometry math, drawing, or measurement.

## What a shaper now sees differently

- **The desktop top bar** (every screen) reads **SHAPER ASSISTANT** instead of SHAPER.
- **The phone top bar**, on the setup screen and on all six design screens, also reads
  **SHAPER ASSISTANT** — one size smaller than the desktop version (see D-01 below), so it still
  fits cleanly beside Save at a phone's narrowest width.
- **The printed order form** — both the front page's identity box and the back page's reference
  header — now reads **Shaper Assistant**.
- **Every browser tab** now reads Shaper Assistant: `Shaper Assistant — Surfboard Design` as the
  app-wide default, `Shaper Assistant — Start a New Board` on the setup screen, and
  `<Screen Name> — Shaper Assistant` on all six design/summary screens.
- **The project's own paperwork** — CLAUDE.md, `.claude/CLAUDE.md`, PROJECT.md, package.json and
  README.md — now names the product Shaper Assistant, and both live-address mentions
  (CLAUDE.md, PROJECT.md) point at `https://www.shaperassistant.com`, with the old
  `shaper-coral.vercel.app` address noted as a redirect so nobody thinks the old link died.

Nothing a shaper cuts foam to moved: no file under `lib/geometry/` was touched, and every
geometry test still passes untouched (2399 passed, 2 skipped, same as before this task).

## D-01 — the phone name, measured

At 360px wide with a coarse pointer on `/design/outline`, the phone top bar's inside width is
328px. Its right-hand cluster (Save + separator + Menu) is 149.0px wide in Save's widest face
(`Saving…`/`Saved`/`Not saved` all carry `min-w-20` = 80px, wider than the everyday filled Save
button) — that 149.0px figure is the honest worst case, not the everyday one. Against that,
`SHAPER ASSISTANT` at the desktop's own size (`text-sm`) would leave only 3.5px of clear air —
visually touching Save. Stepping the phone mark down one size, to `text-xs` (tracking and weight
unchanged), leaves **28.7px** of clear air instead. The desktop bar is untouched: at 1280px it
still has 325.8px to spare with the longer name.

The new `phone-layout.spec.ts` test asserts this gap directly (not inferred from "no overflow"):
since this browser suite always runs signed out (no real Clerk key), the Save control can only
ever render its everyday "Save" face in this test harness — the three `min-w-20` faces all
require a signed-in shaper. The test works around this by forcing the real Save element's
`min-width` to 80px (matching `min-w-20`) for one measurement, then restoring it, so the gap is
checked against Save's own widest face rather than the one face this suite can reach.

## D-02 — the printed identity box, measured

At the order form's own 880px design width, the identity box on page 1 has 272px of usable width
inside its border. `Shaper Assistant` at the box's unchanged 24.64px type is 270.2px wide, so it
breaks onto two centred lines — SHAPER over ASSISTANT — inside a box whose height doesn't change
and doesn't clip. This reads as a deliberate stacked logo, not an accident. On page 2, the same
name sits on one line (308.6px, in a header with 147.2px more room). If the founder later prefers
one line in the identity box too, the measured answer is 20px type (250.5px, one line in both
places) — not applied now, left as a note for a future decision.

## The five desktop reference pictures

TEMPLATE, ROCKER, RAILS, VOLUME and FINS were regenerated, since the name change is the one
legitimate reason to touch these normally-frozen pictures. Before regenerating, the diff was
inspected pixel-by-pixel between the old golden images and the new render:

| Screen | Changed-pixel box (diff > 15/765) |
|---|---|
| outline | x 87–289, y 34–614 |
| rocker | x 52–359, y 34–720 |
| rails | x 40–324, y 34–727 |
| volume | x 101–221, y 34–496 |
| fins | x 117–233, y 34–376 |

The name's own box (top bar, y 0–81) accounts for a consistent 610 differing pixels on every
screen — expected, since the shared nav renders identically everywhere. Below that, each screen
also showed a small number of additional differing pixels (36–429, depending on screen) around
slider-knob edges and callout-label text, extending further down the page than the name's own
box. Before regenerating, this was investigated rather than waved through:

- Two consecutive runs of this task's own (unmodified between runs) code produced byte-identical
  screenshots — ruling out per-run camera flakiness.
- The same class of extra, sub-threshold difference was found on unmodified `main` too (a cold
  first run showed a much larger, unrelated font-loading race that a warm re-run did not
  reproduce; a warm run on `main` passed cleanly under the config's own 100-pixel tolerance).
- Zoomed 3x crops of the extra-difference regions (slider knobs, callout text) were visually
  compared side by side and are indistinguishable to the eye — same text, same values, same
  knob position.
- No CSS or layout file touched by this task affects the desktop rendering of these regions.

This points to ordinary sub-pixel rendering drift (most likely a small font-hinting/Chromium
version difference since these golden images were last captured), already present but below the
pass threshold on `main`, not a content regression from this task. Nothing outside the name's own
area changed in a way visible to the eye on any of the five screens. After regeneration, the spec
passes clean against the five new pictures with no update flag, and the whole browser suite
(both phones and desktop, 166 passed) is green.

## Deliberately left alone, and why

- **Every mention of a shaper the person** — stays exactly as it reads today, everywhere. The
  person-sense guard (a grep over the whole diff for removed lines matching person-sense
  "shaper(s)" wording) printed nothing, both after Task 1+2 and again over the full accumulated
  diff.
- **The three lookalikes**: the order form's `Shaper Use Only` sub-box (order-form.tsx line ~699
  and its header comment), the order form's `Shaper Reference` back-page mark (order-form.tsx
  line ~720), and the `Thruster — Basic (Shaper Supply)` fin table in `lib/geometry/fins.ts` — all
  untouched, confirmed by a targeted grep that prints nothing.
- **Internal error-log prefixes** (`console.error("Shaper: …")` in app/page.tsx,
  design-store.tsx, save-button.tsx, and the units/print-instructions server helpers) — developer
  diagnostics no shaper ever sees, left alone.
- **Every `shaper-` browser storage key** (`shaper-units`, `shaper-theme`,
  `shaper-sign-in-banner-dismissed`, `shaper-print-rail-instructions`,
  `shaper-toolbar-tip-dismissed`) — renaming any of these would silently reset a real shaper's
  saved units preference and dismissed banners the next time they open the app, for no reason.
- **`app/globals.css` line 448's comment**, recording the historical fact that the founder picked
  the old wordmark's tracking as the app's one heading standard — still true as history, left
  as written.
- **README.md's existing Deployment section** (still says "Shaper is hosted on Vercel..." and
  names the `cpktoes/shaper` GitHub repository) — the plan scoped README's edit to a single new
  title line and one sentence, not a rewrite, so this pre-existing boilerplate section is
  untouched on purpose; it is covered by the "out of scope" list below.

## Out of scope — the founder's own follow-up, not in this repository

Three names live outside this codebase entirely and are unchanged by this task:

1. **The Vercel project name** — cosmetic, in Vercel's own dashboard.
2. **The GitHub repository name** (`cpktoes/shaper`) — renaming it is a GitHub setting, not a
   code change; README.md's Deployment section still names it as `cpktoes/shaper` today.
3. **The Clerk application's display name** — what shows on sign-in screens and in account
   emails, edited in Clerk's own dashboard, not in this repository.

## Deviations from Plan

None — plan executed exactly as written across all three tasks. The one investigative digression
(inspecting whether the desktop-screenshot diff extended beyond the name's own box before
regenerating) was itself required by Task 3's own action block, not a deviation from it.

## Verification

- `npx vitest run` — 53 test files, 2399 passed, 2 skipped, geometry suites untouched.
- `npx tsc --noEmit` — clean.
- `npm run lint` — 0 errors, 12 pre-existing warnings unrelated to this task.
- `PW_PORT=3127 npx playwright test e2e/phone-home.spec.ts e2e/phone-layout.spec.ts e2e/summary-preview.spec.ts --project=iphone --project=android` — all relevant cases passed.
- `PW_PORT=3127 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` — passes clean against the five regenerated pictures.
- `PW_PORT=3127 npm run test:e2e` — 166 passed, 158 skipped (project-gated), one incidental re-run
  needed: `summary-preview.spec.ts`'s "Rail Band Instructions sheet" case failed once on a
  pre-existing, self-documented localStorage-timing race (its own comment: "converges to the
  localStorage value a beat after the first paint"), then passed 4/4 on immediate retries — not
  caused by this task, since no order-form feature-toggle code was touched.
- Person-sense guard (`git diff` for removed person-sense "shaper(s)" wording): printed nothing.
- Lookalike guard (`Shaper Use Only` / `Shaper Reference` / `Shaper Supply` inside
  `components/summary/` and `lib/geometry/`): printed nothing changed.
- Exactly five PNGs changed, all under `e2e/desktop-baseline.spec.ts-snapshots/`, no other image
  anywhere in the repository.

## Self-Check: PASSED

- FOUND: components/site-nav.tsx, components/design/phone-top-bar.tsx,
  components/summary/order-form-primitives.tsx, components/summary/order-form.tsx,
  app/design/summary/order-form.css, app/layout.tsx, app/page.tsx, and the five other design-screen
  page.tsx files, package.json, README.md, CLAUDE.md, .claude/CLAUDE.md, .planning/PROJECT.md,
  e2e/phone-home.spec.ts, e2e/phone-layout.spec.ts, e2e/summary-preview.spec.ts,
  e2e/prod/slider-dots.spec.ts, and all five desktop-baseline PNGs.
- FOUND: commit a9460b0 (Task 1), cb89863 (Task 2), 5d0d4a3 (Task 3) — all present in `git log`.
