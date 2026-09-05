---
status: diagnosed
trigger: "G-06-12 and G-06-15 (same root cause — diagnose together). On Metric, fin placement numbers read in centimetres where the shaper wants whole millimetres, on the Fins DATA tab, the fins sidebar sliders and the fin drawing's callouts."
created: 2026-09-05T22:00:00Z
updated: 2026-09-05T22:45:00Z
mode: symptoms_prefilled, goal=find_root_cause_only
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

bug_class: Bohrbug (deterministic; a design-decision reversal, not a coding defect — the code matches 06-CONTEXT D-01 exactly)
hypothesis: CONFIRMED — every fin placement "distance off the tail" is classified `dim` (cm, one decimal) at nine sites, all traceable to 06-CONTEXT D-01's table row "Fin positions off the tail … quad rear off-tail" under the cm column; toe-in, off-rail, off-stringer, full spread and base length are already `mark`.
next_action: return ROOT CAUSE FOUND to the orchestrator; the gap-closure planner flips the nine sites and the three test expectations listed under Resolution.

reasoning_checkpoint:
  hypothesis: "Off-tail / position numbers read in cm on Metric because (a) lib/geometry/fins.ts tags every Off-Tail DATA row `family: \"dim\"` (lines 905, 934, 959), (b) fin-controls.tsx prints the four resolved off-tail labels through formatDim (lines 556, 594, 684, 707), and (c) fin-viewer.tsx prints the off-tail callout through formatDim (line 224) — each exactly as plans 06-05/06-06 specified from D-01."
  confirming_evidence:
    - "grep of fins.ts: `family: \"dim\"` appears only on the three Off-Tail rows; every other row is `\"mark\"`; the tag is carried through the Mm boundary map unchanged (line 1249) and fin-data-panel.tsx branches on row.family (lines 68, 78)."
    - "Probe (throwaway vitest, deleted): default thruster frontOffTail formats as `27.9 cm` via formatDim and `279 mm` via formatMark; centerOffTail `8.4 cm` vs `84 mm`; quad rear off-tail `13.0 cm` vs `130 mm`. DATA rows print exactly those `dim` strings today."
    - "Probe: measureSlider metric views for POS_BOUNDS (-38..38), OFF_TAIL_OVERRIDE_BOUNDS (13..304), TOE (0..12), OFF_RAIL (26..50) all have step=1 mm already (D-05) — only the label formatter differs between families."
    - "Imperial branch of formatDim and formatMark is the same call, formatInchesFraction(value) (measure-display.ts 62-64, 80-82; bare variants 71-73, 85-87); probe confirmed formatDimBare === formatMarkBare in Imperial."
  falsification_test: "If any Off-Tail row or off-tail label were already printed through formatMark, or if measureSlider's metric step for the position sliders were 10 mm, the hypothesis would be wrong. Neither is the case."
  fix_rationale: "Changing the family tag / formatter at those nine sites changes only the printed metric string (cm one-decimal -> whole mm with its own unit). Storage (Mm), placement math, slider domains and every Imperial string are untouched."
  blind_spots: "The shaper's decision is silent on the toe-aim tables' CELL values (aim distances off the stringer at the nose, 1.19-3 in). D-01 classified them cm; they are neither an off-tail/off-rail/toe-in number nor a board dim. Needs a one-line confirmation before planning (see Resolution)."
  candidate_causes:
    - "code: hard-coded `family: \"dim\"` tags and formatDim calls (the expression of the decision)"
    - "config/spec: 06-CONTEXT D-01 + 06-UI-SPEC FINS section classify off-tail as cm (the decision itself — the actual root)"
    - "data: none — stored values are Mm and unchanged; environment: none"
  and_gate: "no — a single root (the D-01 classification) explains every symptom; the fix simply has to land at all nine sites that express it, which is a multi-site edit, not multiple causes."

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Every fin PLACEMENT number — a fin's distance up from the tail (off-tail / position), its distance in from the rail (off-rail), and its toe-in — reads in whole millimetres on Metric everywhere it appears: the Fins DATA tab rows and its summary line's off-tail figures, the fins sidebar sliders (Forward/Aft positions, off-tail, quad rear off-tail override), and the fin drawing's callouts, summary line and base-length legend. Board-size numbers on the Fins screen stay in centimetres: board length and tail width on the DATA tab summary line, the Tail Width @ 30.5 cm slider, and the toe-aim (McKee) tables' board-length and tail-width headings. Fin base length, toe-in and off-rail already read in mm and must stay that way.
actual: UAT test 12: "all fin placement data should be in mm" (DATA tab off-tail rows read in centimetres, toe-in/off-rail in millimetres). UAT test 15: "all fin dims should be mm" (fin drawing's off-tail callouts read in centimetres while toe/off-rail callouts read in millimetres). The fins sidebar's position/off-tail sliders also read in centimetres (test 14 passed but the decision above applies to them for consistency).
errors: None reported
reproduction: Tests 12, 14 and 15 in .planning/phases/06-the-design-screens-in-metric/06-UAT.md — dev server on http://localhost:3000, pick Metric from the gear menu, open /design/fins, look at the DATA tab, the sidebar sliders and the drawing callouts.
started: Discovered during end-of-phase UAT for Phase 6 (2026-09-05). Phase 6 deliberately introduced a two-family rule (06-CONTEXT.md D-01 and the UI-SPEC): "dim" (cm, one decimal) for lengths along the board and "mark" (whole mm) for small marks. Plan 06-05 tagged every fin DATA row with a `family` in lib/geometry/fins.ts (off-tail as "dim", toe/off-rail as "mark"); plan 06-06 converted fin-controls.tsx and fin-viewer.tsx using formatDim for positions/off-tail and formatMark for toe/off-rail. The shaper has now reversed that classification for fin placement numbers only; board dims keep the "dim" family.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: formatDim/formatMark themselves misbehave (e.g. formatMark printing cm)
  evidence: measure-display.test.ts green (236 tests across the three suites); probe shows formatMark(279.4mm) = "279 mm" and formatDim = "27.9 cm" — each formatter does what its family says. The wrong output is the wrong FAMILY being chosen, not a formatter bug.
  timestamp: 2026-09-05T22:30:00Z

- hypothesis: the DATA tab re-derives a row's family from its label at display time, so a relabel could be the culprit
  evidence: fin-data-panel.tsx reads row.family / grp.fullSpreadFamily (lines 68, 78); fins.ts carries the tag from the construction site through the Mm map (line 1249) — no label matching anywhere.
  timestamp: 2026-09-05T22:30:00Z

- hypothesis: the sliders' metric domain/step would also need changing (10 mm steps or cm-domain bounds)
  evidence: every placement slider calls measureSlider(..., stepMm = 1, system) (fin-controls.tsx 274-286); probe confirms metric views POS -38..38, OFF_TAIL_OVERRIDE 13..304, TOE 0..12, OFF_RAIL 26..50, all step 1. The quad override number box already takes whole mm (lines 661-672). Only labels change.
  timestamp: 2026-09-05T22:35:00Z

- hypothesis: the Summary order form's fin card is involved
  evidence: components/summary/order-form.tsx 597/605 format fin rows with formatInchesFraction directly and never read row.family — it is Phase 7 territory (UAT test 18 deferral) and is unaffected either way.
  timestamp: 2026-09-05T22:35:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-09-05T22:00:00Z
  checked: .planning/debug/knowledge-base.md and MemPalace
  found: No knowledge base exists yet (first debug session in this project); no MemPalace available. Phase 0 yields no known-pattern candidate.
  implication: Proceed with fresh investigation.

- timestamp: 2026-09-05T22:00:00Z
  checked: 06-UAT.md gaps G-06-12 / G-06-15 and 06-CONTEXT.md D-01 table
  found: D-01's cm column explicitly lists "Fin positions off the tail (front, rear, centre; the Forward/Aft position sliders; quad rear off-tail); fins tail width @ 30.5 cm" (line 75) and "Toe-aim distances (the toe-aim table)" (line 76); its mm column lists "Toe-in; Off-Rail" and "Fin base length (D-02)". D-05 (line 103) says every position/mark slider steps 1 mm in Metric. The UAT gap records the superseding user decision verbatim.
  implication: The code is expected to match D-01 exactly; the fix is a classification change at the tagging/formatting sites, not a math change.

- timestamp: 2026-09-05T22:10:00Z
  checked: lib/geometry/measure-display.ts (full read)
  found: formatDim (62-64) = metric `${formatCentimetres} cm` / imperial formatInchesFraction; formatMark (80-82) = metric `${formatWholeMm} mm` / imperial formatInchesFraction. Bare variants (71-73, 85-87) same shape. columnUnitSuffix (165-168): imperial "" / metric " (cm)" or " (mm)". measureSlider (202-227): metric bounds from metricSliderRange(rangeIn, stepMm), step = stepMm, toMm snaps roundToWholeMm; imperial reproduces today's call exactly. typedFieldBounds/commitTypedMeasure use family only for TYPED fields (Board Length "length" on fins) — no fin placement field is typed through them.
  implication: Flipping a family from dim to mark changes exactly one thing per site — the metric string (e.g. `27.9 cm` -> `279 mm`). Imperial output cannot change because both families share formatInchesFraction.

- timestamp: 2026-09-05T22:15:00Z
  checked: lib/geometry/fins.ts (grep + regions 128-165, 486-505, 895-982, 1150-1200, 1238-1256)
  found: `family: "dim"` at exactly three sites, all Off-Tail rows — line 905 (centre fin), 934 (front fins), 959 (rear fins). `"mark"` on Off-Rail (935), Toe-In (943, 972), Fin Base/Box Length (915, 944, 973), Off-Stringer/Off-Rail (963) and fullSpreadFamily (967). Doc comment on FinSummaryRow.family (137-142) states the dim rationale for off-tail. toeAimTableFor (1158-1194): formatValue uses formatDimBare for BOTH columns (tail widths) and cells (aim distances); rowLabel via formatDimBare (board length); identicalFromLabel via formatDim(72in) (board length); comment at 1171-1174 cites D-01. Mm boundary map (1246-1251) carries family unchanged.
  implication: Three tag edits in fins.ts flip every DATA row. The toe-aim table's row label, columns and identicalFromLabel are board dims and stay cm; the cell values are an open classification (see Resolution).

- timestamp: 2026-09-05T22:20:00Z
  checked: components/fins/fin-controls.tsx (full read)
  found: formatDim on placement numbers at 556 (centre Forward/Aft position label, resolved.centerOffTail), 594-597 (forward Forward/Aft position label — sideOffTail/twinOffTail/frontOffTail), 684 (quad Rear Off-Tail Position read-only value, resolved.quadRearOffTailBase), 707 (rear Forward/Aft position label, resolved.pairOffTail). formatDim on a BOARD dim at 385 (Tail Width @ station — must stay). formatMark already on toe-in (609, 734), off-rail (721), base length (177), quarter-inch rule text (291). Comment 270-273 mentions "the two dim-family labels below". measureSlider calls 274-286 all pass stepMm = 1. The quad override `<input type=number>` (659-680) takes measureSlider's metric mm domain (13..304, step 1) and seeds roundToWholeMm — so today the box takes mm while its label reads cm.
  implication: Four formatDim -> formatMark edits plus a comment; no bounds/step change. The decision makes the quad override box and its label agree (both mm).

- timestamp: 2026-09-05T22:22:00Z
  checked: components/fins/fin-viewer.tsx (full read)
  found: dimsForMark: toeDisplay formatMark (222), lateralValueDisplay formatMark (223), offTailDisplay formatDim (224) with comment 220-221 stating the D-01 rationale. Compact heading (563) `${formatLength(boardLength)} · ${formatDim(tailWidth12)} tail` — board dims, stay. Legend (598) formatMark(baseLength) — already mm. No test file covers fin-viewer strings. FinViewer's only consumer is fin-placement-editor.tsx (compact mode unused by the Summary, which draws its own card).
  implication: One edit (line 224) plus its comment flips every off-tail callout; summary line and legend need nothing.

- timestamp: 2026-09-05T22:24:00Z
  checked: components/fins/fin-data-panel.tsx, components/fins/toe-aim-table-modal.tsx (full reads)
  found: fin-data-panel: summary line (43-45) formatLength(boardLength) + formatDim(tailWidth12) + stationLabel — board dims, stay; rows (68) and full spread (78) branch on the model's family tags — no edit needed once fins.ts is re-tagged (the `=== "dim"` branch becomes unreachable for fin rows but harmless). toe-aim-table-modal: title (42-43) formatLength + formatDim(tailWidth12) — stay; headings (47) columnUnitSuffix("dim", system) -> " (cm)" — stays if aim cells stay cm, flips to "mark" if they move to mm; all numbers arrive pre-formatted from toeAimTableFor.
  implication: No required edits in either component under the recorded decision; toe-aim-table-modal line 47 is coupled to the open aim-cell question.

- timestamp: 2026-09-05T22:28:00Z
  checked: tests — lib/geometry/fins.test.ts (195-240, 300-340, 444-569), lib/geometry/measure-display.test.ts (full), lib/units-isolation.test.ts (ledger 167-297), components/design/slider-row.test.ts (fin lines)
  found: fins.test.ts describe "FinSummaryRow.family and FinSummaryGroup.fullSpreadFamily (D-01)" pins Off-Tail = "dim" at lines 454 (thruster, with `sawOffTail`/`sawMark` split), 479 (quad mckeeSB), 494 (quad basicOffRail); fullSpreadFamily tests 498-529 assert "mark" — unchanged. describe "toeAimTableFor is system-aware" (531-569) pins columns/front/rear via formatDimBare (551-553), rowLabel formatDimBare (555, 561), identicalFromLabel formatDim (556) — flips only if aim cells move to mm (then 552-553 -> formatMarkBare; 551/555/556/561 stay). Golden-parity blocks (60-230) compare formatInchesFraction of resolved values to the fixture and call toeAimTableFor with "imperial" — never read family; unchanged. measure-display.test.ts tests the formatters, not fin classification — unchanged. units-isolation ledger asserts converted:true + none of the banned imperial formatters; formatDim/formatMark are both allowed — unchanged. slider-row.test.ts counts raw sliders (Board Length + Tail Width) — unchanged. Baseline: the three suites pass (236 tests).
  implication: Exactly three expectations flip (fins.test.ts 454, 479, 494) plus their describe/it wording; everything pinning placement math stays green untouched (CLAUDE.md Rule 1).

- timestamp: 2026-09-05T22:38:00Z
  checked: throwaway probe (lib/geometry/zz-probe.test.ts, created and deleted in one command; git status clean apart from .planning/debug/)
  found: Default 6'0" x 13" squash thruster — frontOffTail `27.9 cm` (dim) vs `279 mm` (mark), imperial `11"` both; centerOffTail `8.4 cm` vs `84 mm`, imperial `3 5/16"` both; frontOffRail `30 mm`, forwardToe `10 mm` (already mark). Quad mckeeSB — rearOffTail / quadRearOffTailBase / pairOffTail `13.0 cm` vs `130 mm`, imperial `5 1/8"`. tailWidth12 `33.0 cm` (stays). Metric slider views: POS -38..38 step 1; OFF_TAIL_OVERRIDE 13..304 step 1; TOE 0..12 step 1; OFF_RAIL 26..50 step 1. Toe-aim metric: columns 27.3..45.7 (tail widths, cm), front cells 3.0..7.6, rear cells 0.7..3.2 (cm) — as whole mm the front row would read 30..76; rowLabel `182.9+`, identicalFrom `182.9 cm`. formatDimBare === formatMarkBare in Imperial.
  implication: Direct observation of the exact before/after strings the planner's tests must derive (via inchesToMm -> formatMark, never hand-typed).

- timestamp: 2026-09-05T22:40:00Z
  checked: planning documents encoding the old classification
  found: 06-CONTEXT.md D-01 table line 75 (cm column: "Fin positions off the tail (front, rear, centre; the Forward/Aft position sliders; quad rear off-tail)"), line 76 ("Toe-aim distances (the toe-aim table)" under cm), line 342 (Specific Ideas: "a fin `28.6 cm` off the tail with `3 mm` of toe-in"). 06-UI-SPEC.md lines 152 (overflow row cites "Forward/Aft position — 28.6 cm (off-rail unchanged)" as the longest label) and 328-330 (FINS section: "lateral fin-off-tail positions read cm-family"). 06-VERIFICATION.md lines 42, 48, 51 (harvested UAT test wording "off-tail rows read in centimetres", "positions and off-tail in centimetres"). 06-05-PLAN.md line 24 and 06-06-PLAN.md lines 25, 159, 164, 171, 185 (historical — record, don't rewrite). CLAUDE.md Rule 2 (lines 75-80) names Dims/Marks members without mentioning fin placement — neutral, but the natural home for the superseding rule. REQUIREMENTS SCRN-01/SCRN-03 and ROADMAP line 125 are neutral ("fin placement numbers ... read in the chosen system").
  implication: The planner records the superseding decision against D-01 (and the UI-SPEC FINS bullet) and may add fin placement to CLAUDE.md's Marks list.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: 06-CONTEXT.md D-01 classified "fin positions off the tail" (front/rear/centre off-tail, the Forward/Aft position sliders, the quad rear off-tail) as the cm "dim" family, and Phase 6 implemented that faithfully at nine sites — three `family: "dim"` tags on the Off-Tail rows in lib/geometry/fins.ts (905, 934, 959), four formatDim calls on resolved off-tail values in components/fins/fin-controls.tsx (556, 594, 684, 707), and one formatDim on the off-tail callout in components/fins/fin-viewer.tsx (224). The shaper has since decided every fin placement number is a "mark" (whole mm). No formatter, slider-domain, storage or math defect is involved.
fix: (diagnose-only — see Suggested Fix Direction in the returned diagnosis) flip those nine sites to "mark"/formatMark, update the three fins.test.ts expectations (454, 479, 494) and their wording, refresh the comments that cite D-01 at fins.ts 137-142 and 1171-1174, fin-controls.tsx 270-273, fin-viewer.tsx 220-221, and record the superseding decision against D-01 / UI-SPEC FINS. Open question for the shaper before planning: the toe-aim tables' CELL values (aim distances, 1.19-3 in) — keep cm (no change) or move to mm (toeAimTableFor 1175 splits into a cm formatter for columns/rowLabel and formatMarkBare for cells; toe-aim-table-modal.tsx 47 -> columnUnitSuffix("mark"); fins.test.ts 552-553 -> formatMarkBare).
verification: n/a (diagnose-only). Planner's acceptance: fins.test.ts family block green with "mark"; golden-parity and template.test.ts untouched and green; units-isolation ledger green; Imperial strings byte-identical (both families call formatInchesFraction).
files_changed: []
