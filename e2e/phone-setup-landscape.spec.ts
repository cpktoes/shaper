import { devices, expect, test, type Page } from "@playwright/test";

/**
 * The setup screen's preset grid with the phone held sideways (D-08's own closing note). This file
 * takes 750 x 340 — Playwright's `iPhone 14 landscape` EMULATED viewport — not what a real iPhone
 * reports sideways: the shaper measured a real one at about 844 x 390 on 2026-09-11 (10-SWEEP.md),
 * so this file exercises the emulator's width, not the hardware's. That gap is exactly what 10-05
 * closes for the app's overall LAYOUT switch (`app/globals.css`'s `max-shell`/`shell` custom
 * variants are now width-and-height, not width alone) — under the corrected rule, both widths land
 * in the phone stack anyway: the emulated 750px one because it is still narrower than 820px, the
 * real 844px one because it is a coarse pointer on a screen shorter than 500px. So this file's own
 * assertions, unchanged here, still hold for the reason CLAUDE.md's Layout section now states.
 *
 * At 750 x 340, `sm:grid-cols-2` (Tailwind's own 640px breakpoint, untouched by this plan) already
 * puts the grid at two columns, and the card height cap (`max-shell:h-[387px]`) still applies — so
 * a shaper turning their phone sideways keeps today's two-up grid, each card the same height as
 * upright, exactly as D-08 records. That two-up-at-this-width ruling is a Claude ruling — the
 * end-of-phase real-device sweep confirms it in hand ("two is fine," 10-SWEEP.md, 2026-09-11) — not
 * a founder decision, recorded here so it is not mistaken for one.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";

/** Matches the sibling phone specs' own approach: dismiss the sign-in banner via sessionStorage,
 * set before navigation, so its own height never confuses a layout assertion. */
async function dismissSignInBanner(page: Page) {
  await page.addInitScript((key) => {
    window.sessionStorage.setItem(key, "true");
  }, BANNER_DISMISSAL_KEY);
}

test.describe("the setup screen's preset grid with the phone held sideways", () => {
  // `defaultBrowserType` is a worker-scoped option Playwright only accepts from the config
  // file's own `projects` list, not from a describe-level `test.use` — the `iphone` project
  // already pins WebKit, so it is dropped here and the rest of the device descriptor (viewport,
  // touch, scale factor) is applied on top of it. Matches e2e/phone-fins-landscape.spec.ts's own
  // pattern exactly.
  const iphone14Landscape = { ...devices["iPhone 14 landscape"] };
  delete (iphone14Landscape as { defaultBrowserType?: unknown }).defaultBrowserType;
  test.use({ ...iphone14Landscape });

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "iphone", "sideways-phone assertion runs on the iphone (WebKit) project only");
    await dismissSignInBanner(page);
  });

  test("the grid stays two-up, every card the same height as upright, at 750 x 340", async ({ page }) => {
    await page.goto("/");

    // Prove the test is not vacuous: this really is a 750 x 340 viewport below the shell
    // breakpoint before asserting anything about its layout.
    const dims = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      belowShell: window.matchMedia("(max-width: 819px)").matches,
    }));
    expect(dims.width).toBe(750);
    expect(dims.height).toBe(340);
    expect(dims.belowShell).toBe(true);

    const presetCards = page.getByRole("button").filter({ hasText: "Start Shaping" });
    const cards = await presetCards.all();
    expect(cards.length).toBeGreaterThan(1);

    const boxes = [];
    for (const card of cards) {
      const box = await card.boundingBox();
      if (!box) throw new Error("preset card is missing a bounding box");
      boxes.push(box);
    }

    // The two-up grid: exactly two distinct left edges, not one column and not four across.
    const distinctLeftEdges = new Set(boxes.map((box) => Math.round(box.x)));
    expect(distinctLeftEdges.size).toBe(2);

    for (const box of boxes) {
      expect(box.height).toBeGreaterThanOrEqual(520);
      expect(box.height).toBeLessThanOrEqual(580);
    }

    for (const card of cards) {
      const path = card.locator('[data-board-silhouette="outline"]');
      const pathBox = await path.boundingBox();
      if (!pathBox) throw new Error("outline path is missing a bounding box");
      expect(pathBox.height).toBeGreaterThanOrEqual(350);
    }
  });
});
