import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { PHASE14_TODAY, pinnedBlank, pinnedCatalogue } from "./__fixtures__/phase14-today";
import { buildStressSet, STRESS_FIT_SETTINGS } from "./__fixtures__/phase14-stress-set";
import { boardOnBlank, fitAt, prepareBlankPchip } from "./blank-fit";
import { buildBoardProfile } from "./board-profile";
import { BOARD_PRESETS } from "./presets";
import { rockerStationPositions } from "./rocker";
import { mm } from "./units";

// Every expected number below is the live site's own output (commit ed39f4a), recorded in the
// generated fixture by scripts/extract-phase14-today-golden.ts — never typed here (CLAUDE.md Rule 1).
// Every blank comes from the pin itself (`pinnedBlank`, `pinnedCatalogue`), never from today's
// catalogue, so a later catalogue correction cannot move a recorded number (D-26). Litres are recorded
// in the pin but asserted by plan 14-05, through the named frozen rules.

describe("today's numbers, reproduced by today's rule kept by name (D-25, D-26)", () => {
  it("reproduces every blank's levelled bottom, thickness and width at every station and midpoint", () => {
    for (const entry of PHASE14_TODAY.curves) {
      const prepared = prepareBlankPchip(pinnedBlank(entry.vendor, entry.name));
      const label = `${entry.vendor} ${entry.name}`;
      for (const point of entry.rocker) expect(prepared.rocker.sample(point.x), `${label} rocker`).toBe(point.y);
      for (const point of entry.thickness) {
        expect(prepared.thickness.sample(point.x), `${label} thickness`).toBe(point.y);
      }
      for (const point of entry.width) expect(prepared.width.sample(point.x), `${label} width`).toBe(point.y);
    }
  });

  it("reproduces every preset's five thicknesses, five rocker numbers and its 1/2\" sweep", () => {
    expect(PHASE14_TODAY.presets.map((entry) => entry.id)).toEqual(BOARD_PRESETS.map((preset) => preset.id));
    for (const preset of BOARD_PRESETS) {
      const entry = PHASE14_TODAY.presets.find((candidate) => candidate.id === preset.id)!;
      // The preset's own blank copy, carried by value in lib/blanks/preset-blanks.generated.json —
      // never the seed rows, which may have been corrected since the pick.
      const fields = presetDesignFields(preset);
      expect([fields.blank.copy.vendor, fields.blank.copy.name, fields.blank.placement]).toEqual([
        entry.vendor,
        entry.name,
        entry.placementMm,
      ]);
      const profile = buildBoardProfile({
        length: fields.outline.length,
        rocker: fields.rocker,
        foil: fields.foil,
        blank: {
          prepared: prepareBlankPchip(fields.blank.copy),
          placement: fields.blank.placement,
          nose12Offset: fields.blank.nose12Offset,
          tail12Offset: fields.blank.tail12Offset,
          deckSkin: fields.blank.deckSkin,
          tipStyle: fields.blank.tipStyle,
          fineTuneSurface: fields.blank.fineTuneSurface,
        },
      });
      expect(profile.length, preset.id).toBe(entry.boardLengthMm);
      for (const { key, station } of rockerStationPositions(profile.length)) {
        expect(profile.thicknessAt(station), `${preset.id} thickness ${key}`).toBe(entry.thicknessMm[key]);
        expect(profile.rockerAt(station), `${preset.id} rocker ${key}`).toBe(entry.rockerMm[key]);
      }
      for (const point of entry.sweep) {
        expect(profile.rockerAt(mm(point.s)), `${preset.id} rocker at ${point.s}`).toBe(point.rocker);
        expect(profile.thicknessAt(mm(point.s)), `${preset.id} thickness at ${point.s}`).toBe(point.thickness);
      }
    }
  });

  it("reproduces every pinned stress board's numbers, fit verdict and worst shortfall", () => {
    const byLabel = new Map(buildStressSet(pinnedCatalogue(), prepareBlankPchip).map((entry) => [entry.label, entry]));
    for (const entry of PHASE14_TODAY.stress) {
      const stressCase = byLabel.get(entry.label);
      expect(stressCase, entry.label).toBeDefined();
      if (!stressCase) continue;
      expect(
        [stressCase.board.length, stressCase.board.centerThickness, stressCase.placement, stressCase.buildable],
        entry.label,
      ).toEqual([entry.boardLengthMm, entry.centerThicknessMm, entry.placementMm, entry.buildable]);
      const onBlank = boardOnBlank(stressCase.prepared, stressCase.board, stressCase.placement);
      for (const { key, station } of rockerStationPositions(stressCase.board.length)) {
        expect(onBlank.thicknessAt(station), `${entry.label} thickness ${key}`).toBe(entry.thicknessMm[key]);
        expect(onBlank.rockerAt(station), `${entry.label} rocker ${key}`).toBe(entry.rockerMm[key]);
      }
      const { fits, worst } = fitAt(onBlank, stressCase.halfWidthAt, stressCase.widePointStation, STRESS_FIT_SETTINGS);
      expect(fits, entry.label).toBe(entry.fits);
      expect(worst, entry.label).toEqual(entry.worst);
    }
  });

  it("names the live commit and carries every blank its curves, hidden stations and stress boards use", () => {
    expect(PHASE14_TODAY.provenance).toContain(PHASE14_TODAY.commit);
    expect(PHASE14_TODAY.commit).toMatch(/^ed39f4a[0-9a-f]{33}$/);
    const carried = new Set(PHASE14_TODAY.blanks.map((blank) => `${blank.vendor}\u0000${blank.name}`));
    const used = [
      ...PHASE14_TODAY.curves,
      ...PHASE14_TODAY.stress,
      ...PHASE14_TODAY.hiddenStations.rocker,
      ...PHASE14_TODAY.hiddenStations.thickness,
      ...PHASE14_TODAY.hiddenStations.width,
    ];
    for (const { vendor, name } of used) expect(carried.has(`${vendor}\u0000${name}`), `${vendor} ${name}`).toBe(true);
  });

  it("the pin's generator names the live commit and the files it guards", () => {
    const script = readFileSync(path.resolve(process.cwd(), "scripts/extract-phase14-today-golden.ts"), "utf8");
    for (const text of [
      "ed39f4a7d47e8db81481b93c3bd7fe0c0e9e2220",
      "ls-tree",
      "lib/geometry",
      "lib/blanks",
      "db/seed/blanks",
      "lib/fit-defaults-preference.ts",
    ]) {
      expect(script, text).toContain(text);
    }
  });

  it("the pin carries every blank it uses by value", () => {
    // The presets carry their own blank copies (lib/blanks/preset-blanks.generated.json), so only
    // the stress boards, the curves and the hidden-station data name blanks the pin must carry.
    const used = [
      ...PHASE14_TODAY.stress,
      ...PHASE14_TODAY.curves,
      ...PHASE14_TODAY.hiddenStations.rocker,
      ...PHASE14_TODAY.hiddenStations.thickness,
      ...PHASE14_TODAY.hiddenStations.width,
    ];
    for (const { vendor, name } of used) {
      const record = pinnedBlank(vendor, name);
      expect([record.vendor, record.name], `${vendor} ${name}`).toEqual([vendor, name]);
    }

    const first = pinnedCatalogue();
    const second = pinnedCatalogue();
    expect(second).toEqual(first);
    expect(second[0]).not.toBe(first[0]);
    expect(second[0].stations[0]).not.toBe(first[0].stations[0]);
    const before = second[0].stations[0].fromTailMm;
    first[0].stations[0].fromTailMm = mm(before + 1);
    first[0].name = `${first[0].name} (changed)`;
    const third = pinnedCatalogue();
    expect(third[0].stations[0].fromTailMm).toBe(before);
    expect(third[0].name).toBe(second[0].name);
  });
});
