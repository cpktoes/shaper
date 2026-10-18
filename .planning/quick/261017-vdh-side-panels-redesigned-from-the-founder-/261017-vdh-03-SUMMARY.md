---
phase: quick-261017-vdh
plan: 03
subsystem: volume-and-fins-side-panels
tags: [volume, fins, import-designed-board, side-panel, model-info]
status: complete
requires: []
provides:
  - volumeImportedLine (VOLUME's INPUTS line)
  - finsImportedLine (FINS' INPUTS line)
  - toggleImportDesignedBoard (VOLUME's one import toggle)
affects: [VOLUME screen, FINS screen, design store, rack-card litres rule]
key-files:
  created:
    - lib/geometry/volume-imported-line.ts
    - lib/geometry/volume-imported-line.test.ts
    - lib/geometry/fins-imported-line.ts
    - lib/geometry/fins-imported-line.test.ts
    - e2e/volume-fins-panels.spec.ts
  modified:
    - lib/geometry/design.ts
    - lib/geometry/design.test.ts
    - components/design/design-store.tsx
    - components/design/design-store.test.ts
    - components/design/measure-field.tsx
    - components/design/slider-row.test.ts
    - components/volume/volume-controls.tsx
    - components/volume/volume-estimator.tsx
    - components/fins/fin-controls.tsx
    - components/fins/fin-placement-editor.tsx
    - components/fins/fin-model-info.tsx
    - e2e/board-length-picker.spec.ts
    - e2e/touch-sizing.spec.ts
    - e2e/keyboard-focus.spec.ts
    - e2e/phone-screens.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/fins-desktop-desktop-darwin.png
decisions:
  - "VOLUME has one box: the stored importTemplateDimensions flag is the box, importRailThickness follows it inside deriveEffectiveVolume. No migration, computeVolume untouched."
  - "FINS' tail depth reads as a mark (Metric 38 mm deep), as TEMPLATE's Depth slider does; a diamond prints the clamped depth it is drawn with."
  - "FINS ADVANCED rule above Rear is conditional on a forward block existing, so no block ever starts with a stray rule."
actuals:
  tokens: 22000
  tasks: 3
  commits: 4
duration: about 90 minutes wall clock, much of it waiting on a saturated machine
completed: 2026-10-18
---

# Phase quick-261017-vdh Plan 03: VOLUME and FINS side panels Summary

**One "Import Designed Board" box on VOLUME and FINS, each with a one-line summary of what was imported and the replaced controls hidden; FINS' ADVANCED now reads nose to tail and MODEL INFO takes the side panel's own headings.**

## What a shaper sees

**VOLUME**
- "Primary Inputs" is now **Inputs**.
- The two tick boxes are one: **Import Designed Board**, ticked by default. Ticked, a single line reads
  `Board details are imported: 6'0" × 19" × 2 1/2", and the rail shapes from RAILS.` (Metric: `182.9 × 48.3 × 6.4 cm, and the rail shapes from RAILS.`) and Board Length, Board Width, Center Thickness and Board Type are not on the page.
- Untick it for the quick estimate: those four controls come back, starting from this board's own length, width and centre thickness. One tap on Undo ticks it again.

**FINS**
- "Import Template Values" is now **Import Designed Board**. Ticked, one line reads
  `TEMPLATE details are imported: 6'0" · 14 3/4" tail @ 12" · Squash tail · 4" tail block` (diamond and swallow add ` · 3" deep`; pin and round have no tail block; Metric `182.9 cm · 37.4 cm tail @ 30.5 cm · Squash tail · 10.2 cm tail block`). Board Length, Tail Width @ 12" and Tail Shape are not on the page; unticked they show FINS' own stored values, as before.
- ADVANCED now runs nose to tail: Forward Fins first, then Rear Fins (quads), then the Center Fin block, then Reset Advanced Settings. Only the blocks after the first carry the divider rule.
- MODEL INFO: the title is the side panel's title size (18 px), its note sits right under it with no heavy rule, each block heading (Convention, Single Model, ...) wears the side panel's ruled heading look, model names are still bold, wording unchanged.

**A board saved with the old in-between setting** (real outline, board-type thickness) opens with the box ticked. Its quoted litres, the cross-section figure every screen and print shows, are exactly what they were (a unit test proves it); only the VOLUME card's working rows change, to the rail-shape rows.

## Commits

| Task | Commit | What |
| ---- | ------ | ---- |
| 1 | 21341ad6 | The two imported-details lines (tested, both systems, all five tail shapes) and the one-box rule in `deriveEffectiveVolume` |
| 2 | 21e2137c | VOLUME's Inputs, one box, the line, the four controls only for a quick estimate; the store's one toggle |
| 3 | 48a14426 | FINS' box and line, ADVANCED order, MODEL INFO headings, specs |
| 3 | 91b98692 | New VOLUME and FINS desktop pictures |

## Verification

- `npx vitest run`: 154 files, 5750 passed, 2 skipped. `npx tsc --noEmit` and `npm run lint` clean.
- Playwright (PW_PORT=3163, webpack), all green on a quiet machine: `volume-fins-panels` (10 desktop tests: 3 VOLUME, 3 FINS inputs, 3 ADVANCED, 1 MODEL INFO), `board-length-picker`, `touch-sizing`, `keyboard-focus`, `phone-screens`, `undo-redo`, `phone-fins-labels`, `phone-fins-landscape`, `phone-screen-tiles`, `step-nav` (except the one deviation below), `phone-chrome -g "VOLUME|FINS"` on iphone and android (10 passed), `desktop-baseline -g "VOLUME|FINS"` (2 passed after re-recording).
- The machine was saturated while these ran (load average 100 to 200), which produced a stream of 30 s timeouts on iphone/android navigation. Each such failure was re-run alone with a longer timeout and passed.

## Deviations from Plan

**1. [Read-only spec fails on the intended change] `e2e/step-nav.spec.ts:155` ("the pair sits below the last of the screen's own controls"), desktop, FINS row.**
With the designed board imported FINS' controls now fit the sidebar, so Back and Next sit above the dev-only "Copy preset values" footer; the spec measures every box in the aside and counts that footer as a control reaching 66.5 px below the pair. Confirmed with a probe (the lowest element is the `Copy preset values` div, which does not exist in production). VOLUME and the other screens pass. I did not edit the file (not in files_modified). Suggested fix for the orchestrator: have that spec's loop ignore the dev-only `Copy preset values` footer container, as it already ignores `[data-site-footer]`.

**2. [Rule 3 - blocking] `node_modules/node_modules`**
The APFS clone carried a symlink `node_modules/node_modules` pointing at the main checkout's `node_modules`, which made vitest load a second copy of React ("Cannot read properties of null (reading 'useId')" in `slider-row.test.ts`). I unlinked that one symlink in this worktree; nothing else changed. The orchestrator should unlink it (or not recreate it) when cleaning up.

**3. FINS Rear block rule made conditional.** The plan says Rear always carries the divider rule; I applied it only when a forward block exists (always true for a quad), so no block can ever open with a stray rule. No visible difference for any real setup.

Otherwise the plan ran as written. No auth gates.

## Notes for the orchestrator

- `e2e/touch-sizing.spec.ts` also had a desktop test (line 464, "tail-shape and Fin Setup buttons keep today's resting height on a mouse") that reads the FINS `Pin` button; I unticked the box first there too (the plan listed only the phone grid test).
- ROCKER's blank-picker test in `touch-sizing.spec.ts` (iphone) fails on timeouts in this worktree: there is no `.env.local`, so the blank catalogue cannot load. It is plan 02's screen and unchanged here; it passed once on a quiet run.
- `board-lock-screens.spec.ts` was not run here, as instructed; it depends on this plan's lock behaviour (`Import Designed Board` disabled and its label `opacity-40` on a locked board, on both screens), which is in place.
- Pictures were recorded under webpack in this worktree; re-check them on main.

## Threat model

T-vdh-05 (in-between stored flags): mitigated, `deriveEffectiveVolume` folds the rail flag into the template flag; unit tests prove identical quoted litres. T-vdh-06 (locked board): the box is `disabled={locked}` on both screens and the store toggle returns early on `lockedRef`. T-vdh-07 (undo): one `noteEdit(null)` per toggle, proved by the browser spec's single Undo.

## Known Stubs

None.

## Self-Check: PASSED

Files created and all four commits exist (21341ad6, 21e2137c, 48a14426, 91b98692).
