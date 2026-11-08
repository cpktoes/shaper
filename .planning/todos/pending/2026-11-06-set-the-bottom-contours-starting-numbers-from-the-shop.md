---
created: 2026-11-06
title: Set the BOTTOM page's starting numbers for each contour name from the shop
area: bottom
severity: minor
files:
  - .planning/sketches/019-bottom-contours/README.md
  - .planning/sketches/020-bottom-channels/README.md
source: the founder, 2026-11-06, reviewing sketch 019 ("need a reminder to address later")
resolves_phase:
---

# Set the BOTTOM page's starting numbers for each contour name from the shop

## Problem

Every one of the founder's 18 contour names (six each for Nose, Center and Tail — Flat Entry, Rolled Belly Entry,
Teardrop Nose Concave, Blended Nose Concave, Slight Single Concave Entry, Reverse Vee Nose; Flat Center, Deep Single
Concave, Shallow Single Concave, Early Double Concave, Continuous Belly / Rolled Mid, Tri-Plane Hull Center; Flat Exit,
Double Concave Exit, Panel Vee, Spiral Vee, Rolled Vee, Extending Single Concave) opens a cut with starting numbers:
Off Rail, Off Stringer, Trough At, Start, Deepest At, End, Depth, Smoothness, and for the channels (sketch 020) the
count, width, run and the same marks. Those numbers were taken from forum posts during the 2026-11-06 planning session,
not from the founder's shop, and he said so when asked: *"need a reminder to address later."*

They sit in the `NAMES` table (and `makeChannels`) of the sketches' templates — `sketch-source.tar.gz` under
`.planning/sketches/019-bottom-contours/` and `020-bottom-channels/` — and will move into `lib/geometry/` with the
BOTTOM phase, where they become the numbers a shaper sees the moment a name is picked.

## What is needed

Before the BOTTOM phase ships, walk the 18 names (and the 4 / 6 / 8 channel defaults) with the founder and replace
each starting set with his own: where the cut starts, is deepest and ends on each preset, how far off the rail and off
the stringer, how deep, how smooth. Record each as inches from the tail (or the nose, for the nose section) the way the
`NAMES` table does, so the phase's planner carries them straight into the geometry fixtures.

Also still open from the same review: where the live readouts (foam off, litres now, stringer at the center) should
live — under the drawing as sketched, or in a sidebar card ("TBD").

## Research, 2026-11-07 — what is most common, and the numbers proposed from it

The founder (reviewing sketch 021): *"Do a deeper research to see what is most common for each and report back. The one
that stands out is the tear drop concave seems a bit short."* Read in a real browser (Swaylocks threads via their Discourse
JSON, Swellnet, Lost, Greenlight) and web searches. Figures below are what shapers published, quoted short; "proposed" is
the starting set drawn from them, for his correction. Nose cuts measure from the nose tip, the rest from the tail.

| Cut | What shapers publish | Proposed starting numbers (what changes) |
|---|---|---|
| Rolled Belly Entry | "3/8" hull depth, deepest from the wide point to 1/3 back from the nose" (Paul Gross); 5/8" for a full hull (spence); "a soft belly … to the front third or so that moves to flat under the front foot" (Benny1) | 3/8" deep (was 3/16"), from the tip, deepest one third back from the nose (was 10"), ends under the front foot at 45% back (same), rounded |
| Teardrop Nose Concave | "1/4" deep by 36" long" (Brock Jones); "starts 3" back from tip and is 36" long" (surfdad); "two to two and a half inches from the rails", no more than 1/4" (tblank); 3/8" mushy / 5/8" standard per Calvani (shannonk); Nuuhiwa's runs half the length | 1/4" deep (same), 2 1/4" off the rail (was 2"), starts 3" back (was 1"), deepest 20" back (was 10"), ends 38" back — 36" long (was 22"), closing to a point |
| Blended Nose Concave | ≤1/4", a third to half the length, "deepest part where the nose rocker starts to accelerate or kick" (nomastomas); Harbour: "start 1 5/8 inch from the rail and fade back to about 34"-36" … 1/4" or less" (surftrip90) | 3/16" deep (was 1/8"), 1 5/8" off the rail (was 1 1/2"), starts 2" back (same), deepest 12" back (was 14"), ends 36" back (was half the length) |
| Slight Single Concave Entry | "the single concave starts 12-18 inches from the tip of the nose, gradually deepening" (Greenlight); Merrick: starts 4" behind the nose, 3/16" (shreddoggie); shallow until the wide point | 1/16" deep (same), 2" off the rail (was 1 1/2"), starts 12" back (was 2"), deepest at the wide point (was 18" back), ends 6" behind the wide point (was the center) |
| Reverse Vee Nose | "1/8" to 3/16" flat panel vee starting in front of the front foot … By the rear thruster fin there is no Vee" (blakestah); "peaks in mid section (usually where the front foot is placed)" (Maurice Cole, relayed); apex "about 1/3 back from the nose and faded to a flat tail" (Greg Loehr) | 3/16" lift (was 1/8"), starts 3" back (same), deepest one third back from the nose (was 14"), ends 4" ahead of the front fins (was 40% back) |
| Deep Single Concave | "about 3/16th depth in the single" on competition boards (blakestah); "about 5/16's max depth at just in front of the side fins" (Bud); 3/8" on thin small-wave boards (kayu); deepest "between the wide point … and the midpoint between the wide point and the leading edge of the rail fins" (Greenlight); "flattens in the last 4"" (Merrick, shreddoggie) | 1/4" (same), 2" off the rail (same), starts 16" from the nose (same), deepest halfway from the wide point to the front fins (same), ends 4" from the tail (was 4" behind the front fins) |
| Shallow Single Concave | "a slight concave (1/8") maxing out under the front foot … fading out at the rear fins" (surfteach); "start your concave about 1/3 of the board length from the nose … max out at about 1/8" at the front fins" (archive) | 1/8" (same), 2" off the rail, starts one third back from the nose (was 16"), deepest at the front fins (was halfway), ends 4" from the tail |
| Early Double Concave | doubles "begin to fade in at the point where the single concave is deepest" (Greenlight); "starting right behind where your front foot would be" (MRat); "from about a foot in front of the side fins then carry it out the back" (bruce); "around 3mm" on the CI Mid (lemat) | 1/8" (same), 2" off the rail, 1" off the stringer, troughs 4" out (same — no source for the trough), starts at the wide point (was 8" ahead of it), deepest 6" ahead of the front fins (was the wide point), ends 2" ahead of the front fins (same) |
| Continuous Belly / Rolled Mid | 3/8" with modern rails, "a 1" hull cut" for a Greenough hull, measured stringer to the centre of the rail (Paul Gross); "about a 1/2" of hull … focused under his feet" (Kellogg); deepest "should coincide with the wide point" (spence) | 3/8" (was 1/4"), from 8" back from the nose (same), deepest at the wide point (was the center), ends at the front fins (was 8" from the tail), rounded |
| Tri-Plane Hull Center | "flat through the middle and the last 4-5 inches before the rail is planed at a 5-10 degree angle" (lovinlife, Walden); "a 2" wide vee cut near the rail … only 3/32" deep" (greggriffin); "two inches of flat panel leading into the rail" (Cory Russell) | 1/8" lift (was 1/4"), the flat panel to 4" from the rail — so Off Stringer about 5 1/2" on a 19" board (was 2 1/2"), starts 14" from the nose (same), deepest at the center (same), ends at the front fins (was 10" from the tail) |
| Double Concave Exit | "usually deepest near the leading edge of the rail fins, then either quickly fade to flat or vee at the trailing edge of the center fin" (Greenlight); "subtle 1/8" deep concaves on each side" (Tubedog); "about an inch of flat inboard of the rails … finish with a V in the last 3-6"" (Rnoll98) | 1/8" (same), 1" off the rail (was 1 1/2"), 3/4" off the stringer, troughs 3" out (same — no source), starts 12" ahead of the front fins (was 8"), deepest at the front fins (same), ends 4" from the tail (was the tail) |
| Panel Vee | "Vee in the rear 1/3 … 40% of board length up from the tail … 1/4" deep" (stoneburner, after Greenlight); "zero at 1/3 to max at front of fins then fade to zero again at the tail" (George3); "peak somewhere between 8-10" from the tail … 3/16-3/8"" (foamdust); "off the tail but no more than 1/8 inch" (LeeV) | 3/16" lift (was 1/4"), starts one third of the length from the tail (was 16"), deepest at the front fins (was the tail), ends at the tail, straight |
| Spiral Vee | "vee start maybe six inches to a foot in front of the fin, have it reach a peak right under the fin" (Tubedog); "a subtle vee under the front foot which increases in depth … A double concave is placed within the vee" (Cory Russell); apex "under the back foot, generally in front of the fin/fins" (surfresearch) | the Double Concave Exit's numbers plus 3/16" of vee lift (same), starts 12" ahead of the front fins, deepest at the front fins, ends at the tail |
| Rolled Vee | "ideal … in the back third or so of noserider longboards" (Greenlight); "If you go deep V, I would suggest rolling it rather than panneling it" (LeeV); logs: "start my V about 4 feet up from the tail, and run it all the way out" (Huck) | 1/4" lift (same), starts one third of the length from the tail (was 16"), deepest at the fin (was the tail), ends at the tail, rounded |
| Extending Single Concave | "running a single concave out the tail, sometimes all the way out but usually flattening out … near the trailing fin" (surfthis); "Straight concave off tail seems to be sticky" (BarrySnyder) | 3/16" (same), 2" off the rail (was 1 3/4"), starts 12" ahead of the front fins (same), deepest at the front fins (was 4" ahead), ends 4" from the tail (was the tail) |
| Channels | "last 24 inches of the tail, usually 5-10 millimetres deep and varying widths to suit the board's tail width" (Cory Russell); "Typical depth is about 1/4" - 3/8"" (Bill Barnfield); "start just forward of the fins and run the length of the tail", outer "parallel with the front fins and the inner channels use half that amount of toe" (Matt Biolos); "longest channel on the outside" (Littlewood, Phil Myers; Col Smith), Byrne's "longest by the stringer" (caml); DHD's "inside channel fading before the tail"; "The trailing fin most often sits on the peak created by the two centermost channels" (Greenlight) | 5/16" deep (was 1/4"), widths unchanged (none published), from the stringer (same — the trailing fin on the centre peak), starts 12" ahead of the front fins (was 10"), deepest at the front fins (same), out the tail (same), Parallel (his ruling), the OUTER pair longest (was inner), 2" stagger |

Not found anywhere: a channel width in inches; where a double's troughs sit off the stringer; a rolled vee's own depth; a
reverse vee depth from Cole himself; a mid-length belly depth as such. One source for the length order the other way
(Byrne, inner longest), and one (DHD) with the inner channel ENDING before the tail — the ends-stagger question.

Sources: Swaylocks threads 6720 (rolled vee vs displacement hull), 11733, 24741, 31904 (depth of nose concave), 44378,
13268 (concave depth: how much is too much?), 10725, 43015, 44896, 21215 (reverse vee), 2556, 7251, 29462, 37862, 26241,
3304, 83552 (how far up the tail should vee go?), 4929, 11430, 48258 (tri-plane), 26060, 40588, 51183, 13659, 35471,
21852, 2725, 79995, 41977 (longboard nose concave: function or fantasy?); Greenlight's bottom-contour design guide; Swellnet
"Bottom curves part 1", "Bottom contours part 2", "The persistent history of channels", "Phil Myers: channeling past master";
Lost "Channel bottoms explained"; Brock Jones, "Nose concave" (blog).
