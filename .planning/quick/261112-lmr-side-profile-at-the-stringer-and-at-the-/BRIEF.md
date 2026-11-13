# Brief — quick 261112-lmr: the side profile at the stringer and at the rail

The .brd export and its Board file preview went live today as main 235f5803 (quicks 261110-tvk, 261110-veo, 261112-c2d,
261112-dbi, fast tasks 202–205). This branch (`close-bottom-17`) is level with main. Read `261112-dbi`'s SUMMARY and
`lib/export/brd-preview.ts` first.

## The founder's ask (2026-11-12, his words)

"I think the board file preview needs to show both, the at stringer thickness, but should also have a max side profile
thicknes shown also (i.e. convex boards have a great looking side profile, but concave bottoms can show a 'rocker
profile' that looks a little wonky since they show the scooped out profile). Essentially there should be two overlaid
side profiles: 1) what the profile looks like along the stringer, and 2) what the profile looks like at the rail
(assuming a rectanglular blank cross section - before rails have been shaped). This could mean that for a Vee bottom,
the rail will be higher than a stringer, and in a concave the stringer higher than the rail.
In fact, this is so important that I think I'd like to add this side profile view to the bottom page so you can see how
contours affect the overall flow of the rocker along the stringer."

His answers to two cards the same hour: the BOTTOM page placement is **sketched first** (a later task, not this one);
the side profiles are stretched in height with **×1 / ×2 / ×4 / ×8 buttons, opening at ×4**, the same buttons as BOTTOM's
cross-section, in the preview and later on BOTTOM.

## What to build in this task

1. **Shared board maths, pure and tested, in `lib/geometry/`** (Rule 1) — used now by the preview and next by BOTTOM:
   along the board, at each station `s`:
   - **the foam off at the stringer**: `foamOff(resolved, board, s, 0)` — DATA's own "stringer left" basis;
   - **the foam off at the rail**: `sectionsFoamOff(resolved, board, s, board.railAt(s))` — DATA's "rail lift", the
     vees', bellies' and concaves' lift at the rail on the planed blank, channels never counted (they are cut after the
     rails are shaped; the founder's "Match RAILS" ruling, 2026-11-11);
   - from these and the planed side profile: the **bottom line at the stringer** and the **bottom line at the rail**
     (both = the planed bottom raised by that foam off), the **deck** (planed bottom + planed thickness — the blank is
     rectangular across before the rails are shaped, so one deck line serves both), and two thicknesses: **at the
     stringer** (the planed thickness less the foam at the stringer, as DATA's stringer left), and **the side profile's
     maximum** (the most, along the board, of the deck down to whichever bottom line is lower).
   - A concave: stringer line above the rail line; a vee: rail line above the stringer line; a flat bottom: one line.
   - Put it beside DATA's maths in `lib/geometry/bottom.ts` (or a new `lib/geometry/side-profile.ts` that imports it) —
     planner's call; it must take what BOTTOM's page already has (the resolved bottom, the `BottomBoard`, the planed
     side profile's rocker and thickness) so the BOTTOM page can call it unchanged next.
   - Tests: a flat board's two lines coincide and both thicknesses equal the planed thickness; a Deep Single's stringer
     line sits above its rail line through the cut and its stringer thickness is less than its maximum (the 6'2"
     Shortboard: about 2 1/8" vs 2 1/4"); a Rolled Vee's rail line sits above its stringer line; channels change
     neither line; every number finite from tail to nose, swallow and diamond tails included.
2. **The Board file preview's SIDE VIEW draws both lines overlaid** with the deck:
   - the stringer's bottom and the deck stay as now, read from the file (p33, p34);
   - the **rail line** is the file's stringer bottom moved by the difference the shared maths gives between the foam at
     the rail and at the stringer, at the same station — so both lines sit on the file's own rocker. It comes from the
     same bottom the file was written from (the channel-less bottom, `brdFileBottom`). One short label says what each
     line is (e.g. a small key: "— at the stringer   - - at the rail, before the rails are shaped"), in the app's
     drafting grammar (load `Skill("sketch-findings-shaper")`); the stringer line in ink, the rail line in a distinct
     dash, both readable in light and dark (`app/globals.css` palette contract).
   - **Height ×1 ×2 ×4 ×8**, opening at ×4, beside the SIDE VIEW label, the same look and words as BOTTOM's
     cross-section Height buttons (`components/bottom/bottom-section.tsx`) — reuse its control if it can be shared,
     otherwise match it exactly; it stretches the side view only, and says which is on. The top view and the side view
     still share one length scale, so a slice's line in the top view sits above its line in the side view.
3. **The facts line quotes both thicknesses**, replacing "(finished foam thickness at stringer)":
   e.g. `22 slices · none more than 4" apart · 6'2" × 18 3/4" · 2 1/8" at the stringer · 2 1/4" side profile max` —
   my words, for the founder's pen; through `units.ts` (Metric: centimetres to one decimal, dims). On a flat board the two
   are equal; still show both. The stringer figure stays the file's own (what AkuShaper and Shape3D read); the maximum
   comes from the shared maths.

## Rules

- No formula in a component; every length shown goes through `units.ts`; no bare 25.4 or 10.
- The file's bytes do not change (existing byte-for-byte tests must stay green).
- Browser tests: update `e2e/three-d-export.spec.ts` for the new facts line and add checks that the SIDE VIEW draws two
  bottom lines on a Deep Single board and one on a flat board, and that the Height buttons stretch it (open at ×4).
  Run it on all three projects (`PW_PORT=3117`) and `e2e/desktop-baseline.spec.ts -g 3D` (must not change).
- Re-take the preview pictures (the script is `pictures/shoot-source.tar.gz` under `261112-dbi`) into this task's own
  `pictures/` folder — computer light and dark on the Deep Single, a Rolled Vee board, a flat Fish, a phone upright and
  sideways — and look at each before calling it done.
- Work only in `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17` (branch `close-bottom-17`); never `cd`
  elsewhere; no push, no merge. `npx next typegen` before `npx tsc --noEmit`. Never the whole Vitest suite in one task.
  Do not open AkuShaper or Shape3D; do not touch `~/Downloads`.
- Plain-English commit messages a shaper can read, each ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
