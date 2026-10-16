import { describe, expect, it } from "vitest";
import {
  BLANK_PICKER_VIEW_STORAGE_KEY,
  blankPickerViewJson,
  DEFAULT_BLANK_PICKER_VIEW,
  parseBlankPickerView,
  parseBlankPickerViewText,
} from "./blank-picker-view-preference";

// Flat / Upright and Show my board, remembered in this browser (quick 261015-ve9, D-02, D-04, D-13,
// T-ve9-07).

describe("blank picker view preference", () => {
  it("is stored under shaper-blank-picker-view, Flat and On by default", () => {
    expect(BLANK_PICKER_VIEW_STORAGE_KEY).toBe("shaper-blank-picker-view");
    expect(DEFAULT_BLANK_PICKER_VIEW).toEqual({ drawn: "flat", showBoard: true });
  });

  it("keeps each field only when it is allowed, the other falling back on its own", () => {
    expect(parseBlankPickerView({ drawn: "upright", showBoard: false })).toEqual({ drawn: "upright", showBoard: false });
    expect(parseBlankPickerView({ drawn: "sideways", showBoard: false })).toEqual({ drawn: "flat", showBoard: false });
    expect(parseBlankPickerView({ drawn: "upright", showBoard: "no" })).toEqual({ drawn: "upright", showBoard: true });
    expect(parseBlankPickerView({ drawn: "UPRIGHT", showBoard: 0 })).toEqual(DEFAULT_BLANK_PICKER_VIEW);
    expect(parseBlankPickerView({})).toEqual(DEFAULT_BLANK_PICKER_VIEW);
  });

  it("reads anything that is not an object as the default", () => {
    for (const junk of [null, undefined, "upright", 3, true, ["upright", false]]) {
      expect(parseBlankPickerView(junk)).toEqual(DEFAULT_BLANK_PICKER_VIEW);
    }
  });

  it("reads nothing stored and malformed JSON as the default, and round-trips what it writes", () => {
    for (const junk of [null, undefined, "", "not-json", "{oops"]) {
      expect(parseBlankPickerViewText(junk)).toEqual(DEFAULT_BLANK_PICKER_VIEW);
    }
    const view = { drawn: "upright" as const, showBoard: false };
    expect(parseBlankPickerViewText(blankPickerViewJson(view))).toEqual(view);
  });
});
