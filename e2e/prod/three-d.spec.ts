import { expect, test, type Page } from "@playwright/test";
import { BANNER_DISMISSAL_KEY } from "../../lib/models/banner-dismissal";
import { TOOLBAR_TIP_DISMISSAL_KEY } from "../../lib/models/toolbar-tip";
import { openPhoneMenu, screenTile } from "../helpers/screens";

/**
 * The 3D screen on a production build (Phase 16, plan 06; research Pitfall 4 and Pitfall 5). Two things a
 * development server can't prove:
 *
 * - React's development double-mount hides how the screen behaves when it is left and come back to for real: the
 *   built screen must draw, survive a walk to SUMMARY and back, and draw again on a canvas of its own.
 * - The 3D drawing code (three.js) must reach the browser on /design/3d alone. Every script another screen loads is
 *   read, and none may hold three.js's renderer.
 */

/** How the drawing code is recognised in a built script: three.js's own renderer error text survives minifying. */
const SCENE_MARK = "THREE.WebGLRenderer";

async function dismissStrips(page: Page) {
  await page.addInitScript(
    ([bannerKey, tipKey]) => {
      window.sessionStorage.setItem(bannerKey, "true");
      window.localStorage.setItem(tipKey, "true");
    },
    [BANNER_DISMISSAL_KEY, TOOLBAR_TIP_DISMISSAL_KEY] as const,
  );
}

/** Collects the address of every script the page loads whose text carries the drawing code. */
function watchForScene(page: Page): string[] {
  const found: string[] = [];
  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") return;
    const body = await response.text().catch(() => "");
    if (body.includes(SCENE_MARK)) found.push(response.url());
  });
  return found;
}

async function waitForBoard(page: Page) {
  const host = page.locator("[data-board-3d]");
  await expect(host).toHaveAttribute("data-board-state", "ready", { timeout: 30_000 });
  await expect.poll(async () => Number((await host.getAttribute("data-frames")) ?? 0), { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
  return host;
}

test.describe("the 3D screen (production build)", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await dismissStrips(page);
  });

  test("draws, survives a walk to SUMMARY and back, and draws again on a fresh canvas", async ({ page }, testInfo) => {
    await page.goto("/design/3d");
    const host = await waitForBoard(page);
    await host.locator("canvas").evaluate((canvas) => canvas.setAttribute("data-first-visit", ""));

    // A client-side walk (never a reload): the top row on a computer, the ☰ sheet's tile on a phone.
    if (testInfo.project.name === "desktop") {
      await page.locator("nav:not([data-step-nav])").getByRole("link", { name: "SUMMARY", exact: true }).click();
    } else {
      await openPhoneMenu(page);
      await screenTile(page, "SUMMARY").click();
    }
    await expect(page).toHaveURL(/\/design\/summary$/, { timeout: 60_000 });
    await expect(page.locator("[data-board-3d]")).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/design\/3d$/, { timeout: 60_000 });

    const again = await waitForBoard(page);
    await expect(again.locator("canvas")).toHaveCount(1);
    await expect(again.locator("canvas[data-first-visit]")).toHaveCount(0);
    await expect(page.locator("[data-canvas-message]")).toHaveCount(0);
  });

  test("no other screen loads the 3D drawing code; the 3D screen does", async ({ page, context }) => {
    const elsewhere = watchForScene(page);
    await page.goto("/design/outline");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2_000);
    expect(elsewhere).toEqual([]);
    await page.close();

    const threeD = await context.newPage();
    const onThreeD = watchForScene(threeD);
    await threeD.goto("/design/3d");
    await waitForBoard(threeD);
    await expect.poll(() => onThreeD.length, { timeout: 10_000 }).toBeGreaterThan(0);
  });
});
