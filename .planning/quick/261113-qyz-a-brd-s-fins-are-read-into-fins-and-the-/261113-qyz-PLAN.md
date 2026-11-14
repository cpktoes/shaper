---
phase: quick-261113-qyz
plan: 01
type: execute
wave: 1
depends_on: [quick-261113-kvo, quick-261113-psx]
files_modified:
  - lib/geometry/fins.ts
  - components/fins/fin-controls.tsx
  - lib/geometry/brd-fins.ts
  - lib/geometry/brd-fins.test.ts
  - lib/export/brd-read.ts
  - lib/export/brd-read.test.ts
  - lib/export/brd.ts
  - lib/export/brd.test.ts
  - components/3d/export-cnc.ts
  - components/3d/three-d-screen.tsx
  - lib/geometry/brd-bottom.ts
  - lib/geometry/brd-rails.ts
  - lib/export/brd-fit-preview.ts
  - lib/export/brd-fit-preview.test.ts
  - lib/export/brd-look.ts
  - lib/export/brd-look.test.ts
  - lib/models/brd-board.ts
  - lib/models/brd-board.test.ts
  - components/setup/brd-fit-dialog.tsx
  - components/template/build-brd-overview-pdf.ts
  - components/template/build-brd-overview-pdf.test.ts
  - lib/export/brd-preview.ts
  - lib/export/brd-preview.test.ts
  - components/3d/brd-preview-dialog.tsx
  - components/3d/three-d-copy.ts
  - e2e/brd-fit-preview.spec.ts
  - e2e/three-d-export.spec.ts
  - .planning/quick/261113-qyz-a-brd-s-fins-are-read-into-fins-and-the-/pictures/
autonomous: true
requirements: [QYZ-F-IN-1-read, QYZ-F-IN-2-fit, QYZ-F-IN-3-show-open, QYZ-F-OUT-write, QYZ-ROUNDTRIP, QYZ-SPEED, QYZ-PIN]

estimate:
  tokens: 220000
  raw_tokens: 220000
  tasks: 4
  confidence: low
  # factor 1, no calibration samples. kvo planned 320k and used 150k on a heavier search; this fit is closed-form but the
  # change is wider (writer, reader, look, two dialogs, the paper, the 3D page). One executor, this worktree, four tasks in order.

must_haves:
  truths:
    - "A .brd whose fin line (p50) holds fins opens with them on FINS: side only -> Twin, side + centre -> the closest of Thruster / 2+1 / Twin Upright + Trailer, centre only -> Single Fin; FINS' own controls set so our calculated fins land on the file's, every value inside its control's range (QYZ-F-IN-2)"
    - "On the founder's twin (JFS_BigTwin.brd) it opens as Twin, Modern/Upright: in from the rail, toe-in and base length exact; off the tail 9\" against the file's 9 1/2\", because FINS' Aft/Forward position stops at +1 1/2\" — and the preview says so (QYZ-F-IN-2, QYZ-F-IN-3)"
    - "The app's own .brd carries the board's fins in p50 (cm, from the tail end, off the stringer) and its fin system in p51 for every setup but a quad; a quad's file has no fins and the Board file preview says why in one line (QYZ-F-OUT-write)"
    - "Written by the app, read back and fitted, every preset on every tail kind (and every winged board) comes back on the same setup and twin template, every off-tail, toe-in and base length within 0.01 mm and every in-from-the-rail within 1/16\" (QYZ-ROUNDTRIP)"
    - "The preview and the printed overview carry a FINS block (the file's fins beside ours as marks, the setup and system, how close, any control that stopped short) and draw the fins on the top view, the file's solid and ours dashed; the not-read line names cant and a quad's rear fins when the file has fins and says in one line when it has none (QYZ-F-IN-3)"
    - "The look fits the fins before the bottom and the rails, and fits those on the board with those fins, so the bottom that opens is the bottom the preview showed (a tail cut's Deepest At is kept from the front fins) (QYZ-F-IN-3)"
    - "Every figure of the six sample files with no fins (outline, rocker, thickness, bottom, wings, rails, the opened board incl. its fins and fin system) is what it was at this task's start, and every board written with no fin option is the same bytes (QYZ-PIN)"
    - "The fin fit adds a few milliseconds to the look (measured 0.2-3 ms; the look itself is 0.6-0.8 s), inside the existing background worker (QYZ-SPEED)"
  artifacts:
    - path: lib/geometry/brd-fins.ts
      provides: "BrdFileFins, brdFinsFromLine, fitBrdFins, BrdFinsFit, brdFinFields, brdFinSystemWord, finSystemFromBrdWord, BRD_FIN_TIE_MM"
    - path: lib/geometry/fins.ts
      provides: "FIN_BASE_LENGTH_RANGE_IN, FIN_POSITION_RANGE_IN, FIN_TOE_RANGE_IN, QUAD_REAR_OFF_RAIL_RANGE_IN, QUAD_REAR_OFF_TAIL_RANGE_IN — FINS' slider ranges, moved out of fin-controls.tsx unchanged"
    - path: lib/export/brd-read.ts
      provides: "readAnyBrd's board.fins (p50 and p51, bounded), parseBrdFinLine, brdFinWord"
    - path: lib/export/brd.ts
      provides: "BrdOptions.fins -> p51 and p50 in the header; no option = today's bytes"
    - path: lib/export/brd-fit-preview.ts
      provides: "BrdFitLook.fins, fins-first order, the FINS block, fin lines in BrdFitFrames.top, the new not-read rule"
    - path: lib/models/brd-board.ts
      provides: "brdBoardFields carries the fitted fins and fin system"
    - path: lib/export/brd-preview.ts
      provides: "BrdPreview.fins read back from the file's own bytes, and its one line of words"
  key_links:
    - from: lib/geometry/brd-fins.ts
      to: lib/geometry/design.ts designFinPlacement
      via: "every trial and every 'ours' figure is FINS' own placement on the board that opens"
    - from: lib/export/brd-fit-preview.ts brdFitLook
      to: lib/geometry/brd-bottom.ts brdFittedBottomBoard + lib/geometry/brd-rails.ts brdRailBoard
      via: "the fitted fin spec is passed in, so bottom stations kept from the front fins match the board that opens"
    - from: components/3d/three-d-screen.tsx
      to: lib/export/brd.ts brdText
      via: "brdFinFields(finPlacement, finSystem) through makeBrdExport into BrdOptions.fins"
---

# Quick 261113-qyz: fins both ways in a .brd

**F-IN** — a `.brd` that carries fins opens with them on FINS. **F-OUT** — the app's `.brd` export carries the board's
fins. The founder (2026-11-13): *"Try this, i think it has fin info. Also, we should export our fin info into the .brd
export if the format handles it."* Read `BRIEF.md` in this folder first (the format's fin facts, verified in AkuShaper).

Four tasks, so the F-OUT preview words stay in this plan (no follow-up split).

## What the planner measured (2026-11-13, figures only; scripts in `scratchpad/qyz/`)

S = `/private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad`. Every run is
`npx tsx` from the checkout root, on the tree as it stood mid-psx (the Tail Rail default being built). **Plan against the
code's shape, not these figures**: re-pin at your own start (Task 1 step 0).

### FINS' controls (read from the code, never restated)

| Control (FINS' words) | Field | Range, step (Imperial; Metric 1 mm) | Where it is defined today |
|---|---|---|---|
| Fin Base Length (forward, rear, centre; centre is "Fin Box Length" on Single and 2+1) | `baseLenForward/Rear/Center` + `…Overridden` | 2 1/2"–10 1/2", 1/8" | `BASE_LEN_BOUNDS`, `components/fins/fin-controls.tsx` |
| Aft/Forward position (forward pair, rear pair, centre) | `forwardPositionOffset`, `rearPositionOffset`, `centerPositionOffset` | ±1 1/2" from the template, 1/16" | `POS_BOUNDS`, same file |
| Toe-In (forward, rear) | `forwardToeOverride`, `rearToeOverride` | 0–1/2", 1/16" (the engine's `clampToe` holds the same) | `TOE_BOUNDS`, same file |
| Off-Rail tuner (forward pair) | `forwardOffRailNudge` | the held window 7/8"–2" from the rail (`offRailTunerWindow`, "forward") | `lib/geometry/fins.ts` |
| Setup, Twin template, Thruster model | `finSetup`, `twinTemplate`, `frontModel` | Single / Twin / Thruster / 2+1 / Quad; Modern/Upright, Keel, Upright + Trailer; Proportional, Basic, McKee Shortboard, McKee Gun | `FIN_SETUPS`, `TWIN_TEMPLATES`, `THRUSTER_FRONT_MODELS` |
| Fin system | `finSystem` (top of the snapshot) | FCS II, FCS (Original), Futures, Lokbox, Probox, Glass-On | `FIN_SYSTEMS` |

Template off-tails: Twin Upright 7 1/2", Keel 6 1/4", Upright + Trailer 10" (trailer 4"); Single and 2+1 centre 5 1/2";
2+1 side bites L/48 + 13 1/2"; Thruster front/centre from each model's formula. Toe and off-rail templates per setup are in
`computeFinPlacementInches`. Every field is already in a saved board (`finPlacementSpecSchema` holds all sixteen Advanced
fields incl. both nudges, and `finSystem` is top-level): **no database change.**

### The founder's twin (6'4 1/2", round tail fitted, no wings) — the file's four marks against ours, per twin template

The file: side fin back 9 1/2" off the tail, 5.20" off the stringer = **1.61" in from the rail** (on its own outline);
front 14.1" / 5.00" → **toe-in 0.20"**, **base 4.60"**; no centre fin; slot 8 = 5.4; p51 "Futures".
Values set as actual figures (clamped to the control's range; see My calls 1):

| Template | Off the tail | In from the rail | Toe-in | Base | Off the stringer (not a FINS mark) | Verdict |
|---|---|---|---|---|---|---|
| **Modern/Upright (chosen)** | 9" — **1/2" short** (12.7 mm): Aft/Forward position at its +1 1/2" end | 1.61" (0.00 mm) | 0.20" (0.00) | 4.60" (0.00) | 5.04" vs 5.20" (4.1 mm in) | closest without adding a fin |
| Keel | 7 3/4" — 1 3/4" short (44.5 mm) | exact | exact | exact | 4.62" | further |
| Upright + Trailer | 9 1/2" exact | exact | exact | exact | 5.19" (0.2 mm) | **adds a centre trailer at 4" the file doesn't have** — never offered for a side-only file |

On FINS' Imperial steps instead (1/16" position, nudge, toe; 1/8" base) Upright reads rail 0.33 mm, toe 0.32 mm, base
0.63 mm off as well. Aiming the side fin's off-the-stringer instead of its in-from-the-rail leaves Upright 1.45" from the
rail (4.1 mm off the file's mark): the in-from-the-rail aim is kept. The off-rail tuner's window is not a limit here.
Our outline sits 0.2 mm inside the file's at 9 1/2" (the outline fit), so the two in-from-the-rail figures agree.

The coordinator's AkuShaper test variants (S/fins/out):
- `varB_tri` (side as above + centre 3 1/2"–8"): Upright + Trailer reaches all six marks exactly; the closest Thruster
  (McKee SB) stops 0.23" short on the side fins → **opens as Twin, Upright + Trailer** (My calls 3).
- `varC_single` (centre 6"–14"): Single Fin, exact (position +1/2", box length 8").
- `varE_moved` (side 6"/4" → 12"/3": toe 1"): Twin, Keel exact on position; toe held at FINS' 1/2" top (12.7 mm short).

### x = 0 on every tail kind, and the round trip (the test with a known answer)

x = 0 is the board's tail-most point on every kind: a squash's or round's end, a pin's or diamond's point, a swallow's
points (the file squares the swallow there). FINS' "off the tail" is measured from the same station 0 of the outline, so it
is written as it is. Every outline read back starts at x = 0.0000 mm.

Each board below written by `brdText` with its fins in p50 (as F-OUT will), read back by `readAnyBrd`, outline fitted
(`fitBoardToBrd`), fins fitted by the rule in My calls 2–3, compared mark by mark with FINS' own on the original. 17 fin
cases per board: Single (default, moved), Twin Upright / Keel / Upright + Trailer (each default and moved), the four
Thruster models (default), Thruster Proportional and McKee SB moved, McKee Gun in whole millimetres (a Metric shaper's),
2+1 (default, moved). "Moved" = Aft/Forward ±1/8"–1/2", Off-Rail nudge ±1/16"–1/8", Toe-In set, a base length set.

| Boards | Cases | Same setup + twin template | Same Thruster model | Off tail / toe-in / base | In from the rail, worst | Fin fit |
|---|---|---|---|---|---|---|
| 4 presets × 5 tails (`phase16Boards`, hard): squash, swallow→squash, diamond→pin/round/squash, pin, round | 340 | **340** | 312 (the 28 others: a moved Thruster read back on another model that draws the same fins) | **0.00 mm** | **0.38 mm** (Mid-length 2+1) | 0.76 ms average |
| 4 presets × 7 wing variants (`phase16WingBoards`) | 476 | **476** | 434 (42 likewise) | **0.00 mm** | **0.88 mm** (a twin 1/2" behind wing 2) | 1.5 ms average |

The in-from-the-rail difference is the outline fit's (the file's drawn outline against FINS' sharp-cornered fins outline).

### A quad's front pair alone, if it were written (it is not: My calls 5)

Read back it would open as a Twin with the side fins short of the file by: Shortboard 2.00–2.09", Fish 1.63–1.75",
Mid-length 2.78–3.00", Longboard 4.03–7.69" (McKee Longboard). AkuShaper would name it TWIN.

### Does the fitted bottom care about the fins? Yes, on a file with fins

A tail cut's Deepest At (and channels' Start / Deepest At) are stored **from the front fins** (`resolveCut`, `bottom.ts`).
The look today fits the bottom on a board with a new board's fins (`brdFittedBottomBoard` → `designFinPlacement({ outline })`).
On the twin: front fins 11.23" (new board's Thruster) vs 9.00" (fitted twin). Its Panel Vee tail, fitted as today, deepest
0.44" off the tail; the same stored bottom opened with the twin's fins: deepest **0.00"** (clamped), closeness 0.697 →
0.710 mm. Fitted again on the board with the twin's fins: deepest 0.44", 0.697 mm — the same bottom as today. Hence the
fins-first order (Task 2). A file with no fins keeps a new board's fins, so its bottom cannot move.

### Time (Node, `performance.now`, this Mac at a load of ~6)

| File | Whole look today | Fin fit (all candidates) |
|---|---|---|
| JFS twin (3 sections) | 747 ms | 1.8 ms cold, 0.5 ms warm (2 candidates) |
| Fryer (4) | 819 ms | 0 (no fins) |
| Egg (4) | 568 ms | 0 (no fins) |

Side + centre files try six candidates: 0.2–3 ms each. Bottom and rails refitted on the fins' board make the same calls as
today on a different board: no added time. Drawing sizes (BigTwin, `brdFitFrames`): 0.402 dots/mm at 800 wide (a 4 5/8"
fin is ~47 dots, ~16 dots in from the rail, the 1/2" gap ~5 dots), 0.175 at 360 wide (~20 dots, ~7 dots, ~2 dots).

### Every sample file's fin line

Egg, Round Tail, Fryer, Scoop, mid, testLB: p50 all nine zeros (the Scoop has an empty p51, the rest none). The twin's p51
sits just before its p50 (the Scoop's order too); the app's writer has p50 after p41 and no p51 today.

## My calls (flag each in the SUMMARY for the founder)

1. **Actual values, not slider steps.** Each control is set to the figure that puts our fin on the file's, held inside
   the control's range — not rounded to its 1/16" (or 1/8") step. FINS' sliders already hold values off their Imperial step
   (every Metric shaper's whole millimetre does), the labels round for display, the founder's rule is "round only for
   display", and the wings fit keeps found values the same way. Measured: the round trip then comes back exact; snapped, the
   twin reads 0.3–0.6 mm off on three marks for no gain. A control stays at its template (no override, offset 0, nudge 0)
   when the file's figure is within 0.01 mm of it, so an unmoved board opens unmodified.
2. **Side only → Twin, Modern/Upright or Keel**, the closer; within 1/32" of each other, the one that moves FINS' controls
   least from its own template. Upright + Trailer is never chosen for a side-only file (it adds a fin), though it is the one
   template that reaches the founder's 9 1/2".
3. **Side + centre → the closest of Thruster (each front model), 2+1 and Twin Upright + Trailer**; candidates within 1/32"
   of the closest → the least moved (position offsets, nudge, toe and both bases against each template's own), then the
   fixed order McKee SB, McKee Gun, Basic, Proportional, 2+1, Upright + Trailer. The base length is the BRIEF's measured
   reason in practice: a 2+1's centre is a 10 1/2" box by default, a Thruster's a 4 1/2" fin, so a long centre leans 2+1 and a
   short one Thruster. Trailer is a candidate because a written Upright + Trailer must come back as itself (it does: 40 of
   40 on the presets, 56 of 56 winged; every unmoved Thruster comes back on its own model, every 2+1 as a 2+1). On the
   stock 6'0" Shortboard the twin's nine figures still open as Modern/Upright, 1/2" short (its in-from-the-rail reads
   1.29" there, the board being narrower). Consequence: the coordinator's `varB_tri` opens as **Upright + Trailer** (exact) rather than Thruster (0.23" short). If
   the founder wants AkuShaper's TRI always to open as a Thruster, that is one rule (prefer Thruster within 1/4") — ask.
4. **Centre only → Single Fin.**
5. **Write: Quad writes no fins** (p50 zeros, no p51 — the file is today's bytes) and the Board file preview says, in one
   line, *"A quad's fins aren't in the file: a .brd holds one side pair and a centre fin, so its front pair alone would read
   as a twin."* The founder's words were "if the format handles it", and it doesn't: the front pair alone would be named TWIN
   by AkuShaper and would read back 1.6–7.7" ahead of a twin's reach. Five-fin (quad + centre) the same.
   **2+1 writes the side bites + the centre box; Single writes the box** — the centre's length is FINS' Fin Box Length (10 1/2"
   by default), as FINS draws it, so AkuShaper draws a long centre fin. AkuShaper shows 2+1 and Upright + Trailer as TRI.
6. **p51** is written (only with fins) as FINS' own system name (`FIN_SYSTEMS` label), just before p50 as the founder's
   file has it; read only alongside fins, when it clearly names one of the six (a short spelling table: `FCS` alone is not
   clear). Otherwise the board opens on FCS II and the preview quotes the file's word — only if it is at most 32 plain
   characters; otherwise it says the file names a system FINS doesn't have, without quoting. p51's meaning is believed, not
   verified: the coordinator checks in AkuShaper.
7. **Slot 8 (5.4, believed cant) and slots 6–7 are never read and written as 0.0.** The words never quote slot 8.
8. **Fins drawn on the top view**: yes, a short line per fin from its back end to its front (a pair mirrored), the file's
   solid, ours dashed, on the screen and the paper (sizes above). The pictures in Task 4 are the check.
9. **The not-read line**: the sections part as today (no bottom / no rails), then, when the file has fins, *"Cant isn't
   read: FINS has no cant. A .brd holds one side pair and a centre fin, so it never carries a quad's rear fins."*; when it
   has none, *"The file has no fins: the board opens with the fins a new board starts with."*; when its fins don't sit on
   the board, *"The file's fin figures don't sit on the board, so it opens with the fins a new board starts with."* The six
   files' line changes words on purpose (today "Fins aren't read from the file: …").
10. **Fins first**: the look fits the fins on our fitted outline, then the bottom and rails on the board with those fins
    (measured reason above). The INPUTS a fin spec stores (board length, 12" tail width, tail shape — read only with Import
    Designed Board unticked) stay a new board's, and Import Designed Board opens ticked, as today.
11. **The 3D page's Fins switch still never reaches the file** (three-d-export test 4 keeps holding): the file carries
    FINS' placement and system, whatever the 3D view shows.
12. **Finding for the founder**: FINS' Twin Aft/Forward position stops 1/2" short of his twin (9" vs 9 1/2" on
    Modern/Upright, 1 3/4" on Keel). Widening the twin's range is a separate ask, not this task.

## Interfaces (Task 1 adds; Tasks 2–4 use these names)

- `lib/geometry/fins.ts`: `FIN_BASE_LENGTH_RANGE_IN`, `FIN_POSITION_RANGE_IN`, `FIN_TOE_RANGE_IN`,
  `QUAD_REAR_OFF_RAIL_RANGE_IN`, `QUAD_REAR_OFF_TAIL_RANGE_IN` — `{ min, max, step }` in inches, today's five component
  constants moved verbatim; `fin-controls.tsx` imports them.
- `lib/geometry/brd-fins.ts` (pure, Rule 1, no `lib/export` import):
  - `BrdFileFins` = `{ side: { back: P2; front: P2 } | null; centre: { back: Mm; front: Mm } | null; word: string | null;
    dropped: boolean }` — P2 is (from the tail, off the stringer) in mm; `word` the sanitized p51; `dropped` true when p50
    held a fin the rules refused.
  - `brdFinsFromLine(nineCm: readonly number[], outline: readonly P2[], length: Mm, word: string | null): BrdFileFins` — the
    reading rules (Task 1 action).
  - `BrdFinsFit` = `{ spec: FinPlacementSpec; finSystem: FinSystem; systemNamed: boolean; file: …marks; ours: …marks;
    gaps; largest: { gap: Mm; which: BrdFinMarkKey }; short: { control: BrdFinControlKey; by: Mm }[]; toeOut: boolean }`
    (name the inner types as you see fit; plain data only — it crosses the worker by structured clone).
  - `fitBrdFins(file: BrdFileFins, fileOutline: readonly P2[], outline: OutlineSpec): BrdFinsFit | null` — null when the
    file has no fin the rules kept.
  - `brdFinFields(placement: FinPlacementResult, system: FinSystem): BrdFinFields | null` with
    `BrdFinFields = { p50: readonly number[]; p51: string }` (nine numbers in cm) — null for a quad (any rear mark) or no marks.
  - `brdFinSystemWord(system)`, `finSystemFromBrdWord(word): FinSystem | null`, `BRD_FIN_TIE_MM = inchesToMm(1/32)`.
- `lib/export/brd-read.ts`: `ReadBrdBoard.fins: BrdFileFins`; `parseBrdFinLine(value: string): number[] | null`;
  `brdFinWord(value: string): string | null`.
- `lib/export/brd.ts`: `BrdOptions.fins?: BrdFinFields | null`.
- Task 2: `brdFittedBottomBoard(fit, fins?)`, `brdRailBoard(fit, bottom, fins?)` (optional `FinPlacementSpec`, a new
  board's by default); `BrdFitLook.fins: BrdFinsFit | null`; `brdBoardFields(fit, fileName, bottom?, rails?, fins?)` with
  `fins?: { spec: FinPlacementSpec; finSystem: FinSystem } | null`.
- Task 3: `BrdFitSheet.fins: BrdFitFinsBlock`, `closeness.fins`, `controls.fins`; `BrdFitFrames.top.fins: { file: [P2, P2][];
  fit: [P2, P2][] }`; `BrdPreview.fins`; `brdPreviewFinsWords`; `THREE_D_COPY.previewFins`, `THREE_D_COPY.exportQuadNote`.

<objective>
A `.brd` that carries fins opens with them on FINS, set by FINS' own controls so our calculated fins land on the file's, and
says how close on the preview and the printed overview; the app's own `.brd` export carries the board's fins and fin system
in the format's terms (per D-F-IN and D-F-OUT in BRIEF.md: the founder's two asks, locked word for word).

Purpose: a shaper's fin placement survives a trip through AkuShaper both ways, and a file from another shaper opens with
its fins instead of a new board's.
Output: `lib/geometry/brd-fins.ts` and its tests, the reader and writer changes, the look's fins-first order, the FINS
block on screen and paper, the Board file preview's fins line, browser tests b32 onward and three-d-export 13 onward, the
pictures, and six export files for the coordinator's AkuShaper check.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/CLAUDE.md
@/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/.planning/quick/261113-qyz-a-brd-s-fins-are-read-into-fins-and-the-/BRIEF.md
@/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/.planning/quick/261113-kvo-a-brd-s-rail-shapes-are-read-from-its-cr/261113-kvo-SUMMARY.md
@/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/lib/geometry/fins.ts
@/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/lib/geometry/design.ts
@/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/lib/export/brd.ts
@/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/lib/export/brd-read.ts
@/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/lib/export/brd-fit-preview.ts
@/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/lib/export/brd-preview.ts
@/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/lib/models/brd-board.ts

House rules: work only in `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17` (branch `close-bottom-17`), absolute
paths and `git -C`, never `cd` into a subfolder, never touch `/Users/kontoes/Code/shaper`; nothing is pushed. The dev
server on port 3117 is the founder's: reuse it with `PW_PORT=3117`, never stop it, never start another `next dev` or a
build, never run the whole browser suite. The sample files in `~/Downloads` (the four AkuShaper boards, `mid.brd`,
`testLB.brd`, `JFS_BigTwin.brd`) are never committed nor their text copied anywhere in the repo; figures only, and pictures
made from them go in this task's `pictures/`. Never copy BoardCAD's code. Rule 1 and Rule 2 (every fin placement number,
off-the-tail included, is a mark: whole millimetres in Metric) and plain English wherever a shaper reads. Board-file test
files open with `vi.setConfig({ testTimeout: 60_000 })`; never assert milliseconds. `e2e/board-file.spec.ts` f1 fails on
untouched code — known, not ours. Anchor on function names; re-read every file as it stands (psx will have moved it).
Scratch scripts go in S/qyz; the planner's are there (`lib.ts`, `bigtwin.ts`, `roundtrip.ts`, `quad.ts`, `time.ts`,
`bottomfins.ts`, `pin-look.ts`, `pin-export.ts`) — reuse, don't trust their figures.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1 (tracer): fins out in the app's .brd and back in, fitted to FINS' own controls</name>
  <files>lib/geometry/fins.ts, components/fins/fin-controls.tsx, lib/geometry/brd-fins.ts (new), lib/geometry/brd-fins.test.ts (new), lib/export/brd-read.ts, lib/export/brd-read.test.ts, lib/export/brd.ts, lib/export/brd.test.ts, components/3d/export-cnc.ts, components/3d/three-d-screen.tsx</files>
  <precondition>quick 261113-psx is committed and `git -C /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 status --short` lists nothing but this task's folder (and psx's own planning folder); the seven sample files exist in ~/Downloads.</precondition>
  <read_first>BRIEF.md (the format's fin facts), lib/geometry/fins.ts (computeFinPlacementInches, offRailTunerWindow, resetAdvanced, FIN_SYSTEMS), lib/geometry/design.ts (designFinPlacement), lib/export/brd.ts (BRD_MACHINE_FIELDS, brdText, readBrdText), lib/export/brd-read.ts (readAnyBrd's header loop), components/fins/fin-controls.tsx (the five bound constants), components/3d/three-d-screen.tsx (onExport) and components/3d/export-cnc.ts (makeBrdExport), S/qyz/lib.ts and S/qyz/roundtrip.ts (the planner's method)</read_first>
  <behavior>
    - The writer with no fin option writes today's bytes for all twenty phase16 hard boards (pin-export compare: 20 of 20).
    - With `fins: brdFinFields(placement, system)`: the header is p01–p04 then the machine fields with `p51 : <system label>` inserted just before p50, p50 holds the nine numbers through formatBrdNumber (side back x, y, front x, y; centre back x, front x; then 0.0, 0.0, 0.0), every curve line identical to the no-fins text; readBrdText reads it; a quad (or five-fin) gives null and today's bytes.
    - The reader keeps p50 and p51 only from the header (before the first curve); nine finite numbers within BRD_READ_MAX_CM or no fins; a side fin is kept only when 0 ≤ back x < front x ≤ length and each end's off-stringer size is above 0 and within the file's own outline half-width at its x (a negative off-stringer reads as its size: a pair is mirrored); a centre fin only when 0 ≤ back < front ≤ length; a refused fin sets `dropped`; slots 6–8 never read; p51 kept only as 1–32 characters of letters, digits, spaces and + - ( ) . / ' & with at least one letter, else null; the four AkuShaper files, mid and testLB read `{ side: null, centre: null, word: null, dropped: false }`.
    - finSystemFromBrdWord maps every FIN_SYSTEMS label back to itself and the spellings fcs2 / fcsii → FCS II, fcs1 / fcsi / fcsoriginal → FCS (Original), futures / futuresfins → Futures, glassed / glassedon → Glass-On (case, spaces and punctuation ignored); "FCS" alone and anything else → null.
    - fitBrdFins on a stock board whose p50 holds the founder's twin's nine figures: Twin, Modern/Upright; Aft/Forward position at +1 1/2" with `short` recording the position 1/2" (12.7 mm) short; off-rail, toe-in and base within 0.01 mm of the file's marks; finSystem futures; Keel and Upright + Trailer not chosen.
    - The round trip (the planner's 17 cases on each of the twenty phase16 hard boards and the twenty-eight phase16WingBoards): the same setup and twin template every time, the same Thruster model on every unmoved Thruster, every off-tail, toe-in and base length within 0.01 mm of FINS' own on the original, every in-from-the-rail within 1/16"; quad cases write no fins.
  </behavior>
  <action>
Step 0 (before any edit): pin. Run S/qyz/pin-look.ts with `write` to S/qyz/pin-look-before.json and S/qyz/pin-export.ts with `write` to S/qyz/pin-export-before.json (both `npx tsx`, from the checkout root). These are this task's baseline — the planner's trial pins are stale.

Ranges (per the BRIEF's "read it from the code"): move the five bound constants out of components/fins/fin-controls.tsx into lib/geometry/fins.ts as the exported FIN_BASE_LENGTH_RANGE_IN, FIN_POSITION_RANGE_IN, FIN_TOE_RANGE_IN, QUAD_REAR_OFF_RAIL_RANGE_IN, QUAD_REAR_OFF_TAIL_RANGE_IN, values unchanged, each with a one-line doc comment naming the FINS control; fin-controls.tsx imports them and drops its own (no other change there).

lib/geometry/brd-fins.ts (new, pure; header comment in the house style with the founder's 2026-11-13 words and the format's fin facts as verified in AkuShaper 3.1.3; written from those facts, never from another program's code):
- brdFinsFromLine: the reading rules in <behavior>, cm → mm through centimetresToMm, the half-width read off the file's outline by linear interpolation.
- fitBrdFins: the file's marks — side: off the tail = back x, in from the rail = the file outline's half-width at back x less back y, toe-in = back y less front y (a negative value sets toeOut and reads 0), base = front x less back x; centre: off the tail = back x, base = front x less back x. Candidates by content (My calls 2–4). For each: start from DEFAULT_FIN_PLACEMENT_SPEC with the setup, model / template and resetAdvanced(setup, template); read the template's own figures from designFinPlacement({ outline, fins, finsImportTemplate: true }) (forward off-tail from resolved.twinOffTail / sideOffTail / frontOffTail by setup, centre from resolved.centerOffTail, forward template off-rail from resolved.forwardOffRailTemplate, template toe from resolved.forwardToe); set forwardPositionOffset / centerPositionOffset to (file − template) held in FIN_POSITION_RANGE_IN; forwardOffRailNudge to (file in-from-rail held in offRailTunerWindow(template, "forward")) − template; forwardToeOverride to the file's toe held in FIN_TOE_RANGE_IN; baseLenForward / baseLenCenter to the file's base held in FIN_BASE_LENGTH_RANGE_IN with their Overridden flags true; but leave any control at its template (offset 0, nudge 0, override null, Overridden false) when the file's figure is within 0.01 mm of it (My calls 1). Record each hold as `short` (which control, by how much). Score each candidate by designFinPlacement on the final spec: the largest of the marks' gaps (side: off the tail, FINS' off-rail figure `lateralValue` against the file's in-from-the-rail, toe, base; centre: off the tail, base); choose the lowest, those within BRD_FIN_TIE_MM of it by the least moved (sum in inches of the two offsets, the held nudge, toe and both bases against the template's own), then the fixed order in My calls 3. Values are actual, never snapped (My calls 1). finSystem from finSystemFromBrdWord(file.word), "fcs2" when null (systemNamed false). Every inch figure through inchesToMm / mmToInches (lib/units-isolation.test.ts must stay green).
- brdFinFields: from FINS' marks — the right-hand front mark (side 1) is the side fin, the centre mark the centre fin; p50 = [side offTail, |lateral|, leadingOffTail, |leadingLateral|, centre offTail, centre leadingOffTail, 0, 0, 0] in cm through mmToCentimetres (zeros where a fin is absent); p51 = brdFinSystemWord(system) = the FIN_SYSTEMS label; null when any rear mark exists or there are no marks.

lib/export/brd-read.ts: parseBrdFinLine and brdFinWord (text handling stays here); in readAnyBrd's header loop keep p50's and p51's raw values only while no curve has been seen (as p01/p03/p04 are), and at the end set board.fins = brdFinsFromLine(...) on the read outline and length (a missing or unparsable p50 is no fins). Never keep any other header text. Update the module comment.

lib/export/brd.ts: BrdOptions.fins; in brdText, when it is given, write the machine fields with `p51 : <p51>` just before p50 and p50 as `[` nine formatBrdNumber values joined by commas `]`; otherwise exactly today's text. Update the header comment (p50/p51 now written from FINS; a quad's file has none; slot 8 always 0).

3D page (D-F-OUT): makeBrdExport takes the fin fields and passes them in BrdOptions; three-d-screen.tsx's onExport passes brdFinFields(finPlacement, finSystem) (take finSystem from useDesign). Update makeBrdExport's doc: the file carries FINS' placement and the fin system as well as the bare board; the 3D Fins switch still never reaches the file.

Tests: lib/geometry/brd-fins.test.ts (vi.setConfig 60 s; the founder's-twin figures on a stock board, the variant patterns of S/fins/variants.ts as figures, the round trip over phase16Boards hard and phase16WingBoards, each FIN_SYSTEMS label and spelling, the hold records, toeOut, the tie and least-moved order, a moved Thruster may return on another model with the same marks); lib/export/brd-read.test.ts (the rules, incl. the existing four-number p50 fixture reading no fins, a p50 after the curves ignored, an oversized or odd p51 → null); lib/export/brd.test.ts (keep the "exactly the proven header" test for no fins; add the fins variant; curve lines identical; quad null). Write the tests first and see them fail (RED), then implement (GREEN).
  </action>
  <verify>
    <automated>/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/vitest run --root /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 lib/geometry/brd-fins.test.ts lib/export/brd-read.test.ts lib/export/brd.test.ts lib/geometry/fins.test.ts lib/units-isolation.test.ts && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsc --noEmit -p /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/tsconfig.json && npm --prefix /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 run lint && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsx /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/qyz/pin-export.ts compare /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/qyz/pin-export-before.json</automated>
  </verify>
  <done>The round-trip suite is green on 48 boards × 17 cases (same setup and twin template every time, marks within the bars); the twin pattern opens as Modern/Upright with the position 1/2" short recorded; pin-export prints "20 of 20 boards write the same bytes"; the 3D page's Export hands FINS' fins to the writer (tsc clean); fin-controls.tsx reads its ranges from lib/geometry/fins.ts with no value changed. Commit: "A board file now carries the board's fins and fin system, and reading one back finds FINS' own settings for them".</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Open a .brd with its fins — fins first, then the bottom and rails on the board with those fins</name>
  <files>lib/geometry/brd-bottom.ts, lib/geometry/brd-rails.ts, lib/export/brd-fit-preview.ts (the look only), lib/export/brd-fit-preview.test.ts, lib/models/brd-board.ts, lib/models/brd-board.test.ts, lib/export/brd-look.ts, lib/export/brd-look.test.ts</files>
  <read_first>lib/export/brd-fit-preview.ts (brdFitLook, bottomOn, bottomSheetParts, railOutputs), lib/geometry/brd-bottom.ts (brdFittedBottomBoard), lib/geometry/brd-rails.ts (brdRailBoard, brdRailBegins), lib/geometry/bottom.ts (resolveCut: the tail's Deepest At from frontFins), lib/models/brd-board.ts, lib/export/brd-look.ts, S/qyz/bottomfins.ts</read_first>
  <behavior>
    - brdFittedBottomBoard(fit) and brdRailBoard(fit, bottom) with no fins argument are exactly today's (every existing brd-bottom / brd-rails / brd-fit-preview test passes unchanged).
    - brdFitLook fits the fins right after the outline (fitBrdFins(board.fins, board.outline, first.outline)) and passes the fitted spec (a new board's when null) to every board the bottom and rails are fitted and measured on, in both orders; look.fins holds the fit.
    - The twin's fitted bottom is measured on the board with the twin's fins, and the stored bottom resolves on that board to the stations the preview measured (Panel Vee deepest 0.44" off the tail, not 0.00").
    - brdBoardFields carries fins and finSystem when given; a file with no fins opens with DEFAULT_FIN_PLACEMENT_SPEC, finsImportTemplate true and "fcs2", byte-for-byte as today; readBoardEntry accepts every fitted spec.
    - brdLookFromBytes's fields for the twin hold the Twin, Modern/Upright spec and finSystem futures; the look survives structuredClone with nothing lost.
  </behavior>
  <action>
Per D-F-IN (BRIEF, "Open as a Board opens with them on FINS") and My calls 10:
- brd-bottom.ts: brdFittedBottomBoard gains an optional fins spec (a new board's by default) passed to designFinPlacement({ outline, fins, finsImportTemplate: true }); update its comment (the board that opens, its fins included).
- brd-rails.ts: brdRailBoard gains the same optional argument, passed through to designBottomBoard's placement; brdRailBegins keeps calling it without (no bottom, so fins do not matter there — say so in a comment).
- brd-fit-preview.ts: BrdFitLook.fins; in brdFitLook fit the fins after `first`, then thread the spec through bottomOn (both fitBottomToBrd's board0 and measureBrdBottom's board), onBoard, the flat rails-first board and railsFirst; in bottomSheetParts and railOutputs pass look.fins?.spec. The outline is never refitted after `first` (sameOutlineAs), so one fin fit holds for every step — assert that in a test. Update brdFitLook's doc comment with the fins-first rule and the measured reason.
- brd-board.ts: brdBoardFields takes `fins?: { spec; finSystem } | null`; fields.fins / finSystem from it, else today's. Doc comment: the fins open on FINS the way the rails open on RAILS.
- brd-look.ts: pass look.fins (spec and finSystem) to brdBoardFields.
Tests first (RED): brd-fit-preview.test.ts (the twin pattern built from a stock board's own file with the twin's nine figures — never the founder's file; fins-first threading; a no-fins look identical to a look computed with the fins argument absent), brd-board.test.ts, brd-look.test.ts. Then implement (GREEN). Then run S/qyz/pin-look.ts compare against pin-look-before.json: the six no-fins files must print "identical" (their fields' fins and fin system included); JFS_BigTwin.brd changes only in its fins, its fields' fins and finSystem, and its bottom's stored tail Deepest At (the same absolute station) — check that by hand and say so in the SUMMARY.
  </action>
  <verify>
    <automated>/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/vitest run --root /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 lib/export/brd-fit-preview.test.ts lib/models/brd-board.test.ts lib/export/brd-look.test.ts lib/geometry/brd-bottom.test.ts lib/geometry/brd-rails.test.ts lib/geometry/brd-fins.test.ts && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsc --noEmit -p /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/tsconfig.json && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsx /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/qyz/pin-look.ts compare /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/qyz/pin-look-before.json</automated>
  </verify>
  <done>Open as a Board on a file with fins lands with them in the kept board (FINS reads them), the bottom that opens is the bottom the look measured, and the six no-fins files are identical to the pin in every figure. Commit: "Opening a board file with fins sets FINS to match them, and its bottom is fitted with those fins in place".</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Say it and draw it — the FINS block on the preview and the paper, and the fins line on the Board file preview</name>
  <files>lib/export/brd-fit-preview.ts (copy, sheet, frames), lib/export/brd-fit-preview.test.ts, components/setup/brd-fit-dialog.tsx, components/template/build-brd-overview-pdf.ts, components/template/build-brd-overview-pdf.test.ts, lib/export/brd-preview.ts, lib/export/brd-preview.test.ts, components/3d/brd-preview-dialog.tsx, components/3d/three-d-copy.ts</files>
  <read_first>lib/export/brd-fit-preview.ts (BRD_FIT_COPY, brdFitSheet, wingLines, railsSheetParts, framesAt), components/setup/brd-fit-dialog.tsx (RailsBlock, the top-view svg), components/template/build-brd-overview-pdf.ts (how RAILS rides page 2, stroke()), lib/export/brd-preview.ts (brdPreview, brdPreviewWords), components/3d/brd-preview-dialog.tsx (swallowNote / channelsNote), components/3d/three-d-copy.ts, components/fins/fin-controls.tsx (the control words to copy)</read_first>
  <behavior>
    - The sheet of a file with fins has a FINS block: caption FINS, rows Side fins — off the tail / in from the rail / toe-in / base length and Centre fin — off the tail / base length (only the fins the file has), The file and Our fit as marks (whole mm in Metric, keepFiguresTogether on screen); a Fins HOW CLOSE line ("Fins: less than 1/16" off" or "Fins: within X, the widest gap the side fins' distance off the tail"); a Fins controls line in FINS' own words and figures (the model header, the system label, then per group FINS' slider labels with the figure each label shows); notes for every hold (the twin: our side fins sit 1/2" nearer the tail, FINS' Aft/Forward position going no further than 9"), a toe-out note, and an unnamed-system note quoting the file's word only when it was kept.
    - A file with no fins has no FINS block and no fin lines; its not-read line follows My calls 9; the six files' preview words change only in that line.
    - BrdFitFrames.top.fins holds one segment per fin (a pair mirrored), the file's from board.fins and ours from FINS' marks on the board that opens, through the same station and centre transforms as the outlines; the dialog draws the file's solid in the outline ink and ours dashed like the fit's outline; the PDF draws the same with its file / fit strokes.
    - The printed overview carries FINS after RAILS on the same page when it fits, else with RAILS on a third page; every real file stays at most two pages.
    - The Board file preview (3D) reads the fins back from the file's own bytes and shows one line ("Fins in the file: a side pair … off the tail and … in from the rail, and a centre fin … off the tail — AkuShaper shows this as TRI." / TWIN / SINGLE, figures as marks); a quad shows THREE_D_COPY.exportQuadNote instead.
  </behavior>
  <action>
Words (D-F-IN-3, D-F-OUT; My calls 5, 8, 9): add to BRD_FIT_COPY the FINS caption, the six row labels, a Fins close sentence (through lessThan / formatMarkOrLess, the one "less than" rule), the controls line, the hold / toe-out / system notes and the three not-read lines of My calls 9; FINS' control words (Aft/Forward position, Off-Rail, Toe-In, Fin Base Length, Fin Box Length) copied from fin-controls.tsx with a test holding each equal to that file's text, as kvo did for RAILS. The not-read rule: today's sections part (notRead / notReadAfterBottom / nothing when rails were read) joined with the fins part. Retire notReadAfterRails (its words are replaced).
Sheet and frames: BrdFitSheet.fins (a `{ read: true; caption; rows; notes }` block or absent), closeness.fins, controls.fins; framesAt adds top.fins. Ours come from designFinPlacement on the opened board's outline with look.fins.spec (never recomputed differently from Task 2).
Dialog: a FinsBlock after RailsBlock (data-brd-fit-fins, rows data-brd-fit-fins-row, the close line data-brd-fit-close-fins, the controls line data-brd-fit-control="fins"); the fin segments in the top svg as `line` elements with data-brd-fit-fin="file" / "fit", strokes matching the outlines (the file's ink, ours with railLineProps). Paper: the FINS block in the overview's item list after RAILS, the fin segments in the top view via stroke().
Board file preview: brdPreview reads p50 / p51 from read.header through parseBrdFinLine and brdFinsFromLine (on the preview's own outline and length) into BrdPreview.fins; brdPreviewFinsWords(preview, system) builds the line (AkuShaper's names: side only TWIN, side + centre TRI, centre only SINGLE — the coordinator's AkuShaper finding of 2026-11-13); the dialog shows it (data-brd-preview-fins) under the facts line, and exportQuadNote (data-brd-preview-quad) when the 3D screen passes quadNote (its effectiveFins.finSetup is "quad"), the same way as swallowNote. three-d-screen.tsx needs only that one boolean added to `prepared`; keep the exportDone line as it is.
Tests first (RED) in brd-fit-preview.test.ts, build-brd-overview-pdf.test.ts (FINS present with fins, absent without; page counts; RAILS still after BOTTOM), brd-preview.test.ts (the fins read back equal the written marks; each line form; quad). Then GREEN. Update existing expectations that read the retired not-read line, on purpose, and list them in the SUMMARY.
  </action>
  <verify>
    <automated>/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/vitest run --root /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 lib/export/brd-fit-preview.test.ts components/template/build-brd-overview-pdf.test.ts components/template/build-overview-pdf.test.ts lib/export/brd-preview.test.ts lib/export/brd.test.ts lib/geometry/brd-fins.test.ts lib/units-isolation.test.ts && /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/tsc --noEmit -p /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/tsconfig.json && npm --prefix /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17 run lint</automated>
  </verify>
  <done>The preview and the overview say the file's fins beside ours, how close, what FINS was set to and what stopped short, and draw both on the top view; a no-fins file says so in its not-read line; the 3D Board file preview says what fins the file carries or why a quad carries none. Commit: "The board file preview and its printed overview show the file's fins beside ours, and the 3D page's preview says which fins its file carries".</done>
</task>

<task type="auto">
  <name>Task 4: Browser tests, pictures, and six export files for the AkuShaper check</name>
  <files>e2e/brd-fit-preview.spec.ts, e2e/three-d-export.spec.ts, .planning/quick/261113-qyz-a-brd-s-fins-are-read-into-fins-and-the-/pictures/</files>
  <precondition>The dev server answers on http://localhost:3117 (curl it; never start one).</precondition>
  <read_first>e2e/brd-fit-preview.spec.ts (b20–b31: how files are built in-test with the app's writer and picked), e2e/three-d-export.spec.ts (keepBoard, openPreview, savePreview, test 4), S/kvo/shoot (the kvo picture script) and S/kvo/pdfcheck.py</read_first>
  <action>
brd-fit-preview.spec.ts, from b32 (files built in-test from the app's own writer; the founder's twin only as its nine figures in p50 with "Futures" in p51, on a preset board): b32 a twin file's FINS block, rows and lines equal the sheet's, the top view draws two file and two fit fin lines inside the drawing, the not-read line is the fins one (desktop and both phones; on a phone nothing runs off the right and no figure is split from its unit); b33 Open as a Board: the kept board's fins and finSystem equal the fields, and FINS shows Twin, Modern/Upright active and, with Advanced open, the Aft/Forward position, Off-Rail, Toe-In and Fin Base Length labels as fitted (desktop); b34 a side + centre file opens as a Thruster and a centre-only file as a Single Fin (desktop); b35 a no-fins file: no FINS block, no fin lines, the "has no fins" not-read line, Open as a Board keeps a new board's fins (desktop); b36 Metric: the FINS rows in whole millimetres (desktop); b37 the printed overview of the twin is at most two pages and carries FINS (desktop). Update b13 / b21 / b23 / b26 for the new not-read words.
three-d-export.spec.ts, from 13: a thruster board's downloaded file holds p51 FCS II and p50's nine numbers equal to FINS' marks in cm (within 1e-9), and the preview's fins line says TRI; 14: a quad board's file holds nine zeros and no p51, and the quad line shows. Test 4 (switches never change the bytes) must stay green untouched.
Run with PW_PORT=3117: the two specs only. board-file.spec.ts f1 is the known failure.
Pictures (pictures/, from a scratch Playwright script against 3117 in the kvo way): the preview of JFS_BigTwin.brd on a computer and an iPhone (the FINS block and the top view's fin lines), in Metric, of S/fins/out/varB_tri.brd and varC_single.brd, of the Egg (no fins); FINS after Open as a Board on the twin with Advanced open; the 3D Board file preview of a thruster and of a quad; the twin's overview PDF and its page images. Look at every one before calling a drawing done; say in the SUMMARY whether the fin lines stay legible on the phone (My calls 8).
AkuShaper check files: with a scratch script (npx tsx, the app's own brdFile with fins) write six files of the stock 6'0" Shortboard to S/fins/export/: single.brd, twin.brd (Modern/Upright), twin-trailer.brd, thruster.brd, 2plus1.brd, quad.brd. Not committed; list them with their nine numbers in the SUMMARY for the coordinator.
Last: pin-look compare and pin-export compare once more (the six no-fins files identical; 20 of 20), and the time of the whole look on the twin and the Egg before and after (Node, as S/qyz/time.ts; report, never assert).
  </action>
  <verify>
    <automated>PW_PORT=3117 /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/node_modules/.bin/playwright test -c /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/playwright.config.ts brd-fit-preview three-d-export && python3 /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/kvo/pdfcheck.py /Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17/.planning/quick/261113-qyz-a-brd-s-fins-are-read-into-fins-and-the-/pictures/*.pdf && ls /private/tmp/claude-501/-Users-kontoes-Code-shaper/4bd02881-795f-4931-8d36-b0c262541886/scratchpad/fins/export/</automated>
  </verify>
  <done>Both specs green on desktop, iPhone and Android (where each test runs); the pictures are in pictures/ and looked at; the six AkuShaper check files exist; the pins compare clean. Commit: "Browser tests open a board file's fins on a computer and both phones and check the 3D page's file carries them, with pictures of the founder's twin".</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| picked file → reader | a `.brd` is anyone's text: p50's figures and p51's word cross here |
| reader → screen / paper | the file's fin word is the one piece of file text ever shown |
| board → exported file | FINS' placement and system leave the app in the file |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-qyz-01 | Tampering / DoS | readAnyBrd p50 | medium | mitigate | header only, nine finite numbers within BRD_READ_MAX_CM or none; fins off the board or front-behind-back refused; the fit is closed-form over at most six candidates (no loop over file data) |
| T-qyz-02 | Information disclosure | p51 word | medium | mitigate | kept only as 1–32 plain characters with a letter, read only beside fins, never logged; every other header text still dropped on the spot; the founder's file is never committed nor its text copied |
| T-qyz-03 | Tampering | fitted fin spec | low | mitigate | every value held in its FINS control's range; the fields re-read through readBoardEntry |
| T-qyz-04 | Tampering (integrity) | brdText fins | low | mitigate | written only from FINS' own placement and the stored system; a quad writes none; the 3D switches never reach the file (three-d-export 4) |
| T-qyz-05 | Repudiation | AkuShaper's names in our words | low | accept | TWIN / TRI / SINGLE verified by the coordinator in AkuShaper 3.1.3 on 2026-11-13; p51's meaning is believed and is checked again with the six export files |
</threat_model>

<verification>
- Unit: brd-fins, brd-read, brd, fins, brd-fit-preview, brd-look, brd-board, brd-bottom, brd-rails, build-brd-overview-pdf, build-overview-pdf, brd-preview, units-isolation green; `tsc --noEmit` clean; `npm run lint` 0 errors.
- Pins: pin-look compare — the six no-fins files identical in every figure; pin-export compare — 20 of 20 boards the same bytes.
- Browser (PW_PORT=3117): brd-fit-preview and three-d-export green; board-file f1 the known failure only.
- No sample file, its text or a scratch script in the repo; the working tree holds only the commits' files and this folder.
</verification>

<success_criteria>
- The founder's twin opens on FINS as Twin, Modern/Upright with rail, toe-in and base exact and the 1/2" position shortfall said plainly on screen and paper.
- An app-written board round-trips on every preset, tail kind and wing variant to the same setup and template, marks within the bars.
- The app's .brd carries the fins and system for Single, Twin, Thruster and 2+1; a quad's carries none and says why.
- Nothing about the six no-fins files moves but the not-read line's words; the look's time grows by a few milliseconds.
</success_criteria>

<output>
Create `.planning/quick/261113-qyz-a-brd-s-fins-are-read-into-fins-and-the-/261113-qyz-SUMMARY.md` when done: the measured tables re-run on
the shipped code (the twin's four marks per template, the round trip, the time), the pins' outcome, every existing test
changed on purpose, the six export files' names and nine numbers, the pictures and what was seen, and My calls flagged for
the founder.
</output>
