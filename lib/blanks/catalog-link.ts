/**
 * The maker's own page for a blank — the one rule that turns a blank record's stored address into a link
 * (quick 261114-vwo; the to-do of 2026-09-26; the founder's ruling of 2026-11-14: on the picked blank's card and
 * on ROCKER's DATASHEET, in a new tab, and nowhere else).
 *
 * Every blank in the seed CSVs carries `catalogUrl`, written out in full from the audit of 2026-11-14
 * (`.planning/research/blank-link-audit-2026-11-14.md`, every address fetched and its title matched to the blank):
 *
 * - US Blanks — a catalogue page per blank, `https://usblanks.com/catalog/<series>/<slug>/` (101 of 101).
 * - Marko Foam — a store page per blank, `https://markofoamblanks.com/products/<handle>` (23 of 28; five have none).
 * - Millennium Foam — a store page per model, `https://millenniumfoam.com/<slug>/` (59 of 61; two have none).
 * - Arctic Foam — no page per blank; the 2024 catalogue PDF opened at the blank's own page, `…/2024Catalog.pdf#page=N`
 *   (every page checked against the seed's `pdf_page` with pypdf, 2026-11-14; 33 of 33).
 *
 * A stored address becomes a link ONLY when its maker is one of the four and the address starts with that maker's
 * address below and holds nothing but plain address characters — so a saved board's copy (free text from a file,
 * WR-04) can never put an address of its own choosing on the screen. Anything else draws nothing: a wrong page is
 * worse than none. Maker names and blank names are catalogue text and are rendered as React text only; this file
 * builds no address from them (Phase 11's T-11-21/T-11-27 rule).
 *
 * No React, browser, database or Node import.
 */
import type { BlankRecord } from "@/lib/geometry/blank";
import { isKnownBlankVendor, type BlankVendor } from "./vendors";

/** Where each maker's pages live: every link to that maker must start with this. */
export const BLANK_CATALOG_SITES: Record<BlankVendor, string> = {
  "US Blanks": "https://usblanks.com/catalog/",
  "Arctic Foam": "https://arcticfoam.us/s/2024Catalog.pdf",
  "Marko Foam": "https://markofoamblanks.com/products/",
  "Millennium Foam": "https://millenniumfoam.com/",
};

/** The characters an address may hold: letters, digits, the scheme's colon, and the handful of marks a slug, a path
 * or a `#page=` uses — no `?`, no `&`, no quotes or brackets. */
const ADDRESS_CHARACTERS = /^[A-Za-z0-9:./_#=-]+$/;

/** A link to the maker's page for a blank: where it goes and how it is announced. */
export interface BlankCatalogLink {
  /** The full address, exactly as stored and checked. */
  href: string;
  /** The link's accessible name — says whose page, which blank, and that it opens a new tab. */
  label: string;
}

/** The fields the rule reads — a full record, a board's saved copy or a bare lookup result all serve. */
export type BlankCatalogLinkSource = Pick<BlankRecord, "vendor" | "name" | "catalogUrl">;

/**
 * True when `url` is an address this maker's pages live at: the maker is known, the address starts with the maker's
 * own and carries only plain address characters.
 */
export function isMakerPageAddress(vendor: string, url: unknown): url is string {
  if (!isKnownBlankVendor(vendor) || typeof url !== "string") return false;
  const site = BLANK_CATALOG_SITES[vendor];
  return url.startsWith(site) && url.length > site.length && ADDRESS_CHARACTERS.test(url);
}

/**
 * The link for a blank, or null when there is nothing safe to draw: no address stored (the maker has no page for
 * it, or the copy predates the column), a maker the app does not know, or an address that is not that maker's.
 */
export function blankCatalogLink(record: BlankCatalogLinkSource): BlankCatalogLink | null {
  const url = record.catalogUrl;
  if (!isMakerPageAddress(record.vendor, url)) return null;
  return {
    href: url,
    label: `Open the ${record.vendor} catalog page for ${record.name} in a new tab`,
  };
}

/**
 * The address for a board's copy of a blank saved before the column existed (its `catalogUrl` is absent, not
 * null): the loaded catalogue's own record of the same maker and name, when it has one. A copy that carries the
 * field — an address or a null — is answered from itself; the catalogue is not consulted.
 */
export function catalogUrlFromCatalogue(
  copy: BlankCatalogLinkSource,
  catalogue: readonly BlankCatalogLinkSource[],
): string | null {
  if (copy.catalogUrl !== undefined) return copy.catalogUrl;
  const match = catalogue.find((record) => record.vendor === copy.vendor && record.name === copy.name);
  return match?.catalogUrl ?? null;
}
