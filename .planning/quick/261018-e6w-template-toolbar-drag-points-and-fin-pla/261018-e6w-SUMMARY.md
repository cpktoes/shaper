---
phase: quick-261018-e6w
plan: 01
subsystem: template-screen
tags: [template, toolbar, drag-points, fin-placement, icon, wings]
requires: []
provides:
  - TEMPLATE's drag points on from the start on every device, switched only by the drawing's button
  - a fin-placement toolbar button (new hand-drawn surfboard-fin icon) on the VIEWER and WINGS toolbars
affects: [components/outline, e2e]
key-files:
  created:
    - components/outline/fin-placement-icon.tsx
    - e2e/template-toolbar.spec.ts
  modified:
    - components/outline/outline-editor.tsx
    - components/outline/wings-panel.tsx
    - components/outline/outline-controls.tsx
    - components/outline/wing-controls.tsx
    - components/outline/wing-view-layout.ts
    - components/design/use-viewer-media.ts
    - e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png
decisions:
  - "Fin placement is remembered for the visit in a module-level variable (written only from click handlers), so the first-wing pop-up's trip to FINS and back still shows the fins it switched on; a reload starts it off."
  - "The drag points come on one render after hydration (useSyncExternalStore, server snapshot false) because WebKit rounds a drag point's position differently from Node in the last digit and React reported a hydration mismatch on iPhone."
status: complete
actuals:
  tokens: 90000
  tasks: 3
  commits: 4
---

# Quick 261018-e6w: TEMPLATE's drag points and fin placement become toolbar buttons

On TEMPLATE the two "what is drawn on the board" switches now live on the drawing itself, and the sidebar's Settings block is gone.

## What a shaper sees

- **Drag points** show the moment TEMPLATE opens, on a computer as well as on a phone, and the drawing's button starts shaded ("Hide drag points"). Pressing it hides them. Wide View still forces them on and puts back whatever you had when you leave it. On the WINGS tab the button reads "Hide drag points (the wing's too)" because the wing's own grab points go with it.
- **Fin placement** is a new button with a hand-drawn surfboard-fin icon, on the VIEWER toolbar and the WINGS toolbar. It starts off ("Show fin placement"); pressing it draws FINS' fin marks on the board (marks only, no dims) and it reads "Hide fin placement", shaded. Adding a board's first wing still switches it on and opens "Dial in your wing placement", and it is still on after "Open FINS" and back. A reload starts it off again.
- The **Settings heading and both tick boxes are gone** from the Template Builder and from the WINGS sidebar. Nothing else in either sidebar moved (the WINGS fin note now sits 20 px under the Add-wing block, proven by a test).
- Both buttons only change what is drawn, so they keep working on a locked board.
- On a phone held sideways the WINGS close-up keeps the board clear of the longer (four-button) toolbar.

## Commits

- 19045326 — fin button on both toolbars, off by default, first-wing switch kept, close-up corner widened to 154 px, unit tests updated, new e2e/template-toolbar.spec.ts, toolbar counts updated.
- 0cbbc88a — drag points on from the start (after-hydration flag), WINGS label note, comment rewrites, eleven browser specs brought up to date.
- b3dc3e88 — Settings block removed (component, props, note), sidebar assertions, touch-sizing skip, design-findings note (`.claude/skills/sketch-findings-shaper/references/wings.md`, the write was allowed).
- 964cc7db — only the computer's TEMPLATE picture re-recorded, header paragraph added.
- The SUMMARY and review pictures are committed after these as `docs(quick-261018-e6w): summary and review pictures`.

## Tests

- `npx vitest run`: 5711 passed, 9 failed, 2 skipped (154 files). The 9 failures are all in `components/design/slider-row.test.ts` with `Cannot read properties of null (reading 'useId')` — the cloned node_modules loading React twice, not this change (the two files this plan touches, `toolbar-button.test.ts` and `wing-view-layout.test.ts`, pass: 126 tests).
- `npx tsc --noEmit` (after `npx next typegen`): clean. `npm run lint`: clean.
- Browser: the plan's Task 3 set (template-toolbar, template-rails-panels, board-lock-screens, wings, phone-layout, touch-sizing, desktop-baseline) 183 passed, 201 skipped (other projects), 0 failed. Full suite `PW_PORT=3162 IS_WEBPACK_TEST=1 npm run test:e2e`: 1211 passed, 1004 skipped, 5 failed under load (iPhone: blank-makers "unticking a maker", board-lock-screens p-screens, phone-trip, step-nav; desktop: board-rack m17); all five passed when re-run alone (13 passed), so no real failure.
- Desktop baselines: first run failed only TEMPLATE; the diff showed only the drag points, the new fin icon and the shaded drag-points button. Re-recorded TEMPLATE only; all five desktop baselines pass; ROCKER, RAILS, VOLUME, FINS untouched.
- No hydration warning on the iPhone (guarded by a test in template-toolbar.spec.ts). One "Hydration failed" line appeared once in a dev-server log while taking pictures right after a file change forced a chunk reload; it did not reproduce in a second run and the guarded test passed in every full and partial run.

## Deviations from Plan

**1. [Rule 1 - Bug] wings.spec.ts Metric drag test grabbed a moving point.** With the drag points on from the start, the test no longer had the toolbar click that used to give the close-up time to finish fitting, so it grabbed the inner wing point while the frame was still settling and the drag missed. Added `waitForGrabToSettle` (two reads 250 ms apart agree) to that one test. Commit 0cbbc88a.

**2. Intermediate-history note.** Commit 0cbbc88a (drag-points task) already contains the spec edits that assert the Settings block is gone (template-rails-panels first test, one test in template-toolbar.spec.ts), because those files carry changes for both tasks. Those two tests would fail at that commit alone and pass from b3dc3e88 on. The final tree is fully green.

**3. The drag-point waits.** Instead of only deleting the old "Show drag points" clicks, each now waits for `Hide drag points` to read pressed (the overlay arrives one render after hydration). `ensureConstructionOverlay` in outline-ghost.spec.ts keeps its name and parameter for the call sites.

No file was deleted. No database, migration, push or deploy.

## Known Stubs

None.

## Open item for the founder (not fixed here, as ruled)

On a phone held sideways, the TEMPLATE VIEWER's toolbar (now one button wider) sits over the **Tail @ 12"** reading: on a sideways Pixel 7 (863x360) the `14 3/4"` reading is under the fin and Wide View buttons (see `pictures/06-pixel7-sideways-viewer.png`); on a sideways iPhone it was already partly under Wide View. Filed as `.planning/todos/pending/2026-10-18-clear-the-template-toolbar-off-the-sideways-phone-readings.md`.

## Human verification deferred to the founder's review

- Look at the new fin icon at real size (pictures 08 and 09 show the row at 3x, unpressed and pressed) and say if it reads as a surfboard fin.
- Walk TEMPLATE on a real iPhone and a real Android: drag points showing at once, fin button, first wing, "Open FINS" and back; confirm no "1 Issue" badge in dev.
- Eyeball the sideways-phone toolbar overlap with the Tail @ 12" reading (open item above).
- After merge, from the main checkout: the full browser suite once more and `npm run test:e2e:prod` (phone-controls-clear-undo reads the shortened TEMPLATE sidebar).

## Review pictures (committed in `.planning/quick/261018-e6w-template-toolbar-drag-points-and-fin-pla/pictures/`)

01-desktop-template-at-load, 02-desktop-template-fin-placement-on, 03-desktop-wings-tab-one-wing, 04-iphone-upright-viewer, 05-iphone-upright-wings-one-wing, 06-pixel7-sideways-viewer, 07-iphone-sideways-wings-one-wing, 08-toolbar-row-3x-fin-placement-off, 09-toolbar-row-3x-fin-placement-on (all `.png`). The throwaway pictures spec was deleted.

## Self-Check: PASSED

Files exist (fin-placement-icon.tsx, template-toolbar.spec.ts, pictures); commits 19045326, 0cbbc88a, b3dc3e88, 964cc7db found in `git log`; `grep -rn 'TemplateSettings\|constructionNote' components/` is empty; `e2e/zz-e6w-pictures.spec.ts` is gone.
