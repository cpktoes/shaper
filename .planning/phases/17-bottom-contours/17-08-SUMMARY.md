---
phase: 17-bottom-contours
plan: 08
subsystem: the BOTTOM screen (tracer) — route, panel, top view, section, DATA; eight screens everywhere
status: checkpoint
tags: [bottom, tracer, nav, tiles, step-nav, D-01, D-02, D-04, D-05, D-07, D-08, D-12, D-13, D-15, D-16, D-25, D-31, D-34, D-42]
requires:
  - "17-04: the store's bottom, bottomBoard, resolvedBottom, quotedVolumeLitresBeforeBottom"
  - "17-05: pickCut (D-42), keepStationsInOrder, bottomDataRows, bottomLitresLine"
  - "17-07: bottom-draw.ts (shade, lines, pencil, fins, frame, marks, section, gauges), bottom-tile-art.ts, formatBottomStation, bottomStationSlider"
provides:
  - "app/design/bottom/page.tsx — the eighth route (`Bottom Contours — Shaper Assistant`)"
  - "components/bottom/: BOTTOM_COPY, BottomEditor, BottomControls, BottomTopView, BottomSection, BottomData"
  - "design-store: pickBottomCut (pickCut in one setState, noteEdit(null)), updateBottomCut (keepStationsInOrder in the same step, one key per field); bottom in the undo snapshot"
  - "bottom.ts: storeCutStation, stationFromNearestTip, stringerAtCenter"
  - "imported-readout.ts: bottomImportedReadout"
  - "screen-tiles: ScreenTileKind `bottom`, screenTileLines' `bottom` (bottomTileLine)"
  - "globals.css: --outline-bottom-shade, --outline-pencil-line, --outline-cut-dash, --outline-trough-dash"
  - "DOM hooks: data-bottom-top-view, data-bottom-shade (one path per level inside), data-bottom-section, data-gauge, data-bottom-live, data-bottom-card, data-bottom-cut-echo, data-bottom-litres, data-bottom-depths, data-bottom-row"
affects: [17-09, 17-10, 17-11, 17-12, 17-14]
tech-stack:
  added: []
  patterns:
    - "Each drawing takes its own box's shape (viewBox 1000 wide, as tall as the box) and paints nothing until the box is measured, so server and first client paint agree; every stroke, dash and word is in screen dots (px), dashes through zoomDashToken"
    - "The section station is derived, never stored: the wide point, or the deepest of the cut just picked (it follows that cut's numbers), or a station set by hand (17-10)"
key-files:
  created:
    - app/design/bottom/page.tsx
    - components/bottom/bottom-copy.ts
    - components/bottom/bottom-editor.tsx
    - components/bottom/bottom-controls.tsx
    - components/bottom/bottom-top-view.tsx
    - components/bottom/bottom-section.tsx
    - components/bottom/bottom-data.tsx
    - e2e/bottom-screen.spec.ts
    - .planning/phases/17-bottom-contours/pictures/17-08-bottom-screen-first-look.png
    - .planning/phases/17-bottom-contours/pictures/17-08-pictures-source.tar.gz
  modified:
    - components/site-nav.tsx
    - components/design/screen-tiles.tsx
    - components/design/design-store.tsx
    - lib/geometry/bottom.ts
    - lib/geometry/screen-tiles.ts
    - lib/geometry/imported-readout.ts
    - app/globals.css
    - lib/screen-steps.ts
    - CLAUDE.md
    - .claude/skills/sketch-findings-shaper/SKILL.md
    - .claude/skills/sketch-findings-shaper/references/phone-chrome.md
    - "24 e2e specs and helpers (see Task 2), the six desktop reference pictures"
decisions:
  - "BOTTOM's tracer draws the section with no live cut, so `bottomSection` leaves no room for the ruler under it; 17-10 draws the ruler and passes the live cut"
  - "screen-tiles.ts imports bottomTileLine from bottom-tile-art.ts, which imports outlineTileArt back: a cycle on purpose, safe because neither module calls the other while loading"
  - "The INPUTS card's Thickness is the board's planed centre thickness (effectiveRails.center.boardThickness) as a dim, VOLUME's own reading (D-25)"
metrics:
  duration: "about 90 minutes (22:58 to 00:27 local), of which about 50 minutes was the three-device browser batch and 5.4 minutes the full unit suite"
  completed: 2026-11-09
actuals:
  tokens: 43800
  tasks: 2
  commits: 3
---

# Phase 17 Plan 08: BOTTOM on the screen, end to end on one cut — Summary

BOTTOM is now the eighth design screen, third in the top row between ROCKER and RAILS. A shaper opens it, picks
CENTER → Deep Single Concave, and sees the cut in the panel, from below, across the board at its deepest, and in
DATA, where the litres are VOLUME's own. Every list and test in the app that counted seven screens now counts eight.

## What changes for the founder

- **The top row and the menu.** `TEMPLATE · ROCKER · BOTTOM · RAILS · VOLUME · FINS · SUMMARY · 3D`. Below 1280 wide
  the links sit a little closer together (6 dots apart below 1024, 12 to 1279; 20 from 1280 as before) so all eight
  fit at 820. On a phone the ☰ sheet holds eight tiles, four over four upright and one row of eight held sideways.
- **Back and Next.** ROCKER's Next reads `Bottom`; BOTTOM's pair reads `Rocker` / `Rails`; RAILS' Back reads `Bottom`.
- **The panel** wears RAILS' dress: `BOTTOM CONTOURS`, `Map, measure and cut the bottom`, INPUTS with the board's
  length, width and planed thickness (`From TEMPLATE & ROCKER`, foot `Thickness is the planed number. The contour
  comes out of it.`), then NOSE, CENTER and TAIL. Each section has a `Cut` menu of its six names and echoes the cut's
  name in its heading. A flat section says `Nothing is cut in this section.` A single concave shows Off Rail, Start,
  Deepest At, End, Depth and Smoothness. The stations run nose (left) to tail (right) and read from the cut's nearest
  tip; a Center or Tail cut's track fills from the dot to the tail. Picking a name is one Undo; dragging Start past
  Deepest pushes Deepest and End along in the same step.
- **From below.** Nose left. The shade darkens one step per 1/32" with a faint line every 1/16"; the live cut's edge
  in ink; FINS' own fin lines; `WIDE POINT · 36"` and `FRONT FINS · 11"` above the board; the live cut's
  `START 58"`, `DEEPEST 23 1/2"`, `END 4"` below; the cutting line with its grab dot. (The drag is 17-10's.)
- **Across.** Picking a cut moves the section to its deepest. The slab at Height ×4 on the dashed straightedge, with
  the gap at the stringer (`1/4" at the stringer` on the Shortboard's Deep Single), `PLANED BOTTOM` in a box 625 dots
  or wider.
- **DATA.** `Foam off 0.74 L · 28.87 L now, 29.61 L before contours · the stringer finishes 2 1/16" at the center,
  planed 2 1/4" · contours only take foam away.` (Shortboard, Deep Single.) Then `Depths under a straightedge`: Tail,
  every 6", Nose tip — Width, Deepest cut, Rail lift, Stringer left — the wide point's and front fins' rows in full
  ink, `—` where nothing is cut.
- **The BOTTOM tile** is TEMPLATE's board lying down with its cutting line, `All flat`; with the Deep Single it shows
  the shade and reads `1 cut`.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | The tracer: route, nav link and tile, the store's two actions, panel, both drawings, DATA | 1d1e1ce0 | app/design/bottom/page.tsx, components/bottom/* (6), site-nav.tsx, screen-tiles.tsx, design-store.tsx (+test), globals.css, bottom.ts (+test), screen-tiles.ts (+test), imported-readout.ts (+test), board-lock-scope.test.ts, e2e/bottom-screen.spec.ts |
| 2 | Eight screens everywhere: specs, words, the six pictures | 0f228868 | 24 e2e files, the six snapshots, lib/screen-steps.ts (+test), phone-menu.tsx, phone-top-bar.tsx, step-nav.tsx, board-lock-scope.tsx, not-found.tsx, CLAUDE.md, the skill's SKILL.md and phone-chrome.md |
| 3 | The founder's look | checkpoint (this summary and the picture) | pictures/17-08-bottom-screen-first-look.png, pictures/17-08-pictures-source.tar.gz |

## Verification

- `npx tsc --noEmit` exits 0 (after `npx next typegen`). `npm run lint`: 0 errors, the same unrelated
  `import-designs-action.test.ts` warning.
- Full unit suite (after Task 1): 11,336 passed, 2 skipped, exit 0, 324 s. `lib/screen-steps.test.ts` 12 passed after
  Task 2. `board-lock-scope.test.ts`, `bottom-source.test.ts`, `screen-tiles.test.ts`, `imported-readout.test.ts`,
  `design-store.test.ts` all pass.
- `e2e/bottom-screen.spec.ts --project=desktop`: 2 passed, exit 0 (50 s). It reads every figure off the page: DATA's
  `Foam off` is the printed `before` less `now`, `now` equals VOLUME's Estimated Volume, and one Undo returns Flat Center.
- **The eight-count batch** (the 20 specs of the plan's verify list, three projects, `PW_PORT=3308`): 858 tests —
  545 passed, 305 skipped, 8 failed, 50.4 min.
  - Two failures were real and fixed: `step-nav.spec.ts:87`'s hand walk to SUMMARY skipped BOTTOM (failed on all three
    projects) — BOTTOM added to the walk.
  - Six were load: page-load or tap timeouts (`board-lock-screens` x-3d iPhone, `phone-chrome` TEMPLATE at 1180×820
    iPhone, `phone-screen-tiles` 844×390 iPhone — a preset card click that never navigated, `step-nav:60` iPhone,
    `board-name-band` d1 desktop — the practice rack never loaded).
  - Re-run alone: `step-nav.spec.ts` (all), `board-lock-screens:851`, `phone-chrome:1186`, `phone-screen-tiles:178`,
    `board-name-band:481` on three projects: 40 passed, 25 skipped, 1 failed (`step-nav:176` iPhone, load), which then
    passed twice with `--repeat-each=2` (2 passed, 35.7 s).
  - `phone-rails.spec.ts`'s "NOSE, CENTER, TAIL each show only their own group": 2 passed (it reads RAILS' Back).
- **Measured:** the sideways tiles were whole and over the 92 floor in the batch's passing runs (the 863×360 Android
  and 844×340 iPhone cases passed; 844×390 passed on its re-run). Upright four over four passed on both phones.
- `desktop-baseline.spec.ts --project=desktop`: 6 passed after the re-record (20 s).
- `npx playwright test -c playwright.prod.config.ts --list e2e/prod/phone-controls-clear-undo.spec.ts`: 6 tests listed.
  Not run here (no build in a worktree) — the orchestrator runs `npm run test:e2e:prod` after the merge.

### The six desktop pictures (C6)

Compared old against new pixel by pixel before re-recording (diff images in the tarball's `baseline/` folder, with
the old and new pictures):

| Picture | Changed pixels' box | Below the top row |
|---|---|---|
| TEMPLATE | x 402–644, y 32–50 | nothing |
| ROCKER | x 402–645, y 32–50 | nothing (the first run showed 52 pixels at 1–2 of 255 along card edges; the recorded picture has none) |
| RAILS, VOLUME, FINS | x 402–644, y 32–43 | nothing |
| 3D | x 40–644, y 32–797 | 42 pixels at most 2 of 255 along the sidebar card's rounded edges — anti-aliasing, not a move |

At 1280 the gap stays 20, so only TEMPLATE and ROCKER shift left to make room for BOTTOM. SHA-256 old → new:
TEMPLATE c3c675b2 → 3db79bc8, ROCKER 407cbee1 → e75e0c14, RAILS b853ef2a → 47559ff4, VOLUME d3377877 → 0a95a0e4,
FINS f915b9db → aa0d5a38, 3D ed28a40d → 604965f1. Recorded under webpack on 3308; the orchestrator re-checks under
Turbopack from the main checkout.

### The re-sweep (`seven`, `toHaveLength(7)`, `toHaveCount(7)`, `grid-cols-7`, `7 screens|tiles`)

- **Moved to eight:** every screen count in `e2e/helpers/screens.ts` (`expectSevenTilesInMenu` renamed
  `expectEightTilesInMenu`), `phone-screen-tiles`, `phone-sideways-top-bar` (its two helpers renamed `…Eight…`),
  `phone-layout`, `phone-home`, `phone-trip`, `phone-screens`, `error-pages`, `legal-pages`, `contact`, `app-settings`,
  `touch-sizing`, `site-nav-width`, `e2e/prod/phone-controls-clear-undo`, `step-nav`; the comments in `site-nav.tsx`,
  `screen-tiles.tsx`, `phone-menu.tsx`, `phone-top-bar.tsx`, `step-nav.tsx`, `board-lock-scope.tsx`, `app/not-found.tsx`,
  `lib/geometry/screen-tiles.ts`, `lib/screen-steps.ts`; CLAUDE.md's Layout section and design-screens list; the
  skill's SKILL.md row and phone-chrome decisions 1–3.
- **Left alone (not a screen count):** the seven fit and tip defaults (`fit-defaults*`, `app-settings-dialog.tsx`,
  `lib/db/queries.ts`, `lib/fit-defaults-preference*`, `app/actions/fit-defaults.ts`, `e2e/fit-defaults.spec.ts`), the
  order form's seven dimension cells (CLAUDE.md:152, `dimension-fit*`, `build-template-pdf.ts`, `build-strip-pdf.ts`),
  the seven design fields (`app/design/actions.ts`), seven button instances (`toolbar-button*`, `rocker-editor.tsx`),
  the Clerk webhook's seven bodies, the seven fin setups, the template pin's seven functions, seven nudges
  (`volume.ts`), seven boards (`wings.test.ts`), seven paper widths (`summary-rail-*`), seven line kinds
  (`rail-section-plot.tsx`), seven custom-rocker sliders, seven feet (`rack-source.test.ts`), a touch-drag's seven
  steps, the outline viewer's seven handles, seven pixels in an old re-record note, and 17-07's "seven levels deep".

## Deviations from Plan

1. **[Rule 1 — Bug] Two hand walks the sweep could not find.** `step-nav.spec.ts:87` walks by addresses
   (`/design/rocker`, `/design/rails`, …) and failed on all three projects; `phone-rails.spec.ts:850` read RAILS' Back
   as `Rocker`. BOTTOM added to the first, `Bottom` in the second (phone-rails is outside `files_modified`).
2. **[Rule 1 — Rule 1 compliance] Three small pure helpers in `lib/geometry/bottom.ts`** (outside `files_modified`), so
   no component converts a number: `storeCutStation` (a slider's station stored in the cut's own form — from the nose,
   from the fins, or from the tail), `stationFromNearestTip` (the label's reading), `stringerAtCenter` (DATA's first
   line's stringer at half the length). Tested in `bottom.test.ts` (5 new tests).
3. **`design-store.test.ts`** (outside `files_modified`) gained three source rules: the bottom in the undo snapshot,
   `pickBottomCut` through `pickCut` in one `setState` with `noteEdit(null)`, `updateBottomCut`'s one key and
   `keepStationsInOrder` in the same step.
4. **`DesignHistorySnapshot` gains `bottom` by type** (`… & { bottom: BoardBottom }`): `DesignSnapshotFields` (saving)
   is 17-12's, so the undo snapshot carries the bottom ahead of the save.
5. **Comment-only edits outside the list:** `phone-top-bar.tsx`, `step-nav.tsx`, `board-lock-scope.tsx`,
   `app/not-found.tsx` said "seven screens".
6. **Extra eight-count coverage beyond the plan:** `phone-chrome`'s screen list (renamed `ALL_DRAWING_SCREENS`) and
   `phone-screens`' never-scroll-sideways list include BOTTOM; `board-name-band`'s TAPPABLE list includes it.
7. **Not in this plan's drawings, by the plan's own split:** the Height buttons, `Section at`, the drag, the ruler and
   the finished-rail tick (17-10), the other cuts' rows and channels (17-09), GUIDE (17-11), the phone stack (17-14).
   The section is drawn with no live cut so `bottomSection` reserves no ruler room until 17-10.
8. **Both drawings read their own box with `useSvgClientSize`** (the plan named `useSvgFitScale` for the top view's
   strokes). The viewBox is built from the measured box, so `px = 1000 / width` is exactly `1 / fitScale`; nothing reads
   the device.
9. **The commit trailer** is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, as ruling 6 gives it.

## Known Stubs

None that stop the plan's goal. The panel shows rows for a single concave only; a vee, belly or double shows its Cut
menu and heading with no rows until 17-09, as the plan splits it.

## Threat Flags

None. No endpoint, input, file path or schema; the board's name reaches the drawings' names as React text only.
T-17-16: both actions return first on a locked board, the Cut menus are `disabled={locked}`, and
`board-lock-scope.test.ts` lists `bottom-controls.tsx`. T-17-12: the sideways tile floor 92 measured on both phones.
T-17-11: one shade path per level; the tracer spec reads the path count.

## Founder's look: Pending

Picture: `.planning/phases/17-bottom-contours/pictures/17-08-bottom-screen-first-look.png` (sources, the six
before/after/diff pictures and the raw shots in `17-08-pictures-source.tar.gz`). Taken from the worktree's dev
server at deviceScaleFactor 2.

1. BOTTOM sits between ROCKER and RAILS in the top row (1280 and 820) and in the ☰ sheet; ROCKER's Next reads
   `Bottom →`.
2. The panel is RAILS' dress: the board's size, then NOSE, CENTER and TAIL, each with its Cut picker; picking Deep
   Single Concave fills its numbers.
3. From below the concave shades darkest at its deepest with a line every 1/16"; the section shows the gap under the
   straightedge at the stringer.
4. DATA's first line reads VOLUME's own litres; the depths table every 6".
5. The BOTTOM tile: the board and its cutting line, `All flat` when nothing is cut, `1 cut` with the Deep Single. The
   tile's picture and the panel's title are mine to propose — yes or change.

Awaiting "approved", or changes.
