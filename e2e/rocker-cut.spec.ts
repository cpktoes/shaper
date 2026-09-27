import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Phase 12's ROCKER cut, proven in real browsers (12-05; 12-08 extends it): with a blank picked,
 * BOARD ON BLANK shows the board's own Deck Skin, the foam off the bottom at every station and the
 * planer passes at the center, all live, with nothing sent to the server.
 *
 * The helpers below are copies of `e2e/rocker-blanks.spec.ts`'s own (`dismissChrome`, `blankList`,
 * `firstFittingRow`, `pickedCard`, `openRocker` with its hydration wait, `pickFirstFittingBlank`,
 * `sliderUnder`, `undoOnce`) — spec files do not import each other, the repo's existing per-spec
 * helper pattern. Like that spec, this one has no database: the list reads the committed catalogue
 * CSVs (`SHAPER_BLANKS_SOURCE=seed-csv`), and no blank name, depth or pass count is ever typed here —
 * each test reads a value off the page, moves a control, and checks the value changed.
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
  // once React hydrates that boundary. A keystroke or tap before then is lost, so wait until React
  // owns the first row and the search box.
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

/** The Deck Skin row's label line. */
function deckSkinLabel(page: Page): Locator {
  return page.getByText(/^Deck Skin — /);
}

test.describe("ROCKER — the board's Deck Skin, the foam off the bottom and the planer passes (Phase 12)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissChrome(page);
  });

  test("with a blank picked, BOARD ON BLANK shows Deck Skin, OFF BOTTOM and the planer passes, and a Deck Skin drag moves the center's foam off the bottom and the passes with no request", async ({
    page,
  }) => {
    await openRocker(page);
    await pickFirstFittingBlank(page);

    await expect(deckSkinLabel(page)).toBeVisible();
    const readouts = page.locator("[data-readouts]");
    await expect(readouts.getByText("OFF BOTTOM", { exact: true })).toBeVisible();
    await expect(readouts.locator("[data-readout-row]")).toHaveCount(5);
    const passesLine = page.locator("[data-bottom-passes]");
    await expect(passesLine).toBeVisible();
    await expect(passesLine).toContainText("Planer passes at the center");
    await expect(page.getByText(/ a pass — your Planer Max Depth\.$/)).toBeVisible();

    const skinBefore = await deckSkinLabel(page).innerText();
    const centerRow = readouts.locator('[data-readout-row="center"]');
    const centerBefore = await centerRow.innerText();
    const passesBefore = await passesLine.innerText();

    // R14: the skin is store state and the numbers come off the side profile the page already
    // holds — nothing goes to any server, this site's or anyone else's.
    let requests = 0;
    page.on("request", () => {
      requests += 1;
    });

    const skin = sliderUnder(page, /^Deck Skin — /);
    await skin.focus();
    await skin.press("ArrowRight");
    await skin.press("ArrowRight");

    await expect(deckSkinLabel(page)).not.toHaveText(skinBefore);
    await expect(centerRow).not.toHaveText(centerBefore);
    await expect(passesLine).not.toHaveText(passesBefore);
    await expect(readouts.locator("[data-readout-row]")).toHaveCount(5);
    // Never clears the pick.
    await expect(pickedCard(page)).toHaveCount(1);
    expect(requests).toBe(0);
  });
});
