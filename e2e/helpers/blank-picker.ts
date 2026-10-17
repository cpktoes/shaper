import { expect, type Locator, type Page } from "@playwright/test";

/**
 * The one way every browser test reaches ROCKER's blank and picks one (quick 261015-ve9). Since
 * sketch 015 B the BLANK section is a single button that opens the PICK A BLANK popup, where every
 * blank long enough for the board is a drawn card, FITS THIS BOARD first. No spec types a catalogue
 * name or count: they pick "the first card under FITS THIS BOARD" and read its name off the page.
 */

/** The BLANK section's one button — the board's own blank, or Pick a Blank. */
export function blankButton(page: Page): Locator {
  return page.locator("[data-blank-button]");
}

/** The BLANK button while a blank is picked — it carries the blank's name and Change Blank. */
export function pickedCard(page: Page): Locator {
  return page.locator("[data-picked-blank]");
}

/** The PICK A BLANK popup. */
export function blankPicker(page: Page): Locator {
  return page.getByRole("dialog", { name: "Pick a Blank" });
}

/** The cards in the popup, in one group or both. */
export function blankCards(dialog: Locator, group?: "starred" | "fits" | "wontFit"): Locator {
  return dialog.locator(group ? `li[data-blank-card][data-group="${group}"]` : "li[data-blank-card]");
}

/** Waits until React owns the BLANK button with the catalogue judged — a tap before then reaches nothing. */
export async function waitForBlankButton(page: Page): Promise<void> {
  await expect(blankButton(page)).toBeVisible({ timeout: 30_000 });
  // The button streams in server-rendered, inside its own Suspense boundary, and becomes live only
  // once React hydrates that boundary (WebKit showed it: a tap too early is lost), so wait until
  // React owns the ready button.
  await page.waitForFunction(
    () => {
      const el = document.querySelector("[data-blank-button][data-catalog-ready]");
      return !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    },
    undefined,
    { timeout: 30_000 },
  );
}

/** Opens ROCKER and waits for its BLANK button to be live. */
export async function openRocker(page: Page): Promise<void> {
  await page.goto("/design/rocker");
  await waitForBlankButton(page);
}

/** Taps the BLANK button and waits for the popup and its first card. Returns the popup. */
export async function openBlankPicker(page: Page): Promise<Locator> {
  const dialog = blankPicker(page);
  // A popup still animating shut is not open; wait for it to go before tapping again.
  await expect(page.locator("[data-blank-picker][data-closed]")).toHaveCount(0);
  await expect(async () => {
    if (!(await dialog.isVisible())) await blankButton(page).click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await expect(blankCards(dialog).first()).toBeVisible({ timeout: 10_000 });
  return dialog;
}

/** The first card under FITS THIS BOARD, in the open popup. */
export function firstFittingCard(page: Page): Locator {
  return blankCards(blankPicker(page), "fits").first();
}

/** A card's pick button — the transparent button laid over the whole card, named `Use {vendor} {name}…`. */
export function cardButton(card: Locator): Locator {
  return card.getByRole("button", { name: /^Use / });
}

/** Opens the popup, picks the first fitting blank and returns its name as the page shows it. */
export async function pickFirstFittingBlank(page: Page): Promise<string> {
  await openBlankPicker(page);
  const card = firstFittingCard(page);
  const name = (await card.locator("[data-blank-name]").innerText()).trim();
  expect(name.length).toBeGreaterThan(0);
  await cardButton(card).click();
  await expect(blankPicker(page)).toBeHidden();
  await expect(pickedCard(page)).toContainText(name);
  return name;
}

/** Opens the popup, searches `{vendor} {name}` and picks the blank whose button starts `Use {vendor} {name}`. */
export async function pickBlankNamed(page: Page, vendor: string, name: string): Promise<void> {
  const dialog = await openBlankPicker(page);
  await dialog.getByRole("searchbox", { name: "Search blanks" }).fill(`${vendor} ${name}`);
  // The label is `Use {vendor} {name}`, plus `, doesn't fit: …` on a greyed card — so match it
  // exactly or up to that comma, never a longer name that merely starts the same. JSON.stringify gives
  // a quoted CSS string with any inch mark in the name escaped.
  const label = `Use ${vendor} ${name}`;
  const button = dialog.locator(
    `li[data-blank-card] button[aria-label=${JSON.stringify(label)}], ` +
      `li[data-blank-card] button[aria-label^=${JSON.stringify(`${label},`)}]`,
  );
  await expect(button).toHaveCount(1);
  await button.click();
  await expect(dialog).toBeHidden();
}

/** Closes the popup with Escape and waits for it to go. */
export async function closeBlankPicker(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  await expect(blankPicker(page)).toBeHidden();
}

/** A card's star (quick 261015-ve9, D-06) — named `Star …` or `Unstar …`, so found by its marker. */
export function starButton(card: Locator): Locator {
  return card.locator("[data-star]");
}

/** A visible button in the popup by its accessible name (a switch, a range chip, Starred only). */
export function chip(dialog: Locator, name: string | RegExp): Locator {
  return dialog.getByRole("button", { name });
}

/** A maker chip in the popup's filter bar — the same setting as Settings → Blank Makers (D-12). */
export function makerChip(dialog: Locator, vendor: string): Locator {
  return dialog.locator(`[data-maker-chip=${JSON.stringify(vendor)}]`);
}

/**
 * A `data-*` number off every card in the popup, in the order they are drawn (one group, or all).
 * An empty attribute (a blank whose catalogue prints no volume) reads as null.
 */
export async function cardNumbers(
  dialog: Locator,
  attr: string,
  group?: "starred" | "fits" | "wontFit",
): Promise<(number | null)[]> {
  return blankCards(dialog, group).evaluateAll(
    (els, name) =>
      els.map((el) => {
        const raw = el.getAttribute(name);
        return raw === null || raw === "" ? null : Number(raw);
      }),
    attr,
  );
}

/** ROCKER's Customize Rocker button, right under the BLANK button (quick 261016-mkb, D-04). */
export function customizeRockerButton(page: Page): Locator {
  return page.locator("[data-customize-rocker]");
}

/** The CUSTOMIZE ROCKER popup, under either of its titles. */
export function customRockerDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: /^(Customize|Edit Custom) Rocker$/i });
}

/** Taps Customize Rocker (or Edit Custom Rocker) and waits for its popup. Returns the popup. */
export async function openCustomizeRocker(page: Page): Promise<Locator> {
  const dialog = customRockerDialog(page);
  // A popup still animating shut is not open; wait for it to go before tapping again.
  await expect(page.locator("[data-customize-rocker-dialog][data-closed]")).toHaveCount(0);
  await expect(async () => {
    if (!(await dialog.isVisible())) await customizeRockerButton(page).click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return dialog;
}

/** The BLANK button's rocker line — `Natural`, or the note as ordered (D-02). */
export function blankRockerLine(page: Page): Locator {
  return page.locator("[data-blank-rocker]");
}
