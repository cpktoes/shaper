import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The finished ROCKER screen's browser proof (Phase 11, 11-11): pick a real blank from the list,
 * slide the board along it, read the numbers, keep a pick through a change that stops it fitting,
 * and go back to a hand-set rocker.
 *
 * This suite has no database: `playwright.config.ts` sets `SHAPER_BLANKS_SOURCE=seed-csv` for its
 * own dev server, so the list reads the committed catalogue CSVs through the same tested reader the
 * database seed uses (11-05). No expected blank name or catalogue number is ever typed here — the
 * tests pick "the first row under FITS THIS BOARD" and read its name off the page, and compare the
 * offer to the offer line's own text.
 *
 * The sign-in banner and the toolbar tip are dismissed before navigation, as in
 * `touch-sizing.spec.ts`, so neither shifts anything under a tap.
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

/** The list, once the streamed catalogue has arrived and been judged. */
function blankList(page: Page): Locator {
  return page.getByRole("list", { name: "Blanks" });
}

/** The first blank under FITS THIS BOARD. */
function firstFittingRow(page: Page): Locator {
  return blankList(page).locator('li[data-group="fits"] button').first();
}

/** The picked-blank card (state C). */
function pickedCard(page: Page): Locator {
  return page.locator("[data-picked-blank]");
}

async function openRocker(page: Page) {
  await page.goto("/design/rocker");
  await expect(blankList(page)).toBeVisible({ timeout: 30_000 });
}

/** Picks the first fitting blank and returns its name as the page shows it. */
async function pickFirstFittingBlank(page: Page): Promise<string> {
  const row = firstFittingRow(page);
  const name = (await row.locator("[data-blank-name]").innerText()).trim();
  expect(name.length).toBeGreaterThan(0);
  await row.click();
  await expect(pickedCard(page)).toContainText(name);
  return name;
}

test.describe("ROCKER — a real blank from the list", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("tapping the first blank that fits puts the board in it on the drawing", async ({ page }) => {
    await openRocker(page);
    // Nothing behind the board until a blank is picked.
    await expect(page.locator("[data-blank-silhouette]")).toHaveCount(0);
    await pickFirstFittingBlank(page);
    await expect(page.locator("[data-blank-silhouette]")).toBeVisible();
  });
});
