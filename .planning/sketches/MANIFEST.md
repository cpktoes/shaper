# Sketch Manifest

## Design Direction

The board viewers should read as **technical drawings a shaper already knows how to read**, not as
app UI with numbers floating on it. The reference point is a real shaping template: light extension
lines, ticked dimension lines, values sitting in a break in the line, a centreline that announces
itself as the board's axis. Restraint is the whole point — one ink for dimensions, one dash for
stations, one dash for the stringer, and no colour doing decorative work. The palette is the app's
existing `--outline-*` tokens, not a new one; these sketches deliberately introduce no new hues.

The organising idea is that **arbitrary placement is the enemy**. Every defect measured in the
current fins viewer traces back to labels positioned by per-label pixel arithmetic. So the system
these sketches land on is one where offsets are structurally constrained: dimension lines snap to a
small fixed set of rails, and a new label must join a rail or define one, never land wherever it
happens to fit.

## Reference Points

- Traditional drafting / engineering-drawing conventions (extension lines, end ticks, value in a
  break, reference dimensions in parentheses, long-short-short centreline)
- Real full-size shaping templates, which the audience already reads
- The app's own `--outline-*` token palette in `app/globals.css`

## Sketches

| # | Name | Design Question | Winner | Tags |
|---|------|----------------|--------|------|
| 001 | viewer-callout-system | What grammar should dimension callouts use? | **D — Hybrid** (rails) | viewer, callouts, svg, drafting |
| 002 | input-output-distinction | How to distinguish computed values from user inputs? | **C — Dual system** (chips vs dimension lines) | viewer, information-design |
| 003 | stringer-and-station-lines | Should the stringer read differently from station lines? | **B — Distinct centreline** | viewer, reference-lines, consistency |
| 004 | clean-interior-svg | Where do values go once nothing may sit inside the outline? | **A — Aligned rail** | viewer, callouts, svg, refinement |

## Decisions These Lock In

1. **Callout grammar** — drafting dimension lines, every one snapped to a fixed rail. Shortest
   dimension nearest the part. Short spans place their value outside the ticks.
2. **Inputs vs outputs** — distinguished by *system*: computed values get dimension lines, inputs
   get gutter chips under a labelled header. Not by colour, not by punctuation.
3. **Per-page content** — Fins shows outputs only (inputs are in the sidebar and were judged
   clutter). Template shows both, because its dimensions are the subject of the screen.
4. **Reference lines** — stringer `16 4 4 4`, station lines `5 4`, both faint and identical on
   every page. The mid-length **centreline is static too**, so it shares the stringer's dash.
5. **Nothing inside the outline but faint lines** — no text crosses the silhouette (sketch 004).
6. **Outputs right, inputs left** — derived widths on one aligned right rail; input chips in the
   left gutter, each naming its own value. Length centred above the nose.
7. **Widepoint is an input even at centre** — drawn as rail markers, never a line across the board.
   Centre width is a derived output. On the current board they are 0.36" apart and both read 19",
   which is precisely why they need different treatments.
8. **Labels are SVG `<text>`**, not absolutely-positioned HTML.

## Open Questions

- If the fins diagram is ever printed standalone, its inputs lose the sidebar. Reintroduce as chips,
  or use sketch 002 variant B's parenthesised reference dimensions for print only. Undecided.

## Affected Components

`components/outline/outline-viewer.tsx`, `components/fins/fin-viewer.tsx`, and their consumers
`outline-editor.tsx`, `fin-placement-editor.tsx`, `board-summary.tsx`, `preset-card.tsx`.
