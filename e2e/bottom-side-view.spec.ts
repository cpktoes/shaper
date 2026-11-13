import { expect, test, type Page } from "@playwright/test";
import { BOTTOM_COPY } from "../components/bottom/bottom-copy";
import { sectionHeightLabel } from "../lib/geometry/bottom-draw";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { boardWithBottom, openOnBoard, type BoardWithBottom } from "./helpers/bottom-print";
import { forgetOpenBoardOnEveryLoad } from "./helpers/open-board";

/**
 * BOTTOM's SIDE VIEW (quick 261112-ogx; the founder, 2026-11-12: "Bottom, crossection, side, with sides default scaling to
 * 1x"): under the board from below and the cross-section, the board from the side — the deck, the bottom at the stringer
 * and the bottom at the rail before the rails are shaped — opening at true height, with its station line on the board
 * from below's. Every case runs signed out on a stock board seeded with its bottom through the app's own writer.
 */

const sideView = (page: Page) => page.locator("[data-bottom-side-view]");
const topCutLine = (page: Page) => page.locator("[data-bottom-cut-line]");
const sideCutLine = (page: Page) => page.locator("[data-bottom-side-cut-line]");
const sectionAt = (page: Page) => page.getByRole("slider", { name: BOTTOM_COPY.sectionAt, exact: true });
const sideHeightButton = (page: Page, factor: number) =>
  page.getByRole("button", { name: BOTTOM_COPY.sideHeightButtonName(factor), exact: true });

async function dismissStrips(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
}

/** Opens BOTTOM on a seeded board and waits for all three drawings to be measured and drawn. */
async function openBoard(page: Page, board: BoardWithBottom) {
  await openOnBoard(page, board); // added after the forget in beforeEach, so every load opens on this board
  await page.goto("/design/bottom");
  await expect(topCutLine(page)).toBeAttached({ timeout: 60_000 });
  await expect(sideView(page)).toHaveAttribute("data-height", /\d/, { timeout: 60_000 });
  await expect(sideCutLine(page)).toBeAttached();
}

/** The drawn centre x of a vertical line, in client dots. */
async function lineX(page: Page, selector: string): Promise<number> {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`${selector} is not on screen`);
  return box.x + box.width / 2;
}

test.describe("BOTTOM's side view", () => {
  test.beforeEach(async ({ page }) => {
    await dismissStrips(page);
    await forgetOpenBoardOnEveryLoad(page);
  });

  test("stands third under the board from below and the cross-section, at true height, the section's own Height still x4", async ({ page }) => {
    test.setTimeout(180_000);
    await openBoard(page, boardWithBottom("shortboard", {}));
    const top = await page.locator('[data-bottom-box="top"]').boundingBox();
    const section = await page.locator('[data-bottom-box="section"]').boundingBox();
    const side = await page.locator('[data-bottom-box="side"]').boundingBox();
    if (!top || !section || !side) throw new Error("a drawing is not on screen");
    expect(top.y).toBeLessThan(section.y);
    expect(section.y).toBeLessThan(side.y);
    expect(top.y + top.height).toBeLessThanOrEqual(section.y + 1);
    expect(section.y + section.height).toBeLessThanOrEqual(side.y + 1);

    await expect(page.locator("[data-bottom-side-caption]")).toHaveText(BOTTOM_COPY.sideViewAt(sectionHeightLabel({ heightAsked: 1, heightDrawn: 1 })));
    await expect(sideHeightButton(page, 1)).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: BOTTOM_COPY.heightButtonName(4), exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(sideView(page)).toHaveAttribute("data-height", "1.00");
  });

  test("draws two bottom lines on the Deep Single Shortboard and one on the flat one", async ({ page }) => {
    test.setTimeout(180_000);
    await openBoard(page, boardWithBottom("shortboard", { center: "Deep Single Concave" }));
    await expect(page.locator('[data-bottom-side-line="stringer"]')).toHaveCount(1);
    await expect(page.locator('[data-bottom-side-line="rail"]')).toHaveCount(1);

    await openBoard(page, boardWithBottom("shortboard", {}));
    await expect(page.locator('[data-bottom-side-line="stringer"]')).toHaveCount(1);
    await expect(page.locator('[data-bottom-side-line="rail"]')).toHaveCount(0);
  });

  test("keeps its station line within a dot of the board from below's, at the opening station and after the section moves", async ({ page }) => {
    test.setTimeout(180_000);
    await openBoard(page, boardWithBottom("shortboard", { center: "Deep Single Concave" }));
    const apart = async () => Math.abs((await lineX(page, "[data-bottom-cut-line]")) - (await lineX(page, "[data-bottom-side-cut-line]")));
    expect(await apart()).toBeLessThan(1);
    const at = sectionAt(page);
    await at.focus();
    for (const key of ["End", "Home"]) {
      await page.keyboard.press(key);
      await expect.poll(apart).toBeLessThan(1);
    }
    // the line really moved: the two ends of the slider are far apart
    const home = await lineX(page, "[data-bottom-side-cut-line]");
    await page.keyboard.press("End");
    await expect.poll(async () => Math.abs((await lineX(page, "[data-bottom-side-cut-line]")) - home)).toBeGreaterThan(100);
  });
});
