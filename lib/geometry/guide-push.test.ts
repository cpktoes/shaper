import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GUIDE_FRAME, GUIDE_PUSH_TABLE, guideFrame, guidePush, guidePushAmount } from "./guide-push";
import { formatDim, formatMark } from "./measure-display";
import { inchesToMm, mm, UNITS_SYSTEMS } from "./units";

/** The words page's last section names every Imperial push in millimetres as JSON (the sketch's own PUSH
 * objects); found by name anywhere under `.planning/`, because a finished phase moves to the archive. */
const PLANNING = fileURLToPath(new URL("../../.planning/", import.meta.url));
function findPage(dir: string): string | null {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isFile() && entry.name === "18-GUIDE-WORDS.md") return path;
    if (entry.isDirectory()) {
      const found = findPage(path);
      if (found) return found;
    }
  }
  return null;
}

function pagePushes(): Record<string, number> {
  const page = findPage(PLANNING);
  if (!page) throw new Error("18-GUIDE-WORDS.md not found under .planning");
  const out: Record<string, number> = {};
  for (const line of readFileSync(page, "utf8").split("\n")) {
    const m = /^(ROCKER|TEMPLATE · RAILS · VOLUME · FINS) \(`[^`]+` PUSH\): (\{.*\})$/.exec(line);
    if (!m) continue;
    const json = JSON.parse(m[2]) as Record<string, number>;
    const prefix = m[1] === "ROCKER" ? "rocker." : "";
    for (const [key, value] of Object.entries(json)) out[prefix + key] = value;
  }
  return out;
}

/** The table's key as the words page names it. */
function pageKey(page: string, key: string): string {
  if (page === "rocker") return `rocker.${key}`;
  if (page === "volume") return `vol${key === "thick" ? "Thick" : key === "length" ? "Length" : "Width"}`;
  return key;
}

describe("guidePush — Imperial is the words page's own inches", () => {
  const fromPage = pagePushes();

  it("reads both JSON lines of the words page", () => {
    expect(Object.keys(fromPage).length).toBeGreaterThan(30);
  });

  it("every Imperial dim or mark equals inchesToMm of its inches, and the words page's figure", () => {
    let matched = 0;
    for (const entry of GUIDE_PUSH_TABLE) {
      const amount = guidePushAmount(entry, "imperial");
      if (entry.inches !== undefined) expect(amount, entry.key).toBe(inchesToMm(entry.inches));
      const key = pageKey(entry.page, entry.key);
      if (key in fromPage) {
        expect(amount, `${entry.page}.${entry.key}`).toBeCloseTo(fromPage[key], 9);
        matched++;
      }
    }
    // Every push the page lists is in the table (the table adds only the two the page leaves to the
    // builders: the Thinning Start past the automatic one, and RAILS' ratio).
    expect(matched).toBe(Object.keys(fromPage).length);
  });

  it("guidePush hands every page's amounts out by key", () => {
    const imperial = guidePush("imperial");
    expect(imperial.volume.length).toBe(inchesToMm(6));
    expect(imperial.volume.thick).toBe(inchesToMm(1 / 4));
    expect(imperial.fins.finOffRail).toBe(inchesToMm(-1 / 2));
    expect(imperial.template.angle).toBe(20);
  });
});

describe("guidePush — Metric is a round figure of its own family (D-25)", () => {
  it("every Metric dim is a whole half-centimetre and reads .0 cm or .5 cm, never a converted fraction", () => {
    for (const entry of GUIDE_PUSH_TABLE.filter((e) => e.family === "dim")) {
      const amount = guidePushAmount(entry, "metric");
      expect(amount % 5, entry.key).toBe(0);
      expect(formatDim(mm(amount), "metric"), entry.key).toMatch(/^\d+\.[05] cm$/);
    }
  });

  it("the dims D-25 names read as it says", () => {
    const m = guidePush("metric");
    expect(formatDim(m.template.length, "metric")).toBe("15.0 cm");
    expect(formatDim(m.template.wingPos, "metric")).toBe("10.0 cm");
    expect(formatDim(m.template.offset, "metric")).toBe("7.5 cm");
    expect(formatDim(m.template.block, "metric")).toBe("5.0 cm");
    expect(formatDim(m.template.width, "metric")).toBe("2.5 cm");
    expect(formatDim(m.rocker.startIn, "metric")).toBe("60.0 cm");
    expect(formatDim(m.volume.thick, "metric")).toBe("0.5 cm");
  });

  it("every Metric mark is a whole number of millimetres", () => {
    for (const entry of GUIDE_PUSH_TABLE.filter((e) => e.family === "mark")) {
      const amount = guidePushAmount(entry, "metric");
      expect(Number.isInteger(amount), entry.key).toBe(true);
      expect(formatMark(mm(Math.abs(amount)), "metric"), entry.key).toBe(`${Math.abs(amount)} mm`);
    }
  });

  it("the marks D-25 names read as it says", () => {
    const pairs: [number, number][] = [
      [1 / 4, 6],
      [3 / 8, 10],
      [1 / 2, 13],
      [3 / 4, 19],
      [1, 25],
      [1.5, 38],
      [2, 50],
    ];
    for (const entry of GUIDE_PUSH_TABLE.filter((e) => e.family === "mark")) {
      const pair = pairs.find(([inches]) => inches === Math.abs(entry.inches ?? NaN));
      expect(pair, entry.key).toBeDefined();
      expect(Math.abs(entry.metricMm ?? NaN), entry.key).toBe(pair![1]);
    }
  });

  it("degrees, percentages, the ratio and the scale are the same in both systems", () => {
    for (const entry of GUIDE_PUSH_TABLE.filter((e) => ["degrees", "percent", "ratio", "scale"].includes(e.family))) {
      expect(guidePushAmount(entry, "metric"), entry.key).toBe(guidePushAmount(entry, "imperial"));
    }
  });

  it("the maker's bend stays in inches in both systems (its order code)", () => {
    for (const system of UNITS_SYSTEMS) {
      expect(guidePush(system).rocker.bend).toBe(inchesToMm(1 / 2));
      expect(guidePush(system).rocker.bendFrom).toBe(inchesToMm(18));
    }
  });
});

describe("the frames", () => {
  it("are the sketch's inches", () => {
    expect(GUIDE_FRAME.volume.planMargin).toBe(inchesToMm(2));
    expect(GUIDE_FRAME.volume.sectionHalfSpan).toBe(inchesToMm(6));
    expect(GUIDE_FRAME.fins.stringerTo).toBe(inchesToMm(26));
    expect(GUIDE_FRAME.rocker.centerSpan).toBe(inchesToMm(36));
  });

  it("FINS' tail window is 24 inches or 60 centimetres, a round figure of each system", () => {
    expect(guideFrame("imperial").finsTailWindow).toBe(inchesToMm(24));
    expect(formatDim(guideFrame("metric").finsTailWindow, "metric")).toBe("60.0 cm");
  });
});
