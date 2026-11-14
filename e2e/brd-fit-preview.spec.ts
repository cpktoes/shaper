import { expect, test, type Page } from "@playwright/test";
import { BOTTOM_COPY } from "../components/bottom/bottom-copy";
import { BOARD_FILE_COPY } from "../components/setup/board-file-copy";
import { BRD_BLANK_COPY } from "../lib/export/brd-blank-words";
import { brdBottomStations, brdFile, brdText } from "../lib/export/brd";
import { BRD_FIT_COPY, brdBottomFrames, brdBottomRows, brdFitLook, brdFitSheet, brdLengthWords, type BrdFitLook, type BrdFitSheet } from "../lib/export/brd-fit-preview";
import { BRD_FILE_ACCEPT, readAnyBrd } from "../lib/export/brd-read";
import { BRD_MAGIC } from "../lib/export/brd-scramble";
import { buildBoardSurface, type BoardSurface } from "../lib/geometry/board-surface";
import { formatBottomStation } from "../lib/geometry/blank-reasons";
import { sectionHeightLabel } from "../lib/geometry/bottom-draw";
import { DEFAULT_BOTTOM, resolveBottom, resolveCut, startingCut, stationFromNearestTip } from "../lib/geometry/bottom";
import {
  designBottomBoard,
  designCrossSectionInput,
  designFinPlacement,
  designSideProfile,
  deriveEffectiveRails,
  LIVE_DESIGN_RULES,
  type DesignSummaryFields,
} from "../lib/geometry/design";
import { buildOutline } from "../lib/geometry/outline";
import { keepFiguresTogether } from "../lib/geometry/keep-figures-together";
import { formatDim, formatMark } from "../lib/geometry/measure-display";
import { inchesToMm, mm } from "../lib/geometry/units";
import { effectiveWingRadius, wingRadiusTop, type Wing } from "../lib/geometry/wings";
import { phase16Boards, phase16WingBoards } from "../lib/geometry/__fixtures__/phase16-boards";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { brdBoardFields } from "../lib/models/brd-board";
import { BOARD_FILE_ACCEPT } from "../lib/models/board-file";
import { OPEN_BOARD_STORAGE_KEY } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { setMetricUnits } from "./helpers/guide";
import { bottomFloorScanSettled, showBottomSection } from "./helpers/bottom";
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
/** The boards with wings (quick 261113-hyy): written by the app's own writer like the others, found and fitted by the preview. */
const WING_BOARDS = phase16WingBoards();

function surfaceOf(label: string): BoardSurface {
  return surfaceOfFields([...BOARDS, ...WING_BOARDS].find((b) => b.label === label)!.fields);
}

function surfaceOfFields(fields: DesignSummaryFields): BoardSurface {
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

/**
 * The Shortboard's wing 1 made a 1 inch step over a 1 inch run, its corners rounded as far as the radius slider goes (quick
 * 261113-m5w): written by the app's own writer like every file here. The corners are clearly rounded, so the preview says so.
 */
const ROUNDED = "wing|shortboard|rounded-deep";
function roundedFile(): Made {
  const known = made.get(ROUNDED);
  if (known) return known;
  const fields = WING_BOARDS.find((b) => b.label === "wing|shortboard|one")!.fields;
  const step = { depth: inchesToMm(1), run: inchesToMm(1) };
  const wing: Wing = { ...fields.outline.wings![0], ...step, radius: wingRadiusTop(step, "imperial") };
  const surface = surfaceOfFields({ ...fields, outline: { ...fields.outline, wings: [wing] } });
  const made1 = { locked: Buffer.from(brdFile(surface, "Rounded").data), text: brdText(surface).text };
  made.set(ROUNDED, made1);
  return made1;
}

const SHORTBOARD = "shortboard|asis|hard";
const MIDLENGTH = "midlength|asis|hard";

/** What the preview should say about a file, worked out here from the app's own functions. */
function lookOf(bytes: Uint8Array): BrdFitLook {
  const read = readAnyBrd(bytes);
  if (!read.ok) throw new Error(`the app's own file would not read: ${JSON.stringify(read)}`);
  return brdFitLook(read.board);
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

// ---------------------------------------------------------------------------------------------------------------------
// Quick 261113-et0: the tables, Open as a Board and Print Overview
// ---------------------------------------------------------------------------------------------------------------------

/** True when two JSON values hold the same words and numbers within `tolerance` (the fit is exact in V8 and a hair off in WebKit). */
function sameWithin(actual: unknown, expected: unknown, tolerance: number, path = "value"): string | null {
  if (typeof expected === "number") {
    if (typeof actual !== "number") return `${path}: ${String(actual)} is not a number`;
    return Math.abs(actual - expected) <= tolerance ? null : `${path}: ${actual} differs from ${expected} by more than ${tolerance}`;
  }
  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object") return `${path}: ${String(actual)} is not an object`;
    for (const key of Object.keys(expected)) {
      const problem = sameWithin((actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key], tolerance, `${path}.${key}`);
      if (problem) return problem;
    }
    return null;
  }
  return actual === expected ? null : `${path}: ${String(actual)} is not ${String(expected)}`;
}

/** Every table of the preview as it reads on the screen: kind, then each row's key, label and the two figures. */
async function tablesOf(dialog: ReturnType<typeof dialogOf>) {
  return dialog.locator("[data-brd-fit-table]").evaluateAll((tables) =>
    tables.map((table) => ({
      kind: table.getAttribute("data-brd-fit-table"),
      rows: [...table.querySelectorAll("[data-brd-fit-row]")].map((row) => ({
        key: row.getAttribute("data-brd-fit-row"),
        label: row.querySelector("th")?.textContent ?? "",
        file: row.querySelector('[data-brd-fit-cell="file"]')?.textContent ?? "",
        fit: row.querySelector('[data-brd-fit-cell="fit"]')?.textContent ?? "",
      })),
    })),
  );
}

/** Every server action a page sends (a save is one); signed out and with no database, a board that opens must send none. */
function watchSaves(page: Page): string[] {
  const saves: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) saves.push(request.url());
  });
  return saves;
}

test.describe("Open as a Board and Print Overview (quick 261113-et0)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await dismissBannerAndTip(page);
  });

  test("b6. the three tables hold five rows each, the figures are the sheet's, and the three footer buttons fit and never overlap", async ({ page }, testInfo) => {
    const file = boardFile(SHORTBOARD);
    const exact = testInfo.project.name !== "iphone";
    const sheet = sheetOf(file.locked, "Shortboard.brd", "imperial");
    await page.goto("/");
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();

    const tables = await tablesOf(dialog);
    expect(tables.map((t) => t.kind)).toEqual(["widths", "rocker", "thickness"]);
    for (const [i, table] of tables.entries()) {
      expect(table.rows.map((r) => r.key)).toEqual(sheet.tables[i].rows.map((r) => r.key));
      expect(table.rows.map((r) => r.label)).toEqual(sheet.tables[i].rows.map((r) => r.label));
      for (const [j, row] of table.rows.entries()) {
        if (exact) {
          expect(row.file).toBe(sheet.tables[i].rows[j].file);
          expect(row.fit).toBe(sheet.tables[i].rows[j].fit);
        } else {
          expect(row.file).not.toBe("");
          expect(row.fit).not.toBe("");
        }
      }
    }
    await expect(dialog.locator("[data-brd-fit-rocker-use]")).toHaveText(sheet.rockerUse);

    // The footer: Print Overview, Open as a Board and Close, all in view.
    const names = [BRD_FIT_COPY.print, BRD_FIT_COPY.openBoard, BRD_FIT_COPY.close];
    const boxes = [];
    for (const name of names) {
      const button = dialog.getByRole("button", { name, exact: true });
      await expect(button).toHaveCount(1);
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      if (!box) throw new Error(`no box for ${name}`);
      boxes.push(box);
    }
    if (testInfo.project.name !== "desktop") {
      const viewport = page.viewportSize();
      if (!viewport) throw new Error("no viewport");
      for (const box of boxes) {
        // 44 dots under a finger; WebKit lays the 2.75rem box out to a hair under it (43.99) on some runs.
        expect(box.height).toBeGreaterThanOrEqual(44 - 0.05);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
    }
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        const apart =
          boxes[a].x + boxes[a].width <= boxes[b].x + 0.5 ||
          boxes[b].x + boxes[b].width <= boxes[a].x + 0.5 ||
          boxes[a].y + boxes[a].height <= boxes[b].y + 0.5 ||
          boxes[b].y + boxes[b].height <= boxes[a].y + 0.5;
        expect(apart, `${names[a]} and ${names[b]} must not overlap`).toBe(true);
      }
    }
  });

  test("b7. Open as a Board with nothing in progress opens the fit on TEMPLATE, named after the file, no blank, nothing saved", async ({ page }, testInfo) => {
    const file = boardFile(SHORTBOARD);
    const look = lookOf(file.locked);
    const fields = brdBoardFields(look.fit, "Shortboard.brd");
    if (!fields) throw new Error("the fit would not open as a board");
    const saves = watchSaves(page);

    await page.goto("/");
    expect(await storedOpenBoard(page)).toBeNull();
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: BRD_FIT_COPY.openBoard, exact: true }).click();
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect(dialog).toHaveCount(0);

    await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design.boardName, { timeout: 30_000 }).toBe("Shortboard");
    const kept = await storedOpenBoard(page);
    expect(kept?.modelId).toBeNull();
    expect(kept?.dirty).toBe(true);
    const design = kept!.snapshot.design as unknown as Record<string, unknown>;
    expect(design.blank).toBeNull();
    const tolerance = testInfo.project.name === "iphone" ? 0.01 : 1e-9;
    for (const part of ["outline", "rocker", "foil"] as const) {
      expect(sameWithin(design[part], fields[part], tolerance, part)).toBeNull();
    }
    expect(saves).toEqual([]);

    // A fit sits between the sliders' steps. The board keeps those exact values (checked above), but every angle and
    // percentage TEMPLATE shows reads to two decimals at most — never `48.13482249200385°`.
    const onAStep = (value: number, step: number) => Number.isInteger(Math.round((value / step) * 1e6) / 1e6);
    // The check below only means something while this fit really does sit off the sliders' steps.
    expect(onAStep(fields.outline.noseAngle, 1) && onAStep(fields.outline.noseFullness, 0.25)).toBe(false);
    const shown = await page.locator("body").innerText();
    expect(shown).toMatch(/Nose Angle/);
    expect(shown).not.toMatch(/\d\.\d{3,}\s*[°%]/);
  });

  test("b8. with a board in progress the usual question comes first; Keep Editing leaves the kept board exactly as it was, Discard & Open opens the fit", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for the question");
    await page.goto("/");
    await startPresetAndComeBack(page, "Shortboard");
    await expect.poll(() => storedOpenBoard(page), { timeout: 30_000 }).not.toBeNull();
    const before = await keptRaw(page);
    const midlength = boardFile(MIDLENGTH);
    const fields = brdBoardFields(lookOf(midlength.locked).fit, "Midlength.brd");
    if (!fields) throw new Error("the fit would not open as a board");

    await pickFile(page, "Midlength.brd", midlength.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: BRD_FIT_COPY.openBoard, exact: true }).click();
    const question = page.getByRole("alertdialog");
    await expect(question).toBeVisible();
    await expect(question.getByRole("heading", { name: "Open this board file?" })).toBeVisible();
    await expect(page).toHaveURL((url) => url.pathname === "/");

    await question.getByRole("button", { name: "Keep Editing" }).click();
    await expect(question).toHaveCount(0);
    await expect(page).toHaveURL((url) => url.pathname === "/");
    expect(await keptRaw(page)).toBe(before);

    await pickFile(page, "Midlength.brd", midlength.locked);
    await expect(dialogOf(page)).toBeVisible();
    await dialogOf(page).getByRole("button", { name: BRD_FIT_COPY.openBoard, exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "Discard & Open" }).click();
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design.boardName, { timeout: 30_000 }).toBe("Midlength");
    const design = (await storedOpenBoard(page))!.snapshot.design as unknown as Record<string, unknown>;
    expect(design.blank).toBeNull();
    for (const part of ["outline", "rocker", "foil"] as const) {
      expect(sameWithin(design[part], fields[part], 1e-9, part)).toBeNull();
    }
  });

  test("b9. Print Overview prints one or two pages on a computer, opens a tab on an iPhone, downloads on Android; the preview stays and Close still changes nothing", async ({
    page,
  }, testInfo) => {
    const file = boardFile(SHORTBOARD);
    await page.goto("/");
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    const print = dialog.getByRole("button", { name: BRD_FIT_COPY.print, exact: true });
    await expect(print).toBeEnabled();

    if (testInfo.project.name === "android") {
      const [download] = await Promise.all([page.waitForEvent("download"), print.click()]);
      expect(download.suggestedFilename()).toMatch(/-closest-fit\.pdf$/);
    } else if (testInfo.project.name === "iphone") {
      const [tab] = await Promise.all([page.waitForEvent("popup"), print.click()]);
      await expect.poll(() => tab.url(), { message: "the overview opens in a tab to print from" }).toMatch(/^blob:/);
      await tab.close();
    } else {
      await print.click();
      const frame = page.locator("iframe[data-print-pdf]");
      await expect(frame).toHaveCount(1);
      const pdf = await frame.evaluate(async (el) => {
        const bytes = new Uint8Array(await (await fetch((el as HTMLIFrameElement).src)).arrayBuffer());
        return new TextDecoder("latin1").decode(bytes);
      });
      expect(pdf.slice(0, 5)).toBe("%PDF-");
      // One page is the aim; the BOTTOM block takes a second when the two views would be squeezed (quick 261113-gwr).
      expect((pdf.match(/\/Type \/Page\b/g) ?? []).length).toBeLessThanOrEqual(2);
      expect(pdf.match(/\/Type \/Page\b/g)).not.toBeNull();
      const box = /MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(pdf);
      if (!box) throw new Error("the PDF has no MediaBox");
      expect(Number(box[1])).toBeCloseTo(595.28, 1);
      expect(Number(box[2])).toBeCloseTo(792, 1);
      expect(pdf).toContain("Nose tip");
      expect(pdf).toContain("Our fit");
      expect(pdf).toContain("Shortboard.brd");
    }

    // The preview is still open, Print Overview is ready again, and Close changes nothing.
    await expect(dialog).toBeVisible();
    await expect(print).toBeEnabled();
    await expect(dialog.locator("[data-brd-fit-print-problem]")).toHaveCount(0);
    await dialog.getByRole("button", { name: BRD_FIT_COPY.close, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL((url) => url.pathname === "/");
    expect(await storedOpenBoard(page)).toBeNull();
  });

  const CATALOGUE = "**/api/blank-catalog";
  const MAKER_ORDER = ["US Blanks", "Arctic Foam", "Marko Foam", "Millennium Foam"];

  test("b10. the catalogue is asked for once, only when a board file is looked at; the block names one blank per maker, US Blanks' the Shortboard's own 6'3\"RP; the footer still fits", async ({
    page,
  }, testInfo) => {
    const file = boardFile(SHORTBOARD);
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/blank-catalog")) requests.push(request.url());
    });

    // The home page is not heavier for anybody: no catalogue request until a file is picked.
    await page.goto("/");
    await page.waitForTimeout(1_000);
    expect(requests).toEqual([]);

    const started = Date.now();
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    const block = dialog.locator("[data-brd-blanks]");
    await expect(block).toContainText(BRD_BLANK_COPY.caption);
    const makers = block.locator("[data-brd-blanks-maker]");
    await expect(makers).toHaveCount(4, { timeout: 10_000 });
    const took = Date.now() - started;
    testInfo.annotations.push({ type: "blank-suggestions-ms", description: `${took} ms from the file chosen to four makers showing` });
    console.log(`b10 ${testInfo.project.name}: suggestions showing ${took} ms after the file was chosen`);
    expect(took, "the block must show well inside five seconds").toBeLessThan(5_000);

    await expect(block.locator("[data-brd-blanks-intro]")).toHaveText(BRD_BLANK_COPY.intro);
    for (const [i, vendor] of MAKER_ORDER.entries()) {
      await expect(makers.nth(i).locator("p").first()).toContainText(new RegExp(`^${vendor} `));
    }
    await expect(makers.nth(0).locator("p").first()).toContainText('US Blanks 6\'3"RP:');
    expect(requests).toHaveLength(1);

    // Close and look again in the same visit: the catalogue is already here, so no second request.
    await dialog.getByRole("button", { name: BRD_FIT_COPY.close, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await pickFile(page, "Shortboard.brd", file.locked);
    await expect(dialogOf(page).locator("[data-brd-blanks-maker]")).toHaveCount(4, { timeout: 10_000 });
    expect(requests).toHaveLength(1);

    // The footer's three buttons are still in view and never overlap (as b6 checks), with the block in the body above them.
    const names = [BRD_FIT_COPY.print, BRD_FIT_COPY.openBoard, BRD_FIT_COPY.close];
    const boxes = [];
    for (const name of names) {
      const button = dialogOf(page).getByRole("button", { name, exact: true });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      if (!box) throw new Error(`no box for ${name}`);
      boxes.push(box);
    }
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("no viewport");
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    }
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        const apart =
          boxes[a].x + boxes[a].width <= boxes[b].x + 0.5 ||
          boxes[b].x + boxes[b].width <= boxes[a].x + 0.5 ||
          boxes[a].y + boxes[a].height <= boxes[b].y + 0.5 ||
          boxes[b].y + boxes[b].height <= boxes[a].y + 0.5;
        expect(apart, `${names[a]} and ${names[b]} must not overlap`).toBe(true);
      }
    }
    // The block's text is never wider than the box that holds it, so nothing is clipped across a phone.
    const overflow = await dialogOf(page).locator("[data-brd-blanks]").evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("b11. when the catalogue can't load the block says so in one quiet line, Print Overview and Open as a Board still work, and a later look tries again", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for the failure");
    const file = boardFile(SHORTBOARD);
    await page.route(CATALOGUE, (route) => route.fulfill({ status: 500, contentType: "text/plain", body: "no" }));
    await page.goto("/");
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    const status = dialog.locator("[data-brd-blanks-status]");
    await expect(status).toHaveText(BRD_BLANK_COPY.unavailable);
    await expect(status).toHaveAttribute("role", "status");
    await expect(dialog.locator("[data-brd-blanks-maker]")).toHaveCount(0);
    await expect(dialog.locator("[data-brd-blanks-intro]")).toHaveCount(0);

    // Print Overview still makes its page or two, carrying the same quiet line.
    await dialog.getByRole("button", { name: BRD_FIT_COPY.print, exact: true }).click();
    const frame = page.locator("iframe[data-print-pdf]");
    await expect(frame).toHaveCount(1);
    const pdf = await frame.evaluate(async (el) => {
      const bytes = new Uint8Array(await (await fetch((el as HTMLIFrameElement).src)).arrayBuffer());
      return new TextDecoder("latin1").decode(bytes);
    });
    expect((pdf.match(/\/Type \/Page\b/g) ?? []).length).toBeLessThanOrEqual(2);
    expect(pdf).toContain(BRD_BLANK_COPY.caption);
    expect(pdf).toContain("Pick one on ROCKER");
    await expect(dialog.locator("[data-brd-fit-print-problem]")).toHaveCount(0);

    // Close, let the catalogue through, look again: a failure is not remembered.
    await dialog.getByRole("button", { name: BRD_FIT_COPY.close, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.unroute(CATALOGUE);
    await pickFile(page, "Shortboard.brd", file.locked);
    await expect(dialogOf(page).locator("[data-brd-blanks-maker]")).toHaveCount(4, { timeout: 10_000 });

    // And with the catalogue down, Open as a Board still opens the fit on TEMPLATE with no blank.
    await dialogOf(page).getByRole("button", { name: BRD_FIT_COPY.close, exact: true }).click();
    await page.route(CATALOGUE, (route) => route.abort());
    await page.reload();
    await pickFile(page, "Shortboard.brd", file.locked);
    await expect(dialogOf(page).locator("[data-brd-blanks-status]")).toHaveText(BRD_BLANK_COPY.unavailable);
    await dialogOf(page).getByRole("button", { name: BRD_FIT_COPY.openBoard, exact: true }).click();
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design.boardName, { timeout: 30_000 }).toBe("Shortboard");
    expect(((await storedOpenBoard(page))!.snapshot.design as unknown as Record<string, unknown>).blank).toBeNull();
  });

  test("b12. Open as a Board after the suggestions show still opens with no blank picked: ROCKER's BLANK button offers Pick a Blank, not a blank's name", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for the pick");
    const file = boardFile(SHORTBOARD);
    await page.goto("/");
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog.locator("[data-brd-blanks-maker]")).toHaveCount(4, { timeout: 10_000 });
    await dialog.getByRole("button", { name: BRD_FIT_COPY.openBoard, exact: true }).click();
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design.boardName, { timeout: 30_000 }).toBe("Shortboard");
    expect(((await storedOpenBoard(page))!.snapshot.design as unknown as Record<string, unknown>).blank).toBeNull();

    await page.locator('a[href="/design/rocker"]:visible').first().click();
    await expect(page).toHaveURL(/\/design\/rocker$/);
    const button = page.locator("[data-blank-button]");
    await expect(button).toBeVisible({ timeout: 30_000 });
    await expect(button.locator("[data-blank-name]")).toHaveCount(0);
    await expect(button.locator("[data-blank-button-line]")).toContainText("long enough for this board");
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Quick 261113-gwr: the file's bottom
// ---------------------------------------------------------------------------------------------------------------------

/** The Shortboard written with a 1/4" Deep Single Concave under it and a 3/16" Panel Vee tail, the way the app's own writer writes a contoured board. */
let concave: Made | null = null;
function concaveFile(): Made {
  if (concave) return concave;
  const fields = BOARDS.find((b) => b.label === SHORTBOARD)!.fields;
  const geometry = buildOutline(fields.outline);
  const profile = designSideProfile(fields, LIVE_DESIGN_RULES);
  const rails = deriveEffectiveRails(fields.rails, profile.effectiveFoil, fields.railsImportFoilThickness);
  const board = designBottomBoard(fields.outline, geometry, profile, designFinPlacement(fields));
  const bottom = {
    ...structuredClone(DEFAULT_BOTTOM),
    center: { ...startingCut("center", "Deep Single Concave", board), depth: inchesToMm(4 / 16) },
    tail: { ...startingCut("tail", "Panel Vee", board), depth: inchesToMm(3 / 16) },
  };
  const surface = buildBoardSurface({
    sections: designCrossSectionInput(geometry, profile, rails, fields.outline.length, { bottom, board }),
    geometry,
    rockerAt: profile.rockerAt,
  });
  const options = { bottomStations: brdBottomStations(resolveBottom(bottom, board)) };
  concave = { locked: Buffer.from(brdFile(surface, SHORTBOARD, options).data), text: brdText(surface, options).text };
  return concave;
}

const COLUMNS = ["nose", "center", "tail"] as const;
const ROW_KEYS = ["at", "file", "fit", "stations", "across"] as const;

test.describe("The bottom of a .brd (quick 261113-gwr)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    await dismissBannerAndTip(page);
  });

  test("b13. the BOTTOM block: three cross-sections with the file's line and ours, the table's fifteen cells, the closeness line, the two-rockers line and the lift note are the sheet's; the section Height opens at x4 and leaves the side view's alone", async ({
    page,
  }, testInfo) => {
    const exact = testInfo.project.name !== "iphone";
    const file = concaveFile();
    const look = lookOf(file.locked);
    const sheet = brdFitSheet(look, "Shortboard.brd", "imperial");
    if (!sheet.bottom.read) throw new Error("the concave Shortboard's bottom should have been read");
    const block = sheet.bottom;

    await page.goto("/");
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    const bottom = dialog.locator("[data-brd-fit-bottom]");
    await bottom.scrollIntoViewIfNeeded();
    await expect(bottom).toBeVisible();

    // Three drawings, nose, centre, tail, each with the file's line and ours; each caption is the sheet's.
    const figures = dialog.locator("[data-brd-fit-section]");
    await expect(figures).toHaveCount(3);
    for (const [i, key] of COLUMNS.entries()) {
      const figure = dialog.locator(`[data-brd-fit-section="${key}"]`);
      await expect(figure.locator('[data-brd-fit-line="file"]')).toHaveCount(1);
      await expect(figure.locator('[data-brd-fit-line="fit"]')).toHaveCount(1);
      await expect(figure.locator("[data-brd-fit-section-caption]")).toHaveText(block.columns[i].drawingCaption!);
    }

    // The table: Nose, Centre, Tail across; five rows down; every cell the sheet's (by shape on the iPhone, where the fit may differ in a last digit).
    await expect(dialog.locator("[data-brd-fit-bottom-table] thead th")).toHaveText(block.columns.map((c) => c.label));
    for (const row of block.rows) {
      const cells = dialog.locator(`[data-brd-fit-bottom-row="${row.key}"]`);
      await expect(cells.locator("th")).toHaveText(row.label);
      for (const [i, key] of COLUMNS.entries()) {
        const cell = cells.locator(`[data-brd-fit-cell="${key}"]`);
        if (exact || row.key === "at" || row.key === "file") await expect(cell).toHaveText(row.cells[i]);
        else await expect(cell).not.toHaveText("");
      }
    }
    expect(ROW_KEYS).toEqual(block.rows.map((r) => r.key));
    for (const note of block.notes) await expect(dialog.locator("[data-brd-fit-bottom-note]").filter({ hasText: note })).toHaveCount(1);

    // The bottom's HOW CLOSE line; the two-rockers line and the lift note under the rocker table; the rocker table's figures.
    const close = dialog.locator("[data-brd-fit-close-bottom]");
    if (exact) await expect(close).toHaveText(sheet.closeness.bottom!);
    else await expect(close).toHaveText(/^Bottom: (within|less than) .+, typically .+ — the widest gap at the section .+ out from the stringer/);
    await expect(dialog.locator("[data-brd-fit-rocker-lines]")).toHaveText(sheet.rockerLines);
    expect(sheet.stringerNote).not.toBeNull();
    if (exact) await expect(dialog.locator("[data-brd-fit-stringer-note]")).toHaveText(sheet.stringerNote!);
    else await expect(dialog.locator("[data-brd-fit-stringer-note]")).toContainText("lift its stringer");
    if (exact) {
      const tables = await tablesOf(dialog);
      for (const [i, table] of tables.entries()) for (const [j, row] of table.rows.entries()) expect(row.fit).toBe(sheet.tables[i].rows[j].fit);
      await expect(dialog.locator('[data-brd-fit-control="bottom"]')).toHaveText(sheet.controls.bottom!);
    }
    await expect(dialog.locator("[data-brd-fit-not-read]")).toHaveText(BRD_FIT_COPY.notReadAfterBottom);

    // The section Height opens at x4 and x8 changes the caption; the side view's own Height stays at x1.
    const pressed = (which: "section" | "side") =>
      dialog.locator(which === "section" ? "[data-brd-fit-section-height]" : "[data-brd-fit-height]").locator('button[aria-pressed="true"]');
    await expect(pressed("section")).toHaveText(BOTTOM_COPY.heightButton(4));
    await expect(pressed("side")).toHaveText(BOTTOM_COPY.heightButton(1));
    const captionAt = (height: 1 | 2 | 4 | 8) => BRD_FIT_COPY.bottomSectionsCaption(sectionHeightLabel(brdBottomFrames(brdBottomRows(look), height)));
    await expect(dialog.locator("[data-brd-fit-sections-caption]")).toHaveText(captionAt(4));
    await dialog.locator("[data-brd-fit-section-height]").getByRole("button", { name: BOTTOM_COPY.heightButtonName(8) }).click();
    await expect(pressed("section")).toHaveText(BOTTOM_COPY.heightButton(8));
    await expect(dialog.locator("[data-brd-fit-sections-caption]")).toHaveText(captionAt(8));
    await expect(pressed("side")).toHaveText(BOTTOM_COPY.heightButton(1));
    await expect(dialog.locator("[data-brd-fit-side]")).toHaveAttribute("data-brd-fit-side-height", "1");

    // Close changes nothing.
    await dialog.getByRole("button", { name: BRD_FIT_COPY.close }).click();
    await expect(dialog).toHaveCount(0);
    expect(await storedOpenBoard(page)).toBeNull();
  });

  test("b14. the app's own flat Shortboard reads flat everywhere: no lift note, and the file's and our cells say Flat", async ({ page }) => {
    const file = boardFile(SHORTBOARD);
    const sheet = sheetOf(file.locked, "Shortboard.brd", "imperial");
    if (!sheet.bottom.read) throw new Error("the flat Shortboard's bottom should have been read");
    await page.goto("/");
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("[data-brd-fit-bottom]")).toBeAttached();
    await expect(dialog.locator("[data-brd-fit-stringer-note]")).toHaveCount(0);
    await expect(dialog.locator("[data-brd-fit-rocker-lines]")).toHaveText(sheet.rockerLines);
    for (const key of COLUMNS) {
      await expect(dialog.locator(`[data-brd-fit-bottom-row="file"] [data-brd-fit-cell="${key}"]`)).toHaveText(BRD_FIT_COPY.bottomKinds.flat);
    }
    for (const [i, key] of COLUMNS.entries()) {
      await expect(dialog.locator(`[data-brd-fit-bottom-row="fit"] [data-brd-fit-cell="${key}"]`)).toHaveText(sheet.bottom.read ? sheet.bottom.rows[2].cells[i] : "");
      await expect(dialog.locator(`[data-brd-fit-bottom-row="stations"] [data-brd-fit-cell="${key}"]`)).toHaveText(BRD_FIT_COPY.noValue);
    }
  });

  test("b15. Open as a Board carries the fitted bottom: the kept board holds the cuts and the planed rocker and foil, and BOTTOM shows the three names and the centre's sliders", async ({
    page,
  }, testInfo) => {
    const file = concaveFile();
    const look = lookOf(file.locked);
    const fields = brdBoardFields(look.fit, "Shortboard.brd", look.bottom!.bottom);
    if (!fields?.bottom) throw new Error("the concave Shortboard's fit should open with a bottom");
    const saves = watchSaves(page);
    await page.goto("/");
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: BRD_FIT_COPY.openBoard, exact: true }).click();
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design.boardName, { timeout: 30_000 }).toBe("Shortboard");

    const kept = await storedOpenBoard(page);
    const design = kept!.snapshot.design as unknown as Record<string, unknown>;
    const tolerance = testInfo.project.name === "iphone" ? 0.01 : 1e-9;
    expect(design.blank).toBeNull();
    for (const part of ["outline", "rocker", "foil", "bottom"] as const) {
      expect(sameWithin(design[part], fields[part], tolerance, part)).toBeNull();
    }
    expect(saves).toEqual([]);

    // BOTTOM, on the same board: the three cuts' names and, on a computer, the centre's three station sliders in their words.
    await page.goto("/design/bottom");
    for (const key of COLUMNS) {
      await showBottomSection(page, key);
      await expect(page.locator(`[data-bottom-card="${key}"] [data-bottom-cut-echo]`)).toHaveText(fields.bottom[key].name);
    }
    await bottomFloorScanSettled(page);
    if (testInfo.project.name === "desktop") {
      const opened = designBottomBoard(fields.outline, buildOutline(fields.outline), designSideProfile(fields, LIVE_DESIGN_RULES), designFinPlacement(fields));
      const resolved = resolveCut("center", fields.bottom.center, opened);
      const card = page.locator('[data-bottom-card="center"]');
      for (const [field, word] of [["start", BOTTOM_COPY.start], ["deepest", BOTTOM_COPY.deepestAt], ["end", BOTTOM_COPY.end]] as const) {
        const words = BOTTOM_COPY.fromTip("center", formatBottomStation(stationFromNearestTip("center", resolved[field], opened), "imperial"));
        await expect(card).toContainText(`${word} — ${words}`);
      }
    }
  });

  test("b16. a file with no cross-sections: the preview says so in one line, draws no section, keeps today's not-read line, and Open as a Board opens with no bottom", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for a file with no sections");
    const full = boardFile(SHORTBOARD);
    const cut = Buffer.from(full.text.slice(0, full.text.indexOf("p35 : (")), "latin1");
    const sheet = sheetOf(cut, "No Sections.brd", "imperial");
    expect(sheet.bottom).toEqual({ read: false, caption: BRD_FIT_COPY.bottomCaption, line: BRD_FIT_COPY.bottomUnread });
    await page.goto("/");
    await pickFile(page, "No Sections.brd", cut);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("[data-brd-fit-bottom-unread]")).toHaveText(BRD_FIT_COPY.bottomUnread);
    await expect(dialog.locator("[data-brd-fit-section]")).toHaveCount(0);
    await expect(dialog.locator("[data-brd-fit-close-bottom]")).toHaveCount(0);
    await expect(dialog.locator("[data-brd-fit-not-read]")).toHaveText(BRD_FIT_COPY.notRead);
    await dialog.getByRole("button", { name: BRD_FIT_COPY.openBoard, exact: true }).click();
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design.boardName, { timeout: 30_000 }).toBe("No Sections");
    expect("bottom" in ((await storedOpenBoard(page))!.snapshot.design as unknown as Record<string, unknown>)).toBe(false);
  });

  test("b17. the printed overview of the concave board is one page or two A4-wide by Letter-tall pages, and carries BOTTOM, the fitted names and Our fit", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for the print frame");
    const file = concaveFile();
    await page.goto("/");
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: BRD_FIT_COPY.print, exact: true }).click();
    const frame = page.locator("iframe[data-print-pdf]");
    await expect(frame).toHaveCount(1);
    const pdf = await frame.evaluate(async (el) => {
      const bytes = new Uint8Array(await (await fetch((el as HTMLIFrameElement).src)).arrayBuffer());
      return new TextDecoder("latin1").decode(bytes);
    });
    expect(pdf.slice(0, 5)).toBe("%PDF-");
    const pages = (pdf.match(/\/Type \/Page\b/g) ?? []).length;
    expect(pages).toBeGreaterThanOrEqual(1);
    expect(pages).toBeLessThanOrEqual(2);
    for (const box of pdf.matchAll(/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)) {
      expect(Number(box[1])).toBeCloseTo(595.28, 1);
      expect(Number(box[2])).toBeCloseTo(792, 1);
    }
    expect(pdf).toContain("BOTTOM");
    expect(pdf).toContain("Deep Single Concave");
    expect(pdf).toContain("Our fit");
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Quick 261113-hyy: a file's wings (the plan's w1-w4)
// ---------------------------------------------------------------------------------------------------------------------

const WINGED = "wing|shortboard|one";

test.describe("A wing in a .brd (quick 261113-hyy)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    await dismissBannerAndTip(page);
  });

  test("b18. a winged file's preview says its one wing, the file's beside ours, under HOW CLOSE, and the not-read line no longer mentions wings", async ({ page }, testInfo) => {
    const exact = testInfo.project.name !== "iphone";
    const file = boardFile(WINGED);
    const sheet = sheetOf(file.locked, "Winged.brd", "imperial");
    expect(sheet.wings).toHaveLength(1);

    await page.goto("/");
    await pickFile(page, "Winged.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    const lines = dialog.locator("[data-brd-fit-wing]");
    await expect(lines).toHaveCount(1);
    await expect(lines.first()).toHaveAttribute("data-brd-fit-wing", "1");
    // The fit is exact across V8 builds but WebKit's maths may differ in a last digit: by shape on the iPhone.
    if (exact) await expect(lines.first()).toHaveText(sheet.wings[0]);
    else await expect(lines.first()).toHaveText(/^Wing 1 — the file: .+\sdeep\sover a .+\srun along the stringer, .+\soff the tail, sharp corners\. Ours: .+\sdeep\sover a .+\srun, .+\soff the tail, sharp corners\.$/);
    // It sits with the HOW CLOSE lines, after the outline's and before the tips note.
    const order = await dialog.locator("[data-brd-fit-close-outline], [data-brd-fit-wing], [data-brd-fit-tips]").evaluateAll((els) =>
      els.map((el) => (el.hasAttribute("data-brd-fit-wing") ? "wing" : el.hasAttribute("data-brd-fit-tips") ? "tips" : "outline")),
    );
    expect(order).toEqual(["outline", "wing", "tips"]);
    await expect(dialog.locator("[data-brd-fit-not-read]")).toHaveText(sheet.notRead);
    await expect(dialog.locator("[data-brd-fit-not-read]")).not.toContainText(/wing|flyer/i);
    // The dashed outline is still drawn.
    await expect(dialog.locator('[data-brd-fit-top] [data-brd-fit-line="fit"]')).toHaveCount(1);
    if (testInfo.project.name !== "desktop") {
      await lines.first().scrollIntoViewIfNeeded();
      const box = await lines.first().boundingBox();
      const viewport = page.viewportSize();
      if (!box || !viewport) throw new Error("no box for the wing line or the viewport");
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
    }
  });

  test("b19. in Metric the place off the tail reads in centimetres and the depth and run in whole millimetres", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for Metric");
    await setMetricUnits(page);
    const file = boardFile(WINGED);
    const sheet = sheetOf(file.locked, "Winged.brd", "metric");
    await page.goto("/");
    await pickFile(page, "Winged.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    const line = dialog.locator("[data-brd-fit-wing]");
    await expect(line).toHaveText(sheet.wings[0]);
    await expect(line).toContainText(" cm off the tail");
    await expect(line).toContainText(" mm deep");
    await expect(line).toContainText(" mm run along the stringer");
    await expect(line).not.toContainText('"');
  });

  test("b20. Open as a Board opens with the wing: the kept board holds it sharp and unlocked, and TEMPLATE's WINGS tab shows it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for the WINGS tab");
    const file = boardFile(WINGED);
    const look = lookOf(file.locked);
    const fields = brdBoardFields(look.fit, "Winged.brd");
    if (!fields?.outline.wings) throw new Error("the winged fit should open with a wing");
    const wing = fields.outline.wings[0];
    const saves = watchSaves(page);

    await page.goto("/");
    await pickFile(page, "Winged.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: BRD_FIT_COPY.openBoard, exact: true }).click();
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design.boardName, { timeout: 30_000 }).toBe("Winged");

    const kept = (await storedOpenBoard(page))!.snapshot.design as unknown as { outline: { wings?: Record<string, unknown>[] } };
    expect(kept.outline.wings).toHaveLength(1);
    expect(sameWithin(kept.outline.wings![0], wing, 1e-9, "wing")).toBeNull();
    expect(kept.outline.wings![0].lock).toBeNull();
    expect(kept.outline.wings![0].radius).toBe(0);
    expect(saves).toEqual([]);

    // The tab strip names the one wing, and the tab shows it as a wing a shaper added: position as the WINGS tab words it.
    const tab = page.getByRole("tab", { name: "WINGS · 1" });
    await expect(tab).toBeVisible({ timeout: 30_000 });
    await tab.click();
    const row = page.locator('[data-wing-controls="1"]').getByText(/^Position from tail — /);
    await expect(row).toHaveText(`Position from tail — ${formatDim(wing.station, "imperial")}`);
    await expect(page.locator('[data-wing-controls="2"]')).toHaveCount(0);
  });

  test("b21. a file with no wing shows no wing line, and its not-read line is still about rails", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for a wingless file");
    const file = boardFile(SHORTBOARD);
    await page.goto("/");
    await pickFile(page, "Shortboard.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-brd-fit-top] [data-brd-fit-line="fit"]')).toHaveCount(1);
    await expect(dialog.locator("[data-brd-fit-wing]")).toHaveCount(0);
    await expect(dialog.locator("[data-brd-fit-not-read]")).toHaveText(/^Rails/);
    await expect(dialog.locator("[data-brd-fit-not-read]")).not.toContainText(/wing|flyer/i);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Quick 261113-m5w: a wing's corners
// ---------------------------------------------------------------------------------------------------------------------

test.describe("A wing's corners in a .brd (quick 261113-m5w)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(180_000);
    await dismissBannerAndTip(page);
  });

  test("b28. a file whose wing is clearly rounded says the corners on both sides, and the dialog keeps the figures whole", async ({ page }, testInfo) => {
    const exact = testInfo.project.name !== "iphone";
    const file = roundedFile();
    const sheet = sheetOf(file.locked, "Rounded.brd", "imperial");
    expect(sheet.wings).toHaveLength(1);
    expect(sheet.wings[0]).toContain("corners rounded about");
    expect(sheet.wings[0]).toContain("corner radius.");
    expect(sheet.wings[0]).not.toContain("sharp corners");

    await page.goto("/");
    await pickFile(page, "Rounded.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    const lines = dialog.locator("[data-brd-fit-wing]");
    await expect(lines).toHaveCount(1);
    if (exact) {
      await expect(lines.first()).toHaveText(sheet.wings[0]);
      // The dialog draws the sheet's words with its figures kept together: the raw text is the sheet's, through the one house function.
      expect(await lines.first().evaluate((el) => el.textContent)).toBe(keepFiguresTogether(sheet.wings[0]));
    } else {
      // WebKit's maths may differ in a last digit: by shape (a regex sees the no-break spaces, so \s sits beside every figure).
      await expect(lines.first()).toHaveText(
        /^Wing 1 — the file: .+\sdeep\sover a .+\srun along the stringer, .+\soff the tail, corners rounded about .+\. Ours: .+\sdeep\sover a .+\srun, .+\soff the tail, .+\scorner radius\.$/,
      );
    }
  });

  test("b29. in Metric the rounded line reads the radius in whole millimetres and the place off the tail in centimetres", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for Metric");
    await setMetricUnits(page);
    const file = roundedFile();
    const sheet = sheetOf(file.locked, "Rounded.brd", "metric");
    await page.goto("/");
    await pickFile(page, "Rounded.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    const line = dialog.locator("[data-brd-fit-wing]");
    await expect(line).toHaveText(sheet.wings[0]);
    await expect(line).toContainText("mm corner radius");
    await expect(line).toContainText("corners rounded about");
    await expect(line).toContainText("cm off the tail");
    await expect(line).not.toContainText('"');
  });

  test("b30. Open as a Board opens the rounded wing: the kept board holds its radius, unlocked, and the WINGS tab's Corner radius already reads it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "one computer is enough for the WINGS tab");
    const file = roundedFile();
    const fields = brdBoardFields(lookOf(file.locked).fit, "Rounded.brd");
    if (!fields?.outline.wings) throw new Error("the rounded fit should open with a wing");
    const wing = fields.outline.wings[0];
    expect(wing.radius).toBeGreaterThan(0);
    const saves = watchSaves(page);

    await page.goto("/");
    await pickFile(page, "Rounded.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: BRD_FIT_COPY.openBoard, exact: true }).click();
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design.boardName, { timeout: 30_000 }).toBe("Rounded");

    const kept = (await storedOpenBoard(page))!.snapshot.design as unknown as { outline: { wings?: Record<string, unknown>[] } };
    expect(kept.outline.wings).toHaveLength(1);
    expect(sameWithin(kept.outline.wings![0], wing, 1e-9, "wing")).toBeNull();
    expect(kept.outline.wings![0].lock).toBeNull();
    expect(kept.outline.wings![0].radius as number).toBeGreaterThan(0);
    expect(saves).toEqual([]);

    const tab = page.getByRole("tab", { name: "WINGS · 1" });
    await expect(tab).toBeVisible({ timeout: 30_000 });
    await tab.click();
    const row = page.locator('[data-wing-controls="1"]').getByText(/^Corner radius — /);
    await expect(row).toHaveText(`Corner radius — ${formatMark(effectiveWingRadius(wing), "imperial")}`);
    await expect(page.locator('[data-wing-controls="2"]')).toHaveCount(0);
  });

  test("b31. on a phone the rounded line holds a no-break space inside every whole number with its fraction, and stays inside the screen", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones are what wrap");
    const file = roundedFile();
    await page.goto("/");
    await pickFile(page, "Rounded.brd", file.locked);
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    const line = dialog.locator("[data-brd-fit-wing]");
    await expect(line).toHaveCount(1);
    const raw = (await line.evaluate((el) => el.textContent)) ?? "";
    // A whole number and its fraction ("7 7/16\"") are joined by a no-break space, never a plain one; the rounded line has some.
    expect(raw).toMatch(/\d\u00a0\d+\/\d+/);
    expect(raw).not.toMatch(/\d \d+\/\d+/);
    // And a number is joined to its unit when it has one (none in Imperial): the same function, so no plain space either way.
    expect(raw).not.toMatch(/\d (?:mm|cm|L)\b/);
    await line.scrollIntoViewIfNeeded();
    const box = await line.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error("no box for the wing line or the viewport");
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
  });
});
