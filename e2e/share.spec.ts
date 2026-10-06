import { expect, test, type Locator, type Page } from "@playwright/test";
import { SITE_NAME, SITE_URL } from "../lib/site/metadata";
import { SHARE_COPY } from "../lib/site/share";

/**
 * Quick 261006-fom (D-06, P-4, P-7): the Share row in both menus, on all three device profiles.
 *
 * On the desktop the browser is given no share sheet (an init script removes `navigator.share`)
 * and clipboard permission, so the gear menu's Share row copies the site's address — read back
 * from the real clipboard — and the row reads "Copied", then "Share" again about two seconds later.
 * On the two phones `navigator.share` is a stub that records what it was handed, so the ☰ sheet's
 * Share row is proven to hand the share sheet the site's address and name; the real share sheet on
 * the founder's own phone is their check at the review. `menuTrigger` and `openMenuTo` are copied
 * from e2e/privacy.spec.ts.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissBannerAndTip(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

/** The desktop nav's gear ("Settings"), or the phone top bar's one "Menu" button. */
function menuTrigger(page: Page, projectName: string): Locator {
  return projectName === "desktop"
    ? page.getByRole("button", { name: "Settings", exact: true })
    : page.getByRole("banner").getByRole("button", { name: "Menu" });
}

/** Opens the menu and waits for `sentinel` to appear, retried while the page hydrates and only
 * clicked again while the menu is still closed. */
async function openMenuTo(page: Page, projectName: string, sentinel: Locator): Promise<void> {
  const trigger = menuTrigger(page, projectName);
  await expect(trigger).toBeVisible();
  await expect(async () => {
    if (!(await sentinel.isVisible())) await trigger.click();
    await expect(sentinel).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

function shareRow(page: Page): Locator {
  return page.getByRole("menuitem", { name: SHARE_COPY.label, exact: true });
}

/** What the Share row visibly reads ("Share", or its brief confirmation). */
function shareLabel(page: Page): Locator {
  return shareRow(page).locator("[data-share-label]");
}

test.describe("Share", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  test("on a computer with no share sheet, the gear menu's Share copies the site's address", async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's gear menu");
    await page.addInitScript(() => {
      delete (Navigator.prototype as unknown as { share?: unknown }).share;
      delete (navigator as unknown as { share?: unknown }).share;
    });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/design/outline");
    expect(await page.evaluate(() => typeof (navigator as { share?: unknown }).share)).toBe("undefined");

    await openMenuTo(page, testInfo.project.name, shareRow(page));
    // The rows read Contact, Share, then App Default Settings.
    const rows = page.getByRole("menuitem");
    await expect(rows.nth(1)).toHaveAccessibleName(SHARE_COPY.label);

    await shareRow(page).click();
    await expect(shareLabel(page)).toHaveText(SHARE_COPY.copied);
    // A screen reader hears the same confirmation.
    await expect(shareRow(page).getByRole("status")).toHaveText(SHARE_COPY.copied);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(SITE_URL);
    expect(SITE_URL).toBe("https://www.shaperassistant.com");

    // The menu stays open so the confirmation can be read, then the row reads Share again.
    await expect(shareLabel(page)).toHaveText(SHARE_COPY.label, { timeout: 4_000 });
  });

  test("on a phone, the ☰ sheet's Share hands the share sheet the site's address and name", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phone's ☰ sheet");
    await page.addInitScript(() => {
      const calls: unknown[] = [];
      (window as unknown as { __shareCalls: unknown[] }).__shareCalls = calls;
      Object.defineProperty(Navigator.prototype, "share", {
        configurable: true,
        writable: true,
        value: (data: unknown) => {
          calls.push(data);
          return Promise.resolve();
        },
      });
    });

    await page.goto("/design/outline");
    await openMenuTo(page, testInfo.project.name, page.locator("[data-screen-tile]").first());
    const row = shareRow(page);
    await row.scrollIntoViewIfNeeded();
    await expect(row).toBeVisible();

    const height = await row.evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(height).toBeGreaterThanOrEqual(44);

    await row.click();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __shareCalls: unknown[] }).__shareCalls.length))
      .toBe(1);
    const [call] = await page.evaluate(
      () => (window as unknown as { __shareCalls: { url: string; title: string }[] }).__shareCalls,
    );
    expect(call.url).toBe("https://www.shaperassistant.com");
    expect(call.title).toBe(SITE_NAME);
    // A shared address needs no confirmation: the row still reads Share.
    await expect(shareLabel(page)).toHaveText(SHARE_COPY.label);
  });
});
