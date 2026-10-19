import { describe, expect, it } from "vitest";
import type { TailShape } from "./board";
import {
  finsImportedReadout,
  importedReadoutColumns,
  importedReadoutColumnsThatFit,
  railsImportedReadout,
  rockerImportedReadout,
  volumeImportedReadout,
  type ImportedReadout,
} from "./imported-readout";
import { formatDim, formatLength, formatMark, stationLabel } from "./measure-display";
import { inchesToMm } from "./units";

/** The name/value pairs of a readout, in order — what a card draws, figure over name. */
function pairs(readout: ImportedReadout): [string, string][] {
  return readout.items.map((item) => [item.label, item.value]);
}

describe("rockerImportedReadout — ROCKER's INPUTS card", () => {
  it("reads the default board in Imperial and Metric, each figure with its own unit", () => {
    const imperial = rockerImportedReadout(inchesToMm(72), inchesToMm(19), "imperial");
    expect(imperial.caption).toBe("From TEMPLATE");
    expect(pairs(imperial)).toEqual([
      ["Length", `6'0"`],
      ["Width", `19"`],
    ]);
    expect(imperial.foot).toBeNull();
    const metric = rockerImportedReadout(inchesToMm(72), inchesToMm(19), "metric");
    expect(pairs(metric)).toEqual([
      ["Length", "182.9 cm"],
      ["Width", "48.3 cm"],
    ]);
  });

  it("reads the old line's 70 x 19.5 board in both systems", () => {
    expect(pairs(rockerImportedReadout(inchesToMm(70), inchesToMm(19.5), "imperial"))).toEqual([
      ["Length", `5'10"`],
      ["Width", `19 1/2"`],
    ]);
    expect(pairs(rockerImportedReadout(inchesToMm(70), inchesToMm(19.5), "metric"))).toEqual([
      ["Length", "177.8 cm"],
      ["Width", "49.5 cm"],
    ]);
  });

  it("is built from formatLength and formatDim, never its own numbers, in both systems", () => {
    const length = inchesToMm(74.25);
    const width = inchesToMm(20.375);
    for (const system of ["imperial", "metric"] as const) {
      expect(pairs(rockerImportedReadout(length, width, system))).toEqual([
        ["Length", formatLength(length, system)],
        ["Width", formatDim(width, system)],
      ]);
    }
  });

  it("keys the figures by stable machine names", () => {
    expect(rockerImportedReadout(inchesToMm(72), inchesToMm(19), "imperial").items.map((i) => i.key)).toEqual([
      "length",
      "width",
    ]);
  });
});

describe("railsImportedReadout — RAILS' INPUTS card", () => {
  const nose = inchesToMm(1.31);
  const center = inchesToMm(2.5);
  const tail = inchesToMm(1.56);

  it("reads the default board in Imperial", () => {
    const readout = railsImportedReadout(nose, center, tail, "imperial");
    expect(readout.caption).toBe("From ROCKER & FOIL");
    expect(pairs(readout)).toEqual([
      [`Nose @ 12"`, `1 5/16"`],
      ["Center", `2 1/2"`],
      [`Tail @ 12"`, `1 9/16"`],
    ]);
    expect(readout.foot).toBeNull();
  });

  it("reads the default board in Metric: whole millimetres, each with its unit, station in cm", () => {
    expect(pairs(railsImportedReadout(nose, center, tail, "metric"))).toEqual([
      ["Nose @ 30.5 cm", "33 mm"],
      ["Center", "64 mm"],
      ["Tail @ 30.5 cm", "40 mm"],
    ]);
  });

  it("is built from formatMark and stationLabel, never its own numbers, in both systems", () => {
    const a = inchesToMm(0.97);
    const b = inchesToMm(3.125);
    const c = inchesToMm(2.04);
    for (const system of ["imperial", "metric"] as const) {
      const station = stationLabel(system);
      expect(pairs(railsImportedReadout(a, b, c, system))).toEqual([
        [`Nose @ ${station}`, formatMark(a, system)],
        ["Center", formatMark(b, system)],
        [`Tail @ ${station}`, formatMark(c, system)],
      ]);
    }
  });

  it("puts the three values in nose, center, tail order (three different values, no swap)", () => {
    const readout = railsImportedReadout(inchesToMm(1), inchesToMm(3), inchesToMm(2), "imperial");
    expect(readout.items.map((i) => [i.key, i.value])).toEqual([
      ["nose", `1"`],
      ["center", `3"`],
      ["tail", `2"`],
    ]);
  });
});

describe("finsImportedReadout — FINS' INPUTS card", () => {
  const length = inchesToMm(72);
  const tailWidth12 = inchesToMm(14.75);
  const diamondDepth = inchesToMm(3);

  function readout(tail: TailShape, system: "imperial" | "metric", depth = diamondDepth) {
    return finsImportedReadout({ length, tailWidth12, tail, diamondDepth: depth }, system);
  }

  it("squash: four figures, the tail block and no depth", () => {
    const tail: TailShape = { kind: "squash", endWidth: inchesToMm(4) };
    const imperial = readout(tail, "imperial");
    expect(imperial.caption).toBe("From TEMPLATE");
    expect(pairs(imperial)).toEqual([
      ["Length", `6'0"`],
      [`Tail @ 12"`, `14 3/4"`],
      ["Tail", "Squash"],
      ["Tail block", `4"`],
    ]);
    expect(pairs(readout(tail, "metric"))).toEqual([
      ["Length", "182.9 cm"],
      ["Tail @ 30.5 cm", "37.5 cm"],
      ["Tail", "Squash"],
      ["Tail block", "10.2 cm"],
    ]);
    expect(imperial.foot).toBeNull();
  });

  it("diamond: five figures, the depth read as a mark", () => {
    const tail: TailShape = { kind: "diamond", endWidth: inchesToMm(10), depth: inchesToMm(3) };
    expect(pairs(readout(tail, "imperial"))).toEqual([
      ["Length", `6'0"`],
      [`Tail @ 12"`, `14 3/4"`],
      ["Tail", "Diamond"],
      ["Tail block", `10"`],
      ["Depth", `3"`],
    ]);
    expect(pairs(readout(tail, "metric"))).toEqual([
      ["Length", "182.9 cm"],
      ["Tail @ 30.5 cm", "37.5 cm"],
      ["Tail", "Diamond"],
      ["Tail block", "25.4 cm"],
      ["Depth", "76 mm"],
    ]);
  });

  it("diamond prints the clamped depth it is passed, never the stored one", () => {
    const tail: TailShape = { kind: "diamond", endWidth: inchesToMm(10), depth: inchesToMm(3) };
    const depth = readout(tail, "imperial", inchesToMm(2)).items.find((i) => i.key === "depth");
    expect(depth?.value).toBe(`2"`);
    expect(JSON.stringify(readout(tail, "imperial", inchesToMm(2)))).not.toContain(`"3\\""`);
  });

  it("swallow: five figures, the crotch depth as a mark", () => {
    const tail: TailShape = { kind: "swallow", endWidth: inchesToMm(8), crotchDepth: inchesToMm(1.5) };
    expect(pairs(readout(tail, "imperial"))).toEqual([
      ["Length", `6'0"`],
      [`Tail @ 12"`, `14 3/4"`],
      ["Tail", "Swallow"],
      ["Tail block", `8"`],
      ["Depth", `1 1/2"`],
    ]);
    expect(pairs(readout(tail, "metric"))).toEqual([
      ["Length", "182.9 cm"],
      ["Tail @ 30.5 cm", "37.5 cm"],
      ["Tail", "Swallow"],
      ["Tail block", "20.3 cm"],
      ["Depth", "38 mm"],
    ]);
  });

  it("pin and round: exactly three figures ending at the tail's name, no tail block, no depth", () => {
    for (const [kind, name] of [
      ["pin", "Pin"],
      ["round", "Round"],
    ] as const) {
      for (const system of ["imperial", "metric"] as const) {
        const r = readout({ kind }, system);
        expect(r.items).toHaveLength(3);
        expect(r.items.map((i) => i.label)).toEqual(["Length", `Tail @ ${stationLabel(system)}`, "Tail"]);
        expect(r.items[2].value).toBe(name);
      }
    }
  });

  it("is built from the formatters in both systems", () => {
    const tail: TailShape = { kind: "diamond", endWidth: inchesToMm(9.25), depth: inchesToMm(2.5) };
    for (const system of ["imperial", "metric"] as const) {
      const r = finsImportedReadout(
        { length: inchesToMm(77.5), tailWidth12: inchesToMm(13.625), tail, diamondDepth: inchesToMm(2.25) },
        system,
      );
      expect(pairs(r)).toEqual([
        ["Length", formatLength(inchesToMm(77.5), system)],
        [`Tail @ ${stationLabel(system)}`, formatDim(inchesToMm(13.625), system)],
        ["Tail", "Diamond"],
        ["Tail block", formatDim(inchesToMm(9.25), system)],
        ["Depth", formatMark(inchesToMm(2.25), system)],
      ]);
    }
  });
});

describe("volumeImportedReadout — VOLUME's INPUTS card", () => {
  const length = inchesToMm(72);
  const width = inchesToMm(19);
  const centre = inchesToMm(2.5);

  it("reads the default board in Imperial, with the ruled foot", () => {
    const r = volumeImportedReadout(length, width, centre, "imperial");
    expect(r.caption).toBe("From TEMPLATE and ROCKER & FOIL");
    expect(pairs(r)).toEqual([
      ["Length", `6'0"`],
      ["Width", `19"`],
      ["Thickness", `2 1/2"`],
    ]);
    expect(r.foot).toBe("Rail shapes from RAILS");
  });

  it("reads the default board in Metric, each figure with its own unit", () => {
    expect(pairs(volumeImportedReadout(length, width, centre, "metric"))).toEqual([
      ["Length", "182.9 cm"],
      ["Width", "48.3 cm"],
      ["Thickness", "6.4 cm"],
    ]);
  });

  it("is built from formatLength and formatDim, never its own numbers, in both systems", () => {
    const l = inchesToMm(74.25);
    const w = inchesToMm(20.375);
    const c = inchesToMm(2.6875);
    for (const system of ["imperial", "metric"] as const) {
      expect(pairs(volumeImportedReadout(l, w, c, system))).toEqual([
        ["Length", formatLength(l, system)],
        ["Width", formatDim(w, system)],
        ["Thickness", formatDim(c, system)],
      ]);
    }
  });
});

describe("every readout — no running text is left", () => {
  it("only VOLUME has a foot, and no label or value holds a times sign or a middle dot", () => {
    const tails: TailShape[] = [
      { kind: "pin" },
      { kind: "round" },
      { kind: "squash", endWidth: inchesToMm(4) },
      { kind: "diamond", endWidth: inchesToMm(10), depth: inchesToMm(3) },
      { kind: "swallow", endWidth: inchesToMm(8), crotchDepth: inchesToMm(1.5) },
    ];
    for (const system of ["imperial", "metric"] as const) {
      const all: ImportedReadout[] = [
        rockerImportedReadout(inchesToMm(72), inchesToMm(19), system),
        railsImportedReadout(inchesToMm(1.31), inchesToMm(2.5), inchesToMm(1.56), system),
        volumeImportedReadout(inchesToMm(72), inchesToMm(19), inchesToMm(2.5), system),
        ...tails.map((tail) =>
          finsImportedReadout(
            { length: inchesToMm(72), tailWidth12: inchesToMm(14.75), tail, diamondDepth: inchesToMm(3) },
            system,
          ),
        ),
      ];
      for (const r of all) {
        for (const item of r.items) {
          expect(item.label + item.value).not.toMatch(/×| · /);
        }
        expect(r.foot === null).toBe(!r.items.some((i) => i.key === "thickness"));
      }
    }
  });
});

describe("importedReadoutColumns — the column rule", () => {
  it("gives 2 for two, 3 for three, 2 for four (2 x 2) and 3 for five (3 then 2)", () => {
    expect(importedReadoutColumns(2)).toBe(2);
    expect(importedReadoutColumns(3)).toBe(3);
    expect(importedReadoutColumns(4)).toBe(2);
    expect(importedReadoutColumns(5)).toBe(3);
  });
});

describe("importedReadoutColumnsThatFit — one column fewer while the figures overflow", () => {
  it("keeps the designed count when the figures fit", () => {
    expect(importedReadoutColumnsThatFit(3, () => false)).toBe(3);
    expect(importedReadoutColumnsThatFit(2, () => false)).toBe(2);
  });

  it("drops three columns to two when three overflow and two fit (VOLUME at 820 wide in Metric)", () => {
    const asked: number[] = [];
    const columns = importedReadoutColumnsThatFit(3, (count) => {
      asked.push(count);
      return count === 3;
    });
    expect(columns).toBe(2);
    expect(asked).toEqual([3, 2]);
  });

  it("goes down to a single column when two overflow too, and never asks about fewer", () => {
    const asked: number[] = [];
    expect(importedReadoutColumnsThatFit(3, (count) => (asked.push(count), true))).toBe(1);
    expect(asked).toEqual([3, 2]);
    expect(importedReadoutColumnsThatFit(2, () => true)).toBe(1);
  });
});
