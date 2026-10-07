import { devices, expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The browser proof that ROCKER's sidebar follows the tab in view (quick 261006-v20, 2026-10-06).
 *
 * The founder's words, 2026-10-06: "we also need to limit some controls. For all screens, when on the
 * datasheet tab, only make live the 3 thickness values you can edit. WHen on the top view tab, only make
 * the placement slider and blank picker live."
 *
 * What this proves, by the plan's decisions:
 * - D-01: on DATASHEET only Center Thickness (box and slider) and THICKNESS's Nose Tip and Tail Tip stay
 *   live; on TOP VIEW only the BLANK section and Placement; on VIEWER everything — on a computer, both
 *   upright phones and both phones held sideways. The rule follows the tab actually on screen: a window
 *   widened while TOP VIEW is open lands on VIEWER with every control live again.
 * - D-02: a control that is not live is dimmed and inert, never hidden — nothing moves when the tab
 *   changes, and neither the keyboard nor the mouse can move an inert slider.
 * - D-04 / D-01: the DATASHEET table's own typed cells keep working, and the sidebar's Center Thickness
 *   still changes the table's Center cell.
 * - D-12: with no blank, the sidebar's two hand-set 12" rows are dimmed on DATASHEET.
 *
 * A control is inert when `el.closest("[inert]")` is not null; every check runs both ways (a live control
 * has NO inert ancestor). Every control that may be inert is found by a CSS or text locator, never a role
 * query. `dismissChrome`, `blankList`, `firstFittingRow`, `pickedCard`, `openRocker`,
 * `pickFirstFittingBlank` and the two sideways device constants are copied from
 * `e2e/rocker-top-view.spec.ts` (quick 261006-qfm). Every describe title carries "261006-v20".
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

/** The list, once the streamed catalogue has arrived and been judged. */
function blankList(page: Page): Locator {
  return page.getByRole("list", { name: "Blanks" });
}

/** The first blank under FITS THIS BOARD. */
function firstFittingRow(page: Page): Locator {
  return blankList(page).locator('li[data-group="fits"] button').first();
}

/** The picked-blank card (state C). */
function pickedCard(page: Page): Locator {
  return page.locator("[data-picked-blank]");
}

async function openRocker(page: Page) {
  await page.goto("/design/rocker");
  await expect(blankList(page)).toBeVisible({ timeout: 30_000 });
  // The list streams in server-rendered and becomes live only once React hydrates it — a tap
  // before then is lost — so wait until React owns the first row and the search box.
  await page.waitForFunction(() => {
    const owned = (el: Element | null) => !!el && Object.keys(el).some((key) => key.startsWith("__reactFiber"));
    return (
      owned(document.querySelector('ul[aria-label="Blanks"] button')) &&
      owned(document.querySelector('input[aria-label="Search blanks"]'))
    );
  });
}

/** Picks the first fitting blank and returns its name as the page shows it. */
async function pickFirstFittingBlank(page: Page): Promise<string> {
  const row = firstFittingRow(page);
  const name = (await row.locator("[data-blank-name]").innerText()).trim();
  expect(name.length).toBeGreaterThan(0);
  await row.click();
  await expect(pickedCard(page)).toContainText(name);
  return name;
}

// The real sideways iPhone width (844 CSS px), built the way `rocker-top-view.spec.ts` does —
// Playwright's own `iPhone 14 landscape` reports an emulator's 750 × 340, so its viewport is swapped
// for the 844 × 390 real hardware reported.
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

/** The sidebar, in every layout (an upright phone stacks it under the drawing). */
function sidebar(page: Page): Locator {
  return page.locator("aside");
}

/** A `SliderRow`'s real range input, found by the start of its label line (as `thumbInputFor` in
 * `new-board.spec.ts`) — CSS, so it finds an inert slider too. */
function sliderInput(scope: Page | Locator, label: RegExp): Locator {
  return scope
    .getByText(label)
    .locator("xpath=..")
    .locator('[data-slot="slider-thumb"] input[type="range"]');
}

/** A sidebar section by its heading button (the name plus ▾ or ▸), as `new-board.spec.ts`'s
 * `thicknessSection` does. "Rocker & Foil" is a `div`, not a button, so it never matches. */
function sectionOf(page: Page, heading: RegExp): Locator {
  return page.locator("aside button").filter({ hasText: heading }).locator("xpath=..");
}

async function isInert(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => el.closest("[inert]") !== null);
}

async function expectInert(locator: Locator, what: string) {
  await expect.poll(() => isInert(locator), { message: `${what} should be dimmed and inert` }).toBe(true);
}

async function expectLive(locator: Locator, what: string) {
  await expect.poll(() => isInert(locator), { message: `${what} should be live` }).toBe(false);
}

function tab(page: Page, name: "VIEWER" | "DATASHEET" | "TOP VIEW"): Locator {
  return page.getByRole("tab", { name, exact: true });
}

function sidebarInertCount(page: Page): Locator {
  return page.locator("aside [inert]");
}

/** The sidebar's buttons by their words — CSS plus text, so an inert one is found too. */
function sidebarButton(page: Page, words: string): Locator {
  return page.locator("aside button").filter({ hasText: words });
}

const CENTER_BOX = 'aside input[aria-label="Center Thickness"]';
const CENTER_HEADING = /^Center Thickness\s*[▾▸]$/;
const ROCKER_HEADING = /^Rocker\s*[▾▸]$/;
const THICKNESS_HEADING = /^Thickness\s*[▾▸]$/;

async function twoFrames(page: Page) {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

test.describe("ROCKER on a computer: the sidebar follows the tab in view (quick 261006-v20)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's own layout; the phones have their own describes");
    await dismissChrome(page);
  });

  test("with a blank, DATASHEET leaves Center Thickness and the two tip thicknesses live; the table still takes typing", async ({
    page,
  }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const aside = sidebar(page);
    const tailTipLabel = aside.getByText(/^Tail Tip — /);
    const before = await tailTipLabel.boundingBox();
    expect(before).not.toBeNull();

    await tab(page, "DATASHEET").click();
    await expect(tab(page, "DATASHEET")).toHaveAttribute("aria-selected", "true");

    await expectInert(sliderInput(aside, /^Placement — /), "Placement");
    await expectInert(sliderInput(aside, /^Deck Skin — /), "Deck Skin");
    await expectInert(sidebarButton(page, "Change Blank"), "Change Blank");
    await expectInert(sidebarButton(page, "Remove This Blank"), "Remove This Blank");
    await expectInert(sidebarButton(page, "↺ Reset Fine-Tune"), "Reset Fine-Tune");
    await expectInert(page.locator('aside [aria-label="Tip Style"]'), "Tip Style");
    await expectInert(page.locator('aside [aria-label="Fine-tune off"]'), "Fine-tune off");
    await expectInert(sliderInput(aside, /^Nose Thinning Starts — /), "Nose Thinning Starts");

    await expectLive(page.locator(CENTER_BOX), "the Center Thickness box");
    await expectLive(
      sectionOf(page, CENTER_HEADING).locator('[data-slot="slider-thumb"] input[type="range"]'),
      "the Center Thickness slider",
    );
    await expectLive(sliderInput(aside, /^Nose Tip — /), "the Nose Tip slider");
    await expectLive(sliderInput(aside, /^Tail Tip — /), "the Tail Tip slider");
    await expectLive(page.locator("aside button").filter({ hasText: THICKNESS_HEADING }), "the THICKNESS heading");

    // D-02: dimmed, never hidden — nothing in the sidebar moves.
    const after = await tailTipLabel.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(0.5);

    // The sidebar's Center Thickness still changes the table's Center cell.
    const centerBox = page.locator(CENTER_BOX);
    await centerBox.click();
    await centerBox.fill("2 3/4");
    await centerBox.press("Enter");
    await expect(page.getByRole("textbox", { name: "Thickness — Center", exact: true })).toHaveValue('2 3/4"');

    // The table's own typed cells are untouched (D-01): the Tail Tip typed there shows in the sidebar.
    // 7/8" rather than the plan's 5/8", because 5/8" is the default board's own tail tip and would
    // prove nothing.
    await expect(aside.getByText('Tail Tip — 7/8"', { exact: true })).toHaveCount(0);
    const tailTipCell = page.getByRole("textbox", { name: "Thickness — Tail Tip", exact: true });
    await tailTipCell.click();
    await tailTipCell.fill("7/8");
    await tailTipCell.press("Enter");
    await expect(aside.getByText('Tail Tip — 7/8"', { exact: true })).toBeVisible();

    await tab(page, "VIEWER").click();
    await expect(sidebarInertCount(page)).toHaveCount(0);
  });

  test("on DATASHEET the keyboard and the mouse cannot move an inert slider; on VIEWER they can", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const aside = sidebar(page);
    const placementLabel = aside.getByText(/^Placement — /);
    const placement = sliderInput(aside, /^Placement — /);

    await tab(page, "DATASHEET").click();
    await expect(tab(page, "DATASHEET")).toHaveAttribute("aria-selected", "true");
    await expectInert(placement, "Placement");
    const labelBefore = (await placementLabel.innerText()).trim();

    // The keyboard: an inert input cannot take focus, so the arrows go nowhere.
    const focused = await placement.evaluate((el) => {
      (el as HTMLElement).focus();
      return document.activeElement === el;
    });
    expect(focused).toBe(false);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await twoFrames(page);
    await expect(placementLabel).toHaveText(labelBefore);

    // The mouse: a click a fifth of the way along the track moves nothing.
    const track = placementLabel.locator("xpath=..").locator('[data-slot="slider"]').first();
    const t = await track.boundingBox();
    expect(t).not.toBeNull();
    await page.mouse.click(t!.x + t!.width / 5, t!.y + t!.height / 2);
    await twoFrames(page);
    await expect(placementLabel).toHaveText(labelBefore);

    // On VIEWER the same keyboard path moves it — so the half above is not vacuous.
    await tab(page, "VIEWER").click();
    await expectLive(placement, "Placement");
    const focusedOnViewer = await placement.evaluate((el) => {
      (el as HTMLElement).focus();
      return document.activeElement === el;
    });
    expect(focusedOnViewer).toBe(true);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(placementLabel).toHaveText(/toward nose$/);
  });

  test("with no blank, DATASHEET dims the blank list, the hand-set rocker and the two 12-inch rows", async ({
    page,
  }) => {
    await openRocker(page);
    await tab(page, "DATASHEET").click();
    await expect(tab(page, "DATASHEET")).toHaveAttribute("aria-selected", "true");

    await expectInert(page.locator('aside input[aria-label="Search blanks"]'), "the blank search box");
    const rockerSliders = sectionOf(page, ROCKER_HEADING).locator('[data-slot="slider-thumb"] input[type="range"]');
    await expect(rockerSliders).toHaveCount(4);
    for (let i = 0; i < 4; i += 1) {
      await expectInert(rockerSliders.nth(i), `ROCKER lift ${i + 1}`);
    }

    const thickness = sectionOf(page, THICKNESS_HEADING);
    await expectLive(sliderInput(thickness, /^Nose Tip — /), "THICKNESS's Nose Tip");
    await expectLive(sliderInput(thickness, /^Tail Tip — /), "THICKNESS's Tail Tip");
    await expectInert(sliderInput(thickness, /^Nose @ /), "THICKNESS's hand-set Nose @ 12\"");
    await expectInert(sliderInput(thickness, /^Tail @ /), "THICKNESS's hand-set Tail @ 12\"");

    await tab(page, "VIEWER").click();
    await expect(sidebarInertCount(page)).toHaveCount(0);
  });

  test("a narrow window on TOP VIEW leaves the blank picker and Placement live; widening it lands on VIEWER with everything live", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 810, height: 1000 });
    await openRocker(page);
    await expect(tab(page, "TOP VIEW")).toBeVisible({ timeout: 30_000 });
    await pickFirstFittingBlank(page);
    await tab(page, "TOP VIEW").click();
    await expect(tab(page, "TOP VIEW")).toHaveAttribute("aria-selected", "true");
    const aside = sidebar(page);

    await expectLive(sidebarButton(page, "Change Blank"), "Change Blank");
    await expectLive(sliderInput(aside, /^Placement — /), "Placement");
    await expectInert(page.locator(CENTER_BOX), "the Center Thickness box");
    await expectInert(sliderInput(aside, /^Deck Skin — /), "Deck Skin");
    await expectInert(sliderInput(aside, /^Nose Tip — /), "the Nose Tip slider");

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(tab(page, "TOP VIEW")).toHaveCount(0);
    await expect(tab(page, "VIEWER")).toHaveAttribute("aria-selected", "true");
    await expect(sidebarInertCount(page)).toHaveCount(0);
  });
});

/** The rule on a phone: TOP VIEW leaves the blank picker and Placement; DATASHEET the reverse; VIEWER all. */
async function expectTabRule(page: Page) {
  await openRocker(page);
  // On a phone the tab strip settles only after hydration (see `phone-rails.spec.ts`'s note).
  await expect(tab(page, "TOP VIEW")).toBeVisible({ timeout: 30_000 });
  await pickFirstFittingBlank(page);
  const aside = sidebar(page);

  await tab(page, "TOP VIEW").click();
  await expect(tab(page, "TOP VIEW")).toHaveAttribute("aria-selected", "true");
  await expectLive(sliderInput(aside, /^Placement — /), "Placement");
  await expectLive(sidebarButton(page, "Change Blank"), "Change Blank");
  await expectLive(sidebarButton(page, "Remove This Blank"), "Remove This Blank");
  await expectInert(page.locator(CENTER_BOX), "the Center Thickness box");
  await expectInert(sliderInput(aside, /^Nose Tip — /), "the Nose Tip slider");
  await expectInert(sliderInput(aside, /^Deck Skin — /), "Deck Skin");
  await expectInert(page.locator('aside [aria-label="Tip Style"]'), "Tip Style");
  // Proof the blank picker really works on TOP VIEW: Change Blank opens the list, Keep This Blank closes it.
  await sidebarButton(page, "Change Blank").click();
  await expect(sidebarButton(page, "Keep This Blank")).toBeVisible();
  await sidebarButton(page, "Keep This Blank").click();
  await expect(sidebarButton(page, "Change Blank")).toBeVisible();

  await tab(page, "DATASHEET").click();
  await expect(tab(page, "DATASHEET")).toHaveAttribute("aria-selected", "true");
  await expectInert(sliderInput(aside, /^Placement — /), "Placement");
  await expectInert(sidebarButton(page, "Change Blank"), "Change Blank");
  await expectLive(page.locator(CENTER_BOX), "the Center Thickness box");
  await expectLive(sliderInput(aside, /^Nose Tip — /), "the Nose Tip slider");
  await expectLive(sliderInput(aside, /^Tail Tip — /), "the Tail Tip slider");

  await tab(page, "VIEWER").click();
  await expect(tab(page, "VIEWER")).toHaveAttribute("aria-selected", "true");
  await expect(sidebarInertCount(page)).toHaveCount(0);
}

test.describe("ROCKER on an upright phone: the sidebar follows the tab in view (quick 261006-v20)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone projects, at their own viewports");
    await dismissChrome(page);
  });

  test("TOP VIEW leaves the blank picker and Placement live, DATASHEET the three thicknesses, VIEWER everything", async ({
    page,
  }) => {
    await expectTabRule(page);
  });
});

test.describe("ROCKER on a phone held sideways: the sidebar follows the tab in view (quick 261006-v20) — iPhone", () => {
  test.use({ ...realSidewaysIphone });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "this describe supplies its own device (a real sideways iPhone)");
    await dismissChrome(page);
  });

  test("TOP VIEW leaves the blank picker and Placement live, DATASHEET the three thicknesses, VIEWER everything", async ({
    page,
  }) => {
    await expectTabRule(page);
  });
});

test.describe("ROCKER on a phone held sideways: the sidebar follows the tab in view (quick 261006-v20) — Pixel 7", () => {
  test.use({ ...pixel7Landscape });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "this describe supplies its own device (Pixel 7 landscape)");
    await dismissChrome(page);
  });

  test("TOP VIEW leaves the blank picker and Placement live, DATASHEET the three thicknesses, VIEWER everything", async ({
    page,
  }) => {
    await expectTabRule(page);
  });
});
