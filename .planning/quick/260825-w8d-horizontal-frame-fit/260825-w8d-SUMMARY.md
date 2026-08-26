---
id: 260825-w8d
slug: horizontal-frame-fit
date: 2026-08-25
type: quick
status: complete
---
# The rotated Template view now grows the board about +9%, not the +2% it shipped with

## What was wrong, and why it mattered

Rotating the board (260825-vot) exists for one reason: to make the board bigger by using the
panel's width instead of fighting for it. On the running app at a 1280x820 window, it was only
delivering **+2%** — 566px vertical, 578px horizontal. The mechanism worked (the board really did
turn, drag really did track, callouts really did stay upright) but the value it was built to
deliver never landed. A button that does nothing worth clicking is worse than no button.

The cause was the frame the rotated board gets drawn into. It was built by transposing the
vertical frame's own numbers — reusing the vertical frame's width as the rotated frame's height,
and padding both long-axis ends by a full half-chip regardless of margin the frame already had.
The vertical frame's width holds two things that sit side by side in the vertical layout (an
input-chip gutter and an output-value rail); rotated, those two stack far more compactly across
the short axis, so most of that width was empty air being carried over for no reason.

## What changed

One file, `components/outline/outline-viewer.tsx`. The old symmetric end-pad constant is replaced
with:

- **`MAX_CALLOUT_SIZES`** — a ceiling on how large a callout chip or output value can ever render,
  evaluated once at `MIN_PINNED_FIT_SCALE` (the pinning floor) and compared against the unpinned
  size, whichever is larger. It stays a module constant on purpose: it feeds the frame, the frame
  feeds `useSvgFitScale`, and the fit scale is what produces the live callout size at render
  time — reading that live size back into the frame would close a resize feedback loop (the same
  defect flagged as T-VOT-04 in the rotation plan). A `getBBox()`-measure-then-resize approach has
  the identical defect plus an extra render pass, so it was rejected outright, not just for being
  fragile.
- **Asymmetric long-axis pads** (`noseEndPad` / `tailEndPad`) — each end is padded only by the
  shortfall between a rotated chip's half-width overhang and the margin the vertical frame already
  carries past that end (40 units at the nose, 26 at the tail), instead of paying the full
  half-chip at both ends regardless of what was already there.
- **A content-derived short axis** — built from `frame.chipRightX` and `frame.outputValueX`,
  which already carry this board's own overflow, so a wide board widens the rotated frame
  correctly with no second overflow term needed.

## The lesson that corrects the original diagnosis

The planning brief called the short axis "the main prize" and the long-axis pad secondary. That
turned out to be backwards, and it's worth saying plainly because it's the useful finding here:
**the viewer panel is width-bound at a normal window size.** The panel is 804 x 631 at
1280x820, `preserveAspectRatio="xMidYMid meet"` picks `scale = min(width/horizW, height/horizH)`,
and in every row of the plan's own worked table that minimum was the width term — `horizH` never
bound the scale at all. So **the entire +9% gain measured at this window comes from the long-axis
fix alone.** The short-axis fix is still correct and still shipped, but at a typical window it is
currently paying nothing. It becomes the binding constraint only on a container wider than the
viewBox's own aspect ratio — a large monitor or a short, wide panel (the plan estimates roughly
+40% more at 1800x700) — and even at a normal window it earns its place by stopping the drawing
sitting off-centre in a frame that used to be 87 units slack above it and 59 below.

## What's still short of "content-tight," and why that gap is deliberate

The plan's own live measurement put a genuinely content-tight frame at 666px board length; this
fix lands at roughly 630px. The remaining gap is the clipping guard, not waste: `MAX_CALLOUT_SIZES`
sizes the frame for a chip at its worst-case pinned size, which at a 1280x820 window is about 60%
larger than the chip actually being drawn there. A slightly smaller board is a better failure mode
than a clipped dimension a shaper is reading off to cut foam, and that trade is the honest cost of
deriving the frame from constants instead of a live measurement. Two follow-ups were named in the
plan and deliberately left out of this task's scope:

- **Re-proportioning the rotated rails** — sketch 005 already shrank its gutters from 176 to 140
  units for the same reason; the current rails are wider than the rotated layout strictly needs.
- **Clamping the extreme chips inward** so the long axis needs no end pad at all — worth roughly
  another +9% on top of this fix, and flagged in the plan as the better long-term lever of the two.

## Verified

`npx tsc --noEmit` PASS · `npm run lint` PASS (0 errors; same 9 pre-existing warnings in unrelated
files, none from this change) · `npm test` PASS (670/670, all pure `lib/` geometry — these cannot
catch a viewer regression) · `npm run build` PASS. Every grep gate in the plan's `<verify>` block
passed, including the 19 regression literals lifted verbatim from 260825-vot confirming the
vertical `viewBox` expression, both projectors (`lenToY`, `pxX`), the drag inversion, and the
`hideCallouts` branches are byte-identical to before, plus the blast-radius gate confirming exactly
one source file changed (`git diff --name-only`). The new frame's derived numbers were independently
cross-checked against the plan's worked table by re-running its arithmetic in Node: `horizW`
729.58, `horizH` 367.35 — exact match.

## Pending

The `<human-check>` block is the orchestrator's, not this executor's, per plan instructions — no
browser was driven here. Still to confirm live at `http://localhost:3000/design/outline`:

1. Horizontal board length lands around **630px** (up from the shipped 578px), vertical stays at
   ~566px.
2. No clipping on the LENGTH or TAIL BLOCK chip at either extreme board length/width the sliders
   allow, including at a ~750px-wide window where the pinning floor binds and chips are largest.
3. The three output-rail readouts (Nose @ 12", Centre, Tail @ 12") are fully visible.
4. Vertical view, preset thumbnails, Summary/order-form template windows, and print preview are
   all visually unchanged.
5. Both light and dark theme.
6. Optional, on a wide monitor: the short-axis fix should show a gain well above +9% when the
   panel is wider than about twice its height.
