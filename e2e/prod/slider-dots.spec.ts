import { expect, test } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../../lib/models/toolbar-tip";

/**
 * Production-build proof that every slider dot is positioned the moment its screen opens (quick
 * task 260909-nvw). This lives under e2e/prod/ and runs against a real production build
 * (`next start`) through playwright.prod.config.ts, never the dev server: React's StrictMode on
 * the dev server runs every effect twice, and the second run happens to fix exactly the kind of
 * bug this guards — so no dev-server test could ever catch it.
 *
 * The bug this spec first caught: a slider that was hidden (`display: none`) when the page loaded
 * measured a zero-width box, got no dot position, and on the live site stayed dotless
 * (`--position: NaN%; visibility: hidden`) until a shaper changed its value. The phone's "Fine
 * adjust" fold used to hide six sliders that way; it was removed at the founder's request on
 * 2026-09-09, and with it went the only slider anywhere in the app that ever loaded hidden — every
 * other collapsible section in Shaper Assistant renders no slider at all while closed, and mounts a fresh
 * one the moment it opens.
 *
 * So this spec is no longer "open the fold, then check" — it is the standing production proof
 * that every dot is drawn where it belongs from the moment a screen opens, on a phone and on a
 * desktop alike. The remount guard in components/ui/slider.tsx stays exactly as it is: it still
 * protects any future screen that loads a slider hidden, and this spec is what would notice if
 * that ever regressed.
 *
 * "The last slider that ever loaded hidden went away with the Fine adjust fold" is no longer the
 * whole story: since quick 261005-big an upright phone's RAILS screen loads the Center and Tail
 * rails' sliders hidden (display:none) under the NOSE tab, so the remount guard in
 * components/ui/slider.tsx is live again, and the second test below is its standing production
 * proof (the dev server's StrictMode would pass it either way).
 */

async function dismissPhoneBanners(page: import("@playwright/test").Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** `--position: <n>%` off each dot's inline style; NaN or a missing value reads as null. */
async function dotPositions(page: import("@playwright/test").Page): Promise<(number | null)[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.slider-accent [data-slot="slider-thumb"]')).map((thumb) => {
      const match = (thumb.getAttribute("style") ?? "").match(/--position: ?([-0-9.]+)%/);
      const n = match ? Number(match[1]) : NaN;
      return Number.isFinite(n) ? n : null;
    }),
  );
}

/** Every slider dot that is actually drawn right now — a hidden rail's dots have a zero-width box
 * and are left out. Per dot: its `--position` (null for NaN or missing, parsed as `dotPositions`
 * does) and whether its computed visibility is "hidden". */
async function visibleDots(
  page: import("@playwright/test").Page,
): Promise<{ position: number | null; hidden: boolean }[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('.slider-accent [data-slot="slider-thumb"]'))
      .filter((thumb) => thumb.getBoundingClientRect().width > 0)
      .map((thumb) => {
        const match = (thumb.getAttribute("style") ?? "").match(/--position: ?([-0-9.]+)%/);
        const n = match ? Number(match[1]) : NaN;
        return {
          position: Number.isFinite(n) ? n : null,
          hidden: getComputedStyle(thumb).visibility === "hidden",
        };
      }),
  );
}

test.describe("every slider dot is positioned the moment the page loads (production build)", () => {
  test.beforeEach(async ({ page }) => {
    await dismissPhoneBanners(page);
  });

  test("every slider dot is positioned at load, on a phone and on a desktop alike", async ({ page }) => {
    await page.goto("/design/outline", { waitUntil: "networkidle" });

    const positions = await dotPositions(page);
    // TEMPLATE has exactly 11 sliders.
    expect(positions.length).toBeGreaterThanOrEqual(11);
    // A null is the `--position: NaN%` state the live site showed before this was fixed.
    expect(positions.filter((p) => p === null)).toHaveLength(0);
    for (const p of positions) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }

    // Every dot in the page is actually on screen — none is quietly still hidden.
    const visible = await page.locator('.slider-accent [data-slot="slider-thumb"]:visible').count();
    expect(visible).toBe(positions.length);
  });

  // Quick 261005-big (D-06): on an upright phone the Center and Tail rails' controls load display:none
  // under the NOSE tab — exactly the case the slider remount guard exists for. Each rail group has
  // four sliders (Thickness, Deck Profile, Family, Ratio) with Advanced closed.
  test("RAILS on an upright phone: every dot in the rail that comes into view is drawn — NOSE, CENTER, TAIL and back (261005-big)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "all twelve dots show at load on a desktop");
    await page.goto("/design/rails", { waitUntil: "networkidle" });

    const switchTabs = page.getByRole("tablist").filter({ hasText: "NOSE" });
    for (const tab of ["NOSE", "CENTER", "TAIL", "NOSE"] as const) {
      const button = switchTabs.getByRole("tab", { name: tab });
      if (tab !== "NOSE" || (await button.getAttribute("aria-selected")) !== "true") {
        await button.click();
      }
      await expect(button).toHaveAttribute("aria-selected", "true");
      await expect
        .poll(
          async () => {
            const dots = await visibleDots(page);
            const drawn = dots.every(
              (d) => d.position !== null && d.position >= 0 && d.position <= 100 && !d.hidden,
            );
            return dots.length === 4 && drawn;
          },
          { message: `every dot in the ${tab} rail's group should be drawn in place` },
        )
        .toBe(true);
    }
  });
});
