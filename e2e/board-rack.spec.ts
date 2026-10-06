import { expect, test, type Page } from "@playwright/test";
import { RACK_COPY, rackHeadingLine } from "../components/setup/rack-config";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { IN_PROGRESS_KEY } from "../lib/models/rack-order";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";

/**
 * The Board Rack on a computer (Phase 15, 15-06 — the phase's tracer): the shaper's boards standing
 * on their tails at one scale, the board under the cursor turning, the rested board's caption with
 * Open This Board, and a click opening the board exactly as the old cards did. Saved boards only
 * exist on the practice rack (`/test-rack`, 15-05) because this suite runs signed out with no
 * database; the real `/` only ever shows the unsaved board.
 *
 * The frame loop writes each board's current angle, in whole degrees, onto its drawing as
 * `data-turn`, so these checks read the turn the shaper sees rather than any internal state.
 */

/** The practice rack's boards, in the automatic order the rack shows them (newest first). */
const STAND_INS = standInRackRows(15);
/** Board `n` (1-based) on the practice rack. */
const board = (n: number) => STAND_INS[n - 1];

async function dismissBannerAndTip(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
}

const boardButton = (page: Page, key: string) => page.locator(`[data-rack-board="${key}"]`);
const boardArt = (page: Page, key: string) => page.locator(`[data-rack-art="${key}"]`);
const captionFor = (page: Page, name: string) => page.getByRole("group", { name: RACK_COPY.captionGroup(name) });

/** Opens a rack page and waits until the rack has drawn every board. */
async function openRack(page: Page, path: string, count: number) {
  await page.goto(path);
  await expect(page.locator("[data-rack-board]")).toHaveCount(count);
  await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(count);
}

/** The centre of a board's button, where the cursor goes to point at it. */
async function centreOf(page: Page, key: string) {
  const box = await boardButton(page, key).boundingBox();
  if (!box) throw new Error(`no box for board ${key}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Points at a board, then rests long enough for it to finish turning. */
async function restOn(page: Page, key: string) {
  const { x, y } = await centreOf(page, key);
  await page.mouse.move(x, y, { steps: 8 });
  await expect(boardArt(page, key)).toHaveAttribute("data-turn", "90");
}

/** How many points a board's drawn outline has. */
async function vertexCount(page: Page, key: string) {
  const d = (await boardArt(page, key).locator("path").first().getAttribute("d")) ?? "";
  return (d.match(/[ML]/g) ?? []).length;
}

test.describe("the Board Rack on a computer", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the hover rack's own pointer checks are desktop-only");
    await dismissBannerAndTip(page);
  });

  test("1. the practice rack shows the heading, its line, fifteen boards and the first one turned with its caption", async ({
    page,
  }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await expect(page.getByRole("heading", { name: RACK_COPY.heading })).toBeVisible();
    await expect(page.getByText(rackHeadingLine(15, "hover"), { exact: true })).toBeVisible();
    await expect(page.locator('[data-rack-kind="hover"]')).toHaveCount(1);

    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "90");
    for (let n = 2; n <= 15; n++) await expect(boardArt(page, board(n).id)).toHaveAttribute("data-turn", "0");

    const caption = captionFor(page, board(1).name);
    await expect(caption).toBeVisible();
    await expect(caption.getByRole("button", { name: RACK_COPY.open })).toBeVisible();
  });

  test("2. resting the cursor on board 6 turns it, closes board 1 and moves the caption under it", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const { x, y } = await centreOf(page, board(6).id);
    await page.mouse.move(x, y, { steps: 8 });
    await page.waitForTimeout(600);
    await expect(boardArt(page, board(6).id)).toHaveAttribute("data-turn", "90");
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "0");
    await expect(captionFor(page, board(6).name)).toBeVisible();
  });

  test("3. with the cursor between boards 3 and 4, both are part-turned", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    const a = await centreOf(page, board(3).id);
    const b = await centreOf(page, board(4).id);
    await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
    // Both read in the same frame, a couple of frames after the move and well inside the 180 ms
    // the cursor has to rest before the nearest board finishes turning.
    const turns = await page.evaluate(
      ([first, second]) =>
        new Promise<number[]>((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              resolve(
                [first, second].map((key) =>
                  Number(document.querySelector(`[data-rack-art="${key}"]`)?.getAttribute("data-turn")),
                ),
              ),
            ),
          ),
        ),
      [board(3).id, board(4).id] as const,
    );
    for (const turn of turns) {
      expect(turn).toBeGreaterThan(0);
      expect(turn).toBeLessThan(90);
    }
  });

  test("4. a turned board draws its whole outline and a resting board its side profile", async ({ page }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    expect(await vertexCount(page, board(1).id)).toBeGreaterThanOrEqual(300);
    expect(await vertexCount(page, board(2).id)).toBeLessThanOrEqual(140);
  });

  test("5. Open This Board opens the board, and coming back finds it turned and marked as the open one", async ({
    page,
  }) => {
    await openRack(page, RACK_STAND_IN_ROUTE, 15);
    await restOn(page, board(6).id);
    await captionFor(page, board(6).name).getByRole("button", { name: RACK_COPY.open }).click();
    await page.waitForURL("**/design/outline");

    await page.goBack();
    await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-board]")).toHaveCount(15);
    await expect(boardArt(page, board(6).id)).toHaveAttribute("data-turn", "90");
    await expect(boardButton(page, board(6).id)).toHaveAttribute("aria-current", "true");
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "0");
  });

  test("6. the unsaved board alone: one turned board, its own caption, the singular line — and one saved board alone", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-rack-board]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: RACK_COPY.heading })).toHaveCount(0);
    await page.getByRole("button").filter({ hasText: "Start Shaping" }).first().click();
    await page.waitForURL("**/design/outline");
    await page.goBack();
    await page.waitForURL((url) => url.pathname === "/");

    await expect(page.locator("[data-rack-board]")).toHaveCount(1);
    await expect(boardArt(page, IN_PROGRESS_KEY)).toHaveAttribute("data-turn", "90");
    const caption = page.locator(`[data-rack-caption="${IN_PROGRESS_KEY}"]`);
    await expect(caption).toBeVisible();
    await expect(caption.getByText(RACK_COPY.unsavedTag)).toBeVisible();
    await expect(caption.getByRole("button", { name: RACK_COPY.continueBoard })).toBeVisible();
    await expect(page.getByRole("button", { name: /Board actions/ })).toHaveCount(0);
    await expect(page.getByText(rackHeadingLine(1, "hover"), { exact: true })).toBeVisible();

    await openRack(page, `${RACK_STAND_IN_ROUTE}?boards=1`, 1);
    await expect(boardArt(page, board(1).id)).toHaveAttribute("data-turn", "90");
    await expect(captionFor(page, board(1).name).getByRole("button", { name: RACK_COPY.open })).toBeVisible();
  });
});
