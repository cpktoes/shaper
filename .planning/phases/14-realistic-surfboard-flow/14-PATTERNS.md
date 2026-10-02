# Phase 14: Realistic Surfboard Flow - Pattern Map

**Mapped:** 2026-10-02
**Files analyzed:** 36 (8 new, 28 modified)
**Analogs found:** 35 / 36 (one has no in-repo analog: the per-tip thinning mark's exact look)

Names follow CONTEXT.md and the approved 14-UI-SPEC.md. Names that RESEARCH proposes (not yet in any approved document) are marked "research's proposal": `prepareRootCurve`, `prepareBlankPchip`, `noseThinningStart`, `tailThinningStart`, `thinningStartSlider`, `thinningStartLine`, `slopeAt`, `tipRule`, `boardInputOf`.

## File Classification

### Curves step (go-live 1, no tips code)

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `lib/geometry/root-curve.ts` (new) | utility (pure curve) | transform | `lib/geometry/pchip.ts` | exact |
| `lib/geometry/root-curve.test.ts` (new) | test | transform | `lib/geometry/pchip.test.ts` + `blank-fit.test.ts:102-135` | exact |
| `lib/geometry/blank-fit.ts` (`prepareBlank`, add frozen `prepareBlankPchip`) | service (pure) | transform | itself, `attributeCurve` + `prepareBlank` (`:111-146`) | exact |
| `lib/geometry/phase11-foil.ts` (self-pin to PCHIP) | utility | transform | itself (`phase11TwelveInch :50-69`) | exact |
| `lib/geometry/board-profile.ts` (`buildFallbackProfile` on root rule) | service (pure) | transform | itself (`:107-116`) | exact |
| `lib/geometry/foil.ts` (`sampleFoil` default thickness) | utility | transform | itself (`:107`) | exact |
| `scripts/extract-phase14-today-golden.ts` (new, the pin) | script | batch / file-I/O | `scripts/extract-phase11-foil-golden.ts` | exact |
| `lib/geometry/__fixtures__/phase14-today-golden.json` + pinned blank rows (new, generated) | fixture | file-I/O | `phase11-foil-golden.json` + `phase11-foil-golden-blanks.json` (`scripts/extract-phase11-golden-blanks.ts`) | exact |
| `lib/geometry/blank-fit.test.ts`, `board-profile.test.ts`, `volume.test.ts`, `rocker.test.ts` (retarget) | test | transform | themselves (Q7 list) | exact |
| `scripts/check-saved-boards.ts` (`--curves-report`) | script | batch, read-only | itself | exact |

### Tips step (go-live 2)

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `lib/geometry/pchip.ts` (add `slopeAt`, research's proposal) | utility | transform | itself (`:85-148`) | exact |
| `lib/geometry/tip-taper.ts` (new) | utility (pure) | transform | `lib/geometry/pchip.ts` (module shape) + `blank-fit.ts:322-351` (the rule it replaces) | role-match |
| `lib/geometry/tip-taper.test.ts` (new) | test | transform | `blank-fit.test.ts` "named geometry tests" (`:297`) + `pchip.test.ts` | role-match |
| `lib/geometry/blank-fit.ts` (`boardOnBlank`, `runsOutCause`, `BoardOnBlankInput`) | service (pure) | transform | itself (`:294-351`, `:417-440`) | exact |
| `lib/geometry/blank.ts` (`BoardBlank`, `RunsOutCause`) | model/types | CRUD | `deckSkin` / `tipStyle` on `BoardBlank` (`:99-104`) | exact |
| `lib/models/design-snapshot.ts` (`boardBlankSchema`) | model/validation | request-response | `deckSkin`/`tipStyle` lines (`:190-206`) | exact |
| `lib/models/design-snapshot.test.ts` | test | transform | itself (`:285-420`) | exact |
| `components/design/design-store.tsx` (`setThinningStart`, `useAutomaticThinningStart`, `pickBlank`) | store | event-driven | `setDeckSkin` / `setTipStyle` / `pickBlank` (`:897-961`) | exact |
| `lib/geometry/blank-reasons.ts` (`thinningStartSlider`, `thinningStartHint`, `thinningStartLine`, `formatThinningStart`, `runsOutClause` new case) | utility (words) | transform | `placementSlider` / `formatPlacement` / `deckSkinHint` / `runsOutClause` | exact |
| `lib/geometry/blank-reasons.test.ts` | test | transform | itself | exact |
| `components/rocker/rocker-controls.tsx` (two rows, intro line, comments) | component | request-response | Tip Style block `:427-441` + Placement/Deck Skin rows in `board-on-blank.tsx:140-166` | exact |
| `components/design/slider-row.tsx` (`hintAction`, research's name for what UI-SPEC says is new) + `slider-row.test.ts` | component | request-response | itself (`leftHint`/`rightHint`/`note`, `:40-95`) | exact |
| `components/rocker/rocker-viewer.tsx` (the faint mark) | component | transform | blank silhouette + baseline in same `<g>` (`:732-760`), `KNOT_DOT_PX`/`BLANK_LINE_PX` (`:120-130`) | role-match |
| `components/rocker/rocker-datasheet.tsx` (DATASHEET line) | component | request-response | `Row` / `GroupLabel` / `READ_ONLY_CELL` (`:78-125`) | exact |
| `components/summary/order-form.tsx` (printed line with tips and planing) | component | transform | PLANING table block (`:686-745`) | exact |
| `lib/geometry/planing.ts` (+ `thinning` field on `PlaningTable`) + `planing.test.ts` | utility (words) | transform | itself (`:44-140`) | exact |
| `components/rocker/blank-flag.tsx`, `components/rocker/use-blank-list.ts`, `lib/geometry/design.ts`, `lib/geometry/board-profile.ts`, `components/design/design-store.tsx` sideProfile memo, `scripts/check-saved-boards.ts` (the six board-input sites) | component/service | transform | each other (identical hand-copied blocks) | exact |
| `scripts/check-saved-boards.ts` (`--tips-report`) | script | batch, read-only | itself | exact |
| `e2e/rocker-blanks.spec.ts`, `e2e/rocker-cut.spec.ts`, `e2e/summary-planing.spec.ts`, `e2e/touch-sizing.spec.ts` (extend) | e2e test | request-response | themselves | exact |

## Pattern Assignments

### `lib/geometry/root-curve.ts` (utility, transform) — new

**Analog:** `lib/geometry/pchip.ts`. Pure file, no React/browser/DB import (CLAUDE.md Rule 1), loud errors on bad knots, copies its knot arrays.

**Interface to extend** (`pchip.ts:85-90`):
```typescript
export interface PreparedPchip {
  readonly xs: readonly number[];
  readonly ys: readonly number[];
  readonly slopes: readonly number[];
  sample(x: number): number;
}
```

**Sampler posture to match** (`pchip.ts:122-145`): empty curve samples 0; non-finite x returns first knot's y; clamps past either end; binary search `lo/hi`; Hermite basis `h00/h10/h01/h11`. The root curve must keep these postures and add "return `ys[k]` at a knot" (RESEARCH Pattern 2, Pitfall 3).

**Core pattern** (RESEARCH Code Examples, "tested forms from the sandbox"; copy rather than rediscover): `prepareRootCurve(points, kind: "rise" | "fall")` (research's proposal). Anchor = lowest station for `"rise"` (bottom), thickest for `"fall"` (thickness, width); `g` = `preparePchip` through signed square roots, `f = anchor ± g²`, `sample` snaps to `ys[lo]` when `xs[lo] === x`. Ties take the first lowest index.

**Exact low point works unchanged:** `pchipMinimum(curve, from, to)` (`pchip.ts:160-169`) reads only `xs`, `ys`, `sample`, so `levelCurve` in `blank-fit.ts` accepts a root curve.

**Do not** add a second positional parameter anywhere that `prepareBlank` is passed to `.map` (`lib/blanks/preset-blanks.test.ts:27`, `scripts/generate-preset-blanks.ts:58`).

---

### `lib/geometry/root-curve.test.ts` (test) — new

**Analog:** `lib/geometry/pchip.test.ts` for file shape, and `blank-fit.test.ts:102-135` for the "every seeded blank, every attribute" loop.

**File shape** (`pchip.test.ts:1-30`): import `describe, expect, it` from vitest; small named point arrays (`INCREASING`, `DECREASING`, `FLAT`); local helpers `xsOf`/`ysOf`; one `describe` per behaviour with the decision id in the title.

**Every-blank loop to retarget** (`blank-fit.test.ts:109-135`, currently builds its own `preparePchip` so it goes vacuous — Pitfall 2):
```typescript
for (const blank of CATALOG) {
  for (const pick of attributes) {
    const knots = blank.stations
      .filter((s) => pick(s) !== null)
      .map((s) => ({ x: s.fromTailMm as number, y: pick(s) as number }));
    if (knots.length < 2) continue;
    const curve = preparePchip(knots);   // <- becomes prepareRootCurve(knots, kind)
```
Per RESEARCH Q3, the 162-blank "exact at every station" test runs at curve level; the 158-blank test goes through `prepareBlank` (four blanks throw "has no thickness at its centre station"). Add a synthetic test for a lowest station at an end (the catalogue has none). Compute the 9'9"B-style exception list from data ("blanks whose thickest printed station is not `C`"), never typed.

**Expected values:** the headline scores (0.112" to 0.035" etc.) come from the pin generator, root scores computed live; blank rows pinned by value (Pitfall 9). Never hand-transcribe (Rule 1).

---

### `lib/geometry/blank-fit.ts` — `prepareBlank` + `prepareBlankPchip` (service, transform)

**Analog:** itself, `attributeCurve` + `prepareBlank` (`:111-146`).

**Current code to switch** (`blank-fit.ts:111-146`):
```typescript
function attributeCurve(
  stations: readonly BlankStation[],
  pick: (station: BlankStation) => Mm | null,
): PreparedPchip {
  const points: { x: number; y: number }[] = [];
  for (const station of stations) {
    const value = pick(station);
    if (value !== null) points.push({ x: station.fromTailMm, y: value });
  }
  return preparePchip(points);
}

export function prepareBlank(record: BlankRecord): PreparedBlank {
  const copy: BlankRecord = { ...record, stations: record.stations.map((station) => ({ ...station })) };
  const centre = copy.stations.find((station) => station.label === "C");
  if (!centre || centre.thicknessMm === null) {
    throw new Error(`${copy.vendor} ${copy.name} has no thickness at its centre station`);
  }
  const rockerCurve = attributeCurve(copy.stations, (station) => station.rockerMm);
  return {
    record: copy, lengthMm: copy.lengthMm, centerThicknessMm: centre.thicknessMm,
    rocker: levelCurve(rockerCurve, 0, copy.lengthMm),
    thickness: attributeCurve(copy.stations, (station) => station.thicknessMm),
    width: attributeCurve(copy.stations, (station) => station.widthMm),
  };
}
```
**Assignment (RESEARCH Q9, "a named function over one shared internal"):** `prepareBlankWith(record, rule)` internal; `prepareBlank(record)` = root (live); `prepareBlankPchip(record)` = today's rule, 3 lines (research's proposal). `attributeCurve` takes a `"rise" | "fall" | "pchip"` choice. Bottom = `"rise"`, thickness and width = `"fall"`. The tail/nose hump (`:353-362`) stays on `preparePchip` (D-04).

**Memo keys are untouched:** `design-store.tsx:765` keys `preparedBlank` on `state.blank?.copy` identity; `use-blank-list.ts:57` on the catalogue array.

---

### `lib/geometry/phase11-foil.ts` (utility, transform) — self-pin

**Analog:** itself. It reads `prepared.thickness.sample(u)` at `:61` and calls the live `boardOnBlank` at `:93`.

**Assignment:** inside `phase11TwelveInch` (`:50-69`) re-prepare from `prepared.record` with `prepareBlankPchip` (the private copy `prepared.record` carries) so constraint 5 cannot be broken by whoever edits the live switch. The `phase11-foil.test.ts` tests (and the two Phase 11 tests in `design-snapshot.test.ts`) must then pass unmodified: they are the guard (Pitfall 1; warning sign is 0.047 mm at `preset:shortboard` tail 12"). `carryPhase11Blank` (`:86-116`) stays the one place both rules meet on purpose: the Phase 11 number from `phase11TwelveInch`, the "what the new cut gives" number from live `boardOnBlank`. At the tips step it keeps `TIP_EASE_WINDOW_MM` for what it is, the 12" station (`:26,65,110,113`).

---

### `lib/geometry/board-profile.ts` + `lib/geometry/foil.ts` — hand-set board on the root rule

**Analog:** itself, `buildFallbackProfile` (`:107-116`):
```typescript
const rockerCurve = levelCurve(preparePchip(fallbackRockerPoints(rocker, length)), 0, length);
const foilCurve = preparePchip(
  foilStationPoints(foil, length).map((point) => ({ x: point.station, y: point.thickness })),
);
```
**Assignment:** rocker becomes `prepareRootCurve(..., "rise")`, thickness `prepareRootCurve(..., "fall")` (RESEARCH Q1/Q2). Add an optional `curveRule` (default root) to `buildBoardProfile`'s input, used only when `blank` is null, so D-18's "before" can run (research's proposal, Q9). `sampleFoil` in `foil.ts:107` moves to the root `"fall"` so `volume.ts:538` keeps agreeing with the hand-set profile. Do NOT re-spline a board in a blank from its five stations (anti-pattern); a third deck curve is also forbidden (deck stays `rockerAt + thicknessAt`).

---

### `scripts/extract-phase14-today-golden.ts` (script, batch/file-I/O) — new, the pin

**Analog:** `scripts/extract-phase11-foil-golden.ts` (executes the old code, byte-guarded) and `scripts/extract-phase11-golden-blanks.ts` (pins catalogue rows by value from a git commit).

**Header + guard pattern** (`extract-phase11-foil-golden.ts:33-49, 95-108`):
```typescript
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { isPickable } from "@/lib/blanks/catalog";
import presetBlanks from "@/lib/blanks/preset-blanks.generated.json";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
...
const DEFAULT_OUT = path.resolve(process.cwd(), "lib/geometry/__fixtures__/phase11-foil-golden.json");
const GUARDED_FILES = ["lib/geometry/blank-fit.ts", "lib/geometry/pchip.ts"] as const;
const TAG = "v1.3";

function assertPhase11Code(): void {
  for (const file of GUARDED_FILES) {
    const onDisk = readFileSync(path.resolve(process.cwd(), file));
    const atTag = execFileSync("git", ["show", `${TAG}:${file}`], { maxBuffer: 16 * 1024 * 1024 });
    if (!onDisk.equals(atTag)) { throw new Error(`${file} is not tag ${TAG}'s code, ... `); }
  }
}
```
**Assignment:** guard against the recorded SHA `ed39f4a7d47e8db81481b93c3bd7fe0c0e9e2220` (RESEARCH Q8, not tag v1.4), files `blank-fit.ts`, `pchip.ts`, `board-profile.ts`, `foil.ts`, `rocker.ts`, `blank.ts`. Keep the `--out` flag (`parseOut`, `:87-93`), the header run line (`npx --no-install tsx --tsconfig ./tsconfig.json scripts/...`, run from the repo root, D-20 no package.json entry), and "running it twice writes the same bytes". Pin blank rows by value as `extract-phase11-golden-blanks.ts:25-49` does (`PINNED_COMMIT`, `PROVENANCE` string, `git show <sha>:db/seed/blanks/<file>` then `rowsToBlankRecords(parseCsv(text), file)`). Contents per RESEARCH Q8: curves for every pickable blank, presets + default hand-set board, a stress slice, catalogue rows by value. Size target about 220-260 KB.

**Fixture consumers copy:** `phase11-foil.test.ts:1-30` (import golden JSON + `phase11GoldenBlank`-style accessor; "Every expected number below is ... recorded in the generated fixture ... never typed here").

---

### `scripts/check-saved-boards.ts` (script, batch, read-only) — `--curves-report` then `--tips-report`

**Analog:** itself. Keep the single select, the redaction, the dynamic imports after env load.

**Imports pattern** (`:56-58`, `:74-91`):
```typescript
import { existsSync } from "node:fs";
import path from "node:path";
...
const { db } = await import("../lib/db/client");
const { models } = await import("../lib/db/schema");
const { designSnapshotSchema, hasPhase11Blank, parseSnapshot } = await import("../lib/models/design-snapshot");
const { summarizeDesign } = await import("../lib/geometry/design");
const { buildBoardProfile } = await import("../lib/geometry/board-profile");
const { clampPlacement, FIT_EPSILON_MM, MIN_FOIL_THICKNESS_MM, nearestFittingPlacement, prepareBlank } =
  await import("../lib/geometry/blank-fit");
```
(The env-file loading at the top of `main()` is the part to leave exactly as it is; the script header documents it. Do not copy or name any env file.)

**One select, nothing else** (`:98-99`):
```typescript
// Read-only: one select of every saved board's id and snapshot, nothing else.
const rows = await db.select({ id: models.id, snapshot: models.snapshot }).from(models);
```
**Optional flag line** (`:95, 220-225`): `const thinTipsFlag = process.argv.includes("--thin-tips");` then `if (thinTipsFlag) { console.log(...) }` — add `--curves-report` / `--tips-report` the same way. Counts and maxima only; ids of failing boards only; exit code 1 only when a board does not open or a Phase 11 board's five numbers move (`:229`).

**Failure text** (`:237-251`): `describeFailure` prints error name + code only, `--verbose` appends the driver message. Keep.

**"Before" and "after"** (RESEARCH Q9): before = `prepareBlankPchip` + frozen hand-set rule (+ `tipRule: "blend"` at the tips go, research's proposal), after = live. For each board: five thickness and five rocker numbers (max move in inches, counts over 1/16" and 1/32"), litres through `summarizeDesign` (median, max percent, count over 1%), `fitAt` verdict flips. This script is also one of the six board-input sites (`:169-182`, `:194-208`).

---

### `lib/geometry/pchip.ts` — add `slopeAt` (utility, transform), tips step

**Analog:** itself. Add the analytic Hermite derivative on the interval containing `x` (`d00 = (6t² − 6t)/h`, `d10 = 3t² − 4t + 1`, `d01 = (−6t² + 6t)/h`, `d11 = 3t² − 2t`; 0 past either end, end tangent at the end knot) and expose it on `PreparedPchip` itself so `preparePchip` returns it too (else `blank-fit.test.ts:154`, `levelCurve(preparePchip(knots), ...)`, stops type-checking). Keep it OUT of the curves commits (RESEARCH Q20). Tests: finite-difference agreement, same style as `pchip.test.ts` `expectSlopes` (`:27-30`, tolerance `1e-12` for exact rationals).

---

### `lib/geometry/tip-taper.ts` (utility, transform) — new, tips step

**Analog:** `lib/geometry/pchip.ts` for module shape (pure, documented with decision ids, units in mm) and `blank-fit.ts:322-351` for the rule it replaces.

**The rule being replaced** (`blank-fit.ts:322-351`):
```typescript
const W = TIP_EASE_WINDOW_MM;
const underCentre = blankThicknessAt(L / 2);
const centerGap = underCentre - cut.deckSkin - board.centerThickness;
const drop = underCentre - board.centerThickness;
const unthinned = (s: number) => blankThicknessAt(s) - drop;
const tailUn = unthinned(0);
const noseUn = unthinned(L);
const tipThinningAt = (s: number) => {
  let thinning = 0;
  if (s < W) thinning += (tailUn - board.tailTip) * smoothstep(1 - s / W);
  if (s > L - W) thinning += (noseUn - board.noseTip) * smoothstep(1 - (L - s) / W);
  return thinning;
};
const derivedThicknessAt = (s: number) => {
  let value = unthinned(s);
  if (s < W) { const w = smoothstep(1 - s / W); value = value - tailUn * w + board.tailTip * w; }
  if (s > L - W) { const w = smoothstep(1 - (L - s) / W); value = value - noseUn * w + board.noseTip * w; }
  return value;
};
```
**Assignment:** copy RESEARCH Q14's functions (research's proposals, "names are the planner's"): `thinningStartRange(length)`, `canRunDownSteadily`, `automaticStart`, `steadyTaper`, `tipView`. In `boardOnBlank` keep the same window comparisons (`s < tailStart`, `s > L − noseStart`) so with a 12" start the 12" station lands outside the window exactly as today (acceptance 4 bit-exact), keep the 12" fine-tune hump (`tailHump`/`noseHump`, `:353-362`) added on top (D-04), and keep `tipThinningAt = unthinned − taper` so `rockerAt`/`deckOffAt`/`bottomOffAt` are untouched. Keep today's blend as `tipRule: "blend" | "steady"` (default steady, research's proposal) for the D-18 "before" and for the acceptance-4 equality; delete after the showing.

**`runsOutCause` update** (`blank-fit.ts:429-440`) — today:
```typescript
const W = TIP_EASE_WINDOW_MM;
if (!onBlank.onFoamAt(station)) return "offBlank";
const floor = MIN_FOIL_THICKNESS_MM - FIT_EPSILON_MM;
if (station < W && board.tailTip < floor) return "tipSetting";
if (station > L - W && board.noseTip < floor) return "tipSetting";
const halfOffset = station <= L / 2 ? board.tail12Offset : board.nose12Offset;
if (halfOffset < 0 && onBlank.derivedThicknessAt(station) >= floor) return "fineTune";
return "thinCenter";
```
Replace `W` by each tip's own start and add the `thinningStart` cause between `tipSetting` and `fineTune` (UI-SPEC §10). `RunsOutCause` lives in `blank.ts:135` and `runsOutClause` in `blank-reasons.ts:104-120` is an exhaustive switch, so a fifth cause fails to compile until a case is written.

**Do not** compute the taper in a component; the profile exposes start, flag and thinnest point and the component renders (RESEARCH anti-patterns). Per-tip `start` collides in name with `BlankSideView.start` (`board-profile.ts:50`); RESEARCH Q17 prefers `fromTip`.

---

### `lib/geometry/tip-taper.test.ts` (test) — new

**Analog:** `blank-fit.test.ts` "the phase's named geometry tests (R7)" (`:297`) and "the runs-out reason names its cause" (`:1510-1535`).

**Excerpt of the named-test style** (`blank-fit.test.ts:1510-1523`):
```typescript
describe("the runs-out reason names its cause (Phase 13 item 4)", () => {
  it("(a) a thin centre in a thick blank: every runs-out verdict ... carries cause thinCenter", () => {
    const ctx = defaultContext(72, 1);
    let runsOut = 0;
    for (const prepared of PREPARED_ALL) {
      if (!isPickable(prepared.record)) continue;
      const verdict = judgeBlank(prepared, ctx, DEFAULT_SETTINGS);
      if (verdict.fits || verdict.worst.kind !== "runsOut") continue;
      runsOut++;
      expect(verdict.worst.cause).toBe("thinCenter");
    }
    expect(runsOut).toBeGreaterThan(0);
  });
```
Tests to write (RESEARCH Q14-Q16): acceptance 3 (no board thinner than its tip setting under Automatic, no hump except boards whose thickest printed station is not `C`), acceptance 4 (both starts forced to 12" equals the curves-only numbers exactly), Automatic invariance under Deck Skin / Tip Style / tweaks, no-flicker (monotone, at most 1/2" per 1/16" placement step), the too-close flag, `T(0) = tip` exact, `T(W) = P(W)`. Existing tests that encode the old behaviour and must be rewritten (RESEARCH Q7 tips table): `blank-fit.test.ts` "each 12" station's thickness is the blank's thickness there less the skin and the gap", `:1465`, `:1511`, `:1547`, `:1566`, plus the two S-blend property tests. The runs-out tests need a board that still runs out (a hand-set start too close). The stress-set slice must be pinned by value, not read from the live catalogue (Pitfall 9); report both the whole set and the in-range (60"-120") boards (Pitfall 8).

---

### `lib/geometry/blank.ts` + `lib/models/design-snapshot.ts` (model, CRUD) — the stored start

**Analog:** `deckSkin` / `tipStyle` on `BoardBlank`.

**Type** (`blank.ts:90-105`):
```typescript
export interface BoardBlank {
  copy: BlankRecord;
  placement: Mm;
  nose12Offset: Mm;
  tail12Offset: Mm;
  /** The board's own deck skin (Phase 12 D-01). */
  deckSkin: Mm;
  /** The board's own Tip Style (Phase 12 D-04). */
  tipStyle: TipStyle;
  /** The board's own fine-tune surface (Phase 12 D-13). */
  fineTuneSurface: FineTuneSurface;
}
```
**Assignment (RESEARCH Q17, keep version 5, absent = Automatic):** two OPTIONAL fields, `noseThinningStart?: Mm` and `tailThinningStart?: Mm` (research's proposal; millimetres in from that tip). Not part of `BlankCut` and not part of "all three or none".

**Schema** (`design-snapshot.ts:190-206`):
```typescript
export const boardBlankSchema = z
  .object({
    copy: blankRecordSchema,
    placement: z.number().min(-BLANK_PLACEMENT_MAX_MM).max(BLANK_PLACEMENT_MAX_MM),
    nose12Offset: z.number().min(-BLANK_OFFSET_MAX_MM).max(BLANK_OFFSET_MAX_MM),
    tail12Offset: z.number().min(-BLANK_OFFSET_MAX_MM).max(BLANK_OFFSET_MAX_MM),
    deckSkin: z.number().min(0).max(BLANK_DECK_SKIN_MAX_MM).optional(),
    tipStyle: z.enum(["pinDeck", "bottom"]).optional(),
    fineTuneSurface: z.enum(["deck", "bottom"]).optional(),
  })
  .refine((blank) => { const present = [blank.deckSkin, blank.tipStyle, blank.fineTuneSurface].filter((v) => v !== undefined); return present.length === 0 || present.length === 3; }, { message: "..." });
```
Add (RESEARCH Code Examples): `noseThinningStart: z.number().min(0).max(5000).optional().catch(undefined)` and the tail twin, so a corrupt value reads as Automatic instead of rejecting the whole board. Leave the refine alone. The new code MUST list the fields or the parser strips them. `JSON.stringify` drops `undefined`, so "back to Automatic" (key removed) equals a board that never had one: no phantom undo step. `hasPhase11Blank` (`:349-355`) decides by the blank's shape (no `tipStyle`), unaffected. No database change (D-06; `snapshot: jsonb("snapshot").notNull()`).

**Test analog:** `design-snapshot.test.ts` (`:285-420`, "older versions reopen as they were saved", `phase11Envelope(entry, version)`, `parseSnapshot(wire)`). Add: absent reads Automatic; a number is kept; `'x'`, `null`, `-3`, `99999` read as absent; a higher version still parses; round trip writes nothing on open.

---

### `components/design/design-store.tsx` (store, event-driven) — `setThinningStart`, `useAutomaticThinningStart`

**Analog:** `setDeckSkin` (slider, one coalescing key), `setTipStyle` (compare against the resolved profile, `noteEdit(null)`), `pickBlank` (carries fields across a blank switch).

**Slider mutator** (`:928-936`):
```typescript
// A slider — one coalescing key, so a whole Deck Skin drag is one undo step (Phase 12, D-01).
const setDeckSkin = (deckSkin: Mm) => {
  if (!state.blank) return;
  noteEdit("blank:deckSkin");
  setState((current) => {
    const prev = startedFrom(current, liveTipsRef.current);
    return prev.blank ? { ...prev, blank: { ...prev.blank, deckSkin }, boardStarted: true, dirty: true } : current;
  });
};
```
**Discrete mutator that returns early when nothing changes** (`:938-948`):
```typescript
const setTipStyle = (tipStyle: TipStyle) => {
  if (!state.blank || sideProfile.blank?.cut.tipStyle === tipStyle) return;
  noteEdit(null);
  setState((current) => { ... });
};
```
**Assignment (RESEARCH Q18):** `setThinningStart(end: "nose" | "tail", start: Mm)` with `noteEdit(\`blank:thinningStart:${end}\`)` (one undo step per tip per drag); `useAutomaticThinningStart(end)` with `noteEdit(null)`, returning first when `sideProfile.blank?.tips[end].automatic` is already true, and it DELETES the key. Both guard `if (!state.blank) return`. Add both to `DesignContextValue` (siblings at `:301-331`) and to the provider value (`:1261-1267`). In `pickBlank` (`:897-917`) carry both starts across a blank switch with `prev.blank?.…` like the others (UI-SPEC §11). `resetFineTune` (`:974-983`) must not touch them. Update the header comments at `:38-39` and `:167-168` (they enumerate the eight blank moves) and the stale prose at `:314-315`.

**Context memo to update:** the `sideProfile` build at `:780-792` hand-copies the cut; add the starts (site 5 of 6).

---

### `lib/geometry/blank-reasons.ts` (utility, transform) — slider helper, hint, sentences

**Analog:** `placementSlider` / `formatPlacement` / `deckSkinHint` / `runsOutClause`.

**Slider helper** (`:243-262`, the whole shape: build on `measureSlider`, convert back through `toMm`):
```typescript
export function placementSlider(placement: Mm, range: { min: Mm; max: Mm }, system: UnitsSystem): MeasureSliderView {
  const negate = (value: number) => (value === 0 ? 0 : -value);
  const step = 1 / 16;
  const onGrid = (reachIn: number) => Math.floor(Math.max(0, reachIn) / step + 1e-9) * step;
  const noseReachIn = mmToInches(range.max);
  ...
  const view = measureSlider(mm(negate(placement)), rangeIn, step, 1, system);
  return { ...view, toMm: (dragged: number) => mm(negate(view.toMm(dragged))) };
}
```
`thinningStartSlider` (research's proposal; UI-SPEC names it as new) follows this: Imperial on the 1/2" grid rounded inward with the same `1e-9` nudge; Metric through `metricSliderRange({min, max}, 10)` (`units.ts:180`). Findings to honour (RESEARCH Q19): the Metric slider's rounded-inward range (160 to 760 mm for a 60" board) differs from the profile's `range` (6" to 30"), so a hand-set 6" start labels `15.2 cm` over a thumb pinned at 16.0; harmless, nothing is written.

**Value text with a word standing in** (`:170-172`, `:223-227`): `formatDeckSkin` returns `"none"`, `formatPlacement` returns `"centered"`. Same prints-as-zero test via `formatMark(mm(0), system)`. The start's unit: UI-SPEC reads centimetres (a dim, via `formatDim`/`formatDimBare`, like `formatWhere` at `:94-95`); the nearest sibling Placement reads whole millimetres (`formatMark`). RESEARCH Q23-B flagged the conflict and the founder ruled on 2026-10-02: centimetres, as the UI-SPEC has it (CONTEXT D-22).

**Hint helper with precedence** (`:183-187`):
```typescript
export function deckSkinHint(skin: Mm, tipStyle: TipStyle, deckTweaked: boolean, system: UnitsSystem): string {
  if (tipStyle === "bottom") return "Off the deck — more at the tips";
  if (deckTweaked) return `Off the deck — a ${stationLabel(system)} fine-tune changes it there; see the DATASHEET's Deck row`;
  return takesNoDeckSkin(skin, system) ? "Nothing off the deck at any station" : "Off the deck at every station";
}
```
**Runs-out clause, exhaustive switch** (`:104-120`): add the `thinningStart` case; sentences carry no full stop (the flag adds one, `:125-136`):
```typescript
switch (cause ?? "thinCenter") {
  case "thinCenter": return `this blank is too thick for a ${formatMark(centerThickness, system)} center`;
  case "fineTune":   return `your ${end} fine-tune takes too much off there`;
  case "offBlank":   return `your board runs past the end of this blank`;
  case "tipSetting": return `your ${end} tip is set thinner than that`;
}
```
Use the UI-SPEC's own wording for the new sentences (`thinningStartHint`, `thinningStartLine`, the too-close line); do not paraphrase here.

**Test analog:** `blank-reasons.test.ts` — "Expected strings are either the 11-UI-SPEC Copywriting Contract's own examples ... or composed here from those same formatters — never a converted number typed by hand" (`:36-38`), iterate `UNITS_SYSTEMS`.

---

### `components/rocker/rocker-controls.tsx` (component, request-response) — two new rows

**Analog:** the Tip Style block (`:427-441`) for placement at the end of THICKNESS (D-10), and `board-on-blank.tsx:140-166` for the `SliderRow` usage.

**Placement + Deck Skin rows** (`board-on-blank.tsx:140-166`):
```tsx
const slider = placementSlider(view.placement, range, system);
return (
  <SliderRow
    label={`Placement — ${formatPlacement(view.placement, system)}`}
    value={slider.value} min={slider.min} max={slider.max} step={slider.step}
    leftHint="Toward the nose" rightHint="Toward the tail"
    onValueChange={(v) => setPlacement(slider.toMm(v))}
  />
);
...
<SliderRow
  label={`Deck Skin — ${formatDeckSkin(view.cut.deckSkin, system)}`}
  value={skinSlider.value} min={skinSlider.min} max={skinSlider.max} step={skinSlider.step}
  leftHint={skinHint}
  onValueChange={(v) => setDeckSkin(skinSlider.toMm(v))}
/>
```
(CONTEXT put these in `rocker-controls.tsx`; they are actually in `components/rocker/board-on-blank.tsx`. Read the store through `useDesign()` as `board-on-blank.tsx:101` does, or take props as `rocker-controls.tsx` does for `onTipStyle`.)

**Tip Style block** (`rocker-controls.tsx:427-441`) — the new rows go inside this same `view &&` region, after it or beside it per UI-SPEC, keeping every row above in place:
```tsx
{view && (
  <div className="flex flex-col">
    <div className="mb-2 text-sm text-surf-ink-muted font-normal">Tip Style</div>
    <TwoOptionToggle options={["pinDeck", "bottom"] as const} labels={["Pin deck", "Bottom"] as const}
      value={view.cut.tipStyle} onChange={onTipStyle} ariaLabel="Tip Style" className="self-start" />
    <div className="mt-2 text-xs text-surf-ink-muted font-normal">{TIP_STYLE_HINT[view.cut.tipStyle]}</div>
  </div>
)}
```
**Automatic button** (D-11): copy the dimmed-and-inert button idiom (`:408-425`: `aria-disabled`, `tabIndex={-1}`, `focus-ring-accent`, `coarse:flex coarse:min-h-11`, `opacity-40`) — it is the repo's existing 44-dot-on-touch text button. `hintAction` on `SliderRow` is new (UI-SPEC says so).

**Per-row label shape:** `Label — value` in the label string, as `FineTuneRow` does (`:179-190`): `label={\`${label} — ${formatMark(finalThickness, system)}\`}`. Use "Nose Thinning Starts" and "Tail Thinning Starts" exactly.

**THICKNESS opening line** (`:337-341`) says the tips are thinned "in the last ${station}"; it is asserted verbatim by `e2e/rocker-cut.spec.ts:279-283` and must be rewritten with its test (new wording goes to UI-SPEC). Update the stale comments at `:32-35,39-40`. `rocker-editor.tsx` is the likely parent that threads props (`onTipStyle` etc.); confirm when planning.

---

### `components/design/slider-row.tsx` (+ `slider-row.test.ts`) — `hintAction`

**Analog:** itself. Existing optional props and render:
```tsx
leftHint?: string; rightHint?: string; note?: string;
...
{(leftHint || rightHint) && (<div ...><span>{leftHint}</span><span>{rightHint}</span></div>)}   // :89-94
{note && <div className="mt-0.5 text-[10px] text-surf-warning-ink">{note}</div>}                // :95
```
Add `hintAction` beside them. `slider-row.test.ts` has an allowlist (`ROCKER_PATH` count 1, `rawSliderCount` `:83-86`, exports test `:138-143`); add the new prop and any new raw `<Slider>` count there deliberately.

---

### `components/rocker/rocker-viewer.tsx` (component, transform) — the faint mark

**Analog:** the dashed baseline and the blank silhouette inside the one rotated `<g>` (`:732-760`); constants at `:120-130`.

```tsx
<g transform={vertical ? "rotate(90)" : undefined}>
  <line x1={tailX} y1={baselineY} x2={noseX} y2={baselineY}
    stroke="var(--outline-station-line)"
    strokeWidth={callouts === "compact" ? COMPACT_BASELINE_WIDTH : 1}
    strokeDasharray={callouts === "compact" ? COMPACT_BASELINE_DASH : "4 3"} />
  {blankPath && (<path data-blank-silhouette d={blankPath} fill="var(--outline-foam-shade)"
      stroke="var(--outline-blank-line)" strokeWidth={BLANK_LINE_PX * handleUnit} strokeLinejoin="round" />)}
```
Screen-pinned sizes: `KNOT_DOT_PX = 3`, `BLANK_LINE_PX = 1`, divided by the live fit scale (`handleUnit`). Draw the mark inside the same `<g>`, after the baseline and silhouette, from the side profile's per-tip start (no maths in the component). The compact order-form strip draws no blank (`order-form.tsx:447-452` passes `profile={sideProfile}` and no `blank` prop; `inBlank` at `rocker-viewer.tsx:629-631`), so the mark appears only where a blank is drawn. Add to the accessible name at `:704-706` if UI-SPEC says so. No CSS variable for the mark exists; reuse `--outline-station-line` / `--outline-blank-line` (palette contract lives in `app/globals.css`; `:762` `--outline-blank-line`).

---

### `components/rocker/rocker-datasheet.tsx` (component) — the line beside the tip numbers

**Analog:** `Row`, `GroupLabel`, `READ_ONLY_CELL` (`:78-125`):
```tsx
const LABEL_CELL = "sticky left-0 z-10 bg-surf-panel min-w-0 flex-[1.1]";
const READ_ONLY_CELL = "min-w-0 flex-1 text-right text-sm text-surf-ink-muted font-normal";
function Row({ label, typed, className = "border-b border-surf-line-faint", children }) {
  return (
    <div className={`flex items-center gap-2 py-1.5 ${className}`}>
      <div className={`${LABEL_CELL} text-sm font-normal ${typed ? "text-surf-ink" : "text-surf-ink-muted"}`}>{label}</div>
      {children}
    </div>
  );
}
```
Groups are `BLANK — …`, `YOUR BOARD`, `FOAM OFF` (`:230,245,268`) inside `min-w-[540px]` (`:225`). The FOAM OFF Bottom row passes `className=""` (last row, no rule). A read-only row of the new line uses `typed={false}`. Value text from the new `blank-reasons.ts` helper, never formatted inline.

---

### `components/summary/order-form.tsx` + `lib/geometry/planing.ts` (+ `planing.test.ts`) — printed line

**Analog:** the PLANING table block and `planingTable`.

**Words module** (`planing.ts:44-48, 63-75, 111-140`):
```typescript
export interface PlaningInput { blank: { cut: Pick<BlankCut, "deckSkin">; centerGap: Mm } | null; }
const NO_BLANK_LINE = "Pick a blank on ROCKER for the planing numbers.";
export interface PlaningTable { headers: { deck: string; bottom: string }; rows: PlaningRow[]; footnote: string; }
export function planingTable(profile: PlaningInput, planerMaxDepth: Mm, system: UnitsSystem): PlaningTable {
  const { blank } = profile;
  if (blank === null) { return { headers: TABLE_HEADERS, rows: [...], footnote: NO_BLANK_LINE }; }
  return { headers: TABLE_HEADERS, rows: [...], footnote: `At the center, at ${formatMark(planerMaxDepth, system)} a pass — your Planer Max Depth.` };
}
```
Add an optional `thinning` field (UI-SPEC says it is new) built from `thinningStartLine` (research's proposal); widen `PlaningInput` structurally so `sideProfile` still passes straight in (`order-form.tsx:273`: `planingTable(sideProfile, defaults.planerMaxDepth, system)`).

**Rendering** (`order-form.tsx:686-745`): `data-planing`, `data-planing-table`, `data-planing-footnote` with `className="mt-1 text-surf-ink-muted leading-tight order-form-micro"`. New element gets its own `data-` attribute in the same family so the e2e can find it. The printed sheet's own constants live in `order-form.css`'s `@media print`; no inch/mm figures belong in this component (CLAUDE.md Rule 2). A unit is carried once per line of running text and a value alone in a box carries its own (CLAUDE.md).

**Test analog:** `planing.test.ts:1-40` — blank figures read from the committed CSVs through `readSeedCatalog`, local `boardInput(overrides)` helper copied from `board-profile.test.ts`, expectations from the app's own helpers.

---

### The six board-input construction sites (service/component, transform)

Each hand-copies `deckSkin, tipStyle, fineTuneSurface` from the blank. All six must gain both starts (RESEARCH Q19; or one helper `boardInputOf(blank)` in `lib/geometry`, research's proposal):

| Site | Lines | Excerpt shape |
|---|---|---|
| `lib/geometry/board-profile.ts` (`buildBoardProfile`) | `:263-281` | `deckSkin: blank.deckSkin, tipStyle: blank.tipStyle, fineTuneSurface: blank.fineTuneSurface,` inside `buildBlankProfile(blank.prepared, { length, centerThickness: foil.center, noseTip: foil.noseTip, tailTip: foil.tailTip, nose12Offset, tail12Offset, ... }, blank.placement)` |
| `lib/geometry/design.ts` (`summarizeDesign`) | `:170-183` | `prepared: prepareBlank(blank.copy), placement, nose12Offset, tail12Offset, deckSkin: blank.deckSkin, tipStyle: blank.tipStyle, fineTuneSurface: blank.fineTuneSurface` |
| `components/design/design-store.tsx` (`sideProfile` memo) | `:780-792` | same fields from `state.blank`; dependency list `[state.outline.length, state.rocker, foil, preparedBlank, state.blank]` |
| `components/rocker/use-blank-list.ts` (`ctx` memo) | `:107-108, 127-171` | `useBoardCut()` returns `{ deckSkin, tipStyle, fineTuneSurface }`; `ctx` memo has an explicit dependency list that MUST gain both starts or the list goes stale (Pitfall 6) |
| `components/rocker/blank-flag.tsx` (`ctx` memo) | `:158-190` | same, copy of the `use-blank-list.ts` memo |
| `scripts/check-saved-boards.ts` | `:169-182, 194-208` | same, twice (profile and fit context) |

`useBoardCut()` (`use-blank-list.ts`) reads `blank?.deckSkin ?? defaults.deckSkin`; the starts need no account default (D-06), so absent simply means Automatic. `presetBlank` (`lib/blanks/preset-blanks.ts`) builds a `BoardBlank` and needs nothing. Add a test that builds a board through every path with a hand-set start and compares the five numbers (Pitfall 5).

---

### e2e specs (test, request-response)

**Analogs and what to copy:** each spec carries its own copy of the helpers (no cross-imports, per `rocker-cut.spec.ts` header).

`rocker-blanks.spec.ts:16-52` (and identical in `rocker-cut.spec.ts:16-45`):
```typescript
const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
async function dismissChrome(page: Page) {
  await page.addInitScript((key) => { window.sessionStorage.setItem(key, "true"); }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => { window.localStorage.setItem(key, "true"); }, TOOLBAR_TIP_DISMISSAL_KEY);
}
function blankList(page: Page): Locator { return page.getByRole("list", { name: "Blanks" }); }
function firstFittingRow(page: Page): Locator { return blankList(page).locator('li[data-group="fits"] button').first(); }
function pickedCard(page: Page): Locator { return page.locator("[data-picked-blank]"); }
async function openRocker(page: Page) { await page.goto("/design/rocker"); await expect(blankList(page)).toBeVisible({ timeout: 30_000 }); ...
```
No database: the suite runs on the seed CSV catalogue; no blank name, depth or number is typed — read a value off the page, move a control, check it changed. `summary-planing.spec.ts:1-12` additionally imports the app's own formatters (`planingTable`, `formatMarkBare`, `measureSlider`) to build expected strings in Node. `touch-sizing.spec.ts:1-40` (`dismissSignInBanner`, `setMetricUnits` via the `shaper-units` storage key) is the 44-dot touch-box and "desktop measures exactly today's sizes" pattern for the new Automatic button and sliders.

Known assertions this phase moves: `rocker-cut.spec.ts:279-283` (THICKNESS intro, verbatim) and `:254-259` (the "nothing at the 12" stations moves" wording, which keeps holding because the default board starts both tips at 12"); `rocker-blanks.spec.ts:229-236` (`From blank `) keeps holding. The e2e board for a start past 12" must be a buildable board (<= 120"), e.g. a 120" board slid to the tail, not UI-SPEC's 127" reference (RESEARCH Q16). Desktop baseline pictures (`e2e/*-snapshots/`) are macOS-local; at the curves step ROCKER and VOLUME baselines are re-recorded and TEMPLATE must not move.

---

## Shared Patterns

### Pure geometry, tested, no inline formulas (CLAUDE.md Rule 1)
**Source:** `lib/geometry/pchip.ts` header and `phase11-foil.ts:18`. **Apply to:** `root-curve.ts`, `tip-taper.ts`, the `blank-reasons.ts` helpers. "No React/browser/database import — pure geometry". Every exported function gets tests; expected numbers come from generated `__fixtures__/*.json`, never hand-typed.

### Metric in the data, system chosen at the boundary (CLAUDE.md Rule 2)
**Source:** `lib/geometry/measure-display.ts` (`formatDim :63`, `formatDimBare :72`, `formatMark :81`, `stationLabel :210`, `columnUnitSuffix :233`, `measureSlider :270`) and `lib/geometry/units.ts:180` (`metricSliderRange`). **Apply to:** every new label, slider, DATASHEET line and printed line. No `25.4` or `10` outside `units.ts`.

### One undo step per drag, none for a no-op
**Source:** `design-store.tsx:583` `noteEdit(key | null)`, coalescing window `COALESCE_WINDOW_MS = 500` in `lib/design-history.ts`. **Apply to:** `setThinningStart`, `useAutomaticThinningStart`.

### Quiet, read-only, redacted reporting
**Source:** `scripts/check-saved-boards.ts` (one select, counts and row ids only, `describeFailure`). **Apply to:** both D-18 reports. Never print a snapshot, board name, user id or connection string.

### Sentences carry no full stop
**Source:** `blank-reasons.ts:125-136` ("No sentence here ends in a full stop — the flag adds one, the list row shows the line bare"). **Apply to:** every new reason, hint and clause.

### Tolerant parse at the one boundary
**Source:** `boardBlankSchema` (`design-snapshot.ts:190`). **Apply to:** the two start fields only; nothing is written by opening a board.

## No Analog Found

| File / part | Role | Data Flow | Reason |
|---|---|---|---|
| The faint per-tip thinning mark's exact look (in `rocker-viewer.tsx`) | component | transform | The nearest analogs (dashed baseline, blank silhouette) show the placement and screen-pinned sizing technique, but no existing mark sits at a station along the profile; follow UI-SPEC's design for the look. |

## Notes for the planner

- Curves commits must not import `tip-taper.ts` or touch the blend, and `slopeAt` is added with the tips (RESEARCH Q20). Every code commit of go-live 1 precedes every code commit of go-live 2.
- Tests that go quiet instead of red (retarget in the same change that flips the switch): `blank-fit.test.ts:129,154`, `rocker.test.ts:305,335`. Tests that go red and must be retargeted: `blank-fit.test.ts:324-349` (use `prepareBlankPchip`; golden is PCHIP's), `board-profile.test.ts:85-91`, `volume.test.ts:573-590`.
- Acceptance 5's 0.015" bound holds at 0.0149" for the Mid-length nose-tip rocker; do not narrow or round it (Pitfall 10).
- The items RESEARCH raised that needed a ruling are all settled in CONTEXT (orchestrator note, 2026-10-02): the Metric unit for the start is centimetres (D-22); Automatic with no steady start falls back to 12" and says nothing (D-23); a planer cut that thickens toward the tip at a hand-set start takes the sharp-bend sentence, which shows from 1/32" per inch (D-21); a thin board in a thick blank fits (D-20).
- Naming hazard (orchestrator note): the research's proposed mutator name `useAutomaticThinningStart` starts with `use`, which the React hooks lint rule reads as a hook and rejects inside an event handler. Give the "back to Automatic" mutator a name that does not start with `use`.

## Metadata

**Analog search scope:** `lib/geometry/`, `lib/models/`, `lib/blanks/`, `components/design/`, `components/rocker/`, `components/summary/`, `scripts/`, `e2e/`
**Files scanned:** about 40 read or grepped (targeted ranges for the large files)
**Pattern extraction date:** 2026-10-02
