---
quick_id: 261116-tqs
date: 2026-11-16
source: the founder, 2026-11-16 — his ask to tighten the .brd fit, the orchestrator's headroom measurement, and his ruling on it
---

# Tighten the .brd import's bottom fit, and let RAILS' Domed Deck Band reach to 1" from the stringer — decisions (locked)

## The founder's words

1. "The .brd file import still seems to miss by more than it should. With all the customized controls, can we tighten up the
   fit? I think we should be able to match the .brd curves worst miss by less than 0.5mm (certainly less than 1mm) every time."
2. After the measurement below: "I'm more worried about the bottom figures than rocker. Rocker gets changed anyways as soon as
   a blank is picked. I don't need the outline change for the tail, but I would be ok with adding more flexibility to the
   domed deck band (going all the way back to 1" from the stringer)."

## What was measured (scratch scripts, nothing committed)

A research agent re-ran each fitter from the import's own answer with a much heavier search over the SAME controls, scored the
same way the import scores itself (largest + typical gap). Scripts and outputs:
`/private/tmp/claude-501/-Users-kontoes-Code-shaper/002e2a58-3c43-4c8e-bbb5-e9c435113dd2/scratchpad/tight/` — `all.ts`
(every closeness figure through `brdLookFromBytes`), `common.ts`, `bottom.ts` + `bottom.out`/`bottom2.out`, `rails.ts` +
`rails.out`, `rail-one.ts`. They read the founder's twelve sample files in `~/Downloads` (skip the `_decrypt` copies;
quadtesting.brd and test-curves-v2.brd hold the same curves).

Bottom, widest miss in mm, today → best with existing controls at any value (stations, depth, across marks; Smoothness and Vee
Lift also freed, which adds at most 0.05 mm):

| file | today | best | limit |
|---|---|---|---|
| 6'2 Round Tail | 0.95 | 0.35 | search |
| 6'4 Groveler | 0.83 | 0.40 | search |
| Fryer 5'7 | 1.04 | 0.42–0.44 | search |
| SAtri | 0.66 | 0.38 | search |
| mid | 0.85 | 0.49 | search |
| Scoop Noserider | 1.92 | 1.13 | partly search; soft belly shape |
| 92Log | 2.14 | 1.56 | partly search; soft belly shape |
| testLB | 2.39 | 2.08 | model (belly across) |
| SAtwin | 1.63 | 1.61 | model (a double inside the vee tail) |
| quadtesting | 6.46 | 5.76 | model (a 29 mm vee; Depth stops at 1/2") and a malformed file |
| Egg, JFS | 0.84, 0.70 | unchanged | model (wobble in the file's flat sections) |

What holds the bottom back today (the research's reading): the 1/2" station grid, the 1/16" depth and across-mark steps, and
the 0.1 mm bar (`BRD_BOTTOM_MOVE_GAIN_MM`) a move must clear, all in `brdBottomScorer.refine` (`lib/geometry/brd-bottom.ts`).
The research's polish took 4–18 s per file unoptimised.

Rails, widest miss today → best with every existing continuous rail control and the tail blend: Egg 2.07 → 2.02 (the deck is
crowned right across, which RAILS cannot draw with the dome capped at 2.4 × thickness ± 2"), Round Tail 2.11 → 1.94, Groveler
1.25 → 1.05, 92Log 2.32 → 2.19, Fryer 1.14, JFS 1.52 → 1.39, SAtri 2.52, Scoop 3.22 → 2.55, mid 1.76 → 1.69, testLB 5.00 → 4.95.
The rail misses on SAtri, mid and Scoop are mostly the thickness miss carried over (out of scope here). The research did NOT
try a wider Domed Deck Band; that is this task's own measurement.

## Decisions

- **D-01 — The bottom fit finishes with a polish at any value.** After today's search settles the cut names and its grid
  answer, a final pass moves each fitted cut's Start, Deepest At, End, Depth and across marks (Off Stringer, the double's and
  Tri-Plane's marks, the belly's panel from quick 261116-jqz — whatever the refine moves today) by amounts finer than today's
  grid, down to any value, with no 0.1 mm bar for a move that helps. Names are not re-chosen by the polish: the name choice and
  its rules (fewest cuts, the Tri-Plane last, `BRD_BOTTOM_EXTRA_CUT_MM`) stay exactly as today, on the grid answer. Smoothness and
  Vee Lift stay where they are (measured: at most 0.05 mm).
- **D-02 — A board keeps actual values; 1/16" is for display.** A polished cut stores the polished number (the founder's rule,
  2026-11-05: "round only for display"). BOTTOM's sliders, readouts, DATA table and the printed sheets show it rounded to
  1/16" (1 mm in Metric) as they do any value; the planner must check that each of those reads an off-step value correctly (a
  slider whose thumb sits between steps, a DATA mark, the printed BOTTOM CONTOURS sentences) and that a saved board keeps it
  through a save and a reload. No database change (the bottom lives in the snapshot JSON).
- **D-03 — Depth keeps its 1/2" ceiling** and BOTTOM keeps its controls and ranges (the founder's bottom-contours plan of
  2026-11-06). The polish stays inside every control's own range.
- **D-04 — The Domed Deck Band reaches to 1" from the stringer.** On RAILS, each section's Domed Deck Band slider can move the
  dome in toward the stringer until it is 1" from the stringer at that section (that is, out to the section's half-width less
  1"), instead of stopping at 2.4 × thickness + 2". Its other end, and its rule against Deck Mark 3 (never onto it, 1/16" beyond),
  stay as they are. Where 2.4 × thickness + 2" already reaches past 1" from the stringer on a narrow section, the slider's reach is
  whichever is shorter there — the dome never passes 1" from the stringer. The planner works out how the slider's range is
  expressed (today a ±2" nudge, `RAIL_NUDGE_LIMIT_IN.domedDeckBand`) and where the half-width comes from at each section, and
  says so in the plan. Every board saved today reads and draws exactly as it does now (a nudge within ±2" means what it meant);
  the saved-board reader accepts the wider amounts. No database change.
- **D-05 — Every reader of the dome follows it,** as each already follows today's dome: RAILS' plots and readouts, the finished
  rail, the 3D board, the .brd export, the litres, the printed rail-band sheet. A board whose dome is within today's reach draws,
  computes and prints exactly as today (golden fixtures and recorded litres unchanged).
- **D-06 — The rails fit searches the wider dome,** so a crowned-deck file (the Egg) can come in with a dome that runs in toward
  the stringer.
- **D-07 — Measured through the real import** (`brdLookFromBytes`), all twelve files: the SUMMARY tables every file's bottom and
  rails widest/typical miss before and after, and the open time before and after. The founder's files are never committed,
  copied into the repo or named in a test (standing rule); tests use synthetic sections and the app's own fixture boards.
- **D-08 — Opening a file stays quick:** today the whole look takes 1.5–5 s per sample file on this Mac. The polish and the wider
  dome search may add at most about 3 s on the slowest file; if the measured gain needs more, the planner says what it costs and
  the orchestrator asks the founder. The brd-fit suite's "finishes the Longboard well inside a second" holds, and the app's own
  boards still round-trip (export → import) as today or closer.

## The founder's ruling on BOTTOM's steps (2026-11-16, during planning)

Asked whether the cut limits need loosening (answered no: the measurement found the steps, not the ranges, hold the fit back) and
which BOTTOM numbers should read and step finer, he answered: "1/64" (or .1mm) for depth, use 1/16" across the width of the
board, and 1/2" only for along the length of the board"; Metric: "Tenths of a millimetre"; and the finer depth shows
"everywhere a depth is shown".

- **D-09 — Depth reads and steps in 1/64", 0.1 mm in Metric.** Every BOTTOM cut's Depth (and a channel's depth, if it has one
  that reads as a mark) — the slider's step, its readout, DATA's depths table, the printed BOTTOM CONTOURS tables and sentences,
  the .brd fit preview's bottom words, anywhere a bottom depth is shown — reads to the nearest 1/64" in Imperial (written as a
  reduced fraction: `3/64"`, `1/8"`) and to 0.1 mm in Metric (`3.5 mm`). A depth that sits on a 1/16" step reads exactly as
  today in Imperial (`1/8"`), so GUIDE cards and starting numbers read unchanged. The formatting lives in
  `lib/geometry/units.ts` like every conversion (Rule 2); CLAUDE.md's Rule 2 gains one sentence recording this exception to
  "marks read in whole millimetres", the way the 50.8 mm scale-check square is recorded.
- **D-10 — Across the board stays 1/16" (1 mm in Metric), along the board stays 1/2" (10 mm in Metric)** — the steps BOTTOM's
  mark and station sliders already use. No change to them.
- **D-01 is read with D-09/D-10:** the polish still stores what it finds (the founder's round-only-for-display rule), and the
  controls show it on their own steps. The planner also measures, and the SUMMARY reports, the figures if the polish were held to
  these steps (depth on 1/64", across marks on 1/16", stations on 1/2"), so the founder can see what landing off the steps buys.

## Out of scope

The rocker and the deck/thickness fit (the founder: a blank changes the rocker anyway); the outline, including a squash tail's
corners and the nose tip; new BOTTOM controls (Depth past 1/2", a double inside a vee); Smoothness in the fit; the quadtesting
file's open outline ends and looped sections (measured: a malformed test file; leave for now); RAILS' GUIDE words and cartoons
(they draw each control at its starting numbers) — if a GUIDE test demands new words for the wider dome, stop and say so rather
than writing the founder's words.

## The founder's ruling on where the fit lands (2026-11-16)

- **D-11 — "let the fit land anywhere."** The polish stores whatever value fits closest, between steps on any axis; the controls
  show it rounded to their own steps (D-09/D-10). The on-step comparison D-01 asked for is no longer needed for the decision;
  report it in the SUMMARY only if it was already measured.

## The founder's word on the dome and the plot (2026-11-16, during execution)

"For the domed deck slider I meant that it can get as close to the stringer as 1" so that the entire deck looks pretty domed. We
should also stop the plot at the stringer too (maybe show a dashed line like the stringer on the template page)."

- **D-04 confirmed as planned:** the slider's far end is the section's half-width less 1" (the dome can come in as close as 1"
  from the stringer); a saved dome already past that line keeps its stored value (the plan's reading, not contradicted).
- **D-12 — RAILS' cross-section plots stop at the stringer and draw it.** Wherever a rail section's plot is drawn from
  `railPlotBounds` (RAILS' VIEWER on every device, and any printed rail-band sheet that uses the same bounds), the plot's span
  never runs past the stringer: today's "2" beyond the Domed Deck Band" is capped at the stringer (the section's half-width in
  from the rail). The stringer is drawn as a line at that edge in the drafting grammar's stringer dash (`16 4 4 4`, the same
  dash TEMPLATE's stringer uses — see the sketch-findings skill's drawing-and-callouts reference and TEMPLATE's own stringer
  line for the token and stroke), in the faint reference ink, top to bottom of the section. A plot that today stops short of the
  stringer keeps its span and still gets no stringer line only if the stringer is off the plot — the line is drawn only where the
  stringer is within the span. Desktop baselines that change because of the new line are a finding to report, with the
  picture, not something to re-record silently.

- **D-04 amended (the founder, 2026-11-16): "let's just allow it to go to the stringer then."** The Domed Deck Band's far end is
  the stringer itself — the section's full half-width in from the rail — not 1" short of it. Everything else in D-04, D-05, D-06
  and D-12 stands: saved domes keep their stored values, the rails fit searches the full reach, and the plot stops at the stringer
  (which a dome at the far end now meets exactly).
