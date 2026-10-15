import { expect, test, type Page } from "@playwright/test";

/**
 * Wings on the TEMPLATE page (quick 261014-wii, 2026-10-14; sketches 013 A and 014 B). A wing is a
 * step in the outline applied after the curve, its depth fading out by the tail pod; it is added,
 * set and removed from a WINGS tab beside VIEWER whose sidebar holds only the wing controls. This
 * file proves, in a real browser:
 *
 * - the tracer: the tab strip reads VIEWER and ADD WINGS; adding a wing changes the board on the
 *   VIEWER and the tab's label; removing it puts the board back exactly as it was;
 *
 * and grows with plan 01's later tasks (the popup and Show fins, the sidebar swap, the fin lock, the
 * window growing past 24") and plan 02's (grab points, phones, Metric).
 *
 * The banner/toolbar-tip dismissal helper is a local copy of `e2e/outline-ghost.spec.ts`'s own —
 * every spec in this suite copies it rather than sharing an import.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

test.describe("wings on the TEMPLATE page", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("desktop: add a wing from the WINGS tab, see the step on the VIEWER, and remove it again", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the tracer, desktop project only");

    await page.goto("/design/outline");
    const viewerTab = page.getByRole("tab", { name: "VIEWER" });
    await expect(viewerTab).toBeVisible();
    await expect(page.getByRole("tab", { name: "ADD WINGS" })).toBeVisible();

    const silhouette = page.locator("[data-board-silhouette='outline']");
    await expect(silhouette).toBeVisible();
    const original = await silhouette.getAttribute("d");

    await page.getByRole("tab", { name: "ADD WINGS" }).click();
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Wings", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("Board Length")).toHaveCount(0);

    await sidebar.getByRole("button", { name: "+ Add a wing" }).click();
    // The first wing opens the dial-in pop-up, which hides the page behind it until it closes.
    await page.getByRole("button", { name: "Got it" }).click();
    await expect(page.getByRole("tab", { name: "WINGS · 1" })).toBeVisible();

    await viewerTab.click();
    await expect(silhouette).toBeVisible();
    await expect.poll(() => silhouette.getAttribute("d")).not.toBe(original);

    await page.getByRole("tab", { name: "WINGS · 1" }).click();
    await sidebar.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByRole("tab", { name: "ADD WINGS" })).toBeVisible();

    await viewerTab.click();
    await expect.poll(() => silhouette.getAttribute("d")).toBe(original);
  });

  /** Opens the WINGS tab and adds the first wing, closing the dial-in pop-up. */
  async function addFirstWing(page: Page) {
    await page.goto("/design/outline");
    await page.getByRole("tab", { name: "ADD WINGS" }).click();
    await page.locator("aside").getByRole("button", { name: "+ Add a wing" }).click();
    const dialog = page.getByRole("dialog", { name: "Dial in your wing placement" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Got it" }).click();
    await expect(dialog).toHaveCount(0);
  }

  test("desktop: the first wing switches Show fins on and asks you to dial it in against FINS", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    const sidebar = page.locator("aside");
    await expect(sidebar.getByRole("checkbox", { name: /Show fins/ })).toBeChecked();
    await expect(page.locator("[data-wing-close-up] [data-fin-mark]").first()).toBeVisible();

    await page.getByRole("tab", { name: "VIEWER" }).click();
    await expect(page.locator("[data-fin-mark]").first()).toBeVisible();
    await expect(page.locator('[data-callout-chip="WING 1"]')).toBeVisible();

    // A second wing opens no pop-up.
    await page.getByRole("tab", { name: "WINGS · 1" }).click();
    await sidebar.getByRole("button", { name: "+ Add wing 2" }).click();
    await expect(page.getByRole("tab", { name: "WINGS · 2" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Remove both, add again: the pop-up is back, and Open FINS goes to FINS.
    await sidebar.getByRole("button", { name: "Remove" }).first().click();
    await sidebar.getByRole("button", { name: "Remove" }).first().click();
    await expect(page.getByRole("tab", { name: "ADD WINGS" })).toBeVisible();
    await sidebar.getByRole("button", { name: "+ Add a wing" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Open FINS" }).click();
    await expect(page).toHaveURL(/\/design\/fins$/);
  });

  test("desktop: the WINGS sidebar holds only the wing controls", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await page.goto("/design/outline");
    const sidebar = page.locator("aside");
    await expect(sidebar.getByText("Template Builder")).toBeVisible();
    await page.getByRole("tab", { name: "ADD WINGS" }).click();
    await expect(sidebar.getByText("Wings", { exact: true })).toBeVisible();
    await expect(sidebar.getByText("Board Length")).toHaveCount(0);
    await expect(sidebar.getByText("Nose Controls")).toHaveCount(0);
    await expect(sidebar.getByText("Template Builder")).toHaveCount(0);
    await page.getByRole("tab", { name: "VIEWER" }).click();
    await expect(sidebar.getByText("Template Builder")).toBeVisible();
  });

  test("desktop: the first wing locks to the front fin, follows its leading edge, and unlocks where it stands", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    const chip = page.locator('[data-wing-close-up] [data-callout-chip^="WING 1"]');
    // F21: the default thruster's front fin trails at 10.977", read as 11".
    await expect(chip).toContainText('3/8" @ 11"');
    await expect(chip).toHaveAttribute("data-callout-chip", "WING 1 · FIN");
    const position = page.getByRole("slider", { name: "Wing 1 position from tail" });
    await expect(position).toBeDisabled();

    await page.locator("aside").getByRole("button", { name: "Leading" }).click();
    await expect(chip).toContainText('@ 15 1/2"');

    await page.locator("aside").getByRole("checkbox", { name: "Lock to front fin" }).click();
    await expect(chip).toHaveAttribute("data-callout-chip", "WING 1");
    await expect(chip).toContainText('@ 15 1/2"');
    await expect(position).toBeEnabled();
  });

  test("desktop: a wing past 24 inches grows the close-up's window to hold it", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await addFirstWing(page);
    const closeUp = page.locator("[data-wing-close-up]");
    await expect(closeUp).toHaveAttribute("data-window-hi-in", "26.000");
    await page.locator("aside").getByRole("button", { name: "+ Add wing 2" }).click();
    const position = page.getByRole("slider", { name: "Wing 2 position from tail" });
    await position.focus();
    await page.keyboard.press("End");
    // The default board is 72" long, so its centre is 36" and the window reaches 36" + 3".
    await expect(closeUp).toHaveAttribute("data-window-hi-in", "39.000");
    await expect(closeUp.locator('[data-output-rail="Behind wing 2"]')).toBeVisible();
  });
});
