import { expect, test, type Locator, type Page } from "@playwright/test";
import { goToScreen } from "./helpers/screens";

/**
 * Quick 261017-vdh, plan 03 — the VOLUME and FINS side panels as the founder drew them. Desktop only:
 * the wording and the order are the same on a phone, and the desktop pictures pin the look.
 *
 * VOLUME: the heading reads `Inputs`; ONE box, `Import Designed Board`, in place of the two old ones;
 * ticked (the default) one line says what was imported and the four hand controls are not on the page;
 * unticked they come back for the quick estimate, and one Undo ticks the box again.
 *
 * FINS: `Import Designed Board` with its line, the three replaced controls hidden while it is ticked,
 * ADVANCED running nose to tail (front fins, rear fins, centre fin, Reset), and MODEL INFO wearing the
 * side panel's own headings.
 *
 * Every helper is copied locally, as every spec in this suite does.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";
const UNITS_STORAGE_KEY = "shaper-units";

async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

async function setMetricUnits(page: Page) {
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "metric");
  }, UNITS_STORAGE_KEY);
}

/** The `Import Designed Board` box, once React owns it (a tap on the server-rendered markup reaches
 * nothing). */
async function importBox(page: Page): Promise<Locator> {
  const box = page.getByRole("checkbox", { name: "Import Designed Board" });
  await expect(box).toBeVisible();
  await expect
    .poll(() => box.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber"))))
    .toBe(true);
  return box;
}

test.describe("VOLUME's Inputs — one Import Designed Board box", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only wording and structure proof");
    await dismissSignInBanner(page);
  });

  test("Inputs, one box ticked by default, the imported line, and none of the four hand controls", async ({
    page,
  }) => {
    await page.goto("/design/volume");
    const aside = page.locator("aside");

    await expect(aside.getByText("Inputs", { exact: true })).toBeVisible();
    await expect(aside.getByText("Primary Inputs")).toHaveCount(0);

    const box = await importBox(page);
    await expect(box).toHaveAttribute("aria-checked", "true");
    await expect(aside.getByRole("checkbox")).toHaveCount(1);
    await expect(aside.getByText(/Measure This Board/)).toHaveCount(0);
    await expect(aside.getByText(/Real Rail/)).toHaveCount(0);

    await expect(
      aside.getByText(`Board details are imported: 6'0" × 19" × 2 1/2", and the rail shapes from RAILS.`),
    ).toBeVisible();

    await expect(aside.getByText(/Board Length —/)).toHaveCount(0);
    await expect(aside.getByText(/Board Width —/)).toHaveCount(0);
    await expect(aside.getByText(/Center Thickness —/)).toHaveCount(0);
    await expect(aside.getByText("Board Type")).toHaveCount(0);
  });

  test("unticking brings the four controls back from this board's numbers; one Undo ticks it again", async ({
    page,
  }) => {
    await page.goto("/design/volume");
    const aside = page.locator("aside");
    const box = await importBox(page);

    await box.click();
    await expect(box).toHaveAttribute("aria-checked", "false");
    await expect(aside.getByText(/Board details are imported/)).toHaveCount(0);
    await expect(aside.getByText(`Board Length — 6'0"`)).toBeVisible();
    await expect(aside.getByText(`Board Width — 19"`)).toBeVisible();
    await expect(aside.getByText(`Center Thickness — 2 1/2"`)).toBeVisible();
    await expect(aside.getByText("Board Type")).toBeVisible();
    await expect(page.getByText("From the board-type factor tables (quick estimate).")).toBeVisible();

    // One tick, one undo step: a single Undo puts the box and the line back.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(box).toHaveAttribute("aria-checked", "true");
    await expect(
      aside.getByText(`Board details are imported: 6'0" × 19" × 2 1/2", and the rail shapes from RAILS.`),
    ).toBeVisible();
    await expect(aside.getByText(/Board Length —/)).toHaveCount(0);
  });

  test("Metric: the line carries its unit once, at the end", async ({ page }) => {
    await setMetricUnits(page);
    await page.goto("/design/volume");
    await importBox(page);
    await expect(
      page
        .locator("aside")
        .getByText("Board details are imported: 182.9 × 48.3 × 6.4 cm, and the rail shapes from RAILS."),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------------------------------
// FINS: `Import Designed Board` with its line, ADVANCED nose to tail, and MODEL INFO in the sidebar's
// own heading style.
// ---------------------------------------------------------------------------------------------------

/** Opens FINS' ADVANCED fold (a plain disclosure button), once React owns it. */
async function openAdvanced(page: Page) {
  const button = page.getByRole("button", { name: /^Advanced/ });
  await expect(button).toBeVisible();
  await expect
    .poll(() => button.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber"))))
    .toBe(true);
  await button.click();
  await expect(page.getByRole("button", { name: /Reset Advanced Settings/ })).toBeVisible();
}

/** A fin-setup button in the Fin Selection grid. */
async function pickFinSetup(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
}

async function topY(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("no bounding box");
  return box.y;
}

/** The computed top-border width of the block a heading sits in. */
function blockBorderTop(heading: Locator): Promise<string> {
  return heading.evaluate((el) => getComputedStyle(el.parentElement as HTMLElement).borderTopWidth);
}

test.describe("FINS' Inputs — Import Designed Board", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only wording and structure proof");
    await dismissSignInBanner(page);
  });

  test("Inputs, the box ticked by default, the imported line, and none of the three controls it replaces", async ({
    page,
  }) => {
    await page.goto("/design/fins");
    const aside = page.locator("aside");

    await expect(aside.getByText("Inputs", { exact: true })).toBeVisible();
    const box = await importBox(page);
    await expect(box).toHaveAttribute("aria-checked", "true");
    await expect(aside.getByText("Import Template Values")).toHaveCount(0);
    await expect(
      aside.getByText(`TEMPLATE details are imported: 6'0" · 14 3/4" tail @ 12" · Squash tail · 4" tail block`),
    ).toBeVisible();

    await expect(aside.getByText(/Board Length —/)).toHaveCount(0);
    await expect(aside.getByText(/Tail Width @/)).toHaveCount(0);
    await expect(aside.getByText(/Tail Shape —/)).toHaveCount(0);

    // Unticked: the line goes and FINS' own stored values show, as they always have.
    await box.click();
    await expect(box).toHaveAttribute("aria-checked", "false");
    await expect(aside.getByText(/TEMPLATE details are imported/)).toHaveCount(0);
    await expect(aside.getByText(`Board Length — 6'0"`)).toBeVisible();
    await expect(aside.getByText(`Tail Width @ 12" — 13"`)).toBeVisible();
    await expect(aside.getByText("Tail Shape — Squash")).toBeVisible();
  });

  test("Metric: every figure carries its own unit", async ({ page }) => {
    await setMetricUnits(page);
    await page.goto("/design/fins");
    await importBox(page);
    await expect(
      page
        .locator("aside")
        .getByText(
          "TEMPLATE details are imported: 182.9 cm · 37.4 cm tail @ 30.5 cm · Squash tail · 10.2 cm tail block",
        ),
    ).toBeVisible();
  });

  test("the tail block and depth follow the tail TEMPLATE picked — diamond, swallow, pin", async ({ page }) => {
    await page.goto("/design/outline");
    // Picked client-side and carried to FINS client-side: a page load would lose the board.
    await page.getByRole("button", { name: "diamond", exact: true }).click();
    await goToScreen(page, "FINS");
    await expect(page.locator("aside").getByText(/Diamond tail · 10" tail block · 3" deep$/)).toBeVisible();

    await goToScreen(page, "TEMPLATE");
    await page.getByRole("button", { name: "swallow", exact: true }).click();
    await goToScreen(page, "FINS");
    await expect(page.locator("aside").getByText(/Swallow tail · 8" tail block · 3" deep$/)).toBeVisible();

    await goToScreen(page, "TEMPLATE");
    await page.getByRole("button", { name: "pin", exact: true }).click();
    await goToScreen(page, "FINS");
    const line = page.locator("aside").getByText(/TEMPLATE details are imported/);
    await expect(line).toHaveText(/Pin tail$/);
    await expect(line).not.toContainText("tail block");
  });
});

test.describe("FINS' ADVANCED — nose to tail", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only order proof");
    await dismissSignInBanner(page);
  });

  test("Thruster: the front pair first (no rule above it), and Reset last", async ({ page }) => {
    await page.goto("/design/fins");
    await openAdvanced(page);
    const aside = page.locator("aside");
    const forward = aside.getByText("Forward Fins — Front Pair", { exact: true });
    await expect(forward).toBeVisible();
    expect(await blockBorderTop(forward)).toBe("0px");
    const reset = aside.getByRole("button", { name: /Reset Advanced Settings/ });
    expect(await topY(forward)).toBeLessThan(await topY(reset));
  });

  test("Quad: Forward, then Rear, then the 5th/Center fin, then Reset", async ({ page }) => {
    await page.goto("/design/fins");
    await pickFinSetup(page, "Quad");
    await page.getByRole("checkbox", { name: "Add 5th/Center fin" }).click();
    await openAdvanced(page);
    const aside = page.locator("aside");
    const forward = aside.getByText(/^Forward Fins — /);
    const rear = aside.getByText("Rear Fins — Rear Pair", { exact: true });
    const center = aside.getByText("5th/Center Fin", { exact: true });
    const reset = aside.getByRole("button", { name: /Reset Advanced Settings/ });
    await expect(forward).toBeVisible();
    await expect(rear).toBeVisible();
    await expect(center).toBeVisible();

    const ys = [await topY(forward), await topY(rear), await topY(center), await topY(reset)];
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    // Only the blocks after the first carry the rule.
    expect(await blockBorderTop(forward)).toBe("0px");
    expect(await blockBorderTop(rear)).toBe("1px");
    expect(await blockBorderTop(center)).toBe("1px");
  });

  test("Single Fin: only the Center block, with no rule above it", async ({ page }) => {
    await page.goto("/design/fins");
    await pickFinSetup(page, "Single Fin");
    await openAdvanced(page);
    const aside = page.locator("aside");
    await expect(aside.getByText(/^Forward Fins/)).toHaveCount(0);
    await expect(aside.getByText(/^Rear Fins/)).toHaveCount(0);
    const center = aside.getByText("Center Fin Box Position", { exact: true });
    await expect(center).toBeVisible();
    expect(await blockBorderTop(center)).toBe("0px");
  });
});

test.describe("FINS' MODEL INFO — the side panel's own headings", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only look proof");
    await dismissSignInBanner(page);
  });

  test("title at 18px, note with no heavy rule, ruled 12px block headings, bold model names", async ({ page }) => {
    await page.goto("/design/fins");
    const tab = page.getByRole("tab", { name: "MODEL INFO" });
    await expect(tab).toBeVisible();
    await expect
      .poll(() => tab.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber"))))
      .toBe(true);
    await tab.click();

    const title = page.getByText("Model Info", { exact: true });
    await expect(title).toBeVisible();
    expect(await title.evaluate((el) => getComputedStyle(el).fontSize)).toBe("18px");

    const note = page.getByText("Reference note on where each model's placement guidance comes from.");
    expect(await note.evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe("0px");
    expect(await note.evaluate((el) => getComputedStyle(el).fontSize)).toBe("14px");

    const heading = page.getByText("Convention", { exact: true });
    expect(await heading.evaluate((el) => getComputedStyle(el).fontSize)).toBe("12px");
    expect(await heading.evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe("1px");

    await expect(page.locator("strong", { hasText: "Modern/Upright" })).toBeVisible();
  });
});
