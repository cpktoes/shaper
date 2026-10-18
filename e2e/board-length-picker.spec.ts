import { expect, test } from "@playwright/test";

/**
 * Quick 261017-sru: the two Board Length boxes on TEMPLATE, VOLUME and FINS read the way their open
 * lists do. With the list closed, a 6'0" board used to show a bare `6` and `0`; it now shows `6'` and
 * `0"`. Desktop project only (the boxes are the same on a phone, and the desktop baselines are what
 * pin the picture).
 */

test.describe("Board Length boxes", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only, closed-box wording proof");
  });

  for (const [screen, path] of [
    ["TEMPLATE", "/design/outline"],
    ["VOLUME", "/design/volume"],
    ["FINS", "/design/fins"],
  ] as const) {
    test(`${screen}: the closed boxes read 6' and 0" for a 6'0" board`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(`Board Length — 6'0"`)).toBeVisible();

      // The only select boxes on these screens are the two Board Length boxes. Each box also draws a
      // small arrow, so the text is read from the box's value, not the whole button.
      const boxes = page.locator('[data-slot="select-trigger"]');
      await expect(boxes).toHaveCount(2);
      await expect(boxes.nth(0).locator('[data-slot="select-value"]')).toHaveText("6'");
      await expect(boxes.nth(1).locator('[data-slot="select-value"]')).toHaveText('0"');
    });
  }

  test("TEMPLATE: picking 7' from the open list makes the closed box and the label read 7'", async ({ page }) => {
    await page.goto("/design/outline");
    await expect(page.getByText(`Board Length — 6'0"`)).toBeVisible();

    const feetBox = page.locator('[data-slot="select-trigger"]').nth(0);
    await feetBox.click();
    await page.getByRole("option", { name: "7'", exact: true }).click();

    await expect(feetBox.locator('[data-slot="select-value"]')).toHaveText("7'");
    await expect(page.getByText(`Board Length — 7'0"`)).toBeVisible();
  });
});
