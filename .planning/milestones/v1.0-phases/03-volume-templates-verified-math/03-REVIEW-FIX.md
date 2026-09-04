---
phase: 03-volume-templates-verified-math
fixed_at: 2026-08-29T06:02:28Z
review_path: .planning/phases/03-volume-templates-verified-math/03-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-08-29T06:02:28Z
**Source review:** .planning/phases/03-volume-templates-verified-math/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (all Warnings — `fix_scope: critical_warning`; the review's two Info
  findings, IN-01 and IN-02, were out of scope for this pass)
- Fixed: 4
- Skipped: 0

**Verification environment:** all fixes were made and verified inside an isolated git worktree
(`.claude/worktrees/rf-03-86570-1787982644`, branch `gsd-reviewfix/03-86570`), with `node_modules`
symlinked in from the main checkout. `npm test` (995 tests, 19 files — 991 baseline + 4 new
regression tests added by this pass), `npx tsc --noEmit`, and `npx eslint .` were all run inside
that worktree and are reproducible from the main checkout after this pass's commits land (no
build-only, worktree-specific tooling was used).

## Fixed Issues

### WR-01: Overview Sheet prints a nonsensical "WP OFFSET — 0" forward/back" for a small but real widepoint offset

**Files modified:** `components/template/build-overview-pdf.ts`, `components/template/build-overview-pdf.test.ts`
**Commit:** a67e1c0
**Applied fix:** `overviewWpOffsetLabelText` now decides the "forward"/"back" direction word from
the *printed* magnitude (`formatInchesFraction`'s output) rather than the raw, unrounded offset —
an offset that rounds to `0"` at print precision now prints a bare `WP OFFSET — 0"` with no
direction word. `overviewStationLines`'s CENTER/WIDEPOINT merge decision was changed to match: it
now merges onto one `WIDEPOINT / CENTER` line whenever the offset rounds to `0"` at the sheet's own
display precision, instead of using a raw `1e-6`mm float-noise epsilon that let a real (if tiny)
offset through as two separate, confusingly-labeled lines. Added two regression tests at the exact
boundary value (`inchesToMm(0.015625)`, 1/64in — the same value `units.test.ts` already uses for
`formatSignedInchesFraction`'s equivalent fix) covering both `overviewWpOffsetLabelText` directly
and the `overviewStationLines` merge behavior.

### WR-02: Toggling Wide View remounts the entire viewer/export-dialog subtree

**Files modified:** `components/viewer/tabbed-panel.tsx`, `components/outline/outline-editor.tsx`
**Commit:** 984d676
**Applied fix:** Added a `bare` prop to `TabbedPanel` that hides the tab strip and collapses its
two nested card layers down to one, without changing which React component sits at that tree
position. `outline-editor.tsx` now always renders `<TabbedPanel bare={wideView}>` around
`viewerContent` instead of branching between `<TabbedPanel>` and a plain `<div>` — those were
different element types at the same spot, which is what forced React to unmount and remount the
whole viewer subtree (the drawing, its drag state, focus rings, `ExportPreviewDialog`) on every
Wide View toggle. The card that wraps `viewerContent` inside `TabbedPanel` carries an explicit
`key="panel"` so its identity survives the tab strip appearing/disappearing as a sibling. Visual
output is unchanged in both states (verified by class-name inspection; bare mode reproduces the
original single-bordered-box look via an invisible pass-through outer layer).

**Note:** this is a React reconciliation/behavioral fix. Tier 1 (re-read) and Tier 2 (`tsc`/`eslint`)
verification passed, but neither can observe actual remount behavior in a browser — there is no
component-test harness in this codebase (tests are `lib/**/*.test.ts` only, per CLAUDE.md). Marking
as **fixed: requires human verification** — confirm in a browser (React DevTools "highlight
updates", or watching for dropped hover/focus state) that toggling Wide View no longer remounts the
viewer.

### WR-03: `nameBlockPlacement`'s fallback can position the name/dims box outside page 0's printable range

**Files modified:** `lib/geometry/template.ts`, `lib/geometry/template.test.ts`
**Commit:** b125da1
**Applied fix:** Replaced `Math.max(searchFloor + boxHeightMm, searchCeiling)` with
`Math.min(searchFloor + boxHeightMm, searchCeiling)` in the fallback branch. This both fixes the
reported overrun (the fallback can no longer place `topStation` past page 0's own printable
station range, `searchCeiling`) and corrects a second, previously-unreported instance of the same
class of mistake: in the ordinary (non-overrun) fallback case, the old `Math.max` picked the
*narrowest* candidate on the page — the same nose-tip-most spot the main search loop had already
tried first and rejected — contradicting its own comment's promise to fall back to "the widest band
searched, deepest into page 0." Added a regression test that forces this fallback branch directly
(no `BOARD_PRESETS` board has a nose narrow enough to reach it on its own, per the review's own
note) by handing `nameBlockPlacement` a caller-supplied box height taller than page 0's entire
station range, and asserts `topStation` never exceeds `searchCeiling`.

### WR-04: Broken JSX indentation around the order form's drawings row

**Files modified:** `components/summary/order-form.tsx`
**Commit:** 51a503d
**Applied fix:** Re-indented lines 307–434 (the rocker column, the Color Design & Logos panel, and
their closing tags) to match their actual JSX nesting depth. Whitespace-only — every line's content
byte-for-byte unchanged; confirmed via `git diff -b` (ignore-whitespace) showing effectively zero
content diff, and via a Babel parse of the full file post-edit. Did not run a whole-file formatter
(`npx prettier --write`): a spot-check showed the rest of the codebase does not already conform to
vanilla Prettier defaults (no `.prettierrc` in the repo), so a full-file reformat would have
introduced a large unrelated diff; the fix instead reindents by hand to match the file's own
existing, already-correct indentation convention elsewhere.

## Skipped Issues

None — all four in-scope findings (WR-01 through WR-04) were fixed. The review's two Info findings
(IN-01: CI workflow `permissions:` block, IN-02: duplicated slugify logic) were out of scope for
this `critical_warning` pass and were not attempted.

---

_Fixed: 2026-08-29T06:02:28Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
