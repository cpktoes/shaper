import { devices, expect, test, type Locator, type Page } from "@playwright/test";
import {
  blankButton,
  blankCards,
  blankPicker,
  cardButton,
  cardNumbers,
  chip,
  closeBlankPicker,
  firstFittingCard,
  makerChip,
  openBlankPicker,
  openRocker,
  pickedCard,
  pickFirstFittingBlank,
  starButton,
  waitForBlankButton,
} from "./helpers/blank-picker";
import { appSettingsDialog, openAppSettings } from "./helpers/settings";

/**
 * ROCKER's PICK A BLANK popup (quick 261015-ve9, sketch 015 B — the founder's pick, 2026-10-15): the
 * BLANK section is one button, it opens a popup of drawn blank cards at the right size on each
 * device, closing it changes nothing, a blank too thin at the center shows greyed with the fit
 * flag's own sentence, and picking a card puts the blank on the board.
 *
 * Plan 02 adds the filter bar's proofs: stars kept in the browser and the ★ STARRED group, a tampered
 * star list opening cleanly, the maker chips being Settings → Blank Makers, the length and nose-rocker
 * ranges, Starred only, the four sorts, Flat / Upright and Show my board remembered across a reload,
 * the bar's shape on an upright phone and on a phone held sideways (with the one-line card there),
 * and Metric range chips.
 *
 * Never types a catalogue name or count: every name and number is read off the page. The suite has
 * no database — `playwright.config.ts` sets `SHAPER_BLANKS_SOURCE=seed-csv`.
 */

const STARRED_BLANKS_KEY = "shaper-starred-blanks";
const PICKER_VIEW_KEY = "shaper-blank-picker-view";

/** The number at the end of a group heading, e.g. `FITS THIS BOARD · 194` → 194. */
async function groupCount(dialog: Locator, heading: RegExp): Promise<number> {
  const text = (await dialog.locator("section > h3").filter({ hasText: heading }).innerText()).trim();
  return Number(text.split("·").pop());
}

/** Never decreasing, number by number. */
function expectNonDecreasing(values: number[], what: string) {
  for (let i = 1; i < values.length; i++) {
    expect(values[i], `${what} at card ${i}`).toBeGreaterThanOrEqual(values[i - 1] - 1e-9);
  }
}

/** Reloads ROCKER and reopens the popup. */
async function reloadAndReopen(page: Page): Promise<Locator> {
  await page.reload();
  await waitForBlankButton(page);
  return openBlankPicker(page);
}

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

  test("the filter bar is one sideways row, and a flat card trades its table for one line", async ({ page }) => {
    await expectSidewaysBar(page);
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

  test("the filter bar is one sideways row, and a flat card trades its table for one line", async ({ page }) => {
    await expectSidewaysBar(page);
  });
});

/**
 * A phone held sideways (D-01, D-11): the search and the Sort sit on one row, the first flat card
 * shows its one line `{center} center · {nose rocker} nose` instead of the table, and the header's
 * board line still shows.
 */
async function expectSidewaysBar(page: Page) {
  await openRocker(page);
  const dialog = await openBlankPicker(page);
  const search = await dialog.getByRole("searchbox", { name: "Search blanks" }).boundingBox();
  const sort = await dialog.getByRole("combobox", { name: "Sort" }).boundingBox();
  expect(search && sort).toBeTruthy();
  expect(Math.abs(search!.y - sort!.y)).toBeLessThanOrEqual(8);
  const card = firstFittingCard(page);
  await expect(card).toHaveAttribute("data-drawn", "flat");
  await expect(card.locator("[data-station-table]")).toBeHidden();
  await expect(card.locator("[data-compact-line]")).toBeVisible();
  await expect(card.locator("[data-compact-line]")).toHaveText(/ center · .+ nose$/);
  await expect(dialog.locator("[data-slot='dialog-description']")).toBeVisible();
}

test.describe("PICK A BLANK — stars (D-06)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's window");
    await dismissChrome(page);
  });

  test("a star puts the blank first under ★ STARRED, survives a reload, Starred only shows it alone, and unstarring takes it back", async ({
    page,
  }) => {
    await openRocker(page);
    const dialog = await openBlankPicker(page);
    const fitsBefore = await groupCount(dialog, /^FITS THIS BOARD/);
    const first = firstFittingCard(page);
    const vendor = (await first.getAttribute("data-vendor"))!;
    const name = (await first.getAttribute("data-name"))!;
    const card = dialog.locator(`li[data-blank-card][data-vendor=${JSON.stringify(vendor)}][data-name=${JSON.stringify(name)}]`);

    await expect(starButton(card)).toHaveAttribute("aria-pressed", "false");
    await expect(starButton(card)).toHaveAttribute("aria-label", `Star ${vendor} ${name}`);
    await starButton(card).click();
    await expect(starButton(card)).toHaveAttribute("aria-pressed", "true");
    await expect(starButton(card)).toHaveAttribute("aria-label", `Unstar ${vendor} ${name}`);

    // ★ STARRED · 1 is the first group, holds it, and FITS THIS BOARD is one lower.
    await expect(dialog.locator("section > h3").first()).toHaveText(/^★ STARRED · 1$/i);
    await expect(blankCards(dialog, "starred")).toHaveCount(1);
    await expect(card).toHaveAttribute("data-group", "starred");
    expect(await groupCount(dialog, /^FITS THIS BOARD/)).toBe(fitsBefore - 1);
    // Starring never picks a blank.
    await expect(pickedCard(page)).toHaveCount(0);
    await expect(blankButton(page)).toContainText("Pick a Blank");
    const stored = await page.evaluate((key) => localStorage.getItem(key), STARRED_BLANKS_KEY);
    expect(JSON.parse(stored!)).toEqual([[vendor, name]]);

    // Kept across a reload.
    const again = await reloadAndReopen(page);
    await expect(blankCards(again, "starred")).toHaveCount(1);
    await expect(blankCards(again, "starred")).toHaveAttribute("data-name", name);

    // ★ Starred only shows that card alone.
    await chip(again, "Starred only").click();
    await expect(chip(again, "Starred only")).toHaveAttribute("aria-pressed", "true");
    await expect(blankCards(again)).toHaveCount(1);
    await chip(again, "Starred only").click();
    await expect(blankCards(again, "fits").first()).toBeVisible();

    // Unstar: the group is gone.
    await starButton(blankCards(again, "starred")).click();
    await expect(again.locator('ul[data-blank-group="starred"]')).toHaveCount(0);
    expect(await groupCount(again, /^FITS THIS BOARD/)).toBe(fitsBefore);
  });

  test("a stored star list a stray script tampered with opens cleanly, with no STARRED group and no page error", async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (error) => errors.push(error));
    // First load: an object, not a list. Second load: a list whose only name is far too long.
    await page.addInitScript(
      ({ key, values }) => {
        const step = Number(sessionStorage.getItem("tamper-step") ?? "0");
        localStorage.setItem(key, values[Math.min(step, values.length - 1)]);
        sessionStorage.setItem("tamper-step", String(step + 1));
      },
      { key: STARRED_BLANKS_KEY, values: ['{"x":1}', JSON.stringify([["US Blanks", "x".repeat(300)]])] },
    );
    await openRocker(page);
    let dialog = await openBlankPicker(page);
    await expect(dialog.locator('ul[data-blank-group="starred"]')).toHaveCount(0);
    await closeBlankPicker(page);
    dialog = await reloadAndReopen(page);
    await expect(dialog.locator('ul[data-blank-group="starred"]')).toHaveCount(0);
    await expect(blankCards(dialog, "fits").first()).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("PICK A BLANK — the filter bar on a computer (D-07, D-12)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's window");
    await dismissChrome(page);
  });

  test("the maker chips are Settings → Blank Makers, both ways, and the last maker ticked can't be unticked", async ({ page }) => {
    await openRocker(page);
    let dialog = await openBlankPicker(page);
    const makers = dialog.getByRole("group", { name: "Blank makers" });
    await expect(makers).toBeVisible();
    const arctic = makerChip(dialog, "Arctic Foam");
    await expect(arctic).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator('li[data-vendor="Arctic Foam"]').first()).toBeVisible();

    await arctic.click();
    await expect(arctic).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.locator('li[data-vendor="Arctic Foam"]')).toHaveCount(0);

    // Settings reads it unticked; ticking it there ticks the chip again.
    await closeBlankPicker(page);
    const settings = await openAppSettings(page);
    const settingsArctic = settings.getByRole("group", { name: "Blank Makers" }).getByRole("button", { name: "Arctic Foam" });
    await expect(settingsArctic).toHaveAttribute("aria-pressed", "false");
    await settingsArctic.click();
    await expect(settingsArctic).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("Escape");
    await expect(appSettingsDialog(page)).toBeHidden();
    dialog = await openBlankPicker(page);
    await expect(makerChip(dialog, "Arctic Foam")).toHaveAttribute("aria-pressed", "true");

    // Untick three: the fourth is the last one ticked, and clicking it changes nothing.
    const vendors = await dialog.locator("[data-maker-chip]").evaluateAll((els) => els.map((el) => el.getAttribute("data-maker-chip")!));
    expect(vendors).toHaveLength(4);
    for (const vendor of vendors.slice(0, 3)) {
      await makerChip(dialog, vendor).click();
      await expect(makerChip(dialog, vendor)).toHaveAttribute("aria-pressed", "false");
    }
    const last = makerChip(dialog, vendors[3]);
    await expect(last).toHaveAttribute("aria-disabled", "true");
    // Playwright won't click an aria-disabled button on its own; force it, to prove the tap does nothing.
    await last.click({ force: true });
    await expect(last).toHaveAttribute("aria-pressed", "true");
  });

  test("the Length and Nose rocker ranges narrow the cards, and Any length / Any nose rocker clear them", async ({ page }) => {
    await openRocker(page);
    const dialog = await openBlankPicker(page);
    const total = await blankCards(dialog).count();
    const lengths = (await cardNumbers(dialog, "data-length-mm")) as number[];
    const shortest = Math.min(...lengths);

    await chip(dialog, /^Length: any/).click();
    await dialog.getByRole("slider", { name: "Length from" }).focus();
    for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
    await expect(chip(dialog, /^Length: /)).not.toHaveText(/any/);
    const narrowed = (await cardNumbers(dialog, "data-length-mm")) as number[];
    expect(narrowed.length).toBeGreaterThan(0);
    expect(Math.min(...narrowed)).toBeGreaterThan(shortest);

    await dialog.getByRole("button", { name: "Any length" }).click();
    await expect(chip(dialog, /^Length: any/)).toBeVisible();
    await expect(blankCards(dialog)).toHaveCount(total);

    const rockers = (await cardNumbers(dialog, "data-nose-rocker-mm")) as number[];
    const most = Math.max(...rockers);
    await chip(dialog, /^Nose rocker: any/).click();
    await dialog.getByRole("slider", { name: "Nose rocker to" }).focus();
    for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowLeft");
    await expect(chip(dialog, /^Nose rocker: /)).not.toHaveText(/any/);
    const lower = (await cardNumbers(dialog, "data-nose-rocker-mm")) as number[];
    expect(lower.length).toBeGreaterThan(0);
    expect(Math.max(...lower)).toBeLessThan(most);
    await dialog.getByRole("button", { name: "Any nose rocker" }).click();
    await expect(blankCards(dialog)).toHaveCount(total);
  });

  test("the sort orders the cards by nose rocker, center thickness or volume", async ({ page }) => {
    await openRocker(page);
    const dialog = await openBlankPicker(page);
    const sort = dialog.getByRole("combobox", { name: "Sort" });
    await expect(sort).toHaveValue("length");
    expectNonDecreasing((await cardNumbers(dialog, "data-length-mm", "fits")) as number[], "length");

    await sort.selectOption({ label: "Nose rocker" });
    expectNonDecreasing((await cardNumbers(dialog, "data-nose-rocker-mm", "fits")) as number[], "nose rocker");

    await sort.selectOption({ label: "Center thickness" });
    expectNonDecreasing((await cardNumbers(dialog, "data-center-mm", "fits")) as number[], "center thickness");

    await sort.selectOption({ label: "Volume" });
    const volumes = await cardNumbers(dialog, "data-volume-l", "fits");
    const firstWithout = volumes.indexOf(null);
    const withVolume = (firstWithout === -1 ? volumes : volumes.slice(0, firstWithout)) as number[];
    expect(withVolume.length).toBeGreaterThan(0);
    expectNonDecreasing(withVolume, "volume");
    if (firstWithout !== -1) expect(volumes.slice(firstWithout).every((v) => v === null)).toBe(true);
  });

  test("Upright stands every card up with its facts beside it, remembered across a reload; Flat brings the table back", async ({ page }) => {
    await openRocker(page);
    let dialog = await openBlankPicker(page);
    const drawn = dialog.getByRole("group", { name: "How blanks are drawn" });
    await expect(drawn.getByRole("button", { name: "Flat" })).toHaveAttribute("aria-pressed", "true");
    await drawn.getByRole("button", { name: "Upright" }).click();
    await expect(dialog.locator('li[data-blank-card][data-drawn="flat"]')).toHaveCount(0);
    const card = blankCards(dialog).first();
    await expect(card).toHaveAttribute("data-drawn", "upright");
    await expect(card.locator("[data-upright-facts]")).toContainText("Length");
    await expect(card.locator("[data-station-table]")).toHaveCount(0);
    const stored = await page.evaluate((key) => localStorage.getItem(key), PICKER_VIEW_KEY);
    expect(JSON.parse(stored!)).toEqual({ drawn: "upright", showBoard: true });

    dialog = await reloadAndReopen(page);
    await expect(blankCards(dialog).first()).toHaveAttribute("data-drawn", "upright");
    await dialog.getByRole("group", { name: "How blanks are drawn" }).getByRole("button", { name: "Flat" }).click();
    await expect(dialog.locator('li[data-blank-card][data-drawn="upright"]')).toHaveCount(0);
    await expect(firstFittingCard(page).locator("[data-station-table]")).toBeVisible();
  });

  test("Show my board hides and shows the board on every blank, remembered across a reload", async ({ page }) => {
    await openRocker(page);
    let dialog = await openBlankPicker(page);
    const toggle = chip(dialog, "Show my board");
    await expect(toggle).toHaveCount(1);
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator("[data-board-ghost]").first()).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.locator("[data-board-ghost]")).toHaveCount(0);

    dialog = await reloadAndReopen(page);
    await expect(dialog.locator("[data-board-ghost]")).toHaveCount(0);
    await chip(dialog, "Show my board").click();
    await expect(dialog.locator("[data-board-ghost]").first()).toBeVisible();
  });

  test("Metric: a set Length chip reads centimetres, a set Nose rocker chip millimetres", async ({ page }) => {
    await openRocker(page);
    const settings = await openAppSettings(page);
    await settings.getByRole("group", { name: "Units" }).getByRole("button", { name: /^Metric/ }).click();
    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();
    const dialog = await openBlankPicker(page);

    await chip(dialog, /^Length: any/).click();
    await dialog.getByRole("slider", { name: "Length from" }).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    await expect(chip(dialog, /^Length: /)).toHaveText(/^Length: \d+\.\d cm – \d+\.\d cm/);

    await chip(dialog, /^Nose rocker: any/).click();
    await dialog.getByRole("slider", { name: "Nose rocker from" }).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    await expect(chip(dialog, /^Nose rocker: /)).toHaveText(/^Nose rocker: \d+ mm – \d+ mm/);
  });
});

test.describe("PICK A BLANK — the filter bar on an upright phone (D-01)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone projects, at their own viewports");
    await dismissChrome(page);
  });

  test("Flat and Upright are two icons beside the search, over one sideways-scrolling chip row that holds Show my board", async ({
    page,
  }) => {
    await openRocker(page);
    const dialog = await openBlankPicker(page);
    const search = await dialog.getByRole("searchbox", { name: "Search blanks" }).boundingBox();
    for (const name of ["Flat", "Upright"]) {
      const button = dialog.getByRole("group", { name: "How blanks are drawn" }).getByRole("button", { name });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      // Beside the search, on its row — and an icon only, its word kept for a screen reader.
      expect(Math.abs(box!.y + box!.height / 2 - (search!.y + search!.height / 2))).toBeLessThanOrEqual(8);
      expect(box!.x).toBeGreaterThan(search!.x + search!.width - 1);
    }
    const show = chip(dialog, "Show my board");
    await expect(show).toHaveCount(1);
    await expect(show).toBeVisible();
    const row = dialog.locator("[data-blank-chip-row]");
    expect(await row.locator('[data-show-board]:visible').count()).toBe(1);
    expect(await row.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    const first = await blankCards(dialog).nth(0).boundingBox();
    const second = await blankCards(dialog).nth(1).boundingBox();
    expect(Math.abs(first!.x - second!.x)).toBeLessThanOrEqual(1);
  });
});
