import { expect, test } from "@playwright/test";

/**
 * PHON-07's browser-reachable proof: the account control's loading placeholder claims the exact
 * footprint every other state of the control claims under a coarse pointer (D-06's own point),
 * on both the phone menu's slot and the desktop nav's slot.
 *
 * This is deliberately a NARROWER file than the plan first assumed. Empirically confirmed at
 * execution time (2026-09-10, by polling the account slot's DOM for over 20 seconds): under this
 * suite's deliberately fake Clerk keys (`playwright.config.ts`'s own header comment explains why
 * a `pk_live_`-shaped fake key is required just to get the app to render at all), Clerk's
 * `useUser().isLoaded` never settles `true`. `e2e/phone-layout.spec.ts` already documented this
 * exact finding for the Clerk avatar; it turns out to gate ALL THREE of this plan's controls, not
 * just the avatar:
 *   - `NavAuthControl`'s signed-out "Sign in" row (D-06) never renders here — the component is
 *     permanently stuck on its `!isLoaded` placeholder branch in this browser.
 *   - Clerk's `<UserButton />` avatar (D-05) never renders here either, for the same reason (and
 *     never would regardless, since no real Clerk instance is reachable from a fake key).
 *   - `SignInBanner` (PHON-07) is ALSO gated behind its own `if (!isLoaded) return null;`, so it
 *     never appears on a `/design/*` route in this suite — confirmed by navigating there with no
 *     dismissal at all and polling for its copy for over 20 seconds.
 *
 * So the one state Playwright CAN measure is the placeholder itself, which renders unconditionally
 * while `isLoaded` is false — which is always, in this suite. Everything else this plan proves —
 * the Sign-in row's three coarse tokens, Clerk's appearance prop, and the banner's dismiss-square
 * plus its overflow margins — is proven by the source-and-compiled-stylesheet contract in
 * `components/auth/nav-auth-control.test.ts` instead, exactly the pattern
 * `components/rails/view-full-sized-dialog.css.test.ts` already established for a control this
 * project cannot render in a browser. The real pixel measurements of the Sign-in row, the grown
 * avatar and the banner's dismiss X are the founder's own real-device pass, deferred to the
 * end-of-phase sweep (see this plan's SUMMARY, "Human verification deferred to end-of-phase UAT").
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";

async function dismissSignInBanner(page: import("@playwright/test").Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

test.describe("account control — loading placeholder (the one state Playwright can reach)", () => {
  test("phone: the phone menu's placeholder is at least 44x44 under a coarse pointer", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "phone-menu-only: the desktop nav renders the placeholder directly");
    await dismissSignInBanner(page);
    await page.goto("/");

    await page.getByRole("button", { name: "Menu" }).click();
    const placeholder = page.locator('[data-phone-menu-account] span[aria-hidden]');
    await expect(placeholder).toBeVisible();

    const box = await placeholder.boundingBox();
    if (!box) throw new Error("placeholder is missing a bounding box");
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  });

  test("desktop: the nav's own placeholder measures exactly 28x28, unchanged for a mouse", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only: proves the placeholder's growth rule stayed pointer-gated");
    await dismissSignInBanner(page);
    await page.goto("/");

    // Scoped to the visible desktop nav (not the phone menu's popup, which is closed here) — the
    // divider spans in site-nav.tsx also carry aria-hidden, so this locator is scoped by the
    // placeholder's own size-7 class rather than the bare attribute.
    const placeholder = page.locator("nav span[aria-hidden].size-7");
    await expect(placeholder).toBeVisible();

    const box = await placeholder.boundingBox();
    if (!box) throw new Error("placeholder is missing a bounding box");
    expect(box.height).toBe(28);
    expect(box.width).toBe(28);
  });
});
