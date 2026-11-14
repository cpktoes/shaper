---
status: resolved
trigger: "finished-rail-rounds-channels: the founder says the finished rail messes with the channels' shape: the channels must be kept, and the finished rail should not round them."
created: 2026-11-10T00:00:00Z
updated: 2026-11-14T13:00:00Z
goal: find_root_cause_only
---

## Current Focus

bug_class: Bohrbug (deterministic geometry; same board -> same drawing every time)
hypothesis: CONFIRMED (H2 primary, H1 secondary) - see Resolution
test: done (scratch probes probe.mts, ring.mts, litres.mts in the session scratchpad)
expecting: n/a
next_action: hand the diagnosis back to the orchestrator (find_root_cause_only); no source edits
reasoning_checkpoint:
  hypothesis: "On RAILS the thick Finished Rail line is a polyline of 24 equal straight pieces (about 1/4\" each) whose
    ends are read off a bottom sampled every 1/8\" and read straight between samples, so it can never land on a channel
    wall and chords across every wall; the thin bottom line is the 1/8\" samples themselves (a 1/8\" ramp per wall).
    Separately the 3D/CNC/litres ring lifts the finished rail's tucked lower run by the column map f*(1 - h/a) and lays
    wall slots only on the flat bottom run, so a wall under the rail's curve loses its face and the channel's floor
    rides up the rail."
  confirming_evidence:
    - "Fish + Rolled Vee + 8 channels (Off Stringer 3\"), tail anchor 12\": thick line = 24 pieces of 0.248\"; at the
      walls 2.291\" and 1.393\" in from the rail it reads 0.122\" and 0.093\" under the channel's floor (walls 0.162\"
      and 0.194\" tall); thin line a 0.124\" ramp at every wall"
    - "Fish + Rolled Vee + starting 8 channels: at the wall 4.237\" in, the thick line misses 0.164\" of a 0.181\" wall"
    - "Ring on the bottom run: every wall face equals the cut's step to 0.001\" (Fish 12\": 0.041/0.113/0.162/0.194)"
    - "Ring under the rail's curve: Longboard 6 ch, 2 of 3 walls a side under the rolled rail at 3, 6 and 12\" from the
      tail - face 0; at 6\" the middle wall is a 0.128\" ramp and the floor sits 0.155\" above the channel's own floor"
  falsification_test: "If the thick line's points were placed at each wall's top and foot, the chord would vanish; if
    the ring's walls under the curve had faces equal to the cut's steps, H1 would be false. Measured: neither holds."
  fix_rationale: "Draw/build the channels as the last cut, straight up, at their exact wall positions - after the vee or
    belly's column map and after the finished rail - so no sampling or blending can touch a wall."
  blind_spots: "Dex's 5'8\" Twin Mod Fish itself was not loaded (a saved board); reproduced on the Fish preset with a
    Rolled Vee and channels pushed toward the rail, which matches the screenshot's description. The 3D view was not
    looked at in a browser; its ring was read in code and numbers only."
  candidate_causes:
    - "code (drawing): RAILS' 1/8\" bottom sampling and the 24-piece finished-rail polyline (rail-bottom.ts)"
    - "code (maths): the ring's column map applied to channel foam on the rail's lower run, wall slots clamped to the
      bottom edge (volume.ts)"
    - "config/data: channel starting numbers putting walls near the rail - ruled out as a cause (D-10/D-43 say the
      outer channels run out through the rail; the shape must survive that)"
  and_gate: "no - the RAILS picture the founder sent is fully explained by the drawing sampling alone (his tail is a
    Hard Edge, where the ring's bottom run reaches the rail and the 3D walls are exact). The ring issue is a separate,
    independent cause that shows on soft and rolled rails."

## Symptoms

expected: Channels (Phase 17 BOTTOM: 4/6/8 channels with an Angle, sharp vertical walls, a sawtooth out from the stringer, the last wall a set distance off the rail) keep their own crisp shape all the way to the rail. The finished rail (Rails v2, quick 261102-gec) should shape the rail only and never round off or soften a channel.
actual: Founder: "pass, but the finished rail messes with channel shape. We need to make sure that the channels are kept, the finished rail shoudl not round them." (UAT test 6, RAILS on a Rolled Vee or Continuous Belly; the rail-lift reading passed.)
errors: None reported
reproduction: Test 6 in .planning/phases/17-bottom-contours/17-UAT.md. Live site: a board with channels (BOTTOM -> TAIL -> channels), then RAILS (and possibly 3D) where the finished rail is drawn.
started: Discovered during UAT of Phase 17 BOTTOM (live 2026-11-10)

## Eliminated

- hypothesis: the channels reach RAILS on a board with channels alone (no vee or belly)
  evidence: railBandsOnTheBottom (design.ts:357-376) builds a bottom only where foamOff at the rail is non-zero; on all
    four presets with 4 or 8 Parallel channels and a flat tail the tail anchor's lift is 0.000" and RAILS draws no bottom
    at all. The founder's picture therefore needs a vee/belly (his test 6) - it does not change the diagnosis.
  timestamp: 2026-11-10T00:40:00Z

- hypothesis: the ring (3D/CNC/litres) takes LESS foam than the channel under the rail's curve
  evidence: h + f(1 - h/a) >= max(h, f) whenever f <= a, so the column map always takes at least the channel; measured
    the ring takes slightly MORE (Shortboard 6 ch soft tail +0.0025 L, Longboard 6 ch +0.063 L). The shape is wrong (the
    floor rides up the rail, walls become ramps), not short of foam.
  timestamp: 2026-11-10T01:10:00Z

## Evidence

- timestamp: 2026-11-10T00:00:00Z
  checked: .planning/debug/knowledge-base.md
  found: does not exist; no MemPalace match attempted (no KB)
  implication: no known pattern; open-ended investigation

- timestamp: 2026-11-10T00:10:00Z
  checked: every place the finished rail meets the bottom
  found: |
    (a) lib/geometry/volume.ts:1066-1123 bottomedHalfSection - the one seam for litres, 3D, CNC and BOTTOM's ghost
        (bottom-draw.ts:1128 ghostRail reads section.drawn). Rule (line 1082): h' = h + f*(1 - h/a), a = apex height.
        A bottom point rises by exactly f, a point on the rail's lower run by a share of f, the apex not at all.
    (b) volume.ts:1174-1222 bottomedHalfWithWalls (channels only): walls laid on the bottom run only; each wall clamped
        to the bottom edge (line 1188 Math.min(yEdge, walls[j])); a wall stands only if w < yEdge (line 1206).
        Then the same bottomedHalfSection lift.
    (c) RAILS: design.ts:357-376 railBandsOnTheBottom builds a bottom only where the rail is lifted (a vee/belly);
        liftIn reads foamOff, channels included; rail-bottom.ts:41-51 samples it every 1/8" (RAIL_BOTTOM_STEP) and
        reads straight between samples; finishedRailOnBottom (rail-bottom.ts:107-125) cuts each straight run into 24
        pieces and moves only a curve's control points ("the map is all but straight over a blend's few mm").
    (d) BOTTOM's own slab (bottom-draw.ts:744-796 layoutSection) draws foamOff on square rails - no finished rail.
  implication: three candidate places; must measure which one rounds channels and by how much

- timestamp: 2026-11-10T00:30:00Z
  checked: founder's screenshot (via the orchestrator) - RAILS VIEWER, Tail section, Dex's 5'8" Twin Mod Fish, Hard Edge
    on, Finished Rail on; thin line = sawtooth with vertical walls, thick Finished Rail line chords across each wall
  found: matches H2 exactly (a polyline too coarse to catch a vertical step)
  implication: the RAILS drawing is the place he sees it

- timestamp: 2026-11-10T00:45:00Z
  checked: probe.mts - Fish preset (Hard Edge tail), Rolled Vee, 8 channels Parallel, Off Stringer 3" (walls out toward
    the rail as in his picture); RAILS tail plot at the 12" anchor
  found: |
    lift at the rail 0.200" (planed 1.846" -> RAILS 1.646"); plot reaches 5.951" in; the finished rail's bottom is ONE
    straight step (0,0) -> (-5.951,0), cut by finishedRailOnBottom into 24 pieces of 0.248".
    wall 4.088" in: cut step 0.041"; thin ramp 0.124" wide; thick chord 0.248" wide, 0.016" under the floor at the wall
    wall 3.190" in: cut step 0.113"; thin ramp 0.124"; thick chord 0.248", 0.024" under
    wall 2.291" in: cut step 0.162"; thin ramp 0.124"; thick chord 0.248", 0.122" under
    wall 1.393" in: cut step 0.194"; thin ramp 0.124"; thick chord 0.248", 0.093" under
    Same Fish, starting 8 channels: wall 4.237" in (0.181" step) - thick line 0.164" under the floor at the wall.
  implication: H2 confirmed with numbers; the thick line's pieces are 1/4" long and placed without regard to the walls

- timestamp: 2026-11-10T00:50:00Z
  checked: rail-section-plot.tsx:617-653 - how RAILS draws the bottom and the finished rail
  found: band segments are each ONE straight line between two ends moved by railPointOnBottom (619-627); the bottom
    connector alone is drawn through railBottomLine's 1/8" samples (630-635); the finished rail is finishedRail(output,
    xAxisMin) moved by finishedRailOnBottom (645-650) and drawn as exact L/Q/C path commands (finished-rail.ts:489-506)
  implication: drawing-only; nothing on RAILS draws a wall at its true position

- timestamp: 2026-11-10T01:00:00Z
  checked: ring.mts - boardSections' bottomed ring (what 3D, the CNC files, the litres and BOTTOM's ghost read)
  found: |
    On the flat bottom run every wall is an exact vertical face equal to the cut's step (Fish 8 ch at 12": 0.041,
    0.113, 0.162, 0.194"; Shortboard 6 ch at 14", 10": all exact). Under the finished rail's curve (between its bottom
    edge and the apex) a wall has no face:
      Shortboard soft tail, 6 ch, 6" from the tail: last wall 0.170" in from the rail, the rail's curve 0.446" wide -
        cut step 0.312", ring face 0.000".
      Longboard (rolled rail, bottom edge 2.7-3.3" off the stringer): walls 3.50" and 5.25" off the stringer are under
        the rail's curve at 3", 6" and 12" from the tail - every one face 0.000" (cut steps 0.085-0.312").
      Longboard at 6": the middle wall becomes a ramp 0.128" wide (0.042" -> 0.314"); at 5.218" off the stringer the
        ring sits 0.461" up against the channel's own floor at 0.306" - the floor rides up the rail's curve.
  implication: H1 confirmed as a second, independent cause in the maths (volume.ts), seen on soft and rolled rails

- timestamp: 2026-11-10T01:15:00Z
  checked: litres.mts - how much the ring's shape differs in foam from channels cut straight up into the finished rail
  found: Shortboard soft 6 ch +0.0025 L, 8 ch +0.0020 L; Mid-length Rolled Vee 6 ch +0.0022 L; Longboard 6 ch +0.063 L;
    Shortboard hard tail and Fish 4 ch Panel Vee 0.0000 L. (Ring takes MORE than the channel; estimate, 1/4" stations.)
    RAILS' drawing feeds no litres: VOLUME reads railBands and effectiveRails (design-store.tsx:1287, 1379).
    foamOff itself (bottom.ts:808-813) and DATA's tables read the cut, untouched.
  implication: litres effect tiny except on the Longboard; DATA's first-line Foam off inherits it

- timestamp: 2026-11-10T01:20:00Z
  checked: BOTTOM's own section slab (bottom-draw.ts:627, 744-796)
  found: no finished rail; the slab's bottom is 220 evenly spaced foamOff samples across the full width, so a wall is a
    ramp 2 x edge / 220 wide (about 0.07" on the Fish at 12") - near vertical at Height x4; the "Show the finished rail
    from RAILS" ghost is the ring itself (bottom-draw.ts:1128-1133), so it carries H1 on soft/rolled rails
  implication: BOTTOM's slab is a minor sampling ramp, not the finished rail; its ghost shares the 3D's issue

- timestamp: 2026-11-10T01:25:00Z
  checked: tests covering channels with the finished rail
  found: rail-bottom.test.ts and finished-rail.test.ts have no channel case; volume.test.ts:2169-2240 checks walls only
    at the Shortboard's front fins, where every wall is on the flat bottom run
  implication: no gate existed for channels on RAILS or for a wall under the rail's curve

## Resolution

root_cause: |
  Two independent causes (AND-gate: no - either alone rounds channels):
  1) RAILS drawing (what the founder's screenshot shows): lib/geometry/rail-bottom.ts samples the bottom every 1/8"
     (RAIL_BOTTOM_STEP, line 27; railSectionBottom 41-51) and reads it straight between samples (railBottomFall 55-71),
     then finishedRailOnBottom (107-125) draws the finished rail's flat bottom as 24 equal straight pieces
     (RAIL_BOTTOM_LINE_PIECES, line 34; lines 112-116) - about 1/4" each - and moves only the end and control points of
     the tuck curves (117-121). No point is ever put at a channel wall, so the thick line chords across every wall
     (up to 90% of the wall's height missed) and the thin line ramps over 1/8".
  2) The ring (3D, CNC files, litres, BOTTOM's ghost): lib/geometry/volume.ts lays wall slots only on the flat bottom
     run, clamping any wall to the finished rail's bottom edge (bottomedHalfWithWalls, line 1188; stands only if
     w < yEdge, line 1206), and lifts every point of the rail's tucked lower run by the vee/belly column map
     f*(1 - h/a) (bottomedHalfSection, 1076-1083) with the channel's foam inside f. A channel that reaches under the
     rail's curve (the outer channel running out through the rail toward the tail, D-10/D-43, and most channels on a
     rolled Longboard rail) loses its vertical wall and its floor rides up the rail's curve.
fix: (diagnose only - not applied)
verification: (diagnose only)
files_changed: []

## Resolution
shipped: Phase 17 fix plan 17-20 (channels cut straight up into the finished rail, everywhere), live 2026-11-11 as main 93c0ea8f and re-checked by the founder in his walk-through. Closed 2026-11-14 at the v1.5 milestone close.
