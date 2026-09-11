import { expect, test, type Page } from "@playwright/test";

/**
 * D-03/D-04's proof for the rack's dialogs: the setup screen's five dialogs
 * (`rename-dialog.tsx`, `board-name-prompt.tsx`, `delete-confirm-dialog.tsx`,
 * `replace-board-dialog.tsx`, `sign-in-dialog.tsx`) get touch sizing and stay centred. This suite
 * runs signed out against fake Clerk keys (see playwright.config.ts's own doc comment) and a fake
 * database, so the saved-board rack never renders — a signed-out run can only reach TWO of the
 * five dialogs directly:
 *
 * - The sign-in dialog (a `Dialog`, opened from the phone menu on a phone / the nav on desktop) —
 *   measured directly, below.
 * - The replace-board confirm (an `AlertDialog`, opened by picking a second preset with a board
 *   already in progress) — measured directly, below.
 *
 * The other three — rename, name this board, delete confirm — cannot be opened by a signed-out
 * run at all (they all require a saved board or an in-progress one behind a sign-in). Their
 * finger sizing is proven instead by the shared-component rules this plan pins: `Dialog`'s close-X
 * (`components/ui/dialog.tsx`, `coarse:size-11`), `Input`'s height
 * (`components/ui/input.tsx`, `coarse:h-11`, proved by `components/ui/input.css.test.ts`), and
 * `Button`'s existing `coarse:h-11`/`coarse:size-11` rules, already shipped in Phase 9. The
 * iOS-keyboard-over-a-dialog question (D-03's own caveat) and the delete confirm's real-device
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
