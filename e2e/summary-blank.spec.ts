import { expect, test, type Locator, type Page } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../lib/blanks/csv";

/**
 * The Summary order form's Blank field (quick 260926-wkh). Page 2 of the order form, the Shaper
 * Reference sheet, ends with a shaded Shaper Use Only box — the shop's own record of the job. Its
 * Blank field has two states:
 *
 * - The board has no blank (a fresh board, or one whose blank was removed on ROCKER): an empty
 *   ruled line the shop writes the blank on by hand.
 * - The board was designed on a blank picked on ROCKER: that blank prints there, read-only, as
 *   vendor then name — the same words ROCKER's own list names it by.
 *
 * Like `rocker-blanks.spec.ts`, this runs signed out with no database: `playwright.config.ts` sets
 * `SHAPER_BLANKS_SOURCE=seed-csv` for its own dev server, so ROCKER's list reads the committed
 * catalogue CSVs. No blank name is ever typed here — the expected name is read off ROCKER's row
 * before it's picked.
 *
 * The Summary's design lives in memory and resets on a full page load, so the picked blank has to
 * reach the Summary by the app's own SUMMARY link, never a fresh `page.goto`.
 *
 * The helpers below are copied from `rocker-blanks.spec.ts` rather than imported: each spec in this
 * repo carries its own.
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

/** ROCKER's list, once the streamed catalogue has arrived and been judged. */
function blankList(page: Page): Locator {
  return page.getByRole("list", { name: "Blanks" });
}

/** The first blank under FITS THIS BOARD. */
function firstFittingRow(page: Page): Locator {
  return blankList(page).locator('li[data-group="fits"] button').first();
}

/** ROCKER's picked-blank card. */
function pickedCard(page: Page): Locator {
  return page.locator("[data-picked-blank]");
}

async function openRocker(page: Page) {
  await page.goto("/design/rocker");
  await expect(blankList(page)).toBeVisible({ timeout: 30_000 });
  // The list streams in server-rendered and becomes live only once React hydrates it; a tap before
  // then is lost. Wait until React owns the first row and the search box.
  await page.waitForFunction(() => {
    const owned = (el: Element | null) => !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    return (
      owned(document.querySelector('ul[aria-label="Blanks"] button')) &&
      owned(document.querySelector('input[aria-label="Search blanks"]'))
    );
  });
}

/** Every unique `vendor name` in the committed catalogue CSVs — everything the Blank field could
 * ever be asked to print. Read straight from `db/seed/blanks/*.csv` with the same tested reader the
 * seed uses, so no blank name is typed here either. */
function catalogueBlankNames(): string[] {
  const dir = join(__dirname, "..", "db", "seed", "blanks");
  const names = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".csv"))) {
    const [header, ...rows] = parseCsv(readFileSync(join(dir, file), "utf8"));
    const vendorCol = header.indexOf("vendor");
    const nameCol = header.indexOf("blank_name");
    expect(vendorCol, `${file} has a vendor column`).toBeGreaterThanOrEqual(0);
    expect(nameCol, `${file} has a blank_name column`).toBeGreaterThanOrEqual(0);
    for (const row of rows) {
      const vendor = (row[vendorCol] ?? "").trim();
      const name = (row[nameCol] ?? "").trim();
      if (vendor && name) names.add(`${vendor} ${name}`);
    }
  }
  return [...names];
}

/** The order form's Blank field —the `<label>` holding the `Blank:` caption. */
function blankField(page: Page): Locator {
  return page.getByText("Blank:", { exact: true }).locator("xpath=..");
}

/** What the Blank field prints: its last span, a ruled line holding the value or a single space. */
function blankFieldValue(page: Page): Locator {
  return blankField(page).locator("span").last();
}

test.describe("Summary — the Shaper Use Only box's Blank field", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("with no blank picked, the Blank field is a ruled line for the shop to write in", async ({ page }) => {
    await page.goto("/design/summary");
    await expect(blankField(page)).toHaveCount(1);
    // The empty rule holds one non-breaking space, which `\s` matches.
    await expect(blankFieldValue(page)).toHaveText(/^\s*$/);
  });

  test("a blank picked on ROCKER prints on the order form as vendor then name", async ({ page }) => {
    await openRocker(page);
    const row = firstFittingRow(page);
    // The row's accessible name is `Use <vendor> <name>` — the same identity the order form prints.
    const ariaLabel = (await row.getAttribute("aria-label")) ?? "";
    const expected = ariaLabel.replace(/^Use /, "").replace(/, doesn't fit: .*$/, "");
    expect(expected.length).toBeGreaterThan(0);
    await row.click();
    await expect(pickedCard(page)).toBeVisible();

    await page.getByRole("link", { name: "SUMMARY", exact: true }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/design\/summary$/);
    await expect(blankFieldValue(page)).toHaveText(expected);
  });

  test("every blank in the catalogue prints whole in the Blank field, on screen and on paper", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "measures the printed sheet; one engine is enough");

    const names = catalogueBlankNames();
    // Never a vacuous pass: the three catalogues hold well over a hundred blanks.
    expect(names.length).toBeGreaterThan(100);

    await page.goto("/design/summary");
    const value = blankFieldValue(page);
    await expect(value).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));

    // The names go straight into the field rather than being picked one at a time on ROCKER, on
    // purpose. No single board's ROCKER list offers every blank — the default board lists 141 of
    // the catalogue's blanks and none of the widest — and the question here is only whether the
    // field has room for a name, which doesn't depend on how that blank got picked.
    const namesCutOff = () =>
      value.evaluate((span, all) => {
        const clipped: string[] = [];
        for (const name of all) {
          span.textContent = name;
          if (span.scrollWidth > span.clientWidth) clipped.push(name);
        }
        span.textContent = " ";
        return clipped;
      }, names);

    const cutOffOnScreen = await namesCutOff();
    await page.emulateMedia({ media: "print" });
    const cutOffOnPaper = await namesCutOff();
    await page.emulateMedia({ media: "screen" });

    // A failure names every blank that would print with a "…" instead of its full name.
    expect(cutOffOnScreen).toEqual([]);
    expect(cutOffOnPaper).toEqual([]);
  });
});
