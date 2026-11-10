---
phase: 17-bottom-contours
reviewed: 2026-11-10T19:35:00Z
depth: standard
files_reviewed: 57
files_reviewed_list:
  - app/design/bottom/page.tsx
  - app/design/summary/order-form.css
  - app/globals.css
  - app/not-found.tsx
  - components/3d/three-d-screen.tsx
  - components/bottom/bottom-cartoon.tsx
  - components/bottom/bottom-controls.tsx
  - components/bottom/bottom-copy.ts
  - components/bottom/bottom-data.tsx
  - components/bottom/bottom-editor.tsx
  - components/bottom/bottom-guide-words.ts
  - components/bottom/bottom-guide.tsx
  - components/bottom/bottom-section.tsx
  - components/bottom/bottom-top-view.tsx
  - components/bottom/section-station.ts
  - components/design/board-lock-scope.tsx
  - components/design/design-store.tsx
  - components/design/phone-menu.tsx
  - components/design/phone-top-bar.tsx
  - components/design/screen-tiles.tsx
  - components/design/step-nav.tsx
  - components/fins/fin-placement-editor.tsx
  - components/fins/fin-viewer.tsx
  - components/rails/rail-band-editor.tsx
  - components/rails/rail-controls.tsx
  - components/rails/rail-section-plot.tsx
  - components/site-nav.tsx
  - components/summary/bottom-contours-sheet.tsx
  - components/summary/bottom-sheet-fit.ts
  - components/summary/order-form.tsx
  - components/template/build-overview-pdf.ts
  - components/template/export-preview-dialog.tsx
  - components/viewer/toolbar-button.tsx
  - lib/geometry/blank-reasons.ts
  - lib/geometry/board-surface-render.ts
  - lib/geometry/board-surface.ts
  - lib/geometry/bottom-draw.ts
  - lib/geometry/bottom-print.ts
  - lib/geometry/bottom-tile-art.ts
  - lib/geometry/bottom.ts
  - lib/geometry/design.ts
  - lib/geometry/fins.ts
  - lib/geometry/imported-readout.ts
  - lib/geometry/measure-display.ts
  - lib/geometry/rail-bands.ts
  - lib/geometry/rail-bottom.ts
  - lib/geometry/screen-tiles.ts
  - lib/geometry/units.ts
  - lib/geometry/volume.ts
  - lib/geometry/wings.ts
  - lib/models/bottom-report.ts
  - lib/models/design-snapshot.ts
  - lib/models/rack-models.ts
  - lib/screen-steps.ts
  - scripts/check-saved-boards.ts
  - scripts/extract-phase17-litres-pin.ts
  - scripts/extract-sketch021-bottom-golden.mjs
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-11-10T19:35:00Z
**Depth:** standard
**Files Reviewed:** 57
**Status:** issues_found

## Summary

The whole of Phase 17 was read — the new BOTTOM page, its maths, its printed sheets, and every place another page
now reads the bottom (litres, RAILS, FINS, the 3D board and the CNC files). Scope was exactly
`git diff origin/main HEAD -- . ':!.planning'`: new files in full, older files by their changed hunks. Suspicions
were tested by running the app's own `lib/geometry` functions on the stock boards, so every number below is one
the code produced, not one worked out by hand. `npx tsc --noEmit` is clean.

**One thing must be fixed before this goes live (CR-01).** Channels set to run **With the rail** with any
**Off Stringer** above zero can make the maths return "not a number" at a narrow tail. The litres then treat that
tail section as having almost no foam: on the stock Midlength with six channels the app takes off 0.42 L where the
honest figure is 0.14 L, and the 3D board and the CNC files lose the same foam. It is reachable from the sliders on
two of the four stock boards with no unusual settings, and no test covers it.

**Three things should be fixed or ruled on by the founder (WR-01 to WR-03).** A channel cut deeper than the foam at
the tail ends the whole board at that channel's wall. "With the rail" squeezes every channel together to nothing at
the pod, where the decision record (D-10) says the outer ones must run out through the rail. And the section
drawings on the screen and on the printed sheet never receive the knife edge the litres use, so they draw foam the
litres and the 3D board do not have.

**What was checked and found sound:**

- **The 3D board across every tail and wing.** 102 boards (squash, swallow, diamond, pin and round tails, winged
  boards, hard and soft rails) were each built with 35 different bottoms — 3,570 solids. None threw, none came out
  open or non-manifold, no litres were not-a-number, and no cut ever added litres. The solid and the litres agree to
  0.05 L everywhere except two places: the deep-winged Longboard, whose solid is 0.053 L under its litres with no
  bottom at all (there before this phase, not charged here), and the winged Midlength with channels With the rail
  and Off Stringer 1/2", which is CR-01 again.
- **Saved boards (priority 2).** A board saved before this phase has no bottom and opens flat, with the same
  litres. A malformed or hostile `bottom` field is refused or clamped by `parseSnapshot`; 750 random in-range
  bottoms went through it and the only failures were CR-01. Undo and redo, the board file, the open-board copy and
  the lock check on all eight new store actions hold. There is no database migration and no new package.
- **`scripts/check-saved-boards.ts --bottom-report` (priority 5).** It reuses the rows of the one read-only
  `select` the script already makes, writes nothing, never changes the exit code, and prints a board's id and its
  litres only — nothing personal beyond what the existing report prints.
- **Rule 1 and Rule 2.** No formula is inlined in a component; no `25.4` or stray `10` outside
  `lib/geometry/units.ts`; depths and wall positions read as marks, stations as dims. The figures in
  `components/summary/bottom-sheet-fit.ts` and `order-form.css` size paper, not a board.
- **The three screen switches.** Width, pointer and height are each read for their own question in every new file;
  none is conflated with another.
- **The GUIDE.** It only reads the board; no card writes a setting.
- **React.** Geometry on the drag paths is memoised and deferred; list keys are unique; new controls carry names
  and 44-dot touch boxes on a coarse pointer.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Channels "With the rail" plus Off Stringer give a not-a-number at a narrow tail — wrong litres, a collapsed 3D tail and wrong CNC files

**File:** `lib/geometry/bottom.ts:864-870` and `lib/geometry/bottom.ts:913`; it does its damage through
`lib/geometry/volume.ts:1076`

**Issue:** With Run = With the rail, each channel's width at a station is

```ts
w2 = Math.max(0, refAt(board, rule, s) - offRail - ch.offStringer) / n;   // bottom.ts:864
```

Where the tail is narrower than Off Stringer plus the Off Rail the app holds, this is exactly `0`. The loop below
it keeps a channel whenever its wall is more than 1/2 mm off the stringer (`b > CHANNEL_EDGE_MIN`, :870) — and with
Off Stringer above 1/2 mm that is true even though the channel has no width at all, so it returns channels whose
two edges are the same number (`[offStringer, offStringer]`). `channelFoamOff` then asks for the depth at that
exact point:

```ts
return mm(ch.depth * fj * Math.min(1, (b - a) / CHANNEL_PINCH) * chan((y - a) / (b - a), r));   // bottom.ts:913
// b === a  ->  depth * fj * 0 * chan(0 / 0)  =  0 * NaN  =  NaN
```

The section builder samples exactly at channel walls, so it meets that point. In `bottomedHalfSection`,
`Math.max(0, NaN)` is `NaN` (`volume.ts:1076`); `raised === h` and `raised < top` are both false for a NaN, so the
code falls into the branch written for "the lifted bottom has reached the deck" and ends the foam right there
(`railEdgeAt`). Everything outboard of the Off Stringer line is dropped from that section.

Reproduced on the stock boards, through the app's own functions:

| Board and channels | Station | Section area with the cut | Flat | Foam taken off | Honest figure (Off Stringer 0) |
| --- | --- | --- | --- | --- | --- |
| Midlength, 6 channels, 1" wide, Off Stringer 1/2", depth 5/16" | 44 mm / 87 mm | 577 / 696 mm² | 3045 / 5318 mm² | 0.4224 L | 0.1443 L |
| Shortboard (squash), 8 channels, 3/4" wide, Off Stringer 1/2" | 0 / 38 mm | 1070 / 593 mm² | 2129 / 3898 mm² | 0.2900 L | 0.1136 L |
| Shortboard (squash), 6 channels, 1" wide, Off Stringer 1/2" | tail | — | — | 0.3210 L | 0.1458 L |
| Shortboard, pin tail, 8 channels, 1" wide, Off Stringer 1/2" | 38 mm | 559 mm² | 1757 mm² | — | — |

The winged Midlength shows the same thing: 4 channels With the rail, Off Stringer 1/2" take 0.327 L off a 49.278 L
board, and the 3D solid and the litres drift 0.053 L apart there against 0.018 L on the same board left flat.

On the Midlength the foam ends 12.7 mm from the stringer on sections whose half-width is 71.8 mm and 101.9 mm — the
tail is drawn as a half-inch sliver. The same sections feed `buildBoardSurface`, so the 3D board and the DXF, XYZ
and STL in the CNC zip are pinched the same way. A shaper sees the litres on VOLUME and SUMMARY drop by about a
quarter of a litre for no reason on the board, and a machine would be sent a tail that is not the one drawn.

Everything is within the sliders' ranges (Off Stringer 0 to 9", channels 4/6/8, End at the tail by default). The
Fish and the Longboard did not trigger it — their tails stay wide enough. Of 750 random in-range bottoms put
through `parseSnapshot`, this was the only class of failure (172 hits), always `run: "rail"` with
`offStringer > 0`. No existing test sets Off Stringer on a With-the-rail run.

The top view, the section drawing, DATA and the printed sheet do not show the NaN (their samples never land exactly
on a wall), which is why it is easy to miss by eye; but `channelMarks` (:887-895) then rules the flat edge and
every wall on the same line at those stations.

**Fix:** Stop at both ends, so no one slip can reach the litres again:

```ts
// lib/geometry/bottom.ts — channelEdges: a channel with no real width is not a channel
for (let j = 0; j < n; j++) {
  const a = ch.offStringer + j * w2 - shift;
  const b = a + w2;
  const inner = Math.max(0, a);
  if (b > CHANNEL_EDGE_MIN && b - inner > CHANNEL_EDGE_MIN) out.push([mm(inner), mm(b), j]);
}

// lib/geometry/bottom.ts — channelFoamOff: never divide by a width of nothing
const span = b - a;
if (!(span > 0)) return mm(0);

// lib/geometry/volume.ts:1076 — a cut that is not a number takes nothing off; it must never end the foam
const raw = foamOffAt(mm(y));
const f = Number.isFinite(raw) ? Math.max(0, raw) : 0;
```

`bottomedHalfWithWalls` builds its section through `bottomedHalfSection` (`volume.ts:1211`), so that one guard covers the
walled sections too. Add a unit test: Midlength and Shortboard, With the rail,
Off Stringer 1/2", every station from the tail to the channels' Start — `foamOff` finite at every wall, and litres
within a few hundredths of the Off Stringer 0 figure.

## Warnings

### WR-01: A channel cut deeper than the foam ends the whole board at that channel's wall

**File:** `lib/geometry/bottom.ts:766-771` (channels are held to no floor) with `lib/geometry/volume.ts:1094-1117`

**Issue:** A concave is held to the 1/4" stringer floor, but a channel's depth is added with no limit. Where a
channel is deeper than the foam above it, `bottomedHalfSection` treats that as "the bottom has reached the deck"
and ends the section there — and everything outboard of that wall (the rest of the bottom, and the rail) leaves
the litres, the 3D board and the STL. That rule was written for a vee or belly lifting the rail (D-40), where the
foam truly ends; a channel breaking through mid-board is a slot, not the end of the board.

Reproduced:

- Stock Shortboard (tail tip 15/16"), 6 channels at 1/2" depth (the slider's own top): at the tail the foam ends
  41.9 mm out on a 50.8 mm half-width.
- Shortboard with the tail tip thinned to 1/4", the starting channels (6, 5/16" deep): the tail section ends 23.7 mm
  out of 50.8 mm; its area is 306 mm² against 617 mm² flat. At 1/2" depth, station 38 mm ends 43.6 of 84.3 mm, area
  545 against 1994 mm².
- Longboard, tail tip 3/8", 4 channels at 5/16": tail ends 50.8 of 107.9 mm, area 995 against 2013 mm². Tail tip
  1/2", 6 channels at 1/2": 29.6 of 107.9 mm.

The app does flag it, but the words are "The channels leave the rail under 1/4" near the tail: the rail is thinner
there than the floor." (`components/bottom/bottom-copy.ts:269`) — which speaks of a thin rail, not of a channel
that has gone through the board and taken half the tail's width with it.

**Fix:** Hold a channel's depth to the foam in its own column (the foam's thickness there less the floor), the way
a concave is held at the stringer, so a channel can thin the tail but never end it; or cut only the slot and keep
the foam outboard of it. Either way give this case its own sentence, e.g. "The channels cut through the board near
the tail." If the founder rules that ending the foam is what he wants, the sentence still needs changing.

### WR-02: "With the rail" squeezes every channel to nothing at the pod — the outer channels never run out through the rail (contrary to D-10)

**File:** `lib/geometry/bottom.ts:864`

**Issue:** D-10 says of the With-the-rail run that "once the gaps have closed the outer channels run OUT through
the rail, never pinching every channel", and the specifics repeat it: "never be squeezed to nothing at the pod".
The code does the opposite: it divides whatever width is left between Off Stringer and Off Rail equally among all
the channels on a side, so they all narrow together, and the 1" pinch rule (`CHANNEL_PINCH`) then shallows all of
them together. No channel ever crosses the rail.

Reproduced on the stock Shortboard, 6 channels, With the rail (set 1.75" wide, Off Rail held at 41.0 mm, depth
5/16" = 7.94 mm):

| Station from the tail | Each channel's width | Deepest point |
| --- | --- | --- |
| 0 mm | 3.3 mm | 1.02 mm |
| 35 mm | 13.8 mm | 4.33 mm |
| 70 mm | 20.6 mm | 6.45 mm |
| 105 mm and forward | full | 7.94 mm |

Midlength: at 38 mm each channel is 5.3 mm wide and 1.66 mm deep, and there are none at all at the tail. The Fish
never drops under 26.7 mm, and it is the only board the test at `lib/geometry/bottom.test.ts:1680` checks, though
that test's title claims the run-out. The code is a faithful copy of the sketch's `channelEdges`, so this is a gap
between the sketch and the written decision rather than a slip in the port — but a shaper who picks With the rail
gets six scratches at the pod instead of channels, and CR-01 is the far end of the same rule.

**Fix:** Stop narrowing at a least width (the set width, or the 1" pinch width), keep the channels at that width
from there to the tail, and let any channel whose wall passes the rail run out through it — `foamOff` already
returns nothing outboard of the rail. Or, if the founder prefers what the sketch drew, amend D-10 and the control's
words to say the channels close together at the pod.

### WR-03: The section drawings never get the litres' knife edge — the screen and the printed sheet draw foam the litres and the 3D board do not have

**File:** `components/bottom/bottom-section.tsx:96`, `components/summary/bottom-contours-sheet.tsx:348`; the unused
option is `lib/geometry/bottom-draw.ts:676` (read at `:755`)

**Issue:** `bottomSection` takes a `seam` option — the built section's `railEdgeAt`, where a lift or a channel has
met the deck and the foam ends — so the drawing ends where the litres end. Neither caller passes it:

```tsx
bottomSection(resolved, board, mm(station), height, { width: box.width, height: box.height }, { live })   // bottom-section.tsx:96
bottomSection(resolved, board, cut.deepest, 4, box, { live: null })                                       // bottom-contours-sheet.tsx:348
```

So the drawing falls back to its own slab estimate, which ends later. Reproduced:

- Shortboard, Rolled Vee at 1/2" lift: ten sections carry a knife edge. At the tail the litres end the foam at
  45.5 mm; the drawing runs to 50.8 mm. At 38 mm: 83.1 against 84.3 mm.
- Shortboard, 6 channels at 1/2" depth: 41.9 against 50.8 mm.
- Longboard, Rolled Vee at 1/2" lift: 101.5 against 107.9 mm.

Passing the built section as `seam` gives the litres' figure exactly in every case tried. The same picture is
printed on the Bottom Contours sheet a shaper takes to the bay, so the sheet and the CNC file disagree about where
the tail's rail is.

**Fix:** Build the section at the drawn station from the same input the litres use (`boardSectionsWith`,
`lib/geometry/volume.ts:1292` — the editor already builds these for the floor flags, `bottom-editor.tsx:78`) and pass
it. `builtSectionAt` below stands for a small helper in `lib/geometry/` that does that for one station:

```tsx
const seam = useMemo(() => builtSectionAt(sectionInput, mm(station)), [sectionInput, station]);
bottomSection(resolved, board, mm(station), height, box, { live, seam });
```

and the same in `SectionFigure` on the printed sheet. If the option is not going to be used, remove it, so the next
reader does not believe the drawing and the litres are tied together.

## Info

### IN-01: One bad sample silently blanks the whole top view

**File:** `lib/geometry/bottom-draw.ts:161` (`bottomShadeBands`), `lib/geometry/bottom-draw.ts:229`
(`bottomContourLines`)

**Issue:** Both drop every line and every band if a single sample on the grid is not a finite number. With CR-01
unfixed, a grid that happened to land on a zero-width channel would show a flat, unshaded board with no hint why.
**Fix:** Treat a non-finite sample as zero foam off for that one point (and, in development, warn), rather than
discarding the whole drawing.

### IN-02: The channels' floor warning speaks only of the rail

**File:** `components/bottom/bottom-copy.ts:263-272`

**Issue:** For channels the flag carries only "rails" stations and the sentence is always "The channels leave the
rail under 1/4"...", followed by "Lower the Depth, or move the cut away from the tip." When the trouble is a
channel through the middle of the tail (WR-01) the shaper is pointed at the wrong place.
**Fix:** Word the sentence from where the thin spot is — at the rail, or under a channel — once WR-01 is settled.

### IN-03: "Rail lift" is not only vee and belly, though the comment says so

**File:** `lib/geometry/design.ts:313-316` (`bottomRailLift`)

**Issue:** The comment says a concave "runs out before the rail and lifts nothing there", but the function reads
the one number `foamOff` at the rail, which includes channels. A channel that runs out through the rail shows as
"Rail lift" in DATA and thins RAILS' anchor at that station: stock Shortboard, 8 channels Parallel, tail — 4.76 mm;
Toe-in — 0.88 mm; pin-tail Shortboard, Parallel, station 152 mm — 3.22 mm; Midlength, Toe-in, station 152 mm —
7.57 mm. That is physically consistent (the foam really is gone there), so it is noted, not charged; but nobody
appears to have decided it.
**Fix:** Either correct the comment and the DATA column's meaning to "foam off at the rail", or leave channels out
of `bottomRailLift` if RAILS is meant to follow vee and belly only. The founder's call.

---

_Reviewed: 2026-11-10T19:35:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
