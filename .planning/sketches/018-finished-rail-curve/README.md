---
sketch: 018
name: finished-rail-curve
question: "What would the RAILS cross-sections look like with a curve showing the finished rail — the shape left once the bands are blended — drawn over today's bands?"
winner: "Blended halfway (the founder, 2026-11-02; the RAILS screen follows in quick 261102-gec on branch rails-v2)"
tags: [rails, viewer, cross-section, geometry, finished-rail]
---

# Sketch 018: Finished rail curve

## Design Question
The founder (2026-10-20): *"can we do a super fast sketch of what the rails plots would look like if we added a spline
showing what the finished rail is intended to look like?"*

Today the RAILS viewer draws each cross-section (nose @ 12", center, tail @ 12") as the straight band cuts only — the
facets a shaper cuts — and leaves the finished, blended shape to the imagination.

## How to View
open .planning/sketches/018-finished-rail-curve/index.html

The page is the RAILS screen on a computer: the Rail Band Calculator sidebar beside the VIEWER card, and **every
control is live** — thickness, Deck Profile, Family, Ratio, Sym, Hard Edge (tail), each rail's View box, and under
ADVANCED the Corner Cut Offset (and Remove), Bottom Tuck 3 (and Use Single Tuck) and Reset. The founder asked for this
(2026-10-20: "I think i need to see this with the controls active too"). The app's own `lib/geometry/rail-bands.ts` and
`units.ts` are bundled into the page with esbuild, so every band, dot and label is the app's own number; only the
finished-rail curve is new. The sliders step in inches in both systems (the labels follow Imperial / Metric).

A new **Show Finished Rail** tick box (marked NEW) sits under INPUTS — one proposal for where the real switch lives.

The bar switches variant, Blend (how far the blend has gone), Daylight / Slate, Imperial / Metric, and ↺ Default
rails puts every control back.

## The curve
Every band comes from the app itself: `computeRailBands` runs in the page on whatever the sidebar is set to.

The finished rail is built in two steps:
1. **The cut section** — the board's block with every band, the corner cut, both tucks and (on a domed deck) the dome
   sliced off. That's the faceted shape a shaper has after cutting the bands, before blending.
2. **Blend each corner** — every corner of that shape is rounded by a parabola that leaves each band at its middle, running
   along the band there. So the curve touches every band once, at its centre, and never goes outside a cut (you can't
   put foam back). The deck and bottom flats take the neighbouring band's reach. A tail hard edge stays sharp. The Blend
   slider pulls the touch points in from the middles toward the corners — at less than 100% each band keeps a flat
   strip, a partly blended rail.

This is a quadratic B-spline on the cut section's corners, the textbook "smooth curve the facets are tangent to".

### Blend style (added 2026-10-24)
The founder asked whether the finished apex really lands on the Apex Center (2026-10-24), then for both blends side by
side on the page. **Blend style** in the bar switches between:

- **Blended halfway** — the curve above: every corner blended halfway into the bands either side of it.
- **One even round** — around the apex the rail is rolled to one radius: the biggest circle that still touches the
  outline (the rail line), found by checking every cut. The arc runs from where it leaves the band above to where it
  leaves the tuck below; every other corner is still blended halfway. A tail hard edge has no round under it, so that
  section is drawn halfway. The Blend slider only moves the halfway blend.

Each plot reads out where the finished apex lands against the Apex Center (1/64" steps, or whole mm), and on a hard edge
how high the straight wall reaches. The readouts match the standalone measurement run for the founder: single tuck with
no corner cut lands on the Apex Center blended halfway and 5/64" low as one even round (nose 1/16"); two tucks land 5/32"
low on the centre as one even round, because Band 1 meets the rail at a sharper turn than the tuck does.

## Variants
- **Today** — the viewer as it draws now, for reference.
- **A: Curve over bands** — today's plot untouched, the finished rail on top as one heavier ink line.
- **B: Finished foam** — the finished cross-section shaded as the board itself and outlined by the finished rail; the
  bands thinner on top as the cuts that got there.
- **C: Foam to blend off** — like A, plus the slivers of foam the blend takes off each band edge, shaded, with how deep
  each one is (1/32" steps, or whole mm). Of two depths closer than 26 px only the deeper one is labelled.

## What to Look For
- Does the curve look like the rail you'd actually finish? (The apex: the curve crosses the rail line near the Apex Center
  dot on the default rail.)
- Which reads clearest on a busy plot — one ink line (A), a shaded board (B), or the blend slivers with depths (C)?
- The domed deck: the curve rolls the dome into the deck with no corner.

### Greenlight's chart, scaled (added 2026-10-31)
The founder pasted Greenlight Surf Co.'s "Sample Rail Band Dims" chart (for a 2 1/2" board) and its thickness table, and
asked to see it on this page, as the possible basis for the Med family — for testing only, nothing in the app changes.
**Rail bands → Greenlight chart** in the bar draws any of the chart's ten rows (picker beside it) on all three
sections, band by band as the chart defines them: the primary band from the rail mark to Deck Mark 1, each next band
from the middle of the last one to the next deck mark, the tuck as one flat band measured the same up and in (Egg and
Pinched take their footnotes' 1/2" × 7/8" and 5/8" × 1"; True 50/50 repeats the deck bands on the bottom). Every figure is
multiplied by thickness ÷ 2 1/2" for that section's own thickness. **Overlay workbook** dashes the workbook's bands
(and a hollow Apex Center) underneath. The sidebar greys what the chart doesn't use; thickness and the tail's Hard Edge
still apply. Each plot's heading lists the scaled marks; the apex readout gives the finished apex's height, its share
of the thickness, and how far it sits from the middle of the vertical band.

The thickness table is exactly thickness ÷ 2 1/2" (+0.05 per 1/8") on every row except its last: 3 1/2" → 1.35, where the
rule gives 1.40 — 1.35 is 3 3/8" ÷ 2 1/2", so that row is most likely a typo for 3 3/8". The rule runs past the table
(nose and tail included) and matches Greenlight's own nose example (a 1 5/8" rail mark becomes about 1" at a 1 5/8"
thick station). One multiplier on every figure means the chart's rail is the same shape at every thickness, scaled.

### Greenlight's four rail charts + a live Family slider (added 2026-10-31)
The founder shared four Greenlight PDFs (Google Drive, `Surfboard Shaping and Design/rails/`): Modern Medium Rail
Flat Deck / Round Tuck, Modern Medium Rail Domed Deck / Elliptical Tuck, Boxy Railbands and Knifey Railbands.
**Rail bands → Greenlight charts** draws them, with the sidebar's Thickness, Deck Profile (flat → the flat-deck chart,
domed → the domed chart on the tapered rail thickness), Family and the tail's Hard Edge live; Ratio and Advanced grey.
Family 1 = the Boxy chart, 3 = the Modern Medium chart, 5 = the Knifey chart, 2 and 4 halfway. **Family steps**
switches between *Every chart value* (deck marks 2" → 2 1/2" → 2", corner cut 0 → 1/4" → 0 follow the charts) and
*Rail mark + tuck only* (Medium's deck marks and corner cut on every family). The old Greenlight mode is now
**Sample chart**.

What the charts say: the Medium charts keep every deck mark, the corner cut and the tuck the same across their rows and
move only Rail Mark 1, by half of any thickness change — flat T/2 + 1/8", domed t/2 + 1/4" (t = true rail thickness) —
so they don't multiply everything by thickness ÷ 2 1/2" as the Sample chart's table does. At 12" from nose and tail the
"75% formula": Rail Mark 1 = 75% of the thickness there, Deck Marks 1 and 3 and the Dome Mark × 3/4. Boxy and Knifey
use the same deck marks as each other (2", 4") and differ mainly in the rail mark (1 5/8" vs 1"). The workbook's centre
section is the flat-deck Medium chart at 2 1/2" except Deck Mark 3 (4" vs 4 1/2"), the corner cut (1/16" vs 1/4") and
the tuck.

Read-ins (the charts don't say): Boxy and Knifey read as 2 1/2" boards, their rail marks carried as an offset from
half the thickness (+3/8", −1/4"; Medium +1/8"); the 75% formula applied to every family; the elliptical tuck's
second band meets the first at its midpoint; the corner cut runs 1/4" down from Rail Mark 1 to 1/4" in on the primary
band; tucks and corner cut at 12" kept as at the midpoint (Knifey's nose tuck from its chart, 3/16" × 7/16"); the
elliptical tuck drawn only on a domed family 3; Knifey's 3/8"–7/8" tuck as 5/8".

### Two settings: Fullness and Apex (added 2026-11-01)
The founder (2026-11-01), looking at their "Greenlight Rails" sheet of twelve rail types: *"how can we simplify these
rail types? I'd like to qualify them into boxy/full to knifey/thin and allow the user to define the apex %"*. The
measurements and the fit are on the "Greenlight Rails" Artifact page (claude.ai/artifact/M6qVjkpJ1KA5Br97LBDC5g),
which draws every type in the sheet on one true-scale grid. **Rail bands → Two settings** in the bar tries the result
here, on all three sections with the sidebar live.

The rule, at 2 1/2" (every figure × the rail's own thickness ÷ 2 1/2"):
- **Apex** places a 5/8" flat on the rail, centred on it. The rail mark is the top of the flat; one tuck runs from its
  bottom, as far in as it is up (45°).
- **Fullness** sets Deck Mark 1: wherever it keeps the asked-for share of the blank in the outer 3" once the bands are
  cut. Deck Mark 2 is twice as far in, the second band starting from the middle of the primary. The share is laid on
  the Family numbers: 1 keeps 86%, each step 5% less (3 = 76%, 5 = 66%). So moving the apex never changes how full
  the rail is.
- Fitted to the eleven flat-deck types in the sheet (each at its own foam and apex), it redraws them within about
  1/16" on average across the outer 4"; Mod Thin exactly, Pinched worst at about 1/8" (its long footnote tuck).

In this mode the Family slider becomes Fullness (0.6–5.4, continuous) and Ratio becomes Apex (20–55%); each section
keeps its own pair, separate from the workbook's Family and Ratio. Thickness, Deck Profile (the bands end on the
app's own dome; the apex and the scaling read the rail's tapered thickness) and the tail's Hard Edge (which drops the
tuck after Deck Mark 1 is found, so it never moves the deck bands) stay live; Sym is hidden and Advanced greyed. The
picker beside the bar loads any type from the sheet into all three sections. Overlay workbook dashes today's bands
underneath, as for the Greenlight sources.

What the fit turned up: the app's Ratio slider (30/70–70/30) can't put the apex below 30%, where Down Rail (25%) and
Angular DR (27.5%) sit; the sheet's "Boxy" row (1" rail mark, 2 1/2" reach) keeps the least foam of any type, while
Greenlight's own Boxy chart (1 5/8" rail mark) would sit at the full end; the domed Mod Med is the same rail on a domed
deck, which Deck Profile already covers.
