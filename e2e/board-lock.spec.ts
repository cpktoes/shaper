import { expect, test, type Page } from "@playwright/test";
import { BOARD_LOCK_COPY } from "../components/design/board-lock-copy";
import { RACK_COPY } from "../components/setup/rack-config";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { freshPracticeRack } from "./helpers/practice-rack";

/**
 * The board lock (quick 261008-lsy, Plan 01): a saved board is locked from its ⋯ menu on the Board
 * Rack, shows a padlock, opens with Unlock in the top bar in place of Save, refuses every change, and
 * unlocks for good. Saved boards only exist on the practice rack (`/test-rack`) because this suite
 * runs signed out with no database; the practice rack keeps each test's locks in the dev server's
 * memory, per session cookie (lib/rack-stand-in-server.ts).
 */

const STAND_INS = standInRackRows(3);
const board = (n: number) => STAND_INS[n - 1];

/** A fresh practice rack of the test's own, the sign-in banner and the toolbar tip out of the way. */
async function startPracticeRack(page: Page, save?: "fail" | "slow") {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
  await freshPracticeRack(page, save);
}

/** Opens the practice rack with three boards and waits until it has drawn them all. */
async function openRack(page: Page) {
  await page.goto(`${RACK_STAND_IN_ROUTE}?boards=3`);
  await expect(page.locator("[data-rack-board]")).toHaveCount(3);
  await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(3);
}

const captionFor = (page: Page, name: string) => page.getByRole("group", { name: RACK_COPY.captionGroup(name) });

/** The turned board's ⋯ menu, opened. */
async function openBoardMenu(page: Page, name: string) {
  await page.getByRole("button", { name: `Board actions for ${name}` }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  return menu;
}

/** Chooses the menu's lock row (whichever way it currently reads) and waits for the menu to close. */
async function chooseLockRow(page: Page, name: string, reads: string, ticked: "true" | "false") {
  const menu = await openBoardMenu(page, name);
  const row = menu.getByRole("menuitemcheckbox", { name: reads });
  await expect(row).toHaveAttribute("aria-checked", ticked);
  await row.click();
  await expect(page.getByRole("menu")).toHaveCount(0);
}

/** Opens the turned board with its caption's Open This Board and waits for the editor. */
async function openFromCaption(page: Page, name: string) {
  await captionFor(page, name).getByRole("button", { name: RACK_COPY.open }).click();
  await page.waitForURL("**/design/outline");
}

test.describe("the board lock on a computer (quick 261008-lsy)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's rack and top bar; the phones have their own tests");
    await startPracticeRack(page);
  });

  test("t1. lock a board from its ⋯, open it, see Unlock instead of Save, press it, and the rack reads Lock board again", async ({
    page,
  }) => {
    const first = board(1);
    await openRack(page);

    await chooseLockRow(page, first.name, BOARD_LOCK_COPY.lockBoard, "false");
    // Reopened, the same row now reads the locked words, ticked.
    const menu = await openBoardMenu(page, first.name);
    await expect(menu.getByRole("menuitemcheckbox", { name: BOARD_LOCK_COPY.boardLocked })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);

    await openFromCaption(page, first.name);
    const unlock = page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel }).filter({ visible: true });
    await expect(unlock).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Save Board" }).filter({ visible: true })).toHaveCount(0);

    await unlock.click();
    await expect(page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel })).toHaveCount(0);
    await expect(page.getByText("Saved", { exact: true }).filter({ visible: true })).toHaveCount(1);

    await page.goBack();
    await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-board]")).toHaveCount(3);
    await expect(captionFor(page, first.name)).toBeVisible();
    const again = await openBoardMenu(page, first.name);
    await expect(again.getByRole("menuitemcheckbox", { name: BOARD_LOCK_COPY.lockBoard })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});
