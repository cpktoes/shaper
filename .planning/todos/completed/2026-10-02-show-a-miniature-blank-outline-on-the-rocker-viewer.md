---
created: 2026-10-03T06:52:52.643Z
title: Show a miniature blank outline on the ROCKER viewer
area: rocker
severity: minor
files:
  - components/rocker/rocker-editor.tsx:79
  - components/rocker/rocker-editor.tsx:290
  - components/rocker/rocker-viewer.tsx:160
  - components/rocker/rocker-view-frame.ts:579
  - lib/geometry/blank.ts:26
  - lib/geometry/blank-fit.ts:120
  - lib/geometry/blank-fit.ts:309
  - lib/geometry/board-profile.ts:49
  - lib/geometry/outline.ts:155
  - lib/blanks/catalog.ts:142
  - components/outline/outline-viewer.tsx:976
  - components/viewer/tabbed-panel.tsx
  - components/design/design-screen-shell.tsx
  - e2e/rocker-blanks.spec.ts
  - e2e/phone-screens.spec.ts
  - e2e/desktop-baseline.spec.ts
---

## Problem

Captured from the founder on 2026-10-02, in their words: "I think I want to show a miniature version of the
blank outline (with 12" stations, center, and stringer line) on the rocker viewer page. Ideally, with the board
outline also shown (no station marks) so a user can see that part of the board visually too. On small screens,
the top preview can just be a new tab."

**What is being asked, in three parts:**

1. A small top-down drawing of the picked blank on ROCKER: the blank's own outline, with its 12" station
   marks, its center mark and its stringer line. These are the marks a shaper finds on the real foam and lays
   the template out against.
2. Ideally, the board's own outline drawn inside the blank, with no station marks of its own, so the board's
   shape is on this screen too.
3. On a small screen the top-down drawing does not have to share the drawing area. It can be its own tab.

**What ROCKER shows today.** The VIEWER draws the board and its blank from the side only: the blank's side
silhouette behind the board, with the foam to come off shaded. That view carries rocker and thickness. Nothing
on the screen shows the blank from above, so width is the one part of the fit a shaper cannot see:

- A blank is listed only when the board is narrower than it by the width margin at every station (default 1").
  When a board is too wide, the fit flag says so in words, with the station and the amount. The drawing shows
  nothing: `rocker-viewer.tsx`'s own header says "width failures are not drawn at all".
- Sliding the board along the blank (Placement) moves it in the side view. Where the board's tips and wide
  point land against the blank's own marks, and how much foam is left outside the rails, is not shown anywhere.

**Reading notes (mine, to confirm at plan time).** "Top preview" is read here as the top-down drawing. If the
founder meant "the preview at the top of the viewer", the small-screen rule comes out the same: its own tab.

**Severity and timing (founder, 2026-10-02):** minor, a new feature and not a fault. No date was set when it
was recorded. The freeze for the Oct 10 showing is Wednesday 2026-10-07.

## Solution

To be shaped with the founder when it is planned. What was established on 2026-10-02 by reading the code and
the four preset blanks' rows:

- **The numbers already exist; no new shaping formula is needed.**
  - Every catalogue station carries the blank's full width (`BlankStation.widthMm`, `lib/geometry/blank.ts:26`).
  - The app already draws one width curve through those stations (`PreparedBlank.width`,
    `lib/geometry/blank-fit.ts:120`; the square-root rule since Phase 14) and reads the blank's width under any
    board station (`blankWidthAt`, `blank-fit.ts:309`). The fit check uses exactly these.
  - The side view is handed a `BlankSideView` (`lib/geometry/board-profile.ts:49`). It says where the blank's
    tail and nose tips fall in the board's own coordinates (`start`, `end`) and carries the board-on-blank
    object, so the placement is already resolved.
  - The board's half-width at any station is `sampleOutline` (`lib/geometry/outline.ts:155`).
  - Turning these into two outlines and a set of mark positions is still geometry. It belongs in
    `lib/geometry/` as pure, unit-tested functions (CLAUDE.md Rule 1), with the component only drawing them.
- **What a blank's ends look like.** On the four preset blanks (all US Blanks) the catalogue prints a width at
  both tips: 7 1/2" to 14" at the tail, 0" to 8" at the nose. So a blank's ends are cut square across at that
  width and are not pointed, except where the printed tip width is 0. The widest printed station is not always
  the center: the 7'4"SP and the 9'3"Y are widest one station toward the nose.
- **A blank can be missing widths.** It is pickable with as few as two printed widths (`isPickable`,
  `lib/blanks/catalog.ts:142`), and past its last printed width the curve holds that last value. A blank with
  no printed tip width would draw full-width out to its tip. Check the live catalogue for such blanks before
  settling how the ends are drawn.
- **The look already exists.** TEMPLATE's drawing has station lines and the dash-dot stringer
  (`components/outline/outline-viewer.tsx:976`, the `--outline-stringer-dash` token). The side view's blank
  uses a solid one-pixel line and the faint foam shade (`--outline-blank-line`, `--outline-foam-shade`). Using
  the same lines makes the two views of one blank read as a pair.
- **The board follows Placement.** Its outline sits on the blank at the same offset the side view uses
  (`blankSpanIn` and `boardOffsetX` in `components/rocker/rocker-view-frame.ts`), so the Placement slider
  moves the board along the blank in both drawings at once.

Decisions for the founder:

- **Which station marks.** The preset blanks' catalogue rows have a station every 6" out to 24" from each tip,
  then every 12", plus the center. Other makers print fewer (a record holds 5 to 15 stations). "12" stations"
  could mean the two marks 12" in from each tip of the blank, which is how the rest of the app uses the phrase,
  or every station the catalogue measured. Proposed (mine): the two 12" marks and the center.
- **Where it sits on a computer, and how small.** Two candidates:
  - Directly above or below the side view at the same length scale, so the stations of the two views line up,
    the way a blank catalogue page is drawn. At that scale the top-down drawing is 0.23 to 0.35 times as tall
    as the blank is long (the four preset blanks: 22 5/8" to 25 1/16" wide on 71 1/4" to 111" of length). That
    is not a miniature, and the height has to come out of the side view's frame (`rockerViewLayout`,
    `rocker-view-frame.ts:579`), which already stacks a row of cards above and below the board.
  - A small inset at its own scale, in a corner the frame leaves free.

  Measure both with real screenshots at plan time. Decide also where it goes when the board is rotated nose-up.
- **No blank picked** (a hand-set rocker): hide the miniature, or draw the board's outline alone.
- **A board too wide for its blank.** Proposed: draw it as it is, poking out past the blank's line, the way a
  too-thick board pokes through the blank's line in the side view. The side view uses no warning colour on
  purpose. Decide whether the width margin is drawn.
- **Numbers.** The founder asked for marks, not figures. If a label is wanted, it goes through
  `lib/geometry/units.ts` so Metric reads 30.5 cm (CLAUDE.md Rule 2).
- **What counts as a small screen.** Proposed: the same two rules the phone chrome already follows, and no new
  "phone" switch (CLAUDE.md Layout). Narrower than 820 dots is an upright phone: its pinned drawing area is
  capped at two thirds of the screen and the side view is already height-bound there. Shorter than 500 dots is
  a phone held sideways: it gets the computer's layout with only 340 to 390 dots of height. Both get the tab.
- **The tab's name and place.** ROCKER has two tabs today, VIEWER and DATASHEET
  (`components/rocker/rocker-editor.tsx:79`).
- **Printed pages.** Not asked for. The order form's rocker box is never given a blank. Leave them alone unless
  the founder says otherwise.

Watch-outs:

- A tab that exists only at some screen sizes needs a fallback. If the window is resized across the boundary
  while that tab is open, the screen must land on VIEWER and never on a tab that is no longer there. Wide view
  hides the tab strip altogether (`bare`), which is safe today only because its button lives inside VIEWER.
- The side view's frame maths is covered by about 1,800 lines of tests (`rocker-view-frame.test.ts`), and the
  order form reuses the same viewer in its compact form. Taking height from the frame must leave the order
  form's box unchanged.
- Give the drawing a spoken name in words, as the side view has.

Proof:

- Unit tests in `lib/geometry/`: the blank's outline passes exactly through each printed station's half-width
  and is mirrored about the stringer; each mark sits at its distance from the blank's tip; the board's outline
  is offset by the placement; a blank with no printed tip width does what was decided.
- Browser tests: on both phone profiles ROCKER shows the new tab and its drawing, upright and sideways; on a
  computer the miniature is in the VIEWER, and moving Placement moves the board in it.
- The computer's reference screenshot of ROCKER (`rocker-desktop.png`, `e2e/desktop-baseline.spec.ts`) is the
  default board, which had no blank picked when Phase 11 recorded it. It changes only if the miniature shows
  without a blank or takes room from the side view either way. If it changes, re-record that one on purpose;
  every other screen's must hold.

Done as quick 261006-qfm (2026-10-06; commits 2d5ffcd, d5830d1, 24c47f3, e78f8b7, 0d9e973, merged 2151779).

The founder's choices, 2026-10-06: a mini display, reference only, not at the side view's scale ("The blank/board
top view does not need to be the same scale. It can be a mini display, it's really just for reference only"); on
a computer a small drawing on its own plate over the VIEWER's top-left corner, with a fourth toolbar button to
hide and show it ("can be turned on/off by another button"); on a phone or a short sideways screen its own TOP
VIEW tab ("let's make a new viewer tab"). The marks are the two 12" marks and the centre, with the stringer tip
to tip; the board is drawn in TEMPLATE's own shape, notch and all, with no marks of its own; with no blank picked
it is the board alone; nothing printed or saved changes. The ROCKER desktop reference picture was re-recorded on
purpose. Pictures are in the quick task's folder. Awaiting the founder's review before the push.
