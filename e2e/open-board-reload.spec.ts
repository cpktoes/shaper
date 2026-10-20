import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { RACK_COPY } from "../components/setup/rack-config";
import { presetDesignFields } from "../lib/blanks/preset-blanks";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { DEFAULT_VOLUME_SPEC } from "../lib/geometry/volume";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import type { DesignSnapshotFields } from "../lib/models/design-snapshot";
import { OPEN_BOARD_STORAGE_KEY, OPEN_BOARD_WRITE_DEBOUNCE_MS, openBoardCopyJson } from "../lib/models/open-board";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { blankButton, openRocker, pickFirstFittingBlank, pickedCard, waitForBlankButton } from "./helpers/blank-picker";
import { storedOpenBoard } from "./helpers/open-board";
import { openPhoneMenu, screenTile, type ScreenLabel } from "./helpers/screens";

/**
 * The board a shaper is working on survives a page reload (quick 261019-ep5).
 *
 * The founder, 2026-10-19: "Somehow, I keep ending up on a board without a blank and a pretty lame
 * looking foil." The open board used to live only in the page's memory, so a reload, a phone's
 * Safari refreshing a tab, a bookmark or a new deploy of the site all opened the stock 6'0" board
 * with no blank. The board is now kept in this browser and comes back on the next load. These tests
 * prove it on the computer and on the iPhone (WebKit, the engine of the founder's own phone); one
 * phone is enough for this proof, so Android is skipped.
 */

/** A preset's blank name as the app ships it (the Fish sits in `US Blanks 5'10"RP`) — read from the
 * presets themselves, never typed here. */
function presetBlankName(name: string): string {
  const blank = BOARD_PRESETS.find((preset) => preset.name === name)?.blank;
  if (!blank) throw new Error(`the ${name} preset has no blank`);
  return blank.name;
}

const FISH_BLANK = presetBlankName("Fish");
const MID_LENGTH_BLANK = presetBlankName("Mid-length");

/**
 * How long a check that something did NOT come back gives the read-back. The kept board is read once,
 * just after the page wakes, after React's after-paint effects — which can land a moment after the
 * BLANK button is live — so a test proving the stock board stayed has to give it that chance before
 * it looks. A deliberate wait for something that must not happen, not a retry.
 */
const READ_BACK_SETTLE_MS = 1_000;

/**
 * How long a check that the kept board DID come back after a load may keep looking. The stock board
 * draws first and the kept board replaces it once React has worked it out again — a board in its
 * blank is a lot of drawing. On the suite's development server, on a cold start under load, the
 * iPhone was measured taking 4 to 11 seconds for that (the copy itself is read at once); so these
 * checks get the same 30 seconds `waitForBlankButton` gives the BLANK button. A real build is far
 * quicker. The check still fails if the board never comes back.
 */
const COMES_BACK_MS = 30_000;

/** Puts a copy in this browser's storage before the page's first load, as an earlier visit would. */
async function keepInBrowser(page: Page, raw: string) {
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [OPEN_BOARD_STORAGE_KEY, raw] as const);
}

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "android", "one phone (the iPhone) proves the reload");
  // Each test loads the page two or three times and walks between screens, and each load may wait up
  // to COMES_BACK_MS for the kept board — more than the suite's 30-second default allows on a cold start.
  test.setTimeout(90_000);
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
});

/** Opens a preset from the home screen's cards by name — `e2e/wings.spec.ts`'s own `openPreset`,
 * copied with its `toPass` retry (the card click flaked under three workers, F13). */
async function openPreset(page: Page, name: string) {
  await page.goto("/");
  const button = page.getByRole("button").filter({ hasText: "Start Shaping" }).filter({ hasText: name }).first();
  await expect(async () => {
    await button.click();
    await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
}

/** Walks to a design screen without reloading the page: the top bar's link on a computer, the ☰
 * sheet's tile on a phone. */
async function walkTo(page: Page, testInfo: TestInfo, label: ScreenLabel, url: RegExp) {
  if (testInfo.project.name === "desktop") {
    await page.locator("nav:not([data-step-nav])").getByRole("link", { name: label, exact: true }).click();
  } else {
    await openPhoneMenu(page);
    await screenTile(page, label).click();
  }
  await expect(page).toHaveURL(url, { timeout: 60_000 });
}

/** TEMPLATE's drawing of the board's outline. */
function outlineSilhouette(page: Page) {
  return page.locator("[data-board-silhouette='outline']").first();
}

test("a reload brings back the same board — its blank and its outline", async ({ page }, testInfo) => {
  await openPreset(page, "Fish");
  await expect(outlineSilhouette(page)).toBeVisible();
  const outlineBefore = await outlineSilhouette(page).getAttribute("d");
  expect(outlineBefore).toBeTruthy();

  await walkTo(page, testInfo, "ROCKER", /\/design\/rocker$/);
  await waitForBlankButton(page);
  await expect(pickedCard(page)).toBeVisible();
  const cardBefore = (await pickedCard(page).textContent()) ?? "";
  expect(cardBefore).toContain(FISH_BLANK);
  await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(FISH_BLANK);

  // The copy is written a moment after the last change; wait until it holds the Fish's blank.
  await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design.blank?.copy.name).toBe(FISH_BLANK);

  await page.reload();
  await waitForBlankButton(page);
  // The stock board draws first and the kept board replaces it once worked out, so this check retries.
  await expect(pickedCard(page)).toHaveText(cardBefore, { timeout: COMES_BACK_MS });

  await walkTo(page, testInfo, "TEMPLATE", /\/design\/outline$/);
  await expect(outlineSilhouette(page)).toHaveAttribute("d", outlineBefore!);
});

test("a copy already in this browser opens with its blank", async ({ page }) => {
  // The read-back on its own, apart from the write: a copy as an earlier visit would have left it,
  // built from the app's own Fish and the app's own writer.
  const fish = BOARD_PRESETS.find((preset) => preset.name === "Fish")!;
  const fields: DesignSnapshotFields = {
    ...presetDesignFields(fish),
    volume: DEFAULT_VOLUME_SPEC,
    finsImportTemplate: true,
    railsImportFoilThickness: true,
    boardName: "",
    finSystem: "fcs2",
  };
  await keepInBrowser(page, openBoardCopyJson(fields, { modelId: null, ownerId: null, locked: false, dirty: true }));
  await openRocker(page);
  await expect(pickedCard(page)).toContainText(fields.blank!.copy.name, { timeout: COMES_BACK_MS });
});

test("a damaged copy is ignored: the stock board opens, and the next change writes a good copy", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await keepInBrowser(page, "{not json");
  await openRocker(page);
  // A deliberate settle wait (see READ_BACK_SETTLE_MS), then a single look — not a retry.
  await page.waitForTimeout(READ_BACK_SETTLE_MS);
  expect(await pickedCard(page).count()).toBe(0);
  await expect(blankButton(page)).toContainText("Pick a Blank");

  const picked = await pickFirstFittingBlank(page);
  await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design.blank?.copy.name).toBe(picked);
  expect(pageErrors).toEqual([]);
});

test("a board nobody has touched is never kept", async ({ page }) => {
  await openRocker(page);
  await page.waitForTimeout(READ_BACK_SETTLE_MS);
  expect(await pickedCard(page).count()).toBe(0);
  await expect(blankButton(page)).toContainText("Pick a Blank");
  // A deliberate wait for a write that must NOT happen: twice the copy's own short wait.
  await page.waitForTimeout(OPEN_BOARD_WRITE_DEBOUNCE_MS * 2);
  expect(await storedOpenBoard(page)).toBeNull();
});

test("a name typed a moment before a reload still comes back", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the computer's top bar; the reload itself is proven on the iPhone above");
  await openPreset(page, "Fish");
  await walkTo(page, testInfo, "SUMMARY", /\/design\/summary$/);
  const boardName = page.locator("[data-order-form-page]").getByRole("textbox", { name: /Board Name/ });
  await expect(boardName).toBeEditable();

  // The write as the page goes, on its own. Inside the page, so no round trip to the test can let the
  // copy's short wait run out first: type the name into the box, give React a moment far shorter
  // than that wait to take it, see the copy has NOT been written yet, then tell the page it is going
  // away (what a reload or a phone backgrounding the tab does) and see the copy written at once.
  const flush = await page.evaluate(
    async ([key, name]) => {
      const box = document.querySelector<HTMLInputElement>("[data-order-form-page] input[placeholder='Name this board']");
      if (!box) throw new Error("no Board Name box");
      const keptName = () => {
        const raw = window.localStorage.getItem(key);
        return raw === null ? null : (JSON.parse(raw).snapshot.design.boardName as string);
      };
      const started = performance.now();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(box, name);
      box.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 20));
      const beforeLeaving = keptName();
      window.dispatchEvent(new Event("pagehide"));
      return { beforeLeaving, afterLeaving: keptName(), elapsed: performance.now() - started };
    },
    [OPEN_BOARD_STORAGE_KEY, "Reload test"] as const,
  );
  expect(flush.elapsed).toBeLessThan(OPEN_BOARD_WRITE_DEBOUNCE_MS);
  expect(flush.beforeLeaving).not.toBe("Reload test");
  expect(flush.afterLeaving).toBe("Reload test");

  // And what a shaper sees: reloading at once, with no wait, the name is still there.
  await boardName.fill("Reload test 2");
  await page.reload();
  await expect(boardName).toHaveValue("Reload test 2", { timeout: COMES_BACK_MS });
});

test("a new preset replaces the kept board", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "the computer's home page and top bar");
  await openPreset(page, "Fish");
  await walkTo(page, testInfo, "ROCKER", /\/design\/rocker$/);
  await waitForBlankButton(page);
  await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(FISH_BLANK);
  await expect.poll(async () => (await storedOpenBoard(page))?.snapshot.design.blank?.copy.name).toBe(FISH_BLANK);

  // The home page sees the kept board as a board in progress.
  await page.goto("/");
  await expect(page.getByText(RACK_COPY.unsavedTag).first()).toBeVisible();
  const midLength = page.getByRole("button").filter({ hasText: "Start Shaping" }).filter({ hasText: "Mid-length" }).first();
  const confirm = page.getByRole("alertdialog", { name: "Start a new design?" });
  await expect(async () => {
    if (!(await confirm.isVisible())) await midLength.click();
    await expect(confirm).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 30_000 });
  await confirm.getByRole("button", { name: "Discard & Start New" }).click();
  await expect(page).toHaveURL(/\/design\/outline$/, { timeout: 30_000 });

  await walkTo(page, testInfo, "ROCKER", /\/design\/rocker$/);
  await waitForBlankButton(page);
  await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(MID_LENGTH_BLANK);

  await page.reload();
  await waitForBlankButton(page);
  await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(MID_LENGTH_BLANK, { timeout: COMES_BACK_MS });
  await expect(pickedCard(page)).not.toContainText(FISH_BLANK);
});
