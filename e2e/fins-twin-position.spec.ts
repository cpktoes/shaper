import { expect, test, type Locator, type Page } from "@playwright/test";
import { formatMark } from "../lib/geometry/measure-display";
import { inchesToMm } from "../lib/geometry/units";

/**
 * Quick 261113-qyz, the founder's ruling of 2026-11-13: "Twin aft/fwd slider can be loosened to 10 in."
 *
 * With the Twin setup, FINS' Aft/Forward position slider (its label shows the pair's distance off the tail) now carries
 * the pair forward until it sits 10" off the tail on Modern/Upright and on a Keel; an Upright + Trailer, which already
 * stands at 10", and every other setup keep their usual 1 1/2" either way. The stored offset is shared, so a twin's +2 1/2"
 * never carries another setup's fins further than their own slider goes.
 *
 * Helpers are copied locally, as every spec in this suite does.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const UNITS_STORAGE_KEY = "shaper-units";

async function quiet(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

async function setMetric(page: Page) {
  await page.addInitScript((key) => window.localStorage.setItem(key, "metric"), UNITS_STORAGE_KEY);
}

async function openAdvanced(page: Page) {
  const button = page.getByRole("button", { name: /^Advanced/ });
  await expect(button).toBeVisible();
  await expect.poll(() => button.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber")))).toBe(true);
  if ((await page.getByRole("button", { name: /Reset Advanced Settings/ }).count()) === 0) await button.click();
  await expect(page.getByRole("button", { name: /Reset Advanced Settings/ })).toBeVisible();
}

async function pick(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

function aftLabel(page: Page): Locator {
  return page.getByText(/^Aft\/Forward position — /).filter({ visible: true }).first();
}

function aftSlider(page: Page): Locator {
  return aftLabel(page).locator("xpath=..").getByRole("slider");
}

const farEnd = async (page: Page) => {
  const slider = aftSlider(page);
  await slider.focus();
  await page.keyboard.press("End");
};

test.describe("the Twin's Aft/Forward position reaches 10\" off the tail", () => {
  test.beforeEach(async ({ page }) => {
    await quiet(page);
  });

  test("on Modern/Upright its forward end reads 10\" and its aft end 6\"", async ({ page }) => {
    await page.goto("/design/fins");
    await pick(page, "Twin");
    await openAdvanced(page);
    await expect(aftLabel(page)).toHaveText(`Aft/Forward position — ${formatMark(inchesToMm(7.5), "imperial")}`);
    await farEnd(page);
    await expect(aftLabel(page)).toHaveText('Aft/Forward position — 10"');
    await aftSlider(page).press("Home");
    await expect(aftLabel(page)).toHaveText('Aft/Forward position — 6"');
  });

  test("on a Keel its forward end reads 10\" too", async ({ page }) => {
    await page.goto("/design/fins");
    await pick(page, "Twin");
    await pick(page, "Keel");
    await openAdvanced(page);
    await farEnd(page);
    await expect(aftLabel(page)).toHaveText('Aft/Forward position — 10"');
  });

  test("an Upright + Trailer keeps its usual range: its end is 1 1/2\" forward of its 10\"", async ({ page }) => {
    await page.goto("/design/fins");
    await pick(page, "Twin");
    await pick(page, "Upright + Trailer");
    await openAdvanced(page);
    await farEnd(page);
    await expect(aftLabel(page)).toHaveText(`Aft/Forward position — ${formatMark(inchesToMm(11.5), "imperial")}`);
  });

  test("a twin's far end never carries an Upright + Trailer further than its own end, and is still there on switching back", async ({ page }) => {
    await page.goto("/design/fins");
    await pick(page, "Twin");
    await openAdvanced(page);
    await farEnd(page);
    await expect(aftLabel(page)).toHaveText('Aft/Forward position — 10"');
    // The stored +2 1/2" is shared by the three templates: the trailer's own slider ends at +1 1/2", and shows it held there.
    await pick(page, "Upright + Trailer");
    await expect(aftSlider(page)).toHaveAttribute("max", "1.5");
    await expect.poll(async () => Number(await aftSlider(page).getAttribute("value"))).toBeCloseTo(1.5, 6);
    await expect(aftLabel(page)).toHaveText(`Aft/Forward position — ${formatMark(inchesToMm(11.5), "imperial")}`);
    await pick(page, "Modern/Upright");
    await expect(aftSlider(page)).toHaveAttribute("max", "2.5");
    await expect(aftLabel(page)).toHaveText('Aft/Forward position — 10"');
  });

  test("another setup's slider keeps its own 1 1/2\" ends", async ({ page }) => {
    await page.goto("/design/fins");
    await pick(page, "Twin");
    await openAdvanced(page);
    await expect(aftSlider(page)).toHaveAttribute("max", "2.5");
    for (const setup of ["Thruster", "2+1", "Quad"]) {
      await pick(page, setup);
      await expect(aftSlider(page)).toHaveAttribute("max", "1.5");
      await expect(aftSlider(page)).toHaveAttribute("min", "-1.5");
    }
  });

  test("in Metric the forward end reads 254 mm", async ({ page }) => {
    await setMetric(page);
    await page.goto("/design/fins");
    await pick(page, "Twin");
    await openAdvanced(page);
    await farEnd(page);
    await expect(aftLabel(page)).toHaveText("Aft/Forward position — 254 mm");
  });
});
