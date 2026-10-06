import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { CONTACT_STAND_IN_COOKIE } from "../lib/contact/delivery";
import { CONTACT_COPY, CONTACT_ROUTE } from "../lib/contact/message";
import { LEGAL_DOCUMENTS, legalOutline } from "../lib/legal/documents";
import { PRIVACY_COPY, PRIVACY_ROUTE } from "../lib/privacy/copy";

/**
 * Quick 260930-03d (Phase 13 item 11): browser proof for the `/privacy` page on all three device
 * profiles — the iPhone, the Android phone, and the desktop.
 *
 * Quick 261006-fom rebuilt the page from the founder's own `content/legal/privacy.md`: the test
 * that opened the page signed out and read it through moved to e2e/legal-pages.spec.ts and was
 * rewritten there, and every check below that waits for the page's heading now reads that heading
 * from the markdown itself (`PRIVACY_HEADING`) rather than from the retired hand-typed copy. The
 * visit-counter, two-taps, left-out-on-its-own-page and Contact-note tests are unchanged.
 *
 * Task 3 of quick 260930-03d added the menu-row proofs (two taps from every screen, hidden on — since 261006-fom the Privacy link lives in every page's footer instead; the proofs below follow it there,
 * `/privacy` itself) and the Contact form's Privacy-link proof, now that `PrivacyMenuItem` and the
 * Contact-note link exist — `menuTrigger`, `openMenuTo` and `useStandIn` below are copied verbatim from
 * e2e/contact.spec.ts.
 *
 * Clerk's own footer "Privacy" link (added to `appearance.options.privacyPageUrl` in Task 2)
 * cannot be proven here, for the same reason e2e/phone-account.spec.ts's header documents: under
 * this suite's deliberately fake Clerk keys, Clerk's hosted `<SignIn>` card never actually renders
 * in this browser, so there is no real footer to inspect. `lib/privacy/wiring.test.ts` (Task 2)
 * proves the source wiring instead, and the founder checks the real footer link live.
 */

/** The page's h1, read from the founder's markdown — the same way e2e/legal-pages.spec.ts reads it. */
const PRIVACY_HEADING = legalOutline(
  readFileSync(join(process.cwd(), LEGAL_DOCUMENTS.privacy.file), "utf8"),
).title;

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
 * a heading on this page. */
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

  // Since quick 261006-fom the Privacy page is one link away on EVERY screen, in the footer at the
  // end of the page (the end of the controls on the design screens) — the founder took the menus'
  // Privacy row out on 2026-10-06 once the footer carried Terms and Privacy everywhere.
  for (const route of routesReachableFromTwoTaps) {
    test(`one link away on every screen, in the footer — ${route}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto(route);

      const link = page.locator("[data-site-footer]").getByRole("link", { name: "Privacy", exact: true }).first();
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      await link.click();

      await expect(page).toHaveURL(/\/privacy$/);
      await expect(page.getByRole("heading", { name: PRIVACY_HEADING, level: 1 })).toBeVisible();
    });
  }

  test("the menus carry no Privacy row (it lives in the footer), and Contact stays", async ({ page }, testInfo) => {
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
    await expect(page.getByRole("heading", { name: PRIVACY_HEADING, level: 1 })).toBeVisible();
  });
});
