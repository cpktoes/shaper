import { describe, expect, it } from "vitest";
import { buildOutline } from "@/lib/geometry/outline";
import { BOARD_PRESETS } from "@/lib/geometry/presets";
import { inchesToMm } from "@/lib/geometry/units";
import {
  buildOverviewPdf,
  overviewFileName,
  overviewLengthLabelText,
  overviewSpecLines,
  overviewStationLines,
  overviewWpOffsetLabelText,
} from "./build-overview-pdf";

function buildOptions(paper: "letter" | "a4" = "letter", presetIndex = 0) {
  const preset = BOARD_PRESETS[presetIndex];
  const geometry = buildOutline(preset.outline);
  return { geometry, outline: preset.outline, paper, boardName: preset.name };
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
        const doc = buildOverviewPdf({ geometry, outline: preset.outline, paper, boardName: "" });
        expect(doc.getNumberOfPages()).toBe(1);
      }
    }
  });

  it("builds without throwing at the widepoint-width extreme (25in, multi-column territory for the tiled template)", () => {
    const preset = BOARD_PRESETS[0];
    const outline = { ...preset.outline, widePointWidth: inchesToMm(25) };
    const geometry = buildOutline(outline);
    const doc = buildOverviewPdf({ geometry, outline, paper: "letter", boardName: preset.name });
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
    });
    expect(diamondDoc.getNumberOfPages()).toBe(1);

    const swallowGeometry = buildOutline(swallowOutline);
    const swallowDoc = buildOverviewPdf({
      geometry: swallowGeometry,
      outline: swallowOutline,
      paper: "a4",
      boardName: "",
    });
    expect(swallowDoc.getNumberOfPages()).toBe(1);
  });
});

describe("overviewSpecLines", () => {
  it("carries every prototype spec line the design state supports", () => {
    const options = buildOptions();
    const lines = overviewSpecLines(options.outline, options.geometry);
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

  it("includes a Swallow Depth line only for a swallow tail", () => {
    const swallowOutline = {
      ...BOARD_PRESETS[0].outline,
      tail: { kind: "swallow" as const, endWidth: inchesToMm(8), crotchDepth: inchesToMm(3) },
    };
    const geometry = buildOutline(swallowOutline);
    const lines = overviewSpecLines(swallowOutline, geometry);
    expect(lines.some((l) => l.startsWith("Swallow Depth:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("Diamond Depth:"))).toBe(false);
  });

  it("includes a Diamond Depth line (the geometry's effective, capped depth) only for a diamond tail", () => {
    const diamondOutline = {
      ...BOARD_PRESETS[0].outline,
      tail: { kind: "diamond" as const, endWidth: inchesToMm(10), depth: inchesToMm(3) },
    };
    const geometry = buildOutline(diamondOutline);
    const lines = overviewSpecLines(diamondOutline, geometry);
    expect(lines.some((l) => l.startsWith("Diamond Depth:"))).toBe(true);
    expect(lines.some((l) => l.startsWith("Swallow Depth:"))).toBe(false);
  });

  it("omits both depth lines for pin/round/squash tails", () => {
    const squashOutline = {
      ...BOARD_PRESETS[0].outline,
      tail: { kind: "squash" as const, endWidth: inchesToMm(5) },
    };
    const geometry = buildOutline(squashOutline);
    const lines = overviewSpecLines(squashOutline, geometry);
    expect(lines.some((l) => l.startsWith("Swallow Depth:"))).toBe(false);
    expect(lines.some((l) => l.startsWith("Diamond Depth:"))).toBe(false);
  });

  it("prints both independent rail-length values, not the prototype's single control", () => {
    const options = buildOptions();
    const lines = overviewSpecLines(options.outline, options.geometry);
    const railLine = lines.find((l) => l.startsWith("Rail Length:"));
    expect(railLine).toContain(`Tail ${options.outline.tailRailLength}%`);
    expect(railLine).toContain(`Nose ${options.outline.noseRailLength}%`);
  });
});

describe("overviewLengthLabelText", () => {
  it("formats feet-and-inches plus the plain inch total, e.g. 6'0\" - 72\"", () => {
    expect(overviewLengthLabelText(inchesToMm(72))).toBe(`6'0" - 72"`);
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
    it('prints "WP OFFSET — 1/2" back" for a negative (tail-ward) offset', () => {
      expect(overviewWpOffsetLabelText(inchesToMm(-0.5))).toBe('WP OFFSET — 1/2" back');
    });

    it('prints "WP OFFSET — 1/2" forward" for a positive (nose-ward) offset', () => {
      expect(overviewWpOffsetLabelText(inchesToMm(0.5))).toBe('WP OFFSET — 1/2" forward');
    });

    it('prints a bare "WP OFFSET — 0"" — no direction word — for an offset that rounds to zero at print precision (WR-01)', () => {
      // 1/64" rounds to 0" at the default sixteenths; a direction word here would read as
      // "WP OFFSET — 0\" forward", which is nonsensical on a sheet a shaper is meant to trust.
      expect(overviewWpOffsetLabelText(inchesToMm(0.015625))).toBe('WP OFFSET — 0"');
      expect(overviewWpOffsetLabelText(inchesToMm(-0.015625))).toBe('WP OFFSET — 0"');
    });
  },
);

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
