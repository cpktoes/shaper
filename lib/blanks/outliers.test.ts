import { describe, expect, it } from "vitest";
import type { BlankRecord } from "@/lib/geometry/blank";
import { inchesToMm, litres, mm, mmToInches } from "@/lib/geometry/units";
import { readSeedCatalog } from "./seed-files";
import {
  DEFAULT_OUTLIER_THRESHOLDS,
  findOutliers,
  leaveOneOutResiduals,
  makerNormDeviations,
  robustZScores,
} from "./outliers";

/** A tidy 6'0" blank with stations every 6": a smooth foil, a smooth outline, a smooth rocker. */
function smoothBlank(name: string, bump?: { label: string; attribute: "rocker" | "thickness" | "width"; byIn: number }): BlankRecord {
  const length = 72;
  const labels = ["T0", "T6", "T12", "T18", "T24", "T30", "C", "N30", "N24", "N18", "N12", "N6", "N0"];
  const stations = labels.map((label, i) => {
    const x = i * 6;
    const u = (x - length / 2) / (length / 2); // -1 at the tail, 0 at the centre, 1 at the nose
    let rocker = 2.4 * u * u * (u > 0 ? 1.6 : 1); // a parabola, steeper to the nose
    let thickness = 3 - 1.9 * u * u;
    let width = 21 - 13 * u * u;
    if (bump && bump.label === label) {
      if (bump.attribute === "rocker") rocker += bump.byIn;
      if (bump.attribute === "thickness") thickness += bump.byIn;
      if (bump.attribute === "width") width += bump.byIn;
    }
    return {
      label,
      fromTailMm: inchesToMm(x),
      rockerMm: inchesToMm(rocker),
      thicknessMm: inchesToMm(thickness),
      widthMm: inchesToMm(width),
      flag: null,
    };
  });
  return {
    vendor: "Test Foam",
    name,
    catalogSlug: name,
    pdfPage: 1,
    lengthMm: inchesToMm(length),
    deckLengthMm: null,
    volumeLitres: litres(40),
    stations,
  };
}

describe("leaveOneOutResiduals", () => {
  it("reads a smooth blank as nearly on its own curve at every interior station", () => {
    const residuals = leaveOneOutResiduals(smoothBlank("smooth"));
    expect(residuals.length).toBeGreaterThan(20);
    for (const r of residuals) {
      expect(Math.abs(mmToInches(mm(r.residualMm))), `${r.attribute} ${r.label}`).toBeLessThan(0.06);
    }
  });

  it("never asks a tip, nor the anchor station, and counts the others that drew the curve", () => {
    const residuals = leaveOneOutResiduals(smoothBlank("smooth"));
    expect(residuals.some((r) => r.label === "T0" || r.label === "N0")).toBe(false);
    // The centre is the thickest, widest and lowest station of this blank, so it is never asked.
    expect(residuals.some((r) => r.label === "C")).toBe(false);
    expect(residuals.every((r) => r.others === 12)).toBe(true);
  });

  it("finds a thickness bumped 3/16\" at the tail 12\" station, and nowhere else", () => {
    const residuals = leaveOneOutResiduals(smoothBlank("bumped", { label: "T12", attribute: "thickness", byIn: 3 / 16 }));
    const bumped = residuals.find((r) => r.label === "T12" && r.attribute === "thickness");
    expect(bumped).toBeDefined();
    expect(mmToInches(mm(bumped!.residualMm))).toBeGreaterThan(0.15);
    // The bump pulls the curve toward itself when a neighbour is left out, so T6 and T18 read off
    // the curve the other way (an echo, which near a tip can read even larger than the bump under
    // the square-root rule); every other station still reads clean. findOutliers sorts that out.
    for (const r of residuals) {
      if (r === bumped) continue;
      const off = mmToInches(mm(r.residualMm));
      if (r.attribute === "thickness" && (r.label === "T6" || r.label === "T18")) expect(off).toBeLessThan(0);
      else expect(Math.abs(off), `${r.attribute} ${r.label}`).toBeLessThan(0.06);
    }
  });

  it("asks nothing of an attribute with fewer than four printed stations", () => {
    const blank = smoothBlank("sparse");
    for (const station of blank.stations) if (station.label !== "T0" && station.label !== "C" && station.label !== "N0") station.widthMm = null;
    expect(leaveOneOutResiduals(blank).some((r) => r.attribute === "width")).toBe(false);
  });
});

describe("robustZScores", () => {
  it("scores the one odd value far out and the rest near zero", () => {
    const zs = robustZScores([1, 1.1, 0.9, 1.05, 0.95, 1, 4]);
    expect(zs[6]).toBeGreaterThan(5);
    for (const z of zs.slice(0, 6)) expect(Math.abs(z)).toBeLessThan(2);
  });

  it("reads all zeros when every value is the same, and nothing for no values", () => {
    expect(robustZScores([2, 2, 2])).toEqual([0, 0, 0]);
    expect(robustZScores([])).toEqual([]);
  });
});

describe("findOutliers", () => {
  it("names only the bumped station among ten blanks of one maker", () => {
    const records = Array.from({ length: 9 }, (_, i) => smoothBlank(`plain ${i}`));
    records.push(smoothBlank("bumped", { label: "T18", attribute: "width", byIn: 1 / 2 }));
    const outliers = findOutliers(records);
    expect(outliers.map((o) => `${o.name} ${o.label} ${o.attribute}`)).toEqual(["bumped T18 width"]);
    expect(outliers[0].z).toBeGreaterThan(DEFAULT_OUTLIER_THRESHOLDS.z);
    // Scored against the same station on the maker's other blanks: ten blanks print a T18.
    expect(outliers[0].groupSize).toBe(10);
    expect(outliers[0].confidence).toBe("high");
  });

  it("stays quiet under the floor: a bump of 1/32\" is noise, not an outlier", () => {
    const records = Array.from({ length: 9 }, (_, i) => smoothBlank(`plain ${i}`));
    records.push(smoothBlank("hair", { label: "T18", attribute: "thickness", byIn: 1 / 32 }));
    expect(findOutliers(records)).toEqual([]);
  });

  it("runs over the whole catalogue without throwing and asks every maker", () => {
    const catalogue = readSeedCatalog();
    const residuals = catalogue.flatMap(leaveOneOutResiduals);
    const vendors = new Set(residuals.map((r) => r.vendor));
    expect(vendors.size).toBe(4);
    expect(() => findOutliers(catalogue)).not.toThrow();
    expect(() => makerNormDeviations(catalogue)).not.toThrow();
  });
});

describe("makerNormDeviations", () => {
  it("flags a nose tip thickness far thinner than the maker's others, which leave-one-out cannot see", () => {
    const records = Array.from({ length: 9 }, (_, i) => smoothBlank(`plain ${i}`));
    records.push(smoothBlank("thin nose", { label: "N0", attribute: "thickness", byIn: -0.5 }));
    const deviations = makerNormDeviations(records);
    expect(deviations.map((d) => `${d.name} ${d.label} ${d.attribute}`)).toEqual(["thin nose N0 thickness"]);
    expect(Math.abs(mmToInches(mm(deviations[0].typicalMm)) - 1.1)).toBeLessThan(0.05);
  });
});
