import { describe, expect, it } from "vitest";
import { guideVolumeInput } from "@/lib/geometry/__fixtures__/guide-volume-input";
import { guideCardId } from "@/lib/geometry/guide-card";
import { stationLabel } from "@/lib/geometry/measure-display";
import { mm } from "@/lib/geometry/units";
import { computeVolume } from "@/lib/geometry/volume";
import { GUIDE_COPY, guideBoardName, guideIntro, guideLines, type GuideWordsCard } from "./guide-copy";
import { GUIDE_METRIC_SAYINGS } from "./words/metric-sayings";
import { VOLUME_GUIDE_INTRO, VOLUME_GUIDE_WORDS } from "./words/volume";

const card = (id: string): GuideWordsCard => VOLUME_GUIDE_WORDS.find((c) => c.id === id)!;
const LENGTH = guideCardId("volume", "Inputs", "Board Length");
const THICKNESS = guideCardId("volume", "Inputs", "Center Thickness");
const WEIGHTED = guideCardId("volume", "What the ESTIMATE card reads", "Length-Weighted Effective Thickness");

describe("GUIDE_COPY", () => {
  it("names the scroller after the page, as the top bar's word reads", () => {
    expect(GUIDE_COPY.regionLabel("volume")).toBe("Guide to Volume");
    expect(GUIDE_COPY.regionLabel("fins")).toBe("Guide to Fins");
    expect(GUIDE_COPY.tab).toBe("GUIDE");
  });
});

describe("guideBoardName", () => {
  it("says `board` for a board never saved or named — never `your Untitled`", () => {
    expect(guideBoardName("")).toBe("board");
    expect(guideBoardName("Untitled")).toBe("board");
    expect(guideBoardName("  Fish for Jo  ")).toBe("Fish for Jo");
  });
});

describe("guideLines", () => {
  it("hands an Imperial shaper the page's own lines, untouched", () => {
    for (const words of VOLUME_GUIDE_WORDS) {
      expect(guideLines(words, "imperial")).toEqual({ is: words.is, does: words.does, info: words.info, how: words.how });
    }
  });

  it("swaps each Metric saying in once and leaves everything else as the page has it", () => {
    const metric = guideLines(card(LENGTH), "metric");
    expect(metric.does).toBe(
      card(LENGTH).does.replace(GUIDE_METRIC_SAYINGS[LENGTH][0].imperial, GUIDE_METRIC_SAYINGS[LENGTH][0].metric),
    );
    expect(metric.is).toBe(card(LENGTH).is);
    expect(metric.how).toBe(card(LENGTH).how);
  });

  it("throws when a Metric saying's Imperial phrase is not on the card, so an inch can never slip through", () => {
    const changed = { ...card(LENGTH), does: "A sentence someone rewrote." };
    expect(() => guideLines(changed, "metric")).toThrow(/Imperial phrase/);
  });

  it("leaves no inch or foot figure on any VOLUME card in Metric", () => {
    for (const words of VOLUME_GUIDE_WORDS) {
      const lines = guideLines(words, "metric");
      for (const line of [lines.is, lines.does, lines.info, lines.how]) {
        if (line === null) continue;
        expect(line, words.name).not.toMatch(/\d\s*("|''|″|in\b|inch)|\binch(es)?\b|\d'/);
      }
    }
  });

  it("says the 12-inch station by its own Metric label", () => {
    expect(GUIDE_METRIC_SAYINGS[WEIGHTED][0].metric).toBe(`tail at ${stationLabel("metric")}`);
    expect(guideLines(card(WEIGHTED), "metric").how).toContain(stationLabel("metric"));
  });

  it("says half a centimetre at the centre in the Shortboard's own round litres", () => {
    const input = guideVolumeInput("shortboard");
    const quick = { ...input.effectiveVolume, importTemplateDimensions: false, importRailThickness: false };
    const gain =
      computeVolume({ ...quick, centerThickness: mm(quick.centerThickness + 5) }, null, null).volumeLitres -
      computeVolume(quick, null, null).volumeLitres;
    const WORDS = ["no", "one", "two", "three", "four", "five", "six"];
    expect(GUIDE_METRIC_SAYINGS[THICKNESS][0].metric).toBe(
      `half a centimetre at the centre is about ${WORDS[Math.round(gain)]} litres on a shortboard`,
    );
  });
});

describe("guideIntro", () => {
  it("fills the board's name where the page says Shortboard", () => {
    const text = guideIntro(VOLUME_GUIDE_INTRO, "imperial", { board: "board" });
    expect(text).toContain("Every card is your board —");
    expect(text).not.toContain("{board}");
    expect(guideIntro(VOLUME_GUIDE_INTRO, "metric", { board: "board" }, "volume")).toBe(text);
  });
});
