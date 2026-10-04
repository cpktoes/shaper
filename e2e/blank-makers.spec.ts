import { expect, test, type Locator, type Page } from "@playwright/test";
import { BLANK_MAKERS_COOKIE_NAME, BLANK_MAKERS_STORAGE_KEY } from "../lib/blank-makers-preference";
import { KNOWN_BLANK_VENDORS, catalogsPhrase } from "../lib/blanks/vendors";
import { nothingFitsSentence } from "../lib/geometry/blank-reasons";
import { openAppSettings } from "./helpers/settings";

/**
 * Quick task 260926-wmf: the BLANK MAKERS tick toggles, proved in a real browser on all three
 * projects. Since quick 261003-uwi they are one row in App Default Settings — the pop-up the one
 * "App Default Settings" row opens from the desktop gear (`Settings`) or the phone top bar's single
 * `Menu` (e2e/helpers/settings.ts reaches it either way).
 *
 * This suite runs signed out on fake Clerk keys (Clerk never settles, so nothing sign-in-gated is
 * reachable), so what it proves is the browser path: a tick is remembered by the browser
 * (localStorage plus the cookie the server reads for the next first paint) and is back after a
 * reload. The account round trip is covered by the unit tests of the handoff and the Server
 * Action, and by a signed-in walk-through.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

/** The same dismissals as `fit-defaults.spec.ts`, set before navigation so neither strip ever
 * sits over the menu. */
async function dismissBannerAndTip(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Opens App Default Settings and returns its "Blank Makers" group. */
async function openBlankMakers(page: Page): Promise<Locator> {
  const dialog = await openAppSettings(page);
  const group = dialog.getByRole("group", { name: "Blank Makers" });
  await expect(group).toBeVisible();
  return group;
}

/** One maker's tick toggle, found by its visible name. */
function makerRow(group: Locator, vendor: string): Locator {
  return group.getByRole("button", { name: new RegExp(`^${vendor}`) });
}

/** The pop-up's Done button, from inside the makers group. */
function doneButton(page: Page): Locator {
  return page.getByRole("dialog", { name: "App Default Settings" }).getByRole("button", { name: "Done" });
}

async function blankMakersCookie(page: Page) {
  return (await page.context().cookies()).find((cookie) => cookie.name === BLANK_MAKERS_COOKIE_NAME);
}

test.describe("Blank Makers — the tick toggles in App Default Settings", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  test("all three makers are ticked for a shaper who never touched them", async ({ page }, testInfo) => {
    await page.goto("/design/outline");
    const group = await openBlankMakers(page);

    const rows = group.getByRole("button");
    await expect(rows).toHaveCount(KNOWN_BLANK_VENDORS.length);
    for (const [index, vendor] of KNOWN_BLANK_VENDORS.entries()) {
      const row = rows.nth(index);
      await expect(row).toHaveAccessibleName(new RegExp(`^${vendor}`));
      await expect(row).toHaveAttribute("aria-pressed", "true");
      await expect(row).not.toHaveAttribute("aria-disabled", "true");
    }

    // A default nobody chose is never written anywhere.
    expect(await blankMakersCookie(page)).toBeUndefined();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), BLANK_MAKERS_STORAGE_KEY)).toBeNull();

    // The whole pop-up fits the screen: past that it scrolls inside itself.
    const popup = page.getByRole("dialog", { name: "App Default Settings" });
    const box = await popup.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height + 0.5);

    // A finger-sized row on a phone.
    if (testInfo.project.name !== "desktop") {
      for (const vendor of KNOWN_BLANK_VENDORS) {
        const height = await makerRow(group, vendor).evaluate((el) => (el as HTMLElement).offsetHeight);
        expect(height, vendor).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("unticking a maker is remembered by the browser after a reload", async ({ page }) => {
    await page.goto("/design/outline");
    let group = await openBlankMakers(page);

    await makerRow(group, "Arctic Foam").click();
    await expect(makerRow(group, "Arctic Foam")).toHaveAttribute("aria-pressed", "false");
    // The pop-up stays open, so several makers can be changed in one visit.
    await expect(group).toBeVisible();

    const cookie = await blankMakersCookie(page);
    expect(cookie).toBeDefined();
    expect(JSON.parse(decodeURIComponent(cookie!.value))).toEqual(["Arctic Foam"]);

    await page.reload();
    group = await openBlankMakers(page);
    await expect(makerRow(group, "Arctic Foam")).toHaveAttribute("aria-pressed", "false");
    await expect(makerRow(group, "US Blanks")).toHaveAttribute("aria-pressed", "true");
    await expect(makerRow(group, "Marko Foam")).toHaveAttribute("aria-pressed", "true");

    // Done closes the pop-up.
    await doneButton(page).click();
    await expect(group).toBeHidden();
  });

  test("the last ticked maker cannot be unticked", async ({ page }) => {
    await page.goto("/design/outline");
    const group = await openBlankMakers(page);
    const hint = page.getByRole("dialog", { name: "App Default Settings" }).getByText("Keep at least one maker ticked");

    await makerRow(group, "Arctic Foam").click();
    await expect(makerRow(group, "Arctic Foam")).toHaveAttribute("aria-pressed", "false");
    await makerRow(group, "Marko Foam").click();
    await expect(makerRow(group, "Marko Foam")).toHaveAttribute("aria-pressed", "false");

    const usBlanks = makerRow(group, "US Blanks");
    await expect(usBlanks).toHaveAttribute("aria-disabled", "true");
    await expect(usBlanks).toHaveAttribute("aria-pressed", "true");
    // The hint is its own line under the row, and the locked maker's spoken description.
    await expect(hint).toBeVisible();
    await expect(usBlanks).toHaveAccessibleDescription("Keep at least one maker ticked");

    // Playwright waits on an aria-disabled element unless forced; the click itself must do nothing.
    await usBlanks.click({ force: true });
    await expect(usBlanks).toHaveAttribute("aria-pressed", "true");

    await makerRow(group, "Marko Foam").click();
    await expect(makerRow(group, "Marko Foam")).toHaveAttribute("aria-pressed", "true");
    await expect(usBlanks).not.toHaveAttribute("aria-disabled", "true");
    await expect(hint).toHaveCount(0);
  });
});

/* -- the ROCKER list (copied from e2e/rocker-blanks.spec.ts, its hydration wait included) --- */

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

/** The page's first control: the board's one centre thickness, typed. */
async function typeCenterThickness(page: Page, value: string) {
  const field = page.getByRole("textbox", { name: "Center Thickness" });
  await field.click();
  await field.fill(value);
  await field.press("Enter");
}

/** Opens App Default Settings, unticks one maker, and closes it with Done before the list is touched. */
async function untickMaker(page: Page, vendor: string) {
  const group = await openBlankMakers(page);
  const row = makerRow(group, vendor);
  await row.click();
  await expect(row).toHaveAttribute("aria-pressed", "false");
  await doneButton(page).click();
  await expect(group).toBeHidden();
}

/** Shows every row ("Show all N blanks", when the list is still showing its first few) and reads
 * each row's accessible name. */
async function allRowLabels(page: Page): Promise<string[]> {
  const showAll = page.getByRole("button", { name: /^Show all \d+ blanks$/ });
  if (await showAll.isVisible()) await showAll.click();
  await expect(page.getByRole("button", { name: "Show Fewer" })).toBeVisible();
  return blankList(page)
    .locator("li[data-group] button")
    .evaluateAll((buttons) => buttons.map((b) => b.getAttribute("aria-label") ?? ""));
}

test.describe("Blank Makers — the ROCKER blank list", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  test("unticking a maker leaves its blanks out of the ROCKER list and says so", async ({ page }) => {
    await openRocker(page);
    const note = page.locator("[data-blank-makers-note]");
    await expect(note).toHaveCount(0);

    const before = await allRowLabels(page);
    expect(before.some((label) => label.includes("Arctic Foam"))).toBe(true);

    const search = page.getByRole("searchbox", { name: "Search blanks" });
    await search.fill("Arctic");
    await expect(blankList(page).locator("li[data-group] button").first()).toBeVisible();
    await search.fill("");

    await untickMaker(page, "Arctic Foam");
    await expect(note).toHaveText("Showing US Blanks and Marko Foam only — change in Settings");

    const after = await allRowLabels(page);
    expect(after.some((label) => label.includes("Arctic Foam"))).toBe(false);
    expect(after.some((label) => label.includes("US Blanks"))).toBe(true);
    expect(after.some((label) => label.includes("Marko Foam"))).toBe(true);
    expect(after.length).toBeLessThan(before.length);

    await search.fill("Arctic");
    await expect(page.getByText('No blanks match "Arctic".')).toBeVisible();
    await search.fill("");

    await untickMaker(page, "Marko Foam");
    await expect(note).toHaveText("Showing US Blanks only — change in Settings");
  });

  test("a picked blank stays on the board when its maker is unticked, and the offer never names that maker", async ({
    page,
  }) => {
    await openRocker(page);
    const row = firstFittingRow(page);
    const label = (await row.getAttribute("aria-label")) ?? "";
    const vendor = KNOWN_BLANK_VENDORS.find((known) => label.startsWith(`Use ${known} `));
    expect(vendor, label).toBeDefined();
    const name = (await row.locator("[data-blank-name]").innerText()).trim();
    await row.click();
    await expect(pickedCard(page)).toContainText(name);

    await untickMaker(page, vendor!);
    // The board keeps its blank: same name, and the meta line still names its maker.
    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(name);
    await expect(pickedCard(page)).toContainText(vendor!);

    await typeCenterThickness(page, "3 1/2");
    const flag = page.locator("[data-blank-flag]");
    await expect(flag).toContainText("This blank doesn't fit your board");
    await expect(pickedCard(page).locator("[data-blank-name]")).toHaveText(name);

    // Either the closest blank that fits, from a maker still shown — or F5, naming only those makers.
    const offer = flag.locator("[data-blank-offer]");
    const nothingFits = nothingFitsSentence(catalogsPhrase([vendor!]));
    await expect(offer.or(flag.getByText(nothingFits))).toBeVisible();
    if ((await offer.count()) > 0) {
      await expect(offer).not.toContainText(vendor!);
    } else {
      await expect(flag).toContainText(nothingFits);
    }

    await page.getByRole("button", { name: "Change Blank" }).click();
    const search = page.getByRole("searchbox", { name: "Search blanks" });
    await search.fill(vendor!);
    await expect(page.getByText(`No blanks match "${vendor}".`)).toBeVisible();
  });
});
