---
phase: quick-260926-uub
plan: 01
subsystem: geometry / foil defaults
tags: [foil, defaults, fit-and-tip-defaults, rocker, volume, desktop-baseline]
status: complete
requires: []
provides:
  - "DEFAULT_FOIL_SPEC with the founder's 1/2\" nose tip and 5/8\" tail tip"
  - "Browser specs that read the default tips from the app instead of retyping them"
affects:
  - "Every brand-new board's foil, blank fit, rocker and litres"
  - "Fit & Tip Defaults dialog (unchosen tips)"
  - "Saved boards from before the foil existed (snapshot v1 fallback)"
tech-stack:
  added: []
  patterns:
    - "Browser specs import pure lib/ modules by relative path to derive expected values"
key-files:
  created: []
  modified:
    - lib/geometry/foil.ts
    - lib/geometry/foil.test.ts
    - lib/fit-defaults-preference.ts
    - lib/geometry/blank-fit.test.ts
    - lib/geometry/board-profile.test.ts
    - e2e/fit-defaults.spec.ts
    - e2e/new-board.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
decisions:
  - "New boards start with a 1/2\" nose tip and a 5/8\" tail tip (founder, 2026-09-26), authored as inchesToMm(0.5) and inchesToMm(0.625) in DEFAULT_FOIL_SPEC; pinned literally once in foil.test.ts, derived everywhere else"
metrics:
  duration: "about 55 minutes"
  completed: 2026-09-26
actuals:
  tokens: 9000
  tasks: 2
  commits: 3
---

# Quick Task 260926-uub: New boards start with a 1/2" nose tip and a 5/8" tail tip — Summary

A brand-new board now starts with the founder's 1/2" nose tip and 5/8" tail tip (13 mm and 16 mm in Metric), replacing the 5/16" and 1/4" placeholders, and the Fit & Tip Defaults dialog shows the same pair until a shaper picks their own.

## What changed, in plain English

- **A new board** opens on ROCKER reading Nose Tip 1/2" and Tail Tip 5/8", and the side view is drawn slightly thicker at both ends.
- **The gear menu's Fit & Tip Defaults** shows 1/2" and 5/8" (13 mm and 16 mm in Metric) when nothing has been chosen, and Restore Defaults brings those back.
- **Nothing a shaper already chose moves.** If you saved your own tip defaults, on your account or in your browser, you keep them. Presets keep their own tips. No stored data, golden fixture, generator script, preset or database table was touched.
- **The tests no longer retype the old numbers.** Every test and browser test that needs the default tips now reads them from the app. One test pins the founder's 1/2" and 5/8" on purpose, so a future accidental change gets caught.

## Commits

| Task | Commit | What it does |
|------|--------|--------------|
| 1 | `e37cb7e` | feat: new boards start with a 1/2" nose tip and a 5/8" tail tip |
| 2 | `3ae8311` | test: the ROCKER and VOLUME reference pictures show the new default tips |

## Verification

- `npx tsc --noEmit` passed with no errors.
- `npx vitest run`: 74 files, **2,985 passed**, 2 skipped. That is the plan-time 2,984 plus the one new pin.
- `npm run lint`: 0 errors. There are 11 warnings, all in files this task did not touch (they were already there).
- Browser specs were run with `IS_WEBPACK_TEST=1 PW_PORT=3160` (webpack dev server, because this is a worktree):
  - fit-defaults plus new-board: 24 passed, 3 skipped. Those skips are each spec's own phone-only or desktop-only rules.
  - desktop-baseline: **5 of 5 passed** after the re-record.
  - Final full suite: **332 passed, 244 skipped, 0 failed** (15.3 min).
- All of Task 1's grep gates pass, and the diff gate confirms presets, fixtures, scripts, lib/db, drizzle, lib/models, components and app are untouched. Task 2's commit touches exactly its three files.

### Reference pictures: SHA-256 before and after

| Picture | Before (c2d7390) | After | Status |
|---------|------------------|-------|--------|
| outline (TEMPLATE) | `ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0` | `ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0` | identical |
| rails | `6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373` | `6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373` | identical |
| fins | `a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62` | `a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62` | identical |
| rocker | `75ee2ce14d11fadb7d863762f4a2f72c8f8a367c1960080a8e5509ba55101731` | `0dc0ba2610300d9b468321a1df07da5e8a1de1602e6c10602fc445dce938cae9` | re-recorded |
| volume | `e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372` | `b80a752b7b8a5e89862145d1b8e263dde60c074056ea837487e0306fa15f8e34` | re-recorded |

Before re-recording, each old picture was compared pixel by pixel with its new version:

- **ROCKER:** 2,097 pixels changed, in exactly two bands.
  - The station-label row (y 342–352, x 459–1217). Nose Tip went from 5/16" to 1/2" and Tail Tip from 1/4" to 5/8". Nose @ 12", Center and Tail @ 12" are unchanged.
  - The drawing near both tips (y 465–498, x 472–1207), where the board is now slightly thicker at both ends.
- **VOLUME:** 565 pixels changed, in one band (y 361–378, x 1159–1223): 29.94 L became 30.06 L.

Nothing else moved on either screen. The new pictures were drawn by the webpack dev server on port 3160 in this worktree. If the Turbopack run from the main checkout disagrees, the orchestrator may re-record ROCKER and VOLUME once there, as the header entry says.

## Note for the founder

**The blank list.** I measured it for the default new board: 6'0" long, 2 1/2" thick in the centre, the default outline, against the 158 pickable blanks in the catalogue. The "before" figures are the same board with the old tips.

- **No blank dropped out.** Under both Pin deck and Bottom, 140 blanks fit before and after, and the one "won't fit" is the same (Arctic Foam 6'2" F, too narrow). The same blanks appear in the same order.
- **Top of the list** is still US Blanks 6'2"A, centred. With **Pin deck** (the default), the board's tip rocker on that blank drops a little:
  - Nose: from 4 3/4" to 4 9/16".
  - Tail: from 2 3/8" to 2".
  - Why: a thicker tip means less foam comes off the bottom at the ends, so the bottom lifts less.
- **With Bottom**, the tip rocker doesn't change (4 1/4" nose, 1 11/16" tail), because the extra thickness comes off the deck instead. One placement moves: Arctic Foam 6'8" F slides from centred to about 3/16" (4.8 mm) off centre.
- **Tips now thicker than the blank leaves them.** Before, none of the 140 fitting blanks had this. Now three tips do: both ends of Arctic Foam 6'8" F, and the tail of Arctic Foam 7'9" SBF. On those, Pin deck makes the tip rocker fall rather than grow (Phase 12 D-16), exactly as designed.

These match the planner's figures exactly.

**Litres.** The default board now reads 30.06 L, up from 29.94 L.

**Older saved boards.** Boards saved before the foil existed (snapshot version 1) have no tips of their own. They borrow the default, so they will now reopen showing 1/2" and 5/8". No stored data changes.

**Who is not affected.** Shapers who already picked their own tip defaults keep them. Every preset keeps its own tips.

**Build.** `npm run build` can't run in a worktree, so it's left to the orchestrator on `main` after the merge.

## Deviations from Plan

1. **Commit trailer.** Both task commits end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`, not the `Claude Fable 5.1` line the plan named. The runtime's attribution rule names the model that actually did the work, and an agent's instruction cannot override that rule.
2. **A first-run flake, checked and ruled out.** The first full Playwright run had two failures:
   - the expected ROCKER picture;
   - one iPhone test, `phone-layout.spec.ts:416`. Its page load of ROCKER was interrupted by a reload of TEMPLATE.

   I re-ran that test three times on a freshly started server. It failed the first time and passed the next two. I then put the old 5/16" and 1/4" tips back temporarily and repeated the same three runs. The same pattern appeared: it failed first and passed twice. So the failure comes from the worktree's webpack dev server building ROCKER for the first time, not from this change. The new tips were restored immediately, the working tree was confirmed clean, and the final full run was green with 0 failures. No picture was re-recorded to hide a failure.

Otherwise the plan was followed exactly.

## Known Stubs

None.

## Self-Check: PASSED

- All 10 modified files exist in the tree. The commits `e37cb7e` and `3ae8311` are on the worktree branch.
- The outline, rails and fins hashes match the pre-change values (the grep gate prints 3).
