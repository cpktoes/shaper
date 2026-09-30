import { expect, test, type Locator, type Page } from "@playwright/test";
import { CONTACT_STAND_IN_COOKIE } from "../lib/contact/delivery";
import { CONTACT_ADDRESS, CONTACT_COPY, CONTACT_MAILTO, CONTACT_ROUTE } from "../lib/contact/message";
import { PRIVACY_COPY, PRIVACY_ROUTE } from "../lib/privacy/copy";

/**
 * Quick 260930-03d (Phase 13 item 11): browser proof for the `/privacy` page on all three device
 * profiles — the iPhone, the Android phone, and the desktop.
 *
 * Task 1 proves the page itself opens signed out and reads correctly, on every device profile.
 * Task 3 adds the menu-row proofs (two taps from every screen, hidden on `/privacy` itself) and
 * the Contact form's Privacy-link proof, now that `PrivacyMenuItem` and the Contact-note link
 * exist — `menuTrigger`, `openMenuTo` and `useStandIn` below are copied verbatim from
 * e2e/contact.spec.ts.
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

/** The desktop nav's gear ("Settings"), or the phone top bar's one "Menu" button — whichever this
 * project shows. */
function menuTrigger(page: Page, projectName: string): Locator {
  return projectName === "desktop"
    ? page.getByRole("button", { name: "Settings", exact: true })
    : page.getByRole("banner").getByRole("button", { name: "Menu" });
}

/** Opens the menu and waits for `sentinel` to appear. Retried, because a click that lands before
 * the page has hydrated does nothing — and only clicked again while the menu is still closed, so
 * a retry can never toggle an open menu shut. */
async function openMenuTo(page: Page, projectName: string, sentinel: Locator): Promise<void> {
  const trigger = menuTrigger(page, projectName);
  await expect(trigger).toBeVisible();
  await expect(async () => {
    if (!(await sentinel.isVisible())) await trigger.click();
    await expect(sentinel).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

/** Sets the stand-in cookie that picks the Contact form's delivery outcome. Must run before
 * `page.goto`, since the cookie is read on the server during the very first render. */
async function useStandIn(page: Page, baseURL: string | undefined, choice: "sent" | "failed"): Promise<void> {
  await page.context().addCookies([{ name: CONTACT_STAND_IN_COOKIE, value: choice, url: baseURL }]);
}

/** The shared Privacy row, found by its exact accessible name so it can never be confused with
 * this page's own heading (also "Privacy"). */
function privacyRow(page: Page): Locator {
  return page.getByRole("menuitem", { name: PRIVACY_COPY.menuLabel, exact: true });
}

/** The shared Contact row, the same way e2e/contact.spec.ts finds it. */
function contactRow(page: Page): Locator {
  return page.getByRole("menuitem", { name: CONTACT_COPY.menuLabel, exact: true });
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

  test("the visit counter is on every page, exactly once", async ({ page }) => {
    await page.route("https://va.vercel-scripts.com/**", (route) => route.abort());

    await page.goto(PRIVACY_ROUTE);
    const script = page.locator('head script[data-sdkn="@vercel/analytics/next"]');
    await expect(script).toHaveCount(1, { timeout: 20_000 });
    await expect(script).toHaveAttribute("data-sdkv", "2.0.1");

    await page.goto("/design/rails");
    await expect(page.locator('head script[data-sdkn="@vercel/analytics/next"]')).toHaveCount(1);
  });

  const routesReachableFromTwoTaps = [
    "/",
    "/design/outline",
    "/design/rocker",
    "/design/rails",
    "/design/volume",
    "/design/fins",
    "/design/summary",
    "/contact",
  ];

  for (const route of routesReachableFromTwoTaps) {
    test(`two taps from every screen — ${route}`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await page.goto(route);

      // Tap one: open the menu to the Privacy row.
      await openMenuTo(page, testInfo.project.name, privacyRow(page));

      if (testInfo.project.name !== "desktop") {
        const height = await privacyRow(page).evaluate((el) => (el as HTMLElement).offsetHeight);
        expect(height).toBeGreaterThanOrEqual(44);
      }

      // Tap two: the Privacy row itself.
      await privacyRow(page).click();

      await expect(page).toHaveURL(/\/privacy$/);
      await expect(page.getByRole("heading", { name: PRIVACY_COPY.heading, level: 1 })).toBeVisible();
    });
  }

  test("the Privacy row is left out on the Privacy page itself, and Contact stays", async ({ page }, testInfo) => {
    await page.goto(PRIVACY_ROUTE);
    await openMenuTo(page, testInfo.project.name, contactRow(page));
    await expect(privacyRow(page)).toHaveCount(0);
  });

  test("the Contact form's note keeps its words and links here", async ({ page, baseURL }) => {
    await useStandIn(page, baseURL, "sent");
    await page.goto(CONTACT_ROUTE);

    const note = page.locator("[data-contact-privacy]");
    await expect(note).toContainText(CONTACT_COPY.privacy);

    await note.getByRole("link", { name: PRIVACY_COPY.contactLineLinkLabel }).click();

    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { name: PRIVACY_COPY.heading, level: 1 })).toBeVisible();
  });
});
