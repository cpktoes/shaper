import { describe, expect, it } from "vitest";
import golden from "./__fixtures__/phase11-foil-golden.json";
import pinnedBlanks from "./__fixtures__/phase11-foil-golden-blanks.json";
import { phase11GoldenBlank } from "./__fixtures__/phase11-golden-blank";
import { DEFAULT_BLANK_CUT, type BlankRecord, type TipStyle } from "./blank";
import { boardOnBlank, prepareBlank, TIP_EASE_WINDOW_MM } from "./blank-fit";
import { carryPhase11Blank, phase11TwelveInch, type Phase11Board } from "./phase11-foil";
import { mm } from "./units";

// Every expected number below is Phase 11's own output, recorded in the generated fixture by
// scripts/extract-phase11-foil-golden.ts running tag v1.3's boardOnBlank — never typed here
// (CLAUDE.md Rule 1). Each case's blank comes from the pinned fixture — the catalogue as the numbers
// were recorded on it — and not from today's catalogue, because a board saved under Phase 11 carries
// its blank by value, so a later catalogue correction must not be able to disturb these.

type GoldenCase = (typeof golden.cases)[number];

function recordOf(entry: GoldenCase): BlankRecord {
  return phase11GoldenBlank(entry.vendor, entry.name);
}

function boardOf(entry: GoldenCase): Phase11Board {
  return {
    length: mm(entry.boardLengthMm),
    centerThickness: mm(entry.centerThicknessMm),
    noseTip: mm(entry.noseTipMm),
    tailTip: mm(entry.tailTipMm),
    nose12Offset: mm(entry.nose12OffsetMm),
    tail12Offset: mm(entry.tail12OffsetMm),
  };
}

describe("Phase 11's 12\" formula, kept for the carry-over (D-14)", () => {
  it("reproduces Phase 11's thickness at both 12\" stations for every recorded board", () => {
    for (const entry of golden.cases) {
      const prepared = prepareBlank(recordOf(entry));
      const board = boardOf(entry);
      const placement = mm(entry.placementMm);
      expect(phase11TwelveInch(prepared, board, placement, "tail12"), entry.label).toBeCloseTo(
        entry.thicknessMm.tail12,
        9,
      );
      expect(phase11TwelveInch(prepared, board, placement, "nose12"), entry.label).toBeCloseTo(
        entry.thicknessMm.nose12,
        9,
      );
    }
  });

  it("the pinned blanks are exactly the blanks the recorded boards name — no more, no fewer", () => {
    const named = new Set(golden.cases.map((entry) => `${entry.vendor} | ${entry.name}`));
    const pinned = new Set(pinnedBlanks.blanks.map((blank) => `${blank.vendor} | ${blank.name}`));
    expect([...pinned].sort()).toEqual([...named].sort());
  });

  it("the fixture holds the presets, the development board, a catalogue sweep and the guard cases", () => {
    const labels = golden.cases.map((entry) => entry.label);
    for (const id of ["shortboard", "fish", "midlength", "longboard"]) {
      expect(labels).toContain(`preset:${id}`);
    }
    expect(labels).toContain("dev-board");
    expect(labels.filter((label) => label.startsWith("sweep:")).length).toBeGreaterThanOrEqual(30);
    expect(labels).toContain("guard:tail-plus");
    expect(labels).toContain("guard:tail-minus");
  });

  it("in the guard case the tail 12\" reads above its tip setting, so Phase 11's inner guard really bound", () => {
    const plus = golden.cases.find((entry) => entry.label === "guard:tail-plus")!;
    expect(plus.thicknessMm.tail12).toBeGreaterThan(plus.tailTipMm);
    // The inner guard binds when the un-tweaked 12" value is held at the tip setting itself.
    expect(plus.derived12Mm.tail12).toBe(plus.tailTipMm);
  });
});

describe("carrying a Phase 11 board across to the new cut (D-07, D-14)", () => {
  const W = TIP_EASE_WINDOW_MM;
  const tipStyles: TipStyle[] = ["pinDeck", "bottom"];

  it("sets each 12\" fine-tune to Phase 11's 12\" thickness less the new cut's, with the default skin, the given Tip Style and fine-tunes on the Deck", () => {
    for (const entry of golden.cases) {
      const prepared = prepareBlank(recordOf(entry));
      const board = boardOf(entry);
      const placement = mm(entry.placementMm);
      for (const tipStyle of tipStyles) {
        const carried = carryPhase11Blank(prepared, board, placement, tipStyle);
        expect(carried.deckSkin).toBe(DEFAULT_BLANK_CUT.deckSkin);
        expect(carried.tipStyle).toBe(tipStyle);
        expect(carried.fineTuneSurface).toBe("deck");
        const untuned = boardOnBlank(
          prepared,
          { ...board, ...DEFAULT_BLANK_CUT, tipStyle, nose12Offset: mm(0), tail12Offset: mm(0) },
          placement,
        );
        const L = board.length;
        expect(carried.nose12Offset, entry.label).toBeCloseTo(
          phase11TwelveInch(prepared, board, placement, "nose12") - untuned.derivedThicknessAt(L - W),
          9,
        );
        expect(carried.tail12Offset, entry.label).toBeCloseTo(
          phase11TwelveInch(prepared, board, placement, "tail12") - untuned.derivedThicknessAt(W),
          9,
        );
        // And with those fine-tunes on, the new cut reads Phase 11's 12" thicknesses exactly.
        const tuned = boardOnBlank(prepared, { ...board, ...carried }, placement);
        expect(tuned.thicknessAt(W), entry.label).toBeCloseTo(entry.thicknessMm.tail12, 9);
        expect(tuned.thicknessAt(L - W), entry.label).toBeCloseTo(entry.thicknessMm.nose12, 9);
      }
    }
  });
});
