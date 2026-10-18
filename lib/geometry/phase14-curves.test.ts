import { describe, expect, it } from "vitest";
import { isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { type BlankStation } from "./blank";
import { prepareBlank } from "./blank-fit";
import { pchipMinimum, type PreparedPchip } from "./pchip";

// The curves step (Phase 14 D-13, D-27, D-28) proven through the app's OWN blank preparation —
// `prepareBlank`, the one function every screen, the list, the flag and the cards use. Every expected
// value is the catalogue's own printed figure, read through the tested reader — never typed here
// (CLAUDE.md Rule 1). The check that no stress board went from fitting to refused at the curves step
// compared against the curve the site drew before Phase 14, and was retired with it after the Oct 10
// showing (quick 261018-dvu).

const CATALOG = readSeedCatalog();
const PICKABLE = CATALOG.filter(isPickable);

/** One attribute of a blank: its printed value at a station, and the prepared curve that draws it. */
const ATTRIBUTES: {
  name: string;
  pick: (station: BlankStation) => number | null;
  curve: (prepared: ReturnType<typeof prepareBlank>) => PreparedPchip;
}[] = [
  { name: "bottom", pick: (s) => s.rockerMm, curve: (prepared) => prepared.rocker.curve },
  { name: "thickness", pick: (s) => s.thicknessMm, curve: (prepared) => prepared.thickness },
  { name: "width", pick: (s) => s.widthMm, curve: (prepared) => prepared.width },
];

describe("the curves step through the app's own blank preparation (acceptance 1 and 2, D-13, D-27)", () => {
  it("reads every printed station exactly and never leaves the two stations either side, on every pickable blank", () => {
    expect(PICKABLE.length).toBeGreaterThan(0);
    let blanks = 0;
    let stations = 0;
    let intervals = 0;
    let outside = 0;
    for (const record of PICKABLE) {
      blanks++;
      const prepared = prepareBlank(record);
      const label = `${record.vendor} ${record.name}`;
      for (const { name, pick, curve } of ATTRIBUTES) {
        // Each attribute over its OWN printed stations: an empty cell is not a station (R10).
        const printed = record.stations
          .filter((station) => pick(station) !== null)
          .map((station) => ({ x: station.fromTailMm as number, y: pick(station) as number, at: station.label }));
        const drawn = curve(prepared);
        for (const point of printed) {
          stations++;
          expect(drawn.sample(point.x), `${label} ${name} ${point.at}`).toBe(point.y);
        }
        for (let k = 0; k < printed.length - 1; k++) {
          intervals++;
          const [a, b] = [printed[k], printed[k + 1]];
          const lo = Math.min(a.y, b.y) - 1e-9;
          const hi = Math.max(a.y, b.y) + 1e-9;
          for (let i = 0; i <= 200; i++) {
            const y = drawn.sample(a.x + ((b.x - a.x) * i) / 200);
            if (y < lo || y > hi) outside++;
          }
        }
      }
    }
    expect(blanks).toBe(PICKABLE.length);
    expect(stations).toBeGreaterThan(PICKABLE.length * 3);
    expect(intervals).toBeGreaterThan(PICKABLE.length * 3);
    expect(outside).toBe(0);
  });

  it("levels every pickable blank's bottom on its lowest printed rocker, so the bottom's low point reads exactly 0", () => {
    for (const record of PICKABLE) {
      const prepared = prepareBlank(record);
      const label = `${record.vendor} ${record.name}`;
      const printed = record.stations
        .filter((station) => station.rockerMm !== null)
        .map((station) => station.rockerMm as number);
      // Acceptance 2: the true low point is a printed station, never a dip the curve invents.
      expect(prepared.rocker.minimum, label).toBe(Math.min(...printed));
      expect(pchipMinimum(prepared.rocker.curve, 0, record.lengthMm) - prepared.rocker.minimum, label).toBe(0);
      // R11: the levelled bottom's minimum over the whole blank — both ends and every station.
      const lowest = Math.min(
        prepared.rocker.sample(0),
        prepared.rocker.sample(record.lengthMm),
        ...prepared.rocker.curve.xs.map((x) => prepared.rocker.sample(x)),
      );
      expect(lowest, label).toBe(0);
    }
  });
});
