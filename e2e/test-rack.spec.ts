import { expect, test } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { RACK_STAND_IN_ROUTE } from "../lib/models/rack-stand-in";

/**
 * Phase 15's practice rack (RESEARCH Pattern 8), on the dev server: `/test-rack` opens the real
 * home screen holding stand-in saved boards, for one, fifteen and thirty boards. Kept to things that
 * stay true when the rack itself is rebuilt (15-06) — no card or rack markup is asserted here; the
 * rack's own specs do that. `e2e/prod/test-rack.spec.ts` proves the same address is a plain
 * not-found page in a production build.
 */

test.describe("the practice rack (test servers only)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  });

  test("opens the home screen with its stand-in boards", async ({ page }) => {
    const response = await page.goto(RACK_STAND_IN_ROUTE);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Shape a New Board" })).toBeVisible();
  });

  for (const boards of [1, 30]) {
    test(`opens with ${boards} board${boards === 1 ? "" : "s"}`, async ({ page }) => {
      const response = await page.goto(`${RACK_STAND_IN_ROUTE}?boards=${boards}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Shape a New Board" })).toBeAttached();
    });
  }
});
