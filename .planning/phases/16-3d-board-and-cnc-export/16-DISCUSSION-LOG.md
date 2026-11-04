# Phase 16: 3D Board and CNC Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-03
**Phase:** 16-3d-board-and-cnc-export
**Areas discussed:** Where the 3D screen lives, What the board shows, Look, lighting and moving it, The export

The founder opened the phase in his own words the same evening (quoted in CONTEXT.md's domain). Before the
areas, two open todos that matched the phase were put to him: bottom contours (kept deferred) and the live
pointer coordinates on TEMPLATE/ROCKER (kept deferred, unrelated). Each area was asked as one batch of four
questions; the per-area "more or next" check was folded into the last batch's "ready for context" question.

---

## Where the 3D screen lives

| Option | Description | Selected |
|--------|-------------|----------|
| After FINS, before SUMMARY | The 3D view as the finished board; SUMMARY stays last (recommended) | |
| Last, after SUMMARY | The final look after the order form; Next from SUMMARY goes to 3D | ✓ |
| First, before TEMPLATE | The first thing a shaper sees when a board opens | |

| Option | Description | Selected |
|--------|-------------|----------|
| 3D | The founder's word; short, fits a tile (recommended) | ✓ |
| 3D VIEW | Two words on a tile | |
| BOARD | The finished board | |

| Option | Description | Selected |
|--------|-------------|----------|
| Seven tiles: four by two upright, one row sideways | 4 + 3 upright, a row of seven on a short screen (recommended) | ✓ |
| Seven tiles, 3D on its own row | Three by two as today, the 3D tile alone under them | |
| No 3D on a phone | The sheet stays six tiles | |

| Option | Description | Selected |
|--------|-------------|----------|
| View controls and the export | Switches, preset views, Reset, Export with its note; toolbar keeps zoom and full-screen (recommended) | ✓ |
| Export only; everything else on the toolbar | A near-empty panel | |
| Nothing but the board | Full-screen 3D with a small toolbar | |

**User's choice:** 3D last after SUMMARY (over the recommendation); the name 3D; seven tiles 4 + 3 upright and
one row sideways; the panel holds the view controls and the export.
**Notes:** none given beyond the picks.

---

## What the board shows

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, simple fins at their FINS placement | Plain fin shapes at off-tail, off-rail and toe-in; a switch hides them (recommended) | ✓ |
| Fin boxes only | Boxes or plugs in the bottom, no fins | |
| No fins | The shaped foam alone | |

| Option | Description | Selected |
|--------|-------------|----------|
| A stringer line down the centre, deck and bottom | A thin dark line the eye reads rocker and foil against (recommended) | ✓ |
| Stringer plus the 12-inch station marks | As a blank is marked up | |
| Plain foam, no lines | Lighting alone | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, as a switch, off by default | The blank's profile and width drawn glassy around the board, only when a blank is picked (recommended) | ✓ |
| Yes, on by default | The board always inside its blank until switched off | |
| No blank in 3D | The finished board only | |

| Option | Description | Selected |
|--------|-------------|----------|
| Say nothing | The board drawn as designed; the deferred todo carries contours (recommended) | ✓ |
| One quiet line in the panel | "Bottom drawn flat; concaves and vee come later." | |

**User's choice:** fins drawn with a switch; a stringer line; the blank ghost as a switch off by default; nothing
said about the flat bottom.
**Notes:** none.

---

## Look, lighting and moving it

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed in the room; the board turns under them | Low side lights along both rails plus a soft overhead (recommended) | ✓ |
| Lights follow the view | Always lit the same way | |
| Both, with a switch | Room lights by default, a "lights follow me" switch | |

| Option | Description | Selected |
|--------|-------------|----------|
| Raw shaped foam | White, slightly matte, stringer showing (recommended) | ✓ |
| Glassed and polished | A finished board's gloss | |
| Switchable: foam or glassed | Foam by default | |

| Option | Description | Selected |
|--------|-------------|----------|
| Contour stripes, as a switch, off by default | The zebra-stripe check (recommended) | ✓ |
| Station lines, as a switch | A wireframe laid on the foam | |
| Lighting alone | No extra aid | |

| Option | Description | Selected |
|--------|-------------|----------|
| Drag to spin, wheel or pinch to zoom, two fingers or right-drag to slide; preset views and Reset | Everything, with the touch zoom buttons kept (recommended) | ✓ |
| Spin and zoom only | No sliding | |
| Spin, zoom, slide, plus a slow auto-turn when idle | Turns by itself until touched | |

**User's choice:** every recommended option.
**Notes:** none.

---

## The export

| Option | Description | Selected |
|--------|-------------|----------|
| All three in one zip: DXF wireframe, XYZ text set, STL surface | One download, nothing to choose (recommended) | ✓ |
| DXF only | One file | |
| DXF and the XYZ set, no STL | No surface mesh | |

| Option | Description | Selected |
|--------|-------------|----------|
| On the 3D screen's panel, with a short note | "Shape3D and AkuShaper read this as a guide and fit their own curves to it." (recommended) | ✓ |
| On SUMMARY beside the print buttons | With the order form and templates | |
| Both places | | |

| Option | Description | Selected |
|--------|-------------|----------|
| The bare board only | The shaped foam alone, whatever the fin switch says (recommended) | ✓ |
| Follow the screen's fin switch | Fins on screen means fins in the STL | |

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context | Write 16-CONTEXT.md (recommended) | ✓ |
| Explore more gray areas | Two to four more | |

**User's choice:** every recommended option; ready for context.
**Notes:** none.

---

## Claude's Discretion

The drawing library (research names it; three.js through react-three-fiber is the leading candidate, loaded only
on the 3D route); mesh fineness and normal smoothing; the files' axes, units and names, and the slice stations
(research confirms Shape3D's text expectations first); the fins' outline and cant; the blank ghost's look, the
light positions and the stripe density (from pictures); the 3D tile's picture; the quiet line for a board the
surface can't be built for; how a WebGL screen is tested in headless browsers; how many go-lives (the planner
proposes, the founder decides at plan approval).

## Deferred Ideas

Reading .s3d/.s3dx and .brd files; bottom contours; a glassed look switch; lights that follow the view; station
lines as an aid; an idle auto-turn; fins in the STL; Export on SUMMARY; IGES or OBJ files.
