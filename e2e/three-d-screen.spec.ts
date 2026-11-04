import { expect, test, type Page } from "@playwright/test";
import { THREE_D_COPY } from "../components/3d/three-d-copy";
import { BANNER_DISMISSAL_KEY } from "../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../lib/models/toolbar-tip";

/**
 * The 3D screen (Phase 16, plan 06): the shaper's board drawn as a lit solid from the litres' own surface, on its
 * own route, with honest messages when it can't be drawn.
 *
 * Every word comes from `THREE_D_COPY`. The canvas reports what it is doing on its host: `data-board-state`,
 * `data-frames` (how many times the scene has drawn) and `data-triangles` (the surface's triangle count).
 */

/** WebKit draws its first frame more slowly on the suite's development server (about 5 s measured). */
const FIRST_FRAME_MS = 30_000;

async function dismissStrips(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
}

function boardHost(page: Page) {
  return page.locator("[data-board-3d]");
}

async function waitForBoard(page: Page) {
  const host = boardHost(page);
  await expect(host).toHaveAttribute("data-board-state", "ready", { timeout: FIRST_FRAME_MS });
  await expect.poll(async () => Number(await host.getAttribute("data-frames")), { timeout: FIRST_FRAME_MS }).toBeGreaterThanOrEqual(1);
  return host;
}

test.beforeEach(async ({ page }) => {
  test.setTimeout(90_000);
  await dismissStrips(page);
});

test.describe("the 3D screen", () => {
  test("1. /design/3d draws the board lit, under its tab and the panel's title", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "the tracer runs on the computer");
    await page.goto("/design/3d");
    // One read-only tab is drawn as the band's label (TabbedPanel), not as a tab control.
    await expect(page.getByRole("main").getByText(THREE_D_COPY.tab, { exact: true })).toBeVisible();
    await expect(page.getByText(THREE_D_COPY.title, { exact: true })).toBeVisible();
    await expect(page.getByText(THREE_D_COPY.subtitle, { exact: true })).toBeVisible();
    const host = await waitForBoard(page);
    expect(Number(await host.getAttribute("data-triangles"))).toBeGreaterThan(0);
    await expect(page).toHaveTitle(THREE_D_COPY.pageTitle);
  });
});
