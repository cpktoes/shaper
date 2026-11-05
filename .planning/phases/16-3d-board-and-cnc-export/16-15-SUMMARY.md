---
phase: 16-3d-board-and-cnc-export
plan: 15
subsystem: geometry (the section rule behind the litres, the 3D board and the CNC files), RAILS and 3D panel rows, saved-boards report
status: complete
tags: [geometry, volume, rails, 3d, report, D-05, D-18, D-27, D-30, D-31, D-32]
requires:
  - "16-02/16-03: tailHardEdgeWeight, hardEdgeBlendsFrom / hardEdgeEndsAt, fadingSectionArea (D-31's level variant), blendFinishedRails"
  - "16-07/16-12: the 3D panel's HARD EDGE group bound to the store, the panel order, three-d-desktop.png"
  - "16-01: phase16Boards, the 40-board pin under HARD_EDGE_SWITCH"
provides:
  - "lib/geometry/volume.ts: RailCharacter, RailCharacterKey, railCharacterOf, railCharacterDifferences, noseRailWeight, StationRailCharacter, RailCharacterRule, SectionRule, RAIL_CHARACTER_FADE (the live rule), boardSectionEnds; BoardSection.tipWeight and .sharpness"
  - "lib/geometry/__fixtures__/phase16-boards.ts: phase16RailCharacterBoards (34), PHASE16_TUCKED, phase16LiveBoards (74)"
  - "lib/geometry/__fixtures__/phase16-live-litres-pin.json + scripts/extract-phase16-live-litres-pin.ts (refuses to re-run) + lib/geometry/phase16-live-litres-pin.test.ts"
  - "lib/models/rail-character-report.ts: railCharacterLitresMove, railCharacterReportLines; scripts/check-saved-boards.ts --rail-character-report"
  - "components/3d/three-d-controls.tsx ThreeDTailRail (data-three-d-tail-rail); THREE_D_COPY tailRail… keys"
affects: [16-13, 16-16, 16-17]
tech-stack:
  added: []
  patterns:
    - "One section rule with two interfaces told apart by `\"at\" in rule`: the two old HardEdgeRules read exactly as before, the new RailCharacterRule returns a base character, a tip character and the tip's weight"
    - "A weight clamped into [0, 1] before the branch, and every shared weight (hard edge, sharpness) set by cases, never by arithmetic that can round"
    - "A second refusing pin generator (refuses once RAIL_CHARACTER_FADE exists), committed alone before the rule changed"
key-files:
  created:
    - scripts/extract-phase16-live-litres-pin.ts
    - lib/geometry/__fixtures__/phase16-live-litres-pin.json
    - lib/geometry/phase16-live-litres-pin.test.ts
    - lib/models/rail-character-report.ts
    - lib/models/rail-character-report.test.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-15-rails-rows.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-15-3d-before-after.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-15-pictures-source.tar.gz
  modified:
    - lib/geometry/__fixtures__/phase16-boards.ts
    - lib/geometry/volume.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/design.ts
    - lib/geometry/rail-bands.ts
    - lib/geometry/board-surface.ts
    - lib/geometry/board-surface.test.ts
    - lib/geometry/__fixtures__/phase14-preset-figures.json
    - components/rails/rail-controls.tsx
    - components/3d/three-d-copy.ts
    - components/3d/three-d-controls.tsx
    - components/3d/three-d-screen.tsx
    - scripts/check-saved-boards.ts
    - e2e/rails-advanced.spec.ts
    - e2e/three-d-hard-edge.spec.ts
    - e2e/three-d-screen.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/three-d-desktop-desktop-darwin.png
decisions:
  - "D-32 built as the founder ruled at plan approval: all five discrete settings fade (Family and Symmetrical too); the rows are the tail rail's (Tail Rail Blends From / Ends At, 3D group Tail Rail), always shown; the nose has no control and nothing stored; the tip taper left as it is"
  - "The nose's default blend is smoothstep from the centre (weight 0) to the nose 12\" station (weight 1), the tail's own shape"
  - "A bottom edge's sharpness by cases: 1 where both ends are sharp, 0 where neither, the sharp end's share where one is — the 3D ring reads it straight off the section"
  - "Deck Profile, Ratio, the scale and the nudges keep their long straight blend from each 12\" station to the centre (the orchestrator's reading of D-32, still open for the founder's look)"
metrics:
  duration: "about 75 minutes"
  completed: 2026-11-04
estimate:
  tokens: 120000
actuals:
  tokens: 44000
  tasks: 2
  commits: 3
---

# Phase 16 Plan 15: The Whole Rail Fades Summary

The tail's whole rail character — Hard Edge, Family, Symmetrical, Single Tuck, Sharp Bottom Tuck — now fades into
the centre's between Tail Rail Blends From and Tail Rail Ends At, Hard Edge ticked or not; the centre's rail fades
into the nose's on its own from the centre to the nose 12" mark; a bottom edge stays sharp through a blend wherever
both ends are sharp. Nothing about the rail switches halfway along the board any more, and the 3D board shows no
step. Boards with nothing to fade keep their litres to the last digit.

## What changes for the founder

- **On the 3D board, no more steps in the rail.** Before, every rail setting other than the hard edge switched in
  one spot halfway between the 12" mark and the centre (and again halfway to the nose 12" mark), which the 3D board
  showed as a step of about 1 to 6 mm across the rail. Now:
  - **The tail:** the tail rail as you set it holds full to Tail Rail Blends From, then eases into the centre's rail
    as set, which is reached by Tail Rail Ends At. That's whatever differs — a Sharp Bottom Tuck, a Single Tuck, a
    different Family — not only the hard edge, and with Hard Edge ticked or not.
  - **The nose, with no control at all** (your words: "Only the tail rail gets the users blend. The nose is a default
    that always gets applied."): wherever the nose rail differs from the centre's, the centre's rail eases into the
    nose's between the centre and the nose 12" mark, using the same smooth S-shaped ease the tail uses. From the nose
    12" mark to the tip nothing is new (you said "Yes, leave the tip as it is").
  - **Sharp stays sharp:** a hard-edged tail fading into a centre with Sharp Bottom Tuck ticked keeps a sharp bottom
    edge the whole way. A Sharp-Bottom-Tucked tail fading into a round centre goes from sharp at Blends From to round
    at Ends At.
- **RAILS' two tail rows are renamed and always show.** The tail's Advanced menu now ends with **Tail Rail Blends From
  — 18"** and **Tail Rail Ends At — 30"** directly above ↺ Reset Advanced Settings, Hard Edge on or off (with it off,
  they sit under the tuck rows). The nose's and the centre's menus have nothing new. Ranges, steps, Metric, Reset and
  the lock are exactly as before.
- **The 3D page's group is now TAIL RAIL**, with the same two rows in the same words, and it's always live — no
  dimming and no "Tick Hard Edge…" line any more.
- **The litres move a little on boards whose tail or nose rail differs from the centre's**, and every preset is one
  of them (each has a tail or nose Family that differs). As the cards open them: Shortboard 29.61 L, Fish 34.65 L,
  Mid-length 49.40 L (all as before at two decimals), and the **Longboard 72.35 → 72.40 L**. The stock 6'0" is
  unchanged at 30.29 L. Nothing on screen says the litres moved.
- **For go-live 2**, a read-only report lists every saved board this reaches, with its move (see below).

## The presets' figures

`phase14-preset-figures.json` regenerated by `scripts/extract-phase14-preset-figures.ts --step tips`: exactly four
`litres` lines changed (each record's own blank): Shortboard 29.6099 → 29.6117 (+0.0019), Fish 34.6514 → 34.6476
(−0.0037), Mid-length 49.3974 → 49.4036 (+0.0062), Longboard 73.5743 → 73.6222 (+0.0479) — the planner's
measurement, digit for digit. As the cards open them today (`presetDesignFields`, the app's own functions):

| Preset | Go-live 1 (L) | New rule (L) | Move | Tail differs in | Nose differs in |
|---|---:|---:|---:|---|---|
| Shortboard | 29.61 | 29.61 | +0.0019 | Hard Edge | Family |
| Fish | 34.65 | 34.65 | −0.0037 | Hard Edge | Family |
| Mid-length | 49.40 | 49.40 | +0.0062 | Hard Edge, Family | — |
| Longboard | 72.35 | 72.40 | +0.0449 | Family | — |

## The 74-board litres table (today against the new rule)

"Today" is go-live 1's live litres as the second pin recorded them before `volume.ts` changed; "new rule" is
`summarizeDesign` now. 10 of 74 are bit-identical — exactly the 8 `aligned` boards and the 2 `stock` boards (their
tail differs from the centre in nothing but the Hard Edge and their nose in nothing). Largest move:
`tucked|longboard|tail-single`, +0.2119 L.

| Board | Tail differs in | Nose differs in | Today (L) | New rule (L) | Move (L) |
|---|---|---|---:|---:|---:|
| shortboard\|asis\|hard | Hard Edge | Family | 29.6099 | 29.6117 | +0.0019 |
| shortboard\|asis\|soft | same | Family | 29.5712 | 29.5730 | +0.0019 |
| shortboard\|swallow\|hard | Hard Edge | Family | 30.6331 | 30.6347 | +0.0016 |
| shortboard\|swallow\|soft | same | Family | 30.5947 | 30.5964 | +0.0016 |
| shortboard\|diamond\|hard | Hard Edge | Family | 30.1786 | 30.1805 | +0.0019 |
| shortboard\|diamond\|soft | same | Family | 30.1402 | 30.1421 | +0.0019 |
| shortboard\|pin\|hard | Hard Edge | Family | 28.7697 | 28.7716 | +0.0019 |
| shortboard\|pin\|soft | same | Family | 28.7313 | 28.7332 | +0.0019 |
| shortboard\|round\|hard | Hard Edge | Family | 28.7697 | 28.7716 | +0.0019 |
| shortboard\|round\|soft | same | Family | 28.7313 | 28.7332 | +0.0019 |
| fish\|asis\|hard | Hard Edge | Family | 34.6514 | 34.6476 | −0.0037 |
| fish\|asis\|soft | same | Family | 34.6190 | 34.6153 | −0.0037 |
| fish\|swallow\|hard | Hard Edge | Family | 34.6514 | 34.6476 | −0.0037 |
| fish\|swallow\|soft | same | Family | 34.6190 | 34.6153 | −0.0037 |
| fish\|diamond\|hard | Hard Edge | Family | 34.0776 | 34.0736 | −0.0040 |
| fish\|diamond\|soft | same | Family | 34.0453 | 34.0413 | −0.0040 |
| fish\|pin\|hard | Hard Edge | Family | 31.8755 | 31.8718 | −0.0037 |
| fish\|pin\|soft | same | Family | 31.8432 | 31.8394 | −0.0037 |
| fish\|round\|hard | Hard Edge | Family | 31.8755 | 31.8718 | −0.0037 |
| fish\|round\|soft | same | Family | 31.8432 | 31.8394 | −0.0037 |
| midlength\|asis\|hard | Hard Edge, Family | same | 49.3974 | 49.4036 | +0.0062 |
| midlength\|asis\|soft | Family | same | 49.3602 | 49.3656 | +0.0054 |
| midlength\|swallow\|hard | Hard Edge, Family | same | 51.6536 | 51.6620 | +0.0084 |
| midlength\|swallow\|soft | Family | same | 51.6155 | 51.6232 | +0.0078 |
| midlength\|diamond\|hard | Hard Edge, Family | same | 50.9800 | 50.9890 | +0.0090 |
| midlength\|diamond\|soft | Family | same | 50.9423 | 50.9506 | +0.0084 |
| midlength\|pin\|hard | Hard Edge, Family | same | 49.3974 | 49.4036 | +0.0062 |
| midlength\|pin\|soft | Family | same | 49.3602 | 49.3656 | +0.0054 |
| midlength\|round\|hard | Hard Edge, Family | same | 49.3974 | 49.4036 | +0.0062 |
| midlength\|round\|soft | Family | same | 49.3602 | 49.3656 | +0.0054 |
| longboard\|asis\|hard | Hard Edge, Family | same | 74.5361 | 74.5783 | +0.0422 |
| longboard\|asis\|soft | Family | same | 73.5743 | 73.6222 | +0.0479 |
| longboard\|swallow\|hard | Hard Edge, Family | same | 75.0962 | 75.1306 | +0.0344 |
| longboard\|swallow\|soft | Family | same | 74.1387 | 74.1782 | +0.0395 |
| longboard\|diamond\|hard | Hard Edge, Family | same | 74.2196 | 74.2552 | +0.0356 |
| longboard\|diamond\|soft | Family | same | 73.2621 | 73.3029 | +0.0408 |
| longboard\|pin\|hard | Hard Edge, Family | same | 69.8961 | 69.9384 | +0.0422 |
| longboard\|pin\|soft | Family | same | 68.9394 | 68.9873 | +0.0479 |
| longboard\|round\|hard | Hard Edge, Family | same | 69.8961 | 69.9384 | +0.0422 |
| longboard\|round\|soft | Family | same | 68.9394 | 68.9873 | +0.0479 |
| aligned\|shortboard\|hard | Hard Edge | same | 29.5704 | 29.5704 | ±0.0000 |
| aligned\|shortboard\|soft | same | same | 29.5317 | 29.5317 | ±0.0000 |
| aligned\|fish\|hard | Hard Edge | same | 34.6973 | 34.6973 | ±0.0000 |
| aligned\|fish\|soft | same | same | 34.6650 | 34.6650 | ±0.0000 |
| aligned\|midlength\|hard | Hard Edge | same | 49.4455 | 49.4455 | ±0.0000 |
| aligned\|midlength\|soft | same | same | 49.4160 | 49.4160 | ±0.0000 |
| aligned\|longboard\|hard | Hard Edge | same | 74.6295 | 74.6295 | ±0.0000 |
| aligned\|longboard\|soft | same | same | 73.7327 | 73.7327 | ±0.0000 |
| stock\|hard | Hard Edge | same | 30.2886 | 30.2886 | ±0.0000 |
| stock\|soft | same | same | 30.2566 | 30.2566 | ±0.0000 |
| tucked\|shortboard\|tail-sbt | Sharp Bottom Tuck | Family | 29.5733 | 29.5745 | +0.0012 |
| tucked\|shortboard\|tail-single | Single Tuck | Family | 29.5508 | 29.5523 | +0.0015 |
| tucked\|shortboard\|he-centre-sbt | Hard Edge | Family, Sharp Bottom Tuck | 29.6163 | 29.6170 | +0.0007 |
| tucked\|shortboard\|nose-sbt | Hard Edge | Family, Sharp Bottom Tuck | 29.6117 | 29.6117 | +0.0000 |
| tucked\|shortboard\|nose-single | Hard Edge | Family, Single Tuck | 29.5913 | 29.5923 | +0.0010 |
| tucked\|shortboard\|centre-single-sbt | Hard Edge | Family, Single Tuck, Sharp Bottom Tuck | 29.5843 | 29.5852 | +0.0009 |
| tucked\|fish\|tail-sbt | Sharp Bottom Tuck | Family | 34.6207 | 34.6165 | −0.0042 |
| tucked\|fish\|tail-single | Single Tuck | Family | 34.6009 | 34.5948 | −0.0061 |
| tucked\|fish\|he-centre-sbt | Hard Edge | Family, Sharp Bottom Tuck | 34.6569 | 34.6509 | −0.0060 |
| tucked\|fish\|nose-sbt | Hard Edge | Family, Sharp Bottom Tuck | 34.6543 | 34.6496 | −0.0047 |
| tucked\|fish\|nose-single | Hard Edge | Family, Single Tuck | 34.6229 | 34.6171 | −0.0058 |
| tucked\|fish\|centre-single-sbt | Hard Edge | Family, Single Tuck, Sharp Bottom Tuck | 34.6287 | 34.6232 | −0.0055 |
| tucked\|midlength\|tail-sbt | Family, Sharp Bottom Tuck | same | 49.3626 | 49.3673 | +0.0046 |
| tucked\|midlength\|tail-single | Family, Single Tuck | same | 49.3353 | 49.3429 | +0.0076 |
| tucked\|midlength\|he-centre-sbt | Hard Edge, Family | Sharp Bottom Tuck | 49.4055 | 49.4086 | +0.0031 |
| tucked\|midlength\|nose-sbt | Hard Edge, Family | Sharp Bottom Tuck | 49.4014 | 49.4050 | +0.0036 |
| tucked\|midlength\|nose-single | Hard Edge, Family | Single Tuck | 49.3577 | 49.3626 | +0.0049 |
| tucked\|midlength\|centre-single-sbt | Hard Edge, Family | Single Tuck, Sharp Bottom Tuck | 49.3599 | 49.3630 | +0.0031 |
| tucked\|longboard\|tail-sbt | Family, Sharp Bottom Tuck | same | 73.6282 | 73.6454 | +0.0172 |
| tucked\|longboard\|tail-single | Family, Single Tuck | same | 73.0311 | 73.2431 | +0.2119 |
| tucked\|longboard\|he-centre-sbt | Hard Edge, Family | Sharp Bottom Tuck | 74.7011 | 74.7139 | +0.0128 |
| tucked\|longboard\|nose-sbt | Family | Sharp Bottom Tuck | 73.6188 | 73.6373 | +0.0185 |
| tucked\|longboard\|nose-single | Family | Single Tuck | 73.1005 | 73.1575 | +0.0570 |
| tucked\|longboard\|centre-single-sbt | Family, Single Tuck, Sharp Bottom Tuck | Single Tuck, Sharp Bottom Tuck | 72.8007 | 72.6470 | −0.1537 |

## The rail-character report on the 74 test boards

`railCharacterReportLines` over `phase16LiveBoards()`, each board's label standing in for its id (no test board
stores either tail setting, so both read the defaults, marked):

```
rail-character report: 74 saved boards; 74 open; 64 whose tail or nose rail differs from the centre's
tucked|longboard|tail-single: tail Family, Single Tuck · blends from 18" (default) · ends at 36" (default); nose same as the centre — 73.03 → 73.24 L (+0.2119)
tucked|longboard|centre-single-sbt: tail Family, Single Tuck, Sharp Bottom Tuck · blends from 18" (default) · ends at 36" (default); nose Single Tuck, Sharp Bottom Tuck — 72.80 → 72.65 L (-0.1537)
tucked|longboard|nose-single: tail Family · blends from 18" (default) · ends at 36" (default); nose Single Tuck — 73.10 → 73.16 L (+0.0570)
longboard|asis|soft: tail Family · blends from 18" (default) · ends at 36" (default); nose same as the centre — 73.57 → 73.62 L (+0.0479)
longboard|pin|soft: tail Family · blends from 18" (default) · ends at 36" (default); nose same as the centre — 68.94 → 68.99 L (+0.0479)
longboard|round|soft: tail Family · blends from 18" (default) · ends at 36" (default); nose same as the centre — 68.94 → 68.99 L (+0.0479)
longboard|pin|hard: tail Hard Edge, Family · blends from 18" (default) · ends at 36" (default); nose same as the centre — 69.90 → 69.94 L (+0.0422)
longboard|round|hard: tail Hard Edge, Family · blends from 18" (default) · ends at 36" (default); nose same as the centre — 69.90 → 69.94 L (+0.0422)
longboard|asis|hard: tail Hard Edge, Family · blends from 18" (default) · ends at 36" (default); nose same as the centre — 74.54 → 74.58 L (+0.0422)
longboard|diamond|soft: tail Family · blends from 18" (default) · ends at 36" (default); nose same as the centre — 73.26 → 73.30 L (+0.0408)
longboard|swallow|soft: tail Family · blends from 18" (default) · ends at 36" (default); nose same as the centre — 74.14 → 74.18 L (+0.0395)
longboard|diamond|hard: tail Hard Edge, Family · blends from 18" (default) · ends at 36" (default); nose same as the centre — 74.22 → 74.26 L (+0.0356)
longboard|swallow|hard: tail Hard Edge, Family · blends from 18" (default) · ends at 36" (default); nose same as the centre — 75.10 → 75.13 L (+0.0344)
tucked|longboard|nose-sbt: tail Family · blends from 18" (default) · ends at 36" (default); nose Sharp Bottom Tuck — 73.62 → 73.64 L (+0.0185)
tucked|longboard|tail-sbt: tail Family, Sharp Bottom Tuck · blends from 18" (default) · ends at 36" (default); nose same as the centre — 73.63 → 73.65 L (+0.0172)
tucked|longboard|he-centre-sbt: tail Hard Edge, Family · blends from 18" (default) · ends at 36" (default); nose Sharp Bottom Tuck — 74.70 → 74.71 L (+0.0128)
midlength|diamond|hard: tail Hard Edge, Family · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 50.98 → 50.99 L (+0.0090)
midlength|swallow|hard: tail Hard Edge, Family · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 51.65 → 51.66 L (+0.0084)
midlength|diamond|soft: tail Family · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 50.94 → 50.95 L (+0.0084)
midlength|swallow|soft: tail Family · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 51.62 → 51.62 L (+0.0078)
tucked|midlength|tail-single: tail Family, Single Tuck · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 49.34 → 49.34 L (+0.0076)
midlength|asis|hard: tail Hard Edge, Family · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 49.40 → 49.40 L (+0.0062)
midlength|pin|hard: tail Hard Edge, Family · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 49.40 → 49.40 L (+0.0062)
midlength|round|hard: tail Hard Edge, Family · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 49.40 → 49.40 L (+0.0062)
tucked|fish|tail-single: tail Single Tuck · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 34.60 → 34.59 L (-0.0061)
tucked|fish|he-centre-sbt: tail Hard Edge · blends from 18" (default) · ends at 29 1/2" (default); nose Family, Sharp Bottom Tuck — 34.66 → 34.65 L (-0.0060)
tucked|fish|nose-single: tail Hard Edge · blends from 18" (default) · ends at 29 1/2" (default); nose Family, Single Tuck — 34.62 → 34.62 L (-0.0058)
tucked|fish|centre-single-sbt: tail Hard Edge · blends from 18" (default) · ends at 29 1/2" (default); nose Family, Single Tuck, Sharp Bottom Tuck — 34.63 → 34.62 L (-0.0055)
midlength|asis|soft: tail Family · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 49.36 → 49.37 L (+0.0054)
midlength|pin|soft: tail Family · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 49.36 → 49.37 L (+0.0054)
midlength|round|soft: tail Family · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 49.36 → 49.37 L (+0.0054)
tucked|midlength|nose-single: tail Hard Edge, Family · blends from 18" (default) · ends at 32 1/2" (default); nose Single Tuck — 49.36 → 49.36 L (+0.0049)
tucked|fish|nose-sbt: tail Hard Edge · blends from 18" (default) · ends at 29 1/2" (default); nose Family, Sharp Bottom Tuck — 34.65 → 34.65 L (-0.0047)
tucked|midlength|tail-sbt: tail Family, Sharp Bottom Tuck · blends from 18" (default) · ends at 32 1/2" (default); nose same as the centre — 49.36 → 49.37 L (+0.0046)
tucked|fish|tail-sbt: tail Sharp Bottom Tuck · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 34.62 → 34.62 L (-0.0042)
fish|diamond|hard: tail Hard Edge · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 34.08 → 34.07 L (-0.0040)
fish|diamond|soft: tail same as the centre · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 34.05 → 34.04 L (-0.0040)
fish|asis|soft: tail same as the centre · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 34.62 → 34.62 L (-0.0037)
fish|swallow|soft: tail same as the centre · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 34.62 → 34.62 L (-0.0037)
fish|asis|hard: tail Hard Edge · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 34.65 → 34.65 L (-0.0037)
fish|swallow|hard: tail Hard Edge · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 34.65 → 34.65 L (-0.0037)
fish|pin|hard: tail Hard Edge · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 31.88 → 31.87 L (-0.0037)
fish|round|hard: tail Hard Edge · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 31.88 → 31.87 L (-0.0037)
fish|pin|soft: tail same as the centre · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 31.84 → 31.84 L (-0.0037)
fish|round|soft: tail same as the centre · blends from 18" (default) · ends at 29 1/2" (default); nose Family — 31.84 → 31.84 L (-0.0037)
tucked|midlength|nose-sbt: tail Hard Edge, Family · blends from 18" (default) · ends at 32 1/2" (default); nose Sharp Bottom Tuck — 49.40 → 49.40 L (+0.0036)
tucked|midlength|centre-single-sbt: tail Hard Edge, Family · blends from 18" (default) · ends at 32 1/2" (default); nose Single Tuck, Sharp Bottom Tuck — 49.36 → 49.36 L (+0.0031)
tucked|midlength|he-centre-sbt: tail Hard Edge, Family · blends from 18" (default) · ends at 32 1/2" (default); nose Sharp Bottom Tuck — 49.41 → 49.41 L (+0.0031)
shortboard|diamond|hard: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 30.18 → 30.18 L (+0.0019)
shortboard|diamond|soft: tail same as the centre · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 30.14 → 30.14 L (+0.0019)
shortboard|asis|hard: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 29.61 → 29.61 L (+0.0019)
shortboard|pin|soft: tail same as the centre · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 28.73 → 28.73 L (+0.0019)
shortboard|round|soft: tail same as the centre · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 28.73 → 28.73 L (+0.0019)
shortboard|pin|hard: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 28.77 → 28.77 L (+0.0019)
shortboard|round|hard: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 28.77 → 28.77 L (+0.0019)
shortboard|asis|soft: tail same as the centre · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 29.57 → 29.57 L (+0.0019)
shortboard|swallow|hard: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 30.63 → 30.63 L (+0.0016)
shortboard|swallow|soft: tail same as the centre · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 30.59 → 30.60 L (+0.0016)
tucked|shortboard|tail-single: tail Single Tuck · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 29.55 → 29.55 L (+0.0015)
tucked|shortboard|tail-sbt: tail Sharp Bottom Tuck · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 29.57 → 29.57 L (+0.0012)
tucked|shortboard|nose-single: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family, Single Tuck — 29.59 → 29.59 L (+0.0010)
tucked|shortboard|centre-single-sbt: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family, Single Tuck, Sharp Bottom Tuck — 29.58 → 29.59 L (+0.0009)
tucked|shortboard|he-centre-sbt: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family, Sharp Bottom Tuck — 29.62 → 29.62 L (+0.0007)
tucked|shortboard|nose-sbt: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family, Sharp Bottom Tuck — 29.61 → 29.61 L (+0.0000)
largest move: tucked|longboard|tail-single, +0.2119 L
```

The founder's production command (in the script's header, in the form his terminal accepts; never run here):

```
npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --rail-character-report; rm -f .env.production.pull
```

## Proofs

- **Pins:** the 40-board pin under `HARD_EDGE_SWITCH` passes untouched (its JSON, test and generator are unchanged
  since the base); the new 74-board pin reproduces all 74 under `HARD_EDGE_FADE` by name and the 10 untouched boards
  under the live rule, bit for bit. Its generator now refuses to run (exit 1) and the JSON stays unchanged.
- **No step:** for every one of the 74 boards and each tip of it that differs in more than the Hard Edge, the drawn
  rail's jump across the old halfway point is over 0.3 mm under go-live 1's rule and under 0.05 mm under the live rule.
- **The ends:** at the tail 12", the centre and the nose 12" stations every board's sections are that rail's own
  (tip weight 1, 0, 1) — RAILS' plots and DATA unchanged; `computeRailBands` not edited.
- **One surface:** all 74 boards and each `tucked` board with its blend run from 12" and from 30" to the centre are
  watertight and inside (−0.15%, 0] of VOLUME's litres; every ring's sharpness is its section's.
- **Unit suite:** `npm test` 7737 passed, 1 load timeout (see Deferred Issues); `npx tsc --noEmit` and `npm run lint`
  clean (one warning, pre-existing, in `lib/db/import-designs-action.test.ts`).
- **Browser specs (port 3215, webpack):** `rails-advanced` 74 passed / 7 skipped; `three-d-hard-edge` 4 passed / 2
  skipped (the iphone project skips by design); `board-lock-screens` + `phone-rails` 77 passed, 5 failed under load,
  all 5 passed alone (12 passed on the re-run across the three projects); `three-d-screen` 28 passed / 5 skipped;
  `desktop-baseline` 6 passed after re-recording `three-d-desktop` only.
- **The 3D picture:** 3483 pixels changed, every one inside the TAIL RAIL heading and its two labels (x 40–238,
  y 214–305); SHA-256 fb4d7c90 → 087b427a; the other five byte-identical (VOLUME still 30.29 L).
- **Pictures:** `pictures/16-15-rails-rows.png` and `pictures/16-15-3d-before-after.png`, looked at: the bottom view
  shows no step between the tail, the blend zone, the centre and the nose in any "after" picture.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in the plan's expectation] The nose blend of a sharp-tucked centre can hold a hair less foam than the plain nose**
- **Found during:** Task 1 (rewriting the Sharp Bottom Tuck test at volume.test.ts)
- **Issue:** The plan asked that every station between Blends From and the nose 12" mark "keeps more foam" when the
  centre's Sharp Bottom Tuck is ticked. Inside the nose's blend (centre sharp, nose round) the litres count the drawn
  point-blended ring (D-31), and a point blend of two rails this alike holds up to about 1.8 mm² (0.01% of the
  station) less foam than the plain nose at the same spot. The litres still rise overall.
- **Fix:** the test asks that rule of the stations behind the centre; ahead of it, each station must sit within a
  thousandth of its two ends' areas blended, and the centre's end must hold more foam than the nose's.
- **Files modified:** lib/geometry/volume.test.ts · **Commit:** 84f47912

**2. [Rule 1] The one-way Blends From / Ends At sweep is asked of the right boards**
- **Found during:** Task 1
- **Issue:** the old test asked every hard-edged board's litres to move one way as either setting moves. On a board
  whose tail also differs in Family (the Mid-length swallow), a narrow 2" blend sliding across Simpson's alternating
  weights moved the litres a hair the other way (0.00024 L).
- **Fix:** the sweep runs on the boards whose tail differs only in the Hard Edge (live rule) and on the forty under
  go-live 1's rule by name.
- **Files modified:** lib/geometry/volume.test.ts · **Commit:** 84f47912

**3. [Rule 3 - Blocking] One spoken name in `e2e/three-d-screen.spec.ts`**
- That spec (in the plan's verify list but not its files) finds the slider by its spoken name; one line now reads
  `"Tail Rail ends at"`. **Commit:** 66714e89

**4. [Rule 1] The browser cases tick Use Single Tuck with Sharp Bottom Tuck**
- A Sharp Bottom Tuck alone keeps under a thousandth of a litre on the stock board and the Shortboard (moving Ends At
  from 30" to the centre moves it by 0.00003–0.00005 L), too little for VOLUME's two decimals, so RAILS' case 2 and
  the 3D case tick both tail tucks before moving Ends At (stock: 30.25 → 30.24 L; Shortboard: 29.56 → 29.55 L). RAILS'
  case 2 sets Ends At to 20" before Hard Edge goes off, so "the values set before" are 18" and 20". The 3D case seeds
  the board through the browser's kept copy rather than ticking on RAILS (the same board either way).
- **Files modified:** e2e/rails-advanced.spec.ts, e2e/three-d-hard-edge.spec.ts · **Commit:** 66714e89

**5. RAILS pictures shot 1280 wide in a tall window.** At 800 tall the dev-only "Copy preset values" row covered the
bottom of the tail group in an element shot; the window was made 1700 tall (the layout reads width alone), caption
says so.

### Other notes

- The interfaces block asked for a doc line on `blank-reasons.ts`' formatters and the store's setters; both files are
  outside `files_modified` and were left alone (their names stay, as the plan says).
- Task 2 is `tdd="true"`, but the orchestrator's ruling is one commit per task, so the report's tests and code landed
  in one commit (no separate RED commit).
- One scratch command ran with its working directory in the session scratchpad (never the main checkout).

## Deferred Issues

- **`lib/models/rack-stand-in.test.ts` › "every count from 1 to 100…" now runs about 16 s alone (11 s before this
  plan) against its 30 s limit**, because the presets now blend in more stations (a station that blends builds two
  rail sections). Under the full parallel suite on this loaded machine it timed out twice (52 s, 65 s); alone it
  passes every time. One litres figure costs about 1.4× what it did on a preset (Shortboard 3.8 → 5.4 ms). Worth
  watching at the branch gate; if it fails there, raising that one test's limit to 60 s is the fix.

## Known limitations (left alone on purpose)

- The domed deck's 1/16" rounding of the rail-side thickness (the founder: "Yes, file a to-do") — the orchestrator's
  to-do; untouched here.
- Still open for the look: Deck Profile, Ratio, the scale and every nudge keep their long straight blend from each
  12" mark to the centre.

## Threat Flags

None beyond the plan's register: the report adds no write path and prints ids, settings and litres only (tested with
a board named "Chris's Secret Fish").

## Self-Check: PASSED

- Files: the five created source files, the pin JSON, both pictures and the archive exist.
- Commits: 90dbc57d (the pin alone; `git show --stat 90dbc57d -- lib/geometry/volume.ts` is empty), 84f47912, 66714e89.
- No change to STATE.md, ROADMAP.md, lib/export/, drizzle/, lib/db/schema.ts, lib/models/design-snapshot.ts,
  components/design/design-store.tsx, lib/geometry/finished-rail.ts or lib/models/hard-edge-report.ts; of the six
  desktop pictures only three-d-desktop changed.

## Founder's look

Pending — presented by the orchestrator at the Wave 10 checkpoint.
