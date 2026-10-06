import { randomUUID } from "node:crypto";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoScreensNavigation, expectSixTilesInMenu } from "./helpers/screens";
import { CONTACT_STAND_IN_COOKIE } from "../lib/contact/delivery";
import {
  CONTACT_ADDRESS,
  CONTACT_COPY,
  CONTACT_ERRORS,
  CONTACT_MAILTO,
  CONTACT_ROUTE,
} from "../lib/contact/message";
import { CONTACT_SEND_LIMIT } from "../lib/contact/rate-limit";

/**
 * Quick 260929-u1t (Phase 13 item 10; the sender became Resend in quick 260929-w2k): browser
 * proof for the Contact page on all three device profiles — the iPhone, the Android phone, and
 * the desktop.
 *
 * `playwright.config.ts`'s `webServer.env` sets `SHAPER_CONTACT_STAND_IN=1` (P-3), so every test
 * here can pick its outcome with the `shaper-contact-stand-in` cookie instead of ever reaching a
 * real Resend account: `sent` makes a submission succeed, `failed` makes one fail, and no cookie
 * at all means no send path exists (the address-only page, test (1)). The real key is never used
 * while the stand-in is on, and `playwright.prod.config.ts` strips this whole env block, so the
 * stand-in can never switch on in a production build — that half of the guarantee is proved by
 * `lib/contact/delivery.test.ts`'s unit tests, not here.
 *
 * Left for the founder's own live check, once `RESEND_API_KEY` is in Vercel and the domain is
 * verified in Resend (this plan's `<success_criteria>`): a real message actually arriving in the
 * support@ inbox in Zoho Mail, the founder's Reply from Zoho Mail reaching the shaper, and their
 * own signed-in visit showing their real name and email filled in — none of that is provable from
 * a stand-in, by design.
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
  // `exact: true` on desktop: FINS carries its own "Settings ▸" model-picker button, and an
  // un-anchored "Settings" match resolves to both (a strict-mode violation) on that one screen.
  return projectName === "desktop"
    ? page.getByRole("button", { name: "Settings", exact: true })
    : page.getByRole("banner").getByRole("button", { name: "Menu" });
}

/** The shared Contact row, found by its exact accessible name so it can never be confused with
 * this page's own heading (also "Contact"). */
function contactRow(page: Page): Locator {
  return page.getByRole("menuitem", { name: CONTACT_COPY.menuLabel, exact: true });
}

/** Opens the menu and waits for `sentinel` to appear. Retried, because a click that lands before
 * the page has hydrated does nothing — and only clicked again while the menu is still closed, so
 * a retry can never toggle an open menu shut (the same pattern blank-makers.spec.ts uses). */
async function openMenuTo(page: Page, projectName: string, sentinel: Locator): Promise<void> {
  const trigger = menuTrigger(page, projectName);
  await expect(trigger).toBeVisible();
  await expect(async () => {
    if (!(await sentinel.isVisible())) await trigger.click();
    await expect(sentinel).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

/** Sets the stand-in cookie that picks this test's delivery outcome (P-3). Must run before
 * `page.goto`, since the cookie is read on the server during the very first render. */
async function useStandIn(page: Page, baseURL: string | undefined, choice: "sent" | "failed"): Promise<void> {
  await page.context().addCookies([
    { name: CONTACT_STAND_IN_COOKIE, value: choice, url: baseURL },
  ]);
}

/** A fresh visitor address in the IPv6 documentation range (RFC 3849) — never a real visitor's. */
function freshVisitorAddress(): string {
  const hex = randomUUID().replace(/-/g, "").slice(0, 8);
  return `2001:db8::${hex.slice(0, 4)}:${hex.slice(4, 8)}`;
}

/** Makes every request this page sends from now on — the Contact send included — arrive as a
 * brand-new visitor, so the per-visitor limit (quick 261006-g5q) counts it on its own. */
async function becomeNewVisitor(page: Page): Promise<void> {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": freshVisitorAddress() });
}

test.describe("Contact page", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
    // Every test is its own visitor: the three device projects share one dev server, and a reused
    // server keeps its memory between runs, so one shared address would add up past the limit.
    await becomeNewVisitor(page);
  });

  test("opens signed out and shows only the address while there's no way to send", async ({ page }, testInfo) => {
    await page.goto(CONTACT_ROUTE);

    await expect(page.getByRole("heading", { name: CONTACT_COPY.heading })).toBeVisible();
    await expect(page.getByText(CONTACT_COPY.intro)).toBeVisible();

    const addressLink = page.getByRole("link", { name: CONTACT_ADDRESS });
    await expect(addressLink).toHaveAttribute("href", CONTACT_MAILTO);

    await expect(page.getByRole("textbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: CONTACT_COPY.send })).toHaveCount(0);

    if (testInfo.project.name !== "desktop") {
      await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Settings" })).toBeHidden();
      await expectNoScreensNavigation(page);
      await expectSixTilesInMenu(page, null);

      const overflow = await page.locator("[data-contact-page]").evaluate((el) => ({
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    } else {
      await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
      await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeHidden();
    }
  });

  const routesReachableFromTwoTaps = [
    "/",
    "/design/outline",
    "/design/rocker",
    "/design/rails",
    "/design/volume",
    "/design/fins",
    "/design/summary",
    "/privacy",
  ];

  for (const route of routesReachableFromTwoTaps) {
    test(`two taps from every screen — ${route}`, async ({ page }, testInfo) => {
      test.setTimeout(90_000);
      await page.goto(route);

      // Tap one: open the menu to the Contact row.
      await openMenuTo(page, testInfo.project.name, contactRow(page));

      if (testInfo.project.name !== "desktop") {
        const height = await contactRow(page).evaluate((el) => (el as HTMLElement).offsetHeight);
        expect(height).toBeGreaterThanOrEqual(44);
      }

      // Tap two: the Contact row itself.
      await contactRow(page).click();

      await expect(page).toHaveURL(/\/contact$/);
      await expect(page.getByRole("heading", { name: CONTACT_COPY.heading })).toBeVisible();
    });
  }

  test("the Contact row is left out on the Contact page itself", async ({ page }, testInfo) => {
    await page.goto(CONTACT_ROUTE);
    await openMenuTo(page, testInfo.project.name, page.getByRole("menuitem", { name: /^App Default Settings/ }));
    await expect(contactRow(page)).toHaveCount(0);
  });

  test("a message sends and the page names the reply address", async ({ page, baseURL }, testInfo) => {
    await useStandIn(page, baseURL, "sent");
    await page.goto(CONTACT_ROUTE);

    await page.getByLabel(CONTACT_COPY.messageLabel).fill("The rail band on my 6'2\" reads thin — can you check?");
    await page.getByLabel(CONTACT_COPY.emailLabel).fill("jane@example.com");
    await page.getByLabel(CONTACT_COPY.nameLabel).fill("Jane Smith");

    if (testInfo.project.name !== "desktop") {
      for (const label of [CONTACT_COPY.messageLabel, CONTACT_COPY.emailLabel, CONTACT_COPY.nameLabel]) {
        const height = await page.getByLabel(label).evaluate((el) => (el as HTMLElement).offsetHeight);
        expect(height, label).toBeGreaterThanOrEqual(44);
      }
      const sendHeight = await page
        .getByRole("button", { name: CONTACT_COPY.send })
        .evaluate((el) => (el as HTMLElement).offsetHeight);
      expect(sendHeight).toBeGreaterThanOrEqual(44);
    }

    await page.getByRole("button", { name: CONTACT_COPY.send }).click();

    await expect(page.getByText(CONTACT_COPY.sentHeading)).toBeVisible();
    await expect(page.getByText("jane@example.com")).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(0);
  });

  test("mistakes are caught beside the field and the typed message stays", async ({ page, baseURL }) => {
    await useStandIn(page, baseURL, "sent");
    await page.goto(CONTACT_ROUTE);

    await page.getByRole("button", { name: CONTACT_COPY.send }).click();
    await expect(page.getByText(CONTACT_ERRORS.messageMissing)).toBeVisible();
    await expect(page.getByText(CONTACT_ERRORS.emailMissing)).toBeVisible();
    await expect(page.getByLabel(CONTACT_COPY.messageLabel)).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel(CONTACT_COPY.messageLabel).fill("Hello from the beach");
    await page.getByLabel(CONTACT_COPY.emailLabel).fill("not-an-email");
    await page.getByRole("button", { name: CONTACT_COPY.send }).click();

    await expect(page.getByText(CONTACT_ERRORS.emailInvalid)).toBeVisible();
    await expect(page.getByText(CONTACT_ERRORS.messageMissing)).toHaveCount(0);
    await expect(page.getByLabel(CONTACT_COPY.messageLabel)).toHaveValue("Hello from the beach");
    await expect(page.getByLabel(CONTACT_COPY.emailLabel)).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(CONTACT_COPY.sentHeading)).toHaveCount(0);
  });

  test("a failed send points to the address and keeps the message", async ({ page, baseURL }) => {
    await useStandIn(page, baseURL, "failed");
    await page.goto(CONTACT_ROUTE);

    await page.getByLabel(CONTACT_COPY.messageLabel).fill("Hello from the beach");
    await page.getByLabel(CONTACT_COPY.emailLabel).fill("jane@example.com");
    await page.getByRole("button", { name: CONTACT_COPY.send }).click();

    // Scoped to <main>: Next's own client-side route announcer also carries role="alert" (an
    // empty, off-screen div it manages for screen readers), which an un-scoped getByRole("alert")
    // matches too, tripping Playwright's strict mode.
    const alert = page.locator("main").getByRole("alert");
    await expect(alert).toContainText(CONTACT_COPY.failedLead);
    await expect(alert.getByRole("link", { name: CONTACT_ADDRESS })).toHaveAttribute("href", CONTACT_MAILTO);
    await expect(page.getByLabel(CONTACT_COPY.messageLabel)).toHaveValue("Hello from the beach");
  });

  test("the hidden anti-spam field answers as sent without sending", async ({ page, baseURL }) => {
    // Cookie "failed" — so if the honeypot didn't short-circuit delivery, this would show the
    // failure state instead of the sent one.
    await useStandIn(page, baseURL, "failed");
    await page.goto(CONTACT_ROUTE);

    await page.getByLabel(CONTACT_COPY.messageLabel).fill("Hello from the beach");
    await page.getByLabel(CONTACT_COPY.emailLabel).fill("jane@example.com");

    await page.locator('input[name="website"]').evaluate((el) => {
      (el as HTMLInputElement).value = "https://spam.example";
    });

    await page.getByRole("button", { name: CONTACT_COPY.send }).click();

    await expect(page.getByText(CONTACT_COPY.sentHeading)).toBeVisible();
  });

  test("a sixth message within the hour is turned away kindly, the typed message stays, and another visitor can still send", async ({ page, baseURL }) => {
    test.setTimeout(90_000);
    await useStandIn(page, baseURL, "sent");

    for (let n = 1; n <= CONTACT_SEND_LIMIT; n += 1) {
      await page.goto(CONTACT_ROUTE);
      await page.getByLabel(CONTACT_COPY.messageLabel).fill(`Question number ${n} about my fins`);
      await page.getByLabel(CONTACT_COPY.emailLabel).fill("jane@example.com");
      await page.getByRole("button", { name: CONTACT_COPY.send }).click();
      await expect(page.getByText(CONTACT_COPY.sentHeading)).toBeVisible();
    }

    // One more from the same visitor, still within the hour.
    await page.goto(CONTACT_ROUTE);
    await page.getByLabel(CONTACT_COPY.messageLabel).fill("One more question about my fins");
    await page.getByLabel(CONTACT_COPY.emailLabel).fill("jane@example.com");
    await page.getByRole("button", { name: CONTACT_COPY.send }).click();

    // Scoped to <main> for the same reason as the failed-send test above.
    const alert = page.locator("main").getByRole("alert");
    await expect(alert).toContainText(CONTACT_COPY.limitedLead);
    await expect(alert.getByRole("link", { name: CONTACT_ADDRESS })).toHaveAttribute("href", CONTACT_MAILTO);
    await expect(page.getByLabel(CONTACT_COPY.messageLabel)).toHaveValue("One more question about my fins");
    await expect(page.getByText(CONTACT_COPY.sentHeading)).toHaveCount(0);

    // A different visitor is never held back by the first one's limit.
    await becomeNewVisitor(page);
    await page.goto(CONTACT_ROUTE);
    await page.getByLabel(CONTACT_COPY.messageLabel).fill("Hello from another shaper");
    await page.getByLabel(CONTACT_COPY.emailLabel).fill("kai@example.com");
    await page.getByRole("button", { name: CONTACT_COPY.send }).click();
    await expect(page.getByText(CONTACT_COPY.sentHeading)).toBeVisible();
  });
});
