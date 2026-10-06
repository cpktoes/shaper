# Board Rack (home page)

## Design Decisions

**The section.** "Your Boards" on `/` becomes the **Board Rack** (the founder, 2026-10-05). It holds the
shaper's saved boards and the one unsaved board in progress, above "Shape a New Board" (presets unchanged).

**The picture.** Boards stand on their tails like a shop rack, rail facing you:
- **One true scale for every board, on one floor line.** A 9'4" log stands taller than a 5'2" Mini Simmons,
  and rockers compare side by side. The scale is set by the tallest board in the rack (never smaller than
  a 7'0" reference), shared by every row.
- At rest each board shows its **side profile**: the rocker up to the deck, from `BoardSideProfile`
  (`rockerAt`, `deckAt`), deck facing right, so the tips curl right.
- Each board's **name and dims** run up beside it in **one line of vertical text**, reading tail to nose
  (bottom to top). The name is semibold ink, then the card line (`formatSummaryLine`, so Imperial or
  Metric per Rule 2) in muted ink. 12px on a computer, 11px on a phone, shrunk to fit if a line is too
  long for the rack height.
- **Drawing look** (010 A beat a shop-rack look): board fill (`--surf-board-fill`), ink edge (about 1.1px),
  faint dashed height lines every foot from 4' (every 50 cm from 150 in Metric), labelled at the left, and a
  floor line in `--surf-line`. The stringer is drawn with the drafting centreline dash `16 4 4 4` (sketch 003)
  and fades in as a board turns. No text crosses a board (sketch 004's rule).

**The turn.** The board you're on **turns its real turn** to show its outline. The turn is not an
animation of a picture: each station's cross-section is projected at the turn angle θ, from the board's own
numbers (formula below). At 0° it is exactly the side profile, at 90° exactly the TEMPLATE outline (with a
swallow's notch). As it turns the rail swings away, the deck comes round and the stringer slides from the
rail edge to the centre. The turning board's vertical words fade out, because its caption carries them.

**Computer (010 A, "Follows the cursor").**
- Boards turn as the cursor sweeps along. Each board's turn follows its distance from the cursor (two
  half-turned when the cursor sits between them), and when the cursor rests for about 180 ms the nearest
  board finishes turning.
- **The rack opens around a turning board:** neighbours slide aside symmetrically, so the turning board
  stays under the cursor.
- The last board the cursor touched **stays turned** when the cursor leaves, so the shaper can move down to
  its caption: name (20px semibold), card line, "Last touched …", OPEN THIS BOARD, and the ⋯ menu (Move left,
  Move right, Rename…, Duplicate, Delete…). The unsaved board's caption is "IN PROGRESS — NOT SAVED",
  name, card line, CONTINUE THIS BOARD, and no ⋯ (as today).
- Click a board to open it. On the keyboard, arrows walk the rack, Enter opens, and Alt + arrow moves the
  turned board.
- Rows: 48-dot slots. The rack is 380 dots tall for one row, 290 when it wraps to two or more rows. A row
  holds as many boards as fit beside a reserve for the widest turned outline. Rows are balanced (30 boards
  make 15 + 15).

**Phone and iPad (009 B).**
- The rack is a sideways scroller, edge to edge, that snaps one board to the middle. **Every board turns
  as it passes the middle, following the thumb**, and the rack settles with one board fully turned, its
  caption underneath.
- Tap a board at the side to bring it to the middle; tap the middle board (or Open This Board) to open it.
- 40-dot slots. The rack height is what's left of the first screen after the heading, the caption and the
  "Shape a New Board" heading (357 dots on an iPhone 14's 390 × 664 page), so Shape a New Board stays on
  the first screen however many boards there are.

**Your order (the founder: "the user must be able to reorder the board rack").**
- Today's automatic order (unsaved first, then most recently touched, `lib/models/rack-order.ts`) becomes
  only the **starting** order. After that the rack keeps the shaper's order.
- **Computer:** press a board and drag it more than 6 dots. It lifts (edge-on, 12 dots up, accent outline),
  the others slide over, an accent mark under the floor shows the gap, and letting go drops it, into another
  row too. A click without a drag still opens. ⋯ → Move left / Move right, and Alt + arrow, do the same
  without dragging.
- **Phone (011 A, "Hold and drag", tried on the founder's phone):** hold a board still for about 420 ms.
  It swells slightly from about 120 ms, then lifts and turns accent blue. Slide it and let go. Moving more
  than 8 dots before the hold completes is a swipe, and the rack scrolls as normal. Within 46 dots of the
  screen's edge the rack scrolls along with the board being carried. The dropped board comes to the middle
  and turns. The heading reads "15 boards · hold to move".
- **The unsaved board stays first and can't be moved** until it's saved (confirmed by the founder). It has
  no stored place, and nothing can be dropped in front of it. Trying says "The unsaved board stays first
  until it's saved".

## The turn maths (port to `lib/geometry/`, pure and tested, per Rule 1)

```js
// Per station i (tail = 0 to nose = length, mm): r = rockerAt, d = deckAt, h = outline half-width.
// The cross-section is taken as an ellipse: half-width h by half the thickness (d − r) / 2.
// tMid = max(deck) / 2 — the turning axis, so the side view and the outline both sit centred.
// Screen x (mm, relative to the board's axis) at turn angle θ:  x = t·cosθ − w·sinθ  ⇒
const xc  = ((r + d) / 2 - tMid) * Math.cos(θ);
const ext = Math.sqrt(((d - r) / 2) ** 2 * Math.cos(θ) ** 2 + h ** 2 * Math.sin(θ) ** 2);
// left edge = xc − ext, right edge = xc + ext; y = floorY − station·scale.
// At θ ≥ ~89.5° draw the exact TEMPLATE silhouette instead (it carries the swallow notch).
// Stringer (w = 0, t = deck): x = (d − tMid)·cosθ — on the rail edge at 0°, the centreline at 90°.
// Half-extent of the whole picture (for spacing and the vertical words):
//   sqrt((sideW/2·cosθ)² + (outW/2·sinθ)²), sideW = max(deck)·scale, outW = 2·max(h)·scale.
```

Sample about 64 stations (the sketches used 64; `screen-tiles.ts` uses 60 for the side profile). Every
input already exists on the design store and on a saved board's snapshot: the side profile from
`buildBoardProfile` (as `summarizeDesign` builds it, from the board's own copy of its blank), and the
outline from `buildOutline` / `sampleOutline` / `geometry.points` (as `outlineTileArt` draws it).

## CSS Patterns

```css
/* phone rack: a native sideways scroller with one snap point per board */
.rack-scroller { overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain; touch-action: pan-x pan-y; scrollbar-width: none;
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.snap { position: absolute; top: 0; bottom: 0; scroll-snap-align: center; pointer-events: none; }
/* padding so the first and last boards can reach the middle: padL = padR = (width − slot) / 2 */
.rack svg { overflow: visible; touch-action: none; }           /* computer: one SVG for all rows */
.rack svg.dragging { cursor: grabbing; }
.spine { font-size: 12px; } .spine .nm { font-weight: 600; fill: var(--surf-ink); }
.spine .dm { font-weight: 500; fill: var(--surf-ink-muted); }
```

Vertical words are SVG `<text>` turned with `rotate(-90)` from a point on the floor beside the board (the
glyphs sit to the left of that point). Use no CSS 3D and no scroll-driven animations: old Safari (the
founder's iPad, shapers' older iPhones) must work.

## HTML Structures

```html
<!-- computer: one SVG, every row inside it; each board is a group moved by a transform -->
<div class="rack">
  <svg>  <!-- per row: dashed height lines + labels, floor line -->
    <g class="boards">
      <g class="bd" transform="translate(x y)">          <!-- x = slot + room for a turning neighbour -->
        <g class="lift"><path class="body"/><path class="str"/></g>  <!-- path drawn at x = 0 -->
        <text class="spine"><tspan class="nm">Daily Driver</tspan><tspan class="dm" dx="7">6'0" · 18 1/2" · 2 3/16" · 27.6 L</tspan></text>
      </g>
    </g>
    <g class="over"><!-- the board being carried, and the drop mark --></g>
  </svg>
  <div class="dcap"><!-- caption, placed under the turned board's row --></div>
</div>
<!-- phone: .rack-scroller > .rack-track (width = padL·2 + n·slot) > .snap × n + one SVG -->
```

Positions in the sketches: a board's drawn x = its slot's x (eased when the order changes, about 110 ms)
plus the room the rack makes around turning boards, applied straight from the turn so it never lags the
thumb. A carried board follows the finger or cursor exactly and is left out of the room-making.

## What to Avoid

- **A shop-rack look** (010 B): white foam boards, a wall, a floor rail, lifted boards casting shadows.
  Rejected for the drafting look; lifted boards also covered their neighbours' names.
- **Per-board scale** (fitting each board to its card): it loses the length and rocker comparison, which
  was the point.
- **"Snap, then turn"** (009 A) and **"the board you're on" only** (010 turn option): calmer, but the
  founder chose the turn that follows the thumb or cursor.
- **A big held-up board above a short strip** (009 C): a larger outline for a smaller, less comparable rack.
- **An Arrange mode with grips** (011 B) and **‹ Move › buttons** (011 C) for moving boards on a phone.
  (⋯ → Move left / Move right stays on a computer as the no-drag way.)
- **The warning colour on the unsaved board.** It's informational, never a warning (as on today's card).
- Pegs or rails drawn over the vertical words.
- A click handler added again every time the rack is rebuilt. In the sketches it made one tap act two or
  three times, so a ⋯ menu opened and shut at once.
- Deciding hover-rack versus swipe-rack by width. It's a **pointer** question (a mouse hovers, a finger
  swipes), and that is a new job for the `coarse` pointer variant, which today only sizes controls.

## Measured (sketches 009–011)

| | Today | Board Rack |
|---|---|---|
| iPhone 14 page (390 × 664), 15 boards | 1 board on the first screen; about 6,600 dots of scrolling to reach Shape a New Board | Shape a New Board on the first screen; 5 boards at the start, 9 across mid-rack |
| 1440 × 900 browser, 15 boards | 4 boards on screen; Shape a New Board about 1,585 dots further down | all 15 on screen, at about 3.4 dots per inch; Shape a New Board's heading peeks in |

## Origin
Synthesized from sketches: 009, 010, 011 (2026-10-05)
Source files available in: sources/009-phone-swipe-rack/, sources/010-sideways-board-rack/,
sources/011-phone-rack-reorder/ (each `index.html` is self-contained, with the 30-board quiver worked out by
the app's own calculators; the scripts that made them are in `.planning/sketches/*/sketch-source.tar.gz`)
