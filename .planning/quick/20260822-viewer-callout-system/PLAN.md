---
quick_id: 260822-vcs
slug: viewer-callout-system
date: 2026-08-22
status: planned
source: .planning/sketches/ 001-004 (design agreed and committed)
files_modified:
  - app/globals.css
  - components/outline/outline-viewer.tsx
  - components/fins/fin-viewer.tsx
  - components/summary/board-summary.tsx
  - components/setup/preset-card.tsx
---

# Quick Task: Implement the viewer callout system

Implements the design agreed across sketches 001-004. **Read
`.planning/sketches/MANIFEST.md` first** — it states the eight locked decisions. Then read each
sketch's README for the rationale, and open the sketch HTML to see the target.

The sketches are the specification. Where this plan and a sketch disagree, raise it rather than
guessing.

## The system in one paragraph

Inside the outline: faint lines only, never text. Stringer and mid-length centreline are static and
share one dash; derived stations get a uniform shorter dash; the widepoint is an input and is marked
with two rail dots, never a line across the board. Outside the outline: user inputs are named chips
in a left gutter, derived values are dimension-ticked and read out to a single aligned right rail.
All leaders horizontal. All labels SVG `<text>`, never positioned HTML.

## Task 1 — Tokens

`app/globals.css`. Add to the outline palette block:

- `--outline-stringer-dash: 16 4 4 4` — stringer and mid-length centreline
- `--outline-station-dash: 5 4` — derived station lines
- `--outline-dim-ink` — dimension lines, ticks and values (use `--outline-ink`)
- `--outline-callout-label` — station/chip name text (replaces the hardcoded `#3a5f9e`)

Then remove every hardcoded colour in the two viewers: `#4472C4` becomes
`var(--outline-station-line)`, `#3a5f9e` becomes `var(--outline-callout-label)`. Grep both files
afterwards to prove no bare hex remains.

## Task 2 — Shared callout primitives

New module under `components/` (diagram layout, not geometry — it must NOT go in `lib/`).
Small pure-presentational helpers used by both viewers:

- `DimensionTick` — the 45-degree slash
- `DimensionLine` — extension line + ticks + value, with the value either in a break or outside
  the ticks when the span is too short to hold it
- `CalloutChip` — name + value chip with a horizontal leader
- `OutputRail` — value + station-name pair at a fixed x

Rails and gutters are **constants in this module**, not per-call arguments. That is the point of
the whole design: a new label joins a rail or defines one, and can never land at an arbitrary
offset. Sketch 001's README explains why.

## Task 3 — Outline viewer

`components/outline/outline-viewer.tsx`. Replace the absolutely-positioned HTML label overlay
(`<div className="pointer-events-none absolute inset-0">` and its children) with SVG text.

Layout constants from sketch 004, revision 2:

| | |
|---|---|
| Chip width | 96, right edge x=58 |
| Board | x = 94.5 -> 245.5 |
| Output value left edge | x = 282 |
| Gaps | 36.5 each side |
| viewBox | widens from `0 0 340 620` to `-50 -16 410 638` |

- Inputs (chips, left): Length, Widepoint, WP offset, Tail block. Each names its own value —
  "TAIL BLOCK / 4\" wide", not a bare 4".
- Outputs (rail, right): nose width @12", centre width, tail width @12".
- WP offset gets no leader; it is grouped directly beneath the Widepoint chip.
- Widepoint drawn as two dots on the rails in `--outline-widepoint-knot`.

## Task 4 — Fins viewer

`components/fins/fin-viewer.tsx`. Same grammar, **outputs only** — the tail-width value and its
station label are removed, since those are inputs already visible in the sidebar.

Collapse the five leader-line variants to the two tokens from Task 1. Keep fin marks on
`--outline-accent`.

## Task 5 — Consumers

- `components/setup/preset-card.tsx` — passes `hideCallouts`; thumbnails must stay exactly as they
  are today (clean outline, no reference lines, no chips). Verify unchanged.
- `components/outline/outline-editor.tsx` — passes `hideFinMarks`; still honoured.
- `components/summary/board-summary.tsx` — **highest risk**:
  - Its Template card is `aspect-[340/620]`, hardcoded to the old viewBox. The new viewBox is
    410 wide, so this ratio must be updated or the board will distort.
  - In `compact`, **suppress the input chips and keep the output rail**. The summary's Volume
    Estimate card already lists length, width and centre thickness, so chips would duplicate it;
    the derived widths appear nowhere else.
  - The summary has a print path (`useSummaryPrintFit`, `app/design/summary/summary.css`).
    Changing the viewBox aspect can break the printed sheet. Verify print layout explicitly.

## Verification

- `npm run test`, `npm run lint`, `npm run build` all pass. Geometry is untouched, so the
  `lib/geometry` suites and golden fixtures must be **unchanged** — if any moves, stop and report.
- `grep -nE '#[0-9a-fA-F]{6}'` over both viewers returns nothing.
- No absolutely-positioned label overlay remains in either viewer.
- A dev server may be running on port 3000, orchestrator-managed — do NOT start another. If nothing
  is listening, note it and skip live checks; the orchestrator verifies in a browser afterwards.

## Explicitly out of scope

Rocker, foil, print/export paths, the rails cross-section plots (not plan-view boards), and the
deferred fins imported-outline branch. Do not touch `lib/geometry/`.
