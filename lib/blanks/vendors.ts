/**
 * The blank makers — the three companies whose catalogues the ROCKER blank list is built from —
 * and the few pure rules a shaper's "which makers do I want to see" choice needs (quick task
 * 260926-wmf).
 *
 * The choice is stored as the makers a shaper switched OFF, not the ones they kept on. That way a
 * maker added to the catalogue later starts switched on for everybody, the same as the three here
 * did, instead of being silently hidden from every shaper who ever touched the tick boxes.
 *
 * The list of makers is written out here rather than read from the catalogue files, because the
 * file reader (`seed-files.ts`) reads the disk and only runs on the server, while this list is also
 * needed in the browser, where the tick boxes and the ROCKER list live. The unit test checks this
 * list against the files, so a fourth maker's catalogue fails a test until it is named here too.
 *
 * No React, browser, database or Node import.
 */

/** The catalogue makers, in the order their catalogue files are read. */
export const KNOWN_BLANK_VENDORS = ["US Blanks", "Arctic Foam", "Marko Foam"] as const;

/**
 * The note at the end of ROCKER's blank picker (the founder's own sentence, 2026-10-06, quick
 * 261006-fom, D-05): where the numbers come from, that real blanks vary, and whose trademarks the
 * makers' names are. Deliberately the same whatever makers a shaper has switched off in Settings —
 * it is a notice about whose catalogs and trademarks these are, not a list of what is shown — and
 * the test checks it names every maker above, so a fourth maker fails it until the founder's note
 * is updated too. The apostrophe in "manufacturers'" is straight, as the founder typed it.
 */
export const BLANK_CATALOG_NOTE =
  "Blank dimensions are from manufacturers' published catalogs and may vary in production. Verify before you cut. US Blanks, Arctic Foam and Marko Foam are trademarks of their owners.";

/** One of the catalogue makers, spelled exactly as its catalogue spells it. */
export type BlankVendor = (typeof KNOWN_BLANK_VENDORS)[number];

/** True only for a maker's exact name (same spelling, same capitals). */
export function isKnownBlankVendor(value: unknown): value is BlankVendor {
  return typeof value === "string" && (KNOWN_BLANK_VENDORS as readonly string[]).includes(value);
}

/** The makers still shown, in catalogue order: every known maker minus the hidden ones. */
export function shownBlankVendors(hidden: readonly BlankVendor[]): BlankVendor[] {
  return KNOWN_BLANK_VENDORS.filter((vendor) => !hidden.includes(vendor));
}

/**
 * The blanks a shaper wants to see: every item whose maker is not hidden, order kept. With nothing
 * hidden it hands back the very same list (not a copy), so anything worked out from the list
 * downstream is not worked out again. A blank from a maker the app doesn't know is always kept —
 * a tick box can only hide a maker it offers.
 */
export function filterShownBlanks<T>(
  items: readonly T[],
  hidden: readonly BlankVendor[],
  vendorOf: (item: T) => string,
): readonly T[] {
  if (hidden.length === 0) return items;
  return items.filter((item) => {
    const vendor = vendorOf(item);
    return !(isKnownBlankVendor(vendor) && hidden.includes(vendor));
  });
}

/** "A", "A and B", or "A, B and C" — the way a shaper would list them out loud. */
function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The one line the ROCKER blank list adds when a maker is switched off — "Showing US Blanks and
 * Marko Foam only — change in Settings" — or null when every maker is shown, so the list reads
 * exactly as it always has.
 */
export function blankMakersNote(hidden: readonly BlankVendor[]): string | null {
  if (hidden.length === 0) return null;
  return `Showing ${joinNames(shownBlankVendors(hidden))} only — change in Settings`;
}

/**
 * How the list's own sentences name the catalogues being searched: exactly "the three catalogs"
 * with every maker shown (today's wording, unchanged), otherwise "the US Blanks catalog" or "the US
 * Blanks and Marko Foam catalogs" — so a sentence like "the longest blank in …" never quotes a
 * blank from a maker the shaper has switched off.
 */
export function catalogsPhrase(hidden: readonly BlankVendor[]): string {
  if (hidden.length === 0) return "the three catalogs";
  const shown = shownBlankVendors(hidden);
  return `the ${joinNames(shown)} ${shown.length === 1 ? "catalog" : "catalogs"}`;
}
