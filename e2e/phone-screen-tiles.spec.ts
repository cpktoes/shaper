import { expect, test, type Locator, type Page } from "@playwright/test";
import { SCREENS, goToScreen, openPhoneMenu, screenTile } from "./helpers/screens";

/**
 * Quick 261003-q2f (sketch 007's C1): wherever the top bar is condensed into ☰, it opens a sheet
 * the window's width, hanging from the 48-dot bar, whose first six items are tiles of the six design
 * screens — each a small picture of the board being worked on right now, its name and one line. The
 * current screen's tile is ticked; tapping another moves there and keeps the board.
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

/** Opens a preset from the home screen's cards: the first (the Shortboard) or a named one. */
async function openPreset(page: Page, name?: string) {
  await page.goto("/");
  const cards = page.getByRole("button").filter({ hasText: "Start Shaping" });
  const button = name ? cards.filter({ hasText: name }).first() : cards.first();
  await expect(async () => {
    await button.click();
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
}

/** The one line under a tile's name. */
async function tileLine(tile: Locator): Promise<string> {
  return (await tile.locator("[data-tile-line]").innerText()).trim();
}

async function tileBoxes(page: Page) {
  const boxes = [];
  for (const screen of SCREENS) {
    const box = await screenTile(page, screen.label).boundingBox();
    if (!box) throw new Error(`${screen.label} tile has no box`);
    boxes.push(box);
  }
  return boxes;
}

test.describe("☰ opens six tiles drawn from the current board (upright phone)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the tiles live in the phone's ☰ sheet");
    await dismissChrome(page);
  });

  test("the Shortboard's six tiles: order, grid, pictures, lines, the tick, and a client-side move", async ({
    page,
  }) => {
    await openPreset(page);
    const sheet = await openPhoneMenu(page);

    const tiles = sheet.locator("[data-screen-tile]");
    await expect(tiles).toHaveCount(6);
    const hrefs = await tiles.evaluateAll((els) => els.map((el) => el.getAttribute("data-screen-tile")));
    expect(hrefs).toEqual(SCREENS.map((s) => s.href));

    // Three across, two down.
    const boxes = await tileBoxes(page);
    expect(new Set(boxes.map((b) => Math.round(b.x))).size).toBe(3);
    expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(2);

    // Each picture is that screen's own drawing.
    await expect(screenTile(page, "TEMPLATE").locator("[data-tile-picture] path")).toHaveCount(1);
    await expect(screenTile(page, "ROCKER").locator("[data-tile-picture] path")).toHaveCount(2);
    expect(await screenTile(page, "RAILS").locator("[data-tile-picture] line").count()).toBeGreaterThanOrEqual(3);
    expect(await screenTile(page, "RAILS").locator("[data-tile-picture] circle").count()).toBeGreaterThanOrEqual(1);
    await expect(screenTile(page, "VOLUME")).toContainText("29.6");
    await expect(screenTile(page, "FINS").locator("[data-tile-picture] line")).toHaveCount(3);
    await expect(screenTile(page, "SUMMARY").locator("[data-tile-picture] rect")).toHaveCount(1);
    expect(await screenTile(page, "SUMMARY").locator("[data-tile-picture] path").count()).toBeGreaterThanOrEqual(1);

    const lines = [];
    for (const screen of SCREENS) lines.push(await tileLine(screenTile(page, screen.label)));
    expect(lines).toEqual([`6'2" × 18 3/4"`, `On a 6'3"RP`, "Center rail", "Estimated", "Thruster", "Order form"]);

    // TEMPLATE is the one ticked tile.
    const current = sheet.locator('[data-screen-tile][aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toHaveAttribute("data-screen-tile", "/design/outline");

    // A tap moves client-side: a marker set on the window survives.
    await page.evaluate(() => {
      (window as unknown as { __q2fMarker?: number }).__q2fMarker = 1;
    });
    await goToScreen(page, "RAILS");
    await expect(page).toHaveURL(/\/design\/rails$/);
    expect(await page.evaluate(() => (window as unknown as { __q2fMarker?: number }).__q2fMarker)).toBe(1);

    await openPhoneMenu(page);
    await expect(page.locator('[data-screen-tile][aria-current="page"]')).toHaveAttribute(
      "data-screen-tile",
      "/design/rails",
    );
  });
});
