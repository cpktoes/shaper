import { expect, test, type Page } from "@playwright/test";

/**
 * D-03/D-04's proof for the rack's dialogs: the setup screen's five dialogs get touch sizing and
 * stay centred. This suite runs signed out against fake Clerk keys (see playwright.config.ts's own
 * doc comment) and a fake database, so the saved-board rack never renders — a signed-out run can
 * only reach TWO of the five dialogs directly. Honest inventory, one line per dialog:
 *
 * - **Sign-in dialog** (`sign-in-dialog.tsx`, a `Dialog`) — measured directly, below: opened from
 *   the phone menu on a phone, from the nav's "Sign in" button on desktop.
 * - **Replace-board confirm** (`replace-board-dialog.tsx`, an `AlertDialog`) — measured directly,
 *   below: opened by picking a second preset while one is already in progress.
 * - **Rename dialog** (`rename-dialog.tsx`) — cannot be opened here (needs a saved board behind a
 *   sign-in); its finger sizing rides the shared `Dialog` close-X and `Input` height rules this
 *   plan pins, plus `Button`'s existing rules (Phase 9).
 * - **Name this board dialog** (`board-name-prompt.tsx`) — cannot be opened here (needs a
 *   sign-in to reach Save); same shared-rule inheritance as Rename.
 * - **Delete confirm dialog** (`delete-confirm-dialog.tsx`) — cannot be opened here (needs a saved
 *   board behind a sign-in); its two buttons ride `Button`'s existing rules only (it has no close-X
 *   and no `Input`).
 *
 * The iOS-keyboard-over-a-dialog question (D-03's own caveat) and the delete confirm's real-device
 * feel (D-04) are both deferred to the end-of-phase real-device sweep, not proven here.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";

/** Matches the sibling phone specs' own approach: dismiss the sign-in banner via sessionStorage,
 * set before navigation, so its own height never confuses a layout assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

test.describe("sign-in dialog — close-X grows to a thumb on a phone, stays a mouse-sized 28px on desktop", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("on a phone: the phone menu's Sign in row opens the dialog, its close-X is at least 44x44, and the dialog stays 16px clear of both edges", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-only: the phone menu doesn't render on desktop");

    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    await page.locator("[data-phone-menu-account]").getByRole("button", { name: "Sign in" }).click();

    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible();

    const closeButton = dialog.locator('[data-slot="dialog-close"]');
    const closeBox = await closeButton.boundingBox();
    if (!closeBox) throw new Error("dialog close button is missing a bounding box");
    expect(closeBox.width).toBeGreaterThanOrEqual(44);
    expect(closeBox.height).toBeGreaterThanOrEqual(44);

    const dialogBox = await dialog.boundingBox();
    if (!dialogBox) throw new Error("dialog is missing a bounding box");
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("no viewport size");
    expect(dialogBox.x).toBeGreaterThanOrEqual(16);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width - 16);
  });

  test("on desktop: the nav's Sign in button opens the dialog, its close-X stays 28x28 — proof the rule is pointer-keyed, not viewport-keyed", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only: proves the rule does NOT apply to a mouse");

    await page.goto("/");
    await page.getByRole("button", { name: "Sign in" }).click();

    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible();

    const closeButton = dialog.locator('[data-slot="dialog-close"]');
    const closeBox = await closeButton.boundingBox();
    if (!closeBox) throw new Error("dialog close button is missing a bounding box");
    expect(closeBox.width).toBe(28);
    expect(closeBox.height).toBe(28);
  });
});

test.describe("replace-board confirm — the two buttons are thumb-sized on a phone, mouse-sized on desktop", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("picking a second preset with a board already in progress opens the confirm, and its two buttons + the dialog itself measure correctly for each pointer", async ({
    page,
  }, testInfo) => {
    await page.goto("/");

    const presetCards = page.getByRole("button").filter({ hasText: "Start Shaping" });
    await presetCards.first().click();
    await page.waitForURL("**/design/outline");

    // On a design route the wordmark IS a link — the return path home (phone-home.spec.ts's own
    // pattern). On desktop the top bar's wordmark lives in the desktop nav row instead.
    await page.getByRole("banner").getByRole("link", { name: "SHAPER ASSISTANT" }).click();
    await page.waitForURL("/");

    await presetCards.nth(1).click();

    const dialog = page.locator('[data-slot="alert-dialog-content"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-slot="alert-dialog-title"]')).toHaveText("Start a new design?");

    const cancelButton = dialog.locator('[data-slot="alert-dialog-cancel"]');
    const actionButton = dialog.locator('[data-slot="alert-dialog-action"]');
    const cancelBox = await cancelButton.boundingBox();
    const actionBox = await actionButton.boundingBox();
    if (!cancelBox || !actionBox) throw new Error("alert-dialog button is missing a bounding box");

    if (testInfo.project.name === "desktop") {
      // The pointer-gating proof for Button's existing coarse:h-11 rule (Phase 9), which this
      // phase inherits rather than writes — a mouse keeps today's smaller confirm buttons.
      expect(cancelBox.height).toBe(32);
      expect(actionBox.height).toBe(32);
    } else {
      expect(cancelBox.height).toBeGreaterThanOrEqual(44);
      expect(actionBox.height).toBeGreaterThanOrEqual(44);

      const dialogBox = await dialog.boundingBox();
      if (!dialogBox) throw new Error("dialog is missing a bounding box");
      const viewport = page.viewportSize();
      if (!viewport) throw new Error("no viewport size");
      expect(dialogBox.x).toBeGreaterThanOrEqual(16);
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width - 16);
    }
  });
});
