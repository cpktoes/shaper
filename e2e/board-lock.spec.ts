import { expect, test, type Page } from "@playwright/test";
import { BOARD_LOCK_COPY } from "../components/design/board-lock-copy";
import { RACK_COPY } from "../components/setup/rack-config";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { RACK_STAND_IN_ROUTE, RACK_STAND_IN_SAVE_COOKIE, standInRackRows } from "../lib/models/rack-stand-in";
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

  test("t2. a locked board shows its padlock, greys Delete (Rename and Duplicate stay), and its controls refuse a change until Unlock", async ({
    page,
  }) => {
    const first = board(1);
    await openRack(page);
    await chooseLockRow(page, first.name, BOARD_LOCK_COPY.lockBoard, "false");

    // The padlock stands right beside the name in the caption.
    await expect(captionFor(page, first.name).getByRole("img", { name: BOARD_LOCK_COPY.padlock })).toBeVisible();
    const menu = await openBoardMenu(page, first.name);
    await expect(menu.getByRole("menuitem", { name: "Delete" })).toBeDisabled();
    await expect(menu.getByRole("menuitem", { name: "Rename" })).toBeEnabled();
    await expect(menu.getByRole("menuitem", { name: "Duplicate" })).toBeEnabled();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);

    await openFromCaption(page, first.name);
    const controls = page.locator("[data-design-controls-scroll]");
    const slider = controls.locator('input[type="range"]').first();
    await expect(slider).toBeVisible();
    const before = await controls.innerText();
    await slider.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    expect(await controls.innerText()).toBe(before);

    // Unlock, and the same keys change the board.
    await page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel }).filter({ visible: true }).click();
    await expect(page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel })).toHaveCount(0);
    await slider.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    await expect.poll(() => controls.innerText()).not.toBe(before);
  });

  test("t3. locking the board that is open takes effect in the editor at once: Unlock is in the top bar, the Undo pair is gone, and Undo from the keyboard does nothing", async ({
    page,
  }) => {
    const first = board(1);
    await openRack(page);
    await openFromCaption(page, first.name);

    // An edit while unlocked: the Undo pair appears.
    const controls = page.locator("[data-design-controls-scroll]");
    const slider = controls.locator('input[type="range"]').first();
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();

    // Back to the rack, lock this very board from its ⋯, then return to the editor.
    await page.goBack();
    await page.waitForURL((url) => url.pathname === RACK_STAND_IN_ROUTE);
    await expect(page.locator("[data-rack-board]")).toHaveCount(3);
    await expect(captionFor(page, first.name)).toBeVisible();
    await chooseLockRow(page, first.name, BOARD_LOCK_COPY.lockBoard, "false");
    await page.goForward();
    await page.waitForURL("**/design/outline");

    await expect(page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel }).filter({ visible: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
    const before = await controls.innerText();
    await page.keyboard.press("ControlOrMeta+Z");
    await page.waitForTimeout(300);
    expect(await controls.innerText()).toBe(before);
  });

  test("d1. at 820 wide with a locked board open, the top bar still fits: no sideways scroll, both end items on screen", async ({
    page,
  }) => {
    const first = board(1);
    await openRack(page);
    await chooseLockRow(page, first.name, BOARD_LOCK_COPY.lockBoard, "false");
    await openFromCaption(page, first.name);
    await page.setViewportSize({ width: 820, height: 800 });

    const nav = page.locator("nav:not([aria-label])");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel })).toBeVisible();
    expect(await page.evaluate(() => document.scrollingElement?.scrollWidth ?? 0)).toBe(820);
    const overflow = await nav.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    const wordmarkBox = await page.getByRole("link", { name: "SHAPER ASSISTANT" }).boundingBox();
    const clusterBox = await nav.locator("> div").last().boundingBox();
    if (!wordmarkBox || !clusterBox) throw new Error("missing bounding box for wordmark or cluster");
    expect(wordmarkBox.x).toBeGreaterThanOrEqual(0);
    const slack = 820 - (clusterBox.x + clusterBox.width);
    console.log(`[board-lock d1] 820px viewport, locked: ${slack.toFixed(1)}px of slack right of the nav cluster`);
    // Measured 2026-10-08: Unlock leaves 2.0 dots at 820 wide, the settled "Saved" face of an open board
    // 4.7, and the bare "Save" button of a board nobody has saved 24.0 — the open-board faces were
    // already the tight ones (the saved slot is 80 dots, Unlock 82.7). It fits; it must keep fitting.
    expect(slack).toBeGreaterThanOrEqual(0);
  });

  test("f1. if locking fails, the row stays unticked and the caption says so", async ({ page }) => {
    const first = board(1);
    await freshPracticeRack(page, "fail");
    await openRack(page);

    const menu = await openBoardMenu(page, first.name);
    await menu.getByRole("menuitemcheckbox", { name: BOARD_LOCK_COPY.lockBoard }).click();
    await expect(captionFor(page, first.name).getByText(BOARD_LOCK_COPY.lockFailed)).toBeVisible();
    await expect(captionFor(page, first.name).getByRole("img", { name: BOARD_LOCK_COPY.padlock })).toHaveCount(0);
    const again = await openBoardMenu(page, first.name);
    await expect(again.getByRole("menuitemcheckbox", { name: BOARD_LOCK_COPY.lockBoard })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("f2. if Unlock fails, the top bar says 'Not unlocked', the board stays locked, and pressing it again works once the save works", async ({
    page,
  }) => {
    const first = board(1);
    await openRack(page);
    await chooseLockRow(page, first.name, BOARD_LOCK_COPY.lockBoard, "false");
    await openFromCaption(page, first.name);

    const baseURL = test.info().project.use.baseURL;
    if (!baseURL) throw new Error("the Playwright project has no baseURL");
    await page.context().addCookies([{ name: RACK_STAND_IN_SAVE_COOKIE, value: "fail", url: baseURL }]);
    await page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel }).filter({ visible: true }).click();
    const retry = page.getByRole("button", { name: BOARD_LOCK_COPY.notUnlocked }).filter({ visible: true });
    await expect(retry).toHaveCount(1);

    // Still locked: the controls refuse a change.
    const controls = page.locator("[data-design-controls-scroll]");
    const slider = controls.locator('input[type="range"]').first();
    const before = await controls.innerText();
    await slider.focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);
    expect(await controls.innerText()).toBe(before);

    await page.context().addCookies([{ name: RACK_STAND_IN_SAVE_COOKIE, value: "ok", url: baseURL }]);
    await retry.click();
    await expect(page.getByRole("button", { name: BOARD_LOCK_COPY.notUnlocked })).toHaveCount(0);
    await expect(page.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel })).toHaveCount(0);
    await expect(page.getByText("Saved", { exact: true }).filter({ visible: true })).toHaveCount(1);
  });
});

test.describe("the board lock on a phone (quick 261008-lsy)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' swipe rack and compact top bar");
    await startPracticeRack(page);
  });

  /** Locks the turned board from its ⋯ on the swipe rack and opens it with Open This Board. */
  async function lockAndOpenFirstBoard(page: Page) {
    const first = board(1);
    await openRack(page);
    await chooseLockRow(page, first.name, BOARD_LOCK_COPY.lockBoard, "false");
    await expect(captionFor(page, first.name).getByRole("img", { name: BOARD_LOCK_COPY.padlock })).toBeVisible();
    await openFromCaption(page, first.name);
  }

  /** The compact bar's Unlock button: at least 44 dots tall, and clear of the wordmark by 8 dots. */
  async function assertUnlockFits(page: Page, minAir: number) {
    const bar = page.getByRole("banner");
    const unlock = bar.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel });
    await expect(unlock).toBeVisible();
    const unlockBox = await unlock.boundingBox();
    const wordmarkBox = await bar.getByText("SHAPER ASSISTANT", { exact: true }).boundingBox();
    if (!unlockBox || !wordmarkBox) throw new Error("missing bounding box in the compact bar");
    expect(unlockBox.height).toBeGreaterThanOrEqual(44);
    const air = unlockBox.x - (wordmarkBox.x + wordmarkBox.width);
    console.log(`[board-lock] Unlock ${unlockBox.width.toFixed(1)}x${unlockBox.height.toFixed(1)}, ${air.toFixed(1)} dots from the wordmark`);
    expect(air).toBeGreaterThanOrEqual(minAir);
  }

  test("p1. a locked board's compact top bar holds Unlock (44 dots tall, clear of the name, even at 360 wide); pressing it brings back Saved", async ({
    page,
  }) => {
    await lockAndOpenFirstBoard(page);
    await assertUnlockFits(page, 8);
    await page.setViewportSize({ width: 360, height: 740 });
    await assertUnlockFits(page, 8);

    await page.getByRole("banner").getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel }).click();
    const bar = page.getByRole("banner");
    await expect(bar.getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel })).toHaveCount(0);
    await expect(bar.getByText("Saved", { exact: true })).toBeVisible();
  });

  test("p2. held sideways, the compact bar still shows Unlock, at least 44 dots tall", async ({ page }, testInfo) => {
    await lockAndOpenFirstBoard(page);
    await page.setViewportSize(testInfo.project.name === "iphone" ? { width: 844, height: 390 } : { width: 863, height: 360 });
    const unlock = page.getByRole("banner").getByRole("button", { name: BOARD_LOCK_COPY.unlockLabel });
    await expect(unlock).toBeVisible();
    const box = await unlock.boundingBox();
    if (!box) throw new Error("missing bounding box for Unlock");
    expect(box.height).toBeGreaterThanOrEqual(44);
  });
});
