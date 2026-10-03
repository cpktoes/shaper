# Phase 14: Realistic Surfboard Flow - Research

**Researched:** 2026-10-02
**Domain:** pure geometry (blank curves, tip taper), saved-board snapshots, ROCKER screen wiring, release ordering
**Confidence:** HIGH on every number (all measured this session, method stated); MEDIUM on the three things that need the founder or a browser (see Open Questions and the Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** **The taper is the steady taper** — the level planer cut exactly as it is inside the start point, and from the start to the tip one parabola that leaves the planer cut along the planer cut's own slope and lands on the tip setting. The research's formula (source todo, section 7): `T(d) = tip + (2·sec − m)·d + ((m − sec)/W)·d²`, with `sec = (P(W) − tip)/W`, `m = min(P′(W), 2·sec)` and never below 0, `d` the distance in from the tip, `W` the start, `P` the planer cut. It replaces Phase 12 D-05's S-shaped ease. The founder picked it from `pictures/tip-taper-three-shapes.png` over "Soft start" (a cubic that also matches the planer cut's bend at the start) and "Today's S-shape" from an automatic start. Measured on the 1,635-board stress set with Automatic starts: no board thinner anywhere than its tip setting, no hump except the twelve on the US Blanks 9'9"B (D-14), 89% of tips still starting at 12". Accepted consequence: ordinary tips come out fuller in their last 6" than today, by up to 1/8" (Shortboard preset nose 6" in: 1" today, 1 1/8" with the taper).
- **D-02:** **Each tip has its own start** — nose and tail each read Automatic or a distance set by hand, from 6" to the board's centre. On 249 of the 1,635 stress boards the two tips want different starts.
- **D-03:** **Automatic means 12" unless the board cannot run down steadily from there, then the first point further in that can** — the founder's answer of 2026-10-02, with the research's test for "can": the planer cut at the start is at least the tip setting and its slope there is no more than twice the average slope to the tip (`P(W) ≥ tip` and `P′(W) ≤ 2·sec`). Automatic never starts nearer the tip than 12". Measured: 2,912 of 3,270 tips stay at 12", 218 land at 12–18", 97 at 18–24", 43 at 24–36", none needs the centre; the furthest is 32 1/2".
- **D-04:** **The 12" fine-tune stays a nudge** — unchanged from Phase 11 D-11 and Phase 12 D-13/D-20: a signed tweak added on top of whatever the board reads at 12", taper included. Automatic takes no account of the tweak. A tweak can still put a dip or a bump at 12", as it can today; that stays the shaper's call. Rejected: redrawing the taper through the tweaked 12" thickness; switching the fine-tune off when the start is further in than 12".
- **D-05:** **A start set by hand that is too close to the tip is honoured and flagged** — the board is drawn exactly as set, thin spot or kink included, and a line on ROCKER says where the board is thinnest and that Automatic would cure it. The slider's range never shrinks to stop it. This is not a new fit failure on its own: the existing fit check and the 1/4" floor still judge the board as they do today (the spirit of Phase 12 D-16: the setting is honoured and the consequences are shown).
- **D-06:** **No account default for the start in this phase** — every new board and every preset starts on Automatic, and a saved board that stores no start reads as Automatic. Fit & Tip Defaults is untouched, so the phase needs no database change.
- **D-07:** **Where a start moves in past 12", that tip's 12" numbers belong to the taper** — the 12" thickness is no longer what the planer cut leaves (it rises on 358 of 3,270 stress tips, typically 1/16", at most 1/2"), and under Pin deck the 12" rocker number moves with it. The rocker numbers stay the board's own and the DATASHEET keeps the blank's beside them (Phase 12 D-06). Phase 12's "nothing at or inside a 12" station moves" no longer holds for those tips, by the founder's words of 2026-10-02: "we may have to adjust my earlier recommendation that the tip thinning is from the 12" mark only."
- **D-08:** **The tape-measure check comes after go-live, not before** — the curves ship on the catalogue evidence (67 of 68 distinct US Blanks rockers closer, Marko's own blanks agree, Arctic's printed litres agree). The founder measures a real Arctic blank's bottom every 6" when one is in the bay, on the one-page sheet `arctic-blank-tape-check-sheet.pdf`, and the result is checked against the new curve and recorded as a follow-up. It does not gate either push.
- **D-09:** **The control is called Thinning Starts** — one for the nose and one for the tail, shown only when a blank is picked (the same rule as Tip Style). The name is the one in the plan the founder approved on 2026-10-02.
- **D-10:** **Both controls sit at the end of THICKNESS with Tip Style** — the three things that say how the tips are thinned sit together (which surface, where the nose starts, where the tail starts), and every row above keeps its place.
- **D-11:** **Each is a slider with an Automatic button** — the founder chose this over the recommended Automatic / Set pair. As in the chart they used on 2026-10-02: the slider runs from 6" to the board's centre and is always there; on Automatic it shows the distance Automatic picked; dragging it sets the start by hand; the Automatic button puts it back.
- **D-12:** **Each tip's start is shown in three more places** — a faint mark on ROCKER's side profile where the thinning starts, a line on the DATASHEET beside the tip numbers, and on the printed order form with the tips and the planing figures.
- **D-13:** **Today's curve (PCHIP) runs inside the square-root rule, everywhere** — for a blank's bottom (the rise), its thickness and width (the fall), and a hand-set board's five rocker numbers and five thicknesses. The founder picked it from `pictures/curve-inside-the-rule.png` over Steffen's curve and a Hyman-filtered cubic. All three score the same against hidden stations (0.035–0.036" average miss); PCHIP is the one already proven in the app, and the square root is what removes the sharp look (the change of bend at an Arctic station falls from 24-to-1 to about 1.5-to-1). No new curve family is written in this phase.
- **D-14:** **The US Blanks 9'9"B is drawn as printed** — its thickest printed station is not its centre, so twelve stress boards on it read about 1/16" thicker there than at their centre. That is the blank's own shape and is accepted. The blank is added to the founder's blank corrections list to check against its catalogue page.
- **D-15:** **One plan approval, two go-lives** — both steps are planned in one pass and the founder approves once before any code is written. The curves go live first, as soon as they are proven (target Saturday Oct 3); the tips follow on their own go. Each push happens only after the founder has seen before-and-after pictures and said go.
- **D-16:** **The tips can take Tuesday** — the founder chose this over the recommended "curves alone". If the tips are not proven by Monday evening Oct 5 they get Tuesday Oct 6; the freeze stays Wednesday evening Oct 7. If they are still not proven by Tuesday evening, the showing runs on the new curves with today's 12" blend and the tips wait until after the 10th (Claude's reading of the answer, stated to the founder). This replaces the Monday cut line in the brief's requirement 9.
- **D-17:** **One rehearsal walk, after the last change** — Phase 13's real-device walk happens on the site exactly as the shapers will see it: Tuesday Oct 6 if the tips are live by Monday evening, Wednesday morning Oct 7 if they take Tuesday.
- **D-18:** **A read-only report on the real saved boards before each push** — the founder runs one command in their own terminal, as with earlier production steps. It only reads. For every saved board on the live site it reports how far the station numbers and litres move and whether any fit verdict changes, and it is read back to the founder with the before-and-after pictures.
- **D-19:** **Nothing is said on screen** — saved boards redraw quietly, as the founder chose on 2026-10-02. No notice, no marker, no "what's new".

### Claude's Discretion

- How Automatic finds its start (a scan, a solve, the step size), provided acceptance criterion 3 holds and the result does not flicker as a slider moves.
- How the per-tip start is stored on the board's blank, and whether the saved-board version moves from 5, provided: a board with no stored start reads as Automatic; nothing is written to a board by opening it; and a board saved after the tips step still opens if the site is rolled back one deployment.
- The wording of the too-close line (D-05), the look of the mark on the drawing, the DATASHEET line and where the start sits on the order form (D-12), and the new wording of THICKNESS's opening line, which today says the tips are thinned "in the last 12"". All of these go to the screen design step.
- Whether the start reads in centimetres or whole millimetres in Metric. It is a distance along the board, like a fin's distance off the tail, so marks (whole millimetres) is the likely answer under CLAUDE.md Rule 2; the screen design step settles it.
- The set of before-and-after pictures for each go (D-15), and the form of the saved-boards report (D-18). `scripts/check-saved-boards.ts` is the precedent.
- How the golden of today's numbers is generated and which commit it pins, provided it is the code live on the site before the curves step.

### Deferred Ideas (OUT OF SCOPE)

- **A Thinning Starts default in Fit & Tip Defaults** — after the Oct 10 showing (D-06). It needs new account columns and a production migration.
- **Steffen's curve inside the rule** — a touch smoother at the stations with the same accuracy (D-13). Worth revisiting only if a shaper remarks on the bend at a station.
- **The tape-measure result** — when the founder has measured a real Arctic blank (D-08), check it against the curve and record it; a real Marko blank would be a second check.

Reviewed todos not folded (out of scope): Custom rocker on a blank / Custom Blank; the blank catalogue dims the founder knows are wrong; live coordinates under the pointer; opening the blank's own catalog page; holding the ghost still; bottom contours; finished-board photo uploads; branding the order form.
</user_constraints>

<phase_requirements>
## Phase Requirements

There is no `.planning/REQUIREMENTS.md`; the requirements are 14-SPEC.md's numbered 1–9, cited here as R1–R9.

| ID | Description (from 14-SPEC.md) | Research Support |
|----|-------------|------------------|
| R1 | Curves that never hump and always flow: the rules that draw the curves change; thickness never rises toward a tip, the bottom never leaves the range of its neighbouring stations | Q3, Q4, Q5 (zero overshoot on 482 curves, 1,789,663 dense samples); Q16 (taper, 0 thin spots on the stress set) |
| R2 | The blank's bottom is drawn with the square-root rise | Q1, Q2, Q3, Q4, Q6 (0.112" to 0.035" reproduced) |
| R3 | The blank's thickness is drawn with the square-root fall; deck stays bottom plus thickness | Q2, Q6 (0.076" to 0.050"); deck stays derived (`board-profile.ts`, Q1) |
| R4 | Board follows its blank; a hand-set board uses the same five-point model | Q1 (hand-set readers), Q10, Q12; acceptance 8 bit-exact (Q3) |
| R5 | The blank's width joins (square-root fall) | Q6 (0.53" to 0.29"), Q11 (which checks read width) |
| R6 | Where the tip thinning starts is automatic and settable (Thinning Starts) | Q13 to Q19 |
| R7 | A steady taper into each tip, off whichever surface Tip Style names | Q13, Q14, Q16 |
| R8 | Saved boards redraw; nothing rewritten; printed stations never move | Q9, Q17 (parser measured), Q3 |
| R9 | Before the showing, both steps; two go-lives (D-15 to D-18 replace the Monday cut line) | Q8, Q9, Q20 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Read this session: `/Users/kontoes/Code/shaper/CLAUDE.md` (which imports `AGENTS.md`) and `.claude/CLAUDE.md`. There is no `.claude/skills/` directory. Directives that bind this phase:

- **Rule 1.** Every formula lives in `lib/geometry/`, pure (no React, browser API or database import), every exported function unit-tested, expected values from `__fixtures__/*-golden.json` generated by `scripts/`, never hand-transcribed.
- **Rule 2.** Storage is metric (`Mm`/`Degrees`/`Litres`); every conversion of a design value goes through `lib/geometry/units.ts` (no `25.4` or `10` elsewhere). Dims read in centimetres to one decimal, marks (rocker heights, foil thicknesses, fin placements, rail marks) in whole millimetres. The preference is display-only: switching systems rewrites nothing.
- **Database section.** Additive changes migrate production first; removals wait for the deploy. This phase needs no database change (D-06; `lib/db/schema.ts` line 71 `snapshot: jsonb("snapshot").notNull(),`).
- **Audience.** Users are shapers and surfers; explain changes in plain English. Commit messages and summaries too.
- **Switches.** Width picks the layout, pointer picks control size, height picks short-screen behaviour; never conflated. The new rows invent no variant.
- **Commands.** `npm test` (vitest; all geometry suites must stay green), `npm run lint`, `npm run build` (from the main checkout, not a worktree), `npm run test:e2e[:phone]`. Desktop baseline screenshots are macOS-rendered and local only.
- **AGENTS.md.** This is a newer Next.js than training data; read `node_modules/next/dist/docs/` before writing Next-specific code. This phase writes no Next-specific code (no route, no server action change beyond the snapshot schema), so none was needed here.
- **GSD workflow enforcement (`.claude/CLAUDE.md`).** File changes go through a GSD command. This research wrote only this file.

## Summary

Both steps are small in code and large in blast radius. The curves step is one new pure module (`lib/geometry/root-curve.ts`, about 70 lines) plus a switch inside `prepareBlank` and in the hand-set profile. It reproduces the todo's headline scores to the digit (rocker 0.112" to 0.035", thickness 0.076" to 0.050", width 0.532" to 0.292", closer on 67 of 68 / 81 of 90 / 68 of 68), keeps every printed station exact to the last bit once `sample()` returns the printed value at a knot (a naive square-then-root misses 1,423 of 4,946 station values, by at most 1.4e-13 mm), and has zero overshoot on all 482 curves with at least two stations. The old rule has to stay callable for three jobs; the cheapest safe way is a named second function (`prepareBlankPchip`) rather than a second positional argument, and `phase11-foil.ts` must re-prepare its blank on PCHIP itself so constraint 5 cannot be broken by whoever edits the switch (without that, four Phase 11 tests fail by 0.047 mm).

The tips step is a second pure module (`tip-taper.ts`) plus per-tip starts on `BoardBlank`. Measured on the stress set it reproduces CONTEXT exactly (1,635 boards; starts 2,912 / 218 / 97 / 43 / 0, furthest 32 1/2"; 249 boards with different starts; 82 thin-spot boards drop to 0; 12 hump boards, all on the 9'9"B; 0 newly poking; 0 under the floor; with every start forced to 12" all 16,350 station values equal the curves-only numbers exactly). It also surfaced six things CONTEXT and the UI-SPEC do not say, listed under Open Questions: 291 of the 1,635 stress boards are longer than the app's own 120" cap (including the UI-SPEC's reference board); Automatic can find no steady start outside the stress set's neighbourhood (0 of 17,136 realistic tips, but 10.7% of an extreme set); the tips step frees thin-centre boards that are refused today as "runs out"; saved Phase 11 boards keep their five numbers but the hidden fine-tune they store moves by up to 0.03"; the Metric start reads in cm in the UI-SPEC while the nearest sibling slider (Placement) reads whole mm; and the deployed parser tolerates the new field and a higher version, so no version bump and no database change are needed.

**Primary recommendation:** Pin first (a generated golden of origin/main commit `ed39f4a`), then ship the curves as commits that contain no tips code (new `root-curve.ts`, `prepareBlank` live = root, `prepareBlankPchip` frozen, `phase11-foil.ts` self-pinned), then the tips as later commits behind nothing but commit order; keep the snapshot version at 5 and add two optional, parse-tolerant fields to the board's blank.

## How every number here was produced

- The repo was not edited. A sandbox copy of the repo (14 MB, `node_modules` symlinked, no environment files, no `.git`) was made under `/private/tmp/claude-501/-Users-kontoes-Code-shaper/cc262c20-8a7f-4131-85dd-bdda1e6ce66a/scratchpad/research14/sandbox/` and the proposed implementation was written into it; "today" numbers come from the real repo's own modules, "new" numbers from the sandbox's.
- Measurement scripts are in `.../research14/m/` (`q3.ts`, `q45.ts`, `q4b.ts`, `q6.ts`, `stress.ts`, `presets.ts`, `handset.ts`, `flicker.ts`, `flicker2.ts`, `timing.ts`, `timing2.ts`, `fallback.ts`, `fallback2.ts`, `steep.ts`, `carry.ts`, `q17.ts`, `widthfit.ts`, `pinsize.ts`), run from the repo root as `npx tsx --tsconfig ./tsconfig.json <absolute path>`. Their outputs (`stress-today|curves|tips|tips12.json`, `presets-*.json`, `list-*.json`) sit beside them. Scratch is session-local; the code worth keeping is reproduced under Code Examples.
- The stress set is rebuilt exactly as the research built it (`shapes.ts` in the archive): every pickable blank (158), a board 2" shorter, centres 2 1/4 / 2 1/2 / 2 3/4 / 3", placements min / 0 / max of `placementRange`, default cut and tips (1/2" nose, 5/8" tail), kept if `floorCheck` passes with the default fit settings (2" extra length, 1/8" planer depth, 1" width margin, `DEFAULT_FIT_DEFAULTS`, `lib/fit-defaults-preference.ts:85-93`). It gave 1,635 boards.
- `npm test` baseline today: 93 files, 3,654 tests, 3,652 passed, 2 skipped, 19.1 s wall (blank-fit.test.ts alone 17.6 s of it). [VERIFIED: vitest JSON report this session]
- Timings are Node medians on a busy laptop and noisy (run-to-run 2 to 3x on the same code). They support "same order of magnitude", not fine ratios.
- No Playwright, no browser, no dev server, no database were used. Anything about pixels is marked.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Square-root curve, its slope and exact low point | `lib/geometry` (pure) | none | Rule 1; the calculators are the product |
| Which rule a blank is prepared with (today's vs new) | `lib/geometry/blank-fit.ts` | scripts, `phase11-foil.ts` | The one switch must sit where every consumer prepares a blank |
| Steady taper, Automatic start, flag and thinnest point | `lib/geometry` (new `tip-taper.ts`) | none | Pure maths; components compute nothing |
| Per-tip start storage and tolerant read | `lib/models/design-snapshot.ts` + `lib/geometry/blank.ts` types | none | The parser is the one validation boundary for a stored board |
| Words and number formatting for the start (label, hint, too-close line, printed line) | `lib/geometry/blank-reasons.ts`, `measure-display.ts`, `planing.ts` | components render strings | Rule 2 and the project's existing reason-line pattern |
| Set start, back to Automatic, one undo step each | `components/design/design-store.tsx` | `rocker-controls.tsx` | Every design change goes through a store mutator with a coalescing key |
| The mark, the DATASHEET block, the order-form line | `components/rocker/*`, `components/summary/order-form.tsx` | `rocker-view-frame.ts` constants | Read-only drawing of one side profile |
| Read-only report on saved boards | `scripts/check-saved-boards.ts` (extended) | database (one select) | The Phase 12 precedent |
| Database | none | none | D-06: the snapshot is a jsonb column; no schema change |

## Standard Stack

No new package. Everything is the existing stack.

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| TypeScript, strict | repo | all new code | stack |
| Vitest | 4.1.11 | unit and geometry tests, `lib/**/*.test.ts` and `components/**/*.test.ts` | stack [VERIFIED: vitest.config.ts include list; run this session] |
| Zod | ^4.4.3 | the snapshot boundary | already the parser; `.optional().catch(undefined)` tested this session |
| Playwright | repo | e2e and desktop baselines | stack; not run here |
| tsx via `npx --no-install` | repo | generators and the report script | the existing script convention (Phase 12 D-20) |

**Installation:** none. No dependency is needed or recommended.

## Package Legitimacy Audit

Not applicable: this phase installs no external package. The audit table is intentionally empty. (If a planner thinks one is needed, that is an Open Question for the founder, not a task.)

## Architecture Patterns

### System architecture (one board, one tick)

```
Catalogue CSV / saved board's blank copy (BlankRecord, by value)
        |
        v
prepareBlank(record)  ----------------------------  prepareBlankPchip(record)   [frozen: phase11-foil, D-18 "before",
   per attribute: prepareRootCurve(stations,              |                       the pin test]
   "rise" bottom | "fall" thickness, width)               |
   rocker levelled once (exact minimum)                   |
        |                                                 |
        v                                                 v
boardOnBlank(prepared, board{length, centre, tips, tweaks, skin, tipStyle, surface,
             noseStart?, tailStart?}, placement)
   P(d)  = blank thickness - drop              (planer cut, per tip, d from the tip)
   P'(d) = blank thickness slope (sign flipped at the nose)
   per tip: automaticStart(P, P', tip, L) (scan, 1/2" grid, first hit from 12")
            start used = hand-set (pulled into range) else Automatic
            T(d) = tip + (2sec-m)d + ((m-sec)/W)d^2  for d < W, else P(d)
   derivedThicknessAt = T   (+ 12" fine-tune hump on top, D-04)
   rockerAt / deckOffAt / bottomOffAt use  P - T  (Pin deck or Bottom, as today)
        |
        v
fitAt (verdict)  -->  listBlanks / judgeBlank          buildBoardProfile (hand-set: root rise + root fall)
        |                                                      |
        v                                                      v
BoardSideProfile: rockerAt, thicknessAt, deckAt, five stations, blank view (+ tips: start, automatic, range, flag)
        |
   ROCKER drawing + mark, DATASHEET, THICKNESS rows, RAILS (3 thicknesses), VOLUME litres, order form, preset and rack cards
```

### Recommended project structure (additions only)

```
lib/geometry/
├── root-curve.ts            # prepareRootCurve, RootKind, PreparedCurve (curves step)
├── root-curve.test.ts       # R1..R3, acceptance 1, 2, 8
├── tip-taper.ts             # steadyTaper, canRunDownSteadily, automaticStart, thinningStartRange, resolveTipStart, tipFlag (tips step)
├── tip-taper.test.ts        # acceptance 3, 4; no-flicker; flag
├── pchip.ts                 # + slopeAt on PreparedPchip (additive)
├── blank-fit.ts             # prepareBlank (live) + prepareBlankPchip (frozen); boardOnBlank calls tip-taper; runsOutCause per-tip
├── phase11-foil.ts          # re-prepares on PCHIP internally
└── __fixtures__/phase14-today-golden.json   # the pin (generated)
scripts/
├── extract-phase14-today-golden.ts          # the pin generator (guarded to a commit)
└── check-saved-boards.ts                    # extended: --curves-report / --tips-report (read-only)
```

### Pattern 1: one switch, named, impossible to hit by accident
`prepareBlank(record)` is the live rule and always will be; the frozen rule is a different function name. Do not add a second positional parameter: two call sites pass `prepareBlank` straight to `Array.map` (`lib/blanks/preset-blanks.test.ts:27`, `scripts/generate-preset-blanks.ts:58`), which would hand it the array index as the rule. `tsc` catches both (measured: "Types of parameters 'rule' and 'index' are incompatible"), but a named function removes the trap.

### Pattern 2: knots return exactly
`sample(x)` binary-searches once; if `x === xs[k]` it returns `ys[k]`. That is what makes "exact at every printed station" true to the bit and keeps `pchipMinimum` exact (it reads only `xs`, `ys`, `sample`).

### Pattern 3: the start is a field of the blank, absent means Automatic
Same family as `deckSkin` and `tipStyle`: stored by value on `BoardBlank`, clamped on read like Placement, never written back.

### Anti-patterns to avoid
- **Re-splining a board in a blank from its five stations.** The todo (section 6, point 5) and R4 say a board keeps following its blank; `buildBlankProfile` already reads `boardOnBlank` densely.
- **A third deck curve.** The deck stays `rockerAt + thicknessAt` (R10, `board-profile.ts:123,196`).
- **Putting `process.env` or any flag in a hot path.** (A sandbox-only toggle was used here and removed from the numbers that matter; the app needs no flag, see Q20.)
- **Computing the taper in a component.** The profile exposes the start, flag, thinnest point; the component renders.

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| A shape-preserving curve | a new spline family | `preparePchip` inside the root rule (D-13) | already proven; D-13 forbids a new family |
| The curve's exact low point | a dense search | `pchipMinimum` on the root curve | works unchanged (162 of 162 exact) |
| Slope of the blank at the start | finite differences in the app | `slopeAt` (analytic, tested vs finite differences to 1.5e-8) | one definition, no step-size choice |
| Unit conversion of the start | `/ 25.4`, `/ 10` | `formatDim`/`formatDimBare` through `blank-reasons.ts` wrappers, `measureSlider`, `metricSliderRange` | Rule 2 |
| The undo step | a custom history entry | `noteEdit(key)` + the existing `recordEdit` coalescing (500 ms, `COALESCE_WINDOW_MS`) | design-history.ts is tested |
| The saved-board read | a second validator | `boardBlankSchema` with two tolerant optional fields | the one parse boundary |
| A report on saved boards | a new script skeleton | extend `scripts/check-saved-boards.ts` | env loading, one select, redacted errors already right |

**Key insight:** every piece of this phase is a re-ordering of arithmetic the app already has, so the risk is not "is the maths right" (it reproduces to the digit) but "does anything still read the old rule", "do the six board-input sites agree", and "can the founder ship step one alone".

## Answers by question number

### Q1. Every reader of a blank curve

Found by grep over `lib/ components/ app/ scripts/ e2e/` plus reading each hit. [VERIFIED: grep this session; files opened with Read where quoted]

**`preparePchip` call sites**

| Where | What it builds | Class |
|-------|----------------|-------|
| `lib/geometry/blank-fit.ts:120` (`attributeCurve`, used at `:140,146,147`) | the blank's bottom, thickness, width | (a) root: bottom `"rise"`, thickness and width `"fall"` |
| `lib/geometry/blank-fit.ts:353,358` (`tailHump`, `noseHump`) | the 12" fine-tune hump, three knots `(0,0)`, `(W, offset)`, `(L/2, 0)` | (c) unrelated, stays PCHIP (D-04: the tweak stays a nudge at the 12" station) |
| `lib/geometry/board-profile.ts:112` | hand-set rocker, `levelCurve(preparePchip(fallbackRockerPoints(...)), 0, length)` | (a) root `"rise"` |
| `lib/geometry/board-profile.ts:113` | hand-set thickness through `foilStationPoints` | (a) root `"fall"` |
| `lib/geometry/foil.ts:107` (`sampleFoil`) | default thickness for `computeCrossSectionVolume` when `thicknessAt` is absent (`volume.ts:538`) | (a) root `"fall"`, so it keeps agreeing with the hand-set profile. Its only callers that omit `thicknessAt` are tests, including the Arctic 7'3" SBF datasheet validation (`volume.test.ts:478-571`, tolerance 10%) |
| `lib/geometry/rocker.ts:62` | `import type { SplinePoint }` only | (c) |
| tests: `blank-fit.test.ts:129,154`, `board-profile.test.ts:86`, `rocker.test.ts:305,335`, `volume.test.ts:510,585` | builds expected curves | see Q7: two are now wrong, four become vacuous |

**`pchipMinimum`:** `blank-fit.ts:92` (`levelCurve`) only, plus `rocker.test.ts:338` and `pchip.test.ts`. It reads `curve.xs`, `curve.ys`, `curve.sample` and nothing else, so it works on a root curve unchanged. [VERIFIED: pchip.ts:160-169; measured 162/162 exact]

**Readers of a prepared curve's `sample / xs / ys / slopes`**
- `blank-fit.ts:311` (`levelCurve(prepared.rocker.curve, u(0), u(L))`), `:315` (`prepared.thickness.sample`), `:319` (`prepared.width.sample`), `:382` (`prepared.rocker.curve.xs` for the Bottom-tweak re-level), `:397` (`prepared.rocker.minimum`), `:399` (`prepared.rocker.sample`).
- `phase11-foil.ts:61` (`prepared.thickness.sample(u)`).
- `.slopes` is read by nobody outside `pchip.ts` and its tests; no derivative exists anywhere in `lib/` or `components/` today (grep for `slopeAt|derivative|tangentAt`: only `pchip.ts` and a prose mention in `volume.test.ts`).
- Tests: `blank-fit.test.ts:178,179,205,442,446,453-456`, `board-profile.test.ts:232`.
- No component, page, script or e2e reads a prepared curve directly. `components/rocker/use-blank-list.ts:71` and `components/design/design-store.tsx:765` only call `prepareBlank` and hand the result on.

**Everyone who prepares a blank** (all go to the live rule, except the three in (b)): `design-store.tsx:765`, `use-blank-list.ts:71`, `design.ts:176` (`summarizeDesign`, so rack and preset cards), `design-snapshot.ts:402`, `scripts/check-saved-boards.ts:149`, `scripts/generate-preset-blanks.ts:58`, `scripts/extract-phase11-foil-golden.ts:226`, `lib/blanks/preset-blanks.test.ts:27,90,156`.

**(b) must stay on today's PCHIP.** `lib/geometry/phase11-foil.ts` is the only file. It does not call `preparePchip`; it reads `prepared.thickness.sample` (`:61`) and calls the live `boardOnBlank` (`:93`). So "anything it shares with the live path" means `prepareBlank`'s curves and `boardOnBlank`. Its callers: `design-snapshot.ts:80,401` (`carryPhase11Blank`), `scripts/check-saved-boards.ts:83,162,164` (`phase11TwelveInch`), `scripts/extract-phase11-foil-golden.ts` (executes tag v1.3's own `boardOnBlank`, byte-guarded), tests.

**Where the one switch belongs.** Inside `prepareBlank` in `blank-fit.ts` (default = root), with the frozen rule as a second exported function, and `phase11-foil.ts` calling the frozen one itself: `phase11TwelveInch` re-prepares from `prepared.record` (a private copy the prepared blank already carries, `blank-fit.ts:99`) so it never reads whatever the caller prepared. Measured effect of that single edit in the sandbox: with it, `phase11-foil.test.ts` and the two Phase 11 tests in `design-snapshot.test.ts` pass **unmodified**; without it all four fail (preset:shortboard tail 12": 44.476 vs the recorded 44.429 mm).

`carryPhase11Blank` is the one place both rules meet on purpose: the Phase 11 number for each 12" station is read on PCHIP (`phase11TwelveInch`), the "what the new cut gives there" number is read from the **live** `boardOnBlank`, and the stored fine-tune is the difference. Then the board shows exactly what Phase 11 showed, on whatever rule is live. See Q23-A for the consequence (the hidden offset moves).

### Q2. The module shape

- **New `lib/geometry/root-curve.ts`:** `prepareRootCurve(points, kind: "rise" | "fall"): PreparedCurve`; types `RootKind`, `PreparedCurve`. About 70 lines (see Code Examples).
- **Curve interface.** Today's `PreparedPchip` is `{ xs, ys, slopes, sample }` (`pchip.ts:85-90`). Add one member, `slopeAt(x)`, to `PreparedPchip` itself (so `preparePchip` returns it too) and call the union `PreparedCurve`. `levelCurve`, `LevelledCurve.curve`, `PreparedBlank.thickness/width`, `boardOnBlank`, `fitAt`, `buildBoardProfile`, `buildFallbackProfile` then need only a type rename. (If `slopeAt` is not added to `preparePchip`, `blank-fit.test.ts:154` — `levelCurve(preparePchip(knots), ...)` — stops type-checking; the sandbox hit exactly that.)
- **Derivative.** Needed today: nowhere. Needed by the tips step: yes, `P′(W)` for D-01's `m` and D-03's test. For a root curve with `g` the pchip through the signed square roots: `f = base + g²`, `f′ = 2·g·g′` for the rise; `f = base − g²`, `f′ = −2·g·g′` for the fall; `g′` is the Hermite derivative of `g`. `slopeAt` agrees with a central finite difference to 1.5e-8 mm/mm on 96,400 samples, and one-sided slopes at knots differ by at most 6e-6 (finite-difference noise): the curve is C1. [VERIFIED: `m/slope.ts`]
- **Hand-set board.** `buildFallbackProfile` switches both curves: rocker through `fallbackRockerPoints` as a `"rise"` (all four lifts are at least the centre's 0 because `ROCKER_LIFT_RANGE_IN = { min: 0, max: 9, step: 0.0625 }`, `rocker.ts:128`), thickness through `foilStationPoints` as a `"fall"` anchored on whichever of the five is thickest (normally the centre, not required).
- **Exposure to the tips step:** `thickness.slopeAt(u)` where `u(s) = s + (Lb − L)/2 + placement` has unit slope in `s`, so `dP/ds = f′(u)`; at the nose `dP/dd = −f′`. Off the blank (`!onFoam`) the blank reads 0 and the slope reads 0.

### Q3. Exact at every station

Measured over all 162 catalogue blanks, three curves each (482 curves with at least two stations; 4,946 printed station values) and the default hand-set board. [VERIFIED: `m/q3.ts`]

| Variant | Station values that fail `sample(x_k) === y_k` |
|---------|------------------------------------------------|
| Naive `anchor ± g.sample(x)**2` (what `prepareRoot` in the archive did: `lib.ts` line 20, no snap) | **1,423 of 4,946** (rocker 780 of 1,656, thickness 299 of 1,623, width 344 of 1,667); 440 of 483 curves have at least one; worst error 1.36e-13 mm |
| Archive version after `levelCurve` (`sample − minimum`, 158 pickable blanks) | 763 station values not equal to `y − min` |
| Recommended: return `ys[k]` when `x === xs[k]` | **0** |
| Default hand-set board, naive | rocker 2 of 5, thickness 2 of 5 |
| Default hand-set board, recommended | 0 of 5, 0 of 5 |

So the implementation must snap at knots, with one binary search shared with the interpolation. The archive's `prepareRoot` returned `{ xs, ys, slopes: [], sample }`: no snap, and an empty `slopes`. It was fit for scoring (errors of 1e-13 mm), not for "exact to the last bit" (acceptance 1 and 8) or for slopes.

Acceptance 1 says "all 162 catalogue blanks", but only 158 are pickable and `prepareBlank` throws for the other four ("has no thickness at its centre station", `blank-fit.ts:146`; observed on Marko Foam 9'0" MK-SUP-STD). So the 162-blank test must run at the curve level (build `prepareRootCurve` from each record's stations, as `blank-fit.test.ts:120-130` already does with `CATALOG`), and the 158-blank test through `prepareBlank`.

### Q4. The low point

- The root curve is exactly 0 at the lowest station, so `f = base` there. `pchipMinimum(curve, 0, Lb)` returns it because the lowest station is a knot strictly inside, or an end (`pchip.ts:160-169`). Measured: it equals the lowest printed rocker value on **162 of 162** blanks, and the densely sampled lowest point (every 0.25 mm plus every knot) equals it exactly on 162 of 162 (a plain 0.25 mm grid alone misses the knot by up to 1.3e-6 mm on 141 blanks, which is sampling, not the curve; sampled values never go below the printed minimum). [VERIFIED: `m/q4b.ts`, `m/q45.ts`]
- **Ties.** 6 blanks tie the lowest station: US Blanks 8'9"Y, 8'9"YX, 8'8" EPS, 8'8"X EPS and 9'6" EPS (T48, C and N48 equal) and 10'4"A SUP EPS (C and N48). The sign rule uses the first lowest index; the others get `sqrt(0) = 0`, pchip sees flat neighbours (slopes 0), so the curve is exactly the lowest value across the tie. The 162-of-162 result includes them. [VERIFIED: `m/q45.ts`]
- **Lowest station at an end of the blank:** none of the 162. The sign rule still covers it (first index 0: every sign positive; last index: every sign negative); a synthetic test should cover it since the catalogue cannot.
- Existing proof of intent: `blank-fit.test.ts:176-179` already asserts `prepared.rocker.minimum` equals the lowest printed value (passes unchanged on the root rule).

### Q5. No overshoot

Dense sampling, 400 points per interval, on every interval of every curve (482 curves, 1,789,663 samples): the new curve leaves the range of its two neighbouring stations **0 times** for rocker, thickness and width; today's PCHIP also 0. Why it holds: `g` is pchip (never leaves its two neighbours); both neighbours of any interval have the same sign (or one is 0 at the anchor knot), so `g²` is monotone in `|g|` and `f` stays between the neighbouring `y` values. [VERIFIED: `m/q45.ts`]

**US Blanks 9'9"B (D-14).** Its thickest printed thickness is at N48 (3.752"), not C (3.689"): 0.063" higher. The fall is anchored on the thickest station (`indexOf(max)`), stations before it take the negative sign, and the curve between C and N48 rises monotonically to N48 and never above it. A board centred on the blank reads the printed 3.689" under its centre and is thicker a few inches toward the nose, which is where the twelve hump boards come from (Q16: max 0.066"). The same blank's width is widest at N48 too (0.126" over C). Also: **US Blanks 9'9"A** has its thickest at N48 (0.004" over C, 0.1 mm), too small to make a hump; and 16 blanks print their widest station away from C (0.06" to 0.25"). So the acceptance-3 exception list should be computed from the data ("blanks whose thickest printed station is not `C`": two), not typed as "the 9'9"B".

### Q6. Headline figures, with app-shaped code

Method: US Blanks blanks that print T6 and N6 (90), cut to {T0, T12, C, N12, N0}, redrawn by each rule, scored at every other printed station; identical station-value vectors merged. [VERIFIED: `m/q6.ts`]

| Curve | Distinct curves / hidden stations | Today's PCHIP mean miss (worst, bias) | Square-root mean miss (worst, bias) | Closer on | Todo's figure |
|-------|----------------------------------|----------------------------------------|--------------------------------------|-----------|---------------|
| bottom | 68 / 536 | 0.112" (0.645", +0.094") | 0.035" (0.237", +0.008") | 67 of 68 | 0.112 to 0.035, worst 0.645 to 0.237 |
| thickness | 90 / 712 | 0.076" (0.428", −0.042") | 0.050" (0.286", 0.000") | 81 of 90 | 0.076 to 0.050, 0.428 to 0.286 |
| width | 68 / 540 | 0.532" (5.28", −0.511") | 0.292" (3.83", −0.148") | 68 of 68 | 0.530 to 0.290; todo says 69 curves / 546 stations (one curve and six stations different from today's catalogue merge; not chased) |

Which become named geometry tests (constraint 2): a "hidden stations" test per curve asserting the root rule's mean miss is below PCHIP's and below a bound, plus "closer on at least N of M". The data must be pinned by value (the 90 blanks' rows) in a generated fixture, so a later catalogue correction cannot flip a recorded count. The expected numbers (today's PCHIP scores) come from the pin generator; the root scores are computed live in the test.

### Q7. What recorded numbers move

Measured by running the full vitest suite in the sandbox with the proposed change (3,654 tests). [VERIFIED: sandbox vitest JSON]

**Fixture provenance (what moves and why not)**

| Fixture | Generated from | Moves? |
|---------|----------------|--------|
| `phase11-foil-golden.json` (32 KB) | tag v1.3's own `boardOnBlank`, `scripts/extract-phase11-foil-golden.ts`, byte-guarded to the tag | No: it records PCHIP numbers and stays valid for the frozen rule |
| `phase11-foil-golden-blanks.json` (90 KB) + `phase11-golden-blank.ts` | `scripts/extract-phase11-golden-blanks.ts`: blank rows by value | No |
| `prototype-outline/rails/fins/fins-imported/volume-golden.json` | the prototype in `reference/` (`npm run golden`) | No: they execute the prototype's own functions, not the app's blank curves |
| `blank-datasheet-golden.json` | hand-entered with provenance (the one sanctioned exception, Rule 1) | No (used by `volume.test.ts:478-571` at 10% tolerance; the comment at `:552` quoting "78.85 L" will go stale) |
| `lib/blanks/preset-blanks.generated.json` | `scripts/generate-preset-blanks.ts`; all four picks are `"provisional": false` (read this session), so the generator's use of `prepareBlank` (only to compute a provisional pick) changes nothing | No: nothing to regenerate at either go-live |
| A preset card's litres | not recorded anywhere: computed live by `presetSummary` (`summary-line.ts:78-84`) through `summarizeDesign` (`design.ts:167-207`) | Moves on screen; pins nothing today (UI-SPEC "Already done" confirmed by grep: no test types 29.4, 35.0, 50.3, 75.3 or their long forms) |

**Curves step: tests that fail**

| Test | What it compares | Typed or generated | Action |
|------|-----------------|--------------------|--------|
| `blank-fit.test.ts` "the board's bottom sits exactly the centre gap above the blank's bottom at every station, so the rocker is the blank's own" (second half, `:324-349`) | live rocker vs `golden.cases[].rockerMm` | generated (v1.3 PCHIP) | prepare that block's blank with `prepareBlankPchip` (the golden is PCHIP's) |
| `board-profile.test.ts:85-91` "draws the foil through the five stored thicknesses on the one pchip sampler" (69 mismatches) | `preparePchip` built inside the test | **typed in the test** (expected built from the old module) | retarget to `prepareRootCurve(..., "fall")` |
| `volume.test.ts:573-590` "sampleFoil is pchip through the five foil stations" (574 mismatches) | `samplePchip` built inside the test | **typed in the test** | retarget to the root rule; keep the exact-at-stations assertion |
| `components/rails/rail-reference-paths.test.ts` | a `public/` file | sandbox artifact only (I did not copy `public/`); passes in the repo | none |

Without the `phase11-foil.ts` self-pin, four more fail (`phase11-foil.test.ts` ×2, `design-snapshot.test.ts` ×2, by 0.047 mm at preset:shortboard tail 12"); that is what constraint 5 protects.

**Tests that stay green but go vacuous** (they build a PCHIP themselves, so they stop testing the live curve): `blank-fit.test.ts:129` (neighbouring-station range on every catalogue blank) and `:154` (levelling puts the minimum at 0), `rocker.test.ts:305` and `:335` (fallback rocker exact at stations, minimum exactly 0). These are the existing homes of acceptance 1 and 2 and must be retargeted to `prepareBlank(record)` / `prepareRootCurve`.

**Tips step: additional failures** (sandbox with Automatic starts)

| Test | Why |
|------|-----|
| `blank-fit.test.ts` "each 12" station's thickness is the blank's thickness there less the skin and the gap" (fails on US Blanks 8'2"A pinDeck: 25.54 vs 24.76 mm) | D-07: where the start is past 12" that tip's 12" belongs to the taper |
| `blank-fit.test.ts:1465` "a 1" center on the default board runs out of foam in at least one blank...", `:1511` "(a) a thin centre in a thick blank...", `:1547` "(b′) a fine-tune is not blamed...", `:1566` "(c) the board runs past the end of the blank: cause offBlank..." | With Automatic there are no runs-out verdicts left for the 1" centre default board (27 today, 22 after curves, 0 after tips; Q11, Q23-E). They need a board that still runs out: a hand-set start too close |
| With starts forced to 12": "changing Tip Style or a tip thickness moves no number at or inside the 12" stations" and "the tip thinning joins each 12" station with no kink" | They pass under Automatic only because their boards happen to start at 12"; they assert S-blend properties |

Count: 3 real failures at the curves step (7 without the Phase 11 pin), 8 at the tips step. All other tests, including every component test and every golden-based geometry suite, pass unchanged.

**Browser tests (not run; reasoned from the code and the measurements)**
- `e2e/desktop-baseline.spec.ts-snapshots/` holds five macOS pictures, all of the default board with no blank (`desktop-baseline.spec.ts:91-132`). At the curves step ROCKER changes (the hand-set curve moves up to 0.145" rocker and 0.092" thickness between stations; five numbers bit-exact) and VOLUME changes (30.063 to 30.509 L, shown to two decimals). RAILS reads only the five thicknesses (unchanged), FINS and TEMPLATE read the outline: expected identical [ASSUMED: a pixel diff was not run]. At the tips step none changes: the default board has no blank, and the default-board blank list shows 0 changed verdicts or reason lines between curves-only and tips (`m/list-*.json`).
- Specs that assert words or numbers this phase moves: `rocker-cut.spec.ts:279-283` (the THICKNESS intro, verbatim: tips step), `rocker-cut.spec.ts:254-259` ("nothing at the 12" stations moves"), `rocker-blanks.spec.ts:229-236` (`From blank `). The last two **keep holding** at the tips step: all 140 blanks the default board fits start both tips at 12" (`m/firstfit.ts`), and `pickFirstFittingBlank` takes US Blanks 6'2"A (12.0", 12.0"). No e2e spec asserts a litres value or a preset card's figure (grep). New specs per UI-SPEC §13 (`summary-planing.spec.ts`, `touch-sizing.spec.ts`, `rocker-blanks.spec.ts`).

### Q8. Pinning today's numbers first

**How Phase 12 pinned v1.3.** `scripts/extract-phase11-foil-golden.ts` builds 39 cases (counted in the fixture; presets on their generated picks, a board shaped like the one version-4 board in the development database, every 4th pickable blank 2" shorter with centres, placements and tweaks cycled, two guard cases), EXECUTES v1.3's own `boardOnBlank`, and writes five thickness, five rocker and the two un-tweaked 12" thicknesses per case to `lib/geometry/__fixtures__/phase11-foil-golden.json`. Before computing anything it compares `lib/geometry/blank-fit.ts` and `pchip.ts` byte for byte with `git show v1.3:<path>` and refuses to run otherwise; after Phase 12 changed the files it was re-run from a worktree at the tag with `--out`. The blanks the cases name are pinned by value in `phase11-foil-golden-blanks.json` (`extract-phase11-golden-blanks.ts`) so a later catalogue correction cannot disturb them. `phase11-foil.ts` keeps the maths alive; its tests read the golden. [VERIFIED: `scripts/extract-phase11-foil-golden.ts:1-272`]

**Which commit the Phase 14 pin must come from.** Not tag v1.4. v1.4 is `1b54633…` (2026-09-27); `blank-fit.ts`, `blank.ts`, `foil.ts`, `presets.ts`, `lib/blanks/preset-blanks.ts` and `preset-blanks.generated.json` all changed since (`git diff --stat v1.4 HEAD`). The code on the site is `origin/main` = `ed39f4a7d47e8db81481b93c3bd7fe0c0e9e2220`, and `git diff --stat origin/main HEAD -- lib components app scripts db e2e` is empty (HEAD `b285424` differs only in `.planning/`). [VERIFIED: git, this session] That origin/main is what Vercel deployed is [ASSUMED]: it cannot be checked without the network; ask the founder.

**Proposed pin.** Generator `scripts/extract-phase14-today-golden.ts`, fixture `lib/geometry/__fixtures__/phase14-today-golden.json`, run before any rule changes, guarded the same way but against a recorded SHA (`git show ed39f4a…:<path>` for `blank-fit.ts`, `pchip.ts`, `board-profile.ts`, `foil.ts`, `rocker.ts`, `blank.ts`). Contents:

1. Today's blank curves for every pickable blank at every printed station and, per interval, a quarter, a half and a three-quarter sample, for bottom (levelled), thickness and width (about 15,000 values).
2. The four presets and the default hand-set board: five thickness, five rocker, litres (`summarizeDesign`), and a 1/4" sweep of rocker and thickness (1" for the hand-set board).
3. A slice of the stress set (every 5th board, 327 boards, plus every board on the 9'9"A/B): five thickness, five rocker, `fitAt` verdict and worst.
4. The catalogue rows the slice and the curves use, by value (the Phase 12 pattern), so a later catalogue correction cannot move the pin.

Size, measured by a dry generation with today's code (`m/pinsize.ts`): curves with three samples per interval 248 KB, 327 stress boards 85 KB, four presets 52 KB, hand-set 3 KB, **388 KB at full precision**. A smaller shape that still serves every use: one mid-interval sample per curve (about 83 KB), presets swept every 1/2" (about 26 KB), blanks pinned for every 4th pickable blank only (Phase 12's own sweep rule, about 100 KB): **about 220 to 260 KB** [estimate from the measured parts]. For comparison the existing fixtures are 32, 90, 185, 194, 347 KB. A second generated file records the **curves-step** figures for the presets at the first go-live (`preset-figures-golden.json`, re-recorded from the app at each go; the planner may fold it into the same generator with a `--step` argument).

Use of the pin: (a) a test that the frozen rule (`prepareBlankPchip` + the unchanged blend) reproduces it bit for bit, so "today's rules stay callable" is proven, not claimed; (b) the "what moved" bounds for the presets (≤ 0.015") and the hand-set board (five numbers equal); (c) the before side of the pictures.

### Q9. Keeping today's rules callable, and the saved-boards report

Three needs: constraint 5, D-18's "before", and the pictures.

| Option | Cost | Verdict |
|--------|------|---------|
| a second positional parameter on `prepareBlank` | 1 line, but `.map(prepareBlank)` at two sites passes the index (tsc flags both; measured) | no |
| a frozen module like `phase11-foil.ts` | duplicates `attributeCurve`/`prepareBlank` (about 60 lines) that must be kept in step with every future blank change | no |
| the pinned golden only | cannot compute "before" for an arbitrary saved board | no |
| **a named function over one shared internal** | `prepareBlankPchip(record)` is 3 lines over `prepareBlankWith(record, rule)`; the pin test proves it never drifts | **yes** |

For the hand-set path add an optional `curveRule` (default root) to `buildBoardProfile`'s input, used only when `blank` is null. For the tips step the old S-blend needs the same treatment for D-18's "before" at the tips go: `tipRule?: "blend" | "steady"` on `BoardOnBlankInput` (default steady), the blend branch being today's 15 lines; delete it after the showing. The alternative is running the report twice from two commits, which breaks D-18's "one command".

**How `scripts/check-saved-boards.ts` runs** [VERIFIED: read in full]. It reads the env file named by `CHECK_ENV_FILE` (default the local one; for production the founder pulls the production env to a temporary file with `npx vercel env pull` inside a `bash -c 'trap … EXIT; …'`, exactly as the header documents), first deleting `DATABASE_URL`/`DATABASE_URL_UNPOOLED` from the shell because `process.loadEnvFile` never overwrites, then `await import("../lib/db/client")` (Neon HTTP driver, `lib/db/client.ts:10-12`) only after the env is loaded. It runs **one** statement, `db.select({ id: models.id, snapshot: models.snapshot }).from(models)`, and nothing else (no insert, update, delete, no transaction). It prints three fixed lines (counts by version, Phase 11 boards with five numbers kept, carried boards that no longer fit where they sit), optional `--thin-tips`, only row ids of failing boards, never a snapshot, a board name, a user id or the connection string; a connection failure prints one fixed sentence (error name and code; `--verbose` adds the driver's message). Exit code 1 when a board does not open or a Phase 11 board's five numbers moved.

**Extension for D-18** (same skeleton, same one select, same redaction): after the three lines, `--curves-report` / `--tips-report` computes for every board with a blank, from the stored snapshot, **before** (frozen rule) and **after** (live rule): the five thickness and five rocker numbers (max move in inches, how many boards move more than 1/16" and more than 1/32"), litres through `summarizeDesign` (median and max percent, count over 1%), and the fit verdict at the board's own placement through `fitAt` (`fits → refuses`, `refuses → fits`, with counts only). Hand-set boards (no blank) get the same with the hand-set curve rule. Counts and maxima only; nothing identifying. For the tips report also the number of boards with a start past 12" and the max 12" thickness rise. Exit code stays 0 for "moved" (that is the point) and 1 only if a board fails to open or a Phase 11 board's five numbers move.

### Q10. The presets

Recorded how: `scripts/generate-preset-blanks.ts` writes only picks and catalogue rows (all four captured, none provisional), and `presets.test.ts` records no figures at all: its checks are properties read off `presetProfile(preset)` (e.g. tips equal their settings, 12" between tip and centre). So there is nothing to regenerate at either go-live except a **new** generated record of the figures (Q8). Litres come from `presetSummary` live (`components/setup/preset-card.tsx:44`). [VERIFIED: read]

Measured with `summarizeDesign` on the real preset fields, today vs sandbox (`m/presets.ts`):

| Preset (blank) | Litres today | after curves | after tips | Cards (1 dp) today / curves / tips |
|---|---|---|---|---|
| Shortboard (US Blanks 6'3"RP) | 29.410 | 29.478 | 29.562 | 29.4 / 29.5 / 29.6 |
| Fish (5'10"RP) | 35.047 | 35.093 | 35.313 | 35.0 / 35.1 / 35.3 |
| Mid-length (7'4"SP) | 50.277 | 50.286 | 50.401 | 50.3 / 50.3 / 50.4 |
| Longboard (9'3"Y) | 75.300 | 75.309 | 75.311 | 75.3 / 75.3 / 75.3 |

These equal the research record and the UI-SPEC table exactly. Station numbers (five thickness and five rocker): the largest move at the curves step is 0.0060" (Shortboard nose-tip rocker), 0.0145" (Fish nose-tip rocker), **0.0149" (Mid-length nose-tip rocker, 0.01487")**, 0.0093" (Longboard tail-tip rocker); **zero** at the tips step (all eight starts are 12"). Acceptance 5's "within 0.015"" holds with 0.00013" to spare on the Mid-length; a planner must not tighten the bound or round a measured value into it, and a catalogue correction to the 7'4"SP would need the bound re-checked. CONTEXT's "≤ 0.015"" is therefore true but only just.

### Q11. The fit verdicts

Only `fitAt` reads the blank's width: `blank-fit.ts:491` `if (half > 0) consider("wide", s, 2 * half + rules.widthMargin - onBlank.blankWidthAt(s))`. The DATASHEET's blank-width row reads it through `blankAtStations` (`board-profile.ts:181-185`). Nothing else.

What changes, measured (`m/widthfit.ts`; my reconstruction of "near-limit": board 2" shorter, centred, default outline, widest point set 1/4", 1/2", 3/4" or 1" inside what the centre's printed width allows after the 1" margin; not the todo's exact 192):

| Maker | Near-limit boards | Fit today | Fit with new curves | Refused today only | Fit today, refused now |
|-------|------------------|-----------|---------------------|--------------------|-----------------------|
| Arctic | 128 | 93 | 104 | 11 | 0 |
| Marko | 96 | 81 | 87 | 6 | 0 |
| US Blanks | 384 | 329 | 326 | 0 | **3** |

Same direction as the todo's "27 of 192" for the sparse blanks. The three US Blanks flips (7'9"H, 7'9"HX, 10'8"BG, all at the 1/4" setting) are 0.006" to 0.011" over the limit on the new curve against under-limit today: on dense blanks the square-root width can read a hair narrower than PCHIP between two close stations. The reason line then reads `under 1/16" too wide 32.3" from the tail` through the existing `formatAmount` (`blank-reasons.ts:71-75`), so no wording changes at the curves step.

On the stress set (default outline, so width rarely binds): curves step, 4 boards freed (all `wide`: Arctic 5'8" SB ×3, 6'1" SBP ×1), **0** flips to refused; tips step, 10 more freed (all today `runsOut:thinCenter`), **0** flips to refused; today 1,414 fit, curves 1,418, tips 1,428 of 1,635. Wording: at the tips step the 25 stress boards whose tightest place was a runs-out now read a poke (`thin`) instead (15 of them fit anyway), and refusals worded "Less than 1/4" would be left … this blank is too thick for a … center" nearly vanish (Q23-E). `runsOutCause` needs the per-tip start (Q13) and the new `thinningStart` clause (UI-SPEC §10).

### Q12. Cost

Medians, Node, same machine, noisy (`m/timing.ts`, `timing2.ts`; three to four separate runs of each, shown as a range; a busy laptop moved the same code by 2 to 3x between runs):

| Operation | Today | Curves | Tips |
|-----------|-------|--------|------|
| `prepareBlank` (one blank) | 0.006 to 0.008 ms | 0.018 to 0.026 ms | 0.017 to 0.023 ms |
| `prepareBlank`, whole catalogue (158) | 1.6 to 5.7 ms | 4.9 to 17.8 ms | 4.2 to 6.3 ms |
| `boardOnBlank` | 0.010 to 0.014 ms | 0.016 to 0.033 ms | 0.017 to 0.033 ms |
| one slider tick: `boardOnBlank` + `fitAt` | 0.15 to 0.42 ms | 0.23 to 0.37 ms | 0.28 to 0.45 ms |
| `buildBoardProfile` (blank) | 0.027 to 0.051 ms | 0.037 to 0.058 ms | 0.042 to 0.079 ms |
| `computeCrossSectionVolume` | 0.62 to 0.85 ms | 0.62 to 0.78 ms | 0.62 to 0.92 ms |
| hand-set `buildBoardProfile` | 0.007 to 0.013 ms | 0.013 to 0.016 ms | 0.014 to 0.015 ms |
| whole-catalogue list for the default board | 15 to 147 ms | 33 to 131 ms | 36 to 100 ms |
| list for four harder boards (72"/2 1/4"/1" tips, 96", 114"/1 3/4"/1") | 8 to 49 ms | 23 to 102 ms | 18 to 83 ms |

So roughly 2 to 3x on the per-call items and 1 to 2.5x on the list, with run-to-run noise as large as the difference. Every per-tick cost is under half a millisecond. Phase 12's list scare (1.3 s in Node, about 40 s on WebKit per keystroke) is a factor of about 30 between Node and WebKit [CITED: blank-fit.ts:638-640 and 12-08]; at that factor a 100 ms Node list is about 3 s on WebKit [ASSUMED: WebKit not measured], so the list is the one place a regression would show on a phone and deserves a size guard test (the verdict count and a wall-clock bound in node) rather than a feel check. Cheap wins if it matters: the root `sample` uses one binary search for snap and interpolation; `slopes` are computed lazily (only the tips step reads them) — my sandbox computed them eagerly, which is part of the `prepareBlank` cost above.

**Memoised on curve identity:** `design-store.tsx:765` keys `preparedBlank` on `state.blank?.copy` identity (`useMemo(..., [blankCopy])`, comment "R14"); `use-blank-list.ts:57` keys `preparedCatalogue` on the catalogue array (`WeakMap`); `blank-fit.ts` `memoiseHalfWidth` and `fitterFor` memoise per placement within one judge. Nothing keys on the curve family, so putting the rule inside `prepareBlank` respects all of it; a rule change needs no new key. A start change changes `state.blank`, which re-runs the `sideProfile` memo (`:781-802`) but not `preparedBlank`.

### Q13. Today's tip rule, line by line, and every reader

Quoted from `blank-fit.ts` (read in full):
```ts
322  const W = TIP_EASE_WINDOW_MM;
323  const underCentre = blankThicknessAt(L / 2);
324  const centerGap = underCentre - cut.deckSkin - board.centerThickness;
326  const drop = underCentre - board.centerThickness;
327  const unthinned = (s: number) => blankThicknessAt(s) - drop;
331  const tipThinningAt = (s: number) => {
332    let thinning = 0;
333    if (s < W) thinning += (tailUn - board.tailTip) * smoothstep(1 - s / W);
334    if (s > L - W) thinning += (noseUn - board.noseTip) * smoothstep(1 - (L - s) / W);
338  const derivedThicknessAt = (s: number) => {
342    if (s < W) { const w = smoothstep(1 - s / W); value = value - tailUn * w + board.tailTip * w; }
346    if (s > L - W) { const w = smoothstep(1 - (L - s) / W); value = value - noseUn * w + board.noseTip * w; }
```
`export const TIP_EASE_WINDOW_MM = MEASURE_STATION_MM;` (`:56`). The signed thinning is `unthinned − derived`; it comes off the bottom under Pin deck (`rockerAt = untuned + tipThinningAt`, `bottomOffAt = centerGap + tipThinningAt`) or the deck under Bottom (`deckOffAt = skin + tipThinningAt`).

**Every reader of `TIP_EASE_WINDOW_MM`** [VERIFIED: grep]: `blank-fit.ts:56` (definition), `:322` (`boardOnBlank`), `:432` (`runsOutCause`); `phase11-foil.ts:26,65,110,113` (as "the 12" station", not a window); tests `blank-fit.test.ts:38,298,516,1532` and `phase11-foil.test.ts:76`. `fitAt` does **not** read it (the UI-SPEC is right, CONTEXT's code notes are not): it calls `runsOutCause`. `MEASURE_STATION_MM` is separately the 12" station for `rockerStationPositions` (`rocker.ts:351,353`), the fine-tune hump knot (`blank-fit.ts:353-358` via `W`), `blank-reasons.ts:89-90`, `template.ts:184-185`, `build-overview-pdf.ts:233-235`.

**Literal "12"" tip-window copy:** `components/rocker/rocker-controls.tsx:339` (the THICKNESS intro, built with `stationLabel(system)`, so it reads `12"` or `30.5 cm`); comments at `rocker-controls.tsx:32-35,39-40`, `design-store.tsx:314-315` ("Only the last 12" at each end re-derives; nothing at or inside the 12" stations moves"), `blank-fit.ts:11-17,55,237-241,279-283,417-418`; `board-on-blank.tsx:20,34` (comment). `e2e/rocker-cut.spec.ts:279-283` asserts the intro verbatim. CLAUDE.md, the order form, the DATASHEET and `fit-defaults-dialog.tsx:74` do not claim a 12" window (the dialog's sentence is about the 12" fine-tunes, still true).

**What each needs with a per-tip variable start:** `boardOnBlank` the new rule (Q14); `runsOutCause` the tip's own start instead of the constant (the UI-SPEC's own reading: otherwise a runs-out at 15" from a tip whose Automatic start is 24" is called `thinCenter` falsely) plus the new `thinningStart` cause between `tipSetting` and `fineTune`; `phase11-foil.ts` keeps the 12" (rename the constant or keep it named for what it is: the 12" station); the fine-tune hump stays at the 12" station (D-04); the intro copy; the comments.

### Q14. The steady taper and Automatic, as app code

Algorithm (all lengths mm, board stations `s` from the tail tip, `d` = distance in from a tip: `d = s` at the tail, `d = L − s` at the nose):

1. **P and P′ are the planer cut:** `P(d) = blankThicknessAt(station) − drop` with `drop = blankThickness(L/2) − centerThickness`, i.e. exactly `unthinned` (`blank-fit.ts:327`). The Deck Skin cancels (skin + gap = drop), **Tip Style does not enter** (it only decides whether the thinning is taken off the bottom or the deck; the thickness is the same), and **the fine-tune does not enter** (D-04). `P′(d)` is the analytic slope of the blank's thickness curve at that station (sign flipped at the nose). So Automatic is invariant under Deck Skin, Tip Style and tweaks; it depends on blank, placement, length, centre thickness and the tip setting. A test should assert this invariance.
2. **Steady test** (D-03 plus one condition the research's code has and the prose lacks): `canRunDownSteadily(W) = P(W) ≥ tip − ε  and  0 ≤ P′(W) ≤ 2·sec + ε`, `sec = (P(W) − tip)/W`, `ε = 1e-6 mm` (the fit check's own `FIT_EPSILON_MM`). The research's `steady()` (`shapes.ts:60-71`) rejects any slope break including a **negative** `P′(W)` (the planer cut thickening toward the tip, as on the 9'9"B), via `slopeBreak > 1e-6` after `m = max(0, …)`. CONTEXT D-03 states only the two inequalities. Counts match with the extra condition (2,912 / 218 / 97 / 43 / 0).
3. **Taper:** `m = max(0, min(P′(W), 2·sec))`, `a = 2·sec − m`, `b = (m − sec)/W`, `T(d) = tip + a·d + b·d²` for `d < W`, `T(d) = P(d)` for `d ≥ W`. `T(0) = tip` exactly; `T(W) = P(W)`; `T′(W) = m`; `T′(0) = 2sec − m ≥ 0`. If the steady test holds `T′` is linear between two non-negatives, so `T` rises monotonically from the tip and never dips below it (proof of the guarantee, and what the tests check).
4. **Hand-set start (D-05):** `W = pull(stored)` into `range = { min: 6", max: floor(L/2 / 1/2") · 1/2" }`; a non-finite or absent value reads as Automatic; drawn exactly as set, thin spot or kink included (`P(W) < tip` gives `m = 0` and a parabola that dips to `P(W)` at `d = W`).
5. **Where it joins the planer cut:** at `d = W`. In code: `derivedThicknessAt(s) = T(d)` inside a tip's window else `unthinned(s)`; window membership uses the same comparisons as today (`s < W`, `s > L − W`) so with `W = 12"` the 12" station lands outside the window exactly as it does today, which is why acceptance 4 is bit-exact (measured below). `tipThinningAt(s) = unthinned(s) − T(d)` inside the window, 0 outside; everything downstream (`rockerAt`, `deckOffAt`, `bottomOffAt`) is unchanged. The 12" fine-tune hump is added on top in `thicknessAt` as today.
6. **Tip Style's role:** none in the thickness; it only picks which surface `tipThinningAt` is subtracted from, which is existing code.

Proposed pure functions in `lib/geometry/tip-taper.ts` (names are the planner's):

```ts
export interface TipView {            // one per tip, on BlankSideView.tips.{nose,tail}
  start: Mm;                          // the distance in from the tip actually used
  station: Mm;                        // the same point from the tail tip (for the mark)
  automatic: boolean;                 // no hand-set start stored (or not a number)
  automaticStart: Mm;                 // what Automatic picks right now (== start when automatic)
  range: { min: Mm; max: Mm };        // 6" .. half the length rounded in to the 1/2" grid
  reachesStation: boolean;            // start further in than the 12" station (D-07)
  flag: null | { kind: "thin"; thinnest: Mm; at: Mm } | { kind: "steep"; bend: number };
}
export function thinningStartRange(length: Mm): { min: Mm; max: Mm };
export function canRunDownSteadily(P, dP, tip, W): boolean;
export function automaticStart(P, dP, tip, length): Mm;       // scan, first hit, fallback 12"
export function steadyTaper(P, dP, tip, W): (d: number) => number;
export function tipView(P, dP, tip, length, stored: Mm | undefined): TipView & { taper: (d:number)=>number };
```
`flag.thinnest`/`at` come from sampling `T` on a 1/8" grid from the tip to `W` before any fine-tune (D-04) and taking the minimum; the UI-SPEC's `steep` threshold (default 1/16" of slope per inch) is evaluated against the measured distribution in Q23-H.

### Q15. Automatic must not flicker

Implementation under test: the scan, first hit, on the half-inch grid from 12" outward, bound `range.max`, fallback 12". Measured (`m/flicker.ts`, `flicker2.ts`):

- **Sliding placement in 1/16" steps** across the whole range on all 91 (blank, centre) pairs that need a start past 12" somewhere (1,456 steps per tip): largest change **1/2"** per 1/16" step, **0** steps over 1", **0** direction reversals. Monotone and gentle.
- **Sliding centre thickness 2" to 3 1/4" in 1/16" steps** (21 steps, 91 series per tip): **0 reversals** (monotone), but a board that crosses the "needs more run" boundary can jump a long way in one step: up to **10.5"** (tail) / **12"** (nose) in one 1/16", 509 and 250 steps over 1" (of 1,820), 111 and 26 over 2". Worst on Marko Foam 10'6" Gun at 2 1/4".
- **Sliding the tip setting 1/4" to 1 1/2" in 1/16" steps:** **0 reversals**, jumps up to **16.5"** (tail) / **16"** (nose), 896 and 672 over 1".
- Why jumps happen: the set of steady starts is not always contiguous. On the stress set it has a gap for 26 of 3,270 tips (e.g. Marko 8'0" Gun at 2 1/4": steady from 20" to 35 1/2", unsteady from 36" to 40", steady again from 40 1/2" to 46 1/2", read off the printed grid of `m/flicker2.ts`), and when the first hit disappears the next hit can be far in.
- Alternative tested and rejected: "the first start from which every further-in start is also steady" (a closure) would be smoother but pushes 936 of 3,270 tips to the end of the range and leaves only 1,992 at 12" (against 2,912): it changes what Automatic means (D-03 says the first point that can).

**Recommendation:** keep the scan: first hit on the half-inch grid from 12", deterministic (same board, same distance), tolerance `1e-6 mm`, upper bound `range.max`, 1/2" step (also what the UI-SPEC's thumb-on-a-step guarantee needs). A solve (bisection on the steady boundary) gives nothing the half-inch grid does not and would break that guarantee. It is monotone in every control and steps by at most 1/2" per placement tick, which is what a shaper drags; large steps on the centre-thickness and tip-setting controls are the geometry, not noise, and rare (91 of the 545 blank-and-centre pairs in the stress set). Time: Automatic is one `P` and one `P′` evaluation at 12" for 89% of tips (93% on boards the app allows) and at most about 48 grid steps otherwise; `boardOnBlank` with both scans measured at 0.017 to 0.033 ms.

### Q16. Acceptance 3 and 4, re-measured on the rebuild

All counts from `m/stress.ts` on the 1,635-board set (`m/stress-*.json`):

| Measure | Today | Curves only | Curves + tips (Automatic) |
|---------|-------|-------------|----------------------------|
| boards thinner anywhere than their own tip setting (0.005" tolerance) | 79 | 82 | **0** |
| boards that get thicker toward a tip | 199 | 200 | **12**, all `US Blanks 9'9"B`, worst 0.066" |
| boards newly poking out of the blank | (7 already poke) | 0 new | **0 new** |
| boards under the 1/4" floor | 9 | 10 | **0** |
| boards that fit (fitAt) | 1,414 | 1,418 | 1,428 |

- Starts (3,270 tips): ≤ 12": **2,912**; 12 to 18": **218**; 18 to 24": **97**; 24 to 36": **43**; over 36": 0; maximum **32 1/2"**; **249** boards whose two tips start differently. Tips starting past 12": 358; their 12" thickness rises by a median 0.058" (max **0.517"**), all 358 rise. All equal to CONTEXT.
- **Acceptance 4:** with both starts forced to 12", all **16,350** station values (5 thickness + 5 rocker × 1,635) equal the curves-only numbers with **difference exactly 0**. [VERIFIED: `m/stress-tips12.json` vs `stress-curves.json`]
- **Restricted to boards the app can build.** 291 of the 1,635 boards (18%) are longer than the app's own cap: `BOARD_LENGTH_RANGE_IN = { min: 60, max: 120 } as const` (`board.ts:101`) (blanks of 10'2" and up cut 2" shorter, up to 149.5", plus three 58.25" boards on the 5'0"W). On the 1,344 in-range boards: starts ≤ 12" **2,509 of 2,688** (93%), 12 to 18" 116, 18 to 24" 55, 24 to 36" 8, **furthest 30"**; thin spots 37 to 38 then 0; the 12 hump boards are all in range. The UI-SPEC's and the founder's reference board (Arctic 10'9" LB, 2 1/2" centre) is a 127" board in the stress set; a 120" board on that blank starts its tail at 18 1/2" centred and 26" slid to the tail end (and 127" centred: 25"), so the e2e fixture the UI-SPEC proposes ("the picture's Arctic 10'9" LB tail at a 2 1/2" center") needs a 120" board slid to the tail. Both sets should be reported; neither contradicts CONTEXT's figures, which are for the set as defined.

### Q17. Storing the start

Read: `lib/geometry/blank.ts` (`BoardBlank`, lines 90-105), `lib/models/design-snapshot.ts` in full. Ran the **current** `parseSnapshot` from the repo on hand-made snapshots built from a real preset (`m/q17.ts`). [VERIFIED]

- `export const DESIGN_SNAPSHOT_VERSION = 5;` (`design-snapshot.ts:91`); the envelope is `version: z.number(), design: designFieldsSchema` (`:300-303`). **Nothing reads the version to decide anything**: Phase 11 detection is by the blank's shape (`hasPhase11Blank`, `:349-355`), because `saveModel` re-stamps the current version on whatever arrives.
- (i) **An unknown extra field on the blank** (`noseStart: 645`, a bad value `'abc'`/`null`, an extra nested object): `parseSnapshot` returns OK and the field is **silently stripped** (Zod object default); the returned blank has exactly the seven keys `copy, placement, nose12Offset, tail12Offset, deckSkin, tipStyle, fineTuneSurface`.
- (ii) **A version higher than 5** (6, and 99 with an extra field, and a new top-level design field): parses OK, same result.
- A board re-saved by the deployed code (`app/design/actions.ts:54-65` parses then `buildSnapshot`s) loses the extra field and is stamped 5. A phase-11-shaped blank with an extra field still parses and carries over.
- **The signed-out/local draft path:** none. `design-store.tsx:12` and `:143` say an unsaved board lives in memory only and is gone on reload; the only browser persistence is preferences (units, fit defaults, banner and tip dismissals, rack order), none of which holds a design. The undo history snapshot is `Omit<DesignSnapshotFields, "boardName">` (`:123`), so the blank, and the start with it, rides in every undo step automatically. `JSON.stringify` drops `undefined`, so "back to Automatic" (key removed) compares equal to a board that never had one: no phantom undo step.
- **Database:** `lib/db/schema.ts:71` `snapshot: jsonb("snapshot").notNull(),` in the `models` table; nothing about a blank's fields is a column. No migration, no `drizzle/` change, nothing for production. D-06 confirmed.

**Recommendation.** Keep **version 5**. Add two optional fields to `BoardBlank` and to `boardBlankSchema`: `noseThinningStart?: Mm` and `tailThinningStart?: Mm` (distance in from that tip, millimetres), absent = Automatic. Schema: `z.number().min(0).max(5000).optional().catch(undefined)`; tested in Zod 4.4.3: `{}` stays `{}`, a number is kept, `'x'`, `null`, `-3` and `99999` all become "absent" (so a corrupt value reads as Automatic and never rejects the whole board, which would be worse). Out-of-range finite values are pulled into the slider range on read by the profile and never rewritten. Do not extend the "all three or none" refine; the new fields are independent of the cut. The new code must list the fields in `boardBlankSchema` or it would strip them too. A board saved after the tips step opens on the rolled-back site with both tips on Automatic (the extra keys stripped); if that site then saves it, the starts are gone. That is the stated requirement, not a bug. The Phase 11 carry (`design-snapshot.ts:400-420`) sets nothing, so a carried board is Automatic.

Name collision to avoid: `BlankSideView.start` already means where the blank's tail tip falls in board coordinates (`board-profile.ts:50`). The UI-SPEC's per-tip `start` lives under `tips.nose` / `tips.tail`, so it does not clash, but a reader will confuse them; prefer `fromTip`.

### Q18. The store

`components/design/design-store.tsx` (read): every mutator calls `noteEdit(key)` first, then `setState((current) => { const prev = startedFrom(current, liveTipsRef.current); … boardStarted: true, dirty: true })`. A slider keeps one coalescing key (`setPlacement` `:919` `noteEdit("blank:placement")`, `setDeckSkin` `:929`, `setFineTune` `:964` `noteEdit(\`blank:offset:${patchKey(patch)}\`)`); a discrete choice uses `noteEdit(null)` (`setTipStyle` `:941`, `setFineTuneSurface` `:952`, `resetFineTune` `:974`, `pickBlank` `:897`), and the two-option setters first compare against the **resolved** profile value so tapping the pill that is already on writes nothing. `recordEdit` folds same-key edits within `COALESCE_WINDOW_MS = 500` into one undo step (`lib/design-history.ts:40,91`); a `null` key never coalesces. History equality is `JSON.stringify(before) === JSON.stringify(historySnapshot)` (`:575-576`).

Thinning Starts needs: `setThinningStart(end: "nose" | "tail", start: Mm)` with `noteEdit(\`blank:thinningStart:${end}\`)` (a drag is one step per tip, as UI-SPEC §11 says), and `useAutomaticThinningStart(end)` (`noteEdit(null)`, returns first when `sideProfile.blank?.tips[end].automatic` is already true). Both guard `if (!state.blank) return`, spread into `blank` like `setDeckSkin`, and Automatic **deletes the key** (so the JSON compare and the saved row stay clean). Both must be added to the `DesignContextValue` interface (`:318-331` is where the siblings sit) and the provider's value (`:1264-1267`). `pickBlank` (`:897-917`) already carries `prev.blank?.…` fields across a blank switch; add the two starts there (UI-SPEC §11: switching keeps a hand-set start). `removeBlank` (`:992`) sets `blank: null` and one undo restores everything because the history snapshot holds the whole blank. `resetFineTune` must not touch the starts (UI-SPEC). An undo mid-drag: the coalescing window means an undo within 500 ms of the last tick reverts the whole drag, as for every slider.

### Q19. Can the approved screen design be built as written?

Checked against the code this session. Everything cited exists at or within a few lines of the cited place unless listed below.

**Exists as cited:** `components/design/slider-row.tsx` (label line `:73-79`, hint line `:89-94`, `note` 10px `:95`); `slider-row.test.ts` allowlist `ROCKER_PATH` count 1 (`:46-51`), `rawSliderCount` (`:83-86`), exports test (`:138-143`); `components/viewer/two-option-toggle.tsx` (`aria-pressed`, `focus-ring-accent`, `coarse:min-h-11`, `:44-58`; CONTEXT's note that it is in `rocker-controls.tsx` is wrong, the UI-SPEC is right); `FlagBlock` (`blank-flag.tsx:72-93`, `role="status"`, `data-blank-flag`); `rocker-controls.tsx:186-187` (`From blank …`, `No tweak`), `:339` (intro), `:411-424` (↺ Reset Fine-Tune), the Tip Style block; `rocker-viewer.tsx:128` (`KNOT_DOT_PX = 3`), `:704-706` (accessible name), `:732` (single rotated `<g>`), `:738-746` (dashed baseline `"4 3"`); `rocker-view-frame.ts:384` (`COMPACT_BASELINE_DASH = "8 6"`); `rocker-datasheet.tsx` (`GroupLabel :111-117`, `READ_ONLY_CELL :84`, `Row` default class, FOAM OFF Bottom row with `className=""`, `min-w-[540px]`); `order-form.tsx:447-452` (the compact strip is passed `profile={sideProfile}` and no `blank` prop, so it draws no blank; the viewer decides the blank from the prop, `rocker-viewer.tsx:629-631` for `inBlank`), `:749` (`data-planing-footnote`); `planing.ts:48` (`NO_BLANK_LINE`), `:64-75` (`PlaningTable`), `:111-140`; `app/globals.css:762` (`--outline-blank-line`); `blank-reasons.ts` `formatAmount :71-75`, `formatWhere :78-96`, `runsOutClause :104-120` (exhaustive switch over `RunsOutCause`, `blank.ts:135`: `"thinCenter" | "fineTune" | "offBlank" | "tipSetting"`), `deckSkinHint :183-187`, `formatPlacement :223`, `placementSlider :243`; `measure-display.ts` `formatDim :63`, `formatDimBare :72`, `formatMark :81`, `stationLabel :210`, `columnUnitSuffix :233`, `measureSlider :270`; `units.ts:180` `metricSliderRange`; the six board-input sites (below).

**Does not exist yet, and the UI-SPEC says so:** `formatThinningStart`, `formatThinningStartBare`, `thinningStartSlider`, `thinningStartHint`, `thinningStartLine` (all new, in `blank-reasons.ts`); `SliderRow`'s `hintAction`; the `thinning` field on `PlaningTable`; the `thinningStart` member of `RunsOutCause`. None of the units needs a missing conversion: `formatDim`/`formatDimBare`/`formatMark`/`stationLabel`/`columnUnitSuffix`/`measureSlider`/`metricSliderRange` all exist.

**The six construction sites hold** (each hand-copies `deckSkin, tipStyle, fineTuneSurface`): `board-profile.ts:263-281`, `blank-flag.tsx:158-190`, `use-blank-list.ts:107-108,127-171` (`useBoardCut` and the `ctx` memo, whose dependency list must gain both starts or the list goes stale), `design.ts:176-183`, `design-store.tsx:785`, `scripts/check-saved-boards.ts:180,204`. Add the starts to all six or the list, the flag, the rack cards and the screen disagree. Recommend one helper (`boardInputOf(blank)` in `lib/geometry`) so there is one place; it also covers `presetBlank` (`lib/blanks/preset-blanks.ts`, builds a `BoardBlank`; nothing to add since absent = Automatic).

**Slider range for the shortest and longest boards the app allows** (60" and 120", `board.ts:101`): `thinningStartRange` gives 6" to 30" and 6" to 60" (49 and 109 half-inch positions). Metric through `metricSliderRange({min: 6, max}, 10)`: `ceil(152.4/10)·10 = 160` to `floor(762/10)·10 = 760` mm, and 160 to 1,520 mm. Both work. Findings (not redesigns):
1. **Imperial and Metric rounding differ.** The profile's `range` (system-independent, 1/2" grid) says 6" to 30"; the Metric slider's rounded-inward range is 160 to 760 mm. A hand-set 6" start (152.4 mm) opened in Metric labels `15.2 cm` over a thumb pinned at 16.0 cm, and a start at the 60" board's centre labels `76.2 cm` over a thumb at 76.0. UI-SPEC §3 says the profile clamps to "the same `{ min, max }` the slider uses"; for Metric it cannot, since the profile does not know the system. Harmless (the Placement precedent behaves the same, and nothing is written) but the sentence is not literally true.
2. **Placement, the closest sibling slider, reads whole millimetres** in Metric (`formatPlacement` → `formatMark`, `blank-reasons.ts:223-227`: `13 mm toward nose`), while the UI-SPEC reads the start in centimetres to one decimal (a dim). Its argument (the 12" station reads `30.5 cm`, every "where along the board" phrase reads cm) is sound and its note rejects the fin precedent, but it does not mention Placement. See Q23-B.
3. **Per-tip `start` vs `BlankSideView.start`** naming (Q17).
4. **A negative planer-cut slope at the start** (the 9'9"B shape) is neither the UI-SPEC's `thin` nor its `steep` ("running too steeply") case; if it occurs on a hand-set start it needs one of those two sentences to be true for it (Q14.2). 
5. **A board on Automatic can end without a steady start** outside the stress set (Q23-D); the UI-SPEC's open item 3 asks exactly this and the answer is "yes, in an extreme corner".
6. The e2e fixture board in the UI-SPEC is not buildable (Q16).

### Q20. Two go-lives from one branch

**No feature flag is needed**, because separation is by commit order and by absence:
- The tips code adds only things that are inert without a start: two optional snapshot fields (absent = today's behaviour is *not* preserved, absent = Automatic = the new taper, so the tips commits must come strictly after the curves commit on the branch), a new module nothing in the curves commits imports, and UI that only draws with a blank picked.
- The curves commits must not import `tip-taper.ts` and must leave `boardOnBlank`'s blend alone. `slopeAt` is needed only by the tips step; keep it out of the curves commits (add it with `tip-taper.ts`) so go-live 1 contains nothing the tips need.
- "The showing runs on the new curves with today's blend" is then just "main stops at the curves commit". The founder's push of go-live 1 is the curves tip commit (plus docs); go-live 2 pushes the rest. Plan so that every code commit of wave 1 precedes every code commit of wave 2, and docs commits interleave freely (they do not affect the code). A flag would only be needed to ship tips code dark on main before it is proven, which D-15 and D-16 do not ask for.

**Order of work**
0. Pin (a generated golden, Q8) before any rule changes. No app code.
1. Curves wave: `root-curve.ts` + tests (R1 to R3, acceptance 1, 2, 8); `prepareBlank` live = root, `prepareBlankPchip`; `phase11-foil.ts` self-pin; hand-set profile and `sampleFoil` on the root rule; retarget the two wrong tests and the four vacuous ones; presets/hand-set figures recorded; ROCKER and VOLUME baselines re-recorded; the D-18 curves report; the founder's pictures; **go-live 1**.
2. Tips wave: `slopeAt`, `tip-taper.ts`, `boardOnBlank` with `tipRule` (blend kept for the report and acceptance-4's equality), `runsOutCause`, snapshot fields, six sites, store mutators, UI, copy, tests and e2e per UI-SPEC §13; the D-18 tips report; pictures; the rehearsal walk (D-17); **go-live 2**.

**What "proven" needs for each go**
- *Curves:* `npm test` green with the Q7 changes; the pin test proves the frozen rule reproduces today bit for bit; the named tests for acceptance 1, 2, 5, 6 and 8 pass; `npm run lint`, `npx tsc --noEmit` and `npm run build` (from the main checkout) clean; the full e2e suite (phones and desktop) with only the two expected baselines re-recorded and the founder's eye on the diff (TEMPLATE must not move); the D-18 curves report run by the founder and read back (boards open, five numbers moved ≤ x, litres moved, verdict flips); before and after pictures (preset cards, a saved-board-like case, the first board a visitor sees); the founder's go.
- *Tips:* all of the above again for the tips, plus acceptance 3 and 4 as tests, no-flicker as a test, `check-saved-boards`'s "five thicknesses kept" still passing for every Phase 11 board, the D-18 tips report, the rehearsal walk, acceptance 9 (the founder's picture pick is done; the real-device walk is the open part).

### Q21 to Q23

Q21 is the **Validation Architecture** section, Q22 the **Edge Coverage** and **Prohibitions** sections, Q23 the **Open Questions** section below.

## Common Pitfalls

### Pitfall 1: The frozen rule drifts or gets bypassed
**What goes wrong:** someone edits the switch and Phase 11 boards open with different numbers, or the D-18 "before" is not today's. **Why:** `phase11-foil.ts` shares `prepareBlank` and `boardOnBlank` with the live path. **Avoid:** `phase11TwelveInch` re-prepares on PCHIP from `prepared.record`; the pin test proves `prepareBlankPchip` equals the pin; keep `phase11-foil.test.ts` and the Phase 11 tests in `design-snapshot.test.ts` unmodified (they are the guard). **Warning sign:** a difference of 0.047 mm at `preset:shortboard` tail 12".

### Pitfall 2: Tests that go quiet instead of red
**What goes wrong:** `blank-fit.test.ts:129,154` and `rocker.test.ts:305,335` build their own PCHIP, so after the switch they pass while testing nothing live. **Avoid:** retarget them to `prepareBlank(record)` and `prepareRootCurve` in the same change that flips the switch.

### Pitfall 3: Float round-trip at the printed stations
A square root then a square misses 28.8% of printed values by up to 1.4e-13 mm and breaks `toBe`, `pchipMinimum`'s `0` and "the five numbers are the same to the last bit". **Avoid:** return `ys[k]` at a knot.

### Pitfall 4: A second positional parameter on `prepareBlank`
`Array.map` passes the index. Use a named function (Q9).

### Pitfall 5: Six places each copy the blank's cut
Forget one and the list, the flag, the rack card or the check script disagree with the screen. One helper, and a test that builds a board through each path with a hand-set start and compares the five numbers.

### Pitfall 6: Stale list after a start changes
`use-blank-list.ts`'s `ctx` memo has an explicit dependency list; the new fields must be in it.

### Pitfall 7: The tips step quietly changes fit verdicts and reasons
It frees thin-centre boards that "run out" today and removes the "blank is too thick for a … center" refusal for them (Q23-E). The existing runs-out tests encode the old behaviour.

### Pitfall 8: Counting the stress set as if every board were buildable
291 of 1,635 are over the app's 120" cap. Report both, and take the e2e and picture boards from the buildable ones.

### Pitfall 9: Pins that depend on the live catalogue
A later catalogue correction would move a recorded count. Pin blank rows by value (the Phase 12 pattern).

### Pitfall 10: Tolerances that are almost the measured value
Acceptance 5's 0.015" holds at 0.0149" for the Mid-length nose-tip rocker. Do not narrow it; do not hand-round.

### Pitfall 11: `process.env` or any global in a hot path
(Sandbox-only artefact: reading `process.env` inside `boardOnBlank` made the numbers wander; the app has no such thing and must not grow one.)

### Pitfall 12: Prose that quotes numbers
`volume.test.ts:552` ("78.85 L"), the THICKNESS intro, the Phase 12 comments (`blank-fit.ts:11-17,55,237-241,279-283,417-418`, `rocker-controls.tsx:32-35,39-40`, `design-store.tsx:314-315`) go stale; the UI-SPEC lists them; rewrite them with the code.

## Code Examples

Tested forms from the sandbox (they are what produced the numbers above).

### The square-root curve (`lib/geometry/root-curve.ts`)
```ts
import { preparePchip, type PreparedPchip, type SplinePoint } from "./pchip";
export type RootKind = "rise" | "fall";
export interface PreparedCurve extends PreparedPchip { slopeAt(x: number): number }

export function prepareRootCurve(points: readonly SplinePoint[], kind: RootKind): PreparedCurve {
  const n = points.length;
  if (n === 0) { const e = preparePchip([]); return { ...e, slopeAt: () => 0 }; }
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const anchor = kind === "rise" ? Math.min(...ys) : Math.max(...ys);   // lowest / thickest station
  const first = ys.indexOf(anchor);                                     // ties: the first; the rest get sqrt(0)
  const g = preparePchip(points.map((p, i) => ({ x: p.x, y: (i < first ? -1 : 1) * Math.sqrt(Math.abs(p.y - anchor)) })));
  const sample = (x: number) => {
    if (Number.isFinite(x) && x >= xs[0] && x <= xs[n - 1]) {           // printed stations return exactly
      let lo = 0, hi = n - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (xs[mid] < x) lo = mid + 1; else hi = mid; }
      if (xs[lo] === x) return ys[lo];
    }
    const r = g.sample(x);
    return kind === "rise" ? anchor + r * r : anchor - r * r;
  };
  const slopeAt = (x: number) => (kind === "rise" ? 2 : -2) * g.sample(x) * pchipSlopeAt(g, x);
  return { xs, ys, slopes: xs.map(slopeAt), sample, slopeAt };
}
```
`pchipSlopeAt(curve, x)` is the Hermite derivative on the interval containing `x` (`d00 = (6t² − 6t)/h`, `d10 = 3t² − 4t + 1`, `d01 = (−6t² + 6t)/h`, `d11 = 3t² − 2t`; 0 past either end, the end tangent at the end knot). Put it in `pchip.ts` and expose it as `slopeAt` from `preparePchip` too. (A planner may fold the knot snap into the single search the Hermite evaluation already does.)

### The taper and Automatic (`lib/geometry/tip-taper.ts`)
```ts
const STEP = inchesToMm(0.5), EPS = 1e-6;
export function thinningStartRange(length: number) {
  return { min: inchesToMm(6), max: Math.floor(length / 2 / STEP + 1e-9) * STEP };
}
export function canRunDownSteadily(P: (d: number) => number, dP: (d: number) => number, tip: number, W: number) {
  const PW = P(W), sec = (PW - tip) / W, slope = dP(W);
  return PW >= tip - EPS && slope >= -EPS && slope <= 2 * sec + EPS;
}
export function automaticStart(P, dP, tip, length) {
  const { max } = thinningStartRange(length);
  if (canRunDownSteadily(P, dP, tip, MEASURE_STATION_MM)) return MEASURE_STATION_MM;   // exactly 12": same float as the 12" station
  for (let k = 25; k * STEP <= max + 1e-9; k++) if (canRunDownSteadily(P, dP, tip, k * STEP)) return k * STEP;
  return MEASURE_STATION_MM;   // fallback (Q23-D): no steady start exists
}
export function steadyTaper(P, dP, tip, W) {
  const sec = (P(W) - tip) / W, m = Math.max(0, Math.min(dP(W), 2 * sec));
  const a = 2 * sec - m, b = (m - sec) / W;
  return (d: number) => (d >= W ? P(d) : tip + a * d + b * d * d);      // d = 0 returns tip exactly
}
```
In `boardOnBlank`: `P(d)=unthinned(d)` for the tail and `unthinned(L−d)` for the nose; `dP` the blank thickness `slopeAt` (negated at the nose); window membership `s < tailStart` / `s > L − noseStart`; `derivedThicknessAt = taper(...)` in the window; `tipThinningAt = unthinned − taper`.

### The stored field (`design-snapshot.ts`)
```ts
noseThinningStart: z.number().min(0).max(5000).optional().catch(undefined),
tailThinningStart: z.number().min(0).max(5000).optional().catch(undefined),
```
(beside `deckSkin` in `boardBlankSchema`; the "all three or none" refine is untouched.)

### The frozen rule
```ts
export function prepareBlankPchip(record: BlankRecord): PreparedBlank { return prepareBlankWith(record, "pchip"); }
export function prepareBlank(record: BlankRecord): PreparedBlank { return prepareBlankWith(record, "root"); }
// phase11-foil.ts:  phase11TwelveInch(prepared, ...) { const frozen = prepareBlankPchip(prepared.record); ... frozen.thickness.sample(u) ... }
```

## State of the Art

| Old | Current (this phase) | Impact |
|-----|---------------------|--------|
| PCHIP through the stations (v1.3 R10/D-13) | PCHIP inside the square-root rule (D-13 of this phase) | mean miss 0.112 to 0.035" on the bottom; no overshoot kept |
| S-shaped smoothstep over the last 12" (Phase 12 D-05) | one steady parabola from an automatic or set start (D-01) | no thin spot on the stress set; 12" station moves for 358 tips |
| "Nothing at or inside a 12" station moves" (Phase 12) | superseded by D-07 where the start is past 12" | rewrite comments and the e2e intro |

**Deprecated within the phase:** the S-blend (keep one release only for the D-18 report), `sampleFoil`'s PCHIP default.

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|-------|---------|---------------|
| A1 | `origin/main` `ed39f4a` is what Vercel serves | Q8 | the pin would pin the wrong code; ask the founder or read the deployment's commit |
| A2 | WebKit is about 30x slower than Node on the list (carried from Phase 12's note) | Q12 | a phone could feel the list; mitigated by a size guard test |
| A3 | RAILS, FINS and TEMPLATE baselines do not change at the curves step | Q7 | an unexpected diff needs the founder's eye; the rule in UI-SPEC already says so |
| A4 | The production catalogue equals `db/seed/blanks/*.csv` (three correction rounds live) | Q8 | the pin and the report would use a slightly different catalogue |
| A5 | A tolerant read (`.catch(undefined)`) is the right policy for a corrupt start | Q17 | the alternative (reject the board) loses a shaper's board |
| A6 | The UI-SPEC's pixel measurements (260 px rows, 44 px targets, print widths) | Q19 | not re-measured here; the planner proves them in the e2e specs it already names |
| A7 | The slope threshold for the "sharp bend" line (1/16" per inch) | Q23-H | the line would show too rarely (22 of 295 cases) |

## Open Questions (RESOLVED)

Lettered, in plain English, with a recommendation each. A, B, E and G are the founder's calls; the rest are the planner's unless the founder wants to weigh in.

### Rulings (2026-10-02, written back to `14-CONTEXT.md` as D-20 to D-28)

The orchestrator re-ran the saved-board reader check (Q17) and the thin-centre list (Q11: 27, then 22, then 0 refused) against the real repo and this research's scratch copy, and confirmed on Vercel that the newest production deployment was built from `ed39f4a`. The founder answered B, E and H by question card; the rest were settled as Claude's discretion and told to the founder the same day.

| Question | Ruling | Decision |
|---|---|---|
| A. The stored tweak under a Phase 11 board moves | Accepted: the five thicknesses stay exactly, the stored tweak absorbs the difference (the brief's acceptance 6 allows nothing else) | D-25 |
| B. Centimetres or millimetres for the start in Metric | **Founder: centimetres, as designed** (`30.5 cm`) | D-22 |
| C. The stress set includes boards the app cannot build | The set stays as defined for the acceptance tests; the buildable subset is reported beside it; pictures and browser fixtures use a 10'0" board on the Arctic 10'9" LB slid to the tail | D-27 |
| D. Automatic when no start can run down steadily | Falls back to 12" and says nothing; a test covers it | D-23 |
| E. Thin-centre boards stop being refused | **Founder: accept it**; the tests built on the old refusal use a hand-set start; shown in the tips go's pictures | D-20 |
| F. The Mid-length's 0.0149" against the 0.015" bound | The bound is the brief's: not tightened, not hand-rounded | D-27 |
| G. Where the starts print on the order form | In the PLANING box, as the screen design has it | UI-SPEC §8 |
| H. How sharp a bend counts | **Founder: 1/32" per inch**, picked from a true-scale picture of the two corners; a cut that thickens toward the tip at the start takes the same sentence | D-21 |
| I. Is `origin/main` `ed39f4a` what is live | Yes: confirmed on Vercel (the newest production deployment, built from that commit) | D-26 |
| J. The tape-measure check | After go-live, as D-08 already says; it gates nothing | D-08 |

Also settled from this research: the first-hit half-inch scan with the extra "not thickening toward the tip" condition (D-23); two optional values on the blank and version 5 kept (D-24); the frozen rule by name (D-25); the two go-lives by commit order (D-28). The statements this research found wrong in CONTEXT's code notes carry dated planning notes there; the ones in the UI-SPEC are amended under its "Open items for the planner".

**A. The hidden "tweak" under a saved Phase 11 board will move a hair.** A board saved before Phase 12 opens showing the same five thicknesses it always showed (that is the point of the carry-over, and it still holds, proven by the existing tests). Under those five numbers the app keeps a small stored "tweak" at each 12" mark to make that true; with the new curves that stored tweak changes: on the 39 recorded Phase 11 boards, 74 of 78 tweaks move, median 0.015 mm, at most 0.74 mm (0.03"). The numbers a shaper sees do not change, but the "Tweak +…" figure on the sidebar can read slightly differently from last week for such a board. Options: (1) accept (recommended; the only way to keep the five numbers is to let the tweak absorb the difference); (2) keep the old tweak and let the 12" numbers move by up to 0.03" (breaks "converts exactly as before"). The founder's brief ("the numbers it converts to today") reads as the five numbers.

**B. Does the start read in centimetres or whole millimetres in Metric?** The screen design chose centimetres to one decimal (`30.5 cm`, matching the "Nose @ 30.5 cm" row two lines above, and the existing "from the nose" phrases). CLAUDE.md Rule 2 files "fin placement numbers" and other tape marks under whole millimetres, and the Placement slider, the closest cousin on this screen, reads whole millimetres (`13 mm toward nose`). A start is a position along the board like Placement. Recommend centimetres as designed (one number, one reading, on one screen) but the founder should say yes, since it is the founder's rule and the screen design flagged it as discretion.

**C. The test boards include boards the app cannot make.** 291 of the 1,635 stress boards (18%) are longer than the app's 120" limit (a 10'9" blank minus 2" is 127"). The figures in the plan (89% at 12", furthest 32 1/2") are for that set; on boards the app allows it is 93% at 12" and the furthest is 30". The founder's picture board (Arctic 10'9" LB) is one of them; on a 120" board it starts the tail at 18 1/2" centred, 26" slid to the tail. Recommend: keep the set as defined for the acceptance tests (it is the harder set), also report the buildable subset, and draw the before-and-after pictures and the e2e fixture on a 120" board slid to the tail.

**D. What should Automatic do when no start can run the taper down steadily?** On the stress set and on realistic boards (blank 2" to 12" longer than the board, centres 2" to 3", tips 1/2" to 1"): never (0 of 3,270 and 0 of 17,136 tips). On an extreme set (boards up to 70" shorter than the blank, centres 1 1/4" to 4", tips 1/4" to 1 1/2", blanks the list would still offer): 5,397 of 50,598 tips (10.7%), more with thick tips and thin centres. Options: (1) fall back to 12" and say nothing (recommended: no worse than today, and the existing fit check still judges); (2) fall back to 12" and show a one-line note; (3) refuse such blanks in the list. The screen design assumed "never" and its "Automatic would cure it" sentence would be false here, so it must not show on Automatic. Either way the fallback needs a test.

**E. Thin-centre boards stop being refused as "too thick for a … center".** With the steady taper a board is never thinner than its tip, so today's "Less than 1/4" would be left … this blank is too thick for a 1" center" refusal disappears for most boards that get it: the default 72" board at a 1" centre lists 27 blanks as refused today, 22 after the curves, 0 after the tips; at 1 1/2" it goes from 1 to 0; on the stress set 10 boards are freed (and none is newly refused). These boards fit by letting the tip rocker fall (Pin deck) where the planer cut leaves less foam than the tip asks for, which is Phase 12 D-16. CONTEXT D-05 says "the existing fit check and the 1/4" floor still judge the board as they do today"; the rules do, but their effect on these boards is not the same. Recommend: accept and say it in the pictures for the tips go; four existing tests that built on that refusal get a hand-set start instead.

**F. Mid-length preset margin.** Its nose-tip rocker moves 0.01487" at the curves step against the 0.015" limit. True, but a hair. Nothing to decide unless a catalogue correction touches the 7'4"SP.

**G. Where do the starts print on the order form?** The screen design put one line under the PLANING footnote ("Thinning starts from the tip: nose 12", tail 25 1/2".") and measured room for it. CONTEXT said "with the tips and the planing figures". Both are satisfied by the PLANING box; no decision needed unless the founder wants it on page 1 with the tip numbers.

**H. How sharp a bend counts as "too close"?** The screen design flags a hand-set start as a "sharp bend" when the taper's slope differs from the planer cut's by more than 1/16" of thickness per inch. Measured on the stress set with every start forced to 12": 63 tips have a thin spot at 12", 295 more would bend, but only 22 of those 295 exceed 1/16" per inch (119 exceed 1/32", median 0.024, max 0.097). So at the default the sharp-bend line would show rarely. Recommend 1/32" per inch (119 of 295) as the threshold, or keep 1/16" if the founder prefers a quieter screen. A negative slope at the start (planer cut thicker toward the tip) needs its own wording or to join "sharp bend" ("running too steeply" is false for it).

**I. Is `origin/main` what is live?** (A1.) The pin's value depends on it. If the deployed commit is not `ed39f4a`, the generator's guard SHA changes; nothing else does.

**J. The tape-measure check.** D-08 already places it after go-live. Nothing to ask; recorded so the plan does not gate on it.

**Contradictions with CONTEXT or the UI-SPEC (explicit):** none of CONTEXT's figures is contradicted (all reproduced: 1,635 / 2,912, 218, 97, 43 / 32 1/2" / 249 / 12 on the 9'9"B / 358 rises, median about 1/16" and max 1/2" / 79 and 82 thin spots / preset litres to the digit). Statements that need correcting: CONTEXT's code note that `fitAt` reads `TIP_EASE_WINDOW_MM` (it does not); CONTEXT's note that `TwoOptionToggle` is in `rocker-controls.tsx` (it is in `components/viewer/`); UI-SPEC §3 point 4 ("the same `{min, max}` the slider uses" is not true in Metric); UI-SPEC open item 3 ("whether a board on Automatic can ever end with a flag", answer: yes, outside the stress set); UI-SPEC's reference board (127" long, not buildable); acceptance 1's "all 162 catalogue blanks" (158 are preparable; four can be tested only at the curve level); D-03's prose lacks the `P′ ≥ 0` condition the measured code has.

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, vitest | yes | v24.19.0 | none needed |
| `npx tsx` (from node_modules) | generators, report script | yes | repo's | none needed |
| Vitest | all unit tests | yes | 4.1.11 | none needed |
| Playwright + Chromium/WebKit | e2e, baselines | not probed (not run here) | repo's | the founder's machine re-records macOS baselines |
| Network, database, Vercel CLI | the D-18 report on production | not used here | n/a | the founder runs it, as with earlier production steps |

Nothing missing blocks planning.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11, node environment, `lib/**/*.test.ts` and `components/**/*.test.ts` (`vitest.config.ts`) |
| Config file | `/Users/kontoes/Code/shaper/vitest.config.ts` |
| Quick run | `npx vitest run lib/geometry/root-curve.test.ts lib/geometry/blank-fit.test.ts lib/geometry/tip-taper.test.ts` (blank-fit.test.ts alone is about 17 s) |
| Full suite | `npm test` (93 files, 3,654 tests, about 19 s today) |
| Browser | `npm run test:e2e` / `npm run test:e2e:phone` (not run here) |
| Scripts | generators and the report are `npx --no-install tsx --tsconfig ./tsconfig.json scripts/<file>.ts` |

### Phase Requirements to Test Map
| Req / criterion | Behaviour | Test type | Command | File | Fixture |
|-----------------|-----------|-----------|---------|------|---------|
| R1, acc 1 | exact at every station and never outside the two neighbours, 162 blanks × 3 curves (curve level) and 158 through `prepareBlank` | unit, catalogue-wide | `npx vitest run lib/geometry/root-curve.test.ts` | new `root-curve.test.ts`; retarget `blank-fit.test.ts:129` | none (reads the catalogue like `blank-fit.test.ts`) |
| R2, acc 2 | lowest sampled point = lowest printed station; ties; low at an end (synthetic) | unit | same | `root-curve.test.ts`, `blank-fit.test.ts:176-179` | none |
| R2, R3, R5 | hidden-station scores: root closer than today's PCHIP, within a bound | unit | same | `root-curve.test.ts` | **generated** (90 US Blanks rows + today's PCHIP scores, from the pin generator) |
| R3 | deck stays `rockerAt + thicknessAt` | unit | `npx vitest run lib/geometry/board-profile.test.ts` | existing (`deckAt` assertions) | none |
| R4, acc 8 | hand-set default board: five numbers exact to the bit, curves through them | unit | `…board-profile.test.ts` | retarget `:85-91` | none (expected = the typed stations) |
| R4 | board in a blank follows its blank | unit | `…blank-fit.test.ts` | existing named tests, rocker block repointed to `prepareBlankPchip` | `phase11-foil-golden.json` (existing) |
| R5 | fit verdicts: no stress board flips to refused; width reads | unit | `…blank-fit.test.ts` | new test over the stress set in-test | none |
| acc 5 | four presets within 0.015" of today; litres re-recorded | unit | `npx vitest run lib/geometry/presets.test.ts` | new test in `presets.test.ts` or `preset-figures.test.ts` | **generated** (`phase14-today-golden.json`, `preset-figures-golden.json`) |
| acc 6 | Phase 11 board converts to exactly today's five numbers | unit | `npx vitest run lib/geometry/phase11-foil.test.ts lib/models/design-snapshot.test.ts` | existing, **unmodified** | `phase11-foil-golden*.json` (existing) |
| acc 7, R8 | opening writes nothing; stored values unchanged; absent start = Automatic; extra field/higher version tolerated; corrupt start reads Automatic | unit | `…design-snapshot.test.ts` | new cases (deep-frozen input, round trip, the Q17 cases) | none |
| R8 | printed stations never move | unit | `root-curve.test.ts` | the acc-1 test plus an assertion the catalogue input is untouched | none |
| R6, R7 | steady taper maths (`T(0)=tip`, `T(W)=P(W)`, `T′(W)=m`, monotone), Automatic scan, range, flag, thinnest point | unit | `npx vitest run lib/geometry/tip-taper.test.ts` | new | none |
| acc 3 | stress set: none thinner than its tip, none thicker toward a tip except blanks whose thickest printed station is not C, none newly poking, none under the floor | unit, catalogue-wide | `…tip-taper.test.ts` | new, set built in-test, exception list computed from the data | none |
| acc 4 | start at 12" equals the curves-only numbers (bit-exact on 16,350 values) | unit | same | new; compares against `tipRule: "blend"` | none (or the curves-step pin) |
| R6 | Automatic invariant under Deck Skin, Tip Style, tweaks; no flicker (monotone in placement, steps ≤ 1/2" per 1/16"); multiple of 1/2"; inside range | unit | same | new | none |
| R6 | words, units, slider, hint, too-close line, planing line, `runsOutClause`, `runsOutCause` order | unit | `npx vitest run lib/geometry/blank-reasons.test.ts lib/geometry/planing.test.ts lib/geometry/blank-fit.test.ts` | existing files extended | none |
| R6 (UI) | rows, Automatic button, undo, mark, DATASHEET block, printed line, touch sizes | e2e | `npm run test:e2e` | `rocker-blanks.spec.ts`, `rocker-cut.spec.ts` (`:279-283` intro replaced), `summary-planing.spec.ts`, `touch-sizing.spec.ts` | none |
| R8 (screen) | saved boards redraw quietly (no notice) | e2e / UAT | manual | 13-UAT walk | none |
| R9, acc 9 | two go-lives, D-18 reports, pictures, rehearsal walk | process / UAT | founder | 14 UAT sheet | n/a |
| Rule 1 | no React/browser/db import in new geometry files; no hand-typed expected numbers | lint / review | `npm run lint` | existing | n/a |

### Sampling Rate
- **Per task commit:** the touched file's own test file (quick run above).
- **Per wave merge:** `npm test` plus `npx tsc --noEmit` and `npm run lint`.
- **Phase gate:** full suite green, `npm run build` from the main checkout, e2e, the D-18 report read back, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `scripts/extract-phase14-today-golden.ts` and `lib/geometry/__fixtures__/phase14-today-golden.json` (the pin, Q8), generated from `ed39f4a` before any rule changes.
- [ ] `lib/geometry/root-curve.test.ts` (new), `lib/geometry/tip-taper.test.ts` (new).
- [ ] Retarget `blank-fit.test.ts:129,154`, `rocker.test.ts:305,335` (vacuous), `board-profile.test.ts:85-91`, `volume.test.ts:573-590` (wrong), `blank-fit.test.ts` rocker-golden block.
- [ ] Framework install: none.

## Security Domain

`security_enforcement` is on (ASVS level 1, block on high). This phase adds no endpoint, no auth path and no database access of its own; its security surface is the stored-board boundary and the read-only script.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | unchanged (Clerk) |
| V3 Session Management | no | unchanged |
| V4 Access Control | no | unchanged (`app/design/actions.ts` ownership checks untouched) |
| V5 Input Validation | **yes** | Zod at the one boundary: `z.number().min(0).max(5000).optional().catch(undefined)` for each start; every number finite; a snapshot is untrusted input (`design-snapshot.ts` header) |
| V6 Cryptography | no | none |
| V8 Data Protection | yes (script) | the report prints counts and maxima only, never a snapshot, board name, user id or connection string; connection errors print only the error kind and code unless `--verbose` |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A crafted snapshot with a huge, negative, NaN-like or non-number start | Tampering / DoS | bounded optional field with tolerant catch; the profile pulls any finite value into the slider range on read; `thinningStartRange` is derived from the length, so no unbounded scan (the scan is at most about 48 steps, with a hard bound at `range.max`) |
| An oversized extra field smuggled on the blank | Tampering | Zod strips unknown keys (measured); the existing 32-station and string-length bounds stay |
| The report script writing or leaking | Information disclosure / Tampering | one `select` of `id, snapshot`, no write path; only counts printed; the production env file is pulled to a temporary file and deleted on exit (the header's recipe) |
| A rolled-back site reading a newer board | Tampering / Repudiation | measured: tolerated, extra field stripped, no crash |

## Edge Coverage (for the SPEC)

| Category | Requirement | Status | Resolution / Reason |
|----------|-------------|--------|---------------------|
| Tie between two or more lowest stations (6 catalogue blanks: US Blanks 8'9"Y, 8'9"YX, 8'8" EPS, 8'8"X EPS, 9'6" EPS, 10'4"A SUP EPS) | R1, R2, acc 2 | resolved | The curve is exactly flat at the lowest value across the tie; `pchipMinimum` returns the printed minimum on 162 of 162 blanks. Accept when a test builds the tie list from the catalogue data (not typed) and asserts the sampled lowest equals the lowest printed station |
| Lowest station at an end of the blank | R1, R2 | resolved | None of the 162 does it; the sign rule covers first and last index; a synthetic two-case test is the guard |
| A thickest (or widest) printed station that is not the centre (9'9"B 0.063", 9'9"A 0.004"; 16 blanks widest away from C) | R3, R5, acc 3 | resolved | Drawn as printed (D-14); the fall is anchored on the thickest station; acceptance 3's exception list is computed from the data (blanks whose thickest printed thickness is not at `C`), expected 12 humps, all on the 9'9"B |
| A blank missing a cell for one attribute, or with fewer than two stations on a curve | R1 | resolved | The curve uses that attribute's own stations (`attributeCurve`); zero or one knot reads flat or 0 like `preparePchip` today; the four blanks `prepareBlank` rejects stay unpickable and are tested at the curve level only |
| The 162 vs 158 blank count | acc 1 | resolved | Curve-level test over all 162, `prepareBlank`-level over the 158 pickable |
| A start further in than the board's centre on a short board (a hand-set 36" start, board then shortened to 60") | R6 | resolved | Pulled into `thinningStartRange` on read (6" to half the length rounded in to 1/2"), nothing written; lengthening the board brings the stored value back. Accept: profile and slider show the pulled value, the stored field is unchanged |
| A start of exactly the centre (windows meet) or below 6" | R6 | resolved | Range max is half the length rounded down to the half inch so the two windows never overlap; the centre station reads the target thickness; below 6" is pulled up |
| A saved board that stores no start | R6, R8, acc 7 | resolved | Reads Automatic on both tips; opening writes nothing (the parser is pure; the report script only selects). Accept: parse leaves no key, deep-frozen input unchanged |
| A saved start that is not a number or out of bounds | R6, R8 | resolved | `.optional().catch(undefined)` reads it as Automatic and never rejects the board |
| A saved Phase 11 board | R8, acc 6 | resolved | Five numbers unchanged (existing tests, unmodified); the hidden stored tweak moves up to 0.03" (Open Question A) |
| The site is rolled back one deployment after a tips-step save | R6, R8 | resolved | Measured: deployed parser accepts the extra field (stripped) and any version; board opens on Automatic; a re-save on the old site drops the start |
| Signed-out or never-saved board | R6 | resolved | Lives in memory only (`design-store.tsx:12,143`); no local draft exists to carry the field |
| Metric display of the start and of the slider | R6, Rule 2 | resolved with a decision | One formatter family (cm per the screen design; Open Question B); Metric thumb off the 10 mm grid draws where the value is; the 6" and centre ends differ by up to 7.6 mm between profile and Metric slider (Q19.1) |
| A 12" tweak on top of a start moved in past 12" | R6, D-04 | resolved | The hump keeps its knots at the 12" station and adds on top of the taper; Automatic ignores it. Accept: with any start, the 12" thickness equals the taper's value plus the tweak exactly |
| Tip Style (Pin deck or Bottom) with a moved-in start | R7 | resolved | Thickness identical under both; only the surface the thinning comes off changes; Automatic invariant under Tip Style |
| The hand-set board with no blank | R4, acc 8 | resolved | Root rise and root fall through the five typed numbers, bit-exact at the stations; no Thinning Starts rows; the five reference screenshots of it change at the curves step only |
| A start set by hand that is too close (thin spot or bend; negative slope) | R6, D-05 | resolved with a decision | Drawn as set and flagged; not a new fit failure; negative-slope wording and the bend threshold are Open Question H |
| Automatic finds no steady start | R6, acc 3 | unresolved | 0 of 17,136 realistic tips, 10.7% of an extreme set; fallback 12" and whether to say anything is Open Question D |
| A tip needing more foam than the planer cut leaves (P(0) < tip) | R7 | resolved | As today (D-16): Pin deck lets the tip rocker fall, Bottom raises the deck; 7 stress boards already poke and none newly |
| Placement at the end of the slider (board tip 1/2" inside the blank end) | R4, R7 | resolved | Automatic is computed from the blank at that placement; the blank list judges each placement with its own Automatic starts |
| Boards longer than the app's own cap in the test set (291 of 1,635) | acc 3 | resolved | Report both sets; pictures and e2e use buildable boards (Open Question C) |
| Print: the starts line on the order form on both papers and every phone width | R6, D-12 | unresolved | UI-SPEC measured room; `summary-planing.spec.ts`'s fit case proves it (not run here) |
| Catalogue corrections after the pin | R8 | resolved | Pin blank rows by value |

## Prohibitions (for the SPEC)

| Prohibition (must-NOT statement) | Requirement | Status | Verification / Reason |
|----------------------------------|-------------|--------|-----------------------|
| The Phase 11 conversion must NOT change: `phase11-foil.ts` must never read a live curve or the live tip rule for Phase 11's own number | acc 6, constraint 5 | resolved | `phase11TwelveInch` re-prepares on `prepareBlankPchip`; `phase11-foil.test.ts` and the two Phase 11 tests in `design-snapshot.test.ts` pass unmodified; the sandbox failed all four without the self-pin |
| A blank's printed stations must NOT move, in the data or on any curve | R8, acc 1 | resolved | `sample(x_k) === y_k` for 4,946 values; no CSV, seed or catalogue file is written by this phase |
| Opening a saved board must NOT write to it; no database change | acc 7, D-06 | resolved | The parser is pure; the report script has one select; `schema.ts:71` shows the jsonb column, no migration; a gate that `drizzle/` and `lib/db/schema.ts` have no diff |
| A board with no stored start must NOT be rewritten with one (Automatic stays absent) | acc 7 | resolved | The mutator deletes the key; no code path writes a computed start into a snapshot |
| The curves go-live must NOT contain or import tips code, and must NOT change the 12" blend | D-15, D-16 | resolved | Commit order (Q20); a check that wave-1 commits do not touch `tip-taper.ts` or `boardOnBlank`'s tip branch; `slopeAt` lands with the tips |
| Nothing must be pushed, merged to main, deployed or run against production without the founder's go; nothing but rehearsal fixes after the Wed Oct 7 evening freeze | constraint 8, D-15 | resolved | The plan marks each push as a founder checkpoint; the D-18 reports are run by the founder |
| The tips step must NOT change any of a board's five station numbers when the start is 12" | acc 4 | resolved | Bit-exact on 16,350 values; the 12" station stays outside the window by the same float comparisons |
| Automatic must NOT read the 12" tweak, the Deck Skin or Tip Style | D-04 | resolved | `P` is `blankThickness − drop`; a test varies each and expects the same start |
| No formula may be inlined in a component; no `25.4`/`10` conversion outside `units.ts`; new geometry files import no React, browser API or database | Rule 1, Rule 2 | resolved | `lint`/review; the new formatters sit in `blank-reasons.ts` beside `formatDeckSkin` |
| No expected value may be hand-typed from this research | Rule 1 | resolved | Every new number comes from a generated fixture or is computed in the test from the catalogue |
| No second thickness curve for the deck | R3 | resolved | `deckAt = rockerAt + thicknessAt` (`board-profile.ts:123,196`); existing test |
| No new package | environment rule | resolved | none needed |
| No scratch `.ts`/`.cjs`/`.mjs` left under the repo or `.planning/` | environment rule | resolved | scratch archived as `tar.gz` (the Phase 14 research precedent) |
| No notice, marker or "what's new" on screen for redrawn boards | D-19 | resolved | e2e: no new text appears on opening a saved board |
| The saved-boards report must NOT print a snapshot, board name, user id or the connection string, and must NOT write | D-18 | resolved | Extend the existing script; its three-line contract and redaction stay; counts and maxima only |
| ↺ Reset Fine-Tune must NOT clear a Thinning Start; Fit & Tip Defaults must NOT gain a start | D-06, UI-SPEC | resolved | store test; no `user_preferences` column |
| The hand-set curves must NOT use today's PCHIP after the curves step, except through the frozen rule for the report | R4 | resolved | the pin test compares the frozen path only |

## Sources

### Primary (HIGH confidence): files opened this session
- `lib/geometry/pchip.ts`, `blank-fit.ts`, `board-profile.ts`, `blank.ts`, `foil.ts`, `phase11-foil.ts`, `design.ts`, `rocker.ts` (relevant ranges), `blank-reasons.ts` (60 to 275), `measure-display.ts`, `units.ts`, `planing.ts`, `board.ts:98-102`
- `lib/models/design-snapshot.ts` (whole), `lib/db/schema.ts`, `lib/db/client.ts`, `lib/design-history.ts`, `lib/fit-defaults-preference.ts:83-93`
- `scripts/check-saved-boards.ts`, `scripts/extract-phase11-foil-golden.ts`, `scripts/generate-preset-blanks.ts`
- `lib/geometry/phase11-foil.test.ts`, `presets.test.ts`, parts of `blank-fit.test.ts`, `board-profile.test.ts`, `volume.test.ts`, `rocker.test.ts`, `design-snapshot.test.ts`
- `components/design/design-store.tsx`, `slider-row.tsx`, `slider-row.test.ts`, `components/rocker/*` (controls, viewer, datasheet, board-on-blank, blank-flag, use-blank-list), `components/summary/order-form.tsx`, `components/viewer/two-option-toggle.tsx`
- 14-CONTEXT.md, 14-SPEC.md, 14-UI-SPEC.md (copywriting, interaction contract, tests sections), the completed todo (sections 1 to 8), the scratch archive (`lib.ts`, `shapes.ts`)
- `npm test` full run (JSON report), sandbox vitest runs (curves-only and curves+tips), all measurement scripts listed above

### Secondary (MEDIUM)
- Zod `.optional().catch()` behaviour: run in node against the installed 4.4.3, not read from docs.

### Tertiary (LOW)
- WebKit slowdown factor (carried from Phase 12's comment, not measured).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (nothing new)
- Architecture: HIGH (implemented in a sandbox, whole suite run, every acceptance figure reproduced)
- Pitfalls: HIGH (each observed, not guessed)
- Browser and print behaviour: MEDIUM (not run)

**Research date:** 2026-10-02
**Valid until:** the blank catalogue or any of `blank-fit.ts`, `board-profile.ts`, `design-snapshot.ts` changes (about 7 days at this pace)
