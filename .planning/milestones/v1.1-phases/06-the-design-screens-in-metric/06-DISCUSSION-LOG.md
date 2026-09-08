# Phase 6: The Design Screens in Metric - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-05
**Phase:** 6-The Design Screens in Metric
**Areas discussed:** cm or mm: the numbers D-02 didn't name; Sliders in Metric: steps, ends, feet/inches picker; Unit marks on callouts, labels and tables

Areas offered but not selected: Typed entry in Metric (unit inside the box or beside it; cross-system
input; the fins Base Length number box) — left to Claude's discretion following Phase 5 D-04.

Todo cross-reference: eight pending todos matched by keyword; the founder folded none ("None — leave
all eight in the backlog"), the same verdict as Phase 5.

---

## cm or mm: the numbers D-02 didn't name

**Q1 — What rule decides the numbers D-02 didn't name (fin off-tail / off-rail, toe-in, widepoint offset, tail block width, swallow/diamond depth, toe-aim distances)?**

| Option | Description | Selected |
|--------|-------------|----------|
| Along the board in cm, small stuff in mm (Recommended) | Positions along the length and widths read cm (fin 28.6 cm off tail, widepoint +5.1 cm, tail block 15.2 cm, toe-aim distances in cm); small cross-board and up-and-down numbers read whole mm (toe-in 3 mm, off-rail 29 mm, swallow depth 51 mm). Reads like a metric shaping sheet. | ✓ |
| Only length, widths and thickness are cm; every other length is whole mm | One rule to remember, every non-headline number is a mark: fin 286 mm off tail, widepoint +51 mm, tail block 152 mm. | |
| You decide | Claude classifies each number and records the table. | |

**User's choice:** Along the board in cm, small stuff in mm.

**Q2 — Fin base length (today 4 1/2", stepping 1/8", with an Override number box) in Metric?**

| Option | Description | Selected |
|--------|-------------|----------|
| Whole mm, the way fin makers quote it (Recommended) | 114 mm; FCS and Futures spec sheets give base length in mm. | ✓ |
| cm, like the other along-the-board sizes | 11.4 cm; consistent with fin position in cm, but not how fins are sold. | |
| You decide | | |

**User's choice:** Whole mm.

**Q3 — The 'Nose @ 12"' / 'Tail @ 12"' station labels (stations themselves stay at exactly 12 in; the math and goldens are pinned there). What does the label say in Metric?**

| Option | Description | Selected |
|--------|-------------|----------|
| @ 30.5 cm (Recommended) | The honest conversion, exactly where the mark is. | ✓ |
| @ 30 cm | The round number a metric blank sheet would print, but 5 mm off where the mark really is. | |
| Keep '@ 12"' as the station's name | Treats 12" as a name; leaves an inch mark on a metric screen. | |

**User's choice:** @ 30.5 cm.

**Q4 — The volume card's two imperial-only lines ('Board Area … sq in' and the '(… cu in)' figure under the litres) in Metric?**

| Option | Description | Selected |
|--------|-------------|----------|
| Area in cm², drop the cubic line in Metric (Recommended) | Litres already are the metric volume (1 L = 1000 cm³), so the cubic line would restate the litres. | |
| Area in cm², volume line in cm³ | Mirrors the imperial card line for line. | ✓ |
| You decide | | |

**User's choice:** Area in cm², volume line in cm³ — the card mirrors its imperial lines one for one.

**Continue check:** "Next area".

---

## Sliders in Metric: steps, ends, feet/inches picker

**Q1 — What does a Metric slider step by? (Today: length 1", widths and fin base 1/8", widepoint offset 1/4", rocker lifts / foil thickness / fin positions / toe-in / tail depth 1/16".)**

| Option | Description | Selected |
|--------|-------------|----------|
| 1 cm for length, 1 mm for everything else (Recommended) | Length steps by a whole centimetre the way it steps by a whole inch today; every width, position and mark steps 1 mm. | ✓ |
| 1 mm everywhere, length included | One step size; the length slider gets about 1,500 stops. | |
| Chunkier: 5 cm length, 5 mm widths and positions, 1 mm marks | Closer to today's drag feel, but widths only land on 51.0 / 51.5. | |

**User's choice:** 1 cm for length, 1 mm for everything else.

**Q2 — Where do the Metric ends of each slider sit? (Today's ends are inch numbers off the metric grid: 60" = 152.4 cm, 16" = 40.64 cm, 9" = 228.6 mm.)**

| Option | Description | Selected |
|--------|-------------|----------|
| Just inside today's ends, on the whole-cm / whole-mm grid (Recommended) | Length 153–304 cm, widepoint 40.7–63.5 cm, rocker lift 0–228 mm. Every stop a round number; nothing set in Metric can sit outside Imperial's range. | ✓ |
| Round the ends outward to tidy numbers (150–305 cm, 40–64 cm) | Easier to read at the extremes, but a board pushed to a metric end sits outside the imperial range and the next imperial drag would clamp it. | |
| You decide | | |

**User's choice:** Just inside today's ends, on the grid.

**Q3 — The Board Length control (outline, fins, volume sidebars) is a feet Select + inches Select over a 1"-step slider. What replaces the two Selects in Metric?**

| Option | Description | Selected |
|--------|-------------|----------|
| One typed cm field above the slider (Recommended) | Type 188 or 188.5 and it lands exactly; uses the Phase 5 metric parser with the existing focus/blur/Enter/revert contract. | ✓ |
| Just the 1 cm slider and its label | Simplest, but no exact half-centimetre entry. | |
| Two Selects: metres and centimetres | Mirrors the feet/inches pair, but metric shapers say "188", never "1 metre 88". | |

**User's choice:** One typed cm field above the slider.

**Continue check:** "Next area".

---

## Unit marks on callouts, labels and tables

**Q1 — Single values on screen (slider labels, viewer callouts, the rocker screen's read-outs): does each Metric value carry its own unit?**

| Option | Description | Selected |
|--------|-------------|----------|
| Every value carries its unit: 51.4 cm, 67 mm (Recommended) | The inch mark already does this on every imperial value; cm and mm share a screen. | ✓ |
| Bare numbers, unit stated once per surface | Drafting convention, but viewers mix cm widths with mm marks. | |
| Bare cm values, 'mm' only on marks | Shorter, but the shaper has to know the convention. | |

**User's choice:** Every value carries its unit.

**Q2 — Tables (rail data table, rocker datasheet, fin data panel, toe-aim table): where does the unit live?**

| Option | Description | Selected |
|--------|-------------|----------|
| Unit in the column header, bare cells (Recommended) | 'Thickness (mm)' over cells reading 67; the blank-sheet convention; imperial cells keep their inch marks. | ✓ |
| Unit on every cell, matching the imperial cells' inch marks | 67 mm in each cell; louder but self-describing, and the compact rail table prints on the Phase 7 order form. | |
| You decide | | |

**User's choice:** Unit in the column header, bare cells.

**Q3 — The rail cross-section plot draws a whole-inch grid with bare tick labels. What grid in Metric?**

| Option | Description | Selected |
|--------|-------------|----------|
| 1 cm grid, ticks labelled in cm (Recommended) | Graph-paper feel, 'cm' once per axis. | |
| 10 mm grid, ticks labelled in mm (0, 10, 20…) | Matches the mm marks on the plot, at the cost of bigger tick numbers. | ✓ |
| You decide | | |

**User's choice:** 10 mm grid, ticks labelled in mm — the grid matches the mm marks a shaper reads off the plot.

**Q4 — Typed fields (the rocker datasheet's cells, the new Board Length cm field): where does the unit show while the value sits in the box?**

| Option | Description | Selected |
|--------|-------------|----------|
| Same as the read-only values around it (Recommended) | Bare inside a unit-headed table (67); standing alone the box reads 188.0 cm, like today's inch mark inside the box. | ✓ |
| Always inside the text, even in a table | 67 mm in every box; a datasheet column would read 67 in derived cells and 67 mm in typed ones. | |
| Bare text always, unit written beside the box | A form-field adornment the imperial fields don't have. | |

**User's choice:** Same as the read-only values around it.

**Wrap-up check:** "I'm ready for context" (options: I'm ready for context / Explore more gray areas / More questions about unit marks).

---

## Claude's Discretion

- Typed entry details (metric-only fields per Phase 5 D-04, error copy, whole-mm snap, clamp to the metric bounds, one field component or two)
- How the system reaches each site (hook in the leaf vs `system` prop) and a system-aware formatting layer with a source-contract guard
- The metric bounds helper's name/shape and where per-screen metric ranges live
- Model-side snaps (`roundToSixteenthInch` in `computeRailBands`, `deckProfileStep`) unchanged per system
- Imperial label after a metric drag (rounds to 1/16" as today)
- The fins Base Length Override number box (mm, step 1)
- Outline length callout in Metric (`188.0 cm` alone), signed offsets
- Number styling of the area/volume lines; placement of `(mm)` on the rail table and `mm` on the plot axis
- Rollout order and review cadence (one screen per plan after a shared groundwork plan; human-verify per screen)
- Playwright stays uninstalled unless acceptance needs it; all plain-English copy and suffix typography (UI-SPEC)

## Deferred Ideas

- 30 cm stations for Metric (would change the math per system; own phase + fixture regeneration)
- Cross-system typed entry (an unmistakably imperial entry accepted in a metric field, for copying inch blank sheets)
- Eight reviewed todos, none folded (listed in CONTEXT.md)
