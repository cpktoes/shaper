import { expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";
import { CONTACT_COPY, CONTACT_ROUTE } from "../lib/contact/message";
import { NOT_FOUND_COPY } from "../lib/error-pages/copy";

/**
 * Quick 260930-fjm (Phase 13 item 12). Task 2 proves the not-found page's ways forward and the
 * phone shell on any address (P-2/P-3). Task 3 appends the error-screen half, reusing
 * `expectShell` below.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
});

/** The shared phone-vs-desktop shell assertions Task 3 reuses for the error screen too: on a
 * phone project, exactly one bottom tab bar and the phone top bar's Menu button, no sideways
 * scroll and every actionable element at least 44px tall; on desktop, the ordinary Settings gear
 * and no phone chrome. */
async function expectShell(page: Page, projectName: string, screen: string): Promise<void> {
  if (projectName !== "desktop") {
    await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Settings" })).toBeHidden();
    const nav = page.getByRole("navigation", { name: "Screens" });
    await expect(nav).toHaveCount(1);
    await expect(nav).toBeVisible();

    const overflow = await page.locator(screen).evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    const heights = await page.locator(`${screen} a, ${screen} button`).evaluateAll((elements) =>
      elements.map((el) => (el as HTMLElement).offsetHeight),
    );
    for (const height of heights) {
      expect(height).toBeGreaterThanOrEqual(44);
    }
  } else {
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeHidden();
  }
}

test.describe("the not-found page", () => {
  test("an unknown address shows the not-found page with its ways forward", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle(NOT_FOUND_COPY.pageTitle);

    const screen = page.locator("[data-not-found-page]");
    await expect(screen.getByRole("heading", { name: NOT_FOUND_COPY.heading, level: 1 })).toBeVisible();
    await expect(screen.getByText(NOT_FOUND_COPY.lead)).toBeVisible();
    await expect(screen.getByText(NOT_FOUND_COPY.hint)).toBeVisible();

    const homeLink = screen.getByRole("link", { name: NOT_FOUND_COPY.home, exact: true });
    await expect(homeLink).toHaveAttribute("href", "/");
    const contactLink = screen.getByRole("link", { name: NOT_FOUND_COPY.contact });
    await expect(contactLink).toHaveAttribute("href", CONTACT_ROUTE);

    await expectShell(page, testInfo.project.name, "[data-not-found-page]");
  });

  test("an unknown design address keeps exactly one bottom bar", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const response = await page.goto("/design/no-such-screen");
    expect(response?.status()).toBe(404);

    const screen = page.locator("[data-not-found-page]");
    await expect(screen.getByRole("heading", { name: NOT_FOUND_COPY.heading, level: 1 })).toBeVisible();

    await expectShell(page, testInfo.project.name, "[data-not-found-page]");
  });

  test("Home screen takes a shaper home", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/no-such-page");
    await page.locator("[data-not-found-page]").getByRole("link", { name: NOT_FOUND_COPY.home, exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("[data-setup-content]")).toBeVisible();
  });

  test("Tell us about a broken link opens the Contact page", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/no-such-page");
    await page.locator("[data-not-found-page]").getByRole("link", { name: NOT_FOUND_COPY.contact }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole("heading", { name: CONTACT_COPY.heading, level: 1 })).toBeVisible();
  });
});
