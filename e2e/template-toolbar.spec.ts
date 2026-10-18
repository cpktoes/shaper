import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * TEMPLATE's drawing toolbar (quick 261018-e6w, 2026-10-18). The founder, verbatim: "Show Drag Points
 * is already an icon. Remove from settings section and just let the icon rule. Default = on
 * (shaded). Show fin placement can also become an icon rather than setting; create a new icon with
 * a basic surfboard fin as the icon. Default = off."
 *
 * So the drawing's toolbar holds the only switch for the drag points (on from the start) and the
 * only switch for fin placement (off until pressed, or until a board's first wing switches it on).
 * This file proves, in a real browser, the fin button on both toolbars and its defaults, and
 * (growing with the later tasks of that quick task) the drag points' default and the sidebar's
 * Settings block being gone.
 *
 * The banner/toolbar-tip dismissal helper is a local copy of `e2e/viewer-toolbar.spec.ts`'s own —
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

/** Waits until React owns the element (it carries a `__reactFiber…` key), so a click right after
 * navigation never lands on server HTML that isn't wired up yet. */
async function waitForReactOwned(locator: Locator) {
  await expect
    .poll(() => locator.evaluate((el) => Object.keys(el).some((key) => key.startsWith("__reactFiber"))))
    .toBe(true);
}

/** The accessible names of the visible toolbar buttons, in DOM order — corner first. */
async function visibleToolbarNames(page: Page): Promise<string[]> {
  const buttons = page.locator("[data-viewer-toolbar]:visible button:visible");
  return buttons.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
}

/** From an open TEMPLATE screen, opens the WINGS tab and adds the first wing, closing the dial-in pop-up. */
async function addFirstWing(page: Page) {
  await page.getByRole("tab", { name: "ADD WINGS" }).click();
  await page.locator("aside").getByRole("button", { name: "+ Add a wing" }).click();
  const dialog = page.getByRole("dialog", { name: "Dial in your wing placement" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Got it" }).click();
  await expect(dialog).toHaveCount(0);
}

test.describe("TEMPLATE's fin-placement toolbar button", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("desktop: fin placement starts off; the button shows and hides the fin marks", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await page.goto("/design/outline");
    const show = page.getByRole("button", { name: "Show fin placement" });
    await expect(show).toBeVisible();
    await waitForReactOwned(show);
    await expect(show).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-fin-mark]")).toHaveCount(0);

    await show.click();
    const hide = page.getByRole("button", { name: "Hide fin placement" });
    await expect(hide).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-fin-mark]").first()).toBeVisible();

    await hide.click();
    await expect(page.getByRole("button", { name: "Show fin placement" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator("[data-fin-mark]")).toHaveCount(0);
  });

  test("desktop: the fin button is the last of the buttons at rest, and the ghost joins after it once the board is edited", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await page.goto("/design/outline");
    const finButton = page.getByRole("button", { name: "Show fin placement" });
    await waitForReactOwned(finButton);
    const atRest = await visibleToolbarNames(page);
    expect(atRest.at(-1)).toBe("Show fin placement");

    // One edit from the keyboard — a slider nudge, not a drag on the drawing, so this test never
    // depends on the drag points' default.
    const noseAngleLabel = page.getByText(/^Nose Angle — /);
    await expect(noseAngleLabel).toBeVisible();
    const before = await noseAngleLabel.textContent();
    await noseAngleLabel
      .locator("xpath=..")
      .locator('[data-slot="slider-thumb"] input[type="range"]')
      .focus();
    await page.keyboard.press("ArrowRight");
    await expect(noseAngleLabel).not.toHaveText(before ?? "");

    await expect(page.getByRole("button", { name: "Hide the ghost of the last edit" })).toBeVisible();
    const afterEdit = await visibleToolbarNames(page);
    expect(afterEdit.at(-1)).toBe("Hide the ghost of the last edit");
    expect(afterEdit.at(-2)).toBe("Show fin placement");
  });

  test("desktop: the first wing switches fin placement on, and it stays on through a trip to FINS and back; a reload starts it off again", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop project only");

    await page.goto("/design/outline");
    await page.getByRole("tab", { name: "ADD WINGS" }).click();
    await page.locator("aside").getByRole("button", { name: "+ Add a wing" }).click();
    const dialog = page.getByRole("dialog", { name: "Dial in your wing placement" });
    await expect(dialog).toBeVisible();

    // The first wing pressed the WINGS toolbar's fin button and drew the marks in the close-up. (The
    // pop-up is modal, so the page behind it is hidden from the accessibility tree: found by attribute.)
    await expect(page.locator('button[aria-label="Hide fin placement"]')).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-wing-close-up] [data-fin-mark]").first()).toBeVisible();

    // Open FINS, then come back by the top bar's TEMPLATE link — a client-side move, not a reload.
    await dialog.getByRole("link", { name: "Open FINS" }).click();
    // The suite's first visit to FINS compiles that screen on the click (see wings.spec.ts).
    await expect(page).toHaveURL(/\/design\/fins$/, { timeout: 60_000 });
    await page.locator("nav:not([data-step-nav])").getByRole("link", { name: "TEMPLATE", exact: true }).click();
    await expect(page).toHaveURL(/\/design\/outline$/);
    await expect(page.getByRole("button", { name: "Hide fin placement" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("[data-fin-mark]").first()).toBeVisible();

    await page.reload();
    const show = page.getByRole("button", { name: "Show fin placement" });
    await expect(show).toBeVisible();
    await expect(show).toHaveAttribute("aria-pressed", "false");
  });

  test("phones: the VIEWER toolbar reads Print Template, the drag-points button, then Show fin placement; the WINGS toolbar reads the drag-points button, whole board, then fin placement", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone projects only");

    await page.goto("/design/outline");
    const finButton = page.getByRole("button", { name: "Show fin placement" });
    await expect(finButton).toBeVisible();
    await waitForReactOwned(finButton);
    const viewerNames = await visibleToolbarNames(page);
    expect(viewerNames).toHaveLength(3);
    expect(viewerNames[0]).toBe("Print Template");
    expect(viewerNames[1]).toMatch(/drag points$/);
    expect(viewerNames[2]).toBe("Show fin placement");

    await addFirstWing(page);
    await expect(page.getByRole("tab", { name: "WINGS · 1" })).toBeVisible();
    const wingsNames = await visibleToolbarNames(page);
    expect(wingsNames).toHaveLength(3);
    expect(wingsNames[0]).toMatch(/drag points/);
    expect(wingsNames[1]).toBe("Show the whole board");
    // The first wing switched fin placement on, so the button now offers to hide it.
    expect(wingsNames[2]).toBe("Hide fin placement");
  });
});
