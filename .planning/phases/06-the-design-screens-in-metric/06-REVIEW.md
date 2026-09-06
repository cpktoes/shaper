---
phase: 06-the-design-screens-in-metric
reviewed: 2026-09-05T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - components/design/measure-field.tsx
  - components/design/measure-field.test.ts
  - components/fins/fin-controls.tsx
  - components/fins/fin-viewer.tsx
  - components/fins/toe-aim-table-modal.tsx
  - components/fins/fin-data-panel.tsx
  - lib/geometry/fins.ts
  - lib/geometry/fins.test.ts
  - lib/geometry/measure-display.ts
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: issues_found
---

# Phase 06: Code Review Report (re-review after gap closure)

**Reviewed:** 2026-09-05T00:00:00Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found (info only)

## Summary

This is a re-review scoped to the diff since `02ec30be534f020184b87f7d6525755a9b0d45bf` — Plan
06-08's re-tagging of the three fin Off-Tail rows from `dim` to `mark` (five call sites:
`fin-controls.tsx` ×4, `fin-viewer.tsx` ×1), the matching split in `toeAimTableFor` (tail-width
columns/board-length row label stay cm via `formatDimBare`/`formatDim`, front/rear aim-distance
cells switch to whole-mm via `formatMarkBare`, heading marker switches to
`columnUnitSuffix("mark", system)`), and Plan 06-09's `MeasureField` width split (standalone 96px
`w-24` vs. bare 64px `w-16`, unchanged).

**Traced and confirmed correct:**

- Every fin placement row (`Off-Tail`, `Off-Rail`/`Off-Stringer`, `Toe-In`, `Fin Base Length`) in
  `lib/geometry/fins.ts` is now tagged `"mark"` — no `"dim"` literal remains anywhere in that file.
  `fin-controls.tsx` and `fin-viewer.tsx`'s five re-tagged call sites now call `formatMark`
  consistently with `FinSummaryRow.family`, and `fin-data-panel.tsx`'s
  `row.family === "dim" ? formatDim(...) : formatMark(...)` render path is unaffected because it
  branches on the same `family` tag (see IN-01 below for the consequence of this).
- `toeAimTableFor`'s split is internally consistent: `formatColumn` (tail-width columns, board
  dims) still routes through `formatDimBare`/`formatDim`, `formatCell` (front/rear aim-distance
  cells, marks) now routes through `formatMarkBare`, and `toe-aim-table-modal.tsx`'s heading
  marker (`columnUnitSuffix("mark", system)`) agrees with what the cells beneath it now print —
  headings and cells no longer disagree about which family the numbers below them belong to.
  Imperial's `formatColumn`/`formatCell` are both still `String(v)` verbatim, so Imperial's
  literal table output (columns, cells, row label) is untouched by this split.
- No placement arithmetic or slider bounds changed in this diff — every edit under review is a
  formatter-call substitution (`formatDim` → `formatMark`) or a `family:` string literal change;
  `computeFinPlacement`'s inch-domain core, `measureSlider` call sites, and `POS_BOUNDS`/
  `TOE_BOUNDS`/`OFF_RAIL_BOUNDS`/`OFF_TAIL_OVERRIDE_BOUNDS` are all unchanged.
- Imperial byte-identity holds for every re-tagged site: `formatDim` and `formatMark`
  (`lib/geometry/measure-display.ts:62-64, 80-82`) both reduce to `formatInchesFraction(value)` on
  the imperial branch with no other branching, so swapping one call for the other cannot change
  the Imperial string at any of the five re-tagged call sites, `fin-data-panel.tsx`'s render path,
  or `toeAimTableFor`'s `identicalFromLabel`. (See IN-02 for a note on how thin the new regression
  test for this actually is.)
- `MeasureField`'s width split correctly follows render mode: the three standalone Board Length
  sites (`outline-controls.tsx`, `fin-controls.tsx`, `volume-controls.tsx`) call `MeasureField`
  without `bare`, so they get the new 96px (`w-24 min-w-24 max-w-24`) box; the ROCKER datasheet's
  two calls (`rocker-datasheet.tsx:135, 178`) pass `bare`, so they keep the original 64px
  (`w-16 min-w-16 max-w-16`) box byte-for-byte. The error line's `w-24` was already 96px before
  this change, so it now matches the standalone input's own width rather than being coincidentally
  wider than it.
- CR-01 (typed-bounds domain mismatch — Metric Board Length committing ~10x too long) is
  confirmed fixed: `fin-controls.tsx:237` computes `boardLengthFieldBounds` via
  `typedFieldBounds(boardLength, "length", system)` and passes that (not the raw
  `measureSlider` millimetre bounds) to `MeasureField`'s `min`/`max` at line 366-367.
- WR-01 (un-snapped Metric override display) is confirmed fixed per `06-REVIEW-FIX.md`; not
  re-verified in depth here since none of its files are in this diff's scope, but nothing in this
  diff touches `BaseLengthField`.
- WR-02 (Volume screen's `4'` feet option below the enforced range) remains open by design — the
  fix report records it as intentionally skipped, pre-existing Imperial behaviour out of Phase 6
  scope, not something this diff touched.
- `npx vitest run` (2007 passed, 2 pre-existing skips), `npx tsc --noEmit` (clean) both pass
  against the current tree.

Three Info-tier items follow: one carried forward unchanged from the previous review (IN-02 there
→ IN-03 here), one new observation about a now-dead code branch created by the retag, and one
about the strength of the new Imperial-equality regression test.

## Info

### IN-01: `FinDataPanel`'s `row.family === "dim"` branch is now unreachable dead code

**File:** `components/fins/fin-data-panel.tsx:68`

**Issue:** Since Plan 06-08 re-tagged every `FinSummaryRow`/`fullSpreadFamily` in
`lib/geometry/fins.ts` to `"mark"` (confirmed by `grep -n '"dim"' lib/geometry/fins.ts` returning
nothing), the `formatDim` arm of `row.family === "dim" ? formatDim(row.value, system) :
formatMark(row.value, system)` (and the identical `grp.fullSpreadFamily === "dim" ? formatDim(...)
: formatMark(...)` a few lines below) can never execute given any value `computeFinPlacement`
actually produces today. The `MeasureFamily` type still declares `"dim" | "mark"`, so this isn't a
type error, but it is a branch with no live producer — a future reader has no way to tell, without
re-deriving this fact from `fins.ts`, whether the branch is reachable or leftover from before the
retag.

**Fix:** Either leave a short comment at the ternary noting that no current `FinSummaryRow`
producer emits `"dim"` (so a future re-introduction of a dim-family DATA-tab row is the only way
this branch fires), or — if `FinSummaryRow.family` is now permanently `"mark"`-only for the DATA
tab — consider narrowing `FinSummaryRow.family`'s type to the literal `"mark"` and dropping the
ternary/`formatDim` import from this component entirely. Not urgent; flagging so it doesn't get
mistaken for exercised code during a future edit.

### IN-02: The new Imperial-equality test proves the general case, not just the specific one it exercises — but the title reads as validating "an" instance rather than the invariant itself

**File:** `lib/geometry/fins.test.ts:522-525`

**Issue:** The new test
```ts
it("re-tagging an off-tail row from dim to mark cannot move its Imperial string, because formatMark and formatDim both call formatInchesFraction on the imperial branch", () => {
  const result = computeFinPlacement({ ...DEFAULT_FIN_PLACEMENT_SPEC, finSetup: "thruster" });
  expect(formatMark(result.resolved.frontOffTail, "imperial")).toBe(formatDim(result.resolved.frontOffTail, "imperial"));
});
```
only checks one value (`frontOffTail` under the default thruster spec). Reading
`measure-display.ts:62-64` and `80-82` confirms the equality actually holds for *every* `Mm` input
on the imperial branch (both functions reduce to `formatInchesFraction(value)` unconditionally, no
other branching), so the test's conclusion is sound and its own title is accurate about *why* — but
the test itself only samples one input, and would not have caught a regression where a future edit
special-cased `formatMark`'s imperial branch for a particular value range (e.g. a toe-in-specific
rounding rule) that happened not to touch `frontOffTail`. This isn't a bug in what shipped — the
current implementation genuinely has no such special-casing — but the test's proof value is
narrower than its docstring implies; it's closer to a canary than a full byte-identity guarantee
across all five re-tagged sites and both quad-rear branches.

**Fix:** Optional strengthening — parameterize over the five re-tagged values (`frontOffTail`,
`centerOffTail`, `sideOffTail`/`twinOffTail`, `quadRearOffTailBase`, `pairOffTail`) across a couple
of specs (thruster, quad with `mckeeSB` and with `basicOffRail`), or add a direct
`formatMark`/`formatDim` property-style check over a small sampled range of `Mm` values in
`measure-display.test.ts` instead of relying on one instance derived from placement geometry. Not
blocking — the current single-instance test plus the source-level argument in its own name is
adequate evidence for this diff's Imperial byte-identity claim.

### IN-03: Carried forward — `formatSignedDim`'s unreachable `"-0.0"` branch and `dimsForMark`'s always-truthy `&& toeDisplay` guard remain open

**Files:** `lib/geometry/units.ts` (formatWholeMm/formatCentimetres path referenced by
`lib/geometry/measure-display.ts:97-104`'s `formatSignedDim`); `components/fins/fin-viewer.tsx:269,
290, 315`

**Issue:** Neither of these files/lines is touched by this diff, and both prior findings (IN-01 /
IN-02 in the original `06-REVIEW.md`, renumbered here as one combined carry-forward) still apply
verbatim:
- `formatSignedDim`'s `printed === "-0.0"` disjunct is still dead code — `(-0).toFixed(1)` is
  `"0.0"` in JavaScript, so `formatCentimetres` can never return the literal `"-0.0"` this branch
  guards against.
- `dimsForMark`'s three `&& toeDisplay` guards (`fin-viewer.tsx:269, 290, 315`) are still
  effectively dead weight — `toeDisplay = formatMark(mark.toe, system)` always returns a non-empty
  string (even for a zero toe, e.g. `'0"'` / `"0 mm"`), so the conjunct can never be falsy.

**Fix:** Unchanged from the original review — drop the `"-0.0"` disjunct (or comment it as
defensive/unreachable), and drop the `&& toeDisplay` conjuncts (or replace with an explicit
intent-revealing check). Neither was in scope for the `critical_warning` fix pass per
`06-REVIEW-FIX.md`, and neither is touched by this re-review's diff, so they remain open at
Info tier.

---

_Reviewed: 2026-09-05T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
