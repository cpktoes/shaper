import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { expectNoScreensNavigation, expectSixTilesInMenu } from "./helpers/screens";
import { LEGAL_DOCUMENTS, legalOutline, type LegalSlug } from "../lib/legal/documents";

/**
 * Quick 261006-fom (D-01): browser proof that `/terms` and `/privacy` show the founder's own
 * markdown, on all three device profiles, signed out.
 *
 * Nothing this spec checks is typed into it: the title and every section heading are read from
 * `content/legal/*.md` itself with `legalOutline`, and the email addresses from the same text, so
 * the founder can change a word in either file and this spec follows it. (The opening-signed-out
 * test that used to live in e2e/privacy.spec.ts moved here and was rewritten for the new page.)
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

function readDocument(slug: LegalSlug): string {
  return readFileSync(join(process.cwd(), LEGAL_DOCUMENTS[slug].file), "utf8");
}

test.describe("Terms and Privacy pages", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBannerAndTip(page);
  });

  for (const slug of ["terms", "privacy"] as const) {
    test(`${LEGAL_DOCUMENTS[slug].route} opens signed out and reads the founder's whole document`, async ({
      page,
    }, testInfo) => {
      const markdown = readDocument(slug);
      const outline = legalOutline(markdown);

      await page.goto(LEGAL_DOCUMENTS[slug].route);

      const legalPage = page.locator(`[data-legal-page="${slug}"]`);
      await expect(legalPage.getByRole("heading", { level: 1 })).toHaveText(outline.title);

      const sections = legalPage.getByRole("heading", { level: 2 });
      await expect(sections).toHaveText(outline.sections);
      for (const section of await sections.all()) {
        await section.scrollIntoViewIfNeeded();
        await expect(section).toBeVisible();
      }

      await expect(page).toHaveTitle(`Shaper Assistant — ${outline.title}`);

      if (slug === "privacy") {
        const table = legalPage.locator("table");
        await expect(table).toHaveCount(1);
        await expect(table.locator("tbody tr")).toHaveCount(5);

        const addresses = [...new Set(markdown.match(/[\w.+-]+@[\w-]+\.[\w.-]*\w/g) ?? [])];
        expect(addresses.length).toBeGreaterThan(0);
        for (const address of addresses) {
          await expect(legalPage.locator(`a[href="mailto:${address}"]`).first()).toHaveText(address);
        }
      }

      if (testInfo.project.name !== "desktop") {
        await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Settings" })).toBeHidden();
        await expectNoScreensNavigation(page);
        await expectSixTilesInMenu(page, null);

        const overflow = await legalPage.evaluate((el) => ({
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        }));
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
      } else {
        await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
        await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeHidden();
      }
    });
  }
});
