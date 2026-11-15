import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BLANK_CATALOG_SITES,
  blankCatalogLink,
  catalogUrlFromCatalogue,
  isMakerPageAddress,
} from "./catalog-link";
import { readSeedCatalog } from "./seed-files";
import { KNOWN_BLANK_VENDORS } from "./vendors";

/**
 * The maker's-page link rule (quick 261114-vwo). The audit of 2026-11-14 is the source of every address in the seed;
 * the counts below are its counts, so a blank gaining or losing a page shows up here.
 */

const CATALOG = readSeedCatalog();
const byVendor = (vendor: string) => CATALOG.filter((record) => record.vendor === vendor);

describe("the makers' addresses", () => {
  it("names every known maker exactly once, each at an https address", () => {
    expect(Object.keys(BLANK_CATALOG_SITES).sort()).toEqual([...KNOWN_BLANK_VENDORS].sort());
    for (const site of Object.values(BLANK_CATALOG_SITES)) expect(site).toMatch(/^https:\/\/[a-z0-9.-]+\//);
  });
});

describe("blankCatalogLink", () => {
  const usBlank = { vendor: "US Blanks", name: `6'2"A`, catalogUrl: "https://usblanks.com/catalog/fish-eggs/62a/" };

  it("links a US Blanks blank to its catalogue page and says whose page, which blank, new tab", () => {
    expect(blankCatalogLink(usBlank)).toEqual({
      href: "https://usblanks.com/catalog/fish-eggs/62a/",
      label: `Open the US Blanks catalog page for 6'2"A in a new tab`,
    });
  });

  it("links an Arctic Foam blank to the catalogue PDF at its page", () => {
    const link = blankCatalogLink({ vendor: "Arctic Foam", name: `6'2" F`, catalogUrl: "https://arcticfoam.us/s/2024Catalog.pdf#page=15" });
    expect(link?.href).toBe("https://arcticfoam.us/s/2024Catalog.pdf#page=15");
  });

  it("draws nothing where the maker has no page (null) or the copy predates the column (absent)", () => {
    expect(blankCatalogLink({ vendor: "Marko Foam", name: `10'2" M`, catalogUrl: null })).toBeNull();
    expect(blankCatalogLink({ vendor: "Marko Foam", name: `10'2" M` })).toBeNull();
    expect(blankCatalogLink({ vendor: "Marko Foam", name: `10'2" M`, catalogUrl: "" })).toBeNull();
  });

  it("refuses an address that is not the maker's own, whoever stored it", () => {
    // Another maker's site, a look-alike host, a different scheme, the bare site with no page, odd characters.
    for (const catalogUrl of [
      "https://markofoamblanks.com/products/62a",
      "https://usblanks.com.evil.example/catalog/fish-eggs/62a/",
      "http://usblanks.com/catalog/fish-eggs/62a/",
      "https://usblanks.com/catalog/",
      "https://usblanks.com/catalog/fish-eggs/62a/?utm=x",
      "https://usblanks.com/catalog/fish-eggs/62a/<script>",
      "javascript:alert(1)",
    ]) {
      expect(blankCatalogLink({ ...usBlank, catalogUrl }), catalogUrl).toBeNull();
    }
  });

  it("refuses a maker the app does not know, even at a known address", () => {
    expect(blankCatalogLink({ ...usBlank, vendor: "Someone Else" })).toBeNull();
    expect(isMakerPageAddress("Someone Else", usBlank.catalogUrl)).toBe(false);
  });

  it("never builds an address from the blank's name", () => {
    const link = blankCatalogLink({ ...usBlank, name: `<img src=x onerror=alert(1)>` });
    expect(link?.href).toBe(usBlank.catalogUrl);
    expect(link?.label).toContain("<img src=x onerror=alert(1)>");
  });
});

describe("the seed's addresses", () => {
  it("every stored address passes the rule — none is a page that could not be drawn", () => {
    for (const record of CATALOG) {
      if (record.catalogUrl === null) continue;
      expect(blankCatalogLink(record), `${record.vendor} ${record.name}`).not.toBeNull();
    }
  });

  it("has a page for every US Blanks and Arctic Foam blank, 23 of 28 Marko Foam and 59 of 61 Millennium Foam", () => {
    const withPage = (vendor: string) => byVendor(vendor).filter((record) => record.catalogUrl !== null).length;
    expect([byVendor("US Blanks").length, withPage("US Blanks")]).toEqual([101, 101]);
    expect([byVendor("Arctic Foam").length, withPage("Arctic Foam")]).toEqual([33, 33]);
    expect([byVendor("Marko Foam").length, withPage("Marko Foam")]).toEqual([28, 23]);
    expect([byVendor("Millennium Foam").length, withPage("Millennium Foam")]).toEqual([61, 59]);
  });

  it("names the five Marko and two Millennium blanks the audit found no page for", () => {
    const without = CATALOG.filter((record) => record.catalogUrl === null).map((record) => `${record.vendor} ${record.name}`);
    expect(without.sort()).toEqual(
      [
        `Marko Foam 10'2" M`,
        `Marko Foam 10'2" M Thick`,
        `Marko Foam 9'6" MK`,
        `Marko Foam 8'0" Gun`,
        `Marko Foam 10'6" Gun`,
        `Millennium Foam 6'11"P`,
        `Millennium Foam 11'9"P`,
      ].sort(),
    );
  });

  it("opens Arctic Foam's catalogue PDF at the very page the rows were read from", () => {
    for (const record of byVendor("Arctic Foam")) {
      expect(record.catalogUrl, record.name).toBe(`https://arcticfoam.us/s/2024Catalog.pdf#page=${record.pdfPage}`);
    }
  });

  it("gives no two blanks the same page", () => {
    const urls = CATALOG.map((record) => record.catalogUrl).filter((url): url is string => url !== null);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("holds the two addresses the audit found answering for the wrong blank corrected", () => {
    const url = (vendor: string, name: string) => CATALOG.find((r) => r.vendor === vendor && r.name === name)?.catalogUrl;
    expect(url("US Blanks", `6'9"EAX`)).toBe("https://usblanks.com/catalog/shortboard/6-9-eax/");
    expect(url("US Blanks", `11'8"BG`)).toBe("https://usblanks.com/catalog/guns/118bg/");
  });

  it("matches the audit's verified-page tables address for address", () => {
    const audit = readFileSync(new URL("../../.planning/research/blank-link-audit-2026-11-14.md", import.meta.url), "utf8");
    let vendor = "";
    let checked = 0;
    for (const line of audit.split("\n")) {
      const heading = /^## (US Blanks|Marko Foam|Millennium Foam)/.exec(line);
      if (heading) vendor = heading[1];
      else if (line.startsWith("## ")) vendor = "";
      if (!vendor || !line.startsWith("| ") || line.startsWith("| blank_name") || line.startsWith("|---")) continue;
      const cells = line.split("|").map((cell) => cell.trim());
      const record = CATALOG.find((r) => r.vendor === vendor && r.name === cells[1]);
      expect(record, `${vendor} ${cells[1]}`).toBeDefined();
      const verified = /https:\/\/\S+/.exec(cells[3])?.[0] ?? null;
      expect(record!.catalogUrl, `${vendor} ${cells[1]}`).toBe(verified);
      checked++;
    }
    expect(checked).toBe(101 + 28 + 61);
  });
});

describe("catalogUrlFromCatalogue", () => {
  const catalogue = CATALOG;
  const fish = catalogue.find((record) => record.vendor === "US Blanks" && record.name === `5'10"RP`)!;

  it("answers an old copy (no field) from the catalogue's record of the same maker and name", () => {
    const oldCopy = { vendor: fish.vendor, name: fish.name };
    expect(catalogUrlFromCatalogue(oldCopy, catalogue)).toBe("https://usblanks.com/catalog/fish-eggs/510rp/");
  });

  it("answers a copy that carries the field from itself, an address or a null alike", () => {
    expect(catalogUrlFromCatalogue({ ...fish, catalogUrl: "https://usblanks.com/catalog/x/" }, catalogue)).toBe("https://usblanks.com/catalog/x/");
    expect(catalogUrlFromCatalogue({ ...fish, catalogUrl: null }, catalogue)).toBeNull();
  });

  it("answers null for a blank the catalogue does not have", () => {
    expect(catalogUrlFromCatalogue({ vendor: "US Blanks", name: "not a blank" }, catalogue)).toBeNull();
    expect(catalogUrlFromCatalogue({ vendor: "AkuShaper", name: fish.name }, catalogue)).toBeNull();
  });
});
