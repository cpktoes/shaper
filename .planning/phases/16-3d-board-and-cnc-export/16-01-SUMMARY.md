---
phase: 16-3d-board-and-cnc-export
plan: 01
subsystem: geometry (litres)
status: complete
tags: [volume, rails, hard-edge, boardSections, D-05, D-20, D-27]
requires: []
provides:
  - "boardSections / boardSectionsWith — the one section function the litres and the 3D board read (16-03)"
  - "HardEdgeRule, HARD_EDGE_FADE (live), HARD_EDGE_SWITCH (by name only), tailHardEdgeWeight"
  - "computeCrossSectionVolumeWith(input, rule)"
  - "RailBandSpec.tailHardEdgeEndsAt?, HARD_EDGE_ENDS_AT_RANGE_IN, DEFAULT_HARD_EDGE_ENDS_AT_IN, hardEdgeEndsAt"
  - "designCrossSectionInput, DesignRules.hardEdge?"
  - "formatHardEdgeEndsAt, hardEdgeEndsAtSlider (the control comes in 16-02)"
  - "phase16Boards / PHASE16_TAILS — the 40-board set; phase16-litres-pin.json"
affects: [16-02, 16-03, 16-05]
tech-stack:
  added: []
  patterns:
    - "Pin today's figures from today's code before a refactor; the generator refuses to run once the refactor exists"
    - "An old rule is callable only by name (HARD_EDGE_SWITCH), the live functions take no rule argument"
key-files:
  created:
    - lib/geometry/__fixtures__/phase16-boards.ts
    - scripts/extract-phase16-litres-pin.ts
    - lib/geometry/__fixtures__/phase16-litres-pin.json
    - lib/geometry/phase16-litres-pin.test.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-01-volume-before-after.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-01-pictures-source.tar.gz
  modified:
    - lib/geometry/volume.ts
    - lib/geometry/design.ts
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bands.test.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - lib/geometry/__fixtures__/phase14-preset-figures.json
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
decisions:
  - "The litres and the 3D board read one section function, boardSections (D-05); proven bit for bit on 40 boards under the old rule"
  - "The tail's hard edge fades by smoothstep from the 12-inch station to the set distance (18 inches when the board says nothing), blending the two sections' areas (D-20/D-27)"
  - "While Hard Edge is on, every tail-nearest station's tucked side reads the centre's Single Tuck and Sharp Bottom Tuck (planner's reading of D-27, awaiting the founder)"
  - "summarizeDesignWith calls the live computeCrossSectionVolume when no rule is named, so design.ts never names the live rule itself"
metrics:
  duration: "about 25 minutes"
  completed: 2026-11-04
actuals:
  tokens: 21000
  tasks: 2
  commits: 3
---

# Phase 16 Plan 01: One section function for the litres, and the hard edge's fade — Summary

The litres now add up the very cross-sections the coming 3D board will draw (`boardSections`), proven to the last
digit on 40 boards, and a hard-edged tail now fades from the 12" mark to 18" instead of switching off halfway to
the centre — moving the three hard-edged presets by two or three hundredths of a litre.

## What changes for the founder

- **Nothing you can see changed in step one.** The app used to work out each cross-section inside the litres
  calculation itself. That work now lives in one place that the 3D board (a later plan) will draw from too, so the
  board you see in 3D and the litres quoted beside it can never disagree. Before touching anything, the app wrote
  down today's litres for 40 test boards (the four presets, each cut five ways, Hard Edge on and off); after the
  change, all 40 read exactly the same, to every digit.
- **The hard edge now fades instead of switching off.** A hard-edged tail used to keep its full hard edge from the
  tail out to halfway between the 12" mark and the centre, then stop dead. Now it's full to the 12" mark, then
  eases out smoothly and is gone by 18" from the tail. The litres follow. There's no control for it yet; plan 16-02
  adds the "Hard Edge Ends At" slider (14" to 24"). Its wording and slider steps are already in place: 18" in
  Imperial, 45.7 cm in Metric.
- **The presets' litres move a little.** On the cards and on VOLUME: Shortboard 29.61 → 29.59 L, Fish 34.65 → 34.64 L,
  Mid-length 49.41 → 49.38 L. The default board goes from 30.29 → 30.27 L. The Longboard doesn't move, because its
  tail isn't hard-edged. Nothing on the screen says the figure changed; VOLUME just shows the new number.
- **The tail's hidden tuck boxes can no longer move the litres.** While Hard Edge is on, RAILS hides the tail's own
  Single Tuck and Sharp Bottom Tuck, so the tail end of the board now reads the centre's boxes instead. No preset is
  affected, because every preset has those boxes off.
- **Please look at one thing in the table below: a longboard with Hard Edge turned on moves by about 1 litre, not a
  few hundredths.** The plan expected every hard-edged board to move 0.01–0.04 L. That's true for the shortboard,
  fish and mid-length shapes (0.016–0.032 L). The test set also turns Hard Edge on for the Longboard, and on those
  five boards the move at 18" is 1.00–1.07 L. The reason: on a 9'0" board, halfway between the 12" mark and the
  centre is about 33" from the tail. So the old switch kept the hard edge over far more of the tail than the new fade
  does, and on this board a hard edge holds much more foam than a tucked rail (Hard Edge on vs off was 1.46 L before
  the change). The Longboard preset opens with Hard Edge off, so no preset card moves. A saved longboard with Hard
  Edge ticked would lose about a litre, though. Setting the fade to 24" gives back about 0.14 L of that.

## Tasks

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1a | Record today's litres for 40 test boards (the pin, alone, before `volume.ts` changed) | 79eb7224 | phase16-boards.ts, extract-phase16-litres-pin.ts, phase16-litres-pin.json |
| 1b | One section function; every litres figure unchanged (tracer) | 2da3e456 | volume.ts, design.ts, phase16-litres-pin.test.ts |
| 2 | The hard edge fades from 12" to the set distance; preset figures regenerated; VOLUME picture re-recorded | 2effde69 | rail-bands.ts(+test), volume.ts(+test), blank-reasons.ts(+test), phase14-preset-figures.json, desktop-baseline.spec.ts + VOLUME PNG |
| 3 | The founder looks before this merges | — (checkpoint) | pictures/16-01-volume-before-after.png, this SUMMARY |

Tracer gate: after 1b, the pin test (81 tests: 40 bit-identical litres, 40 station-for-station area checks, the set
itself) and the full suite passed. Then the plan expanded to Task 2.

## Verification

- `npm test`: 163 files, 6870 passed, 2 skipped (after Task 2). `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors (one
  warning in `lib/db/import-designs-action.test.ts` was there before this plan and is left alone).
- The pin generator now refuses to run ("the pin records the litres from before boardSections existed — it is never
  re-run"), exits 1, and leaves the JSON untouched.
- `scripts/extract-phase14-preset-figures.ts --step tips` changed exactly three lines of
  `phase14-preset-figures.json`, all `litres` (Shortboard, Fish, Mid-length).
- The desktop baseline initially failed on VOLUME alone: 649 pixels differed, all inside the litres figure's box
  (x 1160–1223, y 361–378). Re-recorded VOLUME only (SHA-256 14f11e4c → ae36a4ba). TEMPLATE, ROCKER, RAILS and FINS
  are byte for byte the same. `desktop-baseline.spec.ts` + `volume-fins-panels.spec.ts` (desktop): 15 passed.
- The four preset before/after pairs differ only inside the same litres box. The Longboard pair is pixel-identical.
- `git diff --stat 89e6b9c2 HEAD -- drizzle lib/db/schema.ts components app` is empty. No database change, no
  screen code.

## The 40-board litres table

"Today" is the old switch (`HARD_EDGE_SWITCH`), and every Today figure matches the pin to every digit. The three fade
columns are the live rule with the board's set distance at 14", 18" (what every board reads when it says nothing)
and 24". "Move at 18"" is the live figure minus today's. All figures come from the app's own functions (scratch script
`table40.ts`, archived in `pictures/16-01-pictures-source.tar.gz`).

| Board | Today (L) | Fade to 14" (L) | Fade to 18" — live (L) | Fade to 24" (L) | Move at 18" (L) |
|---|---:|---:|---:|---:|---:|
| shortboard · asis · hard | 29.6122 | 29.5862 | 29.5903 | 29.5969 | -0.0219 |
| shortboard · asis · soft | 29.5712 | 29.5712 | 29.5712 | 29.5712 | 0 |
| shortboard · swallow · hard | 30.6350 | 30.6096 | 30.6135 | 30.6201 | -0.0215 |
| shortboard · swallow · soft | 30.5947 | 30.5947 | 30.5947 | 30.5947 | 0 |
| shortboard · diamond · hard | 30.1810 | 30.1549 | 30.1590 | 30.1656 | -0.0220 |
| shortboard · diamond · soft | 30.1402 | 30.1402 | 30.1402 | 30.1402 | 0 |
| shortboard · pin · hard | 28.7721 | 28.7461 | 28.7501 | 28.7567 | -0.0219 |
| shortboard · pin · soft | 28.7313 | 28.7313 | 28.7313 | 28.7313 | 0 |
| shortboard · round · hard | 28.7721 | 28.7461 | 28.7501 | 28.7567 | -0.0219 |
| shortboard · round · soft | 28.7313 | 28.7313 | 28.7313 | 28.7313 | 0 |
| fish · asis · hard | 34.6507 | 34.6318 | 34.6351 | 34.6413 | -0.0156 |
| fish · asis · soft | 34.6190 | 34.6190 | 34.6190 | 34.6190 | 0 |
| fish · swallow · hard | 34.6507 | 34.6318 | 34.6351 | 34.6413 | -0.0156 |
| fish · swallow · soft | 34.6190 | 34.6190 | 34.6190 | 34.6190 | 0 |
| fish · diamond · hard | 34.0774 | 34.0580 | 34.0614 | 34.0675 | -0.0160 |
| fish · diamond · soft | 34.0453 | 34.0453 | 34.0453 | 34.0453 | 0 |
| fish · pin · hard | 31.8748 | 31.8559 | 31.8592 | 31.8654 | -0.0155 |
| fish · pin · soft | 31.8432 | 31.8432 | 31.8432 | 31.8432 | 0 |
| fish · round · hard | 31.8748 | 31.8559 | 31.8592 | 31.8654 | -0.0155 |
| fish · round · soft | 31.8432 | 31.8432 | 31.8432 | 31.8432 | 0 |
| midlength · asis · hard | 49.4062 | 49.3738 | 49.3773 | 49.3836 | -0.0289 |
| midlength · asis · soft | 49.3602 | 49.3602 | 49.3602 | 49.3602 | 0 |
| midlength · swallow · hard | 51.6643 | 51.6290 | 51.6329 | 51.6394 | -0.0314 |
| midlength · swallow · soft | 51.6155 | 51.6155 | 51.6155 | 51.6155 | 0 |
| midlength · diamond · hard | 50.9912 | 50.9557 | 50.9595 | 50.9659 | -0.0317 |
| midlength · diamond · soft | 50.9423 | 50.9423 | 50.9423 | 50.9423 | 0 |
| midlength · pin · hard | 49.4062 | 49.3738 | 49.3773 | 49.3836 | -0.0289 |
| midlength · pin · soft | 49.3602 | 49.3602 | 49.3602 | 49.3602 | 0 |
| midlength · round · hard | 49.4062 | 49.3738 | 49.3773 | 49.3836 | -0.0289 |
| midlength · round · soft | 49.3602 | 49.3602 | 49.3602 | 49.3602 | 0 |
| longboard · asis · hard | 75.0315 | 73.8782 | 73.9612 | 74.1013 | -1.0703 |
| longboard · asis · soft | 73.5743 | 73.5743 | 73.5743 | 73.5743 | 0 |
| longboard · swallow · hard | 75.5172 | 74.4167 | 74.5224 | 74.6629 | -0.9949 |
| longboard · swallow · soft | 74.1387 | 74.1387 | 74.1387 | 74.1387 | 0 |
| longboard · diamond · hard | 74.6523 | 73.5421 | 73.6462 | 73.7858 | -1.0061 |
| longboard · diamond · soft | 73.2621 | 73.2621 | 73.2621 | 73.2621 | 0 |
| longboard · pin · hard | 70.3914 | 69.2380 | 69.3211 | 69.4612 | -1.0703 |
| longboard · pin · soft | 68.9394 | 68.9394 | 68.9394 | 68.9394 | 0 |
| longboard · round · hard | 70.3914 | 69.2380 | 69.3211 | 69.4612 | -1.0703 |
| longboard · round · soft | 68.9394 | 68.9394 | 68.9394 | 68.9394 | 0 |

How to read it: every soft board reads the same under both rules. Every hard-edged board loses a little, and loses
less as the fade reaches further (24" keeps more than 14"). The Longboard rows are the exception described above.
The board set uses each preset on the blank its Phase 14 records were taken on, so the Longboard preset's own row here
(73.57 L, soft) differs from what its card shows today (72.35 L, on its newer 9'4"B blank). Neither moves.

## The before-and-after picture

`.planning/phases/16-3d-board-and-cnc-export/pictures/16-01-volume-before-after.png`: VOLUME at 1280 × 800 for the
default board (before = the reference picture at the fork commit), then the Shortboard, Fish, Mid-length and
Longboard as their cards open them. Before is on the left, after on the right, one captioned row per board. The
preset "before" shots were taken from this worktree right after Task 1 (litres still today's) and the "after" shots
after Task 2, both on the webpack dev server (port 3201).

## Deviations from Plan

1. **[Rule 3 - Blocking/clarity] `summarizeDesignWith` picks the function, not the rule.** The plan said to pass
   `rules.hardEdge ?? <live rule>` to `computeCrossSectionVolumeWith`. Instead, `design.ts` calls the live
   `computeCrossSectionVolume` when no rule is named and `computeCrossSectionVolumeWith(input, rules.hardEdge)` when
   one is. The behaviour is the same, but `design.ts` never names the live rule, so Task 2's swap to the fade changed
   `volume.ts` alone and the two can't drift. Files: `lib/geometry/design.ts`. Commit 2da3e456.
2. **[Rule 2 - Exported helper type] `RailAnchorStations` exported** from `volume.ts`, the
   `{ tail; center; nose }` shape `HardEdgeRule.weight` takes, so 16-02/16-03 can write rules against a named type.
3. **The 40-board table contradicts the plan's expectation for the Longboard rows.** The plan's how-to-verify says
   "every hard-edged board moves by about 0.01–0.04 L". The Longboard with Hard Edge forced on moves by about 1 L.
   This is a finding, not a code change; it's reported above for the founder. No preset card is affected.
4. **Picture of the default board:** per the orchestrator's ruling, "before" is the fork commit's reference PNG and
   "after" the re-recorded one. The plan's "main's picture of today" was taken as that.

No files outside `files_modified` were touched. `components/design/design-store.tsx` still calls
`computeCrossSectionVolume` directly, which now uses the live fade. It's correct as is and was left alone (out of
scope).

## Threat surface

T-16-01 is mitigated as planned: `hardEdgeEndsAt` reads 18" for NaN, ±Infinity, 1e9, 10", 30", -18" and a string
(unit-tested), so the fade's end is always inside 14"–24". T-16-02: the generator refuses to run once `boardSections`
exists. No new endpoints or storage.

## Known Stubs

None. `tailHardEdgeEndsAt` has no control yet by design (16-02 adds the slider and the snapshot rule). Every board
reads 18" until then.

## Self-Check: PASSED

- FOUND: lib/geometry/__fixtures__/phase16-boards.ts, scripts/extract-phase16-litres-pin.ts,
  lib/geometry/__fixtures__/phase16-litres-pin.json (40 entries), lib/geometry/phase16-litres-pin.test.ts,
  pictures/16-01-volume-before-after.png, pictures/16-01-pictures-source.tar.gz
- FOUND commits: 79eb7224 (pin only; does not touch volume.ts), 2da3e456, 2effde69 (one PNG changed)

## Founder's look

Presented by the orchestrator at the Wave 1 checkpoint, 2026-11-04, with the before-and-after VOLUME picture and the
40-board table. The founder answered on one card:

- **The Longboard finding:** "Accept as designed." A longboard with Hard Edge on reads about 1 L less because the fade
  ends at 18" where the old switch ran the hard edge out to about 33"; D-20's range (14"–24", default 18") stands, the
  Longboard preset ships with Hard Edge off, and the 16-02 read-only report before go-live 1 shows whether any saved
  board is affected.
- **The D-27 reading:** "Confirm." While Hard Edge is on, every tail-nearest station — in the fade and past it — takes
  the centre's Single Tuck and Sharp Bottom Tuck, because RAILS hides the tail's own.
- **16-01 as a whole:** "Approved." Merged into `board-3d` as 8af9677b.

The two deviations (the live rule called directly in `design.ts`; the exported `RailAnchorStations` type) were
accepted by the orchestrator.

## D-30 update (2026-11-04, plan 16-02)

After looking at 16-02, the founder ruled D-30: "The hard edge blend needs a blend sharp edge from AND a blend to.
Currently the blend is happening over too short a distance but that should be the user's choice." So the fade this
plan built now has two settings instead of one.
- **Hard Edge Blends From:** the edge is full up to here. 12" to 30", default 18".
- **Hard Edge Ends At:** by here the rail has fully blended into the centre's tucked rail. At least 2" past Blends
  From, up to the board's centre; default 30".

The maths is in `lib/geometry/rail-bands.ts` (`hardEdgeBlendsFrom`, `hardEdgeEndsAt`) and `lib/geometry/volume.ts`
(`HARD_EDGE_FADE`). The D-27 tuck source is unchanged. The pin still reports all 40 boards bit-identical under
`HARD_EDGE_SWITCH`.

The table below uses the same 40 boards as above. "Today" is the old switch, checked against the pin to every digit.
"Old fade" is this plan's original 12"→18" fade, kept for reference. The live column is a board that says nothing,
which now reads 18"→30". All figures come from the app's own functions, printed by 16-01's table printer adapted as
`table40-d30.ts` (archived in `pictures/16-02-pictures-source.tar.gz`).

| Board | Today (L) | Old fade 12"→18" (L) | D-30 default 18"→30" — live (L) | Move at the D-30 default (L) |
|---|---:|---:|---:|---:|
| shortboard · asis · hard | 29.6122 | 29.5903 | 29.6121 | -0.0001 |
| shortboard · asis · soft | 29.5712 | 29.5712 | 29.5712 | 0 |
| shortboard · swallow · hard | 30.6350 | 30.6135 | 30.6353 | 0.0003 |
| shortboard · swallow · soft | 30.5947 | 30.5947 | 30.5947 | 0 |
| shortboard · diamond · hard | 30.1810 | 30.1590 | 30.1808 | -0.0002 |
| shortboard · diamond · soft | 30.1402 | 30.1402 | 30.1402 | 0 |
| shortboard · pin · hard | 28.7721 | 28.7501 | 28.7719 | -0.0001 |
| shortboard · pin · soft | 28.7313 | 28.7313 | 28.7313 | 0 |
| shortboard · round · hard | 28.7721 | 28.7501 | 28.7719 | -0.0001 |
| shortboard · round · soft | 28.7313 | 28.7313 | 28.7313 | 0 |
| fish · asis · hard | 34.6507 | 34.6351 | 34.6554 | 0.0047 |
| fish · asis · soft | 34.6190 | 34.6190 | 34.6190 | 0 |
| fish · swallow · hard | 34.6507 | 34.6351 | 34.6554 | 0.0047 |
| fish · swallow · soft | 34.6190 | 34.6190 | 34.6190 | 0 |
| fish · diamond · hard | 34.0774 | 34.0614 | 34.0816 | 0.0043 |
| fish · diamond · soft | 34.0453 | 34.0453 | 34.0453 | 0 |
| fish · pin · hard | 31.8748 | 31.8592 | 31.8795 | 0.0047 |
| fish · pin · soft | 31.8432 | 31.8432 | 31.8432 | 0 |
| fish · round · hard | 31.8748 | 31.8592 | 31.8795 | 0.0047 |
| fish · round · soft | 31.8432 | 31.8432 | 31.8432 | 0 |
| midlength · asis · hard | 49.4062 | 49.3773 | 49.3981 | -0.0081 |
| midlength · asis · soft | 49.3602 | 49.3602 | 49.3602 | 0 |
| midlength · swallow · hard | 51.6643 | 51.6329 | 51.6543 | -0.0100 |
| midlength · swallow · soft | 51.6155 | 51.6155 | 51.6155 | 0 |
| midlength · diamond · hard | 50.9912 | 50.9595 | 50.9807 | -0.0105 |
| midlength · diamond · soft | 50.9423 | 50.9423 | 50.9423 | 0 |
| midlength · pin · hard | 49.4062 | 49.3773 | 49.3981 | -0.0081 |
| midlength · pin · soft | 49.3602 | 49.3602 | 49.3602 | 0 |
| midlength · round · hard | 49.4062 | 49.3773 | 49.3981 | -0.0081 |
| midlength · round · soft | 49.3602 | 49.3602 | 49.3602 | 0 |
| longboard · asis · hard | 75.0315 | 73.9612 | 74.4187 | -0.6128 |
| longboard · asis · soft | 73.5743 | 73.5743 | 73.5743 | 0 |
| longboard · swallow · hard | 75.5172 | 74.5224 | 74.9801 | -0.5371 |
| longboard · swallow · soft | 74.1387 | 74.1387 | 74.1387 | 0 |
| longboard · diamond · hard | 74.6523 | 73.6462 | 74.1034 | -0.5489 |
| longboard · diamond · soft | 73.2621 | 73.2621 | 73.2621 | 0 |
| longboard · pin · hard | 70.3914 | 69.3211 | 69.7786 | -0.6128 |
| longboard · pin · soft | 68.9394 | 68.9394 | 68.9394 | 0 |
| longboard · round · hard | 70.3914 | 69.3211 | 69.7786 | -0.6128 |
| longboard · round · soft | 68.9394 | 68.9394 | 68.9394 | 0 |

**What moved, and why:**
- At the new defaults the hard edge stays full out to 18" and doesn't finish blending until 30". That keeps more hard
  edge than the 12"→18" fade did. On the shortboard, fish and mid-length shapes the litres land within about a
  hundredth of a litre of today's switch (the fish a touch above it, the mid-length a touch below).
- The longboard rows still read less than today, but by about 0.54–0.61 L instead of 1.0–1.07 L. On a 9'0" board the
  old switch kept the hard edge out to about 33", and 30" falls short of that. The new Ends At can be set as far as
  the board's centre (54" on that board), so a shaper can now keep that much hard edge, or more.

The preset cards and VOLUME move with it (`phase14-preset-figures.json` regenerated, three `litres` lines):
- Shortboard 29.59 → 29.61 L (today's switch: 29.61)
- Fish 34.64 → 34.66 L (today's: 34.65)
- Mid-length 49.38 → 49.40 L (today's: 49.41)
- Longboard: unchanged (its tail isn't hard-edged)

The default board's VOLUME reads 30.29 L again, so `volume-desktop.png` was re-recorded. The new file is
byte-for-byte the picture from before 16-01.
