import { readFileSync } from "node:fs";
import { expect, test, type Download, type Page } from "@playwright/test";
import { BOARD_LOCK_COPY } from "../components/design/board-lock-copy";
import { RACK_COPY } from "../components/setup/rack-config";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { boardFileName, readOneBoardFile } from "../lib/models/board-file";
import { parseSnapshot } from "../lib/models/design-snapshot";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { freshPracticeRack } from "./helpers/practice-rack";

/**
 * A board as a file (quick 261103-k8o, 2026-11-03). The founder: "I can download my board data from the
 * site, but I need a way to upload it (or send a board to a friend)." A saved board's ⋯ menu on the
 * Board Rack saves the one board as a small file, and the file the browser receives reads back through
 * the app's own reader as the very same board. Saved boards only exist on the practice rack
 * (`/test-rack`) because this suite runs signed out with no database.
 *
 * Every expected value is a reading of the app's own functions: the practice boards come from
 * `standInRackRows`, and every file is read with `readOneBoardFile`.
 */

/** The practice rack's boards, in the automatic order the rack shows them (newest first). */
const STAND_INS = standInRackRows(15);
const FIRST = STAND_INS[0];

/** Every test's setup: the sign-in banner and the toolbar tip dismissed, and a practice rack of the
 * test's own (its saves and locks land in the dev server's memory — e2e/helpers/practice-rack.ts). */
async function dismissBannerAndTip(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
  await freshPracticeRack(page);
}

/** Opens the practice rack and waits until it has drawn every board. */
async function openRack(page: Page, count = STAND_INS.length) {
  await page.goto(RACK_STAND_IN_ROUTE);
  await expect(page.locator("[data-rack-board]")).toHaveCount(count);
  await expect(page.locator("[data-rack-art][data-turn]")).toHaveCount(count);
}

/** A board's ⋯ menu, opened. */
async function openBoardMenu(page: Page, name: string) {
  await page.getByRole("button", { name: `Board actions for ${name}` }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  return menu;
}

/** Chooses Save board as file… on a board's ⋯ menu and answers the download the browser received. */
async function saveAsFile(page: Page, name: string): Promise<Download> {
  const menu = await openBoardMenu(page, name);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    menu.getByRole("menuitem", { name: RACK_COPY.saveAsFile }).click(),
  ]);
  return download;
}

/** The downloaded file's text, read from where the browser put it. */
async function downloadedText(download: Download): Promise<string> {
  const path = await download.path();
  if (!path) throw new Error("the download has no file");
  return readFileSync(path, "utf8");
}

test.describe("Save board as file… on the Board Rack (quick 261103-k8o)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  test("f1. a saved board's ⋯ menu saves the board as a file named after it, and the file reads back as the same board", async ({
    page,
  }) => {
    await openRack(page);
    const menu = await openBoardMenu(page, FIRST.name);
    // Rename, Duplicate, Save board as file…, then Delete — whatever Move rows stand above them.
    const rows = await menu.getByRole("menuitem").allTextContents();
    expect(rows.filter((row) => !/Move/.test(row)).map((row) => row.trim())).toEqual([
      "Rename",
      "Duplicate",
      RACK_COPY.saveAsFile,
      "Delete",
    ]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);

    const download = await saveAsFile(page, FIRST.name);
    expect(download.suggestedFilename()).toBe(boardFileName(FIRST.name));
    const result = readOneBoardFile(await downloadedText(download), {});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.name).toBe(FIRST.name);
    expect(result.fields).toEqual({ ...parseSnapshot(FIRST.snapshot), boardName: FIRST.name });

    // The menu has closed and nothing on the rack changed.
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(page.locator("[data-rack-board]")).toHaveCount(STAND_INS.length);
  });

  test("f2. a locked board saves as a file too, and the file holds no lock", async ({ page }) => {
    await openRack(page);
    const menu = await openBoardMenu(page, FIRST.name);
    await menu.getByRole("menuitemcheckbox", { name: BOARD_LOCK_COPY.lockBoard }).click();
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(
      page.getByRole("group", { name: RACK_COPY.captionGroup(FIRST.name) }).getByRole("img", { name: BOARD_LOCK_COPY.padlock }),
    ).toBeVisible();

    const download = await saveAsFile(page, FIRST.name);
    const text = await downloadedText(download);
    expect(text).not.toMatch(/"locked"\s*:/);
    const result = readOneBoardFile(text, {});
    expect(result.ok && result.name).toBe(FIRST.name);
  });
});
