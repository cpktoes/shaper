import { expect, test, type Page } from "@playwright/test";
import { appSettingsDialog, appSettingsRow, openAppSettings, openSettingsMenu } from "./helpers/settings";

/**
 * App Default Settings (quick 261003-uwi): both menus — the computer's gear and the phone's ☰ —
 * carry ONE row that opens a pop-up holding Imperial | Metric, the theme tiles, the blank makers and
 * the fit and tip defaults. Proved on all three projects; signed out on fake Clerk keys, so what is
 * proved is the browser path (localStorage and the cookie), as in fit-defaults.spec.ts.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** Set before navigation so neither strip ever sits over the menu or the pop-up. */
async function dismissBannerAndTip(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** The first preset card on the setup screen — its dims line follows the chosen system. */
function firstPresetCard(page: Page) {
  return page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
}

/** The menu proofs for one window: the one row, no old rows, Contact and Privacy still there. */
async function expectOneRowMenu(page: Page, phoneSheet: boolean) {
  const menu = await openSettingsMenu(page);
  const row = appSettingsRow(page);
  await expect(row).toBeVisible();
  await expect(row).toContainText("Units, theme, blank makers, fit and tips");
  await expect(menu.getByRole("menuitemradio", { name: /^Imperial/ })).toHaveCount(0);
  await expect(menu.getByRole("menuitemradio", { name: /^Metric/ })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: /Fit & Tip Defaults/ })).toHaveCount(0);
  await expect(menu.getByRole("menuitem", { name: "Contact", exact: true })).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Privacy", exact: true })).toBeVisible();
  if (phoneSheet) {
    await expect(menu.locator("[data-screen-tile]")).toHaveCount(6);
    await expect(menu.locator("[data-phone-menu-account]")).toHaveCount(1);
  }
  await page.keyboard.press("Escape");
  await expect(row).toBeHidden();
}

test.describe("App Default Settings — one row in the menu, one pop-up", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  test("the menu has one App Default Settings row and no Units rows", async ({ page }, testInfo) => {
    const desktop = testInfo.project.name === "desktop";
    await page.goto("/design/outline");
    await expectOneRowMenu(page, !desktop);

    if (desktop) {
      // A short screen condenses the top bar into ☰ at any width — the same one row is there.
      await page.setViewportSize({ width: 844, height: 390 });
      await page.reload();
      await expectOneRowMenu(page, true);
    }
  });

  test("the row closes the menu and opens App Default Settings, Imperial pressed", async ({ page }) => {
    await page.goto("/design/outline");
    await openSettingsMenu(page);
    await appSettingsRow(page).click();
    const dialog = appSettingsDialog(page);
    await expect(dialog).toBeVisible();
    await expect(appSettingsRow(page)).toBeHidden();
    await expect(dialog.getByRole("heading", { name: "App Default Settings" })).toBeVisible();
    await expect(dialog.getByText("Your defaults for this app. Changes apply at once.")).toBeVisible();
    const units = dialog.getByRole("group", { name: "Units" });
    await expect(units.getByRole("button", { name: /^Imperial/ })).toHaveAttribute("aria-pressed", "true");
    await expect(units.getByRole("button", { name: /^Metric/ })).toHaveAttribute("aria-pressed", "false");
  });

  test("Metric applies at once and survives a reload", async ({ page }) => {
    await page.goto("/");
    let dialog = await openAppSettings(page);
    let units = dialog.getByRole("group", { name: "Units" });
    await units.getByRole("button", { name: /^Metric/ }).click();
    await expect(units.getByRole("button", { name: /^Metric/ })).toHaveAttribute("aria-pressed", "true");
    await expect(units.getByRole("button", { name: /^Imperial/ })).toHaveAttribute("aria-pressed", "false");
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();

    await expect.poll(async () => (await firstPresetCard(page).textContent()) ?? "").toMatch(/\d+\.\d × \d+\.\d × \d+\.\d cm/);
    expect(await page.evaluate(() => window.localStorage.getItem("shaper-units"))).toBe("metric");

    await page.reload();
    dialog = await openAppSettings(page);
    units = dialog.getByRole("group", { name: "Units" });
    await expect(units.getByRole("button", { name: /^Metric/ })).toHaveAttribute("aria-pressed", "true");
    await units.getByRole("button", { name: /^Imperial/ }).click();
    await expect(units.getByRole("button", { name: /^Imperial/ })).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect.poll(async () => (await firstPresetCard(page).textContent()) ?? "").toMatch(/\d+'\d+"/);
  });
});
