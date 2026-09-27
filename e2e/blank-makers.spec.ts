import { expect, test, type Locator, type Page } from "@playwright/test";
import { BLANK_MAKERS_COOKIE_NAME, BLANK_MAKERS_STORAGE_KEY } from "../lib/blank-makers-preference";
import { KNOWN_BLANK_VENDORS } from "../lib/blanks/vendors";

/**
 * Quick task 260926-wmf: the gear menu's BLANK MAKERS tick boxes, proved in a real browser on all
 * three projects — the desktop gear (`Settings`) and the phone top bar's single `Menu` both reach
 * them, because the phone menu renders the same settings content.
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

/** The popup opens with a zoom-in animation; a box read mid-animation is a frame short of its
 * settled size (the same wait `fit-defaults.spec.ts` uses). */
async function settled(locator: Locator) {
  await locator.evaluate(async (el) => {
    await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
  });
}

/** The desktop nav's gear, or the phone top bar's one Menu button — whichever this project shows. */
function menuTrigger(page: Page, projectName: string): Locator {
  return projectName === "desktop"
    ? page.getByRole("button", { name: "Settings" })
    : page.getByRole("banner").getByRole("button", { name: "Menu" });
}

/** Opens the menu and returns the BLANK MAKERS group. Retried, because a click that lands before
 * the page has hydrated does nothing — and only clicked again while the menu is still closed, so
 * a retry can never toggle an open menu shut. */
async function openBlankMakers(page: Page, projectName: string): Promise<Locator> {
  const trigger = menuTrigger(page, projectName);
  const group = page.getByRole("group", { name: "Blank Makers" });
  await expect(trigger).toBeVisible();
  await expect(async () => {
    if (!(await group.isVisible())) await trigger.click();
    await expect(group).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  return group;
}

/** One maker's tick box, found by its visible name (the locked row's hint follows the name). */
function makerRow(group: Locator, vendor: string): Locator {
  return group.getByRole("menuitemcheckbox", { name: new RegExp(`^${vendor}`) });
}

async function blankMakersCookie(page: Page) {
  return (await page.context().cookies()).find((cookie) => cookie.name === BLANK_MAKERS_COOKIE_NAME);
}

test.describe("Blank Makers — the gear menu's tick boxes", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  test("all three makers are ticked for a shaper who never touched them", async ({ page }, testInfo) => {
    await page.goto("/design/outline");
    const group = await openBlankMakers(page, testInfo.project.name);

    const rows = group.getByRole("menuitemcheckbox");
    await expect(rows).toHaveCount(KNOWN_BLANK_VENDORS.length);
    for (const [index, vendor] of KNOWN_BLANK_VENDORS.entries()) {
      const row = rows.nth(index);
      await expect(row).toHaveAccessibleName(new RegExp(`^${vendor}`));
      await expect(row).toHaveAttribute("aria-checked", "true");
      await expect(row).not.toHaveAttribute("aria-disabled", "true");
    }

    // A default nobody chose is never written anywhere.
    expect(await blankMakersCookie(page)).toBeUndefined();
    expect(await page.evaluate((key) => window.localStorage.getItem(key), BLANK_MAKERS_STORAGE_KEY)).toBeNull();

    // The whole menu fits the screen: past the room below the button it scrolls inside itself.
    const popup = page.getByRole("menu");
    await settled(popup);
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

  test("unticking a maker is remembered by the browser after a reload", async ({ page }, testInfo) => {
    await page.goto("/design/outline");
    let group = await openBlankMakers(page, testInfo.project.name);

    await makerRow(group, "Arctic Foam").click();
    await expect(makerRow(group, "Arctic Foam")).toHaveAttribute("aria-checked", "false");
    // The menu stays open, so several makers can be changed in one visit.
    await expect(group).toBeVisible();

    const cookie = await blankMakersCookie(page);
    expect(cookie).toBeDefined();
    expect(JSON.parse(decodeURIComponent(cookie!.value))).toEqual(["Arctic Foam"]);

    await page.reload();
    group = await openBlankMakers(page, testInfo.project.name);
    await expect(makerRow(group, "Arctic Foam")).toHaveAttribute("aria-checked", "false");
    await expect(makerRow(group, "US Blanks")).toHaveAttribute("aria-checked", "true");
    await expect(makerRow(group, "Marko Foam")).toHaveAttribute("aria-checked", "true");
  });

  test("the last ticked maker cannot be unticked", async ({ page }, testInfo) => {
    await page.goto("/design/outline");
    const group = await openBlankMakers(page, testInfo.project.name);

    await makerRow(group, "Arctic Foam").click();
    await expect(makerRow(group, "Arctic Foam")).toHaveAttribute("aria-checked", "false");
    await makerRow(group, "Marko Foam").click();
    await expect(makerRow(group, "Marko Foam")).toHaveAttribute("aria-checked", "false");

    const usBlanks = makerRow(group, "US Blanks");
    await expect(usBlanks).toHaveAttribute("aria-disabled", "true");
    await expect(usBlanks).toHaveAttribute("aria-checked", "true");
    await expect(usBlanks).toContainText("Keep at least one maker ticked");

    // Playwright waits on an aria-disabled element unless forced; the click itself must do nothing.
    await usBlanks.click({ force: true });
    await expect(usBlanks).toHaveAttribute("aria-checked", "true");

    await makerRow(group, "Marko Foam").click();
    await expect(makerRow(group, "Marko Foam")).toHaveAttribute("aria-checked", "true");
    await expect(usBlanks).not.toHaveAttribute("aria-disabled", "true");
    await expect(usBlanks).not.toContainText("Keep at least one maker ticked");
  });
});
