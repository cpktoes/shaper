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

### Phone chrome (sketches 007–008, 2026-10-03)

The founder's rule for phones — "phone real estate is expensive, we need to save all of it" (Phase 13 item
9e) — applied to the six-screen tab bar: move the screens into the ☰ menu the way a sideways phone already
works, and let each screen end with a step-by-step "next screen" button so the usual walk through a board
needs no menu ("almost wizard like"). These two sketches use the app's own slate and daylight palettes
(`themes/app-slate.css`, `themes/app-daylight.css`), not the drafting palette above.

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
| 005 | horizontal-board-view | What does the Template screen look like with the board horizontal, nose left? | **C — Full-bleed** (layout premise superseded by 006) | viewer, layout, callouts, svg, post-mvp |
| 006 | orientation-switch | How does the shaper turn the board horizontal, without moving anything else? | **Rotate in place**, button in the viewer's upper-right | viewer, layout, icon, interaction, post-mvp |
| 007 | phone-screens-in-menu | With no tab bar at the bottom, how does an upright phone show which screen you're on and take you to another? | **C1 — Tiles from your board** (☰ sheet of six tiles, each drawn from the current board; no bottom tab bar) | phone, layout, navigation, chrome |
| 008 | next-screen-button | What does the step-by-step button under the last control look like? | **B — Back + Next** ("Together" tab: on 007-C1) | phone, navigation, wizard |

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
7. **Widepoint is an input even at centre** — it gets its own station line in the widepoint colour
   on a dotted dash, plus rail dots. Centre width is a derived output on the static centreline. On
   the current board the two lines land 4px apart and both widths read 19", so **colour is what
   separates them** — a dash difference alone is not legible at that distance. (Revised 2026-08-22:
   originally dots only, which read as an absence rather than a station.)
8. **Labels are SVG `<text>`**, not absolutely-positioned HTML.

9. **Phone screens move into ☰ as tiles drawn from the current board** (sketch 007 C1, round 2,
   2026-10-03) — on an upright phone the six-screen tab bar goes; ☰ opens a sheet of six tiles (the
   current one ticked) above Home, Contact, Privacy, Units, Theme and the account. Each tile is its
   screen's own drawing of the board, labels left out; Volume shows the board's real litres (never a
   made-up number). The 56 freed dots go to the controls (122 → 178 on an iPhone 14).
10. **Each design screen ends with Back + Next** (sketch 008 B) — "← previous" and "next →" side by side
   under the last control, in the order Template, Rocker, Rails, Volume, Fins, Summary; the first screen
   has only Next, the last only Back. ☰ is for jumping around; Back + Next is the usual walk.

## Open Questions

- Phone chrome (007/008): does a phone held sideways keep its screens list in ☰ or switch to the tiles too?
  Do Back + Next also appear on a computer, at the foot of the sidebar? Does the freed height go to the
  controls (as sketched) or should the drawing's 66% cap grow?

- If the fins diagram is ever printed standalone, its inputs lose the sidebar. Reintroduce as chips,
  or use sketch 002 variant B's parenthesised reference dimensions for print only. Undecided.

## Affected Components

`components/outline/outline-viewer.tsx`, `components/fins/fin-viewer.tsx`, and their consumers
`outline-editor.tsx`, `fin-placement-editor.tsx`, `board-summary.tsx`, `preset-card.tsx`.
