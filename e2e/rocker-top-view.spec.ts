import { devices, expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The browser proof for ROCKER's top view (quick 261006-qfm): the picked blank seen from above,
 * with the board's own outline on it.
 *
 * The founder's words. 2026-10-02: "I think I want to show a miniature version of the blank outline
 * (with 12" stations, center, and stringer line) on the rocker viewer page. Ideally, with the board
 * outline also shown (no station marks) so a user can see that part of the board visually too. On
 * small screens, the top preview can just be a new tab." 2026-10-06: "On a large desktop screen,
 * the mini blank/board image can be turned on/off by another button. ON smaller screens where
 * theres no room with the rocker/blank view, let's make a new viewer tab." And later that day: "The
 * blank/board top view does not need to be the same scale. It can be a mini display, it's really
 * just for reference only."
 *
 * What this proves, by the plan's decisions:
 * - D-01 / D-02: with a blank, the blank, its stringer and its three marks (T12, C, N12) and the
 *   board's outline; with none, the board's outline alone.
 * - D-03: on a computer, a mini display on its own plate over the VIEWER panel's top-left corner,
 *   clear of the toolbar, hidden and shown by a fourth toolbar button, turning with Rotate.
 * - D-04: on an upright phone, a phone held sideways, or a narrow or short window, a TOP VIEW tab
 *   instead, standing up or lying flat; a window crossing the line while TOP VIEW is open lands on
 *   VIEWER.
 *
 * Every describe title carries "261006-qfm". No blank name or catalogue number is typed here: the
 * tests pick "the first row under FITS THIS BOARD", exactly as `rocker-blanks.spec.ts` does.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const NO_BLANK_NAME = "The board's outline seen from above";
const SIDE_VIEW_NAME = "Side profile of the board, showing the rocker line and deck thickness";

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

/** A `SliderRow`'s slider, found by the start of its label line. */
function sliderUnder(page: Page, label: RegExp): Locator {
  return page.getByText(label).locator("xpath=..").getByRole("slider");
}

/** The mini display's plate. */
function inset(page: Page): Locator {
  return page.locator("[data-top-view-inset]");
}

/** The top view's parts inside a given scope. */
function topViewParts(scope: Page | Locator) {
  return {
    board: scope.locator("[data-top-view-board]"),
    blank: scope.locator("[data-top-view-blank]"),
    stringer: scope.locator("[data-top-view-stringer]"),
    marks: scope.locator("[data-top-view-mark]"),
  };
}

function topViewButton(page: Page): Locator {
  return page.getByRole("button", { name: /the blank from above$/ });
}

function topViewTab(page: Page): Locator {
  return page.getByRole("tab", { name: "TOP VIEW" });
}

function viewerTab(page: Page): Locator {
  return page.getByRole("tab", { name: "VIEWER" });
}

/** The VIEWER content box both corner layers (the toolbar and the mini display) sit in. */
function viewerContent(page: Page): Locator {
  return page.locator("[data-viewer-toolbar]").locator("xpath=..");
}

/** The side view's own drawing, by the hook only it carries. */
function sideView(page: Page): Locator {
  return page.locator("svg:has([data-board-silhouette])");
}

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error("expected a bounding box");
  return b;
}

/**
 * A straight `<line>` is drawn: it is on the page with a real length on screen. Playwright reads a
 * perfectly horizontal or vertical line as hidden, because its bounding box has no height (or no
 * width) — the stringer and the three marks are exactly such lines — so "visible" for them means
 * attached, not `display: none` anywhere up the tree, and a long side of at least one dot.
 */
async function expectLineDrawn(line: Locator) {
  await expect(line).toHaveCount(1);
  await expect
    .poll(async () => {
      const b = await line.boundingBox();
      return b ? Math.max(b.width, b.height) : 0;
    })
    .toBeGreaterThanOrEqual(1);
}

async function expectThreeMarks(scope: Page | Locator) {
  const { marks } = topViewParts(scope);
  await expect(marks).toHaveCount(3);
  for (const label of ["T12", "C", "N12"]) {
    await expectLineDrawn(scope.locator(`[data-top-view-mark="${label}"]`));
  }
}

test.describe("ROCKER on a computer: a mini display of the blank from above (quick 261006-qfm)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the mini display is the computer's");
    await dismissChrome(page);
  });

  test("with no blank, the mini display is the board's outline alone, beside the unchanged side view", async ({
    page,
  }) => {
    await openRocker(page);
    await expect(inset(page)).toBeVisible();
    const parts = topViewParts(inset(page));
    await expect(parts.board).toBeVisible();
    await expect(parts.blank).toHaveCount(0);
    await expect(parts.stringer).toHaveCount(0);
    await expect(parts.marks).toHaveCount(0);
    await expect(topViewTab(page)).toHaveCount(0);
    const button = topViewButton(page);
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(button).toHaveAccessibleName("Hide the blank from above");
    await expect(page.getByRole("img", { name: NO_BLANK_NAME, exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: SIDE_VIEW_NAME, exact: true })).toBeVisible();
  });

  test("with a blank, it adds the blank, its stringer and three marks, in the top-left corner clear of the toolbar", async ({
    page,
  }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const parts = topViewParts(inset(page));
    await expect(parts.blank).toHaveCount(1);
    await expect(parts.blank).toBeVisible();
    await expectLineDrawn(parts.stringer);
    await expectThreeMarks(inset(page));
    await expect(inset(page).getByRole("img")).toHaveAccessibleName(
      /^The board's outline seen from above, on the .+ blank, with its stringer, centre mark and 12-inch marks$/,
    );

    const plate = await box(inset(page));
    const content = await box(viewerContent(page));
    const toolbar = await box(page.locator("[data-viewer-toolbar]"));
    expect(Math.abs(plate.x - content.x)).toBeLessThanOrEqual(16);
    expect(Math.abs(plate.y - content.y)).toBeLessThanOrEqual(16);
    expect(plate.width).toBeLessThanOrEqual(content.width * 0.43 + 2);
    expect(plate.width).toBeLessThanOrEqual(434);
    const intersects =
      plate.x < toolbar.x + toolbar.width &&
      toolbar.x < plate.x + plate.width &&
      plate.y < toolbar.y + toolbar.height &&
      toolbar.y < plate.y + plate.height;
    expect(intersects, "the mini display overlaps the toolbar").toBe(false);
  });

  test("the toolbar button hides it and brings it back", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const button = topViewButton(page);
    await button.click();
    await expect(button).toHaveAccessibleName("Show the blank from above");
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(inset(page)).toHaveCount(0);
    await button.click();
    await expect(button).toHaveAccessibleName("Hide the blank from above");
    await expect(inset(page)).toBeVisible();
    await expect(topViewParts(inset(page)).blank).toBeVisible();
  });

  test("the Placement slider moves the board on the blank, and the blank stays still", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    const parts = topViewParts(inset(page));
    const boardBefore = await parts.board.getAttribute("d");
    const blankBefore = await parts.blank.getAttribute("d");

    const placement = sliderUnder(page, /^Placement — /);
    await placement.focus();
    await placement.press("ArrowLeft");
    await placement.press("ArrowLeft");
    await expect(page.getByText(/^Placement — .+ toward nose$/)).toBeVisible();

    await expect(parts.board).not.toHaveAttribute("d", boardBefore ?? "");
    await expect(parts.blank).toHaveAttribute("d", blankBefore ?? "");
  });

  test("the measuring points dot the blank's printed widths, both sides", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    await page.getByRole("button", { name: "Show measuring points" }).click();
    const dots = page.locator("[data-top-view-inset] [data-top-view-points] circle");
    await expect(dots.first()).toBeVisible();
    const count = await dots.count();
    expect(count % 2).toBe(0);
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test("Rotate stands it up in the corner, at a real size", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    await page.getByRole("button", { name: "Rotate the board" }).click();
    await expect
      .poll(async () => {
        const b = await box(inset(page));
        return b.height > b.width;
      })
      .toBe(true);
    const plate = await box(inset(page));
    const content = await box(viewerContent(page));
    expect(plate.height).toBeLessThanOrEqual(content.height * 0.54 + 2);
    expect(plate.height).toBeLessThanOrEqual(542);
    // D-18's collapse check: the width comes from the height through aspect-ratio.
    expect(plate.width).toBeGreaterThanOrEqual(30);
    expect(plate.height).toBeGreaterThanOrEqual(100);
    expect(Math.abs(plate.x - content.x)).toBeLessThanOrEqual(16);
    expect(Math.abs(plate.y - content.y)).toBeLessThanOrEqual(16);
  });
});

test.describe("ROCKER in a window that is narrow or short: TOP VIEW is a tab (quick 261006-qfm)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "a mouse, so width and height alone decide");
    await dismissChrome(page);
  });

  async function expectTabNotCorner(page: Page) {
    await expect(topViewTab(page)).toBeVisible({ timeout: 30_000 });
    await expect(viewerTab(page)).toHaveAttribute("aria-selected", "true");
    await expect(sideView(page)).toBeVisible();
    await expect(inset(page)).toHaveCount(0);
    await expect(page.locator("[data-top-view-board]")).toHaveCount(0);
    await expect(topViewButton(page)).toBeHidden();
  }

  test("a short window (1280 × 480)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.goto("/design/rocker");
    await expectTabNotCorner(page);
  });

  test("a narrow window (810 × 1000)", async ({ page }) => {
    await page.setViewportSize({ width: 810, height: 1000 });
    await page.goto("/design/rocker");
    await expectTabNotCorner(page);
  });

  test("widening the window while TOP VIEW is open lands on VIEWER, with the corner drawing back", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 810, height: 1000 });
    await page.goto("/design/rocker");
    await expect(topViewTab(page)).toBeVisible({ timeout: 30_000 });
    await topViewTab(page).click();
    await expect(topViewTab(page)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("[data-top-view-board]")).toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(topViewTab(page)).toHaveCount(0);
    await expect(viewerTab(page)).toHaveAttribute("aria-selected", "true");
    await expect(inset(page)).toBeVisible();
  });
});

test.describe("ROCKER on an upright phone: VIEWER and a TOP VIEW tab (quick 261006-qfm)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone projects, at their own viewports");
    await dismissChrome(page);
  });

  test("VIEWER is the side view alone; TOP VIEW stands the board up, and adds the blank once one is picked", async ({
    page,
  }) => {
    await openRocker(page);
    await expect(topViewTab(page)).toBeVisible({ timeout: 30_000 });
    await expect(viewerTab(page)).toHaveAttribute("aria-selected", "true");
    await expect(sideView(page)).toBeVisible();
    await expect(inset(page)).toHaveCount(0);
    await expect(page.locator("[data-top-view-board]")).toHaveCount(0);
    await expect(topViewButton(page)).toBeHidden();

    await topViewTab(page).click();
    const parts = topViewParts(page);
    await expect(parts.board).toBeVisible();
    await expect(parts.blank).toHaveCount(0);
    await expect(page.getByRole("img", { name: NO_BLANK_NAME, exact: true })).toBeVisible();
    const drawing = await box(page.locator("[data-top-view]"));
    expect(drawing.height).toBeGreaterThan(drawing.width);

    await viewerTab(page).click();
    await expect(sideView(page)).toBeVisible();
    await pickFirstFittingBlank(page);
    await topViewTab(page).click();
    await expect(parts.blank).toBeVisible();
    await expectLineDrawn(parts.stringer);
    await expectThreeMarks(page);
  });
});

// The real sideways iPhone width (844 CSS px), built the way `phone-sideways-top-bar.spec.ts` does
// — Playwright's own `iPhone 14 landscape` reports an emulator's 750 × 340, so its viewport is
// swapped for the 844 × 390 real hardware reported.
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

async function expectSidewaysTopView(page: Page) {
  await page.goto("/design/rocker");
  await expect(topViewTab(page)).toBeVisible({ timeout: 30_000 });
  await expect(topViewButton(page)).toBeHidden();
  await expect(sideView(page)).toBeVisible();
  await expect(inset(page)).toHaveCount(0);
  await topViewTab(page).click();
  await expect(page.locator("[data-top-view-board]")).toBeVisible();
  const drawing = await box(page.locator("[data-top-view]"));
  expect(drawing.width).toBeGreaterThan(drawing.height);
}

test.describe("ROCKER on a phone held sideways: TOP VIEW lies flat (quick 261006-qfm) — iPhone", () => {
  test.use({ ...realSidewaysIphone });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "this describe supplies its own device (a real sideways iPhone)");
    await dismissChrome(page);
  });

  test("the TOP VIEW tab is there, with no corner drawing and no button; the board lies flat", async ({ page }) => {
    await expectSidewaysTopView(page);
  });
});

test.describe("ROCKER on a phone held sideways: TOP VIEW lies flat (quick 261006-qfm) — Pixel 7", () => {
  test.use({ ...pixel7Landscape });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "android", "this describe supplies its own device (Pixel 7 landscape)");
    await dismissChrome(page);
  });

  test("the TOP VIEW tab is there, with no corner drawing and no button; the board lies flat", async ({ page }) => {
    await expectSidewaysTopView(page);
  });
});

test.describe("ROCKER on a tall touch screen held upright: the mini display stands up (quick 261006-qfm)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "WebKit with a coarse pointer, at an iPad Air's upright size");
    await dismissChrome(page);
  });

  test("an 820 × 1180 touch screen gets the corner drawing, standing up at a real size, and no TOP VIEW tab", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/design/rocker");
    await expect(inset(page)).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(async () => {
        const b = await box(inset(page));
        return b.height > b.width;
      })
      .toBe(true);
    const plate = await box(inset(page));
    // D-18's collapse check in WebKit.
    expect(plate.width).toBeGreaterThanOrEqual(30);
    expect(plate.height).toBeGreaterThanOrEqual(100);
    await expect(topViewTab(page)).toHaveCount(0);
    await expect(topViewButton(page)).toBeVisible();
  });
});
