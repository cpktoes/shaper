import { devices, expect, test, type Locator, type Page } from "@playwright/test";
import {
  blankButton,
  openRocker,
  pickedCard,
  pickFirstFittingBlank,
  removeBlankDialog,
} from "./helpers/blank-picker";

/**
 * The browser proof that Remove This Blank asks first (quick 261018-ejc, 2026-10-18). The founder:
 * "And Removing it keeps the rocker and foil at the five stations and re-draws the curve through them,
 * for you to set by hand can turn into a popup after clicking remove blank rather than taking up room on
 * the controls."
 *
 * What this proves:
 * - The sentence is gone from the sidebar. Remove This Blank opens a popup titled `Remove this blank?`
 *   that carries the sentence and exactly two buttons, Cancel and Remove Blank.
 * - Cancel and Esc keep the blank and put focus back on the Remove This Blank link; Remove Blank removes
 *   it (the BLANK button reads Pick a Blank again, the board is hand-set) and focus lands on that button;
 *   one undo brings the same blank back.
 * - The popup fits whole on an upright iPhone 14 and Pixel 7 and on a phone held sideways (a real iPhone
 *   at 844 x 340, the page Safari leaves, and a Pixel 7 on its side), with both buttons at least 44 dots
 *   tall on a finger, and Remove Blank still removes the blank there.
 *
 * The sentence and the four labels are written out literally: specs import from lib/, never from
 * components/. `dismissChrome` and the sideways device constants follow `rocker-live-controls.spec.ts`,
 * except that the sideways iPhone is built at 844 x 340.
 */

const SENTENCE =
  "Removing it keeps the rocker and foil at the five stations and re-draws the curve through them, for you to set by hand.";

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissChrome(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

// A real iPhone held sideways, as Safari leaves the page: 844 x 340 (the emulator's own 750 is not real).
const {
  defaultBrowserType: iphoneLandscapeBrowserType,
  viewport: iphoneLandscapeEmulatorViewport,
  ...iphoneLandscapeRest
} = devices["iPhone 14 landscape"];
void iphoneLandscapeBrowserType;
void iphoneLandscapeEmulatorViewport;
const sidewaysIphone = { ...iphoneLandscapeRest, viewport: { width: 844, height: 340 } };

const { defaultBrowserType: pixel7LandscapeBrowserType, ...pixel7Landscape } = devices["Pixel 7 landscape"];
void pixel7LandscapeBrowserType;

/** The Remove This Blank link in the sidebar. */
function removeLink(page: Page): Locator {
  return page.getByRole("button", { name: "Remove This Blank", exact: true });
}

/** Opens the confirm popup from the link and waits for it. */
async function openRemoveDialog(page: Page): Promise<Locator> {
  const dialog = removeBlankDialog(page);
  await removeLink(page).click();
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("Remove This Blank on a computer asks first (quick 261018-ejc)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's own layout; the phones have their own describes");
    await dismissChrome(page);
  });

  test("the sentence is in the popup, not the sidebar; Cancel and Esc keep the blank and return focus to the link", async ({
    page,
  }) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);

    // The sentence no longer sits in the sidebar.
    await expect(page.locator("aside").getByText(SENTENCE)).toHaveCount(0);

    const dialog = await openRemoveDialog(page);
    await expect(dialog.getByText("Remove this blank?", { exact: true })).toBeVisible();
    await expect(dialog.getByText(SENTENCE, { exact: true })).toBeVisible();
    await expect(dialog.getByRole("button")).toHaveCount(2);
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Remove Blank", exact: true })).toBeVisible();

    // Cancel is the first button, so it takes the focus: an Enter never removes by accident.
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();

    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(name);
    await expect(removeLink(page)).toBeFocused();

    // Esc does the same.
    await openRemoveDialog(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(name);
    await expect(removeLink(page)).toBeFocused();
  });

  test("Remove Blank removes it, focus lands on Pick a Blank, and one undo brings the same blank back", async ({
    page,
  }) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);

    const dialog = await openRemoveDialog(page);
    await dialog.getByRole("button", { name: "Remove Blank", exact: true }).click();
    await expect(dialog).toBeHidden();

    await expect(pickedCard(page)).toHaveCount(0);
    await expect(blankButton(page)).toContainText("Pick a Blank");
    await expect(page.getByText("Hand-set until you pick a blank").first()).toBeVisible();
    await expect(blankButton(page)).toBeFocused();

    await page.keyboard.press("ControlOrMeta+z");
    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(name);
  });
});

/** The popup on a phone: whole inside the window, both buttons 44 tall, and Remove Blank removes. */
async function expectPhonePopup(page: Page) {
  await openRocker(page);
  await pickFirstFittingBlank(page);
  const dialog = await openRemoveDialog(page);

  // The popup zooms in (95% to 100%) as it opens, so a button measured mid-animation reads a little
  // short: wait until it has settled at a finger's size before measuring anything.
  await expect
    .poll(async () => (await dialog.getByRole("button", { name: "Remove Blank", exact: true }).boundingBox())?.height ?? 0)
    .toBeGreaterThanOrEqual(44);

  const view = page.viewportSize();
  if (!view) throw new Error("no viewport");
  const box = await dialog.boundingBox();
  if (!box) throw new Error("the popup has no box");
  expect(box.x).toBeGreaterThanOrEqual(-0.5);
  expect(box.y).toBeGreaterThanOrEqual(-0.5);
  expect(box.x + box.width).toBeLessThanOrEqual(view.width + 0.5);
  expect(box.y + box.height).toBeLessThanOrEqual(view.height + 0.5);

  for (const label of ["Cancel", "Remove Blank"]) {
    const button = dialog.getByRole("button", { name: label, exact: true });
    const b = await button.boundingBox();
    if (!b) throw new Error(`${label} has no box`);
    expect(b.height).toBeGreaterThanOrEqual(44);
    expect(b.x).toBeGreaterThanOrEqual(box.x - 0.5);
    expect(b.y).toBeGreaterThanOrEqual(box.y - 0.5);
    expect(b.x + b.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    expect(b.y + b.height).toBeLessThanOrEqual(box.y + box.height + 0.5);
  }

  await dialog.getByRole("button", { name: "Remove Blank", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(pickedCard(page)).toHaveCount(0);
  await expect(blankButton(page)).toContainText("Pick a Blank");
}

test.describe("Remove This Blank on an upright phone (quick 261018-ejc)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' own layout");
    await dismissChrome(page);
  });

  test("the popup fits whole, both buttons are 44 dots tall, and Remove Blank removes the blank", async ({ page }) => {
    test.slow();
    await expectPhonePopup(page);
  });
});

test.describe("Remove This Blank on a phone held sideways — iPhone (quick 261018-ejc)", () => {
  test.use({ ...sidewaysIphone });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "this describe supplies its own device (a sideways iPhone)");
    await dismissChrome(page);
  });

  test("the popup fits whole, both buttons are 44 dots tall, and Remove Blank removes the blank", async ({ page }) => {
    test.slow();
    await expectPhonePopup(page);
  });
});

test.describe("Remove This Blank on a phone held sideways — Pixel 7 (quick 261018-ejc)", () => {
  test.use({ ...pixel7Landscape });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "this describe supplies its own device (Pixel 7 landscape)");
    await dismissChrome(page);
  });

  test("the popup fits whole, both buttons are 44 dots tall, and Remove Blank removes the blank", async ({ page }) => {
    test.slow();
    await expectPhonePopup(page);
  });
});
