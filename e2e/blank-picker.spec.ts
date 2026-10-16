import { devices, expect, test, type Page } from "@playwright/test";
import {
  blankButton,
  blankCards,
  blankPicker,
  cardButton,
  firstFittingCard,
  openBlankPicker,
  openRocker,
  pickedCard,
  pickFirstFittingBlank,
} from "./helpers/blank-picker";
import { openAppSettings } from "./helpers/settings";

/**
 * ROCKER's PICK A BLANK popup (quick 261015-ve9, sketch 015 B — the founder's pick, 2026-10-15): the
 * BLANK section is one button, it opens a popup of drawn blank cards at the right size on each
 * device, closing it changes nothing, a blank too thin at the center shows greyed with the fit
 * flag's own sentence, and picking a card puts the blank on the board.
 *
 * Never types a catalogue name or count: every name and number is read off the page. The suite has
 * no database — `playwright.config.ts` sets `SHAPER_BLANKS_SOURCE=seed-csv`.
 */

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

// The real sideways iPhone (844 × 390, measured on hardware) and Pixel 7, built the way
// `rocker-live-controls.spec.ts` builds them.
const {
  defaultBrowserType: iphoneLandscapeBrowserType,
  viewport: iphoneLandscapeEmulatorViewport,
  ...iphoneLandscapeRest
} = devices["iPhone 14 landscape"];
void iphoneLandscapeBrowserType;
void iphoneLandscapeEmulatorViewport;
const realSidewaysIphone = { ...iphoneLandscapeRest, viewport: { width: 844, height: 390 } };

const { defaultBrowserType: pixel7LandscapeBrowserType, ...pixel7Landscape } = devices["Pixel 7 landscape"];
void pixel7LandscapeBrowserType;

/** The popup's box once its opening animation has finished. */
async function settledBox(page: Page) {
  const popup = page.locator("[data-blank-picker]");
  await popup.evaluate(async (el) => {
    await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
  });
  const box = await popup.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

/** The popup fills the whole viewport (an upright phone, a phone held sideways). */
async function expectFullScreen(page: Page) {
  await openRocker(page);
  await openBlankPicker(page);
  const box = await settledBox(page);
  const viewport = page.viewportSize()!;
  expect(Math.abs(box.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.width - viewport.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.height - viewport.height)).toBeLessThanOrEqual(1);
}

test.describe("PICK A BLANK on a computer", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's own window");
    await dismissChrome(page);
  });

  test("the BLANK button reads Pick a Blank and its counts; the popup fills the window 32 px in, cards drawn", async ({ page }) => {
    await openRocker(page);
    const button = blankButton(page);
    await expect(button).toContainText("Pick a Blank");
    await expect(button.locator("[data-blank-button-line]")).toHaveText(/^\d+ blanks? long enough for this board, \d+ fits?$/);

    const dialog = await openBlankPicker(page);
    const box = await settledBox(page);
    const viewport = page.viewportSize()!;
    expect(Math.abs(box.y - 32)).toBeLessThanOrEqual(1);
    expect(Math.abs(viewport.height - (box.y + box.height) - 32)).toBeLessThanOrEqual(1);
    expect(box.width).toBeLessThanOrEqual(1180 + 1);
    expect(Math.abs(box.x - (viewport.width - (box.x + box.width)))).toBeLessThanOrEqual(1);

    await expect(dialog.locator("[data-slot='dialog-description']")).toHaveText(/^for your .+ board · \d+ of \d+ blanks · \d+ fit$/);

    // FITS THIS BOARD comes before WON'T FIT THIS BOARD.
    const headings = await dialog.locator("section > h3").allInnerTexts();
    const fitsAt = headings.findIndex((h) => /^FITS THIS BOARD · \d+$/i.test(h.trim()));
    const wontAt = headings.findIndex((h) => /^WON'T FIT THIS BOARD · \d+$/i.test(h.trim()));
    expect(fitsAt).toBeGreaterThanOrEqual(0);
    expect(wontAt).toBeGreaterThan(fitsAt);

    const card = firstFittingCard(page);
    await expect(card.locator("[data-station-table] th[scope='col']")).toHaveCount(5);
    // The outline and the side view, each one closed path, and the board dashed on the blank.
    const closed = await card.locator("svg path").evaluateAll((paths) =>
      paths.filter((p) => !p.hasAttribute("data-board-ghost") && /Z\s*$/.test(p.getAttribute("d") ?? "")).length,
    );
    expect(closed).toBe(2);
    await expect(card.locator("[data-board-ghost]")).toHaveCount(1);
  });

  for (const how of ["the ✕", "Escape", "a click outside"] as const) {
    test(`${how} closes the popup and leaves the board without a blank`, async ({ page }) => {
      await openRocker(page);
      const dialog = await openBlankPicker(page);
      if (how === "the ✕") await dialog.getByRole("button", { name: "Close" }).click();
      else if (how === "Escape") await page.keyboard.press("Escape");
      else await page.mouse.click(10, 10);
      await expect(blankPicker(page)).toBeHidden();
      await expect(blankButton(page)).toContainText("Pick a Blank");
      await expect(pickedCard(page)).toHaveCount(0);
    });
  }

  test("a blank too thin at the center shows greyed with the fit flag's sentence, and picking it puts it on the board", async ({ page }) => {
    await openRocker(page);
    const dialog = await openBlankPicker(page);
    const thin = blankCards(dialog, "wontFit").filter({
      has: page.locator("[data-blank-reason]", { hasText: "too thin at the center" }),
    });
    await expect(thin.first()).toBeVisible();
    const card = thin.first();
    const sentence = (await card.locator("[data-blank-reason]").innerText()).trim();
    expect(sentence).toMatch(/^It's .+ too thin at the center — there isn't room for your .+\.$/);
    const name = (await card.locator("[data-blank-name]").innerText()).trim();
    await expect(cardButton(card)).toHaveAttribute("aria-label", new RegExp(`doesn't fit: ${sentence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await cardButton(card).click();
    await expect(blankPicker(page)).toBeHidden();
    await expect(pickedCard(page)).toContainText(name);
    await expect(page.locator("[data-blank-flag]")).toContainText(sentence);
  });

  test("Metric: a card's figures read in centimetres and its table's widths in cm", async ({ page }) => {
    await openRocker(page);
    const settings = await openAppSettings(page);
    await settings.getByRole("group", { name: "Units" }).getByRole("button", { name: /^Metric/ }).click();
    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();
    await openBlankPicker(page);
    const card = firstFittingCard(page);
    await expect(card.locator("[data-blank-figures]")).toHaveText(/ cm( · \d+\.\d L)?$/);
    await expect(card.locator("[data-station-table]")).toContainText("Width (cm)");
    await expect(card.locator("[data-station-table]")).toContainText("N 30.5 cm");
  });
});

test.describe("PICK A BLANK — picking, on every device", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("picking a card closes the popup, the button shows the blank and Change Blank, and the card reads On your board now", async ({ page }) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);
    await expect(pickedCard(page)).toContainText(name);
    await expect(pickedCard(page)).toContainText(/Change Blank/i);
    const dialog = await openBlankPicker(page);
    const onBoard = blankCards(dialog).filter({ has: page.locator("[data-on-board]") });
    await expect(onBoard).toHaveCount(1);
    await expect(onBoard.locator("[data-blank-name]")).toHaveText(name);
  });
});

test.describe("PICK A BLANK on an upright phone", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone projects, at their own viewports");
    await dismissChrome(page);
  });

  test("fills the screen, one card per row", async ({ page }) => {
    await expectFullScreen(page);
    const cards = blankCards(blankPicker(page));
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(first && second).toBeTruthy();
    expect(Math.abs(first!.x - second!.x)).toBeLessThanOrEqual(1);
    expect(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
  });
});

test.describe("PICK A BLANK on a phone held sideways — iPhone", () => {
  test.use({ ...realSidewaysIphone });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "this describe supplies its own device (a real sideways iPhone)");
    await dismissChrome(page);
  });

  test("fills the screen", async ({ page }) => {
    await expectFullScreen(page);
  });
});

test.describe("PICK A BLANK on a phone held sideways — Pixel 7", () => {
  test.use({ ...pixel7Landscape });
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "this describe supplies its own device (Pixel 7 landscape)");
    await dismissChrome(page);
  });

  test("fills the screen", async ({ page }) => {
    await expectFullScreen(page);
  });
});
