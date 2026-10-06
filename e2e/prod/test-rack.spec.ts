import { expect, test } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../../lib/models/toolbar-tip";
import { NOT_FOUND_COPY } from "../../lib/error-pages/copy";
import { RACK_STAND_IN_ROUTE } from "../../lib/models/rack-stand-in";

/**
 * Production-build proof (Phase 15, the Board Rack, T-15-13) that runs against a real
 * `next start`, never the dev server — the same reason `e2e/prod/error-pages.spec.ts` exists.
 *
 * The practice rack at `/test-rack` (stand-in saved boards for the browser suite) is a plain
 * not-found page in a production build: its switch is dead there without the dev-only flag, and
 * Next inlines the literal `process.env.NODE_ENV` the page reads as "production" at build time.
 */

async function dismissPhoneBanners(page: import("@playwright/test").Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

test.describe("the practice rack (production build)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissPhoneBanners(page);
  });

  test("the practice rack's address is only a not-found page in a production build", async ({ page }) => {
    test.setTimeout(90_000);
    const response = await page.goto(RACK_STAND_IN_ROUTE);
    expect(response?.status()).toBe(404);

    await expect(page.getByRole("heading", { name: NOT_FOUND_COPY.heading, level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Shape a New Board" })).toHaveCount(0);
  });
});
