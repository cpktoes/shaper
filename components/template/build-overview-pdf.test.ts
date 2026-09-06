import { describe, expect, it } from "vitest";
import { buildOutline } from "@/lib/geometry/outline";
import { formatArea, formatDim, formatLength, formatMark, formatSignedDim, stationLabel } from "@/lib/geometry/measure-display";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { formatInchesFraction, inchesToMm, mm, squareMmToSquareInches, type UnitsSystem } from "@/lib/geometry/units";
import {
  buildOverviewPdf,
  overviewFileName,
  overviewLengthLabelText,
  overviewSpecLines,
  overviewStationLines,
  overviewStationWidthText,
  overviewWpOffsetLabelText,
} from "./build-overview-pdf";

function buildOptions(paper: "letter" | "a4" = "letter", presetIndex = 0, system: UnitsSystem = "imperial") {
  const preset = BOARD_PRESETS[presetIndex];
  const geometry = buildOutline(preset.outline);
  return { geometry, outline: preset.outline, paper, boardName: preset.name, system };
}

describe("buildOverviewPdf", () => {
  it("produces exactly one page of valid PDF bytes", () => {
    const options = buildOptions();

    const doc = buildOverviewPdf(options);

    expect(doc.getNumberOfPages()).toBe(1);

    const bytes = doc.output("arraybuffer");
    expect(bytes.byteLength).toBeGreaterThan(0);
    const header = new Uint8Array(bytes.slice(0, 4));
    expect(String.fromCharCode(...header)).toBe("%PDF");
  });

  it("builds without throwing for every preset, both paper sizes, and an empty board name", () => {
    for (const preset of BOARD_PRESETS) {
      const geometry = buildOutline(preset.outline);
      for (const paper of ["letter", "a4"] as const) {
        const doc = buildOverviewPdf({ geometry, outline: preset.outline, paper, boardName: "", system: "imperial" });
        expect(doc.getNumberOfPages()).toBe(1);
      }
    }
  });

  it("builds without throwing at the widepoint-width extreme (25in, multi-column territory for the tiled template)", () => {
    const preset = BOARD_PRESETS[0];
    const outline = { ...preset.outline, widePointWidth: inchesToMm(25) };
    const geometry = buildOutline(outline);
    const doc = buildOverviewPdf({ geometry, outline, paper: "letter", boardName: preset.name, system: "imperial" });
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it("builds without throwing for a diamond-tail board (depth line present) and a swallow-tail board", () => {
    const diamondOutline = {
      ...BOARD_PRESETS[0].outline,
      tail: { kind: "diamond" as const, endWidth: inchesToMm(10), depth: inchesToMm(3) },
    };
    const swallowOutline = {
      ...BOARD_PRESETS[0].outline,
      tail: { kind: "swallow" as const, endWidth: inchesToMm(8), crotchDepth: inchesToMm(3) },
    };

    const diamondGeometry = buildOutline(diamondOutline);
    const diamondDoc = buildOverviewPdf({
      geometry: diamondGeometry,
      outline: diamondOutline,
      paper: "letter",
      boardName: "Diamond Test",
      system: "imperial",
    });
    expect(diamondDoc.getNumberOfPages()).toBe(1);

    const swallowGeometry = buildOutline(swallowOutline);
    const swallowDoc = buildOverviewPdf({
      geometry: swallowGeometry,
      outline: swallowOutline,
      paper: "a4",
      boardName: "",
      system: "imperial",
    });
    expect(swallowDoc.getNumberOfPages()).toBe(1);
  });
});

describe("overviewSpecLines", () => {
  it("carries every prototype spec line the design state supports", () => {
    const options = buildOptions();
    const lines = overviewSpecLines(options.outline, options.geometry, "imperial");
    const joined = lines.join(" ");

    expect(joined).toContain("Length:");
    expect(joined).toContain("Nose Angle:");
    expect(joined).toContain("Fullness:");
    expect(joined).toContain("Nose Width @12\"");
    expect(joined).toContain("Widepoint Width:");
    expect(joined).toContain("WP Offset:");
    expect(joined).toContain("Rail Length:");
    expect(joined).toContain("Tail Shape:");
    expect(joined).toContain("Tail Block:");
    expect(joined).toContain("Tail Angle:");
    expect(joined).toContain("Tail Width @12\"");
    expect(joined).toContain("Template Area:");
    expect(joined).toContain("sq in");
    expect(joined).toContain("sq ft");
  });

  it("is byte-identical to the pre-Phase-7 Imperial output for every board preset", () => {
    for (const preset of BOARD_PRESETS) {
      const geometry = buildOutline(preset.outline);
      const lines = overviewSpecLines(preset.outline, geometry, "imperial");
      expect(lines[0]).toBe(`Length: ${formatLength(preset.outline.length, "imperial")}`);
      expect(lines[0]).toContain("'");
      expect(lines[2]).toBe(`Nose Width @12" (calculated): ${formatDim(geometry.noseWidthAt12in, "imperial")}`);
      expect(lines[3]).toBe(`Widepoint Width: ${formatDim(preset.outline.widePointWidth, "imperial")}`);
      expect(lines[4]).toBe(`WP Offset: ${formatSignedDim(preset.outline.widePointOffset, "imperial")}`);
      expect(lines[7]).toBe(`Tail Block: ${formatDim(mm(geometry.halfTailBlockWidth * 2), "imperial")}`);
      const areaLine = lines.find((l) => l.startsWith("Template Area:"));
      const areaSqIn = squareMmToSquareInches(geometry.area);
      expect(areaLine).toBe(
        `Template Area: ${formatArea(geometry.area, "imperial")} (${(areaSqIn / 144).toFixed(2)} sq ft)`,
      );
    }
  });

  it("in Metric, reads sizes in centimetres, depths in whole millimetres, and one area figure in square centimetres", () => {
    const preset = BOARD_PRESETS[0];
    const geometry = buildOutline(preset.outline);
    const lines = overviewSpecLines(preset.outline, geometry, "metric");
    const joined = lines.join(" ");

    expect(lines[0]).toBe(`Length: ${formatLength(preset.outline.length, "metric")}`);
    expect(lines[0]).toContain("cm");
    expect(lines[3]).toBe(`Widepoint Width: ${formatDim(preset.outline.widePointWidth, "metric")}`);
    expect(lines[4]).toBe(`WP Offset: ${formatSignedDim(preset.outline.widePointOffset, "metric")}`);
    expect(lines[7]).toBe(`Tail Block: ${formatDim(mm(geometry.halfTailBlockWidth * 2), "metric")}`);

    const areaLine = lines.find((l) => l.startsWith("Template Area:"));
    expect(areaLine).toBe(`Template Area: ${formatArea(geometry.area, "metric")}`);
    expect(areaLine).not.toContain("sq ft");
    expect(joined).not.toContain("sq in");
  });

  it("includes a Swallow Depth line, in whole millimetres on Metric, only for a swallow tail", () => {
    const swallowOutline = {
      ...BOARD_PRESETS[0].outline,
      tail: { kind: "swallow" as const, endWidth: inchesToMm(8), crotchDepth: inchesToMm(3) },
    };
    const imperialGeometry = buildOutline(swallowOutline);
    const imperialLines = overviewSpecLines(swallowOutline, imperialGeometry, "imperial");
    expect(imperialLines.some((l) => l.startsWith("Swallow Depth:"))).toBe(true);
    expect(imperialLines.some((l) => l.startsWith("Diamond Depth:"))).toBe(false);

    const metricGeometry = buildOutline(swallowOutline);
    const metricLines = overviewSpecLines(swallowOutline, metricGeometry, "metric");
    const swallowLine = metricLines.find((l) => l.startsWith("Swallow Depth:"));
    expect(swallowLine).toBe(`Swallow Depth: ${formatMark(swallowOutline.tail.crotchDepth, "metric")}`);
    expect(swallowLine).toContain("mm");
    expect(metricLines.some((l) => l.startsWith("Diamond Depth:"))).toBe(false);
  });

  it("includes a Diamond Depth line (the geometry's effective, capped depth), in whole millimetres on Metric, only for a diamond tail", () => {
    const diamondOutline = {
      ...BOARD_PRESETS[0].outline,
      tail: { kind: "diamond" as const, endWidth: inchesToMm(10), depth: inchesToMm(3) },
    };
    const geometry = buildOutline(diamondOutline);
    const imperialLines = overviewSpecLines(diamondOutline, geometry, "imperial");
    expect(imperialLines.some((l) => l.startsWith("Diamond Depth:"))).toBe(true);
    expect(imperialLines.some((l) => l.startsWith("Swallow Depth:"))).toBe(false);

    const metricLines = overviewSpecLines(diamondOutline, geometry, "metric");
    const diamondLine = metricLines.find((l) => l.startsWith("Diamond Depth:"));
    expect(diamondLine).toBe(`Diamond Depth: ${formatMark(geometry.effectiveDiamondDepth, "metric")}`);
    expect(diamondLine).toContain("mm");
    expect(metricLines.some((l) => l.startsWith("Swallow Depth:"))).toBe(false);
  });

  it("omits both depth lines for pin/round/squash tails, in both systems", () => {
    const squashOutline = {
      ...BOARD_PRESETS[0].outline,
      tail: { kind: "squash" as const, endWidth: inchesToMm(5) },
    };
    const geometry = buildOutline(squashOutline);
    for (const system of ["imperial", "metric"] as const) {
      const lines = overviewSpecLines(squashOutline, geometry, system);
      expect(lines.some((l) => l.startsWith("Swallow Depth:"))).toBe(false);
      expect(lines.some((l) => l.startsWith("Diamond Depth:"))).toBe(false);
    }
  });

  it("prints both independent rail-length values, not the prototype's single control", () => {
    const options = buildOptions();
    const lines = overviewSpecLines(options.outline, options.geometry, "imperial");
    const railLine = lines.find((l) => l.startsWith("Rail Length:"));
    expect(railLine).toContain(`Tail ${options.outline.tailRailLength}%`);
    expect(railLine).toContain(`Nose ${options.outline.noseRailLength}%`);
  });

  it("the Metric nose-width and tail-width line labels name the station in centimetres and contain no inch mark", () => {
    const options = buildOptions();
    const lines = overviewSpecLines(options.outline, options.geometry, "metric");
    const noseLine = lines.find((l) => l.startsWith("Nose Width @"));
    const tailLine = lines.find((l) => l.startsWith("Tail Width @"));
    expect(noseLine).toBe(`Nose Width @${stationLabel("metric")} (calculated): ${formatDim(options.geometry.noseWidthAt12in, "metric")}`);
    expect(tailLine).toBe(`Tail Width @${stationLabel("metric")} (calculated): ${formatDim(options.geometry.tailWidthAt12in, "metric")}`);
    expect(noseLine).toContain("cm");
    expect(noseLine).not.toContain('"');
    expect(tailLine).toContain("cm");
    expect(tailLine).not.toContain('"');
  });

  it("angle, fullness, rail-length and tail-shape lines are identical strings in both systems", () => {
    const options = buildOptions();
    const imperialLines = overviewSpecLines(options.outline, options.geometry, "imperial");
    const metricLines = overviewSpecLines(options.outline, options.geometry, "metric");
    for (const prefix of ["Nose Angle:", "Rail Length:", "Tail Shape:", "Tail Angle:"]) {
      const imperialLine = imperialLines.find((l) => l.startsWith(prefix));
      const metricLine = metricLines.find((l) => l.startsWith(prefix));
      expect(metricLine).toBe(imperialLine);
    }
  });
});

describe("overviewLengthLabelText", () => {
  it("on Imperial, formats feet-and-inches plus the plain inch total, e.g. 6'0\" - 72\" — byte-identical to before this phase", () => {
    expect(overviewLengthLabelText(inchesToMm(72), "imperial")).toBe(`6'0" - 72"`);
  });

  it("on Metric, returns the single centimetre figure with no separator and no second figure", () => {
    const length = inchesToMm(72);
    const text = overviewLengthLabelText(length, "metric");
    expect(text).toBe(formatDim(length, "metric"));
    expect(text).not.toContain(" - ");
    expect(text.match(/\d+(\.\d+)?/g)?.length).toBe(1);
  });
});

describe(
  'overviewStationLines (round 3 post-checkpoint fix, defect 3: "the center, widepoint, and offset all should be explicitly labeled")',
  () => {
    it("returns four stations — nose @12, CENTER, WIDEPOINT, tail @12 — when the widepoint is offset from centre", () => {
      const options = buildOptions(); // shortboard preset: widePointOffset -1in, non-zero
      const lines = overviewStationLines(options.geometry);
      expect(lines.map((l) => l.label)).toEqual(['NOSE @ 12"', "CENTER", "WIDEPOINT", 'TAIL @ 12"']);
      expect(lines[1].station).toBeCloseTo(options.geometry.length / 2, 6);
      expect(lines[2].station).toBe(options.geometry.widePointStation);
    });

    it("the WIDEPOINT line carries a secondaryLabel; CENTER, NOSE, TAIL do not", () => {
      const options = buildOptions();
      const lines = overviewStationLines(options.geometry);
      const byLabel = Object.fromEntries(lines.map((l) => [l.label, l]));
      expect(byLabel["WIDEPOINT"].secondaryLabel).toBeDefined();
      expect(byLabel["CENTER"].secondaryLabel).toBeUndefined();
      expect(byLabel['NOSE @ 12"'].secondaryLabel).toBeUndefined();
      expect(byLabel['TAIL @ 12"'].secondaryLabel).toBeUndefined();
    });

    it("merges into one WIDEPOINT / CENTER line when the offset is zero (fish preset)", () => {
      const options = buildOptions("letter", 1); // fish preset: widePointOffset 0
      expect(options.outline.widePointOffset).toBe(0);
      const lines = overviewStationLines(options.geometry);
      expect(lines.map((l) => l.label)).toEqual(['NOSE @ 12"', "WIDEPOINT / CENTER", 'TAIL @ 12"']);
      expect(lines[1].station).toBe(options.geometry.widePointStation);
      expect(lines[1].secondaryLabel).toBeUndefined();
    });

    it("also merges into one WIDEPOINT / CENTER line when the offset is real but rounds to 0\" at print precision (WR-01)", () => {
      // A non-zero offset below ~1/32in is easily reachable by dragging the widepoint marker a
      // tiny amount; deciding the merge from the raw float (rather than the printed magnitude)
      // used to leave WIDEPOINT and CENTER as two separate lines with a nonsensical
      // "WP OFFSET — 0\" forward" secondary label.
      const preset = BOARD_PRESETS[1]; // fish preset: widePointOffset 0
      const geometry = buildOutline({ ...preset.outline, widePointOffset: inchesToMm(0.015625) });
      const lines = overviewStationLines(geometry);
      expect(lines.map((l) => l.label)).toEqual(['NOSE @ 12"', "WIDEPOINT / CENTER", 'TAIL @ 12"']);
      expect(lines[1].secondaryLabel).toBeUndefined();
    });

    it.each(BOARD_PRESETS)("$id: CENTER + TAIL@12 + NOSE@12 always present, WIDEPOINT present standalone or merged", (preset) => {
      const geometry = buildOutline(preset.outline);
      const lines = overviewStationLines(geometry);
      const labels = lines.map((l) => l.label);
      expect(labels).toContain('NOSE @ 12"');
      expect(labels).toContain('TAIL @ 12"');
      const hasSplit = labels.includes("CENTER") && labels.includes("WIDEPOINT");
      const hasMerged = labels.includes("WIDEPOINT / CENTER");
      expect(hasSplit || hasMerged).toBe(true);
      expect(hasSplit && hasMerged).toBe(false);
    });
  },
);

describe(
  'overviewWpOffsetLabelText (round 3 post-checkpoint fix, defect 3: "WP OFFSET explicitly labeled... matching how the app\'s viewer words it")',
  () => {
    it('on Imperial, prints "WP OFFSET — 1/2" back" for a negative (tail-ward) offset — byte-identical to before this phase', () => {
      expect(overviewWpOffsetLabelText(inchesToMm(-0.5), "imperial")).toBe('WP OFFSET — 1/2" back');
    });

    it('on Imperial, prints "WP OFFSET — 1/2" forward" for a positive (nose-ward) offset', () => {
      expect(overviewWpOffsetLabelText(inchesToMm(0.5), "imperial")).toBe('WP OFFSET — 1/2" forward');
    });

    it('on Imperial, prints a bare "WP OFFSET — 0"" — no direction word — for an offset that rounds to zero at print precision (WR-01)', () => {
      // 1/64" rounds to 0" at the default sixteenths; a direction word here would read as
      // "WP OFFSET — 0\" forward", which is nonsensical on a sheet a shaper is meant to trust.
      expect(overviewWpOffsetLabelText(inchesToMm(0.015625), "imperial")).toBe('WP OFFSET — 0"');
      expect(overviewWpOffsetLabelText(inchesToMm(-0.015625), "imperial")).toBe('WP OFFSET — 0"');
    });

    it("on Metric, prints the same wording with a centimetre magnitude for a back (tail-ward) offset", () => {
      const offset = mm(-51);
      const text = overviewWpOffsetLabelText(offset, "metric");
      expect(text).toBe(`WP OFFSET — ${formatDim(mm(51), "metric")} back`);
      expect(text).toContain("cm");
    });

    it("on Metric, prints the same wording with a centimetre magnitude for a forward (nose-ward) offset", () => {
      const offset = mm(51);
      const text = overviewWpOffsetLabelText(offset, "metric");
      expect(text).toBe(`WP OFFSET — ${formatDim(mm(51), "metric")} forward`);
      expect(text).toContain("cm");
    });

    it("on Metric, prints a bare offset with no direction word for an offset that rounds away at centimetre precision", () => {
      // Below 0.5mm rounds to 0.0cm — genuinely a different threshold from Imperial's 1/32in.
      const roundsAway = mm(0.2);
      expect(formatDim(roundsAway, "metric")).toBe("0.0 cm");
      expect(overviewWpOffsetLabelText(roundsAway, "metric")).toBe(`WP OFFSET — ${formatDim(roundsAway, "metric")}`);
      expect(overviewWpOffsetLabelText(mm(-0.2), "metric")).toBe(`WP OFFSET — ${formatDim(roundsAway, "metric")}`);
    });
  },
);

describe("the Overview Sheet's station width figures on the drawing (07-03)", () => {
  it("on Metric, reads the board's own full width there in centimetres, via the same formatDim the spec block uses", () => {
    const options = buildOptions();
    const halfWidth = options.geometry.halfWidePointWidth;
    const text = overviewStationWidthText(halfWidth, "metric");
    expect(text).toBe(formatDim(mm(halfWidth * 2), "metric"));
    expect(text).toContain("cm");
    expect(text).not.toContain("mm");
  });

  it("on Imperial, is byte-identical to the pre-Phase-7 inch fraction", () => {
    const options = buildOptions();
    const halfWidth = options.geometry.halfWidePointWidth;
    const text = overviewStationWidthText(halfWidth, "imperial");
    expect(text).toBe(formatInchesFraction(mm(halfWidth * 2)));
  });
});

describe("overviewFileName", () => {
  it("slugifies a board name", () => {
    expect(overviewFileName("My Fish 5'8\"")).toBe("my-fish-5-8-overview.pdf");
  });

  it("falls back to a fixed name for an empty board name", () => {
    expect(overviewFileName("")).toBe("board-overview.pdf");
  });

  it("falls back for a name that slugifies to nothing", () => {
    expect(overviewFileName("***")).toBe("board-overview.pdf");
  });
});
