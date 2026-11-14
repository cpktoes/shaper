import { expect, test, type Page } from "@playwright/test";

/**
 * Quick 261114-loa (the founder's pick, 2026-11-14: "move the readings clear"): on a phone held sideways the TEMPLATE
 * toolbar is pinned over the drawing's top-right corner, where the turned board's Tail @ 12" read-out used to sit under
 * it (quick 261018-e6w's note). Now a read-out whose box would lie under the toolbar slides toward the nose until it
 * stands clear, its tick on the true station and its extension line bent. On a computer nothing moves.
 */

const BANNER_DISMISSAL_KEY = "shaper-sign-in-banner-dismissed";
const TOOLBAR_TIP_DISMISSAL_KEY = "shaper-toolbar-tip-dismissed";

async function dismissStrips(page: Page) {
  await page.addInitScript((key) => window.sessionStorage.setItem(key, "true"), BANNER_DISMISSAL_KEY);
  await page.addInitScript((key) => window.localStorage.setItem(key, "true"), TOOLBAR_TIP_DISMISSAL_KEY);
}

/** Every station read-out's text box and whether its leader is bent, and the toolbar's box, in page dots. */
async function measure(page: Page) {
  return page.evaluate(() => {
    const toolbar = document.querySelector("[data-viewer-toolbar]")!.getBoundingClientRect();
    const rails = [...document.querySelectorAll("[data-output-rail]")].map((g) => {
      const texts = [...g.querySelectorAll("text")].map((t) => t.getBoundingClientRect());
      const left = Math.min(...texts.map((r) => r.left));
      const right = Math.max(...texts.map((r) => r.right));
      const top = Math.min(...texts.map((r) => r.top));
      const bottom = Math.max(...texts.map((r) => r.bottom));
      return { station: g.getAttribute("data-output-rail") ?? "", left, right, top, bottom, bent: g.querySelector("path") !== null };
    });
    return { toolbar: { left: toolbar.left, right: toolbar.right, top: toolbar.top, bottom: toolbar.bottom }, rails };
  });
}

const overlaps = (a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

test.describe("TEMPLATE's station read-outs clear the toolbar on a phone held sideways", () => {
  test.beforeEach(async ({ page }) => {
    await dismissStrips(page);
  });

  test("sideways: no read-out lies under the toolbar; the Tail read-out slid toward the nose with a bent leader", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "the phones' case; the computer's is below");
    // The sizes real hardware reports (CLAUDE.md, Layout): a sideways Pixel 7 is 863 × 360, an iPhone 844 × 390.
    const sideways = testInfo.project.name === "android" ? { width: 863, height: 360 } : { width: 844, height: 390 };
    await page.setViewportSize(sideways);
    await page.goto("/design/outline");
    // Rotate is the toolbar's first button in the page and is not drawn on a touch device: wait for a drawn one.
    await expect(page.locator("[data-viewer-toolbar] button:visible").first()).toBeVisible();
    await expect(page.locator("[data-output-rail]")).toHaveCount(3);
    // Settled: the Tail read-out has slid (its leader bent) and the measure reads the same twice in a row.
    await expect.poll(async () => (await measure(page)).rails.find((r) => r.station.startsWith("Tail"))?.bent).toBe(true);
    const first = await measure(page);
    await expect.poll(async () => JSON.stringify(await measure(page))).toBe(JSON.stringify(first));
    const read = first;
    testInfo.annotations.push({ type: "boxes", description: JSON.stringify(read) });
    for (const rail of read.rails) {
      expect(overlaps(rail, read.toolbar), `${rail.station} lies under the toolbar`).toBe(false);
    }
    // The three read-outs stand in a row, none running into the next.
    for (let i = 1; i < read.rails.length; i++) {
      expect(read.rails[i].left, `${read.rails[i].station} runs into ${read.rails[i - 1].station}`).toBeGreaterThanOrEqual(read.rails[i - 1].right);
    }
    const tail = read.rails.find((r) => r.station.startsWith("Tail"))!;
    expect(tail.right).toBeLessThanOrEqual(read.toolbar.left);
    // The Nose read-out is where it always was; the Center one moves only when the Tail one pushes it (a 6'0" board does).
    expect(read.rails[0].bent, read.rails[0].station).toBe(false);
  });

  test("a computer's window: nothing moves — no read-out has a bent leader", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the computer's case");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/design/outline");
    await expect(page.locator("[data-output-rail]")).toHaveCount(3);
    const read = await measure(page);
    for (const rail of read.rails) expect(rail.bent, rail.station).toBe(false);
  });
});
