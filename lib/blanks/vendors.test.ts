import { describe, expect, it } from "vitest";
import { readSeedCatalog } from "./seed-files";
import {
  BLANK_CATALOG_NOTE,
  KNOWN_BLANK_VENDORS,
  blankMakersNote,
  catalogsPhrase,
  filterShownBlanks,
  isKnownBlankVendor,
  shownBlankVendors,
} from "./vendors";

interface Item {
  vendor: string;
  name: string;
}

const ITEMS: Item[] = [
  { vendor: "US Blanks", name: "a" },
  { vendor: "Arctic Foam", name: "b" },
  { vendor: "Marko Foam", name: "c" },
  { vendor: "Arctic Foam", name: "d" },
  { vendor: "US Blanks", name: "e" },
];
const vendorOf = (item: Item) => item.vendor;

describe("the blank makers", () => {
  it("are exactly the makers the catalogue files name, in the order the files are read (drift guard)", () => {
    const seen: string[] = [];
    for (const record of readSeedCatalog()) {
      if (!seen.includes(record.vendor)) seen.push(record.vendor);
    }
    expect([...KNOWN_BLANK_VENDORS]).toEqual(seen);
    expect([...KNOWN_BLANK_VENDORS]).toEqual(["US Blanks", "Arctic Foam", "Marko Foam"]);
  });

  it("isKnownBlankVendor matches a maker's name exactly and nothing else", () => {
    expect(isKnownBlankVendor("US Blanks")).toBe(true);
    expect(isKnownBlankVendor("Marko Foam")).toBe(true);
    for (const junk of ["us blanks", "US Blanks ", "Clark Foam", "", null, undefined, 3, ["US Blanks"], {}]) {
      expect(isKnownBlankVendor(junk), JSON.stringify(junk)).toBe(false);
    }
  });

  it("shownBlankVendors lists the makers still shown, in catalogue order", () => {
    expect(shownBlankVendors([])).toEqual(["US Blanks", "Arctic Foam", "Marko Foam"]);
    expect(shownBlankVendors(["Marko Foam", "US Blanks"])).toEqual(["Arctic Foam"]);
  });
});

describe("filterShownBlanks", () => {
  it("hands back the very same list when nothing is hidden", () => {
    expect(filterShownBlanks(ITEMS, [], vendorOf)).toBe(ITEMS);
  });

  it("leaves out exactly the hidden maker's blanks and keeps the order", () => {
    expect(filterShownBlanks(ITEMS, ["Arctic Foam"], vendorOf).map((item) => item.name)).toEqual(["a", "c", "e"]);
    expect(filterShownBlanks(ITEMS, ["Arctic Foam", "US Blanks"], vendorOf).map((item) => item.name)).toEqual(["c"]);
  });

  it("always keeps a blank whose maker is not one the app knows", () => {
    const withStranger = [...ITEMS, { vendor: "Clark Foam", name: "z" }];
    expect(filterShownBlanks(withStranger, ["Arctic Foam"], vendorOf).map((item) => item.name)).toEqual([
      "a",
      "c",
      "e",
      "z",
    ]);
  });
});

describe("blankMakersNote", () => {
  it("is nothing at all when every maker is shown", () => {
    expect(blankMakersNote([])).toBeNull();
  });

  it("names the makers still shown, joined the way a shaper would say it", () => {
    expect(blankMakersNote(["Arctic Foam"])).toBe("Showing US Blanks and Marko Foam only — change in Settings");
    expect(blankMakersNote(["Arctic Foam", "Marko Foam"])).toBe("Showing US Blanks only — change in Settings");
    expect(blankMakersNote(["US Blanks"])).toBe("Showing Arctic Foam and Marko Foam only — change in Settings");
  });

  it("always names the makers in catalogue order, whatever order the hidden list is in", () => {
    expect(blankMakersNote(["Marko Foam", "Arctic Foam"])).toBe("Showing US Blanks only — change in Settings");
    expect(blankMakersNote(["US Blanks", "Arctic Foam"])).toBe(blankMakersNote(["Arctic Foam", "US Blanks"]));
  });
});

describe("catalogsPhrase", () => {
  it("is exactly today's wording when every maker is shown", () => {
    expect(catalogsPhrase([])).toBe("the three catalogs");
  });

  it("names one catalog, or several, when makers are hidden", () => {
    expect(catalogsPhrase(["Arctic Foam"])).toBe("the US Blanks and Marko Foam catalogs");
    expect(catalogsPhrase(["Arctic Foam", "Marko Foam"])).toBe("the US Blanks catalog");
    expect(catalogsPhrase(["Marko Foam", "US Blanks"])).toBe("the Arctic Foam catalog");
  });
});

describe("the catalog note under ROCKER's blank picker (quick 261006-fom, D-05)", () => {
  it("is the founder's sentence, exactly", () => {
    expect(BLANK_CATALOG_NOTE).toBe(
      "Blank dimensions are from manufacturers' published catalogs and may vary in production. Verify before you cut. US Blanks, Arctic Foam and Marko Foam are trademarks of their owners.",
    );
  });

  it("names every maker the app knows, so a fourth maker fails here until the note is updated", () => {
    for (const vendor of KNOWN_BLANK_VENDORS) {
      expect(BLANK_CATALOG_NOTE).toContain(vendor);
    }
  });
});
