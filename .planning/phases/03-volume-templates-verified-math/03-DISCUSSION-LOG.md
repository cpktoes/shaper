# Phase 3: Volume, Templates & Verified Math - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-28
**Phase:** 3-Volume, Templates & Verified Math
**Areas discussed:** Todo folding, Template on paper, What's on the template

---

## Todo folding (pre-discussion)

| Option | Description | Selected |
|--------|-------------|----------|
| Summary print refit | Verify/refit the Summary print sheet after the callout rebuild (frontmatter already said resolves_phase: 3) | ✓ |
| Construction lines + wide view | Template-screen toggle button + sidebar-minimizing wide view, requested for after Phase 2 | ✓ |
| Horizontal board view | Board on its side as a switchable Template-screen view (sketches 005/006) | stale |

**User's choice:** Fold the print refit and the construction/wide-view todos. For the horizontal view the user wrote: "horizontal board view already implemented." — verified in `components/outline/outline-editor.tsx` (orientation state + rotate button per sketch 006); todo archived as completed.
**Notes:** Nine other keyword matches (rails extras, copy-spec, units toggle, mobile polish, photo uploads, presets, bottom contours, rails instructions, fins generic tail) reviewed and left in the backlog.

---

## Template on paper

| Option | Description | Selected |
|--------|-------------|----------|
| PDF download | Multi-page PDF with true 1:1 size baked in; prints identically anywhere; one small PDF library | ✓ |
| Browser print | Print dialog like the order form; shaper must set 100% scale themselves | |
| Both | PDF plus a quick direct-print button | |

**User's choice:** PDF download (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Pick: Letter or A4 | Choice at export time, Letter default, page count adjusts | ✓ |
| Letter only | Simplest v1, US paper only | |
| One layout fits both | Tiles sized to the shared Letter/A4 area, no setting | |

**User's choice:** Pick Letter or A4 (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Template screen | Export where the outline is shaped | |
| Summary screen | Alongside the order-form print | |
| Both screens | Button in both places | ✓ |

**User's choice:** Both screens.

| Option | Description | Selected |
|--------|-------------|----------|
| Preview first | Dialog with tile grid, page count, paper pick, then Download | ✓ |
| Straight download | Immediate download, layout discovered in the file | |
| Page count confirm only | Slim confirm without a visual | |

**User's choice:** Preview first (recommended option).

---

## What's on the template

| Option | Description | Selected |
|--------|-------------|----------|
| Half template | One side, stringer as the straight edge — trace, flip, trace | ✓ |
| Full outline | Both rails printed | |
| Shaper's choice | Half/full toggle in the preview | |

**User's choice:** Half template (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Cut line + working marks | Curve, stringer edge, stations, widepoint | ✓ (amended) |
| Cut line only | Just curve + stringer edge | |
| Working marks + dimensions | Also print measured widths in the drafting callout style | |

**User's choice:** #1, amended in the user's own words: only the nose and tail 12" marks, center, and widepoint — "the marks a shaper needs." Plus a 2"×2" square on the first (nose) page to verify 100% scale post-print. Plus the board name and core dims printed where they stay on the template, not in an area that gets trimmed off.

| Option | Description | Selected |
|--------|-------------|----------|
| Overlap + match marks | ~½" overlap, alignment marks, page labels | ✓ |
| Trim and butt edges | Crop marks, trim margins, butt pages | |
| Page numbers only | Line the curve up by eye | |

**User's choice:** Overlap + match marks (recommended option).

| Option | Description | Selected |
|--------|-------------|----------|
| Small box on nose page | Few plain-English lines next to the 2"×2" square | ✓ |
| Separate cover page | Page 0 with instructions and tile map | |
| No instructions | Preview dialog already explained it | |

**User's choice:** Small box on nose page (recommended option).

---

## Claude's Discretion

- **Live volume display** — area offered, not selected. Defaults recorded: verify the already-live store pipeline, cover with tests; extra surfacing is a planning call.
- **What "proven right" means / CI** — area offered, not selected. Defaults recorded: GitHub Actions running the Vitest suites; golden fixtures are the known-good reference; Playwright only if acceptance needs it.
- PDF library, tile orientation, overlap size, filename, preview styling and wording.

## Deferred Ideas

None new — discussion stayed within phase scope. Reviewed-but-not-folded todos listed in CONTEXT.md.
