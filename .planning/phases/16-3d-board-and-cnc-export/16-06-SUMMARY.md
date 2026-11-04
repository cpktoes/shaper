---
phase: 16-3d-board-and-cnc-export
plan: 06
subsystem: 3D screen (route, scene, view maths)
status: complete
tags: [3d, three.js, webgl, tracer, D-01, D-02, D-05, D-07, D-09, D-10, D-11, D-17, D-18, D-28, D-30]
requires:
  - "16-03: buildBoardSurface, renderMesh, stringerLines, BoardSurface.triangleCount"
  - "16-01: designCrossSectionInput (the litres' own input)"
  - "16-02: the tail's Hard Edge Blends From / Ends At on the rail spec (D-30), read through effectiveRails"
provides:
  - "/design/3d route (not yet in NAV_LINKS or the tiles; 16-08)"
  - "ThreeDScreen, ThreeDControls (a children slot for the Hard Edge group, SHOW, VIEW, EXPORT)"
  - "mountBoardScene, BoardSceneHandle, BoardSceneInput, SceneColours, BoardSceneState, CONTEXT_RESTORE_WAIT_MS"
  - "THREE_D_COPY (every word of the UI-SPEC's copywriting for this screen)"
  - "view-3d: Quat, quatMultiply, quatFromAxisAngle, rotateVec, quatNormalize, BOARD_TO_ROOM, REST_TURN, ROOM_CAMERA, FRAME_FILL, roomCameraAxes, Frame, frameAtOne, framePointsOf"
  - "CSS tokens --surf-foam, --surf-on-foam, --surf-3d-ground in all six token blocks; ramp values --ramp-<id>-3d-ground in all four ramps"
  - "board-scene: RoomLighting, LIGHTING_CANDIDATES (firstLook, A, B, C), ROOM_LIGHTING (light → C, dark → firstLook); SceneColours.scheme"
  - "e2e helper canvas-pixels: decodePng, countUnlike, countDifferent, hexToRgb"
  - "DOM hooks: data-board-3d, data-board-state (loading | ready | lost | no-webgl | cant-build | didnt-load), data-frames, data-triangles, data-canvas-message, data-three-d-controls"
affects: [16-07, 16-08, 16-09, 16-10, 16-11, 16-12]
tech-stack:
  added:
    - "three 0.186.1 (exact, dependency)"
    - "@types/three 0.186.0 (exact, devDependency)"
  patterns:
    - "three.js only in components/3d/board-scene.ts, reached by import() from the screen's effect; a source-contract test and a production-build spec enforce it"
    - "The board turns under a fixed camera and fixed lights: the group's quaternion is turn × BOARD_TO_ROOM, its place in front of the camera is frameAtOne's"
    - "Render on demand, one requestAnimationFrame per change, frames counted on the host for the tests"
    - "Scene colours read from the page's tokens through a 1×1 2D canvas, so any CSS colour (color-mix included) becomes #rrggbb"
    - "The lighting is picked by the theme's own color-scheme (light or dark); a dev-only window.__shaper3dLighting names a candidate for picture scripts, never read by a production build"
key-files:
  created:
    - app/design/3d/page.tsx
    - components/3d/three-d-copy.ts
    - components/3d/three-d-screen.tsx
    - components/3d/three-d-controls.tsx
    - components/3d/board-scene.ts
    - components/3d/three-source.test.ts
    - lib/geometry/view-3d.ts
    - lib/geometry/view-3d.test.ts
    - e2e/three-d-screen.spec.ts
    - e2e/helpers/canvas-pixels.ts
    - e2e/prod/three-d.spec.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-06-3d-screen-first-look.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-06-pictures-source.tar.gz
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-06-lighting-and-ground-candidates.png
  modified:
    - package.json
    - package-lock.json
    - app/globals.css
decisions:
  - "First look: the overhead light at 0.2 of the key, not the contract's starting 0.45 (UI-SPEC open item 1). Second look (the founder: stronger shadowing, side lights only): the light themes take candidate C (near tube 1.0, far tube 0.45, overhead 0, fill 0.04, key 2.9, exposure 1); the dark themes keep the first look's 1.0 / 0.7 / 0.2 / 0.2"
  - "Second look: the light themes draw the 3D board on a darker ground, --surf-3d-ground #aeaca5 (the canvas warm grey 22% darker); Slate and Phosphor keep their canvas colour. The canvas messages stay on --surf-canvas, because their muted line would fall to 2.76:1 on the darker ground"
  - "No one-dot outline: on the darker ground the edge reads all round (in Chalk the far rail is 59–77 levels under the ground, the near rail 34–56 over it)"
  - "The scene's colours are read when the drawing code arrives, not in the mount effect. On the first load the screen's effect runs before the theme provider's, while the theme class is briefly off the page"
  - "The canvas host carries a sixth state, lost (a drawing context gone for a moment), beside the plan's five; the board and view are kept and come back with the context"
  - "frameAtOne frames by the projected points themselves (a subsampled set plus each axis's extremes, framePointsOf), centring by bisection and refining the distance until the tighter direction is 0.85"
metrics:
  duration: "about 55 minutes"
  completed: 2026-11-04
estimate:
  tokens: 120000
actuals:
  tokens: 19800
  tasks: 2
  commits: 6
---

# Phase 16 Plan 06: The 3D screen (the phase's tracer) Summary

A seventh design screen, at `/design/3d`, draws the board you designed as a solid. It's white raw foam under the
shaping room's fixed lights, with a dark stringer down the middle, built from the very cross-sections VOLUME adds up
for the litres. three.js is fetched on that screen alone.

## Second look (2026-11-04): stronger shadows, side tubes only, a darker ground

The founder at the first look: *"The shadowing can be stronger. Maybe no overhead light just the side lights. Also the
dark themes look good, the light themes may need a darker background to make the foam pop."*

- **In Daylight and Chalk the board is lit by the two low rail tubes alone.** The overhead is off, the fill is down
  to almost nothing, and the far tube is softer. The deck's dome now shows a clear shadow side: about 15 levels
  from its far half to its near half, against 5 at the first look. The rail's roll goes dark before it catches the
  near tube.
- **Behind the board those themes use a darker warm grey, `#aeaca5`**, 22% under the canvas grey the rest of the
  app uses. The white foam stands off it, and both edges read all the way round with no outline. In Chalk the far
  rail is 59–77 levels darker than the ground along the whole board, and the near rail 34–56 levels lighter.
- **Slate and Phosphor are exactly as approved:** the same lights and ground, checked pixel for pixel (0 pixels
  differ). The lights are shared by every theme, and C would have turned the dark themes' deck from near-white to a
  mid grey, so a theme's own light-or-dark setting picks which lighting it gets.
- **The "can't draw" messages stay on the lighter canvas grey.** On the darker ground their small second line would
  be too faint to read comfortably (2.76:1 against the 4.5:1 the app holds text to).
- **Pictures:**
  - `pictures/16-06-lighting-and-ground-candidates.png`: every candidate on both grounds, plus Slate under each.
  - `pictures/16-06-3d-screen-first-look.png`: re-shot under the new default.

The candidates (strengths are shares of one key level, 2.9; the Fish in Daylight, sampled down its middle):

| Candidate | Near tube / far tube / overhead / fill | Far edge vs ground 1 (#aeaca5) | vs ground 2 (#9d9b95) | Dome (far half → near half) | Stringer on deck | Slate deck by the stringer |
|---|---|---|---|---|---|---|
| First look | 1.0 / 0.7 / 0.2 / 0.2 | (on #dfdcd3: −29) | — | 184 → 189 | 114 on 185 | about 180 |
| A | 1.0 / 0.7 / 0 / 0.2 | −5 (nearly lost) | +12 | 155 → 160 | 100 on 156 | — |
| B | 1.0 / 0.7 / 0 / 0.08 | −29 | −12 | 128 → 135 | 87 on 130 | about 130 |
| **C (shipped, light themes)** | 1.0 / 0.45 / 0 / 0.04 | **−64** | −50 | 107 → 122 | 77 on 112 | about 100 (so the dark themes keep the first look) |

- **Ground 1 (`#aeaca5`) shipped over ground 2 (`#9d9b95`).** With C, ground 2 brightens the near-rail edge
  further, but it brings the far edge closer to the ground (−50). Ground 1 balances the two edges (−64 and +56).
- **There is no hemisphere or floor-bounce light in this room** (that was the mock-up's), so C lowers the far tube
  instead, the other light on the shadow side.
- **How the candidates were shot without editing the app between shots.** The settings sit in a named table
  (`LIGHTING_CANDIDATES`), and on a development server a picture script can name one through
  `window.__shaper3dLighting`. A production build never reads it.

Tests for this change:
- Browser case 2 now measures against `--surf-3d-ground`.
- Case 3 checks a message sits on `--surf-canvas`.
- New case 11 checks Daylight's board ground is the darker token.
- Case 10, the Slate ground, still fails on the old colour-reading timing (148 levels off) and passes now.

## What changes for the founder (first look)

- **There's a 3D screen, reachable by its address for now.** `/design/3d` isn't in the top row or the ☰ tiles yet
  (that's 16-08). It opens with the board lying flat, deck up, nose to the left, seen from 50° above, so you see
  most of the deck and the near rail. The board fills 85% of the window. The panel says `3D BOARD` and *Spin it
  under shaping-room lights, then export it for a CNC.* Nothing else is in the panel yet. Turning (16-07), zoom
  (16-09), fins (16-10), the blank and stripes (16-11) and the export (16-12) come next.
- **It's VOLUME's board, not a look-alike.** The 3D shape is built from exactly what the litres add up, so the
  two can't disagree. Change anything on another screen and 3D draws the new board. That includes the tail's
  Hard Edge Ends At on RAILS: a browser test moves it there and sees the 3D board change.
- **The room.** The camera and the four lights never move: two low tubes along the rails, a soft overhead and a
  fill. When turning arrives, the highlights will slide across the foam rather than ride along with it. The foam
  is white in every theme (your ruling). The stringer is 3 mm wide but never thinner than one screen dot.
- **The lights were tuned from pictures.** The contract started the overhead light at 0.45 of the rail light. At
  that strength the deck came out the same tone as the light themes' warm-grey ground, and the far rail's edge
  vanished. At 0.2 the deck sits a clear tone under the ground and the near rail a tone over it, as in the
  mock-up you called right.
- **When it can't draw, it says so plainly,** in two short lines on the canvas's ground:
  - `This browser can't draw the board in 3D.` / `Export for CNC… still works — the files don't need the drawing.`
  - `This board can't be drawn in 3D.` / `Check its outline on TEMPLATE and its rocker on ROCKER.`
  - `The 3D view didn't load.` / `Check your connection, then reload the page.`
- **A phone backgrounding the tab doesn't lose the board.** If the display is taken away for a moment, the board
  comes back as it was. If it isn't back within 5 seconds, the screen says it can't draw.
- **No other screen gets slower.** The 3D code (about 136 KB compressed) is fetched only on this screen, and two
  checks keep it that way.
- **Nothing is saved or announced.** Nothing on this screen is stored, and nothing anywhere mentions it.

## Installed

- `three` **0.186.1**, exact pin (`dependencies`), and `@types/three` **0.186.0**, exact pin (`devDependencies`),
  both installed with `--save-exact` into an APFS clone of the main checkout's `node_modules`. `npm view
  three@0.186.1 scripts` lists no `preinstall`, `install` or `postinstall` (only dev/build/test/lint scripts).
- `@types/three` brings five type-only packages into the lockfile: `@dimforge/rapier3d-compat`,
  `@tweenjs/tween.js`, `@types/stats.js`, `@types/webxr`, `meshoptimizer`. `three` itself has no dependencies.
- **The orchestrator runs `npm install` in the main checkout after the merge.** The worktree's cloned
  `node_modules` is left in place.

## Bundle facts (measured)

- **The scene's code, bundled alone** (`esbuild components/3d/board-scene.ts --bundle --minify --format=esm`):
  542,066 B minified, **135,936 B gzip -9**. That's three.js plus `view-3d.ts`, against research's 133,875 gz for a
  three-only scene. The minified text keeps the literal `THREE.WebGLRenderer` that the specs use to spot the chunk.
- **The development server** (webpack mode, `IS_WEBPACK_TEST=1`) splits the scene into its own chunk,
  `_app-pages-browser_components_3d_board-scene_ts`. When a test blocks that one request, the screen shows the
  didn't-load message, which proves it's the only route into three.
- **On every screen but 3D, no script carries the drawing code.** Checked by `e2e/prod/three-d.spec.ts` (written
  for the production build). I couldn't build here, so I ran its logic against the dev server with a scratch
  config: 6/6 passed. The production run is the orchestrator's after the merge (`npm run test:e2e:prod`). I measured
  no production chunk sizes or route sizes myself.

## Open item 1: the board's edge in Daylight and Chalk (what I saw at the first look; the second look supersedes it)

Daylight and Chalk share the warm-grey ground (#dfdcd3), so they look the same. Sampled down the Fish's middle at
1280 × 800: ground (223, 220, 211); deck (190–197, 183–189, 175–181); the near rail's lit band (242–243, 233–234,
223–224).

- **The top edge (the far rail) reads clearly all along.** The deck is about 26 levels darker than the ground.
- **The bottom edge (the near rail) reads by its cream band,** about 20 levels lighter than the ground. It's
  continuous, but it's the softer of the two edges, softest under the nose and at the tail's lower point.
- **A small artefact:** a few faint dark specks along the lower edge, at grazing angles (one-pixel antialiasing
  fringe).
- **My judgement:** the edge reads all round without the fallback, so I didn't add it. The contract's pre-committed
  fix, a one-dot outline in `--outline-ink` in the two light themes only, is ready to add on the founder's word.
- **The dark themes are a strong silhouette:** near-white foam on near-black (Slate) and on dark green (Phosphor).

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (tracer) | The board, lit, on its own 3D screen; three.js on this route only | 75f6b7f9 | package.json, package-lock.json, app/globals.css, app/design/3d/page.tsx, components/3d/{three-d-copy.ts, three-d-screen.tsx, three-d-controls.tsx, board-scene.ts}, lib/geometry/view-3d.ts (+test), e2e/three-d-screen.spec.ts |
| 2 | Honest messages, StrictMode and lost contexts, phone sizing, screen-reader name, three kept on this route | da1f80af | components/3d/three-d-screen.tsx, components/3d/three-source.test.ts, e2e/three-d-screen.spec.ts, e2e/helpers/canvas-pixels.ts, e2e/prod/three-d.spec.ts |
| 2 (fix) | Dark themes drew on Daylight's ground | 83c454f6 | components/3d/three-d-screen.tsx, e2e/three-d-screen.spec.ts |
| 3 | The founder's first look (pictures) — checkpoint | 4d93a307 | pictures/16-06-3d-screen-first-look.png, pictures/16-06-pictures-source.tar.gz |
| 3 (second look) | Stronger shadows, side tubes only, a darker ground in the light themes | 31bcc2be | app/globals.css, components/3d/board-scene.ts, components/3d/three-d-screen.tsx, e2e/three-d-screen.spec.ts, the three pictures |

Tracer gate: after Task 1, `e2e/three-d-screen.spec.ts` case 1 passed on the desktop project. It was re-run after
the lighting change and passed again (`ready`, at least one frame, triangles > 0, the page title) before any Task 2
work. As in 16-03, the interactive tracer checkpoint was folded into the orchestrator's single checkpoint at Task 3.

## Verification

- `npx vitest run lib/geometry/view-3d.test.ts components/3d`: 15 passed (11 + 4).
  - Quaternion identities.
  - `BOARD_TO_ROOM` maps nose → room −X, deck → +Y, near rail → +Z, and is a proper rotation.
  - `frameAtOne` on the Shortboard at aspects 1.6 and 0.6, and on a turned board: the projected box fills 0.85 of
    the tighter direction (±1e-4), centred (±1e-4). Every figure comes from a camera the test builds itself from
    `ROOM_CAMERA`.
- **The source contract** passes. It also fails, as it should, when a scratch file under `lib/` imports three
  (checked, then removed).
- `npm test`: 168 files, 7190 passed, 2 skipped. `rack-stand-in` and `blank-fit` timed out under the shared
  machine's load; run alone, all 120 of their tests pass.
- `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors (the one warning in `lib/db/import-designs-action.test.ts`
  was there before this plan).
- **After the second look:**
  - `npm test`: 7191 passed. `rack-stand-in` timed out under load and passes alone, as does `lib/theme.test.ts`.
  - tsc: 0 errors. lint: 0 errors.
  - The 3D spec: **28 passed, 5 skipped** on all three projects, the new case 11 included.
- **At the first look:** `PW_PORT=3206 IS_WEBPACK_TEST=1 npx playwright test e2e/three-d-screen.spec.ts`: **25 passed, 5 skipped** (the
  skips are by design) on iphone, android and desktop. The ten cases:
  1. The tracer.
  2. More than 2% of the canvas is unlike its ground.
  3. No drawing context → the no-WebGL message, no canvas.
  4. The scene chunk aborted → the didn't-load message and its `console.error`.
  5. A 40" board → the can't-build message and its `console.error`.
  6. Context lost then restored → `ready` again and more frames; lost and never restored → the no-WebGL message
     after 5 s.
  7. Upright phones: the drawing column ≤ 66dvh and the canvas ≥ 66dvh − 32.
  8. Named `Untitled in 3D`, role `application`, role description `3D view`, focusable, canvas `aria-hidden`.
  9. Hard Edge Ends At moved on RAILS → the 3D picture changes (desktop).
  10. In Slate the canvas's corner is Slate's ground. It fails on the pre-fix code (197 levels off) and passes now.
- `PW_PORT=3206 npx playwright test -c playwright.prod.config.ts --list e2e/prod/three-d.spec.ts`: 6 tests listed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The canvas messages showed on the card's white, not on the canvas's ground**
- **Found during:** Task 2, from the first message pictures.
- **Issue:** the host was hidden while a message showed, so the TabbedPanel card's panel colour showed through.
  It also took the canvas's spoken name out of the accessibility tree.
- **Fix:** the host stays as it is. The message layer has its own `bg-surf-canvas`, covering anything a lost
  context left behind.
- **Files modified:** components/3d/three-d-screen.tsx
- **Commit:** da1f80af

**2. [Rule 1 - Bug] Slate and Phosphor drew the board on Daylight's light ground with Daylight's foam**
- **Found during:** Task 3, from the composed pictures.
- **Issue:** the colours were read in the mount effect, which on the first load runs before the theme provider's
  effect, while the page's theme class is briefly missing.
- **Fix:** the colours are read once the drawing code arrives, after every effect of that pass has run. Browser
  case 10 guards it (fails before, passes after).
- **Files modified:** components/3d/three-d-screen.tsx, e2e/three-d-screen.spec.ts
- **Commit:** 83c454f6

**3. [Tuning, sanctioned by UI-SPEC open item 1] The overhead light at 0.2 of the key, not 0.45**
- **Found during:** Task 1, from the first picture.
- At 0.45 the deck matched the light themes' ground and the far rail's edge was lost. The rail and fill ratios
  (1.0 / 0.7 / 0.2) are unchanged. Key 2.9, Khronos neutral tone mapping, exposure 1.
- **Files modified:** components/3d/board-scene.ts
- **Commit:** 75f6b7f9

### Other notes

1. **StepNav is not added inside `ThreeDControls`.** The plan says the panel ends with `StepNav`, but
   `DesignScreenShell` already puts `StepNav` and the site footer after `controls` (design-screen-shell.tsx:285).
   A second one would show twice. Until 16-08 adds 3D to `NAV_LINKS`, `StepNav` finds no neighbours on this route
   and draws nothing, so the pictures show no Back button.
2. **The single read-only tab is a label, not a `tab` role** (TabbedPanel's own rule for one tab). Case 1 finds
   `3D` as text in the drawing column instead.
3. **A sixth `data-board-state`, `lost`,** is reported while a drawing context is briefly gone. The plan said to
   extend the states as needed.
4. **Lost-context handling was built in Task 1's `board-scene.ts`.** Task 2 tested it but didn't change the
   scene file.
5. **`setTurn` changes only the orientation.** It doesn't re-frame. Re-framing happens on a new board or a resize,
   and 16-07's views can call it when they re-frame at 1x.
6. **A thrown error inside `mountBoardScene` after the context is made** (none is known) would show the
   didn't-load message, because the import's `catch` sees it.

## The panel's column, ready for D-30 (orchestrator ruling 6)

`ThreeDControls` is the sidebars' `flex flex-col gap-5` column: the title block, then a `children` slot. 16-07 can
pass a `Hard Edge` group (two slider rows bound to the store's `setTailHardEdgeBlendsFrom` / `EndsAt` values,
dimmed while the tail's Hard Edge is off) as the first child. SHOW, VIEW and EXPORT follow it as further children,
each `flex flex-col gap-2` opening with its ruled heading. Nothing in the column needs reshaping. The 3D board
already redraws from `effectiveRails` whenever either value changes (browser case 9).

## Follow-up for the orchestrator (outside this plan's files)

- **The Colour Bench needs re-syncing.** The second look added one ramp value per theme (`--ramp-<id>-3d-ground`).
  The bench at `.planning/sketches/themes/colour-bench.html` seeds from a hand-kept copy of the ramps and should
  learn it, by the project's rule for any ramp change. That file is outside 16-06's `files_modified`, so it was
  left alone.

## Known Stubs

None that block this plan's goal. The panel holds only its title, and there are no fins, blank, toolbar or export
yet. Each is a later plan in this phase (16-07 to 16-12), as the plan says. Before the scene's first frame the
canvas shows its ground alone; the loading picture is 16-11's.

## Threat Flags

None beyond the plan's threat model:
- **T-16-SC:** exact pins, lockfile committed, no install scripts.
- **T-16-13:** the board name reaches only a React attribute.
- **T-16-14:** a lost or refused context ends in the message, never a throw.
- **T-16-15:** one importer, `import()` only, the source test and the production spec.

## Self-Check: PASSED

- FOUND: every file in `key-files.created`, and the three modified files.
- FOUND commits: 75f6b7f9, da1f80af, 83c454f6, 4d93a307, 31bcc2be.
- FOUND: pictures/16-06-lighting-and-ground-candidates.png. The source archive now also holds candidates.spec.ts
  and compose-candidates.js.
- No scratch script under the repo or `.planning`. Only `pictures/16-06-pictures-source.tar.gz` (shots.spec.ts,
  pictures.config.ts, prod-on-dev.config.ts, compose.js).
- Not touched: STATE.md, ROADMAP.md, lib/export/, lib/models/board-file*.

## Founder's look

- **First look (2026-11-04), changes asked:** *"The shadowing can be stronger. Maybe no overhead light just the side
  lights. Also the dark themes look good, the light themes may need a darker background to make the foam pop."*
  Carried out in 31bcc2be.
- **Second look: Pending** — presented by the orchestrator.
