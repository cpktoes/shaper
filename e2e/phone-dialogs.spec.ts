import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * D-03/D-04's proof for the app's dialogs: they get touch sizing and stay centred.
 *
 * This suite runs signed out against fake Clerk keys (see playwright.config.ts's own doc comment)
 * and a fake database. That is a harder constraint than it first looks, and the honest inventory
 * matters more than the count of tests:
 *
 * - **Clerk never finishes loading here.** Measured 2026-09-11: with the suite's deliberately fake
 *   publishable key, `useUser().isLoaded` stays false indefinitely (polled 12s on every project),
 *   so `nav-auth-control.tsx` holds its loading placeholder forever and the "Sign in" control never
 *   renders — on the phone menu or in the desktop nav. Every dialog behind a sign-in is therefore
 *   unreachable in a browser test, including the sign-in dialog itself. Its close-X rides the same
 *   shared `DialogContent` rule measured below, and `components/auth/nav-auth-control.test.ts`
 *   carries the compiled-stylesheet proof for the account controls.
 * - **View Full Sized** (`rails/view-full-sized-dialog.tsx`, a `Dialog`) — measured directly below.
 *   It is the one real `Dialog` a signed-out run can open, so it is what proves the close-X rule
 *   that every other `Dialog` in the app inherits from the shared `DialogContent`.
 * - **Replace-board confirm** (`setup/replace-board-dialog.tsx`, an `AlertDialog`) — measured
 *   directly below, reached by picking a second preset with a board already in progress.
 * - **Rename**, **Name this board** and **Delete confirm** — all three sit behind a saved board on a
 *   signed-in account, so none can be opened here. Rename and Name this board ride the shared
 *   `Dialog` close-X rule proven below plus the `Input` height rule proven in
 *   `components/ui/input.css.test.ts`; Delete confirm has neither a close-X nor an `Input` and
 *   rides `Button`'s existing Phase 9 rules, proven by the replace-board confirm below.
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

/**
 * Both dialogs open with a zoom-in animation, so a box read the instant they become visible is a
 * frame partway through it — measured 2026-09-11, a 44px button reads 43.1–43.4px early and 44px
 * once settled. Waiting on the element's own animations (subtree included, so a child button's
 * animation counts too) is deterministic where a fixed sleep is a guess.
 */
async function settled(dialog: Locator) {
  await dialog.evaluate(async (el) => {
    await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined)));
  });
}

test.describe("dialog close-X — grows to a thumb on a phone, stays a mouse-sized 28px on desktop", () => {
  test.beforeEach(async ({ page }) => {
    await dismissSignInBanner(page);
  });

  test("the RAILS View Full Sized dialog — the one Dialog a signed-out run can open — carries the shared close-X, thumb-sized on a phone and 28px for a mouse", async ({
    page,
  }, testInfo) => {
    await page.goto("/design/rails");
    await page.getByRole("button", { name: "View Full Sized" }).click();

    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible();
    await settled(dialog);

    const closeBox = await dialog.locator('[data-slot="dialog-close"]').boundingBox();
    if (!closeBox) throw new Error("dialog close button is missing a bounding box");

    if (testInfo.project.name === "desktop") {
      // The pointer-gating proof: a mouse keeps today's 28px close-X, so the rule is keyed to the
      // pointer and not to the window's width.
      expect(closeBox.width).toBe(28);
      expect(closeBox.height).toBe(28);
    } else {
      expect(closeBox.width).toBeGreaterThanOrEqual(44);
      expect(closeBox.height).toBeGreaterThanOrEqual(44);

      // This dialog sets its own width — it is the full-bleed rail viewer, not a small form — so
      // it clears the edge by about 10px rather than the shared 16px. That is this dialog's own
      // choice and NOT a weakened version of D-03's 16px margin: the 16px rule belongs to the
      // small centred dialogs, and the replace-board confirm below is the one this suite can
      // actually reach to prove it. What is asserted here is only that the dialog stays on screen.
      const dialogBox = await dialog.boundingBox();
      if (!dialogBox) throw new Error("dialog is missing a bounding box");
      const viewport = page.viewportSize();
      if (!viewport) throw new Error("no viewport size");
      expect(dialogBox.x).toBeGreaterThanOrEqual(8);
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width - 8);
    }
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

    // The wordmark is the return path home, and it must be a CLIENT-side navigation: an
    // in-progress board lives only in the design store's memory, so a reload would drop it and
    // there would be nothing for the second preset to replace. The link is unscoped on purpose —
    // the phone top bar and the desktop nav each carry one, and the other is display:none at any
    // given width, so exactly one is ever in the accessibility tree.
    await page.getByRole("link", { name: "SHAPER ASSISTANT" }).click();
    await page.waitForURL("/");

    await presetCards.nth(1).click();

    const dialog = page.locator('[data-slot="alert-dialog-content"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-slot="alert-dialog-title"]')).toHaveText("Start a new design?");
    await settled(dialog);

    const cancelBox = await dialog.locator('[data-slot="alert-dialog-cancel"]').boundingBox();
    const actionBox = await dialog.locator('[data-slot="alert-dialog-action"]').boundingBox();
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
