import { expect, test, type Page } from "@playwright/test";
import { BOARD_FILE_COPY } from "../components/setup/board-file-copy";
import { brdFile, brdText } from "../lib/export/brd";
import { BRD_FIT_COPY, brdFitSheet, brdLengthWords, type BrdFitLook, type BrdFitSheet } from "../lib/export/brd-fit-preview";
import { BRD_FILE_ACCEPT, readAnyBrd } from "../lib/export/brd-read";
import { BRD_MAGIC } from "../lib/export/brd-scramble";
import { buildBoardSurface, type BoardSurface } from "../lib/geometry/board-surface";
import { fitBoardToBrd } from "../lib/geometry/brd-fit";
import { designCrossSectionInput, designSideProfile, deriveEffectiveRails, LIVE_DESIGN_RULES } from "../lib/geometry/design";
import { buildOutline } from "../lib/geometry/outline";
import { mm } from "../lib/geometry/units";
import { phase16Boards } from "../lib/geometry/__fixtures__/phase16-boards";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { BOARD_FILE_ACCEPT } from "../lib/models/board-file";
import { OPEN_BOARD_STORAGE_KEY } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { setMetricUnits } from "./helpers/guide";
import { storedOpenBoard } from "./helpers/open-board";
import { freshPracticeRack } from "./helpers/practice-rack";

/**
 * Opening a .brd with Open a board file… (quick 261113-d9b, the founder, 2026-11-13: look first, nothing saved). A board
 * file from AkuShaper or Shape3D opens a preview: the file in solid ink, our closest fit dashed over it, how close that
 * gets and the settings that make it. Close changes nothing; quick 261113-et0 adds Print Overview and Open as a Board
 * (specs b6 onward).
 *
 * Every .brd here is made by the app's own writer (never read from anyone's machine): the Shortboard and the Midlength
 * from the preset boards. Every word comes from `BRD_FIT_COPY` and every figure from `readAnyBrd` -> `fitBoardToBrd`
 * -> `brdFitSheet` run in this file, never typed. The fit is exact across V8 builds but WebKit's maths library may differ
 * in a last digit, so on the iPhone the fit-dependent lines are checked by their shape; the size line is exact everywhere.
 */

const BOARDS = phase16Boards();

function surfaceOf(label: string): BoardSurface {
  const fields = BOARDS.find((b) => b.label === label)!.fields;
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  return buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length),
    geometry,
    rockerAt: profile.rockerAt,
  });
}

interface Made {
  /** The locked file as AkuShaper writes it, and the plain text beside it. */
  locked: Buffer;
  text: string;
}
const made = new Map<string, Made>();
function boardFile(label: string): Made {
  const known = made.get(label);
  if (known) return known;
  const surface = surfaceOf(label);
  const made1 = { locked: Buffer.from(brdFile(surface, label).data), text: brdText(surface).text };
  made.set(label, made1);
  return made1;
}

const SHORTBOARD = "shortboard|asis|hard";
const MIDLENGTH = "midlength|asis|hard";

/** What the preview should say about a file, worked out here from the app's own functions. */
function lookOf(bytes: Uint8Array): BrdFitLook {
  const read = readAnyBrd(bytes);
  if (!read.ok) throw new Error(`the app's own file would not read: ${JSON.stringify(read)}`);
  const { board } = read;
  return { board, fit: fitBoardToBrd({ length: board.length, outline: board.outline, bottom: board.bottom, deck: board.deck }) };
}
const sheetOf = (bytes: Uint8Array, fileName: string, system: "imperial" | "metric"): BrdFitSheet =>
  brdFitSheet(lookOf(bytes), fileName, system);

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

/** Picks a file through Open a board file…, the way a shaper does. */
async function pickFile(page: Page, name: string, buffer: Buffer) {
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: BOARD_FILE_COPY.button }).click(),
  ]);
  await chooser.setFiles({ name, mimeType: "application/octet-stream", buffer });
}

const dialogOf = (page: Page) => page.locator("[data-brd-fit]");
const statusOf = (page: Page) => page.locator("[data-board-file-status]");
const keptRaw = (page: Page) => page.evaluate((key) => window.localStorage.getItem(key), OPEN_BOARD_STORAGE_KEY);

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

test.describe("Open a board file… takes a .brd (quick 261113-d9b)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await dismissBannerAndTip(page);
  });

  test("b1. a .brd opens the preview with both views, the key, the figures and one Close; Close changes nothing", async ({ page }, testInfo) => {
    const file = boardFile(SHORTBOARD);
    const exact = testInfo.project.name !== "iphone";
    const sheet = sheetOf(file.locked, "Shortboard.brd", "imperial");
    const c = BRD_FIT_COPY;

    await page.goto("/");
    expect(await storedOpenBoard(page)).toBeNull();
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: c.title })).toBeVisible();
    await expect(dialog.locator("[data-brd-fit-from]")).toHaveText(sheet.from);

    // Both drawings hold the file and our fit, and the key says which is which.
    await expect(dialog.locator('[data-brd-fit-top] [data-brd-fit-line="file"]')).toHaveCount(1);
    await expect(dialog.locator('[data-brd-fit-top] [data-brd-fit-line="fit"]')).toHaveCount(1);
    await expect(dialog.locator('[data-brd-fit-side] [data-brd-fit-line="file"]')).toHaveCount(1);
    await expect(dialog.locator('[data-brd-fit-side] [data-brd-fit-line="fit-bottom"]')).toHaveCount(1);
    await expect(dialog.locator('[data-brd-fit-side] [data-brd-fit-line="fit-deck"]')).toHaveCount(1);
    await expect(dialog.locator("[data-brd-fit-key]")).toContainText(c.keyFile);
    await expect(dialog.locator("[data-brd-fit-key]")).toContainText(c.keyOurs);

    // The file's own size (exact everywhere), then how close and the settings.
    await expect(dialog.locator("[data-brd-fit-size]")).toHaveText(sheet.size);
    for (const which of ["outline", "rocker", "thickness"] as const) {
      const line = dialog.locator(`[data-brd-fit-close-${which}]`);
      if (exact) await expect(line).toHaveText(sheet.closeness[which]);
      else await expect(line).toHaveText(new RegExp(`^${which[0].toUpperCase()}${which.slice(1)}: (within|less than) .+, typically .+ — the widest gap .+ from the (tail|nose)`));
    }
    await expect(dialog.locator("[data-brd-fit-tips]")).toHaveText(sheet.tipsNote);
    for (const which of ["outline", "nose", "tail", "rocker", "thickness"] as const) {
      const line = dialog.locator(`[data-brd-fit-control="${which}"]`);
      if (exact) await expect(line).toHaveText(sheet.controls[which]);
      else await expect(line).not.toHaveText("");
    }
    await expect(dialog.locator("[data-brd-fit-not-read]")).toHaveText(sheet.notRead);

    // Close is in the footer, and on a phone a finger-sized one inside the screen.
    const closeButton = dialog.getByRole("button", { name: c.close });
    await expect(closeButton).toHaveCount(1);
    await expect(dialog.locator("[data-brd-fit-close]")).toHaveCount(1);
    if (testInfo.project.name !== "desktop") {
      const box = await closeButton.boundingBox();
      const viewport = page.viewportSize();
      if (!box || !viewport) throw new Error("no box for Close or the viewport");
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      for (const drawing of ["[data-brd-fit-top]", "[data-brd-fit-side]", "[data-brd-fit-controls]"]) {
        await dialog.locator(drawing).scrollIntoViewIfNeeded();
        await expect(dialog.locator(drawing)).toBeVisible();
      }
    }

    // Close: the dialog is gone and nothing changed.
    await closeButton.click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL((url) => url.pathname === "/");
    expect(await storedOpenBoard(page)).toBeNull();
    await expect(statusOf(page)).toHaveText("");
    if (testInfo.project.name === "desktop") {
      await expect(page.getByRole("button", { name: BOARD_FILE_COPY.button })).toBeFocused();
    }
  });

  test("b2. the plain copy with Windows line ends opens the same preview, with the same figures", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for the plain copy");
    const file = boardFile(SHORTBOARD);
    const plain = Buffer.from(file.text.replace(/\n/g, "\r\n"), "latin1");
    const sheet = sheetOf(file.locked, "Shortboard_decrypt.brd", "imperial");

    await page.goto("/");
    await pickFile(page, "Shortboard_decrypt.brd", plain);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("[data-brd-fit-from]")).toHaveText(sheet.from);
    for (const which of ["outline", "rocker", "thickness"] as const) {
      await expect(dialog.locator(`[data-brd-fit-close-${which}]`)).toHaveText(sheet.closeness[which]);
    }
    await expect(dialog.locator("[data-brd-fit-size]")).toHaveText(sheet.size);
  });

  test("b3. with a board in progress, no question is asked and Escape leaves the kept board exactly as it was", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for the kept board");
    await page.goto("/");
    await startPresetAndComeBack(page, "Shortboard");
    await expect.poll(() => storedOpenBoard(page), { timeout: 30_000 }).not.toBeNull();
    const before = await keptRaw(page);
    expect(before).not.toBeNull();

    await pickFile(page, "Midlength.brd", boardFile(MIDLENGTH).locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL((url) => url.pathname === "/");
    expect(await keptRaw(page)).toBe(before);
  });

  test("b4. a file that can't be looked at gets one quiet line; the input takes .json and .brd, and the account import stays JSON", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for the quiet lines");
    const c = BOARD_FILE_COPY;
    await page.goto("/");
    const accept = await page.locator("[data-board-file-input]").getAttribute("accept");
    expect(accept).toContain(".json");
    expect(accept).toContain(BRD_FILE_ACCEPT);
    expect(BOARD_FILE_ACCEPT).not.toContain(".brd");

    const junk = Buffer.alloc(BRD_MAGIC.length + 64);
    junk.write(BRD_MAGIC, "latin1");
    for (let i = BRD_MAGIC.length; i < junk.length; i++) junk[i] = (i * 37 + 11) % 256;
    await pickFile(page, "junk.brd", junk);
    await expect(statusOf(page)).toHaveText(c.brdUnreadable);
    await expect(dialogOf(page)).toHaveCount(0);

    await pickFile(page, "notes.brd", Buffer.from("hello", "latin1"));
    await expect(statusOf(page)).toHaveText(c.brdUnreadable);
    await expect(dialogOf(page)).toHaveCount(0);

    const tooLong = Buffer.from(boardFile(SHORTBOARD).text.replace(/^p01 : .*$/m, "p01 : 400.0"), "latin1");
    await pickFile(page, "huge.brd", tooLong);
    await expect(statusOf(page)).toHaveText(c.brdOutOfRange(...brdLengthWords(mm(4000), "imperial")));
    await expect(dialogOf(page)).toHaveCount(0);

    await pickFile(page, "Shortboard.brd", boardFile(SHORTBOARD).locked);
    await expect(dialogOf(page)).toBeVisible();
    await expect(statusOf(page)).toHaveText("");
  });

  test("b5. in Metric the size line carries cm once and the gaps read whole millimetres", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for Metric");
    await setMetricUnits(page);
    const file = boardFile(SHORTBOARD);
    const sheet = sheetOf(file.locked, "Shortboard.brd", "metric");

    await page.goto("/");
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("[data-brd-fit-size]")).toHaveText(sheet.size);
    expect(sheet.size.match(/cm/g)).toHaveLength(1);
    for (const which of ["outline", "rocker", "thickness"] as const) {
      const line = dialog.locator(`[data-brd-fit-close-${which}]`);
      await expect(line).toHaveText(sheet.closeness[which]);
      await expect(line).toContainText(" mm");
    }
  });
});
