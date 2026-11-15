import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  blankButton,
  blankPicker,
  closeBlankPicker,
  openRocker,
  pickBlankNamed,
  pickFirstFittingBlank,
  pickedCard,
  removeThisBlank,
} from "./helpers/blank-picker";
import { showTab } from "./helpers/rocker-sidebar";

/**
 * The maker's own page for the picked blank (quick 261114-vwo; the founder's ruling of 2026-11-14): a Catalog Page
 * link on the BLANK button's card beside Change Blank, and the DATASHEET footnote's "page N" made the same link. Both
 * open the maker's page in a new tab; a maker with no page for the blank draws no link; with no blank there is none.
 * On the iPhone, the Pixel 7 and the computer. The makers' sites are never fetched: every request to them is answered
 * by a stub here, and the new tab's address is what is checked.
 *
 * Never types a catalogue address: the card names its maker, and the address must be that maker's own site. The suite
 * has no database — `playwright.config.ts` sets `SHAPER_BLANKS_SOURCE=seed-csv`.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissChrome(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Where each maker's pages live — the start every link to that maker must have. */
const MAKER_SITES: Record<string, RegExp> = {
  "US Blanks": /^https:\/\/usblanks\.com\/catalog\/[a-z0-9-]+\/[a-z0-9-]+\/$/,
  "Arctic Foam": /^https:\/\/arcticfoam\.us\/s\/2024Catalog\.pdf#page=\d+$/,
  "Marko Foam": /^https:\/\/markofoamblanks\.com\/products\/[a-z0-9-]+$/,
  "Millennium Foam": /^https:\/\/millenniumfoam\.com\/[a-z0-9-]+\/$/,
};
const ANY_MAKER_SITE = /^https:\/\/(usblanks\.com|arcticfoam\.us|markofoamblanks\.com|millenniumfoam\.com)\//;

function cardLink(page: Page): Locator {
  return page.locator('[data-blank-catalog-link="card"]');
}

function sheetLink(page: Page): Locator {
  return page.locator('[data-blank-catalog-link="inline"]');
}

/** The picked blank's maker, read off the card's own meta line (`US Blanks · 6'3" · 2 7/8" center`). */
async function pickedMaker(page: Page): Promise<string> {
  const text = await pickedCard(page).innerText();
  const maker = Object.keys(MAKER_SITES).find((name) => text.includes(name));
  expect(maker, `a known maker on the card: ${text}`).toBeDefined();
  return maker!;
}

/** Answers every request to a maker's site with a stub page, so no test ever reaches the real site. */
async function stubMakerSites(page: Page) {
  await page.context().route(ANY_MAKER_SITE, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>maker stub</title><p>stub</p>" }),
  );
}

/** Clicks a link that opens a new tab and returns that tab's address, then closes it. */
async function openedAddress(page: Page, link: Locator): Promise<string> {
  const [popup] = await Promise.all([page.context().waitForEvent("page"), link.click()]);
  await popup.waitForLoadState("domcontentloaded");
  const url = popup.url();
  await popup.close();
  return url;
}

test.describe("the picked blank's catalog page", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
    await stubMakerSites(page);
  });

  test("the BLANK card carries a Catalog Page link to the picked maker's own page, opening in a new tab, and the card still opens the popup", async ({
    page,
  }, testInfo) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const maker = await pickedMaker(page);

    const link = cardLink(page);
    await expect(link).toBeVisible();
    await expect(link).toHaveText(/Catalog Page/);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("aria-label", new RegExp(`^Open the ${maker} catalog page for .+ in a new tab$`));
    const href = (await link.getAttribute("href"))!;
    expect(href, `${maker}'s own site`).toMatch(MAKER_SITES[maker]);

    // The link stands inside the card, on the line under Change Blank and flush with it (no overlap, same left
    // edge) — and, on a phone, 44 dots tall.
    const card = (await blankButton(page).boundingBox())!;
    const box = (await link.boundingBox())!;
    const changeBlank = (await pickedCard(page).getByText("Change Blank").boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width + 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(card.y + card.height + 0.5);
    expect(box.x).toBeCloseTo(changeBlank.x, 0);
    // Its words sit on the line below Change Blank's (the box ends a line further down); on a phone the box
    // itself is 44 dots tall, standing on the card's bottom edge, so only its foot is checked there.
    expect(box.y + box.height).toBeGreaterThanOrEqual(changeBlank.y + changeBlank.height + 8);
    if (testInfo.project.name === "desktop") expect(box.y).toBeGreaterThanOrEqual(changeBlank.y + changeBlank.height - 1);
    else expect(box.height).toBeGreaterThanOrEqual(44);

    // Following it opens the maker's page in a new tab; this tab stays on ROCKER with the blank still picked.
    expect(await openedAddress(page, link)).toBe(href);
    await expect(page).toHaveURL(/\/design\/rocker/);
    await expect(pickedCard(page)).toBeVisible();

    // The card is still the button it was: a tap on the blank's name opens the popup.
    await pickedCard(page).locator("[data-blank-name]").click();
    await expect(blankPicker(page)).toBeVisible();
    await closeBlankPicker(page);
  });

  test("the DATASHEET footnote's page number is the same link", async ({ page }, testInfo) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const maker = await pickedMaker(page);
    const href = (await cardLink(page).getAttribute("href"))!;

    await showTab(page, "DATASHEET");
    const note = page.locator("[data-datasheet-catalog-note]");
    await expect(note).toContainText(new RegExp(`^From the ${maker} catalog, page \\d+\\. Station names are the catalog's own`));
    const link = sheetLink(page);
    await expect(link).toBeVisible();
    await expect(link).toHaveText(/^page \d+$/);
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("aria-label", new RegExp(`^Open the ${maker} catalog page for .+ in a new tab$`));

    if (testInfo.project.name !== "desktop") {
      // A finger lands on it 14 dots above and below the words: the tap area is 44 dots tall though the line is not.
      // The footnote sits under the table, below an upright phone's first screen, so bring it into view first.
      await link.scrollIntoViewIfNeeded();
      const box = (await link.boundingBox())!;
      const hit = await page.evaluate(
        ([x, y]) => document.elementFromPoint(x, y)?.closest("[data-blank-catalog-link]") !== null,
        [box.x + box.width / 2, box.y - 10] as const,
      );
      expect(hit, "a tap 10 dots above the words reaches the link").toBe(true);
    }

    expect(await openedAddress(page, link)).toBe(href);
    await expect(page).toHaveURL(/\/design\/rocker/);
  });

  test("a blank whose maker has no page for it draws no link on the card or the sheet, and the footnote still names the page", async ({
    page,
  }) => {
    await openRocker(page);
    // Marko Foam's 10'2" M is in the catalogue but not on the maker's site (the audit of 2026-11-14).
    await pickBlankNamed(page, "Marko Foam", `10'2" M`);
    await expect(pickedCard(page)).toContainText(`10'2" M`);
    await expect(cardLink(page)).toHaveCount(0);

    await showTab(page, "DATASHEET");
    const note = page.locator("[data-datasheet-catalog-note]");
    await expect(note).toContainText(/^From the Marko Foam catalog, page \d+\. /);
    await expect(sheetLink(page)).toHaveCount(0);
  });

  test("with no blank there is no link anywhere", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    await expect(cardLink(page)).toBeVisible();
    await removeThisBlank(page);
    await expect(cardLink(page)).toHaveCount(0);
    await showTab(page, "DATASHEET");
    await expect(page.locator("[data-datasheet-catalog-note]")).toHaveCount(0);
    await expect(sheetLink(page)).toHaveCount(0);
  });
});
