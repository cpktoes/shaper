# Wings (TEMPLATE page)

## Design Decisions

**What a wing is** (013 A; the founder, 2026-10-14: "construction wise, we definitely want to go A"). A wing is a
step in the outline applied AFTER today's curve. The two-span cubic Bézier in `lib/geometry/outline.ts` stays as it
is: a read-only audit the same day found it never wider than the widepoint across 164,025 slider combinations, never
folding back, smooth through the 12" stations, with the nose and tail shape already controllable; its one blemish, a
curvature jump at the widepoint, is under 1/64" in foam. Ahead of the wing nearest the nose the outline is exactly
the curve the shaper drew. Behind each wing its depth is taken out and **fades to nothing at the tail pod**, so the
tail block keeps the number on its chip; two wings add up like a staircase. Boards without wings redraw identically,
so nothing saved changes shape, and every reader of the outline (prints, FINS' tail drawing, volume, the Board Rack,
the ☰ tiles) follows through the one builder and sampler.

**Its numbers**, every one in **1/16" steps (1 mm in Metric)**, up to **two wings** per board:
- **Position** — a station from the tail, **2" to the board's centre or its widepoint, whichever is nearer the tail**
  (the founder, 2026-10-15: "the wing's position off tail should be limited by center or the widepoint, whichever is
  closer to the tail" — 35 1/2" on the default board, its widepoint; 34" on the Fish, its centre). Position marks the
  wing's outer corner (its apex), where the step leaves the curve. Saved wings beyond the top are corrected when the
  board is drawn, never rewritten.
- **The slot locks** (2026-10-15: "Only wing 1 gets lock to front fins option." "Wing 2 can lock to rear if it's a
  quad setup, otherwise no lock." "Fin edge should always be to trailing edge for the lock, so we can get rid of that
  selector."). Wing 1 may lock to the **front fins' trailing edge**; wing 2 to a **quad's rear fins' trailing edge**
  (the only setup with rear fins) and shows no lock at all on any other setup; a single shows wing 1's lock greyed
  with its note. Each lock adds an offset of −3" to +3", read from the FINS page's placement with Import Template
  ticked. There is no Fin edge picker. A lock the fins cannot honour (a rear lock left on a thruster) sits inert at
  its stored station; an old leading-edge lock opens as the trailing edge.
- **Wing 2 sits behind wing 1** (2026-10-15: "Wing 2 has to be closer to the tail than wing 1, and can't get any
  closer than 1/2" or 2x the run along the stringer from wing 1 (whichever is larger)."). Wing 2's apex stays at least
  max(1/2", 2 × wing 1's run) behind wing 1's apex — a flat of at least one run between wing 1's inner corner and wing
  2's apex — and never under 2" from the tail; the 2" floor wins when there is no room. Moving wing 1 tail-ward, or
  lengthening its run, pushes wing 2 with it; a rear-locked wing 2 is held at the limit with a note; "+ Add wing 2" is
  greyed with a note when wing 1 sits too close to the tail. The sliders and grab points stop at the same limits.
  Wing 1 is the forward wing (the front fins, or a stinger), wing 2 the aft one.
- **New wings** (2026-10-15: "drop the default wing to 3/16""): the first at the front fins' trailing edge, locked
  (11" by hand on a single), 3/16" deep, a 1/4" run, sharp; the second behind it — on a quad locked to the rear fins,
  otherwise 3" behind wing 1 by hand — 3/16" deep, a 1/2" run, rounded as far as it fits.
- **Depth** — 1/16" to 1" toward the stringer.
- **Run along the stringer** — 0 (a square step) to 2".
- **Corner radius** — rounds the outer and inner corners, capped at the largest radius whose two rounds still fit
  the step: a square 3/8" step rounds up to 3/16", a 1" run allows nearly 3". The rounds reach a tangent length
  `t = R·tan(θ/2)` beyond each end of the run, so a rounded step starts `t` nose-ward of the wing's position and
  settles `t` past its inner corner (corrected 2026-10-15, quick 261015-u8y — this note used to say the run alone
  decides the step's length). The founder: "more of a radius rounder on the wing's outer and inner points rather than also adjusting along
  the stringer appearance."

**Where it lives** (014 B). A tab beside VIEWER on the TEMPLATE page: **ADD WINGS** until the board has one, then
**WINGS · 1** or **· 2**. The tab shows the last 26" of the tail at about three times the VIEWER's scale, with the fins
drawn where FINS puts them (marks only, no dims). Once a wing passes 24" **the window grows to hold it with 3" of
room**, so the drawing shrinks gradually and the tail and fins never leave the picture ("B, window grows with wing
placement"). While the tab is open **the sidebar holds only the wing controls, in the Template builder's own dress**:
no board length or other template control ("A, sidebar swaps"). The VIEWER tab draws the whole board with the wings
applied and their chips (`WING 1 · 3/8" @ 11"`) and no wing control anywhere.

**The empty tab** (2026-10-15: "There's currently two popups. I only want the second one."): ADD WINGS draws the
bare tail with no wing and **no card over it**; the sidebar's "+ Add a wing" (on a phone, in the stacked controls
under the drawing) is the way in.

**Adding the first wing** switches on TEMPLATE's fin-placement toolbar button (marks only, no dims) and
opens a popup: *"Dial in your wing placement. Edit fin placement on the fins page, then return to the template to
fine tune the wing."* with Open FINS / Got it — every time a board goes from no wings to one.

**The founder's scaling rule** (2026-10-15): "If Wing Depth is > 3/16", recommend a distance using the formula
Distance Behind Trailing Edge = (2 × Wing Depth) − 0.25", but that they should check their fin box specs also." A wing
deeper than 3/16" whose apex sits at a side fin's trailing-edge mark (front or rear), or behind it by less than that
distance, gets one line under its Depth row in the warning ink: *"Modern fin boxes: for a wing this deep, set its apex
at least 1/2" behind the fin's trailing-edge mark (twice the depth less 1/4"). Check your fin box's spec too."* — the
distance a mark (13 mm in Metric). The zone is theirs: "at or behind the fin mark only is fine for the warning, since
the fin position jumps in based on the new narrower tail curve when the apex is above the trailing edge at all." The
centre fin is never checked. The close-up does not mark it (the drawing keeps nothing but faint lines); the sidebar
line is the warning.

**Grab points follow the viewer's Show construction setting** (the toolbar's target button, on by default since 2026-10-18), as
the VIEWER's own drag points do: two per wing, drawn like the app's drag targets (a ring with a dot). The outer one
slides the wing along the curve (or sets the fin offset when locked); the inner one hangs 22 px below the inner
corner (where the depth dimension's line was until quick 261015-my3) and sets the depth (in and out) and the run
(along). **The view holds still while a grab point is held**, at any zoom.

**Callouts on the close-up — every wing number in its card on the left, nothing on the right** (quick 261015-my3,
2026-10-15; the founder: "I don't think we need any dims on the right. Lets put all the wing data in the data cards
on the left (add a Run and Radius value to each card and an offset from fin when locked to the fin too). Tail block
can be written directly under the tail itself … This should allow the wing view to be as large as possible", then
"the tail @ 12" data can also be on the left. Nothing on the right" and "we also don't need the off tail callouts
since that info is now in the cards"):
- **A data card per wing** in the left gutter, 120 px wide on screen, with a leader to the outer corner (an L when
  spread, keeping the true station). Its head is a chip's own — the name (`WING 1`, or `WING 1 · FIN` in the fin
  colour when locked) over `‹depth› @ ‹position›` — then a hairline and 16 px rows: `RUN`, `RADIUS` (the radius
  actually drawn) and, only when locked, `OFFSET` from the fin's trailing edge (`+1/4"`, `0"`, `-1/2"`). Position is
  a dim (cm in Metric), the rest are marks (whole mm). A long value is set just small enough to keep 4 px inside each
  side of the card — the radius can reach 64" on a 2"-run, 1/16"-deep wing.
- **A `TAIL @ 12"` card** (`TAIL @ 30.5 cm` in Metric), the head alone, with a level leader to the board's left edge
  at the 12" station, spread with the wing cards in station order, every card inside the drawing.
- **The tail block's width written under the tail** on one line, `TAIL BLOCK 4"`, centred on the stringer; a pin or
  round tail has none, so nothing is written.
- **Nothing on the right** — no read-out rail, no depth or run dimension, no Center or Nose @ 12" read-out — and no
  station dimensions beside the cards. This departs from the grammar's "outputs on one right rail" for THIS view only;
  the VIEWER keeps its rail. Nothing crosses the board but faint lines.

**One frame, as large as it can be** (quick 261015-my3, D6): the left gutter is sized to the card at the drawing's own
fit, in two passes that never feed back (pass 1 at the pinned floor, pass 2 at pass 1's fit); pads are 8 on top and
16 below (32 with the tail block's words); the board **hugs the gutter**, with all the spare width on the right under
the toolbar and the zoom row; and only when the board would reach under that corner does its top move down below it.
At 1280 × 800 the 26" window went from about 18.2–18.8 to 22.1 px per inch, at 1024 × 768 from about 13.7–14.2 to
about 18, and on an upright phone by about 27%; a phone held sideways is height-bound and draws the same size (the
zoom is the way in there). The full and compact frame pair is retired.

**Lines at the VIEWER's weight** (the founder: "The thickness of the lines need to match the template viewer"): every
line weight on the close-up rides one unit, the VIEWER's own fit for the same box over the close-up's — read in the
orientation the VIEWER is drawn in, so turned on a phone held sideways — so the board line, fin marks, stringer, 12"
station, widepoint line, leaders and card edges draw at exactly the VIEWER's screen width. The dashed no-wings curve
takes the VIEWER's ghost weight (1.25).

**Zoom, like the VIEWER** ("wings tab also needs zoom capabilities like the viewer"): the shared zoom, with its own
level per tab (each tab starts at 1x, nothing saved), the zoom row under the toolbar, one finger on a grab point and
two fingers to pinch, and above 1x the VIEWER's grid behind the board counted from the tail tip and the stringer.

*History:* the close-up first drew the station from the tail as a vertical dimension at the far left, the depth as
a two-tick dimension by the inner corner, the run as a vertical dimension beyond the extension lines, and the widths
ahead of and behind each wing with Tail @ 12" and the tail block on a right rail (sketch 014 B, then a 268-unit rail
in quick 261015-hz7); all of it moved into the cards or went in quick 261015-my3.

**Every label fits** (quick 261015-hz7, 2026-10-15, after the founder's walk at 1024 × 768):
- (Superseded by quick 261015-my3's cards.) The close-up's full frame had a 268-unit right rail so the longest
  read-out fitted at the pinned floor; read-outs and chips were also kept inside the drawing top and bottom (a
  stinger with wing 2 just behind it used to push "Center" off the top) — the cards keep that rule.
- A **long wing value is set a little smaller to sit inside its chip** (`1/4" @ 30 9/16"` ran 108.7 px in a 104 px
  chip); the chip keeps its width and its place on the gutter rail, and every other chip is unchanged.
- On the VIEWER, **every chip keeps the WIDEPOINT / WP OFFSET pair's own gap from every neighbour**. Upright, the
  tail's chips step by the pair's centre-to-centre step, with LENGTH and the pair as fixed blocks (a chip landing on
  one moves to its nearer side); on an upright iPhone the pair itself no longer overlaps. Turned, the WING chips ride
  the **outer row** WP OFFSET uses — the inner row has no room beside LENGTH on a sideways phone — and are drawn first
  so their leaders pass under the inner row.

**Fins on a winged board — the founder's rule (2026-10-14):** "When marking your off-rail fin measurements on a
board with wings, you always mark from the true, actual rail line directly adjacent to where the fin is sitting,
not the hypothetical original continuous rail line. Mark your distance up from the tail first to find your fore/aft
positioning; from that exact horizontal line, measure inward from the physical edge of the foam to set your rail
gap. Fins listen to the closest piece of physical rail next to them." In the app: fin placement reads the winged
outline — the 12" tail width is the finished outline's width (it feeds the quad rear spreads, the narrow-tail
shifts and the toe-aim table), and each fin's distance in from the rail is measured from the winged rail at the
fin's own station, as Import Template already does against the drawn outline. A wing ahead of the fin moves it
inboard by the depth; a wing cut at the fin's trailing edge leaves the fin on the wider rail, because a sharp step
takes nothing at its outer corner. A wing locked to the front fin therefore settles by iteration (the fins move
the wing, the wing moves the 12" width, the width moves the fins) — at most three passes, one on an ordinary
board — and its resolved station follows the fin's edge exactly rather than snapping to a sixteenth; the offset
and every set value still move in sixteenths. With Import Template off, FINS' standalone calculator knows no wings.

**The fins read the step sharp (the founder, 2026-10-15, quick 261015-u8y).** Turning a wing's corner radius had been
moving the quad's rear fins by a few hundredths of an inch, so the founder ruled: "I think the fin placement should be
linked to the unrounded outline, so that the rounding has no affect on fin placement. It's the wing position that
does." In the app: every fin calculation — the 12" width, each fin's distance in from the rail, and the wing lock —
reads the winged outline with each corner radius set to 0 (`outlineForFins`), so a radius never moves a fin, while a
wing's position, depth and run still do. FINS and every other drawing keep the rounded corners ("keep the rounded
corners on the FINS drawing."), and a fin's in-from-the-rail is measured to the sharp step, not the drawn rounded rail.

## The step, as maths
Stations `s` along the board from the tail; the curve's half-width `hw(s)`; inches throughout.
- Corners: outer `(S, 0)`, inner `(S − run, depth)`, along the board and inward.
- Turning angle `θ = atan2(depth, run)`; tangent length `t = R·tan(θ/2)`; the two rounds fit while
  `2t ≤ √(run² + depth²)`, so `R_max = (√(run² + depth²) / 2) / tan(θ/2)` and `R = min(asked, R_max)`.
- The step is a polyline: an arc of radius `R` from `(S + t, 0)` about `(S + t, R)` onto the step leg, straight
  along the leg, then an arc about `(S − run − t, depth − R)` to `(S − run − t, depth)`. The share of depth `p(s)`
  is 0 nose-ward of `S + t`, 1 tail-ward of `S − run − t`, and follows the polyline between (a square step's
  vertical part is a double point at `S`).
- Construction A: `hw(s) − Σ depthᵢ · pᵢ(s) · fadeᵢ(s)`, `fade` linear from 1 at the wing's inner corner to 0 at the
  tail pod, the result clamped to `[0, widepoint half-width]`.
- The window: `[0, 26"]` until the furthest wing's position passes 24", then `[0, min(length, position + 3")]`.
- Checks that proved the sketch: every arc point is `R` from its centre; `p` runs steadily 0 → 1; with no rounding
  the step is the straight line from corner to corner; with no wing the outline is the base curve exactly; nothing
  ever rises above the widepoint or below zero; A keeps the tail block.

## HTML Structures
```html
<!-- the tab strip entry, on the existing TabbedPanel -->
{ id: "wings", label: wings.length ? `WINGS · ${wings.length}` : "ADD WINGS" }

<!-- a sidebar row, in the Template builder's dress (SliderRow's "Label — value", then the slider, then the end words) -->
<div class="lbl">Corner radius — 3/16"</div>
<input type="range" min="0" max="0.1875" step="0.0625">
<div class="ends"><span>Sharp</span><span>Round · 3/16" fits</span></div>

<!-- the empty tab: the bare tail only; the button lives in the sidebar (the sketch's centred card was removed 2026-10-15) -->
<button>+ Add a wing</button>
```

## What to Avoid
- Carrying the depth all the way to the tail (013 B): the block narrows by twice the depth and a pin or round tail
  reaches nothing early.
- Adding width ahead of the wing (013 C, a flyer): not what shapers mean by a wing here.
- Smoothing as a length along the stringer (013's first model): it lengthened the step; the founder wants a radius.
- Wing controls in a column inside the tab beside the drawing (014 round one, B): costs the close-up a quarter of
  its width and keeps the template controls in view.
- Jumping to the whole board past 24" (014 A): the wing's dimensions fall to the VIEWER's scale. Following the wing
  with a sliding window (014 C): the tail and fins leave the picture.
- A window that re-frames itself during a drag: a 1" pull carried the wing 4 1/2" in the sketch's own drag check.
- Two grab points on a sharp step's corners overlap and the later-drawn one eats every grab: hang the second off
  the corner.
- Replacing the outline curve (B-spline or G2 Bézier) for the sake of wings: a phase-sized job, since a saved board
  is its slider settings and every board would redraw, for a widepoint curvature match worth under 1/64".
- A floating card over the empty tab beside the dial-in pop-up: the founder read it as two pop-ups (2026-10-15).
- A leading-edge lock, or a Fin edge picker: the lock always follows the trailing edge (2026-10-15).
- A wider WING chip to hold a long value: on the VIEWER at the pinned floor its gutter holds 162 units against a
  157.6-unit chip, so it would clip; set the value smaller instead.

## Open Questions — settled
The founder ruled on the four left open, after the first build (2026-10-15), each as built: a wing's **position
marks the apex of the wing, the outer rail break point** where the step leaves the curve; the dial-in popup opens
**every time a board goes from no wings to one**; the corner-radius slider stops at **the largest round that fits**
the step; and coming back from FINS **lands on VIEWER**.

**Two wings close together** (settled 2026-10-15, quick 261015-hz7): wing 2 now always sits at least max(1/2",
2 × wing 1's run) behind wing 1, and the close-up keeps every chip and read-out inside its drawing, so the crowding
sketch 015 would have explored cannot happen.

## Origin
Synthesized from sketches 013 (wings-on-the-outline, A) and 014 (wings-tab, B), 2026-10-14, with the founder's
rulings of the same day. Sources in `sources/013-wings-on-the-outline/` and `sources/014-wings-tab/` (each
`index.html` carries the curve code and the five boards' real fin placement). The manifest's decisions 16–17 hold the
same in short form.
