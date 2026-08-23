---
id: 260823-gc4
slug: remove-the-widepoint-knots-and-match-the
description: Remove the widepoint knots and match the station line colour on the order form
date: 2026-08-23
status: complete
branch: design/order-form-summary
commits:
  - 10d8ed0 feat(summary): draw the order form's station lines in one ink
---

# Quick Task 260823-gc4 — plain station lines on the order form

The order form's interior lines are now a single ink. The widepoint station came across from the
outline editor in rose, with two rose knots at the rails; on an otherwise monochrome drafting sheet
that read as an editor affordance rather than a template marking.

## What changed

Two CSS custom property overrides on the order form's outline panel, added beside the
`--outline-board-fill: transparent` override already there:

| Token | Value | Effect |
|---|---|---|
| `--outline-widepoint-line` | `var(--outline-station-line)` | Widepoint station takes the same faint grey as the stringer, centreline and 12" stations. |
| `--outline-widepoint-knot` | `transparent` | The two rail knots disappear. They carry no stroke, so a transparent fill removes them outright. |

No new prop on `OutlineViewer`. These are theming tokens — retheming is what they are for — and that
component already carries five display gates.

## What was deliberately left alone

- **`--outline-widepoint-dash`** (`2 3`, against the centreline's `16 4 4 4`). The viewer's own note
  on these lines is that a widepoint near centre lands within a few pixels of the mid-length
  centreline, and that *colour* was what told the two apart. With the colour now matched, the dash
  is the only thing still doing that job — matching it too would merge them into an
  indistinguishable pair.
- **The fin marks on the Bottom drawing**, still accent blue. They are placement output rather than
  a station, and a shaper reads them as a different kind of mark.
- **The outline editor's own widepoint treatment**, where the colour earns its place next to the
  drag handles.

## Verification

- `npx tsc --noEmit` — clean. `npx eslint` — clean (one pre-existing unused-var warning in
  `outline.test.ts`, untouched). `npx vitest run` — 638 passed / 7 files.
- **Order form**, both drawings: all five interior lines compute to the identical
  `color(srgb 0.4196 0.4196 0.4196 / 0.36)`, the widepoint keeping its own `2px, 3px` dash. The two
  widepoint knots compute to `rgba(0, 0, 0, 0)`. The Bottom drawing's six fin dots are still
  `rgb(17, 17, 17)`, untouched.
- **Outline editor** re-checked and unchanged: widepoint line still
  `color(srgb 0.6588 0.2588 0.3725 / 0.45)`, both knots still `rgb(168, 66, 95)`. The override is
  scoped to the order form's panel.
- Print fit not re-measured: this change alters two colour tokens and nothing that occupies space,
  so the one-portrait-page result verified in `260823-ffv` still holds.
