import { expect, test, type Page } from "@playwright/test";
import { TERMS_ROUTE } from "../lib/legal/documents";
import { PRIVACY_ROUTE } from "../lib/privacy/copy";

/**
 * Quick 261006-fom (D-02, D-03): the copyright footer on every page, on all three device profiles.
 *
 * Every page ends with "© <this year> Shaper Assistant. All rights reserved." and a link to Terms
 * and to Privacy, exactly once, reachable by scrolling to the end. On the design screens it is the
 * last thing in the scrolling controls — inside the sidebar on a computer, never in the drawing —
 * and on a phone it comes after Back + Next in the same scroller. The year is worked out here from
 * today's date, never typed, and no page logs a hydration warning. It never prints.
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

/** What a thumb does to reach the end of a page: every scrolling box, and the page, to its end —
 * the same helper as e2e/step-nav.spec.ts's. */
async function scrollEverythingToItsEnd(page: Page) {
  await page.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      const overflowY = getComputedStyle(el).overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) {
        el.scrollTop = el.scrollHeight;
      }
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
}

const NOTICE = `© ${new Date().getFullYear()} Shaper Assistant. All rights reserved.`;

const DESIGN_SCREENS = [
  "/design/outline",
  "/design/rocker",
  "/design/rails",
  "/design/volume",
  "/design/fins",
] as const;

const PAGES = ["/", "/contact", TERMS_ROUTE, PRIVACY_ROUTE, "/no-such-page-261006", ...DESIGN_SCREENS, "/design/summary"];

test.describe("the site footer", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  for (const route of PAGES) {
    test(`${route}: ends with the notice and the Terms and Privacy links, once`, async ({ page }) => {
      test.setTimeout(90_000);
      const hydration: string[] = [];
      page.on("console", (message) => {
        if (/hydrat/i.test(message.text())) hydration.push(message.text());
      });

      await page.goto(route);
      const footer = page.locator("[data-site-footer]");
      await expect(footer).toHaveCount(1, { timeout: 30_000 });
      await expect(footer).toContainText(NOTICE);
      await expect(footer.getByRole("link", { name: "Terms", exact: true })).toHaveAttribute("href", TERMS_ROUTE);
      await expect(footer.getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", PRIVACY_ROUTE);

      await scrollEverythingToItsEnd(page);
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toBeInViewport();

      // Wait until React owns the footer's links (the page has hydrated, so any hydration warning
      // has already been logged) before reading the console.
      await page.waitForFunction(() => {
        const link = document.querySelector("[data-site-footer] a");
        return !!link && Object.keys(link).some((key) => key.startsWith("__reactFiber"));
      });
      expect(hydration, "no hydration warning").toEqual([]);
    });
  }

  for (const route of [...DESIGN_SCREENS, "/design/summary"]) {
    test(`${route}: the footer is the last thing in the controls, after Back + Next, never in the drawing`, async ({
      page,
    }, testInfo) => {
      await page.goto(route);
      const footer = page.locator("[data-site-footer]");
      await expect(footer).toHaveCount(1, { timeout: 30_000 });

      const placement = await footer.evaluate((el) => {
        const nav = document.querySelector("[data-step-nav]");
        const scroller = (node: Element | null) =>
          node?.closest("[data-design-controls-scroll], [data-design-page-scroll], [data-order-form-page]") ?? null;
        return {
          inAside: !!el.closest("aside"),
          inMain: !!el.closest("main"),
          afterNav: !!nav && (nav.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
          sameScroller: !!nav && scroller(nav) !== null && scroller(nav) === scroller(el),
          position: getComputedStyle(el).position,
        };
      });

      expect(placement.afterNav, "the footer follows Back + Next").toBe(true);
      expect(placement.sameScroller, "the footer scrolls with Back + Next").toBe(true);
      expect(placement.inMain, "the footer is never in the drawing column").toBe(false);
      expect(["static", "relative"]).toContain(placement.position);
      if (route !== "/design/summary" && testInfo.project.name === "desktop") {
        expect(placement.inAside, "on a computer the footer is in the sidebar").toBe(true);
      }
    });
  }

  for (const route of ["/design/summary", PRIVACY_ROUTE]) {
    test(`${route}: the footer never prints`, async ({ page }) => {
      await page.goto(route);
      const footer = page.locator("[data-site-footer]");
      await expect(footer).toHaveCount(1, { timeout: 30_000 });
      await page.emulateMedia({ media: "print" });
      await expect(footer).toBeHidden();
      await page.emulateMedia({ media: "screen" });
      await expect(footer).toBeAttached();
    });
  }
});
