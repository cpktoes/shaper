---
phase: 14-realistic-surfboard-flow
plan: 17
subsystem: rocker blank list + fit flag, saved-boards check, before-and-after figures
status: complete
tags: [thinning-starts, blank-list, blank-flag, tips-report, before-after, phase-14]
requires: ["14-12", "14-13"]
provides:
  - "use-blank-list.ts and blank-flag.tsx build the board's fit inputs with ...thinningStartsOf({ noseThinningStart, tailThinningStart }), both starts in each ctx memo's dependency list"
  - "BlankFlag passes noseThinningStart / tailThinningStart props to PickedBlankFlag"
  - "scripts/check-saved-boards.ts --tips-report (RULES_BEFORE_TIPS → RULES_LIVE, movesReportLines + tipsReportLines); both board-input sites spread thinningStartsOf(carried)"
  - "scripts/phase14-before-after.ts --step tips (and --samples writes tips-*.csv)"
  - "thinning-start-paths.test.ts SITES covers use-blank-list.ts, blank-flag.tsx, check-saved-boards.ts; ctx-memo dependency assertions for the list and the flag"
affects: [14-18 go-live 2 (the founder's --tips-report command and the tips pictures' figures)]
tech-stack:
  added: []
  patterns: ["source-contract memo check copied from design-store.test.ts, taught to skip a useMemo<Type> argument"]
key-files:
  created: []
  modified:
    - components/rocker/use-blank-list.ts
    - components/rocker/blank-flag.tsx
    - lib/geometry/thinning-start-paths.test.ts
    - scripts/check-saved-boards.ts
    - scripts/phase14-before-after.ts
decisions:
  - "The flag takes the two starts as props from BlankFlag, next to the two fine-tunes it already takes that way, rather than reading useDesign() a second time"
  - "--tips-report prints movesReportLines for hand-set boards too (the tip rule never touches them, so the line is the proof they stay put), and the Phase 11 sentence; it never changes the exit code"
  - "--step tips's thin-spot count uses the research's 0.005\" tolerance and the rise count tip-flow.test.ts's 1/64\"; both tolerances are printed in the line itself"
metrics:
  duration: "about 25 min"
  completed: 2026-10-02
  tasks: 3
  files: 5
actuals:
  tokens: 21000
  tasks: 3
  commits: 4
---

# Phase 14 Plan 17: The blank list and the flag read the board's own Thinning Starts, and the tips go-live's report and figures Summary

The list of blanks on ROCKER and the "doesn't fit" flag under the picked blank now judge every blank using the board's own Thinning Starts. A start set by hand is used as set. A tip on Automatic gets the start Automatic picks for that blank at that placement. Moving a start re-judges the list and the flag straight away. The read-only saved-boards check gained `--tips-report`, the founder's one command at go-live 2. The before-and-after script gained `--step tips`, which produces the tips pictures' figures from the app's own numbers.

## What changed for a shaper

- **The list and the flag agree with the drawing.** Once the Thinning Starts sliders arrive (plan 14-14), a start set by hand changes which blanks fit and what the flag says, exactly as it changes the drawing. Until then, every board is on Automatic. Automatic was already decided inside the fit check, so nothing on screen changes today.
- **The empty list, the loading state and the "didn't load" state are unchanged.** No new copy was added. The new runs-out reason from 14-13 wraps in a list row or the flag like every other reason. The flag reads the board's own copy of the blank, so it still works when the catalogue is unavailable.
- **The flag's notes now record the one cautious corner.** The quick "a Deck tweak over the skin fits nowhere" refusal is exact on Automatic and under Pin deck. It is cautious in one case: Tip Style Bottom with that tip's start set by hand past 12". This is recorded beside the existing note. The flag's behaviour and wording are unchanged.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 (tracer) | The blank list and the flag judge each blank with the board's own starts | 4fa8a84 |
| 2 | The read-only tips report on the real saved boards | 0b5d867 |
| 3 | The tips go-live's before-and-after figures | effd9f6 |

Tracer gate: the run was autonomous (ruling 10). The tracer's verify (`tsc`, `lint`, and the `use-blank-list|blank-flag` path tests) passed before Task 2 began.

## The founder's production command for go-live 2 (plan 14-18)

```
bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-saved-boards.ts --tips-report'
```

It is the curves command with `--tips-report` in place of `--curves-report`, and it is written in the script's header. It reads with one `select` and writes nothing. It prints counts and maxima only. The executor never ran it.

## `--step tips` output (run twice, byte-identical; `--step curves` prints exactly what it printed before this plan)

```
Phase 14 — the 12" blend at each tip → the steady taper from each tip's Thinning Start (station numbers and litres)

== Shortboard preset — US Blanks 6'3"RP, 0" off centre ==
  board length 74"
  tail tip  thickness 15/16" (24 mm) → 15/16" (24 mm); rocker 1 9/16" (40 mm) → 1 9/16" (40 mm)
  tail 12"  thickness 1 9/16" (39 mm) → 1 9/16" (39 mm); rocker 13/16" (20 mm) → 13/16" (20 mm)
  centre    thickness 2 1/4" (57 mm) → 2 1/4" (57 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 9/16" (40 mm) → 1 9/16" (40 mm); rocker 1 1/4" (31 mm) → 1 1/4" (31 mm)
  nose tip  thickness 7/16" (11 mm) → 7/16" (11 mm); rocker 4 1/4" (107 mm) → 4 1/4" (107 mm)
  largest move of any of the ten station numbers: 0.000" (0.0 mm)
  litres 29.478 → 29.562 (+0.29%)
  card: 6'2" · 18 3/4" · 2 1/4" · 29.5 L → 6'2" · 18 3/4" · 2 1/4" · 29.6 L
  in its blank where it sits: fits → fits
  thinning starts (after): tail 12" from the tip (Automatic); nose 12" from the tip (Automatic)

== Fish preset — US Blanks 5'10"RP, 0" off centre ==
  board length 68"
  tail tip  thickness 3/4" (19 mm) → 3/4" (19 mm); rocker 2" (50 mm) → 2" (50 mm)
  tail 12"  thickness 1 7/8" (47 mm) → 1 7/8" (47 mm); rocker 3/4" (19 mm) → 3/4" (19 mm)
  centre    thickness 2 1/2" (64 mm) → 2 1/2" (64 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 7/8" (47 mm) → 1 7/8" (47 mm); rocker 1 1/8" (29 mm) → 1 1/8" (29 mm)
  nose tip  thickness 11/16" (17 mm) → 11/16" (17 mm); rocker 4 1/4" (107 mm) → 4 1/4" (107 mm)
  largest move of any of the ten station numbers: 0.000" (0.0 mm)
  litres 35.093 → 35.313 (+0.63%)
  card: 5'8" · 20 1/4" · 2 1/2" · 35.1 L → 5'8" · 20 1/4" · 2 1/2" · 35.3 L
  in its blank where it sits: fits → fits
  thinning starts (after): tail 12" from the tip (Automatic); nose 12" from the tip (Automatic)

== Mid-length preset — US Blanks 7'4"SP, 0" off centre ==
  board length 86"
  tail tip  thickness 3/4" (19 mm) → 3/4" (19 mm); rocker 2 5/16" (58 mm) → 2 5/16" (58 mm)
  tail 12"  thickness 1 7/8" (47 mm) → 1 7/8" (47 mm); rocker 1" (25 mm) → 1" (25 mm)
  centre    thickness 2 3/4" (70 mm) → 2 3/4" (70 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 3/4" (45 mm) → 1 3/4" (45 mm); rocker 1 3/8" (34 mm) → 1 3/8" (34 mm)
  nose tip  thickness 5/8" (16 mm) → 5/8" (16 mm); rocker 3 7/8" (99 mm) → 3 7/8" (99 mm)
  largest move of any of the ten station numbers: 0.000" (0.0 mm)
  litres 50.286 → 50.401 (+0.23%)
  card: 7'2" · 21 1/4" · 2 3/4" · 50.3 L → 7'2" · 21 1/4" · 2 3/4" · 50.4 L
  in its blank where it sits: fits → fits
  thinning starts (after): tail 12" from the tip (Automatic); nose 12" from the tip (Automatic)

== Longboard preset — US Blanks 9'3"Y, 0" off centre ==
  board length 108"
  tail tip  thickness 7/8" (22 mm) → 7/8" (22 mm); rocker 3 3/8" (85 mm) → 3 3/8" (85 mm)
  tail 12"  thickness 1 15/16" (50 mm) → 1 15/16" (50 mm); rocker 1 11/16" (42 mm) → 1 11/16" (42 mm)
  centre    thickness 3" (76 mm) → 3" (76 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 15/16" (50 mm) → 1 15/16" (50 mm); rocker 2 1/8" (54 mm) → 2 1/8" (54 mm)
  nose tip  thickness 7/8" (22 mm) → 7/8" (22 mm); rocker 4 3/16" (106 mm) → 4 3/16" (106 mm)
  largest move of any of the ten station numbers: 0.000" (0.0 mm)
  litres 75.309 → 75.311 (+0.00%)
  card: 9'0" · 22 1/2" · 3" · 75.3 L → 9'0" · 22 1/2" · 3" · 75.3 L
  in its blank where it sits: fits → fits
  thinning starts (after): tail 12" from the tip (Automatic); nose 12" from the tip (Automatic)

== The first board a visitor sees — no blank ==
  board length 72"
  tail tip  thickness 5/8" (16 mm) → 5/8" (16 mm); rocker 2" (51 mm) → 2" (51 mm)
  tail 12"  thickness 1 9/16" (40 mm) → 1 9/16" (40 mm); rocker 3/8" (10 mm) → 3/8" (10 mm)
  centre    thickness 2 1/2" (64 mm) → 2 1/2" (64 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 5/16" (33 mm) → 1 5/16" (33 mm); rocker 1 1/4" (32 mm) → 1 1/4" (32 mm)
  nose tip  thickness 1/2" (13 mm) → 1/2" (13 mm); rocker 4 1/2" (114 mm) → 4 1/2" (114 mm)
  largest move of any of the ten station numbers: 0.000" (0.0 mm)
  litres 30.509 → 30.509 (+0.00%)
  card: 6'0" · 19" · 2 1/2" · 30.5 L → 6'0" · 19" · 2 1/2" · 30.5 L

== An Arctic board — 2" shorter than Arctic Foam 9'4" G, 2 1/2" centre, centred ==
  board length 110 1/4"
  tail tip  thickness 5/8" (16 mm) → 5/8" (16 mm); rocker 2 5/16" (59 mm) → 2 5/16" (59 mm)
  tail 12"  thickness 15/16" (24 mm) → 15/16" (25 mm); rocker 1 11/16" (42 mm) → 1 5/8" (42 mm)
  centre    thickness 2 1/2" (64 mm) → 2 1/2" (64 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 5/16" (33 mm) → 1 5/16" (33 mm); rocker 3 1/16" (78 mm) → 3 1/16" (78 mm)
  nose tip  thickness 1/2" (13 mm) → 1/2" (13 mm); rocker 6 1/8" (155 mm) → 6 1/8" (155 mm)
  largest move of any of the ten station numbers: 0.020" (0.5 mm)
  litres 47.558 → 47.443 (-0.24%)
  card: 9'2 1/4" · 19" · 2 1/2" · 47.6 L → 9'2 1/4" · 19" · 2 1/2" · 47.4 L
  in its blank where it sits: does not fit → does not fit
  thinning starts (after): tail 14 1/2" from the tip (Automatic); nose 12" from the tip (Automatic)

== The fixture board — a 10'0" board on Arctic Foam 10'9" LB, slid to the tail end, 2 1/2" centre ==
  board length 120"
  tail tip  thickness 5/8" (16 mm) → 5/8" (16 mm); rocker 2 15/16" (74 mm) → 2 15/16" (74 mm)
  tail 12"  thickness 9/16" (14 mm) → 3/4" (20 mm); rocker 2 3/16" (56 mm) → 1 15/16" (50 mm)
  centre    thickness 2 1/2" (64 mm) → 2 1/2" (64 mm); rocker 0" (0 mm) → 0" (0 mm)
  nose 12"  thickness 1 3/16" (31 mm) → 1 3/16" (31 mm); rocker 1 7/16" (36 mm) → 1 7/16" (36 mm)
  nose tip  thickness 1/2" (13 mm) → 1/2" (13 mm); rocker 2 5/8" (66 mm) → 2 5/8" (66 mm)
  largest move of any of the ten station numbers: 0.239" (6.1 mm)
  litres 48.941 → 49.377 (+0.89%)
  card: 10'0" · 19" · 2 1/2" · 48.9 L → 10'0" · 19" · 2 1/2" · 49.4 L
  in its blank where it sits: fits → fits
  thinning starts (after): tail 26" from the tip (Automatic); nose 12" from the tip (Automatic)
  tail thickness every 1/2" over the last 30", from the tail tip — the 12" blend → the steady taper:
         0"      5/8" → 5/8"     (0.625" (15.9 mm) → 0.625" (15.9 mm))
       1/2"      5/8" → 5/8"     (0.646" (16.4 mm) → 0.625" (15.9 mm))
         1"    11/16" → 5/8"     (0.661" (16.8 mm) → 0.626" (15.9 mm))
     1 1/2"    11/16" → 5/8"     (0.669" (17.0 mm) → 0.628" (15.9 mm))
         2"    11/16" → 5/8"     (0.672" (17.1 mm) → 0.629" (16.0 mm))
     2 1/2"    11/16" → 5/8"     (0.670" (17.0 mm) → 0.632" (16.1 mm))
         3"    11/16" → 5/8"     (0.664" (16.9 mm) → 0.635" (16.1 mm))
     3 1/2"      5/8" → 5/8"     (0.654" (16.6 mm) → 0.638" (16.2 mm))
         4"      5/8" → 5/8"     (0.641" (16.3 mm) → 0.643" (16.3 mm))
     4 1/2"      5/8" → 5/8"     (0.626" (15.9 mm) → 0.647" (16.4 mm))
         5"      5/8" → 5/8"     (0.609" (15.5 mm) → 0.652" (16.6 mm))
     5 1/2"     9/16" → 11/16"   (0.591" (15.0 mm) → 0.658" (16.7 mm))
         6"     9/16" → 11/16"   (0.572" (14.5 mm) → 0.664" (16.9 mm))
     6 1/2"     9/16" → 11/16"   (0.554" (14.1 mm) → 0.671" (17.0 mm))
         7"     9/16" → 11/16"   (0.536" (13.6 mm) → 0.678" (17.2 mm))
     7 1/2"      1/2" → 11/16"   (0.520" (13.2 mm) → 0.686" (17.4 mm))
         8"      1/2" → 11/16"   (0.506" (12.9 mm) → 0.695" (17.6 mm))
     8 1/2"      1/2" → 11/16"   (0.495" (12.6 mm) → 0.703" (17.9 mm))
         9"      1/2" → 11/16"   (0.487" (12.4 mm) → 0.713" (18.1 mm))
     9 1/2"      1/2" → 3/4"     (0.482" (12.3 mm) → 0.723" (18.4 mm))
        10"      1/2" → 3/4"     (0.483" (12.3 mm) → 0.733" (18.6 mm))
    10 1/2"      1/2" → 3/4"     (0.488" (12.4 mm) → 0.745" (18.9 mm))
        11"      1/2" → 3/4"     (0.500" (12.7 mm) → 0.756" (19.2 mm))
    11 1/2"      1/2" → 3/4"     (0.517" (13.1 mm) → 0.768" (19.5 mm))
        12"     9/16" → 3/4"     (0.542" (13.8 mm) → 0.781" (19.8 mm))
    12 1/2"     9/16" → 13/16"   (0.571" (14.5 mm) → 0.794" (20.2 mm))
        13"      5/8" → 13/16"   (0.599" (15.2 mm) → 0.808" (20.5 mm))
    13 1/2"      5/8" → 13/16"   (0.628" (16.0 mm) → 0.822" (20.9 mm))
        14"    11/16" → 13/16"   (0.657" (16.7 mm) → 0.837" (21.3 mm))
    14 1/2"    11/16" → 7/8"     (0.686" (17.4 mm) → 0.853" (21.7 mm))
        15"    11/16" → 7/8"     (0.715" (18.2 mm) → 0.869" (22.1 mm))
    15 1/2"      3/4" → 7/8"     (0.744" (18.9 mm) → 0.885" (22.5 mm))
        16"      3/4" → 7/8"     (0.774" (19.7 mm) → 0.902" (22.9 mm))
    16 1/2"    13/16" → 15/16"   (0.803" (20.4 mm) → 0.920" (23.4 mm))
        17"    13/16" → 15/16"   (0.833" (21.1 mm) → 0.938" (23.8 mm))
    17 1/2"      7/8" → 15/16"   (0.862" (21.9 mm) → 0.956" (24.3 mm))
        18"      7/8" → 1"       (0.891" (22.6 mm) → 0.976" (24.8 mm))
    18 1/2"    15/16" → 1"       (0.921" (23.4 mm) → 0.995" (25.3 mm))
        19"    15/16" → 1"       (0.950" (24.1 mm) → 1.016" (25.8 mm))
    19 1/2"        1" → 1 1/16"  (0.980" (24.9 mm) → 1.036" (26.3 mm))
        20"        1" → 1 1/16"  (1.009" (25.6 mm) → 1.058" (26.9 mm))
    20 1/2"   1 1/16" → 1 1/16"  (1.039" (26.4 mm) → 1.080" (27.4 mm))
        21"   1 1/16" → 1 1/8"   (1.068" (27.1 mm) → 1.102" (28.0 mm))
    21 1/2"    1 1/8" → 1 1/8"   (1.097" (27.9 mm) → 1.125" (28.6 mm))
        22"    1 1/8" → 1 1/8"   (1.126" (28.6 mm) → 1.148" (29.2 mm))
    22 1/2"    1 1/8" → 1 3/16"  (1.155" (29.3 mm) → 1.172" (29.8 mm))
        23"   1 3/16" → 1 3/16"  (1.184" (30.1 mm) → 1.197" (30.4 mm))
    23 1/2"   1 3/16" → 1 1/4"   (1.213" (30.8 mm) → 1.222" (31.0 mm))
        24"    1 1/4" → 1 1/4"   (1.242" (31.6 mm) → 1.248" (31.7 mm))
    24 1/2"    1 1/4" → 1 1/4"   (1.271" (32.3 mm) → 1.274" (32.4 mm))
        25"   1 5/16" → 1 5/16"  (1.299" (33.0 mm) → 1.301" (33.0 mm))
    25 1/2"   1 5/16" → 1 5/16"  (1.328" (33.7 mm) → 1.328" (33.7 mm))
        26"    1 3/8" → 1 3/8"   (1.356" (34.4 mm) → 1.356" (34.4 mm))
    26 1/2"    1 3/8" → 1 3/8"   (1.384" (35.1 mm) → 1.384" (35.1 mm))
        27"   1 7/16" → 1 7/16"  (1.412" (35.9 mm) → 1.412" (35.9 mm))
    27 1/2"   1 7/16" → 1 7/16"  (1.439" (36.6 mm) → 1.439" (36.6 mm))
        28"   1 7/16" → 1 7/16"  (1.467" (37.2 mm) → 1.467" (37.2 mm))
    28 1/2"    1 1/2" → 1 1/2"   (1.494" (37.9 mm) → 1.494" (37.9 mm))
        29"    1 1/2" → 1 1/2"   (1.521" (38.6 mm) → 1.521" (38.6 mm))
    29 1/2"   1 9/16" → 1 9/16"  (1.547" (39.3 mm) → 1.547" (39.3 mm))
        30"   1 9/16" → 1 9/16"  (1.574" (40.0 mm) → 1.574" (40.0 mm))
  with its tail start set by hand at 12": 12" from the tip (set by hand)
    too-close line (imperial): The board is thinnest 12" from the tail tip: 9/16", under the 5/8" set for the tip. Automatic would start the thinning 26" from the tip and clear that.
    too-close line (metric): The board is thinnest 30.5 cm from the tail tip: 14 mm, under the 16 mm set for the tip. Automatic would start the thinning 66.0 cm from the tip and clear that.

== The thin-centre board — the default 72" board at a 1" centre, every blank in the catalogue ==
  the 12" blend: 120 fit, 23 refused (22 of them because the board runs out of foam)
  the steady taper: 142 fit, 1 refused (0 of them because the board runs out of foam)

== The stress set (D-27) — every pickable blank, a board 2" shorter, four centres, slid to either end and centred ==
-- the set as defined: 1635 boards, 3270 tips --
  where the tips start (after): at 12" 2912; 12-18" 218; 18-24" 97; 24-36" 43; further than 36" 0; furthest 32 1/2"; boards whose two tips start differently 249
  tips starting further in than 12": 358; their 12" thickness rises by a median 0.058" (1.5 mm), at most 0.517" (13.1 mm); rising 358 of 358
  boards thinner anywhere than their own tip setting (by more than 0.005"): 82 → 0
  boards that get thicker toward a tip (by more than 1/64"): 181 on 37 blanks → 12, all on: US Blanks 9'9"B
  boards newly poking out of their blank: 0
  where they sit: fit 1418 → 1428; newly refused 0; newly fitting 10
-- the boards the app can build (no longer than 120"): 1344 boards, 2688 tips --
  where the tips start (after): at 12" 2509; 12-18" 116; 18-24" 55; 24-36" 8; further than 36" 0; furthest 30"; boards whose two tips start differently 135
  tips starting further in than 12": 179; their 12" thickness rises by a median 0.046" (1.2 mm), at most 0.517" (13.1 mm); rising 179 of 179
  boards thinner anywhere than their own tip setting (by more than 0.005"): 38 → 0
  boards that get thicker toward a tip (by more than 1/64"): 88 on 18 blanks → 12, all on: US Blanks 9'9"B
  boards newly poking out of their blank: 0
  where they sit: fit 1163 → 1169; newly refused 0; newly fitting 6
```

**How this compares with the research's figures.** Every count the research reported for the stress set appears here unchanged:

- tip starts 2,912 / 218 / 97 / 43, with the furthest at 32 1/2"
- 249 boards whose two tips start at different points
- 358 tips whose 12" thickness rises, median 0.058", maximum 0.517"
- thin spots 82 → 0
- 12 boards that rise toward a tip, all on the 9'9"B
- boards that fit: 1,418 → 1,428
- the buildable subset: 2,509 / 116 / 55 / 8, with the furthest at 30"

Two figures differ:

- **Boards that rise toward a tip, before:** 181 here against the research's 200. The rise tolerances differ: this script uses tip-flow.test.ts's 1/64".
- **The thin-centre board's blend side:** 23 refused here against the research's 22. The research's 22 counted runs-outs only, and 22 of these 23 are runs-outs. The remaining refusal is a different reason, and it is the one blank still refused after the change.

## Deviations from Plan

None that changed the work. Two notes on how it was carried out:

- **Task 1's test commit has a known red step.** Task 1's commit adds the `scripts/check-saved-boards.ts` source-contract assertions, as the plan says. They fail at that commit and pass from Task 2's commit onward.
- **The memo check needed one adjustment.** The plan asked for `design-store.test.ts`'s `memo(name)` helper to be copied. The copy needed a small change to match `useMemo<BoardFitContext>(…)`, because both ctx memos carry a type argument. It is copied, not imported across.

No file outside `files_modified` was touched. `lib/geometry/phase11-foil.test.ts`, `lib/models/design-snapshot.test.ts`, `package.json` and `package-lock.json` are unchanged. `scripts/check-saved-boards.ts` was never run. No environment file was read, and no database was touched. No Playwright run, and no baseline moved.

## Verification

- `npx vitest run lib/geometry/thinning-start-paths.test.ts`: 12 passed. The whole unit suite: 103 files, 3,860 passed, 2 skipped (the skips were there before this plan). `npx tsc --noEmit` and `npm run lint` both exit 0.
- Acceptance greps:
  - `thinningStartsOf(`: once in `use-blank-list.ts`, once in `blank-flag.tsx`, twice in `check-saved-boards.ts`
  - `--tips-report` in `check-saved-boards.ts`: 4
  - `db.select`: 1
  - `.insert(` / `.update(` / `.delete(`: 0
- `--step tips` exits 0, and two runs print identical text. `--step curves` exits 0, and its output is byte-identical to the script before this plan. `--step tips --samples <dir>` writes `tips-*.csv` for the seven boards, including `tips-fixture-arctic-10-9-lb.csv`.

## Known Stubs

None.

## Threat Flags

None. T-14-31 and T-14-32 are mitigated. `--tips-report` prints only `movesReportLines`, `tipsReportLines` and fixed sentences. The script still makes one `select`, and a grep confirms it has no write calls. T-14-33 is mitigated by the ctx-memo dependency assertions.

## Self-Check: PASSED

- FOUND: components/rocker/use-blank-list.ts, components/rocker/blank-flag.tsx, lib/geometry/thinning-start-paths.test.ts, scripts/check-saved-boards.ts, scripts/phase14-before-after.ts
- FOUND commits: 4fa8a84, 0b5d867, effd9f6
