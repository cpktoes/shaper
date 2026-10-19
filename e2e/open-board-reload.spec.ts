import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { BOARD_PRESETS } from "../lib/geometry/presets";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { pickedCard, waitForBlankButton } from "./helpers/blank-picker";
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

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "android", "one phone (the iPhone) proves the reload");
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
  // The stock board draws first and the kept board replaces it a frame later, so this check retries.
  await expect(pickedCard(page)).toHaveText(cardBefore);

  await walkTo(page, testInfo, "TEMPLATE", /\/design\/outline$/);
  await expect(outlineSilhouette(page)).toHaveAttribute("d", outlineBefore!);
});
