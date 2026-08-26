---
id: 260826-kim
slug: faint-line-on-the-inside-edge-of-the-landing-card
date: 2026-08-26
type: quick
status: complete
---
# A second faint line, inside the sand frame this time

## The Slate trade-off (read this first)

The new line uses the app's faintest line colour, because you asked for a faint line. In
three of the four themes — Daylight, Chalk and Phosphor — that is the exact same colour the
design screens use for the equivalent edge, so the card matches them pixel for pixel. Slate
is the exception: there the faint colour is much darker than the design screens' edge
(measured 1.43:1 against the sand, where 3:1 is the point a line becomes reliably visible),
so on Slate this new line is very quiet — **how quiet, on an actual screen, is not yet
confirmed.** I don't have a browser to drive in this session, so Task 2's on-screen look at
all four themes is still outstanding (see below). If you want it to read the same on Slate as
it does on `/design/rails`, say so and it becomes a one-word change: `line-faint` to `line`,
which alters nothing in the other three themes.

## What changed

The board card on the landing page already had one faint line, around the drawing itself
(added in 260826-ist). This task adds a second one, one layer out: where the sand-coloured
frame meets the white box that holds the drawing. That's the "line on the inside of the
canvas coloured border" the founder asked for after looking at the rebuilt card.

One line of code changed in `components/setup/preset-card.tsx`: the box that holds the board
drawing (`rounded-lg bg-surf-tab-active p-3`) now also has `border border-surf-line-faint`.
Nothing else on the card moved — the card's own resting edge is still invisible (it only
lights up on hover/keyboard focus), the drawing's own line is untouched, and the file's two
explanatory comments were rewritten to describe the card as it now stands (previously one of
them literally said "don't add an edge to the window box," which this task does on purpose).

The card now has two faint lines nested inside each other, by design: the outer one (new)
between the sand and the window, and the inner one (existing) between the window and the
board's own surface. The `Continue Current Board` card has no drawing to frame, so it is
untouched — it never got a window box in the first place.

## Why it's doing more work than one line usually would

In every theme, the page background, the window box and the board's own background panel are
all the *same* colour — only the sand frame is a distinct colour. So these two hairlines
aren't decoration on top of visible colour changes; they're the only thing separating three
otherwise-identical surfaces from each other. That's why the comment in the file calls this
out explicitly: simplifying either line away would make the middle of the card disappear into
one flat block.

## Geometry: the well got a hair narrower, not smaller

Adding a 1px border to the window box shrinks the space inside it by 2px (1px each side) —
the board drawing area you actually see (the "well") goes from 443px to 441px wide, and the
card gets about 4px shorter overall because the board's proportions (340:620, unchanged)
scale down by that same hair. The window box itself and the sand frame around it don't move
at all. This is the border's own thickness, not a change to the board's shape — the drawing
keeps its exact upright proportion.

## Verified so far

`npm test` (670 tests, all green) and `npm run lint` (0 errors, pre-existing unrelated
warnings only) both pass. All four of the plan's automated grep checks matched: the window
box has its new line, the drawing's own line survived untouched, the card's resting edge is
still transparent, and the stale "don't add an edge here" comment is gone. `git diff --stat`
touched exactly the one file the plan named. The two cards' outer button styling is still
byte-for-byte identical (`BUTTON_CLASSNAMES_IDENTICAL`).

## Task 2 — browser measurement, completed by the orchestrator

Run against the live dev server, each theme loaded through the real `shaper-theme` localStorage path. **Slate was checked first**, as the plan required.

### The Slate verdict, in plain words

**It reads as a line — quiet, but there.** Not a smudge, and not invisible. The reason the computed 1.43:1 undersells it: the new hairline (`#333842`) is the *lightest* of the three tones in that corner, sitting at a junction where the sand frame (`#1a1d25`) and the window (`#12141a`) already differ. It registers as a light edge against both rather than having to carry the boundary alone. It is still clearly softer than the same edge on `/design/rails`, which uses `--surf-line` (`#6a707c`).

So the trade-off this SUMMARY leads with is real but milder than predicted. The one-word flip to `--surf-line` (3.39/3.70 on Slate, byte-identical in the other three themes) remains available and unexercised.

### The full stack, measured

| Theme | Page | Frame (canvas) | **New line** | Window (tab-active) | Well line | Well (panel) |
|---|---|---|---|---|---|---|
| Daylight | `#ffffff` | `rgb(223,220,211)` | `rgb(137,124,88)` | `#ffffff` | `rgb(137,124,88)` | `#ffffff` |
| Chalk | `#ffffff` | `rgb(223,220,211)` | `rgb(137,124,88)` | `#ffffff` | `rgb(137,124,88)` | `#ffffff` |
| Slate | `rgb(18,20,26)` | `rgb(26,29,37)` | `rgb(51,56,66)` | `rgb(18,20,26)` | `rgb(51,56,66)` | `rgb(18,20,26)` |
| Phosphor | `rgb(5,8,5)` | `rgb(20,36,20)` | `rgb(62,120,62)` | `rgb(5,8,5)` | `rgb(62,120,62)` | `rgb(5,8,5)` |

Six layers, two drawn lines, in every theme. The card's own resting border measured transparent throughout — the sand band is still the outer boundary, as intended.

### Layout — matched the plan's prediction exactly

The plan predicted the well would go 443px → 441px and the aspect ratio would hold. Measured: window **467px** (no drift), well **441px**, SVG **439px**, aspect **0.5484** against a target `340/620 = 0.5484` — exact. The grid still renders four even 493px columns. Nothing clipped: the window box stayed `overflow: visible` and the well `overflow: hidden`, and the board drawing sits inside both lines rather than under either.

### Interactive states — each read in a call separate from the one that triggered it

- **Hover** — `:hover` matched, border `rgb(43,66,76)` (accent-ink), 2px accent ring.
- **Keyboard focus** — `:focus-visible` matched, same border and ring.

No console errors in any theme.

## Self-Check: PASSED

- FOUND: components/setup/preset-card.tsx
- FOUND: 786d571 (Task 1 commit)
