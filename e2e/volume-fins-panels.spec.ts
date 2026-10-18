import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Quick 261017-vdh, plan 03 — the VOLUME and FINS side panels as the founder drew them. Desktop only:
 * the wording and the order are the same on a phone, and the desktop pictures pin the look.
 *
 * VOLUME: the heading reads `Inputs`; ONE box, `Import Designed Board`, in place of the two old ones;
 * ticked (the default) one line says what was imported and the four hand controls are not on the page;
 * unticked they come back for the quick estimate, and one Undo ticks the box again.
 *
 * Every helper is copied locally, as every spec in this suite does.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const UNITS_STORAGE_KEY = "shaper-units";

async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

async function setMetricUnits(page: Page) {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "metric");
  }, UNITS_STORAGE_KEY);
}

/** The `Import Designed Board` box, once React owns it (a tap on the server-rendered markup reaches
 * nothing). */
async function importBox(page: Page): Promise<Locator> {
  const box = page.getByRole("checkbox", { name: "Import Designed Board" });
  await expect(box).toBeVisible();
  await expect
    .poll(() => box.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber"))))
    .toBe(true);
  return box;
}

test.describe("VOLUME's Inputs — one Import Designed Board box", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only wording and structure proof");
    await dismissSignInBanner(page);
  });

  test("Inputs, one box ticked by default, the imported line, and none of the four hand controls", async ({
    page,
  }) => {
    await page.goto("/design/volume");
    const aside = page.locator("aside");

    await expect(aside.getByText("Inputs", { exact: true })).toBeVisible();
    await expect(aside.getByText("Primary Inputs")).toHaveCount(0);

    const box = await importBox(page);
    await expect(box).toHaveAttribute("aria-checked", "true");
    await expect(aside.getByRole("checkbox")).toHaveCount(1);
    await expect(aside.getByText(/Measure This Board/)).toHaveCount(0);
    await expect(aside.getByText(/Real Rail/)).toHaveCount(0);

    await expect(
      aside.getByText(`Board details are imported: 6'0" × 19" × 2 1/2", and the rail shapes from RAILS.`),
    ).toBeVisible();

    await expect(aside.getByText(/Board Length —/)).toHaveCount(0);
    await expect(aside.getByText(/Board Width —/)).toHaveCount(0);
    await expect(aside.getByText(/Center Thickness —/)).toHaveCount(0);
    await expect(aside.getByText("Board Type")).toHaveCount(0);
  });

  test("unticking brings the four controls back from this board's numbers; one Undo ticks it again", async ({
    page,
  }) => {
    await page.goto("/design/volume");
    const aside = page.locator("aside");
    const box = await importBox(page);

    await box.click();
    await expect(box).toHaveAttribute("aria-checked", "false");
    await expect(aside.getByText(/Board details are imported/)).toHaveCount(0);
    await expect(aside.getByText(`Board Length — 6'0"`)).toBeVisible();
    await expect(aside.getByText(`Board Width — 19"`)).toBeVisible();
    await expect(aside.getByText(`Center Thickness — 2 1/2"`)).toBeVisible();
    await expect(aside.getByText("Board Type")).toBeVisible();
    await expect(page.getByText("From the board-type factor tables (quick estimate).")).toBeVisible();

    // One tick, one undo step: a single Undo puts the box and the line back.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(box).toHaveAttribute("aria-checked", "true");
    await expect(
      aside.getByText(`Board details are imported: 6'0" × 19" × 2 1/2", and the rail shapes from RAILS.`),
    ).toBeVisible();
    await expect(aside.getByText(/Board Length —/)).toHaveCount(0);
  });

  test("Metric: the line carries its unit once, at the end", async ({ page }) => {
    await setMetricUnits(page);
    await page.goto("/design/volume");
    await importBox(page);
    await expect(
      page
        .locator("aside")
        .getByText("Board details are imported: 182.9 × 48.3 × 6.4 cm, and the rail shapes from RAILS."),
    ).toBeVisible();
  });
});
