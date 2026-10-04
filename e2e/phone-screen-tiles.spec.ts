import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  SCREENS,
  expectNoScreensNavigation,
  expectSixTilesInMenu,
  goToScreen,
  openPhoneMenu,
  screenTile,
} from "./helpers/screens";

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

/** The sheet's own box and the six tiles', for the checks below and the SUMMARY's figures. */
async function sheetAndTiles(page: Page) {
  const sheet = await openPhoneMenu(page);
  const sheetBox = await sheet.boundingBox();
  const bannerBox = await page.getByRole("banner").boundingBox();
  if (!sheetBox || !bannerBox) throw new Error("the sheet or the top bar has no box");
  return { sheet, sheetBox, bannerBox, tiles: await tileBoxes(page) };
}

test.describe("held sideways, the six tiles sit in one row of six (P-1)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "a phone held sideways");
    await dismissChrome(page);
  });

  const sizes = [
    { project: "android", width: 863, height: 360 },
    { project: "iphone", width: 844, height: 390 },
    { project: "iphone", width: 844, height: 340 },
  ];
  for (const size of sizes) {
    test(`${size.width}x${size.height}: one row, each tile over 120 dots wide, all whole in a window-wide sheet under the bar`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== size.project, `measured on the ${size.project} project`);
      await page.setViewportSize({ width: size.width, height: size.height });
      await openPreset(page);
      const media = await page.evaluate(() => ({
        short: window.matchMedia("(max-height: 500px)").matches,
        shell: window.matchMedia("(min-width: 820px)").matches,
      }));
      expect(media).toEqual({ short: true, shell: true });

      const { sheetBox, bannerBox, tiles } = await sheetAndTiles(page);
      expect(Math.abs(sheetBox.x)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(sheetBox.width - size.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(sheetBox.y - (bannerBox.y + bannerBox.height))).toBeLessThanOrEqual(1);
      expect(Math.abs(bannerBox.y + bannerBox.height - 48)).toBeLessThanOrEqual(1);

      expect(new Set(tiles.map((t) => Math.round(t.y))).size).toBe(1);
      for (const tile of tiles) {
        expect(tile.width).toBeGreaterThan(120);
        expect(tile.y).toBeGreaterThanOrEqual(sheetBox.y - 1);
        expect(tile.y + tile.height).toBeLessThanOrEqual(sheetBox.y + sheetBox.height + 1);
        expect(tile.x + tile.width).toBeLessThanOrEqual(size.width + 1);
      }
      console.log(
        `[q2f] sideways ${size.width}x${size.height}: sheet ${JSON.stringify(sheetBox)}, tile ${Math.round(tiles[0].width)}x${Math.round(tiles[0].height)}, tiles' bottom ${Math.round(tiles[0].y + tiles[0].height)}`,
      );
    });
  }
});

test.describe("upright, three across and two down (P-1)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "an upright phone");
    await dismissChrome(page);
  });

  test("the window-wide sheet under the bar holds a 3x2 grid of tiles at least 44 dots each way", async ({
    page,
  }, testInfo) => {
    await openPreset(page);
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("no viewport");
    const { sheetBox, bannerBox, tiles } = await sheetAndTiles(page);
    expect(Math.abs(sheetBox.x)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(sheetBox.width - viewport.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(sheetBox.y - (bannerBox.y + bannerBox.height))).toBeLessThanOrEqual(1);
    expect(new Set(tiles.map((t) => Math.round(t.x))).size).toBe(3);
    expect(new Set(tiles.map((t) => Math.round(t.y))).size).toBe(2);
    for (const tile of tiles) {
      expect(tile.width).toBeGreaterThanOrEqual(44);
      expect(tile.height).toBeGreaterThanOrEqual(44);
    }
    console.log(
      `[q2f] upright ${testInfo.project.name} ${viewport.width}x${viewport.height}: sheet ${JSON.stringify(sheetBox)}, tile ${Math.round(tiles[0].width)}x${Math.round(tiles[0].height)}`,
    );
  });

  for (const width of [360, 375, 393]) {
    test(`at ${width} wide no tile's name or line is clipped and the page never scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await openPreset(page);
      await openPhoneMenu(page);
      expect(await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0)).toBe(width);
      for (const screen of SCREENS) {
        const tile = screenTile(page, screen.label);
        const tileBox = await tile.boundingBox();
        if (!tileBox) throw new Error("tile has no box");
        for (const part of await tile.locator(":scope > span:not([data-tile-picture])").all()) {
          const fit = await part.evaluate((el) => ({
            sw: el.scrollWidth,
            cw: el.clientWidth,
            sh: el.scrollHeight,
            ch: el.clientHeight,
          }));
          expect(fit.sw).toBeLessThanOrEqual(fit.cw);
          expect(fit.sh).toBeLessThanOrEqual(fit.ch);
          const box = await part.boundingBox();
          if (!box) throw new Error("tile text has no box");
          expect(box.x).toBeGreaterThanOrEqual(tileBox.x - 0.5);
          expect(box.x + box.width).toBeLessThanOrEqual(tileBox.x + tileBox.width + 0.5);
        }
      }
    });
  }
});

test.describe("every tile reads the current board", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the tiles live in the phone's ☰ sheet");
    await dismissChrome(page);
  });

  test("VOLUME's figure is the VOLUME screen's own estimate to one decimal", async ({ page }) => {
    await openPreset(page);
    await goToScreen(page, "VOLUME");
    const figure = page.getByText(/^\d+\.\d\d L$/).first();
    await expect(figure).toBeVisible();
    const litres = parseFloat(await figure.innerText());
    await openPhoneMenu(page);
    const tileFigure = (await screenTile(page, "VOLUME").locator("[data-tile-picture]").innerText()).replace(/\s+/g, "");
    expect(tileFigure).toBe(`${litres.toFixed(1)}L`);
    expect(tileFigure).toBe("29.6L");
    await expect(screenTile(page, "VOLUME")).toHaveAttribute("aria-label", "VOLUME — 29.6 L Estimated");
  });

  test("in Metric the TEMPLATE line is the preset card's length and width in centimetres", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("shaper-units", "metric"));
    await page.goto("/");
    const card = page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
    // textContent, not innerText: on a phone the card draws compactly and its dims line is not
    // laid out, but it is the same line the card carries. Polled until the Metric choice applies.
    const metricDims = /(\d+\.\d) × (\d+\.\d) × \d+\.\d cm/;
    await expect.poll(async () => (await card.textContent()) ?? "").toMatch(metricDims);
    const match = ((await card.textContent()) ?? "").match(metricDims);
    if (!match) throw new Error("no metric dims on the first preset card");
    await openPreset(page);
    await openPhoneMenu(page);
    expect(await tileLine(screenTile(page, "TEMPLATE"))).toBe(`${match[1]} × ${match[2]} cm`);
  });

  test(`Imperial reads the Shortboard's 6'2" × 18 3/4"`, async ({ page }) => {
    await openPreset(page);
    await openPhoneMenu(page);
    expect(await tileLine(screenTile(page, "TEMPLATE"))).toBe(`6'2" × 18 3/4"`);
  });

  const presets = [
    { name: "Fish", lines: [`5'8" × 20 1/4"`, `On a 5'10"RP`, "Twin"], litres: "35.3" },
    { name: "Longboard", lines: [`9'0" × 22 1/2"`, `On a 9'3"Y`, "Single Fin"], litres: "75.3" },
  ];
  for (const preset of presets) {
    test(`the ${preset.name}'s tiles follow its board`, async ({ page }) => {
      await openPreset(page, preset.name);
      await openPhoneMenu(page);
      expect(await tileLine(screenTile(page, "TEMPLATE"))).toBe(preset.lines[0]);
      expect(await tileLine(screenTile(page, "ROCKER"))).toBe(preset.lines[1]);
      expect(await tileLine(screenTile(page, "FINS"))).toBe(preset.lines[2]);
      await expect(screenTile(page, "VOLUME").locator("[data-tile-picture]")).toContainText(preset.litres);
    });
  }

  test("with the blank removed, ROCKER's tile reads Hand-set and draws only the board", async ({ page }) => {
    await openPreset(page);
    await goToScreen(page, "ROCKER");
    await page.getByRole("button", { name: "Remove This Blank" }).click();
    await expect(page.getByText("Hand-set until you pick a blank").first()).toBeVisible();
    await openPhoneMenu(page);
    expect(await tileLine(screenTile(page, "ROCKER"))).toBe("Hand-set");
    await expect(screenTile(page, "ROCKER").locator("[data-tile-picture] path")).toHaveCount(1);
  });

  test("an edit survives a tile tap, and tapping the current tile only closes the sheet", async ({ page }) => {
    await openPreset(page);
    const slider = page.getByRole("slider").filter({ visible: true }).first();
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    const undo = page.getByRole("button", { name: "Undo", exact: true });
    await expect(undo).toBeVisible();
    await page.evaluate(() => {
      (window as unknown as { __q2fMarker?: number }).__q2fMarker = 2;
    });

    await goToScreen(page, "ROCKER");
    await expect(undo).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __q2fMarker?: number }).__q2fMarker)).toBe(2);

    const sheet = await openPhoneMenu(page);
    await screenTile(page, "ROCKER").click();
    await expect(sheet).toBeHidden();
    await expect(page).toHaveURL(/\/design\/rocker$/);
    expect(await page.evaluate(() => (window as unknown as { __q2fMarker?: number }).__q2fMarker)).toBe(2);
  });

  for (const route of ["/", "/contact", "/privacy"]) {
    test(`${route}: ☰ shows the six tiles with none ticked`, async ({ page }) => {
      await page.goto(route);
      await expectNoScreensNavigation(page);
      await expectSixTilesInMenu(page, null);
    });
  }
});

test.describe("a computer is unchanged (1280x800)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the desktop project");
    await dismissChrome(page);
  });

  test("the desktop row shows all six links, with no Menu button, no tiles and no Screens navigation", async ({
    page,
  }) => {
    await page.goto("/design/outline");
    const desktopNav = page.locator("nav:not([aria-label])");
    await expect(desktopNav).toBeVisible();
    for (const screen of SCREENS) {
      await expect(desktopNav.getByRole("link", { name: screen.label, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeHidden();
    await expect(page.locator("[data-screen-tile]")).toHaveCount(0);
    await expectNoScreensNavigation(page);
  });
});
