import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The finished ROCKER screen's browser proof (Phase 11, 11-11): pick a real blank from the list,
 * slide the board along it, read the numbers, keep a pick through a change that stops it fitting,
 * and go back to a hand-set rocker.
 *
 * This suite has no database: `playwright.config.ts` sets `SHAPER_BLANKS_SOURCE=seed-csv` for its
 * own dev server, so the list reads the committed catalogue CSVs through the same tested reader the
 * database seed uses (11-05). No expected blank name or catalogue number is ever typed here — the
 * tests pick "the first row under FITS THIS BOARD" and read its name off the page, and compare the
 * offer to the offer line's own text.
 *
 * The sign-in banner and the toolbar tip are dismissed before navigation, as in
 * `touch-sizing.spec.ts`, so neither shifts anything under a tap.
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
  // The list streams in server-rendered, inside its own Suspense boundary, and becomes live only
  // once React hydrates that boundary. A keystroke or tap before then is lost (WebKit showed it: a
  // search typed too early came back empty), so wait until React owns the first row and the box.
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

test.describe("ROCKER — a real blank from the list", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("tapping the first blank that fits puts the board in it on the drawing", async ({ page }) => {
    await openRocker(page);
    // Nothing behind the board until a blank is picked.
    await expect(page.locator("[data-blank-silhouette]")).toHaveCount(0);
    await pickFirstFittingBlank(page);
    await expect(page.locator("[data-blank-silhouette]")).toBeVisible();
  });

  test("the search narrows the list, says when nothing matches, and Clear Search brings it back", async ({ page }) => {
    await openRocker(page);
    const search = page.getByRole("searchbox", { name: "Search blanks" });

    await search.fill("Marko");
    const rows = blankList(page).locator("li[data-group] button");
    // Polled: the list is already on screen before the keystrokes land, so wait for the filter.
    await expect
      .poll(async () => {
        const labels = await rows.evaluateAll((buttons) => buttons.map((b) => b.getAttribute("aria-label") ?? ""));
        return labels.length > 0 && labels.every((label) => label.includes("Marko"));
      })
      .toBe(true);

    await search.fill("zzz");
    await expect(page.getByText('No blanks match "zzz".')).toBeVisible();
    await expect(blankList(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Clear Search" }).click();
    await expect(search).toHaveValue("");
    await expect(firstFittingRow(page)).toBeVisible();
  });

  test("a pick that stops fitting stays picked, with a flag and the closest blank that does fit", async ({ page }) => {
    await openRocker(page);
    const name = await pickFirstFittingBlank(page);
    await expect(page.locator("[data-blank-flag]")).toHaveCount(0);

    await raiseCenterThickness(page);

    const flag = page.locator("[data-blank-flag]");
    await expect(flag).toContainText("This blank doesn't fit your board");
    // Never cleared on its own (D-08): the same blank is still the board's blank.
    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(name);

    const offer = flag.locator("[data-blank-offer]");
    await expect(offer).toHaveText(/^Closest blank that fits: /);
    const offerText = await offer.innerText();

    await flag.getByRole("button", { name: "Switch to This Blank" }).click();
    const switchedTo = (await pickedCard(page).locator("[data-blank-name]").innerText()).trim();
    expect(switchedTo).not.toBe(name);
    expect(offerText).toContain(` ${switchedTo}, `);
    await expect(page.locator("[data-blank-flag]")).toHaveCount(0);

    await page.getByRole("button", { name: "Remove This Blank" }).click();
    await expect(page.getByText("Hand-set until you pick a blank").first()).toBeVisible();
    await expect(page.locator("[data-blank-silhouette]")).toHaveCount(0);
    await expect(pickedCard(page)).toHaveCount(0);
  });
});

/** The page's first control: the board's one centre thickness, typed. */
async function typeCenterThickness(page: Page, value: string) {
  const field = page.getByRole("textbox", { name: "Center Thickness" });
  await field.click();
  await field.fill(value);
  await field.press("Enter");
}

/**
 * Raises the board's one centre thickness from the default 2 1/2" to 3 1/2" — thicker than the
 * shortest fitting blank can carry with the default spare thickness, so that pick stops fitting.
 */
async function raiseCenterThickness(page: Page) {
  await typeCenterThickness(page, "3 1/2");
  await expect(page.getByRole("textbox", { name: "Center Thickness" })).toHaveValue('3 1/2"');
}

/** A `SliderRow`'s slider, found by the start of its label line. */
function sliderUnder(page: Page, label: RegExp): Locator {
  return page.getByText(label).locator("xpath=..").getByRole("slider");
}

test.describe("ROCKER — centre, placement, live numbers and the 12\" fine-tune", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("the placement slider waits for a blank, then slides the board toward the nose with no network request", async ({
    page,
  }) => {
    await openRocker(page);
    await expect(page.getByText("Placement — pick a blank first")).toBeVisible();
    await expect(page.locator("[data-readouts]")).toHaveCount(0);

    await pickFirstFittingBlank(page);
    await expect(page.getByText("Placement — centered")).toBeVisible();
    const readouts = page.locator("[data-readouts]");
    await expect(readouts.locator("[data-readout-row]")).toHaveCount(5);
    const noseTipBefore = await readouts.locator('[data-readout-row="noseTip"]').innerText();

    // R14: sliding the board samples the prepared fit in the browser — nothing goes to the server.
    const origin = new URL(page.url()).origin;
    let requests = 0;
    page.on("request", (request) => {
      if (request.url().startsWith(origin)) requests += 1;
    });

    const placement = sliderUnder(page, /^Placement — /);
    await placement.focus();
    await placement.press("ArrowLeft");
    await placement.press("ArrowLeft");
    await expect(page.getByText(/^Placement — .+ toward nose$/)).toBeVisible();
    await expect(readouts.locator('[data-readout-row="noseTip"]')).not.toHaveText(noseTipBefore);
    await expect(readouts.locator("[data-readout-row]")).toHaveCount(5);
    expect(requests).toBe(0);
  });

  test("a 12\" fine-tune reads From blank and Tweak, and Reset Fine-Tune brings back No tweak", async ({ page }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);
    // With a blank picked the hand-set ROCKER section steps aside (the rocker comes off the blank).
    await expect(page.getByRole("button", { name: /^Rocker\s*[▾▸]$/ })).toHaveCount(0);

    const nose12Row = page.getByText(/^Nose @ 12" — /).locator("xpath=..");
    await expect(nose12Row).toContainText("From blank ");
    await expect(nose12Row).toContainText("No tweak");
    const reset = page.getByRole("button", { name: "↺ Reset Fine-Tune" });
    await expect(reset).toHaveAttribute("aria-disabled", "true");

    await nose12Row.getByRole("slider").focus();
    await nose12Row.getByRole("slider").press("ArrowRight");
    await expect(nose12Row).toContainText('Tweak +1/16"');
    await expect(reset).not.toHaveAttribute("aria-disabled", "true");

    await reset.click();
    await expect(nose12Row).toContainText("No tweak");
    await expect(reset).toHaveAttribute("aria-disabled", "true");
  });

  test("Center Thickness is the board's one centre — RAILS reads the typed value", async ({ page }) => {
    await openRocker(page);
    await typeCenterThickness(page, "2 3/4");
    await expect(page.getByRole("textbox", { name: "Center Thickness" })).toHaveValue('2 3/4"');

    await page.getByRole("link", { name: "RAILS", exact: true }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/design\/rails/);
    await expect(page.getByText('Board Thickness — 2 3/4"')).toBeVisible();
  });
});
