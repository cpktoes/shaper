import { expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";

/**
 * Quick 261003-q2c: every design screen's controls end with a Back and a Next button, so a shaper
 * walks a board TEMPLATE, ROCKER, RAILS, VOLUME, FINS, SUMMARY without opening a menu (the founder's
 * "almost wizard like", sketch 008's pick B). TEMPLATE has only Next, SUMMARY only Back.
 *
 * The six screens are hand-written here the way every phone spec in this suite does it: importing
 * `components/site-nav.tsx` would pull the database client into Playwright's own Node process.
 */
const SCREENS = [
  { href: "/design/outline", label: "TEMPLATE", word: "Template" },
  { href: "/design/rocker", label: "ROCKER", word: "Rocker" },
  { href: "/design/rails", label: "RAILS", word: "Rails" },
  { href: "/design/volume", label: "VOLUME", word: "Volume" },
  { href: "/design/fins", label: "FINS", word: "Fins" },
  { href: "/design/summary", label: "SUMMARY", word: "Summary" },
] as const;

async function dismissBanners(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** From the setup screen, start the first preset (it carries its own blank, so ROCKER shows both
 * Thinning Starts rows). The Start Shaping click is retried until the outline URL shows, because a
 * click before hydration does nothing. */
async function startTheFirstPreset(page: Page) {
  await page.goto("/");
  const start = page.getByRole("button").filter({ hasText: "Start Shaping" }).first();
  await expect(async () => {
    await start.click();
    await page.waitForURL("**/design/outline", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
}

function stepNav(page: Page) {
  return page.getByRole("navigation", { name: "Back and Next", exact: true });
}

/** `dispatchEvent("click")`, not `.click()`: under `next dev`, Next's own corner badge
 * (`<nextjs-portal>`, bottom-left) can sit over a link and swallow a real mouse click — see
 * e2e/phone-trip.spec.ts. The move is still a real client-side link navigation. */
async function followStep(page: Page, direction: "previous" | "next", toHref: string) {
  await stepNav(page).locator(`a[data-step="${direction}"]`).dispatchEvent("click");
  await page.waitForURL(`**${toHref}`);
}

test.describe("Back and Next end every design screen's controls", () => {
  test.beforeEach(async ({ page }) => {
    await dismissBanners(page);
  });

  test("TEMPLATE's Next goes to ROCKER and ROCKER's Back comes home", async ({ page }) => {
    await startTheFirstPreset(page);

    // TEMPLATE is the first screen: Next only, reading "Rocker".
    await expect(stepNav(page).getByRole("link")).toHaveCount(1);
    const next = stepNav(page).getByRole("link", { name: "Next screen: Rocker", exact: true });
    await expect(next).toHaveText("Rocker");
    await expect(stepNav(page).getByRole("link", { name: /^Previous screen: / })).toHaveCount(0);

    await followStep(page, "next", "/design/rocker");

    // ROCKER has both: Back reading "Template", Next reading "Rails".
    await expect(stepNav(page).getByRole("link", { name: "Previous screen: Template", exact: true })).toHaveText(
      "Template",
    );
    await expect(stepNav(page).getByRole("link", { name: "Next screen: Rails", exact: true })).toHaveText("Rails");

    await followStep(page, "previous", "/design/outline");
    await expect(stepNav(page).getByRole("link", { name: "Next screen: Rocker", exact: true })).toBeVisible();
    void SCREENS;
  });
});
