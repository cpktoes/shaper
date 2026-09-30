import { expect, test, type Page } from "@playwright/test";
import { CONTACT_ADDRESS, CONTACT_MAILTO, CONTACT_ROUTE } from "../lib/contact/message";
import { PRIVACY_COPY, PRIVACY_ROUTE } from "../lib/privacy/copy";

/**
 * Quick 260930-03d (Phase 13 item 11): browser proof for the `/privacy` page on all three device
 * profiles — the iPhone, the Android phone, and the desktop.
 *
 * Task 1 proves the page itself opens signed out and reads correctly, on every device profile.
 * Task 3 adds the menu-row proofs (two taps from every screen, hidden on `/privacy` itself) and
 * the Contact form's Privacy-link proof, once `PrivacyMenuItem` and the Contact-note link exist —
 * this file's `menuTrigger`, `openMenuTo` and `useStandIn` helpers (copied from e2e/contact.spec.ts)
 * are added then too, so lint never sees an unused helper in between.
 *
 * Clerk's own footer "Privacy" link (added to `appearance.options.privacyPageUrl` in Task 2)
 * cannot be proven here, for the same reason e2e/phone-account.spec.ts's header documents: under
 * this suite's deliberately fake Clerk keys, Clerk's hosted `<SignIn>` card never actually renders
 * in this browser, so there is no real footer to inspect. `lib/privacy/wiring.test.ts` (Task 2)
 * proves the source wiring instead, and the founder checks the real footer link live.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissBannerAndTip(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => {
    window.localStorage.setItem(key, "true");
  }, TOOLBAR_TIP_DISMISSAL_KEY);
}

test.describe("Privacy page", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  test("opens signed out and reads the whole page", async ({ page }, testInfo) => {
    await page.goto(PRIVACY_ROUTE);

    await expect(page.getByRole("heading", { name: PRIVACY_COPY.heading, level: 1 })).toBeVisible();
    await expect(page.getByText(PRIVACY_COPY.lastUpdated)).toBeVisible();
    await expect(page.getByText(PRIVACY_COPY.intro)).toBeVisible();

    for (const sectionHeading of [
      PRIVACY_COPY.keep.heading,
      PRIVACY_COPY.browser.heading,
      PRIVACY_COPY.handlers.heading,
      PRIVACY_COPY.deleting.heading,
      PRIVACY_COPY.questions.heading,
    ]) {
      await expect(page.getByRole("heading", { name: sectionHeading, level: 2 })).toBeVisible();
    }

    const main = page.locator("main");
    for (const item of PRIVACY_COPY.keep.items) {
      await expect(main).toContainText(item.text);
    }
    for (const service of PRIVACY_COPY.handlers.services) {
      await expect(main).toContainText(service.name);
    }

    const addressLinks = page.getByRole("link", { name: CONTACT_ADDRESS });
    await expect(addressLinks).toHaveCount(2);
    for (const link of await addressLinks.all()) {
      await expect(link).toHaveAttribute("href", CONTACT_MAILTO);
    }

    const contactLink = page.getByRole("link", { name: PRIVACY_COPY.questions.contactLinkLabel });
    await expect(contactLink).toHaveAttribute("href", CONTACT_ROUTE);

    if (testInfo.project.name !== "desktop") {
      await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Settings" })).toBeHidden();
      await expect(page.getByRole("navigation", { name: "Screens" })).toBeVisible();

      const overflow = await page.locator("[data-privacy-page]").evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    } else {
      await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
      await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeHidden();
    }
  });
});
