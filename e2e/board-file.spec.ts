import { readFileSync } from "node:fs";
import { expect, test, type Download, type Page } from "@playwright/test";
import { BOARD_LOCK_COPY } from "../components/design/board-lock-copy";
import { BOARD_FILE_COPY } from "../components/setup/board-file-copy";
import { RACK_COPY } from "../components/setup/rack-config";
import { buildDesignsExport, designsExportFileName } from "../lib/account/account-data";
import type { ModelRow } from "../lib/db/schema";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { boardFileName, boardFileText, buildBoardFile, readOneBoardFile } from "../lib/models/board-file";
import { SNAPSHOT_BOARD_LENGTH_MM, parseSnapshot, type DesignSnapshotFields } from "../lib/models/design-snapshot";
import { RACK_STAND_IN_ROUTE, standInRackRows } from "../lib/models/rack-stand-in";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { storedOpenBoard } from "./helpers/open-board";
import { freshPracticeRack } from "./helpers/practice-rack";

/**
 * A board as a file (quick 261103-k8o, 2026-11-03). The founder: "I can download my board data from the
 * site, but I need a way to upload it (or send a board to a friend)." A saved board's ⋯ menu on the
 * Board Rack saves the one board as a small file, and the file the browser receives reads back through
 * the app's own reader as the very same board. Open a board file… on the home page opens such a file
 * — or a whole Export my designs file holding one board — as a new, unsaved board, asks first when a
 * board is in progress, and says in one quiet line why any other file can't open. Saved boards only
 * exist on the practice rack (`/test-rack`) because this suite runs signed out with no database. Each
 * test gets a fresh browser, so no board is kept from an earlier test.
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

/** The Fish practice board, in its blank, which a friend saved as a file under their own name. */
const FISH = parseSnapshot(standInRackRows(4)[1].snapshot);
const FRIENDS_FISH = "Friend's Fish";
const FISH_BLANK = FISH.blank?.copy.name;
/** The Shortboard preset's blank name, read from the presets themselves. */
const SHORTBOARD_BLANK = BOARD_PRESETS.find((preset) => preset.name === "Shortboard")?.blank?.name;

/** A file as a shaper picks it: its name and its text. */
interface PickedFile {
  name: string;
  text: string;
}

const friendsFishFile = (): PickedFile => ({
  name: boardFileName(FRIENDS_FISH),
  text: boardFileText(buildBoardFile(FRIENDS_FISH, FISH, new Date())),
});

/** An Export my designs file holding the first `count` practice boards, ids in the database's form. */
function designsFile(count: number): PickedFile {
  const rows: ModelRow[] = standInRackRows(count).map((row, i) => ({
    id: `0000000${i}-0000-4000-8000-000000000000`,
    clerkUserId: "user_fake_k8o",
    name: row.name,
    snapshot: row.snapshot,
    createdAt: new Date(Date.UTC(2026, 9, 1, 12 - i)),
    updatedAt: new Date(Date.UTC(2026, 9, 2)),
    locked: null,
  }));
  const now = new Date();
  return { name: designsExportFileName(now), text: JSON.stringify(buildDesignsExport(rows, null, now), null, 2) };
}

/** Picks a file through Open a board file…, the way a shaper does. */
async function pickBoardFile(page: Page, file: PickedFile) {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: BOARD_FILE_COPY.button }).click(),
  ]);
  await chooser.setFiles({ name: file.name, mimeType: "application/json", buffer: Buffer.from(file.text, "utf8") });
}

const fileStatus = (page: Page) => page.locator("[data-board-file-status]");

/** The board this browser keeps, in the few words these tests check. */
async function keptBoard(page: Page) {
  const kept = await storedOpenBoard(page);
  if (!kept) return null;
  return {
    modelId: kept.modelId,
    dirty: kept.dirty,
    locked: kept.locked,
    name: kept.snapshot.design.boardName,
    blank: kept.snapshot.design.blank?.copy.name ?? null,
  };
}

/** Start Shaping on a preset card, then Back to the home page: a board is in progress. */
async function startPresetAndComeBack(page: Page, name: string) {
  const button = page.getByRole("button").filter({ hasText: "Start Shaping" }).filter({ hasText: name }).first();
  await expect(async () => {
    await button.click();
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await page.goBack();
  await expect(page).toHaveURL((url) => url.pathname === "/");
}

test.describe("Open a board file… on the home page (quick 261103-k8o)", () => {
  test.beforeEach(async ({ page }) => {
    // Each test loads the page more than once and waits for a board in its blank to draw.
    test.setTimeout(120_000);
    await dismissBannerAndTip(page);
  });

  test("f3. a friend's board file opens on TEMPLATE as a new, unsaved board under its own name, and a reload keeps it", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await pickBoardFile(page, friendsFishFile());
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect
      .poll(() => keptBoard(page), { timeout: 30_000 })
      .toEqual({ modelId: null, dirty: true, locked: false, name: FRIENDS_FISH, blank: FISH_BLANK });

    // Back on the home page, the rack shows it as the unsaved board, under the file's name.
    await page.goBack();
    await expect(page).toHaveURL((url) => url.pathname === "/");
    let caption = page.getByRole("group", { name: RACK_COPY.captionGroup(FRIENDS_FISH) });
    await expect(caption).toBeVisible();
    await expect(caption).toContainText(RACK_COPY.unsavedTag);

    // A reload brings the same board back, still unsaved (one phone and the computer prove it).
    if (testInfo.project.name === "android") return;
    await page.reload();
    caption = page.getByRole("group", { name: RACK_COPY.captionGroup(FRIENDS_FISH) });
    await expect(caption).toBeVisible({ timeout: 30_000 });
    await expect(caption).toContainText(RACK_COPY.unsavedTag);
    expect(await keptBoard(page)).toEqual({ modelId: null, dirty: true, locked: false, name: FRIENDS_FISH, blank: FISH_BLANK });
  });

  test("f4. a board saved from the rack opens again from its own file, the very same board", async ({ page }) => {
    await openRack(page);
    const download = await saveAsFile(page, FIRST.name);
    const text = await downloadedText(download);
    await pickBoardFile(page, { name: download.suggestedFilename(), text });
    await expect(page).toHaveURL(/\/design\/outline$/);
    const saved = JSON.parse(text).board.design.design;
    await expect
      .poll(async () => (await storedOpenBoard(page))?.snapshot.design, { timeout: 30_000 })
      .toEqual(saved);
    const kept = await storedOpenBoard(page);
    expect(kept?.modelId).toBeNull();
    expect(kept?.dirty).toBe(true);
  });

  test("f5. a whole Export my designs file with one board opens; with three it is refused, pointing at Import my designs", async ({
    page,
  }) => {
    await page.goto("/");
    await pickBoardFile(page, designsFile(3));
    await expect(fileStatus(page)).toHaveText(BOARD_FILE_COPY.manyBoards(3));
    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    expect(await storedOpenBoard(page)).toBeNull();

    const [one] = standInRackRows(1);
    await pickBoardFile(page, designsFile(1));
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect
      .poll(() => keptBoard(page), { timeout: 30_000 })
      .toEqual({
        modelId: null,
        dirty: true,
        locked: false,
        name: one.name,
        blank: parseSnapshot(one.snapshot).blank?.copy.name ?? null,
      });
  });

  test("f6. a file that isn't a board file, or a damaged board, says so in one quiet line — and the next good file opens", async ({
    page,
  }) => {
    await page.goto("/");
    await pickBoardFile(page, { name: "notes.json", text: "these are my notes, not a board" });
    await expect(fileStatus(page)).toHaveText(BOARD_FILE_COPY.notOurs);
    await pickBoardFile(page, { name: "other.json", text: JSON.stringify({ hello: "world" }) });
    await expect(fileStatus(page)).toHaveText(BOARD_FILE_COPY.notOurs);
    const tooShort = { ...FISH, outline: { ...FISH.outline, length: SNAPSHOT_BOARD_LENGTH_MM.min - 1 } } as DesignSnapshotFields;
    await pickBoardFile(page, {
      name: boardFileName("Damaged"),
      text: boardFileText(buildBoardFile("Damaged", tooShort, new Date())),
    });
    await expect(fileStatus(page)).toHaveText(BOARD_FILE_COPY.unreadable);
    // None of them asked anything or opened anything.
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page).toHaveURL((url) => url.pathname === "/");
    expect(await storedOpenBoard(page)).toBeNull();

    // A good file picked next clears the line and opens.
    await pickBoardFile(page, friendsFishFile());
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect.poll(async () => (await keptBoard(page))?.name, { timeout: 30_000 }).toBe(FRIENDS_FISH);
  });

  test("f7. with a board in progress, a file asks first: Keep Editing keeps the board, Discard & Open opens the file's", async ({
    page,
  }) => {
    await page.goto("/");
    await startPresetAndComeBack(page, "Shortboard");
    await expect.poll(() => keptBoard(page), { timeout: 30_000 }).toMatchObject({ blank: SHORTBOARD_BLANK });

    await pickBoardFile(page, friendsFishFile());
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading")).toHaveText("Open this board file?");
    await dialog.getByRole("button", { name: "Keep Editing" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL((url) => url.pathname === "/");
    expect(await keptBoard(page)).toMatchObject({ blank: SHORTBOARD_BLANK, modelId: null });

    await pickBoardFile(page, friendsFishFile());
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Discard & Open" }).click();
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect
      .poll(() => keptBoard(page), { timeout: 30_000 })
      .toEqual({ modelId: null, dirty: true, locked: false, name: FRIENDS_FISH, blank: FISH_BLANK });
  });

  test("f8. Open a board file… sits under the preset cards, a finger-sized button on a phone", async ({ page }, testInfo) => {
    await page.goto("/");
    const lastCard = page.getByRole("button").filter({ hasText: "Start Shaping" }).last();
    const button = page.getByRole("button", { name: BOARD_FILE_COPY.button });
    await expect(button).toBeVisible();
    await expect(page.locator("[data-open-board-file]")).toContainText(BOARD_FILE_COPY.hint);
    const cardBox = await lastCard.boundingBox();
    const buttonBox = await button.boundingBox();
    if (!cardBox || !buttonBox) throw new Error("no box for the last card or the button");
    expect(buttonBox.y).toBeGreaterThanOrEqual(cardBox.y + cardBox.height);
    if (testInfo.project.name === "desktop") expect(buttonBox.height).toBeLessThan(44);
    else expect(buttonBox.height).toBeGreaterThanOrEqual(44);
  });
});
