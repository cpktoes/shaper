---
phase: 18-a-guide-on-every-page
plan: 05
subsystem: guide
status: complete
tags: [guide, rails, words-page, rule-2, playwright, board-name-band]
requires:
  - phase: 18-01
    provides: the GUIDE card contract, the painter, GuideTab, the words reader, the e2e helpers
  - phase: 18-02
    provides: the board's name giving way under 50 dots of room on the tab strip
provides:
  - "lib/geometry/guide-rails.ts — RAILS' 17 cards (RAILS_GUIDE_CARD_IDS, RAILS_GUIDE_CARD_ORDER, RAILS_GUIDE_PUSH_FIELDS, RAILS_GUIDE_SECTION, RailsGuideInput, railsGuideVariants, buildRailsGuide, railsGuideX0, railsGuidePushedOutput, railsGuideFinishedRail, railsThicknessName)"
  - "lib/geometry/__fixtures__/guide-rails-input.ts — railsGuideInputFromFields, guideRailsInput"
  - "components/guide/words/rails.ts — RAILS_GUIDE_INTRO, RAILS_GUIDE_GROUPS, RAILS_GUIDE_WORDS"
  - "components/guide/rails-guide.tsx — RailsGuide"
  - "RailPage gains \"guide\"; GUIDE last on RAILS' strip"
affects: [18-07, 18-08, 18-09, 18-10]
tech-stack:
  added: []
  patterns:
    - "a push held at the control's own slider end (measureSlider's toMm(max)), turned the other way at the end, none with no room"
    - "a RAILS cartoon's colours proven in the browser against the hues VIEWER's own plot draws with"
key-files:
  created:
    - lib/geometry/guide-rails.ts
    - lib/geometry/guide-rails.test.ts
    - lib/geometry/__fixtures__/guide-rails-input.ts
    - components/guide/words/rails.ts
    - components/guide/words/rails.test.ts
    - components/guide/rails-guide.tsx
    - e2e/guide-rails.spec.ts
  modified:
    - components/rails/rail-band-editor.tsx
    - e2e/desktop-baseline.spec.ts-snapshots/rails-desktop-desktop-darwin.png
decisions:
  - "Hard Edge is drawn as the tail's cross-section (the tucked rail in dashes), not as the tail from above: the plan's own behaviour asks for its dashed rail through computeRailSectionOutput with the flag flipped"
  - "A nudge's push is held at its slider's own end: in Metric the deck marks' 13 mm push reads +12 mm, the slider's end"
  - "Tail Rail Blends From · Ends At reads the app's own 30 1/2\" (the slider's reader), not the words page's 30 5/16\""
  - "The thickness card's Metric name keeps the sidebar's space: Thickness @ 30.5 cm"
metrics:
  duration: "about 3 h (most of it browser and unit runs under a load average of 300-1000)"
  completed: 2026-11-10
  tasks: 3
  commits: 4
  files: 9
actuals:
  tokens: 21000
  tasks: 3
  commits: 4
---

# Phase 18 Plan 05: RAILS' GUIDE tab Summary

RAILS' strip now reads **VIEWER · DATA · INSTRUCTIONS · GUIDE**. GUIDE opens seventeen cards, each with the open
board's own number beside its name, a small drawing of its rail — the board from above with the three stations, then
the cross-section at the centre (at the tail for Hard Edge and Scaled from center by) with the bands in RAILS' own
colours, the apex centre and the finished rail in ink — the one setting pushed in muted dashes through RAILS' own rail
maths, and the founder's two sentences and *How to shape* note, word for word from his page.

## What a shaper now sees on RAILS

- **Seventeen cards in three groups**: *Inputs* (Import Rocker & Foil Values, Board Thickness · Thickness @12"),
  *Nose Rail · Center Rail · Tail Rail — every rail has these; drawn at the center, the tail for Hard Edge* (Deck
  Profile, Family, Ratio, Symmetrical, Hard Edge) and *Advanced — each rail's fold* (ten cards).
- **The Shortboard, Imperial**, card by card: Import `On this board`; Thickness `2 1/4"`, `dashed · 2 1/2" thick`; Deck
  Profile `2 1/4" · Flat`, `dashed · domed to 1 15/16"`; Family `med/knifey`, `dashed · boxy`; Ratio `60/40`, `dashed ·
  35/65`; Symmetrical (no tag), `dashed · symmetrical`; Hard Edge `On this board`, `dashed · tucked`; Scaled from center by
  `1.00`, `dashed · 0.70`; Apex Thickness `11/16"`, `+1/4"`; Deck Mark 1 `2 1/4"`, `+1/2"`; Deck Mark 3 `4 1/16"`,
  `+1/2"`; Domed Deck Band `5 3/8"`, `+2"`; Use Single Tuck `dashed · one tuck`; Bottom Tuck 1 `5/16"`, `+1/4"`; Bottom
  Tuck 3 `9/16"`, `+3/4"`; Sharp Bottom Tuck `dashed · sharp`; Tail Rail Blends From · Ends At `18" · 30 1/2"`, `dashed ·
  24" · 36 1/2"`. Every one equals the words page except the last (see *For the founder* below).
- **The Longboard** (no hard edge, symmetrical, 50/50): Hard Edge has no tag and reads `dashed · hard edge`;
  Symmetrical is `On this board` and reads `dashed · not symmetrical`; Ratio `50/50` → `35/65`; Family `med` → `knifey`.
- **Metric**: every mark in whole millimetres (`57 mm`, `dashed · 63 mm thick`, `18 mm`, `+6 mm`), Deck Profile
  `57 mm · Flat` → `domed to 49 mm`, Blends From · Ends At `45.7 cm · 77.5 cm` → `60.7 cm · 92.5 cm`; the thickness card
  is named `Board Thickness · Thickness @ 30.5 cm`, as the sidebar names the tips' slider.
- **On a phone** GUIDE pins the drawing area at two thirds of the screen; the cards scroll inside it and the page never
  scrolls. Back on VIEWER the drawing area is RAILS' own half of the screen again and the NOSE · CENTER · TAIL switch is
  back (measured within one dot of where it was before GUIDE was opened). INSTRUCTIONS still lets the page scroll as one
  column; DATA is unchanged.
- **Nothing on a card can be pressed** and nothing on it changes the board.

## How each card is worked out

- **One card stands for all three rails (D-04).** Every card draws the centre's rail, except Hard Edge, Scaled from
  center by and Tail Rail Blends From · Ends At, which draw the tail's (`RAILS_GUIDE_SECTION`).
- **A push is the board's own section spec with one field changed** (`RAILS_GUIDE_PUSH_FIELDS`): `boardThickness +
  1/4"` (6 mm), `deckPercent` 85 (back to Flat on a board already at 85), `family` to the far end (≤ med → knifey,
  else boxy), `ratioTopPercent` 35 (its mirror, 65, on a board whose apex already sits above the middle), the toggles
  the other way, `scaleFromCenter` 0.70 (1.00 on a rail already at 0.70), the six nudges by their push, and Blends From
  and Ends At + 6" (15 cm) together inside their own slider windows (`hardEdgeBlendsFromWindow` /
  `hardEdgeEndsAtWindow`), the other way with no room toward the centre, no caption with none either way (D-26).
- **Every section, base and pushed**, is `computeRailSectionOutput(key, spec, hardEdge)` then `finishedRail(output,
  mm(min(x0, output.bounds.xAxisMin)))`, `x0` the smallest `xAxisMin` of the base board's three sections — the base is
  the store's own `railBands[key]`.
- **The drawing**: strip 60 (the board from above, its three stations at the tail 12", the centre and the nose 12", the
  card's own dash-dot); a section detail 120 — the finished rail's fill, the baseline and the deck line, the rail line,
  each band as a `band` path keyed by its own `RailSegmentKey`, the mark dots (`railPlotDots`), the apex centre as an
  `apex` tick, the finished rail in ink, the push's finished rail in muted dashes with a push dot on every mark that
  moved, and the card's one mark dimensioned (marks right of the rail in an 84-unit gutter, deck marks over the deck,
  tucks under the bottom, `Hard edge` as a word under a hard-edged rail); or the tail from above 110 for Blends From ·
  Ends At — one rail, the hard edge as the `hardEdge` band drawn just inside the rail's line from the tail to Blends
  From, the fade in the thinning dash to Ends At, both marks across the rail, the pushed pair in muted dashes, each
  mark's figure under the stringer (Blends From toward the tail, Ends At toward the nose, so the two can never meet).
- **No new hue.** The painter strokes a `band` with `RAIL_SEGMENT_COLORS[key]` and the `apex` with
  `RAIL_APEX_CENTER_COLOR` (18-01's painter, untouched); the browser test reads every colour a RAILS cartoon uses and
  finds each among the colours VIEWER's own plot draws with.

## The board's name on RAILS' strip with GUIDE on it (measured)

Room = dots from GUIDE's right edge to the strip's right edge, upright, the same on the iPhone (WebKit) and the Android
(Chromium) profiles. Plan 18-02 predicted 39.6 at 390 and 61.6 at 412; measured exactly that.

| Width | 360 | 375 | 390 | 412 | 430 |
|---|---|---|---|---|---|
| Room after GUIDE | 9.6 | 24.6 | 39.6 | 61.6 | 79.6 |
| The board's name | not drawn | not drawn | not drawn | drawn, 55.6 wide | drawn, 59.5 wide |

At every width the four tab words share one top and one height inside the strip, and the page never scrolls sideways.

**On a computer** (`board-name-band.spec.ts` d1, desktop, passed): RAILS' room after GUIDE is 429.6 at 1280 (name
whole), 173.6 at 1024 (name shortened with …), and **29.6 at 820 — the name is not drawn** (it was 119.7 before GUIDE,
per 18-02). That is the room rule working as written; worth knowing for the founder's look at an 820-dot window.

## For the founder (his look)

- **Tail Rail Blends From · Ends At on the Shortboard reads `18" · 30 1/2"`, caption `dashed · 24" · 36 1/2"`**; the words
  page says `18" · 30 5/16"` and `dashed · 24" · 36 5/16"`. The sketch took Ends At as L/6 + 18" unrounded; RAILS' own
  reader (`hardEdgeEndsAt`) rounds the board's default to the slider's 1/2" step, and the card reads the board as the
  slider does. The words page is left exactly as written (18-07 owns it this wave); `rails.test.ts` names this one card
  as the known difference and fails if it ever stops differing.
- **In Metric, Deck Mark 1 and Deck Mark 3 push `+12 mm`, not the push table's 13 mm**: the deck marks' slider runs
  ±1/2", which in Metric is a whole-millimetre ±12 mm, so 13 mm is a nudge no shaper could set. The push stops at the
  slider's own end. Every other Metric push is the table's own figure (6, 50, 6, 19 mm; 15 cm for the blend pair).

## Deviations from Plan

**1. Hard Edge draws the tail's cross-section, not the tail from above.** The plan's action gives Hard Edge the 110
plan; its own behaviour and must-haves ask for Hard Edge's dashed rail as `computeRailSectionOutput` with the tail's
flag flipped, and the words page's caption is `dashed · tucked`. Followed the behaviour (the sketch did the same):
Hard Edge is a 120 section at the tail, the tucked rail in dashes and `Hard edge` written under the bottom. Only Blends
From · Ends At draws the tail from above.

**2. A nudge's push is held at its slider's end** (see *For the founder*), read through `measureSlider` exactly as
RAILS' Advanced slider reads `RAIL_NUDGE_LIMIT_IN` — no inch figure or converter in the builder.

**3. Ratio's other way is 65 (the push's mirror), not the sketch's 70**, so the push stays one tabled figure.

**4. The thickness card's Metric name is `Board Thickness · Thickness @ 30.5 cm`** — with the space the sidebar puts
before a Metric station (`rail-controls.tsx`), still read through `stationLabel`. The plan's template string had no
space; the plan also says "as the sidebar labels it", and the sidebar wins.

**5. The Metric "no inch mark" check covers names, tags, captions and drawing labels, not the prose.** Two sentences
quote the 12" stations (Import Rocker & Foil Values' *is*, Board Thickness' *how*); their Metric sayings are 18-07's
work this wave. Plan 18-08 can widen the check to the whole GUIDE once both are merged.

**6. The colour check reads the page, not `RAIL_SEGMENT_COLORS`.** Importing `rail-section-plot.tsx` into a unit test or
a spec pulls in the units provider and the database client (it fails with no `DATABASE_URL`). The unit test proves
every band carries one of its own section's `RailSegmentKey`s; the browser test proves every colour a RAILS cartoon
draws is one VIEWER's own plot draws (at least six band hues and inks required, none new allowed).

**7. No tail thickness limit on the thickness push.** The centre thickness slider's 1.75"-3.5" bounds live only inside
`rail-controls.tsx` and the slider is hidden while the thickness is imported; every preset's +1/4" is inside them.

**8. TDD order.** Task 1 is marked `tdd="true"`; the builder and its test went in one commit (one commit per task, the
orchestrator's ruling), the test written against the plan's behaviour list.

## Shared files touched

None. `guide-card.ts`, `guide-push.ts`, `guide-draw.ts`, the painter, `GuideTab`, the words reader, the e2e helpers,
`tabbed-panel.tsx`, `rail-section-plot.tsx`, `phone-chrome.spec.ts`, `board-name-band.spec.ts` and `18-GUIDE-WORDS.md`
are all untouched.

## Phase 17 merge note (D-19, RESEARCH Finding 10)

Once Phase 17's BOTTOM page is on main, RAILS draws the rail the bottom leaves (`railsOnBottom` /
`railBandsOnBottom`). `components/guide/rails-guide.tsx` then reads those two in place of `effectiveRails` and
`railBands` in its one `useDesign()` line (a comment there says so), so the GUIDE keeps following what the page draws.

## RAILS' desktop picture (re-recorded on purpose)

`rails-desktop-desktop-darwin.png` now shows **the word GUIDE after INSTRUCTIONS on the tab strip, and nothing else
new**. Compared with the old picture pixel for pixel (tolerance 0): 244 pixels differ, every one inside the box x
773-816, y 102-112 — the word GUIDE; the drawing, the sidebar, the key and the top bar are unchanged. SHA-256 (first 8)
old b853ef2a, new 560dbc31. Rendered by the webpack dev server (`IS_WEBPACK_TEST=1`, port 3115) in this worktree. Two things worth knowing for whoever re-records next:

- The old picture still **passed** with GUIDE on the page: 244 light-grey pixels sit inside the config's
  `maxDiffPixels: 100` once Playwright's per-pixel colour threshold is applied, so `--update-snapshots` (mode
  "changed") wrote nothing.
- `--update-snapshots=all` on `desktop-baseline.spec.ts` recorded RAILS **before its plots had fitted** (the server's
  900-dot plots, the Tail plot off the bottom) — 311,404 pixels off. That picture was thrown away. The kept picture was
  recorded by a throwaway copy of the RAILS test that first waits for `[data-rail-plot-fit="measured"]` (deleted, never
  committed), then checked by the real test without updating.

## For its owner: `board-name-band.spec.ts` p3 on the iPhone (not edited — ruling 8)

**p3 fails on the iPhone at `RAILS Untitled crowded to 49: no sideways page scroll` — expected ≤ 360, received 397.**
p3's last step narrows each page's strip by hand to 49 and 51 dots of room at 360 wide, on the stated assumption
"Today's strips all have the room". With GUIDE on it, RAILS' strip has only 9.6 dots of room at 360, so "crowding to
49" sets the strip 348.4 + 49 = 397 dots wide, wider than the phone, and WebKit scrolls the page sideways (Chromium,
on the Android profile, does not, so p3 passes there). Every RAILS row of p1, p1b, p2 and p3's own measurements passed
the room rule on both phones; only the hand-crowding step's assumption breaks. ROCKER will meet the same once 18-04's
GUIDE merges (1.8 dots at 360). Fix for 18-08 (or whoever owns the band spec next): crowd a strip only where its own
room is at least the target, or do the crowding at a width where every strip has 51 dots of room.

## Test results (this worktree, webpack dev server on 3115, load average 300-1000 throughout)

- `npx vitest run` (whole suite): 189 files, 9601 passed, 155 failed, 14 skipped — every failure a timeout under the
  load (51 × "Test timed out", 1 hook timeout). The 19 files re-run alone with `--testTimeout=180000`: 17 passed, 3924
  tests green; the last two, each alone once the load fell, passed too: `blank-fit.test.ts` 86 passed (its "under 250
  ms" timing test had read 264 ms under load) and `shaping-bay.test.ts` 152 passed (7 tests had run past their own
  120 s limit). So every unit test passes. This plan's own files: `guide-rails.test.ts` 19 passed, `components/guide`
  31 passed, `units-isolation.test.ts` passed.
- `npx tsc --noEmit`: clean. `npm run lint`: 0 errors, 1 warning that was already there
  (`lib/db/import-designs-action.test.ts`, `_calls`).
- `e2e/guide-rails.spec.ts`: desktop 4 passed; iPhone and Android 4 passed (8 skipped by project).
- `e2e/phone-rails.spec.ts`: iPhone 18 passed, 7 skipped (5 cold-compile `page.goto` timeouts on ROCKER and RAILS
  pages passed on re-run, the last two with `--timeout=170000`); Android 15 passed, 10 skipped.
- `e2e/desktop-baseline.spec.ts --project=desktop`: all 6 pass with the new RAILS picture (TEMPLATE, ROCKER, RAILS in
  one run; VOLUME and 3D after cold-compile timeouts; FINS once more alone — its first run differed by 903 pixels in its
  callout labels' size mid-settle, untouched by this plan, and passed alone).
- `e2e/board-name-band.spec.ts`: desktop 7 passed; Android 4 passed + p3 passed alone (a tap intercepted mid-layout
  under load); iPhone 4 passed, p3 failed (above).
- `e2e/phone-chrome.spec.ts -g RAILS` (18-06 owns the file): iPhone 3 passed, desktop + Android 5 passed.
- `e2e/rails-advanced.spec.ts` (all projects): 74 passed, 7 skipped. `e2e/template-rails-panels.spec.ts`: 8 passed,
  13 skipped. The two `summary-rail-*` specs (the SUMMARY page) were not run: nothing on SUMMARY changed.

## Task Commits

1. **Task 1: RAILS' 17 cards worked out from the open board's rail sections** — `64ffd3cb` (feat)
2. **Task 2: RAILS' GUIDE on screen, its words held to the founder's page** — `fcb04697` (feat; also carries the hard
   edge drawn just inside the rail's line on the Blends card, a drawing touch to Task 1's file found at the first look)
3. **Task 3: RAILS' desktop picture re-recorded on purpose** — `385c0a0b` (test)

## For plan 18-08 (all pages) and 18-09 (the founder's look)

- Widen the Metric "no inch mark" check in `guide-rails.spec.ts` to the whole GUIDE once 18-07's sayings land (the two
  12" prose lines above).
- `board-name-band.spec.ts` p3's hand-crowding step needs the change above before RAILS (and ROCKER) can pass it on
  the iPhone.
- RAILS' GUIDE never needs `phone-chrome.spec.ts` changed for its own rows: the RAILS rows there pass as they are.
- The section cards draw one card's mark only; a card whose control has no room (D-26) draws the board as it is with no
  caption and no dashes — none of the four presets meets that case, `guide-rails.test.ts` proves the turn-back case.

## Known Stubs

None. Every card is worked out from the store's own rails; nothing is placeholder.

## Threat Flags

None. The GUIDE adds no network, storage or input path; the board's name reaches the intro as a React text child only
(T-18-01, `guide-source.test.ts` walks `rails-guide.tsx`); the 17 sections are built once per board and system and only
while GUIDE is open (T-18-02).

## Self-Check: PASSED

- FOUND: lib/geometry/guide-rails.ts, lib/geometry/guide-rails.test.ts, lib/geometry/__fixtures__/guide-rails-input.ts,
  components/guide/words/rails.ts, components/guide/words/rails.test.ts, components/guide/rails-guide.tsx,
  e2e/guide-rails.spec.ts, components/rails/rail-band-editor.tsx (GUIDE last, `"66dvh"` pin, `RailPage` lists
  `"guide"`), the new rails-desktop picture (SHA-256 560dbc31)
- FOUND commits: 64ffd3cb, fcb04697, 385c0a0b
