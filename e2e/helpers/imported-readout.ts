import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Quick 261018-fg1 — finding and reading the INPUTS readout card (sketch 017 C) on ROCKER, RAILS,
 * VOLUME and FINS. The card is a group named by its caption (`From TEMPLATE`, `From ROCKER & FOIL`,
 * `From TEMPLATE and ROCKER & FOIL`)
 * holding a list of name/value pairs.
 */

/**
 * The readout card whose caption is `caption`. Matched case-insensitively so a caption drawn in
 * capitals can never matter. Proves, once awaited visible, that the screen shows the card; a count of
 * 0 proves it is gone.
 */
export function importedReadout(scope: Page | Locator, caption: string): Locator {
  const escaped = caption.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return scope.getByRole("group", { name: new RegExp(`^${escaped}$`, "i") });
}

/**
 * Asserts the card holds exactly these name/value pairs, in this order: every `dt` (the name) and
 * every `dd` (the figure) must match, as string arrays. A string match folds whitespace (a
 * non-breaking space included) and reads textContent, so capitals drawn by CSS never matter.
 */
export async function expectReadout(card: Locator, pairs: [label: string, value: string][]): Promise<void> {
  await expect(card.locator("dt")).toHaveText(pairs.map(([label]) => label));
  await expect(card.locator("dd")).toHaveText(pairs.map(([, value]) => value));
}

/** The figure (the `dd`) of one readout, by its machine key (`length`, `width`, `tailBlock`, `depth`, ...). */
export function readoutValue(card: Locator, key: string): Locator {
  return card.locator(`[data-readout="${key}"] dd`);
}
