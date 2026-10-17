import { describe, expect, it } from "vitest";
import { BLANK_TEXT_MAX, isPickable } from "@/lib/blanks/catalog";
import { readSeedCatalog } from "@/lib/blanks/seed-files";
import { formatThinningStart } from "./blank-reasons";
import { blankStarIdentity, type RockerChange } from "./custom-rocker";
import {
  addSecondChangeLabel,
  amountHints,
  bendSliderName,
  bendStartHints,
  bendStartText,
  CUSTOM_ROCKER_FIT_LINE,
  customizeButtonLabel,
  customizeTitle,
  customRockerFootnote,
  customRockerRowLabel,
  endHeading,
  FLOOR_HINT,
  FOOTER_WORDS,
  NATURAL_ROCKER_LABEL,
  naturalRockerRowLabel,
  OVERLAY_KEY,
  rockerAmountText,
  rockerChangeLabel,
  rockerSliderName,
} from "./custom-rocker-text";
import { columnUnitSuffix, formatSignedMark } from "./measure-display";
import { inchesToMm, mm, UNITS_SYSTEMS } from "./units";

// Every word and number the Customize Rocker popup, its button and the DATASHEET's custom rows show
// (quick 261016-mkb). Expected figures are composed from the app's own formatters, never typed.

describe("the button and the title (D-04)", () => {
  it("read Customize Rocker on a natural blank and Edit Custom Rocker on a custom one", () => {
    expect(customizeButtonLabel(false)).toBe("Customize Rocker");
    expect(customizeButtonLabel(true)).toBe("Edit Custom Rocker");
    expect(customizeTitle(false)).toBe("Customize Rocker");
    expect(customizeTitle(true)).toBe("Edit Custom Rocker");
  });
});

describe("the rows (D-05, D-06)", () => {
  it("names the ends and the change rows", () => {
    expect(endHeading("nose")).toBe("Nose");
    expect(endHeading("tail")).toBe("Tail");
    expect(rockerChangeLabel(0)).toBe("Change");
    expect(rockerChangeLabel(1)).toBe("Second change");
    expect(addSecondChangeLabel("nose")).toBe("+ Add a second nose change");
    expect(addSecondChangeLabel("tail")).toBe("+ Add a second tail change");
    expect(NATURAL_ROCKER_LABEL).toBe("↺ Natural rocker");
    expect(CUSTOM_ROCKER_FIT_LINE).toBe("The fit never changes — bending a blank leaves its thickness and width alone.");
  });

  for (const system of UNITS_SYSTEMS) {
    it(`a change's amount reads as a signed mark, ${system}`, () => {
      for (const v of [inchesToMm(0.5), inchesToMm(-0.25), mm(13), mm(0)]) {
        expect(rockerAmountText(v, system)).toBe(formatSignedMark(v, system));
      }
    });

    it(`where a bend starts reads as a dim with "in", or At the centre, ${system}`, () => {
      expect(bendStartText(null, system)).toBe("At the centre");
      expect(bendStartText(18, system)).toBe(`${formatThinningStart(inchesToMm(18), system)} in`);
    });
  }

  it("reads the plan's own examples", () => {
    expect(rockerAmountText(inchesToMm(0.5), "imperial")).toBe('+1/2"');
    expect(rockerAmountText(mm(13), "metric")).toBe("+13 mm");
    expect(bendStartText(18, "imperial")).toBe('18" in');
  });

  it("the floor hint is the founder's sentence, only when on the floor", () => {
    expect(FLOOR_HINT).toBe("Floor — the tip would drop below the centre");
    expect(amountHints(true)).toEqual([FLOOR_HINT, "More"]);
    expect(amountHints(false)).toEqual(["Less", "More"]);
  });

  it("the bend hints run from the tip to the centre", () => {
    expect(bendStartHints("nose", 0)).toEqual(["Near the nose", "At the centre"]);
    expect(bendStartHints("tail", 1)).toEqual(["Near the tail", "Nearer the centre"]);
  });

  it("names every slider for a screen reader", () => {
    expect(rockerSliderName("nose", 0)).toBe("Nose rocker change");
    expect(rockerSliderName("nose", 1)).toBe("Second nose rocker change");
    expect(rockerSliderName("tail", 0)).toBe("Tail rocker change");
    expect(bendSliderName("nose", 0)).toBe("Nose bend starts");
    expect(bendSliderName("tail", 1)).toBe("Second tail bend starts");
  });
});

describe("the drawing's key and the footer (D-07, D-09)", () => {
  it("the key reads as one sentence, its two colour words marked", () => {
    expect(OVERLAY_KEY.map((p) => p.text).join("")).toBe(
      "Natural dashed · the first change red · the second change blue, on top of the first",
    );
    expect(OVERLAY_KEY.filter((p) => p.tone === 1).map((p) => p.text)).toEqual(["the first change red"]);
    expect(OVERLAY_KEY.filter((p) => p.tone === 2).map((p) => p.text)).toEqual(["the second change blue"]);
  });

  it("the footer's words", () => {
    expect(FOOTER_WORDS).toEqual({
      cancel: "Cancel",
      saveNew: "Use and save as a new blank",
      editCurrent: "Use and edit current blank",
      useNatural: "Use the natural rocker",
    });
  });
});

describe("the DATASHEET's custom rows (D-03)", () => {
  for (const system of UNITS_SYSTEMS) {
    it(`Natural Rocker over Custom Rocker, ${system}`, () => {
      expect(naturalRockerRowLabel(system)).toBe(`Natural Rocker${columnUnitSuffix("mark", system)}`);
      expect(customRockerRowLabel(system)).toBe(`Custom Rocker${columnUnitSuffix("mark", system)}`);
    });
  }

  it("the footnote names the note and asks for a check on the foam", () => {
    expect(customRockerFootnote('-1/4"N18"')).toBe(
      "Natural Rocker is the catalog page's. Custom Rocker is the blank as ordered (-1/4\"N18\") — check it on the foam.",
    );
  });
});

describe("a custom blank's star fits the stars' reader (plan 01's note)", () => {
  it("on every pickable blank, with the longest note four changes can write", () => {
    // The widest note: four changes, each the widest amount and a two-digit bend point.
    const widest: RockerChange[] = [
      { end: "nose", amount: inchesToMm(-1 - 15 / 16), fromTip: inchesToMm(40) },
      { end: "nose", amount: inchesToMm(-1 - 15 / 16), fromTip: inchesToMm(39) },
      { end: "tail", amount: inchesToMm(-1 - 15 / 16), fromTip: inchesToMm(40) },
      { end: "tail", amount: inchesToMm(-1 - 15 / 16), fromTip: inchesToMm(39) },
    ];
    const pickable = readSeedCatalog().filter(isPickable);
    expect(pickable.length).toBe(219);
    for (const record of pickable) {
      const [vendor, name] = blankStarIdentity(record, { changes: widest });
      expect(vendor.length, record.name).toBeLessThanOrEqual(BLANK_TEXT_MAX);
      expect(name.length, record.name).toBeLessThanOrEqual(BLANK_TEXT_MAX);
    }
  });
});
