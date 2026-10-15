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
  the step, so the run alone decides the step's length: a square 3/8" step rounds up to 3/16", a 1" run allows nearly
  3". The founder: "more of a radius rounder on the wing's outer and inner points rather than also adjusting along
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

**Adding the first wing** switches on a **Show fins** setting under TEMPLATE's Settings (marks only, no dims) and
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

**Grab points follow the viewer's Show construction setting** (the toolbar's target button or the Settings tick), as
the VIEWER's own drag points do: two per wing, drawn like the app's drag targets (a ring with a dot). The outer one
slides the wing along the curve (or sets the fin offset when locked); the inner one hangs 22 units below the inner
corner on the depth dimension's own line and sets the depth (in and out) and the run (along). **The view holds still
while a grab point is held.**

**Callouts on the close-up** keep the drafting grammar: WING chips in the left gutter with a leader to the outer
corner (named `WING 1 · FIN` when locked, in the fin colour); the station from the tail as a vertical dimension at
the far left; the depth as a short two-tick dimension in clear air just tail-ward of the inner corner, its value
outside the ticks; the run as a vertical dimension beyond the extension lines; and on the right rail the widths
ahead of and behind each wing with Tail @ 12" and the tail block, pushed apart when they would touch, an L-shaped
leader keeping each at its true station. Nothing crosses the board but faint lines.

**Every label fits** (quick 261015-hz7, 2026-10-15, after the founder's walk at 1024 × 768):
- The close-up's full frame has a **268-unit right rail** (was 240), so the longest read-out, "Ahead of wing 2", fits
  at the pinned floor with room to spare; read-outs and chips are also kept inside the drawing top and bottom (a
  stinger with wing 2 just behind it used to push "Center" off the top).
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
