---
phase: 16-3d-board-and-cnc-export
plan: 02
subsystem: rails (controls), hard-edge maths, saved boards, saved-boards check
status: complete
tags: [rails, hard-edge, D-05, D-17, D-18, D-20, D-27, D-30, snapshot, report]
requires:
  - "16-01: boardSections, HARD_EDGE_FADE / HARD_EDGE_SWITCH, RailBandSpec.tailHardEdgeEndsAt, designCrossSectionInput, summarizeDesignWith"
provides:
  - "RailBandSpec.tailHardEdgeBlendsFrom (D-30) beside tailHardEdgeEndsAt"
  - "hardEdgeBlendsFrom(rails, length), hardEdgeEndsAt(rails, length), defaultHardEdgeEndsAt(length), hardEdgeBlendsFromWindow, hardEdgeEndsAtWindow"
  - "HARD_EDGE_BLENDS_FROM_RANGE_IN, DEFAULT_HARD_EDGE_BLENDS_FROM_IN, HARD_EDGE_MIN_BLEND_IN, DEFAULT_HARD_EDGE_ENDS_AT_RULE_IN, HARD_EDGE_ENDS_AT_RANGE_IN (step only)"
  - "HardEdgeRule.weight(station, anchors, rails, length); tailHardEdgeWeight(station, blendsFrom, endsAt)"
  - "formatHardEdgeBlendsFrom, formatHardEdgeEndsAt, hardEdgeBlendsFromSlider, hardEdgeEndsAtSlider (coupled ranges)"
  - "The Hard Edge Blends From and Hard Edge Ends At rows in the tail's Advanced menu on RAILS"
  - "setTailHardEdgeBlendsFrom, setTailHardEdgeEndsAt (store); resetRailAdvanced('tail') deletes both in one undo step"
  - "The store's litres built through designCrossSectionInput (D-05)"
  - "Snapshot rule 13: both settings optional and forgiving, version still 5"
  - "lib/models/hard-edge-report.ts (hardEdgeLitresMove, hardEdgeReportLines) and scripts/check-saved-boards.ts --hard-edge-report"
affects: [16-03, 16-04, 16-05, 16-06, 16-07]
tech-stack:
  added: []
  patterns:
    - "A refused snapshot value leaves no key behind (a .transform strips the undefined), so a bad value reads exactly like an absent one"
    - "Two coupled settings resolved in order (start, then end inside a window the start sets), so no stored pair can cross"
    - "A locked board is seeded in a browser test as a kept saved board (modelId + ownerId + locked)"
key-files:
  created:
    - lib/models/hard-edge-report.ts
    - lib/models/hard-edge-report.test.ts
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-02-rails-hard-edge-ends-at.png
    - .planning/phases/16-3d-board-and-cnc-export/pictures/16-02-pictures-source.tar.gz
  modified:
    - lib/geometry/rail-bands.ts
    - lib/geometry/rail-bands.test.ts
    - lib/geometry/volume.ts
    - lib/geometry/volume.test.ts
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - lib/geometry/__fixtures__/phase14-preset-figures.json
    - components/rails/rail-controls.tsx
    - components/rails/rail-band-editor.tsx
    - components/design/design-store.tsx
    - components/design/design-store.test.ts
    - lib/models/design-snapshot.ts
    - lib/models/design-snapshot.test.ts
    - e2e/rails-advanced.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
    - scripts/check-saved-boards.ts
    - .planning/phases/16-3d-board-and-cnc-export/16-01-SUMMARY.md
decisions:
  - "D-30: the tail's hard edge is full to Hard Edge Blends From (12-30 in, default 18) and fully blended into the centre's tucked rail by Hard Edge Ends At (2 in past Blends From up to the board's centre)"
  - "The default Ends At grows with the board: L/3 - 18 inches short of the centre (L/6 + 18 from the tail), to the nearest half inch; the two defaults are independent"
  - "The two settings are read start-first, so a stored pair that crosses always resolves to a valid pair, and the RAILS sliders' ranges follow each other"
  - "Reset Advanced Settings on the tail deletes both stored settings in the same undo step as the rest"
  - "The saved-board reader drops only values that could sit on no board; the readers forgive a value that fits some board but not this one; version stays 5"
  - "The hard-edge report prints ids, both settings (marked default where unset) and litres only, largest move first, and never changes the check's exit code"
metrics:
  duration: "about 76 minutes (34 for the first look, 42 for D-30)"
  completed: 2026-11-04
actuals:
  tokens: 52000
  tasks: 2
  commits: 7
---

# Phase 16 Plan 02: Hard Edge Blends From and Ends At on RAILS, saved with the board, and the founder's litres report Summary

The tail's hard edge now has two settings on RAILS, as D-30 asked. **Hard Edge Blends From** is where the edge
starts blending; it's full up to there (default 18"). **Hard Edge Ends At** is where the rail has fully blended into
the centre's tucked rail. Its default grows with the board's length: 30" on a 6'0". Both are saved with the board,
Reset puts both back in one undo step, VOLUME's litres follow either one, and a read-only report lists each saved
board's litres before and after.

## What changes for the founder

- **Two sliders on RAILS.** Tick Hard Edge on the tail and open its Advanced menu. Directly above
  `↺ Reset Advanced Settings` are two new sliders, in the same style as the ones above them:
  - `Hard Edge Blends From — 18"`: the hard edge is full up to here, then starts blending into the tucked rail.
    12" to 30". It never goes below the 12" mark, so the tail plot on RAILS is always a full hard edge.
  - `Hard Edge Ends At — 30"`: in your words, "where the rail has fully blended into the centre's tuck(s)". From
    here on the rail is the centre's tucked rail, with the centre's Single Tuck and Sharp Bottom Tuck (D-27,
    unchanged). It can go "all the way to the centre of the board".

  Both move in half-inch steps. In Metric they read `45.7 cm` and `76.2 cm` and move in whole centimetres.
- **They follow each other.** Ends At can't come closer than 2" to Blends From, and Blends From can't go past 2"
  short of Ends At. On a longer board Ends At runs further, because it stops at that board's centre.
- **The default end grows with the board**, as you set it: "Default end at = L/3 − 18", meaning "inches short of the
  centre". A board that says nothing reads:

  | Board length | Default Ends At |
  |---|---:|
  | 5'8" | 29 1/2" |
  | 6'0" | 30" |
  | 6'2" | 30 1/2" |
  | 7'2" | 32 1/2" |
  | 9'0" | 36" |

  The default start is always 18". The two defaults are independent of each other.
- **The 3D page will have the same two sliders.** Its panel comes in a later plan (16-06/16-07), but it will read and
  write the very same two values on the board. Move one on RAILS and the 3D page shows the new value, and the other
  way round. Nothing extra has to be built for that.
- **VOLUME follows either slider.** Nothing on screen says the litres moved (D-18). The preset cards move a hair:

  | Preset | Before Phase 16 | After 16-01 (12"→18") | Now (18" → its own default end) |
  |---|---:|---:|---:|
  | Shortboard (6'2", ends at 30 1/2") | 29.61 L | 29.59 L | 29.61 L |
  | Fish (5'8", ends at 29 1/2") | 34.65 L | 34.64 L | 34.65 L |
  | Mid-length (7'2", ends at 32 1/2") | 49.41 L | 49.38 L | 49.40 L |
  | Longboard | unchanged (its tail isn't hard-edged) | | |

  The stock 6'0" board reads 30.29 L on VOLUME again, as it did before 16-01. Its reference picture was re-recorded,
  and the new file is byte-for-byte the picture from before 16-01. The other four reference pictures didn't change.
- **The longboard rows.** In the 40-board test set a longboard with Hard Edge ticked now reads about 0.36–0.43 L less
  than before Phase 16, down from about 1 L after 16-01. Set Ends At further toward the centre and you can keep as
  much hard edge as the old switch did, or more. The full table is in 16-01's SUMMARY, under "D-30 update".
- **It stays put.** Both settings survive a reload and a save. Untick Hard Edge and both sliders go away (the tuck rows
  come back); tick it again and they show the same values. Reset Advanced Settings puts both back to the defaults with
  everything else, and one Undo brings it all back.
- **Old boards are safe.** A board saved before this reads 18" and its own default end. So does a board saved with
  16-02's first single Ends At, except that it keeps that Ends At. Nothing is rewritten until you save, and the
  database didn't change. A stored value that makes no sense, or a pair that crosses, is read as a sensible pair, and
  the board is never refused.
- **A report to run before go-live.** `scripts/check-saved-boards.ts --hard-edge-report` lists every saved board with
  a hard-edged tail: its two settings as it reads them (marked `(default)` when the board stores none), then its
  litres before and after, largest move first. It only reads, and it never shows a board's name or an account. It
  hasn't been run on the live site; that's your one-line command in the go-live plan (in the script's header).
- **One thing you may notice in Metric.** 18" is 45.72 cm, which falls between two whole centimetres. So the first
  step or drag from 45.7 cm lands on the next whole centimetre, and every step after that is exactly 1 cm. Every
  Metric slider in the app works this way.

## The report on the 40 test boards (not the live site)

Run with 16-01's 40-board test set, using each board's label as its id (scratch `report40.ts`, archived). None of
these boards stores a setting, so every one reads the defaults.

```
hard-edge report: 40 saved boards; 40 open; 20 with a hard-edged tail
longboard|asis|hard: blends from 18" (default) · ends at 36" (default) — 75.03 → 74.60 L (-0.4307)
longboard|pin|hard: blends from 18" (default) · ends at 36" (default) — 70.39 → 69.96 L (-0.4307)
longboard|round|hard: blends from 18" (default) · ends at 36" (default) — 70.39 → 69.96 L (-0.4307)
longboard|diamond|hard: blends from 18" (default) · ends at 36" (default) — 74.65 → 74.28 L (-0.3680)
longboard|swallow|hard: blends from 18" (default) · ends at 36" (default) — 75.52 → 75.16 L (-0.3563)
midlength|diamond|hard: blends from 18" (default) · ends at 32 1/2" (default) — 50.99 → 50.98 L (-0.0072)
midlength|swallow|hard: blends from 18" (default) · ends at 32 1/2" (default) — 51.66 → 51.66 L (-0.0067)
midlength|asis|hard: blends from 18" (default) · ends at 32 1/2" (default) — 49.41 → 49.40 L (-0.0049)
midlength|pin|hard: blends from 18" (default) · ends at 32 1/2" (default) — 49.41 → 49.40 L (-0.0049)
midlength|round|hard: blends from 18" (default) · ends at 32 1/2" (default) — 49.41 → 49.40 L (-0.0049)
fish|pin|hard: blends from 18" (default) · ends at 29 1/2" (default) — 31.87 → 31.88 L (+0.0041)
fish|round|hard: blends from 18" (default) · ends at 29 1/2" (default) — 31.87 → 31.88 L (+0.0041)
fish|asis|hard: blends from 18" (default) · ends at 29 1/2" (default) — 34.65 → 34.65 L (+0.0040)
fish|swallow|hard: blends from 18" (default) · ends at 29 1/2" (default) — 34.65 → 34.65 L (+0.0040)
fish|diamond|hard: blends from 18" (default) · ends at 29 1/2" (default) — 34.08 → 34.08 L (+0.0036)
shortboard|swallow|hard: blends from 18" (default) · ends at 30 1/2" (default) — 30.64 → 30.64 L (+0.0010)
shortboard|asis|hard: blends from 18" (default) · ends at 30 1/2" (default) — 29.61 → 29.61 L (+0.0006)
shortboard|pin|hard: blends from 18" (default) · ends at 30 1/2" (default) — 28.77 → 28.77 L (+0.0006)
shortboard|round|hard: blends from 18" (default) · ends at 30 1/2" (default) — 28.77 → 28.77 L (+0.0006)
shortboard|diamond|hard: blends from 18" (default) · ends at 30 1/2" (default) — 30.18 → 30.18 L (+0.0005)
largest move: longboard|asis|hard, -0.4307 L
```

On the live site each line starts with the saved board's row id. A board that doesn't open is counted in the first
line (`…; k open, d did not open; …`) and never listed.

## Tasks and commits

| # | What | Commit | Files |
| - | ---- | ------ | ----- |
| 1 | Tracer (first look): one Hard Edge Ends At row, the store, the saved board, VOLUME following | d209bf49 | rail-controls.tsx, rail-band-editor.tsx, design-store.tsx (+ its source test), design-snapshot.ts (+test), rails-advanced.spec.ts |
| 2 | Every state of the row, Reset in one undo step, the read-only report (first look) | 3a629a1e | design-store.tsx, rails-advanced.spec.ts, hard-edge-report.ts (+test), check-saved-boards.ts, pictures |
| — | SUMMARY for the first look | 0f5e1aa3 | 16-02-SUMMARY.md |
| A | D-30 maths: Blends From and Ends At, the coupled readers and sliders, preset figures, VOLUME picture, the 16-01 table | 677482ca | rail-bands.ts, volume.ts, blank-reasons.ts (+tests), phase14-preset-figures.json, design-snapshot.ts (+test), rail-controls.tsx, rail-band-editor.tsx, desktop-baseline spec + VOLUME PNG, 16-01-SUMMARY.md |
| A2 | D-30 amendment: the default end grows with the board (L/3 − 18 short of the centre) | a8d8e3b5 | rail-bands.ts (+test), volume.test.ts, design-snapshot.test.ts, phase14-preset-figures.json, 16-01-SUMMARY.md |
| B | RAILS' two rows, the store's second setter, Reset of both, the report's settings, the browser cases | b5a065e9 | rail-controls.tsx, rail-band-editor.tsx, design-store.tsx, hard-edge-report.ts (+test), check-saved-boards.ts, rails-advanced.spec.ts |
| C | Pictures and this SUMMARY | (this commit) | 16-02-rails-hard-edge-ends-at.png, 16-02-pictures-source.tar.gz, 16-02-SUMMARY.md |
| 3 | The founder's second look | — (checkpoint) | |

## Verification

- `npm test`: 164 files, 6895 passed, 2 skipped (after A2 and again after B). `npx tsc --noEmit`: 0 errors.
  `npm run lint`: 0 errors. The one warning, in `lib/db/import-designs-action.test.ts`, was there before this plan.
- The 40-board pin test still passes: every board's litres under `HARD_EDGE_SWITCH` are bit-identical.
- `phase14-preset-figures.json`: both regenerations (A, then A2) changed exactly 3 lines, all `litres`
  (`git diff --numstat` 3/3 each time).
- `e2e/desktop-baseline.spec.ts --project=desktop`:
  - After A, VOLUME alone failed. 649 pixels changed, all inside the litres figure's box (x 1160–1224, y 361–379),
    reading 30.27 L → 30.29 L. Only that picture was re-recorded. Its SHA-256 went ae36a4ba → 14f11e4c, which is the
    picture from before 16-01.
  - After A2, all 5 passed with no second re-record. The 6'0" default end is still 30".
- `PW_PORT=3202 IS_WEBPACK_TEST=1 npx playwright test e2e/rails-advanced.spec.ts e2e/undo-redo.spec.ts
  e2e/board-lock.spec.ts e2e/phone-rails.spec.ts` (after B): 131 passed, 67 skipped, 0 failed, on all three
  projects.
- The new describe `Hard Edge Blends From and Ends At (Phase 16, D-20/D-30)` has cases 1–10:
  1. Both rows in order above Reset; moving either moves VOLUME's litres; a reload keeps both.
  2. Hard Edge off hides both and brings back the tuck rows; values are kept through off and on.
  3. The coupling both ways (Ends At stops at 20", Blends From at 18", then 30"/32").
  4. Reset restores both with the rest, and one Undo brings it all back.
  5. Metric labels and whole-centimetre steps, stored as whole millimetres.
  6. 820-wide one-line labels (computer).
  7. On a locked board both rows are greyed and disabled.
  8. A kept crossing pair 26"/20" reads 26"/30".
  9. Nothing on screen announces the move.
  10. The Shortboard preset reads its own 30 1/2" default, and Reset returns to it (computer).
- `git diff --stat 5b07f43e HEAD -- drizzle lib/db/schema.ts .planning/STATE.md .planning/ROADMAP.md` is empty: no
  database change and no tracking files. `lib/geometry/board-surface*.ts` (16-03's) wasn't touched.

## Deviations from Plan

1. **Read this before merging 16-03 (a coordination issue, not a defect here).** D-30's readers take the board's
   length: `hardEdgeEndsAt(rails, length)`, plus the new `hardEdgeBlendsFrom(rails, length)`. The parked 16-03 branch
   calls `hardEdgeEndsAt(rails)` with one argument in `lib/geometry/board-surface.ts:143` and in
   `board-surface.test.ts:162`. So after 16-02 merges, 16-03 won't typecheck until those two calls pass the length.
   Its `surfaceStations` should also take a ring at `hardEdgeBlendsFrom(rails, length)`. Before D-30 the blend's start
   was the 12" station, which already had a ring; now it's a setting, and the surface would otherwise have no ring at
   the start of the blend. These are two-line changes in files I don't own, so I left them alone.
2. **Commit A also touched callers.** For Commit A to typecheck on its own, it carries minimal changes outside
   `lib/geometry/`:
   - RAILS now passes the board's length to the readers.
   - The saved-board reader's bounds became the widest any board could need (Blends From 12"–30"; Ends At from 14"
     to the centre of the longest board). Where a value actually sits on a given board is the readers' job.
   - The snapshot tests were updated to match.
3. **The default end's 18 is its own constant.** `DEFAULT_HARD_EDGE_ENDS_AT_RULE_IN = 18` is the 18 in "L/3 − 18",
   kept separate from the default start's 18 because you called them "Two independent values". Changing one can
   never move the other.
4. **[Rule 1] A Sharp Bottom Tuck test needed a short blend.** One volume test checked a group of tail-nearest
   stations that sit wholly past the blend. At the new defaults a 6'0" board's blend reaches past halfway to the
   centre, so that group is empty. The test now runs on a 14"→18" blend so every group is exercised. Nothing in the
   maths changed for it.
5. **The litres sweep test checks direction, not a fixed direction.** It used to expect the litres to rise as Ends At
   moved. It now asks only that each sweep moves one way and never back, because whether more hard edge adds or
   removes foam depends on the board.
6. **Browser case 9 moves one setting.** Moving Blends From to 12" and Ends At to the centre together can leave the
   litres unchanged at two decimals (the earlier start takes off about what the later end keeps). So the "nothing
   announces it" case moves Ends At alone. Case 1 shows each setting moves the litres on its own.
7. **Carried over from the first look.**
   - `components/design/design-store.test.ts` now checks the litres go through `designCrossSectionInput`.
   - A refused snapshot value leaves no key at all.
   - The locked board in the browser tests is a kept saved board, not one locked through the practice rack.
   - Task 2's RED and GREEN steps are in one commit (orchestrator ruling 6).
   - The tracer gate was the automated re-run; the only stop for a person is the checkpoint.

## Threat surface

- **T-16-01 / T-16-03 (widened for D-30).**
  - The saved-board reader drops anything that isn't a finite number that could sit on some board: NaN, Infinity,
    1e9, strings, null, objects, negatives, and values past either outer bound.
  - The readers resolve Blends From first, then Ends At inside [Blends From + 2", centre]. A sweep test over stored
    pairs on three board lengths shows every resolved pair is ordered, at least 2" apart, never past the centre, and
    inside the sliders' own windows.
  - A crossing pair is kept as stored but read as a valid pair, and never rewritten.
- **T-16-04.** The report prints ids, settings and litres only; a test checks that a board named "Chris's Secret Fish"
  never appears. The production command reuses the existing EXIT trap that deletes the pulled env file.
- **T-16-05.** The report reuses the one existing read-only select. There's no write path, and it wasn't run against
  any database.
- No new endpoints, routes or storage.

## Known Stubs

None. The 3D page's copy of the two sliders is a later plan's (16-06/16-07); it reads the same store values.

## Self-Check: PASSED

- FOUND: lib/models/hard-edge-report.ts, lib/models/hard-edge-report.test.ts,
  pictures/16-02-rails-hard-edge-ends-at.png (both rows in all four shots, checked by eye),
  pictures/16-02-pictures-source.tar.gz (pictures.config.ts, shots.spec.ts, compose.py, report40.ts, table40-d30.ts,
  litres-default.ts, slider.ts)
- FOUND commits: d209bf49, 3a629a1e, 0f5e1aa3, 677482ca, a8d8e3b5, b5a065e9

## Founder's look

Two looks, both presented by the orchestrator on 2026-11-04.

- **First look (one Hard Edge Ends At row):** answering 16-03's card at the same moment, the founder changed the design —
  "The hard edge blend needs a blend sharp edge from AND a blend to. Currently the blend is happening over too short a
  distance but that should be the user's choice." and "I'd like that control on both the rails and the 3-D pages and they
  feed each other. Changing one changes the other." Settled on one card as D-30 (names Blends From / Ends At; the start
  never below the 12" mark; the end at least 2" past the start, out to the board's centre; defaults 18" and, after his
  second ruling, "L/3 − 18" inches short of the centre, "two independent values"). Carried out in this plan's commits
  677482ca, a8d8e3b5, b5a065e9 and b6f53b9b.
- **Second look (the two rows, the per-length default, the report printing both settings):** "Approved." Merged into
  `board-3d` as b56d24d4868c9c54ee3c6e2aad5b54c6b2ee3149.

**LITRES_TIP:** 6ff19b31cea9e8068c6a4183710a90e01e988288

(Moved from b56d24d4, 16-02's own merge, by the orchestrator on 2026-11-04: the founder's D-31 — the litres counting exactly the foam the 3D board draws — was carried out in 16-03, so go-live 1 ships 16-03's merge commit. 16-03's surface files are pure maths under lib/geometry/ that no route imports until 16-06; the go-live's diff checks hold: only the RAILS and store files change under app/ and components/.)

## D-31 note (2026-11-04)

After 16-03's look the founder chose one rule inside the hard edge's fade (D-31, the level variant, built in plan
16-03): inside the fade the litres count the foam the 3D board draws, corrected by the same hair the drawn board
loses to its straight segments everywhere else. Only stations inside the fade move; Hard Edge off, and every
station at full hard edge or fully tucked, read exactly as before.

| Preset (as its card opens) | Before Phase 16 | After D-30 | Now, D-31 |
|---|---:|---:|---:|
| Shortboard | 29.61 L | 29.61 L | 29.61 L (29.6099) |
| Fish | 34.65 L | 34.65 L | 34.65 L (34.6514) |
| Mid-length | 49.41 L | 49.40 L | 49.40 L (49.3974) |
| Longboard (not hard-edged) | 72.35 L | 72.35 L | 72.35 L |

The stock 6'0" board still reads 30.29 L, and VOLUME's reference picture did not change.

The `--hard-edge-report` lines re-run on the 40 test boards (scratch `report40.ts` from this plan's archive, through
`hardEdgeReportLines` — never a database; labels stand in for row ids), before = the old switch, after = D-31:

```
hard-edge report: 40 saved boards; 40 open; 20 with a hard-edged tail
longboard|asis|hard: blends from 18" (default) · ends at 36" (default) — 75.03 → 74.54 L (-0.4954)
longboard|pin|hard: blends from 18" (default) · ends at 36" (default) — 70.39 → 69.90 L (-0.4952)
longboard|round|hard: blends from 18" (default) · ends at 36" (default) — 70.39 → 69.90 L (-0.4952)
longboard|diamond|hard: blends from 18" (default) · ends at 36" (default) — 74.65 → 74.22 L (-0.4326)
longboard|swallow|hard: blends from 18" (default) · ends at 36" (default) — 75.52 → 75.10 L (-0.4210)
midlength|diamond|hard: blends from 18" (default) · ends at 32 1/2" (default) — 50.99 → 50.98 L (-0.0111)
midlength|swallow|hard: blends from 18" (default) · ends at 32 1/2" (default) — 51.66 → 51.65 L (-0.0107)
midlength|asis|hard: blends from 18" (default) · ends at 32 1/2" (default) — 49.41 → 49.40 L (-0.0088)
midlength|pin|hard: blends from 18" (default) · ends at 32 1/2" (default) — 49.41 → 49.40 L (-0.0088)
midlength|round|hard: blends from 18" (default) · ends at 32 1/2" (default) — 49.41 → 49.40 L (-0.0088)
shortboard|diamond|hard: blends from 18" (default) · ends at 30 1/2" (default) — 30.18 → 30.18 L (-0.0024)
shortboard|asis|hard: blends from 18" (default) · ends at 30 1/2" (default) — 29.61 → 29.61 L (-0.0024)
shortboard|pin|hard: blends from 18" (default) · ends at 30 1/2" (default) — 28.77 → 28.77 L (-0.0023)
shortboard|round|hard: blends from 18" (default) · ends at 30 1/2" (default) — 28.77 → 28.77 L (-0.0023)
shortboard|swallow|hard: blends from 18" (default) · ends at 30 1/2" (default) — 30.64 → 30.63 L (-0.0019)
fish|pin|hard: blends from 18" (default) · ends at 29 1/2" (default) — 31.87 → 31.88 L (+0.0007)
fish|round|hard: blends from 18" (default) · ends at 29 1/2" (default) — 31.87 → 31.88 L (+0.0007)
fish|asis|hard: blends from 18" (default) · ends at 29 1/2" (default) — 34.65 → 34.65 L (+0.0007)
fish|swallow|hard: blends from 18" (default) · ends at 29 1/2" (default) — 34.65 → 34.65 L (+0.0007)
fish|diamond|hard: blends from 18" (default) · ends at 29 1/2" (default) — 34.08 → 34.08 L (+0.0002)
largest move: longboard|asis|hard, -0.4954 L
```

The longboards move a little further than under D-30's area blend (−0.42 to −0.50 L against −0.36 to −0.43 L): the
point blend holds less foam than the area blend did, and the litres now count it.

