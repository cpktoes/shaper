import { expect, test, type Page } from "@playwright/test";

/**
 * Browser proof for quick 261017-vdh plan 01 — the founder's copy-edit canvas, 2026-10-17:
 *
 *   - TEMPLATE's wording: the shorter subtitle, the Settings tick boxes `Show Drag Points` and
 *     `Show fin placement` (no "marks only" note), and the drawing's `Show drag points` button.
 *   - RAILS' INPUTS section and the View tick box on each rail (added below, Task 2).
 *
 * The sign-in banner and the toolbar tip are dismissed before navigation, as in the sibling specs,
 * so neither shifts anything under a click.
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

test.describe("TEMPLATE — the side panel's new wording", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer layout's sidebar");
    await dismissChrome(page);
    await page.goto("/design/outline");
  });

  test("the subtitle is shorter and the Settings read Show Drag Points and Show fin placement", async ({
    page,
  }) => {
    const aside = page.locator("aside");
    await expect(aside.getByText("Design and print full sized templates", { exact: true })).toBeVisible();
    await expect(aside.getByRole("checkbox", { name: "Show Drag Points" })).toBeVisible();
    await expect(aside.getByRole("checkbox", { name: "Show fin placement" })).toBeVisible();
    await expect(aside.getByText("marks only")).toHaveCount(0);
    await expect(aside.getByText("Construction Lines")).toHaveCount(0);
  });

  test("the drawing's button reads Show drag points, then Hide drag points once pressed", async ({ page }) => {
    const show = page.getByRole("button", { name: "Show drag points" });
    await expect(show).toBeVisible();
    await expect(show).toHaveAttribute("aria-pressed", "false");
    await show.click();
    const hide = page.getByRole("button", { name: "Hide drag points" });
    await expect(hide).toBeVisible();
    await expect(hide).toHaveAttribute("aria-pressed", "true");
    await hide.click();
    await expect(page.getByRole("button", { name: "Show drag points" })).toHaveAttribute("aria-pressed", "false");
  });
});
