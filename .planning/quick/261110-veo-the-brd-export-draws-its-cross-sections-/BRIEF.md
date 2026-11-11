# Brief — quick 261110-veo: the .brd's cross-sections drawn the way AkuShaper draws them; a swallow written as a square tail

Follows quick 261110-tvk (same branch, `close-bottom-17`; its BRIEF, PLAN and SUMMARY are in
`.planning/quick/261110-tvk-export-3d-files-downloads-one-akushaper-/` — read them). That task wrote the `.brd`;
the founder opened our three sample files on 2026-11-10. This task fixes what he found.

## What the founder found (his words and pictures, 2026-11-10)

- The Deep Single + 4 channels Shortboard opens in both programs and reads 2-3/16" thick (right — AkuShaper measures
  the stringer from our rocker and deck curves). But in **Shape3D's 3D view the bottom is "there, but messy"**: the
  concave and channels show, torn into zigzag facets all along the bottom and the tail rail.
- The Fish opens in AkuShaper's 2D views, but **AkuShaper does not plot it in 3D**, and **Shape3D drops the swallow**
  and shows **ripples along the tail rail**.
- "fish files on the aku site don't have swallows cut, just a big wide tail."

## Why (measured on his four AkuShaper files vs our three)

| | AkuShaper's own files | Ours (261110-tvk) |
|---|---|---|
| sections | 5–7 along the board (plus a one-knot section at each tip) | ~50 |
| knots per section | **the same on every section — 5** (one Fryer tail section 4) | anything from 5 to 16, changing section to section |
| outline | x only ever increases, tail → nose | the Fish's turns back (crotch at x = 6.98 cm → swallow point at x = 0) |

Shape3D (and AkuShaper's 3D) build the surface by joining knot i of one section to knot i of the next, and read the
outline as a half-width at each distance along the board. Mismatched knot counts give the zigzags; an outline that
turns back is not drawn.

How a square tail is written in his files: the outline's first knot is `(0, 0)` and the next is `(0, half-width)` at
x = 0 — a straight line out from the stringer at the very end — then on up the rail (the Scoop: knots at x = 0.0, 0.0,
151.9…). Each of his sections, knot by knot: (1) the bottom at the stringer (0, 0) with a horizontal handle mirrored
to negative x; (2) the bottom near the rail, where the bottom turns up into the rail; (3) the rail's widest point;
(4) the deck shoulder; (5) the deck at the stringer (0, thickness) with a horizontal handle. Read the four unscrambled
files for the exact handles: `/private/tmp/claude-501/-Users-kontoes-Code-shaper/86389bad-1284-4de0-86f8-1a82686fc51e/scratchpad/brd/out/*.brd.txt`
(other shapers' boards — read only, never copy into the repo or a fixture).

## What to build (decisions — mine, for the founder to overrule at his look)

1. **Every section on a board carries the same number of knots, and knot i is the same place on every section.**
   The base set is AkuShaper's five, in the order above. A bottom that needs more (a vee's crease is already knot 1;
   a double concave's ridge/trough; each channel wall) gets a fixed number of extra bottom knots for the WHOLE board,
   sitting between knots 1 and 2 in a fixed order. On a section where that feature is absent (no channels yet that far
   forward, a flat nose), the extra knots still appear, placed on the bottom curve at the lateral spot the feature would
   take, smooth (`continuous` true) with handles along the curve, so the count and order never change. A real corner
   (a channel wall) is `continuous` false where it exists. Knot positions come from the board's own geometry (the
   stringer, the rail's widest point, the tuck, the channel walls' lateral places), not from an automatic fitter's
   choice; only the handles are fitted (least squares to the surface's slice points between each pair of knots).
2. **Fewer sections, at chosen stations**, like AkuShaper: one near each tip, 12" from each tip, the wide point, and
   wherever the bottom changes (each cut's start/deepest/end, the channels' start, deepest and end); roughly 8–14 in
   all, plus the one-knot sections at each tip. Measure and report how far a section sits from the surface at its own
   station (target within 1 mm; report the worst), and, as information only, how far a straight blend of two
   neighbouring sections (scaled to the outline's half-width and the rocker/deck thickness at the midpoint) sits from
   our surface halfway between them.
3. **A swallow is written as a wide square tail** at the width of the swallow's points: outline `(0,0)` → `(0, half
   the tail's width at its points)` (sharp knot) → up the rail, x never decreasing. The sections and the rocker/deck
   between the tail and the notch's crotch are written as if the notch were not cut (the stringer lines carried back to
   x = 0 from the bottom and deck at the points). A diamond tail is unchanged (its outline never turns back) — check.
4. **The 3D page says so, only on a swallow-tail board**: one line under the export button, in `three-d-copy.ts`:
   *"A swallow tail is written as a square tail at its points — cut the swallow by hand."*
5. Outline, rocker and deck keep the existing fit (`fitBezierKnots`, within 0.5 mm), but the outline's x must never
   decrease — add a test.
6. New sample files for the founder, written to `~/Downloads/brd-tests/from-shaper-assistant/v2/`:
   `1-Fish.brd`, `2-Shortboard-Deep-Single-4-Channels.brd`, `3-Shortboard-Flat.brd` (a scratch script with `npx tsx`;
   not committed). Also print a one-line table per file: sections, knots per section, worst section deviation.

## Rules (as before)

- Pure, tested maths in `lib/geometry/` / `lib/export/`; mm → cm through `units.ts`; never BoardCAD's code.
- Tests: every section in every written file has the same knot count (except the two one-knot tip sections); knot
  order fixed (knot 1 at x = 0 at the bottom, last at x = 0 at the deck); outline x non-decreasing for every preset and
  for a swallow and a diamond; the round trip still reads back length, width, thickness, section count; the flat
  Shortboard, the Fish and the Deep Single + 4 channels board all write. Update the 261110-tvk tests that pinned the
  old section count or knot counts.
- Keep new tests well under Vitest's 5 s per test under a full-suite load.
- Work only in `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17` (branch `close-bottom-17`); never `cd`
  elsewhere; no push, no merge. node_modules here is a real hardlinked copy now, so a dev server can start here
  (PW_PORT=3117); `npx next typegen` before `npx tsc --noEmit`. Never the whole Vitest suite in one task.
- Plain-English commit messages ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Another session is changing how channels keep their walls under the finished rail (Phase 17 gap closure, its own
  branch) — don't touch `lib/geometry/bottom.ts`'s channel maths; read the surface as it is.
