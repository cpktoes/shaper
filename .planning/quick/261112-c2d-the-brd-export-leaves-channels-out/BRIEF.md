# Brief — quick 261112-c2d: the .brd export leaves channels out

Follows quicks 261110-tvk and 261110-veo and fast tasks 202 and 203 (all on this branch, `close-bottom-17`; their briefs
and summaries are in `.planning/quick/261110-*`). Read `261110-veo`'s SUMMARY for how the writer is built.

## The founder's ruling (2026-11-12, his words)

"It doesn't appear that either handle channels well, esp in the free teir. what if we just exclude channels from the
.brd output?"

What led to it, over five rounds of sample files he opened in AkuShaper's Bay and Shape3D's 3D view:
- AkuShaper took an upright channel wall for the rail and stretched the tail into wings; walls leaning 1/8" cured it
  on 4 channels, but 6 and 8 channels still tore at the tail.
- Shape3D drew the channels, but "none of the channels look quite right as they're not straight, they all bend/flare
  near the tip of the tail".
- Both programs build a board by blending a few smooth cross-sections and stretching the blend to the outline, so a
  straight, sharp-walled channel is not something a `.brd` carries well. AkuShaper's own fish files leave swallows out
  the same way ("just a big wide tail"), which is why a swallow is already written square with a note.

## What to build

1. **The file carries the board without its channels.** On Export .brd File, a board with channels (count 4, 6 or 8) is
   written from a surface built with the same bottom but the channels off — every nose, center and tail cut (concave,
   vee, belly) kept exactly — so the file is the board as it stands before the channels are cut. A board without
   channels is written exactly as today (byte for byte — prove it in a test).
   - Where: `components/3d/three-d-screen.tsx` builds the drawn surface in a `useMemo` (`buildBoardSurface` with
     `designCrossSectionInput(..., { bottom, board: bottomBoard })`) and `onExport` calls
     `exportBrd(built.surface, boardName, brdBottomStations(resolvedBottom))`. The export must stay inside the tap with
     nothing awaited (Safari). Building a second surface inside the tap is synchronous and fine; or memoise it.
   - "Channels off" is the bottom's own off state: `channels.count = 0` ("None hides the set and keeps every number",
     `lib/geometry/bottom.ts`). Use the app's own helpers; never hand-roll a bottom. The stations handed to the writer
     must come from the same channel-less bottom (`brdBottomStations` adds the channels' start/deepest/end when count > 0).
   - Put the "bottom without channels" step in a pure, tested function in `lib/` (e.g. in `lib/export/brd.ts` or
     `lib/geometry/bottom.ts`), not inline in the component (CLAUDE.md Rule 1). A test: a Shortboard with a Deep Single
     and 4 channels writes a file whose sections have five knots, no corner but the bottom edge, and whose text equals
     the same board's with channels None.
2. **The 3D page says so, only on a board with channels**, one line under the export button beside the swallow note's
   place, in `components/3d/three-d-copy.ts`: **"Channels are left out of the file — cut them by hand."**
   Both notes show on a swallow-tail board with channels. The screen's drawing keeps its channels; only the file leaves
   them out. Follow exactly how `exportSwallowNote` is passed and drawn (`three-d-controls.tsx`), and add its check to
   `e2e/three-d-export.spec.ts` the way the swallow note's check is written.
3. **The writer's own channel handling stays in the code, untouched and still tested** (wall knots, the 1/8" lean,
   sections 1 1/2" apart where a wall stands) — the founder's standing rule for this export is "keep the other work we
   did". It simply no longer meets a wall from the 3D page. Say so in one comment where the page drops the channels,
   and in the header of `lib/export/brd.ts`.

## Decisions (mine, for the founder to overrule)

- The note's words above.
- The file's thickness, litres-free dimensions and sections all come from the channel-less surface, so AkuShaper and
  Shape3D show the board before channels.
- No setting to put channels back in; if he wants one later it is one flag.

## Rules

- Work only in `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17` (branch `close-bottom-17`); never `cd`
  elsewhere; no push, no merge. node_modules is a real hardlinked copy: a dev server can start here (PW_PORT=3117,
  desktop project). `npx next typegen` before `npx tsc --noEmit`. Never the whole Vitest suite in one task; run the
  touched test files alone.
- Plain-English commit messages a shaper can read, each ending with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Do not open AkuShaper or Shape3D, and do not touch `~/Downloads`.
- The desktop baseline picture of the 3D page is taken on a board without channels, so it should not change; if it
  does, report it and do not re-record.
