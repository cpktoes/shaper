import { expect, test, type Page } from "@playwright/test";
import { centerThicknessSlider, nudgeCenterThickness, openRocker, pickBlankNamed } from "./helpers/blank-picker";

/**
 * The steer line under Pin tips to (quick 261115-dhq; the founder's pick of 2026-11-14, "Steer it"): a thin board
 * with a thick tail tip, pinned to the Deck, drops its tail below its own centre on the Millennium Foam 6'11"F —
 * the line says so and points at Bottom; under Bottom it is gone; back on Deck it is back. The default board with
 * its default tips never shows it (the unit test holds that on the whole catalogue).
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissChrome(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

const LINE = /^The tail would sit 1\/4" below the board's center\. Pin tips to Bottom to keep the rocker above it\.$/;

function pill(page: Page, label: string) {
  return page.getByRole("group", { name: "Pin tips to" }).getByRole("button", { name: label, exact: true });
}

test.describe("ROCKER — a tip below the board's own centre is said under Pin tips to", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("a 1\" board with a 1\" tail tip on the Millennium 6'11\"F reads the line under Deck and not under Bottom", async ({
    page,
  }, testInfo) => {
    await openRocker(page);
    // The default board, thinned to 1" at the centre with its tail tip taken up to 1" (one 1/16" step a press).
    await nudgeCenterThickness(page, -24, '1"');
    await expect(centerThicknessSlider(page)).toHaveAttribute("aria-valuetext", '1"');
    const tailTip = page.locator("[data-rocker-inputs]").getByRole("slider", { name: "Tail Tip Thickness", exact: true });
    await tailTip.focus();
    for (let i = 0; i < 6; i += 1) await page.keyboard.press("ArrowRight");
    await expect(page.locator("[data-rocker-inputs]")).toContainText('Tail Tip — 1"');
    // No blank yet, so no line.
    await expect(page.locator("[data-tip-below-center]")).toHaveCount(0);

    await pickBlankNamed(page, "Millennium Foam", `6'11"F`);
    const line = page.locator("[data-tip-below-center]");
    await expect(line).toHaveText(LINE);
    await expect(pill(page, "Deck")).toHaveAttribute("aria-pressed", "true");

    await line.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`tip-below-center-${testInfo.project.name}.png`) });

    await pill(page, "Bottom").click();
    await expect(pill(page, "Bottom")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-tip-below-center]")).toHaveCount(0);

    await pill(page, "Deck").click();
    await expect(line).toHaveText(LINE);
  });
});
