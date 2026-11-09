---
phase: 17-bottom-contours
plan: 09
subsystem: the BOTTOM panel — every cut's rows, the Teardrop's tick box, the floor in words, the CHANNELS block
status: checkpoint
tags: [bottom, panel, channels, floor, D-04, D-06, D-07, D-09, D-10, D-11, D-32, D-33, D-36, D-40, D-42]
requires:
  - "17-04: the store's memoised bottomSections"
  - "17-05: bottomFloorFlags, keepStationsInOrder, the doubles, the Spiral Vee, the Tri-Plane, the Teardrop's closing"
  - "17-06: startingChannels, resolveChannels, channelReadout"
  - "17-07: formatBottomStation, bottomStationSlider"
  - "17-08: BottomControls, BOTTOM_COPY, pickBottomCut, updateBottomCut, storeCutStation, stationFromNearestTip"
provides:
  - "bottom-controls.tsx: every cut's rows from cutRows (D-04's order), MarkRow, SmoothnessRow, the Closes-to-a-point tick box, the floor sentence under Depth, ChannelsBlock / ChannelRows / ChannelStationRow"
  - "bottom-copy.ts: floorWarning, CHANNELS_COPY, runOptionLabel, channelWidthWords, channelWidthLabel, staggerWords, staggerLabel, channelSmoothnessWords"
  - "design-store: setBottomClosesToPoint, setChannelCount, setChannelRun, setChannelLongest, updateChannels (all lock-guarded); a double's marks kept in order on every drag"
  - "bottom.ts: switchChannelCount, storeChannelStation, keepChannelStationsInOrder"
  - "bottom-editor.tsx: the section follows the channels' Deepest when a set opens; onChannelCount"
  - "DOM hooks: data-bottom-floor, data-bottom-channels, data-bottom-channels-echo, data-bottom-channel-width"
affects: [17-10, 17-11, 17-12, 17-13, 17-14]
tech-stack:
  added: []
  patterns:
    - "Which rows a cut shows is a small table in the panel (cutRows); every number in them comes from bottom.ts and every figure through the formatters"
    - "The floor scan (50–75 ms on a full bottom) reads useDeferredValue copies, so a drag keeps its thumb under the finger"
key-files:
  created:
    - components/bottom/bottom-copy.test.ts
    - e2e/bottom-panel.spec.ts
    - .planning/phases/17-bottom-contours/pictures/17-09-every-row-and-the-channels.png
    - .planning/phases/17-bottom-contours/pictures/17-09-pictures-source.tar.gz
  modified:
    - components/bottom/bottom-controls.tsx
    - components/bottom/bottom-copy.ts
    - components/bottom/bottom-editor.tsx
    - components/design/design-store.tsx
    - components/design/design-store.test.ts
    - lib/geometry/bottom.ts
    - lib/geometry/bottom.test.ts
decisions:
  - "None keeps the channels' numbers and the next count opens on them again (UI-SPEC §2, 'keeps the settings for the next count'); a board that never had channels holds D-11's numbers, so its first count is exactly startingChannels"
  - "The rail form of the floor sentence is the orchestrator's ruling 2 wording, not the plan's 'cut shallower' (D-40: a lift is flagged, never clamped)"
  - "One floor sentence per cut: the stringer part, the rail part, then the fix once"
  - "Moving a double's Off Rail, Off Stringer or Trough At keeps its flat and trough in order in the store, as the sketch's normalize does on every drag"
metrics:
  duration: "about 1 h 45 min (00:55 to 02:40 local); two full unit suites 9.7 and 10.4 min; the browser runs below"
  completed: 2026-11-09
actuals:
  tokens: 20500
  tasks: 3
  commits: 3
---

# Phase 17 Plan 09: Every row of every cut, the floor in words, and the CHANNELS block — Summary

Every number the eighteen cuts and the channels have can now be set from BOTTOM's panel. A cut that meets the 1/4"
floor says so under its Depth, and the channels live inside TAIL.

## What changes for the founder

- **Each cut shows its own rows, in your order:** Off Rail, Off Stringer, Trough At, Start, Deepest At, End, Depth, Vee
  Lift, Smoothness — only the ones that cut has.
  - A single: Off Rail, the stations, Depth, Smoothness.
  - A double (and the Spiral Vee): Off Rail, Off Stringer, Trough At (`4" from the stringer`), then the rest; the Spiral
    Vee adds Vee Lift.
  - The Tri-Plane: Off Stringer, then the rest. A vee or belly: the stations, Depth (its lift at the rail), Smoothness.
  - Marks move in 1/16" (1 mm in Metric); Smoothness in 5% steps.
- **The tick box** `Closes to a point toward the center` sits on the three nose single concaves. It is ticked on the
  Teardrop's starting numbers and unticked on the Blended and the Slight Single. A tick is one Undo.
- **The floor in words**, under Depth, in warning ink:
  - a concave the floor holds: `This cut meets the 1/4" floor 8 1/2" from the nose: the stringer is left at 1/4" there,
    shallower than the depth set. Lower the Depth, or move the cut away from the tip.`
  - a vee, belly or channel set that thins the rail: `This cut leaves the rail under 1/4" near the tail: the rail is
    thinner there than the floor. Lower the Depth, or move the cut away from the tip.` (the channels: `The channels
    leave …`). Metric reads `6 mm`.
- **CHANNELS inside TAIL**, under a dashed rule: `None` to start. 4, 6 or 8 bring 2 1/2", 1 3/4" or 1 1/4" unless you
  set a width of your own, and keep everything else. Run (`Parallel` · `With the rail` · `Toe-in · 3.2°`, or
  `Toe-in (no toe)` on a single fin) and Longest side by side. The Width label reads the ramp and the last wall off the
  rail, and `(… to fit)` when a set is squeezed, in grey. Stagger names where the shortest pair starts and hides for
  All the same. Opening a set moves the section to where the channels are deepest.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Each cut's own rows, the Teardrop's tick box, the floor in words | 35a26ddc | bottom-controls.tsx, bottom-copy.ts (+test), design-store.tsx, e2e/bottom-panel.spec.ts |
| 2 | The CHANNELS block inside TAIL | 95e5bd83 | bottom-controls.tsx, bottom-copy.ts (+test), bottom-editor.tsx, design-store.tsx (+test), bottom.ts (+test), e2e/bottom-panel.spec.ts |
| 3 | The founder's look | checkpoint (this summary and the picture) | pictures/17-09-every-row-and-the-channels.png, pictures/17-09-pictures-source.tar.gz |

## Verification

- `npx tsc --noEmit` exit 0; `npm run lint` 0 errors (the same unrelated `import-designs-action.test.ts` warning).
- Full unit suite: after Task 1, 11,348 passed, 2 skipped, exit 0 (582.7 s); after Task 2, 11,362 passed, 2 skipped,
  exit 0 (621.8 s).
- `e2e/bottom-panel.spec.ts`, all three projects, alone: **23 passed, 16 skipped, 0 failed, exit 0 (5.8 min)**. That
  covers the eighteen names on each of the four presets (desktop, 18–35 s each), the tick box, the Rolled Belly rail form,
  and the seven channels tests (the two width tests on the computer only).
- `e2e/bottom-screen.spec.ts --project=desktop`: 2 passed, exit 0 (32.7 s).
- The combined run (`bottom-panel`, `bottom-screen`, `board-lock-screens`, three projects, while the unit suite and the
  orchestrator's suite were running): 57 passed, 38 skipped, 10 failed, exit 1 (21.6 min).
  - Three failures were the spec's own home-page tap, retried after the screen had already changed. Fixed: the tap is
    retried only while the card is still there.
  - Seven were iPhone timeouts in `board-lock-screens`. All seven passed on a re-run alone.
- `board-lock-screens.spec.ts --project=iphone`, alone: 11 passed, 8 skipped, 1 failed. The failure is
  `x-3d` (line 851). The 3D page's Rotate on Side read-out had moved between two reads (`180° left` then `flat`).
  It failed again with `--repeat-each=2` (2 failed).
  - BOTTOM does not touch that page. 17-08 saw the same test fail under load.
  - Raised below; it needs a check on main.
- Desktop and Android `board-lock-screens` passed in the combined run.

### Measured, for the founder

- **Fresh picks that already warn (rail form):**
  - Shortboard: Rolled Belly Entry, Panel Vee, Spiral Vee, Rolled Vee.
  - Fish and Mid-length: Panel Vee, Spiral Vee, Rolled Vee.
  - Longboard: nothing.
  - Six channels at their starting numbers warn on the Shortboard and the Mid-length.
  - D-42 named only the Fish's Panel Vee and the Mid-length's Spiral Vee. The rest come from the same thin tail rail
    (the Shortboard's at 0" from the tail).
- **The stringer form** is never reached on a stock preset at 1/2" (17-05). The picture reaches it by planing the
  Shortboard to 1 3/8" at the center on ROCKER: its blank then stands 3/4" at 12" from the nose. A Blended Nose Concave
  at 1/2" then meets the floor 8 1/2" from the nose.
- **`Toe-in (no toe)`** is cut with `…` at an 820 window, where the column is 84 dots for 98 dots of words. At 1280 it
  reads whole: 114 dots for 98. The plan asked for an ellipsis at both widths, which cannot hold. The test pins what does
  hold: cut at 820, whole at 1280, and never past its row at either width.
- **The floor scan costs 50–75 ms** on a full bottom (three cuts and six channels on the Shortboard). The panel reads it
  through `useDeferredValue`, so the sentence follows a drag a moment later.

## Deviations from Plan

1. **[Orchestrator ruling 2] The rail form's words** are `This cut leaves the rail under 1/4" near the {nose|tail}: the
   rail is thinner there than the floor.` plus the fix sentence. The plan's version ended "it is cut shallower there than
   set", which is untrue since D-40.
2. **[Ruling 3 / UI-SPEC §2] None keeps the channels' numbers for the next count.** The plan said a count from None
   "opens D-11's numbers through startingChannels".
   - On a board that never had channels the two are identical. The stored set is D-11's, and a unit test proves the
     first count equals `startingChannels`.
   - After 6 → None → 6, the shaper's own numbers come back.
   - `switchChannelCount` in `bottom.ts`.
3. **[Rule 1 / Rule 2] Three pure helpers in `lib/geometry/bottom.ts`** (outside `files_modified`), so no component
   works a station out: `switchChannelCount`, `storeChannelStation`, `keepChannelStationsInOrder`. Five tests in
   `bottom.test.ts`; the order-keeping is checked against a Center cut's own `keepStationsInOrder`.
4. **[Rule 1] A double's marks kept in order on every drag.** `updateBottomCut` now runs `keepStationsInOrder` when a
   double's Off Rail, Off Stringer or Trough At moves, as the sketch's `normalize` does. The drawing already clamped them
   on read; now the label agrees with it.
5. **`design-store.test.ts`** (outside the list) gained two source rules: the four menu actions are one undo step each,
   the count goes through `switchChannelCount`, and `updateChannels` keeps its order.
   - Its lock-guard rule also caught a helper (`setChannels`) whose arrow-typed parameter hid its guard. Fixed: the helper
     carries the guard itself, and its parameter's type is named.
6. **`floorWarning(flag, board, system)`** takes the board's length. The plan's `floorWarning(flag, system)` cannot say
   "from the nose" or "near the tail" without it.
7. **The two `Toe-in (no toe)` width tests** pin an ellipsis at 820 and the whole words at 1280 (see Measured).
8. **The e2e opens presets on a phone by their litres line.** A phone's preset cards carry no `Start Shaping` words. BOTTOM
   is reached by `goToScreen` (☰ and the tile).
9. **The commit trailer** is `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (ruling 5).

## Known Stubs

None. The WINGS row and the finished-rail tick box are 17-10's, as planned.

## Threat Flags

None. T-17-16: every new action returns on `lockedRef.current`. The new Selects and the tick box are
`disabled={locked}`, and the sliders are `SliderRow`s. `board-lock-scope.test.ts` passes. T-17-18: the station rows read
the resolved cut and the resolved channels; nothing is written until a slider moves.

## Founder's look: Pending

Picture: `.planning/phases/17-bottom-contours/pictures/17-09-every-row-and-the-channels.png` (sources, the raw shots and
the probe scripts in `17-09-pictures-source.tar.gz`). Taken from the worktree's dev server on 3309 at 1280 wide,
deviceScaleFactor 2.

1. Each cut shows only its own rows, in the order Off Rail, Off Stringer, Trough At, Start, Deepest At, End, Depth, Vee
   Lift, Smoothness.
2. The Teardrop's box is ticked; the other two nose singles' are not, and ticking closes them to a point.
3. The channels: None to start; 4, 6 or 8 bring 2 1/2", 1 3/4", 1 1/4" unless you set your own; the width line reads the
   ramp's angle and the last wall's distance off the rail; a set that will not fit says how wide it was cut.
4. The two warning sentences — the stringer one and the new rail one (D-33, D-40) — are mine to propose: change any
   words you want.

Awaiting "approved", or changes.
