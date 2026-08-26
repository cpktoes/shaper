---
id: 260825-vot
slug: template-viewer-rotate
date: 2026-08-25
type: quick
status: complete
---
# The Template board now rotates in place — nose left, same panel, same everything else

## What changed, in plain English

The Template screen's viewer panel is already wider than the board needs — a vertical board
fills the panel's height but only uses about a sixth of its width. There's now a small rotate
icon in the upper-right corner of that panel. Click it and the board turns 90° so it lies on its
side, nose pointing left, using the panel's width instead of fighting for it — nothing else on
the page moves: same nav, same sidebar, same panel, same panel size. Click it again and the board
stands back up. The button is a single icon in both states (a phone-style "rotate" glyph showing
an upright board, a laid-down board, and one arrow between them) — only its tooltip changes.
Reloading the page always comes back to the upright view; the choice is never saved anywhere.

Dragging a control point (with the construction overlay on) still works exactly the same way
whether the board is upright or on its side — the drag math was rewired to read the rotation off
the same element that draws it, so it can't drift out of sync.

Every callout — the input chips (LENGTH, WIDEPOINT, WP OFFSET, TAIL BLOCK) and the output rail
(Nose/Centre/Tail widths) — stays upright and left-to-right in both orientations. Rotated, the
input chips form a rail below the board and the outputs form a rail above it, each still
attached to the board feature it measures by its leader line.

## Why the board turns as one group instead of rewriting how it's drawn

The board's ~40 individual line/point calculations (`pxX`, `lenToY` and their call sites) were
left completely untouched. Instead, everything the SVG draws got wrapped in one `<g>` and that
group alone carries `rotate(-90)` when horizontal. This mattered for two reasons:

1. **Blast radius.** Refactoring the projectors into something orientation-aware would have
   dragged in every other screen that reuses them — the fin viewer, the Summary cards, the setup
   preset thumbnails — for a feature that only the Template screen gets. Rotating one group
   around all of that math, instead of rewriting the math, kept the change to exactly the three
   files the plan scoped: `outline-viewer.tsx`, `callout-primitives.tsx`, `outline-editor.tsx`.
2. **Correctness by geometry, not by re-deriving it per element.** A single `rotate(-90)` on a
   parent group is one transform to get right, verified once, rather than forty coordinate pairs
   each individually re-derived for a rotated frame — the second approach is exactly the kind of
   thing that quietly breaks one call site nobody thought to check.

The callout text (chip labels, output values) needed its own fix on top of that, because
rotating the group would have laid every letter on its side. `CalloutChip` and `OutputRail` each
wrap their box/text in a small `UprightAt` helper that applies the exact inverse rotation about
the chip's own anchor point — the geometry cancels out to "draw this upright, right here" without
either component needing to know it's inside a rotated parent.

## Print and Summary stay vertical by construction, not by a guard

`OutlineViewer` got one new prop, `orientation`, defaulting to `"vertical"`. The Summary sheet,
the printable full-size template, and the order form's two template windows never pass this prop
at all — they were never touched by this task. So there's no `if (isPrintPath) forceVertical()`
check anywhere that someone could later delete or forget to add to a new consumer. A future
screen that renders `OutlineViewer` without wiring up the prop gets the upright board automatically,
the same way it always has.

## Where the plan's worked-out maths landed

The plan carried the rotation formulas, the counter-rotation formulas, and the WP Offset
regrouping formula fully worked out in advance — including the `(x, y) → (y, -x)` mapping, the
horizontal viewBox derivation, and every chip's rotated coordinates. Every one of those
expressions was implemented verbatim and passed its corresponding grep gate on the first try; no
formula needed correcting during implementation. That's unusual enough to be worth flagging
plainly rather than padding this section with a manufactured caveat.

What's still unverified is the part no automated check can cover: this repo has no component
tests or DOM snapshots for `OutlineViewer` (all ~670 Vitest tests are pure `lib/` geometry), so
the drag-tracks-correctly and nothing-gets-clipped-at-the-ends checks depend entirely on the
browser pass below, which was not run by this executor per its instructions — those two
`<human-check>` blocks are still pending with the orchestrator.

## Verified

`npx tsc --noEmit` ✓ · `npm run lint` ✓ (0 errors, same 9 pre-existing warnings, none from these
files) · `npm test` ✓ (670/670) · `npm run build` ✓. All grep gates in both tasks' `<verify>`
blocks passed, including the ones asserting the vertical viewBox expressions, the projectors, and
the drag inversion are byte-identical to before. `git diff --name-only` confirms exactly the
three scoped files changed — `components/viewer/tabbed-panel.tsx` and every other `OutlineViewer`
consumer were never touched.

## Pending

Both plan tasks carry a `<human-check>` block that must be run in a browser — the orchestrator's
job, not this executor's:

- **Task 1:** the rotate button's placement, the turn itself, and — the highest-risk item — that
  dragging a construction control point still tracks correctly while horizontal.
- **Task 2:** every callout reading upright with correctly-shaped boxes in both orientations, no
  clipping at either end of the board on the widest/shortest boards the sliders allow, the
  Rails/Fins/Summary screens still showing no button, and Summary/print still rendering vertical
  even after the Template screen has been rotated.
