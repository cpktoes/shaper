import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import golden from "./__fixtures__/phase11-foil-golden.json";
import type { BlankRecord } from "./blank";
import { prepareBlank } from "./blank-fit";
import { phase11TwelveInch, type Phase11Board } from "./phase11-foil";
import { mm } from "./units";

// Every expected number below is Phase 11's own output, recorded in the generated fixture by
// scripts/extract-phase11-foil-golden.ts running tag v1.3's boardOnBlank — never typed here
// (CLAUDE.md Rule 1).
const CATALOG = readSeedCatalog();

type GoldenCase = (typeof golden.cases)[number];

function recordOf(entry: GoldenCase): BlankRecord {
  const record = CATALOG.find((b) => b.vendor === entry.vendor && b.name === entry.name);
  if (!record) throw new Error(`${entry.vendor} ${entry.name} is not in the seeded catalogue`);
  return record;
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
